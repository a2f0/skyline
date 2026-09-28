import * as THREE from "../vendor/three-r186.js";
import { arc, createBuilder, inside, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, mitredBox, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// 340 on the Park, 340 East Randolph Street (Solomon Cordwell Buenz, 2007): the geographic
// layout's model, on the mapped outline 95486949 and its parts 284789056 and 284789058. The
// original layout has no model of it; the drawing shows it right of the Blue Cross and Blue
// Shield Tower, outside the excerpt it is fitted to.
//
// A glass tower on a straight south face, a diagonal south-east face and a north face
// curved to keep The Buckingham's views. A white concrete frame stands on the south face:
// piers, a beam every fifth floor, and a parapet band over four penthouse floors, with a
// ladder of cantilevered balconies inside its west pier and recessed balconies inside its
// east one. The two-and-a-half-storey winter garden fills the bay over the one deeper
// beam. A glazed block fills the foot of the diagonal face, up to the top of floor 16's
// beam. Floors are counted one by one from the lobby. Heights are measured on the drawing
// down from the published 204.9 m top; see docs/340-on-the-park-reference.md. Units are
// meters; +x is east, +z is south.
export const onTheParkLevels = Object.freeze({
  lowestBeam: 21.35, // floor 6's beam, the drawing's lowest
  topBeam: 184.2, // floor 61's, under the penthouses
  band: 198.6, // the parapet band's foot, over the fourth penthouse floor
  roof: 203.8, // the band's top and the roof deck
  top: 204.9, // the glass guard's top, the published architectural height
  beam: 1.45, // a beam's depth; the winter garden's is 2.2 m
});
const h = onTheParkLevels;
const pitch = (h.topBeam - h.lowestBeam) / 55, penthouse = (h.band - h.topBeam) / 4;
// Each floor's level, from the second, over the lobby, to a 65th at the band's foot.
const floor = (n: number) => (n <= 61 ? h.lowestBeam + (n - 6) * pitch : h.topBeam + (n - 61) * penthouse);
const beamFloors = Array.from({ length: 12 }, (_, k) => 6 + 5 * k), garden = 26;
const beamSpan = (n: number): [number, number] => { const half = (n === garden ? 2.2 : h.beam) / 2; return [floor(n) - half, floor(n) + half]; };
// The corner block's roof, level with the top of floor 16's beam.
const podiumTop = beamSpan(16)[1];

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x2c2c2c, 0x303030, 0x343434, 0x383838].map(color);
const litGlass = color(0x7a7a7a), dimGlass = color(0x4a4a4a);
const slab = color(0x2a2a2a), recess = color(0x242424), lobby = color(0x3a3a3a), plant = color(0x303030);
const concrete = color(0xb4b4b4), core = color(0x262626), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 17, 0x9e3779b1) ^ Math.imul(bay + 41, 0x85ebca77) ^ Math.imul(wall + 29, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// A wall's rows from `foot`, clear of grade where the mapped outline ends, to `top`: the
// lobby, then each floor's slab and glass, and over the penthouses the plant floor's glass.
// In the winter garden, `gardenRow` runs floors 26 to 28 into one tall row.
type Row = { lo: number; hi: number; kind: "lobby" | "glass" | "slab" | "plant"; floor: number };
function rowsTo(top: number, { gardenRow = false, foot = 0.25 } = {}): Row[] {
  const rows: Row[] = [];
  const push = (lo: number, hi: number, kind: Row["kind"], n: number) => {
    const [a, b] = [Math.max(lo, rows.at(-1)?.hi ?? foot), Math.min(hi, top)];
    if (b - a > 1e-6) rows.push({ lo: a, hi: b, kind, floor: n });
  };
  push(foot, floor(2) - 0.3, "lobby", 1);
  for (let n = 2; n <= 64; n += 1) {
    if (gardenRow && n > garden && n < garden + 3) continue;
    push(floor(n) - 0.3, floor(n) + 0.3, "slab", n);
    push(floor(n) + 0.3, floor(gardenRow && n === garden ? n + 3 : n + 1) - 0.3, "glass", n);
  }
  push(floor(65) - 0.3, floor(65) + 0.3, "slab", 65);
  push(floor(65) + 0.3, top, "plant", 65);
  return rows;
}

export function createOnTheParkGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("340 on the Park · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("340 on the Park · curtain wall", kit.material(0xffffff, { vertexColors: true }));
  const frame = kit.batch("340 on the Park · concrete frame", kit.material(0xb4b4b4));
  const rails = kit.batch("340 on the Park · railings and guards", kit.material(0x7c7c7c));
  const outline = (way: number) => orient(polygonOf(projectPlan(record.parts.find((part) => part.way === way)!.coordinates)));
  const tower = outline(284789056), podium = outline(284789058);

  // A solid on an outline between two heights, its walls the shell's dark core.
  const solid = (corners: Vec2[], lo: number, hi: number) => {
    planOf(corners).forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], hi, b[1]], [a[0], hi, a[1]]], [[n[0], 0, n[1]]], core);
    });
    paintedSlab(kit, shell, corners, lo, false, roofing);
    paintedSlab(kit, shell, corners, hi, true, roofing);
  };
  solid(tower, 0, h.roof);
  solid(podium, 0, podiumTop);

  // Whether a run lies along an outline's edges, and whether the corner block stands
  // against it.
  const lies = (run: Run, on: Vec2[]) => [0, run.length / 2, run.length].every((s) => {
    const p = run.at(s);
    return on.some((q, i) => {
      const r = on[(i + 1) % on.length]!, [dx, dz] = [r[0] - q[0], r[1] - q[1]], l = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dz) / (l * l)));
      return Math.hypot(q[0] + dx * t - p[0], q[1] + dz * t - p[1]) < 0.05;
    });
  });
  const covered = (run: Run) => inside(podium, run.at(run.length / 2, 0.5));

  // A cell is painted by its row and by where its middle stands along the wall.
  const paint = (cuts: Row[], face: number, recessed = (_s: number) => false, white = (_s: number) => false) => (s: number, r: number) => {
    const row = cuts[r]!;
    if (row.kind === "lobby") return lobby;
    if (row.kind === "plant") return plant;
    if (row.kind === "slab") return white(s) ? concrete : slab;
    return recessed(s) ? recess : paneColor(row.floor, Math.round(s / 3), face);
  };
  // A wall's skin, on the runs `keep` accepts: cells about two 5 ft modules wide on every
  // row. Each unbroken stretch of kept runs along a chain is one box, held 2 cm clear of its
  // ends, or 9 cm, past its own depth, where the outline turns in and the next wall's skin
  // would otherwise cross it.
  const skin = (corners: Vec2[], cuts: Row[], seed: number, keep: (run: Run) => boolean) => {
    const plan = planOf(corners), heights = [cuts[0]!.lo, ...cuts.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      const count = Math.max(1, Math.round(chain.length / 3.048));
      const columns = Array.from({ length: count + 1 }, (_, i) => chain.length * i / count);
      const kept = chain.runs.map((run) => keep(plan[run]!));
      for (let k0 = kept.indexOf(true); k0 >= 0;) {
        let k1 = k0;
        while (kept[k1 + 1]) k1 += 1;
        const clear = (k: number, end: 0 | 1) => (turnsAt(plan, chain.runs[k]!)[end] > 0 && (end ? k === chain.runs.length - 1 : k === 0) ? 0.09 : 0.02);
        const s0 = chain.starts[k0]! + clear(k0, 0), s1 = chain.starts[k1]! + plan[chain.runs[k1]!]!.length - clear(k1, 1);
        const colour = paint(cuts, seed * 8 + index);
        chainSkin(kit, wall, plan, chain, k0, k1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => colour(((columns[bay - 1] ?? s0) + (columns[bay] ?? s1)) / 2, r), slab);
        k0 = kept.indexOf(true, k1 + 1);
      }
    });
  };

  // The south face and its frame, laid out from the photograph, west to east: a 1.92 m pier,
  // a column of windows, the balcony ladder, a 2.24 m pier, the glass field, the recessed
  // balconies and a 2.24 m pier at the face's east end.
  const facesSouth = (run: Run) => run.normal(0)[1] > 0.99 && run.length > 40;
  const plan = planOf(tower), chains = chainsOf(plan);
  const southChain = chains.find((chain) => chain.runs.length === 1 && facesSouth(plan[chain.runs[0]!]!))!;
  const south = plan[southChain.runs[0]!]!, L = south.length, n = south.normal(0);
  const westFirst = south.at(0)[0] < south.at(L)[0], scale = L / 43.2;
  const along = (s: number) => (westFirst ? s * scale : L - s * scale);
  const at = (s0: number, s1: number) => south.at((along(s0) + along(s1)) / 2);
  const half = (s0: number, s1: number) => Math.abs(along(s1) - along(s0)) / 2;
  const between = (s: number, a: number, b: number) => { const x = westFirst ? s / scale : (L - s) / scale; return x >= a - 1e-6 && x < b - 1e-6; };
  const piers: [number, number][] = [[0, 1.92], [8.0, 10.24], [40.96, 43.2]];
  const [ladder, field, balconies] = [[4.8, 8.0], [10.24, 34.24], [34.24, 40.96]] as const;

  // The south face's skin in three boxes that meet under the inner and east piers, running
  // on behind the band to the roof so the piers' tops never share its top's plane. The
  // middle one carries the winter garden's tall row; the column of windows is punched in
  // white wall, and the balconies' glass stands in shadow.
  const southRows = rowsTo(h.roof), gardenRows = rowsTo(h.roof, { gardenRow: true });
  const southColumns = [0, 1.92, 3.36, 4.8, 6.4, 8.0, 9.12, 10.24, ...Array.from({ length: 8 }, (_, i) => 13.24 + 3 * i), 35.92, 37.6, 39.28, 40.96, 42.08, 43.2].map(along).sort((a, b) => a - b);
  const sections: [number, number, Row[]][] = [[0, 9.12, southRows], [9.12, 42.08, gardenRows], [42.08, 43.2, southRows]];
  sections.forEach(([a, b, cuts], i) => {
    const [s0, s1] = [Math.min(along(a), along(b)), Math.max(along(a), along(b))];
    const colour = paint(cuts, i, (s) => between(s, ...ladder) || between(s, ...balconies), (s) => between(s, 1.92, 4.8));
    const inset = (s: number, end: boolean) => (s < 0.01 || s > L - 0.01 ? (end ? -0.02 : 0.02) : end ? -0.01 : 0.01);
    chainSkin(kit, wall, plan, southChain, 0, 0, s0 + inset(s0, false), s1 + inset(s1, true), southColumns, [cuts[0]!.lo, ...cuts.map((row) => row.hi)], 0.02, 0.07,
      (bay, r) => colour(((southColumns[bay - 1] ?? s0) + (southColumns[bay] ?? s1)) / 2, r), slab);
  });

  // The frame: piers from above grade to the band, a beam every fifth floor between the
  // inner and east piers, deeper under the winter garden, and the parapet band over all.
  for (const [a, b] of piers) kit.box(frame, at(a, b), n, half(a, b), 0.05, 0.6, 0.3, h.band);
  for (const f of beamFloors) { const [lo, hi] = beamSpan(f); kit.box(frame, at(8.3, 42.9), n, half(8.3, 42.9), 0.07, 0.45, lo, hi); }
  kit.box(frame, at(0, 43.2), n, half(0, 43.2) - 0.001, 0.07, 0.65, h.band, h.roof);
  // The ladder's cantilevered balconies, a slab and a glass railing on each floor to the
  // 60th.
  for (let f = 2; f <= 60; f += 1) {
    kit.box(frame, at(...ladder), n, half(...ladder), 0.07, 1.5, floor(f) - 0.15, floor(f) + 0.15);
    kit.box(rails, at(...ladder), n, half(...ladder) - 0.05, 1.37, 1.45, floor(f) + 0.15, floor(f) + 1.05);
  }
  // Railings on the frame's plane: the recessed balconies on every floor but the winter
  // garden's, and across the glass field on the garden's floors and the penthouses'. A
  // railing stands on its floor's slab edge, or 2 cm over the beam where one crosses, clear
  // of the feet of the columns and posts it passes.
  for (let f = 2; f <= 64; f += 1) {
    if (f > garden && f < garden + 3) continue;
    const wide = f === garden || f === garden + 3 || f === garden + 4 || f >= 61;
    const [a, b] = wide ? [field[0], balconies[1]] : balconies;
    const base = beamFloors.includes(f) ? beamSpan(f)[1] + 0.02 : floor(f) + 0.15;
    if (!beamFloors.includes(f)) kit.box(frame, at(a, b), n, half(a, b), 0.07, 0.3, floor(f) - 0.15, floor(f) + 0.15);
    kit.box(rails, at(a, b), n, half(a, b), 0.22, 0.28, base, base + 0.9);
  }
  // Three round columns through the winter garden's bay, and square posts at the same
  // stations through the penthouses.
  for (const s of [17.3, 25.6, 33.9]) {
    const c = south.at(along(s), 0.62);
    kit.prism(frame, [arc(c, 0.45, 0, 2 * Math.PI, false, Math.PI / 6)], [beamSpan(garden)[1], beamSpan(garden + 5)[0]]);
    kit.box(frame, south.at(along(s)), n, 0.3, 0.05, 0.6, beamSpan(61)[1], h.band);
  }

  // The other walls: glass to the roof, the diagonal face's foot left to the corner block,
  // which carries its own from a little higher so the two skins' feet never share a plane.
  const plain = rowsTo(h.roof);
  skin(tower, plain, 1, (run) => !facesSouth(run) && !covered(run) && !lies(run, podium));
  skin(tower, plain.filter((row) => row.hi > podiumTop + 1e-6).map((row, i) => (i === 0 ? { ...row, lo: podiumTop } : row)), 2, covered);
  skin(podium, rowsTo(podiumTop, { foot: 0.3 }), 3, (run) => !lies(run, tower));
  // Fins at the beam floors and the top penthouse floor cross the diagonal face's last
  // 8.6 m, where the drawing puts them, up to a white pier at the east tip.
  const diagonal = chains.find((chain) => chain.runs.length === 2 && plan[chain.runs[0]!]!.normal(0)[0] > 0.6)!;
  const tipFirst = !covered(plan[diagonal.runs[0]!]!);
  const [finFrom, finTo] = tipFirst ? [0, 8.6] : [diagonal.length - 8.6, diagonal.length];
  diagonal.runs.forEach((index, k) => {
    const run = plan[index]!, start = diagonal.starts[k]!;
    const [s0, s1] = [Math.max(finFrom - start, 0), Math.min(finTo - start, run.length)];
    if (s1 - s0 < 0.1) return;
    const [before, after] = turnsAt(plan, index);
    for (const f of [...beamFloors, 64]) {
      const [lo, hi] = [floor(f) - 0.35, floor(f) + 0.35];
      if (covered(run) && lo < podiumTop) continue;
      mitredBox(kit, frame, run, s0, s1, s0 < 1e-6 ? before : undefined, s1 > run.length - 1e-6 ? after : undefined, 0.3, lo, hi);
    }
  });
  const tip = plan[diagonal.runs[tipFirst ? 0 : 1]!]!;
  kit.box(frame, tip.at(tipFirst ? 0.45 : tip.length - 0.45), tip.normal(0), 0.45, 0.05, 0.4, 0.3, h.roof - 0.1);

  // Glass guards round the roof and the corner block's terrace. The terrace's stop 30 cm
  // short of the tower, whose diagonal face meets the block's walls at acute corners and
  // whose skin reaches just past them.
  plan.forEach((run, i) => { const [before, after] = turnsAt(plan, i); mitredBox(kit, rails, run, 0, run.length, before, after, 0.06, h.roof, h.top); });
  const block = planOf(podium);
  block.forEach((run, i) => {
    if (lies(run, tower)) return;
    const [before, after] = turnsAt(block, i), ends = [lies(block[(i + block.length - 1) % block.length]!, tower), lies(block[(i + 1) % block.length]!, tower)];
    mitredBox(kit, rails, run, ends[0] ? 0.3 : 0, run.length - (ends[1] ? 0.3 : 0), ends[0] ? undefined : before, ends[1] ? undefined : after, 0.06, podiumTop, podiumTop + 1.1);
  });

  const model = kit.finish({ height: h.top, outlines: [shell, frame], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/340-on-the-park-reference.md" };
  return model;
}
