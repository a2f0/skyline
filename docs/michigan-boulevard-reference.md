# Michigan Boulevard Building: reference audit

`src/models/michigan-boulevard-geographic.ts` builds the Michigan Boulevard Building, 30 North
Michigan Avenue, for the geographic layout only. The drawing shows its Michigan front and,
above 20 North Michigan, its south wall, right of Six North Michigan's tower. That is
outside the excerpt the original layout is fitted to, so the original layout has no model
of it. The model is a reconstruction from published data, OpenStreetMap, the drawing and
photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 126982630](https://www.openstreetmap.org/way/126982630), version 8:
  the outline on the south-west corner of Michigan and Washington, tagged 20 levels. It
  was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with 20 North Michigan, way
  126982634, tagged eight levels.
- [Emporis, archived in 2007](https://web.archive.org/web/20070216134331/http://www.emporis.com/en/wm/bu/?id=michiganboulevardbuilding-chicago-il-usa):
  - 82 m (270 ft) and 21 floors;
  - Jarvis Hunt, 1914, fifteen storeys;
  - six floors added by Hunt in 1923.
- [Central Building & Preservation](https://www.centralbldg.com/project/michigan-boulevard-building/):
  a white terracotta-clad building of 1913–1914.
- [Wikipedia's Historic Michigan Boulevard District](https://en.wikipedia.org/wiki/Historic_Michigan_Boulevard_District):
  Jarvis Hunt, 30 North Michigan Avenue.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  8.5 of the drawing's layer units are one metre of height. The photograph shows:
  - the cream Michigan front, five bays to a floor under an ornamented attic;
  - a belt course some eight floors below the top;
  - common brick on the south wall above its neighbour, windowed on its top floors, with
    the terracotta turning one bay onto it.

## Plan

The mapped outline is 30.9 m along Michigan and 49.9 m along Washington. Its south wall
steps 2.8 m north 30.5 m west of Michigan.

Projected through the geographic camera, the Michigan front spans 2,002 to 2,168 layer
units at grade, where the drawing has 2,021 to 2,171. The drawn front is a tenth shorter,
as elsewhere on this stretch.

The south wall projects from 1,694 to 2,002 units, stepping at 1,802, over the drawing's
six-north-east facade. That facade is this wall; see
[its naming](building-labels.md#names-from-the-geographic-camera).

Measured as fractions of the drawn front, its five bays are about 6.2 m wide.

- The south bay holds a single window.
- The other four hold pairs 2 m apart.
- The windows are about 1.45 m wide.

On the south wall, the drawn terracotta returns about 5.6 m, with a pair of windows. The
brick beyond carries pairs about 5.1 m apart.

## Heights

Heights are read on the drawn Michigan front through the geographic camera. They are
measured down from the published 82 m, taken at the drawn parapet. Read on its own, the
drawn parapet stands 4 m higher.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–4.8 m | Estimate: under the drawn floors |
| Floors 2–13 | 3.7 m | Drawing: the window rows below the belt |
| Belt course | 49–50.2 m | Drawing: the wider gap between window rows |
| Floors 14–21 | 3.58 m | Drawing: the eight window rows above the belt |
| Twenty-first floor's windows | 76.2–78.2 m | Drawing |
| Attic | 78.2–82 m | Drawing: its panels at 79.2–80.9 m |
| Parapet | 82 m | Published: 270 ft |
| Pedestals over the piers | 82.6 m | Drawing |
| Raised parapet over the south bay | 83.3 m | Drawing |

The drawing puts eight window rows above the belt and 21 floors in all. So the belt falls
over the thirteenth floor, not over the fifteenth, where the 1923 addition began. The hill
in the drawing hides the lowest floors, so the ground floor's height is an estimate.

## Model

- **Michigan front:** terracotta, with its five bays and shopfront glass under them; the
  belt course; and the attic's darker panel across each bay's windows.
- **South wall:**
  - the terracotta's return bay, windowed from the ninth floor, above 20 North Michigan;
  - common brick beyond, windowed only on the top four floors, as drawn;
  - the neighbour itself is not modelled.
- **Washington front:** terracotta, a pair of windows every 6.1 m.
- **Alley:** brick, at the same spacing.
- **Parapet:** raised over the south bay, with pedestals over the piers and at the
  Washington corner, 5 cm inside the walls.

Colours follow the drawing's greys, not the terracotta's cream.

Omitted:

- the terracotta ornament, the attic's arches and balusters;
- the south wall's single windows at its stair and on its attic;
- the entrances;
- 20 North Michigan, which hides the south wall's lower floors.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof, the raised parapet and a pedestal;
  - the front's nine windows, its piers, a shopfront, the belt, an attic panel and the
    parapet;
  - the south wall's return bay, windowed from the ninth floor and ending, with the belt
    on it, at 5.6 m;
  - the brick beyond, windowed from the eighteenth floor;
  - window colours that no wall shares;
  - Washington's sixteen windows to a floor;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-005)

The colour trial's sunny day gains a third group, the Michigan Avenue wall from the Borg-Warner
Building to the Michigan Boulevard Building, measured in the same photograph as the first two
(FID-COL-003 and FID-COL-004) and shown at the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. No change to these materials between 2008 and 2013 is known to
this audit. Grant Park's trees hide the wall's lower floors; every box stops above them.

Identification: `bun scripts/panorama-owners.ts building-six-north-far-east` fits the rendition to
the mapped buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted
eye, at 1.6 px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where
a sunlit south face meets a shaded front, and four roofs. A ray from that eye through each pixel
meets the nearest mapped part, which owns the pixel, and the face it meets gives the pixel's
direction. This building shows its south wall at x 1438–1465 and its Michigan front at x 1466–1485,
its roof at row 415; each box below lies wholly on the face it names, as the script's `--box` option
reports.

Shade: the Michigan fronts face east, into the photograph's shade, and the scene shades them too.
Where a building shows only that front, its stone or terracotta is estimated as if sunlit, so the
scene's own shade darkens it once: the shaded median times shade-to-sun factors of 3.05, 2.41 and
1.95 for red, green and blue in linear light. They are the mean of the ratios between one
terracotta's sunlit south face and shaded front on the Railway Exchange (3.25, 2.60, 2.09) and on
Peoples Gas (2.86, 2.21, 1.81); the two pairs differ by up to 14%, which bounds the estimate's
uncertainty. `bun scripts/sample-colours.ts day` measures both pairs and prints each estimate. Glass
keeps its measured value: it reflects the sky rather than scattering the sun.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-six-north-far-east`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building's visible faces are 48 pixels
wide in all, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Common brick, south wall, sunlit | 1440, 418, 1466, 460 | sat 0–0.35, val 0.5–1 | 896 (82.1%) | `161, 144, 133` | 149–179 / 133–164 / 121–153 |
| Terracotta, Michigan front, shaded | 1468, 418, 1485, 460 | sat 0–0.35, val 0.45–1 | 350 (49.0%) | `128, 133, 136` | 116–140 / 120–144 / 124–145 |
| Glass, Michigan front | 1468, 418, 1485, 460 | val 0–0.3 | 43 (6.0%) | `59, 63, 66` | 48–64 / 50–69 / 53–71 |

Decisions in `src/models/colour-palette.ts`:

- `common brick` `161, 144, 133`, the sunlit south wall above its neighbour.
- `white terracotta` `212, 198, 184`, the sunlit estimate of the shaded Michigan front's
  `128, 133, 136`, a cream; the parapet takes it.
- `glass` `59, 63, 66`, 6.0% of the box; `lit window` and `dim window` take it exactly, since no
  office lights show by day.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, its front and south wall
together render `150, 136, 128` against the photograph's shaded front, `128, 133, 136`, 1.10 in
linear light.
