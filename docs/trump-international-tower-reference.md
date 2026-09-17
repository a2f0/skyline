# Trump International Hotel and Tower reference audit

The skyline study keeps the source SVG's composition and its restrained night treatment while
using documented building information to decide what the simplified drawing leaves ambiguous.
The runtime asset is a local procedural mesh: no photograph, map, streamed model, or external
service is used.

## References inspected

| Reference | What it establishes |
| --- | --- |
| `skyline.jpg`, cropped with `node scripts/measure-group.cjs building-trump-tower-only` | The aligned source image establishes the stepped silhouette, narrow dark crown, offset spire, visible south-east faces, and the lower facade hidden by One Prudential Plaza. |
| The same script's drawing crop and per-path measurements | The group contains eight paths with layer-space bounds `3890.4, 187.5, 4217.4, 1805.5`; its roof corners, crown corners, spire tip, and upper-shaft mullions anchor the fitted features. |
| [CTBUH / The Skyscraper Center](https://www.skyscrapercenter.com/building/wd/203) | The published architectural height is 423.2 m (1,389 ft) and the building has 98 floors. |
| [Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/trump-tower) | The design's tapering setbacks, riverfront site, and Skidmore, Owings & Merrill authorship provide the architectural reading used to resolve the drawing. |

The external material is reference only. Its imagery and text are not copied into the repository
or published with the study.

## Model choices

- A continuous closed clipped shaft reaches the short east shoulder. A separate raised west roof
  creates the source's asymmetric roof step without adding unobserved lower setbacks.
- Glazed floor panels, horizontal bands, and proud mullions cover the south and east faces. The
  shoulder and roof are physical surfaces, so the source's step has geometry for raycasts and
  elevated views to inspect.
- A narrower, east-offset crown enclosure has dense dark ribs and four seams. Three nested closed
  mast sections rise from its roof to reproduce the visible antenna joints.
- North and west faces continue the visible massing as closed, simplified volumes. They are an
  inference for orbit views rather than a survey of the building's concealed facades.

## Fit and limits

The model's tip is 405.8 m above the study platform. That is a fitted drawing datum, while CTBUH's
423.2 m is an architectural height above the building's street datum, so the two figures are not
directly interchangeable. The model is constrained by seven sharp source vertices and twenty-nine
upper-shaft mullions across every tested layout. Trump stands behind One Prudential in the skyline
view, preserving the source drawing's lower-facade occlusion while keeping the crown and spire
available for independent hover.

Validation combines the five-layout landmark and column measurements, first-surface raycasts to
the raised mullions and floor bands, closed-solid and coplanar-overlap checks, and front, rear,
and elevated render review. The broad lower facade is deliberately continuous where the drawing
leaves it obscured; matching unseen floors or an exact structural survey is outside this visual
study's scope.
