import { mountViewer } from "./skyline-shell.js";

// index.html: the site's own viewer, mounted the way a host mounts the package, through the
// same shell and viewer module, from the assets beside this script, with the site's toolbar
// along its top. Its address takes the package's options: `?embed=1` shows the viewer as a
// host does, without the toolbar; `?controls=open` starts the scene's bar open; and
// `?attribution=hidden` leaves out the OpenStreetMap credit.
const settings = new URLSearchParams(location.search);
mountViewer(document.querySelector<HTMLElement>("#viewer")!, {
  assetsUrl: new URL("./", import.meta.url),
  title: "Chicago skyline",
  controls: settings.get("controls") === "open" ? "open" : "closed",
  attribution: settings.get("attribution") !== "hidden",
  navigation: settings.get("embed") !== "1",
  page: true,
});
