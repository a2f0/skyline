# Michigan Boulevard Building: reference audit

`models/michigan-boulevard-geographic.ts` builds the Michigan Boulevard Building, 30 North
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
  - the south wall's return bay, windowed above the eighth floor, and the brick beyond,
    windowed only on the top four floors;
  - Washington's sixteen windows to a floor;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
