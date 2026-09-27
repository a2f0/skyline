import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, mitredBox, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// 330 North Wabash (Ludwig Mies van der Rohe with C. F. Murphy, 1972), the former IBM
// Building and now AMA Plaza: the geographic layout's model, on the mapped outline 64596068
// and its mapped 211.84 m (695 ft) height. It is the tower the drawing labels Michigan Plaza
// South: through the photograph's camera its roof corners land on the drawn ones, and One
// Prudential covers its east face where the drawing does.
//
// A black slab, 120 by 270 ft, of bronze-anodized aluminium: I-beam mullions on the 5 ft
// module stand in front of bronze-tinted glass, with a bronze spandrel at every floor. It
// stands on a plaza 25 ft above the street, where bronze-clad columns carry it over a glazed
// lobby, and louvers in place of glass mark its mechanical floors: two above the sixteenth,
// and the three at the top, which the photograph shows dark. See docs/north-wabash-reference.md.
// Units are meters; +x is east, +z is south.
export const northWabashLevels = Object.freeze({
  plaza: 7.6, // 25 ft above the street
  lobbyTop: 15.5, // the lobby's 26 ft
  pitch: 3.81, // 12 ft 6 in office floors
  lowerFloors: 15,
  plant: 4.66, // each of the two mechanical floors above the sixteenth
  upperFloors: 31,
  roof: 211.84, // mapped height, the published 695 ft
  module: 1.524, // 5 ft
});
const h = northWabashLevels;
const lowerPlant = h.lobbyTop + h.lowerFloors * h.pitch, upperStart = lowerPlant + 2 * h.plant;
const topPlant = upperStart + h.upperFloors * h.pitch;
// Every floor line from the lobby's top to the top mechanical floors, and what the storey
// above it is.
const floors: { level: number; plant: boolean }[] = [
  ...Array.from({ length: h.lowerFloors }, (_, i) => ({ level: h.lobbyTop + i * h.pitch, plant: false })),
  { level: lowerPlant, plant: true }, { level: lowerPlant + h.plant, plant: true },
  ...Array.from({ length: h.upperFloors }, (_, i) => ({ level: upperStart + i * h.pitch, plant: false })),
  ...Array.from({ length: 3 }, (_, i) => ({ level: topPlant + i * (h.roof - topPlant) / 3, plant: true })),
];
export const northWabashFloors = floors.map(({ level }) => level);
const spandrelBelow = 0.32, spandrelAbove = 0.75, fascia = 0.55;
const mullionHalf = 0.05, mullionDepth = 0.18, columnHalf = 0.45, columnDepth = 0.6;
// The columns stand 30 ft apart along the long faces and 40 ft along the short ones.
const columnBays = [9.144, 12.192];

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x1f1f1f, 0x232323, 0x272727, 0x1c1c1c].map(color);
const litGlass = color(0x7a7a7a), dimGlass = color(0x4a4a4a);
const spandrel = color(0x262626), louver = color(0x353535), lobby = color(0x3a3a3a), granite = color(0x464646), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 7, 0x9e3779b1) ^ Math.imul(bay + 41, 0x85ebca77) ^ Math.imul(wall + 19, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

export function createNorthWabashGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("330 North Wabash · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("330 North Wabash · glass, spandrels and louvers", kit.material(0xffffff, { vertexColors: true }));
  const frames = kit.batch("330 North Wabash · bronze mullions and columns", kit.material(0x3c3c3c));
  const outline: Vec2[] = orient(polygonOf(projectPlan(record.footprint.coordinates))), plan = planOf(outline);

  // The slab: granite below the plaza, bronze above it, and a flat roof.
  plan.forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.plaza, b[1]], [a[0], h.plaza, a[1]]], [[n[0], 0, n[1]]], granite);
    kit.quad(shell, [[a[0], h.plaza, a[1]], [b[0], h.plaza, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], spandrel);
  });
  paintedSlab(kit, shell, outline, 0, false, roofing);
  paintedSlab(kit, shell, outline, h.roof, true, roofing);

  // The rows of a wall: the lobby's glass, then each floor's spandrel and the glass or
  // louvers above it, up to the fascia.
  type Row = { lo: number; hi: number; kind: "glass" | "spandrel" | "louver" | "lobby"; floor: number };
  const rows: Row[] = [{ lo: h.plaza + 0.1, hi: floors[0]!.level - spandrelBelow, kind: "lobby", floor: 0 }];
  floors.forEach(({ level, plant }, i) => {
    const next = floors[i + 1]?.level ?? h.roof + spandrelBelow;
    rows.push({ lo: level - spandrelBelow, hi: level + spandrelAbove, kind: "spandrel", floor: i + 1 });
    rows.push({ lo: level + spandrelAbove, hi: Math.min(next - spandrelBelow, h.roof - fascia), kind: plant ? "louver" : "glass", floor: i + 1 });
  });
  const cuts = [rows[0]!.lo, ...rows.map((row) => row.hi)];

  // Each wall: one skin of cells on each floor; I-beam mullions one module
  // apart, whole on one run and held back from the corners, from the lobby's top to under
  // the fascia; and bronze-clad columns on the column bays through the lobby.
  chainsOf(plan).forEach((chain, index) => {
    const count = Math.max(1, Math.round(chain.length / h.module));
    const stations = Array.from({ length: count + 1 }, (_, i) => chain.length * i / count);
    // The long faces run north and south.
    const run0 = plan[chain.runs[0]!]!, n = run0.normal(0), bay = columnBays[Math.abs(n[0]) > 0.7 ? 0 : 1]!;
    const columnCount = Math.max(1, Math.round(chain.length / bay));
    const columns = Array.from({ length: columnCount + 1 }, (_, i) => chain.length * i / columnCount);
    // Cells span two modules, so a lit window reads as an office's width.
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, 0.02, chain.length - 0.02, stations.filter((_, i) => i % 2 === 0), cuts, 0.02, 0.07, (bay, r) => {
      const row = rows[r]!;
      if (row.kind === "spandrel") return spandrel;
      if (row.kind === "louver") return louver;
      if (row.kind === "lobby") return lobby;
      return paneColor(row.floor, bay, index);
    }, spandrel);
    const place = (s: number, half: number, depth: number, lo: number, hi: number) => {
      const k = chain.starts.findIndex((start, i) => s < start + plan[chain.runs[i]!]!.length + 1e-9);
      if (k < 0) return;
      const run = plan[chain.runs[k]!]!, start = chain.starts[k]!;
      const ends = (other: number) => (other < 0 || other >= chain.runs.length ? depth + 0.02 : 0.03) + half;
      const lowS = ends(k - 1), highS = run.length - ends(k + 1);
      if (highS >= lowS) kit.box(frames, run.at(Math.min(Math.max(s - start, lowS), highS)), run.normal(0), half, 0, depth, lo, hi);
    };
    for (const s of stations) place(s, mullionHalf, mullionDepth, h.lobbyTop, h.roof - fascia - 0.1);
    for (const s of columns) place(s, columnHalf, columnDepth, h.plaza + 0.05, h.lobbyTop);
  });
  // The fascia that caps the curtain wall, mitred round the corners.
  plan.forEach((run, i) => {
    const [before, after] = turnsAt(plan, i);
    mitredBox(kit, frames, run, 0, run.length, before, after, 0.25, h.roof - fascia, h.roof);
  });

  const model = kit.finish({ height: h.roof, outlines: [shell, frames], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/north-wabash-reference.md" };
  return model;
}
