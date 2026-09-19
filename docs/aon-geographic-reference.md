# Aon: geographic facade reconstruction

The geographic Aon Center model uses the same east/north meter coordinates as
the rest of the comparison. The original illustration model is unchanged.
This is a mapped-massing study with facade detail, not an as-built survey or
a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 64388609](https://www.openstreetmap.org/way/64388609)
  and rooftop part 284775635: local coordinate snapshot and attribution
  remain in `skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/aon-center/339):
  published architectural height 346.3 m and antenna tip 362.5 m.
- The repository's own fitted model, `models/aon-center.ts`, which records
  the drawing's white granite outer tube: dark vertical window slots between
  piers, broad near-corner stone strips, a raised parapet, and louvered
  rooftop enclosures. The geographic model reuses that vocabulary at meter
  scale. See its [reference audit](aon-center-reference.md) for the drawing
  measurements and photographic sources.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Shaft top | 340 m | OSM shaft part 64388609 |
| Rooftop enclosure top | 346.3 m | OSM part 284775635 |
| Antenna tip | 362.5 m | Published CTBUH tip |

The 83 rows use a 4.10 m pitch (340/83), so the pane count reads as the
published 83 floors.

## Plan and detail choices

- The mapped outline (approximately 59 × 60 m, with the distinctive notched
  corners) is retained exactly in projected coordinates; it is the shaft,
  rising to the mapped 340 m top. Ground placement has no
  illustration-derived rotation or scale.
- Every face carries the fitted model's granite tube at meter scale: one dark
  window slot per bay per row between projecting piers, a spandrel band at
  each floor line below the roof, wide corner piers, and a base course at
  grade. Bays are about 3.4 m; a deterministic hash scatters muted lit panes
  through the dark glass. These are estimates; the 1973 tube's column rhythm
  was not surveyed.
- The roof parapet wraps the mapped outline below the enclosure; the
  outline's notched corners can turn concave, so the parapet is per-segment
  boxes that stop short of every corner.
- The rooftop enclosure keeps its mapped outline from 340 m to 346.3 m, with
  louvers on its exterior faces. The inferred antenna is a 0.7 m mast at the
  enclosure's center rising to the published 362.5 m tip; the map gives no
  antenna geometry.
- The plaza, lobby canopy, and roof equipment are omitted. Colors follow the
  original artwork's neutral gray palette rather than photographic colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the interior roof under the parapet, the rooftop enclosure at its
mapped 346.3 m top, the inferred antenna at the 362.5 m tip, panes and piers
as the first surface on the mapped south wall, and the exact mapped outline
at grade. Ground extents use vertices at grade: facade relief and the corner
piers above grade must not redefine the street footprint. Visual review
includes the ground plan, height comparison, and elevated orthographic views.
