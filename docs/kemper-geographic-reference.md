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

## 2026-10-11 — Marble piers and opaque panels (FID-KEM-002)

The first grayscale/colour skill pass assessed Kemper's facade coverage. It
replaces the earlier narrow-pier estimate with observed proportions; the
original drawing-fit model, mapped footprint, floor pitch and crown stay as before.

New inputs, accessed 2026-10-11:

- IvoShandor, [Kemper Building-Chicago.JPG](https://commons.wikimedia.org/wiki/File:Kemper_Building-Chicago.JPG),
  photographed 2012-10-13 from 330 North Wabash. The 1216 × 2400 original,
  `https://upload.wikimedia.org/wikipedia/commons/1/19/Kemper_Building-Chicago.JPG`,
  SHA-256 `2673ea03af87c19054666aa10c3c9f85f8950d802f61650c9f7dae956b27b03d`,
  shows the north elevation before the drawing's 2013 date. At y=600, 700 and
  800, x=275–925, transitions at mean sRGB 130 separate 25–27 px dark columns
  from 53–55 px repeats (about 48%). At x=408 and 516, y=430–835, mean sRGB
  105 separates roughly 38 px glass from 35–38 px lighter panels (about 52%
  glass per floor). Boundaries are uncertain by about 2 px; these are ratios,
  not metre measurements or calibrated colours. The visible north face has
  twelve window columns; the mapped-run bay counts remain a separate task.
- Chris Light, [Kemper P8190415.jpg](https://commons.wikimedia.org/wiki/File:Kemper_P8190415.jpg),
  2011-08-19, 618 × 1413 crop, SHA-256
  `f1c8d94236543e276eadf272d56fffc86c11daa07779c9d558ecc5947c23f849`:
  east/north corner corroborates uninterrupted pale piers and alternating panes/panels.
- MusikAnimal, [Kemper Building, Chicago in May 2016.jpg](https://commons.wikimedia.org/wiki/File:Kemper_Building,_Chicago_in_May_2016.jpg),
  2016-05-22, 3121 × 5642 original, SHA-256
  `1aca90d4d65c06d4c02495af09c1be6c1369521801dfc603ce79c805ab21bfd7`:
  north/west corner corroborates the same rhythm after 2013, not a new facade era.

Decision: ordinary tower openings occupy 48% of a bay and glass 52% of a
floor pitch, with 1 cm edge clearance. Broad raised marble piers replace the
thin mullions and full-width white floor stripes. Closed opaque panel strips
back the windows. Applying the north-face ratios to every face is an inference
supported by the corner views. Their composition and calibrated hue are unknown:
`opaque spandrel` explicitly stays grey in the colour palette, without glass
reflections (FID-KEM-003). Marble and glass keep the existing measured colours;
lighting/exposure is unchanged. This corrects excessive glass area independently
of the still-unresolved panorama face identification (FID-KEM-004).

Validation:

- Raycasts over ordinary floors require 44–52% opening coverage and 47–58%
  glass within those columns, against the photographic ratios. The panel batch
  remains matte with colour enabled. Existing roof, footprint and relief probes
  also pass; building-kit checks find closed meshes and no coplanar overlaps.
- Paired [before](fidelity/kemper-proportions-before.png) and
  [after](fidelity/kemper-proportions-after.png) front views retain the 1600 × 1000
  viewport and reduced motion. Both modes now read as vertical marble piers
  around smaller windows; daylight no longer reads as an almost continuous
  glass wall. This is visual acceptance of the proportions, not a claim that
  the earlier whole-face panorama brightness ratio is now calibrated.
- `bun scripts/render-colours.ts --out /tmp/skyline-fidelity-oct11/pass-one-after building-kemper`
  also captured and inspected the side view, skyline and elevated context;
  the baseline is `pass-one-before` in the same temporary directory. Detail URLs
  are `building-detail.html?building=building-kemper`, front/side presets, toggled
  to daylight; context is `skyline-3d.html?controls=open`, skyline/quarter presets.
  Colour-off restores both grayscale canvases byte for byte. Placement and
  occlusion remain unchanged. Browser console/page errors: none.
- Targeted geography, building-kit, colour-materials and skill-copy checks pass.
  The full shipping check is recorded with the PR.

Remaining: FID-KEM-001 retains the uncertain bay counts, crown and row rhythm;
FID-KEM-003 needs same-face calibration of the opaque panels; FID-KEM-004 needs
the panorama's dark neighbouring face identified before reusing its brightness
comparison. The photographs were inspected from temporary storage, not added
as runtime assets.

## 2026-10-11 — Paired render evidence

Dogfooding the revised skill on the model from `02dacf9` inspected front/side
grayscale/daylight pairs plus skyline and elevated context. The earlier
[front pair](fidelity/kemper-proportions-after.png) already preserves this
unchanged model in both modes; it is reused here instead of adding a duplicate.
This is current-state verification, not another geometry correction. The front and side show continuous
marble piers around the narrower openings in both modes; daylight separates
the warm marble from the dark glazing. Panels remain neutral in these captures.
Reinspection of the dated 2012 photograph above supports the established
coverage correction but supplies no new calibration here.

Command: `bun scripts/render-colours.ts --out /tmp/skyline-fidelity-evidence/pass-two building-kemper building-three-illinois-center`.
The detail URL is `building-detail.html?building=building-kemper`, using front
and side presets; context uses `skyline-3d.html?controls=open`, skyline and
quarter presets. All pairs use 1600 × 1000 and reduced motion, with colour
toggled on the same page. Colour changes each canvas and colour-off restores
it byte for byte, now including context views. No browser errors occurred.
The mobile daylight view at 390 × 844 also loaded with its controls visible.
The retained front comparison is linked above. Additional side/context captures
remain in the command's temporary output directory; `captures.json` records
the raw filenames and successful toggle checks. No new geometry or colour
correction relies on those temporary views as its sole evidence.

This pass fixes the capture helper's missing skyline restoration check and
the skill's durable-evidence guidance. A deliberate skyline canvas mismatch
made the helper fail and removed an older success record. It leaves
FID-KEM-001, FID-KEM-003 and FID-KEM-004 open; passing these rendering checks
does not establish calibrated material colour or resolve the panorama's face.
