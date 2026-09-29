import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Peoples Gas Building, 122 South Michigan Avenue (D. H. Burnham & Co., 1911): the
// geographic layout's model, on the mapped outline 145498710 and its parts. The original
// layout has no model of it; the drawing shows it between the Lake View Building and Adams
// Street, with the Borg-Warner Building before its Adams front.
//
// Twenty storeys rise on the Michigan and Adams fronts between wide corner piers:
// - two behind granite columns;
// - fourteen of paired windows, eleven bays to Michigan and nine to Adams;
// - three behind a colonnade under an entablature;
// - an attic under a frieze of pendant arches, a projecting cornice and its cresting.
// A light court opens over the ground storey and widens over the seventeenth floor. The top
// is the City's 272 ft. The drawn cresting reads 86 m, so heights read on the drawing are
// scaled to meet it; see docs/peoples-gas-reference.md. Units are meters; +x is east, +z is
// south.
const drawn = (height: number) => height * 82.9 / 86;
export const peoplesGasLevels = Object.freeze({
  court: drawn(7.2), // the light court's floor, over the ground storey
  inner: drawn(66.3), // the court's inner wings' roof, at the seventeenth floor
  colonnade: drawn(67.47), // the colonnade's foot
  entablature: drawn(76.8), // the colonnade's entablature
  frieze: drawn(82.1), // the frieze under the cornice
  cornice: drawn(84.3), // the projecting cornice
  roof: drawn(84.8), // the cornice's top and the roof
  top: 82.9, // the cresting's top, the published height
});
const h = peoplesGasLevels;

// The skins' colours: the window tones, and the terracotta, granite, bands, the frieze's
// shadow and the court's white brick, which no window shares.
export const peoplesGasPalette = Object.freeze({ glass: [0x2c2c2c, 0x303030, 0x343434, 0x383838], lit: 0x6e6e6e, dim: 0x3c3c3c, stone: 0x7c7c7c, granite: 0x5a5a5a, band: 0x8e8e8e, shadow: 0x242424, court: 0x9c9c9c });
const palette = peoplesGasPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const stone = color(palette.stone), granite = color(palette.granite), band = color(palette.band), shadow = color(palette.shadow), courtBrick = color(palette.court);
const core = color(0x262626), party = color(0x646464), roofing = color(0x3c3c3c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 61, 0x9e3779b1) ^ Math.imul(bay + 89, 0x85ebca77) ^ Math.imul(wall + 73, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the walls, from 25 cm above grade, where the mapped outline ends, read on the
// drawing and scaled:
// - the two granite storeys' glass between the columns, and a belt over them;
// - fourteen floors 3.79 m apart as drawn, each window 2.24 m tall;
// - the colonnade's rail and openings, cut where the corner piers' windows stand;
// - the entablature, the attic's windows, the frieze's pendants and the frieze;
// - over the cornice's foot, the court walls' last row to the roof.
// A `pier` row shows the corner piers' windows; `reach` is a pendant's half-width.
type Kind = "granite" | "shop" | "belt" | "wall" | "glass" | "rail" | "open" | "band" | "attic" | "pendant" | "frieze" | "parapet";
type Row = { lo: number; hi: number; kind: Kind; floor: number; pier?: boolean; reach?: number };
const rows: Row[] = [{ lo: 0.25, hi: drawn(0.6), kind: "granite", floor: 1 }];
const push = (hi: number, kind: Kind, floor: number, more: { pier?: boolean; reach?: number } = {}) => rows.push({ lo: rows.at(-1)!.hi, hi: drawn(hi), kind, floor, ...more });
push(6.2, "shop", 1);
push(7.2, "granite", 2);
push(11.6, "shop", 2);
push(12.4, "granite", 2);
push(13.3, "belt", 2);
const sill = (n: number) => 63.36 - (16 - n) * 3.79;
for (let n = 3; n <= 16; n += 1) {
  push(sill(n), "wall", n);
  push(sill(n) + 2.24, "glass", n, { pier: true });
}
push(66.3, "wall", 16);
push(67.47, "wall", 17);
push(69.7, "rail", 17, { pier: true });
push(69.9, "rail", 17);
push(70.9, "open", 18);
push(73.2, "open", 18, { pier: true });
push(74.56, "open", 19);
push(76.8, "open", 19, { pier: true });
push(78.3, "band", 19);
push(78.9, "wall", 20);
push(81, "attic", 20);
push(81.3, "attic", 20, { reach: 0.45 });
push(81.55, "pendant", 20, { reach: 0.45 });
push(82.1, "pendant", 20, { reach: 0.9 });
push(84.3, "frieze", 20);
push(84.8, "parapet", 20);

export function createPeoplesGasGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Peoples Gas Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Peoples Gas Building · terracotta and windows", kit.material(0xffffff, { vertexColors: true }));
  const cornice = kit.batch("Peoples Gas Building · cornice", kit.material(0x8e8e8e));
  const corners = (coordinates: [number, number][]) => orient(polygonOf(projectPlan(coordinates)));
  const lot = corners(record.footprint.coordinates);
  // The mapped parts: the twenty-level ring, the north wing within it, the inner wings
  // rising to the seventeenth floor, the court, and the notch in the north wall that opens
  // it to the Lake View Building's light court.
  const part = (way: number) => corners(record.parts.find((p) => p.way === way)!.coordinates);
  const mapped = [1179833660, 1179833658, 1179833661, 1179833659, 1179842408].map(part);

  // The lot's south-east corner, on Michigan and Adams, with the Adams front running west to
  // the alley and the Michigan front north to the Lake View Building.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const southWest = lot.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(southWest), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  // The inverse of `at`: a point's distances along the Adams and Michigan fronts, which
  // meet a little off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const [adams, michigan] = [inLot(southWest)[0], inLot(northEast)[1]];

  // Corners and edges by value, since parts share the outline's nodes.
  const key = (p: Vec2) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  // Where a part's edge joins two of the outline's corners a few nodes apart, it follows
  // the outline between them, so that the roof meets the walls corner to corner: the ring
  // skips two of the Michigan front's nodes.
  const index = new Map(lot.map((p, i) => [key(p), i]));
  const follow = (polygon: Vec2[]) => polygon.flatMap((a, i) => {
    const [from, to] = [index.get(key(a)), index.get(key(polygon[(i + 1) % polygon.length]!))], n = lot.length;
    if (from === undefined || to === undefined) return [a];
    const [ahead, back] = [(to - from + n) % n, (from - to + n) % n];
    const step = ahead > 1 && ahead <= 3 ? 1 : back > 1 && back <= 3 ? -1 : 0, between = step === 1 ? ahead - 1 : step === -1 ? back - 1 : 0;
    return [a, ...Array.from({ length: between }, (_, k) => lot[(from + step * (k + 1) + n) % n]!)];
  });
  // And a part takes every other part's corner within 2 cm of one of its edges: the ring's
  // edge along the court passes 1.1 cm from the court's corner.
  const conform = (polygon: Vec2[], others: Vec2[][]) => polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const on = others.flat().map((p) => ({ p, t: ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / length ** 2 }))
      .filter(({ p, t }) => t > 1e-6 && t < 1 - 1e-6 && Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / length < 0.02);
    return [a, ...[...new Map(on.map((x) => [key(x.p), x])).values()].sort((x, y) => x.t - y.t).map((x) => x.p)];
  });
  const followed = mapped.map(follow);
  const [ring, northWing, innerWings, court, notch] = followed.map((polygon) => conform(polygon, followed.filter((other) => other !== polygon))) as [Vec2[], Vec2[], Vec2[], Vec2[], Vec2[]];
  const edges = (polygon: Vec2[]) => new Set(polygon.flatMap((a, i) => { const b = polygon[(i + 1) % polygon.length]!; return [`${key(a)}|${key(b)}`, `${key(b)}|${key(a)}`]; }));
  const has = (set: Set<string>, run: Run) => set.has(`${key(run.at(0))}|${key(run.at(run.length))}`);
  // Two outlines sharing a run of edges, as one: the edges neither shares, end to end.
  const merge = (p: Vec2[], q: Vec2[]): Vec2[] => {
    const [ep, eq] = [edges(p), edges(q)];
    const kept = [...p.map((a, i) => [a, p[(i + 1) % p.length]!] as const).filter(([a, b]) => !eq.has(`${key(a)}|${key(b)}`)),
      ...q.map((a, i) => [a, q[(i + 1) % q.length]!] as const).filter(([a, b]) => !ep.has(`${key(a)}|${key(b)}`))];
    const next = new Map(kept.map(([a, b]) => [key(a), b]));
    const out: Vec2[] = [kept[0]![0]];
    for (let p1 = kept[0]![1]; key(p1) !== key(out[0]!); p1 = next.get(key(p1))!) out.push(p1);
    return orient(out);
  };
  // The court's walls face into it, so their outlines run the other way.
  const inward = (polygon: Vec2[]) => [...polygon].reverse();
  const [lower, upper, opening] = [inward(court), inward(merge(court, innerWings)), inward(notch)];
  const [lotEdges, wingEdges, lowerEdges] = [edges(lot), edges(innerWings), edges(court)];

  const face = (run: Run, lo: number, hi: number, paint: THREE.Color) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], paint);
  };
  // The outer walls to the roof, the north wall, above the Lake View Building, in common
  // brick, and open over the court's floor at the notch. Walls split where the ones they
  // meet end, at the court's floor and the inner wings' roof, so every edge is shared.
  const notchEdges = edges(notch);
  planOf(lot).forEach((run) => {
    const paint = run.normal(0)[1] < -0.9 ? party : core;
    face(run, 0, h.court, paint);
    if (!has(notchEdges, run)) face(run, h.court, h.roof, paint);
  });
  // The court's walls: the inner wings' to their roof, the rest to the roof, and over the
  // inner wings the widened court's; the notch's but its open side.
  planOf(lower).forEach((run) => {
    face(run, h.court, h.inner, courtBrick);
    if (!has(wingEdges, run)) face(run, h.inner, h.roof, courtBrick);
  });
  planOf(upper).forEach((run) => { if (!has(lowerEdges, run)) face(run, h.inner, h.roof, courtBrick); });
  planOf(opening).forEach((run) => { if (!has(lotEdges, run)) face(run, h.court, h.roof, courtBrick); });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  for (const roof of [ring, northWing]) paintedSlab(kit, shell, roof, h.roof, true, roofing);
  paintedSlab(kit, shell, innerWings, h.inner, true, roofing);
  for (const floor of [court, notch]) paintedSlab(kit, shell, floor, h.court, true, roofing);

  // The cornice projects 90 cm along both fronts, to 2 cm over the roof, stopping 3 cm
  // short of the north and alley walls. It starts 8 cm inside the lines between the fronts'
  // corners, which the mapped walls stand at most 2 cm inside and 12.4 cm outside, so it
  // always meets them. Its cresting: blocks 50 cm wide and 1 m apart near its edge.
  const [out, lip] = [0.9, 0.02];
  kit.prism(cornice, planOf(orient([at(-out, michigan - 0.03), at(-out, -out), at(adams - 0.03, -out), at(adams - 0.03, 0.08), at(0.08, 0.08), at(0.08, michigan - 0.03)])), [h.cornice, h.roof + lip]);
  const [east, south]: [Vec2, Vec2] = [[-north[1], north[0]], [west[1], -west[0]]];
  for (let b = 0.5; b < michigan - 0.5; b += 1) kit.box(cornice, at(-0.7, b), east, 0.25, -0.15, 0.15, h.roof + lip, h.top);
  for (let a = 0.5; a < adams - 0.5; a += 1) kit.box(cornice, at(a, -0.7), south, 0.25, -0.15, 0.15, h.roof + lip, h.top);

  // A wall's skin over the rows from `from` to `to`, one box to a chain the `keep` test
  // accepts, held 2 cm clear of its ends or 9 cm where the outline turns in. `openings` lays
  // a wall's columns out across it and says what a cell shows, by its middle and row.
  type Cell = "wall" | "granite" | "band" | "glass" | "shadow";
  const skin = (plan: Plan, keep: (run: Run) => boolean, from: number, to: number, seed: number, openings: (length: number) => [number[], (mid: number, row: Row) => Cell], plain: THREE.Color) => {
    const span = rows.filter((row) => row.lo >= from - 1e-9 && row.hi <= to + 1e-9), heights = [span[0]!.lo, ...span.map((row) => row.hi)];
    const paints: Record<Exclude<Cell, "glass">, THREE.Color> = { wall: plain, granite, band, shadow };
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, cell] = openings(chain.length);
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = span[r]!, shows = cell((columns[bay - 1]! + columns[bay]!) / 2, row);
        return shows === "glass" ? paneColor(row.floor, bay, seed * 8 + index) : paints[shows];
      }, plain);
    });
  };
  const near = (list: number[], x: number) => Math.min(...list.map((c) => Math.abs(x - c)));
  const columnsOf = (length: number, cuts: number[]) => [0, ...[...new Set(cuts.map((c) => Math.round(c * 1e4) / 1e4))].sort((p, q) => p - q), length];
  // A street front: corner piers 6 m to the first column's middle, each with a window 1.7 m
  // wide 2.6 m from its corner; `count` bays between, each column 1.6 m wide. A bay holds a
  // pair of windows 1.2 m wide either side of a 38 cm mullion, the colonnade's opening, and
  // an attic window 1.7 m wide; a pendant hangs over each column.
  const front = (count: number) => (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const pitch = (length - 12) / count, lines = Array.from({ length: count + 1 }, (_, k) => 6 + k * pitch);
    const centres = lines.slice(1).map((line) => line - pitch / 2), piers = [2.6, length - 2.6];
    const cuts = [...lines.flatMap((c) => [-0.9, -0.8, -0.45, 0.45, 0.8, 0.9].map((d) => c + d)), ...centres.flatMap((c) => [-1.39, -0.85, -0.19, 0.19, 0.85, 1.39].map((d) => c + d)), ...piers.flatMap((c) => [c - 0.85, c + 0.85])];
    return [columnsOf(length, cuts), (mid, row) => {
      const inside = mid > lines[0]! && mid < lines.at(-1)!, line = near(lines, mid), centre = near(centres, mid);
      const pierWindow = near(piers, mid) < 0.85;
      switch (row.kind) {
        case "granite": return "granite";
        case "shop": return inside && line > 0.8 ? "glass" : "granite";
        case "belt": case "band": return "band";
        case "glass": return (inside && centre > 0.19 && centre < 1.39) || pierWindow ? "glass" : "wall";
        case "rail": return row.pier && pierWindow ? "glass" : inside && line > 0.8 ? "band" : "wall";
        case "open": return (row.pier && pierWindow) || (inside && line > 0.8) ? "glass" : "wall";
        case "attic": return row.reach !== undefined && line < row.reach ? "shadow" : (inside && centre < 0.85) || pierWindow ? "glass" : "wall";
        case "pendant": return line < row.reach! ? "shadow" : "wall";
        case "frieze": return "shadow";
        default: return "wall";
      }
    }];
  };
  // The alley's and the court's windows, which the drawing does not show: 1.6 m wide, spread
  // evenly about 3.2 m apart, one to each floor from the third.
  const spread = (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const count = Math.max(1, Math.round(length / 3.2)), centres = Array.from({ length: count }, (_, k) => length * (k + 0.5) / count);
    return [columnsOf(length, centres.flatMap((c) => [c - 0.8, c + 0.8])), (mid, row) => ((row.kind === "glass" || row.kind === "attic" || row.pier === true) && near(centres, mid) < 0.8 ? "glass" : "wall")];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // The fronts to the cornice, the alley to the roof; the north wall, shared with the Lake
  // View Building, stays plain.
  skin(planOf(lot), facing(1, 0), rows[0]!.lo, h.cornice, 0, front(11), stone);
  skin(planOf(lot), facing(0, 1), rows[0]!.lo, h.cornice, 1, front(9), stone);
  skin(planOf(lot), facing(-1, 0), rows[0]!.lo, h.roof, 2, spread, stone);
  skin(planOf(lower), () => true, h.court, h.inner, 3, spread, courtBrick);
  skin(planOf(upper), () => true, h.inner, h.roof, 4, spread, courtBrick);
  skin(planOf(opening), (run) => !has(lotEdges, run), h.court, h.roof, 5, spread, courtBrick);

  const model = kit.finish({ height: h.top, outlines: [shell, cornice], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/peoples-gas-reference.md" };
  return model;
}
