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
const { models, fitted, twoPrudential } = require("./skyline-landmarks.cjs");

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

// The omitted face as triangles in its own plane, ear-clipped so a concave face works.
function faceTriangles(corners, normal) {
  const axis = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(normal, axis), e1 = u.map((value) => value / Math.hypot(...u)), e2 = cross(normal, e1);
  const flat = corners.map((p) => [dot(p, e1), dot(p, e2)]);
  const winding = flat.reduce((sum, p, i) => { const q = flat[(i + 1) % flat.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
  const side = (a, b, q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) * winding;
  const ring = flat.map((_, i) => i), ears = [];
  for (let guard = 0; ring.length > 3 && guard < flat.length * flat.length; guard += 1) {
    for (let i = 0; i < ring.length; i += 1) {
      const ear = [ring[(i + ring.length - 1) % ring.length], ring[i], ring[(i + 1) % ring.length]];
      const [a, b, c] = ear.map((k) => flat[k]);
      if (side(a, b, c) <= 0) continue;
      if (ring.some((k) => !ear.includes(k) && side(a, b, flat[k]) >= 0 && side(b, c, flat[k]) >= 0 && side(c, a, flat[k]) >= 0)) continue;
      ears.push(ear);
      ring.splice(i, 1);
      break;
    }
  }
  ears.push([...ring]);
  return ears.map((ear) => ({ points: ear.map((k) => corners[k]), normal }));
}
// How much of an omitted face no coplanar surface covers: the face, triangulated, with
// every coplanar surface clipped away from what is left. Subtracting rather than adding
// areas means overlapping covers cannot count twice, so covers a millimetre apart cannot
// hide a hole between them, and a cover facing either way still closes the interior.
function uncoveredArea({ corners }, lookup) {
  const newell = [0, 1, 2].map((axis) => corners.reduce((sum, p, i) => {
    const q = corners[(i + 1) % corners.length], [j, k] = [(axis + 1) % 3, (axis + 2) % 3];
    return sum + (p[j] - q[j]) * (p[k] + q[k]);
  }, 0));
  const plane = newell.map((value) => value / Math.hypot(...newell)), offset = dot(plane, corners[0]);
  const axis = Math.abs(plane[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(plane, axis), e1 = u.map((value) => value / Math.hypot(...u)), e2 = cross(plane, e1);
  const flat = (p) => [dot(p, e1), dot(p, e2)];
  const signed = (polygon) => polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const ccw = (polygon) => (signed(polygon) < 0 ? [...polygon].reverse() : polygon);
  // Sutherland-Hodgman against one edge, keeping whichever side the caller asks for.
  const clip = (polygon, [p0, p1], inside) => polygon.flatMap((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    const side = (point) => ((p1[0] - p0[0]) * (point[1] - p0[1]) - (p1[1] - p0[1]) * (point[0] - p0[0])) * (inside ? 1 : -1);
    const sp = side(p), sq = side(q), kept = sp >= 0 ? [p] : [];
    return (sp >= 0) !== (sq >= 0) ? [...kept, lerp(p, q, sp / (sp - sq))] : kept;
  });
  const faces = faceTriangles(corners, plane);
  const area = faces.reduce((sum, face) => sum + Math.hypot(...cross(sub(face.points[1], face.points[0]), sub(face.points[2], face.points[0]))) / 2, 0);
  let pieces = faces.map((face) => ccw(face.points.map(flat)));
  for (const cover of lookup(plane, offset).filter((triangle) => onPlane(triangle, { normal: plane, offset }))) {
    const clipper = ccw(cover.points.map(flat)), next = [];
    for (const piece of pieces) {
      let remaining = piece;
      for (let i = 0; i < 3 && remaining.length >= 3; i += 1) {
        const edge = [clipper[i], clipper[(i + 1) % 3]];
        const outside = clip(remaining, edge, false);
        if (outside.length >= 3 && Math.abs(signed(outside)) > 1e-12) next.push(outside);
        remaining = clip(remaining, edge, true);
      }
    }
    pieces = next;
    if (!pieces.length) break;
  }
  return { area, uncovered: pieces.reduce((sum, piece) => sum + Math.abs(signed(piece)), 0) };
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
  // A vertex sitting on an ear's diagonal is not an ear: clipping it would fill the notch.
  const notch = [[0, 0], [2, 0], [2, -2], [1, -1], [0, -2]];
  const notched = build(({ slab }, target) => slab(target, notch, 0, true)).target;
  const areaOf = (positions) => {
    let total = 0;
    for (let i = 0; i < positions.length; i += 9) {
      const [a, b, c] = [0, 3, 6].map((k) => [positions[i + k], positions[i + k + 1], positions[i + k + 2]]);
      total += Math.hypot(...cross(sub(b, a), sub(c, a))) / 2;
    }
    return total;
  };
  assert.ok(Math.abs(areaOf(notched.positions) - 3) < 1e-9, `slab should cover a notch once, not ${areaOf(notched.positions)}`);

  // A band that `visible` interrupts closes itself, so no hole escapes the omission record.
  const straight = [[[0, 0], [1, 0]], [[1, 0], [2, 0]], [[2, 0], [3, 0]], [[3, 0], [4, 0]]].map(([a, b]) => line(a, b));
  const interrupted = build(({ band }, target) => band(target, straight, 0, 1, 0.3, { visible: ([x]) => x < 1.2 || x > 2.8 }));
  assertClosed("band interrupted by visible", interrupted.target);
  assert.equal(interrupted.omitted.length, 0, "closing an interrupted band should need no omission");

  // A band whose first piece is visible only past its start still closes that start.
  const late = build(({ band }, target) => band(target, [line([0, 0], [1, 0])], 0, 1, 0.3, { visible: ([x]) => x > 0.2 }));
  assertClosed("band whose start sample is invisible", late.target);
  assert.throws(() => build(({ band }, target) => band(target, kit.rectangle(-8, 8, -20, 20), 38, 40, 0.4, { closed: true, visible: ([x]) => x < 0 })), /closed band cannot also be trimmed/);

  // An omitted face needs its whole area covered: neither a cover that stops short of the
  // border nor two covers with a slit between them is enough.
  const uncoveredOf = (make) => {
    const { target, omitted } = build(make);
    return uncoveredArea(omitted[0], planeIndex(trianglesOf(target)));
  };
  const short = uncoveredOf(({ box, panel }, target) => {
    box(target, [0, 0], [0, 1], 1, 0, 1, 0, 2, { omit: ["front"] });
    panel(target, line([-0.9, 1], [0.9, 1]), 0, 1.8, 0.1, 1.9, 0);
  });
  assert.ok(short.uncovered > 0.1, `a cover that stops short of a face's border should leave area uncovered: ${JSON.stringify(short)}`);
  const slit = uncoveredOf(({ box, panel }, target) => {
    box(target, [0, 0], [0, 1], 8, 0, 1, 0, 2, { omit: ["front"] });
    panel(target, line([-8, 1], [-7.75, 1]), 0, 0.25, 0, 2, 0);
    panel(target, line([-7.25, 1], [8, 1]), 0, 15.25, 0, 2, 0);
  });
  assert.ok(Math.abs(slit.uncovered - 1) < 1e-6, `a slit between two covers should be uncovered: ${JSON.stringify(slit)}`);
  // Two covers a few millimetres apart, each over only half the face, leave the other half
  // open: their areas must not add up to a whole cover.
  const split = uncoveredOf(({ box, panel }, target) => {
    box(target, [0, 0], [0, 1], 1, 0, 1, 0, 2, { omit: ["front"] });
    panel(target, line([-1, 0.9985], [0, 0.9985]), 0, 1, 0, 2, 0);
    panel(target, line([-1, 1.0015], [0, 1.0015]), 0, 1, 0, 2, 0);
  });
  assert.ok(Math.abs(split.uncovered - 2) < 1e-6, `two covers at different depths should not add up: ${JSON.stringify(split)}`);

  // A small hole in a large face is still a hole: the allowance cannot scale with the face.
  const pinhole = uncoveredOf(({ box, panel }, target) => {
    box(target, [0, 0], [0, 1], 10, 0, 1, 0, 200, { omit: ["front"] });
    panel(target, line([-10, 1], [10, 1]), 0, 20, 0, 99.75, 0);
    panel(target, line([-10, 1], [10, 1]), 0, 20, 100.25, 200, 0);
    panel(target, line([-10, 1], [-0.25, 1]), 0, 9.75, 99.75, 100.25, 0);
    panel(target, line([0.25, 1], [10, 1]), 0, 9.75, 99.75, 100.25, 0);
  });
  assert.ok(Math.abs(pinhole.uncovered - 0.25) < 1e-6 && pinhole.uncovered > 1e-4, `a 0.5 m hole in a 4000 m2 face should fail: ${JSON.stringify(pinhole)}`);

  // A closed band must close, and a band's runs must join.
  assert.throws(() => build(({ band }, target) => band(target, [line([0, 0], [1, 0])], 0, 1, 0.3, { closed: true })), /return to their start/);
  assert.throws(() => build(({ band }, target) => band(target, [line([0, 0], [1, 0]), line([2, 0], [3, 0])], 0, 1, 0.3)), /join end to start/);

  // Runs that double back leave both returns missing, and no wedge can close that joint.
  const doubleBack = [line([0, 0], [10, 0]), line([10, 0], [0, 0])];
  assert.throws(() => build(({ band }, target) => band(target, doubleBack, 0, 1, 0.3)), /double back/);
  assert.throws(() => build(({ band }, target) => band(target, doubleBack, 0, 1, 0.3, { closed: true })), /double back/);
  // Runs that continue straight face the same way, so that joint needs no wedge.
  assertClosed("band whose runs continue straight", build(({ band }, target) => band(target, [line([0, 0], [5, 0]), line([5, 0], [10, 0])], 0, 1, 0.3)).target);

  // from or to may leave a run empty; it contributes nothing rather than degenerate faces.
  const trimmed = build(({ band }, target) => band(target, [line([0, 0], [1, 0]), line([1, 0], [1, 1])], 0, 1, 0.3, { from: 1 }));
  assertClosed("band whose first run is trimmed away", trimmed.target);

  // A face too small for the absolute ceiling still needs a cover.
  const tiny = uncoveredOf(({ box }, target) => box(target, [0, 0], [0, 1], 0.0045, 0, 0.01, 0, 1, { omit: ["top"] }));
  assert.ok(tiny.uncovered > Math.min(1e-4, tiny.area * 1e-3), `a small uncovered face should still fail: ${JSON.stringify(tiny)}`);

  // A prism's plan must close, exactly as a band's must.
  assert.throws(() => build(({ prism }, target) => prism(target, kit.rectangle(-1, 1, -1, 1).slice(0, 3), [0, 10])), /return to their start/);
  assert.throws(() => build(({ prism }, target) => prism(target, [line([0, 0], [1, 0]), line([2, 0], [2, 1]), line([2, 1], [0, 0])], [0, 10])), /join end to start/);

  // A concave roof covered exactly by its own slab is covered, though its average is outside it.
  const uShape = [[0, 0], [3, 0], [3, -3], [2, -3], [2, -1], [1, -1], [1, -3], [0, -3]];
  const uCover = uncoveredOf(({ prism, slab }, target) => {
    prism(target, uShape.map((corner, i) => line(corner, uShape[(i + 1) % uShape.length])), [0, 4], { omit: ["top"] });
    slab(target, uShape, 4, true);
  });
  assert.ok(uCover.uncovered <= 1e-6, `a matching slab should cover a concave roof: ${JSON.stringify(uCover)}`);

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
    if (id === twoPrudential) {
      const THREE = await load("./vendor/three-r186.js"), ray = new THREE.Raycaster();
      model.building.updateMatrixWorld(true);
      const surfaces = model.building.children.filter((child) => child.isMesh);
      const hit = (origin, direction, objects = surfaces) => {
        ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
        return ray.intersectObjects(objects, false)[0];
      };
      // These points are in exposed portions of bays that cross an arrow or setback
      // boundary. Dropping the entire bay leaves the shell as the first surface.
      for (const [label, origin, direction] of [
        ["east glass beside the arrow's south edge", [35, 56.8, 9], [-1, 0, 0]],
        ["east glass beside the arrow's north edge", [35, 56.8, -7.2], [-1, 0, 0]],
        ["middle glass beyond the lower setback", [21.6, 56.8, 40], [0, 0, -1]],
      ]) assert.equal(hit(origin, direction)?.object.name, "window panes", label);
      // Upper arrows continue to the sloping cap below them, including its shoulders.
      for (const y of [231, 185]) {
        assert.equal(hit([4.5, y, 40], [0, 0, -1])?.object.name, "chevron glazing", `the arrow at y=${y} should reach the next gable`);
      }
      // The crown's ribs bridge the centre of each ridge, rather than leaving a
      // slit when two neighboring roof faces are displaced apart. The cladding
      // and louvers must also be real raised surfaces, not flat painted stripes.
      const enclosure = surfaces.filter((mesh) => mesh.name === "pyramid and chevron roofs");
      for (const [origin, name, minimumDepth] of [
        [[0, 340, 12], "glazing mullions and crown ribs", 1],
        [[10, 340, 10], "pyramid silver bands", 1],
        [[4, 340, 8.5], "vertical piers and chevrons", 0.2],
      ]) {
        const visible = hit(origin, [0, -1, 0]), backing = hit(origin, [0, -1, 0], enclosure);
        assert.equal(visible?.object.name, name, "crown detail should be the visible first surface");
        assert.ok(visible.point.y - backing.point.y > minimumDepth, "crown detail should stand clear of its dark backing");
      }
      for (const [origin, name] of [
        [[0, 328, 4], "spire inset panels"], [[0.65, 328, 4], "spire"], [[0, 344, 4], "spire"],
      ]) assert.equal(hit(origin, [0, 0, -1])?.object.name, name, "the spire should have inset panels, bright folded edges, and a bare tip");
      const rearChevron = hit([4.5, 185, -40], [0, 0, 1]);
      assert.equal(rearChevron?.object.name, "chevron glazing", "the north setback should carry the same glazed chevron");
      assert.ok(rearChevron.point.z < -23, "the north chevron must project beyond the main shaft");
      const spirePositions = surfaces.find((mesh) => mesh.name === "spire").geometry.getAttribute("position");
      const foot = Math.min(...Array.from({ length: spirePositions.count }, (_, i) => spirePositions.getY(i)));
      const roof = surfaces.filter((mesh) => ["pyramid and chevron roofs", "pyramid silver bands"].includes(mesh.name));
      for (let i = 0; i < spirePositions.count; i += 1) {
        if (spirePositions.getY(i) !== foot) continue;
        const contact = hit([spirePositions.getX(i), model.height + 1, spirePositions.getZ(i)], [0, -1, 0], roof);
        assert.ok(contact && contact.point.y >= foot, "every spire foot corner should be seated in the roof");
      }
    }
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
    for (const omission of model.building.userData.omitted) {
      const { batch, corners, normal } = omission;
      // A floor on the ground needs no cover: the camera never goes below the platform.
      if (normal[1] === -1 && corners.every((corner) => corner[1] === 0)) continue;
      // Mesh positions are Float32, so a cover meeting an omission exactly would read as
      // a sliver of the rounding. Compare both at the precision the model actually holds.
      const rendered = { ...omission, corners: corners.map((corner) => corner.map(Math.fround)) };
      const { area, uncovered } = uncoveredArea(rendered, lookup);
      // Arc facets cut chords inside a straight-edged face, leaving slivers: measured
      // against what the meshes hold, the worst across the fitted models is 2.6e-7 m2 and
      // 2.6e-6 of a face. The ceiling keeps a large face honest and the fraction keeps a
      // small one from passing. What an area bound cannot do is tell a compact hole from a
      // sliver, so an opening under 1 cm2, or a thousandth of its face, still passes. Three
      // rounds of review tried to bound the leftover's shape as well, and each measure broke
      // in turn: per piece it followed how the covers happened to be cut up, and per joined
      // region an average width let a long slit dilute a real hole. A correct bound needs the
      // clearance inside the joined region, so until it is worth that, the area is the claim.
      assert.ok(uncovered <= Math.min(1e-4, area * 1e-3), `${model.building.name} ${batch}: an omitted face at ${JSON.stringify(corners[0])} leaves ${uncovered.toFixed(6)} m2 of its ${area.toFixed(6)} m2 uncovered`);
    }
  }
  console.log("PASS: closed kit solids (box, bands, prism, slab), analytic arc normals, and fitted models without same-facing coplanar overlaps or uncovered omissions.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
