# Peoples Gas Building: reference audit

`src/models/peoples-gas-geographic.ts` builds the Peoples Gas Building, 122 South Michigan
Avenue, for the geographic layout only. The drawing shows it between the Lake View Building
and Adams Street, with 200 South Michigan, the Borg-Warner Building, before its Adams front.
That is outside the excerpt the original layout is fitted to, so the original layout has
no model of it. The model is a reconstruction from OpenStreetMap, published history, the
drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap relation 15953439](https://www.openstreetmap.org/relation/15953439), version
  2, the Peoples Gas Building. Its outline is
  [relation 15953438](https://www.openstreetmap.org/relation/15953438), version 4, on
  [way 145498710](https://www.openstreetmap.org/way/145498710), version 9, tagged 122 South
  Michigan Avenue with no height. Its parts:
  - way 1179833660, version 2, 20 levels: a ring round the lot;
  - way 1179833658, version 2, 21 levels: a wing within the ring, north of the court;
  - way 1179833661, version 1, 15 levels: inner wings west and south of the court;
  - way 1179833659, version 2, 1 level: the court;
  - way 1179842408, version 1, 1 level: a notch in the north wall.

  They were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. The outline shares its north wall's nodes with the Lake View
  Building, way 145498711.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: Peoples Gas, 1910–1911, 272 ft.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/peoples-gas-building/26977):
  92 m (302 ft) architectural and to the tip, 20 floors, 1911, D. H. Burnham & Co.
- [Wikipedia](https://en.wikipedia.org/wiki/Peoples_Gas_Building): 265 ft (81 m), 21
  storeys, 1911, D. H. Burnham & Company.
- [Chicagology](https://chicagology.com/skyscrapers/skyscrapers038/):
  - "The building is 20 stories high, with two basements, on hardpan caissons";
  - "The exterior walls on the two street fronts, above the ornamental monolithic granite
    columns, are supported on steel cantilever girders";
  - "Exterior of granite and terra cotta";
  - "A central light court, 60×70 feet in area, extends up to the seventeenth floor, above
    which level the area increases to 98×76 feet. The court is open at the top, and the
    interior walls finished in white-enameled brick";
  - a frontage of 196 feet.
- [Emporis, archived in 2007](https://web.archive.org/web/20070503093422/http://www.emporis.com/en/wm/bu/?id=peoplesgasbuilding-chicago-il-usa):
  20 floors, 1911, D. H. Burnham & Company.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.8 of the drawing's layer units are one metre of height. The photograph shows:
  - the Michigan front's eleven bays of paired windows between corner piers, each pier
    with a window to a floor;
  - a colonnade three floors tall under an entablature;
  - the attic's windows under a frieze, a cornice and its cresting;
  - the Borg-Warner Building's glass wall before the Adams front.

The published heights disagree: the City's 272 ft (82.9 m), Wikipedia's 265 ft (80.8 m) and
the Skyscraper Center's 92 m. The drawn cresting reads 86 m, and the cornice under it 84.8
m. Where published heights disagree, the layout takes the one nearest the drawing's
reading. Here that is the City's, 3.1 m under it; the Skyscraper Center's stands 6 m over
it. The model's top, the cresting's, is 82.9 m.

## Plan

The mapped outline is 60.5 m along Michigan and 52.4 m along Adams. The mapped parts
divide it:
- The ring runs round the lot, 10 to 20 m deep.
- The court is 17.9 by 21.3 m, Chicagology's 60 by 70 ft.
- The inner wings stand west and south of the court. Over them the court measures 23 by
  30 m, Chicagology's 76 by 98 ft.
- The north wing stands between the court and the north wall.
- The notch in the north wall, 12.6 m wide and 4.8 m deep, meets the Lake View Building's
  light court.

Projected through the geographic camera, the Michigan front spans −204 to 212 layer units
at grade. The drawing's front runs from −126 to 279, 67 to 78 units right of the
projection, as at the Lake View Building.

The drawn front has eleven bays of paired windows between corner piers. The colonnade's
twelve columns stand on the bay lines, about 4.4 m apart. The first column's middle stands
5.2 m from the corner read on the wall's plane, and 6.5 m as a fraction of the drawn front.

The model centres eleven bays on the Michigan front, 4.41 m apart, between corner piers 6 m
to the first column's middle. The Adams front has nine bays, 4.49 m apart, of which the
drawing shows four beside the Borg-Warner Building. Measured as drawn:

| Feature | Width |
| --- | ---: |
| Paired windows | 1.2 m each, either side of a 38 cm mullion |
| Corner piers' windows | 1.7 m, their middle 2.6 m from the corner |
| Attic's windows | 1.7 m, over each bay and pier |
| Colonnade's columns | 1.6 m |

## Heights

Heights are read on the drawn Michigan front through the geographic camera and scaled by
82.9/86, so that the drawn cresting meets the published top. The scale takes off 3.6%.

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite storeys | 0–12.8 m | Estimate: what twenty floors leave under the drawn ones, a belt from 12 m |
| Typical floor | 3.65 m | Drawing: the window rows, 3.79 m apart as drawn |
| Colonnade | 65–74 m | Drawing: its rail to 67.4 m |
| Entablature | 74–75.5 m | Drawing |
| Attic's windows | 76.1–78.4 m | Drawing |
| Frieze | 79.1–81.3 m | Drawing: pendants from 78.1 m |
| Cornice | 81.3–81.7 m | Drawing: 90 cm proud, an estimate |
| Cresting | 81.7–82.9 m | Drawing: its top the published height |
| Court's floor | 6.9 m | Estimate: one storey, as mapped |
| Inner wings' roof | 63.9 m | Estimate: the seventeenth floor, as Chicagology describes |

The hill in the drawing hides the building below 31 m. The drawn rows put fourteen floors of
paired windows under the colonnade's three and the attic. With the two granite storeys under
them, the building has twenty floors, as Chicagology, Emporis and the Skyscraper Center
give; the granite storeys' heights are estimates. OSM tags the inner wings 15 levels, but
the model follows Chicagology's seventeenth floor for them.

## Model

- **Michigan and Adams fronts:** terracotta over granite.
  - The granite storeys: glass between the columns, 1.6 m wide on each bay line, granite
    corner piers, and a belt over them.
  - Fourteen floors of paired windows in each bay, and a window to each floor in each
    corner pier.
  - The colonnade: glass between the columns over a lighter rail, the corner piers'
    windows, and the entablature.
  - The attic's windows over each bay and pier, the frieze's pendants over the columns,
    the frieze in shadow, the projecting cornice, and its cresting of blocks 50 cm wide
    and 1 m apart.
- **Alley:** windows 1.6 m wide spread evenly about 3.2 m apart, one to each floor from the
  third. The drawing does not show this wall, so they are an estimate.
- **North wall:** shared with the Lake View Building, plain common brick, and open over the
  court's floor at the notch.
- **Light court:** white brick with windows spread as on the alley, also an estimate. It
  opens over the ground storey, and over the inner wings from the seventeenth floor.
- **Roofs:** flat, at the mapped parts' tops.

The parts meet corner to corner. Where a part's edge joins two of the outline's corners a
few nodes apart, it follows the outline between them. A part also takes any other part's
corner within 2 cm of its edges. The ring skips two of the Michigan front's nodes, 2 mm
and 6.5 cm off its edge, and passes 1.1 cm from a corner of the court.

Colours follow the drawing's greys, not the granite's or the terracotta's.

Omitted:

- the round shafts of the monolithic granite columns, painted flat on the wall;
- the ornament, and the cresting's shapes;
- the entrances;
- the north wing's twenty-first level, which OSM maps though the published floor counts
  and the drawing give twenty over the whole front;
- the neighbours: the Borg-Warner Building before the Adams front, and the Lake View
  Building beside the north wall.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the cresting's top and the cornice between its blocks;
  - the roofs of the ring and north wing, the inner wings' roof, the court's and notch's
    floors, and the parts' tops;
  - the Michigan front's 24 windows to a floor, the colonnade's 11 openings, 13 with the
    piers' windows, and the attic's 13 windows;
  - each bay's mullion, pair, opening, rail, attic window and shopfronts;
  - each column, its pendant and its granite;
  - the piers' windows and granite, the belt, the entablature, the frieze and the
    pendants' narrowing;
  - eighteen windows up a corner pier, one to each floor from the third;
  - the cornice 90 cm proud;
  - Adams's 20 windows to a floor and the alley's 19;
  - the court's white brick, between floors and over the inner wings, its east wall's
    seven windows, and the notch open to the Lake View Building's light court;
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

Identification: `bun scripts/panorama-owners.ts building-peoples-gas` fits the rendition to the
mapped buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted eye,
at 1.6 px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where a
sunlit south face meets a shaded front, and four roofs. A ray from that eye through each pixel meets
the nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction.
This building shows its south face at x 1163–1206 and its Michigan front at x 1207–1252, its roof at
row 406; each box below lies wholly on the face it names, as the script's `--box` option reports.

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
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-peoples-gas` downloads
the photograph once, checks its SHA-256, and reproduces these rows and the palette's entries,
decoding in Chrome without colour management. The building's visible faces are 90 pixels wide in
all, so single pixels mix neighbouring materials, which the quartiles show; the medians are the
values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Terracotta, south face, sunlit | 1192, 408, 1207, 455 | sat 0–0.35, val 0.5–1 | 435 (61.7%) | `175, 167, 160` | 149–211 / 144–202 / 137–191 |
| Glass, south face | 1192, 408, 1207, 455 | val 0–0.3 | 63 (8.9%) | `57, 57, 57` | 49–66 / 49–63 / 46–66 |
| Terracotta, Michigan front, shaded | 1210, 410, 1255, 455 | sat 0–0.35, val 0.45–1 | 103 (5.1%) | `108, 116, 122` | 103–113 / 112–122 / 118–128 |

Decisions in `src/models/colour-palette.ts`:

- `white terracotta` `175, 167, 160`, the sunlit south face's cream terracotta; the cornice takes
  it, and `glazed brick`, the light court's white brick, takes its colour. The shaded front's
  terracotta measures `108, 116, 122`, and with the south face gives the second of the shade pairs.
- `glass` `57, 57, 57`, 8.9% of the box; `lit window` and `dim window` take it exactly, since no
  office lights show by day.
- `dark granite`, the columns of the lower floors behind the trees, `common brick`, the walls the
  street does not show, and `neutral` stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, its front renders
`125, 127, 129` against the photograph's shaded front, `108, 116, 122`, 1.23 in linear light: its
colour is the sunlit face's, and the scene's shade is lighter than the photograph's here.
