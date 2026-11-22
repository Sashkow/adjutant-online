# Adjutant Online

Type text, hear it spoken by a calm, metallic ship's-computer voice. Everything runs in the browser:
a stock text-to-speech voice (WASM, in a worker) played through a Web Audio effect chain.

Unofficial fan tool. Not affiliated with Blizzard Entertainment. No game audio is used or shipped.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run build     # static site in dist/
npm run preview   # serve dist/
```

## Tuning the voice

The defaults in `src/effect/params.ts` were fitted to measurements of a reference recording
(pitch, pitch range, echo delay, spectrum balance, level); see `openspec/.../design.md`, section 12.
They have not been checked by ear. To tune them:

1. `npm run dev`, then open `/spike.html` (dev server only; it is not part of the build).
2. Load a speech file, or synthesise a clip with the box on the page, and loop it.
3. Move sliders; use the bypass boxes and the Dry toggle to compare.
4. Press **Export parameters** and paste the JSON into `OVERRIDES` in `src/effect/preset.ts`.

Reference recordings used for comparison belong in `reference/`, which is git-ignored. Never commit them.

## Comparing engines and voices

Both pages accept query overrides, for A/B listening:

- Default: Piper LibriTTS-R, speaker 100. `?voice=<0-903>` picks another of its 904 speakers, for example `?voice=731`.
- `?engine=kokoro&voice=<id>`, for example `?engine=kokoro&voice=af_bella`, uses Kokoro instead.

The tone defaults are fitted to the default speaker; other voices may want different Tone settings.

## Ukrainian

The voice speaks Ukrainian as well as English, on the page, in the Firefox extension, from the command line and in notifications. Nothing needs to be switched on: a sentence with Cyrillic letters goes to Piper's Ukrainian voice (speaker "tetiana"), and words in Latin letters inside it ("git", "say.js") are spoken by the English voice. The Ukrainian model (77 MB) is downloaded the first time Ukrainian text is spoken.

- The Ukrainian speaker is shaped towards the English one (pitch, voice size, tone) so both sound like one Adjutant: `src/tts/uk/match.ts`.
- The model reads letters and has to be told where the stress falls. `src/tts/uk/uk-stress.bin.gz` holds the stress of 2.8 million word forms; it is built by `scripts/build-uk-stress.py` from the dictionary of the [ukrainian-word-stress](https://github.com/lang-uk/ukrainian-word-stress) project (lang-uk, MIT licence). A word whose stress depends on its meaning ("замок") gets the dictionary's first variant; a word the dictionary does not know is left to the model. A stress mark already in the text ("за́мок") is kept.
- Numbers are spelled out in Ukrainian (`src/tts/uk/numbers.ts`), in the basic form: "3 помилки" is right, "у 2 файлах" comes out as "у два файлах".

## Layout

- `src/effect/` parameter schema, default preset, effect graph, live player, offline renderer
- `src/tts/` worker, engine adapters, sentence splitting and joining
- `src/page/` the page: controls, URL state, canned lines
- `src/spike/` the tuning page
- `openspec/` proposal, design, specs and task list

## Firefox extension: read the selection aloud

`npm run build:extension` writes the extension to `dist-extension/` and packs it as `adjutant-read-aloud.xpi`.

To try it: open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on…" and pick the `.xpi`. Firefox removes temporary add-ons when it restarts; a permanent install needs the package signed by Mozilla (`web-ext sign`, unlisted) or a Firefox build that allows unsigned add-ons (Developer Edition, Nightly, ESR).

Select text, then right-click and choose "Read aloud (Adjutant voice)", click the toolbar button, or press Alt+Shift+A. The button and shortcut also stop the reading. The voice model (about 80 MB) is downloaded on first use and kept; everything else is inside the package. To change the voice, paste a link from the page into the extension's preferences.

Sources: `extension/` (manifest, background page, preferences) and `src/extension/` (text chunking). The voice and effect code is shared with the page.

## Command line and VS Code notifications

`npm run build:cli` writes `dist-cli/say.js`, the same voice outside a browser: `node dist-cli/say.js "Task complete."` (`--out file.wav`, `--no-play`, `--link <page address>` are optional). It keeps the voice model and recently spoken phrases under `~/.cache/adjutant-voice/`.

`npm run build:vscode` packs `vscode-extension/` as `adjutant-voice-notify.vsix`; install it with `code --install-extension adjutant-voice-notify.vsix`. It announces finished tasks, long terminal commands and Claude Code turns; see `vscode-extension/README.md`. The extension runs the speaker from this project folder, so the project has to stay where it was built.

Speakers take turns through a lock file, so two voices never overlap. A notification (`say.js --priority`) takes the speaker from a reading: the reading's player is stopped and, when the notification has been said, the reading returns by a fixed rule over where it was cut (`src/node/interrupt.ts`): the paragraph again, or a return phrase ("Where was I? Oh yes: …", named by `--topic`) and the cut sentence, or a continuing phrase and the next sentence. The moments each sentence begins are kept beside every rendered phrase in the speech cache.

## Claude Desktop through the effect (live)

`scripts/claude-voice-fx.sh` plays Claude Desktop's voice mode through the Adjutant effect as it speaks: the metal,
the doubling, the echo and the room, over Claude's own voice (its speaker and pitch stay Claude's; only the speaker's
own speech gets the delivery). Build once with `npm run build:live` (writes `dist-cli/live.js`), then:

    scripts/claude-voice-fx.sh          # on: Claude Desktop's sound goes through the effect (start it before or after the app)
    scripts/claude-voice-fx.sh stop     # off: back to the speakers as it was
    scripts/claude-voice-fx.sh status

It makes a PulseAudio null sink, `adjutant_fx`, moves Claude Desktop's streams there (found by their process under
`/usr/lib/claude-desktop`, new ones as they open), and runs `parec` from its monitor into `src/node/live.ts`, the same
effect chain as `buildChain`, out to the default output (about 0.1 s later). Other programs are not touched.
`ADJUTANT_FX_LINK='#echoMix=0'` (or a page address) changes the settings. Use headphones: Claude's echo cancelling
expects its own plain voice, so from the speakers it may hear itself and stop talking.

Similar projects by others, and how they differ, are noted in `docs/related-projects.md`.

## Voice mode (talk with the Adjutant in Claude Code)

`/adjutant-online` in a Claude Code session starts a lasting spoken conversation: the microphone is listened to without end, every phrase you say is a request, and the answer is spoken in the Adjutant voice (one to three sentences; code and detail stay on screen). `/adjutant-offline`, a typed "stop", or saying "Adjutant offline" ends it. English and Ukrainian are recognised, phrase by phrase.

- **What is not heard.** On speakers, a phrase recorded while the computer plays sound is dropped: the Adjutant's own speech, notifications, music, video. After ten seconds of other sound a note on screen says listening is paused. On headphones nothing is dropped, so you can speak over her.
- **Risky requests.** A spoken request that changes the codebase or cannot be undone is confirmed aloud: "Nuclear missile ready." and what was understood; you repeat part of the action (a bare "yes" is not enough); "Nuclear launch, detected". An action that cannot be undone then waits four seconds, and "stop" or "wait" cancels it, even said over her voice.
- **The two nuclear lines** are spoken with the melody of the Adjutant's delivery in StarCraft. The voice cannot be told how to intone, so each line was spoken once, re-pitched with a vocoder and kept in `src/node/lines/`; `scripts/shape-line.py` makes them again (needs `pip install pyworld soundfile`). No game audio is in them.
- **Privacy.** Sound is recognised on this machine by `faster-whisper` (model `small`) and is not stored or sent anywhere; only the recognised text reaches the session.
- **Parts.** `scripts/voice-listen.py` is the listener (tests: `python3 -m unittest scripts/voice_listen_test.py`), `scripts/voice.sh` starts, stops and follows it. The two skills are in `~/.claude/skills/adjutant-online/` and `adjutant-offline/`. Needs PulseAudio (`parec`, `pactl`) and a Python with `faster-whisper` at `/opt/ro/whisper/venv` (or `VOICE_PYTHON`). Why a phrase was kept or dropped is in `~/.cache/adjutant-voice/voice/debug.log`.

## Phone voice (Claude app on Android)

A small MCP App server on the laptop runs the same speaker and returns an audio player into a chat in a claude.ai Project, "Adjutant voice", through a custom connector and a Tailscale Funnel. Type `say <text>` (spoken exactly) or `spell <text>` (reworded for the ear first) and tap Play. The laptop must be on. Setup, the Funnel's public address and how to stop it: [phone/README.md](phone/README.md).

## Credits and licences

The voice models are not part of this repository. They are downloaded from their publishers on first use and kept in the browser's storage or, for the command line, in `~/.cache/adjutant-voice/models/`.

- **Speech engine:** [Piper](https://github.com/OHF-Voice/piper1-gpl), by the Open Home Foundation (earlier `rhasspy/piper`).
- **Voices:** from the [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) collection (MIT licence), fetched from Hugging Face at the revision pinned in `src/tts/engines/piper.ts`.
  - English: `en_US-libritts_r-medium`, speaker 100. Trained on the [LibriTTS-R](http://www.openslr.org/141/) dataset (CC BY 4.0), fine-tuned from the Piper voice `en_US-lessac-medium`, whose data is under the [Blizzard 2013 Lessac licence](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html).
  - Ukrainian: `uk_UA-ukrainian_tts-medium`, speaker "tetiana". Trained on data from [OHF-Voice/voice-datasets](https://github.com/OHF-Voice/voice-datasets) (CC0).
- **Ukrainian word stress:** the dictionary of [ukrainian-word-stress](https://github.com/lang-uk/ukrainian-word-stress) by lang-uk (MIT licence), repacked as `src/tts/uk/uk-stress.bin.gz`.
- **English pronunciation:** the `phonemizer` package (eSpeak NG rules). The optional comparison engine is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0), through `kokoro-js`.

The Adjutant is a character of StarCraft, by Blizzard Entertainment. This project imitates the style of that voice with a synthetic one. It uses and ships no game audio; a few of her short lines are quoted in the design notes.
