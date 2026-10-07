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
files already there. Use a dedicated directory for these assets, and clear it before
copying an upgrade, so files a new version dropped do not linger. All the viewer's
code, CSS, markup, SVGs and models, and its vendored Three.js, travel together. Copy
them again whenever you upgrade the package, so the loader you bundle and the viewer
you serve match.

In `~/github/devopsrockstars`, `packages/frontend/tooling/build.ts` calls the helper
when the `skyline3d` flag is on and serves the copy at `/static/skyline/`, the browser
URL the viewer mounts with. Keep the generated directory out of that application's
Git history.

## Mount the complete viewer

```ts
import { mountSkyline } from '@a2f0/skyline';

const skyline = mountSkyline(container, {
  assetsUrl: '/skyline/',
  title: 'Interactive Chicago skyline',
});
await skyline.ready; // optional: the 3D skyline has drawn its first frame

// When the page or component leaves:
skyline.destroy();
```

The viewer renders into the host's own document, inside a shadow root that keeps its
styles and the host's apart. `mountSkyline` returns at once with an instance:

- `element` is the `HTMLElement` it appended to `container`: a region named by the
  `title` option (default "Interactive Chicago skyline"), with the viewer in its open
  shadow root. It fills the container, which sets the viewer's size and placement:
  give the container an explicit height. The element is `aria-busy` until `ready`
  settles.
- `ready` resolves once the 3D skyline has drawn its first frame: use it where an
  iframe's `load` event was used. It rejects when the viewer can't start: when its
  assets fail to load, the element says why in the viewer's place; when the 3D scene
  can't start, as without WebGL 2, the scene says why and the original drawing stays
  one press away. The error is also logged, so a host that ignores `ready` sees no
  unhandled rejection. A destroyed instance's `ready` never settles.
- `destroy()` removes the element and releases everything the viewer holds: its WebGL
  renderers and contexts (disposed, then lost on purpose, so remounts never exhaust
  the browser's contexts), animation frames, resize observers, media-query, pointer
  and keyboard listeners, the building detail, and loads still in flight. Calling it
  again does nothing, and destroying while the viewer still loads is safe. Unlike a
  frame, the viewer doesn't stop when its element merely leaves the page: always call
  `destroy`.

The viewer shows what the embedded viewer always has: the twinkling stars and the
traced loading silhouette, the 3D skyline with its control bar, the OpenStreetMap
credit, a small **show original** button until the first 3D frame (and again if the
graphics context is lost), so the original drawing stays reachable even if WebGL or
the scene's code cannot load, building details in a panel over the skyline, and
reduced motion. `F`, pressed inside the viewer, shows its element fullscreen.

The scene's control bar starts folded behind its star; set `controls: 'open'` to
start it open, with no fold, from its first frame. Visitors can still fold it.
Open, the bar shows the camera hint and the OpenStreetMap credit for the streets
and footprints. Set `attribution: false` to leave the credit out. OpenStreetMap's
[licence](https://www.openstreetmap.org/copyright) requires crediting its contributors
wherever its data is shown, so do this only when the host page credits
© OpenStreetMap contributors itself.

Imports themselves do not access `window` or `document`, so server rendering and
lazy loading are safe. Asset URLs may be relative or absolute HTTP(S) directories.

### Living in the host's page

- The host's styles stay out: the element sets `all: initial` and `direction: ltr` on
  itself, so nothing the host's rules set is inherited into the viewer, and the
  viewer sets its own type, colours and custom properties. Its styles stay in its
  shadow root. It lays itself out by its own size, through container queries, not the
  window's: a small window in a desktop gets the narrow layout.
- Presses and keys bubble out to the host, as any other content's do: a press inside
  the viewer reaches the host's `pointerdown` and `mousedown` listeners, so a host's
  window can raise itself and its menus close. Its keys act only where they are
  pressed: `F`, `Escape` and its arrow, zoom and menu keys work while focus is inside
  that viewer, and arrive with `defaultPrevented` set, so two viewers, or a viewer and
  the host, never take each other's keys.
- The viewer never scrolls the host page: it moves focus with `preventScroll`, and
  its building detail is a non-modal panel (`role="dialog"`, not `aria-modal`), so the
  rest of the page stays usable.
- It works wherever the host puts it: in the host's own shadow root, open or closed, and
  under a host's CSS transform, where its menus and tooltip still open at the pointer.
- Each instance is independent: two viewers can run side by side on one page.

### React

An effect owns the lifecycle. Mounting is synchronous, so React Strict Mode's mount,
destroy and mount again in development works:

```tsx
import React, { useEffect, useRef } from 'react';
import { mountSkyline } from '@a2f0/skyline';

export default function Skyline() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const skyline = mountSkyline(container.current!, {
      assetsUrl: '/static/skyline/',
      // The page already runs Three.js: share it (see below).
      three: import('@a2f0/skyline/three'),
    });
    return () => skyline.destroy();
  }, []);

  return <div id="skyline" ref={container} style={{ width: '100%', height: '100vh' }} />;
}
```

Keep the host's header, footer, sizing, and stacking in that application.

### Share the page's Three.js

The viewer's 3D scene renders with Three.js r186. By default it loads the copy in the
assets, `vendor/three-r186.bundle.js` (about 140 KB compressed), only when a scene
first needs it, so a host needs no `three` dependency. A page that already runs
Three.js would then run two engines, and Three.js warns "Multiple instances of
Three.js being imported". Such a page can share its own instead, through the `three`
option:

```ts
mountSkyline(container, { assetsUrl: '/static/skyline/', three: import('@a2f0/skyline/three') });
```

`@a2f0/skyline/three` re-exports from the host's `three` (the optional peer,
`~0.186.0`) exactly the classes the viewer uses, and `OrbitControls`, so a bundler keeps
no more of the engine than the viewer needs; the viewer then never requests its own
copy. Pass the module, or a promise of it as above, which keeps it out of the host's
first bundle when the viewer mounts later. The page's first scene takes the engine
when its code first loads, and later instances on the page share it; if the promise
rejects, the viewer warns and loads its own copy. A host without `three` simply leaves
the option out.

### How the viewer's code loads

The package's module (`lib/`) is a small loader that a host bundles (under 4 KB). When
it mounts, it imports the viewer's code from the assets (`skyline-viewer.js`) with a
dynamic `import()` that carries `webpackIgnore`, `turbopackIgnore` and `@vite-ignore`
comments, so webpack (including Next.js with `--webpack`), Turbopack and Vite leave it
to the browser; Rollup, esbuild and Bun leave an import of a variable alone anyway. A
bundler that tried to resolve it would fail to build: tell it to ignore that import.
The viewer then loads its stylesheets, the scene's markup from `skyline-3d.html`, its
stars from `stars.svg`, and the scene's modules and models from the same directory.
Each module loads once per page, however many viewers mount.

### Content security policy and other origins

The viewer runs in the host's page, under the host's content security policy. A host
with one must allow the assets' origin (usually `'self'`) in `script-src`,
`style-src` and `connect-src` (the viewer fetches its markup and stars), and inline
styles in `style-src`, which the viewer sets on its elements. Serve the assets from
the host's origin when you can; on another origin, every file must allow the page's
origin through CORS. The viewer's code runs with the host page's privileges wherever
it is served from: serve it only from an origin you trust.

### For tests

`element.shadowRoot` holds the viewer: its 3D canvas is `#building` and the scene's
loading indicator `#loading`, hidden at the first frame. The region drops `aria-busy`
when `ready` settles. WebDriver and Playwright reach into open shadow roots; code run
in the page reads `element.shadowRoot.querySelector(...)`.

### From 0.1 (iframe) to 0.2

Before 0.2, the viewer ran in an iframe. Hosts upgrading:

- `element` is the viewer's region element, not an `HTMLIFrameElement`: wait for
  `ready` instead of the frame's `load` event, and reach the viewer through
  `element.shadowRoot` instead of `contentDocument`. There are no nested frames: the
  3D scene and its building detail render in the same shadow root (the detail in a
  shadow root of its own, inside the scene's panel), and they no longer post
  `skyline:` messages to each other.
- `navigation` is gone. It showed the site's own toolbar, which only the site's
  `index.html` shows now. The viewer's options are `assetsUrl`, `title`, `controls`,
  `attribution` and `three`.
- Presses inside the viewer reach the host as any other press does, so a workaround
  that raised a window when a frame took focus is no longer needed.
- The viewer no longer has its own window: `window.__buildingStudy`, which tests read
  inside the scene's frame, is not set on the host's window.
- Copy the assets again: the viewer's code is new files (`skyline-viewer.js`,
  `viewer.css` and others).

### Limitations

- Removing the element without calling `destroy()` leaves the viewer running.
- If the viewer's or scene's code fails to load, as on a dropped connection, the
  browser keeps that failure for the page: later mounts on the same page fail the same
  way until it reloads. A frame used to retry with a new document.
- The site's own `index.html` shows two prototypes from its toolbar, the hover-scripted
  enhanced drawing and the WebGL prototype, as pages of their own in frames; a host's
  viewer never shows them.

## Import a scene or a building

For an application that owns its own renderer, install `three` from the r186
series (`~0.186.0`). `devopsrockstars` already uses a compatible version. The
mounted viewer needs this peer only to share the host's engine; scene/model imports
always do.

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
Google Chrome with the pinned Node.js LTS. It also runs the tarball and viewer package
suite on Node.js 22 to verify the supported minimum. Only when those pass does it build and pack the tarball; both jobs run without
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
