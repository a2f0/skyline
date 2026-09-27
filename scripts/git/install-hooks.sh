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
# replaces is kept alongside as <name>.bak. It installs where Git will actually
# look — honouring a core.hooksPath this repository set for itself, overriding
# one inherited from outside it — and verifies that before reporting success,
# because an installer that reports success while Git looks elsewhere is a gate
# that fails open.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/git/hooks"
# Where Git will actually look. A core.hooksPath set for this repository is its
# own choice and is honoured — installing elsewhere would leave both gates
# configured and never run. One set globally is not: installing into a shared
# directory would reach into every other repository, so that is overridden here.
# Linked worktrees have a .git file and share hooks/config with the main checkout.
DEFAULT_HOOKS="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
repo_scoped="$(git config --worktree --get core.hooksPath 2>/dev/null || git config --local --get core.hooksPath 2>/dev/null || true)"
if [ -n "$repo_scoped" ]; then
  case "$repo_scoped" in
    /*) HOOKS_DST="$repo_scoped" ;;
    *)
      HOOKS_DST="$REPO_ROOT/$repo_scoped"
      # Local config is shared across linked worktrees but a relative path is
      # resolved against each one, so this only covers the worktree it ran in.
      echo "Note: core.hooksPath is relative ($repo_scoped); each linked worktree"
      echo "      resolves it separately, so run this installer in each of them."
      ;;
  esac
  echo "Using core.hooksPath configured for this repository: $HOOKS_DST"
else
  HOOKS_DST="$DEFAULT_HOOKS"
fi
CHECK="check-coauthors.ts"

# A hooks path pointing back at the source tree would make a hook its own
# source: install_file removes the destination first, so it would delete a
# tracked file and then fail to copy it. Refuse rather than destroy anything.
case "$HOOKS_DST/" in
  "$REPO_ROOT/scripts/"*)
    echo "Error: core.hooksPath resolves to $HOOKS_DST, inside this repository's scripts." >&2
    echo "       That is where the hooks are kept; installing there would delete them." >&2
    exit 1
    ;;
esac
MANIFEST="$HOOKS_DST/.skyline-installed"
mkdir -p "$HOOKS_DST"

# -P so a symlinked hook is preserved as a symlink rather than flattened into a
# copy of whatever it pointed at.
# .bak holds whatever was there before this installer ever ran and is never
# overwritten — a later reinstall replacing it with a copy of the managed hook
# would lose the very thing it promised to keep. Anything replaced after that
# still gets kept, as .bak.previous, so nothing is destroyed unrecorded.
save() {
  [ -e "$1" ] || return 0
  cmp -s "$1" "$2" && return 0
  if [ ! -e "$1.bak" ]; then
    cp -P "$1" "$1.bak"
    echo "Kept the previous $(basename "$1") as $(basename "$1").bak"
  elif ! cmp -s "$1" "$1.bak"; then
    cp -P "$1" "$1.bak.previous"
    echo "Kept the replaced $(basename "$1") as $(basename "$1").bak.previous"
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
      # Something may have replaced it since; keep whatever is there.
      save "$HOOKS_DST/$previous" /dev/null
      rm -f "$HOOKS_DST/$previous"
      echo "Removed $previous, which this installer no longer ships; kept it as $previous.bak"
    fi
  done <"$MANIFEST"
fi
printf '%s' "$installed" >"$MANIFEST"

# A value inherited from outside this repository would send Git to a shared
# directory, so override it locally. That override is an absolute path, which a
# moved clone invalidates — so say what it costs.
if [ "$HOOKS_DST" = "$DEFAULT_HOOKS" ] && inherited="$(git config --get core.hooksPath)"; then
  git config core.hooksPath "$HOOKS_DST"
  echo "Note: core.hooksPath was set outside this repository ($inherited)."
  echo "      Overridden locally with $HOOKS_DST; rerun this installer if the clone moves."
fi

# Whatever the scopes were doing, Git must end up running what was just
# installed. Reporting success without checking is how a gate fails open.
effective="$(git config --get core.hooksPath || true)"
[ -n "$effective" ] || effective="$DEFAULT_HOOKS"
case "$effective" in
  /*) ;;
  *) effective="$REPO_ROOT/$effective" ;;
esac
if [ "$effective" != "$HOOKS_DST" ]; then
  echo "Error: Git will run hooks from $effective, not $HOOKS_DST." >&2
  echo "       core.hooksPath is set in a scope this installer did not change." >&2
  exit 1
fi
echo "Installed into $HOOKS_DST"
