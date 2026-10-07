# Development

Sources are TypeScript under `@tsconfig/strictest`. The browser modules compile to `dist/` with
tsc, the only build step; there is no bundler. `AGENTS.md`, which Claude Code, Codex, and OpenCode
read directly, is the repository's policy for agents and holds the shipping rules; this page
explains the tooling behind it.

## Layout

| Path | Holds |
| --- | --- |
| `src/` | The site: pages, styles, drawings, browser and package entry modules, and their build configs |
| `src/models/` | Building models, the shared building kit, and the drawing excerpts they were fitted to |
| `src/vendor/` | The vendored Three.js bundle, its declarations, and its license |
| `scripts/` | Build, check, deploy, and measuring tools, and the Git hooks |
| `tests/` | Unit and browser suites and the shared fidelity measurements |
| `docs/` | Topic documentation, building reference audits, and fidelity evidence |
| `terraform/` | The custom-domain binding |

`src/` also keeps the drawing's sources, `skyline.svg` and the photograph `skyline.jpg` it links,
which the site never requests. The root holds only repository configuration. Builds write
`dist/` (the site), `lib/` and `site/` (the package); all three are gitignored.

## Setup

Install the Bun and Node.js versions pinned in `mise.toml`, and Google Chrome for the
browser suites. Local checks and CI use the same Node.js LTS release; the published
package continues to support Node.js 22+. Then:

```sh
bun install --ignore-scripts
sh scripts/git/install-hooks.sh
```

## Checks

```sh
bun run check
```

The runner checks managed skill drift and tool configuration, typechecks the repository
(`tsc --noEmit`), and runs the attribution, hook, timings, merge guard, deploy verification,
local dependency runtime, grayscale, skyline-loading, package, reference excerpt, and building kit
suites under `bun test`.
It then builds `dist/`, starts its own temporary server, and runs the browser suites against the
compiled site, closing the server afterward.

Together they cover:

- push-hook skill drift detection and the building-fidelity skill copies;
- that `src/models/skyline-reference.svg` still regenerates from its source groups;
- the building kit's closed solids and analytic normals, and each fitted model's covered
  omissions and freedom from same-facing coplanar faces across its meshes;
- SVG/WebGL hover regions and illumination;
- both 3D studies, every mapped building's detail framed in each view, and the 3D skyline's
  context menu and detail panel;
- sixty-four camera landmarks against the source SVG at desktop, tablet, and mobile sizes, with
  mullion, fin, pier, rib and louver alignment and each drawn column standing proud as the first
  surface along its sight line;
- independent building highlights and building occlusion, visible geometry at both zoom limits,
  camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile
  touch, existing viewer modes, and failure messages;
- that every colour is a grey, except the photograph `src/skyline.jpg`.

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
marked.

```
step                   seconds
──────────────────────────────
whitespace                 0.3
typecheck                 14.2
test:building-kit        428.4
...
total                    512.5
```

`bun scripts/show-timings.ts` reads the log back, printing the last run's steps and, once a branch
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

Two hooks keep agent attribution out of the history, and `pre-push` also checks managed skill drift
in the current checkout. Install them after cloning with `sh scripts/git/install-hooks.sh`; they are
not installed for you. Pushes (including tags and branch deletions) also need
`bun install --ignore-scripts` in the current checkout or linked worktree.

`commit-msg` refuses a message carrying a `Co-authored-by` trailer that names Claude or Anthropic,
or a "Generated with Claude Code" line, and `pre-push` refuses to push a commit carrying either, so
a message written past the first gate still fails at the second — including one committed with
`--no-verify`. A `Co-authored-by` trailer naming a person passes, and so does prose that describes
this rule: both patterns anchor at the start of a line, because attribution is a line in its own
right rather than a phrase. The match is on whole words, so a colleague called Claudette or an
address at `notanthropic.com` passes; one actually named Claude, or writing from an `anthropic.com`
address, does not. A line that *opens* with the generated-with phrase is attribution even behind a
bullet or a blockquote, so a sentence beginning that way is rejected as well. Nothing in a message
can distinguish them, and the check errs toward refusing: a false positive costs one reword, a
false negative puts the line in the history permanently. `scripts/check-coauthors.ts` is the check
itself and runs on its own against a range (`--range main..HEAD`) or a message file
(`--message <file>`); `tests/check-coauthors.test.ts` covers it, including that a usage slip fails
rather than reading as a clean check.

The hooks resolve `bun` from `PATH`, then from `mise which bun`, and otherwise stop with the
command to fix it. A hook does not reliably inherit an interactive shell's `PATH` — a GUI Git
client or a shell without mise activated does not carry one — and a hook that simply fell through
to `bun: not found` would refuse every commit, which reads exactly like a check that is working.
`tests/git-hooks.test.ts` runs the installed hooks through `git` for that reason: it covers all
three resolutions, and asserts that a clean message commits, which is the only thing that proves
the hook reached the check rather than dying before it.

### How the installer works

The installer and the hook layout are cannibalized from [tearleads](https://github.com/a2f0/tearleads),
whose `scripts/checks/checkCommitTrust.sh` rejects every `Co-authored-by` trailer and also requires
signed commits. This repository takes neither: it rejects only the agent attribution, and does not
require signatures.

- The hooks **and the attribution check they call** are copied, not symlinked, and the
  attribution gate runs the installed check. Each installed hook and the attribution checker
  compares against its checked-out source and refuses to run when they differ, so rerun the
  installer after changing either. The managed-skill gate runs the commit-pinned package from
  `node_modules`, refreshed by `bun install --ignore-scripts`; the source comparison does not cover
  that shared checker.
- It replaces a symlinked hook rather than copying through it, and keeps two backups:
  `<name>.bak` holds whatever was there before the installer ever ran and is never overwritten,
  and `<name>.bak.previous` holds the most recent thing it replaced after that.
- It refuses a `core.hooksPath` that resolves back inside `scripts/`, where installing would
  delete its own source, and removes only hooks a previous run of itself installed — recorded in a
  manifest, and backed up first — so a hook renamed here stops running while an unrelated
  `pre-commit` is left alone.
- It installs where Git will actually look: a `core.hooksPath` this repository set for itself is
  honoured, one inherited from outside it is overridden locally, and it verifies the effective path
  before reporting success, because an installer that reports success while Git looks elsewhere is
  a gate that fails open. With nothing inherited it records no path at all, since a moved or
  renamed clone silently invalidates an absolute one.

### What `pre-push` scans

`pre-push` scans `<remote-sha>..<local-sha>` for a branch the remote already has. For one it does
not, it scans `<local-sha> --not --remotes=<that remote>` — what the push transfers, as far as the
local tracking refs know. Those are a snapshot: a branch built on history the remote has since
deleted or rewritten, and that has not been fetched or pruned here, can reintroduce a commit this
excludes. Subtracting local `main` instead would miss an offending commit sitting unpushed on
`main` and carried along by any branch descending from it, and pushing `main` itself would scan
nothing at all. A push straight to a URL, or to a branch whose advertised tip this clone has never
fetched, names nothing whose tracking refs describe that destination, so the whole branch is
scanned: that can refuse a commit already published elsewhere, where subtracting some other
remote's refs would let one through. A remote whose `pushurl` differs from its fetch URL has the
same mismatch and is not detected.

None of this stops someone who means to bypass it: `--no-verify` skips both hooks, and the gates
are there to catch a mistake rather than to defeat an intent.

## PR workflow

The [`@a2f0/agent-tool`](https://github.com/a2f0/agent-tool) dev dependency, pinned to an exact npm
version, supplies the `ship-pr`, `open-pr`, `cross-agent-review`, `squash-merge`, `reset`,
and `update-dependencies` skills. Invoke `$ship-pr` in Codex or `/ship-pr` in Claude Code to
commit, independently review and repair, open or resume the PR, squash-merge the reviewed
commit, and return to updated `main`;
`$open-pr` or `/open-pr` stops with an open PR. Requested report-only reviews or keeping the
feature branch are honoured.

`bun run agents:sync` installs the package's skills as regular files in both `.agents/skills` and
`.claude/skills`, tracked by `.agent-tool-skills.json`; do not edit those copies. `bun run
agents:check` verifies them without changing anything, and the full check and the installed push
hook include that gate. If a new skill does not appear, restart the agent session. For an upgrade,
update the `@a2f0/agent-tool` version, run `bun install --ignore-scripts` and `bun run agents:sync`,
then commit `package.json`, `bun.lock`, both skill directories, and the manifest together.
`building-fidelity` is Skyline's own skill, outside that manifest; see the
[fidelity queue](building-fidelity.md).

`bun run agent-tool doctor` checks reviewer CLI compatibility; `bun run agent-tool config show`
displays the effective policy from `agent-tool.json`. The shared tool owns review isolation, PR
creation, CI enforcement, and the merge mutation; repository hooks retain the attribution policy.

Every shipped PR bumps the package version, because every merge releases the package to npm
([Releases](package.md#releases)). `agent-tool.json` versions the root package, so ship-pr runs
`bun run agent-tool versions prepare <base-sha>` against the pinned base after each integration or
repair and before each review. It commits `package.json` one patch past the base as
`chore: bump package versions`; a deliberate minor or major bump in the PR is kept.

Merges go through `bun scripts/merge-pr.ts <reviewed-head> <base-branch> <reviewed-base-sha>`, a
thin wrapper that enforces checkout, head, base, ancestry, immediate merge readiness, and the
prepared version (`agent-tool versions check` against the reviewed base). It calls the shared
merge CLI with the PR title, then confirms the PR merged with its subject-only message;
`tests/merge-pr.test.ts` covers those guards. `AGENTS.md` gives the full shipping sequence,
including base-freshness checks and branch cleanup.

## Updating dependencies

Invoke `$update-dependencies` in Codex or `/update-dependencies` in Claude Code.
The managed skill inventories package and toolchain dependencies, CI pins and
infrastructure providers, follows upstream migrations and validates compatible
groups before shipping. Keep `mise.toml` runtime versions and the publish
workflow aligned. The optional package peer remains the supported r186 series;
regenerate its standalone browser bundle with `bun run vendor:three` when the
engine or bundler changes, following [`src/vendor/README.md`](../src/vendor/README.md).

### Temporary security override

Wrangler's Miniflare dependency pins Sharp 0.35.4, which includes the vulnerable
librsvg described in [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
The root `miniflare>sharp` override selects the maintainer's patched 0.35.5 release
for that dependency alone. Its existing image API and Node requirements remain
compatible; `tests/dependency-runtime.test.ts` exercises Miniflare's offline
Images binding under Node, decoding SVG, resizing to PNG and checking dimensions
and pixel bytes through Sharp's native runtime. It creates no remote bindings.
`bun run check` runs that regression on developer machines and publishing CI.

Keep the override until a supported Wrangler/Miniflare release selects patched
Sharp itself. Then remove it, regenerate the lockfile with Bun, and require both
`bun audit` and the runtime regression to pass. Bun's nested override requires
the pinned Bun 1.4 runtime and writes lockfile format 3; use the same pin in CI.

Infrastructure updates require a real, complete, non-destructive preview with the
proposed versions. Do not apply or deploy during an upgrade unless separately
authorized. Terraform needs the existing backend and `.secrets/root.env`; absent
credentials or a plan that destroys or replaces a resource means retaining that
compatibility group's existing versions and reporting it. For Wrangler, run
`bun run deploy --dry-run`, then separately compare the account, Worker, routes,
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
