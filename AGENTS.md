# Working on Skyline

This is a static site. Serve it over HTTP for WebGL and the 3D study. Runtime
assets stay local; there is no application build step. `skyline-animated.svg`
owns the building labels and paint groups consumed by `skyline-webgl.html`.
Preserve path geometry and draw order when changing hover ownership; see
`docs/building-labels.md`. The original comparison artwork is separate.

Install test dependencies with `npm ci --ignore-scripts`. Use Node.js 20+ and
Google Chrome, then run `npm run check` (or `node scripts/check.cjs`). The check
runner starts and closes its own local server and runs the merge helper tests,
building hover regressions, and both 3D study browser suites. Study pages share
`study-viewer.js`, `study.css`, and `study-loader.js`; keep model geometry and
scene-specific placement/camera presets in their own modules. Use explicit paths when
staging changes. Do not modify the vendored Three.js bundle as incidental cleanup.
For branch review/shipping, set `SKYLINE_BASE_SHA` to the fetched base commit so
whitespace checks include the committed branch diff, as well as staged and
unstaged work (which are always checked).

Deploys publish to the `devopsrockstars-skyline-prod` Cloudflare Worker at
skyline.devopsrockstars.com. `npm run deploy` stages `dist/` and uploads it; there is
still no build step, only a copy. The staged set is the allowlist in
`scripts/build-site.cjs`, because the repository root holds `.secrets/` and assets the
site never requests. Add new top-level runtime files there or they will not ship;
`models/` ships whole. `terraform/` owns only the custom-domain binding. Credentials
live in the gitignored `.secrets/root.env`; never commit one.

The PR workflow skills live in `.agents/skills`; `.claude/skills` links to the
same files. For an open-PR request use `open-pr`. For an explicit end-to-end
shipping request use `ship-pr`, including its review/repair and merge steps.
Read the selected skill before running it. There are no managed Git hooks.
