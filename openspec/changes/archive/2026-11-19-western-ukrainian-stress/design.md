## Context

`src/tts/uk/stress.ts` marks stress in Ukrainian text before synthesis. `markWord` looks a word up in `PREFERRED` (a small hand-written map of word form → stressed vowel index), then in the standard dictionary (`uk-stress.bin.gz`, built from lang-uk's "ukrainian-word-stress"). An acute accent already in the text is kept. Both the browser engine and the CLI speaker (`src/node/speak.ts`, used by the spell skill) go through `markStress`.

The standard dictionary has literary stress. The user wants Western (Galician) stress, beginning with "буде́ш". No data source covers it (see proposal), so entries are written by hand.

## Goals / Non-Goals

**Goals:**
- Western stress for "бути" (буде́ш, буде́мо, буде́те) in every Ukrainian sentence the voice speaks.
- Adding a new Western word should take one short entry, not one line per form.

**Non-Goals:**
- A full Western stress dictionary or rules that guess Western stress for unknown verbs.
- Western vocabulary (батяр, файний) or Western pronunciation of sounds; only stress.
- A user-facing switch (see Open Questions).

## Decisions

**1. Patterns as stem + endings.** An entry is a stem and a map of endings to the stressed vowel of the whole form, e.g. `{ stem: 'буд', forms: { 'еш': 1, 'емо': 1, 'ете': 1 } }`. At load time the entries are expanded into a plain map from word form to vowel index, so the lookup stays a single map access. *Alternative:* list each form in `PREFERRED` as is done for "зв'язок". Simpler, but six lines per verb and easy to miss a form; the stem form reads closer to how the user thinks of it ("будеш with stress on the end").

**2. A separate `WESTERN` table, checked first.** Order in `markWord`: author's mark → `WESTERN` → `PREFERRED` → dictionary. Keeping Western entries apart from `PREFERRED` (which fixes dictionary mistakes in the standard language) makes it clear which entries are a dialect choice and lets the whole table be switched off later with one condition. *Alternative:* merge into `PREFERRED`. Fewer concepts, but mixes "the dictionary is wrong" with "the user speaks differently".

**3. Always on.** The Ukrainian voice exists for this user, who speaks Western Ukrainian; there is no second listener. A single exported flag (`WESTERN_STRESS = true`) is left in the module so it can be turned off in code without a settings UI.

**4. Unknown stress of a form stays standard.** Only forms the user has confirmed go into the table (бу́ду, бу́де and бу́дуть are left out, so the dictionary keeps them).

## Risks / Trade-offs

- [Western stress varies by area] → Each form is confirmed with the user before it is added; the user confirmed every form of the present/future of "бути" one by one: бу́ду, буде́ш, бу́де, буде́мо, буде́те, бу́дуть. Entries are one-line edits if wrong.
- [A Western form can coincide with a different word] → Entries are added only for forms the user names; "буде" has no homograph with different stress in common use.
- [The spell skill uses the built CLI, so a source change is not heard until rebuilt] → The tasks include `npm run build:cli` and a spoken check through the spell skill.

## Open Questions

- ~~Exact stress of "будемо" and "будете"~~ Resolved: буде́мо, буде́те (the user's answer).
- Whether a switch is wanted later (e.g. for a listener who expects standard stress). Not built now.
