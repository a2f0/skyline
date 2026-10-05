# Borg-Warner Building: reference audit

`src/models/borg-warner-geographic.ts` builds the Borg-Warner Building, 200 South Michigan
Avenue, for the geographic layout only. The drawing shows it across Adams from Peoples Gas,
before the Railway Exchange Building. That is outside the excerpt the original layout is
fitted to, so the original layout has no model of it. The model is a reconstruction from
OpenStreetMap, published history, the drawing and photographs, not a survey or
construction drawings.

## References checked September 28, 2026

- [OpenStreetMap way 124873918](https://www.openstreetmap.org/way/124873918), version 8: the
  outline on the south-west corner of Michigan and Adams, tagged 21 levels and glass, with
  no height. It was retrieved through the
  [map API](https://api.openstreetmap.org/api/0.6/map?bbox=-87.6320,41.8760,-87.6150,41.8920),
  with Willoughby Tower's. It shares its south wall's nodes with Symphony Center, way
  145493030, tagged 9 levels.
- The City of Chicago's [guide to the Historic Michigan Boulevard District](https://www.chicago.gov/content/dam/city/depts/zlup/Historic_Preservation/Publications/Michigan_Blvd_HD_guidelines_04FEB2016.pdf),
  2016:
  - the Borg-Warner Building, 1958, 240 ft, 258 ft at the penthouse;
  - Orchestra Hall, 220 South Michigan, 102 ft.
- [The Skyscraper Center](https://www.skyscrapercenter.com/building/borg-warner-building/18617):
  83.5 m (274 ft) architectural and 89 m (292 ft) to the tip, 22 floors, 1958, A. Epstein
  and Sons International.
- [Emporis, archived in 2007](https://web.archive.org/web/20070504130601/http://www.emporis.com/en/wm/bu/?id=borgwarnerbuilding-chicago-il-usa):
  22 floors, 1958, A. Epstein and Sons International and the George A. Fuller Company.
- [Architecture Farm](https://architecture-farm.com/2023/04/24/postwar-chicago-skyscraper-of-the-week-borg-warner/):
  - A. Epstein & Sons and William Lescaze, 1955–1958;
  - "aluminum mullions in a natural finish and blue porcelain-enameled steel for spandrel
    panels";
  - a "20-story tall office building", with "Borg-Warner's 21st-floor penthouse executive
    offices".
- `skyline.jpg`, the repository's 2013 panorama from the Adler Planetarium's lakefront. The
  drawing was traced from it, and `scripts/fit-geographic-camera.ts` recovers its camera;
  see [the geographic audit](skyline-geography.md#skyline-camera). At the building, about
  10 of the drawing's layer units are one metre of height. The photograph shows:
  - the Michigan and south fronts' grid of mullions and a spandrel to each floor;
  - a deep dark band at the top;
  - the lit penthouse over it at the south-east corner;
  - a pale block behind the penthouse, under a BorgWarner sign.

## Heights

Where published heights disagree, the layout takes the one nearest the drawing's reading.
Read on the drawn Michigan front through the geographic camera:

| Feature | Drawn | Published | Model |
| --- | ---: | --- | ---: |
| Roof, the fascia's top | 76 m | The City's 240 ft | 73.2 m |
| Penthouse's top | 79.1 m | The City's 258 ft; nothing else | 78.6 m |
| Block's top | 84.5 m | The Skyscraper Center's 83.5 m | 83.5 m |

The Skyscraper Center's 89 m tip is likely the sign, which the drawing leaves out, and so
does the model. The record's height is the block's, its part's top the roof.

Heights read on the curtain wall are scaled by 73.2/76, so that the drawn fascia meets the
published roof:

| Feature | Height | Basis |
| --- | ---: | --- |
| Lobby | 0–5.2 m | Estimate: under the drawn floors |
| Typical floor | 3.09 m | Drawing: the spandrels, 3.21 m apart as drawn |
| Spandrels | 94 cm deep | Drawing |
| Top floor's windows | 68–70.2 m | Drawing |
| Fascia | 70.2–73.2 m | Drawing: its top the published roof |
| Penthouse | 73.2–78.6 m | Published: glass to 78 m under a cap, as drawn |
| Block | 73.2–83.5 m | Published |

The hill in the drawing hides the building below 34 m. Carried down at the drawn pitch to a
5.2 m lobby, the spandrels give twenty-two floors under the roof; that count is an
extrapolation. The Skyscraper Center and Emporis give 22 floors, which may count the
penthouse. Architecture Farm gives twenty storeys and a 21st-floor penthouse, which would
need taller floors than the drawing and photograph show above 34 m, though the hidden
lower floors could be spaced differently. The lower floors are estimates.

## Plan

The mapped outline is 31.3 m along Michigan and 51.7 m along Adams. Its Michigan wall stands
up to 9.5 cm inside the line between its corners.

Projected through the geographic camera, the Michigan front spans −569 to −341 layer units at
its top. The drawing's front runs from −481 to −261, 80 to 88 units right of the
projection. The drift grows toward the left of the panorama, from about 70 units at Peoples
Gas.

The drawn front has 22 bays of mullions between corner columns, about 1.33 m apart. The
corner columns are about 1.2 m wide. The model spaces mullions 12 cm wide evenly between the
corner columns, 1.33 m apart as near as fits: 22 bays on Michigan, and 37 on Adams and the
south front.

The rooftop footprints are estimates, found where their drawn edges meet the projection:
- The penthouse stands at the south-east corner, flush with both fronts. It runs 22 m up
  Michigan and 39 m along the south front, taking in the drawn lower part west of the
  block.
- The block's drawn corners put it 14 to 27.4 m from Michigan and 1 to 28.3 m from the
  south front.

## Model

- **Michigan, Adams and south fronts:** a curtain wall.
  - Mullions from grade to the roof, and clad corner columns 1.2 m wide.
  - A spandrel to each floor and the lobby's glass under them, and the deep fascia at the
    top.
  - On the south front, the wall below Symphony Center's 102 ft roof, which it shares,
    stays plain; the row the roof crosses is split there.
- **Alley:** windows 1.6 m wide spread evenly about 3.2 m apart, one to each floor above the
  lobby. The drawing does not show this wall, so they are an estimate.
- **Penthouse:** glass between the same mullions and corner columns, under a light cap.
- **Block:** plain.

Colours follow the drawing's greys, not the spandrels' blue.

Omitted:

- the sign on the block;
- the entrances and the lobby's interior;
- Symphony Center, which hides the south wall's lower floors.

## Verification

`bun run check` covers it:

- `tests/building-kit.test.ts` checks counted triangles, winding, same-facing coplanar
  overlaps, and covered omissions.
- `tests/skyline-geography.test.ts` raycasts:
  - the block's, the penthouse's and the roof's tops, and the record's one part;
  - the curtain wall's 22 bays on Michigan and 37 on Adams and the south front;
  - a window, its spandrel, the fascia, a mullion and a corner column;
  - twenty-two windows up a bay, one to each floor;
  - the south front plain just below Symphony Center's roof and glazed just above, and the
    alley's ten windows;
  - the penthouse's 15 bays on Michigan and its cap;
  - the block, 14 m behind the Michigan front;
  - the model's exported palette, whose window tones no wall shares;
  - the exact mapped outline at grade.

  Every mesh is closed.

Reference pages are research inputs only; the viewer downloads nothing from them.
