import { DEFAULT_PRESET } from '../effect/preset';
import { type Settings } from '../effect/params';
import { Player } from '../effect/player';
import { renderOffline } from '../effect/render';
import { prepare, synthOptions } from '../effect/delivery';
import { RENDER_SAMPLE_RATE } from '../effect/graph';
import { encodeWav } from '../audio/wav';
import { SynthError, Synthesizer, type SynthStatus } from '../tts/client';
import { MAX_CHARS, checkText } from '../tts/text';
import { buildControls } from './controls';
import { engineFromQuery } from './engine';
import { decodeState, encodeState } from './hash';
import { CANNED_LINES } from './lines';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const textEl = $<HTMLTextAreaElement>('text');
const countEl = $('count');
const hintEl = $('hint');
const speakBtn = $<HTMLButtonElement>('speak');
const stopBtn = $<HTMLButtonElement>('stop');
const downloadBtn = $<HTMLButtonElement>('download');
const statusEl = $('status');
const statusText = $('status-text');
const progressEl = $<HTMLProgressElement>('progress');
const linesEl = $('lines');
const advancedEl = $<HTMLDetailsElement>('advanced');
const controlsEl = $('controls');
const resetBtn = $<HTMLButtonElement>('reset');

const supported =
  typeof WebAssembly === 'object' &&
  typeof Worker === 'function' &&
  typeof AudioContext === 'function' &&
  typeof OfflineAudioContext === 'function';

const { engine, voice } = engineFromQuery(location.search);
const synth = new Synthesizer(engine, voice);
const player = new Player();

let settings: Settings = { ...DEFAULT_PRESET };
/** True while a speak or download request is being prepared. */
let busy = false;

type State = 'idle' | 'busy' | 'playing' | 'error';

function setStatus(state: State, message: string, fraction: number | null | undefined = undefined): void {
  statusEl.dataset.state = state;
  statusText.textContent = message;
  if (fraction === undefined) {
    progressEl.hidden = true;
  } else {
    progressEl.hidden = false;
    if (fraction === null) progressEl.removeAttribute('value');
    else progressEl.value = fraction;
  }
}

function showSynthStatus(s: SynthStatus): void {
  if (s.phase === 'loading') {
    const pct = s.fraction === null ? '' : ` ${Math.round(s.fraction * 100)}%`;
    setStatus('busy', `Downloading voice model…${pct}`, s.fraction);
  } else {
    const of = s.total > 1 ? ` (sentence ${s.done + 1} of ${s.total})` : '';
    setStatus('busy', `Synthesising…${of}`);
  }
}

function refreshControls(): void {
  const length = textEl.value.length;
  const over = length > MAX_CHARS;
  countEl.textContent = `${length} / ${MAX_CHARS}`;
  countEl.dataset.over = String(over);
  const ok = supported && checkText(textEl.value).ok;
  speakBtn.disabled = !ok;
  downloadBtn.disabled = !ok || busy;
  stopBtn.disabled = !(busy || player.playing);
}

let hashTimer: number | undefined;
function saveToUrl(): void {
  window.clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    const hash = encodeState({ text: textEl.value.slice(0, MAX_CHARS), settings }, DEFAULT_PRESET);
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }, 250);
}

function loadFromUrl(): void {
  const state = decodeState(location.hash, DEFAULT_PRESET);
  textEl.value = state.text;
  settings = state.settings;
  controls.set(settings);
  player.update(settings);
  if (encodeState({ text: '', settings }, DEFAULT_PRESET)) advancedEl.open = true;
  refreshControls();
}

function describe(error: unknown): string {
  if (error instanceof SynthError) {
    if (error.kind === 'load') return `Could not load the voice model. Check your connection and try again. (${error.message})`;
    if (error.kind === 'synth') return `Speech synthesis failed. Try again. (${error.message})`;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

const cancelled = (e: unknown) => e instanceof SynthError && e.kind === 'cancelled';

async function speak(): Promise<void> {
  if (speakBtn.disabled) return;
  player.unlock(); // inside the user gesture, before any await
  player.stop();
  busy = true;
  refreshControls();
  try {
    const speech = prepare(await synth.synthesize(textEl.value, synthOptions(settings), showSynthStatus), settings);
    busy = false;
    await player.play(speech.samples, speech.sampleRate, settings, {
      onEnded: () => {
        setStatus('idle', 'Ready.');
        refreshControls();
      },
    });
    setStatus('playing', 'Speaking…');
  } catch (e) {
    if (cancelled(e)) return; // a newer request or Stop owns the status line now
    busy = false;
    setStatus('error', describe(e));
  } finally {
    refreshControls();
  }
}

function stop(): void {
  synth.cancel();
  player.stop();
  busy = false;
  setStatus('idle', 'Stopped.');
  refreshControls();
}

async function download(): Promise<void> {
  if (downloadBtn.disabled) return;
  player.stop();
  busy = true;
  refreshControls();
  try {
    const speech = prepare(await synth.synthesize(textEl.value, synthOptions(settings), showSynthStatus), settings);
    setStatus('busy', 'Rendering…');
    const rendered = await renderOffline(speech.samples, speech.sampleRate, settings);
    const url = URL.createObjectURL(new Blob([encodeWav(rendered, RENDER_SAMPLE_RATE)], { type: 'audio/wav' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adjutant-online.wav';
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    busy = false;
    setStatus('idle', 'Saved adjutant-online.wav.');
  } catch (e) {
    if (cancelled(e)) return;
    busy = false;
    setStatus('error', describe(e));
  } finally {
    refreshControls();
  }
}

const controls = buildControls(
  controlsEl,
  settings,
  (key, value) => {
    settings = { ...settings, [key]: value };
    player.update(settings);
    saveToUrl();
  },
  { delivery: 'Delivery and intro changes apply the next time you press Speak.' },
);

for (const line of CANNED_LINES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = line;
  b.addEventListener('click', () => {
    textEl.value = line;
    refreshControls();
    saveToUrl();
    void speak();
  });
  linesEl.append(b);
}

textEl.addEventListener('input', () => {
  refreshControls();
  saveToUrl();
});
textEl.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
    ev.preventDefault();
    void speak();
  }
});
speakBtn.addEventListener('click', () => void speak());
stopBtn.addEventListener('click', stop);
downloadBtn.addEventListener('click', () => void download());
resetBtn.addEventListener('click', () => {
  settings = { ...DEFAULT_PRESET };
  controls.set(settings);
  player.update(settings);
  saveToUrl();
});
window.addEventListener('hashchange', loadFromUrl);

if (/Mac|iPhone|iPad/.test(navigator.platform)) hintEl.textContent = '⌘ + Enter to speak';

loadFromUrl();
if (!supported) {
  setStatus('error', 'This browser cannot run the voice: it lacks WebAssembly, Web Workers or Web Audio. Try a current desktop Chrome, Firefox or Safari.');
}
