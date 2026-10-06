# Chicago Skyline

A grayscale Chicago skyline traced from a 2013 photograph taken on the lakefront by the Adler
Planetarium, and a 3D city of 34 mapped buildings seen through that photograph's own camera.
Hover a building for its name, right-click it for a close look, or switch to the animated drawing
it was fitted to. It is live at [skyline.devopsrockstars.com](https://skyline.devopsrockstars.com).

## Run it locally

With [Bun](https://bun.sh) installed (the version is pinned in `mise.toml`):

```sh
bun install --ignore-scripts
bun run build:site
python3 -m http.server -d dist
```

Then open `http://localhost:8000`. Serve `dist/` over HTTP rather than opening files directly:
WebGL and the 3D pages need it.

## Pages

| Page | Shows | Docs |
| --- | --- | --- |
| `index.html` | The viewer: opens on the 3D skyline, with the enhanced drawing, the original drawing, and a WebGL prototype one button away | [The viewer](docs/viewer.md) |
| `skyline-3d.html` | The full-screen 3D skyline on its own: camera views, streets, footprints, celebratory lights, and a building menu | [Full-screen 3D skyline](docs/viewer.md#full-screen-3d-skyline) |
| `building-detail.html?building=<id>` | One mapped building alone on its platform | [Building menu and detail](docs/viewer.md#building-menu-and-detail) |
| `skyline-study.html` | The 3D scene over the drawing, in the geographic layout or the original drawing's fit | [3D studies](docs/studies.md#skyline-study) |
| `building-study.html` | The Crain Communications Building beside its illustration | [3D studies](docs/studies.md#single-building-study) |
| `skyline-webgl.html` | The drawing's layers rendered as GPU textures | [WebGL prototype](docs/viewer.md#webgl-prototype) |

## Package

The repository also builds [`@a2f0/skyline`](https://www.npmjs.com/package/@a2f0/skyline), an ESM
package with the complete embeddable viewer, reusable Three.js scenes and building models, and
TypeScript declarations. Every merge to `main` publishes a new version to npm; run
`bun run build:package` or `bun pm pack` to build it locally. [The package guide](docs/package.md)
covers installing, asset copying, mounting, imports, and releases.

## Development

```sh
sh scripts/git/install-hooks.sh   # once per clone
bun run check                     # typecheck, unit and browser suites; needs Google Chrome
bun run deploy                    # publish to Cloudflare; needs Node.js 22+ and wrangler login
```

[Development](docs/development.md) explains the checks, hooks, and PR workflow, and
[Deploying](docs/deploying.md) the release and its verification. To add a building or improve one,
start with [Adding a building](docs/adding-a-building.md) or the
[fidelity queue](docs/building-fidelity.md). Coding agents follow [`AGENTS.md`](AGENTS.md).

All documentation is indexed in [`docs/`](docs/README.md).
