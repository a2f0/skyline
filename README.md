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

## Checks and PR workflow

With Node.js 20+ and Google Chrome installed, run:

```sh
npm ci --ignore-scripts
npm run check
```

The runner starts its own temporary local server. Checks cover the merge helper's guards, SVG/WebGL hover regions and illumination, actual 3D rendering, camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile touch, existing viewer modes, and failure messages. Desktop, side, and mobile screenshots are written to `/tmp/skyline-3d-*.png`. To run one browser suite against an existing server, use `node tests/building-hover.cjs` or `node tests/building-study.cjs`; `SKYLINE_TEST_URL` overrides the default `http://127.0.0.1:8000`.

Whitespace checks always cover staged and unstaged work. During branch review, supply `SKYLINE_BASE_SHA=<fetched-base-commit>` to include the committed diff from that exact base; the PR skills use this form after fetching the base.

The repo includes the `ship-pr`, `open-pr`, `cross-agent-review`, `squash-merge`, and `reset` skills adapted from [tearleads](https://github.com/a2f0/tearleads). In Codex, invoke `$ship-pr` to commit, review and repair, open or resume the PR, squash-merge the reviewed commit, and return to updated `main`. In Claude Code, use `/ship-pr`. Use `$open-pr` or `/open-pr` when you want to stop with an open PR. Optional `--keep-branch` leaves you on the feature branch after shipping; `--report-only` disables review repairs and stops shipping on blocking findings.

The canonical skills live in `.agents/skills`, following [Codex's local skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills); `.claude/skills` contains relative links to the same instructions. If a new skill does not appear, restart the agent session. The flow uses Git, authenticated `gh`, local browser checks, and an available review agent, with a disclosed in-session review fallback. It has no dependency on tearleads' Bun workspace, agent-tool, commitlint, or hook installer. Merge messages contain only the PR title and `(#number)`; the helper binds the merge to the reviewed head using [GitHub's `expectedHeadOid`](https://docs.github.com/en/graphql/reference/pulls#mergepullrequestinput). Base freshness is checked immediately before merging; atomic base enforcement depends on repository protection rules.

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
