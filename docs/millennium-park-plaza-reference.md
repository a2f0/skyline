# Millennium Park Plaza: reference audit

`src/models/millennium-park-plaza-geographic.ts` builds Millennium Park Plaza, 151–155 North
Michigan Avenue, for the geographic layout only. The drawing shows it in front of Michigan
Plaza as its group `michigan-plaza-front-tall`, which the original audit left
unidentified. The geographic camera names it; see the
[building audit](building-labels.md#names-from-the-geographic-camera). The original layout
has no model of it. The model is a reconstruction from published data, OpenStreetMap, the
drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 127107026](https://www.openstreetmap.org/way/127107026), version 7:
  the outline, 40 levels to 122 m. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  later than the rest of the extract.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/millennium-park-plaza/10316):
  - 121.9 m (400 ft) architectural height and tip;
  - 40 storeys, all concrete;
  - residential and office use;
  - completed 1982, by Reinheimer & Associates.
- [YoChicago](https://yochicago.com/millennium-park-plaza-apartments-151-n-michigan-ave-new-east-side/):
  - opened in 1982 as Doral Plaza;
  - offices on the first seven floors;
  - 550 apartments above.
- [WBEZ](https://www.wbez.org/morning-shift/2017/08/03/whats-that-building-how-millennium-park-changed-one-michigan-avenue-high-rise):
  a 40-storey brown building, its street front once one long slab of concrete.
- Photographs on Wikimedia Commons:
  - [the skyline from the lakefront](https://commons.wikimedia.org/wiki/File:Chicago_buildings_(15348954993).jpg),
    near the drawing's vantage: the pale slab between the Crain Communications Building
    and One Prudential Plaza;
  - [the view north from Millennium Park](https://commons.wikimedia.org/wiki/File:Chicago_buildings_-_view_from_the_Millennium_Park_(15966595351).jpg).
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront, where
  the narrow south end shows four dark window strips in a lit wall.

## Plan and placement

The mapped outline is a slab 21 m wide and 90 m long along Michigan Avenue, its south end
17.1 m across between chamfers of about 2.4 and 2.9 m. Projected through the geographic
camera, the south end and its western chamfer span 114 layer units where the drawing
has 127. The corner where the south-east chamfer begins lands within a unit of the
drawn one across; the drawn top stands about 12 units, a metre, lower. The drawn east face stops where One Prudential Plaza, nearer the camera,
covers the rest of it.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–4.4 m | Estimate |
| Office floors | 3.7 m, floors 2 to 7 | Estimate: seven office floors, published |
| Apartment floors | 2.8 m, floors 8 to 40 | Estimate: the published 40 storeys under the parapet |
| Parapet's top | 121.9 m | Published; mapped 122 m |

Read on its own, the drawn top stands about a metre under the published one: the camera
places this tower well. The drawing shows no floor lines, so the floor levels are
estimates.

## Model

A concrete slab to the published top:

- The narrow ends are solid wall but for four window strips, 1.25 m wide and symmetrical
  about each end's middle, as the drawing and photograph show. The strips run from the
  eighth floor, the first of apartments, with the top floor's window standing apart over
  each.
- Below them, the south offices' windows sit between continuous outer concrete piers (updated 2026-10-17); the north office end retains the older full-width approximation.
- The long faces carry a punched window in every 3 m bay between 0.8 m piers.
- The chamfers are solid.
- The south end has closed concrete panels and shallow horizontal joints on the existing estimated floor cadence; the north end remains unsplit.

The drawing renders the tower in mid greys, which the palette follows rather than the brown
of the concrete.

Omitted:

- the storefronts and entrances;
- the roof's equipment;
- any detail of the long faces beyond their window grid, which the drawing does not show.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the published top;
  - on the south end:
    - a strip's window, the strip between windows, and the wall between strips;
    - the top window, standing apart over its strip;
    - an office floor's window;
  - on the east face, a window and a pier;
  - the south-east chamfer's wall;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

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
measured first, place it at x 1633–1696 with its roof near y 383; the fit holds those six within
about 25 pixels across and 4 pixels in height. It is the light tower at x 1630–1646, roof at y 381,
in front of 330 North Wabash; only its sunlit narrow face shows clear of its neighbours.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue.
`bun scripts/fidelity/sample-colours.ts day building-michigan-plaza-front-tall` downloads the photograph
once, checks its SHA-256, and reproduces these rows and the palette's entries, decoding in Chrome
without colour management. The building is about 14 pixels wide in the rendition, so single pixels
mix neighbouring materials, which the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Precast, sunlit | 1631, 385, 1645, 450 | sat 0–0.3, val 0.5–1 | 656 (72.1%) | `229, 214, 201` | 211–243 / 200–228 / 186–212 |
| Glass | 1631, 385, 1645, 450 | val 0–0.35 | 145 (15.9%) | `60, 52, 42` | 45–77 / 35–68 / 23–59 |

Decisions in `src/models/colour-palette.ts`:

- `concrete` `229, 214, 201`, the precast walls, a warm white.
- `glass` `60, 52, 42`, a bronze tint, 15.9% of the box; `lit window` and `dim window` take it
  exactly, since no office lights show by day.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the precast renders
`185, 176, 170` under the photograph's rule, 0.65 of the photograph's brightness in linear light.

## 2026-10-17 — south office piers and panel joints (FID-MPP-002)

This pass assessed Millennium Park Plaza. The former south office rows glazed
the full width of the narrow end, interrupting the outer concrete piers; the
solid upper end was one uninterrupted surface. Dated photographs show the
piers continuing beside the office glazing and horizontal joints across the
solid panels. This pass restores those features on the **south end only**.
The original drawing, mapped outline and 121.9 m top remain unchanged.

### Dated evidence

Retrieved 2026-10-17. Source images stay outside the repository.

- Charles William Brubaker, [*Doral Plaza, North Michigan Avenue*](https://collections.carli.illinois.edu/digital/collection/uic_bru/id/376/),
  UIC collection, original dated **1980**, identifier `bru003_09_fF`. The library
  describes a northeast-looking view during construction. Its
  [full image](https://collections.carli.illinois.edu/digital/iiif/uic_bru/376/full/full/0/default.jpg)
  is 1969 × 3000, SHA-256
  `d1f846b1d163be36633005993b91fdcfbf78634ffedfad6c7b0ebb2887ed7cc7`.
  The south concrete frame and office glazing are clear at approximately
  x = 920–1330, y = 1900–2670; the upper end's horizontal panel joints are
  visible above. Construction-era ground finishes are not carried into 2013.
- Kelly Martin, [*Michigan Ave at Washington 2*](https://commons.wikimedia.org/wiki/File:Michigan_Ave_at_Washington_2.jpg),
  two photographs taken **2005-08-26**, stitched by the photographer. The
  [1582 × 2255 composite](https://upload.wikimedia.org/wikipedia/commons/7/7a/Michigan_Ave_at_Washington_2.jpg)
  has SHA-256 `520fddb40d4d8eded9012a41e2062e906abd44b30ce46fcaf6156a63cf5bdb19`.
  The south end is approximately x = 1050–1315, y = 690–2000. It corroborates
  continuous outer piers beside the lower glazing and horizontal upper-panel
  joints. Stitching and perspective prevent treating it as an elevation.
- TonyTheTiger, [*20080602 Wrigley Square*](https://commons.wikimedia.org/wiki/File:20080602_Wrigley_Square.JPG),
  own photograph **2008-06-02**, EXIF 13:01. The
  [2304 × 3072 original](https://upload.wikimedia.org/wikipedia/commons/4/46/20080602_Wrigley_Square.JPG)
  has SHA-256 `eb2b1dc5b6e4a0e1815c651d316f42d2717789d315a76a3db4f2559cc8e7d6bc`.
  The south end is approximately x = 410–840, y = 130–1980. Its clear upper
  panel joints repeat with the window-row cadence; the lower glazing sits
  between solid outer piers. The park monument and trees hide the lowest
  entrance details, so those remain unresolved.

The dated images establish the pattern before the panorama's 2013 era. They
support continuing the existing outer solid columns down beside the south
office windows. They do **not** independently determine the present model's
1.25 m window-strip widths, exact floor elevations or construction joint sizes.
The office opening retains the span between the outermost apartment strips,
about 9.45 m within the 17.1 m end, as an approximation; its pane count and
mullions still need a measured elevation.

### Implementation and limits

Closed concrete panels cover the south end's solid columns, with horizontal
joints on the inherited estimated levels. The outer columns continue through
the six upper office rows; the inner solid columns start at the apartment
zone. The generic ground-floor treatment is unchanged. A 0.05 m joint and
0.03 m recess provide schematic relief, not claimed centimetre measurements.
Panel end caps clear the backing skin's end-cap planes, and the top panel stops
1 cm below the existing cap to avoid same-facing coplanar surfaces.

The continuous closed skin backs the joints. Its darker gray is concrete
shading, classified separately from glass; the panel fronts use the existing
concrete tone and sunny-day swatch. No new chromatic sample is introduced.
Opaque office piers consequently stop receiving the room-light and
vision-glass classifications inherited by the former full-width glazing.

The north end is not inferred from the south for this addition. Long-face
window grouping, substantial projecting piers, the upper mechanical band and
roof equipment also remain unresolved. The Brubaker photograph shows the west
face's grouped glazing and a distinct office/apartment transition. Aapel's
[*From prudential building 2*](https://commons.wikimedia.org/wiki/File:From_prudential_building_2_-_panoramio.jpg)
shows the east roof and broad piers (2974 × 4074, SHA-256
`6184ab45602bd2a4bb3210e9f0e5d420806bfd0c07cec42a8855313a46dc9278`);
**2009-01-02 is its upload date**, only a latest possible capture date. The
close foreground cuts off part of the long face, so it does not settle total
bay count. FID-MPP-001 retains the long-face work, and FID-MPP-003 retains the
roof and unmeasured end details.

The owner's [current site](https://www.millenniumparkplaza.com/) also provides
[a 13.08-second roof video](https://www.millenniumparkplaza.com/assets/images/mpp_cover.mp4)
(1920 × 1080, SHA-256 `286216857acd010a7dc01e455771f829e7c1cf811f946c1344b874ff6e996b42`).
Its capture date is unknown; the server's 2024 modification date is not a
capture date. It is a lead for roof research, not evidence for adding its
present details to 2013. The architect's [recent addition](https://theljc.com/projects/millennium-park-plaza)
also postdates the target era and is not added here.

### Acceptance

Targeted raycasts retain the four apartment strips, top windows, central
south office glazing, long-face grid, solid chamfer and exact mapped grade.
New probes require opaque outer piers on office and apartment floors and a
physical 0.03 m setback at representative joints, not just painted lines.
Geometry closure, winding and coplanar-overlap checks pass after correcting
panel-end overlap. Material classification and grayscale checks pass.

Matched front/side and skyline/quarter captures use both grayscale and sunny
daylight, fixed 1600 × 1000 viewports and reduced motion. Their metadata,
artifact names and exact colour-off restoration are recorded in
[fidelity/millennium-panels-captures.json](fidelity/millennium-panels-captures.json).
Detail uses `building-detail.html?building=building-michigan-plaza-front-tall`;
placement uses `skyline-3d.html?controls=open` with the named presets.
The side preset shows the unchanged north end/west face and is byte-identical
in both phases; its artifact is reused explicitly. After integrating the final Sheraton crown treatment, both phases were refreshed: only the four quarter-view images changed, all cameras matched and all four views restored grayscale exactly. The piers are visible at the default detail scale; the fine
panel joints are chiefly a close-inspection detail. Full shipping validation
and independent review will be recorded in the pull request.

| View | Grayscale before / after | Daylight before / after |
| --- | --- | --- |
| Front | [before](fidelity/millennium-panels-front-grey-before.png) / [after](fidelity/millennium-panels-front-grey-after.png) | [before](fidelity/millennium-panels-front-day-before.png) / [after](fidelity/millennium-panels-front-day-after.png) |
| Side | [before](fidelity/millennium-panels-side-grey-before.png) / [after](fidelity/millennium-panels-side-grey-before.png) | [before](fidelity/millennium-panels-side-day-before.png) / [after](fidelity/millennium-panels-side-day-before.png) |
| Skyline | [before](fidelity/millennium-panels-skyline-grey-before.png) / [after](fidelity/millennium-panels-skyline-grey-after.png) | [before](fidelity/millennium-panels-skyline-day-before.png) / [after](fidelity/millennium-panels-skyline-day-after.png) |
| Quarter | [before](fidelity/millennium-panels-quarter-grey-before.png) / [after](fidelity/millennium-panels-quarter-grey-after.png) | [before](fidelity/millennium-panels-quarter-day-before.png) / [after](fidelity/millennium-panels-quarter-day-after.png) |
