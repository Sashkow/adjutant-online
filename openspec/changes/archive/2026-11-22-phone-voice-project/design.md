## Context

On the laptop, `/spell` rewords a reply and `say.js` speaks it on the speakers. The owner wants the same in the Claude app on an Android phone, inside the app, with no web pages. The app runs no code on the phone; Claude's own code runs in Anthropic's sandbox, and a custom connector reaches a server of the owner's.

Checks in the app (the owner's "Adjutant phone checks" doc and the probe in `phone/connector-probe/`):

| Check | Result |
|---|---|
| npm from the code-execution sandbox | works |
| Hugging Face from the sandbox | refused (403) until the owner allows the domain |
| Project files in the sandbox | not on disk: Claude reads them as text only (2026-11-21) |
| wav and mp3 returned as files from the sandbox | both play inside the app |
| Custom skills in the Android app | not offered |
| Custom connector by URL (Funnel, no sign-in) | works; the tools are listed |
| Tool result of type audio, or an embedded resource | shown as a file that does not play |
| Tool result with a link | stays a link |
| MCP App tool: `<audio controls>` with the mp3 as a data URI, or fetched from the server's URL | player in the chat, plays on a tap, no autoplay (2026-11-22) |

## Goals / Non-Goals

**Goals:**
- `spell` and `say` in a chat in one claude.ai Project; a player in the reply; the same voice as the laptop.
- Nothing installed or downloaded in the app's sandbox, and no speaker code in the chat's context.
- A setup the owner does once.

**Non-Goals:**
- Voice mode on the phone (Claude's own voice through the effect; JamesDSP route). A later change.
- Automatic reading of every reply, and autoplay: a tap on Play is needed.
- Narrated tasks, notifications, interruption and the play lock: the phone has one reply at a time.
- Fanservice mode on the phone (can follow later; the reference lines stay off the network by project rule).
- A hosted server that does not depend on the laptop (can follow later; see Decision 6).

## Decisions

1. **A custom connector with an MCP App, not the code-execution sandbox.** The probe showed that only an MCP App's player plays in the app; plain audio results do not. The laptop already has Node, the voice models in a cache and the stress dictionary, so nothing is downloaded at the first reply. The sandbox route needs 78 KB of code pasted into every chat, a checksum, `npm install`, `libasound2`, `pip` and a model download in each new sandbox. Kept only as a fallback; it stays described in the git history.

2. **One tool, `speak(text)`.** `say` and `spell` differ in how the text is made, which Claude does by the Project's instructions (the card and the Ukrainian rules are Project files); the tool only speaks the text it is given. Alternative: two tools. Rejected as the same code twice.

3. **The server runs the laptop's speaker.** For each call: `node dist-cli/say.js --no-play --out <file>.wav "<text>"`, then an mp3 step, so the voice, the Ukrainian handling and the fixes stay in one place. The server holds no model itself; `say.js` keeps its own cache. The mp3 step uses `ffmpeg` if it is installed, otherwise the `lamejs` package (no root needed). A wav is too big for a data URI on long texts.

4. **The player gets the sound by address, with a data-URI fallback.** The tool result carries `structuredContent: { url }`; the view reads it (MCP Apps client script from the CDN allowed in the view's content rules) and sets the `<audio>` source. The server serves `/<secret>/a/<random>.mp3` and deletes files after a short time. `resourceDomains` names the Funnel host. If the address fails in a view, the result carries the mp3 as base64 instead.

5. **Reached through a Tailscale Funnel, protected by a secret path.** The probe works this way with "No sign-in". The server listens on 127.0.0.1 only; the Funnel proxies one port; unknown paths answer 404. Later hardening: a request header with a key (in beta on the owner's plan) or OAuth. The text length is limited (about two minutes of speech).

6. **Run as a user service on the laptop; hosted server later.** `systemd --user` starts the server at login. If the owner wants the voice when the laptop is off, the same server can move to a VPS with `say.js` and the models; that is a later change.

7. **The instructions carry the rules; the tool carries none.** The Project instructions define the two words, the speakable-text steps (from `core.md` step 1), the card and the Ukrainian rules (Project files copied from the skill by a script so the phone and the laptop do not drift), and what to say when the tool fails.

8. **The reply shows the spoken wording for `spell`.** On the laptop the text is heard while the original is on screen; on the phone the owner may want to read what was said, and it helps report mishearings.

## Risks / Trade-offs

- [The laptop must be on, awake and online] → say so in the guide; the failure reply says the speaker could not be reached. A VPS later (Decision 6).
- [A public address reaches the laptop] → secret path, a single port, 127.0.0.1 only, length limit, no other routes; the owner can stop it with one command (`tailscale funnel --https=443 off`). Header or OAuth later.
- [Tailscale Funnel or the connector's address may change] → the guide lists where each is set; the connector cannot be edited, so it is removed and added again.
- [The player may not load a sound by address in some views] → data-URI fallback (Decision 4).
- [No autoplay] → one tap per reply; accepted.
- [The mp3 step] → `ffmpeg`, else `lamejs`; checked in task 2.1.
- [The Project's instructions are followed by the model, not enforced] → keep them short, with exact tool use; test both words with English and Ukrainian.
- [The owner's claude.ai settings are outside the repository] → the setup guide lists them; the connector address contains a secret and is not committed.

## Findings from earlier runs

- The sandbox route worked in a clean container (2026-11-21): `say.js` needs `onnxruntime-node` (install with `--onnxruntime-node-install-cuda=skip`) and the system library `libasound.so.2`, and the stress dictionary can be built from PyPI. It was set aside because Project files cannot be read from the sandbox's disk.
- Without `uk-stress.bin.gz`, `say.js` still speaks Ukrainian, with the model's own guess at the stress.
- Connector probe (2026-11-22): see the table in Context.

## Trial in the app (2026-11-22)

The owner set up the connector and the Project from `phone/README.md` and reported that it works on the phone. Waits on the first and later replies, and the reply when the laptop is off, were not measured.

## Migration Plan

Nothing to migrate. Setup: build `say.js`, start the server, start the Funnel, add the connector, create the Project with the instructions and the two rule files, run the test phrases. Rollback: stop the Funnel and the service, delete the connector and the Project.

## Open Questions

- Does the player load a sound by address when the view is opened from `structuredContent`? (task 2.3; the probe tested a fixed address)
- How long does the first reply take, and a later one, on the laptop? (task 4.4)
- Is the request-header key available on the owner's plan, so the secret path can be replaced? (later)
