// Bake the mapped buildings' flat elevation into the loading markup, and into the outline the
// shell paints at mount (src/skyline-boot-outline.ts). This runs only when the skyline changes:
// neither loading animation needs model imports or fetches.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "../../src/vendor/three-r186.js";
import { geographicBuildings } from "../../src/models/skyline-geography-data.js";
import { createGeographicBuilding } from "../../src/models/skyline-geography.js";
import { skylineAzimuth } from "../../src/skyline-comparison.js";
import { command } from "../lib/command.js";

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

/** The elevation's simplified outline, in a 1000-wide view box ending at the ground line. */
export interface SkylineOutline { width: number; height: number; points: Point[] }

export function skylineOutline(buildings: THREE.Object3D[], azimuth: number): SkylineOutline {
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
  // End the view box at the ground line so bottom alignment touches the toolbar,
  // regardless of how tall future buildings make the skyline.
  return { width, height: baseline, points: simplify(points, 0.3) };
}

const number = (n: number) => Number(n.toFixed(2));

export function skylineTrace(buildings: THREE.Object3D[], azimuth: number): string {
  const { width, height, points } = skylineOutline(buildings, azimuth);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${number(x)} ${number(y)}`).join(" ");
  return `<svg class="skyline-trace" viewBox="0 0 ${width} ${number(height)}" aria-hidden="true" focusable="false">
          <defs><path id="skyline-loading-outline" pathLength="1" d="${d}" /></defs>
          <use class="skyline-trace-rail" href="#skyline-loading-outline" />
          <use class="skyline-trace-line" href="#skyline-loading-outline" />
          <use class="skyline-trace-tip" href="#skyline-loading-outline" />
        </svg>`;
}

/**
 * The same outline as a compact path for the shell, which hosts bundle: coordinates rounded to
 * a tenth of a unit, under a tenth of a pixel at any size the shell draws it, and relative
 * steps measured between the rounded points, so rounding never accumulates.
 */
export function compactPath(points: Point[]): string {
  const tenths = points.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)] as const);
  const format = (value: number) => String(value / 10).replace(/^(-?)0\./, "$1.");
  const pair = (a: number, b: number) => `${format(a)}${b < 0 ? "" : " "}${format(b)}`;
  let d = `M${pair(tenths[0]![0], tenths[0]![1])}`;
  for (let i = 1; i < tenths.length; i += 1) {
    const dx = tenths[i]![0] - tenths[i - 1]![0], dy = tenths[i]![1] - tenths[i - 1]![1];
    if (!dx && !dy) continue;
    d += !dy ? `h${format(dx)}` : !dx ? `v${format(dy)}` : `l${pair(dx, dy)}`;
  }
  return d;
}

export function bootOutlineModule({ width, height, points }: SkylineOutline): string {
  return `// Generated by scripts/checks/skyline-loading.ts from the mapped buildings: the level skyline
// elevation the shell paints while a viewer loads (skyline-boot.ts). After changing a building,
// run that script; \`bun run check\` fails while this is stale.
export const bootOutline = { width: ${width}, height: ${number(height)}, d: "${compactPath(points)}" } as const;
`;
}

if (import.meta.main) command("Usage: bun scripts/checks/skyline-loading.ts [--check]\n  Refreshes the loading silhouette in src/skyline-3d.html and src/skyline-boot-outline.ts from the mapped buildings.", { check: { type: "boolean" } }, ({ values, positionals }) => {
  if (positionals.length) throw new Error("This command takes only --check or --help.");
  const filename = path.resolve(import.meta.dirname, "../../src/skyline-3d.html");
  const bootFilename = path.resolve(import.meta.dirname, "../../src/skyline-boot-outline.ts");
  const source = readFileSync(filename, "utf8");
  const bootSource = (() => { try { return readFileSync(bootFilename, "utf8"); } catch { return ""; } })();
  const marker = /(?<=<!-- skyline-loading:start -->)[\s\S]*?(?=<!-- skyline-loading:end -->)/;
  if (!marker.test(source)) throw new Error("skyline-3d.html is missing its loading silhouette markers.");
  const buildings = geographicBuildings.map((record) => createGeographicBuilding(record).building);
  const updated = source.replace(marker, `\n        ${skylineTrace(buildings, skylineAzimuth)}\n        `);
  const bootUpdated = bootOutlineModule(skylineOutline(buildings, skylineAzimuth));
  if (values["check"]) {
    if (updated !== source || bootUpdated !== bootSource) throw new Error("The loading silhouette is out of date; run bun scripts/checks/skyline-loading.ts.");
    console.log(`PASS: loading silhouettes match ${buildings.length} mapped buildings.`);
  } else {
    writeFileSync(filename, updated);
    writeFileSync(bootFilename, bootUpdated);
    console.log(`Refreshed the loading silhouettes from ${buildings.length} mapped buildings.`);
  }
});
