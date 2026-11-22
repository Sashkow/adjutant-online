## Why

With several agent sessions and projects open, a spoken notification does not say which one it is about, so the owner has to look through windows to find it. The owner asked for every notification to name its source, and for alerts to be told apart from ordinary messages by their first words.

## What Changes

- Every spoken notification opens by naming where it comes from. A failure or a question opens with "Priority alert from <source>!"; anything else opens with "Message from <source>."
- The source is the quickest name that tells sessions apart: the VS Code project; else the folder the session runs in; else the terminal's name, if it has a meaningful one; else the session's topic; and if none is known, "another project".
- **BREAKING** (behaviour): "Priority alert" is no longer limited to notifications that interrupt a reading. It now opens every failure and every question, with the source.
- A Ukrainian message gets Ukrainian opening words: "Увага! Проєкт <source>." and "Повідомлення від проєкту <source>."
- The voice test command is unchanged: it has no opening words.

## Capabilities

### New Capabilities
- `notification-source`: how a spoken notification names the project or session it comes from, and its opening words.

### Modified Capabilities
- `reading-interruption`: the requirement on the opening words of an interrupting notification is replaced by the new opening words, which do not depend on whether a reading was interrupted.

## Impact

- `vscode-extension/messages.js` (source name, opening words), `hook.js` (session topic from the transcript), `extension.js` (passes the source; no longer passes `--alert` to the speaker); extension version 0.1.14.
- The speaker's `--alert` flag stays for other callers but the extension no longer uses it.
- `vscode-extension/README.md`.
