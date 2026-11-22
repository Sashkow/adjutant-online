#!/usr/bin/env bash
# Collect the files for the "Adjutant voice" Project in phone/dist/: the instructions to paste, and the two
# rule files to upload, copied from the spell skill so the phone follows the laptop's rules.
set -euo pipefail
cd "$(dirname "$0")/.."
SKILL_DIR="${SPELL_SKILL_DIR:-$HOME/.claude/skills/spell}"
for f in clear-speech-card.md ukrainian.md; do
  [ -f "$SKILL_DIR/$f" ] || { echo "$SKILL_DIR/$f is missing" >&2; exit 1; }
done
rm -rf phone/dist; mkdir -p phone/dist
cp "$SKILL_DIR/clear-speech-card.md" "$SKILL_DIR/ukrainian.md" phone/instructions.md phone/dist/
echo "Built phone/dist:"; ls -l phone/dist
