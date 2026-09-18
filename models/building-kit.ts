import * as THREE from "../vendor/three-r186.js";

// Shared geometry for fitted skyline models. A plan is a list of runs, straight or
// arced, counterclockwise from above, so each run's outward normal is to its right.
// Units are meters; +x is east (right in the skyline view) and +z is south.
export const deg = Math.PI / 180;

// Ground-plan vectors and points; Vec3 adds the height coordinate.
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Normal = Vec2;

export interface Run {
  length: number;
  pieces(s0?: number, s1?: number): number;
  at(s: number, offset?: number): Vec2;
  normal(s?: number): Normal;
}
export type Plan = Run[];

export function line(a: Vec2, b: Vec2): Run {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tangent = [(b[0] - a[0]) / length, (b[1] - a[1]) / length] as Vec2;
  const normal = [-tangent[1], tangent[0]] as Vec2;
  return {
    length,
    pieces: () => 1,
    at: (s, offset = 0) => [a[0] + tangent[0] * s + normal[0] * offset, a[1] + tangent[1] * s + normal[1] * offset] as Vec2,
    normal: () => normal,
  };
}

// Angles measure the outward normal from +z toward +x. A concave arc keeps its
// center outside the building, so the same angle gives the same normal. Facets stay
// within `step`; 2.4° keeps silhouettes round without faceted toon bands.
export function arc(center: Vec2, radius: number, from: number, to: number, concave = false, step = 2.4 * deg): Run {
  const length = radius * Math.abs(to - from);
  const angle = (s: number) => from + (to - from) * s / length;
  const side = concave ? -1 : 1;
  return {
    length,
    pieces: (s0 = 0, s1 = length) => Math.max(1, Math.ceil(Math.abs(to - from) * (s1 - s0) / length / step - 1e-9)),
    at(s, offset = 0) {
      const a = angle(s), reach = side * radius + offset;
      return [center[0] + Math.sin(a) * reach, center[1] + Math.cos(a) * reach] as Vec2;
    },
    normal: (s = 0) => [Math.sin(angle(s)), Math.cos(angle(s))] as Vec2,
  };
}

// A gentle convex arc between two corners, bulging outward by its sagitta.
export function bulge(a: Vec2, b: Vec2, sagitta: number, step?: number): Run {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const radius = chord * chord / (8 * sagitta) + sagitta / 2;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Vec2;
  const inward = [(b[1] - a[1]) / chord, -(b[0] - a[0]) / chord] as Vec2;
  const center = [mid[0] + inward[0] * (radius - sagitta), mid[1] + inward[1] * (radius - sagitta)] as Vec2;
  const angleOf = (p: Vec2) => Math.atan2(p[0] - center[0], p[1] - center[1]);
  let from = angleOf(a), to = angleOf(b);
  if (to < from) to += Math.PI * 2;
  return arc(center, radius, from, to, false, step);
}

// A rectangular plan from its bounds, counterclockwise from above: the south, east, north,
// then west faces. North is the smaller z.
export function rectangle(west: number, east: number, north: number, south: number): Plan {
  const [sw, se, ne, nw] = [[west, south], [east, south], [east, north], [west, north]] as [Vec2, Vec2, Vec2, Vec2];
  return [line(sw, se), line(se, ne), line(ne, nw), line(nw, sw)];
}

export const evenly = (length: number, count: number) => Array.from({ length: count + 1 }, (_, i) => length * i / count);
export const cornerNormal = (a: Vec2, b: Vec2): Vec2 => { const l = Math.hypot(a[0] + b[0], a[1] + b[1]); return [(a[0] + b[0]) / l, (a[1] + b[1]) / l]; };
export const station = (run: Run, s: number): Station => ({ at: run.at(s), normal: run.normal(s) });
// A plan point offset outward along a station's normal and sideways along its run.
export const along = ({ at, normal }: Station, offset: number, side = 0): Vec2 => [at[0] + normal[0] * offset + normal[1] * side, at[1] + normal[1] * offset - normal[0] * side];
export const point = ([x, z]: Vec2, y: number): Vec3 => [x, y, z];
export interface Station {
  at: Vec2;
  normal: Normal;
}

// The plan outline with the same facets the walls use, so roofs meet them edge to edge.
export function polygonOf(runs: Plan): Vec2[] {
  return runs.flatMap((run) => { const n = run.pieces(0, run.length); return Array.from({ length: n }, (_, i) => run.at(run.length * i / n)); });
}
// Twice the signed area with +z south, so a counterclockwise plan from above is negative.
const shoelace = (polygon: Vec2[]) => polygon.reduce((sum, [x, z], i) => { const [x2, z2] = polygon[(i + 1) % polygon.length]!; return sum + x * z2 - x2 * z; }, 0);
export function inside(polygon: Vec2[], [x, z]: Vec2): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, zi] = polygon[i]!, [xj, zj] = polygon[j]!;
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) result = !result;
  }
  return result;
}

export interface BatchData {
  name: string;
  surface: THREE.MeshToonMaterial;
  positions: number[];
  normals: number[];
  colors: number[];
}

export interface Omission {
  batch: string;
  corners: Vec3[];
  normal: Vec3;
}

export interface BandOptions {
  omit?: string[];
  from?: number;
  to?: number;
  closed?: boolean;
  visible?: (point: Vec2, y: number) => boolean;
}

export interface BoxOptions {
  omit?: string[];
}

export interface PrismOptions {
  omit?: string[];
}

export interface FinishOptions {
  height: number;
  outlines?: BatchData[];
  threshold?: number;
  opacity?: number;
}

export interface BuildingModel {
  building: THREE.Group;
  height: number;
  triangleCount: number;
  setHighlighted(highlighted: boolean): void;
  setWireframe(enabled: boolean): void;
}

export interface Builder {
  building: THREE.Group;
  material(color: number, extras?: THREE.MeshToonMaterialParameters): THREE.MeshToonMaterial;
  batch(name: string, surface: THREE.MeshToonMaterial): BatchData;
  triangle(target: BatchData, points: Vec3[], normals: Vec3[], color?: THREE.Color): void;
  quad(target: BatchData, points: [Vec3, Vec3, Vec3, Vec3], normals: Vec3[], color?: THREE.Color): void;
  panel(target: BatchData, run: Run, s0: number, s1: number, y0: number, y1: number, offset: number, color?: THREE.Color): void;
  ledge(target: BatchData, run: Run, s0: number, s1: number, y: number, inner: number, outer: number, up: boolean): void;
  band(target: BatchData, runs: Plan, y0: number, y1: number, proud: number, options?: BandOptions): void;
  box(target: BatchData, at: Vec2, normal: Normal, halfWidth: number, back: number, front: number, y0: number, y1: number, options?: BoxOptions): void;
  slab(target: BatchData, polygon: Vec2[], y: number, up: boolean): void;
  prism(target: BatchData, runs: Plan, heights: number[], options?: PrismOptions): Vec2[];
  finish(options: FinishOptions): BuildingModel;
}

// A model under construction: toon materials, batched geometry, and the standard model
// API once finished. Solids are closed by default. A caller may omit only faces another
// surface covers, by name, and each omission is kept in building.userData.omitted so a
// test can prove the cover.
export function createBuilder(name: string, buildingId: string, { gradient = [70, 135, 200, 255] }: { gradient?: number[] } = {}): Builder {
  const building = new THREE.Group();
  building.name = name;
  building.userData["buildingId"] = buildingId;
  const omitted = building.userData["omitted"] = [] as Omission[];
  const ramp = new THREE.DataTexture(new Uint8Array(gradient), gradient.length, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const materials: THREE.MeshToonMaterial[] = [], batches: BatchData[] = [];
  const material = (color: number, extras: THREE.MeshToonMaterialParameters = {}) => {
    const surface = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extras });
    materials.push(surface);
    return surface;
  };
  // Each batch is one draw call. Normals are analytic, so arc facets shade as a curve.
  const batch = (batchName: string, surface: THREE.MeshToonMaterial): BatchData => {
    const data: BatchData = { name: batchName, surface, positions: [], normals: [], colors: [] };
    batches.push(data);
    return data;
  };

  const always = () => true;
  // Runs must hand over end to start, and a loop must come back to where it began;
  // otherwise the walls leave a gap no omission records.
  const joins = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-6;
  function checkJoins(runs: Plan, label: string, loop: boolean) {
    runs.forEach((run, index) => {
      const next = runs[index + 1];
      if (next && !joins(run.at(run.length), next.at(0))) throw new Error(`A ${label}'s runs must join end to start.`);
    });
    const last = runs.at(-1)!;
    if (loop && !joins(last.at(last.length), runs[0]!.at(0))) throw new Error(`A ${label}'s runs must return to their start.`);
  }
  const white = new THREE.Color(1, 1, 1);
  // Winding follows the first normal, so every helper stays outward-facing.
  function triangle(target: BatchData, points: Vec3[], normals: Vec3[], color: THREE.Color = white) {
    const [a, b, c] = points as [Vec3, Vec3, Vec3], n = normals[0]!;
    const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const facing = (u[1] * v[2] - u[2] * v[1]) * n[0] + (u[2] * v[0] - u[0] * v[2]) * n[1] + (u[0] * v[1] - u[1] * v[0]) * n[2];
    for (const i of facing < 0 ? [0, 2, 1] : [0, 1, 2]) {
      target.positions.push(...points[i]!);
      target.normals.push(...normals[i]!);
      target.colors.push(color.r, color.g, color.b);
    }
  }
  function quad(target: BatchData, [a, b, c, d]: [Vec3, Vec3, Vec3, Vec3], normals: Vec3[], color?: THREE.Color) {
    const n = normals.length === 1 ? [normals[0]!, normals[0]!, normals[0]!, normals[0]!] : normals as [Vec3, Vec3, Vec3, Vec3];
    triangle(target, [a, b, c], [n[0]!, n[1]!, n[2]!], color);
    triangle(target, [a, c, d], [n[0]!, n[2]!, n[3]!], color);
  }
  // Names a face that does not exist, so a typo cannot silently keep it.
  const checkOmit = (omit: string[] | undefined, allowed: string[], what: string) => {
    const unknown = (omit ?? []).find((faceName) => !allowed.includes(faceName));
    if (unknown) throw new Error(`A ${what} has no "${unknown}" face; it has ${allowed.join(", ")}.`);
  };
  // A flat face of a solid, unless the caller omitted it as covered.
  function face(target: BatchData, corners: [Vec3, Vec3, Vec3, Vec3], normal: Vec3, skip: boolean) {
    if (skip) omitted.push({ batch: target.name, corners, normal });
    else quad(target, corners, [normal]);
  }

  // A rectangle mapped onto a plan run, split into facets that follow an arc. Panels
  // are single surfaces for panes and trim, not solids.
  function panel(target: BatchData, run: Run, s0: number, s1: number, y0: number, y1: number, offset: number, color?: THREE.Color) {
    const n = run.pieces(s0, s1);
    for (let i = 0; i < n; i += 1) {
      const sa = s0 + (s1 - s0) * i / n, sb = s0 + (s1 - s0) * (i + 1) / n;
      const [pa, pb] = [run.at(sa, offset), run.at(sb, offset)];
      const [na, nb] = [run.normal(sa), run.normal(sb)].map(([x, z]) => [x, 0, z] as Vec3) as [Vec3, Vec3];
      quad(target, [[pa[0], y0, pa[1]], [pb[0], y0, pb[1]], [pb[0], y1, pb[1]], [pa[0], y1, pa[1]]], [na, nb, nb, na], color);
    }
  }
  // A horizontal strip between two offsets from a run: a soffit or a ledge top.
  function ledge(target: BatchData, run: Run, s0: number, s1: number, y: number, inner: number, outer: number, up: boolean) {
    const n = run.pieces(s0, s1), normal = [[0, up ? 1 : -1, 0] as Vec3] as [Vec3];
    for (let i = 0; i < n; i += 1) {
      const sa = s0 + (s1 - s0) * i / n, sb = s0 + (s1 - s0) * (i + 1) / n;
      quad(target, [point(run.at(sa, inner), y), point(run.at(sb, inner), y), point(run.at(sb, outer), y), point(run.at(sa, outer), y)], normal);
    }
  }
  // A projecting band along consecutive runs, chamfered at convex corners. It is closed
  // by its back, soffit, top, and start and end returns unless `omit` names them; a
  // `closed` band, such as a parapet around a whole roof, turns its last corner onto its
  // first run instead of ending. `visible` skips pieces buried inside another volume, and
  // the band closes itself wherever it stops and reopens.
  function band(target: BatchData, runs: Plan, y0: number, y1: number, proud: number, { omit = [], from = 0, to = Infinity, closed = false, visible = always }: BandOptions = {}) {
    if (closed && (from !== 0 || to !== Infinity)) throw new Error("A closed band wraps whole runs, so it takes no from or to.");
    if (closed && visible !== always) throw new Error("A closed band cannot also be trimmed by visible; split it into open bands.");
    checkJoins(runs, closed ? "closed band" : "band", closed);
    const faceNames = ["back", "soffit", "top", "start", "end"];
    checkOmit(omit, faceNames, "band");
    const [back, soffit, top, start, end] = faceNames.map((faceName) => !omit.includes(faceName)) as [boolean, boolean, boolean, boolean, boolean];
    const endFace = (run: Run, s: number, sign: number, keep: boolean) => {
      const [inner, outer] = [run.at(s), run.at(s, proud)], n = run.normal(s);
      face(target, [point(inner, y0), point(outer, y0), point(outer, y1), point(inner, y1)], [n[1] * sign, 0, -n[0] * sign], !keep);
    };
    // Outward normals turn counterclockwise from above at a convex corner, opening a wedge to fill.
    const cornerWedge = (run: Run, next: Run) => {
      const at = run.at(run.length), n1 = run.normal(run.length), n2 = next.normal(0);
      const turn = n1[0] * n2[1] - n1[1] * n2[0];
      // Runs that double back share a point but face opposite ways, so no wedge can close
      // the joint and both returns are missing: a hole no omission would record. Runs that
      // merely continue straight face the same way and need no wedge at all.
      if (Math.abs(turn) <= 1e-6 && n1[0] * n2[0] + n1[1] * n2[1] < 0) throw new Error("A band cannot double back on itself; end the band and start another.");
      if (turn > 1e-6) throw new Error("A band cannot turn a concave corner; split it into two bands there.");
      if (turn >= -1e-6) return;
      const a = run.at(run.length, proud), b = next.at(0, proud), mitre = cornerNormal(n1, n2);
      quad(target, [point(a, y0), point(b, y0), point(b, y1), point(a, y1)], [[mitre[0], 0, mitre[1]]]);
      if (soffit) triangle(target, [point(at, y0), point(b, y0), point(a, y0)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
      else omitted.push({ batch: target.name, corners: [point(at, y0), point(b, y0), point(a, y0)], normal: [0, -1, 0] });
      if (top) triangle(target, [point(at, y1), point(a, y1), point(b, y1)], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
      else omitted.push({ batch: target.name, corners: [point(at, y1), point(a, y1), point(b, y1)], normal: [0, 1, 0] });
    };
    const pieces: { run: Run; index: number; sa: number; sb: number; shown: boolean }[] = [];
    runs.forEach((run, index) => {
      const first = index === 0 ? from : 0, last = Math.min(run.length, index === runs.length - 1 ? to : Infinity);
      if (last - first <= 1e-9) return;
      const count = run.pieces(first, last);
      for (let i = 0; i < count; i += 1) {
        const sa = first + (last - first) * i / count, sb = first + (last - first) * (i + 1) / count;
        pieces.push({ run, index, sa, sb, shown: visible(run.at((sa + sb) / 2, proud + 0.2), y0) });
      }
    });
    let drawn = false, opened = false, previous: (typeof pieces)[number] | null = null;
    for (const piece of pieces) {
      const { run, sa, sb, shown } = piece;
      // A closed band opens with no return: its wrap-around corner closes it instead.
      if (shown && !drawn && !(closed && !opened)) endFace(run, sa, -1, opened ? true : start);
      if (!shown && drawn && previous) endFace(previous.run, previous.sb, 1, true);
      if (shown && drawn && previous && previous.index !== piece.index) cornerWedge(previous.run, run);
      drawn = shown;
      previous = piece;
      if (!shown) continue;
      opened = true;
      panel(target, run, sa, sb, y0, y1, proud);
      const [ia, ib, oa, ob] = [run.at(sa), run.at(sb), run.at(sa, proud), run.at(sb, proud)];
      if (soffit) ledge(target, run, sa, sb, y0, 0, proud, false);
      else omitted.push({ batch: target.name, corners: [point(ia, y0), point(ib, y0), point(ob, y0), point(oa, y0)], normal: [0, -1, 0] });
      if (top) ledge(target, run, sa, sb, y1, 0, proud, true);
      else omitted.push({ batch: target.name, corners: [point(ia, y1), point(ib, y1), point(ob, y1), point(oa, y1)], normal: [0, 1, 0] });
      const [na, nb] = [run.normal(sa), run.normal(sb)].map(([x, z]) => [-x, 0, -z] as Vec3) as [Vec3, Vec3];
      const backCorners = [point(ib, y0), point(ia, y0), point(ia, y1), point(ib, y1)] as [Vec3, Vec3, Vec3, Vec3];
      if (back) quad(target, backCorners, [nb, na, na, nb]);
      else omitted.push({ batch: target.name, corners: backCorners, normal: [(na[0] + nb[0]) / 2, 0, (na[2] + nb[2]) / 2] });
    }
    if (drawn && closed && previous) cornerWedge(previous.run, runs[0]!);
    else if (drawn && previous) endFace(previous.run, previous.sb, 1, end);
  }
  // A box on a local frame: fins, mullions, posts, and rooftop masses. Depths run along
  // the frame's normal from `back` to `front`.
  function box(target: BatchData, [x, z]: Vec2, normal: Normal, halfWidth: number, back: number, front: number, y0: number, y1: number, { omit = [] }: BoxOptions = {}) {
    const t = [normal[1], -normal[0]] as Vec2;
    const p = (side: number, depth: number, y: number): Vec3 => [x + t[0] * side + normal[0] * depth, y, z + t[1] * side + normal[1] * depth];
    const faces = {
      front: [[p(-halfWidth, front, y0), p(halfWidth, front, y0), p(halfWidth, front, y1), p(-halfWidth, front, y1)], [normal[0], 0, normal[1]]],
      back: [[p(halfWidth, back, y0), p(-halfWidth, back, y0), p(-halfWidth, back, y1), p(halfWidth, back, y1)], [-normal[0], 0, -normal[1]]],
      left: [[p(-halfWidth, back, y0), p(-halfWidth, front, y0), p(-halfWidth, front, y1), p(-halfWidth, back, y1)], [-t[0], 0, -t[1]]],
      right: [[p(halfWidth, front, y0), p(halfWidth, back, y0), p(halfWidth, back, y1), p(halfWidth, front, y1)], [t[0], 0, t[1]]],
      bottom: [[p(-halfWidth, back, y0), p(halfWidth, back, y0), p(halfWidth, front, y0), p(-halfWidth, front, y0)], [0, -1, 0]],
      top: [[p(-halfWidth, back, y1), p(-halfWidth, front, y1), p(halfWidth, front, y1), p(halfWidth, back, y1)], [0, 1, 0]],
    } satisfies Record<string, [Vec3[], Vec3]>;
    checkOmit(omit, Object.keys(faces), "box");
    for (const [faceName, [corners, n]] of Object.entries(faces)) face(target, corners as [Vec3, Vec3, Vec3, Vec3], n as Vec3, omit.includes(faceName));
  }
  // Ear clipping for non-convex roofs and floors; the bundle omits ShapeUtils.
  function slab(target: BatchData, polygon: Vec2[], y: number, up: boolean) {
    const area = shoelace(polygon);
    const ring = polygon.map((_, i) => i), normal = [0, up ? 1 : -1, 0] as Vec3;
    const convex = (a: number, b: number, c: number) => {
      const [pa, pb, pc] = [polygon[a]!, polygon[b]!, polygon[c]!];
      return ((pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])) * area > 0;
    };
    const touches = (a: number, b: number, q: Vec2) => {
      const [pa, pb] = [polygon[a]!, polygon[b]!];
      return ((pb[0] - pa[0]) * (q[1] - pa[1]) - (pb[1] - pa[1]) * (q[0] - pa[0])) * area >= -1e-9;
    };
    const contains = (a: number, b: number, c: number, q: Vec2) => touches(a, b, q) && touches(b, c, q) && touches(c, a, q);
    for (let guard = 0; ring.length > 3 && guard < polygon.length * polygon.length; guard += 1) {
      for (let i = 0; i < ring.length; i += 1) {
        const [a, b, c] = [ring[(i + ring.length - 1) % ring.length]!, ring[i]!, ring[(i + 1) % ring.length]!];
        if (!convex(a, b, c) || ring.some((k) => !([a, b, c] as number[]).includes(k) && contains(a, b, c, polygon[k]!))) continue;
        triangle(target, [point(polygon[a]!, y), point(polygon[b]!, y), point(polygon[c]!, y)], [normal, normal, normal]);
        ring.splice(i, 1);
        break;
      }
    }
    if (ring.length > 3) throw new Error(`A slab's polygon could not be triangulated; ${ring.length} vertices remain, so check it for repeated or crossing edges.`);
    triangle(target, ring.map((k) => point(polygon[k]!, y)), [normal, normal, normal]);
  }
  // Walls rise through the given heights, so a seam can land on a drawn corner; a roof
  // and a floor close the volume. Returns the plan polygon.
  function prism(target: BatchData, runs: Plan, heights: number[], { omit = [] }: PrismOptions = {}) {
    checkJoins(runs, "prism", true);
    const polygon = polygonOf(runs);
    if (shoelace(polygon) >= 0) throw new Error("A prism's plan must run counterclockwise from above, or its walls face inward.");
    runs.forEach((run) => heights.slice(1).forEach((top, i) => panel(target, run, 0, run.length, heights[i]!, top, 0)));
    checkOmit(omit, ["top", "bottom"], "prism");
    for (const [faceName, y, up] of [["top", heights.at(-1)!, true], ["bottom", heights[0]!, false]] as const) {
      if (!omit.includes(faceName)) slab(target, polygon, y, up);
      else omitted.push({ batch: target.name, corners: polygon.map((corner) => point(corner, y)), normal: [0, up ? 1 : -1, 0] });
    }
    return polygon;
  }

  // Batches become meshes in creation order, with silhouette lines for `outlines` only.
  function finish({ height, outlines = [], threshold = 20, opacity = 0.3 }: FinishOptions): BuildingModel {
    const meshes = new Map(batches.map((data) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
      if (data.surface.vertexColors) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
      const mesh = new THREE.Mesh(geometry, data.surface);
      mesh.name = data.name;
      mesh.castShadow = mesh.receiveShadow = true;
      building.add(mesh);
      return [data, mesh] as const;
    }));
    const lines = outlines.flatMap((data) => [...new THREE.EdgesGeometry(meshes.get(data)!.geometry, threshold).getAttribute("position").array]);
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
