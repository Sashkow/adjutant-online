# What the listener can and cannot hear

The evidence behind the rules in SKILL.md. Read this when revising the rules or when the user reports what they actually heard; it is not needed for rewording a sentence.

The Adjutant voice runs speech through a metallic doubling, an echo and a small metal room. The effect is the point, but it blurs some sounds.

These rules come from dictation tests with the project owner on 2026-11-13: fourteen sentences, typed back after one hearing, six of them as an original and a reworded pair. They are a small sample, so treat them as strong hints, and prefer what the listener tells you over what is written here.

The listener has said that some English words are unfamiliar to them. A word they do not know cannot be recognised however clearly it is spoken, so common everyday vocabulary matters as much as the sound.

Heard correctly:

- Long words with a clear rhythm: "concentration", "anxiety", "exercise", "expected", "rejected", "reverted".
- Familiar pairings where one word predicts the next: "heavy rain", "cups of flour", "exit code", "out of date".
- A number that follows a word announcing it: "forty minutes", "exit code nine".

Lost or misheard:

- Short words that carry meaning and that the rest of the sentence does not predict: "wind" became "leap", "bake" became "wait", "docs" became "dogs". The echo smears the consonants, and a one-syllable word has nothing else to identify it.
- Names: "Vienna" was not recognised at all.
- Several short facts in a row: "from platform six at noon" was lost entirely.
- Short words at the very start ("Both dead links in") and at the very end ("the backup" became "vodka").
- Words the listener does not know: "lint" became "lid". An unknown word cannot be recognised, only guessed.
- Once the listener loses the thread, the rest of the sentence is lost too. One blurred word early costs more than one blurred word late.
- Long rewordings. "Kate said that the cheap beach bag was damp, so she hung it outside to dry" (15 words) was recalled worse than its 12-word original, and the listener gave up part-way. A 19-word rewording needed two hearings. The listener has to hold the sentence in memory while working out the blurred words, so every extra word has a cost.
- Rarer words brought in by the rewording: "damp" for "wet" and "rear shelf" for "back" were both lost. The longer word only helps if the listener knows it at least as well as the short one.
- A name as the first word: "Pete" became "he", "Kate" became "kit".

What rewording did fix: "put the hot pan" was heard as "put the bag", while "placed the hot cooking pan" was heard correctly; "left at nine" and "departed at nine o'clock" were both heard. A sentence of common words that was heard well as it stood ("The bus left at nine, so we ran fast down the long hill") gained nothing from being reworded.

## Model notes

The skill runs on Haiku. Run on fourteen test sentences with the earlier, essay-style version of SKILL.md, Haiku:

- answered a sentence that read like a plan ("Two tests still fail in the parser module…") instead of rewording it;
- kept jargon it was told to replace ("lint", "npm", "cron job", "config");
- used a swap the rules named as forbidden ("wet" → "damp");
- added details ("garden shed", "left front tyre", "to dry") and changed "by ten" to "at ten o'clock".

SKILL.md is therefore written as numbered steps with fixed word lists and a final check, which Haiku follows more closely than prose.
