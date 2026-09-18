import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as THREE from "../vendor/three-r186.js";
import * as kit from "../models/building-kit.js";
import { models, fitted, trump, twoPrudential } from "./skyline-landmarks.js";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { createGeographicBuilding } from "../models/skyline-geography.js";

// Geometry checks under `bun test`, before the browser suites: the kit's solids are closed, arc
// normals are analytic, and the fitted models hide no open faces or same-facing coplanar
// surfaces (z-fighting) in or across their meshes.
const load = (file) => import(pathToFileURL(path.resolve(import.meta.dirname, "..", file)).href);
const { line, arc, bulge, deg, rectangle } = kit;

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
function expectClosed(label, data) {
  const triangles = trianglesOf(data);
  expect(triangles.length, `${label} should emit geometry`).toBeGreaterThan(0);
  expectSound(label, triangles);
  const ids = weld(data.positions), edges = new Map();
  for (let i = 0; i < ids.length; i += 3) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) edges.set(`${ids[i + a]}>${ids[i + b]}`, (edges.get(`${ids[i + a]}>${ids[i + b]}`) || 0) + 1);
  }
  const open = [...edges].filter(([key, count]) => (edges.get(key.split(">").reverse().join(">")) || 0) !== count);
  expect(open.length, `${label} should be watertight, but ${open.length} directed edges have no reverse partner`).toBe(0);
}
function expectSound(label, triangles) {
  for (const { index, area, normal, normals } of triangles) {
    expect(area > 1e-9, `${label} triangle ${index} should not be degenerate`).toBe(true);
    expect(dot(normal, [0, 1, 2].map((axis) => normals[0][axis] + normals[1][axis] + normals[2][axis])) > 0,
      `${label} triangle ${index} should wind with its normals`).toBe(true);
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

// A fresh kit whose `make` callback fills one batch.
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

describe("closed kit solids", () => {
  test("box", () => expectClosed("box", build(({ box }, target) => box(target, [2, 3], [0.6, 0.8], 0.5, -0.25, 0.75, 1, 4)).target));
  test("band with defaults on a straight run", () => expectClosed("band with defaults on a straight run", build(({ band }, target) => band(target, [south], 2, 3, 0.4, { from: 3, to: 12 })).target));
  test("band with defaults across a convex corner onto an arc", () => expectClosed("band with defaults across a convex corner onto an arc", build(({ band }, target) => band(target, [south, east], 2, 3, 0.4)).target));
  test("band with defaults on part of a concave arc", () => expectClosed("band with defaults on part of a concave arc", build(({ band }, target) => band(target, [dent], 2, 3, 0.4, { from: 1, to: dent.length - 2 })).target));
  test("prism with straight and arced runs", () => expectClosed("prism with straight and arced runs", build(({ prism }, target) => prism(target, plan, [0, 5, 12])).target));

  const block = rectangle(-8, 8, -20, 20);
  test("prism on a rectangle", () => expectClosed("prism on a rectangle", build(({ prism }, target) => prism(target, block, [0, 40])).target));
  test("closed band around a rectangle", () => expectClosed("closed band around a rectangle", build(({ band }, target) => band(target, block, 38, 40, 0.4, { closed: true })).target));
  test("rejects a clockwise plan", () => {
    expect(() => build(({ prism }, target) => prism(target, rectangle(8, -8, -20, 20), [0, 40]))).toThrow(/counterclockwise/);
  });

  // An arrow-shaped plan has a reflex corner the ear clipping must go around.
  const arrow = [[0, 0], [8, 0], [8, -3], [14, 4], [8, 11], [8, 8], [0, 8], [4, 4]].map(([x, z]) => [x, -z]);
  test("slab covers a non-convex polygon exactly, both faces", () => {
    const floor = build(({ slab }, target) => { slab(target, arrow, 3, true); slab(target, arrow, 3, false); }).target;
    expectClosed("slab over a non-convex polygon, both faces", floor);
    const planArea = Math.abs(arrow.reduce((sum, [x, z], i) => { const [x2, z2] = arrow[(i + 1) % arrow.length]; return sum + x * z2 - x2 * z; }, 0) / 2);
    const upArea = trianglesOf(floor).filter((t) => t.normal[1] > 0).reduce((sum, t) => sum + t.area, 0);
    expect(Math.abs(upArea - planArea), `slab should cover its polygon exactly: ${upArea} vs ${planArea}`).toBeLessThan(1e-9);
  });

  test("omitting a face is explicit and recorded", () => {
    const topless = build(({ box }, target) => box(target, [0, 0], [0, 1], 1, 0, 1, 0, 1, { omit: ["top"] }));
    expect(topless.target.positions.length / 9).toBe(10);
    expect(topless.omitted.length).toBe(1);
  });
  test("rejects a band around a concave corner", () => {
    expect(() => build(({ band }, target) => band(target, [line([0, 0], [10, 0]), line([10, 0], [10, 10])], 0, 1, 0.3))).toThrow(/concave/);
  });
});

describe("analytic arc normals", () => {
  // Arc panels carry the curve's own normal at every vertex, not their facet's, so the toon
  // shading reads as one surface. A default band's front and back do too; its end returns
  // face along the run, square to the radius.
  for (const [label, run, sign] of [["convex arc", arc([4, -2], 20, 10 * deg, 70 * deg), 1], ["concave arc", arc([4, -2], 20, 70 * deg, 10 * deg, true), -1]]) {
    test(label, () => {
      const { target } = build(({ panel }, t) => panel(t, run, 0, run.length, 0, 3, 0.5));
      expect(run.pieces(0, run.length) > 1 && target.positions.length / 9 === 2 * run.pieces(0, run.length),
        `${label} should be split into facets`).toBe(true);
      const radialAt = (positions, i) => { const radial = [(positions[i] - 4) * sign, (positions[i + 2] + 2) * sign], r = Math.hypot(...radial); return [radial[0] / r, radial[1] / r]; };
      for (let i = 0; i < target.positions.length; i += 3) {
        const [ux, uz] = radialAt(target.positions, i), n = target.normals.slice(i, i + 3);
        expect(Math.abs(n[0] - ux) < 1e-9 && n[1] === 0 && Math.abs(n[2] - uz) < 1e-9,
          `${label} vertex ${i / 3} should carry the analytic normal: ${n}`).toBe(true);
      }
      const banded = build(({ band }, t) => band(t, [run], 0, 3, 0.5, { from: 1, to: run.length - 1 })).target;
      for (let i = 0; i < banded.positions.length; i += 3) {
        const [ux, uz] = radialAt(banded.positions, i), n = banded.normals.slice(i, i + 3), facing = n[0] * ux + n[2] * uz;
        if (n[1] !== 0) continue;
        expect(Math.abs(facing) < 1e-9 || Math.hypot(n[0] - Math.sign(facing) * ux, n[2] - Math.sign(facing) * uz) < 1e-9,
          `${label} band vertex ${i / 3} should carry the analytic normal: ${n}`).toBe(true);
      }
    });
  }

  // A vertex sitting on an ear's diagonal is not an ear: clipping it would fill the notch.
  test("slab covers a notch once", () => {
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
    expect(Math.abs(areaOf(notched.positions) - 3), `slab should cover a notch once, not ${areaOf(notched.positions)}`).toBeLessThan(1e-9);
  });
});

describe("band visibility and closure", () => {
  // A band that `visible` interrupts closes itself, so no hole escapes the omission record.
  const straight = [[[0, 0], [1, 0]], [[1, 0], [2, 0]], [[2, 0], [3, 0]], [[3, 0], [4, 0]]].map(([a, b]) => line(a, b));
  test("band interrupted by visible", () => {
    const interrupted = build(({ band }, target) => band(target, straight, 0, 1, 0.3, { visible: ([x]) => x < 1.2 || x > 2.8 }));
    expectClosed("band interrupted by visible", interrupted.target);
    expect(interrupted.omitted.length).toBe(0);
  });
  test("band whose start sample is invisible", () => {
    const late = build(({ band }, target) => band(target, [line([0, 0], [1, 0])], 0, 1, 0.3, { visible: ([x]) => x > 0.2 }));
    expectClosed("band whose start sample is invisible", late.target);
  });
  test("closed band cannot also be trimmed by visible", () => {
    expect(() => build(({ band }, target) => band(target, rectangle(-8, 8, -20, 20), 38, 40, 0.4, { closed: true, visible: ([x]) => x < 0 })))
      .toThrow(/closed band cannot also be trimmed/);
  });
  test("closed band must return to its start", () => {
    expect(() => build(({ band }, target) => band(target, [line([0, 0], [1, 0])], 0, 1, 0.3, { closed: true }))).toThrow(/return to their start/);
  });
  test("band runs must join end to start", () => {
    expect(() => build(({ band }, target) => band(target, [line([0, 0], [1, 0]), line([2, 0], [3, 0])], 0, 1, 0.3))).toThrow(/join end to start/);
  });
  test("band cannot double back on itself", () => {
    const doubleBack = [line([0, 0], [10, 0]), line([10, 0], [0, 0])];
    expect(() => build(({ band }, target) => band(target, doubleBack, 0, 1, 0.3))).toThrow(/double back/);
    expect(() => build(({ band }, target) => band(target, doubleBack, 0, 1, 0.3, { closed: true }))).toThrow(/double back/);
  });
  test("band whose runs continue straight", () => expectClosed("band whose runs continue straight", build(({ band }, target) => band(target, [line([0, 0], [5, 0]), line([5, 0], [10, 0])], 0, 1, 0.3)).target));
  test("band whose first run is trimmed away", () => expectClosed("band whose first run is trimmed away", build(({ band }, target) => band(target, [line([0, 0], [1, 0]), line([1, 0], [1, 1])], 0, 1, 0.3, { from: 1 })).target));
});

describe("omission coverage", () => {
  // An omitted face needs its whole area covered: neither a cover that stops short of the
  // border nor two covers with a slit between them is enough.
  const uncoveredOf = (make) => {
    const { target, omitted } = build(make);
    return uncoveredArea(omitted[0], planeIndex(trianglesOf(target)));
  };
  test("a cover stopping short of the border leaves area uncovered", () => {
    const short = uncoveredOf(({ box, panel }, target) => {
      box(target, [0, 0], [0, 1], 1, 0, 1, 0, 2, { omit: ["front"] });
      panel(target, line([-0.9, 1], [0.9, 1]), 0, 1.8, 0.1, 1.9, 0);
    });
    expect(short.uncovered, JSON.stringify(short)).toBeGreaterThan(0.1);
  });
  test("a slit between two covers is uncovered", () => {
    const slit = uncoveredOf(({ box, panel }, target) => {
      box(target, [0, 0], [0, 1], 8, 0, 1, 0, 2, { omit: ["front"] });
      panel(target, line([-8, 1], [-7.75, 1]), 0, 0.25, 0, 2, 0);
      panel(target, line([-7.25, 1], [8, 1]), 0, 15.25, 0, 2, 0);
    });
    expect(Math.abs(slit.uncovered - 1), JSON.stringify(slit)).toBeLessThan(1e-6);
  });
  test("two covers at different depths do not add up", () => {
    const split = uncoveredOf(({ box, panel }, target) => {
      box(target, [0, 0], [0, 1], 1, 0, 1, 0, 2, { omit: ["front"] });
      panel(target, line([-1, 0.9985], [0, 0.9985]), 0, 1, 0, 2, 0);
      panel(target, line([-1, 1.0015], [0, 1.0015]), 0, 1, 0, 2, 0);
    });
    expect(Math.abs(split.uncovered - 2), JSON.stringify(split)).toBeLessThan(1e-6);
  });
  test("a small hole in a large face is still a hole", () => {
    const pinhole = uncoveredOf(({ box, panel }, target) => {
      box(target, [0, 0], [0, 1], 10, 0, 1, 0, 200, { omit: ["front"] });
      panel(target, line([-10, 1], [10, 1]), 0, 20, 0, 99.75, 0);
      panel(target, line([-10, 1], [10, 1]), 0, 20, 100.25, 200, 0);
      panel(target, line([-10, 1], [-0.25, 1]), 0, 9.75, 99.75, 100.25, 0);
      panel(target, line([0.25, 1], [10, 1]), 0, 9.75, 99.75, 100.25, 0);
    });
    expect(Math.abs(pinhole.uncovered - 0.25) < 1e-6 && pinhole.uncovered > 1e-4,
      `a 0.5 m hole in a 4000 m2 face should fail: ${JSON.stringify(pinhole)}`).toBe(true);
  });
  test("a face too small for the absolute ceiling still needs a cover", () => {
    const tiny = uncoveredOf(({ box }, target) => box(target, [0, 0], [0, 1], 0.0045, 0, 0.01, 0, 1, { omit: ["top"] }));
    expect(tiny.uncovered, JSON.stringify(tiny)).toBeGreaterThan(Math.min(1e-4, tiny.area * 1e-3));
  });
  test("a prism's plan must close", () => {
    expect(() => build(({ prism }, target) => prism(target, rectangle(-1, 1, -1, 1).slice(0, 3), [0, 10]))).toThrow(/return to their start/);
    expect(() => build(({ prism }, target) => prism(target, [line([0, 0], [1, 0]), line([2, 0], [2, 1]), line([2, 1], [0, 0])], [0, 10]))).toThrow(/join end to start/);
  });
  test("a concave roof covered by its own slab is covered", () => {
    const uShape = [[0, 0], [3, 0], [3, -3], [2, -3], [2, -1], [1, -1], [1, -3], [0, -3]];
    const uCover = uncoveredOf(({ prism, slab }, target) => {
      prism(target, uShape.map((corner, i) => line(corner, uShape[(i + 1) % uShape.length])), [0, 4], { omit: ["top"] });
      slab(target, uShape, 4, true);
    });
    expect(uCover.uncovered, JSON.stringify(uCover)).toBeLessThanOrEqual(1e-6);
  });
  test("a finished model counts its triangles", () => {
    const finished = build(({ box }, target) => box(target, [0, 0], [0, 1], 1, 0, 1, 0, 1)).finish({ height: 1 });
    expect(finished.triangleCount).toBe(12);
  });
});

describe("fitted and geographic models", () => {
  const geographic = { "heritage-geographic": "Heritage", "trump-geographic": "Trump" };
  const ids = [...fitted.map((entry) => entry.id), ...Object.keys(geographic)];
  const built = {};
  beforeAll(async () => {
    for (const id of ids) {
      built[id] = geographic[id]
        ? createGeographicBuilding(geographicBuildings.find((record) => record.shortName === geographic[id]))
        : (await load(models.find((model) => model.id === id).module))[models.find((model) => model.id === id).factory]();
    }
  }, { timeout: 180_000 });
  const meshesOf = (id) => built[id].building.children.filter((child) => child.isMesh).map((mesh) => ({
    name: mesh.name, triangles: trianglesOf({ positions: mesh.geometry.getAttribute("position").array, normals: mesh.geometry.getAttribute("normal").array }),
  }));

  for (const id of ids) {
    test(`counts every triangle in ${built[id]?.building.name || id}`, () => {
      const meshes = meshesOf(id);
      expect(built[id].triangleCount).toBe(meshes.reduce((sum, mesh) => sum + mesh.triangles.length, 0));
    });
    test(`keeps ${built[id]?.building.name || id} watertight and winding`, () => {
      for (const mesh of meshesOf(id)) expectSound(mesh.name, mesh.triangles);
    });
    test(`leaves no same-facing coplanar overlaps in ${built[id]?.building.name || id}`, { timeout: 240_000 }, () => {
      // Materials are single-sided, so two same-facing surfaces in one plane z-fight whichever
      // batches they belong to. A pair counts when either lies within 2 mm of the other's plane:
      // a short facet can sit on a long face's plane while the long face's far end leaves the facet's.
      const triangles = meshesOf(id).flatMap((mesh) => mesh.triangles.map((triangle) => ({ ...triangle, mesh: mesh.name })));
      triangles.forEach((triangle, index) => { triangle.id = index; });
      const lookup = planeIndex(triangles), overlaps = [];
      for (const a of triangles) {
        for (const b of lookup(a.normal, a.offset)) {
          if (b.id > a.id && dot(a.normal, b.normal) > 0 && (onPlane(b, a) || onPlane(a, b)) && overlapArea(a, b) > 1e-5) overlaps.push([a.mesh, b.mesh, a.points[0]]);
        }
      }
      expect(overlaps.slice(0, 3)).toEqual([]);
    });
    test(`covers every omission in ${built[id]?.building.name || id}`, () => {
      const triangles = meshesOf(id).flatMap((mesh) => mesh.triangles);
      const lookup = planeIndex(triangles);
      for (const omission of built[id].building.userData.omitted) {
        const { batch, corners, normal } = omission;
        // A floor on the ground needs no cover: the camera never goes below the platform.
        if (normal[1] === -1 && corners.every((corner) => corner[1] === 0)) continue;
        // Mesh positions are Float32, so a cover meeting an omission exactly would read as
        // a sliver of the rounding. Compare both at the precision the model actually holds.
        const rendered = { ...omission, corners: corners.map((corner) => corner.map(Math.fround)) };
        const { area, uncovered } = uncoveredArea(rendered, lookup);
        expect(uncovered, `${built[id].building.name} ${batch}: an omitted face at ${JSON.stringify(corners[0])} leaves ${uncovered.toFixed(6)} m2 of its ${area.toFixed(6)} m2 uncovered`)
          .toBeLessThanOrEqual(Math.min(1e-4, area * 1e-3));
      }
    });
  }

  describe("Trump tower specifics", () => {
    const surfaces = () => built[trump].building.children.filter((child) => child.isMesh);
    const hit = (origin, direction, objects = surfaces()) => {
      const ray = new THREE.Raycaster();
      ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
      return ray.intersectObjects(objects, false)[0];
    };
    test("the east-drop cap closes the shaft all the way through the source step", async () => {
      built[trump].building.updateMatrixWorld(true);
      const shell = surfaces().filter((mesh) => mesh.name === "closed glass shells and roof steps");
      for (const z of [4, 1, -2]) {
        const contact = hit([24, 325.7, z], [-1, 0, 0], shell);
        expect(contact?.object.name, `Trump east-drop cap should close the shaft at z=${z}`).toBe("closed glass shells and roof steps");
        expect(Math.abs(contact.point.x - 22.75) < 0.02, `Trump east-drop cap should meet its east wall at z=${z}`).toBe(true);
      }
    });
    test("the glazed south face bows, not a flat wall", async () => {
      const shell = surfaces().filter((mesh) => mesh.name === "closed glass shells and roof steps");
      const frontMiddle = hit([0, 200, 35], [0, 0, -1], shell);
      const frontEdge = hit([-17, 200, 35], [0, 0, -1], shell);
      expect(frontMiddle && frontEdge && frontMiddle.point.z - frontEdge.point.z > 1.5).toBe(true);
    });
    test("shell triangles carry their geometric surface normals", async () => {
      const shell = surfaces().filter((mesh) => mesh.name === "closed glass shells and roof steps");
      const shellTriangles = trianglesOf({
        positions: shell[0].geometry.getAttribute("position").array,
        normals: shell[0].geometry.getAttribute("normal").array,
      });
      for (const { index, normal, normals } of shellTriangles) {
        const minimumAlignment = Math.abs(normal[1]) < 0.01 ? 0.9997 : 0.9999;
        for (const vertexNormal of normals) {
          expect(dot(normal, vertexNormal), `Trump shell triangle ${index} should carry a geometric surface normal`).toBeGreaterThan(minimumAlignment);
        }
      }
    });
    test("sampled floor rows are raised bands", async () => {
      const { trumpFeatures } = await load(models.find((model) => model.id === trump).module);
      const facadeBands = surfaces().filter((mesh) => mesh.name === "raised mullions and floor bands");
      for (const point of trumpFeatures.trumpFloorBands) {
        const contact = hit([point[0], point[1], 40], [0, 0, -1], facadeBands);
        expect(contact?.object.name, "each sampled Trump floor row should be a raised band").toBe("raised mullions and floor bands");
        expect(Math.abs(contact.point.z - point[2]) < 0.02, "each sampled Trump floor band should meet its measured south face").toBe(true);
      }
    });
    test("the rear orbit sees glazed floors", async () => {
      const rearWindow = hit([6.5, 200, -50], [0, 0, 1]);
      expect(rearWindow?.object.name).toBe("glazed floor panels");
    });
    test("every spire foot corner sits on the crown roof", async () => {
      const model = built[trump];
      const spirePositions = surfaces().find((mesh) => mesh.name === "segmented spire").geometry.getAttribute("position");
      const foot = Math.min(...Array.from({ length: spirePositions.count }, (_, i) => spirePositions.getY(i)));
      const roof = surfaces().filter((mesh) => mesh.name === "crown enclosure");
      for (let i = 0; i < spirePositions.count; i += 1) {
        if (Math.abs(spirePositions.getY(i) - foot) > 1e-6) continue;
        const contact = hit([spirePositions.getX(i), model.height + 1, spirePositions.getZ(i)], [0, -1, 0], roof);
        expect(contact && Math.abs(contact.point.y - foot) < 0.02, "every Trump spire foot corner should sit on the crown roof").toBe(true);
      }
    });
    test("every crown base corner sits on a shaft roof", async () => {
      const model = built[trump];
      const crownPositions = surfaces().find((mesh) => mesh.name === "crown enclosure").geometry.getAttribute("position");
      const crownFoot = Math.min(...Array.from({ length: crownPositions.count }, (_, i) => crownPositions.getY(i)));
      const shell = surfaces().filter((mesh) => mesh.name === "closed glass shells and roof steps");
      for (let i = 0; i < crownPositions.count; i += 1) {
        if (Math.abs(crownPositions.getY(i) - crownFoot) > 1e-6) continue;
        const contact = hit([crownPositions.getX(i), model.height + 1, crownPositions.getZ(i)], [0, -1, 0], shell);
        expect(contact && Math.abs(contact.point.y - crownFoot) < 0.02, "every Trump crown base corner should sit on a shaft roof").toBe(true);
      }
    });
  });

  describe("Two Prudential specifics", () => {
    const surfaces = () => built[twoPrudential].building.children.filter((child) => child.isMesh);
    const hit = (origin, direction, objects = surfaces()) => {
      const ray = new THREE.Raycaster();
      ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
      return ray.intersectObjects(objects, false)[0];
    };
    test("dropped bays leave the shell as the first surface", async () => {
      built[twoPrudential].building.updateMatrixWorld(true);
      for (const [label, origin, direction] of [
        ["east glass beside the arrow's south edge", [35, 56.8, 9], [-1, 0, 0]],
        ["east glass beside the arrow's north edge", [35, 56.8, -7.2], [-1, 0, 0]],
        ["middle glass beyond the lower setback", [21.6, 56.8, 40], [0, 0, -1]],
      ]) expect(hit(origin, direction)?.object.name, label).toBe("window panes");
    });
    test("upper arrows reach the next gable", async () => {
      for (const y of [231, 185]) {
        expect(hit([4.5, y, 40], [0, 0, -1])?.object.name, `the arrow at y=${y} should reach the next gable`).toBe("chevron glazing");
      }
    });
    test("pier heads retain their floor-by-floor steps", async () => {
      expect(hit([-20.143, 260.9, 40], [0, 0, -1])?.object.name).toBe("vertical piers and chevrons");
      expect(hit([-20.143, 261.7, 40], [0, 0, -1])?.object.name).toBe("tower and setback shells");
    });
    test("split piers have continuous angled caps across the setback edge", async () => {
      const pierSurfaces = surfaces().filter((mesh) => mesh.name === "vertical piers and chevrons");
      for (const x of [-24.799, 24.799]) {
        for (const z of [-19.58, 19.58]) {
          const left = hit([x - 0.01, 270, z], [0, -1, 0], pierSurfaces);
          const right = hit([x + 0.01, 270, z], [0, -1, 0], pierSurfaces);
          expect(left && right && Math.abs(left.point.y - right.point.y) < 0.05, "a split pier should have a continuous angled cap across the setback edge").toBe(true);
        }
      }
    });
    test("crown detail stands clear of its dark backing", async () => {
      const enclosure = surfaces().filter((mesh) => mesh.name === "pyramid and chevron roofs");
      for (const [origin, name, minimumDepth] of [
        [[0, 340, 12], "glazing mullions and crown ribs", 1],
        [[10, 340, 10], "pyramid silver bands", 1],
        [[4, 340, 8.5], "crown louvers", 0.2],
      ]) {
        const visible = hit(origin, [0, -1, 0]), backing = hit(origin, [0, -1, 0], enclosure);
        expect(visible?.object.name, "crown detail should be the visible first surface").toBe(name);
        expect(visible.point.y - backing.point.y > minimumDepth, "crown detail should stand clear of its dark backing").toBe(true);
      }
    });
    test("the ridge beside the spire exposes its own top", async () => {
      for (const z of [-2, 2]) {
        const ridge = hit([0, 322, z], [0, -1, 0]);
        expect(ridge?.object.name).toBe("glazing mullions and crown ribs");
        expect(ridge.face.normal.y > 0.5 && ridge.face.normal.z * Math.sign(z) > ridge.face.normal.y,
          "the ridge beside the spire should expose its own top, not the opposite beam's penetrating cap").toBe(true);
      }
    });
    test("the spire has inset panels, folded edges, and a bare tip", async () => {
      for (const [origin, name] of [
        [[0, 328, 4], "spire inset panels"], [[0.65, 328, 4], "spire"], [[0, 344, 4], "spire"],
      ]) expect(hit(origin, [0, 0, -1])?.object.name, "the spire should have inset panels, bright folded edges, and a bare tip").toBe(name);
    });
    test("the north setback carries the same glazed chevron", async () => {
      const rearChevron = hit([4.5, 185, -40], [0, 0, 1]);
      expect(rearChevron?.object.name).toBe("chevron glazing");
      expect(rearChevron.point.z < -23, "the north chevron must project beyond the main shaft").toBe(true);
    });
    test("every spire foot corner is seated in the roof", async () => {
      const spirePositions = surfaces().find((mesh) => mesh.name === "spire").geometry.getAttribute("position");
      const foot = Math.min(...Array.from({ length: spirePositions.count }, (_, i) => spirePositions.getY(i)));
      const roof = surfaces().filter((mesh) => ["pyramid and chevron roofs", "pyramid silver bands"].includes(mesh.name));
      for (let i = 0; i < spirePositions.count; i += 1) {
        if (spirePositions.getY(i) !== foot) continue;
        const contact = hit([spirePositions.getX(i), built[twoPrudential].height + 1, spirePositions.getZ(i)], [0, -1, 0], roof);
        expect(contact && contact.point.y >= foot, "every spire foot corner should be seated in the roof").toBe(true);
      }
    });
  });
});
