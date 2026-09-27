import * as THREE from "../vendor/three-r186.js";
import { createBuilder, line } from "./building-kit.js";
import type { BuildingModel, Builder, BatchData, Plan, Run, Vec2, Vec3 } from "./building-kit.js";

// Aon Center, 200 East Randolph Street (Edward Durell Stone with Perkins and Will, 1973),
// shared by the drawing-fitted model and the geographic one. A framed tube of V-shaped
// steel columns, clad in white granite, stands on a square plan with notched corners.
// On each face the columns stand one 10 ft module apart, and dark glass fills the slots
// between them floor by floor. Above the offices a band of louvers hides the mechanical
// floors, and a granite cap finishes the shaft. The notched corners are solid stone.
// A rooftop enclosure and an antenna stand on the flat roof.
//
// A form gives the outline and heights above the street; `base` is the height the model's
// y = 0 stands at, so a model can start above grade. See docs/aon-reference.md. Units are
// meters; +x is east and +z is south.

export interface AonForm {
  name: string;
  id: string;
  // The shaft's outline, in any winding. Nearly collinear runs adding up to at least
  // `faceLength` are the four main faces; the rest are the notched corners.
  outline: Vec2[];
  enclosure: Vec2[];
  mast: Vec2;
  base: number;
}

// Heights above the street. The floor pitch, the louver band, and the cap are measured on
// the photograph the drawing was traced from; the lobby takes what is left below eighty
// floors, which with the crown's two mechanical floors and the lobby make the published 83.
export const aonLevels = Object.freeze({
  roof: 340,
  capBottom: 338.5,
  louverBottom: 321.5,
  lobbyTop: 11.9,
  pitch: 3.87,
  sill: 0.8,
  head: 3.1,
  enclosureTop: 346.3,
  tip: 362.5,
  bay: 3.048,
  faceLength: 20,
});
const h = aonLevels;

const orient = (corners: Vec2[]): Vec2[] => {
  const area = corners.reduce((sum, [x, z], i) => { const [x2, z2] = corners[(i + 1) % corners.length]!; return sum + x * z2 - x2 * z; }, 0);
  return area < 0 ? corners : [...corners].reverse();
};
const planOf = (corners: Vec2[]): Plan => corners.map((corner, i) => line(corner, corners[(i + 1) % corners.length]!));

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x262626, 0x2c2c2c, 0x323232, 0x222222].map(color);
const litGlass = color(0x7c7c7c), dimGlass = color(0x4e4e4e);
const spandrel = color(0x1b1b1b), granite = color(0xb2b2b2), core = color(0x202020);
const slat = color(0x9c9c9c), slatGap = color(0x444444), roofing = color(0x4c4c4c);
function paneColor(row: number, bay: number, face: number): THREE.Color {
  const hash = (Math.imul(row + 17, 0x9e3779b1) ^ Math.imul(bay + 31, 0x85ebca77) ^ Math.imul(face + 7, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 3) return litGlass;
  if (value < 6) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

export function buildAonTower(form: AonForm): BuildingModel {
  const kit: Builder = createBuilder(form.name, form.id);
  const shell = kit.batch("Aon · tube shell", kit.material(0xffffff, { vertexColors: true }));
  const glazing = kit.batch("Aon · window ribbons", kit.material(0xffffff, { vertexColors: true }));
  const piers = kit.batch("Aon · granite piers", kit.material(0xbababa));
  const louvers = kit.batch("Aon · crown louvers", kit.material(0xffffff, { vertexColors: true }));
  const cap = kit.batch("Aon · granite cap", kit.material(0xc4c4c4));
  const enclosure = kit.batch("Aon · rooftop enclosure", kit.material(0xffffff, { vertexColors: true }));
  const mast = kit.batch("Aon · antenna mast", kit.material(0x6a6a6a));
  const base = form.base;
  const y = (real: number) => real - base;
  const outline = orient(form.outline), plan = planOf(outline);
  // A traced outline can split one face into nearly collinear pieces. Runs that carry on
  // within 5° join one chain; a chain at least `faceLength` long is a main face, whose
  // facade stands on its chord, and every other run belongs to a notched corner.
  const straight = 5 * Math.PI / 180;
  const turnAt = (a: Run, b: Run) => { const n1 = a.normal(a.length), n2 = b.normal(0); return Math.atan2(n1[0] * n2[1] - n1[1] * n2[0], n1[0] * n2[0] + n1[1] * n2[1]); };
  const breaks = plan.map((run, i) => Math.abs(turnAt(plan[(i + plan.length - 1) % plan.length]!, run)) >= straight);
  const first = breaks.indexOf(true);
  const chains: number[][] = [];
  for (let k = 0; k < plan.length; k += 1) {
    const i = (first + k) % plan.length;
    if (breaks[i] || !chains.length) chains.push([i]);
    else chains.at(-1)!.push(i);
  }
  const faces = chains.map((chain) => line(plan[chain[0]!]!.at(0), plan[chain.at(-1)!]!.at(plan[chain.at(-1)!]!.length))).map((chord, i) => ({ chord, runs: chains[i]! })).filter(({ chord }) => chord.length >= h.faceLength);
  const onFace = new Set(faces.flatMap(({ runs }) => runs));

  // A closed box on a run from s0 to s1 and y0 to y1, standing `back` to `front` off the
  // wall, whose front is a grid of coloured cells. Its top and bottom fan out from a back
  // corner through every column cut, and its ends through every row cut, so each cell's
  // edge meets its partner and the box closes without T-junctions.
  const gridBox = (target: BatchData, run: Run, columns: number[], rows: number[], back: number, front: number, paint: (column: number, row: number) => THREE.Color, sides: THREE.Color) => {
    const n = run.normal(0), tangent: Vec2 = [n[1], -n[0]];
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
  };

  // The shaft: dark spandrel walls on the faces, granite on the notched corners, a floor,
  // and the flat roof.
  plan.forEach((run, index) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], y(h.roof), b[1]], [a[0], y(h.roof), a[1]]], [[n[0], 0, n[1]]], onFace.has(index) ? core : granite);
  });
  // A slab in a vertex-coloured batch, painted, since kit.slab lays its vertices white.
  const paintedSlab = (target: BatchData, polygon: Vec2[], height: number, up: boolean, paint: THREE.Color) => {
    const start = target.colors.length;
    kit.slab(target, polygon, height, up);
    for (let i = start; i < target.colors.length; i += 3) target.colors.splice(i, 3, paint.r, paint.g, paint.b);
  };
  paintedSlab(shell, outline, 0, false, roofing);
  paintedSlab(shell, outline, y(h.roof), true, roofing);

  // Each face's bays: as many 10 ft modules as the face holds, evened out to fill it. The
  // columns stand on the bay lines, the end ones drawn in to stay on their face.
  const faceBays = (run: Run) => {
    const count = Math.max(1, Math.round(run.length / h.bay)), bay = run.length / count;
    return Array.from({ length: count + 1 }, (_, i) => i * bay);
  };
  const pierHalf = 0.65, pierPoint = 0.7;
  const floors: number[] = [];
  for (let level = h.lobbyTop; level + h.pitch <= h.louverBottom + 1e-6; level += h.pitch) floors.push(level);

  faces.forEach(({ chord: run }, face) => {
    const stations = faceBays(run), from = stations[0]!, to = stations.at(-1)!;
    // The glass: one ribbon per floor across the face, cut into panes at the columns, which
    // stand in front of the joints. The lobby is a single tall storey of glass.
    const visible = (low: number) => low >= base;
    if (visible(0.4)) gridBox(glazing, run, stations, [0.4, h.lobbyTop - 0.9], 0.02, 0.07, (bay) => paneColor(0, bay, face), spandrel);
    floors.forEach((level, row) => {
      if (!visible(level + h.sill)) return;
      gridBox(glazing, run, stations, [level + h.sill, level + h.head], 0.02, 0.07, (bay) => paneColor(row + 1, bay, face), spandrel);
    });
    // The crown's louvers: horizontal blades across the face between the columns.
    const blades: number[] = [];
    for (let v = h.louverBottom + 0.2; v < h.capBottom - 0.2 - 1e-6; v += 0.45) blades.push(v);
    blades.push(h.capBottom - 0.2);
    if (visible(blades[0]!)) gridBox(louvers, run, [from, to], blades, 0.02, 0.1, (_, r) => (r % 2 === 0 ? slat : slatGap), slatGap);
    // The V-shaped columns: granite prisms from just above grade to the cap, their points
    // outward. They start 0.3 m up so their relief leaves the street outline unchanged.
    for (const station of stations) {
      const s = Math.min(Math.max(station, pierHalf), run.length - pierHalf);
      const [left, right, point] = [run.at(s - pierHalf, 0), run.at(s + pierHalf, 0), run.at(s, pierPoint)];
      const low = y(Math.max(base, 0.3)), high = y(h.capBottom);
      const up: Vec3 = [0, 1, 0], down: Vec3 = [0, -1, 0];
      const p = (q: Vec2, v: number): Vec3 => [q[0], v, q[1]];
      // Outward is to the right of a and then b, as it is for every run of the plan.
      const faceOf = (a: Vec2, b: Vec2): Vec3 => { const d: Vec2 = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...d); return [-d[1] / l, 0, d[0] / l]; };
      kit.quad(piers, [p(left, low), p(point, low), p(point, high), p(left, high)], [faceOf(left, point)]);
      kit.quad(piers, [p(point, low), p(right, low), p(right, high), p(point, high)], [faceOf(point, right)]);
      kit.quad(piers, [p(right, low), p(left, low), p(left, high), p(right, high)], [[-run.normal(0)[0], 0, -run.normal(0)[1]]]);
      kit.triangle(piers, [p(left, high), p(point, high), p(right, high)], [up, up, up]);
      kit.triangle(piers, [p(left, low), p(right, low), p(point, low)], [down, down, down]);
    }
  });

  // The granite cap: a fascia under the roof edge on every run, standing clear of the
  // columns' points. Its ends are mitred on the bisector of each corner, so neighbouring
  // caps meet in one plane, facing opposite ways, and never overlap.
  const capWidth = pierPoint + 0.2;
  if (h.roof > base) plan.forEach((run, index) => {
    const before = turnAt(plan[(index + plan.length - 1) % plan.length]!, run), after = turnAt(run, plan[(index + 1) % plan.length]!);
    // At a convex corner (a negative turn) the outer edge runs past the wall's end; at a
    // concave one it stops short of it.
    const outer0 = Math.tan(before / 2) * capWidth, outer1 = run.length - Math.tan(after / 2) * capWidth;
    const n = run.normal(0);
    const at = (s: number, depth: number, v: number): Vec3 => { const q = run.at(s, depth); return [q[0], y(v), q[1]]; };
    const [lo, hi] = [h.capBottom, h.roof];
    const inner = [at(0, 0, lo), at(run.length, 0, lo), at(run.length, 0, hi), at(0, 0, hi)] as const;
    const outer = [at(outer0, capWidth, lo), at(outer1, capWidth, lo), at(outer1, capWidth, hi), at(outer0, capWidth, hi)] as const;
    const normal = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const g: Vec3 = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!], l = Math.hypot(...g);
      return [g[0] / l, g[1] / l, g[2] / l];
    };
    kit.quad(cap, [outer[0], outer[1], outer[2], outer[3]], [[n[0], 0, n[1]]]);
    kit.quad(cap, [inner[1], inner[0], inner[3], inner[2]], [[-n[0], 0, -n[1]]]);
    kit.quad(cap, [inner[3], outer[3], outer[2], inner[2]], [[0, 1, 0]]);
    kit.quad(cap, [inner[0], inner[1], outer[1], outer[0]], [[0, -1, 0]]);
    kit.quad(cap, [inner[0], outer[0], outer[3], inner[3]], [normal(inner[0], outer[0], outer[3])]);
    kit.quad(cap, [outer[1], inner[1], inner[2], outer[2]], [normal(outer[1], inner[1], inner[2])]);
  });

  // The rooftop enclosure: louvered walls from the roof to the published top, and a lid.
  const enclosureOutline = orient(form.enclosure);
  planOf(enclosureOutline).forEach((run) => {
    const rows: number[] = [];
    for (let v = h.roof; v < h.enclosureTop - 1e-6; v += 0.6) rows.push(v);
    rows.push(h.enclosureTop);
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    // Its walls are cells of blades and gaps, so the enclosure closes on its own lid and floor.
    const at = (q: Vec2, v: number): Vec3 => [q[0], y(v), q[1]];
    for (let r = 0; r + 1 < rows.length; r += 1) kit.quad(enclosure, [at(a, rows[r]!), at(b, rows[r]!), at(b, rows[r + 1]!), at(a, rows[r + 1]!)], [[n[0], 0, n[1]]], r % 2 === 0 ? slat : slatGap);
  });
  paintedSlab(enclosure, enclosureOutline, y(h.roof), false, roofing);
  paintedSlab(enclosure, enclosureOutline, y(h.enclosureTop), true, roofing);
  // The antenna: a slim mast from the enclosure to the published tip.
  kit.box(mast, form.mast, [0, 1], 0.3, -0.3, 0.3, y(h.enclosureTop), y(h.tip));

  return kit.finish({ height: y(h.tip), outlines: [shell, cap], opacity: 0.18 });
}
