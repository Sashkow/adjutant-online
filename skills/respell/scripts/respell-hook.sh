#!/usr/bin/env bash
# UserPromptSubmit hook: when the prompt is exactly "/respell", replay the last
# reading and stop the prompt there, so no model call is made.
prompt=$(jq -r '.prompt // ""' 2>/dev/null | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
script="$(dirname "$(readlink -f "$0")")/../../spell/scripts/read-aloud.sh"   # the spell skill installed beside this one
if [ "$prompt" = "/respell stop" ]; then
  "$script" --stop >/dev/null 2>&1
  jq -n '{decision: "block", reason: "Reading stopped."}'
  exit 0
fi
[ "$prompt" = "/respell" ] || exit 0
if [ ! -s "${XDG_CACHE_HOME:-$HOME/.cache}/adjutant-voice/last-reading.txt" ]; then
  jq -n '{decision: "block", reason: "Nothing has been read aloud yet. Use /spell first."}'
  exit 0
fi
setsid "$script" --again >/dev/null 2>&1 < /dev/null &
jq -n '{decision: "block", reason: "Repeating the last reading (no model call). To stop it: /respell stop"}'
