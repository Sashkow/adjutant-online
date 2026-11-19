## 1. Narration script

- [x] 1.1 Create `~/.claude/skills/spell/scripts/narrate.sh` with `--start` (empty the saved text, write the quiet marker, clear old queued lines) and a plain line call that speaks in the background and appends to `last-reading.txt`
- [x] 1.2 Lead sounds: double beep for the first line of a task, short blip for later lines
- [x] 1.3 Drop an ordinary line that has waited more than 15 seconds; `--keep` lines are always spoken
- [x] 1.4 `--countdown <seconds> "<event>"` with timers for the ten, five and one minute marks, and `--countdown-cancel`
- [x] 1.5 `--stop` ends the current line, the queue and the timers; call it from `read-aloud.sh --stop` and from the `/respell stop` hook
- [x] 1.6 Renew the quiet marker with every line
- [x] 1.7 Try the script by hand: order of lines, a dropped stale line, a kept line, a cancelled countdown, stop

## 2. Skill text

- [x] 2.1 Rewrite "What to read" in `spell/SKILL.md`: text after the command is a task, empty reads the last reply, `fanservice` as the first word still switches the mode; update the description and argument hint
- [x] 2.2 Add the section on narrating a task: when to speak, the length of a line, sending the line in the same step as the action, the closing line, a question with "Awaiting orders."
- [x] 2.3 Add the table of situations with the plain phrase for each
- [x] 2.4 Add the fanservice column: which kind of line to look for in the reference files for each situation, "I'm picking up …" for web searches, and the unchanged limits on quotes
- [x] 2.4a Add the two nuclear lines for irreversible actions: "ready" when prepared and waiting for the go-ahead, "launch detected" when started; never for actions that can be undone, never in place of the confirmation question
- [x] 2.4b Add the line for closing unused shells at the owner's request (once per step, with the count; a standing habit, also outside narrated tasks)
- [x] 2.5 Add the countdown rules: known times only, the three marks, cancelling, dropship line only for the end of the whole task
- [x] 2.6 Add the Ukrainian rules: language follows the task text, Листоноша phrases for the same situations, no game lines
- [x] 2.7 Check the skill text against the project rule that it does not copy the game script

## 3. Trial runs

- [x] 3.1 Narrated task in plain mode (a small code change with tests): count the lines and check that none trails the work by more than 15 seconds
- [x] 3.2 Narrated task in fanservice mode with a web search and a timed last step
- [x] 3.3 Narrated task in Ukrainian
- [ ] 3.4 Check that the turn's notification is silent, that `/respell` repeats all lines and that `/respell stop` silences everything
- [ ] 3.5 Owner's verdict on how often she speaks and on the phrases; adjust the limits and the table
