import { mountViewer } from "./skyline-shell.js";

// index.html: the site's own viewer, mounted the way a host mounts the package, through the
// same shell and viewer module, from the assets beside this script, with the site's toolbar
// along its top. Its address takes the package's options: `?embed=1` shows the viewer as a
// host does, without the toolbar; `?controls=open` or `?controls=closed` starts the scene's
// bar open or folded; and `?attribution=hidden` leaves out the OpenStreetMap credit. The site
// starts the bar open, to show what the scene can do; embedded, it starts folded behind its
// star, as `mountSkyline` does.
const settings = new URLSearchParams(location.search);
const embedded = settings.get("embed") === "1";
const controls = settings.get("controls");
mountViewer(document.querySelector<HTMLElement>("#viewer")!, {
  assetsUrl: new URL("./", import.meta.url),
  title: "Chicago skyline",
  controls: controls === "open" || controls === "closed" ? controls : embedded ? "closed" : "open",
  attribution: settings.get("attribution") !== "hidden",
  colour: settings.get("colour") === "1",
  navigation: !embedded,
  page: true,
});
