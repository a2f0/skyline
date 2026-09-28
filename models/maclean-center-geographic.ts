import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The MacLean Center, 112 South Michigan Avenue, built as the Illinois Athletic Club
// (Barnett, Haynes & Barnett, 1908) and raised six floors by Swann & Weiskopf in 1985: the
// geographic layout's model, on the mapped outline 145498712. The original layout has no
// model of it; the drawing shows it between the Lake View and Monroe Buildings.
//
// A narrow Michigan front, a narrow window and three wide ones to a floor and another
// narrow one, rises twelve storeys to the old club's projecting cornice and a frieze of round
// windows; the addition carries six more floors, arched on the top one, to a pierced
// parapet. No height is published: the parapet's top is read on the drawing, lowered by the
// University Club's reading nearby; see docs/maclean-center-reference.md. Units are
// meters; +x is east, +z is south.
export const macleanLevels = Object.freeze({
  band: 40.3, // the old club's bands under its cornice
  cornice: 43.2, // the projecting cornice
  frieze: 45, // the frieze of round windows
  addition: 47.9, // the 1985 floors, over the frieze
  openings: 70.3, // the parapet's openings
  parapet: 72, // its top band
  top: 73.2, // the parapet's top, read on the drawing
});
const h = macleanLevels;

// The skins' colours: the window tones, and the stone, bands and the parapet's shadowed
// openings, which no window shares.
export const macleanPalette = Object.freeze({ glass: [0x2c2c2c, 0x303030, 0x343434, 0x383838], lit: 0x6e6e6e, dim: 0x3c3c3c, stone: 0x7e7e7e, band: 0x8e8e8e, shadow: 0x242424 });
const palette = macleanPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const stone = color(palette.stone), band = color(palette.band), shadow = color(palette.shadow);
const core = color(0x262626), roofing = color(0x3c3c3c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 53, 0x9e3779b1) ^ Math.imul(bay + 79, 0x85ebca77) ^ Math.imul(wall + 67, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the walls, from 25 cm above grade, where the mapped outline ends: the ground
// floor's shopfronts; the old club's floors, 3.2 m apart, to its bands and cornice; the
// frieze and its round windows; the addition's six floors, the last with arched heads
// narrowing to the middle for their last 60 cm; and the parapet's openings under its top.
type Row = { lo: number; hi: number; kind: "wall" | "glass" | "band" | "oculus" | "head" | "opening"; floor: number };
const rows: Row[] = [
  { lo: 0.25, hi: 1, kind: "wall", floor: 1 },
  { lo: 1, hi: 3.9, kind: "glass", floor: 1 },
];
for (let n = 2; n <= 12; n += 1) {
  const base = 4.5 + (n - 2) * 3.2;
  rows.push({ lo: rows.at(-1)!.hi, hi: base + 0.6, kind: "wall", floor: n });
  rows.push({ lo: base + 0.6, hi: base + 3.1, kind: "glass", floor: n });
}
rows.push({ lo: rows.at(-1)!.hi, hi: h.band, kind: "wall", floor: 12 });
rows.push({ lo: h.band, hi: h.frieze, kind: "band", floor: 12 });
rows.push({ lo: h.frieze, hi: 45.9, kind: "wall", floor: 12 });
rows.push({ lo: 45.9, hi: 46.8, kind: "oculus", floor: 12 });
rows.push({ lo: 46.8, hi: h.addition, kind: "wall", floor: 12 });
for (const [floor, lo, hi] of [[13, 48.46, 50.88], [14, 51.57, 54.12], [15, 55.38, 57.94], [16, 59.07, 61.61], [17, 62.77, 65.32], [18, 66.1, 67.63]] as const) {
  rows.push({ lo: rows.at(-1)!.hi, hi: lo, kind: "wall", floor });
  rows.push({ lo, hi, kind: "glass", floor });
}
rows.push({ lo: 67.63, hi: 68.23, kind: "head", floor: 18 });
rows.push({ lo: 68.23, hi: h.openings, kind: "wall", floor: 18 });
rows.push({ lo: h.openings, hi: h.parapet, kind: "opening", floor: 18 });
rows.push({ lo: h.parapet, hi: h.top, kind: "wall", floor: 18 });

export function createMacleanCenterGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("MacLean Center · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("MacLean Center · stone and windows", kit.material(0xffffff, { vertexColors: true }));
  const cornice = kit.batch("MacLean Center · cornice", kit.material(0x8a8a8a));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west and its Michigan front
  // north to the Monroe Building.
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
  // The old club's cornice projects 60 cm along the Michigan front, 3 cm short of the
  // neighbours' walls, past the skin's ends 2 cm in, and 5 cm into its own.
  kit.prism(cornice, planOf(rect(-0.6, 0.05, 0.03, front - 0.03)), [h.cornice, h.frieze]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it and
  // says what each crosses: 0 the wall, 1 a window, 2 a window and its arched head, 3 a
  // window, its head and the round window over it. A `plain` wall carries no bands.
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => number], plain = false) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, crossing] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, into = crossing(bay);
        if (row.kind === "band") return plain ? stone : band;
        if (row.kind === "opening") return into >= 1 ? shadow : stone;
        const glazed = row.kind === "glass" ? into >= 1 : row.kind === "head" ? into >= 2 : row.kind === "oculus" ? into >= 3 : false;
        return glazed ? paneColor(row.floor, bay, seed * 8 + index) : stone;
      }, stone);
    });
  };
  // The Michigan front: narrow windows 1.8 m wide 8.4 m either side of the middle, and wide
  // ones 3.2 m wide at the middle and 4.35 m either side, as drawn. Only the wide ones have
  // arched heads on the top floor, narrowing to their middle half, and round windows 90 cm
  // wide over them in the frieze.
  const michigan = (length: number, start: Vec2, end: Vec2): [number[], (bay: number) => number] => {
    const [b0, b1] = [inLot(start)[1], inLot(end)[1]], along = (b: number) => length * (b - b0) / (b1 - b0), middle = front / 2;
    const windows = ([[-8.4, 0.9], [-4.35, 1.6], [0, 1.6], [4.35, 1.6], [8.4, 0.9]] as const).map(([d, half]) => ({ c: along(middle + d), half, wide: half > 1 }));
    const cuts = windows.flatMap(({ c, half, wide }) => (wide ? [c - half, c - half / 2, c - 0.45, c + 0.45, c + half / 2, c + half] : [c - half, c + half]));
    const columns = [0, ...[...new Set(cuts)].sort((p, q) => p - q), length];
    return [columns, (bay) => {
      const middleOf = (columns[bay - 1]! + columns[bay]!) / 2, window = windows.find(({ c, half }) => Math.abs(middleOf - c) < half);
      if (!window) return 0;
      const off = Math.abs(middleOf - window.c);
      return !window.wide ? 1 : off < 0.45 ? 3 : off < window.half / 2 ? 2 : 1;
    }];
  };
  // The alley's windows, 1.6 m wide every 3.2 m.
  const alley = (length: number): [number[], (bay: number) => number] => {
    const count = Math.max(1, Math.round(length / 3.2)), centres = Array.from({ length: count }, (_, k) => length * (k + 0.5) / count);
    return [[0, ...centres.flatMap((c) => [c - 0.8, c + 0.8]), length], (bay) => (bay % 2 === 0 && bay <= 2 * count ? 1 : 0)];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // The bands run only along Michigan; the side walls are shared with the Lake View and
  // Monroe Buildings and stay plain.
  skin(0, facing(1, 0), michigan);
  skin(1, facing(-1, 0), alley, true);
  skin(2, (run) => !facing(1, 0)(run) && !facing(-1, 0)(run), (length) => [[0, length], () => 0], true);

  const model = kit.finish({ height: h.top, outlines: [shell, cornice], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/maclean-center-reference.md" };
  return model;
}
