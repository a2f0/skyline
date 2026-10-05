import { createBuilder } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Michigan Plaza South at 205 North Michigan Avenue: the geographic layout's
// detailed model. The mapped ground outline stays exact; the 168.6 m top is
// the published architectural height. The dark curtain-wall grid, recessed
// panes with scattered lit units, and pale mullions reuse the fitted model's
// vocabulary at meter scale. Window-row and bay spacings are estimates; see
// docs/michigan-plaza-south-geographic-reference.md. Units are meters; +x is
// east, +z is south.
export const michiganPlazaSouthGeographicLevels = Object.freeze({
  roof: 168.6, // published architectural height
  floors: 44,
});
const h = michiganPlazaSouthGeographicLevels;
const shaftTop = h.roof - 0.8;
const pitch = shaftTop / h.floors;

export function createMichiganPlazaSouthGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The neutral palette of the fitted model: a mid-gray frame grid over dark
  // glazing with scattered lit panes.
  const shell = kit.batch("Michigan Plaza South · mapped tower shell", kit.material(0x555555));
  const mullions = kit.batch("Michigan Plaza South · mullions and bands", kit.material(0x7a7a7a));
  const lit = kit.batch("Michigan Plaza South · lit glazing", kit.material(0x5a5a5a));
  const dim = kit.batch("Michigan Plaza South · dim glazing", kit.material(0x464646));
  const tones = [0x2a2a2a, 0x2e2e2e, 0x333333, 0x262626].map((color, i) => kit.batch(`Michigan Plaza South · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 5, 0x9e3779b1) ^ Math.imul(bay + 17, 0x85ebca77) ^ Math.imul(side + 3, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);

  // The mapped volume: the outline itself is the tower, with a roof parapet.
  kit.prism(shell, ground, [0, shaftTop]);

  // A closed shallow solid on a run. Offsets separate the visible surfaces from
  // their backing wall, and the ends stop short of polygon corners so adjacent
  // walls' projecting returns cannot overlap at the same elevation.
  const strip = (batch: BatchData, run: Run, from: number, to: number, y0: number, y1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    if (to - from < 0.03 || y1 <= y0) return;
    kit.box(batch, run.at((from + to) / 2), run.normal(0), (to - from) / 2, back, front, y0, y1);
  };

  // The dense Miesian grid: one pane per bay per row between full-height
  // mullions, with a pale base course at grade. Mullions stand proudest.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.1));
    const width = run.length / bays;
    for (let row = 1; row <= h.floors; row += 1) {
      const bottom = Math.max((row - 1) * pitch, 0.85), top = row * pitch;
      for (let bay = 0; bay < bays; bay += 1) {
        strip(paneTone(row, bay, side), run, bay * width + 0.18, (bay + 1) * width - 0.18, bottom + 0.28, top - 0.24, 0.03, 0.07);
      }
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
      strip(mullions, run, s - 0.06, s + 0.06, 0.25, shaftTop - 0.05, 0.05, 0.16);
    }
    strip(mullions, run, 0.015, run.length - 0.015, 0.3, 0.75, 0.06, 0.18);
  });

  // The roof parapet wraps the mapped outline at the published 168.6 m top.
  // The outline's notch has concave corners, which a closed band cannot turn,
  // so the parapet is per-segment boxes that stop short of every corner.
  ground.forEach((run) => {
    if (run.length < 2) return;
    const count = Math.max(1, Math.ceil(run.length / 1.5));
    for (let index = 0; index < count; index += 1) {
      const from = index * run.length / count, to = (index + 1) * run.length / count;
      strip(mullions, run, from, to, shaftTop, h.roof, 0.05, 0.35);
    }
  });

  const model = kit.finish({ height: h.roof, outlines: [shell, mullions], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 44, source: "docs/michigan-plaza-south-geographic-reference.md" };
  return model;
}
