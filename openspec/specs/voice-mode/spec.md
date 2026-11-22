# voice-mode Specification

## Purpose
A lasting spoken conversation in a Claude Code session: the microphone is listened to, each phrase is a request, and answers are spoken in the Adjutant voice. Created by archiving change adjutant-voice-mode.
## Requirements
### Requirement: Voice mode is switched on and off by command
The command `/adjutant-online` SHALL start listening to the microphone, and listening SHALL continue with no silence timeout until it is switched off. The command `/adjutant-offline`, a typed "stop", and the spoken phrase "Adjutant offline" SHALL each switch it off. Switching on and off SHALL each be confirmed with one short spoken line.

#### Scenario: Long silence
- **WHEN** voice mode is on and nobody speaks for ten minutes
- **THEN** the next spoken phrase is still heard and answered

#### Scenario: Switched off by command
- **WHEN** the owner types `/adjutant-offline`
- **THEN** the microphone is no longer recorded and a later spoken phrase gets no answer

#### Scenario: Switched off by voice
- **WHEN** the owner says "Adjutant offline"
- **THEN** listening ends and one spoken line confirms it

#### Scenario: Switched off from another session
- **WHEN** voice mode was started in one session and `/adjutant-offline` is typed in another
- **THEN** listening ends

#### Scenario: Switched on twice
- **WHEN** `/adjutant-online` is typed in a second session while the first still listens
- **THEN** the second session listens and the first no longer receives phrases

### Requirement: Every recognised phrase is a request
While voice mode is on, each phrase the owner speaks SHALL reach the session as a request and SHALL be handled as a typed message with the same text would be. No wake word SHALL be needed.

#### Scenario: A spoken question
- **WHEN** the owner says "What branch am I on?"
- **THEN** the session answers the question aloud

#### Scenario: Noise that is not speech
- **WHEN** the microphone picks up a cough or keyboard noise
- **THEN** no request reaches the session

### Requirement: Computer sound is not taken for the owner's speech
On speakers, a phrase recorded while the computer was playing sound SHALL be dropped. This SHALL hold for the Adjutant's own speech, for notifications from other sessions and for any other program's sound. The phrase SHALL also be dropped when it began within a short time after the sound ended.

#### Scenario: The Adjutant's own answer
- **WHEN** the Adjutant speaks an answer through the speakers
- **THEN** no part of that answer reaches the session as a request

#### Scenario: A notification from another session
- **WHEN** another session's spoken notification plays while voice mode is on
- **THEN** it does not reach the session as a request

#### Scenario: A video is playing
- **WHEN** a video with speech plays through the speakers
- **THEN** the speech in it does not reach the session as a request

#### Scenario: The owner speaks after the Adjutant has finished
- **WHEN** the owner starts to speak one second after the Adjutant falls silent
- **THEN** the whole phrase is heard

### Requirement: Long computer sound is reported on screen only
When computer sound has kept listening shut for ten seconds without a break, the session SHALL be told once that listening is paused, and once when it has resumed. Neither SHALL be spoken.

#### Scenario: Music starts
- **WHEN** music has played through the speakers for ten seconds
- **THEN** one line on screen says listening is paused, and nothing is spoken

#### Scenario: Music stops
- **WHEN** the music stops
- **THEN** one line on screen says listening has resumed

### Requirement: Headphones leave the microphone open
When the sound output is headphones, a headset or a Bluetooth device, or the output is muted, no phrase SHALL be dropped because of computer sound.

#### Scenario: Speaking over the Adjutant on headphones
- **WHEN** the output is headphones and the owner speaks while the Adjutant is speaking
- **THEN** the owner's phrase reaches the session

#### Scenario: Headphones unplugged
- **WHEN** the headphones are unplugged while voice mode is on
- **THEN** within five seconds phrases that overlap computer sound are dropped again

### Requirement: English and Ukrainian are recognised
Each phrase SHALL be recognised as English or as Ukrainian, whichever is likelier, and never as another language. The answer SHALL be in the language of the phrase. Ukrainian answers SHALL be spoken in Ukrainian.

#### Scenario: A Ukrainian question
- **WHEN** the owner asks a question in Ukrainian
- **THEN** the answer is spoken in Ukrainian

#### Scenario: A short Ukrainian phrase
- **WHEN** the owner says two Ukrainian words that are also close to Russian
- **THEN** the phrase is recognised in Ukrainian

### Requirement: Answers are short speech with detail on screen
A spoken answer SHALL be one to three sentences in the Adjutant manner. Code, tables, paths and long explanations SHALL be shown on screen and not read aloud. A task that takes long SHALL be narrated with short milestone lines. The turn that answers SHALL NOT also be announced by the notifier.

#### Scenario: A question with a long answer
- **WHEN** the owner asks how a module works
- **THEN** up to three sentences are spoken and the full explanation is on screen

#### Scenario: The answering turn ends
- **WHEN** the session finishes a spoken answer
- **THEN** no "Message from…" notification follows it

### Requirement: Risky spoken requests are confirmed aloud
Before a spoken request changes the codebase or does something that cannot be undone, the Adjutant SHALL say "Nuclear missile ready.", repeat what the request was understood to be, and ask for confirmation. The request SHALL go ahead only if the owner's reply repeats at least part of the action; a bare "yes" SHALL NOT be enough. On acceptance the Adjutant SHALL say "Nuclear launch, detected.", and both nuclear lines SHALL be spoken with the melody of the Adjutant's delivery in StarCraft: in the launch line the pitch rises through "launch", is highest on the first syllable of "detected" and steps down to the end.

#### Scenario: Confirmation that repeats the action
- **WHEN** the Adjutant asks to confirm deleting the build folder and the owner says "yes, delete the build folder"
- **THEN** "Nuclear launch, detected." is spoken and the folder is deleted

#### Scenario: The launch line's melody
- **WHEN** "Nuclear launch, detected." is spoken
- **THEN** the pitch at the end of "launch" is higher than on "nuclear", and the last syllable of "detected" is the lowest of the line

#### Scenario: A bare yes
- **WHEN** the owner answers only "yes"
- **THEN** nothing is changed and the Adjutant asks the owner to say what is to be done

#### Scenario: A refusal
- **WHEN** the owner answers "no" or something unrelated to the action
- **THEN** nothing is changed and the Adjutant says the action is cancelled

#### Scenario: A question that changes nothing
- **WHEN** the owner asks what the last commit was
- **THEN** it is answered with no confirmation

### Requirement: A spoken stop halts the work
After "Nuclear launch, detected.", an action that cannot be undone (deleting, committing, pushing, sending) SHALL wait four seconds, and a phrase like "stop" or "wait" in that time SHALL cancel it before anything has changed. A file edit SHALL start at once. In either case a phrase like "stop" or "wait" heard later SHALL halt the work before its next step, and the Adjutant SHALL say what was and was not done.

#### Scenario: Stop in the window
- **WHEN** the owner confirms a push and says "wait" two seconds after "Nuclear launch, detected."
- **THEN** nothing is pushed and the Adjutant says the action is cancelled

#### Scenario: No stop in the window
- **WHEN** the owner confirms a push and stays silent
- **THEN** the push runs after four seconds

#### Scenario: Stop during an edit
- **WHEN** the owner confirms a change to three files and says "stop" after the first is edited
- **THEN** the remaining files are not edited and the Adjutant says one file was changed

### Requirement: Speech stays on the machine
The recorded sound SHALL be recognised on this machine and SHALL NOT be written to disk or sent anywhere. Only the recognised text SHALL reach the session.

#### Scenario: A phrase is recognised
- **WHEN** a phrase has been recognised
- **THEN** no audio file of it exists and no network request was made for it

### Requirement: An evening greeting on switching on
The spoken line that confirms switching on SHALL be "Adjutant online." When it is evening in Kyiv (from 18:00 to 23:59, Europe/Kyiv time, read from the clock) and the greeting has not yet been spoken that evening, the line SHALL be "Adjutant online. Good evening, Magistrate.", as she opens the first briefing of the game. No greeting SHALL be spoken at any other time of day.

#### Scenario: First switching on in the evening
- **WHEN** voice mode is switched on at 20:15 Kyiv time for the first time that evening
- **THEN** the spoken line is "Adjutant online. Good evening, Magistrate."

#### Scenario: Second switching on the same evening
- **WHEN** voice mode is switched off and on again at 21:00 the same evening
- **THEN** the spoken line is "Adjutant online."

#### Scenario: Morning
- **WHEN** voice mode is switched on at 09:00 Kyiv time
- **THEN** the spoken line is "Adjutant online." with no greeting

#### Scenario: After midnight
- **WHEN** voice mode is switched on at 00:30 Kyiv time
- **THEN** the spoken line is "Adjutant online." with no greeting

