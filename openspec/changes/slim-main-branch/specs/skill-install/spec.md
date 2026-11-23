## ADDED Requirements

### Requirement: The skills are kept in the repository
The `main` branch SHALL contain the skills `spell`, `respell`, `clear-speech`, `adjutant-online` and `adjutant-offline` under `skills/`, complete enough that a computer with only a clone of `main` can install and use them. No file under `skills/` SHALL contain a path into a particular person's home folder.

#### Scenario: A reviewer looks for a fixed path
- **WHEN** the files under `skills/` on `main` are searched for `/home/`
- **THEN** nothing is found

#### Scenario: A reviewer lists the skills on main
- **WHEN** the folder `skills/` on `main` is listed
- **THEN** it holds `spell`, `respell`, `clear-speech`, `adjutant-online` and `adjutant-offline`

#### Scenario: The owner leaves voice mode out
- **WHEN** `skills/adjutant-online` and `skills/adjutant-offline` are deleted from a copy before `scripts/install-skills.sh` is run
- **THEN** only the three speaking skills are installed

#### Scenario: The extension takes its rules from the repository
- **WHEN** `npm run build:vscode` is run on a computer that has no `~/.claude/skills/clear-speech/`
- **THEN** the packaged extension holds the clear-speech rules from `skills/clear-speech/SKILL.md`

### Requirement: One script installs the skills on any computer
`scripts/install-skills.sh` SHALL copy every skill in `skills/` into the Claude Code skills folder of the current user, with the path of the checkout written in place of the placeholder, and SHALL add the `/respell` hook to the Claude Code settings if it is absent. It SHALL print what it did.

#### Scenario: A fresh computer
- **WHEN** `main` is cloned to any folder under any user name, the speaker is built, and `scripts/install-skills.sh` is run
- **THEN** `/spell` in a new Claude Code session reads the last reply aloud, and `/respell` repeats it

#### Scenario: Running it twice
- **WHEN** the script is run a second time with nothing changed
- **THEN** the installed skills are the same, the settings file has the hook once, and the script reports that nothing changed

#### Scenario: An installed skill was edited by hand
- **WHEN** the script is run and an installed skill differs from what it would write
- **THEN** the old skill folder is moved to `skills-replaced/`, beside the skills folder, with the date in its name, and the script says where

#### Scenario: The settings file cannot be read
- **WHEN** the Claude Code settings file is not valid JSON
- **THEN** the script leaves it untouched, installs the skills, and says that the hook was not added and why

#### Scenario: All five skills
- **WHEN** the script is run from a checkout of `main` or of `full`
- **THEN** all five skills are installed, and, where `faster-whisper` is present, `/adjutant-online` starts the listener

### Requirement: The same script removes what it installed
`scripts/install-skills.sh --remove` SHALL delete the skills it installs from the Claude Code skills folder and take its hook out of the settings, leaving every other skill and setting as it was.

#### Scenario: Removal
- **WHEN** `scripts/install-skills.sh --remove` is run after an install from `main`
- **THEN** the five skills are gone from the skills folder, the `/respell` hook is gone from the settings, and other skills and hooks are unchanged

### Requirement: Fanservice mode says when the game lines are missing
Where the game-line files in `reference/` are not present, a fanservice reading SHALL use only the stock phrases named in the clear-speech skill, and the user SHALL be told so in one line. The game-line files SHALL NOT be in the repository.

#### Scenario: Fanservice on the work computer
- **WHEN** `/spell fanservice` is used on a computer whose checkout has no `reference/` folder
- **THEN** the reading uses only the stock phrases of the clear-speech skill, and the user is told in one line that the game lines are not on this machine

#### Scenario: Fanservice on the owner's computer
- **WHEN** `/spell fanservice` is used where the `reference/` files are present
- **THEN** it works as before the change
