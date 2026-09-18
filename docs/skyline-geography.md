# Geographic skyline comparison

`skyline-study.html` has two layouts: the original drawing fit and a geographic
study of the same eight buildings. The geographic layout uses mapped polygon
outlines, detailed Heritage and Trump reconstructions, and simple massing for
the other six buildings. The original factories, placement and camera remain intact.

Ground plan and height comparison use an orthographic camera. Switching layouts
in those views preserves the camera position, target and zoom, including after an
orbit. The geographic scene is translated to align Crain's mapped footprint
bounding-box center with the original Crain model's center. This is a comparison
registration, not a claim that the original drawing is georeferenced. Other
buildings keep their measured positions relative to Crain. Reset restores the
original skyline camera in the original layout and the ground plan in geographic
layout.

## Coordinates and footprints

`models/skyline-geography-data.ts` contains a local extract of
[OpenStreetMap](https://www.openstreetmap.org/copyright), retrieved September 17,
2026 through the [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.628,41.882,-87.620,41.891).
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
| Michigan Plaza South | [127107024](https://www.openstreetmap.org/way/127107024) | Outline extruded |
| Trump | [64594680](https://www.openstreetmap.org/way/64594680) | Podium plus 188338549, 188338550, 188338548, 188338859, 188356529, 284773992, 284773991 |
| One Prudential | [127107034](https://www.openstreetmap.org/way/127107034) | 685493609, 685493610, 685493612, 685493614 |
| Two Prudential | [64388666](https://www.openstreetmap.org/way/64388666) | Outline plus inferred crown |
| Aon | [64388609](https://www.openstreetmap.org/way/64388609) | Shaft plus rooftop part 284775635 and inferred antenna |

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
| Trump | 423.2 m | 423.2 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/trump-international-hotel-tower/203) |
| One Prudential | 183.2 m | 278 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/one-prudential-plaza/2190) |
| Two Prudential | 303.3 m | 303.3 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489) |
| Aon | 346.3 m | 362.5 m | [Skyscraper Center](https://www.skyscrapercenter.com/building/aon-center/339) |

Architectural heights include architectural spires and exclude antennas. The
table's before/after comparison uses the highest actual rendered vertex, so One
Prudential's antenna is not compared to its roof. Aon's original model ends at
its 411 m architectural top and omits an antenna; the geographic model has a
346.3 m architectural top and a 362.5 m antenna tip. Both values are shown so the
comparison does not imply a 362.5 m roof. Published values were checked at the
time of the extract. OSM's rounded or conflicting overall heights are superseded
by the cited records; Kemper retains OSM's 159 m value.

Intermediate parts have less certainty than the overall height:

- Heritage now uses the city's design elevations for its 32.8 m podium terrace,
  89.5 m lower terrace and 181.2 m main roof, with a separate crown reaching the
  published 192.4 m top. Facade details and intermediate floor spacing remain
  approximate; see the [Heritage reference audit](heritage-geographic-reference.md).
  Its materials describe the facade, rather than encoding height confidence.
- Kemper's two-floor podium is estimated at 7.8 m
  using 159/41. One Prudential's ten- and three-floor parts are estimated at
  44.7 and 13.4 m using 183.2/41. Brown material identifies these volumes.
- Trump's mapped tiers keep their OSM part heights of 60, 120, 200, 345, 357,
  380 and 400 m, then the published 423.2 m tip. The tier outlines now carry a
  glazed facade with panes, mullions and floor bands, terrace parapets, a ribbed
  crown, and a tapered mast; see the [Trump reference audit](trump-geographic-reference.md).
  Nested tiers start at the previous tier's top, avoiding coincident exterior
  walls over their full height.
- Crain's two sloping roof parts use OSM's downhill bearing of 133° and roof
  heights of 75 and 73 m. These are map data, not a surveyed roof model.
- Two Prudential lacks mapped roof subdivisions. Its 240 m eave, 277 m pyramid
  peak and centered narrow spire are inferred, approximately following the
  existing model's crown proportions, while the tip is fixed at 303.3 m. Its
  facade setbacks are simplified inside the mapped outline.
- Aon's mapped shaft is 340 m and its rooftop enclosure reaches 346.3 m.
  A narrow antenna reaches the published 362.5 m; its position at the enclosure
  center and width are inferred and colored brown.

These are mapped massing models, not surveyed architectural models. The height
sources use their own street/entrance datum; translating all of them to a common
zero plane does not recover absolute roof elevations above sea level.

## Streets and validation

Gold lines are mapped street **centerlines**, with no implied road or sidewalk
width. Names containing “Lower”, negative OSM layers and negative levels are
excluded. Retained upper/surface roads are flattened to the ground; bridge
heights, curbs, tunnels, the river and surrounding buildings are absent. The
100 m grid and mapped footprints help inspect whether the street arrangement
fits. Checking curb clearances or Chicago's stacked streets requires additional
width and elevation data.

`tests/skyline-geography.test.ts`, included in `bun run check`, checks independent
coordinate anchors, meter scale and north direction, all eight rendered ground
extents and top heights, mesh closure, constant orthographic scale with height,
camera/zoom preservation when toggling, geographic hover, restoration of the
original transforms and camera, local-only runtime requests, mobile overflow,
reduced motion and idle rendering. Existing fidelity checks still run against
the original layout. Top-level `models/*.ts` ships automatically as compiled
`.js`, and its `.svg` excerpts ship as-is; `skyline-comparison.ts`
is also explicitly included in the site's deployment allowlist.
