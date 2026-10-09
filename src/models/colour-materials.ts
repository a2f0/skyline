import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel } from "./building-kit.js";
import { measuredColours } from "./colour-palette.js";

// The colour trial (https://github.com/a2f0/skyline/issues/115): which named material each
// surface of each building is, and a layer that shows the colours measured for those materials
// (colour-palette.ts) over the greys the models build in, restoring the greys exactly when it is
// turned off. The models are unchanged; this reads a built model's meshes by its building ID
// and each mesh's batch, the part of its name after the last " · ", or that without a trailing
// number, so "glazing 3" reads as "glazing". A surface is its batch's material unless its grey
// names another.
export const materialNames = [
  "neutral", "glass", "green glass", "blue-green glass", "bronze glass", "lit window", "dim window", "lamp",
  "limestone", "marble", "white granite", "granite", "dark granite", "slate",
  "white terracotta", "pink terracotta", "green tile", "brick", "common brick", "orange brick", "brown brick", "buff brick", "glazed brick",
  "concrete", "precast", "copper", "maroon", "blue enamel", "bronze", "dark metal", "aluminium", "stainless",
  // What the night photograph shows on its own: lit crown glass and crown lights, an emblem
  // screen and the lights in its bands, a sign's board and letters, and a lit cap.
  "crown glass", "crown lights", "screen", "band lights", "sign board", "sign letters", "cap lights",
] as const;
export type MaterialName = (typeof materialNames)[number];
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
    "sloped glazing": ["crown glass"],
    "glazing grid": ["crown glass"],
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
  // Limestone piers and aluminium spandrels, under the sign's board and letters.
  "building-one-prudential-plaza": {
    shell: ["limestone", { 0x242424: "dark metal", 0x4c4c4c: "neutral", 0x8e8e8e: "aluminium" }],
    "windows and spandrels": ["glass", { ...windows(0x7c7c7c, 0x4e4e4e), 0x8a8a8a: "lit window", 0x242424: "dark metal", 0x8e8e8e: "aluminium" }],
    "limestone piers": ["limestone"],
    "limestone courses": ["limestone"],
    "penthouse and sign": ["limestone", { 0x2e2e2e: "sign board", 0x383838: "dark metal", 0x4c4c4c: "neutral", 0xb0b0b0: "sign letters", 0xc4c4c4: "sign letters" }],
    "screen louvers": ["aluminium"],
    "antenna mast": ["stainless"],
  },
  // Stone faces and gables, and the dark glass strips between them; the crown's risers and
  // sloped glass, and the white bands and ribs on its ridges.
  "building-two-prudential-plaza": {
    "limestone, glass and crown": ["granite", {
      0x353535: "glass", 0x3a3a3a: "glass", 0x404040: "glass", 0x454545: "glass", 0x4a4a4a: "glass",
      0x3f3f3f: "crown glass", 0x565656: "crown glass", 0xcdcdcd: "crown lights",
      ...windows(0x8e8e8e, 0x5e5e5e),
    }],
    piers: ["granite"],
    copings: ["granite"],
    "strip mullions": ["aluminium"],
    "crown ribs": ["crown lights"],
    spire: ["stainless"],
    "spire inset panels": ["glass"],
    lobby: ["glass"],
  },
  // Mount Airy white granite.
  layer3: {
    "tube shell": ["white granite", { 0x202020: "neutral", 0x4c4c4c: "neutral" }],
    "window ribbons": ["glass", windows(0x7c7c7c, 0x4e4e4e)],
    "granite piers": ["white granite"],
    "granite cap": ["cap lights"],
    "rooftop enclosure": ["neutral", { 0x9c9c9c: "aluminium" }],
    "antenna mast": ["stainless"],
  },
  "building-blue-cross-blue-shield": {
    shell: ["glass", { 0x3a3a3a: "neutral" }],
    "glass, spandrels and bands": ["glass", { ...windows(0x8a8a8a, 0x5c5c5c), 0x2a2a2a: "neutral", 0x3e3e3e: "screen" }],
    mullions: ["dark metal"],
    "band columns and emblems": ["band lights"],
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

// The measured colours scale to the scene by this factor in linear light, so the skyline view's
// faces show the photograph's brightness. The toon lights render a colour's front faces at
// 0.36 (Railway Exchange), 0.62 (Aon), 0.46 (One Prudential) and 0.45 (Crain) of the measured
// colours in linear light, medians of the skyline view's 1600 x 900 render against the
// photograph's; their geometric mean, 0.46, gives this factor, rounded down.
export const exposure = 2.1;

// A measured colour in linear light, and the grey it is measured at: the most common grey of
// its material in the building.
export interface Swatch {
  colour: readonly [number, number, number];
  reference: number;
}

// A grey in its measured colour: the swatch's colour scaled by the grey's brightness against the
// swatch's grey, both in linear light, so the model's lighter and darker surfaces of one
// material stay lighter and darker. A colour pushed past white keeps its hue.
export function paint(grey: number, { colour, reference }: Swatch): [number, number, number] {
  const scale = exposure * (reference > 0 ? grey / reference : 1);
  const scaled = colour.map((channel) => channel * scale) as [number, number, number];
  const brightest = Math.max(...scaled);
  return brightest > 1 ? scaled.map((channel) => channel / brightest) as [number, number, number] : scaled;
}

// Every measured material's swatch for a building, from how many vertices of each linear grey
// its surfaces hold: a material naming another takes that one's colour and grey, and a null one
// stays grey.
export function swatchesOf(buildingId: string, greys: ReadonlyMap<MaterialName, ReadonlyMap<number, number>>): Map<MaterialName, Swatch | null> {
  const measured = measuredColours[buildingId];
  const swatches = new Map<MaterialName, Swatch | null>();
  if (!measured) return swatches;
  // The most common grey of a material, by vertices; the lighter of a tie.
  const common = (material: MaterialName) => [...greys.get(material) ?? []].reduce<[number, number] | null>((best, entry) => !best || entry[1] > best[1] || (entry[1] === best[1] && entry[0] > best[0]) ? entry : best, null)?.[0];
  for (const material of greys.keys()) {
    const entry = measured[material];
    const source = typeof entry === "string" ? entry : material;
    const value = typeof entry === "string" ? measured[entry] : entry;
    const reference = common(source);
    if (typeof value !== "number" || reference === undefined) {
      swatches.set(material, null);
      continue;
    }
    const { r, g, b } = new THREE.Color(value);
    swatches.set(material, { colour: [r, g, b], reference });
  }
  return swatches;
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
// while they show colour; single-colour batches keep their material's grey from when the layer
// was made, so nothing else may write those materials' colours while colour shows.
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

// The colour layer for a skyline's models. A building the trial has no colours for stays in
// grey, as does a batch it does not know, a mesh without a single toon material, a
// vertex-coloured batch whose colours are not plain floats, and a material or colour buffer
// another batch already took, since the builder lets batches share them.
export function createSkylineColour(models: readonly BuildingModel[]): SkylineColour {
  const painted: PaintedBatch[] = [], flat: FlatBatch[] = [], taken = new Set<object>();
  for (const model of models) {
    const buildingId = String(model.building.userData["buildingId"]);
    if (!measuredColours[buildingId]) continue;
    // The building's batches, and how many vertices of each grey each material holds.
    const surfaces: { material: THREE.MeshToonMaterial; attribute: THREE.BufferAttribute | null; materialOf(grey: number): MaterialName }[] = [];
    const greys = new Map<MaterialName, Map<number, number>>();
    const count = (material: MaterialName, grey: number, vertices: number) => {
      const held = greys.get(material) ?? new Map<number, number>();
      held.set(grey, (held.get(grey) ?? 0) + vertices);
      greys.set(material, held);
    };
    model.building.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const batch = batchOf(buildingId, mesh.name);
      if (!batch || Array.isArray(mesh.material) || !(mesh.material as THREE.MeshToonMaterial).isMeshToonMaterial) return;
      const [base, tones = {}] = batch;
      const material = mesh.material as THREE.MeshToonMaterial;
      const materialOf = (grey: number) => tones[toneOf(grey)] ?? base;
      const attribute = mesh.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
      if (material.vertexColors) {
        if (!(attribute?.array instanceof Float32Array) || taken.has(attribute)) return;
        taken.add(attribute);
        const vertices = new Map<number, number>();
        for (let vertex = 0; vertex < attribute.count; vertex += 1) vertices.set(attribute.array[vertex * 3]!, (vertices.get(attribute.array[vertex * 3]!) ?? 0) + 1);
        vertices.forEach((n, grey) => count(materialOf(grey), grey, n));
        surfaces.push({ material, attribute, materialOf });
      } else if (!taken.has(material)) {
        taken.add(material);
        count(materialOf(material.color.r), material.color.r, mesh.geometry.getAttribute("position").count);
        surfaces.push({ material, attribute: null, materialOf });
      }
    });
    const swatches = swatchesOf(buildingId, greys);
    for (const { material, attribute, materialOf } of surfaces) {
      const colourOf = (grey: number): [number, number, number] => {
        const swatch = swatches.get(materialOf(grey));
        return swatch ? paint(grey, swatch) : [grey, grey, grey];
      };
      if (attribute) {
        const cache = new Map<number, Float32Array>();
        const paintGrey = (grey: number) => {
          let colour = cache.get(grey);
          if (!colour) cache.set(grey, colour = Float32Array.from(colourOf(grey)));
          return colour;
        };
        painted.push({ attribute, array: attribute.array as Float32Array, paint: paintGrey, greys: null });
      } else {
        flat.push({ material, grey: material.color.clone(), colour: new THREE.Color(...colourOf(material.color.r)) });
      }
    }
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
