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
- The repository's own fitted model, `src/models/kemper.ts`, which records the
  drawing's facade vocabulary: window bays, raised mullions, a recessed dark
  crown band, light crown slots, and a projecting roof cap. The geographic
  model reuses that vocabulary at meter scale.

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Podium top | 7.8 m | OSM part 685494067, two floors at the tower's average floor height |
| Crown band base | 151.25 m | Bottom of the 40th floor (top of the 39th) at the 41-floor pitch |
| Shaft top | 158.5 m | Below the projecting cap |
| Roof | 159 m | OSM height tag on way 64389514 |

The tower pitch is (159 − 7.8) / 39 ≈ 3.88 m, so the podium's two floors and
the 39 tower floors read as the published 41 floors. The crown band spans the
40th and 41st floors with the cap above them.

## Plan and detail choices

- The entire ground outline and the tower part are retained exactly in
  projected coordinates (approximately 55 × 43 m). The podium prism rises on
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

## 2026-10-09 — Daytime colours from Chicago.jpg (FID-COL-004)

The colour trial's sunny day gains a second group of buildings, measured as the first was
(FID-COL-003, in the [Railway Exchange's audit](railway-exchange-reference.md) and five others), in
the same photograph and with the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-09). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. No change to these materials between 2008 and 2013 is known to
this audit.

Identification: the building's bearing and roof height from the drawing's fitted eye (1471.76 m east
and 1948.8 m south of Crain's mapped centre), fitted to the rendition through the six buildings
measured first, place it at x 1517–1570 with its roof near y 363; the fit holds those six within
about 25 pixels across and 4 pixels in height. It is the white tower at x 1516–1530 whose roof
stands at y 358, a sign at its top. The darker, finely ruled face to its right, x 1530–1550, shares
its roofline, but whether it is this tower's east face in shade or a glass building behind is not
resolved here; it is recorded for comparison only.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-kemper` downloads the
photograph once, checks its SHA-256, and reproduces these rows and the palette's entries, decoding
in Chrome without colour management. The building is about 13 pixels wide in the rendition, so
single pixels mix neighbouring materials, which the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Marble, sunlit | 1517, 362, 1529, 450 | sat 0–0.2, val 0.6–1 | 836 (79.2%) | `195, 192, 182` | 177–220 / 171–208 / 165–196 |
| Glass | 1517, 362, 1529, 450 | val 0–0.4 | 34 (3.2%) | `83, 84, 85` | 64–86 / 68–92 / 71–95 |
| Face, all, for comparison | 1517, 362, 1529, 450 | all | 1,056 (100.0%) | `183, 179, 173` | 158–216 / 154–204 / 147–192 |
| Darker face to the right, for comparison | 1532, 362, 1548, 450 | all | 1,408 (100.0%) | `95, 101, 110` | 82–116 / 90–120 / 98–128 |

Decisions in `src/models/colour-palette.ts`:

- `marble` `195, 192, 182`, the sunlit face's marble, a warm white; the mullions, bands and cap take
  it.
- `glass` `83, 84, 85`, only 3.2% of the box: the windows are narrow beside the marble at this
  scale, so the value is uncertain; `lit window` and `dim window` take it exactly, since no office
  lights show by day.
- `aluminium`, the crown's fins, stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the marble renders
`161, 158, 151` under the photograph's rule, 0.65 of the photograph's brightness in linear light.
The face as a whole renders `67, 71, 74` against the photograph's `183, 179, 173`, 0.14: the model's
dark panes cover far more of each face than the building's windows do, so it reads as a grey glass
tower where the photograph shows a white one. If the darker face to the right is this tower's east
face in shade, the fairer comparison is with its `95, 101, 110`, 0.47. FID-KEM-002 records the gap,
provisionally until that face is identified.
