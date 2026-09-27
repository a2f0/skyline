import { createBuilder, line, polygonOf } from "./building-kit.js";
import type { BatchData, BuildingModel, Plan, Run, Vec2, Vec3 } from "./building-kit.js";
import type { GeoBuilding } from "./skyline-geography-data.js";

// Two Prudential Plaza: the geographic layout's detailed model. The mapped
// outline keeps its 240 m eave, 277 m pyramid peak, and the published 303.3 m
// spire tip. The fitted model's composition carries over at meter scale on that
// outline: a limestone shaft of piers and punched panes, paired north/south
// setback tiers whose pier heads step floor by floor into a glazed gable, a
// pointed arrow rising from each gable to the one above, a chevron over every
// facade at the eave, a stepped crown of ten setbacks under the mapped peak,
// and a tapered spire. Tier, arrow, chevron and step spacings are estimates;
// see docs/two-prudential-geographic-reference.md. Units are meters; +x is
// east, +z is south.
export const twoPrudentialGeographicLevels = Object.freeze({
  eave: 240, // OSM crown eave
  peak: 277, // OSM crown peak
  tip: 303.3, // published architectural tip
  floors: 64,
  // Above the eave, the fitted model's chevrons reach 0.5535 of the way from
  // its own eave to its pyramid top on the facades carrying the tiers, and
  // 0.5253 on the other two.
  frontChevron: 260.48,
  sideChevron: 259.44,
  // Below the eave, each fitted level scaled by 240/250.916: the shoulder and
  // peak of each tier, in that model's own proportions rather than a rounding
  // of them.
  middleShoulder: 196.09,
  middlePeak: 224.79,
  lowerShoulder: 155.73,
  lowerPeak: 180.63,
  crownSteps: 10,
});
const h = twoPrudentialGeographicLevels;
const pitch = h.eave / h.floors;

// The fitted model's south composition as fractions of its 59.01 m facade and
// 38.86 m depth, applied to whichever mapped wall each face turns out to be.
const tierWidths = [0.707, 0.840] as const; // lower, middle gable widths
// The pointed central bay. The fitted model draws it 11.7 m wide on every
// facade, so each mapped facade takes the fraction that width is of the fitted
// facade it corresponds to: its 59.01 m south face for the mapped north and
// south walls, its 38.86 m east face for the mapped east and west ones.
const arrowWidth = 11.7 / 59.01, sideArrowWidth = 11.7 / 38.86;
// The eave chevron covers the middle bays, so its slope stays near the fitted
// model's 1.2-1.75 rise over run on both the wide and the narrow facades.
const chevronWidth = 0.58;
// The fitted tiers stand 9.6 m and 4.0 m proud once scaled to the mapped depth.
// The mapped outline is this model's street footprint, so the projections are
// compressed to 4.0 m and 2.2 m: enough to cast the drawing's stepped shadow
// without claiming 34% more ground than OpenStreetMap records.
const tierFronts = [4.0, 2.2] as const;

// A geometric face normal.
function normal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u = b.map((value, axis) => value - a[axis]!) as Vec3, v = c.map((value, axis) => value - a[axis]!) as Vec3;
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as Vec3;
  const length = Math.hypot(...n);
  return n.map((value) => value / length) as Vec3;
}

// One facade: the plan point at its middle, the unit vector along it, and its
// outward normal. (tangent, up, outward) is right-handed for every wall, so a
// counterclockwise profile in (across, height) faces outward without a
// per-facade special case.
interface Face {
  centre: Vec2;
  tangent: Vec2;
  outward: Vec2;
  width: number;
}

const faceOf = (run: Run): Face => {
  const outward = run.normal(0);
  return { centre: run.at(run.length / 2), tangent: [outward[1], -outward[0]], outward, width: run.length };
};
const plane = (face: Face, across: number, depth: number): Vec2 =>
  [face.centre[0] + face.tangent[0] * across + face.outward[0] * depth, face.centre[1] + face.tangent[1] * across + face.outward[1] * depth];
const spot = (face: Face, across: number, depth: number, y: number): Vec3 => { const [x, z] = plane(face, across, depth); return [x, y, z]; };
// A run along a face at a fixed depth, so the shared strip and pane helpers
// work on a tier's front exactly as they do on a mapped wall.
const faceRun = (face: Face, half: number, depth: number): Run => line(plane(face, -half, depth), plane(face, half, depth));

export function createTwoPrudentialGeographicBuilding(record: GeoBuilding, projectPlan: (coordinates: [number, number][]) => Plan, offset: [number, number]): BuildingModel {
  const kit = createBuilder(record.name, record.id);
  // The drawing's palette, where the limestone field is the light element and
  // the windows the dark one: a stone shell, piers and pointed arrows a shade
  // lighter so their projection catches the light, dark punched glazing,
  // silver crown fascias, and a bright spire.
  const stone = kit.batch("Two Prudential · limestone shell", kit.material(0x868686));
  const tiers = kit.batch("Two Prudential · setback tiers", kit.material(0x828282));
  const piers = kit.batch("Two Prudential · piers and bands", kit.material(0x939393));
  const bands = kit.batch("Two Prudential · crown bands", kit.material(0xa6a6a6));
  const louvers = kit.batch("Two Prudential · crown louvers", kit.material(0x5e5e5e));
  const roof = kit.batch("Two Prudential · crown setbacks", kit.material(0x6f6f6f));
  const spire = kit.batch("Two Prudential · spire", kit.material(0xe9e9e9));
  const spirePanels = kit.batch("Two Prudential · spire inset panels", kit.material(0x575757));
  const lit = kit.batch("Two Prudential · lit glazing", kit.material(0x8b8b8b));
  const dim = kit.batch("Two Prudential · dim glazing", kit.material(0x5d5d5d));
  const tones = [0x3c3c3c, 0x414141, 0x373737, 0x464646].map((color, i) => kit.batch(`Two Prudential · glazing ${i + 1}`, kit.material(color)));
  const paneTone = (row: number, bay: number, side: number): BatchData => {
    const hash = (Math.imul(row + 7, 0x9e3779b1) ^ Math.imul(bay + 43, 0x85ebca77) ^ Math.imul(side + 2, 0xc2b2ae3d)) >>> 0;
    const value = hash % 97;
    if (value < 3) return lit;
    if (value < 6) return dim;
    return tones[value % tones.length]!;
  };

  const ground = projectPlan(record.footprint.coordinates);
  const outline = polygonOf(ground);
  // The crown shrinks about the outline's area centroid and the spire stands
  // on it. Averaging the traced vertices instead would follow the tracing's
  // own vertex density: this outline carries three extra points down its west
  // wall, which would put the centre 4.9 m west and 2.7 m south of the
  // building, drifting the crown diagonally as it rises and standing the
  // spire off the facade arrows it should cap.
  const centre: Vec2 = (() => {
    let twice = 0, x = 0, z = 0;
    for (let i = 0; i < outline.length; i += 1) {
      const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
      const cross = a[0] * b[1] - b[0] * a[1];
      twice += cross; x += (a[0] + b[0]) * cross; z += (a[1] + b[1]) * cross;
    }
    return [x / (3 * twice), z / (3 * twice)];
  })();

  // A closed shallow solid on a run: a pane, a pier, a spandrel or a louver.
  const strip = (batch: BatchData, run: Run, from: number, to: number, y0: number, y1: number, back: number, front: number) => {
    const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
    from = Math.max(from, clearance);
    to = Math.min(to, run.length - clearance);
    if (to - from < 0.03 || y1 <= y0) return;
    kit.box(batch, run.at((from + to) / 2), run.normal(0), (to - from) / 2, back, front, y0, y1);
  };
  const fan = (target: BatchData, vertices: Vec3[], outward: Vec3) => {
    for (let i = 1; i < vertices.length - 1; i += 1) kit.triangle(target, [vertices[0]!, vertices[i]!, vertices[i + 1]!], [outward, outward, outward]);
  };
  // A shallow closed solid on an arbitrary facade or roof plane. The back face
  // reverses the front's winding so every shared edge keeps its reverse partner.
  const relief = (target: BatchData, polygon: Vec3[], n: Vec3, depth: number, buried = 0.06) => {
    const moved = (distance: number): Vec3[] => polygon.map((p) => p.map((v, k) => v + n[k]! * distance) as Vec3);
    const front = moved(depth), back = moved(-buried);
    fan(target, front, n);
    fan(target, [...back].reverse(), n.map((v) => -v) as Vec3);
    for (let i = 0; i < polygon.length; i += 1) {
      const j = (i + 1) % polygon.length;
      const edge = front[j]!.map((v, k) => v - front[i]![k]!) as Vec3;
      const side = [edge[1] * n[2] - edge[2] * n[1], edge[2] * n[0] - edge[0] * n[2], edge[0] * n[1] - edge[1] * n[0]] as Vec3;
      fan(target, [back[i]!, back[j]!, front[j]!, front[i]!], side);
    }
  };
  const clip = <T extends number[]>(polygon: T[], distance: (p: T) => number): T[] => polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length]!, da = distance(a), db = distance(b);
    const points = da >= 0 ? [a] : [];
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      points.push(a.map((v, k) => v + t * (b[k]! - v)) as T);
    }
    return points;
  });
  const clipY = (polygon: Vec3[], y: number, above: boolean) => clip(polygon, (p) => (above ? 1 : -1) * (p[1] - y));

  // A closed solid extruded from a facade profile between two depths. The
  // profile is a ring in (across, height); `fans` names the convex pieces its
  // end faces are drawn from, because a gable over another gable is concave at
  // its foot and a single fan would fill across the notch.
  const extrude = (target: BatchData, face: Face, profile: [number, number][], back: number, front: number, fans: number[][]) => {
    const twiceArea = profile.reduce((sum, [s, y], i) => { const [s2, y2] = profile[(i + 1) % profile.length]!; return sum + s * y2 - s2 * y; }, 0);
    const turn = twiceArea >= 0 ? 1 : -1;
    const out: Vec3 = [face.outward[0], 0, face.outward[1]];
    const at = (i: number, depth: number) => spot(face, profile[i]![0], depth, profile[i]![1]);
    for (const piece of fans) {
      fan(target, piece.map((i) => at(i, front)), out);
      fan(target, [...piece].reverse().map((i) => at(i, back)), out.map((v) => -v) as Vec3);
    }
    for (let i = 0; i < profile.length; i += 1) {
      const j = (i + 1) % profile.length;
      const ds = profile[j]![0] - profile[i]![0], dy = profile[j]![1] - profile[i]![1], length = Math.hypot(ds, dy);
      if (length < 1e-9) continue;
      // The outward side of a counterclockwise edge is the edge turned -90°.
      const side: Vec3 = [face.tangent[0] * turn * dy / length, -turn * ds / length, face.tangent[1] * turn * dy / length];
      fan(target, [at(i, back), at(j, back), at(j, front), at(i, front)], side);
    }
  };
  // A gabled volume on a facade: flat shoulders rising to a central peak, over
  // a floor that may itself be the gable below.
  const gabled = (target: BatchData, face: Face, half: number, back: number, front: number, shoulder: number, peak: number, floor: (across: number) => number) => {
    extrude(target, face, [[-half, floor(-half)], [0, floor(0)], [half, floor(half)], [half, shoulder], [0, peak], [-half, shoulder]], back, front, [[0, 1, 4, 5], [1, 2, 3, 4]]);
  };
  const gableAt = (half: number, shoulder: number, peak: number) => (across: number) => peak - (peak - shoulder) * Math.min(1, Math.abs(across) / half);
  // A thin coping following a gable's two slopes, standing proud of the face it
  // caps. Without it a gable reads as a line drawn on the glazing rather than
  // the edge of a volume. It dies into the arrow rising through the gable's
  // middle, which both hides its inner end and keeps that end's plane well
  // clear of the arrow's own sides and of the nearest pier the bay grid can
  // put there.
  const coping = (face: Face, half: number, depth: number, shoulder: number, peak: number, inner: number) => {
    const head = gableAt(half, shoulder, peak);
    for (const sign of [-1, 1]) {
      const [a, b] = [sign * inner, sign * (half - 0.12)];
      const profile: [number, number][] = [[a, head(a) - 1.35], [b, head(b) - 1.35], [b, head(b) + 0.06], [a, head(a) + 0.06]];
      // relief() takes a ring counterclockwise as seen from outside the face,
      // and the two slopes run opposite ways, so the order is normalised here
      // rather than mirrored by hand.
      const twiceArea = profile.reduce((sum, [s0, y0], i) => { const [s1, y1] = profile[(i + 1) % profile.length]!; return sum + s0 * y1 - s1 * y0; }, 0);
      const ring = twiceArea >= 0 ? profile : [...profile].reverse();
      relief(bands, ring.map(([across, y]) => spot(face, across, depth, y)), [face.outward[0], 0, face.outward[1]], 0.42, 0.1);
    }
  };

  // The mapped volume: the shaft, rising from grade to the mapped eave. Its
  // grade ring is the only one in this batch, so it states the street outline.
  kit.prism(stone, ground, [0, h.eave]);

  // A volume standing in front of a surface, over the stations it reaches: the
  // height it covers that surface to, and the stations its own sides are at.
  // The half carries a margin, so a pier's end cap can never land on the
  // covering volume's side plane and z-fight with it.
  interface Cover { half: number; height: (across: number) => number }
  // Punched glazing on a facade or a tier front: one pane per bay per row
  // between projecting piers, with limestone left visible around every
  // opening. `cap` is the height a coping's own underside reaches, so nothing
  // is drawn up inside it. Stations are measured from the facade's middle, the same frame
  // the gable profiles use, and each pane or pier is emitted on the part whose
  // own span contains it. Clearance is reserved only at the facade's two real
  // ends, so nothing breaks at the joints where the mapped tracing happens to
  // split a wall. `head` gives the drawn and photographed gables their
  // sawtooth edge instead of a clean diagonal.
  const glazePiers = (parts: { run: Run; origin: number }[], side: number, base: number, head: (across: number) => number, covers: Cover[] = [], width = parts[0]!.run.length, cap: (across: number) => number = () => Infinity) => {
    const bays = Math.max(1, Math.round(width / 3.5)), bay = width / bays;
    const stepped = (across: number) => Math.min(head(across), base + Math.max(0, Math.floor((head(across) - base) / pitch)) * pitch);
    // The height a span is covered to. A cover applies to a whole span or to
    // none of it, because every cover edge inside a bay becomes a cut and a
    // pier's half-width is smaller than a cover's own margin, so its middle
    // decides; its height is then taken across the span, including over the
    // gable's own ridge where the span crosses it, because a single sample
    // would leave the rest of the span below the gable it hides behind.
    const foot = (a: number, b: number) => covers.reduce((y, cover) => {
      if (Math.abs((a + b) / 2) > cover.half) return y;
      const ridge = a < 0 && b > 0 ? [cover.height(0)] : [];
      return Math.max(y, cover.height(a), cover.height(b), ...ridge);
    }, 0);
    const edges = covers.flatMap((cover) => [-cover.half, cover.half]);
    const put = (batch: BatchData, a: number, b: number, y0: number, y1: number, back: number, front: number) => {
      const clearance = Math.max(Math.abs(back), Math.abs(front)) + 0.025;
      const [from, to] = [Math.max(a, clearance - width / 2), Math.min(b, width / 2 - clearance)];
      if (to - from < 0.03 || y1 <= y0) return;
      const centre = (from + to) / 2;
      const part = parts.reduce((best, entry) => Math.abs(centre - entry.origin) - entry.run.length / 2 < Math.abs(centre - best.origin) - best.run.length / 2 ? entry : best);
      kit.box(batch, part.run.at(centre - part.origin + part.run.length / 2), part.run.normal(0), (to - from) / 2, back, front, y0, y1);
    };
    for (let index = 0; index < bays; index += 1) {
      const from = -width / 2 + index * bay + 0.78, to = from + bay - 1.56;
      // Every cover edge inside the bay is a cut, and a piece too narrow to
      // draw is dropped afterwards. Dropping the cut instead would let one
      // covered end darken the whole bay, including the part standing clear.
      const cuts = [from, ...edges.filter((x) => x > from && x < to), to].sort((a, b) => a - b);
      for (let piece = 0; piece + 1 < cuts.length; piece += 1) {
        const [a, b] = [cuts[piece]!, cuts[piece + 1]!];
        if (b - a < 0.25) continue;
        const ceiling = Math.min(stepped(a) - 0.45, stepped(b) - 0.45, cap(a), cap(b));
        const sole = Math.max(base, foot(a, b));
        for (let row = 0; row < h.floors; row += 1) {
          const sill = base + row * pitch + 0.55, lintel = base + (row + 1) * pitch - 0.55;
          if (sill >= ceiling) break;
          if (sill < sole) continue;
          put(paneTone(row, index, side), a, b, sill, Math.min(lintel, ceiling), 0.02, 0.07);
        }
      }
    }
    for (let index = 0; index <= bays; index += 1) {
      const centred = Math.max(-width / 2 + 0.42, Math.min(width / 2 - 0.42, -width / 2 + index * bay));
      // Across both of a pier's edges, never at its centre: a gable rises
      // 1.7 m over the pier's own 0.84 m width, so a centre sample would bury
      // its inner edge in the volume below and stand its outer edge above the
      // gable it is supposed to stop under.
      const [lo, hi] = [centred - 0.42, centred + 0.42];
      const top = Math.min(stepped(lo), stepped(hi), cap(lo) + 0.12, cap(hi) + 0.12), bottom = Math.max(base, foot(lo, hi)) + 0.45;
      if (top - bottom < pitch) continue;
      put(piers, lo, hi, bottom, top - 0.12, 0.04, 0.3);
    }
  };


  // A facade is a wall, not a run: the mapped tracing splits the west wall into
  // three nearly collinear runs and the north and south walls into two each.
  // Composing on a run would give the west facade a chevron half the east
  // one's, 14 m off its centre, and would blank a strip of glazing up the
  // middle of every other segment. Consecutive runs facing the same way are
  // merged, and each keeps its own station along the merged wall so the shaft
  // still follows the mapped outline exactly.
  interface Facade { face: Face; parts: { run: Run; origin: number }[] }
  const facades: Facade[] = [];
  for (const run of ground) {
    const n = run.normal(0), last = facades.at(-1);
    if (last && last.face.outward[0] * n[0] + last.face.outward[1] * n[1] > 0.999) last.parts.push({ run, origin: 0 });
    else facades.push({ face: faceOf(run), parts: [{ run, origin: 0 }] });
  }
  const first = facades[0]!, final = facades.at(-1)!;
  if (facades.length > 1 && first.face.outward[0] * final.face.outward[0] + first.face.outward[1] * final.face.outward[1] > 0.999) {
    first.parts.unshift(...final.parts);
    facades.pop();
  }
  for (const facade of facades) {
    const start = facade.parts[0]!.run.at(0), tail = facade.parts.at(-1)!.run;
    const end = tail.at(tail.length), span = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const tangent: Vec2 = [(end[0] - start[0]) / span, (end[1] - start[1]) / span];
    const centre: Vec2 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    facade.face = { centre, tangent, outward: [-tangent[1], tangent[0]], width: span };
    for (const part of facade.parts) {
      const mid = part.run.at(part.run.length / 2);
      part.origin = (mid[0] - centre[0]) * tangent[0] + (mid[1] - centre[1]) * tangent[1];
    }
  }
  const longest = (axis: 0 | 1, sign: number) => facades
    .filter(({ face }) => face.outward[axis] * sign > 0.9)
    .reduce((best, facade) => facade.face.width > best.face.width ? facade : best);
  // The mapped rectangle's long axis runs north-south, so the north and south
  // walls are the narrow ones the drawing and the photograph show the setback
  // tiers on; the east and west walls carry a single chevron at the eave.
  const fronts = [longest(1, 1), longest(1, -1)];
  const sides = [longest(0, 1), longest(0, -1)];

  // Shaft glazing on every mapped wall, stopping where a tier or an arrow
  // covers it: a pane behind a projecting volume is geometry no camera reaches,
  // and a pier end cap landing on a tier's own side plane would z-fight with
  // it. The half-meter margins keep every drawn pier clear of those planes.
  for (const [side, facade] of facades.entries()) {
    const { face } = facade;
    const covers: Cover[] = [{ half: face.width * (fronts.includes(facade) ? arrowWidth : sideArrowWidth) / 2 + 0.5, height: () => h.eave }];
    if (fronts.includes(facade)) {
      const tierHalf = face.width * tierWidths[1]! / 2;
      covers.push({ half: tierHalf + 0.5, height: gableAt(tierHalf, h.middleShoulder, h.middlePeak) });
    }
    glazePiers(facade.parts, side, 0, () => h.eave, covers, face.width);
  }

  // The paired north and south setback tiers. Each is a closed gabled volume
  // standing on the mapped wall, the lower one occupying the depth in front of
  // the middle one: where the two meet they share a plane but face opposite
  // ways, which is a joint rather than a z-fight. Their feet sit just above
  // grade, which keeps the street-level outline exactly the mapped ring.
  for (const { face } of fronts) {
    const halves = tierWidths.map((fraction) => face.width * fraction / 2) as [number, number];
    const arrowHalf = face.width * arrowWidth / 2;
    const levels: [number, number][] = [[h.lowerShoulder, h.lowerPeak], [h.middleShoulder, h.middlePeak]];
    // An arrow's own foot sits a little above its tier's, so the two soffits
    // never share a plane where the arrow's back laps into the tier.
    const floors: ((across: number) => number)[] = [() => 0.5, gableAt(halves[0], h.lowerShoulder, h.lowerPeak)];
    for (const [index, [shoulder, peak]] of levels.entries()) {
      const half = halves[index]!, front = tierFronts[index]!, back = index ? 0 : tierFronts[1]!;
      gabled(tiers, face, half, back, front, shoulder, peak, () => 0.3 + index * 0.06);
      const tierGable = gableAt(half, shoulder, peak);
      // The arrow's own shoulders sit just above the gable it rises through,
      // so its head covers that slope instead of stopping short of it and
      // leaving a bare wedge, and the coping dies into it rather than ending
      // in the air. Just above, not exactly on: sharing a shoulder as well as
      // a peak would put the two heads in one plane.
      const arrowShoulder = tierGable(arrowHalf) + 0.3;
      const run = faceRun(face, half, front);
      // The middle tier's front is itself covered by the lower tier below its
      // gable, so that region carries no panes or piers either.
      const covers: Cover[] = [{ half: arrowHalf + 0.5, height: () => peak }];
      if (index === 1) covers.push({ half: halves[0]! + 0.5, height: gableAt(halves[0]!, h.lowerShoulder, h.lowerPeak) });
      glazePiers([{ run, origin: 0 }], 6 + index, 0.3, tierGable, covers, run.length, (across) => tierGable(across) - 1.4);
      // The pointed arrow: the narrow bay that carries the eye from one gable
      // to the next, glazed to its sloping head.
      const arrowFloor = floors[index]!;
      gabled(piers, face, arrowHalf, front - 0.02, front + 0.9, arrowShoulder, peak, arrowFloor);
      glazeArrow(face, arrowHalf, front + 0.9, arrowShoulder, peak, arrowFloor, 8 + index);
      coping(face, half, front, shoulder, peak, arrowHalf - 0.2);
    }
    // The chevron over the eave, and the arrow that reaches it from the middle
    // gable below. It covers the facade's middle bays rather than its whole
    // width: the drawing's chevrons rise more steeply than the mapped facade
    // is wide, and a full-width one would flatten into a tent. Stopping short
    // also keeps its soffit clear of the next facade's at the same elevation.
    const chevron = face.width * chevronWidth / 2;
    extrude(stone, face, [[-chevron + 0.02, h.eave], [chevron - 0.02, h.eave], [0, h.frontChevron]], -1.2, 0.22, [[0, 1, 2]]);
    const chevronRun = faceRun(face, chevron - 0.02, 0.22);
    const chevronGable = gableAt(chevron - 0.02, h.eave, h.frontChevron);
    glazePiers([{ run: chevronRun, origin: 0 }], 12, h.eave, chevronGable, [{ half: arrowHalf + 0.5, height: () => h.frontChevron }], chevronRun.length, (across) => chevronGable(across) - 1.4);
    const topFloor = gableAt(halves[1]!, h.middleShoulder, h.middlePeak);
    gabled(piers, face, arrowHalf, -0.3, 0.95, chevronGable(arrowHalf) + 0.3, h.frontChevron, topFloor);
    glazeArrow(face, arrowHalf, 0.95, chevronGable(arrowHalf) + 0.3, h.frontChevron, topFloor, 13);
    coping(face, chevron - 0.02, 0.22, h.eave, h.frontChevron, arrowHalf - 0.2);
  }

  // The east and west walls: a chevron at the eave over a single tall arrow.
  for (const { face } of sides) {
    const arrowHalf = face.width * sideArrowWidth / 2, chevron = face.width * chevronWidth / 2;
    extrude(stone, face, [[-chevron + 0.02, h.eave], [chevron - 0.02, h.eave], [0, h.sideChevron]], -1.2, 0.22, [[0, 1, 2]]);
    const chevronRun = faceRun(face, chevron - 0.02, 0.22);
    const chevronGable = gableAt(chevron - 0.02, h.eave, h.sideChevron);
    glazePiers([{ run: chevronRun, origin: 0 }], 14, h.eave, chevronGable, [{ half: arrowHalf + 0.5, height: () => h.sideChevron }], chevronRun.length, (across) => chevronGable(across) - 1.4);
    gabled(piers, face, arrowHalf, -0.3, 0.95, chevronGable(arrowHalf) + 0.3, h.sideChevron, () => 0.5);
    glazeArrow(face, arrowHalf, 0.95, chevronGable(arrowHalf) + 0.3, h.sideChevron, () => 0.5, 15);
    coping(face, chevron - 0.02, 0.22, h.eave, h.sideChevron, arrowHalf - 0.2);
  }

  // Narrow panes and thin mullions inside a pointed arrow. Each pane is a
  // closed solid clipped to the arrow's sloping head and to the gable it
  // stands on, so no triangular wedge is left unglazed under either. Bays
  // split at the arrow's own centre, where both the head and the gable below
  // turn, which keeps every clip linear over a span and every face planar.
  function glazeArrow(face: Face, half: number, depth: number, shoulder: number, peak: number, floor: (across: number) => number, side: number) {
    const head = gableAt(half, shoulder, peak);
    const bays = 3, width = (half * 2 - 0.5) / bays;
    for (let bay = 0; bay < bays; bay += 1) {
      const from = -half + 0.25 + bay * width + 0.09, to = from + width - 0.18;
      for (const [a, b] of (from < 0 && to > 0 ? [[from, 0], [0, to]] : [[from, to]]) as [number, number][]) {
        for (let row = 0; row * pitch < peak; row += 1) {
          const sill = row * pitch + 0.4, lintel = (row + 1) * pitch - 0.4;
          let pane: [number, number][] = [[a, sill], [b, sill], [b, lintel], [a, lintel]];
          pane = clip(pane, ([across, y]) => y - floor(across) - 0.25);
          pane = clip(pane, ([across, y]) => head(across) - 0.3 - y);
          if (pane.length < 3) {
            if (sill > head(a) && sill > head(b)) break;
            continue;
          }
          extrude(paneTone(row, bay, side), face, pane, depth + 0.02, depth + 0.06, [pane.map((_, index) => index)]);
        }
      }
    }
    const run = faceRun(face, half, depth);
    for (let bay = 1; bay < bays; bay += 1) {
      const centred = -half + 0.25 + bay * width;
      // Across the mullion's own width, like every other upright here.
      const [lo, hi] = [centred - 0.07, centred + 0.07];
      const bottom = Math.max(floor(lo), floor(hi), 0.3) + 0.3, top = Math.min(head(lo), head(hi)) - 0.25;
      if (top - bottom < pitch) continue;
      strip(piers, run, lo + half, hi + half, bottom, top, 0.03, 0.13);
    }
  }

  // The crown: ten setbacks from the mapped eave to the mapped peak, each a
  // closed ring with a silver fascia and a recessed louvered opening. A smooth
  // cone with painted rings loses the stepped silhouette the photographs show.
  const rimRing = ground.map((run) => run.at(0));
  const crownRim = [...rimRing];
  for (let pass = 0; pass < 8 && crownRim.length > 4; pass += 1) {
    // The mapped tracing's sub-meter jogs would give the rings slivers whose
    // fascias read as z-fighting; the shaft below keeps the outline exactly.
    const index = crownRim.findIndex((p, i) => {
      const a = crownRim[(i - 1 + crownRim.length) % crownRim.length]!, b = crownRim[(i + 1) % crownRim.length]!;
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return chord > 1e-9 && Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / chord < 1.2;
    });
    if (index < 0) break;
    crownRim.splice(index, 1);
  }
  const minimum = 0.08, stepHeight = (h.peak - h.eave) / h.crownSteps;
  const ringAt = (scale: number): Plan => {
    const points = crownRim.map(([x, z]) => [centre[0] + (x - centre[0]) * scale, centre[1] + (z - centre[1]) * scale] as Vec2);
    return points.map((p, i) => line(p, points[(i + 1) % points.length]!));
  };
  for (let step = 0; step < h.crownSteps; step += 1) {
    const scale = 1 - (step + 1) * (1 - minimum) / h.crownSteps;
    const ring = ringAt(scale), y0 = h.eave + step * stepHeight, y1 = y0 + stepHeight;
    kit.prism(roof, ring, [y0, y1]);
    // The fascia keeps clear of the ring's own top so the two do not share a
    // plane, and the dark opening below it carries two louver blades.
    kit.band(bands, ring, y1 - 1.15, y1 - 0.08, 0.42, { closed: true });
    for (const run of ring) {
      if (run.length < 1.4) continue;
      strip(louvers, run, 0.05, run.length - 0.05, y0 + 0.35, y1 - 1.3, 0.02, 0.1);
      // The blades stop short of the opening's own ends so no two end caps
      // share a plane.
      for (const dy of [0.7, 1.35]) strip(bands, run, 0.35, run.length - 0.35, y0 + dy, y0 + dy + 0.14, 0.05, 0.26);
    }
  }

  // The tapered spire: four bright faces with inset panels over a closed foot
  // seated in the topmost setbacks.
  const spireHalf = 1.3, footY = h.peak - 4;
  const foot: Vec3[] = [[centre[0] - spireHalf, footY, centre[1] + spireHalf], [centre[0] + spireHalf, footY, centre[1] + spireHalf], [centre[0] + spireHalf, footY, centre[1] - spireHalf], [centre[0] - spireHalf, footY, centre[1] - spireHalf]];
  const tip: Vec3 = [centre[0], h.tip, centre[1]];
  for (let i = 0; i < 4; i += 1) {
    const polygon = [foot[i]!, foot[(i + 1) % 4]!, tip], n = normal(polygon[0]!, polygon[1]!, polygon[2]!);
    fan(spire, polygon, n);
    const middle = foot[i]!.map((v, k) => (v + foot[(i + 1) % 4]![k]!) / 2) as Vec3;
    const inset: Vec3[] = [foot[i]!, foot[(i + 1) % 4]!].map((p) => p.map((v, k) => middle[k]! + (v - middle[k]!) * 0.62) as Vec3);
    const panelTip = tip.map((v, k) => v + (middle[k]! - v) * 0.13) as Vec3;
    for (const [lo, hi] of [[h.peak + 0.5, h.peak + 6], [h.peak + 6.5, h.peak + 12.5]] as [number, number][]) {
      const section = clipY(clipY([...inset, panelTip], lo, true), hi, false);
      if (section.length >= 3) relief(spirePanels, section, n, 0.025, 0.02);
    }
  }
  kit.slab(spire, [[centre[0] - spireHalf, centre[1] + spireHalf], [centre[0] + spireHalf, centre[1] + spireHalf], [centre[0] + spireHalf, centre[1] - spireHalf], [centre[0] - spireHalf, centre[1] - spireHalf]], footY, false);

  const model = kit.finish({ height: h.tip, outlines: [stone, tiers, roof, spire], opacity: 0.16 });
  model.building.position.set(offset[0], 0, offset[1]);
  model.building.userData["geography"] = record;
  model.building.userData["geographicDetail"] = { levels: h, floors: h.floors, source: "docs/two-prudential-geographic-reference.md" };
  return model;
}
