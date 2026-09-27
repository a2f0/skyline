import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";
import { geographicBuildings } from "./skyline-geography-data.js";
import { projectGround } from "./skyline-geography.js";
import { trumpNotch, trumpSpire } from "./trump-geographic.js";
import { buildTrumpTower, crownFoot, floorLines, mullionPoints, topOutlines, trumpLevels } from "./trump-tower.js";

// Trump International Hotel and Tower on its mapped plan, in real meters, for the skyline
// study's original layout, which places this copy in skyline-study.ts. trump-tower.ts builds
// it, and the geographic model on the same parts. The tower's rounded and bevelled shaft has
// no simpler published plan than the map's, so the copy keeps the mapped shaft and crown,
// shifted to put the shaft's centre at the origin. Its shaft runs straight down to the
// drawing's datum: the drawing hides everything below One Prudential's roof, and the
// original layout stands Trump 65 m behind One Prudential and just in front of Two
// Prudential, where the mapped setbacks would pass through both. See docs/trump-reference.md.
// Units are meters; +x is east and +z is south.
const record = geographicBuildings.find((entry) => entry.id === "building-trump-tower-only")!;
const mapped = (coordinates: [number, number][]): Vec2[] => coordinates.map((corner) => { const [east, north] = projectGround(corner); return [east, -north]; });
const part = (way: number) => mapped(record.parts.find((entry) => entry.way === way)!.coordinates);
// The shaft's mapped bounds' centre.
const shaftCorners = part(188338548);
const origin: Vec2 = [(Math.min(...shaftCorners.map(([x]) => x)) + Math.max(...shaftCorners.map(([x]) => x))) / 2, (Math.min(...shaftCorners.map(([, z]) => z)) + Math.max(...shaftCorners.map(([, z]) => z))) / 2];
const local = ([x, z]: Vec2): Vec2 => [x - origin[0], z - origin[1]];
const shift = (corners: Vec2[]) => corners.map(local);
const shaft = shift(shaftCorners);
const notch = shaft.reduce((best, p) => (Math.hypot(p[0] - local(trumpNotch)[0], p[1] - local(trumpNotch)[1]) < Math.hypot(best[0] - local(trumpNotch)[0], best[1] - local(trumpNotch)[1]) ? p : best));
const crown = shift(part(188338859));
const spire = local(trumpSpire);

// The skyline drawing shows the tower above One Prudential, and its platform datum crosses
// the tower above the street: fitted with the placement in skyline-study.ts, which scales,
// turns, and places this copy. Its y = 0 is that datum.
export const trumpSkylineBase = 40.7;
export function createTrumpInternationalTowerBuilding(): BuildingModel {
  return buildTrumpTower({
    name: "Trump International Hotel and Tower",
    id: "building-trump-tower-only",
    tiers: [{ outline: shaft, top: trumpLevels.roof }],
    step: notch[1],
    crown,
    spire,
    base: trumpSkylineBase,
  });
}

// Features the skyline test projects against the drawing, in this copy's coordinates.
const h = trumpLevels;
const at = ([x, z]: Vec2, real: number): Vec3 => [x, real - trumpSkylineBase, z];
const vertex = (corners: Vec2[], near: Vec2) => corners.reduce((best, p) => (Math.hypot(p[0] - near[0], p[1] - near[1]) < Math.hypot(best[0] - near[0], best[1] - near[1]) ? p : best));
// Points along the bevelled south-east face, from its south corner.
const bevel = [vertex(shaft, local([-130.2, -417.4])), vertex(shaft, local([-114.5, -432.7]))] as const;
// The bevel faces south-east, so outward is to the left walking from its south corner.
const alongBevel = (s: number, depth: number): Vec2 => {
  const [a, b] = bevel, l = Math.hypot(b[0] - a[0], b[1] - a[1]), t: Vec2 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return [a[0] + t[0] * s - t[1] * depth, a[1] + t[1] * s + t[0] * depth];
};
// Every mullion of the shaft and of the crown, in plan, the same placement the model uses.
const tops = topOutlines(shaft, notch[1], crown);
const shaftMullions = mullionPoints(tops.shaft, () => 0), crownMullions = mullionPoints(tops.crown, crownFoot(tops.cap));
// A mullion's point halfway out to its face, at a height.
const mullion = (list: typeof shaftMullions, index: number, real: number): Vec3 => { const { at: [x, z], normal: [nx, nz] } = list[index]!; return at([x + nx * 0.115, z + nz * 0.115], real); };
export const trumpFeatures: Record<string, Vec3 | Vec3[]> = {
  // The roof's south-west corner and its east end at the bevel, where the drawn roof turns.
  trumpTowerWestRoof: at(vertex(shaft, local([-146.1, -422.9])), h.roof),
  trumpTowerEastStart: at(vertex(shaft, local([-111.7, -435.3])), h.roof),
  // The step: the notch's corner at the roof and at the shoulder, and the shoulder's far end.
  trumpRoofStepTop: at(notch, h.roof),
  trumpRoofStepBottom: at(notch, h.shoulder),
  trumpEastShoulder: at(vertex(shaft, local([-115.6, -464.9])), h.shoulder),
  trumpCrownWest: at(vertex(crown, local([-133.4, -443.3])), h.crownTop),
  trumpCrownEast: at(vertex(crown, local([-116.4, -463.7])), h.crownTop),
  trumpSpireTip: at(spire, h.tip),
  trumpSpireUpperJoint: at(spire, h.joints[1]),
  trumpSpireLowerJoint: at(spire, h.joints[0]),
  // A window on the short south face, above One Prudential and well left of its mast, for hover.
  trumpFacadeProbe: at(local([-135.75, -416.3 + 0.07]), floorLines[90]! + 1.6),
  // Behind One Prudential in the drawing.
  trumpBehindPrudential: at(alongBevel(10, 0.07), floorLines[30]! + 1.6),
  // The drawn floor rows: spandrel centres 2 m along the bevel, on the drawing's sampled rows.
  trumpFloorBands: [0, 7, 14, 21, 28, 35, 40].map((row) => at(alongBevel(2, 0.07), h.floorLine + row * h.pitch + 0.1)),
  // The drawing's mullion lines, each checked against the model's nearest mullion, counted
  // round the shaft's walls and the crown's from the chain each starts. The drawing spaces
  // its lines unevenly: it doubles some where the mullions bunch round a curve, and skips
  // most of the east face's. The shaft's lines were measured 289 m up, the crown's at its top.
  trumpFrontMullions: [19, 20, 21, 22, 23, 24, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34].map((i) => mullion(shaftMullions, i, 289)),
  trumpCornerMullions: [35, 37, 38].map((i) => mullion(shaftMullions, i, 289)),
  trumpEastMullions: [41, 43, 45, 46, 52, 53, 54, 56, 57, 59].map((i) => mullion(shaftMullions, i, 289)),
  trumpCrownMullions: [26, 27, 27, 28, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 36, 37, 38, 39, 40, 0, 1, 2, 3].map((i) => mullion(crownMullions, i, 364.5)),
};
