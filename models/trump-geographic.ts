import { createBuilder, inside, line, polygonOf } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import type { GeoBuilding, GeoPart } from "./skyline-geography-data.js";

// Trump International Hotel and Tower: the geographic layout's detailed model.
// The mapped podium, three tower tiers, crown block and three spire segments keep
// their OpenStreetMap outlines and part heights; the published 423.2 m tip caps
// the last segment. Tower faces carry the fitted model's glazing vocabulary at
// meter scale: recessed panes with scattered lit units, raised mullions, floor
// bands, terrace parapets, a ribbed crown, and a tapered mast whose joints sit at
// the mapped part boundaries. Window-row and bay spacings are estimates; see
// docs/trump-geographic-reference.md. Units are meters; +x is east, +z is south.
export const trumpGeographicLevels = Object.freeze({
  podium: 60, // OSM way 64594680
  base: 120, // OSM way 188338549
  lower: 200, // OSM way 188338550
  shaft: 345, // OSM way 188338548
  crownTop: 357, // OSM way 188338859
  spireJoints: [380, 400] as [number, number], // OSM ways 188356529 and 284773992
  tip: 423.2, // published architectural height
});

// Estimated per-tier floor pitches, chosen so the ~96 window rows plus the
// two-level crown read close to the published 98 floors.
const pitches = Object.freeze({ base: 60 / 16, lower: 80 / 22, shaft: 145 / 42 });

export function createTrumpGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const h = trumpGeographicLevels;
  const kit = createBuilder(record.name, record.id);
  const podium = kit.batch("Trump · mapped ground podium", kit.material(0x2b2b2b));
  const shell = kit.batch("Trump · tower tiers", kit.material(0x333333));
  const frame = kit.batch("Trump · mullions and floor bands", kit.material(0x777777));
  const lit = kit.batch("Trump · lit glazing", kit.material(0x6e6e6e));
  const dim = kit.batch("Trump · dim glazing", kit.material(0x545454));
  const shade = kit.batch("Trump · dark glazing", kit.material(0x242424));
  const tones = [0x303030, 0x343434, 0x383838, 0x2c2c2c].map((color, index) => kit.batch(`Trump · glazed panels ${index + 1}`, kit.material(color)));
  const enclosure = kit.batch("Trump · crown enclosure", kit.material(0x202020));
  const ribs = kit.batch("Trump · crown ribs", kit.material(0x8c8c8c));
  const mast = kit.batch("Trump · segmented spire", kit.material(0xd0d0d0));

  const part = (way: number): GeoPart | undefined => record.parts.find((entry) => entry.way === way);
  const ground = projectPlan(record.footprint.coordinates);
  const basePlan = projectPlan(part(188338549)!.coordinates);
  const lowerPlan = projectPlan(part(188338550)!.coordinates);
  const shaftPlan = projectPlan(part(188338548)!.coordinates);
  const crownPlan = projectPlan(part(188338859)!.coordinates);
  const mastPlans = [188356529, 284773992, 284773991].map((way) => projectPlan(part(way)!.coordinates));

  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 17, 0x9e3779b1) ^ Math.imul(bay + 23, 0x85ebca77) ^ Math.imul(side + 5, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    if (value < 10) return shade;
    return tones[value % tones.length]!;
  };

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

  // The mapped outlines themselves: the ground footprint, three nested tower
  // tiers, and the crown block. Nested tiers start at the previous tier's top,
  // so no coincident exterior walls overlap over their full height.
  kit.prism(podium, ground, [0, h.podium]);
  kit.prism(shell, basePlan, [h.podium, h.base]);
  kit.prism(shell, lowerPlan, [h.base, h.lower]);
  kit.prism(shell, shaftPlan, [h.lower, h.shaft]);

  // Curtain-wall rhythm on every tower face: a spandrel band and one pane per
  // bay per row, with full-height mullions at the bay lines. Faces that look
  // out at the river take the finer module of the glazed south front.
  function facade(runs: Plan, bottom: number, top: number, pitch: number, seed = 0) {
    for (const [side, run] of runs.entries()) {
      const river = run.normal(0)[1] > 0.4;
      const bays = Math.max(1, Math.round(run.length / (river ? 2.6 : 3.0)));
      const width = run.length / bays;
      for (let row = 0; row * pitch < top - bottom; row += 1) {
        const y0 = bottom + row * pitch, y1 = Math.min(top, y0 + pitch);
        strip(frame, run, 0.015, run.length - 0.015, y0 - 0.13, y0 + 0.06, 0.05, 0.13);
        for (let bay = 0; bay < bays; bay += 1) {
          strip(paneTone(row, bay, side + seed), run, bay * width + 0.22, (bay + 1) * width - 0.22, y0 + 0.28, y1 - 0.26, 0.02, 0.06);
        }
      }
      for (let i = 0; i <= bays; i += 1) {
        const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
        strip(frame, run, s - 0.055, s + 0.055, bottom + 0.1, top - 0.1, 0.07, 0.16);
      }
    }
  }
  facade(basePlan, h.podium, h.base, pitches.base, 1);
  facade(lowerPlan, h.base, h.lower, pitches.lower, 2);
  facade(shaftPlan, h.lower, h.shaft, pitches.shaft, 3);

  // Podium: dark storefront glazing at grade, its head, then garage floor bands
  // up to the cap. The mapped ground outline stays untouched.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.4));
    const width = run.length / bays;
    for (let bay = 0; bay < bays; bay += 1) {
      strip((bay * 7 + side * 13) % 19 === 0 ? lit : shade, run, bay * width + 0.2, (bay + 1) * width - 0.2, 0.7, 5.4, 0.02, 0.06);
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
      strip(frame, run, s - 0.06, s + 0.06, 0.6, 5.5, 0.07, 0.14);
    }
    strip(frame, run, 0.015, run.length - 0.015, 5.5, 5.9, 0.05, 0.15);
    for (let row = 0; row < 15; row += 1) {
      const y = 9.5 + row * 3.5;
      strip(frame, run, 0.015, run.length - 0.015, y - 0.12, y + 0.08, 0.04, 0.11);
    }
  });
  for (const run of ground) {
    if (run.length < 0.65) continue;
    kit.box(frame, run.at(run.length / 2), run.normal(0), (run.length - 0.65) / 2, 0.02, 0.3, h.podium - 0.5, h.podium);
  }

  // Each tier's roof stays a terrace wherever the next tier does not cover it,
  // finished with a parapet. Pieces under an upper tier are skipped so the
  // parapet does not run through its walls. Boxes at mapped corners stop short,
  // because two full-length returns would overlap in the corner wedge; the 2 cm
  // standoff keeps the rest of each box off the roof slab's own boundary, where
  // Float32 rounding of the two constructions would leave coincident slivers.
  const parapet = (runs: Plan, y: number, upper: Plan) => {
    const polygon = polygonOf(upper);
    const clearance = 0.31 + 0.025;
    for (const parent of runs) {
      const count = Math.max(1, Math.ceil(parent.length / 1.5));
      for (let index = 0; index < count; index += 1) {
        const run = line(parent.at(parent.length * index / count), parent.at(parent.length * (index + 1) / count));
        if (inside(polygon, run.at(run.length / 2, 0.3))) continue;
        const start = index === 0 ? clearance : 0, end = run.length - (index === count - 1 ? clearance : 0);
        if (end - start < 0.03) continue;
        kit.box(frame, run.at((start + end) / 2), run.normal(0), (end - start) / 2, 0.09, 0.31, y, y + 0.75);
      }
    }
  };
  parapet(ground, h.podium, basePlan);
  parapet(basePlan, h.base, lowerPlan);
  parapet(lowerPlan, h.lower, shaftPlan);
  parapet(shaftPlan, h.shaft, crownPlan);

  // The dark crown block with its light rib rhythm, horizontal seams, and cap.
  kit.prism(enclosure, crownPlan, [h.shaft, h.crownTop]);
  crownPlan.forEach((run) => {
    const count = Math.max(1, Math.round(run.length / 1.05));
    for (let i = 0; i < count; i += 1) {
      const s = (i + 0.5) * run.length / count;
      strip(ribs, run, s - 0.055, s + 0.055, h.shaft + 0.25, h.crownTop - 0.55, 0.08, 0.18);
    }
  });
  for (const y of [346.4, 350.2, 354]) kit.band(ribs, crownPlan, y - 0.11, y + 0.08, 0.12, { closed: true });
  kit.band(ribs, crownPlan, h.crownTop - 0.45, h.crownTop, 0.2, { closed: true });

  // Three tapered mast sections keep the mapped ring of each OSM spire part as
  // their lower ring and taper to the next part's ring; only the final section's
  // ~0.7 m tip is inferred. Adjacent sections share their joint ring, so the
  // mast stays closed through both mapped joints.
  const ring = (runs: Plan): Vec2[] => runs.map((run) => run.at(0));
  const mastSection = (bottomRing: Vec2[], topRing: Vec2[], y0: number, y1: number) => {
    const bottom: Vec3[] = bottomRing.map(([x, z]) => [x, y0, z]);
    const top: Vec3[] = topRing.map(([x, z]) => [x, y1, z]);
    for (let i = 0; i < bottom.length; i += 1) {
      const j = (i + 1) % bottom.length;
      const [a, b] = [bottomRing[i]!, bottomRing[j]!];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const outward: Vec3 = [-(b[1] - a[1]) / length, 0, (b[0] - a[0]) / length];
      kit.quad(mast, [bottom[i]!, bottom[j]!, top[j]!, top[i]!], [outward, outward, outward, outward]);
    }
    kit.slab(mast, topRing, y1, true);
    kit.slab(mast, bottomRing, y0, false);
  };
  const rings = mastPlans.map(ring);
  const center: Vec2 = rings[0]!.reduce<Vec2>((sum, p) => [sum[0] + p[0] / rings[0]!.length, sum[1] + p[1] / rings[0]!.length], [0, 0]);
  const scaled = (points: Vec2[], factor: number): Vec2[] => points.map((p) => [center[0] + (p[0] - center[0]) * factor, center[1] + (p[1] - center[1]) * factor]);
  mastSection(rings[0]!, rings[1]!, h.crownTop, h.spireJoints[0]);
  mastSection(rings[1]!, rings[2]!, h.spireJoints[0], h.spireJoints[1]);
  mastSection(rings[2]!, scaled(rings[2]!, 0.5), h.spireJoints[1], h.tip);

  const model = kit.finish({ height: h.tip, outlines: [podium, shell, enclosure, mast], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, source: "docs/trump-geographic-reference.md" };
  return model;
}
