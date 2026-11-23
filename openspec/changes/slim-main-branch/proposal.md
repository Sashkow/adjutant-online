## Why

The owner wants to use the speaker and the VS Code notifications on a work computer, and will ask a manager for approval. Today the `main` branch also holds a microphone listener, a server reachable from the public internet, a browser extension and a second voice engine with known package problems, so a reviewer who opens the repository sees far more than what is being requested. A `main` branch that holds only the requested parts makes the request easy to check and easy to approve.

## What Changes

- **BREAKING** `main` keeps only: the command-line speaker (`src/node/say.ts` and the voice code it needs), the VS Code notifications extension, the skills, voice mode, the Ukrainian stress data and its build script, and the specs of those parts.
- **Voice mode is on `main`** (the owner's decision of 2026-11-23, after the first slim version left it out): the listener `scripts/voice-listen.py`, its helper `scripts/voice.sh`, their tests, the spec `voice-mode` and the skills `adjutant-online` and `adjutant-offline`. The live effect for Claude Desktop is not. The README says when the microphone is open, what happens to the sound, and where the recognised text goes.
- The three speaking skills for Claude Code, `spell`, `respell` and `clear-speech`, which today exist only in the owner's home folder, are added to `main` under `skills/`. An install script copies them into `~/.claude/skills/`, writes the path of the checkout into them, and adds the `/respell` hook; a matching step removes them. With this, the owner can set up both the notifications and the spoken readings on another computer from the repository alone.
- A new branch, `full`, is made from `main` as it is now and holds everything. The parts leaving `main` go on living there: the web page and tuning page, the Firefox extension, the phone server, the Claude Desktop live effect, the presentations, and the voice-mode microphone listener.
- The GitHub Pages workflow leaves `main` and deploys the page from `full`.
- The `kokoro-js` package leaves `main` with the web page. It is the source of the three high-severity `npm audit` findings (through `sharp`). The packages the speaker needs are declared directly.
- A `LICENSE` file is added at the root of the repository.
- A script on `main` checks that the speaker works with the network cut off, once the voice model has been downloaded.
- The README on `main` is rewritten for the smaller scope: what the tool reads, where that text can go, how to install it, how to check it offline, how to remove it, and one line saying that other parts live on the `full` branch.
- The README on `main` lists the licence of each voice model and of the data behind it, including the research-only licence behind the English voice, and says that "Blizzard 2013" in that licence's name is the Blizzard Challenge, a research contest in speech synthesis, not Blizzard Entertainment.
- The history of `main` is not rewritten. The removed files stay in earlier commits and on the public `full` branch, and the request to the manager says so.

## Capabilities

### New Capabilities
- `main-branch-scope`: what the `main` branch contains and does not contain, that its speaker works without the network after the model download, and that its packages have no known high-severity problems.
- `skill-install`: the speaking skills are kept in the repository and are installed into, and removed from, Claude Code on any computer by one script.

### Modified Capabilities

None. The requirements of the existing capabilities do not change; the specs of the parts that leave `main` move to `full` with their code.

## Impact

- **Code leaving `main`:** `index.html`, `spike.html`, `src/page/` (except what the speaker imports), `src/spike/`, `src/tts/worker.ts`, `src/tts/client.ts`, `src/tts/engines/kokoro.ts`, `src/node/live.ts`, `extension/`, `src/extension/`, `phone/`, `presentations/`, `scripts/voice-listen.py`, `scripts/voice.sh`, `scripts/voice_listen_test.py`, `scripts/claude-voice-fx.sh`, `scripts/build-phone-project.sh`, the Vite configurations for the page, the extension and the live effect, and `.github/workflows/pages.yml`.
- **Specs leaving `main`:** `voice-page`, `voice-mode`, `phone-voice`, and any other spec whose code has left.
- **Dependencies:** `kokoro-js` removed; `onnxruntime-web` removed if only the browser uses it; the speaker's own run-time packages listed in `package.json`.
- **GitHub:** Pages must be allowed to deploy from `full`.
- **Skills:** the repository becomes the source of the five skills; the copies in `~/.claude/skills/` are what the install script writes. Eight skill files hold the fixed path `/home/shivers/thoughtbubble/adjutant-online` today and get a placeholder in its place. `npm run build:vscode` takes the clear-speech rules from `skills/` in the repository, not from the home folder.
- **Fanservice mode** of `spell` reads game lines from `reference/`, which is git-ignored and stays out of the repository. Where those files are missing, the skill already falls back to its stock phrases and says so; that rule is kept.
- **Voice mode:** `/adjutant-online` needs the listener, so on a machine that uses voice mode the checkout must be on `full`.
- **The request to the manager** grows from "notifications" to "notifications and reading replies aloud"; both use the same speaker.
- **The request to the manager** must name the first commit of the slim `main`, not `e719f57`.
