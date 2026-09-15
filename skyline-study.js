import { createBuildingStudy } from "./study-viewer.js";
import { createCrainBuilding } from "./models/crain-communications.js";
import { createKemperBuilding } from "./models/kemper.js";
import { createMichiganPlazaSouthBuilding } from "./models/michigan-plaza-south.js";

// The SVG's Crain facade widths suggest a ~42° azimuth. Kemper's near roof
// corner rises above its neighbors, placing the eye below the roof. A long
// lens keeps the traced verticals nearly parallel.
const azimuth = 41.5 * Math.PI / 180;
const elevation = -2 * Math.PI / 180;
const crain = createCrainBuilding();
const kemper = createKemperBuilding();
const michigan = createMichiganPlazaSouthBuilding();
function place(model, across, towardCamera) {
  // Center the wider group while retaining the drawing's relative spacing.
  across -= 39;
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

createBuildingStudy({
  models: [kemper, crain, michigan],
  defaultView: "skyline",
  views: {
    skyline: { azimuth, polar: Math.PI / 2 - elevation, label: "skyline view" },
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
  },
  fov: 6,
  // The camera stays >1,000 scene units away. A farther near plane preserves
  // depth precision between the facade and its small raised window details.
  near: 100,
  far: 10000,
  target: [0, 90, 0],
  minimumCameraHeight: 1,
  fit: { height: 230, width: 300 },
  platform: { width: 190, depth: 170, color: 0x222222 },
});
