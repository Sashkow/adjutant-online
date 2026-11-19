## Decisions

1. **The two-language logic lives inside the engine.** `createBilingual` wraps the English engine and implements the same `Engine` interface, so the worker, the page, the Firefox extension and the command-line speaker needed no change beyond constructing it. English-only sentences take the old path and sound exactly as before.
2. **Language is chosen by alphabet, per sentence, then per word.** Any Cyrillic letter makes a sentence Ukrainian; inside it, tokens with Latin letters go to the English voice. Numbers and punctuation stay on the Ukrainian side. (Owner's decision: Ukrainian only when the text is already Ukrainian; English parts in the English voice.)
3. **No eSpeak for Ukrainian.** Piper's `uk_UA-ukrainian_tts-medium` model takes letters, not phonemes (lower case, NFD, acute accent as the stress mark). The English-only `phonemizer` package therefore stays as it is.
4. **Stress from a dictionary, not from a language model.** Tested: the model's unmarked guesses were judged worse by the owner; Haiku asked to mark stress misplaced marks and altered words. The lang-uk dictionary (2.8 million forms, MIT) is repacked into sorted, front-coded blocks so a browser can search it without building 2.8 million strings: 11 MB in memory, 2.8 MB compressed. About 1.3% of forms have more than one possible stress; the first is used.
5. **Voice matching before the shared effect chain.** Measured without effects, "tetiana" sits 2.8 semitones below the English speaker, with a larger voice and a darker tone. A full match and no match were both played; the owner chose half-way: +0.6 semitones of pitch, +0.8 of voice size, -1.5 dB at 500 Hz, +1 dB above 3.5 kHz, applied to each Ukrainian stretch inside the engine. The delivery and effect settings stay common to both languages.
6. **Loudness.** Ukrainian output is scaled to the English model's measured speech level (active RMS 0.13), so mixed text does not jump in volume.
7. **The Ukrainian model loads on first use**, so English-only users never download it.

## Not done, and why

- **Rewording Ukrainian notifications in the Adjutant's manner.** The rewording rules were derived from English dictation tests. Ukrainian needs its own tests first.
- **Grammatical forms of numbers** ("у двох файлах"). The speaker always uses the basic form; the `spell` skill is told to write such numbers as words.
- **Choosing between stress variants by meaning.** Would need a parser (the dictionary's own project uses a 500 MB one).
- **Less pitch movement.** "tetiana" moves her pitch over 7.8 semitones against 5.4 for the English speaker; no control exists for this yet.
