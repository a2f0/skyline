import * as THREE from "../vendor/three-r186.js";
import { along, arc, bulge, cornerNormal, createBuilder, deg, evenly, inside, line, point, station } from "./building-kit.js";
import type { BatchData, BuildingModel, Normal, Plan, Station, Vec2, Vec3 } from "./building-kit.js";

// Plan and heights are fitted numerically to the source SVG through the skyline
// camera: corners, mullions, and crown fins follow the drawing. The camera-facing flat
// face and bow radius are about 1.3x the OpenStreetMap trace; the hidden north and west
// faces are simplified closures (a straight north face and one shallow west bulge), not
// that outline. Units are meters; +x is east (right in the skyline view), +z is south.
// The kit's 2.4° arc facets give two per bow bay, so the silhouette stays round.

// The drawing's floor pitch; its six-floor bands and the lower tier's three-floor
// bands share one grid. Floor 0 is the crown base, floor 30 the lower-tier ledge.
const floorHeight = 3.794;
const crownBase = 175.4;
const level = (floor: number) => crownBase - floor * floorHeight;
const parapet = 191.3, capSoffit = 189.1, capProud = 1.2, bandProud = 0.34;
const lowerParapet = 74.3, lowerSoffit = lowerParapet - 2.6, lowerLedge = level(30), lowerCapProud = 0.66;
const screenTop = 204.6, penthouseTop = 202.3;

// Tower plan, left to right in the skyline view: the south stub, a flat south face,
// the convex east bow, and a flat north strip along the bow's end tangent.
const joint: Vec2 = [13, 23];
const stubLength = 12, stubDepth = 4.4, flatLength = 18.7, stripLength = 13.95;
const stubA: Vec2 = [joint[0] - flatLength - stubLength, joint[1] + stubDepth];
const stubB: Vec2 = [joint[0] - flatLength, joint[1] + stubDepth];
const stubC: Vec2 = [joint[0] - flatLength, joint[1]];
const bowStart = 63 * deg, bowEnd = bowStart + 38.4 * deg, bowRadius = 57;
const bow = arc([joint[0] - bowRadius * Math.sin(bowStart), joint[1] - bowRadius * Math.cos(bowStart)], bowRadius, bowStart, bowEnd);
const bowEndPoint = bow.at(bow.length);
const strip = line(bowEndPoint, [bowEndPoint[0] + stripLength * Math.cos(bowEnd), bowEndPoint[1] - stripLength * Math.sin(bowEnd)]);
const northEast = strip.at(strip.length);
const northWest: Vec2 = [-13, northEast[1]], westEnd: Vec2 = [stubA[0], 21];
const flatFace = line(stubC, joint), north = line(northEast, northWest), westBulge = bulge(northWest, westEnd, 2.5);
const tower = [line(stubA, stubB), line(stubB, stubC), flatFace, bow, strip, north, westBulge, line(westEnd, stubA)];

// Lower tier: a shallow concave Garland Court face whose north end stands just
// proud of the bow. Its unlit south part is trimmed along the skyline view's line
// of sight, turned 3° away, so nothing appears left of the drawn silhouette.
const lowerNorth = bow.at(12.1, 0.3);
const lowerHeading = 77.1 * deg, lowerRadius = 100, lowerLength = 49.3, lowerSouthLength = 3.56;
const lowerCenter: Vec2 = [lowerNorth[0] + lowerRadius * Math.sin(lowerHeading), lowerNorth[1] + lowerRadius * Math.cos(lowerHeading)];
const lowerFace = arc(lowerCenter, lowerRadius, lowerHeading + lowerLength / lowerRadius, lowerHeading, true);
// Near its north end the face runs inside the tower's thick bands. Lower bands on those
// floors stop short, and a shallower piece on a run 0.04 m farther out carries each on to
// the face's end, clear of the tower band's ledges.
const junctionTrim = 0.8, junctionInset = 0.04;
const junction = arc(lowerCenter, lowerRadius - junctionInset, lowerHeading + junctionTrim / lowerRadius, lowerHeading, true);
const lowerSE = lowerFace.at(0), lowerSW: Vec2 = [lowerSE[0] - lowerSouthLength, lowerSE[1]];
const sightline = 38.5 * deg, lowerWestX = stubC[0] - 1.3;
const chamferLength = (lowerSW[0] - lowerWestX) / Math.sin(sightline);
const lowerChamfer: Vec2 = [lowerWestX, lowerSW[1] - chamferLength * Math.cos(sightline)];
const lowerWestNorth: Vec2 = [lowerWestX, lowerNorth[1]];
const lowerTier = [line(lowerSW, lowerSE), lowerFace, line(lowerNorth, lowerWestNorth), line(lowerWestNorth, lowerChamfer), line(lowerChamfer, lowerSW)];

// Bay stations along each run, in meters from its start. Hidden runs place mullions
// on interior stations; the camera-facing runs use the fourteen drawn mullions below.
const flatBay = (flatLength - 1) / 3, lowerPitch = 4.84, lowerMargin = 3.85;
const stripStations = [6.35, 12.7];
const towerStations = [
  [0, 6, stubLength], [0, stubDepth], [0, 1, 1 + flatBay, 1 + 2 * flatBay, flatLength], evenly(bow.length, 8),
  [0, ...stripStations, strip.length], evenly(north.length, 6), evenly(westBulge.length, 10), evenly(tower[7]!.length, 2),
];
const lowerFinStations = Array.from({ length: 10 }, (_, i) => lowerMargin + i * lowerPitch);
const lowerStations = [[0, lowerSouthLength], [0, ...lowerFinStations, lowerLength], [0, 1], evenly(lowerTier[3]!.length, 4), evenly(chamferLength, 7)];

const jointStation: Station = { at: joint, normal: cornerNormal(flatFace.normal(), bow.normal(0)) };
// Fourteen drawn mullions: three on the flat face, the joint, eight bow bays, two on
// the strip. The twelfth, at the bow's end, is the center of the balcony stack.
const mullions = [
  ...[1, 1 + flatBay, 1 + 2 * flatBay].map((s) => station(flatFace, s)), jointStation,
  ...evenly(bow.length, 8).slice(1).map((s) => station(bow, s)), ...stripStations.map((s) => station(strip, s)),
];
const balconyStack = mullions[11]!;
const crownFins = mullions.slice(1);
// The crown continues around the hidden north and west faces, so orbits find it finished.
const hiddenFins = [
  ...towerStations[5]!.slice(1, -1).map((s) => station(north, s)),
  ...towerStations[6]!.slice(1, -1).map((s) => station(westBulge, s)),
];
const lowerFins = lowerFinStations.map((s) => station(lowerFace, s));

// Screen strip over the north-east corner; the lower part of the same block,
// with its open cornice frame, steps back to the west.
const screen = { east: northEast[0] - 0.5, north: northEast[1], width: 7.4, length: 44.08 };
const penthouse = { west: screen.east - screen.width - 14.74, front: screen.north + screen.length - 1.04, overhang: 1.1 };
// The crown cap and thick bands start under the first fin, as drawn. The cap stops
// short of the north-east corner to stay inside the drawn silhouette, and resumes on
// the hidden north face once the tower itself hides its projection.
const capStart = 5.5, capEnd = strip.length - 2, northCapStart = 1.6;
const finWidth = 1.3, finDepth = 0.9, lowerFinWidth = 1.5, lowerFinDepth = 0.7;
const midpoint = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Features the skyline test projects against the drawing, derived from the geometry above.
export const heritageFeatures: Record<string, Vec3 | Vec3[]> = {
  screenFrontTop: [screen.east, screenTop, screen.north + screen.length],
  screenNorthTop: [screen.east, screenTop, screen.north],
  screenSouthTop: [screen.east - screen.width, screenTop, screen.north + screen.length],
  penthouseCorniceTip: [penthouse.west - penthouse.overhang, penthouseTop, penthouse.front + penthouse.overhang],
  stubFrontRoof: point(stubB, parapet),
  stubLeftRoof: point(stubA, parapet),
  reentrantRoof: point(stubC, parapet),
  // The cap crests on the outer edge of its chamfer over the joint.
  capApex: point(midpoint(flatFace.at(flatLength, capProud), bow.at(0, capProud)), parapet),
  capSouthEnd: point(flatFace.at(capStart, capProud), parapet),
  capNorthEnd: point(strip.at(capEnd, capProud), parapet),
  crownFootNorth: point(northEast, crownBase),
  lowerCapSouthCorner: point(lowerFace.at(0, lowerCapProud), lowerParapet),
  lowerCapNorth: point(lowerFace.at(lowerLength, lowerCapProud), lowerParapet),
  lowerFinFootNorth: point(along(lowerFins.at(-1)!, lowerFinDepth, lowerFinWidth / 2), lowerLedge),
  // The lower tier's leftmost wall corner, and the cap and band overhangs beside it.
  lowerSouthWest: [
    point(lowerSW, lowerParapet), point(lowerSW, 0),
    point(lowerTier[0]!.at(0, lowerCapProud), lowerParapet), point(lowerTier[0]!.at(0, bandProud), lowerLedge),
  ],
  mullions: mullions.map((m) => point(m.at, 120)),
  crownFins: crownFins.map((m) => point(along(m, finDepth / 2), crownBase + 6)),
  lowerFins: lowerFins.map((m) => point(along(m, lowerFinDepth / 2), lowerLedge + 4)),
  bowFacade: point(bow.at(bow.length / 2, 0.05), 130),
  // Low on the strip just short of the north-east corner, where the drawing shows Kemper's
  // left face in front of Heritage.
  northStripFacade: point(strip.at(strip.length - 0.5, 0.05), 60),
};

export function createHeritageAtMillenniumParkBuilding(): BuildingModel {
  const kit = createBuilder("The Heritage at Millennium Park", "building-heritage-at-millennium-park");
  const { material, batch, panel, band, box, prism } = kit;
  // Base colors sit off the drawing's tones (a #474747 face, #212121 bands, #787878 precast,
  // a #919191 screen) so the toon-lit result lands near them.
  const facade = material(0x363636);
  const glass = material(0xffffff, { vertexColors: true });
  const relief = material(0x141414);
  const precast = material(0x8c8c8c);
  const mechanical = material(0xa4a4a4);

  const shell = batch("closed tower and lower-tier shells", facade);
  const panes = batch("window panes", glass);
  const dark = batch("mullions, bands, and screen louvers", relief);
  const stone = batch("crown fins, caps, and penthouse frame", precast);
  const block = batch("rooftop screen", mechanical);

  // The crown-base seam puts the drawn north crown foot on a shell vertex.
  const towerPlan = prism(shell, tower, [0, crownBase, parapet]);
  // The tower's floor already closes the footprint the two volumes share, and the rest
  // faces the ground, which no camera above it sees.
  const lowerPlan = prism(shell, lowerTier, [0, lowerParapet], { omit: ["bottom"] });
  // Details hidden inside the other volume are skipped rather than buried.
  const towerVisible = (at: Vec2, y: number) => y > lowerParapet || !inside(lowerPlan, at);
  const lowerVisible = (at: Vec2) => !inside(towerPlan, at);
  // The trimmed chamfer and west wall are cut faces, so the lower bands and cap wrap
  // only the south and Garland Court faces and close with return ends.
  const lowerChain = [lowerTier[0]!, lowerTier[1]!];

  // One pane per floor per bay, set just proud of the wall like Crain's windows, so only
  // mullions and slab edges divide the face, as drawn. Tones vary subtly, with scattered lit and dark units.
  const towerRows: [number, number][] = [[0.6, level(45) - 0.22]];
  for (let floor = 44; floor >= 0; floor -= 1) towerRows.push([level(floor + 1) + 0.2, level(floor) - 0.22]);
  const crownMid = (crownBase + capSoffit) / 2;
  const tones = [0x444444, 0x474747, 0x4a4a4a].map((hex) => new THREE.Color(hex));
  const lit = new THREE.Color(0x7a7a7a), unlit = new THREE.Color(0x3a3a3a);
  function glaze(runs: Plan, stationsList: number[][], rows: [number, number][], visible: (at: Vec2, y: number) => boolean, seed: number) {
    runs.forEach((run, r) => {
      const stations = stationsList[r]!;
      for (let bay = 0; bay < stations.length - 1; bay += 1) {
        if (stations[bay + 1]! - stations[bay]! < 1.5) continue;
        const s0 = stations[bay]! + 0.24, s1 = stations[bay + 1]! - 0.24;
        rows.forEach(([bottom, top], row) => {
          if (!visible(run.at((s0 + s1) / 2, 0.3), bottom)) return;
          const hash = (row * 131 + bay * 37 + r * 59 + seed) % 97;
          panel(panes, run, s0, s1, bottom, top, 0.05, hash < 5 ? lit : hash < 8 ? unlit : tones[hash % 3]!);
        });
      }
    });
  }
  // The stub has no crown, so its top storey runs up to the parapet.
  const stubTop: [number, number] = [crownBase + 0.45, parapet - 1.2];
  glaze(tower.slice(0, 2), towerStations.slice(0, 2), [...towerRows, stubTop], towerVisible, 3);
  glaze([tower.at(-1)!], [towerStations.at(-1)!], [...towerRows, stubTop], towerVisible, 5);
  glaze(tower.slice(2, 7), towerStations.slice(2, 7), [...towerRows, [crownBase + 0.5, crownMid - 0.3], [crownMid + 0.3, capSoffit - 0.2]], towerVisible, 11);
  const lowerRows: [number, number][] = [[0.6, level(45) - 0.22]];
  for (let floor = 44; floor >= 30; floor -= 1) lowerRows.push([level(floor + 1) + 0.2, level(floor) - 0.22]);
  lowerRows.push([lowerLedge + 0.4, lowerSoffit - 0.25]);
  glaze(lowerTier, lowerStations, lowerRows, lowerVisible, 23);

  // Raised mullions run to the crown; the fins take over above it. Every mullion ending
  // at the crown base stands inside that floor's band, whose top closes its own.
  const mullion = (target: BatchData, { at, normal }: Station, y0: number, y1: number, { width = 0.28, depth = 0.22, omit = [] }: { width?: number; depth?: number; omit?: string[] } = {}) => box(target, at, normal, width / 2, 0, depth, y0, y1, { omit });
  const inCrownBand = ["top"];
  const towerFoot = (at: Vec2) => (towerVisible(at, 0) ? 0 : lowerParapet);
  tower.forEach((run, r) => {
    if (r >= 2 && r <= 4) return;
    const top = r < 2 || r === 7 ? parapet : crownBase;
    for (const s of towerStations[r]!.slice(1, -1)) {
      const where = station(run, s);
      mullion(dark, where, towerFoot(where.at), top, { omit: top === crownBase ? inCrownBand : [] });
    }
  });
  // The last two stations take the north strip's wide dark strips below instead. The
  // first mullion stands before the thick bands begin, so it keeps its top.
  for (const where of mullions.slice(0, -2)) {
    if (where !== balconyStack) mullion(dark, where, towerFoot(where.at), crownBase, { omit: where === mullions[0]! ? [] : inCrownBand });
  }
  // The balcony stack at the bow's end is a dark panel recessed between raised jambs;
  // wide dark strips follow on the north strip. The jambs stand 3 cm inside the bands'
  // depth, clear of their arc facets' sag, so the bands wrap them as they wrap the mullions.
  const stackHalf = 0.75;
  panel(dark, bow, bow.length - stackHalf, bow.length, 0, crownBase, 0.08);
  panel(dark, strip, 0, stackHalf, 0, crownBase, 0.08);
  for (const jamb of [station(bow, bow.length - stackHalf), station(strip, stackHalf)]) mullion(dark, jamb, 0, crownBase, { width: 0.24, depth: 0.31, omit: inCrownBand });
  for (const where of mullions.slice(-2)) mullion(dark, where, 0, crownBase, { width: 0.9, depth: 0.24, omit: inCrownBand });

  // Six-floor bands on the tower and three-floor bands on the lower tier; thin slab
  // edges mark the other floors on the faces the skyline view sees. Bands follow whole
  // runs or straight ones, so the wall's own facets close their backs.
  const onWall = ["back"];
  const bandRuns = tower.slice(2, 7), stubRuns = [tower[7]!, tower[0]!, tower[1]!];
  for (let floor = 0; floor <= 45; floor += 1) {
    const y = level(floor);
    // Thick bands start under the first crown fin, as drawn; a slab edge runs before them.
    if (floor % 6 === 0) {
      band(dark, bandRuns, y - 0.65, y, bandProud, { omit: onWall, from: capStart, visible: towerVisible });
      band(dark, [flatFace], y - 0.18, y + 0.04, 0.12, { omit: onWall, to: capStart, visible: towerVisible });
    } else band(dark, tower.slice(2, 5), y - 0.18, y + 0.04, 0.12, { omit: onWall, visible: towerVisible });
    // The stub's edges stop at the flat face's slab edge, which turns the re-entrant corner.
    if (floor % 3 === 0) band(dark, stubRuns, y - 0.2, y + 0.04, 0.12, { omit: onWall, to: stubDepth - 0.12, visible: towerVisible });
    if (floor >= 30) {
      if (floor % 6 === 0) {
        // The trimmed band's facets differ from the wall's, so it keeps its back, and its
        // end return closes the start of the shallower piece.
        band(dark, lowerChain, y - 0.65, y, bandProud, { to: lowerLength - junctionTrim, visible: lowerVisible });
        band(dark, [junction], y - 0.65, y, bandProud - junctionInset, { omit: ["start"], visible: lowerVisible });
      } else if (floor % 3 === 0) band(dark, lowerChain, y - 0.65, y, bandProud, { omit: onWall, visible: lowerVisible });
      else band(dark, [lowerTier[1]!], y - 0.18, y + 0.04, 0.12, { omit: onWall, visible: lowerVisible });
    }
  }

  // Crown: radial fins under a projecting cap that follows the plan and wraps the
  // hidden faces. A flush precast pier turns the north-east corner between the cap ends.
  // The cap's soffit closes each fin's top, except the last strip fin, which stands past the cap's end.
  for (const where of [...crownFins, ...hiddenFins]) {
    box(stone, where.at, where.normal, finWidth / 2, 0, finDepth, crownBase, capSoffit, { omit: where === crownFins.at(-1)! ? [] : ["top"] });
  }
  band(stone, tower.slice(2, 5), capSoffit, parapet, capProud, { omit: onWall, from: capStart, to: capEnd });
  band(stone, [north, westBulge], capSoffit, parapet, capProud, { omit: onWall, from: northCapStart });
  // The pier stands on the crown-base band, whose top closes its soffit.
  band(stone, [strip, north], crownBase, parapet, 0.08, { omit: [...onWall, "soffit"], from: capEnd, to: northCapStart });
  // Lower fins stand slightly proud of the lower cap, so they keep their tops.
  for (const where of lowerFins) box(stone, where.at, where.normal, lowerFinWidth / 2, 0, lowerFinDepth, lowerLedge, lowerSoffit);
  band(stone, lowerChain, lowerSoffit, lowerParapet, lowerCapProud, { omit: onWall, visible: lowerVisible });

  // Rooftop block: the tall screen strip, then the lower loggia with four posts and a
  // dark back wall under a cornice that overhangs to the south and west. The roof closes
  // the bottoms of everything standing on it. The loggia ends at the screen's west face, so
  // their north faces meet without overlapping.
  const south: Normal = [0, 1];
  const onRoof = ["bottom"];
  const screenFront = screen.north + screen.length;
  box(block, [screen.east - screen.width / 2, screenFront], south, screen.width / 2, -screen.length, 0, parapet, screenTop, { omit: onRoof });
  const loggiaEast = screen.east - screen.width, lintel = penthouseTop - 1.68, backWall = penthouse.front - 1.5;
  box(shell, [(penthouse.west + loggiaEast) / 2, backWall], south, (loggiaEast - penthouse.west) / 2, screen.north - backWall, 0, parapet, lintel, { omit: onRoof });
  const corniceWest = penthouse.west - penthouse.overhang, corniceFront = penthouse.front + penthouse.overhang;
  // The back wall stops at the lintel, so the cornice closes its own north face.
  box(stone, [(corniceWest + loggiaEast) / 2, corniceFront], south, (loggiaEast - corniceWest) / 2, screen.north - corniceFront, 0, lintel, penthouseTop);
  // Post spans in meters east of the loggia's west end, as drawn. The back wall and the
  // cornice close each post's back and top.
  const posts: [number, number][] = [[0, 1.3], [4.5, 5.9], [9.4, 11.1], [12.3, 13.5]];
  for (const [left, right] of posts) {
    box(stone, [penthouse.west + (left + right) / 2, penthouse.front], south, (right - left) / 2, -1.5, 0, parapet, lintel, { omit: [...onRoof, "back", "top"] });
  }
  // Louvers and five rows of panel dashes on the screen's two visible faces.
  const screenSouthWest: Vec2 = [screen.east - screen.width, screenFront], screenSouthEast: Vec2 = [screen.east, screenFront];
  const screenRuns = [line(screenSouthWest, screenSouthEast), line(screenSouthEast, [screen.east, screen.north])];
  const dashDrops = [2.06, 4.01, 5.95, 8.1, 10.3];
  screenRuns.forEach((run, r) => {
    const panels = r === 0 ? 2 : 10, width = run.length / panels;
    for (let i = 1; i < panels; i += 1) mullion(dark, station(run, width * i), parapet + 0.3, screenTop - 0.4, { width: 0.25, depth: 0.12 });
    for (let i = 0; i < panels; i += 1) {
      for (const drop of dashDrops) panel(dark, run, width * (i + 0.14), width * (i + 0.86), screenTop - drop - 0.18, screenTop - drop, 0.08);
    }
  });

  // Silhouette lines for the shells and the screen only. The 20° threshold is well
  // above the 2.4° bow facets, so curved faces read as one surface.
  return kit.finish({ height: screenTop, outlines: [shell, block] });
}
