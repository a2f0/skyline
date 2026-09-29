import { createBuildingStudy } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-comparison.js";

// The skyline viewer's full-screen 3D mode: every mapped building, seen through the
// drawing's own camera and framed as index.html frames the drawing, so each tower stands
// where its drawn one does until the camera moves.
const { models, ground, settings, drawingView } = createGeographicSkyline();
// The mapped streets stay; the study's footprint outlines and grid are annotations.
ground.group.children.forEach((child) => { child.visible = child === ground.streets; });
createBuildingStudy({
  models,
  extras: [ground.group],
  defaultView: "skyline",
  views: { skyline: drawingView },
  ...settings,
  platform: { ...settings.platform, color: 0x161616 },
  near: 10,
  far: 10000,
  minimumDistanceRatio: 0.1,
  enablePan: true,
  minimumCameraHeight: 1,
});
