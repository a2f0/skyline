// Drawing measurements for the skyline study, shared by tests/skyline-study.cjs and the
// scripts in scripts/. Drawing points are in the source SVG's layer space, the space of
// each building group's parent.
const heritage = "building-heritage-at-millennium-park", kemper = "building-kemper";
const crain = "building-crain-communications", michigan = "building-michigan-plaza-south-tower";
const prudential = "building-one-prudential-plaza", prudentialPodium = "building-prudential-plaza-podium";
const twoPrudential = "building-two-prudential-plaza";

// The excerpt the study shows beside the scene; scripts/reference-svg.cjs regenerates it.
const reference = {
  path: "models/skyline-reference.svg",
  source: "skyline-animated.svg",
  viewBox: "1761.407 393.513 3055.662 2438.357",
  title: "The Heritage at Millennium Park, Kemper, Crain, Michigan Plaza South, and One and Two Prudential Plaza: original skyline geometry",
  description: "Unmodified tower groups from skyline-animated.svg, preserving their positions, transforms, and draw order. Unidentified foreground buildings are omitted.",
  groups: [heritage, kemper, michigan, crain, prudential, twoPrudential, prudentialPodium],
};

// Every model in the scene, in the study's order.
const models = [
  { id: heritage, name: "The Heritage at Millennium Park", module: "./models/heritage-at-millennium-park.js", factory: "createHeritageAtMillenniumParkBuilding" },
  { id: kemper, name: "Kemper Building", module: "./models/kemper.js", factory: "createKemperBuilding" },
  { id: crain, name: "Crain Communications Building", module: "./models/crain-communications.js", factory: "createCrainBuilding" },
  { id: michigan, name: "Michigan Plaza South", module: "./models/michigan-plaza-south.js", factory: "createMichiganPlazaSouthBuilding" },
  { id: prudential, name: "One Prudential Plaza", module: "./models/one-prudential-plaza.js", factory: "createOnePrudentialPlazaBuilding" },
  { id: twoPrudential, name: "Two Prudential Plaza", module: "./models/two-prudential-plaza.js", factory: "createTwoPrudentialPlazaBuilding" },
];

// Corresponding roof features measured in the original SVG, not derived from the
// camera config: [name, building id, model point, drawing point]. A tolerance allows
// the hand-drawn perspective to differ.
const landmarks = [
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
// Widening the viewBox for a fifth building divided every normalized error by 1.375, so
// these bounds are divided to match: they assert the same fidelity against the drawing as
// they did in the four-building frame, not 37.5% less.
const landmarkTolerance = 0.0218;

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
//     building-specific assertion in tests/skyline-study.cjs.
const fitted = [
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
    // Both are the four-building frame's 0.008 and 0.006 divided by the 1.375 the viewBox
    // widened, so they hold Heritage to the same distance on the drawing as before.
    tolerance: 0.0058,
    columnTolerance: 0.0044,
    // The left silhouette is the stub's drawn edge.
    silhouette: 2062.84,
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
      southRibs: { tolerance: 0.009, batch: "piers, ribs, and louvers", drawn: [3990.9, 4007.05, 4023.21, 4039.37, 4055.52, 4071.68, 4087.84, 4103.99, 4120.15, 4136.31, 4152.46, 4168.62, 4184.78, 4200.93, 4217.09, 4233.25] },
      eastRibs: { tolerance: 0.009, batch: "piers, ribs, and louvers", drawn: [4252.78, 4263.33, 4273.88, 4284.43, 4294.98, 4305.52, 4316.07, 4326.62, 4337.17, 4347.72, 4358.27, 4368.82, 4379.36, 4389.91, 4400.46, 4411.01, 4421.56, 4432.11, 4442.66, 4453.2, 4463.75, 4474.3, 4484.85, 4495.4] },
    },
    // Each column point sits at half its pier's depth, so a present pier is met a little
    // before the point and a missing one leaves the wall behind it.
    sightGap: [0.05, 1],
    // Measured across all five layouts. The tower's piers are the tight set; the wing's
    // ribs are three times looser and carry their own bound below.
    // The wing's corners are the worst landmarks, at 0.00607: the drawn podium does not
    // share its tower's projection, so it cannot sit as tightly as the tower does. The
    // tower's own landmarks are inside 0.0026.
    tolerance: 0.009,
    columnTolerance: 0.003,
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
    // Measured at all five layouts: the tallest layout is worst, near 0.00292
    // for landmarks and 0.00317 for columns. Parallel SVG edges cannot coincide
    // with perspective projections at every camera distance.
    tolerance: 0.0035,
    columnTolerance: 0.0035,
    sightGap: [0.05, 1],
  },
];

module.exports = { heritage, kemper, crain, michigan, prudential, prudentialPodium, twoPrudential, reference, models, landmarks, landmarkTolerance, fitted };
