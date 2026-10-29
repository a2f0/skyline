# Development

Sources are TypeScript under `@tsconfig/strictest`. The browser modules compile to `dist/` with
tsc, the only build step; there is no bundler. `AGENTS.md`, which Claude Code, Codex, and OpenCode
read directly, is the repository's policy for agents and holds the shipping rules; this page
explains the tooling behind it.

## Layout

| Path | Holds |
| --- | --- |
| `src/` | The site: pages, styles, drawings, the viewer's shell and module, browser and package entry modules, and their build configs |
| `src/models/` | Building models, the shared building kit, and the drawing excerpts they were fitted to |
| `src/vendor/` | The vendored Three.js bundle, declarations and license, plus the click client's declaration shim; the build copies its published ESM into `dist/vendor/ct-client.js` |
| `scripts/build/` | Site/package builds and vendored-engine regeneration |
| `scripts/checks/` | Skyline-specific asset and attribution checks |
| `scripts/testing/` | Parallel suite runner and session timing reports |
| `scripts/deploy/` | Cloudflare publication, live verification, and Terraform command/credential loading |
| `scripts/fidelity/` | Building measurement, camera fitting, rendering, and colour research; domain helpers in `lib/` |
| `scripts/git/` | Repository hook bodies and landed squash-message adapter |
| `scripts/lib/` | Command parsing and temporary static server shared across script groups |
| `tests/` | Unit and browser suites and the shared fidelity measurements |
| `assets/brand/` | `logo.svg`, the mark agent-tool renders the site's favicons from |
| `docs/` | Topic documentation, building reference audits, and fidelity evidence |
| `terraform/` | The custom-domain binding |

Package scripts remain the supported entrypoints when their names already exist.
The documented public `scripts/build-package.ts` source-install entrypoint remains
a compatibility launcher/export; build implementation lives under `scripts/build/`. Keep
application-specific orchestration here and shared Git/GitHub/release mechanics in the
exact-pinned agent-tool. Update imports, runtime root resolution, tests, docs and both
repository-owned skill copies whenever moving a script.

`src/` also keeps the drawing's sources, `skyline.svg` and the photograph `skyline.jpg` it links,
which the site never requests. The root holds only repository configuration and
`assets/brand/logo.svg`, the source of the site's favicons. Builds write `dist/` (the site), `lib/`
and `site/` (the package); all three are gitignored.

`bun run build:site` also renders the favicons into `dist/` with agent-tool's `favicons` target in
`agent-tool.json`: `favicon.svg` (the logo itself), `favicon.ico` (16, 32 and 48 pixels) and an
opaque 180-pixel `apple-touch-icon.png`. Every page links them at the site root. They are never
committed, and the package's viewer assets leave them out (see
[the package guide](package.md#copy-the-viewer-assets)). Keep the logo plain static SVG, as
agent-tool requires, on its 2-unit grid so the 16-pixel icon stays sharp, and in greys.

## Setup

Install the Bun and Node.js versions pinned in `mise.toml`, and Google Chrome for the
browser suites. Local checks and CI use the same Node.js LTS release; the published
package continues to support Node.js 22+. Then:

```sh
mise install
bun install --ignore-scripts
bun run hooks:install
```

## Checks

```sh
bun run check
```

The runner checks managed skill and harness permission drift, tool configuration and
dependency advisories (`bun audit`), typechecks the repository
(`tsc --noEmit`), verifies the vendored engine and license (`vendor:three --check`),
and checks the reference excerpts and skyline-loading trace, in order.
It then builds the package, which builds `dist/`, renders the site's favicons into it, starts its
own temporary server, and runs every suite in `tests/` under `bun test` — the attribution, hook,
timings, merge guard, deploy verification, deploy secrets loader, local dependency runtime,
grayscale, skyline-loading, favicon, search indexing, package, building kit, and indexed raycast
suites, and the browser suites against the compiled site — closing the server afterward. Suites run
as many at a time as the machine has pairs of cores, longest first, and one at a time on CI
(`CI=true`); each one's output prints whole when it ends, and the run reports every failing suite
before it fails.
CI's Chrome draws WebGL in software, many times slower than a desktop's, so give a browser test a
timeout of at least twice its time in the publish run's log.
The package suite reads the package the runner built (`SKYLINE_PACKAGE_BUILT`) rather than
rebuilding `dist/` under the browser suites. A suite missing from the list in `scripts/testing/check.ts`
stops the run before it starts.
The advisory audit requires registry access, so the full check cannot run offline;
any advisory or registry failure blocks publishing as explained in [Releases](package.md#releases).

For agent sessions, keep full command output in the shared harness's private local
log and show only its status, duration, and log path:

```sh
SKYLINE_BASE_SHA=<fetched-base-commit> bun run agent:run --label skyline-check -- bun run check
bun run agent:run --label push -- bun run agent-tool branch push <reviewed-head> --remote origin
bun run agent:logs <log-path>
```

The wrapper preserves exit status and shows a bounded failure excerpt. It runs
the same checks and hooks as the original command. `branch push` refuses unless
the clean feature branch's HEAD is the reviewed commit, pushes it to the
same-named remote branch through normal hooks, and verifies the local and remote
heads afterward. Inspect the saved output when diagnosing a failure; keep review
verdicts and findings visible. Print the [session timing table](#timings)
separately for the shipping report.

Together they cover:

- push-hook skill drift detection and the building-fidelity skill copies;
- that `src/models/skyline-reference.svg` still regenerates from its source groups;
- the building kit's closed solids and analytic normals, and each fitted model's covered
  omissions and freedom from same-facing coplanar faces across its meshes;
- SVG/WebGL hover regions and illumination;
- that every page carries a robots noindex meta tag and names no canonical URL, and that the
  deployed site's `_headers` sends `X-Robots-Tag: noindex, nofollow` while the package carries none;
- both 3D studies, every mapped building's detail framed in each view, and the 3D skyline's
  context menu and detail panel;
- the package's tarball and the viewer it mounts in a host's page: styles kept apart both
  ways, presses and keys, remounts, two instances, destroying while it loads, failures, and
  sharing the host's Three.js;
- sixty-four camera landmarks against the source SVG at desktop, tablet, and mobile sizes, with
  mullion, fin, pier, rib and louver alignment and each drawn column standing proud as the first
  surface along its sight line;
- independent building highlights and building occlusion, visible geometry at both zoom limits,
  camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile
  touch, existing viewer modes, and failure messages;
- that every colour is a grey, except the photograph `src/skyline.jpg` and the colour trial's
  palette, `src/models/colour-palette.ts`;
- that the colour trial's materials table matches every building's batches and tones, that its
  sourced buildings measure every material they use and show those colours, that their audits
  record each measured colour, and that it restores the greys exactly
  (`tests/colour-materials.test.ts`);
- that the colour trial's panorama fit holds and gives each wall sample to its building and face
  (`tests/panorama-owners.test.ts`), and that its shaded fronts' estimates and its close-ups'
  calibrated colours follow from their recorded medians (`tests/colour-shade.test.ts`).

Screenshots are written to `/tmp/skyline-3d-*.png` and `/tmp/skyline-group-*.png`.

Run the geometry suite alone with `bun test tests/building-kit.test.ts`. To run one browser suite
against an existing server, run `bun run build:site` first (the suites exercise the compiled site
and its `dist/` fallback pages), serve `dist/`, then use, for example,
`bun test tests/building-hover.test.ts`, `tests/building-study.test.ts`,
`tests/building-detail.test.ts`, or `tests/skyline-study.test.ts`. `SKYLINE_TEST_URL` overrides the
default `http://127.0.0.1:8000`.

Whitespace checks always cover staged and unstaged work. During branch review, supply
`SKYLINE_BASE_SHA=<fetched-base-commit>`, a full forty-character SHA, to include the committed diff
from that exact base; Skyline requires this form before shipping.

### Timings

`bun run check` times every step, prints a table when it finishes, and appends the run to
`skyline-timings.log` in the Git common directory — per clone, never committed. A run that fails
records too: the run that died is the one whose breakdown is worth reading, and its failing step is
marked. Suites run side by side, so their rows add up to more than the total.

```
step                   seconds
──────────────────────────────
whitespace                 0.3
typecheck                 14.2
test:building-kit        428.4
...
total                    512.5
```

`bun scripts/testing/show-timings.ts` reads the log back, printing the last run's steps and, once a branch
has more than one run, a line per run. `--since <iso>` bounds it to one session, which is what
`ship-pr` passes: a resumed or reused branch carries earlier runs too, and reporting one of those
as the latest would show an old success for an attempt that failed before it ever checked.
`--branch <name>` reads another branch's runs and `--all` ignores the branch. Skyline's shipping
policy requires printing it at completion, because a shipping run drives the checks once as
preflight and again after every review repair, and that loop is the slowest thing between finishing
work and a merged PR.

Durations come from a monotonic clock and only the timestamp from the wall clock, so a clock
correction during a run cannot produce a negative step. `tests/timings.test.ts` drives both clocks
itself, so a timing test does not depend on timing.

## Git hooks

```sh
bun run hooks:install
bun run hooks:check
```

The pinned agent-tool installs declared regular files from `agent-tool.json` into
Git's effective hook directory. It honors repository/worktree `core.hooksPath`,
overrides an inherited global path locally, preserves unrelated hooks, and backs
up replacements without writing through symlinks. It tracks ownership in
`.agent-tool-hooks.json`; installer mechanics and safety tests live in agent-tool.
For a clone with Skyline's previous installer, inspect the existing copies and
run `bun run hooks:install --adopt` once. The installer backs them up. Old
`.skyline-installed` and unused `check-signed-commits.ts` files are inert legacy
sidecars; archive them after inspection, never remove unrelated hooks.

The hooks and attribution checker compare their installed copies with their
tracked sources. An installed copy of `agent-tool.json` also must match before
any check runs. This stops worktree policy changes silently weakening installed
gates; reinstall explicitly after edits. Shared checks run the exact package in
`node_modules`, refreshed by `bun install --ignore-scripts`.
Hooks resolve Bun from PATH, then `mise which bun`, and fail with setup instructions
when neither works. Integration tests invoke real commits/pushes under isolated
PATHs, including GUI-style runtime resolution, rather than treating any rejection
as proof the intended check ran.

`commit-msg` refuses Claude/Anthropic coauthor and generated-with lines; human
coauthors pass. Skyline retains `scripts/checks/check-coauthors.ts` because its
whole-word, line-anchored grammar permits names such as Claudette and
`notanthropic.com`, permits prose discussing the policy, and catches whitespace
before a trailer's colon. The pinned shared attribution grammar differs, so its
attribution options remain disabled here. The local checker accepts
`--message <file>` or `--range <revisions...>`; its behavioral fixtures remain.

`pre-push` always checks managed skills and the generated harness permission rules,
including tags and deletions. It checks every non-deleted destination branch through
shared `branch check --pre-push`, then checks attribution and shared signature policy for
incoming commits.
Conventional `<type>/<topic>` names are required except `main` and `master`,
with no extra length cap. CI passes its actual ref name directly instead of
changing the checkout to validate it. Detached local checks (such as `git bisect`) skip only the implicit branch-name
check; push destinations remain validated. In CI, `CI=true` skips that local check
and the workflow validates its explicit ref name.

Signatures require presence and reject provably bad signatures, without requiring
every contributor's key locally. The configured `present` mode accepts G/U/E/X/Y/R;
N passes only with a nonempty raw `gpgsig` or `gpgsig-sha256` header. It does not
establish signer identity/trust. Sign an unsigned HEAD with
`git commit --amend -S --no-edit`, or rewrite older commits using `--gpg-sign`.

Existing branches scan `<remote-sha>..<local-sha>`. New branches on a configured
remote scan commits not reachable from that remote's tracking refs. URL pushes
or an advertised destination tip missing locally conservatively scan all history.
Fetch the destination first: tracking refs are a snapshot, and unrelated remote
refs must not hide incoming commits. A distinct remote push URL is not detected.
Whole-history scans reject Skyline's old unsigned commits (`13115751adbf` and
`6344d9481d01`); they are not exempt when included in a scan. These local gates
catch mistakes; deliberate `--no-verify` bypass is outside their trust boundary.

## PR workflow

The exact `@a2f0/agent-tool` dependency supplies the managed shipping skills and
[shared workflow commands](https://github.com/a2f0/agent-tool/blob/main/docs/workflows.md).
Use `ship-pr` for commit/review/repair/merge/cleanup, or `open-pr` to stop at an
open PR. Keep Skyline requirements in `AGENTS.md`, and shared mechanics in the
managed skills. `bun run agent-tool doctor` checks review CLI compatibility;
`config show` reports the effective data-only policy.

`bun run agents:sync` refreshes regular-file skill copies in `.agents/skills` and
`.claude/skills`, with ownership recorded in `.agent-tool-skills.json`, then
regenerates the harness permission rules: `.claude/settings.json` for Claude Code
and `.codex/rules/agent-tool.rules` for Codex, with ownership recorded in
`.agent-tool-permissions.json`. The rules allow routine agent-tool commands and
ask before merging, publishing, adding dependencies or changing permissions, as
agent-tool's
[permissions guide](https://github.com/a2f0/agent-tool/blob/ca698ad954ed489dbeba618e20887448f1e2a5cd/docs/permissions.md)
describes. `permissions.executables` in `agent-tool.json` classifies the installed
CLIs that `bun run agent-tool bun x <name> -- <args>` runs: `tsc` is `local`
(allowed) and `wrangler` is `release` (asks), since it deploys. Never edit managed
or generated copies. Commit them with the exact dependency and lockfile whenever
upgrading, and rerun `agents:sync` after changing `permissions`. `agents:check`
checks drift in the full gate, and the pre-push hook runs the same skill and
permission checks.
The separate Skyline-owned `building-fidelity` copies remain identical and are
covered by their own test.

Every shipped PR bumps the package above the pinned base, because each merge
publishes it. Run `versions prepare <base-sha>` after integration/repair and before
each independent review. The shared tool owns branch creation/pushing, live
repository/PR context, CI waiting, exact-head/base preflight and merge mutation.
Skyline has no PR CI; an explicitly empty rollup is expected, while any reported
checks must still pass. Base movement requires fresh integration, validation,
version preparation and review.

Merge via `bun scripts/git/merge-pr.ts <reviewed-head> <base-branch> <reviewed-base-sha>`.
This adapter invokes shared preflight immediately before merge and adds Skyline's
required post-merge verification: the same PR and reviewed HEAD must be MERGED,
and the stored squash commit must contain exactly the title with its PR-number
suffix. Local tests cover this adapter; shared checkout/CI/version guard tests
live in agent-tool.

Skyline's cleanup requires an expected-SHA lease when deleting a remote feature
branch. Use the sequence in `AGENTS.md`; generic REST cleanup cannot atomically
bind deletion to that SHA. Preserve moved refs, keep normal hooks, and verify the
squash tree before deleting the local branch. Reinstall dependencies/hooks after
returning to the updated default branch. Verify npm workflow and tarball with
shared `release verify`; Cloudflare deployment remains manual.

The parallel check runner keeps its local timing adapter because it owns a
temporary server, interdependent build artifacts and bounded concurrent suites.
Sequential `run-group` cannot replace that orchestration. Session timing reports
remain mandatory, including failed runs and after branch cleanup.

## Updating dependencies

This section is the maintenance record for reusable procedures and active
constraints. Update entries in place and remove resolved ones; link supporting
evidence and the condition for revisiting an exception. Record each run's selected
versions, audits, validation, warnings, previews, and held groups in its upgrade
PR, rather than appending a journal here or in README. Historical audit results
are not fresh findings. Keep private logs, credentials, state, and plans out of
public reports.

Invoke `$update-dependencies` in Codex or `/update-dependencies` in Claude Code.
The managed skill inventories package and toolchain dependencies, CI pins and
infrastructure providers, follows upstream migrations and validates compatible
groups before shipping. The test and pack jobs install Bun and Node from
`mise.toml`; keep `packageManager` and the isolated npm publisher's Node pin
aligned with it. The pack job disables the tool cache because its output goes
to the trusted publisher. CI additionally tests the packed package on its Node 22 support
floor. Locally, put an installed Node 22 release first on `PATH` and run
`bun run check:package` for that check. The optional package peer remains the supported r186 series;
regenerate its standalone browser bundle with `bun run vendor:three` when the
engine or bundler changes, following [`src/vendor/README.md`](../src/vendor/README.md).

### Native dependency compatibility

Update Wrangler, Miniflare, workerd and Sharp as one owning group. Keep the
selected Sharp and native librsvg versions above the patched minimums in
[GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
`tests/dependency-runtime.test.ts` checks the actual Miniflare-resolved versions
and exercises its offline Images binding under Node: decoding SVG, resizing to
PNG, and checking dimensions and pixel bytes through Sharp's native runtime.
It creates no remote bindings. Require that regression and `bun audit` to pass
before changing this group; prefer an owning release that selects the fixed
dependency naturally over a transitive override.

Miniflare 5.20261019.1-beta pins Undici 7.29.1, so a scoped override selects
7.30.1 for the EventSource, integrity-token and content-encoding fixes
([Undici security release](https://github.com/nodejs/undici/releases/tag/v7.30.1)).
Remove it when Wrangler's Miniflare selects a patched Undici directly, after the
dependency runtime suite, deployment preview and audit pass. The override affects
development tooling only; the published viewer does not use Undici.

Infrastructure updates require a real, complete, non-destructive preview with the
proposed versions. Do not apply or deploy during an upgrade unless separately
authorized. Terraform needs its R2 state backend and the credentials in `.secrets/prod/`,
including the `TF_STATE_*` state key in `app.env` ([The custom domain](deploying.md#the-custom-domain));
absent credentials or a plan that destroys or replaces a resource means retaining that
compatibility group's existing versions and reporting it.
For Wrangler, run `bun run deploy --dry-run`, then separately compare the account, Worker, routes,
custom domain and bindings with the existing deployment: a bundle dry run alone
does not prove resource safety. Cloudflare deployment is manual and separate
from the merge's npm release. See [Deploying](deploying.md).

## Updating the drawing

These directions were written for Inkscape 1.1 on macOS.

1. Save the skyline as `skyline.svg` with the original skyline as the background.
2. Go to `File -> Save As...` and save it somewhere outside the repo, e.g. `/tmp/skyline.svg`.
3. Delete the `JPEG` layer.
4. Draw a square to clip the boundaries of the image.
5. Align the square over the mask:
   1. Duplicate the X and width of the landscape.
   2. Select the mask first and landscape second, then align bottom edges.
6. Group all of the skyline objects under the clipping rectangle.
7. Select the skyline group first and clipping rectangle second.
8. Go to `Object -> Clip -> Set`.
9. `Select All`, then go to `File -> Document Properties...` and resize the page to drawing or
   selection.
10. Save the image as `/tmp/skyline.svg` again.
11. Change the `preserveAspectRatio` to `xMidYMin meet`.
12. Move the file into its final location in `src/`.

`skyline-animated.svg` owns the building labels and paint groups the viewer and the WebGL prototype
consume; preserve path geometry and draw order when changing hover ownership, as
[Building labels](building-labels.md) describes.
