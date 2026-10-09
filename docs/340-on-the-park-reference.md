# 340 on the Park: reference audit

`src/models/on-the-park-geographic.ts` builds 340 on the Park, 340 East Randolph Street, for
the geographic layout only. The drawing shows it right of the Blue Cross and Blue Shield
Tower, outside the excerpt the original layout is fitted to, so the original layout has no
model of it. The [building audit](building-labels.md) settles the drawn group's identity:
its inset facade paths belong to this tower, not to Aqua behind it. The model is a
reconstruction from published data, OpenStreetMap, the drawing and photographs, not a
survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 95486949](https://www.openstreetmap.org/way/95486949), version 12,
  the outline, 62 levels, and its parts:
  - [284789056](https://www.openstreetmap.org/way/284789056), version 4: 64 levels to
    205 m;
  - [284789058](https://www.openstreetmap.org/way/284789058), version 4: to 40 m.

  All three were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6198,41.8842,-87.6168,41.8862),
  later than the rest of the extract.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/340-on-the-park/1583):
  - 204.9 m (672 ft) architectural height and tip;
  - the highest occupied floor at 192.4 m;
  - 64 storeys above ground and 6 below;
  - all concrete;
  - completed 2007.
- [Wikipedia](https://en.wikipedia.org/wiki/340_on_the_Park):
  - Solomon Cordwell Buenz;
  - the north side contoured to keep The Buckingham's views;
  - a winter garden for residents.
- [SkyscraperPage](https://skyscraperpage.com/cities/?buildingID=18341): the two-and-a-half-storey
  winter garden on the 25th floor.
- Daylight photographs on Wikimedia Commons:
  - [the south face from Millennium Park](https://commons.wikimedia.org/wiki/File:340_on_the_Park,_Chicago_in_May_2016.jpg),
    May 2016;
  - [the skyline from the Adler Planetarium's Skyline Walk](https://commons.wikimedia.org/wiki/File:Chicago_skycrapers_in_New_Eastside_from_the_Adler_Planetarium_Skyline_Walk_(52031707882).jpg),
    the drawing's own vantage.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). At the tower,
  about 8.9 of the drawing's layer units are one metre.

## Plan

| Feature | Mapped | Model |
| --- | --- | --- |
| Outline | 60.1 × 26.6 m | The tower and the corner block, from grade |
| Tower | Part 284789056 | The tower, to the roof deck |
| Corner block | Part 284789058: a triangle about 10 × 11 m | The block, to 51.7 m |

The tower has:

- a straight south face, 43.3 m;
- a 2.4 m step back at its east end;
- a diagonal south-east face, 20.6 m in two runs, which the Adler faces almost head on;
- a north face of seven runs, curved over 59.6 m.

The corner block fills the foot of the diagonal face.

## Heights

Heights are read on the drawn tower through the geographic camera. They are measured down
from the published 204.9 m top, since a difference within one building cancels the
camera's own vertical error. Read on their own, the drawn top stands about 9 m higher and
the tower about 40 layer units left of where the camera places the mapped one. That is the
bias the Blue Cross and Blue Shield Tower shows too.

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–9.5 m | Estimate: the bottom bay's five floors under the lowest beam |
| Typical floor | 2.96 m | Drawing: the beams 14.8 m apart, five floors each |
| Beams | Floor 6 at 21.35 m to floor 61 at 184.2 m | Drawing: the lowest and highest drawn beams |
| Winter garden's deeper beam | Floor 26, 79.5–81.7 m | Drawing: the one beam 2.2 m deep |
| Corner block's roof | 51.7 m | Photograph: its terrace railing level with floor 16's beam |
| Penthouse floors | 3.6 m each, floor 64 at 195.0 m | Drawing: four rows between the top beam and the band |
| Highest occupied floor | 192.4 m | Published; the model's floor 64 stands 2.6 m higher |
| Parapet band | 198.6–203.8 m | Drawing |
| Glass guard's top | 204.9 m | Published |

The map gives the corner block 40 m. The May 2016 photograph shows its terrace railing
level with a frame beam, the tenth from the top, as the drawing's tenth is floor 16's.
The block's floors run on the tower's pitch, and at least fourteen show above the trees.
So the model takes 51.7 m. A uniform pitch lands the beams within 2.7 m of the drawn
ones, which the drawing bunches in the middle of the tower.

The top penthouse floor stands at 195.0 m, 2.6 m over the published 192.4 m highest
occupied floor. The drawing and the May 2016 photograph both show four balconied rows
between the top beam and the parapet band. The published figure would leave room for only
three, or a band shorter than both show, so the model keeps the drawing. The base is
hidden in the drawing and every photograph, so the lobby is an estimate.

## Model

Every wall is a glass curtain wall, with cells about two 5 ft modules wide, a slab line at
every floor, and a few panes lit or dimmed.

The south face carries a white concrete frame, laid out from the photograph over its
43.2 m, west to east:

- a 1.92 m pier;
- a column of windows punched in white wall;
- a ladder of cantilevered balconies, each a slab and a glass railing, to the 60th floor.
  On the two floors over the winter garden's tall row and on the penthouse floors,
  recessed balconies cross it and the windows' column instead;
- a 2.24 m pier;
- the 24 m glass field;
- a column of recessed balconies, a slab edge and railing on each floor;
- a 2.24 m pier.

A beam crosses between the inner and east piers at every fifth floor. The parapet band
tops the whole face. The model counts floors one by one from the lobby. The listings put
the winter garden on the 25th floor, one under the model's count; the photographs cannot
settle how the building numbers its floors. Over floor 26's deeper beam, the winter garden runs floors 26 to 28
into one tall glazed row, with three round columns standing through its bay. Square posts
at the same stations cross the four penthouse floors. Railings run across the glass field
on the garden's floors and the penthouses.

The diagonal face is glass to the roof. The drawing's fins cross its last 8.6 m at every
beam floor and at the top penthouse floor, up to a white pier at the east tip. A glass
guard runs round the roof and round the corner block's terrace.

Omitted:

- the west and curved north faces' detail, which neither the drawing nor these photographs
  show, so they are plain curtain wall;
- the small balconies stacked at the east tip;
- the lobby and entrances;
- the rooftop antennas.

Colours follow the original artwork's grayscale palette.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof deck under the guard, and the published top;
  - the corner block's roof, its south wall, and the tower's diagonal face above it;
  - along the south face:
    - the west pier, the glass field and a beam, each at its depth;
    - the winter garden's deeper beam, where a regular beam does not reach;
    - a cantilevered balcony, a recessed balcony's railing, and the recessed railings over
      the ladder beside the winter garden and on a penthouse floor;
    - a penthouse post and the parapet band;
  - the winter garden's tall glazing where a regular bay shows a slab, and a column in it;
  - a jamb beside a punched window;
  - the glass guards over the roof and round the corner block's terrace;
  - a fin near the east tip, glass between the fins, and none 12 m back;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-09 — Daytime colours from Chicago.jpg (FID-COL-004)

The colour trial's sunny day gains a second group of buildings, measured as the first was
(FID-COL-003, in the [Railway Exchange's audit](railway-exchange-reference.md) and five others), in
the same photograph and with the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-09). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. It was completed in 2007.

Identification: the building's bearing and roof height from the drawing's fitted eye (1471.76 m east
and 1948.8 m south of Crain's mapped centre), fitted to the rendition through the six buildings
measured first, place it at x 1983–2048 with its roof near y 281; the fit holds those six within
about 25 pixels across and 4 pixels in height. It is the glass tower with a white frame at x
1997–2062, its glass guard's top at y 266.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-340-on-the-park`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building is about 65 pixels wide in the
rendition, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Concrete frame, sunlit | 1998, 270, 2040, 440 | sat 0–0.15, val 0.7–1 | 2,208 (30.9%) | `223, 227, 225` | 190–243 / 201–251 / 201–251 |
| Glass, south | 2007, 290, 2032, 440 | hue 160–230, sat 0.1–1, val 0–0.75 | 3,115 (83.1%) | `99, 124, 132` | 84–119 / 109–145 / 118–152 |
| Glass, east, for comparison | 2043, 270, 2060, 440 | all | 2,890 (100.0%) | `59, 89, 107` | 50–69 / 78–102 / 92–120 |

Decisions in `src/models/colour-palette.ts`:

- `concrete` `223, 227, 225`, the south face's white frame.
- `green glass` `99, 124, 132`, the south face's blue-green glass between the frame; `lit window`
  and `dim window` take it exactly, since no office lights show by day. The east face's glass
  measures darker and bluer, `59, 89, 107`.
- `aluminium`, the railings and guards, and `neutral` stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the frame renders
`210, 213, 212` under the photograph's rule, 0.87 of the photograph's brightness in linear light,
and the glass `94, 117, 128`, 0.91.
