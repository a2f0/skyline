import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "../models/building-kit.js";
import { geographicBuildings, geographicStreets } from "../models/skyline-geography-data.js";
import { projectGround, footprintMetrics, createGeographicBuilding } from "../models/skyline-geography.js";
import { floorLevel, onePrudentialLevels, wallStations } from "../models/one-prudential-tower.js";
import { crain, geographicLandmarks } from "./skyline-landmarks.js";
import { viewports } from "./study-fidelity.js";


const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a: number, b: number, tolerance: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);

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
      "Michigan Plaza S": [117.1, 139, 168.6], Trump: [-123.3, 449.4, 423.2],
      "One Prudential": [152, 11.1, 278], "Two Prudential": [186.9, 65.7, 303.3], Aon: [284.2, 50.6, 362.5],
    };
    expect(geographicBuildings.length).toBe(8);
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
    test("keeps the mapped tier roofs, spire joints and setback walls", () => {
      const model = models["Trump"]!;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = (hitOrigin: Vec3, direction: Vec3, targets: THREE.Object3D[] = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // The mapped tier boundaries: a downward ray meets each tier's roof at its
      // OSM part height where the next tier does not cover it.
      near(hit([-95, 100, -450], [0, -1, 0])!.point.y, 60, 0.001);
      near(hit([-150, 150, -430], [0, -1, 0])!.point.y, 120, 0.001);
      near(hit([-104, 250, -450], [0, -1, 0])!.point.y, 200, 0.001);
      near(hit([-115, 360, -450], [0, -1, 0])!.point.y, 345, 0.001);
      near(hit([-126, 370, -450], [0, -1, 0])!.point.y, 357, 0.001);
      // The three-section mast: mapped joints at 380 and 400, the published tip
      // above them, and a seated base on the crown roof.
      near(hit([-121.45, 430, -461.04], [0, -1, 0])!.point.y, 423.2, 0.001);
      near(hit([-121.45, 410, -461.04], [0, -1, 0])!.point.y, 400, 0.001);
      near(hit([-121.45, 390, -461.04], [0, -1, 0])!.point.y, 380, 0.001);
      near(hit([-121.45, 350, -461.04], [0, 1, 0])!.point.y, 357, 0.001);
      // The mapped setbacks: the east wall stands on the base tier line, then
      // steps 15 m west for the shaft, while the west wall leaves the Wabash lot
      // line for the shaft. Glazed facade detail must be the first surface.
      near(hit([-90, 90, -455], [-1, 0, 0])!.point.x, -98.509, 0.02);
      near(hit([-90, 150, -455], [-1, 0, 0])!.point.x, -98.579, 0.02);
      near(hit([-90, 250, -455], [-1, 0, 0])!.point.x, -113.464, 0.02);
      near(hit([-90, 350, -455], [-1, 0, 0])!.point.x, -115.182, 0.02);
      near(hit([-165, 90, -430], [1, 0, 0])!.point.x, -161.684, 0.02);
      near(hit([-165, 150, -430], [1, 0, 0])!.point.x, -146.86, 0.02);
      // The glazed south face carries panes, bands and mullions rather than a
      // bare mapped shell.
      const south = hit([-120, 300, -380], [0, 0, -1]);
      expect(south!.object.name).toMatch(/glaz|mullion/);
      near(south!.point.z, -427.198, 0.02);
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
    test("keeps the mapped eave, pyramid, spire and setback tiers", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Two Prudential")!;
      const model = models["Two Prudential"]!;
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
      // The mapped crown: the peak over the outline's area centroid, a setback
      // between the peak and the eave, and the published spire tip.
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
      const apex: Vec3 = [centroid[0], 277, centroid[1]];
      // Beside the spire's own foot, so the ray meets the topmost setback
      // rather than running down the spire's axis.
      near(hit([apex[0], 320, apex[2] + 1.6], [0, -1, 0])!.point.y, 277, 0.001);
      // The crown shrinks about that centroid, not about the mean of the
      // traced vertices: this outline carries three extra points down its west
      // wall, and a crown centred on their mean would still be at its peak
      // 5.6 m away from the building's own centre.
      const vertexMean: Vec3 = [projected.reduce((sum, p) => sum + p[0], 0) / projected.length, 320, projected.reduce((sum, p) => sum + p[1], 0) / projected.length];
      expect(Math.hypot(vertexMean[0] - apex[0], vertexMean[2] - apex[2])).toBeGreaterThan(5);
      expect(hit(vertexMean, [0, -1, 0])!.point.y).toBeLessThan(276);
      const facet = world(-87.622695, 41.885291);
      const facetHit = hit([facet[0], 300, facet[2]], [0, -1, 0])!;
      expect(facetHit.point.y).toBeGreaterThan(250);
      expect(facetHit.point.y).toBeLessThan(277);
      // The spire: a face beside the tip (the exact 303.3 m tip is pinned by
      // the generic bounds check). Five centimetres off the axis of a tapered
      // face the surface is strictly below the tip, so a blunt or flat-topped
      // spire fails here.
      const spireFace = hit([apex[0] + 0.05, 350, apex[2]], [0, -1, 0])!;
      expect(spireFace.object.name).toBe("Two Prudential · spire");
      expect(spireFace.point.y).toBeGreaterThan(273);
      expect(spireFace.point.y).toBeLessThan(303.3);
      // The crown is a stack of flat setbacks, not a smooth cone: two rays at
      // different distances from the axis land on one ledge, and the rings
      // shrink as they rise.
      const ledge = (offset: number) => hit([apex[0], 320, apex[2] + offset], [0, -1, 0])!.point.y;
      expect(ledge(11.2)).toBe(ledge(12));
      expect(ledge(11.2)).toBeGreaterThan(ledge(20));
      expect(ledge(20)).toBeGreaterThan(240);
      // Ten of them, at one floor's rise each from the mapped eave to the
      // mapped peak. Sweeping the setback mesh outward finds every ledge top,
      // so a crown with nine steps, or with them unevenly spaced, fails.
      const setbacks = meshes.filter((mesh) => mesh.name === "Two Prudential · crown setbacks");
      const tops = new Set<number>();
      for (let radius = 0.5; radius < 26; radius += 0.5) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Vec2[]) {
          const contact = hit([apex[0] + dx * radius, 320, apex[2] + dz * radius], [0, -1, 0], setbacks);
          if (contact && contact.point.y > 240.01) tops.add(Math.round(contact.point.y * 100) / 100);
        }
      }
      expect([...tops].sort((a, b) => a - b)).toEqual([243.7, 247.4, 251.1, 254.8, 258.5, 262.2, 265.9, 269.6, 273.3, 277]);
      // The stepped section on the mapped south wall. The mapped tracing splits
      // each wall into several nearly collinear edges, so consecutive ones
      // facing the same way are merged into one facade first, the same way the
      // model does: composing on a single traced edge would give the west
      // facade a 28.4 m frame instead of a 56.0 m one.
      const edges = projected.map((p, i) => {
        const q = projected[(i + 1) % projected.length]!;
        const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
        return { start: p, end: q, length, tangent: [(q[0] - p[0]) / length, (q[1] - p[1]) / length] as Vec2, normal: [-(q[1] - p[1]) / length, (q[0] - p[0]) / length] as Vec2 };
      });
      const groups: (typeof edges)[] = [];
      for (const edge of edges) {
        const last = groups.at(-1)?.[0];
        if (last && last.normal[0] * edge.normal[0] + last.normal[1] * edge.normal[1] > 0.999) groups.at(-1)!.push(edge);
        else groups.push([edge]);
      }
      const first = groups[0]![0]!, last = groups.at(-1)![0]!;
      if (groups.length > 1 && first.normal[0] * last.normal[0] + first.normal[1] * last.normal[1] > 0.999) groups[0]!.unshift(...groups.pop()!);
      const merged = groups.map((group) => {
        const start = group[0]!.start, end = group.at(-1)!.end;
        const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
        const tangent: Vec2 = [(end[0] - start[0]) / length, (end[1] - start[1]) / length];
        return { start, length, tangent, normal: [-tangent[1], tangent[0]] as Vec2 };
      });
      const facing = (axis: 0 | 1, sign: number) => merged.filter((entry) => entry.normal[axis] * sign > 0.9).reduce((longest, entry) => entry.length > longest.length ? entry : longest);
      // The fitted model's own composition fractions, restated here rather
      // than imported, so a change to them has to be made twice.
      const tierFractions = [0.707, 0.84], arrowFraction = 11.7 / 59.01, sideArrowFraction = 11.7 / 38.86, chevronFraction = 0.58;
      const wall = facing(1, 1);
      near(wall.length, 40.81, 0.02);
      near(facing(1, -1).length, 40.7, 0.02);
      near(facing(0, 1).length, 55.44, 0.02);
      near(facing(0, -1).length, 56.04, 0.02);
      const middleOf = (entry: typeof wall): Vec2 => [entry.start[0] + entry.tangent[0] * entry.length / 2, entry.start[1] + entry.tangent[1] * entry.length / 2];
      const probeOn = (entry: typeof wall, across: number, y: number) => {
        const middle = middleOf(entry);
        const from: Vec3 = [middle[0] + entry.tangent[0] * across + entry.normal[0] * 40, y, middle[1] + entry.tangent[1] * across + entry.normal[1] * 40];
        const contact = hit(from, [-entry.normal[0], 0, -entry.normal[1]]);
        if (!contact) return null;
        return { proud: (contact.point.x - middle[0]) * entry.normal[0] + (contact.point.z - middle[1]) * entry.normal[1], name: contact.object.name };
      };
      // Both tiered facades carry the same composition, measured as fractions
      // of each one's own width so the mirrored north wall is asserted as
      // positively as the south: remove it and these fail.
      for (const front of [wall, facing(1, -1)]) {
        const lowerHalf = front.length * tierFractions[0]! / 2, middleHalf = front.length * tierFractions[1]! / 2;
        const arrowHalf = front.length * arrowFraction / 2, chevronHalf = front.length * chevronFraction / 2;
        const probe = (across: number, y: number) => probeOn(front, across, y)!;
        // Across the section: the pointed arrow stands 4.96 m proud of the
        // mapped wall, the lower tier 4.0 m, the middle tier 2.27 m, and
        // beyond both tiers only the wall's own relief projects at all.
        near(probe(0, 100).proud, 4.96, 0.03);
        near(probe(lowerHalf * 0.55, 100).proud, 4.0, 0.03);
        near(probe(middleHalf * 0.95, 100).proud, 2.27, 0.03);
        expect(probe(front.length / 2 - 2.4, 100).proud).toBeLessThan(0.35);
        // The arrow is as wide as the fitted model's, 11.7 m over its 59.01 m
        // facade: inside that edge the first surface is the arrow, outside it
        // the tier behind.
        near(probe(arrowHalf - 0.6, 100).proud, 4.96, 0.03);
        near(probe(arrowHalf + 1, 100).proud, 4.07, 0.03);
        // The middle tier's face is bare where the lower tier covers it and
        // glazed above that gable, so the glazing stops exactly at the cover.
        near(probe(lowerHalf, 100).proud, 4.0, 0.03);
        near(probe(lowerHalf, 190).proud, 2.2, 0.03);
        near(probe(middleHalf * 0.95, 190).proud, 2.27, 0.03);
        // Above each tier's peak the section steps back to the next surface.
        expect(probe(middleHalf * 0.6, 230).proud).toBeLessThan(0.35);
        // Each level itself, not merely a bracket around it: a downward ray
        // into the depth band only that tier occupies meets its ridge, and one
        // near its end meets its shoulder. These are the fitted model's levels
        // scaled by 240/250.916, so the values they replaced would fail here.
        const ridge = (across: number, depth: number) => {
          const middle = middleOf(front);
          return hit([middle[0] + front.tangent[0] * across + front.normal[0] * depth, 320, middle[1] + front.tangent[1] * across + front.normal[1] * depth], [0, -1, 0])!.point.y;
        };
        near(ridge(0, 3.5), 180.63, 0.01);
        near(ridge(lowerHalf * 0.9, 3.5), 158.22, 0.01);
        near(ridge(0, 1.6), 224.79, 0.01);
        near(ridge(middleHalf * 0.9, 1.6), 198.96, 0.01);
        // The chevron over the eave, sampled off the arrow that shares its
        // peak: two points down its slope pin the peak and the width together.
        near(ridge(0, 0.1), 260.48, 0.01);
        near(ridge(chevronHalf * 0.5, 0.1), 250.22, 0.02);
        near(ridge(chevronHalf * 0.85, 0.1), 243.04, 0.02);
        const arrowTop = probe(0, 250);
        expect(arrowTop.proud).toBeGreaterThan(0.5);
        expect(arrowTop.proud).toBeLessThan(1.2);
        // All three arrows, each at its own depth band, where nothing else
        // reaches: the lower one over the lower tier's front, the middle one
        // over the middle tier's, and the top one on the shaft wall. Each
        // carries its gable's own peak, and the middle one's shoulder pins its
        // head's slope, so an arrow cannot be omitted or stop short.
        near(ridge(0, 4.5), 180.63, 0.01);
        near(ridge(0, 2.7), 224.79, 0.01);
        near(ridge(0, 0.7), 260.48, 0.01);
        near(ridge(arrowHalf - 0.3, 2.7), 218.8, 0.02);
        // The pier heads step floor by floor into the gable rather than
        // following it as a clean diagonal: each lands on a floor line, they
        // rise toward the centre, and at least one neighbouring pair is
        // exactly one floor apart.
        const bays = Math.max(1, Math.round(lowerHalf * 2 / 3.5)), bayWidth = lowerHalf * 2 / bays;
        const heads: number[] = [];
        for (let i = 0; i <= bays; i += 1) {
          const centred = Math.max(-lowerHalf + 0.42, Math.min(lowerHalf - 0.42, -lowerHalf + i * bayWidth));
          if (centred > -arrowHalf - 0.5) break;
          // Against the pier mesh alone: the coping over them occupies the
          // same depth band.
          const middle = middleOf(front);
          const top = hit([middle[0] + front.tangent[0] * centred + front.normal[0] * 4.2, 320, middle[1] + front.tangent[1] * centred + front.normal[1] * 4.2], [0, -1, 0], meshes.filter((mesh) => mesh.name === "Two Prudential · piers and bands"))!.point.y;
          const floors = (top + 0.12 - 0.3) / 3.75;
          near(floors, Math.round(floors), 0.002);
          heads.push(Math.round(floors));
        }
        expect(heads.length).toBeGreaterThan(2);
        for (let i = 1; i < heads.length; i += 1) expect(heads[i]!, "pier heads rise toward the gable's peak").toBeGreaterThan(heads[i - 1]!);
        expect(heads.some((value, i) => i > 0 && value - heads[i - 1]! === 1), "a neighbouring pair of pier heads is one floor apart").toBe(true);
      }
      // The east and west facades take their arrow from the fitted model's own
      // east face, 11.7 m over 38.86 m, so it is half as wide again in
      // proportion. Inside its edge the arrow is the first surface; outside it
      // the mapped wall.
      for (const side of [facing(0, 1), facing(0, -1)]) {
        const arrowHalf = side.length * sideArrowFraction / 2, chevronHalf = side.length * chevronFraction / 2;
        near(probeOn(side, 0, 150)!.proud, 0.95, 0.03);
        expect(probeOn(side, 0, 150)!.name).toMatch(/pier/);
        near(probeOn(side, 0, 250)!.proud, 1.01, 0.03);
        near(probeOn(side, arrowHalf - 0.6, 150)!.proud, 0.95, 0.03);
        expect(probeOn(side, arrowHalf + 1, 150)!.proud).toBeLessThan(0.35);
        const middle = middleOf(side);
        const slope = (across: number) => hit([middle[0] + side.tangent[0] * across + side.normal[0] * 0.1, 320, middle[1] + side.tangent[1] * across + side.normal[1] * 0.1], [0, -1, 0])!.point.y;
        near(slope(0), 259.44, 0.01);
        near(slope(chevronHalf * 0.85), 242.9, 0.02);
      }
      // Nothing is drawn inside the lower tier. An exterior ray cannot see
      // buried geometry, so this reads the mesh itself: no pane or pier may
      // sit within the tier's own volume. The gable it hides behind folds at
      // the facade's centre, so a triangle crossing that fold is sampled there
      // too: its vertices can straddle the ridge while its interior dips under
      // it. Only the arrow's own stations are skipped, where its back
      // deliberately laps 2 cm into the tier.
      for (const entry of [wall, facing(1, -1)]) {
        const middle = middleOf(entry), lowerHalf = entry.length * tierFractions[0]! / 2;
        const arrowHalf = entry.length * arrowFraction / 2;
        const local = (x: number, y: number, z: number) => {
          const dx = x - middle[0], dz = z - middle[1];
          return [dx * entry.tangent[0] + dz * entry.tangent[1], y, dx * entry.normal[0] + dz * entry.normal[1]] as Vec3;
        };
        for (const mesh of meshes) {
          if (!/glaz|pier/.test(mesh.name)) continue;
          const position = mesh.geometry.getAttribute("position");
          for (let i = 0; i < position.count; i += 3) {
            const corners = [0, 1, 2].map((k) => local(position.getX(i + k), position.getY(i + k), position.getZ(i + k)));
            const samples = [...corners];
            for (let k = 0; k < 3; k += 1) {
              const a = corners[k]!, b = corners[(k + 1) % 3]!;
              if ((a[0] > 0) === (b[0] > 0)) continue;
              const t = a[0] / (a[0] - b[0]);
              samples.push(a.map((value, axis) => value + t * (b[axis]! - value)) as Vec3);
            }
            for (const [across, y, depth] of samples) {
              const gable = 180.63 - (180.63 - 155.73) * Math.min(1, Math.abs(across) / lowerHalf);
              const inside = Math.abs(across) > arrowHalf + 0.05 && Math.abs(across) < lowerHalf - 0.02
                && depth > 2.21 && depth < 3.99 && y < gable - 0.02;
              expect(inside, `${mesh.name} buried in the lower tier at ${across.toFixed(2)}, ${depth.toFixed(2)}, ${y.toFixed(2)} under ${gable.toFixed(2)}`).toBe(false);
            }
          }
        }
      }
      // Nor inside a coping. The band is 1.41 m deep and stands 0.42 m proud
      // of the face, so a pane or pier reaching its underside disappears
      // behind it. Where the coping is exposed - outside the arrow it dies
      // into - nothing else may enter its band.
      for (const entry of [wall, facing(1, -1)]) {
        const middle = middleOf(entry), arrowHalf = entry.length * arrowFraction / 2;
        for (const [fraction, shoulder, peak, front] of [[tierFractions[0]!, 155.73, 180.63, 4], [tierFractions[1]!, 196.09, 224.79, 2.2]] as [number, number, number, number][]) {
          const half = entry.length * fraction / 2;
          for (const mesh of meshes) {
            if (!/glaz|pier/.test(mesh.name)) continue;
            const position = mesh.geometry.getAttribute("position");
            for (let i = 0; i < position.count; i += 1) {
              const dx = position.getX(i) - middle[0], dz = position.getZ(i) - middle[1];
              const across = dx * entry.tangent[0] + dz * entry.tangent[1], depth = dx * entry.normal[0] + dz * entry.normal[1];
              if (Math.abs(across) < arrowHalf + 0.2 || Math.abs(across) > half - 0.12) continue;
              if (depth < front - 0.11 || depth > front + 0.43) continue;
              const head = peak - (peak - shoulder) * Math.min(1, Math.abs(across) / half);
              expect(position.getY(i) < head - 1.4 + 0.001, `${mesh.name} reaches into the coping at ${across.toFixed(2)}, ${position.getY(i).toFixed(2)} under ${head.toFixed(2)}`).toBe(true);
            }
          }
        }
      }
      // Detail crosses the joints where the mapped tracing splits a wall. The
      // north wall is two traced edges; a pane spanning their joint is the
      // same surface at the joint as on either side of it. Reserving clearance
      // at each traced end instead would leave a 19 cm break up its full
      // height.
      const split = groups.find((group) => group.length > 1 && group[0]!.normal[1] < -0.9)!;
      const northWall = facing(1, -1);
      const joint = split.slice(0, -1).reduce((sum, edge) => sum + edge.length, 0) - northWall.length / 2;
      for (const height of [100, 140]) {
        const surface = probeOn(northWall, joint, height)!;
        expect(surface.name).toMatch(/glaz/);
        for (const offset of [-0.2, 0.2]) {
          const beside = probeOn(northWall, joint + offset, height)!;
          expect(beside.name, `north wall pane breaks at its traced joint at ${height} m`).toBe(surface.name);
          near(beside.proud, surface.proud, 0.01);
        }
      }
      // The chevron covers the middle bays only and the crown has already
      // stepped back inside the mapped wall, so at the south wall's own corner
      // that elevation is open sky. A full-width chevron or a shaft rising
      // past its eave would not be.
      expect(probeOn(wall, wall.length / 2 - 1.4, 245)).toBeNull();
      // Panes and piers are the first surface on the mapped east wall.
      const eastMid = world(-87.6225092, 41.885442);
      const east = hit([eastMid[0] + 30, 100, eastMid[2]], [-1, 0, 0]);
      expect(east!.object.name).toMatch(/glaz|pier/);
      // The exact mapped outline at grade.
      const groundMesh = meshes.find((mesh) => mesh.name === "Two Prudential · limestone shell")!;
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
      // between floors, one on a bay line meets a column, and higher up the louvered crown
      // and the granite cap.
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
      expect(fromLake(7.5 * bay, 330).object.name).toBe("Aon · crown louvers");
      expect(fromLake(7.5 * bay, 339.2).object.name).toBe("Aon · granite cap");
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

  test("opens on the drawing's skyline camera, fitted to the mapped buildings at every layout", async () => {
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    originalBounds = await page.evaluate(() => window.__buildingStudy!.modelBounds);
    originalCamera = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    expect(await page.locator("#dimensions-body tr").count()).toBe(8);
    await page.locator('[data-layout="geographic"]').click();
    await settle(page);
    expect(await page.evaluate(() => [window.__buildingStudy!.layout, window.__buildingStudy!.projection, window.__buildingStudy!.activeView]))
      .toEqual(["geographic", "perspective", "skyline"]);
    // The eye stands where the photograph was taken: on the shore by the Adler
    // Planetarium, 2 m above the street datum. Crain's mapped outline is centred on
    // the geographic origin, so its bounds locate the scene's offset.
    const crainBounds = (await page.evaluate(() => window.__buildingStudy!.modelBounds)).find((b) => b.id === crain)!;
    const eye = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    near(eye[0]! - (crainBounds.min[0]! + crainBounds.max[0]!) / 2, 1458.2, 0.5);
    near(eye[1]!, 2, 1e-6);
    near(eye[2]! - (crainBounds.min[2]! + crainBounds.max[2]!) / 2, 1938.13, 0.5);
    // Mapped roofs and tips land on their drawn positions in the reference frame's
    // layer units. The worst are drawn heights that differ from the published ones,
    // such as Two Prudential's eaves, drawn about 100 units below their mapped 240 m;
    // the fit's RMS is 47.6. The same eye and frame hold at every layout, so each point
    // lands on the same spot. The skyline test's layouts all have canvases narrower than
    // the frame; 1440x800's is wider, so the field of view fits the frame's height.
    const placed: Record<string, [number, number][]> = {};
    for (const size of [...viewports.map(({ options }) => options.viewport!), { width: 1440, height: 800 }]) {
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
        expect(error, `${name} at ${size.width}x${size.height}`).toBeLessThan(110);
        squares += error * error;
        (placed[name] ||= []).push(measured[i]!);
      });
      expect(Math.sqrt(squares / geographicLandmarks.length), `RMS at ${size.width}x${size.height}`).toBeLessThan(48.2);
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
    expect(projected.length).toBe(8);
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
