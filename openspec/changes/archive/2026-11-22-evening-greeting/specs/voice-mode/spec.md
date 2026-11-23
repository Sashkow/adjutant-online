## ADDED Requirements

### Requirement: An evening greeting on switching on
The spoken line that confirms switching on SHALL be "Adjutant online." When it is evening in Kyiv (from 18:00 to 23:59, Europe/Kyiv time, read from the clock) and the greeting has not yet been spoken that evening, the line SHALL be "Adjutant online. Good evening, Magistrate.", as she opens the first briefing of the game. No greeting SHALL be spoken at any other time of day.

#### Scenario: First switching on in the evening
- **WHEN** voice mode is switched on at 20:15 Kyiv time for the first time that evening
- **THEN** the spoken line is "Adjutant online. Good evening, Magistrate."

#### Scenario: Second switching on the same evening
- **WHEN** voice mode is switched off and on again at 21:00 the same evening
- **THEN** the spoken line is "Adjutant online."

#### Scenario: Morning
- **WHEN** voice mode is switched on at 09:00 Kyiv time
- **THEN** the spoken line is "Adjutant online." with no greeting

#### Scenario: After midnight
- **WHEN** voice mode is switched on at 00:30 Kyiv time
- **THEN** the spoken line is "Adjutant online." with no greeting
