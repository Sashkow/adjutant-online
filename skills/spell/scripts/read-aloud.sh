#!/bin/bash
# Speaks text in the Adjutant voice, one paragraph at a time.
#   read-aloud.sh < text      paragraphs are separated by blank lines
#   read-aloud.sh --stop      stop a reading that is in progress
#   read-aloud.sh --again     repeat the latest reading, word for word
# A paragraph may open with "[topic: SUBJECT]" and then "[voice: NAME]"; neither is spoken.
# The next paragraph is prepared while the current one plays, so the pauses stay short.
# The speaker program is built in the Adjutant Online project (npm run build:cli there).
# Set ADJUTANT_VOICE_CLI to use a copy somewhere else.
root="{{ADJUTANT_ROOT}}"
say="${ADJUTANT_VOICE_CLI:-$root/dist-cli/say.js}"
pidfile="${XDG_CACHE_HOME:-$HOME/.cache}/adjutant-voice/read-aloud.pid"
last="$(dirname "$pidfile")/last-reading.txt"   # what was said, for "show me the text" and --again

if [ "$1" = "--stop" ]; then
  [ -f "$pidfile" ] && pkill -TERM -g "$(cat "$pidfile")" 2>/dev/null
  # The speaker in progress runs in a group of its own (see below), so it is ended by name.
  [ -f "$pidfile.playing" ] && kill -TERM -- "-$(cat "$pidfile.playing" 2>/dev/null)" 2>/dev/null
  "$(dirname "$0")/narrate.sh" --stop > /dev/null 2>&1   # the lines of a narrated task, and its countdown
  rm -f "$pidfile" "$pidfile.playing"; echo "stopped"; exit 0
fi
if [ "$1" = "--again" ]; then
  [ -s "$last" ] || { echo "Nothing has been read aloud yet." >&2; exit 1; }
  copy="$(mktemp)"; cp "$last" "$copy"   # the reading below rewrites the file it is read from
  "$0" < "$copy"; code=$?; rm -f "$copy"; exit $code
fi
[ -f "$say" ] || { echo "The speaker is not built. Run: npm run build:cli (in $root)" >&2; exit 1; }

mkdir -p "$(dirname "$pidfile")"
set -m                      # own process group, so --stop can end the players too
echo "$(ps -o pgid= $$ | tr -d ' ')" > "$pidfile"
trap 'rm -f "$pidfile" "$pidfile.playing"' EXIT
# With job control each speaker runs in a group of its own, so --stop has to end it by name:
# the speaker that is playing (or waiting for a notification to finish) and its audio player.
trap '[ -n "$playing" ] && kill -TERM -- "-$playing" 2>/dev/null; exit 143' TERM INT
# The turn that starts a reading would announce itself over it. This marker tells the
# notifier to stay silent once for this folder (see the VS Code extension).
quiet="$(dirname "$pidfile")/quiet"; mkdir -p "$quiet"
find "$quiet" -type f -mmin +2 -delete 2>/dev/null   # markers nobody used are out of date after 30 s
touch "$quiet/$(printf %s "$PWD" | sha1sum | cut -c1-40)"

: > "$last"
playing=""; count=0; para=""
speak() {
  [ -z "${para//[[:space:]]/}" ] && return
  # A reading opens with the double beep; each later paragraph with the short blip.
  local lead=(--double-beep); [ "$count" -gt 0 ] && lead=(--blip)
  # A paragraph that opens with "[voice: NAME]" is spoken in that version of the voice (a demonstration).
  local whole="$para" text="$para" about=()
  # "[topic: SUBJECT]" is not spoken. It names the paragraph for the words that lead back into
  # it after a notification has interrupted the reading ("Where was I? Oh yes: SUBJECT.").
  if [[ "$text" =~ ^\[topic:\ *([^]]*)\]\ *(.*)$ ]]; then
    about=(--topic "${BASH_REMATCH[1]}"); text="${BASH_REMATCH[2]}"
  fi
  if [[ "$text" =~ ^\[voice:\ *([a-z]+)\]\ *(.*)$ ]]; then
    text="${BASH_REMATCH[2]}"
    case "${BASH_REMATCH[1]}" in
      base)  lead+=(--link '#rate=1&pitch=0&formant=0&onsetLift=0&bodyDb=0&midDb=0&shelfDb=0&doubleMix=0&echoMix=0&reverbMix=0&combFeedback=0&gritMix=0&hpHz=60&lpHz=12000') ;;  # the speech model alone
      metal) lead+=(--link '#echoMix=0&reverbMix=0&combFeedback=0&gritMix=0') ;;  # delivery, tone and the 12 ms doubling only
      early) lead+=(--link '#midHz=1500&midDb=-10&shelfHz=5500&echoMix=0.5&echoFeedback=0.2&reverbMix=0.3&combFeedback=0.72') ;;  # the effect before the clarity pass
      *) ;;  # "current" or unknown: the voice as it is now
    esac
  fi
  node "$say" --no-play "${lead[@]}" "$text" || { echo "could not prepare a paragraph" >&2; para=""; return; }
  [ -n "$playing" ] && wait "$playing"
  node "$say" "${lead[@]}" "${about[@]}" "$text" & playing=$!   # already prepared, so this only plays it
  echo "$playing" > "$pidfile.playing"
  printf '%s\n\n' "$whole" >> "$last"
  count=$((count + 1)); para=""
}
while IFS= read -r line || [ -n "$line" ]; do
  if [ -z "${line//[[:space:]]/}" ]; then speak; else para="${para:+$para }$line"; fi
done
speak
[ -n "$playing" ] && wait "$playing"
echo "read $count paragraph(s) aloud"
