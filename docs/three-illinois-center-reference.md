# Three Illinois Center: reference audit

`models/three-illinois-center-geographic.ts` builds Three Illinois Center, 303 East Wacker
Drive, for the geographic layout only. From the geographic camera, its east end stands in the
gap between 340 on the Park and The Buckingham, where no model stood. The drawing's
`buckingham-west` group paints an office tower there. That is outside the excerpt the
original layout is fitted to, so the original layout has no model of it. The model is a
reconstruction from OpenStreetMap, published data and photographs, not a survey or
construction drawings.

## References checked September 29, 2026

- [OpenStreetMap way 95486958](https://www.openstreetmap.org/way/95486958), version 12: the
  outline, tagged 106 m and 29 levels. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920).
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/three-illinois-center/13913):
  106.7 m / 350 ft, 30 floors, completed 1979, all-steel.
- [Emporis, archived in 2015](https://web.archive.org/web/20150514052143/http://www.emporis.com/buildings/117307/three-illinois-center-chicago-il-usa):
  "Height (roof) 350.00 ft", the same to its architectural top and tip; "Floors (above
  ground) 28"; "Facade material aluminum", "Facade system curtain wall", "Facade color dark
  brown"; architect Fujikawa Conterato Lohan & Assoc.
- [REjournals, on the building's sale](https://rejournals.com/east-loop-trophy-office-hits-the-market/):
  "the 30-story tower has two penthouse levels", and "eleven and a half foot slab-to-slab
  ceiling heights".
- [Solomon Cordwell Buenz](https://scb.com/project/303-east-wacker/), on its conversion:
  "two mechanical spaces on the 29th and 30th floors", to which "New floor-to-ceiling windows
  were added". [Telos Group](https://www.telosgroupllc.com/https-303eastwacker-com/) calls it
  the "formerly abandoned and windowless penthouse mechanical space", with work "being
  completed in 2019".
- Wikimedia Commons, [*East Wacker 2*](https://commons.wikimedia.org/wiki/File:East_Wacker_2.JPG),
  2014, and [*Chicago 20180830 (04)*](https://commons.wikimedia.org/wiki/File:Chicago_20180830_(04).jpg),
  2018:
  - a dark bronze box with the Swissôtel beside it;
  - a curtain wall of mullions on a module about 5 ft wide, glass over a spandrel on each
    floor;
  - the penthouse as a plain band of the same bronze, with the mullions carried through it;
  - a glazed lobby behind columns, under a fascia about 1.4 spandrels deep.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). Between 340 on the Park
  and The Buckingham, from 6,789 to 6,882 layer units, the photograph shows a dark tower:
  - an unlit band 52 units deep under its top at 1,996;
  - lit floors every 26.8 units below it.

  The drawing paints the same, from 6,735 to 6,940: a plain top 51 units deep over ribbon
  windows every 26 units.

## Heights

| Feature | Height | Basis |
| --- | ---: | --- |
| Floors | 3.505 m | REjournals: 11.5 ft slab to slab |
| Lobby | 0–5.06 m | What 29 floors at that pitch leave under the roof |
| Lobby's glass | to 4.70 m | Estimate: under a fascia of 1.26 m, 1.4 spandrels |
| Office floors | 2nd to 28th | Each a 90 cm spandrel, an estimate, and glass |
| Penthouse | 99.69–106.7 m | The 29th and 30th floors, windowless until about 2019 |
| Roof | 106.7 m | The Skyscraper Center; Emporis's 350 ft |

The lobby of 5.06 m is 16.6 ft, about what the 2014 photograph shows over Upper Wacker
Drive's railing. Emporis's 28 floors leave out the two penthouse levels, which the
Skyscraper Center's 30 count.

## Plan

The mapped outline is 39.2 m east to west and 74.9 m north to south, its long east face on
Columbus Drive and its short south face on Wacker Drive. The mullions are 10 cm wide on a
5 ft module, set out from each face's middle.

## Against the photograph

Projected through the geographic camera, the east face's north end, from 6,897 to 6,987
layer units, shows in the gap between the 340 on the Park and The Buckingham models, and its
roof stands there at about 2,135. The photograph's tower stands in the same gap, 110 units left, as 340 on the Park,
The Buckingham and the Sheraton Grand stand left of their projections.

It matches in kind:

- its lit floors, 26.8 units apart, are 3.41 m at the face's depth, 3% under the published
  pitch;
- its unlit band, 52 units, is 6.6 m, where the penthouse is 7.0 m.

The photograph's top, though, stands 140 units, about 18 m, over the projected roof. The
photograph reads roofs high near here, but by less: The Buckingham's by 66 to 97 units, 340 on
the Park's by about 85. The model keeps the published height, and the drawing's group keeps
its label; see the [label audit](building-labels.md).

## Model

- **Walls:** a curtain wall of 10 cm mullions on the 5 ft module, carried from the lobby to the
  roof.
  - The lobby's glass under its fascia.
  - On each office floor, a spandrel under glass.
  - The penthouse, the spandrels' bronze between the mullions.
- **Roof:** flat.

Colours follow the drawing's greys, warmed toward the photographs' bronze.

Omitted:

- the lobby's recess behind its columns, and the plaza and lower levels;
- the penthouse's glazing of about 2019, since the 2013 photograph shows it windowless.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the roof at 106.7 m, and the record's one part;
  - up the east face between mullions:
    - the lobby's glass and 27 office floors, each floor's spandrel and glass at 11.5 ft
      from its own floor line;
    - the lobby's fascia;
    - the penthouse's bronze from the 29th floor to the roof;
  - ten panes in ten modules of 5 ft between mullions, and a mullion carried through the
    penthouse;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
