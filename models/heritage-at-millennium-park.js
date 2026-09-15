import * as THREE from "../vendor/three-r186.js";

// Plan and heights are fitted numerically to the source SVG through the skyline
// camera: corners, mullions, and crown fins follow the drawing. The camera-facing flat
// face and bow radius are about 1.3x the OpenStreetMap trace; the hidden north and west
// faces are simplified closures (a straight north face and one shallow west bulge), not
// that outline. Units are meters; +x is east (right in the skyline view), +z is south.
const deg = Math.PI / 180;
// Two facets per bow bay keep the silhouette round without faceted toon bands.
const arcStep = 2.4 * deg;

// The drawing's floor pitch; its six-floor bands and the lower tier's three-floor
// bands share one grid. Floor 0 is the crown base, floor 30 the lower-tier ledge.
const floorHeight = 3.794;
const crownBase = 175.4;
const level = (floor) => crownBase - floor * floorHeight;
const parapet = 191.3, capSoffit = 189.1, capProud = 1.2, bandProud = 0.34;
const lowerParapet = 74.3, lowerSoffit = lowerParapet - 2.6, lowerLedge = level(30), lowerCapProud = 0.66;
const screenTop = 204.6, penthouseTop = 202.3;

function line(a, b) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tangent = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  // Runs are counterclockwise from above, so the outward normal is to the right.
  const normal = [-tangent[1], tangent[0]];
  return {
    length,
    pieces: () => 1,
    at: (s, offset = 0) => [a[0] + tangent[0] * s + normal[0] * offset, a[1] + tangent[1] * s + normal[1] * offset],
    normal: () => normal,
  };
}

// Angles measure the outward normal from +z toward +x. A concave arc keeps its
// center outside the building, so the same angle gives the same normal.
function arc(center, radius, from, to, concave = false) {
  const length = radius * Math.abs(to - from);
  const angle = (s) => from + (to - from) * s / length;
  const side = concave ? -1 : 1;
  return {
    length,
    pieces: (s0, s1) => Math.max(1, Math.ceil(Math.abs(to - from) * (s1 - s0) / length / arcStep - 1e-9)),
    at(s, offset = 0) {
      const a = angle(s), reach = side * radius + offset;
      return [center[0] + Math.sin(a) * reach, center[1] + Math.cos(a) * reach];
    },
    normal: (s) => [Math.sin(angle(s)), Math.cos(angle(s))],
  };
}

// A gentle convex arc between two corners, bulging outward by its sagitta.
function bulge(a, b, sagitta) {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const radius = chord * chord / (8 * sagitta) + sagitta / 2;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const inward = [(b[1] - a[1]) / chord, -(b[0] - a[0]) / chord];
  const center = [mid[0] + inward[0] * (radius - sagitta), mid[1] + inward[1] * (radius - sagitta)];
  const angleOf = (p) => Math.atan2(p[0] - center[0], p[1] - center[1]);
  let from = angleOf(a), to = angleOf(b);
  if (to < from) to += Math.PI * 2;
  return arc(center, radius, from, to);
}

// Tower plan, left to right in the skyline view: the south stub, a flat south face,
// the convex east bow, and a flat north strip along the bow's end tangent.
const joint = [13, 23];
const stubLength = 12, stubDepth = 4.4, flatLength = 18.7, stripLength = 13.95;
const stubA = [joint[0] - flatLength - stubLength, joint[1] + stubDepth];
const stubB = [joint[0] - flatLength, joint[1] + stubDepth];
const stubC = [joint[0] - flatLength, joint[1]];
const bowStart = 63 * deg, bowEnd = bowStart + 38.4 * deg, bowRadius = 57;
const bow = arc([joint[0] - bowRadius * Math.sin(bowStart), joint[1] - bowRadius * Math.cos(bowStart)], bowRadius, bowStart, bowEnd);
const bowEndPoint = bow.at(bow.length);
const strip = line(bowEndPoint, [bowEndPoint[0] + stripLength * Math.cos(bowEnd), bowEndPoint[1] - stripLength * Math.sin(bowEnd)]);
const northEast = strip.at(strip.length);
const northWest = [-13, northEast[1]], westEnd = [stubA[0], 21];
const flatFace = line(stubC, joint), north = line(northEast, northWest), westBulge = bulge(northWest, westEnd, 2.5);
const tower = [line(stubA, stubB), line(stubB, stubC), flatFace, bow, strip, north, westBulge, line(westEnd, stubA)];

// Lower tier: a shallow concave Garland Court face whose north end stands just
// proud of the bow. Its unlit south part is trimmed along the skyline view's line
// of sight, turned 3° away, so nothing appears left of the drawn silhouette.
const lowerNorth = bow.at(12.1, 0.3);
const lowerHeading = 77.1 * deg, lowerRadius = 100, lowerLength = 49.3, lowerSouthLength = 3.56;
const lowerCenter = [lowerNorth[0] + lowerRadius * Math.sin(lowerHeading), lowerNorth[1] + lowerRadius * Math.cos(lowerHeading)];
const lowerFace = arc(lowerCenter, lowerRadius, lowerHeading + lowerLength / lowerRadius, lowerHeading, true);
const lowerSE = lowerFace.at(0), lowerSW = [lowerSE[0] - lowerSouthLength, lowerSE[1]];
const sightline = 38.5 * deg, lowerWestX = stubC[0] - 1.3;
const chamferLength = (lowerSW[0] - lowerWestX) / Math.sin(sightline);
const lowerChamfer = [lowerWestX, lowerSW[1] - chamferLength * Math.cos(sightline)];
const lowerWestNorth = [lowerWestX, lowerNorth[1]];
const lowerTier = [line(lowerSW, lowerSE), lowerFace, line(lowerNorth, lowerWestNorth), line(lowerWestNorth, lowerChamfer), line(lowerChamfer, lowerSW)];

// Bay stations along each run, in meters from its start. Hidden runs place mullions
// on interior stations; the camera-facing runs use the fourteen drawn mullions below.
const flatBay = (flatLength - 1) / 3, lowerPitch = 4.84, lowerMargin = 3.85;
const evenly = (length, count) => Array.from({ length: count + 1 }, (_, i) => length * i / count);
const stripStations = [6.35, 12.7];
const towerStations = [
  [0, 6, stubLength], [0, stubDepth], [0, 1, 1 + flatBay, 1 + 2 * flatBay, flatLength], evenly(bow.length, 8),
  [0, ...stripStations, strip.length], evenly(north.length, 6), evenly(westBulge.length, 10), evenly(tower[7].length, 2),
];
const lowerFinStations = Array.from({ length: 10 }, (_, i) => lowerMargin + i * lowerPitch);
const lowerStations = [[0, lowerSouthLength], [0, ...lowerFinStations, lowerLength], [0, 1], evenly(lowerTier[3].length, 4), evenly(chamferLength, 7)];

const cornerNormal = (a, b) => { const l = Math.hypot(a[0] + b[0], a[1] + b[1]); return [(a[0] + b[0]) / l, (a[1] + b[1]) / l]; };
const station = (run, s) => ({ at: run.at(s), normal: run.normal(s) });
const jointStation = { at: joint, normal: cornerNormal(flatFace.normal(), bow.normal(0)) };
// Fourteen drawn mullions: three on the flat face, the joint, eight bow bays, two on
// the strip. The twelfth, at the bow's end, is the center of the balcony stack.
const mullions = [
  ...[1, 1 + flatBay, 1 + 2 * flatBay].map((s) => station(flatFace, s)), jointStation,
  ...evenly(bow.length, 8).slice(1).map((s) => station(bow, s)), ...stripStations.map((s) => station(strip, s)),
];
const balconyStack = mullions[11];
const crownFins = mullions.slice(1);
// The crown continues around the hidden north and west faces, so orbits find it finished.
const hiddenFins = [
  ...towerStations[5].slice(1, -1).map((s) => station(north, s)),
  ...towerStations[6].slice(1, -1).map((s) => station(westBulge, s)),
];
const lowerFins = lowerFinStations.map((s) => station(lowerFace, s));
// A plan point offset outward along a station's normal and sideways along its run.
const along = ({ at, normal }, offset, side = 0) => [at[0] + normal[0] * offset + normal[1] * side, at[1] + normal[1] * offset - normal[0] * side];

// Screen strip over the north-east corner; the lower part of the same block,
// with its open cornice frame, steps back to the west.
const screen = { east: northEast[0] - 0.5, north: northEast[1], width: 7.4, length: 44.08 };
const penthouse = { west: screen.east - screen.width - 14.74, front: screen.north + screen.length - 1.04, overhang: 1.1 };
// The crown cap and thick bands start under the first fin, as drawn. The cap stops
// short of the north-east corner to stay inside the drawn silhouette, and resumes on
// the hidden north face once the tower itself hides its projection.
const capStart = 5.5, capEnd = strip.length - 2, northCapStart = 1.6;
const finWidth = 1.3, finDepth = 0.9, lowerFinWidth = 1.5, lowerFinDepth = 0.7;
const point = ([x, z], y) => [x, y, z];
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Features the skyline test projects against the drawing, derived from the geometry above.
export const heritageFeatures = {
  screenFrontTop: [screen.east, screenTop, screen.north + screen.length],
  screenNorthTop: [screen.east, screenTop, screen.north],
  screenSouthTop: [screen.east - screen.width, screenTop, screen.north + screen.length],
  penthouseCorniceTip: [penthouse.west - penthouse.overhang, penthouseTop, penthouse.front + penthouse.overhang],
  stubFrontRoof: point(stubB, parapet),
  stubLeftRoof: point(stubA, parapet),
  reentrantRoof: point(stubC, parapet),
  // The cap crests on the outer edge of its chamfer over the joint.
  capApex: point(midpoint(flatFace.at(flatLength, capProud), bow.at(0, capProud)), parapet),
  capSouthEnd: point(flatFace.at(capStart, capProud), parapet),
  capNorthEnd: point(strip.at(capEnd, capProud), parapet),
  crownFootNorth: point(northEast, crownBase),
  lowerCapSouthCorner: point(lowerFace.at(0, lowerCapProud), lowerParapet),
  lowerCapNorth: point(lowerFace.at(lowerLength, lowerCapProud), lowerParapet),
  lowerFinFootNorth: point(along(lowerFins.at(-1), lowerFinDepth, lowerFinWidth / 2), lowerLedge),
  // The lower tier's leftmost wall corner, and the cap and band overhangs beside it.
  lowerSouthWest: [
    point(lowerSW, lowerParapet), point(lowerSW, 0),
    point(lowerTier[0].at(0, lowerCapProud), lowerParapet), point(lowerTier[0].at(0, bandProud), lowerLedge),
  ],
  mullions: mullions.map((m) => point(m.at, 120)),
  crownFins: crownFins.map((m) => point(along(m, finDepth / 2), crownBase + 6)),
  lowerFins: lowerFins.map((m) => point(along(m, lowerFinDepth / 2), lowerLedge + 4)),
  bowFacade: point(bow.at(bow.length / 2, 0.05), 130),
  // Low on the strip just short of the north-east corner, where the drawing shows Kemper's
  // left face in front of Heritage.
  northStripFacade: point(strip.at(strip.length - 0.5, 0.05), 60),
};

function polygonOf(runs) {
  return runs.flatMap((run) => { const n = run.pieces(0, run.length); return Array.from({ length: n }, (_, i) => run.at(run.length * i / n)); });
}
function inside(polygon, [x, z]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) result = !result;
  }
  return result;
}

export function createHeritageAtMillenniumParkBuilding() {
  const building = new THREE.Group();
  building.name = "The Heritage at Millennium Park";
  building.userData.buildingId = "building-heritage-at-millennium-park";
  const gradient = new THREE.DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const material = (color, extras = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...extras });
  // Base colors sit off the drawing's tones (a #474747 face, #212121 bands, #787878 precast,
  // a #919191 screen) so the toon-lit result lands near them.
  const facade = material(0x363636);
  const glass = material(0xffffff, { vertexColors: true });
  const relief = material(0x141414);
  const precast = material(0x8c8c8c);
  const mechanical = material(0xa4a4a4);
  const materials = [facade, glass, relief, precast, mechanical];

  // Each batch is one draw call. Normals are analytic, so bow facets shade as a curve.
  const batch = (name, surface) => ({ name, surface, positions: [], normals: [], colors: [] });
  const shell = batch("closed tower and lower-tier shells", facade);
  const panes = batch("window panes", glass);
  const dark = batch("mullions, bands, and screen louvers", relief);
  const stone = batch("crown fins, caps, and penthouse frame", precast);
  const block = batch("rooftop screen", mechanical);

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

  // A rectangle mapped onto a plan run, split into facets that follow an arc.
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
  // A projecting band along consecutive runs, chamfered at convex corners and
  // optionally closed by return faces where it starts and stops.
  function band(target, runs, y0, y1, proud, { soffit = true, top = false, ends = false, from = 0, to = Infinity, visible = () => true } = {}) {
    const endFace = (run, s, sign) => {
      if (!visible(run.at(s, proud + 0.2), y0)) return;
      const [inner, outer] = [run.at(s), run.at(s, proud)], n = run.normal(s);
      quad(target, [point(inner, y0), point(outer, y0), point(outer, y1), point(inner, y1)], [[n[1] * sign, 0, -n[0] * sign]]);
    };
    runs.forEach((run, index) => {
      const start = index === 0 ? from : 0, end = Math.min(run.length, index === runs.length - 1 ? to : Infinity);
      const n = run.pieces(start, end);
      for (let i = 0; i < n; i += 1) {
        const sa = start + (end - start) * i / n, sb = start + (end - start) * (i + 1) / n;
        if (!visible(run.at((sa + sb) / 2, proud + 0.2), y0)) continue;
        panel(target, run, sa, sb, y0, y1, proud);
        if (soffit) ledge(target, run, sa, sb, y0, 0, proud, false);
        if (top) ledge(target, run, sa, sb, y1, 0, proud, true);
      }
      if (ends && index === 0) endFace(run, start, -1);
      if (ends && index === runs.length - 1) endFace(run, end, 1);
      const next = runs[index + 1];
      if (!next) return;
      // Outward normals turn counterclockwise from above at a convex corner, opening a wedge to fill.
      const corner = run.at(run.length), n1 = run.normal(run.length), n2 = next.normal(0);
      if (n1[0] * n2[1] - n1[1] * n2[0] >= -1e-6 || !visible(corner, y0)) return;
      const a = run.at(run.length, proud), b = next.at(0, proud), mitre = cornerNormal(n1, n2);
      quad(target, [point(a, y0), point(b, y0), point(b, y1), point(a, y1)], [[mitre[0], 0, mitre[1]]]);
      if (soffit) triangle(target, [point(corner, y0), point(b, y0), point(a, y0)], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
      if (top) triangle(target, [point(corner, y1), point(a, y1), point(b, y1)], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    });
  }
  // A box on a local frame: fins, mullions, posts, and the rooftop masses.
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
    for (const [name, [corners, n]] of Object.entries(faces)) if (!omit.includes(name)) quad(target, corners, [n]);
  }
  // Ear clipping for the non-convex roofs and floors; the bundle omits ShapeUtils.
  function slab(target, polygon, y, up) {
    const area = polygon.reduce((sum, [x, z], i) => { const [x2, z2] = polygon[(i + 1) % polygon.length]; return sum + x * z2 - x2 * z; }, 0);
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
    triangle(target, ring.map((k) => point(polygon[k], y)), [normal, normal, normal]);
  }
  // Walls rise through the given heights, so a seam can land on a drawn corner.
  function prism(target, runs, heights) {
    runs.forEach((run) => heights.slice(1).forEach((top, i) => panel(target, run, 0, run.length, heights[i], top, 0)));
    const polygon = polygonOf(runs);
    slab(target, polygon, heights.at(-1), true);
    slab(target, polygon, 0, false);
    return polygon;
  }

  // The crown-base seam puts the drawn north crown foot on a shell vertex.
  const towerPlan = prism(shell, tower, [0, crownBase, parapet]);
  const lowerPlan = prism(shell, lowerTier, [0, lowerParapet]);
  // Details hidden inside the other volume are skipped rather than buried.
  const towerVisible = (at, y) => y > lowerParapet || !inside(lowerPlan, at);
  const lowerVisible = (at) => !inside(towerPlan, at);
  // The trimmed chamfer and west wall are cut faces, so the lower bands and cap wrap
  // only the south and Garland Court faces and close with return ends.
  const lowerChain = [lowerTier[0], lowerTier[1]];

  // One pane per floor per bay, set just proud of the wall like Crain's windows, so only
  // mullions and slab edges divide the face, as drawn. Tones vary subtly, with scattered lit and dark units.
  const towerRows = [[0.6, level(45) - 0.22]];
  for (let floor = 44; floor >= 0; floor -= 1) towerRows.push([level(floor + 1) + 0.2, level(floor) - 0.22]);
  const crownMid = (crownBase + capSoffit) / 2;
  const tones = [0x444444, 0x474747, 0x4a4a4a].map((hex) => new THREE.Color(hex));
  const lit = new THREE.Color(0x7a7a7a), unlit = new THREE.Color(0x3a3a3a);
  function glaze(runs, stationsList, rows, visible, seed) {
    runs.forEach((run, r) => {
      const stations = stationsList[r];
      for (let bay = 0; bay < stations.length - 1; bay += 1) {
        if (stations[bay + 1] - stations[bay] < 1.5) continue;
        const s0 = stations[bay] + 0.24, s1 = stations[bay + 1] - 0.24;
        rows.forEach(([bottom, top], row) => {
          if (!visible(run.at((s0 + s1) / 2, 0.3), bottom)) return;
          const hash = (row * 131 + bay * 37 + r * 59 + seed) % 97;
          panel(panes, run, s0, s1, bottom, top, 0.05, hash < 5 ? lit : hash < 8 ? unlit : tones[hash % 3]);
        });
      }
    });
  }
  // The stub has no crown, so its top storey runs up to the parapet.
  const stubTop = [crownBase + 0.45, parapet - 1.2];
  glaze(tower.slice(0, 2), towerStations.slice(0, 2), [...towerRows, stubTop], towerVisible, 3);
  glaze([tower.at(-1)], [towerStations.at(-1)], [...towerRows, stubTop], towerVisible, 5);
  glaze(tower.slice(2, 7), towerStations.slice(2, 7), [...towerRows, [crownBase + 0.5, crownMid - 0.3], [crownMid + 0.3, capSoffit - 0.2]], towerVisible, 11);
  const lowerRows = [[0.6, level(45) - 0.22]];
  for (let floor = 44; floor >= 30; floor -= 1) lowerRows.push([level(floor + 1) + 0.2, level(floor) - 0.22]);
  lowerRows.push([lowerLedge + 0.4, lowerSoffit - 0.25]);
  glaze(lowerTier, lowerStations, lowerRows, lowerVisible, 23);

  // Raised mullions run to the crown; the fins take over above it.
  const mullion = (target, { at, normal }, y0, y1, width = 0.28, depth = 0.22) => box(target, at, normal, width / 2, 0, depth, y0, y1, { omit: ["back", "bottom", "top"] });
  const towerFoot = (at) => (towerVisible(at, 0) ? 0 : lowerParapet);
  tower.forEach((run, r) => {
    if (r >= 2 && r <= 4) return;
    const top = r < 2 || r === 7 ? parapet : crownBase;
    for (const s of towerStations[r].slice(1, -1)) {
      const where = station(run, s);
      mullion(dark, where, towerFoot(where.at), top);
    }
  });
  // The last two stations take the north strip's wide dark strips below instead.
  for (const where of mullions.slice(0, -2)) if (where !== balconyStack) mullion(dark, where, towerFoot(where.at), crownBase);
  // The balcony stack at the bow's end is a dark panel recessed between raised jambs;
  // wide dark strips follow on the north strip.
  const stackHalf = 0.75;
  panel(dark, bow, bow.length - stackHalf, bow.length, 0, crownBase, 0.08);
  panel(dark, strip, 0, stackHalf, 0, crownBase, 0.08);
  for (const jamb of [station(bow, bow.length - stackHalf), station(strip, stackHalf)]) mullion(dark, jamb, 0, crownBase, 0.24, 0.34);
  for (const where of mullions.slice(-2)) mullion(dark, where, 0, crownBase, 0.9, 0.24);

  // Six-floor bands on the tower and three-floor bands on the lower tier; thin slab
  // edges mark the other floors on the faces the skyline view sees.
  const bandRuns = tower.slice(2, 7), stubRuns = [tower[7], tower[0], tower[1]];
  for (let floor = 0; floor <= 45; floor += 1) {
    const y = level(floor);
    // Thick bands start under the first crown fin, as drawn; a slab edge runs before them.
    if (floor % 6 === 0) {
      band(dark, bandRuns, y - 0.65, y, bandProud, { from: capStart, top: floor > 0, ends: true, visible: towerVisible });
      band(dark, [flatFace], y - 0.18, y + 0.04, 0.12, { soffit: false, to: capStart, visible: towerVisible });
    } else band(dark, tower.slice(2, 5), y - 0.18, y + 0.04, 0.12, { soffit: false, visible: towerVisible });
    if (floor % 3 === 0) band(dark, stubRuns, y - 0.2, y + 0.04, 0.12, { soffit: false, visible: towerVisible });
    if (floor >= 30) {
      if (floor % 3 === 0) band(dark, lowerChain, y - 0.65, y, bandProud, { top: true, ends: true, visible: lowerVisible });
      else band(dark, [lowerTier[1]], y - 0.18, y + 0.04, 0.12, { soffit: false, visible: lowerVisible });
    }
  }

  // Crown: radial fins under a projecting cap that follows the plan and wraps the
  // hidden faces. A flush precast pier turns the north-east corner between the cap ends.
  for (const where of [...crownFins, ...hiddenFins]) box(stone, where.at, where.normal, finWidth / 2, 0, finDepth, crownBase, capSoffit, { omit: ["back", "top"] });
  band(stone, tower.slice(2, 5), capSoffit, parapet, capProud, { from: capStart, to: capEnd, top: true, ends: true });
  band(stone, [north, westBulge], capSoffit, parapet, capProud, { from: northCapStart, top: true, ends: true });
  band(stone, [strip, north], crownBase, parapet, 0.08, { from: capEnd, to: northCapStart, soffit: false, top: true });
  for (const where of lowerFins) box(stone, where.at, where.normal, lowerFinWidth / 2, 0, lowerFinDepth, lowerLedge, lowerSoffit, { omit: ["back", "top"] });
  band(stone, lowerChain, lowerSoffit, lowerParapet, lowerCapProud, { top: true, ends: true, visible: lowerVisible });

  // Rooftop block: the tall screen strip, then the lower loggia with four posts and a
  // dark back wall under a cornice that overhangs to the south and west.
  const south = [0, 1];
  const screenFront = screen.north + screen.length;
  box(block, [screen.east - screen.width / 2, screenFront], south, screen.width / 2, -screen.length, 0, parapet, screenTop, { omit: ["bottom"] });
  const loggiaEast = screen.east - screen.width + 0.2, lintel = penthouseTop - 1.68, backWall = penthouse.front - 1.5;
  box(shell, [(penthouse.west + loggiaEast) / 2, backWall], south, (loggiaEast - penthouse.west) / 2, screen.north - backWall, 0, parapet, lintel, { omit: ["bottom"] });
  const corniceWest = penthouse.west - penthouse.overhang, corniceFront = penthouse.front + penthouse.overhang;
  box(stone, [(corniceWest + loggiaEast) / 2, corniceFront], south, (loggiaEast - corniceWest) / 2, screen.north - corniceFront, 0, lintel, penthouseTop, { omit: ["back"] });
  // Post spans in meters east of the loggia's west end, as drawn.
  const posts = [[0, 1.3], [4.5, 5.9], [9.4, 11.1], [12.3, 13.5]];
  for (const [left, right] of posts) {
    box(stone, [penthouse.west + (left + right) / 2, penthouse.front], south, (right - left) / 2, -1.5, 0, parapet, lintel, { omit: ["back", "bottom", "top"] });
  }
  // Louvers and five rows of panel dashes on the screen's two visible faces.
  const screenSouthWest = [screen.east - screen.width, screenFront], screenSouthEast = [screen.east, screenFront];
  const screenRuns = [line(screenSouthWest, screenSouthEast), line(screenSouthEast, [screen.east, screen.north])];
  const dashDrops = [2.06, 4.01, 5.95, 8.1, 10.3];
  screenRuns.forEach((run, r) => {
    const panels = r === 0 ? 2 : 10, width = run.length / panels;
    for (let i = 1; i < panels; i += 1) mullion(dark, station(run, width * i), parapet + 0.3, screenTop - 0.4, 0.25, 0.12);
    for (let i = 0; i < panels; i += 1) {
      for (const drop of dashDrops) panel(dark, run, width * (i + 0.14), width * (i + 0.86), screenTop - drop - 0.18, screenTop - drop, 0.08);
    }
  });

  const meshes = [shell, panes, dark, stone, block].map((data) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
    if (data.surface.vertexColors) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
    const mesh = new THREE.Mesh(geometry, data.surface);
    mesh.name = data.name;
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    return mesh;
  });

  // Silhouette lines for the shells and the screen only. The 20° threshold is well
  // above the 2.4° bow facets, so curved faces read as one surface.
  const outlines = [meshes[0], meshes[4]].map((mesh) => new THREE.EdgesGeometry(mesh.geometry, 20).getAttribute("position").array);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute([...outlines[0], ...outlines[1]], 3));
  const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 }));
  edges.name = "silhouette edges";
  building.add(edges);

  return {
    building,
    height: screenTop,
    triangleCount: [shell, panes, dark, stone, block].reduce((count, data) => count + data.positions.length / 9, 0),
    setHighlighted(highlighted) {
      materials.forEach((surface) => surface.emissive.setHex(highlighted ? 0x222222 : 0x000000));
    },
    setWireframe(enabled) {
      materials.forEach((surface) => { surface.wireframe = enabled; });
      edges.visible = !enabled;
    },
  };
}
