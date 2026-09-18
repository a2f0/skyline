# Trump: geographic facade reconstruction

The geographic Trump International Hotel and Tower model uses the same east/north
meter coordinates as the rest of the comparison. The original illustration model
is unchanged. This is a mapped-massing study with facade detail, not an as-built
survey or a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 64594680](https://www.openstreetmap.org/way/64594680)
  and its nested parts 188338549, 188338550, 188338548, 188338859, 188356529,
  284773992 and 284773991: local coordinate snapshot and attribution remain in
  `skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/trump-international-hotel-tower/203):
  published architectural height 423.2 m (1,389 ft), 98 floors, and a curtain
  wall of glass panels in aluminum frames.
- [Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/trump-tower):
  the design's rounded edges, colored glass, tapering setbacks, riverfront site,
  and Skidmore, Owings & Merrill authorship.
- The repository's own [illustration-fit audit](trump-international-tower-reference.md):
  drawing measurements, the fitted model's glazing vocabulary, and its grayscale
  night palette, which the geographic model reuses at meter scale.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Podium top | 60 m | OSM part 64594680 |
| Base tier | 120 m | OSM part 188338549 |
| Lower tier | 200 m | OSM part 188338550 |
| Shaft top | 345 m | OSM part 188338548 |
| Crown top | 357 m | OSM part 188338859 |
| Spire joints | 380 m, 400 m | OSM parts 188356529, 284773992 |
| Architectural tip | 423.2 m | Published CTBUH value |

Nested tiers start at the previous tier's top, so no coincident exterior walls
overlap over their full height.

## Plan and detail choices

- The entire ground outline is retained exactly in projected coordinates
  (approximately 77 × 96 m). The three tower tiers and the crown block are the
  mapped part polygons, unmodified: the west wall leaves the Wabash lot line at
  120 m, the east wall steps 15 m west at 200 m, the crown sets back again at
  345 m, and the riverfront corner stays a 60 m podium. Ground placement has no
  illustration-derived rotation or scale.
- Every tier face carries the fitted model's curtain-wall vocabulary at meter
  scale: one recessed pane per bay per row, full-height raised mullions at the
  bay lines, and a spandrel band at each row. Row pitches are estimates per
  tier (3.75 m, 3.64 m and 3.45 m), chosen so the roughly 96 window rows plus
  the two-level crown read close to the published 98 floors. Bays are about
  3.0 m, or 2.6 m on the faces looking out at the river. A deterministic hash
  scatters muted occupied panes through the charcoal glass.
- The podium gets a dark storefront band at grade with its head and garage
  floor bands up to a projecting cap. Where each tier's roof is not covered by
  the next tier it stays a terrace finished with a parapet; pieces under an
  upper tier are skipped so the parapet never runs through its walls.
- The crown block is a dark enclosure with light vertical ribs about every
  1.05 m, three horizontal seams, and a projecting cap. Three tapered mast
  sections use the mapped ring of each OSM spire part as their lower ring and
  taper to the next part's ring, so both mapped joints at 380 m and 400 m are
  real geometry. Only the final section's ~0.7 m tip is inferred, because no
  mapped ring exists above 400 m.
- The real building's curved south facade is carried by the mapped faceted and
  diagonal outlines and is not exaggerated; its rounded corners are simplified
  to the mapped corners. No curve radius or corner round was available as a
  surveyed basis. Colors follow the original artwork's neutral gray palette
  rather than photographic colors.
- The signage, individual storefronts, riverwalk planting and roof furnishings
  are omitted. All facade spacing, parapet sizes, and crown and spire detail
  are visual estimates; no claim of survey precision is made for them.

All runtime geometry is local JavaScript. Reference pages and imagery are
research inputs only and are not downloaded by the viewer or redistributed with
the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the model:
each tier roof at its mapped part height, the spire joints and tip, the mast
seated on the crown roof, the east and west setback walls at their mapped
positions, and glazed detail as the first surface on the south face. Ground
extents use vertices at grade: facade relief and parapets above grade must not
redefine the street footprint. Visual review includes the ground plan, height
comparison, and elevated orthographic views.
