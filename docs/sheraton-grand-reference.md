# Sheraton Grand Chicago Riverwalk: reference audit

`models/sheraton-grand-geographic.ts` builds the Sheraton Grand Chicago Riverwalk, 301 East
North Water Street, for the geographic layout only. The drawing's `buckingham-east` group, right
of The Buckingham, is its corner: a lit crown over a tower of windows. That is outside the
excerpt the original layout is fitted to, so the original layout has no model of it. The model
is a reconstruction from OpenStreetMap, published data and photographs, not a survey or
construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 592122464](https://www.openstreetmap.org/way/592122464), version 5: the
  tower, an L with round ends, tagged 31 levels. It is a part of the complex's outline,
  [way 188171430](https://www.openstreetmap.org/way/188171430), with more parts on it:
  - [1269924307](https://www.openstreetmap.org/way/1269924307), a round tower at the corner,
    34 levels;
  - [1269924306](https://www.openstreetmap.org/way/1269924306) and
    [1269924308](https://www.openstreetmap.org/way/1269924308), the arms to their round ends,
    32 levels;
  - [1269924309](https://www.openstreetmap.org/way/1269924309), a block in the inner corner
    between the arms, 33 levels;
  - low parts, three to five levels, under the rest of the outline.

  They were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6250,41.8860,-87.6050,41.8980)
  on September 29, 2026.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/sheraton-chicago-hotel-towers/10020):
  112.3 m / 369 ft, 112.8 m / 370 ft to the tip, 97 m / 318 ft to the highest occupied floor,
  33 floors, completed 1992, Solomon Cordwell Buenz.
- [Emporis, archived in 2015](https://web.archive.org/web/20150512213726/http://www.emporis.com/buildings/116861/sheraton-chicago-hotel-towers-chicago-il-usa):
  "Height (architectural) 330.56 ft", "Height (main roof) 290.50 ft", "Height (top floor)
  280.25 ft", "Height (floor-floor) 8.75 ft", 31 floors.
- [Wikimedia Commons, the Sheraton at night](https://commons.wikimedia.org/wiki/File:Sheraton_Grand_Chicago_(at_night).jpg),
  and a view down from Aon Center, [*Chicago from AON Center*](https://commons.wikimedia.org/wiki/File:Chicago_from_AON_Center_(14559522491).jpg):
  - a cream precast tower of punched windows, its arms ending in round towers;
  - an open drum of maroon fins on each round end, the corner's highest;
  - the drums floodlit at night.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). Right of The Buckingham,
  from about 7,300 to 7,430 layer units, the photograph shows a golden lit crown from 2,160
  to 2,260 over a tower of lit windows. The drawing paints the crown in pale and dark greys,
  from 7,308 to 7,441 and 2,167 to 2,259, over a grey tower.

## Heights

The two sources measure from different levels. The Skyscraper Center's top, 112.3 m, stands
11.55 m over Emporis's 330.56 ft, and its highest occupied floor, 97 m, 11.58 m over Emporis's
top floor. The drawing reads the crown's top at about 108 m, nearer the Skyscraper Center's,
so the model stands on its datum and takes Emporis's differences.

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors | 2.67 m | Emporis: 8.75 ft floor-to-floor |
| Top floor | 97 m | The Skyscraper Center: the highest occupied floor |
| Corner's roof | 100.1 m | Emporis: 10.25 ft from the top floor to the main roof |
| Arms' roof | 94.76 m | Two floors lower, the mapped arms' 32 levels to the corner's 34 |
| Drums | 12.2 m | Emporis: 40.06 ft from the main roof to the architectural top |
| Corner drum's top | 112.3 m | The Skyscraper Center |

Each window is 1.5 m tall, 80 cm over its floor line, the floor lines counted down from the
top floor.

## Plan

The tower is an L, 52 m east to west and 56 m north to south, its corner to the south-west
and its arms ending in round towers. OpenStreetMap tags the L 31 levels and its parts over
it more. The photographs show each arm one slab with the L to its round end, so the model
builds the mapped L to the arms' roof, at their mapped 32 levels. The corner's round tower
rises on its mapped part, two floors over it, to the corner's roof.

The drums stand on the three round ends, circles fitted to the mapped parts' arcs within
11 cm:

| Drum | Centre, east and north of Crain | Radius |
| --- | --- | ---: |
| Corner | 407.44, 465.95 m | 7.97 m |
| East arm | 439.52, 462.06 m | 7.37 m |
| North arm | 409.75, 498.32 m | 7.39 m |

Projected through the geographic camera, the corner drum spans 7,423 to 7,544 layer units,
from 2,231 to 2,135. The drawn crown is as tall, 92 units against 96, and stands about 115
units left of it and 30 lower, as the drawing sits left of the projection on this side.

## Model

- **Tower:** precast, a window 1.4 m wide in each 2.4 m bay on every floor, set out from each
  face's middle and carried round the round ends.
- **Corner:** the round tower two floors over the arms, in the same precast and windows.
- **Drums:** 24 facets each, cream and maroon fins in turn, closed at top and bottom.

Colours follow the drawing's greys: the precast mid grey, the drums light, their fins dark.

Omitted:

- the block in the inner corner between the arms, tagged 33 levels, a floor over the arms'
  roof;
- the stepped crown under each drum, which the drums' 12.2 m takes in;
- the low parts under the rest of the complex's outline;
- the drums' openness, the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the corner drum's top at 112.3 m, the arms' drums' at 106.96 m and the arms' roof at
    94.76 m, and the record's two parts;
  - a drum's facets, cream and fin in turn;
  - the east arm's south face: 35 windows, one to each floor line under the arms' roof,
    with a sill and a head 5 cm either side;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped L at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
