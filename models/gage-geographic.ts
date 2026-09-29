import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Gage Building, 18 South Michigan Avenue (Holabird & Roche, with a front by Louis
// Sullivan, 1899; four storeys added in 1902): the geographic layout's model, on the mapped
// outline 124865450. The original layout has no model of it; the drawing shows its Michigan
// front and, above its lower neighbours at 24 and 30 South Michigan, its south wall, between
// the University Club and Willoughby Tower.
//
// A terracotta front of three bays between tall piers rises twelve storeys, a wide window of
// several lights to each bay and floor, to a parapet with cartouches over the inner piers.
// The south wall is common brick, windowed near the front and on two floors. The parapet is
// the City's 154 ft, the published height nearest the drawing's reading. The drawn parapet
// reads 54.2 m, so heights read on the drawing are scaled to meet it; see
// docs/gage-reference.md. Units are meters; +x is east, +z is south.
const drawn = (height: number) => height * 46.94 / 54.2;
export const gageLevels = Object.freeze({
  shopfront: 4, // the ground floor's shop windows, under a sign band
  second: 5.2, // the second floor
  eighth: drawn(33.47), // the eighth floor, the lowest the drawing shows
  pitch: drawn(3.715), // each floor from the eighth up, as drawn
  top: 46.94, // the parapet, the City's 154 ft
  cartouches: 47.74, // the cartouches over the inner piers
});
const h = gageLevels;
// Each floor's level: the ground floor, six floors of 3.97 m to the eighth, which the hill
// hides, and the drawn floors above it.
const floor = (n: number) => (n < 2 ? 0 : n <= 8 ? h.second + (n - 2) * (h.eighth - h.second) / 6 : h.eighth + (n - 8) * h.pitch);

// The skins' colours: the window tones, and the terracotta and the brick, which no window
// shares.
export const gagePalette = Object.freeze({ glass: [0x262626, 0x2a2a2a, 0x2e2e2e, 0x323232], lit: 0x6e6e6e, dim: 0x3a3a3a, terracotta: 0x5e5e5e, band: 0x484848, brick: 0x404040 });
const palette = gagePalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const terracotta = color(palette.terracotta), band = color(palette.band), brick = color(palette.brick);
const core = color(0x262626), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 43, 0x9e3779b1) ^ Math.imul(bay + 67, 0x85ebca77) ^ Math.imul(wall + 53, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends: the ground
// floor's shopfronts under a sign band; each floor's spandrel and window, their sills and
// heights as drawn; and the parapet over the twelfth.
type Row = { lo: number; hi: number; kind: "wall" | "glass" | "band"; floor: number };
const rows: Row[] = [
  { lo: 0.25, hi: 0.9, kind: "wall", floor: 1 },
  { lo: 0.9, hi: h.shopfront, kind: "glass", floor: 1 },
  { lo: h.shopfront, hi: h.second, kind: "band", floor: 1 },
];
for (let n = 2; n <= 12; n += 1) {
  rows.push({ lo: rows.at(-1)!.hi, hi: floor(n) + drawn(0.86), kind: "wall", floor: n });
  rows.push({ lo: floor(n) + drawn(0.86), hi: floor(n) + drawn(3.29), kind: "glass", floor: n });
}
rows.push({ lo: rows.at(-1)!.hi, hi: h.top, kind: "wall", floor: 13 });

export function createGageGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Gage Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Gage Building · terracotta and windows", kit.material(0xffffff, { vertexColors: true }));
  const cartouches = kit.batch("Gage Building · cartouches", kit.material(0x6a6a6a));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west along 24 South Michigan
  // and its Michigan front north to the Chicago Athletic Association.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const southWest = lot.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(southWest), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  // The inverse of `at`: a point's distances along the south wall and the Michigan front,
  // which meet a little off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.top, true, roofing);
  // The cartouches that end the inner piers, rising clear of the parapet: two blocks on the
  // roof, 5 cm inside the front's plane.
  for (const b of [5.6, 11.3]) kit.prism(cartouches, planOf(rect(0.05, 0.85, b + 0.05, b + 1.15)), [h.top, h.cartouches]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it, from
  // its start to its end, and says whether a column holds windows and on which floors.
  type Column = { face: THREE.Color; floors: (n: number) => boolean };
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => Column]) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, column] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, { face, floors } = column(bay);
        if (row.kind === "band") return face === brick ? brick : band;
        return row.kind === "glass" && floors(row.floor) ? paneColor(row.floor, bay, seed * 8 + index) : face;
      }, face(seed));
    });
  };
  const face = (seed: number) => (seed === 0 ? terracotta : brick);
  // A position along a wall from its start, given in lot coordinates across it.
  const along = (length: number, start: Vec2, end: Vec2, axis: 0 | 1) => {
    const [p, q] = [inLot(start)[axis], inLot(end)[axis]];
    return [(target: number) => length * (target - p) / (q - p), (s: number) => p + (s / length) * (q - p)] as const;
  };
  // Windows spanning `spans`, in lot coordinates along `axis`, glazed on the floors `floors`
  // gives; a window's lights are split by its mullions at `mullions`.
  const windows = (length: number, start: Vec2, end: Vec2, axis: 0 | 1, spans: [number, number][], floors: (at: number) => (n: number) => boolean, face: THREE.Color, mullions: number[] = []): [number[], (bay: number) => Column] => {
    const [to, from] = along(length, start, end, axis);
    const inside = spans.map(([a, b]) => [to(a), to(b)].sort((p, q) => p - q) as [number, number]).filter(([a, b]) => a > 0.1 && b < length - 0.1);
    const cuts = [...inside.flat(), ...mullions.map(to).flatMap((s) => [s - 0.06, s + 0.06])].filter((s) => s > 0.1 && s < length - 0.1);
    const columns = [0, ...[...new Set(cuts)].sort((p, q) => p - q), length];
    // Bays count from one, each between two columns; a bay holds a window when its middle
    // lies inside one and off its mullions.
    return [columns, (bay) => {
      const middle = (columns[bay - 1]! + columns[bay]!) / 2;
      const glazed = inside.some(([a, b]) => middle > a && middle < b) && !mullions.map(to).some((s) => Math.abs(middle - s) < 0.06);
      return { face, floors: glazed ? floors(from(middle)) : () => false };
    }];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  const [isMichigan, isSouth] = [facing(1, 0), facing(0, 1)];
  // The Michigan front, measured on the drawing from the south corner: corner piers 2 m wide,
  // inner piers 1.15 and 1.2 m; the south and north bays' windows 3.6 m wide in four lights,
  // the middle one's 4.55 m in five.
  const bays: [number, number][] = [[2, 5.6], [6.75, 11.3], [12.5, 16.1]];
  const lights = [2.9, 3.8, 4.7, 7.66, 8.57, 9.48, 10.39, 13.4, 14.3, 15.2];
  const michigan = (length: number, start: Vec2, end: Vec2) => windows(length, start, end, 1, bays, () => () => true, terracotta, lights);
  // The south wall, measured on the drawing west from the front: a window 6 to 9.5 m in on
  // the top four floors, and three more between 15.3 and 28.4 m on the ninth and twelfth, as
  // drawn. The University Club hides the rest.
  const southWall = (length: number, start: Vec2, end: Vec2) => windows(length, start, end, 0, [[6, 9.5], [15.3, 18.8], [20.3, 23.8], [24.8, 28.4]],
    (a) => (a < 10 ? (n) => n >= 9 : (n) => n === 9 || n === 12), brick);
  // The alley: windows 1.6 m wide spread evenly about 3.2 m apart on every floor above the
  // ground floor. The north wall, shared with the Chicago Athletic Association, stays plain.
  const alley = (length: number, start: Vec2, end: Vec2) => {
    const [, from] = along(length, start, end, 1), count = Math.max(1, Math.round(length / 3.2));
    const spans = Array.from({ length: count }, (_, i) => { const c = from(length * (i + 0.5) / count); return [c - 0.8, c + 0.8] as [number, number]; });
    return windows(length, start, end, 1, spans, () => (n) => n >= 2, brick);
  };
  skin(0, isMichigan, michigan);
  skin(1, isSouth, southWall);
  skin(2, facing(-1, 0), alley);
  skin(3, facing(0, -1), (length) => [[0, length], () => ({ face: brick, floors: () => false })]);

  const model = kit.finish({ height: h.cartouches, outlines: [shell, cartouches], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/gage-reference.md" };
  return model;
}
