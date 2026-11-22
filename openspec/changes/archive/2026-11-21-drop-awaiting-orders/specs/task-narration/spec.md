## MODIFIED Requirements

### Requirement: The narrated task ends with a spoken closing line
When the task ends, a closing line SHALL be spoken and the turn's notification SHALL stay silent. When the task stops at a question, the question SHALL be spoken in plain words and SHALL be the last thing spoken; no stock phrase SHALL follow it. When the task stops because an action is prepared and waits for the owner's go-ahead, the last line SHALL be "[Thing] is prepared and may be initiated at your convenience.", naming that action.

#### Scenario: Task finished
- **WHEN** a narrated task completes
- **THEN** a closing line is heard once and no notification message follows it

#### Scenario: Task needs a decision
- **WHEN** the agent must ask the owner to choose between two options
- **THEN** the question is spoken in plain words and is on screen, and nothing is spoken after the question

#### Scenario: Task stops with an action prepared
- **WHEN** the agent has staged a commit and waits for the owner to approve it
- **THEN** "The commit is prepared and may be initiated at your convenience." is the last line spoken

## ADDED Requirements

### Requirement: The readiness line is spoken only for a prepared action
The spell skill, in readings and in narrated tasks, SHALL NOT speak "Awaiting orders.", in plain mode or in fanservice mode. It SHALL speak "[Thing] is prepared and may be initiated at your convenience." only when a concrete action is complete enough to start, has not been started, and lacks only the owner's go-ahead. The line SHALL NOT be used for a choice between options, for a question about what the owner wants, for missing information, for work that is merely finished, or for an action that is destructive or cannot be undone.

#### Scenario: A reading of a message that asks for a choice
- **WHEN** the owner asks for a reading of a message that says there are two designs and one must be chosen
- **THEN** the reading states the choice in plain words, and neither "Awaiting orders." nor the readiness line is spoken

#### Scenario: A reading of a message about a prepared action
- **WHEN** the owner asks for a reading of a message that says a migration is written and can be run when they like
- **THEN** the reading says "The migration is prepared and may be initiated at your convenience."

#### Scenario: Work that is merely finished
- **WHEN** a narrated task completes with nothing waiting for a go-ahead
- **THEN** the readiness line is not spoken

#### Scenario: A destructive action is prepared
- **WHEN** a migration that drops tables is ready and the agent asks whether to run it
- **THEN** the readiness line is not spoken; the warning and the question are spoken in plain words, or with "Nuclear missile ready." in fanservice mode

#### Scenario: Fanservice reading
- **WHEN** the owner asks for a fanservice reading of a message that asks them to decide
- **THEN** "Awaiting orders." is not spoken, as a frame or as a quote
