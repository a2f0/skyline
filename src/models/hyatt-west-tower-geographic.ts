import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Hyatt Regency Chicago's West Tower, 151 East Wacker Drive (A. Epstein and Sons, 1974):
// the geographic layout's model, on its mapped part 235920252. The original layout has no
// model of it. From the photograph's camera it stands between Aon Center and the Blue Cross
// and Blue Shield Tower, where the drawing's Blue Cross group paints a dark brown sliver.
//
// A brick slab of 33 storeys: each face carries narrow window slots, continuous from the
// lobby to the top two floors, on a 3.5 m module between solid corners, and a plain band
// over them to a flat roof at the published 111.3 m. See docs/hyatt-west-tower-reference.md.
// Units are meters; +x is east, +z is south.
export const hyattWestLevels = Object.freeze({
  floors: 33,
  roof: 111.3, // the published height, the Skyscraper Center's 365 ft
  band: 31, // the last floor with windows; the two above are the plain band
  module: 3.5, // the slots' spacing, measured on the photograph and the drawing
  slot: 1, // each slot's width
  corner: 2, // the solid brick at least left at each corner
});
const h = hyattWestLevels;
const pitch = h.roof / h.floors;

// The skins' colours: the window tones, and the brick and the slots' spandrels, which no window
// shares.
export const hyattWestPalette = Object.freeze({ glass: [0x202020, 0x242424, 0x282828, 0x1d1d1d], lit: 0x6d6d6d, dim: 0x4a4a4a, brick: 0x3b3b3b, spandrel: 0x2c2c2c });
const palette = hyattWestPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim), brick = color(palette.brick), spandrel = color(palette.spandrel);
const core = color(0x282828), roofing = color(0x333333);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 43, 0x9e3779b1) ^ Math.imul(bay + 19, 0x85ebca77) ^ Math.imul(wall + 7, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 10) return litGlass;
  if (value < 16) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of every wall, from 25 cm above grade, where the mapped part ends: the lobby's
// glass, then on each floor to the thirty-first a spandrel and a window 2.1 m tall, 80 cm
// over the floor, and the plain band over them.
type Row = { lo: number; hi: number; kind: "spandrel" | "glass" | "band"; floor: number };
export const hyattWestRows: Row[] = [{ lo: 0.25, hi: pitch - 0.3, kind: "glass", floor: 1 }];
for (let n = 2; n <= h.band; n += 1) {
  const floor = (n - 1) * pitch;
  hyattWestRows.push({ lo: hyattWestRows.at(-1)!.hi, hi: floor + 0.8, kind: "spandrel", floor: n });
  hyattWestRows.push({ lo: floor + 0.8, hi: floor + 2.9, kind: "glass", floor: n });
}
hyattWestRows.push({ lo: hyattWestRows.at(-1)!.hi, hi: h.roof, kind: "band", floor: h.band + 1 });
const rows = hyattWestRows;

export function createHyattWestTowerGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Hyatt Regency West Tower · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Hyatt Regency West Tower · brick and windows", kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.parts[0]!.coordinates)));

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.roof, true, roofing);

  // Every face's skin, one box to a chain, held 2 cm clear of its ends or 9 cm where the
  // outline turns in: slots on the module, set out from the chain's middle, as many as leave
  // the corners solid; the lobby's glass runs the chain's length.
  const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
  chainsOf(plan).forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const count = Math.max(0, Math.floor((chain.length - 2 * h.corner - h.slot) / h.module) + 1);
    const centres = Array.from({ length: count }, (_, k) => chain.length / 2 + (k - (count - 1) / 2) * h.module);
    const cuts = centres.flatMap((c) => [c - h.slot / 2, c + h.slot / 2]).filter((s) => s > s0 + 0.01 && s < s1 - 0.01);
    const columns = [s0, ...cuts, s1];
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
      const row = rows[r]!, middle = (columns[bay - 1]! + columns[bay]!) / 2;
      if (row.kind === "band") return brick;
      if (row.floor === 1) return paneColor(row.floor, bay, index);
      if (!centres.some((c) => Math.abs(middle - c) < h.slot / 2)) return brick;
      return row.kind === "glass" ? paneColor(row.floor, bay, index) : spandrel;
    }, brick);
  });

  const model = kit.finish({ height: h.roof, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/hyatt-west-tower-reference.md" };
  return model;
}
