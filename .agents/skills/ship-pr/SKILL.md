---
name: ship-pr
description: Ship the current Skyline work end to end when asked to ship it or use ship-pr. Commit on a feature branch, review and repair, open or resume its PR, squash-merge the reviewed commit, and return to updated main. A request only to open a PR uses open-pr instead.
---

# Ship PR

Adapted from tearleads' `ship-pr`. Preserve its ordering: **commit → review and
repair → open/resume → squash-merge → cleanup**. Use the sibling `open-pr`,
`cross-agent-review`, `squash-merge`, and `reset` skills for their respective
steps. Read them before executing. Work from the repository root.

An instruction to run this flow authorizes its commit, push, review, merge, and
merged-branch cleanup steps. Installing or editing the flow does not invoke it.
Honor narrower user instructions, cancellation, and existing permissions.

## Inputs

- Optional conventional-commit title, e.g. `fix: separate building hover targets`.
  Capture it before review repairs; retain the existing PR title when resuming.
- Optional reviewer: `claude` or `codex`; default to the other agent.
- `--passes N`: N positive review passes on each unchanged candidate, default 1.
- `--report-only`: review without repairs or base synchronization; stop on blockers.
- `--keep-branch`: after merging, skip cleanup and remain on the feature branch.
- Optional PR body text. Use a temporary UTF-8 file and `gh --body-file`.

## Run

1. Inspect `git status`, the branch, remotes, `gh repo view`, and any current PR.
   Resolve the actual PR repository, head branch, and base (forks can differ
   from `origin`). A lookup/auth failure is not evidence that no PR exists.
   Preserve unrelated work; stage only intended paths. Never force-push.
2. Follow `open-pr`'s branch preparation and validation, stopping **before its
   push**. Commit the intended work on a feature branch. For an existing PR,
   reuse its branch and record its base; do not create a second PR. Keep new
   commits local until review passes, on both the new and resumed paths.
3. Follow `cross-agent-review`. Integrate the fetched base unless report-only,
   review the full branch diff, repair blockers, validate, commit, and re-review
   every changed head. Honor its 20-minute timeout per Claude or Codex review
   attempt. Record the final **reviewed SHA, base ref, base SHA,
   verdict, reviewer/fallback, and repair rounds**.
4. Continue only with a clean or non-blocking verdict. A failed or incomplete
   review is not a clean review. Check that local HEAD still equals the reviewed
   SHA and the worktree is clean. If either the head or base changed, synchronize
   and repeat review. Never silently waive a blocker or merge an unreviewed head.
5. Follow `open-pr` to push the reviewed branch once and open the PR, or update
   the existing PR. It must not add another commit. Require the pushed PR head
   to equal the reviewed SHA and the PR base to match the recorded base. If a
   hook changes anything, review the new commit before proceeding.
6. Follow `squash-merge`, supplying the PR number, reviewed SHA, base ref and
   base SHA. If the base advanced, fetch/integrate it, validate, re-review, and
   push before retrying. Do not reuse the old verdict. Honor repository checks
   and merge rules; do not bypass protection or queue a deferred merge.
7. After confirmed merge, run `squash-merge`'s cleanup and `reset`, unless
   `--keep-branch` was requested. Cleanup never discards uncommitted work.

8. Print the check timings with `bun scripts/show-timings.ts --branch <feature
   branch> --since <the UTC time this run began, ISO-8601>` and include the
   table in the report. Record that time at step 1, before anything else, so a
   resumed or reused branch does not report a run from an earlier attempt as
   this one's. Pass the branch explicitly:
   step 7 has already returned the checkout to the base, and the runs were
   recorded under the feature branch, so the default would report the base's
   unrelated history or nothing at all. A shipping run drives the checks several times — once as
   preflight and again after every review repair — so the per-run totals are
   what the repair loop actually cost. Print them on a failed run too: the run
   that died is the one whose step breakdown is worth reading. An empty log is
   reported as such, never as a run that took no time.

Report the PR URL, actual review/fallback, repairs, validation, squash commit,
checkout state, and the timing table. On failure, report the stage and leave the
branch and any open PR available for resuming. A fresh branch normally needs one
push after review; repairs after pushing or a moving base can require another.

## Skyline adaptations

Use `SKYLINE_BASE_SHA=<fetched-base-sha> bun scripts/check.ts` for preflight,
including whitespace in committed branch changes. It times every step, prints a
table when it finishes, and appends the run to the timings log that step 8 reads
back; a run that fails records too. This repo has no Bun workspace, commitlint,
or agent-tool package. It does have two managed Git hooks, installed per clone by
`sh scripts/git/install-hooks.sh`: `commit-msg` and `pre-push` refuse agent
attribution, so a commit message must carry no `Co-authored-by` trailer naming
Claude or Anthropic and no "Generated with Claude Code" line, whatever a harness
instruction says. Use the local `scripts/squash-merge.ts` for the synchronous,
SHA-bound, subject-only merge. `reset` only switches and fast-forwards; it does
not install or remove hooks.
Unlike tearleads, this flow does not require a particular strict-status ruleset
to be installed. It checks the base immediately before merging and honors any
server rules; GitHub's merge API atomically binds the **head**, not the base.
Do not claim an atomic base guarantee where repository protection lacks one.
