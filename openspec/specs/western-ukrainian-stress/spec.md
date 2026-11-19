# western-ukrainian-stress Specification

## Purpose
Western (Galician) stress for the Ukrainian voice: hand-written stress overrides, confirmed by the listener form by form, applied before the standard stress dictionary.

## Requirements
### Requirement: Western stress overrides the standard dictionary
The speaker SHALL mark a Ukrainian word with its Western (Galician) stress when the word form is in the Western stress table, in preference to the standard dictionary and to the standard overrides.

#### Scenario: The future of "бути", second person
- **WHEN** the text contains "Ти будеш там?"
- **THEN** the model receives "буде́ш", with the stress on the second vowel

#### Scenario: The plural forms
- **WHEN** the text contains "Ми будемо там, а ви будете?"
- **THEN** the model receives "буде́мо" and "буде́те", with the stress on the second-to-last syllable

#### Scenario: A capitalised form
- **WHEN** the text begins with "Будеш"
- **THEN** the model receives "Буде́ш", keeping the capital letter

### Requirement: Forms not in the table keep standard stress
The speaker SHALL leave forms of a Western entry that are not listed in it to the standard dictionary.

#### Scenario: First person singular
- **WHEN** the text contains "Я буду вдома."
- **THEN** the model receives "бу́ду", with the stress on the first vowel

#### Scenario: Third person singular
- **WHEN** the text contains "Завтра буде дощ."
- **THEN** the model receives "бу́де", with the stress on the first vowel

#### Scenario: Third person plural
- **WHEN** the text contains "Діти будуть раді."
- **THEN** the model receives "бу́дуть", with the stress on the first vowel

### Requirement: The author's mark wins
The speaker SHALL keep a stress mark that the text already carries, even on a word in the Western table.

#### Scenario: Standard stress written by hand
- **WHEN** the text contains "бу́деш"
- **THEN** the model receives "бу́деш" unchanged

### Requirement: An entry covers the forms of a word
A Western table entry SHALL be written as a stem with endings and their stressed vowel, and SHALL apply to every form it produces.

#### Scenario: One entry, several forms
- **WHEN** the table has the entry for the stem "буд" with the endings "еш", "емо", "ете"
- **THEN** each of "будеш", "будемо", "будете" is marked from that entry
