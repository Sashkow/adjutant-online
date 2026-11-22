## ADDED Requirements

### Requirement: The voice is reached through a claude.ai Project and a custom connector
The phone voice SHALL work in any chat inside one claude.ai Project, "Adjutant voice", with a custom connector that reaches a speaker server run by the owner. The Project holds the instructions, the clear-speech card and the Ukrainian rules. It SHALL NOT need a custom skill, a web page, code execution, or any app other than the Claude app.

#### Scenario: A new chat in the Project
- **WHEN** the owner opens a new chat in the "Adjutant voice" Project on the phone and types `say Task complete.`
- **THEN** the reply carries an audio player with "Task complete." in the Adjutant voice

#### Scenario: A chat outside the Project
- **WHEN** the owner types `say Task complete.` in a chat that is not in the Project
- **THEN** nothing in this change applies

### Requirement: `say` speaks the text exactly as written
When a message starts with the word `say`, the rest of the message SHALL be sent to the speaker word for word, with no rewording, no frame and no added text. Only markup that cannot be spoken (asterisks, backticks, links) SHALL be removed.

#### Scenario: Text with a short word
- **WHEN** the owner sends `say The docs are out of date.`
- **THEN** the sound says "The docs are out of date." and not "documentation"

### Requirement: `spell` rewords for the ear, then speaks
When a message starts with the word `spell`, the text after it SHALL be made speakable and reworded by the clear-speech card, as `/spell` does on the laptop, and then sent to the speaker. With nothing after the word, the previous assistant reply in the chat SHALL be the text. The reply SHALL show the spoken wording as well as the player.

#### Scenario: Spell a given sentence
- **WHEN** the owner sends `spell Task lint failed with exit code 9.`
- **THEN** the spoken text is the card's rewording ("Priority alert! Code check task failed. Exit code number nine.") and the reply shows that wording

#### Scenario: Spell the last reply
- **WHEN** the owner sends `spell` alone after an answer of three paragraphs
- **THEN** that answer is made speakable, reworded and spoken

### Requirement: The sound plays in a player inside the app
The sound SHALL come back in the same reply as an audio player shown in the chat, which plays on a tap without leaving the app. The sound SHALL be an mp3. A spoken text longer than about two minutes SHALL be shortened as the laptop `spell` does, and the speaker SHALL refuse a text over its length limit with a plain message, not split it across replies.

#### Scenario: Tap to hear
- **WHEN** the reply with the player arrives on the phone
- **THEN** a tap on Play plays the sound in the app

### Requirement: Same voice as on the laptop
The sound SHALL be made by the same speaker as the laptop (`say.js`, the Piper voices at the revision pinned in the code, the default Adjutant effect). Ukrainian text SHALL be spoken by the Ukrainian voice, as on the laptop, and SHALL NOT be translated.

#### Scenario: Ukrainian text
- **WHEN** the owner sends `say Збірку завершено.`
- **THEN** the sound is the Ukrainian voice with the Adjutant effect

### Requirement: The speaker server is reachable only by its secret address and speaks only text
The server SHALL answer only on one secret path, SHALL listen on the local interface only (the Funnel proxies to it), and SHALL answer anything else with 404. It SHALL only speak text it is given, within a length limit, and serve the sounds it made for a short time. If it cannot be reached or cannot speak, the reply SHALL say so in plain words, with no player, and name what to check (for example, that the laptop and the Funnel are running).

#### Scenario: The laptop is off
- **WHEN** the owner types `say Task complete.` while the laptop or the Funnel is down
- **THEN** the reply says the speaker could not be reached and that the laptop and the Funnel must be running

#### Scenario: A wrong address
- **WHEN** a request arrives on any path other than the secret one
- **THEN** the server answers 404 and speaks nothing
