import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The University Club of Chicago, 76 East Monroe Street (Holabird & Roche, 1909): the
// geographic layout's model, on the mapped outline 126982632. The original layout has no
// model of it; the drawing shows it left of Willoughby Tower, behind the Monroe Building.
//
// A Gothic club on the corner of Michigan and Monroe. Its walls rise to a crenellated
// parapet, with the tall arched windows of its top hall in four bays to each street front.
// Behind the parapet an upper floor carries a steep roof whose gable faces Michigan, with
// pinnacles at its foot and a cross on its peak at OpenStreetMap's 67.7 m, and a small
// gable on the Monroe side. Heights are measured on the drawing down from that peak; see
// docs/university-club-reference.md. Units are meters; +x is east, +z is south.
export const universityClubLevels = Object.freeze({
  band: 46.2, // the band under the parapet
  parapet: 48.95, // the parapet wall
  walls: 51, // the parapet's top, between the merlons
  merlons: 51.75,
  eaves: 56.4, // the upper floor's eaves
  pinnacles: 62.5,
  ridge: 67.7, // the gable's peak, OpenStreetMap's height
  cross: 69.75,
  dormer: 60.4, // the Monroe side's small gable
  back: 3.3, // the upper floor's setback from Michigan
  sides: 1.3, // and from Monroe and the north wall
});
const h = universityClubLevels;

// The skins' colours: the window tones, and the stone and its band, which no window shares.
export const universityClubPalette = Object.freeze({ glass: [0x4a4a4a, 0x4e4e4e, 0x525252, 0x565656], lit: 0x8c8c8c, dim: 0x444444, stone: 0xa4a4a4, band: 0xb4b4b4 });
const palette = universityClubPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const stone = color(palette.stone), band = color(palette.band), core = color(0x2e2e2e), roofing = color(0x343434), flat = color(0x4a4a4a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 43, 0x9e3779b1) ^ Math.imul(bay + 71, 0x85ebca77) ^ Math.imul(wall + 59, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the main walls, from 25 cm above grade, where the mapped outline ends: the
// ground floor's tall windows; eight floors of paired windows; the floor of wide windows
// under the hall; the hall's tall arched windows, their heads narrowing to the middle half
// for the last 80 cm; the band; and the parapet. `pair` rows glaze a bay's two windows,
// `full` ones its whole width, and `head` ones its middle half.
type Row = { lo: number; hi: number; kind: "wall" | "pair" | "full" | "head" | "band"; floor: number };
const wallRows: Row[] = [
  { lo: 0.25, hi: 1, kind: "wall", floor: 1 },
  { lo: 1, hi: 4.4, kind: "full", floor: 1 },
];
for (let n = 2; n <= 9; n += 1) {
  const base = 5 + (n - 2) * 3.525;
  wallRows.push({ lo: wallRows.at(-1)!.hi, hi: base + 0.8, kind: "wall", floor: n });
  wallRows.push({ lo: base + 0.8, hi: base + 2.9, kind: "pair", floor: n });
}
wallRows.push({ lo: wallRows.at(-1)!.hi, hi: 33.65, kind: "wall", floor: 10 });
wallRows.push({ lo: 33.65, hi: 36.7, kind: "full", floor: 10 });
wallRows.push({ lo: 36.7, hi: 37.3, kind: "wall", floor: 11 });
wallRows.push({ lo: 37.3, hi: 43.1, kind: "full", floor: 11 });
wallRows.push({ lo: 43.1, hi: 43.9, kind: "head", floor: 11 });
wallRows.push({ lo: 43.9, hi: h.band, kind: "wall", floor: 11 });
wallRows.push({ lo: h.band, hi: h.parapet, kind: "band", floor: 12 });
wallRows.push({ lo: h.parapet, hi: h.walls, kind: "wall", floor: 12 });
// The upper floor's windows under its eaves, and the Monroe gable's.
const upperRows: Row[] = [
  { lo: h.walls, hi: 52, kind: "wall", floor: 13 },
  { lo: 52, hi: 55.9, kind: "full", floor: 13 },
  { lo: 55.9, hi: h.eaves, kind: "wall", floor: 13 },
];
const dormerRows: Row[] = [
  { lo: h.walls, hi: 53.7, kind: "wall", floor: 13 },
  { lo: 53.7, hi: 55.9, kind: "full", floor: 13 },
  { lo: 55.9, hi: 57.5, kind: "wall", floor: 13 },
];

export function createUniversityClubGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("University Club · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("University Club · stone and windows", kit.material(0xffffff, { vertexColors: true }));
  const ornament = kit.batch("University Club · merlons and pinnacles", kit.material(0xa0a0a0));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its Monroe front running west and its Michigan front
  // north.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(neighbours[0]![0] < neighbours[1]![0] ? neighbours[0]! : neighbours[1]!), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  // The inverse of `at`: a point's distances along Monroe and Michigan, whose fronts meet a
  // little off square.
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const [length, depth] = [Math.max(...lot.map((p) => inLot(p)[0])), inLot(northEast)[1]];
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);
  const lift = ([x, z]: Vec2, y: number): Vec3 => [x, y, z];

  // The main block, to the parapet's top.
  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.walls, b[1]], [a[0], h.walls, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, flat);
  paintedSlab(kit, shell, lot, h.walls, true, flat);

  // A closed block whose walls rise from `base` to `eaves` under a gable roof to `ridge`,
  // its ridge running along the lot's a axis (west from Michigan) or its b axis (north
  // from Monroe); the gables are stone and the slopes roofing.
  const gabled = (a0: number, a1: number, b0: number, b1: number, base: number, eaves: number, ridge: number, along: "a" | "b") => {
    const corners = rect(a0, a1, b0, b1);
    planOf(corners).forEach((run) => {
      const p = run.at(0), q = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [lift(p, base), lift(q, base), lift(q, eaves), lift(p, eaves)], [[n[0], 0, n[1]]], core);
    });
    paintedSlab(kit, shell, corners, base, false, flat);
    const middle = along === "a" ? (b0 + b1) / 2 : (a0 + a1) / 2;
    const ridgeAt = (s: number) => lift(along === "a" ? at(s, middle) : at(middle, s), ridge);
    const [s0, s1] = along === "a" ? [a0, a1] : [b0, b1];
    const eave = (s: number, t: number) => lift(along === "a" ? at(s, t) : at(t, s), eaves);
    const [t0, t1] = along === "a" ? [b0, b1] : [a0, a1];
    const centre = lift(at((a0 + a1) / 2, (b0 + b1) / 2), (eaves + ridge) / 2);
    // Each face's outward normal, from its points and the block's middle.
    const face = (points: Vec3[], paint: THREE.Color) => {
      const [a, b, c] = points as [Vec3, Vec3, Vec3];
      const u = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), v = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = u.cross(v).normalize(), mid = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length, sum[2] + p[2] / points.length], [0, 0, 0]);
      if (n.x * (mid[0] - centre[0]) + n.y * (mid[1] - centre[1]) + n.z * (mid[2] - centre[2]) < 0) n.negate();
      const normal: Vec3 = [n.x, n.y, n.z];
      if (points.length === 3) kit.triangle(shell, points, [normal, normal, normal], paint);
      else kit.quad(shell, points as [Vec3, Vec3, Vec3, Vec3], [normal], paint);
    };
    face([eave(s0, t0), eave(s1, t0), ridgeAt(s1), ridgeAt(s0)], roofing);
    face([eave(s1, t1), eave(s0, t1), ridgeAt(s0), ridgeAt(s1)], roofing);
    face([eave(s0, t1), eave(s0, t0), ridgeAt(s0)], stone);
    face([eave(s1, t0), eave(s1, t1), ridgeAt(s1)], stone);
    return corners;
  };
  const upper = gabled(h.back, length - h.sides, h.sides, depth - h.sides, h.walls, h.eaves, h.ridge, "a");
  // The Monroe side's small gable stands 15 cm proud of the upper floor, clear of its skin,
  // its foot sunk 10 cm into the main block.
  const dormer = gabled(13.7, 18.7, h.sides - 0.15, 5, h.walls - 0.1, 57.5, h.dormer, "b");

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it and
  // says how much of a window each crosses: 0 none, 1 a full window's edge, 2 a pair's
  // window, 3 a pair's window and the head, 4 the head between a pair. Floors below
  // `lowest` stay stone.
  const glazing: Record<Row["kind"], number[]> = { wall: [], band: [], pair: [2, 3], full: [1, 2, 3, 4], head: [3, 4] };
  const skin = (corners: Vec2[], rows: Row[], seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2, end: Vec2) => [number[], (bay: number) => number], lowest = 1) => {
    const plan = planOf(corners), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, crossing] = openings(chain.length, plan[first]!.at(0), plan[last]!.at(plan[last]!.length));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!;
        if (row.kind === "band") return band;
        return row.floor >= lowest && glazing[row.kind].includes(crossing(bay)) ? paneColor(row.floor, bay, seed * 8 + index) : stone;
      }, stone);
    });
  };
  // A position along a wall from its start, given in lot coordinates across it.
  const along = (length: number, start: Vec2, end: Vec2, target: number) => {
    const [p, q] = [inLot(start), inLot(end)], axis = Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]) ? 0 : 1;
    return length * (target - p[axis]!) / (q[axis]! - p[axis]!);
  };
  // The street fronts' bays, 3.5 m wide and 4.55 m apart from 3.1 m along each front, as the
  // drawing has them; each splits into a full window's edges, a pair's two windows, and the
  // head over their mullion.
  const bays = (length: number, start: Vec2, end: Vec2): [number[], (bay: number) => number] => {
    const centres = Array.from({ length: 12 }, (_, k) => along(length, start, end, 3.1 + 4.55 * k)).filter((c) => c - 1.75 > 0.1 && c + 1.75 < length - 0.1).sort((p, q) => p - q);
    const steps = [-1.75, -1.5, -0.875, -0.3, 0.3, 0.875, 1.5, 1.75];
    const columns = [0, ...centres.flatMap((c) => steps.map((s) => c + s)), length];
    // Bays count from one: a pier, then 1, 2, 3, 4, 3, 2, 1 across each window.
    return [columns, (bay) => (bay > 8 * centres.length || (bay - 1) % 8 === 0 ? 0 : [0, 1, 2, 3, 4, 3, 2, 1][(bay - 1) % 8]!)];
  };
  // Windows `width` wide every `pitch` metres, centred on each wall, glazed as a pair's.
  const spaced = (width: number, pitch: number) => (length: number): [number[], (bay: number) => number] => {
    const count = Math.max(1, Math.round(length / pitch)), centres = Array.from({ length: count }, (_, k) => length * (k + 0.5) / count);
    const columns = [0, ...centres.flatMap((c) => [c - width / 2, c + width / 2]), length];
    return [columns, (bay) => (bay % 2 === 0 && bay <= 2 * count ? 2 : 0)];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  const street = (run: Run) => facing(1, 0)(run) || facing(0, 1)(run), party = facing(0, -1);
  skin(lot, wallRows, 0, street, bays);
  // The west wall's windows run from the ground; the north wall is shared with the
  // six-storey 30 South Michigan and stays blank below its eighth floor.
  skin(lot, wallRows, 1, (run) => !street(run) && !party(run), spaced(2.4, 4.55));
  skin(lot, wallRows, 4, party, spaced(2.4, 4.55), 8);
  // The upper floor's windows, 3.6 m wide about 5.5 m apart, and the small gable's one.
  skin(upper, upperRows, 2, () => true, spaced(3.6, 5.5));
  skin(dormer, dormerRows, 3, facing(0, 1), spaced(2.4, 5));

  // Merlons along the street fronts' parapet, 1.2 m wide every 2.1 m, 3 cm inside the walls;
  // pinnacles at the gable's foot, rising from 10 cm inside the main block; and the cross on
  // its peak, its foot inside the roof.
  const block = (a0: number, a1: number, b0: number, b1: number, lo: number, hi: number) => kit.prism(ornament, planOf(rect(a0, a1, b0, b1)), [lo, hi]);
  for (let s = 1.05; s + 0.6 < depth; s += 2.1) block(0.03, 0.53, s - 0.6, s + 0.6, h.walls, h.merlons);
  for (let s = 1.05; s + 0.6 < length; s += 2.1) block(Math.max(s - 0.6, 0.56), s + 0.6, 0.03, 0.53, h.walls, h.merlons);
  for (const b of [h.sides, depth - h.sides]) block(h.back - 0.6, h.back + 0.6, b - 0.6, b + 0.6, h.walls - 0.1, h.pinnacles);
  const peak = depth / 2;
  block(h.back + 0.15, h.back + 0.45, peak - 0.15, peak + 0.15, h.ridge - 0.7, h.cross);
  block(h.back + 0.2, h.back + 0.4, peak - 0.6, peak + 0.6, 68.9, 69.25);

  const model = kit.finish({ height: h.cross, outlines: [shell, ornament], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/university-club-reference.md" };
  return model;
}
