# Heritage: geographic facade reconstruction

The geographic Heritage model uses the same east/north meter coordinates as the
rest of the comparison. The original illustration model is unchanged. This is
a source-informed exterior study, not an as-built survey or a construction model.

## References checked September 17, 2026

- [City of Chicago, Planned Development 787](https://gisapps.chicago.gov/gisimages/zoning_pds/PD787.pdf):
  PDF pages 49–52 show the ninth-floor terrace, lower tower, 28th-floor terrace,
  and upper tower plans. Pages 53–57 show the four elevations and building
  section. Page 60 shows the retained Wabash storefronts. The drawings are
  dated June 14, 2001; they describe the design, not a measured completed building.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897):
  completed height 192.4 m, highest occupied floor 176.8 m, 57 above-ground floors.
- [Walsh Construction project description and photograph](https://www.walshgroup.com/ourexperience/building/highriseresidential/theheritageatmillenniumpark.html):
  floors 9–57 are residential, with mechanical penthouses above. The contractor
  describes preserving four historic Wabash facades. Its east-side photograph
  provides a completed-building check on the lower wing, pale framing, dark
  glazing, upper crown and mechanical screen. Walsh counts 59 stories including
  the mechanical penthouses; this does not require 59 residential window rows.
- [OpenStreetMap ground outline 147397547](https://www.openstreetmap.org/way/147397547)
  and parts 686199648/649/650: local coordinate snapshot and attribution remain
  in `skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Ninth-floor/podium terrace | 32.8176 m | Section 63743: 107 ft 8 in |
| Lower-wing / 28th-floor terrace | 89.5096 m | Section 63743: 293 ft 8 in |
| Highest occupied floor | 176.8 m | Completed-building CTBUH value |
| Main roof | 181.2036 m | Section 63743: 594 ft 6 in |
| Mechanical screen / architectural top | 192.4 m | Completed-building CTBUH value |

The design drawing's upper roof is 623 ft 8 in (190.0936 m), below the published
completed height. The model uses the completed 192.4 m top; it does not silently
scale every intermediate floor to reconcile that difference. Intermediate
residential floors are interpolated between levels 9, 28 and 57. Those floor
spacings and the design terrace/roof elevations remain estimates of the built
condition. They supersede the initial generic 84.4 m lower wing and 20.3 m podium.

## Plan and detail choices

- The entire ground outline is retained exactly in projected coordinates
  (approximately 51.3 × 87.1 m). A complete podium supports both residential
  wings. Ground placement has no illustration-derived rotation or scale.
- The upper tower follows the mapped curved/faceted polygon and stepped end
  returns. The lower east wall bows inward by an estimated 2.1 m between its
  mapped endpoints, following the concavity visible in the lower-floor plans.
  This affects the elevated wing, not the street-level footprint.
- Window modules, mullions, six-floor bands, crown fins, balcony rails, and
  roof louvers are rebuilt at meter scale using the existing building kit.
  They reuse the original model's modeling approach rather than stretching its
  exaggerated facade. Window counts and relief depths are approximations. Colors
  follow the original artwork's neutral gray palette: charcoal glazing and trim,
  gray precast, and occasional lighter windows, rather than photographic colors.
- The upper crown has inset glazing behind taller fins. A separate mechanical
  enclosure and louver screen reach the published top; the whole tower footprint
  is no longer extruded to that height.
- Four historic facade groups on Wabash use separate masonry tones and arched
  openings, alongside modern retail/parking facades. Fine ornament, individual
  storefront alterations, landscape planting and roof furnishings are omitted.
- The rooftop enclosure, balcony depths, facade bay spacings and crown setbacks
  are visually inferred. No claim of survey precision is made for those details.

All runtime geometry is local JavaScript. Reference images/PDFs are research
inputs only and are not downloaded by the viewer or redistributed with the site.

## Verification

`bun run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. Ground extents use vertices at grade: facade
relief and balcony overhangs above grade must not redefine the street footprint.
Visual review includes east, west, north and orthographic overhead views.

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
measured first, place it at x 1441–1527 with its roof near y 312; the fit holds those six within
about 25 pixels across and 4 pixels in height. It is the glass tower with white frames at x
1468–1516 whose roof stands at y 310.

Method: each sample is a box in the rendition's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, or all of them, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue.
`bun scripts/sample-colours.ts day building-heritage-at-millennium-park` downloads the photograph
once, checks its SHA-256, and reproduces these rows and the palette's entries, decoding in Chrome
without colour management. The building is about 48 pixels wide in the rendition, so single pixels
mix neighbouring materials, which the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Frame, sunlit | 1468, 315, 1480, 395 | sat 0–0.15, val 0.65–1 | 417 (43.4%) | `216, 218, 214` | 196–227 / 199–232 / 200–228 |
| Glass | 1482, 315, 1514, 395 | val 0–0.6 | 2,266 (88.5%) | `71, 88, 97` | 57–91 / 73–106 / 82–113 |

Decisions in `src/models/colour-palette.ts`:

- `limestone` `216, 218, 214`, the white frame, measured on the narrow white face at the tower's
  left.
- `green glass` `71, 88, 97`, the main face, a blue-green grey; `lit window` takes it exactly, since
  no office lights show by day. `bronze`, the mullions and slab edges, takes it exactly too: at this
  scale the photograph's face is glass and mullions together, so the measured value is their mix.
- `concrete` (the penthouses and ground footprint), `buff brick` (the Wabash facades, behind the
  trees and other buildings) and `neutral` stay grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the glass renders
`34, 51, 65`, 0.36 of the photograph's brightness in linear light: the view sees the tower's faces
in the scene's shade. The frame renders `171, 177, 180`, 0.63.
