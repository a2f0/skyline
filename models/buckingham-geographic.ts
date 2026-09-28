import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnAt, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Buckingham, 360 East Randolph Street (Fujikawa Johnson & Associates, 1982): the
// geographic layout's model, on the mapped outline 95486940 and its rooftop part 284790189.
// The original layout has no model of it; the drawing shows it right of 340 on the Park,
// outside the excerpt it is fitted to.
//
// A concrete frame of five bays a face, a band at every floor over bronze ribbon windows. On
// the south, east and north faces the end bays stand forward of the middle three, and two
// corners are notched for stacked balconies. The top floor's tall openings sit under a cap
// at the mapped 119 m, and the rooftop enclosure rises to the published 121.9 m. Floor levels
// are measured on the drawing down from the mapped roof; see docs/buckingham-reference.md.
// Units are meters; +x is east, +z is south.
export const buckinghamLevels = Object.freeze({
  lowestFloor: 18.94, // floor 7, the drawing's lowest floor line
  pitch: 2.5456, // the drawn floor lines, 36 of them up to floor 43
  capFoot: 117.4, // the top floor's openings' head, under the cap
  roof: 119, // the cap's top, mapped
  top: 121.9, // the rooftop enclosure's top, the published architectural height
});
const h = buckinghamLevels;
// Each floor's level, from the second, over the lobby, to the 44th.
const floor = (n: number) => h.lowestFloor + (n - 7) * h.pitch;

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x303030, 0x343434, 0x383838, 0x3c3c3c].map(color);
const litGlass = color(0x6e6e6e), dimGlass = color(0x464646);
const concrete = color(0x4c4c4c), lobby = color(0x3a3a3a), core = color(0x262626), roofing = color(0x3a3a3a), enclosure = color(0x2e2e2e);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 19, 0x9e3779b1) ^ Math.imul(bay + 43, 0x85ebca77) ^ Math.imul(wall + 31, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// A wall's rows from 25 cm above grade, where the mapped outline ends: the lobby, then each
// floor's concrete band and ribbon window, the top floor's deeper band and tall openings,
// and the cap.
type Row = { lo: number; hi: number; kind: "lobby" | "glass" | "band"; floor: number };
const rows: Row[] = [{ lo: 0.25, hi: floor(2) - 0.3, kind: "lobby", floor: 1 }];
for (let n = 2; n <= 43; n += 1) {
  rows.push({ lo: floor(n) - 0.3, hi: floor(n) + 0.55, kind: "band", floor: n });
  rows.push({ lo: floor(n) + 0.55, hi: floor(n + 1) - 0.3, kind: "glass", floor: n });
}
rows.push({ lo: floor(44) - 0.3, hi: floor(44) + 1.4, kind: "band", floor: 44 });
rows.push({ lo: floor(44) + 1.4, hi: h.capFoot, kind: "glass", floor: 44 });
rows.push({ lo: h.capFoot, hi: h.roof, kind: "band", floor: 45 });
const heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];

export function createBuckinghamGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Buckingham · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Buckingham · frame and glass", kit.material(0xffffff, { vertexColors: true }));
  const piers = kit.batch("Buckingham · piers", kit.material(0x565656));
  const balconies = kit.batch("Buckingham · corner balconies", kit.material(0x5a5a5a));
  const outline = (way: number) => orient(polygonOf(projectPlan(record.parts.find((part) => part.way === way)!.coordinates)));
  const tower = outline(95486940), roofRoom = outline(284790189);

  // A solid on an outline between two heights.
  const solid = (corners: Vec2[], lo: number, hi: number, paint: THREE.Color) => {
    planOf(corners).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], paint);
    });
    paintedSlab(kit, shell, corners, lo, false, roofing);
    paintedSlab(kit, shell, corners, hi, true, roofing);
  };
  solid(tower, 0, h.roof, core);
  solid(roofRoom, h.roof, h.top, enclosure);

  // Every wall's skin, one box a chain, held 2 cm clear of its ends, or 9 cm, past its own
  // depth, where the outline turns in and the next wall's skin would otherwise cross it. A
  // face's cells are a quarter bay wide, with its corner piers painted in its end cells.
  const plan = planOf(tower), chains = chainsOf(plan);
  chains.forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const count = Math.max(1, Math.round((chain.length - 1.2) / 1.6));
    const columns = chain.length > 4 ? [0, 0.6, ...Array.from({ length: count - 1 }, (_, i) => 0.6 + (chain.length - 1.2) * (i + 1) / count), chain.length - 0.6, chain.length] : [0, chain.length];
    chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
      const row = rows[r]!, pier = chain.length > 4 && (bay <= 1 || bay >= columns.length - 1);
      if (row.kind === "lobby") return lobby;
      if (row.kind === "band" || pier) return concrete;
      return paneColor(row.floor, bay, index);
    }, concrete);
    // Piers stand proud between a wall's bays, about 6.4 m wide: three across a face's
    // set-back middle and five across the flat west face; an end bay has none.
    const bays = Math.round(chain.length / 6.5);
    for (let k = 1; k < bays; k += 1) {
      const s = chain.length * k / bays, j = chain.starts.findLastIndex((start) => start <= s), run = plan[chain.runs[j]!]!;
      kit.box(piers, run.at(s - chain.starts[j]!), run.normal(0), 0.3, 0.05, 0.25, 0.3, h.roof - 0.1);
    }
  });

  // The notched corners: two short walls turning in between two faces. A balcony fills each
  // notch on every floor to the 43rd, a slab held clear of the walls' skins under an L of
  // railing along its open sides.
  chains.forEach((chain, i) => {
    const next = chains[(i + 1) % chains.length]!;
    if (chain.length > 3 || next.length > 3 || turnAt(plan[chain.runs.at(-1)!]!, plan[next.runs[0]!]!) <= 0) return;
    const a = plan[chain.runs[0]!]!, b = plan[next.runs[0]!]!;
    const [p0, p1, p2] = [a.at(0), a.at(a.length), b.at(b.length)];
    const [na, nb] = [a.normal(0), b.normal(0)];
    const q: Vec2 = [p0[0] + p2[0] - p1[0], p0[1] + p2[1] - p1[1]];
    const off = (p: Vec2, n: Vec2, d: number): Vec2 => [p[0] + n[0] * d, p[1] + n[1] * d];
    const a0 = off(p0, na, 0.07), b0 = off(p2, nb, 0.07), inner = off(off(p1, na, 0.07), nb, 0.07);
    // Railing: the slab's open sides, 5 cm deep, turned in toward the notch's inner corner.
    const inward = (from: Vec2, to: Vec2): Vec2 => {
      const [dx, dz] = [to[0] - from[0], to[1] - from[1]], l = Math.hypot(dx, dz), n: Vec2 = [-dz / l, dx / l];
      return (inner[0] - from[0]) * n[0] + (inner[1] - from[1]) * n[1] > 0 ? n : [-n[0], -n[1]];
    };
    const [na0, nb0] = [inward(a0, q), inward(q, b0)];
    const rail = [a0, q, b0, off(b0, nb0, 0.05), off(off(q, na0, 0.05), nb0, 0.05), off(a0, na0, 0.05)];
    for (let n = 2; n <= 43; n += 1) {
      kit.prism(balconies, planOf(orient([inner, a0, q, b0])), [floor(n) - 0.12, floor(n) + 0.12]);
      kit.prism(balconies, planOf(orient(rail)), [floor(n) + 0.12, floor(n) + 1.0]);
    }
  });

  const model = kit.finish({ height: h.top, outlines: [shell, piers], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/buckingham-reference.md" };
  return model;
}
