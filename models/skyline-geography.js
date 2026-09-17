import * as THREE from "../vendor/three-r186.js";
import { createBuilder, line } from "./building-kit.js";
import { geographicBuildings, geographicStreets } from "./skyline-geography-data.js";

// Local WGS84 tangent plane, centered on the bounding-box center of Crain's
// mapped footprint. Ground coordinates are east/north meters; Three uses x/-z.
export const geographicOrigin = [-87.62497155, 41.88482645];
const radians = Math.PI / 180;
const latitude = geographicOrigin[1] * radians;
const eccentricitySquared = 6.69437999014e-3;
const w = Math.sqrt(1 - eccentricitySquared * Math.sin(latitude) ** 2);
const eastPerDegree = 6378137 / w * Math.cos(latitude) * radians;
const northPerDegree = 6378137 * (1 - eccentricitySquared) / w ** 3 * radians;
export function projectGround([longitude, lat]) {
  return [(longitude - geographicOrigin[0]) * eastPerDegree, (lat - geographicOrigin[1]) * northPerDegree];
}

export function footprintMetrics(coordinates) {
  const points = coordinates.map(projectGround);
  const min = [0, 1].map((axis) => Math.min(...points.map((p) => p[axis])));
  const max = [0, 1].map((axis) => Math.max(...points.map((p) => p[axis])));
  const area = Math.abs(points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0)) / 2;
  return { min, max, center: min.map((n, i) => (n + max[i]) / 2), size: min.map((n, i) => max[i] - n), area };
}

function plan(coordinates) {
  const points = coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north]; });
  const area = points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0);
  if (area > 0) points.reverse();
  return points.map((p, i) => line(p, points[(i + 1) % points.length]));
}

export function createGeographicBuilding(record, offset = [0, 0]) {
  const kit = createBuilder(record.name, record.id);
  const material = kit.material(0x8fa9ae);
  const estimated = kit.material(0x8c8170);
  const batches = [];
  for (const part of record.parts) {
    const batch = kit.batch(`OSM way ${part.way}`, part.estimatedHeight ? estimated : material);
    batches.push(batch);
    const runs = plan(part.coordinates);
    // Generate a closed prism first, then warp its height to the mapped roof
    // slope or inferred crown. Recompute normals after the warp below.
    kit.prism(batch, runs, [part.bottom, part.top]);
    const points = runs.map((run) => run.at(0));
    let heightAt = () => part.top;
    if (part.roofSlope) {
      // OSM roof:direction is the downhill compass bearing.
      const angle = part.roofSlope.direction * radians;
      const along = ([x, z]) => x * Math.sin(angle) - z * Math.cos(angle);
      const projections = points.map(along);
      const min = Math.min(...projections), span = Math.max(...projections) - min;
      heightAt = (p) => part.top - part.roofSlope.height * (along(p) - min) / span;
    } else if (part.crown) {
      // The mapped boundary has no roof subdivisions. Keep that boundary,
      // close the shaft at the inferred eave, then add a closed pyramid + spire.
      heightAt = () => part.crown.eave;
    }
    for (let i = 0; i < batch.positions.length; i += 3) {
      if (Math.abs(batch.positions[i + 1] - part.top) < 1e-6) batch.positions[i + 1] = heightAt([batch.positions[i], batch.positions[i + 2]]);
    }
    if (part.crown) {
      const center = footprintMetrics(part.coordinates).center;
      const apex = [center[0], part.crown.peak, -center[1]];
      const ring = points.map(([x, z]) => [x, part.crown.eave, z]);
      // A closed pyramid sits on the closed shaft; the coincident faces have
      // opposing normals. Its proportions are explicitly marked as inferred.
      kit.slab(batch, points, part.crown.eave, false);
      ring.forEach((p, i) => kit.triangle(batch, [p, ring[(i + 1) % ring.length], apex], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]));
      kit.box(batch, [center[0], -center[1]], [0, 1], 0.45, -0.45, 0.45, part.crown.peak - 1, part.crown.tip);
    }
  }
  if (record.id === "layer3") {
    const [x, north] = footprintMetrics(record.parts.at(-1).coordinates).center;
    const antenna = kit.batch("antenna · inferred position", estimated);
    batches.push(antenna);
    kit.box(antenna, [x, -north], [0, 1], 0.35, -0.35, 0.35, record.height - 1, record.tipHeight);
  }
  const model = kit.finish({ height: record.tipHeight, outlines: batches, opacity: 0.5 });
  model.building.traverse((child) => { if (child.isMesh) child.geometry.computeVertexNormals(); });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData.geography = record;
  return model;
}

function lines(points, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }));
}

export function createGeographicGround(offset = [0, 0]) {
  const group = new THREE.Group();
  group.name = "Geographic reference";
  group.position.set(offset[0], 0, offset[1]);
  const grid = [];
  for (let x = -400; x <= 500; x += 100) grid.push([x, 0.02, -650], [x, 0.02, 250]);
  for (let north = -250; north <= 650; north += 100) grid.push([-400, 0.02, -north], [500, 0.02, -north]);
  group.add(lines(grid, 0x303b3e));
  const streets = new THREE.Group();
  streets.name = "Mapped street centerlines";
  for (const street of geographicStreets) {
    const points = street.coordinates.map((coordinate) => {
      const [east, north] = projectGround(coordinate);
      return [east, 0.06, -north];
    });
    const segments = [];
    for (let i = 1; i < points.length; i += 1) {
      // Clip every segment to the study rectangle, retaining crossing segments.
      const a = points[i - 1], b = points[i];
      let lo = 0, hi = 1;
      for (const [axis, min, max] of [[0, -400, 500], [2, -650, 250]]) {
        const delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-10) { if (a[axis] < min || a[axis] > max) hi = -1; }
        else {
          const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
          lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
        }
      }
      if (lo <= hi) segments.push(...[lo, hi].map((t) => a.map((n, axis) => n + (b[axis] - n) * t)));
    }
    const object = lines(segments, 0xb9a578);
    object.name = street.name;
    streets.add(object);
  }
  group.add(streets);
  const outlines = [];
  for (const record of geographicBuildings) {
    const points = record.footprint.coordinates.map((p) => { const [x, y] = projectGround(p); return [x, 0.1, -y]; });
    points.forEach((p, i) => outlines.push(p, points[(i + 1) % points.length]));
  }
  group.add(lines(outlines, 0x8ed5de));
  return { group, streets };
}
