import { createBuilder, rectangle, station } from "./building-kit.js";

// One Prudential Plaza: a 41-floor International Style slab with a rooftop penthouse, a
// louvered screen, a tall antenna mast, and the low ribbed east wing drawn as a separate
// group. Units are meters; +x is east (right in the skyline view) and +z is south.
//
// Fitted numerically to the drawn roof corners and mast tip through the skyline camera.
// Two things about the fit are worth knowing before changing any constant:
//
//   * Heights are measured from the study's platform, not from the street. The platform
//     plane projects to layer y 2679, while this slab's drawn ground line is 62 units
//     lower, under a ground band the study does not model. Measured from the platform the
//     roof is 170 m; measured from the drawn ground it is 180 m, near the real 183.2. Both
//     are right, from different datums, and the fit agrees with the first to 0.3 m.
//   * The plan is about 1.3x the real 71.6 x 22.3 m footprint, the same exaggeration the
//     drawing gives Heritage, and the wing is exaggerated to match at 1.27-1.33x.
export const towerWidth = 94.8;    // east-west, the south face the camera sees
export const towerDepth = 28.8;    // north-south, the east face
export const roof = 170;           // above the platform, not above the street

const west = -towerWidth / 2, east = towerWidth / 2;
const north = -towerDepth / 2, south = towerDepth / 2;
const tower = rectangle(west, east, north, south);
// The camera sees runs 0 and 1: the south face left to right, then the east face.
const southFace = tower[0], eastFace = tower[1];

// The punch-card facade: limestone piers standing proud of recessed windows. Bay pitch and
// end insets are the drawn column spacing carried onto the fitted faces, which land within
// 4% of each other on the two faces, as one structural grid should.
const southBays = 30, eastBays = 9;
const southPitch = 3.117, southInset = 2.29;
const eastPitch = 2.989, eastInset = 2.29;
const pierProud = 0.34, pierWidth = 1.84;
// Panes sit just proud of the wall, as Crain's and Heritage's do: the shell has no
// openings cut in it, so a pane set inside the wall is simply hidden behind it. The piers
// carry the relief instead, standing a third of a metre in front of the glass.
const paneProud = 0.02, paneHeight = 2.08, eastPaneHeight = 1.93;
// Thirty-one drawn window rows, evenly spaced; the floors below them are behind the
// drawing's ground band and never appear.
const rows = 31, topRow = 163.8, rowPitch = 5.22;

// The roof stack: a lighter band under the parapet, the penthouse inset from the west end,
// and its louvered screen. The mast stands on the roof beside the penthouse's east wall.
const bandDepth = 6, bandProud = 0.5;
const penthouseWest = west + 3.05, penthouseEast = west + 69.4;
const penthouseTop = 183.9, screenTop = 189.4, penthouseDepth = 9.2;
const louvers = 49, louverFirst = west + 5.95, louverPitch = 1.299;
// The screen's front stands 0.8 m behind the penthouse's; louvers sit on it.
const screenFront = south - 0.8, louverProud = 0.18;
const mastRise = 119.1, mastBase = 1.5, mastHead = 0.7;
// The drawing carries the mast higher and further east than the real one: 119 m of rise
// against about 95, and 72 m from the west end against about 55. Fitting the drawing wins.
const mastFromWest = 72.1;
const mastX = west + mastFromWest, mastZ = south - 15;

// East wing: the drawn podium, fitted to its three drawn top corners with its west face on
// the tower's east face, so the two solids touch without burying each other.
export const wingHeight = 22.65;
const wingWest = east, wingEast = 97.83, wingNorth = -21.43, wingSouth = 54.59;
const wing = rectangle(wingWest, wingEast, wingNorth, wingSouth);
const wingSouthFace = wing[0], wingEastFace = wing[1];
// Vertical ribs, no windows: sixteen on Randolph and twenty-four on Stetson.
const wingSouthRibs = 16, wingSouthInset = 2.25, wingSouthPitch = 3.066;
const wingEastRibs = 24, wingEastInset = 2.32, wingEastPitch = 3.05;
const ribProud = 0.3, ribWidth = 1.2;

const alongSouth = (i) => southInset + i * southPitch;
const alongEast = (i) => eastInset + i * eastPitch;
// Piers stand between the bays, so there is one more of them than there are windows, half
// a bay either side of the first and last pane.
const pierSouth = (i) => alongSouth(i) - southPitch / 2;
const pierEast = (i) => alongEast(i) - eastPitch / 2;
const rowTop = (i) => topRow - i * rowPitch;

// Features the skyline test projects against the drawing, derived from the geometry above.
export const onePrudentialFeatures = {
  roofLeft: [west, roof, south],
  roofNear: [east, roof, south],
  roofRight: [east, roof, north],
  bandFootLeft: [west, roof - bandDepth, south],
  bandFootNear: [east, roof - bandDepth, south],
  // path5880 is the penthouse's south face, so the drawn top edge is the near one.
  penthouseTopWest: [penthouseWest, penthouseTop, south],
  penthouseTopEast: [penthouseEast, penthouseTop, south],
  mastTip: [mastX, roof + mastRise, mastZ],
  // A point on the south wall between two piers, for the hover probe.
  southFacade: [west + 40, 120, south + pierProud],
  wingSouthWest: [wingWest, wingHeight, wingSouth],
  wingCorner: [wingEast, wingHeight, wingSouth],
  wingEastEnd: [wingEast, wingHeight, wingNorth],
  // The wall's own north-east corner reaches furthest on the right, its foot furthest of
  // all. The ribs stand proud of that wall but still land 6 to 21 layer units inside the
  // drawn edge; they are checked to keep them there, not because they bound anything.
  wingRibEdge: [
    [wingEast + ribProud, wingHeight, wingSouth - wingEastInset],
    [wingEast + ribProud, 0, wingSouth - wingEastInset],
    [wingEast + ribProud, wingHeight, wingSouth - wingEastInset - (wingEastRibs - 1) * wingEastPitch - ribWidth / 2],
    // The wall's foot at the north-east corner, which reaches further right than any of them.
    [wingEast, 0, wingNorth],
  ],
  // Piers and ribs stand proud, so a sight line finds them before the wall behind.
  // The interior piers only: the drawing pins each one to the gap between two window
  // columns, where the end piers have no such pair. Each point sits at half the pier's
  // depth, so a sight line meets the pier before reaching it and the gap is a real number.
  southPiers: Array.from({ length: southBays - 1 }, (_, i) => [west + pierSouth(i + 1), 120, south + pierProud / 2]),
  eastPiers: Array.from({ length: eastBays - 1 }, (_, i) => [east + pierProud / 2, 120, south - pierEast(i + 1)]),
  screenLouvers: Array.from({ length: louvers }, (_, i) => [louverFirst + i * louverPitch, (penthouseTop + screenTop) / 2, screenFront + louverProud / 2]),
  southRibs: Array.from({ length: wingSouthRibs }, (_, i) => [wingWest + wingSouthInset + i * wingSouthPitch, 12, wingSouth + ribProud / 2]),
  eastRibs: Array.from({ length: wingEastRibs }, (_, i) => [wingEast + ribProud / 2, 12, wingSouth - wingEastInset - i * wingEastPitch]),
};

export function createOnePrudentialPlazaBuilding() {
  const kit = createBuilder("One Prudential Plaza", "building-one-prudential-plaza");
  const { material, batch, band, box, panel, prism, quad, triangle } = kit;
  const limestone = material(0x4a4a4a);
  const glass = material(0x2a2a2a);
  const precast = material(0x8a8a8a);
  const metal = material(0xb4b4b4);

  const shell = batch("tower and wing shells", limestone);
  const panes = batch("window panes", glass);
  const piers = batch("piers, ribs, and louvers", precast);
  const stone = batch("top band, penthouse, and screen", precast);
  const mast = batch("antenna mast", metal);

  // Both solids stand on the platform, which the camera never sees from below.
  prism(shell, tower, [0, roof], { omit: ["bottom"] });
  prism(shell, wing, [0, wingHeight], { omit: ["bottom"] });

  // Recessed window panes, one per bay per drawn row, on the two faces the camera sees.
  // The wing stands against the whole east face, so anything below its roof there is
  // buried; Heritage skips such detail rather than drawing it inside another volume.
  const glaze = (run, at, count, pitch, height, floor = 0) => {
    for (let bay = 0; bay < count; bay += 1) {
      const centre = at(bay), half = (pitch - pierWidth) / 2;
      for (let row = 0; row < rows; row += 1) {
        const top = rowTop(row);
        if (top - height <= floor) continue;
        panel(panes, run, centre - half, centre + half, top - height, top, paneProud);
      }
    }
  };
  glaze(southFace, alongSouth, southBays, southPitch, paneHeight);
  glaze(eastFace, alongEast, eastBays, eastPitch, eastPaneHeight, wingHeight);

  // Piers run the full height between the base and the band, standing proud of the panes.
  // Their backs sit inside the wall, which closes them.
  const onWall = ["back"];
  // A pier's top sits under the band, whose soffit overhangs it and closes it.
  const pier = (run, s, y1, y0 = 0) => box(piers, station(run, s).at, station(run, s).normal, pierWidth / 2, 0, pierProud, y0, y1, { omit: [...onWall, "top"] });
  // The end piers would otherwise straddle a corner, where the two faces' piers meet and
  // overlap in the same plane. Each one stands half its width inside the face instead.
  const inside = (s, length) => Math.min(Math.max(s, pierWidth / 2), length - pierWidth / 2);
  for (let i = 0; i <= southBays; i += 1) pier(southFace, inside(pierSouth(i), towerWidth), roof - bandDepth);
  // East piers start on the wing's roof, which closes their feet; below it they are buried.
  for (let i = 0; i <= eastBays; i += 1) pier(eastFace, inside(pierEast(i), towerDepth), roof - bandDepth, wingHeight);
  // Wing ribs share the module, shorter and shallower.
  for (let i = 0; i < wingSouthRibs; i += 1) {
    const where = station(wingSouthFace, wingSouthInset + i * wingSouthPitch);
    box(piers, where.at, where.normal, ribWidth / 2, 0, ribProud, 0, wingHeight, { omit: onWall });
  }
  for (let i = 0; i < wingEastRibs; i += 1) {
    const where = station(wingEastFace, wingEastInset + i * wingEastPitch);
    box(piers, where.at, where.normal, ribWidth / 2, 0, ribProud, 0, wingHeight, { omit: onWall });
  }

  // A lighter band under the parapet, across both faces the camera sees.
  band(stone, [southFace, eastFace], roof - bandDepth, roof, bandProud, { omit: onWall });

  // The penthouse and its louvered screen stand on the roof, which closes their bottoms.
  const southNormal = [0, 1], onRoof = ["bottom"];
  const penthouseMid = (penthouseWest + penthouseEast) / 2, penthouseHalf = (penthouseEast - penthouseWest) / 2;
  box(stone, [penthouseMid, south - penthouseDepth], southNormal, penthouseHalf, 0, penthouseDepth, roof, penthouseTop, { omit: onRoof });
  box(stone, [penthouseMid, south - penthouseDepth], southNormal, penthouseHalf - 0.6, 0, penthouseDepth - 0.8, penthouseTop, screenTop, { omit: onRoof });
  // Forty-nine louvers on the screen's south face, which is its front, 0.8 m behind the
  // penthouse's. Set at the screen's origin they would sit inside it and never render.
  for (let i = 0; i < louvers; i += 1) {
    box(piers, [louverFirst + i * louverPitch, screenFront], southNormal, 0.42, 0, louverProud, penthouseTop + 0.4, screenTop - 0.4, { omit: onWall });
  }

  // The mast tapers, which no kit solid does, so it is four walls and a cap raised by hand.
  // Its foot stands on the roof, which closes it.
  const corners = (half, y) => [[mastX - half, y, mastZ - half], [mastX + half, y, mastZ - half],
    [mastX + half, y, mastZ + half], [mastX - half, y, mastZ + half]];
  const foot = corners(mastBase / 2, roof), head = corners(mastHead / 2, roof + mastRise);
  const outward = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  for (let i = 0; i < 4; i += 1) quad(mast, [foot[i], foot[(i + 1) % 4], head[(i + 1) % 4], head[i]], [outward[i]]);
  triangle(mast, [head[0], head[1], head[2]], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  triangle(mast, [head[0], head[2], head[3]], [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  // The roof hides the foot, but bare quads and triangles record no omission, so closing it
  // by hand is the only way the solid is closed rather than merely looking closed.
  triangle(mast, [foot[0], foot[2], foot[1]], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
  triangle(mast, [foot[0], foot[3], foot[2]], [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);

  return kit.finish({ height: roof + mastRise, outlines: [shell, stone] });
}
