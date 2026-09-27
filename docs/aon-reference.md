# Aon Center: reference audit

Two models share one tower. `models/aon-tower.ts` builds it from an outline and the
heights below; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Skyline copy | `createAonCenterBuilding` in `models/aon-center.ts` | Clean 59.15 m square, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createAonGeographicBuilding` in `models/aon-geographic.ts` | The mapped outline and rooftop part, exactly | Geographic layout |

Both are reconstructions from published data and one photograph, not a survey or
construction drawings.

## References checked September 27, 2026

- [OpenStreetMap ground outline 64388609](https://www.openstreetmap.org/way/64388609)
  and rooftop part 284775635. The local coordinate snapshot and attribution remain in
  `models/skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/aon-center/339):
  346.3 m architectural height and a 362.5 m antenna tip.
- [Wikipedia](https://en.wikipedia.org/wiki/Aon_Center_(Chicago)): 83 floors, a tubular
  steel frame with V-shaped perimeter columns, and the Carrara marble cladding replaced
  by Mount Airy white granite in 1990–1992.
- [WikiArquitectura](https://en.wikiarquitectura.com/building/aon-center/): a 59.15 m
  square framed tube, "15 vertical bands of black windows on each side of the building,
  embedded between white triangular pillars", 3.86 m between floors, and a two-level
  plaza around it.
- The [Aon Center tenant portal](https://www.aoncenter.info/main.cfm?pid=aboutaon&sid=about),
  the [Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/aon-center),
  and the [recladding engineer's project profile](https://www.wje.com/assets/pdfs/projects/Amoco_Building.pdf).
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). Across the
  tower's full silhouette, 6.2 photo pixels are one metre at Aon.

## Plan

The tower is a 59.15 m square with a notch cut into each corner. Each main face holds
fifteen 10 ft (3.048 m) bays between V-shaped columns, the fifteen bands of windows
that the descriptions, the drawing's fifteen strips per face, and the photograph all
count. In the photograph, the south face's lit crown spans 246 pixels at a 3.03 m bay
pitch, and the dark notch beside it about 52. Fifteen bays predict 243 pixels, and a
6.7 m notch predicts 57. The mapped outline's notches run about 1.5 m deeper, leaving
its faces 42.5 m, room for fourteen bays.

| Feature | Mapped | Clean plan |
| --- | --- | --- |
| Outline | 59.2 × 60.3 m, faces within 1° of the grid | 59.15 m square |
| Main face | 42.5 m, fourteen bays of 3.04 m | 45.72 m, fifteen bays of 3.048 m |
| Corner notch | 7.7–8.9 m along each face: chamfer, square step, chamfer | 6.715 m: 1.9 m chamfer legs, 2.9 m step |
| Rooftop enclosure | Part 284775635, 31.6 × 32.8 m, centred | 32 m square, centred |

The geographic model keeps the mapped outline to the millimetre; its grade vertices are
the mapped footprint's. Where the trace splits a face into nearly collinear pieces, the
facade stands on the whole face's chord. The clean plan uses the published square and
the counted bays.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–11.9 m | What eighty office floors leave below the crown; estimate |
| Office floors | 80 at 3.87 m | Photograph 3.87 m (24.0 px), WikiArquitectura 3.86 m |
| Louvered crown | 321.5–338.5 m | Photograph: the lit band's top and bottom |
| Granite cap | 338.5–340 m | Photograph; OSM shaft top 340 m |
| Rooftop enclosure | 340–346.3 m | OSM part top, the published architectural height |
| Antenna | to 362.5 m | Published tip; at the enclosure's centre, since the map gives no antenna |

The lobby, eighty office floors, and the crown's two mechanical floors make the published
83.

## Tube

The V-shaped columns are granite prisms 1.3 m wide on the wall, pointing 0.7 m out,
from just above grade to the cap. Their size is an estimate from the photograph's
double-edged column shadows. Between them, each office floor has a ribbon of dark glass
0.8–3.1 m above the floor, cut into panes at the columns, with a few lit or dimmed. The
spandrels between floors stay dark. The lobby is a single tall storey of glass. The
crown's louvers are horizontal blades across each face behind the columns. The granite
cap stands clear of the columns' points and follows the notches, mitred at every corner.
The notches themselves are solid stone, as the photograph's lit corner strips and the
drawing's broad corner strips show. The rooftop enclosure has louvered walls, and a
slim mast rises from its centre.

Omitted: the plaza and its fountain, entrances, signage, aviation lights, and rooftop
equipment other than the enclosure and mast. Colours follow the original artwork's
grayscale palette.

## The skyline copy

The drawing shows Aon from the photograph's treeline up, and the skyline study's platform
datum is that treeline. The skyline copy is the tower from 30.6 m above the street, and
`skyline-study.ts` scales it by 1.329, turns it 10.2°, and places it. These were fitted
through the skyline camera at all five test layouts. The fit used the drawn roof edge's
ends and near corner, the fifteen drawn piers on each face, and seventy-three of the
drawn floor bands. The rotation turns the copy's faces to meet the camera at about 31°,
as the real tower meets the photograph. Depth keeps the earlier placement, since the
drawing cannot fix it.

The copy keeps the building's proportions at a uniform 1.329. Stretching its height 2.6%
would bring the floor bands closer. It would also push the roof's east end further out,
since the drawn east end drops 67 layer units below the near corner. That is more than
a level roof drops through the skyline's long lens.

Measured at all five layouts:

| Feature | Worst error | Tolerance |
| --- | ---: | ---: |
| Roof landmarks (the east end, at the laptop layout) | 0.0075 | 0.008 |
| Piers | 0.0030 | 0.0034 |
| Floor rows (the drawing spaces its bands about 2.5% wider) | 0.00644 | 0.0068 |

The drawing leaves its top 160 layer units without bands, where the louvered crown
stands, and draws no enclosure or antenna. The copy includes both, as the photograph
shows them.

## Verification

`bun run check` covers both:

- `tests/building-kit.test.ts` checks the skyline copy and the geographic model for
  counted triangles, winding, same-facing coplanar overlaps, and covered omissions. It
  also raycasts each drawn floor row onto the skyline copy's window glass.
- `tests/skyline-study.test.ts` projects the skyline copy against the drawing at five
  layouts:
  - the roof landmarks, with the near corner above both ends;
  - twenty-eight piers, each the first surface on its sight line;
  - six floor rows;
  - the notch's span against the drawn corner stone.

  It also checks hover and occlusion.
- `tests/skyline-geography.test.ts` raycasts the geographic model:
  - the roof, the enclosure, and the antenna tip;
  - on the mapped south face, glass, spandrel, column, louvers and cap in turn;
  - the solid notch;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
