import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { batchOf, colourMaterials, createSkylineColour, exposure, materialNames, toneOf } from "../src/models/colour-materials.js";
import type { Batch, MaterialName } from "../src/models/colour-materials.js";
import { measuredColours } from "../src/models/colour-palette.js";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicBuilding } from "../src/models/skyline-geography.js";

// The colour trial reads the built models; these keep its table in step with them, so a model
// change that renames a batch or retones a surface the table names fails here, not silently.
const models = geographicBuildings.map((record) => createGeographicBuilding(record));
type Model = (typeof models)[number];
const meshesOf = (model: Model) => {
  const meshes: THREE.Mesh[] = [];
  model.building.traverse((object) => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
  return meshes;
};
const idOf = (model: Model) => String(model.building.userData["buildingId"]);
const toonOf = (mesh: THREE.Mesh) => mesh.material as THREE.MeshToonMaterial;
// The tones a mesh holds: its vertex colours' greys, or its material's.
function tonesOf(mesh: THREE.Mesh) {
  const colours = mesh.geometry.getAttribute("color");
  if (!toonOf(mesh).vertexColors) return new Set([toneOf(toonOf(mesh).color.r)]);
  const tones = new Set<number>();
  for (let vertex = 0; vertex < colours.count; vertex += 1) tones.add(toneOf(colours.getX(vertex)));
  return tones;
}
// Every colour a mesh shows: one per vertex, or its material's.
function coloursOf(mesh: THREE.Mesh): [number, number, number][] {
  const colours = mesh.geometry.getAttribute("color");
  if (!toonOf(mesh).vertexColors) return [[toonOf(mesh).color.r, toonOf(mesh).color.g, toonOf(mesh).color.b]];
  return Array.from({ length: colours.count }, (_, vertex) => [colours.getX(vertex), colours.getY(vertex), colours.getZ(vertex)]);
}
const snapshotOf = (chosen: readonly Model[]) => chosen.flatMap(meshesOf).map((mesh) => [Array.from(mesh.geometry.getAttribute("color")?.array ?? []), toonOf(mesh).color.getHex()]);
// The materials a building's table names, by batch default and tone.
const materialsOf = (id: string) => new Set(Object.values(colourMaterials[id]!).flatMap(([base, tones = {}]) => [base, ...Object.values(tones)]));
const sourced = models.filter((model) => measuredColours[idOf(model)]);

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

  test("names only tones its batches hold, and every material name it lists", () => {
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
    const stale: string[] = [];
    for (const [id, batches] of Object.entries(colourMaterials)) {
      for (const [name, batch] of Object.entries(batches)) {
        const holds = held.get(batch) ?? new Set<number>();
        for (const tone of Object.keys(batch[1] ?? {})) if (!holds.has(Number(tone))) stale.push(`${id}: ${name} has no tone ${Number(tone).toString(16)}`);
      }
    }
    expect(stale).toEqual([]);
    const named = new Set(Object.keys(colourMaterials).flatMap((id) => [...materialsOf(id)]));
    expect(materialNames.filter((material) => !named.has(material))).toEqual([]);
  });

  test("measures every material its sourced buildings use, and only those", () => {
    expect(sourced.length).toBeGreaterThan(0);
    for (const [id, measured] of Object.entries(measuredColours)) {
      expect(colourMaterials[id], `${id} is a building the table knows`).toBeDefined();
      const uses = materialsOf(id), entries = measured as Partial<Record<MaterialName, unknown>>;
      expect([...uses].filter((material) => !(material in entries)), `${id} measures every material it uses`).toEqual([]);
      expect(Object.keys(entries).filter((material) => !uses.has(material as MaterialName)), `${id} measures nothing it lacks`).toEqual([]);
      // A material naming another takes a measured colour of the same building.
      for (const [material, entry] of Object.entries(entries)) {
        if (typeof entry === "string") expect(typeof entries[entry as MaterialName], `${id}: ${material} names a measured colour`).toBe("number");
      }
    }
  });

  test("paints each measured material's most common grey in its measured colour, and leaves the rest of the skyline grey", () => {
    const unsourced = models.filter((model) => !measuredColours[idOf(model)]);
    const greys = snapshotOf(models), unsourcedGreys = snapshotOf(unsourced);
    const colour = createSkylineColour(models);
    expect(snapshotOf(models), "creating the layer changes nothing").toEqual(greys);
    colour.set(true);
    expect(colour.enabled).toBe(true);
    expect(snapshotOf(unsourced), "unsourced buildings stay grey").toEqual(unsourcedGreys);
    for (const model of sourced) {
      const id = idOf(model), shown = meshesOf(model).flatMap(coloursOf);
      for (const [material, entry] of Object.entries(measuredColours[id]!)) {
        if (typeof entry !== "number") continue;
        // The measured colour at the scene's exposure, kept in hue where it passes white.
        const { r, g, b } = new THREE.Color(entry);
        const scaled = [r, g, b].map((channel) => channel * exposure), brightest = Math.max(...scaled);
        const expected = scaled.map((channel) => Math.fround(brightest > 1 ? channel / brightest : channel));
        const found = shown.some((rgb) => rgb.every((channel, index) => Math.abs(Math.fround(channel) - expected[index]!) < 1e-6));
        expect(found, `${id} shows its measured ${material}`).toBe(true);
      }
      expect(shown.some(([red, , blue]) => red !== blue), `${id} shows colour`).toBe(true);
    }
    colour.set(false);
    expect(snapshotOf(models), "turning colour off restores every grey").toEqual(greys);
  });

  test("keeps a sourced batch's materials apart in colour", () => {
    // Two greys of one material may meet where both pass white, as lit windows do; greys of
    // different materials never share a colour unless both stay grey.
    const greysOf = new Map(sourced.flatMap(meshesOf).map((mesh) => [mesh, coloursOf(mesh).map(([grey]) => grey)]));
    const colour = createSkylineColour(sourced);
    colour.set(true);
    try {
      for (const model of sourced) {
        for (const mesh of meshesOf(model).filter((each) => toonOf(each).vertexColors)) {
          const [base, tones = {}] = batchOf(idOf(model), mesh.name)!, greys = greysOf.get(mesh)!;
          const materials = new Map<string, Set<MaterialName>>();
          coloursOf(mesh).forEach((rgb, vertex) => {
            if (rgb[0] === rgb[1] && rgb[1] === rgb[2]) return;
            const key = rgb.join(), shared = materials.get(key) ?? new Set<MaterialName>();
            shared.add(tones[toneOf(greys[vertex]!)] ?? base);
            materials.set(key, shared);
          });
          const mixed = [...materials.values()].filter((shared) => shared.size > 1).map((shared) => [...shared].join(" and "));
          expect(mixed, `${mesh.name} keeps its materials apart`).toEqual([]);
        }
      }
    } finally {
      colour.set(false);
    }
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
    // The panes the message shades are the vertices illumination changed: refresh paints them
    // all one colour, not grey, and every other vertex keeps the colour it had.
    const shaded = new Set<string>();
    let kept = 0;
    for (let vertex = 0; vertex < colours.count; vertex += 1) {
      const at = vertex * 3, rgb = [colours.getX(vertex), colours.getY(vertex), colours.getZ(vertex)];
      if (lit[at] !== plain[at]) shaded.add(rgb.join());
      else {
        expect(rgb).toEqual(coloured.slice(at, at + 3));
        kept += 1;
      }
    }
    expect(shaded.size, "the shaded panes share one colour").toBe(1);
    const [red, , blue] = [...shaded][0]!.split(",").map(Number);
    expect(red !== blue, "the shaded panes are painted, not left grey").toBe(true);
    expect(kept).toBeGreaterThan(0);
    colour.set(false);
    expect(Array.from(colours.array), "the celebration's greys return with colour off").toEqual(lit);
    model.illumination!.set(null);
  });
});
