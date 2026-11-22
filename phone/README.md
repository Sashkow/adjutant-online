# Adjutant voice on the phone

The Claude app on Android cannot run the speaker, but a custom connector can reach the laptop's. A small MCP App server on the laptop runs `say.js` and returns an audio player into the chat. A claude.ai Project, "Adjutant voice", holds the instructions for two words: `say <text>` (spoken exactly) and `spell <text>` (reworded for the ear by the clear-speech card, then spoken). You tap Play on the player; there is no autoplay.

The laptop must be on, awake and online, with the Funnel running.

## Set up (once)

1. Build the speaker and install the server's packages:
   ```
   npm run build:cli
   (cd phone/server && npm install)
   ```
   `ffmpeg` must be installed (`sudo apt install ffmpeg`), and the voice models cached by one run of `dist-cli/say.js` on the laptop.
2. Start the server as a user service, set `PUBLIC_URL` in the unit to your Funnel address first:
   ```
   cp phone/adjutant-phone.service ~/.config/systemd/user/ && systemctl --user daemon-reload
   systemctl --user enable --now adjutant-phone
   journalctl --user -u adjutant-phone -n 3
   ```
   The log prints the connector address. Its last part is a secret, made on the first start and kept in `~/.config/adjutant-phone/secret`, outside the repository. Do not share it or commit it.
3. Open the Funnel to the server's port (the owner must have allowed Funnel in the Tailscale admin page, and run `sudo tailscale set --operator=$USER` once):
   ```
   tailscale funnel --bg 8787
   ```
4. Add the connector in claude.ai: open Plugins (Customize), then Add, then Add custom connector. Enter a name ("Adjutant"), the connector address from step 2, Continue, Authentication: No sign-in, Add. The connector cannot be edited; to change the address, remove it and add it again. It appears in the phone app by itself.
5. Build the Project files and set up the Project:
   ```
   scripts/build-phone-project.sh
   ```
   In claude.ai create a Project named "Adjutant voice". Upload `phone/dist/clear-speech-card.md` and `phone/dist/ukrainian.md` with Add files. Paste the whole of `phone/dist/instructions.md` into the Project's instructions. Open a new chat in the Project and make sure the Adjutant connector is on for it.

## Use

In a chat in the Project:

- `say Task complete.` and `say Збірку завершено.`: spoken word for word.
- `spell Task lint failed with exit code 9.`: expected wording "Priority alert! Code check task failed. Exit code number nine."
- `spell` alone: reads your previous reply.

Tap Play on the player. The first reply after the laptop starts may take a few seconds longer while the voice model loads.

## Stop it

```
tailscale funnel --https=443 off
systemctl --user disable --now adjutant-phone
```

Rollback: remove the connector and delete the Project in claude.ai.

## If it does not speak

- "The speaker could not be reached": the laptop is off or asleep, the service is not running (`systemctl --user status adjutant-phone`), or the Funnel is off (`tailscale funnel status`).
- The connector's tools are not listed: remove it and add it again after a restart that changed its address.
- A player shows but nothing plays: tap Play; some phones need the screen on. The reply's wording is also on screen.
- An error with a message about the text: the limit is 1800 characters (about two minutes).

## Tests

```
cd phone/server && npm test
```

`server.test.js` starts the real server and speaks English and Ukrainian, so it needs `dist-cli/say.js`, the cached models and `ffmpeg`.
