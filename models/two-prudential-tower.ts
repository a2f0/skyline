import * as THREE from "../vendor/three-r186.js";
import { createBuilder, line } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Vec2, Vec3 } from "./building-kit.js";
import { mitredBox } from "./facade-grid.js";

// Two Prudential Plaza as built, for both of the skyline study's layouts: the geographic
// model stands it on the mapped outline, and the original layout's copy on a clean plan cut
// at the drawing's datum. A 40.8 x 37.5 m limestone core rises to 229.3 m at its corners.
// Each face ends in a gable that steps up floor by floor to a pointed glass strip at its
// middle, 256 m, and a stepped pyramid turned 45° to the plan rises from those four points
// to 280.2 m, where the spire takes over to the published 303.3 m. On the north and south
// faces two gabled tiers stand forward of the core, the lower in front of the middle one,
// and fill the rest of the mapped depth. Heights are measured on the photograph, down from
// the published tip; the plan on the photograph against the mapped outline. See
// docs/two-prudential-reference.md. Units are meters; +x is east and +z is south.
export const twoPrudentialLevels = Object.freeze({
  pitch: 3.96, // the photograph's window rows
  lobbyTop: 11.52, // the first office floor, a whole number of floors below the tiers
  sill: 0.9,
  head: 2.9, // a window's sill and head above its floor
  lowerShoulder: 162,
  lowerPeak: 181.9,
  middleShoulder: 193.68,
  middlePeak: 217.2,
  eave: 229.32, // the core's corners
  peak: 256, // each face's gable
  apex: 280.2, // the pyramid
  shaftTop: 295.5, // the spire's shaft, under its needle
  tip: 303.3, // published architectural height
  floors: 64,
});
const h = twoPrudentialLevels;
export const floorLine = (floor: number) => h.lobbyTop + floor * h.pitch;

// A gabled wall: stone bays either side of a central glass strip, each bay one floor
// higher than the one outside it, from `shoulder` at the wall's ends. The strip's head
// rises from a floor above the last bay to `peak`. Widths are halves, from the middle.
export interface Gable { strip: number; bays: number; bay: number; half: number; shoulder: number; peak: number }
const gableOf = (strip: number, bays: number, bay: number, shoulder: number, peak: number): Gable => ({ strip, bays, bay, half: strip + bays * bay, shoulder, peak });
export const twoPrudentialGables = Object.freeze({
  // The core's north and south faces, five bays either side of the strip.
  front: gableOf(4.6, 5, 3.16, h.eave, h.peak),
  // The east and west faces, four wider bays either side of a wider strip.
  side: gableOf(5.7, 4, 3.2625, h.eave, h.peak),
  // The tiers keep the front's bays, four and three either side of its strip.
  middle: gableOf(4.6, 4, 3.16, h.middleShoulder, h.middlePeak),
  lower: gableOf(4.6, 3, 3.16, h.lowerShoulder, h.lowerPeak),
});
const g = twoPrudentialGables;
// The core's half-widths, east-west and north-south.
export const twoPrudentialCore: Vec2 = [g.front.half, g.side.half];
export const stripShoulder = (gable: Gable) => gable.shoulder + gable.bays * h.pitch;
// A wall's top at x from its middle.
export function wallTop(gable: Gable, x: number) {
  const r = Math.abs(x);
  if (r >= gable.strip) return gable.shoulder + Math.min(gable.bays - 1, Math.floor((gable.half - r) / gable.bay + 1e-9)) * h.pitch;
  return stripShoulder(gable) + (gable.peak - stripShoulder(gable)) * (1 - r / gable.strip);
}
// The half-width of the part of a wall that reaches a height.
export function wallExtent(gable: Gable, y: number) {
  if (y <= gable.shoulder + 1e-9) return gable.half;
  const steps = Math.ceil((y - gable.shoulder) / h.pitch - 1e-9);
  if (steps < gable.bays) return gable.half - steps * gable.bay;
  if (y <= stripShoulder(gable) + 1e-9) return gable.strip;
  return Math.max(0, gable.strip * (gable.peak - y) / (gable.peak - stripShoulder(gable)));
}
// The piers stand on every bay's edges: its corner pier's centre, then the joints inward to
// the strip's edge. Windows are centred in their bays.
const pierWidth = 0.9, pierDepth = 0.35, windowHalf = 0.8;
export const pierStations = (gable: Gable) => Array.from({ length: gable.bays + 1 }, (_, i) => (i ? gable.half - i * gable.bay : gable.half - pierWidth / 2));
// The pyramid's horizontal section at a height above the eave, in the core's frame: the
// core's walls to where each reaches, cut across each corner by the step's riser, and above
// the gables a rhombus on the four ridges.
export function crownSection(y: number): Vec2[] {
  const [a, b] = twoPrudentialCore, front = wallExtent(g.front, y), side = wallExtent(g.side, y);
  if (front > 1e-3 && side > 1e-3) return [[-front, b], [front, b], [a, side], [a, -side], [front, -b], [-front, -b], [-a, -side], [-a, side]];
  const t = (h.apex - y) / (h.apex - h.peak);
  return [[0, b * t], [a * t, 0], [0, -b * t], [-a * t, 0]];
}
// The crown's steps stop a floor under the apex, where a pointed cap and the spire take over.
export const crownSteps = Math.floor((h.apex - h.eave) / h.pitch - 0.25);

const color = (hex: number) => new THREE.Color(hex);
const stone = color(0x8a8a8a), stripSpandrel = color(0x4a4a4a), riserGlass = color(0x565656), band = color(0xcdcdcd);
const tread = color(0x7a7a7a), soffit = color(0x6a6a6a), roofGlass = color(0x3f3f3f);
const glassTones = [0x3a3a3a, 0x404040, 0x353535, 0x454545].map(color);
const litGlass = color(0x8e8e8e), dimGlass = color(0x5e5e5e);
function paneColor(floor: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(floor + 7, 0x9e3779b1) ^ Math.imul(bay + 43, 0x85ebca77) ^ Math.imul(wall + 2, 0xc2b2ae3d)) >>> 0;
  const value = hash % 97;
  if (value < 3) return litGlass;
  if (value < 6) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

export interface TwoPrudentialForm {
  name: string;
  id: string;
  // The core's centre, and the unit vector along its south face, eastward.
  centre: Vec2;
  along: Vec2;
  // How far the lower tiers' fronts stand from the core's centre, south then north. Each
  // tier takes half of the depth in front of the core.
  fronts: [number, number];
  // Real heights below this datum are cut away, and y = 0 is the datum.
  base: number;
  // The mapped outline, standing from grade to the lobby's top.
  lobby?: Plan;
}

// What a prism's edge carries: a gabled wall's bays from x = `from` at its start, the ends
// of a tier's side with a ribbon window on each floor, a crown step's riser, or plain stone.
type Edge = { wall: Wall; from: number } | { ribbon: number } | { riser: true } | { plain: THREE.Color };
interface Wall { gable: Gable; seed: number }

export function buildTwoPrudentialTower(form: TwoPrudentialForm): BuildingModel {
  const kit = createBuilder(form.name, form.id);
  const body = kit.batch("Two Prudential · limestone, glass and crown", kit.material(0xffffff, { vertexColors: true }));
  const piers = kit.batch("Two Prudential · piers", kit.material(0x9c9c9c));
  const copings = kit.batch("Two Prudential · copings", kit.material(0xc6c6c6));
  const mullions = kit.batch("Two Prudential · strip mullions", kit.material(0x707070));
  const ribs = kit.batch("Two Prudential · crown ribs", kit.material(0xd8d8d8));
  const spire = kit.batch("Two Prudential · spire", kit.material(0xe9e9e9));
  const spirePanels = kit.batch("Two Prudential · spire inset panels", kit.material(0x575757));
  const y = (real: number) => real - form.base;
  const [coreA, coreB] = twoPrudentialCore;

  // The core's frame, and the same turned half a turn: the north and west halves are the
  // south and east ones seen from the other side, so one description builds both.
  // Frames 2 and 3 face east and west: their south axis is the side face's outward normal.
  const frames = [form.along, [-form.along[0], -form.along[1]] as Vec2].map((a) => ({ a, s: [-a[1], a[0]] as Vec2 }));
  frames.push(...frames.map(({ a, s }) => ({ a: [-s[0], -s[1]] as Vec2, s: a })));
  const at = (frame: number, u: number, v: number): Vec2 => {
    const { a, s } = frames[frame]!;
    return [form.centre[0] + a[0] * u + s[0] * v, form.centre[1] + a[1] * u + s[1] * v];
  };
  const lift = ([x, z]: Vec2, real: number): Vec3 => [x, y(real), z];
  // Heights a solid spans, cut at the datum: none when it lies wholly below.
  const above = (rows: number[]) => {
    if (rows.at(-1)! <= form.base + 1e-6) return null;
    return rows[0]! >= form.base ? rows : [form.base, ...rows.filter((r) => r > form.base + 1e-6)];
  };
  // Sills and heads strictly between two heights, plus any extra offsets within a floor:
  // the floor lines themselves divide stone from stone, so they need no cut.
  const rowsBetween = (lo: number, hi: number, extra: number[] = []) => {
    const cuts = new Set<number>([lo, hi]);
    for (let floor = Math.floor((lo - h.lobbyTop) / h.pitch) - 1; floorLine(floor) < hi; floor += 1) {
      for (const offset of [h.sill, h.head, ...extra]) {
        const r = Math.round((floorLine(floor) + offset) * 1e6) / 1e6;
        if (r > lo + 1e-6 && r < hi - 1e-6) cuts.add(r);
      }
    }
    return [...cuts].sort((p, q) => p - q);
  };
  const floorOf = (real: number) => Math.floor((real - h.lobbyTop) / h.pitch + 1e-9);
  const vision = (real: number) => { const o = real - floorLine(floorOf(real)); return o > h.sill && o < h.head; };

  // A gabled wall's cuts: every window's edges and the strip's. A bay's edge divides stone
  // from stone, under a pier.
  const wallCuts = (gable: Gable) => {
    const radii = [gable.strip];
    for (let i = 0; i < gable.bays; i += 1) {
      const centre = gable.half - (i + 0.5) * gable.bay;
      radii.push(centre - windowHalf, centre + windowHalf);
    }
    return [...new Set(radii.flatMap((r) => [-r, r]))].sort((p, q) => p - q);
  };
  const paintWall = (wall: Wall, x: number, real: number) => {
    const r = Math.abs(x), gable = wall.gable;
    if (r < gable.strip) return vision(real) ? paneColor(floorOf(real), Math.floor((x + gable.strip) / 1.8), wall.seed + 50) : stripSpandrel;
    const bay = Math.min(gable.bays - 1, Math.floor((gable.half - r) / gable.bay));
    const centre = gable.half - (bay + 0.5) * gable.bay;
    return vision(real) && Math.abs(r - centre) < windowHalf ? paneColor(floorOf(real), Math.sign(x) * (bay + 1), wall.seed) : stone;
  };

  // A closed prism on a convex ring, counterclockwise from above, whose walls are cut into
  // painted cells along each edge and at every row. Its top and bottom fan out from its
  // centre through every cut, so each cell's edge meets its partner.
  const prism = (ring: Vec2[], rowsIn: number[], edges: Edge[], top = tread, bottom = soffit) => {
    const rows = above(rowsIn);
    if (!rows) return;
    const loop: Vec2[] = [];
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const t: Vec2 = [(b[0] - a[0]) / length, (b[1] - a[1]) / length], out: Vec3 = [-t[1], 0, t[0]], edge = edges[i]!;
      let cuts: number[] = [];
      if ("wall" in edge) cuts = wallCuts(edge.wall.gable).map((x) => x - edge.from);
      else if ("ribbon" in edge) cuts = [pierWidth + 0.05, length - 0.35];
      const stations = [0, ...cuts.filter((s) => s > 1e-3 && s < length - 1e-3), length];
      const points = stations.map((s, k): Vec2 => (k === 0 ? a : k === stations.length - 1 ? b : [a[0] + t[0] * s, a[1] + t[1] * s]));
      loop.push(...points.slice(0, -1));
      for (let k = 0; k + 1 < points.length; k += 1) {
        const middle = (stations[k]! + stations[k + 1]!) / 2;
        for (let r = 0; r + 1 < rows.length; r += 1) {
          const [lo, hi] = [rows[r]!, rows[r + 1]!], real = (lo + hi) / 2;
          let paint = stone;
          if ("wall" in edge) paint = paintWall(edge.wall, edge.from + middle, real);
          else if ("ribbon" in edge) paint = k === 1 && vision(real) ? paneColor(floorOf(real), 90 + i, 7) : stone;
          else if ("riser" in edge) paint = real - floorLine(floorOf(real)) < 2.5 ? riserGlass : band;
          else paint = edge.plain;
          const [p, q] = [points[k]!, points[k + 1]!];
          kit.quad(body, [lift(p, lo), lift(q, lo), lift(q, hi), lift(p, hi)], [out], paint);
        }
      }
    });
    const centre: Vec2 = [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length];
    const [lo, hi] = [rows[0]!, rows.at(-1)!];
    loop.forEach((p, i) => {
      const q = loop[(i + 1) % loop.length]!;
      kit.triangle(body, [lift(centre, hi), lift(p, hi), lift(q, hi)], [[0, 1, 0], [0, 1, 0], [0, 1, 0]], top);
      kit.triangle(body, [lift(centre, lo), lift(p, lo), lift(q, lo)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]], bottom);
    });
  };
  const ringOf = (frame: number, corners: Vec2[]) => corners.map(([u, v]) => at(frame, u, v));

  // A closed solid extruded along a frame's south axis from a convex profile in (u, height):
  // a strip's pointed head, or a tier's strip with its gabled roof.
  const extrude = (target: BatchData, frame: number, profile: [number, number][], v0: number, v1: number, front: THREE.Color, sides: THREE.Color) => {
    const rows = profile.map(([, real]) => real);
    if (Math.max(...rows) <= form.base) return;
    const cut = profile.map(([u, real]): [number, number] => [u, Math.max(real, form.base)]);
    const { a, s } = frames[frame]!, point = (u: number, real: number, v: number) => lift(at(frame, u, v), real);
    const centroid = [cut.reduce((sum, p) => sum + p[0], 0) / cut.length, cut.reduce((sum, p) => sum + p[1], 0) / cut.length] as const;
    const fan = (v: number, normal: Vec3, paint: THREE.Color) => cut.forEach((p, i) => {
      const q = cut[(i + 1) % cut.length]!;
      kit.triangle(target, [point(centroid[0], centroid[1], v), point(p[0], p[1], v), point(q[0], q[1], v)], [normal, normal, normal], paint);
    });
    fan(v1, [s[0], 0, s[1]], front);
    fan(v0, [-s[0], 0, -s[1]], sides);
    cut.forEach((p, i) => {
      const q = cut[(i + 1) % cut.length]!, du = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(du, dy);
      if (length < 1e-6) return;
      let [nu, ny] = [dy / length, -du / length];
      if (nu * ((p[0] + q[0]) / 2 - centroid[0]) + ny * ((p[1] + q[1]) / 2 - centroid[1]) < 0) [nu, ny] = [-nu, -ny];
      kit.quad(target, [point(p[0], p[1], v0), point(q[0], q[1], v0), point(q[0], q[1], v1), point(p[0], p[1], v1)], [[a[0] * nu, ny, a[1] * nu]], sides);
    });
  };

  // The lobby: the mapped outline from grade to the first office floor.
  if (form.lobby && form.base < h.lobbyTop) kit.prism(kit.batch("Two Prudential · lobby", kit.material(0x5a5a5a)), form.lobby, [y(Math.max(0, form.base)), y(h.lobbyTop)]);

  // The core: its shaft to the eave, in one piece, so no seam crosses its faces where the
  // tiers stop covering them.
  const walls = (frame: number) => ({ front: { gable: g.front, seed: frame * 4 }, side: { gable: g.side, seed: frame * 4 + 1 } });
  prism(ringOf(0, [[-coreA, coreB], [coreA, coreB], [coreA, -coreB], [-coreA, -coreB]]), rowsBetween(h.lobbyTop, h.eave),
    [0, 1].flatMap((frame): Edge[] => [{ wall: walls(frame).front, from: -coreA }, { wall: walls(frame).side, from: -coreB }]));

  // The crown: one floor's step at a time, each on the pyramid's section at its top, so
  // every step's nosing lies on the pyramid. Its walls are the gables' stepped bays.
  let crownTop: number = h.eave;
  for (let step = 1; step <= crownSteps; step += 1) {
    const lo = h.eave + (step - 1) * h.pitch, hi = lo + h.pitch, section = crownSection(hi);
    const edges: Edge[] = section.length === 8
      ? [0, 1].flatMap((frame) => [
        { wall: walls(frame).front, from: -wallExtent(g.front, hi) }, { riser: true } as const,
        { wall: walls(frame).side, from: -wallExtent(g.side, hi) }, { riser: true } as const])
      : section.map(() => ({ riser: true }) as const);
    prism(ringOf(0, section), rowsBetween(lo, hi, [2.5]), edges);
    crownTop = hi;
  }
  // The cap: from the last step's section to the apex.
  {
    const section = ringOf(0, crownSection(crownTop)), apex = lift(form.centre, h.apex);
    section.forEach((p, i) => {
      const q = section[(i + 1) % section.length]!, [pp, qq] = [lift(p, crownTop), lift(q, crownTop)];
      const u = pp.map((value, k) => value - apex[k]!), w = qq.map((value, k) => value - apex[k]!);
      const n: Vec3 = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
      kit.triangle(body, [apex, pp, qq], [n, n, n].map((v) => (v[1] < 0 ? v.map((c) => -c) : v) as Vec3), band);
    });
    kit.triangle(body, [lift(section[0]!, crownTop), lift(section[1]!, crownTop), lift(section[2]!, crownTop)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]], soffit);
    kit.triangle(body, [lift(section[0]!, crownTop), lift(section[2]!, crownTop), lift(section[3]!, crownTop)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]], soffit);
  }

  // The tiers, on the north and south faces: each a block to its shoulder and a step per
  // bay inward, with its strip's gabled head over the last.
  const tiers = [0, 1].flatMap((frame) => {
    const depth = (form.fronts[frame]! - coreB) / 2;
    return [
      { frame, gable: g.middle, back: coreB, front: coreB + depth, seed: 10 + frame * 2 },
      { frame, gable: g.lower, back: coreB + depth, front: form.fronts[frame]!, seed: 11 + frame * 2 },
    ];
  });
  for (const tier of tiers) {
    const { frame, gable, back, front } = tier, wall: Wall = { gable, seed: tier.seed };
    const block = (half: number) => ringOf(frame, [[-half, front], [half, front], [half, back], [-half, back]]);
    const sides = (half: number, ribbon = true): Edge[] => [{ wall, from: -half }, ribbon ? { ribbon: front - back } : { plain: stone }, { plain: stone }, ribbon ? { ribbon: front - back } : { plain: stone }];
    prism(block(gable.half), rowsBetween(h.lobbyTop, gable.shoulder), sides(gable.half));
    for (let step = 1; step < gable.bays; step += 1) {
      const half = gable.half - step * gable.bay, lo = gable.shoulder + (step - 1) * h.pitch;
      prism(block(half), rowsBetween(lo, lo + h.pitch), sides(half, false));
    }
    const foot = gable.shoulder + (gable.bays - 1) * h.pitch;
    extrude(body, frame, [[-gable.strip, foot], [gable.strip, foot], [gable.strip, stripShoulder(gable)], [0, gable.peak], [-gable.strip, stripShoulder(gable)]], back, front, roofGlass, stone);
  }
  // The core's strips' pointed heads, 3 cm proud of the stepped walls behind them. Each
  // starts in the spandrel under its shoulder, so its underside shares no plane with a
  // step's.
  for (const frame of [0, 1]) {
    for (const [gable, local, reach] of [[g.front, frame, coreB], [g.side, frame + 2, coreA]] as const) {
      const shoulder = stripShoulder(gable);
      extrude(body, local, [[-gable.strip, shoulder - 0.3], [gable.strip, shoulder - 0.3], [gable.strip, shoulder], [0, gable.peak], [-gable.strip, shoulder]], reach - 0.5, reach + 0.03, roofGlass, roofGlass);
    }
  }

  // Every face's piers, copings and strip mullions. A face is a run along its wall with
  // its outward normal, its gable, and what covers its foot.
  const faces = [0, 1].flatMap((frame) => {
    const depth = (form.fronts[frame]! - coreB) / 2;
    return [
      { run: line(at(frame, -coreA, coreB), at(frame, coreA, coreB)), gable: g.front, cover: (x: number) => (Math.abs(x) <= g.middle.half ? wallTop(g.middle, x) : h.lobbyTop), tier: false },
      { run: line(at(frame, coreA, coreB), at(frame, coreA, -coreB)), gable: g.side, cover: () => h.lobbyTop, tier: false },
      { run: line(at(frame, -g.middle.half, coreB + depth), at(frame, g.middle.half, coreB + depth)), gable: g.middle, cover: (x: number) => (Math.abs(x) <= g.lower.half ? wallTop(g.lower, x) : h.lobbyTop), tier: true },
      { run: line(at(frame, -g.lower.half, form.fronts[frame]!), at(frame, g.lower.half, form.fronts[frame]!)), gable: g.lower, cover: () => h.lobbyTop, tier: true },
    ];
  });
  const rightAngle = -Math.PI / 2;
  const box = (target: BatchData, run: (typeof faces)[number]["run"], x0: number, x1: number, before: number | undefined, after: number | undefined, width: number, lo: number, hi: number, half: number) => {
    const bottom = Math.max(lo, form.base);
    if (hi - bottom < 0.05) return;
    mitredBox(kit, target, run, x0 + half, x1 + half, before, after, width, bottom, hi, y);
  };
  for (const { run, gable, cover, tier } of faces) {
    const half = gable.half, span = (x0: number, x1: number, f: (x: number) => number, pick: (...v: number[]) => number) => pick(f(x0 + 1e-4), f(x1 - 1e-4));
    for (const sign of [-1, 1]) {
      pierStations(gable).forEach((r, i) => {
        const [lo, hi] = i ? [r - pierWidth / 2, r + pierWidth / 2] : [half - pierWidth, half];
        const [x0, x1] = sign < 0 ? [-hi, -lo] : [lo, hi];
        // A pier over a tier stands on the coping along that tier's step: every step's edge
        // falls on a joint of the wall behind it.
        const covered = span(x0, x1, cover, Math.max), bottom = covered > h.lobbyTop + 1e-6 ? covered + 0.26 : covered;
        const top = span(x0, x1, (x) => wallTop(gable, x), Math.min) - 0.7;
        const corner = i === 0 ? rightAngle : undefined;
        box(piers, run, x0, x1, sign < 0 ? corner : undefined, sign > 0 ? corner : undefined, pierDepth, bottom, top, half);
      });
      for (let bay = 0; bay < gable.bays; bay += 1) {
        const top = gable.shoulder + bay * h.pitch, outer = half - bay * gable.bay, inner = outer - gable.bay;
        const [x0, x1] = sign < 0 ? [-outer, -inner] : [inner, outer];
        // Each coping meets the side's at a convex corner: the core's corner, and every step
        // of a tier. The core's steps above its eave end against the pyramid's risers.
        const corner = bay === 0 || tier ? rightAngle : undefined;
        box(copings, run, x0, x1, sign < 0 ? corner : undefined, sign > 0 ? corner : undefined, 0.45, top - 0.7, top + 0.25, half);
      }
    }
    // Mullions between the strip's lites, from what covers the strip to under its head.
    const lites = Math.round(2 * gable.strip / 1.85), lite = 2 * gable.strip / lites, n = run.normal(0);
    for (let k = 1; k < lites; k += 1) {
      const x = -gable.strip + k * lite, bottom = Math.max(cover(x - 0.06), cover(x + 0.06), form.base) + 0.05;
      const top = Math.min(wallTop(gable, x - 0.06), wallTop(gable, x + 0.06)) - 0.35;
      if (top - bottom > 0.5) kit.box(mullions, run.at(x + half), n, 0.06, -0.02, 0.14, y(bottom), y(top));
    }
  }
  // The tiers' sides: a corner pier meeting the front's, and a coping along each step's
  // top from the front back to the wall behind.
  for (const tier of tiers) {
    const { frame, gable, back, front } = tier;
    for (let step = 0; step < gable.bays; step += 1) {
      const half = gable.half - step * gable.bay, top = gable.shoulder + step * h.pitch;
      const east = line(at(frame, half, front), at(frame, half, back)), west = line(at(frame, -half, back), at(frame, -half, front));
      const length = front - back;
      box(copings, east, -length / 2, length / 2, rightAngle, undefined, 0.45, top - 0.7, top + 0.25, length / 2);
      box(copings, west, -length / 2, length / 2, undefined, rightAngle, 0.45, top - 0.7, top + 0.25, length / 2);
      if (step === 0) {
        const bottom = h.lobbyTop;
        box(piers, east, -length / 2, -length / 2 + pierWidth, rightAngle, undefined, pierDepth, bottom, top - 0.7, length / 2);
        box(piers, west, length / 2 - pierWidth, length / 2, undefined, rightAngle, pierDepth, bottom, top - 0.7, length / 2);
      }
    }
  }

  // Ribs on the four ridges, from each gable's point up into the spire's foot.
  const up = (p: Vec3, q: Vec3, lateral: Vec2) => {
    const d = p.map((value, k) => q[k]! - value) as Vec3, length = Math.hypot(...d), dir = d.map((value) => value / length) as Vec3;
    const side: Vec3 = [lateral[0], 0, lateral[1]];
    let n: Vec3 = [side[1] * dir[2] - side[2] * dir[1], side[2] * dir[0] - side[0] * dir[2], side[0] * dir[1] - side[1] * dir[0]];
    if (n[1] < 0) n = n.map((value) => -value) as Vec3;
    // Shallower at the apex, where a full-depth end would reach past the centre and into
    // the opposite rib.
    const section = (c: Vec3, below: number): Vec3[] => ([[-0.6, -below], [0.6, -below], [0.6, 0.8], [-0.6, 0.8]] as [number, number][])
      .map(([across, lift]) => c.map((value, k) => value + across * side[k]! + lift * n[k]!) as Vec3);
    const [bottom, top] = [section(p, 1.2), section(q, 0.5)];
    const normalOf = (points: Vec3[]): Vec3 => {
      const u = points[1]!.map((value, k) => value - points[0]![k]!), w = points[2]!.map((value, k) => value - points[0]![k]!);
      return [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
    };
    const middle = p.map((value, k) => (value + q[k]!) / 2) as Vec3;
    const outward = (points: Vec3[]): Vec3[] => {
      const n0 = normalOf(points), centre = points.reduce((sum, v) => sum.map((value, k) => value + v[k]! / points.length) as Vec3, [0, 0, 0] as Vec3);
      return [n0[0] * (centre[0] - middle[0]) + n0[1] * (centre[1] - middle[1]) + n0[2] * (centre[2] - middle[2]) < 0 ? n0.map((value) => -value) as Vec3 : n0];
    };
    kit.quad(ribs, [bottom[0]!, bottom[1]!, bottom[2]!, bottom[3]!], [dir.map((value) => -value) as Vec3]);
    kit.quad(ribs, [top[0]!, top[1]!, top[2]!, top[3]!], [dir]);
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4, quad = [bottom[i]!, bottom[j]!, top[j]!, top[i]!] as [Vec3, Vec3, Vec3, Vec3];
      kit.quad(ribs, quad, outward(quad));
    }
  };
  const ridgeEnd = 0.6;
  for (const frame of [0, 1]) {
    for (const [reach, axis] of [[coreB, 1], [coreA, 0]] as const) {
      const point = (d: number): Vec2 => (axis ? at(frame, 0, d) : at(frame, d, 0));
      const rise = h.apex - h.peak;
      const { a, s } = frames[frame]!;
      up(lift(point(reach), h.peak), lift(point(ridgeEnd), h.apex - rise * ridgeEnd / reach), axis ? a : s);
    }
  }

  // The spire: a shaft turned with the pyramid, its corners on the ridges, tapering from its
  // foot in the cap to a needle.
  const spireAt = (r: number, real: number): Vec3[] => [[0, r], [r, 0], [0, -r], [-r, 0]].map(([u, v]) => lift(at(0, u!, v!), real));
  const faceNormal = (p: Vec3, q: Vec3, r: Vec3): Vec3 => {
    const u = q.map((value, k) => value - p[k]!), w = r.map((value, k) => value - p[k]!);
    const n: Vec3 = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
    const centre = lift(form.centre, p[1] + form.base);
    return (n[0] * (p[0] - centre[0]) + n[2] * (p[2] - centre[2]) < 0 ? n.map((value) => -value) : n) as Vec3;
  };
  const footY = h.apex - 3.9, foot = spireAt(1.6, footY), shaft = spireAt(0.85, h.shaftTop), needle = spireAt(0.32, h.shaftTop), tip = lift(form.centre, h.tip);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4, n = faceNormal(foot[i]!, foot[j]!, shaft[i]!);
    kit.quad(spire, [foot[i]!, foot[j]!, shaft[j]!, shaft[i]!], [n]);
    const m = faceNormal(needle[i]!, needle[j]!, tip);
    kit.triangle(spire, [needle[i]!, needle[j]!, tip], [m, m, m]);
    // A dark inset panel down each face, in two lengths between bright folded edges.
    const unit = n.map((value) => value / Math.hypot(...n)) as Vec3;
    const radius = (real: number) => 1.6 + (0.85 - 1.6) * (real - footY) / (h.shaftTop - footY);
    for (const [lo, hi] of [[h.apex + 0.6, h.apex + 7.4], [h.apex + 7.9, h.shaftTop - 1.2]] as [number, number][]) {
      // Half the face's width, about its middle.
      const corners = ([[lo, -1], [lo, 1], [hi, 1], [hi, -1]] as [number, number][]).map(([real, side]) => {
        const ring = spireAt(radius(real), real), [p, q] = [ring[i]!, ring[j]!];
        return p.map((value, k) => (value + q[k]!) / 2 + (q[k]! - value) / 4 * side) as Vec3;
      });
      const moved = (distance: number) => corners.map((p) => p.map((value, k) => value + unit[k]! * distance) as Vec3);
      const [outer, inner] = [moved(0.03), moved(-0.02)];
      kit.quad(spirePanels, [outer[0]!, outer[1]!, outer[2]!, outer[3]!], [unit]);
      kit.quad(spirePanels, [inner[0]!, inner[1]!, inner[2]!, inner[3]!], [unit.map((value) => -value) as Vec3]);
      for (let k = 0; k < 4; k += 1) {
        const l = (k + 1) % 4, quad = [inner[k]!, inner[l]!, outer[l]!, outer[k]!] as [Vec3, Vec3, Vec3, Vec3];
        const edge = outer[l]!.map((value, c) => value - outer[k]![c]!), side: Vec3 = [edge[1]! * unit[2] - edge[2]! * unit[1], edge[2]! * unit[0] - edge[0]! * unit[2], edge[0]! * unit[1] - edge[1]! * unit[0]];
        const centre = outer.reduce((sum, v) => sum.map((value, c) => value + v[c]! / 4) as Vec3, [0, 0, 0] as Vec3), mid = outer[k]!.map((value, c) => (value + outer[l]![c]!) / 2);
        kit.quad(spirePanels, quad, [side[0] * (mid[0]! - centre[0]) + side[1] * (mid[1]! - centre[1]) + side[2] * (mid[2]! - centre[2]) < 0 ? side.map((value) => -value) as Vec3 : side]);
      }
    }
  }
  kit.quad(spire, [foot[0]!, foot[1]!, foot[2]!, foot[3]!], [[0, -1, 0]]);
  kit.quad(spire, [shaft[0]!, shaft[1]!, shaft[2]!, shaft[3]!], [[0, 1, 0]]);
  kit.quad(spire, [needle[0]!, needle[1]!, needle[2]!, needle[3]!], [[0, -1, 0]]);

  return kit.finish({ height: y(h.tip), outlines: [body, spire], opacity: 0.18 });
}
