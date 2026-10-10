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
| Windows | 1.5 m tall | Estimate: 75 cm over each floor |
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
