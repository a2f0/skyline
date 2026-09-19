import { createBuilder, polygonOf, station } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Aon Center: the geographic layout's detailed model. The mapped outline
// keeps its 340 m shaft top, the rooftop enclosure part its 346.3 m top, and
// the inferred antenna reaches the published 362.5 m tip. The fitted model's
// vocabulary carries over at meter scale: a white granite outer tube with
// dark vertical window slots between piers, wide corner piers, a roof
// parapet, and louvered service enclosures. Pier and row spacings are
// estimates; see docs/aon-geographic-reference.md. Units are meters; +x is
// east, +z is south.
export const aonGeographicLevels = Object.freeze({
  shaftTop: 340, // OSM shaft part top
  enclosureTop: 346.3, // OSM part 284775635
  tip: 362.5, // published tip
  floors: 83,
});
const h = aonGeographicLevels;
const pitch = h.shaftTop / h.floors;

export function createAonGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The fitted model's palette: a white granite tube, dark panes with
  // scattered lit units, pale piers and corner stones, and metal screens.
  const shell = kit.batch("Aon · granite shell", kit.material(0x909090));
  const piers = kit.batch("Aon · piers and bands", kit.material(0x9d9d9d));
  const corners = kit.batch("Aon · corner piers", kit.material(0xa8a8a8));
  const enclosure = kit.batch("Aon · rooftop enclosure", kit.material(0x777777));
  const louvers = kit.batch("Aon · enclosure louvers", kit.material(0x8a8a8a));
  const mast = kit.batch("Aon · antenna mast", kit.material(0x6a6a6a));
  const lit = kit.batch("Aon · lit glazing", kit.material(0x7a7a7a));
  const dim = kit.batch("Aon · dim glazing", kit.material(0x505050));
  const tones = [0x2a2a2a, 0x2f2f2f, 0x343434, 0x262626].map((color, i) => kit.batch(`Aon · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 13, 0x9e3779b1) ^ Math.imul(bay + 47, 0x85ebca77) ^ Math.imul(side + 23, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const enclosurePart = record.parts.find((p) => p.way === 284775635)!;
  const enclosurePlan = projectPlan(enclosurePart.coordinates);
  const enclosurePolygon = polygonOf(enclosurePlan);
  const enclosureCenter: Vec2 = enclosurePolygon.reduce<Vec2>((sum, p) => [sum[0] + p[0] / enclosurePolygon.length, sum[1] + p[1] / enclosurePolygon.length], [0, 0]);

  // The mapped volumes: the shaft over the whole outline, the rooftop
  // enclosure, and the inferred antenna reaching the published tip.
  kit.prism(shell, ground, [0, h.shaftTop]);
  kit.prism(enclosure, enclosurePlan, [h.shaftTop, h.enclosureTop]);
  kit.box(mast, [enclosureCenter[0], enclosureCenter[1]], [0, 1], 0.35, -0.35, 0.35, h.enclosureTop, h.tip);

  // A closed shallow solid on a run. Offsets separate the visible surfaces
  // from their backing wall, and the ends stop short of polygon corners so
  // adjacent walls' projecting returns cannot overlap at the same elevation.
  const strip = (batch: BatchData, run: Run, from: number, to: number, y0: number, y1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    if (to - from < 0.03 || y1 <= y0) return;
    kit.box(batch, run.at((from + to) / 2), run.normal(0), (to - from) / 2, back, front, y0, y1);
  };

  // The granite outer tube: dark window slots between piers, a spandrel band
  // at each floor line below the roof, wide corner piers, and a base course.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.4));
    const width = run.length / bays;
    for (let row = 1; row <= h.floors; row += 1) {
      const bottom = Math.max((row - 1) * pitch, 0.9), top = row * pitch;
      for (let bay = 0; bay < bays; bay += 1) {
        strip(paneTone(row, bay, side), run, bay * width + 0.6, (bay + 1) * width - 0.6, bottom + 0.3, top - 0.25, 0.005, 0.025);
      }
      if (row < h.floors) strip(piers, run, 0.015, run.length - 0.015, top - 0.15, top + 0.05, 0.03, 0.12);
    }
    for (let i = 0; i <= bays; i += 1) {
      // Stop 1 m short of the corner so the end piers are not buried inside
      // the wide corner boxes.
      const s = Math.max(0.45, Math.min(run.length - 1.0, i * width));
      strip(piers, run, s - 0.45, s + 0.45, 0.35, h.shaftTop - 0.25, 0.05, 0.48);
    }
    strip(piers, run, 0.015, run.length - 0.015, 0.3, 0.75, 0.06, 0.18);
    const corner = station(run, run.length - 1.0);
    kit.box(corners, corner.at, corner.normal, 1.0, -0.12, 0.55, 0.37, h.shaftTop - 0.23);
  });

  // The roof parapet wraps the mapped outline; its notched corners can turn
  // concave, so the parapet is per-segment boxes stopping short of corners.
  ground.forEach((run) => {
    if (run.length < 2) return;
    const count = Math.max(1, Math.ceil(run.length / 1.5));
    for (let index = 0; index < count; index += 1) {
      const from = index * run.length / count, to = (index + 1) * run.length / count;
      strip(piers, run, from, to, h.shaftTop - 0.5, h.shaftTop, 0.07, 0.45);
    }
  });

  // Louvers on the rooftop enclosure's exterior faces, above the parapet.
  enclosurePlan.forEach((run) => {
    const count = Math.max(1, Math.round(run.length / 1.3));
    for (let i = 0; i < count; i += 1) {
      const s = (i + 0.5) * run.length / count;
      strip(louvers, run, s - 0.08, s + 0.08, h.shaftTop + 0.25, h.enclosureTop - 0.25, 0.03, 0.18);
    }
  });

  const model = kit.finish({ height: h.tip, outlines: [shell, enclosure, mast], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 83, source: "docs/aon-geographic-reference.md" };
  return model;
}
