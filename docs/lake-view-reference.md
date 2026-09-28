# Lake View Building: reference audit

`models/lake-view-geographic.ts` builds the Lake View Building, 116 South Michigan Avenue,
for the geographic layout only. The drawing shows it between Peoples Gas and the MacLean
Center, outside the excerpt the original layout is fitted to, so the original layout has
no model of it. The model is a reconstruction from OpenStreetMap, published history, the
drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498711](https://www.openstreetmap.org/way/145498711), version 8:
  the outline between the MacLean Center and Peoples Gas, tagged 17 levels and limestone,
  and also named the Municipal Courts Building, with no height. It was retrieved through
  the [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares nodes with the MacLean Center, way 145498712, and with
  an outer way of the Peoples Gas relation to the south.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218073330/http://www.emporis.com/en/wm/bu/?id=lakeviewbuilding-chicago-il-usa):
  - 17 floors, by Jenney, Mundie & Jensen;
  - "The top 5 stories were a later addition (1912) by the original architects";
  - used as Chicago's city hall for a short time until 1911.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.5 of the drawing's layer units are one metre of height. The photograph shows the narrow
  front's three windows to a floor, arched on the floor under the attic.

No published height was found. The model's is read on the drawing and lowered 0.6 m, as
the University Club's drawn gable, three lots north, reads 0.6 m above its mapped 67.7 m.

## Plan

The mapped outline is 11.7 m along Michigan and 51.8 m deep. A light court 12.5 m long and
2.8 m deep opens in its south wall.

Projected through the geographic camera, the front spans 212 to 291 layer units at grade.
The drawing's front runs from 272 to 354, about 60 units right of the projection, as at the
MacLean Center. Measured as fractions of the drawn front, its three windows are about 2.5 m
wide and 3.5 m apart about the middle.

## Heights

Heights are read on the drawn front through the geographic camera, lowered 0.6 m as
described above.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–9.55 m | Estimate: what seventeen floors leave under the drawn pitch |
| Typical floor | 3.85 m | Drawing: the window rows |
| Sixteenth floor's arched windows | 63.9–65.9 m | Drawing: heads from 65.3 m |
| Attic's windows | 68–69 m | Drawing |
| Cornice band | 70.2–71.3 m | Drawing |

The drawn rows stand 3.85 m apart. The published seventeen floors, carried down at that
pitch, leave a 9.55 m ground floor. The hill in the drawing hides the building below 31 m,
so the lower floors are estimates.

## Model

- **Michigan front:** stone.
  - Three windows 2.5 m wide to each floor, with tall shopfronts on the ground floor.
  - The sixteenth floor's windows arched, their heads stepped to the middle half.
  - The attic's small windows and the cornice band.
- **Alley:** windows 1.6 m wide every 3.2 m, without the band or arches.
- **Side walls:** the north wall, shared with the taller MacLean Center, the south wall,
  shared with the taller Peoples Gas, and the light court's walls stay plain.

Colours follow the drawing's greys, not the limestone's.

Omitted:

- the ornament;
- the entrances;
- the neighbours, which hide the side walls.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the top, and the light court open to the sky;
  - a floor's three windows, their edges and the piers between;
  - the arched heads, the attic's windows and the cornice band;
  - the party wall, windowless along a floor, and the light court's plain walls;
  - the alley's four windows to a floor;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
