import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Borg-Warner Building, 200 South Michigan Avenue (A. Epstein & Sons with William
// Lescaze, 1958): the geographic layout's model, on the mapped outline 124873918. The
// original layout has no model of it; the drawing shows it across Adams from Peoples Gas.
//
// A curtain wall of aluminium mullions and dark spandrels wraps the Michigan, Adams and
// south fronts between clad corner columns, under a deep fascia. On the roof, an office
// penthouse stands flush with the Michigan and south fronts, and a taller block behind it.
// The roof and the penthouse are the City's 240 and 258 ft, and the block the Skyscraper
// Center's 83.5 m: each is the published height nearest its drawn reading. The drawn
// front's top reads 76 m, so heights read on the drawing are scaled to meet the roof; see
// docs/borg-warner-reference.md. Units are meters; +x is east, +z is south.
const drawn = (height: number) => height * 73.2 / 76;
export const borgWarnerLevels = Object.freeze({
  fascia: drawn(72.9), // the fascia over the top floor's windows
  roof: 73.2, // the roof, the City's 240 ft
  penthouse: 78.6, // the office penthouse's top, the City's 258 ft
  top: 83.5, // the block behind it, the Skyscraper Center's height
});
const h = borgWarnerLevels;

// The skins' colours: the window tones, and the spandrels, mullions, corner columns, the
// penthouse's cap and the plain walls, which no window shares.
export const borgWarnerPalette = Object.freeze({ glass: [0x3a3a3a, 0x3e3e3e, 0x424242, 0x464646], lit: 0x7a7a7a, dim: 0x4a4a4a, spandrel: 0x2d2d2d, mullion: 0x5e5e5e, corner: 0x525252, cap: 0x6a6a6a, plain: 0x585858 });
const palette = borgWarnerPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const spandrel = color(palette.spandrel), mullion = color(palette.mullion), cornerColumn = color(palette.corner), cap = color(palette.cap), plain = color(palette.plain);
const core = color(0x262626), roofing = color(0x3c3c3c);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 67, 0x9e3779b1) ^ Math.imul(bay + 97, 0x85ebca77) ^ Math.imul(wall + 79, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

// The rows of the curtain wall, from 25 cm above grade, where the mapped outline ends, read
// on the drawing and scaled: a granite curb, the lobby's glass, then each floor's spandrel,
// 98 cm deep, and its window, 3.21 m apart as drawn, to the top floor's windows and the
// fascia. The drawing shows them down to 34 m; below, they are carried down at the drawn
// pitch to a lobby 5.2 m tall, an estimate.
type Kind = "curb" | "glass" | "spandrel" | "fascia";
type Row = { lo: number; hi: number; kind: Kind; floor: number };
const rows: Row[] = [{ lo: 0.25, hi: drawn(0.5), kind: "curb", floor: 1 }];
const push = (hi: number, kind: Kind, floor: number) => rows.push({ lo: rows.at(-1)!.hi, hi, kind, floor });
const spandrelTop = (k: number) => 70.6 - k * 3.21;
push(drawn(spandrelTop(20) - 0.98), "glass", 1);
for (let k = 20; k >= 0; k -= 1) {
  push(drawn(spandrelTop(k)), "spandrel", 22 - k);
  push(k > 0 ? drawn(spandrelTop(k - 1) - 0.98) : h.fascia, "glass", 22 - k);
}
push(h.roof, "fascia", 22);

// The penthouse's rows: a curb, its windows, and a light cap, as drawn over the fascia.
const penthouseRows: Row[] = [
  { lo: h.roof, hi: h.roof + 0.3, kind: "curb", floor: 23 },
  { lo: h.roof + 0.3, hi: h.penthouse - 0.6, kind: "glass", floor: 23 },
  { lo: h.penthouse - 0.6, hi: h.penthouse, kind: "fascia", floor: 23 },
];

export function createBorgWarnerGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch("Borg-Warner Building · shell", kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch("Borg-Warner Building · curtain wall", kit.material(0xffffff, { vertexColors: true }));
  const block = kit.batch("Borg-Warner Building · rooftop block", kit.material(0x565656));
  const roofTop = kit.batch("Borg-Warner Building · penthouse", kit.material(0x3c3c3c));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));

  // The lot's south-east corner, with its south wall running west along Symphony Center
  // and its Michigan front north to Adams.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const southWest = lot.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
  const west = unit(southWest), north = unit(northEast);
  const at = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
  const rect = (a0: number, a1: number, b0: number, b1: number) => orient([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]);

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.roof, b[1]], [a[0], h.roof, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.roof, true, roofing);

  // On the roof: the office penthouse, 39 m along the south front and 22 m up Michigan, as
  // the drawn penthouse meets the projected fronts. It stands 5 cm inside the south front
  // and 12 cm inside the line between Michigan's corners, which the mapped wall stands up to
  // 9.5 cm inside. Behind it, the taller block stands 14 to 27.4 m from Michigan and 1 to
  // 28.3 m from the south front, as its drawn corners project, sunk 10 cm into the roof so
  // that its floor lies clear of the penthouse's. Both footprints are estimates.
  const penthouse = rect(0.12, 39, 0.05, 22);
  kit.prism(roofTop, planOf(penthouse), [h.roof, h.penthouse]);
  kit.prism(block, planOf(rect(14, 27.4, 1, 28.3)), [h.roof - 0.1, h.top]);

  // A wall's skin over `span`, one box to a chain the `keep` test accepts, held 2 cm clear
  // of its ends or 9 cm where the outline turns in. `openings` lays a wall's columns out
  // across it and says what a cell shows, by its middle and row.
  type Cell = "glass" | "spandrel" | "mullion" | "corner" | "cap" | "plain";
  const paints: Record<Exclude<Cell, "glass">, THREE.Color> = { spandrel, mullion, corner: cornerColumn, cap, plain };
  const skin = (plan: Plan, keep: (run: Run) => boolean, span: Row[], seed: number, openings: (length: number) => [number[], (mid: number, row: Row) => Cell]) => {
    const heights = [span[0]!.lo, ...span.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, cell] = openings(chain.length);
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = span[r]!, shows = cell((columns[bay - 1]! + columns[bay]!) / 2, row);
        return shows === "glass" ? paneColor(row.floor, bay, seed * 8 + index) : paints[shows];
      }, plain);
    });
  };
  const near = (list: number[], x: number) => Math.min(...list.map((c) => Math.abs(x - c)));
  // The curtain wall: corner columns 1.2 m wide at each end, and mullions 12 cm wide about
  // 1.33 m apart between them, as drawn: 22 bays on Michigan. Below `plainUnder` the wall
  // is a neighbour's, plain.
  const curtain = (plainUnder = 0) => (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const count = Math.max(1, Math.round((length - 2.4) / 1.33)), pitch = (length - 2.4) / count;
    const mullions = Array.from({ length: count - 1 }, (_, k) => 1.2 + (k + 1) * pitch);
    const cuts = [1.2, length - 1.2, ...mullions.flatMap((m) => [m - 0.06, m + 0.06])];
    return [[0, ...cuts.sort((p, q) => p - q), length], (mid, row) => {
      if (row.hi <= plainUnder + 1e-6) return "plain";
      if (mid < 1.2 || mid > length - 1.2) return "corner";
      if (near(mullions, mid) < 0.06) return "mullion";
      return row.kind === "glass" ? "glass" : row.kind === "fascia" ? (row.floor === 23 ? "cap" : "spandrel") : "spandrel";
    }];
  };
  // The alley's windows, which the drawing does not show: 1.6 m wide, spread evenly about
  // 3.2 m apart, one to each floor above the lobby.
  const alley = (length: number): [number[], (mid: number, row: Row) => Cell] => {
    const count = Math.max(1, Math.round(length / 3.2)), centres = Array.from({ length: count }, (_, k) => length * (k + 0.5) / count);
    return [[0, ...centres.flatMap((c) => [c - 0.8, c + 0.8]), length], (mid, row) => (row.kind === "glass" && row.floor > 1 && near(centres, mid) < 0.8 ? "glass" : "plain")];
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // Michigan and Adams carry the curtain wall to the roof; the south front above Symphony
  // Center's 102 ft roof, plain below; the alley has windows.
  skin(planOf(lot), (run) => facing(1, 0)(run) || facing(0, -1)(run), rows, 0, curtain());
  skin(planOf(lot), facing(0, 1), rows, 1, curtain(31.1));
  skin(planOf(lot), facing(-1, 0), rows, 2, alley);
  // The penthouse's glass between the same mullions, under its cap.
  skin(planOf(penthouse), () => true, penthouseRows, 3, curtain());

  const model = kit.finish({ height: h.top, outlines: [shell, roofTop, block], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/borg-warner-reference.md" };
  return model;
}
