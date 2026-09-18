import { createBuilder, polygonOf, rectangle, station } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2 } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// One Prudential Plaza: the geographic layout's detailed model. The mapped
// tower outline covers the whole lot to its 183.2 m top; the nested 10- and
// 3-floor podium parts sit inside it and add no exterior geometry. The
// punch-card facade — recessed panes between projecting limestone piers —
// carries the fitted model's vocabulary at meter scale, with a penthouse and
// louvered screen under the mapped mast part, which rises from 183.2 m to the
// published 278 m tip. Row and bay spacings are estimates; see
// docs/one-prudential-geographic-reference.md. Units are meters; +x is east,
// +z is south.
export const onePrudentialGeographicLevels = Object.freeze({
  roof: 181.2, // below the mapped top; the penthouse reaches it
  penthouseTop: 183.2, // OSM tower part top
  tip: 278, // published antenna tip
  floors: 41,
});
const h = onePrudentialGeographicLevels;
const pitch = h.roof / h.floors;

export function createOnePrudentialGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The fitted model's palette: limestone shell, dark panes with scattered
  // lit units, precast piers and bands, and a metal mast.
  const shell = kit.batch("One Prudential · limestone shell", kit.material(0x4a4a4a));
  const piers = kit.batch("One Prudential · piers, bands, and louvers", kit.material(0x8a8a8a));
  const mast = kit.batch("One Prudential · antenna mast", kit.material(0xb4b4b4));
  const lit = kit.batch("One Prudential · lit glazing", kit.material(0x6e6e6e));
  const dim = kit.batch("One Prudential · dim glazing", kit.material(0x505050));
  const tones = [0x2a2a2a, 0x2f2f2f, 0x343434, 0x262626].map((color, i) => kit.batch(`One Prudential · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 3, 0x9e3779b1) ^ Math.imul(bay + 19, 0x85ebca77) ^ Math.imul(side + 11, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const mastPart = record.parts.find((p) => p.way === 685493614)!;
  const mastPlan = projectPlan(mastPart.coordinates);
  const mastPolygon = polygonOf(mastPlan);
  const mastCenter: Vec2 = mastPolygon.reduce<Vec2>((sum, p) => [sum[0] + p[0] / mastPolygon.length, sum[1] + p[1] / mastPolygon.length], [0, 0]);

  // The mapped volumes: the tower over the whole outline, the penthouse under
  // the mapped mast, and the mast itself rising to the published tip. The
  // penthouse's bottom and the louvers' backs are drawn rather than omitted:
  // the geographic suite pairs every directed edge, and each drawn face meets
  // the covering surface with an opposite normal.
  kit.prism(shell, ground, [0, h.roof]);
  const penthouse = rectangle(mastCenter[0] - 7.5, mastCenter[0] + 7.5, mastCenter[1] - 5, mastCenter[1] + 5);
  kit.prism(piers, penthouse, [h.roof, h.penthouseTop]);
  kit.prism(mast, mastPlan, [h.penthouseTop, h.tip]);

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

  // The punch-card facade: piers stand between the bays, panes sit between
  // the piers, and a spandrel band runs at each floor line. Piers stand
  // proudest, so nothing crosses their fronts.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.83));
    const width = run.length / bays;
    for (let row = 1; row <= h.floors; row += 1) {
      const bottom = Math.max((row - 1) * pitch, 0.9);
      const top = row * pitch;
      for (let bay = 0; bay < bays; bay += 1) {
        strip(paneTone(row, bay, side), run, bay * width + 0.7, (bay + 1) * width - 0.7, bottom + 0.3, top - 0.25, 0.005, 0.025);
      }
      if (row < h.floors) strip(piers, run, 0.015, run.length - 0.015, top - 0.15, top + 0.05, 0.02, 0.12);
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.6, Math.min(run.length - 0.6, i * width));
      strip(piers, run, s - 0.6, s + 0.6, 0.35, h.roof - 0.6, 0, 0.34);
    }
    strip(piers, run, 0.015, run.length - 0.015, 0.3, 0.75, 0.06, 0.18);
  });

  // The roof parapet wraps the mapped outline below the penthouse top. The
  // outline's steps have concave corners, so the parapet is per-segment boxes
  // that stop short of every corner.
  ground.forEach((run) => {
    if (run.length < 2) return;
    const count = Math.max(1, Math.ceil(run.length / 1.5));
    for (let index = 0; index < count; index += 1) {
      const from = index * run.length / count, to = (index + 1) * run.length / count;
      strip(piers, run, from, to, h.roof - 0.5, h.roof, 0.05, 0.35);
    }
  });

  // Louvers on the penthouse's south face; their backs sit on that wall.
  const penthouseSouth = penthouse[0]!;
  for (let i = 1; i < 14; i += 1) {
    const where = station(penthouseSouth, penthouseSouth.length * i / 15);
    kit.box(piers, where.at, where.normal, 0.42, 0, 0.18, h.roof + 0.4, h.penthouseTop - 0.4);
  }

  const model = kit.finish({ height: h.tip, outlines: [shell, piers, mast], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 41, source: "docs/one-prudential-geographic-reference.md" };
  return model;
}
