# 180 North Michigan Avenue: reference audit

`src/models/north-michigan-180-geographic.ts` builds 180 North Michigan Avenue, the Harvester
Building, for the geographic layout only. The drawing shows its south wall behind
Millennium Park Plaza, which hides its Michigan front. That is outside the excerpt the
original layout is fitted to, so the original layout has no model of it. The geographic
camera named the drawn group; see [the building audit](building-labels.md#names-from-the-geographic-camera).
The model is a reconstruction from OpenStreetMap, listings, the drawing and photographs,
not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 210671714](https://www.openstreetmap.org/way/210671714), version 5:
  the outline on the south-west corner of Michigan and Lake, tagged 23 levels, with no
  height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's.
- [Marc Realty](https://marcrealty.com/180-north-michigan-office-space-chicago/): the
  Harvester Building, 24 stories, on the south-west corner of Michigan Avenue and Lake
  Street.
- [CommercialCafe](https://www.commercialcafe.com/commercial-property/us/il/chicago/180-north-michigan-avenue-1/):
  built in 1927, 24 floors.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  7.7 of the drawing's layer units are one metre of height. The photograph shows brown
  masonry with arched top windows, and a dark facade continuing west of the drawn wall to
  nearly its top.

No published height was found, so the model's height is read on the drawing. The drawn tops
nearby fall within about a metre of their published heights: Millennium Park Plaza's, across
Michigan, reads a metre low.

## Plan

The mapped outline is 28.7 m along Michigan and 38.9 m along its south wall, which has a
node 21.85 m west of Michigan.

Projected through the geographic camera, the south wall spans 3,142 to 3,385 layer units.
The drawing's wall runs from 3,240 to 3,355, where Millennium Park Plaza covers it. Read on
the wall's plane, that is 4.9 to 22.5 m west of Michigan: the drawn edge lands on the node.

West of that edge the drawing leaves sky above 168 North Michigan, but the photograph shows
the building's dark masonry there, rising nearly to its top. Further west, Crain's banded
front covers the rest from the camera. So the model builds the whole mapped lot to the
parapet, as OpenStreetMap maps one building.

Measured on the wall's plane, the drawn windows stand in five columns about 2.7 m apart and
1.4 m wide, centred from 8.6 to 19 m west of Michigan. The model centres its windows 2.7 m
apart from 2.8 m across the whole south wall, within 0.4 m of the drawn ones. The walls the drawing does not show carry the same spacing,
centred on each.

## Heights

Heights are read on the drawn south wall through the geographic camera, without correction.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–9.85 m | Estimate: what the 24 storeys leave under the drawn floors |
| Typical floor | 3.25 m | Drawing: the window rows, 24 storeys in all |
| String courses | 61.85 and 71.6 m | Drawing: over the seventeenth and twentieth floors |
| Top floor's band | 81.75–82.3 m | Drawing |
| Top floor's arched windows | 82.3–86 m | Drawing: heads from 85.4 m |
| Parapet | 86.3 m | Drawing: the wall's top edges |

The drawn rows stand 3.25 m apart. Below the top floor, the published 24 storeys then leave
the ground floor 9.85 m, as tall as three typical floors; the hill in the drawing hides it,
so the model keeps that estimate. The drawing reads 3 to 4 m high a few blocks south, at Six
North Michigan and the Michigan Boulevard Building. If it does here, the parapet would stand
near 83 m, and the ground floor would still be 6 to 7 m, about two typical floors. The drawn
top bows up about a metre at its middle; the model's parapet is level at its edges.

## Model

Brick masonry with a spandrel and window on every floor:

- **Ground floor:** tall windows, 1 to 8.6 m.
- **Floors 2–23:** windows 2.05 m tall, on the columns above.
- **String courses:** over the seventeenth and twentieth floors, and a band under the top
  floor.
- **Top floor:** arched windows, their heads narrowing to the middle half for the last
  60 cm, stepped for the arch.

Colours follow the drawing's greys, not the masonry's brown. The page's dimension table
labels its height as measured on the drawing.

Omitted:

- the ornament;
- the entrances;
- the top's bow.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the parapet over the front and the rear of the lot;
  - the south wall's windows on their columns and the piers between them;
  - the ground floor, the string courses, the top floor's band, and a plain spandrel;
  - an arched window, its narrowed head and the parapet;
  - window colours that no wall shares;
  - the Michigan front's eleven windows to a floor;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group: the towers the 2008 panorama shows north of
Randolph Street, measured in it as the first three groups were (FID-COL-003 to FID-COL-005), and
buildings it does not resolve, measured in daytime close-ups calibrated to it. All are shown at the
same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. No change to these materials between 2008 and the drawing's 2013 panorama is known to
this audit.

Identification: `bun scripts/panorama-owners.ts building-michigan-plaza-front-middle` places the
building's south face at x 1610–1629 below row 420, its modelled parapet, with the photographer's eye fitted as for FID-COL-005, 10 m east and 100 m
south of the drawing's fitted eye, at 1.6 px RMS: a ray from that eye through each pixel meets the
nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction. The photograph shows
330 North Wabash's dark glass above row 412 and, below it at x 1618–1630, a sunlit band of light
stone and arched windows, rows 412–420, over a face in shadow. Crain, 177 m tall and about 60 m to
the south, casts that shadow under the high August sun, leaving only the top floors lit. The stone
band stands about 8 pixels above the modelled parapet, which is read from the drawing because no
height is published, so the top floor is likely a few metres higher than the model. The face's box
lies wholly on the face, as the script's `--box` option reports and `tests/panorama-owners.test.ts`
checks; the stone's box is placed by row above the modelled parapet, so that test does not cover it.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-michigan-plaza-front-middle`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Stone top floor, south face, sunlit | 1619, 413, 1629, 420 | sat 0–0.35, val 0.5–1 | 59 (84.3%) | `194, 177, 162` | 174–220 / 157–197 / 139–176 |
| Brick, south face, in Crain's shadow, for comparison | 1612, 421, 1629, 465 | val 0.15–1 | 740 (98.9%) | `65, 73, 81` | 55–80 / 64–86 / 69–94 |
| Glass, south face, in Crain's shadow | 1612, 421, 1629, 465 | val 0–0.15 | 8 (1.1%) | `27, 19, 10` | 25–30 / 16–26 / 9–20 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `194, 177, 162`, the sunlit top floor's stone, a 59-pixel sample; the string courses
  take it.
- `brown brick` stays grey. In Crain's shadow it measures `65, 73, 81`, and FID-COL-005's shade
  estimate would make that a neutral `115, 116, 115`: the shadow's blue sky light hides the brick's
  brown.
- `glass`, `lit window` and `dim window` stay grey: eight pixels in the shadow.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the view sees its south
face, where the scene's sun lights the stone: it renders `212, 197, 186` against the photograph's
`194, 177, 162`, 1.27 in linear light.
