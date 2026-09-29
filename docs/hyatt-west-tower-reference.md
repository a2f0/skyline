# Hyatt Regency Chicago West Tower: reference audit

`models/hyatt-west-tower-geographic.ts` builds the Hyatt Regency Chicago's West Tower, 151
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

Colours follow the drawing's greys, warmed toward the brick's red-brown.

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
