import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PRESET } from '../effect/preset';
import type { Settings } from '../effect/params';
import { prepare, synthOptions } from '../effect/delivery';
import { DOUBLE_BEEP_LEVEL, doubleBeep, introTone, withIntro } from '../effect/intro';
import { RENDER_SAMPLE_RATE, loopCompensation } from '../effect/graph';
import { renderOffline } from '../effect/render';
import { decodeWav, encodeWav } from '../audio/wav';
import { decodeState } from '../page/hash';
import { joinWithGaps, normalisePeak, sentenceBounds, splitParagraphs, tightenPauses, trimSilence } from '../tts/text';
import { createPiper, type PiperDeps } from '../tts/engines/piper';
import { createBilingual } from '../tts/engines/ukrainian';
import { WHERE_WAS_I } from './interrupt';
import { Turn } from './turn';

/**
 * The voice outside a browser: the same model, delivery shaping and effect
 * chain as the page, with the native ONNX runtime, a Web Audio implementation
 * for Node, and files on disk in place of the browser's caches.
 */

const require = createRequire(import.meta.url);
export const CACHE_DIR = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'adjutant-voice');
const MODEL_DIR = join(CACHE_DIR, 'models');
const SPOKEN_DIR = join(CACHE_DIR, 'spoken');
/** Rendered phrases kept for reuse; notifications repeat themselves a lot. */
const SPOKEN_KEEP = 200;
/** Bump when the voice code changes in a way that should invalidate kept phrases. */
const VOICE_VERSION = 23;  // 23: the two nuclear lines are prepared with the game's melody

async function fetchToDisk(url: string, expectedBytes: number, onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  mkdirSync(MODEL_DIR, { recursive: true });
  const file = join(MODEL_DIR, url.split('/').pop()!);
  if (!existsSync(file) || (expectedBytes > 0 && statSync(file).size !== expectedBytes)) {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url.split('/').pop()}`);
    const total = Number(res.headers.get('content-length')) || expectedBytes;
    const parts: Uint8Array[] = [];
    let loaded = 0;
    for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
      parts.push(part);
      loaded += part.length;
      if (expectedBytes > 0) onProgress(loaded, Math.max(total, loaded));
    }
    writeFileSync(`${file}.part`, Buffer.concat(parts));
    renameSync(`${file}.part`, file);
  }
  const bytes = readFileSync(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function settingsFromLink(link: string | undefined): Settings {
  if (!link) return { ...DEFAULT_PRESET };
  return decodeState(link.includes('#') ? link.slice(link.indexOf('#')) : link, DEFAULT_PRESET).settings;
}

/** The lead-in blip's gap: 0.11 s of silence, the 0.11 s blip, then BLIP_AFTER_SECONDS (0.36 s, heard as about 0.28 s,
 *  as in the game) before the first word. */
const BLIP_LEAD_MS = 580;

/**
 * The processed speech for `text` as a WAV file on disk. Reuses an earlier rendering of the same words.
 * `lead` is the sound before the first word: the intro tone; for a piece that continues an earlier
 * one (the next paragraph of a reading) the short blip that separates paragraphs; or the double beep
 * that opens a reading.
 */
export async function renderToFile(text: string, settings: Settings, onProgress: (loaded: number, total: number) => void = () => {}, lead: 'intro' | 'blip' | 'double-beep' = 'intro'): Promise<string> {
  if (lead !== 'intro') settings = { ...settings, introLevel: 0 };
  mkdirSync(SPOKEN_DIR, { recursive: true });
  const key = createHash('sha1').update(JSON.stringify([VOICE_VERSION, text, preparedStamp(text), settings, ...(lead === 'intro' ? [] : [lead === 'double-beep' ? 'double-beep-3' : lead])])).digest('hex');
  const file = join(SPOKEN_DIR, `${key}.wav`);
  if (existsSync(file)) return file;

  const { sentences, startsParagraph } = splitParagraphs(text.trim());
  if (sentences.length === 0) throw new Error('There is no text to speak.');

  const ort = require('onnxruntime-node');
  const { phonemize } = await import('phonemizer');
  const audio = require('node-web-audio-api');
  (globalThis as Record<string, unknown>).OfflineAudioContext ??= audio.OfflineAudioContext;
  loopCompensation.seconds = 128 / RENDER_SAMPLE_RATE;

  const deps: PiperDeps = {
    ort,
    phonemize: phonemize as (text: string, voice: string) => Promise<string[]>,
    fetchBytes: fetchToDisk,
    createSession: (model) => ort.InferenceSession.create(new Uint8Array(model)),
    stressData: async () => {
      // dist-cli/say.js sits one folder below the project root.
      const bytes = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'tts', 'uk', 'uk-stress.bin.gz'));
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    },
  };
  const engine = createBilingual(deps, createPiper(deps, null));
  await engine.load(onProgress);

  const opts = synthOptions(settings);
  const chunks: Float32Array[] = [];
  let sampleRate = 22050;
  for (const sentence of sentences) {
    const ready = process.env.ADJUTANT_RAW_DIR ? undefined : preparedLine(sentence);
    if (ready) {
      sampleRate = ready.sampleRate;
      chunks.push(ready.samples);
      continue;
    }
    const out = await engine.synth(sentence, opts.rate);
    sampleRate = out.sampleRate;
    const chunk = tightenPauses(trimSilence(out.samples, sampleRate), sampleRate, opts.flow);
    // For scripts/shape-line.py: the voice before any shaping and before the effect.
    if (process.env.ADJUTANT_RAW_DIR) writeFileSync(join(process.env.ADJUTANT_RAW_DIR, `raw-${chunks.length}.wav`), Buffer.from(encodeWav(chunk, sampleRate)));
    chunks.push(isAlertWord(sentence) ? alertWord(chunk, sampleRate) : sentence.trim() === WHERE_WAS_I ? whereWasI(chunk) : chunk);
  }
  let samples = joinWithGaps(chunks, sampleRate, opts.gapMs, opts.blipLevel, startsParagraph);
  let bounds = sentenceBounds(chunks, sampleRate, opts.gapMs);
  if (lead === 'blip') {
    // The same blip that separates paragraphs inside one piece, here opening the piece.
    const body = samples.length;
    samples = joinWithGaps([new Float32Array(0), samples], sampleRate, BLIP_LEAD_MS, opts.blipLevel || DEFAULT_PRESET.blipLevel);
    const shift = samples.length - body;
    // An empty first entry, so every real sentence counts as a later one and keeps its opening lift.
    bounds = [[0, 0], ...bounds.map(([a, b]): [number, number] => [a + shift, b + shift])];
  }
  const speech = prepare({ samples: normalisePeak(samples), sampleRate, bounds }, settings);
  let rendered = await renderOffline(speech.samples, speech.sampleRate, settings);
  if (lead === 'double-beep') {
    // Added after the effect chain, so the beep stays dry while the voice carries the effect.
    rendered = withIntro(rendered, RENDER_SAMPLE_RATE, DOUBLE_BEEP_LEVEL, doubleBeep(RENDER_SAMPLE_RATE));
  }
  // Where each sentence begins in the finished audio, so a reading that is interrupted knows where it was.
  const leadSeconds = (settings.introLevel > 0 ? introTone(speech.sampleRate).length / speech.sampleRate : 0)
    + (lead === 'double-beep' ? doubleBeep(RENDER_SAMPLE_RATE).length / RENDER_SAMPLE_RATE : 0);
  const marks: Marks = {
    starts: (lead === 'blip' ? bounds.slice(1) : bounds).map(([start]) => leadSeconds + start / speech.sampleRate),
    seconds: rendered.length / RENDER_SAMPLE_RATE,
  };
  writeFileSync(marksFile(file), JSON.stringify(marks));
  writeFileSync(`${file}.part`, Buffer.from(encodeWav(rendered, RENDER_SAMPLE_RATE)));
  renameSync(`${file}.part`, file);
  prune();
  return file;
}

/** "Увага!" on its own, as it opens a notification that interrupts a reading. */
const isAlertWord = (sentence: string) => sentence.normalize('NFD').replace(/\u0301/g, '').toLowerCase().trim() === 'увага!';
const ALERT_EDGE_GAIN = 1.2, ALERT_MIDDLE_GAIN = 0.8, ALERT_PAUSE_MS = 250;

/**
 * The alert word called out: its first and last syllables a little louder than the middle one,
 * and a longer pause after it than between ordinary sentences.
 */
function alertWord(word: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(word.length + Math.round((ALERT_PAUSE_MS / 1000) * sampleRate));
  for (let i = 0; i < word.length; i++) {
    const fromMiddle = Math.abs((2 * i) / word.length - 1); // 1 at both ends, 0 in the middle
    out[i] = word[i] * (ALERT_MIDDLE_GAIN + (ALERT_EDGE_GAIN - ALERT_MIDDLE_GAIN) * Math.pow(fromMiddle, 1.5));
  }
  return out;
}

/**
 * "Where WAS I?" with the loudness of the owner's own recording of it (the second take, 2026-11-19):
 * "was" about twice as loud as the words on either side. Stress alone gets the voice to 1.4 times.
 * The words fall at fixed shares of the phrase: "where" to 0.29, "was" to 0.57, "I" to the end.
 */
function whereWasI(phrase: Float32Array): Float32Array {
  const WHERE = 0.78, WAS = 1.1, I = 0.75, BLEND = 0.06;
  const mix = (a: number, b: number, t: number) => a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t))));
  const out = new Float32Array(phrase.length);
  for (let i = 0; i < phrase.length; i++) {
    const at = i / phrase.length;
    const gain = at < 0.43 ? mix(WHERE, WAS, (at - 0.29 + BLEND / 2) / BLEND) : mix(WAS, I, (at - 0.57 + BLEND / 2) / BLEND);
    out[i] = phrase[i] * gain;
  }
  return out;
}

/**
 * Lines whose melody the voice cannot produce by itself. Each was spoken once by this same voice and
 * then given the melody, loudness and pause of a reference delivery by scripts/shape-line.py, which
 * changes pitch without changing the speed of any word or the colour of the voice. The result is kept
 * in src/node/lines/ and used here in place of a fresh rendering; the effect is applied as usual.
 */
const PREPARED_LINES: Record<string, string> = {
  'nuclear missile ready.': 'nuclear-missile-ready.wav',
  'nuclear launch detected.': 'nuclear-launch-detected.wav',
  'nuclear launch, detected.': 'nuclear-launch-detected.wav',
};

const linesDir = () => join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'node', 'lines'); // dist-cli/say.js sits one folder below the project root

/** Changes when a prepared line that `text` uses is made again, so an older rendering of the text is not reused. */
function preparedStamp(text: string): string {
  return Object.entries(PREPARED_LINES).filter(([words]) => text.toLowerCase().includes(words)).map(([, name]) => {
    try { const s = statSync(join(linesDir(), name)); return `${name}:${s.size}:${Math.round(s.mtimeMs)}`; } catch { return `${name}:none`; }
  }).join(',');
}

function preparedLine(sentence: string): { samples: Float32Array; sampleRate: number } | undefined {
  const name = PREPARED_LINES[sentence.trim().toLowerCase()];
  if (!name) return undefined;
  try {
    const bytes = readFileSync(join(linesDir(), name));
    return decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  } catch { return undefined; } // not prepared on this machine: the voice says it in its own way
}

function prune(): void {
  const files = readdirSync(SPOKEN_DIR).filter((f) => f.endsWith('.wav')).map((f) => ({ f, t: statSync(join(SPOKEN_DIR, f)).mtimeMs }));
  files.sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(SPOKEN_KEEP)) {
    unlinkSync(join(SPOKEN_DIR, f));
    try { unlinkSync(marksFile(join(SPOKEN_DIR, f))); } catch { /* an older phrase without marks */ }
  }
}

/** When each sentence of a rendered phrase begins, and how long the phrase is, in seconds. */
export type Marks = { starts: number[]; seconds: number };
const marksFile = (wav: string) => wav.replace(/\.wav$/, '.json');

export function marksOf(wav: string): Marks | undefined {
  try { return JSON.parse(readFileSync(marksFile(wav), 'utf8')) as Marks; } catch { return undefined; }
}

const PLAYERS: Array<[string, string[]]> = [['paplay', []], ['pw-play', []], ['aplay', ['-q']], ['afplay', []], ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet']]];

const turn = new Turn(CACHE_DIR);
const POLL_MS = 120;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True if a reading is being spoken now: an ordinary speaker holds the lock, or the reading script is between paragraphs. */
export function readingInProgress(): boolean {
  const holder = turn.holder();
  if (holder && !holder.priority && holder.pid !== process.pid) return true;
  try {
    process.kill(-Number(readFileSync(join(CACHE_DIR, 'read-aloud.pid'), 'utf8')), 0);
    return true;
  } catch { return false; }
}

/**
 * Play one file when it is this process's turn. An ordinary speaker gives way to a priority
 * request: the player is stopped and the answer is how many seconds had been played. `null`
 * means the file played to its end.
 */
async function playOnce(file: string, priority: boolean): Promise<number | null> {
  while (!turn.take(priority)) await sleep(POLL_MS);
  const release = () => { turn.drop(); };
  const stop = () => { release(); turn.withdraw(); process.exit(143); };
  process.once('exit', release);
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    for (const [cmd, args] of PLAYERS) {
      const started = Date.now();
      let cut: number | null = null;
      const result = await new Promise<'ok' | 'missing' | 'failed'>((resolve) => {
        const p = spawn(cmd, [...args, file], { stdio: 'ignore' });
        const watch = priority ? undefined : setInterval(() => {
          if (cut !== null || !turn.priorityWaiting()) return;
          cut = (Date.now() - started) / 1000;
          p.kill('SIGTERM');
        }, POLL_MS);
        const done = (r: 'ok' | 'missing' | 'failed') => { clearInterval(watch); resolve(r); };
        p.on('error', () => done('missing'));
        p.on('exit', (code) => done(code === 0 ? 'ok' : 'failed'));
      });
      if (cut !== null) return cut;
      if (result === 'ok') return null;
    }
    throw new Error('No audio player worked (tried paplay, pw-play, aplay, afplay, ffplay).');
  } finally {
    release();
    process.off('exit', release); process.off('SIGTERM', stop); process.off('SIGINT', stop);
  }
}

/** A copy of `file` that begins `from` seconds in, with a short fade-in so the edge does not click. */
function tailFile(file: string, from: number): string {
  const bytes = readFileSync(file);
  const { samples, sampleRate } = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const tail = samples.slice(Math.min(samples.length, Math.max(0, Math.round((from - 0.03) * sampleRate))));
  const fade = Math.min(tail.length, Math.round(0.02 * sampleRate));
  for (let i = 0; i < fade; i++) tail[i] *= i / fade;
  const out = join(SPOKEN_DIR, `tail-${process.pid}.wav`);
  writeFileSync(out, Buffer.from(encodeWav(tail, sampleRate)));
  return out;
}

/** What to do after an interruption: an optional phrase to say first, and where in the file to go on from. `null`: nothing more. */
export type Return = { phrase?: string; from: number } | null;

/**
 * Play a WAV file through the first audio player found on this machine, waiting for its turn.
 * With `priority` (a notification) it takes the speaker from a reading in progress. Without it
 * (a reading), it gives way to a notification and afterwards asks `onInterrupt` how to come back;
 * with no `onInterrupt` it plays the file again from its start.
 */
export async function playFile(file: string, options: { priority?: boolean; onInterrupt?: (cutSeconds: number) => Promise<Return> } = {}): Promise<void> {
  const priority = !!options.priority;
  if (priority) {
    turn.request();
    process.once('exit', () => turn.withdraw());
  }
  let from = 0;
  let tail: string | undefined;
  try {
    for (;;) {
      const cut = await playOnce(from > 0 ? (tail = tailFile(file, from)) : file, priority);
      if (cut === null) return;
      const back = options.onInterrupt ? await options.onInterrupt(from > 0 ? from - 0.03 + cut : cut) : { from: 0 };
      if (!back) return;
      from = back.from;
      // The phrase itself can be cut off by a second notification; it is then said again.
      if (back.phrase) while ((await playOnce(back.phrase, priority)) !== null) { /* again */ }
    }
  } finally {
    if (priority) turn.withdraw();
    if (tail) try { unlinkSync(tail); } catch { /* already gone */ }
  }
}
