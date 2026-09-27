import { polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { aonLevels, buildAonTower } from "./aon-tower.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Aon Center: the geographic layout's model, on the mapped outline 64388609 with its
// notched corners, the rooftop enclosure part 284775635, and the published heights. The
// tower is the shared generator in aon-tower.ts, the same one the original layout's copy
// uses. The mapped faces hold fourteen 10 ft bays; the mapped notches run about 1.5 m
// deeper than the photograph's, which leaves the clean plan fifteen. The antenna stands
// at the enclosure's centre, reaching the published 362.5 m tip; the map gives no antenna
// geometry. See docs/aon-reference.md. Units are meters; +x is east, +z is south.
export const aonGeographicLevels = Object.freeze({
  shaftTop: aonLevels.roof, // OSM shaft part top
  enclosureTop: aonLevels.enclosureTop, // OSM part 284775635
  tip: aonLevels.tip, // published tip
  floors: 83,
});
const h = aonGeographicLevels;

export function createAonGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const enclosurePart = record.parts.find((p) => p.way === 284775635)!;
  const enclosure = polygonOf(projectPlan(enclosurePart.coordinates));
  const mast: Vec2 = enclosure.reduce<Vec2>((sum, p) => [sum[0] + p[0] / enclosure.length, sum[1] + p[1] / enclosure.length], [0, 0]);
  const model = buildAonTower({ name: record.name, id: record.id, outline: polygonOf(projectPlan(record.footprint.coordinates)), enclosure, mast, base: 0 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: h.floors, source: "docs/aon-reference.md" };
  return model;
}
