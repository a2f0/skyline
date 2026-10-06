# Using Skyline as a package

`@a2f0/skyline` provides the complete viewer and separate Three.js scene/building
modules. Package builds emit ordinary ESM JavaScript and TypeScript declarations;
consumers of the published package do not compile repository sources or run installation
scripts. Browser code and Node/Bun build helpers have separate entrypoints.

## Install from npm

```sh
bun add --exact @a2f0/skyline
# or
npm install --save-exact @a2f0/skyline
```

Every merge to `main` publishes a new version (see [Releases](#releases)), each with npm
provenance linking it to the commit and workflow run that built it.

## Build and pack

From this repository:

Use the pinned Bun version, Node.js 22+ (with npm), and Google Chrome for checks.

```sh
bun install --ignore-scripts
bun run check:package
bun pm pack --destination /tmp
```

`prepack` builds the package automatically. The result is
`/tmp/a2f0-skyline-<version>.tgz`, named for the version in `package.json`. To try it
before publishing, install that tarball in the consuming application:

```sh
bun add /tmp/a2f0-skyline-<version>.tgz
```

The tarball includes `lib/` (ESM and declarations), `site/` (the complete static
viewer), package documentation, and third-party notices. Sources, test fixtures,
credentials, deployment configuration, and the unused source photograph are
excluded. No viewer assets load from a CDN.

## Install from GitHub with Bun

GitHub dependencies contain repository sources, rather than the generated
`lib/` and `site/` directories in a published tarball. Pin a full commit SHA:

```sh
bun add github:a2f0/skyline#<full-commit-sha>
```

Build the installed source explicitly with your application's pinned Bun and
TypeScript tools. Add this root `package.json` script so fresh installs and CI
prepare the same artifacts:

```json
{
  "scripts": {
    "postinstall": "bun node_modules/@a2f0/skyline/scripts/build-package.ts"
  }
}
```

The host needs TypeScript 7, `@tsconfig/strictest`, `@types/bun`, and `@types/node`
as development dependencies. The build resolves those tools from the host;
it does not install Skyline's development dependencies or run dependency
lifecycle scripts. Keep `trustedDependencies` unchanged. Run `bun install` after
adding the script. Both the published tarball and this GitHub build expose the
same entrypoints, declarations, and complete viewer assets.

## Copy the viewer assets

Import the build helper from a Node 22+ or Bun build script:

```ts
import { copySkylineAssets } from '@a2f0/skyline/build';

await copySkylineAssets('./public/skyline');
```

Serve that directory over HTTP at `/skyline/`, preserving all its relative paths.
The helper copies files into the supplied directory; it does not clear unrelated
files already there. Use a dedicated directory for these assets. All HTML, CSS,
SVGs, compiled browser modules, and the viewer's vendored Three.js travel together.

In `~/github/devopsrockstars`, the existing `packages/frontend/tooling/build.ts`
copies `packages/frontend/static` into its build. Its development server also
serves `/static/` directly. A later integration can call the helper with
`path.join(frontendRoot, 'static', 'skyline')` in both build and development startup,
then use `/static/skyline/` as the browser URL. Keep the generated directory out of
that application's Git history.

## Mount the complete viewer

```ts
import { mountSkyline } from '@a2f0/skyline';

const skyline = mountSkyline(container, {
  assetsUrl: '/skyline/',
  title: 'Interactive Chicago skyline',
});

// When the page or component leaves:
skyline.destroy();
```

The container determines the viewer's size and placement; give it an explicit
height. The viewer fills it through an iframe, which isolates its styles and
controls from the application's header and CSS. Embedding hides the standalone
toolbar and study links so they do not overlap the host's navigation. Set
`navigation: true` to show them. It retains stars, the traced
loading silhouette, star controls, original comparison, and building details.
The scene's control bar starts folded behind its star; set `controls: 'open'` to
start it open, with no fold, from its first frame. Visitors can still fold it.
Open, the bar shows the camera hint and the OpenStreetMap credit for the streets
and footprints. Set `attribution: false` to leave the credit out. OpenStreetMap's
[licence](https://www.openstreetmap.org/copyright) requires crediting its contributors
wherever its data is shown, so do this only when the host page credits
© OpenStreetMap contributors itself.
A small independent **show original** button remains available until the first
3D frame succeeds, and reappears if the graphics context is lost. The SVG stays
reachable even if WebGL, the scene document, or its bootstrap script cannot load.
Unmounting removes the entire document, its event handlers, and its WebGL context.
Imports themselves do not access `window` or `document`, so server rendering and
lazy loading are safe. Asset URLs may be relative or absolute HTTP(S) directories.

For the existing React route in `devopsrockstars`, an effect owns this lifecycle:

```tsx
import React, { useEffect, useRef } from 'react';
import { mountSkyline } from '@a2f0/skyline';

export default function Skyline() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const skyline = mountSkyline(container.current!, {
      assetsUrl: '/static/skyline/',
    });
    return () => skyline.destroy();
  }, []);

  return <div id="skyline" ref={container} style={{ width: '100%', height: '100vh' }} />;
}
```

Keep the host's header, footer, sizing, and stacking in that application. Importing
`@a2f0/skyline` loads only the small mounting helper; scene geometry loads inside
the viewer when it boots. The cleanup also supports React Strict Mode's remounts.

## Import a scene or a building

For an application that owns its own renderer, install `three` from the r186
series (`~0.186.0`). `devopsrockstars` already uses a compatible version. The
complete iframe viewer does not need this peer; scene/model imports do.

```ts
import { Group } from 'three';
import { createGeographicSkyline, skylineAzimuth } from '@a2f0/skyline/scene';
import { createCrainBuilding } from '@a2f0/skyline/models/crain-communications';
import type { BuildingModel, StudyView } from '@a2f0/skyline';

const skyline = createGeographicSkyline();
const group = new Group();
for (const model of skyline.models) group.add(model.building);
group.add(skyline.ground.group);

const crain: BuildingModel = createCrainBuilding();
const view: StudyView = skyline.drawingView;
```

The scene factory returns models, ground, camera/framing settings, drawing view,
comparison views, and labels. Importing a module does not construct the scene.
Create it when needed. Individual building modules remain available under
`@a2f0/skyline/models/<filename>`, without the `.js` extension. Their Three.js
objects use the consuming application's engine, so they can join its existing
scene without bundling a second engine. The caller owns rendering, controls,
resource disposal, and OpenStreetMap attribution in this mode.

The geographic Blue Cross model exposes an optional `illumination`
controller; no other model has one. Its read-only `presets` list gives the
supported IDs, labels, wording and adaptation flag. Call `set(id)` to replace
its message or `set(null)` to turn it off, then render your scene. An
unsupported ID throws without changing the current display. `active` reports
the selection and `litWindows` counts illuminated office panes. Each instance
has its own state. Use the model from `createGeographicSkyline()` or
`createGeographicBuilding()` for these displays.

`@a2f0/skyline/models/building-kit` exposes the same plan runs and mesh builder
used by this repository, for adding buildings. Coordinate and model assumptions
are in [the geography notes](skyline-geography.md). Asset paths are also available
through `@a2f0/skyline/assets/<path>` for build tooling that resolves package
files directly; bundlers do not automatically copy that directory.

## Releases

ship-pr bumps the `package.json` patch version on every merge (see
[the PR workflow](development.md#pr-workflow)), and the
[publish workflow](../.github/workflows/npm-publish.yml) publishes each version newer than
npm's `latest` with [trusted publishing](https://docs.npmjs.com/trusted-publishers) and
provenance. No npm token is stored: the publish job runs in the `npm` environment, which
only `main` can deploy to, and npm's trusted publisher names that environment and
`npm-publish.yml`. A deliberate major or minor bump in a PR is kept. Runs on `main` never
overlap, and when merges land together only the newest pending run starts, so intermediate
versions can be skipped on npm.

The workflow first runs the full `bun run check`, browser suites included, in the runner's
Google Chrome. Only when that passes does it build and pack the tarball; both jobs run without
publish rights, and the publish job receives only that tarball and runs
`npm publish --ignore-scripts`. Dispatching the workflow on another branch
(`gh workflow run npm-publish.yml --ref <branch>`) runs only the tests, in a queue of its own,
so it never displaces a pending publish.

npm adds a trusted publisher only to a package that already exists, so the first version
is published by hand from an up-to-date `main`. Until then the workflow fails with that
instruction rather than attempting a publish npm would reject:

```sh
npm login
npm publish   # prepublishOnly runs bun run check; prepack builds lib/ and site/
```

Then, in the package's settings on npmjs.com, add a GitHub Actions trusted publisher for
repository `a2f0/skyline`, workflow `npm-publish.yml`, and environment `npm`, and re-run
the workflow; it reports the version as already published.

The package is ESM only, with no CommonJS entrypoint. Building requires this repository's
Bun/TypeScript tools; consuming the published package requires neither Bun nor build
scripts. Metadata uses `UNLICENSED` and preserves the third-party notices in
[NOTICE.md](../NOTICE.md). The standalone site's `bun run build:site` and Cloudflare
deployment flow remain separate from packaging.
