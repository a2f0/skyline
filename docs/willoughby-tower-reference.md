# Willoughby Tower: reference audit

`src/models/willoughby-tower-geographic.ts` builds Willoughby Tower, 8 South Michigan Avenue,
for the geographic layout only. The drawing shows it left of Six North Michigan, outside the
excerpt the original layout is fitted to, so the original layout has no model of it. The
model is a reconstruction from published data, OpenStreetMap, the drawing and photographs,
not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 124873939](https://www.openstreetmap.org/way/124873939), version 10:
  the L-shaped outline at Michigan and Madison, 38 levels to 133.5 m. It was retrieved
  through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  later than the rest of the extract.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/willoughby-tower/9854):
  - 133.5 m (438 ft) architectural height;
  - 38 storeys, all steel, office;
  - completed 1929, by Samuel N. Crowen & Associates.
- [Chicagology](https://chicagology.com/skyscrapers/skyscrapers045/):
  - a Gothic tower with setbacks around the 23rd floor;
  - variegated Indiana limestone on the two street fronts over two floors of granite;
  - an observatory in the tower.
- [A 2014 photograph on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Willoughby-Tower-Chicago-2014.jpg).
  It shows:
  - the base's Gothic parapet and pinnacles at the setback;
  - the shaft rising at the corner, with a shoulder a few floors high beside it;
  - the crown's arched windows, three to a face between pinnacles;
  - an antenna the drawing does not show.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the tower, about 8.9
  of the drawing's layer units are one metre.

## Plan

The mapped outline is an L on the corner of Michigan and Madison:

- 24.4 m along Michigan;
- 33.2 m along Madison;
- a notch at its south-west.

Projected through the geographic camera, the Michigan front spans 1,340 to 1,487 layer
units, where the drawing has 1,362 to 1,499. The drawn shaft's Michigan face starts at the
drawn front's south end and spans 66 units, about 11 m; its south face spans 118 units,
about 17.4 m. So the shaft stands at the lot's south-east corner, flush with Michigan and
with the lot's south wall, and the model takes those dimensions; the base alone reaches
Madison.

The crown's drawn faces put its corners 2.1 m in from the shaft's Michigan and west faces
and 1.2 m in from its south and north faces, a 13.2 × 8.6 m block. Measured from the drawn
shaft's corner, so that the camera's few-unit residual there drops out, the model's crown
corners project within a unit of the drawn ones. On those faces:

- The Michigan face holds three tall windows, about 0.95 m wide and 1.7 m apart, centred on
  it. A tall pinnacle stands over them, with a lower one about 2.9 m to either side.
- The south face holds three shorter windows, about 0.8 m wide and 1.7 m apart. They sit
  under a gable about 6.9 m long and a tall central pinnacle, all centred about 10.2 m west
  of the Michigan front, 1.5 m west of the face's middle.
- The shaft's three strips, 0.75 m wide, stand about 1.65 m apart, about centred on its
  Michigan face.

The drawing shows neither the west nor the north face; the model repeats the Michigan face
on the west and the south face on the north.

The drawn group also paints, below and left of the tower, the Chicago Athletic
Association's Michigan front, which projects there from its lot just south. This model
leaves it out; its own model builds it, see the
[Chicago Athletic Association audit](chicago-athletic-association-reference.md).

## Heights

Heights are read on the drawn tower through the geographic camera. They are measured down
from the published 133.5 m, taken at the drawn crown's central pinnacles. Read on its own,
the drawn top stands 1.65 m higher. The crown's levels are read on its own faces, each
measured down from its central pinnacle, and the model's are within 0.15 m of them.

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite base | 0–9.1 m | Published: two floors of granite |
| Typical floor | 3.35 m | Estimate: 38 storeys under the crown |
| Base's setback | 80.5 m | Drawing: the Michigan front's top, over the 23rd floor |
| Shoulder | 92 m | Drawing: the block west of the shaft |
| Shaft | 123.5 m | Drawing: under the crown |
| Crown's tall windows | 124.7–129.1 m | Drawing: the short faces' |
| Crown's short windows | 127.1–129.1 m | Drawing: the long faces' |
| Crown's window heads | 128.6–129.1 m | Drawing: the arches, from their springing |
| Crown's parapet | 131.7 m | Drawing |
| Crown's gables | 132.2 m | Drawing: over the long faces |
| Crown's side pinnacles | 132.5 m | Drawing: flanking the short faces |
| Crown's central pinnacles | 133.5 m | Published |

The drawing shows window slots, not floor lines, so the floor pitch is an estimate.
It puts floor 24 at 79.7 m, just under the setback, and floor 37 at 123.3 m, the crown's.

## Model

Limestone walls over a granite base, with a stone spandrel and window on every floor:

- The base fills the lot to the setback, with windows every 3 m between stone piers and a
  parapet of pinnacles along the two street fronts.
- The shoulder stands west of the shaft for four floors.
- The shaft's Michigan face carries three dark strips, spandrels and all, between stone
  piers, with a window near each edge. Its other faces carry windows every 3 m.
- The crown holds three arched windows to a face, 0.9 m wide and 1.7 m apart. Tall ones
  are centred on the short faces; short ones are centred 10.2 m west of Michigan on the
  long faces. Their heads narrow to the middle half for the last half-metre, a stepped
  head standing for the arch.
- A tall pinnacle stands over each face's windows. Lower pinnacles flank it on the short
  faces, and a gable on the long faces.

Colours follow the drawing's greys rather than the limestone's buff.

Omitted:

- the antenna;
- the Gothic carving and the pinnacles' tapers;
- the entrances;
- the Chicago Athletic Association, which the drawn group includes and its own model builds.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the crown's parapet, the shaft's roof, the shoulder's, the base's setback, and a parapet
    pinnacle;
  - either side of the crown's Michigan and south faces, its central, side pinnacles and a
    gable;
  - on the shaft's Michigan face, each strip's spandrel and window and the piers between
    them;
  - on all four of the crown's faces, all three windows across their width, their narrowed
    heads, the piers between them, the parapet over them, and where their feet stand, lower
    on the short faces;
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
night panorama the drawing traces. No change to these materials between 2008 and 2013 is known to
this audit.

Identification: the building's bearing and roof height from the drawing's fitted eye (1471.76 m east
and 1948.8 m south of Crain's mapped centre), fitted to the rendition through the six buildings
measured first, place it at x 1373–1410 with its roof near y 358; the fit holds those six within
about 25 pixels across and 4 pixels in height. It is the buff stone tower at x 1372–1395 whose roof
stands at y 353; the paler tower with a green roof just right of it rises higher, behind it.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-willoughby-tower`
downloads the photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building is about 23 pixels wide in the
rendition, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Limestone, sunlit | 1373, 357, 1386, 395 | sat 0–0.35, val 0.5–1 | 393 (79.6%) | `204, 189, 171` | 188–217 / 173–202 / 159–189 |
| Glass | 1373, 357, 1386, 395 | val 0–0.4 | 69 (14.0%) | `77, 69, 65` | 65–92 / 58–80 / 48–71 |
| Shaded face, for comparison | 1387, 357, 1395, 395 | all | 304 (100.0%) | `74, 78, 84` | 60–88 / 65–92 / 71–96 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `204, 189, 171`, the sunlit face, the buff Indiana limestone the audit records; the
  pinnacles take it too. The shaded face, windows and all, measures `74, 78, 84`.
- `glass` `77, 69, 65`, only 14.0% of the box, so mixed with stone; `lit window` and `dim window`
  take it exactly, since no office lights show by day.
- `dark granite`, the two-storey base, and `neutral` stay grey: trees hide the base.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the limestone renders
`189, 187, 170` under the photograph's rule, 0.93 of the photograph's brightness in linear light.

## 2026-10-10 — Calibration reference for a close-up (FID-COL-006)

The sampler's day study also measures this tower's limestone on its Michigan front in Diego Delso's
2012 overcast close-up of the Chicago Athletic Association, `179, 174, 166` (box 862, 0, 900, 780,
sat 0–0.35, val 0.5–1), as the reference that calibrates that close-up to the panorama for the
Athletic Association and the Gage Building (`chicago-athletic-association-reference.md` and
`gage-reference.md`). `bun scripts/sample-colours.ts day building-willoughby-tower` prints that row
after the FID-COL-004 rows; this building's palette entry is unchanged.
