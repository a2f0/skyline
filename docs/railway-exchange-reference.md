# Railway Exchange Building: reference audit

`models/railway-exchange-geographic.ts` builds the Railway Exchange Building, 224 South
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
  - the Michigan front's eleven bays of paired windows and a belt under the top three
    floors;
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
