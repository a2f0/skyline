// Drawing measurements for the skyline study, shared by tests/skyline-study.test.ts and the
// scripts in scripts/. Drawing points are in the source SVG's layer space, the space of
// each building group's parent.
import type { Vec3 } from "../src/models/building-kit.js";

const heritage = "building-heritage-at-millennium-park", kemper = "building-kemper";
const crain = "building-crain-communications", michigan = "building-michigan-plaza-south-tower";
const trump = "building-trump-tower-only";
const prudential = "building-one-prudential-plaza", prudentialPodium = "building-prudential-plaza-podium";
const twoPrudential = "building-two-prudential-plaza";
// Mapped only: the drawing models the tower as Michigan Plaza South.
const northWabash = "building-330-north-wabash";
const aon = "layer3";

// The excerpts the study shows under the scene; scripts/reference-svg.js regenerates them.
// Paths are within src/, which the built site serves at its root, so they are also the URLs
// the study pages and tests fetch.
interface Reference {
  path: string;
  source: string;
  viewBox: string;
  title: string;
  description: string;
  defs: string[];
  groups: string[];
}

const reference: Reference = {
  path: "models/skyline-reference.svg",
  source: "skyline-animated.svg",
  // The centered expansion clears Trump's spire while retaining the prior frame centre.
  // Its aspect stays aligned with skyline-study.js's fit dimensions.
  viewBox: "1074.238 -154.834 4430 3535.05",
  title: "The Heritage at Millennium Park, Kemper, Crain, Michigan Plaza South, Trump International Hotel and Tower, One and Two Prudential Plaza, and Aon Center: original skyline geometry",
  description: "Unmodified tower groups from skyline-animated.svg, preserving their positions, transforms, and draw order. Foreground buildings the original layout does not model are omitted.",
  // Aon's in-group tonal overlays refer to these source definitions.
  defs: ["facade-depth", "facade-height", "clip-aon-center"],
  groups: [heritage, kemper, michigan, crain, trump, prudential, twoPrudential, prudentialPodium, aon],
};

// The geographic layout's frame: every building the drawing shows, in a frame as tall as
// the reference's and about the same centre, widened to the drawing's leftmost and
// rightmost buildings. Its camera is the reference's, so every landmark lands where it did.
const panorama: Reference = {
  path: "models/skyline-panorama.svg",
  source: "skyline-animated.svg",
  viewBox: "-1400 -154.834 9378.476 3535.05",
  title: "Chicago's skyline from the Adler Planetarium's lakefront: every building the drawing shows",
  description: "Unmodified building groups from skyline-animated.svg, preserving their positions, transforms, and draw order, including those the geographic layout does not model yet.",
  defs: ["facade-depth", "facade-height", "clip-aon-center", "hover-roof-0", "hover-roof-1"],
  groups: [
    "building-buckingham-west", "building-buckingham-east", "building-the-buckingham", "building-blue-cross-blue-shield", "building-340-on-the-park",
    heritage, "building-six-north-far-east", "building-six-north-east", "building-six-north-east-path318", "building-six-north-far-east-path318",
    "building-six-north-east-path320", "building-six-north-far-east-path320", "building-six-north-michigan", "building-willoughby-tower",
    "building-michigan-west-right", "building-michigan-west-left-roof", "building-michigan-west-right-roof", "building-michigan-west-left",
    "building-michigan-west-front", kemper, michigan, "building-michigan-plaza-front-tall", "building-michigan-plaza-front-middle",
    "building-michigan-plaza-front-small", crain, trump, "building-office-west-of-aon", prudential, twoPrudential, prudentialPodium,
    "building-university-club", "building-monroe", "building-maclean-center", "building-lakeview", "building-peoples-gas",
    "building-200-south-michigan", "building-railway-exchange", aon,
  ],
};

// Every model in the scene, in the study's order.
interface ModelsEntry {
  id: string;
  name: string;
  module: string;
  factory: string;
}

const models: ModelsEntry[] = [
  { id: heritage, name: "The Heritage at Millennium Park", module: "./models/heritage-at-millennium-park.ts", factory: "createHeritageAtMillenniumParkBuilding" },
  { id: kemper, name: "Kemper Building", module: "./models/kemper.ts", factory: "createKemperBuilding" },
  { id: crain, name: "Crain Communications Building", module: "./models/crain-communications.ts", factory: "createCrainSkylineBuilding" },
  { id: michigan, name: "Michigan Plaza South", module: "./models/michigan-plaza-south.ts", factory: "createMichiganPlazaSouthBuilding" },
  { id: trump, name: "Trump International Hotel and Tower", module: "./models/trump-international-tower.ts", factory: "createTrumpInternationalTowerBuilding" },
  { id: prudential, name: "One Prudential Plaza", module: "./models/one-prudential-plaza.ts", factory: "createOnePrudentialPlazaBuilding" },
  { id: twoPrudential, name: "Two Prudential Plaza", module: "./models/two-prudential-plaza.ts", factory: "createTwoPrudentialPlazaBuilding" },
  { id: aon, name: "Aon Center", module: "./models/aon-center.ts", factory: "createAonCenterBuilding" },
];

// Corresponding roof features measured in the original SVG, not derived from the
// camera config: [name, building id, model point, drawing point]. A tolerance allows
// the hand-drawn perspective to differ.
export type Landmark = [string, string, Vec3, [number, number]];
const landmarks: Landmark[] = [
  ["Kemper left roof", kemper, [-15.5, 141, 26.75], [2440, 1811]],
  ["Kemper near roof", kemper, [15.5, 141, 26.75], [2588, 1803]],
  ["Kemper right roof", kemper, [15.5, 141, -26.75], [2759, 1819]],
  ["Michigan left roof", michigan, [-23.35, 180, 23.35], [3255, 1577]],
  ["Michigan near roof", michigan, [23.35, 180, 23.35], [3466, 1572]],
  ["Michigan right roof", michigan, [23.35, 180, -23.35], [3662, 1589]],
];
// The Aon reframe is 1.19979x wider. Scale inherited limits to retain their
// layer-space meaning; fitted limits below allow only measured layout drift.
const landmarkTolerance = 0.0151;

// The geographic skyline camera's correspondences: mapped points of the geographic
// models, in meters east, up, and south of Crain's mapped centre, against the drawing
// points above for the same features. Tips stand over their mapped parts, and roof
// corners are the mapped outline vertices that the drawn corners show from the
// photograph's viewpoint. scripts/fit-geographic-camera.ts solves the camera from them.
// The tower the drawing labels Michigan Plaza South is 330 North Wabash: its mapped roof
// corners land on the drawn ones, and One Prudential covers its east face where the
// drawing does. The mapped Michigan Plaza South stands behind One Prudential.
const geographicLandmarks: Landmark[] = [
  ["Trump spire tip", trump, [-124.72, 423.2, -458.66], [4141.449, 187.538]],
  ["One Prudential mast top", prudential, [161.76, 259.4, -7.29], [4053.655, 879.202]],
  ["Two Prudential spire tip", twoPrudential, [186.865, 303.3, -65.815], [4475.207, 565.047]],
  ["Two Prudential pyramid peak", twoPrudential, [186.865, 280.2, -65.815], [4475.207, 748.347]],
  ["Two Prudential eave west", twoPrudential, [166.915, 229.32, -46.587], [4261.006, 1151.884]],
  ["Two Prudential eave near", twoPrudential, [207.703, 229.32, -47.553], [4534.685, 1127.577]],
  ["Two Prudential eave east", twoPrudential, [206.815, 229.32, -85.042], [4690.631, 1140.245]],
  ["Aon roof west", aon, [254.75, 340, -28.62], [4807.686, 115.434]],
  ["Aon roof near", aon, [306.05, 340, -21.16], [5148.845, 88.061]],
  ["Aon roof east", aon, [313.23, 340, -72.55], [5401.877, 155.047]],
  ["One Prudential roof west", prudential, [109.48, 169.5, 8.58], [3629.988, 1627.757]],
  ["One Prudential roof near", prudential, [181.05, 169.5, 7.21], [4117.251, 1611.589]],
  ["One Prudential roof east", prudential, [181.03, 169.5, -15.01], [4220.171, 1624.276]],
  ["Kemper roof west", kemper, [-230.6, 159, -167.83], [2440, 1811]],
  ["Kemper roof near", kemper, [-196.64, 159, -168.51], [2588, 1803]],
  ["Kemper roof east", kemper, [-197.23, 159, -210.29], [2759, 1819]],
  ["Crain peak west", crain, [-19.68, 177.4, -15.24], [2921.0, 1586.4]],
  ["Crain peak east", crain, [-19.28, 177.4, -22.52], [2968.4, 1590.6]],
  ["Crain left shoulder", crain, [-18.83, 144.61, 23.1], [2748.3, 1846.9]],
  ["Crain right shoulder", crain, [18.82, 143.75, -23.1], [3198.6, 1853.1]],
  ["Crain foot", crain, [19.68, 110.56, 22.56], [2987.2, 2127.2]],
  ["Crain step east", crain, [19.43, 117.43, 7.76], [3058.4, 2072.3]],
  ["Heritage screen south", heritage, [-48.68, 192.4, 90.75], [2223.52, 1421.32]],
  ["Heritage screen north", heritage, [-48.32, 192.4, 56.84], [2440.27, 1436.67]],
  ["330 North Wabash roof west", northWabash, [-235.234, 211.84, -383.178], [3254.78, 1577.346]],
  ["330 North Wabash roof near", northWabash, [-197.835, 211.84, -384.123], [3465.957, 1572.425]],
];

// Fitted buildings export their features. Each landmark pairs a feature with a vertex of
// the drawn group, and must also lie on an edge of the built model, so moving the
// geometry without its exported constant fails too. Columns are drawn x positions that
// must stand proud, in the named batch, as the first surface along their sight lines.
// An entry's fields, all required unless marked optional:
//   id, label: the model's id in `models`, and the name assertion messages use.
//   features: the model module's export holding feature points in model meters.
//   landmarks: feature name to drawing point. Names share one namespace with every other
//     landmark, including other buildings', so keep them unique. tolerance bounds their
//     error in normalized canvas units.
//   onGeometry (optional): more feature names that must lie on the geometry, like the
//     landmarks, within onGeometryTolerance meters of a built edge.
//   columns: feature name to { batch, drawn }, one drawn x per point. Each must line up
//     within columnTolerance canvas units and be hit on that batch sightGap [min, max]
//     meters toward the camera. A set may carry its own tolerance where one part of a
//     building is drawn less consistently than the rest; keep the building's own bound
//     tight rather than slackening it for every set.
//   silhouette (optional): a drawn x that nothing checks generically; it feeds a
//     building-specific assertion in tests/skyline-study.test.js.
interface FittedSpec {
  id: string;
  label: string;
  features: string;
  landmarks: Record<string, [number, number]>;
  onGeometry?: string[];
  onGeometryTolerance: number;
  columns: Record<string, { batch: string; drawn: number[]; tolerance?: number }>;
  rows?: Record<string, { drawn: number[]; tolerance: number }>;
  sightGap: [number, number];
  tolerance: number;
  columnTolerance: number;
  silhouette?: number;
}

const fitted: FittedSpec[] = [
  {
    id: heritage,
    label: "Heritage",
    features: "heritageFeatures",
    landmarks: {
      screenFrontTop: [2256.9, 1417.98],
      screenNorthTop: [2440.27, 1436.67],
      screenSouthTop: [2223.52, 1421.32],
      penthouseCorniceTip: [2152.75, 1440.34],
      stubFrontRoof: [2116.25, 1502.7],
      stubLeftRoof: [2062.84, 1506.77],
      reentrantRoof: [2134.28, 1504.8],
      capSouthEnd: [2154.42, 1500.78],
      capNorthEnd: [2440.26, 1520.79],
      crownFootNorth: [2440.43, 1609.97],
      lowerCapSouthCorner: [2084.43, 2213.79],
      lowerCapNorth: [2287.2, 2222.5],
      lowerFinFootNorth: [2281.8, 2298.7],
    },
    // Features with no drawn vertex that must still lie on the geometry.
    onGeometry: ["capApex"],
    onGeometryTolerance: 0.02,
    // The fourteen mullion lines, the thirteen crown fins, and the ten lower-tier fins.
    columns: {
      mullions: { batch: "mullions, bands, and screen louvers", drawn: [2140.4, 2162.9, 2189.7, 2218.4, 2246.2, 2273.1, 2298.6, 2319.8, 2341.8, 2360.9, 2379.9, 2400.7, 2418.3, 2436.4] },
      crownFins: { batch: "crown fins, caps, and penthouse frame", drawn: [2163.9, 2191.3, 2217.7, 2246.8, 2272.4, 2296.9, 2320.0, 2341.1, 2360.7, 2380.1, 2399.3, 2419.1, 2436.3] },
      lowerFins: { batch: "crown fins, caps, and penthouse frame", drawn: [2097.3, 2111.8, 2129.1, 2144.3, 2163.6, 2186.55, 2207.5, 2228.3, 2252.0, 2276.9] },
    },
    // Mullion points sit on the face and fin points half a fin deep, so a present column is
    // hit 0.1-1 m toward the camera. A missing one leaves the facade at 0 or panes behind it.
    sightGap: [0.1, 1],
    // Heritage was fitted numerically, so it holds a tighter bound than the hand-placed trio.
    // Both descend from the four-building frame's 0.008 and 0.006 limits after
    // successive 1.375x, 1.20835x, and 1.19979x viewBox expansions. The landmark
    // limit includes the measured perspective shift and the stacked page, whose desktop
    // canvas fits the frame to its height: the cap's north end reaches 0.00439 there.
    tolerance: 0.0046,
    columnTolerance: 0.00305,
    // The left silhouette is the stub's drawn edge.
    silhouette: 2062.84,
  },
  {
    id: crain,
    label: "Crain",
    features: "crainFeatures",
    // The drawn diamond: both peaks, both shoulders, the south-west half's foot, and the
    // east end of the north-east half's flat step over the south-east notch. The drawing
    // simplifies the slot, flattening its foot and widening it 45% beyond the photograph,
    // so the slot corners are held to the geometry only.
    landmarks: {
      crainPeakWest: [2921.0, 1586.4],
      crainPeakEast: [2968.4, 1590.6],
      crainShoulderWest: [2748.3, 1846.9],
      crainShoulderEast: [3198.6, 1853.1],
      crainFoot: [2987.2, 2127.2],
      crainStepEast: [3058.4, 2072.3],
    },
    onGeometry: ["crainSlotWest", "crainSlotEast"],
    onGeometryTolerance: 0.02,
    // The drawing shows bands, not columns: the ribbon glazing's mullions are finer than it
    // draws.
    columns: {},
    // The twenty-nine sills the left face shows below its shoulder, where each light band
    // gives way to the glass above it on the drawing's left edge. The lowest few sit highest
    // against the drawing; the worst, 0.00217, is at the desktop layout.
    rows: {
      crainSills: { drawn: [2644.3, 2617.2, 2591.3, 2564.2, 2536.6, 2508.2, 2480.5, 2454.3, 2428.4, 2400, 2372.9, 2345.6, 2319.5, 2289.2, 2263.8, 2234, 2208.7, 2180.6, 2153.9, 2127.2, 2100.9, 2072.5, 2045.2, 2016.8, 1991.4, 1963.8, 1936.7, 1910, 1881.9], tolerance: 0.0024 },
    },
    sightGap: [0.05, 1],
    // Fitted numerically with the placement in skyline-study.ts. The foot and the step are the
    // worst landmarks, 0.00375 at the desktop and laptop layouts; the peaks and shoulders stay
    // inside 0.0028.
    tolerance: 0.004,
    columnTolerance: 0.001,
  },
  {
    id: trump,
    label: "Trump International Hotel and Tower",
    features: "trumpFeatures",
    // The shaft's roof, its step down to the north-east shoulder, the crown, and the spire's
    // tip and joints are all sharp SVG vertices, on the real tower's mapped corners and
    // photographed heights.
    landmarks: {
      trumpTowerWestRoof: [3890.364, 621.787],
      trumpTowerEastStart: [4131.601, 615.557],
      trumpRoofStepTop: [4170.768, 624.612],
      trumpRoofStepBottom: [4170.768, 671.792],
      trumpEastShoulder: [4217.391, 683.364],
      trumpCrownWest: [4037.91, 561.188],
      trumpCrownEast: [4207.711, 567.37],
      trumpSpireTip: [4141.449, 187.538],
      trumpSpireUpperJoint: [4141.448, 324.736],
      trumpSpireLowerJoint: [4141.448, 486.302],
    },
    onGeometryTolerance: 0.02,
    columns: {
      // Fifty-two drawn mullion lines on the upper shaft and the crown, measured where they
      // cross layer y≈1052 or at the crown's upper edge, each against the model's nearest
      // mullion on its 6 ft module. The drawing spaces them unevenly, doubling some round the
      // curves and skipping most of the east face's.
      trumpFrontMullions: { batch: "Trump · stainless mullions", drawn: [3901.538, 3907.527, 3915.549, 3923.569, 3931.591, 3939.612, 3947.632, 3956.976, 3967.882, 3979.035, 3991.065, 4003.399, 4015.431, 4028.17, 4041.953, 4057.076] },
      trumpCornerMullions: { batch: "Trump · stainless mullions", drawn: [4073.889, 4090.699, 4107.844] },
      trumpEastMullions: { batch: "Trump · stainless mullions", drawn: [4132.294, 4143.203, 4153.301, 4163.411, 4172.917, 4179.801, 4187.73, 4196.078, 4204.42, 4210.454] },
      trumpCrownMullions: { batch: "Trump · crown mullions", drawn: [4042.783, 4047.166, 4051.336, 4056.356, 4061.407, 4068.232, 4076.372, 4084.83, 4094.737, 4103.839, 4113.424, 4123.676, 4133.78, 4144.157, 4154.945, 4164.957, 4174.571, 4182.598, 4189.196, 4193.491, 4196.86, 4200.233, 4203.905] },
    },
    // Samples of the forty-one regular shaft rows, measured through a south bay between the
    // eighth and ninth mullions. They span the One Prudential occlusion edge to the upper shaft, so a
    // wrong pitch or phase cannot hide behind the foreground building. The drawing keeps the
    // photograph's upward-looking perspective, which spaces these rows about 1.5% tighter
    // through this camera than the landmarks above them allow; the ends stray furthest.
    rows: {
      trumpFloorBands: { drawn: [1723.07, 1573.522, 1423.974, 1274.426, 1124.877, 975.329, 868.509], tolerance: 0.0025 },
    },
    sightGap: [0.05, 1],
    // Fitted numerically at all five layouts. The worst landmark is the drawn roof's east end
    // at the bevel, 0.00269 at the desktop and laptop layouts; the worst column is a crown
    // mullion, 0.00133 at the tablet layout; the rows reach 0.00228 at the desktop layout.
    tolerance: 0.0029,
    columnTolerance: 0.0019,
  },
  {
    id: prudential,
    label: "One Prudential",
    features: "onePrudentialFeatures",
    landmarks: {
      roofLeft: [3629.988, 1627.757],
      roofNear: [4117.251, 1611.589],
      roofRight: [4220.171, 1624.276],
      bandFootLeft: [3629.988, 1664.827],
      bandFootNear: [4117.251, 1644.403],
      // The penthouse's south face: the sign wall's top corners under the screen, and the
      // screen's top at its ends.
      penthouseTopWest: [3645.72, 1544.83],
      penthouseTopEast: [3986.5, 1529.47],
      screenTopWest: [3650, 1525.9],
      screenTopEast: [3986.5, 1508.4],
      mastTip: [4053.655, 879.202],
      wingSouthWest: [3979.05, 2532.59],
      wingCorner: [4244.76, 2532.59],
      wingEastEnd: [4507.699, 2540.26],
    },
    onGeometryTolerance: 0.02,
    // Piers between the thirty south and nine east window columns, the screen's fins, and
    // the wing's ribs. A pier's drawn position is the gap between two window columns; a fin
    // or a rib is drawn directly.
    columns: {
      southPiers: { batch: "One Prudential · limestone piers", drawn: [3649.8, 3665.82, 3681.84, 3697.86, 3713.89, 3729.91, 3745.93, 3761.96, 3777.98, 3794, 3810.03, 3826.05, 3842.07, 3858.1, 3874.12, 3890.14, 3906.16, 3922.19, 3938.21, 3954.23, 3970.26, 3986.28, 4002.3, 4018.33, 4034.35, 4050.37, 4066.4, 4082.42, 4098.44] },
      eastPiers: { batch: "One Prudential · limestone piers", drawn: [4130.77, 4141.45, 4152.13, 4162.81, 4173.49, 4184.18, 4194.86, 4205.54] },
      screenLouvers: { batch: "One Prudential · screen louvers", drawn: [3660.59, 3667.26, 3673.94, 3680.62, 3687.29, 3693.97, 3700.64, 3707.32, 3714, 3720.67, 3727.35, 3734.03, 3740.7, 3747.38, 3754.06, 3760.73, 3767.41, 3774.08, 3780.76, 3787.44, 3794.11, 3800.79, 3807.47, 3814.14, 3820.82, 3827.49, 3834.17, 3840.85, 3847.52, 3854.2, 3860.88, 3867.55, 3874.23, 3880.9, 3887.58, 3894.26, 3900.93, 3907.61, 3914.29, 3920.96, 3927.64, 3934.32, 3940.99, 3947.67, 3954.34, 3961.02, 3967.7, 3974.37, 3981.05] },
      // The drawn podium's ribs keep the tower's module but not quite its projection, so
      // they carry their own bound rather than relaxing the tower's.
      southRibs: { tolerance: 0.0021, batch: "One Prudential · limestone piers", drawn: [3990.9, 4007.05, 4023.21, 4039.37, 4055.52, 4071.68, 4087.84, 4103.99, 4120.15, 4136.31, 4152.46, 4168.62, 4184.78, 4200.93, 4217.09, 4233.25] },
      eastRibs: { tolerance: 0.0021, batch: "One Prudential · limestone piers", drawn: [4252.78, 4263.33, 4273.88, 4284.43, 4294.98, 4305.52, 4316.07, 4326.62, 4337.17, 4347.72, 4358.27, 4368.82, 4379.36, 4389.91, 4400.46, 4411.01, 4421.56, 4432.11, 4442.66, 4453.2, 4463.75, 4474.3, 4484.85, 4495.4] },
    },
    rows: {
      // Centres of six drawn window rows in the south face's fourth bay: the top row, the
      // fortieth floor, and every sixth below it.
      floorRows: { drawn: [1681.648, 1871.923, 2062.197, 2252.471, 2442.746, 2633.02], tolerance: 0.0016 },
    },
    // Each column point sits at half its pier's depth, so a present pier is met a little
    // before the point and a missing one leaves the wall behind it.
    sightGap: [0.05, 1],
    // Fitted numerically at all five layouts. The worst landmark is the drawn screen's
    // west end, which the drawing slopes a little more steeply than the penthouse under it,
    // near 0.00353 at the desktop layout; the rows reach 0.00145 there.
    tolerance: 0.0039,
    columnTolerance: 0.0011,
    // The right silhouette is the wing's drawn east end.
    silhouette: 4507.699,
  },
  {
    id: twoPrudential,
    label: "Two Prudential",
    features: "twoPrudentialFeatures",
    landmarks: {
      twoEaveWest: [4261.006, 1151.884],
      twoEaveNear: [4534.685, 1127.577],
      twoEaveEast: [4690.631, 1140.245],
      twoSouthChevron: [4396.967, 919.462],
      twoEastChevron: [4614.133, 928.384],
      twoPyramid: [4475.207, 748.347],
      twoSpire: [4475.207, 565.047],
      twoMiddleChevron: [4377.239, 1235.333],
      twoLowerChevron: [4359.209, 1517.331],
      twoMiddleWest: [4267.302, 1418.647],
      twoMiddleEast: [4497.328, 1420.013],
      twoLowerWest: [4259.584, 1683.254],
      twoLowerEast: [4452.565, 1671.119],
    },
    onGeometryTolerance: 0.02,
    columns: {
      // Intersections of the filled pier polygons with layer y=1200 (south),
      // y=1330 (east), and y=1880 (lower), counting duplicate outlines once: the core's
      // twelve south piers from corner to corner, nine of its ten east ones, and the lower
      // tier's eight.
      twoSouthPiers: { batch: "Two Prudential · piers", drawn: [4262.98, 4283.676, 4304.373, 4325.069, 4345.765, 4366.462, 4427.964, 4448.529, 4469.097, 4490.376, 4510.915, 4530.912] },
      twoEastPiers: { batch: "Two Prudential · piers", drawn: [4687.698, 4676.347, 4663.073, 4650.31, 4638.036, 4590.444, 4565.876, 4553.532, 4538.582] },
      twoLowerPiers: { batch: "Two Prudential · piers", drawn: [4263.919, 4284.925, 4305.622, 4326.418, 4391.515, 4412.221, 4432.928, 4453.634] },
    },
    // Fitted numerically at all five layouts. The worst landmark is the south gable's
    // point, which the drawing puts a little higher than the east one's, near 0.00322 at
    // the desktop layout; the worst column is a south pier, near 0.00112 at the tablet one.
    tolerance: 0.0035,
    columnTolerance: 0.0018,
    sightGap: [0.05, 1],
  },
  {
    id: aon,
    label: "Aon Center",
    features: "aonFeatures",
    // The drawn roof edge's ends and its highest point, the south face's east end.
    landmarks: {
      aonRoofWest: [4807.686, 115.434],
      aonRoofNear: [5148.845, 88.061],
      aonRoofEast: [5401.877, 155.047],
    },
    onGeometry: ["aonNotchFront", "aonNotchEast"],
    onGeometryTolerance: 0.02,
    columns: {
      aonFrontPiers: { batch: "Aon · granite piers", drawn: [4834.764, 4856.53, 4878.294, 4900.059, 4921.824, 4943.589, 4965.354, 4987.118, 5008.883, 5030.648, 5052.412, 5074.177, 5095.942, 5117.707] },
      aonSidePiers: { batch: "Aon · granite piers", drawn: [5228.75, 5241.034, 5253.318, 5265.603, 5277.887, 5290.171, 5302.456, 5314.74, 5327.025, 5339.309, 5351.594, 5363.878, 5376.162, 5388.447] },
    },
    rows: {
      // Centres of six drawn front-face bands, spanning the offices. The drawing spaces its
      // bands about 2.5% wider than the real floors under the scale its roof and piers fit,
      // so the top and bottom samples stray furthest; the worst, 0.00692, is at the desktop
      // layout.
      aonFloorRows: { drawn: [589.229, 981.795, 1374.361, 1766.927, 2159.494, 2552.06], tolerance: 0.0075 },
    },
    // Fitted numerically at all five layouts. The drawn east end of the roof drops 67 layer
    // units below the near corner, more than a level roof drops through this long lens;
    // it is the worst landmark, 0.00823 at the desktop layout.
    tolerance: 0.0088,
    columnTolerance: 0.0034,
    sightGap: [0.05, 0.7],
  },
];

export { heritage, kemper, crain, michigan, trump, prudential, prudentialPodium, twoPrudential, aon, reference, panorama, models, landmarks, landmarkTolerance, geographicLandmarks, fitted };
export type { ModelsEntry, FittedSpec };
