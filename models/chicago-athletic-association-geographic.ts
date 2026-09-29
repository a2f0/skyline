import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Chicago Athletic Association, 12 South Michigan Avenue (Henry Ives Cobb, 1893): the
// geographic layout's model, on the mapped outline 147476152. The original layout has no
// model of it; the drawing paints its Michigan front in Willoughby Tower's group, below and
// left of the tower, right of the Gage Building.
//
// A Venetian Gothic front of stone and brick in three bays: an arched ground floor, a row of
// small arches, a great arcade over three floors, two floors of windows, the eighth floor's
// traceried arcade, a carved frieze and a projecting cornice, and a top storey of diaper
// brick pierced by nine roundels. The levels are the Historic American Buildings Survey's
// measured drawings, HABS IL-1226, from the first floor to the parapet's 149 ft 4 in; see
// docs/chicago-athletic-association-reference.md. Units are meters; +x is east, +z is south.
const ft = (feet: number, inches = 0) => (feet + inches / 12) * 0.3048;
export const chicagoAthleticLevels = Object.freeze({
  // Each floor's level on the survey's section, the first to the eleventh.
  floors: [0, ft(17, 5.5), ft(33), ft(46, 6.5), ft(62), ft(73, 1.5), ft(83, 5), ft(94, 1), ft(114, 6), ft(127, 3), ft(136, 5)],
  arcade: [ft(93, 1), ft(112, 11)] as [number, number], // the eighth floor's traceried lights, read on the elevation
  cornice: [ft(120, 9.5), ft(126, 11)] as [number, number], // the cornice's profile, read on the section
  roundels: ft(144), // the roundels' centres, read on the elevation
  parapet: 45.52, // the top of the parapet, measured at 149 ft 4 in
});
const h = chicagoAthleticLevels;
const floor = (n: number) => h.floors[n - 1]!;

// The skins' colours: the window tones, and the stone, the carved frieze and the brick, which
// no window shares.
export const chicagoAthleticPalette = Object.freeze({ glass: [0x262626, 0x2a2a2a, 0x2e2e2e, 0x323232], lit: 0x6e6e6e, dim: 0x3a3a3a, stone: 0x6d6d6d, frieze: 0x7a7a7a, brick: 0x5a5a5a });
const palette = chicagoAthleticPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const stone = color(palette.stone), frieze = color(palette.frieze), brick = color(palette.brick);
const core = color(0x262626), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 31, 0x9e3779b1) ^ Math.imul(bay + 79, 0x85ebca77) ^ Math.imul(wall + 61, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The front's rows, from 25 cm above grade, where the mapped outline ends, to the parapet.
// What each shows: the storeys the hill hides take the survey's description, their windows
// estimated; above the eighth floor they follow the measured elevation.
type Kind = "stone" | "ground" | "arches" | "great" | "band" | "window" | "arcade" | "frieze" | "brick" | "attic" | "roundel";
type Row = { lo: number; hi: number; kind: Kind; floor: number };
export const chicagoAthleticRows: Row[] = [
  { lo: 0.25, hi: 0.9, kind: "stone", floor: 1 },
  { lo: 0.9, hi: 4.3, kind: "ground", floor: 1 },
  { lo: 4.3, hi: floor(2) + 1.2, kind: "stone", floor: 2 },
  { lo: floor(2) + 1.2, hi: floor(3) - 1, kind: "arches", floor: 2 },
  { lo: floor(3) - 1, hi: floor(3) + 1, kind: "stone", floor: 3 },
  { lo: floor(3) + 1, hi: floor(6) - 0.8, kind: "great", floor: 3 },
  { lo: floor(6) - 0.8, hi: floor(6) + 0.9, kind: "band", floor: 6 },
  { lo: floor(6) + 0.9, hi: floor(7) - 0.4, kind: "window", floor: 6 },
  { lo: floor(7) - 0.4, hi: floor(7) + 0.8, kind: "stone", floor: 7 },
  { lo: floor(7) + 0.8, hi: h.arcade[0] - 0.3, kind: "window", floor: 7 },
  { lo: h.arcade[0] - 0.3, hi: h.arcade[0], kind: "stone", floor: 8 },
  { lo: h.arcade[0], hi: h.arcade[1], kind: "arcade", floor: 8 },
  { lo: h.arcade[1], hi: h.cornice[0], kind: "frieze", floor: 9 },
  { lo: h.cornice[0], hi: h.cornice[1], kind: "stone", floor: 9 },
  { lo: h.cornice[1], hi: floor(10) + 0.3, kind: "brick", floor: 10 },
  { lo: floor(10) + 0.3, hi: floor(10) + 2.2, kind: "attic", floor: 10 },
  { lo: floor(10) + 2.2, hi: h.roundels - 0.45, kind: "brick", floor: 11 },
  { lo: h.roundels - 0.45, hi: h.roundels + 0.45, kind: "roundel", floor: 11 },
  { lo: h.roundels + 0.45, hi: h.parapet, kind: "brick", floor: 11 },
];
const rows = chicagoAthleticRows;

// Along the front, as fractions of it from the south corner, read on the measured elevation:
// the three bays' openings between the stone quoins, in two, eight and two lights; the nine
// roundels, 90 cm across; and the top storey's one window, at its north end.
export const chicagoAthleticFront = Object.freeze({
  bays: [[0.053, 0.195, 2], [0.254, 0.74, 8], [0.799, 0.941, 2]] as [number, number, number][],
  roundels: Array.from({ length: 9 }, (_, k) => 0.0773 + k * 0.1065),
  attic: [0.84, 0.947] as [number, number],
});
const front = chicagoAthleticFront;

export function createChicagoAthleticAssociationGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Chicago Athletic Association · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Chicago Athletic Association · stone, brick and windows", kit.material(0xffffff, { vertexColors: true }));
  const cornice = kit.batch("Chicago Athletic Association · cornice", kit.material(0x7a7a7a));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, on Michigan against the Gage Building, with the front running
  // north to Willoughby Tower.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const length = Math.hypot(northEast[0] - corner[0], northEast[1] - corner[1]);
  const north: Vec2 = [(northEast[0] - corner[0]) / length, (northEast[1] - corner[1]) / length], west: Vec2 = [north[1], -north[0]];
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.parapet, b[1]], [a[0], h.parapet, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.parapet, true, roofing);
  // The cornice projects 88 cm along the front, as the elevation shows it, from 12 cm inside
  // it, stopping 3 cm short of the neighbours' walls.
  kit.prism(cornice, planOf(orient([at(-0.88, 0.03), at(-0.88, length - 0.03), at(0.12, length - 0.03), at(0.12, 0.03)])), [h.cornice[0], h.cornice[1]]);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in, over `span`; `cells` lays a wall's columns out across
  // it, from its start, and paints a cell by its middle and row.
  const skin = (seed: number, keep: (run: Run) => boolean, span: Row[], cells: (length: number, start: Vec2) => [number[], (middle: number, row: Row, bay: number) => THREE.Color]) => {
    const plan = planOf(lot), heights = [span[0]!.lo, ...span.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, paint] = cells(chain.length, plan[first]!.at(0));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = span[r]!, color = paint((columns[bay - 1]! + columns[bay]!) / 2, row, bay);
        return color === glassTones[0] ? paneColor(row.floor, bay, seed * 8 + index) : color;
      }, seed === 0 ? stone : brick);
    });
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // The front: each bay's lights between 15 cm colonnettes, which the bands and the frieze
  // cross; the top storey's roundels and window in its brick.
  const michigan = (chain: number, start: Vec2): [number[], (middle: number, row: Row) => THREE.Color] => {
    const fromSouth = Math.hypot(start[0] - corner[0], start[1] - corner[1]) < chain / 2;
    const s = (fraction: number) => (fromSouth ? fraction * chain : chain - fraction * chain);
    const lights = front.bays.flatMap(([a, b, count]) => Array.from({ length: count }, (_, k) => {
      const width = (b - a) * chain, step = width / count;
      return [s(a) + (fromSouth ? 1 : -1) * (k * step + (k > 0 ? 0.075 : 0)), s(a) + (fromSouth ? 1 : -1) * ((k + 1) * step - (k < count - 1 ? 0.075 : 0))].sort((p, q) => p - q) as [number, number];
    }));
    const roundels = front.roundels.map((c) => [s(c) - 0.45, s(c) + 0.45] as [number, number]);
    const attic = front.attic.map(s).sort((p, q) => p - q) as [number, number];
    const cuts = [...lights.flat(), ...roundels.flat(), ...attic].filter((x) => x > 0.1 && x < chain - 0.1);
    const inside = (spans: [number, number][], x: number) => spans.some(([a, b]) => x > a && x < b);
    return [[0, ...[...new Set(cuts)].sort((p, q) => p - q), chain], (middle, row) => {
      if (row.kind === "frieze") return frieze;
      if (row.kind === "band" || row.kind === "stone") return stone;
      if (row.kind === "brick") return brick;
      if (row.kind === "roundel") return inside(roundels, middle) ? glassTones[0]! : brick;
      if (row.kind === "attic") return inside([attic], middle) ? glassTones[0]! : brick;
      return inside(lights, middle) ? glassTones[0]! : stone;
    }];
  };
  // The other walls' rows: a window 1.8 m tall on each floor from the second, its sill
  // 90 cm up, to the parapet.
  const sides: Row[] = [{ lo: 0.25, hi: floor(2) + 0.9, kind: "brick", floor: 1 }];
  for (let n = 2; n <= 11; n += 1) {
    sides.push({ lo: floor(n) + 0.9, hi: floor(n) + 2.7, kind: "window", floor: n });
    sides.push({ lo: floor(n) + 2.7, hi: n < 11 ? floor(n + 1) + 0.9 : h.parapet, kind: "brick", floor: n });
  }
  // The alley and the light court's walls: windows 1.6 m wide, spread evenly about 3.2 m
  // apart.
  const court = (chain: number): [number[], (middle: number, row: Row) => THREE.Color] => {
    const count = Math.max(1, Math.round(chain / 3.2)), centres = Array.from({ length: count }, (_, i) => chain * (i + 0.5) / count);
    return [[0, ...centres.flatMap((c) => [c - 0.8, c + 0.8]), chain], (middle, row) => (row.kind === "window" && centres.some((c) => Math.abs(middle - c) < 0.8) ? glassTones[0]! : brick)];
  };
  // A run's middle, in metres west of the front and north of the south corner.
  const place = (run: Run): Vec2 => {
    const mid = run.at(run.length / 2), [x, z] = [mid[0] - corner[0], mid[1] - corner[1]];
    return [x * west[0] + z * west[1], x * north[0] + z * north[1]];
  };
  // The Michigan front, as against the light court's east wall, 39 m back.
  const isMichigan = (run: Run) => facing(1, 0)(run) && place(run)[0] < 1;
  // The party walls keep the bare shell: the Gage to the south, Willoughby Tower and the
  // annex on Madison to the north, all taller, cover them. The light court's north wall,
  // 6.8 m in from the party line, is not one.
  const party = (run: Run) => (facing(0, 1)(run) ? place(run)[1] < 1 : facing(0, -1)(run) && place(run)[1] > length - 3);
  skin(0, isMichigan, rows, michigan);
  skin(1, (run) => !isMichigan(run) && !party(run), sides, court);

  const model = kit.finish({ height: h.parapet, outlines: [shell, cornice], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/chicago-athletic-association-reference.md" };
  return model;
}
