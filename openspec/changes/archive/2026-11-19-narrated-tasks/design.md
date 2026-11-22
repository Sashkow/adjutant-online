## Context

The `spell` skill turns a message into speech through `read-aloud.sh`, which plays paragraphs in order, remembers one process group for stop, and saves the text for `/respell`. Speech is slow next to the agent's work: a ten-word line takes about five seconds, in which the agent can read several files. The agent can speak only when it takes a step, so it is silent while a long command runs.

The owner's decisions (2026-11-19): text after `/spell` is always a task; the dropship countdown only for the end of the whole task; a Ukrainian task is narrated in Ukrainian without game quotes; the closing line is spoken and the notification stays silent.

## Goals / Non-Goals

**Goals:**
- The listener can follow a task by ear: what is happening now, what was found, what went wrong, when it is over.
- Narration never falls far behind the work and never states something that is not true.
- Stop and repeat work on the whole narrated task.

**Non-Goals:**
- Speaking every tool call.
- Narration by subagents; only the main agent speaks.
- Narration outside the task started with `/spell`.
- Translating the Adjutant's lines into Ukrainian.

## Decisions

**1. One script call per line.** `narrate.sh` takes one short line and speaks it in the background through the speaker's shared lock, so lines queue in order and do not overlap. The first line of a task opens with the double beep, later lines with the short blip. Modes:

| Call | Effect |
|---|---|
| `narrate.sh --start` | Begins a narrated task: empties the saved text, writes the quiet marker, clears old queued lines |
| `narrate.sh "line"` | Queues one line and appends it to the saved text |
| `narrate.sh --keep "line"` | The same, for a line that must not be dropped (problem, question, closing line) |
| `narrate.sh --countdown <seconds> "<event>"` | Sets timers for the ten, five and one minute marks that still lie ahead |
| `narrate.sh --countdown-cancel` | Removes the timers (the wait ended early) |
| `narrate.sh --stop` | Ends the line being spoken, the queue and the timers |

*Alternative considered:* a long-running narrator process fed through a pipe. Rejected: more moving parts, and the lock already gives ordering.

**2. Lines that have gone stale are dropped.** An ordinary line that has waited more than 15 seconds for the speaker is discarded, because the work has moved on. Lines sent with `--keep` are always spoken. This bounds how far speech can trail the work.

**2a. What the build settled.** Lines keep their order through a chain: each line waits for the line before it to finish, and is prepared meanwhile. The 15 seconds are counted from the moment a line is ready to be spoken, not from the call, so the time to prepare its audio does not count against it. The script keeps a log of what was spoken or dropped and after how long (`~/.cache/adjutant-voice/narration/log`), which the trial runs read. The skill no longer pins the light model: it used to run on Haiku, which was enough for rewording a message but is not the right choice for an arbitrary task. The cost is that a plain reading is now reworded by the session's own model.

**2b. What the trial runs taught.** Three narrated trials were run on 2026-11-19 (plain, fanservice with a web search and a timed last step, Ukrainian). No line waited longer than 10 seconds and none was dropped. Two rules were added to the skill. A line that reports a result is sent only after the result has been seen: in the first trial a line with the expected test count was chained after the test command, the count turned out different, and a correction had to be spoken. And no more than two lines go in one step: with three, the third waited 10 seconds behind the others.

**3. When to speak.** The skill tells the agent to speak at these moments only: the task is accepted; the phase changes (reading, searching, changing, checking); something is found that the owner would want to know; something fails or is refused; a wait of more than about thirty seconds begins; a decision is needed; the task ends. As a guide, no more than one line in thirty seconds of work, and eight words or fewer per line. The line is sent in the same step as the action it describes, so it costs no extra turn.

**4. Phrases by situation, in the skill.** The skill holds a table of situations with the plain phrase for each, built from the clear-speech frames ("… initiated.", "… detected.", "… complete.", "Not enough …", "Priority alert! … failed."). For `fanservice` it adds a column that says which kind of line to look for in the reference files, with at most a few words of her pattern. The agent reads the reference files at the start of a fanservice task and uses a line only where its meaning is obvious for the situation; otherwise it uses the plain phrase in her pattern. The existing rules stay: a quote never flips an outcome, a question survives in plain words, and important numbers are said in the agent's own sentence.

**4a. The two nuclear lines, for irreversible actions (fanservice).** Added at the owner's request (2026-11-19). Both belong to actions that are destructive, irreversible or outward-facing, and they split by timing:

| Line | When it is spoken |
|---|---|
| "Nuclear missile ready." | A big irreversible action is prepared and waits for the owner's go-ahead: a release built and about to be deployed to production, a database migration written but not run, a force push or mass delete staged for confirmation |
| "Nuclear launch detected." | Such an action has started, or someone else started one: the confirmed destructive command is now running, the branch history was rewritten upstream, or a destructive command is found inside a script that was about to be run |

Two limits. They are used only for the truly irreversible: an ordinary commit, build, test run or deploy to a test server never gets either line, so that they keep meaning "pay attention". And they never stand in for the confirmation: the question is spoken in plain words beside the quote ("Nuclear missile ready. The migration will drop two tables. Should I run it?"), and the agent still waits for the answer before a destructive step. Both lines are sent with `--keep`.

**4b. "Abandoning auxiliary structure." for closing unused shells.** Added at the owner's request (2026-11-19). When the owner asks for unused shells to be closed, and the agent finds one and closes it, this line is spoken as it is closed. When several are closed in one step, the line is spoken once and the count follows in plain words ("Three shells closed."). It is not spoken when nothing unused was found, and not for a shell that is still doing work; a shell is never closed just to say the line. The owner asked for this as a standing habit, so it applies whenever shells are closed at their request, also outside a narrated task and without the fanservice word.

**4c. "Receiving incoming transmission." when sessions talk to each other.** Added at the owner's request (2026-11-19). When a message arrives from another Claude session, this line is spoken before the agent acts on it. Like the shell line in 4b it is a standing habit: it applies without the fanservice word and outside a narrated task. It is spoken once per incoming message, not for messages the agent sends, and not for reports from helper agents the agent started itself (those keep the rule in decision 4). The content of the message still reaches the owner in writing.

**5. Countdowns run on timers.** When a wait with a known length begins, the agent calls `--countdown` once; the script sleeps and speaks the marks without any model call, and the agent cancels the timers if the wait ends early. The time counts as known only if it comes from a timer the agent set, a stated duration, or a run of the same command timed earlier in this session. Marks are ten, five and one minute. With `fanservice`, if the wait is the last step of the whole task, the event is the dropship line and may be said at each mark; in every other case the event is named as it is.

**6. Ukrainian.** The language of narration follows the language of the task text. For Ukrainian the skill's existing Листоноша phrases are used with the same situations; the word `fanservice` is ignored and the one-line message says so.

**7. The end.** The last line is sent with `--keep`: "This concludes the task." (plain), her closing line (fanservice), or "Доповідь закінчила." The quiet marker from `--start` silences the turn's notification. If the task stops at a question, the question is spoken with `--keep`, followed by "Awaiting orders." or "Кажи, що далі, друже.", and narration continues when the owner answers.

**8. Repeat and stop.** Lines are appended to `last-reading.txt` as paragraphs, so `/respell` repeats the task's narration as one reading. `read-aloud.sh --stop` and the `/respell stop` hook also call `narrate.sh --stop`.

## Risks / Trade-offs

- [Too much talk] → The limits in decisions 2 and 3; adjust by ear after real tasks.
- [A countdown promises a time that is wrong] → Only known durations; cancelled when the wait ends early; no countdown otherwise.
- [A loose quote misleads] → Quotes only where the meaning is obvious; outcomes, questions and numbers stay in plain words.
- [The owner types `/spell some text` meaning "read this"] → The agent would treat it as a task. Accepted by the owner. If the text is plainly not an instruction (a quotation, a sentence with no request), the agent reads it aloud and says that it did so.
- [Extra tool calls] → About one per thirty seconds of work.
- [The quiet marker expires in a long task] → `narrate.sh` renews it with every line.

## Open Questions

- Should narration also cover the answer when the owner replies to a question asked during a narrated task? This design says yes, until the task ends.
