## Context

The project directory is empty: no code, no git repository, no hosting. The product is a single page where a visitor types text and hears it in an Adjutant-style voice. Exploration settled three things: everything runs client-side, desktop comes first, and the effect chain (not the TTS) is what makes or breaks the result.

What is *not* known yet: the actual recipe for the voice. The working hypothesis, from memory and unmeasured, is a calm human read processed with a short comb filter or static flanger, slight doubling, band-limiting and low-fidelity grit, possibly with light ring modulation. No reference clips are available yet to confirm this.

## Goals / Non-Goals

**Goals:**

- Type text, hear a voice that clearly evokes the Adjutant, on a current desktop browser.
- Zero servers: the site is static files on any static host.
- Effect parameters are easy to tune, because they will be retuned once reference clips exist.
- The downloaded WAV sounds the same as what was played.

**Non-Goals:**

- Being indistinguishable from the original recordings.
- Cloud TTS, voice cloning, or anything trained on the game's audio.
- Shipping or serving game audio; Blizzard art or branding.
- Phone performance, live microphone input, uploaded-audio input, audiobook-length text.

## Decisions

### 1. Fully client-side, static site

TTS runs in the browser via WASM. Alternative considered: a server or cloud TTS API, which starts instantly and sounds better but adds cost, an API key, rate limiting and abuse handling. The effect chain deliberately degrades the voice, which hides most of the quality gap, so the server does not earn its cost.

### 2. Vite + TypeScript, no UI framework

The TTS engines ship as npm packages with WASM and worker assets, so a bundler is needed in practice; Vite handles workers and WASM with little configuration. The UI is one textarea, a few buttons and a drawer of sliders, which does not justify a framework. Alternative considered: a no-build single HTML file, rejected because of the WASM/worker packaging.

### 3. TTS behind a small interface; engine chosen by ear

```
synthesize(text, { rate }) -> { samples: Float32Array, sampleRate: number }
```

The engine lives in a Web Worker so synthesis never blocks the page. Two candidates, Piper and Kokoro, are compared in a spike by listening to both *through the effect chain*: Piper is smaller and stiffer, Kokoro larger and more natural, and stiffer may suit the character better. Only the winner ships; the interface exists so the comparison is cheap and a later swap is contained. Voice selection criterion: neutral, lowish, American-English female, flat intonation.

### 4. Delivery shaped by sentence chunking

Text is split into sentences; each is synthesised separately and the results are joined with a configurable silence gap. This gives direct control over the deliberate pauses that characterise the delivery, independent of how a given engine treats punctuation, and bounds per-call synthesis time. Speaking rate is passed to the engine. Alternative considered: one synthesis call for the whole text, which is simpler but leaves pause length to the engine.

### 5. One effect-graph builder for live and offline use

A single function builds the chain on any `BaseAudioContext` from a plain parameter object:

```
source -> band-limit (high-pass + low-pass biquads)
       -> comb (delay mixed with dry; optional feedback)
       -> doubling (second short delay, slightly detuned)
       -> ring mod (gain modulated by oscillator; depth 0 = off)
       -> grit (waveshaper with staircase curve)
       -> output gain
```

Playback uses a live `AudioContext`, so sliders change the sound while it plays. WAV download renders the same graph in an `OfflineAudioContext`. One builder guarantees the two cannot drift apart. Alternative considered: always render offline and play the buffer, which is one path but makes slider tuning stop-and-go.

Stage order and the parameter set are provisional until the spike.

### 6. Native audio nodes first; AudioWorklet only if tuning demands it

Two known limits of native nodes:

- A delay inside a feedback loop cannot be shorter than one render quantum (128 frames, about 2.9 ms at 44.1 kHz). Feedforward combs have no such limit.
- True sample-rate reduction is not available natively; bit-depth reduction is approximated with a waveshaper, and the low-pass filter stands in for the reduced bandwidth.

If the spike shows the signature sound needs a shorter feedback comb or real sample-rate crushing, that one stage moves into an AudioWorklet. Starting native keeps the spike small.

### 7. Presets are data

The default preset is a JSON-serialisable parameter object in one file. The advanced drawer edits a copy of it; "reset" restores it. The spike page gets an "export parameters" button so tuned values can be pasted straight into the preset file.

### 8. State in the URL hash

The hash carries the text and only those parameters that differ from the default preset. The hash (not the query string) is used so the text is never sent to the host. Loading a link fills the page but does not auto-play, because browsers block audio without a user gesture.

### 9. Input limit

Text is capped at 1,000 characters. This keeps synthesis time, memory and URL length reasonable; long-form use is out of scope.

### 10. Reference audio stays local

Reference lines are used only on the developer's machine for tuning by ear and for a spectrogram check of the comb-filter hypothesis. They live in a git-ignored `reference/` directory and are never committed, bundled or served.

### 11. Implementation findings (recorded during apply)

- **Both engines run** end to end in headless Chromium from the production build. Kokoro (`af_sarah`, q8) is the working default; Piper (`en_US-amy-medium`) is selectable with `?engine=piper`. The choice by ear (task 4.4) is still open.
- **Piper has no rate control** through `@mintplex-labs/piper-tts-web`: the length scale is read from the model config with no override. The rate slider only affects Kokoro. Piper also needs its ONNX runtime wasm from a CDN at exactly the bundled `onnxruntime-web` version, which the adapter derives at build time.
- **Third-party hosts at runtime**: `huggingface.co` (model files, both engines) and `cdn.jsdelivr.net` (ONNX runtime wasm; Piper's phonemizer). The typed text was not present in any request.
- **Model revisions are not pinned.** npm package versions are locked, but neither package exposes a Hugging Face revision, so the model files track the upstream default branch. Pinning requires self-hosting them (task 4.9).
- **Sample rate is fixed at 48 kHz** for both live playback and offline rendering, so the 128-frame feedback floor (2.67 ms) is the same in both and the WAV matches what was heard.
- **Synthesised speech is trimmed and peak-normalised** before the chain: per-sentence silence is trimmed so the configured gap is the real gap, and the level is normalised so both engines drive the chain equally.
- **Loudness compensation is power-based**, with a soft limiter (ceiling 0.98) as the guarantee against clipping.
- **Build size** is about 38 MB, almost all of it two ONNX runtime wasm files (15 MB and 22 MB) emitted by the bundler. Relevant to the hosting decision (task 6.4).

### 12. Reference measurements and what they changed

Reference: a 47 s recording of the original lines (14 lines), kept only in the git-ignored `reference/` folder. Measured, not judged by ear:

| Property | Reference | First preset | Current default |
|---|---|---|---|
| Median pitch | 216 Hz | 200 Hz | 211 Hz |
| Pitch range (10th-90th percentile) | 5.5 semitones | 15.7 | 6.0 |
| Metallic doubling | one copy at 12.0 ms | comb at 2.6 ms | one copy at 12 ms, same strength |
| Echo | one copy at 65.0 ms, about 20 dB down, no repeats | none | one copy at 65 ms, same strength |
| Short comb (under 5 ms) | none found | present | off |
| Bandwidth | flat to 10 kHz, steep cut at 11 kHz | cut at 5.2 kHz | steep cut at 9 kHz |
| Half of the energy below | 270 Hz | 469 Hz | similar balance (most bands within 2 dB) |
| Crest factor | 13.2 dB | 18.0 dB | about 15 dB |
| Intro tone before each line | yes, about 0.36 s, 7 dB below the speech | none | synthesised, similar level |

Consequences:

- **The short-comb hypothesis was wrong.** There is no evidence of a comb or flanger under 5 ms. The metallic colour comes from a single 12 ms doubling echo, which interacts with the steady pitch. The comb and ring stages stay available in the drawer but default to off.
- **A second, longer echo** sits 65 ms behind the voice, with no repeats. A first pass with a short analysis window missed it; a 680 ms window shows it clearly. It is a separate echo stage, with optional repeats that default to off.
- **Nothing else robotic was found**: no tremolo, no ring modulation, no fixed resonances. The "robotic metal" quality is the 12 ms copy acting on a very steady pitch.
- **No sign of low-sample-rate imaging**, so no sample-rate crusher was added and no AudioWorklet is needed. Grit is kept subtle.
- **Voice:** `af_bella` is the closest American Kokoro voice by pitch, pitch range and tone balance. `bf_isabella` measures closer still but is British.
- **Pitch shift** (new, default +2 semitones) raises the voice to the reference pitch. It is done by declaring a higher sample rate for the speech buffer, so the browser resamples it; speaking rate and sentence gap are compensated so timing is unchanged. It shifts formants along with pitch, which is a trade-off to judge by ear.
- **Tone stage** (new): a body peak at 500 Hz and a presence shelf, fitted to the reference's long-term spectrum.
- **Compressor** (new), because the reference is denser than raw synthetic speech.
- **Intro tone** (new, optional): a short pulsed, buzzy tone before the speech, synthesised from sine partials. It imitates the character of the reference's intro; it is not a recording.
- The low-pass moved to the end of the chain and was doubled, to model the steep band limit and to tame grit.

### 13. Changes made by ear (listener feedback)

- **Effect strength is above the measured values.** At the measured strength the listener heard almost no effect. Current defaults: metallic doubling 1.0 (measured 0.5), echo 0.38 (measured 0.1), plus a resonance of 0.55 on the 12 ms delay that the reference does not have. Ring modulation and heavy grit were tried and rejected as too rough.
- **Pitch is shifted with TD-PSOLA, not by resampling.** Resampling raised the vocal-tract resonances with the pitch and the voice stopped sounding adult. PSOLA re-spaces pitch-period grains, so pitch moves and the resonances stay: on the real voice, +3.5 semitones moved the pitch from 191 Hz to 233 Hz with a measured envelope shift of 0.0 semitones (resampling: +3.25). It runs on the main thread on a few seconds of audio.
- **"Voice size" is a separate control** (the old resampling path), defaulting to 0.
- **Pitch shifting is off by default.** Both methods were rejected by ear: resampling made the voice sound small, and PSOLA "felt bad". The controls remain in the drawer at 0.
- **Default voice is `af_jessica`**, chosen as the naturally highest American voice. All 15 female English Kokoro voices and 10 Piper voices were measured: none is naturally much above the reference's 216 Hz (highest: `bf_alice` 216 Hz, British; `af_jessica` 211 Hz). The tone defaults were refitted to this voice, which is brighter than `af_bella`. Its intonation is livelier (8 semitones against the reference's 5.5).

### 14. Same-text comparison with the reference

The reference was transcribed locally (13 advisor alerts) and the same lines were synthesised with each candidate voice, so pace and intonation could be compared word for word. Findings:

- **Pace.** She takes a median 1.40 s per line. Kokoro at rate 0.92 is close (0.91x to 1.11x of her duration). The Piper LibriTTS speakers at the model's own pace take only 0.64x; they need a length scale of about 1.55 to 1.65.
- **Mid-range.** Her spectrum is hollow from about 600 Hz to 2.5 kHz (down to -18 dB) and comes back up above 4 kHz. Every candidate carried 5 to 10 dB too much there. A mid-scoop control (peaking cut, default -7 dB at 1.3 kHz) and an "air" shelf above 5.5 kHz replace the earlier presence shelf.
- **Intonation.** Her pitch range is 6 semitones and lines end only about 3 semitones down. `af_jessica` measures 11.6 and -7.7 on the same lines, which reads as conversational. `af_bella` and LibriTTS speakers 731, 100 and 664 are within 0.6 semitones of her range.
- **Pitch.** She is at 221 Hz on these lines; LibriTTS speaker 100 is 231 to 234 Hz, 731 is 239 Hz.
- Pauses inside lines, loudness dynamics, crest factor and voicing strength already match.

### 15. Final voice: Piper LibriTTS-R, speaker 100, with our own adapter

- **Chosen by ear** from six shortlisted speakers after a pitch scan of all 904: speaker index 100 (LibriTTS reader 114), about 231 Hz with a 6-semitone range, with the deeper mid scoop (-10 dB at 1.5 kHz) and +8 dB of air.
- **Own adapter** (`src/tts/engines/libritts.ts`): phonemise with the `phonemizer` package (espeak-ng), map to Piper phoneme ids, run the model with `onnxruntime-web`. This replaces `@mintplex-labs/piper-tts-web`, which could not select a speaker or change pace; that package is removed.
- **Pace** is the model's length scale: 1.52 at rate 1, so the default rate of 0.92 gives about 1.65, the value that matched the reference on the same lines.
- **Model revision is pinned** in the download URL, and the file is kept in the Cache API (about 79 MB).
- **Kokoro stays selectable** with `?engine=kokoro` for comparison; the tone defaults are now fitted to the LibriTTS speaker, not to Kokoro voices.
- Verified in the built page in headless Chromium: first speak, cached second visit with no re-download, download, stop, and no text in any network request.

### 16. "Looming": a metal room, beyond the reference

At the listener's request for a more looming presence, the defaults go past what the reference contains (its lines decay in about 0.12 s with one echo and no reverb). A first attempt with a long dark reverb read as "a marble great hall"; the target is "a metal command center". The Space stage is a ConvolverNode fed a generated, seeded impulse response with a stone-to-metal control: metal adds flutter echoes between parallel walls (7.3 ms and 11.1 ms spacing), inharmonic ringing panel modes, and a bright wash. Defaults: amount 0.22, size 1.0 s, metal 0.75; echo 70 ms at 0.5 with feedback 0.3; resonance 0.62; body +3.5 dB. Lines ring out for about 0.4 s. No audio file is shipped, and live and offline output use the same impulse.

Side note found while measuring: the resonance loop rings at 14.7 ms, not 12 ms, because a delay inside a feedback loop gains one render quantum (2.67 ms). It has been that way since the listener approved the sound, so it is left alone.

### 17. Listener's room choice, and a radio link

- **Room:** the listener chose the tight, fully metal room: amount 0.3, size 0.7 s, metal 1.0, resonance 0.72, echo feedback 0.2.
- **Radio link** (new, at the listener's request for a "transmitting from orbit" feel): at the end of the chain, a voice-band path (380 Hz to 3 kHz, mild overdrive) is blended with the full-range signal (default 0.4). Before the chain, seeded static (hiss plus sparse crackle, default 0.25) is laid under the clip and a pure 2475 Hz sign-off beep follows the speech (default level 0.2). All generated in code. The reference has none of this. **The listener rejected it** ("not it"), so all three default to off; the controls remain in the drawer.

### 18. Delivery defaults set by the listener in the page

Tuned by ear in the running page and saved as defaults: speaking rate 0.88, pitch +0.7 semitones (PSOLA), voice size +0.4 semitones.

### 19. One quoted line among the canned lines

At the owner's request the first canned line is a short quotation (about 50 words) from the game's opening briefing. This departs from the original "original text only" rule; the other five lines remain original. It is text only, no game audio. Worth a second look before the page is published.

### 20. Delivery matched to a longer original passage

The listener supplied the original briefing passage (four sentences); the same text was synthesised and compared. Speech was transcribed locally with Whisper to locate the words.

- **A wrong first reading, corrected.** A first comparison of our dry voice against the processed original suggested our speech was chopped into fragments. That was an artefact of comparing dry with wet audio. With one criterion for both, the real differences were smaller and specific, as below.
- **Pauses.** Hers: about 0.47 s after the greeting, about 0.7 s between sentences, 0.23 s at a clause break, 0.18 s before "and it's likely". Ours had 0.35 s sentence gaps, a 0.7 s pause at the comma and a 0.6 s pause before "and". New defaults: sentence gap 450 ms (measures about 0.74 s with the soft sentence edges), and a Flow control (default 0.9) that shortens quiet stretches inside a sentence: the comma pause is now about 0.30 s and the "and" pause under 0.15 s.
- **Sentence openings.** She opens each later sentence 4.5 to 5 semitones above her median and steps down; our voice opened at +2.4 to +2.7. A sentence-opening lift (default 2.5 semitones, fading over the first 30% of each sentence after the first, done with the PSOLA shifter) brings ours to about +4.
- **Blip.** She has a 0.11 s tone at 3044 Hz, 11 dB under the speech, in the middle of each sentence gap. A generated equivalent is added (default level 0.28).
- **Overall pace** was left at the listener's setting; our sentences were already slightly slower than hers.
- **Pitch range** already matched (5.2 against 4.7 to 5.2 semitones).

### 21. Clarity: the compressor was the culprit

Whisper understood the dry voice perfectly but misheard the first two sentences with the full effect chain. Removing stages one at a time: without the room or without the resonance it was still misheard; without the compressor it was transcribed correctly, with every metallic stage untouched. Compression now defaults to 0. This is a single-run proxy for intelligibility, not a listening test.

### 22. Clarity pass: scoop moved below the consonants, echoes eased

The listener liked the effect but could not always make out the words in spoken notifications. Twelve notification-style sentences (143 words) were rendered and transcribed with Whisper `small`, in quiet and with pink noise 6 dB under the speech. Share of words misrecognised:

| Variant | Quiet | With noise |
|---|---|---|
| Previous defaults | 14.7% | 67.1% |
| No effect at all | 4.9% | 17.5% |
| Mid scoop off | 16.1% | 46.9% |
| Echo off | 11.2% | 58.7% |
| Resonance off | 12.6% | 57.3% |
| Room off | 9.8% | 71.3% |
| Doubling off | 11.9% | 62.2% |
| New defaults | 7.7% | 39.9% |

No single stage was the culprit. The mid scoop (-10 dB at 1.5 kHz) cost the most in noise because it also cut the 2 to 4 kHz range that carries consonants; the echo, resonance and room each cost a little in quiet. New defaults: scoop -8 dB at 1 kHz, air shelf from 3.5 kHz (was 5.5 kHz), echo 0.4 with feedback 0.1 (was 0.5 and 0.2), resonance 0.62 (was 0.72), room 0.25 (was 0.3). Doubling and grit are unchanged. Moving the scoop alone, with the echoes left as they were, did not help in quiet (20.3%), so both halves are needed.

This is a proxy, not a listening test: one run per variant, and the noise figures vary by about ten points between runs (removing grit scored worse in noise, which is not plausible as a real effect). The new sound has not yet been approved by ear.

## Risks / Trade-offs

- [The effect hypothesis is wrong] → The spike comes first and is tuned against real reference lines with a spectrogram check; the parameter set is expected to change.
- [No reference clips yet] → Build the spike and pipeline with provisional values; the default preset is not declared finished until tuned against references.
- [Stock voice delivery sounds wrong however it is processed] → Engine and voice A/B happens through the effect chain; rate and pause gap are tunable.
- [First visit downloads tens of MB] → Model loads on first "speak", not on page load; progress is shown; the browser caches it.
- [Model fetched from a third-party CDN that may change or disappear] → Pin exact model versions; self-hosting the model files is the fallback (see open questions).
- [Synthesis is slow on weak machines] → Worker keeps the page responsive; a busy state is shown; sentence chunking bounds each call.
- [Safari differences in Web Audio or WASM] → Test the three desktop browsers before release; feature-detect and show a clear message if unsupported.
- [Association with a commercial game's character] → Own visual identity, original canned lines, no game assets, visible non-affiliation note, stock voice only.

## Open Questions

- Where do reference lines come from, and who obtains them? Needed before the preset can be finalised.
- Piper or Kokoro, and which voice? Decided by the A/B spike.
- ~~Are model files self-hosted with the site or loaded from the engine's default CDN?~~ Decided by the owner (2026-11-19): loaded from Hugging Face at the revision pinned in the code (`REVISION` in `src/tts/engines/piper.ts` and `ukrainian.ts`); the ONNX runtime wasm for Piper still comes from cdn.jsdelivr.net. Reasons recorded the same day: Hugging Face allows cross-site downloads, so the page can fetch the files directly; copying two files of 77 to 79 MB into the repository would draw GitHub's large-file warnings and grow its history with every model change; and the licences are simplest to honour by linking to the publisher's copy (collection MIT; English voice data CC BY 4.0, fine-tuned from the lessac voice with its own Blizzard 2013 licence; Ukrainian voice data CC0). The credits are in the README.
- ~~Which static host?~~ Decided by the owner (2026-11-19): GitHub Pages. Every file is under its 100 MB per-file limit (largest 22 MB). Site name/title still open.
