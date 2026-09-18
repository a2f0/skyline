# One Prudential: geographic facade reconstruction

The geographic One Prudential Plaza model uses the same east/north meter
coordinates as the rest of the comparison. The original illustration model is
unchanged. This is a mapped-massing study with facade detail, not an as-built
survey or a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 127107034](https://www.openstreetmap.org/way/127107034)
  and parts 685493609, 685493610, 685493612 and 685493614: local coordinate
  snapshot and attribution remain in `skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/one-prudential-plaza/2190):
  published architectural height 183.2 m and antenna tip 278 m.
- [Wikipedia, One Prudential Plaza](https://en.wikipedia.org/wiki/One_Prudential_Plaza):
  completed 1955, 41 floors, roof 601 ft (183 m), antenna spire 912 ft
  (278 m), designed by Naess & Murphy; the first downtown skyscraper built in
  Chicago since the 1930s.
- The repository's own fitted model, `models/one-prudential-plaza.ts`, which
  records the drawing's punch-card facade: thirty south bays and nine east
  bays of recessed panes between projecting piers, the ribbed podium wing, a
  penthouse inset from the west end with a louvered screen, and the antenna
  mast. The geographic model reuses that vocabulary at meter scale.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| West wing top | 13.4 m | OSM part 685493612, three floors at 183.2/41 |
| East wing top | 44.7 m | OSM part 685493610, ten floors at 183.2/41 |
| Main roof | 181.2 m | Below the mapped tower top |
| Penthouse top | 183.2 m | OSM tower part 685493609 |
| Antenna tip | 278 m | Published CTBUH tip; OSM part 685493614 |

The 41 rows use a 4.42 m pitch (181.2/41), so the pane count reads as the
published 41 floors. The mapped 278 m mast is part 685493614, an 18-vertex
outline rising from the penthouse top; the 183.2 m tower top belongs to the
penthouse, with the main roof 2 m below it.

## Plan and detail choices

- The mapped tower part (685493609, about 73 × 38 m), the 44.7 m east wing
  (685493610), and the 13.4 m west wing (685493612) are retained exactly in
  projected coordinates. The wings' outlines overlap the tower's ends; their
  buried walls face it, and their visible exteriors extend to the lot lines.
  Ground placement has no illustration-derived rotation or scale.
- Every tower face carries the fitted model's punch-card grid at meter scale:
  one recessed pane per bay per row between projecting piers, a spandrel band
  at each floor line, and a base course at grade. The south face gets about
  19 bays of 3.83 m; the other faces follow the same module. Walls facing a
  podium wing start above that wing's roof. A deterministic hash scatters
  muted lit panes through the dark glass. These are estimates; the 1955
  curtain wall's module was not surveyed.
- The podium wings carry the fitted model's ribbed vocabulary: vertical ribs
  on every exterior face, none where the tower covers the wall. Their tops
  stay the OSM part heights.
- The penthouse is a 15 × 10 m block centered under the mapped mast part,
  east of the roof's center, with louvers on its south face. The roof parapet
  wraps the mapped tower outline below the penthouse top; the outline's jogs
  can turn concave corners, so the parapet is per-segment boxes that stop
  short of every corner.
- The penthouse's bottom and the louvers' backs are drawn rather than
  omitted: the geographic suite pairs every directed edge, and each drawn
  face meets its covering surface with an opposite normal.
- The mast keeps the mapped cross-section extruded from 183.2 m to the tip;
  the real mast's taper is not in the map data. The plaza, lobby canopy, and
  roof equipment are omitted. Colors follow the original artwork's neutral
  gray palette rather than photographic colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the interior roof under the parapet, the east wing's 44.7 m roof, the
penthouse at the mapped 183.2 m tower top, the mapped mast at the 278 m tip,
panes and piers as the first surface on the tower's mapped south and east
walls, and every mapped footprint corner at grade. Ground extents use
vertices at grade: facade relief above grade must not redefine the street
footprint. Visual review includes the ground plan, height comparison, and
elevated orthographic views.
