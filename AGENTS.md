# Working on Skyline

This is a static site. Serve it over HTTP for WebGL and the 3D study. Runtime
assets stay local; there is no application build step. `skyline-animated.svg`
owns the building labels and paint groups consumed by `skyline-webgl.html`.
Preserve path geometry and draw order when changing hover ownership; see
`docs/building-labels.md`. The original comparison artwork is separate.

Install test dependencies with `npm ci --ignore-scripts`. Use Node.js 20+ and
Google Chrome, then run `npm run check` (or `node scripts/check.cjs`). The check
runner starts and closes its own local server and runs the merge helper tests,
building hover regressions, and 3D study browser checks. Use explicit paths when
staging changes. Do not modify the vendored Three.js bundle as incidental cleanup.
For branch review/shipping, set `SKYLINE_BASE_SHA` to the fetched base commit so
whitespace checks include the committed branch diff, as well as staged and
unstaged work (which are always checked).

The PR workflow skills live in `.agents/skills`; `.claude/skills` links to the
same files. For an open-PR request use `open-pr`. For an explicit end-to-end
shipping request use `ship-pr`, including its review/repair and merge steps.
Read the selected skill before running it. There are no managed Git hooks.
