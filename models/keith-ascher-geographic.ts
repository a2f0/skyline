import * as THREE from "../vendor/three-r186.js";
import { createBuilder, polygonOf } from "./building-kit.js";
import type { BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import { chainSkin, chainsOf, orient, paintedSlab, planOf, turnsAt } from "./facade-grid.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// The Gage Group's two lower buildings: the Edson Keith Building, 24 South Michigan Avenue,
// and the Theodore Ascher Building, 30 South Michigan Avenue (Holabird & Roche, 1899; the
// Ascher's seventh storey 1972). The geographic layout's models, on the mapped outlines
// 126982636 and 126982639. The original layout has no models of them; the drawing shows the
// tops of their Michigan fronts under the Gage Building's south wall, between the University
// Club and the Gage.
//
// Red brick fronts of seven storeys, the Keith's three bays wide and the Ascher's two, each
// bay a Chicago window, a wide fixed pane between narrow sashes, over shopfronts and a sign
// band, under plain parapets where the cornices were. The Keith's parapet is the HABS
// record's 101 ft and the Ascher's the City's 100 ft; each drawn front is scaled to meet its
// height. See docs/keith-ascher-reference.md. Units are meters; +x is east, +z is south.
export interface GageGroupSpec {
  name: string;
  top: number; // the parapet, published
  drawnTop: number; // the drawn parapet, read through the geographic camera
  drawnWindow: [number, number]; // the seventh floor's window, the one row drawn, as read
  bays: [number, number][]; // each bay's window along the front, from its south corner
  seed: number;
}
export const keithSpec: GageGroupSpec = { name: "Edson Keith Building", top: 30.78, drawnTop: 35.69, drawnWindow: [30.15, 33.17], bays: [[1.67, 5.36], [7.24, 12.09], [13.44, 17.34]], seed: 11 };
export const ascherSpec: GageGroupSpec = { name: "Theodore Ascher Building", top: 30.48, drawnTop: 35.48, drawnWindow: [29.97, 32.97], bays: [[1.85, 5.7], [7.9, 11.75]], seed: 17 };

// Each building's levels: the ground floor's shopfronts under a sign band, and six floors
// from the second up to the seventh, whose drawn window, scaled, sets their pitch; its sill
// stands 80 cm over its floor.
export function gageGroupLevels(spec: GageGroupSpec) {
  const drawn = (height: number) => height * spec.top / spec.drawnTop;
  const [sill, head] = spec.drawnWindow.map(drawn) as [number, number];
  const second = 5.5, seventh = sill - 0.8;
  return Object.freeze({ shopfront: 4.3, second, pitch: (seventh - second) / 5, sill: 0.8, window: head - sill, top: spec.top });
}

// The skins' colours: the window tones, and the brick and the band, which no window shares.
export const gageGroupPalette = Object.freeze({ glass: [0x262626, 0x2a2a2a, 0x2e2e2e, 0x323232], lit: 0x6e6e6e, dim: 0x3a3a3a, brick: 0x464646, band: 0x525252 });
const palette = gageGroupPalette;
const color = (hex: number) => new THREE.Color(hex);
const glassTones = palette.glass.map(color);
const litGlass = color(palette.lit), dimGlass = color(palette.dim);
const brick = color(palette.brick), band = color(palette.band);
const core = color(0x262626), roofing = color(0x3a3a3a);
function paneColor(row: number, bay: number, wall: number): THREE.Color {
  const hash = (Math.imul(row + 29, 0x9e3779b1) ^ Math.imul(bay + 71, 0x85ebca77) ^ Math.imul(wall + 59, 0xc2b2ae3d)) >>> 0;
  const value = hash % 101;
  if (value < 4) return litGlass;
  if (value < 8) return dimGlass;
  return glassTones[value % glassTones.length]!;
}

function createGageGroupBuilding(spec: GageGroupSpec, record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const h = gageGroupLevels(spec);
  const floor = (n: number) => (n < 2 ? 0 : h.second + (n - 2) * h.pitch);
  // The rows of every wall, from 25 cm above grade, where the mapped outline ends, to the
  // parapet over the seventh floor.
  type Row = { lo: number; hi: number; kind: "wall" | "glass" | "band"; floor: number };
  const rows: Row[] = [
    { lo: 0.25, hi: 0.9, kind: "wall", floor: 1 },
    { lo: 0.9, hi: h.shopfront, kind: "glass", floor: 1 },
    { lo: h.shopfront, hi: h.second, kind: "band", floor: 1 },
  ];
  for (let n = 2; n <= 7; n += 1) {
    rows.push({ lo: rows.at(-1)!.hi, hi: floor(n) + h.sill, kind: "wall", floor: n });
    rows.push({ lo: floor(n) + h.sill, hi: floor(n) + h.sill + h.window, kind: "glass", floor: n });
  }
  rows.push({ lo: rows.at(-1)!.hi, hi: h.top, kind: "wall", floor: 8 });

  const kit = createBuilder(record.name, record.id);
  const shell = kit.batch(`${spec.name} · shell`, kit.material(0xffffff, { vertexColors: true }));
  const wall = kit.batch(`${spec.name} · brick and windows`, kit.material(0xffffff, { vertexColors: true }));
  const lot = orient(polygonOf(projectPlan(record.footprint.coordinates)));
  // The lot's south-east corner, where its Michigan front starts north.
  const corner = lot.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
  const northEast = lot.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
  const north: Vec2 = [northEast[0] - corner[0], northEast[1] - corner[1]];

  planOf(lot).forEach((run) => {
    const a = run.at(0), b = run.at(run.length), n = run.normal(0);
    kit.quad(shell, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h.top, b[1]], [a[0], h.top, a[1]]], [[n[0], 0, n[1]]], core);
  });
  paintedSlab(kit, shell, lot, 0, false, roofing);
  paintedSlab(kit, shell, lot, h.top, true, roofing);

  // A wall's skin, one box to a chain the `keep` test accepts, held 2 cm clear of its ends
  // or 9 cm where the outline turns in. `openings` lays a wall's columns out across it, from
  // its start, and says from a cell's middle whether it holds a window.
  const skin = (seed: number, keep: (run: Run) => boolean, openings: (length: number, start: Vec2) => [number[], (middle: number) => boolean]) => {
    const plan = planOf(lot), heights = [rows[0]!.lo, ...rows.map((row) => row.hi)];
    chainsOf(plan).forEach((chain, index) => {
      if (!chain.runs.every((run) => keep(plan[run]!))) return;
      const first = chain.runs[0]!, last = chain.runs.at(-1)!;
      const s0 = turnsAt(plan, first)[0] > 0 ? 0.09 : 0.02, s1 = chain.length - (turnsAt(plan, last)[1] > 0 ? 0.09 : 0.02);
      const [columns, glazed] = openings(chain.length, plan[first]!.at(0));
      chainSkin(kit, wall, plan, chain, 0, chain.runs.length - 1, s0, s1, columns, heights, 0.02, 0.07, (bay, r) => {
        const row = rows[r]!;
        if (row.kind === "band") return band;
        return row.kind === "glass" && glazed((columns[bay - 1]! + columns[bay]!) / 2) ? paneColor(row.floor, bay, seed * 8 + index) : brick;
      }, brick);
    });
  };
  const facing = (x: number, z: number) => (run: Run) => run.normal(0)[0] * x + run.normal(0)[1] * z > 0.9;
  // The Michigan front, as drawn from its south corner: each bay's Chicago window, a sash
  // 80 cm wide either side of its fixed pane, behind 12 cm mullions. The front's chain runs
  // from whichever corner the outline's winding gives it.
  const michigan = (length: number, start: Vec2): [number[], (middle: number) => boolean] => {
    const fromSouth = Math.hypot(start[0] - corner[0], start[1] - corner[1]) < Math.hypot(north[0], north[1]) / 2;
    const at = (s: number) => (fromSouth ? s : length - s);
    const spans = spec.bays.map(([a, b]) => [at(a), at(b)].sort((p, q) => p - q) as [number, number]);
    const mullions = spans.flatMap(([a, b]) => [a + 0.8, b - 0.8]);
    const cuts = [...spans.flat(), ...mullions.flatMap((m) => [m - 0.06, m + 0.06])].filter((s) => s > 0.1 && s < length - 0.1);
    return [[0, ...[...new Set(cuts)].sort((p, q) => p - q), length], (middle) => spans.some(([a, b]) => middle > a && middle < b) && !mullions.some((m) => Math.abs(middle - m) < 0.06)];
  };
  // The alley: windows 1.6 m wide spread evenly about 3.2 m apart on every floor above the
  // ground floor. The party walls, shared with their neighbours, stay plain.
  const alley = (length: number): [number[], (middle: number) => boolean] => {
    const count = Math.max(1, Math.round(length / 3.2)), centres = Array.from({ length: count }, (_, i) => length * (i + 0.5) / count);
    return [[0, ...centres.flatMap((c) => [c - 0.8, c + 0.8]), length], (middle) => centres.some((c) => Math.abs(middle - c) < 0.8)];
  };
  skin(0, facing(1, 0), michigan);
  skin(1, facing(-1, 0), alley);
  skin(2, (run) => facing(0, 1)(run) || facing(0, -1)(run), (length) => [[0, length], () => false]);

  const model = kit.finish({ height: h.top, outlines: [shell], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/keith-ascher-reference.md" };
  return model;
}

export const createKeithGeographicBuilding = (record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]) => createGageGroupBuilding(keithSpec, record, projectPlan, offset);
export const createAscherGeographicBuilding = (record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]) => createGageGroupBuilding(ascherSpec, record, projectPlan, offset);
