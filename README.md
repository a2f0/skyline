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

The model has a closed tower shell, a diagonal diamond roof, a roof grid and dark split, and clipped window cells on all four façades. It uses grayscale toon materials, real perspective, depth testing, directional shadows, and raycast hover selection. The model builder lives in `models/crain-communications.ts`; it can be reused in a larger scene.

This is an art-directed shape study, not a surveyed or georeferenced reconstruction. The 177.4 m height comes from the [Skyscraper Center's building record](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441); width, roof slope, window arrangement, and hidden sides are approximations guided by the repository's SVG. `models/crain-reference.svg` is an excerpt of the existing `building-crain-communications` group, with a padded viewBox and no third-party artwork. The solo model is authored locally and uses no external model, photographic texture, map tiles, or footprint dataset.

For this experiment, local Three.js was chosen to explore the custom geometry and materials with little scene setup. The existing raw WebGL renderer remains useful for the SVG layers, but would need its own camera, mesh, lighting, and picking implementation for this study. Cesium is still a candidate for a later georeferenced city comparison; streamed OSM or footprint extrusions would need custom roof geometry to reproduce this landmark. This experiment does **not** settle the engine or data choice for the full skyline in #4. The skyline study below now compares a fitted camera and local geographic data. A larger city scene, evaluation of Cesium, and additional buildings remain future work.

Three.js is vendored under its MIT license; see `vendor/README.md` for provenance and regeneration. The study loads entirely from the local server without API keys, paid services, or CDN access. The enhanced, original, and 2.5D WebGL viewer modes remain available through **back to skyline**.

## Eight-building skyline study

Select **3d skyline** in the viewer, follow **Eight-building skyline** from the solo study, or open `http://localhost:8000/skyline-study.html`. This experiment places the Heritage at Millennium Park, Kemper, Crain Communications, Michigan Plaza South, Trump International Hotel and Tower, One and Two Prudential Plaza, and Aon Center together in one 3D scene, beside an excerpt of their original SVG geometry. Each building highlights independently, and a nearer tower blocks hover on the one behind it. **Skyline view**, **reset view**, and the `Home` key return to the composition fitted to the drawing; three-quarter, side, orbit, zoom, wireframe, and turntable let you inspect the depth. The comparison stacks vertically on mobile.

The initial camera uses a 6° field of view, approximately 41.5° azimuth, and a low eye position below the roofs. Its −2° elevation preset is limited by the camera's above-ground height constraint as the framing widens. The SVG's facade widths, shallow roof slopes, and relative placement guide the fit. A long lens keeps the verticals nearly parallel. The clipping range follows the allowed zoom distances with a margin around the scene, preserving fine facade detail and keeping the towers visible even in tall tablet layouts. The camera stays above ground at every orbit and zoom distance, including on mobile. This is a visual fit to the drawing, not recovered camera metadata or a geographic reconstruction. Depth, hidden faces, lower floors, tower proportions, and a small Crain footprint adjustment are approximate; the original Crain model and solo study are unchanged.

`models/kemper.ts` builds a closed rectangular tower, recessed crown, roof cap, window bays, and raised mullions in five mesh batches. `models/michigan-plaza-south.ts` adds a closed dark tower with a flat roof and a dense window grid on all four faces in four mesh batches.

`models/heritage-at-millennium-park.ts` describes the Heritage at Millennium Park as plan runs, straight or arced, and maps every panel, band, and fin onto them with analytic normals from `models/building-kit.ts`, so the curved faces shade smoothly. The tower has a south stub, a flat south face, a convex east bow with a 57 m radius, and a flat north strip along the bow's end tangent; a lower tier with a shallow concave face stands in front of it. Window panes (one per floor per bay, with subtle tone variation and scattered lit units), raised mullions, six-floor bands, and slab edges follow the drawing's floor pitch, and a dark balcony stack is recessed between raised jambs where the bow ends. Radial crown fins stand under a projecting cap that wraps the hidden north and west faces, and one rooftop mechanical block pairs the louvered screen with a lower loggia frame. The lower tier has its own finned crown and three-floor bands. Fins, mullions, bands, and slab edges are closed solids. The model uses five mesh batches plus silhouette lines, 13,171 triangles in all.

`models/trump-international-tower.ts` builds Trump International Hotel and Tower from a gently bowed glazed south face, a high cap across that face and its bevel, an actual east-face roof drop to the low shoulder, a narrow ribbed crown, and a three-section metal spire. The measured grid follows the curve, with scattered muted gray occupied windows; inferred north and west curtain walls and crown louvers finish the orbit views. The [reference audit](docs/trump-international-tower-reference.md) records the drawing measurements, architectural references, fitted datum, and visual limits. The model uses six mesh batches and 25,696 triangles.

`models/one-prudential-plaza.ts` builds One Prudential Plaza as an International Style slab: a punch-card facade of recessed window panes between projecting limestone piers, thirty bays on the south face and nine on the east, over thirty-one drawn window rows. A lighter band runs under the parapet, a penthouse inset from the west end carries a louvered screen of forty-nine ribs, and a tapered antenna mast stands on the roof beside the penthouse's east wall. The drawn podium along Randolph and Stetson is modelled as a ribbed east wing, sixteen ribs on one face and twenty-four on the other, abutting the tower's east face. It uses five mesh batches, 3,636 triangles in all.

Two things about its fit are worth knowing. Heights are measured from the study's platform rather than the street: the platform plane projects to layer y 2679 while this slab's drawn ground line is 62 units lower, under a ground band the study does not model, so the roof reads 170 m here against the real 183.2 m, and the numeric fit agrees with that datum to 0.3 m. Depth does not come from the drawing at all, because moving the building away and scaling it up reproduces the same picture to within a third of the tolerance; it comes from occlusion instead, since the drawing paints One Prudential over Michigan Plaza South's rightmost 47 layer units. The plan is about 1.3x the real 71.6 by 22.3 m footprint, matching the exaggeration the drawing gives Heritage, and the drawn podium does not share its own tower's projection, so each was fitted to its own edges. Its placement and camera presets live in `skyline-study.ts`. Both study pages use `study-viewer.js` for rendering and interaction, `study.css` for presentation, and `study-loader.js` for loading and fallback messages. Each page supplies its own model list and framing, so more studies can reuse the same viewer.

`models/two-prudential-plaza.ts` builds three pointed facade tiers with paired north/south setbacks, raised vertical piers, stepped pier heads with short angled caps, glazed chevrons with fine mullions, and coping along the projecting caps. Its crown has raised fascia, recessed louver blades and supports, four closed ridge beams, and a tapered spire with inset panels and bright folded edges. The [reference audit](docs/two-prudential-reference.md) records the source photograph, owner photos, crown close-up, and street views used for the second pass. The front facade and nine east-side strips follow the measured SVG; north details mirror the visible south face. The tower stands behind One Prudential’s podium, with that overlap verified by raycast hover. It uses ten mesh batches and 13,070 triangles.

Its spire is 345.79 m above the study platform, compared with the real building’s [303.3 m above the street](https://www.skyscrapercenter.com/building/two-prudential-plaza/489): this drawing exaggerates its height. Thirteen roof, chevron, and spire landmarks and twenty-nine facade columns are checked at all five layouts. When Two Prudential was added, the taller reference kept its width, so normalized tolerances were retained at that stage; the camera target rose and the platform deepened to contain it. That reframe also required a 5 cm leftward correction to One Prudential’s placement to retain its podium silhouette bound. Aon later widened the frame and the inherited limits were remeasured.

`models/aon-center.ts` adds Aon Center's white granite outer tube around dark vertical window slots. Fifteen measured pier lines on each visible face, three broad near-corner stone strips, muted occupied panes, a raised parapet, and low screened service enclosures carry the detail around all four sides. Its illustrated roof is 411 m above the study platform, taller than the real 346 m building, because the source skyline exaggerates its height. The [reference audit](docs/aon-center-reference.md) records the drawing measurements, source photographs, camera fit, and residual. The model uses seven mesh batches and 10,798 triangles; the eight-building scene totals 86,239 triangles within its 85,000–87,000 budget.

The Heritage plan, heights, and placement were fitted numerically through the skyline camera to the drawn corners, mullions, fins, and lower cap. The camera-facing flat face and bow radius are about 1.3 times the OpenStreetMap trace, and the whole tower plan about 1.1–1.2 times, because the drawing is wider relative to its heights than the real building; the hidden north and west faces are simplified closures rather than that outline, and the lower tier keeps roughly its traced size; the 3.79 m floor pitch likewise follows the drawing rather than the building's 3.37 m average. The drawing also exaggerates how far the curved bands sag toward the right, roughly twice what any camera consistent with the other towers produces, so the model matches horizontal positions and corners and leaves that sag as a residual: the crown cap's north end sits about 14 layer units above its drawn corner in the desktop layout, and up to about 21 in the tall one. Framing the earlier five-building scene moved those from about 9 and 19: the sag is unchanged, but the wider frame places the camera differently. The real lower tier extends farther south, unlit and hidden in the photo; the model trims it along the skyline view's line of sight so nothing appears left of the drawn silhouette.

`models/skyline-reference.svg` contains the unmodified `building-heritage-at-millennium-park`, `building-kemper`, `building-michigan-plaza-south-tower`, `building-crain-communications`, `building-trump-tower-only`, `building-one-prudential-plaza`, `building-two-prudential-plaza`, `building-prudential-plaza-podium`, and Aon's `layer3` groups from `skyline-animated.svg`, preserving their positions, nested transforms, and draw order. It also carries the source definitions used by Aon's in-group tonal overlays. Its padded viewBox matches the study's framing. The unidentified historic facade in front of the Heritage and the three unidentified buildings in front of Michigan Plaza are omitted; the drawing's blank lower façade and uneven base extend into those obscured areas. The 3D study infers continuous windows and a shared ground plane there. No photo texture, external model, or runtime service is used.

## Geographic skyline comparison

In `skyline-study.html`, **geographic layout** switches the same eight buildings
to local OpenStreetMap footprints and parts, with published overall heights
(Kemper uses OSM's height). It opens a north-up orthographic ground plan with
street centerlines and a 100 m grid. **Height comparison** gives an elevated
orthographic view. Both comparison views preserve camera and zoom when toggling
back to **original drawing**, aligned at Crain so changes in position and scale
remain visible. The original skyline camera and fitted models are retained.

Scroll, pinch, or use **+ / −** for close inspection. Perspective views can zoom
to one tenth of their fitted camera distance; orthographic views support 24×
zoom. **Shift-drag** (or two fingers on touch screens) pans between buildings in
either mode. **Home** or **Reset** restores the layout's starting view.

The table below the viewer compares original and mapped ground extents, east/north
coordinates, and modeled top heights, with source links and assumptions. Heritage
has a detailed geographic facade, with terrace elevations from city design
drawings and the published 192.4 m top; see its [reference audit](docs/heritage-geographic-reference.md).
Trump International Hotel and Tower has a detailed one too: its mapped tier
outlines, setback terraces, ribbed crown and three-section mast carry the fitted
model's glazing vocabulary at meter scale, with window rows and bays estimated;
see its [reference audit](docs/trump-geographic-reference.md). The other six
buildings use simple massing on mapped outlines. Intermediate
podium heights and some crowns are estimates; street lines have no curb widths
and road levels are flattened. See [the geographic data audit](docs/skyline-geography.md)
for the coordinate system, eight footprint records, height definitions, OSM
attribution, and limitations. All runtime data is checked in locally.

## Adding a building to the skyline study

Each fitted building follows one loop: measure, model, fit, verify. Heritage is the worked example, and One Prudential Plaza the first built on the kit from the start. [Adding a building](docs/adding-a-building.md) is the long companion to these steps: what the drawing is and is not, how the fit is found, and the traps that cost real time. The scripts below are development tools; `scripts/build-site.ts` does not ship them, and each prints its options with `--help`.

1. **Measure the group.** `bun scripts/measure-group.ts <group-id>` accepts a group id or a `data-building-id`. It writes every shape's id, fill, layer-space bounds, and flattened vertices as JSON, with aligned crops of the drawing and the source photo. Layer space is the group parent's space, which equals `skyline.svg`'s root; all drawing points use it.
2. **Extend the reference and framing.** Add the group to `reference.groups` in `tests/skyline-landmarks.ts`, update its `viewBox`, `title`, and `description`, and run `bun scripts/reference-svg.ts`; the check runs it with `--check`. If an in-group overlay needs source gradients or clips, list their ids in `reference.defs`. In `skyline-study.ts`, import and place the model and add it to `createBuildingStudy`'s `models`. A building outside the current viewBox means reframing, not a local edit: keep the viewBox and `fit` aspects aligned, then recheck `target`, `platform`, light coverage, and `clippingMargin` along with every existing landmark.
3. **Write the model with the kit.** `models/building-kit.ts` has plan runs (`line`, `arc`, `bulge`, and `rectangle`, with `station`, `along`, and `evenly`) and a builder whose `panel`, `ledge`, `band`, `box`, `slab`, and `prism` write analytic normals and whose `finish` returns the standard model API. Plans run counterclockwise from above, and `prism` throws otherwise; a `closed` band wraps a whole roof. Solids are closed by default. Omit a face only where another surface covers it, by name (`omit: ["top"]`) with a comment; a band standing on a wall names `omit: ["back"]`, because the wall's own facets already close it. An unknown name throws. The Node suite checks each cover, except a floor on the ground at y = 0, which the camera never sees from below, and fails on any same-facing coplanar faces, in one batch or across batches. Export the features the drawing pins down, derived from the constants the geometry uses.
4. **Add the spec.** In `tests/skyline-landmarks.ts`, add the model to `models` and a `fitted` entry; the comment above `fitted` lists every field: feature landmarks with their drawing points, drawn columns with the batch that must stand proud, sight-line gaps, and tolerances. Landmark names share one namespace across buildings, so keep them unique. The skyline and geometry suites pick the entry up. Building-specific checks, such as ordering or Heritage's left silhouette bound, belong in `tests/skyline-study.test.ts`; the optional `silhouette` only feeds such a check. That test also holds the scene to its explicit triangle budget, so raise that bound deliberately if the new model needs more.
5. **Fit with the fidelity report.** `bun scripts/fidelity-report.ts` prints every landmark error, column residual in layer units, sight-line gap, projected silhouette, and triangle count at the five layouts the test checks, from the code the test asserts with. `--json <file>` also writes the raw numbers, and `--root` measures another checkout, such as an archive of `main`, for a before-and-after comparison.
6. **Check renders.** `bun scripts/render-study.ts --building <id>` writes the standard stills to `/tmp/skyline-renders`: skyline, wireframe, three-quarter, side, zoomed, four elevated orbits, full pages, a reference overlay, and close-ups. Look for holes, z-fighting, and anything outside the drawn silhouette.
7. **Run the check** with `bun run check`. After deploying, `bun run verify:deploy` confirms the new model is served byte for byte; `scripts/deploy.sh` runs it for you.

## Checks and PR workflow

With Bun (pinned in `mise.toml`; `mise use` installs it) and Google Chrome installed, run:

```sh
bun install --ignore-scripts
bun run check
```

The runner typechecks the repository (`tsc --noEmit` under `@tsconfig/strictest`), starts its own temporary local server, and runs the merge helper, reference excerpt, and building kit suites under `bun test`, then builds `dist/` and runs the browser suites against the compiled site. Checks cover the merge helper's guards, that `models/skyline-reference.svg` still regenerates from its source groups, the building kit's closed solids and analytic normals, and each fitted model's covered omissions and freedom from same-facing coplanar faces across its meshes, SVG/WebGL hover regions and illumination, both 3D studies, sixty camera landmarks against the source SVG at desktop, tablet, and mobile sizes (the five fitted buildings' features are taken from their models' exported geometry and required to lie on their built surfaces, with mullion, fin, pier, rib and louver alignment, each column standing proud as the first surface along its sight line, Heritage's bow curvature, Trump’s spire ordering, and Two Prudential's chevron ordering), independent building highlights and building occlusion, visible geometry at both zoom limits, camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile touch, existing viewer modes, and failure messages. Screenshots are written to `/tmp/skyline-3d-*.png` and `/tmp/skyline-group-*.png`. Run the geometry suite alone with `bun test tests/building-kit.test.ts`. To run one browser suite against an existing server, use `bun test tests/building-hover.test.ts`, `bun test tests/building-study.test.ts`, or `bun test tests/skyline-study.test.ts`; `SKYLINE_TEST_URL` overrides the default `http://127.0.0.1:8000`.

Whitespace checks always cover staged and unstaged work. During branch review, supply `SKYLINE_BASE_SHA=<fetched-base-commit>` to include the committed diff from that exact base; the PR skills use this form after fetching the base.

The repo includes the `ship-pr`, `open-pr`, `cross-agent-review`, `squash-merge`, and `reset` skills adapted from [tearleads](https://github.com/a2f0/tearleads). In Codex, invoke `$ship-pr` to commit, review and repair, open or resume the PR, squash-merge the reviewed commit, and return to updated `main`. In Claude Code, use `/ship-pr`. Use `$open-pr` or `/open-pr` when you want to stop with an open PR. Optional `--keep-branch` leaves you on the feature branch after shipping; `--report-only` disables review repairs and stops shipping on blocking findings.

The canonical skills live in `.agents/skills`, following [Codex's local skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills); `.claude/skills` contains relative links to the same instructions. If a new skill does not appear, restart the agent session. The flow uses Git, authenticated `gh`, local browser checks, and an available review agent, with a disclosed in-session review fallback. It has no dependency on tearleads' Bun workspace, agent-tool, commitlint, or hook installer. Merge messages contain only the PR title and `(#number)`; the helper binds the merge to the reviewed head using [GitHub's `expectedHeadOid`](https://docs.github.com/en/graphql/reference/pulls#mergepullrequestinput). Base freshness is checked immediately before merging; atomic base enforcement depends on repository protection rules.

## Deploying

The site is live at [skyline.devopsrockstars.com](https://skyline.devopsrockstars.com), served by the `devopsrockstars-skyline-prod` Cloudflare Worker as static assets. There is no server-side code: the Worker has no `main`, so Cloudflare answers every request from the uploaded files. This matches how the rest of the `devopsrockstars.com` zone is served — each host is a Worker with a custom domain, not a Pages project or an S3 bucket.

Credentials come from `.secrets/root.env`, which is gitignored and never committed. It needs `TF_VAR_cloudflare_api_token` and `TF_VAR_cloudflare_account_id` (the token needs Workers Scripts:Edit and Zone:Read on the zone), plus `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the S3 Terraform backend. `scripts/secrets.sh` loads the file, fails loudly on a missing variable, and re-exports the Cloudflare pair under the `CLOUDFLARE_*` names wrangler expects.

Deploying needs Bun, which runs Wrangler. Publish content with:

```sh
bun install --ignore-scripts
bun run deploy
```

`bun run deploy` compiles the browser modules into `dist/` via `scripts/build-site.ts` and then runs `wrangler deploy`. The staged set is an allowlist, not an ignore list: the repository root holds `.secrets/`, test fixtures, and the 18MB `skyline.jpg` source photograph that the site never requests, so only files named in `scripts/build-site.ts` reach Cloudflare. Every top-level `models/*.ts` ships automatically as compiled `.js` and its `.svg` excerpt ships as-is; new top-level assets must be added to the list, and the script fails rather than publishing if a listed file has been renamed away. There is still no bundler and no transformation beyond tsc's per-file emit.

`bun run deploy` then runs `scripts/verify-deploy.ts` against the live site, and `bun run verify:deploy` runs it on its own (`--url` points it elsewhere; `SKYLINE_SKIP_VERIFY=1`, and only `1`, skips it). A deploy skips verification when it published nothing (`--dry-run`) or aimed somewhere else (`--env`, `-e`, `--name`), and says which, because checking production after publishing to another Worker would report the previous deploy as though it were this one. `--outdir` and `--outfile` still publish, so they are still verified. It asserts two things. Every file the allowlist publishes is served **byte for byte** against a fresh local build: a deploy is a copy of a build, so anything else is a bad deploy, and comparing hashes catches a file served empty or stale, which a status code does not. And nothing else in the repository is reachable at all — that set is derived from `git ls-files` and a walk of `.secrets/`, minus what `scripts/build-site.ts` publishes, because a hand-kept list of forbidden paths is a sample and a sample cannot prove absence.

Published requests follow redirects, because Cloudflare answers an `.html` request with a 307 to the extensionless path, and they are retried, because the edge can 404 an asset for seconds after wrangler has reported the upload a success. Requests for paths that must not exist do neither: a redirect is not proof of absence, and a request that never resolves is a failure rather than a quiet pass. Every request carries a timeout and the run carries a deadline, so a hung edge ends the deploy in minutes instead of hours. `tests/verify-deploy.test.ts` covers those failure paths, since a checker that cannot fail is worse than none. One thing would make it fail on a good deploy: a Cloudflare feature that rewrites responses, such as Rocket Loader or Email Obfuscation, changes the bytes the edge returns and every HTML file would then differ from the fresh local build. Compression does not — undici decodes gzip and brotli before the comparison.

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
