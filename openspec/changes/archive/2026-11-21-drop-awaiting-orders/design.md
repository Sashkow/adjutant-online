## Context

"Awaiting orders." lives only in instruction text, in four files:

| File | Read by | Rule today |
|---|---|---|
| `~/.claude/skills/clear-speech/SKILL.md` (lines 119, 132, 188), copied to `vscode-extension/clear-speech.md` | the extension's rewording step for notifications (`rephrase.js`), and the `/clear-speech` skill | a statement that the listener must decide → state it, then "Awaiting orders."; never after a question |
| `~/.claude/skills/spell/clear-speech-card.md` (lines 55, 63, 80) | spell readings and narration | the same rule, condensed |
| `~/.claude/skills/spell/narrate.md` (lines 53, 56) | narrated tasks | a decision is needed → the question, then "Awaiting orders." |
| `~/.claude/skills/spell/fanservice.md` (line 19) | fanservice readings | one of the frames to lay on |

The frame "[Thing] is prepared and may be initiated at your convenience." already exists in `SKILL.md` (line 118) and on the card (line 54) for "something is ready to start whenever the listener likes". Narration has no such situation.

Spell and notifications read different files (the card and the full skill), so the two can be given different rules without any code.

## Goals / Non-Goals

**Goals:**

- "Awaiting orders." is not heard in readings, narrated tasks or notifications.
- In the spell skill, the "at your convenience" line takes its place only where something is really prepared and waits for a go-ahead.
- Notifications get no replacement.

**Non-Goals:**

- No change to `references/adjutant-style.md`, which describes how she speaks in the game.
- No change to the other frames, to the opening words of notifications, or to any JavaScript.
- No fixed Ukrainian phrase: Ukrainian narration stays plain, as now.

## Decisions

**1. What "really prepared" means.** The line is allowed only when all three hold: (a) a concrete action exists and is complete enough to start (a commit staged, a migration written, a release built, a plan drafted that the owner asked for); (b) it has not been started; (c) the only thing missing is the owner's go-ahead. The line names that action as its subject. A choice between options, a question about what the owner wants, missing information, or work that is merely finished do not qualify. The test is written into the card and `narrate.md` in these words, with one example that qualifies and two that do not.
*Alternative considered:* leave it to "ready to start whenever the listener likes" as the card says now. Rejected: that wording is loose enough to be stretched over any pause, which is how "Awaiting orders." wore out.

**2. Nothing after a question.** In narration, "a decision is needed" becomes: the question in plain words, sent with `--keep`, and nothing after it. This also removes the contradiction with the clear-speech rule that a question already asks.

**3. A prepared action and its question.** When a prepared action also needs an explicit yes or no, the "at your convenience" line stands in for the question: it says what is ready and that the move is the owner's. A separate question follows only when the line alone would leave the choice unclear (for example, two ways to proceed). On screen the question is written as usual.

**4. Destructive actions do not use the line.** "At your convenience" is too light for an action that cannot be undone. Those keep what they have: "Be advised: …" and the question in plain mode, "Nuclear missile ready." and the question in fanservice mode.

**5. Length.** The line is nine words before its subject, against the narration guide of eight words per line. It is a closing line, sent with `--keep`, and is exempt from the guide; the subject is kept to a few words ("The commit", "The migration").

**6. A statement that the listener must decide.** With the tag gone, the rewording must not lose the ask. The original's own words for it are kept in plain form: "There are two possible designs and I need you to choose." becomes "There are two possible designs. You need to choose one." This applies in both `SKILL.md` (notifications) and the card (spell). The row in the frame table is deleted, so such a sentence falls to "anything else: as it is".

**7. Fanservice.** "Awaiting orders." is taken out of the frame list. Her fleet line ("… prepped and ready … Awaiting orders.") is also not used as a direct quote, since the owner does not want to hear the phrase; `fanservice.md` says so in one sentence.
*Alternative considered:* allow it as a verbatim quote, because the mode is built on her exact words. Rejected as the default; it is one sentence to reverse if the owner wants it.

**8. The card and the full skill now differ on purpose.** Both drop "Awaiting orders."; only the card carries the strict test from decision 1 (the full skill keeps its existing "ready to start" row unchanged, so notifications are untouched apart from the removal). The note at the end of `SKILL.md` about keeping the card matched gets one sentence naming this difference, so that a later sync does not undo it.

**9. Getting the change into the extension.** `vscode-extension/clear-speech.md` is refreshed from `SKILL.md` by `npm run build:vscode`, then the extension is installed as in earlier changes. The repository copy currently lacks the last sentence of `SKILL.md`; the copy step brings it in, which is harmless.

## Risks / Trade-offs

- [The model still says "Awaiting orders." from habit or from the style notes] → the card and `narrate.md` state plainly that the phrase is not used; `adjutant-style.md` is read only when step 4 is revised, not for rewording.
- [The "at your convenience" line wears out the same way] → the three-part test in decision 1; if it is heard too often, tighten the test, not the wording.
- [A decision is missed because nothing marks it] → the question is still spoken with `--keep`, and a notification that ends with a question already opens with "Priority alert from …!".
- [A notification loses the ask when the tag is dropped] → decision 6 and its example in `SKILL.md`.

## Migration Plan

Edit the skill files, copy `SKILL.md` into the extension, rebuild and install. To go back, restore the four files from the edit history and rebuild.

## Open Questions

- Fanservice: should her fleet line stay available as a direct quote (decision 7)?
