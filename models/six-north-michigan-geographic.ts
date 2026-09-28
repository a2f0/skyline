import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Six North Michigan, the Montgomery Ward Building (Schmidt, Garden & Martin, 1899; four
// floors added by Holabird & Roche, 1923): the geographic layout's model, on the mapped
// outline 126982631. The original layout has no model of it; the drawing shows it right of
// Willoughby Tower, outside the excerpt it is fitted to.
//
// A sixteen-storey block, 27.5 m on Michigan by 49.6 m on Madison, under a projecting
// cornice. The tower, built in the middle of the Michigan front rather than on the corner
// first planned, rises flush with it: a floor above the block, a band, an arched stage of
// three tall windows to a face under a cornice, and a top stage of panels under a cap at
// 86 m, where the pyramid and statue came off in 1947. Heights are measured on the drawing
// down from that top; see docs/six-north-michigan-reference.md. Units are meters; +x is
// east, +z is south.
export const sixNorthLevels = Object.freeze({
  block: 62.1, // the block's walls, under its cornice
  cornice: 63.6, // the block's cornice and roof
  band: 65, // the tower's band, over the floor above the block
  bandTop: 66.9,
  arches: 75.6, // the arched stage, under the tower's cornice
  towerCornice: 78, // the tower's cornice, under the top stage
  stage: 84.5, // the top stage, under its cap
  top: 86, // the cap, the published height
  towerSouth: 7.5, // the tower's south wall, north of Madison
  towerNorth: 20, // its north wall
  towerDepth: 12, // west of the Michigan front
});
const h = sixNorthLevels;
// Each floor's level: a 6 m ground floor, then 3.74 m floors to the block's cornice.
const floor = (n: number) => (n < 2 ? 0 : 6 + (n - 2) * 3.74);

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x4c4c4c, 0x505050, 0x545454, 0x585858].map(color);
const litGlass = color(0x8a8a8a), dimGlass = color(0x5e5e5e);
const brick = color(0x6e6e6e), panel = color(0x9c9c9c), core = color(0x2e2e2e), roofing = color(0x484848);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 31, 0x9e3779b1) ^ Math.imul(bay + 57, 0x85ebca77) ^ Math.imul(wall + 43, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the block's walls, from 25 cm above grade, where the mapped outline ends:
// the ground floor's shopfronts, then each floor's brick spandrel and window.
type Row = { lo: number; hi: number; kind: "brick" | "glass" | "floor17" | "small" | "arch" | "head" | "panel"; floor: number };
const blockRows: Row[] = [
  { lo: 0.25, hi: 1, kind: "brick", floor: 1 },
  { lo: 1, hi: 5.2, kind: "glass", floor: 1 },
  { lo: 5.2, hi: floor(2) - 0.35, kind: "brick", floor: 1 },
];
for (let n = 2; n <= 16; n += 1) {
  blockRows.push({ lo: floor(n) - 0.35, hi: floor(n) + 1.25, kind: "brick", floor: n });
  blockRows.push({ lo: floor(n) + 1.25, hi: floor(n + 1) - 0.35, kind: "glass", floor: n });
}
blockRows.push({ lo: floor(17) - 0.35, hi: h.block, kind: "brick", floor: 17 });
// The tower's rows over the block: the seventeenth floor's windows under the band; then the
// arched stage's small windows over the band and its tall windows, their heads narrowing
// for the last half-metre; then the top stage's panel.
const towerRows: Row[] = [
  { lo: h.block, hi: 62.95, kind: "brick", floor: 17 },
  { lo: 62.95, hi: 64.77, kind: "floor17", floor: 17 },
  { lo: 64.77, hi: h.band, kind: "brick", floor: 17 },
  { lo: h.bandTop, hi: 68.2, kind: "small", floor: 18 },
  { lo: 68.2, hi: 70.7, kind: "brick", floor: 18 },
  { lo: 70.7, hi: 73.7, kind: "arch", floor: 19 },
  { lo: 73.7, hi: 74.2, kind: "head", floor: 19 },
  { lo: 74.2, hi: h.arches, kind: "brick", floor: 20 },
  { lo: h.towerCornice, hi: 83.2, kind: "panel", floor: 21 },
  { lo: 83.2, hi: h.stage, kind: "brick", floor: 21 },
];
const rowsBetween = (rows: Row[], lo: number, hi: number): Row[] => rows
  .map((row) => ({ ...row, lo: Math.max(row.lo, lo), hi: Math.min(row.hi, hi) }))
  .filter((row) => row.hi - row.lo > 0.05);

export function createSixNorthMichiganGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Six North Michigan · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Six North Michigan · brick and windows", kit.material(0xffffff, { vertexColors: true }));
  const cornices = kit.batch("Six North Michigan · cornices", kit.material(0x747474));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, and its Madison and Michigan fronts running from it.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const [west, north] = neighbours[0]![0] < neighbours[1]![0] ? [unit(neighbours[0]!), unit(neighbours[1]!)] : [unit(neighbours[1]!), unit(neighbours[0]!)];
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  // The inverse of `at`: a point's distances along Madison and Michigan, whose fronts meet
  // a little off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);
  const [depth, front] = [Math.max(...lot.map((p) => inLot(p)[0])), Math.max(...lot.map((p) => inLot(p)[1]))];
  const tower = (grow: number) => rect(-grow, h.towerDepth + grow, h.towerSouth - grow, h.towerNorth + grow);

  // A solid on an outline between two heights.
  const solid = (corners: Vec2[], lo: number, hi: number) => {
    planOf(corners).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], core);
    });
    paintedSlab(kit, shell, corners, lo, false, roofing);
    paintedSlab(kit, shell, corners, hi, true, roofing);
  };
  solid(lot, 0, h.block);
  solid(tower(0), h.block, h.arches);
  solid(tower(-0.8), h.towerCornice, h.stage);
  // The block's cornice overhangs its walls by a metre, stopping either side of the tower,
  // which rises through it, 2 cm clear of its walls so that the two undersides do not share
  // an edge; the tower's band, cornice and cap are its outline grown or shrunk.
  const [notchNorth, notchSouth, notchBack] = [h.towerNorth + 0.02, h.towerSouth - 0.02, h.towerDepth + 0.02];
  const corniceOutline = orient([at(-1, -1), at(depth + 1, -1), at(depth + 1, front + 1), at(-1, front + 1), at(-1, notchNorth), at(notchBack, notchNorth), at(notchBack, notchSouth), at(-1, notchSouth)]);
  kit.prism(cornices, planOf(corniceOutline), [h.block, h.cornice]);
  kit.prism(cornices, planOf(tower(0.5)), [h.band, h.bandTop]);
  kit.prism(cornices, planOf(tower(1.2)), [h.arches, h.towerCornice]);
  kit.prism(cornices, planOf(tower(-0.3)), [h.stage, h.top]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it,
  // from its start to its end, and says how far each reaches into a window: 0 is brick; a
  // floor's window takes any other; the tower's tall windows 1 and over, its seventeenth
  // floor's 2, its small windows 3, and their heads and the top stage's panel 4. Floors
  // below `fromFloor` stay brick.
  const glassFrom: Record<Row["kind"], number> = { brick: 99, glass: 1, floor17: 2, small: 3, arch: 1, head: 4, panel: 4 };
  const skin = (corners: Vec2[], rows: Row[], lo: number, hi: number, seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => number], fromFloor = 1) => {
    const plan = planOf(corners), cut = rowsBetween(rows, lo, hi), heights = [cut[0]!.lo, ...cut.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, reach] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = cut[r]!, into = reach(bay);
        if (row.kind === "panel") return into >= 4 ? panel : brick;
        if (row.floor < fromFloor) return brick;
        return into >= glassFrom[row.kind] ? paneColor(row.floor, bay, seed * 8 + index) : brick;
      }, brick);
    });
  };
  // Windows centred at `centres`, `width` wide, along a wall from its start.
  const windows = (length: number, centres: number[], width: number): [number[], (bay: number) => number] => {
    const inside = centres.filter((c) => c - width / 2 > 0.1 && c + width / 2 < length - 0.1);
    return [[0, ...inside.flatMap((c) => [c - width / 2, c + width / 2]), length], (bay) => (bay % 2 === 0 && bay <= 2 * inside.length ? 1 : 0)];
  };
  // A position along a wall from its start, given in lot coordinates across it.
  const along = (length: number, start: Vec2, end: Vec2, target: number, axis: 0 | 1) => length * (target - inLot(start)[axis]) / (inLot(end)[axis] - inLot(start)[axis]);
  const michigan = (run: Run) => run.normal(0)[0] > 0.9, party = (run: Run) => run.normal(0)[1] < -0.9;
  // The Michigan front: three windows to each wing either side of the tower, and three to
  // the tower between them, 3 m apart on the centres of the windows above.
  const michiganFront = (length: number, start: Vec2, end: Vec2) => windows(length, [1.6, 3.75, 5.9, 10.75, 13.75, 16.75, 21.6, 23.75, 25.9].map((b) => along(length, start, end, b, 1)), 1.3);
  // Madison, the alley and the north wall: a window every 2.75 m. The north wall is shared
  // with 20 North Michigan, eight storeys high, and stays blank below its ninth floor.
  const punched = (length: number) => { const bays = Math.round(length / 2.75); return windows(length, Array.from({ length: bays }, (_, i) => length * (i + 0.5) / bays), 1.1); };
  skin(lot, blockRows, 0.25, h.block, 0, michigan, michiganFront);
  skin(lot, blockRows, 0.25, h.block, 1, (run) => !michigan(run) && !party(run), punched);
  skin(lot, blockRows, 0.25, h.block, 6, party, punched, 9);
  // The tower's faces: three windows to a face, centred 3 m apart. A tall window is 2 m
  // wide, its head the middle metre; the seventeenth floor's are 1.3 m and the small ones
  // 1.1 m, all on the same centres.
  const towerFace = (length: number): [number[], (bay: number) => number] => {
    const steps = [-1, -0.65, -0.55, -0.5, 0.5, 0.55, 0.65, 1];
    const columns = [0, ...[-3, 0, 3].flatMap((d) => steps.map((s) => length / 2 + d + s)), length];
    // Bays count from one: a pier, then 1, 2, 3, 4, 3, 2, 1 across each window.
    return [columns, (bay) => (bay > 24 || (bay - 1) % 8 === 0 ? 0 : [0, 1, 2, 3, 4, 3, 2, 1][(bay - 1) % 8]!)];
  };
  // The top stage's panel, 7.2 m wide in the middle of each face.
  const panelled = (length: number): [number[], (bay: number) => number] => [[0, length / 2 - 3.6, length / 2 + 3.6, length], (bay) => (bay === 2 ? 4 : 0)];
  // Over the block, the tower's Michigan face shows from the block's walls; the cornice
  // hides its other faces' foot.
  skin(tower(0), towerRows, h.block, h.band, 2, michigan, towerFace);
  skin(tower(0), towerRows, h.cornice, h.band, 3, (run) => !michigan(run), towerFace);
  skin(tower(0), towerRows, h.bandTop, h.arches, 4, () => true, towerFace);
  skin(tower(-0.8), towerRows, h.towerCornice, h.stage, 5, () => true, panelled);

  const model = kit.finish({ height: h.top, outlines: [shell, cornices], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/six-north-michigan-reference.md" };
  return model;
}
