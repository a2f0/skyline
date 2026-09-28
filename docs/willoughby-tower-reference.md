# Willoughby Tower: reference audit

`models/willoughby-tower-geographic.ts` builds Willoughby Tower, 8 South Michigan Avenue,
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
  - the crown's arched windows and corner pinnacles;
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
Madison. Its crown is inset by 1.8 m, as the drawn crown is narrower than the shaft by
about 3 m a side.

The drawn group also paints, below and left of the tower, the Chicago Athletic
Association's Michigan front, which projects there from its lot just south. The model leaves
it out.

## Heights

Heights are read on the drawn tower through the geographic camera. They are measured down
from the published 133.5 m, taken at the drawn crown's pinnacles. Read on its own, the drawn
top stands 1.65 m higher.

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite base | 0–9.1 m | Published: two floors of granite |
| Typical floor | 3.35 m | Estimate: 38 storeys under the crown |
| Base's setback | 80.5 m | Drawing: the Michigan front's top, over the 23rd floor |
| Shoulder | 92 m | Drawing: the block west of the shaft |
| Shaft | 123.5 m | Drawing: under the crown |
| Crown's parapet | 131.5 m | Estimate: under the pinnacles |
| Crown's pinnacles | 133.5 m | Published |

The drawing shows window slots, not floor lines, so the floor pitch is an estimate.
It puts floor 24 at 79.7 m, just under the setback, and floor 37 at 123.3 m, the crown's.

## Model

Limestone walls over a granite base, with a stone spandrel and window on every floor:

- The base fills the lot to the setback, with windows every 3 m between stone piers and a
  parapet of pinnacles along the two street fronts.
- The shoulder stands west of the shaft for four floors.
- The shaft's Michigan face carries three dark strips, spandrels and all, between stone
  piers, with a window near each edge. Its other faces carry windows every 3 m.
- The crown holds tall arched windows, three to a long face and two to a short one, their
  heads narrowing to the middle half for the last metre, under its parapet and corner
  pinnacles.

Colours follow the drawing's greys rather than the limestone's buff.

Omitted:

- the antenna;
- the Gothic carving;
- the entrances;
- the Chicago Athletic Association, which the drawn group includes.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the crown's parapet, the shaft's roof, the shoulder's, the base's setback, and a parapet
    pinnacle;
  - on the shaft's Michigan face, each strip's spandrel and window and the piers between
    them;
  - a crown window across its width, its narrowed head, and the parapet over it;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
