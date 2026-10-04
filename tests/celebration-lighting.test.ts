import { describe, expect, test } from "bun:test";
import * as THREE from "../vendor/three-r186.js";
import { celebrations, crainCelebrations } from "../models/celebrations.js";
import { blueCrossLevels } from "../models/blue-cross-geographic.js";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { createGeographicBuilding, projectGround } from "../models/skyline-geography.js";

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

describe("Crain crown lamps", () => {
  const create = () => createGeographicBuilding(geographicBuildings.find(({ id }) => id === "building-crain-communications")!);
  const glassOf = (model: ReturnType<typeof create>) => model.building.getObjectByName("Crain · sloped glazing") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshToonMaterial>;

  test("geographic crown mullions continue to the perimeter instead of stopping mid-pane", () => {
    const record = geographicBuildings.find(({ id }) => id === "building-crain-communications")!;
    const edges = record.parts.filter((part) => part.roofSlope).flatMap((part) => part.coordinates.map((a, i) => {
      const b = part.coordinates[(i + 1) % part.coordinates.length]!;
      const pa = projectGround(a), pb = projectGround(b);
      return [new THREE.Vector2(pa[0], -pa[1]), new THREE.Vector2(pb[0], -pb[1])] as const;
    }));
    const bars = (create().building.getObjectByName("Crain · glazing grid") as THREE.Mesh).geometry.getAttribute("position");
    let nearEdge = 0, ends = 0;
    // Each closed bar is twelve triangles. Infer its long axis from its top
    // quad, then measure the two end centres against the actual mapped edges.
    for (let i = 0; i < bars.count; i += 36) {
      const corners = Array.from({ length: 6 }, (_, offset) => new THREE.Vector2(bars.getX(i + offset), bars.getZ(i + offset)));
      const a = corners[0]!;
      const chord = corners.reduce((longest, point) => point.distanceTo(a) > longest.distanceTo(a) ? point : longest, a).clone().sub(a).normalize();
      const lo = Math.min(...corners.map((point) => point.dot(chord))), hi = Math.max(...corners.map((point) => point.dot(chord)));
      for (const end of [lo, hi]) {
        const cluster = corners.filter((point) => Math.abs(point.dot(chord) - end) < 0.2);
        const center = cluster.reduce((sum, point) => sum.add(point), new THREE.Vector2()).divideScalar(cluster.length);
        const gap = Math.min(...edges.map(([p, q]) => {
          const edge = q.clone().sub(p), length = edge.lengthSq();
          if (length === 0) return Infinity;
          const t = Math.max(0, Math.min(1, center.clone().sub(p).dot(edge) / length));
          return center.distanceTo(p.clone().addScaledVector(edge, t));
        }));
        if (gap < 0.7) nearEdge += 1;
        ends += 1;
      }
    }
    // Reference photographs show a nearly continuous glass grid up to the
    // edge lights. Exact trim dimensions remain estimated; allow 0.7 m.
    expect(ends).toBeGreaterThan(50);
    expect(nearEdge / ends).toBeGreaterThan(0.85);
  });

  test("GO HAWKS reads across the real southeast roof halves without crossing the slot", () => {
    const model = create(), glass = glassOf(model);
    model.illumination!.set("hawks");
    const texture = glass.material.emissiveMap as THREE.DataTexture;
    const pixels = texture.image.data!, width = texture.image.width, height = texture.image.height;
    const positions = glass.geometry.getAttribute("position"), uv = glass.geometry.getAttribute("uv"), surfaces = glass.geometry.getAttribute("crownSurface");
    const groups: { across: number; y: number }[][] = [[], []];
    for (let texel = 0; texel < pixels.length; texel += 1) {
      if (!pixels[texel]) continue;
      const u = (texel % width + 0.5) / width, v = (Math.floor(texel / width) + 0.5) / height;
      const panel = u < 0.5 ? 1 : 2;
      let found = false;
      for (let i = 0; i < positions.count; i += 3) {
        if (surfaces.getX(i) !== panel) continue;
        const a = new THREE.Vector2(uv.getX(i), uv.getY(i)), b = new THREE.Vector2(uv.getX(i + 1), uv.getY(i + 1)), c = new THREE.Vector2(uv.getX(i + 2), uv.getY(i + 2));
        const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        const wa = ((b.y - c.y) * (u - c.x) + (c.x - b.x) * (v - c.y)) / determinant;
        const wb = ((c.y - a.y) * (u - c.x) + (a.x - c.x) * (v - c.y)) / determinant;
        const weights = [wa, wb, 1 - wa - wb];
        if (weights.some((weight) => weight < -1e-6)) continue;
        const point = new THREE.Vector3();
        weights.forEach((weight, offset) => point.addScaledVector(new THREE.Vector3().fromBufferAttribute(positions, i + offset), weight));
        // Source photographs put the words below the 152.5 m slot floor, on the
        // southeast-facing glass, not the vertical walls or the slot's deck.
        expect(point.y).toBeGreaterThan(148);
        expect(point.y).toBeLessThan(152.5);
        const normal = new THREE.Vector3().fromBufferAttribute(glass.geometry.getAttribute("normal"), i);
        expect(normal.y).toBeGreaterThan(0.6);
        expect(normal.x).toBeGreaterThan(0.5);
        expect(normal.z).toBeGreaterThan(0.5);
        const right = new THREE.Vector3(1, 0, -1).normalize();
        groups[panel - 1]!.push({ across: point.dot(right), y: Math.round(point.y * 1000) / 1000 });
        found = true;
        break;
      }
      expect(found, `lamp ${texel} lies on its actual roof half`).toBe(true);
    }
    const fixtures = [
      ["01111 01110", "10000 10001", "10111 10001", "10001 10001", "01111 01110"],
      ["10001 01110 10001 10001 01111", "10001 10001 10001 10010 10000", "11111 11111 10101 11100 01110", "10001 10001 10101 10010 00001", "10001 10001 01010 10001 11110"],
    ];
    expect(Math.max(...groups[0]!.map((p) => p.across))).toBeLessThan(Math.min(...groups[1]!.map((p) => p.across)));
    groups.forEach((points, side) => {
      const expected = fixtures[side]!.map((row) => row.replaceAll(" ", "0"));
      const levels = [...new Set(points.map((point) => point.y))].sort((a, b) => b - a);
      expect(levels).toHaveLength(5);
      const left = Math.min(...points.map((p) => p.across)), right = Math.max(...points.map((p) => p.across));
      const columns = expected[0]!.length, pitch = (right - left) / (columns - 1);
      levels.forEach((y, row) => {
        const recovered = Array.from({ length: columns }, () => "0");
        points.filter((p) => p.y === y).forEach((p) => { recovered[Math.round((p.across - left) / pitch)] = "1"; });
        expect(recovered.join("")).toBe(expected[row]!);
      });
    });
  });

  test("supports only researched teams, preserves meshes and hover, and owns its lamp map", () => {
    const first = create(), second = create(), glass = glassOf(first);
    const texture = glass.material.emissiveMap as THREE.DataTexture;
    const originalPositions = Array.from(glass.geometry.getAttribute("position").array), children = [...first.building.children];
    expect(first.illumination!.presets.map(({ id }) => id)).toEqual(["cubs", "sox", "bears", "hawks"]);
    const masks = new Set<string>();
    for (const preset of crainCelebrations) {
      first.illumination!.set(preset.id);
      const mask = Array.from(texture.image.data!);
      expect(mask.filter((value) => value > 0).length).toBe(first.illumination!.litWindows);
      expect(first.illumination!.litWindows).toBeGreaterThan(50);
      masks.add(mask.join(","));
      first.setHighlighted(true); first.setWireframe(true); first.setHighlighted(false); first.setWireframe(false);
      expect(Array.from(texture.image.data!)).toEqual(mask);
      expect(first.building.children).toEqual(children);
      expect(Array.from(glass.geometry.getAttribute("position").array)).toEqual(originalPositions);
    }
    expect(masks.size).toBe(4);
    expect(() => first.illumination!.set("bulls")).toThrow("Unsupported Crain celebration");
    expect(first.illumination!.active).toBe("hawks");
    expect(second.illumination!.active).toBeNull();
    expect(glassOf(second).material.emissiveMap).not.toBe(texture);
    first.illumination!.set(null);
    expect(texture.image.data!.every((value) => value === 0)).toBe(true);
    expect(first.illumination!.litWindows).toBe(0);
    expect((first.building.getObjectByName("Crain · slot floor") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshToonMaterial>).material.emissiveMap).toBeNull();
    let disposed = 0;
    texture.addEventListener("dispose", () => { disposed += 1; });
    glass.material.dispose();
    expect(disposed).toBe(1);
  });
});
