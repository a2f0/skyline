# MacLean Center: reference audit

`src/models/maclean-center-geographic.ts` builds the MacLean Center, 112 South Michigan Avenue,
for the geographic layout only. It was built as the Illinois Athletic Club and now belongs
to the School of the Art Institute of Chicago. The drawing shows it between the Lake View
and Monroe Buildings, outside the excerpt the original layout is fitted to, so the
original layout has no model of it. The model is a reconstruction from OpenStreetMap,
published history, the drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498712](https://www.openstreetmap.org/way/145498712), version 10:
  the outline between the Monroe Building and the Lake View Building, tagged 18 levels,
  with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares nodes with both neighbours: the Monroe Building, way
  145498713, and the Lake View Building, way 145498711.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218055845/http://www.emporis.com/en/wm/bu/?id=wolberghall-chicago-il-usa):
  - Wolberg Hall, 18 floors, by Barnett, Haynes & Barnett and Swann & Weiskopf;
  - "Six floors were added in 1985 to the top of the building by architects Swann &
    Weiskopf";
  - "An elaborate ornamental frieze adorns the top of the original building at the 11th
    floor level."
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/maclean-center/26975):
  77.4 m (254 ft) architectural and to the tip, 18 floors.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Illinois Athletic Club, 1908 with its 1985 addition, 220 ft.
- [The School of the Art Institute of Chicago](https://www.saic.edu/news/hidden-saic): the
  building was built in 1908 as the Illinois Athletic Club, and the school acquired it in
  1993.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.4 of the drawing's layer units are one metre of height. The photograph shows:
  - the narrow front's five columns of windows;
  - the old club's cornice, with round windows in the frieze beside it;
  - the addition's floors over it, arched on the top one;
  - the parapet with its openings.

The model's parapet is the Skyscraper Center's 77.4 m. The City's guide gives 220 ft
(67.1 m); its heights run below the other sources' along this street. Where published
heights disagree, the layout takes the one nearest the drawing, whose parapet here reads
73.8 m.

## Plan

The mapped outline is 21.9 m along Michigan and 51.8 m deep. Its Michigan front has
sub-metre steps.

Projected through the geographic camera, the front spans 291 to 435 layer units at grade.
The drawing's front runs from 354 to 495, about 60 units right of the projection. The
drift grows toward the left of the panorama, from 30 to 45 units at the Monroe Building. The
drawn front's right edge meets the Monroe Building's drawn left edge.

Measured as fractions of the drawn front, its windows stand in five columns, symmetrical
about the middle: narrow windows 8.4 m either side of the middle, and wide ones at the
middle and 4.35 m either side. Their widths differ by section:

| Section | Narrow | Wide |
| --- | ---: | ---: |
| Old club's floors | 1.4 m | 2.36 m |
| Addition's floors | 2 m | 3.15 m |
| Parapet's openings | 2.9 m | 2.9 m |

The addition's top floor arches the wide windows only. The frieze's three round windows,
about 90 cm across, stand over them.

## Heights

Heights are read on the drawn front through the geographic camera and scaled by 77.4/73.8,
so that the drawn parapet meets the published one. The scale adds 4.9%.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–5.3 m | Estimate: under the drawn floors, its shopfronts to 4.7 m |
| Old club's floors | 3.36 m | Drawing: the window rows to the twelfth floor, 3.2 m apart as drawn |
| Bands | 42.9–45.9 m | Drawing |
| Cornice | 45.9–47.8 m | Drawing: 60 cm proud |
| Frieze | 47.8–50.9 m | Drawing: round windows at 48.8–49.7 m |
| Addition's windows | 51.45–72.19 m | Drawing: six floors, the top one arched from 71.56 m |
| Parapet's openings | 74.4–76.1 m | Drawing |
| Parapet's top | 77.4 m | Drawing: the published height |

The drawn rows put twelve floors under the old club's bands, with a 5.3 m ground floor,
and six in the addition: eighteen, as Emporis gives. The hill in the drawing hides the
building below 30 m, so the lower floors are estimates.

## Model

- **Michigan front:** stone.
  - Five columns of windows on every floor, at each section's widths, with shopfronts on
    the ground floor.
  - The old club's bands and projecting cornice, and the frieze's round windows over the
    wide columns, each cell of the wall tested against the circle.
  - The addition's floors, the top one's wide windows arched with heads stepped to the
    middle half, and the parapet's dark openings.
- **Alley:** windows 1.6 m wide every 3.2 m.
- **Side walls:** shared with the Lake View and Monroe Buildings, plain.

Colours follow the drawing's greys, not the stone's.

Omitted:

- the ornament;
- the entrances;
- the neighbours, which hide the side walls' lower floors.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the published parapet's top, the record's one part from grade to it, and the cornice's
    ledge;
  - the five columns' windows on an old floor and an added one, their edges at each
    section's widths, and the piers between;
  - the parapet's openings and their edges;
  - the wide windows' arched heads, and none over the narrow ones;
  - the round windows over the wide columns only, round rather than square;
  - the bands and a pier of the parapet;
  - the party wall, windowless along a floor and without bands, and the alley's seven
    windows to a floor;
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

Identification: `bun scripts/panorama-owners.ts building-maclean-center` fits the rendition to the
mapped buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted eye,
at 1.6 px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where a
sunlit south face meets a shaded front, and four roofs. A ray from that eye through each pixel meets
the nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction.
This building shows its Michigan front at x 1264–1280, its roof at row 413; each box below lies
wholly on the face it names, as the script's `--box` option reports and
`tests/panorama-owners.test.ts` checks.

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
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-maclean-center`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building's visible faces are 17 pixels
wide in all, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Limestone, Michigan front, shaded | 1268, 415, 1281, 460 | sat 0–0.35, val 0.45–1 | 47 (8.0%) | `126, 128, 130` | 108–182 / 114–171 / 120–167 |
| Glass, Michigan front | 1268, 415, 1281, 460 | val 0–0.3 | 148 (25.3%) | `43, 55, 64` | 34–55 / 46–63 / 56–71 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `215, 197, 182`, the sunlit estimate of the shaded front's `126, 128, 130`, from only
  8.0% of the box with wide quartiles: uncertain.
- `glass` `43, 55, 64`; `lit window` and `dim window` take it exactly, since no office lights show
  by day.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the limestone renders
`111, 116, 122` against the photograph's shaded front, 0.82 in linear light. That compares the
scene's shade with the Railway Exchange's, which built the estimate, more than it tests the estimate
itself.
