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
  The drawing was traced from it, and `scripts/fidelity/fit-geographic-camera.ts` recovers its
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

Method: `scripts/fidelity/measure-group.ts` aligned the building's drawn group with the photograph
(`skyline.svg` places the image at x −15558.758, y −1754.2251, 26553.332 × 7086.6665 in the
drawing's layer space). Each sample is a box in photograph pixels (x0, y0, x1, y1, half-open), a
rule on hue (degrees), saturation and value (0–1) choosing one material's pixels in it, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue.
`bun scripts/fidelity/sample-colours.ts night building-blue-cross-blue-shield` reproduces these rows and
prints the palette entries they gave, decoding the photograph in Chrome without colour management.
Single pixels at this scale mix neighbouring materials, which the quartiles show; the medians are
the values used.

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
`bun scripts/fidelity/sample-colours.ts day building-blue-cross-blue-shield` downloads each photograph once,
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
0.96 of the photograph's brightness in linear light. This is the original comparison,
before the sky-reflection layer and FID-BCBS-003 material split, not a current calibration.

## 2026-10-11 — South facade and materials (FID-BCBS-002/003)

Assessed **Blue Cross only**, in default grayscale and sunny-day colour. This pass
corrects the south face's continuous dark mechanical strips and missing horizontal
framing, and removes the vision-glass reflection treatment from opaque spandrels.
The earlier description of an entirely dark recess between columns is superseded
on the south face. The footprint, heights, office floors and middle-band end-bay
openings retain the 2013 reconstruction. North/east geometry remains provisional.

### Evidence and measurements

All sources below were accessed on **2026-10-11**. Photographs remain outside Git
and are never runtime dependencies.

| Source / locator | Date, status and supported claim | Decision / uncertainty |
| --- | --- | --- |
| Alanscottwalker, [Blue Cross Blue Shield Tower in Grant Park](https://commons.wikimedia.org/wiki/File:Blue_Cross_Blue_Shield_Tower_in_Grant_Park.JPG), [original 1265 × 2102 JPEG](https://upload.wikimedia.org/wikipedia/commons/3/3c/Blue_Cross_Blue_Shield_Tower_in_Grant_Park.JPG), whole south elevation; crown crop `(290,130)` to `(940,310)`, middle band `(290,915)` to `(940,1055)` in original pixels | Photographed 2010-09-30, CC BY-SA 3.0. **Observed:** eight narrow slots with pale columns at each band and crown, glazed fields between the band slots, pale horizontal rails, two/three/two glazed rows in lower/middle/upper bands, and nine shallow crown courses. | This post-expansion, pre-panorama view anchors the 2013 form. The open end bays remain open; only the central south band fields get infill. |
| Goettsch Partners, [300 East Randolph](https://www.gpchicago.com/architecture/300-east-randolph/), gallery image 1, [9027-46.9171.max-1600x1200.jpg](https://gop-prod.s3.amazonaws.com/media/images/9027-46.9171.max-1600x1200.jpg), 868 × 1200 | Page publication and photograph dates unknown. **Observed:** south infill and horizontal framing agree with the dated 2010 photograph. **Documented:** 1997/2010 phases and a north atrium with five 40 × 30 ft structural bays. | Cross-check only for form; do not infer north geometry by repeating the south face's eight slots. No new colour sampling from this differently lit image. |
| Jules Verne Times Two, [2022 close-up](https://commons.wikimedia.org/wiki/File:Blue_Cross_Blue_Shield_Tower,_Chicago,_Illinois,_US_(PPL1-Corrected)_julesvernex2.jpg), exact 1920 × 1214 rendition and SHA-256 recorded in FID-COL-003 above; crown at `(700,245)`–`(1215,300)`, middle band at `(550,630)`–`(1300,715)` | Photographed 2022-07-28. **Observed in the downloaded image:** narrow slots, projecting pale panels/rails and recessed columns agree with 2010. The Commons metadata page failed to open in this pass; provenance/date remain the previously recorded attribution, not a fresh page verification. | Later photograph corroborates existing form; no post-2013 renovation is imported. Perspective makes absolute relief uncertain. |
| OpenStreetMap API: [outline 95486960](https://api.openstreetmap.org/api/0.6/way/95486960.json), [part 284779637](https://api.openstreetmap.org/api/0.6/way/284779637.json), [part 284779635](https://api.openstreetmap.org/api/0.6/way/284779635.json) | Retrieved versions **16, 4, 5**, matching the registry. **Documented tags:** central part 54 levels / 227 m / glass; wider part 212 m / concrete; both flat concrete roofs and colour RGB **125, 145, 153**. Outline has no independent height. | Every mapped part was checked. The wider part's coarse concrete label conflicts with visibly glazed end-bay walls; photographs win for facade surfaces. No footprint, material hue or height is copied from the coarse tags. |

Inspected binary hashes (SHA-256):

- 2010 original: `98d4ea7ebfba7b50d805da26f7a3821e0ca45b031acb723f6acf04154069d179`.
- Architect gallery image: `bd392c328b4527a470f4343920115108bd9d30e2c52b925aea78e9d6bc722720`.
- 2022 rendition: `0bbb057c7adae72dc5456c546b5109df56cec0f91bf81911f0f2bcb39f117edf`.

Method: visually count slots between the two south block edges in the 2010 image,
then count horizontal fields away from the emblems. The crown occupies approximately
x **323–920**, y **163–270**. Eight slot centres are approximately x **368, 441,
514, 587, 660, 732, 805, 878** (±3 px). Compare their 14–17 px widths with the
597 px facade width and its mapped 75.7 m width: roughly **1.8–2.2 m**. The model
uses **1.9 m**, with ±0.4 m photographic uncertainty, retaining the existing eight
column positions. Slot centres are not surveyed; uniform spacing differs by up to
about a metre at the outer half bays. The nine crown fields have about 12 px vertical
pitch; eight internal rails separate them. Perspective and image sharpening limit
thin-rail measurements to about 1–2 px, so **0.12–0.18 m** framing is an inferred
illustration thickness, not a fabrication specification.

The band infill stands 0.52 m off the existing shell plane, in front of the
columns' 0.4 m face; backing remains at 0.07 m. This **inferred relief ordering**
matches the 2022 oblique view; the absolute depths are unmeasured. Closed panels
follow the mapped chain across its tracing joints. Office rails sit at 0.22 m,
ahead of the 0.16 m mullions. Emblems move forward with the new screen so they remain
visible. All new solids are closed; the existing shell and window-light vertices
remain in place.

### Colour decisions and limits

Re-ran `bun scripts/fidelity/sample-colours.ts day building-blue-cross-blue-shield`; its
hash-checked sources reproduce the FID-COL-003 rows above exactly: 6,300 panorama
pixels give **125, 137, 146** for mixed glass/spandrels, 13,759 close-up screen
pixels give **51, 74, 96**, and 2,846 column pixels give **176, 189, 205**. The
boxes, HSV rules, sunlit south orientation, sample shares and quartiles are unchanged.
The conflicting upward-looking glass sample remains a comparison, not the palette.

`colour-materials.ts` now classifies the opaque floor strips independently of vision
glass, including the shell's exposed strip tone. `opaque spandrel` aliases `glass`,
borrowing the mixed panorama hue and the glass swatch's brightness reference. This keeps
the opaque strips darker than panes according to their original greys; it is **not** a
separately measured spandrel colour. The classification suppresses the illustrative sky-reflection
shader on these opaque areas. Glass in the mechanical infill retains reflections;
crown screen, slot backing and metal do not.

The new pale framing uses `aluminium`, an **inferred material family**, borrowing
`band lights` through an explicit palette alias. The 2022 column sample has no neutral
calibration to the sunny panorama. It is an existing provisional colour transferred
to visually similar framing, not proof of the metal alloy or its daylight reflectance.
Unknown roofing, recess and dark mullion colours keep their explicit grey fallbacks.
Shared lighting and exposure are unchanged. Splitting the material pool changes the most
common glass grey used as its brightness reference, so the historical 0.96 rendered ratio
above no longer describes the result. No new absolute render-to-photo ratio is claimed;
the accepted result preserves darker opaque ribbons, unlike an independently normalized
spandrel swatch, which flattened their contrast in the initial review. FID-BCBS-004 stays open for independently
resolved glass/spandrel samples and calibrated framing colour.

### Paired visual acceptance and regressions

Captured with `bun scripts/fidelity/render-colours.ts --out /tmp/blue-cross-fidelity/before
building-blue-cross-blue-shield` and the final `after-review` directory. Each run
used **1600 × 1000**, reduced motion, identical `front` / `side` detail presets
and `skyline` / `quarter` skyline presets. The successful runs' `captures.json`
records the originals in those temporary directories; the durable comparisons below
contain the original captures side by side, grayscale left and sunny colour right.

| View / URL | Before | After | Visual acceptance |
| --- | --- | --- | --- |
| `building-detail.html?building=building-blue-cross-blue-shield`, `front` | [Both modes](fidelity/blue-cross-front-before.png) | [Both modes](fidelity/blue-cross-front-after.png) | South bands read as framed panels with narrow slots; crown courses and emblems remain legible. Grayscale shows the new relief/framing; colour shows pale metal, blue-grey glass and a darker crown. |
| Same URL, `side` | [Both modes](fidelity/blue-cross-side-before.png) | [Both modes](fidelity/blue-cross-side-after.png) | Opposite-face geometry and open end-bay gap retained. Colour no longer gives opaque strips the glass reflection; north/east continuous dark bands remain a known gap. |
| `skyline-3d.html?controls=open`, `skyline` | [Both modes](fidelity/blue-cross-skyline-before.png) | [Both modes](fidelity/blue-cross-skyline-after.png) | New south band treatment is visible beside Aon; geographic silhouette and neighbour occlusion are retained. |
| Same URL, `quarter` | [Both modes](fidelity/blue-cross-quarter-before.png) | [Both modes](fidelity/blue-cross-quarter-after.png) | Elevated context retains massing, placement and roof heights in both modes. |

Colour was enabled with each page's toggle (equivalent to adding `&colour=1` to
the URLs above). All four pairs in **both** runs changed their canvas on colour-on
and restored grayscale **byte for byte** on colour-off. Both runs also loaded the
390 × 844 embedded `index.html?colour=1` view with controls visible and reported no
browser errors. This is visual acceptance of the bounded corrections, not a claim
that all elevations or material colours are resolved.

Regression acceptance: south-face raycasts find eight separated slots and eight
columns at each band and crown, 1.9 m slot widths within sampling tolerance, panels
ahead of the backing, eight internal crown rails, visible emblems, unchanged grade
outline and open middle end bays. Independent height probes distinguish opaque
floor strips from glass in the reflection mask and verify that the strips remain darker
than panes in daylight; new metal and crown surfaces do not reflect. The slot scan uses
0.1 m steps and requires width error below 0.3 m. Colour restoration and celebration-pane ownership remain covered. The
building-kit checks pass for closed geometry, winding and no coplanar overlaps.

Remaining work: FID-BCBS-001 retains the north lobby detail gap; FID-BCBS-005 calls
for era-appropriate north/east elevation evidence, especially the architect's
five-bay atrium, before those faces receive equivalent geometric correction.

## 2026-10-12 — Side and rear bands (FID-BCBS-005)

Assessed **Blue Cross only**, following the reported three dark stripes in the
side view. They were an error in the reconstruction: the same undivided recess
colour was assigned around every elevation. The previous south-only correction
left that error on the end wings and north face. This entry supersedes that
remaining band treatment, not the mapped footprint or height datums.

### Evidence and decisions

Sources accessed **2026-10-12**; downloaded photographs stay outside Git.

| Source and locator | Observation and decision | Limits |
| --- | --- | --- |
| Chicago Architecture Today, [Exterior 8](https://commons.wikimedia.org/wiki/File:Exterior_8_(7883045392).jpg), photographed **2012-07-03 10:31**, CC BY 2.0; [2448 × 3264 original](https://upload.wikimedia.org/wikipedia/commons/2/2b/Exterior_8_%287883045392%29.jpg), west side at left of the south facade | **Observed:** vertical side glazing continues through the lower and upper south-band levels; the substantial side opening occurs at the middle level. Follow the two band lines around the front/side corner and compare the wing above/below them. Replace the two solid dark side belts with two glazed courses and opaque floor strips, retaining the middle opening. | Perspective supports continuity and the opening's location, not surveyed pier widths or absolute relief. Course heights follow the existing measured band bounds; 0.8 m opaque strips and 0.18 m rails are inferred illustration dimensions. |
| Goettsch Partners, [300 East Randolph](https://www.gpchicago.com/architecture/300-east-randolph/), gallery image 12, [1600 × 1068 original](https://gop-prod.s3.amazonaws.com/media/images/9027-45.5521_GP_adjust.max-1600x1200.jpg); photo/publication date unknown | **Observed:** the west wing, immediately left of the south face, has continuous vertical glazing at the outer band heights and a dark middle opening. Cross-checks the dated 2012 image. | No dimensions or colour values are taken from this image. |
| TonyTheTiger, [20220525 Lakeshore East from Cascade](https://commons.wikimedia.org/wiki/File:20220525_Lakeshore_East_from_Cascade.jpg), photographed **2022-05-25 17:31:29**, CC BY-SA 4.0; [1920 × 2560 rendition](https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/20220525_Lakeshore_East_from_Cascade.jpg/1920px-20220525_Lakeshore_East_from_Cascade.jpg). Building at left of Aon; north elevation approximately `(460,480)`–`(615,1590)` in rendition pixels | **Observed:** framed infill between narrow exterior slots on the north facade, especially the crown and middle band; the east wing has vertical glazing. The crown resolves six slots, counted between its two long-face edges, following their converging verticals. Extend framed band/crown infill and office transoms to the north. | Later corroboration of the completed tower, not proof that every detail was unchanged in 2013. The six-slot count is observed at the crown and carried down to the bands by inference. The north's two/three/two band courses, nine crown courses, 1.9 m slots and relief borrow the south reconstruction and remain **inferred**. Oblique perspective, shade and intervening buildings limit lower-band detail. The Commons page was read through a direct HTML download after the browser fetch failed. |
| Goettsch Partners project text, same page | **Documented:** five internal north atrium structural bays. These are not a count of exterior band slots; the photograph independently resolves six exterior crown slots. Keep the interior/lobby opportunity separate from this exterior correction. | The atrium is not reconstructed in this pass. |
| OpenStreetMap API, [outline 95486960](https://api.openstreetmap.org/api/0.6/way/95486960.json), [central part 284779637](https://api.openstreetmap.org/api/0.6/way/284779637.json), [wider part 284779635](https://api.openstreetmap.org/api/0.6/way/284779635.json) | Rechecked **all three**, still versions **16, 4, 5**. No mapped geometry/height changes. | The wider part's coarse concrete tag still loses to the photographed glazed facade, as recorded on 2026-10-11. |

SHA-256 of inspected binaries:

- Exterior 8 original: `b1b669185ccc91899928d8babc1d1280f3f9da1f7876f0cf49ac6bc334bea497`.
- Architect gallery image 12: `d44832f04f3ffdef77784a4075f79f84b0fe78611d9c22dd4b9d7750422675ff`.
- Cascade rendition: `20e0c332fe5d58e4c651d622e72373486f7fba6992dc513eea59dac7dcb00ea5`.

No new hue sampling or lighting calibration is claimed. The new panes use the
existing glass palette/reflection mask, opaque strips remain nonreflective, and
rails use the existing provisional aluminium alias. Renamed `band infill` and
`transoms` batches now describe all the elevations they serve. Neutral recesses
and roofing retain grey fallbacks. FID-BCBS-004 retains the colour-calibration gap.

### Visual acceptance and regression checks

Before/after captures use **1600 × 1000**, reduced motion, identical cameras,
and each comparison places grayscale left and sunny colour right. Front, side,
skyline and quarter were captured with `scripts/fidelity/render-colours.ts`; the two
additional detail cameras use `front` followed by 18 ArrowRight steps (north)
or 9 ArrowLeft steps (west), each step 10 degrees. The focused canvas was blurred
before screenshots to exclude its keyboard focus ring from toggle comparisons.
Temporary originals/manifests: `/tmp/blue-cross-sides/{before,after}`.

| URL / camera | Before | After | Inspection |
| --- | --- | --- | --- |
| `building-detail.html?building=building-blue-cross-blue-shield`, `front` | [Both modes](fidelity/blue-cross-sides-front-before.png) | [Both modes](fidelity/blue-cross-sides-front-after.png) | South treatment remains legible; the east wing no longer has dark lower/upper belts. |
| Same URL, `side` | [Both modes](fidelity/blue-cross-sides-side-before.png) | [Both modes](fidelity/blue-cross-sides-side-after.png) | East wing glazing continues through the outer bands; north bands read as framed panels/slots rather than black stripes. |
| Same URL, north orbit | [Both modes](fidelity/blue-cross-sides-north-before.png) | [Both modes](fidelity/blue-cross-sides-north-after.png) | North infill and crown courses are visible; middle wing openings remain. |
| Same URL, west orbit | [Both modes](fidelity/blue-cross-sides-west-before.png) | [Both modes](fidelity/blue-cross-sides-west-after.png) | West wing receives the same continuity correction; the middle recess is retained. |
| `skyline-3d.html?controls=open`, `skyline` | [Both modes](fidelity/blue-cross-sides-skyline-before.png) | [Both modes](fidelity/blue-cross-sides-skyline-after.png) | Placement and neighbouring occlusion remain consistent in both modes. |
| Same URL, `quarter` | [Both modes](fidelity/blue-cross-sides-quarter-before.png) | [Both modes](fidelity/blue-cross-sides-quarter-after.png) | Elevated context retains roofs and massing. |

All six before/after camera pairs changed on colour-on and restored grayscale
canvas bytes exactly on colour-off. The standard capture also checked the mobile
390 × 844 embedded colour view without browser errors. These views were visually
inspected, beyond successful capture. This accepts the belt correction, not a
complete reconstruction of the side piers or north atrium (FID-BCBS-006).

Raycast regressions independently scan both end wings at the two outer bands:
two glazed courses, no dark recess paint, and no setback at those heights;
the middle level remains set back by more than 5 m. The rear bands/crown must
have six narrow slots with more than 70% infill. Material checks probe actual
side-band heights and opposing normals to distinguish reflective glass from
opaque strips, then verify complete colour restoration. Existing south slots,
emblems, celebration panes and mapped-outline tests remain in place.

Targeted geometry checks pass for closed meshes, winding, covered faces and no
same-facing coplanar overlaps. Corner clearances on the new side rails prevent
intersections at the mapped reentrant corners. The side-band raycast regression,
reflection-mask checks and typecheck pass; shipping additionally requires the
full repository check, including its managed browser server.

Review follow-up: side rails now follow the same outside-glass vertical bounds
as the long-face rails. Closed rails deliberately stop 0.27 m short of side-chain
corners (0.02 m skin margin plus 0.25 m clearance); these small corner gaps avoid
coplanar intersections at reentrant joints. Fully joined/mitred corner framing
remains part of FID-BCBS-006, rather than an asserted construction detail.

The **middle opening's volume is retained**, while its exposed central-block side
wall now has three glazed courses and rails instead of a single dark backing.
The 2012 oblique view shows recessed curtain wall beneath the wing overhang;
three evenly divided courses and their strip widths are **inferred** from the
existing middle-band height/floor reconstruction, not separately measured there.
New raycasts also check that the side rails are visible ahead of glazing and that
no emblem plates appear on the north crown.
