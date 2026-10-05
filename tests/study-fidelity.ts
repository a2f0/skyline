// Fidelity maths for the skyline study, shared by tests/skyline-study.test.ts and
// scripts/fidelity-report.js so both compute the same numbers. measureStudy runs inside
// the study page: Playwright sends its source, so it must not use anything outside itself.
import type { BrowserContextOptions } from "playwright";
import type { Vec3 } from "../src/models/building-kit.js";
import type { FittedSpec, Landmark, ModelsEntry } from "./skyline-landmarks.js";

// The layouts the skyline test checks, in its order and with its page options. Its phone
// page keeps motion enabled, because reduced motion pauses the touch drag it tests.
export interface ViewportEntry {
  name: string;
  options: BrowserContextOptions;
}

const viewports = [
  { name: "1440x1000", options: { viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" } },
  { name: "1280x800", options: { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" } },
  { name: "768x1024", options: { viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" } },
  { name: "620x1400", options: { viewport: { width: 620, height: 1400 }, reducedMotion: "reduce" } },
  { name: "390x844 mobile", options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
] as [ViewportEntry, ViewportEntry, ViewportEntry, ViewportEntry, ViewportEntry];

export interface Deviation {
  id: string;
  actual: [number, number];
  expected: [number, number];
  error: number;
  tolerance: number;
}
export interface ColumnSample { actual: number; expected: number; residual: number }
export interface RowSample { actual: number; expected: number; residual: number }
export interface SightGapSample { gap: number; mesh: string }
export interface BuildingMeasurement {
  id: string;
  columns: Record<string, ColumnSample[]>;
  rows: Record<string, RowSample[]>;
  sightGaps: Record<string, SightGapSample[]>;
  onGeometry: Record<string, number>;
  projected: Record<string, [number, number] | [number, number][]>;
  silhouette: number | undefined;
}
export interface ModelMeasurement { id: string; triangles: number; silhouette: { left: number; right: number; top: number; bottom: number } }
export interface MeasureResult {
  canvas: [number, number];
  deviations: Record<string, Deviation>;
  buildings: BuildingMeasurement[];
  models?: ModelMeasurement[];
  sceneTriangles?: number;
}
export interface MeasureArgs {
  landmarks: Landmark[];
  landmarkTolerance: number;
  fitted: FittedSpec[];
  models: ModelsEntry[];
  report?: boolean;
}

// Names the first missing field of a fitted spec, before a page fails on it obscurely.
function checkSpec({ fitted, models }: { fitted: FittedSpec[]; models: ModelsEntry[] }) {
  const required = ["id", "label", "features", "landmarks", "tolerance", "columns", "columnTolerance", "sightGap", "onGeometryTolerance"];
  for (const spec of fitted) {
    const missing = required.find((key) => (spec as unknown as Record<string, unknown>)[key] === undefined);
    if (missing) throw new Error(`The fitted spec for ${spec.id || spec.label || "a building"} in tests/skyline-landmarks.js is missing ${missing}.`);
    if (!models.some((model) => model.id === spec.id)) throw new Error(`The fitted spec ${spec.id} has no entry in models.`);
    for (const [name, column] of Object.entries(spec.columns)) if (!column.batch || !column.drawn) throw new Error(`The fitted spec ${spec.id} column ${name} needs a batch and drawn positions.`);
    for (const [name, row] of Object.entries(spec.rows || {})) if (!row.drawn || row.tolerance === undefined) throw new Error(`The fitted spec ${spec.id} row ${name} needs drawn positions and a tolerance.`);
  }
}

// Projects every landmark and fitted feature against the reference drawing. With
// `report`, it also measures each model's silhouette and triangles.
async function measureStudy({ landmarks, landmarkTolerance, fitted, models, report = false }: MeasureArgs): Promise<MeasureResult> {
  const THREE = await import("./vendor/three-r186.js" as unknown as "../src/vendor/three-r186.js");
  const source = await (await fetch((document.querySelector(".reference img") as HTMLImageElement).src)).text();
  const viewBox = (new DOMParser().parseFromString(source, "image/svg+xml").documentElement as unknown as SVGSVGElement).viewBox.baseVal;
  // Fit the reference to the canvas, accounting for the differently sized source pane in
  // the stacked mobile layout.
  const canvas = document.querySelector("canvas")!.getBoundingClientRect();
  const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
  const paddingX = (canvas.width - viewBox.width * scale) / 2;
  const paddingY = (canvas.height - viewBox.height * scale) / 2;
  const expect = (drawing: [number, number]): [number, number] => [(paddingX + (drawing[0] - viewBox.x) * scale) / canvas.width, (paddingY + (drawing[1] - viewBox.y) * scale) / canvas.height];
  const layer = (uv: [number, number]): [number, number] => [viewBox.x + (uv[0] * canvas.width - paddingX) / scale, viewBox.y + (uv[1] * canvas.height - paddingY) / scale];
  const project = (id: string, point: Vec3) => window.__buildingStudy!.projectPoint(id, point);
  const deviations: Record<string, Deviation> = {};
  const deviate = (name: string, id: string, point: Vec3, drawing: [number, number], tolerance: number) => {
    if (name in deviations) throw new Error(`Landmark ${name} is defined twice.`);
    const actual = project(id, point), expected = expect(drawing);
    deviations[name] = { id, actual, expected, error: Math.max(...actual.map((value: number, axis: number) => Math.abs(value - expected[axis]!))), tolerance };
  };
  for (const [name, id, point, drawing] of landmarks) deviate(name, id, point, drawing, landmarkTolerance);

  const buildings: BuildingMeasurement[] = [];
  for (const spec of fitted) {
    const entry = models.find((model) => model.id === spec.id)!, module = await import(entry.module.replace(/\.ts$/, ".js")), features = module[spec.features];
    if (!features) throw new Error(`${entry.module} has no export named ${spec.features}, which the ${spec.id} spec lists as its features.`);
    for (const [name, list] of Object.entries(spec.columns)) {
      if (!Array.isArray(features[name])) throw new Error(`${spec.features} has no ${name} array, which the ${spec.id} spec lists as a column.`);
      if (features[name].length !== list.drawn.length) throw new Error(`${spec.id} exports ${features[name].length} ${name} but the spec draws ${list.drawn.length}.`);
    }
    for (const [name, list] of Object.entries(spec.rows || {})) {
      if (!Array.isArray(features[name])) throw new Error(`${spec.features} has no ${name} array, which the ${spec.id} spec lists as a row.`);
      if (features[name].length !== list.drawn.length) throw new Error(`${spec.id} exports ${features[name].length} ${name} but the spec draws ${list.drawn.length}.`);
    }
    for (const [name, drawing] of Object.entries(spec.landmarks)) {
      if (!features[name]) throw new Error(`${spec.features} has no ${name}, which the ${spec.id} spec lists as a landmark.`);
      deviate(name, spec.id, features[name], drawing, spec.tolerance);
    }
    // Points on one sight line share a projection, so solve for the local direction toward
    // the camera, then cast back along it through a fresh model. Each drawn column must be
    // the first surface there, standing proud from its own batch, not merely a point on
    // the facade or panes behind it.
    const model = module[entry.factory]();
    model.building.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(), meshes = model.building.children.filter((child: any) => child.isMesh);
    const sightGap = (point: Vec3) => {
      const goal = project(spec.id, point);
      const direction = ([a, e]: [number, number]): Vec3 => [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
      const miss = (angles: [number, number]): [number, number] => { const q = project(spec.id, direction(angles).map((d, i) => point[i]! + d * 100) as Vec3); return [q[0] - goal[0], q[1] - goal[1]]; };
      let angles: [number, number] = [0.72, 0];
      for (let step = 0; step < 8; step += 1) {
        const m = miss(angles), da = miss([angles[0] + 1e-5, angles[1]]), de = miss([angles[0], angles[1] + 1e-5]);
        const [j00, j01, j10, j11] = [da[0] - m[0], de[0] - m[0], da[1] - m[1], de[1] - m[1]].map((value) => value / 1e-5) as [number, number, number, number];
        const det = j00 * j11 - j01 * j10;
        angles = [angles[0] - (j11 * m[0] - j01 * m[1]) / det, angles[1] - (j00 * m[1] - j10 * m[0]) / det];
      }
      const toward = new THREE.Vector3(...direction(angles));
      raycaster.set(new THREE.Vector3(...point).addScaledVector(toward, 400), toward.clone().negate());
      const hit = raycaster.intersectObjects(meshes, false)[0];
      // A sight line that misses the model should fail the named assertion, not crash.
      return hit ? { gap: 400 - hit.distance, mesh: hit.object.name } : { gap: -Infinity, mesh: "no surface" };
    };
    // Distance from a feature to the nearest triangle edge of the fresh model.
    const offGeometry = (q: Vec3) => {
      let nearest = Infinity;
      for (const mesh of meshes) {
        const p = mesh.geometry.getAttribute("position").array;
        for (let i = 0; i < p.length; i += 9) {
          for (const [a, b] of [[i, i + 3], [i + 3, i + 6], [i + 6, i]] as [number, number][]) {
            const d = [0, 1, 2].map((k) => p[b + k] - p[a + k]) as Vec3, w = [0, 1, 2].map((k) => q[k]! - p[a + k]) as Vec3;
            const t = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1)));
            nearest = Math.min(nearest, Math.hypot(w[0] - d[0] * t, w[1] - d[1] * t, w[2] - d[2] * t));
          }
        }
      }
      return nearest;
    };
    const projectFeature = (value: Vec3 | Vec3[]) => (typeof value[0] === "number" ? project(spec.id, value as Vec3) : (value as Vec3[]).map((point) => project(spec.id, point)));
    buildings.push({
      id: spec.id,
      columns: Object.fromEntries(Object.entries(spec.columns).map(([name, { drawn }]) => [name, features[name].map((point: Vec3, index: number) => {
        const actual = project(spec.id, point)[0], expected = expect([drawn[index]!, 0])[0];
        return { actual, expected, residual: layer([actual, 0])[0] - drawn[index]! };
      })])),
      rows: Object.fromEntries(Object.entries(spec.rows || {}).map(([name, { drawn }]) => [name, features[name].map((point: Vec3, index: number) => {
        const actual = project(spec.id, point)[1], expected = expect([0, drawn[index]!])[1];
        return { actual, expected, residual: layer([0, actual])[1] - drawn[index]! };
      })])),
      sightGaps: Object.fromEntries(Object.keys(spec.columns).map((name) => [name, features[name].map(sightGap)])),
      onGeometry: Object.fromEntries([...Object.keys(spec.landmarks), ...(spec.onGeometry || [])].map((name) => [name, offGeometry(features[name])])),
      projected: Object.fromEntries(Object.entries(features).map(([name, value]) => [name, projectFeature(value as Vec3 | Vec3[])])),
      silhouette: spec.silhouette === undefined ? undefined : expect([spec.silhouette, 0])[0],
    });
  }
  const result: MeasureResult = { canvas: [canvas.width, canvas.height], deviations, buildings };
  if (!report) return result;

  // Every vertex of a fresh copy of each model, through its placement in the scene.
  result.models = [];
  for (const entry of models) {
    const model = (await import(entry.module.replace(/\.ts$/, ".js")))[entry.factory]();
    model.building.updateMatrixWorld(true);
    const extremes = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }, vertex = new THREE.Vector3();
    for (const child of model.building.children) {
      if (!child.isMesh) continue;
      const position = child.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
        const [x, y] = layer(project(entry.id, vertex.toArray() as Vec3));
        Object.assign(extremes, { left: Math.min(extremes.left, x), right: Math.max(extremes.right, x), top: Math.min(extremes.top, y), bottom: Math.max(extremes.bottom, y) });
      }
    }
    result.models!.push({ id: entry.id, triangles: model.triangleCount, silhouette: extremes });
  }
  result.sceneTriangles = window.__buildingStudy!.triangleCount;
  return result;
}

// Whether a landmark projects higher on screen than every other one named.
const above = (deviations: Record<string, Deviation>, name: string, ...others: string[]) => others.every((other) => deviations[name]!.actual[1] < deviations[other]!.actual[1]);

export { viewports, checkSpec, measureStudy, above };
