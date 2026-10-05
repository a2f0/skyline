import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Monroe Building, 104 South Michigan Avenue (Holabird & Roche, 1912): the geographic
// layout's model, on the mapped outline 145498713. The original layout has no model of it;
// the drawing shows it left of the University Club, across Monroe Street.
//
// Twelve storeys of terracotta over two of granite, in bays of paired windows, with a belt
// course over the twelfth floor and a cornice under a steep gable roof that holds two more
// floors, sixteen in all, its gable facing Michigan with small arched windows. The ridge is
// the Skyscraper Center's 69 m. The drawn ridge reads 67.7 m, so heights read on the drawing
// are scaled to meet it; see docs/monroe-reference.md. Units are meters; +x is east, +z is
// south.
const drawn = (height: number) => height * 69 / 67.7;
export const monroeLevels = Object.freeze({
  granite: drawn(14.5), // the two granite storeys, under the third floor
  belt: drawn(49.9), // the belt course over the twelfth floor
  beltTop: drawn(51.1),
  cornice: drawn(56.9), // the cornice under the roof
  eaves: drawn(58.2), // the roof's foot and the gable's
  ridge: 69, // the ridge, the published height
});
const h = monroeLevels;

// The skins' colours: the window tones, and the terracotta, granite and bands, which no
// window shares.
export const monroePalette = Object.freeze({ glass: [0x4e4e4e, 0x525252, 0x565656, 0x5a5a5a], lit: 0x929292, dim: 0x484848, terracotta: 0xb2b2b2, granite: 0x9a9a9a, band: 0xc2c2c2 });
const palette = monroePalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const terracotta = color(palette.terracotta), granite = color(palette.granite), band = color(palette.band);
const core = color(0x2e2e2e), roofing = color(0x303030), flat = color(0x484848);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 47, 0x9e3779b1) ^ Math.imul(bay + 73, 0x85ebca77) ^ Math.imul(wall + 61, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends, read on the
// drawing and scaled: the two granite storeys' tall windows; each terracotta floor's
// spandrel and window, 3.55 m apart as drawn to the twelfth, the belt course in the spandrel
// over it, then the thirteenth and fourteenth; and the cornice.
type Row = { lo: number; hi: number; kind: "granite" | "wall" | "glass" | "band"; floor: number };
const rows: Row[] = [
  { lo: 0.25, hi: drawn(1), kind: "granite", floor: 1 },
  { lo: drawn(1), hi: drawn(7), kind: "glass", floor: 1 },
  { lo: drawn(7), hi: drawn(8.5), kind: "granite", floor: 2 },
  { lo: drawn(8.5), hi: drawn(13.5), kind: "glass", floor: 2 },
  { lo: drawn(13.5), hi: h.granite, kind: "granite", floor: 2 },
];
const bases = [...Array.from({ length: 10 }, (_, k) => 14.5 + k * 3.55), 50.3, 53.7];
bases.forEach((base, k) => {
  const floor = k + 3, below = rows.at(-1)!.hi;
  if (floor === 13) {
    rows.push({ lo: below, hi: h.belt, kind: "wall", floor });
    rows.push({ lo: h.belt, hi: h.beltTop, kind: "band", floor });
    rows.push({ lo: h.beltTop, hi: drawn(base + 0.9), kind: "wall", floor });
  } else rows.push({ lo: below, hi: drawn(base + 0.9), kind: "wall", floor });
  rows.push({ lo: drawn(base + 0.9), hi: drawn(base + 3), kind: "glass", floor });
});
rows.push({ lo: rows.at(-1)!.hi, hi: h.cornice, kind: "wall", floor: 14 });
rows.push({ lo: h.cornice, hi: h.eaves, kind: "band", floor: 14 });

export function createMonroeGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Monroe Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Monroe Building · terracotta and windows", kit.material(0xffffff, { vertexColors: true }));
  const attic = kit.batch("Monroe Building · attic windows", kit.material(0x505050));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west and its Michigan front
  // north to Monroe.
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
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);
  const lift = ([x, z]: Vec2, y: number): Vec3 => [x, y, z];
  // The lot's four corners, in lot coordinates: its north and south walls are a little out
  // of parallel.
  const inPlan = lot.map(inLot), extreme = (score: (p: Vec2) => number) => inPlan.reduce((best, p) => (score(p) > score(best) ? p : best));
  const [southWest, northWest, northEastIn] = [extreme(([a, b]) => a - b), extreme(([a, b]) => a + b), inLot(northEast)];

  // The walls to the roof's foot.
  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.eaves, b[1]], [a[0], h.eaves, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, flat);
  paintedSlab(kit, shell, lot, h.eaves, true, flat);

  // The roof: a closed solid 5 cm inside the walls, so that no face lies in theirs, from a
  // foot 10 cm inside the block to a ridge between its gables' middles; its gables are
  // terracotta, and its slopes roofing, each in two triangles since the lot is out of square.
  const inset = (a: number, b: number, da: number, db: number): Vec2 => at(a + da * 0.05, b + db * 0.05);
  const roofCorners = [inset(0, 0, 1, 1), inset(southWest[0], southWest[1], -1, 1), inset(northWest[0], northWest[1], -1, -1), inset(0, northEastIn[1], 1, -1)] as const;
  const [se, sw, nw, ne] = roofCorners, foot = h.eaves - 0.1;
  const footprint = orient([...roofCorners]);
  planOf(footprint).forEach((run) => {
    const p = run.at(0), q = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [lift(p, foot), lift(q, foot), lift(q, h.eaves), lift(p, h.eaves)], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, footprint, foot, false, flat);
  const halfway = (p: Vec2, q: Vec2): Vec2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const [eastRidge, westRidge] = [lift(halfway(se, ne), h.ridge), lift(halfway(sw, nw), h.ridge)];
  const centre = lift(halfway(halfway(se, nw), halfway(sw, ne)), (h.eaves + h.ridge) / 2);
  // Each face's outward normal, from its points and the roof's middle.
  const face = (points: [Vec3, Vec3, Vec3], paint: THREE.Color) => {
    const [a, b, c] = points;
    const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
    const mid = [0, 1, 2].map((k) => (a[k]! + b[k]! + c[k]!) / 3);
    if (n.x * (mid[0]! - centre[0]) + n.y * (mid[1]! - centre[1]) + n.z * (mid[2]! - centre[2]) < 0) n.negate();
    const normal: Vec3 = [n.x, n.y, n.z];
    kit.triangle(shell, points, [normal, normal, normal], paint);
  };
  const eave = (p: Vec2) => lift(p, h.eaves);
  face([eave(se), eave(sw), westRidge], roofing);
  face([eave(se), westRidge, eastRidge], roofing);
  face([eave(ne), eave(nw), westRidge], roofing);
  face([eave(ne), westRidge, eastRidge], roofing);
  face([eave(se), eave(ne), eastRidge], terracotta);
  face([eave(sw), eave(nw), westRidge], terracotta);
  const middle = (inLot(halfway(se, ne))[1]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in, with paired windows `pairs` along it from its start;
  // a `plain` wall carries neither windows nor bands.
  const skin = (seed: number, keep: (run: Run) => boolean, pairs: (length: number, start: Vec2, end: Vec2) => number[], plain = false) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      // Each pair: two windows 1.3 m wide either side of a 35 cm mullion.
      const centres = pairs(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length)).filter((c) => c - 1.475 > 0.1 && c + 1.475 < chain.length - 0.1).sort((p, q) => p - q);
      const columns = [0, ...centres.flatMap((c) => [c - 1.475, c - 0.175, c + 0.175, c + 1.475]), chain.length];
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, window = bay <= 4 * centres.length && (bay % 4 === 2 || bay % 4 === 0);
        if (row.kind === "band") return plain ? terracotta : band;
        if (row.kind === "glass" && window) return paneColor(row.floor, bay, seed * 8 + index);
        return row.kind === "granite" || row.lo < h.granite ? granite : terracotta;
      }, terracotta);
    });
  };
  // Bays 5.3 m apart centred on each wall, as the drawing's five on Michigan.
  const bays = (length: number) => { const count = Math.max(1, Math.round(length / 5.3)); return Array.from({ length: count }, (_, k) => length * (k + 0.5) / count); };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // The south wall, shared with the taller MacLean Center, stays blank.
  skin(0, (run) => !facing(0, 1)(run), bays);
  skin(1, facing(0, 1), () => [], true);

  // The gable's small arched windows, dark panels 1 m wide standing 3 cm proud of it, 5 mm
  // clear, their heads stepped to the middle half for the arch's last 30 cm as drawn and set
  // 5 mm back so that no face lies in the panel's: three pairs 2.3 m apart in the lower row,
  // one pair in the middle above.
  const window = (b: number, lo: number, hi: number) => {
    kit.prism(attic, planOf(rect(0.02, 0.045, b - 0.5, b + 0.5)), [lo, hi - drawn(0.3)]);
    kit.prism(attic, planOf(rect(0.025, 0.045, b - 0.25, b + 0.25)), [hi - drawn(0.3), hi]);
  };
  for (const c of [middle - 5.6, middle, middle + 5.6]) for (const d of [-1.15, 1.15]) window(c + d, drawn(58.3), drawn(60.1));
  for (const d of [-1.15, 1.15]) window(middle + d, drawn(61.75), drawn(63.4));

  const model = kit.finish({ height: h.ridge, outlines: [shell, attic], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/monroe-reference.md" };
  return model;
}
