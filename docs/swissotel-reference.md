# Swissôtel Chicago: reference audit

`models/swissotel-geographic.ts` builds Swissôtel Chicago, 323 East Wacker Drive, for the
geographic layout only. From the geographic camera it stands mostly behind The Buckingham.
Its west corner rises between Three Illinois Center's roof and The Buckingham, closing the
seam where those two models' corners meet. That is outside the excerpt the original layout
is fitted to, so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, published data and photographs, not a survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 641288601](https://www.openstreetmap.org/way/641288601), version 3: the
  tower, a triangle tagged 139 m and 45 levels. It is a part of the hotel's outline,
  [way 95486966](https://www.openstreetmap.org/way/95486966), version 14, which carries the
  same tags. The hotel's podium, [way 95486953](https://www.openstreetmap.org/way/95486953),
  is tagged only as a building. They were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920).
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/swissotel-chicago/4362):
  139.3 m / 457 ft, 43 floors, completed 1989, all-steel.
- [Wikidata](https://www.wikidata.org/wiki/Q21609099): architect Harry Weese, inception 1988.
- The Skyscraper Center's photographs: a triangular tower of reflective blue-green glass on a
  white podium, beside Three Illinois Center's bronze. Its wall is a flush grid of thin
  mullions and transoms, the panels about a floor tall.
- Wikimedia Commons, [*East Wacker 2*](https://commons.wikimedia.org/wiki/File:East_Wacker_2.JPG),
  2014: the tower beside Three Illinois Center, its panels in about 46 rows above Upper Wacker
  Drive.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At The Buckingham's west
  edge, from 6,878 to 6,904 layer units, the photograph shows a narrow dark strip, its top at
  1,869. The drawing's `buckingham-west` group hatches a strip there.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors | 3.10 m | The published height over OpenStreetMap's 45 levels |
| Roof | 139.3 m | The Skyscraper Center |

The Skyscraper Center counts 43 floors. The model takes OpenStreetMap's 45 levels, nearer the
2014 photograph's 46 rows of panels above Upper Wacker Drive. Either count puts the floors
3.1 to 3.2 m apart.

## Plan

The mapped tower is a triangle, 48.8 m along its south side on Wacker Drive, its west and
north-east faces about 48 m each to its apex at the north. A slight kink in the west face
and a jog in the north-east face stay in the model. The mullions are 6 cm wide, about 1.5 m
apart, set out from each face's middle. That spacing is read on the Skyscraper Center's
photographs, and is an estimate.

## Against the photograph

Projected through the geographic camera, the tower's west corner stands at 6,932 layer
units, its roof at 1,864. It is the nearest mapped building behind the seam at 6,997 to
6,999, where Three Illinois Center's north-east corner and The Buckingham's west edge leave
sky; NBC Tower stands farther behind. The
photograph's narrow strip at The Buckingham's edge tops out within 5 units of that corner's
roof, 54 units left of it. The drawing sits about 110 units left of the projection here, so
the strip is not settled as the Swissôtel; see the [label audit](building-labels.md).

## Model

- **Walls:** a flush curtain wall of reflective glass.
  - A mullion on each module.
  - A transom on each floor line, with a panel to each floor between them.
  - A coping at the roof.
- **Roof:** flat.

Colours follow the drawing's greys, cooled toward the glass's blue-green.

Omitted:

- the block, about 18 by 7.5 m, that the hotel's outline adds to the tower's north-east face;
  it has no height of its own;
- the podium, which carries no height or levels;
- the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof at 139.3 m, and the record's one part;
  - up the south face between mullions, a panel to each of 45 floors, a transom on each floor
    line, and the coping;
  - ten panes in ten modules of 1.5 m between mullions;
  - the model's exported palette, whose window tones the frame does not share;
  - the exact mapped part at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
