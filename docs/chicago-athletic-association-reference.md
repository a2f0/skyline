# Chicago Athletic Association: reference audit

`models/chicago-athletic-association-geographic.ts` builds the Chicago Athletic Association,
12 South Michigan Avenue, for the geographic layout only. The drawing paints its Michigan
front in Willoughby Tower's group, below and left of the tower, right of the Gage Building;
see the [Willoughby Tower audit](willoughby-tower-reference.md). That is outside the excerpt
the original layout is fitted to, so the original layout has no model of it. The model is a
reconstruction from OpenStreetMap, the Historic American Buildings Survey's measured
drawings, the drawing and photographs, not a survey of its own.

## References checked September 29, 2026

- [OpenStreetMap way 147476152](https://www.openstreetmap.org/way/147476152), version 8: the
  outline between the Gage Building and Willoughby Tower, tagged the Chicago Athletic
  Association Hotel and 18 levels, with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with the Gage Building, way
  124865450, and its north wall's with Willoughby Tower, way 124873939, and the annex on
  Madison Street, way 147476156.
- The [Historic American Buildings Survey's record](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0900/il0935/data/il0935data.pdf),
  HABS IL-1226, 2008:
  - "The principal façade is based on the Doges Palace in Venice";
  - "The original 11-story building is rectangular in plan, however, due to the 1906
    addition at 71 East Madison Street, it is now L-shaped";
  - "The roof is flat, and is hidden behind a parapet wall composed of grey and red diaper
    bond brick. Below the parapet, the building's intricate limestone cornice features
    various sporting equipment";
  - "Ornamental stone quoining divides the façade into three distinct bays".
- The same record's measured drawings:
  - the [east elevation](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0900/il0935/sheet/00004a.tif),
    "TOP OF PARAPET ELEVATION = 149'-4"";
  - the [section](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0900/il0935/sheet/00005a.tif),
    with each floor's level from the first floor's;
  - the [first floor's plan](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0900/il0935/sheet/00002a.tif),
    81 ft 6 in along Michigan.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Chicago Athletic Association, 1893, 254 ft, and its annex at 71 East Madison
  Street, 1907–1926, 254 ft. The measured drawings put the Michigan front's parapet at
  149 ft 4 in, so the guide's 254 ft is the annex's.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9 of the drawing's layer units are one metre of height. The photograph shows the lit top
  of the front between the Gage and Willoughby Tower: the top storey's brick, the cornice and
  frieze, and the eighth floor's tracery. It predates the rooftop addition of 2015.

## Heights

The measured drawings give every level, from the first floor's:

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors 2–7 | 5.32, 10.06, 14.19, 18.9, 22.29 and 25.43 m | The section |
| Eighth floor | 28.68 m | The section: 94 ft 1 in |
| Eighth floor's arcade | 28.37–34.42 m | The elevation: its lights, 93 ft 1 in to 112 ft 11 in |
| Ninth floor | 34.9 m | The section: 114 ft 6 in, behind the frieze |
| Cornice | 36.82–38.68 m | The section: its profile, 120 ft 9½ in to 126 ft 11 in |
| Tenth and eleventh floors | 38.79 and 41.58 m | The section, behind the top storey |
| Roundels' centres | 43.89 m | The elevation: 144 ft |
| Parapet | 45.52 m | The elevation: 149 ft 4 in |

Levels the sheets do not print are read against the levels they do. The model takes the
first floor as its zero; the sidewalk stands about a foot lower.

Read through the geographic camera, the drawn top stands at 49.1 m. Scaled so that it meets
the measured parapet, by 45.52/49.09, the drawn arcade's windows stand at 28.5–35 m, over
the eighth floor's 28.68 to 34.9 m, and the drawn cornice at 37.9–39.3 m, 0.6 to 1.1 m over
the section's. The drawing reads a little high along this stretch; see the
[Gage Building audit](gage-reference.md#heights).

The hill in the drawing hides the building below the eighth floor. The lower storeys follow
the record's description and the section's levels. Their windows are estimates.

## Plan

The mapped outline is 25.15 m along Michigan; the survey gives 81 ft 6 in, 24.84 m. Behind the
front it is L-shaped, round a light court on the north between Willoughby Tower and the annex.

Projected through the geographic camera, the Michigan front spans 1,193 to 1,343 layer units at
its parapet. The drawing's front runs from 1,219 to 1,362, 19 to 26 units right of the
projection, as the drawing sits right of it along this stretch.

Measured on the elevation, as fractions of the front from its south corner:

- the three bays' openings, between the quoins, 0.053 to 0.195, 0.254 to 0.74 and 0.799 to
  0.941, in two, eight and two lights;
- the nine roundels, 90 cm across, centred from 0.077 of the front, 0.1065 apart;
- the top storey's window, at its north end, 0.84 to 0.947.

The drawing's central opening agrees to within 0.01 of the front. It draws each side bay's
opening as a single, narrower lancet, ending up to 0.044 of the front short of the
elevation's.

## Model

- **Michigan front:** stone and brick, three bays with openings in two, eight and two
  lights, divided by 15 cm colonnettes. The openings are square-headed and the roundels
  square, standing for the arches and the round roundels.
  - The ground floor's arched openings, the second floor's small arches, the great arcade
    over the third to fifth floors, the lettered band over it, and the sixth and seventh
    floors' windows. These are estimates.
  - The eighth floor's traceried arcade.
  - The carved frieze in front of the ninth floor.
  - The cornice, projecting 88 cm.
  - The top storey's diaper brick, pierced by nine roundels and a window at its north end.
- **Alley and light court:** brick, windows 1.6 m wide about 3.2 m apart on each floor from
  the second, on the court's east wall as on its others. The drawing does not show these
  walls, so they are an estimate.
- **Party walls:** the bare shell. The Gage Building to the south and Willoughby Tower and the
  annex to the north are all taller and cover them.

Colours follow the drawing's greys, not the limestone and red and grey brick.

Omitted:

- the arches' and the roundels' shapes, the tracery, the carved sporting equipment and the
  diaper pattern;
- the rooftop addition of 2015, which the photograph predates and whose height is not
  published;
- the annex on Madison Street, which the drawing does not show.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts, against the survey's measurements:
  - the parapet at 149 ft 4 in, and the record's one part;
  - the eighth floor's arcade in two, eight and two lights, between the quoins, and its
    foot and head;
  - the frieze, and the cornice, 88 cm proud between its profile's foot and head;
  - the nine roundels, the top storey's window and its brick;
  - a window up a bay to each storey the front shows under the cornice;
  - the alley's and the light court's windows, one to each floor from the second, their
    sills 90 cm over the section's floor levels, and the court's east wall in brick, not
    the front's stone;
  - the bare party walls;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
