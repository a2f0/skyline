# Blue Cross and Blue Shield Tower: reference audit

`src/models/blue-cross-geographic.ts` builds the Blue Cross and Blue Shield Tower, 300 East
Randolph Street, for the geographic layout only. The drawing shows it right of Aon, outside
the excerpt the original layout is fitted to, so the original layout has no model of it.
The geographic layout frames the whole drawn skyline, where it stands. The model is a
reconstruction from published data, OpenStreetMap, and photographs, not a survey or
construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 95486960](https://www.openstreetmap.org/way/95486960), version 16,
  the outline, and its parts:
  - [284779637](https://www.openstreetmap.org/way/284779637), version 4: 54 levels to
    227 m;
  - [284779635](https://www.openstreetmap.org/way/284779635), version 5: to 212 m.

  All three were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6212,41.8845,-87.6180,41.8862),
  later than the rest of the extract.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/blue-cross-blue-shield-tower/1160):
  226.7 m (744 ft) architectural height and tip, the highest occupied floor at 208.3 m,
  completed 2010.
- [Wikipedia](https://en.wikipedia.org/wiki/Blue_Cross_Blue_Shield_Tower):
  - a 33-storey first phase by Lohan Associates, completed 1997;
  - a 24-storey second phase by Goettsch Partners, 2007–2010, the first project in
    Chicago built on top of an existing tower;
  - 57 storeys in all, three of them below ground.
- Daylight photographs on Wikimedia Commons:
  - [the tower from Grant Park](https://commons.wikimedia.org/wiki/File:Blue_Cross_Blue_Shield_Tower_in_Grant_Park.JPG),
    its south face;
  - [the Tiffany Foundation garden](https://commons.wikimedia.org/wiki/File:Tiffany_Foundation_Garden_in_Grant_Park.JPG),
    the tower beside Aon.

  Between them they show:
  - the central block forward of narrower end bays;
  - three bands of mechanical floors with exposed columns;
  - the end bays open through at the middle band;
  - the emblem screen over the block's roof.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). At the tower,
  8.7 of the drawing's layer units, or 6.6 photo pixels, are one metre.

## Plan

The two mapped parts share the corners where the block meets each end bay:

| Feature | Mapped | Model |
| --- | --- | --- |
| Outline | 92.8 × 50.7 m, with a 43 m projection to the north | The lobby, to 10.26 m |
| Central block | Part 284779637, 75.7 m across its south face and 65.2 m across its north | The block, to the screen's top |
| End bays | Part 284779635 outside the block: each 9 to 13 m wide, 33 m deep | The bays, to their roof |

The block stands about 4.8 m forward of the bays on the south and 4.5 m on the north. The mapped
parts are traced with their east and west walls about 7° off square. The model keeps them,
which makes the block a trapezoid.

The drawn group also paints, left of the tower between it and Aon, a dark brown sliver: the
Hyatt Regency Chicago's West Tower, which its own model builds; see the
[Hyatt Regency West Tower audit](hyatt-west-tower-reference.md).

## Heights

Heights are read on the drawn tower through the geographic camera. They are measured down
from the published 226.7 m top, since a difference within one building cancels the camera's
own vertical error. Read on their own, the drawn screen's top stands about 11 m higher.

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–10.26 m | Estimate: fourteen floors below the lower band at the photograph's pitch |
| Office floors | about 3.96 m | Photograph: rows 26 px apart |
| Lower mechanical band | 65.7–72.1 m | The drawn columns' foot and head |
| Middle mechanical band | 117.1–128.1 m | The same; the top of the 1997 tower, where the end bays open |
| Upper mechanical band | 170.1–176.6 m | The same |
| Highest occupied floor | 208.3 m | Published |
| End bays' roof | 212 m | Mapped |
| Block's glass top | 212.8 m | The drawn screen's foot |
| Screen top | 226.7 m | Published; mapped 227 m |

The model has 45 office floors: fourteen under the lower band, eleven in each of the next two
runs, and nine from the upper band to the highest occupied floor. Counting the lobby as two
storeys and the bands as two, three and two makes the published 54 above ground. Each run
is divided evenly between the measured bands: 3.96, 4.09, 3.82 and 3.96 m.

## Model

Every wall is a glass curtain wall on the 5 ft module:

- mullions one module apart;
- cells two modules wide, of glass with a few lit or dimmed;
- a dark spandrel at every floor.

Each band is a dark recess. The block's columns stand proud of it on its long faces, eight
across each, one to a structural bay. The same columns run up the screen, where the
company's two emblems, a cross and then a shield, stand in the first two bays at the south
face's west end. The end bays stop under the middle band and start again above it, leaving
it open through. The block's side walls carry their curtain wall only where it shows:
through that opening and above the bays' roof.

Omitted:

- the plaza, the entrances, and the north projection's detail;
- the figures inside the emblems;
- the lighting that turns the columns blue at night;
- the messages the tower spells in its window shades.

Colours follow the original artwork's grayscale palette.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the screen's 226.7 m and the end bays' 212 m;
  - the block standing forward of the bays;
  - the west bay, open at the middle band and standing below and above it;
  - the block's side wall, skinned through the opening;
  - each band's recess and a column in it;
  - the cross and the shield by their outlines, and no emblem past the second bay;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.


## 2026-10-09 — Night colours from the panorama (FID-COL-001)

Withdrawn from the trial on 2026-10-09 at the owner's request for a sunny day: the daytime colours
below (FID-COL-003) replace these in `src/models/colour-palette.ts`. The findings stand as the night
photograph's record.

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
quartiles of red, green and blue.
`bun scripts/sample-colours.ts night building-blue-cross-blue-shield` reproduces these rows and the
palette's entries, decoding the photograph in Chrome without colour management. Single pixels at
this scale mix neighbouring materials, which the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Glass and spandrels | 15780, 2120, 16260, 3350 | sat 0–0.4, val 0.2–0.6 | 319,788 (54.2%) | `72, 64, 80` | 57–98 / 49–91 / 64–107 |
| Unlit glass, for comparison | 15780, 2120, 16260, 3350 | val 0–0.2 | 47,255 (8.0%) | `34, 28, 42` | 25–42 / 22–33 / 33–48 |
| Lit windows | 15780, 2120, 16260, 3350 | sat 0–0.35, val 0.8–1 | 85,737 (14.5%) | `239, 238, 243` | 217–249 / 216–247 / 225–251 |
| Screen | 15800, 1975, 16250, 2075 | val 0–0.35 | 15,090 (33.5%) | `36, 29, 74` | 30–41 / 24–35 / 61–82 |
| Band lights | 15800, 2610, 16260, 2710 | hue 205–265, sat 0.4–1, val 0.45–1 | 11,411 (24.8%) | `11, 33, 161` | 3–27 / 23–61 / 137–193 |
| Screen's bars, for comparison | 15800, 1975, 16250, 2075 | hue 205–265, sat 0.4–1, val 0.45–1 | 13,215 (29.4%) | `17, 33, 147` | 5–62 / 20–63 / 129–168 |
| Emblems, for comparison | 15800, 1975, 15950, 2075 | sat 0–0.25, val 0.85–1 | 1,836 (12.2%) | `241, 244, 254` | 226–249 / 232–251 / 249–255 |

Decisions in `src/models/colour-palette.ts`:

- `glass` `72, 64, 80`, the facade's predominant tone at this scale, where glass, spandrels and the
  offices' glow mix; also the shell.
- `screen` `36, 29, 74`, the emblem screen.
- `band lights` `11, 33, 161`, the columns in the mechanical bands and on the screen, lit blue. The
  emblems share their batch and take the same blue, though the photograph shows them white. Open.
- `lit window` `239, 238, 243`; `dim window` takes it at the dim windows' grey. The photograph shows
  far more lit offices than the drawing's lit panes, so the tower reads darker than in the
  photograph.
- `dark metal` (the mullions) and `neutral` (the recesses and roofing) stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 2.1, on the building's surfaces of that material, and leaves its unmeasured ones
grey. In the skyline view at 1600 × 900, the rendered facade's median is 1.78 of the photograph's in
linear light: the vision glass's greys are lighter than the spandrels', whose grey the measured
colour sits at.

## 2026-10-09 — Daytime colours from Chicago.jpg (FID-COL-003)

At the owner's request the colour trial shows a sunny day, so these colours replace the night
colours above in `src/models/colour-palette.ts`.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-09). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. In August 2008 the tower's vertical expansion was under
construction (completed 2010): the panorama shows the original curtain wall, which the expansion
continues, below the new floors' steel. The crown's screen and the bands are not in it, so they come
from a close-up: [Blue Cross Blue Shield Tower, Chicago, Illinois, US (PPL1-Corrected)
julesvernex2.jpg](https://commons.wikimedia.org/wiki/File:Blue_Cross_Blue_Shield_Tower,_Chicago,_Illinois,_US_(PPL1-Corrected)_julesvernex2.jpg)
by Jules Verne Times Two, photographed 2022-07-28 at 15:48 (CC BY-SA 4.0; accessed 2026-10-09),
measured in its 1920 × 1214 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Blue_Cross_Blue_Shield_Tower%2C_Chicago%2C_Illinois%2C_US_%28PPL1-Corrected%29_julesvernex2.jpg/1920px-Blue_Cross_Blue_Shield_Tower%2C_Chicago%2C_Illinois%2C_US_%28PPL1-Corrected%29_julesvernex2.jpg`
(SHA-256 `0bbb057c7adae72dc5456c546b5109df56cec0f91bf81911f0f2bcb39f117edf`; `blue-cross-2022.jpg`
in the sampler), looking up at the tower from the street, after the 2013 panorama. The sun is high
in the south: the south faces, which the lakefront sees nearly square, are lit, and the east faces
are in shade (observed).

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), in the panorama
unless the box names the close-up, a rule on hue (degrees), saturation and value (0–1) choosing one
material's pixels in it, or all of them, and the per-channel sRGB median of those pixels (0–255),
with their count, their share of the box and the quartiles of red, green and blue.
`bun scripts/sample-colours.ts day building-blue-cross-blue-shield` downloads each photograph once,
checks its SHA-256, and reproduces these rows and the palette's entries, decoding in Chrome without
colour management. The building is about 80 pixels wide in the rendition, so single pixels mix
neighbouring materials, which the quartiles show; the medians are the values used. Samples take the
sunlit face where the photograph shows one.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Glass and spandrels | 1910, 375, 1980, 465 | all | 6,300 (100.0%) | `125, 137, 146` | 89–154 / 103–167 / 113–174 |
| Glass, looking up, for comparison | 700, 900, 1300, 1150 in blue-cross-2022.jpg | hue 190–250, val 0.15–0.75 | 140,149 (93.4%) | `22, 47, 73` | 1–44 / 24–72 / 54–96 |
| Screen | 720, 250, 1220, 300 in blue-cross-2022.jpg | val 0–0.5 | 13,759 (55.0%) | `51, 74, 96` | 35–71 / 58–92 / 80–115 |
| Band columns | 640, 630, 1290, 710 in blue-cross-2022.jpg | sat 0–0.2, val 0.6–1 | 2,846 (5.5%) | `176, 189, 205` | 154–220 / 164–228 / 178–240 |

Decisions in `src/models/colour-palette.ts`:

- `glass` `125, 137, 146`, the curtain wall's glass and spandrels together, as at night;
  `lit window` and `dim window` take it exactly, since no office lights show by day.
- The close-up's glass, looking up into a deep blue sky, measures far darker and bluer,
  `22, 47, 73`: glass shows what it reflects. The panorama wins, seen across the lake in the same
  light as the other five buildings. Conflicting.
- `screen` `51, 74, 96`, the crown's screen, and `band lights` `176, 189, 205`, the bands' white
  columns and the emblems, both from the close-up, whose light and white balance differ from the
  panorama's, so they compare less closely with the rest.
- `dark metal` and `neutral` stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material, and leaves its null ones grey.
In the skyline view at 1600 × 900 under the day lights, the curtain wall renders `124, 134, 142`,
0.96 of the photograph's brightness in linear light.
