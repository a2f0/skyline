import { createBuildingStudy } from "./study-viewer.js";
import { createSkylineComparison } from "./skyline-comparison.js";
import { createCrainSkylineBuilding } from "./models/crain-communications.js";
import { createHeritageAtMillenniumParkBuilding } from "./models/heritage-at-millennium-park.js";
import { createKemperBuilding } from "./models/kemper.js";
import { createMichiganPlazaSouthBuilding } from "./models/michigan-plaza-south.js";
import { createOnePrudentialPlazaBuilding } from "./models/one-prudential-plaza.js";
import { createTrumpInternationalTowerBuilding } from "./models/trump-international-tower.js";
import { createTwoPrudentialPlazaBuilding } from "./models/two-prudential-plaza.js";
import { createAonCenterBuilding } from "./models/aon-center.js";
import type { BuildingModel } from "./models/building-kit.js";

// The SVG's Crain facade widths suggest a ~42° azimuth. Kemper's near roof
// corner rises above its neighbors, placing the eye below the roof. A long
// lens keeps the traced verticals nearly parallel.
const azimuth = 41.5 * Math.PI / 180;
const elevation = -2 * Math.PI / 180;
const crain = createCrainSkylineBuilding();
const kemper = createKemperBuilding();
const michigan = createMichiganPlazaSouthBuilding();
const heritage = createHeritageAtMillenniumParkBuilding();
const prudential = createOnePrudentialPlazaBuilding();
const trump = createTrumpInternationalTowerBuilding();
const twoPrudential = createTwoPrudentialPlazaBuilding();
const aon = createAonCenterBuilding();
function place(model: BuildingModel, across: number, towardCamera: number) {
  // Center the wider group while retaining the drawing's relative spacing.
  across -= 76.5;
  model.building.position.set(
    across * Math.cos(azimuth) + towardCamera * Math.sin(azimuth),
    0,
    -across * Math.sin(azimuth) + towardCamera * Math.cos(azimuth),
  );
}
// The real Crain from the drawing's datum up, fitted through this camera to the drawn
// diamond and the twenty-nine drawn sills on its left face: 1.276 times its size, the
// same exaggeration the drawing gives the other fitted towers, and turned 4.86° to meet
// the drawing's view of its faces. Depth keeps the earlier placement.
crain.building.scale.setScalar(1.276);
crain.building.rotation.y = 4.86 * Math.PI / 180;
place(crain, 25.49, 10);
place(kemper, -38, -20);
kemper.building.rotation.y = 9.1 * Math.PI / 180;
place(michigan, 104, -12);
michigan.building.rotation.y = -1.4 * Math.PI / 180;
// Fitted through this camera to Heritage's drawn corners, mullions, and crown fins.
// The plan needs no rotation, and its depth keeps the tower behind Kemper's left face.
place(heritage, -91.9, -31.85);
// The real One Prudential from the drawing's 40 m datum up, fitted through this camera at
// all five test layouts to the drawn roof, band, penthouse, and mast, the drawn piers, the
// screen's fins, the wing's ribs and corners, and the drawn window rows: 1.314 times its
// size and turned 7.29°. Depth barely changes the picture, so it comes from the drawing's
// occlusion instead: One Prudential is drawn over Michigan Plaza's rightmost 47 layer
// units, so it has to stand in front of it.
prudential.building.scale.setScalar(1.314);
prudential.building.rotation.y = 7.29 * Math.PI / 180;
place(prudential, 179.02, 25);
// Trump stands behind One Prudential in the SVG. Its depth maintains that lower-facade
// occlusion while the fitted crown and spire remain visible above the foreground slab.
place(trump, 200.5, -40);
trump.building.rotation.y = 1.8 * Math.PI / 180;
// Two Prudential stands behind the shared podium; its plan and roof features were
// fitted through this camera to the drawing, with depth fixed by that occlusion.
place(twoPrudential, 270.727, -45);
twoPrudential.building.rotation.y = -1.758 * Math.PI / 180;
// The real Aon Center from the drawing's datum up, fitted through this camera at all five
// test layouts to the drawn roof, the fifteen drawn piers on each face, and the drawn floor
// bands: 1.329 times its size, turned 10.2° so the camera meets its faces as the
// photograph does. Depth keeps the earlier placement.
aon.building.scale.setScalar(1.329);
aon.building.rotation.y = 10.2 * Math.PI / 180;
place(aon, 368.16, 40);

const models = [heritage, kemper, crain, michigan, trump, prudential, twoPrudential, aon];
const comparison = createSkylineComparison(models, crain.building.position);
const viewer = createBuildingStudy({
  models,
  layouts: comparison.layouts,
  labels: comparison.labels,
  onLayoutChange: comparison.onLayoutChange,
  defaultView: "skyline",
  views: {
    skyline: { azimuth, polar: Math.PI / 2 - elevation, label: "skyline view" },
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
    ...comparison.views,
  },
  fov: 6,
  minimumDistanceRatio: 0.1,
  maximumZoom: 24,
  enablePan: true,
  // The viewer moves the near plane outward at wider views to retain precision.
  near: 10,
  far: 10000,
  // The reference frame grew around the same centre to include Aon. Its platform
  // footprint and farthest corner remain inside the clipping margin at every zoom.
  clippingMargin: 560,
  target: [0, 172.5, 0],
  minimumCameraHeight: 1,
  fit: { height: 572.658, width: 717.635 },
  platform: { width: 750, depth: 580, color: 0x222222 },
  lightPosition: [-330, 560, 510],
  // Keep the key light's direction while moving it back far enough that Aon's
  // upper corner does not cross its near plane. The solo study keeps its preset.
  shadowCamera: { left: -540, right: 560, top: 550, bottom: -400, near: 1, far: 1300 },
});
comparison.connect(viewer);
