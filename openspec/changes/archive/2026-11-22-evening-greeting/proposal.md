## Why

When voice mode is switched on, the Adjutant says only "Adjutant online." In the game her first briefing opens "Adjutant online. Good evening, Magistrate." The owner wants that greeting when it is truly evening, and no greeting she never says to the Magistrate (the game's "Good morning" is addressed to a Captain).

## What Changes

- On switching on in the evening (18:00 to 23:59 Kyiv time), the first time that evening, the spoken line becomes "Adjutant online. Good evening, Magistrate."
- At any other time, and on later switch-ons the same evening, the line stays "Adjutant online."

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `voice-mode`: a new requirement for the evening greeting on switching on.

## Impact

- `~/.claude/skills/adjutant-online/SKILL.md`: the switching-on step reads the Kyiv clock and a marker file for the date.
- A marker file `~/.cache/adjutant-voice/greeted-evening-<date>`. No code in the repository changes.
