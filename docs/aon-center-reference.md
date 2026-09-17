# Aon Center reference audit

The study follows Aon's `layer3` group in `skyline-animated.svg`. The local source
photo, `skyline.jpg`, shows the same corner-on night view. The measured group has
227 shapes: one dark shell, 76 dark front-face bands, 15 granite pier polygons
on each visible face, three roof and corner pieces, and tonal overlays. Its
layer-space extent is approximately x 4793–5408 and y 78–2806. The right edge
and roof sit outside the earlier seven-building viewBox, so the reference and
camera fit grew around their previous center by a factor of 1.19979.

| Drawing feature | Layer point |
| --- | ---: |
| West end of roof rim | (4807.686, 115.434) |
| Near roof corner | (5148.845, 88.061) |
| East end of roof rim | (5401.877, 155.047) |

The two faces have independent pier rhythms in the drawing: the front's 15
granite strips begin at x 4807.910 and step by 21.765 layer units; the east
face's 15 strips begin at x 5212.048 and step by 12.284. The fitted test probes
13 interior piers on each face as actual raised geometry, plus six band centers
spread over the tower's height. The rendered skyline, elevated, rear, and mobile
views were inspected for the roof rim, windows, closure, and overlap.

The [Aon Center tenant portal](https://www.aoncenter.info/main.cfm?pid=aboutaon&sid=about)
lists 83 floors and 1,136 ft (346.3 m). The
[Chicago Architecture Center](https://www.architecture.org/online-resources/buildings-of-chicago/aon-center)
describes its outer structural tube and white granite recladding. The
[recladding engineer's project profile](https://www.wje.com/assets/pdfs/projects/Amoco_Building.pdf)
confirms the granite replaced the original Carrara marble. Those sources guide
the white piers and dark window slots; the local SVG and photo determine the
visible grid and proportions.

The model's roof stands 411 m above the study platform, with a 70 × 67 m plan,
placed at `across = 370`, `towardCamera = 40`. The drawing exaggerates height:
its roof rises roughly 2,590 layer units above the platform datum, which this
shared long-lens camera cannot produce from a 346 m tower at plausible depth.
The 411 m value follows the illustration, not a surveyed height. The source
photo also projects Aon's east roof edge more steeply than the shared camera
projects a level roof. At desktop, the fitted roof differs from the drawing by
about +11 layer units at the west end, +20 at the near corner, and −27 at the
east end vertically. The largest normalized roof error across five layouts is
0.00761, within the measured 0.008 limit. Rotating or stretching the plan to
force those slopes would turn a near-square tower into an implausible deep slab;
the residual is kept visible instead.

The roof parapet closes the visible shaft silhouette. Two low screened service
enclosures add detail in elevated orbit views while staying below that rim.
The north and west facades extend the measured pier and pane language for orbit
views; they are inferred because the drawing does not show them. Sparse pane
tones remain grayscale, consistent with the study. The photo's rooftop antenna
lights are omitted because the SVG draws a clean, flat roofline. The model is
authored from closed solids and window panels, with no photo texture or
downloaded model.
