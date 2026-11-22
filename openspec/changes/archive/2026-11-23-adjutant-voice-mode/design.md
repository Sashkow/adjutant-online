## Context

A Claude Code session has no microphone. On 2026-11-19 a session improvised one: `say.js` asked a question, `arecord` recorded until silence, and `faster-whisper` (`small`, CPU, `/opt/ro/whisper/venv`) recognised the answer. Each question was one blocking shell command.

What the machine offers:

- PulseAudio: `parec` records any source; every output has a `.monitor` source that carries exactly what the computer plays.
- `~/.cache/adjutant-voice/playing.lock` exists while any Adjutant speaker (reading, narration line, notification) plays.
- The `Monitor` tool runs a background command and delivers each line it prints to the session as an event.
- `narrate.sh` speaks lines in order and keeps the turn's own notification silent.
- Whisper models `small` and `large-v3` are downloaded. 12 CPU threads, no GPU.

Decisions the owner made in the exploration (2026-11-22) are recorded in the spec and not argued again here.

## Goals / Non-Goals

**Goals:**
- One command switches a lasting voice conversation on, one switches it off.
- The Adjutant never answers its own voice, a notification, or a video.
- No new dependency and no audio leaving the machine.

**Non-Goals:**
- Interrupting the Adjutant by voice on speakers (echo cancellation). The owner chose to wait.
- A wake word. Every phrase is a request.
- Any link to Claude Code's `/voice` or to Claude Desktop's voice mode.
- Voice mode in more than one session at once.

## Decisions

**1. A background listener that prints lines, watched by `Monitor`.**
`scripts/voice-listen.py` runs until stopped and prints one line per event: `HEARD [en] text`, `STOP text`, `OFFLINE`, `PAUSED`, `RESUMED`. The skill starts it under `Monitor`, so each line wakes the session. Alternative: one blocking record command per turn, as before. Rejected: the session cannot listen while it works, and listening ends when the command does.

**2. One gate for all computer sound: the output monitor.**
The listener records the default output's monitor beside the microphone. The monitor signal is digital, so silence is exact zero and a very low threshold is reliable. A phrase is dropped when computer sound overlapped more than a small part of it. This covers the Adjutant's speech, other sessions' notifications, music and video with one mechanism. `playing.lock` is checked as well, so a quiet passage inside the Adjutant's speech does not open the gate. Alternative: PulseAudio echo cancellation. Rejected for now: the Adjutant effect (doubling, echo) cancels badly, and a misheard own voice becomes a request.

**3. Drop phrases, do not mute the microphone.**
Recording never stops; the decision is made per phrase after the fact. So nothing has to be switched on and off in time, and the first word after the Adjutant falls silent is not lost. The gate stays shut for a short tail after the sound ends, for the room's echo. Starting value 0.5 s, to be set by ear.

**4. No gate on headphones.**
The listener reads the default output's active port every few seconds. A port or device that is headphones, a headset or Bluetooth means the microphone cannot hear the output, so nothing is dropped and the owner can speak over the Adjutant. A muted output is treated the same way.

**5. Phrases are cut by loudness, then checked by Whisper.**
A phrase starts when the microphone is above an adaptive noise floor for 0.3 s and ends after a stretch of quiet (starting value 1.2 s, to be set by ear; the improvised flow used 2.5 s). Whisper runs with its voice filter on, and a phrase is thrown away when the model reports no speech or low confidence, so coughs and keyboard noise do not become invented sentences.

**6. Language is the likelier of English and Ukrainian.**
Whisper's language detection returns a probability for every language; the listener compares only `en` and `uk` and recognises in the winner. So a short Ukrainian phrase is never taken for Russian or Polish.

**7. Model: start with `small`, decide by test.**
`small` answered in about two seconds before, but its Ukrainian is weak. `large-v3` is installed and far more accurate, but slow on this CPU. The test with the owner measures both; the result is recorded in the Open Questions below.

**8. Stop words and the off phrase are recognised in the listener.**
A phrase that is close to "stop", "wait", "стоп", "зачекай" or "почекай" is printed as `STOP` and also touches `voice/stop-requested`, so a session that is in the middle of work can see it with one file check between steps without waiting for an event. "Adjutant offline" (and "Ад'ютант офлайн") prints `OFFLINE` and the listener ends itself. Whisper is given the word "Adjutant" as a hint, since it is rare.

**9. The abort window is a blocking helper.**
`voice.sh abort-window 4` waits until the Adjutant has finished the line, then four seconds of open microphone, then for any phrase still being spoken or recognised, and reports whether a stop was heard. It must be blocking: the session has to hold the irreversible action until it returns.

**10. One listener per machine, with a pid file.**
`~/.cache/adjutant-voice/voice/listener.pid`. Starting a second one ends the first (the latest session takes the microphone). `/adjutant-offline` works from any session because it needs only the pid file.

**11. Answers go through `narrate.sh --keep`.**
It queues lines in order, keeps the turn's own notification silent and feeds `/respell`. No new speaker code.

**12. The confirmation ritual is skill text.**
Which request needs it, the repeat-back, judging whether the owner repeated part of the action, and the two nuclear lines are instructions to the agent in the skill. How the two nuclear lines are delivered is settled in the test notes below (item 5).

**13. Where things live.**
The listener, the helper and their tests are in this repository (`scripts/`), because they are code with tests. The two skills are in `~/.claude/skills/` beside `spell`, because they must work in any project; they call the scripts by absolute path, as `narrate.sh` does.

## Risks / Trade-offs

- [Every phrase in the room becomes a turn and spends tokens] → the owner's choice; "Adjutant offline" and `/adjutant-offline` are quick ways out. The low-confidence filter removes most noise.
- [Whisper invents a sentence from noise ("Thank you for watching")] → voice filter, confidence threshold, and a short list of known inventions that are dropped.
- [A misheard phrase starts a wrong action] → the spoken confirmation, which needs part of the action repeated, for every codebase change and every action that cannot be undone.
- [Music plays for an hour: the owner speaks and nothing happens] → `PAUSED` after 10 s of continuous sound puts a line on screen; `RESUMED` when it ends.
- [The monitor shows sound while the speakers are turned down to zero] → a muted output opens the gate; a very low volume does not. Accepted.
- [Events from `Monitor` may arrive only between steps of a long turn] → the stop file (decision 8) does not depend on events.
- [The end-of-turn notification is spoken after a voice turn longer than 30 s past its last line] → the same limit narrated tasks have today. Accepted.

## Test with the owner, 2026-11-22

Run on the laptop speakers, with the built-in microphone, in a live session.

Decided by the test:

1. **Model: `small`.** A nine-second Ukrainian question came out with every word right; English questions were right except one short phrase ("delete the file again" heard as "I'm really defiled again"), which the confirmation ritual caught. Recognition takes 3.0 to 3.8 s for phrases of 3 to 9 s. `large-v3` was not tried: it would be several times slower and `small` was enough.
2. **End-of-phrase silence: 1.2 s**, kept. The owner did not report being cut off. An event reaches the session about 4.4 s after the last word (1.2 s of silence and about 3.2 s of recognition).
3. **Tail after computer sound: 0.5 s**, kept. None of the Adjutant's lines and no part of a played video reached the session after the first fix below.
4. **A stop in the abort window on speakers** was lost at first: the owner said "wait" over the launch line, and the gate dropped it with the Adjutant's voice. Now, while a window is open, a phrase that overlaps computer sound is still recognised and any stop word in it counts; the window opens when the launch line starts. Retested: "Wait" said over "Nuclear launch…" was heard and the deletion did not run. The session also checks for a stop once more immediately before the irreversible command; in the first attempt that check alone saved the file.
5. **The delivery of the two nuclear lines: after the game, made with a vocoder.** Each line is spoken once by the project's voice, taken apart with the WORLD vocoder, given the melody, loudness and pause of the Adjutant's delivery in StarCraft, and put together again (`scripts/shape-line.py`, which needs `pyworld`). No word changes speed and the voice keeps its colour. The results are kept in `src/node/lines/` and the speaker uses them in place of a fresh rendering (`PREPARED_LINES` in `src/node/speak.ts`); the effect is applied as usual. Only numbers come from the game recording; no game audio is in the result. "Nuclear launch, detected.": "nuclear" level, a rise on "launch", "de-" at the top, "-tec-ted" stepping down, and the game's short pause of about 0.1 s. The owner kept this version on 2026-11-23 ("almost as I want").

   Tried and rejected by the owner, in order: two narration lines (pause far too long); moving the pitch by reading parts of the phrase faster or slower (distorts the words); "Nuclear launch?" as a question to get a rise (it is not a question); the vocoder version 12% slower; the same with a pause of a quarter of a second; a version after the owner's own recording (steeper rise, long pause); three lower and slower versions with drawn-out vowels (robotic, not calm).

   What the owner is after and no version has yet: the line in her usual composed tone, a little clearer, with a held-breath tension. The owner found that the game's delivery does not have it either. A possible next step is a reference take from a more expressive voice (a prompt for Claude Desktop voice mode was written for this), measured and applied with the same tool. The texture of a voice (breath, tension) cannot be copied this way, only pitch, timing and loudness.

Found and fixed during the test:

- **Loudness threshold.** The microphone's background level is about 2000 (of 32768), far above the fixed threshold of 350, so the first phrase never ended and ran to the length cap with the Adjutant's own line inside it. The noise floor is now the quietest tenth of the last eight seconds, measured all the time, and speech is 1.8 times that.
- **False "paused".** The Adjutant's own long answer was counted as other computer sound. It no longer is.
- **`Monitor` lasts thirty minutes at most.** So the listener runs detached and writes its events to a file; `voice.sh follow` delivers what has not been delivered yet, and the session starts it again when it expires. This replaces "the skill starts it under `Monitor`" in decision 1.

Tested on 2026-11-23:

- **Notification from another session, on speakers:** the line was dropped as computer sound; no `HEARD` event. (The line was played from the same session through the same speaker path, not from a second session.)
- **Headphones:** the listener switched to "gate open"; speech over the Adjutant's line was heard.
- **Stop during an edit of several files:** a spoken "stop" halted the loop before file 4 of 10, via `voice.sh stop-requested` between steps.
- **Switching on from a second session:** `voice.sh start` from another shell ended the first listener; the first Monitor reported `ENDED`.
- **Stopping from another session:** `voice.sh stop` from another shell ended the listener and its `parec`; the Monitor reported `ENDED`.
- **Re-arm:** with a 60-second Monitor, a phrase said after it expired was delivered once a new `voice.sh follow` started. The real thirty-minute expiry was not waited out; the mechanism is the same.
- **Not exercised:** the typed `/adjutant-offline` command itself (its steps are `voice.sh stop`, `TaskStop`, one spoken line, each tested above).

## Open Questions

1. Can the held-breath delivery of the launch line be reached with a reference take from a more expressive voice?
2. Is 4.4 s from the last word to the event acceptable, or should recognition be made faster (a smaller beam, no separate language pass) at some cost in accuracy?
3. Every answer opens with the double beep, because each is a new narration. Keep it, or use the short blip after the first answer?
