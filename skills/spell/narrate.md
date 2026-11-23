# Narrating a task

Part of the spell skill (`core.md` beside this file). Read this file when the text after `/spell` is a task.

The listener is not watching the screen. Short spoken lines tell them what is happening now, what was found, what went wrong and when it is over. The task itself is done exactly as it would be without narration, with the same care and the same confirmations; the result still goes on screen in the usual way.

**How to speak a line.** One call per line. Every call returns at once and the lines are spoken in the order sent.

```bash
~/.claude/skills/spell/scripts/narrate.sh --start                 # once, before the first line
~/.claude/skills/spell/scripts/narrate.sh "Test sequence initiated."
~/.claude/skills/spell/scripts/narrate.sh --keep "Priority alert! Two tests failed."
```

- Send the line in the same step as the action it describes (the same batch of tool calls), so narration costs no extra turn.
- A plain line that has waited more than 15 seconds for the speaker is dropped, because the work has moved on. Use `--keep` for a line that must be heard: a problem, a refusal, a question, a warning, the closing line.
- A line that reports a result is sent only after you have seen the result. Never put a result line in the same command as the step it reports ("run the tests, then say that all pass"): if the outcome differs, she has said something false. Lines that announce a start ("Test sequence initiated.") may go in the same command. If a wrong line was spoken, correct it at once with `--keep "Correction: …"`.
- Only the main agent narrates. Do not ask subagents to speak.

**When to speak.** Milestones only, never every tool call:

1. the task is accepted (the first line)
2. the phase of work changes: reading, searching, changing, checking
3. something is found that the listener would want to know
4. something fails or is refused
5. a wait of more than about thirty seconds begins
6. a decision is needed
7. the task ends

As a guide: no more than two lines in one step (a third would wait ten seconds or more behind them), no more than one line in thirty seconds of work, and eight words or fewer per line where the facts allow. Reading six files in a row is one line, not six. Each line follows the clear-speech rules (no abbreviations, numbers as words, common words) and adds no facts.

**What to say.** The plain phrase for each situation:

| Situation | Plain phrase |
|---|---|
| Task accepted | "Task received." |
| Reading the project | "I am reading the project files." |
| Searching the web | "I am searching the web." |
| A search or a look-up gave a result | "I have found …" and the finding in a few words |
| The place in the code was found | "… located in the file called …" |
| A change, a build or a test run starts | "… initiated." ("Test sequence initiated.") |
| A step finished well | "… complete." ("Build complete.") |
| A guess was confirmed | "It appears that …" |
| Something is missing | "Not enough …" or "Additional … required." |
| Access was refused, or granted | "Access denied." / "Access accepted." |
| A thing could not be found | "I cannot find …" |
| Something is removed on purpose | "Removing …" |
| A step was interrupted | "… interrupted." |
| A helper agent was sent out, and reported back | "A helper has started." / "The helper has reported." |
| A long wait begins | "… is running. Stand by." |
| Failure | "Priority alert! … failed." with the number that matters |
| A warning before a risky step | "Be advised: …" |
| A decision is needed | the question in plain words, nothing after it |
| Something is prepared and waits for the go-ahead | "The [thing] is prepared and may be initiated at your convenience." |
| The task is done | "This concludes the task." |

**The end.** Send the last line with `--keep`. When the task is done: "This concludes the task." When the task stops at a question: the question itself in plain words, and nothing after it. When the task stops because an action is prepared and waits for the go-ahead (a commit staged, a migration written, a release built; not started, only the go-ahead missing): "The [thing] is prepared and may be initiated at your convenience." It is exempt from the eight-word guide, keep the subject to a few words, and it stands in for the question unless the choice would still be unclear (for example two ways to proceed), in which case the question follows. It is never used for a choice, missing information, finished work or a destructive action: those keep the question, and a destructive one keeps "Be advised: …" first. "Awaiting orders." is not used. Narration goes on after the user answers, until the task ends. The narration keeps the turn's own notification silent, so the closing line is the only announcement. In your written reply, give the result as usual; do not list the spoken lines.

**Countdowns.** Only when the remaining time is really known: from a timer you set, a stated duration, or a run of the same command that you timed earlier in this session. Never guess. Call it once when the wait begins, and cancel it if the wait ends early:

```bash
~/.claude/skills/spell/scripts/narrate.sh --countdown 400 "the build ends"   # speaks "Five minutes until the build ends." and "One minute until …"
~/.claude/skills/spell/scripts/narrate.sh --countdown-cancel
```

The marks are ten, five and one minute; those already past are skipped. The script speaks them by itself, with no further step from you.

**Fanservice in a narrated task.** With the word `fanservice`, read `fanservice.md` beside this file, and her lines from the two reference files it names, before the first line. Then, where a situation plainly matches one of her lines, say that line word for word in place of the plain phrase. Where none plainly fits, use the plain phrase; never force a quote. What to look for:

| Situation | Her line to look for |
|---|---|
| Task accepted | her line for an incoming transmission |
| Reading the project | her line about cameras being switched on |
| A web search gave a result | begin with "I'm picking up" and say what was found; her "here's something" where a single result stands out |
| A place was found | her "… located in sector …" pattern, with the real place |
| A step finished well | her alerts for research, an upgrade or an add-on being complete |
| A guess was confirmed | her line about intelligence being correct |
| Something is missing | her alerts for not enough of a resource, or more supply being required |
| Access refused, or granted | her lines for an access code being denied or accepted |
| A thing could not be found | her line about something that no longer registers on her sensors |
| Something is removed on purpose | her self-destruct line |
| A step was interrupted | her line for an interrupted landing sequence |
| A helper agent's report arrives and ends | her lines for patching something through, and for a transmission that has ended |
| The task is done | her line for a report that is ready, or one of her end-of-briefing lines |
| An ordinary action is prepared and waits for the go-ahead | the plain readiness line (a destructive one takes "Nuclear missile ready." below) |

The limits of fanservice mode hold here too: a quote never flips an outcome, a question for the user is also said in plain words, numbers that matter are said in a sentence of your own, and a military rank inside a quote becomes "Majustrait" or is left out. Three lines have rules of their own, set by the user:

- **The dropship countdown.** Only a countdown to the end of the whole task uses her dropship line: pass `"dropship arrival"` as the event, and it may be heard at each mark. A countdown to anything else names the real event.
- **The two nuclear lines**, for actions that are destructive, irreversible or outward-facing; send both with `--keep`:
  - "Nuclear missile ready." when such an action is prepared and waits for the user's go-ahead: a release about to go to production, a migration written but not run, a force push or mass delete staged. Follow it with the question in plain words, and wait for the answer.
  - "Nuclear launch detected." when such an action has started, or someone else started one: the confirmed command is now running, the branch history was rewritten upstream, or a destructive command turns up inside a script you were about to run.
  - Never for anything that can be undone (a commit, a build, a test run, a deploy to a test server), and never in place of the confirmation.


**A task written in Ukrainian** is narrated in Ukrainian: the language of the narration follows the language of the task text. Read `ukrainian.md` beside this file, and use the fixed phrases from its table where they fit ("Увага, халепа: … не вдалося.", "За моїми даними, …"); for other situations, including the closing line and the line for a prepared action, there is no fixed phrase: say it plainly in her manner, with "ти" and the feminine. For a countdown give the event in the genitive: `--countdown 400 "кінця збірки"` speaks "До кінця збірки ще п'ять хвилин." Game lines are English only: with a Ukrainian task the word `fanservice` has no effect, and your one-line message says so.

**To stop the narration** (the user says "stop", "quiet" or "enough"): `~/.claude/skills/spell/scripts/narrate.sh --stop`. It ends the line being spoken, the queue and any countdown; the task itself goes on. `/respell` repeats all lines of the latest narrated task.
