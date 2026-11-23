## Context

The repository grew from a web page into several tools that share one voice: a command-line speaker, VS Code notifications, a Firefox extension, a phone server behind a Tailscale Funnel, a live effect for Claude Desktop, and a voice mode that listens to the microphone. The owner wants only the speaker and the notifications on a work computer, where Claude Code, VS Code and GitHub are already approved.

A survey of the repository on 2026-11-23 (commit `e719f57`) found:

- The speaker and the notifications send nothing anywhere, except notification text to Claude through Claude Code (the rewording step, which can be switched off). The only download is the voice model from Hugging Face, at a pinned revision.
- With the network cut off (`unshare -rn`), `dist-cli/say.js` produced new English and Ukrainian phrases from the cached models.
- The parts a reviewer would object to are the microphone listener and the phone server.
- `npm audit` reports three high-severity findings, all in `sharp`, which arrives through `kokoro-js`. No file under `src/node/` imports the Kokoro engine.
- `src/node/speak.ts` imports `src/page/hash.ts` (decoding voice settings from a link), so one file of the page is needed by the speaker.
- There is no licence file. `vscode-extension/package.json` says MIT.
- The English voice, `en_US-libritts_r-medium`, was trained on LibriTTS-R (CC BY 4.0), and its model card says "Fine-tuned from English lessac medium". The `lessac` voice was trained from scratch on the Blizzard 2013 Lessac data. That data's licence (read on 2026-11-23) is a research licence from Voice Factory International and Lessac Technologies: use "exclusively for Research Purposes only", with "any commercial purpose" excluded, naming voice synthesis products and services. It does not say whether a model trained on the data, or the speech such a model produces, is covered. The `rhasspy/piper-voices` repository as a whole is labelled MIT.
- "Blizzard" in that name is the 2013 Blizzard Challenge, a research contest in speech synthesis. Blizzard Entertainment, whose game character this project imitates, is not a party to the licence. The two are easy to confuse in this project.
- The Claude Code skills (`spell`, `respell`, `clear-speech`, `adjutant-online`, `adjutant-offline`) live in `~/.claude/skills/`, outside the repository, as plain files (no links). Eight of their files hold the fixed path `/home/shivers/thoughtbubble/adjutant-online`. The only skill content in the repository is `vscode-extension/clear-speech.md`, a copy of the clear-speech skill's main file that `npm run build:vscode` refreshes from the home folder.
- `spell`'s fanservice mode and one reference file of `clear-speech` read game lines from `reference/`, which is git-ignored because it holds game recordings and transcripts.
- `~/.claude/settings.json` holds two hooks: one written by the VS Code extension's install command, and one that runs `respell/scripts/respell-hook.sh`, added by hand.
- The owner decided on 2026-11-23 that both the notifications and the skills must be reproducible on the work computer from the repository.

## Goals / Non-Goals

**Goals:**
- A reviewer who opens `main` sees only the speaker, the notifications and what they need.
- `main` installs with no high-severity `npm audit` findings.
- Anyone can check in one command that the speaker works without the network.
- Nothing is lost: every other part keeps working from the `full` branch.

**Non-Goals:**
- Hiding the other parts. They stay public on `full` and in the history of `main`.
- Rewriting history or force-pushing `main`.
- Auditing the code of the npm packages.
- Putting game lines or game recordings (`reference/`) into the repository.
- Changing how any part behaves, beyond what the skills need to run from any path.

## Decisions

### 1. Two branches in one repository: `main` (slim) and `full` (everything)

`full` is created from `main` before anything is removed. The removal is then one commit on `main`.

- **Why not a second repository:** it is the cleanest for a reviewer, but the voice code (`src/effect/`, `src/tts/`) would have to become a shared package or be copied, and every voice change would be made twice. The owner chose a branch.
- **Why not a folder inside `main`:** the listener and the phone server would stay in the tree the reviewer reads.

### 2. Changes flow one way: `main` into `full`

Work on the voice, the speaker and the notifications is done on `main` and merged into `full`. `full` is never merged into `main`; a merge that way would bring the removed files back. Work on the page, the extension, the phone server or voice mode is done on `full`.

The first merge of `main` into `full` after the removal would delete the files on `full` too. That merge is made once, at once, with `git merge -s ours`, which records the removal as already merged and changes nothing on `full`. Later merges then carry only new work.

- **Alternative considered:** cherry-picking each change from `main` to `full`. Rejected: easy to forget, and the branches drift.

### 3. What stays on `main`

| Stays | Why |
|---|---|
| `src/node/` without `live.ts` | the speaker, turn-taking and interruption |
| `src/effect/`, `src/audio/` | the effect chain the speaker renders with |
| `src/tts/` without `worker.ts`, `client.ts`, `engines/kokoro.ts` | Piper English and Ukrainian, text splitting, stress data |
| `src/node/lines/` | two prepared lines the speaker plays by name; no game audio |
| `vscode-extension/` | the notifications |
| `scripts/build-uk-stress.py`, `scripts/shape-line.py` | they rebuild data that stays |
| specs of the parts above | they describe what is on the branch |

`src/page/hash.ts` and its test move to `src/effect/link.ts`, next to the parameters it decodes, so no `src/page/` folder remains. Which specs stay is decided by reading each spec, not by its name.

### 4. The speaker's packages are declared directly

Before `kokoro-js` is removed, the packages that `dist-cli/say.js` loads at run time are listed (from the externals of the Vite build) and each is checked against `package.json`. Any that is installed today only because another package depends on it becomes a direct dependency. `onnxruntime-web` is removed only if nothing left on `main` imports it.

The check that this worked is: a fresh clone, `npm ci`, `npm run build:cli`, `npm test`, a spoken phrase, and `npm audit --omit=dev` with no high-severity finding.

### 5. An offline check that ships with the repository

`scripts/offline-check.sh` runs the speaker inside `unshare -rn` with a sentence that includes the time, so it cannot come from the phrase cache, writes a sound file, and prints whether it succeeded. It first shows that the network is really cut. Where `unshare` is missing (macOS, Windows) it says so and prints the manual check.

- **Why a script and not a README paragraph:** a manager or a security reviewer can run one line and see the result.

### 6. Pages deploys from `full`

The workflow file leaves `main` and, on `full`, triggers on pushes to `full`. The `github-pages` environment of the repository may allow deployments only from the default branch; the allowed branches are checked in the repository settings and `full` is added if needed.

### 7. Licence

MIT, to match `vscode-extension/package.json`, unless the owner chooses otherwise. The file goes on both branches. It covers the code of this repository only.

### 8. The voice licences are listed one by one, with the weak point named

The README on `main` has a table: each voice model, where it is downloaded from, the licence of the model, the data it was trained on and that data's licence, and the voice it was fine-tuned from, if any. Under it:

- a sentence that the English voice descends from a voice trained on research-only data, with the licence's own words about research and commercial purposes, and that the licence is silent on trained models and their output;
- a sentence that "Blizzard 2013" is the Blizzard Challenge, a research contest in speech synthesis, and is not related to Blizzard Entertainment.

- **Why name the weak point:** a reviewer who follows the model card finds it in two clicks. Found by the reviewer, it reads as something hidden; stated by the owner, it is a question for the company to decide.
- **Why no conclusion is drawn:** whether notifications on a work computer are a "commercial purpose", and whether a fine-tuned model carries the data's terms, are legal questions. The README states the facts and gives the links.
- **Alternative considered:** an English voice trained from scratch on openly licensed data. Not chosen now: which Piper voices qualify has not been checked, and the effect settings are fitted to the present speaker. It stays an open question.

### 9. The skills live in the repository and are installed by a script

`skills/spell/`, `skills/respell/` and `skills/clear-speech/` are added on `main`, copied from the home folder as they are today. `skills/adjutant-online/` and `skills/adjutant-offline/` are added on `full` only.

In the repository's copies, the fixed path of the checkout is replaced by the placeholder `{{ADJUTANT_ROOT}}`. `scripts/install-skills.sh`:

- copies each skill folder found in `skills/` to `~/.claude/skills/` (or `$CLAUDE_CONFIG_DIR/skills/`), writing the real path of the checkout in place of the placeholder;
- before replacing a skill that is already installed and differs, moves the old folder to `skills-replaced/`, beside the skills folder, with the date in its name, and says so. It is not kept inside the skills folder, where Claude Code would load it as a second skill of the same name;
- adds the `/respell` hook to `settings.json` if it is not there, leaving the rest of the file as it was, and does nothing if the file cannot be parsed;
- with `--remove`, deletes the skills it installs and takes its hook out;
- prints what it did.

Because it installs whatever is in `skills/`, the same script installs three skills from `main` and five from `full`.

- **Why copy and not link:** a link would make the installed skill change with every checkout, and on this machine a checkout of `main` would silently remove voice mode. A copy changes only when the script is run.
- **Why a placeholder and not a path found at run time:** the path appears inside instruction files that Claude reads, not only in scripts, so there is no run time at which to find it.
- **Alternative considered:** a Claude Code plugin. It is the packaged way to ship skills and hooks, but it is a second thing for a reviewer to understand and approve. It can be done later without changing what is in `skills/`.

`npm run build:vscode` copies `skills/clear-speech/SKILL.md` from the repository into the extension, so the rules have one source.

### 10. Fanservice mode degrades where the game lines are missing

`skills/spell/fanservice.md` and `skills/clear-speech/references/adjutant-style.md` name files in `reference/`. Those files stay out of the repository. The skill already says what to do without them: "If the files are missing, use only the stock phrases already named in the clear-speech skill and say so in your one-line message." That rule is the owner's and is kept as it is; no skill text changes. On this machine nothing changes, because the files are there.

The two files were read for quoted game lines (task 3.2). They hold short phrases as markers of her manner, a few words each (about eight in `fanservice.md`, about thirty fragments in `adjutant-style.md`), and no passages. They are added as they are. The owner should look at them once before they are pushed, since the README says only that "a few of her short lines are quoted in the design notes".

### 11. Voice mode is on `main`; the Claude Desktop effect is not

Decided by the owner on 2026-11-23, after the first slim version (commit `3396a1a`) had left voice mode on `full` and the README's wording made the owner think it was on `main`. This replaces what decisions 3 and 9 and the first proposal say about the listener and the two voice-mode skills.

- Back on `main`: `scripts/voice-listen.py`, `scripts/voice.sh`, `scripts/voice_listen_test.py`, `skills/adjutant-online/`, `skills/adjutant-offline/`, the spec `voice-mode` and its two archived changes.
- Still only on `full`: `scripts/claude-voice-fx.sh` and `src/node/live.ts`, which put Claude Desktop's own voice through the effect. They share the words "voice mode" with the listener and nothing else.
- `scripts/voice.sh` looked for Python at a path of the owner's machine. It now takes `VOICE_PYTHON`, else `.venv` in the checkout, else that path, and says how to make one when none is found.
- `scripts/offline-check.sh` has a third step: where a Python with `faster-whisper` is present, the recognition model is loaded with the network cut off.
- Licences, read from the installed packages and the model's page: `faster-whisper` MIT, `ctranslate2` MIT, the model `Systran/faster-whisper-small` MIT. The packages that `pip` installs beneath them were not all checked.

- **What it costs the request to the manager:** `main` now holds a program that records the microphone, so "nothing on `main` listens" can no longer be said. The README says instead when the microphone is open (only between `/adjutant-online` and switching off), that sound is recognised on the machine and neither stored nor sent, and that the recognised text goes to the Claude Code session and two log files.
- **Alternative considered:** a third branch between `main` and `full`. Rejected: the owner wants one branch to reproduce the whole working set on another computer.

## Findings (tasks 2.1 to 2.3, on commit `e719f57`)

**Packages the built speaker loads** (`dist-cli/say.js`): `phonemizer` and `node-web-audio-api`, both declared in `package.json`, and `onnxruntime-node`, which is not declared: it is installed only through `kokoro-js` → `@huggingface/transformers` (version 1.21.0). It must become a direct dependency when `kokoro-js` is removed. `onnxruntime-web` is not loaded by the speaker.

**Source files reached from `src/node/say.ts`:** `src/audio/wav.ts`; in `src/effect/`: `curves`, `delivery`, `graph`, `intro`, `params`, `preset`, `psola`, `render`; in `src/node/`: `say`, `speak`, `interrupt`, `turn`; `src/page/hash.ts`; in `src/tts/`: `text`, `types`, `engines/piper`, `engines/ukrainian`, `uk/match`, `uk/numbers`, `uk/runs`, `uk/stress`. Two data locations are read by path at run time, relative to `dist-cli/`: `src/tts/uk/uk-stress.bin.gz` and `src/node/lines/*.wav`. The VS Code extension uses its own four files and `dist-cli/say.js`.

So these also leave `main`, beyond the list in decision 3: `src/tts/engines/libritts.ts` (the browser's Piper loader), `src/effect/player.ts` (the browser's live player), `src/effect/stream-shift.ts` and `src/effect/pause-blip.ts` (used only by `live.ts`), `src/extension/`, and `src/env.d.ts` if nothing left needs it.

**The `/respell` hook script** named the spell skill by `$HOME/.claude/…`; in the repository it finds it beside itself, so it works under any settings folder. This is the only difference between the repository's skills (with the path written in) and the ones installed on this machine on 2026-11-23.

**The Ukrainian voice** (task 5.4): its model card says 3 speakers, "Trained from scratch", data from `OHF-Voice/voice-datasets`, licence CC0. That repository states CC0 for its datasets, but its table of languages has no Ukrainian row, so the page does not show where the Ukrainian recordings come from. No research-only licence is in this voice's chain.

**Specs:**

| Spec | Branch | Note |
|---|---|---|
| `notification-source`, `reading-interruption`, `task-narration`, `ukrainian-speech`, `western-ukrainian-stress` | `main` | their code stays |
| `voice-effect`, `speech-synthesis` | `main` | they describe the shared voice; a few of their requirements (in-browser synthesis, the worker, live parameter changes) are met only by code on `full`. They are kept whole and unchanged, with one line in the README of `main` saying so |
| `voice-page`, `voice-mode`, `phone-voice` | `full` only | their code leaves |

## Findings while slimming (tasks 4.1 to 6.5, 2026-11-23)

- The slim tree was made in a second working copy (`../adjutant-online-slim`, branch `slim-main`), because removing `scripts/voice.sh` from the main checkout would have ended the voice mode that was running from it.
- `onnxruntime-node` is declared at 1.21.0, the version the speaker was running with. With `kokoro-js` and `onnxruntime-web` gone, `npm audit` reports no finding at all, and the install has 138 packages, two with an install script (`onnxruntime-node`, and `fsevents` on macOS only). A new `.npmrc` tells `onnxruntime-node` not to download graphics-card libraries.
- `vscode-extension/clear-speech.md` and `vscode-extension/default-cli.json` were tracked files holding the owner's home path. They are written by `npm run build:vscode`, so on `main` they are no longer tracked and are ignored.
- Three archived changes described parts that left and were removed from `main` with them: `evening-greeting`, `phone-voice-project`, `adjutant-voice-mode`. The archive of `adjutant-voice-page` stays, because it holds the design of the voice effect.
- `src/tts/types.ts` keeps only the `Engine` interface; `vite.config.ts` keeps only the test settings; `package.json` keeps the scripts `build:cli`, `build:vscode` and `test`.
- The `phonemizer` package (Apache 2.0) bundles eSpeak NG, which is licensed GPL version 3 or later. The README's licences section says so. This matters if the company's list of accepted licences (the owner named Apache 2.0, MIT, BSD, MS-PL, OFL, ISC, BSL and MPL on 2026-11-23) applies to bundled parts.
- Checked in a clean copy of the tree: `npm ci`, `npm run build:cli`, 120 tests pass, `npm audit --omit=dev` clean, `scripts/offline-check.sh` passes in English and Ukrainian, `scripts/install-skills.sh` installs three skills with the copy's own path and removes them again. `npm run build:vscode` packs the extension. Not done: installing that package into VS Code (task 6.4), which would replace the extension the owner is using.
- Six stand-in English voices were auditioned through the effect on 2026-11-23 and the owner found none close to the present voice, so the English voice stays. Piper's publishers are retraining lessac-derived voices under the same names; the owner asked for a check on or after 2026-12-23.

## Risks / Trade-offs

- **The install script overwrites a skill the owner edited in the home folder** → It keeps the old folder with a date in its name and reports it. The rule from now on: skills are edited in the repository and installed, not edited in place.
- **The repository's skill copies and the home folder drift before the change is applied** → The skills are copied into the repository as the first step of the work, and compared again just before the install script is first run.
- **A reviewer finds quoted game lines in the skill files** → `fanservice.md` and the style notes are read before they are added; lines quoted in them are counted and, if more than a few, moved to `reference/` with the rest.

- **The other parts stay visible** on `full` and in history → The request to the manager says this plainly. The claim made is "I install only `main`", not "the repository contains nothing else".
- **A merge of `full` into `main` brings everything back** → The rule is written in the README of `main`; a branch protection rule on `main` may be added later.
- **Voice mode stops on this machine if the checkout is on `main`** → The installed skills call `scripts/voice.sh` and `dist-cli/say.js` by the path of this checkout. This machine keeps its checkout on `full`; the work computer clones `main`.
- **A hidden dependency breaks the speaker after `kokoro-js` is removed** → Decision 4: fresh-clone check before the removal is pushed.
- **The page goes offline if Pages cannot deploy from `full`** → The environment setting is checked and a deployment from `full` is seen to succeed before the workflow is removed from `main`.
- **The data behind the English voice is licensed for research only** → Decision 8: the README and the request to the manager state it, and the company decides. If the answer is no, the open question about another English voice is taken up. It does not block the branch work.

## Migration Plan

1. Create `full` from `main` and push it.
2. On `full`: retarget the Pages workflow, allow the branch in the environment, see one deployment succeed.
3. On `full`: add the five skills under `skills/` with the placeholder, and the install script; run it on this machine and check that every skill still works.
4. On a working branch from `main`: remove the parts, move `hash.ts`, fix the dependencies, add the three speaking skills and the install script, the licence, the offline check and the new README.
5. Fresh-clone check (decision 4), then merge to `main`.
6. Merge `main` into `full` with `-s ours`.
7. Put the new commit of `main` into the request to the manager.

**Rollback:** revert the removal commit on `main`. Nothing was deleted from `full`.

## Open Questions

- Does the company accept the English voice, given the research-only licence of the data its base voice was trained on? This is for the manager or the company's lawyers to answer.
- If not: which Piper English voices were trained from scratch on openly licensed data, and how much re-tuning of the effect would one need?
- Is `full` the right name for the other branch?
