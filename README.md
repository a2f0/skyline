# Chicago Skyline

## Animated version

Open `index.html` in a modern browser for the full-screen viewer. Use the viewer's fullscreen control or press `F` to enter fullscreen.

The living-night treatment is entirely vector-based and grayscale. The transparent `skyline-animated.svg` layer keeps the buildings aligned along the bottom and scaled proportionally to fit the viewport. A separate `stars.svg` layer fills the entire viewport behind it with 96 stars, including the sky above the tallest buildings. Ten randomly selected stars (about 10%) softly twinkle; the other 86 stay steady. Positions and the twinkling selection are randomized each time the sky loads, then stay fixed during animation, resizing, and debug toggles. Star positions use percentages and their radii stay fixed so resizing does not stretch the stars. The buildings have no animated lights or beacons. Hover over Aon Center to illuminate it.

Each twinkling star has its own slow 18–32-second cycle and a random starting phase. Its dimmest, brightest, and fading brightness levels change randomly each cycle, with gentle transitions and quiet pauses between twinkles.

Stars pause automatically when the browser reports the operating system's reduced-motion preference. The viewer displays the current preference and animation mode, updating immediately when the preference changes. Aon's hover highlight still works with reduced motion enabled.

Use **debug motion** to preview pronounced 1.8-second brightness pulses on the same ten twinkling stars while all stars stay the same size. This opt-in preview overrides reduced motion until you select **stop debug** or reload the page. You can also open `stars.svg#debug-motion` directly to preview the exaggerated animation; remove the fragment to return to the system preference.

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
