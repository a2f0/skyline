# Chicago Skyline

## Package imports

The repository also builds the `chicago-skyline` ESM package: a complete embeddable
viewer, reusable Three.js scenes and building models, and TypeScript declarations.
Run `bun run build:package` or `bun pm pack` to produce it. See
[package usage and the devopsrockstars integration guide](docs/package.md) for
asset copying, React mounting/cleanup, module imports, and publishing.

## Animated version

The full-screen viewer, `index.html`, opens on the [full-screen 3D skyline](#full-screen-3d-skyline), whose browser modules compile to `dist/`. Build and serve the site from the repository directory with `bun install --ignore-scripts`, `bun run build:site`, and `python3 -m http.server -d dist`, then open `http://localhost:8000`. Use the viewer's fullscreen control or press `F` to enter fullscreen. Select **show enhanced** for the animated drawing described below, **show original** to compare it with `skyline-original-fit.svg`, or **show webgl** to try the GPU-rendered prototype. While its mode shows, each of these reads **3d skyline** and returns to the 3D skyline. You can also open the star's controls at the bottom for **show original**; the original drawing's bottom **3d skyline** button returns to the same camera and open controls. The self-contained comparison file gives the original vector `Landscape` layer the same viewBox, bottom alignment, and artwork offset as the enhanced skyline; the source-photo layer from `skyline.svg` has been removed.

The living-night treatment is entirely vector-based and grayscale. The transparent `skyline-animated.svg` layer keeps the buildings aligned along the bottom and scaled proportionally to fit the viewport. A separate `stars.svg` layer fills the entire viewport behind it with 96 stars, including the sky above the tallest buildings. Ten randomly selected stars (about 10%) softly twinkle; the other 86 stay steady. Positions and the twinkling selection are randomized each time the sky loads, then stay fixed during animation, resizing, and debug toggles. Star positions use percentages and their radii stay fixed so resizing does not stretch the stars. The buildings have no animated lights or beacons. Hover over any building to illuminate it; its name appears immediately in a compact black monospace label offset from the pointer.

The building fidelity treatment also remains entirely vector-based. Clipped tonal gradients separate façade planes, while roof equipment, corner seams, and sparse occupied windows preserve the illustrated style at normal viewing sizes. These architectural details are static and ignore pointer events so they do not interfere with the building hover interactions. Named buildings include Aon Center, 340 on the Park, Blue Cross and Blue Shield Tower, Crain Communications Building, Trump International Hotel and Tower, One and Two Prudential Plaza, Kemper Building, The Heritage at Millennium Park, and Michigan Plaza South. The [building audit](docs/building-labels.md) records the corrected historic-building names and the small silhouettes that remain unidentified.

Each twinkling star has its own slow cycle of approximately 40–67 seconds and a random starting phase. Brightness varies subtly between 42% and 60% opacity, with fresh brightness levels each cycle, gradual transitions, and quiet pauses between twinkles.

Stars pause automatically when the browser reports the operating system's reduced-motion preference. The viewer displays the current preference and animation mode, updating immediately when the preference changes. Building hover highlights still work with reduced motion enabled, without an animated transition.

Use **debug motion** to preview a slightly wider brightness range (30–70% opacity) on the same ten stars, at the same gentle 40–67-second pace. All stars stay the same size. This opt-in preview overrides reduced motion until you select **stop debug** or reload the page. You can also open `stars.svg#debug-motion` directly to preview this mode; remove the fragment to return to the system preference.

The index page's loading indicator is an inline SVG roofline traced left to right with CSS,
then faded and repeated until the first 3D frame appears. It is a level orthographic
elevation of the mapped buildings, viewed from the skyline camera's horizontal direction,
with no perspective or facade edges. Reduced motion shows the complete outline. After
adding or changing buildings, run `bun scripts/skyline-loading.ts` to refresh the inline
path in `skyline-3d.html`; `bun run check` catches a stale outline. The normal site build
still only compiles TypeScript and copies assets.

## WebGL prototype

`skyline-webgl.html` uses `skyline-animated.svg` as source artwork. At runtime it rasterizes 38 SVG paint layers representing 31 building identities into cropped GPU textures, draws them as subtly depth-shifted quads, applies façade shading and hover illumination in a fragment shader, and resolves overlapping buildings with an offscreen color-picking pass. Separate portions of one building share a hover identity and parallax depth while keeping their original draw order. The foreground remains a separate top layer, and the existing star field stays visible beneath the transparent WebGL canvas.

Because the prototype fetches and decomposes the enhanced SVG at runtime, serve `dist/` as above rather than opening the WebGL mode through `file://`. The enhanced and fitted-original SVG modes continue to work when `index.html` is opened directly; the 3D skyline it opens on then says how to build or serve the site instead.

## Single-building 3D study

Select **3d building** in the viewer, or open `http://localhost:8000/building-study.html` while serving `dist/`. This first experiment for [#4](https://github.com/a2f0/skyline/issues/4) places a custom Crain Communications Building model beside its existing SVG illustration.

Drag to orbit, scroll or pinch to zoom, and hover to illuminate the building and display its name. Front, three-quarter, and side buttons make the shape easy to compare. **Wireframe** exposes the triangles; **turntable** opts into a slow rotation. Focus the canvas and use arrow keys to rotate, `+` / `−` to zoom, or `Home` to reset. Reduced motion disables drag movement and the turntable; view buttons and keyboard controls remain available as immediate changes. The renderer only draws when the view changes, except while the turntable is running, and suspends rendering in a hidden tab.

The model is the tower as built, on a squared-up version of its OpenStreetMap plan: two prisms split along the north-west to south-east diagonal, each under a glazed roof falling toward Millennium Park, so the two read as one diamond. A slot opens between the peaks down to a 152.5 m floor, and a V-notch runs the full height at each end of the split. White aluminum spandrels alternate with continuous ribbon windows on a 3.5 m floor pitch above a tall glazed lobby. The sloped glass carries a raised grid, the diamond's outer edges a lit outline, and the diagonal edges a dark coping. It uses grayscale toon materials, real perspective, depth testing, directional shadows, and raycast hover selection. `models/crain-tower.ts` builds it from a plan and roof planes, `models/crain-communications.ts` supplies the clean plan, and `models/crain-geographic.ts` the mapped one.

It is a reconstruction from published data, not a survey. The 177.4 m height comes from the [Skyscraper Center's building record](https://www.skyscrapercenter.com/building/150-north-michigan-avenue/2441). The plan, the split, and the notches come from the mapped outline. The roof slope, both peaks' heights, the band pitch, and the spandrel-to-glass proportion are measured on the photograph the drawing was traced from; the [reference audit](docs/crain-reference.md) records each source. The lobby's height, the window module, and the roof grid's spacing are estimates. `models/crain-reference.svg` is an excerpt of the existing `building-crain-communications` group, with a padded viewBox and no third-party artwork. The model is authored locally and uses no external model, photographic texture, or map tiles.

For this experiment, local Three.js was chosen to explore the custom geometry and materials with little scene setup. The existing raw WebGL renderer remains useful for the SVG layers, but would need its own camera, mesh, lighting, and picking implementation for this study. Cesium is still a candidate for a later georeferenced city comparison; streamed OSM or footprint extrusions would need custom roof geometry to reproduce this landmark. This experiment does **not** settle the engine or data choice for the full skyline in #4. The skyline study below now compares a fitted camera and local geographic data. A larger city scene, evaluation of Cesium, and additional buildings remain future work.

Three.js is vendored under its MIT license; see `vendor/README.md` for provenance and regeneration. The study loads entirely from the local server without API keys, paid services, or CDN access. The enhanced, original, and 2.5D WebGL viewer modes remain available through **back to skyline**.

## Skyline study

Select **skyline study** in the viewer, follow **Skyline study** from the solo study, or open `http://localhost:8000/skyline-study.html`. The page opens on the geographic layout, described below; **original drawing**, or `skyline-study.html?layout=original`, shows the drawing's fit. That layout places the Heritage at Millennium Park, Kemper, Crain Communications, Michigan Plaza South, Trump International Hotel and Tower, One and Two Prudential Plaza, and Aon Center together in one 3D scene, beside an excerpt of their original SVG geometry. Each building highlights independently, and a nearer tower blocks hover on the one behind it. **Skyline view**, **reset view**, and the `Home` key return to the composition fitted to the drawing; three-quarter, side, orbit, zoom, wireframe, and turntable let you inspect the depth. The comparison stacks vertically on mobile.

The initial camera uses a 6° field of view, approximately 41.5° azimuth, and a low eye position below the roofs. Its −2° elevation preset is limited by the camera's above-ground height constraint as the framing widens. The SVG's facade widths, shallow roof slopes, and relative placement guide the fit. A long lens keeps the verticals nearly parallel. The clipping range follows the allowed zoom distances with a margin around the scene, preserving fine facade detail and keeping the towers visible even in tall tablet layouts. The camera stays above ground at every orbit and zoom distance, including on mobile. This is a visual fit to the drawing, not recovered camera metadata or a geographic reconstruction. Depth, hidden faces, lower floors, and tower proportions are approximate.

Crain in this scene is the solo study's building itself, from the drawing's datum up. The drawing shows the tower from the photograph's treeline, which crosses it 39.6 m above the street, so the skyline copy starts there. Fitted through the skyline camera to the drawn diamond and the twenty-nine sills its left face shows, it stands 1.276 times its real size, turned 4.86°: the same exaggeration the drawing gives the other fitted towers. The drawing simplifies the slot, widening it 45% beyond the photograph and flattening its foot, so the slot corners are held to the geometry rather than to the drawing. It uses seven mesh batches and 33,016 triangles.

`models/kemper.ts` builds a closed rectangular tower, recessed crown, roof cap, window bays, and raised mullions in five mesh batches. `models/michigan-plaza-south.ts` adds a closed dark tower with a flat roof and a dense window grid on all four faces in four mesh batches.

`models/heritage-at-millennium-park.ts` describes the Heritage at Millennium Park as plan runs, straight or arced, and maps every panel, band, and fin onto them with analytic normals from `models/building-kit.ts`, so the curved faces shade smoothly. The tower has a south stub, a flat south face, a convex east bow with a 57 m radius, and a flat north strip along the bow's end tangent; a lower tier with a shallow concave face stands in front of it. Window panes (one per floor per bay, with subtle tone variation and scattered lit units), raised mullions, six-floor bands, and slab edges follow the drawing's floor pitch, and a dark balcony stack is recessed between raised jambs where the bow ends. Radial crown fins stand under a projecting cap that wraps the hidden north and west faces, and one rooftop mechanical block pairs the louvered screen with a lower loggia frame. The lower tier has its own finned crown and three-floor bands. Fins, mullions, bands, and slab edges are closed solids. The model uses five mesh batches plus silhouette lines, 13,171 triangles in all.

Trump International Hotel and Tower is the tower as built, from `models/trump-tower.ts`, on its mapped podium, setbacks, shaft, and crown. Its curtain wall hangs in 6 ft units between polished stainless mullions standing 23 cm proud, with a brushed stainless spandrel at every floor on the photograph's 3.214 m pitch, one mitred skin round each traced curve. The photograph puts the main roof at 354.4 m, stepping down to 347.3 m over the north-east end, where the glazed crown rises to 364.9 m; the spire's three sections reach the published 423.2 m tip where the photograph shows it. `models/trump-international-tower.ts` places a copy of the shaft and crown from the drawing's 40.7 m datum up, its shaft running straight down behind One Prudential, fitted through the skyline camera at all five layouts to the drawn roof, step, crown, and spire, fifty-two drawn mullion lines, and the drawn floor rows. It stands 1.065 times its real size, turned 7.95°. The [reference audit](docs/trump-reference.md) records the sources, measurements, fit, and residuals. It uses six mesh batches and 29,108 triangles.

One Prudential Plaza is the building as built, from `models/one-prudential-tower.ts`: a limestone slab of forty-one floors on the mapped plan. Uninterrupted limestone piers stand one 2.35 m bay apart, with a window and an aluminium spandrel in every bay on every floor at the photograph's 3.93 m pitch, and wider piers turn each corner. The forty-first floor's observatory is a band of glass under the coping at the photographed 169.5 m roof. On the roof, a penthouse carries the Prudential sign under a louvered screen to the published 183.2 m, and a tubular steel mast carries WGN's antenna to the published 278 m tip. The east wing wraps the slab's east end, its limestone ribs on the same module, to the photographed 56.4 m. `models/one-prudential-plaza.ts` places a copy from the drawing's 40 m datum up, fitted through the skyline camera at all five layouts to the drawn roof, penthouse, and mast, the drawn piers, the screen's fins, the wing's ribs and corners, and the drawn window rows. It stands 1.314 times its real size, turned 7.29°. The [reference audit](docs/one-prudential-reference.md) records the sources, measurements, fit, and residuals. It uses seven mesh batches and 19,430 triangles; the eight-building scene totals 170,215 triangles within its 169,000–171,000 budget.

Depth does not come from the drawing, because moving a building away and scaling it up reproduces the same picture; One Prudential's comes from occlusion instead, since the drawing paints it over Michigan Plaza South's rightmost 47 layer units. Its placement and camera presets live in `skyline-study.ts`. Both study pages use `study-viewer.ts` for rendering and interaction, `study.css` for presentation, and `study-loader.ts` for loading and fallback messages. Each page supplies its own model list and framing, so more studies can reuse the same viewer.

Two Prudential Plaza is the tower as built, from `models/two-prudential-tower.ts`: a 40.8 × 37.5 m limestone core, with piers on every bay and a window in each bay on every floor at the photograph's 3.96 m pitch. Each face ends in a gable whose stone bays step up a floor a bay, under white copings, from the corners' 229.3 m to a pointed glass strip at the face's middle, 256 m. A stepped pyramid turned 45° to the plan rises from those four points to 280.2 m, its steps glass under white bands and its ridges ribbed, and a spire turned with it runs on to the published 303.3 m tip. On the north and south faces two gabled tiers stand forward of the core, each with its own stepped gable and glass strip. `models/two-prudential-plaza.ts` places a copy from the drawing's 35.4 m datum up, fitted through the skyline camera at all five layouts to the drawn eaves, gables, pyramid, spire and tiers and to the drawn piers of the core's south and east faces and the lower tier. It stands 1.289 times its real size, turned 8.59°, behind One Prudential's podium, with that overlap verified by raycast hover. The [reference audit](docs/two-prudential-reference.md) records the sources, measurements, fit, and residuals. It uses seven mesh batches and 37,368 triangles.

When Two Prudential was first added, the taller reference kept its width, so normalized tolerances were retained at that stage; the camera target rose and the platform deepened to contain it. That reframe also required a 5 cm leftward correction to One Prudential's placement to retain its podium silhouette bound. Aon later widened the frame and the inherited limits were remeasured.

Aon Center is the tower as built, on its published 59.15 m square with a notch cut into each corner, from `models/aon-tower.ts`. Granite V-shaped columns stand one 10 ft module apart, fifteen bays to a face. Dark glass fills each office floor between them on the photograph's 3.87 m pitch, above a tall glazed lobby. The glass runs on over the mechanical floors to a granite cap, as daylight photographs show, the notched corners are solid stone, and a louvered enclosure and an antenna stand on the roof. `models/aon-center.ts` places a copy from the drawing's 30.6 m datum up, fitted through the skyline camera at all five layouts to the drawn roof, the fifteen drawn piers on each face, and the drawn floor bands. It stands 1.329 times its real size, turned 10.2° so the camera meets its faces as the photograph does. The [reference audit](docs/aon-reference.md) records the sources, measurements, fit, and residuals. It uses six mesh batches and 22,420 triangles.

The Heritage plan, heights, and placement were fitted numerically through the skyline camera to the drawn corners, mullions, fins, and lower cap. The camera-facing flat face and bow radius are about 1.3 times the OpenStreetMap trace, and the whole tower plan about 1.1–1.2 times, because the drawing is wider relative to its heights than the real building; the hidden north and west faces are simplified closures rather than that outline, and the lower tier keeps roughly its traced size; the 3.79 m floor pitch likewise follows the drawing rather than the building's 3.37 m average. The drawing also exaggerates how far the curved bands sag toward the right, roughly twice what any camera consistent with the other towers produces, so the model matches horizontal positions and corners and leaves that sag as a residual: the crown cap's north end sits about 14 layer units above its drawn corner in the desktop layout, and up to about 21 in the tall one. Framing the earlier five-building scene moved those from about 9 and 19: the sag is unchanged, but the wider frame places the camera differently. The real lower tier extends farther south, unlit and hidden in the photo; the model trims it along the skyline view's line of sight so nothing appears left of the drawn silhouette.

`models/skyline-reference.svg` contains the unmodified `building-heritage-at-millennium-park`, `building-kemper`, `building-michigan-plaza-south-tower`, `building-crain-communications`, `building-trump-tower-only`, `building-one-prudential-plaza`, `building-two-prudential-plaza`, `building-prudential-plaza-podium`, and Aon's `layer3` groups from `skyline-animated.svg`, preserving their positions, nested transforms, and draw order. It also carries the source definitions used by Aon's in-group tonal overlays. Its padded viewBox matches the study's framing. `models/skyline-panorama.svg` carries all 38 of the drawing's building groups, identified and not, in the geographic layout's wider frame; `bun scripts/reference-svg.ts` regenerates both. The unidentified historic facade in front of the Heritage and the three buildings in front of Michigan Plaza (Millennium Park Plaza and 168 and 180 North Michigan Avenue, named since through the geographic camera; see the [building audit](docs/building-labels.md#names-from-the-geographic-camera)) are omitted; the drawing's blank lower façade and uneven base extend into those obscured areas. The 3D study infers continuous windows and a shared ground plane there. No photo texture, external model, or runtime service is used.

## Geographic skyline comparison

In `skyline-study.html`, the **geographic layout**, the page's default, moves the same eight buildings
to local OpenStreetMap footprints and parts, with published overall heights
(Kemper uses OSM's height), and adds 330 North Wabash, the Blue Cross and Blue
Shield Tower, 340 on the Park, The Buckingham, Millennium Park Plaza, Willoughby Tower,
Six North Michigan, the Michigan Boulevard Building, 180 North Michigan Avenue, the
University Club of Chicago, the Monroe Building, the MacLean Center, the Lake View
Building, the Peoples Gas Building, the Borg-Warner Building, the Railway Exchange
Building, the Gage Building, the Edson Keith and Theodore Ascher Buildings, the Chicago
Athletic Association, Two Illinois Center, River Plaza, the Hyatt Regency Chicago West
Tower, the Sheraton Grand Chicago Riverwalk, Three Illinois Center, and Swissôtel Chicago. It opens on the skyline view from the drawing's own camera: the source photograph's vantage on the lakefront by the Adler
Planetarium, fitted to the mapped roofs and tips while the buildings stay where
they are mapped. That view frames the whole drawn skyline, and the drawing under
the scene becomes `models/skyline-panorama.svg`, every building the drawing shows;
the original layout keeps its excerpt. The page stacks the scene over the drawing,
each the page's full width, so both contain their frame at the same scale. **Ground plan** gives a north-up orthographic plan with street
centerlines and a 100 m grid, and **height comparison** an elevated
orthographic view. Both comparison views preserve camera and zoom when toggling
back to **original drawing**, aligned at Crain so changes in position and scale
remain visible. The original skyline camera and fitted models are retained.

Scroll, pinch, or use **+ / −** for close inspection. Perspective views can zoom
to one tenth of their fitted camera distance; orthographic views support 24×
zoom. **Shift-drag** (or two fingers on touch screens) pans between buildings in
either mode. **Home** or **Reset** restores the layout's starting view.

The table below the viewer compares original and mapped ground extents, east/north
coordinates, and modeled top heights, with source links and assumptions. Crain
is the solo study's building on its three mapped parts: the two halves of the
split and the wedge between them that floors the slot at 152.5 m, with the
notches the mapped outline carries at both ends. Its roofs keep OSM's 133°
downhill bearing, but the photograph sets both peaks at the published 177.4 m
and their fall at about 51°; see its
[reference audit](docs/crain-reference.md). Heritage
has a detailed geographic facade, with terrace elevations from city design
drawings and the published 192.4 m top; see its [reference audit](docs/heritage-geographic-reference.md).
Kemper has a detailed one too: its mapped ground outline and tower part carry
the fitted model's marble shell, window bays, mullions, finned dark crown, and
projecting cap at meter scale, on OSM's 159 m height; see its
[reference audit](docs/kemper-geographic-reference.md).
Michigan Plaza South has a detailed one as well: its mapped outline carries the
44-story curtain-wall grid, pale mullions, and a roof parapet at the published
168.6 m top; see its
[reference audit](docs/michigan-plaza-south-geographic-reference.md). From the
photograph's viewpoint it stands behind One Prudential: the tower the drawing
labels Michigan Plaza South is 330 North Wabash, whose mapped roof corners land
on the drawn ones. The geographic layout adds it, Mies van der Rohe's bronze
curtain wall on the 5 ft module to the mapped 211.84 m, with its lobby on the
25 ft plaza and louvered plant floors; see its
[reference audit](docs/north-wabash-reference.md). Right of Aon, outside the
original layout's frame, it adds the Blue Cross and Blue Shield Tower on its
mapped outline and parts: the glass block forward of end bays that open through
at the middle of its three mechanical bands, and the emblem screen to the
published 226.7 m; see its [reference audit](docs/blue-cross-reference.md).
Beside it stands 340 on the Park, glass on a straight south face, a diagonal
south-east face, and a north face curved for The Buckingham's views. The south
face carries its white concrete frame: a beam every fifth floor, balcony ladders,
the winter garden's tall bay, and the parapet band under a glass guard at the
published 204.9 m. The corner block stands to its photographed 51.7 m; see its
[reference audit](docs/340-on-the-park-reference.md).
Right of it, The Buckingham is a concrete frame of five bays a face on its mapped
outline, a band at every floor over bronze ribbon windows. Its end bays stand forward
of the middle, balconies stack in two notched corners, and its rooftop enclosure rises to
the published 121.9 m; see its [reference audit](docs/buckingham-reference.md).
In front of Michigan Plaza, the geographic camera names the drawing's tower there
Millennium Park Plaza: a 90 m concrete slab to the published 121.9 m, its narrow ends
solid but for four window strips, its long faces punched with windows; see its
[reference audit](docs/millennium-park-plaza-reference.md).
Down Michigan Avenue, Willoughby Tower rises from its limestone base, set back over the
23rd floor under a parapet of pinnacles, through a shaft at the lot's corner to a crown of
arched windows at the published 133.5 m; see its
[reference audit](docs/willoughby-tower-reference.md).
Across Madison, Six North Michigan, the Montgomery Ward Building, keeps its sixteen-storey
block under a projecting cornice and the stub of its tower in the middle of the Michigan
front: an arched stage and a panelled top stage under a cap at 86 m; see its
[reference audit](docs/six-north-michigan-reference.md).
Beyond it the Michigan Boulevard Building's terracotta front, five bays to a floor, rises
twenty-one storeys to an attic under the published 82 m, its brick south wall standing over
20 North Michigan; see its [reference audit](docs/michigan-boulevard-reference.md).
North of Millennium Park Plaza, 180 North Michigan Avenue, the Harvester Building, fills its
lot with twenty-four storeys of masonry under a top floor of arched windows. No height is
published, so its 86.3 m parapet is read on the drawing; see its
[reference audit](docs/north-michigan-180-reference.md).
South of Willoughby Tower, the University Club of Chicago raises the tall arched windows of
its top hall under a crenellated parapet, and behind it a steep roof with its gable on
Michigan, crossed at OpenStreetMap's 67.7 m; see its
[reference audit](docs/university-club-reference.md). The ground plan's frame reaches south
to Jackson for the buildings that follow.
Across Monroe, the Monroe Building's terracotta rises to a steep gable roof holding two
floors, its gable on Michigan, to the Skyscraper Center's 69 m ridge; see its
[reference audit](docs/monroe-reference.md).
Beside it the MacLean Center, the old Illinois Athletic Club, carries six floors added in
1985 over its cornice and frieze of round windows to a pierced parapet at the Skyscraper
Center's 77.4 m; see its [reference audit](docs/maclean-center-reference.md).
Next south, the Lake View Building's narrow front of three windows to a floor rises
seventeen storeys to an arched floor and an attic under the Skyscraper Center's 73.2 m;
see its [reference audit](docs/lake-view-reference.md).
On Adams, the Peoples Gas Building's two fronts rise twenty storeys from granite columns
through paired windows and a colonnade to an attic, a cornice and its cresting at the
City's 272 ft, round a light court on its mapped parts; see its
[reference audit](docs/peoples-gas-reference.md).
Across Adams, the Borg-Warner Building's curtain wall rises some twenty-two floors to the
City's 240 ft, with its penthouse at 258 ft and a block behind it at the Skyscraper Center's
83.5 m; see its [reference audit](docs/borg-warner-reference.md).
At Jackson, the Railway Exchange Building's white terracotta rises seventeen storeys to a
frieze of round windows and a cornice at the City's 235 ft, under a hipped copper roof at the
Skyscraper Center's 259 ft; see its [reference audit](docs/railway-exchange-reference.md).
North of the University Club, the Gage Building's terracotta front by Louis Sullivan rises
twelve storeys in three bays to a parapet at the City's 154 ft, with cartouches over its inner
piers, its brick south wall standing over its lower neighbours; see its
[reference audit](docs/gage-reference.md).
Those neighbours, the Gage Group's Edson Keith and Theodore Ascher Buildings at 24 and 30 South
Michigan, raise red brick fronts of Chicago windows seven storeys to plain parapets at the
HABS record's 101 ft; see their
[reference audit](docs/keith-ascher-reference.md).
North of the Gage, the Chicago Athletic Association's Venetian Gothic front rises through its
great arcades, a traceried eighth floor, a carved frieze and cornice to a top storey of diaper
brick and roundels, at the levels of the Historic American Buildings Survey's measured
drawings and their 149 ft 4 in parapet; see its
[reference audit](docs/chicago-athletic-association-reference.md).
Between Two Prudential and Aon, the drawing's one building is two: Two Illinois Center's dark
curtain wall to the published 114.3 m in front, and behind it River Plaza's white concrete
frame under a rooftop box to the published 159.7 m, the only mapped building on that sightline tall enough to
reach the drawn top; see their [reference audit](docs/river-plaza-two-illinois-center-reference.md).
The ground plan's frame reaches north across the river for River Plaza.
Between Aon and the Blue Cross tower, the Hyatt Regency Chicago's West Tower raises its brick
slab of narrow window slots to the published 111.3 m; see its
[reference audit](docs/hyatt-west-tower-reference.md).
Across the river, right of The Buckingham, the Sheraton Grand Chicago Riverwalk raises its
cream precast L of punched windows, the corner's round tower two floors over the arms, and
three drums of maroon fins, the corner's to the published 112.3 m; see its
[reference audit](docs/sheraton-grand-reference.md).
Between 340 on the Park and The Buckingham, Three Illinois Center's dark bronze curtain wall
rises to the published 106.7 m, its top two floors a windowless mechanical penthouse; see its
[reference audit](docs/three-illinois-center-reference.md).
Behind them, the Swissôtel's triangular glass tower rises to the published 139.3 m and closes
the seam where Three Illinois Center meets The Buckingham; see its
[reference audit](docs/swissotel-reference.md).
One Prudential's is the same building as the original layout's copy, on the
mapped tower, wing, and antenna parts: the limestone slab to its photographed
169.5 m roof, the sign penthouse to the published 183.2 m, the WGN mast to the
278 m tip, and the east wing to its photographed 56.4 m; see its
[reference audit](docs/one-prudential-reference.md).
Trump's is the same tower as the original layout's copy, on the mapped podium,
setbacks, shaft, and crown: the photographed roof, shoulder, and crown over the
mapped 60, 120, and 200 m setbacks, and the spire to the published 423.2 m tip;
see its [reference audit](docs/trump-reference.md).
Two Prudential's is the same tower as the original layout's copy, on the mapped
outline: the lobby fills it to the first office floor, the core stands on its
area centroid, square to its south wall, and the tiers fill the mapped depth
between the core and its north and south walls. Its tiers' points stand on the
line of their steps, where the copy keeps the drawing's, about 2 m higher; see its
[reference audit](docs/two-prudential-reference.md).
Aon Center is the same tower on its mapped outline and rooftop part: the 340 m
shaft, fifteen bays to each mapped face with glass up to the cap, the solid notched
corners, the 346.3 m enclosure, and the inferred antenna at the published
362.5 m tip; see its [reference audit](docs/aon-reference.md).
Intermediate
podium heights and some crowns are estimates; street widths come from mapped lane counts
rather than surveyed curbs, and road levels are flattened. See [the geographic data audit](docs/skyline-geography.md)
for the coordinate system, thirty-four footprint records, height definitions, OSM
attribution, and limitations. All runtime data is checked in locally.

## Full-screen 3D skyline

The viewer opens on the geographic layout's buildings full screen over its stars, or open `http://localhost:8000/skyline-3d.html` on its own; **show enhanced** switches to the drawing, and **3d skyline** returns. `skyline-3d.html` loads in its own frame with the viewer, and the drawing's frame waits until the drawing is chosen. It sees the mapped buildings through the drawing's own camera, the skyline study's skyline view, and frames what the viewer frames: `skyline-animated.svg`'s viewBox, centred and bottom-aligned. That frame is a lens shift off the panorama's centre, so the eye and its direction stay the fitted camera's, and each tower stands where its drawn one does at every window size, to within the camera fit's residuals; `tests/skyline-3d.test.ts` checks the geographic landmarks there. A window taller than the drawing gives the extra height to the sky. The skyline study's control bar is docked along the bottom of the window, and the frame stands on it rather than on the window's edge, so no control covers a tower. Toggling from the drawing lifts the skyline by the bar's height while the canvas above the bar is at most 8501 / 2782 as wide as it is tall, so that its width binds the frame as the window's binds the drawing's; a wider canvas binds the frame on its height instead, and draws it a little smaller too. Closed, the bar shows only a muted grey six-pointed star in its middle, white under the pointer, Chicago's, redrawn in `skyline-3d.html` from the one in devopsrockstars' `white-star-only.svg`. Pressing the star unfolds the toolbar outward from it, camera views sliding out to the bar's left edge and model display to its right edge, and the camera hint appears over the scene; pressing it again, or `Escape` in the bar, folds them back. The bar keeps one height closed, and open on a window at least 1260 px wide; narrower windows put the groups under the star, at the edges of one row or centred in a row each, and the scene stands on the taller bar while it is open. Reduced motion opens and closes it at once, and a window resized mid-fold settles the fold at once.

Drag to orbit, shift-drag or use two fingers to pan, and scroll or pinch to zoom; hovering names a building and its heights. Open, the bar holds the study's toolbar: **skyline view** and **reset view** (or `Home`) return to the drawing's camera, **three-quarter** and **side** step to the study's presets, **ground plan** and **height comparison** are its orthographic views, naming every mapped building, **streets** hides or shows the mapped streets, grey roadways sized from their mapped lanes across the whole platform, with Michigan Avenue's two carriageways running past Jackson to its south edge, **wireframe** shows the triangles, and **turntable** circles the city about the camera's pivot. **Footprints** adds the study's cyan mapped outlines, hidden at first; the study's grid stays hidden. The pressed camera button names the view, so the bar has no separate view label. Ground plan is drawn in greys, the buildings' few coloured roofs and the names included. A small credit in the scene's corner links OpenStreetMap's copyright page for the streets and footprints, beside the hint while the controls are open. Reduced motion pauses dragging and the turntable, as in the studies, and leaves the view buttons. The page shares `study-viewer.ts`, `study.css`, and `study-loader.ts` with the studies, and `skyline-3d.ts` holds only its settings: `createGeographicSkyline` in `skyline-comparison.ts` supplies the models, the camera, and the frame to both pages.

Right-click a building, or press and hold it where the browser raises a context menu for a long press, as Chrome on Android does, for its context menu: the building's name over one item, **building detail**. The item floats the building's detail over the skyline in a panel, without leaving the viewer or adding to its history. The detail is `building-detail.html?building=<id>`: the building alone on its own platform, as the building study shows Crain, with its published height or the one read on the drawing, the model's note, its mapped outline and OpenStreetMap way, and the study's views, wireframe, and turntable, its front view facing the building as the skyline camera does. It opens on the turntable, circling the building from the three-quarter view until a view button, a drag, or the turntable button stops it; under reduced motion it opens still. A right-drag still pans, so the menu opens only for a press that stays put. The skyline stays live around the panel, and another building's menu, drawn over the panel, replaces the detail; the close button or `Escape` closes it, and focus returns to the skyline. The panel stands below the viewer's controls, whose height `index.html` passes to the frame as `--viewer-controls`. `building-detail.ts` centres the geographic model on its mapped outline and frames it and its platform from every side; `tests/building-detail.test.ts` holds each mapped building inside the canvas in each view, in the viewer's panel and on a phone. A modified click on the item, or the page's own address, opens the detail on its own, with links back to the skyline and the skyline study.

## Improving existing buildings

Use `$building-fidelity` in Codex or `/building-fidelity` in Claude Code to
research and refine an existing geographic building. The skill maintains the
[fidelity opportunity queue](docs/building-fidelity.md) and dated, source-linked
findings in the building reference audits. It selects specific accuracy gaps,
updates the geographic model, and checks the visible result. The queue records
remaining uncertainty and next research actions between invocations.

## Adding a building to the skyline study

Each fitted building follows one loop: measure, model, fit, verify. Heritage is the worked example, and One Prudential Plaza the first built on the kit from the start. [Adding a building](docs/adding-a-building.md) is the long companion to these steps: what the drawing is and is not, how the fit is found, and the traps that cost real time. The scripts below are development tools; `scripts/build-site.ts` does not ship them, and each prints its options with `--help`.

1. **Measure the group.** `bun scripts/measure-group.ts <group-id>` accepts a group id or a `data-building-id`. It writes every shape's id, fill, layer-space bounds, and flattened vertices as JSON, with aligned crops of the drawing and the source photo. Layer space is the group parent's space, which equals `skyline.svg`'s root; all drawing points use it.
2. **Extend the reference and framing.** Add the group to `reference.groups` in `tests/skyline-landmarks.ts`, update its `viewBox`, `title`, and `description`, and run `bun scripts/reference-svg.ts`; the check runs it with `--check`. If an in-group overlay needs source gradients or clips, list their ids in `reference.defs`. In `skyline-study.ts`, import and place the model and add it to `createBuildingStudy`'s `models`. A building outside the current viewBox means reframing, not a local edit: keep the viewBox and `fit` aspects aligned, then recheck `target`, `platform`, light coverage, and `clippingMargin` along with every existing landmark.
3. **Write the model with the kit.** `models/building-kit.ts` has plan runs (`line`, `arc`, `bulge`, and `rectangle`, with `station`, `along`, and `evenly`) and a builder whose `panel`, `ledge`, `band`, `box`, `slab`, and `prism` write analytic normals and whose `finish` returns the standard model API. Plans run counterclockwise from above, and `prism` throws otherwise; a `closed` band wraps a whole roof. Solids are closed by default. Omit a face only where another surface covers it, by name (`omit: ["top"]`) with a comment; a band standing on a wall names `omit: ["back"]`, because the wall's own facets already close it. An unknown name throws. The Node suite checks each cover, except a floor on the ground at y = 0, which the camera never sees from below, and fails on any same-facing coplanar faces, in one batch or across batches. Export the features the drawing pins down, derived from the constants the geometry uses.
4. **Add the spec.** In `tests/skyline-landmarks.ts`, add the model to `models` and a `fitted` entry; the comment above `fitted` lists every field: feature landmarks with their drawing points, drawn columns with the batch that must stand proud, sight-line gaps, and tolerances. Landmark names share one namespace across buildings, so keep them unique. The skyline and geometry suites pick the entry up. Building-specific checks, such as ordering or Heritage's left silhouette bound, belong in `tests/skyline-study.test.ts`; the optional `silhouette` only feeds such a check. That test also holds the scene to its explicit triangle budget, so raise that bound deliberately if the new model needs more.
5. **Fit with the fidelity report.** `bun scripts/fidelity-report.ts` prints every landmark error, column residual in layer units, sight-line gap, projected silhouette, and triangle count at the five layouts the test checks, from the code the test asserts with. `--json <file>` also writes the raw numbers, and `--root` measures another checkout, such as an archive of `main`, for a before-and-after comparison.
6. **Check renders.** `bun scripts/render-study.ts --building <id>` writes the standard stills to `/tmp/skyline-renders`: skyline, wireframe, three-quarter, side, zoomed, four elevated orbits, full pages, a reference overlay, and close-ups. Look for holes, z-fighting, and anything outside the drawn silhouette.
7. **Run the check** with `bun run check`. After deploying, `bun run verify:deploy` confirms the new model is served byte for byte; `scripts/deploy.sh` runs it for you.

## Checks and PR workflow

With Bun (pinned in `mise.toml`; `mise use` installs it) and Google Chrome installed, run:

```sh
bun install --ignore-scripts
bun run check
```

The runner checks managed skill drift and tool configuration, typechecks the repository (`tsc --noEmit` under `@tsconfig/strictest`), starts its own temporary local server, and runs the attribution, hook, timings, merge guard, deploy verification, skyline-loading, package, reference excerpt, and building kit suites under `bun test`, then builds `dist/` and runs the browser suites against the compiled site. Checks cover push-hook skill drift detection, that `models/skyline-reference.svg` still regenerates from its source groups, the building kit's closed solids and analytic normals, and each fitted model's covered omissions and freedom from same-facing coplanar faces across its meshes, SVG/WebGL hover regions and illumination, both 3D studies, every mapped building's detail framed in each view, the 3D skyline's context menu and detail panel, sixty-four camera landmarks against the source SVG at desktop, tablet, and mobile sizes (the six fitted buildings' features are taken from their models' exported geometry and required to lie on their built surfaces, with mullion, fin, pier, rib and louver alignment, each column standing proud as the first surface along its sight line, Crain's twenty-nine drawn sills, Heritage's bow curvature, Trump’s spire ordering, and Two Prudential's chevron ordering), independent building highlights and building occlusion, visible geometry at both zoom limits, camera views and orbit, wireframe, idle rendering, reduced motion, keyboard navigation, mobile touch, existing viewer modes, and failure messages. Screenshots are written to `/tmp/skyline-3d-*.png` and `/tmp/skyline-group-*.png`. Run the geometry suite alone with `bun test tests/building-kit.test.ts`. To run one browser suite against an existing server, run `bun run build:site` first (the suites exercise the compiled site and its `dist/` fallback pages), then use `bun test tests/building-hover.test.ts`, `bun test tests/building-study.test.ts`, `bun test tests/building-detail.test.ts`, or `bun test tests/skyline-study.test.ts`; `SKYLINE_TEST_URL` overrides the default `http://127.0.0.1:8000`.

### Git hooks

Two hooks keep agent attribution out of the history, and `pre-push` also checks managed skill drift in the current checkout. Install them after cloning; they are not installed for you. Pushes (including tags and branch deletions) also need `bun install --ignore-scripts` in the current checkout or linked worktree:

```sh
sh scripts/git/install-hooks.sh
```

`commit-msg` refuses a message carrying a `Co-authored-by` trailer that names Claude or Anthropic, or a "Generated with Claude Code" line, and `pre-push` refuses to push a commit carrying either, so a message written past the first gate still fails at the second — including one committed with `--no-verify`. A `Co-authored-by` trailer naming a person passes, and so does prose that describes this rule: both patterns anchor at the start of a line, because attribution is a line in its own right rather than a phrase. The match is on whole words, so a colleague called Claudette or an address at `notanthropic.com` passes; one actually named Claude, or writing from an `anthropic.com` address, does not. A line that *opens* with the generated-with phrase is attribution even behind a bullet or a blockquote, so a sentence beginning that way is rejected as well. Nothing in a message can distinguish them, and the check errs toward refusing: a false positive costs one reword, a false negative puts the line in the history permanently. `scripts/check-coauthors.ts` is the check itself and runs on its own against a range (`--range main..HEAD`) or a message file (`--message <file>`); `tests/check-coauthors.test.ts` covers it, including that a usage slip fails rather than reading as a clean check.

The hooks resolve `bun` from `PATH`, then from `mise which bun`, and otherwise stop with the command to fix it. A hook does not reliably inherit an interactive shell's `PATH` — a GUI Git client or a shell without mise activated does not carry one — and a hook that simply fell through to `bun: not found` would refuse every commit, which reads exactly like a check that is working. `tests/git-hooks.test.ts` runs the installed hooks through `git` for that reason: it covers all three resolutions, and asserts that a clean message commits, which is the only thing that proves the hook reached the check rather than dying before it.

The installer and the hook layout are cannibalized from [tearleads](https://github.com/a2f0/tearleads), whose `scripts/checks/checkCommitTrust.sh` rejects every `Co-authored-by` trailer and also requires signed commits. This repository takes neither: it rejects only the agent attribution, and does not require signatures. The hooks **and the attribution check they call** are copied, and the attribution gate runs the installed check. The managed-skill gate additionally runs the commit-pinned package from `node_modules`, which is refreshed by `bun install --ignore-scripts`; Each installed hook and the attribution checker compares against its checked-out source and refuses to run when they differ, so rerun the installer after changing either. This source comparison does not cover the shared checker in `node_modules`. It replaces a symlinked hook rather than copying through it, keeps two backups and says which: `<name>.bak` holds whatever was there before the installer ever ran and is never overwritten, and `<name>.bak.previous` holds the most recent thing it replaced after that — an installer is not a backup system, and naming the two it keeps is more use than implying it keeps every one — refuses a `core.hooksPath` that resolves back inside `scripts/`, where installing would delete its own source, and removes only hooks a previous run of itself installed — recorded in a manifest, and backed up first — so a hook renamed here stops running while an unrelated `pre-commit` is left alone. It installs where Git will actually look: a `core.hooksPath` this repository set for itself is honoured, one inherited from outside it is overridden locally, and it verifies the effective path before reporting success, because an installer that reports success while Git looks elsewhere is a gate that fails open. With nothing inherited it records no path at all, since a moved or renamed clone silently invalidates an absolute one.

`pre-push` scans `<remote-sha>..<local-sha>` for a branch the remote already has. For one it does not, it scans `<local-sha> --not --remotes=<that remote>` — what the push transfers, as far as the local tracking refs know. Those are a snapshot: a branch built on history the remote has since deleted or rewritten, and that has not been fetched or pruned here, can reintroduce a commit this excludes. Subtracting local `main` instead would miss an offending commit sitting unpushed on `main` and carried along by any branch descending from it, and pushing `main` itself would scan nothing at all. A push straight to a URL, or to a branch whose advertised tip this clone has never fetched, names nothing whose tracking refs describe that destination, so the whole branch is scanned: that can refuse a commit already published elsewhere, where subtracting some other remote's refs would let one through. A remote whose `pushurl` differs from its fetch URL has the same mismatch and is not detected.

None of this stops someone who means to bypass it: `--no-verify` skips both hooks, and the gates are there to catch a mistake rather than to defeat an intent.

### Timings

`bun run check` times every step, prints a table when it finishes, and appends the run to `skyline-timings.log` in the Git common directory — per clone, never committed. A run that fails records too: the run that died is the one whose breakdown is worth reading, and its failing step is marked.

```
step                   seconds
──────────────────────────────
whitespace                 0.3
typecheck                 14.2
test:building-kit        428.4
...
total                    512.5
```

`bun scripts/show-timings.ts` reads the log back, printing the last run's steps and, once a branch has more than one run, a line per run. `--since <iso>` bounds it to one session, which is what `ship-pr` passes: a resumed or reused branch carries earlier runs too, and reporting one of those as the latest would show an old success for an attempt that failed before it ever checked. Skyline’s `AGENTS.md` shipping policy requires printing it at completion, because a shipping run drives the checks once as preflight and again after every review repair, and that loop is the slowest thing between finishing work and a merged PR. `--branch <name>` reads another branch's runs and `--all` ignores the branch. Durations come from a monotonic clock and only the timestamp from the wall clock, so a clock correction during a run cannot produce a negative step. `tests/timings.test.ts` drives both clocks itself, so a timing test does not depend on timing.

Whitespace checks always cover staged and unstaged work. During branch review, supply `SKYLINE_BASE_SHA=<fetched-base-commit>` to include the committed diff from that exact base; Skyline requires this form for shipping, even though the shared PR skills leave validation commands to the project.

The commit-pinned [a2f0/agent-tool](https://github.com/a2f0/agent-tool) dev dependency supplies `ship-pr`, `open-pr`, `cross-agent-review`, `squash-merge`, and `reset`. In Codex, invoke `$ship-pr` to commit, independently review and repair, open or resume the PR, squash-merge the reviewed commit, and return to updated `main`. In Claude Code, use `/ship-pr`. Use `$open-pr` or `/open-pr` to stop with an open PR. Requested report-only reviews or keeping the feature branch are honored.

`bun run agents:sync` installs the package's skills as regular files in both `.agents/skills` and `.claude/skills`, tracked by `.agent-tool-skills.json`. `bun run agents:check` verifies the copies without changing them; the full checks and installed push hook include that gate. If a new skill does not appear, restart the agent session. The skill gate checks the current checkout, so ship from the clean reviewed branch and push its HEAD; it does not inspect arbitrary pushed refs or each historical commit, and worktree drift also blocks deletions. Keep project policy in `AGENTS.md` (`CLAUDE.md` imports it), and do not edit managed skill files. For an upgrade, update the `agent-tool` commit pin, run `bun install --ignore-scripts` and `bun run agents:sync`, then commit `package.json`, `bun.lock`, both skill directories, and the manifest together.

`bun run agent-tool doctor` checks reviewer CLI compatibility; `bun run agent-tool config show` displays the effective policy. `agent-tool.json` sets conventional subjects to 72 characters, a 20-minute review deadline, and rejects Claude branding in PR content. Skyline requires `SKYLINE_BASE_SHA=<pinned-base-sha> bun run check` before shipping and has no GitHub CI workflows, so the config explicitly allows an empty CI check list while still rejecting any reported failing or pending checks. For `gh pr checks`, "no checks reported" is expected only after confirming an empty `statusCheckRollup`. The shared tool owns review isolation, PR creation, CI enforcement, and the merge mutation; repository hooks retain the attribution policy described above. Merge messages contain only the PR title and `(#number)`, bound to the reviewed head using GitHub's `expectedHeadOid`. The shared merge CLI does not enforce the reviewed base SHA. Immediately before invoking it, the shipping agent must compare the live base from `gh api repos/<base-repo>/git/ref/heads/<base-branch> --jq '.object.sha'` with the recorded reviewed base, check its ancestry and the clean checkout, and confirm local/PR heads equal the reviewed head. Any mismatch requires refreshed validation and review; atomic base enforcement depends on repository protection rules. Skyline ships through `bun scripts/merge-pr.ts <reviewed-head> <base-branch> <reviewed-base-sha>`. It supports same-repository PRs with matching local/remote feature branch names. This thin project wrapper enforces checkout, head, base, ancestry, and immediate merge readiness, calls the shared merge CLI with the PR title, then confirms MERGED and the stored subject-only message before cleanup. `tests/merge-pr.test.ts` covers those guards; the shared package owns the mutation and its tests.

## Deploying

The site is live at [skyline.devopsrockstars.com](https://skyline.devopsrockstars.com), served by the `devopsrockstars-skyline-prod` Cloudflare Worker as static assets. There is no server-side code: the Worker has no `main`, so Cloudflare answers every request from the uploaded files. This matches how the rest of the `devopsrockstars.com` zone is served — each host is a Worker with a custom domain, not a Pages project or an S3 bucket.

Content deploys authenticate with Wrangler's own stored credentials (`wrangler login`); no repository file is read. `scripts/terraform.sh` is separate and still reads the gitignored `.secrets/root.env`, which needs `TF_VAR_cloudflare_api_token` and `TF_VAR_cloudflare_account_id` (the token needs Workers Scripts:Edit and Zone:Read on the zone), plus `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the S3 Terraform backend. `scripts/secrets.sh` loads that file, fails loudly on a missing variable, and re-exports the Cloudflare pair under the `CLOUDFLARE_*` names Terraform expects. `.secrets/` is gitignored and never committed.

Deploying needs Bun and Node.js 22+, because Wrangler runs under Node: its deployment step stops silently after the asset upload under Bun's runtime. Publish content with:

```sh
bun install --ignore-scripts
bun run deploy
```

`bun run deploy` compiles the browser modules into `dist/` via `scripts/build-site.ts` and then runs `wrangler deploy`. The staged set is an allowlist, not an ignore list: the repository root holds `.secrets/`, test fixtures, and the 18MB `skyline.jpg` source photograph that the site never requests, so only files named in `scripts/build-site.ts` reach Cloudflare. Every top-level `models/*.ts` ships automatically as compiled `.js` and its `.svg` excerpt ships as-is; new top-level assets must be added to the list, and the script fails rather than publishing if a listed file has been renamed away. There is still no bundler and no transformation beyond tsc's per-file emit.

`bun run deploy` then runs `scripts/verify-deploy.ts` against the live site, and `bun run verify:deploy` runs it on its own (`--url` points it elsewhere; `SKYLINE_SKIP_VERIFY=1`, and only `1`, skips it). A deploy skips verification when it published nothing (`--dry-run`) or aimed somewhere else (`--env`, `-e`, `--name`), and says which, because checking production after publishing to another Worker would report the previous deploy as though it were this one. `--outdir` and `--outfile` still publish, so they are still verified. It asserts two things. Every file the allowlist publishes is served **byte for byte** against a fresh local build: a deploy is a copy of a build, so anything else is a bad deploy, and comparing hashes catches a file served empty or stale, which a status code does not. And nothing else in the repository is reachable at all — that set is derived from `git ls-files` and a walk of `.secrets/`, minus what `scripts/build-site.ts` publishes, because a hand-kept list of forbidden paths is a sample and a sample cannot prove absence.

Published requests follow redirects, because Cloudflare answers an `.html` request with a 307 to the extensionless path, and they are retried, because the edge can 404 an asset for seconds after wrangler has reported the upload a success. Requests for paths that must not exist do neither: a redirect is not proof of absence, and a request that never resolves is a failure rather than a quiet pass. Every request carries a timeout and the run carries a deadline, so a hung edge ends the deploy in minutes instead of hours. `tests/verify-deploy.test.ts` covers those failure paths, since a checker that cannot fail is worse than none. One thing would make it fail on a good deploy: a Cloudflare feature that rewrites responses, such as Rocket Loader or Email Obfuscation, changes the bytes the edge returns and every HTML file would then differ from the fresh local build. Compression does not — undici decodes gzip and brotli before the comparison.

`terraform/` owns one resource, the `cloudflare_workers_custom_domain` binding `skyline.devopsrockstars.com` to the Worker, with state in the shared `tearleads-terraform-state` bucket. It rarely changes and is not part of a content deploy:

```sh
scripts/terraform.sh plan
scripts/terraform.sh apply
```

Order matters on a first apply, and only there: wrangler must publish the Worker before Terraform can point a hostname at it. Cloudflare serves `.html` requests with a 307 to the extensionless path, so `building-study.html` lands on `/building-study` with identical content; `wrangler.jsonc` explains why the alternative costs more than the redirect.

## Direction for Update

These directions have been created using Inkscape 1.1 on MacOS.

1. Save the Skyline as skyline.svg with the original skyline as the background.
2. Go to `File -> Save As...` and save it somewhere outside the repo, i.e. `/tmp/skyline.svg`.
3. Delete the `JPEG` layer.
4. Draw a square to clip the boundaries of the image.
5. Align the square over the mask, i.e.:
   1. Duplicating the X and width of the landscape.
   2. Select the mask first and landscape second, then align bottom edges.
6. Group all of the skyline objects under the clipping rectangle.
7. Select the skyline group first and clipping rectangle second.
8. Go to `Object -> Clip -> Set`.
9. `Select All` then go to `File -> Document Properties...`
   1. Resize the page to drawing or selection.
10. Save the image as `/tmp/skyline.svg` again.
11. Change the `preserveAspectRatio` to `xMidYMin meet`.
12. Move the file into its final location.
