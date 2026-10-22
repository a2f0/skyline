import { createTracker } from "./vendor/ct-client.js";

// Only the standalone site's pages load this entry. Package mounts never import it.
// Use fixed routes: building IDs, embed settings and other URL values stay private.
const routes: Readonly<Record<string, string>> = {
  "/": "/",
  "/index.html": "/",
  "/skyline-3d": "/skyline-3d",
  "/skyline-3d.html": "/skyline-3d",
  "/building-detail": "/building-detail",
  "/building-detail.html": "/building-detail",
  "/skyline-study": "/skyline-study",
  "/skyline-study.html": "/skyline-study",
  "/building-study": "/building-study",
  "/building-study.html": "/building-study",
  "/skyline-webgl": "/skyline-webgl",
  "/skyline-webgl.html": "/skyline-webgl",
  "/skyline-animated.svg": "/skyline-animated.svg",
};
const route = routes[location.pathname];
if (location.origin === "https://skyline.devopsrockstars.com" && route) {
  const tracker = createTracker({ site: "skyline", capture: "all", page: () => route });
  tracker.init();
}
