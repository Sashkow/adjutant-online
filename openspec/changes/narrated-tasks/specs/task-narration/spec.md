## ADDED Requirements

### Requirement: Text after the command is a task that is narrated
When the owner gives text after `/spell`, the agent SHALL perform that text as a task and speak its progress aloud. When no text is given, the agent SHALL read the last reply aloud as before.

#### Scenario: Command with a task
- **WHEN** the owner types `/spell find why the build is slow`
- **THEN** the agent investigates the build and speaks lines about its progress, and does not read the words "find why the build is slow" aloud as a message

#### Scenario: Command with nothing after it
- **WHEN** the owner types `/spell`
- **THEN** the last reply is read aloud and no task is started

#### Scenario: Fanservice word before the task
- **WHEN** the owner types `/spell fanservice update the dependencies`
- **THEN** the task is "update the dependencies" and it is narrated in fanservice mode

### Requirement: Narration marks milestones only
The agent SHALL speak when the task is accepted, when the phase of work changes, when something is found, when something fails or is refused, when a long wait begins, when a decision is needed, and when the task ends. It SHALL NOT speak a line for every tool call. A line SHALL be eight words or fewer where the facts allow.

#### Scenario: Several files read in a row
- **WHEN** the agent reads six files while exploring
- **THEN** at most one line about reading is spoken

#### Scenario: A finding
- **WHEN** a web search returns the answer the task needed
- **THEN** a line says that it was found and what it is

#### Scenario: A failure
- **WHEN** the tests fail during the task
- **THEN** a line reports the failure and the number of failing tests

### Requirement: Lines play in order and stale lines are dropped
Spoken lines SHALL play one at a time in the order sent. An ordinary line that has waited more than 15 seconds SHALL be dropped. Lines about a problem, a question or the end of the task SHALL always be spoken.

#### Scenario: Two lines sent close together
- **WHEN** two lines are sent one second apart
- **THEN** the second plays after the first with no overlap

#### Scenario: Speech falls behind
- **WHEN** four ordinary lines are sent while a long line is still playing and the third has waited 20 seconds
- **THEN** that line is not spoken

#### Scenario: A problem line waits
- **WHEN** a failure line has waited 20 seconds behind other lines
- **THEN** it is still spoken

### Requirement: Fanservice uses her lines where the meaning is obvious
In fanservice mode, a situation whose meaning plainly matches one of the Adjutant's lines SHALL be spoken with that line word for word, taken from the reference files. A web search SHALL be reported with "I'm picking up" followed by what was found. A quote SHALL NOT change an outcome, and a question for the owner SHALL also be said in plain words.

#### Scenario: Web search with a result
- **WHEN** a web search in fanservice mode finds three matching articles
- **THEN** the line begins "I'm picking up" and names the three articles

#### Scenario: Refused permission
- **WHEN** a command is refused in fanservice mode
- **THEN** her line for a denied access code is spoken

#### Scenario: No line fits
- **WHEN** no line in the reference files plainly matches the situation
- **THEN** the plain phrase is spoken in her pattern and no quote is forced

#### Scenario: Reference files are missing
- **WHEN** the reference files cannot be read
- **THEN** narration uses the plain phrases and the one-line message says that no quotes were available

### Requirement: The nuclear lines mark irreversible actions
In fanservice mode, "Nuclear missile ready." SHALL be spoken when a destructive or irreversible action is prepared and waits for the owner's go-ahead, and "Nuclear launch detected." SHALL be spoken when such an action has started or is found to have been started by someone else. Neither line SHALL be used for an action that can be undone, and neither SHALL replace the question that asks for confirmation.

#### Scenario: Prepared and waiting
- **WHEN** a database migration that drops tables is ready and the agent asks whether to run it
- **THEN** "Nuclear missile ready." is spoken, followed by the question in plain words, and the agent waits for the answer

#### Scenario: Confirmed and running
- **WHEN** the owner confirms and the destructive command starts
- **THEN** "Nuclear launch detected." is spoken

#### Scenario: Started by someone else
- **WHEN** the agent finds that the branch history was rewritten upstream
- **THEN** "Nuclear launch detected." is spoken, followed by what was found in plain words

#### Scenario: An ordinary action
- **WHEN** the agent commits, builds, runs tests or deploys to a test server
- **THEN** neither nuclear line is spoken

#### Scenario: Plain mode
- **WHEN** a destructive action is prepared in a task without the fanservice word
- **THEN** neither nuclear line is spoken and the warning is given in plain words

### Requirement: Closing an unused shell is announced with her line
When the owner asks for unused shells to be closed and the agent closes one, "Abandoning auxiliary structure." SHALL be spoken. This holds with or without the fanservice word and also outside a narrated task.

#### Scenario: One unused shell
- **WHEN** the owner asks to close unused shells and the agent finds one idle background shell and closes it
- **THEN** "Abandoning auxiliary structure." is spoken

#### Scenario: Several unused shells
- **WHEN** the agent closes three unused shells in one step
- **THEN** the line is spoken once, followed by the number of shells closed

#### Scenario: Nothing to close
- **WHEN** the owner asks to close unused shells and none is unused
- **THEN** the line is not spoken and the agent says in plain words that nothing was closed

#### Scenario: A shell that is still working
- **WHEN** a background shell is still running a command the task needs
- **THEN** it is not closed and the line is not spoken for it

### Requirement: Countdowns are spoken only for known times
A countdown SHALL be spoken only when the remaining time is known from a timer, a stated duration or an earlier timed run in the same session. Its marks SHALL be ten, five and one minute, and marks that no longer apply SHALL be cancelled when the wait ends early. In fanservice mode, a countdown to the end of the whole task SHALL use the dropship line; any other countdown SHALL name the real event.

#### Scenario: Last step with a known length
- **WHEN** the last step of a fanservice task is a build timed earlier at six minutes
- **THEN** "Five minutes until dropship arrival." and "One minute until dropship arrival." are spoken at those marks

#### Scenario: A wait in the middle of the task
- **WHEN** a six-minute download begins in the middle of a fanservice task
- **THEN** the marks name the download and do not mention a dropship

#### Scenario: Unknown duration
- **WHEN** a command of unknown length is started
- **THEN** no countdown is spoken

#### Scenario: Wait ends early
- **WHEN** a wait expected to take six minutes ends after two
- **THEN** no further countdown marks are spoken

### Requirement: A Ukrainian task is narrated in Ukrainian
When the task text is in Ukrainian, narration SHALL be in Ukrainian with the Листоноша phrases and feminine forms, and SHALL NOT use lines from the game, with or without the fanservice word.

#### Scenario: Ukrainian task
- **WHEN** the owner types `/spell онови залежності`
- **THEN** the lines are spoken in the Ukrainian voice

#### Scenario: Ukrainian task with fanservice
- **WHEN** the owner types `/spell fanservice онови залежності`
- **THEN** narration is in Ukrainian with no game lines, and the one-line message says that fanservice applies to English only

### Requirement: The narrated task ends with a spoken closing line
When the task ends, a closing line SHALL be spoken and the turn's notification SHALL stay silent. When the task stops at a question, the question SHALL be spoken in plain words.

#### Scenario: Task finished
- **WHEN** a narrated task completes
- **THEN** a closing line is heard once and no notification message follows it

#### Scenario: Task needs a decision
- **WHEN** the agent must ask the owner to choose between two options
- **THEN** the question is spoken in plain words and is on screen

### Requirement: Stop and repeat cover the whole narration
Stopping SHALL end the line being spoken, all queued lines and any countdown timers. Repeating SHALL play all lines of the latest narrated task in order.

#### Scenario: Stop during narration
- **WHEN** the owner types `/respell stop` while a line plays, two lines wait and a countdown is set
- **THEN** the sound stops and nothing further is spoken, while the task itself continues

#### Scenario: Repeat after a narrated task
- **WHEN** the owner types `/respell` after a narrated task with five lines
- **THEN** the five lines are spoken again in order
