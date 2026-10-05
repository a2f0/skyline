import * as THREE from "../vendor/three-r186.js";
import { line } from "./building-kit.js";
import type { BatchData, Builder, Plan, Run, Vec2, Vec3 } from "./building-kit.js";

// An outline's corners in the winding that gives every run of its plan an outward normal.
export const orient = (corners: Vec2[]): Vec2[] => {
  const area = corners.reduce((sum, [x, z], i) => { const [x2, z2] = corners[(i + 1) % corners.length]!; return sum + x * z2 - x2 * z; }, 0);
  return area < 0 ? corners : [...corners].reverse();
};
export const planOf = (corners: Vec2[]): Plan => corners.map((corner, i) => line(corner, corners[(i + 1) % corners.length]!));
// The turn from run a into run b at their shared corner; negative where the outline turns
// out (a convex corner) and positive where it turns in.
export const turnAt = (a: Run, b: Run) => { const n1 = a.normal(a.length), n2 = b.normal(0); return Math.atan2(n1[0] * n2[1] - n1[1] * n2[0], n1[0] * n2[0] + n1[1] * n2[1]); };

// A traced outline can split one wall into nearly collinear pieces. Runs that carry on
// within `straight` of each other join one chain, which lists its runs' indices in order,
// where each starts along the chain, and the chain's length.
export interface Chain { runs: number[]; starts: number[]; length: number }
export function chainsOf(plan: Plan, straight = 5 * Math.PI / 180): Chain[] {
  const breaks = plan.map((run, i) => Math.abs(turnAt(plan[(i + plan.length - 1) % plan.length]!, run)) >= straight);
  const first = Math.max(0, breaks.indexOf(true));
  const chains: Chain[] = [];
  for (let k = 0; k < plan.length; k += 1) {
    const i = (first + k) % plan.length, chain = chains.at(-1);
    if (breaks[i] || !chain) chains.push({ runs: [i], starts: [0], length: plan[i]!.length });
    else { chain.runs.push(i); chain.starts.push(chain.length); chain.length += plan[i]!.length; }
  }
  return chains;
}

// A closed box standing `width` proud of a run from s0 to s1 and lo to hi: a cap, a band
// course, a corner pier. An end given the turn at its corner is mitred on that corner's
// bisector, so the neighbouring run's box meets it in one plane, facing the other way, and
// the two never overlap; an end without one is square. At a convex corner (a negative turn)
// the outer edge runs past the wall's end; at a concave one it stops short of it.
export function mitredBox(kit: Builder, target: BatchData, run: Run, s0: number, s1: number, before: number | undefined, after: number | undefined,
  width: number, lo: number, hi: number, y: (real: number) => number = (real) => real) {
  const outer0 = s0 + (before === undefined ? 0 : Math.tan(before / 2) * width), outer1 = s1 - (after === undefined ? 0 : Math.tan(after / 2) * width);
  const n = run.normal(0);
  const at = (s: number, depth: number, v: number): Vec3 => { const q = run.at(s, depth); return [q[0], y(v), q[1]]; };
  const inner = [at(s0, 0, lo), at(s1, 0, lo), at(s1, 0, hi), at(s0, 0, hi)] as const;
  const outer = [at(outer0, width, lo), at(outer1, width, lo), at(outer1, width, hi), at(outer0, width, hi)] as const;
  const normal = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const g: Vec3 = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!], l = Math.hypot(...g);
    return [g[0] / l, g[1] / l, g[2] / l];
  };
  kit.quad(target, [outer[0], outer[1], outer[2], outer[3]], [[n[0], 0, n[1]]]);
  kit.quad(target, [inner[1], inner[0], inner[3], inner[2]], [[-n[0], 0, -n[1]]]);
  kit.quad(target, [inner[3], outer[3], outer[2], inner[2]], [[0, 1, 0]]);
  kit.quad(target, [inner[0], inner[1], outer[1], outer[0]], [[0, -1, 0]]);
  kit.quad(target, [inner[0], outer[0], outer[3], inner[3]], [normal(inner[0], outer[0], outer[3])]);
  kit.quad(target, [outer[1], inner[1], inner[2], outer[2]], [normal(outer[1], inner[1], inner[2])]);
}

// A closed box on a run, standing `back` to `front` off the wall between the first and last
// of `columns` along it and the first and last of `rows` up it, whose front is a grid of
// coloured cells: panes and mullions, window ribbons, louver blades. Its top and bottom fan
// out from a back corner through every column cut, and its ends through every row cut, so
// each cell's edge meets its partner and the box closes edge for edge, without the
// T-junctions a single top face would leave against a cut front. Heights are real heights;
// `y` maps them to the model's.
export function gridBox(kit: Builder, target: BatchData, run: Run, columns: number[], rows: number[], back: number, front: number,
  paint: (column: number, row: number) => THREE.Color, sides: THREE.Color, y: (real: number) => number = (real) => real) {
  const n = run.normal(0), tangent = [n[1], -n[0]] as const;
  const at = (s: number, depth: number, height: number): Vec3 => { const p = run.at(s, depth); return [p[0], y(height), p[1]]; };
  const [s0, s1] = [columns[0]!, columns.at(-1)!], [y0, y1] = [rows[0]!, rows.at(-1)!];
  for (let c = 0; c + 1 < columns.length; c += 1) {
    for (let r = 0; r + 1 < rows.length; r += 1) {
      const [a, b, lo, hi] = [columns[c]!, columns[c + 1]!, rows[r]!, rows[r + 1]!];
      kit.quad(target, [at(a, front, lo), at(b, front, lo), at(b, front, hi), at(a, front, hi)], [[n[0], 0, n[1]]], paint(c, r));
    }
  }
  kit.quad(target, [at(s1, back, y0), at(s0, back, y0), at(s0, back, y1), at(s1, back, y1)], [[-n[0], 0, -n[1]]], sides);
  const fan = (hinge: Vec3, rim: Vec3[], normal: Vec3) => {
    for (let i = 0; i + 1 < rim.length; i += 1) kit.triangle(target, [hinge, rim[i]!, rim[i + 1]!], [normal, normal, normal], sides);
  };
  fan(at(s0, back, y1), [...columns.map((s) => at(s, front, y1)), at(s1, back, y1)], [0, 1, 0]);
  fan(at(s0, back, y0), [...columns.map((s) => at(s, front, y0)), at(s1, back, y0)], [0, -1, 0]);
  fan(at(s0, back, y0), [...rows.map((v) => at(s0, front, v)), at(s0, back, y1)], [-tangent[0], 0, -tangent[1]]);
  fan(at(s1, back, y0), [...rows.map((v) => at(s1, front, v)), at(s1, back, y1)], [tangent[0], 0, tangent[1]]);
}

// A slab in a vertex-coloured batch, painted, since kit.slab lays its vertices white.
export function paintedSlab(kit: Builder, target: BatchData, polygon: [number, number][], height: number, up: boolean, paint: THREE.Color) {
  const start = target.colors.length;
  kit.slab(target, polygon, height, up);
  for (let i = start; i < target.colors.length; i += 3) target.colors.splice(i, 3, paint.r, paint.g, paint.b);
}

// The turns at a run's two corners, into it and out of it.
export const turnsAt = (plan: Plan, index: number) => [turnAt(plan[(index + plan.length - 1) % plan.length]!, plan[index]!), turnAt(plan[index]!, plan[(index + 1) % plan.length]!)] as const;

// Piers and mullions cross the joints of a chain in pieces, one per run, mitred on each
// joint's bisector as mitred courses are, each standing from its own run's `froms` to its
// own run's top. Where the cover changes at a joint, the less covered run's last 2 cm stand
// from the higher cover, so the piece ends clear of the neighbour's wall. A run's cells stop
// a little short of every joint, of a more covered neighbour, and of the wedge a concave
// joint would push into the next run's cells: `jointTrim` gives how far, toward `other`.
// `clearance` is how far cells stop short of a more covered neighbour.
export function jointTrim(plan: Plan, chain: Chain, froms: number[], k: number, other: number, clearance = 0.01) {
  if (other < 0 || other >= chain.runs.length) return 0;
  const [a, b] = other > k ? [chain.runs[k]!, chain.runs[other]!] : [chain.runs[other]!, chain.runs[k]!];
  const turn = turnAt(plan[a]!, plan[b]!);
  return 0.005 + (turn > 0 ? 0.08 * Math.tan(turn / 2) : 0) + (froms[k]! < froms[other]! ? clearance : 0);
}
export function chainPier(kit: Builder, target: BatchData, plan: Plan, chain: Chain, froms: number[], a: number, b: number, depth: number,
  top: number | number[], y: (real: number) => number = (real) => real) {
  const last = chain.runs.length - 1;
  chain.runs.forEach((index, k) => {
    const run = plan[index]!, start = chain.starts[k]!, end = start + run.length, ceiling = typeof top === "number" ? top : top[k]!;
    const lo = Math.max(a, start), hi = Math.min(b, end);
    if (hi - lo < 0.005) return;
    const [before, after] = turnsAt(plan, index);
    const mitreLo = lo === start && (a < start || (k === 0 && a === 0)) ? before : undefined;
    const mitreHi = hi === end && (b > end || (k === last && b === chain.length)) ? after : undefined;
    const pieces: [number, number, number, number | undefined, number | undefined][] = [[lo, hi, froms[k]!, mitreLo, mitreHi]];
    if (mitreHi !== undefined && k < last && froms[k]! < froms[k + 1]! && hi - 0.02 > lo) pieces.splice(0, 1, [lo, hi - 0.02, froms[k]!, mitreLo, undefined], [hi - 0.02, hi, froms[k + 1]!, undefined, mitreHi]);
    const first = pieces[0]!;
    if (mitreLo !== undefined && k > 0 && froms[k]! < froms[k - 1]! && first[1] > lo + 0.02) pieces.splice(0, 1, [lo, lo + 0.02, froms[k - 1]!, mitreLo, undefined], [lo + 0.02, first[1], first[2], undefined, first[4]]);
    for (const [p0, p1, from, m0, m1] of pieces) {
      if (from < ceiling) mitredBox(kit, target, run, p0 - start, p1 - start, m0, m1, depth, Math.max(from, 0.3), ceiling, y);
    }
  });
}

// A closed box along runs k0 to k1 of a chain, from s0 to s1 along it, standing `back` to
// `front` off the walls, whose front is a grid of coloured cells cut at `columns` along the
// chain and at `rows` up it: a curtain wall's glass and spandrels round a traced curve. Where
// two of its runs meet, its faces meet on the joint's mitre, so a curve carries one box with
// ends only at s0 and s1. Its tops and bottoms fan out from a back corner through each run's
// column cuts, and its ends through every row cut, so it closes edge for edge. A cell is
// painted by its bay, the columns at or before its start, so a cell a joint splits keeps
// one colour.
// `paint` runs immediately before its front quad appends six vertices to target.
// Blue Cross records that vertex offset to address individual window lights.
export function chainSkin(kit: Builder, target: BatchData, plan: Plan, chain: Chain, k0: number, k1: number, s0: number, s1: number,
  columns: number[], rows: number[], back: number, front: number, paint: (bay: number, row: number) => THREE.Color, sides: THREE.Color,
  y: (real: number) => number = (real) => real) {
  const lift = (q: Vec2, v: number): Vec3 => [q[0], y(v), q[1]];
  const mitre = (k: number, depth: number): Vec2 => {
    const a = plan[chain.runs[k]!]!, b = plan[chain.runs[k + 1]!]!, v = a.at(a.length), n1 = a.normal(a.length), n2 = b.normal(0);
    const scale = depth / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [v[0] + (n1[0] + n2[0]) * scale, v[1] + (n1[1] + n2[1]) * scale];
  };
  const [y0, y1] = [rows[0]!, rows.at(-1)!];
  const up: Vec3 = [0, 1, 0], down: Vec3 = [0, -1, 0];
  const fan = (hinge: Vec3, rim: Vec3[], normal: Vec3, paintWith = sides) => {
    for (let i = 0; i + 1 < rim.length; i += 1) kit.triangle(target, [hinge, rim[i]!, rim[i + 1]!], [normal, normal, normal], paintWith);
  };
  for (let k = k0; k <= k1; k += 1) {
    const run = plan[chain.runs[k]!]!, start = chain.starts[k]!, n = run.normal(0), out: Vec3 = [n[0], 0, n[1]];
    const from = k === k0 ? s0 : start, to = k === k1 ? s1 : start + run.length;
    const cuts = columns.filter((s) => s > from + 1e-6 && s < to - 1e-6);
    const arcs = [from, ...cuts, to];
    const at = (s: number, depth: number, index: number): Vec2 => {
      if (index === 0 && k > k0) return mitre(k - 1, depth);
      if (index === arcs.length - 1 && k < k1) return mitre(k, depth);
      return run.at(s - start, depth);
    };
    const fronts = arcs.map((s, i) => at(s, front, i));
    const [backStart, backEnd] = [at(from, back, 0), at(to, back, arcs.length - 1)];
    for (let i = 0; i + 1 < fronts.length; i += 1) {
      const bay = columns.filter((s) => s <= arcs[i]! + 1e-6).length;
      for (let r = 0; r + 1 < rows.length; r += 1) {
        kit.quad(target, [lift(fronts[i]!, rows[r]!), lift(fronts[i + 1]!, rows[r]!), lift(fronts[i + 1]!, rows[r + 1]!), lift(fronts[i]!, rows[r + 1]!)], [out], paint(bay, r));
      }
    }
    kit.quad(target, [lift(backEnd, y0), lift(backStart, y0), lift(backStart, y1), lift(backEnd, y1)], [[-n[0], 0, -n[1]]], sides);
    fan(lift(backStart, y1), [...fronts.map((q) => lift(q, y1)), lift(backEnd, y1)], up);
    fan(lift(backStart, y0), [...fronts.map((q) => lift(q, y0)), lift(backEnd, y0)], down);
  }
  // The ends, square to their runs.
  const ends: [number, number, number][] = [[k0, s0, -1], [k1, s1, 1]];
  for (const [k, s, sign] of ends) {
    // Outward along the run at s1, back along it at s0.
    const run = plan[chain.runs[k]!]!, start = chain.starts[k]!, n = run.normal(0), t: Vec3 = [n[1] * sign, 0, -n[0] * sign];
    fan(lift(run.at(s - start, back), y0), [...rows.map((v) => lift(run.at(s - start, front), v)), lift(run.at(s - start, back), y1)], t);
  }
}
