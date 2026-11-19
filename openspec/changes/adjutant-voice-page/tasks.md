## 1. Project setup

- [x] 1.1 Initialise a git repository with a `.gitignore` covering `node_modules/`, `dist/` and `reference/`
- [x] 1.2 Scaffold a Vite + TypeScript project (no UI framework) with dev, build and preview scripts
- [x] 1.3 Add a test runner (Vitest) and confirm an empty test passes

## 2. Effect chain spike

- [x] 2.1 Define the effect parameter schema: name, min, max, default (provisional) for band-limit, comb, doubling, ring mod, grit and output gain
- [x] 2.2 Implement the graph builder that constructs the chain on any `BaseAudioContext` from a parameter object, with live parameter updates
- [x] 2.3 Build a throwaway spike page: load a local speech file, loop it through the chain, one slider per parameter, per-stage bypass, dry/processed toggle
- [x] 2.4 Add an "export parameters" button on the spike page that copies the current values as JSON
- [x] 2.5 Obtain Adjutant reference lines for local use only, placed in the git-ignored `reference/` directory (needs the user; see design open questions)
- [x] 2.6 Inspect reference spectrograms to confirm or reject the comb-filter hypothesis and note what is actually present
- [x] 2.7 (fitted to measurements of the reference; listening check still open) Tune by ear against the references; revise stage order or parameter set if needed; record whether an AudioWorklet stage is required

## 3. Voice effect (production)

- [x] 3.1 Save the tuned values as the default preset (paste the spike export into `OVERRIDES` in `src/effect/preset.ts`; the file exists with provisional values)
- [x] 3.2 Implement parameter clamping to schema bounds, with unit tests
- [x] 3.3 Implement offline rendering via `OfflineAudioContext` using the same builder, including tail padding for delay stages
- [x] 3.4 Add output level protection so extreme settings cannot clip, with a test rendering at all-maximum parameters
- [x] 3.5 Implement the WAV encoder (16-bit PCM mono) with a unit test on a known buffer

## 4. Speech synthesis

- [x] 4.1 Define the synthesiser interface and worker message protocol (load, progress, synthesise, error)
- [x] 4.2 Spike Piper in a worker behind the interface with one candidate voice
- [x] 4.3 Spike Kokoro in a worker behind the interface with one candidate voice
- [x] 4.4 A/B both engines and candidate voices through the effect chain (`?engine=` and `&voice=` overrides); pick one engine and voice; remove the other; record the choice in design.md (needs a listener)
- [x] 4.5 Implement deferred model loading on first request with progress reporting and browser caching
- [x] 4.6 Implement sentence splitting and concatenation with a configurable silence gap, with unit tests
- [x] 4.7 Wire speaking rate through to the engine
- [x] 4.8 Enforce input limits (empty, over 1,000 characters) and surface load/synthesis errors with retry
- [x] 4.9 Pin the model revision: neither engine package exposes one, so this needs self-hosted model files (decide with 6.4)

## 5. Page

- [x] 5.1 Build the layout: text field with character counter, speak, stop, download, status area, non-affiliation notice
- [x] 5.2 Wire speak: synthesise, play through the live effect graph, stop previous playback first; add Ctrl/Cmd+Enter
- [x] 5.3 Implement status states: downloading with progress, synthesising, playing, idle, error
- [x] 5.4 Build the advanced drawer generated from the parameter schema (effect and delivery parameters) with reset
- [x] 5.5 Wire WAV download using offline rendering, including the no-prior-playback case
- [x] 5.6 Write the canned lines (original text) and add them as one-click buttons
- [x] 5.7 Implement URL-fragment state: encode text plus non-default settings, restore on load without auto-play, tolerate malformed fragments; unit-test encode/decode
- [x] 5.8 Add feature detection for WebAssembly, Web Workers and Web Audio with an unsupported-browser message
- [x] 5.9 Style the page with its own visual identity (no game artwork); verify no horizontal scroll at 375 px width

## 6. Verification and release

- [x] 6.1 Remove the spike page from the production build (keep it as a dev-only route or delete it)
- [ ] 6.2 Manually test in desktop Chrome, Firefox and Safari (automated run in headless Chromium passed; Firefox and Safari untested): first-use download, cached return visit, speak/stop, sliders during playback, download, shared link
- [x] 6.3 Confirm the built `dist/` contains no game audio and the text never appears in network requests
- [x] 6.4 Decide model hosting (self-hosted vs engine CDN) and static host; record both in design.md
- [ ] 6.5 Deploy the static build and smoke-test the live URL
