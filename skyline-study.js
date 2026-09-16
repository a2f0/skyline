import { createBuildingStudy } from "./study-viewer.js";
import { createCrainBuilding } from "./models/crain-communications.js";
import { createHeritageAtMillenniumParkBuilding } from "./models/heritage-at-millennium-park.js";
import { createKemperBuilding } from "./models/kemper.js";
import { createMichiganPlazaSouthBuilding } from "./models/michigan-plaza-south.js";
import { createOnePrudentialPlazaBuilding } from "./models/one-prudential-plaza.js";

// The SVG's Crain facade widths suggest a ~42° azimuth. Kemper's near roof
// corner rises above its neighbors, placing the eye below the roof. A long
// lens keeps the traced verticals nearly parallel.
const azimuth = 41.5 * Math.PI / 180;
const elevation = -2 * Math.PI / 180;
const crain = createCrainBuilding();
const kemper = createKemperBuilding();
const michigan = createMichiganPlazaSouthBuilding();
const heritage = createHeritageAtMillenniumParkBuilding();
const prudential = createOnePrudentialPlazaBuilding();
function place(model, across, towardCamera) {
  // Center the wider group while retaining the drawing's relative spacing.
  across -= 76.5;
  model.building.position.set(
    across * Math.cos(azimuth) + towardCamera * Math.sin(azimuth),
    0,
    -across * Math.sin(azimuth) + towardCamera * Math.cos(azimuth),
  );
}
// A small footprint adjustment fits the original drawing without changing
// the reusable Crain geometry or its single-building study.
crain.building.scale.set(0.955, 1, 0.955);
place(crain, 25, 10);
place(kemper, -38, -20);
kemper.building.rotation.y = 9.1 * Math.PI / 180;
place(michigan, 104, -12);
michigan.building.rotation.y = -1.4 * Math.PI / 180;
// Fitted through this camera to Heritage's drawn corners, mullions, and crown fins.
// The plan needs no rotation, and its depth keeps the tower behind Kemper's left face.
place(heritage, -91.9, -31.85);
// Fitted through this camera to the drawn roof corners and the mast tip. Depth barely
// changes the picture, so it comes from the drawing's occlusion instead: One Prudential is
// drawn over Michigan Plaza's rightmost 47 layer units, so it has to stand in front of it.
place(prudential, 178.8, 25);
prudential.building.rotation.y = 6.07 * Math.PI / 180;

createBuildingStudy({
  models: [heritage, kemper, crain, michigan, prudential],
  defaultView: "skyline",
  views: {
    skyline: { azimuth, polar: Math.PI / 2 - elevation, label: "skyline view" },
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
  },
  fov: 6,
  // Even at minimum zoom distance the nearest surface is >800 units away.
  // Keep fine facade layers distinct at maximum mobile zoom-out as well.
  near: 600,
  far: 10000,
  // The margin must clear the farthest vertex from the orbit target, which is a
  // platform corner at 308 units, not a tower: the platform reaches 270 units across
  // the plan and its underside sits 148 below the target. Fit clipping to zoom limits so portrait
  // tablets remain visible far away; the near plane's own 600 floor never binds here,
  // since it would take a margin past 968 to reach it.
  clippingMargin: 330,
  target: [0, 146.25, 0],
  minimumCameraHeight: 1,
  fit: { height: 342.5, width: 495 },
  platform: { width: 450, depth: 300, color: 0x222222 },
});
