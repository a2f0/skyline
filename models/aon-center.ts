import * as THREE from "../vendor/three-r186.js";
import { createBuilder, rectangle, station } from "./building-kit.js";
import type { BuildingModel, Run, Vec3 } from "./building-kit.js";

// Aon Center: the source drawing's granite-clad outer tube, dark vertical window
// slots, broad near-corner pier, and thin raised roof rim. Dimensions and heights
// are measured from the study platform; +x is east and +z is south.
export const aonWidth = 70;
export const aonDepth = 67;
export const aonRoof = 411;
const west = -aonWidth / 2, east = aonWidth / 2;
const north = -aonDepth / 2, south = aonDepth / 2;
const plan = rectangle(west, east, north, south);
const shaftTop = aonRoof - 2.8;
const frontPiers = Array.from({ length: 15 }, (_, i) => 0.018 + i * 0.0635);
const sidePiers = Array.from({ length: 15 }, (_, i) => 0.245 + i * 0.0504);
// The drawing puts three wide granite strips between the near corner and the
// first narrow east-face pier (paths 1032, 1030, and 1034).
const eastCornerStrips: [number, number][] = [[0.15, 5.55], [5.75, 12.05], [12.25, 15.15]];
const floorCount = 76;
const floorPitch = shaftTop / floorCount;
const pierDepth = 0.48;
const frontRun = plan[0]!, sideRun = plan[1]!;
const on = (run: Run, fraction: number, y: number, offset = 0): Vec3 => {
  const [x, z] = run.at(run.length * fraction, offset);
  return [x, y, z];
};

export const aonFeatures: Record<string, Vec3 | Vec3[]> = {
  aonRoofWest: [west, aonRoof, south],
  aonRoofNear: [east, aonRoof, south],
  aonRoofEast: [east, aonRoof, north],
  aonFrontFacade: [0, 230, south + pierDepth],
  aonFrontPiers: frontPiers.slice(1, -1).map((fraction) => on(frontRun, fraction, 220, pierDepth / 2)),
  aonSidePiers: sidePiers.slice(1, -1).map((fraction) => on(sideRun, fraction, 220, pierDepth / 2)),
  aonCornerStrips: eastCornerStrips.map(([a, b]) => on(sideRun, (a + b) / 2 / sideRun.length, 220, 0.275)),
  aonCornerStripEdges: eastCornerStrips.flatMap(([a, b]) => [a, b].map((s) => on(sideRun, s / sideRun.length, 220, 0.55))),
  aonFloorRows: [8, 20, 32, 44, 56, 68].map((row) => on(frontRun, 0.5, (row + 0.5) * floorPitch, 0.04)),
};

export function createAonCenterBuilding(): BuildingModel {
  const kit = createBuilder("Aon Center", "layer3");
  const { material, batch, prism, band, box, panel } = kit;
  const dark = material(0x242424);
  const glass = material(0xffffff, { vertexColors: true });
  const granite = material(0x909090);
  const cornerStone = material(0xa0a0a0);
  const equipmentMetal = material(0x555555);
  const louverMetal = material(0x777777);
  const shell = batch("dark curtain-wall core", dark);
  const windows = batch("gridded window panes", glass);
  const piers = batch("granite perimeter piers", granite);
  const corners = batch("wide granite corner piers", cornerStone);
  const rim = batch("roof parapet", cornerStone);
  const equipment = batch("low rooftop equipment", equipmentMetal);
  const louvers = batch("rooftop screen louvers", louverMetal);

  prism(shell, plan, [0, shaftTop], { omit: ["bottom"] });
  // The perimeter parapet rises above the dark roof and returns around all four sides.
  band(rim, plan, shaftTop, aonRoof, 0.45, { closed: true });
  // Two low service enclosures remain below the drawn roof silhouette. Their
  // open-air louver ribs become visible in the elevated orbit views.
  for (const [left, right, back, front] of [[-20, -2, -15, -3], [5, 19, 4, 16]] as [number, number, number, number][]) {
    const enclosure = rectangle(left, right, back, front);
    prism(equipment, enclosure, [shaftTop, shaftTop + 1.75]);
    const face = enclosure[0]!;
    for (let i = 1; i < 9; i += 1) {
      const where = station(face, face.length * i / 9);
      box(louvers, where.at, where.normal, 0.13, -0.08, 0.2, shaftTop + 0.2, shaftTop + 1.55);
    }
    for (let i = 1; i < 7; i += 1) {
      const z = back + (front - back) * i / 7;
      box(louvers, [(left + right) / 2, z], [0, 1], (right - left) / 2 - 0.5,
        -0.08, 0.08, shaftTop + 1.75, shaftTop + 1.87);
    }
  }

  const tones = [0x303030, 0x343434, 0x393939, 0x2c2c2c].map((hex) => new THREE.Color(hex));
  const occupied = new THREE.Color(0x696969);
  const subdued = new THREE.Color(0x505050);
  const facade = (run: Run, seed: number, fractions: number[], skipFirstBay = false) => {
    const edges = [0, ...fractions, 1].map((fraction) => fraction * run.length);
    for (let bay = 0; bay < edges.length - 1; bay += 1) {
      if (skipFirstBay && bay === 0) continue;
      const left = edges[bay]! + 0.13, right = edges[bay + 1]! - 0.13;
      if (right - left < 0.4) continue;
      for (let row = 0; row < floorCount; row += 1) {
        const hash = (Math.imul(row + 11, 0x9e3779b1) ^ Math.imul(bay + seed, 0x85ebca77)) >>> 0;
        const tone = hash % 103 === 0 ? occupied : hash % 53 === 0 ? subdued : tones[hash % tones.length]!;
        panel(windows, run, left, right, row * floorPitch + 0.52, (row + 1) * floorPitch - 0.3, 0.035, tone);
      }
    }
    for (const fraction of fractions) {
      const where = station(run, fraction * run.length);
      box(piers, where.at, where.normal, 0.62, -0.12, pierDepth, 0, shaftTop - 0.2);
    }
  };
  facade(frontRun, 1, frontPiers);
  facade(sideRun, 19, sidePiers, true);
  // The unseen north and west sides continue the structural rhythm for orbit views.
  facade(plan[2]!, 37, frontPiers);
  facade(plan[3]!, 53, sidePiers);
  for (const run of plan) {
    const where = station(run, run.length - 1.2);
    box(corners, where.at, where.normal, 1.15, -0.12, 0.55, 0, shaftTop - 0.2);
  }
  for (const [start, end] of eastCornerStrips) {
    const where = station(sideRun, (start + end) / 2);
    box(corners, where.at, where.normal, (end - start) / 2, -0.12, 0.55, 0, shaftTop - 0.2);
  }
  return kit.finish({ height: aonRoof, outlines: [rim, corners] });
}
