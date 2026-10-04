import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";
import { createWindowIllumination } from "./window-illumination.js";
import type { WindowCell } from "./window-illumination.js";

// The Blue Cross and Blue Shield Tower, 300 East Randolph Street (Lohan Associates, 1997;
// Goettsch Partners' 24-storey addition, 2010): the geographic layout's model, on the
// mapped outline 95486960 and its parts 284779637 and 284779635. The original layout
// has no model of it; the drawing shows it right of Aon, outside the excerpt it is fitted
// to.
//
// A glass curtain wall on the 5 ft module wraps a central block, the mapped 227 m part,
// which stands forward of two end bays, the rest of the mapped 212 m part. Three bands of
// mechanical floors cross the block, their columns lit blue at night; at the middle band,
// the top of the 1997 tower, the end bays are open through. A screen carrying the company's
// emblems rises from the block's roof to the published 226.7 m. Heights are measured on
// the photograph down from that top; see docs/blue-cross-reference.md. Units are meters;
// +x is east, +z is south.
export const blueCrossLevels = Object.freeze({
  lobbyTop: 10.26, // fourteen floors under the lower band; estimate
  bands: [[65.7, 72.1], [117.1, 128.1], [170.1, 176.6]] as const, // mechanical floors
  occupied: 208.3, // the highest occupied floor, published
  roof: 212.8, // the central block's glass top
  wings: 212, // the end bays' roof, mapped
  top: 226.7, // the screen's top, the published architectural height
  module: 1.524, // 5 ft
  // Office floors between the bands, each run divided evenly: the lobby to the lower band,
  // then between the bands, and from the upper band to the top occupied floor.
  floors: [14, 11, 11, 8] as const,
});
const h = blueCrossLevels;
// Every office floor's level, from the lobby's top to the top occupied floor.
const zones: [number, number, number][] = [
  [h.lobbyTop, h.bands[0][0], h.floors[0]], [h.bands[0][1], h.bands[1][0], h.floors[1]],
  [h.bands[1][1], h.bands[2][0], h.floors[2]], [h.bands[2][1], h.occupied, h.floors[3]],
];
export const blueCrossFloors = [...zones.flatMap(([from, to, count]) => Array.from({ length: count }, (_, i) => from + (to - from) * i / count)), h.occupied];
const spandrelBelow = 0.3, spandrelAbove = 0.9;

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x414141, 0x464646, 0x3c3c3c, 0x4a4a4a].map(color);
const litGlass = color(0x8a8a8a), dimGlass = color(0x5c5c5c);
const spandrel = color(0x383838), recess = color(0x2a2a2a), screen = color(0x3e3e3e), lobby = color(0x333333), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 13, 0x9e3779b1) ^ Math.imul(bay + 37, 0x85ebca77) ^ Math.imul(wall + 23, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of a wall from the lobby's top: each office floor's spandrel and glass, each
// band, the parapet over the top floor, cut at the end bays' mapped roof, and the screen.
type Row = { lo: number; hi: number; kind: "glass" | "spandrel" | "band" | "screen"; floor: number };
const rows: Row[] = [];
{
  const push = (lo: number, hi: number, kind: Row["kind"], floor: number) => { if (hi - lo > 1e-6) rows.push({ lo, hi, kind, floor }); };
  let floor = 0;
  zones.forEach(([from, to, count], zone) => {
    for (let i = 0; i < count; i += 1, floor += 1) {
      const level = from + (to - from) * i / count, next = from + (to - from) * (i + 1) / count;
      push(rows.at(-1)?.hi ?? level, level + spandrelAbove, "spandrel", floor);
      push(level + spandrelAbove, next - spandrelBelow, "glass", floor);
    }
    const band = h.bands[zone];
    if (band) push(rows.at(-1)!.hi, band[1], "band", -1);
  });
  // The top occupied floor, under a parapet that rises past the end bays' roof to the
  // block's, and the screen above.
  push(rows.at(-1)!.hi, h.occupied + spandrelAbove, "spandrel", floor);
  push(h.occupied + spandrelAbove, h.wings - spandrelBelow, "glass", floor);
  push(h.wings - spandrelBelow, h.wings, "spandrel", -1);
  push(h.wings, h.roof, "spandrel", -1);
  push(h.roof, h.top, "screen", -1);
}
const rowsBetween = (lo: number, hi: number) => rows.filter((row) => row.lo >= lo - 1e-6 && row.hi <= hi + 1e-6);

export function createBlueCrossGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Blue Cross · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Blue Cross · glass, spandrels and bands", kit.material(0xffffff, { vertexColors: true }));
  const mullions = kit.batch("Blue Cross · mullions", kit.material(0x2c2c2c));
  const bars = kit.batch("Blue Cross · band columns and emblems", kit.material(0xb4b4b4));
  const windows: WindowCell[] = [];
  let windowColumns = 0;
  const outline = (way: number) => orient(polygonOf(projectPlan(record.parts.find((part) => part.way === way)!.coordinates)));
  const footprint = orient(polygonOf(projectPlan(record.footprint.coordinates)));
  const block = outline(284779637), slab = outline(284779635);

  // The end bays: the mapped 212 m part less the central block. The two parts share the
  // corners where the block meets each bay, so the slab's outline splits at those corners
  // into stretches inside the block and stretches outside it. Each outside stretch is a
  // bay's outer wall, closed along the block's wall, whose vertices between the same two
  // corners lie inside the slab.
  const near = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;
  const corners = slab.flatMap((p, i) => (block.some((q) => near(p, q)) ? [i] : []));
  const bays: Vec2[][] = corners.flatMap((a, k) => {
    const b = corners[(k + 1) % corners.length]!, path: Vec2[] = [];
    for (let i = a; ; i = (i + 1) % slab.length) { path.push(slab[i]!); if (i === b) break; }
    const [p, q] = [path[0]!, path[1]!];
    if (inside(block, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])) return [];
    const [from, to] = [block.findIndex((v) => near(v, path.at(-1)!)), block.findIndex((v) => near(v, path[0]!))];
    const walk = (step: number) => { const way: Vec2[] = []; for (let j = (from + step + block.length) % block.length; j !== to; j = (j + step + block.length) % block.length) way.push(block[j]!); return way; };
    const back = [walk(1), walk(-1)].find((way) => way.every((v) => inside(slab, v)))!;
    return [orient([...path, ...back])];
  });

  // A solid on an outline between two heights, its walls the shell's dark core.
  const solid = (corners: Vec2[], lo: number, hi: number, paint: THREE.Color) => {
    planOf(corners).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], paint);
    });
    paintedSlab(kit, shell, corners, lo, false, roofing);
    paintedSlab(kit, shell, corners, hi, true, roofing);
  };
  // The lobby fills the mapped outline to the first office floor.
  solid(footprint, 0, h.lobbyTop, lobby);
  solid(block, h.lobbyTop, h.top, spandrel);
  const middle = h.bands[1];
  for (const bay of bays) {
    solid(bay, h.lobbyTop, middle[0], spandrel);
    solid(bay, middle[1], h.wings, spandrel);
  }

  // A wall's skin between two heights, on the runs `keep` accepts: cells two modules wide on
  // every row, and mullions one module apart on the office floors. Each unbroken stretch of
  // kept runs along a chain is one box, held 2 cm clear of its ends.
  const skin = (corners: Vec2[], lo: number, hi: number, seed: number, keep: (run: Run) => boolean, lift = 0) => {
    const plan = planOf(corners), cuts = rowsBetween(lo, hi);
    const heights = [cuts[0]!.lo + lift, ...cuts.map((row) => row.hi)];
    const top = Math.min(hi, h.roof) - 0.05;
    chainsOf(plan).forEach((chain, index) => {
      const count = Math.max(1, Math.round(chain.length / h.module));
      const stations = Array.from({ length: count + 1 }, (_, i) => chain.length * i / count);
      const messageFace = seed === 0 && plan[chain.runs[0]!]!.normal(0)[1] > 0.9 && chain.length > 50;
      if (messageFace) windowColumns = count;
      const kept = chain.runs.map((run) => keep(plan[run]!));
      for (let k0 = kept.indexOf(true); k0 >= 0;) {
        let k1 = k0;
        while (kept[k1 + 1]) k1 += 1;
        const s0 = chain.starts[k0]! + 0.02, s1 = chain.starts[k1]! + plan[chain.runs[k1]!]!.length - 0.02;
        chainSkin(kit, wall, plan, chain, k0, k1, s0, s1, stations.filter((_, i) => messageFace || i % 2 === 0), heights, 0.02, 0.07, (cell, r) => {
          const row = cuts[r]!;
          if (row.kind === "glass") {
            if (messageFace) windows.push({ vertex: wall.positions.length / 3, column: cell - 1, floor: row.floor });
            // Subdivide the message face at every mullion while retaining its
            // original paired-pane colors when the lights are off.
            return paneColor(row.floor, messageFace ? Math.ceil(cell / 2) : cell, seed * 8 + index);
          }
          if (row.kind === "band") return recess;
          if (row.kind === "screen") return screen;
          return spandrel;
        }, spandrel);
        // Mullions on each office run, whole on one run and held clear of its ends. Their
        // backs stand a centimetre off the wall: on the block's side walls the middle band's
        // mullions start just inside the end bays, whose closing walls lie in that plane and
        // face the way the backs do.
        for (const s of stations) {
          const k = chain.starts.findIndex((from, i) => s < from + plan[chain.runs[i]!]!.length + 1e-9);
          if (k < k0 || k > k1) continue;
          const run = plan[chain.runs[k]!]!, along = Math.min(Math.max(s - chain.starts[k]!, 0.3), run.length - 0.3);
          if (run.length > 0.6 && top - lo > 1) kit.box(mullions, run.at(along), run.normal(0), 0.05, 0.01, 0.16, heights[0]! + 0.05, top);
        }
        k0 = kept.indexOf(true, k1 + 1);
      }
    });
  };
  // Whether a run lies along an outline's edges, and whether an end bay stands against it.
  const lies = (run: Run, on: Vec2[]) => [0, run.length / 2, run.length].every((s) => {
    const p = run.at(s);
    return on.some((q, i) => {
      const r = on[(i + 1) % on.length]!, [dx, dz] = [r[0] - q[0], r[1] - q[1]], l = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dz) / (l * l)));
      return Math.hypot(q[0] + dx * t - p[0], q[1] + dz * t - p[1]) < 0.05;
    });
  });
  const covered = (run: Run) => bays.some((bay) => inside(bay, run.at(run.length / 2, 0.5)));
  // The end bays cover the block's side walls except through the middle band and above
  // their roof, so its skin there keeps to those heights. The bays' own skins leave off the
  // runs they share with the block. `lift` raises the block's foot off the lobby's roof:
  // where the block meets a bay their skins cross, and their feet would share that plane.
  skin(block, h.lobbyTop, h.top, 0, (run) => !covered(run), 0.05);
  skin(block, middle[0] - spandrelBelow, middle[1], 0, covered);
  skin(block, h.wings, h.top, 0, covered);
  bays.forEach((bay, i) => {
    skin(bay, h.lobbyTop, middle[0], i + 1, (run) => !lies(run, block));
    skin(bay, middle[1], h.wings, i + 1, (run) => !lies(run, block));
  });

  // An emblem: a plate standing 7 to 30 cm off the screen, cut to an outline given across and
  // up from its centre. Its faces fan from the centre, which sees the whole outline, and its
  // sides follow the outline's edges.
  const emblem = (centre: Vec2, t: Vec2, n: Vec2, y: number, shape: Vec2[]) => {
    const point = ([u, v]: Vec2, depth: number): Vec3 => [centre[0] + t[0] * u + n[0] * depth, y + v, centre[1] + t[1] * u + n[1] * depth];
    const out: Vec3 = [n[0], 0, n[1]], back: Vec3 = [-n[0], 0, -n[1]];
    shape.forEach((p, i) => {
      const q = shape[(i + 1) % shape.length]!;
      kit.triangle(bars, [point([0, 0], 0.3), point(p, 0.3), point(q, 0.3)], [out, out, out]);
      kit.triangle(bars, [point([0, 0], 0.07), point(q, 0.07), point(p, 0.07)], [back, back, back]);
      // The edge's side faces away from the centre.
      const sign = Math.sign((q[1] - p[1]) * (p[0] + q[0]) - (q[0] - p[0]) * (p[1] + q[1])), length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const [across, up] = [sign * (q[1] - p[1]) / length, -sign * (q[0] - p[0]) / length];
      kit.quad(bars, [point(p, 0.07), point(q, 0.07), point(q, 0.3), point(p, 0.3)], [[t[0] * across, up, t[1] * across]]);
    });
  };
  // The company's emblems, 4.2 m tall: a cross, its arms a third of its span, and a shield,
  // square-shouldered and drawn to a point.
  const cross: Vec2[] = [[0.7, 2.1], [0.7, 0.7], [2.1, 0.7], [2.1, -0.7], [0.7, -0.7], [0.7, -2.1],
    [-0.7, -2.1], [-0.7, -0.7], [-2.1, -0.7], [-2.1, 0.7], [-0.7, 0.7], [-0.7, 2.1]];
  const shield: Vec2[] = [[-1.8, 2.1], [1.8, 2.1], [1.8, 0.3], [1.6, -0.7], [1.0, -1.5], [0, -2.1], [-1.0, -1.5], [-1.6, -0.7], [-1.8, 0.3]];

  // The block's columns, exposed in each band and in the screen on its long faces: eight
  // across each, one to a structural bay. The emblems stand in the screen's first two
  // bays at the south face's west end, the cross west of the shield.
  const faces = chainsOf(planOf(block)).filter(({ length }) => length > 50);
  faces.forEach((chain) => {
    const plan = planOf(block), run = plan[chain.runs[0]!]!, last = plan[chain.runs.at(-1)!]!;
    const a = run.at(0), b = last.at(last.length), n = run.normal(0), length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t: Vec2 = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    const at = (s: number): Vec2 => [a[0] + t[0] * s, a[1] + t[1] * s];
    const pitch = length / 8;
    for (let i = 0; i < 8; i += 1) {
      for (const [lo, hi] of [...h.bands, [h.roof + 0.4, h.top - 0.3]] as [number, number][]) kit.box(bars, at((i + 0.5) * pitch), n, 0.45, 0.07, 0.4, lo + 0.1, hi - 0.1);
    }
    // The south face runs west to east; the emblems stand in its first two bays.
    if (n[1] > 0.9) [cross, shield].forEach((shape, i) => emblem(at((i + 1) * pitch), t, n, h.roof + 6.7, shape));
  });

  const model = kit.finish({ height: h.top, outlines: [shell, mullions], opacity: 0.16 });
  const glass = model.building.getObjectByName(wall.name) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshToonMaterial>;
  model.illumination = createWindowIllumination(glass, windows, windowColumns);
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/blue-cross-reference.md" };
  return model;
}
