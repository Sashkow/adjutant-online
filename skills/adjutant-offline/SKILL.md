---
name: adjutant-offline
description: Switch off Adjutant voice mode. Stops the microphone listener that /adjutant-online started, in this or any other session. Use when the user types /adjutant-offline, or asks to "stop voice mode", "stop listening" or "stop recording".
argument-hint: "[nothing]"
---

# Adjutant offline

1. Run `{{ADJUTANT_ROOT}}/scripts/voice.sh stop`. It works whether the listener was started in this session or another.
2. If this session has a Monitor running `voice.sh follow`, stop it with TaskStop.
3. If the listener was running, say it aloud: `~/.claude/skills/spell/scripts/narrate.sh --start; ~/.claude/skills/spell/scripts/narrate.sh --keep "Adjutant offline."` If it was not running, say nothing aloud.
4. Write one line on screen: voice mode is off (or that it was not on). From here on, answer in writing only.
