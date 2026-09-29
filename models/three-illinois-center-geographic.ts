import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Three Illinois Center, 303 East Wacker Drive (Fujikawa Conterato Lohan and Associates,
// 1979): the geographic layout's model, on the mapped outline 95486958. The original layout
// has no model of it. From the photograph's camera its east end stands in the gap between
// 340 on the Park and The Buckingham, where the drawing's `buckingham-west` group paints an
// office tower of ribbon windows under a plain top.
//
// A dark bronze box after One and Two Illinois Center, of 30 storeys: a curtain wall of
// mullions on a 5 ft module, glass over a spandrel on each floor at the published 11.5 ft
// slab to slab, over the lobby's glass, and the top two floors' windowless mechanical
// penthouse, the spandrels' bronze with the mullions carried through, under a flat roof at
// the published 106.7 m. The penthouse was glazed around 2019; the model keeps it as the
// 2013 photograph shows it. See docs/three-illinois-center-reference.md. Units are meters;
// +x is east, +z is south.
export const threeIllinoisLevels = Object.freeze({
  pitch: 3.505, // the published 11.5 ft slab to slab
  lobby: 106.7 - 29 * 3.505, // the lobby's height, what the 29 floors over it leave under the roof
  fascia: 1.26, // the lobby's fascia, the second floor's spandrel carried down
  penthouse: 29, // the first of the two mechanical floors
  roof: 106.7, // the published height, the Skyscraper Center's and Emporis's 350 ft
  module: 1.524, // the curtain wall's 5 ft module
});
const h = threeIllinoisLevels;
const floor = (n: number) => (n < 2 ? 0 : h.lobby + (n - 2) * h.pitch);

// The skins' colours: the window tones, and the mullions and spandrels, which no window
// shares.
export const threeIllinoisPalette = Object.freeze({ glass: [0x1e1b18, 0x221e1b, 0x26221e, 0x1b1815], lit: 0x7a6e5e, dim: 0x4a4540, mullion: 0x3a3029, spandrel: 0x2e2621 });
const palette = threeIllinoisPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const mullion = color(palette.mullion), spandrel = color(palette.spandrel);
const core = color(0x1a1714), roofing = color(0x2e2a26);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 61, 0x9e3779b1) ^ Math.imul(bay + 29, 0x85ebca77) ^ Math.imul(wall + 83, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 9) return litGlass;
  if (value < 14) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends: the lobby's
// glass under its fascia; each office floor's 90 cm spandrel and glass; the penthouse.
type Row = { lo: number; hi: number; kind: "spandrel" | "glass" | "penthouse"; floor: number };
export const threeIllinoisRows: Row[] = [{ lo: 0.25, hi: h.lobby + 0.9 - h.fascia, kind: "glass", floor: 1 }];
for (let n = 2; n < h.penthouse; n += 1) {
  threeIllinoisRows.push({ lo: n === 2 ? h.lobby + 0.9 - h.fascia : floor(n), hi: floor(n) + 0.9, kind: "spandrel", floor: n });
  threeIllinoisRows.push({ lo: floor(n) + 0.9, hi: floor(n + 1), kind: "glass", floor: n });
}
threeIllinoisRows.push({ lo: floor(h.penthouse), hi: h.roof, kind: "penthouse", floor: h.penthouse });
const rows = threeIllinoisRows;

export function createThreeIllinoisCenterGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Three Illinois Center · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Three Illinois Center · curtain wall", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.roof, true, roofing);

  // Every face's curtain wall, one box to a chain, held 2 cm clear of its ends or 9 cm where
  // the outline turns in: a 10 cm mullion on each 5 ft module, from the chain's middle out,
  // carried up through the penthouse, with glass or spandrel between.
  const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
  chainsOf(plan).forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const count = Math.floor(chain.length / 2 / h.module);
    const lines = Array.from({ length: 2 * count + 1 }, (_, k) => chain.length / 2 + (k - count) * h.module);
    const cuts = lines.flatMap((c) => [c - 0.05, c + 0.05]).filter((s) => s > s0 + 0.01 && s < s1 - 0.01);
    const columns = [s0, ...cuts, s1];
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.08, (bay, r) => {
      const row = rows[r]!, middle = (columns[bay - 1]! + columns[bay]!) / 2;
      if (lines.some((c) => Math.abs(middle - c) < 0.05)) return mullion;
      return row.kind === "glass" ? paneColor(row.floor, bay, index) : spandrel;
    }, mullion);
  });

  const model = kit.finish({ height: h.roof, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/three-illinois-center-reference.md" };
  return model;
}
