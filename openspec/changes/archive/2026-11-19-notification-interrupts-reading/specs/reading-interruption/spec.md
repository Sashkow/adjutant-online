## ADDED Requirements

### Requirement: A notification takes the speaker from a reading
When a spoken notification is ready while a reading is playing, the reading SHALL stop within half a second and the notification SHALL play before any further part of the reading.

#### Scenario: Notification during a paragraph
- **WHEN** a notification is sent while the second paragraph of a reading is playing
- **THEN** the paragraph stops, the notification sound and message play, and no reading audio overlaps them

#### Scenario: Several notifications together
- **WHEN** two notifications arrive during one reading
- **THEN** they play one after the other and the reading returns only after the second

#### Scenario: Notification with no reading in progress
- **WHEN** a notification is sent and nothing is playing
- **THEN** it plays as it does today, with no added opening words

### Requirement: The reading returns like an interrupted speaker
After the notification the reading SHALL continue without losing any sentence, and SHALL choose its return by where it was cut.

#### Scenario: Cut in the first sentence of a paragraph
- **WHEN** the cut falls in the first sentence of a paragraph
- **THEN** the paragraph is played again from its start with no return phrase

#### Scenario: Cut in the middle of a later sentence
- **WHEN** the cut falls in a later sentence with more than one second of it left
- **THEN** a return phrase naming the paragraph's topic is spoken and the cut sentence is played from its start

#### Scenario: Cut at the end of a later sentence
- **WHEN** the cut falls in a later sentence with one second or less of it left
- **THEN** a continuing phrase is spoken and the reading goes on from the next sentence

#### Scenario: Paragraph without a topic
- **WHEN** a paragraph that has no topic is cut in a later sentence
- **THEN** the return phrase is one that names no topic

#### Scenario: Ukrainian paragraph
- **WHEN** the interrupted paragraph begins with a Ukrainian sentence
- **THEN** the return phrase is in Ukrainian and uses feminine forms

#### Scenario: Return phrases vary
- **WHEN** a reading is interrupted twice
- **THEN** the two return phrases are not the same wording

### Requirement: A paragraph's topic is not spoken in an uninterrupted reading
A `[topic: …]` marker at the start of a paragraph SHALL be removed from the spoken text and used only in return phrases. The marker SHALL be kept in the saved text of the reading.

#### Scenario: Reading without interruption
- **WHEN** a reading whose paragraphs carry topics plays to the end without a notification
- **THEN** no topic words are heard

#### Scenario: Repeat of a reading
- **WHEN** the latest reading is repeated and then interrupted
- **THEN** the return phrase still names the paragraph's topic

### Requirement: Opening words of an interrupting notification
A notification that interrupts a reading SHALL open with "Priority alert!" when it reports a failure or a question that needs the owner, and with the notification sound alone otherwise. When the message is in Ukrainian the opening words SHALL be "Увага!".

#### Scenario: Failed task interrupts a reading
- **WHEN** a notification about a failed task interrupts a reading
- **THEN** the sound is followed by "Priority alert!" and then the message

#### Scenario: Finished task interrupts a reading
- **WHEN** a notification about a successful task interrupts a reading
- **THEN** the sound is followed by the message with no added words

#### Scenario: Ukrainian failure message
- **WHEN** a failure notification written in Ukrainian interrupts a reading
- **THEN** the sound is followed by "Увага!" in the Ukrainian voice and then the message

#### Scenario: Message already opens with the words
- **WHEN** an interrupting failure message already begins with "Priority alert!"
- **THEN** the words are spoken once

### Requirement: "Увага!" is called out
When "Увага!" is spoken as a sentence of its own, its first and last syllables SHALL be emphasised over the middle one, and the pause after it SHALL be longer than the pause between ordinary sentences. The owner approved this delivery by ear on 2026-11-19.

#### Scenario: The word opens an interrupting notification
- **WHEN** a Ukrainian failure notification interrupts a reading
- **THEN** the first and last syllables of "Увага!" are louder than the middle one, and about a quarter of a second more silence follows the word than follows an ordinary sentence

#### Scenario: The word inside a sentence
- **WHEN** a message begins "Увага, халепа: …"
- **THEN** the word is spoken in the ordinary way, with no added emphasis or pause

#### Scenario: The English alert words
- **WHEN** an English failure notification interrupts a reading
- **THEN** "Priority alert!" is spoken in the ordinary way

### Requirement: "Where was I?" stresses "was"
In the return phrase "Where was I?", the word "was" SHALL be the strongest word: stressed, highest in pitch and clearly louder than "where" and "I". The owner approved this delivery by ear on 2026-11-19, against their own recording of the phrase.

#### Scenario: The return phrase is spoken
- **WHEN** a reading returns with "Where was I? Oh yes: …"
- **THEN** "was" is at least one and a half times as loud as "where" and as "I", and "I" is not stressed

### Requirement: The reading's own turn is not announced
The end of the turn that started a reading SHALL NOT produce a spoken notification.

#### Scenario: Reading started by a command
- **WHEN** a reading is started and its turn ends two seconds later
- **THEN** no notification is spoken and the reading is not interrupted

#### Scenario: Another session finishes
- **WHEN** a session in another folder ends a long turn during the reading
- **THEN** its notification interrupts the reading

### Requirement: Stopping ends a paused reading
The stop command SHALL end a reading that is waiting for a notification to finish, and the reading SHALL NOT return afterwards.

#### Scenario: Stop during a notification
- **WHEN** the owner stops the reading while an interrupting notification is playing
- **THEN** the notification finishes and the reading does not continue
