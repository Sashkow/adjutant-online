## 1. Confirm the stresses

- [x] 1.1 Ask the user where the stress falls in "будемо" and "будете": буде́мо, буде́те (second-to-last syllable), recorded in design.md

## 2. Western stress table

- [x] 2.1 Add the `WESTERN` entry type (stem + endings → stressed vowel of the whole form) and the "буд" entry to `src/tts/uk/stress.ts`
- [x] 2.2 Expand the entries into a word-form map at module load, with the `WESTERN_STRESS` flag (on)
- [x] 2.3 Look up `WESTERN` before `PREFERRED` and the dictionary in `markWord`

## 3. Tests

- [x] 3.1 Add tests in `src/tts/uk/uk.test.ts` for every scenario in the spec (буде́ш, буде́, capitalised Буде́ш, бу́ду, бу́дуть, hand-written бу́деш, all forms of the "буд" entry)
- [x] 3.2 Run the test suite and confirm the existing stress tests still pass

## 4. Hear it

- [x] 4.1 Rebuild the command-line speaker (`npm run build:cli`)
- [x] 4.2 Speak a test sentence with the spell skill ("Ти будеш там завтра? Буде дощ, я буду вдома.") and ask the user to confirm the stress by ear
