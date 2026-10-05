# Buildings not yet modelled

The geographic layout models every building the drawing shows except one, and none of the
buildings the drawing leaves out. This page keeps the research from
[#63](https://github.com/a2f0/skyline/issues/63) and
[#72](https://github.com/a2f0/skyline/issues/72), closed on 2026-10-05, so work on the building
inventory can resume from it. Improving buildings already in the layout belongs in the
[fidelity queue](building-fidelity.md) instead; the Sheraton Grand's 28-level east wing, which #72
listed here, moved there as FID-SHER-001.

To add a building, follow [Adding a building](adding-a-building.md), take published heights under
[the geographic audit's rule](skyline-geography.md#heights-and-limits), and retrieve its ways from
the live OpenStreetMap API.

## Drawn but unresolved

A 1-unit coverage scan through the skyline camera finds no column where the drawing shows a
building and no model does. Two drawn groups still need a decision; [Building
labels](building-labels.md#names-from-the-geographic-camera) holds the projection evidence for each.

| Drawn group | Status | Decision needed |
| --- | --- | --- |
| `michigan-plaza-front-small` | Identified as 168 North Michigan Avenue, OSM way 210671685, 12 levels; not modelled | The drawing and the 2013 photograph show the 1916 Atlantic Bank (Marshall & Fox) at twelve storeys. In 2018 Hirsch Associates added five storeys "clad in a faceted glass curtain wall, which is brought down, through the terra cotta façade to the base of the building", for Hotel Julian, now Arlo Chicago. No published height was found. Model today's seventeen storeys or the drawn twelve, from a photograph or elevation of the addition. |
| `buckingham-west` | Three Illinois Center, modelled, fills its columns and matches the photograph's tower in kind; the label is unchanged | Its top does not match: the photograph stands about 140 layer units (18 m) over the projected 106.7 m roof, where nearby roofs read high by only 66–97. Accept the kind match and rename the group, or keep it open; Chicago Place and Optima Center (below) may be what shows through the gap. |

## Left out by the drawing

The drawing omits many buildings that stand inside its frame, and the geographic layout inherits
the omission. Legacy at Millennium Park and Aqua are the clearest cases: the 2013 photograph shows
both. Others were completed after the photograph.

### How the candidates were ranked

- OpenStreetMap buildings and building parts tagged with a height or a level count, in the
  frame's sector, 41.866–41.905 N, 87.600–87.645 W, from an Overpass snapshot of 2026-07-24.
- Each was extruded to its tagged height; where only levels are tagged, at 3.5 m a level, marked
  `~`.
- Each was rasterised through the skyline camera against the 34 modelled buildings. **Visible** is
  the area, in thousands of square layer units, where it would stand in front of the current
  scene; **sky** is the share of that above the current skyline. Candidates were not tested
  against each other, so one may hide part of another.
- Outlines that contain, or sit inside, a modelled building were skipped.
- **Layer x** is where each lands in the panorama's frame, which runs from −1,400 to 7,978.

### The Loop, behind the Michigan Avenue wall

| Building | OSM | Tagged height | Layer x | Visible (sky) | Notes |
| --- | --- | ---: | --- | ---: | --- |
| Mid-Continental Plaza, 55 East Monroe | part [1179832209](https://www.openstreetmap.org/way/1179832209) in outline 64391613 | 178 m | −882 to 102 | 847 (847) | |
| Three First National Plaza, 70 West Madison | [686200364](https://www.openstreetmap.org/way/686200364) | 234 m | −1,394 to −810 | 587 (587) | Unnamed in OSM; identified by location and its 57 levels |
| Chicago Title & Trust Building, 161 North Clark | [144846547](https://www.openstreetmap.org/way/144846547) | 230 m | 150 to 722 | 538 (538) | |
| Legacy at Millennium Park, 60 East Monroe | relation [15953472](https://www.openstreetmap.org/relation/15953472) | 249.56 m | 274 to 710 | 517 (517) | The 2013 photograph shows it from 363 to 741, its lit crown topping out at 756; the drawing is empty there |
| Chase Tower, 10 South Dearborn | [230613007](https://www.openstreetmap.org/way/230613007) and parts | 260 m | −1,398 to −1,026 | 470 (470) | Cut by the frame's left edge |
| Richard J. Daley Center, 50 West Washington | [64888389](https://www.openstreetmap.org/way/64888389) | 197.5 m | −226 to 426 | 437 (437) | |
| One South Dearborn | [124865479](https://www.openstreetmap.org/way/124865479) | 174 m | −1,102 to −502 | 380 (380) | |
| 300 North LaSalle | part [125567129](https://www.openstreetmap.org/way/125567129) | 239.12 m | 866 to 1,314 | 380 (380) | |
| OneEleven, 111 West Wacker | [124865463](https://www.openstreetmap.org/way/124865463) | 192 m | 674 to 1,110 | 334 (334) | Completed after the photograph |
| Leo Burnett Building, 35 West Wacker | part [1177752207](https://www.openstreetmap.org/way/1177752207) | 193.55 m | 1,586 to 2,058 | 293 (293) | The drawing's "Leo Burnett" group proved to be The Heritage; the real one stands behind |
| Salesforce Tower, 333 West Wolf Point Plaza | [839664090](https://www.openstreetmap.org/way/839664090) | 255 m | −1,106 to −706 | 281 (281) | Completed after the photograph |
| The Marquee at Block 37, 25 West Randolph | part [686325218](https://www.openstreetmap.org/way/686325218) | 122 m | 526 to 1,142 | 239 (239) | |
| 77 West Wacker | [64391028](https://www.openstreetmap.org/way/64391028) | 203.61 m | 1,054 to 1,470 | 222 (222) | |
| Parkline, 50 East Randolph | [147400412](https://www.openstreetmap.org/way/147400412) | ~91 m | 2,434 to 2,714 | 188 (1) | Stands **in front of** modelled buildings |
| LaSalle-Wacker Building, 221 North LaSalle | [124873924](https://www.openstreetmap.org/way/124873924) | 156 m | 470 to 874 | 169 (169) | |
| Pittsfield Building, 55 East Washington | [124865459](https://www.openstreetmap.org/way/124865459) | ~133 m | 1,390 to 1,770 | 156 (156) | No height tag, so likely understated |
| 151 North Franklin | [676025639](https://www.openstreetmap.org/way/676025639) | 183 m | −1,398 to −1,062 | 135 (135) | Completed after the photograph |
| Wolf Point East | [509957160](https://www.openstreetmap.org/way/509957160) | 207 m | −586 to −274 | 126 (126) | |
| Mallers Building, 5 South Wabash | [147478105](https://www.openstreetmap.org/way/147478105) | 87 m | 590 to 1,094 | 119 (119) | |
| 35 East Wacker | [124865488](https://www.openstreetmap.org/way/124865488) | 160.65 m | | 69 | |

### Lakeshore East, Illinois Center and the river

| Building | OSM | Tagged height | Layer x | Visible (sky) | Notes |
| --- | --- | ---: | --- | ---: | --- |
| Aqua, 225 North Columbus | [95486962](https://www.openstreetmap.org/way/95486962), the whole site | none | about 6,000 to 7,100 | not ranked | [Skyscraper Center](https://www.skyscrapercenter.com/building/aqua-at-lakeshore-east/886): 261.8 m, 86 floors, 2009. It would top out near 770, far over 340 on the Park; the photograph shows its balconies behind that tower. OSM maps no separate tower outline, and the drawing has no Aqua silhouette |
| The Tides, 360 East South Water | [95486945](https://www.openstreetmap.org/way/95486945) | 152 m | 7,586 to 7,978 | 494 (352) | |
| The Coast at Lakeshore East | part [235391305](https://www.openstreetmap.org/way/235391305) | 141.48 m | 7,554 to 7,978 | 484 (312) | |
| Outer Drive East | part [1178488621](https://www.openstreetmap.org/way/1178488621) | 115 m | 7,750 to 7,978 | 241 (228) | |
| Optima Signature, 220 East Illinois | [357501101](https://www.openstreetmap.org/way/357501101) | 179 m | 7,186 to 7,710 | 133 (133) | Completed after the photograph |
| The Fairbanks at Cityfront Place | part [145203364](https://www.openstreetmap.org/way/145203364) | 117.91 m | 7,602 to 7,978 | 165 (165) | |
| NBC Tower | part [153567403](https://www.openstreetmap.org/way/153567403) | 151.5 m | | 27 | Mostly hidden by The Buckingham and the Swissôtel. Its spire shows over The Buckingham in the photograph; the part's height leaves the spire out |
| Chicago Place; Optima Center | [159142371](https://www.openstreetmap.org/way/159142371); [153567401](https://www.openstreetmap.org/way/153567401) | 185 m; 135 m | | 17; 5 | Mostly hidden; they may be what shows through the gap over Three Illinois Center |

### Streeterville and North Michigan Avenue, at the right edge

| Building | OSM | Tagged height | Layer x | Visible (sky) |
| --- | --- | ---: | --- | ---: |
| Olympia Centre, 161 East Chicago | [159959827](https://www.openstreetmap.org/way/159959827) and parts | 221 m | 7,510 to 7,978 | 379 (379) |
| Four Seasons Hotel Chicago, 900 North Michigan | part [153966972](https://www.openstreetmap.org/way/153966972) | 265.4 m | 7,758 to 7,978 | 285 (285) |
| The Grand Ohio, 207–215 East Ohio | [210680525](https://www.openstreetmap.org/way/210680525) | ~91 m | 7,778 to 7,978 | 121 (121) |
| Hyatt Centric Magnificent Mile, 215 East Erie | [210680554](https://www.openstreetmap.org/way/210680554) | ~95 m | 7,778 to 7,978 | 117 (117) |
| Park Tower, 800 North Michigan | [143830547](https://www.openstreetmap.org/way/143830547) | 257 m | 7,118 to 7,430 | 92 (92) |

### Outside the frame

These stand in the plan view but not in the skyline view:

- Willis Tower and Franklin Center stand far to the left.
- The St. Regis Chicago stands just past the right edge. OSM leaves it unnamed; it is way
  [465242989](https://www.openstreetmap.org/way/465242989), 349 m and 93 levels, projecting from
  8,134 to 8,427.
- The John Hancock Center, Water Tower Place, One Bennett Park and 400 Lake Shore stand farther
  right.

## Decisions before modelling

1. **Which date.** The drawing and photograph are from 2013. Model the city as mapped today, or
   only what stood in 2013? At least OneEleven (2014), Optima Signature (2017), 151 North Franklin
   (2018) and Salesforce Tower (2023) came later; confirm each building's date. A per-building date
   in the registry would allow either view.
2. **Buildings in front of the drawing.** Parkline stands in front of modelled buildings, and would
   cover parts of what the drawing shows.
3. **The frame's edges.** Chase Tower, Three First National Plaza, 151 North Franklin and the
   Streeterville towers are cut by the frame. They still count toward the plan view.
4. **Order.** By visible area, the first would be Mid-Continental Plaza, Three First National
   Plaza, the Chicago Title & Trust Building and Legacy at Millennium Park. Legacy and Aqua are the
   ones the 2013 photograph most plainly shows.

## Comparing candidates with the drawing

A candidate is tested by projecting its mapped outline through the fitted camera
(`scripts/fit-geographic-camera.ts`) and comparing its projected span and top with the drawn group.
The drawing sits right of the projection toward the south end of the panorama, by an amount that
grows southward, in layer units at the drawn front:

| Building | Offset |
| --- | ---: |
| Willoughby Tower | +12 to +22 |
| Six North Michigan | +13 to +28 |
| Monroe Building | +30 to +45 |
| University Club | about +44 |
| MacLean Center and Lake View Building | about +60 |
| Peoples Gas | +67 to +78 |
| Borg-Warner Building | +80 to +88 |
| Railway Exchange Building | +122 to +127 |

On the right of the panorama it sits left of the projection, by about 110 units around The
Buckingham and up to a few hundred at the ends.
