# Crain Communications Building: reference audit

Three models share one tower. `models/crain-tower.ts` builds it from plan
outlines and roof planes; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Solo | `createCrainBuilding` in `models/crain-communications.ts` | Clean version of the mapped outline | `building-study.html` |
| Skyline copy | `createCrainSkylineBuilding`, same module | Same, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createCrainGeographicBuilding` in `models/crain-geographic.ts` | The three mapped parts, exactly | Geographic layout |

All three are reconstructions from published data and one photograph, not a survey or
construction drawings.

## References checked September 27, 2026

- [OpenStreetMap ground outline 210671717](https://www.openstreetmap.org/way/210671717)
  and parts 284816227, 284816228 and 284816229. The local coordinate snapshot and
  attribution remain in `models/skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441):
  177.4 m architectural height and tip, 41 floors, all-concrete structure, A. Epstein
  and Sons International.
- [Wikipedia](https://en.wikipedia.org/wiki/Crain_Communications_Building): the tower
  is split diagonally into two slightly disjointed parts, with a gap between them at the
  top, the "vertical slit up the front"; the two spires cover the main roof and house
  mechanical rooms.
- [MTH Industries](https://www.mthindustries.com/our-work/150-n-michigan-avenue/), the
  glazing contractor: a curtain wall of silver-reflective glass culminating in a
  "45-degree sloped roof".
- [Chicago Architecture Today](https://www.flickr.com/photos/chicagoarchitecturetoday/7372208482):
  reflective glass and aluminum curtain wall, and a diamond outlined in white lights.
- `skyline.jpg`, the repository's 2013 panorama, photographed from the lakefront by the
  Adler Planetarium. The drawing was traced from it, and `scripts/fit-geographic-camera.ts`
  recovers its camera; see [the geographic audit](skyline-geography.md#skyline-camera).
  Measured there, Crain's shoulders are 330 photo pixels apart and span 57.5 m across
  the view, so 5.74 pixels are one metre at Crain.

## Plan

The mapped outline is a 38.6 × 45.6 m rectangle split along a 45° diagonal. The
south-west half, part 284816228, is an isosceles right triangle with 38.6 m legs. Its
peak is on the west face, 7 m south of the north-west corner. The north-east half, part
284816229, is its twin across the split: its own split line runs parallel to the first,
4.95 m away. The halves touch along the middle of the split and stand apart at both ends:

| Feature | Mapped | Clean plan |
| --- | --- | --- |
| Outline | 38.6 × 45.6 m, faces within 1° of the street grid | 38.6 × 45.6 m |
| South-west half's peak | 7.3 m south of the north-west corner | 7.0 m |
| Split lines | Parallel at 45°, 4.95 m apart | Same |
| North-west notch | V opening west, 4.9 and 5.5 m legs | 4.95 m legs |
| Slot, wedge part 284816227 | 13.3 m along the split, 152.5 m top | 13.4 m |
| South-east notch | V opening east, 10.6 and 10.9 m legs | 10.75 m legs |

The geographic model keeps the mapped outlines to the millimetre; its grade vertices
are the mapped footprint's. The solo model squares them up to the dimensions above.

## Roofs

Both roofs are planes falling toward the south-east. OpenStreetMap's roof tags give
the south-west half a 172.4 m top falling 75 m and the north-east half 177.4 m falling
73 m: slopes of 54° and 56°, with the peaks 5 m apart. The photograph does not show
that. Measured through its camera:

| Point | Below its peak | Along the fall | Fall per metre |
| --- | ---: | ---: | ---: |
| South-west shoulder | 32.7 m | 26.8 m | 1.220 |
| South-west foot | 67.1 m | 54.6 m | 1.229 |
| North-east shoulder | 34.1 m | 27.4 m | 1.245 |

The two peaks stand within half a metre of each other. Both models put both at the
published 177.4 m and let both roofs fall 1.225 m per metre, about 51°. The geographic
model measures the fall along OSM's 133° bearing; the clean plan measures it along the
diagonal. The same planes put the north-east half's flat step over the south-east notch
about 7 m above the south-west half's foot, and the drawing draws it 7.3 m above. MTH's
"45-degree" roof may describe the roof's edges on the faces, which fall at 42° on the
south face and 40° on the west. The models follow the measurements.

Between the peaks the slot is open down to the wedge's 152.5 m top. In the photograph it
shows sky to about 21 m below the peaks, with the north-east half's inner wall lit beside
it.

## Curtain wall

| Feature | Value | Basis |
| --- | --- | --- |
| Floor pitch | 3.5 m | Photograph 3.55 m (20.4 px), drawing 3.48 m at the solved camera's scale |
| Spandrel and glass | 1.85 m white aluminum, 1.65 m glass | Drawing's bands 54% light; the photograph's night glow reads 61% |
| Lobby | 7 m, glazed 0.45–5.9 m | Estimate; hidden in the photograph and the drawing |
| Window module | 1.524 m | Estimate, a common 5 ft module |
| Main roof | 152.5 m | OSM wedge part; forty-one floors reach 147 m beneath it |

Every exposed wall carries ribbon windows between the floors' sills and heads. They stop
0.8 m under the roof edge, and above any neighbouring volume, so the slot's walls carry
ribbons only above its floor. The ribbons' panes vary a little in tone, with a few lit or
dimmed, and slim dark mullions divide them on the module. The sloped glass carries a
raised grid at twice the module, aligned with the faces. A light fascia along each half's
outer roof edges stands for the lit outline; the diagonal edges of the split, the
notches, and the slot take a dark coping. Fascias hang from the roof edge rather than
over the roof, so the peaks stay the building's top.

Omitted: the plaza and Yaacov Agam's *Communication X9* sculpture, entrance canopies,
signage, rooftop equipment inside the spires, and the lights' colour. Colours follow the
original artwork's grayscale palette rather than the photograph's.

## The skyline copy

The drawing shows Crain from the photograph's treeline up, and the skyline study's
platform datum is that treeline. The skyline copy is the solo model from 39.6 m above
the street, and `skyline-study.ts` scales it by 1.276, turns it 4.86°, and places it.
These were fitted through the skyline camera to the drawn diamond's six vertices and the
twenty-nine sills the left face shows below its shoulder. The lowest is the twelfth
floor's; with the eleventh's or thirteenth's instead, the rows' error more than doubles. Depth
keeps the earlier placement, since the drawing cannot fix it.

A uniform scale fits within 7% of one that stretches height and plan separately, so the
copy keeps the building's real proportions. The 1.276 matches the exaggeration the
drawing gives the other fitted towers. The worst landmarks are the foot and the step,
0.00342 of the canvas at the laptop layout; the sills stay within 0.00201. The drawing
simplifies the slot: it draws the gap between the peaks 45% wider than the photograph
shows, and flattens its foot where the two roofs actually meet 6 m apart. The slot
corners are therefore held to the geometry, not to the drawing.

## Verification

`bun run check` covers all three:

- `tests/building-kit.test.ts` checks the skyline copy and the geographic model for
  counted triangles, winding, same-facing coplanar overlaps, and covered omissions. It
  also raycasts the skyline copy's facade either side of each drawn sill, finding
  spandrel below and glass above, and it keeps every roof-grid bar of all three models
  over the glass.
- `tests/skyline-study.test.ts` projects the skyline copy's six diamond vertices and
  twenty-nine sills against the drawing at five layouts. It holds the slot corners to the
  geometry and the step above the foot, and hovers a probe on the south face.
- `tests/skyline-geography.test.ts` raycasts the geographic model. It checks both peaks
  at 177.4 m, the roofs' fall at independent samples, and the slot's 152.5 m floor and
  its open gap. It also checks ribbons as the first surface on the mapped south wall and
  the notch's recessed wall, the lit outline on the outer edges, and every mapped
  footprint corner at grade. Crain's six drawn vertices also feed the geographic camera
  fit.
- `tests/building-study.test.ts` loads the solo study within its triangle budget.

Reference pages are research inputs only; the viewer downloads nothing from them.
