# Three.js

`three-r186.js` bundles the selected Three.js **0.186.0** exports and OrbitControls in `three-entry.js`. It is stored locally so the study has no CDN or runtime network dependency. The bundle is about 550 KB before compression.

Source: [three.js / r186](https://github.com/mrdoob/three.js/tree/r186), distributed by the [`three` npm package](https://www.npmjs.com/package/three/v/0.186.0). License: MIT; the full notice is in `THREE-LICENSE.txt`, with upstream license comments retained in the bundle.

The geographic study also exports `OrthographicCamera` for ground plans with a
constant scale at every building height. The bundle was regenerated with the
same pinned versions below; upstream code is unchanged.

To regenerate from the repository root (Node.js required):

```sh
npm install --prefix /tmp/skyline-3d-tools --no-audit --no-fund --ignore-scripts three@0.186.0 esbuild@0.28.2
NODE_PATH=/tmp/skyline-3d-tools/node_modules /tmp/skyline-3d-tools/node_modules/.bin/esbuild src/vendor/three-entry.js --bundle --format=esm --minify --legal-comments=inline --outfile=src/vendor/three-r186.js
cp /tmp/skyline-3d-tools/node_modules/three/LICENSE src/vendor/THREE-LICENSE.txt
```

No installation or build step is required to view the checked-in study.
