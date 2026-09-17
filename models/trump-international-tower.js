import * as THREE from "../vendor/three-r186.js";
import { along, bulge, createBuilder, line, point, station } from "./building-kit.js";

// Trump International Hotel and Tower: the SVG's continuous glazed shaft, high south roof,
// east-face step, ribbed crown, and three-section spire are fitted through the skyline camera.
// The fitted platform-relative tip sits below the published 423.2 m street-relative architectural
// height because the study's platform is above the drawing's street datum. The unseen north and
// west faces are closed, simplified continuations of the observed massing.
// Units are meters; +x is east (right in the skyline view), +z is south.

const tip = 406.55327;
const highRoof = 335.4;
const eastShoulder = 325.4;
const crownTop = 345;
// The SVG's regular shaft rows repeat every 21.3645 layer units. Fitting the middle south bay
// through the skyline camera gives this platform-relative pitch and its first visible phase.
const floorHeight = 3.482373;
const floorOrigin = 2.161462;
const mullionDepth = 0.2;
const frontBow = 2.7;

const planOf = (points) => points.map((at, index) => line(at, points[(index + 1) % points.length]));

// A clipped rectangle retains the tower's broad glass faces while making its faceted corners
// catch light as they do in the SVG. The runs remain counterclockwise from above.
function clippedPlan(width, depth, clip, [centerX = 0, centerZ = 0] = []) {
  const west = centerX - width / 2, east = centerX + width / 2;
  const north = centerZ - depth / 2, south = centerZ + depth / 2;
  const points = [
    [west + clip, south], [east - clip, south], [east, south - clip], [east, north + clip],
    [east - clip, north], [west + clip, north], [west, north + clip], [west, south - clip],
  ];
  return planOf(points);
}

const southWest = [-18.75, 18];
const southEast = [18.75, 18];
const eastSouth = [22.75, 14];
// These three points are the SVG's consecutive high roof, vertical drop, and low shoulder.
// Keeping them as actual outer vertices makes the source's east-face step inspectable in orbit.
const eastRoofStart = [22.75, 6.922922];
const eastRoofStep = [22.75, -3.375338];
const eastShoulderEnd = [22.75, -15.661558];
const innerFrontWest = [-18.75, 14];
const innerFrontEast = [18.75, 14];
const innerBevelEast = [18.75, 10];
const innerRoofStart = [18.75, 6.922922];
const innerRoofStep = [18.75, -3.375338];
const innerShoulderEnd = [18.75, -15.661558];

// The lower shaft remains broad and continuous. Its northward plinth is hidden from the skyline
// view, but it keeps the deeper crown physically seated rather than leaving it over open air.
const shaftCorners = [
  southWest, southEast, eastSouth, eastShoulderEnd, [18.75, -19.662], [15.9, -21],
  [15.9, -23.2], [13.5, -26], [0.5, -26], [-18.75, -19.662], [-22.75, -15.662], [-22.75, 14],
];
const shaftPlan = [bulge(southWest, southEast, frontBow), ...planOf(shaftCorners).slice(1)];
// Separate closed cap pieces preserve the source's high south face and bevel, then follow the
// two distinct heights on the east face without inventing lower setbacks across the facade.
const frontCapCorners = [southWest, southEast, innerFrontEast, innerFrontWest];
const frontCapPlan = [bulge(southWest, southEast, frontBow), ...planOf(frontCapCorners).slice(1)];
const bevelCapPlan = planOf([southEast, eastSouth, innerBevelEast, innerFrontEast]);
const eastHighCapPlan = [eastSouth, eastRoofStart, innerRoofStart, innerBevelEast];
const eastDropCapPlan = [eastRoofStart, eastRoofStep, innerRoofStep, innerRoofStart];
const shoulderCapPlan = [eastRoofStep, eastShoulderEnd, innerShoulderEnd, innerRoofStep];

// The narrow crown is drawn farther north than the shaft's visible face. Its east side remains
// inside the shaft's east wall, while the hidden plinth above supplies its full base support.
const crownFlatPlan = clippedPlan(14.023614, 33.315081, 2.8, [8.571132, -8.396334]);
const crownPlan = [bulge(crownFlatPlan[0].at(0), crownFlatPlan[0].at(crownFlatPlan[0].length), 0.8), ...crownFlatPlan.slice(1)];

const front = (plan) => plan[0];
const east = (plan) => plan[2];
const visibleRuns = (plan) => [plan[0], plan[1], plan[2]];
const stationsAt = (run, fractions) => fractions.map((fraction) => station(run, run.length * fraction));

// Every loft face carries the normal from its actual corners. The roof pieces slope through the
// east drop, so a conventional horizontal normal would light their surfaces incorrectly.
const faceNormal = (corners, outward) => {
  const [a, b, c] = corners;
  const u = b.map((value, axis) => value - a[axis]);
  const v = c.map((value, axis) => value - a[axis]);
  const raw = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const sign = raw[0] * outward[0] + raw[1] * outward[1] + raw[2] * outward[2] < 0 ? -1 : 1;
  const length = Math.hypot(...raw);
  return raw.map((value) => sign * value / length);
};

// The source's apparent column pitch opens across the south face, turns through the short
// south-east bevel, and then continues down the east face. These measured fractions preserve
// that rhythm instead of replacing it with a perspective-blind evenly spaced grid.
const frontFractions = [0.085632, 0.126903, 0.180352, 0.231934, 0.281897, 0.330404, 0.377609, 0.431147, 0.491866, 0.552221, 0.615588, 0.678912, 0.739271, 0.801833, 0.86815, 0.93948];
const cornerFractions = [0.1, 0.586, 1];
const eastFractions = [0.241763, 0.338342, 0.42781, 0.51745, 0.601796, 0.662913, 0.733346, 0.807545, 0.881737, 0.935429];
const capEastRun = line(eastSouth, eastRoofStep);
const capEastCoverage = (eastSouth[1] - eastRoofStep[1]) / (eastSouth[1] - eastShoulderEnd[1]);
const capEastFractions = eastFractions.filter((fraction) => fraction < capEastCoverage).map((fraction) => fraction / capEastCoverage);

const shaftFrontStations = stationsAt(front(shaftPlan), frontFractions);
const shaftCornerStations = stationsAt(shaftPlan[1], cornerFractions);
const shaftEastStations = stationsAt(east(shaftPlan), eastFractions);
const floorAt = (index) => floorOrigin + floorHeight * index;
// Source rows 44 through 84 are the forty-one regular visible facade strokes. These samples span
// the occlusion edge through the upper shaft and keep both pitch and phase tied to the drawing.
const floorRowSamples = [44, 51, 58, 65, 72, 79, 84];
const floorBandStation = {
  at: shaftFrontStations[7].at.map((value, axis) => (value + shaftFrontStations[8].at[axis]) / 2),
  normal: shaftFrontStations[7].normal,
};
const capRuns = [front(frontCapPlan), front(bevelCapPlan), capEastRun];
const capStations = [
  ...stationsAt(capRuns[0], frontFractions),
  ...stationsAt(capRuns[1], cornerFractions),
  ...stationsAt(capRuns[2], capEastFractions),
];

// Twenty-three visible crown ribs are measured from paths 484, 486, and 488. They gather at the
// east end and cross the south face, bevel, and east face instead of appearing as a sparse stripe.
const crownRibStations = [
  ...stationsAt(front(crownPlan), [0.182851, 0.308851, 0.41791, 0.539387, 0.653744, 0.799301, 0.963584]),
  ...stationsAt(crownPlan[1], [0.265268, 0.675484, 1]),
  ...stationsAt(east(crownPlan), [0.102843, 0.200092, 0.296008, 0.394589, 0.497154, 0.592414, 0.683952, 0.760429, 0.823325, 0.864284, 0.896421, 0.928604, 0.963649]),
];

// Features stay derived from the same plans and dimensions used below. The column points lie
// midway through their proud faces, so fidelity and geometry checks prove the drawn ribs are
// real visible solids rather than painted decoration.
const mullionFeature = ({ at, normal }, y0, y1, depth = mullionDepth / 2) => point(along({ at, normal }, depth), (y0 + y1) / 2);
const mastCenter = [13, -8.114061];
const mastUpperJoint = 384.108452;
const mastLowerJoint = 357.684396;
const facadePoint = (height) => point(front(shaftPlan).at(front(shaftPlan).length * 0.53, 0.08), height);
export const trumpFeatures = {
  trumpTowerWestRoof: point(southWest, highRoof),
  trumpTowerEastStart: [eastRoofStart[0], 335.474065, eastRoofStart[1]],
  trumpRoofStepTop: [eastRoofStep[0], 334.475439, eastRoofStep[1]],
  trumpRoofStepBottom: [eastRoofStep[0], 326.775863, eastRoofStep[1]],
  trumpEastShoulder: [eastShoulderEnd[0], 325.440945, eastShoulderEnd[1]],
  trumpCrownWest: point(front(crownPlan).at(0), crownTop),
  trumpCrownEast: point(east(crownPlan).at(east(crownPlan).length), crownTop),
  trumpSpireTip: [mastCenter[0], tip, mastCenter[1]],
  trumpFacadeProbe: facadePoint(262),
  trumpBehindPrudential: facadePoint(120),
  trumpSpireUpperJoint: [mastCenter[0], mastUpperJoint, mastCenter[1]],
  trumpSpireLowerJoint: [mastCenter[0], mastLowerJoint, mastCenter[1]],
  trumpFrontMullions: shaftFrontStations.map((where) => mullionFeature(where, 204.25, eastShoulder - 0.3)),
  trumpCornerMullions: shaftCornerStations.map((where) => mullionFeature(where, 204.25, eastShoulder - 0.3)),
  trumpEastMullions: shaftEastStations.map((where) => mullionFeature(where, 204.25, eastShoulder - 0.3)),
  trumpFloorBands: floorRowSamples.map((row) => point(along(floorBandStation, 0.095), floorAt(row))),
  // The front roof cap hides the crown's lower ribs in the skyline view. Probe their exposed
  // upper section below the parapet, so only a rib can satisfy the sight-line check.
  trumpCrownMullions: crownRibStations.map((where) => point(along(where, 0.11), crownTop - 1)),
};

export function createTrumpInternationalTowerBuilding() {
  const kit = createBuilder("Trump International Hotel and Tower", "building-trump-tower-only");
  const { material, batch, panel, band, box, prism, triangle } = kit;
  const facade = material(0x333638);
  const glass = material(0xffffff, { vertexColors: true });
  const frame = material(0x777a79);
  const dark = material(0x202325);
  const crownFrame = material(0x7c7c7c);
  const spireMetal = material(0xd0d0cd);
  const shell = batch("closed glass shells and roof steps", facade);
  const panes = batch("glazed floor panels", glass);
  const ribs = batch("raised mullions and floor bands", frame);
  const crownShell = batch("crown enclosure", dark);
  const crown = batch("ribbed crown", crownFrame);
  const mast = batch("segmented spire", spireMetal);

  // A closed four-corner loft allows the east roof to step at the source's actual vertices.
  // Its gently sloped top and base remain solids, unlike a flat decal that only works head-on.
  const loft = (target, plan, bottoms, tops) => {
    const bottom = plan.map((at, index) => point(at, bottoms[index]));
    const top = plan.map((at, index) => point(at, tops[index]));
    const addFace = (corners, outward) => {
      const first = faceNormal([corners[0], corners[1], corners[2]], outward);
      const second = faceNormal([corners[0], corners[2], corners[3]], outward);
      triangle(target, [corners[0], corners[1], corners[2]], [first, first, first]);
      triangle(target, [corners[0], corners[2], corners[3]], [second, second, second]);
    };
    for (let index = 0; index < plan.length; index += 1) {
      const next = (index + 1) % plan.length, [a, b] = [plan[index], plan[next]];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const outward = [-(b[1] - a[1]) / length, 0, (b[0] - a[0]) / length];
      const corners = [bottom[index], bottom[next], top[next], top[index]];
      addFace(corners, outward);
    }
    addFace(top, [0, 1, 0]);
    addFace(bottom, [0, -1, 0]);
  };

  prism(shell, shaftPlan, [0, eastShoulder]);
  prism(shell, frontCapPlan, [eastShoulder, highRoof]);
  prism(shell, bevelCapPlan, [eastShoulder, highRoof]);
  loft(shell, eastHighCapPlan, [eastShoulder, eastShoulder, eastShoulder, eastShoulder], [highRoof, 335.474065, 335.474065, highRoof]);
  loft(shell, eastDropCapPlan, [eastShoulder, eastShoulder, eastShoulder, eastShoulder], [335.474065, 334.475439, 334.475439, 335.474065]);
  loft(shell, shoulderCapPlan, [eastShoulder, eastShoulder, eastShoulder, eastShoulder], [326.775863, 325.440945, 325.440945, 326.775863]);
  prism(crownShell, crownPlan, [eastShoulder, crownTop]);

  const tones = [0x30353b, 0x353a3f, 0x3a3e42, 0x292e33].map((hex) => new THREE.Color(hex));
  const warm = new THREE.Color(0xc2aa82);
  const cool = new THREE.Color(0x89959e);
  const shade = new THREE.Color(0x22272c);
  const addFacade = ({ runs, paneFractions, mullions, y0, y1, seed = 0, bands = true }) => {
    for (const [runIndex, run] of runs.entries()) {
      const stations = paneFractions[runIndex].map((fraction) => run.length * fraction);
      for (let bay = 0; bay < stations.length - 1; bay += 1) {
        const s0 = stations[bay] + 0.16, s1 = stations[bay + 1] - 0.16;
        if (s1 - s0 < 0.25) continue;
        for (let row = Math.floor((y0 - floorOrigin) / floorHeight); floorAt(row) < y1; row += 1) {
          const y = floorAt(row), from = Math.max(y + 0.26, y0 + 0.16), to = Math.min(y + floorHeight - 0.42, y1 - 0.16);
          if (to - from < 0.25) continue;
          const mixed = (Math.imul(row + 17, 0x9e3779b1) ^ Math.imul(bay + 23, 0x85ebca77)
            ^ Math.imul(runIndex + seed + 3, 0xc2b2ae3d)) >>> 0;
          const hash = mixed % 97;
          panel(panes, run, s0, s1, from, to, 0.035,
            hash < 2 ? warm : hash < 4 ? cool : hash < 9 ? shade : tones[hash % tones.length]);
        }
      }
    }
    if (bands) {
      for (let row = Math.ceil((y0 - floorOrigin) / floorHeight); floorAt(row) + 0.12 < y1; row += 1) {
        const y = floorAt(row);
        band(ribs, runs, y - 0.12, y + 0.07, 0.095, { omit: ["back"] });
      }
    }
    for (const where of mullions) box(ribs, where.at, where.normal, 0.11, 0, mullionDepth, y0 + 0.14, y1 - 0.14);
  };

  const shaftRuns = visibleRuns(shaftPlan);
  const hiddenRuns = shaftPlan.slice(3);
  const shaftPanes = [[0, ...frontFractions, 1], [0, ...cornerFractions], [0, ...eastFractions, 1]];
  const shaftMullions = [...shaftFrontStations, ...shaftCornerStations, ...shaftEastStations];
  addFacade({ runs: shaftRuns, paneFractions: shaftPanes, mullions: shaftMullions, y0: 0, y1: eastShoulder });

  // Continue the curtain-wall rhythm around the faceted north and west closures. These
  // sides are inferred from the visible grid, but must read as occupied architecture in
  // rear and elevated orbit views rather than as an unbroken dark extrusion.
  hiddenRuns.forEach((run, index) => {
    const bays = Math.max(1, Math.round(run.length / 3.2));
    const fractions = Array.from({ length: bays - 1 }, (_, bay) => (bay + 1) / bays);
    addFacade({
      runs: [run], paneFractions: [[0, ...fractions, 1]],
      mullions: stationsAt(run, fractions), y0: 0, y1: eastShoulder, seed: index + 7, bands: false,
    });
  });
  // On the inferred rear faces, slim metal transoms keep the window rhythm without
  // duplicating thousands of unseen closed ledges. Short corner joints avoid a false
  // mitre across the recessed north-east face.
  for (let row = Math.ceil(-floorOrigin / floorHeight); floorAt(row) + 0.12 < eastShoulder; row += 1) {
    const y = floorAt(row);
    for (const run of hiddenRuns) {
      if (run.length > 0.4) panel(ribs, run, 0.15, run.length - 0.15, y - 0.12, y + 0.07, 0.095);
    }
  }

  // The high grid follows the same measured front, bevel, and east-face column rhythm through
  // the roof cap. It therefore continues the source lines instead of jogging at the shoulder.
  addFacade({
    runs: capRuns,
    paneFractions: [[0, ...frontFractions, 1], [0, ...cornerFractions], [0, ...capEastFractions, 1]],
    mullions: capStations,
    y0: eastShoulder,
    y1: 334.3,
  });
  band(ribs, [front(shaftPlan)], eastShoulder - 0.24, eastShoulder - 0.05, 0.095, { omit: ["back"] });
  band(ribs, [shaftPlan[1], shaftPlan[2]], eastShoulder - 0.24, eastShoulder - 0.05, 0.11, { omit: ["back"] });

  // The source strokes the crown ribs light grey against its dark enclosure. They cross all
  // three visible crown faces and the seams preserve its shallow mechanical-floor rhythm.
  for (const where of crownRibStations) box(crown, where.at, where.normal, 0.12, 0, 0.22, eastShoulder + 0.12, crownTop - 0.12);
  for (const y of [eastShoulder + 4.5, eastShoulder + 9.2, eastShoulder + 14.1]) band(crown, visibleRuns(crownPlan), y - 0.11, y + 0.08, 0.11, { omit: ["back"] });
  for (const run of crownPlan.slice(3)) {
    const count = Math.max(1, Math.round(run.length / 2));
    const fractions = Array.from({ length: count - 1 }, (_, rib) => (rib + 1) / count);
    for (const where of stationsAt(run, fractions)) box(crown, where.at, where.normal, 0.06, 0, 0.22, eastShoulder + 0.12, crownTop - 0.12);
    for (const y of [eastShoulder + 4.5, eastShoulder + 9.2, eastShoulder + 14.1]) {
      if (run.length > 0.4) panel(crown, run, 0.15, run.length - 0.15, y - 0.11, y + 0.08, 0.11);
    }
  }
  band(crown, crownPlan, crownTop - 0.45, crownTop, 0.18, { closed: true, omit: ["back"] });

  // Three nested boxes reproduce the source's segmented white antenna. The mast's plan is
  // inside the crown, and the geometry test casts every foot corner onto its roof.
  const addMastSection = ([y0, y1, half]) => box(mast, mastCenter, [0, 1], half, -half, half, y0, y1);
  addMastSection([crownTop, mastLowerJoint, 1.1]);
  addMastSection([mastLowerJoint, mastUpperJoint, 0.68]);
  addMastSection([mastUpperJoint, tip, 0.5]);

  return kit.finish({ height: tip, outlines: [shell, crownShell], opacity: 0.24 });
}
