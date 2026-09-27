# Geographic skyline comparison

`skyline-study.html` has two layouts: the original drawing fit and a geographic
study of the same eight buildings. Every geographic building carries a
detailed facade reconstruction on its mapped outlines. The original factories,
placement and camera remain intact.

Ground plan and height comparison use an orthographic camera. Switching layouts
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
centre of the reference excerpt's frame, against the 24 correspondences in
`geographicLandmarks` in `tests/skyline-landmarks.ts`. These pair mapped spire
tips, eaves, roof corners, and Crain's peaks, shoulders, foot and step with
their drawn points. The eye's height is held at 2 m above the street datum. The
drawing barely constrains it: a camera hovering about 100 m over the harbor on a
shorter lens fits the traced heights slightly better, but the photograph was
taken from the shore. The solve puts the eye 1555 m east and 2075 m south of
Crain, on the lakefront by the Adler Planetarium, 2.59 km away. The camera's
azimuth is 35.98° and it looks up 3.86°, with the frame spanning a 9.94°
vertical field of view.

The fit's RMS error is 67 layer units, about 1.5% of the frame's 4430-unit
width. Horizontal errors stay within 55 units, and the larger vertical ones are
drawn heights that differ from published ones. For example, One Prudential's
mast is drawn 130 units, roughly 16 m, below its 278 m tip. The drawn
Michigan Plaza South is excluded: from this camera it stands 790–1000 units left
of the mapped tower, which One Prudential hides.

The view keeps its eye fixed at every viewport. Its field of view, not its
distance, changes to contain the frame, so each mapped point lands on the same
drawn spot at every layout. Other perspective views keep the study's 6° lens.
`tests/skyline-geography.test.ts` checks that each landmark lies on its mapped
model, and the eye's position. It also checks each landmark's error, the RMS,
and that the placement is identical across the skyline test's five layouts and
a height-limited sixth, 1440×800.

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
| Michigan Plaza South | [127107024](https://www.openstreetmap.org/way/127107024) | Outline with detailed grid |
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
- Kemper's two-floor podium keeps its 7.8 m estimate using 159/41, and the
  tower now carries its marble shell, window bays, mullions, dark crown band
  with light fins, and projecting cap at meter scale; see the
  [Kemper reference audit](kemper-geographic-reference.md).
- One Prudential's mapped tower part sits between its nested ten- and
  three-floor wing parts (estimated at 44.7 and 13.4 m using 183.2/41), whose
  outlines overlap the tower's ends; the tower now carries its punch-card
  facade, the wings their ribbed podiums, and the penthouse, louvers, and
  mapped 278 m mast sit on the roof; see the
  [One Prudential reference audit](one-prudential-geographic-reference.md).
- Trump's mapped tiers keep their OSM part heights of 60, 120, 200, 345, 357,
  380 and 400 m, then the published 423.2 m tip. The tier outlines now carry a
  glazed facade with panes, mullions and floor bands, terrace parapets, a ribbed
  crown, and a tapered mast; see the [Trump reference audit](trump-geographic-reference.md).
  Nested tiers start at the previous tier's top, avoiding coincident exterior
  walls over their full height.
- Crain's two sloping roof parts keep OSM's downhill bearing of 133°, but not
  its roof tags, which put the two peaks 5 m apart and fall 75 and 73 m. The
  photograph shows both peaks at the published 177.4 m and both roofs falling
  1.225 m per metre, about 51°, which also puts the north-east half's step 7.3 m
  above the south-west half's foot, as drawn. The wedge between them is the
  slot's 152.5 m floor. The halves carry the banded curtain wall, glazed roofs
  with a lit outline, and the notches at both ends of the split; see the
  [Crain reference audit](crain-reference.md).
- Michigan Plaza South's mapped outline now carries its 44-story curtain-wall
  grid with a roof parapet at the published 168.6 m top; see the
  [Michigan Plaza South reference audit](michigan-plaza-south-geographic-reference.md).
- Two Prudential's mapped outline keeps its 240 m eave, 277 m pyramid peak,
  and a narrow spire at the published 303.3 m tip, both standing over the
  outline's area centroid. The crown is ten setback rings with silver fascias
  and louvered openings, the shaft carries punched panes between limestone
  piers, and the paired north/south tiers follow the fitted model's
  proportions: set back from the mapped corners, proud of the mapped north and
  south walls above grade, and capped by coped gables whose pier heads step
  floor by floor; see the
  [Two Prudential reference audit](two-prudential-geographic-reference.md).
- Aon's mapped shaft keeps its 340 m top and its rooftop enclosure the
  346.3 m part top; the granite tube now carries window slots, piers, corner
  stones, a parapet, and louvered enclosure faces, with the inferred antenna
  reaching the published 362.5 m tip; see the
  [Aon reference audit](aon-geographic-reference.md).

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
