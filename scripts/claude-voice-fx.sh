#!/bin/bash
# Claude Desktop's voice through the Adjutant effect (metal, doubling, echo, room), live, on PulseAudio.
#   claude-voice-fx.sh [start]   make the "Adjutant effect" sink, run the effect, move Claude Desktop's sound there
#   claude-voice-fx.sh stop      move Claude Desktop back to the speakers, stop the effect, remove the sink
#   claude-voice-fx.sh status
# Claude Desktop's streams are found by their process (/usr/lib/claude-desktop); new ones are moved as they appear, so
# start it before or after Claude Desktop. Effect settings: ADJUTANT_FX_LINK='#echoMix=0...' (a page address works too);
# ADJUTANT_FX_SHIFT=<semitones> raises the pitch (default 2.3, 0 for none; about half a second of delay);
# ADJUTANT_FX_SIZE=<semitones> makes the voice smaller, its resonances higher (default 0: off);
# ADJUTANT_FX_PAUSE=<seconds>: a pause this long is a new paragraph and gets a short blip (default 0.9, 0 for none).
# Use headphones: Claude's echo cancelling expects its own plain voice, and the effect on the speakers can make it hear
# itself and interrupt.
set -u
SELF=$(readlink -f "$0")
ROOT=$(cd "$(dirname "$SELF")/.." && pwd)
SINK=adjutant_fx
RUN=${XDG_RUNTIME_DIR:-/tmp}/adjutant-fx
mkdir -p "$RUN"

is_claude() {                      # sink-input number -> true when its process is Claude Desktop's
  local pid
  pid=$(pactl list sink-inputs | awk -v n="Sink Input #$1" '$0 == n {f = 1} f && /application.process.id/ {gsub(/"/, "", $3); print $3; exit}')
  # its audio process names itself /proc/self/exe, so look at the program file it runs
  [ -n "$pid" ] && { readlink "/proc/$pid/exe"; tr '\0' ' ' < "/proc/$pid/cmdline"; } 2>/dev/null | grep -q 'claude-desktop'
}
sink_index() { pactl list short sinks | awk -v s="$SINK" '$2 == s {print $1}'; }
move_claude() {                    # move every Claude Desktop stream to the effect sink
  for n in $(pactl list short sink-inputs | awk '{print $1}'); do
    is_claude "$n" && pactl move-sink-input "$n" "$SINK" && echo "moved Claude Desktop's stream #$n to the effect"
  done
}

stop() {
  for f in watch effect; do
    [ -s "$RUN/$f.pid" ] && kill -- -"$(cat "$RUN/$f.pid")" 2>/dev/null; rm -f "$RUN/$f.pid"
  done
  local real; real=$(pactl get-default-sink)
  for n in $(pactl list short sink-inputs | awk -v s="$(sink_index)" '$2 == s {print $1}'); do
    pactl move-sink-input "$n" "$real"
  done
  [ -s "$RUN/module" ] && pactl unload-module "$(cat "$RUN/module")" 2>/dev/null; rm -f "$RUN/module"
  echo "the Adjutant effect is off; Claude Desktop plays on the speakers"
}

case "${1:-start}" in
  stop) stop; exit 0 ;;
  __move)                          # a new stream: Claude Desktop's to the effect; any other that PulseAudio's memory
    if is_claude "$2"; then         # put there (other Electron apps share the name "Chromium") back to the speakers
      pactl move-sink-input "$2" "$SINK" && echo "moved #$2"
    elif pactl list short sink-inputs | awk -v n="$2" -v s="$(sink_index)" '$1 == n && $2 == s {f = 1} END {exit !f}'; then
      pactl move-sink-input "$2" "$(pactl get-default-sink)" && echo "sent #$2 back to the speakers"
    fi
    exit 0 ;;
  status)
    [ -n "$(sink_index)" ] && echo "sink $SINK: present" || echo "sink $SINK: absent"
    for f in effect watch; do [ -s "$RUN/$f.pid" ] && kill -0 "$(cat "$RUN/$f.pid")" 2>/dev/null && echo "$f: running" || echo "$f: stopped"; done
    exit 0 ;;
  start) ;;
  *) echo "usage: $0 [start|stop|status]"; exit 1 ;;
esac

[ -f "$ROOT/dist-cli/live.js" ] || { echo "build it first: (cd $ROOT && npm run build:live)"; exit 1; }
stop >/dev/null 2>&1
REAL=$(pactl get-default-sink)
pactl load-module module-null-sink sink_name=$SINK rate=48000 channels=1 \
  sink_properties=device.description=Adjutant_effect > "$RUN/module"
pactl set-default-sink "$REAL"     # the null sink must never become the default: everything else stays as it was

# the effect: the sink's monitor -> the effect chain -> the default output (setsid: one process group to stop)
setsid bash -c "parec -d $SINK.monitor --format=float32le --rate=48000 --channels=1 --latency-msec=20 \
  | node '$ROOT/dist-cli/live.js' --link '${ADJUTANT_FX_LINK:-}' --shift '${ADJUTANT_FX_SHIFT:-}' --size '${ADJUTANT_FX_SIZE:-}' --pause '${ADJUTANT_FX_PAUSE:-}'" > "$RUN/effect.log" 2>&1 &
echo $! > "$RUN/effect.pid"

move_claude
# new streams: Claude Desktop opens one when it starts speaking
setsid bash -c "pactl subscribe | while read -r line; do
  case \"\$line\" in *\"'new' on sink-input #\"*) n=\${line##*#}; sleep 0.2; \"$SELF\" __move \"\$n\";; esac
done" > "$RUN/watch.log" 2>&1 &
echo $! > "$RUN/watch.pid"
echo "the Adjutant effect is on: Claude Desktop's voice plays through it (stop: $SELF stop). Use headphones."
