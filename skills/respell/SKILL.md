---
name: respell
description: Repeat the latest spoken reading exactly, word for word, in the Adjutant voice, without rewording anything. Use when the user says "respell", "again", "repeat that", "say that again", "read it again", "I missed that" or "once more" after something was read aloud with the spell skill.
# Nothing to think about here: one command replays the saved text.
model: haiku
---

# Respell: repeat the latest reading

Typed as exactly `/respell` (or `/respell stop`), this never reaches you: a UserPromptSubmit hook in `~/.claude/settings.json` (`scripts/respell-hook.sh`) runs the script itself and no model call is made. These instructions are for the other cases, such as the user saying "say that again" in words.

The `spell` skill saves the text of each reading. This skill plays that same text again. Do not reword it, shorten it, re-read the conversation or load any other skill.

Run this one command in the background (`run_in_background: true`):

```bash
~/.claude/skills/spell/scripts/read-aloud.sh --again
```

Then tell the user in one short line that the reading is being repeated, and that "stop" ends it.

- If the command says nothing has been read aloud yet, say so and offer `/spell`.
- To stop a reading in progress: `~/.claude/skills/spell/scripts/read-aloud.sh --stop`.
- The audio was already prepared the first time, so the repeat starts almost at once.
