import { describe, expect, test } from "bun:test";
import * as THREE from "../vendor/three-r186.js";
import { celebrations } from "../models/celebrations.js";
import { blueCrossLevels } from "../models/blue-cross-geographic.js";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { createGeographicBuilding } from "../models/skyline-geography.js";

describe("celebratory window lighting", () => {
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
