#!/usr/bin/env python3
"""Renders one Adjutant-voice wav per scene and writes data.js (scenes, sentence start times) for index.html.

Sentence start times come from the speaker's marks file (spoken/<hash>.json, written beside each rendered phrase),
so each sentence's highlight appears when that sentence is heard."""
import json, pathlib, subprocess, wave

here = pathlib.Path(__file__).resolve().parent
say = here.parent.parent / "dist-cli" / "say.js"
spoken = pathlib.Path.home() / ".cache" / "adjutant-voice" / "spoken"
scenes = json.loads((here / "scenes.json").read_text())
(here / "audio").mkdir(exist_ok=True)

for old in (here / "audio").glob("*.wav"):
    old.unlink()

for i, s in enumerate(scenes):
    out = here / "audio" / f"{i + 1:02d}-{s['id']}.wav"
    text = " ".join(st["t"] for st in s["steps"])
    lead = "--double-beep" if i == 0 else "--blip"
    subprocess.run(["node", str(say), "--no-play", lead, "--out", str(out), text], check=True)
    with wave.open(str(out)) as w:
        seconds = w.getnframes() / w.getframerate()
    marks = None
    for f in sorted(spoken.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:40]:
        m = json.loads(f.read_text())
        if abs(m.get("seconds", -1) - seconds) < 0.01:
            marks = m["starts"]
            break
    n = len(s["steps"])
    if not marks or len(marks) != n:
        print(f"  {out.name}: {len(marks or [])} marks for {n} sentences; spacing them by length")
        total = sum(len(st["t"]) for st in s["steps"])
        acc, marks = 0.3, []
        for st in s["steps"]:
            marks.append(acc)
            acc += (seconds - 0.3) * len(st["t"]) / total
    for st, start in zip(s["steps"], marks):
        st["at"] = round(start, 3)
    s["seconds"] = round(seconds, 3)
    s["audio"] = f"audio/{out.name}"
    print(f"{out.name}: {s['seconds']} s, {n} sentences")

(here / "data.js").write_text("window.SCENES = " + json.dumps(scenes, ensure_ascii=False, indent=1) + ";\n")
print("total", round(sum(s["seconds"] for s in scenes), 1), "s")
