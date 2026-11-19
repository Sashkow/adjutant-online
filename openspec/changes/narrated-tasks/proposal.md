## Why

The owner works with the voice on and wants to hear a task progress without watching the screen. Today `/spell` can only read a finished message; the work itself is silent until the end-of-turn notification.

## What Changes

- **BREAKING**: text after `/spell` is a task to perform, not a text to read. The agent does the task and speaks short lines as it goes: at the start, at each change of phase, at each finding, at each problem, during long waits, and at the end. There is no special form for reading an exact text; the owner asks for that in plain words.
- `/spell` with no text still reads the last reply.
- The skill gains a table of situations (reading files, searching the web, editing, running tests, waiting, a missing thing, a refusal, a finding, a failure, a question, the end) with the plain phrase for each.
- `fanservice` is kept. In a narrated task with `fanservice`, a situation whose meaning is obvious is spoken with the Adjutant's own line, word for word, from the reference files. A web search uses "I'm picking up …" followed by what was found.
- A countdown is spoken only when the remaining time is really known. With `fanservice`, a countdown to the end of the whole task uses the dropship line; a countdown to anything else names the real event.
- A task written in Ukrainian is narrated in Ukrainian with the Листоноша phrases; `fanservice` has no effect on it.
- The narrated turn ends with a spoken closing line and no spoken notification.
- The lines of one narrated task form one reading: `/respell` repeats them all and stop ends them all.

## Capabilities

### New Capabilities
- `task-narration`: speaking the progress of a task while the agent performs it, including what is said for each kind of action, the fanservice quotes, countdowns, and how the lines are queued, stopped and repeated.

### Modified Capabilities

None. No specifications are archived yet.

## Impact

- `~/.claude/skills/spell/SKILL.md` (new meaning of the argument, narration section, situation table) and a new script `~/.claude/skills/spell/scripts/narrate.sh`.
- `~/.claude/skills/respell/scripts/respell-hook.sh` (stop also ends queued lines).
- Uses the quiet marker and the priority rules from the change `notification-interrupts-reading`, which should be built first.
- Each spoken line costs one extra tool call during the task.
- The project rule holds: the skill names situations and points to the reference files; it does not copy the game script.
