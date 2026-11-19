# Adjutant Voice Notifications

Speaks one sentence in the Adjutant Online voice when work that took at least a minute (setting "Minimum Seconds") ends:

- a VS Code task finishes ("Task build complete after 42 seconds.");
- a terminal command finishes ("Command npm test failed with exit code 1.");
- Claude Code finishes a turn (the opening sentence of its final message).

Before a notification is spoken it is reworded by a Claude model (through Claude Code, a few seconds) so that it is easier to make out through the voice effect: short words become longer ones, abbreviations are spelled out. The rules are the `clear-speech` skill (`~/.claude/skills/clear-speech`); a copy is packaged with the extension at build time. This sends the notification text to Claude; the setting "Rephrase" turns it off, and if the call fails the original wording is spoken.

A notification in Ukrainian is spoken in Ukrainian, as written: the rewording step is skipped for it, because its rules are English.

A notification takes the speaker from a reading in progress (the `spell` skill): the reading stops at once, the notification is spoken, and the reading then comes back, repeating the sentence that was cut. If the notification reports a failure or ends with a question, it opens with "Priority alert!" ("Увага!" for Ukrainian) when it interrupts a reading. The turn that started a reading is not announced, so a reading never interrupts itself.

The speech itself is generated on this machine by the project's command-line speaker (`dist-cli/say.js`). Claude Code announcements need a Stop hook in `~/.claude/settings.json`; the command "Adjutant Voice: Install Claude Code Hook" adds it and "Remove" takes it out. Settings are under "Adjutant Voice".

Unofficial fan tool, not affiliated with the game's publisher.
