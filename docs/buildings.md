# Modelled buildings

The geographic layout models 34 buildings, each on its OpenStreetMap footprint and parts at a
published height or, where none is published, a height read on the drawing. The registry is
`geographicBuildings` in `models/skyline-geography-data.ts`; its ID opens the building alone at
`building-detail.html?building=<id>`. Each building's reference audit records its sources,
measurements, model choices, omissions, and verification, and the
[fidelity queue](building-fidelity.md) tracks known gaps. [The geographic data
audit](skyline-geography.md) defines the coordinates, the height datums, and the rule for choosing
between published heights.

Heights are the registry's top, with its tip where that is higher.

## The original eight and 330 North Wabash

The eight towers the drawing was first fitted to also have [original layout](studies.md#original-drawing-layout)
copies; the geographic models are the same buildings on their mapped parts.

| Building | ID | Top | Model | Audit |
| --- | --- | ---: | --- | --- |
| The Heritage at Millennium Park | `building-heritage-at-millennium-park` | 192.4 m | Detailed facade, terrace elevations from city design drawings | [Heritage](heritage-geographic-reference.md) |
| Kemper Building | `building-kemper` | 159 m | Marble shell, window bays, mullions, finned dark crown and projecting cap at metre scale, on OSM's height | [Kemper](kemper-geographic-reference.md) |
| Crain Communications Building | `building-crain-communications` | 177.4 m | The single-building study's tower on its three mapped parts; both peaks at the published height, roofs falling about 51° on OSM's 133° bearing | [Crain](crain-reference.md) |
| Michigan Plaza South | `building-michigan-plaza-south-tower` | 168.6 m | 44-storey curtain-wall grid, pale mullions and a roof parapet; from the photograph's viewpoint it stands behind One Prudential | [Michigan Plaza South](michigan-plaza-south-geographic-reference.md) |
| 330 North Wabash | `building-330-north-wabash` | 211.84 m | The tower the drawing labels Michigan Plaza South: Mies van der Rohe's bronze curtain wall on the 5 ft module, lobby on the 25 ft plaza, louvered plant floors | [330 North Wabash](north-wabash-reference.md) |
| Trump International Hotel and Tower | `building-trump-tower-only` | 423.2 m | Photographed roof, shoulder and crown over the mapped 60, 120 and 200 m setbacks, and the spire | [Trump](trump-reference.md) |
| One Prudential Plaza | `building-one-prudential-plaza` | 183.2 m, tip 278 m | Limestone slab to its photographed 169.5 m roof, sign penthouse, WGN mast, and the east wing to 56.4 m | [One Prudential](one-prudential-reference.md) |
| Two Prudential Plaza | `building-two-prudential-plaza` | 303.3 m | Core on the mapped outline's centroid, square to its south wall; tiers fill the mapped depth, their points on the line of their steps | [Two Prudential](two-prudential-reference.md) |
| Aon Center | `layer3` | 346.3 m, tip 362.5 m | 340 m shaft, fifteen bays to each mapped face with glass up to the cap, solid notched corners, the rooftop enclosure, and the inferred antenna | [Aon](aon-reference.md) |

## Illinois Center, Lakeshore East and the river

| Building | ID | Top | Model | Audit |
| --- | --- | ---: | --- | --- |
| Two Illinois Center | `building-office-west-of-aon` | 114.3 m | Dark curtain wall; with River Plaza, the drawing's one building between Two Prudential and Aon | [Two Illinois Center and River Plaza](river-plaza-two-illinois-center-reference.md) |
| River Plaza | `building-river-plaza` | 159.7 m | White concrete frame under a rooftop box, across the river; the only mapped building on that sightline tall enough to reach the drawn top | [Two Illinois Center and River Plaza](river-plaza-two-illinois-center-reference.md) |
| Hyatt Regency Chicago West Tower | `building-hyatt-regency-west-tower` | 111.3 m | Brick slab of narrow window slots, between Aon and the Blue Cross tower | [Hyatt West Tower](hyatt-west-tower-reference.md) |
| Blue Cross and Blue Shield Tower | `building-blue-cross-blue-shield` | 226.7 m | Glass block forward of end bays that open through at the middle of its three mechanical bands, under the emblem screen; carries the [celebratory lights](celebration-lighting.md) | [Blue Cross](blue-cross-reference.md) |
| 340 on the Park | `building-340-on-the-park` | 204.9 m | Glass on straight south, diagonal south-east and curved north faces; the south face's white concrete frame and winter garden; corner block to its photographed 51.7 m | [340 on the Park](340-on-the-park-reference.md) |
| Three Illinois Center | `building-three-illinois-center` | 106.7 m | Dark bronze curtain wall, its top two floors a windowless mechanical penthouse; fills the drawn `buckingham-west` columns | [Three Illinois Center](three-illinois-center-reference.md) |
| Swissôtel Chicago | `building-swissotel` | 139.3 m | Triangular glass tower closing the seam where Three Illinois Center meets The Buckingham | [Swissôtel](swissotel-reference.md) |
| The Buckingham | `building-the-buckingham` | 121.9 m | Concrete frame of five bays a face, a band at every floor over bronze ribbon windows, end bays forward, balconies in two notched corners | [The Buckingham](buckingham-reference.md) |
| Sheraton Grand Chicago Riverwalk | `building-buckingham-east` | 112.3 m | Across the river: cream precast L of punched windows, the corner's round tower two floors over the arms, three drums of maroon fins | [Sheraton Grand](sheraton-grand-reference.md) |

## Michigan Avenue

North to south along the avenue's west side, then Millennium Park Plaza across it.

| Building | ID | Top | Model | Audit |
| --- | --- | ---: | --- | --- |
| 180 North Michigan Avenue | `building-michigan-plaza-front-middle` | 86.3 m | The Harvester Building: twenty-four storeys of masonry under arched windows; no published height, so the parapet is read on the drawing | [180 North Michigan](north-michigan-180-reference.md) |
| Michigan Boulevard Building | `building-six-north-far-east` | 82 m, tip 83.3 m | Terracotta front five bays to a floor, twenty-one storeys to an attic, its brick south wall standing over 20 North Michigan | [Michigan Boulevard](michigan-boulevard-reference.md) |
| Six North Michigan | `building-six-north-michigan` | 86 m | The Montgomery Ward Building: sixteen storeys under a projecting cornice, and the stub of its tower | [Six North Michigan](six-north-michigan-reference.md) |
| Willoughby Tower | `building-willoughby-tower` | 133.5 m | Limestone base, a setback over the 23rd floor under pinnacles, and a crown of arched windows | [Willoughby Tower](willoughby-tower-reference.md) |
| Chicago Athletic Association | `building-chicago-athletic-association` | 45.52 m | Venetian Gothic front at the levels of the Historic American Buildings Survey's measured drawings | [Chicago Athletic Association](chicago-athletic-association-reference.md) |
| Gage Building | `building-michigan-west-right` | 46.94 m, tip 47.74 m | Louis Sullivan's terracotta front, twelve storeys in three bays, cartouches over its inner piers | [Gage](gage-reference.md) |
| Edson Keith Building | `building-michigan-west-front` | 30.78 m | Red brick front of Chicago windows, seven storeys, at the HABS record's 101 ft | [Keith and Ascher](keith-ascher-reference.md) |
| Theodore Ascher Building | `building-30-south-michigan` | 30.78 m | As the Keith Building, its neighbour in the Gage Group | [Keith and Ascher](keith-ascher-reference.md) |
| University Club of Chicago | `building-university-club` | 67.7 m, tip 69.75 m | Tall arched windows of its top hall under a crenellated parapet, and a steep roof with its gable on Michigan | [University Club](university-club-reference.md) |
| Monroe Building | `building-monroe` | 69 m | Terracotta to a steep gable roof holding two floors | [Monroe](monroe-reference.md) |
| MacLean Center | `building-maclean-center` | 77.4 m | The old Illinois Athletic Club: six floors added in 1985 over its cornice and frieze of round windows | [MacLean Center](maclean-center-reference.md) |
| Lake View Building | `building-lakeview` | 73.2 m | Narrow front of three windows to a floor, seventeen storeys to an arched floor and an attic | [Lake View](lake-view-reference.md) |
| Peoples Gas Building | `building-peoples-gas` | 82.9 m | Two fronts, twenty storeys from granite columns to an attic, cornice and cresting, round a light court | [Peoples Gas](peoples-gas-reference.md) |
| Borg-Warner Building | `building-200-south-michigan` | 83.5 m | Curtain wall of some twenty-two floors, a penthouse, and a block behind | [Borg-Warner](borg-warner-reference.md) |
| Railway Exchange Building | `building-railway-exchange` | 78.9 m | White terracotta, seventeen storeys to a frieze of round windows and a cornice, under a hipped copper roof | [Railway Exchange](railway-exchange-reference.md) |
| Millennium Park Plaza | `building-michigan-plaza-front-tall` | 121.9 m | East of Michigan, in front of Michigan Plaza: a 90 m concrete slab, narrow ends solid but for four window strips | [Millennium Park Plaza](millennium-park-plaza-reference.md) |

[Buildings not yet modelled](unmodelled-buildings.md) lists the one drawn building still missing
and the candidates the drawing leaves out.
