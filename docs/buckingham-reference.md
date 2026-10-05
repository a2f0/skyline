# The Buckingham: reference audit

`src/models/buckingham-geographic.ts` builds The Buckingham, 360 East Randolph Street, for the
geographic layout only. The drawing shows it right of 340 on the Park, outside the excerpt
the original layout is fitted to, so the original layout has no model of it. The
[building audit](building-labels.md) names the drawn group. Projected through the
geographic camera, the mapped outline confirms it:

- it spans 416 layer units against the drawn 408;
- it sits 95 units right of the drawing, the regional bias that grows from the Blue Cross
  and Blue Shield Tower's 33 and 340 on the Park's 44–75;
- Outer Drive East, its neighbour, would stand past the drawing's right edge.

The model is a reconstruction from published data, OpenStreetMap, the drawing and
photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 95486940](https://www.openstreetmap.org/way/95486940), version 11,
  the outline, 44 levels to 119 m, and its rooftop part
  [284790189](https://www.openstreetmap.org/way/284790189), version 1, to 122 m.

  Both were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6198,41.8842,-87.6168,41.8862),
  in the same request as 340 on the Park's.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/buckingham-plaza/10315):
  - 121.9 m (400 ft) architectural height and tip;
  - 44 storeys, all concrete;
  - completed 1982, by Fujikawa Johnson & Associates.
- [Wikipedia](https://en.wikipedia.org/wiki/The_Buckingham_(Chicago)): the pool, fitness
  centre and open roof deck on the top floor.
- Photographs on Wikimedia Commons:
  - [a close view of the tower](https://commons.wikimedia.org/wiki/File:Buckingham_chicago.JPG).
    It shows:
    - the concrete band at every floor;
    - piers between five bays a face;
    - bronze ribbon windows;
    - stacked corner balconies;
    - the top floor's tall openings under a deep cap.
  - [the skyline from the Adler Planetarium's Skyline Walk](https://commons.wikimedia.org/wiki/File:Chicago_skyscrapers_in_New_Eastside_from_the_Adler_Planetarium_Skyline_Walk_(52032999464).jpg),
    the drawing's own vantage. There the banded tower stands right of 340 on the Park; the
    turrets above it belong to a building behind.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). At the tower,
  about 9.2 of the drawing's layer units are one metre.

## Plan

| Feature | Mapped | Model |
| --- | --- | --- |
| Outline | 34.5 × 36.0 m | The tower, to the cap |
| End bays | About 6 m wide, 1.5–1.9 m forward of the middle on the south, east and north faces | Walls of their own, each carrying its skin |
| Middle bays | Three across 19.2 m on those faces | One wall, divided by two piers |
| West face | Flat, 35.2 m | Five bays, divided by four piers |
| Notched corners | South-east, 2.7 × 2.0 m; north-east, 2.1 × 1.8 m | A balcony in each, on every floor |
| Rooftop part | Part 284790189, 20 × 9 m | The rooftop enclosure |

## Heights

Heights are read on the drawn tower through the geographic camera. They are measured down
from the drawn top, set at the mapped 119 m, since a difference within one building
cancels the camera's own vertical error. Read on their own, the drawn top stands about
11 m higher, the bias the neighbouring towers show too.

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–6.2 m | Estimate: under floor 7 at the drawn pitch |
| Typical floor | 2.55 m | Drawing: 37 floor lines, 36 floors apart, from 18.9 m to 110.6 m |
| Floor 7 | 18.9 m | Drawing: its lowest floor line |
| Top floor, the 44th | 113.1 m, its openings 114.5–117.4 m | Drawing: the deeper band and tall row under the cap |
| Cap | 117.4–119 m | Drawing; 119 m mapped |
| Rooftop enclosure | 119–121.9 m | Published; mapped 122 m |

The drawn floor lines hold the uniform pitch to about 0.3 m. The base is hidden in the
drawing, so the lobby is an estimate.

## Model

Every wall carries a concrete band at every floor over a bronze ribbon window, with cells a
quarter bay wide and a few panes lit or dimmed. Each face's corner piers are painted in its
end cells. Piers stand proud between the bays:

- two across each set-back middle;
- four across the flat west face.

The top floor's band is deeper and its openings taller, under a cap to the mapped 119 m.
Each notched corner holds a balcony on every floor to the 43rd: a concrete slab under a
railing along its two open sides. The rooftop enclosure stands on its mapped part to the
published 121.9 m.

The drawing renders the tower in dark greys, so the model's concrete is darker than the
photograph's cream.

Omitted:

- the mullions within each ribbon window;
- the entrance and lobby;
- the roof deck's detail.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the rooftop enclosure's published top and the cap's mapped 119 m beside it;
  - along the south face:
    - an end bay standing forward of the middle;
    - a pier between the middle bays;
    - a floor's band and its window, and the top floor's opening between its band and the cap;
  - a balcony and its railing in each notched corner, and the 43rd floor's as the highest;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
