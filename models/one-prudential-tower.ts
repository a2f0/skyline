import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside } from "./building-kit.js";
import type { BuildingModel, Builder, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainsOf, gridBox, mitredBox, orient, paintedSlab, planOf, turnAt } from "./facade-grid.js";
import type { Chain } from "./facade-grid.js";

// One Prudential Plaza, 130 East Randolph Street (Naess & Murphy, 1955), shared by the
// drawing-fitted model and the geographic one. A limestone slab of forty-one floors:
// uninterrupted limestone piers stand one 2.35 m bay apart, with a window and an aluminium
// spandrel in every bay on every floor, and wider piers turn each corner. The forty-first
// floor's observatory is a band of glass under the coping. On the roof, a penthouse carries
// the Prudential sign under a louvered screen, and a tubular steel mast carries WGN's
// antenna. A lower wing wraps the tower's east end, its limestone ribs on the same module.
//
// A form gives the outlines and heights above the street; `base` is the height the model's
// y = 0 stands at, so a model can start above grade. See docs/one-prudential-reference.md.
// Units are meters; +x is east and +z is south.

export interface OnePrudentialWing {
  outline: Vec2[];
  top: number;
}
export interface OnePrudentialForm {
  name: string;
  id: string;
  // The tower's outline, in any winding. Nearly collinear runs join one wall.
  tower: Vec2[];
  wings: OnePrudentialWing[];
  // The penthouse: its south-west corner, the unit direction east along the south face,
  // and its length along that face and depth behind it.
  penthouse: { corner: Vec2; along: Vec2; length: number; depth: number };
  mast: Vec2;
  base: number;
}

// Heights above the street. The roof, the observatory band, the penthouse's louvers, the
// floor pitch, and the window rows are measured on the photograph the drawing was traced
// from, through its recovered camera; the penthouse top and the antenna tip are published,
// and the antenna's length is WGN's. See docs/one-prudential-reference.md.
export const onePrudentialLevels = Object.freeze({
  // The ground storey, then thirty-nine office floors, then the observatory: forty-one.
  lobbyTop: 12.03,
  pitch: 3.93,
  floors: 41,
  sill: 0.85,
  head: 2.45,
  sillCourse: 164.9,
  bandFoot: 165.3,
  copingFoot: 169,
  roof: 169.5,
  signBottom: 171,
  signTop: 179.5,
  louverBottom: 180.3,
  penthouseTop: 183.2,
  // The 311 ft tubular mast's top, where WGN's 73 ft antenna leaves its 12 ft socket.
  mastTop: 259.4,
  tip: 278,
  bay: 2.35,
});
const h = onePrudentialLevels;
// A floor's level: the ground floor at the street, the office floors from the lobby's top,
// and the forty-first at the observatory band's foot.
export const floorLevel = (floor: number) => (floor === 1 ? 0 : h.lobbyTop + (floor - 2) * h.pitch);

// The facade module. Interior piers stand one bay apart, centred on the wall; the bays at
// each end take what is left, at least `endBay`, and the corner pier widens to fill it, so
// every window is the same width.
const endBay = 2.6, pierHalf = 0.55, pierDepth = 0.3, ribHalf = 0.5;
export function wallStations(length: number) {
  const interior = Math.max(0, Math.floor((length - 2 * endBay) / h.bay));
  const end = (length - interior * h.bay) / 2;
  return { piers: Array.from({ length: interior + 1 }, (_, i) => end + i * h.bay), corner: end - h.bay + pierHalf };
}
// A wing's ribs: as many bays as the wall holds, centred on it.
export function wingRibs(length: number) {
  const count = Math.floor(length / h.bay);
  return Array.from({ length: count }, (_, i) => length / 2 + (i - (count - 1) / 2) * h.bay);
}
// The screen's fins: the drawing's forty-nine on the south face, one every 0.98 m from 2.2 m
// in; the other faces hold as many as fit, centred.
const finPitch = 0.98, finHalf = 0.15, finDepth = 0.2;
export function screenFins(length: number, front: boolean) {
  if (front) return Array.from({ length: 49 }, (_, i) => 2.2 + i * finPitch);
  const count = Math.floor((length - 1) / finPitch) + 1;
  return Array.from({ length: count }, (_, i) => length / 2 + (i - (count - 1) / 2) * finPitch);
}
// The sign, along the penthouse's south face: a board carrying the Rock of Gibraltar and
// the name, ten letters from 14 m to 42.8 m, their capital and ascenders taller than the rest.
const sign = { board: [4.6, 43.3], logo: [7.1, 13], rows: [172, 173.8, 177, 178.7], letters: 10, name: [14, 42.8], tall: new Set([0, 3, 6, 7, 9]) } as const;
const mastFoot = 1.15, mastHead = 0.5, antennaHalf = 0.22;

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x262626, 0x2c2c2c, 0x323232, 0x222222].map(color);
const litGlass = color(0x7c7c7c), dimGlass = color(0x4e4e4e);
const observatory = [0x3a3a3a, 0x444444, 0x404040].map(color), litObservatory = color(0x8a8a8a);
const aluminium = color(0x8e8e8e), darkSpandrel = color(0x242424), limestone = color(0xb0b0b0), roofing = color(0x4c4c4c);
const penthouseWall = color(0x9c9c9c), louverBacking = color(0x383838), board = color(0x2e2e2e), lettering = color(0xc4c4c4), logo = color(0xb0b0b0);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 5, 0x9e3779b1) ^ Math.imul(bay + 23, 0x85ebca77) ^ Math.imul(wall + 13, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 3) return litGlass;
  if (value < 6) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// A wall's rows from `from` to `to`: the lobby's glass, then each floor's window and the
// spandrel above it, then the observatory band. Each row says what it is, so a cell can be
// painted by row; a row cut by `from` keeps what it was.
type Row = { lo: number; hi: number; kind: "glass" | "spandrel" | "band"; floor: number };
function wallRows(from: number, to: number): Row[] {
  const rows: Row[] = [{ lo: 0.4, hi: h.lobbyTop - 0.9, kind: "glass", floor: 1 }];
  for (let floor = 2; floor < h.floors; floor += 1) {
    const level = floorLevel(floor);
    rows.push({ lo: rows.at(-1)!.hi, hi: level + h.sill, kind: "spandrel", floor }, { lo: level + h.sill, hi: level + h.head, kind: "glass", floor });
  }
  rows.push({ lo: rows.at(-1)!.hi, hi: h.bandFoot, kind: "spandrel", floor: h.floors - 1 });
  rows.push({ lo: h.bandFoot, hi: h.copingFoot, kind: "band", floor: h.floors });
  return rows.filter((row) => row.hi > from + 1e-6 && row.lo < to - 1e-6).map((row) => ({ ...row, lo: Math.max(row.lo, from), hi: Math.min(row.hi, to) }));
}

export function buildOnePrudentialTower(form: OnePrudentialForm): BuildingModel {
  const kit: Builder = createBuilder(form.name, form.id);
  const shell = kit.batch("One Prudential · shell", kit.material(0xffffff, { vertexColors: true }));
  const glazing = kit.batch("One Prudential · windows and spandrels", kit.material(0xffffff, { vertexColors: true }));
  const piers = kit.batch("One Prudential · limestone piers", kit.material(0xb4b4b4));
  const bands = kit.batch("One Prudential · limestone courses", kit.material(0xc0c0c0));
  const penthouse = kit.batch("One Prudential · penthouse and sign", kit.material(0xffffff, { vertexColors: true }));
  const fins = kit.batch("One Prudential · screen louvers", kit.material(0x707070));
  const mast = kit.batch("One Prudential · antenna mast", kit.material(0xb4b4b4));
  const base = form.base;
  const y = (real: number) => real - base;
  const shown = (real: number) => real > base + 1e-6;

  const tower = orient(form.tower), towerPlan = planOf(tower);
  const wings = form.wings.filter(({ top }) => shown(top)).map(({ outline, top }) => ({ outline: orient(outline), plan: planOf(orient(outline)), top }));
  // A wall is covered, up to a neighbour's roof, where a probe just outside it lands inside
  // that neighbour: the tower covers its wings' inner walls, and the wings the tower's lower ones.
  const parts = [{ outline: tower, top: h.roof }, ...wings.map(({ outline, top }) => ({ outline, top }))];
  const coveredTo = (run: Run, own: Vec2[]) => Math.max(base, ...parts.filter(({ outline }) => outline !== own && inside(outline, run.at(run.length / 2, 0.3))).map(({ top }) => top));
  const turns = (plan: Plan, index: number) => [turnAt(plan[(index + plan.length - 1) % plan.length]!, plan[index]!), turnAt(plan[index]!, plan[(index + 1) % plan.length]!)] as const;

  // The solids: walls, floors, and roofs, closed. Walls behind the facade are spandrel
  // aluminium; a wall too short for a bay is plain limestone.
  const solid = (outline: Vec2[], plan: Plan, top: number, paint: (run: Run) => THREE.Color) => {
    plan.forEach((run) => {
      const a = run.at(0), b = run.at(run.length), n = run.normal(0);
      kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], y(top), b[1]], [a[0], y(top), a[1]]], [[n[0], 0, n[1]]], paint(run));
    });
    paintedSlab(kit, shell, outline, 0, false, roofing);
    paintedSlab(kit, shell, outline, y(top), true, roofing);
  };

  // Piers cross the joints of a chain in pieces, one per run, mitred on each joint's bisector
  // as the courses are, each standing above whatever covers its own run. Where the cover
  // changes at a joint, the less covered run's last 2 cm stand from the higher cover, so the
  // piece ends clear of the neighbour's wall. Cells stop a little short of every joint, of
  // a more covered neighbour, and of the wedge a concave joint would push into the next run's.
  const trim = (plan: Plan, chain: Chain, froms: number[], k: number, other: number) => {
    if (other < 0 || other >= chain.runs.length) return 0;
    const [a, b] = other > k ? [chain.runs[k]!, chain.runs[other]!] : [chain.runs[other]!, chain.runs[k]!];
    const turn = turnAt(plan[a]!, plan[b]!);
    return 0.005 + (turn > 0 ? 0.08 * Math.tan(turn / 2) : 0) + (froms[k]! < froms[other]! ? 0.01 : 0);
  };
  const pierOn = (plan: Plan, chain: Chain, froms: number[], a: number, b: number, depth: number, top: number) => {
    const last = chain.runs.length - 1;
    chain.runs.forEach((index, k) => {
      const run = plan[index]!, start = chain.starts[k]!, end = start + run.length;
      const lo = Math.max(a, start), hi = Math.min(b, end);
      if (hi - lo < 0.005) return;
      const [before, after] = turns(plan, index);
      const mitreLo = lo === start && (a < start || (k === 0 && a === 0)) ? before : undefined;
      const mitreHi = hi === end && (b > end || (k === last && b === chain.length)) ? after : undefined;
      const pieces: [number, number, number, number | undefined, number | undefined][] = [[lo, hi, froms[k]!, mitreLo, mitreHi]];
      if (mitreHi !== undefined && k < last && froms[k]! < froms[k + 1]! && hi - 0.02 > lo) pieces.splice(0, 1, [lo, hi - 0.02, froms[k]!, mitreLo, undefined], [hi - 0.02, hi, froms[k + 1]!, undefined, mitreHi]);
      const first = pieces[0]!;
      if (mitreLo !== undefined && k > 0 && froms[k]! < froms[k - 1]! && first[1] > lo + 0.02) pieces.splice(0, 1, [lo, lo + 0.02, froms[k - 1]!, mitreLo, undefined], [lo + 0.02, first[1], first[2], undefined, first[4]]);
      for (const [p0, p1, from, m0, m1] of pieces) {
        if (from < top) mitredBox(kit, piers, run, p0 - start, p1 - start, m0, m1, depth, Math.max(from, 0.3), top, y);
      }
    });
  };
  // A run's cells start just above its piers, so their undersides never share a plane.
  const cellsFrom = (from: number) => from + 0.1;

  // The tower's walls. Each chain of nearly collinear runs is one wall with one set of
  // piers; a run's windows start above whatever wing covers it.
  const towerChains = chainsOf(towerPlan);
  const plainRuns = new Set(towerChains.filter(({ length }) => length < 2 * endBay).flatMap(({ runs }) => runs));
  solid(tower, towerPlan, h.roof, (run) => (plainRuns.has(towerPlan.indexOf(run)) ? limestone : aluminium));
  towerChains.forEach((chain, wall) => {
    if (chain.length < 2 * endBay) return;
    const { piers: stations, corner } = wallStations(chain.length);
    const columns = [corner - 0.2, ...stations, chain.length - corner + 0.2];
    const froms = chain.runs.map((index) => coveredTo(towerPlan[index]!, tower));
    chain.runs.forEach((index, k) => {
      const run = towerPlan[index]!, start = chain.starts[k]!, end = start + run.length;
      const rows = wallRows(cellsFrom(froms[k]!), h.copingFoot);
      // Windows and spandrels: one box on the run, a column per bay and a row per window,
      // spandrel, and the observatory band.
      const first = Math.max(columns[0]!, start + trim(towerPlan, chain, froms, k, k - 1)), last = Math.min(columns.at(-1)!, end - trim(towerPlan, chain, froms, k, k + 1));
      const local = [first, ...columns.filter((s) => s > first + 1e-6 && s < last - 1e-6), last];
      const offset = columns.filter((s) => s <= first + 1e-6).length - 1;
      if (last - first < 0.05 || !rows.length) return;
      gridBox(kit, glazing, run, local.map((s) => s - start), [rows[0]!.lo, ...rows.map((row) => row.hi)], 0.02, 0.07, (column, r) => {
        const row = rows[r]!, bay = offset + column;
        if (row.kind === "spandrel") return aluminium;
        if (row.kind === "band") return paneColor(row.floor, bay, wall).equals(litGlass) ? litObservatory : observatory[bay % observatory.length]!;
        return paneColor(row.floor, bay, wall);
      }, aluminium, y);
    });
    // The piers, from the street to the sill course, standing proud of the glass: one on
    // every bay line, and a wider one at each corner.
    for (const s of stations) pierOn(towerPlan, chain, froms, s - pierHalf, s + pierHalf, pierDepth, h.sillCourse);
    pierOn(towerPlan, chain, froms, 0, corner, pierDepth, h.sillCourse);
    pierOn(towerPlan, chain, froms, chain.length - corner, chain.length, pierDepth, h.sillCourse);
  });
  // The limestone sill course under the observatory and the coping over it, round every run.
  towerPlan.forEach((run, index) => {
    const [before, after] = turns(towerPlan, index);
    if (shown(h.bandFoot)) mitredBox(kit, bands, run, 0, run.length, before, after, pierDepth, Math.max(h.sillCourse, base), h.bandFoot, y);
    if (shown(h.roof)) mitredBox(kit, bands, run, 0, run.length, before, after, 0.35, Math.max(h.copingFoot, base), h.roof, y);
  });

  // The wings: dark spandrels between limestone ribs on the same module, a window per bay
  // on each floor, and a coping. Walls the tower covers carry nothing.
  wings.forEach(({ outline, plan, top }, number) => {
    solid(outline, plan, top, () => darkSpandrel);
    // Where a wall meets the tower, its cells and coping stop clear of the tower's piers.
    const coping = top - 0.5, clear = pierDepth + 0.05;
    const open = plan.map((run) => coveredTo(run, outline) < coping);
    chainsOf(plan).forEach((chain, wall) => {
      const ribs = wingRibs(chain.length);
      const froms = chain.runs.map((index) => (open[index] ? coveredTo(plan[index]!, outline) : top));
      chain.runs.forEach((index, k) => {
        const run = plan[index]!, start = chain.starts[k]!;
        // The cells stop under the coping, clear of the ribs' tops.
        const rows = wallRows(cellsFrom(froms[k]!), coping - 0.05).filter((row) => row.kind !== "band");
        if (!open[index] || !rows.length) return;
        // Cells stop short of a wall the tower covers, clear of the tower's piers in the corner.
        const s0 = open[(index + plan.length - 1) % plan.length] ? trim(plan, chain, froms, k, k - 1) : clear;
        const s1 = run.length - (open[(index + 1) % plan.length] ? trim(plan, chain, froms, k, k + 1) : clear);
        const local = [s0, ...ribs.filter((s) => s > start + s0 + 1e-6 && s < start + s1 - 1e-6).map((s) => s - start), s1];
        const offset = ribs.filter((s) => s <= start + 1e-6).length;
        gridBox(kit, glazing, run, local, [rows[0]!.lo, ...rows.map((row) => row.hi)], 0.02, 0.07,
          (column, r) => (rows[r]!.kind === "glass" ? paneColor(rows[r]!.floor, offset + column, 40 + 10 * number + wall) : darkSpandrel), darkSpandrel, y);
      });
      for (const s of ribs) pierOn(plan, chain, froms, s - ribHalf, s + ribHalf, pierDepth, coping);
    });
    // The coping, mitred between open walls. Against the tower it is mitred as if into a
    // concave corner, its inner edge on the wall's own corners and its outer edge clear of
    // the tower's piers.
    plan.forEach((run, index) => {
      if (!open[index]) return;
      const [before, after] = turns(plan, index), quarter = Math.PI / 2;
      mitredBox(kit, bands, run, 0, run.length, open[(index + plan.length - 1) % plan.length] ? before : quarter, open[(index + 1) % plan.length] ? after : quarter, 0.35, Math.max(coping, base), top, y);
    });
  });

  // The penthouse: a pale wall carrying the sign, under a dark screen of limestone-grey fins.
  const { corner, along, length, depth } = form.penthouse;
  const inward: Vec2 = [along[1], -along[0]];
  const offsetBy = ([x, z]: Vec2, s: number, d: number): Vec2 => [x + along[0] * s + inward[0] * d, z + along[1] * s + inward[1] * d];
  const penthouseOutline = orient([corner, offsetBy(corner, length, 0), offsetBy(corner, length, depth), offsetBy(corner, 0, depth)]);
  const penthousePlan = planOf(penthouseOutline);
  penthousePlan.forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0), normal: Vec3[] = [[n[0], 0, n[1]]];
    const p = (q: Vec2, v: number): Vec3 => [q[0], y(v), q[1]];
    kit.quad(penthouse, [p(a, h.roof), p(b, h.roof), p(b, h.louverBottom), p(a, h.louverBottom)], normal, penthouseWall);
    kit.quad(penthouse, [p(a, h.louverBottom), p(b, h.louverBottom), p(b, h.penthouseTop), p(a, h.penthouseTop)], normal, louverBacking);
    const front = n[1] > 0.9;
    for (const s of screenFins(run.length, front)) kit.box(fins, run.at(s), n, finHalf, 0, finDepth, y(h.louverBottom + 0.15), y(h.penthouseTop - 0.15));
    if (front) {
      const pitch = (sign.name[1] - sign.name[0]) / sign.letters;
      const letters = Array.from({ length: sign.letters }, (_, i) => [sign.name[0] + i * pitch + 0.25, sign.name[0] + (i + 1) * pitch - 0.25]).flat();
      const columns = [sign.board[0], sign.logo[0], sign.logo[1], ...letters, sign.board[1]];
      // Rows: the board's foot, the logo, the letters, the tall letters, the board's head.
      gridBox(kit, penthouse, run, columns, [h.signBottom, ...sign.rows, h.signTop], 0.02, 0.25, (column, row) => {
        if (column === 1) return row >= 1 && row <= 3 ? logo : board;
        const letter = (column - 3) / 2;
        if (column < 3 || !Number.isInteger(letter) || letter >= sign.letters) return board;
        return row === 2 || (row === 3 && sign.tall.has(letter)) ? lettering : board;
      }, board, y);
    }
  });
  paintedSlab(kit, penthouse, penthouseOutline, y(h.roof), false, roofing);
  paintedSlab(kit, penthouse, penthouseOutline, y(h.penthouseTop), true, roofing);

  // The mast: an eight-sided steel tube tapering from the roof to its top, capped by a fan
  // from its axis, and WGN's slim antenna on to the published tip.
  const [mx, mz] = form.mast, sides = 8;
  const ring = (radius: number, v: number): Vec3[] => Array.from({ length: sides }, (_, i) => { const a = (i + 0.5) * 2 * Math.PI / sides; return [mx + radius * Math.cos(a), y(v), mz - radius * Math.sin(a)]; });
  const foot = ring(mastFoot, h.roof), head = ring(mastHead, h.mastTop);
  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides, a = (i + 1) * 2 * Math.PI / sides, out: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
    kit.quad(mast, [foot[i]!, foot[j]!, head[j]!, head[i]!], [out]);
    kit.triangle(mast, [[mx, y(h.mastTop), mz], head[i]!, head[j]!], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    kit.triangle(mast, [[mx, y(h.roof), mz], foot[j]!, foot[i]!], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
  }
  kit.box(mast, form.mast, [0, 1], antennaHalf, -antennaHalf, antennaHalf, y(h.mastTop), y(h.tip));

  return kit.finish({ height: y(h.tip), outlines: [shell, bands], opacity: 0.18 });
}
