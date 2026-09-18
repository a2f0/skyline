import { createBuilder, rectangle, station } from "./building-kit.js";
import type * as THREE from "../vendor/three-r186.js";
import type { BatchData, BuildingModel, Run, Vec3 } from "./building-kit.js";

// Two Prudential Plaza, fitted to the SVG rather than surveyed dimensions. +x is east,
// +z south, in metres above the study's platform. The drawing stretches this tower:
// its spire fits at 345.79 m above the platform, versus 303.3 m above the real street.
// The paired north/south setbacks and crown construction are informed by reference photos;
// proportions still follow the drawing. See docs/two-prudential-reference.md for sources.
export const towerWidth = 59.01, towerDepth = 38.86;
export const eave = 250.916, chevronTop = 286.78, eastChevronTop = 284.955, pyramidTop = 315.71, spireTop = 345.786;
const west = -towerWidth / 2, east = towerWidth / 2, north = -towerDepth / 2, south = towerDepth / 2;
const main = { half: east, back: north, front: south, eave, peak: chevronTop };
const middle = { half: 24.799, back: south, front: 23.655, eave: 205.005, peak: 235.018 };
const lower = { half: 20.846, back: middle.front, front: 29.548, eave: 162.813, peak: 188.841 };
const tiers = [main, middle, lower];
const plan = rectangle(west, east, north, south);
const proud = 0.3, pierWidth = 1.6, arrowWidth = 11.7;
const pitch = 5.23, paneHeight = 3.0;
const gable = (tier: typeof main, x: number) => tier.peak - (tier.peak - tier.eave) * Math.abs(x) / tier.half;
const southPiers = [-28.7, -24.645, -20.143, -15.648, -11.158, -6.674, 6.614, 11.045, 15.472, 20.045, 24.453, 28.7];
const eastPiers = [-18.525, -15.67, -12.333, -9.128, -6.35, 6.35, 12.044, 15.057, 18.625];
const lowerPiers = [-20.04, -15.69, -11.205, -6.705, 7.341, 11.797, 16.247, 20.04];

export const twoPrudentialFeatures: Record<string, Vec3 | Vec3[]> = {
  twoEaveWest: [west, eave, south],
  twoEaveNear: [east, eave, south],
  twoEaveEast: [east, eave, north],
  twoSouthChevron: [0, chevronTop, south + 0.6],
  twoEastChevron: [east + 0.6, eastChevronTop, 0],
  twoPyramid: [0, pyramidTop, 0],
  twoSpire: [0, spireTop, 0],
  twoMiddleChevron: [0, middle.peak, middle.front + 0.6],
  twoLowerChevron: [0, lower.peak, lower.front + 0.6],
  twoMiddleWest: [-middle.half, middle.eave, middle.front],
  twoMiddleEast: [middle.half, middle.eave, middle.front],
  twoLowerWest: [-lower.half, lower.eave, lower.front],
  twoLowerEast: [lower.half, lower.eave, lower.front],
  twoSouthPiers: southPiers.map((x) => [x, 243, south + proud / 2] as Vec3),
  twoEastPiers: eastPiers.map((z) => [east + proud / 2, 220, z] as Vec3),
  twoLowerPiers: lowerPiers.map((x) => [x, 130, lower.front + proud / 2] as Vec3),
  twoFacade: [east + proud, 180, -12],
  // Below the podium roof, on the south face it hides; used for scene raycast checks.
  twoBehindPodium: [-15, 12, lower.front],
};

export function createTwoPrudentialPlazaBuilding(): BuildingModel {
  const kit = createBuilder("Two Prudential Plaza", "building-two-prudential-plaza");
  const { material, batch, prism, slab, panel, triangle } = kit;
  const stone = material(0x868686), glass = material(0x4c4c4c), metal = material(0x535353);
  const shell = batch("tower and setback shells", stone);
  const roof = batch("pyramid and chevron roofs", metal);
  const bands = batch("pyramid silver bands", material(0xa6a6a6));
  const windows = batch("window panes", glass);
  const piers = batch("vertical piers and chevrons", metal);
  const spire = batch("spire", material(0xe9e9e9));
  const glazing = batch("chevron glazing", material(0x424242, { vertexColors: true }));
  const frames = batch("glazing mullions and crown ribs", material(0x929292));
  const spirePanels = batch("spire inset panels", material(0x575757));
  const louvers = batch("crown louvers", material(0x727272));
  const batches = [shell, roof, bands, windows, piers, spire, glazing, frames, spirePanels, louvers];

  // A geometric face normal, also used for the sloping caps and tapered spire.
  const normal = ([a, b, c]: Vec3[]): Vec3 => {
    const u = b!.map((v, i) => v - a![i]!) as Vec3, v = c!.map((v, i) => v - a![i]!) as Vec3;
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as Vec3;
    const length = Math.hypot(...n);
    return n.map((v) => v / length) as Vec3;
  };
  const face = (target: BatchData, vertices: Vec3[], outward?: Vec3, color?: THREE.Color) => {
    for (let i = 1; i < vertices.length - 1; i += 1) {
      const points = [vertices[0]!, vertices[i]!, vertices[i + 1]!];
      const n = outward || normal(points);
      triangle(target, points, [n, n, n], color);
    }
  };
  // A shallow closed solid on an arbitrary facade/roof plane. Its back sits inside
  // the underlying shell; the front and returns give trim real depth in side views.
  const relief = (target: BatchData, polygon: Vec3[], n: Vec3, depth: number, buried = 0.06) => {
    const moved = (distance: number): Vec3[] => polygon.map((p) => p.map((v, k) => v + n[k]! * distance) as Vec3);
    const front = moved(depth), back = moved(-buried);
    face(target, front, n);
    face(target, [...back].reverse(), n.map((v) => -v) as Vec3);
    for (let i = 0; i < polygon.length; i += 1) {
      const j = (i + 1) % polygon.length;
      const edge = front[j]!.map((v, k) => v - front[i]![k]!) as Vec3;
      const side = [edge[1] * n[2] - edge[2] * n[1], edge[2] * n[0] - edge[0] * n[2], edge[0] * n[1] - edge[1] * n[0]] as Vec3;
      face(target, [back[i]!, back[j]!, front[j]!, front[i]!], side);
    }
  };
  // Clip convex polygons by a half-space. Used for roof strips and glazing which
  // reaches the sloping heads; no full window bay is discarded at a chevron.
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
  // Rotate newly authored south-facing details by 180 degrees for the north side.
  // Both facade builders emit closed solids and panels, without named omissions.
  const onNorth = (draw: () => void) => {
    const starts = batches.map((target) => target.positions.length);
    draw();
    batches.forEach((target, batchIndex) => {
      for (let i = starts[batchIndex]!; i < target.positions.length; i += 3) {
        for (const axis of [0, 2]) { target.positions[i + axis]! *= -1; target.normals[i + axis]! *= -1; }
      }
    });
  };
  // Closed gabled extrusion: a real projecting setback or a pointed central pier.
  // Back, bottom, and sloping caps are present even where another volume hides them.
  const gabled = (target: BatchData, half: number, back: number, front: number, shoulder: number, peak: number, bottom: number | ((x: number) => number) = 0, turn = false) => {
    const floor = typeof bottom === "function" ? bottom : () => bottom;
    const profile: [number, number][] = [[-half, floor(-half)], [0, floor(0)], [half, floor(half)],
      [half, shoulder], [0, peak], [-half, shoulder]];
    const at = ([s, y]: [number, number], z: number): Vec3 => turn ? [z, y, -s] : [s, y, z];
    const frontPoints = profile.map((p) => at(p, front)), backPoints = profile.map((p) => at(p, back));
    // Split at the centre: an arrow over the next gable has a concave bottom,
    // which a single triangle fan would incorrectly fill across the notch.
    for (const indices of [[0, 1, 4, 5], [1, 2, 3, 4]]) {
      face(target, indices.map((i) => frontPoints[i]!), turn ? [1, 0, 0] : [0, 0, 1]);
      face(target, indices.map((i) => backPoints[i]!).reverse(), turn ? [-1, 0, 0] : [0, 0, -1]);
    }
    for (let i = 0; i < profile.length; i += 1) {
      const j = (i + 1) % profile.length;
      face(target, [backPoints[i]!, backPoints[j]!, frontPoints[j]!, frontPoints[i]!]);
    }
  };

  // The platform covers this sole omitted floor. A closed roof volume above the eave
  // meets the shaft; its diamond ridges terminate at the four facade chevrons.
  prism(shell, plan, [0, eave], { omit: ["bottom"] });
  const apex: Vec3 = [0, pyramidTop, 0];
  const rim: Vec3[] = [[west, eave, south], [0, chevronTop, south], [east, eave, south],
    [east, eastChevronTop, 0], [east, eave, north], [0, chevronTop, north],
    [west, eave, north], [west, eastChevronTop, 0]];
  slab(roof, [[west, south], [east, south], [east, north], [west, north]], eave, false);
  // A continuous dark enclosure under raised cladding. Photo references show
  // deep louver recesses and diagonal ribs, not stripes painted on one surface.
  // The eight facets retain the SVG's slightly inconsistent eave/chevron heights.
  for (let i = 0; i < 4; i += 1) {
    const a = rim[2 * i]!, b = rim[2 * i + 1]!, c = rim[(2 * i + 2) % 8]!, n = plan[i]!.normal(0);
    face(shell, [a, b, c], [n[0], 0, n[1]]);
  }
  for (let i = 0; i < rim.length; i += 1) {
    const polygon = [apex, rim[i]!, rim[(i + 1) % 8]!], n = normal(polygon);
    face(roof, polygon, n);
    // Each roof facet meets one of the four ridges at a facade's centre.
    const ridge = rim[i % 2 ? i : (i + 1) % 8]!, axis = ridge[0] === 0 ? 0 : 2;
    const sign = Math.sign(rim[i % 2 ? (i + 1) % 8 : i]![axis]);
    const field = clip(polygon, (p) => sign * p[axis] - (1.10 - 0.55 * (p[1] - ridge[1]) / (pyramidTop - ridge[1])));
    // End the small support struts inside the perimeter. Their caps must not
    // coincide with the blades' caps where both would meet the roof's edge.
    const insetField = polygon.reduce((part, a, j) => {
      const b = polygon[(j + 1) % polygon.length]!, edge = b.map((v, k) => v - a[k]!) as Vec3, length = Math.hypot(...edge);
      const inward = [n[1] * edge[2] - n[2] * edge[1], n[2] * edge[0] - n[0] * edge[2], n[0] * edge[1] - n[1] * edge[0]].map((v) => v / length) as Vec3;
      return clip(part, (p) => p.reduce((sum, v, k) => sum + (v - a[k]!) * inward[k]!, 0) - 0.05);
    }, field);
    for (let y = eave; y < pyramidTop; y += pitch) {
      const strip = clipY(clipY(field, y + 1.8, true), Math.min(y + pitch - 0.12, pyramidTop), false);
      if (strip.length >= 3) relief(bands, strip, n, 0.78);
      // Two fine blades in each dark opening make the mechanical crown legible
      // up close. They stay below the silver band's face, with open gaps between.
      for (const dy of [0.48, 1.12]) {
        const blade = clipY(clipY(field, y + dy, true), y + dy + 0.13, false);
        if (blade.length >= 3) relief(louvers, blade, n, 0.20, 0.1);
      }
      // The photo's mechanical openings have a fine supporting grid behind the
      // broad cladding. These struts sit between the recessed blades and fascia.
      const opening = clipY(clipY(insetField, y + 0.25, true), y + 1.55, false);
      for (let across = 3.4; across < Math.max(east, south); across += 3.4) {
        const strut = clip(clip(opening, (p) => sign * p[axis] - across), (p) => across + 0.09 - sign * p[axis]);
        if (strut.length >= 3) relief(frames, strut, n, 0.23, 0.12);
      }
    }
  }
  // One closed beam spans each ridge. Extruding its two neighboring roof faces
  // independently would pull them apart and leave a slit down the ridge's centre.
  for (const start of rim.filter((_, i) => i % 2)) {
    const direction = apex.map((v, i) => v - start[i]!) as Vec3, length = Math.hypot(...direction);
    const d = direction.map((v) => v / length) as Vec3;
    const lateral = [Math.sign(start[2]), 0, -Math.sign(start[0])] as Vec3;
    const n = [lateral[1] * d[2] - lateral[2] * d[1], lateral[2] * d[0] - lateral[0] * d[2], lateral[0] * d[1] - lateral[1] * d[0]] as Vec3;
    const section = (at: Vec3, width: number, buried: number): Vec3[] => ([[-width, -buried], [width, -buried], [width, 0.75], [-width, 0.75]] as [number, number][])
      .map(([across, depth]) => at.map((v, i) => v + across * lateral[i]! + depth * n[i]!) as Vec3);
    // Shallower at the apex: a full-depth cap crosses the axis and pokes through
    // the opposite beam's top beside the spire, despite both solids being closed.
    const bottom = section(start, 1.25, 2.8), top = section(apex, 0.7, 1.2);
    face(frames, bottom, d.map((v) => -v) as Vec3);
    face(frames, [...top].reverse(), d);
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      face(frames, [bottom[i]!, top[i]!, top[j]!, bottom[j]!]);
    }
  }

  // Detail is clipped above each projecting tier. Panes stand just outside the solid
  // shell; a recessed pane would be buried because these walls contain no openings.
  const decorate = (run: Run, width: number, peak: number, shoulder: number, centres: number[], cover: typeof main | null = null) => {
    const heightAt = (s: number) => peak - (peak - shoulder) * Math.abs(s - width / 2) / (width / 2);
    // The photos and SVG show floor-by-floor steps, each with a short angled
    // pier cap. A continuous diagonal loses that characteristic sawtooth edge.
    const topAt = (s: number) => Math.min(heightAt(s) - 0.35,
      shoulder + Math.floor((heightAt(s) - shoulder) / pitch) * pitch);
    const boundaries = [-arrowWidth / 2, arrowWidth / 2, ...(cover ? [-cover.half, cover.half] : [])];
    const pieces = (from: number, to: number): [number, number][] => {
      if (to <= from) return [];
      const cuts = [from, ...boundaries.filter((x) => x > from && x < to), to].sort((a, b) => a - b);
      return cuts.slice(1).map((x, i) => [cuts[i]!, x] as [number, number]).filter(([a, b]) => Math.abs((a + b) / 2) >= arrowWidth / 2);
    };
    const floorAt = (a: number, b: number) => cover && Math.abs((a + b) / 2) < cover.half
      ? Math.max(gable(cover, a), gable(cover, b)) : 0;
    // Each head has one floor level; its small cap slopes within that step.
    for (const centre of centres) {
      const headStation = centre + width / 2;
      const headAt = (u: number) => topAt(headStation) + heightAt(u) - heightAt(headStation);
      for (const [a, b] of pieces(centre - pierWidth / 2, centre + pierWidth / 2)) {
        const s = (a + b + width) / 2, at = station(run, s);
        const y0 = floorAt(a, b) + 0.1;
        const points: Vec3[] = ([[a + width / 2, y0], [b + width / 2, y0],
          [b + width / 2, headAt(b + width / 2)], [a + width / 2, headAt(a + width / 2)]] as [number, number][])
          .map(([s, y]) => { const p = run.at(s); return [p[0], y, p[1]]; });
        relief(piers, points, [at.normal[0], 0, at.normal[1]], proud, 0.004);
      }
    }
    const edges = [-width / 2, ...centres, width / 2].sort((a, b) => a - b);
    for (let i = 0; i < edges.length - 1; i += 1) {
      // Split a partly covered bay at the cover's edge. Its exposed portion keeps
      // its windows, even when the other portion is behind a tier or central arrow.
      for (const [x0, x1] of pieces(edges[i]! + pierWidth / 2, edges[i + 1]! - pierWidth / 2)) {
        const s0 = x0 + width / 2, s1 = x1 + width / 2;
        const top = Math.min(topAt(s0), topAt(s1)), floor = floorAt(x0, x1);
        for (let y = 3; y + 0.25 < top; y += pitch) {
          if (y <= floor) continue;
          panel(windows, run, s0, s1, y, Math.min(y + paneHeight, top), 0.025);
        }
      }
    }
  };
  // Narrow panes and thin mullions break up the broad glazed chevrons. The
  // measured outline remains the solid underneath; no transparent material or
  // photographic texture is needed for the monochrome illustration.
  const glazedArrow = (width: number, front: number, shoulder: number, peak: number, floor: (x: number) => number = () => 0, turn = false) => {
    const n: Vec3 = turn ? [1, 0, 0] : [0, 0, 1];
    const at = ([s, y]: [number, number]): Vec3 => turn ? [front, y, -s] : [s, y, front];
    const height = (x: number) => peak - (peak - shoulder) * Math.abs(x) / (width / 2);
    const bays = 4, half = width / 2 - 0.32, bay = half * 2 / bays;
    for (let column = 0; column < bays; column += 1) {
      const a = -half + column * bay + 0.10, b = -half + (column + 1) * bay - 0.10;
      const y1 = Math.max(height(a), height(b)) - 0.35;
      for (let y = 3, row = 0; y < y1; y += pitch, row += 1) {
        let pane: [number, number][] = [[a, y], [b, y], [b, y + pitch - 0.24], [a, y + pitch - 0.24]];
        pane = clip(pane, ([x, h]) => h - floor(x) - 0.12);
        pane = clip(pane, ([x, h]) => height(x) - 0.35 - h);
        if (pane.length < 3) continue;
        const tone = 0.82 + ((row * 13 + column * 7) % 11) * 0.025;
        const color = { r: tone, g: tone, b: tone } as THREE.Color;
        face(glazing, pane.map(at), n, color);
      }
    }
    for (let column = 1; column < bays; column += 1) {
      const x = -half + column * bay, a = x - 0.075, b = x + 0.075;
      const lo = Math.max(floor(a), floor(b)) + 0.1;
      const polygon: Vec3[] = ([[a, lo], [b, lo], [b, height(b) - 0.2], [a, height(a) - 0.2]] as [number, number][]).map(at);
      relief(frames, polygon, n, 0.065, 0.05);
    }
  };
  const southFacade = () => {
    decorate(plan[0]!, towerWidth, chevronTop, eave, southPiers, middle);
    for (const [i, tier] of tiers.entries()) {
      const next = tiers[i + 1], bottom = next ? (x: number) => gable(next, x) : () => 0;
      if (i) {
        gabled(shell, tier.half, tier.back, tier.front, tier.eave, tier.peak);
        const runs = rectangle(-tier.half, tier.half, tier.back, tier.front);
        const centres = i === 1 ? [-23.3, -18.85, -14.4, -9.95, -6.5, 6.5, 10.95, 15.4, 19.85, 23.3] : lowerPiers;
        decorate(runs[0]!, tier.half * 2, tier.peak, tier.eave, centres, next);
        // Glazed returns make the real depth of both projecting setbacks readable.
        for (const side of [runs[1]!, runs[3]!]) {
          for (let y = 3; y + paneHeight < tier.eave; y += pitch) {
            panel(windows, side, 0.25, side.length - 0.25, y, y + paneHeight, 0.025);
          }
        }
        // A thin closed coping follows each gable, with a darker exposed return.
        for (const sign of [-1, 1]) {
          const a = sign * (arrowWidth / 2 + 0.06), b = sign * (tier.half - 0.08);
          const polygon: Vec3[] = ([[Math.min(a, b), gable(tier, Math.min(a, b)) - 0.75],
            [Math.max(a, b), gable(tier, Math.max(a, b)) - 0.75],
            [Math.max(a, b), gable(tier, Math.max(a, b)) + 0.06],
            [Math.min(a, b), gable(tier, Math.min(a, b)) + 0.06]] as [number, number][]).map(([x, y]) => [x, y, tier.front]);
          relief(bands, polygon, [0, 0, 1], 0.48, 0.1);
        }
      }
      // Closed backs sit inside the shaft to avoid coplanar slivers at cap joins.
      gabled(piers, arrowWidth / 2, tier.front - (next ? 0.01 : 0), tier.front + 0.6,
        tier.peak - 7, tier.peak, bottom);
      glazedArrow(arrowWidth, tier.front + 0.625, tier.peak - 7, tier.peak, bottom);
    }
  };
  southFacade();
  onNorth(southFacade);
  // East and west each have a continuous glazed chevron and two flanking strips
  // that were omitted from the first pass. Rear detailing mirrors the front.
  const eastFacade = () => {
    decorate(plan[1]!, towerDepth, eastChevronTop, eave, eastPiers.map((z) => -z));
    gabled(piers, arrowWidth / 2, east, east + 0.6, eastChevronTop - 10, eastChevronTop, 0, true);
    glazedArrow(arrowWidth, east + 0.625, eastChevronTop - 10, eastChevronTop, () => 0, true);
  };
  eastFacade();
  onNorth(eastFacade);

  // A closed four-sided spire, with a small square foot seated around the pyramid tip.
  // At the foot's corners the roof is about 3.8 m below its apex, so the whole
  // footprint must start at least that low to meet the sloping roof on every side.
  const half = 1.4, footY = pyramidTop - 4;
  const foot: Vec3[] = [[-half, footY, half], [half, footY, half], [half, footY, -half], [-half, footY, -half]];
  const tip: Vec3 = [0, spireTop, 0];
  for (let i = 0; i < 4; i += 1) {
    const polygon = [foot[i]!, foot[(i + 1) % 4]!, tip], n = normal(polygon);
    face(spire, polygon, n);
    // A dark inset between the bright folded edges of each tapered face. Two
    // small joints and the exposed final tip retain the metal spire's scale.
    const middle = foot[i]!.map((v, k) => (v + foot[(i + 1) % 4]![k]!) / 2) as Vec3;
    const inset: Vec3[] = [foot[i]!, foot[(i + 1) % 4]!].map((p) => p.map((v, k) => middle[k]! + (v - middle[k]!) * 0.62) as Vec3);
    const panelTip = tip.map((v, k) => v + (middle[k]! - v) * 0.13) as Vec3;
    for (const [lo, hi] of [[pyramidTop + 0.65, pyramidTop + 8], [pyramidTop + 8.25, pyramidTop + 16], [pyramidTop + 16.25, spireTop - 3.5]] as [number, number][]) {
      const section = clipY(clipY([...inset, panelTip], lo, true), hi, false);
      if (section.length >= 3) face(spirePanels, section.map((p) => p.map((v, k) => v + n[k]! * 0.025) as Vec3), n);
    }
  }
  slab(spire, [[-half, half], [half, half], [half, -half], [-half, -half]], footY, false);

  return kit.finish({ height: spireTop, outlines: [shell], opacity: 0.22 });
}
