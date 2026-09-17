import * as THREE from "../vendor/three-r186.js";
import { along, createBuilder, line, point, station } from "./building-kit.js";

// Trump International Hotel and Tower: the drawing's continuous glazed shaft, east roof step,
// ribbed crown, and three-section spire are fitted through the skyline camera. The fitted 405.8 m platform-
// relative tip is below the published 423.2 m street-relative architectural height because the
// study's platform sits above the drawing's street datum. The unseen north and west faces are
// closed, simplified continuations of the observed massing.
// Units are meters; +x is east (right in the skyline view), +z is south.

const tip = 405.8;
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

const shaftPlan = clippedPlan(45.5, 36, 4);
// The source keeps the wide shaft's left outline all the way down. A short western upper
// volume gives its roof the drawn rise without inventing broad lower setbacks outside it.
const upperShaftPlan = clippedPlan(25.45, 36, 4, [-10.025, 0]);
const tiers = [
  { name: "lower shaft", y0: 0, y1: 64, bays: [20, 12] },
  { name: "hotel floors", y0: 64, y1: 123, bays: [20, 12] },
  { name: "residential floors", y0: 123, y1: 204, bays: [20, 12] },
  { name: "upper shaft", y0: 204, y1: eastShoulder, bays: [20, 12], plan: shaftPlan },
  { name: "upper west roof", y0: eastShoulder, y1: crownBase, bays: [11, 12], plan: upperShaftPlan },
].map((tier) => ({ ...tier, plan: tier.plan || shaftPlan }));
// The top pavilion is visibly narrower than the shaft and displaced toward the tower's east
// side. The mast stays inside this roof while its height and plan position fit the source tip.
const crownPlan = clippedPlan(22, 25, 2.8, [13.7, 0]);

const front = (plan) => plan[0];
const east = (plan) => plan[2];
// The source's apparent column pitch opens across the south face, then turns through the
// short south-east bevel and east face. These measured fractions preserve that rhythm instead
// of using one evenly spaced grid across a perspective drawing.
const frontFractions = [0.06532, 0.098685, 0.143357, 0.188, 0.232636, 0.277253, 0.321845, 0.373778, 0.434365, 0.496291, 0.563046, 0.631448, 0.698138, 0.768704, 0.845007, 0.928664];
const cornerFractions = [0.1, 0.586, 1];
const eastFractions = [0.252233, 0.354691, 0.449532, 0.544485, 0.633766, 0.698421, 0.772891, 0.851296, 0.929644, 0.986316];
const evenlySpacedStations = (run, bays) => Array.from({ length: bays - 1 }, (_, index) => station(run, run.length * (index + 1) / bays));
const stationsAt = (run, fractions) => fractions.map((fraction) => station(run, run.length * fraction));
const frontStations = (tier) => tier.plan === shaftPlan ? stationsAt(front(tier.plan), frontFractions) : evenlySpacedStations(front(tier.plan), tier.bays[0]);
const cornerStations = (tier) => tier.plan === shaftPlan ? stationsAt(tier.plan[1], cornerFractions) : [];
const eastStations = (tier) => tier.plan === shaftPlan ? stationsAt(east(tier.plan), eastFractions) : evenlySpacedStations(east(tier.plan), tier.bays[1]);
const paneFractions = (tier, runIndex) => {
  if (tier.plan !== shaftPlan) return Array.from({ length: tier.bays[runIndex === 2 ? 1 : 0] + 1 }, (_, index) => index / tier.bays[runIndex === 2 ? 1 : 0]);
  return [[0, ...frontFractions, 1], [0, ...cornerFractions], [0, ...eastFractions, 1]][runIndex];
};
const shaft = tiers.find((tier) => tier.name === "upper shaft");
const crownStations = Array.from({ length: 14 }, (_, index) => station(front(crownPlan), front(crownPlan).length * (index + 1) / 15));

// Features stay derived from the same plans and dimensions used below. The column points lie
// midway through their proud faces, on the triangulated diagonal, so both fidelity and geometry
// checks can prove the drawn ribs are real, visible solids rather than painted decoration.
const mullionFeature = ({ at, normal }, y0, y1) => point(along({ at, normal }, mullionDepth / 2), (y0 + y1) / 2);
const mastCenter = [19.4, 0];
const facadePoint = (height) => point(front(shaft.plan).at(front(shaft.plan).length * 0.53, 0.08), height);
export const trumpFeatures = {
  trumpTowerWestRoof: point(front(upperShaftPlan).at(0), crownBase),
  trumpTowerEastRoof: point(east(shaft.plan).at(east(shaft.plan).length), eastShoulder),
  trumpEastShoulder: point(east(shaft.plan).at(east(shaft.plan).length), eastShoulder),
  trumpCrownWest: point(front(crownPlan).at(0), crownTop),
  trumpCrownEast: point(east(crownPlan).at(east(crownPlan).length), crownTop),
  trumpSpireTip: [mastCenter[0], tip, mastCenter[1]],
  trumpFacadeProbe: facadePoint(262),
  trumpBehindPrudential: facadePoint(120),
  trumpSpireUpperJoint: [mastCenter[0], 383.4, mastCenter[1]],
  trumpSpireLowerJoint: [mastCenter[0], 357.02, mastCenter[1]],
  trumpFrontMullions: frontStations(shaft).map((where) => mullionFeature(where, shaft.y0 + 0.25, shaft.y1 - 0.3)),
  trumpCornerMullions: cornerStations(shaft).map((where) => mullionFeature(where, shaft.y0 + 0.25, shaft.y1 - 0.3)),
  trumpEastMullions: eastStations(shaft).map((where) => mullionFeature(where, shaft.y0 + 0.25, shaft.y1 - 0.3)),
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
  const crownShell = batch("crown enclosure", dark);
  const crown = batch("ribbed crown", dark);
  const mast = batch("segmented spire", spireMetal);

  // The source preserves a continuous outer shaft. Its low east shoulder carries the crown
  // enclosure, while a western roof volume reaches the taller drawn roofline.
  prism(shell, shaft.plan, [0, eastShoulder]);
  prism(shell, upperShaftPlan, [eastShoulder, crownBase]);
  prism(crownShell, crownPlan, [eastShoulder, crownTop]);

  const tones = [0x45494a, 0x4a4d4d, 0x505253, 0x3f4344].map((hex) => new THREE.Color(hex));
  const lit = new THREE.Color(0x8a8b82);
  const shade = new THREE.Color(0x303335);
  const visibleRuns = (plan) => [plan[0], plan[1], plan[2]];

  // Window panes are set slightly proud of the closed wall. The grid follows each visible
  // face through every setback, with occasional dimly lit cells from the reference photo.
  for (const tier of tiers) {
    // The crown enclosure joins the upper west roof on its east wall. Do not add a second
    // facade layer there: the enclosure owns that shared surface and closes the join.
    const runs = tier.plan === upperShaftPlan ? [tier.plan[0], tier.plan[1]] : visibleRuns(tier.plan);
    const stationSets = [0, 1, 2].map((runIndex) => paneFractions(tier, runIndex).map((fraction) => runs[runIndex]?.length * fraction));
    for (const [runIndex, run] of runs.entries()) {
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
      band(ribs, runs, y - 0.12, y + 0.07, 0.095, { omit: ["back"] });
    }
    const mullions = tier.plan === upperShaftPlan ? frontStations(tier) : [...frontStations(tier), ...cornerStations(tier), ...eastStations(tier)];
    for (const where of mullions) {
      box(ribs, where.at, where.normal, 0.11, 0, mullionDepth, tier.y0 + 0.14, tier.y1 - 0.14);
    }
  }
  // The source steps down at the shaft's north-east corner before the compact crown begins.
  // Keep the front floor rhythm while a short side band gives that shoulder a real edge.
  band(ribs, [front(shaft.plan)], eastShoulder - 0.24, eastShoulder - 0.05, 0.095, { omit: ["back"] });
  band(ribs, [shaft.plan[1], shaft.plan[2]], eastShoulder - 0.24, eastShoulder - 0.05, 0.11, { omit: ["back"] });

  // The dark, shallow crown has dense vertical ribs and a few broad horizontal seams. This
  // makes the top read as a separate mechanical band from both the main shaft and antenna.
  for (const where of crownStations) box(crown, where.at, where.normal, 0.12, 0, 0.22, eastShoulder + 0.12, crownTop - 0.12);
  for (const y of [eastShoulder + 4.5, eastShoulder + 9.2, crownBase + 4.5, crownBase + 9.2]) band(crown, visibleRuns(crownPlan), y - 0.11, y + 0.08, 0.11, { omit: ["back"] });

  // Three nested boxes reproduce the source's segmented white antenna. Keeping each solid
  // closed makes the rear and elevated camera views finished as well as the skyline view.
  const addMastSection = ([y0, y1, half]) => box(mast, mastCenter, [0, 1], half, -half, half, y0, y1);
  addMastSection([crownTop, 357.02, 1.1]);
  addMastSection([357.02, 383.4, 0.68]);
  addMastSection([383.4, tip, 0.5]);

  return kit.finish({ height: tip, outlines: [shell, crownShell], opacity: 0.24 });
}
