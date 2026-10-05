import { polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainsOf } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";
import { buildTwoPrudentialTower, twoPrudentialCore, twoPrudentialLevels } from "./two-prudential-tower.js";

// Two Prudential Plaza: the geographic layout's model, on the mapped outline 64388666. The
// tower is the shared generator in two-prudential-tower.ts, the same one the original
// layout's copy uses. Its core stands on the outline's area centroid, square to the mapped
// south wall; the lobby fills the mapped outline to the first office floor, and the tiers
// fill the depth between the core and the mapped north and south walls. See
// docs/two-prudential-reference.md. Units are meters; +x is east, +z is south.
export const twoPrudentialGeographicLevels = twoPrudentialLevels;

// The area centroid, not the mean of the traced vertices: this outline carries three extra
// points down its west wall, which would pull a vertex mean 4.9 m west and 2.7 m south.
export function areaCentroid(outline: Vec2[]): Vec2 {
  let twice = 0, x = 0, z = 0;
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length]!, cross = a[0] * b[1] - b[0] * a[1];
    twice += cross; x += (a[0] + b[0]) * cross; z += (a[1] + b[1]) * cross;
  });
  return [x / (3 * twice), z / (3 * twice)];
}

// The core's frame on the mapped outline: its centre, the unit vector along the mapped south
// wall, and how far the mapped south and north walls stand from the centre along its normal.
export function twoPrudentialFrame(ground: Plan) {
  const outline = polygonOf(ground), centre = areaCentroid(outline);
  const chains = chainsOf(ground).map((chain) => ({ chain, normal: ground[chain.runs[0]!]!.normal(0) }));
  const wall = (sign: number) => chains.find(({ normal }) => normal[1] * sign > 0.9)!.chain;
  const ends = (chain: ReturnType<typeof wall>): Vec2[] => chain.runs.flatMap((index) => [ground[index]!.at(0), ground[index]!.at(ground[index]!.length)]);
  const [start, end] = [ends(wall(1))[0]!, ends(wall(1)).at(-1)!];
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const along: Vec2 = [(end[0] - start[0]) / length, (end[1] - start[1]) / length], south: Vec2 = [-along[1], along[0]];
  const depth = (p: Vec2) => (p[0] - centre[0]) * south[0] + (p[1] - centre[1]) * south[1];
  // The nearest point of each wall, less 2 cm, so each lower tier's front stays within the
  // mapped outline across the whole of its width.
  const fronts: [number, number] = [Math.min(...ends(wall(1)).map(depth)) - 0.02, Math.min(...ends(wall(-1)).map((p) => -depth(p))) - 0.02];
  return { centre, along, fronts };
}

export function createTwoPrudentialGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const ground = projectPlan(record.footprint.coordinates);
  const { centre, along, fronts } = twoPrudentialFrame(ground);
  const model = buildTwoPrudentialTower({ name: record.name, id: record.id, centre, along, fronts, base: 0, lobby: ground });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: twoPrudentialGeographicLevels, core: twoPrudentialCore, floors: twoPrudentialLevels.floors, source: "docs/two-prudential-reference.md" };
  return model;
}
