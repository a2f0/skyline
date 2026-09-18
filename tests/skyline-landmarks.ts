// Drawing measurements for the skyline study, shared by tests/skyline-study.test.ts and the
// scripts in scripts/. Drawing points are in the source SVG's layer space, the space of
// each building group's parent.
import type { Vec3 } from "../models/building-kit.js";

const heritage = "building-heritage-at-millennium-park", kemper = "building-kemper";
const crain = "building-crain-communications", michigan = "building-michigan-plaza-south-tower";
const trump = "building-trump-tower-only";
const prudential = "building-one-prudential-plaza", prudentialPodium = "building-prudential-plaza-podium";
const twoPrudential = "building-two-prudential-plaza";
const aon = "layer3";

// The excerpt the study shows beside the scene; scripts/reference-svg.js regenerates it.
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
  description: "Unmodified tower groups from skyline-animated.svg, preserving their positions, transforms, and draw order. Unidentified foreground buildings are omitted.",
  // Aon's in-group tonal overlays refer to these source definitions.
  defs: ["facade-depth", "facade-height", "clip-aon-center"],
  groups: [heritage, kemper, michigan, crain, trump, prudential, twoPrudential, prudentialPodium, aon],
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
  { id: crain, name: "Crain Communications Building", module: "./models/crain-communications.ts", factory: "createCrainBuilding" },
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
  ["Crain left shoulder", crain, [-27, 135.4, 27], [2748, 1850]],
  ["Crain right shoulder", crain, [27, 135.4, -27], [3198, 1854]],
  ["Crain peak", crain, [-27, 177.4, -27], [2945, 1590]],
  ["Crain near valley", crain, [27, 93.4, 27], [2987, 2130]],
  ["Michigan left roof", michigan, [-23.35, 180, 23.35], [3255, 1577]],
  ["Michigan near roof", michigan, [23.35, 180, 23.35], [3466, 1572]],
  ["Michigan right roof", michigan, [23.35, 180, -23.35], [3662, 1589]],
];
// The Aon reframe is 1.19979x wider. Scale inherited limits to retain their
// layer-space meaning; fitted limits below allow only measured layout drift.
const landmarkTolerance = 0.0151;

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
    // limit includes the measured perspective shift at the laptop layout.
    tolerance: 0.00435,
    columnTolerance: 0.00305,
    // The left silhouette is the stub's drawn edge.
    silhouette: 2062.84,
  },
  {
    id: trump,
    label: "Trump International Hotel and Tower",
    features: "trumpFeatures",
    // The tower's high south roof, east-face drop, narrow offset crown, and segmented spire
    // are all sharp SVG vertices. Their placement is fitted through the real skyline camera
    // rather than a parallel approximation of the source drawing.
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
      // Fifty-two unobscured upper-shaft and crown mullions, measured where their source lines
      // cross layer y≈1052 or at the crown's upper edge. The pitch opens across each face.
      trumpFrontMullions: { batch: "raised mullions and floor bands", drawn: [3901.538, 3907.527, 3915.549, 3923.569, 3931.591, 3939.612, 3947.632, 3956.976, 3967.882, 3979.035, 3991.065, 4003.399, 4015.431, 4028.17, 4041.953, 4057.076] },
      trumpCornerMullions: { batch: "raised mullions and floor bands", drawn: [4073.889, 4090.699, 4107.844] },
      trumpEastMullions: { batch: "raised mullions and floor bands", drawn: [4132.294, 4143.203, 4153.301, 4163.411, 4172.917, 4179.801, 4187.73, 4196.078, 4204.42, 4210.454] },
      trumpCrownMullions: { batch: "ribbed crown", drawn: [4042.783, 4047.166, 4051.336, 4056.356, 4061.407, 4068.232, 4076.372, 4084.83, 4094.737, 4103.839, 4113.424, 4123.676, 4133.78, 4144.157, 4154.945, 4164.957, 4174.571, 4182.598, 4189.196, 4193.491, 4196.86, 4200.233, 4203.905] },
    },
    // Samples of the forty-one regular shaft rows, measured through a south bay between the
    // eighth and ninth mullions. They span the One Prudential occlusion edge to the upper shaft, so a
    // wrong pitch or phase cannot hide behind the foreground building.
    rows: {
      trumpFloorBands: { drawn: [1723.07, 1573.522, 1423.974, 1274.426, 1124.877, 975.329, 868.509], tolerance: 0.00083 },
    },
    sightGap: [0.05, 1],
    // The compact crown's hand-drawn sloping edge is the limiting landmark; all five
    // layouts remain within this measured 0.0027 canvas-unit bound.
    tolerance: 0.0027,
    columnTolerance: 0.0018,
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
      penthouseTopWest: [3645.72, 1544.83],
      penthouseTopEast: [3986.5, 1529.47],
      mastTip: [4053.655, 879.202],
      wingSouthWest: [3979.05, 2532.59],
      wingCorner: [4244.76, 2532.59],
      wingEastEnd: [4507.699, 2540.26],
    },
    onGeometryTolerance: 0.02,
    // Piers between the thirty south and nine east window columns, and the wing's ribs.
    // A pier's drawn position is the gap between two window columns; a rib is drawn
    // directly.
    columns: {
      southPiers: { batch: "piers, ribs, and louvers", drawn: [3649.8, 3665.82, 3681.84, 3697.86, 3713.89, 3729.91, 3745.93, 3761.96, 3777.98, 3794, 3810.03, 3826.05, 3842.07, 3858.1, 3874.12, 3890.14, 3906.16, 3922.19, 3938.21, 3954.23, 3970.26, 3986.28, 4002.3, 4018.33, 4034.35, 4050.37, 4066.4, 4082.42, 4098.44] },
      eastPiers: { batch: "piers, ribs, and louvers", drawn: [4130.77, 4141.45, 4152.13, 4162.81, 4173.49, 4184.18, 4194.86, 4205.54] },
      screenLouvers: { batch: "piers, ribs, and louvers", drawn: [3660.59, 3667.26, 3673.94, 3680.62, 3687.29, 3693.97, 3700.64, 3707.32, 3714, 3720.67, 3727.35, 3734.03, 3740.7, 3747.38, 3754.06, 3760.73, 3767.41, 3774.08, 3780.76, 3787.44, 3794.11, 3800.79, 3807.47, 3814.14, 3820.82, 3827.49, 3834.17, 3840.85, 3847.52, 3854.2, 3860.88, 3867.55, 3874.23, 3880.9, 3887.58, 3894.26, 3900.93, 3907.61, 3914.29, 3920.96, 3927.64, 3934.32, 3940.99, 3947.67, 3954.34, 3961.02, 3967.7, 3974.37, 3981.05] },
      // The drawn podium does not share its tower's projection: its top is flat where
      // the tower's own window rows slope -0.0333. Its ribs therefore land about three
      // times looser than the tower's piers, worst at the ends and at the narrowest
      // viewport, so they carry their own bound rather than relaxing the tower's.
      southRibs: { tolerance: 0.0063, batch: "piers, ribs, and louvers", drawn: [3990.9, 4007.05, 4023.21, 4039.37, 4055.52, 4071.68, 4087.84, 4103.99, 4120.15, 4136.31, 4152.46, 4168.62, 4184.78, 4200.93, 4217.09, 4233.25] },
      eastRibs: { tolerance: 0.0063, batch: "piers, ribs, and louvers", drawn: [4252.78, 4263.33, 4273.88, 4284.43, 4294.98, 4305.52, 4316.07, 4326.62, 4337.17, 4347.72, 4358.27, 4368.82, 4379.36, 4389.91, 4400.46, 4411.01, 4421.56, 4432.11, 4442.66, 4453.2, 4463.75, 4474.3, 4484.85, 4495.4] },
    },
    // Each column point sits at half its pier's depth, so a present pier is met a little
    // before the point and a missing one leaves the wall behind it.
    sightGap: [0.05, 1],
    // Measured across all five layouts. The tower's piers are the tight set; the wing's
    // ribs are three times looser and carry their own bound below.
    // The wing's corners are the worst landmarks, near 0.00551: the drawn podium does not
    // share its tower's projection, so it cannot sit as tightly as the tower does. The
    // tower's own landmarks are inside 0.0026.
    tolerance: 0.0063,
    columnTolerance: 0.0021,
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
      // y=1330 (east), and y=1880 (lower). Duplicate outlines are counted once;
      // the two narrow east strips flanking the central glazing are included.
      twoSouthPiers: { batch: "vertical piers and chevrons", drawn: [4262.98, 4283.676, 4304.373, 4325.069, 4345.765, 4366.462, 4427.964, 4448.529, 4469.097, 4490.376, 4510.915, 4530.912] },
      twoEastPiers: { batch: "vertical piers and chevrons", drawn: [4687.698, 4676.347, 4663.073, 4650.31, 4638.036, 4590.444, 4565.876, 4553.532, 4538.582] },
      twoLowerPiers: { batch: "vertical piers and chevrons", drawn: [4263.919, 4284.925, 4305.622, 4326.418, 4391.515, 4412.221, 4432.928, 4453.634] },
    },
    // Measured at all five layouts: the desktop eave is near 0.00260 for landmarks,
    // and the tall layout's south piers near 0.00245 for columns. Parallel SVG edges cannot coincide
    // with perspective projections at every camera distance.
    tolerance: 0.0027,
    columnTolerance: 0.00255,
    sightGap: [0.05, 1],
  },
  {
    id: aon,
    label: "Aon Center",
    features: "aonFeatures",
    landmarks: {
      aonRoofWest: [4807.686, 115.434],
      aonRoofNear: [5148.845, 88.061],
      aonRoofEast: [5401.877, 155.047],
    },
    onGeometryTolerance: 0.02,
    columns: {
      aonFrontPiers: { batch: "granite perimeter piers", drawn: [4834.765, 4856.53, 4878.294, 4900.059, 4921.824, 4943.589, 4965.354, 4987.118, 5008.883, 5030.648, 5052.412, 5074.177, 5095.942] },
      aonSidePiers: { batch: "granite perimeter piers", drawn: [5228.75, 5241.034, 5253.318, 5265.603, 5277.887, 5290.171, 5302.456, 5314.74, 5327.025, 5339.309, 5351.593, 5363.878, 5376.162] },
      aonCornerStrips: { batch: "wide granite corner piers", drawn: [5159.416, 5181.56, 5201.257] },
    },
    rows: {
      // Centers of six source front-face dark bands, spanning the shaft.
      aonFloorRows: { drawn: [2380.034, 1987.468, 1594.902, 1202.335, 777.055, 384.489], tolerance: 0.005 },
    },
    tolerance: 0.008,
    columnTolerance: 0.0034,
    sightGap: [0.05, 0.7],
  },
];

export { heritage, kemper, crain, michigan, trump, prudential, prudentialPodium, twoPrudential, aon, reference, models, landmarks, landmarkTolerance, fitted };
export type { ModelsEntry, FittedSpec };
