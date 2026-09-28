# University Club of Chicago: reference audit

`models/university-club-geographic.ts` builds the University Club of Chicago, 76 East
Monroe Street, for the geographic layout only. The drawing shows it left of Willoughby
Tower, behind the Monroe Building, outside the excerpt the original layout is fitted to,
so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, archived listings, the drawing and photographs, not a survey or
construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 126982632](https://www.openstreetmap.org/way/126982632), version 10:
  the outline on the north-west corner of Michigan and Monroe, tagged 15 levels and
  67.7 m. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its north wall's nodes with 30 South Michigan, way
  126982639, tagged six levels.
- [Emporis, archived in 2007](https://web.archive.org/web/20070218072321/http://www.emporis.com/en/wm/bu/?id=universityclub-chicago-il-usa):
  - 14 floors, 1909, by Holabird & Roche;
  - "A limestone owl crowns the peak of the front gable";
  - the Michigan Room on the second floor, with a 21-foot coffered ceiling.
- [Wikipedia's Historic Michigan Boulevard District](https://en.wikipedia.org/wiki/Historic_Michigan_Boulevard_District):
  the University Club, 76 East Monroe, by Holabird & Roche.
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the club, about 9.2 of
  the drawing's layer units are one metre of height. The photograph shows:
  - the Gothic front's tall arched windows under a band and a crenellated parapet;
  - lit windows behind the parapet;
  - the steep roof and its gable on Michigan, with pinnacles;
  - the Monroe Building's gable in front of the club's west end.

## Plan

The mapped outline is 20.75 m along Michigan and 52.3 m along Monroe.

Projected through the geographic camera, the south-east corner lands at 744 layer units.
The drawing's corner, where its two arcaded faces meet, is at 788. The drawing sits right
of the projection here by about 44 units, more than further north. The drawn faces are
read as fractions of their mapped lengths, measured from the drawn corner:

- The Michigan front's four tall windows are about 3.6 m wide, centred 3, 7.5, 12 and
  16.8 m north of Monroe. The Monroe front's first four repeat them, centred 3.3, 7.7, 12.1
  and 16.6 m west of Michigan. The model centres four bays 4.55 m apart from 3.1 m on each
  front and continues them along Monroe. The Monroe Building hides the rest of that front.
- The gable facing Michigan spans 17.5 m of the front and stands back from it. Its drawn
  foot and ends put it 3.3 m behind the Michigan front and 1.3 m inside the Monroe front
  and north wall. The model takes that as the upper floor under the roof.
- The ridge runs west from the gable's peak, along the length of the club; the Monroe
  Building's gable hides its far end.
- A small gable with its own cross stands on the Monroe side, 13.7 to 18.7 m west of
  Michigan.

## Heights

Heights are read on the drawn Michigan front through the geographic camera. They are
measured down from OpenStreetMap's 67.7 m, taken at the drawn gable's peak, which reads
0.6 m higher on its own.

| Feature | Height | Basis |
| --- | ---: | --- |
| Ground floor | 0–5 m | Estimate: the hill hides the lower floors |
| Floors 2–9 | 3.525 m | Estimate: between the ground floor and the drawn floors |
| Wide windows | 33.65–36.7 m | Drawing: under the hall's |
| Hall's arched windows | 37.3–43.9 m | Drawing: heads from 43.1 m |
| Band | 46.2–48.95 m | Drawing |
| Parapet | 48.95–51 m | Drawing: to the crenels |
| Merlons | 51.75 m | Drawing |
| Upper floor's windows | 52–55.9 m | Drawing |
| Eaves | 56.4 m | Drawing |
| Pinnacles | 62.5 m | Drawing |
| Small gable | 59.3 m | Drawing: its eaves at the upper floor's |
| Small gable's cross | 60.4 m | Drawing |
| Gable's peak and ridge | 67.7 m | OpenStreetMap |
| Cross | 69.75 m | Drawing |

The drawing shows the club from 30 m up. Below that the floors are estimates, eight between
a 5 m ground floor and the wide windows. With the hall's two storeys and the upper floor,
that makes thirteen floors against the fourteen published.

## Model

- **Main block:** the whole lot to the parapet.
  - The street fronts carry four bays to a front, and more along Monroe: paired windows on
    each floor, the wide windows, and the hall's tall arched windows, their heads stepped
    to the middle half for the arch; then the band and the parapet.
  - Merlons 1.2 m wide every 2.1 m line the street fronts' parapet.
  - The west wall carries windows every 4.55 m. The north wall, shared with 30 South
    Michigan, stays blank below its eighth floor.
- **Upper floor:** set back behind the parapet, with windows 3.6 m wide about 5.5 m apart.
  Its gable roof rises from 56.4 m eaves to the ridge.
  - The Michigan gable, in stone, has pinnacles at its foot and a cross on its peak.
  - The small Monroe gable has one window, and a cross of its own facing Monroe.

Colours follow the drawing's greys, not the limestone's buff.

Omitted:

- the carving and the owl;
- the west end's form, which the Monroe Building hides;
- the entrances.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the ridge, a pinnacle, the south slope and the small gable;
  - both crosses, their stems and their arms;
  - the parapet, a merlon and a crenel;
  - on both street fronts, the hall's windows and piers, their heads, the wide windows,
    a floor's paired windows, the band and the parapet wall;
  - the upper floor's three windows on its gable end, and the small gable's one;
  - the north wall, blank below its eighth floor;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
