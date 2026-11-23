#!/bin/bash
# Installs the Claude Code skills kept in skills/ of this checkout, or removes them.
#   install-skills.sh            copy every skill in skills/ into Claude Code's skills folder, with the
#                                path of this checkout written in place of {{ADJUTANT_ROOT}}, and add
#                                the /respell hook to Claude Code's settings if it is not there
#   install-skills.sh --remove   delete those skills and take the hook out again
# The skills folder is $CLAUDE_CONFIG_DIR/skills, or ~/.claude/skills. An installed skill that differs
# from what would be written is first kept in skills-replaced/, beside the skills folder, with the
# date in its name. Nothing else in the skills folder or the settings is touched. Needs node.
set -u
here="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
root="$(dirname "$here")"
source_dir="$root/skills"
config="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
dest="$config/skills"
kept="$config/skills-replaced"
settings="$config/settings.json"
hook_mark='skills/respell/scripts/respell-hook.sh'
if [ "$config" = "$HOME/.claude" ]; then hook_command="\$HOME/.claude/$hook_mark"; else hook_command="$config/$hook_mark"; fi
stamp="$(date +%Y-%m-%d-%H%M%S)"

mode=install
case "${1:-}" in
  '') ;;
  --remove) mode=remove ;;
  *) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac

[ -d "$source_dir" ] || { echo "No skills folder at $source_dir" >&2; exit 1; }
command -v node >/dev/null || { echo "node is needed and was not found" >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# The skill as it would be installed: a copy with the path of this checkout written in.
render() {  # render <name>
  local escaped
  escaped="$(printf '%s' "$root" | sed 's/[&|\\]/\\&/g')"
  rm -rf "${work:?}/$1"
  cp -r "$source_dir/$1" "$work/$1"
  grep -rlF '{{ADJUTANT_ROOT}}' "$work/$1" 2>/dev/null | while IFS= read -r file; do
    sed -i "s|{{ADJUTANT_ROOT}}|$escaped|g" "$file"
  done
}

keep_old() {  # keep_old <name>: move the installed skill aside
  mkdir -p "$kept"
  mv "$dest/$1" "$kept/$1-$stamp"
  echo "  the installed copy differed and is kept in $kept/$1-$stamp"
}

# Adds or removes the /respell hook. Prints one line saying what happened. Leaves a settings file
# that cannot be parsed untouched (exit status 3).
edit_hook() {  # edit_hook add|remove
  node - "$settings" "$1" "$hook_mark" "$hook_command" <<'NODE'
const fs = require('node:fs');
const [file, action, mark, command] = process.argv.slice(2);
let settings = {};
if (fs.existsSync(file)) {
  try { settings = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    console.log(`the settings file ${file} cannot be read as JSON (${e.message}); it is left untouched`);
    process.exit(3);
  }
}
const ours = (h) => typeof h.command === 'string' && h.command.includes(mark);
const groups = (settings.hooks || {}).UserPromptSubmit || [];
const present = groups.some((g) => (g.hooks || []).some(ours));
if (action === 'add') {
  if (present) { console.log('the /respell hook is already in the settings'); process.exit(0); }
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = [...groups, { hooks: [{ type: 'command', command }] }];
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`added the /respell hook to ${file}`);
} else {
  if (!present) { console.log('the /respell hook was not in the settings'); process.exit(0); }
  const left = groups.map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !ours(h)) })).filter((g) => g.hooks.length > 0);
  if (left.length > 0) settings.hooks.UserPromptSubmit = left; else delete settings.hooks.UserPromptSubmit;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`removed the /respell hook from ${file}`);
}
NODE
}

changed=0
for path in "$source_dir"/*/; do
  name="$(basename "$path")"
  [ -f "$path/SKILL.md" ] || continue
  render "$name"
  if [ "$mode" = install ]; then
    if [ -d "$dest/$name" ] && diff -rq "$work/$name" "$dest/$name" >/dev/null 2>&1; then
      echo "$name: unchanged"
      continue
    fi
    if [ -e "$dest/$name" ]; then echo "$name: replaced"; keep_old "$name"; else echo "$name: installed"; fi
    mkdir -p "$dest"
    cp -r "$work/$name" "$dest/$name"
    changed=1
  else
    if [ ! -e "$dest/$name" ]; then echo "$name: was not installed"; continue; fi
    if diff -rq "$work/$name" "$dest/$name" >/dev/null 2>&1; then rm -rf "${dest:?}/$name"; echo "$name: removed"
    else echo "$name: removed"; keep_old "$name"; fi
    changed=1
  fi
done

if [ -d "$source_dir/respell" ]; then
  if [ "$mode" = install ]; then message="$(edit_hook add)"; else message="$(edit_hook remove)"; fi
  status=$?
  echo "hook: $message"
  case "$message" in added*|removed*) changed=1 ;; esac
  [ "$status" = 3 ] && echo "hook: add it by hand, or repair the file and run this script again"
fi

if [ "$changed" = 0 ]; then echo "Nothing changed."
elif [ "$mode" = install ]; then echo "Skills installed in $dest for the checkout at $root. Start a new Claude Code session to use them."
else echo "Skills removed from $dest."; fi
