## Context

Every speaker process plays through `playFile` in `src/node/speak.ts`, which holds a shared lock file (`~/.cache/adjutant-voice/playing.lock`) while its player runs. A reading (`read-aloud.sh`) calls the speaker once per paragraph; a notification from the VS Code extension calls it once per message. All callers are equal, so a notification waits for the paragraph in progress and then competes with the next paragraph.

No model is present when a notification arrives: the reading is a shell script and the speaker is a Node program. Whatever the reading says on its return must be decided by fixed rules from data prepared when the reading was written.

The owner's decisions (2026-11-19): the reading behaves "as if a person was interrupted", choosing whether to repeat the last sentence and whether to say something like "where was I, oh yes …" or "continuing with <subject>"; the reading's own turn notification is silenced; "Priority alert!" only for failures and questions, "Увага!" for Ukrainian.

## Goals / Non-Goals

**Goals:**
- A notification is heard within about a quarter of a second of being ready, whatever a reading is doing.
- After the notification the listener is led back into the reading without losing a sentence.
- The reading script and the extension stay thin; the behaviour lives in the speaker.

**Non-Goals:**
- Interrupting one notification with another.
- Interrupting audio that does not come from the speaker (music, video).
- Any change in the browser page or the Firefox extension.
- A model call at the moment of interruption.

## Decisions

**1. Priority is a request file beside the lock.** A priority caller writes `~/.cache/adjutant-voice/priority/<pid>` before it asks for the lock. A process that holds the lock checks that folder in its existing 120 ms loop; if a live request exists and the holder is not itself a priority caller, it stops its player and gives up the lock. An ordinary caller does not take the lock while a live request exists. A priority caller removes its request when it has finished. Requests whose process is dead are cleared, as the lock already is.
*Alternative considered:* signalling the holder's process directly. Rejected because the requester would have to know who holds the lock and what kind of caller it is; a file works with any number of windows and sessions.

**2. The speaker knows where each sentence ends.** The engine already synthesises sentence by sentence. When it prepares a paragraph it also writes the end time of each sentence beside the cached audio. On an interruption the speaker compares the time played with those marks. No gaps are added between sentences and the cache keeps working.
*Alternative considered:* one speaker call per sentence from the script. Rejected because it adds a pause and a tone at every sentence and loses the paragraph's shared echo tail.

**3. The return rule is fixed.** With `t` the moment of the cut:

| Where the cut fell | What the reading does |
|---|---|
| In the first sentence, or less than 1.5 s into the paragraph | Plays the paragraph again from its start, with no remark |
| In a later sentence, with more than 1 s of it left | Says a return phrase, then plays from the start of the cut sentence |
| In a later sentence, with 1 s or less left | Says a continuing phrase, then plays from the next sentence |
| In the last second of the paragraph | Says nothing; the script goes on to the next paragraph |

Return phrases, taken in turn so they vary: "Where was I? Oh yes: <topic>.", "As I was saying about <topic>.", "Back to <topic>." Continuing phrases: "Continuing with <topic>.", "To continue with <topic>." Ukrainian: "На чому я зупинилась? А, так: <topic>.", "Повертаюсь до теми: <topic>.", "Продовжую: <topic>.", "Далі на тему: <topic>." In Ukrainian the topic always follows a colon, so it can stay in its basic form and needs no case ending. A paragraph without a topic uses forms that need none ("Where was I?", "As I was saying.", "To continue.", "На чому я зупинилась?", "Продовжую."). The language is that of the paragraph's first sentence. The phrase is synthesised while the notification is playing, and played with the short blip.

**4. The topic travels with the paragraph.** The skill writes `[topic: the countdown]` at the start of a paragraph, before any `[voice: …]` marker. The script passes it to the speaker as `--topic` and keeps it in `last-reading.txt` so a repeat still has it. A topic is two to four words that can follow "about".

**5. Playing from an offset.** To return mid-paragraph the speaker writes a temporary file that starts at the chosen sentence mark, with a 20 ms fade-in, and plays that. The players in use take whole files only.

**6. The opening words are chosen by the caller, added by the speaker.** The extension passes `--priority` for every notification and `--alert` when the message reports a failure (a task or command with a non-zero exit code) or a question (a Claude turn whose final message ends with a question mark). Permission requests are not announced by the extension today (it listens to the Stop hook only), so they are outside this change. The speaker decides before it prepares the audio whether a reading is in progress (an ordinary speaker holds the lock, or the reading script is alive between paragraphs), and asks for the speaker only when its audio is ready, so the reading is not cut during the preparation. It puts "Priority alert!" (or "Увага!" when the message has Cyrillic letters) in front only if it actually interrupted a reading and the message does not already begin with those words.

**6a. "Увага!" is called out.** The owner asked for the word to be said with its start and end stronger than its middle and a slightly longer pause after it, and approved the result. Three things produce it: the speaker writes the word with stress marks on the first and last syllables, so the voice model itself leans on them; the loudness of the word is shaped from 1.2 at both ends down to 0.8 in the middle; and 250 ms of silence is added after it. This applies wherever "Увага!" is a sentence of its own, in the command-line speaker only. The voice model lets the end of the word fall away, so the last syllable rises less than the first.

**6b. "Where WAS I?" follows the owner's recording.** The owner recorded the phrase and chose the second take; the result was approved by ear on 2026-11-19. In that take "was" is about twice as loud as "where" and "I". The voice model's dictionary says "was" in passing and stresses "I", so the phrase is given to the model as phonemes (a clause written as `[[…]]` is taken as phonemes, Piper's own convention), with "was" stressed and lengthened and "I" unstressed. The speaker then lowers "where" and "I" and raises "was" a little, at fixed shares of the phrase, which brings "was" to about 1.7 times its neighbours. The timing of the take ("where" drawn out) is not copied.

**7. The reading's own turn stays quiet.** `read-aloud.sh` writes `~/.cache/adjutant-voice/quiet/<hash of the working folder>` when it starts. Stopping: with job control each speaker process runs in a group of its own, so the script records the one in progress and `--stop` ends it by name, also while it waits for a notification to finish. The extension, on a Stop event from that folder within 30 s of the marker, removes the marker and says nothing. One marker silences one event.
*Alternative considered:* matching the session identifier. Better in principle, but the script does not reliably know it; to be revisited if two sessions in one folder turn out to matter.

## Risks / Trade-offs

- [A cut near a sentence boundary lands on the wrong side] → The 1 s margins in decision 3 make either choice sound natural.
- [The echo tail of the sentence before the offset is missing on return] → The fade-in hides the edge; check by ear.
- [The quiet marker silences a different session working in the same folder] → It expires after 30 s and covers one event only.
- [The return phrase is not ready when the notification ends] → The reading waits for it; the delay is under a second for a short phrase.
- [A stuck priority request blocks all readings] → Requests from dead processes are cleared, and a request older than two minutes is ignored.

## Open Questions

- Should a notification about a finished background reading itself be silent? Not covered here; today it is governed by the minimum-length setting.
