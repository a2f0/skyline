# 180 North Michigan Avenue: reference audit

`models/north-michigan-180-geographic.ts` builds 180 North Michigan Avenue, the Harvester
Building, for the geographic layout only. The drawing shows its south wall behind
Millennium Park Plaza, which hides its Michigan front. That is outside the excerpt the
original layout is fitted to, so the original layout has no model of it. The geographic
camera named the drawn group; see [the building audit](building-labels.md#names-from-the-geographic-camera).
The model is a reconstruction from OpenStreetMap, listings, the drawing and photographs,
not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 210671714](https://www.openstreetmap.org/way/210671714), version 5:
  the outline on the south-west corner of Michigan and Lake, tagged 23 levels, with no
  height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's.
- [Marc Realty](https://marcrealty.com/180-north-michigan-office-space-chicago/): the
  Harvester Building, 24 stories, on the south-west corner of Michigan Avenue and Lake
  Street.
- [CommercialCafe](https://www.commercialcafe.com/commercial-property/us/il/chicago/180-north-michigan-avenue-1/):
  built in 1927, 24 floors.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  7.7 of the drawing's layer units are one metre of height. The photograph shows brown
  masonry with arched top windows, and a dark facade continuing west of the drawn wall to
  nearly its top.

No published height was found, so the model's height is read on the drawing. The drawn tops
nearby fall within about a metre of their published heights: Millennium Park Plaza's, across
Michigan, reads a metre low.

## Plan

The mapped outline is 28.7 m along Michigan and 38.9 m along its south wall, which has a
node 21.85 m west of Michigan.

Projected through the geographic camera, the south wall spans 3,142 to 3,385 layer units.
The drawing's wall runs from 3,240 to 3,355, where Millennium Park Plaza covers it. Read on
the wall's plane, that is 4.9 to 22.5 m west of Michigan: the drawn edge lands on the node.

West of that edge the drawing leaves sky above 168 North Michigan, but the photograph shows
the building's dark masonry there, rising nearly to its top. Further west, Crain's banded
front covers the rest from the camera. So the model builds the whole mapped lot to the
parapet, as OpenStreetMap maps one building.

Measured on the wall's plane, the drawn windows stand in five columns about 2.7 m apart and
1.4 m wide, centred from 8.6 to 19 m west of Michigan. The model centres its windows 2.7 m
apart from 2.8 m across the whole south wall, within 0.4 m of the drawn ones. The walls the drawing does not show carry the same spacing,
centred on each.

## Heights

Heights are read on the drawn south wall through the geographic camera, without correction.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–9.85 m | Estimate: double height, under the drawn floors |
| Typical floor | 3.25 m | Drawing: the window rows, 24 storeys in all |
| String courses | 61.85 and 71.6 m | Drawing: over the seventeenth and twentieth floors |
| Top floor's band | 81.75–82.3 m | Drawing |
| Top floor's arched windows | 82.3–86 m | Drawing: heads from 85.4 m |
| Parapet | 86.3 m | Drawing: the wall's top edges |

The drawn rows stand 3.25 m apart. Below the top floor, the published 24 storeys then leave
the ground floor 9.85 m, double height; the hill in the drawing hides it. The drawing reads
3 to 4 m high a few blocks south, at Six North Michigan and the Michigan Boulevard Building.
If it does here, the parapet would stand near 83 m, and the ground floor would be an
ordinary one. The drawn top bows up about a metre at its middle; the model's parapet is
level at its edges.

## Model

Brick masonry with a spandrel and window on every floor:

- **Ground floor:** tall windows, 1 to 8.6 m.
- **Floors 2–23:** windows 2.05 m tall, on the columns above.
- **String courses:** over the seventeenth and twentieth floors, and a band under the top
  floor.
- **Top floor:** arched windows, their heads narrowing to the middle half for the last
  60 cm, stepped for the arch.

Colours follow the drawing's greys, not the masonry's brown. The page's dimension table
labels its height as measured on the drawing.

Omitted:

- the ornament;
- the entrances;
- the top's bow.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the parapet over the front and the rear of the lot;
  - the south wall's windows on their columns and the piers between them;
  - the ground floor, the string courses, the top floor's band, and a plain spandrel;
  - an arched window, its narrowed head and the parapet;
  - window colours that no wall shares;
  - the Michigan front's eleven windows to a floor;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
