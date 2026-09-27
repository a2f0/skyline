import { buildCrainTower, crainFloors, crainMainRoof } from "./crain-tower.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// The Crain Communications Building on a clean version of its mapped plan, in real meters:
// the solo study shows it whole, and the skyline study places a copy cut at the drawing's
// datum. crain-tower.ts builds it, and the geographic model on the mapped parts.
//
// The plan is the OpenStreetMap outline squared up. The south-west half is an isosceles
// right triangle with 38.6 m legs. The north-east half is its twin across the split, its
// own split line parallel to the first and 4.95 m from it. The two touch along the middle,
// and a V-notch opens at each end of the split: 7.6 m deep at the south-east corner, and at
// the north-west, where the gap between them runs 13.4 m inward as the slot. Both roofs
// peak at the published 177.4 m and fall 1.225 m per metre along the diagonal, about 51°,
// measured on the photograph the drawing was traced from. OpenStreetMap's roof tags put the
// two peaks 5 m apart and the slopes near 55°, which the photograph does not show.
// See docs/crain-reference.md. Units are meters; +x is east and +z is south.
const halfWidth = 19.3, halfDepth = 22.8;
const offset = halfDepth - halfWidth;
const notch = 7.6, slotLength = 13.4;
const tip = 177.4, fall = 1.225;
const diagonal: Vec2 = [Math.SQRT1_2, Math.SQRT1_2];

// The south-west half, from its peak on the west face.
const peakWest: Vec2 = [-halfWidth, halfDepth - 2 * halfWidth];
const southWest: Vec2 = [-halfWidth, halfDepth], southEast: Vec2 = [halfWidth, halfDepth];
// The north-east half, from its peak at the north-west corner.
const northWest: Vec2 = [-halfWidth, -halfDepth], northEast: Vec2 = [halfWidth, -halfDepth];
const notchApex: Vec2 = [halfWidth - notch, halfDepth - notch], notchEast: Vec2 = [halfWidth, halfDepth - 2 * notch];
const slotWest: Vec2 = [peakWest[0] + slotLength * diagonal[0], peakWest[1] + slotLength * diagonal[1]];
const slotEast: Vec2 = [slotWest[0] + offset, slotWest[1] - offset];
const notchWest: Vec2 = [peakWest[0] + offset, peakWest[1] - offset];

const along = (from: Vec2) => (point: Vec2) => (point[0] - from[0]) * diagonal[0] + (point[1] - from[1]) * diagonal[1];
const southWestRoof = (point: Vec2) => tip - fall * along(peakWest)(point);
const northEastRoof = (point: Vec2) => tip - fall * along(northWest)(point);

function createCrain(base: number): BuildingModel {
  return buildCrainTower({
    name: "Crain Communications Building",
    id: "building-crain-communications",
    base,
    grid: { origin: southWest, axis: [1, 0] },
    volumes: [
      { corners: [peakWest, southWest, southEast, notchApex, slotWest], roof: southWestRoof, glazed: true },
      { corners: [northWest, northEast, notchEast, notchApex, slotWest, slotEast], roof: northEastRoof, glazed: true },
      { corners: [peakWest, slotWest, slotEast, notchWest], roof: () => crainMainRoof, glazed: false },
    ],
  });
}

// The whole building from the street, for the solo study.
export function createCrainBuilding(): BuildingModel {
  return createCrain(0);
}

// The skyline drawing shows the tower from the photograph's treeline up, so its platform
// datum crosses the tower above the street: 39.6 m, fitted with the placement in
// skyline-study.ts, which scales and places this copy. Its y = 0 is that datum, and the
// lowest drawn sill is the twelfth floor's, the first above the lobby being the second.
export const crainSkylineBase = 39.6;
export function createCrainSkylineBuilding(): BuildingModel {
  return createCrain(crainSkylineBase);
}

// Features the skyline test projects against the drawing, in the skyline copy's own
// coordinates, derived from the geometry above. The drawn sills are the twenty-nine the
// left face shows below its shoulder, the twelfth floor's to the fortieth's, on the
// south-west corner the drawing's left edge traces.
const at = ([x, z]: Vec2, real: number): Vec3 => [x, real - crainSkylineBase, z];
const sill = (floor: number) => crainFloors.lobbyTop + (floor - 2) * crainFloors.pitch + crainFloors.sill;
export const crainFeatures: Record<string, Vec3 | Vec3[]> = {
  crainSills: Array.from({ length: 29 }, (_, i) => at(southWest, sill(12 + i))),
  // A point on the south face, below the roof and clear of every neighbour, for hover.
  crainFacadeProbe: [0, 60, halfDepth + 0.05],
  crainPeakWest: at(peakWest, southWestRoof(peakWest)),
  crainPeakEast: at(northWest, northEastRoof(northWest)),
  crainShoulderWest: at(southWest, southWestRoof(southWest)),
  crainShoulderEast: at(northEast, northEastRoof(northEast)),
  crainFoot: at(southEast, southWestRoof(southEast)),
  crainStepEast: at(notchEast, northEastRoof(notchEast)),
  crainSlotWest: at(slotWest, southWestRoof(slotWest)),
  crainSlotEast: at(slotEast, northEastRoof(slotEast)),
};
