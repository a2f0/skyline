import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Lake View Building, 116 South Michigan Avenue (Jenney, Mundie & Jensen; its top five
// storeys added by them in 1912): the geographic layout's model, on the mapped outline
// 145498711. The original layout has no model of it; the drawing shows it between Peoples
// Gas and the MacLean Center.
//
// A narrow stone front, three windows to a floor, rises seventeen storeys: arched windows
// on the sixteenth, small attic windows on the seventeenth, and a cornice band at the top.
// No height is published: the top is read on the drawing, lowered by the University Club's
// reading to the north; see docs/lake-view-reference.md. Units are meters; +x is east, +z
// is south.
export const lakeViewLevels = Object.freeze({
  attic: 67.3, // the seventeenth floor's small windows
  cornice: 70.2, // the cornice band
  top: 71.3, // its top, read on the drawing
});
const h = lakeViewLevels;

// The skins' colours: the window tones, and the stone and its cornice, which no window
// shares.
export const lakeViewPalette = Object.freeze({ glass: [0x2c2c2c, 0x303030, 0x343434, 0x383838], lit: 0x6e6e6e, dim: 0x3c3c3c, stone: 0x767676, band: 0x888888 });
const palette = lakeViewPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const stone = color(palette.stone), band = color(palette.band), core = color(0x262626), roofing = color(0x3c3c3c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 59, 0x9e3779b1) ^ Math.imul(bay + 83, 0x85ebca77) ^ Math.imul(wall + 71, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the walls, from 25 cm above grade, where the mapped outline ends: the tall
// ground floor's shopfronts; floors 3.85 m apart, as drawn, each with a 2.5 m window; the
// sixteenth floor's arched windows, their heads narrowing to the middle half for the last
// 60 cm; the attic's small windows; and the cornice band.
type Row = { lo: number; hi: number; kind: "wall" | "glass" | "head" | "band"; floor: number };
const base = (n: number) => 36.5 + (n - 9) * 3.85;
const rows: Row[] = [
  { lo: 0.25, hi: 1, kind: "wall", floor: 1 },
  { lo: 1, hi: 8.4, kind: "glass", floor: 1 },
];
for (let n = 2; n <= 15; n += 1) {
  rows.push({ lo: rows.at(-1)!.hi, hi: base(n) + 0.6, kind: "wall", floor: n });
  rows.push({ lo: base(n) + 0.6, hi: base(n) + 3.1, kind: "glass", floor: n });
}
rows.push({ lo: rows.at(-1)!.hi, hi: 63.9, kind: "wall", floor: 16 });
rows.push({ lo: 63.9, hi: 65.3, kind: "glass", floor: 16 });
rows.push({ lo: 65.3, hi: 65.9, kind: "head", floor: 16 });
rows.push({ lo: 65.9, hi: 68, kind: "wall", floor: 17 });
rows.push({ lo: 68, hi: 69, kind: "glass", floor: 17 });
rows.push({ lo: 69, hi: h.cornice, kind: "wall", floor: 17 });
rows.push({ lo: h.cornice, hi: h.top, kind: "band", floor: 17 });

export function createLakeViewGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Lake View Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Lake View Building · stone and windows", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west and its Michigan front
  // north to the MacLean Center.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(neighbours[0]![0] < neighbours[1]![0] ? neighbours[0]! : neighbours[1]!), north = unit(northEast);
  // A point's distances along the south wall and the Michigan front, which meet a little
  // off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const front = inLot(northEast)[1];

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.top, true, roofing);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it and
  // says which cross a window's side (1) or its middle (2), which alone continues into an
  // arched head. Only a `banded` wall carries the cornice band.
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => number], banded = false) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, crossing] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, into = crossing(bay);
        if (row.kind === "band") return banded ? band : stone;
        return (row.kind === "glass" && into >= 1) || (row.kind === "head" && into >= 2) ? paneColor(row.floor, bay, seed * 8 + index) : stone;
      }, stone);
    });
  };
  // Windows `width` wide at `centres`, positions along a wall from its start, each split
  // into sides and a middle half.
  const windows = (length: number, centres: number[], width: number): [number[], (bay: number) => number] => {
    const inside = centres.filter((c) => c - width / 2 > 0.1 && c + width / 2 < length - 0.1).sort((p, q) => p - q);
    const columns = [0, ...inside.flatMap((c) => [c - width / 2, c - width / 4, c + width / 4, c + width / 2]), length];
    // Bays count from one: a pier, then side, middle, side for each window, then the last pier.
    return [columns, (bay) => { const k = (bay - 1) % 4; return bay > 4 * inside.length || k === 0 ? 0 : k === 2 ? 2 : 1; }];
  };
  // The Michigan front's three windows, 2.5 m wide and 3.5 m apart about its middle, as
  // drawn; the alley's, which the drawing does not show, 1.6 m wide and spread evenly about
  // 3 m apart.
  const michigan = (length: number, start: Vec2, end: Vec2) => {
    const [b0, b1] = [inLot(start)[1], inLot(end)[1]], along = (b: number) => length * (b - b0) / (b1 - b0);
    return windows(length, [-3.5, 0, 3.5].map((d) => along(front / 2 + d)), 2.5);
  };
  const alley = (length: number): [number[], (bay: number) => number] => {
    const count = Math.max(1, Math.round(length / 3.2)), [columns, crossing] = windows(length, Array.from({ length: count }, (_, k) => length * (k + 0.5) / count), 1.6);
    return [columns, (bay) => Math.min(1, crossing(bay))];
  };
  // The Michigan front and the alley by their facing and their place in the lot; the side
  // walls, shared with the taller MacLean Center and Peoples Gas, and the south light
  // court's walls stay plain. The cornice band runs only along Michigan.
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  const isMichigan = (run: Run) => facing(1, 0)(run) && inLot(run.at(run.length / 2))[0] < 1;
  const isAlley = (run: Run) => facing(-1, 0)(run) && inLot(run.at(run.length / 2))[0] > 40;
  skin(0, isMichigan, michigan, true);
  skin(1, isAlley, alley);
  skin(2, (run) => !isMichigan(run) && !isAlley(run), (length) => [[0, length], () => 0]);

  const model = kit.finish({ height: h.top, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/lake-view-reference.md" };
  return model;
}
