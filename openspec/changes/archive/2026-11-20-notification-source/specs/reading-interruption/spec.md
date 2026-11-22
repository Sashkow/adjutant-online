## MODIFIED Requirements

### Requirement: Opening words of an interrupting notification
A notification that interrupts a reading SHALL open with the same words as any other notification: "Priority alert from <source>!" when it reports a failure or a question that needs the owner, and "Message from <source>." otherwise. Whether a reading was interrupted SHALL NOT change the opening words. When the message is in Ukrainian the opening words SHALL be Ukrainian and begin with "Увага!" for an alert.

#### Scenario: Failed task interrupts a reading
- **WHEN** a notification about a failed task interrupts a reading
- **THEN** the sound is followed by "Priority alert from", the source, and then the message

#### Scenario: Finished task interrupts a reading
- **WHEN** a notification about a successful task interrupts a reading
- **THEN** the sound is followed by "Message from", the source, and then the message

#### Scenario: Ukrainian failure message
- **WHEN** a failure notification written in Ukrainian interrupts a reading
- **THEN** the sound is followed by "Увага!" in the Ukrainian voice, the source, and then the message

#### Scenario: Message already opens with the words
- **WHEN** an interrupting failure message already begins with "Priority alert!"
- **THEN** the words are spoken once
