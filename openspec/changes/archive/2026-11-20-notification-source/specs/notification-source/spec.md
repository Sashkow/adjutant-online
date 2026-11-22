## ADDED Requirements

### Requirement: A notification opens with its urgency and its source
Every spoken notification SHALL open with "Priority alert from <source>!" when it reports a failure or ends with a question for the owner, and with "Message from <source>." otherwise. The voice test SHALL have no opening words.

#### Scenario: A failed task
- **WHEN** a task fails with a non-zero exit code in the project "shop-api"
- **THEN** the notification begins "Priority alert from shop api!"

#### Scenario: A finished Claude turn
- **WHEN** a Claude Code turn ends in the project "shop-api" and its final message is not a question
- **THEN** the notification begins "Message from shop api."

#### Scenario: A turn that ends with a question
- **WHEN** a Claude Code turn ends with a question for the owner
- **THEN** the notification begins "Priority alert from" and the source

#### Scenario: The message already opens with the alert words
- **WHEN** the reworded message begins "Priority alert! The build failed."
- **THEN** the notification is "Priority alert from <source>! The build failed." and the alert words are heard once

#### Scenario: Voice test
- **WHEN** the owner runs the voice test command
- **THEN** only the test sentence is spoken

### Requirement: The source is the quickest name that tells sessions apart
The source SHALL be, in this order of preference: the VS Code project; the name of the folder the session runs in; the terminal's name, if it is not a default name; the session's topic. When none of these is known the source SHALL be the words "another project". Finding the source SHALL NOT involve a model call.

#### Scenario: A project is open
- **WHEN** the event comes from a folder inside a VS Code project
- **THEN** the source is that project's name

#### Scenario: A session outside any open project
- **WHEN** a Claude Code session runs in a folder that no window has open
- **THEN** the source is that folder's name

#### Scenario: A session in the home folder
- **WHEN** a Claude Code session runs in the home folder and its transcript has a title
- **THEN** the source is that title

#### Scenario: A named terminal
- **WHEN** a command finishes in a terminal named "deploy watch" in a window with no project open
- **THEN** the source is "deploy watch"

#### Scenario: A default terminal name
- **WHEN** the terminal is named "bash" and nothing else is known
- **THEN** the source is "another project"

#### Scenario: Nothing is known
- **WHEN** no project, folder, terminal name or topic can be found
- **THEN** the notification says "from another project"

### Requirement: Ukrainian messages get Ukrainian opening words
A notification whose message is in Ukrainian SHALL open with "Увага! Проєкт <source>." for an alert and "Повідомлення від проєкту <source>." otherwise, and with "Увага! Інший проєкт." or "Повідомлення з іншого проєкту." when the source is not known.

#### Scenario: Ukrainian failure
- **WHEN** a Ukrainian failure message comes from the project "site"
- **THEN** the notification begins "Увага! Проєкт site."

#### Scenario: Ukrainian ordinary message
- **WHEN** a Ukrainian message that is not an alert comes from the project "site"
- **THEN** the notification begins "Повідомлення від проєкту site."
