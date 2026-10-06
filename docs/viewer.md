# The viewer

`index.html` is the full-screen viewer. It opens on the [3D skyline](#full-screen-3d-skyline)
and can switch to the [enhanced drawing](#the-enhanced-drawing), the
[original drawing](#the-original-drawing), or the [WebGL prototype](#webgl-prototype). Select
**show enhanced**, **show original**, or **show webgl**; while that mode shows, its button reads
**3d skyline** and returns to the 3D skyline. Use the viewer's fullscreen control or press `F` to
enter fullscreen.

Serve the built `dist/` over HTTP (see the [README](../README.md#run-it-locally)). The enhanced
and original drawings still work when `index.html` is opened through `file://`; the 3D skyline
then says how to build or serve the site, and the WebGL prototype needs the server because it
fetches the drawing at runtime.

## Full-screen 3D skyline

The viewer opens on the geographic layout's buildings full screen over its stars. Open
`skyline-3d.html` to see it on its own. It loads in its own frame inside the viewer, and the
drawing's frame waits until the drawing is chosen.

### Camera and frame

The scene is seen through the drawing's own camera, the skyline study's skyline view, and frames
what the viewer frames: `skyline-animated.svg`'s viewBox, centred and bottom-aligned. That frame
is a lens shift off the panorama's centre, so the eye and its direction stay the fitted camera's,
and each tower stands where its drawn one does at every window size, to within the camera fit's
residuals. `tests/skyline-3d.test.ts` checks the geographic landmarks there. A window taller than
the drawing gives the extra height to the sky.

The skyline study's control bar is docked along the bottom of the window, and the frame stands on
it rather than on the window's edge, so no control covers a tower. Toggling from the drawing lifts
the skyline by the bar's height while the canvas above the bar is at most 8501 / 2782 as wide as
it is tall, so that its width binds the frame as the window's binds the drawing's; a wider canvas
binds the frame on its height instead, and draws it a little smaller too.

### The toolbar

Closed, the bar shows only a muted grey six-pointed star in its middle, white under the pointer,
Chicago's, redrawn in `skyline-3d.html` from the one in devopsrockstars' `white-star-only.svg`.
Pressing the star unfolds the toolbar outward from it, camera views sliding out to the bar's left
edge and model display to its right edge, and the camera hint appears over the scene; pressing it
again, or `Escape` in the bar, folds them back. The bar keeps one height closed, and open on a
window at least 1260 px wide; narrower windows put the groups under the star, at the edges of one
row or centred in a row each, and the scene stands on the taller bar while it is open. Reduced
motion opens and closes it at once, and a window resized mid-fold settles the fold at once.

The bar starts closed. `?controls=open` on the viewer's address, or on `skyline-3d.html` itself,
starts it open from its first frame instead, with no fold, and the star folds it as usual; any
other value leaves it closed. Open, the bar shows the camera hint and the OpenStreetMap credit;
`?attribution=hidden` leaves the credit out, for a host page that credits OpenStreetMap
contributors itself, as its licence requires. A small inline script after the bar applies both
before the scene's code arrives, the scene's own address first, and the package's `mountSkyline`
passes its `controls` and `attribution` options this way.

Drag to orbit, shift-drag or use two fingers to pan, and scroll or pinch to zoom: in to a tenth of
a view's framed distance, or out to four times it, where the whole mapped city sits small in the
frame. The orthographic views zoom from a quarter to 24×. Hovering names a building and its
heights. Open, the bar holds the study's toolbar:

- **skyline view** and **reset view** (or `Home`) return to the drawing's camera;
- **three-quarter** and **side** step to the study's presets;
- **ground plan** and **height comparison** are its orthographic views, naming every mapped
  building;
- **streets** hides or shows the mapped streets: grey roadways sized from their mapped lanes
  across the whole platform, with Michigan Avenue's two carriageways running past Jackson to its
  south edge;
- **footprints** adds the study's light grey mapped outlines, hidden at first; the study's grid
  stays hidden;
- **wireframe** shows the triangles, and **turntable** circles the city about the camera's pivot;
- the **lights** badges, described [below](#celebratory-lights).

The pressed camera button names the view, so the bar has no separate view label. A small credit
in the scene's corner links OpenStreetMap's copyright page for the streets and footprints, beside
the hint while the controls are open. Reduced motion pauses dragging and the turntable, as in the
studies, and leaves the view buttons.

The page shares `study-viewer.ts`, `study.css`, and `study-loader.ts` with the
[studies](studies.md), and `skyline-3d.ts` holds only its settings: `createGeographicSkyline` in
`skyline-comparison.ts` supplies the models, the camera, and the frame to both pages.

### Building menu and detail

Right-click a building, or press and hold it where the browser raises a context menu for a long
press, as Chrome on Android does, for its context menu: the building's name over the
**building detail** item, plus the lighting choices on a building that has them. A right-drag
still pans, so the menu opens only for a press that stays put.

**Building detail** floats the building's detail over the skyline in a panel, without leaving the
viewer or adding to its history. The detail is `building-detail.html?building=<id>`: the building
alone on its own platform, as the building study shows Crain, with its published height or the
one read on the drawing, the model's note, its mapped outline and OpenStreetMap way, and the
study's views, wireframe, and turntable, its front view facing the building as the skyline camera
does. It opens on the turntable, circling the building from the three-quarter view until a view
button, a drag, or the turntable button stops it; under reduced motion it opens still.

The skyline stays live around the panel, and another building's menu, drawn over the panel,
replaces the detail; the close button or `Escape` closes it, and focus returns to the skyline. The
panel stands below the viewer's controls, whose height `index.html` passes to the frame as
`--viewer-controls`. A modified click on the item, or the page's own address, opens the detail on
its own, with links back to the skyline and the skyline study.

`building-detail.ts` centres the geographic model on its mapped outline and frames it and its
platform from every side; `tests/building-detail.test.ts` holds each mapped building inside the
canvas in each view, in the viewer's panel and on a phone.

### Celebratory lights

The toolbar's **lights** badges toggle celebratory window messages on the Blue Cross and Blue
Shield Tower: Bulls, Cubs, White Sox, Bears, Blackhawks, and Thanksgiving. Select a badge again to
turn it off, or right-click the tower to choose a message or turn its lights off from the building
menu. [Celebratory window lighting](celebration-lighting.md) records the display research and the
limits of each reconstruction.

### Loading indicator

The index page's loading indicator is an inline SVG roofline traced left to right with CSS, then
faded and repeated until the first 3D frame appears. It is a level orthographic elevation of the
mapped buildings, viewed from the skyline camera's horizontal direction, with no perspective or
facade edges. Reduced motion shows the complete outline. After adding or changing buildings, run
`bun scripts/skyline-loading.ts` to refresh the inline path in `skyline-3d.html`;
`bun run check` catches a stale outline. The normal site build still only compiles TypeScript and
copies assets.

## The enhanced drawing

**show enhanced** shows the animated, entirely vector-based and grayscale drawing. The
transparent `skyline-animated.svg` layer keeps the buildings aligned along the bottom and scaled
proportionally to fit the viewport. Hover over any building to illuminate it; its name appears
immediately in a compact black monospace label offset from the pointer. The buildings have no
animated lights or beacons. [Building labels and hover ownership](building-labels.md) records the
corrected historic-building names, the small silhouettes that remain unidentified, and how paths
are assigned to hover groups.

Clipped tonal gradients separate façade planes, while roof equipment, corner seams, and sparse
occupied windows preserve the illustrated style at normal viewing sizes. These details are static
and ignore pointer events so they do not interfere with the building hover interactions.

### Stars

A separate `stars.svg` layer fills the entire viewport behind the buildings with 96 stars,
including the sky above the tallest buildings. Ten randomly selected stars (about 10%) softly
twinkle; the other 86 stay steady. Positions and the twinkling selection are randomized each time
the sky loads, then stay fixed during animation, resizing, and debug toggles. Star positions use
percentages and their radii stay fixed so resizing does not stretch the stars.

Each twinkling star has its own slow cycle of approximately 40–67 seconds and a random starting
phase. Brightness varies subtly between 42% and 60% opacity, with fresh brightness levels each
cycle, gradual transitions, and quiet pauses between twinkles.

### Reduced motion and debug motion

Stars pause automatically when the browser reports the operating system's reduced-motion
preference. The viewer displays the current preference and animation mode, updating immediately
when the preference changes. Building hover highlights still work with reduced motion enabled,
without an animated transition.

Use **debug motion** to preview a slightly wider brightness range (30–70% opacity) on the same ten
stars, at the same gentle 40–67-second pace. All stars stay the same size. This opt-in preview
overrides reduced motion until you select **stop debug** or reload the page. You can also open
`stars.svg#debug-motion` directly to preview this mode; remove the fragment to return to the
system preference.

## The original drawing

**show original** compares the enhanced skyline with `skyline-original-fit.svg`. You can also open
the star's controls at the bottom of the 3D skyline for **show original**; the original drawing's
bottom **3d skyline** button returns to the same camera and open controls. The self-contained
comparison file gives the original vector `Landscape` layer the same viewBox, bottom alignment,
and artwork offset as the enhanced skyline; the source-photo layer from `skyline.svg` has been
removed. [Development](development.md#updating-the-drawing) describes how the drawing is
re-exported from Inkscape.

## WebGL prototype

`skyline-webgl.html` uses `skyline-animated.svg` as source artwork. At runtime it rasterizes 38
SVG paint layers representing 31 building identities into cropped GPU textures, draws them as
subtly depth-shifted quads, applies façade shading and hover illumination in a fragment shader,
and resolves overlapping buildings with an offscreen color-picking pass. Separate portions of one
building share a hover identity and parallax depth while keeping their original draw order. The
foreground remains a separate top layer, and the existing star field stays visible beneath the
transparent WebGL canvas.
