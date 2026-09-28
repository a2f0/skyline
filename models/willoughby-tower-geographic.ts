import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Willoughby Tower, 8 South Michigan Avenue (Samuel N. Crowen, 1929): the geographic
// layout's model, on the mapped outline 124873939. The original layout has no model of it;
// the drawing shows it left of Six North Michigan, outside the excerpt it is fitted to.
//
// A limestone Gothic tower on an L-shaped lot at Michigan and Madison. The base fills the
// lot to the setback over the 23rd floor, under a parapet of pinnacles. A shaft rises at
// the lot's south-east corner, 17.4 m along its south wall and 11 m along Michigan, with a
// shoulder four floors high west of it, to a crown of arched windows and corner pinnacles
// at the published 133.5 m. Heights are measured on the drawing down from that top; see
// docs/willoughby-tower-reference.md. Units are meters; +x is east, +z is south.
export const willoughbyLevels = Object.freeze({
  setback: 80.5, // the base's parapet, over the 23rd floor
  shoulder: 92, // the shoulder's roof, west of the shaft
  shaft: 123.5, // the shaft's top, under the crown
  crown: 131.5, // the crown's parapet
  top: 133.5, // the crown's pinnacles, the published architectural height
  shaftWidth: 17.4, // along the south wall from the south-east corner
  shaftDepth: 11, // along Michigan from the south-east corner
});
const h = willoughbyLevels;
// Each floor's level: a two-storey granite base, then 3.35 m floors to the crown's.
const floor = (n: number) => (n < 2 ? 0 : 6 + (n - 2) * 3.35);

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x2a2a2a, 0x2e2e2e, 0x323232, 0x363636].map(color);
const litGlass = color(0x6e6e6e), dimGlass = color(0x444444);
const stone = color(0x585858), granite = color(0x4a4a4a), strip = color(0x2d2d2d), core = color(0x262626), roofing = color(0x3e3e3e);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 29, 0x9e3779b1) ^ Math.imul(bay + 53, 0x85ebca77) ^ Math.imul(wall + 41, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends, to the
// crown's parapet: the granite base, each floor's stone spandrel and window, the base's
// parapet at the setback, and the crown's tall arched windows under its parapet. A solid
// takes the rows between its foot and top, cut there.
type Row = { lo: number; hi: number; kind: "granite" | "glass" | "stone" | "arch"; floor: number };
const allRows: Row[] = [{ lo: 0.25, hi: floor(3) - 0.3, kind: "granite", floor: 1 }];
for (let n = 3; n <= 36; n += 1) {
  allRows.push({ lo: floor(n) - 0.3, hi: floor(n) + 0.9, kind: "stone", floor: n });
  allRows.push({ lo: floor(n) + 0.9, hi: floor(n + 1) - 0.3, kind: "glass", floor: n });
}
allRows.push({ lo: floor(37) - 0.3, hi: 125, kind: "stone", floor: 37 });
allRows.push({ lo: 125, hi: 130, kind: "arch", floor: 37 });
allRows.push({ lo: 130, hi: h.crown, kind: "stone", floor: 38 });
const rowsBetween = (lo: number, hi: number): Row[] => allRows
  .map((row) => ({ ...row, lo: Math.max(row.lo, lo), hi: Math.min(row.hi, hi) }))
  .filter((row) => row.hi - row.lo > 0.05);

export function createWilloughbyTowerGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Willoughby Tower · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Willoughby Tower · stone and windows", kit.material(0xffffff, { vertexColors: true }));
  const pinnacles = kit.batch("Willoughby Tower · pinnacles", kit.material(0x626262));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, and its south wall and Michigan front running from it.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const neighbours = [lot[(lot.indexOf(corner) + 1) % lot.length]!, lot[(lot.indexOf(corner) + lot.length - 1) % lot.length]!];
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const [west, north] = neighbours[0]![0] < neighbours[1]![0] ? [unit(neighbours[0]!), unit(neighbours[1]!)] : [unit(neighbours[1]!), unit(neighbours[0]!)];
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);
  // The south wall's length: the farthest lot corner on its line.
  const southWall = Math.max(...lot.filter((p) => Math.abs((p[0] - corner[0]) * west[1] - (p[1] - corner[1]) * west[0]) < 0.5).map((p) => (p[0] - corner[0]) * west[0] + (p[1] - corner[1]) * west[1]));
  const shaft = rect(0, h.shaftWidth, 0, h.shaftDepth), shoulder = rect(h.shaftWidth, southWall, 0, h.shaftDepth), crown = rect(1.8, h.shaftWidth - 1.8, 1.8, h.shaftDepth - 1.8);

  // A solid on an outline between two heights.
  const solid = (corners: Vec2[], lo: number, hi: number) => {
    planOf(corners).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], core);
    });
    paintedSlab(kit, shell, corners, lo, false, roofing);
    paintedSlab(kit, shell, corners, hi, true, roofing);
  };
  solid(lot, 0, h.setback);
  solid(shoulder, h.setback, h.shoulder);
  solid(shaft, h.setback, h.shaft);
  solid(crown, h.shaft, h.crown);

  // Whether a run lies along an outline's edges.
  const lies = (run: Run, on: Vec2[]) => [0, run.length / 2, run.length].every((s) => {
    const p = run.at(s);
    return on.some((q, i) => {
      const r = on[(i + 1) % on.length]!, [dx, dz] = [r[0] - q[0], r[1] - q[1]], l = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dz) / (l * l)));
      return Math.hypot(q[0] + dx * t - p[0], q[1] + dz * t - p[1]) < 0.05;
    });
  });

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it and
  // says which hold windows, which the shaft's dark strips, and which stay stone.
  type Opening = "window" | "strip" | "stone";
  const skin = (corners: Vec2[], lo: number, hi: number, seed: number, keep: (run: Run) => boolean, openings: (length: number) => [number[], (bay: number) => Opening]) => {
    const plan = planOf(corners), rows = rowsBetween(lo, hi), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, kind] = openings(chain.length);
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!, opening = kind(bay);
        if (row.kind === "granite") return granite;
        if (opening === "strip" && row.kind !== "arch") return row.floor >= 37 ? stone : strip;
        if (row.kind === "arch") return opening === "stone" ? stone : paneColor(row.floor, bay, seed * 8 + index);
        if (row.kind === "stone" || opening === "stone") return stone;
        return paneColor(row.floor, bay, seed * 8 + index);
      }, stone);
    });
  };
  // Windows every 3 m, 1.6 m wide, between stone piers; a short wall stays stone.
  const punched = (length: number): [number[], (bay: number) => Opening] => {
    const bays = Math.round(length / 3);
    if (bays < 1) return [[0, length], () => "stone"];
    const columns = [0, ...Array.from({ length: bays }, (_, i) => [length * (i + 0.5) / bays - 0.8, length * (i + 0.5) / bays + 0.8]).flat(), length];
    return [columns, (bay) => (bay % 2 === 0 && bay >= 2 && bay <= 2 * bays ? "window" : "stone")];
  };
  // The shaft's Michigan face: three dark strips in the middle, a window near each edge.
  const stripped = (length: number): [number[], (bay: number) => Opening] => {
    const at = (f: number) => length * f;
    const columns = [0, at(0.15), at(0.25), at(0.36), at(0.43), at(0.47), at(0.54), at(0.58), at(0.65), at(0.75), at(0.85), length];
    return [columns, (bay) => (bay === 2 || bay === 10 ? "window" : bay === 4 || bay === 6 || bay === 8 ? "strip" : "stone")];
  };
  // The crown: a tall arched window in each of its bays.
  const arched = (length: number): [number[], (bay: number) => Opening] => {
    const bays = length > 10 ? 3 : 2, columns = [0, ...Array.from({ length: bays }, (_, i) => [length * (i + 0.5) / bays - 0.6, length * (i + 0.5) / bays + 0.6]).flat(), length];
    return [columns, (bay) => (bay % 2 === 0 && bay >= 2 && bay <= 2 * bays ? "window" : "stone")];
  };
  const michigan = (run: Run) => run.normal(0)[0] > 0.9;
  skin(lot, 0.25, h.setback, 0, () => true, punched);
  skin(shoulder, h.setback, h.shoulder, 1, (run) => !lies(run, shaft), punched);
  skin(shaft, h.setback, h.shaft, 2, (run) => michigan(run), stripped);
  skin(shaft, h.setback, h.shaft, 3, (run) => !michigan(run) && !lies(run, shoulder), punched);
  skin(shaft, h.shoulder, h.shaft, 4, (run) => lies(run, shoulder), punched);
  skin(crown, h.shaft, h.crown, 5, () => true, arched);

  // Pinnacles on the base's parapet along the two street fronts, clear of the shaft, and at
  // the crown's corners, reaching the published top.
  const pinnacle = (p: Vec2, lo: number, hi: number, size: number) => {
    const c = size / 2;
    kit.prism(pinnacles, planOf(orient([[p[0] - c, p[1] - c], [p[0] + c, p[1] - c], [p[0] + c, p[1] + c], [p[0] - c, p[1] + c]])), [lo, hi]);
  };
  const stations: Vec2[] = [];
  planOf(lot).forEach((run) => {
    const n = run.normal(0);
    if (!(n[0] > 0.9 || n[1] < -0.9)) return;
    const count = Math.max(1, Math.round(run.length / 6));
    for (let i = 0; i <= count; i += 1) {
      const p = run.at(run.length * i / count);
      if (inside(rect(-1.5, h.shaftWidth + 1.5, -1.5, h.shaftDepth + 1.5), p) || stations.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 2)) continue;
      stations.push(p);
      pinnacle(p, h.setback, h.setback + 3, 0.9);
    }
  });
  for (const [a, b] of [[1.8, 1.8], [h.shaftWidth - 1.8, 1.8], [h.shaftWidth - 1.8, h.shaftDepth - 1.8], [1.8, h.shaftDepth - 1.8]] as const) pinnacle(at(a, b), h.crown, h.top, 1.1);

  const model = kit.finish({ height: h.top, outlines: [shell, pinnacles], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/willoughby-tower-reference.md" };
  return model;
}
