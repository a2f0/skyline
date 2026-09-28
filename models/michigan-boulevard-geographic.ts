import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Michigan Boulevard Building, 30 North Michigan Avenue (Jarvis Hunt, 1914, fifteen
// storeys; six added by Hunt in 1923): the geographic layout's model, on the mapped outline
// 126982630. The original layout has no model of it; the drawing shows its Michigan front
// and, above 20 North Michigan, its south wall, right of Six North Michigan's tower.
//
// A terracotta street front of five bays, a single window and four pairs to a floor, over
// twenty-one storeys, with a belt course over the thirteenth and an attic of panels under a
// parapet at the published 82 m. The terracotta turns one bay onto the south wall; beyond
// it the wall is common brick, shared with 20 North Michigan to its eighth floor and blank
// to the eighteenth. Heights are measured on the drawing down from that top; see
// docs/michigan-boulevard-reference.md. Units are meters; +x is east, +z is south.
export const michiganBoulevardLevels = Object.freeze({
  belt: 49, // the belt course over the thirteenth floor
  beltTop: 50.2,
  attic: 78.16, // the attic, over the twenty-first floor's windows
  top: 82, // the parapet, the published height
  endParapet: 83.3, // the raised parapet over the front's south bay
  pedestals: 82.6, // the pedestals over the front's piers
  returnBay: 5.6, // the terracotta's return onto the south wall
});
const h = michiganBoulevardLevels;
// Each floor's level: a 4.8 m ground floor, 3.7 m floors to the thirteenth, which the belt
// course makes 4.7 m, and 3.58 m floors above.
const floor = (n: number) => (n < 2 ? 0 : n <= 13 ? 4.8 + (n - 2) * 3.7 : 50.2 + (n - 14) * 3.58);

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x2c2c2c, 0x303030, 0x343434, 0x383838].map(color);
const litGlass = color(0x6a6a6a), dimGlass = color(0x404040);
const terracotta = color(0x444444), returnBay = color(0x545454), brick = color(0x404040), belt = color(0x505050), panel = color(0x363636);
const core = color(0x262626), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 37, 0x9e3779b1) ^ Math.imul(bay + 61, 0x85ebca77) ^ Math.imul(wall + 47, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends: the ground
// floor's shopfronts; each floor's spandrel and 2 m window, the belt course among the
// spandrels over the thirteenth; and the attic under the parapet, its panels in the middle.
type Row = { lo: number; hi: number; kind: "wall" | "glass" | "belt" | "attic" | "panel"; floor: number };
const rows: Row[] = [
  { lo: 0.25, hi: 0.9, kind: "wall", floor: 1 },
  { lo: 0.9, hi: 4.2, kind: "glass", floor: 1 },
];
for (let n = 2; n <= 21; n += 1) {
  const below = rows.at(-1)!.hi;
  if (n === 14) {
    rows.push({ lo: below, hi: h.belt, kind: "wall", floor: n });
    rows.push({ lo: h.belt, hi: h.beltTop, kind: "belt", floor: n });
    rows.push({ lo: h.beltTop, hi: floor(n) + 0.9, kind: "wall", floor: n });
  } else rows.push({ lo: below, hi: floor(n) + 0.9, kind: "wall", floor: n });
  rows.push({ lo: floor(n) + 0.9, hi: floor(n) + 2.9, kind: "glass", floor: n });
}
rows.push({ lo: h.attic, hi: 79.2, kind: "attic", floor: 22 });
rows.push({ lo: 79.2, hi: 80.9, kind: "panel", floor: 22 });
rows.push({ lo: 80.9, hi: h.top, kind: "attic", floor: 22 });

export function createMichiganBoulevardGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Michigan Boulevard Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Michigan Boulevard Building · terracotta and windows", kit.material(0xffffff, { vertexColors: true }));
  const parapets = kit.batch("Michigan Boulevard Building · parapet", kit.material(0x4c4c4c));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west and its Michigan front
  // north to the Washington Street corner.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(neighbours[0]![0] < neighbours[1]![0] ? neighbours[0]! : neighbours[1]!), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  // The inverse of `at`: a point's distances along the south wall and the Michigan front,
  // which meet a little off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const front = inLot(northEast)[1];
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.top, true, roofing);
  // Over the front's south bay the parapet rises, and pedestals stand over the piers between
  // the pairs and at the Washington corner, 5 cm inside the walls' planes.
  kit.prism(parapets, planOf(rect(0.05, 0.65, 0.05, 6.2)), [h.top, h.endParapet]);
  for (const b of [12.4, 18.5, 24.6, front - 0.45]) kit.prism(parapets, planOf(rect(0.05, 0.65, b - 0.4, b + 0.4)), [h.top, h.pedestals]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it,
  // from its start to its end, and gives each its face, whether it holds a window and from
  // which floor, and whether the attic's panel crosses it.
  type Column = { face: THREE.Color; window: boolean; from: number; panel: boolean };
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => Column]) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, column] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, { face, window, from, panel: paneled } = column(bay);
        if (row.kind === "belt") return face === brick ? brick : belt;
        if (row.kind === "panel") return paneled ? panel : face;
        return row.kind === "glass" && window && row.floor >= from ? paneColor(row.floor, bay, seed * 8 + index) : face;
      }, terracotta);
    });
  };
  // A position along a wall from its start, given in lot coordinates across it, and back.
  const along = (length: number, start: Vec2, end: Vec2, axis: 0 | 1) => {
    const [p, q] = [inLot(start)[axis], inLot(end)[axis]];
    return [(target: number) => length * (target - p) / (q - p), (s: number) => p + (s / length) * (q - p)] as const;
  };
  // Windows `width` wide centred at `centres`, in lot coordinates along `axis`; `column`
  // says, in the same coordinates, what else each column carries.
  const windows = (length: number, start: Vec2, end: Vec2, axis: 0 | 1, centres: number[], width: number, column: (at: number) => Omit<Column, "window">): [number[], (bay: number) => Column] => {
    const [to, from] = along(length, start, end, axis);
    const inside = centres.map(to).filter((c) => c - width / 2 > 0.1 && c + width / 2 < length - 0.1).sort((p, q) => p - q);
    const columns = [0, ...inside.flatMap((c) => [c - width / 2, c + width / 2]), length];
    // Bays count from one: a wall, then each window and the wall after it.
    return [columns, (bay) => ({ ...column(from((columns[bay - 1]! + columns[bay]!) / 2)), window: bay % 2 === 0 && bay <= 2 * inside.length })];
  };
  const pairs = (centres: number[]) => centres.flatMap((c) => [c - 1, c + 1]);
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  const [isMichigan, isSouth, isWashington] = [facing(1, 0), facing(0, 1), facing(0, -1)];
  // The Michigan front: a single window in its south bay and a pair in each of the other
  // four, 2 m apart; the attic's panel spans each bay's windows.
  const frontBays = [[3.1, 0.725], ...[9.3, 15.45, 21.55, 27.75].map((c) => [c, 1.725])] as const;
  const michigan = (length: number, start: Vec2, end: Vec2) => windows(length, start, end, 1, [3.1, ...pairs([9.3, 15.45, 21.55, 27.75])], 1.45,
    (b) => ({ face: terracotta, from: 1, panel: frontBays.some(([c, half]) => Math.abs(b - c) < half) }));
  // The south wall: the terracotta's return bay with a pair of windows over 20 North
  // Michigan, then brick with a pair every 5.1 m on the top four floors, as drawn.
  const southWall = (length: number, start: Vec2, end: Vec2) => windows(length, start, end, 0, pairs([2.5, 8, 13.2, 18.3, 23.4, 28.5, 33.6, 38.7, 43.8]), 1.1,
    (a) => (a < h.returnBay ? { face: returnBay, from: 9, panel: false } : { face: brick, from: 18, panel: false }));
  // Washington Street's terracotta front and the brick alley: a pair every 6.1 m.
  const rear = (face: THREE.Color) => (length: number, start: Vec2, end: Vec2) => {
    const axis = Math.abs(inLot(end)[0] - inLot(start)[0]) > Math.abs(inLot(end)[1] - inLot(start)[1]) ? 0 : 1, [, from] = along(length, start, end, axis);
    const count = Math.max(1, Math.round(length / 6.1));
    return windows(length, start, end, axis, pairs(Array.from({ length: count }, (_, i) => from(length * (i + 0.5) / count))), 1.1, () => ({ face, from: 1, panel: false }));
  };
  skin(0, isMichigan, michigan);
  skin(1, isSouth, southWall);
  skin(2, isWashington, rear(terracotta));
  skin(3, (run) => !isMichigan(run) && !isSouth(run) && !isWashington(run), rear(brick));

  const model = kit.finish({ height: h.endParapet, outlines: [shell, parapets], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/michigan-boulevard-reference.md" };
  return model;
}
