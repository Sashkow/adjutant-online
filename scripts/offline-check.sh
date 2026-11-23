#!/bin/bash
# Checks that the speaker works with no network, once the voice model has been downloaded.
#   offline-check.sh
# It starts the speaker in a place that has no network at all (unshare -rn, Linux), first shows
# that the network is really unreachable from there, then has a sentence that was never spoken
# before written to a sound file. Exit status 0: the speaker worked offline.
set -u
here="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
root="$(dirname "$here")"
say="$root/dist-cli/say.js"
models="${XDG_CACHE_HOME:-$HOME/.cache}/adjutant-voice/models"
english="$models/en_US-libritts_r-medium.onnx"
ukrainian="$models/uk_UA-ukrainian_tts-medium.onnx"

[ -f "$say" ] || { echo "The speaker is not built. Run: npm ci && npm run build:cli"; exit 1; }
if [ ! -f "$english" ]; then
  echo "The English voice model is not downloaded yet."
  echo "With the network on, run once:  node dist-cli/say.js \"Voice check.\""
  exit 1
fi
if ! command -v unshare >/dev/null || ! unshare -rn true 2>/dev/null; then
  echo "This system cannot cut the network for one command (unshare -rn is not available)."
  echo "Check by hand: switch the network off, then run"
  echo "  node dist-cli/say.js --no-play --out offline.wav \"This sentence was made offline.\""
  echo "and play offline.wav."
  exit 2
fi

echo "1. Is the network cut off inside the check?"
if unshare -rn node -e "fetch('https://huggingface.co', { signal: AbortSignal.timeout(5000) }).then(() => process.exit(0), () => process.exit(1))" 2>/dev/null; then
  echo "   NO: the model site could be reached. The check proves nothing; stopping."
  exit 1
fi
echo "   Yes: the model site cannot be reached from there."

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
failed=0
speak() {  # speak <label> <sentence>
  local file="$out/$1.wav"
  if unshare -rn node "$say" --no-play --out "$file" "$2" >/dev/null 2>"$out/$1.err" && [ "$(stat -c %s "$file" 2>/dev/null || echo 0)" -gt 1000 ]; then
    echo "   $1: spoken offline ($(stat -c %s "$file") bytes of sound)."
  else
    echo "   $1: FAILED."; sed 's/^/     /' "$out/$1.err" | tail -n 5
    failed=1
  fi
}

# The time makes each sentence new, so it cannot come from the cache of spoken phrases.
echo "2. Can the speaker make a new sentence with the network cut off?"
speak English "Offline check at $(date +%H) hours, $(date +%M) minutes and $(date +%S) seconds."
[ -f "$ukrainian" ] && speak Ukrainian "Перевірка без мережі о $(date +%H) годині, $(date +%M) хвилин і $(date +%S) секунд."

# Voice mode's speech recognition, if it is set up on this machine.
voice_python="${VOICE_PYTHON:-}"
[ -n "$voice_python" ] || { [ -x "$root/.venv/bin/python" ] && voice_python="$root/.venv/bin/python"; }
[ -n "$voice_python" ] || voice_python=/opt/ro/whisper/venv/bin/python
if [ -x "$voice_python" ]; then
  echo "3. Can voice mode load its speech recognition with the network cut off?"
  if unshare -rn "$voice_python" -c "from faster_whisper import WhisperModel; WhisperModel('${VOICE_MODEL:-small}', device='cpu', compute_type='int8')" >/dev/null 2>"$out/whisper.err"; then
    echo "   Yes: the recognition model loads offline."
  else
    echo "   FAILED (if voice mode was never started, its model is not downloaded yet)."; tail -n 2 "$out/whisper.err" | sed 's/^/     /'
    failed=1
  fi
fi

if [ "$failed" = 0 ]; then echo "Result: everything checked works without the network."; else echo "Result: the offline check failed."; exit 1; fi
