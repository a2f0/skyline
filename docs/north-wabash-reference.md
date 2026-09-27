# 330 North Wabash: reference audit

`models/north-wabash-geographic.ts` builds 330 North Wabash, the former IBM Building and
now AMA Plaza, for the geographic layout only. The drawing models it, under the label
Michigan Plaza South, in the original layout; that model is `models/michigan-plaza-south.ts`
and is unchanged. The geographic model is a reconstruction from published data and one
photograph, not a survey or construction drawings.

## The drawing's Michigan Plaza South is 330 North Wabash

The drawing labels the tall dark tower left of One Prudential "Michigan Plaza South". Through
the photograph's recovered camera (see [the geographic audit](skyline-geography.md#skyline-camera)),
the mapped Michigan Plaza South, 205 North Michigan Avenue, stands behind One Prudential,
790–930 layer units right of the drawn tower, from 4045 to 4595.

Projecting every mapped building in the area through the same camera finds 330 North
Wabash, at 2.9 km from the camera, where the drawn tower stands:

| Drawn roof point | Drawn | Mapped 330 North Wabash at 211.84 m |
| --- | --- | --- |
| West end | 3254.8, 1577.3 | 3264.8, 1576.4 |
| Near corner | 3466.0, 1572.4 | 3469.6, 1566.1 |
| East end | 3661.6, 1588.6, where One Prudential covers it | East face runs on behind One Prudential to 3770.5 |

Read through the camera, the drawn roof stands at 210.9–211.7 m against the mapped 211.84 m.
No other mapped building reaches the drawn roof there: the tallest in that part of the
frame, MILA and Millennium Park Plaza, top out 280 and 435 layer units lower. In the photograph the tower is a dark
slab with lit floors, a louvered band at the top, and a flat roof. The mapped Michigan Plaza
South stays in the geographic layout, where the photograph could not show it.

## References checked September 27, 2026

- [OpenStreetMap way 64596068](https://www.openstreetmap.org/way/64596068), version 20:
  the outline, height 211.84 m, 52 levels, Mies van der Rohe, a black glass building.
  Retrieved on this date through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6300,41.8820,-87.6180,41.8920),
  later than the rest of the extract.
- [Wikipedia](https://en.wikipedia.org/wiki/330_North_Wabash):
  - completed 1972 to Mies van der Rohe's design with C. F. Murphy;
  - 695 ft (212 m) tall, 670 ft above its plaza, which stands 25 ft above the street;
  - 52 stories, 46 of them usable, with two mechanical floors above the 16th and three
    more high in the tower, louvered in place of windows;
  - a 120 by 270 ft plan on 30 and 40 ft column bays;
  - bronze-anodized aluminium I-beam mullions and spandrels with bronze-tinted glass;
  - a 26 ft lobby behind bronze-clad columns.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite plinth | 0–7.6 m | The plaza's 25 ft above the street |
| Lobby | 7.6–15.5 m | Its 26 ft |
| Office floors | 46 at 3.81 m | 12 ft 6 in; the photograph's rows 18.6 px apart, 3.76 m through its camera |
| Lower mechanical floors | 72.7–82.0 m | Two above the sixteenth, 4.66 m each; estimate |
| Upper mechanical floors | 200.1–211.84 m | The photograph's dark band, the top 11.7 m |
| Roof | 211.84 m | Mapped; the published 695 ft |

The published "three mechanical floors above the 47th story" would stand lower than the
photograph's dark band. The model puts the three at the top, as the photograph shows.

## Model

The mapped outline, a 37 × 83 m slab, stands from the street. Granite faces the plinth, and
on the plaza bronze-clad columns stand on the 30 ft bays of the long faces and the 40 ft bays
of the short ones, in front of the lobby's glass.

Above, I-beam mullions 0.1 m wide and 0.18 m deep stand one 5 ft module apart. Behind them
each floor has a bronze spandrel 1.07 m deep and bronze glass, with a few lit windows. The
mechanical floors carry louvers. A bronze fascia caps the wall at the roof.

The glass on each face is one skin cut into cells two modules wide. Omitted: the plaza and
its steps, the entrances, the roof's antennas, the roof garden, and signage. Colours follow
the original artwork's grayscale palette.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the mapped roof;
  - on the south face, a spandrel on an office floor's line and the glass above it, the
    louvers at the top, the lobby's glass, and the granite plinth;
  - the exact mapped outline at grade.

  Every mesh is closed. The skyline camera's landmarks include the mapped roof's
  south-west and south-east corners, against the drawn tower's roof.

Reference pages are research inputs only; the viewer downloads nothing from them.
