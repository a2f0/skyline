# Two Prudential: geographic facade reconstruction

The geographic Two Prudential Plaza model uses the same east/north meter
coordinates as the rest of the comparison. The original illustration model is
unchanged. This is a mapped-massing study with facade detail, not an as-built
survey or a construction model.

## References checked September 18, 2026; facade rebuilt September 26, 2026

- [OpenStreetMap ground outline 64388666](https://www.openstreetmap.org/way/64388666):
  local coordinate snapshot and attribution remain in
  `skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489):
  published architectural height 303.3 m (995 ft), 64 floors.
- The source photograph, cropped with
  `bun scripts/measure-group.ts building-two-prudential-plaza`. It is taken from
  the south-east, so it shows the south facade on the left and the east facade
  on the right. It establishes that the setback gables sit on the **south**
  facade rather than on the wide east one, that the pier heads step floor by
  floor into each gable rather than running to a clean diagonal, and that the
  crown is a stack of flat setbacks with a lit fascia at each step, not a
  smooth cone. The matching north setbacks are mirrored from the south ones and
  remain an inference, as the fitted model's
  [reference audit](two-prudential-reference.md) already records.
- The repository's own fitted model, `models/two-prudential-plaza.ts`, which
  records the drawing's vocabulary: the pointed tiers with paired north/south
  setbacks, piers, glazed chevrons, silver crown bands, louvers, and the
  tapered spire. Its proportions set this model's levels and widths. See its
  [reference audit](two-prudential-reference.md) for the photographic sources.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Lower setback shoulder | 155.73 m | The fitted lower eave, 0.6489 of the fitted main eave |
| Lower setback peak | 180.63 m | The fitted lower peak, 0.7526 of the fitted main eave |
| Middle setback shoulder | 196.09 m | The fitted middle eave, 0.8170 of the fitted main eave |
| Middle setback peak | 224.79 m | The fitted middle peak, 0.9366 of the fitted main eave |
| Eave | 240 m | OSM crown eave |
| Chevron over the north and south facades | 260.48 m | 0.5535 of the fitted model's own eave-to-pyramid rise |
| Chevron over the east and west facades | 259.44 m | 0.5253 of the same rise |
| Pyramid peak | 277 m | OSM crown peak |
| Architectural tip | 303.3 m | Published CTBUH value |

Every level below the eave is a fitted-model level multiplied by 240/250.916,
the ratio of the mapped eave to the fitted model's own, stored rounded to the
centimetre. The fitted model's own levels come from the drawing, so the
centimetre is a bookkeeping precision, not a measured one. The 64 rows use a 3.75 m pitch (240/64), so the pane count
reads as the published 64 floors.

## Plan and detail choices

- The mapped outline (approximately 42 × 56 m) is retained exactly in
  projected coordinates; it is the shaft, rising to the mapped 240 m eave.
  Ground placement has no illustration-derived rotation or scale. Its long
  axis runs north-south, so the narrow north and south walls are the ones the
  drawing and the photograph show the setback gables on, and the long east and
  west walls carry a single chevron at the eave.
- The shaft facade carries the fitted model's grid at meter scale: one punched
  pane per bay per row between projecting piers, with limestone left visible
  around every opening, so the tower reads as the drawing's light stone field
  with dark glass rather than as a glass box. Bays are about 3.5 m; a
  deterministic hash scatters muted lit panes through the dark glass. These are
  estimates.
- The paired north and south setback tiers are closed gabled volumes standing
  on the mapped wall, the lower one occupying the depth in front of the middle
  one. Where the two meet they share a plane but face opposite ways, which is a
  joint rather than a z-fight. Each carries its own piers and panes, and its pier
  heads stop on a floor line, which is the sawtooth edge the drawing and the
  photographs show in place of a clean diagonal. A thin coping follows both
  slopes of every gable; without it a gable reads as a line drawn on the
  glazing rather than the edge of a volume.
- A pointed arrow rises from each gable to the one above, and a third reaches
  from the middle gable over the eave to the chevron. Their panes are closed
  solids clipped to both the arrow's sloping head and the gable each stands on,
  and their bays split at the arrow's own centre where both of those turn, so
  no triangular wedge is left unglazed under either and no pane crosses into
  the tier below.
- **The tiers project less than the fitted model's proportions.** The fitted
  tiers stand 10.12 m and 4.23 m proud of its own south wall. Its whole built
  north-to-south depth is 59.10 m — its 38.86 m tower plus both projecting
  prows, 29.548 m either side of the tower's centre, and not to be confused
  with its 59.01 m facade width — so scaling by the mapped 56.39 m depth over
  that 59.10 m gives 9.65 m and 4.03 m, which above grade would claim 34% more
  ground than OpenStreetMap records.
  They are compressed to 4.0 m and 2.2 m, with the arrow another 0.9 m, which
  keeps the drawing's stepped section and its shadows while holding the
  above-grade envelope within about 16% of the mapped outline. Their feet sit
  just above grade, so the street-level outline stays exactly the mapped ring.
- The chevrons over the eave cover the middle bays rather than the whole
  facade. The drawing's chevrons rise 1.2 to 1.75 times their own half-width;
  a full-width chevron on the mapped facade would flatten into a tent, and its
  soffit would cross the next facade's at the same elevation.
- The crown is ten setbacks from the mapped eave to the mapped peak, each a
  closed ring scaled about the outline's area centroid, with a silver fascia
  and a recessed louvered opening. The centroid, not the mean of the traced
  vertices: this outline carries three extra points down its west wall, and
  averaging them would put the crown's axis 4.9 m west and 2.7 m south of the
  building, drifting it diagonally as it rises and standing the spire off the
  facade arrows it caps. A smooth cone with painted rings loses the
  stepped silhouette the photographs show. The bright tapered spire — inset
  panels over two jointed sections — rises from a foot seated in the topmost
  setbacks to the published 303.3 m tip.
- The tiers, arrows, copings, chevrons, crown rings, and spire panels are all
  closed solids; the geographic suite pairs every directed edge, so no face is
  omitted. Panes and piers are not drawn where a projecting volume covers them.
- The plaza, lobby canopy, and roof equipment are omitted. Colors follow the
  original artwork's neutral gray palette rather than photographic colors.

All runtime geometry is local JavaScript. Reference pages are research inputs
only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. The geographic suite also raycasts the
model: the peak over the outline's area centroid, a ray at the traced-vertex
mean landing below that peak, a crown setback between the peak and the eave,
two rays at different radii that land on one crown ledge where a smooth cone
would return two heights, a spire face beside the tip (the
exact tip is pinned by the rendered-height check), a section across the mapped
south wall that pins the arrow, both tiers and the wall at their own
projections and again above each tier's peak, the four merged facade widths,
the east and west arrows at the same projection on their own centres, a
downward ray onto each tier's ridge and shoulder and onto both chevrons, so
the levels themselves are pinned rather than bracketed, a vertex sweep from
the middle tier's own face inward proving no pane or pier sits inside the
lower tier, the chevron over the
eave, open sky at the mapped corner above it, panes and piers on the mapped
east wall, and the ten crown setbacks found by sweeping the setback mesh outward, both
chevrons sampled down their slopes away from the arrow that shares their peak,
and the exact mapped outline at grade. Ground extents use vertices at grade: facade
relief and the tier bases above grade must not redefine the street footprint.
Visual review includes the ground plan, height comparison, and elevated
orthographic views.
