# Gage Building: reference audit

`models/gage-geographic.ts` builds the Gage Building, 18 South Michigan Avenue, for the
geographic layout only. The drawing shows its Michigan front and, above its lower
neighbours at 24 and 30 South Michigan, its south wall, between the University Club and
Willoughby Tower. That is outside the excerpt the original layout is fitted to, so the
original layout has no model of it. The geographic camera named the drawn groups; see
[the building audit](building-labels.md#names-from-the-geographic-camera). The model is a
reconstruction from OpenStreetMap, published history, the drawing and photographs, not a
survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 124865450](https://www.openstreetmap.org/way/124865450), version 10:
  the outline between the Chicago Athletic Association and 24 South Michigan, tagged the
  Gage Building and 12 levels, with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with 24 South Michigan, way
  126982636, and its north wall's with the Chicago Athletic Association, way 147476152.
- [Wikipedia's Gage Group Buildings](https://en.wikipedia.org/wiki/Gage_Group_Buildings):
  - three buildings at 18, 24 and 30 South Michigan, by Holabird & Roche for three
    millinery firms;
  - the Gage Building's ornamental front by Louis Sullivan;
  - built eight storeys, with four added in 1902, when Sullivan's ornament at the tops of
    the piers was moved up to the new height.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Gage Group, 1898–1900, 1902 and 1971, 100 ft and 154 ft. The Gage is the
  group's tallest.
- The [Historic American Buildings Survey's record](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0000/il0056/data/il0056data.pdf),
  HABS IL-1065, 1973:
  - "The Gage Building measures 58' x 160' and was originally 112' high", eight storeys;
  - in 1902 "the old cornice and ornamental work were merely reset four stories higher…
    it was just 12-stories high instead of eight";
  - the Keith, next south, "62' x 101' and is still 101' high", seven storeys.
- The Commission on Chicago Historical and Architectural Landmarks'
  [designation report](https://archive.org/stream/CityOfChicagoLandmarkDesignationReports/GageGroup_djvu.txt),
  1981: "The Gage Building is three bays wide. Casement windows originally filled the bays:
  a series of five occupied the central bay and the two flanking bays each had four."
- [Emporis, archived in 2021](http://web.archive.org/web/20211205150301/https://www.emporis.com/buildings/117002/gage-building-chicago-il-usa):
  12 floors, "Height (estimated) 139.77 ft".
- [Wikimedia Commons, *Gage Group Buildings*](https://commons.wikimedia.org/wiki/File:Gage_Group_Buildings.jpg):
  the Gage's cream front of three bays between tall piers, a wide window of several lights
  to each bay on eleven floors over the shopfronts, and the ornament over the inner piers;
  the lower red fronts of 24 and 30 South Michigan beside it.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9 of the drawing's layer units are one metre of height. The photograph shows:
  - the cream Michigan front, three bays of windows to a floor, its top above the
    University Club's parapet;
  - the south wall's common brick above its neighbours, dark, with a few lit windows near
    the front and along two floors;
  - the Chicago Athletic Association's lower Gothic top to the north.

## Heights

Where published heights disagree, the layout takes the one nearest the drawing's reading.
Read through the geographic camera, the drawn parapet stands at 54.2 m.

| Source | Height |
| --- | ---: |
| The City's guide | 154 ft (46.94 m) |
| Emporis, estimated | 139.77 ft (42.6 m) |
| HABS, as built with eight storeys | 112 ft (34.1 m) |

The model takes the City's 154 ft as the parapet's top, the drawn feature it is nearest;
the guide does not say what it measures to. Heights read on the drawing are scaled by
46.94/54.2, so that the drawn parapet meets it, and the drawn floors become 3.22 m
(10.55 ft).

The drawing's own proportions, which no scale changes, agree with the City and the HABS
record together. The four floors of 1902 went in under the old cornice, so they are the
difference between the City's 154 ft and the original eight storeys' 112 ft: 42 ft, or
27.3% of the height. The drawing's top four floors take 27.4% of its parapet's height.
This checks the City's figure against HABS's; it is not a further published height.

The drawing reads high here by more than elsewhere on this stretch, where it stands within
about 4 m of published heights. Its Gage parapet stands 2.3 m over the University Club's drawn
merlons, as the photograph also shows; at 154 ft the model's stands about 5 m under them.
The same camera reads 24 South Michigan's drawn top, 35.6 m, over the HABS record's 101 ft
by the same ratio as the Gage's.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–5.2 m | Estimate: shopfronts to 4 m under a sign band |
| Floors 2–7 | 3.97 m | Estimate: between the ground floor and the drawn floors |
| Floors 8–12 | 3.22 m | Drawing: five window rows, 3.715 m apart as drawn |
| Windows | 2.1 m tall | Drawing: sills 0.75 m over the floor |
| Parapet | 46.94 m | Published: the City's 154 ft |
| Cartouches | 47.74 m | Estimate: 0.8 m over the parapet, from photographs |

The hill in the drawing hides the building below the eighth floor's window, 29.7 m up. The
drawn rows are five floors, the top one under the parapet: with the published twelve
storeys, the eighth to the twelfth. The lower floors are estimates.

## Plan

The mapped outline is 18.1 m (59.5 ft) along Michigan and 49.2 m along its south wall. HABS
gives the front as 58 ft and the 1981 report as 62 ft.

Projected through the geographic camera, the Michigan front spans 1,084 to 1,194 layer
units at its top, where the drawing has 1,104 to 1,218, 20 to 24 units right of the
projection, as the drawing sits right of it along this stretch. The south wall projects
from 753 to 1,084 units. The drawing's wall runs from 876, where the University Club covers
it, to the corner.

Measured as fractions of the drawn front from its south corner:

- the corner piers are about 2 m wide, and the inner ones 1.15 and 1.2 m;
- the south and north bays' windows are 3.6 m wide in four lights, and the middle one's
  4.55 m in five.

Measured on the south wall's plane, west of the front:

- a window 6 to 9.5 m in, on the top four floors;
- three more, 3.5 m wide, between 15.3 and 28.4 m, on the ninth and twelfth floors.

The drawn front's windows hold four, five and four lights, as the 1981 report describes the
original casements. The windows are double-hung now; the model keeps the drawn lights.

## Model

- **Michigan front:** terracotta.
  - The ground floor's shopfronts under a sign band.
  - Three bays of windows on each of floors 2 to 12, in four, five and four lights, between
    the piers.
  - The parapet, with the cartouches over the inner piers standing 0.8 m above it.
- **South wall:** common brick, with the drawn windows only. 24 and 30 South Michigan,
  which cover its lower floors, are not modelled.
- **Alley:** brick, windows 1.6 m wide about 3.2 m apart on every floor above the ground
  floor. The drawing does not show this wall, so they are an estimate.
- **North wall:** shared with the Chicago Athletic Association, plain.

Colours follow the drawing's greys, not the terracotta's cream.

Omitted:

- Sullivan's ornament on the piers and spandrels, and the cartouches' foliage;
- the entrances;
- 24 and 30 South Michigan and the Chicago Athletic Association.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the parapet at 154 ft and the cartouches over both inner piers;
  - four, five and four lights to a floor in the front's three bays, the piers, a mullion,
    a spandrel, a shopfront, the sign band and the parapet;
  - the top floor's window between its drawn sill and head, and the eighth floor's sill;
  - a window to each of the twelve floors up a bay;
  - the south wall's window near the front on the top four floors, and three more on the
    ninth and twelfth, with plain brick between;
  - the alley's windows and the plain north wall;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
