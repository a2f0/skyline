import * as THREE from "../vendor/three-r186.js";

// Shared geometry for fitted skyline models. A plan is a list of runs, straight or
// arced, counterclockwise from above, so each run's outward normal is to its right.
// Units are meters; +x is east (right in the skyline view) and +z is south.
export const deg = Math.PI / 180;

export function line(a, b) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tangent = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  const normal = [-tangent[1], tangent[0]];
  return {
    length,
    pieces: () => 1,
    at: (s, offset = 0) => [a[0] + tangent[0] * s + normal[0] * offset, a[1] + tangent[1] * s + normal[1] * offset],
    normal: () => normal,
  };
}

// Angles measure the outward normal from +z toward +x. A concave arc keeps its
// center outside the building, so the same angle gives the same normal. Facets stay
// within `step`; 2.4° keeps silhouettes round without faceted toon bands.
export function arc(center, radius, from, to, concave = false, step = 2.4 * deg) {
  const length = radius * Math.abs(to - from);
  const angle = (s) => from + (to - from) * s / length;
  const side = concave ? -1 : 1;
  return {
    length,
    pieces: (s0, s1) => Math.max(1, Math.ceil(Math.abs(to - from) * (s1 - s0) / length / step - 1e-9)),
    at(s, offset = 0) {
      const a = angle(s), reach = side * radius + offset;
      return [center[0] + Math.sin(a) * reach, center[1] + Math.cos(a) * reach];
    },
    normal: (s) => [Math.sin(angle(s)), Math.cos(angle(s))],
  };
}

// A gentle convex arc between two corners, bulging outward by its sagitta.
export function bulge(a, b, sagitta, step) {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const radius = chord * chord / (8 * sagitta) + sagitta / 2;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const inward = [(b[1] - a[1]) / chord, -(b[0] - a[0]) / chord];
  const center = [mid[0] + inward[0] * (radius - sagitta), mid[1] + inward[1] * (radius - sagitta)];
  const angleOf = (p) => Math.atan2(p[0] - center[0], p[1] - center[1]);
  let from = angleOf(a), to = angleOf(b);
  if (to < from) to += Math.PI * 2;
  return arc(center, radius, from, to, false, step);
}

// A rectangular plan from its bounds, counterclockwise from above: the south, east, north,
// then west faces. North is the smaller z.
export function rectangle(west, east, north, south) {
  const [sw, se, ne, nw] = [[west, south], [east, south], [east, north], [west, north]];
  return [line(sw, se), line(se, ne), line(ne, nw), line(nw, sw)];
}

export const evenly = (length, count) => Array.from({ length: count + 1 }, (_, i) => length * i / count);
export const cornerNormal = (a, b) => { const l = Math.hypot(a[0] + b[0], a[1] + b[1]); return [(a[0] + b[0]) / l, (a[1] + b[1]) / l]; };
export const station = (run, s) => ({ at: run.at(s), normal: run.normal(s) });
// A plan point offset outward along a station's normal and sideways along its run.
export const along = ({ at, normal }, offset, side = 0) => [at[0] + normal[0] * offset + normal[1] * side, at[1] + normal[1] * offset - normal[0] * side];
export const point = ([x, z], y) => [x, y, z];

// The plan outline with the same facets the walls use, so roofs meet them edge to edge.
export function polygonOf(runs) {
  return runs.flatMap((run) => { const n = run.pieces(0, run.length); return Array.from({ length: n }, (_, i) => run.at(run.length * i / n)); });
}
// Twice the signed area with +z south, so a counterclockwise plan from above is negative.
const shoelace = (polygon) => polygon.reduce((sum, [x, z], i) => { const [x2, z2] = polygon[(i + 1) % polygon.length]; return sum + x * z2 - x2 * z; }, 0);
export function inside(polygon, [x, z]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) result = !result;
  }
  return result;
}

// A model under construction: toon materials, batched geometry, and the standard model
// API once finished. Solids are closed by default. A caller may omit only faces another
// surface covers, by name, and each omission is kept in building.userData.omitted so a
// test can prove the cover.
export function createBuilder(name, buildingId, { gradient = [70, 135, 200, 255] } = {}) {
  const building = new THREE.Group();
  building.name = name;
  building.userData.buildingId = buildingId;
  const omitted = building.userData.omitted = [];
  const ramp = new THREE.DataTexture(new Uint8Array(gradient), gradient.length, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const materials = [], batches = [];
  const material = (color, extras = {}) => {
    const surface = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extras });
    materials.push(surface);
    return surface;
  };
  // Each batch is one draw call. Normals are analytic, so arc facets shade as a curve.
  const batch = (name, surface) => {
    const data = { name, surface, positions: [], normals: [], colors: [] };
    batches.push(data);
    return data;
  };

  const white = new THREE.Color(1, 1, 1);
  // Winding follows the first normal, so every helper stays outward-facing.
  function triangle(target, points, normals, color = white) {
    const [a, b, c] = points, n = normals[0];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const facing = (u[1] * v[2] - u[2] * v[1]) * n[0] + (u[2] * v[0] - u[0] * v[2]) * n[1] + (u[0] * v[1] - u[1] * v[0]) * n[2];
    for (const i of facing < 0 ? [0, 2, 1] : [0, 1, 2]) {
      target.positions.push(...points[i]);
      target.normals.push(...normals[i]);
      target.colors.push(color.r, color.g, color.b);
    }
  }
  function quad(target, [a, b, c, d], normals, color) {
    const n = normals.length === 1 ? [normals[0], normals[0], normals[0], normals[0]] : normals;
    triangle(target, [a, b, c], [n[0], n[1], n[2]], color);
    triangle(target, [a, c, d], [n[0], n[2], n[3]], color);
  }
  // Names a face that does not exist, so a typo cannot silently keep it.
  const checkOmit = (omit, allowed, what) => {
    const unknown = omit.find((name) => !allowed.includes(name));
    if (unknown) throw new Error(`A ${what} has no "${unknown}" face; it has ${allowed.join(", ")}.`);
  };
  // A flat face of a solid, unless the caller omitted it as covered.
  function face(target, corners, normal, skip) {
    if (skip) omitted.push({ batch: target.name, corners, normal });
    else quad(target, corners, [normal]);
  }

  // A rectangle mapped onto a plan run, split into facets that follow an arc. Panels
  // are single surfaces for panes and trim, not solids.
  function panel(target, run, s0, s1, y0, y1, offset, color) {
    const n = run.pieces(s0, s1);
    for (let i = 0; i < n; i += 1) {
      const sa = s0 + (s1 - s0) * i / n, sb = s0 + (s1 - s0) * (i + 1) / n;
      const [pa, pb] = [run.at(sa, offset), run.at(sb, offset)];
      const [na, nb] = [run.normal(sa), run.normal(sb)].map(([x, z]) => [x, 0, z]);
      quad(target, [[pa[0], y0, pa[1]], [pb[0], y0, pb[1]], [pb[0], y1, pb[1]], [pa[0], y1, pa[1]]], [na, nb, nb, na], color);
    }
  }
  // A horizontal strip between two offsets from a run: a soffit or a ledge top.
  function ledge(target, run, s0, s1, y, inner, outer, up) {
    const n = run.pieces(s0, s1), normal = [[0, up ? 1 : -1, 0]];
    for (let i = 0; i < n; i += 1) {
      const sa = s0 + (s1 - s0) * i / n, sb = s0 + (s1 - s0) * (i + 1) / n;
      quad(target, [point(run.at(sa, inner), y), point(run.at(sb, inner), y), point(run.at(sb, outer), y), point(run.at(sa, outer), y)], normal);
    }
  }
  // A projecting band along consecutive runs, chamfered at convex corners. It is closed
  // by its back, soffit, top, and start and end returns unless `omit` names them; a
  // `closed` band, such as a parapet around a whole roof, turns its last corner onto its
  // first run instead of ending. `visible` skips pieces buried inside another volume.
  function band(target, runs, y0, y1, proud, { omit = [], from = 0, to = Infinity, closed = false, visible = () => true } = {}) {
    if (closed && (from !== 0 || to !== Infinity)) throw new Error("A closed band wraps whole runs, so it takes no from or to.");
    const faceNames = ["back", "soffit", "top", "start", "end"];
    checkOmit(omit, faceNames, "band");
    const [back, soffit, top, start, end] = faceNames.map((name) => !omit.includes(name));
    const endFace = (run, s, sign, keep) => {
      if (!visible(run.at(s, proud + 0.2), y0)) return;
      const [inner, outer] = [run.at(s), run.at(s, proud)], n = run.normal(s);
      face(target, [point(inner, y0), point(outer, y0), point(outer, y1), point(inner, y1)], [n[1] * sign, 0, -n[0] * sign], !keep);
    };
    runs.forEach((run, index) => {
      const first = index === 0 ? from : 0, last = Math.min(run.length, index === runs.length - 1 ? to : Infinity);
      const n = run.pieces(first, last);
      for (let i = 0; i < n; i += 1) {
        const sa = first + (last - first) * i / n, sb = first + (last - first) * (i + 1) / n;
        if (!visible(run.at((sa + sb) / 2, proud + 0.2), y0)) continue;
        panel(target, run, sa, sb, y0, y1, proud);
        const [ia, ib, oa, ob] = [run.at(sa), run.at(sb), run.at(sa, proud), run.at(sb, proud)];
        if (soffit) ledge(target, run, sa, sb, y0, 0, proud, false);
        else omitted.push({ batch: target.name, corners: [point(ia, y0), point(ib, y0), point(ob, y0), point(oa, y0)], normal: [0, -1, 0] });
        if (top) ledge(target, run, sa, sb, y1, 0, proud, true);
        else omitted.push({ batch: target.name, corners: [point(ia, y1), point(ib, y1), point(ob, y1), point(oa, y1)], normal: [0, 1, 0] });
        const [na, nb] = [run.normal(sa), run.normal(sb)].map(([x, z]) => [-x, 0, -z]);
        const backCorners = [point(ib, y0), point(ia, y0), point(ia, y1), point(ib, y1)];
        if (back) quad(target, backCorners, [nb, na, na, nb]);
        else omitted.push({ batch: target.name, corners: backCorners, normal: [(na[0] + nb[0]) / 2, 0, (na[2] + nb[2]) / 2] });
      }
      if (index === 0 && !closed) endFace(run, first, -1, start);
      if (index === runs.length - 1 && !closed) endFace(run, last, 1, end);
      const next = runs[index + 1] || (closed ? runs[0] : null);
      if (!next) return;
      // Outward normals turn counterclockwise from above at a convex corner, opening a wedge to fill.
      const corner = run.at(run.length), n1 = run.normal(run.length), n2 = next.normal(0);
      const turn = n1[0] * n2[1] - n1[1] * n2[0];
      if (turn > 1e-6) throw new Error("A band cannot turn a concave corner; split it into two bands there.");
      if (turn >= -1e-6 || !visible(corner, y0)) return;
      const a = run.at(run.length, proud), b = next.at(0, proud), mitre = cornerNormal(n1, n2);
      quad(target, [point(a, y0), point(b, y0), point(b, y1), point(a, y1)], [[mitre[0], 0, mitre[1]]]);
      if (soffit) triangle(target, [point(corner, y0), point(b, y0), point(a, y0)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
      else omitted.push({ batch: target.name, corners: [point(corner, y0), point(b, y0), point(a, y0)], normal: [0, -1, 0] });
      if (top) triangle(target, [point(corner, y1), point(a, y1), point(b, y1)], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
      else omitted.push({ batch: target.name, corners: [point(corner, y1), point(a, y1), point(b, y1)], normal: [0, 1, 0] });
    });
  }
  // A box on a local frame: fins, mullions, posts, and rooftop masses. Depths run along
  // the frame's normal from `back` to `front`.
  function box(target, [x, z], normal, halfWidth, back, front, y0, y1, { omit = [] } = {}) {
    const t = [normal[1], -normal[0]];
    const p = (side, depth, y) => [x + t[0] * side + normal[0] * depth, y, z + t[1] * side + normal[1] * depth];
    const faces = {
      front: [[p(-halfWidth, front, y0), p(halfWidth, front, y0), p(halfWidth, front, y1), p(-halfWidth, front, y1)], [normal[0], 0, normal[1]]],
      back: [[p(halfWidth, back, y0), p(-halfWidth, back, y0), p(-halfWidth, back, y1), p(halfWidth, back, y1)], [-normal[0], 0, -normal[1]]],
      left: [[p(-halfWidth, back, y0), p(-halfWidth, front, y0), p(-halfWidth, front, y1), p(-halfWidth, back, y1)], [-t[0], 0, -t[1]]],
      right: [[p(halfWidth, front, y0), p(halfWidth, back, y0), p(halfWidth, back, y1), p(halfWidth, front, y1)], [t[0], 0, t[1]]],
      bottom: [[p(-halfWidth, back, y0), p(halfWidth, back, y0), p(halfWidth, front, y0), p(-halfWidth, front, y0)], [0, -1, 0]],
      top: [[p(-halfWidth, back, y1), p(-halfWidth, front, y1), p(halfWidth, front, y1), p(halfWidth, back, y1)], [0, 1, 0]],
    };
    checkOmit(omit, Object.keys(faces), "box");
    for (const [name, [corners, n]] of Object.entries(faces)) face(target, corners, n, omit.includes(name));
  }
  // Ear clipping for non-convex roofs and floors; the bundle omits ShapeUtils.
  function slab(target, polygon, y, up) {
    const area = shoelace(polygon);
    const ring = polygon.map((_, i) => i), normal = [0, up ? 1 : -1, 0];
    const convex = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * area > 0;
    const contains = (a, b, c, q) => convex(a, b, q) && convex(b, c, q) && convex(c, a, q);
    for (let guard = 0; ring.length > 3 && guard < polygon.length * polygon.length; guard += 1) {
      for (let i = 0; i < ring.length; i += 1) {
        const [a, b, c] = [ring[(i + ring.length - 1) % ring.length], ring[i], ring[(i + 1) % ring.length]].map((k) => polygon[k]);
        if (!convex(a, b, c) || ring.some((k) => ![a, b, c].includes(polygon[k]) && contains(a, b, c, polygon[k]))) continue;
        triangle(target, [point(a, y), point(b, y), point(c, y)], [normal, normal, normal]);
        ring.splice(i, 1);
        break;
      }
    }
    if (ring.length > 3) throw new Error(`A slab's polygon could not be triangulated; ${ring.length} vertices remain, so check it for repeated or crossing edges.`);
    triangle(target, ring.map((k) => point(polygon[k], y)), [normal, normal, normal]);
  }
  // Walls rise through the given heights, so a seam can land on a drawn corner; a roof
  // and a floor close the volume. Returns the plan polygon.
  function prism(target, runs, heights, { omit = [] } = {}) {
    const polygon = polygonOf(runs);
    if (shoelace(polygon) >= 0) throw new Error("A prism's plan must run counterclockwise from above, or its walls face inward.");
    runs.forEach((run) => heights.slice(1).forEach((top, i) => panel(target, run, 0, run.length, heights[i], top, 0)));
    checkOmit(omit, ["top", "bottom"], "prism");
    for (const [name, y, up] of [["top", heights.at(-1), true], ["bottom", heights[0], false]]) {
      if (!omit.includes(name)) slab(target, polygon, y, up);
      else omitted.push({ batch: target.name, corners: polygon.map((corner) => point(corner, y)), normal: [0, up ? 1 : -1, 0] });
    }
    return polygon;
  }

  // Batches become meshes in creation order, with silhouette lines for `outlines` only.
  function finish({ height, outlines = [], threshold = 20, opacity = 0.3 }) {
    const meshes = new Map(batches.map((data) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
      if (data.surface.vertexColors) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
      const mesh = new THREE.Mesh(geometry, data.surface);
      mesh.name = data.name;
      mesh.castShadow = mesh.receiveShadow = true;
      building.add(mesh);
      return [data, mesh];
    }));
    const lines = outlines.flatMap((data) => [...new THREE.EdgesGeometry(meshes.get(data).geometry, threshold).getAttribute("position").array]);
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity }));
    edges.name = "silhouette edges";
    building.add(edges);
    return {
      building,
      height,
      triangleCount: batches.reduce((count, data) => count + data.positions.length / 9, 0),
      setHighlighted(highlighted) {
        materials.forEach((surface) => surface.emissive.setHex(highlighted ? 0x222222 : 0x000000));
      },
      setWireframe(enabled) {
        materials.forEach((surface) => { surface.wireframe = enabled; });
        edges.visible = !enabled;
      },
    };
  }

  return { building, material, batch, triangle, quad, panel, ledge, band, box, slab, prism, finish };
}
