// Solves the geographic layout's skyline camera: the study's own orbit camera, looking at
// the centre of the drawing's frame, whose projection of the mapped points in
// tests/skyline-landmarks.ts best matches their drawn positions. It prints the eye,
// azimuth, polar angle, and the frame's vertical field of view that skyline-comparison.ts
// records, with each landmark's residual in layer units. The eye's height is held at
// the photograph's shore level because the drawing barely constrains it: a camera
// hovering over the harbour on a shorter lens fits the traced heights a little better,
// but it is not where the photograph was taken. --eye holds its ground position too, for
// the same reason: the drawing trades the eye's distance against the lens, so a free eye
// can drift off the lakefront walk for a fraction of a layer unit.
import { command } from "./lib/command.js";
import { geographicLandmarks, reference } from "../tests/skyline-landmarks.js";
import type { Vec3 } from "../models/building-kit.js";

const usage = `Usage: bun scripts/fit-geographic-camera.ts [--height meters] [--eye east,south]
  Prints the geographic skyline camera fitted to the drawing, with its eye held --height
  meters above the street datum (default 2) and, with --eye, held that many meters east
  and south of Crain's mapped centre.`;

// East and south of Crain's mapped centre in meters, then radians, then the focal length
// in the drawing's layer units.
type Camera = [east: number, south: number, azimuth: number, polar: number, focal: number];

function solveLinear(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.map((row, i) => [...row, vector[i]!]), n = vector.length;
  for (let i = 0; i < n; i += 1) {
    const pivot = rows.slice(i).reduce((best, row, k) => (Math.abs(row[i]!) > Math.abs(rows[best]![i]!) ? i + k : best), i);
    [rows[i], rows[pivot]] = [rows[pivot]!, rows[i]!];
    for (let k = i + 1; k < n; k += 1) {
      const factor = rows[k]![i]! / rows[i]![i]!;
      for (let j = i; j <= n; j += 1) rows[k]![j]! -= factor * rows[i]![j]!;
    }
  }
  const solution = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) solution[i] = (rows[i]![n]! - rows[i]!.slice(i + 1, n).reduce((sum, value, k) => sum + value * solution[i + 1 + k]!, 0)) / rows[i]![i]!;
  return solution;
}

command(usage, { height: { type: "string" }, eye: { type: "string" } }, ({ values }) => {
  const height = Number(values["height"] ?? 2);
  const held = values["eye"] ? (values["eye"] as string).split(",").map(Number) as [number, number] : null;
  if (held && (held.length !== 2 || held.some((value) => !Number.isFinite(value)))) throw new Error(`--eye takes east,south in meters, not ${values["eye"]}.`);
  // The camera's entries the solve moves: all five, or only the angles and the lens.
  const free = held ? [2, 3, 4] : [0, 1, 2, 3, 4];
  const [left, top, width, frameHeight] = reference.viewBox.split(" ").map(Number) as [number, number, number, number];
  const centre = [left + width / 2, top + frameHeight / 2] as const;
  const project = ([east, south, azimuth, polar, focal]: Camera, point: Vec3): [number, number] => {
    // The viewer's orbit basis: back points from the target to the eye, with no roll.
    const back: Vec3 = [Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)];
    const right: Vec3 = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
    const up: Vec3 = [back[1] * right[2] - back[2] * right[1], back[2] * right[0] - back[0] * right[2], back[0] * right[1] - back[1] * right[0]];
    const offset: Vec3 = [point[0] - east, point[1] - height, point[2] - south];
    const dot = (a: Vec3) => a[0] * offset[0] + a[1] * offset[1] + a[2] * offset[2];
    const depth = -dot(back);
    return [centre[0] + focal * dot(right) / depth, centre[1] - focal * dot(up) / depth];
  };
  const residuals = (camera: Camera) => geographicLandmarks.flatMap(([, , point, drawn]) => {
    const [u, v] = project(camera, point);
    return [u - drawn[0], v - drawn[1]];
  });
  const cost = (camera: Camera) => residuals(camera).reduce((sum, r) => sum + r * r, 0);

  // Levenberg–Marquardt from the Adler Planetarium's shore, with a numeric Jacobian.
  let camera: Camera = [held?.[0] ?? 1500, held?.[1] ?? 2050, 0.63, 1.63, 20000], damping = 1e-3, current = cost(camera);
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const r = residuals(camera);
    const columns = free.map((i) => {
      const value = camera[i]!, step = Math.max(1e-7, Math.abs(value) * 1e-7);
      const moved = camera.map((entry, k) => (k === i ? entry + step : entry)) as Camera;
      return residuals(moved).map((m, k) => (m - r[k]!) / step);
    });
    const normal = columns.map((a) => columns.map((b) => a.reduce((sum, value, k) => sum + value * b[k]!, 0)));
    const gradient = columns.map((a) => a.reduce((sum, value, k) => sum + value * r[k]!, 0));
    let accepted = false;
    for (let attempt = 0; attempt < 30 && !accepted; attempt += 1) {
      const step = solveLinear(normal.map((row, i) => row.map((value, j) => value + (i === j ? damping * value : 0))), gradient.map((g) => -g));
      const next = camera.map((value, i) => value + (free.includes(i) ? step[free.indexOf(i)]! : 0)) as Camera, nextCost = cost(next);
      if (nextCost < current) { accepted = true; damping = Math.max(damping / 3, 1e-12); if (current - nextCost < current * 1e-12) iteration = Infinity; camera = next; current = nextCost; }
      else damping *= 4;
    }
    if (!accepted) break;
  }

  const [east, south, azimuth, polar, focal] = camera;
  const degrees = (radians: number) => (radians * 180 / Math.PI).toFixed(4);
  console.log(`Eye: ${east.toFixed(2)} m east, ${height} m up, ${south.toFixed(2)} m south of Crain (${(Math.hypot(east, south) / 1000).toFixed(2)} km away)`);
  console.log(`Azimuth ${degrees(azimuth)}°, polar ${degrees(polar)}° (looking up ${degrees(polar - Math.PI / 2)}°)`);
  console.log(`Frame vertical field of view ${degrees(2 * Math.atan(frameHeight / 2 / focal))}° (focal length ${focal.toFixed(1)} layer units)`);
  const errors = geographicLandmarks.map(([name, , point, drawn]) => {
    const [u, v] = project(camera, point);
    return { name, du: u - drawn[0], dv: v - drawn[1] };
  });
  console.log(`RMS ${Math.sqrt(current / errors.length).toFixed(1)} layer units over ${errors.length} landmarks\n`);
  console.log(`${"Landmark".padEnd(30)}${"Δx".padStart(8)}${"Δy".padStart(8)}`);
  for (const { name, du, dv } of errors) console.log(`${name.padEnd(30)}${du.toFixed(1).padStart(8)}${dv.toFixed(1).padStart(8)}`);
});
