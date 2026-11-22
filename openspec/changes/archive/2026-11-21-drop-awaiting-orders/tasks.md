## 1. Spell skill

- [x] 1.1 `~/.claude/skills/spell/clear-speech-card.md`: delete the "listener must decide … Awaiting orders." line; give the "ready to start" line the three-part test (a concrete action, not started, only the go-ahead missing; never for a choice, a question, missing information, finished work or a destructive action); in the frame rules replace "no 'Awaiting orders.' after a question" with "'Awaiting orders.' is not used; nothing follows a question"; change the two-designs example to "There are two possible designs. You need to choose one." and add one example for a prepared action
- [x] 1.2 `~/.claude/skills/spell/narrate.md`, table of plain phrases: "A decision is needed" keeps only the question; add the row "Something is prepared and waits for the go-ahead" with the readiness line
- [x] 1.3 `~/.claude/skills/spell/narrate.md`, "The end": nothing after a question; the readiness line as the closing line for a prepared action, sent with `--keep`, exempt from the eight-word guide, standing in for the question unless the choice would be unclear; destructive actions keep "Be advised: …" and the question
- [x] 1.4 `~/.claude/skills/spell/narrate.md`: in the fanservice table note that an ordinary prepared action takes the readiness line and a destructive one "Nuclear missile ready."; in the Ukrainian paragraph replace "the line after a question" with the prepared-action line, said plainly
- [x] 1.5 `~/.claude/skills/spell/fanservice.md`: remove "Awaiting orders." from the frame list and add one sentence that the phrase is not used, as a frame or as a quote

## 2. Clear-speech skill and the extension

- [x] 2.1 `~/.claude/skills/clear-speech/SKILL.md`: delete the "Awaiting orders." row of the step 4 table and the rule "Never put 'Awaiting orders.' after a question"; change the two-designs example to "There are two possible designs. You need to choose one."
- [x] 2.2 `~/.claude/skills/clear-speech/SKILL.md`, closing note: add that the card differs on purpose in the strict test for the readiness line
- [x] 2.3 Copy `SKILL.md` to `vscode-extension/clear-speech.md` with `npm run build:vscode`; raise the extension version and install it
- [x] 2.4 Check that "Awaiting orders" appears nowhere in the spell skill, in `SKILL.md` or in `vscode-extension/`, and only in `references/adjutant-style.md`

## 3. Check

- [x] 3.1 Narrated task that stops at a question: the question is the last line heard
- [x] 3.2 Narrated task that stops with a commit staged: the readiness line is heard
- [x] 3.3 Simulated notification "There are two possible designs and I need you to choose.": the ask is heard in plain words, no "Awaiting orders."
- [x] 3.4 Owner's verdict after a reload of the editor windows
