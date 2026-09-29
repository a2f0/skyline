import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Two Illinois Center, 233 North Michigan Avenue (Fujikawa Johnson & Associates, after Mies
// van der Rohe's One Illinois Center, 1972): the geographic layout's model, on the mapped
// outline 236770799. The original layout has no model of it. From the photograph's camera it
// stands between Two Prudential Plaza and Aon Center, in front of River Plaza, and its lit
// floors fill the lower part of the gap the drawing's `office-west-of-aon` group paints.
//
// A dark slab of 32 storeys: a curtain wall of mullions on a 5 ft module, glass over a
// spandrel on every floor, and the top two floors' mechanical band, dark panels in place of
// glass, under a flat roof at the published 114.3 m. The floor pitch is the photograph's; see
// docs/river-plaza-two-illinois-center-reference.md. Units are meters; +x is east, +z is
// south.
export const twoIllinoisLevels = Object.freeze({
  lobby: 4.25, // the lobby's height, what 31 floors at the pitch leave under the roof
  pitch: 3.55, // each floor above it, measured on the photograph
  plant: 31, // the first of the two mechanical floors
  roof: 114.3, // the published height, the Skyscraper Center's 375 ft
  module: 1.524, // the curtain wall's 5 ft module
});
const h = twoIllinoisLevels;
const floor = (n: number) => (n < 2 ? 0 : h.lobby + (n - 2) * h.pitch);

// The skins' colours: the window tones, and the mullions, spandrels and mechanical panels,
// which no window shares.
export const twoIllinoisPalette = Object.freeze({ glass: [0x1f1f1f, 0x232323, 0x272727, 0x1c1c1c], lit: 0x7a7a7a, dim: 0x4a4a4a, mullion: 0x333333, spandrel: 0x2b2b2b, plant: 0x303030 });
const palette = twoIllinoisPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const mullion = color(palette.mullion), spandrel = color(palette.spandrel), plant = color(palette.plant);
const core = color(0x1a1a1a), roofing = color(0x303030);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 53, 0x9e3779b1) ^ Math.imul(bay + 23, 0x85ebca77) ^ Math.imul(wall + 71, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 9) return litGlass;
  if (value < 14) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped outline ends: the lobby's
// glass; each office floor's 90 cm spandrel and glass; the two mechanical floors' panels.
type Row = { lo: number; hi: number; kind: "spandrel" | "glass" | "plant"; floor: number };
export const twoIllinoisRows: Row[] = [{ lo: 0.25, hi: h.lobby, kind: "glass", floor: 1 }];
for (let n = 2; n < h.plant; n += 1) {
  twoIllinoisRows.push({ lo: floor(n), hi: floor(n) + 0.9, kind: "spandrel", floor: n });
  twoIllinoisRows.push({ lo: floor(n) + 0.9, hi: floor(n + 1), kind: "glass", floor: n });
}
twoIllinoisRows.push({ lo: floor(h.plant), hi: h.roof, kind: "plant", floor: h.plant });
const rows = twoIllinoisRows;

export function createTwoIllinoisCenterGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Two Illinois Center · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Two Illinois Center · curtain wall", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.roof, true, roofing);

  // Every face's curtain wall, one box to a chain, held 2 cm clear of its ends or 9 cm where
  // the outline turns in: a 10 cm mullion on each 5 ft module, from the chain's middle out,
  // with glass or spandrel between.
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
      if (row.kind === "plant") return plant;
      return row.kind === "spandrel" ? spandrel : paneColor(row.floor, bay, index);
    }, mullion);
  });

  const model = kit.finish({ height: h.roof, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/river-plaza-two-illinois-center-reference.md" };
  return model;
}
