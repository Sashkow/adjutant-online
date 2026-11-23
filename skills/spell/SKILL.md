---
name: spell
description: Read the last chat message out loud in the Adjutant voice and manner, or perform a task and narrate its progress aloud. Use when the user says "spell", "read that out", "read it aloud", "say that", "read me the last message", "speak the recap", or otherwise asks to hear a reply instead of reading it. Also use when the user asks for a spoken recap of the session, or types "/spell" followed by a task: the task is carried out and short spoken lines report each milestone. Rewrites text for the ear with the clear-speech rules, then speaks it through the Adjutant Online speaker. Works in any project, in English and in Ukrainian (Ukrainian is spoken in Ukrainian, never translated). With the word "fanservice" it uses direct quotes from the Adjutant's game lines.
argument-hint: "[fanservice] [a task to perform and narrate; empty reads the last reply]"
# Runs in the main conversation, because it needs to see the last message.
# No "model:" line: text after the command is a task, and a task needs the session's own model.
---

# Spell: speak as the Adjutant

The full instructions are in `~/.claude/skills/spell/core.md`. This file is kept short on
purpose, so that typing `/spell` again in a conversation costs almost nothing.

1. If `core.md` has not been read in this conversation, or its text is no longer in view
   (for example after the conversation was summarised), read it now with the Read tool.
2. Then follow it for the text after the command: nothing means read the last reply aloud;
   a task means do it and narrate it; a first word `fanservice` switches on fanservice
   mode. `core.md` says which other files to read for which case.

If `core.md` is already in view, do not read it again: go straight to the work.
