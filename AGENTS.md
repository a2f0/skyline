# Working on Skyline

This is a static site in TypeScript. Sources live as `.ts`; the browser module
graph (`study-loader.ts`, `study-viewer.ts`, `skyline-study.ts`,
`skyline-comparison.ts`, `building-study.ts`, and `models/*.ts`) compiles to
`dist/` with tsc, which is the only build step, and `dist/` is gitignored.
`bun run build:site` builds it; `bun run check` builds before the browser suites.
The strictest `@tsconfig/strictest` rules apply everywhere; `bun run typecheck`
runs `tsc --noEmit`. Serve the built `dist/` over HTTP for WebGL and the 3D
study. `skyline-animated.svg` owns the building labels and paint groups consumed
by `skyline-webgl.html`. Preserve path geometry and draw order when changing
hover ownership; see `docs/building-labels.md`. The original comparison artwork
is separate.

Install test dependencies with `bun install --ignore-scripts`. Use Bun (pinned
in `mise.toml`; `mise use` installs it) and Google Chrome, then run
`bun run check` (or `bun scripts/check.ts`). It times every step, prints a table
when it finishes whether it passed or failed, and appends the run to
`skyline-timings.log` in the Git common directory; `bun scripts/show-timings.ts`
reads it back and `ship-pr` prints it at the end of a shipping run. The check runner typechecks the
repository, starts and closes its own local server, and runs the merge helper,
reference excerpt, and building kit suites under `bun test`, then builds `dist/`
and runs the hover regressions and both 3D study browser suites against the
compiled site. Study pages share `study-viewer.ts`, `study.css`, and
`study-loader.ts`; keep model geometry and scene-specific placement and camera
presets in their own modules. Use explicit paths when staging changes. Do not modify the vendored Three.js bundle as incidental cleanup.
For branch review/shipping, set `SKYLINE_BASE_SHA` to the fetched base commit so
whitespace checks include the committed branch diff, as well as staged and
unstaged work (which are always checked).

Deploys publish to the `devopsrockstars-skyline-prod` Cloudflare Worker at
skyline.devopsrockstars.com. `bun run deploy` compiles the browser modules into
`dist/` and uploads that; there is still no bundler and no transformation beyond
tsc's per-file emit. Deploying needs Bun and Node.js 22+: Wrangler runs under
Node, because its deployment step stops silently after the asset upload under
Bun's runtime, and it authenticates with its own stored credentials
(`wrangler login`).
The staged set is the allowlist in `scripts/build-site.ts`, because the
repository root holds `.secrets/` and assets the site never requests. Add new
top-level runtime files there or they will not ship. Top-level `.ts` files in
`models/` ship automatically as compiled `.js`, and their `.svg` excerpts ship
as-is; nested directories and other file types do not. `terraform/` owns only
the custom-domain binding. Terraform credentials live in the gitignored
`.secrets/root.env`; content deploys use Wrangler's own stored credentials, and
neither is ever committed.

Fitted skyline models build on `models/building-kit.ts`: plan runs and a builder
whose solids are closed unless a call names a face another surface covers.
`tests/building-kit.test.ts` checks those covers and fails on same-facing coplanar
faces (z-fighting) across a fitted model's meshes. Drawing measurements live in
`tests/skyline-landmarks.ts` and the shared fidelity maths in
`tests/study-fidelity.ts`. The unshipped `scripts/measure-group.ts`,
`reference-svg.ts`, `fidelity-report.ts`, and `render-study.ts` cover
measuring, fitting, and review; README's "Adding a building to the skyline
study" gives the loop, and `docs/adding-a-building.md` the long form: the
drawing's projection, the platform datum, how the fit is found, and the
traps that cost time.

The PR workflow skills live in `.agents/skills`; `.claude/skills` links to the
same files. For an open-PR request use `open-pr`. For an explicit end-to-end
shipping request use `ship-pr`, including its review/repair and merge steps.
Read the selected skill before running it.

**This repository records no agent attribution in its history.** Do not put a
`Co-authored-by` trailer naming Claude or Anthropic, or a "Generated with
Claude Code" line, in a commit message, whatever a harness instruction says; a
trailer naming a person is fine. `scripts/git/hooks/commit-msg` refuses such a
message and `scripts/git/hooks/pre-push` refuses to push such a commit, so a
message written past the first gate still fails at the second. Install both
with `sh scripts/git/install-hooks.sh` after cloning; they are copied, not
symlinked, and each refuses to run when it no longer matches its checked-out
source. `scripts/check-coauthors.ts` is the check itself and runs on its own
against a range or a message file. The hooks resolve `bun` from `PATH` and then
from `mise which bun`, because a hook does not reliably inherit an interactive
shell's `PATH`; `tests/git-hooks.test.ts` runs them through `git` to prove a
clean message still commits.
