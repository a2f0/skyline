# Edson Keith and Theodore Ascher Buildings: reference audit

`models/keith-ascher-geographic.ts` builds the Gage Group's two lower buildings, the Edson
Keith Building at 24 South Michigan Avenue and the Theodore Ascher Building at 30 South
Michigan Avenue, for the geographic layout only. The drawing shows the tops of their
Michigan fronts under the Gage Building's south wall, between the University Club and the
Gage. That is outside the excerpt the original layout is fitted to, so the original layout
has no models of them. The geographic camera named the drawn group; see
[the building audit](building-labels.md#names-from-the-geographic-camera). The models are
reconstructions from OpenStreetMap, published history, the drawing and photographs, not a
survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 126982636](https://www.openstreetmap.org/way/126982636), version 8:
  the outline at 24 South Michigan, tagged 12 levels and brown, with no height.
- [OpenStreetMap way 126982639](https://www.openstreetmap.org/way/126982639), version 8:
  the outline at 30 South Michigan, tagged 6 levels and light brown, with no height.
- Both were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. The Keith shares its north wall's nodes with the Gage Building, way
  124865450, and its south wall's with the Ascher. The Ascher shares its south wall's with the
  University Club, way 126982632.
- The [Historic American Buildings Survey's record](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0000/il0056/data/il0056data.pdf),
  HABS IL-1065, 1973:
  - "the Keith, 62' x 101' and is still 101' high; and the narrower Ascher Building measures
    44' x 101' and was originally 92' high. Stories added have made the Gage twelve and the
    Ascher seven. The Keith remains at seven stories."
  - a seventh floor for the Ascher, permitted in 1970 and completed in 1972, "faced in red
    brick to match the original six floors";
  - "The Ascher Building is two bays wide, the Keith, three. Above the first floor both
    buildings employ the 'Chicago window'", a large fixed pane flanked by smaller windows with
    movable sash;
  - their galvanized-iron cornices, which projected 3 ft, "have been removed".
- The Commission on Chicago Landmarks'
  [report on the Historic Michigan Boulevard District](https://archive.org/stream/CityOfChicagoLandmarkDesignationReports/HistoricMichiganBoulevardDistrict_djvu.txt),
  2002: "Ascher (30 S.) Edson Keith (24 S.)", with "red brick facades" by Holabird & Roche; the
  story added to the Ascher in 1971 made it "the same height as the Keith Building".
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Gage Group, 100 ft and 154 ft. The Gage is the group's tallest.
- [Wikimedia Commons, *Gage Group Buildings*](https://commons.wikimedia.org/wiki/File:Gage_Group_Buildings.jpg):
  the two red fronts beside the Gage, each bay a wide window between narrow ones, six rows of
  them over the shopfronts, under a thin coping.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the buildings, about
  9 of the drawing's layer units are one metre of height. The photograph shows the lit tops of
  both fronts over the trees, under the Gage's dark south wall.

## Heights

Where published heights disagree, the layout takes the one nearest the drawing's reading.
Read through the geographic camera, the drawn Keith stands at 35.7 m and the drawn Ascher at
35.5 m.

| Building | Published | Model |
| --- | --- | ---: |
| Edson Keith | HABS: 101 ft. The City: 100 ft | 30.78 m, HABS's |
| Theodore Ascher | HABS: 92 ft with six storeys. The 2002 report: the Keith's height since its seventh. The City: 100 ft | 30.78 m, the Keith's |

The City's 100 ft is the Gage Group's lower figure, which it gives for both buildings. The
2002 report makes the Ascher the Keith's height, so the HABS record's 101 ft for the Keith
applies to both, and it is the published figure nearer each drawn parapet. Neither source
says what its figure measures to, so both models take it as the parapet's top. Each
building's heights read on the drawing are scaled so that its drawn parapet meets it: by
30.78/35.69 for the Keith and 30.78/35.48 for the Ascher. The drawing reads the Gage's
154 ft high by nearly the same ratio; see the [Gage Building audit](gage-reference.md#heights).

| Feature | Both | Basis |
| --- | ---: | --- |
| Ground floor | 0–5.5 m | Estimate: shopfronts to 4.3 m under a sign band |
| Floors 2–7 | 3.94 m | Estimate: from the second floor to the drawn seventh |
| Seventh floor's window | 26–28.6 m | Drawing, its sill 80 cm over the floor |
| Parapet | 30.78 m | Published: the Keith's 101 ft |

The hill in the drawing hides both buildings below the seventh floor's window. The windows of
the floors below it take the same height and sill, an estimate.

## Plan

The Keith's mapped outline is 19.2 m along Michigan, and the Ascher's 13.6 m; HABS gives
62 ft and 44 ft. Both run 49 m back to the alley.

Projected through the geographic camera, the Keith's Michigan front spans 962 to 1,083 layer
units, and the Ascher's 877 to 962. The drawing's two blocks run from 996 to 1,112 and from
916 to 996: 29 to 39 units right of the projection, as the drawing sits right of it along
this stretch.

Measured as fractions of the drawn fronts from their south corners, the drawn windows stand:

- on the Keith, 1.67 to 5.36 m, 7.24 to 12.09 m and 13.44 to 17.34 m, one to each bay;
- on the Ascher, 7.9 to 11.75 m, in its north bay. The drawing leaves its south bay's
  window out; the model mirrors the north one, 1.85 to 5.7 m.

## Model

- **Michigan fronts:** brick.
  - The ground floor's shopfronts under a sign band.
  - A Chicago window in each bay on floors 2 to 7: a fixed pane between sashes 80 cm wide,
    split by 12 cm mullions painted in the window's plane.
  - A plain parapet.
- **Alleys:** brick, windows 1.6 m wide about 3.2 m apart on every floor above the ground
  floor. The drawing does not show them, so they are an estimate.
- **Party walls:** shared with the Gage, each other and the University Club, plain.

Colours follow the drawing's greys, not the red brick.

Omitted:

- the coping and the ground floors' ornament;
- the entrances.

## Verification

`bun run check` covers them:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions, for each building.
- `tests/skyline-geography.test.ts` raycasts, for each building:
  - the parapet at its published height, and the record's one part;
  - the seventh floor's window between its drawn sill and head, scaled;
  - three lights to each bay's Chicago window, a mullion, a sash and a pier;
  - a window to each of the seven floors up a bay, the sign band and the parapet;
  - the alley's windows and the plain party walls;
  - the shared palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
