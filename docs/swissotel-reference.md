# Swissôtel Chicago: reference audit

`src/models/swissotel-geographic.ts` builds Swissôtel Chicago, 323 East Wacker Drive, for the
geographic layout only. From the geographic camera it stands mostly behind The Buckingham.
Its west corner rises between Three Illinois Center's roof and The Buckingham, closing the
seam where those two models' corners meet. That is outside the excerpt the original layout
is fitted to, so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, published data and photographs, not a survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 641288601](https://www.openstreetmap.org/way/641288601), version 3: the
  tower, a triangle tagged 139 m and 45 levels. It is a part of the hotel's outline,
  [way 95486966](https://www.openstreetmap.org/way/95486966), version 14, which carries the
  same tags. The hotel's podium, [way 95486953](https://www.openstreetmap.org/way/95486953),
  is tagged only as a building. They were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920).
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/swissotel-chicago/4362):
  139.3 m / 457 ft, 43 floors, completed 1989, all-concrete.
- [Wikidata](https://www.wikidata.org/wiki/Q21609099): architect Harry Weese, inception 1988.
- The Skyscraper Center's photographs: a triangular tower of reflective blue-green glass on a
  white podium, beside Three Illinois Center's bronze. Its wall is a flush grid of thin
  mullions and transoms, the panels about a floor tall.
- Wikimedia Commons, [*East Wacker 2*](https://commons.wikimedia.org/wiki/File:East_Wacker_2.JPG),
  2014: the tower beside Three Illinois Center, its panels in about 46 rows above Upper Wacker
  Drive.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At The Buckingham's west
  edge, from 6,878 to 6,904 layer units, the photograph shows a narrow dark strip, its top at
  1,869. The drawing's `buckingham-west` group hatches a strip there.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors | 3.10 m | The published height over OpenStreetMap's 45 levels |
| Roof | 139.3 m | The Skyscraper Center |

The Skyscraper Center counts 43 floors. The model takes OpenStreetMap's 45 levels, nearer the
2014 photograph's 46 rows of panels above Upper Wacker Drive. Either count puts the floors
3.1 to 3.2 m apart.

## Plan

The mapped tower is a triangle, 48.8 m along its south side, its west and north-east faces
about 48 m each to its apex at the north, toward Wacker Drive. A slight kink in the west face
and a jog in the north-east face stay in the model. The mullions are 6 cm wide, about 1.5 m
apart, set out from each face's middle. That spacing is read on the Skyscraper Center's
photographs, and is an estimate.

## Against the photograph

Projected through the geographic camera, the tower's west corner stands at 6,932 layer
units, its roof at 1,864. It is the nearest mapped building behind the seam at 6,997 to
6,999, where Three Illinois Center's north-east corner and The Buckingham's west edge leave
sky; NBC Tower stands farther behind. The
photograph's narrow strip at The Buckingham's edge tops out within 5 units of that corner's
roof, 54 units left of it. The drawing sits about 110 units left of the projection here, so
the strip is not settled as the Swissôtel; see the [label audit](building-labels.md).

## Model

- **Walls:** a flush curtain wall of reflective vision glass and pale opaque floor bands
  (separated in the 2026-10-17 correction below).
  - A mullion on each module.
  - Paired transoms divide an estimated 1.4 m opaque band from the vision pane
    within each retained floor module.
  - A coping at the roof.
- **Roof:** flat.

Colours follow the drawing's greys.

Omitted:

- the block, about 18 by 7.5 m, that the hotel's outline adds to the tower's north-east face;
  it has no height of its own;
- the podium, which carries no height or levels;
- the signs and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof at 139.3 m, and the record's one part;
  - up the south face between mullions, 45 vision panes above distinct opaque bands,
    paired transoms, and the coping;
  - ten panes in ten modules of 1.5 m between mullions;
  - from the photograph's eye, through the skyline camera, the seam's two layer columns meet
    a model at every layer unit from 1,900 to 2,950, the Swissôtel over Three Illinois
    Center's roof;
  - the model's exported palette, whose window tones the frame and bands do not share;
  - opaque bands and frames excluded from room lights and the window-reflection mask;
  - the exact mapped part at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group of eleven buildings: six towers measured on sunlit
faces in the 2008 panorama, as the first three groups were (FID-COL-003 to FID-COL-005), and five
buildings the panorama does not resolve, measured in daytime close-ups calibrated to it. All are
shown at the same exposure.

Source: [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg) on Wikimedia Commons,
Daniel Schwen's panorama of the skyline from the Adler Planetarium, photographed on 16 August 2008
from 22 frames on a Canon EOS 5D with a 150 mm lens (CC BY-SA 4.0; accessed 2026-10-10). Measured in
Commons' 3840 × 551 px rendition,
`https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg` (SHA-256
`a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41`); the photograph is not in the
repository. No change to these materials between 2008 and the drawing's 2013 panorama is known to
this audit.

Identification: `bun scripts/panorama-owners.ts building-swissotel` places the hotel's south face at
x 2070–2112 from row 368, with the photographer's eye fitted as for FID-COL-005, 10 m east and 100 m
south of the drawing's fitted eye, at 1.6 px RMS: a ray from that eye through each pixel meets the
nearest mapped part, which owns the pixel, and the face it meets gives the pixel's direction. The
Buckingham, in front, leaves it the strip at x 2070–2078 below its own roof and the few rows above.
The photograph shows a dark tower of reflective glass, with a light crown, at x 2067–2076, its top
at about row 366, within three pixels of the prediction. The box below lies wholly on that face, as
the script's `--box` option reports and `tests/panorama-owners.test.ts` checks.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. `bun scripts/sample-colours.ts day building-swissotel` downloads
the photograph once, checks its SHA-256, and reproduces these rows and the palette's entries,
decoding in Chrome without colour management.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Curtain wall, south face | 2070, 372, 2077, 465 | all | 651 (100.0%) | `71, 80, 86` | 51–88 / 64–97 / 74–102 |

Decisions in `src/models/colour-palette.ts`:

- `blue-green glass` `71, 80, 86`, the curtain wall's reflective glass as the photograph shows it,
  seven pixels wide; `lit window` and `dim window` take it exactly, since no office lights show by
  day.
- `neutral` stays grey. The white podium is below Grant Park's trees in the photograph.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the view sees a sliver
of its south face beside the Buckingham, partly in its shadow: it renders `50, 56, 61` at its median
against the photograph's `71, 80, 86`, 0.5 in linear light, and 0.75 where it is out of the shadow.


## 2026-10-17 — opaque floor bands and vision windows (FID-SWI-002)

This pass assessed Swissôtel only. The former model treated nearly the full
floor height, including its frames, as reflective glass. Dated close views show
pale horizontal bands alternating with shorter vision panes. The correction
separates those surfaces without changing the mapped triangle, height datum,
camera, original SVG or building inventory.

### Fresh evidence and limits

All sources below were retrieved on 2026-10-17. Third-party photographs remain
outside the repository and are not runtime dependencies.

- Chicago Architecture Today, [*Swissotel — Exterior 6*](https://www.flickr.com/photos/chicagoarchitecturetoday/7883854430/),
  photographed 2012-08-12, uploaded 2012-08-28, according to the source page.
  [Original image](https://live.staticflickr.com/8453/7883854430_e9e85c3763_o.jpg),
  1944 × 2592; SHA-256
  `903b0a1b884f0e86ae4558c9ee572ce73178f41a28374948d82d4c7305c2141b`.
  This pre-2013 view resolves paired panel rows and their thin dividers across
  the river-facing elevation, including the facade's reflected Aqua silhouette.
  The central ordinary floors at x = 1000–1150, y = 1400–1800 provide the ratio below.
- The same photographer, [*Exterior 4*](https://www.flickr.com/photos/chicagoarchitecturetoday/7883854940/),
  same photographed/upload dates on its page.
  [Original image](https://live.staticflickr.com/8039/7883854940_7cd5482899_o.jpg),
  1944 × 2592; SHA-256
  `91302770317ed70554bab03b0f6b82377d9b313a340b64ed947227721899ca95`.
  The wider view shows the same alternating bands on the adjoining elevation
  and distinguishes the entrance/lower-level exceptions from the ordinary stack.
- Facade contractor Enclos, [*Swissôtel Chicago*](https://enclos.com/project/swissotel-chicago/):
  documents a 45-storey, 457 ft tower and its own facade project. Its
  [header image 11](https://enclos.com/wp-content/uploads/2020/06/ENCLOS_Projects_Swiss%C3%B4tel_Chicago_11_3000x1500-scaled.jpg),
  2560 × 1280, SHA-256
  `86d2c4d5f5028d9561061ec6abe81d0af80da51da8c57eab346844ff15758231`,
  resolves the pale bands, thin frames, dark vision panes with visible interior
  lights, and a separate dark crown opening. The inspected ordinary-panel
  region is x = 800–1300, y = 650–1100. Photograph date is **unknown**;
  the upload path is not treated as a capture date. It corroborates the material
  interpretation but does not establish the 2013 era by itself.
- Lee Bey's firsthand [WBEZ account, 2011-03-16](https://www.wbez.org/culture/2011/03/16/baby-theres-a-shark-near-the-water-the-blade-edged-swissotel-still-looks-sharp-after-20-years)
  identifies both opaque and reflective glass on the facade. Combined with
  the dated band pattern and Enclos's visible interior lights, this supports
  interpreting the pale bands as opaque spandrels and the adjacent darker
  panels as vision glazing. The article's linked detail images returned 404
  and were **not inspected**; no dimension is taken from them.
- Fresh OpenStreetMap API reads of the [tower part 641288601](https://api.openstreetmap.org/api/0.6/way/641288601/full.json)
  (v3), [hotel outline 95486966](https://api.openstreetmap.org/api/0.6/way/95486966/full.json)
  (v14) and [podium 95486953](https://api.openstreetmap.org/api/0.6/way/95486953/full.json)
  (v3) retain 45 levels / 139 m on the tower and outline, and no height or
  level count on the podium. The omitted north-east block and podium still
  lack independent elevations; this pass does not invent their heights.

### Ratios and material decisions

The ordinary bands are **observed**; their exact construction and dimensions
are not documented. In *Exterior 6*, at original-image x ≈ 1050, the pale bands
span y ≈ 1400–1434, 1476–1512 and 1557–1596. Their adjacent dark panes extend
1434–1473, 1512–1554 and 1596–1641. Allow about 3 px for each thin divider and
±3 px at boundaries. Reading the original visually and checking the five-pixel
column mean against 125/255 brightness gives a pale-band share around 45%,
with roughly ±6 percentage points of uncertainty. Brightness separates these
particular samples; it is not a general opacity classifier or an RGB calibration.

Apply **1.4 ± 0.2 m** of the existing 139.3/45 ≈ 3.10 m pitch to the opaque
band (45%). A 6 cm transom separates it from the vision pane; retain the
existing floor-line transom, vertical 1.5 m grid and 6 cm frame widths.
The absolute band height and transferring the ordinary module around all faces
are **inferences**. Enclos independently supports the 45-storey count, but does
not settle the older 43-floor citation, mechanical rows or Upper Wacker datum.
FID-SWI-001 therefore stays open; no floor count or overall height changes here.

Opaque bands use a distinct pale grey (`0x909090`) and the existing frame grey
stays distinct from every window tone. These are explicit neutral fallbacks,
chosen to retain the photographed pale-band/dark-pane hierarchy; neither is
claimed as a sunny-day colour measurement. The 2008 panorama's seven-pixel-wide
curtain-wall sample mixes the surfaces. It remains on vision glass provisionally;
it does not supply a separately calibrated spandrel or metal colour.
`colour-palette.ts` consequently gives `opaque spandrel` and `aluminium` null
entries. FID-SWI-004 retains separate colour and surface-gloss calibration.

Frames and opaque bands no longer receive the viewer's vision-window reflection
mask or room-light mask. This approximates opaque surface response within the
existing material system; real glass-backed spandrels can still reflect their
surroundings, as the photographs show. Their own gloss response remains
unresolved rather than being represented as illuminated room glazing.
The closed facade skin and its end clearances remain intact. Ordinary-floor
bands still continue through the simplified base/crown: entrance, podium,
curved corner glass and crown vent exceptions remain FID-SWI-003.

### Acceptance

Raycasts require 45 shorter vision panes, opaque surfaces at 0.5/1.3 m above
module bases, a divider near 1.4 m and glass at 1.5 m. Existing mapped grade,
roof and skyline-seam checks remain. A separate regression checks the actual
colour and lighting attributes: frames and bands stay neutral, do not emit room
light and do not receive the window reflection effect; vision windows remain
eligible. Geometry closure, winding and overlap checks passed.

Matched 1600 × 1000 reduced-motion captures use front/side building detail and
skyline/quarter placement views, in grayscale and sunny-day colour. Camera metadata and artifact names are retained in
[fidelity/swissotel-bands-captures.json](fidelity/swissotel-bands-captures.json).
Detail URLs are `building-detail.html?building=building-swissotel` with front
and side presets; placement uses `skyline-3d.html?controls=open`, skyline and
quarter presets. Each is toggled to sunny-day colour and back.

| View | Grayscale before / after | Daylight before / after |
| --- | --- | --- |
| Front | [before](fidelity/swissotel-bands-front-grey-before.png) / [after](fidelity/swissotel-bands-front-grey-after.png) | [before](fidelity/swissotel-bands-front-day-before.png) / [after](fidelity/swissotel-bands-front-day-after.png) |
| Side | [before](fidelity/swissotel-bands-side-grey-before.png) / [after](fidelity/swissotel-bands-side-grey-after.png) | [before](fidelity/swissotel-bands-side-day-before.png) / [after](fidelity/swissotel-bands-side-day-after.png) |
| Skyline | [before](fidelity/swissotel-bands-skyline-grey-before.png) / [after](fidelity/swissotel-bands-skyline-grey-after.png) | [before](fidelity/swissotel-bands-skyline-day-before.png) / [after](fidelity/swissotel-bands-skyline-day-after.png) |
| Quarter | [before](fidelity/swissotel-bands-quarter-grey-before.png) / [after](fidelity/swissotel-bands-quarter-grey-after.png) | [before](fidelity/swissotel-bands-quarter-day-before.png) / [after](fidelity/swissotel-bands-quarter-day-after.png) |

Visual review finds the repeated pale bands and shorter dark panes in both
close views and both modes. Placement and the narrow visible skyline sliver
remain consistent. The first neutral band value made the bands darker than
vision glass in daylight; the final pale fallback restores the observed
hierarchy without introducing an unsourced hue. One capture attempt failed the
exact restoration check at the front view. The unchanged final rerun passed
all four views, retained matching cameras and restored grayscale byte for byte;
its successful captures replace the partial attempt. Material/grayscale and
lighting-mask regressions pass. Full shipping validation and independent review
are recorded in the pull request.
