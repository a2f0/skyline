import { polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { buildCrainTower, crainMainRoof } from "./crain-tower.js";
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
// both roofs fall 1.225 m per metre, about 51°. The drawing's right half ends 7.3 m above
// the left, as those planes give. See docs/crain-reference.md. Units are meters; +x is
// east, +z is south.
export const crainGeographicLevels = Object.freeze({
  tip: 177.4,
  fall: 1.225,
  bearing: 133,
  mainRoof: crainMainRoof,
  floors: 41,
});
const h = crainGeographicLevels;

// Height falls along the downhill bearing from the part's highest corner.
function roofOf(corners: Vec2[]): (point: Vec2) => number {
  const angle = h.bearing * Math.PI / 180;
  const along = ([x, z]: Vec2) => x * Math.sin(angle) - z * Math.cos(angle);
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
  // The roof grid follows the mapped south face, from its south-west corner.
  const south = polygonOf(projectPlan(record.footprint.coordinates));
  const southWest = south.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const southEast = south.reduce((best, p) => (p[1] + p[0] > best[1] + best[0] ? p : best));
  const length = Math.hypot(southEast[0] - southWest[0], southEast[1] - southWest[1]);
  const model = buildCrainTower({
    name: record.name,
    id: record.id,
    base: 0,
    grid: { origin: southWest, axis: [(southEast[0] - southWest[0]) / length, (southEast[1] - southWest[1]) / length] },
    volumes,
  });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: h.floors, source: "docs/crain-reference.md" };
  return model;
}
