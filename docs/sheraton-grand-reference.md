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
| Main crown assembly | 12.2 m | Emporis: 40.06 ft from the main roof to the architectural top |
| Arm crown assemblies (estimated, 2026-10-17) | 7.2 m | Photographic ratio, about ±1.5 m |
| East wing crown assembly (estimated, 2026-10-17) | 6 m | Photographic ratio, about ±1.5 m |
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
- **Crowns:** the original alternating 24-facet cylinders were replaced on
  2026-10-17 by stepped frames and recessed horizontal-louver screens; see FID-SHER-002 below.

Colours follow the drawing's greys: the precast mid grey, the drums light, their fins dark.

Omitted:

- the block in the inner corner between the arms, tagged 33 levels, a floor over the arms'
  roof;
- the exact crown construction and dimensions; the 2026-10-17 pass adds a
  photographic approximation of stepped bases, preserving the main 12.2 m assembly
  and estimating shorter secondary crowns;
- the published tip, 50 cm over the corner drum;
- the east wing's exact roof dimensions and the crowns' detailed sections,
  which remain estimated (FID-SHER-004);
- the low parts under the rest of the complex's outline;
- the drums' openness, the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the corner drum's top at 112.3 m, the arms' crowns at approximately 101.96 m and the arms' roof at
    94.76 m, plus the restored wing roof at 84.08 m and fourth crown at approximately 92.75 m;
  - narrow pale uprights, horizontal louver relief and stepped crown profiles;
  - the corner's two floors over the arms' roof, a window on each with its sill and head,
    and its own roof at 100.1 m under the drum;
  - the east arm's south face: 35 windows, one to each floor line under the arms' roof,
    with a sill and a head 5 cm either side;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped L and restored east wing at grade (both ground parts).

  Every mesh is closed.

## 2026-10-05 — the 28-level east wing (FID-SHER-001)

*Corrected on 2026-10-17:* the [wing restoration below](#2026-10-17--restore-the-east-wing-fid-sher-001)
supersedes this historical omission and the approximately 75 m inference.

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
check facade row/bay counts against dated elevations. The two skins currently
leave an approximately 11 cm core-coloured seam at their straight join and centre
their window bays independently; a continuous bay layout belongs in that pass. These remain open; this
pass corrects the missing wing's mass, not every Sheraton detail.


## 2026-10-17 — stepped crowns and louvered screens (FID-SHER-002)

This second pass assessed only Sheraton Grand. It corrects the crown's visible
structure in the pre-2013 era, retaining the preceding pass's mapped centres,
roof datums and the main architectural height. It shortens the three smaller
crowns using photographic ratios. It does not establish surveyed
crown dimensions or resolve the missing podium.

### Fresh photographic evidence

Both original files and description pages were retrieved and visually inspected
on 2026-10-17. The descriptions and EXIF agree on dates:

- Matt Griffin, [*Chicago IMG 1118.CR2*](https://commons.wikimedia.org/wiki/File:Chicago_IMG_1118.CR2_(1352890571)_(1).jpg),
  photographed 2007-09-09 at 14:14, from Flickr via Wikimedia Commons.
  [Exact original](https://upload.wikimedia.org/wikipedia/commons/b/b2/Chicago_IMG_1118.CR2_%281352890571%29_%281%29.jpg),
  1557 × 2154 pixels; SHA-256
  `22d1c837ab27ec02af83b7f72b1a067ff5a931cf116c62807163234d97a1b52a`.
  The principal crown occupies approximately x = 860–1310, y = 35–345.
  It clearly separates a dark horizontal-louver screen from a stepped pale
  frame below. Broad uprights align with the lower frame; narrower uprights
  divide the upper bays. This directly contradicts the old equal-width pale
  and dark vertical stripes. The photo also resolves three-floor facade bands,
  retained as FID-SHER-003 for a later pass.
- Bert Kaufmann, [*Chicago / Sheraton Grand Chicago*](https://commons.wikimedia.org/wiki/File:(2550951367)_Sheraton_Grand_Chicago.jpg),
  photographed 2008-05-30 at 17:21, Flickr via Wikimedia Commons.
  [Exact original](https://upload.wikimedia.org/wikipedia/commons/3/3c/%282550951367%29_Sheraton_Grand_Chicago.jpg),
  546 × 992 pixels; SHA-256
  `1faf49e9d1297e673c7645476de44dd5b5aab642813355d17234b9c68e1b7d75`.
  The crowns at x ≈ 105–435, y ≈ 140–250 show the same narrow-upright/dark-infill
  pattern on the other faces and the lower eastern end. The rear/side base is
  less exposed than the prominent stepped southwest frame in Griffin's view.
  This corroborates the screen family, not identical base construction on all
  four crowns.

Further leads checked on the same date did not supply crown dimensions:
[Chicago City Council proceedings, 2015-01-21, PDF page 90 / printed page 102170](https://chicityclerk.s3.amazonaws.com/s3fs-public/document_uploads/journals-proceedings/2015/2015_01_21_VII.pdf)
contains SCB's 2012-05-24 west elevation for the neighbouring North Park Drive
development, with only a small Sheraton podium outline at the edge. Its height
labels describe the neighbouring project, not the Sheraton. C. William Brubaker's
[1994 river view, UIC Library, file bru005_14_bF](https://www.flickr.com/photos/uicdigital/5937353172)
shows the hotel from 330 North Wabash, but the available 1024 × 698 rendition
([exact image](https://live.staticflickr.com/6125/5937353172_4c8612e5a3_b.jpg))
does not resolve crown sections. Neither input was used to set a dimension.

### Measurements, interpretation and model decisions

Coordinates are visual readings of the original pixels, not a rectified survey.
In Griffin's near-central bay, x ≈ 1050–1115, the screen top is y ≈ 40,
its lower edge y ≈ 165 and the top guestroom glazing y ≈ 330 (±5–10 px).
The upper screen is therefore about 43% of the visible assembly, with at least
±7 percentage points allowed for perspective and ambiguous trim boundaries.
The main corner uses 5.4 m of its existing 12.2 m assembly (44%) for the
screen and 6.8 m for the base. The split is **inferred**, about ±0.9 m, and must not be
read as a new source for the building's absolute height.

The same image shows the northern arm's smaller crown at approximately
x = 150–440, y = 245–390. Compare the assembly's height to its screen diameter
to reduce the effect of different distances: the main screen is about 378 px
wide with an assembly about 290 px high; the north screen is about 273 px wide
with an assembly about 135 px high (±10–15 px at the trim boundaries).
Using the mapped radius ratio 7.39/7.97 gives
`12.2 × (135/290) × (378/273) × (7.39/7.97) ≈ 7.3 m`.
Similar radial setbacks and vertical foreshortening are assumptions, so use
**7.2 ± 1.5 m**, with about 4.5 m of upper screen. The east arm takes the same
family by inference; the dusk fountain photograph corroborates a small crown,
but does not independently fix its dimensions.

The nearest eastern end in JeremyA's fountain original (identified above,
x ≈ 295–415, y ≈ 105–160) also has a short screen and low base. Its roughly
120 px screen width and 45–55 px assembly height, against the 14.8 m mapped
round-end diameter, suggest roughly 5.5–6.8 m before allowance for setbacks
and perspective. Kaufmann's rightmost crown (x ≈ 350–430, y ≈ 220–255)
corroborates a low base under a dark screen. The wing now uses **6 ± 1.5 m**,
of which 4 m is screen. These estimates supersede the first wing pass's
provisional copy of the principal 12.2 m assembly. Arm crown tops become
101.96 m and the wing crown 92.75 m; their decimals are arithmetic, not survey
precision. The published principal top remains 112.3 m.

About twenty horizontal slat edges are visible in that central screen bay
(±2; dark edges and small top/bottom trims can merge). Approximately twelve
uprights span the visible semicircle; a full set of 24, alternating broad and
narrow, is **inferred**. At this scale the pale strips occupy roughly one sixth
to one fifth of the screen, substantially less than the old 50%. The chosen
0.42/0.14 m post widths are proportional approximations, not measured sections.

The implementation gives each crown twenty projecting horizontal slats,
24 narrow uprights and a two-step lower frame. Setbacks (0.25–0.7 m), slat
projection (0.12 m), lower-frame band count and widths are **schematic** relief:
the photos establish direction and hierarchy but do not justify centimetre
precision. The shorter secondary bases use only sparse lower framing. Applying the
principal crown's stepped-frame family to all four is still an explicit approximation; FID-SHER-004 retains that distinction for better
side elevations and drawings. Closed recessed cores approximate the dark
screen interiors; genuine see-through louver construction remains unresolved.

The `drums` batch retains its existing material classification: cream precast
for pale framing, and the explicit neutral-grey fallback for uncalibrated
maroon screens. This pass changes material area and relief, not sampled RGB
values, shared lighting or reflective-glass classification. It avoids treating
the shaded orange/brown pixels in Griffin's photograph as a sunny-day palette.

### Acceptance and retained comparisons

Raycasts now independently require 24 narrow pale interruptions around a screen,
10–25% pale coverage, twenty distinct projecting horizontal slats and lower
frames wider than the upper screen. The principal crown height, mapped footprints, wing roof steps and glass/opaque
checks remain; the three secondary top-height checks now use these independent
photographic estimates. Watertightness,
winding and same-facing coplanar checks passed after separating internal caps
from overlapping faces; the strict type check and Sheraton raycast test passed.

The same capture setup as FID-SHER-001 uses a 1600 × 1000 viewport, reduced
motion, fixed detail fit (240 × 250 m) and matching camera metadata, retained in
[fidelity/sheraton-crown-captures.json](fidelity/sheraton-crown-captures.json).
Close URLs are `building-detail.html?building=building-buckingham-east` and
its colour mode, with `front`/`side` presets; placement uses
`skyline-3d.html?controls=open` in `quarter` and `skyline` presets, in both modes.

| View | Grayscale before / after | Sunny-day before / after |
| --- | --- | --- |
| Front | [before](fidelity/sheraton-crown-front-grey-before.png) / [after](fidelity/sheraton-crown-front-grey-after.png) | [before](fidelity/sheraton-crown-front-day-before.png) / [after](fidelity/sheraton-crown-front-day-after.png) |
| Side | [before](fidelity/sheraton-crown-side-grey-before.png) / [after](fidelity/sheraton-crown-side-grey-after.png) | [before](fidelity/sheraton-crown-side-day-before.png) / [after](fidelity/sheraton-crown-side-day-after.png) |
| Quarter | [before](fidelity/sheraton-crown-quarter-grey-before.png) / [after](fidelity/sheraton-crown-quarter-grey-after.png) | [before](fidelity/sheraton-crown-quarter-day-before.png) / [after](fidelity/sheraton-crown-quarter-day-after.png) |

The default skyline crops the hotel beyond its right edge and was byte-identical
before/after in both modes; the preceding pass's
[gray](fidelity/sheraton-wing-skyline-grey-after.png) and
[day](fidelity/sheraton-wing-skyline-day-after.png) images also match this pass.
The front and side comparisons visibly replace broad stripes with dark,
horizontally divided screens and stepped lower framing. The elevated view
preserves placement and shows the three shorter secondary crowns; fine slats are only
legible in the close views. All four views restored their initial grey PNG
byte for byte after colour toggling in the completed capture run. An earlier
front capture failed that exact-restoration comparison; an unchanged rerun
passed without relaxing the assertion. Full shipping validation and independent
review are recorded in the pull request.

Remaining work: FID-SHER-003 covers guestroom/podium bands and bay counts;
FID-SHER-004 covers exact crown sections, distinct base geometry on the other
three crowns, true screen openings, wing crown height and calibrated maroon.
