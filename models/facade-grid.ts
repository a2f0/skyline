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
