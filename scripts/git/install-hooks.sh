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
# It removes only hooks it installed itself, recorded in a manifest, so a hook
# that was renamed here stops running while anyone else's stays. Anything it
# replaces is kept alongside as <name>.bak. It writes into Git's default hooks
# directory and leaves core.hooksPath unset, rather than recording an absolute
# path that a moved clone would silently invalidate.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/git/hooks"
# Linked worktrees have a .git file and share hooks/config with the main checkout.
HOOKS_DST="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
CHECK="check-coauthors.ts"
MANIFEST="$HOOKS_DST/.skyline-installed"
mkdir -p "$HOOKS_DST"

# -P so a symlinked hook is preserved as a symlink rather than flattened into a
# copy of whatever it pointed at.
save() {
  if [ -e "$1" ] && ! cmp -s "$1" "$2"; then
    cp -P "$1" "$1.bak"
    echo "Kept the previous $(basename "$1") as $(basename "$1").bak"
  fi
}

# rm before cp: copying onto a symlink writes through it, changing a target that
# may be shared with other repositories and leaving the destination a symlink,
# which is the opposite of what a copied hook is for.
install_file() {
  save "$2" "$1"
  rm -f "$2"
  cp "$1" "$2"
}

installed=""
for hook in "$HOOKS_SRC"/*; do
  [ -f "$hook" ] || continue
  hook_name="$(basename "$hook")"
  install_file "$hook" "$HOOKS_DST/$hook_name"
  chmod +x "$HOOKS_DST/$hook_name"
  installed="$installed$hook_name
"
  echo "Installed $hook_name hook"
done

# The hooks run this copy, not the worktree's, so editing the worktree cannot
# change what they enforce without a reinstall.
install_file "$REPO_ROOT/scripts/$CHECK" "$HOOKS_DST/$CHECK"
installed="$installed$CHECK
"

# Copying alone leaves a hook that was renamed or deleted here installed and
# executable, so it keeps running forever. Mirror that, but only for files a
# previous run of this installer put there: an unrelated pre-commit is somebody
# else's and is left alone.
if [ -f "$MANIFEST" ]; then
  while IFS= read -r previous; do
    [ -n "$previous" ] || continue
    case "$installed" in
      *"$previous
"*) continue ;;
    esac
    if [ -e "$HOOKS_DST/$previous" ]; then
      rm -f "$HOOKS_DST/$previous"
      echo "Removed $previous, which this installer no longer ships"
    fi
  done <"$MANIFEST"
fi
printf '%s' "$installed" >"$MANIFEST"

# This is Git's default hooks directory, so with core.hooksPath unset the
# default finds it, and nothing records a path that moving the clone would
# break. A value set outside this repository has to be overridden locally, and
# that override is an absolute path — so say what it costs.
git config --unset-all core.hooksPath 2>/dev/null || true
if inherited="$(git config --get core.hooksPath)"; then
  git config core.hooksPath "$HOOKS_DST"
  echo "Note: core.hooksPath is set outside this repository ($inherited)."
  echo "      Overridden locally with $HOOKS_DST; rerun this installer if the clone moves."
fi
echo "Installed into $HOOKS_DST"
