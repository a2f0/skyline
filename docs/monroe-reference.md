# Monroe Building: reference audit

`models/monroe-geographic.ts` builds the Monroe Building, 104 South Michigan Avenue, for
the geographic layout only. The drawing shows it left of the University Club, across
Monroe Street, outside the excerpt the original layout is fitted to, so the original
layout has no model of it. The model is a reconstruction from OpenStreetMap, published
history, the drawing and photographs, not a survey or construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 145498713](https://www.openstreetmap.org/way/145498713), version 7:
  the outline on the south-west corner of Michigan and Monroe. It is tagged 16 levels and a
  gabled roof of two levels, with no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with the MacLean Center, way
  145498712, tagged 18 levels.
- [Chicagology](https://chicagology.com/skyscrapers/skyscrapers048/):
  - Holabird & Roche, 1912, sixteen stories;
  - 89 feet on Michigan Avenue and 172 feet on Monroe Street;
  - "two roomy floors in the attic formed by the sloping roof";
  - granite for the first two stories and terracotta above;
  - on the south-west corner of Michigan and Monroe, the University Club on the opposite
    corner.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  9.3 of the drawing's layer units are one metre of height. The photograph shows:
  - the gable facing Michigan, with two rows of small arched windows;
  - the terracotta front's bays of paired windows between pilasters;
  - a belt course two floors below the cornice.

No published height was found. The model's is read on the drawing and corrected by the
University Club's reading across Monroe: that club's drawn gable reads 0.6 m above its
mapped 67.7 m, so the Monroe Building's readings are lowered by the same.

## Plan

The mapped outline is 27.6 m along Michigan and about 54.3 m along Monroe. Its north and
south walls are a little out of parallel, the lot about 0.6 m narrower at its west end.

Projected through the geographic camera, the Michigan front spans 447 to 627 layer units at
grade. The drawing's front runs from 492 to 662, right of the projection by 30 to 45 units,
as at the University Club.

The drawn front has five bays of paired windows, their mullions about 5.3 m apart and
centred a little south of the front's middle. The model centres five bays on the front,
5.5 m apart, and the same spacing on the other walls.

The drawn gable spans the front under a roof whose ridge runs west. Its lower row holds
three pairs of small arched windows about 5.6 m apart, and its upper row one pair.

## Heights

Heights are read on the drawn Michigan front through the geographic camera, lowered 0.6 m
as described above.

| Feature | Height | Basis |
| --- | ---: | --- |
| Granite storeys | 0–13.9 m | Estimate: what fourteen storeys leave under the drawn floors |
| Typical floor | 3.55 m | Drawing: the window rows |
| Belt course | 49.3–50.5 m | Drawing: over the twelfth floor |
| Fourteenth floor's windows | 54–56.1 m | Drawing |
| Cornice | 56.3–57.6 m | Drawing |
| Gable's foot and eaves | 57.6 m | Drawing |
| Attic's lower windows | 57.7–59.5 m | Drawing |
| Attic's upper windows | 61.15–62.8 m | Drawing |
| Ridge | 67.1 m | Drawing: the verge's top |

The hill in the drawing hides the building below 31 m. The published fourteen storeys under
the roof leave the two granite storeys 13.9 m together, which is an estimate.

## Model

- **Walls:** the lot to the eaves, the two granite storeys in granite, terracotta above.
  - The Michigan front, Monroe front and west wall carry bays of paired windows 1.3 m wide
    either side of a mullion.
  - A belt course runs over the twelfth floor, and a cornice under the roof.
  - The south wall is shared with the taller MacLean Center and stays plain.
- **Roof:** a closed solid 5 cm inside the walls, on the lot's four corners, from the eaves
  to a ridge between its gables' middles. Its slopes are in two triangles each, since the
  lot is out of square.
- **Attic windows:** dark panels 2 cm proud of the Michigan gable: three pairs low and one
  pair high.

Colours follow the drawing's greys, not the terracotta's pink or the roof's green tile.

Omitted:

- the pilasters and ornament;
- the dormers on the roof's slopes;
- the entrances;
- the MacLean Center, which hides the south wall.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the ridge, the south slope, and the walls' top in front of the gable;
  - the Michigan front's paired windows, mullions and piers;
  - the granite storeys, the fourteenth floor, the belt and the cornice;
  - the gable's six lower and two upper windows, and the gable between them;
  - the plain party wall and the Monroe front's twenty windows to a floor;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
