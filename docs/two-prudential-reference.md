# Two Prudential Plaza: reference audit

Two models share one tower. `models/two-prudential-tower.ts` builds it from a plan frame and
the heights below; the rest supply those:

| Model | Factory | Plan | Used by |
| --- | --- | --- | --- |
| Skyline copy | `createTwoPrudentialPlazaBuilding` in `models/two-prudential-plaza.ts` | The mapped plan squared, from the drawing's datum up | Original layout of `skyline-study.html` |
| Geographic | `createTwoPrudentialGeographicBuilding` in `models/two-prudential-geographic.ts` | The core on the mapped outline, the lobby on it exactly | Geographic layout |

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
  and attribution remain in `models/skyline-geography-data.ts` and
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
| Lower tiers | 162.0 m shoulders, 181.9 m point | Photograph: 161.9–162.4 m and 181.9 m |
| Middle tiers | 193.68 m shoulders, 217.2 m point | Photograph: 193.1–195.2 m and 216.8–217.2 m |
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

## Crown and spire

The pyramid is turned 45° to the plan. Its ridges run from the apex down to each face's
point, and each of its faces is a diamond over a corner of the core. The Adler and May
2016 photographs show the south-east diamond nearly face-on; the owner's shows the
south-west one. Each step is one floor:

- The step's nosing lies on the pyramid, between the gables' points and the corners and
  on to the apex.
- Where a step meets a face, its end is that face's stone bay, so each face's gable steps
  up a floor a bay from its corner.
- Across the corners each step is a glass riser under a white band.

White ribs run up the four ridges from the gables' points into the spire's foot.

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

Measured at all five layouts:

| Feature | Worst error | Tolerance |
| --- | ---: | ---: |
| Landmarks (the south gable's point, at the laptop layout) | 0.00285 | 0.003 |
| Piers (an east pier, at the tall layout) | 0.00157 | 0.0018 |

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
  - the pyramid's floor-by-floor steps and its turn, and the ribs;
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
  - the ribs, the copings, the strip's head, and the spire;
  - the mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
