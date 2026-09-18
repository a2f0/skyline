import { createBuilder, inside, line, polygonOf } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Kemper Building at 1 East Wacker Drive: the geographic layout's detailed
// model. The mapped ground outline and tower part keep their OpenStreetMap
// outlines; the 159 m top is OSM's height tag (522 ft in the 1962 record).
// The marble shell, window bays, raised mullions, dark crown band with light
// fins, and projecting cap reuse the fitted model's vocabulary at meter scale.
// Window-row, bay, and crown spacings are estimates; see
// docs/kemper-geographic-reference.md. Units are meters; +x is east, +z south.
export const kemperGeographicLevels = Object.freeze({
  podium: 7.8, // OSM way 685494067: two floors at the tower's average floor height
  roof: 159, // OSM height tag on way 64389514
  floors: 41,
});
const h = kemperGeographicLevels;
// Floors 1-2 are the podium; the tower pitch follows the published 41 floors.
const pitch = (h.roof - h.podium) / (h.floors - 2);
const floorHeight = (floor: number) => h.podium + (floor - 3) * pitch;
// The crown band spans the 40th and 41st floors up to the roof: dark glazing
// behind light fins, capped by a projecting parapet.
const crownBase = floorHeight(40);
const shaftTop = h.roof - 0.5;

export function createKemperGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The neutral gray palette of the fitted model: marble shell, dark glazing
  // with scattered lit units, pale mullions and fins.
  const marble = kit.batch("Kemper · marble shell", kit.material(0x929292));
  const mullions = kit.batch("Kemper · mullions and bands", kit.material(0x9b9b9b));
  const crownGlass = kit.batch("Kemper · crown glazing", kit.material(0x1c1c1c));
  const crownFins = kit.batch("Kemper · crown fins", kit.material(0xa3a3a3));
  const cap = kit.batch("Kemper · roof cap", kit.material(0xa8a8a8));
  const lit = kit.batch("Kemper · lit glazing", kit.material(0x6a6a6a));
  const dim = kit.batch("Kemper · dim glazing", kit.material(0x505050));
  const tones = [0x2e2e2e, 0x323232, 0x363636, 0x2a2a2a].map((color, i) => kit.batch(`Kemper · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 11, 0x9e3779b1) ^ Math.imul(bay + 31, 0x85ebca77) ^ Math.imul(side + 7, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const tower = projectPlan(record.parts.find((p) => p.way === 685494066)!.coordinates);
  const towerPolygon = polygonOf(tower);

  // The mapped volumes: the full ground outline supports the tower, and the
  // tower part rises from the podium, so no coincident exterior walls overlap.
  kit.prism(marble, ground, [0, h.podium]);
  kit.prism(marble, tower, [h.podium, shaftTop]);

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

  // Tower facade: one pane per bay per row between full-height mullions, with
  // a spandrel at each floor line. Mullions stand proudest of the tower detail.
  tower.forEach((run, side) => {
    const bays = Math.max(1, Math.round(run.length / 3.1));
    const width = run.length / bays;
    for (let floor = 3; floor <= 39; floor += 1) {
      const bottom = floorHeight(floor), top = floorHeight(floor + 1);
      for (let bay = 0; bay < bays; bay += 1) {
        strip(paneTone(floor, bay, side), run, bay * width + 0.16, (bay + 1) * width - 0.16, bottom + 0.26, top - 0.24, 0.02, 0.07);
      }
      strip(mullions, run, 0.015, run.length - 0.015, top - 0.15, top + 0.05, 0.03, 0.12);
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
      strip(mullions, run, s - 0.06, s + 0.06, h.podium + 0.02, crownBase - 0.05, 0.05, 0.16);
    }
    strip(mullions, run, 0.015, run.length - 0.015, h.podium - 0.05, h.podium + 0.35, 0.06, 0.18);
  });

  // The crown: dark glazing between light fins over the top two floors, then
  // a projecting closed cap at the 159 m roof. The mapped outline carries
  // sub-meter tracing jogs on its north and west edges; the prisms keep them,
  // but a closed band cannot turn their concave corners, so the cap ring drops
  // vertices within 1.2 m of the chord between their neighbours and verifies
  // that every remaining corner is convex: a future part refresh could add a
  // jog the tolerance keeps, which must fail here with a clear message rather
  // than as a band error at page load.
  tower.forEach((run) => {
    strip(crownGlass, run, 0.12, run.length - 0.12, crownBase + 0.05, shaftTop - 0.25, 0.01, 0.05);
    const count = Math.max(1, Math.round(run.length / 1.05));
    for (let i = 0; i < count; i += 1) {
      const s = (i + 0.5) * run.length / count;
      strip(crownFins, run, s - 0.13, s + 0.13, crownBase - 0.05, shaftTop - 0.2, 0.04, 0.28);
    }
  });
  const simplified = tower.map((run) => run.at(0));
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (let i = 0; i < simplified.length; i += 1) {
      const a = simplified[(i - 1 + simplified.length) % simplified.length]!;
      const b = simplified[(i + 1) % simplified.length]!;
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const p = simplified[i]!;
      if (chord < 1e-9 || (Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / chord < 1.2 && simplified.length > 4)) {
        simplified.splice(i, 1);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  for (let i = 0; i < simplified.length; i += 1) {
    const a = simplified[(i - 1 + simplified.length) % simplified.length]!;
    const b = simplified[i]!;
    const c = simplified[(i + 1) % simplified.length]!;
    const turn = ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
      / (Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]));
    if (turn > 1e-6) throw new Error("Kemper's mapped cap ring still turns a concave corner after simplification.");
  }
  const capRuns = simplified.map((p, i) => line(p, simplified[(i + 1) % simplified.length]!));
  kit.band(cap, capRuns, shaftTop, h.roof, 0.4, { closed: true });

  // Podium: storefront glazing at grade, its mullions, a spandrel head, the
  // second floor's windows, and a projecting cap. Cap pieces under the tower
  // are skipped so the cap does not run through the tower's walls.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.0));
    const width = run.length / bays;
    for (let bay = 0; bay < bays; bay += 1) {
      strip(paneTone(1, bay, side), run, bay * width + 0.18, (bay + 1) * width - 0.18, 0.9, 4.4, 0.02, 0.07);
      strip(paneTone(2, bay, side + 9), run, bay * width + 0.18, (bay + 1) * width - 0.18, 5.1, 7.15, 0.02, 0.07);
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
      strip(mullions, run, s - 0.06, s + 0.06, 0.85, 7.2, 0.04, 0.13);
    }
    strip(mullions, run, 0.015, run.length - 0.015, 4.45, 4.95, 0.03, 0.15);
    const count = Math.max(1, Math.ceil(run.length / 1.5));
    for (let index = 0; index < count; index += 1) {
      const from = index * run.length / count, to = (index + 1) * run.length / count;
      if (inside(towerPolygon, run.at((from + to) / 2, 0.3))) continue;
      strip(mullions, run, from, to, 7.35, h.podium, 0.02, 0.3);
    }
  });

  const model = kit.finish({ height: h.roof, outlines: [marble, cap], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 41, source: "docs/kemper-geographic-reference.md" };
  return model;
}
