// The colour trial's daytime panorama, Chicago.jpg in its 3840 × 551 px rendition, fitted to the
// mapped buildings; scripts/panorama-owners.ts prints what this finds. The panorama is
// cylindrical: a column is linear in bearing from the photographer's eye, and a row linear in the
// tangent of elevation. The fit starts from the drawing's fitted eye, which stands at nearly the
// same spot, and finds the eye and both lines that best match tower silhouettes read against the
// sky, Michigan Avenue corners and roof rows. Each pixel then goes to the nearest mapped building
// part a ray from the eye meets, every part a prism from its bottom to its top, with the outward
// bearing of the face it meets: 90° is an east front, 180° a south face.
import { geographicBuildings } from "../../src/models/skyline-geography-data.js";
import { projectGround } from "../../src/models/skyline-geography.js";

export type Vec2 = [number, number];
interface Prism { building: string; ring: Vec2[]; bottom: number; top: number }

// The drawing's fitted eye (src/skyline-scene.ts), metres east and north of Crain's mapped centre.
export const drawingEye: Vec2 = [1471.76, -1948.8];
// Silhouettes against the sky: a building, a row, and its left and right edges in that row, where
// the colour first leaves the sky walking in from open sky on either side. One Prudential's right
// edge meets Two Prudential's, so only its left is read.
const silhouettes: [building: string, row: number, left: number | null, right: number | null][] = [
  ["layer3", 200, 1810, 1886.5],
  ["layer3", 260, 1809.5, 1886.5],
  ["building-trump-tower-only", 260, 1687.5, 1730.5],
  ["building-trump-tower-only", 290, 1687.5, 1730.5],
  ["building-heritage-at-millennium-park", 320, 1468.5, 1516.5],
  ["building-340-on-the-park", 275, 1994.5, 2062.5],
  ["building-one-prudential-plaza", 322, 1665.5, null],
];
// Michigan Avenue corners: the column where a building's sunlit south face meets its shaded east
// front, the strongest drop in median brightness across the visible rows. They tie the fit to the
// near wall the towers above leave to extrapolation.
const corners: [building: string, row: number, column: number][] = [
  ["building-railway-exchange", 435, 1085.5],
  ["building-peoples-gas", 432, 1206.5],
  ["building-university-club", 450, 1318.5],
  ["building-six-north-far-east", 437, 1464.5],
];
// Roof rows read by eye in the rendition, for buildings whose roof edge stands clear.
const roofs: [building: string, row: number][] = [
  ["building-railway-exchange", 403],
  ["building-crain-communications", 330],
  ["building-one-prudential-plaza", 321],
  ["layer3", 150],
];

// Every mapped part as a prism; a building mapped without parts is its footprint to its height.
const prisms: Prism[] = geographicBuildings.flatMap((record) => {
  const parts = record.parts.length ? record.parts : [{ coordinates: record.footprint.coordinates, bottom: 0, top: record.height }];
  return parts.map((part) => ({ building: record.id, ring: part.coordinates.map(projectGround), bottom: part.bottom, top: part.top }));
});
export const records = new Map(geographicBuildings.map((record) => [record.id, record]));
const toRadians = Math.PI / 180;

// Where a ray from the eye along a bearing first meets a ring: its distance and the met face's
// outward bearing, or null.
export function meet(ring: Vec2[], eye: Vec2, bearing: number): [distance: number, facing: number] | null {
  const direction: Vec2 = [Math.sin(bearing * toRadians), Math.cos(bearing * toRadians)];
  let nearest: [number, number] | null = null;
  for (let i = 0; i < ring.length; i += 1) {
    const p = [ring[i]![0] - eye[0], ring[i]![1] - eye[1]], q = ring[(i + 1) % ring.length]!, edge = [q[0] - ring[i]![0], q[1] - ring[i]![1]];
    const denominator = direction[0] * edge[1]! - direction[1] * edge[0]!;
    if (Math.abs(denominator) < 1e-9) continue;
    const t = (p[0]! * edge[1]! - p[1]! * edge[0]!) / denominator, s = (p[0]! * direction[1] - p[1]! * direction[0]) / denominator;
    if (t <= 1 || s < 0 || s > 1 || (nearest && t >= nearest[0])) continue;
    // The face's normal toward the eye.
    let normal = [edge[1]!, -edge[0]!];
    if (normal[0]! * direction[0] + normal[1]! * direction[1] > 0) normal = [-normal[0]!, -normal[1]!];
    nearest = [t, (Math.atan2(normal[0]!, normal[1]!) / toRadians + 360) % 360];
  }
  return nearest;
}

const bearingOf = (point: Vec2, eye: Vec2) => Math.atan2(point[0] - eye[0], point[1] - eye[1]) / toRadians;
const nearestDistance = (rings: Vec2[][], eye: Vec2) => Math.min(...rings.flat().map((point) => Math.hypot(point[0] - eye[0], point[1] - eye[1])));

// Least squares for y = a + b x.
export function line(points: [number, number][]): [number, number] {
  const n = points.length, sx = points.reduce((s, [x]) => s + x, 0), sy = points.reduce((s, [, y]) => s + y, 0);
  const sxx = points.reduce((s, [x]) => s + x * x, 0), sxy = points.reduce((s, [x, y]) => s + x * y, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return [(sy - b * sx) / n, b];
}

export interface Fit { eye: Vec2; a: number; b: number; c: number; d: number; residuals: { label: string; value: number }[]; rms: number }

// The row line through the roofs, seen from an eye: [offset, scale], and each roof's point.
function rowFit(eye: Vec2): { line: [number, number]; points: [number, number][] } {
  const points = roofs.map(([building, row]) => {
    // The parts reaching the roof's height, or, where the roof stands above every part, the footprint.
    const record = records.get(building)!, parts = prisms.filter((prism) => prism.building === building && prism.top >= record.height - 0.5);
    const rings = parts.length ? parts.map((prism) => prism.ring) : [record.footprint.coordinates.map(projectGround)];
    return [(record.height - 2) / nearestDistance(rings, eye), row] as [number, number];
  });
  return { line: line(points), points };
}

// The fit: the eye on a 10 m grid within 400 m of the drawing's, and for each eye the row line
// through the roofs and the column line through the silhouettes and corners, whose rows' heights
// come from that row line, so the parts spanning a row are the ones whose edges it shows; a corner
// is its parts' south-east vertex. Bearings and roofs together fix the eye, which minimises both
// residuals.
export function fitPanorama(): Fit {
  let best: Fit | undefined;
  for (let dx = -400; dx <= 400; dx += 10) {
    for (let dy = -400; dy <= 400; dy += 10) {
      const eye: Vec2 = [drawingEye[0] + dx, drawingEye[1] + dy], rows = rowFit(eye), [c, d] = rows.line;
      const points: [number, number][] = [], labels: string[] = [];
      // The parts a building shows at a row: those spanning the row's height at its distance.
      const partsAt = (building: string, row: number) => {
        const parts = prisms.filter((prism) => prism.building === building);
        const height = 2 + (row - c) / d * nearestDistance(parts.map((prism) => prism.ring), eye);
        const spanning = parts.filter((prism) => prism.bottom <= height && height <= prism.top);
        return spanning.length ? spanning : parts;
      };
      for (const [building, row, left, right] of silhouettes) {
        const bearings = partsAt(building, row).flatMap((prism) => prism.ring.map((point) => bearingOf(point, eye)));
        if (left !== null) { points.push([Math.min(...bearings), left]); labels.push(`${building} left at row ${row}`); }
        if (right !== null) { points.push([Math.max(...bearings), right]); labels.push(`${building} right at row ${row}`); }
      }
      for (const [building, row, column] of corners) {
        const vertex = partsAt(building, row).flatMap((prism) => prism.ring).reduce((p, q) => (q[0] - q[1] > p[0] - p[1] ? q : p));
        points.push([bearingOf(vertex, eye), column]); labels.push(`${building} corner at row ${row}`);
      }
      const [a, b] = line(points);
      const residuals = [
        ...points.map(([x, y], i) => ({ label: labels[i]!, value: a + b * x - y })),
        ...rows.points.map(([x, y], i) => ({ label: `${roofs[i]![0]} roof`, value: c + d * x - y })),
      ];
      const rms = Math.sqrt(residuals.reduce((sum, { value }) => sum + value * value, 0) / residuals.length);
      if (!best || rms < best.rms) best = { eye, a, b, c, d, residuals, rms };
    }
  }
  return best!;
}

// Each pixel's owner and face bearing, over columns x0..x1 and rows 0..height.
export function owners(fit: Fit, x0: number, x1: number, height: number) {
  const owner: (string | null)[][] = Array.from({ length: height }, () => new Array(x1 - x0).fill(null));
  const facing: number[][] = Array.from({ length: height }, () => new Array(x1 - x0).fill(0));
  const depth: number[][] = Array.from({ length: height }, () => new Array(x1 - x0).fill(Infinity));
  for (let x = x0; x < x1; x += 1) {
    const bearing = (x + 0.5 - fit.a) / fit.b;
    for (const prism of prisms) {
      const hit = meet(prism.ring, fit.eye, bearing);
      if (!hit) continue;
      const [distance, face] = hit;
      const top = Math.max(0, Math.floor(fit.c + fit.d * (prism.top - 2) / distance + 0.5)), bottom = Math.min(height, Math.floor(fit.c + fit.d * (prism.bottom - 2) / distance + 0.5));
      for (let y = top; y < bottom; y += 1) {
        if (depth[y]![x - x0]! <= distance) continue;
        depth[y]![x - x0] = distance; owner[y]![x - x0] = prism.building; facing[y]![x - x0] = face;
      }
    }
  }
  return { owner, facing };
}

// The share of a box's pixels (x0, y0, x1, y1, half-open) a building owns on a face within 20°,
// from an owners() result over columns from x0 on.
export function boxShare(map: ReturnType<typeof owners>, mapX0: number, building: string, face: number, [bx0, by0, bx1, by1]: [number, number, number, number]): number {
  let owned = 0;
  for (let y = by0; y < by1; y += 1) for (let x = bx0; x < bx1; x += 1) {
    const turn = Math.abs(((map.facing[y]![x - mapX0]! - face) % 360 + 540) % 360 - 180);
    if (map.owner[y]![x - mapX0] === building && turn < 20) owned += 1;
  }
  return owned / ((bx1 - bx0) * (by1 - by0));
}
