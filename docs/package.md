# Using Skyline as a package

`chicago-skyline` provides the complete viewer and separate Three.js scene/building
modules. Package builds emit ordinary ESM JavaScript and TypeScript declarations;
tarball consumers do not compile repository sources or run installation scripts. Browser
code and Node/Bun build helpers have separate entrypoints.

## Build and pack

From this repository:

Use the pinned Bun version, Node.js 22+ (with npm), and Google Chrome for checks.

```sh
bun install --ignore-scripts
bun run check:package
bun pm pack --destination /tmp
```

`prepack` builds the package automatically. The result is
`/tmp/chicago-skyline-0.1.0.tgz`. To try it before publishing, install that tarball
in the consuming application:

```sh
bun add /tmp/chicago-skyline-0.1.0.tgz
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
    "postinstall": "bun node_modules/chicago-skyline/scripts/build-package.ts"
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
import { copySkylineAssets } from 'chicago-skyline/build';

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
import { mountSkyline } from 'chicago-skyline';

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
A small independent **show original** button remains available until the first
3D frame succeeds, and reappears if the graphics context is lost. The SVG stays
reachable even if WebGL, the scene document, or its bootstrap script cannot load.
Unmounting removes the entire document, its event handlers, and its WebGL context.
Imports themselves do not access `window` or `document`, so server rendering and
lazy loading are safe. Asset URLs may be relative or absolute HTTP(S) directories.

For the existing React route in `devopsrockstars`, an effect owns this lifecycle:

```tsx
import React, { useEffect, useRef } from 'react';
import { mountSkyline } from 'chicago-skyline';

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
`chicago-skyline` loads only the small mounting helper; scene geometry loads inside
the viewer when it boots. The cleanup also supports React Strict Mode's remounts.

## Import a scene or a building

For an application that owns its own renderer, install `three` from the r186
series (`~0.186.0`). `devopsrockstars` already uses a compatible version. The
complete iframe viewer does not need this peer; scene/model imports do.

```ts
import { Group } from 'three';
import { createGeographicSkyline, skylineAzimuth } from 'chicago-skyline/scene';
import { createCrainBuilding } from 'chicago-skyline/models/crain-communications';
import type { BuildingModel, StudyView } from 'chicago-skyline';

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
`chicago-skyline/models/<filename>`, without the `.js` extension. Their Three.js
objects use the consuming application's engine, so they can join its existing
scene without bundling a second engine. The caller owns rendering, controls,
resource disposal, and OpenStreetMap attribution in this mode.

`chicago-skyline/models/building-kit` exposes the same plan runs and mesh builder
used by this repository, for adding buildings. Coordinate and model assumptions
are in [the geography notes](skyline-geography.md). Asset paths are also available
through `chicago-skyline/assets/<path>` for build tooling that resolves package
files directly; bundlers do not automatically copy that directory.

## Publish later

The initial metadata keeps the existing name `chicago-skyline`, at version `0.1.0`.
No registry publication is performed by the preparation workflow. Confirm the
intended registry, package name/version, and project license before publishing;
metadata currently uses `UNLICENSED` and preserves the third-party notices in
[NOTICE.md](../NOTICE.md).

```sh
npm publish --dry-run
# When ready to publish:
npm publish
```

`prepublishOnly` runs the full repository check and `prepack` builds the artifacts.
Building requires this repository's Bun/TypeScript tools; consuming the tarball
requires neither Bun nor build scripts. This package is ESM; it has no CommonJS
entrypoint. The standalone site's `bun run build:site` and deployment flow remain
separate from packaging.
