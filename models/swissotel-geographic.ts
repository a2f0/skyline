import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Swissôtel Chicago, 323 East Wacker Drive (Harry Weese, 1989): the geographic layout's model,
// on the hotel's mapped tower part 641288601. The original layout has no model of it. From
// the photograph's camera it stands behind Three Illinois Center and The Buckingham, and fills
// the seam where their corners meet.
//
// A triangular tower of reflective glass: a flush grid of thin mullions about 1.5 m apart and
// a transom at each floor, a panel to a floor, under a flat roof at the published 139.3 m. The
// floors divide that height by OpenStreetMap's 45 levels. See docs/swissotel-reference.md.
// Units are meters; +x is east, +z is south.
export const swissotelLevels = Object.freeze({
  levels: 45, // OpenStreetMap's count, a panel to each
  roof: 139.3, // the published height, the Skyscraper Center's 457 ft
  module: 1.5, // the mullions' spacing, read on the photographs
  frame: 0.06, // each mullion's and transom's width
  coping: 0.1, // the roof's coping over the top panel
});
const h = swissotelLevels;
const pitch = h.roof / h.levels;

// The skins' colours: the window tones, and the frame, which no window shares.
export const swissotelPalette = Object.freeze({ glass: [0x2a2e31, 0x2e3235, 0x323639, 0x262a2d], lit: 0x8a877c, dim: 0x505250, frame: 0x3e4245 });
const palette = swissotelPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim), frame = color(palette.frame);
const core = color(0x1c1e20), roofing = color(0x303234);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 71, 0x9e3779b1) ^ Math.imul(bay + 13, 0x85ebca77) ^ Math.imul(wall + 47, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 12) return litGlass;
  if (value < 18) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped part ends: a panel to each
// floor between transoms centred on the floor lines, and the coping.
type Row = { lo: number; hi: number; kind: "glass" | "frame"; floor: number };
export const swissotelRows: Row[] = [];
for (let n = 1; n <= h.levels; n += 1) {
  const lo = n === 1 ? 0.25 : (n - 1) * pitch + h.frame / 2, hi = n === h.levels ? h.roof - h.coping : n * pitch - h.frame / 2;
  swissotelRows.push({ lo, hi, kind: "glass", floor: n });
  swissotelRows.push({ lo: hi, hi: n === h.levels ? h.roof : n * pitch + h.frame / 2, kind: "frame", floor: n });
}
const rows = swissotelRows;

export function createSwissotelGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Swissôtel · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Swissôtel · curtain wall", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.roof, true, roofing);

  // Every face's curtain wall, one box to a chain, held 2 cm clear of its ends or 9 cm where
  // the outline turns in: a mullion on each module, from the chain's middle out, and the
  // panels between.
  const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
  chainsOf(plan).forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const count = Math.floor(chain.length / 2 / h.module);
    const lines = Array.from({ length: 2 * count + 1 }, (_, k) => chain.length / 2 + (k - count) * h.module);
    const cuts = lines.flatMap((c) => [c - h.frame / 2, c + h.frame / 2]).filter((s) => s > s0 + 0.01 && s < s1 - 0.01);
    const columns = [s0, ...cuts, s1];
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.06, (bay, r) => {
      const row = rows[r]!, middle = (columns[bay - 1]! + columns[bay]!) / 2;
      if (row.kind === "frame" || lines.some((c) => Math.abs(middle - c) < h.frame / 2)) return frame;
      return paneColor(row.floor, bay, index);
    }, frame);
  });

  const model = kit.finish({ height: h.roof, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/swissotel-reference.md" };
  return model;
}
