#!/usr/bin/env python3
"""
Gives a line spoken by the project's voice the melody, loudness and pause of a reference delivery,
and writes the result to src/node/lines/, where the speaker (src/node/speak.ts, PREPARED_LINES) uses
it in place of a fresh rendering.

The voice model cannot be told how to intone a phrase, and reading parts of it faster or slower to
move the pitch distorts the words. So the line is taken apart with the WORLD vocoder into pitch,
voice colour and breath; only the pitch is replaced; and it is put together again. No word changes
speed and the voice keeps its colour.

Each line below has:
  text    what the voice says (rendered once, with no effect, through ADJUTANT_RAW_DIR)
  melody  [time in the plain rendering in seconds, pitch as a share of the voice's base pitch]
  gain    [time, loudness factor]
  pause   [time, seconds of silence to add there]
  slow    how many times longer than the plain rendering the line lasts (1 if absent)
  tempo   [time, how many times longer that moment lasts], to draw out single syllables
  base    the base pitch of this line as a share of the voice's (1 if absent)
The times are the syllables of the plain rendering, read from its loudness and pitch (run with
--chart to print them). The melody and loudness were measured on a reference delivery:
the Adjutant's own delivery in StarCraft (a recording kept outside the repository). Only the numbers
come from it; every sound in the result is the project's voice.

Needs: pip install pyworld soundfile numpy.   Run: scripts/shape-line.py [--chart] [name ...]
"""
import os
import subprocess
import sys
import tempfile
import time

import numpy as np
import pyworld as pw
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'node', 'lines')
BASE_PITCH = 250.0  # Hz, before the effect: the middle of this voice's own range

LINES = {
    # "Nu" rises into "clear"; "miss" on the high level; "-ile" and "rea-" a step down; "-dy" lower still.
    'nuclear-missile-ready': {
        'text': 'Nuclear missile ready.',
        'melody': [[0.08, 0.84], [0.24, 0.98], [0.36, 1.06], [0.52, 1.04], [0.54, 1.0], [0.66, 0.99], [0.78, 0.83],
                   [0.90, 0.81], [0.96, 0.84], [1.10, 0.86], [1.12, 0.72], [1.30, 0.67]],
        'gain': [[0.0, 0.6], [0.26, 0.6], [0.34, 0.5], [0.50, 0.5], [0.54, 1.0], [0.70, 1.0], [0.78, 1.1], [0.92, 1.1],
                 [0.96, 1.25], [1.10, 1.25], [1.14, 1.5], [1.5, 1.5]],
        'pause': [],
    },
    # game: "nuclear" level; "launch" rises; "de-" at the top; "-tec-ted" steps down. The game has hardly any pause.
    'nuclear-launch-detected': {
        'text': 'Nuclear launch detected.',
        'melody': [[0.08, 1.0], [0.22, 1.0], [0.34, 1.02], [0.50, 0.95], [0.52, 0.94], [0.70, 1.15], [0.88, 1.18],
                   [0.94, 1.15], [1.08, 1.0], [1.20, 0.95], [1.32, 0.83], [1.48, 0.8]],
        'gain': [[0.0, 1.1], [0.26, 1.1], [0.34, 1.0], [0.50, 1.0], [0.54, 0.85], [0.82, 0.85], [0.88, 1.0], [1.24, 1.0],
                 [1.32, 2.2], [1.7, 2.2]],
        # The game's own short pause and the voice's own pace: the version the owner kept (2026-11-23).
        # Tried with the owner and taken back: a 12% slower pace; a pause of a quarter of a second; the
        # steeper rise and long pause of the owner's own recording; and three lower, slower "grave"
        # versions with drawn-out vowels, which sounded robotic, not calm.
        'pause': [[0.84, 0.06]],
    },
}


def plain(text):
    """The line as the voice says it by itself, before the effect."""
    with tempfile.TemporaryDirectory() as d:
        env = dict(os.environ, ADJUTANT_RAW_DIR=d)
        # A second sentence keeps this rendering out of the speaker's store of finished lines.
        subprocess.run(['node', os.path.join(ROOT, 'dist-cli', 'say.js'), '--no-play', '--out', os.path.join(d, 'x.wav'),
                        f'{text} Shaping {os.getpid()} {time.time_ns()}.'], env=env, check=True, capture_output=True)
        x, fs = sf.read(os.path.join(d, 'raw-0.wav'))
    return x.astype(np.float64), fs


def curve(points, t):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def chart(x, fs, f0):
    hop = int(fs * 0.04)
    for i in range(0, len(x) - hop, hop):
        level = np.sqrt((x[i:i + hop] ** 2).mean())
        k = int(i / fs / 0.005)
        voiced = f0[k:k + 8][f0[k:k + 8] > 0]
        print(f'{i / fs:5.2f} {"#" * int(30 * level / 0.25):30s} {int(np.median(voiced)) if len(voiced) else ""}')


def shape(name, show):
    line = LINES[name]
    x, fs = plain(line['text'])
    f0, t = pw.harvest(x, fs, frame_period=5.0)
    f0 = pw.stonemask(x, f0, t, fs)
    if show:
        print(f'== {name}: the plain rendering')
        chart(x, fs, f0)
    colour = pw.cheaptrick(x, f0, t, fs)
    breath = pw.d4c(x, f0, t, fs)
    melody = np.where(f0 > 0, BASE_PITCH * curve(line['melody'], t), 0.0)
    # Slower or faster: the same frames spread over more or less time. The pitch does not move with it.
    # 'tempo' says how many times longer each moment lasts, so single syllables can be drawn out.
    stretch = curve(line['tempo'], t) if 'tempo' in line else np.full(len(t), line.get('slow', 1.0))
    ends = np.cumsum(stretch)                                  # where each frame ends in the new timing, in frames
    frames = np.clip(np.searchsorted(ends, np.arange(int(ends[-1])) + 0.5), 0, len(t) - 1)
    new_time = lambda at: float(np.interp(at, t, ends - stretch) * 0.005)   # a moment of the plain rendering, in the new timing
    melody = melody * line.get('base', 1.0)
    y = pw.synthesize(melody[frames], colour[frames], breath[frames], fs, frame_period=5.0)
    y = y * curve(line['gain'], t[frames[np.minimum(np.arange(len(y)) * len(frames) // len(y), len(frames) - 1)]])
    for at, seconds in sorted(([new_time(a), b] for a, b in line['pause']), reverse=True):
        # Cut at the quietest point near the mark, so no sound is split.
        a, b = int((at - 0.04) * fs), int((at + 0.04) * fs)
        win = int(0.01 * fs)
        levels = [np.abs(y[i:i + win]).mean() for i in range(a, b, win)]
        cut = a + int(np.argmin(levels)) * win + win // 2
        y = np.concatenate([y[:cut], np.zeros(int(seconds * fs)), y[cut:]])
    y = y / max(1e-9, np.abs(y).max()) * 0.9
    if show:
        print(f'== {name}: shaped')
        f1, t1 = pw.harvest(y, fs, frame_period=5.0)
        chart(y, fs, f1)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.wav')
    sf.write(path, y.astype(np.float32), fs, subtype='PCM_16')
    print(f'wrote {os.path.relpath(path, ROOT)} ({len(y) / fs:.2f} s)')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--chart']
    for name in args or LINES:
        shape(name, '--chart' in sys.argv)
