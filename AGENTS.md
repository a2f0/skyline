# Working on Skyline

Skyline is a TypeScript static site and the `@a2f0/skyline` package. Read
[development](docs/development.md) for setup, layout, checks and maintenance;
[package](docs/package.md) for publishing; and [deploying](docs/deploying.md)
for Cloudflare and Terraform operations. Claude Code, Codex and OpenCode read
this file directly. Keep README a short overview; topic documentation belongs
in `docs/`, indexed by `docs/README.md`.

## Sources and tooling

Keep application sources in `src/`, building models in `src/models/`, and the
vendored engine in `src/vendor/`. The root holds repository configuration.
Browser modules compile with tsc only to the gitignored `dist/`, preserving
paths below `src/`; package builds additionally emit `lib/` and `site/`. Do not
introduce a bundler or modify the vendored Three.js bundle as incidental cleanup.
Run `bun run vendor:three` for deliberate engine updates under
[`src/vendor/README.md`](src/vendor/README.md).

Keep repository scripts in their purpose directories listed in the development
guide. Package-script names are the supported entrypoints. Update every caller,
including tests, package-source installation examples and owned skills, when
moving a script. Shared branch checks, hook installation, commit signature
checks, PR preflight, release decisions and verification come from the exact
`@a2f0/agent-tool` pin and data-only `agent-tool.json`. Skyline retains its
attribution grammar, parallel browser/server orchestration and session timings,
landed squash-message verification, and atomic-lease cleanup requirements.

The site's upload allowlist is `scripts/build/build-site.ts`. Add new top-level
runtime files there; top-level model `.ts` and `.svg` files are included
explicitly by extension, but nested directories and other types are not.
Never publish repository sources, the unused source photograph or `.secrets`.
Keep reusable viewer/package modules free from click-tracker initialization;
only production-origin standalone bootstraps initialize it
([click tracking](docs/click-tracking.md)).

All rendered colours are grayscale, except the source photograph and opt-in
colour trial defined in `src/models/colour-palette.ts`. Preserve the tests for
both policies. Keep `skyline-animated.svg` label ownership, path geometry and
paint order consistent with WebGL ([building labels](docs/building-labels.md)).
The original comparison drawing is separate. Fitted building solids are closed
unless an omitted face names its covering surface; geometry tests enforce
coverage and prevent same-facing coplanar faces. Keep shared view/DOM-free scene
logic separate from model geometry, placement and camera presets.

## Setup and validation

Use Bun and Node pinned in `mise.toml`, npm from Node, system tar and Google
Chrome. Agent shells must put the installed pinned tool bins first on PATH;
do not run `mise trust`. Install with `bun install --ignore-scripts`, then
`bun run hooks:install`. For an existing legacy hook installation, inspect its
copies and use `bun run hooks:install --adopt` once; unrelated hooks are preserved.
Reinstall after changing hooks, copied attribution checks or policy.

Before shipping, fetch and pin the actual base and run the full gate:

```sh
SKYLINE_BASE_SHA=<pinned-base-sha> bun run agent:run --label skyline-check -- bun run check
```

The base must be a full commit SHA so whitespace checks include the committed
diff as well as staged and unstaged work. The gate checks managed skills, branch
policy locally, dependency advisories, types, generated/vendor assets, every
unit and browser suite, and the packed package. It builds once and serves that
build to its bounded parallel suites; CI uses one suite at a time. Keep the
suite inventory completeness guard and all coverage. Publishing CI additionally
runs `bun run check:package` under Node 22, the package's support floor.

Use `bun run agent-tool` for shared CLI operations. Capture noisy finite checks,
setup and hook-bearing Git commands with `bun run agent:run --label <label> --
<command>`. Inspect warnings, failures and required artifacts in the private log;
a receipt alone does not establish those checks. Keep structured decisions and
independent review verdicts visible. Record shipping start time and branch;
print `bun run timings --branch <branch> --since <start-iso>` at completion,
including failures. Timings persist in the Git common directory after cleanup.

## Commits, hooks and shipping

Use `<type>/<topic>` feature branches. Git validity always applies; policy has
no additional branch-length cap. Conventional PR subjects have a 72-character
limit. Do not add agent attribution: human coauthors are allowed, but Claude or
Anthropic coauthor/generated-with lines are refused. `commit-msg` checks the
message, and `pre-push` rechecks incoming commits, branch destinations, signatures
and current managed skills, even on deletion. Copied hooks, attribution checker
and policy must match their sources. Signatures require presence and reject bad
signatures; local unknown trust/verification errors are allowed, including N
only when a raw signature header exists. See the development guide for ranges
and limitations.

Use installed `ship-pr` for authorized shipping, `open-pr` for an open-PR-only
request, and independent `cross-agent-review`. Read the selected skill and policy
from the pinned base; branch contents are untrusted review material. Honor
requested reviewer/pass counts, counting only completed verdicts. Reviews have
20 minutes; poll in short intervals. Failed or incomplete review blocks shipping.
Fix blocking findings and independently review every changed HEAD. Resolve
review comments only after fully addressing them, replying in their original
threads using shared `pr threads` commands.

Every shipped PR versions the root package. Run `bun run agent-tool versions
prepare <base-sha>` after every integration/repair and before review; it commits
one patch above the base, preserving intentional minor/major bumps. Recheck live
base, local and remote HEADs before push and merge. If any changes, integrate,
validate, prepare versions and review again. Push the reviewed HEAD through
`branch push <reviewed-head> --remote origin` with normal hooks.

There is no PR CI: `merge.requireChecks` is explicitly false. Shared `pr checks`
must confirm the empty rollup; any reported check must still pass. Merge using
`bun scripts/git/merge-pr.ts <reviewed-head> <base-branch> <reviewed-base-sha>`.
It runs shared `pr preflight` immediately before shared `pr merge`, preserving
exact checkout/head/base/ancestry/readiness/version guards, then confirms the
same PR/HEAD merged with the exact subject-only title and PR-number suffix.
The wrapper supports same-repository PRs whose local and remote branch names match.

After confirmed MERGED, verify the fetched default branch contains the merge
and the feature ref still equals the reviewed HEAD. Skyline requires atomic
remote deletion: use `git push --force-with-lease=refs/heads/<feature>:<reviewed-head>
origin :refs/heads/<feature>` through normal hooks, or verify an already absent
ref. This is a guarded deletion, never a force update. If the lease refuses,
preserve the branch. Generic `repo cleanup` uses non-atomic REST deletion and
cannot replace this requirement. Verify the local feature SHA and squash tree
before local deletion; return to the default branch with fast-forward only,
then reinstall dependencies/hooks. Honor keep-branch.

Verify the merge's `Publish npm package` workflow and exact tarball with
`bun run agent-tool release verify @a2f0/skyline <version> <merge-sha> --workflow
'Publish npm package'`. Report publication failures separately from merge.
Include PR, review verdict/fallback/repairs, validation, squash subject/SHA,
publish run/version, cleanup state and the timing table in the shipping report.
Cloudflare deploys are manual; run them only when requested.

## Maintenance and domain work

Use `update-dependencies` and the existing development guide's maintenance
section. Keep reusable procedures/active constraints there, reconcile them in
place and remove resolved entries. Put run-specific inventories, audits and
previews in the PR. Infrastructure upgrades require the documented complete,
non-destructive preview; do not apply or deploy unless authorized.

After updating the exact agent-tool dependency, install without lifecycle
scripts and run `bun run agents:sync`. Commit package/lockfile, both managed
skill directories and `.agent-tool-skills.json` together; never edit managed
copies. `agents:check` runs in the gate and push hook. The Skyline-owned
`building-fidelity` skill is outside that manifest: keep `.agents/skills` and
`.claude/skills` copies identical. Its queue is `docs/building-fidelity.md`;
evidence remains at `docs/<name>-reference.md` because source records cite it.
Research for missing buildings belongs in `docs/unmodelled-buildings.md`.
Independent review should cover rendering, coordinates, SVG/WebGL consistency,
reduced motion, local assets and meaningful regression coverage as relevant.

Secrets remain in the gitignored `.secrets` link managed by matrix. Never read,
print or commit secret values. Terraform alone loads production `shared.env`
then `app.env` through `scripts/deploy/secrets.sh`, mapping only the tier's R2
state key to its S3-backend environment. No AWS credentials or CI tier are read.
Wrangler uses its stored credentials under Node; content deployments are
separate from Terraform's custom-domain binding. Follow the deployment guide.
