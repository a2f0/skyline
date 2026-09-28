import { aonLevels, buildAonTower } from "./aon-tower.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// Aon Center on a clean version of its plan, in real meters, for the skyline study's
// original layout, which places this copy in skyline-study.ts. aon-tower.ts builds it, and
// the geographic model on the mapped outline.
//
// The plan is the published 59.15 m square. Each face's main run holds fifteen 10 ft bays,
// as the photograph and the drawing both count and the building's descriptions give.
// That leaves each corner a 6.7 m notch: a 45° chamfer, a square step, and a second
// chamfer, in the mapped outline's proportions. The mapped notches run about 1.5 m deeper;
// the photograph's bays and corner widths fit these. See docs/aon-reference.md. Units are
// meters; +x is east and +z is south.
const half = 59.15 / 2, notch = 6.715, chamfer = 1.9, step = notch - 2 * chamfer;
// The south-east notch, from the south face's east end to the east face's south end.
const southEast: Vec2[] = [
  [half - notch, half],
  [half - notch + chamfer, half - chamfer],
  [half - notch + chamfer, half - chamfer - step],
  [half - notch + chamfer + step, half - chamfer - step],
  [half, half - notch],
];
// Each corner turns the south-east one a quarter further round.
const turn = ([x, z]: Vec2, quarters: number): Vec2 => (quarters === 0 ? [x, z] : turn([z, -x], quarters - 1));
const outline: Vec2[] = [0, 1, 2, 3].flatMap((quarters) => southEast.map((point) => turn(point, quarters)));
// The rooftop enclosure, centred as the mapped part is, and the antenna at its centre.
const enclosure: Vec2[] = [[-16, -16], [16, -16], [16, 16], [-16, 16]];

// The skyline drawing shows the tower from the photograph's treeline up, so its platform
// datum crosses the tower above the street: 30.6 m, fitted with the placement in
// skyline-study.ts, which scales, turns, and places this copy. Its y = 0 is that datum,
// and the drawing's top floor band is the eightieth office floor, under the mechanical ones.
export const aonSkylineBase = 30.6;
export function createAonCenterBuilding(): BuildingModel {
  return buildAonTower({ name: "Aon Center", id: "layer3", outline, enclosure, mast: [0, 0], base: aonSkylineBase });
}

// Features the skyline test projects against the drawing, in this copy's coordinates.
const at = ([x, z]: Vec2, real: number): Vec3 => [x, real - aonSkylineBase, z];
const bays = 15, bay = (southEast[0]![0] - -southEast[0]![0]) / bays;
// The columns stand on the bay lines, the end ones drawn in to stay on their face.
const columnAt = (i: number) => Math.min(Math.max(i * bay, 0.65), bays * bay - 0.65);
const southColumn = (i: number): Vec2 => [-(half - notch) + columnAt(i), half];
const eastColumn = (i: number): Vec2 => [half, half - notch - columnAt(i)];
export const aonFeatures: Record<string, Vec3 | Vec3[]> = {
  // The roof edge's ends: the west face's south end, the south face's east end, and the
  // east face's north end, at the top of the cap.
  aonRoofWest: at(turn(southEast[0]!, 3), aonLevels.roof),
  aonRoofNear: at(southEast[0]!, aonLevels.roof),
  aonRoofEast: at(turn(southEast[0]!, 1), aonLevels.roof),
  // A point on the south face's glass, clear of every neighbour, for hover.
  aonFrontFacade: at([-(half - notch) + 7.5 * bay, half + 0.07], 230),
  // The columns, halfway out to their points at mid-height: the fourteen after each face's
  // first, which the drawing's fifteen strips on each face match one for one.
  aonFrontPiers: Array.from({ length: 14 }, (_, i) => { const [x, z] = southColumn(i + 1); return [x, 220 - aonSkylineBase, z + 0.35] as Vec3; }),
  aonSidePiers: Array.from({ length: 14 }, (_, i) => { const [x, z] = eastColumn(i + 1); return [x + 0.35, 220 - aonSkylineBase, z] as Vec3; }),
  // The notch's two sides at mid-height: the south face's east end and the east face's
  // south end, between which the drawing paints the corner's stone.
  aonNotchFront: at(southEast[0]!, 200),
  aonNotchEast: at(southEast[4]!, 200),
  // Window centres across the south face's middle on six office floors, the drawing's
  // eleventh, twenty-third and every twelfth band on from the top.
  aonFloorRows: [70, 58, 46, 34, 22, 10].map((floor) => at([0, half + 0.07], aonLevels.lobbyTop + (floor - 1) * aonLevels.pitch + (aonLevels.sill + aonLevels.head) / 2)),
};
