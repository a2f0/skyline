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
- The repository's own fitted model, `src/models/michigan-plaza-south.ts`, which
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

## 2026-10-10 — Daytime colours from an uncalibrated close-up (FID-COL-007)

Source: Alanscottwalker, [*205 N Michigan*](https://commons.wikimedia.org/wiki/File:205_N_Michigan.JPG),
22 December 2014; accessed 10 October 2026. The tall tower at the Lake/Michigan corner is the
modelled south tower, with the shorter north tower at left. The sky is visibly daylight; the
EXIF clock says 23:27 with unknown timezone/accuracy. The inspected
[960 × 1280 rendition](https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/205_N_Michigan.JPG/960px-205_N_Michigan.JPG)
has SHA-256 `5210415ed386fb01fdf97e62c20fdec0bcbeb6ca3677fb0ca52c981a7a2f38b5`.

The box is on the tall tower's broad west face, above the traffic lights and below its upper
shaft. Dark pixels select the frame/spandrels, while blue pixels select sky-facing panes and
exclude warm office lights and reflected neighbouring masonry. Boxes are half-open in this
rendition, medians and quartiles in sRGB. Reproduce with
`bun scripts/sample-colours.ts day building-michigan-plaza-south-tower`.

| Sample | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Dark frame and spandrels | 460, 620, 570, 780 | val 0–0.3 | 3,389 (19.3%) | `29, 39, 54` | 18–42 / 29–51 / 40–65 |
| Sky-facing glass | 460, 620, 570, 780 | hue 180–250, sat 0.15–1, val 0.35–0.9 | 9,635 (54.7%) | `99, 133, 162` | 77–112 / 91–152 / 104–184 |

Decision: `aluminium` `29, 39, 54`; `glass` `99, 133, 162`. Lit/dim window classes share the
same daytime glass colour. The mapped shell behind the separate panes is classified as metal,
so the dark spandrels and mullions stay matte instead of reflecting like glass. No geometry,
nighttime tone, pane spacing, footprint, or draw order changes.

**Provisional:** the photograph measures apparent colour in a different sky from Chicago.jpg,
without a common matte reference. Its glass is a reflection, not intrinsic blue pigment, and
some dark pixels may be shaded interiors. The broad glass quartiles quantify that variation.
The [building manager's current gallery](https://michiganplaza.com/gallery/) (Transwestern;
photographer/date unspecified, accessed 10 October 2026), particularly its courtyard photographs,
also shows dark framing and blue sky reflections. Those later photographs corroborate the material
separation but do not calibrate these numbers or alter the model's 2013-era geometry. Neither
reference becomes a runtime dependency.

Acceptance: the material tests require a palette for all 34 models, find these values, keep the
frame outside the reflection mask and restore exact grey colours/shaders. The comparison script
captures this tower from its standalone front and the elevated skyline. FID-COL-002 remains open
for matched sunny-light calibration; FID-COL-007 closes only the entirely uncoloured-building gap.
