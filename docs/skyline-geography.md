# Geographic skyline comparison

`skyline-study.html` has two layouts: the original drawing fit and a geographic
study of the same eight buildings, plus 330 North Wabash, the Blue Cross and Blue
Shield Tower, 340 on the Park, The Buckingham, Millennium Park Plaza, Willoughby Tower,
Six North Michigan, the Michigan Boulevard Building, 180 North Michigan Avenue, the
University Club of Chicago, the Monroe Building, the MacLean Center, the Lake View
Building, the Peoples Gas Building, the Borg-Warner Building, the Railway Exchange
Building, the Gage Building, the Edson Keith and Theodore Ascher Buildings, the Chicago
Athletic Association, Two Illinois Center, River Plaza, the Hyatt Regency Chicago West
Tower, the Sheraton Grand Chicago Riverwalk, Three Illinois Center, and Swissôtel Chicago,
which only the geographic layout maps. The page
opens on the geographic layout; `?layout=original` opens it on the drawing fit, as the
browser suites and the dev scripts do. Every geographic building carries a detailed facade
reconstruction on its mapped outlines. The original factories,
placement and camera remain intact.

Ground plan and height comparison use an orthographic camera. Their shared frame, 1,050 m
east–west by 1,520 m north–south, is set in ground plan. There it holds the original
layout's platform and every mapped footprint, with about 50 m east and west where a
portrait phone's width binds it. North and south it runs from about 100 m past River Plaza,
across the river, to 127 m past the Railway Exchange at Jackson. The geography
suite checks that each footprint and its label stay inside the plan at desktop and phone
sizes. Height comparison sees the same
frame at an angle, and on a portrait phone it can clip the platform's south-west corner.
A building added farther out needs the frame moved or widened. Switching layouts
in those views preserves the camera position, target and zoom, including after an
orbit. The geographic scene is translated to align Crain's mapped footprint
bounding-box center with the original Crain model's center. This is a comparison
registration, not a claim that the original drawing is georeferenced. Other
buildings keep their measured positions relative to Crain. Switching layouts
from the skyline view, or from a perspective orbit, opens the other layout's
skyline view, and Reset restores each layout's skyline view.

## Skyline camera

The drawing traces a panorama photographed across the harbor from the lakefront.
The geographic skyline view recovers that photograph's camera rather than
reusing the original layout's fitted one, which describes the drawing's own
geometry, not a place. The mapped buildings stay where they are mapped; only
the camera is fitted.

`scripts/fit-geographic-camera.ts` solves the study's orbit camera, aimed at the
centre of the reference excerpt's frame, against the 26 correspondences in
`geographicLandmarks` in `tests/skyline-landmarks.ts`. These pair mapped spire
tips, eaves, roof corners, and Crain's peaks, shoulders, foot and step with
their drawn points. The eye's height is held at 2 m above the street datum. The
drawing barely constrains it: a camera hovering about 100 m over the harbor on a
shorter lens fits the traced heights slightly better, but the photograph was
taken from the shore. Its ground position is held too, with `--eye`, for the same
reason: the drawing trades the eye's distance against the lens, and left free the
eye drifts about 70 m off the walk into the harbor for less than half a layer
unit. It stands 1472 m east and 1949 m south of Crain, 2.44 km away on the
lakefront walk about 110 m north of the Adler Planetarium's centre, where an
earlier free solve put it. The camera's azimuth is 36.12° and it looks up 4.02°,
with the frame spanning a 10.53° vertical field of view.

The fit's RMS error is 30 layer units, about 0.7% of the frame's 4430-unit
width. Horizontal errors stay within 49 units; the worst landmark, Kemper's west
roof corner, lies 62 units off.

Three sets of landmarks follow the photograph rather than a published or mapped
figure, and one follows the photograph in naming a different building:

- **One Prudential.** Its roof corners stand at the photographed 169.5 m, and its
  tubular mast's top at 259.4 m, where the drawing stops the mast. The slim WGN antenna
  above it, to the 278 m tip, is lost against Trump Tower in the photograph.
- **Trump.** Its spire's tip stands where the photograph shows it, 4 m west of the mapped
  spire part.
- **Two Prudential.** Its eaves are the photographed core's corners, at 229.3 m and 8 to
  10 m inside the mapped north and south walls, and its pyramid's apex stands at the
  photographed 280.2 m; see the [Two Prudential reference audit](two-prudential-reference.md).
  The mapped outline's corners at an inferred 240 m eave had been the fit's worst
  landmarks, drawn about 100 units low.
- **330 North Wabash.** The tower the drawing labels Michigan Plaza South is 330 North
  Wabash. Its mapped roof corners land on the drawn ones, and One Prudential covers its
  east face where the drawing does. The mapped Michigan Plaza South stands 790–930 units
  right of the drawn tower, behind One Prudential; see the
  [330 North Wabash audit](north-wabash-reference.md).

With those in place of the published 183.2 m penthouse top, the 278 m tip, the mapped
spire, and Two Prudential's outline at its inferred eave and 277 m peak, and with 330 North
Wabash's roof added, the RMS fell from 67 units to 30. The eye moved about 150 m
north-west, from 45 m off the planetarium's centre to the walk.

The view frames the panorama, `models/skyline-panorama.svg`: every building the
drawing shows, from the Railway Exchange Building on the left to the towers
around The Buckingham on the right. Its frame is the reference excerpt's,
widened about the same centre to x −1400 to 7978.5 in layer units, 2.65 times
as wide as it is tall. The camera's eye, aim and lens are the excerpt's, so
every landmark lands where it did; only the frame's width changes. The page
stacks the scene over the drawing, each the page's full width and the viewport's
height, so both contain their frame at the same scale. The drawing switches to
the panorama with the geographic layout and back to the excerpt with the
original one.

The skyline viewer's full-screen 3D mode, `skyline-3d.html`, uses the same eye,
aim and pivot with a different frame: `skyline-animated.svg`'s viewBox, which is
x −1105.59 to 7395.51 and y 87.26 to 2869.30 in layer units once its
`skyline-position` translate is undone. It holds that frame centred and on the
canvas's bottom edge, as the viewer holds the SVG on the window's, through a lens
shift off the panorama's centre, so the mapped buildings stand on their drawn
places in the viewer too. The canvas ends at the page's docked control bar, so
the frame stands on the bar and sits the bar's height above the drawing's.
`tests/skyline-3d.test.ts` checks the same landmarks there.

The view keeps its eye fixed at every viewport. Its field of view, not its
distance, changes to contain the frame, so each mapped point lands on the same
drawn spot at every layout. Other perspective views keep the study's 6° lens.
`tests/skyline-geography.test.ts` checks that each landmark lies on its mapped
model, and the eye's position. It also checks each landmark's error, the RMS,
and that the placement is identical across the skyline test's five layouts and
a wider sixth, 1600×700, whose canvas fits the frame to its height.

## Coordinates and footprints

`models/skyline-geography-data.ts` contains a local extract of
[OpenStreetMap](https://www.openstreetmap.org/copyright), retrieved September 17,
2026 through the [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.628,41.882,-87.620,41.891).
330 North Wabash's outline was added on September 27, 2026, from a
[wider request](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6300,41.8820,-87.6180,41.8920),
and the Blue Cross and Blue Shield Tower's outline and parts on September 28, 2026,
from [another](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6212,41.8845,-87.6180,41.8862),
as were 340 on the Park's and The Buckingham's from [a third](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6198,41.8842,-87.6168,41.8862),
and Millennium Park Plaza's, Willoughby Tower's, Six North Michigan's, the Michigan Boulevard Building's, 180 North Michigan Avenue's, the University Club's, the Monroe Building's, the MacLean Center's, the Lake View Building's, the Peoples Gas Building's, the Borg-Warner Building's and the Railway Exchange Building's from [a fourth](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920).
The Gage, Edson Keith and Theodore Ascher Buildings' outlines, the Chicago Athletic
Association's, Two Illinois Center's, River Plaza's with its parts, and the Hyatt Regency West
Tower's part were added on September 29, 2026, from the same request, and the Sheraton Grand
Chicago Riverwalk's tower and corner parts the same day, from
[a fifth](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6250,41.8860,-87.6050,41.8980),
and Three Illinois Center's outline and the Swissôtel's tower part the same day, from the
fourth.
It includes the selected building outlines and parts and upper/surface street
centerlines around them. Each record retains its OSM way ID, version and WGS84
longitude/latitude vertices. The source XML also includes ways crossing the
request bounds. Only selected features are retained; contact and unrelated tags
are excluded. The extract is © OpenStreetMap contributors, under the
[Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).

Coordinates are projected to a local tangent plane centered at
**41.88482645° N, 87.62497155° W**, the center of Crain's mapped bounding box.
`projectGround` uses WGS84's prime-vertical and meridional radii at that latitude;
longitude deltas include the cosine-of-latitude factor. Public coordinates are
east/north meters. Three.js positions are east/up/south, so ground north becomes
negative z. Over this approximately 1 km area, linearization is sub-meter; map
tracing and the interpretation of podium boundaries dominate the uncertainty.
Street elevation and terrain are not modeled: all buildings share a zero datum.

The comparison table reports bounding extents along east and north, **not** the
lengths of rotated facades. Geographic dimensions include the mapped ground
outline and podium. Original ground extents come from vertices at ground level,
after each model's original rotation and scaling. Coordinates represent the
mapped outline's bounding-box center, which need not coincide with the center
of its tower. The cyan ground outlines show that distinction.

| Building | Ground outline | Main tower/parts |
| --- | --- | --- |
| Heritage | [147397547](https://www.openstreetmap.org/way/147397547) | 686199648, 686199649, 686199650 |
| Kemper | [64389514](https://www.openstreetmap.org/way/64389514) | 685494066, 685494067 |
| Crain | [210671717](https://www.openstreetmap.org/way/210671717) | 284816227, 284816228, 284816229 |
| Michigan Plaza South | [127107024](https://www.openstreetmap.org/way/127107024) | Outline with detailed grid |
| 330 North Wabash | [64596068](https://www.openstreetmap.org/way/64596068) | Outline with detailed curtain wall; not in the original layout |
| Trump | [64594680](https://www.openstreetmap.org/way/64594680) | Podium plus 188338549, 188338550, 188338548, 188338859, 188356529, 284773992, 284773991 |
| One Prudential | [127107034](https://www.openstreetmap.org/way/127107034) | 685493609, 685493610, 685493612, 685493614 |
| Two Prudential | [64388666](https://www.openstreetmap.org/way/64388666) | Outline, with the core, tiers and crown from the photograph |
| Aon | [64388609](https://www.openstreetmap.org/way/64388609) | Shaft plus rooftop part 284775635 and inferred antenna |
| Blue Cross | [95486960](https://www.openstreetmap.org/way/95486960) | 284779637, 284779635; not in the original layout |
| 340 on the Park | [95486949](https://www.openstreetmap.org/way/95486949) | 284789056, 284789058; not in the original layout |
| The Buckingham | [95486940](https://www.openstreetmap.org/way/95486940) | Outline plus rooftop part 284790189; not in the original layout |
| Millennium Park Plaza | [127107026](https://www.openstreetmap.org/way/127107026) | Outline with detailed walls; not in the original layout |
| Willoughby Tower | [124873939](https://www.openstreetmap.org/way/124873939) | Outline, with the shaft, shoulder and crown from the drawing and photographs; not in the original layout |
| Six North Michigan | [126982631](https://www.openstreetmap.org/way/126982631) | Outline, with the tower and levels from the drawing; not in the original layout |
| Michigan Boulevard Building | [126982630](https://www.openstreetmap.org/way/126982630) | Outline, with the levels from the drawing; not in the original layout |
| 180 North Michigan Avenue | [210671714](https://www.openstreetmap.org/way/210671714) | Outline, with the height and levels from the drawing; not in the original layout |
| University Club of Chicago | [126982632](https://www.openstreetmap.org/way/126982632) | Outline, with the upper floor, roof and levels from the drawing; not in the original layout |
| Monroe Building | [145498713](https://www.openstreetmap.org/way/145498713) | Outline, with the roof and levels from the drawing; not in the original layout |
| MacLean Center | [145498712](https://www.openstreetmap.org/way/145498712) | Outline, with the levels from the drawing; not in the original layout |
| Lake View Building | [145498711](https://www.openstreetmap.org/way/145498711) | Outline, with the levels from the drawing; not in the original layout |
| Peoples Gas Building | [145498710](https://www.openstreetmap.org/way/145498710) | 1179833660, 1179833658, 1179833661, 1179833659, 1179842408, with the levels from the drawing; not in the original layout |
| Borg-Warner Building | [124873918](https://www.openstreetmap.org/way/124873918) | Outline, with the levels and rooftop from the drawing; not in the original layout |
| Railway Exchange Building | [124873931](https://www.openstreetmap.org/way/124873931) | Outline, with the levels from the drawing and the roof from the photograph; not in the original layout |
| Gage Building | [124865450](https://www.openstreetmap.org/way/124865450) | Outline, with the levels from the drawing; not in the original layout |
| Edson Keith Building | [126982636](https://www.openstreetmap.org/way/126982636) | Outline, with the levels from the drawing; not in the original layout |
| Theodore Ascher Building | [126982639](https://www.openstreetmap.org/way/126982639) | Outline, with the levels from the drawing; not in the original layout |
| Chicago Athletic Association | [147476152](https://www.openstreetmap.org/way/147476152) | Outline, with the levels from the Historic American Buildings Survey; not in the original layout |
| Two Illinois Center | [236770799](https://www.openstreetmap.org/way/236770799) | Outline, with the floor pitch from the photograph; not in the original layout |
| River Plaza | [285867424](https://www.openstreetmap.org/way/285867424) | 68796725, 68796733, 285867425; not in the original layout |
| Hyatt Regency West Tower | [235920252](https://www.openstreetmap.org/way/235920252) | The tower's part of the hotel's outline, 235920251; not in the original layout |
| Sheraton Grand | [592122464](https://www.openstreetmap.org/way/592122464) | The tower's part of the complex's outline, 188171430, and the corner's round tower, 1269924307; not in the original layout |
| Three Illinois Center | [95486958](https://www.openstreetmap.org/way/95486958) | Outline; not in the original layout |
| Swissôtel | [641288601](https://www.openstreetmap.org/way/641288601) | The tower's part of the hotel's outline, 95486966; not in the original layout |

For an audit, retrieve `https://api.openstreetmap.org/api/0.6/way/ID/VERSION`
using the retained ID/version. That gives the historical way's node references;
historical node coordinates require their history at the way's edit time. The
stored coordinate snapshot is the source of truth for this version of the study.
Refresh deliberately from current way/node data and recheck parts and identity;
do not automatically import every nearby building or substitute address points
for outlines. No runtime requests to OSM, map tiles or height services are made.

## Heights and limits

| Building | Architectural height | Tip | Source |
| --- | ---: | ---: | --- |
| Heritage | 192.4 m | 192.4 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897) |
| Kemper | 159 m | 159 m | [OSM height tag](https://www.openstreetmap.org/way/64389514) |
| Crain | 177.4 m | 177.4 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441) |
| Michigan Plaza South | 168.6 m | 168.6 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/michigan-plaza-south/2825) |
| 330 North Wabash | 211.84 m | 211.84 m | [OSM height tag](https://www.openstreetmap.org/way/64596068), the published 695 ft |
| Trump | 423.2 m | 423.2 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/trump-international-hotel-tower/203) |
| One Prudential | 183.2 m | 278 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/one-prudential-plaza/2190) |
| Two Prudential | 303.3 m | 303.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489) |
| Aon | 346.3 m | 362.5 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/aon-center/339) |
| Blue Cross | 226.7 m | 226.7 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/blue-cross-blue-shield-tower/1160) |
| 340 on the Park | 204.9 m | 204.9 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/340-on-the-park/1583) |
| The Buckingham | 121.9 m | 121.9 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/buckingham-plaza/10315) |
| Millennium Park Plaza | 121.9 m | 121.9 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/millennium-park-plaza/10316) |
| Willoughby Tower | 133.5 m | 133.5 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/willoughby-tower/9854) |
| Six North Michigan | 86 m | 86 m | [Chicagology](https://chicagology.com/goldenage/goldenage015/) |
| Michigan Boulevard Building | 82 m | 83.3 m | [Emporis, archived](https://web.archive.org/web/20070216134331/http://www.emporis.com/en/wm/bu/?id=michiganboulevardbuilding-chicago-il-usa) |
| 180 North Michigan Avenue | 86.3 m, drawing | 86.3 m | None published; storeys from [Marc Realty](https://marcrealty.com/180-north-michigan-office-space-chicago/) |
| University Club of Chicago | 67.7 m | 69.75 m | [OSM height tag](https://www.openstreetmap.org/way/126982632) |
| Monroe Building | 69 m | 69 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/monroe-building/22557) |
| MacLean Center | 77.4 m | 77.4 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/maclean-center/26975) |
| Lake View Building | 73.2 m | 73.2 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/lake-view-building/26976) |
| Peoples Gas Building | 82.9 m | 82.9 m | [City of Chicago](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf) |
| Borg-Warner Building | 83.5 m | 83.5 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/borg-warner-building/18617) |
| Railway Exchange Building | 78.9 m | 78.9 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/santa-fe-building/9587) |
| Gage Building | 46.94 m | 47.74 m | [City of Chicago](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf) |
| Edson Keith Building | 30.78 m | 30.78 m | [HABS IL-1065](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0000/il0056/data/il0056data.pdf) |
| Theodore Ascher Building | 30.78 m | 30.78 m | [HABS IL-1065](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0000/il0056/data/il0056data.pdf), the Keith's height |
| Chicago Athletic Association | 45.52 m | 45.52 m | [HABS IL-1226](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0900/il0935/sheet/00004a.tif), measured |
| Two Illinois Center | 114.3 m | 114.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/chicago/two-illinois-center/11095) |
| River Plaza | 159.7 m | 159.7 m | [Skyscraper Center](https://www.skyscrapercenter.com/chicago/river-plaza/3383) |
| Hyatt Regency West Tower | 111.3 m | 111.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/hyatt-regency-chicago-west-tower/13132) |
| Sheraton Grand | 112.3 m | 112.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/sheraton-chicago-hotel-towers/10020); its 112.8 m tip is not modelled |
| Three Illinois Center | 106.7 m | 106.7 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/three-illinois-center/13913) |
| Swissôtel | 139.3 m | 139.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/swissotel-chicago/4362) |

Architectural heights include architectural spires and exclude antennas. 180 North
Michigan Avenue has none published, so its height is read on the drawing, and the page's
dimension table says so. Where published heights disagree, the layout takes the one
nearest the drawing's reading. So the Monroe Building, the MacLean Center and the Lake View
Building take the Skyscraper Center's heights over the lower ones in the City's
[guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
and the Peoples Gas Building takes the City's 272 ft over the Skyscraper Center's 92 m.
The Borg-Warner Building's roof and penthouse take the City's 240 and 258 ft, and the block
behind the penthouse the Skyscraper Center's 83.5 m. The Railway Exchange Building's cornice
takes the City's 235 ft, and its roof's top the Skyscraper Center's 259 ft. The Gage
Building's parapet takes the City's 154 ft over Emporis's estimated 139.77 ft. The Edson Keith
and Theodore Ascher Buildings' take the HABS record's 101 ft for the Keith over the City's
100 ft, since the Ascher's seventh storey made it the Keith's height. Their drawn fronts are
scaled to meet them. The
table's before/after comparison uses the highest actual rendered vertex, so One
Prudential's antenna is not compared to its roof. Aon's original copy is the real
tower from the drawing's 30.6 m datum up at 1.329 times its size, so its antenna
tip stands 441.1 m above the platform; the geographic model has a 346.3 m
architectural top and a 362.5 m antenna tip. Both values are shown so the
comparison does not imply a 362.5 m roof. Published values were checked at the
time of the extract. OSM's rounded or conflicting overall heights are superseded
by the cited records; Kemper retains OSM's 159 m value.

Intermediate parts have less certainty than the overall height:

- Heritage now uses the city's design elevations for its 32.8 m podium terrace,
  89.5 m lower terrace and 181.2 m main roof, with a separate crown reaching the
  published 192.4 m top. Facade details and intermediate floor spacing remain
  approximate; see the [Heritage reference audit](heritage-geographic-reference.md).
  Its materials describe the facade, rather than encoding height confidence.
- Kemper's two-floor podium keeps its 7.8 m estimate using 159/41, and the
  tower now carries its marble shell, window bays, mullions, dark crown band
  with light fins, and projecting cap at meter scale; see the
  [Kemper reference audit](kemper-geographic-reference.md).
- One Prudential's mapped tower part stands between its ten- and three-level
  wing parts, which the map gives no heights. The east wing's 56.4 m roof is
  measured on the photograph, and the west wing, which the photograph cannot
  see, keeps its 13.4 m estimate at 183.2/41 a level. The tower's main roof is
  the photographed 169.5 m, under the 41st floor's observatory band; the
  published 183.2 m is its sign penthouse's top, and the WGN mast reaches the
  278 m tip at the mapped antenna. Its limestone piers, windows, and wing ribs
  follow the photographed 2.35 m bay and 3.93 m floors; see the
  [One Prudential reference audit](one-prudential-reference.md).
- Trump's mapped podium and setbacks keep their OSM part heights of 60, 120 and
  200 m. Above them the photograph, measured down from the published 423.2 m tip,
  puts the main roof at 354.4 m, stepping down to 347.3 m north of the east
  face's notch, and the crown at 364.9 m. The map's 345 and 357 m run about ten
  metres low. The spire's joints are the photographed 377.4 and 402.2 m, and it
  stands where the photograph shows it on the crown. Every tier wears the
  stainless curtain wall on its 6 ft units; see the
  [Trump reference audit](trump-reference.md).
- Crain's two sloping roof parts keep OSM's downhill bearing of 133°, but not
  its roof tags, which put the two peaks 5 m apart and fall 75 and 73 m. The
  photograph shows both peaks at the published 177.4 m and both roofs falling
  1.225 m per metre, about 51°. Those planes put the north-east half's step about
  6.9 m above the south-west half's foot, where the drawing shows 7.3 m. The
  wedge between them is the slot's 152.5 m floor. The halves carry the banded
  curtain wall, glazed roofs with a lit outline, and the notches at both ends of
  the split; see the [Crain reference audit](crain-reference.md).
- Michigan Plaza South's mapped outline now carries its 44-story curtain-wall
  grid with a roof parapet at the published 168.6 m top; see the
  [Michigan Plaza South reference audit](michigan-plaza-south-geographic-reference.md).
  From the photograph's viewpoint it stands behind One Prudential.
- 330 North Wabash, which the drawing labels Michigan Plaza South, carries Mies van der
  Rohe's bronze curtain wall on its 5 ft module and 12 ft 6 in floors, its lobby on
  the 25 ft plaza, and its louvered plant floors, to the mapped 211.84 m; see the
  [330 North Wabash reference audit](north-wabash-reference.md). The original layout
  has no model of it apart from the drawn one it calls Michigan Plaza South, so the
  comparison table reports its original extents as not modeled.
- Two Prudential is the tower as built, from the same generator as its original
  copy. The lobby fills the mapped outline, and the photographed 40.8 × 37.5 m
  limestone core stands on its area centroid, square to its south wall. Each
  face's gable steps a floor a bay from 229.3 m corners to a pointed glass strip at
  256 m, and a stepped pyramid turned 45° to the plan rises from those points to
  280.2 m, under the spire to the published 303.3 m. Paired gabled tiers fill the
  mapped depth north and south; see the
  [Two Prudential reference audit](two-prudential-reference.md).
- Aon's mapped shaft keeps its 340 m top and its rooftop enclosure the
  346.3 m part top. The tube carries granite V-shaped columns on the 10 ft
  module, fourteen bays to each mapped face, with glass floor by floor on the
  photograph's 3.87 m pitch, which runs on over the mechanical floors to a
  granite cap. Its notched corners are solid stone, and the inferred antenna
  reaches the published 362.5 m tip; see the
  [Aon reference audit](aon-reference.md).
- The Blue Cross and Blue Shield Tower stands right of Aon, outside the original
  layout's frame, so that layout has no model of it and the comparison table
  reports its original extents as not modeled. Its mapped block stands forward
  of end bays that open through at the middle of three mechanical bands, where
  the 1997 tower ended, and its emblem screen rises to the published 226.7 m;
  see the [Blue Cross reference audit](blue-cross-reference.md).
- 340 on the Park stands right of the Blue Cross and Blue Shield Tower, also outside
  the original layout's frame. Its mapped tower has a straight south face, a diagonal
  south-east face and a north face curved for The Buckingham's views. The south face
  carries a white concrete frame: a beam every fifth floor, measured on the drawing
  down from the published 204.9 m top, balcony ladders, the winter garden's tall bay
  and a parapet band. The corner block's roof is measured on a photograph at 51.7 m,
  over the map's 40 m; see the [340 on the Park reference audit](340-on-the-park-reference.md).
- The Buckingham stands right of 340 on the Park, where the mapped outline projects onto
  the drawn tower. It is a concrete frame of five bays a face with a band at every floor
  over bronze ribbon windows, measured on the drawing down from the mapped 119 m cap.
  The south, east and north faces' end bays stand forward of the middle, balconies stack
  in the two notched corners, and the rooftop enclosure on its mapped part rises to the
  published 121.9 m; see the [Buckingham reference audit](buckingham-reference.md).
- Millennium Park Plaza is the drawing's tower in front of Michigan Plaza, which the
  geographic camera names; see the
  [building audit](building-labels.md#names-from-the-geographic-camera). A 90 m concrete
  slab stands to the published 121.9 m, with window strips in its narrow ends and punched
  windows in its long faces. Its floor levels are estimates; see the
  [Millennium Park Plaza reference audit](millennium-park-plaza-reference.md).
- Willoughby Tower stands at Michigan and Madison, left of Six North Michigan in the
  drawing. Its limestone base fills the mapped L to the setback over the 23rd floor; a
  shaft rises at the lot's south-east corner, with a shoulder west of it, to a crown of
  arched windows and pinnacles at the published 133.5 m. The shaft's plan and the levels
  are read from the drawing; see the
  [Willoughby Tower reference audit](willoughby-tower-reference.md).
- Six North Michigan, the Montgomery Ward Building, stands across Madison from Willoughby
  Tower. Its sixteen-storey block fills the mapped outline under a projecting cornice; the
  stub of its tower, in the middle of the Michigan front, rises through it to an arched
  stage and a panelled top stage under a cap at the published 86 m. The tower's plan and
  the levels are read from the drawing; see the
  [Six North Michigan reference audit](six-north-michigan-reference.md).
- The Michigan Boulevard Building stands at Michigan and Washington, beyond 20 North
  Michigan. Its terracotta front of five bays rises twenty-one storeys, past a belt course
  over the thirteenth, to an attic under a parapet at the published 82 m, raised over the
  south bay to 83.3 m. Its brick south wall, which the drawing shows above 20 North
  Michigan, is windowed only on its top floors. The levels are read from the drawing; see
  the [Michigan Boulevard Building reference audit](michigan-boulevard-reference.md).
- 180 North Michigan Avenue, the Harvester Building, stands on the south-west corner of
  Michigan and Lake, its Michigan front hidden behind Millennium Park Plaza. It fills the
  mapped lot with twenty-four storeys of masonry, string courses and a top floor of arched
  windows. No height is published: its 86.3 m parapet is read on the drawing, within a few
  metres; see the [180 North Michigan Avenue reference audit](north-michigan-180-reference.md).
- The University Club of Chicago stands on the north-west corner of Michigan and Monroe,
  partly behind the Monroe Building. Its Gothic walls carry the tall arched windows of its
  top hall in four bays to each street front, under a band and a crenellated parapet.
  Behind the parapet an upper floor rises to a steep roof whose gable faces Michigan, its
  peak at OpenStreetMap's 67.7 m under a cross. The levels and the upper floor's setbacks
  are read from the drawing; see the
  [University Club reference audit](university-club-reference.md).
- The Monroe Building stands across Monroe from the University Club. Twelve storeys of
  terracotta over two of granite rise in bays of paired windows to a cornice under a steep
  gable roof holding two more floors, sixteen in all, its gable facing Michigan with small
  arched windows, to the Skyscraper Center's 69 m ridge, the drawn front scaled to meet it;
  see the [Monroe Building reference audit](monroe-reference.md).
- The MacLean Center, built as the Illinois Athletic Club, stands south of the Monroe
  Building. Its narrow front's five columns of windows rise twelve storeys to the old
  club's projecting cornice and a frieze of round windows, then six more floors from 1985,
  arched on the top one, to a pierced parapet at the Skyscraper Center's 77.4 m, the drawn
  front scaled to meet it; see the [MacLean Center reference audit](maclean-center-reference.md).
- The Lake View Building stands south of the MacLean Center. Its narrow front of three
  windows to a floor rises seventeen storeys, arched on the sixteenth, with small attic
  windows under a cornice band, to the Skyscraper Center's 73.2 m, the drawn front scaled
  to meet it; see the [Lake View Building reference audit](lake-view-reference.md).
- The Peoples Gas Building stands south of the Lake View Building, on Adams. Its Michigan
  and Adams fronts rise twenty storeys between wide corner piers: two behind granite
  columns, fourteen of paired windows, three behind a colonnade, and an attic under a
  frieze, a projecting cornice and its cresting, to the City's 272 ft. Its mapped parts
  hold a light court that widens over the seventeenth floor; see the
  [Peoples Gas Building reference audit](peoples-gas-reference.md).
- The Borg-Warner Building stands across Adams from Peoples Gas. Its curtain wall of
  mullions and a spandrel to each floor wraps the Michigan, Adams and south fronts between
  corner columns, some twenty-two floors at the drawn pitch, to a deep fascia at the City's
  240 ft. On the roof stand an office penthouse at the City's 258 ft and a block behind it
  at the Skyscraper Center's 83.5 m, both placed from the drawing; see the
  [Borg-Warner Building reference audit](borg-warner-reference.md).
- The Railway Exchange Building stands at Michigan and Jackson. Its white terracotta fronts
  rise seventeen storeys in eleven bays of paired windows, with a belt under the fourteenth
  floor and round windows in the frieze, to a projecting cornice at the City's 235 ft. Its
  hipped copper roof rises to a flat top at the Skyscraper Center's 259 ft, shaped from the
  photograph; see the [Railway Exchange Building reference audit](railway-exchange-reference.md).
- The Gage Building stands between the University Club and Willoughby Tower, named through
  the geographic camera. Louis Sullivan's terracotta front rises twelve storeys in three
  bays between tall piers, each bay's window in four, five and four lights, to a parapet at
  the City's 154 ft with cartouches over the inner piers. Its brick south wall, which the
  drawing shows over 24 and 30 South Michigan, carries the drawn windows. The drawn front,
  whose parapet reads 54.2 m, is scaled to meet the published height; see the
  [Gage Building reference audit](gage-reference.md).
- The Edson Keith and Theodore Ascher Buildings, the Gage Group's lower two at 24 and 30 South
  Michigan, stand between the Gage and the University Club, named through the geographic
  camera. Red brick fronts, three bays and two, of Chicago windows rise seven storeys over
  shopfronts to plain parapets at the HABS record's 101 ft for the Keith. The drawing
  shows only their seventh floors, the drawn fronts scaled to meet that height; see
  the [Edson Keith and Theodore Ascher Buildings reference audit](keith-ascher-reference.md).
- The Chicago Athletic Association stands between the Gage and Willoughby Tower, whose drawn
  group paints its front. Henry Ives Cobb's Venetian Gothic front of three bays rises through
  a great arcade over three floors to the eighth floor's traceried arcade, a carved frieze,
  a cornice and a top storey of diaper brick pierced by nine roundels. The Historic American
  Buildings Survey's measured drawings give its levels and the parapet's 149 ft 4 in, which
  the drawn front, scaled to meet it, follows within about a metre. The City's 254 ft for it is
  the annex's; see the
  [Chicago Athletic Association reference audit](chicago-athletic-association-reference.md).
- Two Illinois Center and River Plaza fill the gap between Two Prudential Plaza and Aon
  Center, which the drawing paints as one building. Two Illinois Center stands in front, a
  dark curtain wall on a 5 ft module with its floors at the photograph's pitch and a
  mechanical band under its roof at the published 114.3 m. River Plaza stands behind, a white
  concrete frame of 56 storeys over a podium to OpenStreetMap's 156 m roof, with the mapped
  box on it to the published 159.7 m, the Skyscraper Center's architectural top and tip.
  OpenStreetMap's 166 m for the box stands over that tip. Neither is scaled to the drawing,
  whose top lies between their roofs; see the
  [Two Illinois Center and River Plaza reference audit](river-plaza-two-illinois-center-reference.md).
- The Hyatt Regency Chicago's West Tower stands between Aon Center and the Blue Cross and Blue
  Shield Tower, where the drawn Blue Cross group paints a dark brown sliver. Its brick slab
  carries narrow window slots on a 3.5 m module between solid corners, under a plain band, to
  the published 111.3 m, on its mapped part of the hotel's outline; see the
  [Hyatt Regency West Tower reference audit](hyatt-west-tower-reference.md).
- The Sheraton Grand Chicago Riverwalk stands across the river, right of The Buckingham, where
  the drawing paints a lit crown. Its levels stand on the Skyscraper Center's datum, with
  Emporis's floor-to-floor, roof and crown heights over its top floor: the arms' roof at
  94.76 m, the corner's two floors higher at 100.1 m, and 12.2 m drums of maroon fins on the
  three round ends, the corner's to the published 112.3 m. The Skyscraper Center's tip, 50 cm
  higher, names no feature the photographs resolve, so the model stops at the drum's top; see
  the [Sheraton Grand reference audit](sheraton-grand-reference.md).
- Three Illinois Center stands between 340 on the Park and The Buckingham from the drawing's
  camera, in a gap no model filled. Its dark bronze curtain wall carries a floor to each
  published 11.5 ft over a lobby of what the 29 floors leave under the published 106.7 m, and
  its top two floors are the windowless mechanical penthouse the 2013 photograph shows. The
  drawn tower there stands about 140 layer units higher, so the drawing's group keeps its
  label; see the [Three Illinois Center reference audit](three-illinois-center-reference.md).
- Swissôtel Chicago stands behind Three Illinois Center and The Buckingham. Its triangular
  glass tower takes the published 139.3 m over OpenStreetMap's 45 levels, a panel to each,
  and its west corner closes the seam where those two models' corners leave sky; see the
  [Swissôtel reference audit](swissotel-reference.md).

These are mapped massing models, not surveyed architectural models. The height
sources use their own street/entrance datum; translating all of them to a common
zero plane does not recover absolute roof elevations above sea level.

## Streets and validation

Gold lines are mapped street **centerlines**, with no implied road or sidewalk
width. Names containing “Lower”, negative OSM layers and negative levels are
excluded. Retained upper/surface roads are flattened to the ground; bridge
heights, curbs, tunnels, the river and surrounding buildings are absent. The
100 m grid runs from 850 m south of Crain to 650 m north, but the street extract stops
near Madison, so the buildings south of it stand beyond the gold lines. The grid and
mapped footprints help inspect whether the street arrangement fits. Checking curb clearances or Chicago's stacked streets requires additional
width and elevation data.

`tests/skyline-geography.test.ts`, included in `bun run check`, checks independent
coordinate anchors, meter scale and north direction, all thirty-four rendered ground
extents and top heights, mesh closure, constant orthographic scale with height,
camera/zoom preservation when toggling, geographic hover, restoration of the
original transforms and camera, local-only runtime requests, mobile overflow,
reduced motion and idle rendering. Existing fidelity checks still run against
the original layout. Top-level `models/*.ts` ships automatically as compiled
`.js`, and its `.svg` excerpts ship as-is; `skyline-comparison.ts`
is also explicitly included in the site's deployment allowlist.
