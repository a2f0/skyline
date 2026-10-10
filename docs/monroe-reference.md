# Monroe Building: reference audit

`src/models/monroe-geographic.ts` builds the Monroe Building, 104 South Michigan Avenue, for
the geographic layout only. The drawing shows it left of the University Club, across
Monroe Street, outside the excerpt the original layout is fitted to, so the original
layout has no model of it. The model is a reconstruction from OpenStreetMap, published
history, the drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498713](https://www.openstreetmap.org/way/145498713), version 7:
  the outline on the south-west corner of Michigan and Monroe. It is tagged 16 levels and a
  gabled roof of two levels, with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with the MacLean Center, way
  145498712, tagged 18 levels.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/monroe-building/22557):
  69 m (226 ft) architectural and to the tip, 16 floors, completed 1912.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Monroe Building, 1910–1912, 211 ft.
- [Chicagology](https://chicagology.com/skyscrapers/skyscrapers048/):
  - Holabird & Roche, 1912, sixteen stories;
  - 89 feet on Michigan Avenue and 172 feet on Monroe Street;
  - "two roomy floors in the attic formed by the sloping roof";
  - granite for the first two stories and terracotta above;
  - on the south-west corner of Michigan and Monroe, the University Club on the opposite
    corner.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.3 of the drawing's layer units are one metre of height. The photograph shows:
  - the gable facing Michigan, with two rows of small arched windows;
  - the terracotta front's bays of paired windows between pilasters;
  - a belt course two floors below the cornice.

The model's ridge is the Skyscraper Center's 69 m. The City's guide gives 211 ft (64.3 m);
its heights run below the other sources' along this street. Where published heights
disagree, the layout takes the one nearest the drawing, whose ridge here reads 67.7 m.

## Plan

The mapped outline is 27.6 m along Michigan and about 54.3 m along Monroe. Its north and
south walls are a little out of parallel, the lot about 0.6 m narrower at its west end.

Projected through the geographic camera, the Michigan front spans 447 to 627 layer units at
grade. The drawing's front runs from 492 to 662, right of the projection by 30 to 45 units,
as at the University Club.

The drawn front has five bays of paired windows, their mullions about 5.3 m apart and
centred a little south of the front's middle. The model centres five bays on the front,
5.5 m apart, and the same spacing on the other walls.

The drawn gable spans the front under a roof whose ridge runs west. Its lower row holds
three pairs of small arched windows about 5.6 m apart, and its upper row one pair.

## Heights

Heights are read on the drawn Michigan front through the geographic camera and scaled by
69/67.7, so that the drawn ridge meets the published one. The scale adds 1.9%.

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite storeys | 0–14.8 m | Estimate: what fourteen storeys leave under the drawn floors |
| Typical floor | 3.62 m | Drawing: the window rows, 3.55 m apart as drawn |
| Belt course | 50.9–52.1 m | Drawing: over the twelfth floor |
| Fourteenth floor's windows | 55.6–57.8 m | Drawing |
| Cornice | 58–59.3 m | Drawing |
| Gable's foot and eaves | 59.3 m | Drawing |
| Attic's lower windows | 59.4–61.3 m | Drawing |
| Attic's upper windows | 62.9–64.6 m | Drawing |
| Ridge | 69 m | Drawing: the verge's top, the published height |

The hill in the drawing hides the building below 31 m. The published sixteen storeys, two of
them in the roof, leave fourteen under it: twelve of terracotta on the drawn pitch and two
of granite, 14.8 m together, which is an estimate.

## Model

- **Walls:** the lot to the eaves, the two granite storeys in granite, terracotta above.
  - The Michigan front, Monroe front and west wall carry bays of paired windows 1.3 m wide
    either side of a mullion.
  - A belt course runs over the twelfth floor, and a cornice under the roof.
  - The south wall is shared with the taller MacLean Center and stays plain.
- **Roof:** a closed solid 5 cm inside the walls, on the lot's four corners, from the eaves
  to a ridge between its gables' middles. Its slopes are in two triangles each, since the
  lot is out of square.
- **Attic windows:** dark panels 3 cm proud of the Michigan gable, their heads stepped to
  the middle half for the arch: three pairs low and one pair high.

Colours follow the drawing's greys, not the terracotta's pink or the roof's green tile.

Omitted:

- the pilasters and ornament;
- the dormers on the roof's slopes;
- the entrances;
- the MacLean Center, which hides the south wall.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the published ridge, the record's one part from grade to it, the south slope, and the
    walls' top in front of the gable;
  - the Michigan front's paired windows, mullions and piers;
  - the granite storeys, the fourteenth floor, the belt and the cornice;
  - the gable's six lower and two upper windows, their stepped heads, and the gable between
    them;
  - the party wall, windowless along a floor, and the Monroe front's twenty windows to a
    floor;
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

Identification: `bun scripts/panorama-owners.ts building-monroe` fits the rendition to the mapped
buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted eye, at 1.6
px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where a sunlit
south face meets a shaded front, and four roofs. A ray from that eye through each pixel meets the
nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction. This
building shows its Michigan front at x 1283–1303, its roof at row 424; each wall box below lies
wholly on the face it names, as the script's `--box` option reports and
`tests/panorama-owners.test.ts` checks, while the roof box stands in the rows just above the walls'
highest row, which the option cannot test.

Shade: the Michigan fronts face east, into the photograph's shade, and the scene shades them too.
Where a building shows only that front, its stone or terracotta is estimated as if sunlit, so the
scene's own shade darkens it once: the shaded median times shade-to-sun factors of 3.25, 2.60 and
2.09 for red, green and blue in linear light, the ratio between the Railway Exchange's terracotta on
its sunlit south face and its shaded Michigan front (FID-COL-003). That front is mostly terracotta,
and its median moves about 8% as the brightness cutoff moves from 0.45 to 0.35. Other materials need
not share the ratio, and two comparisons disagree with it: Peoples Gas's front is mostly windows at
this scale, its terracotta 3% of the box above the cutoff, and its ratio runs from about 2.8 to 4.0
in red as the cutoff moves; Six North's sunlit brick and shaded front differ by only about 1.5 to
1.7, half the Railway Exchange's ratio in linear light, though that front's light pixels are partly
lighter terracotta. Borg-Warner's spandrels, sunlit and shaded, differ by only about 1.2, though
glossy enamel reflects the sky as much as it scatters the sun. So the estimates are provisional,
uncertain by a factor of two or more in linear light, until a second matte material showing both
faces confirms the ratio. `bun scripts/sample-colours.ts day` measures the pair and prints each
estimate. Glass keeps its measured value: it reflects the sky rather than scattering the sun.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-monroe` downloads the
photograph once, checks its SHA-256, and reproduces these rows and the palette's entries, decoding
in Chrome without colour management. The building's visible faces are 21 pixels wide in all, so
single pixels mix neighbouring materials, which the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Terracotta, Michigan front, shaded | 1285, 431, 1304, 462 | sat 0–0.35, val 0.45–1 | 156 (26.5%) | `110, 117, 125` | 105–118 / 112–124 / 119–129 |
| Glass, Michigan front | 1285, 431, 1304, 462 | val 0–0.3 | 126 (21.4%) | `53, 60, 67` | 43–58 / 49–65 / 57–72 |
| Roof, for comparison | 1285, 424, 1304, 431 | all | 133 (100.0%) | `95, 95, 100` | 72–105 / 76–109 / 80–116 |

Decisions in `src/models/colour-palette.ts`:

- `pink terracotta` `189, 181, 175`, the sunlit estimate of the shaded front's `110, 117, 125`: at
  this distance it reads a warm grey, not pink.
- `glass` `53, 60, 67`; `lit window` and `dim window` take it exactly, since no office lights show
  by day.
- `green tile`, the roof, stays grey: it measures `95, 95, 100` here, grey rather than green.
  `granite`, the base behind the trees, and `neutral` stay grey too.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the terracotta renders
`97, 106, 117` against the photograph's shaded front, 0.82 in linear light. That compares the
scene's shade with the Railway Exchange's, which built the estimate, more than it tests the estimate
itself.
