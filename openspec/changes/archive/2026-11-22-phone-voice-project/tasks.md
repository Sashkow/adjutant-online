## 1. Checks on the phone (owner)

- [x] 1.1 Project files in the code-execution sandbox: not on disk, Claude reads them as text only (2026-11-21); the sandbox route is set aside
- [x] 1.2 Connector probe (`phone/connector-probe/`, Funnel, custom connector "AdjutantOnline"): audio and embedded-resource results show a file that does not play, a link stays a link, an MCP App player (data URI or address) plays on a tap, no autoplay (2026-11-22)

## 2. Speaker server (laptop)

- [x] 2.1 Decide the mp3 step (`ffmpeg`, installed 2026-11-22; `lamejs` not needed); confirm a wav from `say.js` becomes a playable mp3 in English and Ukrainian
- [x] 2.2 Write `phone/server/`: an MCP server (streamable HTTP, 127.0.0.1 only, secret path from an environment variable or a file outside the repository, 404 elsewhere) with the tool `speak(text)`: length limit, runs `dist-cli/say.js --no-play --out`, makes the mp3, serves `/<secret>/a/<random>.mp3` and deletes files after a short time
- [x] 2.3 Add the MCP App view: a `ui://` resource with an `<audio controls>` player that reads the address from the tool result (the data-URI fallback when it cannot); content rules allow the Funnel host and the client script's CDN
- [x] 2.4 Test locally with an MCP client: `speak` in English and Ukrainian, an over-long text, an empty text, a wrong path (404); unit tests for the length limit and the cleanup
- [x] 2.5 Run it as a user service (`systemd --user`) that starts at login, with the Funnel on its port; write the unit file into `phone/`
- [x] 2.6 Remove the sandbox route files (`scripts/build-phone-bundle.sh`, the old `phone/dist/` contents) and, now that the real server works, `phone/connector-probe/`

## 3. Project instructions and files

- [x] 3.1 Rewrite `phone/instructions.md`: the `say` and `spell` words, the speakable-text steps, when to call `speak`, show the spoken wording for `spell`, the failure messages, the length limit
- [x] 3.2 A script (`scripts/build-phone-project.sh`) copies `clear-speech-card.md` and `ukrainian.md` from the spell skill into `phone/dist/` and the instructions beside them, so the phone uses the laptop's rules
- [x] 3.3 Rewrite `phone/README.md`: the setup guide (start the server, the Funnel, add the custom connector without sign-in, create the Project, upload the two files, paste the instructions), the test phrases, and the one-line stop command

## 4. Trial in the app (owner)

- [x] 4.1 Add the connector with the real server's address and check that `speak` is listed
- [x] 4.2 Set up the "Adjutant voice" Project from `phone/dist/` by the guide
- [x] 4.3 `say Task complete.` and `say Збірку завершено.`: the player appears, plays on a tap, the voice matches the laptop
- [x] 4.4 `spell` with an English sentence and with the last reply; record the wait for the first and a later reply; laptop off: the reply says so (owner reported it works; waits and the laptop-off case not measured)
- [x] 4.5 Owner's verdict; record findings in the design

## 5. Documentation

- [x] 5.1 README: a section on the phone voice, pointing to `phone/README.md`
- [x] 5.2 README and guide: the Funnel's public address, the secret path, how to stop it, and the laptop-must-be-on note; update the section from 5.1 to the connector route
