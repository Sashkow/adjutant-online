#!/bin/bash
# Opens the briefing in Firefox and plays its sound from here, in step with the page's clock.
# (Firefox would block a page that starts sound by itself; the page follows the shared start time instead.)
here=$(cd "$(dirname "$0")" && pwd)
lead=${1:-6}                                   # seconds for Firefox to open the page
start=$(( $(date +%s%3N) + lead * 1000 ))
firefox --new-window "file://$here/index.html#start=$start" >/dev/null 2>&1 &
now=$(date +%s%3N); sleep "$(echo "scale=3; ($start - $now) / 1000" | bc)"
for f in "$here"/audio/*.wav; do
  paplay "$f"; sleep 0.35
done
