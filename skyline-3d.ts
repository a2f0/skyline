import { createBuildingStudy } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-comparison.js";
import { createGeographicRoads } from "./models/skyline-geography.js";

// The skyline viewer's full-screen 3D mode: every mapped building, seen through the
// drawing's own camera and framed as index.html frames the drawing, so each tower stands
// where its drawn one does until the camera moves.
const { models, ground, settings, drawingView, comparisonViews, labels } = createGeographicSkyline();
// The mapped streets show as grey roadways across the whole platform. The study's
// centerlines, footprint outlines and grid are annotations; the outlines return with the
// footprints control.
ground.group.children.forEach((child) => { child.visible = false; });
const { platform } = settings;
const roads = createGeographicRoads({
  x: [platform.x - platform.width / 2, platform.x + platform.width / 2],
  z: [platform.z - platform.depth / 2, platform.z + platform.depth / 2],
}, 0x2c2c2c);
const { azimuth } = drawingView;
const viewer = createBuildingStudy({
  models,
  extras: [ground.group, roads],
  defaultView: "skyline",
  // The skyline study's presets, so reduced motion, which stops dragging, still leaves
  // views to step between, and its ground plan and height comparison, which name each
  // building.
  views: {
    skyline: drawingView,
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
    ...comparisonViews,
  },
  labels,
  fov: 6,
  ...settings,
  platform: { ...settings.platform, color: 0x161616 },
  near: 10,
  far: 10000,
  minimumDistanceRatio: 0.1,
  maximumZoom: 24,
  enablePan: true,
  minimumCameraHeight: 1,
});
// The control bar's ground toggles, each pressed while what it toggles shows.
for (const [id, object] of [["streets", roads], ["footprints", ground.footprints]] as const) {
  const button = document.querySelector<HTMLButtonElement>(`#${id}`)!;
  button.addEventListener("click", () => {
    object.visible = !object.visible;
    button.setAttribute("aria-pressed", String(object.visible));
    viewer.requestRender();
  });
}
