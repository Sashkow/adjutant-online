# Adjutant Online

A calm, metallic ship's-computer voice for your own machine. It speaks one sentence when a long task, a terminal command or a Claude Code turn finishes in VS Code, and it reads Claude Code's replies aloud on request. The speech is generated on the computer itself, in English and Ukrainian.

Unofficial fan tool. Not affiliated with Blizzard Entertainment. No game audio is used or shipped.

## What is on this branch

`main` holds three things and what they need:

- **The speaker**, a command-line program: `node dist-cli/say.js "Task complete."`
- **VS Code notifications**, an extension that calls the speaker: `vscode-extension/`
- **Three Claude Code skills** that read replies aloud: `skills/spell`, `skills/respell`, `skills/clear-speech`

Other parts of the project live on the branch [`full`](../../tree/full) and are not installed from here: a web page, a Firefox extension, a voice mode that listens to the microphone, a server that plays the voice in the Claude phone app, and a live effect for Claude Desktop. Nothing on `main` records the microphone or accepts connections from the network.

## What it reads, and where that text goes

**It reads**

- the name, exit code and duration of a finished VS Code task;
- the command line, exit code and duration of a finished terminal command (only the program name and up to two plain words are spoken);
- the last reply of a finished Claude Code turn, the session's title and its timing, from the session's transcript file;
- with the skills: the reply you ask it to read.

It does not read source files, the clipboard or the open editor.

**That text goes to**

- the speaker on this machine, and from there to the loudspeaker or headphones;
- the cache of spoken phrases, `~/.cache/adjutant-voice/spoken/`, as sound files (the last 200 phrases);
- **Claude, through Claude Code**, when rewording is on. Before a notification is spoken it is reworded so that it is easier to make out through the voice effect. The call uses no tools, no connectors and no saved session. To switch it off, set `adjutantVoice.rephrase` to `false` in the VS Code settings; nothing then leaves the machine.

There is no telemetry and no analytics.

**The only downloads** are the voice models, fetched once from Hugging Face at a fixed revision and kept in `~/.cache/adjutant-voice/models/`: English (79 MB) the first time anything is spoken, Ukrainian (77 MB) the first time Ukrainian text is spoken. After that the speaker needs no network; see "Check that it works offline".

## Install

Needs Node.js 20 or newer and a sound player (`paplay`, `pw-play`, `aplay`, `afplay` or `ffplay`).

```bash
git clone https://github.com/Sashkow/adjutant-online.git
cd adjutant-online
npm ci
npm run build:cli
node dist-cli/say.js "Voice check."        # downloads the English model on the first run
npm test                                   # optional: the unit tests
```

`npm ci` installs the packages named in `package-lock.json`, all from the npm registry. Two of them run a script at install time: `onnxruntime-node` (the model runtime; `.npmrc` tells it not to download graphics-card libraries) and `fsevents` (macOS only).

The speaker's options: `--out file.wav` writes the sound to a file, `--no-play` does not play it, `--link <address>` takes voice settings from a link made on the project's page.

### VS Code notifications

```bash
npm run build:vscode
code --install-extension adjutant-voice-notify.vsix
```

What it announces and its settings are described in [vscode-extension/README.md](vscode-extension/README.md). The extension runs the speaker from this folder, so the folder has to stay where it was built. For Claude Code turns, run the command "Adjutant Voice: Install Claude Code Hook" in VS Code; "Remove Claude Code Hook" takes it out again.

### Claude Code skills

```bash
scripts/install-skills.sh
```

It copies the skills in `skills/` into `~/.claude/skills/`, writes the path of this folder into them, and adds one hook to `~/.claude/settings.json` so that `/respell` repeats a reading without a model call (the hook needs `jq`). If a skill of the same name is already installed and differs, the old one is moved to `~/.claude/skills-replaced/` first. The script prints what it did.

- `/spell` reads the last reply aloud; `/spell <task>` does the task and reports its milestones aloud.
- `/respell` repeats the last reading, word for word.
- `clear-speech` rewords a sentence so that it survives the voice effect.

Edit skills in `skills/` and install them again, not in `~/.claude/skills/`.

## Check that it works offline

```bash
scripts/offline-check.sh
```

On Linux it starts the speaker in a place with no network at all (`unshare -rn`), first shows that the model site cannot be reached from there, and then has a sentence that was never spoken before written to a sound file. Where `unshare` is not available it prints the check to do by hand.

## Remove

```bash
code --uninstall-extension local.adjutant-voice-notify
scripts/install-skills.sh --remove
rm -rf ~/.cache/adjutant-voice
```

Run "Adjutant Voice: Remove Claude Code Hook" before uninstalling the extension, if you installed the hook. Then delete this folder.

## Ukrainian

Nothing needs to be switched on: a sentence with Cyrillic letters goes to the Ukrainian voice, and words in Latin letters inside it ("git", "say.js") are spoken by the English voice.

- The Ukrainian speaker is shaped towards the English one (pitch, voice size, tone) so both sound like one Adjutant: `src/tts/uk/match.ts`.
- The model has to be told where the stress falls. `src/tts/uk/uk-stress.bin.gz` holds the stress of 2.8 million word forms, built by `scripts/build-uk-stress.py` from the dictionary of the [ukrainian-word-stress](https://github.com/lang-uk/ukrainian-word-stress) project. A stress mark already in the text ("за́мок") is kept.
- Numbers are spelled out in Ukrainian (`src/tts/uk/numbers.ts`), in the basic form: "3 помилки" is right, "у 2 файлах" comes out as "у два файлах".

## How speakers take turns

Speakers take turns through a lock file, so two voices never overlap. A notification (`say.js --priority`) takes the speaker from a reading: the reading stops and, when the notification has been said, comes back by a fixed rule over where it was cut (`src/node/interrupt.ts`): the paragraph again, or a return phrase and the cut sentence, or a continuing phrase and the next sentence.

## Layout

- `src/node/` the speaker: rendering, the phrase cache, turn-taking, interruption
- `src/effect/` the voice effect: parameters, default preset, effect chain, offline renderer
- `src/tts/` the Piper voices, sentence splitting, Ukrainian stress and numbers
- `vscode-extension/` the notifications
- `skills/` the Claude Code skills; `scripts/install-skills.sh` installs them
- `openspec/` the specifications and the history of changes

Two specifications, `voice-effect` and `speech-synthesis`, describe the voice as a whole. A few of their requirements (synthesis in the browser, changing the effect while it plays) are met by code on the `full` branch only.

## Branches

Work on the speaker, the notifications and the skills is done on `main` and merged into `full`. `full` is never merged into `main`: that would bring back the parts that were taken out.

## Credits and licences

The code and documents of this repository are under the MIT licence: [LICENSE](LICENSE). The voice models are not part of the repository and are not covered by that licence. This section says what each licence is and links to it; it draws no conclusion about what is allowed where.

### Voices

Both voices come from the [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) collection on Hugging Face, which is labelled MIT as a whole. They are fetched at the revision pinned in `src/tts/engines/piper.ts`.

| | English | Ukrainian |
|---|---|---|
| Model | `en_US-libritts_r-medium`, speaker 100 | `uk_UA-ukrainian_tts-medium`, speaker "tetiana" |
| Trained on | [LibriTTS-R](http://www.openslr.org/141/) | data named as [OHF-Voice/voice-datasets](https://github.com/OHF-Voice/voice-datasets) |
| Licence of that data | CC BY 4.0 | CC0 |
| Training, from the model card | "Fine-tuned from English lessac medium" | "Trained from scratch" |
| Base voice | `en_US-lessac-medium`, trained on the Blizzard 2013 Lessac data | none |

**The English voice descends from a voice trained on research-only data.** The data behind `lessac` is under the [Blizzard 2013 Lessac licence](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html), a research licence from Voice Factory International and Lessac Technologies. It grants use "exclusively for Research Purposes only" and excludes "any commercial purpose", naming voice synthesis products and services. The licence speaks of the recordings and their data; it does not say whether a model trained on them, a voice fine-tuned from such a model, or the speech such a voice produces, is covered. The publishers of Piper [write](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md) that voices descending from `lessac` are being trained again from other base voices, under the same names.

**"Blizzard 2013" is not Blizzard Entertainment.** The name comes from the Blizzard Challenge, a yearly research contest in speech synthesis, for which those recordings were released in 2013. It has no connection with the game company whose character this project imitates.

The Ukrainian model card names the dataset repository above, which states CC0 for its datasets; that repository's list of languages has no Ukrainian entry.

### Packages the speaker loads

| Package | Licence |
|---|---|
| [onnxruntime-node](https://www.npmjs.com/package/onnxruntime-node) (runs the voice model) | MIT |
| [node-web-audio-api](https://www.npmjs.com/package/node-web-audio-api) (the effect chain) | BSD 3-Clause |
| [phonemizer](https://www.npmjs.com/package/phonemizer) (turns English text into sounds) | Apache 2.0 |

The `phonemizer` package includes [eSpeak NG](https://github.com/espeak-ng/espeak-ng), which is licensed under the GNU General Public License, version 3 or later.

### Other

- **Speech engine design:** [Piper](https://github.com/OHF-Voice/piper1-gpl), by the Open Home Foundation (earlier `rhasspy/piper`). This project runs Piper's voice models with its own code; it does not include Piper's program.
- **Ukrainian word stress:** the dictionary of [ukrainian-word-stress](https://github.com/lang-uk/ukrainian-word-stress) by lang-uk (MIT licence), repacked as `src/tts/uk/uk-stress.bin.gz`.
- **The two prepared lines** in `src/node/lines/` were spoken by this project's voice and re-pitched with a vocoder (`scripts/shape-line.py`). No game audio is in them.

The Adjutant is a character of StarCraft, by Blizzard Entertainment. This project imitates the style of that voice with a synthetic one. It uses and ships no game audio; a few of her short phrases are quoted in the skills and the design notes, as markers of her manner.

Similar projects by others, and how they differ, are noted in [docs/related-projects.md](docs/related-projects.md).
