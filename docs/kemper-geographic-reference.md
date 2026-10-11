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
| Crown band base | 155.79 m | FID-KEM-008: shallow photographed band below the shaft top; previously 151.25 m |
| Shaft top | 158.5 m | Below the projecting cap |
| Roof | 159 m | OSM height tag on way 64389514 |

The tower pitch is (159 − 7.8) / 39 ≈ 3.88 m, so the podium's two floors and
the 39 tower floors read as the published 41 floors. FID-KEM-008 supersedes the
initial two-floor crown: ordinary rows continue through floor 40, with a shallow
top-floor band below the cap. The average row pitch remains an estimate.

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
reflections (FID-KEM-003). This fallback was superseded by the calibrated
FID-KEM-003 entry below later on 2026-10-11. Marble and glass keep the existing measured colours;
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

The render-evidence skill pass re-inspected the
[front grayscale/daylight pair](fidelity/kemper-panel-colour-after.png) after
integrating `8574bb2`, using `building-detail.html?building=building-kemper`, the front
preset, a 1600 × 1000 viewport and reduced motion. The retained image shows
continuous marble piers around narrower openings in both modes, with warm
marble distinct from dark glazing in daylight. It is reused because this
verification pass makes no model correction. The panels use the calibrated
colour documented in the separate FID-KEM-003 entry below; its remaining
sunny-face calibration uncertainty stays open as FID-KEM-005.

Reinspection of the dated 2012 photograph above supports the established
coverage correction but supplies no new calibration here. FID-KEM-001's bay
counts and FID-KEM-004's panorama face identification remain unresolved.
Rendering-tool checks and the additional views sampled during this pass are
recorded in the [fidelity queue](building-fidelity.md#coverage-and-priorities).

## 2026-10-11 — Calibrated opaque-panel colour (FID-KEM-003)

The second skill pass, after shipping FID-KEM-002, assessed the new panels in
both modes. It replaces their explicit grey fallback with a provisional
measured daytime appearance. No geometry, default greys or exposure changes.

Sources reopened 2026-10-11: IvoShandor's
[2012 north-face photograph](https://commons.wikimedia.org/wiki/File:Kemper_Building-Chicago.JPG)
and Daniel Schwen's [2008 Chicago panorama](https://commons.wikimedia.org/wiki/File:Chicago.jpg).
Dates, exact downloads, dimensions and hashes are recorded above. The close-up
shows opaque panels immediately above and below dark windows; marble beside
each panel supplies a same-face, same-overcast-light reference. Small interior
boxes avoid the edges and glass. These samples represent the pre-2013 facade;
no replacement-panel history is established.

`bun scripts/sample-colours.ts day building-kemper` now reproduces the following
half-open pixel boxes in the 1216 × 2400 close-up, selecting **all** pixels:

| Surface | Box x0, y0, x1, y1 | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | ---: | --- | --- |
| Marble reference | 427, 440, 446, 466 | 494 (100%) | `172, 172, 167` | 171–175 / 170–176 / 164–173 |
| Opaque panel | 400, 440, 419, 466 | 494 (100%) | `114, 122, 126` | 111–116 / 119–124 / 123–129 |
| Panel 2 | 507, 515, 526, 540 | 475 (100%) | `110, 121, 127` | 109–113 / 119–123 / 124–129 |
| Marble 2 | 535, 515, 554, 540 | 475 (100%) | `167, 167, 165` | 164–170 / 163–172 / 160–169 |
| Panel 3 | 400, 589, 419, 612 | 437 (100%) | `109, 120, 125` | 107–110 / 118–121 / 122–126 |
| Marble 3 | 427, 589, 446, 612 | 437 (100%) | `171, 172, 169` | 168–175 / 168–176 / 163–174 |

Calibration: divide the panorama marble's linear-light channels (`195, 192,
182`, remeasured unchanged) by the close-up reference's channels, giving about
1.32, 1.28, 1.21; multiply the panel channels by those factors and encode sRGB.
The result is `opaque spandrel` `130, 137, 138` in
`src/models/colour-palette.ts`. The sampler's comparison rows use that same
reference, giving `125, 136, 139` and `124, 134, 137`. Calibrating each check panel
through its own adjacent marble instead gives `129, 140, 140` and `125, 134,
135`: linear luminance varies from the chosen result by about −5.4% to +3.5%.

This bounds local sampling variation only. The transfer assumes the same marble
on north and south faces and similar diffuse response from panels and marble;
photograph haze, possible office-window tint, surface gloss and differing
illumination remain systematic uncertainties. The result is an inferred sunny
appearance, not intrinsic reflectance or proof of a particular cladding material.
The generic material name and matte classification are retained. FID-KEM-005
keeps independent sunny-face calibration open; the existing glass and marble
palette entries remain unchanged.

Validation: the [first pass's final pair](fidelity/kemper-proportions-after.png)
is this pass's baseline; the [new pair](fidelity/kemper-panel-colour-after.png)
shows lighter, subtly cool panels between the dark windows in colour. Front
and side close-ups, skyline and elevated context were inspected at the same
1600 × 1000 viewport with reduced motion, using the preceding pass's URLs and
presets. Artifacts are in `/tmp/skyline-fidelity-oct11/pass-two-before` and
`pass-two-after`. The committed composites contain both modes: the grayscale half of
`kemper-panel-colour-after.png` is identical to that of
`kemper-proportions-after.png`. All four standalone grayscale before/after PNGs
also compare byte for byte;
both detail canvases also restore exactly after toggling colour off. There
were no browser page/console errors. The existing material tests verify the
measured hue is applied to the actual batch, its audit record, grey restoration
and shader isolation; the geographic test verifies the coloured panels still
have no glass shader. Targeted checks pass; the full shipping run accompanies
the PR.

Dogfooding refinement: the skill now asks for nearby sample/reference checks
and before/after grayscale comparisons for colour-only edits. The first PR's
review note about restoring shared test materials on assertion failure is
also addressed with `try/finally`, and a missed facade ray now reports its
probe coordinates.


## 2026-10-11 — Continuous twelve/fourteen-column faces (FID-KEM-006)

This further pass assessed Kemper in grayscale and sunny colour. Reopened and
inspected the three Commons photographs cited under FID-KEM-002 on 2026-10-11:
IvoShandor's 2012 north elevation, Chris Light's 2011 east/north view, and
MusikAnimal's 2016 north/west view. Original dimensions, download locators and
SHA-256 hashes above identify the measured versions. The exact 2016 download is
`https://upload.wikimedia.org/wikipedia/commons/6/62/Kemper_Building%2C_Chicago_in_May_2016.jpg`.

Observed counts, counting dark window columns between the two outer marble
corners rather than counting marble strips:

| Face | Image locator in original pixels | Observation |
| --- | --- | --- |
| North | 2012 image, x=275–925, y=600–800 | Twelve columns, consistent at three horizontal slices; ordinary floors below the sign. |
| West | 2016 image, crop x=1480–2550, y=250–1950 | Fourteen columns, traced down from the fourteen dark top openings; their upper centres are approximately x=1531,1597,1662,1727,1789,1853,1915,1975,2035,2093,2150,2208,2263,2315. Perspective changes their y coordinates. |

Boundaries are uncertain by about 2–3 pixels, but no column is hidden in either
count. The 2011 oblique photograph corroborates the repeated pier/panel system;
its cropped east face is not used for an exact count. The north count is observed
before 2013. Carrying the 2016 west count back to 2013 is an inference from the
matching cladding system, not a dated west elevation. Twelve south and fourteen
east columns are symmetry inferences; those faces still need independent counts.

The old factory rounded each OSM run separately at 3.1 m. Its north face had
11 columns and west face 13, and the tracing joints reset the rhythm. The new
factory follows four chains of nearly collinear mapped runs, with twelve bays
on north/south and fourteen on east/west. Each opening and pier is a closed,
mitred skin across internal tracing joints. The existing mapped coordinates and
159 m roof are retained. This gives about 2.87 m north and 3.00 m west pitches;
they are map-derived intervals, not surveyed dimensions. The 48% opening and
52% pane-height proportions remain those measured in FID-KEM-002.

Colour assessment: all existing batch/material identities are retained, including
matte opaque panels and reflective glass. The new rhythm is visible in both modes;
there is no new colour measurement or palette/exposure adjustment. FID-KEM-004
and FID-KEM-005 remain unresolved. FID-KEM-001 now focuses on the crown and row
rhythm; opposite-face/era confirmation is tracked separately as FID-KEM-007.

Validation and retained evidence:

- New surface raycasts count twelve north and fourteen west openings over the
  complete faces, including their tracing joints, independently of the factory's
  constants. Existing photographic coverage, matte-panel, footprint, cap and
  facade-relief checks pass. Geometry and colour-material checks accompany the PR.
- Paired front views [before](fidelity/kemper-bays-before.png) and
  [after](fidelity/kemper-bays-after.png), and paired side views
  [before](fidelity/kemper-bays-side-before.png) and
  [after](fidelity/kemper-bays-side-after.png), retain both modes. The piers now
  maintain one regular rhythm across each face instead of restarting at map vertices.
- `bun scripts/render-colours.ts --out /tmp/skyline-more-fidelity/round-one-after building-kemper`
  captured front/side detail, skyline/quarter context, and mobile daylight;
  `round-one-before` is the baseline. URLs/presets and 1600 × 1000 viewport are
  recorded in each run's `captures.json`, with reduced motion. All four paired
  canvases changed in colour and restored grayscale exactly; no page/console errors.
  Skyline and quarter views preserve placement and occlusion. The original drawing
  model is unchanged. The full shipping check and independent review accompany the PR.


## 2026-10-11 — Shallow crown band and slender frames (FID-KEM-008)

The next pass, after shipping FID-KEM-006, assessed the crown in both modes.
It replaces the old two-floor band and heavy frame-width estimate with ratios
observed in IvoShandor's 2012 north elevation. The source page was reopened and
its original pixels inspected on 2026-10-11; its exact download and SHA-256 are
recorded under FID-KEM-002. No new photo colour calibration is claimed.

Measurements in the 1216 × 2400 original:

- Crown glazing lies approximately between y=199 and y=247 at x=760–925,
  outside the sign. Its 46–50 px height is about 0.62–0.68 of the 73–75 px
  ordinary-floor repeat measured lower down at x=408/516, y=430–835.
  Edge uncertainty is about 2 px. The near-frontal view limits perspective
  error, but this remains a dimensionless estimate, not an elevation survey.
- Narrow crown frames near x=782,809,836,863,891,917 span roughly 2–4 px
  in approximately 27 px intervals. Their visible share is about 7–15%,
  rather than the old factory's roughly 25%. Their colour and depth are not
  established by this measurement. Reflections and the end bays make an exact
  whole-face pane count less certain; that count stays under FID-KEM-001.
- MusikAnimal's 2016 north/west photograph (same original/hash as above)
  corroborates a shallow strip with slender frames below the cap. Its upward
  perspective is not used for the height ratio or a pre-2013 dimension.

A new primary account, Thomas Campone's
[Open House Chicago 2013](https://www.thomascamponephotography.com/blog/2013/10/open-house-chicago-2013),
published 2013-10-24 and accessed 2026-10-11, describes photographing through
windows wrapping the 41st floor. The paragraph after the first photograph
supports identifying this as top-floor glazing; it does not give its dimensions.
The two-floor interpretation inherited from the drawing is superseded by the
near-frontal pre-2013 photograph.

Implementation: the crown assembly is 0.7 of the existing floor pitch below
158.5 m, including glass clearances; the visible glass is about 2.41 m high,
0.62 of the 3.88 m repeat. The band begins at 155.79 m. Ordinary facade rows
now include floor 40 so the reduced crown does not leave a blank marble/panel
storey. Frame width drops from 0.26 to 0.10 m, giving about 10% visible share
at the existing estimated spacing. Roof, cap and mapped outline are retained.
Absolute floor datums, frame depth and pane count remain estimates. In particular,
this is not evidence for an exact crown elevation to the centimetre.

Colour assessment: the shallow glazed strip remains glass, with sky reflection
in the sunny trial; the slender frames retain the explicit grey fallback for
unmeasured aluminium. Existing marble, glass and opaque-panel colours and shared
exposure are retained. Both modes now show a slim cap-level strip above the
ordinary facade. FID-KEM-004/005 remain open.

Validation:

- A vertical surface scan measures the crown's visible height against repeated
  ordinary-window starts, accepting a ratio of 0.55–0.75 to allow photo and
  sampling uncertainty. It also requires the last ordinary row near the band.
  Horizontal rays require 6–16% frame coverage. The previous tall/heavy crown
  fails these observation-derived bounds. Footprint, roof, closed-mesh,
  coplanar-overlap and material checks pass.
- The previous pass's [front](fidelity/kemper-bays-after.png) and
  [side](fidelity/kemper-bays-side-after.png) pairs are the retained baselines.
  New [front](fidelity/kemper-crown-after.png) and
  [side](fidelity/kemper-crown-side-after.png) pairs show both grayscale and
  sunny colour after the change. All use a 1600 × 1000 viewport and reduced
  motion. Skyline/quarter context and mobile daylight were also inspected.
- Reproduce with `bun scripts/render-colours.ts --out /tmp/skyline-more-fidelity/round-two-after building-kemper`;
  `round-two-before` records the merged first pass. Each run's `captures.json`
  records URLs/presets. Colour changes all four canvases; switching it off
  restores each grayscale canvas exactly. Browser page/console errors: none.
  Existing original-layout and hover/occlusion regressions accompany the full check.

Follow-up from the first independent review: column probes now cover all four
faces, clearly labelling south/east as inferences, and use `opening` instead of
shadowing `window`. Both north and west have internal tracing joints (three and
two runs respectively); the review's contrary west-face note was checked against
the mapped coordinates. End piers currently centre on chain ends and stop short
of corners for relief clearance, backed by the original marble prism. Their
width is less than a full interior pier; precise corner widths remain a
photographic/elevation opportunity under FID-KEM-009, not an observed correction.
