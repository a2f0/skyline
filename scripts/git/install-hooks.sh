#!/bin/sh
# Installs this repository's Git hooks. Taken from tearleads'
# scripts/git/install-hooks.sh and hardened where review found it wanting.
#
#   sh scripts/git/install-hooks.sh
#
# Hooks and the check they call are copied rather than symlinked, and the hooks
# run the copies: a branch that edits the worktree cannot change what the gate
# does. Each hook compares its copy against its checked-out source and refuses
# to run when they differ, so a copy cannot quietly go on enforcing an older
# rule either — rerun this after changing a hook or the check.
#
# Anything replaced or removed is kept alongside as <name>.bak, and the
# installer writes into Git's default hooks directory so it does not have to
# record an absolute path that a moved clone would silently invalidate.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/git/hooks"
# Linked worktrees have a .git file and share hooks/config with the main checkout.
HOOKS_DST="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
CHECK="check-coauthors.ts"
mkdir -p "$HOOKS_DST"

keep() { # a file this installer owns, so the sweep below leaves it alone
  case "$1" in
    *.sample | *.bak | "$CHECK") return 0 ;;
  esac
  [ -f "$HOOKS_SRC/$1" ]
}

save() { # preserve whatever is being replaced or removed, so it can come back
  if [ -f "$1" ] && ! cmp -s "$1" "$2"; then
    cp "$1" "$1.bak"
    echo "Kept the previous $(basename "$1") as $(basename "$1").bak"
  fi
}

for hook in "$HOOKS_SRC"/*; do
  [ -f "$hook" ] || continue
  hook_name="$(basename "$hook")"
  save "$HOOKS_DST/$hook_name" "$hook"
  cp "$hook" "$HOOKS_DST/$hook_name"
  chmod +x "$HOOKS_DST/$hook_name"
  echo "Installed $hook_name hook"
done

# The hooks run this copy, not the worktree's, so editing the worktree cannot
# change what they enforce without a reinstall.
save "$HOOKS_DST/$CHECK" "$REPO_ROOT/scripts/$CHECK"
cp "$REPO_ROOT/scripts/$CHECK" "$HOOKS_DST/$CHECK"

# Copying alone leaves a hook that was deleted or renamed in the source tree
# installed and executable, so it keeps running forever. Mirror the deletion,
# keeping a copy: this also removes hooks that were never ours.
# Git's own *.sample files ship with `git init`, are inert, and are left alone.
for installed in "$HOOKS_DST"/*; do
  [ -f "$installed" ] || continue
  installed_name="$(basename "$installed")"
  if ! keep "$installed_name"; then
    cp "$installed" "$installed.bak"
    rm -f "$installed"
    echo "Removed $installed_name (not in $HOOKS_SRC); kept it as $installed_name.bak"
  fi
done

# No core.hooksPath: this is Git's default hooks directory, so the default
# finds it. Recording the absolute path instead would leave both gates failing
# open the moment the clone is moved or renamed, without a word.
if configured="$(git config --get core.hooksPath)"; then
  git config --unset core.hooksPath
  echo "Unset core.hooksPath (was $configured); hooks now run from $HOOKS_DST"
fi
echo "Installed into $HOOKS_DST"
