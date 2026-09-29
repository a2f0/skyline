import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// River Plaza, 405 North Wabash Avenue (Ezra Gordon–Jack M. Levin and Associates, 1977): the
// geographic layout's model, on the mapped outline 285867424 and its parts. The original
// layout has no model of it. From the photograph's camera its top stands behind Two Illinois
// Center, in the gap between Two Prudential Plaza and Aon Center that the drawing's
// `office-west-of-aon` group paints, the only mapped building on that sightline tall enough
// to reach the drawn top.
//
// A white concrete slab of 56 storeys with notched corners: a grid of exposed frame and
// punched windows over a low podium on the river side, to a flat roof at the published
// 159.7 m, with a box on it. See docs/river-plaza-two-illinois-center-reference.md. Units are
// meters; +x is east, +z is south.
export const riverPlazaLevels = Object.freeze({
  podium: 8, // the podium's roof, OpenStreetMap's
  floors: 56,
  roof: 159.7, // the published height, the Skyscraper Center's 524 ft
  box: 166, // the rooftop box, OpenStreetMap's
  bay: 1.6, // the frame's bays, an estimate from photographs
});
const h = riverPlazaLevels;
const pitch = h.roof / h.floors;

// The skins' colours: the window tones, and the concrete, which no window shares.
export const riverPlazaPalette = Object.freeze({ glass: [0x2c2c2c, 0x303030, 0x343434, 0x282828], lit: 0x8a8a8a, dim: 0x505050, concrete: 0x9a9a9a });
const palette = riverPlazaPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim), concrete = color(palette.concrete);
const core = color(0x6a6a6a), roofing = color(0x8a8a8a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 19, 0x9e3779b1) ^ Math.imul(bay + 37, 0x85ebca77) ^ Math.imul(wall + 29, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 12) return litGlass;
  if (value < 18) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

export function createRiverPlazaGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("River Plaza · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("River Plaza · concrete and windows", kit.material(0xffffff, { vertexColors: true }));
  const box = kit.batch("River Plaza · rooftop box", kit.material(0x9a9a9a));
  const [tower, podium, top] = record.parts.map((part) => orient(polygonOf(projectPlan(part.coordinates))));

  // The slab and the podium, each a closed shell on its mapped part.
  for (const [plan, height] of [[tower!, h.roof], [podium!, h.podium]] as const) {
    planOf(plan).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], height, b[1]], [a[0], height, a[1]]], [[n[0], 0, n[1]]], core);
    });
    paintedSlab(kit, shell, plan, 0, false, roofing);
    paintedSlab(kit, shell, plan, height, true, roofing);
  }
  // The box on the roof, on its mapped part.
  kit.prism(box, planOf(top!), [h.roof, h.box]);

  // The slab's skin, one box to a run of a chain, held 2 cm clear of the chain's ends or 9 cm
  // where the outline turns in: on each floor, a window 1.1 m wide and 1.5 m tall in each
  // 1.6 m bay of the frame, from the chain's middle out. A run the podium stands against, its
  // two ends on the podium's outline, starts over the podium's roof; a chain whose runs differ
  // is skinned in parts, which meet at their joint.
  const plan = planOf(tower!);
  const edges = planOf(podium!);
  const onEdge = (p: [number, number]) => edges.some((edge) => {
    const a = edge.at(0), b = edge.at(edge.length), t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (edge.length * edge.length)));
    return Math.hypot(p[0] - a[0] - t * (b[0] - a[0]), p[1] - a[1] - t * (b[1] - a[1])) < 0.05;
  });
  const covered = (run: Run) => onEdge(run.at(0)) && onEdge(run.at(run.length));
  chainsOf(plan).forEach((chain, index) => {
    const first = chain.runs[0]!, last = chain.runs.at(-1)!;
    const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
    const count = Math.floor(chain.length / 2 / h.bay);
    const centres = Array.from({ length: 2 * count }, (_, k) => chain.length / 2 + (k - count + 0.5) * h.bay);
    // The chain's parts, each a span of runs the podium covers alike.
    const parts: [number, number][] = [];
    chain.runs.forEach((run, k) => { const part = parts.at(-1); if (part && covered(plan[run]!) === covered(plan[chain.runs[part[0]]!]!)) part[1] = k; else parts.push([k, k]); });
    for (const [k0, k1] of parts) {
      const base = covered(plan[chain.runs[k0]!]!) ? h.podium : 0.25;
      const from = k0 === 0 ? s0 : chain.starts[k0]!, to = k1 === chain.runs.length - 1 ? s1 : chain.starts[k1]! + plan[chain.runs[k1]!]!.length;
      const heights = [base];
      for (let n = Math.ceil(base / pitch); n < h.floors; n += 1) {
        const sill = n * pitch + 0.75;
        if (sill > base + 0.2) heights.push(sill, sill + 1.5);
      }
      heights.push(h.roof);
      const cuts = centres.flatMap((c) => [c - 0.55, c + 0.55]).filter((s) => s > from + 0.01 && s < to - 0.01);
      const columns = [from, ...cuts, to];
      chainSkin(kit, wall, plan, chain, k0, k1, from, to, columns, heights, 0.02, 0.07, (bay, r) => {
        const middle = (columns[bay - 1]! + columns[bay]!) / 2;
        const glazed = r % 2 === 1 && centres.some((c) => Math.abs(middle - c) < 0.55);
        return glazed ? paneColor(r, bay, index) : concrete;
      }, concrete);
    }
  });

  const model = kit.finish({ height: h.box, outlines: [shell, box], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/river-plaza-two-illinois-center-reference.md" };
  return model;
}
