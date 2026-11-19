# Related projects

Notes on other projects that do something similar, for future reference. Found by three quick web searches on 2026-11-19; something may exist that they missed.

## Voxlert (the closest)

- Repository: https://github.com/settinghead/voxlert
- Demo video (82 seconds): https://youtu.be/5xFXGijwJuk. Not watched; it is not known which characters speak in it.

Spoken notifications for coding agents (Claude Code, Cursor, Codex, pi, OpenClaw) in the voices of game characters. Its packs include the StarCraft 1 Adjutant (`sc1-adjutant`), the StarCraft 2 Adjutant, Kerrigan, the Protoss Advisor, EVA, SHODAN and the HEV suit. A language model words each notification in the character's tone, guided by a few examples in the pack.

How it differs from this project:

| | Voxlert | Adjutant Online |
|---|---|---|
| How the voice is made | Voice cloning from a reference clip (Chatterbox or Qwen3-TTS) | A stock open voice (Piper), shaped by an effect chain; no game audio |
| Hardware | A graphics card or Apple Silicon, about 8 GB of disk | Any machine; also runs in a browser |
| Where it speaks | Agent notifications | Notifications, a web page, a Firefox read-aloud, whole replies, narrated tasks |
| Languages | Not stated | English and Ukrainian |

Details read from its files:

- `packs/sc1-adjutant/voice.wav` is the reference clip for cloning. The pack's `ref_text` lists the Adjutant's in-game alert lines, so the clip is almost certainly the original game recording. It is not a sample of Voxlert's output.
- `packs/sc1-adjutant/pack.json` sets `"echo": true`, so the room sound is added by an effect after cloning, and passes `exaggeration: 0.8` and `cfg_weight: 0.7` to Chatterbox.
- The repository holds no generated samples. To hear its output one has to run it, or run Chatterbox by hand with the pack's clip and settings (possible on a processor alone, slowly; several gigabytes to download). Not tried.

Ideas worth a look: one voice per agent session, so that the listener can tell sessions apart; an on-screen popup with each phrase.

## Sound packs with recorded lines

- peon-ping: https://github.com/PeonPing/peon-ping. Plays recorded game lines from many packs when an agent finishes. Its notes say the sound files belong to their publishers.
- claudefx: https://github.com/sametacar/claudefx. Retro game sounds for Claude Code events.
- Blizzard's own StarCraft voice pack for streamers, with a Terran Adjutant (fixed lines): https://news.blizzard.com/en-us/heroes-of-the-storm/20243512

None of these can say a new sentence.

## Cloning for mods

- A Hive Workshop thread on cloning game voices for custom campaign dialogue (ElevenLabs, uberduck.ai, tortoise-tts): https://www.hiveworkshop.com/threads/using-ai-to-create-custom-voice-lines-campaign-dialogue.347787

## Not found

- A web page where one types text and hears an Adjutant-style voice.
- A recipe for the Adjutant's effect itself; only general robot-voice tutorials for Audacity.
- An Adjutant that speaks Ukrainian, or one that narrates an agent's work as it happens.
