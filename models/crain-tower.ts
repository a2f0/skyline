import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside, line } from "./building-kit.js";
import type { BatchData, BuildingModel, Builder, Plan, Run, Vec2, Vec3 } from "./building-kit.js";

// The Crain Communications Building, 150 North Michigan Avenue (A. Epstein and Sons, 1984),
// shared by the drawing-fitted model and the geographic one. The tower is two prisms split
// along its north-west to south-east diagonal. Each carries a glazed roof sloping down
// toward the south-east, so from Millennium Park the two roofs read as one diamond cut by a
// slot. The halves stand slightly apart: a V-notch opens at each end of the split. Between
// the peaks the slot is open down to a 152.5 m floor. Around them runs a curtain wall of
// white aluminum spandrels and continuous ribbon windows.
//
// A form lists its volumes in real heights above the street; `base` is the height the
// model's y = 0 stands at, so a model can start above grade. See docs/crain-reference.md.
// Units are meters; +x is east and +z is south.

export interface CrainVolume {
  // Plan corners in any winding; they are ordered counterclockwise from above here.
  corners: Vec2[];
  // The roof height above the street at a plan point: a plane, sloped or flat.
  roof: (point: Vec2) => number;
  // A sloped roof is the glazed diamond; a flat one is the slot's floor.
  glazed: boolean;
}

export interface CrainForm {
  name: string;
  id: string;
  volumes: CrainVolume[];
  // The real height at the model's y = 0.
  base: number;
  // The roof grid's axes: its origin and the direction of the first axis in plan.
  grid: { origin: Vec2; axis: Vec2 };
  // Geographic crown research: exposed outer walls have plant louvers and three
  // recessed strips below solid metal tips. Omit to retain the drawing fit.
  crown?: { officeTop: number; louvers: readonly (readonly [number, number])[]; recesses: readonly (readonly [number, number])[] };
}

// The curtain wall's rhythm. The drawing and the photograph both give a 3.5 m band pitch,
// so the 41 published floors, above a taller lobby, fit under the 152.5 m main roof. Each
// floor is a ribbon of glass between sill and head, with white spandrels covering the slab.
export const crainFloors = Object.freeze({
  lobbyTop: 7.0,
  pitch: 3.5,
  sill: 0.9,
  head: 2.55,
  module: 1.524,
  lobbyGlass: [0.45, 5.9] as const,
});
export const crainMainRoof = 152.5;

const orient = (corners: Vec2[]): Vec2[] => {
  const area = corners.reduce((sum, [x, z], i) => { const [x2, z2] = corners[(i + 1) % corners.length]!; return sum + x * z2 - x2 * z; }, 0);
  return area < 0 ? corners : [...corners].reverse();
};
const planOf = (corners: Vec2[]): Plan => corners.map((corner, i) => line(corner, corners[(i + 1) % corners.length]!));

// The ribbon glazing's tones: mostly dark reflective glass, with a few lit and dim panes.
const paneTones = [0x232323, 0x2a2a2a, 0x303030, 0x1f1f1f].map((hex) => new THREE.Color(hex));
const litPane = new THREE.Color(0x8a8a8a), dimPane = new THREE.Color(0x565656), mullionTone = new THREE.Color(0x585858);
function paneColor(row: number, module: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 29, 0x9e3779b1) ^ Math.imul(module + 41, 0x85ebca77) ^ Math.imul(wall + 13, 0xc2b2ae3d)) >>> 0;
  const value = hash % 97;
  if (value < 3) return litPane;
  if (value < 6) return dimPane;
  return paneTones[value % paneTones.length]!;
}

// A plane's upward normal from a height function sampled around a point.
function slopeNormal(roof: (point: Vec2) => number, [x, z]: Vec2): Vec3 {
  const dx = roof([x + 1, z]) - roof([x, z]), dz = roof([x, z + 1]) - roof([x, z]);
  const length = Math.hypot(dx, 1, dz);
  return [-dx / length, 1 / length, -dz / length];
}
function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const length = Math.hypot(...n);
  return [n[0] / length, n[1] / length, n[2] / length];
}

// Where a line crosses a polygon, as the parameter intervals that lie inside it.
function clipLine(polygon: Vec2[], origin: Vec2, direction: Vec2): [number, number][] {
  const hits: number[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
    const e: Vec2 = [b[0] - a[0], b[1] - a[1]];
    const denominator = direction[0] * e[1] - direction[1] * e[0];
    if (Math.abs(denominator) < 1e-12) continue;
    const w: Vec2 = [a[0] - origin[0], a[1] - origin[1]];
    const t = (w[0] * e[1] - w[1] * e[0]) / denominator, u = (w[0] * direction[1] - w[1] * direction[0]) / denominator;
    if (u >= 0 && u < 1) hits.push(t);
  }
  hits.sort((p, q) => p - q);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) spans.push([hits[i]!, hits[i + 1]!]);
  return spans;
}

export function buildCrainTower(form: CrainForm): BuildingModel {
  const kit: Builder = createBuilder(form.name, form.id);
  const shell = kit.batch("Crain · aluminum spandrels", kit.material(0xc4c4c4));
  const ribbons = kit.batch("Crain · ribbon glazing", kit.material(0xffffff, { vertexColors: true }));
  const glazing = kit.batch("Crain · sloped glazing", kit.material(0x333333));
  const grid = kit.batch("Crain · glazing grid", kit.material(0x727272));
  const lights = kit.batch("Crain · diamond outline lights", kit.material(0xf0f0f0));
  const coping = kit.batch("Crain · coping", kit.material(0x5c5c5c));
  const deck = kit.batch("Crain · slot floor", kit.material(0x4a4a4a));
  const vents = form.crown ? kit.batch("Crain · mechanical louvers", kit.material(0xffffff, { vertexColors: true })) : ribbons;
  const blades = form.crown ? kit.batch("Crain · louver blades", kit.material(0xffffff, { vertexColors: true })) : ribbons;
  const recesses = form.crown ? kit.batch("Crain · crown recesses", kit.material(0xffffff, { vertexColors: true })) : ribbons;
  const ventTone = new THREE.Color(0x303030), bladeTone = new THREE.Color(0x696969), recessTone = new THREE.Color(0x252525);
  type Surface = "glass" | "vent" | "blade" | "recess";
  const base = form.base;
  const volumes = form.volumes.map((volume) => {
    const corners = orient(volume.corners);
    return { ...volume, corners, plan: planOf(corners) };
  });

  // Model height from a real height.
  const y = (real: number) => real - base;

  // A slab of the plan lifted onto a plane `drop` below the roof. kit.slab lays a flat
  // polygon; lifting its vertices keeps each triangle planar, and its winding still faces
  // the way it was laid, so the normal follows the plane, flipped for a downward face.
  const liftedSlab = (target: BatchData, corners: Vec2[], roof: (point: Vec2) => number, drop: number, up: boolean) => {
    const start = target.positions.length;
    kit.slab(target, corners, 0, up);
    const n = slopeNormal(roof, corners[0]!), normal = up ? n : [-n[0], -n[1], -n[2]];
    for (let i = start; i < target.positions.length; i += 3) {
      target.positions[i + 1] = y(roof([target.positions[i]!, target.positions[i + 2]!]) - drop);
      target.normals.splice(i, 3, ...normal);
    }
  };

  // The masses: walls, a floor, and a lid a skin's depth under the roof, closed within the
  // spandrels' mesh. The roof itself is a thin closed slab on the lid, glass on the halves
  // and a deck on the slot's floor, so it stays the building's top. Neighbouring volumes
  // keep their own walls on shared edges, facing opposite ways.
  const skin = 0.05;
  for (const volume of volumes) {
    const { corners, plan, roof } = volume;
    const top = volume.glazed ? glazing : deck;
    for (const run of plan) {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0), normal: Vec3 = [n[0], 0, n[1]];
      kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], y(roof(b) - skin), b[1]], [a[0], y(roof(a) - skin), a[1]]], [normal]);
      kit.quad(top, [[a[0], y(roof(a) - skin), a[1]], [b[0], y(roof(b) - skin), b[1]], [b[0], y(roof(b)), b[1]], [a[0], y(roof(a)), a[1]]], [normal]);
    }
    kit.slab(shell, corners, 0, false);
    liftedSlab(shell, corners, roof, skin, true);
    liftedSlab(top, corners, roof, skin, false);
    liftedSlab(top, corners, roof, 0, true);
  }

  // A wall is exposed where no neighbour stands against it, and a neighbour's roof covers
  // it up to that roof's height. Probing just outside the wall splits a run into stretches,
  // each facing open air or one neighbour, so a plan needs no corner where that changes.
  const neighbourAt = (self: number, run: Run, s: number) => volumes.findIndex((volume, index) => index !== self && inside(volume.corners, run.at(s, 0.3)));
  const stretches = (self: number, run: Run) => {
    const out: { from: number; to: number; neighbour: number }[] = [];
    let start = 0, current = neighbourAt(self, run, Math.min(0.05, run.length / 2));
    for (let s = 0.25; s < run.length - 0.05; s += 0.25) {
      if (neighbourAt(self, run, s) === current) continue;
      let low = s - 0.25, high = s;
      for (let i = 0; i < 30; i += 1) { const middle = (low + high) / 2; if (neighbourAt(self, run, middle) === current) low = middle; else high = middle; }
      out.push({ from: start, to: high, neighbour: current });
      start = high;
      current = neighbourAt(self, run, s);
    }
    out.push({ from: start, to: run.length, neighbour: current });
    // Near an acute corner the probe can land outside the neighbour for a few centimetres;
    // no real change of neighbour comes that close to a corner, so a short stretch joins
    // the longer one beside it.
    for (let i = out.findIndex((piece) => piece.to - piece.from < 0.6); out.length > 1 && i >= 0; i = out.findIndex((piece) => piece.to - piece.from < 0.6)) {
      const piece = out[i]!, before = out[i - 1], after = out[i + 1];
      const into = !after || (before && before.to - before.from >= after.to - after.from) ? before! : after;
      into.from = Math.min(into.from, piece.from);
      into.to = Math.max(into.to, piece.to);
      out.splice(i, 1);
    }
    return out;
  };

  // A closed box on a run between two heights that each vary linearly along it. Its front is
  // cut into panes and mullions on the curtain wall's module, counted from the run's start so
  // mullions line up from floor to floor.
  const strip = (run: Run, from: number, to: number, b0: number, b1: number, t0: number, t1: number, row: number, wall: number, surface: Surface) => {
    const target = surface === "glass" ? ribbons : surface === "vent" ? vents : surface === "blade" ? blades : recesses;
    const back = surface === "blade" ? 0.045 : 0.02, front = surface === "blade" ? 0.13 : 0.08;
    const n = run.normal(0), tangent: Vec2 = [n[1], -n[0]];
    const at = (s: number, depth: number, h: number): Vec3 => { const p = run.at(s, depth); return [p[0], y(h), p[1]]; };
    const bottom = (s: number) => b0 + (b1 - b0) * (s - from) / (to - from), top = (s: number) => t0 + (t1 - t0) * (s - from) / (to - from);
    const outward: Vec3 = [n[0], 0, n[1]];
    const cuts = [from];
    const module = crainFloors.module, half = 0.035;
    if (surface !== "blade") for (let k = Math.ceil((from + half) / module); k * module < to - half; k += 1) cuts.push(k * module - half, k * module + half);
    cuts.push(to);
    for (let i = 0; i + 1 < cuts.length; i += 1) {
      const sa = cuts[i]!, sb = cuts[i + 1]!;
      if (sb - sa < 1e-6) continue;
      const mullion = i % 2 === 1;
      const color = mullion ? mullionTone : surface === "glass" ? paneColor(row, Math.floor((sa + sb) / 2 / module), wall)
        : surface === "vent" ? ventTone : surface === "blade" ? bladeTone : recessTone;
      kit.quad(target, [at(sa, front, bottom(sa)), at(sb, front, bottom(sb)), at(sb, front, top(sb)), at(sa, front, top(sa))], [outward], color);
    }
    const dark = paneTones[0]!;
    kit.quad(target, [at(to, back, b1), at(from, back, b0), at(from, back, t0), at(to, back, t1)], [[-n[0], 0, -n[1]]], dark);
    // The top and bottom fan out from a back corner through every cut on the front, so each
    // pane's edge meets its partner and the strip closes without T-junctions.
    const ends = cuts.filter((s, i) => i === 0 || s - cuts[i - 1]! >= 1e-6);
    const fan = (height: (s: number) => number, h0: number, h1: number, up: boolean) => {
      const hinge = at(from, back, h0), front0 = at(from, front, h0);
      const normal = faceNormal(hinge, at(to, back, h1), front0);
      const facing: Vec3 = (normal[1] > 0) === up ? normal : [-normal[0], -normal[1], -normal[2]];
      for (let i = 0; i + 1 < ends.length; i += 1) kit.triangle(target, [hinge, at(ends[i]!, front, height(ends[i]!)), at(ends[i + 1]!, front, height(ends[i + 1]!))], [facing, facing, facing], dark);
      kit.triangle(target, [hinge, at(to, front, h1), at(to, back, h1)], [facing, facing, facing], dark);
    };
    fan(top, t0, t1, true);
    fan(bottom, b0, b1, false);
    kit.quad(target, [at(from, front, b0), at(from, back, b0), at(from, back, t0), at(from, front, t0)], [[-tangent[0], 0, -tangent[1]]], dark);
    kit.quad(target, [at(to, back, b1), at(to, front, b1), at(to, front, t1), at(to, back, t1)], [[tangent[0], 0, tangent[1]]], dark);
  };

  // Ribbons stop this far under the roof edge, below the deepest fascia hung there, so the
  // two never meet in one plane where a traced wall splits into collinear pieces.
  const underRoof = 0.8;
  // One ribbon on one wall: between the band's sill and head, under the roof, and above any
  // neighbour. The bounds are linear along the run, so splitting it where one bound overtakes
  // another leaves pieces whose bottom and top are each a single linear function.
  const ribbon = (run: Run, clear: [number, number], roof: (s: number) => number, cover: ((s: number) => number) | null, g0: number, g1: number, row: number, wall: number, surface: Surface = "glass") => {
    const least = 0.05;
    const from = clear[0], to = run.length - clear[1];
    if (to - from < 0.3) return;
    const low = (s: number) => Math.max(g0, cover ? cover(s) + 0.2 : -Infinity, base);
    const high = (s: number) => Math.min(g1, roof(s) - underRoof);
    // Each bound is the larger or smaller of linear pieces; split where they trade places.
    const trades = [(s: number) => roof(s) - underRoof - g1];
    if (cover) trades.push((s: number) => cover(s) + 0.2 - g0, (s: number) => cover(s) + 0.2 - base);
    const breaks = [from, to];
    for (const f of trades) {
      const fa = f(from), fb = f(to);
      if ((fa > 0) !== (fb > 0)) breaks.push(from + (to - from) * fa / (fa - fb));
    }
    breaks.sort((p, q) => p - q);
    for (let i = 0; i + 1 < breaks.length; i += 1) {
      let sa = breaks[i]!, sb = breaks[i + 1]!;
      // Within a piece the ribbon's height is linear. Where the roof or a neighbour pinches
      // it off, end the piece where it is still `least` tall rather than at a knife edge.
      const ha = high(sa) - low(sa), hb = high(sb) - low(sb);
      if (ha < least && hb < least) continue;
      if (ha < least) sa += (sb - sa) * (least - ha) / (hb - ha);
      else if (hb < least) sb -= (sb - sa) * (least - hb) / (ha - hb);
      if (sb - sa < 0.12) continue;
      strip(run, sa, sb, low(sa), low(sb), high(sa), high(sb), row, wall, surface);
    }
  };

  // A fascia hung on a wall just under its roof edge: its top follows the edge, flush with
  // the roof, and it stands out from the wall rather than over the roof, so it never shares
  // the roof's plane and the roof stays the building's top. At a convex corner it runs on by
  // its own width to close the corner with its neighbour.
  const fascia = (target: BatchData, run: Run, roof: (point: Vec2) => number, width: number, drop: number, extend: [number, number]) => {
    const s0 = -extend[0], s1 = run.length + extend[1], n = run.normal(0), tangent: Vec2 = [n[1], -n[0]];
    const at = (s: number, depth: number, lower: number): Vec3 => { const p = run.at(s, depth); return [p[0], y(roof(run.at(s)) - lower), p[1]]; };
    const T: [Vec3, Vec3, Vec3, Vec3] = [at(s0, 0, 0), at(s0, width, 0), at(s1, width, 0), at(s1, 0, 0)];
    const b: [Vec3, Vec3, Vec3, Vec3] = [at(s0, 0, drop), at(s1, 0, drop), at(s1, width, drop), at(s0, width, drop)];
    kit.quad(target, T, [faceNormal(T[0], T[1], T[2])]);
    kit.quad(target, b, [faceNormal(b[0], b[1], b[2])]);
    kit.quad(target, [at(s0, width, drop), at(s1, width, drop), at(s1, width, 0), at(s0, width, 0)], [[n[0], 0, n[1]]]);
    kit.quad(target, [at(s1, 0, drop), at(s0, 0, drop), at(s0, 0, 0), at(s1, 0, 0)], [[-n[0], 0, -n[1]]]);
    kit.quad(target, [at(s0, 0, drop), at(s0, width, drop), at(s0, width, 0), at(s0, 0, 0)], [[-tangent[0], 0, -tangent[1]]]);
    kit.quad(target, [at(s1, width, drop), at(s1, 0, drop), at(s1, 0, 0), at(s1, width, 0)], [[tangent[0], 0, tangent[1]]]);
  };
  // A slim bar on a roof between two plan points, for the glazing grid. Every corner sits a
  // fixed height off the roof plane, so its top and bottom lie parallel to the glass across
  // its width as well as along it.
  const roofBox = (target: BatchData, p0: Vec2, p1: Vec2, roof: (point: Vec2) => number, halfWidth: number, lift: number, drop: number) => {
    const chord = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const t: Vec2 = [(p1[0] - p0[0]) / chord, (p1[1] - p0[1]) / chord], n: Vec2 = [-t[1], t[0]];
    const corner = (end: Vec2, across: number, offset: number): Vec3 => {
      const at: Vec2 = [end[0] + n[0] * across, end[1] + n[1] * across];
      return [at[0], y(roof(at) + offset), at[1]];
    };
    const b = [corner(p0, -halfWidth, -drop), corner(p0, halfWidth, -drop), corner(p1, halfWidth, -drop), corner(p1, -halfWidth, -drop)] as [Vec3, Vec3, Vec3, Vec3];
    const T = [corner(p0, -halfWidth, lift), corner(p0, halfWidth, lift), corner(p1, halfWidth, lift), corner(p1, -halfWidth, lift)] as [Vec3, Vec3, Vec3, Vec3];
    kit.quad(target, [T[0], T[1], T[2], T[3]], [faceNormal(T[0], T[1], T[2])]);
    kit.quad(target, [b[0], b[3], b[2], b[1]], [faceNormal(b[0], b[3], b[2])]);
    for (const i of [0, 1, 2, 3]) {
      const j = (i + 1) % 4;
      kit.quad(target, [T[j]!, T[i]!, b[i]!, b[j]!], [faceNormal(T[j]!, T[i]!, b[i]!)]);
    }
  };

  // How a run meets its neighbour at each end: the signed angle between their outward
  // normals, negative at a convex corner, positive at a concave one, and near zero where a
  // traced outline splits one wall into nearly collinear pieces.
  const straight = 5 * Math.PI / 180;
  const turns = (plan: Plan, index: number): [number, number] => {
    const turn = (a: Run, b: Run) => { const n1 = a.normal(a.length), n2 = b.normal(0); return Math.atan2(n1[0] * n2[1] - n1[1] * n2[0], n1[0] * n2[0] + n1[1] * n2[1]); };
    const count = plan.length, run = plan[index]!;
    return [turn(plan[(index + count - 1) % count]!, run), turn(run, plan[(index + 1) % count]!)];
  };
  // Two walls' ribbons stand out 0.08 m and cross within this distance of their corner; the
  // sharper the turn, the further, so a ribbon stops that far short of it. Across a nearly
  // straight joint a 2 mm gap is enough, and keeps their level sills and heads from
  // overlapping in the same plane.
  const cornerClearance = (turn: number) => 0.08 * Math.tan(Math.abs(turn) / 2) + (Math.abs(turn) < straight ? 0.002 : 0.025);

  let wall = 0;
  volumes.forEach((volume, self) => {
    volume.plan.forEach((whole, index) => {
      const [startTurn, endTurn] = turns(volume.plan, index);
      stretches(self, whole).forEach(({ from, to, neighbour }, piece, all) => {
        wall += 1;
        // A stretch is its own run, so everything below measures along it; a whole run keeps
        // its mullions counted from its own start.
        const run = from === 0 && to === whole.length ? whole : line(whole.at(from), whole.at(to));
        const covering = neighbour < 0 ? null : volumes[neighbour]!;
        const cover = covering ? (s: number) => covering.roof(run.at(s)) : null;
        const roof = (s: number) => volume.roof(run.at(s));
        // Ribbons run on across a straight joint and stop short of a corner, so the two walls'
        // ribbons never overlap there.
        const first = piece === 0, last = piece === all.length - 1;
        const clear: [number, number] = [cornerClearance(first ? startTurn : 0), cornerClearance(last ? endTurn : 0)];
        const n = run.normal(0), outer = Math.max(Math.abs(n[0]), Math.abs(n[1])) > 0.95;
        const crown = volume.glazed && outer ? form.crown : undefined;
        // Ribbons: the lobby's tall storefront, then one per floor up to the roof.
        ribbon(run, clear, roof, cover, crainFloors.lobbyGlass[0], crainFloors.lobbyGlass[1], 0, wall);
        const peak = Math.max(roof(0), roof(run.length));
        for (let row = 1; crainFloors.lobbyTop + (row - 1) * crainFloors.pitch + crainFloors.sill < peak; row += 1) {
          const level = crainFloors.lobbyTop + (row - 1) * crainFloors.pitch;
          if (crown && (level + crainFloors.head > crown.officeTop || crown.louvers.some(([lo, hi]) => level + crainFloors.sill < hi && level + crainFloors.head > lo))) continue;
          ribbon(run, clear, roof, cover, level + crainFloors.sill, level + crainFloors.head, row, wall);
        }
        if (crown) {
          for (const [lo, hi] of crown.louvers) {
            ribbon(run, clear, roof, cover, lo, hi, 0, wall, "vent");
            // Slim closed blades seated in the dark backing. Extra end clearance
            // accommodates their 5 cm relief at corners and collinear map joints.
            const bladeClear: [number, number] = [clear[0] + 0.1, clear[1] + 0.1];
            for (let bottom = lo + 0.12; bottom + 0.07 < hi; bottom += 0.22) ribbon(run, bladeClear, (s) => roof(s) - 0.04, cover, bottom, bottom + 0.07, 0, wall, "blade");
          }
          for (const [lo, hi] of crown.recesses) ribbon(run, clear, roof, cover, lo, hi, 0, wall, "recess");
        }
        // Roof edges: only where this volume stands above its neighbour. The lit outline runs
        // along the four faces; the diagonal edges of the split, the notches, and the slot
        // take a dark coping. Each run's fascia is a few millimetres wider and deeper than the
        // last, so where two overlap at a corner no faces share a plane.
        if (cover && Math.max(cover(0) - roof(0), cover(run.length) - roof(run.length)) > -0.5) return;
        const lit = volume.glazed && outer;
        const step = 0.004 * index, width = (lit ? 0.42 : 0.3) + step;
        // A sloped roof's fascia carries on past a convex corner, downhill only so none rises
        // above the peaks. Otherwise it stops short: across a straight joint or into a concave
        // corner its neighbour's top would share its plane where the two overlapped, and at a
        // convex corner its end would lie in the plane of the next wall, which a taller
        // neighbour may carry on up.
        const adjust = (turn: number, at: number, past: number) => {
          if (turn < -straight) return volume.glazed && volume.roof(run.at(past)) < volume.roof(run.at(at)) ? width : -0.005;
          return -(width * Math.tan(Math.abs(turn) / 2) + 0.002);
        };
        const extend: [number, number] = [adjust(first ? startTurn : 0, 0, -width), adjust(last ? endTurn : 0, run.length, run.length + width)];
        fascia(lit ? lights : coping, run, volume.roof, width, (lit ? 0.7 : 0.5) + step, extend);
      });
    });
  });

  // The sloped glazing's grid, raised a little above the glass along the building's axes and
  // seated in it, between the glass's top and its underside. The two directions stand and
  // sit at different depths, so their crossings never share a plane.
  // Bars keep their full width at least 0.3 m inside the roof's edge.
  const spacing = 2 * crainFloors.module, inset = 0.9, barHalf = 0.08, barReach = barHalf + 0.3;
  const { origin, axis } = form.grid;
  const across: Vec2 = [-axis[1], axis[0]];
  for (const volume of volumes.filter((v) => v.glazed)) {
    for (const [direction, normal, lift, seat] of [[axis, across, 0.06, 0.02], [across, axis, 0.09, 0.03]] as [Vec2, Vec2, number, number][]) {
      const offsets = volume.corners.map((p) => (p[0] - origin[0]) * normal[0] + (p[1] - origin[1]) * normal[1]);
      for (let k = Math.ceil(Math.min(...offsets) / spacing + 1e-9); k * spacing < Math.max(...offsets) - 1e-9; k += 1) {
        const start: Vec2 = [origin[0] + normal[0] * k * spacing, origin[1] + normal[1] * k * spacing];
        // Clip both long sides of the bar's footprint, not just its centre line, so a bar
        // running nearly parallel to an edge cannot lean out over it.
        const side = (offset: number): Vec2 => [start[0] + normal[0] * offset, start[1] + normal[1] * offset];
        const [left, right] = [clipLine(volume.corners, side(-barReach), direction), clipLine(volume.corners, side(barReach), direction)];
        // Each end stops midway between two crossing bars, so no end face can come to rest
        // against a crossing bar's side.
        for (const [a0, a1] of left) for (const [b0, b1] of right) {
          const t0 = (Math.ceil((Math.max(a0, b0) + inset) / spacing - 0.5) + 0.5) * spacing;
          const t1 = (Math.floor((Math.min(a1, b1) - inset) / spacing - 0.5) + 0.5) * spacing;
          if (t1 - t0 < spacing - 1e-9) continue;
          const p0: Vec2 = [start[0] + direction[0] * t0, start[1] + direction[1] * t0];
          const p1: Vec2 = [start[0] + direction[0] * t1, start[1] + direction[1] * t1];
          roofBox(grid, p0, p1, volume.roof, barHalf, lift, seat);
        }
      }
    }
  }

  const height = Math.max(...volumes.flatMap((volume) => volume.corners.map((p) => y(volume.roof(p)))));
  return kit.finish({ height, outlines: [shell], opacity: 0.2 });
}
