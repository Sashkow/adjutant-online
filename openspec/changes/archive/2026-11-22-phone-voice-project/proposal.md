## Why

The owner wants the Claude app on an Android phone to speak in the Adjutant voice, the way `/spell` does on the laptop. The phone runs no code of its own. Checks on 2026-11-21 and 22 showed what works:

- The app's code-execution sandbox can install packages and play a returned mp3, but Project files are only read as text, not placed on its disk, so the speaker would have to be pasted into the chat's context (about 78 KB each time) and set up in every chat. That route is kept only as a fallback.
- A custom connector (a remote MCP server) works in the Android app. A tool result of type audio is shown as a file that does not play, but an MCP App (a tool that returns an HTML view) shows an audio player in the chat that plays on a tap.

So the laptop's own speaker can serve the phone: a small MCP App server runs `say.js` on the laptop and returns a player.

## What Changes

- A small MCP server, run on the laptop and reached through a Tailscale Funnel address, with one tool that speaks given text and returns an audio player view. It runs the same speaker as the laptop (`say.js`, Piper voices, the Adjutant effect).
- A claude.ai Project, "Adjutant voice", whose instructions define two words typed in its chats:
  - `spell <text>`, or `spell` alone for the last reply: the text is made speakable and reworded by the clear-speech card, then sent to the tool.
  - `say <text>`: the text is sent to the tool exactly as written.
- The Project also holds the clear-speech card and the Ukrainian rules as text files, copied from the spell skill by a script.
- A setup guide: run the server, open the Funnel, add the custom connector, create the Project.
- No change to the laptop speaker's behaviour. Voice mode on the phone (Claude's own voice through the effect) is out of scope; it is a later change.

## Capabilities

### New Capabilities
- `phone-voice`: speaking replies in the Adjutant voice inside the Claude phone app: the `spell` and `say` words, the player returned in the reply, the connector and its setup, and what happens when the laptop is not reachable.

### Modified Capabilities
(none)

## Impact

- New: `phone/server/` (the MCP App server), `phone/instructions.md`, `phone/README.md`, a script that copies the card and the Ukrainian rules into `phone/dist/`, and a user service file for the server.
- Removed: the sandbox bundle route built earlier (`scripts/build-phone-bundle.sh` as it was, the archive and the text-file bundle). `phone/connector-probe/` is kept until the real server replaces it.
- Needs on the laptop: Node, the built `dist-cli/say.js`, and an mp3 encoder (`ffmpeg`, or the `lamejs` package if `ffmpeg` cannot be installed).
- Outside the repository: a Tailscale Funnel on the laptop (public address, protected by a secret path), a custom connector and a Project in the owner's claude.ai account.
- Security: the Funnel makes one HTTPS path reachable from the internet. The server only speaks text it is given, with a length limit, and serves nothing else.
- Licences: unchanged; the voice models are fetched from their publisher, as on the laptop.
