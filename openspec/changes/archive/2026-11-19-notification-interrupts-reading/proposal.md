## Why

A spoken notification that arrives during a reading waits for the current paragraph to end and then races the next paragraph for the speaker, so it comes late or in an odd place. The owner wants a notification to cut in at once, and the reading to pick up afterwards the way a person does after being interrupted.

## What Changes

- A notification takes the speaker from a reading at once: the reading stops mid-paragraph, the notification sound and message play, and the reading returns.
- The reading returns like an interrupted speaker. Depending on where it was cut, it starts the paragraph again, or says a short return phrase that names the subject and repeats the cut sentence, or says a return phrase and goes on to the next sentence.
- A reading may carry a short subject for each paragraph (`[topic: …]`), which is spoken only in a return phrase.
- A notification that interrupts a reading opens with "Priority alert!" when it reports a failure or a question that needs the owner; other notifications open with the sound alone. For a Ukrainian message the opening is "Увага!".
- The turn that starts a reading sends no spoken notification of its own, so a reading is never interrupted by the announcement that it has started.
- Several notifications that arrive together play one after another, and the reading returns after the last.

## Capabilities

### New Capabilities
- `reading-interruption`: how a notification takes the speaker from a reading in progress, what it says first, and how the reading returns.

### Modified Capabilities

None. No specifications are archived yet, and the open changes do not state requirements about the order of readings and notifications.

## Impact

- `src/node/speak.ts` (play lock, playing a file from an offset), `src/node/say.ts` (new flags), `dist-cli/say.js` rebuilt.
- `~/.claude/skills/spell/scripts/read-aloud.sh` (topic marker, quiet marker) and `~/.claude/skills/spell/SKILL.md` (how to write topics).
- `vscode-extension/extension.js` and `messages.js` (priority flag, kind of notification, staying quiet for the reading's own turn); new extension version.
- No new dependencies. No change to the web page or the Firefox extension.
