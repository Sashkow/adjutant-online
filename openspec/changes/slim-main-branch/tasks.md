## 1. The full branch

- [ ] 1.1 Make sure `main` holds the latest work (merge `readme-credits` if it is to be included), then create `full` from `main` and push it
- [ ] 1.2 On `full`: change `.github/workflows/pages.yml` to trigger on pushes to `full`
- [ ] 1.3 In the repository settings, check which branches the `github-pages` environment may deploy from, and allow `full` if needed
- [ ] 1.4 Push to `full` and see one Pages deployment succeed and the page load

## 2. Find what the speaker needs

- [x] 2.1 List the packages `dist-cli/say.js` loads at run time (the externals of the `vite.cli.config.ts` build) and mark each as declared in `package.json` or installed only through another package
- [x] 2.2 List the source files reached from `src/node/say.ts` and from `vscode-extension/`, to confirm the "stays" table in the design
- [x] 2.3 Read each spec in `openspec/specs/` and decide whether it stays on `main` or moves to `full`; note any spec that covers both

## 3. Bring the skills into the repository (on `full` first)

- [x] 3.1 Copy the five skill folders from `~/.claude/skills/` into `skills/`; replace the fixed checkout path with `{{ADJUTANT_ROOT}}` in the eight files that have it; search `skills/` for `/home/` and find nothing
- [x] 3.2 Read `skills/spell/fanservice.md` and `skills/clear-speech/references/adjutant-style.md` for quoted game lines; move long quotations to `reference/` if there are more than a few
- [x] 3.3 Check what the fanservice text does when the `reference/` files are missing; keep the owner's rule if it has one, and make the spec say the same
- [x] 3.4 Write `scripts/install-skills.sh`: copy with the path written in, keep a dated copy of a skill that differs, add the `/respell` hook, `--remove`, and a report of what was done; handle a settings file that cannot be parsed
- [x] 3.5 Test the script against a temporary `CLAUDE_CONFIG_DIR`: fresh install, second run, an edited skill, a broken settings file, removal
- [x] 3.6 Point `npm run build:vscode` at `skills/clear-speech/SKILL.md`
- [ ] 3.7 Run the script on this machine from `full`; check `/spell`, `/respell`, a narrated task and `/adjutant-online`

## 4. Slim the main branch (on a working branch from `main`)

- [x] 4.1 Move `src/page/hash.ts` and its test to `src/effect/link.ts`; update the imports; run the tests
- [x] 4.2 Remove the page, the tuning page, the Firefox extension, the phone server, the live effect, the presentations, the voice-mode listener and their scripts, as listed in the proposal
- [x] 4.3 Remove `src/tts/worker.ts`, `src/tts/client.ts`, `src/tts/engines/kokoro.ts` and the Kokoro entries in `src/tts/types.ts`
- [x] 4.4 Remove the Vite configurations and `package.json` scripts for the page, the extension and the live effect; remove `.github/workflows/pages.yml`
- [x] 4.5 Remove `kokoro-js`; add the packages from 2.1 that were not declared; remove `onnxruntime-web` if nothing left imports it; update the lock file
- [x] 4.6 Remove the specs that 2.3 assigned to `full`, and tidy `.gitignore`
- [x] 4.7 Keep `skills/spell/`, `skills/respell/`, `skills/clear-speech/` and `scripts/install-skills.sh` on the working branch; remove `skills/adjutant-online/` and `skills/adjutant-offline/` (all five were committed to `main` and `full` together on 2026-11-23)
- [x] 4.8 Run `tsc --noEmit`, `npm test`, `npm run build:cli` and `npm run build:vscode`

## 5. What the reviewer reads

- [x] 5.1 Add `LICENSE` (MIT, unless the owner chooses otherwise) on `main` and on `full`
- [x] 5.2 Write `scripts/offline-check.sh`: show the network is cut, speak a sentence that includes the time into a sound file, report the result; handle a missing model and a missing `unshare`
- [x] 5.3 Rewrite the README on `main`: what it is, what it reads, where text can go, switching rewording off, install, offline check, removal, credits, and installing and removing the skills, the line about the `full` branch and the one-way merge rule
- [x] 5.4 Read the model card of the Ukrainian voice (data, licence, fine-tuning base)
- [x] 5.5 Write the licences section of the README on `main`: the table of voices (source, model licence, data and its licence, base voice), the research-only sentence for the English voice with a link, and the sentence that "Blizzard 2013" is the Blizzard Challenge and not Blizzard Entertainment; draw no legal conclusion
- [ ] 5.6 Put the same two sentences into the request to the manager

## 6. Check and publish

- [x] 6.1 In a clean copy of the working branch's files (a true clone after the commit): `npm ci`, `npm run build:cli`, `npm test`, speak a phrase in English and in Ukrainian, run `scripts/offline-check.sh`
- [x] 6.2 In the same clone: `npm audit --omit=dev` reports no high or critical finding
- [x] 6.3 Search the tree for `parec`, `voice-listen`, `listen(` and `funnel`; nothing is found outside the specs and the README line
- [ ] 6.4 Install the built VS Code extension and run the voice test command
- [x] 6.5 In the fresh clone, with a temporary `CLAUDE_CONFIG_DIR`: run `scripts/install-skills.sh`, check that three skills are installed with the clone's path and none of them mentions `/home/shivers`, then run it with `--remove`
- [ ] 6.6 Merge the working branch into `main` and push
- [ ] 6.7 Merge `main` into `full` with `git merge -s ours`; check that `full` lost no file; push
- [ ] 6.8 On this machine, put the checkout on `full` and check that `/adjutant-online` and a spoken notification still work
- [ ] 6.9 Put the new commit of `main` into the request to the manager, in place of `e719f57`

## 7. Open questions to close

- [ ] 7.1 Get the company's answer on the English voice (research-only data behind its base voice); if the answer is no, find a Piper English voice trained from scratch on openly licensed data
- [ ] 7.2 Confirm the name of the second branch (`full`) with the owner before task 1.1
