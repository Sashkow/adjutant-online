#!/bin/bash
# Speaks the progress of a task, one short line at a time, in the Adjutant voice.
#   narrate.sh --start                      begin a narrated task (forgets the lines of the last one)
#   narrate.sh "line"                       queue one line; it is dropped if it waits too long
#   narrate.sh --keep "line"                queue a line that must be heard (problem, question, closing line)
#   narrate.sh --countdown SECONDS "event"  speak "Ten/Five/One minute(s) until event." at those marks
#   narrate.sh --countdown-cancel           the wait ended early: forget the marks not yet spoken
#   narrate.sh --stop                       end the line being spoken, the queue and the countdown
# Every call returns at once. Lines are spoken in the order they were sent. The lines of a task are
# kept as one reading, so read-aloud.sh --again (/respell) repeats them all.
root="{{ADJUTANT_ROOT}}"
say="${ADJUTANT_VOICE_CLI:-$root/dist-cli/say.js}"
cache="${XDG_CACHE_HOME:-$HOME/.cache}/adjutant-voice"
state="$cache/narration"          # count: lines so far; last.pid: the line before; pids/, timers/: what --stop ends
last="$cache/last-reading.txt"
STALE_SECONDS="${ADJUTANT_STALE_SECONDS:-15}"   # an ordinary line that has waited this long is out of date
mkdir -p "$state/pids" "$state/timers" "$cache/quiet"

# The turn that narrates would also be announced by the notifier, over its own closing line.
# This marker keeps the notifier silent once for this folder; every line renews it.
quiet() {
  find "$cache/quiet" -type f -mmin +2 -delete 2>/dev/null   # markers nobody used are out of date after 30 s
  touch "$cache/quiet/$(printf %s "$PWD" | sha1sum | cut -c1-40)"
}

end_all() {  # each queued line and each timer runs in a session of its own
  for f in "$state"/pids/* "$state"/timers/*; do
    [ -e "$f" ] || continue
    kill -TERM -- "-$(basename "$f")" 2>/dev/null
    rm -f "$f"
  done
}

case "$1" in
  --stop) end_all; rm -f "$state/last.pid"; echo "stopped"; exit 0 ;;
  --start)
    end_all; rm -f "$state/last.pid"
    echo 0 > "$state/count"; : > "$last"; : > "$state/log"; quiet   # log: what was spoken or dropped, and when
    echo "narration started"; exit 0 ;;
  --countdown-cancel)
    for f in "$state"/timers/*; do
      [ -e "$f" ] || continue
      kill -TERM -- "-$(basename "$f")" 2>/dev/null; rm -f "$f"
    done
    echo "countdown cancelled"; exit 0 ;;
  --countdown)
    total="$2"; event="$3"
    [[ "$total" =~ ^[0-9]+$ ]] && [ -n "$event" ] || { echo "usage: narrate.sh --countdown SECONDS \"event\"" >&2; exit 2; }
    set=0
    for mark in 600 300 60; do
      [ "$total" -gt "$mark" ] || continue
      if [[ "$event" =~ [а-яіїєґА-ЯІЇЄҐ] ]]; then   # Ukrainian: the event is given in the genitive ("кінця збірки")
        case $mark in 600) line="До $event ще десять хвилин." ;; 300) line="До $event ще п'ять хвилин." ;; *) line="До $event ще одна хвилина." ;; esac
      else
        case $mark in 600) line="Ten minutes until $event." ;; 300) line="Five minutes until $event." ;; *) line="One minute until $event." ;; esac
      fi
      setsid "$0" --timer "$((total - mark))" "$line" > /dev/null 2>&1 < /dev/null &
      touch "$state/timers/$!"; set=$((set + 1))
    done
    echo "countdown set: $set mark(s)"; exit 0 ;;
  --timer)   # internal: one mark of a countdown
    trap 'rm -f "$state/timers/$$"' EXIT
    sleep "$2" & wait $!
    "$0" "$3"; exit 0 ;;
  --play)    # internal: speak one queued line when the line before it is done
    lead="$2"; keep="$3"; before="$4"; text="$5"
    trap 'rm -f "$state/pids/$$"' EXIT
    trap 'exit 143' TERM INT
    node "$say" --no-play "$lead" "$text" || exit 1          # prepared while earlier lines are still speaking
    queued=$(date +%s)                                       # the wait counts from when the line could have been spoken
    while [ -n "$before" ] && kill -0 "$before" 2>/dev/null; do sleep 0.1; done
    waited=$(( $(date +%s) - queued ))
    if [ "$keep" != keep ] && [ "$waited" -gt "$STALE_SECONDS" ]; then   # the work has moved on
      echo "$(date +%T) dropped after ${waited} s: $text" >> "$state/log"; exit 0
    fi
    echo "$(date +%T) spoken after ${waited} s: $text" >> "$state/log"
    node "$say" "$lead" "$text" & wait $!
    exit 0 ;;
esac

keep=""; [ "$1" = "--keep" ] && { keep=keep; shift; }
text="$*"
[ -n "${text//[[:space:]]/}" ] || { echo "usage: narrate.sh [--keep] \"line\"" >&2; exit 2; }
[ -f "$say" ] || { echo "The speaker is not built. Run: npm run build:cli (in $root)" >&2; exit 1; }

quiet
count=$(cat "$state/count" 2>/dev/null || echo 0)
lead="--blip"; [ "$count" -eq 0 ] && lead="--double-beep"   # a task opens with the double beep
echo $((count + 1)) > "$state/count"
printf '%s\n\n' "$text" >> "$last"
before=$(cat "$state/last.pid" 2>/dev/null)
setsid "$0" --play "$lead" "${keep:-drop}" "$before" "$text" > /dev/null 2>&1 < /dev/null &
echo $! > "$state/last.pid"; touch "$state/pids/$!"
echo "queued"
