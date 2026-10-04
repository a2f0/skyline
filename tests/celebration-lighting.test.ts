import { describe, expect, test } from "bun:test";
import * as THREE from "../vendor/three-r186.js";
import { celebrations } from "../models/celebrations.js";
import { blueCrossLevels } from "../models/blue-cross-geographic.js";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { createGeographicBuilding } from "../models/skyline-geography.js";

describe("celebratory window lighting", () => {
  test("the lower word of SOX PRIDE reads left to right on the physical south facade", () => {
    const model = createGeographicBuilding(geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!);
    model.illumination!.set("sox");
    const geometry = (model.building.getObjectByName("Blue Cross · glass, spandrels and bands") as THREE.Mesh).geometry;
    const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
    const colors = geometry.getAttribute("color"), light = geometry.getAttribute("windowLight");
    const panes: { west: number; east: number; y: number; lit: boolean }[] = [];
    for (let vertex = 0; vertex < positions.count; vertex += 6) {
      if (normals.getZ(vertex) < 0.9 || Math.abs(colors.getX(vertex) - 0.018) > 1e-6) continue;
      const xs = Array.from({ length: 6 }, (_, offset) => positions.getX(vertex + offset));
      const ys = Array.from({ length: 6 }, (_, offset) => positions.getY(vertex + offset));
      panes.push({ west: Math.min(...xs), east: Math.max(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2, lit: light.getX(vertex) > 0 });
    }
    const west = Math.min(...panes.map((pane) => pane.west)), east = Math.max(...panes.map((pane) => pane.east));
    const columns = Math.round((east - west) / blueCrossLevels.module), pitch = (east - west) / columns;
    const lit = panes.filter((pane) => pane.lit);
    const allLevels = [...new Set(lit.map((pane) => pane.y))].sort((a, b) => b - a);
    expect(allLevels.length).toBe(10);
    const levels = allLevels.slice(5);
    // Independent readable fixture, recovered from real x/y positions rather
    // than the controller's logical column/floor addressing.
    const expected = [
      "11110 11110 11111 11110 11111",
      "10001 10001 00100 10001 10000",
      "11110 11110 00100 10001 11110",
      "10000 10010 00100 10001 10000",
      "10000 10001 11111 11110 11111",
    ].map((row) => row.replaceAll(" ", "0"));
    const left = Math.floor((columns - expected[0]!.length) / 2);
    levels.forEach((height, row) => {
      const pixels = Array.from({ length: columns }, () => "0");
      lit.filter((pane) => pane.y === height).forEach((pane) => { pixels[Math.floor(((pane.west + pane.east) / 2 - west) / pitch)] = "1"; });
      expect(pixels.join("")).toBe("0".repeat(left) + expected[row]! + "0".repeat(columns - left - expected[row]!.length));
    });
  });

  test("lights only real south office panes, retains geometry, and restores every color", () => {
    const model = createGeographicBuilding(geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!);
    const wall = model.building.getObjectByName("Blue Cross · glass, spandrels and bands") as THREE.Mesh;
    const geometry = wall.geometry, colors = geometry.getAttribute("color"), emission = geometry.getAttribute("windowLight");
    const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
    const originalColors = Array.from(colors.array), originalPositions = Array.from(positions.array);
    const children = [...model.building.children];
    const masks = new Set<string>();
    expect(model.illumination!.active).toBeNull();
    for (const preset of celebrations) {
      model.illumination!.set(preset.id);
      const lit: number[] = [];
      for (let i = 0; i < emission.count; i += 1) {
        if (emission.getX(i) === 0) continue;
        lit.push(i);
        expect(normals.getZ(i)).toBeGreaterThan(0.9);
        const height = positions.getY(i);
        expect(height).toBeGreaterThan(blueCrossLevels.lobbyTop);
        expect(height).toBeLessThan(blueCrossLevels.roof);
        expect(blueCrossLevels.bands.some(([lo, hi]) => height >= lo && height <= hi)).toBe(false);
      }
      expect(lit.length).toBeGreaterThan(200);
      // A pane crossing a traced facade joint has two triangle pairs.
      expect(lit.length).toBeGreaterThanOrEqual(model.illumination!.litWindows * 6);
      masks.add(lit.join(","));
      const beforeHover = Array.from(emission.array);
      model.setHighlighted(true);
      model.setWireframe(true);
      model.setHighlighted(false);
      model.setWireframe(false);
      expect(Array.from(emission.array)).toEqual(beforeHover);
      expect(Array.from(positions.array)).toEqual(originalPositions);
      expect(model.building.children).toEqual(children);
      model.illumination!.set(null);
      expect(Array.from(colors.array)).toEqual(originalColors);
      expect(Array.from(emission.array).every((v) => v === 0)).toBe(true);
      expect(model.illumination!.litWindows).toBe(0);
    }
    expect(masks.size).toBe(celebrations.length);
  });

  test("independent scene instances do not share lighting state", () => {
    const record = geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!;
    const first = createGeographicBuilding(record), second = createGeographicBuilding(record);
    first.illumination!.set("cubs");
    expect(second.illumination!.active).toBeNull();
    second.illumination!.set("bears");
    expect(first.illumination!.active).toBe("cubs");
  });
});
