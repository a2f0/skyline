# Building labels and hover ownership

Audited on 2026-09-14 against the source photograph (`skyline.jpg`) using its
placement in `skyline.svg`. The original 21 selectable groups at `a20d6f0`
included several composite buildings and repeated generic labels. The enhanced
SVG now has **31 building identities in 38 paint layers**, shared by WebGL.

These are visual identifications of illustrated silhouettes, not surveyed
locations. The references below establish names, addresses, or architectural
features; mapping them to this drawing is an inference. Eleven small silhouettes
remain explicitly **Unidentified** rather than receiving guessed landmark names.

| Previous group/label | Current identification and treatment | Reference |
| --- | --- | --- |
| Lakeshore East towers | The Buckingham; separate unidentified towers on either side | [Building context](https://en.wikipedia.org/wiki/The_Buckingham_%28Chicago%29) |
| Blue Cross and Blue Shield Tower | Retained | Source photograph |
| Aqua and 340 on the Park | 340 on the Park; the inset facade paths belong to this tower, with no separate Aqua silhouette | [Developer](https://www.relatedmidwest.com/our-company/properties/340-park) |
| Leo Burnett Building | Corrected to The Heritage at Millennium Park | [Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897) |
| Michigan Avenue buildings | Six North Michigan (Montgomery Ward Building); two neighboring facades separated and unidentified | [Renovation contractor](https://leopardo.com/projects/six-north-michigan/) |
| Historic Michigan Avenue tower | Willoughby Tower | [Building manager](https://marcrealty.com/8-south-michigan-office-space/) |
| Michigan Avenue building | Two unidentified facades and a separate foreground building | Source photograph; insufficient detail for exact names |
| Kemper Building | Retained; rooftop sign visible in the photo | Source photograph |
| Michigan Plaza South | Rear tower retained; three unidentified foreground buildings separated | [Annotated skyline](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Chicago) |
| Crain Communications Building | Retained | [Skyscraper Center](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441) |
| Trump International Hotel and Tower | Split into Trump, One Prudential Plaza, and an unidentified office building west of Aon | [Annotated skyline](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Chicago) |
| Two Prudential Plaza | Retained | Source photograph |
| Prudential Plaza podium | Associated with One Prudential Plaza; remains a separate paint layer in front of Two Prudential | Source photograph; component attribution is less certain than the towers |
| Historic Loop building (`loop-north`) | University Club of Chicago | [Club](https://www.ucco.com/) |
| Historic Loop building (`loop-northeast`) | Monroe Building | [Restoration architect](https://www.brusharchitects.com/pr-monroe-building/) |
| Historic Loop building (`loop-center`) | SAIC MacLean Center (Illinois Athletic Club) | [SAIC history](https://www.saic.edu/news/hidden-saic) |
| Historic Loop building (`loop-southwest`) | SAIC Lakeview Building | [SAIC history and photos](https://www.saic.edu/news/space-and-facilities) |
| Lakefront office building (`office-north`) | Peoples Gas Building | [National Louis University](https://nl.edu/ctle/launch-pads/adjunct-quick-start-page/downtown-chicago-campus/) |
| Lakefront office building (`office-south`) | 200 South Michigan (Borg-Warner Building) | [Building owner](https://www.200southmichigan.com/), [architectural history](https://architecture-farm.com/2023/04/24/postwar-chicago-skyscraper-of-the-week-borg-warner/) |
| Lakefront cultural buildings | Railway Exchange Building (Santa Fe Building) | [Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/railway-exchange-building) |
| Aon Center | Retained | Source photograph |

The geographic layout's camera, fitted later to the mapped buildings, shows that the rear
tower labelled Michigan Plaza South is 330 North Wabash. Its mapped roof corners land on
the drawn ones, and the mapped Michigan Plaza South stands behind One Prudential from the
photograph's viewpoint. The label is unchanged here; the geographic layout adds 330 North
Wabash beside it. See the [330 North Wabash audit](north-wabash-reference.md).

## Geometry corrections

The old Trump group included One Prudential's entire facade, windows, and
antenna. These now belong to One Prudential. Its podium shares the same
`data-building-id`, so either portion highlights the building as a whole.
The detached office strip near Aon has its own target.

The Monroe roof (`path6640`) and Lakeview sidewall (`path6658`) previously lived
inside MacLean's group. Moving them across the adjacent group boundaries keeps
paint order unchanged while correcting ownership. Shared compound window paths
near Six North Michigan were split at subpath boundaries. A shallow roof triangle
between two unidentified facades uses two clipped paint portions at the seam.

Groups with multiple paint portions share a `data-building-id`. SVG highlights
all portions together; WebGL shares their raster bounds, parallax depth, and
selection identity while retaining SVG paint order. Picking uses actual painted
shapes/texture alpha, including foreground occlusion, rather than bounding boxes.
Static architectural overlays still ignore pointer events as before.

The existing unselected SVG compared at 2000 × 900 changed only 139 pixels by at
most two channel levels after regrouping. Browser regression fixtures cover 36
visible points across all 31 identities, including the separated facades and
podium, plus independent rendered illumination, gaps, and viewport changes.
