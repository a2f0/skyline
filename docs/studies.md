# 3D studies

Two study pages put 3D models beside the drawing they were fitted to. Both use
`study-viewer.ts` for rendering and interaction, `study.css` for presentation, and
`study-loader.ts` for loading and fallback messages. Each page supplies its own model list and
framing, so more studies can reuse the same viewer. Serve the built `dist/` to open them (see the
[README](../README.md#run-it-locally)).

Three.js is vendored under its MIT license; see `src/vendor/README.md` for provenance and
regeneration. The studies load entirely from the local server without API keys, paid services, or
CDN access. Every model is authored locally from published data and the source photograph, with no
external model, photographic texture, or map tiles.

## Single-building study

Select **3d building** in the viewer, or open `building-study.html`. It places a custom Crain
Communications Building model beside its existing SVG illustration.

Drag to orbit, scroll or pinch to zoom, and hover to illuminate the building and display its name.
Front, three-quarter, and side buttons make the shape easy to compare. **Wireframe** exposes the
triangles; **turntable** opts into a slow rotation. Focus the canvas and use arrow keys to rotate,
`+` / `−` to zoom, or `Home` to reset. Reduced motion disables drag movement and leaves out the
turntable button; view buttons and keyboard controls remain available as immediate changes. The
renderer only draws when the view changes, except while the turntable is running, and suspends
rendering in a hidden tab. **Back to skyline** returns to the viewer.

The model is the tower as built, on a squared-up version of its OpenStreetMap plan: two prisms
split along the north-west to south-east diagonal, each under a glazed roof falling toward
Millennium Park, so the two read as one diamond. A slot opens between the peaks down to a 152.5 m
floor, and a V-notch runs the full height at each end of the split. White aluminum spandrels
alternate with continuous ribbon windows on a 3.5 m floor pitch above a tall glazed lobby. The
sloped glass carries a raised grid, the diamond's outer edges a lit outline, and the diagonal
edges a dark coping. It uses grayscale toon materials, real perspective, depth testing,
directional shadows, and raycast hover selection. `src/models/crain-tower.ts` builds it from a plan and
roof planes, `src/models/crain-communications.ts` supplies the clean plan, and
`src/models/crain-geographic.ts` the mapped one.

It is a reconstruction from published data, not a survey. The 177.4 m height comes from the
[Skyscraper Center's building record](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441).
The plan, the split, and the notches come from the mapped outline. The roof slope, both peaks'
heights, the band pitch, and the spandrel-to-glass proportion are measured on the photograph the
drawing was traced from; the [reference audit](crain-reference.md) records each source. The
lobby's height, the window module, and the roof grid's spacing are estimates.
`src/models/crain-reference.svg` is an excerpt of the existing `building-crain-communications` group,
with a padded viewBox and no third-party artwork.

This study was the first experiment for [#4](https://github.com/a2f0/skyline/issues/4), the
true-3D skyline. Local Three.js was chosen to explore custom geometry and materials with little
scene setup; the raw WebGL renderer stays with the SVG layers. The skyline went on to use the same
engine with checked-in OpenStreetMap data, so Cesium, streamed 3D tiles, and footprint-extrusion
pipelines were never adopted.

## Skyline study

Select **skyline study** in the viewer, follow **Skyline study** from the single-building study,
or open `skyline-study.html`. The page opens on the [geographic layout](#geographic-layout);
**original drawing**, or `skyline-study.html?layout=original`, shows the
[drawing's fit](#original-drawing-layout).

Each building highlights independently, and a nearer tower blocks hover on the one behind it.
**Skyline view**, **reset view**, and the `Home` key return to the composition fitted to the
drawing; three-quarter, side, orbit, zoom, wireframe, and turntable let you inspect the depth.

## Geographic layout

The geographic layout, the page's default, places the [34 modelled buildings](buildings.md) on
local OpenStreetMap footprints and parts, with published overall heights. It opens on the skyline
view from the drawing's own camera: the source photograph's vantage on the lakefront by the Adler
Planetarium, fitted to the mapped roofs and tips while the buildings stay where they are mapped.
That view frames the whole drawn skyline, and the drawing under the scene becomes
`src/models/skyline-panorama.svg`, every building the drawing shows. The page stacks the scene over
the drawing, each the page's full width, so both contain their frame at the same scale.

**Ground plan** gives a north-up orthographic plan with street centerlines and a 100 m grid, and
**height comparison** an elevated orthographic view. The ground plan's frame reaches south to
Jackson and north across the river for River Plaza. Both comparison views preserve camera and zoom
when toggling back to **original drawing**, aligned at Crain so changes in position and scale
remain visible.

Scroll, pinch, or use **+ / −** for close inspection. Perspective views can zoom to one tenth of
their fitted camera distance; orthographic views support 24× zoom. **Shift-drag** (or two fingers
on touch screens) pans between buildings in either mode. **Home** or **Reset** restores the
layout's starting view.

The table below the viewer compares original and mapped ground extents, east/north coordinates,
and modeled top heights, with source links and assumptions. Intermediate podium heights and some
crowns are estimates; street widths come from mapped lane counts rather than surveyed curbs, and
road levels are flattened. [The geographic data audit](skyline-geography.md) covers the camera,
the coordinate system, the footprint records, height definitions, OSM attribution, and
limitations. All runtime data is checked in locally.

## Original drawing layout

The original layout places the Heritage at Millennium Park, Kemper, Crain Communications, Michigan
Plaza South, Trump International Hotel and Tower, One and Two Prudential Plaza, and Aon Center
together in one 3D scene, beside an excerpt of their original SVG geometry. The comparison stacks
vertically on mobile. Placement and camera presets live in `skyline-study.ts`.

### Camera

The initial camera uses a 6° field of view, approximately 41.5° azimuth, and a low eye position
below the roofs. Its −2° elevation preset is limited by the camera's above-ground height
constraint as the framing widens. The SVG's facade widths, shallow roof slopes, and relative
placement guide the fit. A long lens keeps the verticals nearly parallel. The clipping range
follows the allowed zoom distances with a margin around the scene, preserving fine facade detail
and keeping the towers visible even in tall tablet layouts. The camera stays above ground at every
orbit and zoom distance, including on mobile. This is a visual fit to the drawing, not recovered
camera metadata or a geographic reconstruction. Depth, hidden faces, lower floors, and tower
proportions are approximate.

Depth does not come from the drawing, because moving a building away and scaling it up reproduces
the same picture; One Prudential's comes from occlusion instead, since the drawing paints it over
Michigan Plaza South's rightmost 47 layer units.

### Fitted models

The as-built towers place a copy from the drawing's datum up, the photograph's treeline, fitted
through the skyline camera and enlarged by the exaggeration the drawing gives every fitted tower.
Each audit records the sources, measurements, fit, and residuals.

| Building | Model | Datum | Scale, turn | Batches, triangles | Audit |
| --- | --- | ---: | --- | --- | --- |
| Crain Communications | `src/models/crain-communications.ts` | 39.6 m | 1.276×, 4.86° | 7, 33,016 | [Crain](crain-reference.md) |
| Trump International | `src/models/trump-international-tower.ts` | 40.7 m | 1.065×, 7.95° | 6, 29,108 | [Trump](trump-reference.md) |
| One Prudential Plaza | `src/models/one-prudential-plaza.ts` | 40 m | 1.314×, 7.29° | 7, 19,430 | [One Prudential](one-prudential-reference.md) |
| Two Prudential Plaza | `src/models/two-prudential-plaza.ts` | 35.4 m | 1.289×, 8.59° | 7, 37,368 | [Two Prudential](two-prudential-reference.md) |
| Aon Center | `src/models/aon-center.ts` | 30.6 m | 1.329×, 10.2° | 6, 22,420 | [Aon](aon-reference.md) |

- **Crain** is the single-building study's tower, fitted to the drawn diamond and the twenty-nine
  sills its left face shows. The drawing simplifies the slot, widening it 45% beyond the
  photograph and flattening its foot, so the slot corners are held to the geometry rather than to
  the drawing.
- **Trump** comes from `src/models/trump-tower.ts`: a curtain wall in 6 ft units between polished
  stainless mullions 23 cm proud, a brushed spandrel at every floor on the photograph's 3.214 m
  pitch. The photograph puts the main roof at 354.4 m, stepping down to 347.3 m over the
  north-east end, where the glazed crown rises to 364.9 m; the spire reaches the published 423.2 m
  tip. The copy's shaft runs straight down behind One Prudential, fitted to the drawn roof, step,
  crown, spire, fifty-two mullion lines, and floor rows.
- **One Prudential** comes from `src/models/one-prudential-tower.ts`: a limestone slab of forty-one
  floors, piers one 2.35 m bay apart at the photograph's 3.93 m pitch, the observatory under the
  coping at the photographed 169.5 m roof, the sign penthouse to the published 183.2 m, WGN's
  mast to the published 278 m tip, and the east wing to the photographed 56.4 m. The drawn podium
  group is this wing.
- **Two Prudential** comes from `src/models/two-prudential-tower.ts`: a 40.8 × 37.5 m limestone core,
  gables stepping from the corners' 229.3 m to 256 m, a stepped pyramid turned 45° to 280.2 m, and
  a spire to the published 303.3 m tip. It stands behind One Prudential's podium, with that
  overlap verified by raycast hover.
- **Aon** comes from `src/models/aon-tower.ts`: granite V-shaped columns one 10 ft module apart,
  fifteen bays to a face, dark glass on the photograph's 3.87 m pitch up to a granite cap, solid
  notched corners, a louvered enclosure, and an antenna.

When Two Prudential was first added, the taller reference kept its width, so normalized tolerances
were retained at that stage; the camera target rose and the platform deepened to contain it. That
reframe also required a 5 cm leftward correction to One Prudential's placement to retain its
podium silhouette bound. Aon later widened the frame and the inherited limits were remeasured.

### Drawn models

`src/models/kemper.ts` builds a closed rectangular tower, recessed crown, roof cap, window bays, and
raised mullions in five mesh batches. `src/models/michigan-plaza-south.ts` adds a closed dark tower
with a flat roof and a dense window grid on all four faces in four mesh batches.

`src/models/heritage-at-millennium-park.ts` describes the Heritage at Millennium Park as plan runs,
straight or arced, and maps every panel, band, and fin onto them with analytic normals from
`src/models/building-kit.ts`, so the curved faces shade smoothly. The tower has a south stub, a flat
south face, a convex east bow with a 57 m radius, and a flat north strip along the bow's end
tangent; a lower tier with a shallow concave face stands in front of it. Window panes, raised
mullions, six-floor bands, and slab edges follow the drawing's floor pitch, and a dark balcony
stack is recessed between raised jambs where the bow ends. Radial crown fins stand under a
projecting cap, and one rooftop mechanical block pairs the louvered screen with a lower loggia
frame. The model uses five mesh batches plus silhouette lines, 13,171 triangles in all.

The Heritage plan, heights, and placement were fitted numerically through the skyline camera to
the drawn corners, mullions, fins, and lower cap. The camera-facing flat face and bow radius are
about 1.3 times the OpenStreetMap trace, and the whole tower plan about 1.1–1.2 times, because the
drawing is wider relative to its heights than the real building; the hidden north and west faces
are simplified closures, and the 3.79 m floor pitch follows the drawing rather than the building's
3.37 m average. The drawing exaggerates how far the curved bands sag toward the right, roughly
twice what any camera consistent with the other towers produces, so the model matches horizontal
positions and corners and leaves that sag as a residual: the crown cap's north end sits about 14
layer units above its drawn corner in the desktop layout, and up to about 21 in the tall one. The
real lower tier extends farther south, unlit and hidden in the photo; the model trims it along the
skyline view's line of sight so nothing appears left of the drawn silhouette.

The eight-building scene totals 170,215 triangles, within the 169,000–171,000 budget
`tests/skyline-study.test.ts` holds it to.

### Reference excerpts

`src/models/skyline-reference.svg` contains the unmodified `building-heritage-at-millennium-park`,
`building-kemper`, `building-michigan-plaza-south-tower`, `building-crain-communications`,
`building-trump-tower-only`, `building-one-prudential-plaza`, `building-two-prudential-plaza`,
`building-prudential-plaza-podium`, and Aon's `layer3` groups from `skyline-animated.svg`,
preserving their positions, nested transforms, and draw order. It also carries the source
definitions used by Aon's in-group tonal overlays. Its padded viewBox matches the study's framing.
`src/models/skyline-panorama.svg` carries all 38 of the drawing's building groups, identified and not,
in the geographic layout's wider frame; `bun scripts/reference-svg.ts` regenerates both.

The unidentified historic facade in front of the Heritage and the three buildings in front of
Michigan Plaza (Millennium Park Plaza and 168 and 180 North Michigan Avenue, named since through
the geographic camera; see the [building audit](building-labels.md#names-from-the-geographic-camera))
are omitted from the original layout; the drawing's blank lower façade and uneven base extend into
those obscured areas. The 3D study infers continuous windows and a shared ground plane there.
