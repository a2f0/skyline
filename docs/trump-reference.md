# Trump International Hotel and Tower: reference audit

Two models share one tower. `models/trump-tower.ts` builds it from outlines and the
heights below; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Skyline copy | `createTrumpInternationalTowerBuilding` in `models/trump-international-tower.ts` | The mapped shaft and crown, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createTrumpGeographicBuilding` in `models/trump-geographic.ts` | The mapped podium, tiers, shaft, and crown, exactly | Geographic layout |

Both are reconstructions from published data and one photograph, not a survey or
construction drawings.

## References checked September 27, 2026

- [OpenStreetMap ground outline 64594680](https://www.openstreetmap.org/way/64594680)
  and parts:
  - 188338549, 188338550, and 188338548, the tiers, with tops of 120, 200 and 345 m;
  - 188338859, the crown, to 357 m;
  - 188356529, 284773992, and 284773991, the spire's sections, to 380, 400 and 423.2 m.

  The local coordinate snapshot and attribution remain in
  `models/skyline-geography-data.ts` and [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/trump-international-hotel-tower/203):
  423.2 m architectural height, 98 floors.
- [Wikipedia](https://en.wikipedia.org/wiki/Trump_International_Hotel_and_Tower_(Chicago)):
  - Adrian Smith of Skidmore, Owings & Merrill, completed 2009;
  - a 356.9 m roof;
  - rounded edges;
  - "clear low-emissivity coated glass", "brushed stainless steel spandrel panels", and
    "a curved wing-shaped polished stainless-steel mullion system that projects 9 inches";
  - three setbacks, which align with the Wrigley Building's cornice, River Plaza and
    Marina City, and 330 North Wabash.
- [KHL, "Trump's triumphant tower"](https://www.khl.com/news/trump-s-triumphant-tower/1055450.article):
  a 1,170 ft roof and the same mullions.
- [Newsweek (2016)](https://www.newsweek.com/2016/10/21/how-donald-trump-ditched-us-steel-workers-china-505717.html):
  11,500 curtain-wall panels of glass in aluminium, "6 feet, 3 inches"; other accounts
  give them as 10 by 6 ft.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). Through that
  camera the mapped shaft spans the drawn one, 3889–4213 layer units against 3890–4217, and
  the mapped crown the drawn crown, 4036–4204 against 4038–4208.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Podium, tiers | 60, 120, 200 m | Mapped parts |
| Floors | 3.214 m pitch | The drawing's rows, 21.36 layer units apart, through the photograph's camera |
| Roof | 354.4 m | Photograph: the drawn roof 354.3–354.5 m along the south and east fronts |
| Shoulder | 347.3 m | Photograph: the drawn roof north of the east face's notch |
| Crown | 364.9 m | Photograph: the drawn crown's two ends |
| Spire's joints | 377.4, 402.2 m | Photograph; mapped 380 and 400 m |
| Tip | 423.2 m | Published |

The photograph shows Trump from about 200 m up, above One Prudential. Its heights are
measured down from the published tip through the recovered camera, as differences within
the building, which cancel that camera's own vertical error. The drawn tip reads 423.5 m
before that correction.

The map's 345 m shaft and 357 m crown run about ten metres low against the photograph.
The published 356.9 m roof lies between the photographed main roof and the crown. The
drawn floor rows extend upward to within 0.3 m of the photographed roof.

## Plan

The shaft's mapped outline is a 36.5 × 53 m blade:

- a rounded north end;
- a rounded south-west corner;
- a 21.9 m bevel facing south-east;
- a short notch in its east face, where the roof steps down.

The step's line runs west from the notch at a constant mapped north. North of it the
shaft stops at the shoulder. South of it a cap stands on to the roof, its north face
glazed. The crown stands on both, from its mapped outline, with walls starting above
whichever roof they rise from.

The spire stands where the photograph shows it on the crown. That is 4.05 m west of the
mapped spire part's centre across the photograph's line of sight, whose depth the
photograph cannot show. Through the camera the drawn crown lands within three layer units
of the mapped crown, and the drawn spire's base spans the mapped lower section's 2.9 m,
but the mapped spire stands 24 units right of the drawn one.

## Curtain wall

Every tier wears the same curtain wall:

- **Mullions:** polished stainless-steel fins 0.12 m wide and 0.23 m proud, one 6 ft
  (1.83 m) unit apart along each wall. They keep their rhythm round the traced curves; a
  turn of 40° or more starts a new wall. Through the camera, the drawing's mullion lines on
  the bevel average 1.83 m apart.
- **Spandrels:** a brushed stainless spandrel 0.9 m deep straddles every floor slab.
- **Glass:** clear glass fills between the spandrels, in cells two units wide. A
  deterministic hash lights a few.

The glass on each stretch of wall is one mitred skin along the traced curve, so a rounded
corner has no seams. The crown wears the same wall in darker glass, its mechanical floors
on the tower's pitch. The spire is three twelve-sided sections: 2.9, 2.1 and 1.5 m across,
the mapped sections' widths.

Omitted: the riverwalk and its terraces, the entrances, signage, the setbacks' railings and
planting, and rooftop equipment. Colours follow the original artwork's grayscale palette.

## The skyline copy

The drawing shows Trump above One Prudential, and the study's platform datum crosses the
tower 40.7 m above the street. The skyline copy is the mapped shaft and crown from that
datum up. Its shaft runs straight down to the datum: the drawing hides everything below
One Prudential's roof. The original layout also stands Trump 65 m behind One Prudential
and just in front of Two Prudential, where the mapped setbacks would pass through both.

`skyline-study.ts` scales the copy by 1.065, turns it 7.95°, and places it. This was fitted
through the skyline camera at all five test layouts to:

- the drawn roof, step, shoulder, crown, and the spire's tip and joints;
- fifty-two drawn mullion lines;
- seven drawn floor rows.

Depth keeps the earlier placement, which the fit prefers to deeper ones. At that depth the
copy stands at 1.065 times its size where the drawing's other fitted towers stand about
1.3. The photograph was taken from 2.9 km away from Trump, against about 2.5 km for One
Prudential.

The drawing's mullion lines are not the real mullions one for one. It doubles some where
the mullions bunch round a curve, and skips most of the east face's. Each drawn line is
checked against the model's nearest mullion.

Measured at all five layouts:

| Feature | Worst error | Tolerance |
| --- | ---: | ---: |
| Landmarks (the drawn roof's east end at the bevel, at the laptop layout) | 0.00232 | 0.0025 |
| Mullion lines (a crown line, at the tall layout) | 0.00175 | 0.0019 |
| Floor rows | 0.0020 | 0.0022 |

The drawing keeps the photograph's upward-looking perspective. Through the skyline camera
that spaces the rows about 1.5% tighter than the landmarks above them allow.

## Verification

`bun run check` covers both:

- `tests/building-kit.test.ts` checks both models for counted triangles, winding,
  same-facing coplanar overlaps, and covered omissions. It checks that every mesh of the
  skyline copy closes edge for edge, and:
  - the step at the notch;
  - the sampled floor rows on the spandrels;
  - the spire seated on the crown;
  - glazing on the rear.
- `tests/skyline-study.test.ts` projects the skyline copy against the drawing at five
  layouts: landmarks, mullion lines each the first surface on its sight line, and rows. It
  also checks hover and the occlusion behind One Prudential.
- `tests/skyline-geography.test.ts` raycasts the geographic model:
  - the mapped setbacks;
  - the photographed roof, shoulder and crown;
  - the spire's tip and joints, and the spire itself;
  - the curtain wall on the south face and the step;
  - a spandrel and glass on a drawn floor line;
  - the mapped footprint at grade.

  Every mesh is closed. The skyline camera's Trump landmark is the spire's tip where the
  photograph shows it.

Reference pages are research inputs only; the viewer downloads nothing from them.
