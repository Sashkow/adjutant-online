## Context

The VS Code extension speaks three kinds of notification: a finished task, a finished terminal command, and the end of a Claude Code turn (from a Stop hook event that carries the session's folder and transcript path). Until now the words were only the message. The earlier change `notification-interrupts-reading` added "Priority alert!" in the speaker, and only when a reading was interrupted.

The owner's instruction (2026-11-19): "when it is a priority alert, say priority alert from and say the vscode project name, else use some fast way to identify session (terminal name if meaningful name, session topic otherwise, if hard to identify, just say from another project). If it is not a priority alert, say message from …"

## Goals / Non-Goals

**Goals:**
- The first words of a notification say how urgent it is and where it comes from.
- Finding the source costs no noticeable time and no model call.

**Non-Goals:**
- A different voice per session.
- Naming the terminal a Claude Code session runs in: the hook event does not say which terminal that is.

## Decisions

**1. The opening words are added in the extension, after the rewording step.** The rewording model shortens and rewrites the message; a prefix added before it could be reworded or cut. The extension therefore builds the final text: opening words, then the reworded message. It no longer passes `--alert` to the speaker, whose own prefix depended on a reading being interrupted.

**2. What counts as an alert is unchanged:** a task or command with a non-zero exit code, or a Claude turn whose final message ends with a question.

**3. The source, in this order:**

| Order | Source | Where it comes from |
|---|---|---|
| 1 | The VS Code project | For tasks and commands, the window's workspace name. For a Claude turn, the workspace folder that contains the session's folder |
| 2 | The session's folder | Its own name, unless it is the home folder, the root or the temporary folder |
| 3 | The terminal's name | For terminal commands only, and only if it is not a default name such as "bash", "zsh" or "Task - …" |
| 4 | The session's topic | From the Claude Code transcript: the title the person gave, else the one Claude Code made up. Only the last 2 MB of the file are read |
| 5 | Nothing known | The words "another project" |

Names are made speakable: punctuation becomes spaces and at most four words are said (five for a topic).

**4. Alert words are not said twice.** The rewording step, or a Ukrainian message, may already open with "Priority alert!" or "Увага". Those words are removed from the message when the opening words are added.

**5. Ukrainian.** A message with Cyrillic letters opens with "Увага! Проєкт <source>." (alert) or "Повідомлення від проєкту <source>." (other); with no known source, "Увага! Інший проєкт." or "Повідомлення з іншого проєкту." "Увага!" stays a sentence of its own, so it keeps the delivery the owner approved. The word "проєкт" carries the grammatical case, so the name itself needs no ending.

## Risks / Trade-offs

- [Every notification is three or four words longer, also when only one project is open] → Accepted as asked. If it grows tiresome, the opening could be dropped for the project of the focused window.
- [The title Claude Code makes up can be stale or odd] → It is the fourth choice, used only when there is no project, folder or terminal name.
- [A project name that reads badly aloud] → Punctuation is removed; a custom name per folder could be added later.
