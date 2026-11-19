## Why

The voice could only speak English: Cyrillic text was read out as the names of its letters. The project owner wants to hear the Adjutant in Ukrainian, in notifications, in `/spell` readings, on the page and in the Firefox extension.

## What Changes

- A sentence with Cyrillic letters is spoken by a Ukrainian voice model; words in Latin letters inside it are spoken by the English voice. Text is never translated.
- The Ukrainian speaker ("tetiana") is shaped towards the English speaker, at the half-way setting the owner chose by ear.
- Stress is marked from a bundled dictionary before the text reaches the model, because the model's own guesses were judged worse.
- Numbers in Ukrainian sentences are spelled out in Ukrainian.
- Notifications in Ukrainian are spoken as written (the English rewording step is skipped).
- The `spell` skill reads Ukrainian messages in Ukrainian, with a first-draft table of the Adjutant's phrases in Ukrainian.

## Capabilities

### New Capabilities
- `ukrainian-speech`: speaking Ukrainian and mixed Ukrainian and English text in the Adjutant voice.

### Modified Capabilities

None.

## Impact

- New: `src/tts/uk/` (stress, numbers, language runs, voice matching), `src/tts/engines/ukrainian.ts`, `scripts/build-uk-stress.py`, `src/tts/uk/uk-stress.bin.gz` (2.8 MB, MIT-licensed data).
- Changed: `src/tts/engines/libritts.ts`, `src/node/speak.ts` (both now build the two-language engine), `vscode-extension/rephrase.js`, the `spell` skill.
- A second model download (77 MB) the first time Ukrainian is spoken. The page and the Firefox extension grow by 2.8 MB.
