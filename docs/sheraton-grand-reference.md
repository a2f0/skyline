# Sheraton Grand Chicago Riverwalk: reference audit

`src/models/sheraton-grand-geographic.ts` builds the Sheraton Grand Chicago Riverwalk, 301 East
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
  - low parts, three to five levels, under the rest of the outline. *Corrected on 2026-10-05:
    not all the other parts are low. Part 1269924305, 28 levels, is a wing running east from the
    east arm; see [below](#2026-10-05--the-28-level-east-wing-fid-sher-001).*

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
| Tip | 112.8 m, not modelled | The Skyscraper Center |

The Skyscraper Center's tip stands 50 cm over the drum's top, and Emporis's, 332.00 ft, about
as far over its architectural height. Neither says what stands there, and the photographs do
not resolve it, so the model, and its record's tip, stop at the drum's top.

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
- the published tip, 50 cm over the corner drum;
- the 28-level east wing, part 1269924305, and the 29-level part 1269924304 at its east end
  (FID-SHER-001, below);
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
  - the corner's two floors over the arms' roof, a window on each with its sill and head,
    and its own roof at 100.1 m under the drum;
  - the east arm's south face: 35 windows, one to each floor line under the arms' roof,
    with a sill and a head 5 cm either side;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped L at grade.

  Every mesh is closed.

## 2026-10-05 — the 28-level east wing (FID-SHER-001)

[#72](https://github.com/a2f0/skyline/issues/72) found that the September audit's "low parts"
were not all low. Checked again here through the OpenStreetMap API on October 5, 2026:

- [Relation 17432075](https://www.openstreetmap.org/relation/17432075), version 1, "Sheraton Grand
  Chicago", type building: the outline 188171430 and eleven parts, among them 592122464 and
  1269924305–1269924309 above.
- [Way 1269924305](https://www.openstreetmap.org/way/1269924305), version 1 of 2024-04-05: a
  relation part tagged 28 levels, about 50.4 m east to west by 22.9 m north to south. It starts
  about 7.5 m inside the L's east edge and runs some 43 m past it, continuing the east arm,
  from about 4 m south of the L's south edge to 18 m north of it.
- [Way 1269924304](https://www.openstreetmap.org/way/1269924304), version 1 of 2024-04-05: tagged
  29 levels, about 14.7 m square, inside the east end of 1269924305. It is not a member of the
  relation.
- The relation's other parts are tagged 4 to 6 levels: 1269924295, 1269924299, 1269924300,
  1269924302 and 1269924303. These are the low parts the September list meant.

Extents are the bounding boxes of each way's nodes in local metres, about a metre's uncertainty,
and are a map's tags rather than a survey. The model omits both tall parts. #72's rasterisation
through the skyline camera, on an Overpass snapshot of 2026-07-24 at 3.5 m a level, put them from
7,684 to 8,080 layer units, about 217 thousand square units in front of the current scene and 151
of those above the skyline, mostly at the frame's right edge.

Not yet established: whether the 2013 photograph or the reference photographs show a wing of this
height and form, its date, its facade, and its roof. At the arms' 2.67 m floors, 28 levels would
stand about 75 m; that is an inference, not a measurement. Next: confirm the wing in the
photographs and, if it stood in 2013, model it with the arms' precast and window rows to its
photographed height, or record why it stays omitted.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group of eleven buildings: six towers measured on sunlit
faces in the 2008 panorama, as the first three groups were (FID-COL-003 to FID-COL-005), and five
buildings the panorama does not resolve, measured in daytime close-ups calibrated to it. All are
shown at the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. No change to these materials between 2008 and the drawing's 2013 panorama is known to
this audit.

Identification: `bun scripts/panorama-owners.ts building-buckingham-east` places the hotel's south
face at x 2127–2151 and its corner drum's faces at x 2152–2162, its roof at row 412, with the
photographer's eye fitted as for FID-COL-005, 10 m east and 100 m south of the drawing's fitted eye,
at 1.6 px RMS: a ray from that eye through each pixel meets the nearest mapped part, which owns the
pixel, and the face it meets gives the pixel's direction. The photograph shows a white precast block
with a grid of windows at x 2127–2142, its top at about row 408; from x 2143 a taller tower the
layout does not map stands in front of the rest. The box below lies wholly on the south face, as the
script's `--box` option reports and `tests/panorama-owners.test.ts` checks.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-buckingham-east`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Precast, south face, sunlit | 2129, 418, 2141, 466 | sat 0–0.35, val 0.5–1 | 456 (79.2%) | `220, 218, 206` | 189–237 / 185–235 / 175–224 |
| Glass, south face | 2129, 418, 2141, 466 | val 0–0.3 | 76 (13.2%) | `29, 29, 19` | 10–46 / 6–44 / 0–33 |

Decisions in `src/models/colour-palette.ts`:

- `precast` `220, 218, 206`, the sunlit south face's warm white precast.
- `glass` `29, 29, 19`, a small sample (76 pixels); `lit window` and `dim window` take it exactly,
  since no office lights show by day.
- `maroon`, the drums' alternate fins, and `neutral` stay grey: the photograph does not resolve the
  fins, and the unmapped tower hides the drums.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. The skyline view at 1600 × 900 frames the hotel just beyond its right edge, so
the check there has nothing to read; the other views show it in these colours.
