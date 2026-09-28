# Millennium Park Plaza: reference audit

`models/millennium-park-plaza-geographic.ts` builds Millennium Park Plaza, 151–155 North
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
drawn one. The drawn east face stops where One Prudential Plaza, nearer the camera,
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
- Below them, the offices' windows run across the ends.
- The long faces carry a punched window in every 3 m bay between 0.8 m piers.
- The chamfers are solid.

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
