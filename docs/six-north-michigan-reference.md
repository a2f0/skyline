# Six North Michigan: reference audit

`models/six-north-michigan-geographic.ts` builds Six North Michigan, the Montgomery Ward
Building, 6 North Michigan Avenue, for the geographic layout only. The drawing shows it
right of Willoughby Tower, outside the excerpt the original layout is fitted to, so the
original layout has no model of it. The model is a reconstruction from published data,
OpenStreetMap, the drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 126982631](https://www.openstreetmap.org/way/126982631), version 12:
  the outline on the north-west corner of Michigan and Madison, tagged 22 levels, 86 m and
  1899. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's.
- [Chicagology](https://chicagology.com/goldenage/goldenage015/):
  - 85 feet on Michigan Avenue by 163 feet on Madison Street;
  - the tower first planned on the corner;
  - "currently 282 feet (86 m) tall, following the removal of a pyramid top and
    sculpture", from 394 feet.
- [Chicago Designslinger](https://chicagodesignslinger.blogspot.com/2015/02/six-north-michigan-montgomery-ward-co.html):
  the tower moved during construction to the middle of the building's park-facing front;
  four floors added later wrapped around it, leaving three storeys above them.
- [Industrial Scenery](http://industrialscenery.blogspot.com/2016/03/montgomery-ward-buildings.html):
  - Schmidt, Garden & Martin's twelve storeys of 1899;
  - four more added in 1923 by Holabird & Roche, sixteen in all;
  - 282 feet once the pyramid, observatory and statue came off in 1947.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the tower, about 8.7
  of the drawing's layer units are one metre of height. The photograph shows:
  - the block's cornice;
  - the tower's pilastered face between the Michigan wings;
  - its arched stage of three windows to a face;
  - its top stage's ornamental panels.

## Plan

The mapped outline is a block on the corner:

- 27.5 m along Michigan;
- 49.6 m along Madison.

Both match the published 85 by 163 feet within 1.6 m.

Projected through the geographic camera, the Michigan front spans 1,614 to 1,770 layer units
at the cornice, where the drawing has 1,642 to 1,783. The drawing sits right of the
projection there by 28 units at the south end and 13 at the north. Willoughby Tower hides
most of the drawn Madison front.

Measured against that drift, the drawn tower spans 7.5 to 20 m north of Madison. It is
12.5 m wide, centred on the 27.5 m front, as the history says it was built. It stands
flush with the front from the ground up, the wings' windows running either side of it.

The tower's depth is less certain. Its drawn south face gives 11.1 m, its cornice 12 m,
and its band, top stage and cap about 12.5 m. The model takes 12 m.

The drawing puts the other parts at these sizes:

- the tower's band 0.5 m proud of its walls;
- its cornice 1.2 m proud;
- the top stage 0.8 m in from the walls, and its cap 0.3 m in;
- the block's cornice a metre proud, stopping either side of the tower;
- the tower's windows, from its street floors to its arched stage, on shared centres about
  3 m apart, the tall ones about 2 m wide.

## Heights

Heights are read on the drawn Michigan front through the geographic camera. They are
measured down from the published 86 m, taken at the drawn cap. Read on its own, the drawn
top stands 3.05 m higher.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–6 m | Estimate: under the drawn floors |
| Typical floor | 3.74 m | Drawing: the window rows, sixteen storeys to the cornice |
| Block's walls | 62.1 m | Drawing: under the cornice |
| Block's cornice and roof | 63.6 m | Drawing |
| Tower's seventeenth floor | 62.1–65 m | Drawing: its windows at 62.95–64.77 m |
| Tower's band | 65–66.9 m | Drawing |
| Arched stage's small windows | 66.9–68.2 m | Drawing |
| Arched stage's tall windows | 70.7–74.2 m | Drawing: heads from 73.7 m |
| Tower's cornice | 75.6–78 m | Drawing |
| Top stage | 78–84.5 m | Drawing: its panels to 83.2 m |
| Cap | 84.5–86 m | Published: 282 feet |

The drawing's window rows stand 3.6 to 3.8 m apart. With the published sixteen storeys and
a 6 m ground floor, that puts the block's top floor under the drawn cornice. The hill in the
drawing hides the lowest floors, so the ground floor's height is an estimate.

## Model

Brick walls with a spandrel and window on every floor:

- **Block:** fills the lot to 62.1 m, with shopfront glass on the ground floor, under a
  cornice to 63.6 m.
- **Michigan front:** three windows to each 7.5 m wing and three to the tower between
  them, on the centres of the windows above.
- **Madison, the alley and the north wall:** eighteen windows to a floor on Madison, and
  the same 2.75 m spacing behind. The north wall is shared with 20 North Michigan, mapped at
  eight storeys, and stays blank below the ninth floor.
- **Tower, above the block:**
  - the seventeenth floor, then the band;
  - the arched stage: three tall windows to a face, 2 m wide and 3 m apart, over small
    ones on the same centres, their heads narrowing to the middle metre;
  - its cornice;
  - the top stage, each face holding a pale panel 7.2 m wide, under the cap.

Colours follow the drawing's greys, not the brick's tan.

Omitted:

- the pilasters and terracotta ornament;
- the entrances;
- the arched windows' curved heads, stepped instead.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the cap, the tower's cornice ledge, and the block's roof and cornice;
  - the tower's walls on all four sides;
  - the tower's band, cornice, top stage and cap;
  - the block's cornice either side of the tower and open in front of it;
  - the Michigan front's windows, piers and spandrels, and Madison's eighteen windows to a
    floor;
  - the north wall, blank on the eighth floor and windowed on the ninth;
  - on all four of the tower's faces: its tall windows and their heads, its small windows,
    its seventeenth floor's windows, and the brick between;
  - the top stage's panels;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
