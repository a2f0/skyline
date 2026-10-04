import * as THREE from "../vendor/three-r186.js";
import { createBuilder, line } from "./building-kit.js";
import type { BuildingModel, Builder, BatchData, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainsOf, gridBox, mitredBox, orient, paintedSlab, planOf, turnAt } from "./facade-grid.js";

// Aon Center, 200 East Randolph Street (Edward Durell Stone with Perkins and Will, 1973),
// shared by the drawing-fitted model and the geographic one. A framed tube of V-shaped
// steel columns, clad in white granite, stands on a square plan with notched corners.
// Each face has fifteen bays, nominally 10 ft on the clean plan; dark glass fills the slots
// between them floor by floor, over the mechanical floors too, up to the granite cap that
// finishes the shaft. The notched corners are solid stone.
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

// Heights above the street. The floor pitch and the cap are measured on the photograph the
// drawing was traced from. The lobby takes what is left below eighty office floors and the
// two mechanical floors over them, which with the lobby make the published 83; daylight
// photographs show the slots unchanged over the mechanical floors, so the glass keeps the
// office floors' pitch up to the cap.
export const aonLevels = Object.freeze({
  roof: 340,
  capBottom: 338.5,
  lobbyTop: 11.9,
  pitch: 3.87,
  sill: 0.8,
  head: 3.1,
  enclosureTop: 346.3,
  tip: 362.5,
  bay: 3.048, // nominal clean-plan module; mapped spacing follows each face's chord
  baysPerFace: 15, // tenant portal's Suite 1300 plan: sixteen piers, fifteen openings
  faceLength: 20,
});
const h = aonLevels;

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
  const cap = kit.batch("Aon · granite cap", kit.material(0xc4c4c4));
  const enclosure = kit.batch("Aon · rooftop enclosure", kit.material(0xffffff, { vertexColors: true }));
  const mast = kit.batch("Aon · antenna mast", kit.material(0x6a6a6a));
  const base = form.base;
  const y = (real: number) => real - base;
  const outline = orient(form.outline), plan = planOf(outline);
  // A traced outline can split one face into nearly collinear pieces, which chainsOf joins
  // within 5°: a chain at least `faceLength` long is a main face, whose facade stands on its
  // chord, and every other run belongs to a notched corner.
  const faces = chainsOf(plan).map(({ runs }) => ({ chord: line(plan[runs[0]!]!.at(0), plan[runs.at(-1)!]!.at(plan[runs.at(-1)!]!.length)), runs })).filter(({ chord }) => chord.length >= h.faceLength);
  const onFace = new Set(faces.flatMap(({ runs }) => runs));

  const grid = (target: BatchData, run: Run, columns: number[], rows: number[], back: number, front: number, paint: (column: number, row: number) => THREE.Color, sides: THREE.Color) =>
    gridBox(kit, target, run, columns, rows, back, front, paint, sides, y);

  // The shaft: dark spandrel walls on the faces, granite on the notched corners, a floor,
  // and the flat roof.
  plan.forEach((run, index) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], y(h.roof), b[1]], [a[0], y(h.roof), a[1]]], [[n[0], 0, n[1]]], onFace.has(index) ? core : granite);
  });
  paintedSlab(kit, shell, outline, 0, false, roofing);
  paintedSlab(kit, shell, outline, y(h.roof), true, roofing);

  // The source plan fixes fifteen openings per face, independent of an OSM trace's
  // corner depth. Distribute them over each face's chord; mapped spacing remains an
  // approximation (docs/aon-reference.md, FID-AON-001). End piers stay on their face.
  const faceBays = (run: Run) => {
    const count = h.baysPerFace, bay = run.length / count;
    return Array.from({ length: count + 1 }, (_, i) => i * bay);
  };
  const pierHalf = 0.65, pierPoint = 0.7;
  const floors: number[] = [];
  for (let level = h.lobbyTop; level + h.pitch <= h.capBottom + 1e-6; level += h.pitch) floors.push(level);

  faces.forEach(({ chord: run }, face) => {
    const stations = faceBays(run);
    // End piers are inset from the corner. Stop glass at their centres so it
    // cannot peek past the taper of the V and create two extra narrow slots.
    const glassStations = [pierHalf, ...stations.slice(1, -1), run.length - pierHalf];
    // The glass: one ribbon per floor across the face, cut into panes at the columns, which
    // stand in front of the joints. The lobby is a single tall storey of glass.
    const visible = (low: number) => low >= base;
    if (visible(0.4)) grid(glazing, run, glassStations, [0.4, h.lobbyTop - 0.9], 0.02, 0.07, (bay) => paneColor(0, bay, face), spandrel);
    floors.forEach((level, row) => {
      if (!visible(level + h.sill)) return;
      grid(glazing, run, glassStations, [level + h.sill, level + h.head], 0.02, 0.07, (bay) => paneColor(row + 1, bay, face), spandrel);
    });
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
  // columns' points and mitred on the bisector of each corner.
  const capWidth = pierPoint + 0.2;
  if (h.roof > base) plan.forEach((run, index) => {
    mitredBox(kit, cap, run, 0, run.length, turnAt(plan[(index + plan.length - 1) % plan.length]!, run), turnAt(run, plan[(index + 1) % plan.length]!), capWidth, h.capBottom, h.roof, y);
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
  paintedSlab(kit, enclosure, enclosureOutline, y(h.roof), false, roofing);
  paintedSlab(kit, enclosure, enclosureOutline, y(h.enclosureTop), true, roofing);
  // The antenna: a slim mast from the enclosure to the published tip.
  kit.box(mast, form.mast, [0, 1], 0.3, -0.3, 0.3, y(h.enclosureTop), y(h.tip));

  return kit.finish({ height: y(h.tip), outlines: [shell, cap], opacity: 0.18 });
}
