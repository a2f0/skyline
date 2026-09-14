---
name: open-pr
description: Commit intended Skyline changes on a feature branch and open or update a GitHub pull request. Use for requests to open a PR; this skill does not merge it.
---

# Open PR

Require Git, authenticated `gh`, Node.js, and the browser test dependencies
documented in README. Use a conventional-commit title describing final behavior.

1. Inspect status, current branch, default branch, and remotes. Resolve an open
   PR with `gh pr view --json number,state,url,title,headRefName,baseRefName`;
   distinguish "no PR" from command/auth failures. For a fork, use the repository
   from the PR URL for PR operations and fetch its actual base. Reuse an existing
   open PR; retain its title unless the scope has changed.
2. If on the default branch, create a feature branch with `git switch -c` to
   preserve intended work and any local commits. Validate its name with
   `git check-ref-format --branch`. Do not reset the default branch or stash
   unrelated files. Commit intended changes on the feature branch, fetch the
   actual base, and merge it into the feature branch if needed. Resolve in-scope
   conflicts and validate. Never force-update a branch or discard work.
3. Run `SKYLINE_BASE_SHA=<fetched-base-sha> node scripts/check.cjs`. This checks
   unstaged, staged, and already committed branch whitespace as well as tests. Stage explicit
   intended paths and commit if needed. Leave unrelated changes unstaged.
   If called by `ship-pr`, stop here until its review has passed; after that,
   require a clean worktree and do not create additional commits.
4. Check the branch has a diff from its intended base. Push without force to
   the correct writable head remote using `git push -u <remote> HEAD:<branch>`.
   Never push to a base/default branch by relying on an inherited upstream.
5. Write the PR body to a temporary file. Lead with the problem and resulting
   behavior, followed by relevant validation and any remaining limitations.
   Use structured tool arguments or a quoted heredoc; do not interpolate a PR
   body through shell command substitution.
6. Create with `gh pr create --repo <owner/repo> --base <base> --head <head>
   --title <title> --body-file <file>`, or update the existing PR with `gh pr edit`.
   For fork PRs, use the correct `owner:branch` head. Verify the returned PR's
   repository, base, and head SHA. Report its URL and checks.

This step stops with an open PR. Only `ship-pr`, `squash-merge`, or another
explicit user instruction supplies authority to merge it.
