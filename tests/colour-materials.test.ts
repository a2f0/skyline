import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as THREE from "../src/vendor/three-r186.js";
import { batchOf, colourMaterials, createDaylight, createSkylineColour, daylightGround, daylightIntensities, exposure, materialNames, paint, swatchesOf, toneOf } from "../src/models/colour-materials.js";
import type { Batch, MaterialName } from "../src/models/colour-materials.js";
import { daylightColours, measuredColours } from "../src/models/colour-palette.js";
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

  test("paints a grey at its brightness against the swatch's, keeping hue past white", () => {
    const swatch = { colour: [0.1, 0.2, 0.3] as const, reference: 0.4 };
    const close = (actual: number[], expected: number[]) => actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 12));
    close(paint(0.4, swatch), [0.1 * exposure, 0.2 * exposure, 0.3 * exposure]);
    close(paint(0.2, swatch), [0.05 * exposure, 0.1 * exposure, 0.15 * exposure]);
    // Past white the colour keeps its proportions, its brightest channel at one.
    close(paint(0.4, { colour: [0.9, 0.6, 0.3] as const, reference: 0.4 }), [1, 2 / 3, 1 / 3]);
    close(paint(0.3, { colour: [0.1, 0.2, 0.3] as const, reference: 0 }), [0.1 * exposure, 0.2 * exposure, 0.3 * exposure]);
  });

  test("measures a material at its most common grey, and lends it to the materials naming it", () => {
    const id = "building-crain-communications", measured = measuredColours[id]!;
    const linear = (hex: number): [number, number, number] => { const { r, g, b } = new THREE.Color(hex); return [r, g, b]; };
    const swatches = swatchesOf(id, new Map<MaterialName, Map<number, number>>([
      // A tie goes to the lighter grey.
      ["aluminium", new Map([[0.2, 10], [0.3, 10], [0.1, 4]])],
      ["lamp", new Map([[0.12, 50]])],
      ["neutral", new Map([[0.05, 30]])],
      ["glass", new Map([[0.4, 1]])],
      ["marble", new Map([[0.6, 9]])],
    ]));
    expect(swatches.get("aluminium")).toEqual({ colour: linear(measured.aluminium as number), reference: 0.3 });
    expect(swatches.get("lamp"), "a material naming another takes its colour and grey").toEqual(swatches.get("aluminium")!);
    expect(swatches.get("glass")).toEqual({ colour: linear(measured.glass as number), reference: 0.4 });
    expect(swatches.get("neutral"), "a null material stays grey").toBeNull();
    expect(swatches.get("marble"), "an unmeasured material stays grey").toBeNull();
    expect(swatchesOf("building-river-plaza", new Map([["marble", new Map([[0.5, 1]])]])).size, "an unsourced building has no swatches").toBe(0);
  });

  test("leaves null materials grey and paints every other in its own or its named material's hue", () => {
    const greysOf = new Map(sourced.flatMap(meshesOf).map((mesh) => [mesh, coloursOf(mesh).map(([grey]) => grey)]));
    const colour = createSkylineColour(sourced);
    colour.set(true);
    try {
      for (const model of sourced) {
        const id = idOf(model), measured = measuredColours[id]!;
        for (const mesh of meshesOf(model)) {
          const [base, tones = {}] = batchOf(id, mesh.name)!, greys = greysOf.get(mesh)!;
          coloursOf(mesh).forEach((rgb, index) => {
            const material = tones[toneOf(greys[index]!)] ?? base, entry = measured[material];
            const source = typeof entry === "string" ? measured[entry] : entry;
            if (typeof source !== "number") {
              expect(rgb, `${id}: ${mesh.name}'s ${material} stays grey`).toEqual([greys[index]!, greys[index]!, greys[index]!]);
              return;
            }
            // The same hue: proportional to the measured colour in linear light.
            const { r, g, b } = new THREE.Color(source), [cr, cg, cb] = rgb, scale = (cr + cg + cb) / (r + g + b);
            [cr - r * scale, cg - g * scale, cb - b * scale].forEach((offset) => expect(Math.abs(offset), `${id}: ${mesh.name}'s ${material} in ${typeof entry === "string" ? entry : material}'s hue`).toBeLessThan(1e-5));
          });
        }
      }
    } finally {
      colour.set(false);
    }
  });

  test("keeps a sourced batch's materials apart in colour", () => {
    // Two greys of one material may meet where both pass white; greys of different materials
    // share a colour only where both stay grey or both measure the same, as the day's windows
    // and glass do.
    const greysOf = new Map(sourced.flatMap(meshesOf).map((mesh) => [mesh, coloursOf(mesh).map(([grey]) => grey)]));
    const colour = createSkylineColour(sourced);
    colour.set(true);
    try {
      for (const model of sourced) {
        for (const mesh of meshesOf(model).filter((each) => toonOf(each).vertexColors)) {
          const [base, tones = {}] = batchOf(idOf(model), mesh.name)!, greys = greysOf.get(mesh)!, measured = measuredColours[idOf(model)]!;
          const materials = new Map<string, Set<MaterialName | number>>();
          coloursOf(mesh).forEach((rgb, vertex) => {
            if (rgb[0] === rgb[1] && rgb[1] === rgb[2]) return;
            const key = rgb.join(), shared = materials.get(key) ?? new Set<MaterialName | number>();
            const material = tones[toneOf(greys[vertex]!)] ?? base, entry = measured[material];
            // A material measured with another's colour counts as that colour.
            shared.add(typeof entry === "number" ? entry : material);
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
    // That colour is the glass's, the batch's material, at the shades' grey: a glass vertex's
    // colour scaled by the shades' grey against its own, none of them near white.
    const [base, tones = {}] = batchOf(idOf(model), wall.name)!;
    const glass = plain.findIndex((grey, index) => index % 3 === 0 && (tones[toneOf(grey)] ?? base) === "glass");
    const shade = lit.find((grey, index) => index % 3 === 0 && grey !== plain[index])!;
    const expected = coloured.slice(glass, glass + 3).map((channel) => channel * shade / plain[glass]!);
    [...shaded][0]!.split(",").map(Number).forEach((channel, index) => expect(channel).toBeCloseTo(expected[index]!, 6));
    expect(kept).toBeGreaterThan(0);
    colour.set(false);
    expect(Array.from(colours.array), "the celebration's greys return with colour off").toEqual(lit);
    model.illumination!.set(null);
  });

  test("makes the sunny day's sky from the haze at the horizon to the blue overhead", () => {
    const day = createDaylight(), { data, width, height } = day.sky.image as { data: Uint8Array; width: number; height: number };
    const row = (index: number) => (data[index * 4]! << 16) | (data[index * 4 + 1]! << 8) | data[index * 4 + 2]!;
    expect([width, height]).toEqual([1, 256]);
    // A texture's first row is its bottom, the horizon.
    expect([row(0), row(height - 1)]).toEqual([daylightColours.horizon, daylightColours.sky]);
    expect(day.sky.colorSpace).toBe("srgb");
    expect(day.sun).toEqual([daylightColours.sun, daylightIntensities.sun]);
    expect(day.ambient).toEqual([daylightColours.sky, daylightIntensities.ambient]);
    expect(day.fill).toEqual([daylightColours.horizon, daylightIntensities.fill]);
    expect(day.ground).toBe(daylightGround.blocks);
  });

  test("records each measured colour in its building's audit, and the sky's in the viewer's notes", () => {
    // The audit, and its dated entry, each sourced building's daytime colours come from.
    const audits: Record<string, [file: string, entry: string]> = {
      "building-railway-exchange": ["railway-exchange", "FID-COL-003"],
      "building-crain-communications": ["crain", "FID-COL-003"],
      "building-one-prudential-plaza": ["one-prudential", "FID-COL-003"],
      "building-two-prudential-plaza": ["two-prudential", "FID-COL-003"],
      layer3: ["aon", "FID-COL-003"],
      "building-blue-cross-blue-shield": ["blue-cross", "FID-COL-003"],
      "building-willoughby-tower": ["willoughby-tower", "FID-COL-004"],
      "building-heritage-at-millennium-park": ["heritage-geographic", "FID-COL-004"],
      "building-kemper": ["kemper-geographic", "FID-COL-004"],
      "building-330-north-wabash": ["north-wabash", "FID-COL-004"],
      "building-michigan-plaza-front-tall": ["millennium-park-plaza", "FID-COL-004"],
      "building-trump-tower-only": ["trump", "FID-COL-004"],
      "building-340-on-the-park": ["340-on-the-park", "FID-COL-004"],
      "building-200-south-michigan": ["borg-warner", "FID-COL-005"],
      "building-peoples-gas": ["peoples-gas", "FID-COL-005"],
      "building-lakeview": ["lake-view", "FID-COL-005"],
      "building-maclean-center": ["maclean-center", "FID-COL-005"],
      "building-monroe": ["monroe", "FID-COL-005"],
      "building-university-club": ["university-club", "FID-COL-005"],
      "building-six-north-michigan": ["six-north-michigan", "FID-COL-005"],
      "building-six-north-far-east": ["michigan-boulevard", "FID-COL-005"],
      "building-the-buckingham": ["buckingham", "FID-COL-006"],
      "building-buckingham-east": ["sheraton-grand", "FID-COL-006"],
      "building-swissotel": ["swissotel", "FID-COL-006"],
      "building-michigan-plaza-front-middle": ["north-michigan-180", "FID-COL-006"],
      "building-chicago-athletic-association": ["chicago-athletic-association", "FID-COL-006"],
      "building-michigan-west-right": ["gage", "FID-COL-006"],
      "building-michigan-west-front": ["keith-ascher", "FID-COL-006"],
      "building-30-south-michigan": ["keith-ascher", "FID-COL-006"],
      "building-hyatt-regency-west-tower": ["hyatt-west-tower", "FID-COL-006"],
    };
    expect(Object.keys(audits).sort()).toEqual(Object.keys(measuredColours).sort());
    const read = (file: string) => readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8").replace(/\s+/g, " ");
    const rgb = (hex: number) => [hex >> 16, (hex >> 8) & 255, hex & 255].join(", ");
    for (const [id, measured] of Object.entries(measuredColours)) {
      // The entry is titled by its source: Chicago.jpg, or a close-up calibrated to it.
      const [file, label] = audits[id]!, audit = read(`${file}-reference.md`), start = audit.search(new RegExp(`Daytime colours from (?:Chicago\\.jpg|a close-up calibrated to Chicago\\.jpg) \\(${label}\\)`));
      expect(start, `${id}'s audit has the daytime entry`).toBeGreaterThan(-1);
      const entry = audit.slice(start);
      // Each value is in the entry's decisions under a material measured at it; the day's windows
      // share the glass's.
      for (const [material, value] of Object.entries(measured)) {
        if (typeof value !== "number") continue;
        const recorded = Object.entries(measured).filter(([, other]) => other === value).some(([name]) => entry.includes(`\`${name}\` \`${rgb(value)}\``));
        expect(recorded, `${id}: ${material} ${rgb(value)} is in its audit`).toBe(true);
      }
    }
    const notes = read("viewer.md");
    for (const hex of [daylightColours.sky, daylightColours.horizon]) expect(notes).toContain(`\`${rgb(hex)}\``);
  });
});
