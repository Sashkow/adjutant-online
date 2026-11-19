// The Adjutant effect, live, over another program's sound: raw mono 32-bit float samples at 48 kHz on standard input
// (from `parec` on a PulseAudio null sink's monitor) go through the same effect chain as the speaker's voice and play on
// the default output. scripts/claude-voice-fx.sh routes Claude Desktop's voice through it.
//
//   parec -d adjutant_fx.monitor --format=float32le --rate=48000 --channels=1 | node dist-cli/live.js [--link <page address>]
//   node dist-cli/live.js --in voice.wav --out with-effect.wav [--link ...]     (a recording, faster than real time)
//   --shift <semitones>   raise the pitch first, keeping the voice's size (PSOLA, about 0.55 s of delay); default
//                         LIVE_SHIFT (2.3), 0 for none. Claude Desktop's voice sits about 4 semitones below the speaker's.
//   --pause <seconds>     a pause at least this long is a new paragraph and gets the speaker's paragraph blip
//                         (LIVE_PARAGRAPH_PAUSE, 0.9; 0 for none; adds about 0.45 s of delay)
//   --size <semitones>    the voice's size up as well (its resonances); LIVE_SIZE, off (chosen by ear, 2026-11-17).
//
// Only the effect is live. The delivery (pitch and size of the voice) is shaped before the effect when the speaker makes
// its own speech, so another voice keeps its own pitch and speaker; it gains the metal, the doubling, the echo and the room.
// LIVE_TONE retunes the tone for Claude Desktop's voice, which is duller than the speaker's in the presence band, so that
// it comes out closer to the read-aloud Adjutant; a --link replaces it.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { RENDER_SAMPLE_RATE, buildChain, loopCompensation } from '../effect/graph';
import { renderOffline } from '../effect/render';
import { decodeWav, encodeWav } from '../audio/wav';
import { DEFAULT_PRESET } from '../effect/preset';
import type { Settings } from '../effect/params';
import { settingsFromLink } from './speak';
import { StreamShifter } from '../effect/stream-shift';
import { PauseBlip } from '../effect/pause-blip';

/** Tuned against a recording of Claude Desktop's voice mode (2026-11-17): long-term spectrum matched to the read-aloud voice. */
export const LIVE_TONE: Partial<Settings> = {
  hpHz: 250, lpHz: 6200,       // a narrower band (default 150-9000 Hz)
  bodyDb: -2.5,                // less 500 Hz body: Claude's voice already has plenty (default +3.5)
  midDb: -6,                   // a slightly shallower scoop at 1 kHz (default -8)
  shelfHz: 2000, shelfDb: 6,   // the air from 2 kHz, not 3.5: the presence band is where Claude's voice is dull
};

/** Semitones up: Claude's voice mode measured about 194 Hz against the read-aloud voice's 240 Hz. Calibrated on the
 *  recording (2026-11-17): the streaming PSOLA lands higher than nominal (2 st measured 232 Hz), so 2.3 st gives ~240 Hz. */
export const LIVE_SHIFT = 2.3;  // chosen by ear against 3 and 5 (5 sounded like a child), 2026-11-17
/** Semitones the voice's size moves up with it (its resonances): a male voice's sit about 2-3 semitones below a woman's. */
export const LIVE_SIZE = 0;
/** Voice mode has no paragraph marks: Claude's pauses ran 0.3-1.2 s in the recordings, with no clear break between
 *  sentences and paragraphs, so the longer ones count. */
export const LIVE_PARAGRAPH_PAUSE = 0.9;

const require = createRequire(import.meta.url);
const audio = require('node-web-audio-api');

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const link = arg('--link');
const settings: Settings = link ? settingsFromLink(link) : { ...DEFAULT_PRESET, ...LIVE_TONE };
const num = (name: string, dflt: number) => { const v = arg(name); return v !== undefined && v !== '' ? Number(v) : dflt; };
const shiftSt = num('--shift', LIVE_SHIFT), sizeSt = num('--size', LIVE_SIZE);
const ratio = Math.pow(2, shiftSt / 12), size = Math.pow(2, sizeSt / 12);
const pauseSec = num('--pause', LIVE_PARAGRAPH_PAUSE);
/** The stages before the effect chain, fresh for one stream: the pitch shift, then the paragraph blip. */
function stages(sampleRate: number): { push: (x: Float32Array) => Float32Array; latency: number } | null {
  const sh = shiftSt || sizeSt ? new StreamShifter(sampleRate, ratio, size) : null;
  const bl = pauseSec > 0 ? new PauseBlip(sampleRate, pauseSec, settings.blipLevel) : null;
  if (!sh && !bl) return null;
  return {
    push: (x) => { const y = sh ? sh.push(x) : x; return bl && y.length ? bl.push(y) : y; },
    latency: (sh?.latency ?? 0) + (bl?.latency ?? 0),
  };
}
const shifter = stages(RENDER_SAMPLE_RATE);

loopCompensation.seconds = 128 / RENDER_SAMPLE_RATE;

const inFile = arg('--in'), outFile = arg('--out');
if (inFile && outFile) {
  (globalThis as Record<string, unknown>).OfflineAudioContext ??= audio.OfflineAudioContext;
  const bytes = readFileSync(inFile);
  let { samples, sampleRate } = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const sh = stages(sampleRate);
  if (sh) {                          // the same stages as live, fed in 21 ms blocks
    const parts: Float32Array[] = [];
    const padded = new Float32Array(samples.length + Math.ceil(sh.latency * sampleRate) + 2048);
    padded.set(samples);
    const t0 = Date.now();
    for (let i = 0; i < padded.length; i += 1024) parts.push(sh.push(padded.subarray(i, i + 1024)));
    process.stderr.write(`staged ${(samples.length / sampleRate).toFixed(1)} s in ${((Date.now() - t0) / 1000).toFixed(2)} s\n`);
    const n = parts.reduce((a, p) => a + p.length, 0);
    samples = new Float32Array(n);
    let k = 0;
    for (const p of parts) { samples.set(p, k); k += p.length; }
  }
  const out = await renderOffline(samples, sampleRate, settings);
  writeFileSync(outFile, Buffer.from(encodeWav(out, RENDER_SAMPLE_RATE)));
  process.exit(0);
}

const BLOCK = 1024;           // frames per scheduled piece: about 21 ms
const LEAD = shifter ? 0.2 : 0.06;   // seconds scheduled ahead, so pieces join without gaps (the shifter delivers in 0.4 s bursts)

const ctx = new audio.AudioContext({ sampleRate: RENDER_SAMPLE_RATE, latencyHint: 'interactive' });
const chain = buildChain(ctx, settings);
chain.output.connect(ctx.destination);

let next = 0;
let pending: Buffer = Buffer.alloc(0);

function play(frames: Float32Array): void {
  const buf = ctx.createBuffer(1, frames.length, RENDER_SAMPLE_RATE);
  buf.copyToChannel(frames, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(chain.input);
  const now = ctx.currentTime;
  if (next < now + 0.005) next = now + LEAD;     // first piece, or the input paused: start a little ahead
  src.start(next);
  next += frames.length / RENDER_SAMPLE_RATE;
}

process.stdin.on('data', (chunk: Buffer) => {
  pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
  const bytes = BLOCK * 4;
  while (pending.length >= bytes) {
    const piece = new Float32Array(BLOCK);
    for (let i = 0; i < BLOCK; i++) piece[i] = pending.readFloatLE(i * 4);
    pending = pending.subarray(bytes);
    if (!shifter) { play(piece); continue; }
    const ready = shifter.push(piece);
    if (ready.length) play(ready);
  }
});
process.stdin.on('end', () => setTimeout(() => process.exit(0), 3000));
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { ctx.close(); process.exit(0); });
process.stderr.write('adjutant live effect: running (Ctrl+C stops)\n');
