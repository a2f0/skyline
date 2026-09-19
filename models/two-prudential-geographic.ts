import { createBuilder, polygonOf } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";
import type * as THREE from "../vendor/three-r186.js";

// Two Prudential Plaza: the geographic layout's detailed model. The mapped
// outline keeps its 240 m eave, 277 m pyramid peak, and the published 303.3 m
// spire tip. The fitted model's vocabulary carries over at meter scale:
// limestone piers and panes on the shaft, the paired south/north pointed
// tiers as shallow projections set back from the mapped corners, silver band
// and louver strips on the pyramid facets, and a tapered spire with inset
// panels. Tier, band, and row spacings are estimates; see
// docs/two-prudential-geographic-reference.md. Units are meters; +x is east,
// +z is south.
export const twoPrudentialGeographicLevels = Object.freeze({
  eave: 240, // OSM crown eave
  peak: 277, // OSM crown peak
  tip: 303.3, // published architectural tip
  floors: 64,
  middleShoulder: 196,
  middlePeak: 224,
  lowerShoulder: 156,
  lowerPeak: 178,
});
const h = twoPrudentialGeographicLevels;
const pitch = h.eave / h.floors;

// A geometric face normal.
function normal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u = b.map((value, axis) => value - a[axis]!) as Vec3, v = c.map((value, axis) => value - a[axis]!) as Vec3;
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as Vec3;
  const length = Math.hypot(...n);
  return n.map((value) => value / length) as Vec3;
}

export function createTwoPrudentialGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The fitted model's palette: stone shell, dark panes with scattered lit
  // units, metal piers, silver crown bands, and a bright spire.
  const stone = kit.batch("Two Prudential · limestone shell", kit.material(0x868686));
  const tiers = kit.batch("Two Prudential · setback tiers", kit.material(0x7d7d7d));
  const piers = kit.batch("Two Prudential · piers and crown ribs", kit.material(0x535353));
  const bands = kit.batch("Two Prudential · crown bands", kit.material(0xa6a6a6));
  const louvers = kit.batch("Two Prudential · crown louvers", kit.material(0x727272));
  const roof = kit.batch("Two Prudential · pyramid facets", kit.material(0x3a3a3a));
  const spire = kit.batch("Two Prudential · spire", kit.material(0xe9e9e9));
  const spirePanels = kit.batch("Two Prudential · spire inset panels", kit.material(0x575757));
  const lit = kit.batch("Two Prudential · lit glazing", kit.material(0x7a7a7a));
  const dim = kit.batch("Two Prudential · dim glazing", kit.material(0x505050));
  const tones = [0x2a2a2a, 0x2f2f2f, 0x343434, 0x262626].map((color, i) => kit.batch(`Two Prudential · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 7, 0x9e3779b1) ^ Math.imul(bay + 43, 0x85ebca77) ^ Math.imul(side + 2, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const outline = polygonOf(ground);
  const center: Vec2 = outline.reduce<Vec2>((sum, p) => [sum[0] + p[0] / outline.length, sum[1] + p[1] / outline.length], [0, 0]);
  const southRuns = ground.filter((run) => run.normal(0)[1] > 0.9);
  const southWall = southRuns.reduce((longest, run) => run.length > longest.length ? run : longest);
  const southX = southWall.at(southWall.length / 2)[0];
  const southZ = southWall.at(0)[1];

  // The mapped volume: the shaft to the mapped eave.
  kit.prism(stone, ground, [0, h.eave]);

  // A closed shallow solid on a run, and a closed box whose top follows a
  // per-end height profile (both faces stay planar because the profile is
  // linear along the run).
  const strip = (batch: BatchData, run: Run, from: number, to: number, y0: number, y1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    if (to - from < 0.03 || y1 <= y0) return;
    kit.box(batch, run.at((from + to) / 2), run.normal(0), (to - from) / 2, back, front, y0, y1);
  };
  const sloped = (batch: BatchData, run: Run, from: number, to: number, y0: number, h0: number, h1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    const sill = y0 + 0.03;
    if (h0 <= sill && h1 <= sill) return;
    if (h0 <= sill) { from += (to - from) * (sill - h0) / (h1 - h0); h0 = sill; }
    else if (h1 <= sill) { to = from + (to - from) * (sill - h0) / (h1 - h0); h1 = sill; }
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
  const face = (target: BatchData, vertices: Vec3[], outward?: Vec3, color?: THREE.Color) => {
    for (let i = 1; i < vertices.length - 1; i += 1) {
      const points = [vertices[0]!, vertices[i]!, vertices[i + 1]!];
      kit.triangle(target, points, [outward || normal(points[0]!, points[1]!, points[2]!), outward || normal(points[0]!, points[1]!, points[2]!), outward || normal(points[0]!, points[1]!, points[2]!)], color);
    }
  };
  // A shallow closed solid on an arbitrary facade/roof plane. The back face
  // reverses the front's winding so every shared edge keeps its reverse
  // partner.
  const relief = (target: BatchData, polygon: Vec3[], n: Vec3, depth: number, buried = 0.06) => {
    const moved = (distance: number): Vec3[] => polygon.map((p) => p.map((v, k) => v + n[k]! * distance) as Vec3);
    const front = moved(depth), back = moved(-buried);
    face(target, front, n);
    face(target, [...back].reverse(), n.map((v) => -v) as Vec3);
    for (let i = 0; i < polygon.length; i += 1) {
      const j = (i + 1) % polygon.length;
      const edge = front[j]!.map((v, k) => v - front[i]![k]!) as Vec3;
      const side = [edge[1] * n[2] - edge[2] * n[1], edge[2] * n[0] - edge[0] * n[2], edge[0] * n[1] - edge[1] * n[0]] as Vec3;
      face(target, [back[i]!, back[j]!, front[j]!, front[i]!], side);
    }
  };
  const clip = <T extends number[]>(polygon: T[], distance: (p: T) => number): T[] => polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length]!, da = distance(a), db = distance(b);
    const points = da >= 0 ? [a] : [];
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      points.push(a.map((v, k) => v + t * (b[k]! - v)) as T);
    }
    return points;
  });
  const clipY = (polygon: Vec3[], y: number, above: boolean) => clip(polygon, (p) => (above ? 1 : -1) * (p[1] - y));

  // The shaft facade: piers between panes on all four walls, 64 rows at the
  // published floor count.
  ground.forEach((run, side) => {
    if (run.length < 2) return;
    const bays = Math.max(1, Math.round(run.length / 3.4));
    const width = run.length / bays;
    for (let row = 1; row <= h.floors; row += 1) {
      const bottom = Math.max((row - 1) * pitch, 0.9), top = row * pitch;
      for (let bay = 0; bay < bays; bay += 1) {
        strip(paneTone(row, bay, side), run, bay * width + 0.55, (bay + 1) * width - 0.55, bottom + 0.3, top - 0.25, 0.02, 0.07);
      }
      if (row < h.floors) strip(piers, run, 0.015, run.length - 0.015, top - 0.15, top + 0.05, 0.03, 0.12);
    }
    for (let i = 0; i <= bays; i += 1) {
      const s = Math.max(0.5, Math.min(run.length - 0.5, i * width));
      strip(piers, run, s - 0.5, s + 0.5, 0.35, h.eave - 0.55, 0.05, 0.28);
    }
    strip(piers, run, 0.015, run.length - 0.015, 0.3, 0.75, 0.06, 0.18);
  });

  const northRuns = ground.filter((run) => run.normal(0)[1] < -0.9);
  const northWall = northRuns.reduce((longest, run) => run.length > longest.length ? run : longest);
  const northX = northWall.at(northWall.length / 2)[0];
  const northZ = northWall.at(0)[1];

  // The paired south/north pointed tiers: shallow closed gabled projections
  // inside the mapped outline. Their bases sit just above grade so the
  // street-level outline stays exact, each at its own height so no two
  // bottom faces share a plane.
  const gabled = (target: BatchData, halfWidth: number, back: number, front: number, shoulder: number, peak: number, bottomY: number) => {
    const profile: [number, number][] = [[-halfWidth, bottomY], [0, bottomY], [halfWidth, bottomY],
      [halfWidth, shoulder], [0, peak], [-halfWidth, shoulder]];
    const frontPoints = profile.map(([s, y]) => [southX + s, y, southZ + front] as Vec3), backPoints = profile.map(([s, y]) => [southX + s, y, southZ + back] as Vec3);
    for (const indices of [[0, 1, 4, 5], [1, 2, 3, 4]]) {
      face(target, indices.map((i) => frontPoints[i]!), [0, 0, 1]);
      face(target, indices.map((i) => backPoints[i]!).reverse(), [0, 0, -1]);
    }
    for (let i = 0; i < profile.length; i += 1) {
      const j = (i + 1) % profile.length;
      face(target, [backPoints[i]!, backPoints[j]!, frontPoints[j]!, frontPoints[i]!]);
    }
  };
  const gabledNorth = (target: BatchData, halfWidth: number, back: number, front: number, shoulder: number, peak: number, bottomY: number) => {
    const profile: [number, number][] = [[-halfWidth, bottomY], [0, bottomY], [halfWidth, bottomY],
      [halfWidth, shoulder], [0, peak], [-halfWidth, shoulder]];
    const frontPoints = profile.map(([s, y]) => [northX + s, y, northZ - front] as Vec3), backPoints = profile.map(([s, y]) => [northX + s, y, northZ - back] as Vec3);
    // The fan order runs the other way so the winding agrees with the
    // north-facing normals, and the side quads mirror too, so the shared
    // edges keep their reverse partners.
    for (const indices of [[5, 4, 1, 0], [4, 3, 2, 1]]) {
      face(target, indices.map((i) => frontPoints[i]!), [0, 0, -1]);
      face(target, indices.map((i) => backPoints[i]!).reverse(), [0, 0, 1]);
    }
    for (let i = 0; i < profile.length; i += 1) {
      const j = (i + 1) % profile.length;
      face(target, [backPoints[j]!, backPoints[i]!, frontPoints[i]!, frontPoints[j]!]);
    }
  };
  const tierRunSouth = (front: number, halfWidth: number): Run => ({
    length: halfWidth * 2,
    pieces: () => 1,
    at: (s, offset = 0) => [southX - halfWidth + s, southZ + front + offset] as Vec2,
    normal: () => [0, 1] as Vec2,
  });
  const tierRunNorth = (front: number, halfWidth: number): Run => ({
    length: halfWidth * 2,
    pieces: () => 1,
    // Travel west so the frame's handedness matches the south run: the
    // sloped-box helper's quad orders assume normal × tangent = +y.
    at: (s, offset = 0) => [northX + halfWidth - s, northZ - front - offset] as Vec2,
    normal: () => [0, -1] as Vec2,
  });
  const decorateTier = (run: Run, halfWidth: number, shoulder: number, peak: number, side: number) => {
    const heightAt = (s: number) => shoulder + (peak - shoulder) * (1 - Math.abs(s - halfWidth) / halfWidth);
    const bays = Math.max(1, Math.round(halfWidth * 2 / 3.4));
    const width = halfWidth * 2 / bays;
    for (let row = 1; row <= h.floors; row += 1) {
      const bottom = Math.max((row - 1) * pitch, 0.9), top = row * pitch;
      if (bottom >= shoulder) break;
      const ceiling = Math.min(top, shoulder);
      for (let bay = 0; bay < bays; bay += 1) {
        const from = bay * width + 0.35, to = (bay + 1) * width - 0.35;
        // The V profile is linear per side, so a bay straddling the peak
        // splits there; a bay straddling the row ceiling flattens to its
        // lower end. Both keep the pane's top face planar.
        const segments: [number, number][] = from <= halfWidth && to >= halfWidth ? [[from, halfWidth], [halfWidth, to]] : [[from, to]];
        for (const [a, b] of segments) {
          let h0 = Math.min(ceiling, heightAt(a) - 0.25), h1 = Math.min(ceiling, heightAt(b) - 0.25);
          if ((h0 < ceiling - 0.01) !== (h1 < ceiling - 0.01)) h0 = h1 = Math.min(h0, h1);
          sloped(paneTone(row, bay, side), run, a, b, bottom + 0.3, h0, h1, 0.005, 0.025);
        }
      }
    }
  };
  gabled(tiers, 17, -0.01, 0.6, h.middleShoulder, h.middlePeak, 0.25);
  gabled(tiers, 13.6, 0.59, 1.2, h.lowerShoulder, h.lowerPeak, 0.27);
  decorateTier(tierRunSouth(0.6, 17), 17, h.middleShoulder, h.middlePeak, 3);
  decorateTier(tierRunSouth(1.2, 13.6), 13.6, h.lowerShoulder, h.lowerPeak, 4);
  gabledNorth(tiers, 17, -0.01, 0.6, h.middleShoulder, h.middlePeak, 0.29);
  gabledNorth(tiers, 13.6, 0.59, 1.2, h.lowerShoulder, h.lowerPeak, 0.31);
  decorateTier(tierRunNorth(0.6, 17), 17, h.middleShoulder, h.middlePeak, 3);
  decorateTier(tierRunNorth(1.2, 13.6), 13.6, h.lowerShoulder, h.lowerPeak, 4);

  // The pyramid crown: four dark facets from the mapped eave to the peak,
  // closed against the shaft's roof. The mapped outline's sub-meter tracing
  // jogs make its tiny facets nearly coplanar with their neighbours, which
  // the coplanar check flags on the band reliefs, so the crown's rim drops
  // vertices within 1.2 m of the chord between their neighbours; the shaft
  // keeps the mapped outline exactly.
  const rimRing = ground.map((run) => run.at(0));
  const crownRim = [...rimRing];
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (let i = 0; i < crownRim.length; i += 1) {
      const a = crownRim[(i - 1 + crownRim.length) % crownRim.length]!;
      const b = crownRim[(i + 1) % crownRim.length]!;
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const p = crownRim[i]!;
      if (chord < 1e-9 || (Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / chord < 1.2 && crownRim.length > 4)) {
        crownRim.splice(i, 1);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  const rim: Vec3[] = crownRim.map(([x, z]) => [x, h.eave, z] as Vec3);
  const apex: Vec3 = [center[0], h.peak, center[1]];
  for (let i = 0; i < rim.length; i += 1) {
    const j = (i + 1) % rim.length;
    const n = normal(apex, rim[i]!, rim[j]!);
    kit.triangle(roof, [apex, rim[i]!, rim[j]!], [n, n, n]);
    kit.triangle(roof, [apex, rim[j]!, rim[i]!], [n.map((v) => -v) as Vec3, n.map((v) => -v) as Vec3, n.map((v) => -v) as Vec3]);
    // Silver bands and dark louvers, following the fitted model's crown: the
    // blades sit in the dark opening below each band. Strips are built
    // directly from the ridge parametrization, because two half-plane clips
    // of the facet triangle would zigzag the corner order and fold the fan.
    const atHeight = (ridgeEnd: Vec3, y: number): Vec3 => {
      const t = (apex[1] - y) / (apex[1] - ridgeEnd[1]);
      return ridgeEnd.map((v, axis) => apex[axis]! + (v - apex[axis]!) * t) as Vec3;
    };
    // The strip winds with the facet: down the first ridge, along the strip's
    // foot, and up the second ridge, so the front face needs no flip and its
    // edges pair with the side faces.
    const stripBetween = (y0: number, y1: number): Vec3[] => [atHeight(rim[i]!, y1), atHeight(rim[i]!, y0), atHeight(rim[j]!, y0), atHeight(rim[j]!, y1)];
    for (let y = h.eave + 3; y < h.peak - 6; y += 7.5) {
      relief(bands, stripBetween(y + 1.6, y + 7.3), n, 0.5);
      for (const dy of [0.5, 1.15]) {
        relief(louvers, stripBetween(y + dy, y + dy + 0.25), n, 0.16, 0.1);
      }
    }
  }

  // The tapered spire: four bright faces with inset panels and a closed foot
  // seated in the pyramid below the peak.
  const spireHalf = 1.2, footY = h.peak - 4;
  const foot: Vec3[] = [[center[0] - spireHalf, footY, center[1] + spireHalf], [center[0] + spireHalf, footY, center[1] + spireHalf], [center[0] + spireHalf, footY, center[1] - spireHalf], [center[0] - spireHalf, footY, center[1] - spireHalf]];
  const tip: Vec3 = [center[0], h.tip, center[1]];
  for (let i = 0; i < 4; i += 1) {
    const polygon = [foot[i]!, foot[(i + 1) % 4]!, tip], n = normal(polygon[0]!, polygon[1]!, polygon[2]!);
    face(spire, polygon, n);
    const middle = foot[i]!.map((v, k) => (v + foot[(i + 1) % 4]![k]!) / 2) as Vec3;
    const inset: Vec3[] = [foot[i]!, foot[(i + 1) % 4]!].map((p) => p.map((v, k) => middle[k]! + (v - middle[k]!) * 0.62) as Vec3);
    const panelTip = tip.map((v, k) => v + (middle[k]! - v) * 0.13) as Vec3;
    for (const [lo, hi] of [[h.peak + 0.5, h.peak + 6], [h.peak + 6.5, h.peak + 12.5]] as [number, number][]) {
      const section = clipY(clipY([...inset, panelTip], lo, true), hi, false);
      if (section.length >= 3) relief(spirePanels, section, n, 0.025, 0.02);
    }
  }
  kit.slab(spire, [[center[0] - spireHalf, center[1] + spireHalf], [center[0] + spireHalf, center[1] + spireHalf], [center[0] + spireHalf, center[1] - spireHalf], [center[0] - spireHalf, center[1] - spireHalf]], footY, false);

  const model = kit.finish({ height: h.tip, outlines: [stone, tiers, roof, spire], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: 64, source: "docs/two-prudential-geographic-reference.md" };
  return model;
}
