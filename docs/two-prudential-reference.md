# Two Prudential Plaza: reference audit

Two models share one tower. `src/models/two-prudential-tower.ts` builds it from a plan frame and
the heights below; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Skyline copy | `createTwoPrudentialPlazaBuilding` in `src/models/two-prudential-plaza.ts` | The mapped plan squared, from the drawing's datum up, with the drawing's tier points | Original layout of `skyline-study.html` |
| Geographic | `createTwoPrudentialGeographicBuilding` in `src/models/two-prudential-geographic.ts` | The core on the mapped outline, the lobby on it exactly | Geographic layout |

Both are reconstructions from published data and photographs, not a survey or construction
drawings. They replace an earlier pass that kept the drawing's proportions. That pass had
three parts:

- a shaft filling the mapped outline to an inferred 240 m eave;
- chevrons at the eaves;
- a crown of ten setback rings squared to the plan, rising to an inferred 277 m.

The photographs show none of these.

## References checked September 27, 2026

- [OpenStreetMap way 64388666](https://www.openstreetmap.org/way/64388666), version 11:
  the outline, 64 levels, height 303, and no building parts. The local coordinate snapshot
  and attribution remain in `src/models/skyline-geography-data.ts` and
  [the geographic audit](skyline-geography.md).
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489):
  303.3 m architectural height, 64 floors.
- [The building owner's tower photograph](https://www.theprulife.com/wp-content/uploads/2022/07/dsc08667_shift.jpg),
  from [The Pru Life's history](https://www.theprulife.com/a-chicago-landmark-reborn-the-history-of-one-two-pru/),
  taken from high in the south-west:
  - the pyramid's diamond face over the south-west corner;
  - the dark glass strips up the faces' middles, ending in points at the diamond's sides;
  - the stone faces stepping down from them to the corners.
- [Steven Henry's crown close-up](https://images.skyscrapercenter.com/building/two-prudential-plaza_ext-crown_%28c%29stevenhenry.jpg),
  via [the Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489),
  from Aon Center to the east:
  - broad white ribs on the ridges;
  - the steps' louvers;
  - the spire's shaft, whose corner stands on the ridge, with folded edges and inset faces.
- [A 2006 street photograph](https://commons.wikimedia.org/wiki/File:2006-08-16_1580x2800_chicago_two_pru.jpg),
  from the south:
  - the tiers' stepped profiles;
  - glass bands wrapping the re-entrant corners beside them;
  - the east face's glass strip running the full height.
- [A May 2016 photograph](https://commons.wikimedia.org/wiki/File:Two_Prudential_Plaza_Chicago_in_May_2016.jpg),
  from the south-east:
  - the diamond face over the south-east corner;
  - the strips' pointed heads;
  - the stepped stone gables;
  - the tiers' glazed heads, sloping on the line of the steps beside them;
  - the broad ribs, and the steps ending on them in straight lines into the spire;
  - the spire's shaft and needle.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront.
  The drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its
  camera; see [the geographic audit](skyline-geography.md#skyline-camera). At Two
  Prudential 8.0 of the drawing's layer units, or 6.0 photo pixels, are one metre.

## Plan

The core is narrower than the mapped outline. In the Adler photograph its corners'
silhouettes, solved through the recovered camera at 190 to 230 m, stand 7.7 m inside the
mapped south wall and 10.5 m inside the north wall, 37.5 m apart. Its south face spans the
mapped 40.8 m. The mapped 40.8 × 55.4–56.0 m outline is the lobby's; above it the paired
north and south tiers fill the depth.

The drawing's pier columns agree with the photograph:

- The core's north and south faces hold five 3.16 m bays either side of a 9.2 m glass
  strip. The drawing shows all twelve of the south face's piers, corner to corner.
- The east and west faces hold four 3.26 m bays either side of an 11.4 m strip. The
  drawing shows nine of the east face's ten piers.
- The tiers keep the core's bays: the middle tier four either side of its strip, the
  lower tier three. The drawing shows all eight of the lower tier's piers.

| Feature | Mapped | Clean plan |
| --- | --- | --- |
| Core | 40.8 × 37.5 m on the outline's area centroid, square to the mapped south wall | The same, on the origin |
| Middle tiers | 34.5 m wide, half the depth in front of the core: 4.53 m south, 4.42 m north | 4.5 m deep |
| Lower tiers | 28.2 m wide, their fronts 2 cm inside the mapped walls | 4.5 m deep, 27.75 m from the centre |
| Lobby | The mapped outline, to 11.52 m | None: it is lower than the drawing's datum |

Where a tier is narrower than the one behind it, the corner steps back into a re-entrant
notch, as the street photographs show. The mapped outline's north wall runs up to 0.9°
off its south wall, so each tier's front stands at its wall's nearest point.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–11.52 m | Estimate: 38 floors under the lower tier's shoulder |
| Office floors | 3.96 m pitch | Photograph: window rows 23.7 px apart, 3.94 m |
| Windows | 0.9–2.9 m above each floor | Estimate |
| Lower tiers | 162.0 m shoulders, 179.64 m point | Photograph: 161.9–162.4 m; the point on the line of the steps, May 2016 |
| Middle tiers | 193.68 m shoulders, 215.28 m point | Photograph: 193.1–195.2 m; the point on the line of the steps, May 2016 |
| Core's corners | 229.32 m | Photograph: 228.1–230.8 m |
| Gables' points | 256 m | Photograph: 255.9–256.9 m on the south and east faces |
| Pyramid's apex | 280.2 m | Photograph |
| Spire's shaft | to 295.5 m | Photograph: 15.3 m of the spire's 23.1 m |
| Tip | 303.3 m | Published |

The photograph's heights come from the drawn corners and points, which trace it. Each is
read through the recovered camera, then measured down from the published tip, since a
difference within one building cancels the camera's own vertical error. The shoulders and
the eave are floor lines, each within 1.5 m of its measurement:

- 162.0 m is 38 floors above the lobby;
- 193.68 m is eight floors higher;
- 229.32 m is nine more.

The crown's twelve steps are floors too, from the eave to 276.84 m, and a pointed cap
takes it to the apex.

### The tiers' points

Each tier's gable climbs a floor for every 3.16 m bay, and its glass head carries on at
the same slope from the strip's shoulders to its point. The May 2016 photograph shows this
close up, on both tiers' east halves, checked October 1, 2026:

- each step's front corner, where its side's coping meets the front;
- the head's sloping glazing above them.

Those points all lie on one face, so they stay collinear in any view. The line through the
corners, carried on 4.6 m to the middle, meets the head's point within about 0.3 m on the
middle tier and 0.4 m on the lower. That puts the points at 215.28 m and 179.64 m.

The Adler photograph had put them at 217.2 and 181.9 m, read from the drawing's points.
At night each tier's dark glass head runs on into the dark strip of the wall behind it, and
the drawing traces the two as one slope from the shoulders, about 2 m higher. Those higher
points made each head a spike, steeper than its steps, and the gables looked concave.

## Crown and spire

The pyramid is turned 45° to the plan. Its ridges run from the apex down to each face's
point, and each of its faces is a diamond over a corner of the core. The Adler and May
2016 photographs show the south-east diamond nearly face-on; the owner's shows the
south-west one. Each step is one floor:

- Where a step meets a face, its end is that face's stone bay, so each face's gable steps
  up a floor a bay from its corner, up to its strip's shoulders.
- Above the shoulders a broad white rib covers each ridge. It is a hipped plate whose
  front edges follow the strip's pointed head and whose ridge and inner edges run straight
  on to the apex. The steps end on its inner edges, each a fixed way further up the line
  from the shoulder to the apex. Under the rib each step stands back, so the rib stands
  proud of the steps beside it.
- Across the corners each step is a glass riser under a white band.

The photographs and the drawing all show the ribs, checked October 1, 2026:

- the owner's and the May 2016 photographs, by day, white, wide at the heads and narrowing
  into the spire's foot, with the bands of the diamonds stopping at their edges;
- the Adler photograph, at night, where the lit bands end on straight lines from the
  strips' shoulders to the spire's foot, short of the unlit ribs;
- the drawing, which draws each as a long dark triangle from a strip's head to the apex.

An earlier pass ran every step out to a thin rib on the ridge. That stacked the bands' ends
up the side of each strip's head and pinched each diamond in below its points.

The spire's shaft is turned with the pyramid, its corners on the ridges. It is 3.2 m
across its corners in the cap and 1.7 m at 295.5 m, with a dark inset panel down each face
between bright folded edges. A needle runs on from there to the tip.

## Facade

Each stone bay has a 1.6 m window on every floor, between limestone piers 0.9 m wide
standing 0.35 m proud. A white coping 0.45 m proud caps each bay's top, and every pier over
a tier stands on that tier's coping.

The glass strips are dark curtain wall with mullions 1.84 to 1.9 m apart and spandrel glass
between the floors. Their pointed heads stand 3 cm proud of the stepped wall behind. They
run as follows:

- on the east and west faces, from the lobby to the gables' points;
- on the north and south faces, the core's from behind the middle tier, and each tier's
  from behind the one in front.

The tiers' sides carry a ribbon window on every floor, which the street photographs show
wrapping the re-entrant corners. A deterministic hash lights or dims a few windows.

Omitted: the plaza, the entrances, the lobby's detail, and the crown's louvers and
mechanical plant. Colours follow the original artwork's grayscale palette.

## The skyline copy

The drawing shows Two Prudential above One Prudential's podium. The skyline copy is the
building from 35.4 m above the street; the fit put the datum at 35.41 m. `skyline-study.ts`
scales it by 1.289, turns it 8.59°, and places it. The scale is about the exaggeration the
drawing gives the other fitted towers. Depth keeps the earlier placement behind the
podium.

The fit ran through the skyline camera at all five test layouts, against thirteen
landmarks:

- the core's three visible corners at the eave;
- the south and east gables' points;
- the apex and the tip;
- the tiers' points and shoulders.

It also matched twenty-nine piers: twelve south, nine east, and eight on the lower tier.

The copy keeps the drawing's tier points, 181.9 and 217.2 m, about 2 m above the line of
their steps; see [the tiers' points](#the-tiers-points). The drawing traces each tier as one
slope from its shoulders, so its points are among the fit's landmarks. On the as-built line
they would miss by 0.0046 of the frame, beyond the 0.0035 the fit allows.

Measured at all five layouts:

| Feature | Worst error | Tolerance |
| --- | ---: | ---: |
| Landmarks (the south gable's point, at the desktop layout) | 0.00322 | 0.0035 |
| Piers (a south pier, at the tablet layout) | 0.00112 | 0.0018 |

The earlier copy, on the drawing's own 59 m face, reached about 0.0026 and 0.0025. The
drawing puts the south gable's point about a metre higher than the east one's, which
makes it the worst landmark.

## The skyline camera

The geographic camera's Two Prudential landmarks are:

- the spire's tip and the pyramid's apex over the core's centre;
- the core's south-west, south-east and north-east corners at the eave.

Against the mapped outline's corners at 240 m, which had been the fit's worst landmarks at
about 100 units, these cut the camera's RMS from 45.5 to 31.3 layer units. Refitting its
angles and lens, with the eye held on the walk, brought it to 29.9. Each of these landmarks
now lies within 23 units of its drawn point.

## Verification

`bun run check` covers both:

- `tests/building-kit.test.ts` checks the skyline copy and the geographic model for
  counted triangles, winding, same-facing coplanar overlaps, and covered omissions. On
  the copy it raycasts:
  - the copings stepping a floor a bay on every face and tier;
  - the strips' heads on the core and both tiers;
  - the tiers' fronts north and south, and the flat east face;
  - the pyramid's floor-by-floor steps and its turn, counting the ribs, and the ribs;
  - the spire, seated in the cap and turned with the pyramid, and its inset panels.
- `tests/skyline-study.test.ts` projects the skyline copy against the drawing at five
  layouts:
  - the landmarks, with the spire above the apex, the apex above both gables' points,
    and those above the middle tier's point, above the lower tier's;
  - the piers, each the first surface on its sight line.

  It also checks hover and the podium's occlusion.
- `tests/skyline-geography.test.ts` checks the geographic model, restating the frame from
  the mapped outline rather than importing it:
  - the core's faces and the tiers' fronts, the lower ones on the mapped walls;
  - the eave's corners, the gables' points, the apex, and the tiers' points as vertices;
  - eleven exposed steps a floor apart, and the pyramid's turn;
  - every step above a strip's shoulder ending on its rib's inner edges, on the straight
    lines from the shoulder to the apex;
  - the tiers' points on the line of their steps;
  - the ribs, the copings, the strip's head, and the spire;
  - the mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.


## 2026-10-09 — Night colours from the panorama (FID-COL-001)

Source: `src/skyline.jpg`, the repository's 2013 night panorama from the Adler Planetarium's
lakefront, the photograph the drawing traces (19915 × 5315 px; SHA-256
`f6001e46471ea59f6fc07ae0eb9e7d5d8d243666f57d96d7efc6f59f2d7d5db4`; photographer and exact date
unknown; inspected 2026-10-09). It records the building under the city's night lighting in 2013,
so these are **observed** night colours, not the materials' daylight colours.

Method: `scripts/measure-group.ts` aligned the building's drawn group with the photograph
(`skyline.svg` places the image at x −15558.758, y −1754.2251, 26553.332 × 7086.6665 in the
drawing's layer space). Each sample is a box in photograph pixels (x0, y0, x1, y1, half-open), a
rule on hue (degrees), saturation and value (0–1) choosing one material's pixels in it, and the
per-channel sRGB median of those pixels (0–255), with their count, their share of the box and the
quartiles of red, green and blue. Single pixels at this scale mix neighbouring materials, which
the quartiles show; the medians are the values used.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Stone, lower shaft | 14865, 2650, 15045, 3250 | sat ≤ 0.45, val 0.12–0.60 | 96,023 (89%) | `58, 50, 54` | 44–78 / 39–67 / 44–67 |
| Stone, upper shaft, for comparison | 14870, 2160, 14960, 2480 | sat ≤ 0.45, val 0.12–0.98 | 27,325 (95%) | `89, 81, 85` | 58–163 / 54–156 / 63–151 |
| Unlit glass | 14865, 2650, 15045, 3250 | val ≤ 0.12 | 1,246 (1%) | `23, 21, 28` | 21–26 / 19–22 / 26–29 |
| Lit windows | 14865, 2650, 15045, 3250 | sat ≤ 0.45, val ≥ 0.75 | 6,940 (6%) | `233, 233, 225` | 211–245 / 209–244 / 201–242 |
| Crown glass | 14985, 1890, 15065, 2000 | hue 185–250, sat ≥ 0.15, val ≥ 0.45 | 3,687 (42%) | `75, 93, 137` | 50–105 / 83–130 / 123–176 |
| Crown lights | 14940, 1860, 15110, 2060 | sat ≤ 0.30, val ≥ 0.80 | 3,558 (11%) | `213, 225, 244` | 190–235 / 204–242 / 230–253 |
| Spire | 14995, 1720, 15020, 1880 | sat ≤ 0.35, val ≥ 0.55 | 138 (4%) | `193, 206, 238` | 120–212 / 137–224 / 174–252 |

Decisions in `src/models/colour-palette.ts`:

- `granite` `58, 50, 54`, the stone faces, piers, copings, treads and soffits. The upper shaft is
  floodlit lighter; the model's stone is one grey, so the colour does not show it. Open.
- `glass` `23, 21, 28`, the vision glass and dark strips.
- `crown glass` `75, 93, 137`, the crown's risers and sloped glass, lit blue.
- `crown lights` `213, 225, 244`, the white bands and ribs on the crown's ridges.
- `stainless` `193, 206, 238`, the spire, from few pixels.
- `lit window` `233, 233, 225`; `dim window` takes it at the dim windows' grey.
- `aluminium` (the strip mullions) stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 2.1, on the building's surfaces of that material, and leaves its unmeasured ones
grey. In the skyline view at 1600 × 900, the rendered lower shaft's median is 0.74 of the
photograph's in linear light.
