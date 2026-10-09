# Railway Exchange Building: reference audit

`src/models/railway-exchange-geographic.ts` builds the Railway Exchange Building, 224 South
Michigan Avenue, also called the Santa Fe Building, for the geographic layout only. The
drawing shows it at Michigan and Jackson, left of the Borg-Warner Building, outside the
excerpt the original layout is fitted to, so the original layout has no model of it. The
model is a reconstruction from OpenStreetMap, published history, the drawing and
photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 124873931](https://www.openstreetmap.org/way/124873931), version 11: the
  outline on the north-west corner of Michigan and Jackson, tagged 224–226 South Michigan and
  17 levels, with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its north wall's nodes with Symphony
  Center, way 145493030, tagged 9 levels.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Railway Exchange (Santa Fe Building), 1903–1904, 235 ft; Orchestra Hall, 102 ft.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/santa-fe-building/9587):
  78.9 m (259 ft) architectural and to the tip, 17 floors, 1904, D. H. Burnham & Co.
- [Wikipedia](https://en.wikipedia.org/wiki/Railway_Exchange_Building_(Chicago)):
  - seventeen stories, by Frederick P. Dinkelberg of D. H. Burnham & Company, opened 1904;
  - white-glazed terracotta, and "round, porthole-like windows along the cornice";
  - a lightwell at the centre, covered with a skylight in the 1980s;
  - a rooftop sign, "Santa Fe" and later "Motorola".
- [Chicagology](https://chicagology.com/skyscrapers/skyscrapers188/): "The building is 17
  stories high"; "White-glazed terracotta sheaths the exterior façade and interior court
  and the lightwell is lined with white-glazed brick"; an open lightwell "surrounded by a
  ring of offices".
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  10 of the drawing's layer units are one metre of height. The photograph shows:
  - the Michigan front's eleven bays of paired windows, with a belt under the top three
    rows of pairs and the frieze's round windows;
  - a round window over each bay in the frieze under the cornice;
  - the green copper roof rising to a flat top, with the lit Motorola sign on it;
  - the Metropolitan Tower's shaft before the Jackson front.

## Heights

Where published heights disagree, the layout takes the one nearest the drawing's reading.
Read through the geographic camera:

| Feature | Drawn | Published | Model |
| --- | ---: | --- | ---: |
| Cornice's top | 73.7 m | The City's 235 ft, the building's height | 71.6 m |
| Roof's top | 79.4 m | The Skyscraper Center's 259 ft, its architectural height | 78.9 m |

Neither source says what its figure measures to. The model takes the City's building height
as the cornice's top and the Skyscraper Center's architectural height as the roof's, the
drawn features each is nearest. The cornice is read on the drawn Michigan front at its
corner. The roof's top is read where the drawn apex meets the projection of the lot's
middle. The record's height is the roof's, and its part's top the eaves.

Heights read on the front are scaled by 71.6/73.7, so that the drawn cornice meets the
published one:

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor's shopfronts | 0.6–7.2 m | Estimate |
| Typical floor | 3.73 m | Drawing: the window rows, 3.84 m apart as drawn |
| Windows | 2.5 m tall | Drawing |
| Belt | 53–53.8 m | Drawing: under the fourteenth floor |
| Frieze | 65.5–69.8 m | Drawing: round windows at 65.9–68.3 m |
| Cornice | 69.8–71.6 m | Drawing: 90 cm proud, an estimate |
| Roof | 71.6–78.9 m | As above; its flat top 10 m in from the fronts an estimate from the photograph |

The hill in the drawing hides the building below 20 m. The drawn rows put fifteen floors of
paired windows over the ground floor and the round windows' floor at the top: seventeen,
as the sources give. The floors under 20 m and the ground floor's height are estimates.
The rows above the belt stand 40 cm higher than the lower rows' pitch carries them, as
drawn.

## Plan

The mapped outline is 52 m along both Michigan and Jackson, and 52.7 m along the alley. The
Jackson wall stands
up to 6.7 cm inside the line between its corners.

Projected through the geographic camera, the Michigan front spans −1,254 to −847 layer units
at 71.6 m. The drawing's front runs from −1,127 to −725, 122 to 127 units right of the
projection. The drift keeps growing toward the left of the panorama, from 80 to 88 units at
the Borg-Warner Building. Here it puts the model's south-west corner past the left edge of
the skyline view, which frames the drawing.

Measured as fractions of the drawn front, its eleven bays stand 4.4 m apart. Each holds a
pair of windows 1.44 m wide either side of a 47 cm mullion, under a round window about 2.6 m
across.

## Model

- **Michigan and Jackson fronts:** white terracotta.
  - The ground floor's shopfronts.
  - Eleven bays of paired windows to each floor, the belt under the fourteenth floor, and a
    round window over each bay in the frieze.
  - The projecting cornice.

  The drawing shows the Jackson front plain, behind the Metropolitan Tower in the
  photograph. The model gives it Michigan's bays, an estimate.
- **Alley:** windows 1.6 m wide spread evenly about 3.2 m apart, one to each floor above the
  ground floor, the seventeenth's as tall as the round windows' band. The drawing does not
  show this wall, so they are an estimate.
- **North wall:** shared with Symphony Center, plain.
- **Roof:** a closed solid on the lot's four corners, from the eaves 10 cm in from the lines
  between them up to a flat top 10 m in from each side, over the light well. The
  photograph shows the flat top; the drawing simplifies the roof to a pyramid. The inset is
  an estimate from the photograph.

Colours follow the drawing's greys, not the terracotta's white or the copper's green.

Omitted:

- the light well, closed under the roof's flat top;
- the rooftop sign;
- the ornament and the entrances;
- Symphony Center and the Metropolitan Tower, which hide the north and Jackson walls' lower
  floors.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof's top, its east slope, the cornice's top, and the record's one part;
  - eleven bays of paired windows and eleven round windows on each front, the outer bays
    22 m either side of the middle;
  - a mullion, a window, a pier, a round window's edge and the belt;
  - seventeen windows up a bay, one to each floor;
  - the alley's sixteen windows to a floor, the seventeenth's among them, and the plain north
    wall;
  - the cornice, 90 cm proud;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.


## 2026-10-09 — Night colours from the panorama (FID-COL-001)

Source: `src/skyline.jpg`, the repository's 2013 night panorama from the Adler Planetarium's
lakefront, the photograph the drawing traces (19915 × 5315 px; SHA-256
`f6001e46471ea59f6fc07ae0eb9e7d5d8d243666f57d96d7efc6f59f2d7d5db4`; photographer and exact date
unknown; inspected 2026-10-09). It records the building under the city's night lighting in 2013,
so these are **observed** night colours, not the materials' daylight colours.

Method: `scripts/measure-group.ts` aligned the building's drawn group with the photograph
(`skyline.svg` places the image at x −15558.758, y −1754.2251, 26553.332 × 7086.6665 in the
drawing's layer space). Each sample is a box in photograph pixels (x0, y0, x1, y1, half-open), a
rule on hue (degrees), saturation and value (0–1) choosing one material's pixels in it, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. Single pixels at this scale mix neighbouring materials, which
the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Terracotta | 10830, 3010, 11110, 3240 | hue 25–60, sat ≥ 0.55, val 0.35–0.97 | 45,295 (70%) | `176, 132, 18` | 153–192 / 112–147 / 4–34 |
| Frieze, for comparison | 10830, 2990, 11110, 3008 | as terracotta | 4,427 (88%) | `203, 156, 51` | 186–215 / 141–167 / 36–65 |
| Lit windows | 10830, 3010, 11110, 3240 | sat ≤ 0.35, val ≥ 0.85 | 7,749 (12%) | `248, 238, 225` | 239–253 / 223–248 / 196–246 |
| Unlit glass | 10830, 3010, 11110, 3240 | val ≤ 0.30 | 4,165 (7%) | `64, 41, 0` | 54–71 / 34–47 / 0–7 |
| Copper roof | 10770, 2946, 10895, 2968 | hue 110–210, sat ≥ 0.10 | 1,277 (46%) | `100, 118, 115` | 79–116 / 93–135 / 92–134 |

Decisions in `src/models/colour-palette.ts`:

- `white terracotta` `176, 132, 18`, the floodlit front, the band and the cornice; the frieze
  measures lighter, as the model's lighter band and frieze greys render it.
- `copper` `100, 118, 115`, the hipped roof, a weathered grey-green.
- `glass` `64, 41, 0`: unlit panes read dark amber, their frames' floodlight spilling into them.
- `lit window` `248, 238, 225`; `dim window` takes it at the dim windows' grey.
- `common brick` takes the terracotta's colour at the plain walls' grey: the photograph does not
  show those walls. Inferred.
- `neutral` (the core and flat roofing) stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 2.1, on the building's surfaces of that material, and leaves its unmeasured ones
grey. In the skyline view at 1600 × 900, the rendered front's median is 0.53 of the photograph's in
linear light: the toon lights cannot raise the brightest floodlit faces to the photograph's level.
