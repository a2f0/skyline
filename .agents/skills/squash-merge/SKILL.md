---
name: squash-merge
description: Squash-merge an authorized Skyline PR with a subject-only message bound to the reviewed head, then verify the merge and clean up its branch. Used by ship-pr or an explicit merge request.
---

# Squash merge

Require an explicit merge instruction or a `ship-pr` invocation. Inputs are the
PR repository/number, reviewed head SHA, reviewed base ref/SHA, and optional
`--keep-branch`. When invoked outside `ship-pr`, run `cross-agent-review` first.

1. Require clean intended work and HEAD equal to the reviewed SHA. Re-read the
   PR and require OPEN, not draft, no auto-merge or queued merge, the same base,
   and the same head SHA. Check GitHub status checks and repository rules. Wait
   for pending checks; repair failures and re-review any new commit. Do not
   bypass rules, approve the PR as another user, or enable auto-merge.
2. Fetch the actual base. If its SHA differs from the reviewed base, integrate
   it, validate, re-review and push. Use the new review's SHAs. Invoke:

   ```sh
   bun scripts/squash-merge.ts <owner/repo> <number> <reviewed-head-sha> <base-ref> <reviewed-base-sha>
   ```

   The helper re-checks these identities, sends a synchronous GraphQL mutation
   with `expectedHeadOid`, and sets an empty commit body and the PR title plus
   `(#<number>)` as its subject. It refuses pending/failed checks, stale base,
   non-CLEAN merge state, draft or automatic/queued merge. Never substitute a
   merge command that can queue work or omit the head bind. If it fails, inspect
   actual PR state before doing anything else; do not report success or clean up
   unless the merge is confirmed. A changed head/base requires another review.
3. Once GitHub reports MERGED, capture the merge commit. Unless `--keep-branch`,
   check the worktree is still clean and the feature branch still points to the
   reviewed SHA. Fetch the base and verify it contains the merge commit with
   `git merge-base --is-ancestor <merge-sha> <fetched-base-sha>`.
4. Follow `reset` to switch to the PR base and fast-forward it. Verify the local
   base contains the merge commit too. Delete only the exact merged feature
   branch: after squash, `git branch -d` may refuse; `git branch -D` is allowed
   only after both the merge containment and unchanged feature SHA checks.
   Delete the remote head branch only if its SHA still equals the reviewed
   SHA; use a deletion lease (`git push --force-with-lease=refs/heads/<branch>:<sha>
   <head-remote> :refs/heads/<branch>`) so a concurrent update is not lost.
   If already deleted by GitHub, skip it. Never delete the default/base branch.
5. Report PR URL, squash subject/commit, confirmed merge state, and actual local
   and remote cleanup. A failed cleanup does not undo a completed merge.

GitHub atomically guards the head SHA. The base ref/SHA checks are fail-fast;
the API has no atomic expected-base input. Honor server-side base freshness
rules where configured and never describe client checks as an atomic guarantee.
