## Why

The Ukrainian voice marks stress from a standard (literary) dictionary, so it says "бу́деш" where the user, a Western Ukrainian speaker, says "буде́ш". The user wants the Ukrainian voice to sound like Western (Galician) speech. No usable data source exists: the Lviv Lexicon (Хобзей et al., 2009) has lost its stress marks in the scanned text and lists only base forms, and no machine-readable Western stress dictionary was found. So the Western stresses have to be written by hand, starting small and growing as the user hears wrong words.

## What Changes

- Add a table of Western stress overrides that the speaker checks before the standard dictionary.
- An entry can describe a whole set of forms of a word (a stem and endings with their stress) instead of listing each form, so "буде́ш" also covers "буде́мо" and "буде́те" in one entry.
- First entry: the present/future forms of "бути": буде́ш, буде́мо, буде́те. "бу́ду", "бу́де" and "бу́дуть" keep the standard stress.
- Later entries are added one by one as the user reports words by ear.
- A stress mark written by the author still wins over everything, as today.

## Capabilities

### New Capabilities
- `western-ukrainian-stress`: Western (Galician) stress overrides for the Ukrainian voice, written as word patterns, applied before the standard dictionary.

### Modified Capabilities
<!-- None: ukrainian-voice is not yet archived into openspec/specs, and its "Stress is marked from a dictionary" requirement still holds; the overrides are an addition. -->

## Impact

- `src/tts/uk/stress.ts`: new override table and the lookup order in `markWord`.
- `src/tts/uk/uk.test.ts`: tests for the new forms.
- Both the browser speaker and the command-line speaker used by the spell skill (`src/node/speak.ts`) pick it up, since both go through `markStress`. The CLI must be rebuilt (`npm run build:cli`) for the spell skill to hear it.
- No new dependencies, no change to the stress data file.
