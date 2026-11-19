/**
 * Throwaway tuning page (dev server only; not a build entry).
 * Loop any speech clip through the chain, move sliders, export the values.
 */
import { DEFAULT_PRESET } from '../effect/preset';
import { GROUP_LABELS, SPEC_BY_KEY, diffSettings, type ParamGroup, type ParamKey, type Settings } from '../effect/params';
import { Player } from '../effect/player';
import { prepare, synthOptions } from '../effect/delivery';
import { Synthesizer } from '../tts/client';
import { buildControls } from '../page/controls';
import { engineFromQuery } from '../page/engine';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const player = new Player();
const { engine, voice } = engineFromQuery(location.search);
const synth = new Synthesizer(engine, voice);

let settings: Settings = { ...DEFAULT_PRESET };
let clip: { samples: Float32Array; sampleRate: number } | null = null;
const bypassed = new Set<ParamGroup>();

/** Turning a stage "off" means setting its amount parameters to their neutral value. */
const NEUTRAL: Partial<Record<ParamGroup, Partial<Settings>>> = {
  band: { hpHz: SPEC_BY_KEY.hpHz.min, lpHz: SPEC_BY_KEY.lpHz.max },
  tone: { shelfDb: 0, bodyDb: 0, midDb: 0 },
  comb: { combMix: 0, combFeedback: 0 },
  double: { doubleMix: 0 },
  echo: { echoMix: 0 },
  space: { reverbMix: 0 },
  radio: { radioMix: 0 },
  ring: { ringDepth: 0 },
  grit: { gritMix: 0 },
};

function effective(): Settings {
  let s = { ...settings };
  for (const g of bypassed) s = { ...s, ...NEUTRAL[g] };
  return s;
}

const status = (text: string, state = 'idle') => {
  $('status').dataset.state = state;
  $('status-text').textContent = text;
};

async function start(): Promise<void> {
  if (!clip) return;
  player.unlock();
  await player.play(clip.samples, clip.sampleRate, effective(), {
    loop: true,
    bypass: $<HTMLInputElement>('dry').checked,
  });
  $<HTMLButtonElement>('stop').disabled = false;
  status('Looping.', 'playing');
}

function setClip(samples: Float32Array, sampleRate: number, name: string): void {
  clip = { samples, sampleRate };
  $<HTMLButtonElement>('play').disabled = false;
  status(`Loaded ${name} (${(samples.length / sampleRate).toFixed(1)} s).`);
}

$<HTMLInputElement>('file').addEventListener('change', async (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    setClip(decoded.getChannelData(0).slice(), decoded.sampleRate, file.name);
  } catch (e) {
    status(`Could not decode that file: ${e instanceof Error ? e.message : e}`, 'error');
  }
});

$('tts').addEventListener('click', async () => {
  try {
    const raw = await synth.synthesize($<HTMLInputElement>('tts-text').value, synthOptions(settings), (s) =>
      status(s.phase === 'loading'
        ? `Downloading voice model… ${s.fraction === null ? '' : Math.round(s.fraction * 100) + '%'}`
        : 'Synthesising…', 'busy'));
    const speech = prepare(raw, settings);
    setClip(speech.samples, speech.sampleRate, `${engine} clip`);
  } catch (e) {
    status(e instanceof Error ? e.message : String(e), 'error');
  }
});

$('play').addEventListener('click', () => void start());
$('stop').addEventListener('click', () => {
  player.stop();
  $<HTMLButtonElement>('stop').disabled = true;
  status('Stopped.');
});
$('dry').addEventListener('change', () => { if (player.playing) void start(); });

for (const g of Object.keys(NEUTRAL) as ParamGroup[]) {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    if (box.checked) bypassed.add(g); else bypassed.delete(g);
    player.update(effective());
  });
  label.append(box, ` Bypass ${GROUP_LABELS[g].toLowerCase()}`);
  $('bypass').append(label);
}

const controls = buildControls($('controls'), settings, (key: ParamKey, value: number) => {
  settings = { ...settings, [key]: value };
  player.update(effective());
});

$('export').addEventListener('click', async () => {
  // Only values that differ from the current preset: paste into OVERRIDES in preset.ts.
  const json = JSON.stringify(diffSettings(settings, DEFAULT_PRESET), null, 2);
  $<HTMLTextAreaElement>('json').value = json;
  try {
    await navigator.clipboard.writeText(json);
    status('Parameters copied to the clipboard.');
  } catch {
    status('Parameters shown below (clipboard unavailable).');
  }
});

$('reset').addEventListener('click', () => {
  settings = { ...DEFAULT_PRESET };
  controls.set(settings);
  player.update(effective());
});
