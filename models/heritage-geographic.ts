import { createBuilder, inside, line, polygonOf, rectangle } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Meters, with east/+x and south/+z. Design elevations from PD 787, sheets
// 63741/63743; occupied/tip heights from CTBUH. See the reference audit for
// the distinction between the 2001 design drawings and the completed building.
export const heritageGeographicLevels = Object.freeze({
  podium: (107 + 8 / 12) * 0.3048,
  lowerRoof: (293 + 8 / 12) * 0.3048,
  occupied: 176.8,
  mainRoof: (594 + 6 / 12) * 0.3048,
  tip: 192.4,
});

export function heritageFloorHeight(floor: number): number {
  const h = heritageGeographicLevels;
  return floor <= 28
    ? h.podium + (floor - 9) * (h.lowerRoof - h.podium) / 19
    : h.lowerRoof + (floor - 28) * (h.occupied - h.lowerRoof) / 29;
}

// A separate geographic factory leaves the original illustration fit intact.
// Reuses its construction vocabulary: inset panes, raised mullions, six-floor
// bands, projecting crown fins, and a louvered rooftop mechanical screen.
export function createHeritageGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const h = heritageGeographicLevels;
  const kit = createBuilder(record.name, record.id);
  // Match the original artwork's neutral palette, using the same toon-lighting
  // compensation as heritage-at-millennium-park.js for glass, trim and precast.
  const shell = kit.batch("Heritage · tower and lower wing", kit.material(0x363636));
  const base = kit.batch("Heritage · mapped ground footprint", kit.material(0x787878));
  const stone = kit.batch("Heritage · limestone frame", kit.material(0x8c8c8c));
  const trim = kit.batch("Heritage · bronze mullions and slab edges", kit.material(0x141414));
  const roof = kit.batch("Heritage · roof terraces", kit.material(0x363636));
  const mechanical = kit.batch("Heritage · mechanical penthouses", kit.material(0xa4a4a4));
  const glass = [0x444444, 0x474747, 0x4a4a4a, 0x3a3a3a, 0x7a7a7a].map((color, i) => kit.batch(`Heritage · glazing ${i + 1}`, kit.material(color)));
  const masonry = [0x8c8c8c, 0x787878, 0x919191, 0x808080].map((color, i) => kit.batch(`Heritage · Wabash facade ${i + 1}`, kit.material(color)));
  const pane = (floor: number, bay: number, side = 0): BatchData => {
    const hash = (floor * 131 + bay * 37 + side * 59 + 11) % 97;
    return glass[hash < 5 ? 4 : hash < 8 ? 3 : hash % 3]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const tower = projectPlan(record.parts.find((p) => p.way === 686199648)!.coordinates);
  const wing = projectPlan(record.parts.find((p) => p.way === 686199649)!.coordinates);
  // The lower east wall is concave in the floor plans, unlike the straight
  // chord in OSM. Subdivide that chord inward, retaining its mapped endpoints.
  // The 2.1 m inset is a drawing-derived estimate, not a survey measurement.
  const eastWing = wing.findIndex((run) => run.length > 40 && run.normal(0)[0] > 0.9);
  if (eastWing >= 0) {
    const run = wing[eastWing]!, steps = 16;
    const points = Array.from({ length: steps + 1 }, (_, i) => run.at(run.length * i / steps, -2.1 * Math.sin(Math.PI * i / steps)));
    wing.splice(eastWing, 1, ...points.slice(1).map((p, i) => line(points[i]!, p)));
  }
  const towerPolygon = polygonOf(tower), wingPolygon = polygonOf(wing);
  const crownBase = heritageFloorHeight(53);
  // A full podium supports both wings. No guessed podium ratio is used.
  kit.prism(base, ground, [0, h.podium]);
  kit.prism(shell, tower, [h.podium, crownBase]);
  kit.prism(shell, wing, [h.podium, h.lowerRoof - 0.65]);
  kit.prism(roof, wing, [h.lowerRoof - 0.65, h.lowerRoof]);

  const center: Vec2 = towerPolygon.reduce<Vec2>((sum, p) => [sum[0] + p[0] / towerPolygon.length, sum[1] + p[1] / towerPolygon.length], [0, 0]);
  const inset: Vec2[] = towerPolygon.map((p) => {
    const length = Math.hypot(p[0] - center[0], p[1] - center[1]);
    return p.map((n, i) => n + (center[i]! - n) * 1.1 / length) as Vec2;
  });
  const crown = inset.map((p, i) => line(p, inset[(i + 1) % inset.length]!));
  kit.prism(shell, crown, [crownBase, h.mainRoof - 0.75]);
  kit.prism(stone, tower, [h.mainRoof - 0.75, h.mainRoof]);

  // Every pane and piece of trim is a closed shallow solid. Offsets separate
  // visible surfaces from their backing wall, avoiding coincident faces.
  const strip = (batch: BatchData, run: Run, from: number, to: number, y0: number, y1: number, back: number, front: number) => {
    // Stop solid trim short of polygon corners. Adjacent faces can turn
    // inward; their projecting returns must not overlap at the same elevation.
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    if (to - from < 0.03 || y1 <= y0) return;
    kit.box(batch, run.at((from + to) / 2), run.normal(0), (to - from) / 2, back, front, y0, y1);
  };
  const archedPane = (batch: BatchData, run: Run, s: number, halfWidth: number, bottom: number, top: number) => {
    const spring = top - 0.6;
    const profile: [number, number][] = [[-halfWidth, bottom], [halfWidth, bottom], ...Array.from({ length: 13 }, (_, i) => {
      const angle = Math.PI * i / 12;
      return [Math.cos(angle) * halfWidth, spring + Math.sin(angle) * 0.6] as [number, number];
    })];
    const vertex = ([side, y]: [number, number], depth: number): Vec3 => { const [x, z] = run.at(s + side, depth); return [x, y, z]; };
    const n = run.normal(0), normal = [n[0], 0, n[1]] as Vec3;
    for (const [depth, sign] of [[0.10, -1], [0.14, 1]] as [number, number][]) {
      const faceNormal = normal.map((v) => v * sign) as Vec3;
      for (let i = 1; i < profile.length - 1; i += 1) kit.triangle(batch,
        [profile[0]!, profile[i]!, profile[i + 1]!].map((p) => vertex(p, depth)), [faceNormal, faceNormal, faceNormal]);
    }
    profile.forEach((a, i) => {
      const b = profile[(i + 1) % profile.length]!, dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      kit.quad(batch, [vertex(a, 0.10), vertex(b, 0.10), vertex(b, 0.14), vertex(a, 0.14)], [[n[1] * dy / length, -dx / length, -n[0] * dy / length] as Vec3]);
    });
  };
  const exposed = (run: Run, y: number, other: Vec2[], top: number) => y >= top || !inside(other, run.at(run.length / 2, 0.12));
  function facade(runs: Plan, firstFloor: number, lastFloor: number, ceiling: number, other: Vec2[] = [], otherTop = 0) {
    runs.forEach((run, side) => {
      // Small polygon facets on the curved east wing each make one bay;
      // other faces use approximately 3 m apartment/window modules.
      const bays = Math.max(1, Math.round(run.length / 3.15));
      const width = run.length / bays;
      for (let floor = firstFloor; floor <= lastFloor; floor += 1) {
        const bottom = heritageFloorHeight(floor);
        const top = Math.min(ceiling, floor === 57 ? h.mainRoof - 0.8 : heritageFloorHeight(floor + 1));
        if (!exposed(run, bottom, other, otherTop)) continue;
        for (let bay = 0; bay < bays; bay += 1) {
          const from = bay * width + 0.20, to = (bay + 1) * width - 0.20;
          strip(pane(floor, bay, side), run, from, to, bottom + 0.28, top - 0.24, 0.015, 0.055);
          strip(trim, run, (from + to) / 2 - 0.035, (from + to) / 2 + 0.035, bottom + 0.28, top - 0.24, 0.06, 0.10);
        }
        const major = (floor - 9) % 6 === 0;
        strip(major ? stone : trim, run, 0.015, run.length - 0.015, bottom + 0.03, bottom + (major ? 0.42 : 0.19), 0.07, major ? 0.28 : 0.13);
      }
      // Split uprights at the adjacent wing's roof, so hidden partitions do
      // not create lines across its terrace or show through its exterior.
      const bottom = exposed(run, heritageFloorHeight(firstFloor), other, otherTop) ? heritageFloorHeight(firstFloor) : otherTop;
      for (let i = 0; i <= bays; i += 1) {
        const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
        strip(stone, run, s - 0.10, s + 0.10, bottom + 0.02, ceiling - 0.02, 0.14, 0.34);
      }
    });
  }
  facade(tower, 9, 52, crownBase, wingPolygon, h.lowerRoof);
  facade(wing, 9, 27, h.lowerRoof - 0.65, towerPolygon, h.mainRoof);
  facade(crown, 53, 57, h.mainRoof - 0.75);

  // Tall pale fins and open reveals around the inset upper-floor glazing.
  tower.forEach((run) => {
    const bays = Math.max(1, Math.round(run.length / 3.15));
    for (let i = 0; i < bays; i += 1) {
      const s = (i + 0.5) * run.length / bays;
      strip(stone, run, s - 0.28, s + 0.28, crownBase - 0.01, h.mainRoof - 0.76, -1.25, 0.40);
    }
  });
  // The lower wing repeats the taller crown piers over its top three floors.
  wing.forEach((run) => {
    if (!exposed(run, h.lowerRoof - 1, towerPolygon, h.mainRoof)) return;
    strip(stone, run, 0.02, run.length - 0.02, h.lowerRoof - 0.60, h.lowerRoof - 0.03, 0.02, 0.6);
    const count = Math.max(1, Math.round(run.length / 3.15));
    for (let i = 0; i < count; i += 1) {
      const s = (i + 0.5) * run.length / count;
      strip(stone, run, s - 0.24, s + 0.24, heritageFloorHeight(25), h.lowerRoof - 0.66, 0.35, 0.59);
    }
  });

  // Mechanical volumes and a north/south screen set back from the outer rim.
  // Their plan dimensions are estimated from the elevations and contractor photo.
  kit.prism(mechanical, rectangle(-63, -51, 59, 86), [h.mainRoof, 189.8]);
  const screen = line([-48.5, 91], [-48.5, 56]);
  for (let s = 0.25; s < screen.length; s += 1.35) strip(stone, screen, s, s + 0.16, h.mainRoof + 0.04, h.tip, -0.18, 0.18);
  for (let y = h.mainRoof + 0.25; y < h.tip - 0.2; y += 0.55) strip(mechanical, screen, 0.15, screen.length - 0.15, y, y + 0.28, -0.14, 0.14);

  // Balcony stacks occupy the stepped north and south returns visible in the
  // upper-floor plan. Slabs and rails are inset along each selected return.
  for (const run of tower.filter((r) => r.length > 4.5 && r.length < 7.5 && Math.abs(r.normal(0)[1]) > 0.9)) {
    for (let floor = 10; floor <= 52; floor += 1) {
      const y = heritageFloorHeight(floor);
      if (!exposed(run, y, wingPolygon, h.lowerRoof)) continue;
      strip(stone, run, 0.32, run.length - 0.32, y, y + 0.17, -0.1, 1.05);
      strip(trim, run, 0.32, run.length - 0.32, y + 1.02, y + 1.10, 0.95, 1.03);
      for (let s = 0.4; s < run.length - 0.3; s += 0.55) strip(trim, run, s, s + 0.045, y + 0.17, y + 1.02, 0.96, 1.01);
    }
  }

  // Podium: retail at grade, parking grilles, taller upper openings, and the
  // four preserved Wabash facades. Historic bay proportions are approximated
  // from sheet 63746, not copied from the modern tower's glass grid.
  ground.forEach((run) => {
    if (run.length < 2) return;
    const west = run.normal(0)[0] < -0.9;
    const bays = Math.max(1, Math.round(run.length / (west ? 3.4 : 4.0)));
    const width = run.length / bays;
    for (let bay = 0; bay < bays; bay += 1) {
      const s = (bay + 0.5) * width, historic = west && bay >= 4 && bay < bays - 4;
      const block = Math.min(3, Math.floor((bay - 4) / Math.max(1, (bays - 8) / 4)));
      if (historic) strip(masonry[block]!, run, bay * width + 0.04, (bay + 1) * width - 0.04, 0.3, 24.2 + (block % 2) * 0.5, 0.02, 0.09);
      for (let floor = 0; floor < 6; floor += 1) {
        const y = floor === 0 ? 0.65 : 5.3 + (floor - 1) * 3.7;
        const top = y + (floor === 0 ? 3.95 : 2.75);
        if (historic && block !== 1 && floor > 0) archedPane(pane(floor, bay), run, s, width * 0.31, y, top);
        else strip(pane(floor, bay), run, s - width * 0.31, s + width * 0.31, y, top, 0.10, 0.14);
        if (historic) {
          strip(stone, run, s - width * 0.34, s + width * 0.34, top + 0.03, top + 0.19, 0.15, 0.26);
          strip(stone, run, s - width * 0.34, s + width * 0.34, y - 0.15, y - 0.02, 0.15, 0.25);
        } else if (floor > 0) {
          for (let y2 = y + 0.3; y2 < top; y2 += 0.38) strip(trim, run, s - width * 0.31, s + width * 0.31, y2, y2 + 0.09, 0.15, 0.20);
        }
      }
      strip(glass[0]!, run, s - width * 0.34, s + width * 0.34, 26.1, h.podium - 0.8, 0.025, 0.055);
      strip(stone, run, s - 0.12, s + 0.12, 25.8, h.podium - 0.7, 0.06, 0.26);
    }
    strip(stone, run, 0.03, run.length - 0.03, 24.9, 25.55, 0.27, 0.44);
    strip(stone, run, 0.03, run.length - 0.03, h.podium - 0.55, h.podium - 0.03, 0.06, 0.33);
  });

  const model = kit.finish({ height: h.tip, outlines: [base, shell, mechanical], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, highestOccupiedFloor: 57, source: "docs/heritage-geographic-reference.md" };
  return model;
}
