import { buildOnePrudentialTower, floorLevel, onePrudentialLevels, screenFins, wallStations, wingRibs } from "./one-prudential-tower.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// One Prudential Plaza on a clean version of its plan, in real meters, for the skyline
// study's original layout, which places this copy in skyline-study.ts. one-prudential-tower.ts
// builds it, and the geographic model on the mapped outlines.
//
// The plan is the mapped one squared to the slab's grid, keeping each mapped wall's length:
// a 71.6 x 22.2 m slab, stepped out 2.9 m along the north of its west end, with a 29 x
// 15.5 m annex behind it, and the east wing wrapped round its east end, 38.2 m on Randolph
// and 60.4 m on Stetson. The west wing is lower than the drawing's datum, so this copy has
// none. See docs/one-prudential-reference.md. Units are meters; +x is east and +z is south.
const half = 71.6 / 2, south = 22.2 / 2, north = -south;
// The tower's walls break where the wing meets them, as the mapped outline's do, so each
// piece starts its windows above whatever covers it.
const wingWest = 26, wingBack = 11.5;
const tower: Vec2[] = [[-half, south], [wingWest, south], [half, south], [half, north], [wingBack, north], [7, north], [7, -26.6], [-22, -26.6], [-22, north], [-38.7, north], [-38.7, 4.1], [-half, 4.1]];
const wingSouth = south + 15, wingEast = wingWest + 38.2, wingNorth = wingSouth - 60.4;
const eastWing: Vec2[] = [[half, south], [wingWest, south], [wingWest, wingSouth], [wingEast, wingSouth], [wingEast, wingNorth], [wingBack, wingNorth], [wingBack, north], [half, north]];
// The east wing's roof, measured on the photograph down from the tower's. The map gives the
// wing ten levels and no height; its windows keep the tower's floors.
export const onePrudentialWingTop = 56.4;
// The penthouse starts 2.3 m in from the west end and runs 50.1 m along the south face,
// 12 m deep; the mast stands 52.6 m along and 14.9 m behind that face, as mapped.
const penthouse = { corner: [-half + 2.3, south] as Vec2, along: [1, 0] as Vec2, length: 50.1, depth: 12 };
const mast: Vec2 = [-half + 52.6, south - 14.9];

// The skyline drawing shows the slab from the photograph's treeline up, so its platform
// datum crosses the tower above the street: fitted with the placement in skyline-study.ts,
// which scales, turns, and places this copy. Its y = 0 is that datum.
export const onePrudentialSkylineBase = 40;
export function createOnePrudentialPlazaBuilding(): BuildingModel {
  return buildOnePrudentialTower({ name: "One Prudential Plaza", id: "building-one-prudential-plaza", tower, wings: [{ outline: eastWing, top: onePrudentialWingTop }], penthouse, mast, base: onePrudentialSkylineBase });
}

// Features the skyline test projects against the drawing, in this copy's coordinates.
const h = onePrudentialLevels;
const at = ([x, z]: Vec2, real: number): Vec3 => [x, real - onePrudentialSkylineBase, z];
const southWall = wallStations(2 * half), eastWall = wallStations(2 * south);
const [ribsSouth, ribsEast] = [wingRibs(wingEast - wingWest), wingRibs(wingSouth - wingNorth)];
const windowCentre = (floor: number) => floorLevel(floor) + (h.sill + h.head) / 2;
const penthouseEast: Vec2 = [penthouse.corner[0] + penthouse.length, south];
export const onePrudentialFeatures: Record<string, Vec3 | Vec3[]> = {
  // The roof's corners and the observatory band's foot, on the walls' corner edges.
  roofLeft: at([-half, south], h.roof),
  roofNear: at([half, south], h.roof),
  roofRight: at([half, north], h.roof),
  bandFootLeft: at([-half, south], h.bandFoot),
  bandFootNear: at([half, south], h.bandFoot),
  // The penthouse's south face: the sign wall's top under the screen, and the screen's top.
  penthouseTopWest: at(penthouse.corner, h.louverBottom),
  penthouseTopEast: at(penthouseEast, h.louverBottom),
  screenTopWest: at(penthouse.corner, h.penthouseTop),
  screenTopEast: at(penthouseEast, h.penthouseTop),
  // The drawing stops the mast at the tubular mast's top; WGN's slim antenna goes on above.
  mastTip: at(mast, h.mastTop),
  // A window on the south face, clear of every neighbour, for hover.
  southFacade: at([-half + southWall.piers[12]! + h.bay / 2, south + 0.07], windowCentre(30)),
  wingSouthWest: at([wingWest, wingSouth], onePrudentialWingTop),
  wingCorner: at([wingEast, wingSouth], onePrudentialWingTop),
  wingEastEnd: at([wingEast, wingNorth], onePrudentialWingTop),
  // What reaches furthest right on the wing: its coping's outer north-east corner, top and
  // bottom, and its wall's foot there.
  wingRibEdge: [at([wingEast + 0.35, wingNorth - 0.35], onePrudentialWingTop), at([wingEast + 0.35, wingNorth - 0.35], onePrudentialWingTop - 0.5), [wingEast, 0, wingNorth]],
  // The interior piers, halfway out to their faces at mid-height, and the screen's fins and
  // the wing's ribs likewise, so a sight line meets each before reaching its point.
  southPiers: southWall.piers.map((s) => at([-half + s, south + 0.15], 120)),
  eastPiers: eastWall.piers.map((s) => at([half + 0.15, south - s], 120)),
  screenLouvers: screenFins(penthouse.length, true).map((s) => at([penthouse.corner[0] + s, south + 0.1], (h.louverBottom + h.penthouseTop) / 2)),
  southRibs: ribsSouth.map((s) => at([wingWest + s, wingSouth + 0.15], 50)),
  // The drawing shows twenty-four of the east wall's twenty-five; the last falls past its end.
  eastRibs: ribsEast.slice(0, 24).map((s) => at([wingEast + 0.15, wingSouth - s], 50)),
  // Window centres in the south face's fourth bay on six floors, the drawing's first row
  // and every sixth below it.
  floorRows: [40, 34, 28, 22, 16, 10].map((floor) => at([-half + southWall.piers[2]! + h.bay / 2, south + 0.07], windowCentre(floor))),
};
