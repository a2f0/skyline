import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "../models/building-kit.js";
import { geographicBuildings, geographicStreets } from "../models/skyline-geography-data.js";
import { projectGround, footprintMetrics, createGeographicBuilding } from "../models/skyline-geography.js";
import { floorLevel, onePrudentialLevels, wallStations } from "../models/one-prudential-tower.js";
import { trumpSpire } from "../models/trump-geographic.js";
import { trumpLevels } from "../models/trump-tower.js";
import { northWabashFloors } from "../models/north-wabash-geographic.js";
import { crain, geographicLandmarks } from "./skyline-landmarks.js";
import { viewports } from "./study-fidelity.js";


const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a: number, b: number, tolerance: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);

// In the ground plan, every mapped footprint projects inside the canvas, and its centre
// inside the band where the viewer shows a building's label.
async function expectPlanHolds(page: Page) {
  const footprints = geographicBuildings.map((record) => {
    const { center } = footprintMetrics(record.footprint.coordinates);
    const points = record.footprint.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, 0, -north]; });
    return { id: record.id, points, centre: [center[0], 0, -center[1]] };
  });
  const projected = await page.evaluate((all) => all.map(({ id, points, centre }) => ({
    id, points: points.map((p) => window.__buildingStudy!.projectPoint(id, p)), centre: window.__buildingStudy!.projectPoint(id, centre),
  })), footprints);
  for (const { id, points, centre } of projected) {
    expect(points.every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1), `${id} inside the plan`).toBe(true);
    expect(Math.abs(centre[0] * 2 - 1) < 0.95 && Math.abs(centre[1] * 2 - 1) < 0.95, `${id}'s label inside the plan`).toBe(true);
  }
  // Every building's label shows, whole, inside the layer that would otherwise cut it.
  const labels = await page.evaluate(() => {
    const layer = document.querySelector(".study-annotations")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(".study-annotations span")].filter((label) => !label.hidden).map((label) => {
      const box = label.getBoundingClientRect();
      return { text: label.textContent, whole: box.left >= layer.left - 0.5 && box.right <= layer.right + 0.5 && box.top >= layer.top - 0.5 && box.bottom <= layer.bottom + 0.5 };
    });
  });
  expect(labels.length).toBe(geographicBuildings.length);
  expect(labels.filter((label) => !label.whole).map((label) => label.text), "labels cut by the plan's edge").toEqual([]);
}

describe("mapped skyline geography", () => {
  const models: Record<string, BuildingModel> = {};
  beforeAll(() => {
    for (const record of geographicBuildings) models[record.shortName] = createGeographicBuilding(record);
  }, { timeout: 180_000 });

  test("anchors the skyline camera's landmarks on the mapped geometry", () => {
    // The camera fit and its browser check project these coordinates, not the
    // meshes, so each must stay on an edge of its model: a tip, eave, roof corner,
    // or roof shoulder that moves with the geometry fails here.
    for (const [name, id, point] of geographicLandmarks) {
      const model = models[geographicBuildings.find((record) => record.id === id)!.shortName]!;
      model.building.updateMatrixWorld(true);
      let nearest = Infinity;
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      model.building.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const position = mesh.geometry.getAttribute("position");
        for (let i = 0; i < position.count; i += 3) {
          for (const [s, e] of [[i, i + 1], [i + 1, i + 2], [i + 2, i]] as [number, number][]) {
            a.fromBufferAttribute(position, s).applyMatrix4(mesh.matrixWorld);
            b.fromBufferAttribute(position, e).applyMatrix4(mesh.matrixWorld);
            const d = b.clone().sub(a), w = new THREE.Vector3(...point).sub(a);
            const t = Math.max(0, Math.min(1, w.dot(d) / (d.lengthSq() || 1)));
            nearest = Math.min(nearest, w.sub(d.multiplyScalar(t)).length());
          }
        }
      });
      expect(nearest, `${name} lies on its mapped model`).toBeLessThan(0.1);
    }
  }, { timeout: 180_000 });

  test("projects ground coordinates from the tangent-plane origin", () => {
    // Independent geographic anchors catch swapped coordinates, reversed north,
    // degrees-as-meters, and the temptation to retain the drawing's tower order.
    near(projectGround([-87.62497155, 41.88582645])[1], 111.07, 0.02);
    near(projectGround([-87.62397155, 41.88482645])[0], 83.0, 0.02);
  }, { timeout: 180_000 });

  test("places each mapped building with closed geometry and its published height", () => {
    const expected: Record<string, Vec3> = {
      Heritage: [-65.7, -91.7, 192.4], Kemper: [-204, 188.9, 159], Crain: [0, 0, 177.4],
      "Michigan Plaza S": [117.1, 139, 168.6], "330 N Wabash": [-217.8, 425.2, 211.84], Trump: [-123.3, 449.4, 423.2],
      "One Prudential": [152, 11.1, 278], "Two Prudential": [186.9, 65.7, 303.3], Aon: [284.2, 50.6, 362.5],
      "Blue Cross": [420.1, 5.7, 226.7], "340 on the Park": [511.75, -3.64, 204.9], Buckingham: [582.28, -1.52, 121.9],
      "Millennium Park Plaza": [68.57, 46.33, 121.9],
    };
    expect(geographicBuildings.length).toBe(13);
    for (const record of geographicBuildings) {
      const metrics = footprintMetrics(record.footprint.coordinates);
      const [east, north, height] = expected[record.shortName]!;
      near(metrics.center[0], east, 0.1);
      near(metrics.center[1], north, 0.1);
      expect(metrics.area > 500 && metrics.area < 10000, `${record.shortName} plausible footprint area`).toBe(true);
      const model = models[record.shortName]!;
      const bounds: { min: Vec3; max: Vec3 } = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      const groundBounds: { min: Vec2; max: Vec2 } = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
      model.building.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const position = mesh.geometry.getAttribute("position"), edges = new Map<string, number>();
        const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((n) => n.toFixed(3)).join(",");
        for (let i = 0; i < position.count; i += 1) {
          // Facade relief and balconies can project above the mapped ground
          // outline. Only vertices at grade determine street-level coverage.
          if (position.getY(i) < 0.2) [position.getX(i), position.getZ(i)].forEach((n, axis) => {
            groundBounds.min[axis] = Math.min(groundBounds.min[axis]!, n);
            groundBounds.max[axis] = Math.max(groundBounds.max[axis]!, n);
          });
          [position.getX(i), position.getY(i), position.getZ(i)].forEach((n, axis) => {
            expect(Number.isFinite(n), `${record.shortName} finite vertex`).toBe(true);
            bounds.min[axis] = Math.min(bounds.min[axis]!, n); bounds.max[axis] = Math.max(bounds.max[axis]!, n);
          });
        }
        for (let i = 0; i < position.count; i += 3) {
          const vertices = [key(i), key(i + 1), key(i + 2)];
          expect(new Set(vertices).size, `${record.shortName} nondegenerate triangle`).toBe(3);
          for (let k = 0; k < 3; k += 1) {
            const edge = `${vertices[k]}>${vertices[(k + 1) % 3]}`;
            edges.set(edge, (edges.get(edge) || 0) + 1);
          }
        }
        for (const [edge, count] of edges) expect(edges.get(edge.split(">").reverse().join(">")), `${record.shortName} closed mesh at ${edge}`).toBe(count);
      });
      near(bounds.min[1], 0, 1e-5);
      near(bounds.max[1], height, 0.001);
      near(groundBounds.min[0], metrics.min[0], 0.03);
      near(groundBounds.max[0], metrics.max[0], 0.03);
      near(-groundBounds.max[1], metrics.min[1], 0.03);
      near(-groundBounds.min[1], metrics.max[1], 0.03);
    }
  }, { timeout: 180_000 });

  describe("Heritage", () => {
    test("keeps the design-drawing terraces and the mapped grade outline", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Heritage")!;
      const model = models["Heritage"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // Independent samples in the city's section and plans. A tower extruded
      // to 192.4 m everywhere, or the old level-count estimates, cannot pass.
      near(hit([-82, 220, 85], [0, -1, 0])!.point.y, 32.8176, 0.001);
      near(hit([-53, 220, 120], [0, -1, 0])!.point.y, 89.5096, 0.001);
      near(hit([-57, 220, 92], [0, -1, 0])!.point.y, 181.2036, 0.001);
      const eastWing = hit([0, 60, 110], [-1, 0, 0]);
      expect(eastWing!.point.x < -41.5 && eastWing!.point.x > -44, "Heritage lower east facade bows inward from the map chord").toBe(true);
      expect(hit([0, 120, 110], [-1, 0, 0]), "Heritage lower wing stops below upper tower").toBeUndefined();
      const groundMesh = meshes.find((mesh) => mesh.name === "Heritage · mapped ground footprint")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Trump", () => {
    test("keeps the mapped setbacks, the photographed roof, step and crown, and the spire", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Trump")!;
      const model = models["Trump"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // The mapped setbacks: a downward ray meets each tier's roof at its mapped height
      // where the next tier does not cover it.
      near(hit([-95, 100, -450], [0, -1, 0])!.point.y, 60, 0.001);
      near(hit([-150, 150, -430], [0, -1, 0])!.point.y, 120, 0.001);
      near(hit([-104, 250, -450], [0, -1, 0])!.point.y, 200, 0.001);
      // The photographed roof, south of the step, and the shoulder north of it, both clear
      // of the crown; the crown's top; and the spire's tip and joints where the photograph
      // shows them, over the crown.
      near(hit([-140, 400, -430], [0, -1, 0])!.point.y, 354.4, 0.001);
      near(hit([-140, 400, -450], [0, -1, 0])!.point.y, 347.3, 0.001);
      near(hit([-126, 400, -450], [0, -1, 0])!.point.y, 364.9, 0.001);
      const [sx, sz] = trumpSpire;
      near(hit([sx, 430, sz], [0, -1, 0])!.point.y, 423.2, 0.001);
      near(hit([sx + 0.9, 430, sz], [0, -1, 0])!.point.y, 402.2, 0.001);
      near(hit([sx + 1.25, 430, sz], [0, -1, 0])!.point.y, 377.4, 0.001);
      expect(hit([sx + 20, 400, sz], [-1, 0, 0])!.object.name).toBe("Trump · spire");
      // The curtain wall is the first surface on the shaft's south-west face and on the
      // step's north face: glass or a stainless mullion, just outside the mapped wall.
      const south = hit([-135.5, 300, -380], [0, 0, -1])!;
      expect(south.object.name).toMatch(/glass|mullions/);
      expect(south.point.z).toBeGreaterThan(-416.3 - 0.05);
      expect(south.point.z).toBeLessThan(-416.3 + 0.3);
      const step = hit([-140, 351, -470], [0, 0, 1])!;
      expect(step.object.name).toMatch(/glass|mullions/);
      expect(step.point.z).toBeLessThan(-448.4);
      expect(step.point.z).toBeGreaterThan(-448.4 - 0.3);
      // The glass is cut into floors: a spandrel on a drawn floor line, glass between.
      const tone = (found: THREE.Intersection) => (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      const probe = (height: number) => hit([-137, height, -380], [0, 0, -1])!;
      const glass = probe(trumpLevels.floorLine + 1.6), band = probe(trumpLevels.floorLine + 0.1);
      expect(glass.object.name).toBe("Trump · glass and spandrels");
      expect(band.object.name).toBe("Trump · glass and spandrels");
      const spandrel = new THREE.Color(0x474747).r;
      expect(Math.abs(tone(band) - spandrel), "the floor line is a spandrel").toBeLessThan(0.002);
      expect(Math.abs(tone(glass) - spandrel), "the storey above it is glass").toBeGreaterThan(0.01);
      // The mapped footprint's corners at grade.
      const shell = meshes.find((mesh) => mesh.name === "Trump · tower shell")!;
      const vertices = shell.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = record.footprint.coordinates.map((c) => { const [east, north] = projectGround(c); return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(","); });
      expect(mapped.every((corner) => grade.has(corner))).toBe(true);
    });
  });

  describe("Kemper", () => {
    test("keeps the mapped podium, tower roof, cap and glazed facades", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Kemper")!;
      const model = models["Kemper"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const world = (longitude: number, latitude: number): Vec3 => {
        const [east, north] = projectGround([longitude, latitude]);
        return [east, 0, -north];
      };
      // The mapped west wall kinks at 41.8865163° N; interpolate along it so
      // probes land on the wall rather than its chord.
      const westCorners = [world(-87.6277622, 41.8867154), world(-87.6277552, 41.8865163), world(-87.6277499, 41.8863375)];
      const westProbe = (fraction: number): Vec3 => {
        const lengths = [0, 1].map((i) => Math.hypot(westCorners[i + 1]![0] - westCorners[i]![0], westCorners[i + 1]![2] - westCorners[i]![2]));
        const target = fraction * (lengths[0]! + lengths[1]!);
        const index = target <= lengths[0]! ? 0 : 1;
        const t = (target - (index === 1 ? lengths[0]! : 0)) / lengths[index]!;
        return westCorners[index]!.map((v, axis) => v + (westCorners[index + 1]![axis]! - v) * t) as Vec3;
      };
      const chordWest = world(-87.6277622, 41.8867154).map((v, axis) => v + (world(-87.6277499, 41.8863375)[axis]! - v) * 0.5) as Vec3;
      // The south-east wing's podium roof and the tower's interior roof under
      // the projecting cap: the OSM 7.8 m podium and 159 m tower top.
      const wing = world(-87.6272, 41.8865);
      near(hit([wing[0], 40, wing[2]], [0, -1, 0])!.point.y, 7.8, 0.001);
      const tower = world(-87.6275, 41.8865);
      near(hit([tower[0], 200, tower[2]], [0, -1, 0])!.point.y, 158.5, 0.001);
      // The projecting cap wraps a ring that drops the mapped wall's tracing
      // jogs, so its west edge follows the chord between the wall corners.
      const capProbe = chordWest;
      near(hit([capProbe[0] - 0.3, 200, capProbe[2]], [0, -1, 0])!.point.y, 159, 0.001);
      // The west wall stands on the mapped lot line; panes and mullions are the
      // first surface rather than a bare extruded shell. The probe starts west
      // of the wall, outside the closed shell.
      for (const fraction of [0.2, 0.5, 0.8]) {
        const probe = westProbe(fraction);
        const west = hit([probe[0] - 30, 100, probe[2]], [1, 0, 0]);
        expect(west!.object.name).toMatch(/glaz|mullion/);
        expect(west!.point.x).toBeLessThan(probe[0] - 0.05);
        expect(west!.point.x).toBeGreaterThan(probe[0] - 0.2);
      }
      // The crown's fins stand proud of the dark band near the roof: probe the
      // last fin's station on the mapped west wall, where a horizontal ray
      // meets the fin itself rather than the glass between fins.
      const crownCorner = westCorners[0]!, crownKink = westCorners[1]!;
      const finLength = Math.hypot(crownKink[0] - crownCorner[0], crownKink[2] - crownCorner[2]);
      const finCount = Math.max(1, Math.round(finLength / 1.05));
      const finProbe = crownCorner.map((v, axis) => v + (crownKink[axis]! - v) * (finCount - 0.5) / finCount) as Vec3;
      const fin = hit([finProbe[0] - 30, 152, finProbe[2]], [1, 0, 0]);
      expect(fin!.object.name).toBe("Kemper · crown fins");
      near(fin!.point.x, finProbe[0] - 0.28, 0.02);
      // Facade relief above grade must not redefine the street footprint.
      const groundMesh = meshes.find((mesh) => mesh.name === "Kemper · marble shell")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Michigan Plaza South", () => {
    test("keeps the mapped outline, roof parapet and glazed grid", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Michigan Plaza S")!;
      const model = models["Michigan Plaza S"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const world = (longitude: number, latitude: number): Vec3 => {
        const [east, north] = projectGround([longitude, latitude]);
        return [east, 0, -north];
      };
      // The interior roof under the parapet and the parapet itself: the
      // published 168.6 m top, not an outline extruded to it.
      const interior = world(-87.62356, 41.88608);
      near(hit([interior[0], 200, interior[2]], [0, -1, 0])!.point.y, 167.8, 0.001);
      const southWest = world(-87.6239484, 41.8858842), southEast = world(-87.6231713, 41.8858935);
      const southWall = southWest.map((v, axis) => v + (southEast[axis]! - v) * 0.5) as Vec3;
      near(hit([southWall[0], 200, southWall[2] + 0.2], [0, -1, 0])!.point.y, 168.6, 0.001);
      // Panes and mullions are the first surface on the mapped south wall,
      // probed from outside the closed shell.
      for (const fraction of [0.2, 0.5, 0.8]) {
        const probe = southWest.map((v, axis) => v + (southEast[axis]! - v) * fraction) as Vec3;
        const south = hit([probe[0], 100, probe[2] + 30], [0, 0, -1]);
        expect(south!.object.name).toMatch(/glaz|mullion/);
        expect(south!.point.z).toBeGreaterThan(probe[2] + 0.03);
        expect(south!.point.z).toBeLessThan(probe[2] + 0.2);
      }
      // Facade relief above grade must not redefine the street footprint.
      const groundMesh = meshes.find((mesh) => mesh.name === "Michigan Plaza South · mapped tower shell")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Crain", () => {
    test("keeps the photographed diamond, the open slot, the notches and the banded wall", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Crain")!;
      const model = models["Crain"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const world = (longitude: number, latitude: number): Vec3 => {
        const [east, north] = projectGround([longitude, latitude]);
        return [east, 0, -north];
      };
      const glass = meshes.filter((mesh) => mesh.name === "Crain · sloped glazing");
      // Both roofs fall 1.225 m per metre along OSM's 133° bearing from peaks at the
      // published 177.4 m, as the photograph shows, not from the mapped roof tags' 172.4 m
      // and 177.4 m tops falling 75 and 73 m. Independent samples on each half's glass.
      const radians = Math.PI / 180;
      const roofOf = (part: (typeof record.parts)[number]) => {
        const along = ([x, z]: Vec2) => x * Math.sin(133 * radians) - z * Math.cos(133 * radians);
        const top = Math.min(...part.coordinates.map((p) => { const [east, north] = projectGround(p); return along([east, -north]); }));
        return ([x, z]: Vec2) => 177.4 - 1.225 * (along([x, z]) - top);
      };
      const southWest = record.parts.find((p) => p.way === 284816228)!, northEast = record.parts.find((p) => p.way === 284816229)!;
      for (const [part, samples] of [[southWest, [world(-87.62512, 41.88470), world(-87.62490, 41.88468)]], [northEast, [world(-87.62480, 41.88495), world(-87.62505, 41.88498)]]] as const) {
        const roof = roofOf(part);
        for (const probe of samples) near(hit([probe[0], 200, probe[2]], [0, -1, 0], glass)!.point.y, roof([probe[0], probe[2]]), 0.01);
      }
      // Both peaks reach the published top, within half a metre of each other in the
      // photograph: the south-west half's on its west face, the north-east half's at the
      // mapped north-west corner.
      const roofs = glass[0]!.geometry.getAttribute("position");
      for (const peak of [world(-87.6252086, 41.8849637), world(-87.6252038, 41.8850292)]) {
        let top = -Infinity;
        for (let i = 0; i < roofs.count; i += 1) if (Math.hypot(roofs.getX(i) - peak[0], roofs.getZ(i) - peak[2]) < 0.01) top = Math.max(top, roofs.getY(i));
        near(top, 177.4, 0.001);
      }
      // The slot is open to the sky down to the wedge's mapped 152.5 m top.
      const wedge = record.parts.find((p) => p.way === 284816227)!;
      const wedgeMiddle = wedge.coordinates.map((p) => world(p[0], p[1])).reduce<Vec3>((sum, p, _, all) => [sum[0] + p[0] / all.length, 0, sum[2] + p[2] / all.length], [0, 0, 0]);
      const floor = hit([wedgeMiddle[0], 200, wedgeMiddle[2]], [0, -1, 0])!;
      expect(floor.object.name).toBe("Crain · slot floor");
      near(floor.point.y, 152.5, 0.001);
      // The mapped south wall carries ribbon windows between white spandrels: a sill-to-head
      // probe meets glass first, a spandrel probe the wall itself.
      const southWestCorner = world(-87.6251984, 41.8846185), southJog = world(-87.624879, 41.8846221);
      const midSouth = southWestCorner.map((v, axis) => v + (southJog[axis]! - v) * 0.3) as Vec3;
      const level = 7 + 3.5 * 20;
      expect(hit([midSouth[0], level + 1.7, midSouth[2] + 30], [0, 0, -1])!.object.name).toBe("Crain · ribbon glazing");
      expect(hit([midSouth[0], level + 3.0, midSouth[2] + 30], [0, 0, -1])!.object.name).toBe("Crain · aluminum spandrels");
      // The south-east notch is a recessed V: a ray from the lake meets the north-east half's
      // wall on the notch's inner arm, not a filled corner.
      const apex = world(-87.6248301, 41.884687), eastArm = world(-87.6247375, 41.8847566);
      const arm = apex.map((v, axis) => v + (eastArm[axis]! - v) * 0.5) as Vec3;
      const inward: Vec3 = [-Math.SQRT1_2, 0, -Math.SQRT1_2];
      const notchHit = hit([arm[0] - inward[0] * 30, 7 + 3.5 * 15 + 1.7, arm[2] - inward[2] * 30], inward)!;
      expect(notchHit.object.name).toBe("Crain · ribbon glazing");
      const armDirection = [eastArm[0] - apex[0], eastArm[2] - apex[2]], armLength = Math.hypot(armDirection[0]!, armDirection[1]!);
      near(Math.abs((notchHit.point.x - apex[0]) * armDirection[1]! - (notchHit.point.z - apex[2]) * armDirection[0]!) / armLength, 0.08, 0.02);
      // The lit outline runs along the south face's roof edge, standing out from the wall.
      const edge = roofOf(southWest)([midSouth[0], midSouth[2]]);
      expect(hit([midSouth[0], edge - 0.2, midSouth[2] + 30], [0, 0, -1])!.object.name).toBe("Crain · diamond outline lights");
      // Every mapped footprint corner stands at grade: facade relief above grade must not
      // redefine the street outline, and the parts share their seams.
      const groundMesh = meshes.find((mesh) => mesh.name === "Crain · aluminum spandrels")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect([...mapped].every((corner) => grade.has(corner))).toBe(true);
    });
  });

  describe("330 North Wabash", () => {
    test("keeps the mapped slab, its bronze curtain wall, louvered plant floors, and plaza", () => {
      const record = geographicBuildings.find((r) => r.shortName === "330 N Wabash")!;
      const model = models["330 N Wabash"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const tone = (found: THREE.Intersection) => (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      // The flat roof at the mapped 695 ft.
      near(hit([-217, 250, -425], [0, -1, 0])!.point.y, 211.84, 0.001);
      // From the south, the curtain wall's cells: a spandrel on an office floor's line and
      // the glass above it, the louvers of the top plant floors, the lobby's glass on the
      // plaza, and the granite below the plaza.
      const skin = meshes.filter((mesh) => mesh.name === "330 North Wabash · glass, spandrels and louvers");
      const fromSouth = (height: number, targets = skin) => hit([-216.5, height, -360], [0, 0, -1], targets)!;
      const floor = northWabashFloors[30]!;
      const spandrelCell = fromSouth(floor + 0.2), glassCell = fromSouth(floor + 2), louverCell = fromSouth(206), lobbyCell = fromSouth(12);
      for (const cell of [spandrelCell, glassCell, louverCell, lobbyCell]) expect(cell.point.z).toBeGreaterThan(-383.7);
      const [spandrel, louver, lobby] = [0x262626, 0x353535, 0x3a3a3a].map((hex) => new THREE.Color(hex).r);
      expect(Math.abs(tone(spandrelCell) - spandrel!), "a spandrel on the floor line").toBeLessThan(0.002);
      expect(Math.abs(tone(glassCell) - spandrel!), "glass above it").toBeGreaterThan(0.001);
      expect(Math.abs(tone(louverCell) - louver!), "louvers at the top").toBeLessThan(0.002);
      expect(Math.abs(tone(lobbyCell) - lobby!), "the lobby's glass").toBeLessThan(0.002);
      // The two mechanical floors above the sixteenth, 72.7 to 82 m, carry louvers too.
      expect(Math.abs(tone(fromSouth(75)) - louver!), "louvers above the sixteenth floor").toBeLessThan(0.002);
      // Below the plaza, granite.
      const plinth = fromSouth(4, meshes);
      expect(plinth.object.name).toBe("330 North Wabash · shell");
      expect(Math.abs(tone(plinth) - new THREE.Color(0x464646).r), "granite below the plaza").toBeLessThan(0.002);
      // Along the south face, the I-beam mullions stand one 5 ft module apart in front of
      // the glass, and bronze columns stand in front of the lobby on the 40 ft bays.
      const frames = meshes.filter((mesh) => mesh.name === "330 North Wabash · bronze mullions and columns");
      const standing = (height: number, from: number, to: number) => {
        const hits: number[] = [];
        for (let x = from; x <= to; x += 0.05) { const found = hit([x, height, -360], [0, 0, -1], frames); if (found && found.point.z > -383.7) hits.push(x); }
        return hits.filter((x, i) => i === 0 || x - hits[i - 1]! > 0.2);
      };
      const mullions = standing(floor + 2, -230, -205);
      expect(mullions.length, "mullions across 25 m of the south face").toBeGreaterThanOrEqual(15);
      const gaps = mullions.slice(1).map((x, i) => x - mullions[i]!);
      expect(Math.max(...gaps) - Math.min(...gaps), "mullions one module apart").toBeLessThan(0.15);
      expect(Math.abs(gaps.reduce((a, b) => a + b, 0) / gaps.length - 1.52), "a 5 ft module").toBeLessThan(0.05);
      const columns = standing(11, -236, -197);
      expect(columns.length, "the lobby's columns on the south face's 40 ft bays").toBe(4);
      // The mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "330 North Wabash · shell")!;
      const vertices = shell.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((c) => { const [east, north] = projectGround(c); return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(","); }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("One Prudential", () => {
    test("keeps the mapped tower and wings, the photographed roof, the sign penthouse and the WGN mast", () => {
      const record = geographicBuildings.find((r) => r.shortName === "One Prudential")!;
      const model = models["One Prudential"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const world = (longitude: number, latitude: number): Vec3 => {
        const [east, north] = projectGround([longitude, latitude]);
        return [east, 0, -north];
      };
      const tone = (found: THREE.Intersection) => (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      // Points measured along the mapped south face's chord and north of it.
      const sw = world(-87.6236525, 41.8847492), se = world(-87.6227902, 41.8847615);
      const chord = Math.hypot(se[0] - sw[0], se[2] - sw[2]), u = [(se[0] - sw[0]) / chord, (se[2] - sw[2]) / chord] as const;
      const at = (s: number, north: number): Vec3 => [sw[0] + u[0] * s + u[1] * north, 0, sw[2] + u[1] * s - u[0] * north];
      // The roof at the photographed 169.5 m, the penthouse at the published 183.2 m, and
      // the east wing at its photographed 56.4 m and the west wing at its estimated 13.4 m.
      const roof = at(20, 17), penthouse = at(30, 6);
      near(hit([roof[0], 200, roof[2]], [0, -1, 0])!.point.y, 169.5, 0.001);
      near(hit([penthouse[0], 200, penthouse[2]], [0, -1, 0])!.point.y, 183.2, 0.001);
      const eastWing = world(-87.6226, 41.88495), westWing = world(-87.6235849, 41.8846915);
      near(hit([eastWing[0], 100, eastWing[2]], [0, -1, 0])!.point.y, 56.4, 0.001);
      near(hit([westWing[0], 100, westWing[2]], [0, -1, 0])!.point.y, 13.4, 0.001);
      // The mast stands at the mapped antenna part's area centroid. Its tubular top is at
      // 259.4 m, where the drawing stops it, and WGN's slim antenna reaches the 278 m tip.
      const mastPoints = record.parts.find((p) => p.way === 685493614)!.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      let twice = 0, sumX = 0, sumZ = 0;
      mastPoints.forEach(([x, z], i) => {
        const [x2, z2] = mastPoints[(i + 1) % mastPoints.length]!, cross = x * z2 - x2 * z;
        twice += cross; sumX += (x + x2) * cross; sumZ += (z + z2) * cross;
      });
      const mast: Vec3 = [sumX / (3 * twice), 0, sumZ / (3 * twice)];
      near(hit([mast[0], 300, mast[2]], [0, -1, 0])!.point.y, 278, 0.001);
      near(hit([mast[0] + 0.35, 300, mast[2]], [0, -1, 0])!.point.y, 259.4, 0.001);
      expect(hit([mast[0] + 20, 200, mast[2]], [-1, 0, 0])!.object.name).toBe("One Prudential · antenna mast");
      // The south face's bays: from the lake, a window's centre meets dark glass, the floor
      // line between two windows the aluminium spandrel, and a bay line a limestone pier
      // standing proud; higher up, the sill course, the observatory's glass, and the coping.
      const runLength = Math.hypot(world(-87.6234169, 41.8847507)[0] - sw[0], world(-87.6234169, 41.8847507)[2] - sw[2]);
      const southLength = runLength + [[-87.6234169, 41.8847507, -87.6231733, 41.8847538], [-87.6231733, 41.8847538, -87.6229073, 41.8847597], [-87.6229073, 41.8847597, -87.6227902, 41.8847615]]
        .reduce((sum, [a, b, c, d]) => { const [p, q] = [world(a!, b!), world(c!, d!)]; return sum + Math.hypot(q[0] - p[0], q[2] - p[2]); }, 0);
      const { piers } = wallStations(southLength);
      expect(piers).toHaveLength(29);
      const firstRun = (s: number): Vec3 => { const q = world(-87.6234169, 41.8847507); return [sw[0] + (q[0] - sw[0]) * s / runLength, 0, sw[2] + (q[2] - sw[2]) * s / runLength]; };
      const fromLake = (s: number, height: number) => { const p = firstRun(s); return hit([p[0], height, p[2] + 30], [0, 0, -1])!; };
      const pane = fromLake(piers[5]! - onePrudentialLevels.bay / 2, floorLevel(30) + 1.65);
      expect(pane.object.name).toBe("One Prudential · windows and spandrels");
      expect(tone(pane)).toBeLessThan(0.22);
      const spandrel = fromLake(piers[5]! - onePrudentialLevels.bay / 2, floorLevel(30) + 0.3);
      expect(spandrel.object.name).toBe("One Prudential · windows and spandrels");
      expect(tone(spandrel)).toBeGreaterThan(0.25);
      const pier = fromLake(piers[5]!, floorLevel(30) + 1.65);
      expect(pier.object.name).toBe("One Prudential · limestone piers");
      expect(pier.point.z).toBeGreaterThan(firstRun(piers[5]!)[2] + 0.25);
      expect(fromLake(piers[5]! - onePrudentialLevels.bay / 2, 165.1).object.name).toBe("One Prudential · limestone courses");
      expect(fromLake(piers[5]! - onePrudentialLevels.bay / 2, 167).object.name).toBe("One Prudential · windows and spandrels");
      expect(fromLake(piers[5]! - onePrudentialLevels.bay / 2, 169.25).object.name).toBe("One Prudential · limestone courses");
      // The penthouse's south face: the sign's board and a louvered screen's first fin.
      const sign = at(2.3 + 20, 0), fin = at(2.3 + 2.2, 0);
      const board = hit([sign[0], 175, sign[2] + 30], [0, 0, -1])!;
      expect(board.object.name).toBe("One Prudential · penthouse and sign");
      expect(board.point.z).toBeGreaterThan(sign[2] + 0.2);
      expect(hit([fin[0], 181.7, fin[2] + 30], [0, 0, -1])!.object.name).toBe("One Prudential · screen louvers");
      // The sign's paint: the logo and the letters light on the dark board, the capital P
      // tall and the r beside it short, and the gap between them board.
      const signTone = (along: number, height: number) => { const p = at(2.3 + along, 0); return tone(hit([p[0], height, p[2] + 30], [0, 0, -1])!); };
      const pitch = (42.8 - 14) / 10;
      expect(signTone(10, 175), "the logo").toBeGreaterThan(0.3);
      expect(signTone(14 + pitch / 2, 175), "the P").toBeGreaterThan(0.3);
      expect(signTone(14 + pitch / 2, 177.8), "the P's top").toBeGreaterThan(0.3);
      expect(signTone(14 + 1.5 * pitch, 175), "the r").toBeGreaterThan(0.3);
      expect(signTone(14 + 1.5 * pitch, 177.8), "above the r").toBeLessThan(0.05);
      expect(signTone(14 + pitch, 175), "between the P and the r").toBeLessThan(0.05);
      expect(signTone(5.5, 175), "the board").toBeLessThan(0.05);
      // The mapped footprint's corners at grade.
      const groundMesh = meshes.find((mesh) => mesh.name === "One Prudential · shell")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect([...mapped].every((corner) => grade.has(corner))).toBe(true);
    });
  });

  describe("Two Prudential", () => {
    test("keeps the photographed core, gables, turned pyramid, tiers and spire on the mapped outline", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Two Prudential")!;
      const model = models["Two Prudential"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const named = (name: string) => meshes.filter((mesh) => mesh.name === `Two Prudential · ${name}`);
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // The frame restated from the mapped outline rather than imported: its area centroid,
      // and the mapped south wall's direction, from its south-west to its south-east corner.
      const projected = record.footprint.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      const centroid: Vec2 = (() => {
        let twice = 0, x = 0, z = 0;
        for (let i = 0; i < projected.length; i += 1) {
          const a = projected[i]!, b = projected[(i + 1) % projected.length]!;
          const cross = a[0] * b[1] - b[0] * a[1];
          twice += cross; x += (a[0] + b[0]) * cross; z += (a[1] + b[1]) * cross;
        }
        return [x / (3 * twice), z / (3 * twice)];
      })();
      const southWest = projected.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
      const southEast = projected.reduce((best, p) => (p[1] + p[0] > best[1] + best[0] ? p : best));
      const span = Math.hypot(southEast[0] - southWest[0], southEast[1] - southWest[1]);
      const along: Vec2 = [(southEast[0] - southWest[0]) / span, (southEast[1] - southWest[1]) / span], south: Vec2 = [-along[1], along[0]];
      const at = (u: number, v: number, y: number): Vec3 => [centroid[0] + along[0] * u + south[0] * v, y, centroid[1] + along[1] * u + south[1] * v];
      const local = (p: THREE.Vector3): Vec2 => [(p.x - centroid[0]) * along[0] + (p.z - centroid[1]) * along[1], (p.x - centroid[0]) * south[0] + (p.z - centroid[1]) * south[1]];
      const mappedSouth = local(new THREE.Vector3(southWest[0], 0, southWest[1]))[1];
      // The photograph's levels, restated: floors 3.96 m apart from the lobby's 11.52 m, the
      // tiers' shoulders and points, the core's eave at its corners and its gables' points,
      // and the pyramid's apex.
      const pitch = 3.96, eave = 229.32, gable = 256, apex = 280.2;
      const [coreEast, coreSouth] = [20.4, 18.75];

      // The core, 40.8 x 37.5 m about the centroid and square to the mapped south wall: from
      // the east and west at mid-height the first surface is its wall or a pier on it; from
      // the south, outside both tiers, likewise.
      for (const [from, direction, reach] of [[at(40, 1.3, 100), [-along[0], 0, -along[1]], coreEast], [at(-40, -1.3, 100), [along[0], 0, along[1]], coreEast],
        [at(18.9, 40, 100), [-south[0], 0, -south[1]], coreSouth], [at(-18.9, -40, 100), [south[0], 0, south[1]], coreSouth]] as [Vec3, Vec3, number][]) {
        const contact = hit(from, direction)!;
        const [u, v] = local(contact.point);
        near(Math.abs(Math.abs(direction[0]) > 0.5 && Math.abs(along[0]) > 0.5 ? u : v), reach, 0.4);
      }
      // The tiers fill the rest of the mapped depth: the lower one's front stands on the
      // mapped south wall, the middle one half-way back to the core, each narrower than the
      // one behind it. A ray down the core's middle meets the lower tier, one a bay out
      // meets the middle tier, and one beyond it the core.
      const southFront = (u: number) => local(hit(at(u, 60, 100), [-south[0], 0, -south[1]])!.point)[1];
      near(southFront(0), mappedSouth, 0.1);
      near(southFront(15.6), coreSouth + (mappedSouth - coreSouth) / 2, 0.1);
      near(southFront(-15.6), coreSouth + (mappedSouth - coreSouth) / 2, 0.1);
      near(southFront(18.9), coreSouth, 0.05);
      expect(Math.abs(hit(at(0, -60, 100), [south[0], 0, south[1]])!.point.z - at(0, -coreSouth, 0)[2])).toBeGreaterThan(8);

      // The levels themselves, at vertices of the stone, glass and crown: the core's four
      // corners at the eave, each face's gable point at its middle, the pyramid's apex over
      // the centroid as the body's highest point, and each tier's point at its front.
      const body = named("limestone, glass and crown")[0]!.geometry.getAttribute("position");
      const vertex = (target: Vec3) => {
        let best = Infinity;
        for (let i = 0; i < body.count; i += 1) best = Math.min(best, Math.hypot(body.getX(i) - target[0], body.getY(i) - target[1], body.getZ(i) - target[2]));
        return best;
      };
      for (const [u, v] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) near(vertex(at(u! * coreEast, v! * coreSouth, eave)), 0, 0.01);
      for (const point of [at(0, coreSouth + 0.03, gable), at(0, -coreSouth - 0.03, gable), at(coreEast + 0.03, 0, gable), at(-coreEast - 0.03, 0, gable)]) near(vertex(point), 0, 0.01);
      let top = -Infinity;
      for (let i = 0; i < body.count; i += 1) top = Math.max(top, body.getY(i));
      near(top, apex, 1e-4);
      near(vertex(at(0, 0, apex)), 0, 0.01);
      const middleFront = coreSouth + (mappedSouth - coreSouth) / 2;
      near(vertex(at(0, middleFront, 217.2)), 0, 0.05);
      near(vertex(at(0, mappedSouth - 0.02, 181.9)), 0, 0.05);

      // The pyramid steps one floor at a time from the eave, and it is turned 45° to the
      // plan: its ridges run to the gables' points at the faces' middles, so at the same
      // distance from the centre it stands higher toward a face than toward a corner, the
      // opposite of a pyramid square to the plan. Treads are the stone and glass body's own.
      const crown = named("limestone, glass and crown");
      const treads = new Set<number>();
      for (let radius = 1; radius < 26; radius += 0.5) {
        for (const [du, dv] of [[0.72, 0.69], [-0.72, 0.69], [0.72, -0.69], [-0.72, -0.69]]) {
          const contact = hit(at(du! * radius, dv! * radius, 400), [0, -1, 0], crown);
          if (contact && contact.point.y > eave + 0.01 && contact.face!.normal.y > 0.99) treads.add(Math.round(contact.point.y * 100) / 100);
        }
      }
      // Eleven show; the twelfth step's top is the floor of the pointed cap over it.
      expect([...treads].sort((a, b) => a - b)).toEqual(Array.from({ length: 11 }, (_, k) => Math.round((eave + (k + 1) * pitch) * 100) / 100));
      const heightAt = (u: number, v: number) => hit(at(u, v, 400), [0, -1, 0], crown)!.point.y;
      expect(heightAt(1.2, 16) - heightAt(11.8, 11)).toBeGreaterThan(1.5 * pitch);
      expect(heightAt(16, -1.2) - heightAt(11.8, -11)).toBeGreaterThan(1.5 * pitch);
      // A rib runs up each ridge.
      for (const point of [at(0, 9, 400), at(0, -9, 400), at(10, 0, 400), at(-10, 0, 400)]) expect(hit(point, [0, -1, 0])!.object.name).toBe("Two Prudential · crown ribs");

      // Each face's stone bays step up one floor from the corner toward its glass strip,
      // under a coping standing proud of the wall: the core's south face has five, the
      // east face four, the middle tier four and the lower tier three.
      const copingTops = (u0: number, v: number, du: number, bays: number, bay: number, shoulder: number) => {
        const tops = Array.from({ length: bays }, (_, i) => hit(at(u0 - Math.sign(du) * (i + 0.5) * bay, v, 400), [0, -1, 0], named("copings"))!.point.y);
        tops.forEach((y, i) => near(y, shoulder + i * pitch + 0.25, 1e-3));
      };
      copingTops(coreEast, coreSouth + 0.2, 1, 5, 3.16, eave);
      copingTops(-coreEast, -coreSouth - 0.2, -1, 5, 3.16, eave);
      copingTops(17.24, middleFront + 0.2, 1, 4, 3.16, 193.68);
      copingTops(14.08, mappedSouth - 0.02 + 0.2, 1, 3, 3.16, 162);
      for (let i = 0; i < 4; i += 1) near(hit(at(coreEast + 0.2, coreSouth - (i + 0.5) * 3.2625, 400), [0, -1, 0], named("copings"))!.point.y, eave + i * pitch + 0.25, 1e-3);
      // The glass strip's pointed head rises smoothly between them to the gable's point.
      const head = (u: number) => hit(at(u, coreSouth + 0.015, 400), [0, -1, 0])!;
      near(head(2.3).point.y, eave + 5 * pitch + (gable - eave - 5 * pitch) * (1 - 2.3 / 4.6), 1e-3);
      near(head(1.2).point.y - head(3.4).point.y, (gable - eave - 5 * pitch) * 2.2 / 4.6, 1e-3);

      // Panes and piers are the first surface on the mapped east wall.
      const eastMid = at(40, 0.4, 100);
      expect(hit(eastMid, [-along[0], 0, -along[1]])!.object.name).toMatch(/limestone|piers|mullions/);
      // The spire rises from inside the pyramid's cap, turned with the pyramid: its corners
      // point at the faces' middles, so its foot's vertices lie on the core's axes.
      const spire = named("spire")[0]!.geometry.getAttribute("position");
      let foot = Infinity;
      for (let i = 0; i < spire.count; i += 1) foot = Math.min(foot, spire.getY(i));
      expect(foot).toBeLessThan(apex - 3);
      for (let i = 0; i < spire.count; i += 1) {
        if (Math.abs(spire.getY(i) - foot) > 1e-4) continue;
        const [u, v] = local(new THREE.Vector3(spire.getX(i), 0, spire.getZ(i)));
        expect(Math.min(Math.abs(u), Math.abs(v)), "a spire foot vertex lies on one of the core's axes").toBeLessThan(1e-3);
      }
      const shaft = hit(at(0, 5, 288), [0, 0, -1].map((_, k) => [-south[0], 0, -south[1]][k]!) as Vec3)!;
      expect(shaft.object.name).toMatch(/spire/);

      // The exact mapped outline at grade: the lobby's walls stand on it.
      const lobby = named("lobby")[0]!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < lobby.count; i += 1) if (lobby.getY(i) === 0) grade.add([lobby.getX(i), lobby.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Blue Cross", () => {
    test("keeps the mapped block and end bays, the open middle band, the bands' columns and the emblem screen", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Blue Cross")!;
      const model = models["Blue Cross"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const local = (way: number) => record.parts.find((part) => part.way === way)!.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      const block = local(284779637), slab = local(284779635);
      const bounds = (ring: Vec2[]) => [0, 1].map((axis) => [Math.min(...ring.map((p) => p[axis]!)), Math.max(...ring.map((p) => p[axis]!))]) as [[number, number], [number, number]];
      const [[blockWest, blockEast], [blockNorth, blockSouth]] = bounds(block), [[slabWest], [, slabSouth]] = bounds(slab);
      // The published 226.7 m at the screen over the block, and the mapped 212 m over the
      // end bays, which the block stands forward of.
      near(hit([(blockWest + blockEast) / 2, 400, (blockNorth + blockSouth) / 2], [0, -1, 0])!.point.y, 226.7, 1e-3);
      const westBay = slabWest + 3;
      near(hit([westBay, 400, 0], [0, -1, 0])!.point.y, 212, 1e-3);
      const front = (x: number, y: number) => hit([x, y, 80], [0, 0, -1]);
      expect(front((blockWest + blockEast) / 2, 100)!.point.z - front(westBay, 100)!.point.z).toBeGreaterThan(4);
      expect(front(westBay, 100)!.point.z).toBeGreaterThan(slabSouth - 1);
      // At the middle band, the top of the 1997 tower, the end bays are open through; below
      // it and above it they stand.
      expect(front(westBay, 122), "the west bay is open through the middle band").toBeUndefined();
      expect(front(westBay, 110)).toBeDefined();
      expect(front(westBay, 140)).toBeDefined();
      // Through the opening, the block's side wall keeps its skin, which the bays cover below
      // and above it.
      const side = hit([slabWest - 10, 122.5, (blockNorth + blockSouth) / 2], [1, 0, 0])!;
      expect(side.point.x, "the side wall through the opening").toBeGreaterThan(slabWest + 5);
      expect(side.object.name).toBe("Blue Cross · glass, spandrels and bands");
      // Each band's recess, dark between the block's columns, which stand proud of it; and
      // the emblems in the screen's first two bays at the south face's west end.
      const southWest = block.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
      const southEast = block.reduce((best, p) => (p[1] + p[0] > best[1] + best[0] ? p : best));
      const pitch = (southEast[0] - southWest[0]) / 8;
      for (const y of [69, 122.5, 173.3]) {
        const recess = front(southWest[0] + pitch, y)!;
        expect(recess.object.name, `the band's recess at ${y} m`).toBe("Blue Cross · glass, spandrels and bands");
        const colors = (recess.object as THREE.Mesh).geometry.getAttribute("color");
        near(colors.getX(recess.face!.a), new THREE.Color(0x2a2a2a).r, 0.002);
        expect(front(southWest[0] + pitch / 2, y)!.object.name, `a column in the band at ${y} m`).toBe("Blue Cross · band columns and emblems");
      }
      // The cross, west, and the shield: each probed at its centre, and inside and outside
      // its outline where a square plate would differ.
      const emblem = (dx: number, dy: number, bay: number) => front(southWest[0] + bay * pitch + dx, 219.5 + dy)!.object.name === "Blue Cross · band columns and emblems";
      expect([emblem(0, 0, 1), emblem(1.6, 0, 1), emblem(0, -1.6, 1)], "the cross and its arms").toEqual([true, true, true]);
      expect([emblem(1.5, 1.5, 1), emblem(-1.5, -1.5, 1)], "clear of the cross between its arms").toEqual([false, false]);
      expect([emblem(0, 0, 2), emblem(-1.5, 1.8, 2), emblem(1.5, 1.8, 2)], "the shield and its shoulders").toEqual([true, true, true]);
      expect([emblem(-1.5, -1.8, 2), emblem(1.5, -1.8, 2)], "the shield's point").toEqual([false, false]);
      expect(front(southWest[0] + 3 * pitch, 219.5)!.object.name, "no emblem past the second bay").toBe("Blue Cross · glass, spandrels and bands");
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Blue Cross · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("340 on the Park", () => {
    test("keeps the mapped plan, the south face's frame, the winter garden, the tip's fins and the corner block", () => {
      const record = geographicBuildings.find((r) => r.shortName === "340 on the Park")!;
      const model = models["340 on the Park"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction).normalize());
        return ray.intersectObjects(meshes, false)[0];
      };
      const local = (way: number) => record.parts.find((part) => part.way === way)!.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      const tower = local(284789056), block = local(284789058);
      const centre = (ring: Vec2[]) => [0, 1].map((axis) => ring.reduce((sum, p) => sum + p[axis]!, 0) / ring.length) as Vec2;
      // The drawing's beams, floor 6's at 21.35 m and floor 61's at 184.2 m, a fifth floor
      // apart, and over them four penthouse floors to the band's foot at 198.6 m.
      const floor = (n: number) => (n <= 61 ? 21.35 + (n - 6) * (184.2 - 21.35) / 55 : 184.2 + (n - 61) * (198.6 - 184.2) / 4);
      // The roof deck under the glass guard, and the corner block's roof level with the top
      // of floor 16's beam, not the map's 40 m; the tower stands behind it above.
      const [[tx, tz], [bx, bz]] = [centre(tower), centre(block)];
      near(hit([tx!, 300, tz!], [0, -1, 0])!.point.y, 203.8, 1e-3);
      near(hit([bx!, 300, bz!], [0, -1, 0])!.point.y, floor(16) + 0.725, 0.01);
      expect(hit([bx!, 30, 80], [0, 0, -1])!.point.z, "the block's south wall").toBeGreaterThan(13.8);
      expect(hit([bx!, 60, 80], [0, 0, -1])!.point.z, "the tower's diagonal face above it").toBeLessThan(13);
      // The south face, probed from the south at stations along it, as the photograph lays
      // them out on its 43.2 m: which part of the frame a ray meets, and how far proud.
      const [west, east] = tower.filter((p) => p[1] > 16).sort((a, b) => a[0] - b[0]) as [Vec2, Vec2];
      const south = (s: number, y: number) => {
        const x = west[0] + (east[0] - west[0]) * s / 43.2, wall = west[1] + (east[1] - west[1]) * s / 43.2;
        const found = hit([x, y, 80], [0, 0, -1])!;
        return { name: found.object.name.replace("340 on the Park · ", ""), proud: found.point.z - wall, found };
      };
      const expectAt = (s: number, y: number, name: string, proud: number, what: string) => {
        const { name: got, proud: depth } = south(s, y);
        expect(got, what).toBe(name);
        near(depth, proud, 0.02);
      };
      expectAt(1, 100, "concrete frame", 0.6, "the west pier");
      expectAt(22, floor(33) + 1.5, "curtain wall", 0.07, "the glass field");
      expectAt(22, floor(36), "concrete frame", 0.45, "a beam every fifth floor");
      expectAt(22, floor(26) - 0.9, "concrete frame", 0.45, "the winter garden's deeper beam");
      expectAt(22, floor(31) - 0.9, "curtain wall", 0.07, "a regular beam's reach");
      expectAt(6.4, floor(40), "concrete frame", 1.5, "a cantilevered balcony");
      expectAt(37.6, floor(40) + 0.6, "railings and guards", 0.28, "a recessed balcony's railing");
      expectAt(6.4, floor(63) + 0.6, "railings and guards", 0.28, "a penthouse balcony's railing over the ladder");
      expectAt(6.4, floor(29) + 0.6, "railings and guards", 0.28, "a recessed balcony over the ladder beside the garden");
      expectAt(6.4, floor(33) + 0.6, "railings and guards", 1.45, "the ladder's cantilevered balcony below it");
      expectAt(25.6, 190, "concrete frame", 0.6, "a penthouse post");
      expectAt(22, 201, "concrete frame", 0.65, "the parapet band");
      // The winter garden runs floors 26 to 28 into one tall row, where a regular bay shows
      // a slab; three round columns stand in it.
      const tone = (s: number, y: number) => { const { found } = south(s, y); return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a); };
      near(tone(22, floor(33)), new THREE.Color(0x2a2a2a).r, 0.002);
      expect([tone(22, floor(27)), tone(22, floor(28))].map((r) => Math.abs(r - new THREE.Color(0x2a2a2a).r) > 0.002), "the garden's tall glazing").toEqual([true, true]);
      expect(south(17.3, floor(27)).name, "a garden column").toBe("concrete frame");
      expect(south(17.3, floor(27)).proud).toBeGreaterThan(0.9);
      // The column of windows is punched in white wall: a jamb beside each window.
      const concrete = new THREE.Color(0xb4b4b4).r;
      expect([tone(2.0, floor(40) + 1.5), tone(3.3, floor(40) + 1.5)].map((r) => Math.abs(r - concrete) < 0.002), "a jamb, then the window").toEqual([true, false]);
      // The glass guards over the roof deck and round the corner block's terrace.
      expectAt(22, 204.5, "railings and guards", 0.06, "the roof's guard");
      expect(hit([bx!, floor(16) + 1.2, 80], [0, 0, -1])!.object.name, "the terrace's guard").toBe("340 on the Park · railings and guards");
      // Fins at the beam floors cross the diagonal face near the east tip, and not 12 m back.
      const tip = tower.reduce((best, p) => (p[0] > best[0] ? p : best));
      const toward = (d: number, y: number) => { const p: Vec3 = [tip[0] - d * Math.SQRT1_2 + 20 * Math.SQRT1_2, y, tip[1] + d * Math.SQRT1_2 + 20 * Math.SQRT1_2]; return hit(p, [-1, 0, -1])!.object.name; };
      expect([toward(2, floor(46)), toward(2, floor(46) + 1.5), toward(12, floor(46))]).toEqual(["340 on the Park · concrete frame", "340 on the Park · curtain wall", "340 on the Park · curtain wall"]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "340 on the Park · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, north] = projectGround(p);
        return [Math.fround(x), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Buckingham", () => {
    test("keeps the mapped bays and notched corners, the floor bands, the top floor and the rooftop enclosure", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Buckingham")!;
      const model = models["Buckingham"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const local = (p: [number, number]): Vec2 => { const [east, north] = projectGround(p); return [east, -north]; };
      const at = (i: number) => local(record.footprint.coordinates[i]!);
      // The drawing's floor lines, floor 7's at 18.94 m and a floor every 2.5456 m.
      const floor = (n: number) => 18.94 + (n - 7) * 2.5456;
      // The rooftop enclosure at the published top over its mapped part, and the cap at the
      // mapped 119 m beside it.
      const room = record.parts.find((part) => part.way === 284790189)!.coordinates.map(local);
      const [rx, rz] = [0, 1].map((axis) => room.reduce((sum, p) => sum + p[axis]!, 0) / room.length);
      near(hit([rx!, 200, rz!], [0, -1, 0])!.point.y, 121.9, 1e-3);
      near(hit([at(0)[0] + 3, 200, at(0)[1] - 3], [0, -1, 0])!.point.y, 119, 1e-3);
      // The south face, probed from the south: its end bays stand forward of the middle
      // three, which piers divide.
      const front = (x: number, y: number) => hit([x, y, 80], [0, 0, -1])!;
      const [endBay, middle] = [(at(22)[0] + at(0)[0]) / 2, (at(20)[0] + at(21)[0]) / 2];
      near(front(endBay, 60).point.z, (at(22)[1] + at(0)[1]) / 2 + 0.07, 0.02);
      near(front(middle, 60).point.z, (at(20)[1] + at(21)[1]) / 2 + 0.07, 0.02);
      const pier = front(at(21)[0] + (at(20)[0] - at(21)[0]) / 3, 60);
      expect(pier.object.name).toBe("Buckingham · piers");
      near(pier.point.z, at(21)[1] + (at(20)[1] - at(21)[1]) / 3 + 0.25, 0.02);
      // A concrete band at every floor over the ribbon windows, and on the top floor tall
      // openings from its deeper band's head at 114.5 m to the cap's foot at 117.4 m.
      const concrete = new THREE.Color(0x4c4c4c).r;
      const band = (y: number) => {
        const found = front(middle, y);
        expect(found.object.name).toBe("Buckingham · frame and glass");
        return Math.abs((found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a) - concrete) < 0.002;
      };
      expect([band(floor(20) + 0.1), band(floor(20) + 1.3)], "a floor's band and window").toEqual([true, false]);
      expect([band(114.3), band(114.7), band(117.2), band(117.6)], "the top floor's opening between its band and the cap").toEqual([true, false, false, true]);
      // A balcony in each notched corner, south-east and north-east, on every floor to the
      // 43rd, under a railing along its open sides.
      for (const [first, inner, last] of [[18, 17, 16], [9, 10, 11]] as const) {
        const [p0, p1, p2] = [at(first), at(inner), at(last)];
        const notch: Vec2 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
        const balcony = hit([notch[0], floor(30) + 0.5, notch[1]], [0, -1, 0])!;
        expect(balcony.object.name).toBe("Buckingham · corner balconies");
        near(balcony.point.y, floor(30) + 0.12, 1e-3);
        near(hit([notch[0], 200, notch[1]], [0, -1, 0])!.point.y, floor(43) + 0.12, 1e-3);
        // Just inside the notch's outer corner, the railing's top.
        const q: Vec2 = [p0[0] + p2[0] - p1[0], p0[1] + p2[1] - p1[1]], d = Math.hypot(p1[0] - q[0], p1[1] - q[1]);
        const rail = hit([q[0] + (p1[0] - q[0]) * 0.03 / d, 200, q[1] + (p1[1] - q[1]) * 0.03 / d], [0, -1, 0])!;
        expect(rail.object.name).toBe("Buckingham · corner balconies");
        near(rail.point.y, floor(43) + 1.0, 1e-3);
      }
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Buckingham · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, north] = projectGround(p);
        return [Math.fround(x), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Millennium Park Plaza", () => {
    test("keeps the mapped slab, its narrow ends' window strips, its punched long faces and solid chamfers", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Millennium Park Plaza")!;
      const model = models["Millennium Park Plaza"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // A wall's colour where a ray from outside meets it, s metres from `from` toward `to`.
      const tone = (from: Vec2, to: Vec2, s: number, y: number) => {
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]), t: Vec2 = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
        const centre = [0, 1, 2, 3, 4, 5].map(at).reduce((sum, p) => [sum[0] + p[0] / 6, sum[1] + p[1] / 6], [0, 0]);
        let n: Vec2 = [t[1], -t[0]];
        if ((from[0] - centre[0]) * n[0] + (from[1] - centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
        const p = [from[0] + t[0] * s, from[1] + t[1] * s];
        ray.set(new THREE.Vector3(p[0]! + n[0] * 20, y, p[1]! + n[1] * 20), new THREE.Vector3(-n[0], 0, -n[1]));
        const found = ray.intersectObjects(meshes, false)[0]!;
        expect(found.object.name).toBe("Millennium Park Plaza · walls and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const [concrete, strip] = [is(0x666666), is(0x3e3e3e)];
      // A window's glass: one of the four tones, or a lit or dimmed pane.
      const glass = (r: number) => [0x2e2e2e, 0x323232, 0x363636, 0x3a3a3a, 0x727272, 0x484848].some((hex) => is(hex)(r));
      // The published top over the slab.
      const [cx, cz] = [(at(0)[0] + at(4)[0]) / 2, (at(0)[1] + at(4)[1]) / 2];
      ray.set(new THREE.Vector3(cx, 200, cz), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObjects(meshes, false)[0]!.point.y).toBeCloseTo(121.9, 3);
      // The south end: four window strips from the eighth floor, a window over each on the
      // top floor, solid wall between them, and the offices' windows across it below.
      const floor = (n: number) => (n <= 8 ? 4.4 + (n - 2) * 3.7 : 26.6 + (n - 8) * 2.8);
      const [west, east] = [at(3), at(2)], middle = Math.hypot(east[0] - west[0], east[1] - west[1]) / 2;
      for (const d of [-4.1, -1.6, 1.6, 4.1]) {
        expect(glass(tone(west, east, middle + d, floor(20) + 1.2)), `the strip ${d} m from the middle`).toBe(true);
        expect(strip(tone(west, east, middle + d, floor(20) + 0.1)), `between its windows`).toBe(true);
        expect(concrete(tone(west, east, middle + d, floor(40) + 0.1)), `the wall under its top window`).toBe(true);
        expect(glass(tone(west, east, middle + d, floor(40) + 1.2)), `its top window`).toBe(true);
      }
      expect(concrete(tone(west, east, middle, floor(20) + 1.2)), "wall between strips").toBe(true);
      expect(glass(tone(west, east, middle, floor(4) + 1.2)), "an office floor's window").toBe(true);
      // The east face: a punched window every 3 m between piers; the south-east chamfer solid.
      const [south, north] = [at(1), at(0)], bay = Math.hypot(north[0] - south[0], north[1] - south[1]) / 30;
      expect(glass(tone(south, north, 15.5 * bay, floor(20) + 1.2)), "a window").toBe(true);
      expect(concrete(tone(south, north, 15 * bay, floor(20) + 1.2)), "a pier").toBe(true);
      expect(concrete(tone(at(2), at(1), 1.2, floor(20) + 1.2)), "the chamfer").toBe(true);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Millennium Park Plaza · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, north] = projectGround(p);
        return [Math.fround(x), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Aon", () => {
    test("keeps the mapped tube, its columns, glass, crown and notched corners", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Aon")!;
      const model = models["Aon"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      const world = (longitude: number, latitude: number): Vec3 => {
        const [east, north] = projectGround([longitude, latitude]);
        return [east, 0, -north];
      };
      // The flat roof at the mapped 340 m shaft top, clear of the enclosure; the enclosure
      // at its mapped 346.3 m top, probed beside the mast; and the antenna's published tip.
      const interior = world(-87.62178, 41.88527);
      near(hit([interior[0], 380, interior[2]], [0, -1, 0])!.point.y, 340, 0.001);
      // The antenna stands at the enclosure's area centroid, not the mean of its traced
      // vertices, which an extra vertex on one edge pulls metres off centre: half a metre
      // beside the centroid a probe already falls past the mast onto the enclosure.
      const enclosurePart = record.parts.find((p) => p.way === 284775635)!;
      const enclosurePoints = enclosurePart.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      let twice = 0, sumX = 0, sumZ = 0;
      enclosurePoints.forEach(([x, z], i) => {
        const [x2, z2] = enclosurePoints[(i + 1) % enclosurePoints.length]!, cross = x * z2 - x2 * z;
        twice += cross; sumX += (x + x2) * cross; sumZ += (z + z2) * cross;
      });
      const enclosureCenter: Vec3 = [sumX / (3 * twice), 0, sumZ / (3 * twice)];
      near(hit([enclosureCenter[0] + 2, 380, enclosureCenter[2]], [0, -1, 0])!.point.y, 346.3, 0.001);
      near(hit([enclosureCenter[0], 400, enclosureCenter[2]], [0, -1, 0])!.point.y, 362.5, 0.001);
      for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
        near(hit([enclosureCenter[0] + dx!, 400, enclosureCenter[2] + dz!], [0, -1, 0])!.point.y, 346.3, 0.001);
      }
      // The mapped south face between its notches holds fourteen 10 ft bays. From the
      // lake, a mid-bay probe meets the glass on an office floor and the dark spandrel
      // between floors, and one on a bay line meets a column. The glass runs on at the same
      // pitch over the mechanical floors to the granite cap, with no band of louvers
      // between: daylight photographs show the slots unchanged to the top.
      const west = world(-87.6217961, 41.8850104), east = world(-87.6212842, 41.885017);
      const bay = Math.hypot(east[0] - west[0], east[2] - west[2]) / 14;
      const along = (s: number): Vec3 => { const t = s / (bay * 14); return [west[0] + (east[0] - west[0]) * t, 0, west[2] + (east[2] - west[2]) * t]; };
      const fromLake = (s: number, height: number) => { const p = along(s); return hit([p[0], height, p[2] + 30], [0, 0, -1])!; };
      const level = 11.9 + 22 * 3.87;
      expect(fromLake(7.5 * bay, level + 2).object.name).toBe("Aon · window ribbons");
      expect(fromLake(7.5 * bay, level - 0.5).object.name).toBe("Aon · tube shell");
      const column = fromLake(7 * bay, level + 2);
      expect(column.object.name).toBe("Aon · granite piers");
      expect(column.point.z).toBeGreaterThan(along(7 * bay)[2] + 0.6);
      const top = 11.9 + 83 * 3.87;
      expect(fromLake(7.5 * bay, top + 2).object.name).toBe("Aon · window ribbons");
      expect(fromLake(7.5 * bay, top + 4.5).object.name).toBe("Aon · tube shell");
      expect(fromLake(7.5 * bay, 339.2).object.name).toBe("Aon · granite cap");
      expect(meshes.some((mesh) => /louver/.test(mesh.name))).toBe(false);
      // Every notched corner is solid stone: a probe meets each notch's square step, set
      // back from the faces beside it, on the shell painted granite rather than the faces'
      // dark spandrel. [a step corner, the way the step faces, how far along it to probe]
      const stoneAt = (found: THREE.Intersection) => {
        const colors = (found.object as THREE.Mesh).geometry.getAttribute("color");
        return colors.getX(found.face!.a);
      };
      const notches: [Vec3, Vec3, number][] = [
        [world(-87.6212581, 41.8850684), [1, 0, 0], 1.6], // south-east, facing east
        [world(-87.6212688, 41.8855018), [1, 0, 0], -1.7], // north-east, facing east
        [world(-87.6218361, 41.8855244), [-1, 0, 0], 1.6], // north-west, facing west
        [world(-87.6218248, 41.8850607), [-1, 0, 0], 1.6], // south-west, facing west
      ];
      for (const [corner, out, along] of notches) {
        const found = hit([corner[0] + out[0] * 20, 200, corner[2] + along], [-out[0], 0, 0])!;
        expect(found.object.name).toBe("Aon · tube shell");
        near(found.point.x, corner[0], 0.1);
        expect(stoneAt(found), `the notch at ${corner[0].toFixed(1)}, ${corner[2].toFixed(1)} should be stone`).toBeGreaterThan(0.3);
      }
      // The spandrel between floors on the south face is the dark shell.
      expect(stoneAt(fromLake(7.5 * bay, level - 0.5))).toBeLessThan(0.05);
      // The exact mapped outline at grade.
      const groundMesh = meshes.find((mesh) => mesh.name === "Aon · tube shell")!;
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  test("retains the mapped upper street set", () => {
    expect(geographicStreets.some((street) => street.name === "North Michigan Avenue")).toBe(true);
    expect(geographicStreets.every((street) => !street.name.includes("Lower"))).toBe(true);
  }, { timeout: 180_000 });
});

describe("geographic layout in the study", () => {
  let browser!: Browser, page!: Page, originalBounds!: any, originalCamera!: any, errors: string[] = [], externalRequests: string[] = [];
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("opens on the geographic layout, and on the original with ?layout=original", async () => {
    const opened = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const requested: string[] = [];
    opened.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await opened.goto(`${origin}/skyline-study.html`);
    await opened.waitForFunction(() => window.__buildingStudy?.ready);
    const state = () => opened.evaluate(() => ({
      layout: window.__buildingStudy!.layout,
      view: window.__buildingStudy!.activeView,
      pressed: document.querySelector('[data-layout="geographic"]')!.getAttribute("aria-pressed"),
      caption: document.querySelector("#model-caption")!.textContent,
      drawing: document.querySelector<HTMLImageElement>(".reference img")!.getAttribute("src"),
    }));
    expect(await state()).toEqual({ layout: "geographic", view: "skyline", pressed: "true", caption: "01 / geographic study", drawing: "models/skyline-panorama.svg" });
    expect(requested, "the excerpt waits until the original layout is chosen").not.toContain("/models/skyline-reference.svg");
    await opened.locator('[data-layout="original"]').click();
    expect(await state()).toEqual({ layout: "original", view: "skyline", pressed: "false", caption: "01 / original 3D study", drawing: "models/skyline-reference.svg" });
    await opened.goto(`${origin}/skyline-study.html?layout=original`);
    await opened.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await state()).toEqual({ layout: "original", view: "skyline", pressed: "false", caption: "01 / original 3D study", drawing: "models/skyline-reference.svg" });
    await opened.close();
  }, { timeout: 180_000 });

  test("opens on the drawing's skyline camera, fitted to the mapped buildings at every layout", async () => {
    await page.goto(`${origin}/skyline-study.html?layout=original`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    originalBounds = await page.evaluate(() => window.__buildingStudy!.modelBounds);
    originalCamera = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    expect(await page.locator("#dimensions-body tr").count()).toBe(13);
    await page.locator('[data-layout="geographic"]').click();
    await settle(page);
    expect(await page.evaluate(() => [window.__buildingStudy!.layout, window.__buildingStudy!.projection, window.__buildingStudy!.activeView]))
      .toEqual(["geographic", "perspective", "skyline"]);
    // The eye stands where the photograph was taken: on the shore by the Adler
    // Planetarium, 2 m above the street datum. Crain's mapped outline is centred on
    // the geographic origin, so its bounds locate the scene's offset.
    const crainBounds = (await page.evaluate(() => window.__buildingStudy!.modelBounds)).find((b) => b.id === crain)!;
    const eye = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    near(eye[0]! - (crainBounds.min[0]! + crainBounds.max[0]!) / 2, 1471.76, 0.5);
    near(eye[1]!, 2, 1e-6);
    near(eye[2]! - (crainBounds.min[2]! + crainBounds.max[2]!) / 2, 1948.8, 0.5);
    // Mapped roofs and tips land on their drawn positions in the reference frame's
    // layer units. The worst, Kemper's west roof corner, lies 62 units off, 49 of them
    // across the frame; the fit's RMS is 29.9. The same eye and frame hold at every
    // layout, so each point lands on the same spot. The geographic layout frames the
    // panorama, about 2.65 times as wide as it is tall: the skyline test's layouts all have
    // canvases narrower than that, and 1600x700's is wider, so the field of view fits the
    // frame's height there.
    const placed: Record<string, [number, number][]> = {};
    for (const size of [...viewports.map(({ options }) => options.viewport!), { width: 1600, height: 700 }]) {
      await page.setViewportSize(size);
      await settle(page);
      const measured = await page.evaluate(async (landmarks) => {
        const source = await (await fetch((document.querySelector(".reference img") as HTMLImageElement).src)).text();
        const viewBox = (new DOMParser().parseFromString(source, "image/svg+xml").documentElement as unknown as SVGSVGElement).viewBox.baseVal;
        const canvas = document.querySelector("canvas")!.getBoundingClientRect();
        const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
        return landmarks.map(([, id, point]) => {
          const [u, v] = window.__buildingStudy!.projectPoint(id, point);
          return [viewBox.x + (u * canvas.width - (canvas.width - viewBox.width * scale) / 2) / scale, viewBox.y + (v * canvas.height - (canvas.height - viewBox.height * scale) / 2) / scale] as [number, number];
        });
      }, geographicLandmarks);
      let squares = 0;
      geographicLandmarks.forEach(([name, , , drawn], i) => {
        const error = Math.hypot(measured[i]![0] - drawn[0], measured[i]![1] - drawn[1]);
        expect(error, `${name} at ${size.width}x${size.height}`).toBeLessThan(64);
        squares += error * error;
        (placed[name] ||= []).push(measured[i]!);
      });
      expect(Math.sqrt(squares / geographicLandmarks.length), `RMS at ${size.width}x${size.height}`).toBeLessThan(30.3);
    }
    for (const [name, points] of Object.entries(placed)) for (const point of points) {
      expect(Math.hypot(point[0] - points[0]![0], point[1] - points[0]![1]), `${name} holds its drawn place at every layout`).toBeLessThan(0.05);
    }
    // After an orbit, a resize keeps the fixed eye where it is.
    await page.locator("#building").focus();
    await page.keyboard.press("ArrowLeft");
    const orbit = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.activeView)).toBeNull();
    (await page.evaluate(() => window.__buildingStudy!.cameraPosition)).forEach((value, axis) => near(value, orbit[axis]!, 1e-6));
    // Reset returns to the skyline camera from any other view.
    await page.locator('[data-view="top"]').click();
    await page.locator("#reset").click();
    expect(await page.evaluate(() => [window.__buildingStudy!.projection, window.__buildingStudy!.activeView])).toEqual(["perspective", "skyline"]);
  }, { timeout: 180_000 });

  test("shows the orthographic plan with the mapped buildings at published heights", async () => {
    await page.locator('[data-view="top"]').click();
    await settle(page);
    expect(await page.evaluate(() => [window.__buildingStudy!.layout, window.__buildingStudy!.projection, window.__buildingStudy!.activeView]))
      .toEqual(["geographic", "orthographic", "top"]);
    expect(await page.locator("#streets").isEnabled()).toBe(true);
    // In plan, an XY point at the roof and ground must have identical screen
    // coordinates; orthographic projection keeps equal distances at all heights.
    const plan = await page.evaluate(() => {
      const id = "building-crain-communications";
      return [window.__buildingStudy!.projectPoint(id, [0, 0, 0]), window.__buildingStudy!.projectPoint(id, [0, 423, 0]), window.__buildingStudy!.projectPoint(id, [100, 0, 0]), window.__buildingStudy!.projectPoint(id, [0, 0, -100])];
    });
    near(plan[0]![0], plan[1]![0], 1e-5);
    near(plan[0]![1], plan[1]![1], 1e-5);
    expect(plan[2]![0] > plan[0]![0], "east points right").toBe(true);
    expect(plan[3]![1] < plan[0]![1], "north points up").toBe(true);
    const geographicBounds = await page.evaluate(() => window.__buildingStudy!.modelBounds);
    for (const record of geographicBuildings) near(geographicBounds.find((b) => b.id === record.id)!.max[1]!, record.tipHeight, 0.001);
    await expectPlanHolds(page);
  }, { timeout: 180_000 });

  test("pans and zooms to inspect streets, preserving the comparison pose across toggles", async () => {
    await page.locator("#building").focus();
    for (let i = 0; i < 40; i += 1) await page.keyboard.press("+");
    const planBounds = (await page.locator("#building").boundingBox())!;
    const panStart = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    await page.keyboard.down("Shift");
    await page.mouse.move(planBounds.x + planBounds.width / 2, planBounds.y + planBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(planBounds.x + planBounds.width / 2 + 30, planBounds.y + planBounds.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.cameraPosition), "plan can pan to inspect streets at larger scale").not.toEqual(panStart);
    const zoom = await page.evaluate(() => window.__buildingStudy!.zoom);
    near(zoom, 24, 1e-8);
    const pose = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    for (const layout of ["original", "geographic", "original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      await settle(page);
      near(await page.evaluate(() => window.__buildingStudy!.zoom), zoom, 1e-8);
      expect(await page.evaluate(() => window.__buildingStudy!.groundShadows), "plan toggles retain the uncluttered ground").toBe(false);
      const camera = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
      camera.forEach((value: number, axis: number) => near(value, pose[axis]!, 1e-5));
    }
  }, { timeout: 180_000 });

  test("picks mapped buildings and toggles streets", async () => {
    await page.locator('[data-view="top"]').click();
    await settle(page);
    const canvas = (await page.locator("#building").boundingBox())!;
    const center = await page.evaluate(() => window.__buildingStudy!.projectPoint("building-crain-communications", [0, 145, 0]));
    await page.mouse.move(canvas.x + center[0] * canvas.width, canvas.y + center[1] * canvas.height);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "mapped building can be picked").toBe("building-crain-communications");
    expect(await page.locator("#tooltip").textContent()).toMatch(/177.4 m/);
    await page.locator("#streets").click();
    expect(await page.locator("#streets").getAttribute("aria-pressed")).toBe("false");
  }, { timeout: 180_000 });

  test("keeps shadows in elevated custom views", async () => {
    await page.locator('[data-view="heights"]').click();
    await page.locator("#building").focus();
    await page.keyboard.press("+");
    expect(await page.evaluate(() => window.__buildingStudy!.activeView), "zoom leaves the height preset").toBeNull();
    for (const layout of ["original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      expect(await page.evaluate(() => window.__buildingStudy!.groundShadows), "toggle preserves ground shadows in an elevated custom view").toBe(true);
    }
    await settle(page);
    await page.screenshot({ path: "/tmp/skyline-geographic-heights-tested.png" });
  }, { timeout: 180_000 });

  test("restores the original transforms and camera after the round trip", async () => {
    await page.locator('[data-layout="original"]').click();
    await page.locator("#reset").click();
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.modelBounds)).toEqual(originalBounds);
    expect(await page.evaluate(() => window.__buildingStudy!.cameraPosition)).toEqual(originalCamera);
    expect(await page.evaluate(() => window.__buildingStudy!.projection)).toBe("perspective");
  }, { timeout: 180_000 });

  test("respects reduced motion and stays idle on mobile", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('[data-layout="geographic"]').click();
    expect(await page.locator("#turntable").isDisabled()).toBe(true);
    expect(await page.evaluate(() => window.__buildingStudy!.turning)).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#building").scrollIntoViewIfNeeded();
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "table scrolls without widening mobile page").toBe(true);
    const projected = await page.evaluate(() => window.__buildingStudy!.modelBounds.map(({ id, min, max }) => ({ id, min, max })));
    // The eight drawn buildings, and 330 North Wabash, the Blue Cross and Blue Shield Tower,
    // 340 on the Park, The Buckingham and Millennium Park Plaza, which only the geographic
    // layout models.
    expect(projected.length).toBe(13);
    // A portrait phone's width binds the plan's frame; it still holds every footprint.
    await page.locator('[data-view="top"]').click();
    await settle(page);
    await expectPlanHolds(page);
    await page.screenshot({ path: "/tmp/skyline-geographic-mobile.png" });
    const frame = await page.evaluate(() => window.__buildingStudy!.renderCount);
    await page.waitForTimeout(180);
    expect(await page.evaluate(() => window.__buildingStudy!.renderCount), "geographic mode stays idle").toBe(frame);
  }, { timeout: 180_000 });

  test("loads only local assets without page errors", async () => {
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  }, { timeout: 180_000 });
});
