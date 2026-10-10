# University Club of Chicago: reference audit

`src/models/university-club-geographic.ts` builds the University Club of Chicago, 76 East
Monroe Street, for the geographic layout only. The drawing shows it left of Willoughby
Tower, behind the Monroe Building, outside the excerpt the original layout is fitted to,
so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, archived listings, the drawing and photographs, not a survey or
construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 126982632](https://www.openstreetmap.org/way/126982632), version 10:
  the outline on the north-west corner of Michigan and Monroe, tagged 15 levels and
  67.7 m. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its north wall's nodes with 30 South Michigan, way
  126982639, tagged six levels.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218072321/http://www.emporis.com/en/wm/bu/?id=universityclub-chicago-il-usa):
  - 14 floors, 1909, by Holabird & Roche;
  - "A limestone owl crowns the peak of the front gable";
  - the Michigan Room on the second floor, with a 21-foot coffered ceiling.
- [Wikipedia's Historic Michigan Boulevard District](https://en.wikipedia.org/wiki/Historic_Michigan_Boulevard_District):
  the University Club, 76 East Monroe, by Holabird & Roche.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the club, about 9.2 of
  the drawing's layer units are one metre of height. The photograph shows:
  - the Gothic front's tall arched windows under a band and a crenellated parapet;
  - lit windows behind the parapet;
  - the steep roof and its gable on Michigan, with pinnacles;
  - the Monroe Building's gable in front of the club's west end.

## Plan

The mapped outline is 20.75 m along Michigan and 52.3 m along Monroe.

Projected through the geographic camera, the south-east corner lands at 744 layer units.
The drawing's corner, where its two arcaded faces meet, is at 788. The drawing sits right
of the projection here by about 44 units, more than further north. The drawn faces are
read as fractions of their mapped lengths, measured from the drawn corner:

- The Michigan front's four tall windows are about 3.6 m wide, centred 3, 7.5, 12 and
  16.8 m north of Monroe. The Monroe front's first four repeat them, centred 3.3, 7.7, 12.1
  and 16.6 m west of Michigan. The model centres four bays 4.55 m apart from 3.1 m on each
  front and continues them along Monroe. The Monroe Building hides the rest of that front.
- The gable facing Michigan spans 17.5 m of the front and stands back from it. Its drawn
  foot and ends put it 3.3 m behind the Michigan front and 1.3 m inside the Monroe front
  and north wall. The model takes that as the upper floor under the roof.
- The ridge runs west from the gable's peak, along the length of the club; the Monroe
  Building's gable hides its far end.
- A small gable with its own cross stands on the Monroe side, 13.7 to 18.7 m west of
  Michigan.

## Heights

Heights are read on the drawn Michigan front through the geographic camera. They are
measured down from OpenStreetMap's 67.7 m, taken at the drawn gable's peak, which reads
0.6 m higher on its own.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–5 m | Estimate: the hill hides the lower floors |
| Floors 2–9 | 3.525 m | Estimate: between the ground floor and the drawn floors |
| Wide windows | 33.65–36.7 m | Drawing: under the hall's |
| Hall's arched windows | 37.3–43.9 m | Drawing: heads from 43.1 m |
| Band | 46.2–48.95 m | Drawing |
| Parapet | 48.95–51 m | Drawing: to the crenels |
| Merlons | 51.75 m | Drawing |
| Upper floor's windows | 52–55.9 m | Drawing |
| Eaves | 56.4 m | Drawing |
| Pinnacles | 62.5 m | Drawing |
| Small gable | 59.3 m | Drawing: its eaves at the upper floor's |
| Small gable's cross | 60.4 m | Drawing |
| Gable's peak and ridge | 67.7 m | OpenStreetMap |
| Cross | 69.75 m | Drawing |

The drawing shows the club from 30 m up. Below that the floors are estimates, eight between
a 5 m ground floor and the wide windows. With the hall's two storeys and the upper floor,
that makes thirteen floors against the fourteen published.

## Model

- **Main block:** the whole lot to the parapet.
  - The street fronts carry four bays to a front, and more along Monroe: paired windows on
    each floor, the wide windows, and the hall's tall arched windows, their heads stepped
    to the middle half for the arch; then the band and the parapet.
  - Merlons 1.2 m wide every 2.1 m line the street fronts' parapet.
  - The west wall carries windows every 4.55 m. The north wall, shared with 30 South
    Michigan, stays blank below its eighth floor.
- **Upper floor:** set back behind the parapet, with windows 3.6 m wide about 5.5 m apart.
  Its gable roof rises from 56.4 m eaves to the ridge.
  - The Michigan gable, in stone, has pinnacles at its foot and a cross on its peak.
  - The small Monroe gable has one window, and a cross of its own facing Monroe.

Colours follow the drawing's greys, not the limestone's buff.

Omitted:

- the carving and the owl;
- the west end's form, which the Monroe Building hides;
- the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the ridge, a pinnacle, the south slope and the small gable;
  - both crosses, their stems and their arms;
  - the parapet, a merlon and a crenel;
  - on both street fronts, the hall's windows and piers, their heads, the wide windows,
    a floor's paired windows, the band and the parapet wall;
  - the upper floor's three windows on its gable end, and the small gable's one;
  - the north wall, blank below its eighth floor;
  - the model's exported palette, whose window tones no wall shares;
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

Identification: `bun scripts/panorama-owners.ts building-university-club` fits the rendition to the
mapped buildings, with the photographer's eye 10 m east and 100 m south of the drawing's fitted eye,
at 1.6 px RMS over seven tower silhouettes against the sky, four Michigan Avenue corners where a
sunlit south face meets a shaded front, and four roofs. A ray from that eye through each pixel meets
the nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction.
This building shows its south face at x 1304–1316 and its Michigan front at x 1317–1332, its roof at
row 426; each wall box below lies wholly on the face it names, as the script's `--box` option
reports and `tests/panorama-owners.test.ts` checks, while the roof box stands in the rows just above
the walls' highest row, which the option cannot test.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-university-club`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building's visible faces are 29 pixels
wide in all, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Limestone, south face, sunlit | 1306, 438, 1317, 462 | sat 0–0.35, val 0.5–1 | 151 (57.2%) | `175, 165, 158` | 155–193 / 143–185 / 135–175 |
| Dark pixels, south face, for comparison | 1306, 438, 1317, 462 | val 0–0.3 | 46 (17.4%) | `29, 21, 16` | 16–54 / 7–49 / 5–47 |
| Slate roof | 1310, 428, 1332, 436 | all | 176 (100.0%) | `95, 96, 101` | 82–101 / 88–102 / 91–107 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `175, 165, 158`, the sunlit south face's buff stone; the merlons and pinnacles take
  it.
- `slate` `95, 96, 101`, the steep roof, all its pixels.
- `glass`, `lit window` and `dim window` stay grey: the south face's darkest pixels measure
  `29, 21, 16`, a warm brown-black from 17.4% of the box, more likely the window reveals' shadowed
  stone than glass.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the limestone renders
`154, 146, 142` against the photograph's sunlit south face, 0.77 in linear light, and the roof
`123, 121, 125` against `95, 96, 101`, 1.64: the scene's sun lights the roof's slope, which the
photograph sees edge-on.

## 2026-10-10 — Calibration reference for a close-up (FID-COL-006)

The sampler's day study also measures this club's limestone on its Michigan front in Teemu008's 2012
sunlit close-up of the Gage group, `171, 162, 152` (box 10, 480, 125, 800, sat 0–0.35, val 0.5–1),
as the reference that calibrates that close-up to the panorama for the Keith and Ascher Buildings
(`keith-ascher-reference.md`). `bun scripts/sample-colours.ts day building-university-club` prints
that row after the FID-COL-005 rows; this building's palette entry is unchanged.
