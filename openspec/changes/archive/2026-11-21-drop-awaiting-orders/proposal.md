## Why

"Awaiting orders." is added at the end of spoken lines whenever the owner has to decide something, and it has worn out. In narrated tasks it follows every question, although the clear-speech rules themselves say that a question already asks. The owner prefers her other readiness line, "… is prepared and may be initiated at your convenience.", but only where it is true: something is really prepared and waits for a go-ahead.

## What Changes

- **Spell skill (readings and narrated tasks):** "Awaiting orders." is no longer spoken. Where something is really prepared and waits for the owner's go-ahead, the line is "[Thing] is prepared and may be initiated at your convenience." In every other case that needs a decision, the question or the statement in plain words is the last thing heard.
- **Narrated tasks:** a new situation, "something is prepared and waits for the go-ahead", with that line. The situation "a decision is needed" keeps only the question.
- **Fanservice mode:** "Awaiting orders." leaves the list of frames to lay on.
- **Notifications:** the rewording rules drop the "Awaiting orders." frame with nothing in its place. A statement that the owner must decide keeps that ask in plain words.
- The notes on how she speaks in the game (`references/adjutant-style.md`) are unchanged: they describe her, not what this project says.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-narration`: the closing-line requirement gains the prepared-action case and forbids a stock phrase after a question; a new requirement states when the "at your convenience" line may be spoken by the spell skill.
- `notification-source`: a new requirement that a reworded notification does not get "Awaiting orders." added.

## Impact

- `~/.claude/skills/spell/narrate.md`, `clear-speech-card.md`, `fanservice.md` (outside this repository).
- `~/.claude/skills/clear-speech/SKILL.md` (outside this repository) and its copy `vscode-extension/clear-speech.md`, which the extension uses as the rewording prompt. The copy is made by `npm run build:vscode`.
- The card that spell reads will differ from the full skill on purpose in one place; the note in `SKILL.md` about keeping them matched has to say so.
- The extension has to be rebuilt and reinstalled for the notification change to be heard. No JavaScript changes.
