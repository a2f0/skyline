# Two Prudential: geographic facade reconstruction

The geographic Two Prudential Plaza model uses the same east/north meter
coordinates as the rest of the comparison. The original illustration model is
unchanged. This is a mapped-massing study with facade detail, not an as-built
survey or a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 64388666](https://www.openstreetmap.org/way/64388666):
  local coordinate snapshot and attribution remain in
  `skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489):
  published architectural height 303.3 m (995 ft), 64 floors.
- The repository's own fitted model, `models/two-prudential-plaza.ts`, which
  records the drawing's vocabulary: the three pointed tiers with paired
  north/south setbacks, piers, glazed chevrons, silver crown bands, louvers,
  ridge beams, and the tapered spire. The geographic model reuses that
  vocabulary at meter scale on the mapped outline. See its
  [reference audit](two-prudential-reference.md) for the photographic sources.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Lower setback shoulder | 156 m | Proportion from the fitted model (0.817 of 196) |
| Middle setback shoulder | 196 m | Proportion from the fitted model (0.817 of 240) |
| Eave | 240 m | OSM crown eave |
| Pyramid peak | 277 m | OSM crown peak |
| Architectural tip | 303.3 m | Published CTBUH value |

The 64 rows use a 3.75 m pitch (240/64), so the pane count reads as the
published 64 floors.

## Plan and detail choices

- The mapped outline (approximately 41 × 56 m) is retained exactly in
  projected coordinates; it is the shaft, rising to the mapped 240 m eave.
  Ground placement has no illustration-derived rotation or scale.
- The shaft facade carries the fitted model's grid at meter scale: one
  recessed pane per bay per row between projecting piers, a spandrel band at
  each floor line below the eave, and a base course at grade. Bays are about
  3.4 m; a deterministic hash scatters muted lit panes through the dark
  glass. These are estimates.
- The paired south/north pointed tiers are shallow closed gabled projections
  inside the mapped outline: the middle tier stands 0.6 m proud of the south
  wall and the lower 1.2 m, mirroring the fitted model's setback order. The
  mapped outline has no setback subdivisions, so the tier widths and shoulder
  heights follow the fitted model's proportions. Their bases sit just above
  grade, each at its own height so no two bottom faces share a plane.
- The crown keeps the mapped pyramid: four dark facets from the eave to the
  277 m peak, each carrying the fitted model's silver band and louver strips,
  with the bright tapered spire — inset panels over two jointed sections —
  rising from a foot seated in the pyramid to the published 303.3 m tip.
- The tiers, bands, louvers, and spire panels are closed solids; the
  geographic suite pairs every directed edge, so no face is omitted.
- The plaza, lobby canopy, and roof equipment are omitted. Colors follow the
  original artwork's neutral gray palette rather than photographic colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the pyramid peak at the outline's vertex mean, a facet between the
peak and the eave, a spire face beside the tip (the exact tip is pinned by
the rendered-height check), the lower tier's front as the first surface on
the mapped south wall, panes and piers on the east wall, and the exact mapped
outline at grade. Ground extents use vertices at grade: facade relief and the
tier bases above grade must not redefine the street footprint. Visual review
includes the ground plan, height comparison, and elevated orthographic views.
