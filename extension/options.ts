import { DEFAULT_PRESET } from '../src/effect/preset';
import { diffSettings } from '../src/effect/params';
import { decodeState } from '../src/page/hash';

const link = document.getElementById('link') as HTMLInputElement;
const note = document.getElementById('note')!;

void browser.storage.local.get('link').then((s: { link?: string }) => { link.value = s.link ?? ''; });

async function save(): Promise<void> {
  const value = link.value.trim();
  await browser.storage.local.set({ link: value });
  const hash = value.includes('#') ? value.slice(value.indexOf('#')) : value;
  const changed = Object.keys(diffSettings(decodeState(hash, DEFAULT_PRESET).settings, DEFAULT_PRESET)).length;
  note.textContent = value
    ? changed ? `Saved: ${changed} setting(s) differ from the default voice.` : 'Saved, but no voice settings were found in that link; the default voice is used.'
    : 'Saved: default voice.';
}

document.getElementById('save')!.addEventListener('click', () => void save());
document.getElementById('test')!.addEventListener('click', async () => {
  await save();
  void browser.runtime.sendMessage({ type: 'speak', text: 'Voice check. All systems are nominal.' });
});
document.getElementById('stop')!.addEventListener('click', () => void browser.runtime.sendMessage({ type: 'stop' }));
