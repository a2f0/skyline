import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Sheraton Grand Chicago Riverwalk, 301 East North Water Street (Solomon Cordwell Buenz,
// 1992): the geographic layout's model, on mapped tower 592122464, corner part
// 1269924307, and east-wing parts 1269924305/1269924304. The original layout has no
// model of it. The drawing's `buckingham-east` group,
// right of The Buckingham, is its corner: a lit crown over a tower of windows.
//
// A cream precast tower on an L, its arms ending in round towers, of punched windows at the
// published 2.67 m floor-to-floor. The corner's round tower rises two floors over the arms,
// and each round end carries a stepped crown and louvered screen, floodlit at night. Heights stand on
// the Skyscraper Center's datum, its top floor at 97 m and the corner drum's top at 112.3 m;
// its 112.8 m tip, 50 cm higher, is not modelled. See docs/sheraton-grand-reference.md.
// Units are meters; +x is east, +z is south.
export const sheratonLevels = Object.freeze({
  pitch: 2.67, // Emporis's floor-to-floor, 8.75 ft
  topFloor: 97, // the Skyscraper Center's occupied height, the corner's top floor
  corner: 100.1, // the corner's roof, a floor-to-roof of 3.1 m over it as Emporis gives it
  arms: 100.1 - 2 * 2.67, // the arms' roof, two floors lower, at the mapped arms' 32 levels
  wing: 100.1 - 6 * 2.67, // 28-level east wing, relative to the 34-level corner's datum
  wingEnd: 100.1 - 5 * 2.67, // the mapped 29-level round end, a floor above its wing
  drum: 12.2, // total crown assembly, including its stepped base
  screen: 5.4, // inferred upper screen, about 44% of the assembly in the 2007 photograph
  top: 112.3, // the corner drum's top, the Skyscraper Center's architectural height
});
const h = sheratonLevels;

// The round ends the drums stand on, circles fitted to the mapped parts' arcs within 11 cm:
// the corner, part 1269924307, and the east and north arms' ends, parts 1269924306 and
// 1269924308, plus the east wing's end, 1269924304 (within 1.7 cm).
// Centres are east and north metres from Crain's centre; map precision is not survey accuracy.
// Only the main 12.2 m crown has a published height difference. Smaller crowns
// use photo ratios (7.2/6 m, about ±1.5 m), not copies of the main assembly.
export const sheratonDrums = Object.freeze([
  { centre: [407.44, 465.95] as Vec2, radius: 7.97, base: h.corner, height: h.drum, screen: h.screen },
  { centre: [439.52, 462.06] as Vec2, radius: 7.37, base: h.arms, height: 7.2, screen: 4.5 },
  { centre: [409.75, 498.32] as Vec2, radius: 7.39, base: h.arms, height: 7.2, screen: 4.5 },
  { centre: [482.703, 457.389] as Vec2, radius: 7.391, base: h.wingEnd, height: 6, screen: 4 },
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
  const wing = orient(polygonOf(projectPlan(record.parts[2]!.coordinates)));
  const wingEnd = orient(polygonOf(projectPlan(record.parts[3]!.coordinates)));

  // A closed solid of walls and slabs on an outline, painted by its runs.
  const solid = (target: typeof shell, outline: Vec2[], lo: number, hi: number, paint: (k: number) => THREE.Color, cap = roofing) => {
    planOf(outline).forEach((run, k) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(target, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], paint(k));
    });
    paintedSlab(kit, target, outline, lo, false, cap);
    paintedSlab(kit, target, outline, hi, true, cap);
  };
  // The tower to the arms' roof, and the corner's round tower, on its mapped part, two floors
  // over it.
  solid(shell, tower, 0, h.arms, () => core);
  solid(shell, cornerPlan, h.arms, h.corner, () => core);
  solid(shell, wing, 0, h.wing, () => core);
  solid(shell, wingEnd, h.wing, h.wingEnd, () => core);
  // Matt Griffin's 2007 photograph resolves a stepped pale frame below a
  // dark horizontal-louver screen. About 20 slats and alternating broad/narrow
  // uprights are visible; the old equal-width vertical stripes were not fins.
  // Ratios are photographic estimates, not construction dimensions. Preserve
  // the mapped centres and published total height; see FID-SHER-002's audit.
  for (const { centre, radius, base, height, screen } of sheratonDrums) {
    const baseHeight = height - screen;
    const screenBase = base + baseHeight;
    const screenRadius = radius - 0.6;
    const ring = (r: number, lo: number, hi: number, paint: THREE.Color) =>
      solid(drums, circle(centre, r, 48), lo, hi, () => paint, paint);
    // Recessed opaque cores keep geometry closed. True see-through screens
    // remain unresolved; the recess and projecting slats supply visible relief.
    ring(radius - 0.7, base + 0.25, screenBase, fin);
    ring(screenRadius - 0.12, screenBase, base + height, fin);
    ring(radius, base, base + 0.5, drumFace);
    ring(radius - 0.25, base + baseHeight / 2 - 0.1, base + baseHeight / 2 + 0.1, drumFace);
    const baseBands = baseHeight > 5 ? 7 : 2;
    for (let row = 1; row <= baseBands; row += 1) {
      const y = base + 0.6 + row * (baseHeight - 1.4) / baseBands;
      if (Math.abs(y - base - baseHeight / 2) > 0.25) ring(radius - 0.55, y, y + 0.10, drumFace);
    }
    for (let row = 0; row < 20; row += 1) {
      const y = screenBase + row * screen / 20;
      ring(screenRadius, y + 0.03, y + 0.10, fin);
    }
    const post = (angle: number, width: number, inner: number, outer: number, lo: number, hi: number) => {
      const c = Math.cos(angle), s = Math.sin(angle);
      const section: Vec2[] = [[inner, -width / 2], [outer, -width / 2], [outer, width / 2], [inner, width / 2]];
      const corners = section.map(([r, t]): Vec2 =>
        [centre[0] + r * c - t * s, -centre[1] + r * s + t * c]);
      solid(drums, orient(corners), lo, hi, () => drumFace, drumFace);
    };
    for (let k = 0; k < 24; k += 1) {
      const angle = k / 24 * Math.PI * 2;
      post(angle, k % 2 ? 0.14 : 0.42, screenRadius - 0.10, screenRadius + 0.10, screenBase, base + height);
      if (k % 2 === 0) {
        post(angle, 0.65, radius - 0.75, radius + 0.12, base + 0.5, base + baseHeight / 2 + 0.08);
        post(angle, 0.48, radius - 0.75, radius - 0.20, base + baseHeight / 2 + 0.08, screenBase + 0.2);
      }
    }
  }

  // The skins, one box to a chain of runs turning less than 30°, so the round ends carry one:
  // a window 1.4 m wide in each 2.4 m bay, set out from the chain's middle, on every floor.
  const towerRows = rowsFor(0.25, h.arms);
  const skin = (outline: Vec2[], base: number, top: number, seed: number, sharedWith?: Vec2[]) => {
    const plan = planOf(outline), heights = rowsFor(base, top);
    const same = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
    const shared = plan.map((run) => sharedWith?.some((a, index) => {
      const b = sharedWith[(index + 1) % sharedWith.length]!;
      return same(run.at(0), b) && same(run.at(run.length), a);
    }) ?? false);
    chainsOf(plan, 30 * Math.PI / 180).forEach((chain, index) => {
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const count = Math.floor((chain.length - 1.4) / 2 / 2.4);
      const centres = Array.from({ length: 2 * count + 1 }, (_, k) => chain.length / 2 + (k - count) * 2.4);
      const cuts = centres.flatMap((c) => [c - 0.7, c + 0.7]).filter((s) => s > s0 + 0.01 && s < s1 - 0.01);
      const columns = [s0, ...cuts, s1];
      // The two mapped parts meet along the old east drum's arc. Below the
      // wing roof it is an internal wall: retain closed cores, but do not put
      // overlapping facade skins on that shared boundary. Keep bay positions
      // tied to the original chain when trimming the visible segments.
      for (let k0 = 0; k0 < chain.runs.length;) {
        if (shared[chain.runs[k0]!]) { k0 += 1; continue; }
        let k1 = k0;
        while (k1 + 1 < chain.runs.length && !shared[chain.runs[k1 + 1]!]) k1 += 1;
        const from = k0 === 0 ? s0 : chain.starts[k0]! + 0.09;
        const to = k1 === chain.runs.length - 1 ? s1 : chain.starts[k1]! + plan[chain.runs[k1]!]!.length - 0.09;
        chainSkin(kit, wall, plan, chain, k0, k1, from, to, columns, heights, 0.02, 0.07, (bay, r) => {
          const middle = (columns[bay - 1]! + columns[bay]!) / 2;
          // Keep the original tower's floor seed through the split at the
          // wing roof, rather than restarting its window pattern above it.
          const row = seed === 0 ? towerRows.findIndex((y) => Math.abs(y - heights[r]!) < 1e-5) : r;
          return r % 2 === 1 && centres.some((c) => Math.abs(middle - c) < 0.7) ? paneColor(row, bay, seed * 16 + index) : precast;
        }, precast);
        k0 = k1 + 1;
      }
    });
  };
  skin(tower, 0.25, h.wing, 0, wing);
  skin(tower, h.wing, h.arms, 0);
  skin(cornerPlan, h.arms, h.corner, 1);
  skin(wing, 0.25, h.wing, 2, tower);
  skin(wingEnd, h.wing, h.wingEnd, 3);

  const model = kit.finish({ height: h.top, outlines: [shell, drums], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/sheraton-grand-reference.md" };
  return model;
}
