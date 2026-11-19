import { DEFAULT_PRESET } from '../src/effect/preset';
import type { Settings } from '../src/effect/params';
import { Player } from '../src/effect/player';
import { prepare, synthOptions } from '../src/effect/delivery';
import { SynthError, Synthesizer, type SynthStatus } from '../src/tts/client';
import { joinWithGaps } from '../src/tts/text';
import { decodeState } from '../src/page/hash';
import { chunkText } from '../src/extension/chunks';

/**
 * Background page: owns the voice model and the audio output, so reading
 * carries on while the visitor scrolls or switches tabs. Long selections are
 * synthesised piece by piece, the next piece being prepared while the
 * current one plays.
 */

const MENU_READ = 'adjutant-read';
const MENU_STOP = 'adjutant-stop';

const synth = new Synthesizer('libritts', null);
const player = new Player();

type Phase = 'idle' | 'loading' | 'synthesising' | 'speaking' | 'error';
const state = { phase: 'idle' as Phase, message: '', piece: 0, pieces: 0 };
/** Identifies the current reading; a newer reading or Stop makes older work give up. */
let run = 0;
/** True once the current reading is audible. */
let audible = false;

function show(phase: Phase, message: string, badge: string): void {
  state.phase = phase;
  state.message = message;
  void browser.browserAction.setBadgeText({ text: badge });
  void browser.browserAction.setBadgeBackgroundColor({ color: phase === 'error' ? '#b3261e' : '#1f6f5c' });
  void browser.browserAction.setTitle({ title: message || 'Read selection aloud' });
  void browser.menus.update(MENU_STOP, { visible: phase !== 'idle' && phase !== 'error' });
}

function showSynth(s: SynthStatus): void {
  // While an earlier piece is playing, preparing the next one is not news.
  if (audible) return;
  if (s.phase === 'loading') {
    const pct = s.fraction === null ? '' : `${Math.round(s.fraction * 100)}%`;
    show('loading', `Downloading the voice model (one time)… ${pct}`, pct || '…');
  } else {
    show('synthesising', 'Preparing speech…', '…');
  }
}

async function settingsFromStorage(): Promise<Settings> {
  try {
    const { link } = (await browser.storage.local.get('link')) as { link?: string };
    if (!link) return { ...DEFAULT_PRESET };
    return decodeState(link.includes('#') ? link.slice(link.indexOf('#')) : link, DEFAULT_PRESET).settings;
  } catch {
    return { ...DEFAULT_PRESET };
  }
}

interface Piece { samples: Float32Array; sampleRate: number }

async function speak(text: string): Promise<void> {
  const id = ++run;
  audible = false;
  synth.cancel();
  player.stop();
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    show('error', 'Select some text first, then try again.', '?');
    return;
  }
  state.pieces = chunks.length;
  const settings = await settingsFromStorage();
  const opts = synthOptions(settings);

  const make = async (i: number): Promise<Piece> => {
    const speech = await synth.synthesize(chunks[i].text, opts, showSynth);
    const first = i === 0, last = i === chunks.length - 1;
    // Each piece carries the pause that follows it (with the blip, if a paragraph ends there), so pieces play back to back.
    const blip = !last && chunks[i + 1].startsParagraph ? opts.blipLevel : 0;
    const samples = last ? speech.samples : joinWithGaps([speech.samples, new Float32Array(0)], speech.sampleRate, opts.gapMs, blip);
    // A leading empty "sentence" makes later pieces open with the sentence lift too.
    const bounds: Array<[number, number]> = first ? speech.bounds : [[0, 0], ...speech.bounds];
    return prepare(
      { samples, sampleRate: speech.sampleRate, bounds },
      { ...settings, introLevel: first ? settings.introLevel : 0, outroLevel: last ? settings.outroLevel : 0 },
    );
  };

  try {
    show('synthesising', 'Preparing speech…', '…');
    let next: Promise<Piece> | null = make(0);
    for (let i = 0; next; i++) {
      const piece: Piece = await next;
      if (id !== run) return;
      const ended = new Promise<void>((resolve) => {
        void player.play(piece.samples, piece.sampleRate, settings, { keepTail: i > 0, onEnded: resolve });
      });
      audible = true;
      state.piece = i + 1;
      show('speaking', chunks.length > 1 ? `Reading… part ${i + 1} of ${chunks.length}` : 'Reading…', '▶');
      next = i + 1 < chunks.length ? make(i + 1) : null;
      next?.catch(() => {}); // reported when awaited
      await ended;
      if (id !== run) return;
    }
    show('idle', '', '');
  } catch (e) {
    if (id !== run || (e instanceof SynthError && e.kind === 'cancelled')) return;
    player.stop();
    const why = e instanceof Error ? e.message : String(e);
    show('error', e instanceof SynthError && e.kind === 'load' ? `Could not load the voice model. Check your connection. (${why})` : `Reading failed. (${why})`, '!');
  }
}

function stop(): void {
  run++;
  audible = false;
  synth.cancel();
  player.stop();
  show('idle', '', '');
}

const busy = () => state.phase === 'loading' || state.phase === 'synthesising' || state.phase === 'speaking';

/** Runs in the page: the selection, including one inside a text field. */
const SELECTION_CODE = `(() => {
  const a = document.activeElement;
  if (a && typeof a.selectionStart === 'number' && a.selectionEnd > a.selectionStart) return a.value.slice(a.selectionStart, a.selectionEnd);
  return String(window.getSelection() || '');
})()`;

/** The selection read from the page itself, which keeps its paragraph breaks. */
async function pageSelection(): Promise<string> {
  const results = (await browser.tabs.executeScript({ code: SELECTION_CODE, allFrames: true })) as unknown[];
  return (results.find((r) => typeof r === 'string' && r.trim()) as string | undefined) ?? '';
}

async function readSelectionOrStop(): Promise<void> {
  if (busy()) { stop(); return; }
  try {
    await speak(await pageSelection());
  } catch {
    show('error', 'This page does not let extensions read the selection.', '!');
  }
}

browser.menus.create({ id: MENU_READ, title: 'Read aloud (Adjutant voice)', contexts: ['selection'] });
browser.menus.create({ id: MENU_STOP, title: 'Stop reading', contexts: ['all'], visible: false });
browser.menus.onClicked.addListener((info: { menuItemId: string; selectionText?: string }) => {
  if (info.menuItemId === MENU_READ) {
    // The menu's own copy of the text may have its line breaks flattened; fall back to it only if needed.
    void pageSelection().catch(() => '').then((text: string) => speak(text || info.selectionText || ''));
  }
  else if (info.menuItemId === MENU_STOP) stop();
});
browser.browserAction.onClicked.addListener(() => void readSelectionOrStop());
browser.commands.onCommand.addListener((name: string) => {
  if (name === 'read-selection') void readSelectionOrStop();
});
browser.runtime.onMessage.addListener((msg: { type?: string; text?: string }) => {
  if (msg?.type === 'speak') void speak(msg.text ?? '');
  else if (msg?.type === 'stop') stop();
});

// For checking the extension from its own pages (runtime.getBackgroundPage()).
Object.assign(window, { adjutant: { state, speak, stop, player } });
