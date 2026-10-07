# Three.js

`three-r186.js` bundles the selected Three.js **0.186.1** exports and OrbitControls in `three-entry.js`. It is stored locally so the study has no CDN or runtime network dependency. The bundle is about 550 KB before compression.

Source: [three.js / r186](https://github.com/mrdoob/three.js/tree/r186), distributed by the [`three` npm package](https://www.npmjs.com/package/three/v/0.186.1). License: MIT; the full notice is in `THREE-LICENSE.txt`, with upstream license comments retained in the bundle.

The geographic study also exports `OrthographicCamera` for ground plans with a
constant scale at every building height. The bundle is generated from the exact
`three` and `esbuild` development dependencies in the root `package.json` and
`bun.lock`; imported package models instead share the host application's compatible
r186 engine. `@types/three` remains at the matching r186 declaration release.

To regenerate from the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run vendor:three
bun run check
```

`scripts/vendor-three.ts` bundles `three-entry.js` as minified ESM, preserves
upstream legal comments, and copies the installed Three.js license. Regenerate
this checked-in bundle whenever its pinned engine or bundler changes. Patch
releases keep the `three-r186.js` import path; moving to another r-series also
requires migrating its declarations, source imports, build allowlist, package
peer range and tests using the upstream migration guide.

No installation or build step is required to view the checked-in study.
