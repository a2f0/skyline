# Trump International Hotel and Tower reference audit

The skyline study keeps the source SVG's composition and its restrained night treatment while
using documented building information to decide what the simplified drawing leaves ambiguous.
The runtime asset is a local procedural mesh: no photograph, map, streamed model, or external
service is used.

## References inspected

| Reference | What it establishes |
| --- | --- |
| `skyline.jpg`, cropped with `bun scripts/measure-group.js building-trump-tower-only` | The aligned source image establishes the stepped silhouette, narrow dark crown, offset spire, visible south-east faces, and the lower facade hidden by One Prudential Plaza. |
| The same script's drawing crop and per-path measurements | The group contains eight paths with layer-space bounds `3890.4, 187.5, 4217.4, 1805.5`; its roof corners, crown corners, spire tip, and upper-shaft mullions anchor the fitted features. |
| [CTBUH / The Skyscraper Center](https://www.skyscrapercenter.com/building/wd/203) | The published architectural height is 423.2 m (1,389 ft), the building has 98 floors, and its curtain wall uses glass panels in aluminum frames. |
| [Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/trump-tower) | The design's rounded edges, colored glass, tapering setbacks, riverfront site, and Skidmore, Owings & Merrill authorship provide the architectural reading used to resolve the drawing. |

The external material is reference only. Its imagery and text are not copied into the repository
or published with the study.

## Model choices

- A continuous closed shaft with a 2.7 m bow on its broad south face reaches the low east shoulder.
  The curve follows the source roof's softened front contour and the aligned photograph; the
  measured front mullions were refitted through the camera after the bow was introduced. Closed
  roof-cap pieces continue the higher south face and bevel, then form the source's vertical drop
  and sloped low roof on the east face without adding broad lower setbacks.
- Glazed floor panels, horizontal bands, and proud mullions carry the measured grid across the
  south, bevel, and east faces. The source's forty-one regular shaft strokes repeat every 21.3645
  layer units; their camera fit gives a 3.482373 m model pitch and a 2.161462 m platform-relative
  phase. Charcoal panes with scattered muted gray occupied windows retain the study's grayscale
  night treatment without adding a texture. The four roof-step vertices are physical geometry for
  raycasts and elevated views to inspect.
- A narrower, east-offset crown enclosure stays inside the shaft's east wall and rests on a hidden
  roof plinth. Twenty-three light ribs and three seams follow its south face, bevel, and east face;
  matching rear ribs and a shallow parapet finish the elevated orbit. Three nested closed mast
  sections rise from its roof to reproduce the visible antenna joints.
- North and west faces continue the grid with inferred bays and slim transoms. They are a consistent
  curtain-wall treatment for orbit views rather than a survey of the building's concealed facades.

## Fit and limits

The model's tip is 406.6 m above the study platform. That is a fitted drawing datum, while CTBUH's
423.2 m is an architectural height above the building's street datum, so the two figures are not
directly interchangeable. The model is constrained by ten sharp source vertices and fifty-two
upper-shaft and crown mullions across every tested layout. Trump stands behind One Prudential in the skyline
view, preserving the source drawing's lower-facade occlusion while keeping the crown and spire
available for independent hover.

Validation combines the five-layout landmark, column, and sampled floor-row measurements,
first-surface raycasts to the raised mullions, floor bands, bowed front, and rear glazing,
closed-solid and coplanar-overlap checks, and front, rear, and elevated render review. The
additional orbit geometry raises the scene to 75,441 triangles. The broad lower facade is
deliberately continuous where the drawing leaves it obscured; matching unseen floors or an exact
structural survey is outside this visual study's scope.
