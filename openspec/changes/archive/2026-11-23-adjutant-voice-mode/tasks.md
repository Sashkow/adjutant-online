## 1. Listener

- [x] 1.1 Write the pure decisions of `scripts/voice-listen.py` (drop a phrase by overlap with computer sound and tail, choose English or Ukrainian from the probabilities, match stop words and the off phrase, reject low-confidence and invented phrases) with unit tests
- [x] 1.2 Record the microphone and the output monitor with `parec`, cut phrases by loudness, recognise with `faster-whisper`, print `HEARD [lang] text`
- [x] 1.3 Apply the gate: output monitor, `playing.lock`, tail; open on headphones, Bluetooth or a muted output (checked every few seconds)
- [x] 1.4 Print `PAUSED` after ten seconds of continuous computer sound and `RESUMED` when it ends
- [x] 1.5 Print `STOP` and touch `voice/stop-requested` for a stop word; print `OFFLINE` and exit for the off phrase
- [x] 1.6 Keep `voice/listener.pid` and `voice/busy`; a new listener ends the old one; no audio is written to disk

## 2. Helper

- [x] 2.1 `scripts/voice.sh start|stop|status`: start prints the listener's lines (for `Monitor`), stop works from any session
- [x] 2.2 `scripts/voice.sh abort-window SECONDS`: wait for the speaker to finish, then the window, then any phrase in progress; exit status says whether a stop was heard
- [x] 2.3 `scripts/voice.sh stop-requested` (check and clear) for use between the steps of a task

## 3. Skills

- [x] 3.1 `~/.claude/skills/adjutant-online/SKILL.md`: start the listener under `Monitor`, confirm aloud, how to handle `HEARD`, `STOP`, `OFFLINE`, `PAUSED`, `RESUMED`, the form of answers, the language rule, the confirmation ritual and the abort window
- [x] 3.2 `~/.claude/skills/adjutant-offline/SKILL.md`: stop the listener and confirm aloud
- [x] 3.3 Give the two nuclear lines the melody of the game's delivery (`scripts/shape-line.py`, `src/node/lines/`)

## 4. Test with the owner

- [x] 4.1 Speed and accuracy of `small` against `large-v3`, in English and Ukrainian; choose the model
- [x] 4.2 The quiet stretch that ends a phrase; set it by what feels right to the owner
- [x] 4.3 On speakers: the Adjutant's own answer and a video are not heard; the tail after sound; set the threshold and tail
- [x] 4.3a On speakers: a notification from another session is not heard
- [x] 4.4 On headphones: speaking over the Adjutant is heard
- [x] 4.5 The confirmation ritual end to end on a harmless file, including a bare "yes" and a stop in the window
- [x] 4.5a A stop during an edit of several files
- [x] 4.6 "Adjutant offline" by voice
- [x] 4.6a `/adjutant-offline` typed, switching on from a second session, and the re-arm after thirty minutes
- [x] 4.7 Write the answers to the design's open questions into `design.md`

## 5. Documentation

- [x] 5.1 README: a "Voice mode" section (what it does, the two commands, what is dropped, privacy)
