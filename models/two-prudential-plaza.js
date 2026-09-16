import { createBuilder, rectangle, station } from "./building-kit.js";

// Two Prudential Plaza, fitted to the SVG rather than surveyed dimensions. +x is east,
// +z south, in metres above the study's platform. The drawing stretches this tower:
// its spire fits at 345.79 m above the platform, versus 303.3 m above the real street.
// The front chevrons project south in two shallow setbacks; hidden faces are inferred.
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
const gable = (tier, x) => tier.peak - (tier.peak - tier.eave) * Math.abs(x) / tier.half;
const southPiers = [-28.7, -24.645, -20.143, -15.648, -11.158, -6.674, 6.614, 11.045, 15.472, 20.045, 24.453, 28.7];
const eastPiers = [-18.525, -15.67, -12.333, -9.128, 12.044, 15.057, 18.625];
const lowerPiers = [-20.04, -15.69, -11.205, -6.705, 7.341, 11.797, 16.247, 20.04];

export const twoPrudentialFeatures = {
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
  twoSouthPiers: southPiers.map((x) => [x, 243, south + proud / 2]),
  twoEastPiers: eastPiers.map((z) => [east + proud / 2, 220, z]),
  twoLowerPiers: lowerPiers.map((x) => [x, 130, lower.front + proud / 2]),
  twoFacade: [east + proud, 180, -12],
  // Below the podium roof, on the south face it hides; used for scene raycast checks.
  twoBehindPodium: [-15, 12, lower.front],
};

export function createTwoPrudentialPlazaBuilding() {
  const kit = createBuilder("Two Prudential Plaza", "building-two-prudential-plaza");
  const { material, batch, prism, slab, panel, box, triangle, quad } = kit;
  const stone = material(0x868686), glass = material(0x4c4c4c), metal = material(0x535353);
  const shell = batch("tower and setback shells", stone);
  const roof = batch("pyramid and chevron roofs", metal);
  const bands = batch("pyramid silver bands", material(0xa6a6a6));
  const windows = batch("window panes", glass);
  const piers = batch("vertical piers and chevrons", metal);
  const spire = batch("spire", material(0xe9e9e9));

  // A geometric face normal, also used for the sloping caps and tapered spire.
  const normal = ([a, b, c]) => {
    const u = b.map((v, i) => v - a[i]), v = c.map((v, i) => v - a[i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...n);
    return n.map((v) => v / length);
  };
  const face = (target, vertices, outward) => {
    for (let i = 1; i < vertices.length - 1; i += 1) {
      const points = [vertices[0], vertices[i], vertices[i + 1]];
      const n = outward || normal(points);
      triangle(target, points, [n, n, n]);
    }
  };
  // Closed pentagonal extrusion: a real projecting setback or a pointed central pier.
  // Back, bottom, and sloping caps are present even where another volume hides them.
  const gabled = (target, half, back, front, shoulder, peak, bottom = 0, turn = false) => {
    const profile = [[-half, bottom], [half, bottom], [half, shoulder], [0, peak], [-half, shoulder]];
    const at = ([s, y], z) => turn ? [z, y, -s] : [s, y, z];
    const frontPoints = profile.map((p) => at(p, front)), backPoints = profile.map((p) => at(p, back));
    face(target, frontPoints, turn ? [1, 0, 0] : [0, 0, 1]);
    face(target, [...backPoints].reverse(), turn ? [-1, 0, 0] : [0, 0, -1]);
    for (let i = 0; i < profile.length; i += 1) {
      const j = (i + 1) % profile.length;
      face(target, [backPoints[i], backPoints[j], frontPoints[j], frontPoints[i]]);
    }
  };

  // The platform covers this sole omitted floor. A closed roof volume above the eave
  // meets the shaft; its diamond ridges terminate at the four facade chevrons.
  prism(shell, plan, [0, eave], { omit: ["bottom"] });
  const apex = [0, pyramidTop, 0];
  const rim = [[west, eave, south], [0, chevronTop, south], [east, eave, south],
    [east, eastChevronTop, 0], [east, eave, north], [0, chevronTop, north],
    [west, eave, north], [west, eastChevronTop, 0]];
  for (let i = 0; i < 4; i += 1) {
    const a = rim[2 * i], b = rim[2 * i + 1], c = rim[(2 * i + 2) % 8];
    const n = plan[i].normal(0);
    face(shell, [a, b, c], [n[0], 0, n[1]]);
  }
  slab(roof, [[west, south], [east, south], [east, north], [west, north]], eave, false);
  // Partition the roof triangles into horizontal bands. Adjacent bands share an edge,
  // never a coplanar overlay, so the stripes remain sound when orbiting or zooming.
  const clipY = (polygon, y, above) => polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length], ina = above ? a[1] >= y : a[1] <= y, inb = above ? b[1] >= y : b[1] <= y;
    const points = ina ? [a] : [];
    if (ina !== inb) { const t = (y - a[1]) / (b[1] - a[1]); points.push(a.map((v, k) => v + t * (b[k] - v))); }
    return points;
  });
  for (let i = 0; i < rim.length; i += 1) {
    // The rim runs counterclockwise from above; these normals face up and out.
    const polygon = [apex, rim[i], rim[(i + 1) % 8]], n = normal(polygon);
    for (let y = eave; y < pyramidTop; y += pitch) {
      for (const [lo, hi, target] of [[y, y + 1.8, roof], [y + 1.8, Math.min(y + pitch, pyramidTop), bands]]) {
        const clipped = clipY(clipY(polygon, lo, true), hi, false);
        if (clipped.length >= 3) face(target, clipped, n);
      }
    }
  }
  for (const tier of [middle, lower]) gabled(shell, tier.half, tier.back, tier.front, tier.eave, tier.peak);

  // Detail is clipped above each projecting tier. Panes stand just outside the solid
  // shell; a recessed pane would be buried because these walls contain no openings.
  const hidden = (tierIndex, x) => {
    const next = tiers[tierIndex + 1];
    return next && Math.abs(x) <= next.half + 0.15 ? gable(next, x) : 0;
  };
  const decorate = (run, width, peak, shoulder, centres, floorAt = () => 0) => {
    const heightAt = (s) => peak - (peak - shoulder) * Math.abs(s - width / 2) / (width / 2);
    const topAt = (s) => Math.min(heightAt(s) - 1.5, shoulder + Math.floor((heightAt(s) - shoulder) / pitch) * pitch);
    // Each strip stops one floor at a time, making the chevron's stepped window edges.
    for (const centre of centres) {
      const s = centre + width / 2, at = station(run, s);
      const y0 = floorAt(centre) + 0.1, y1 = topAt(s);
      box(piers, at.at, at.normal, pierWidth / 2, 0, proud, y0, y1, { omit: ["back"] });
    }
    const edges = [-width / 2, ...centres, width / 2].sort((a, b) => a - b);
    for (let i = 0; i < edges.length - 1; i += 1) {
      const x0 = edges[i] + pierWidth / 2, x1 = edges[i + 1] - pierWidth / 2;
      if (x1 <= x0 || (x0 < arrowWidth / 2 && x1 > -arrowWidth / 2)) continue;
      const s0 = x0 + width / 2, s1 = x1 + width / 2;
      const top = Math.min(topAt(s0), topAt(s1));
      const floor = Math.max(floorAt(x0), floorAt(x1));
      for (let y = 3; y + paneHeight < top; y += pitch) {
        if (y <= floor) continue;
        panel(windows, run, s0, s1, y, y + paneHeight, 0.025);
      }
    }
  };
  // Main tower: all four faces, with the rear grid inferred from the visible faces.
  decorate(plan[0], towerWidth, chevronTop - 7, eave, southPiers, (x) => hidden(0, x));
  decorate(plan[1], towerDepth, eastChevronTop - 7, eave, eastPiers.map((z) => -z));
  decorate(plan[2], towerWidth, chevronTop - 7, eave, southPiers);
  decorate(plan[3], towerDepth, eastChevronTop - 7, eave, eastPiers.map((z) => -z));
  for (const [i, tier] of [middle, lower].entries()) {
    const runs = rectangle(-tier.half, tier.half, tier.back, tier.front), run = runs[0];
    const centres = i === 0 ? [-23.3, -18.85, -14.4, -9.95, -6.5, 6.5, 10.95, 15.4, 19.85, 23.3] : lowerPiers;
    decorate(run, tier.half * 2, tier.peak - 7, tier.eave, centres, (x) => hidden(i + 1, x));
    // The shallow returns become visible when orbiting; their windows use the same grid.
    for (const side of [runs[1], runs[3]]) {
      for (let y = 3; y + paneHeight < tier.eave; y += pitch) {
        panel(windows, side, 0.5, side.length - 0.5, y, y + paneHeight, 0.025);
      }
    }
  }
  // The broad dark central arrows sit on the face, and stop at their pointed caps.
  tiers.forEach((tier, i) => gabled(piers, arrowWidth / 2, tier.front, tier.front + 0.6,
    tier.peak - 7, tier.peak, i < 2 ? tiers[i + 1].peak + 0.1 : 0));
  gabled(piers, arrowWidth / 2, east, east + 0.6, eastChevronTop - 10, eastChevronTop, 0, true);
  gabled(piers, arrowWidth / 2, north - 0.6, north, chevronTop - 7, chevronTop);
  gabled(piers, arrowWidth / 2, west - 0.6, west, eastChevronTop - 10, eastChevronTop, 0, true);

  // A closed four-sided spire, with a small square foot seated around the pyramid tip.
  const half = 1.4, footY = pyramidTop - 2;
  const foot = [[-half, footY, half], [half, footY, half], [half, footY, -half], [-half, footY, -half]];
  const tip = [0, spireTop, 0];
  for (let i = 0; i < 4; i += 1) face(spire, [foot[i], foot[(i + 1) % 4], tip]);
  slab(spire, [[-half, half], [half, half], [half, -half], [-half, -half]], footY, false);

  return kit.finish({ height: spireTop, outlines: [shell], opacity: 0.22 });
}
