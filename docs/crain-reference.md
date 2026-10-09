# Crain Communications Building: reference audit

Three models share one tower. `src/models/crain-tower.ts` builds it from plan
outlines and roof planes; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Solo | `createCrainBuilding` in `src/models/crain-communications.ts` | Clean version of the mapped outline | `building-study.html` |
| Skyline copy | `createCrainSkylineBuilding`, same module | Same, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createCrainGeographicBuilding` in `src/models/crain-geographic.ts` | The three mapped parts, exactly | Geographic layout |

All three are reconstructions from published data and one photograph, not a survey or
construction drawings.

## References checked September 27, 2026

- [OpenStreetMap ground outline 210671717](https://www.openstreetmap.org/way/210671717)
  and parts 284816227, 284816228 and 284816229. The local coordinate snapshot and
  attribution remain in `src/models/skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441):
  177.4 m architectural height and tip, 41 floors, all-concrete structure, A. Epstein
  and Sons International.
- [Wikipedia](https://en.wikipedia.org/wiki/Crain_Communications_Building): the tower
  is split diagonally into two slightly disjointed parts, with a gap between them at the
  top, the "vertical slit up the front"; the two spires cover the main roof and house
  mechanical rooms.
- [MTH Industries](https://www.mthindustries.com/our-work/150-n-michigan-avenue/), the
  glazing contractor: a curtain wall of silver-reflective glass culminating in a
  "45-degree sloped roof".
- [Chicago Architecture Today](https://www.flickr.com/photos/chicagoarchitecturetoday/7372208482):
  reflective glass and aluminum curtain wall, and a diamond outlined in white lights.
- `skyline.jpg`, the repository's 2013 panorama, photographed from the lakefront by the
  Adler Planetarium. The drawing was traced from it, and `scripts/fit-geographic-camera.ts`
  recovers its camera; see [the geographic audit](skyline-geography.md#skyline-camera).
  Measured there, Crain's shoulders are 330 photo pixels apart and span 57.5 m across
  the view, so 5.74 pixels are one metre at Crain.

## Plan

The mapped outline is a 38.6 × 45.6 m rectangle split along a 45° diagonal. The
south-west half, part 284816228, is an isosceles right triangle with 38.6 m legs. Its
peak is on the west face, 7 m south of the north-west corner. The north-east half, part
284816229, is its twin across the split: its own split line runs parallel to the first,
4.95 m away. The halves touch along the middle of the split and stand apart at both ends:

| Feature | Mapped | Clean plan |
| --- | --- | --- |
| Outline | 38.6 × 45.6 m, faces within 1° of the street grid | 38.6 × 45.6 m |
| South-west half's peak | 7.3 m south of the north-west corner | 7.0 m |
| Split lines | Parallel at 45°, 4.95 m apart | Same |
| North-west notch | V opening west, 4.9 and 5.5 m legs | 4.95 m legs |
| Slot, wedge part 284816227 | 13.3 m along the split, 152.5 m top | 13.4 m |
| South-east notch | V opening east, 10.6 and 10.9 m legs | 10.75 m legs |

The geographic model keeps the mapped outlines to the millimetre; its grade vertices
are the mapped footprint's. The solo model squares them up to the dimensions above.

## Roofs

Both roofs are planes falling toward the south-east. OpenStreetMap's roof tags give
the south-west half a 172.4 m top falling 75 m and the north-east half 177.4 m falling
73 m: slopes of 54° and 56°, with the peaks 5 m apart. The photograph does not show
that. Measured through its camera:

| Point | Below its peak | Along the fall | Fall per metre |
| --- | ---: | ---: | ---: |
| South-west shoulder | 32.7 m | 26.8 m | 1.220 |
| South-west foot | 67.1 m | 54.6 m | 1.229 |
| North-east shoulder | 34.1 m | 27.4 m | 1.245 |

The two peaks stand within half a metre of each other. Both models put both at the
published 177.4 m and let both roofs fall 1.225 m per metre, about 51°. The geographic
model measures the fall along OSM's 133° bearing; the clean plan measures it along the
diagonal. The same planes put the north-east half's flat step over the south-east notch
about 7 m above the south-west half's foot, and the drawing draws it 7.3 m above. MTH's
"45-degree" roof may describe the roof's edges on the faces, which fall at 42° on the
south face and 40° on the west. The models follow the measurements.

Between the peaks the slot is open down to the wedge's 152.5 m top. In the photograph it
shows sky to about 21 m below the peaks, with the north-east half's inner wall lit beside
it.

## Curtain wall

| Feature | Value | Basis |
| --- | --- | --- |
| Floor pitch | 3.5 m | Photograph 3.55 m (20.4 px), drawing 3.48 m at the solved camera's scale |
| Spandrel and glass | 1.85 m white aluminum, 1.65 m glass | Drawing's bands 54% light; the photograph's night glow reads 61% |
| Lobby | 7 m, glazed 0.45–5.9 m | Estimate; hidden in the photograph and the drawing |
| Window module | 1.524 m | Estimate, a common 5 ft module |
| Main roof | 152.5 m | OSM wedge part; forty-one floors reach 147 m beneath it |

In the original drawing-fit and clean copies, every exposed wall carries ribbon windows
between the floors' sills and heads. They stop 0.8 m under the roof edge, and above any
neighbouring volume, so the slot's walls carry
ribbons only above its floor. The ribbons' panes vary a little in tone, with a few lit or
dimmed, and slim dark mullions divide them on the module. The sloped glass carries a
raised grid at twice the module, aligned with the faces. A light fascia along each half's
outer roof edges stands for the lit outline; the diagonal edges of the split, the
notches, and the slot take a dark coping. Fascias hang from the roof edge rather than
over the roof, so the peaks stay the building's top. The geographic crown and grid
orientation were refined in the 2026-10-04 pass below.

Omitted: the plaza and Yaacov Agam's *Communication X9* sculpture, entrance canopies,
signage, rooftop equipment inside the spires, and the lights' colour. Colours follow the
original artwork's grayscale palette rather than the photograph's.

## The skyline copy

The drawing shows Crain from the photograph's treeline up, and the skyline study's
platform datum is that treeline. The skyline copy is the solo model from 39.6 m above
the street, and `skyline-study.ts` scales it by 1.276, turns it 4.86°, and places it.
These were fitted through the skyline camera to the drawn diamond's six vertices and the
twenty-nine sills the left face shows below its shoulder. The lowest is the twelfth
floor's; with the eleventh's or thirteenth's instead, the rows' error more than doubles. Depth
keeps the earlier placement, since the drawing cannot fix it.

A uniform scale fits within 7% of one that stretches height and plan separately, so the
copy keeps the building's real proportions. The 1.276 matches the exaggeration the
drawing gives the other fitted towers. The worst landmarks are the foot and the step,
0.00375 of the canvas at the desktop and laptop layouts; the sills stay within 0.00217. The drawing
simplifies the slot: it draws the gap between the peaks 45% wider than the photograph
shows, and flattens its foot where the two roofs actually meet 6 m apart. The slot
corners are therefore held to the geometry, not to the drawing.

## Verification

`bun run check` covers all three:

- `tests/building-kit.test.ts` checks the skyline copy and the geographic model for
  counted triangles, winding, same-facing coplanar overlaps, and covered omissions. It
  also raycasts the skyline copy's facade either side of each drawn sill, finding
  spandrel below and glass above, and it keeps every roof-grid bar of all three models
  over the glass.
- `tests/skyline-study.test.ts` projects the skyline copy's six diamond vertices and
  twenty-nine sills against the drawing at five layouts. It holds the slot corners to the
  geometry and the step above the foot, and hovers a probe on the south face.
- `tests/skyline-geography.test.ts` raycasts the geographic model. It checks both peaks
  at 177.4 m, the roofs' fall at independent samples, and the slot's 152.5 m floor and
  its open gap. It also checks ribbons as the first surface on the mapped south wall and
  the notch's recessed wall, the lit outline on the outer edges, and every mapped
  footprint corner at grade. Crain's six drawn vertices also feed the geographic camera
  fit.
- `tests/building-study.test.ts` loads the solo study within its triangle budget.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-04 — Crown detail and roof grid (FID-CRAIN-001, FID-CRAIN-002)

This pass reassessed the existing `building-crain-communications` geographic
model. Its office-window treatment continued into the tips, its mechanical
bands looked like ordinary glazing, and the roof grid followed the street
axes. The mapped footprint, roof planes, 177.4 m peaks and 152.5 m slot floor
remain the earlier reconstruction. No building was added.

### New evidence

All sources below were accessed **2026-10-04**. Third-party images and PDFs
were inspected locally but are not redistributed or requested at runtime.

| Input and locator | Date / confidence | Observation and use |
| --- | --- | --- |
| Epstein, [“Epstein's Top 100 Projects: #1: Crain Communications Building”](https://www.epsteinglobal.com/news/epsteins-top-100-projects-1-crain-communications-building), curtain-wall paragraph and exterior slider photographs | Published 2022-07-12; photo capture dates unknown. Architect/engineer primary account. | Documents aluminum, stainless steel and reflective glass. The omitted steel detailing needs better dimensional evidence; this pass does not assign it a speculative width. |
| Epstein, [exterior slider 04](https://epstein-site.transforms.svdcdn.com/production/Crain-Communications-Building-Image-Slider-04.jpg?w=1440&h=948&auto=compress%2Cformat&fit=crop&dm=1657633014&s=0039f47f7069bda6c61639d1ea40c473), rear crown close view | Observed, high confidence in counts; inferred heights. | On the broad right exterior face, count two horizontal louver bands below the slot's top, three dark strips in the projecting crown, then uninterrupted metal to the point. The slot-facing wall remains glazed. |
| Epstein, [exterior slider 09](https://epstein-site.transforms.svdcdn.com/production/Crain-Communications-Building-Image-Slider-09.jpg?w=1440&h=948&auto=compress%2Cformat&fit=crop&dm=1657632987&s=b4ded0559d06c309b075ba89d350361d), aerial view of both roof halves; corroborated by slider 01 | Observed orientation; exact module unresolved. | Roof mullions follow the fall and crossbars follow level contours. This supersedes the earlier street-aligned grid assumption for the geographic model. |
| The Diamond / R2 Companies, [leasing page](https://www.thediamondchicago.com/leasing/), [suite 800 plan, p. 1](https://www.thediamondchicago.com/wp-content/uploads/2025/03/150NMA_800_18144-SF.pdf) and [floor 38 plan, p. 1](https://www.thediamondchicago.com/wp-content/uploads/2025/02/150-N.-Michigan-Ave.-38th-Floor-MKG.pdf) | Drawing dates unknown; URLs place uploads in 2025. Inspected, not dimensional support for this correction. | Interior plans expose the indented outline but supply no crown elevation or dimensioned glazing schedule. They do not resolve the facade module or absolute plant-floor heights. |

The inspected 1440 × 948 image versions have SHA-256
`5064a688cf829a614c76614c621e1451549c0424dfe539870bec087dec0bd0cf`
(slider 04) and
`811795154f35e7beff85aedef7e0a98143caf034c137d846b38fa578f3d32b19`
(slider 09). The plan hashes are
`f8d9546eb994531badc8088f6c0c32994a35f52d4021f94bcd5b1f151eb43ce2`
(suite 800) and
`f24947e995cc1dc63490fd0f60a46a1731d9d6e7f91347bfd9d66016c8959ca1`
(floor 38). MTH's previously cited project page returned HTTP 403 during this
pass; it is not new supporting evidence.

### Interpretation and model decision

These are details of the original crown configuration shown in the architect's
retrospective, rather than a current lobby renovation. The precise capture
dates remain unknown. The 2013 panorama's fitted geometry and the two clean
study copies retain their previous mesh data.

For **FID-CRAIN-001**, count bands from the slot floor and locate them on the
existing 3.5 m story rhythm. This is an approximate alignment, not a measured
elevation: allow about one story of vertical uncertainty until an elevation is
available. Geographic exterior walls now have louvers at 144.40–146.05 m and
147.90–149.55 m, three dark shadow bands at 154.90–156.55 m,
158.40–160.05 m and 161.90–163.55 m, and solid aluminum above them. The bands
clip beneath each sloped edge; diagonal slot walls keep their glazing. Louver
blades have estimated 0.22 m pitch and 0.05 m relief, enough to distinguish
the vents in close views. Closed dark strips 0.02–0.08 m proud of the wall stand
in for the shadow of visible crown openings; they are not recessed or cut through the shell.
Internal trusses and through-views are still omitted.

For **FID-CRAIN-002**, orient the geographic roof grid along the existing 133°
downhill bearing and its perpendicular. Keep the earlier estimated 3.048 m
plan spacing and 0.16 m bar width; neither is established by this orientation
observation. The shared generator accepts optional crown details, so the
original drawing fit does not change.

Falsifiable acceptance: north and west crown probes encounter two separate
vent bands with blades in front of their backing, exactly three dark strips
above the slot datum, and metal at 165, 169 and 172 m. Roof bars include both
constant-height crossbars and members following the roof's 1.225 fall.
Existing peak, slot, notch, footprint and original-sill tests must still pass.
The vent dividers remain on the estimated facade module: the photograph shows
vertical divisions but does not establish their pitch. The near-axis exterior
wall rule includes eligible notch arms; neighboring volumes still mask covered
areas. Diagonal slot faces remain glazed.

### Validation and remaining opportunities

- Strict typecheck passed. The three Crain geographic tests passed, including
  new raycast and roof-grid checks. Against the base model the two new tests
  fail, while the existing diamond/slot/footprint test passes.
- All 11 focused Crain building-kit checks passed: winding, coplanar-overlap
  checks, covered omissions, grid containment and original drawing sills,
  plus closed-mesh checks for the clean copies. Independent review prompted
  clearer shadow-strip naming, qualification of the earlier audit, removal of
  a redundant louver filter, shared downhill direction and band heights derived
  from the existing story rhythm; focused checks were repeated after repair.
- Before/after mesh digests for both clean Crain copies are identical to the
  base. Building-detail captures at 1000 × 1000 with reduced motion used the
  same front, quarter and side presets, then 18 right-arrow steps from side
  for the rear. Geographic skyline captures confirm placement and occlusion.
  Browser capture completed without page errors. Full shipping checks are
  additionally required and their run is recorded in the PR and timing log.

| View | Before | After |
| --- | --- | --- |
| Roof grid | [Quarter view](fidelity/crain-quarter-before.png) | [Quarter view](fidelity/crain-quarter-after.png) |
| Crown bands and metal tip | [Rear view](fidelity/crain-rear-before.png) | [Rear view](fidelity/crain-rear-after.png) |

**FID-CRAIN-003 remains open:** obtain a dimensioned crown elevation or
rectifiable dated photographs to resolve absolute band heights, roof-grid
spacing, blade pitch and the internal framing visible through the strips.
**FID-CRAIN-004 remains open:** research stainless-steel trim, aluminum panel
joints and the original lobby treatment with detail photographs and drawings.
Do not infer those dimensions from a source that only names the materials.

## 2026-10-04 — Crown lamps and mullion ends (FID-CRAIN-005, FID-CRAIN-006)

This follow-up assessed **Crain only**, adding its documented sports displays
to the existing geographic model. Comparing the close render against the
photographs also exposed prematurely shortened roof mullions. The mapped
footprint, roof slopes, peaks, slot, estimated glazing pitch and crown bands
retain the earlier reconstruction; the two original drawing-fit copies retain
their former mesh data. This is a reconstruction of the 2010/2016 celebration
appearance, not evidence of a new building renovation.

### Inputs and observations

All inputs below were opened and inspected on **2026-10-04**. Reference images
remain outside the repository; the committed comparisons are original renders.

| Input / locator | Date and evidence | Decision supported |
| --- | --- | --- |
| Daniel Schwen, Wikimedia Commons, [Crain GO HAWKS crop](https://commons.wikimedia.org/wiki/File:Chicago_Grant_Park_night_pano_(Smurfit-Stone_Building_%22Go_Hawks%22).jpg), [649 × 925 original](https://upload.wikimedia.org/wikipedia/commons/a/a0/Chicago_Grant_Park_night_pano_%28Smurfit-Stone_Building_%22Go_Hawks%22%29.jpg) | Photograph dated 2010-06-10; primary photographic evidence. Words near image coordinates GO (269–302, 238–260), HAWKS (350–438, 244–270), approximately ±5 px. | Observed GO on the southwest roof half and HAWKS on the northeast half, below the open slot, with an illuminated diamond perimeter. The words do not use the office windows below the crown. |
| Metroscap / The Metroscap Collection, [GO CUBS photograph page](https://metroscap.com/chicago--framed-pictures/3080/go-cubs-in-the-smurfit-stone-building-at-night.php/), [1360 × 1360 displayed image](https://metroscap.com/framed-prints/framed-chicago-skyline-black-white-square-3080-1360.webp) | Listed in the site's 2016 Cubs World Series collection; exact capture date and individual photographer credit unknown. Primary photographic evidence; viewed with its watermark intact. | GO at approximately (447–526, 370–417), CUBS at (621–779, 375–430). Individual bright lamps, the split between the words, grid occlusion and the luminous outline are visible. Glazing members continue close to the perimeter rather than ending halfway through the last bay. |
| Epstein, [Top 100 Projects #1](https://www.epsteinglobal.com/news/epsteins-top-100-projects-1-crain-communications-building), roof image slider 09 linked in the previous entry | Published 2022-07-12; image capture date unknown. Reopened and inspected; architect/engineer primary source. | Corroborates the continuous downslope and cross-slope roof grid near its edges and describes the illuminated apex. It does not establish a new grid spacing or trim dimension. |
| Wikipedia, [Crain Communications Building, History](https://en.wikipedia.org/wiki/Crain_Communications_Building) | Undated secondary account, opened on the access date. | Reports GO BEARS and GO SOX. Those presets use the photographed two-word arrangement; their original lamp placement is not established. VOTE 2008 remains outside the supported sports presets. |

SHA-256 of the inspected versions:

- GO HAWKS original: `4867fef6b5e722c1477b7b33a0385f3df356beefc125804d8afcb7c7e84e3d7a`.
- GO CUBS displayed image: `85a5d27c4a3d421fc796739ed50734873eb4224e81422144dca3d27233993d8f`.
- Epstein slider 09: `811795154f35e7beff85aedef7e0a98143caf034c137d846b38fa578f3d32b19`, unchanged from the preceding pass.

### Model decisions and uncertainty

For **FID-CRAIN-005**, use the existing sloped-glass triangles as the display
surface. A locally generated 64 × 8 single-channel atlas carries two compact
five-row lamp words. Each roof half gets its own mapping and its own geometric
containment checks. The slot, slab edges, undersides, vertical walls and
mullions do not receive the lamp texture. Existing depth testing lets the
mullions occlude lamps. The perimeter's existing mesh adds neutral emission
while a display is selected; switching off restores its previous shading.
Hover uses a separate emission term.

The letters occupy **148.6–151.8 m**, just below the existing 152.5 m slot-floor
datum. Estimated lamp pitches are **0.42 m across × 0.64 m vertically**. Word
centres start at each half's width at the row's middle and move **2 m toward
the central seam**. These are visual placement estimates: compare the letter
height to the already reconstructed roughly 67 m roof drop and place the row
below the slot, using the photographs' proportions. Perspective, glare and
unknown camera calibration permit several metres of placement uncertainty;
this is not a recovered electrical plan or a newly measured roof elevation.
The five-row alphabet reconstructs lettering without claiming exact bulb counts.

For **FID-CRAIN-006**, extend the geographic bars to their clipped roof-edge
limits plus **0.1 m end inset**, retaining the existing **0.3 m side clearance**
and bar width. This replaces half-module snapping, which left roughly metre-
scale bare margins and staggered ends. The endpoint inset is inferred, not a
surveyed trim dimension. The shared generator's optional `grid.edgeInset`
preserves the previous construction when omitted by the clean/original models.
The added lengths and three formerly omitted short bars add 36 triangles to
the geographic model (44,624 → 44,660); the lighting adds none.

FID-CRAIN-003 and FID-CRAIN-004 remain open. The closer images suggest a denser
real glazing grid, but this pass does not claim a rectified count or measured
module. The existing spacing, band elevations, opening interiors and trim
dimensions still need stronger dimensional evidence.

### Acceptance and observed validation

- Read GO HAWKS back from physical roof coordinates, independently of the
  logical lamp addresses: GO is left, HAWKS is right, both read top to bottom,
  below the slot floor on southeast-facing glass. Every lit cell fits its roof.
- At least 85% of roof-grid endpoints must lie within 0.7 m in plan of a roof
  edge. The new test passes; removing `edgeInset` to restore the previous grid
  makes it fail at about 2.2%.
- All 11 focused Crain building-kit checks passed, including closed geometry,
  winding, coplanar-overlap checks, glass under every bar and original drawing
  sills. The six lighting unit checks passed, including independent instances,
  unsupported-preset rejection, unchanged lighting geometry and texture disposal.
- Browser checks passed for all four Crain messages, independent building
  menus, partial toolbar state, touch and keyboard controls. A fixed close
  camera detects lamp pixels with the perimeter hidden, so a broken lamp shader
  cannot pass through the outline alone. Hover/wireframe changes preserve the
  display, off restores the rendered baseline exactly, and all pixels are gray.
- Independent review exposed a toolbar edge case: turning off Bulls on Blue
  Cross also cleared a different message selected on Crain. The added desktop
  and touch regression failed against that behavior and passes with the repair;
  turning off a badge now preserves other celebrations.
- Building-detail captures use reduced motion at 1000 × 1000 with matching
  front, quarter and side presets. Skyline captures retain placement and
  occlusion. The close lamp comparison uses the same orthographic camera for
  off/on. Full shipping validation is recorded separately in the timing log.

| Comparison | Before / off | After / on |
| --- | --- | --- |
| Geographic roof-grid ends, matching detail camera | [Before](fidelity/crain-grid-ends-before.png) | [After](fidelity/crain-grid-ends-after.png) |
| Lamp display and outline, matching close camera | [Off](fidelity/crain-lamps-off.png) | [GO HAWKS](fidelity/crain-lamps-on.png) |

## 2026-10-05 — Crown lamps withdrawn (FID-CRAIN-005)

The owner asked to remove GO CUBS and the other sports messages from Crain,
because their appearance on this tower was not wanted, and to keep the
celebrations on Blue Cross for now. This is a product decision, not new
evidence: the photographs, hashes and placement estimates above stay as the
record should the displays return.

- Removed the crown lamp controller, its lamp map and shader hooks on the
  sloped glass, and the outline emission during celebrations. The geographic
  model no longer has an `illumination` controller, so the toolbar and
  Crain's building menu no longer offer messages for it. The diamond outline
  keeps its diffuse paint at all times, as before FID-CRAIN-005.
- **FID-CRAIN-006 is retained:** the roof-grid bars still continue to the
  perimeter with the 0.1 m end inset. Its regression moved to the Crain
  geometry tests. The lighting added no triangles, so the geographic model
  stays at 44,660.
- A unit check confirms Blue Cross alone carries a celebration controller and
  Crain's glass and outline keep the stock toon program with no lamp map. A
  browser check opens Crain's building menu and finds no lighting choices.
- Reinstate only on the owner's request. The removed implementation is in
  the Git history of #98.

The [lamp comparison images](fidelity/crain-lamps-on.png) above show the
withdrawn display, not the current model.


## 2026-10-09 — Night colours from the panorama (FID-COL-001)

Withdrawn from the trial on 2026-10-09 at the owner's request for a sunny day: the daytime colours
below (FID-COL-003) replace these in `src/models/colour-palette.ts`. The findings stand as the night
photograph's record.

Source: `src/skyline.jpg`, the repository's 2013 night panorama from the Adler Planetarium's
lakefront, the photograph the drawing traces (19915 × 5315 px; SHA-256
`f6001e46471ea59f6fc07ae0eb9e7d5d8d243666f57d96d7efc6f59f2d7d5db4`; photographer and exact date
unknown; inspected 2026-10-09). It records the building under the city's night lighting in 2013,
so these are **observed** night colours, not the materials' daylight colours.

Method: `scripts/measure-group.ts` aligned the building's drawn group with the photograph
(`skyline.svg` places the image at x −15558.758, y −1754.2251, 26553.332 × 7086.6665 in the
drawing's layer space). Each sample is a box in photograph pixels (x0, y0, x1, y1, half-open), a
rule on hue (degrees), saturation and value (0–1) choosing one material's pixels in it, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue.
`bun scripts/sample-colours.ts night building-crain-communications` reproduces these rows and prints
the palette entries they gave, decoding the photograph in Chrome without colour management. Single
pixels at this scale mix neighbouring materials, which the quartiles show; the medians are the
values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Aluminium spandrels | 13735, 2900, 14065, 3290 | hue 10–55, sat 0.12–0.65, val 0.45–0.97 | 77,391 (60.1%) | `203, 172, 124` | 180–216 / 141–186 / 90–151 |
| Unlit glass | 13735, 2900, 14065, 3290 | val 0–0.35 | 33,074 (25.7%) | `65, 48, 42` | 57–73 / 41–56 / 34–52 |
| Lit windows | 13735, 2900, 14065, 3290 | sat 0–0.3, val 0.85–1 | 12,211 (9.5%) | `232, 222, 213` | 223–243 / 205–241 / 179–236 |
| Diamond glass | 13860, 2640, 13980, 2760 | val 0–0.6 | 14,084 (97.8%) | `19, 28, 58` | 14–26 / 25–32 / 54–62 |
| Outline lights | 13735, 2500, 14075, 2780 | hue 150–240, sat 0.08–1, val 0.75–1 | 1,953 (2.1%) | `195, 209, 237` | 171–217 / 183–229 / 214–255 |

Decisions in `src/models/colour-palette.ts`:

- `aluminium` `203, 172, 124`: the white aluminium spandrels read warm under the street's light;
  also the coping and the crown's louvers and blades.
- `glass` `65, 48, 42`, the ribbon glazing's unlit panes.
- `crown glass` `19, 28, 58`, the diamond's sloped glazing and its grid, which the photograph does
  not separate at this scale.
- `lamp` `195, 209, 237`, the diamond's outline lights.
- `lit window` `232, 222, 213`; `dim window` takes it at the dim windows' grey.
- `dark metal` (the louver vents) and `neutral` (the slot floor and shadow strips) stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 2.1, on the building's surfaces of that material, and leaves its unmeasured ones
grey. In the skyline view at 1600 × 900, the rendered spandrels' median is 0.43 of the photograph's
in linear light: their colour passes white at the exposure and keeps its hue, so it cannot reach the
photograph's brightness.

## 2026-10-09 — Daytime colours from Chicago.jpg (FID-COL-003)

At the owner's request the colour trial shows a sunny day, so these colours replace the night
colours above in `src/models/colour-palette.ts`.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-09). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. It looks from nearly the drawing's viewpoint on a sunny day, five years before the 2013
night panorama the drawing traces. No change to these materials between 2008 and 2013 is known to
this audit. The sun is high in the south: the south faces, which the lakefront sees nearly square,
are lit, and the east faces are in shade (observed).

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-crain-communications`
downloads each photograph once, checks its SHA-256, and reproduces these rows and the palette's
entries, decoding in Chrome without colour management. The building is about 55 pixels wide in the
rendition, so single pixels mix neighbouring materials, which the quartiles show; the medians are
the values used. Samples take the sunlit face where the photograph shows one.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Aluminium spandrels, sunlit | 1555, 420, 1583, 470 | sat 0–0.15, val 0.65–1 | 654 (46.7%) | `251, 252, 250` | 225–254 / 226–255 / 222–255 |
| Glass | 1555, 420, 1583, 470 | val 0–0.45 | 619 (44.2%) | `30, 36, 37` | 6–61 / 7–61 / 7–62 |
| Diamond glass | 1565, 355, 1600, 395 | sat 0–0.4, val 0–0.7 | 1,218 (87.0%) | `121, 130, 140` | 112–129 / 121–139 / 130–148 |
| Shaded face, for comparison | 1590, 400, 1608, 470 | sat 0–0.2, val 0.45–1 | 633 (50.2%) | `140, 150, 159` | 120–155 / 129–165 / 139–172 |

Decisions in `src/models/colour-palette.ts`:

- `aluminium` `251, 252, 250`, the sunlit spandrels, nearly white; the shaded face measures
  `140, 150, 159`.
- `glass` `30, 36, 37`, the ribbon windows; `lit window` and `dim window` take it exactly, since no
  office lights show by day.
- `crown glass` `121, 130, 140`, the diamond's sloped glass, grey-blue with the sky it reflects.
- `lamp`, the diamond's outline fixtures, takes the aluminium's colour: by day the outline reads as
  a white edge. Inferred.
- `dark metal` and `neutral` stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material, and leaves its null ones grey.
In the skyline view at 1600 × 900 under the day lights, the spandrels render `208, 209, 208` under
the photograph's rule, 0.66 of the photograph's brightness in linear light: at this exposure the
aluminium passes white at its own grey and keeps its hue there, and the scene's lights do not light
the face as the sun does.
