#!/bin/sh
# Installs this repository's Git hooks. Taken from tearleads'
# scripts/git/install-hooks.sh, unchanged apart from these comments.
#
#   sh scripts/git/install-hooks.sh
#
# Hooks are copied rather than symlinked, because a symlink into the worktree
# would let a branch swap out its own gate. Each hook checks itself against the
# checked-out source and refuses to run when it is stale, so a copy cannot
# quietly go on enforcing an older rule.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/git/hooks"
# Linked worktrees have a .git file and share hooks/config with the main checkout.
HOOKS_DST="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
mkdir -p "$HOOKS_DST"

# Repointing core.hooksPath silently would disable whatever was configured
# there. Say so rather than making the change invisible.
existing_path="$(git config --get core.hooksPath || true)"
if [ -n "$existing_path" ] && [ "$existing_path" != "$HOOKS_DST" ]; then
  echo "Note: core.hooksPath was $existing_path; hooks there will stop running."
fi

for hook in "$HOOKS_SRC"/*; do
  if [ -f "$hook" ]; then
    hook_name="$(basename "$hook")"
    cp "$hook" "$HOOKS_DST/$hook_name"
    chmod +x "$HOOKS_DST/$hook_name"
    echo "Installed $hook_name hook"
  fi
done

# Copying alone leaves a hook that was deleted or renamed in the source tree
# installed and executable, so it keeps running forever. Mirror the deletion.
# Git's own *.sample files ship with `git init`, are inert, and are left alone.
for installed in "$HOOKS_DST"/*; do
  [ -f "$installed" ] || continue
  installed_name="$(basename "$installed")"
  case "$installed_name" in
    *.sample) continue ;;
  esac
  if [ ! -f "$HOOKS_SRC/$installed_name" ]; then
    rm -f "$installed"
    # Named loudly: this deletes a hook the repository does not ship, which is
    # the point when one was renamed, and a surprise when it was someone's own.
    echo "Removed $installed_name hook (not in $HOOKS_SRC)"
  fi
done

git config core.hooksPath "$HOOKS_DST"
echo "Configured core.hooksPath to $HOOKS_DST"
