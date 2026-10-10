# Lake View Building: reference audit

`src/models/lake-view-geographic.ts` builds the Lake View Building, 116 South Michigan Avenue,
for the geographic layout only. The drawing shows it between Peoples Gas and the MacLean
Center, outside the excerpt the original layout is fitted to, so the original layout has
no model of it. The model is a reconstruction from OpenStreetMap, published history, the
drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498711](https://www.openstreetmap.org/way/145498711), version 8:
  the outline between the MacLean Center and Peoples Gas, tagged 17 levels and limestone,
  and also named the Municipal Courts Building, with no height. It was retrieved through
  the [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares nodes with the MacLean Center, way 145498712, and with
  an outer way of the Peoples Gas relation to the south.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/lake-view-building/26976):
  73.2 m (240 ft) architectural and to the tip, 17 floors, completed 1912.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Municipal Courts (Lakeview Building), 1906 with its 1912 addition, 220 ft.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218073330/http://www.emporis.com/en/wm/bu/?id=lakeviewbuilding-chicago-il-usa):
  - 17 floors, by Jenney, Mundie & Jensen;
  - "The top 5 stories were a later addition (1912) by the original architects";
  - used as Chicago's city hall for a short time until 1911.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.5 of the drawing's layer units are one metre of height. The photograph shows the narrow
  front's three windows to a floor, arched on the floor under the attic.

The model's top is the Skyscraper Center's 73.2 m, the source most of the layout's heights
come from. The City's guide gives 220 ft (67.1 m). Its heights run below the other sources'
along this street: 250 ft for the Michigan Boulevard Building, whose archived Emporis entry
gives 82 m, and 211 ft for the Monroe Building, which the Skyscraper Center gives 69 m. The
drawing's top reads 71.9 m, between the two.

## Plan

The mapped outline is 11.7 m along Michigan and 51.8 m deep. A light court 12.5 m long and
2.8 m deep opens in its south wall.

Projected through the geographic camera, the front spans 212 to 291 layer units at grade.
The drawing's front runs from 272 to 354, about 60 units right of the projection, as at the
MacLean Center. Measured as fractions of the drawn front, its three windows are about 2.5 m
wide and 3.5 m apart about the middle.

## Heights

Heights are read on the drawn front through the geographic camera and scaled by 73.2/71.9,
so that its drawn top meets the published one. The scale adds 1.8%.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–10.3 m | Estimate: what seventeen floors leave under the drawn pitch |
| Typical floor | 3.92 m | Drawing: the window rows, 3.85 m apart as drawn |
| Sixteenth floor's arched windows | 65.7–67.7 m | Drawing: heads from 67.1 m |
| Attic's windows | 69.8–70.9 m | Drawing |
| Cornice band | 72.1–73.2 m | Drawing: its top the published height |

The drawn rows stand 3.85 m apart, 3.92 m once scaled. The published seventeen floors,
carried down at that pitch, leave a 10.3 m ground floor. The hill in the drawing hides the
building below 31 m, so the lower floors are estimates.

## Model

- **Michigan front:** stone.
  - Three windows 2.5 m wide to each floor, with tall shopfronts on the ground floor.
  - The sixteenth floor's windows arched, their heads stepped to the middle half.
  - The attic's small windows and the cornice band.
- **Alley:** four windows 1.6 m wide to a floor, spread evenly about 2.9 m apart, without
  the band or arches. The drawing does not show this wall, so its windows are an estimate.
- **Side walls:** the north wall, shared with the taller MacLean Center, the south wall,
  shared with the taller Peoples Gas, and the light court's walls stay plain.

Colours follow the drawing's greys, not the limestone's.

Omitted:

- the ornament;
- the entrances;
- the neighbours, which hide the side walls.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the top, and the light court open to the sky;
  - a floor's three windows, their edges and the piers between;
  - seventeen windows up the front's middle column, one to each floor;
  - the arched heads, the attic's windows and the cornice band;
  - the party wall, windowless along a floor, and the light court's plain walls;
  - the alley's four windows to a floor;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-005)

The colour trial's sunny day gains a third group, the Michigan Avenue wall from the Borg-Warner
Building to the Michigan Boulevard Building, measured in the same photograph as the first two
(FID-COL-003 and FID-COL-004) and shown at the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. No change to these materials between 2008 and 2013 is known to
this audit. Grant Park's trees hide the wall's lower floors; every box stops above them.

Identification: `bun scripts/panorama-owners.ts building-lakeview` fits the rendition to the mapped
buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted eye, at 1.6
px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where a sunlit
south face meets a shaded front, and four roofs. A ray from that eye through each pixel meets the
nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction. This
building shows only its Michigan front, at x 1255–1263, its roof at row 418; each box below lies
wholly on the face it names, as the script's `--box` option reports.

Shade: the Michigan fronts face east, into the photograph's shade, and the scene shades them too.
Where a building shows only that front, its stone or terracotta is estimated as if sunlit, so the
scene's own shade darkens it once: the shaded median times shade-to-sun factors of 3.05, 2.41 and
1.95 for red, green and blue in linear light. They are the mean of the ratios between one
terracotta's sunlit south face and shaded front on the Railway Exchange (3.25, 2.60, 2.09) and on
Peoples Gas (2.86, 2.21, 1.81); the two pairs differ by up to 14%, which bounds the estimate's
uncertainty. `bun scripts/sample-colours.ts day` measures both pairs and prints each estimate. Glass
keeps its measured value: it reflects the sky rather than scattering the sun.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-lakeview` downloads
the photograph once, checks its SHA-256, and reproduces these rows and the palette's entries,
decoding in Chrome without colour management. The building's visible faces are 9 pixels wide in all,
so single pixels mix neighbouring materials, which the quartiles show; the medians are the values
used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Limestone, Michigan front, shaded | 1256, 420, 1263, 460 | sat 0–0.35, val 0.45–1 | 150 (53.6%) | `117, 127, 134` | 108–128 / 118–138 / 125–145 |
| Glass, Michigan front | 1256, 420, 1263, 460 | val 0–0.3 | 77 (27.5%) | `12, 22, 30` | 2–23 / 14–34 / 19–41 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `195, 189, 181`, the sunlit estimate of the shaded front's `117, 127, 134`; the front
  is nine pixels wide, so the value is uncertain.
- `glass` `12, 22, 30`, the front's deep windows in shade; `lit window` and `dim window` take it
  exactly, since no office lights show by day.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the limestone renders
`100, 111, 121` against the photograph's shaded front, 0.76 in linear light.
