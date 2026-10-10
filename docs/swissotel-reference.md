# Swissôtel Chicago: reference audit

`src/models/swissotel-geographic.ts` builds Swissôtel Chicago, 323 East Wacker Drive, for the
geographic layout only. From the geographic camera it stands mostly behind The Buckingham.
Its west corner rises between Three Illinois Center's roof and The Buckingham, closing the
seam where those two models' corners meet. That is outside the excerpt the original layout
is fitted to, so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, published data and photographs, not a survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 641288601](https://www.openstreetmap.org/way/641288601), version 3: the
  tower, a triangle tagged 139 m and 45 levels. It is a part of the hotel's outline,
  [way 95486966](https://www.openstreetmap.org/way/95486966), version 14, which carries the
  same tags. The hotel's podium, [way 95486953](https://www.openstreetmap.org/way/95486953),
  is tagged only as a building. They were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920).
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/swissotel-chicago/4362):
  139.3 m / 457 ft, 43 floors, completed 1989, all-concrete.
- [Wikidata](https://www.wikidata.org/wiki/Q21609099): architect Harry Weese, inception 1988.
- The Skyscraper Center's photographs: a triangular tower of reflective blue-green glass on a
  white podium, beside Three Illinois Center's bronze. Its wall is a flush grid of thin
  mullions and transoms, the panels about a floor tall.
- Wikimedia Commons, [*East Wacker 2*](https://commons.wikimedia.org/wiki/File:East_Wacker_2.JPG),
  2014: the tower beside Three Illinois Center, its panels in about 46 rows above Upper Wacker
  Drive.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At The Buckingham's west
  edge, from 6,878 to 6,904 layer units, the photograph shows a narrow dark strip, its top at
  1,869. The drawing's `buckingham-west` group hatches a strip there.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors | 3.10 m | The published height over OpenStreetMap's 45 levels |
| Roof | 139.3 m | The Skyscraper Center |

The Skyscraper Center counts 43 floors. The model takes OpenStreetMap's 45 levels, nearer the
2014 photograph's 46 rows of panels above Upper Wacker Drive. Either count puts the floors
3.1 to 3.2 m apart.

## Plan

The mapped tower is a triangle, 48.8 m along its south side, its west and north-east faces
about 48 m each to its apex at the north, toward Wacker Drive. A slight kink in the west face
and a jog in the north-east face stay in the model. The mullions are 6 cm wide, about 1.5 m
apart, set out from each face's middle. That spacing is read on the Skyscraper Center's
photographs, and is an estimate.

## Against the photograph

Projected through the geographic camera, the tower's west corner stands at 6,932 layer
units, its roof at 1,864. It is the nearest mapped building behind the seam at 6,997 to
6,999, where Three Illinois Center's north-east corner and The Buckingham's west edge leave
sky; NBC Tower stands farther behind. The
photograph's narrow strip at The Buckingham's edge tops out within 5 units of that corner's
roof, 54 units left of it. The drawing sits about 110 units left of the projection here, so
the strip is not settled as the Swissôtel; see the [label audit](building-labels.md).

## Model

- **Walls:** a flush curtain wall of reflective glass.
  - A mullion on each module.
  - A transom on each floor line, with a panel to each floor between them.
  - A coping at the roof.
- **Roof:** flat.

Colours follow the drawing's greys.

Omitted:

- the block, about 18 by 7.5 m, that the hotel's outline adds to the tower's north-east face;
  it has no height of its own;
- the podium, which carries no height or levels;
- the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof at 139.3 m, and the record's one part;
  - up the south face between mullions, a panel to each of 45 floors, a transom on each floor
    line, and the coping;
  - ten panes in ten modules of 1.5 m between mullions;
  - from the photograph's eye, through the skyline camera, the seam's two layer columns meet
    a model at every layer unit from 1,900 to 2,950, the Swissôtel over Three Illinois
    Center's roof;
  - the model's exported palette, whose window tones the frame does not share;
  - the exact mapped part at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group of nine buildings: four towers measured on sunlit
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

Identification: `bun scripts/panorama-owners.ts building-swissotel` places the hotel's south face at
x 2070–2112 from row 368, with the photographer's eye fitted as for FID-COL-005, 10 m east and 100 m
south of the drawing's fitted eye, at 1.6 px RMS: a ray from that eye through each pixel meets the
nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction. The
Buckingham, in front, leaves it the strip at x 2070–2078 below its own roof and the few rows above.
The photograph shows a dark tower of reflective glass, with a light crown, at x 2067–2076, its top
at about row 366, within three pixels of the prediction. The box below lies wholly on that face, as
the script's `--box` option reports and `tests/panorama-owners.test.ts` checks.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-swissotel` downloads
the photograph once, checks its SHA-256, and reproduces these rows and the palette's entries,
decoding in Chrome without colour management.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Curtain wall, south face | 2070, 372, 2077, 465 | all | 651 (100.0%) | `71, 80, 86` | 51–88 / 64–97 / 74–102 |

Decisions in `src/models/colour-palette.ts`:

- `blue-green glass` `71, 80, 86`, the curtain wall's reflective glass as the photograph shows it,
  seven pixels wide; `lit window` and `dim window` take it exactly, since no office lights show by
  day.
- `neutral` stays grey. The white podium is below Grant Park's trees in the photograph.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the view sees a sliver
of its south face beside the Buckingham, partly in its shadow: it renders `50, 56, 61` at its median
against the photograph's `71, 80, 86`, 0.5 in linear light, and 0.75 where it is out of the shadow.
