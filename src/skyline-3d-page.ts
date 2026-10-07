import { startSkyline3d } from "./skyline-3d.js";

// skyline-3d.html: the full-screen 3D skyline on a page of its own, which has no drawing to
// switch to. Its address's settings were applied before the scene's code arrived.
startSkyline3d({
  root: document,
  frame: document.body,
  assets: new URL("./", location.href),
  signal: new AbortController().signal,
});
