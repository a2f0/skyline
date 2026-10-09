# One Prudential Plaza: reference audit

Two models share one tower. `src/models/one-prudential-tower.ts` builds it from outlines and
the heights below; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Skyline copy | `createOnePrudentialPlazaBuilding` in `src/models/one-prudential-plaza.ts` | The mapped plan squared to the slab's grid, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createOnePrudentialGeographicBuilding` in `src/models/one-prudential-geographic.ts` | The mapped tower, wing, and antenna parts, exactly | Geographic layout |

Both are reconstructions from published data and one photograph, not a survey or
construction drawings.

## References checked September 27, 2026

- [OpenStreetMap ground outline 127107034](https://www.openstreetmap.org/way/127107034)
  and parts 685493609 (the tower: 41 levels, height 183), 685493610 (the east wing: ten
  levels, no height), 685493612 (the west wing: three levels, no height), and 685493614
  (the antenna: height 278). The local coordinate snapshot and attribution remain in
  `src/models/skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/one-prudential-plaza/2190):
  183.2 m architectural height and a 278 m antenna tip.
- [Wikipedia](https://en.wikipedia.org/wiki/One_Prudential_Plaza): completed 1955 to
  Naess & Murphy's design, 41 floors, a 601 ft (183 m) roof and a 912 ft (278 m)
  antenna, whose mast served WGN-TV.
- [ArchitectureChicago PLUS, "The Prudential Rediscovers its Shine"](https://arcchicago.blogspot.com/2013/09/the-prudential-rediscovers-its-shine.html):
  the limestone facade and its aluminium spandrels, 2,617 windows, escalators to the
  41st-floor observatory, and "a 73-foot-tall antenna for WGN" welded "into a nearly
  12-foot-deep socket at the top of a 311-foot-tall tubular steel mast mounted on the roof".
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). At One
  Prudential about 8.1 of the drawing's layer units, or 6.1 photo pixels, are one metre:
  through that camera the mapped south face spans 487.7 units against the drawn one's
  487.3.

## Plan

The mapped tower part is a slab: a 71.6 m south face, whose trace bows 0.28 m off its
chord, a 22.2 m east face, a 2.9 m step out along the north of its west end, and a
29 × 15.5 m annex behind. The east wing wraps the slab's east end: 38.2 m on Randolph,
15 m in front of the slab, and 60.4 m on Stetson. The west wing wraps its west end and
north side.

Limestone piers stand one 2.35 m bay apart. In the photograph the south face spans
365.4 pixels at a 12.0-pixel bay period, 30.45 periods: twenty-eight interior bays and
two end bays of 2.9 m, whose corner piers widen to fill them. The east face holds nine
bays, the end ones 2.875 m. The drawing's thirty and nine window columns agree, its
first window 1.76 m in from the corner against the model's 1.725 m.

| Feature | Mapped | Clean plan |
| --- | --- | --- |
| South face | 71.6 m, in four nearly collinear pieces | 71.6 m, straight |
| East face | 22.2 m | 22.2 m |
| West step and annex | As traced | Squared to the slab |
| East wing | As traced; its east face leans 1.9° | Squared, 38.2 × 60.4 m |
| West wing | As traced | None: it is lower than the drawing's datum |

The geographic model keeps the mapped outlines to the millimetre. Where the trace
splits a wall into nearly collinear pieces, the wall keeps one set of piers along them.
The clean plan squares the plan to the slab and keeps each mapped wall's length.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground storey | 0–12.03 m | What thirty-nine office floors leave under the observatory; estimate |
| Office floors 2–40 | 3.93 m pitch | Photograph 23.9 px; the drawing's 31 rows at 31.7 layer units |
| Windows | 0.85–2.45 m above each floor | The drawing's windows: 1.6 m tall, their heads 1.6 m under the band |
| Observatory band, the 41st floor | 165.3–169 m | Drawn 4.0–4.6 m deep under the roof |
| Coping and main roof | 169–169.5 m | Drawn 13.3 m under the screen's top, so about 169.9 m |
| Sign | 171–179.5 m | Photograph |
| Penthouse wall | to 180.3 m | Drawn 10.2–10.5 m above the roof |
| Louvered screen | 180.3–183.2 m | Published architectural height |
| Tubular mast | 169.5–259.4 m | The tip less WGN's exposed antenna; the drawing stops about 262 m |
| Antenna | 259.4–278 m | Published tip; 73 ft, 12 ft of it in the mast's socket |
| East wing | 56.4 m | Drawn 112.9 m under the tower's roof, so about 57.0 m |
| West wing | 13.4 m | Three levels at 183.2/41; the photograph cannot see it |

The published 183.2 m (601 ft) is the penthouse's top, not the main roof. The heights
above are measured down from it, in the photograph through its recovered camera. A
difference within one building cancels the camera's own vertical error, which an absolute
reading keeps: the camera is a compromise across eight buildings, and read on their own the
drawn roof corners stand at 165.5–166.6 m through it, having moved by a metre or more at
each of its refits. The drawn roof stands 13.3 m under the drawn screen's top, at about
169.9 m. Forty-one floors at the
photographed pitch, with the drawn 4.0–4.6 m band, fill the model's 169.5 m, within the
half metre a drawn line spans at this scale. The ground storey, thirty-nine office floors
and the observatory make the published 41.

The article's mast and antenna add up to 113.4 m: 311 ft of tube and the antenna's
61 exposed feet. Above a 169.5 m roof that would reach 282.9 m, 4.9 m over the published
tip. The model keeps the published tip and the antenna's exposed length, so the tube's top
stands at 259.4 m, about 2.7 m under where the drawing stops the mast, 92.2 m above the
drawn roof. The photograph loses the slim antenna against Trump Tower's dark glass.

The map gives the east wing ten levels and no height, which the earlier model took at
183.2/41 a level, 44.7 m. The photograph puts its roof about 57 m up, and the model takes
56.4 m, the first measurement's; its lit windows fall on the tower's floor lines, 25 pixels
apart.

## Facade

Limestone piers 1.1 m wide stand 0.3 m proud, from the street to a limestone sill course
under the observatory band. The corner piers are 1.1 m on each face, mitred where the
faces meet. Every bay has a 1.25 × 1.6 m window on every floor, with the aluminium
spandrel flush with the glass between. The observatory is a band of glass cut at the bay
lines, under a limestone coping. A deterministic hash lights or dims a few windows. The
wing has limestone ribs 1.0 m wide on the same module, centred on each wall, with dark
spandrels, windows on the tower's floors, and a coping. Walls a wing covers start their
piers and windows above its roof.

The penthouse runs 50.1 m along the south face from 2.3 m in, and 12 m deep. Its pale wall
carries the sign: a dark board from 6.9 to 45.6 m along the face, with the Rock of
Gibraltar and ten letter blocks, the capital and ascenders taller. Above, a dark louvered
screen carries vertical fins at 0.98 m: forty-nine on the south face from 2.2 m in, as the
drawing shows, and as many as fit on the others. The mast stands at the mapped antenna's
area centroid, 52.6 m along the south face and 14.9 m behind it. It is an eight-sided
tapered tube, 2.3 m across at the roof and 1 m at its top, and the antenna is 0.44 m square.

Omitted: the plaza, entrances, Alfonso Iannelli's bas-relief on the west wall, aviation
lights, and rooftop equipment other than the penthouse and mast. Colours follow the
original artwork's grayscale palette.

## The skyline copy

The drawing shows One Prudential from the photograph's treeline up, and the skyline
study's platform datum is that treeline. The skyline copy is the building from 40 m above
the street; the fit put the datum at 39.97 m. `skyline-study.ts` scales it by 1.314, turns
it 7.29°, and places it. These were fitted through the skyline camera at all five test
layouts to the drawn roof corners, band foot, penthouse and screen tops, and mast top; the
wing's three corners; twenty-nine south piers and eight east piers; forty-nine screen
fins; forty wing ribs; and six window rows. Depth keeps the earlier placement, from the
drawing's occlusion of Michigan Plaza South.

The drawn podium is the real east wing. Through this camera its 60.4 m east wall runs about
a bay past the drawn podium's end. The drawing shows twenty-four of its twenty-five ribs,
and its coping's outer corner lands 0.0029 past the drawn edge at the tablet layout, held
within the landmark tolerance.

Measured at all five layouts:

| Feature | Worst error | Tolerance |
| --- | ---: | ---: |
| Landmarks (the drawn screen's west end, at the desktop layout) | 0.00353 | 0.0039 |
| Tower piers and screen fins | 0.0007 | 0.0011 |
| Wing ribs | 0.0015 | 0.0021 |
| Window rows | 0.00145 | 0.0016 |

The drawing slopes the screen's top a little more steeply than the penthouse under it,
which makes the screen's west end the worst landmark.

## Verification

`bun run check` covers both:

- `tests/building-kit.test.ts` checks the skyline copy and the geographic model for
  counted triangles, winding, same-facing coplanar overlaps, and covered omissions. It
  checks that every mesh of the skyline copy closes edge for edge, and raycasts each
  drawn window row onto a window's glass.
- `tests/skyline-study.test.ts` projects the skyline copy against the drawing at five
  layouts:
  - the landmarks, with the near roof corner above both ends;
  - the piers, fins, and ribs, each the first surface on its sight line;
  - six window rows;
  - the wing's right silhouette.

  It also checks hover and occlusion.
- `tests/skyline-geography.test.ts` raycasts the geographic model:
  - the roof, the penthouse, and both wings' roofs;
  - the tubular mast's top and the antenna's tip, at the mapped antenna's area centroid;
  - on the mapped south face, glass, spandrel, pier, sill course, observatory glass and
    coping in turn;
  - the sign's board and the screen's first fin;
  - the mapped footprint's corners at grade.

  Every mesh is closed. The skyline camera's One Prudential landmarks are the roof's
  corners at 169.5 m and the tubular mast's top.

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
| Limestone, south | 14400, 2560, 14760, 3290 | hue 10–50, sat ≥ 0.35, val 0.25–0.92 | 189,864 (72%) | `136, 96, 63` | 119–149 / 82–107 / 50–75 |
| Limestone, east, for comparison | 14772, 2560, 14838, 3290 | as south | 4,297 (9%) | `107, 76, 45` | 77–137 / 53–99 / 33–58 |
| Unlit glass | 14400, 2560, 14760, 3290 | val ≤ 0.22 | 1,788 (1%) | `47, 32, 34` | 39–53 / 27–36 / 26–41 |
| Lit windows | 14400, 2560, 14760, 3290 | sat ≤ 0.35, val ≥ 0.80 | 35,404 (14%) | `250, 243, 242` | 240–254 / 227–251 / 222–251 |
| Sign board | 14410, 2462, 14660, 2512 | hue 200–250, sat ≥ 0.30, val 0.15–0.75 | 6,647 (53%) | `36, 57, 128` | 18–60 / 45–71 / 95–145 |
| Sign letters | 14410, 2462, 14660, 2512 | sat ≤ 0.25, val ≥ 0.85 | 3,230 (26%) | `249, 251, 254` | 240–253 / 245–254 / 250–255 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `136, 96, 63`, the south front's floodlit piers and courses, and the penthouse; the
  east face measures darker, which the model's own lighting already gives it.
- `aluminium` takes the limestone's colour at its grey: the spandrels between the piers read the
  same amber at this scale. Inferred.
- `glass` `47, 32, 34`, from few pixels, since most panes are lit or tinted amber.
- `sign board` `36, 57, 128` and `sign letters` `249, 251, 254`, the Prudential sign; the logo is
  white too.
- `lit window` `250, 243, 242`; `dim window` takes it at the dim windows' grey.
- `dark metal` (the dark spandrels and louver backing), `stainless` (the mast) and `neutral`
  (roofing) stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 2.1, on the building's surfaces of that material, and leaves its unmeasured ones
grey. In the skyline view at 1600 × 900, the rendered south front's median is 0.95 of the
photograph's in linear light.
