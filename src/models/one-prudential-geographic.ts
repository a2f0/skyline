import { polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainsOf, orient, planOf } from "./facade-grid.js";
import { buildOnePrudentialTower, onePrudentialLevels } from "./one-prudential-tower.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// One Prudential Plaza: the geographic layout's model, on the mapped tower part 685493609,
// the east wing 685493610 wrapped round its east end, the west wing 685493612 round its
// west and north, and the mast at the mapped antenna part 685493614's centre. The tower is
// the shared generator in one-prudential-tower.ts, the same one the original layout's copy
// uses. The map gives the wings levels but no heights: the east wing's roof is measured
// on the photograph, and the west wing, which the photograph cannot see, keeps its three
// levels' estimate. The penthouse stands on the mapped south face where the photograph
// shows it. See docs/one-prudential-reference.md. Units are meters; +x is east, +z is south.
export const onePrudentialGeographicLevels = Object.freeze({
  roof: onePrudentialLevels.roof,
  penthouseTop: onePrudentialLevels.penthouseTop, // published architectural height
  mastTop: onePrudentialLevels.mastTop,
  tip: onePrudentialLevels.tip, // published antenna tip
  floors: onePrudentialLevels.floors,
  eastWing: 56.4, // part 685493610: measured on the photograph; the map gives ten levels
  westWing: 13.4, // part 685493612: three levels at 183.2/41, estimated
});
const h = onePrudentialGeographicLevels;

export function createOnePrudentialGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const outline = (way: number) => polygonOf(projectPlan(record.parts.find((p) => p.way === way)!.coordinates));
  const tower = orient(outline(685493609));
  // The south face is the tower's wall facing most nearly south; the penthouse stands on
  // its chord, 2.3 m in from its west end.
  const plan = planOf(tower);
  const south = chainsOf(plan).map(({ runs }) => [plan[runs[0]!]!.at(0), plan[runs.at(-1)!]!.at(plan[runs.at(-1)!]!.length)] as [Vec2, Vec2])
    .reduce((best, chord) => (chord[1][0] - chord[0][0] > best[1][0] - best[0][0] ? chord : best));
  const length = Math.hypot(south[1][0] - south[0][0], south[1][1] - south[0][1]);
  const along: Vec2 = [(south[1][0] - south[0][0]) / length, (south[1][1] - south[0][1]) / length];
  const corner: Vec2 = [south[0][0] + along[0] * 2.3, south[0][1] + along[1] * 2.3];
  // The mast at the mapped antenna's area centroid.
  const ring = outline(685493614);
  let twice = 0, cx = 0, cz = 0;
  ring.forEach(([x, z], i) => {
    const [x2, z2] = ring[(i + 1) % ring.length]!, cross = x * z2 - x2 * z;
    twice += cross; cx += (x + x2) * cross; cz += (z + z2) * cross;
  });
  const model = buildOnePrudentialTower({
    name: record.name,
    id: record.id,
    tower,
    wings: [{ outline: outline(685493610), top: h.eastWing }, { outline: outline(685493612), top: h.westWing }],
    penthouse: { corner, along, length: 50.1, depth: 12 },
    mast: [cx / (3 * twice), cz / (3 * twice)],
    base: 0,
  });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: h.floors, source: "docs/one-prudential-reference.md" };
  return model;
}
