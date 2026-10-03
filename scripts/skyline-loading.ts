// Bake the mapped buildings' flat elevation into the loading markup. This runs only
// when the skyline changes: the loading animation needs no JS, model imports or fetches.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "../vendor/three-r186.js";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { createGeographicBuilding } from "../models/skyline-geography.js";
import { skylineAzimuth } from "../skyline-comparison.js";
import { command } from "./lib/command.js";

type Point = [number, number];

// Keep roof slopes and vertical steps while removing subpixel facade detail. Distance
// is to the line segment, so even a very narrow antenna retains its tip.
function simplify(points: Point[], tolerance: number): Point[] {
  const first = points[0]!, last = points[points.length - 1]!;
  const dx = last[0] - first[0], dy = last[1] - first[1], length = dx * dx + dy * dy;
  let farthest = tolerance * tolerance, split = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i]!;
    const t = length ? Math.max(0, Math.min(1, ((x - first[0]) * dx + (y - first[1]) * dy) / length)) : 0;
    const distance = (x - first[0] - t * dx) ** 2 + (y - first[1] - t * dy) ** 2;
    if (distance > farthest) { farthest = distance; split = i; }
  }
  if (!split) return [first, last];
  return [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)];
}

export function skylineTrace(buildings: THREE.Object3D[], azimuth: number): string {
  const meshes: { points: Float64Array; index: THREE.BufferAttribute | null }[] = [];
  const rightX = Math.cos(azimuth), rightZ = -Math.sin(azimuth);
  let left = Infinity, right = -Infinity, top = 0;
  for (const building of buildings) {
    building.updateMatrixWorld(true);
    building.traverseVisible((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.getAttribute("position"), vertex = new THREE.Vector3();
      const points = new Float64Array(positions.count * 2);
      for (let i = 0; i < positions.count; i += 1) {
        vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        // Orthographic, level elevation: no depth scaling, camera pitch or ground plane.
        const x = vertex.x * rightX + vertex.z * rightZ, y = Math.max(0, vertex.y);
        points[i * 2] = x;
        points[i * 2 + 1] = y;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.max(top, y);
      }
      meshes.push({ points, index: mesh.geometry.index });
    });
  }
  if (!(right > left && top > 0)) throw new Error("The skyline has no visible building geometry.");

  // Sample the upper envelope of every triangle edge. Endpoints also enter their
  // nearest column so a spire narrower than one sample cannot disappear. The tallest
  // surface at each x wins, eliminating all internal and overlapping building edges.
  const columns = 4096, step = (right - left) / columns, heights = new Float64Array(columns + 1);
  function edge(ax: number, ay: number, bx: number, by: number) {
    if (ax > bx) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }
    const a = (ax - left) / step, b = (bx - left) / step;
    const ai = Math.round(a), bi = Math.round(b);
    heights[ai] = Math.max(heights[ai]!, ay);
    heights[bi] = Math.max(heights[bi]!, by);
    if (b === a) return;
    for (let i = Math.ceil(a); i <= Math.floor(b); i += 1) {
      heights[i] = Math.max(heights[i]!, ay + (by - ay) * (i - a) / (b - a));
    }
  }
  for (const { points, index } of meshes) {
    const count = index ? index.count : points.length / 2;
    for (let i = 0; i < count; i += 3) {
      const a = (index ? index.getX(i) : i) * 2;
      const b = (index ? index.getX(i + 1) : i + 1) * 2;
      const c = (index ? index.getX(i + 2) : i + 2) * 2;
      edge(points[a]!, points[a + 1]!, points[b]!, points[b + 1]!);
      edge(points[b]!, points[b + 1]!, points[c]!, points[c + 1]!);
      edge(points[c]!, points[c + 1]!, points[a]!, points[a + 1]!);
    }
  }
  const width = 1000, margin = 24, scale = (width - 2 * margin) / (right - left);
  const baseline = top * scale + 16;
  const points: Point[] = [[0, baseline], [margin, baseline]];
  heights.forEach((height, i) => { points.push([margin + i / columns * (width - 2 * margin), baseline - height * scale]); });
  points.push([width - margin, baseline], [width, baseline]);
  const number = (n: number) => Number(n.toFixed(2));
  const d = simplify(points, 0.3).map(([x, y], i) => `${i ? "L" : "M"}${number(x)} ${number(y)}`).join(" ");
  return `<svg class="skyline-trace" viewBox="0 0 ${width} ${number(baseline + 16)}" aria-hidden="true" focusable="false">
          <defs><path id="skyline-loading-outline" pathLength="1" d="${d}" /></defs>
          <use class="skyline-trace-rail" href="#skyline-loading-outline" />
          <use class="skyline-trace-line" href="#skyline-loading-outline" />
          <use class="skyline-trace-tip" href="#skyline-loading-outline" />
        </svg>`;
}

if (import.meta.main) command("Usage: bun scripts/skyline-loading.ts [--check]\n  Refreshes the loading silhouette in skyline-3d.html from the mapped buildings.", { check: { type: "boolean" } }, ({ values, positionals }) => {
  if (positionals.length) throw new Error("This command takes only --check or --help.");
  const filename = path.resolve(import.meta.dirname, "../skyline-3d.html");
  const source = readFileSync(filename, "utf8");
  const marker = /(?<=<!-- skyline-loading:start -->)[\s\S]*?(?=<!-- skyline-loading:end -->)/;
  if (!marker.test(source)) throw new Error("skyline-3d.html is missing its loading silhouette markers.");
  const buildings = geographicBuildings.map((record) => createGeographicBuilding(record).building);
  const updated = source.replace(marker, `\n        ${skylineTrace(buildings, skylineAzimuth)}\n        `);
  if (values["check"]) {
    if (updated !== source) throw new Error("The loading silhouette is out of date; run bun scripts/skyline-loading.ts.");
    console.log(`PASS: loading silhouette matches ${buildings.length} mapped buildings.`);
  } else {
    writeFileSync(filename, updated);
    console.log(`Refreshed the loading silhouette from ${buildings.length} mapped buildings.`);
  }
});
