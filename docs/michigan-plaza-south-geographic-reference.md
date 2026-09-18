# Michigan Plaza South: geographic facade reconstruction

The geographic Michigan Plaza South model uses the same east/north meter
coordinates as the rest of the comparison. The original illustration model is
unchanged. This is a mapped-massing study with facade detail, not an as-built
survey or a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 127107024](https://www.openstreetmap.org/way/127107024):
  local coordinate snapshot and attribution remain in
  `skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/michigan-plaza-south/2825):
  published architectural height 168.6 m (553 ft).
- [Wikipedia, Michigan Plaza](https://en.wikipedia.org/wiki/Michigan_Plaza):
  the two-tower complex at 205 and 225 North Michigan Avenue, designed by
  Fujikawa Johnson & Associates with Mies van der Rohe's works as inspiration;
  the south tower is the 44-story building modeled here. (The model covers only
  the south tower's mapped outline; the 25-story north tower is not part of the
  study.)
- The repository's own fitted model, `models/michigan-plaza-south.ts`, which
  records the drawing's dark curtain-wall grid: a dense array of recessed panes
  in dark surrounds, 24 and 23 columns on the two drawn faces. The geographic
  model reuses the pane vocabulary at meter scale.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Base course | 0.3–0.75 m | Visual estimate, Miesian base |
| Shaft top | 167.8 m | Below the roof parapet |
| Roof | 168.6 m | Published CTBUH architectural height |

The 44 rows use a 3.81 m pitch (167.8/44), so the pane count reads as the
published 44 stories. The parapet is 0.8 m tall at the published top; roof
equipment is omitted.

## Plan and detail choices

- The entire ground outline is retained exactly in projected coordinates
  (approximately 65 × 43 m, with the mapped notch on the north arm). It is the
  tower footprint: the outline itself rises to the roof, and the notch's
  concave corners are kept. Ground placement has no illustration-derived
  rotation or scale.
- Every face carries the fitted model's grid at meter scale: one recessed pane
  per bay per row, full-height pale mullions at the bay lines, and a pale base
  course at grade. Bays are about 3.1 m; a deterministic hash scatters muted
  lit panes through the dark glass. These are estimates; the 1985 curtain
  wall's exact module was not surveyed.
- The roof parapet wraps the mapped outline at 168.6 m. Because the notch has
  concave corners, which a closed band cannot turn, the parapet is per-segment
  boxes that stop short of every corner. The interior roof sits 0.8 m below
  the parapet.
- The 25-story north tower, the shared plaza, roof equipment, signage, and
  individual storefronts are omitted. Colors follow the original artwork's
  neutral gray palette rather than photographic colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the interior roof under the parapet, the parapet itself at 168.6 m,
panes and mullions as the first surface on the mapped south wall, and the
exact grade vertex set. Ground extents use vertices at grade: facade relief
and the base course above grade must not redefine the street footprint.
Visual review includes the ground plan, height comparison, and elevated
orthographic views.
