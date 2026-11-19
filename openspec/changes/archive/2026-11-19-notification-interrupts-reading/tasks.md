## 1. Priority in the speaker

- [x] 1.1 Add priority request files in `src/node/speak.ts`: write, clear, ignore dead or two-minute-old requests
- [x] 1.2 Make an ordinary lock holder stop its player and give up the lock when a request appears, and make ordinary callers wait while one exists
- [x] 1.3 Add `--priority` to `src/node/say.ts`; report from `playFile` whether a reading was interrupted
- [x] 1.4 Tests for the lock rules (ordinary waits, priority cuts in, dead request cleared)

## 2. Returning to the reading

- [x] 2.1 Save the end time of each sentence beside the cached audio of a paragraph
- [x] 2.2 Implement the return rule (start again, return phrase and repeat, continuing phrase and next sentence, nothing) as a pure function with tests for each row of the design table
- [x] 2.3 Play from a sentence mark: temporary file from the offset with a 20 ms fade-in
- [x] 2.4 Return and continuing phrases in English and Ukrainian, taken in turn, with and without a topic; add `--topic` to `say.ts`
- [x] 2.5 Prepare the phrase while the notification plays and speak it with the short blip

## 3. Reading script and skill

- [x] 3.1 `read-aloud.sh`: read `[topic: …]` before `[voice: …]`, pass it on, keep it in `last-reading.txt`
- [x] 3.2 `read-aloud.sh`: write the quiet marker for the working folder at the start
- [x] 3.3 Check that `--stop` ends a reading that is waiting on a notification
- [x] 3.4 `spell` skill: how to write a topic for each paragraph (two to four words that can follow "about")

## 4. VS Code extension

- [x] 4.1 Pass `--priority` for every notification
- [x] 4.2 Decide the kind in `messages.js` (failure, question, other) and pass `--alert` for the first two; tests
- [x] 4.3 Speaker: add "Priority alert!" or "Увага!" only when a reading was interrupted and the message does not already open with it
- [x] 4.4 Skip the Stop event that matches a fresh quiet marker and remove the marker; tests
- [x] 4.5 Raise the extension version, build and install it

## 5. Check by ear

- [x] 5.1 Build the speaker and run a four-paragraph reading with a notification sent at each of the four cut positions
- [x] 5.2 The same with a Ukrainian reading and a Ukrainian failure message
- [x] 5.3 Owner's verdict on the return phrases and on the edge where the reading comes back
- [x] 5.4 Update `README.md` and `vscode-extension/README.md`
