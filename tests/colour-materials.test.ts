import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { batchOf, colourMaterials, createSkylineColour, tint, toneOf, toOklab } from "../src/models/colour-materials.js";
import type { Batch } from "../src/models/colour-materials.js";
import { colourPalette } from "../src/models/colour-palette.js";
import type { MaterialName } from "../src/models/colour-palette.js";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicBuilding } from "../src/models/skyline-geography.js";

// The colour trial reads the built models; these keep its table in step with them, so a model
// change that renames a batch or retones a surface the table names fails here, not silently.
const models = geographicBuildings.map((record) => createGeographicBuilding(record));
const meshesOf = (model: (typeof models)[number]) => {
  const meshes: THREE.Mesh[] = [];
  model.building.traverse((object) => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
  return meshes;
};
const idOf = (model: (typeof models)[number]) => String(model.building.userData["buildingId"]);
// The tones a mesh holds: its vertex colours' greys, or its material's.
function tonesOf(mesh: THREE.Mesh) {
  const material = mesh.material as THREE.MeshToonMaterial, colours = mesh.geometry.getAttribute("color");
  if (!material.vertexColors) return new Set([toneOf(material.color.r)]);
  const tones = new Set<number>();
  for (let vertex = 0; vertex < colours.count; vertex += 1) tones.add(toneOf(colours.getX(vertex)));
  return tones;
}
const snapshot = () => models.flatMap(meshesOf).map((mesh) => [Array.from(mesh.geometry.getAttribute("color")?.array ?? []), (mesh.material as THREE.MeshToonMaterial).color.getHex()]);

describe("colour trial", () => {
  test("names a material for every batch of every building, and nothing the models lack", () => {
    expect(Object.keys(colourMaterials).sort()).toEqual(models.map(idOf).sort());
    const unmatched: string[] = [], used = new Set<string>();
    for (const model of models) {
      for (const mesh of meshesOf(model)) {
        const batch = batchOf(idOf(model), mesh.name);
        if (!batch) unmatched.push(`${idOf(model)}: ${mesh.name}`);
        else used.add(`${idOf(model)}:${Object.entries(colourMaterials[idOf(model)]!).find(([, entry]) => entry === batch)![0]}`);
      }
    }
    expect(unmatched).toEqual([]);
    // Each batch owns its surface, so recolouring one material never recolours another batch.
    const surfaces = models.flatMap(meshesOf).map((mesh) => mesh.material);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    const unused = Object.entries(colourMaterials).flatMap(([id, batches]) => Object.keys(batches).map((name) => `${id}:${name}`)).filter((key) => !used.has(key));
    expect(unused).toEqual([]);
  });

  test("names only tones its batches hold, and uses every material in the palette", () => {
    // Keyed by each batch entry itself, so two batches with the same materials stay apart.
    const held = new Map<Batch, Set<number>>();
    for (const model of models) {
      for (const mesh of meshesOf(model)) {
        const batch = batchOf(idOf(model), mesh.name)!;
        const tones = held.get(batch) ?? new Set<number>();
        tonesOf(mesh).forEach((tone) => tones.add(tone));
        held.set(batch, tones);
      }
    }
    const stale: string[] = [], materials = new Set<MaterialName>();
    for (const [id, batches] of Object.entries(colourMaterials)) {
      for (const [name, batch] of Object.entries(batches)) {
        const [base, tones = {}] = batch;
        materials.add(base);
        const holds = held.get(batch) ?? new Set<number>();
        for (const [tone, material] of Object.entries(tones)) {
          materials.add(material);
          if (!holds.has(Number(tone))) stale.push(`${id}: ${name} has no tone ${Number(tone).toString(16)}`);
        }
      }
    }
    expect(stale).toEqual([]);
    expect(Object.keys(colourPalette).filter((material) => !materials.has(material as MaterialName))).toEqual([]);
  });

  test("keeps each grey's lightness, and a material with no hue leaves it exactly", () => {
    for (const material of Object.keys(colourPalette) as MaterialName[]) {
      for (const tone of [0x1c, 0x3a, 0x6e, 0xb4, 0xe9]) {
        const grey = new THREE.Color(tone * 0x010101).r;
        const [r, g, b] = tint(grey, material);
        for (const channel of [r, g, b]) expect(channel >= 0 && channel <= 1, `${material} at ${tone.toString(16)} is in sRGB`).toBe(true);
        expect(Math.abs(toOklab(r, g, b)[0] - toOklab(grey, grey, grey)[0]), `${material} at ${tone.toString(16)} keeps its lightness`).toBeLessThan(0.01);
      }
    }
    const grey = new THREE.Color(0x6e6e6e).r;
    expect(tint(grey, "neutral")).toEqual([grey, grey, grey]);
    const [r, g, b] = tint(new THREE.Color(0x808080).r, "white terracotta");
    expect(r > g && g > b, "terracotta is warm").toBe(true);
  });

  test("colours every building, keeps distinct greys distinct, and restores the greys exactly", () => {
    const greys = snapshot();
    const toneCounts = new Map(models.flatMap(meshesOf).map((mesh) => [mesh, tonesOf(mesh).size]));
    const colour = createSkylineColour(models);
    expect(snapshot(), "creating the layer changes nothing").toEqual(greys);
    colour.set(true);
    expect(colour.enabled).toBe(true);
    for (const model of models) {
      const hued = meshesOf(model).some((mesh) => {
        const material = mesh.material as THREE.MeshToonMaterial, colours = mesh.geometry.getAttribute("color");
        if (!material.vertexColors) return material.color.r !== material.color.b;
        for (let vertex = 0; vertex < colours.count; vertex += 1) if (colours.getX(vertex) !== colours.getZ(vertex)) return true;
        return false;
      });
      expect(hued, `${idOf(model)} shows colour`).toBe(true);
      // Two surfaces of a batch that differed in grey still differ in colour, so glass stays
      // apart from the wall around it.
      for (const mesh of meshesOf(model).filter((each) => (each.material as THREE.MeshToonMaterial).vertexColors)) {
        const colours = mesh.geometry.getAttribute("color"), seen = new Set<string>();
        for (let vertex = 0; vertex < colours.count; vertex += 1) seen.add(`${colours.getX(vertex)},${colours.getY(vertex)},${colours.getZ(vertex)}`);
        expect(seen.size, `${mesh.name} keeps its tones apart`).toBe(toneCounts.get(mesh)!);
      }
    }
    colour.set(false);
    expect(snapshot(), "turning colour off restores every grey").toEqual(greys);
  });

  test("recolours a facade that window illumination resets, and restores its lit greys", () => {
    const model = models.find((each) => idOf(each) === "building-blue-cross-blue-shield")!;
    const wall = model.building.getObjectByName("Blue Cross · glass, spandrels and bands") as THREE.Mesh;
    const colours = wall.geometry.getAttribute("color");
    const plain = Array.from(colours.array);
    model.illumination!.set("cubs");
    const lit = Array.from(colours.array);
    model.illumination!.set(null);
    const colour = createSkylineColour([model]);
    colour.set(true);
    const coloured = Array.from(colours.array);
    model.illumination!.set("cubs");
    colour.refresh();
    // The panes the message shades are the vertices illumination changed: those take the
    // colour of their shaded grey, and every other vertex keeps the colour it had.
    let shaded = 0, kept = 0;
    for (let vertex = 0; vertex < colours.count; vertex += 1) {
      const at = vertex * 3, [r, g, b] = [colours.getX(vertex), colours.getY(vertex), colours.getZ(vertex)];
      if (lit[at] !== plain[at]) {
        expect([r, g, b]).toEqual(tint(lit[at]!, "glass").map(Math.fround));
        shaded += 1;
      } else {
        expect([r, g, b]).toEqual(coloured.slice(at, at + 3));
        kept += 1;
      }
    }
    expect(shaded).toBeGreaterThan(0);
    expect(kept).toBeGreaterThan(0);
    colour.set(false);
    expect(Array.from(colours.array), "the celebration's greys return with colour off").toEqual(lit);
    model.illumination!.set(null);
  });
});
