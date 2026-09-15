const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// Geometry checks in Node, before the browser suites: the kit's solids are closed, arc
// normals are analytic, and the fitted models hide no open faces or same-facing coplanar
// surfaces (z-fighting) in or across their meshes. The
// models are browser ES modules in a typeless package, so Node detects their syntax and
// would warn about that on every import.
process.removeAllListeners("warning");
process.on("warning", (warning) => { if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning); });
const load = (file) => import(pathToFileURL(path.resolve(__dirname, "..", file)).href);
const { models, fitted } = require("./skyline-landmarks.cjs");

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);

function trianglesOf({ positions, normals }) {
  const triangles = [];
  for (let i = 0; i < positions.length; i += 9) {
    const points = [0, 3, 6].map((k) => [positions[i + k], positions[i + k + 1], positions[i + k + 2]]);
    const g = cross(sub(points[1], points[0]), sub(points[2], points[0])), length = Math.hypot(...g);
    triangles.push({
      index: i / 9, points, area: length / 2,
      normals: [0, 3, 6].map((k) => [normals[i + k], normals[i + k + 1], normals[i + k + 2]]),
      normal: g.map((value) => value / (length || 1)), offset: dot(g, points[0]) / (length || 1),
    });
  }
  return triangles;
}

// Merges vertices within a tolerance, so rounding where runs meet still pairs their edges.
function weld(positions, tolerance = 1e-6) {
  const cells = new Map(), points = [], ids = [];
  for (let i = 0; i < positions.length; i += 3) {
    const p = [positions[i], positions[i + 1], positions[i + 2]], c = p.map((value) => Math.round(value / tolerance));
    let id = -1;
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      for (const other of cells.get(`${c[0] + dx},${c[1] + dy},${c[2] + dz}`) || []) if (id < 0 && Math.hypot(...sub(points[other], p)) <= tolerance) id = other;
    }
    if (id < 0) {
      id = points.push(p) - 1;
      const key = c.join();
      cells.set(key, [...(cells.get(key) || []), id]);
    }
    ids.push(id);
  }
  return ids;
}

// Every directed edge needs a reverse partner; no triangle may be degenerate or wound against its normals.
function assertClosed(label, data) {
  const triangles = trianglesOf(data);
  assert.ok(triangles.length > 0, `${label} should emit geometry`);
  assertSound(label, triangles);
  const ids = weld(data.positions), edges = new Map();
  for (let i = 0; i < ids.length; i += 3) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) edges.set(`${ids[i + a]}>${ids[i + b]}`, (edges.get(`${ids[i + a]}>${ids[i + b]}`) || 0) + 1);
  }
  const open = [...edges].filter(([key, count]) => (edges.get(key.split(">").reverse().join(">")) || 0) !== count);
  assert.equal(open.length, 0, `${label} should be watertight, but ${open.length} directed edges have no reverse partner`);
}
function assertSound(label, triangles) {
  for (const { index, area, normal, normals } of triangles) {
    assert.ok(area > 1e-9, `${label} triangle ${index} should not be degenerate`);
    assert.ok(dot(normal, [0, 1, 2].map((axis) => normals[0][axis] + normals[1][axis] + normals[2][axis])) > 0, `${label} triangle ${index} should wind with its normals`);
  }
}

// Within 2 mm of a plane, a surface would z-fight with it or close it.
const onPlane = (triangle, { normal, offset }) => triangle.points.every((p) => Math.abs(dot(normal, p) - offset) < 2e-3);

// Triangles bucketed by plane under both facings, so coplanar neighbors are cheap to find.
// Tilting a plane by the 0.8° this allows moves its offset by up to 0.0142 per meter from
// the origin, so offsets bucket at that spread across the model, or a near-coplanar pair
// could land in distant buckets.
function planeIndex(triangles) {
  const cells = new Map();
  const reach = triangles.reduce((most, triangle) => Math.max(most, ...triangle.points.map((p) => Math.hypot(...p))), 0);
  const spacing = reach * 0.0142 + 0.005;
  const cell = (normal, offset) => [...normal.map((value) => Math.floor(value / 0.02)), Math.floor(offset / spacing)];
  for (const triangle of triangles) {
    for (const sign of [1, -1]) {
      const key = cell(triangle.normal.map((value) => value * sign), triangle.offset * sign).join();
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(triangle);
    }
  }
  return (normal, offset) => {
    const [a, b, c, d] = cell(normal, offset), found = new Set();
    for (let i = 0; i < 81; i += 1) {
      const step = [i % 3, Math.floor(i / 3) % 3, Math.floor(i / 9) % 3, Math.floor(i / 27)].map((value) => value - 1);
      for (const triangle of cells.get([a + step[0], b + step[1], c + step[2], d + step[3]].join()) || []) found.add(triangle);
    }
    return [...found].filter((triangle) => Math.abs(dot(triangle.normal, normal)) > 0.9999);
  };
}

// Area shared by two coplanar triangles, clipping one by the other in the first's plane.
function overlapArea(a, b) {
  const axis = Math.abs(a.normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(a.normal, axis), ul = Math.hypot(...u), e1 = u.map((value) => value / ul), e2 = cross(a.normal, e1);
  const flat = (p) => [dot(p, e1), dot(p, e2)];
  const signedArea = (polygon) => polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const ccw = (polygon) => (signedArea(polygon) < 0 ? [...polygon].reverse() : polygon);
  const clipper = ccw(a.points.map(flat));
  let polygon = ccw(b.points.map(flat));
  for (let i = 0; i < 3 && polygon.length; i += 1) {
    const [p0, p1] = [clipper[i], clipper[(i + 1) % 3]], side = (p) => (p1[0] - p0[0]) * (p[1] - p0[1]) - (p1[1] - p0[1]) * (p[0] - p0[0]);
    polygon = polygon.flatMap((p, j) => {
      const q = polygon[(j + 1) % polygon.length], sp = side(p), sq = side(q), kept = sp >= 0 ? [p] : [];
      return (sp >= 0) !== (sq >= 0) ? [...kept, lerp(p, q, sp / (sp - sq))] : kept;
    });
  }
  return polygon.length >= 3 ? Math.abs(signedArea(polygon)) : 0;
}

// Points a covering surface must contain: a grid inset from a quad's corners, or points
// pulled toward the centroid of any other face.
function samples(corners) {
  if (corners.length === 4) return [0.1, 0.5, 0.9].flatMap((u) => [0.1, 0.5, 0.9].map((v) => lerp(lerp(corners[0], corners[1], u), lerp(corners[3], corners[2], u), v)));
  const centroid = [0, 1, 2].map((axis) => corners.reduce((sum, p) => sum + p[axis], 0) / corners.length);
  return [centroid, ...corners.map((corner) => lerp(centroid, corner, 0.8))];
}
function contains(triangle, p) {
  return [0, 1, 2].every((i) => dot(cross(sub(triangle.points[(i + 1) % 3], triangle.points[i]), sub(p, triangle.points[i])), triangle.normal) >= -1e-9);
}

async function main() {
  const kit = await load("models/building-kit.js");
  const { line, arc, bulge, deg } = kit;
  const build = (make) => {
    const builder = kit.createBuilder("test", "test"), target = builder.batch("solid", builder.material(0xffffff));
    make(builder, target);
    return { target, omitted: builder.building.userData.omitted, finish: builder.finish };
  };

  // A plan with every run type: straight south and west faces, a convex bulge to the east,
  // and a concave arc to the north whose ends set the corners it meets.
  const reach = 30, spread = Math.asin(10 / reach);
  const dent = arc([0, -10 - reach * Math.cos(spread)], reach, Math.PI + spread, Math.PI - spread, true);
  const south = line([-10, 10], [10, 10]), east = bulge([10, 10], dent.at(0), 2), west = line(dent.at(dent.length), [-10, 10]);
  const plan = [south, east, dent, west];

  assertClosed("box", build(({ box }, target) => box(target, [2, 3], [0.6, 0.8], 0.5, -0.25, 0.75, 1, 4)).target);
  assertClosed("band with defaults on a straight run", build(({ band }, target) => band(target, [south], 2, 3, 0.4, { from: 3, to: 12 })).target);
  assertClosed("band with defaults across a convex corner onto an arc", build(({ band }, target) => band(target, [south, east], 2, 3, 0.4)).target);
  assertClosed("band with defaults on part of a concave arc", build(({ band }, target) => band(target, [dent], 2, 3, 0.4, { from: 1, to: dent.length - 2 })).target);
  assertClosed("prism with straight and arced runs", build(({ prism }, target) => prism(target, plan, [0, 5, 12])).target);
  // A rectilinear slab: a rectangle plan under a parapet band that wraps the whole roof.
  const block = kit.rectangle(-8, 8, -20, 20);
  assertClosed("prism on a rectangle", build(({ prism }, target) => prism(target, block, [0, 40])).target);
  assertClosed("closed band around a rectangle", build(({ band }, target) => band(target, block, 38, 40, 0.4, { closed: true })).target);
  assert.throws(() => build(({ prism }, target) => prism(target, kit.rectangle(8, -8, -20, 20), [0, 40])), /counterclockwise/, "a clockwise plan would turn its walls inward");

  // An arrow-shaped plan has a reflex corner the ear clipping must go around.
  const arrow = [[0, 0], [8, 0], [8, -3], [14, 4], [8, 11], [8, 8], [0, 8], [4, 4]].map(([x, z]) => [x, -z]);
  const floor = build(({ slab }, target) => { slab(target, arrow, 3, true); slab(target, arrow, 3, false); }).target;
  assertClosed("slab over a non-convex polygon, both faces", floor);
  const planArea = Math.abs(arrow.reduce((sum, [x, z], i) => { const [x2, z2] = arrow[(i + 1) % arrow.length]; return sum + x * z2 - x2 * z; }, 0) / 2);
  const upArea = trianglesOf(floor).filter((t) => t.normal[1] > 0).reduce((sum, t) => sum + t.area, 0);
  assert.ok(Math.abs(upArea - planArea) < 1e-9, `slab should cover its polygon exactly: ${upArea} vs ${planArea}`);

  // Omitting a face is explicit and recorded; concave corners must be split by the caller.
  const topless = build(({ box }, target) => box(target, [0, 0], [0, 1], 1, 0, 1, 0, 1, { omit: ["top"] }));
  assert.equal(topless.target.positions.length / 9, 10, "an omitted box face should not be emitted");
  assert.equal(topless.omitted.length, 1, "an omitted face should be recorded for its cover check");
  assert.throws(() => build(({ band }, target) => band(target, [line([0, 0], [10, 0]), line([10, 0], [10, 10])], 0, 1, 0.3)), /concave/);

  // Arc panels carry the curve's own normal at every vertex, not their facet's, so the toon
  // shading reads as one surface. A default band's front and back do too; its end returns
  // face along the run, square to the radius.
  for (const [label, run, sign] of [["convex arc", arc([4, -2], 20, 10 * deg, 70 * deg), 1], ["concave arc", arc([4, -2], 20, 70 * deg, 10 * deg, true), -1]]) {
    const { target } = build(({ panel }, t) => panel(t, run, 0, run.length, 0, 3, 0.5));
    assert.ok(run.pieces(0, run.length) > 1 && target.positions.length / 9 === 2 * run.pieces(0, run.length), `${label} should be split into facets`);
    const radialAt = (positions, i) => { const radial = [(positions[i] - 4) * sign, (positions[i + 2] + 2) * sign], r = Math.hypot(...radial); return [radial[0] / r, radial[1] / r]; };
    for (let i = 0; i < target.positions.length; i += 3) {
      const [ux, uz] = radialAt(target.positions, i), n = target.normals.slice(i, i + 3);
      assert.ok(Math.abs(n[0] - ux) < 1e-9 && n[1] === 0 && Math.abs(n[2] - uz) < 1e-9, `${label} vertex ${i / 3} should carry the analytic normal: ${n}`);
    }
    const banded = build(({ band }, t) => band(t, [run], 0, 3, 0.5, { from: 1, to: run.length - 1 })).target;
    for (let i = 0; i < banded.positions.length; i += 3) {
      const [ux, uz] = radialAt(banded.positions, i), n = banded.normals.slice(i, i + 3), facing = n[0] * ux + n[2] * uz;
      if (n[1] !== 0) continue;
      assert.ok(Math.abs(facing) < 1e-9 || Math.hypot(n[0] - Math.sign(facing) * ux, n[2] - Math.sign(facing) * uz) < 1e-9, `${label} band vertex ${i / 3} should carry the analytic normal: ${n}`);
    }
  }
  const finished = build(({ box }, target) => box(target, [0, 0], [0, 1], 1, 0, 1, 0, 1)).finish({ height: 1 });
  assert.equal(finished.triangleCount, 12, "a finished model should count its triangles");

  // Every fitted model in the study spec: sound triangles, no same-facing coplanar overlaps
  // (z-fighting) in or across meshes, and every omitted face covered by coplanar geometry or
  // facing the ground.
  for (const { id } of fitted) {
    const entry = models.find((model) => model.id === id), model = (await load(entry.module))[entry.factory]();
    const meshes = model.building.children.filter((child) => child.isMesh).map((mesh) => ({
      name: mesh.name, triangles: trianglesOf({ positions: mesh.geometry.getAttribute("position").array, normals: mesh.geometry.getAttribute("normal").array }),
    }));
    assert.equal(model.triangleCount, meshes.reduce((sum, mesh) => sum + mesh.triangles.length, 0), `${model.building.name} should count every triangle`);
    for (const mesh of meshes) assertSound(mesh.name, mesh.triangles);
    // Materials are single-sided, so two same-facing surfaces in one plane z-fight whichever
    // batches they belong to. A pair counts when either lies within 2 mm of the other's plane:
    // a short facet can sit on a long face's plane while the long face's far end leaves the facet's.
    const triangles = meshes.flatMap((mesh) => mesh.triangles.map((triangle) => ({ ...triangle, mesh: mesh.name })));
    triangles.forEach((triangle, id) => { triangle.id = id; });
    const lookup = planeIndex(triangles), overlaps = [];
    for (const a of triangles) {
      for (const b of lookup(a.normal, a.offset)) {
        if (b.id > a.id && dot(a.normal, b.normal) > 0 && (onPlane(b, a) || onPlane(a, b)) && overlapArea(a, b) > 1e-5) overlaps.push([a.mesh, b.mesh, a.points[0]]);
      }
    }
    assert.deepEqual(overlaps.slice(0, 3), [], `${model.building.name} should have no same-facing coplanar overlaps (${overlaps.length} found)`);
    for (const { batch, corners, normal } of model.building.userData.omitted) {
      // A floor on the ground needs no cover: the camera never goes below the platform.
      if (normal[1] === -1 && corners.every((corner) => corner[1] === 0)) continue;
      const newell = [0, 1, 2].map((axis) => corners.reduce((sum, p, i) => {
        const q = corners[(i + 1) % corners.length], [j, k] = [(axis + 1) % 3, (axis + 2) % 3];
        return sum + (p[j] - q[j]) * (p[k] + q[k]);
      }, 0));
      const plane = newell.map((value) => value / Math.hypot(...newell)), offset = dot(plane, corners[0]);
      const candidates = lookup(plane, offset).filter((triangle) => onPlane(triangle, { normal: plane, offset }));
      const bare = samples(corners).filter((p) => !candidates.some((triangle) => contains(triangle, p)));
      assert.equal(bare.length, 0, `${model.building.name} ${batch}: an omitted face at ${JSON.stringify(corners[0])} should be covered by coplanar geometry`);
    }
  }
  console.log("PASS: closed kit solids (box, bands, prism, slab), analytic arc normals, and fitted models without same-facing coplanar overlaps or uncovered omissions.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
