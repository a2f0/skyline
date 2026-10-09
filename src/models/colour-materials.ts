import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel } from "./building-kit.js";
import { colourPalette } from "./colour-palette.js";
import type { MaterialName } from "./colour-palette.js";

// The colour trial (https://github.com/a2f0/skyline/issues/115): which named material each
// surface of each building is, and a layer that shows those materials' colours over the greys
// the models build in, restoring the greys exactly when it is turned off. The models are
// unchanged; this reads a built model's meshes by its building ID and each mesh's batch, the
// part of its name after the last " · ", or that without a trailing number, so "glazing 3"
// reads as "glazing". A surface is its batch's material unless its grey names another.
export type Tones = Readonly<Record<number, MaterialName>>;
export type Batch = readonly [material: MaterialName, tones?: Tones];
export type BuildingMaterials = Readonly<Record<string, Batch>>;

// A batch's lit and dim office windows.
const windows = (lit: number, dim: number): Tones => ({ [lit]: "lit window", [dim]: "dim window" });

export const colourMaterials: Readonly<Record<string, BuildingMaterials>> = {
  "building-heritage-at-millennium-park": {
    "tower and lower wing": ["green glass"],
    "mapped ground footprint": ["concrete"],
    "limestone frame": ["limestone"],
    "bronze mullions and slab edges": ["bronze"],
    "roof terraces": ["neutral"],
    "mechanical penthouses": ["concrete"],
    glazing: ["green glass", { 0x7a7a7a: "lit window" }],
    // The four preserved Wabash facades.
    "Wabash facade": ["buff brick"],
  },
  "building-kemper": {
    "marble shell": ["marble"],
    "mullions and bands": ["marble"],
    "crown glazing": ["glass"],
    "crown fins": ["aluminium"],
    "roof cap": ["marble"],
    "lit glazing": ["lit window"],
    "dim glazing": ["dim window"],
    glazing: ["glass"],
  },
  // Silver-reflective glass in white aluminium.
  "building-crain-communications": {
    "aluminum spandrels": ["aluminium"],
    "ribbon glazing": ["glass", { ...windows(0x8a8a8a, 0x565656), 0x585858: "aluminium" }],
    "sloped glazing": ["glass"],
    "glazing grid": ["aluminium"],
    "diamond outline lights": ["lamp"],
    coping: ["aluminium"],
    "slot floor": ["neutral"],
    "mechanical louvers": ["aluminium", { 0x232323: "glass", 0x303030: "dark metal" }],
    "louver blades": ["aluminium", { 0x232323: "glass" }],
    "crown shadow strips": ["neutral", { 0x232323: "glass", 0x585858: "aluminium" }],
  },
  // Bronze-tinted glass and bronze spandrels, on a granite plaza.
  "building-330-north-wabash": {
    shell: ["bronze", { 0x3a3a3a: "neutral", 0x464646: "dark granite" }],
    "glass, spandrels and louvers": ["bronze glass", { ...windows(0x7a7a7a, 0x4a4a4a), 0x262626: "bronze", 0x353535: "bronze" }],
    "bronze mullions and columns": ["bronze"],
  },
  "building-michigan-plaza-south-tower": {
    "mapped tower shell": ["glass"],
    "mullions and bands": ["aluminium"],
    "lit glazing": ["lit window"],
    "dim glazing": ["dim window"],
    glazing: ["glass"],
  },
  "building-trump-tower-only": {
    "tower shell": ["glass"],
    "glass and spandrels": ["glass", windows(0x7c7c7c, 0x505050)],
    "stainless mullions": ["stainless"],
    crown: ["glass", { 0x3c3c3c: "stainless" }],
    "crown mullions": ["stainless"],
    spire: ["stainless"],
  },
  // Limestone piers and aluminium spandrels; the sign's white letters stay white.
  "building-one-prudential-plaza": {
    shell: ["limestone", { 0x242424: "dark metal", 0x4c4c4c: "neutral", 0x8e8e8e: "aluminium" }],
    "windows and spandrels": ["glass", { ...windows(0x7c7c7c, 0x4e4e4e), 0x8a8a8a: "lit window", 0x242424: "dark metal", 0x8e8e8e: "aluminium" }],
    "limestone piers": ["limestone"],
    "limestone courses": ["limestone"],
    "penthouse and sign": ["limestone", { 0x2e2e2e: "dark metal", 0x383838: "dark metal", 0x4c4c4c: "neutral", 0xb0b0b0: "neutral", 0xc4c4c4: "neutral" }],
    "screen louvers": ["aluminium"],
    "antenna mast": ["stainless"],
  },
  // Stone faces and gables, and the dark glass strips between them.
  "building-two-prudential-plaza": {
    "limestone, glass and crown": ["granite", {
      0x353535: "glass", 0x3a3a3a: "glass", 0x3f3f3f: "glass", 0x404040: "glass", 0x454545: "glass", 0x4a4a4a: "glass", 0x565656: "glass",
      ...windows(0x8e8e8e, 0x5e5e5e),
    }],
    piers: ["granite"],
    copings: ["granite"],
    "strip mullions": ["aluminium"],
    "crown ribs": ["granite"],
    spire: ["stainless"],
    "spire inset panels": ["glass"],
    lobby: ["glass"],
  },
  // Mount Airy white granite.
  layer3: {
    "tube shell": ["white granite", { 0x202020: "neutral", 0x4c4c4c: "neutral" }],
    "window ribbons": ["glass", windows(0x7c7c7c, 0x4e4e4e)],
    "granite piers": ["white granite"],
    "granite cap": ["white granite"],
    "rooftop enclosure": ["neutral", { 0x9c9c9c: "aluminium" }],
    "antenna mast": ["stainless"],
  },
  "building-blue-cross-blue-shield": {
    shell: ["glass", { 0x3a3a3a: "neutral" }],
    "glass, spandrels and bands": ["glass", { ...windows(0x8a8a8a, 0x5c5c5c), 0x2a2a2a: "neutral", 0x3e3e3e: "aluminium" }],
    mullions: ["dark metal"],
    "band columns and emblems": ["aluminium"],
  },
  // Blue-green glass, and the south face's white concrete frame.
  "building-340-on-the-park": {
    shell: ["neutral"],
    "curtain wall": ["green glass", { ...windows(0x7a7a7a, 0x4a4a4a), 0x242424: "neutral", 0x2a2a2a: "concrete", 0xb4b4b4: "concrete" }],
    "concrete frame": ["concrete"],
    "railings and guards": ["aluminium"],
  },
  // A concrete frame over bronze ribbon windows.
  "building-the-buckingham": {
    shell: ["neutral"],
    "frame and glass": ["bronze glass", { ...windows(0x6e6e6e, 0x464646), 0x4c4c4c: "concrete" }],
    piers: ["concrete"],
    "corner balconies": ["concrete"],
  },
  // A grey precast slab.
  "building-michigan-plaza-front-tall": {
    shell: ["neutral"],
    "walls and windows": ["glass", { ...windows(0x727272, 0x484848), 0x666666: "concrete" }],
  },
  // Buff limestone over a granite base.
  "building-willoughby-tower": {
    shell: ["neutral"],
    "stone and windows": ["glass", { ...windows(0x6e6e6e, 0x444444), 0x4a4a4a: "dark granite", 0x585858: "limestone" }],
    pinnacles: ["limestone"],
  },
  // Tan brick and terracotta.
  "building-six-north-michigan": {
    shell: ["neutral"],
    "brick and windows": ["glass", { ...windows(0x8a8a8a, 0x5e5e5e), 0x6e6e6e: "buff brick", 0x9c9c9c: "white terracotta" }],
    cornices: ["white terracotta"],
  },
  // A cream terracotta front, and common brick on its south wall.
  "building-six-north-far-east": {
    shell: ["neutral"],
    "terracotta and windows": ["glass", {
      ...windows(0x6e6e6e, 0x3a3a3a),
      0x363636: "white terracotta", 0x404040: "common brick", 0x444444: "white terracotta", 0x505050: "white terracotta", 0x585858: "white terracotta",
    }],
    parapet: ["white terracotta"],
  },
  // Brown masonry.
  "building-michigan-plaza-front-middle": {
    shell: ["neutral"],
    "masonry and windows": ["glass", { ...windows(0x9a9a9a, 0x525252), 0x7a7a7a: "brown brick", 0x888888: "limestone" }],
  },
  // Buff limestone under a slate roof.
  "building-university-club": {
    shell: ["limestone", { 0x2e2e2e: "neutral", 0x343434: "slate", 0x4a4a4a: "neutral" }],
    "stone and windows": ["glass", { ...windows(0x8c8c8c, 0x444444), 0xa4a4a4: "limestone", 0xb4b4b4: "limestone" }],
    "merlons and pinnacles": ["limestone"],
  },
  // Pink terracotta over granite, under a green tile roof.
  "building-monroe": {
    shell: ["pink terracotta", { 0x2e2e2e: "neutral", 0x303030: "green tile", 0x484848: "neutral" }],
    "terracotta and windows": ["glass", { ...windows(0x929292, 0x484848), 0x9a9a9a: "granite", 0xb2b2b2: "pink terracotta", 0xc2c2c2: "pink terracotta" }],
    "attic windows": ["glass"],
  },
  "building-maclean-center": {
    shell: ["neutral"],
    "stone and windows": ["glass", { ...windows(0x6e6e6e, 0x3c3c3c), 0x242424: "neutral", 0x7e7e7e: "limestone", 0x8e8e8e: "limestone" }],
    cornice: ["limestone"],
  },
  "building-lakeview": {
    shell: ["neutral"],
    "stone and windows": ["glass", { ...windows(0x6e6e6e, 0x3c3c3c), 0x767676: "limestone", 0x888888: "limestone" }],
  },
  // Terracotta over granite columns, round a light court of white brick.
  "building-peoples-gas": {
    shell: ["neutral", { 0x646464: "common brick", 0x9c9c9c: "glazed brick" }],
    "terracotta and windows": ["glass", {
      ...windows(0x6e6e6e, 0x3c3c3c),
      0x242424: "neutral", 0x5a5a5a: "dark granite", 0x7c7c7c: "white terracotta", 0x8e8e8e: "white terracotta", 0x9c9c9c: "glazed brick",
    }],
    cornice: ["white terracotta"],
  },
  // Natural aluminium mullions and blue porcelain-enamelled spandrels.
  "building-200-south-michigan": {
    shell: ["neutral"],
    "curtain wall": ["glass", {
      ...windows(0x7a7a7a, 0x4a4a4a),
      0x2d2d2d: "blue enamel", 0x525252: "aluminium", 0x585858: "aluminium", 0x5e5e5e: "aluminium", 0x6a6a6a: "aluminium",
    }],
    "rooftop block": ["neutral"],
    penthouse: ["neutral"],
  },
  // White terracotta under a green copper roof.
  "building-railway-exchange": {
    shell: ["neutral", { 0x9c9c9c: "copper" }],
    "terracotta and windows": ["glass", { ...windows(0x6e6e6e, 0x3c3c3c), 0x626262: "common brick", 0x808080: "white terracotta", 0x909090: "white terracotta" }],
    cornice: ["white terracotta"],
  },
  // Sullivan's cream terracotta front, and common brick above its neighbours.
  "building-michigan-west-right": {
    shell: ["neutral"],
    "terracotta and windows": ["glass", { ...windows(0x6e6e6e, 0x3a3a3a), 0x404040: "common brick", 0x484848: "white terracotta", 0x5e5e5e: "white terracotta" }],
    cartouches: ["white terracotta"],
  },
  // Red brick fronts with stone bands.
  "building-michigan-west-front": {
    shell: ["neutral"],
    "brick and windows": ["glass", { ...windows(0x6e6e6e, 0x3a3a3a), 0x464646: "brick", 0x525252: "limestone" }],
  },
  "building-30-south-michigan": {
    shell: ["neutral"],
    "brick and windows": ["glass", { ...windows(0x6e6e6e, 0x3a3a3a), 0x464646: "brick", 0x525252: "limestone" }],
  },
  // Limestone, and red and grey brick.
  "building-chicago-athletic-association": {
    shell: ["neutral"],
    "stone, brick and windows": ["glass", { ...windows(0x6e6e6e, 0x3a3a3a), 0x5a5a5a: "brick", 0x6d6d6d: "limestone", 0x7a7a7a: "limestone" }],
    cornice: ["limestone"],
  },
  // Mies's black curtain wall and bronze-tinted glass.
  "building-office-west-of-aon": {
    shell: ["neutral"],
    "curtain wall": ["bronze glass", { ...windows(0x7a7a7a, 0x4a4a4a), 0x2b2b2b: "dark metal", 0x303030: "dark metal", 0x333333: "dark metal" }],
  },
  // White concrete.
  "building-river-plaza": {
    shell: ["concrete"],
    "concrete and windows": ["glass", { ...windows(0x8a8a8a, 0x505050), 0x9a9a9a: "concrete" }],
    "rooftop box": ["concrete"],
  },
  // Dark orange brick and bronze glass.
  "building-hyatt-regency-west-tower": {
    shell: ["neutral"],
    "brick and windows": ["bronze glass", { ...windows(0x6d6d6d, 0x4a4a4a), 0x2c2c2c: "dark metal", 0x3b3b3b: "orange brick" }],
  },
  // Cream precast, and the drums' maroon fins.
  "building-buckingham-east": {
    shell: ["precast", { 0x686868: "neutral" }],
    "precast and windows": ["glass", { ...windows(0x8a8a8a, 0x505050), 0x848484: "precast" }],
    drums: ["precast", { 0x5a5a5a: "maroon", 0x686868: "neutral" }],
  },
  // Dark brown aluminium and bronze glass.
  "building-three-illinois-center": {
    shell: ["neutral"],
    "curtain wall": ["bronze glass", { ...windows(0x707070, 0x464646), 0x282828: "bronze", 0x323232: "bronze" }],
  },
  // Reflective blue-green glass in its frame.
  "building-swissotel": {
    shell: ["neutral"],
    "curtain wall": ["blue-green glass", windows(0x878787, 0x515151)],
  },
};

// A batch's materials from its mesh's name, if the trial knows the building and the batch.
export function batchOf(buildingId: string, meshName: string): Batch | undefined {
  const materials = colourMaterials[buildingId];
  const batch = meshName.split(" · ").at(-1)!;
  return materials?.[batch] ?? materials?.[batch.replace(/ \d+$/, "")];
}

// A grey's tone: the hex the model wrote it as, from its linear channel.
export const toneOf = (grey: number) => new THREE.Color(grey, grey, grey).getHex();

// OKLab from linear sRGB, and back, after Björn Ottosson's matrices.
export function toOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab(lightness: number, a: number, b: number): [number, number, number] {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb: number[]) => rgb.every((channel) => channel >= -1e-7 && channel <= 1 + 1e-7);

// A grey in a material's colour: the grey's own lightness, with the material's hue and chroma,
// less of it where the grey is darker than the material, and less again where sRGB cannot
// show it. A material with no hue leaves the grey exactly as it was.
export function tint(grey: number, material: MaterialName): [number, number, number] {
  const swatch = new THREE.Color(colourPalette[material]);
  const [swatchLightness, a, b] = toOklab(swatch.r, swatch.g, swatch.b);
  if (Math.hypot(a, b) < 1e-4) return [grey, grey, grey];
  const [lightness] = toOklab(grey, grey, grey);
  const at = (scale: number) => fromOklab(lightness, a * scale, b * scale);
  let scale = Math.min(1, lightness / swatchLightness);
  if (!inGamut(at(scale))) {
    let low = 0;
    for (let step = 0; step < 20; step += 1) {
      const middle = (low + scale) / 2;
      if (inGamut(at(middle))) low = middle; else scale = middle;
    }
    scale = low;
  }
  return at(scale).map((channel) => Math.min(1, Math.max(0, channel))) as [number, number, number];
}

export interface SkylineColour {
  /** Whether the buildings show their materials' colours. */
  readonly enabled: boolean;
  /** Shows the colours, or restores the greys exactly. */
  set(enabled: boolean): void;
  /**
   * Recolours vertices another writer has since rewritten in grey, such as window
   * illumination resetting a facade for a celebration.
   */
  refresh(): void;
}

// Vertex-coloured batches keep the greys they held, red channel only since each is a grey,
// while they show colour; single-colour batches keep their material's grey.
interface PaintedBatch {
  attribute: THREE.BufferAttribute;
  array: Float32Array;
  paint(grey: number): Float32Array;
  greys: Float32Array | null;
}
interface FlatBatch {
  material: THREE.MeshToonMaterial;
  grey: THREE.Color;
  colour: THREE.Color;
}

// The colour layer for a skyline's models. A building or batch the trial does not know stays
// in grey, as does a mesh without a single toon material, a vertex-coloured batch whose
// colours are not plain floats, and a material or colour buffer another batch already took,
// since the builder lets batches share them.
export function createSkylineColour(models: readonly BuildingModel[]): SkylineColour {
  const painted: PaintedBatch[] = [], flat: FlatBatch[] = [], taken = new Set<object>();
  for (const model of models) {
    const buildingId = String(model.building.userData["buildingId"]);
    model.building.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const batch = batchOf(buildingId, mesh.name);
      if (!batch) return;
      const [base, tones = {}] = batch;
      if (Array.isArray(mesh.material) || !(mesh.material as THREE.MeshToonMaterial).isMeshToonMaterial) return;
      const material = mesh.material as THREE.MeshToonMaterial;
      const colourOf = (grey: number) => tint(grey, tones[toneOf(grey)] ?? base);
      const attribute = mesh.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
      if (material.vertexColors) {
        if (!(attribute?.array instanceof Float32Array) || taken.has(attribute)) return;
        taken.add(attribute);
        const cache = new Map<number, Float32Array>();
        const paint = (grey: number) => {
          let colour = cache.get(grey);
          if (!colour) cache.set(grey, colour = Float32Array.from(colourOf(grey)));
          return colour;
        };
        painted.push({ attribute, array: attribute.array, paint, greys: null });
      } else if (!taken.has(material)) {
        taken.add(material);
        flat.push({ material, grey: material.color.clone(), colour: new THREE.Color(...colourOf(material.color.r)) });
      }
    });
  }
  let enabled = false;
  return {
    get enabled() { return enabled; },
    set(next) {
      if (next === enabled) return;
      enabled = next;
      for (const batch of painted) {
        const { array } = batch;
        if (next) {
          const greys = batch.greys = new Float32Array(array.length / 3);
          for (let vertex = 0; vertex < greys.length; vertex += 1) {
            const grey = array[vertex * 3]!;
            greys[vertex] = grey;
            array.set(batch.paint(grey), vertex * 3);
          }
        } else {
          batch.greys!.forEach((grey, vertex) => array.fill(grey, vertex * 3, vertex * 3 + 3));
          batch.greys = null;
        }
        batch.attribute.needsUpdate = true;
      }
      for (const { material, grey, colour } of flat) material.color.copy(next ? colour : grey);
    },
    refresh() {
      if (!enabled) return;
      for (const batch of painted) {
        const { array } = batch, greys = batch.greys!;
        let changed = false;
        for (let vertex = 0; vertex < greys.length; vertex += 1) {
          const colour = batch.paint(greys[vertex]!), at = vertex * 3;
          if (array[at] === colour[0] && array[at + 1] === colour[1] && array[at + 2] === colour[2]) continue;
          const grey = array[at]!;
          greys[vertex] = grey;
          array.set(batch.paint(grey), at);
          changed = true;
        }
        if (changed) batch.attribute.needsUpdate = true;
      }
    },
  };
}
