import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Railway Exchange Building, 224 South Michigan Avenue (Frederick P. Dinkelberg of D. H.
// Burnham & Co., 1904): the geographic layout's model, on the mapped outline 124873931. The
// original layout has no model of it; the drawing shows it at Michigan and Jackson, left of
// the Borg-Warner Building.
//
// White terracotta fronts on Michigan and Jackson rise seventeen storeys in eleven bays of
// paired windows, with a belt under the fourteenth floor. Round windows fill the frieze on
// the seventeenth, under a projecting cornice and a hipped copper roof. The cornice is the
// City's 235 ft and the roof's top the Skyscraper Center's 259 ft: each is the published
// height nearest its drawn reading. The drawn cornice reads 73.7 m, so heights read on the
// drawing are scaled to meet it; see docs/railway-exchange-reference.md. Units are meters;
// +x is east, +z is south.
const drawn = (height: number) => height * 71.6 / 73.7;
export const railwayExchangeLevels = Object.freeze({
  belt: drawn(54.6), // the belt under the fourteenth floor
  frieze: drawn(67.4), // the frieze and its round windows
  cornice: drawn(71.8), // the projecting cornice
  eaves: 71.6, // the cornice's top and the roof's foot, the City's 235 ft
  top: 78.9, // the roof's top, the Skyscraper Center's 259 ft
});
const h = railwayExchangeLevels;

// The skins' colours: the window tones, and the terracotta, the belt and the plain walls,
// which no window shares.
export const railwayExchangePalette = Object.freeze({ glass: [0x2c2c2c, 0x303030, 0x343434, 0x383838], lit: 0x6e6e6e, dim: 0x3c3c3c, terracotta: 0x808080, band: 0x909090, plain: 0x626262 });
const palette = railwayExchangePalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const terracotta = color(palette.terracotta), band = color(palette.band), plain = color(palette.plain);
const core = color(0x262626), roofing = color(0x3c3c3c), copper = color(0x9c9c9c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 71, 0x9e3779b1) ^ Math.imul(bay + 101, 0x85ebca77) ^ Math.imul(wall + 83, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the walls, from 25 cm above grade, where the mapped outline ends, read on the
// drawing and scaled: the ground floor's shopfronts; each floor's window, 2.6 m tall and
// 3.84 m apart as drawn, to the thirteenth; the belt; the fourteenth to sixteenth; the
// frieze, its round windows in five slices, each carrying its middle's drawn height from
// their centre; and the cornice's foot. The drawing shows the floors down to 20 m; below,
// they are carried down at the drawn pitch, and the ground floor is an estimate.
type Kind = "base" | "shop" | "wall" | "glass" | "band" | "oculus" | "frieze";
type Row = { lo: number; hi: number; kind: Kind; floor: number; dy?: number };
const rows: Row[] = [{ lo: 0.25, hi: drawn(0.6), kind: "base", floor: 1 }];
const push = (hi: number, kind: Kind, floor: number, dy?: number) => rows.push({ lo: rows.at(-1)!.hi, hi: drawn(hi), kind, floor, ...(dy === undefined ? {} : { dy }) });
push(7.4, "shop", 1);
const sill = (n: number) => (n <= 13 ? 51.53 - (13 - n) * 3.843 : 55.8 + (n - 14) * 3.85);
for (let n = 2; n <= 16; n += 1) {
  if (n === 14) {
    push(54.6, "wall", 13);
    push(55.4, "band", 13);
  }
  push(sill(n), "wall", n);
  push(sill(n) + 2.6, "glass", n);
}
push(67.4, "wall", 16);
push(67.8, "frieze", 17);
for (const [lo, hi] of [[67.8, 68.3], [68.3, 68.8], [68.8, 69.3], [69.3, 69.8], [69.8, 70.3]] as const) push(hi, "oculus", 17, Math.abs((lo + hi) / 2 - 69.05));
push(71.8, "frieze", 17);
// Over the cornice's foot, the plain walls' last row to the eaves.
rows.push({ lo: rows.at(-1)!.hi, hi: h.eaves, kind: "frieze", floor: 17 });

export function createRailwayExchangeGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Railway Exchange Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Railway Exchange Building · terracotta and windows", kit.material(0xffffff, { vertexColors: true }));
  const cornice = kit.batch("Railway Exchange Building · cornice", kit.material(0x8a8a8a));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, on Michigan and Jackson, with the Jackson front running
  // west and the Michigan front north to Symphony Center.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const southWest = lot.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const northWest = lot.reduce((best, p) => (-p[0] - p[1] > -best[0] - best[1] ? p : best));
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(southWest), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  const skew = west[0] * north[1] - west[1] * north[0];
  const inLot = (p: Vec2): Vec2 => {
    const [x, z] = [p[0] - corner[0], p[1] - corner[1]];
    return [(x * north[1] - z * north[0]) / skew, (west[0] * z - west[1] * x) / skew];
  };
  const [jackson, michigan] = [inLot(southWest)[0], inLot(northEast)[1]];
  const lift = ([x, z]: Vec2, y: number): Vec3 => [x, y, z];

  // The walls to the roof's foot.
  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.eaves, b[1]], [a[0], h.eaves, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.eaves, true, roofing);

  // The roof: a closed solid on the lot's four corners, 10 cm inside the lines between them,
  // which the Jackson wall stands up to 6.7 cm inside, so that no face lies in the walls'.
  // It rises from a foot 10 cm inside the block, up the eaves, to a flat top 10 m in from
  // each side over the light well, as the photograph shows; the drawing simplifies it to a
  // pyramid. Its slopes are in two triangles each, since the lot is out of square.
  const northWestIn = inLot(northWest);
  const ring = (inset: number) => orient([at(inset, inset), at(jackson - inset, inset), at(northWestIn[0] - inset, northWestIn[1] - inset), at(inset, michigan - inset)]);
  const [eaves, crown] = [ring(0.1), ring(10)], foot = h.eaves - 0.1;
  planOf(eaves).forEach((run) => {
    const p = run.at(0), q = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [lift(p, foot), lift(q, foot), lift(q, h.eaves), lift(p, h.eaves)], [[n[0], 0, n[1]]], copper);
  });
  paintedSlab(kit, shell, eaves, foot, false, roofing);
  paintedSlab(kit, shell, crown, h.top, true, copper);
  // Each slope's outward normal, from its points and the roof's middle.
  const middle = lift(at(jackson / 2, michigan / 2), (h.eaves + h.top) / 2);
  const face = (points: [Vec3, Vec3, Vec3]) => {
    const [a, b, c] = points;
    const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
    const mid = [0, 1, 2].map((k) => (a[k]! + b[k]! + c[k]!) / 3);
    if (n.x * (mid[0]! - middle[0]) + n.y * (mid[1]! - middle[1]) + n.z * (mid[2]! - middle[2]) < 0) n.negate();
    const normal: Vec3 = [n.x, n.y, n.z];
    kit.triangle(shell, points, [normal, normal, normal], copper);
  };
  eaves.forEach((p, i) => {
    const q = eaves[(i + 1) % 4]!, [r, s] = [crown[i]!, crown[(i + 1) % 4]!];
    face([lift(p, h.eaves), lift(q, h.eaves), lift(s, h.top)]);
    face([lift(p, h.eaves), lift(s, h.top), lift(r, h.top)]);
  });

  // The cornice projects 90 cm along both fronts, from 12 cm inside the lines between their
  // corners to 2 cm over the eaves, stopping 3 cm short of the north and alley walls.
  kit.prism(cornice, planOf(orient([at(-0.9, michigan - 0.03), at(-0.9, -0.9), at(jackson - 0.03, -0.9), at(jackson - 0.03, 0.12), at(0.12, 0.12), at(0.12, michigan - 0.03)])), [h.cornice, h.eaves + 0.02]);

  // A wall's skin over `span`, one box to a chain the `keep` test accepts, held 2 cm clear
  // of its ends or 9 cm where the outline turns in. `openings` lays a wall's columns out
  // across it and says what a cell shows, by its middle and row. The fronts stop at the
  // cornice's foot; the plain walls run to the eaves.
  type Cell = "glass" | "wall" | "band" | "plain";
  const paints: Record<Exclude<Cell, "glass">, THREE.Color> = { wall: terracotta, band, plain };
  const skin = (keep: (run: Run) => boolean, span: Row[], seed: number, openings: (length: number) => [number[], (mid: number, row: Row) => Cell], sides: THREE.Color) => {
    const plan = planOf(lot), heights = [span[0]!.lo, ...span.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, cell] = openings(chain.length);
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = span[r]!, shows = cell((columns[bay - 1]! + columns[bay]!) / 2, row);
        return shows === "glass" ? paneColor(row.floor, bay, seed * 8 + index) : paints[shows];
      }, sides);
    });
  };
  const near = (list: number[], x: number) => Math.min(...list.map((c) => Math.abs(x - c)));
  // A street front: eleven bays 4.4 m apart about its middle, each a pair of windows 1.44 m
  // wide either side of a 47 cm mullion and a round window 2.6 m across over it, as drawn.
  const front = (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const centres = Array.from({ length: 11 }, (_, k) => length / 2 + (k - 5) * 4.4);
    const cuts = centres.flatMap((c) => [-1.675, -1.3, -0.9, -0.6, -0.235, 0.235, 0.6, 0.9, 1.3, 1.675].map((d) => c + d));
    return [[0, ...cuts, length], (mid, row) => {
      const dx = near(centres, mid);
      if (row.kind === "band") return "band";
      if (row.kind === "shop") return dx < 1.675 ? "glass" : "wall";
      if (row.kind === "glass") return dx > 0.235 && dx < 1.675 ? "glass" : "wall";
      if (row.kind === "oculus") return dx * dx + row.dy! * row.dy! <= 1.3 * 1.3 ? "glass" : "wall";
      return "wall";
    }];
  };
  // The alley's windows, which the drawing does not show: 1.6 m wide, spread evenly about
  // 3.2 m apart, one to each floor above the ground floor, the seventeenth's as tall as the
  // round windows' band.
  const alley = (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const count = Math.max(1, Math.round(length / 3.2)), centres = Array.from({ length: count }, (_, k) => length * (k + 0.5) / count);
    return [[0, ...centres.flatMap((c) => [c - 0.8, c + 0.8]), length], (mid, row) => ((row.kind === "glass" || row.kind === "oculus") && near(centres, mid) < 0.8 ? "glass" : "plain")];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // Michigan and Jackson carry the fronts; the alley has windows; the north wall, shared
  // with Symphony Center, stays plain.
  skin((run) => facing(1, 0)(run) || facing(0, 1)(run), rows.slice(0, -1), 0, front, terracotta);
  skin(facing(-1, 0), rows, 1, alley, plain);
  skin(facing(0, -1), rows, 2, (length) => [[0, length], () => "plain"], plain);

  const model = kit.finish({ height: h.top, outlines: [shell, cornice], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/railway-exchange-reference.md" };
  return model;
}
