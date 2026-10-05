import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// 180 North Michigan Avenue, the Harvester Building (1927): the geographic layout's model,
// on the mapped outline 210671714. The original layout has no model of it; the drawing
// shows its south wall behind Millennium Park Plaza, which hides its Michigan front.
//
// A brown masonry block of twenty-four storeys over the whole mapped lot, on a ground floor
// as tall as three of its floors, with string courses over the seventeenth and twentieth floors and a top floor of
// arched windows under a band and a parapet at 86.3 m. No height is published; the parapet
// is read on the drawing, whose nearby tops fall within about a metre of their published
// heights, and the storeys are Marc Realty's. See docs/north-michigan-180-reference.md.
// Units are meters; +x is east, +z is south.
export const northMichigan180Levels = Object.freeze({
  base: 9.85, // the tall ground floor, under the second
  top: 86.3, // the parapet, read on the drawing
});
const h = northMichigan180Levels;
// Each floor's level: the tall ground floor, then 3.25 m floors, the twenty-fourth
// the last.
const floor = (n: number) => (n < 2 ? 0 : h.base + (n - 2) * 3.25);

// The skins' colours: the window tones, and the masonry and its courses, which no window
// shares.
export const northMichigan180Palette = Object.freeze({ glass: [0x585858, 0x5c5c5c, 0x606060, 0x646464], lit: 0x9a9a9a, dim: 0x525252, masonry: 0x7a7a7a, course: 0x888888 });
const palette = northMichigan180Palette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const masonry = color(palette.masonry), course = color(palette.course), core = color(0x303030), roofing = color(0x505050);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 41, 0x9e3779b1) ^ Math.imul(bay + 67, 0x85ebca77) ^ Math.imul(wall + 53, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends: the ground
// floor's tall windows; each floor's spandrel and window, the spandrels over the seventeenth and
// twentieth floors carrying string courses; and the top floor's arched windows, their
// heads narrowing to the middle half for the last 60 cm, between a band and the parapet.
type Row = { lo: number; hi: number; kind: "wall" | "course" | "glass" | "head"; floor: number };
const rows: Row[] = [
  { lo: 0.25, hi: 1, kind: "wall", floor: 1 },
  { lo: 1, hi: 8.6, kind: "glass", floor: 1 },
];
for (let n = 2; n <= 23; n += 1) {
  rows.push({ lo: rows.at(-1)!.hi, hi: floor(n) + 0.6, kind: n === 18 || n === 21 ? "course" : "wall", floor: n });
  rows.push({ lo: floor(n) + 0.6, hi: floor(n) + 2.65, kind: "glass", floor: n });
}
rows.push({ lo: rows.at(-1)!.hi, hi: 81.75, kind: "wall", floor: 24 });
rows.push({ lo: 81.75, hi: 82.3, kind: "course", floor: 24 });
rows.push({ lo: 82.3, hi: 85.4, kind: "glass", floor: 24 });
rows.push({ lo: 85.4, hi: 86, kind: "head", floor: 24 });
rows.push({ lo: 86, hi: h.top, kind: "wall", floor: 24 });

export function createNorthMichigan180GeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("180 North Michigan · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("180 North Michigan · masonry and windows", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west and its Michigan front
  // north to Lake Street.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(neighbours[0]![0] < neighbours[1]![0] ? neighbours[0]! : neighbours[1]!), north = unit(northEast);
  // A point's distances along the south wall and the Michigan front, which meet a little off
  // square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.top, true, roofing);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it and
  // says which hold a window's side or middle; a head is glazed only in the middle.
  type Opening = "wall" | "side" | "middle";
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => Opening]) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, opening] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, open = opening(bay);
        if (row.kind === "course") return course;
        const glazed = row.kind === "glass" ? open !== "wall" : row.kind === "head" && open === "middle";
        return glazed ? paneColor(row.floor, bay, seed * 8 + index) : masonry;
      }, masonry);
    });
  };
  // Windows 1.4 m wide centred at `centres`, positions along a wall from its start; each
  // splits into sides and a middle half for the top floor's arched heads.
  const windows = (length: number, centres: number[]): [number[], (bay: number) => Opening] => {
    const inside = centres.filter((c) => c - 0.7 > 0.1 && c + 0.7 < length - 0.1).sort((p, q) => p - q);
    const columns = [0, ...inside.flatMap((c) => [c - 0.7, c - 0.35, c + 0.35, c + 0.7]), length];
    // Bays count from one: a pier, then side, middle, side for each window, then the last pier.
    return [columns, (bay) => { const k = (bay - 1) % 4; return bay > 4 * inside.length || k === 0 ? "wall" : k === 2 ? "middle" : "side"; }];
  };
  // The south wall's windows stand 2.7 m apart from 2.8 m west of Michigan, as the drawing
  // puts its visible five; the other walls carry the same spacing, centred on each.
  const south = (length: number, start: Vec2, end: Vec2) => {
    const [a0, a1] = [inLot(start)[0], inLot(end)[0]];
    return windows(length, Array.from({ length: 15 }, (_, k) => 2.8 + 2.7 * k).map((a) => length * (a - a0) / (a1 - a0)));
  };
  const spaced = (length: number) => { const count = Math.max(1, Math.round(length / 2.7)); return windows(length, Array.from({ length: count }, (_, k) => length * (k + 0.5) / count)); };
  const isSouth = (run: Run) => run.normal(0)[1] > 0.9;
  skin(0, isSouth, south);
  skin(1, (run) => !isSouth(run), spaced);

  const model = kit.finish({ height: h.top, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/north-michigan-180-reference.md" };
  return model;
}
