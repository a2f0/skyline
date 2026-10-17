# Two Illinois Center and River Plaza: reference audit

`src/models/two-illinois-center-geographic.ts` and `src/models/river-plaza-geographic.ts` build Two
Illinois Center, 233 North Michigan Avenue, and River Plaza, 405 North Wabash Avenue, for the
geographic layout only. The drawing's `office-west-of-aon` group paints one building in the
gap between Two Prudential Plaza and Aon Center; through the geographic camera it is two.
That is outside the excerpt the original layout is fitted to, so the original layout has no
models of them. The models are reconstructions from OpenStreetMap, published data, the
drawing and photographs, not surveys or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 236770799](https://www.openstreetmap.org/way/236770799), version 3:
  Two Illinois Center's outline, tagged 32 levels, with no height.
- [OpenStreetMap way 285867424](https://www.openstreetmap.org/way/285867424), version 6:
  River Plaza's outline, with its parts:
  - [68796725](https://www.openstreetmap.org/way/68796725), the slab, 56 levels and 156 m;
  - [285867426](https://www.openstreetmap.org/way/285867426), a block on the roof at 160 m;
  - [285867425](https://www.openstreetmap.org/way/285867425), a box on it at 166 m;
  - [68796733](https://www.openstreetmap.org/way/68796733), the podium on the river side at
    8 m.
- All of these were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's.
- [The Skyscraper Center on Two Illinois Center](https://www.skyscrapercenter.com/chicago/two-illinois-center/11095):
  114.3 m / 375 ft, 32 floors, completed 1972, Fujikawa Johnson & Associates.
- [Emporis on Two Illinois Center, archived in 2016](https://web.archive.org/web/20160423005000/http://www.emporis.com/buildings/117259/two-illinois-center-chicago-il-usa):
  "Height (roof) 375.00 ft", a curtain wall, "Facade color black".
- The [Chicago Architecture Center](https://www.architecture.org/learn/resources/buildings-of-chicago/building/111-east-wacker-one-illinois-center/):
  One Illinois Center by Mies van der Rohe, completed by Joseph Fujikawa, and "its sibling
  building, Two Illinois Center".
- [The Skyscraper Center on River Plaza](https://www.skyscrapercenter.com/chicago/river-plaza/3383):
  159.7 m / 524 ft, 56 floors, completed 1977, Gordon & Levin.
- [Emporis on River Plaza, archived in 2016](https://web.archive.org/web/20160423052243/http://www.emporis.com/buildings/116735/river-plaza-chicago-il-usa):
  "Height (roof) 524.01 ft", concrete, "Facade system exposed structure", "Facade color
  white", "Roof system flat roof with 1 box".
- [SAH Archipedia](https://web.archive.org/web/20250101221147/https://sah-archipedia.org/buildings/IL-01-031-0005):
  "The exterior is defined by a grid of unadorned structural concrete and aluminum windows."
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). Between Two Prudential and
  Aon, from 4,687 to 4,787 layer units, the photograph shows:
  - a pale top to 1,917, over a dark band to about 2,050;
  - below it, floors lit in ribbons between thin mullions, their rows 26.3 units apart,
    down to the trees.

## Which buildings

The drawn group runs from 4,677 to 4,840 layer units, its top at 1,976, a dark band over
rows of windows about 25.3 units apart.

- **Two Illinois Center** stands in front on that sightline, 2.5 km from the camera. Its lit
  rows' 26.3 units are 3.47 m there, and its published 114.3 m over 32 floors averages
  3.57 m. River Plaza's residential floors, 2.85 m on average, would stand 18.6 units apart.
  Two Illinois Center's roof projects at about 2,110, so it cannot reach the drawn top.
- **River Plaza** stands behind, 2.9 km away. Of the mapped buildings on the sightline it is
  the only one tall enough to reach the drawn top. Its roof, at OpenStreetMap's 156 m,
  projects at about 1,952 there, between the drawn top and the photograph's pale one; its
  box, to the published 159.7 m, stands just behind Aon's edge.

The drawing draws them as one building. Its window rows are Two Illinois Center's, and its
top lies between the two roofs. Both models keep their published heights, so neither is
scaled to the drawing. See [the building audit](building-labels.md#names-from-the-geographic-camera).

## Two Illinois Center

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–4.25 m | Estimate: what 31 floors at the pitch leave under the roof |
| Floors 2–30 | 3.55 m | Photograph: the lit rows, 26.3 units apart, 3.47 m at its depth, which reads 2.3% short on Aon's published 3.87 m |
| Mechanical band, floors 31–32 | 107.2–114.3 m | Estimate: the top two floors, dark in photographs |
| Roof | 114.3 m | Published |

The mapped outline is 85 m east to west and 40 m north to south. Every face carries the
curtain wall:

- 10 cm mullions on a 5 ft module, set out from each face's middle. The drawing's window
  marks stand about 1.5 m apart there.
- Glass over a 90 cm spandrel on every office floor, and the lobby's glass.
- The mechanical band's dark panels.

## River Plaza

| Feature | Height | Basis |
| --- | ---: | --- |
| Podium | 0–8 m | OpenStreetMap |
| Typical floor | 2.79 m | The roof's 156 m over 56 floors |
| Windows | 2.1 m tall | October 17 photographic ratio; 0.35 m sill placement inferred |
| Roof | 156 m | OpenStreetMap: the slab's part |
| Box | 156–159.7 m | Published: the Skyscraper Center's architectural top and tip, 524 ft |

The slab is 56 m east to west and 25 m north to south, its corners notched. The model builds
it on its mapped part, with the podium on its own part and the box on its own.

- The Skyscraper Center gives 159.7 m both to the architectural top and to the tip, which
  counts rooftop equipment, and Emporis gives the roof, the architectural top and the tip
  the same 524 ft over a "flat roof with 1 box". So nothing stands higher than 159.7 m: the
  box's top is there, on the slab's roof at OpenStreetMap's 156 m. OpenStreetMap's 166 m for
  the box and its block at 160 m stand over the published tip, and the model leaves them
  out.
- The frame's bays are 1.6 m wide, an estimate from photographs, set out from each face's
  middle. Each floor has a window 1.1 m wide in each bay.
- Where the podium stands against the slab, both ends of a wall's run on the podium's
  outline, the skin starts over the podium's roof. The slab's south-east end past the podium
  and the bevel at its south-west corner run down to grade.

Colours follow the drawing's greys.

Omitted:

- Two Illinois Center's plaza levels and its lobby's columns;
- River Plaza's balconies and its podium's walls, which stay the bare shell;
- the flues on River Plaza's roof.

## Verification

`bun run check` covers them:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions, for each building.
- `tests/skyline-geography.test.ts` raycasts:
  - Two Illinois Center's roof at 114.3 m, and its one part;
  - the lobby and 29 office floors up a bay, a spandrel, glass and the mechanical band;
  - its mullions, ten panes from one to the one ten modules on;
  - River Plaza's roof at 156 m, the box to the published 159.7 m and the podium at 8 m, its
    three parts;
  - a window to each of its 55 floors above grade on the north face, a sill and a head;
  - six windows in six 1.6 m bays;
  - the skin over the podium's roof where the podium stands against the slab, and down to
    grade at the slab's south-east end and its south-west bevel;
  - both models' exported palettes, whose window tones no wall shares;
  - the exact mapped outlines at grade: Two Illinois Center's, and River Plaza's slab and
    podium.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group of eleven buildings: six towers measured on sunlit
faces in the 2008 panorama, as the first three groups were (FID-COL-003 to FID-COL-005), and five
buildings the panorama does not resolve, measured in daytime close-ups calibrated to it. All are
shown at the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. No change to these materials between 2008 and the drawing's 2013 panorama is known to
this audit.

Identification: between Two Prudential and Aon the rendition shows these two buildings in a slit at
x 1797–1809. `bun scripts/panorama-owners.ts building-river-plaza building-office-west-of-aon` gives
River Plaza rows 374–396 there and Two Illinois Center's south face from row 396 down, at x
1802–1809, with the photographer's eye fitted as for FID-COL-005, 10 m east and 100 m south of the
drawing's fitted eye, at 1.6 px RMS: a ray from that eye through each pixel meets the nearest mapped
part, which owns the pixel, and the face it meets gives the pixel's direction. The photograph shows
a white block with a small grey box on its roof at rows 362–378, and from row 378 down the dark grid
of a black curtain wall. River Plaza's records give white concrete and one box on its roof; above,
this audit's reading of the 2013 panorama puts Two Illinois Center in front on this sightline, its
lit floors at Two Illinois Center's pitch, not River Plaza's. Both tops stand above their models: at
each building's distance from the fitted eye, the white block's top implies 172 m against River
Plaza's published 159.7 m (OpenStreetMap puts its roof box at 166 m), and the dark grid's top 134 m
against Two Illinois Center's published 114.3 m. The other towers measured in this group show their
tops 9 to 13 m above their models in the same fit, so River Plaza's fits that pattern while Two
Illinois Center's stands about 7 to 11 m beyond it, as its lit floors in the 2013 panorama rise
above its modelled roof too. The Two Illinois Center identification is therefore provisional. Its
box lies wholly on its south face, as the script's `--box` option reports and
`tests/panorama-owners.test.ts` checks; River Plaza's box is placed by row in the white block, above
its modelled roof, so that test does not cover it.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue.
`bun scripts/sample-colours.ts day building-office-west-of-aon building-river-plaza` downloads the
photograph once, checks its SHA-256, and reproduces these rows and the palette's entries, decoding
in Chrome without colour management. At these distances a pixel spans about 1.1 m.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Two Illinois Center, curtain wall, south face, lighter pixels | 1802, 400, 1809, 435 | val 0.3–1 | 133 (54.3%) | `68, 76, 87` | 63–74 / 71–81 / 82–91 |
| Two Illinois Center, curtain wall, south face, darker pixels | 1802, 400, 1809, 435 | val 0–0.3 | 112 (45.7%) | `46, 54, 65` | 35–52 / 44–61 / 58–72 |
| River Plaza, concrete, top floors, sunlit | 1799, 367, 1804, 376 | sat 0–0.35, val 0.5–1 | 45 (100.0%) | `229, 223, 211` | 220–242 / 212–236 / 201–224 |

Decisions in `src/models/colour-palette.ts`:

- Two Illinois Center: `dark metal` `68, 76, 87` and `bronze glass` `46, 54, 65`, the curtain wall's
  lighter and darker pixels. At a metre a pixel the black steel and the tinted glass blend, so the
  split by brightness is approximate; together they read as a black wall that reflects the sky.
  `lit window` and `dim window` take the glass exactly, since no office lights show by day.
  `neutral` stays grey.
- River Plaza: `concrete` `229, 223, 211`, the white concrete of the top floors that show above Two
  Illinois Center, a 45-pixel sample clear of the roof box. `glass`, `lit window` and `dim window`
  stay grey: its windows are hidden.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, Two Illinois Center's
south face renders `62, 69, 80` where the view sees it, against the photograph's `68, 76, 87`, 0.83
in linear light, and River Plaza's top, lit by the scene's sun, `245, 241, 235` against
`229, 223, 211`, 1.21.

## 2026-10-17 — taller River Plaza windows and lower transoms (FID-RIV-001)

The earlier model estimated 1.5 m windows on a 156/56 = 2.786 m floor pitch,
leaving about 46% of each module as concrete above/below the opening. Dated
close views show taller openings, a much shallower concrete floor band and a
slim metal divider near the lower third of the glass. This pass corrects that
vertical proportion. The conspicuously narrow horizontal grid and broad blank
corners remain a separate problem, FID-RIV-002; this does not claim to finish
the structural frame or count every window group.

### Sources and observations

Accessed **2026-10-17**, with full-resolution files inspected locally:

- Matt Griffin, [Chicago IMG 1165.CR2](https://commons.wikimedia.org/wiki/File:Chicago_IMG_1165.CR2_(1352992229).jpg),
  photographed **2007-09-09 14:30**. The
  [3456 × 2298 original](https://upload.wikimedia.org/wikipedia/commons/1/1b/Chicago_IMG_1165.CR2_%281352992229%29.jpg)
  shows River Plaza's east end behind Wrigley's clock tower, including the
  thin floor bands and lower window transoms. SHA-256
  `7c315f8fad446c16932bfd86a2d643f0a494dba4e986992422504c381de0ba14`.
- Griffin, [Chicago IMG 1016.CR2](https://commons.wikimedia.org/wiki/File:Chicago_IMG_1016.CR2_(1352693579).jpg),
  photographed **2007-09-09 12:46**. The
  [3456 × 2298 original](https://upload.wikimedia.org/wikipedia/commons/4/40/Chicago_IMG_1016.CR2_%281352693579%29.jpg)
  shows the adjacent long elevation with the same repeated window/transom
  treatment; obliquity and blur limit precise width measurements. SHA-256
  `bfda20a5305f3097986aa2169116b6d244b7b567d5f605e876e28a652bcce414`.
- Chicago Architecture Today,
  [Wrigley Building — Exterior 2](https://commons.wikimedia.org/wiki/File:Wrigley_Building_-_Exterior_2_(7541337904).jpg),
  photographed **2012-07-03 10:52**. The
  [3264 × 2448 original](https://upload.wikimedia.org/wikipedia/commons/0/04/Wrigley_Building_-_Exterior_2_%287541337904%29.jpg)
  provides an independent pre-2013 view of the long elevation's broad glazed
  groups and narrow bands. SHA-256
  `dc0c04df53d8c7aa9426c5a984df988027207b2af137257f46f216af0e1052ff`.
- The [fresh OpenStreetMap site extract](https://api.openstreetmap.org/api/0.6/map.json?bbox=-87.6265,41.8893,-87.6252,41.8903)
  retains outline 285867424 v6, shaft 68796725 v10 (56 levels, 156 m), podium
  68796733 v5 (8 m), and both rooftop ways: 285867425 v1 (166 m) and
  285867426 v1 (160 m). All four parts were checked, including the excluded
  rooftop block. The prior published-height conflict remains unresolved;
  neither rooftop geometry nor height is changed here.

Measurement method: in IMG 1165, inspect the window column around original
**x = 2030**, **y = 754–900**, away from vertical piers. Approximate opening
bounds are y 754–795, 808–847 and 861–900, against successive floor pitches
of about 53–54 pixels. Edge blur and narrow frame thickness leave roughly
±2 pixels per boundary: an opening ratio near **75% ±6%** is justified, not
a surveyed height. The first two lower transoms fall near y 781 and 835,
roughly 30–34% of the opening up from its bottom. A 400 × 400 crop at
(1950, 700), viewed enlarged without perspective correction, resolves the
metal dividers. These are local ratios along one vertical column, not
measurements across foreshortened faces. The other two photographs corroborate
the treatment rather than supplying independent metre dimensions.

### Decisions and limits

Use a **2.1 m** opening on the retained 2.786 m pitch, about **75.4%**,
instead of 1.5 m. Its sill is placed 0.35 m above the existing floor datum;
that absolute placement is inferred because the photographs do not locate
the interior slab elevation. The lower divider begins 0.6 m above the sill,
with a schematic 0.06 m section. Applying this repeated treatment to the
unseen north/west faces is a symmetry inference, not a new photographic
verification. Floor totals, roof/podium levels, mapped coordinates and the
1.6 m horizontal grid remain provisional as before.

The model grows from 40,796 to 84,244 triangles, chiefly the closed transom
boxes; this is a rendering cost, not an accuracy metric. Full browser checks
cover the resulting scene, but no new frame-rate claim is made.

Closed metal bars sit 5 mm in front of the full-height glass skin and project
another 15 mm; this clearance prevents coplanar faces. The unsplit glass
under each divider keeps one room-lighting seed for its upper and lower
visible lights. The painted window tone is also retained for each existing
window. The extra relief and precise section sizes are schematic.

The frame is classified as aluminium and remains an explicit neutral grey:
there is no separately calibrated sunny sample for its coating. Its material
receives neither glass reflection nor room emission. The existing concrete
colour and unknown glass colours are unchanged; River Plaza's glass already
has no daylight reflection mask because its colour is unresolved. Neither
shared exposure nor the lighting palette was adjusted to compensate for the
remaining horizontal-grid discrepancy.

FID-RIV-002 remains open for broad structural group counts, slim vertical
mullions, glazed corners, north/west confirmation, roof/flue dimensions and
podium details. The photographs show these are real opportunities, but the
mapped recesses and oblique views do not yet justify a complete reconstruction.

### Acceptance

Targeted closure, winding, coplanar-overlap and covered-face checks pass.
Raycasts retain 55 openings above grade, distinguish the sill, both glass
lights, metal transom and head at lower/middle/top floors, and preserve the
existing horizontal grid and mapped ground vertices. Material probes verify
that every transom vertex remains neutral, unreflective and unlit; eligible
room windows retain emission, upper/lower samples share all four lighting
mask values, and colour-off restores the entire colour buffer byte for byte.
Strict TypeScript and the palette/grayscale suites pass.

Six matched before/after views use reduced motion and a 1600 × 1000 viewport.
Images capture `#building`; the [manifest](fidelity/river-windows-captures.json)
records actual pixel dimensions, camera poses and baseline detail-fit bounds.
The new bars slightly increase the automatic fitted extent. To keep the
camera and platform identical, after-captures override `min`/`max` with the
recorded baseline bounds immediately before `const height = max.y` in the
served `building-detail.js`, using a Playwright route. This only changes
temporary capture fitting; model geometry and product source are untouched.
The two close views add sixteen `=` zoom presses and hide the DOM view caption
in both phases, following the Aon capture investigation. All retained views
change on colour-on and restore grayscale exactly.

| View | Grayscale before / after | Daylight before / after |
| --- | --- | --- |
| Front | [before](fidelity/river-windows-front-grey-before.png) / [after](fidelity/river-windows-front-grey-after.png) | [before](fidelity/river-windows-front-day-before.png) / [after](fidelity/river-windows-front-day-after.png) |
| Side | [before](fidelity/river-windows-side-grey-before.png) / [after](fidelity/river-windows-side-grey-after.png) | [before](fidelity/river-windows-side-day-before.png) / [after](fidelity/river-windows-side-day-after.png) |
| Skyline | [before](fidelity/river-windows-skyline-grey-before.png) / [after](fidelity/river-windows-skyline-grey-after.png) | [before](fidelity/river-windows-skyline-day-before.png) / [after](fidelity/river-windows-skyline-day-after.png) |
| Quarter | [before](fidelity/river-windows-quarter-grey-before.png) / [after](fidelity/river-windows-quarter-grey-after.png) | [before](fidelity/river-windows-quarter-day-before.png) / [after](fidelity/river-windows-quarter-day-after.png) |
| Front-Close | [before](fidelity/river-windows-front-close-grey-before.png) / [after](fidelity/river-windows-front-close-grey-after.png) | [before](fidelity/river-windows-front-close-day-before.png) / [after](fidelity/river-windows-front-close-day-after.png) |
| Side-Close | [before](fidelity/river-windows-side-close-grey-before.png) / [after](fidelity/river-windows-side-close-grey-after.png) | [before](fidelity/river-windows-side-close-day-before.png) / [after](fidelity/river-windows-side-close-day-after.png) |

Inspection of all six pairs shows taller openings and shallower concrete bands
in both modes; the close views also resolve the lower dividers. Silhouette and
placement remain stable in skyline/quarter views, where this distant tower is
partly occluded. The excessive horizontal concrete and blank corner strips
remain visible, reinforcing FID-RIV-002 rather than treating this pass as a
complete facade correction. Full shipping validation and independent review
are recorded in the PR.

The final skyline/quarter after-images include both FID-AON-003 and
FID-RIV-001, which ship together. Detail pairs isolate each building;
context pairs compare the combined batch against its common base.
