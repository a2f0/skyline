import { polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { buildTrumpTower, trumpLevels } from "./trump-tower.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Trump International Hotel and Tower: the geographic layout's model, on the mapped podium
// 64594680, tiers 188338549 and 188338550, shaft 188338548 and crown 188338859, and the
// spire above the crown. The tower is the shared generator in
// trump-tower.ts, the same one the original layout's copy uses. The setbacks keep the mapped
// parts' 60, 120 and 200 m; the roof, the shoulder, the crown and the spire's joints are
// measured on the photograph, down from the published tip, where the map's 345 and 357 m
// run about ten metres low. The spire stands where the photograph shows it. See
// docs/trump-reference.md. Units are meters; +x is east, +z is south.
export const trumpGeographicLevels = Object.freeze({
  podium: trumpLevels.podium,
  setbacks: trumpLevels.setbacks,
  roof: trumpLevels.roof,
  shoulder: trumpLevels.shoulder,
  crownTop: trumpLevels.crownTop,
  joints: trumpLevels.joints,
  tip: trumpLevels.tip, // published architectural height
});
const h = trumpGeographicLevels;
// The roof steps down north of the mapped shaft's east-face notch.
export const trumpNotch: Vec2 = [-113.6, -448.4];
// The spire stands where the photograph shows it on the crown: 4.05 m west of the mapped
// spire part's centre across the photograph's line of sight, whose depth it cannot show.
// The drawn crown matches the mapped crown part to three layer units; the mapped spire
// stands 24 units right of the drawn one. See docs/trump-reference.md.
export const trumpSpire: Vec2 = [-124.72, -458.66];

export function createTrumpGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const outline = (way: number) => polygonOf(projectPlan(record.parts.find((p) => p.way === way)!.coordinates));
  const shaft = outline(188338548);
  // The mapped vertex at the notch fixes the step's line.
  const notch = shaft.reduce((best, p) => (Math.hypot(p[0] - trumpNotch[0], p[1] - trumpNotch[1]) < Math.hypot(best[0] - trumpNotch[0], best[1] - trumpNotch[1]) ? p : best));
  const model = buildTrumpTower({
    name: record.name,
    id: record.id,
    tiers: [
      { outline: polygonOf(projectPlan(record.footprint.coordinates)), top: h.podium },
      { outline: outline(188338549), top: h.setbacks[0] },
      { outline: outline(188338550), top: h.setbacks[1] },
      { outline: shaft, top: h.roof },
    ],
    step: notch[1],
    crown: outline(188338859),
    spire: trumpSpire,
    base: 0,
  });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/trump-reference.md" };
  return model;
}
