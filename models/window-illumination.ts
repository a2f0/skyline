import * as THREE from "../vendor/three-r186.js";
import { celebrations, windowWord } from "./celebrations.js";
import type { CelebrationId } from "./celebrations.js";

export interface WindowCell {
  vertex: number;
  column: number;
  floor: number;
}
export interface WindowIllumination {
  readonly active: CelebrationId | null;
  readonly litWindows: number;
  set(active: CelebrationId | null): void;
}

// Reuse the actual glass triangles. The emission mask changes neither the
// silhouette nor depth/hover ownership, and needs no overlay or extra draw call.
export function createWindowIllumination(geometry: THREE.BufferGeometry, material: THREE.MeshToonMaterial, cells: readonly WindowCell[], columns: number, lineTopFloors: readonly number[]): WindowIllumination {
  const colors = geometry.getAttribute("color");
  const original = new Float32Array(colors.array);
  const emission = new THREE.Float32BufferAttribute(new Float32Array(colors.count), 1);
  geometry.setAttribute("windowLight", emission);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float windowLight;\nvarying float vWindowLight;\n${shader.vertexShader}`
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWindowLight = windowLight;");
    shader.fragmentShader = `varying float vWindowLight;\n${shader.fragmentShader}`
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(vWindowLight);");
  };
  material.customProgramCacheKey = () => "skyline-window-illumination-v1";
  let active: CelebrationId | null = null, litWindows = 0;
  const available = new Set(cells.map((cell) => `${cell.column}:${cell.floor}`));
  const masks = new Map(celebrations.map((preset) => {
    const lit = new Set<string>();
    preset.lines.forEach((word, line) => {
      const rows = windowWord(word), width = rows[0]!.length;
      if (width > columns - 2) throw new Error(`${word} does not fit the facade`);
      const left = Math.floor((columns - width) / 2);
      const top = lineTopFloors[line];
      if (top === undefined) throw new Error(`No facade zone for message line ${line + 1}`);
      rows.forEach((row, down) => [...row].forEach((pixel, across) => {
        if (pixel === "1") lit.add(`${left + across}:${top - down}`);
      }));
    });
    // Refuse a layout which silently drops letters into missing window cells.
    for (const key of lit) if (!available.has(key)) throw new Error(`Missing celebration window: ${key}`);
    return [preset.id, lit] as const;
  }));
  return {
    get active() { return active; },
    get litWindows() { return litWindows; },
    set(next) {
      const lit = next === null ? undefined : masks.get(next);
      if (next !== null && !lit) throw new Error(`Unknown celebration: ${next}`);
      active = next;
      litWindows = lit?.size ?? 0;
      colors.array.set(original);
      emission.array.fill(0);
      if (lit) for (const cell of cells) {
        const on = lit.has(`${cell.column}:${cell.floor}`);
        for (let vertex = cell.vertex; vertex < cell.vertex + 6; vertex += 1) {
          // Closed shades darken only the message face's office glass.
          colors.setXYZ(vertex, 0.018, 0.018, 0.018);
          emission.setX(vertex, on ? 1 : 0);
        }
      }
      colors.needsUpdate = emission.needsUpdate = true;
    },
  };
}
