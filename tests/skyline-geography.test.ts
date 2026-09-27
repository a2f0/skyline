import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "../models/building-kit.js";
import { geographicBuildings, geographicStreets } from "../models/skyline-geography-data.js";
import { projectGround, footprintMetrics, createGeographicBuilding } from "../models/skyline-geography.js";


const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a: number, b: number, tolerance: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);

describe("mapped skyline geography", () => {
  const models: Record<string, BuildingModel> = {};
  beforeAll(() => {
    for (const record of geographicBuildings) models[record.shortName] = createGeographicBuilding(record);
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
    test("keeps the mapped roof slopes, flat cap and glazed facades", () => {
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
      // OSM's downhill bearing warp: height descends from each part's stated
      // top along the 133° bearing. Independent samples pin the flat 152.5 m
      // cap and the 172.4/75 and 177.4/73 sloped roofs.
      const radians = Math.PI / 180;
      const slope = (coordinates: [number, number][], top: number, fall: number) => {
        const points = coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
        const along = (p: Vec2) => p[0] * Math.sin(133 * radians) - p[1] * Math.cos(133 * radians);
        const projections = points.map(along);
        const min = Math.min(...projections), span = Math.max(...projections) - min;
        return (p: Vec2) => top - fall * (along(p) - min) / span;
      };
      const flatTop = world(-87.62512, 41.88494);
      near(hit([flatTop[0], 200, flatTop[2]], [0, -1, 0])!.point.y, 152.5, 0.001);
      const part228 = record.parts.find((p) => p.way === 284816228)!, part229 = record.parts.find((p) => p.way === 284816229)!;
      const roof228 = slope(part228.coordinates, part228.top, part228.roofSlope!.height);
      const roof229 = slope(part229.coordinates, part229.top, part229.roofSlope!.height);
      for (const probe of [world(-87.62487, 41.88468), world(-87.62505, 41.88480)]) {
        const expected = roof228([probe[0], probe[2]]);
        near(hit([probe[0], 200, probe[2]], [0, -1, 0])!.point.y, expected, 0.05);
      }
      const northTip = world(-87.62476, 41.88502);
      near(hit([northTip[0], 200, northTip[2]], [0, -1, 0])!.point.y, roof229([northTip[0], northTip[2]]), 0.05);
      // The dark seam follows the mapped diagonal between the two sloped parts.
      const seamMid = world(-87.62496155, 41.88478375);
      expect(hit([seamMid[0], 200, seamMid[2]], [0, -1, 0])!.object.name).toBe("Crain · roof seam");
      // Panes and mullions are the first surface on the mapped south wall,
      // probed from outside the closed shell. The wall jogs at
      // (-87.624879, 41.8846221), so probes follow the kinked outline.
      const southCorners = [world(-87.6251984, 41.8846185), world(-87.624879, 41.8846221), world(-87.624814, 41.8846217)];
      const southProbe = (fraction: number): Vec3 => {
        const lengths = [0, 1].map((i) => Math.hypot(southCorners[i + 1]![0] - southCorners[i]![0], southCorners[i + 1]![2] - southCorners[i]![2]));
        const target = fraction * (lengths[0]! + lengths[1]!);
        const index = target <= lengths[0]! ? 0 : 1;
        const t = (target - (index === 1 ? lengths[0]! : 0)) / lengths[index]!;
        return southCorners[index]!.map((v, axis) => v + (southCorners[index + 1]![axis]! - v) * t) as Vec3;
      };
      for (const fraction of [0.25, 0.6]) {
        const probe = southProbe(fraction);
        const south = hit([probe[0], 100, probe[2] + 30], [0, 0, -1]);
        expect(south!.object.name).toMatch(/glaz|mullion/);
        expect(south!.point.z).toBeGreaterThan(probe[2] + 0.02);
        expect(south!.point.z).toBeLessThan(probe[2] + 0.2);
      }
      // The parts' outlines contain internal seams, so grade carries their
      // vertices too; every mapped footprint corner must still be present.
      const groundMesh = meshes.find((mesh) => mesh.name === "Crain · mapped stone shell")!;
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
    test("keeps the mapped tower, penthouse, mast and punch-card facade", () => {
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
      // The interior roof under the parapet, the east wing's estimated roof,
      // the penthouse at the mapped 183.2 m tower top, and the mapped mast
      // rising to the 278 m tip.
      const interior = world(-87.6231, 41.88481);
      near(hit([interior[0], 200, interior[2]], [0, -1, 0])!.point.y, 181.2, 0.001);
      const eastWing = world(-87.6226, 41.88495);
      near(hit([eastWing[0], 100, eastWing[2]], [0, -1, 0])!.point.y, 44.7, 0.001);
      const mastPart = record.parts.find((p) => p.way === 685493614)!;
      const mastPoints = mastPart.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      const mastCenter: Vec3 = [
        mastPoints.reduce((sum, p) => sum + p[0], 0) / mastPoints.length,
        0,
        mastPoints.reduce((sum, p) => sum + p[1], 0) / mastPoints.length,
      ];
      // The penthouse top, probed beside the mast ring so the ray stays
      // outside the single-sided mast walls.
      near(hit([mastCenter[0] + 2.5, 200, mastCenter[2]], [0, -1, 0])!.point.y, 183.2, 0.001);
      near(hit([mastCenter[0], 300, mastCenter[2]], [0, -1, 0])!.point.y, 278, 0.001);
      // Panes and piers are the first surface on the mapped tower's south and
      // east walls, probed from outside the closed shell.
      const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((v, axis) => v + (b[axis]! - v) * t) as Vec3;
      const southMid = lerp(world(-87.6234169, 41.8847507), world(-87.6227902, 41.8847615), 0.5);
      const south = hit([southMid[0], 100, southMid[2] + 30], [0, 0, -1]);
      expect(south!.object.name).toMatch(/glaz|pier/);
      expect(south!.point.z).toBeGreaterThan(southMid[2] + 0.005);
      expect(south!.point.z).toBeLessThan(southMid[2] + 0.4);
      const eastMid = lerp(world(-87.6227902, 41.8847615), world(-87.6227905, 41.8849616), 0.5);
      const eastWall = hit([eastMid[0] + 30, 100, eastMid[2]], [-1, 0, 0]);
      expect(eastWall!.object.name).toMatch(/glaz|pier/);
      expect(eastWall!.point.x).toBeGreaterThan(eastMid[0] + 0.005);
      expect(eastWall!.point.x).toBeLessThan(eastMid[0] + 0.4);
      // The tower and wing parts share interior edges, so grade carries their
      // vertices too; every mapped footprint corner must still be present.
      const groundMesh = meshes.find((mesh) => mesh.name === "One Prudential · limestone shell")!;
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
      const probe = (across: number, y: number) => probeOn(wall, across, y);
      // Across the section: the pointed arrow stands 4.96 m proud of the mapped
      // wall, the lower tier 4.07 m, the middle tier 2.27 m, and beyond both
      // tiers only the wall's own relief projects at all.
      near(probe(0, 100)!.proud, 4.96, 0.03);
      near(probe(8, 100)!.proud, 4.07, 0.03);
      near(probe(16, 100)!.proud, 2.27, 0.03);
      expect(probe(16, 100)!.name).toMatch(/glaz/);
      expect(probe(18, 100)!.proud).toBeLessThan(0.35);
      // The middle tier's face is bare where the lower tier covers it and
      // glazed above that gable, so the glazing stops exactly at the cover.
      near(probe(14.5, 100)!.proud, 2.2, 0.01);
      expect(probe(14.5, 100)!.name).toMatch(/tier/);
      near(probe(14.5, 190)!.proud, 2.27, 0.01);
      expect(probe(14.5, 190)!.name).toMatch(/glaz/);
      // Above each tier's peak the section steps back to the next surface.
      near(probe(8, 190)!.proud, 2.27, 0.03);
      expect(probe(8, 230)!.proud).toBeLessThan(0.35);
      expect(probe(14.5, 230)!.proud).toBeLessThan(0.35);
      // Nothing is drawn inside the lower tier. An exterior ray cannot see
      // buried geometry, so this reads the mesh itself: no pane or pier may
      // sit within the tier's own volume, allowing the 2 cm lap the arrow's
      // back deliberately takes into it. The gable it hides behind folds at
      // the facade's centre, so a triangle crossing that fold is sampled there
      // too: its vertices can straddle the ridge while its interior dips under
      // it.
      for (const entry of [facing(1, 1), facing(1, -1)]) {
        const middle = middleOf(entry), lowerHalf = entry.length * 0.707 / 2;
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
              // From just outside the middle tier's own face, where its panes
              // stand, to just inside the lower tier's front, which the
              // arrow's back deliberately laps 2 cm into.
              const inside = Math.abs(across) < lowerHalf - 0.02 && depth > 2.21 && depth < 3.9 && y < gable - 0.02;
              expect(inside, `${mesh.name} buried in the lower tier at ${across.toFixed(2)}, ${depth.toFixed(2)}, ${y.toFixed(2)} under ${gable.toFixed(2)}`).toBe(false);
            }
          }
        }
      }
      // Each level itself, not merely a bracket around it: a downward ray into
      // the depth band only that tier occupies meets its ridge, and one near
      // its end meets its shoulder. These are the fitted model's levels scaled
      // by 240/250.916, so the values they replaced would fail here.
      const ridge = (across: number, depth: number) => {
        const middle = middleOf(wall);
        return hit([middle[0] + wall.tangent[0] * across + wall.normal[0] * depth, 320, middle[1] + wall.tangent[1] * across + wall.normal[1] * depth], [0, -1, 0])!.point.y;
      };
      near(ridge(0, 3.5), 180.63, 0.01);
      near(ridge(14.38, 3.5), 155.81, 0.02);
      near(ridge(0, 1.6), 224.79, 0.01);
      near(ridge(17.09, 1.6), 196.17, 0.02);
      near(ridge(0, 0.1), 260.48, 0.01);
      // The chevrons themselves, sampled off the arrow that shares their peak:
      // two points down each slope pin both the peak and the width, so a
      // missing or mis-sized chevron on any facade fails here.
      near(ridge(8, 0.1), 246.61, 0.02);
      near(ridge(10, 0.1), 243.14, 0.02);
      const slope = (entry: typeof wall, across: number) => {
        const middle = middleOf(entry);
        return hit([middle[0] + entry.tangent[0] * across + entry.normal[0] * 0.1, 320, middle[1] + entry.tangent[1] * across + entry.normal[1] * 0.1], [0, -1, 0])!.point.y;
      };
      near(slope(facing(0, 1), 12), 244.91, 0.02);
      near(slope(facing(0, -1), 12), 245.07, 0.02);
      // The chevron and its arrow carry the composition over the eave, and the
      // east and west facades carry the same arrow centred on their own merged
      // width rather than on one traced run.
      const chevron = probe(0, 250)!;
      expect(chevron.proud).toBeGreaterThan(0.5);
      expect(chevron.proud).toBeLessThan(1.2);
      near(probe(6, 246)!.proud, 0.22, 0.08);
      for (const side of [facing(0, 1), facing(0, -1)]) {
        near(probeOn(side, 0, 150)!.proud, 0.95, 0.03);
        expect(probeOn(side, 0, 150)!.name).toMatch(/pier/);
        near(probeOn(side, 0, 250)!.proud, 1.01, 0.03);
      }
      // The chevron covers the middle bays only and the crown has already
      // stepped back inside the mapped wall, so just outside the chevron the
      // first surface is the crown and at the mapped corner there is nothing.
      // A full-width chevron or a shaft rising past its eave would fail both.
      const beyond = probe(15, 245)!;
      expect(beyond.name).toMatch(/crown/);
      expect(beyond.proud).toBeLessThan(-1);
      expect(probe(19, 245)).toBeNull();
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
    test("keeps the mapped shaft, enclosure, mast and granite tube", () => {
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
      // The interior roof under the parapet (west of the rooftop enclosure),
      // the enclosure at its mapped 346.3 m top, and the inferred antenna at
      // the published tip.
      const interior = world(-87.62178, 41.88527);
      near(hit([interior[0], 380, interior[2]], [0, -1, 0])!.point.y, 340, 0.001);
      const enclosurePart = record.parts.find((p) => p.way === 284775635)!;
      const enclosurePoints = enclosurePart.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
      const enclosureCenter: Vec3 = [
        enclosurePoints.reduce((sum, p) => sum + p[0], 0) / enclosurePoints.length,
        0,
        enclosurePoints.reduce((sum, p) => sum + p[1], 0) / enclosurePoints.length,
      ];
      // The enclosure at its mapped 346.3 m top, probed beside the mast.
      near(hit([enclosureCenter[0] + 2, 380, enclosureCenter[2]], [0, -1, 0])!.point.y, 346.3, 0.001);
      near(hit([enclosureCenter[0], 400, enclosureCenter[2]], [0, -1, 0])!.point.y, 362.5, 0.001);
      // Panes and piers are the first surface on the mapped south wall,
      // probed from outside the closed shell on its long east segment.
      const southMid = world(-87.6215335, 41.8850138).map((v, axis) => v + (world(-87.6212842, 41.885017)[axis]! - v) * 0.5) as Vec3;
      const south = hit([southMid[0], 100, southMid[2] + 30], [0, 0, -1]);
      expect(south!.object.name).toMatch(/glaz|pier/);
      expect(south!.point.z).toBeGreaterThan(southMid[2] + 0.005);
      expect(south!.point.z).toBeLessThan(southMid[2] + 0.6);
      // The exact mapped outline at grade.
      const groundMesh = meshes.find((mesh) => mesh.name === "Aon · granite shell")!;
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

  test("opens the orthographic plan with the mapped buildings at published heights", async () => {
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    originalBounds = await page.evaluate(() => window.__buildingStudy!.modelBounds);
    originalCamera = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    expect(await page.locator("#dimensions-body tr").count()).toBe(8);
    await page.locator('[data-layout="geographic"]').click();
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
