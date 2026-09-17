import * as THREE from "../vendor/three-r186.js";
import { along, createBuilder, line, point, station } from "./building-kit.js";

// Trump International Hotel and Tower: the drawing's stepped glazed shaft, ribbed crown,
// and three-section spire are fitted through the skyline camera. The fitted 405 m platform-
// relative tip is below the published 423.2 m street-relative architectural height because the
// study's platform sits above the drawing's street datum. The unseen north and west faces are
// closed, simplified continuations of the observed massing.
// Units are meters; +x is east (right in the skyline view), +z is south.

const tip = 405;
const crownBase = 335.4;
const crownTop = 345;
const eastShoulder = crownBase - 10;
const floorHeight = 4.05;
const mullionDepth = 0.2;

// A clipped rectangle retains the tower's broad glass faces while making its faceted corners
// catch light as they do in the SVG. The runs remain counterclockwise from above.
function clippedPlan(width, depth, clip, [centerX = 0, centerZ = 0] = []) {
  const west = centerX - width / 2, east = centerX + width / 2;
  const north = centerZ - depth / 2, south = centerZ + depth / 2;
  const points = [
    [west + clip, south], [east - clip, south], [east, south - clip], [east, north + clip],
    [east - clip, north], [west + clip, north], [west, north + clip], [west, south - clip],
  ];
  return points.map((at, index) => line(at, points[(index + 1) % points.length]));
}

const tiers = [
  { name: "river base", y0: 0, y1: 64, width: 61, depth: 49, clip: 5.4, bays: [13, 8] },
  { name: "hotel setback", y0: 64, y1: 123, width: 56, depth: 45, clip: 5, bays: [12, 8] },
  { name: "residential setback", y0: 123, y1: 204, width: 50, depth: 41, clip: 4.5, bays: [11, 7] },
  { name: "upper shaft", y0: 204, y1: crownBase, width: 45.5, depth: 36, clip: 4, bays: [10, 6] },
].map((tier) => ({ ...tier, plan: clippedPlan(tier.width, tier.depth, tier.clip) }));
// The top pavilion is visibly narrower than the shaft and displaced toward the tower's east
// side. The mast sits farther east again, matching the source drawing's offset antenna.
const crownPlan = clippedPlan(22, 25, 2.8, [13.7, 0]);

const front = (plan) => plan[0];
const east = (plan) => plan[2];
const frontStations = (tier) => Array.from({ length: tier.bays[0] - 1 }, (_, index) => station(front(tier.plan), front(tier.plan).length * (index + 1) / tier.bays[0]));
const eastStations = (tier) => Array.from({ length: tier.bays[1] - 1 }, (_, index) => station(east(tier.plan), east(tier.plan).length * (index + 1) / tier.bays[1]));
const shaft = tiers.at(-1);
const crownStations = Array.from({ length: 14 }, (_, index) => station(front(crownPlan), front(crownPlan).length * (index + 1) / 15));

// Features stay derived from the same plans and dimensions used below. The column points lie
// midway through their proud faces, on the triangulated diagonal, so both fidelity and geometry
// checks can prove the drawn ribs are real, visible solids rather than painted decoration.
const mullionFeature = ({ at, normal }, y0, y1) => point(along({ at, normal }, mullionDepth / 2), (y0 + y1) / 2);
const mastCenter = (() => {
  const front = crownPlan[0].at(crownPlan[0].length / 2);
  return [front[0] + 15.6, front[1]];
})();
const facadePoint = (height) => point(front(shaft.plan).at(front(shaft.plan).length * 0.53, 0.08), height);
export const trumpFeatures = {
  trumpTowerWestRoof: point(front(shaft.plan).at(0), crownBase),
  trumpTowerEastRoof: point(east(shaft.plan).at(east(shaft.plan).length), crownBase),
  trumpEastShoulder: point(east(shaft.plan).at(east(shaft.plan).length), eastShoulder),
  trumpCrownWest: point(front(crownPlan).at(0), crownTop),
  trumpCrownEast: point(east(crownPlan).at(east(crownPlan).length), crownTop),
  trumpSpireTip: [mastCenter[0], tip, mastCenter[1] + 0.55],
  trumpFacadeProbe: facadePoint(262),
  trumpBehindPrudential: facadePoint(120),
  trumpFrontMullions: frontStations(shaft).slice(0, 5).map((where) => mullionFeature(where, shaft.y0 + 0.25, shaft.y1 - 0.3)),
  trumpCrownMullions: crownStations.map((where) => mullionFeature(where, crownBase + 0.15, crownTop - 0.2)),
};

export function createTrumpInternationalTowerBuilding() {
  const kit = createBuilder("Trump International Hotel and Tower", "building-trump-tower-only");
  const { material, batch, panel, band, box, prism } = kit;
  const facade = material(0x333638);
  const glass = material(0x4a4c4d, { vertexColors: true });
  const frame = material(0x777a79);
  const dark = material(0x202325);
  const spireMetal = material(0xd0d0cd);
  const shell = batch("closed stepped glass shells", facade);
  const panes = batch("glazed floor panels", glass);
  const ribs = batch("raised mullions and floor bands", frame);
  const crown = batch("ribbed crown", dark);
  const mast = batch("segmented spire", spireMetal);

  // The four reductions correspond to the stack of setbacks visible in the source drawing.
  // Each prism is closed on its own, leaving its exposed roof ledges physically present.
  for (const tier of tiers) prism(shell, tier.plan, [tier.y0, tier.y1]);
  prism(shell, crownPlan, [crownBase, crownTop]);

  const tones = [0x45494a, 0x4a4d4d, 0x505253, 0x3f4344].map((hex) => new THREE.Color(hex));
  const lit = new THREE.Color(0x8a8b82);
  const shade = new THREE.Color(0x303335);
  const visibleRuns = (plan) => [plan[0], plan[1], plan[2]];

  // Window panes are set slightly proud of the closed wall. The grid follows each visible
  // face through every setback, with occasional dimly lit cells from the reference photo.
  for (const tier of tiers) {
    const stationSets = [
      Array.from({ length: tier.bays[0] + 1 }, (_, index) => front(tier.plan).length * index / tier.bays[0]),
      [0, east(tier.plan).length],
      Array.from({ length: tier.bays[1] + 1 }, (_, index) => east(tier.plan).length * index / tier.bays[1]),
    ];
    for (const [runIndex, run] of visibleRuns(tier.plan).entries()) {
      const stations = stationSets[runIndex];
      for (let bay = 0; bay < stations.length - 1; bay += 1) {
        const s0 = stations[bay] + 0.16, s1 = stations[bay + 1] - 0.16;
        if (s1 - s0 < 0.25) continue;
        for (let y = tier.y0 + 0.26, row = 0; y + 0.28 < tier.y1; y += floorHeight, row += 1) {
          const hash = (row * 37 + bay * 17 + runIndex * 23 + Math.round(tier.y0)) % 29;
          panel(panes, run, s0, s1, y, Math.min(y + floorHeight - 0.42, tier.y1 - 0.16), 0.035,
            hash === 0 ? lit : hash < 3 ? shade : tones[hash % tones.length]);
        }
      }
    }

    // Horizontal floor bands wrap the observed south-east corner and their own closed backs
    // meet the shell instead of leaving floating single-sided strips.
    for (let y = tier.y0 + floorHeight; y + 0.12 < tier.y1; y += floorHeight) {
      // The shoulder band below is the same facade seam on the upper shaft. Let it own
      // that seam so two proud bands do not occupy the same outward-facing surface.
      if (tier === shaft && y - 0.12 <= eastShoulder + 0.06 && y + 0.07 >= eastShoulder - 0.12) continue;
      band(ribs, visibleRuns(tier.plan), y - 0.12, y + 0.07, 0.095, { omit: ["back"] });
    }
    for (const where of [...frontStations(tier), ...eastStations(tier)]) {
      box(ribs, where.at, where.normal, 0.11, 0, mullionDepth, tier.y0 + 0.14, tier.y1 - 0.14);
    }
  }
  // The source steps down at the shaft's north-east corner before the compact crown begins.
  // A short proud band gives that shoulder a real edge instead of approximating it with shade.
  band(ribs, [shaft.plan[1], shaft.plan[2]], eastShoulder - 0.12, eastShoulder + 0.06, 0.11, { omit: ["back"] });

  // The dark, shallow crown has dense vertical ribs and a few broad horizontal seams. This
  // makes the top read as a separate mechanical band from both the main shaft and antenna.
  for (const where of crownStations) box(crown, where.at, where.normal, 0.12, 0, 0.22, crownBase + 0.12, crownTop - 0.12);
  for (const y of [crownBase + 4.5, crownBase + 9.2]) band(crown, visibleRuns(crownPlan), y - 0.11, y + 0.08, 0.11, { omit: ["back"] });

  // Three nested boxes reproduce the source's segmented white antenna. Keeping each solid
  // closed makes the rear and elevated camera views finished as well as the skyline view.
  const addMastSection = ([y0, y1, half]) => box(mast, mastCenter, [0, 1], half, -half, half, y0, y1);
  addMastSection([crownTop, 369, 1.3]);
  addMastSection([369, 390, 0.92]);
  addMastSection([390, tip, 0.55]);

  return kit.finish({ height: tip, outlines: [shell, crown], opacity: 0.24 });
}
