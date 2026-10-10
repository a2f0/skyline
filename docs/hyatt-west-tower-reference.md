# Hyatt Regency Chicago West Tower: reference audit

`src/models/hyatt-west-tower-geographic.ts` builds the Hyatt Regency Chicago's West Tower, 151
East Wacker Drive, for the geographic layout only. From the geographic camera it stands
between Aon Center and the Blue Cross and Blue Shield Tower. There the drawing's Blue Cross
group paints a dark brown sliver, which no model filled. That is outside
the excerpt the original layout is fitted to, so the original layout has no model of it.
The model is a reconstruction from OpenStreetMap, published data and photographs, not a
survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 235920252](https://www.openstreetmap.org/way/235920252), version 4:
  the tower's part of the hotel's outline, [way 235920251](https://www.openstreetmap.org/way/235920251),
  tagged 33 levels and 111 m. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. The hotel's outline also covers the East Tower, 201 East Wacker,
  which the map does not part out.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/hyatt-regency-chicago-west-tower/13132):
  the West Tower, 111.3 m / 365 ft, 33 floors, completed 1974, A. Epstein and Sons.
- [Emporis, archived in 2016](https://web.archive.org/web/20160314024410/http://www.emporis.com/buildings/116745/hyatt-regency-chicago-i-chicago-il-usa):
  "Height (roof) 365.00 ft", 33 floors, "Facade material brick", "Facade color dark
  orange".
- [A. Epstein and Sons](https://www.epsteinglobal.com/news/throwback-thursday-hyatt-regency-chicago):
  the hotel opened in August 1974 with "a four-inch thick pre-fabricated brick skin".
- The Skyscraper Center's photograph of the tower: red-brown brick with narrow window slots,
  continuous from the base nearly to the roof, solid brick at the corners, and a plain band at
  the top.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). Between Aon and the Blue
  Cross tower, from 5,404 to 5,453 layer units, the photograph shows a dark brown tower:
  - two slots of lit windows, about 3.8 m apart;
  - a plain band about 7 m deep under a flat top at 2,067.

  The drawing paints the same, two dark slots about 3.3 m apart under a plain top block.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Typical floor | 3.37 m | The published 111.3 m over 33 floors |
| Lobby | 0–3.07 m | Glass along every face |
| Windows | 2.1 m tall | Estimate: 80 cm over each floor, second to thirty-first |
| Plain band | 104.1–111.3 m | Photograph: over the thirty-first floor's windows, the top two floors without slots |
| Roof | 111.3 m | Published |

Projected through the geographic camera, the published roof stands at about 2,138 layer units,
71 under the photograph's top. Around Aon the camera reads roofs low by as much: Aon's own
projects 42 to 58 units under the drawn one. The model keeps the published height.

## Plan

The mapped part is 28.3 m east to west and 63.1 m north to south, with a notch in its west
side. It projects from 5,317 to 5,712 layer units, behind Aon and the Blue Cross tower
except in the gap between them.

The slots are 1 m wide on a 3.5 m module, the photograph's and the drawing's spacing between
them, set out from each face's middle. Each face has as many as leave at least 2 m of solid
brick at its ends.

## Model

- **Walls:** brick.
  - The lobby's glass along every face.
  - A window in each slot on each floor from the second to the thirty-first, a spandrel
    between.
  - The plain band over the top two floors.
- **Roof:** flat.

Colours follow the drawing's greys.

Omitted:

- the East Tower and the hotel's low wings, which the map does not part out and the
  photograph does not show here;
- the lobby's glazed atrium and the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof at 111.3 m, and the record's one part;
  - five slots in five modules on the east face, a slot's edges and width;
  - up a slot, the lobby's glass and a window on each floor to the thirty-first, a spandrel,
    and the plain band;
  - the twelfth and thirty-first floors' sills and heads, and the band from the last head;
  - solid brick at the face's ends;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped part at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from a close-up calibrated to Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group of nine buildings: four towers measured on sunlit
faces in the 2008 panorama, as the first three groups were (FID-COL-003 to FID-COL-005), and five
buildings the panorama does not resolve, measured in daytime close-ups calibrated to it. All are
shown at the same exposure.

Sources:

- [Hyatt Regency Chicago, circa 2007.jpg](https://commons.wikimedia.org/wiki/File:Hyatt_Regency_Chicago,_circa_2007.jpg)
on Wikimedia Commons, by Atomic Taco on the English Wikipedia, uploaded on 4 July 2007: the hotel's
two brick towers under an overcast sky, from the north, with Aon behind them; its description names
the right-hand tower the West Tower (CC BY-SA 2.5; accessed 2026-10-10). Measured in Commons' 1280 ×
960 px rendition,
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Hyatt_Regency_Chicago%2C_circa_2007.jpg/1280px-Hyatt_Regency_Chicago%2C_circa_2007.jpg`
  (SHA-256 `a338fcff7fa4a962ff8a176d7a29158ce5f8da154e3e266bf3bcabc7a7499ac3`).
- [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg), Daniel Schwen's 2008 daytime
panorama the trial's colours come from (CC BY-SA 4.0), for the reference: Aon's white granite,
sunlit there at `223, 223, 221` (`aon-reference.md`, FID-COL-003).

Neither photograph is in the repository. In the panorama the tower shows between Aon and Blue Cross
at x 1884–1894 (`bun scripts/panorama-owners.ts building-hyatt-regency-west-tower`), four or five
pixels to a face, where the rendition's colour, stored at half resolution, mixes with its
neighbours': its sunlit brick there measures a neutral `127, 123, 127`, so the panorama gives its
brightness but not its colour.

Method: each sample is a box in the close-up's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, and the per-channel sRGB
median of those pixels (0–255), with their count, their share of the box and the quartiles of red,
green and blue, as in the panorama.
`bun scripts/sample-colours.ts day building-hyatt-regency-west-tower` downloads the photographs
once, checks their SHA-256, and reproduces these rows, the calibration and the palette's entries,
decoding in Chrome without colour management.

Calibration: the close-up's colours are carried into the panorama's light through a reference beside
them, on the same front and in the same light, that the panorama shows sunlit. Each channel's ratio,
in linear light, between the reference's median in the panorama and its median in the close-up
scales the close-up's medians, and the colour is scaled back to white if it passes, keeping its hue:
the same arithmetic as FID-COL-005's shade estimate (`scripts/lib/shade.ts`).
`tests/colour-shade.test.ts` re-derives the palette's calibrated entries from the medians below. The
calibration assumes the reference and the building share one light and that the reference's material
reads the same on its two faces; it carries a close-up's exposure, white balance and light, not its
viewpoint, so it is provisional, like the shade estimate.

Here the reference is Aon's granite behind the towers, under the same cloud: `163, 165, 168` there
(box 530, 130, 610, 380, sat 0–0.12, val 0.6–1, the rule of Aon's panorama sample; 7,365 pixels,
36.8%), against `223, 223, 221` in the panorama, a ratio of 2.01, 1.96 and 1.85 in red, green and
blue. Aon stands several hundred metres behind the hotel, and haze over it would lighten it in the
close-up, which would make the calibrated brick too dark.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Brick, overcast | 740, 150, 930, 550 in the close-up | hue 340–50, sat 0.12–1, val 0.15–1 | 48,154 (63.4%) | `72, 61, 55` | 66–77 / 55–69 / 50–62 |
| Brick, south face, panorama, for comparison | 1885, 400, 1889, 434 in Chicago.jpg | val 0.35–1 | 98 (72.1%) | `127, 123, 127` | 87–140 / 88–134 / 98–136 |

Decisions in `src/models/colour-palette.ts`:

- `orange brick` `101, 85, 75`, calibrated from `72, 61, 55`: the tower's brown brick piers and
  spandrels. This is 0.47 of the panorama strip's `127, 123, 127` in linear light. The strip's
  brightness is the tower's only where its few pixels are wholly lit brick, and haze lightening Aon
  in the close-up would make the calibration too dark, so the brick may be up to twice as bright as
  calibrated; its colour, which the strip cannot give, is the close-up's.
- `bronze glass`, `dark metal`, `lit window` and `dim window` stay grey: the windows reflect the
  overcast, and the metal is not resolved.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the view sees a sliver
of its south face between Aon and Blue Cross, whose brick renders `100, 84, 74` against the
calibrated `101, 85, 75`, 0.98 in linear light, and 0.46 of the panorama strip's.
