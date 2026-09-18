# Kemper: geographic facade reconstruction

The geographic Kemper Building model uses the same east/north meter coordinates
as the rest of the comparison. The original illustration model is unchanged.
This is a mapped-massing study with facade detail, not an as-built survey or a
construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 64389514](https://www.openstreetmap.org/way/64389514)
  and its parts 685494066 and 685494067: local coordinate snapshot and
  attribution remain in `skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Wikipedia, Kemper Building (Chicago)](https://en.wikipedia.org/wiki/Kemper_Building_(Chicago)):
  completed 1962, 41 floors, 522 ft (159 m) roof, marble-clad Modernism by
  Shaw, Metz and Associates. This matches OSM's 159 m height tag, which the
  comparison uses.
- The repository's own fitted model, `models/kemper.ts`, which records the
  drawing's facade vocabulary: window bays, raised mullions, a recessed dark
  crown band, light crown slots, and a projecting roof cap. The geographic
  model reuses that vocabulary at meter scale.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Podium top | 7.8 m | OSM part 685494067, two floors at the tower's average floor height |
| Crown band base | 151.25 m | Top of the 40th floor at the 41-floor pitch |
| Shaft top | 158.5 m | Below the projecting cap |
| Roof | 159 m | OSM height tag on way 64389514 |

The tower pitch is (159 − 7.8) / 39 ≈ 3.88 m, so the podium's two floors and
the 39 tower floors read as the published 41 floors. The crown band spans the
40th and 41st floors with the cap above them.

## Plan and detail choices

- The entire ground outline and the tower part are retained exactly in
  projected coordinates (approximately 54 × 42 m). The podium prism rises on
  the full ground outline, the tower part rises from its top, so no coincident
  exterior walls overlap over their full height. Ground placement has no
  illustration-derived rotation or scale.
- The tower facade carries the fitted model's vocabulary at meter scale:
  one recessed pane per bay per row between full-height raised mullions, a
  spandrel band at each floor line, and a marble string course above the
  podium. Bays are about 3.1 m; a deterministic hash scatters muted lit panes
  through the dark glazing. These are estimates; the 1962 building's bay
  rhythm was not surveyed.
- The crown is a dark glazing band behind light vertical fins over the top two
  floors, capped by a projecting closed parapet at the 159 m roof. The mapped
  tower outline carries sub-meter tracing jogs on its north and west edges:
  the prisms keep them exactly, but the cap ring drops vertices within 1.2 m
  of the chord between their neighbours, because a closed band cannot turn
  their concave corners.
- The podium has storefront glazing at grade with its mullions, a spandrel
  head, the second floor's windows, and a projecting cap. Cap pieces under the
  tower are skipped so the cap does not run through the tower's walls.
- The drawing's broad blank panel on its left face is not carried over; the
  real facade is a regular grid. Roof equipment, signage, and individual
  storefronts are omitted. All facade spacing, parapet sizes, and crown
  detail are visual estimates; no claim of survey precision is made for them.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the wing's 7.8 m podium roof, the tower's interior roof under the
projecting cap, the cap itself at 159 m, panes and mullions as the first
surface on the mapped west wall, and the crown fins standing proud near the
roof. Ground extents use vertices at grade: facade relief and the podium cap
above grade must not redefine the street footprint. Visual review includes
the ground plan, height comparison, and elevated orthographic views.
