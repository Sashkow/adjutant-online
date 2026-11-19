## ADDED Requirements

### Requirement: Ukrainian text is spoken in Ukrainian
The speaker SHALL speak a sentence that contains Cyrillic letters with the Ukrainian voice, and SHALL NOT translate it.

#### Scenario: A Ukrainian sentence
- **WHEN** the text is "Усі тести пройдено."
- **THEN** it is spoken in Ukrainian with the Adjutant effect

#### Scenario: An English sentence
- **WHEN** the text has no Cyrillic letters
- **THEN** it is spoken by the English voice exactly as before this change

### Requirement: English words inside Ukrainian keep the English voice
The speaker SHALL speak words written in Latin letters inside a Ukrainian sentence with the English voice.

#### Scenario: A file name in a Ukrainian sentence
- **WHEN** the text is "Я оновив файл say.js."
- **THEN** "say.js" is spoken by the English voice and the rest by the Ukrainian voice

### Requirement: Stress is marked from a dictionary
The speaker SHALL mark the stress of each Ukrainian word found in its dictionary before synthesis, and SHALL keep a stress mark that the text already carries.

#### Scenario: A known word
- **WHEN** the text contains "доступ"
- **THEN** the model receives it with the stress on the first vowel

#### Scenario: A word marked by the author
- **WHEN** the text contains "замо́к"
- **THEN** the mark is left where the author put it

### Requirement: Numbers are spelled out in Ukrainian
The speaker SHALL spell digits inside a Ukrainian sentence as Ukrainian words.

#### Scenario: A count
- **WHEN** the text is "Знайдено 3 помилки."
- **THEN** "3" is spoken as "три"

### Requirement: Ukrainian notifications are not reworded
The notification speaker SHALL speak a notification that contains Cyrillic letters as written, without a model call.

#### Scenario: A Ukrainian end-of-turn message
- **WHEN** the opening sentence of the message is Ukrainian
- **THEN** that sentence is spoken unchanged
