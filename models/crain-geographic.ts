import * as THREE from "../vendor/three-r186.js";
import { polygonOf } from "./building-kit.js";
import { createCrainIllumination } from "./crain-illumination.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { buildCrainTower, crainFloors, crainMainRoof } from "./crain-tower.js";
import type { GeoBuilding, GeoPart } from "./skyline-geography-data.js";

// Crain Communications Building at 150 North Michigan Avenue: the geographic layout's
// model, on the three mapped OpenStreetMap parts. Part 284816228 is the south-west half,
// 284816229 the north-east half, and 284816227 the wedge between them whose 152.5 m top is
// the slot's floor. The parts' outlines are kept exactly; the tower itself is the shared
// generator in crain-tower.ts, the same one the solo study's model uses.
//
// The roofs keep OSM's 133° downhill bearing. Their heights come from the photograph the
// drawing was traced from, not from OSM's roof tags. Those put the south-west peak 5 m below
// the north-east one and fall 75 and 73 m, 54° and 56°. Measured through the solved skyline
// camera, both peaks stand within half a metre of each other at the published 177.4 m, and
// both roofs fall 1.225 m per metre, about 51°. Those planes end the north-east half about
// 6.9 m above the south-west half's foot, where the drawing shows 7.3 m. See
// docs/crain-reference.md. Units are meters; +x is east, +z is south.
export const crainGeographicLevels = Object.freeze({
  tip: 177.4,
  fall: 1.225,
  bearing: 133,
  mainRoof: crainMainRoof,
  floors: 41,
});
const h = crainGeographicLevels;
const angle = h.bearing * Math.PI / 180;
const downhill: Vec2 = [Math.sin(angle), -Math.cos(angle)];
// One-based facade rows above the lobby, not occupied floor numbers.
const crownBand = (row: number): readonly [number, number] => {
  const level = crainFloors.lobbyTop + (row - 1) * crainFloors.pitch;
  return [level + crainFloors.sill, level + crainFloors.head];
};

// Height falls along the downhill bearing from the part's highest corner.
function roofOf(corners: Vec2[]): (point: Vec2) => number {
  const along = ([x, z]: Vec2) => x * downhill[0] + z * downhill[1];
  const top = Math.min(...corners.map(along));
  return (point: Vec2) => h.tip - h.fall * (along(point) - top);
}

export function createCrainGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const corners = (part: GeoPart) => polygonOf(projectPlan(part.coordinates));
  const volumes = record.parts.map((part) => {
    const outline = corners(part);
    return part.roofSlope
      ? { corners: outline, roof: roofOf(outline), glazed: true }
      : { corners: outline, roof: () => part.top, glazed: false };
  });
  // Epstein's exterior photographs show downslope mullions and level crossbars,
  // rather than the drawing model's grid aligned with the street axes.
  const south = polygonOf(projectPlan(record.footprint.coordinates));
  const southWest = south.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const model = buildCrainTower({
    name: record.name,
    id: record.id,
    base: 0,
    grid: { origin: southWest, axis: downhill, edgeInset: 0.1 },
    // Two louver bands beneath the slot, three dark crown strips, then a solid
    // aluminum tip. Counts are observed; elevations follow the estimated 3.5 m
    // story rhythm. See the dated evidence and uncertainties in the audit.
    crown: {
      officeTop: crownBand(40)[0],
      louvers: [crownBand(40), crownBand(41)],
      // Continue the rhythm as virtual rows, not additional occupied floors.
      shadowStrips: [crownBand(43), crownBand(44), crownBand(45)],
    },
    volumes,
  });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: h.floors, source: "docs/crain-reference.md" };
  const glass = model.building.getObjectByName("Crain · sloped glazing");
  const outline = model.building.getObjectByName("Crain · diamond outline lights");
  if (!(glass instanceof THREE.Mesh) || !(glass.material instanceof THREE.MeshToonMaterial)
    || !(outline instanceof THREE.Mesh) || !(outline.material instanceof THREE.MeshToonMaterial)) throw new Error("Crain crown meshes missing");
  model.illumination = createCrainIllumination(glass, outline.material, volumes, downhill);
  return model;
}
