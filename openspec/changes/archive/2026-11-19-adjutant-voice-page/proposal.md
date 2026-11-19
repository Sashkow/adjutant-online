## Why

There is no simple way to hear arbitrary text in the calm, metallic computer-advisor voice of the StarCraft 1 Adjutant: the only public guidance (a 2013 Super User thread) points at generic "robot voice" tutorials that do not resemble her. A stiff stock TTS voice plus the right effect chain can get close, and both now run entirely in a browser, so this can be a free static page with no backend.

## What Changes

- New static web page, desktop first: type text, press a button, hear it spoken in an Adjutant-style voice.
- Text-to-speech runs in the browser (WASM, in a worker) using a stock neutral female voice with calm, slightly slow delivery and deliberate pauses at punctuation.
- A Web Audio effect chain gives the voice its character: band-limiting, comb/static-flanger resonance, slight doubling, lo-fi grit, optional ring modulation.
- One tuned default preset, plus an "advanced" drawer exposing the effect and delivery parameters as sliders.
- Download the result as a WAV file.
- Shareable links: the text (and any non-default settings) travel in the URL hash.
- A few canned, originally written lines so the page is fun on first click.
- Model download progress indicator, with the model cached for later visits.
- The work starts with a spike: a throwaway slider page that tunes the effect chain on any speech clip before TTS is wired in.

Explicitly out of scope:

- No backend and no cloud TTS API.
- No game audio shipped in the repository or served by the page.
- No voice cloning or model training on the original actress's lines.
- No Blizzard artwork, logos or UI recreation; the page states it is an unaffiliated fan tool.
- Mobile optimisation is deferred (the page must not break on phones, but is not tuned for them).
- Live microphone input and uploaded-audio input are deferred.

## Capabilities

### New Capabilities

- `speech-synthesis`: turning typed text into raw speech audio in the browser, including model loading, caching, delivery shaping (rate, pauses) and input limits.
- `voice-effect`: the parameterised effect chain that turns plain speech into the Adjutant-style voice, its default preset, and identical live and offline rendering.
- `voice-page`: the page itself: text entry, speak/stop, canned lines, advanced drawer, WAV download, shareable URL, status and error display.

### Modified Capabilities

None; this is the first change in an empty project.

## Impact

- New project from scratch: build tooling, source tree and static deployment all introduced here.
- New runtime dependencies: one in-browser TTS engine and its voice model (tens of MB, fetched on first use and cached by the browser).
- Browser requirements: WebAssembly, Web Workers, Web Audio API; current desktop Chrome, Firefox and Safari.
- Effect parameters are hypotheses until tuned by ear against reference lines, which are not yet available; obtaining them for local tuning is a prerequisite for calling the preset finished.
