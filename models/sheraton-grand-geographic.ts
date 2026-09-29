import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Sheraton Grand Chicago Riverwalk, 301 East North Water Street (Solomon Cordwell Buenz,
// 1992): the geographic layout's model, on the mapped tower 592122464 and its corner part
// 1269924307. The original layout has no model of it. The drawing's `buckingham-east` group,
// right of The Buckingham, is its corner: a lit crown over a tower of windows.
//
// A cream precast tower on an L, its arms ending in round towers, of punched windows at the
// published 2.67 m floor-to-floor. The corner's round tower rises two floors over the arms,
// and each round end carries an open drum of maroon fins, floodlit at night. Heights stand on
// the Skyscraper Center's datum, its top floor at 97 m and the corner drum's top at 112.3 m;
// its 112.8 m tip, 50 cm higher, is not modelled. See docs/sheraton-grand-reference.md.
// Units are meters; +x is east, +z is south.
export const sheratonLevels = Object.freeze({
  pitch: 2.67, // Emporis's floor-to-floor, 8.75 ft
  topFloor: 97, // the Skyscraper Center's occupied height, the corner's top floor
  corner: 100.1, // the corner's roof, a floor-to-roof of 3.1 m over it as Emporis gives it
  arms: 100.1 - 2 * 2.67, // the arms' roof, two floors lower, at the mapped arms' 32 levels
  drum: 12.2, // the drums' height, Emporis's architectural height over its main roof
  top: 112.3, // the corner drum's top, the Skyscraper Center's architectural height
});
const h = sheratonLevels;

// The round ends the drums stand on, circles fitted to the mapped parts' arcs within 11 cm:
// the corner, part 1269924307, and the east and north arms' ends, parts 1269924306 and
// 1269924308. Centres are east and north metres from Crain's centre.
export const sheratonDrums = Object.freeze([
  { centre: [407.44, 465.95] as Vec2, radius: 7.97, base: h.corner },
  { centre: [439.52, 462.06] as Vec2, radius: 7.37, base: h.arms },
  { centre: [409.75, 498.32] as Vec2, radius: 7.39, base: h.arms },
]);

// The skins' colours: the window tones, the precast, and the drums' cream and maroon fins,
// which no window shares.
export const sheratonPalette = Object.freeze({ glass: [0x2a2a2a, 0x2e2e2e, 0x323232, 0x262626], lit: 0x8a8a8a, dim: 0x505050, precast: 0x848484, drum: 0xb4b4b4, fin: 0x5a5a5a });
const palette = sheratonPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim), precast = color(palette.precast), drumFace = color(palette.drum), fin = color(palette.fin);
const core = color(0x585858), roofing = color(0x686868);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 17, 0x9e3779b1) ^ Math.imul(bay + 89, 0x85ebca77) ^ Math.imul(wall + 37, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 14) return litGlass;
  if (value < 20) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// A wall's rows from `base` to `top`: a window 1.5 m tall 80 cm over each floor line, the
// floors counted down from the top floor at the published pitch, from the last floor line
// under the base, whose window may clear it.
function rowsFor(base: number, top: number): number[] {
  const heights = [base];
  for (let level = h.topFloor - Math.ceil((h.topFloor - base) / h.pitch) * h.pitch; level < top; level += h.pitch) {
    if (level + 0.8 > base + 0.2 && level + 2.3 < top - 0.2) heights.push(level + 0.8, level + 2.3);
  }
  heights.push(top);
  return heights;
}

export function createSheratonGrandGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Sheraton Grand · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Sheraton Grand · precast and windows", kit.material(0xffffff, { vertexColors: true }));
  const drums = kit.batch("Sheraton Grand · drums", kit.material(0xffffff, { vertexColors: true }));
  const tower = orient(polygonOf(projectPlan(record.parts[0]!.coordinates)));
  const circle = (centre: Vec2, radius: number, sides = 24): Vec2[] => orient(Array.from({ length: sides }, (_, k) => {
    const angle = (k / sides) * Math.PI * 2;
    return [centre[0] + radius * Math.cos(angle), -centre[1] + radius * Math.sin(angle)] as Vec2;
  }));
  const cornerPlan = orient(polygonOf(projectPlan(record.parts[1]!.coordinates)));

  // A closed solid of walls and slabs on an outline, painted by its runs.
  const solid = (target: typeof shell, outline: Vec2[], lo: number, hi: number, paint: (k: number) => THREE.Color) => {
    planOf(outline).forEach((run, k) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(target, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], paint(k));
    });
    paintedSlab(kit, target, outline, lo, false, roofing);
    paintedSlab(kit, target, outline, hi, true, roofing);
  };
  // The tower to the arms' roof, and the corner's round tower, on its mapped part, two floors
  // over it.
  solid(shell, tower, 0, h.arms, () => core);
  solid(shell, cornerPlan, h.arms, h.corner, () => core);
  // Each drum: cream, a maroon fin every other facet, on its round end.
  for (const { centre, radius, base } of sheratonDrums) solid(drums, circle(centre, radius), base, base + h.drum, (k) => (k % 2 ? fin : drumFace));

  // The skins, one box to a chain of runs turning less than 30°, so the round ends carry one:
  // a window 1.4 m wide in each 2.4 m bay, set out from the chain's middle, on every floor.
  const skin = (outline: Vec2[], base: number, top: number, seed: number) => {
    const plan = planOf(outline), heights = rowsFor(base, top);
    chainsOf(plan, 30 * Math.PI / 180).forEach((chain, index) => {
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const count = Math.floor((chain.length - 1.4) / 2 / 2.4);
      const centres = Array.from({ length: 2 * count + 1 }, (_, k) => chain.length / 2 + (k - count) * 2.4);
      const cuts = centres.flatMap((c) => [c - 0.7, c + 0.7]).filter((s) => s > s0 + 0.01 && s < s1 - 0.01);
      const columns = [s0, ...cuts, s1];
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const middle = (columns[bay - 1]! + columns[bay]!) / 2;
        return r % 2 === 1 && centres.some((c) => Math.abs(middle - c) < 0.7) ? paneColor(r, bay, seed * 16 + index) : precast;
      }, precast);
    });
  };
  skin(tower, 0.25, h.arms, 0);
  skin(cornerPlan, h.arms, h.corner, 1);

  const model = kit.finish({ height: h.top, outlines: [shell, drums], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/sheraton-grand-reference.md" };
  return model;
}
