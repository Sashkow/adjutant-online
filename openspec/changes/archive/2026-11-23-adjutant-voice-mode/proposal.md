## Why

The owner can already talk with the Adjutant by asking a Claude Code session to "start recording and answer interactively", but that flow is improvised each time, records one question per blocking command and stops after a few seconds of silence. The owner wants a lasting voice mode that is switched on and off by a command, listens without end, and does not mistake the Adjutant's own voice or other computer sound for the owner's speech.

## What Changes

- New skill `/adjutant-online`: starts a background listener on the microphone and treats every recognised phrase as a request, answered aloud in the Adjutant voice. Listening has no silence timeout.
- New skill `/adjutant-offline`: stops the listener. A typed `stop` and the spoken phrase "Adjutant offline" do the same.
- New listener script in this repository: records the microphone, splits it into phrases, drops phrases that overlap computer sound (the Adjutant's own speech, notifications from other sessions, music, video), recognises the rest locally with the Whisper model already installed, and prints one line per phrase.
- On headphones nothing is dropped, so the owner can speak over the Adjutant.
- English and Ukrainian are detected per phrase; the answer is in the language of the phrase.
- Answers are short speech (one to three sentences); code, tables and long detail stay on screen.
- A spoken request that changes the codebase or cannot be undone goes through a spoken confirmation: "Nuclear missile ready." and a repeat of what was heard; the owner repeats part of the action; "Nuclear launch, detected."; irreversible actions then wait four seconds for a spoken "stop" or "wait"; a spoken "stop" or "wait" later halts the work at the next step.

## Capabilities

### New Capabilities
- `voice-mode`: the lasting spoken conversation with the Adjutant in a Claude Code session: switching it on and off, what is listened to and what is dropped, languages, the form of answers, and the spoken confirmation of risky actions.

### Modified Capabilities

None. The turn's own notification is kept silent with the existing marker that narrated tasks use (`task-narration`), with no change to its requirements.

## Impact

- New: `scripts/voice-listen.py` (listener), `scripts/voice.sh` (start, stop, status, abort window), tests for the listener's decisions.
- New skills outside the repository: `~/.claude/skills/adjutant-online/`, `~/.claude/skills/adjutant-offline/`.
- Uses what is installed: `faster-whisper` in `/opt/ro/whisper/venv`, PulseAudio (`parec`, `pactl`), the spell skill's `narrate.sh`, and the shared `~/.cache/adjutant-voice/` directory. No new dependency.
- README: a "Voice mode" section.
- The microphone is recorded for as long as the mode is on. Audio is recognised on this machine and is not stored; only the recognised text reaches the session.
