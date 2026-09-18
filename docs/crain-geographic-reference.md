# Crain: geographic facade reconstruction

The geographic Crain Communications Building model uses the same east/north
meter coordinates as the rest of the comparison. The original illustration
model is unchanged. This is a mapped-massing study with facade detail, not an
as-built survey or a construction model.

## References checked September 18, 2026

- [OpenStreetMap ground outline 210671717](https://www.openstreetmap.org/way/210671717)
  and parts 284816227, 284816228 and 284816229: local coordinate snapshot and
  attribution remain in `skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441):
  published architectural height 177.4 m.
- The repository's own fitted model, `models/crain-communications.ts`, which
  records the drawing's vocabulary: window cells clipped to the diagonal roof,
  a light roof grid and rim, and a dark central split. The geographic model
  reuses that vocabulary at meter scale on the mapped outlines.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Flat cap (part 284816227) | 152.5 m | OSM part top |
| Main roof (part 284816228) | 172.4 m falling 75 m | OSM part top and roof:height |
| North roof (part 284816229) | 177.4 m falling 73 m | OSM part top and roof:height |
| Architectural tip | 177.4 m | Published CTBUH value |

Both sloped roofs follow OSM's 133° downhill bearing. The window rows use a
4.33 m pitch (177.4/41), so the pane count reads as the published 41 floors;
every row is clipped to its part's sloping roof.

## Plan and detail choices

- The three mapped part outlines are retained exactly in projected
  coordinates; the parts partition the ground outline, and their shared edges
  keep coincident opposite-facing walls. Ground placement has no
  illustration-derived rotation or scale.
- Every exterior wall carries the fitted model's window cells at meter scale:
  one recessed pane per bay per row between pale mullions, all clipped to the
  local roof height. Bays are about 3.0 m; a deterministic hash scatters
  muted lit cells through the dark glass. These are estimates; the 1984
  curtain wall's module was not surveyed.
- A light rim follows each part's exterior roof edges, following the slope.
  The dark seam along the mapped diagonal between the two sloped parts stands
  in for the fitted model's central split: part 228's roof stands about 5 m
  above part 229's along that edge, so the seam follows the higher facet and
  drops 8 m to bury its foot in the lower one, closing the step between the
  two mapped roof surfaces. The rims and seam are hand-built closed boxes,
  because a kit box cannot follow a sloping roof line.
- Part edges shared with a neighbour get no facade strips: the neighbour's
  wall closes them, and two proud strips in the same plane would
  interpenetrate.
- The plaza, entrance canopy, roof equipment, and signage are omitted. Colors
  follow the original artwork's neutral gray palette rather than photographic
  colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the flat 152.5 m cap, the 172.4/75 and 177.4/73 sloped roofs at
independent interior samples against the mapped warp formula, the dark seam
along the mapped diagonal, panes and mullions as the first surface on the
mapped south wall, and every mapped footprint corner at grade. Ground extents
use vertices at grade: facade relief above grade must not redefine the street
footprint. Visual review includes the ground plan, height comparison, and
elevated orthographic views.
