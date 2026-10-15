import type * as THREE from "../vendor/three-r186.js";
import type { MaterialName } from "./colour-materials.js";

export interface NightLighting {
  /** Sunset/dawn transition, from daylight (0) to full darkness (1). */
  darkness: number;
  /** Illustrative occupancy, not a record of actual tenants or working hours. */
  activity: number;
  /** Unlit drawing outlines must dim with the surrounding architecture. */
  outlineStrength: number;
}

export const smooth = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

// A continuous daily cycle: busy evenings, a few overnight rooms, then early arrivals.
// Midnight shares the same curve from either side, including when scrubbing backwards.
export function windowActivity(hour: number): number {
  const late = hour < 12 ? hour + 24 : hour;
  return 0.76 - 0.52 * smooth(21, 26, late) + 0.3 * smooth(29, 32, late) + (hour < 12 ? 0.22 * smooth(8, 12, hour) : 0);
}

function hash(value: string) {
  let seed = 2166136261;
  for (const character of value) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  // Avalanche adjacent room keys: plain FNV leaves trailing bay digits correlated,
  // making a whole east-facing floor turn on together instead of small room groups.
  seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
  seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
  seed ^= seed >>> 16;
  return (seed >>> 0) / 4294967296;
}

const architectural = new Set<MaterialName>(["lamp", "crown lights", "band lights", "sign letters", "cap lights"]);

// The building kit emits panes as paired triangles, interspersed with standalone
// triangles for other features. Find shared edges rather than assuming quad alignment.
// Reuse those exact surfaces;
// never turn a generic glass shell, spandrel, masonry face or roof into a light source.
// Adjacent bays share a floor/room seed, so offices come on in small groups. Identity
// depends on local geometry and building ID, not load order, camera or slider direction.
export function nightWindowMask(geometry: THREE.BufferGeometry, buildingId: string, materialOf: (vertex: number) => MaterialName): Float32Array {
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const mask = new Float32Array(positions.count * 4);
  const samePoint = (a: number, b: number) => positions.getX(a) === positions.getX(b) && positions.getY(a) === positions.getY(b) && positions.getZ(a) === positions.getZ(b);
  for (let first = 0; first < positions.count;) {
    const name = materialOf(first), crown = architectural.has(name);
    const window = name === "lit window" || name === "dim window";
    if (!crown && (!window || Math.abs(normals.getY(first)) > 0.5)) { first += 3; continue; }
    let count = 3;
    if (first + 6 <= positions.count && materialOf(first + 3) === name
      && normals.getX(first) === normals.getX(first + 3) && normals.getY(first) === normals.getY(first + 3) && normals.getZ(first) === normals.getZ(first + 3)) {
      let shared = 0;
      for (let a = first; a < first + 3; a += 1) {
        for (let b = first + 3; b < first + 6; b += 1) if (samePoint(a, b)) { shared += 1; break; }
      }
      if (shared === 2) count = 6;
    }
    const end = first + count;
    let x = 0, y = 0, z = 0;
    for (let vertex = first; vertex < end; vertex += 1) {
      x += positions.getX(vertex); y += positions.getY(vertex); z += positions.getZ(vertex);
    }
    const floor = Math.round(y / count / 3.4), across = Math.floor(x / count / 7), depth = Math.floor(z / count / 7);
    const room = hash(`${buildingId}:${floor}:${across}:${depth}`);
    const brightness = hash(`${buildingId}:${floor}:${across}:${depth}:brightness`);
    for (let vertex = first; vertex < end; vertex += 1) {
      if (materialOf(vertex) !== name) continue;
      const rank = name === "lit window" ? 0.05 + room * 0.8 : 0.3 + room * 0.75;
      mask[vertex * 4] = rank;
      mask[vertex * 4 + 1] = crown ? 0.3 : 0.25 + brightness * 0.45;
      mask[vertex * 4 + 2] = crown ? 2 : 1;
      mask[vertex * 4 + 3] = brightness;
    }
    first = end;
  }
  return mask;
}
