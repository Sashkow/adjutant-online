## ADDED Requirements

### Requirement: The main branch holds only the speaker and the notifications
The `main` branch SHALL contain the command-line speaker, the VS Code notifications extension, the speaking skills for Claude Code, the voice code and data they need, and the specs of those parts. It SHALL NOT contain code that records the microphone, code that serves requests from the network, a browser extension, or the web page.

#### Scenario: A reviewer looks for the microphone listener
- **WHEN** a reviewer searches the files of `main` for the microphone listener (`voice-listen.py`, `parec`)
- **THEN** nothing is found

#### Scenario: A reviewer looks for a network server
- **WHEN** a reviewer searches the files of `main` for code that listens on a port
- **THEN** nothing is found

#### Scenario: The speaker is built from a fresh clone
- **WHEN** `main` is cloned and `npm ci`, `npm run build:cli` and `npm test` are run
- **THEN** all three succeed and `node dist-cli/say.js "Voice check."` speaks the sentence

#### Scenario: The notifications are built from a fresh clone
- **WHEN** `npm run build:vscode` is run on a fresh clone of `main`
- **THEN** the extension package is written and, once installed, the voice test command speaks

### Requirement: Every other part lives on the full branch
The `full` branch SHALL contain everything `main` contains and also the web page, the Firefox extension, the phone server, the Claude Desktop live effect, the presentations and the voice-mode listener, each working as before. The web page SHALL be deployed from `full`.

#### Scenario: Voice mode from the full branch
- **WHEN** the checkout is on `full` and `scripts/voice.sh start` is run
- **THEN** the listener starts as it did before the change

#### Scenario: The page is deployed
- **WHEN** a commit is pushed to `full`
- **THEN** the GitHub Pages workflow builds and deploys the page

#### Scenario: New speaker work reaches the full branch
- **WHEN** a change to the speaker is made on `main` and `main` is merged into `full`
- **THEN** `full` has the change and has lost none of its own files

### Requirement: The speaker works without the network after the model download
Once the voice models are in the cache, the speaker on `main` SHALL produce speech with no network access. `main` SHALL include a script that checks this and reports the result.

#### Scenario: The offline check passes
- **WHEN** the English model is cached and `scripts/offline-check.sh` is run on Linux
- **THEN** it shows that the network is unreachable, a sound file of a sentence not spoken before is written, and the script reports success

#### Scenario: The model is not cached
- **WHEN** `scripts/offline-check.sh` is run before any model was downloaded
- **THEN** it reports that the model must be downloaded first and how

#### Scenario: The system has no way to cut the network for one command
- **WHEN** `scripts/offline-check.sh` is run where `unshare` is not available
- **THEN** it says so and prints the manual check

### Requirement: The main branch installs without known high-severity package problems
`npm audit --omit=dev` on `main` SHALL report no finding of high or critical severity at the time of the change. The second voice engine (`kokoro-js`) SHALL NOT be a dependency of `main`.

#### Scenario: Audit on a fresh clone
- **WHEN** `npm ci` and `npm audit --omit=dev` are run on a fresh clone of `main`
- **THEN** no high or critical finding is reported

### Requirement: The main branch says what it is and what it reads
The README on `main` SHALL state: what the tool reads (task names, terminal command lines, the last Claude Code reply), where that text can go (the speaker, the phrase cache, and Claude through Claude Code when rewording is on), how to switch rewording off, how to run the offline check, how to remove the tool, and that other parts of the project live on the `full` branch. The repository SHALL have a `LICENSE` file at its root.

#### Scenario: A reviewer reads the README
- **WHEN** a reviewer opens the README on `main`
- **THEN** each of the items above is found without opening another file

#### Scenario: A reviewer looks for the licence
- **WHEN** a reviewer opens the root of the repository on `main`
- **THEN** a `LICENSE` file is there

### Requirement: The main branch lists the licence of every voice
The README on `main` SHALL list, for each voice model the speaker can download: where it comes from, the licence of the model, the data it was trained on with that data's licence, and the voice it was fine-tuned from, if any. Where the data of a voice or of its base voice is licensed for research only, the README SHALL say so in plain words and link to the licence. The README SHALL state that "Blizzard 2013" in the name of the Lessac data licence refers to the Blizzard Challenge and is not related to Blizzard Entertainment.

#### Scenario: A reviewer checks the English voice
- **WHEN** a reviewer reads the licences section of the README on `main`
- **THEN** the English voice is listed with its LibriTTS-R data (CC BY 4.0), its base voice `lessac`, and the research-only licence of the Blizzard 2013 Lessac data, with a link to that licence

#### Scenario: A reviewer checks the Ukrainian voice
- **WHEN** a reviewer reads the licences section of the README on `main`
- **THEN** the Ukrainian voice is listed with its data, that data's licence, and whether it was fine-tuned from another voice

#### Scenario: A reviewer sees the word Blizzard
- **WHEN** a reviewer reads "Blizzard 2013" in the licences section
- **THEN** the same section says that it is the Blizzard Challenge, a research contest in speech synthesis, and not Blizzard Entertainment

#### Scenario: The README draws no legal conclusion
- **WHEN** a reviewer reads the licences section
- **THEN** it states what each licence says and links to it, and does not claim that use at a company is or is not allowed
