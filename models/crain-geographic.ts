import * as THREE from "../vendor/three-r186.js";
import { createBuilder, inside, polygonOf } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import type { GeoBuilding, GeoPart } from "./skyline-geography-data.js";
import { projectGround } from "./skyline-geography.js";

// Crain Communications Building at 150 North Michigan Avenue: the geographic
// layout's detailed model. The three mapped parts keep their OpenStreetMap
// outlines and roof slopes (133° downhill bearing, 75 and 73 m of fall); the
// 177.4 m top is the published architectural height. Window cells, mullions,
// light roof rims, and the dark seam along the mapped diagonal reuse the
// fitted model's vocabulary at meter scale. Row and bay spacings are
// estimates; see docs/crain-geographic-reference.md. Units are meters; +x is
// east, +z is south.
export const crainGeographicLevels = Object.freeze({
  tip: 177.4,
  floors: 41,
});
const h = crainGeographicLevels;
const pitch = h.tip / h.floors;
const radians = Math.PI / 180;

// The generic massing warp: an OSM roof:direction is the downhill compass
// bearing, so each part's top descends along it from the part's stated height.
function roofHeights(part: GeoPart, polygon: Vec2[]): (point: Vec2) => number {
  if (!part.roofSlope) return () => part.top;
  const { direction, height } = part.roofSlope;
  const angle = direction * radians;
  const along = ([x, z]: Vec2) => x * Math.sin(angle) - z * Math.cos(angle);
  const projections = polygon.map(along);
  const min = Math.min(...projections), span = Math.max(...projections) - min;
  return (point: Vec2) => part.top - height * (along(point) - min) / span;
}

export function createCrainGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The fitted model's palette: a pale stone shell, dark glazing with
  // scattered lit cells, light mullions and roof rims, and a dark roof seam.
  const shell = kit.batch("Crain · mapped stone shell", kit.material(0xa6a6a6));
  const mullions = kit.batch("Crain · mullions and roof rims", kit.material(0xb4b4b4));
  const seam = kit.batch("Crain · roof seam", kit.material(0x1a1a1a));
  const lit = kit.batch("Crain · lit glazing", kit.material(0x7a7a7a));
  const dim = kit.batch("Crain · dim glazing", kit.material(0x505050));
  const tones = [0x2a2a2a, 0x2f2f2f, 0x343434, 0x262626].map((color, i) => kit.batch(`Crain · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 29, 0x9e3779b1) ^ Math.imul(bay + 41, 0x85ebca77) ^ Math.imul(side + 13, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };
  // projectGround is a hoisted function declaration in skyline-geography.js,
  // so this import survives the module cycle; a one-point plan would instead
  // build a zero-length run whose tangent divides by zero.
  const projectPoint = (coordinate: [number, number]): Vec2 => {
    const [east, north] = projectGround(coordinate);
    return [east, -north] as Vec2;
  };

  const parts = record.parts.map((part) => {
    const plan = projectPlan(part.coordinates);
    return { part, plan, polygon: polygonOf(plan), roof: roofHeights(part, polygonOf(plan)) };
  });
  const footprintPolygon = polygonOf(projectPlan(record.footprint.coordinates));

  // The mapped volumes: each part keeps its own outline and roof slope. The
  // parts share boundary edges, so their coincident walls face opposite ways
  // and never overlap as same-facing surfaces.
  for (const { part, plan } of parts) kit.prism(shell, plan, [0, part.top]);

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
  // A part edge covered by a neighbour gets no facade: the neighbour's wall
  // closes it, and two proud strips in the same plane would interpenetrate.
  const shared = (run: Run) => inside(footprintPolygon, run.at(run.length / 2, 0.3));

  // A geometric face normal, used for the sloped pane tops and roof boxes.
  const normal = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
    const u = b.map((value, axis) => value - a[axis]!) as Vec3, v = c.map((value, axis) => value - a[axis]!) as Vec3;
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as Vec3;
    const length = Math.hypot(...n);
    return n.map((value) => value / length) as Vec3;
  };
  // A closed box whose top follows the roof's local slope: the roof height is
  // linear along a run, so a top face with the two end heights is planar, and
  // a flat-topped box sampled at the bay midpoint would poke through the roof
  // and the rim at the downhill end.
  const paneBox = (batch: BatchData, run: Run, from: number, to: number, y0: number, h0: number, h1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    const sill = y0 + 0.03;
    if (h0 <= sill && h1 <= sill) return;
    // An end the roof cuts below the pane's sill truncates the box at the
    // crossing, where the pane meets the roof; keeping the whole span would
    // hang the bottom face above the roof and cross the rim.
    if (h0 <= sill) {
      from += (to - from) * (sill - h0) / (h1 - h0);
      h0 = sill;
    } else if (h1 <= sill) {
      to = from + (to - from) * (sill - h0) / (h1 - h0);
      h1 = sill;
    }
    if (to - from < 0.03) return;
    const n = run.normal(0);
    const corner = (end: Vec2, across: number, y: number): Vec3 => [end[0] + n[0] * across, y, end[1] + n[1] * across];
    const b: Vec3[] = [corner(run.at(from), back, y0), corner(run.at(from), front, y0), corner(run.at(to), front, y0), corner(run.at(to), back, y0)];
    const T: Vec3[] = [corner(run.at(from), back, h0), corner(run.at(from), front, h0), corner(run.at(to), front, h1), corner(run.at(to), back, h1)];
    kit.quad(batch, [T[0]!, T[1]!, T[2]!, T[3]!], [normal(T[0]!, T[1]!, T[2]!)]);
    kit.quad(batch, [b[0]!, b[3]!, b[2]!, b[1]!], [normal(b[0]!, b[3]!, b[2]!)]);
    for (const i of [0, 1, 2, 3]) {
      const j = (i + 1) % 4;
      kit.quad(batch, [T[j]!, T[i]!, b[i]!, b[j]!], [normal(T[j]!, T[i]!, b[i]!)]);
    }
  };

  // Window cells and mullions, clipped to each part's sloping roof. A pane's
  // top follows the roof at both ends; a pane that straddles the row's flat
  // ceiling flattens to the lower end, keeping its top face planar.
  for (const { part, plan, roof } of parts) {
    plan.forEach((run, side) => {
      if (shared(run)) return;
      const bays = Math.max(1, Math.round(run.length / 3.0));
      const width = run.length / bays;
      for (let row = 1; row <= h.floors; row += 1) {
        const bottom = Math.max((row - 1) * pitch, 0.85);
        for (let bay = 0; bay < bays; bay += 1) {
          const from = bay * width + 0.16, to = (bay + 1) * width - 0.16;
          const ceiling = row * pitch;
          let h0 = Math.min(ceiling, roof(run.at(from, 0)) - 0.42), h1 = Math.min(ceiling, roof(run.at(to, 0)) - 0.42);
          if ((h0 < ceiling) !== (h1 < ceiling)) h0 = h1 = Math.min(h0, h1);
          paneBox(paneTone(row, bay, side), run, from, to, bottom + 0.28, h0, h1, 0.02, 0.07);
        }
      }
      for (let i = 0; i <= bays; i += 1) {
        const s = Math.max(0.18, Math.min(run.length - 0.18, i * width));
        strip(mullions, run, s - 0.05, s + 0.05, 0.25, Math.min(part.top, roof(run.at(s, 0)) - 0.1), 0.05, 0.14);
      }
    });
  }

  // A light rim follows each part's exterior roof edges, and a dark seam runs
  // along the mapped diagonal the two sloped parts share. Both are hand-built
  // closed boxes, because a kit box cannot follow a sloping roof line.
  // A closed sloped box between two plan points, following the roof's height.
  // The top, bottom, and four side quads are wound so every shared edge pairs
  // with its reverse partner, keeping the batch watertight.
  const roofEdge = (batch: BatchData, p0: Vec2, p1: Vec2, roof: (point: Vec2) => number, halfWidth: number, lift: number, drop: number) => {
    const chord = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const t = [(p1[0] - p0[0]) / chord, (p1[1] - p0[1]) / chord] as Vec2;
    const n = [-t[1], t[0]] as Vec2;
    const corner = (end: Vec2, across: number, y: number): Vec3 => [end[0] + n[0] * across, y, end[1] + n[1] * across];
    const b: Vec3[] = [corner(p0, -halfWidth, roof(p0) - drop), corner(p0, halfWidth, roof(p0) - drop), corner(p1, halfWidth, roof(p1) - drop), corner(p1, -halfWidth, roof(p1) - drop)];
    const T: Vec3[] = [corner(p0, -halfWidth, roof(p0) + lift), corner(p0, halfWidth, roof(p0) + lift), corner(p1, halfWidth, roof(p1) + lift), corner(p1, -halfWidth, roof(p1) + lift)];
    kit.quad(batch, [T[0]!, T[1]!, T[2]!, T[3]!], [normal(T[0]!, T[1]!, T[2]!)]);
    kit.quad(batch, [b[0]!, b[3]!, b[2]!, b[1]!], [normal(b[0]!, b[3]!, b[2]!)]);
    for (const i of [0, 1, 2, 3]) {
      const j = (i + 1) % 4;
      kit.quad(batch, [T[j]!, T[i]!, b[i]!, b[j]!], [normal(T[j]!, T[i]!, b[i]!)]);
    }
  };
  for (const { plan, roof } of parts) {
    for (const run of plan) {
      if (shared(run)) continue;
      roofEdge(mullions, run.at(0.35), run.at(run.length - 0.35), roof, 0.3, 0.1, 0.12);
    }
  }
  // The dark seam along the mapped diagonal between the two sloped roof
  // parts. Part 228's roof stands about 5 m above 229's along that edge, so
  // the seam follows the higher facet and drops 8 m to bury its foot in the
  // lower one, closing the step between the two mapped roof surfaces.
  const seamPart = parts.find(({ part }) => part.way === 284816228)!;
  roofEdge(seam, projectPoint([-87.6248301, 41.884687]), projectPoint([-87.625093, 41.8848805]), seamPart.roof, 0.9, 0.15, 8);

  // Warp every prism top to its mapped slope and refresh the normals, exactly
  // as the generic massing path does for its warped roofs.
  for (const { part, roof } of parts) {
    for (let i = 0; i < shell.positions.length; i += 3) {
      if (Math.abs(shell.positions[i + 1]! - part.top) < 1e-6) {
        shell.positions[i + 1] = roof([shell.positions[i]!, shell.positions[i + 2]!]);
      }
    }
  }

  const model = kit.finish({ height: h.tip, outlines: [shell, mullions], opacity: 0.16 });
  model.building.traverse((child) => { const mesh = child as THREE.Mesh; if (mesh.isMesh) mesh.geometry.computeVertexNormals(); });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 41, source: "docs/crain-geographic-reference.md" };
  return model;
}
