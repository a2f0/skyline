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
  return (seed >>> 0) / 4294967296;
}

const architectural = new Set<MaterialName>(["lamp", "crown lights", "band lights", "sign letters", "cap lights"]);

// The building kit emits each pane as a six-vertex quad. Reuse those exact surfaces;
// never turn a generic glass shell, spandrel, masonry face or roof into a light source.
// Adjacent bays share a floor/room seed, so offices come on in small groups. Identity
// depends on local geometry and building ID, not load order, camera or slider direction.
export function nightWindowMask(geometry: THREE.BufferGeometry, buildingId: string, materialOf: (vertex: number) => MaterialName): Float32Array {
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const mask = new Float32Array(positions.count * 4);
  for (let first = 0; first < positions.count; first += 6) {
    const end = Math.min(first + 6, positions.count);
    let x = 0, y = 0, z = 0;
    for (let vertex = first; vertex < end; vertex += 1) {
      x += positions.getX(vertex); y += positions.getY(vertex); z += positions.getZ(vertex);
    }
    const count = end - first;
    const floor = Math.round(y / count / 3.4), bay = Math.floor((x + z) / count / 7);
    const room = hash(`${buildingId}:${floor}:${bay}`);
    const brightness = hash(`${buildingId}:${floor}:${bay}:brightness`);
    for (let vertex = first; vertex < end; vertex += 1) {
      const name = materialOf(vertex), crown = architectural.has(name);
      const window = name === "lit window" || name === "dim window";
      if (!crown && (!window || Math.abs(normals.getY(vertex)) > 0.5)) continue;
      const rank = name === "lit window" ? 0.05 + room * 0.8 : 0.3 + room * 0.75;
      mask.set([rank, crown ? 0.3 : 0.25 + brightness * 0.45, crown ? 2 : 1, brightness], vertex * 4);
    }
  }
  return mask;
}
