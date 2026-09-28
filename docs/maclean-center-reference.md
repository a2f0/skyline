# MacLean Center: reference audit

`models/maclean-center-geographic.ts` builds the MacLean Center, 112 South Michigan Avenue,
for the geographic layout only. It was built as the Illinois Athletic Club and now belongs
to the School of the Art Institute of Chicago. The drawing shows it between the Lake View
and Monroe Buildings, outside the excerpt the original layout is fitted to, so the
original layout has no model of it. The model is a reconstruction from OpenStreetMap,
published history, the drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498712](https://www.openstreetmap.org/way/145498712), version 10:
  the outline between the Monroe Building and the Lake View Building, tagged 18 levels,
  with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares nodes with both neighbours: the Monroe Building, way
  145498713, and the Lake View Building, way 145498711.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218055845/http://www.emporis.com/en/wm/bu/?id=wolberghall-chicago-il-usa):
  - Wolberg Hall, 18 floors, by Barnett, Haynes & Barnett and Swann & Weiskopf;
  - "Six floors were added in 1985 to the top of the building by architects Swann &
    Weiskopf";
  - "An elaborate ornamental frieze adorns the top of the original building at the 11th
    floor level."
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/maclean-center/26975):
  77.4 m (254 ft) architectural and to the tip, 18 floors.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Illinois Athletic Club, 1908 with its 1985 addition, 220 ft.
- [The School of the Art Institute of Chicago](https://www.saic.edu/news/hidden-saic): the
  building was built in 1908 as the Illinois Athletic Club, and the school acquired it in
  1993.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.4 of the drawing's layer units are one metre of height. The photograph shows:
  - the narrow front's five columns of windows;
  - the old club's cornice, with round windows in the frieze beside it;
  - the addition's floors over it, arched on the top one;
  - the parapet with its openings.

The model's parapet is the Skyscraper Center's 77.4 m. The City's guide gives 220 ft
(67.1 m); its heights run below the other sources' along this street. Where published
heights disagree, the layout takes the one nearest the drawing, whose parapet here reads
73.8 m.

## Plan

The mapped outline is 21.9 m along Michigan and 51.8 m deep. Its Michigan front has
sub-metre steps.

Projected through the geographic camera, the front spans 291 to 435 layer units at grade.
The drawing's front runs from 354 to 495, about 60 units right of the projection. The
drift grows toward the left of the panorama, from 30 to 45 units at the Monroe Building. The
drawn front's right edge meets the Monroe Building's drawn left edge.

Measured as fractions of the drawn front, its windows stand in five columns, symmetrical
about the middle: narrow windows 8.4 m either side of the middle, and wide ones at the
middle and 4.35 m either side. Their widths differ by section:

| Section | Narrow | Wide |
| --- | ---: | ---: |
| Old club's floors | 1.4 m | 2.36 m |
| Addition's floors | 2 m | 3.15 m |
| Parapet's openings | 2.9 m | 2.9 m |

The addition's top floor arches the wide windows only. The frieze's three round windows,
about 90 cm across, stand over them.

## Heights

Heights are read on the drawn front through the geographic camera and scaled by 77.4/73.8,
so that the drawn parapet meets the published one. The scale adds 4.9%.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–4.7 m | Estimate: under the drawn floors |
| Old club's floors | 3.36 m | Drawing: the window rows to the twelfth floor, 3.2 m apart as drawn |
| Bands | 42.9–45.9 m | Drawing |
| Cornice | 45.9–47.8 m | Drawing: 60 cm proud |
| Frieze | 47.8–50.9 m | Drawing: round windows at 48.8–49.7 m |
| Addition's windows | 51.45–72.19 m | Drawing: six floors, the top one arched from 71.56 m |
| Parapet's openings | 74.4–76.1 m | Drawing |
| Parapet's top | 77.4 m | Drawing: the published height |

The drawn rows put twelve floors under the old club's bands, with a 4.7 m ground floor,
and six in the addition: eighteen, as Emporis gives. The hill in the drawing hides the
building below 30 m, so the lower floors are estimates.

## Model

- **Michigan front:** stone.
  - Five columns of windows on every floor, at each section's widths, with shopfronts on
    the ground floor.
  - The old club's bands and projecting cornice, and the frieze's round windows over the
    wide columns, each cell of the wall tested against the circle.
  - The addition's floors, the top one's wide windows arched with heads stepped to the
    middle half, and the parapet's dark openings.
- **Alley:** windows 1.6 m wide every 3.2 m.
- **Side walls:** shared with the Lake View and Monroe Buildings, plain.

Colours follow the drawing's greys, not the stone's.

Omitted:

- the ornament;
- the entrances;
- the neighbours, which hide the side walls' lower floors.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the published parapet's top, the record's one part from grade to it, and the cornice's
    ledge;
  - the five columns' windows on an old floor and an added one, their edges at each
    section's widths, and the piers between;
  - the parapet's openings and their edges;
  - the wide windows' arched heads, and none over the narrow ones;
  - the round windows over the wide columns only, round rather than square;
  - the bands and a pier of the parapet;
  - the party wall, windowless along a floor and without bands, and the alley's seven
    windows to a floor;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
