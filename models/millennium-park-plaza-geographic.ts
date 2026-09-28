import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Millennium Park Plaza, 151–155 North Michigan Avenue (Reinheimer & Associates, 1982, as
// Doral Plaza): the geographic layout's model, on the mapped outline 127107026. The drawing
// shows it in front of Michigan Plaza, where the geographic camera names it; the original
// layout has no model of it.
//
// A 90 m concrete slab along Michigan Avenue, its south end chamfered at both corners:
// offices on the first seven floors and apartments above. The narrow ends are solid wall
// but for four slender window strips, each topped by a small window on the top floor; the
// long faces carry punched windows between piers. Floor levels are estimated from the
// published 40 storeys and 121.9 m; see docs/millennium-park-plaza-reference.md. Units are
// meters; +x is east, +z is south.
export const millenniumParkPlazaLevels = Object.freeze({
  lobby: 4.4, // the second floor, over the lobby
  office: 3.7, // floors 2 to 8
  apartment: 2.8, // floors 8 to 41, the roof's
  top: 121.9, // the parapet's top, the published architectural height
});
const h = millenniumParkPlazaLevels;
// Each floor's level, from the second to a 41st at the top floor's ceiling.
const floor = (n: number) => (n <= 8 ? h.lobby + (n - 2) * h.office : h.lobby + 6 * h.office + (n - 8) * h.apartment);

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x2e2e2e, 0x323232, 0x363636, 0x3a3a3a].map(color);
const litGlass = color(0x727272), dimGlass = color(0x484848);
const concrete = color(0x666666), strip = color(0x3e3e3e), lobby = color(0x3a3a3a), core = color(0x262626), roofing = color(0x3e3e3e);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 23, 0x9e3779b1) ^ Math.imul(bay + 47, 0x85ebca77) ^ Math.imul(wall + 37, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// A wall's rows from 25 cm above grade, where the mapped outline ends: the lobby, each
// floor's concrete spandrel and window, and the parapet over the top floor.
type Row = { lo: number; hi: number; kind: "lobby" | "glass" | "spandrel"; floor: number };
const rows: Row[] = [{ lo: 0.25, hi: floor(2) - 0.3, kind: "lobby", floor: 1 }];
for (let n = 2; n <= 40; n += 1) {
  rows.push({ lo: floor(n) - 0.3, hi: floor(n) + 0.6, kind: "spandrel", floor: n });
  rows.push({ lo: floor(n) + 0.6, hi: floor(n + 1) - 0.3, kind: "glass", floor: n });
}
rows.push({ lo: floor(41) - 0.3, hi: h.top, kind: "spandrel", floor: 41 });
const heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];

export function createMillenniumParkPlazaGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Millennium Park Plaza · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Millennium Park Plaza · walls and windows", kit.material(0xffffff, { vertexColors: true }));
  const corners: Vec2[] = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The slab, its walls the shell's dark core.
  planOf(corners).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, corners, 0, false, roofing);
  paintedSlab(kit, shell, corners, h.top, true, roofing);

  // Every wall's skin, one box a chain, held 2 cm clear of its ends. A narrow end carries
  // four window strips, 1.25 m wide and symmetrical about its middle, from the eighth floor,
  // the first of apartments, with the top floor's window standing apart over each; below,
  // the offices' windows run across it. A long face has a punched window every 3 m between
  // 0.8 m piers. The chamfers are solid.
  const plan = planOf(corners);
  chainsOf(plan).forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const end = chain.length > 12 && chain.length < 30, long = chain.length >= 30;
    let columns: number[], isWindow: (bay: number) => boolean;
    if (end) {
      const middle = chain.length / 2, centres = [-4.1, -1.6, 1.6, 4.1].map((d) => middle + d);
      columns = [0, ...centres.flatMap((c) => [c - 0.625, c + 0.625]), chain.length];
      isWindow = (bay) => bay % 2 === 0 && bay >= 2 && bay <= 8;
    } else if (long) {
      const bays = Math.round(chain.length / 3);
      columns = [0, ...Array.from({ length: bays }, (_, i) => [chain.length * i / bays + 0.4, chain.length * (i + 1) / bays - 0.4]).flat(), chain.length];
      isWindow = (bay) => bay % 2 === 0 && bay >= 2 && bay <= 2 * bays;
    } else {
      columns = [0, chain.length];
      isWindow = () => false;
    }
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
      const row = rows[r]!;
      if (row.kind === "lobby") return lobby;
      const office = row.floor < 8;
      if (end && !office && isWindow(bay)) {
        if (row.kind === "glass") return paneColor(row.floor, bay, index);
        return row.floor >= 40 ? concrete : strip;
      }
      if (row.kind === "spandrel") return concrete;
      if (end) return office ? paneColor(row.floor, bay, index) : concrete;
      return isWindow(bay) ? paneColor(row.floor, bay, index) : concrete;
    }, concrete);
  });

  const model = kit.finish({ height: h.top, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/millennium-park-plaza-reference.md" };
  return model;
}
