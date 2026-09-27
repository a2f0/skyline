---
name: reset
description: Return the Skyline checkout to its default branch or a supplied base branch and fast-forward it without discarding work. Used after ship-pr cleanup or when asked to switch back and pull.
---

# Reset checkout

This is a safe branch switch and pull, not `git reset --hard`. It does not
merge PRs, delete branches, install hooks, or remove files.

1. Inspect status. Require a clean worktree, including untracked files, before
   switching. Preserve dirty work and report it rather than stashing, committing,
   or discarding it as part of reset. Honor a user's existing instructions to
   preserve or commit known work in the surrounding task.
2. Resolve the supplied target branch or the repository default via `gh repo
   view --json defaultBranchRef`. For post-merge cleanup, use the actual PR base
   repository and branch, which may differ from a fork's default.
3. Fetch the target's actual remote branch. Honor both configured upstream
   settings (`branch.<target>.remote` and `branch.<target>.merge`); reject a
   mismatch with a supplied PR base rather than pulling from the wrong repository.
   If no local branch exists, create it tracking the fetched remote branch.
4. Switch to the target. Fast-forward with `git merge --ff-only <fetched-ref>`
   (or `git pull --ff-only <remote> <remote-branch>`). A divergence is a blocker;
   do not reset, rebase, or force-update it. If another worktree holds the target,
   leave that worktree intact and report the remaining checkout step.
5. Report the branch and final SHA, including partial progress if switching
   succeeded but fast-forwarding failed. Skyline's two managed hooks live in
   `scripts/git/hooks` and are installed per clone by
   `sh scripts/git/install-hooks.sh`; reset neither installs nor removes them.
