#!/bin/bash
# Adjutant voice mode: runs the listener (voice-listen.py) and answers questions about it.
#   voice.sh start             start the listener in the background (ends one that is already running)
#   voice.sh follow            print the listener's events not yet delivered, and go on printing until it ends
#   voice.sh stop              end the listener, from any session
#   voice.sh status            say whether it is running
#   voice.sh abort-window N    after the Adjutant has finished speaking, give the owner N seconds to say
#                              "stop" or "wait"; exit 1 if they did, 0 if not
#   voice.sh stop-requested    exit 0 (and forget it) if a stop was heard since the last check, else 1
#   voice.sh clear-stop        forget any stop heard so far
# The listener's events are in voice/events.log, its reasons in voice/debug.log. Audio is never stored.
here="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
python="${VOICE_PYTHON:-/opt/ro/whisper/venv/bin/python}"
cache="${XDG_CACHE_HOME:-$HOME/.cache}/adjutant-voice"
dir="$cache/voice"
events="$dir/events.log"; debug="$dir/debug.log"; pidfile="$dir/listener.pid"; offset="$dir/delivered"
mkdir -p "$dir"

running() { [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; }

end_listener() {
  running || { rm -f "$pidfile" "$dir/busy"; return 1; }
  pid=$(cat "$pidfile")
  kill -TERM "$pid" 2>/dev/null
  for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
  kill -KILL "$pid" 2>/dev/null
  pkill -f 'parec .*--client-name=adjutant-voice-mode' 2>/dev/null
  rm -f "$pidfile" "$dir/busy"
}

speaking() {  # a line is playing, or lines are queued behind it
  if [ -f "$cache/playing.lock" ] && kill -0 "$(cut -d' ' -f1 "$cache/playing.lock")" 2>/dev/null; then return 0; fi
  for f in "$cache"/narration/pids/*; do [ -e "$f" ] && kill -0 "$(basename "$f")" 2>/dev/null && return 0; done
  return 1
}

case "$1" in
  start)
    [ -x "$python" ] || { echo "No Python with faster-whisper at $python" >&2; exit 1; }
    end_listener && echo "ended the listener that was running"
    : > "$events"; echo 0 > "$offset"; rm -f "$dir/stop-requested"
    echo "--- $(date '+%F %T') started from $PWD" >> "$debug"
    setsid "$python" "$here/voice-listen.py" >> "$events" 2>> "$debug" < /dev/null &
    echo $! > "$pidfile"
    echo "listener started (pid $!)" ;;
  follow)
    running || { echo "ENDED the listener is not running"; exit 0; }
    pid=$(cat "$pidfile"); from=$(cat "$offset" 2>/dev/null || echo 0)
    LC_ALL=C tail -c "+$((from + 1))" -f --pid="$pid" "$events" | while IFS= read -r line; do
      from=$((from + ${#line} + 1)); echo "$from" > "$offset"
      printf '%s\n' "$line"
    done
    echo "ENDED the listener has stopped" ;;
  stop)
    if end_listener; then echo "listener stopped"; else echo "the listener was not running"; fi ;;
  status)
    if running; then echo "listening (pid $(cat "$pidfile"))"; tail -n 3 "$debug"; else echo "not listening"; fi ;;
  abort-window)
    seconds="${2:-4}"
    running || { echo "the listener is not running: no window"; exit 0; }
    touch "$dir/window-open"   # from now a stop counts even if it is said over the Adjutant's own line
    trap 'rm -f "$dir/window-open"' EXIT
    sleep 0.5                                                          # the launch line is being prepared
    for _ in $(seq 300); do speaking || break; sleep 0.1; done        # the launch line is still being spoken
    sleep "$seconds"
    for _ in $(seq 120); do [ -e "$dir/busy" ] || break; sleep 0.1; done   # a phrase is being said or recognised
    if [ -e "$dir/stop-requested" ]; then rm -f "$dir/stop-requested"; echo "STOP heard: do not go ahead"; exit 1; fi
    echo "clear: no stop was heard" ;;
  stop-requested)
    if [ -e "$dir/stop-requested" ]; then rm -f "$dir/stop-requested"; echo "STOP heard"; exit 0; fi
    exit 1 ;;
  clear-stop) rm -f "$dir/stop-requested" ;;
  *) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
