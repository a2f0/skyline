# Edson Keith and Theodore Ascher Buildings: reference audit

`src/models/keith-ascher-geographic.ts` builds the Gage Group's two lower buildings, the Edson
Keith Building at 24 South Michigan Avenue and the Theodore Ascher Building at 30 South
Michigan Avenue, for the geographic layout only. The drawing shows the tops of their
Michigan fronts under the Gage Building's south wall, between the University Club and the
Gage. That is outside the excerpt the original layout is fitted to, so the original layout
has no models of them. The geographic camera named the drawn group; see
[the building audit](building-labels.md#names-from-the-geographic-camera). The models are
reconstructions from OpenStreetMap, published history, the drawing and photographs, not a
survey or construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 126982636](https://www.openstreetmap.org/way/126982636), version 8:
  the outline at 24 South Michigan, tagged 12 levels and brown, with no height.
- [OpenStreetMap way 126982639](https://www.openstreetmap.org/way/126982639), version 8:
  the outline at 30 South Michigan, tagged 6 levels and light brown, with no height.
- Both were retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. The Keith shares its north wall's nodes with the Gage Building, way
  124865450, and its south wall's with the Ascher. The Ascher shares its south wall's with the
  University Club, way 126982632.
- The [Historic American Buildings Survey's record](https://tile.loc.gov/storage-services/master/pnp/habshaer/il/il0000/il0056/data/il0056data.pdf),
  HABS IL-1065, 1973:
  - "the Keith, 62' x 101' and is still 101' high; and the narrower Ascher Building measures
    44' x 101' and was originally 92' high. Stories added have made the Gage twelve and the
    Ascher seven. The Keith remains at seven stories."
  - a seventh floor for the Ascher, permitted in 1970 and completed in 1972, "faced in red
    brick to match the original six floors";
  - "The Ascher Building is two bays wide, the Keith, three. Above the first floor both
    buildings employ the 'Chicago window'", a large fixed pane flanked by smaller windows with
    movable sash;
  - their galvanized-iron cornices, which projected 3 ft, "have been removed".
- The Commission on Chicago Landmarks'
  [report on the Historic Michigan Boulevard District](https://archive.org/stream/CityOfChicagoLandmarkDesignationReports/HistoricMichiganBoulevardDistrict_djvu.txt),
  2002: "Ascher (30 S.) Edson Keith (24 S.)", with "red brick facades" by Holabird & Roche; the
  story added to the Ascher in 1971 made it "the same height as the Keith Building".
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016: the Gage Group, 100 ft and 154 ft. The Gage is the group's tallest.
- [Wikimedia Commons, *Gage Group Buildings*](https://commons.wikimedia.org/wiki/File:Gage_Group_Buildings.jpg):
  the two red fronts beside the Gage, each bay a wide window between narrow ones, six rows of
  them over the shopfronts, under a thin coping.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the buildings, about
  9 of the drawing's layer units are one metre of height. The photograph shows the lit tops of
  both fronts over the trees, under the Gage's dark south wall.

## Heights

Where published heights disagree, the layout takes the one nearest the drawing's reading.
Read through the geographic camera, the drawn Keith stands at 35.7 m and the drawn Ascher at
35.5 m.

| Building | Published | Model |
| --- | --- | ---: |
| Edson Keith | HABS: 101 ft. The City: 100 ft | 30.78 m, HABS's |
| Theodore Ascher | HABS: 92 ft with six storeys. The 2002 report: the Keith's height since its seventh. The City: 100 ft | 30.78 m, the Keith's |

The City's 100 ft is the Gage Group's lower figure, which it gives for both buildings. The
2002 report makes the Ascher the Keith's height, so the HABS record's 101 ft for the Keith
applies to both, and it is the published figure nearer each drawn parapet. Neither source
says what its figure measures to, so both models take it as the parapet's top. Each
building's heights read on the drawing are scaled so that its drawn parapet meets it: by
30.78/35.69 for the Keith and 30.78/35.48 for the Ascher. The drawing reads the Gage's
154 ft high by nearly the same ratio; see the [Gage Building audit](gage-reference.md#heights).

| Feature | Both | Basis |
| --- | ---: | --- |
| Ground floor | 0–5.5 m | Estimate: shopfronts to 4.3 m under a sign band |
| Floors 2–7 | 3.94 m | Estimate: from the second floor to the drawn seventh |
| Seventh floor's window | 26–28.6 m | Drawing, its sill 80 cm over the floor |
| Parapet | 30.78 m | Published: the Keith's 101 ft |

The hill in the drawing hides both buildings below the seventh floor's window. The windows of
the floors below it take the same height and sill, an estimate.

## Plan

The Keith's mapped outline is 19.2 m along Michigan, and the Ascher's 13.6 m; HABS gives
62 ft and 44 ft. Both run 49 m back to the alley.

Projected through the geographic camera, the Keith's Michigan front spans 962 to 1,083 layer
units, and the Ascher's 877 to 962. The drawing's two blocks run from 996 to 1,112 and from
916 to 996: 29 to 39 units right of the projection, as the drawing sits right of it along
this stretch.

Measured as fractions of the drawn fronts from their south corners, the drawn windows stand:

- on the Keith, 1.67 to 5.36 m, 7.24 to 12.09 m and 13.44 to 17.34 m, one to each bay;
- on the Ascher, 7.9 to 11.75 m, in its north bay. The drawing leaves its south bay's
  window out; the model mirrors the north one, 1.85 to 5.7 m.

## Model

- **Michigan fronts:** brick.
  - The ground floor's shopfronts under a sign band.
  - A Chicago window in each bay on floors 2 to 7: a fixed pane between sashes 80 cm wide,
    split by 12 cm mullions painted in the window's plane.
  - A plain parapet.
- **Alleys:** brick, windows 1.6 m wide about 3.2 m apart on every floor above the ground
  floor. The drawing does not show them, so they are an estimate.
- **Party walls:** the bare shell. The Gage, each other and the University Club cover them,
  and a skin would stand into the neighbour's lot, its top level with the other building's
  roof.

Colours follow the drawing's greys, not the red brick.

Omitted:

- the coping and the ground floors' ornament;
- the entrances.

## Verification

`bun run check` covers them:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions, for each building.
- `tests/skyline-geography.test.ts` raycasts, for each building:
  - the parapet at its published height, and the record's one part;
  - the seventh floor's window between its drawn sill and head, scaled;
  - three lights to each bay's Chicago window, a mullion, a sash and a pier;
  - every window's measured edges, 5 cm either side;
  - a window to each of the seven floors up a bay, the sign band and the parapet;
  - the alley's windows over a plain ground floor without the sign band, and the bare
    party walls;
  - the shared palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.

## 2026-10-10 — Daytime colours from a close-up calibrated to Chicago.jpg (FID-COL-006)

The colour trial's sunny day gains a fourth group: the towers the 2008 panorama shows north of
Randolph Street, measured in it as the first three groups were (FID-COL-003 to FID-COL-005), and
buildings it does not resolve, measured in daytime close-ups calibrated to it. All are shown at the
same exposure.

Sources:

- [Gage Group Buildings.jpg](https://commons.wikimedia.org/wiki/File:Gage_Group_Buildings.jpg) on
  Wikimedia Commons, Teemu008's photograph of the Ascher, Keith and Gage Buildings' Michigan fronts
  in morning sun on 8 May 2012, from Flickr, with the University Club at its left and the Chicago
  Athletic Association at its right (CC BY-SA 2.0; accessed 2026-10-10). Measured in Commons'
  1280 × 1567 px rendition,
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Gage_Group_Buildings.jpg/1280px-Gage_Group_Buildings.jpg`
  (SHA-256 `3156c19dee13fd217372d4972263e2e2cda1a77674d610aabf375a661afbb953`).
- [Chicago.jpg](https://commons.wikimedia.org/wiki/File:Chicago.jpg), Daniel Schwen's 2008 daytime
  panorama the trial's colours come from (CC BY-SA 4.0), for the reference: the University Club's
  limestone, sunlit there at `175, 165, 158` (`university-club-reference.md`, FID-COL-005).

Neither photograph is in the repository. In the panorama Grant Park's trees cover both fronts.

Method: each sample is a box in the close-up's pixels (x0, y0, x1, y1, half-open), a rule on hue
(degrees), saturation and value (0–1) choosing one material's pixels in it, and the per-channel sRGB
median of those pixels (0–255), with their count, their share of the box and the quartiles of red,
green and blue, as in the panorama. `bun scripts/sample-colours.ts day building-michigan-west-front building-30-south-michigan` downloads the
photographs once, checks their SHA-256, and reproduces these rows, the calibration and the palette's
entries, decoding in Chrome without colour management.

Calibration: the close-up's colours are carried into the panorama's light through a reference
beside them, on the same front and in the same light, that the panorama shows sunlit. Each channel's
ratio, in linear light, between the reference's median in the panorama and its median in the
close-up scales the close-up's medians, and the colour is scaled back to white if it passes, keeping
its hue: the same arithmetic as FID-COL-005's shade estimate (`scripts/lib/shade.ts`).
`tests/colour-shade.test.ts` re-derives the palette's calibrated entries from the medians below. The
calibration assumes the reference and the building share one light and that the reference's
material reads the same on its two faces; it carries a close-up's exposure, white balance and
light, not its viewpoint, so it is provisional, like the shade estimate.

Here the reference is the University Club's limestone on the close-up's left edge, on the same
Michigan front and in the same sun: `171, 162, 152` there (box 10, 480, 125, 800, sat 0–0.35, val
0.5–1; 17,888 pixels, 48.6%), against `175, 165, 158` in the panorama, a ratio of 1.05, 1.04 and
1.09 in red, green and blue. The rule keeps the stone's partly shaded pixels in its Gothic detail, as
the panorama's coarser pixels mix them; the plain sunlit gable alone measures about `203, 193, 178`,
which would give a ratio of 0.71–0.77, so the reference's detail is the calibration's largest
uncertainty, up to about 30% in linear light.

Identification: between the University Club and the Gage Building the close-up shows two red brick
fronts of the same height and design. The narrower, two bays wide at x 85–300, is the Ascher
Building, whose mapped outline has 14.3 m of frontage next to the University Club; the wider, three
bays at x 300–640, is the Keith Building, with 19.8 m. Each box covers its front between the
cornice and the shopfronts; the hue rule keeps the brick and drops the windows and the green
copper cornice.

| Material | Box | Rule | Pixels (share) | Median R, G, B | Quartiles R / G / B |
| --- | --- | --- | ---: | --- | --- |
| Keith, brick, Michigan front, sunlit | 305, 750, 640, 1390 in the close-up | hue 340–40, sat 0.25–1, val 0.3–1 | 60,817 (28.4%) | `134, 96, 83` | 97–169 / 59–121 / 52–104 |
| Ascher, brick, Michigan front, sunlit | 90, 800, 295, 1390 in the close-up | hue 340–40, sat 0.25–1, val 0.3–1 | 38,875 (32.1%) | `133, 102, 92` | 99–176 / 69–139 / 59–123 |

The quartiles span the sunlit brick and the shaded reveals of its piers, as the reference's span its
stone's shade. The Athletic Association's brick at the close-up's right edge, calibrated the same
way, comes within 8% of the overcast close-up's calibrated brick in total brightness
(`chicago-athletic-association-reference.md`, FID-COL-006).

Decisions in `src/models/colour-palette.ts`:

- Keith `brick` `137, 98, 87`, calibrated from `134, 96, 83`.
- Ascher `brick` `136, 104, 96`, calibrated from `133, 102, 92`.
- `limestone`, the sills, stays grey on both: too small to measure here.
- `glass`, `lit window` and `dim window` stay grey on both: the windows reflect the bright sky.
- `neutral` stays grey.

Acceptance checks: `tests/colour-materials.test.ts` finds each measured colour, at the colour
layer's exposure of 1.4, on the building's surfaces of that material and in this entry, and leaves
its null ones grey. In the skyline view at 1600 × 900 under the day lights, the Keith Building's front,
facing east into the scene's shade, renders `97, 72, 70` against the calibrated sunlit `137, 98, 87`,
0.51 in linear light; the University Club hides most of the Ascher Building's front in that view.
