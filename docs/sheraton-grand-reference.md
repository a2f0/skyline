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
| East wing roof (estimated, 2026-10-17) | 84.08 m | 28 mapped levels relative to the corner |
| East wing round end (estimated, 2026-10-17) | 86.75 m | 29 mapped levels relative to the corner |
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

The original three drums stand on the round ends, circles fitted to the mapped
parts' arcs within 11 cm. Corrected on 2026-10-17: the restored east wing adds a
fourth round end, fitted within 1.7 cm:

| Drum | Centre, east and north of Crain | Radius |
| --- | --- | ---: |
| Corner | 407.44, 465.95 m | 7.97 m |
| East arm | 439.52, 462.06 m | 7.37 m |
| North arm | 409.75, 498.32 m | 7.39 m |
| East wing (restored 2026-10-17) | 482.703, 457.389 m | 7.391 m |

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
- the east wing was omitted until the 2026-10-17 correction below; its exact roof
  dimensions and crown detailing remain estimated (FID-SHER-002);
- the low parts under the rest of the complex's outline;
- the drums' openness, the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the corner drum's top at 112.3 m, the arms' drums' at 106.96 m and the arms' roof at
    94.76 m, plus the restored wing roof at 84.08 m and fourth crown at 98.95 m;
  - a drum's facets, cream and fin in turn;
  - the corner's two floors over the arms' roof, a window on each with its sill and head,
    and its own roof at 100.1 m under the drum;
  - the east arm's south face: 35 windows, one to each floor line under the arms' roof,
    with a sill and a head 5 cm either side;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped L and restored east wing at grade (four record parts).

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


## 2026-10-17 — restore the east wing (FID-SHER-001)

Assessed Sheraton Grand only. The missing lower eastern slab and its fourth round
crown are a substantial gap in the existing building, rather than a new building.

### Evidence and decisions

All sources accessed 2026-10-17. Third-party photographs remain outside Git and
are not runtime assets.

- **Observed, pre-2013:** JeremyA, [Centennial Fountain2 070813.jpg](https://commons.wikimedia.org/wiki/File:Centennial_Fountain2_070813.jpg),
  original 1600 × 1068 image, [exact file](https://upload.wikimedia.org/wikipedia/commons/a/af/Centennial_Fountain2_070813.jpg),
  SHA-256 `7fc01807677fe5beb46c8a300f4482cb9856d0f363f80bc3759053ca07d638f2`.
  The description says 2006-08-13; EXIF says 2007-08-13 20:05 and the filename
  agrees with EXIF. Use 2007 provisionally; either date predates the 2013 panorama.
  The hotel occupies the left of the photograph, roughly x 65–430, y 100–780.
  The view from the southeast shows the eastern round end, its adjoining punched-window
  slab and the taller sections behind it. This establishes the wing and facade family,
  not an exact floor count or roof elevation. Perspective and fountain spray prevent
  reliable absolute measurement. The crown has horizontal louver detail that the model
  still simplifies.
- **Observed corroboration:** Serge Melki, [Sheraton Grand Chicago (at night)](https://commons.wikimedia.org/wiki/File:Sheraton_Grand_Chicago_(at_night).jpg),
  photographed 2008-07-27, original 553 × 743 crop,
  SHA-256 `d758c29a37ee8cdc8890f197464f66612ff30d11344651e355ee4e78dc67a4d0`.
  The lower slab appears at the right of the main corner, approximately x 430–475,
  y 280–580, in the same precast/window pattern. This independently establishes
  the stepped mass before 2013; its oblique angle is unsuitable for counting bays.
- **Observed corroboration:** jeffcoffee, [Chicago from AON Center](https://commons.wikimedia.org/wiki/File:Chicago_from_AON_Center_(14559522491).jpg),
  photographed 2014-07-02, original 5472 × 3648,
  SHA-256 `5fd065ca6be6ff98f48736a9e4d7ef594ed06d9e8a89e1176e6cf9e4abcc4a75`.
  Lower-right hotel crowns confirm the sequence of round ends and stepped roof;
  the foreground tower hides much of the lower facade. The earlier photographs
  establish the era; this later image supplies an elevated cross-check only.
- **Mapped:** [relation 17432075/full.json](https://api.openstreetmap.org/api/0.6/relation/17432075/full.json)
  and [way 1269924304/full.json](https://api.openstreetmap.org/api/0.6/way/1269924304/full.json).
  Rechecked all eleven relation parts, including the 4–6-level podium parts and
  the 33-level inner block, plus the separate 29-level round end. Ways 1269924305
  and 1269924304 remain version 1, tagged 28 and 29 levels. Their exact node
  coordinates enter the existing building's `parts`. The primary tower source
  stays way 592122464; explicit ground ways 592122464 and 1269924305 supply the
  combined 95.0 × 59.9 m bounds for detail centering, facts and ground outlines.
  Shared edges are internal and omitted from the ground outline. Ownership and
  geographic coordinates remain unchanged. The wing shares the old
  eastern arc, extending about 43 m beyond it. Coordinate precision is not survey
  accuracy; allow approximately a metre for tracing uncertainty.

**Inferred heights:** preserve the existing datum: the 34-level corner roof is
100.1 m. Applying the same 2.67 m floor pitch to the mapped level differences gives
84.08 m for the 28-level wing and 86.75 m for its 29-level end. These values carry
`estimatedHeight: true`. The earlier suggestion of approximately 75 m multiplied
28 by the pitch from zero and mixed datums; it is superseded. The photographs
support the lower step, but do not independently establish those decimal heights;
allow at least one floor of uncertainty until a dimensioned elevation is found.
The new crown provisionally shares the existing 12.2 m crown assembly height,
reaching 98.95 m. FID-SHER-002 retains this uncertainty.

A least-squares circle through the round end's 19 unique mapped nodes, projected
with `projectGround`, gives centre (482.703, 457.389) m east/north of Crain and
radius 7.391 m, maximum radial residual 0.017 m. This is a fit to the map, not a
measurement of the real crown. The wing reuses the existing precast/window
material assignments and measured sunny palette by observed facade continuity;
no new hue is sampled from the dusk photographs. Maroon fins retain their explicit
gray fallback. The existing crown geometry and bay dimensions remain approximate.

### Acceptance and retained comparisons

Raycasts verify the lower eastern roof, the fourth crown and punched windows
among opaque precast on the added south face. The new meshes remain children of
the existing building for picking. Both mapped cores remain closed. Facade skins
are omitted on the shared internal arc below the wing roof, with closed end caps;
this removes the coplanar overlaps found during the first geometry check. The
upper tower skin retains its original floor seed after the height split, so the
restored wing does not reshuffle the existing upper floors' window tones.

Captures use a 1600 × 1000 viewport and reduced motion. Detail URLs are
`building-detail.html?building=building-buckingham-east`, with colour toggled on
and off; skyline URLs are `skyline-3d.html?controls=open`. Each pair keeps the
same preset and camera position. For detail comparisons only, the capture route
fixes `fit` to `{height: 240, width: 250}` in the served detail module, keeping
framing identical when the wing changes the normal automatic fit. Both phases
use the combined ground centre (444.581164 east, 477.572184 north metres),
including the old model before it had the wing. Canvas-only
images exclude the changing descriptive text. The production detail still fits
its whole model automatically. The [capture manifest](fidelity/sheraton-wing-captures.json)
records each view, building ID and artifact name.

| View | Grayscale before / after | Daylight before / after |
| --- | --- | --- |
| Front | [before](fidelity/sheraton-wing-front-grey-before.png) / [after](fidelity/sheraton-wing-front-grey-after.png) | [before](fidelity/sheraton-wing-front-day-before.png) / [after](fidelity/sheraton-wing-front-day-after.png) |
| Side | [before](fidelity/sheraton-wing-side-grey-before.png) / [after](fidelity/sheraton-wing-side-grey-after.png) | [before](fidelity/sheraton-wing-side-day-before.png) / [after](fidelity/sheraton-wing-side-day-after.png) |
| Skyline (unchanged; hotel out of frame) | [gray](fidelity/sheraton-wing-skyline-grey-after.png) | [day](fidelity/sheraton-wing-skyline-day-after.png) |
| Elevated | [before](fidelity/sheraton-wing-quarter-grey-before.png) / [after](fidelity/sheraton-wing-quarter-grey-after.png) | [before](fidelity/sheraton-wing-quarter-day-before.png) / [after](fidelity/sheraton-wing-quarter-day-after.png) |

Visual review: the close views now show the lower extension and fourth crown in
both modes, with the same material identities as the original tower. The side
view exposes the L and the join. The elevated view keeps the extension on its
mapped site. The hotel lies beyond the default skyline's far-right edge, so that
view cannot show the correction at the tested 1600 × 1000 viewport. The earlier
7,684–8,080 projection uses **layer** units, not the SVG's viewBox x coordinates:
`skyline-position` translates x by 1105.5923, so the full-screen frame's right
edge is 7395.5063 layer units (8501.0986 − 1105.5923). The geographic study's
wider frame reaches 7978.5 and can show part of the wing; sufficiently wide
full-screen canvases can also expose geometry beyond the nominal frame. This
pass preserves the original SVG paths and drawing-fit models, which have no
Sheraton counterpart. It corrects geographic geometry from the dated photographs;
it does not claim a new exact trace of the 2013 panorama's wing silhouette. Colour toggling changed every canvas and restored the
gray image byte for byte in all four views; camera metadata matched before/after.
Targeted watertightness, coplanar-overlap, raycast, material, grayscale and strict
type checks passed. Full shipping validation and independent review are recorded
in the pull request for this pass.

Next: FID-SHER-002 should replace the tall striped crown cylinders with the
photographed stepped bases and louvered screens, and resolve their dimensions.
FID-SHER-003 should separate the low podium from the repeated guestroom grid and
check facade row/bay counts against dated elevations. These remain open; this
pass corrects the missing wing's mass, not every Sheraton detail.
