# Two Prudential Plaza reference audit

The second pass keeps the SVG's composition and monochrome treatment, but uses photographs to
resolve construction details the drawing simplifies. This follows the custom-landmark direction
in [issue #4](https://github.com/a2f0/skyline/issues/4): local geometry, independent hover, recognizable
silhouettes, and no streamed map or photo-texture dependency.

## References inspected

| Reference | What it establishes |
| --- | --- |
| `skyline.jpg`, cropped with `bun scripts/measure-group.ts building-two-prudential-plaza` | The original night photograph, aligned with the SVG, establishes which faces the composition shows. |
| The same script's drawing crop and per-path measurements | The composition's silhouette, three south chevrons, floor rhythm, facade strips, pyramid and spire landmarks. |
| [Building owner's tower photograph](https://www.theprulife.com/wp-content/uploads/2022/07/dsc08667_shift.jpg), from [The Pru Life's history](https://www.theprulife.com/a-chicago-landmark-reborn-the-history-of-one-two-pru/) | The crown's broad raised ribs, recessed mechanical openings, horizontal cladding, and continuous glazing inside the pointed chevrons. |
| [Steven Henry's crown close-up](https://images.skyscrapercenter.com/building/two-prudential-plaza_ext-crown_%28c%29stevenhenry.jpg), via [CTBUH / The Skyscraper Center](https://www.skyscrapercenter.com/building/two-prudential-plaza/489) | Louver blades and supporting frames inside the dark crown openings, folded spire edges, inset faces, and spire joints. |
| [2006 street-level photograph](https://commons.wikimedia.org/wiki/File:2006-08-16_1580x2800_chicago_two_pru.jpg) | Depth of the projecting chevrons, glazing and fine mullions, and the window bands on their side returns. |
| [May 2016 photograph](https://commons.wikimedia.org/wiki/File:Two_Prudential_Plaza_Chicago_in_May_2016.jpg) | The relationship of the crown ribs to the glazed chevron heads and the thin coping on the lower setbacks. |

The external photographs are viewing references only. They are not copied into the repository or
published as textures. Their source pages retain the photography credits and reuse terms. The
runtime asset is our procedural mesh, with materials and geometry served locally.

## Changes supported by the references

- Raised crown fascia, recessed louver blades, and a fine support grid replace flat roof stripes.
  A continuous dark enclosure closes the roof beneath these details.
- Four closed, tapering ridge beams meet the spire. Each beam spans its ridge; displacing the two
  neighboring roof faces independently leaves a slit down the centre and is not a substitute.
- The spire has dark inset panels separated by small joints, bright folded edges, and an exposed
  final tip. Its foot remains seated in the roof.
- The pointed facade panels contain four glazed bays with thin mullions and floor divisions.
  Panes clip to the sloping heads and the next setback, instead of leaving flat-ended gaps.
- Pier heads stop floor by floor, with a short angled cap on each step, retaining the references'
  sawtooth rhythm. Both lower setbacks have thin projecting coping and
  glazed returns. Paired north setbacks make the tower's depth readable when orbiting; their
  details mirror the visible south face and remain an inference rather than a survey.
- The east facade includes the two narrow strips flanking the central glazing. The first pass
  incorrectly treated them as completely hidden: `path6422` contains both. The specification now
  measures nine east strips, twenty-nine columns in all.

## Fit and limits

The thirteen existing landmarks, placement, camera framing, and their tolerances are unchanged.
The model retains the drawing's 345.79 m platform-relative tip height rather than substituting the
real building's 303.3 m street-relative height. Likewise, the roof uses eight fitted facets behind
four raised ridges: the drawing's corner and chevron heights do not describe a perfectly planar
four-sided pyramid. A literal surveyed reconstruction would change this comparison's silhouette.

The construction details are simplified to read in the study. The openings have dark solid backing,
not a complete model of the rooftop mechanical equipment. Small glazing-tone differences suggest
separate panes without embedding a photograph or adding reflective environment assets.

Validation combines five-layout landmark and column measurements, the existing coplanar-overlap
and face-coverage checks, and first-surface raycasts through the crown bands, ridge centre, louver,
spire panel/edge/tip, and the rear chevron. Review the full skyline and close-up renders from the
front, rear, and elevated angles; counts alone cannot establish that the added detail is visible.
