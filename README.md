# Chicago Skyline

## Animated version

Open `index.html` in a modern browser for the full-screen viewer. Use the viewer's fullscreen control or press `F` to enter fullscreen. Select **show original** to compare the enhanced scene with `skyline-original-fit.svg`, then **show enhanced** to switch back. Select **show webgl** to try the GPU-rendered prototype. The self-contained comparison file gives the original vector `Landscape` layer the same viewBox, bottom alignment, and artwork offset as the enhanced skyline; the source-photo layer from `skyline.svg` has been removed.

The living-night treatment is entirely vector-based and grayscale. The transparent `skyline-animated.svg` layer keeps the buildings aligned along the bottom and scaled proportionally to fit the viewport. A separate `stars.svg` layer fills the entire viewport behind it with 96 stars, including the sky above the tallest buildings. Ten randomly selected stars (about 10%) softly twinkle; the other 86 stay steady. Positions and the twinkling selection are randomized each time the sky loads, then stay fixed during animation, resizing, and debug toggles. Star positions use percentages and their radii stay fixed so resizing does not stretch the stars. The buildings have no animated lights or beacons. Hover over any building to illuminate it; its name appears immediately in a compact black monospace label offset from the pointer.

The building fidelity treatment also remains entirely vector-based. Clipped tonal gradients separate façade planes, while roof equipment, corner seams, and sparse occupied windows preserve the illustrated style at normal viewing sizes. These architectural details are static and ignore pointer events so they do not interfere with the building hover interactions. Named buildings include Aon Center, 340 on the Park, Blue Cross and Blue Shield Tower, Crain Communications Building, Trump International Hotel and Tower, One and Two Prudential Plaza, Kemper Building, The Heritage at Millennium Park, and Michigan Plaza South. The [building audit](docs/building-labels.md) records the corrected historic-building names and the small silhouettes that remain unidentified.

Each twinkling star has its own slow cycle of approximately 40–67 seconds and a random starting phase. Brightness varies subtly between 42% and 60% opacity, with fresh brightness levels each cycle, gradual transitions, and quiet pauses between twinkles.

Stars pause automatically when the browser reports the operating system's reduced-motion preference. The viewer displays the current preference and animation mode, updating immediately when the preference changes. Building hover highlights still work with reduced motion enabled, without an animated transition.

Use **debug motion** to preview a slightly wider brightness range (30–70% opacity) on the same ten stars, at the same gentle 40–67-second pace. All stars stay the same size. This opt-in preview overrides reduced motion until you select **stop debug** or reload the page. You can also open `stars.svg#debug-motion` directly to preview this mode; remove the fragment to return to the system preference.

## WebGL prototype

`skyline-webgl.html` uses `skyline-animated.svg` as source artwork. At runtime it rasterizes 38 SVG paint layers representing 31 building identities into cropped GPU textures, draws them as subtly depth-shifted quads, applies façade shading and hover illumination in a fragment shader, and resolves overlapping buildings with an offscreen color-picking pass. Separate portions of one building share a hover identity and parallax depth while keeping their original draw order. The foreground remains a separate top layer, and the existing star field stays visible beneath the transparent WebGL canvas.

Because the prototype fetches and decomposes the enhanced SVG at runtime, use a local web server rather than opening the WebGL mode through `file://`. From the repository directory, run `python3 -m http.server`, then open `http://localhost:8000`. The enhanced and fitted-original SVG modes continue to work when `index.html` is opened directly.

## Single-building 3D study

Select **3d building** in the viewer, or open `http://localhost:8000/building-study.html` after starting `python3 -m http.server`. This first experiment for [#4](https://github.com/a2f0/skyline/issues/4) places a custom Crain Communications Building model beside its existing SVG illustration.

Drag to orbit, scroll or pinch to zoom, and hover to illuminate the building and display its name. Front, three-quarter, and side buttons make the shape easy to compare. **Wireframe** exposes the triangles; **turntable** opts into a slow rotation. Focus the canvas and use arrow keys to rotate, `+` / `−` to zoom, or `Home` to reset. Reduced motion disables drag movement and the turntable; view buttons and keyboard controls remain available as immediate changes. The renderer only draws when the view changes, except while the turntable is running, and suspends rendering in a hidden tab.

The model has a closed tower shell, a diagonal diamond roof, a roof grid and dark split, and clipped window cells on all four façades. It uses grayscale toon materials, real perspective, depth testing, directional shadows, and raycast hover selection. The model builder lives in `models/crain-communications.js`; it can be reused in a larger scene.

This is an art-directed shape study, not a surveyed or georeferenced reconstruction. The 177.4 m height comes from the [Skyscraper Center's building record](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441); width, roof slope, window arrangement, and hidden sides are approximations guided by the repository's SVG. `models/crain-reference.svg` is an excerpt of the existing `building-crain-communications` group, with a padded viewBox and no third-party artwork. The model is authored locally; no external model, photographic texture, map tiles, or footprint dataset is included.

For this experiment, local Three.js was chosen to explore the custom geometry and materials with little scene setup. The existing raw WebGL renderer remains useful for the SVG layers, but would need its own camera, mesh, lighting, and picking implementation for this study. Cesium is still a candidate for a later georeferenced city comparison; streamed OSM or footprint extrusions would need custom roof geometry to reproduce this landmark. This experiment does **not** settle the engine or data choice for the full skyline in #4. Matching the skyline camera, testing geographic data and Cesium, and modeling the other buildings remain future work.

Three.js is vendored under its MIT license; see `vendor/README.md` for provenance and regeneration. The study loads entirely from the local server without API keys, paid services, or CDN access. The enhanced, original, and 2.5D WebGL viewer modes remain available through **back to skyline**.

## Four-building skyline study

Select **3d skyline** in the viewer, follow **Four-building skyline** from the solo study, or open `http://localhost:8000/skyline-study.html`. This experiment places the Heritage at Millennium Park, Kemper, Crain Communications, and Michigan Plaza South together in one 3D scene, beside an excerpt of their original SVG geometry. Each building highlights independently, and a nearer tower blocks hover on the one behind it. **Skyline view**, **reset view**, and the `Home` key return to the composition fitted to the drawing; three-quarter, side, orbit, zoom, wireframe, and turntable let you inspect the depth. The comparison stacks vertically on mobile.

The initial camera uses a 6° field of view, approximately 41.5° azimuth, and a low eye position below the roofs. Its −2° elevation preset is limited by the camera's above-ground height constraint as the framing widens. The SVG's facade widths, shallow roof slopes, and relative placement guide the fit. A long lens keeps the verticals nearly parallel. The clipping range follows the allowed zoom distances with a margin around the scene, preserving fine facade detail and keeping the towers visible even in tall tablet layouts. The camera stays above ground at every orbit and zoom distance, including on mobile. This is a visual fit to the drawing, not recovered camera metadata or a geographic reconstruction. Depth, hidden faces, lower floors, tower proportions, and a small Crain footprint adjustment are approximate; the original Crain model and solo study are unchanged.

`models/kemper.js` builds a closed rectangular tower, recessed crown, roof cap, window bays, and raised mullions in five mesh batches. `models/michigan-plaza-south.js` adds a closed dark tower with a flat roof and a dense window grid on all four faces in four mesh batches.

`models/heritage-at-millennium-park.js` describes the Heritage at Millennium Park as plan runs, straight or arced, and maps every panel, band, and fin onto them with analytic normals from `models/building-kit.js`, so the curved faces shade smoothly. The tower has a south stub, a flat south face, a convex east bow with a 57 m radius, and a flat north strip along the bow's end tangent; a lower tier with a shallow concave face stands in front of it. Window panes (one per floor per bay, with subtle tone variation and scattered lit units), raised mullions, six-floor bands, and slab edges follow the drawing's floor pitch, and a dark balcony stack is recessed between raised jambs where the bow ends. Radial crown fins stand under a projecting cap that wraps the hidden north and west faces, and one rooftop mechanical block pairs the louvered screen with a lower loggia frame. The lower tier has its own finned crown and three-floor bands. Fins, mullions, bands, and slab edges are closed solids. The model uses five mesh batches plus silhouette lines, 13,119 triangles in all. The scene totals 32,987 building triangles. Its placement and camera presets live in `skyline-study.js`. Both study pages use `study-viewer.js` for rendering and interaction, `study.css` for presentation, and `study-loader.js` for loading and fallback messages. Each page supplies its own model list and framing, so more studies can reuse the same viewer.

The Heritage plan, heights, and placement were fitted numerically through the skyline camera to the drawn corners, mullions, fins, and lower cap. The camera-facing flat face and bow radius are about 1.3 times the OpenStreetMap trace, and the whole tower plan about 1.1–1.2 times, because the drawing is wider relative to its heights than the real building; the hidden north and west faces are simplified closures rather than that outline, and the lower tier keeps roughly its traced size; the 3.79 m floor pitch likewise follows the drawing rather than the building's 3.37 m average. The drawing also exaggerates how far the curved bands sag toward the right, roughly twice what any camera consistent with the other towers produces, so the model matches horizontal positions and corners and leaves that sag as a residual: the crown cap's north end sits about 9 layer units above its drawn corner in the desktop layout, and up to about twice that in tall and mobile layouts. The real lower tier extends farther south, unlit and hidden in the photo; the model trims it along the skyline view's line of sight so nothing appears left of the drawn silhouette.

`models/skyline-reference.svg` contains the unmodified `building-heritage-at-millennium-park`, `building-kemper`, `building-michigan-plaza-south-tower`, and `building-crain-communications` groups from `skyline-animated.svg`, preserving their positions, nested transforms, and draw order. Its padded viewBox matches the study's framing. The unidentified historic facade in front of the Heritage, the three unidentified buildings in front of Michigan Plaza, and the architectural-details overlay layer are omitted; the drawing's blank lower façade and uneven base extend into those obscured areas. The 3D study infers continuous windows and a shared ground plane there. No photo texture, external model, or runtime service is used.

## Adding a building to the skyline study

Each fitted building follows one loop: measure, model, fit, verify. Heritage is the worked example. The scripts below are development tools; `scripts/build-site.cjs` does not ship them, and each prints its options with `--help`.

1. **Measure the group.** `node scripts/measure-group.cjs <group-id>` accepts a group id or a `data-building-id`. It writes every shape's id, fill, layer-space bounds, and flattened vertices as JSON, with aligned crops of the drawing and the source photo. Layer space is the group parent's space, which equals `skyline.svg`'s root; all drawing points use it.
2. **Extend the reference and framing.** Add the group to `reference.groups` in `tests/skyline-landmarks.cjs`, update its `viewBox`, `title`, and `description`, and run `node scripts/reference-svg.cjs`; the check runs it with `--check`. In `skyline-study.js`, import and place the model and add it to `createBuildingStudy`'s `models`. A building outside the current viewBox means reframing, not a local edit: the viewBox aspect equals the `fit` aspect, so widening or raising it moves `fit`, `target`, `platform`, and `clippingMargin` together, and every existing landmark must be re-measured afterwards.
3. **Write the model with the kit.** `models/building-kit.js` has plan runs (`line`, `arc`, `bulge`, and `rectangle`, with `station`, `along`, and `evenly`) and a builder whose `panel`, `ledge`, `band`, `box`, `slab`, and `prism` write analytic normals and whose `finish` returns the standard model API. Plans run counterclockwise from above, and `prism` throws otherwise; a `closed` band wraps a whole roof. Solids are closed by default. Omit a face only where another surface covers it, by name (`omit: ["top"]`) with a comment; a band standing on a wall names `omit: ["back"]`, because the wall's own facets already close it. An unknown name throws. The Node suite checks each cover, except a floor on the ground at y = 0, which the camera never sees from below, and fails on any same-facing coplanar faces, in one batch or across batches. Export the features the drawing pins down, derived from the constants the geometry uses.
4. **Add the spec.** In `tests/skyline-landmarks.cjs`, add the model to `models` and a `fitted` entry; the comment above `fitted` lists every field: feature landmarks with their drawing points, drawn columns with the batch that must stand proud, sight-line gaps, and tolerances. Landmark names share one namespace across buildings, so keep them unique. The skyline and geometry suites pick the entry up. Building-specific checks, such as ordering or Heritage's left silhouette bound, belong in `tests/skyline-study.cjs`; the optional `silhouette` only feeds such a check. That test also holds the scene to 24,000–36,000 triangles, so raise the bound deliberately if the new model needs more.
5. **Fit with the fidelity report.** `node scripts/fidelity-report.cjs` prints every landmark error, column residual in layer units, sight-line gap, projected silhouette, and triangle count at the five layouts the test checks, from the code the test asserts with. `--json` keeps the numbers, and `--root` measures another checkout, such as an archive of `main`, for a before-and-after comparison.
6. **Check renders.** `node scripts/render-study.cjs --building <id>` writes the standard stills to `/tmp/skyline-renders`: skyline, wireframe, three-quarter, side, zoomed, four elevated orbits, full pages, a reference overlay, and close-ups. Look for holes, z-fighting, and anything outside the drawn silhouette.
7. **Run the check** with `npm run check`.

## Checks and PR workflow

With Node.js 22.12+ and Google Chrome installed, run:

```sh
npm ci --ignore-scripts
npm run check
```

The runner starts its own temporary local server. Checks cover the merge helper's guards, that `models/skyline-reference.svg` still regenerates from its source groups, the building kit's closed solids and analytic normals, and each fitted model's covered omissions and freedom from same-facing coplanar faces across its meshes, which a Node suite checks by importing the ES modules directly, hence Node.js 22.12+, SVG/WebGL hover regions and illumination, both 3D studies, twenty-three camera landmarks against the source SVG at desktop, tablet, and mobile sizes (Heritage's taken from its model's exported features and required to lie on its built geometry, with its mullion and fin alignment, each column standing proud as the first surface along its sight line, and bow curvature), independent building highlights and building occlusion, visible geometry at both zoom limits, camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile touch, existing viewer modes, and failure messages. Screenshots are written to `/tmp/skyline-3d-*.png` and `/tmp/skyline-group-*.png`. Run the geometry suite alone with `node tests/building-kit.cjs`. To run one browser suite against an existing server, use `node tests/building-hover.cjs`, `node tests/building-study.cjs`, or `node tests/skyline-study.cjs`; `SKYLINE_TEST_URL` overrides the default `http://127.0.0.1:8000`.

Whitespace checks always cover staged and unstaged work. During branch review, supply `SKYLINE_BASE_SHA=<fetched-base-commit>` to include the committed diff from that exact base; the PR skills use this form after fetching the base.

The repo includes the `ship-pr`, `open-pr`, `cross-agent-review`, `squash-merge`, and `reset` skills adapted from [tearleads](https://github.com/a2f0/tearleads). In Codex, invoke `$ship-pr` to commit, review and repair, open or resume the PR, squash-merge the reviewed commit, and return to updated `main`. In Claude Code, use `/ship-pr`. Use `$open-pr` or `/open-pr` when you want to stop with an open PR. Optional `--keep-branch` leaves you on the feature branch after shipping; `--report-only` disables review repairs and stops shipping on blocking findings.

The canonical skills live in `.agents/skills`, following [Codex's local skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills); `.claude/skills` contains relative links to the same instructions. If a new skill does not appear, restart the agent session. The flow uses Git, authenticated `gh`, local browser checks, and an available review agent, with a disclosed in-session review fallback. It has no dependency on tearleads' Bun workspace, agent-tool, commitlint, or hook installer. Merge messages contain only the PR title and `(#number)`; the helper binds the merge to the reviewed head using [GitHub's `expectedHeadOid`](https://docs.github.com/en/graphql/reference/pulls#mergepullrequestinput). Base freshness is checked immediately before merging; atomic base enforcement depends on repository protection rules.

## Deploying

The site is live at [skyline.devopsrockstars.com](https://skyline.devopsrockstars.com), served by the `devopsrockstars-skyline-prod` Cloudflare Worker as static assets. There is no server-side code: the Worker has no `main`, so Cloudflare answers every request from the uploaded files. This matches how the rest of the `devopsrockstars.com` zone is served — each host is a Worker with a custom domain, not a Pages project or an S3 bucket.

Credentials come from `.secrets/root.env`, which is gitignored and never committed. It needs `TF_VAR_cloudflare_api_token` and `TF_VAR_cloudflare_account_id` (the token needs Workers Scripts:Edit and Zone:Read on the zone), plus `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the S3 Terraform backend. `scripts/secrets.sh` loads the file, fails loudly on a missing variable, and re-exports the Cloudflare pair under the `CLOUDFLARE_*` names wrangler expects.

Deploying needs Node.js 22+, which Wrangler requires. Publish content with:

```sh
npm ci --ignore-scripts
npm run deploy
```

`npm run deploy` stages `dist/` via `scripts/build-site.cjs` and then runs `wrangler deploy`. The staging step is an allowlist, not an ignore list: the repository root holds `.secrets/`, test fixtures, and the 18MB `skyline.jpg` source photograph that the site never requests, so only files named in `scripts/build-site.cjs` reach Cloudflare. Every `models/*.js` and `models/*.svg` ships automatically; new top-level assets must be added to the list, and the script fails rather than publishing if a listed file has been renamed away. This is a deploy-time copy, not a build — the files served are the files in the repo, unchanged.

`terraform/` owns one resource, the `cloudflare_workers_custom_domain` binding `skyline.devopsrockstars.com` to the Worker, with state in the shared `tearleads-terraform-state` bucket. It rarely changes and is not part of a content deploy:

```sh
scripts/terraform.sh plan
scripts/terraform.sh apply
```

Order matters on a first apply, and only there: wrangler must publish the Worker before Terraform can point a hostname at it. Cloudflare serves `.html` requests with a 307 to the extensionless path, so `building-study.html` lands on `/building-study` with identical content; `wrangler.jsonc` explains why the alternative costs more than the redirect.

## Direction for Update

These directions have been created using Inkscape 1.1 on MacOS.

1. Save the Skyline as skyline.svg with the original skyline as the background.
2. Go to `File -> Save As...` and save it somewhere outside the repo, i.e. `/tmp/skyline.svg`.
3. Delete the `JPEG` layer.
4. Draw a square to clip the boundaries of the image.
5. Align the square over the mask, i.e.:
   1. Duplicating the X and width of the landscape.
   2. Select the mask first and landscape second, then align bottom edges.
6. Group all of the skyline objects under the clipping rectangle.
7. Select the skyline group first and clipping rectangle second.
8. Go to `Object -> Clip -> Set`.
9. `Select All` then go to `File -> Document Properties...`
   1. Resize the page to drawing or selection.
10. Save the image as `/tmp/skyline.svg` again.
11. Change the `preserveAspectRatio` to `xMidYMin meet`.
12. Move the file into its final location.
