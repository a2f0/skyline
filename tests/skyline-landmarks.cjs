// Drawing measurements for the skyline study, shared by tests/skyline-study.cjs and the
// scripts in scripts/. Drawing points are in the source SVG's layer space, the space of
// each building group's parent.
const heritage = "building-heritage-at-millennium-park", kemper = "building-kemper";
const crain = "building-crain-communications", michigan = "building-michigan-plaza-south-tower";

// The excerpt the study shows beside the scene; scripts/reference-svg.cjs regenerates it.
const reference = {
  path: "models/skyline-reference.svg",
  source: "skyline-animated.svg",
  viewBox: "1761.407 1257.77 2222.3 1574.13",
  title: "The Heritage at Millennium Park, Kemper, Crain, and Michigan Plaza South: original skyline geometry",
  description: "Unmodified tower groups from skyline-animated.svg, preserving their positions, transforms, and draw order. Unidentified foreground buildings are omitted.",
  groups: [heritage, kemper, michigan, crain],
};

// Every model in the scene, in the study's order.
const models = [
  { id: heritage, name: "The Heritage at Millennium Park", module: "./models/heritage-at-millennium-park.js", factory: "createHeritageAtMillenniumParkBuilding" },
  { id: kemper, name: "Kemper Building", module: "./models/kemper.js", factory: "createKemperBuilding" },
  { id: crain, name: "Crain Communications Building", module: "./models/crain-communications.js", factory: "createCrainBuilding" },
  { id: michigan, name: "Michigan Plaza South", module: "./models/michigan-plaza-south.js", factory: "createMichiganPlazaSouthBuilding" },
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
const landmarkTolerance = 0.03;

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
//     meters toward the camera.
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
    tolerance: 0.008,
    columnTolerance: 0.006,
    // The left silhouette is the stub's drawn edge.
    silhouette: 2062.84,
  },
];

module.exports = { heritage, kemper, crain, michigan, reference, models, landmarks, landmarkTolerance, fitted };
