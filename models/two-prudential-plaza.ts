import type { BuildingModel, Vec3 } from "./building-kit.js";
import { buildTwoPrudentialTower, pierStations, twoPrudentialCore, twoPrudentialGables, twoPrudentialLevels } from "./two-prudential-tower.js";

// Two Prudential Plaza on a clean version of its plan, in real meters, for the skyline
// study's original layout, which places this copy in skyline-study.ts. two-prudential-tower.ts
// builds it, and the geographic model on the mapped outline. The plan is the mapped one
// squared: the 40.8 x 37.5 m core, with each pair of tiers 4.5 m deep, so the lower tiers'
// fronts stand 27.75 m either side of its centre and the tower keeps the mapped 55.5 m
// depth. See docs/two-prudential-reference.md. Units are meters; +x is east and +z is south.
const front = 27.75;

// The skyline drawing shows the tower above One Prudential's podium, so its platform datum
// crosses the tower above the street: fitted with the placement in skyline-study.ts,
// which scales, turns, and places this copy. Its y = 0 is that datum.
export const twoPrudentialSkylineBase = 35.4;
// The drawing draws each tier's gable as one slope from its shoulders to a point about 2 m
// above the line its steps climb: in the night photograph it traces, each tier's dark glass
// head runs on into the dark strip of the wall behind it. This copy keeps the drawn points.
export const twoPrudentialDrawnTierPeaks = Object.freeze({ lower: 181.9, middle: 217.2 });
export function createTwoPrudentialPlazaBuilding(): BuildingModel {
  return buildTwoPrudentialTower({ name: "Two Prudential Plaza", id: "building-two-prudential-plaza", centre: [0, 0], along: [1, 0], fronts: [front, front], base: twoPrudentialSkylineBase, tierPeaks: twoPrudentialDrawnTierPeaks });
}

// Features the skyline test projects against the drawing, in this copy's coordinates.
const h = twoPrudentialLevels, g = twoPrudentialGables, [coreA, coreB] = twoPrudentialCore, drawn = twoPrudentialDrawnTierPeaks;
const at = (x: number, real: number, z: number): Vec3 => [x, real - twoPrudentialSkylineBase, z];
const middleFront = coreB + (front - coreB) / 2;
// A pier's point halfway out to its face, so a present pier is met a little before it.
const halfPier = 0.175;
// Every pier across a gabled face, west to east, from its middle.
const across = (gable: typeof g.front) => { const stations = pierStations(gable); return [...stations.map((r) => -r), ...[...stations].reverse()]; };
export const twoPrudentialFeatures: Record<string, Vec3 | Vec3[]> = {
  // The core's corners at the eave, and the points of its south and east gables.
  twoEaveWest: at(-coreA, h.eave, coreB),
  twoEaveNear: at(coreA, h.eave, coreB),
  twoEaveEast: at(coreA, h.eave, -coreB),
  twoSouthChevron: at(0, h.peak, coreB + 0.03),
  twoEastChevron: at(coreA + 0.03, h.peak, 0),
  twoPyramid: at(0, h.apex, 0),
  twoSpire: at(0, h.tip, 0),
  // The tiers' points and their shoulders at their fronts' corners.
  twoMiddleChevron: at(0, drawn.middle, middleFront),
  twoLowerChevron: at(0, drawn.lower, front),
  twoMiddleWest: at(-g.middle.half, h.middleShoulder, middleFront),
  twoMiddleEast: at(g.middle.half, h.middleShoulder, middleFront),
  twoLowerWest: at(-g.lower.half, h.lowerShoulder, front),
  twoLowerEast: at(g.lower.half, h.lowerShoulder, front),
  // The core's south piers above the middle tier, all twelve.
  twoSouthPiers: across(g.front).map((x) => at(x, 222, coreB + halfPier)),
  // The east face's piers from its north corner, where the face's x runs north to south
  // as z does: every one but the first south of the strip, which the drawing leaves out.
  twoEastPiers: across(g.side).filter((_, index) => index !== 6).map((z) => at(coreA + halfPier, 204, z)),
  // The lower tier's eight piers.
  twoLowerPiers: across(g.lower).map((x) => at(x, 135, front + halfPier)),
  // A window on the east face, clear of every neighbour, for hover.
  twoFacade: at(coreA + 0.02, 180, -10.7),
  // On the lower tier's front below the podium roof, which hides it: for scene raycasts.
  twoBehindPodium: at(-10, 45, front),
};
