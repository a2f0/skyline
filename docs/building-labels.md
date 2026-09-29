# Building labels and hover ownership

Audited on 2026-09-14 against the source photograph (`skyline.jpg`) using its
placement in `skyline.svg`. The original 21 selectable groups at `a20d6f0`
included several composite buildings and repeated generic labels. The enhanced
SVG now has **31 building identities in 38 paint layers**, shared by WebGL.

These are visual identifications of illustrated silhouettes, not surveyed
locations. The references below establish names, addresses, or architectural
features; mapping them to this drawing is an inference. Eleven small silhouettes
were left explicitly **Unidentified** rather than receiving guessed landmark names; seven
of them have since been named through the geographic camera (see below), and four
remain.

| Previous group/label | Current identification and treatment | Reference |
| --- | --- | --- |
| Lakeshore East towers | The Buckingham; separate unidentified towers on either side | [Building context](https://en.wikipedia.org/wiki/The_Buckingham_%28Chicago%29) |
| Blue Cross and Blue Shield Tower | Retained | Source photograph |
| Aqua and 340 on the Park | 340 on the Park; the inset facade paths belong to this tower, with no separate Aqua silhouette | [Developer](https://www.relatedmidwest.com/our-company/properties/340-park) |
| Leo Burnett Building | Corrected to The Heritage at Millennium Park | [Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897) |
| Michigan Avenue buildings | Six North Michigan (Montgomery Ward Building); two neighboring facades separated, since named the Michigan Boulevard Building's Michigan front and south wall | [Renovation contractor](https://leopardo.com/projects/six-north-michigan/) |
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

The comparison used an OpenStreetMap extract of the drawn area:
[the Loop's east side](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920)
and [Harbor Drive](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6175,41.8820,-87.6100,41.8900).
It went in two passes:

1. It projected every mapped building outline that carries a height, or a level count
   taken at 3.8 m a level. Each drawn group was ranked against the buildings whose
   projected span covers much of it, whose width is comparable, and whose projected top
   lands near the drawn one. This pass leaves out outlines with neither tag, buildings
   mapped only as multipolygon relations, and buildings far wider than the drawn facade
   they show.
2. For the groups that pass left open, the outlines along Michigan Avenue and near The
   Buckingham were listed by address and projected by hand, those without heights at a
   nominal height. This pass found 30 North Michigan: its projected span, which includes
   its deep side, is three times its drawn facade.

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
| `six-north-far-east` | Michigan Boulevard Building, 30 North Michigan Avenue | OSM way 126982630, 20 levels: the corner building at Washington Street, projected across the drawn span in the second pass; Jarvis Hunt, 1914 ([photograph archive](https://chistockimages.com/downloads/michigan-boulevard-building-30-north-michigan-avenue-2/)). The photograph shows its cream facade. |
| `michigan-west-right` | Gage Building, 18 South Michigan Avenue | OSM way 124865450, 12 levels: its Michigan front projects 1,084 to 1,194 layer units at its top, where the drawing has 1,104 to 1,218: the drawing sits right of the projection here, as it does by about 44 units at the University Club. The drawn front's three bays of wide windows match the Gage's three bays between tall piers (Holabird & Roche, with Louis Sullivan's front; [Gage Group Buildings](https://en.wikipedia.org/wiki/Gage_Group_Buildings)). The photograph shows its cream terracotta under the ornament over the inner piers. Checked on 2026-09-29. |
| `michigan-west-left` | Gage Building (south wall) | The Gage's south wall rises above its lower neighbours at 24 and 30 South Michigan and projects 753 to 1,084 units at its top, from behind the University Club to the corner, where the drawing's wall meets the drawn front at 1,104. The photograph shows common brick with a few lit windows. Checked on 2026-09-29. |
| `six-north-east` | Michigan Boulevard Building (south wall) | Its south wall rises above 20 North Michigan's eight storeys, and projected through the camera it spans the drawn facade. The drawing's right edge meets the drawn Michigan front at the corner, through a narrow ornamented bay where the terracotta turns onto the side; that bay's pair of windows repeats the front's rhythm. Read on the wall's plane, the drawn top is level at the front's height, 86–87 m before the published-height correction. The photograph shows common brick, windowed on its top floors, joining the cream return. The Garland Building, 111 North Wabash Avenue, first proposed here, would need about 90 m on the same reading to reach the drawn top. |

These stay **Unidentified**, with their candidates:

| Group | Candidates | Why unresolved |
| --- | --- | --- |
| `michigan-west-front` | The Gage Group's two lower buildings, 24 and 30 South Michigan Avenue | Their Michigan fronts project 876 to 1,082 layer units, under the Gage's south wall, where the drawing's two blocks run from 916 to 1,112. They are named with their models. The Chicago Athletic Association, 12 South Michigan Avenue, the fourth building on this stretch, is drawn in Willoughby Tower's group; see the [Willoughby Tower audit](willoughby-tower-reference.md). |
| `office-west-of-aon` | Two Illinois Center, 233 North Michigan Avenue; River Plaza, 405 North Wabash Avenue | Both project onto the drawn span, with tops within about 10 m of the drawn one. |
| `buckingham-west` | Optima Center, 200 East Illinois Street; Three Illinois Center, 303 East Wacker Drive | Both project behind the gap between 340 on the Park and The Buckingham. |
| `buckingham-east` | None settled | The photograph shows a tower with a lit crown. Of the buildings north of the river that project there, those with mapped heights, such as NBC Tower at 151.5 m, put their tops far from the drawn one; others, such as the Sheraton Grand Chicago, 301 East North Water Street, have no mapped height to test. |

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
