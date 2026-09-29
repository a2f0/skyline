import { createBuildingStudy } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-comparison.js";

// The skyline viewer's full-screen 3D mode: every mapped building, seen through the
// drawing's own camera and framed as index.html frames the drawing, so each tower stands
// where its drawn one does until the camera moves.
const { models, ground, settings, drawingView } = createGeographicSkyline();
// The mapped streets stay; the study's footprint outlines and grid are annotations.
ground.group.children.forEach((child) => { child.visible = child === ground.streets; });
const { azimuth } = drawingView;
createBuildingStudy({
  models,
  extras: [ground.group],
  defaultView: "skyline",
  // The skyline study's presets, so reduced motion, which stops dragging, still leaves
  // views to step between.
  views: {
    skyline: drawingView,
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
  },
  fov: 6,
  ...settings,
  platform: { ...settings.platform, color: 0x161616 },
  near: 10,
  far: 10000,
  minimumDistanceRatio: 0.1,
  enablePan: true,
  minimumCameraHeight: 1,
});
