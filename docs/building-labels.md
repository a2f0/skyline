# Building labels and hover ownership

Audited on 2026-09-14 against the source photograph (`skyline.jpg`) using its
placement in `skyline.svg`. The original 21 selectable groups at `a20d6f0`
included several composite buildings and repeated generic labels. The enhanced
SVG now has **31 building identities in 38 paint layers**, shared by WebGL.

These are visual identifications of illustrated silhouettes, not surveyed
locations. The references below establish names, addresses, or architectural
features; mapping them to this drawing is an inference. Eleven small silhouettes
were left explicitly **Unidentified** rather than receiving guessed landmark names; four
of them have since been named through the geographic camera (see below), and seven
remain.

| Previous group/label | Current identification and treatment | Reference |
| --- | --- | --- |
| Lakeshore East towers | The Buckingham; separate unidentified towers on either side | [Building context](https://en.wikipedia.org/wiki/The_Buckingham_%28Chicago%29) |
| Blue Cross and Blue Shield Tower | Retained | Source photograph |
| Aqua and 340 on the Park | 340 on the Park; the inset facade paths belong to this tower, with no separate Aqua silhouette | [Developer](https://www.relatedmidwest.com/our-company/properties/340-park) |
| Leo Burnett Building | Corrected to The Heritage at Millennium Park | [Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897) |
| Michigan Avenue buildings | Six North Michigan (Montgomery Ward Building); two neighboring facades separated, the farther now named the Michigan Boulevard Building | [Renovation contractor](https://leopardo.com/projects/six-north-michigan/) |
| Historic Michigan Avenue tower | Willoughby Tower | [Building manager](https://marcrealty.com/8-south-michigan-office-space/) |
| Michigan Avenue building | Two unidentified facades and a separate foreground building | Source photograph; insufficient detail for exact names |
| Kemper Building | Retained; rooftop sign visible in the photo | Source photograph |
| Michigan Plaza South | Rear tower retained; three foreground buildings separated, since named Millennium Park Plaza, 180 North Michigan Avenue, and 168 North Michigan Avenue | [Annotated skyline](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Chicago) |
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

## Names from the geographic camera

Checked on 2026-09-28. The geographic layout's camera, fitted to the mapped buildings'
roofs and tips, projects any mapped building into the drawing's layer space.
`scripts/fit-geographic-camera.ts` describes the fit.

The comparison projected every building in an OpenStreetMap extract of the drawn area:
[the Loop's east side](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920)
and [Harbor Drive](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6175,41.8820,-87.6100,41.8900).
Each building's height came from its mapped height, or from its levels at 3.8 m. Each
drawn group was then matched against the buildings whose projected span covers it and
whose projected top lands near the drawn one.

The known groups check the method:

- Willoughby Tower's projected top lands 13 layer units from the drawn one.
- Six North Michigan's lands 24 units away, and the University Club's 23.
- The drawing sits slightly right of the projection on the left of the panorama, and
  left of it on the right, by up to a few hundred units at the ends.

A group is renamed only where the projection and the source photograph agree.

| Group | Name | Evidence |
| --- | --- | --- |
| `michigan-plaza-front-tall` | Millennium Park Plaza, 151–155 North Michigan Avenue | OSM way 127107026, 122 m: projected across the drawn span, its top 12 units from the drawn one; the photograph shows a pale tower of continuous piers. Opened in 1982 as Doral Plaza, at Michigan and Randolph's north-east corner ([building](https://millenniumparkplaza.com/)). |
| `michigan-plaza-front-middle` | 180 North Michigan Avenue | OSM way 210671714, 23 levels: projected top 3 units from the drawn one; the photograph shows brown masonry under arched top windows. |
| `michigan-plaza-front-small` | 168 North Michigan Avenue | OSM way 210671685, 12 levels: the one building between 150 and 180 North Michigan tall enough to show; the photograph shows an ornate cream low-rise. |
| `six-north-far-east` | Michigan Boulevard Building, 30 North Michigan Avenue | OSM way 126982630, 20 levels: projected across the drawn span; white terra cotta, Jarvis Hunt, 1914 ([leasing](https://marcrealty.com/30-north-michigan-avenue-office-spaces-leasing-chicago-il/)), as the photograph's cream facade shows. |

These stay **Unidentified**, with their candidates:

| Group | Candidates | Why unresolved |
| --- | --- | --- |
| `six-north-east` | The Garland Building, 111 North Wabash Avenue | The drawn facade stands about 84 m tall with its base on the street front. 20 North Michigan, the street-front building there, is an eight-storey building of 1885; the Garland Building, behind it, projects onto the span but would not reach the street. |
| `michigan-west-left`, `-right`, `-front` | The Gage Group, 18–30 South Michigan Avenue, and the Chicago Athletic Association, 12 South Michigan Avenue | All four buildings project into the stretch between the University Club and Willoughby Tower. The drawing's three facades cannot be assigned to them one to one. |
| `office-west-of-aon` | Two Illinois Center, 233 North Michigan Avenue; River Plaza, 405 North Wabash Avenue | Both project onto the drawn span, with tops within about 10 m of the drawn one. |
| `buckingham-west` | Optima Center, 200 East Illinois Street; Three Illinois Center, 303 East Wacker Drive | Both project behind the gap between 340 on the Park and The Buckingham. |
| `buckingham-east` | None found | The photograph shows a tower with a lit crown. No mapped building of the right height projects there. |

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
