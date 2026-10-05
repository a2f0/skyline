import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside } from "./building-kit.js";
import type { BuildingModel, Builder, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import { chainSkin, chainsOf, jointTrim, orient, planOf, turnsAt } from "./facade-grid.js";
import type { Chain } from "./facade-grid.js";

// Trump International Hotel and Tower, 401 North Wabash Avenue (Adrian Smith of Skidmore,
// Owings & Merrill, 2009), shared by the drawing-fitted model and the geographic one. A
// glass tower of rounded and bevelled faces rises in setbacks from a riverside podium. Its
// curtain wall hangs in 6 ft units between polished stainless-steel mullions that stand 9 in
// proud, with a brushed stainless spandrel at every floor. The main roof steps down over the
// tower's north-east end, where a glazed mechanical crown stands, and a three-section spire
// rises from the crown to the published tip.
//
// A form gives the outlines and heights above the street; `base` is the height the model's
// y = 0 stands at, so a model can start above grade. See docs/trump-reference.md. Units are
// meters; +x is east and +z is south.

export interface TrumpForm {
  name: string;
  id: string;
  // The podium and the tower's tiers, each standing on the one before; the last is the shaft.
  tiers: { outline: Vec2[]; top: number }[];
  // The shaft's roof steps down north of this line of constant z.
  step: number;
  crown: Vec2[];
  spire: Vec2;
  base: number;
}

// Heights above the street. The tip is published; the setbacks are the mapped parts'; the
// roof, the shoulder, the crown, the spire's joints, and the floor rows are measured on the
// photograph the drawing was traced from, down from the tip. See docs/trump-reference.md.
export const trumpLevels = Object.freeze({
  podium: 60,
  setbacks: [120, 200] as const,
  roof: 354.4,
  shoulder: 347.3,
  crownTop: 364.9,
  joints: [377.4, 402.2] as const,
  tip: 423.2,
  // Floor lines: one on the drawn rows, then every 3.214 m, from a tall ground storey up.
  floorLine: 187.01,
  pitch: 3.214,
  lobbyTop: 10.5,
  // The curtain wall's 6 ft units.
  module: 1.8288,
});
const h = trumpLevels;
// Every floor line from the lobby's top to the crown's top: the crown's mechanical floors
// keep the tower's pitch.
export const floorLines = (() => {
  const lines: number[] = [];
  let first = h.floorLine;
  while (first - h.pitch >= h.lobbyTop - 1e-6) first -= h.pitch;
  for (let level = first; level < h.crownTop; level += h.pitch) lines.push(level);
  return lines;
})();
// Each floor's brushed stainless spandrel straddles its slab; the glass fills the rest.
const spandrelBelow = 0.35, spandrelAbove = 0.55;

// Mullions stand one module apart along each wall, a curved run of the trace following on
// from the last, so they keep their rhythm round the rounded corners. A turn of 40° or more
// starts a new wall: the bevels and the notches.
const bend = 40 * Math.PI / 180;
export function mullionStations(length: number) {
  const count = Math.max(1, Math.round(length / h.module));
  return Array.from({ length: count + 1 }, (_, i) => length * i / count);
}
const mullionHalf = 0.06, mullionDepth = 0.23;
// How far a wall's glass and mullions stop short of a stretch something else stands on.
const clearance = 0.2;

// Where a chain's mullions stand: one per station, whole on one run, nudged clear of the
// joints and held back from the wall's ends by its own depth, so it meets neither a
// neighbouring wall's mullion nor the end of a run's glass. Each is its run's index in the
// chain and the distance along that run.
function mullionsOn(plan: Plan, chain: Chain, froms: number[]) {
  const placed: { k: number; s: number }[] = [];
  for (const station of mullionStations(chain.length)) {
    const k = chain.starts.findIndex((start, i) => station < start + plan[chain.runs[i]!]!.length + 1e-9);
    if (k < 0) continue;
    const run = plan[chain.runs[k]!]!, start = chain.starts[k]!;
    const clear = (other: number) => (other < 0 || other >= chain.runs.length ? mullionDepth + 0.02 : froms[other]! > froms[k]! ? clearance : 0.03) + mullionHalf;
    const lo = clear(k - 1), hi = run.length - clear(k + 1);
    if (hi >= lo) placed.push({ k, s: Math.min(Math.max(station - start, lo), hi) });
  }
  return placed;
}
// Every mullion of an outline's curtain wall, in plan, with the wall's outward normal, for
// features: the same placement the model is built with, given what each run stands on.
export function mullionPoints(corners: Vec2[], runFrom: (run: Run) => number) {
  const plan = planOf(orient(corners));
  return chainsOf(plan, bend).flatMap((chain) => {
    const froms = chain.runs.map((index) => runFrom(plan[index]!));
    return mullionsOn(plan, chain, froms).map(({ k, s }) => { const run = plan[chain.runs[k]!]!; return { at: run.at(s), normal: run.normal(0) }; });
  });
}

const color = (hex: number) => new THREE.Color(hex);
const glassTones = [0x2a2a2a, 0x2e2e2e, 0x333333, 0x272727].map(color);
const litGlass = color(0x7c7c7c), dimGlass = color(0x505050);
const spandrel = color(0x474747), crownGlass = color(0x232323), crownBand = color(0x3c3c3c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 11, 0x9e3779b1) ^ Math.imul(bay + 29, 0x85ebca77) ^ Math.imul(wall + 3, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 3) return litGlass;
  if (value < 6) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// An outline with the crossings of a line of constant z inserted as vertices, and the part
// of it south of that line.
export function splitAt(corners: Vec2[], z: number) {
  const outline: Vec2[] = [], south: Vec2[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length]!;
    outline.push(a);
    if (a[1] >= z - 1e-9) south.push(a);
    if ((a[1] - z) * (b[1] - z) < -1e-12) {
      const t = (z - a[1]) / (b[1] - a[1]), cross: Vec2 = [a[0] + (b[0] - a[0]) * t, z];
      outline.push(cross);
      south.push(cross);
    }
  });
  return { outline, south };
}

// The shaft's outline broken at the step's line; the cap, its part south of the line, which
// stands on to the roof; and the crown's outline broken there too. The crown crosses the
// step's line, and its crossings break the step's wall, so the stretch the crown stands on
// carries no facade.
export function topOutlines(shaftCorners: Vec2[], step: number, crownCorners: Vec2[]) {
  const split = splitAt(orient(shaftCorners), step);
  const crown = splitAt(orient(crownCorners), step).outline;
  const crossings = crown.filter(([, z]) => Math.abs(z - step) < 1e-9);
  const cap = orient(split.south).flatMap((corner, i, corners) => {
    const next = corners[(i + 1) % corners.length]!;
    if (Math.abs(corner[1] - step) > 1e-9 || Math.abs(next[1] - step) > 1e-9) return [corner];
    const between = crossings.filter(([x]) => (x - corner[0]) * (x - next[0]) < -1e-9).sort((a, b) => Math.abs(a[0] - corner[0]) - Math.abs(b[0] - corner[0]));
    return [corner, ...between];
  });
  return { shaft: split.outline, cap, crown };
}
// What a crown wall stands on: the roof where it rises from the cap, the shoulder elsewhere.
export const crownFoot = (cap: Vec2[]) => (run: Run) => (inside(cap, run.at(run.length / 2, 0.3)) ? h.roof : h.shoulder);

export function buildTrumpTower(form: TrumpForm): BuildingModel {
  const kit: Builder = createBuilder(form.name, form.id);
  const shell = kit.batch("Trump · tower shell", kit.material(0x2c2c2c));
  const glazing = kit.batch("Trump · glass and spandrels", kit.material(0xffffff, { vertexColors: true }));
  const mullions = kit.batch("Trump · stainless mullions", kit.material(0x9a9a9a));
  const crown = kit.batch("Trump · crown", kit.material(0xffffff, { vertexColors: true }));
  const fins = kit.batch("Trump · crown mullions", kit.material(0x8c8c8c));
  const spire = kit.batch("Trump · spire", kit.material(0xd0d0d0));
  const base = form.base;
  const y = (real: number) => real - base;
  const clamp = (real: number) => Math.max(real, base);

  // The tiers, each a closed solid on the one below. The shaft stands to the shoulder all
  // round, and its south part carries on to the roof.
  const shaft = form.tiers.length - 1;
  const bottoms = form.tiers.map((_, i) => (i === 0 ? 0 : form.tiers[i - 1]!.top));
  const { shaft: shaftOutline, cap, crown: crownOutline } = topOutlines(form.tiers[shaft]!.outline, form.step, form.crown);
  const outlines = form.tiers.map(({ outline }, i) => (i === shaft ? shaftOutline : orient(outline)));
  const tops = form.tiers.map(({ top }, i) => (i === shaft ? h.shoulder : top));
  const capPlan = planOf(cap);
  outlines.forEach((outline, i) => { if (tops[i]! > base) kit.prism(shell, planOf(outline), [y(clamp(bottoms[i]!)), y(tops[i]!)]); });
  if (h.roof > base) kit.prism(shell, capPlan, [y(clamp(h.shoulder)), y(h.roof)]);

  // A wall's rows from `from` to `to`: the lobby's glass, then each floor's spandrel and the
  // glass above it. Each row says what it is and which floor it belongs to.
  type Row = { lo: number; hi: number; glass: boolean; floor: number };
  const wallRows = (from: number, to: number): Row[] => {
    const rows: Row[] = [{ lo: 0.4, hi: floorLines[0]! - spandrelBelow, glass: true, floor: 0 }];
    floorLines.forEach((line, i) => {
      const next = floorLines[i + 1];
      rows.push({ lo: line - spandrelBelow, hi: line + spandrelAbove, glass: false, floor: i + 1 });
      rows.push({ lo: line + spandrelAbove, hi: next === undefined ? h.crownTop + 10 : next - spandrelBelow, glass: true, floor: i + 1 });
    });
    if (to <= from) return [];
    return rows.filter((row) => row.hi > from + 1e-6 && row.lo < to - 1e-6).map((row) => ({ ...row, lo: Math.max(row.lo, from), hi: Math.min(row.hi, to) }));
  };

  // A curtain wall on every run of an outline from `from` to the run's top: mullions one
  // module apart along each wall, and between them glass and spandrel cells two modules
  // wide, in one mitred skin along each stretch of a wall that starts and stops at the same
  // heights. A skin starts just above its mullions, so their undersides never share a plane.
  const curtainWall = (outline: Vec2[], runFrom: (run: Run) => number, runTop: (run: Run) => number, cells: typeof glazing, frames: typeof mullions, paint: (row: Row, bay: number, wall: number) => THREE.Color, seed: number) => {
    const plan = planOf(outline);
    chainsOf(plan, bend).forEach((chain, wall) => {
      const stations = mullionStations(chain.length), columns = stations.filter((_, i) => i % 2 === 0);
      const froms = chain.runs.map((index) => clamp(runFrom(plan[index]!)));
      const ceilings = chain.runs.map((index) => runTop(plan[index]!));
      for (let k0 = 0; k0 < chain.runs.length;) {
        let k1 = k0;
        while (k1 + 1 < chain.runs.length && froms[k1 + 1] === froms[k0] && ceilings[k1 + 1] === ceilings[k0]) k1 += 1;
        const rows = wallRows(froms[k0]! + 0.1, ceilings[k0]!);
        // At a wall's ends the glass stops short of a concave corner by the wedge its depth
        // would push into the neighbouring wall's glass, and where a stretch meets one that
        // something stands on, such as the crown on the step, it stops well clear of that.
        const cornerTrim = (turn: number) => (turn > 0 ? 0.08 * Math.tan(turn / 2) + 0.005 : 0);
        const s0 = chain.starts[k0]! + (k0 === 0 ? cornerTrim(turnsAt(plan, chain.runs[0]!)[0]) : jointTrim(plan, chain, froms, k0, k0 - 1, clearance));
        const s1 = chain.starts[k1]! + plan[chain.runs[k1]!]!.length - (k1 === chain.runs.length - 1 ? cornerTrim(turnsAt(plan, chain.runs[k1]!)[1]) : jointTrim(plan, chain, froms, k1, k1 + 1, clearance));
        if (rows.length && s1 - s0 > 0.05) {
          chainSkin(kit, cells, plan, chain, k0, k1, s0, s1, columns, [rows[0]!.lo, ...rows.map((row) => row.hi)], 0.02, 0.07, (bay, r) => paint(rows[r]!, bay, seed + wall), spandrel, y);
        }
        k0 = k1 + 1;
      }
      // Each mullion stands whole on one run and stops short of the glass's top.
      for (const { k, s } of mullionsOn(plan, chain, froms)) {
        const run = plan[chain.runs[k]!]!, from = Math.max(froms[k]!, 0.3), top = ceilings[k]! - 0.1;
        if (from < top) kit.box(frames, run.at(s), run.normal(0), mullionHalf, 0, mullionDepth, y(from), y(top));
      }
    });
  };
  const towerPaint = (row: Row, bay: number, wall: number) => (row.glass ? paneColor(row.floor, bay, wall) : spandrel);
  outlines.forEach((outline, i) => {
    if (tops[i]! <= base) return;
    // The shaft's south runs carry on to the roof.
    const southOf = (run: Run) => i === shaft && run.at(run.length / 2)[1] > form.step + 1e-6;
    curtainWall(outline, () => bottoms[i]!, (run) => (southOf(run) ? h.roof : tops[i]!), glazing, mullions, towerPaint, 10 * i);
  });
  // The step's north face, between the shoulder and the roof, is glazed like the rest where
  // the crown does not stand on it; the cap's other walls are the shaft's own, glazed above.
  const onStep = (run: Run) => Math.abs(run.at(0)[1] - form.step) < 1e-6 && Math.abs(run.at(run.length)[1] - form.step) < 1e-6;
  const underCrown = (run: Run) => inside(crownOutline, run.at(run.length / 2, 0.3));
  curtainWall(cap, (run) => (onStep(run) && !underCrown(run) ? h.shoulder : h.roof), () => h.roof, glazing, mullions, towerPaint, 90);

  // The crown: a darker glazed enclosure on the same curtain wall, from whichever roof it
  // stands on, capped flat. Its walls start above the roof around them.
  // The crown's outline breaks at the step too, so each of its walls starts above one roof.
  const crownPlan = planOf(crownOutline);
  // Its solid sinks half a metre into the shaft, clear of the roofs' planes.
  kit.prism(shell, crownPlan, [y(clamp(h.shoulder - 0.5)), y(h.crownTop)]);
  const crownPaint = (row: Row) => (row.glass ? crownGlass : crownBand);
  curtainWall(crownOutline, crownFoot(cap), () => h.crownTop, crown, fins, crownPaint, 100);

  // The spire: three stacked twelve-sided sections, each capped by a fan from its axis, the
  // joints and the tip where the photograph shows them.
  const [sx, sz] = form.spire, sides = 12;
  const section = (radius: number, lo: number, hi: number) => {
    const ring = (v: number): Vec3[] => Array.from({ length: sides }, (_, i) => { const a = (i + 0.5) * 2 * Math.PI / sides; return [sx + radius * Math.cos(a), y(v), sz - radius * Math.sin(a)]; });
    const [foot, head] = [ring(lo), ring(hi)];
    for (let i = 0; i < sides; i += 1) {
      const j = (i + 1) % sides, a = (i + 1) * 2 * Math.PI / sides, out: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
      kit.quad(spire, [foot[i]!, foot[j]!, head[j]!, head[i]!], [out]);
      kit.triangle(spire, [[sx, y(hi), sz], head[i]!, head[j]!], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
      kit.triangle(spire, [[sx, y(lo), sz], foot[j]!, foot[i]!], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
    }
  };
  section(1.45, h.crownTop, h.joints[0]);
  section(1.05, h.joints[0], h.joints[1]);
  section(0.75, h.joints[1], h.tip);

  return kit.finish({ height: y(h.tip), outlines: [shell, crown], opacity: 0.2 });
}
