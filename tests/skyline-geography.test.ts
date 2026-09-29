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
import { borgWarnerLevels, borgWarnerPalette } from "../models/borg-warner-geographic.js";
import { lakeViewPalette } from "../models/lake-view-geographic.js";
import { macleanPalette } from "../models/maclean-center-geographic.js";
import { monroePalette } from "../models/monroe-geographic.js";
import { peoplesGasLevels, peoplesGasPalette } from "../models/peoples-gas-geographic.js";
import { railwayExchangePalette } from "../models/railway-exchange-geographic.js";
import { gagePalette } from "../models/gage-geographic.js";
import { gageGroupPalette } from "../models/keith-ascher-geographic.js";
import { chicagoAthleticPalette } from "../models/chicago-athletic-association-geographic.js";
import { riverPlazaPalette } from "../models/river-plaza-geographic.js";
import { twoIllinoisPalette } from "../models/two-illinois-center-geographic.js";
import { hyattWestPalette } from "../models/hyatt-west-tower-geographic.js";
import { sheratonPalette } from "../models/sheraton-grand-geographic.js";
import { threeIllinoisPalette } from "../models/three-illinois-center-geographic.js";
import { northMichigan180Palette } from "../models/north-michigan-180-geographic.js";
import { universityClubPalette } from "../models/university-club-geographic.js";
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
      "Millennium Park Plaza": [68.57, 46.33, 121.9], Willoughby: [8.4, -325.57, 133.5], "Six North": [-1.14, -276.41, 86], "Michigan Boulevard": [-1.64, -204.59, 83.3], "180 N Michigan": [-1.24, 77.4, 86.3], "University Club": [0.18, -424.49, 69.75], Monroe: [0.92, -468.08, 69], MacLean: [0.85, -492.94, 77.4], "Lake View": [1.26, -509.77, 73.2], "Peoples Gas": [2.15, -545.88, 82.9], "Borg-Warner": [3.61, -612.47, 83.5], "Railway Exchange": [4.79, -690.9, 78.9], Gage: [1.46, -372.28, 47.74], Keith: [1.55, -390.86, 30.78], Ascher: [1.76, -407.26, 30.78], "Athletic Association": [-0.76, -350.62, 45.52], "Two Illinois Center": [159.19, 236.36, 114.3], "River Plaza": [-67.71, 551.99, 159.7], "Hyatt West Tower": [188.91, 319.23, 111.3], "Sheraton Grand": [423.15, 479.75, 112.3], "Three Illinois Center": [389.88, 273.78, 106.7],
    };
    expect(geographicBuildings.length).toBe(33);
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

  describe("Willoughby Tower", () => {
    test("keeps the mapped lot's base, the corner shaft and its shoulder, the crown and the pinnacles", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Willoughby")!;
      const model = models["Willoughby"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north; the shaft stands 17.4 m along the one and 11 m along the other.
      const corner = at(7), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(9)), unit(at(4))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // Measured on the drawing down from the published 133.5 m: the crown's parapet, the
      // shaft's roof around it, the shoulder's, the base's setback, and a parapet pinnacle.
      near(roof(8.7, 5.5), 131.7, 1e-3);
      near(roof(0.9, 5.5), 123.5, 1e-3);
      near(roof(20, 5.5), 92, 1e-3);
      near(roof(10, 18), 80.5, 1e-3);
      near(roof(0, 24.4), 83.5, 0.05);
      // The crown, inset 2.1 m from the shaft's Michigan face and 1.2 m from its south face,
      // probed either side of each; the central pinnacles over each face's windows at the
      // published top, a short face's flanking pinnacles, and a long face's gable.
      expect([roof(1.95, 3.6), roof(2.25, 3.6), roof(8.7, 1.05), roof(8.7, 1.25)].map((y) => Math.round(y * 10) / 10)).toEqual([123.5, 131.7, 123.5, 131.7]);
      near(roof(2.1, 5.5), 133.5, 1e-3);
      near(roof(10.2, 1.2), 133.5, 1e-3);
      near(roof(2.1, 2.6), 132.5, 1e-3);
      near(roof(7.5, 1.55), 132.2, 1e-3);
      // The shaft's Michigan face: three dark strips, spandrels and all, between stone piers;
      // and the crown's arched windows, from the east and from the south.
      const floor = (n: number) => 6 + (n - 2) * 3.35;
      const tone = (b: number, y: number, a = 0, from: "east" | "south" | "west" | "north" = "east") => {
        const p = lot(a, b), [dx, dz] = ({ east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1] } as const)[from];
        const found = hit([p[0] + dx * 30, y, p[1] + dz * 30], [-dx, 0, -dz]);
        expect(found.object.name).toBe("Willoughby Tower · stone and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const [stone, strip] = [is(0x585858), is(0x2d2d2d)];
      // The strips stand symmetrically about the face's middle, a pier between each pair.
      const strips = [3.85, 5.5, 7.15].flatMap((b) => [strip(tone(b, floor(30) + 0.2)), strip(tone(b, floor(30) + 1.5))]);
      expect(strips, "each strip's spandrel and window").toEqual([true, true, true, true, true, true]);
      expect([stone(tone(4.675, floor(30) + 1.5)), stone(tone(6.325, floor(30) + 1.5))], "the piers between the strips").toEqual([true, true]);
      // Three crown windows to a face, 0.9 m wide and 1.7 m apart, their heads narrowing to
      // the middle 0.45 m: tall and centred on the Michigan face, short and centred 10.2 m
      // west of Michigan on the south face; the undrawn west and north faces repeat them.
      const glass = (r: number) => [0x2a2a2a, 0x2e2e2e, 0x323232, 0x363636, 0x6e6e6e, 0x444444].some((hex) => is(hex)(r));
      const faces = {
        michigan: [5.5, true, (s: number, y: number) => tone(s, y, 2.1)],
        west: [5.5, true, (s: number, y: number) => tone(s, y, 15.3, "west")],
        south: [10.2, false, (s: number, y: number) => tone(1.2, y, s, "south")],
        north: [10.2, false, (s: number, y: number) => tone(9.8, y, s, "north")],
      } as const;
      for (const [name, [middle, tall, crown]] of Object.entries(faces)) {
        const at = (y: number, offsets: number[]) => [-1.7, 0, 1.7].flatMap((d) => offsets.map((o) => crown(middle + d + o, y)));
        expect(at(127.9, [-0.34, 0, 0.34]).every(glass), `${name}: three windows across their width`).toBe(true);
        expect(at(128.85, [0]).every(glass) && at(128.85, [-0.34, 0.34]).every(stone), `${name}: their narrowed heads`).toBe(true);
        expect(at(127.9, [-0.85, 0.85]).every(stone) && at(129.6, [0]).every(stone), `${name}: the piers between them and the parapet over them`).toBe(true);
        expect(at(125.5, [0]).every(tall ? glass : stone), `${name}: the windows' feet`).toBe(true);
      }
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Willoughby Tower · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Six North Michigan", () => {
    test("keeps the mapped block under its cornice and the tower in the middle of its Michigan front", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Six North")!;
      const model = models["Six North"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its Madison front running west and its Michigan
      // front north; the tower stands 7.5 to 20 m north of Madison and 12 m deep.
      const corner = at(6), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(7)), unit(at(5))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])!.point.y; };
      // Where a level ray from 30 m out meets the building, in metres west of Michigan or
      // north of Madison.
      const fromEast = (b: number, y: number) => { const p = lot(-30, b); return -30 + hit([p[0], y, p[1]], [west[0], 0, west[1]])!.distance; };
      const fromWest = (b: number, y: number) => { const p = lot(80, b); return 80 - hit([p[0], y, p[1]], [-west[0], 0, -west[1]])!.distance; };
      const fromSouth = (a: number, y: number) => { const p = lot(a, -30); return -30 + hit([p[0], y, p[1]], [north[0], 0, north[1]])!.distance; };
      const fromNorth = (a: number, y: number) => { const p = lot(a, 60); return 60 - hit([p[0], y, p[1]], [-north[0], 0, -north[1]])!.distance; };
      // Measured on the drawing down from the published 86 m: the cap, the tower's cornice
      // ledge, and the block's roof and cornice.
      near(roof(6, 13.75), 86, 1e-3);
      near(roof(-0.6, 13.75), 78, 1e-3);
      near(roof(30, 14), 63.6, 1e-3);
      near(roof(-0.5, 3), 63.6, 1e-3);
      // The tower's walls on all four sides, its skins a few centimetres proud; its band,
      // cornice, top stage and cap; and the block's cornice either side of it, open in front.
      near(fromEast(13.75, 70), -0.05, 0.03);
      near(fromSouth(6, 70), 7.45, 0.03);
      near(fromWest(13.75, 70), 12.05, 0.03);
      near(fromNorth(6, 70), 20.05, 0.03);
      near(fromEast(13.75, 66), -0.5, 1e-3);
      near(fromEast(13.75, 77), -1.2, 1e-3);
      near(fromEast(13.75, 81), 0.75, 0.03);
      near(fromEast(13.75, 85), 0.3, 1e-3);
      near(fromEast(3, 63), -1, 1e-3);
      near(fromEast(24, 63), -1, 1e-3);
      near(fromEast(13.75, 63), -0.05, 0.03);
      near(fromEast(3, 30), -0.05, 0.03);
      // Brick and windows, from each side.
      const floor = (n: number) => 6 + (n - 2) * 3.74;
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "west" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], west: [west[0], west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]])!;
        expect(found.object.name).toBe("Six North Michigan · brick and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const [brick, panel] = [is(0x6e6e6e), is(0x9c9c9c)];
      const glass = (r: number) => [0x4c4c4c, 0x505050, 0x545454, 0x585858, 0x8a8a8a, 0x5e5e5e].some((hex) => is(hex)(r));
      // The Michigan front: three windows to each wing and three to the tower between them;
      // Madison: eighteen windows to a floor.
      const window10 = floor(10) + 2.3;
      expect([1.6, 3.75, 5.9, 10.75, 13.75, 16.75, 21.6, 23.75, 25.9].every((b) => glass(tone(0, b, window10, "east"))), "the Michigan front's windows").toBe(true);
      expect([2.675, 4.825, 12.075, 15.425, 22.675].every((b) => brick(tone(0, b, window10, "east"))) && brick(tone(0, 13.75, floor(10) + 0.5, "east")), "its piers and spandrels").toBe(true);
      let runs = 0, inside = false;
      for (let a = 0.3; a < 49.3; a += 0.1) { const now = glass(tone(a, 0, window10, "south")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "Madison's windows").toBe(18);
      // The north wall, shared with the eight-storey 20 North Michigan, is blank below its
      // ninth floor and windowed above.
      const northWindows = (n: number) => { let count = 0, open = false; for (let a = 0.3; a < 49.3; a += 0.1) { const now = glass(tone(a, 27.5, floor(n) + 2.3, "north")); if (now && !open) count += 1; open = now; } return count; };
      expect([northWindows(8), northWindows(9)], "the north wall's windows").toEqual([0, 18]);
      // The tower's faces: three windows centred 3 m apart. The tall ones are 2 m wide, their
      // heads the middle metre; the seventeenth floor's are 1.3 m and the small ones 1.1 m.
      const faces = {
        east: [13.75, (s: number, y: number) => tone(0, s, y, "east")],
        west: [13.75, (s: number, y: number) => tone(12, s, y, "west")],
        south: [6, (s: number, y: number) => tone(s, 7.5, y, "south")],
        north: [6, (s: number, y: number) => tone(s, 20, y, "north")],
      } as const;
      for (const [name, [middle, face]] of Object.entries(faces)) {
        const across = (y: number, offsets: number[]) => [-3, 0, 3].flatMap((d) => offsets.map((o) => face(middle + d + o, y)));
        expect(across(72, [-0.9, 0, 0.9]).every(glass) && across(72, [-1.5, 1.5]).every(brick), `${name}: the tall windows and their piers`).toBe(true);
        expect(across(73.95, [0]).every(glass) && across(73.95, [-0.75, 0.75]).every(brick), `${name}: their heads`).toBe(true);
        expect(across(67.5, [-0.5, 0.5]).every(glass) && across(67.5, [-0.7, 0.7]).every(brick), `${name}: the small windows`).toBe(true);
        expect(across(64, [-0.6, 0.6]).every(glass) && across(64, [-0.8, 0.8]).every(brick), `${name}: the seventeenth floor's`).toBe(true);
        expect(across(69.5, [0]).every(brick) && across(75, [0]).every(brick), `${name}: the brick between and above`).toBe(true);
      }
      // The top stage's panels, 7.2 m wide in the middle of each face under brick.
      expect([panel(tone(0.8, 13.75, 80, "east")), brick(tone(0.8, 9.2, 80, "east")), brick(tone(0.8, 13.75, 84, "east")), panel(tone(6, 8.3, 80, "south")), brick(tone(1.5, 8.3, 80, "south"))], "the top stage's panels").toEqual([true, true, true, true, true]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Six North Michigan · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Michigan Boulevard Building", () => {
    test("keeps the mapped outline, the terracotta front and its return, the brick south wall and the attic", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Michigan Boulevard")!;
      const model = models["Michigan Boulevard"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north to the Washington Street corner.
      const corner = at(0), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(1)), unit(at(9))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // Measured on the drawing down from the published 82 m at the parapet: the raised
      // parapet over the front's south bay and a pedestal over a pier.
      near(roof(10, 15), 82, 1e-3);
      near(roof(0.35, 3), 83.3, 1e-3);
      near(roof(0.35, 12.4), 82.6, 1e-3);
      near(roof(0.35, 9.3), 82, 1e-3);
      const floor = (n: number) => (n <= 13 ? 4.8 + (n - 2) * 3.7 : 50.2 + (n - 14) * 3.58);
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found.object.name).toBe("Michigan Boulevard Building · terracotta and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const [terracotta, returnBay, brick, belt, panel] = [is(0x444444), is(0x585858), is(0x404040), is(0x505050), is(0x363636)];
      const glass = (r: number) => [0x262626, 0x2a2a2a, 0x2e2e2e, 0x323232, 0x6e6e6e, 0x3a3a3a].some((hex) => is(hex)(r));
      // The palettes stay apart, so no wall passes for glass.
      expect([0x444444, 0x585858, 0x404040, 0x505050, 0x363636].map((hex) => glass(new THREE.Color(hex).r))).toEqual([false, false, false, false, false]);
      // The Michigan front: a single window in its south bay and a pair in each of the other
      // four, with shopfronts under them, a belt course over the thirteenth floor, and the
      // attic's panel across each bay's windows.
      const window20 = floor(20) + 1.9, windows = [3.1, 8.3, 10.3, 14.45, 16.45, 20.55, 22.55, 26.75, 28.75];
      expect(windows.every((b) => glass(tone(0, b, window20, "east"))), "the front's windows").toBe(true);
      expect([5.5, 9.3, 12.4, 18.5, 24.6].every((b) => terracotta(tone(0, b, window20, "east"))), "its piers").toBe(true);
      expect([glass(tone(0, 3.1, 2.5, "east")), belt(tone(0, 5.5, 49.6, "east")), panel(tone(0, 9.3, 80, "east")), terracotta(tone(0, 12.4, 80, "east")), terracotta(tone(0, 9.3, 81.5, "east"))], "a shopfront, the belt, an attic panel, a pier and the parapet").toEqual([true, true, true, true, true]);
      // The south wall: the terracotta's return bay, 5.6 m, with a pair of windows glazed from
      // the ninth floor, over 20 North Michigan; and brick beyond, its belt-less wall with a
      // pair every 5.1 m glazed only from the eighteenth floor.
      const south = (a: number, n: number) => tone(a, 0, floor(n) + 1.9, "south");
      expect([returnBay(south(1.5, 8)), glass(south(1.5, 9)), glass(south(3.5, 12)), returnBay(south(2.5, 12))], "the return bay's windows").toEqual([true, true, true, true]);
      expect([returnBay(south(5.3, 12)), brick(south(5.9, 12)), belt(tone(5.3, 0, 49.6, "south")), brick(tone(5.9, 0, 49.6, "south"))], "the return bay's edge and the belt on it").toEqual([true, true, true, true]);
      expect([brick(south(7, 17)), glass(south(7, 18)), glass(south(9, 18)), glass(south(9, 21)), brick(south(8, 19))], "the brick wall's windows").toEqual([true, true, true, true, true]);
      // Washington Street: a pair every 6.1 m, sixteen windows to a floor.
      let runs = 0, inside = false;
      for (let a = 0.3; a < 49.5; a += 0.1) { const now = glass(tone(a, 31, floor(15) + 1.9, "north")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "Washington's windows").toBe(16);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Michigan Boulevard Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("180 North Michigan Avenue", () => {
    test("keeps the mapped block, its window columns, string courses and arched top floor", () => {
      const record = geographicBuildings.find((r) => r.shortName === "180 N Michigan")!;
      const model = models["180 N Michigan"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north to Lake Street.
      const corner = at(0), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(1)), unit(at(7))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // The parapet, read on the drawing, over the whole lot, the rear as high as the front.
      expect(record.heightFromDrawing).toBe(true);
      near(roof(10, 14), 86.3, 1e-3);
      near(roof(32, 14), 86.3, 1e-3);
      const floor = (n: number) => 9.85 + (n - 2) * 3.25;
      const tone = (a: number, b: number, y: number, from: "south" | "east") => {
        const p = lot(a, b), d = ({ south: [-north[0], -north[1]], east: [-west[0], -west[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found.object.name).toBe("180 North Michigan · masonry and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = northMichigan180Palette, panes = [...palette.glass, palette.lit, palette.dim];
      const [masonry, course] = [is(palette.masonry), is(palette.course)];
      const glass = (r: number) => panes.some((hex) => is(hex)(r));
      expect([palette.masonry, palette.course].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
      // The south wall's windows 2.7 m apart from 2.8 m west of Michigan, as drawn, with the
      // ground floor's tall windows under them; string courses over the seventeenth and twentieth
      // floors and under the top floor.
      const columns = [8.2, 10.9, 13.6, 16.3, 19, 24.4, 29.8];
      expect(columns.every((a) => glass(tone(a, 0, floor(20) + 1.6, "south"))) && columns.every((a) => masonry(tone(a + 1.35, 0, floor(20) + 1.6, "south"))), "the south wall's windows and piers").toBe(true);
      expect([glass(tone(13.6, 0, 5, "south")), course(tone(13.6, 0, floor(18) + 0.1, "south")), course(tone(13.6, 0, floor(21) + 0.1, "south")), course(tone(13.6, 0, 82, "south")), masonry(tone(13.6, 0, floor(19) + 0.1, "south"))], "the base, the courses and a plain spandrel").toEqual([true, true, true, true, true]);
      // The top floor's arched windows on the same columns, their heads the middle half.
      expect([glass(tone(13.6, 0, 84, "south")), glass(tone(13.1, 0, 84, "south")), glass(tone(13.6, 0, 85.7, "south")), masonry(tone(13.1, 0, 85.7, "south")), masonry(tone(13.6, 0, 86.15, "south"))], "an arched window, its head and the parapet").toEqual([true, true, true, true, true]);
      // The Michigan front: eleven windows to a floor.
      let runs = 0, inside = false;
      for (let b = 0.3; b < 28.5; b += 0.05) { const now = glass(tone(0, b, floor(12) + 1.6, "east")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "the Michigan front's windows").toBe(11);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "180 North Michigan · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("University Club of Chicago", () => {
    test("keeps the mapped block, its hall windows and parapet, and the gabled upper floor", () => {
      const record = geographicBuildings.find((r) => r.shortName === "University Club")!;
      const model = models["University Club"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its Monroe front running west and its Michigan front
      // north.
      const corner = at(3), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(4)), unit(at(0))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // Measured on the drawing down from OpenStreetMap's 67.7 m at the gable's peak: the
      // ridge and its cross, stem and arm, a pinnacle at the gable's foot, the south slope,
      // the Monroe side's small gable and its cross, and the parapet with its merlons.
      const ridge = Math.hypot(...[0, 1].map((k) => at(0)[k]! - corner[k]!)) / 2;
      near(roof(10, ridge), 67.7, 1e-3);
      near(roof(3.6, ridge), 69.75, 1e-3);
      near(roof(3.6, ridge + 0.45), 69.25, 1e-3);
      near(roof(3.3, 1.3), 62.5, 1e-3);
      near(roof(10, 5), 56.4 + (5 - 1.3) / (ridge - 1.3) * 11.3, 0.05);
      near(roof(16.2, 2.5), 59.3, 1e-3);
      near(roof(16.2, 1.6), 60.4, 1e-3);
      near(roof(16.55, 1.62), 60, 1e-3);
      expect([roof(1.5, 10), roof(0.3, 3.15), roof(0.3, 2.1)].map((y) => Math.round(y * 100) / 100), "the parapet, a merlon and a crenel").toEqual([51, 51.75, 51]);
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found.object.name).toBe("University Club · stone and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = universityClubPalette, panes = [...palette.glass, palette.lit, palette.dim];
      const [stone, band] = [is(palette.stone), is(palette.band)];
      const glass = (r: number) => panes.some((hex) => is(hex)(r));
      expect([palette.stone, palette.band].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
      // Four bays to each street front, 4.55 m apart from 3.1 m: the hall's tall windows and
      // their narrowed heads, the wide windows under them, and paired windows below; then the
      // band and the parapet wall.
      const fronts = { michigan: (s: number, y: number) => tone(0, s, y, "east"), monroe: (s: number, y: number) => tone(s, 0, y, "south") };
      for (const [name, face] of Object.entries(fronts)) {
        const across = (y: number, offsets: number[]) => [3.1, 7.65, 12.2, 16.75].flatMap((c) => offsets.map((o) => face(c + o, y)));
        expect(across(40, [-1.6, 0, 1.6]).every(glass) && across(40, [-2, 2]).every(stone), `${name}: the hall's windows and piers`).toBe(true);
        expect(across(43.5, [-0.6, 0, 0.6]).every(glass) && across(43.5, [-1.2, 1.2]).every(stone), `${name}: their heads`).toBe(true);
        expect(across(35.2, [-1.6, 0, 1.6]).every(glass), `${name}: the wide windows under them`).toBe(true);
        expect(across(17.4, [-0.9, 0.9]).every(glass) && across(17.4, [-1.6, 0, 1.6]).every(stone), `${name}: a floor's paired windows`).toBe(true);
        expect(across(47.5, [0]).every(band) && across(50, [0]).every(stone), `${name}: the band and the parapet wall`).toBe(true);
      }
      // The upper floor's three windows on its Michigan gable end, and the small gable's one.
      expect([4.3, 10.4, 16.4].every((b) => glass(tone(3.3, b, 54, "east"))) && stone(tone(3.3, 7.35, 54, "east")), "the upper floor's windows").toBe(true);
      expect([glass(tone(16.2, 1.15, 54.8, "south")), stone(tone(14.3, 1.15, 54.8, "south"))], "the small gable's window").toEqual([true, true]);
      // The north wall, shared with the six-storey 30 South Michigan, blank to its eighth floor.
      const northWindows = (y: number) => { let count = 0, open = false; for (let a = 0.3; a < 48; a += 0.1) { const now = glass(tone(a, ridge * 2, y, "north")); if (now && !open) count += 1; open = now; } return count; };
      expect([northWindows(5 + 5 * 3.525 + 1.9), northWindows(5 + 6 * 3.525 + 1.9) > 0], "the north wall, blank below its eighth floor").toEqual([0, true]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "University Club · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Monroe Building", () => {
    test("keeps the mapped block, its paired windows and bands, and the gable roof", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Monroe")!;
      const model = models["Monroe"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north to Monroe.
      const corner = at(9), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(8)), unit(at(0))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // The published ridge over the middle of the Michigan gable; the south slope
      // from the eaves, the ridge a little north of it; and the walls' top in front of the
      // gable.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, record.height]]);
      const drawn = (height: number) => height * 69 / 67.7;
      const middle = Math.hypot(...[0, 1].map((k) => at(0)[k]! - corner[k]!)) / 2;
      near(roof(1, middle), 69, 0.03);
      near(roof(20, 5), drawn(58.2) + 5 / 13.64 * (69 - drawn(58.2)), 0.15);
      near(roof(0.02, middle), drawn(58.2), 1e-3);
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found.object.name).toBe("Monroe Building · terracotta and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = monroePalette, panes = [...palette.glass, palette.lit, palette.dim];
      const [terracotta, granite, band] = [is(palette.terracotta), is(palette.granite), is(palette.band)];
      const glass = (r: number) => panes.some((hex) => is(hex)(r));
      expect([palette.terracotta, palette.granite, palette.band].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      // The Michigan front's five bays of paired windows, their mullions and the piers between;
      // the granite storeys; the fourteenth floor under the cornice; the belt and cornice.
      const bays = [0, 1, 2, 3, 4].map((k) => (2 * middle) * (k + 0.5) / 5), michigan = (b: number, y: number) => tone(0, b, y, "east");
      expect(bays.every((c) => glass(michigan(c - 0.825, drawn(41.3))) && glass(michigan(c + 0.825, drawn(41.3))) && terracotta(michigan(c, drawn(41.3)))), "the bays' paired windows").toBe(true);
      expect(bays.slice(1).every((c) => terracotta(michigan(c - (2 * middle) / 10, drawn(41.3)))), "the piers between them").toBe(true);
      expect([glass(michigan(bays[2]! + 0.825, drawn(4.1))), granite(michigan(bays[2]! + 0.825, drawn(7.6))), glass(michigan(bays[2]! + 0.825, drawn(55.6))), band(michigan(bays[2]!, drawn(50.5))), band(michigan(bays[2]!, drawn(57.6)))], "the granite storeys, the fourteenth floor, the belt and the cornice").toEqual([true, true, true, true, true]);
      // The gable's small windows: three pairs low, one pair high.
      const attic = (b: number, y: number) => { const p = lot(-30, b); return hit([p[0], y, p[1]], [west[0], 0, west[1]]).object.name; };
      expect([-6.75, -4.45, -1.15, 1.15, 4.45, 6.75].map((d) => attic(middle + d, drawn(59.2))), "the lower attic windows").toEqual(Array(6).fill("Monroe Building · attic windows"));
      expect([attic(middle - 1.15, drawn(62.6)), attic(middle + 1.15, drawn(62.6)), attic(middle + 3, drawn(59.2)), attic(middle + 5.6, drawn(62.6))], "the upper pair and the gable between").toEqual(["Monroe Building · attic windows", "Monroe Building · attic windows", "Monroe Building · shell", "Monroe Building · shell"]);
      // Each window's head narrows to its middle half for the arch's last 30 cm.
      expect([attic(middle + 1.15, drawn(59.95)), attic(middle + 1.55, drawn(59.95)), attic(middle + 1.15, drawn(63.25)), attic(middle + 1.55, drawn(63.25))], "the stepped heads").toEqual(["Monroe Building · attic windows", "Monroe Building · shell", "Monroe Building · attic windows", "Monroe Building · shell"]);
      // The south wall, shared with the taller MacLean Center, plain along a whole floor and
      // at the belt; Monroe's ten bays.
      let glazed = 0;
      for (let a = 0.3; a < 53; a += 0.1) if (glass(tone(a, 0, drawn(41.3), "south"))) glazed += 1;
      expect([glazed, terracotta(tone(10, 0, drawn(50.5), "south"))], "the plain party wall").toEqual([0, true]);
      let runs = 0, inside = false;
      for (let a = 0.3; a < 54; a += 0.05) { const now = glass(tone(a, 2 * middle, drawn(41.3), "north")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "Monroe's windows").toBe(20);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Monroe Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("MacLean Center", () => {
    test("keeps the mapped block, its window columns, the old club's cornice and frieze, and the addition", () => {
      const record = geographicBuildings.find((r) => r.shortName === "MacLean")!;
      const model = models["MacLean"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0]!;
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north to the Monroe Building.
      const corner = at(2), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(1)), unit(at(10))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0]).point.y; };
      // The published parapet's top, and the old club's cornice 60 cm proud.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, record.height]]);
      const drawn = (height: number) => height * 77.4 / 73.8;
      near(roof(10, 11), 77.4, 1e-3);
      near(roof(-0.3, 11), drawn(45.6), 1e-3);
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "west") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], west: [west[0], west[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found.object.name).toBe("MacLean Center · stone and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = macleanPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [stone, band, shadow] = [is(palette.stone), is(palette.band), is(palette.shadow)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.stone, palette.band, palette.shadow].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      // The Michigan front's five columns, narrow, three wide and narrow, on an old floor and
      // an added one; the top floor's arched heads and the frieze's round windows over the
      // wide ones only; the bands under the cornice; the parapet's openings.
      const middle = Math.hypot(...[0, 1].map((k) => at(10)[k]! - corner[k]!)) / 2, michigan = (b: number, y: number) => tone(0, b, y, "east");
      const narrow = [middle - 8.4, middle + 8.4], wide = [middle - 4.35, middle, middle + 4.35];
      expect([...narrow, ...wide].every((b) => glass(michigan(b, drawn(26.1))) && glass(michigan(b, drawn(57.3)))), "the five columns' windows").toBe(true);
      expect([middle - 6.4, middle - 2.2, middle + 2.2, middle + 6.4].every((b) => stone(michigan(b, drawn(26.1)))), "the piers between them").toBe(true);
      // Each section's widths: the old club's windows 1.4 and 2.36 m wide, the addition's 2
      // and 3.15 m, the parapet's openings 2.9 m.
      const edges = (b: number, y: number, inside: number, outside: number) => glass(michigan(b + inside, y)) && glass(michigan(b - inside, y)) && stone(michigan(b + outside, y)) && stone(michigan(b - outside, y));
      expect([wide.every((b) => edges(b, drawn(26.1), 1.05, 1.3)), narrow.every((b) => edges(b, drawn(26.1), 0.6, 0.85)), wide.every((b) => edges(b, drawn(57.3), 1.45, 1.7)), narrow.every((b) => edges(b, drawn(57.3), 0.9, 1.1))], "the old and added windows' widths").toEqual([true, true, true, true]);
      expect([...narrow, ...wide].every((b) => shadow(michigan(b + 1.3, drawn(71.6))) && shadow(michigan(b - 1.3, drawn(71.6))) && stone(michigan(b + 1.7, drawn(71.6)))), "the parapet's openings").toBe(true);
      expect(wide.every((b) => glass(michigan(b, drawn(68.5))) && glass(michigan(b + 0.6, drawn(68.5))) && stone(michigan(b + 1.2, drawn(68.5)))) && narrow.every((b) => stone(michigan(b, drawn(68.5)))), "the wide windows' arched heads").toBe(true);
      // The round windows: a circle 90 cm across, not its square.
      expect(wide.every((b) => glass(michigan(b, drawn(46.95))) && glass(michigan(b + 0.44, drawn(46.95))) && glass(michigan(b + 0.3, drawn(47.15))) && stone(michigan(b + 0.4, drawn(47.32))) && stone(michigan(b - 0.4, drawn(46.58))) && stone(michigan(b + 0.7, drawn(46.95)))) && narrow.every((b) => stone(michigan(b, drawn(46.95)))), "the round windows").toBe(true);
      expect([band(michigan(middle, drawn(42.6))), stone(michigan(middle + 2.2, drawn(71.6)))], "the bands and a pier of the parapet").toEqual([true, true]);
      // The party wall, plain along a floor and at the bands; the alley's seven windows.
      let glazed = 0;
      for (let a = 0.3; a < 51; a += 0.1) if (glass(tone(a, 0, drawn(26.1), "south"))) glazed += 1;
      expect([glazed, stone(tone(10, 0, drawn(42.6), "south"))], "the plain party wall").toEqual([0, true]);
      let runs = 0, inside = false;
      for (let b = 0.3; b < 21.6; b += 0.05) { const now = glass(tone(51.9, b, drawn(26.1), "west")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "the alley's windows").toBe(7);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "MacLean Center · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Lake View Building", () => {
    test("keeps the mapped outline, its three window columns, arched floor, attic and plain walls", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Lake View")!;
      const model = models["Lake View"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west and its Michigan front
      // north to the MacLean Center.
      const corner = at(6), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(5)), unit(at(9))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
      // The published top, and the south wall's light court open to the sky.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts?.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, record.height]]);
      near(roof(20, 5)!, 73.2, 1e-3);
      expect(roof(25, 1.4), "the light court").toBeUndefined();
      const paint = (found: THREE.Intersection | undefined) => {
        expect(found!.object.name).toBe("Lake View Building · stone and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const tone = (a: number, b: number, y: number, from: "east" | "west" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], west: [west[0], west[1]], north: [north[0], north[1]] } as const)[from];
        return paint(hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]));
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = lakeViewPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [stone, band] = [is(palette.stone), is(palette.band)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.stone, palette.band].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
      // The Michigan front's three windows, 2.5 m wide and 3.5 m apart; the sixteenth floor's
      // arched heads, the attic's small windows, and the cornice band.
      const front = Math.hypot(...[0, 1].map((k) => at(9)[k]! - corner[k]!)), columns = [-3.5, 0, 3.5].map((d) => front / 2 + d);
      const michigan = (b: number, y: number) => tone(0, b, y, "east");
      expect(columns.every((c) => glass(michigan(c, 51.4)) && glass(michigan(c + 1.1, 51.4)) && glass(michigan(c - 1.1, 51.4)) && stone(michigan(c + 1.5, 51.4))) && stone(michigan(front / 2 + 1.75, 51.4)), "a floor's three windows and their piers").toBe(true);
      expect(columns.every((c) => glass(michigan(c, 67.4)) && glass(michigan(c + 0.5, 67.4)) && stone(michigan(c + 0.9, 67.4)) && glass(michigan(c, 70.35)) && stone(michigan(c, 71.45))), "the arched heads and the attic's windows").toBe(true);
      expect(band(michigan(front / 2, 72.6)), "the cornice band").toBe(true);
      // One window to each of the seventeen floors up the middle column.
      let floors = 0, lit = false;
      for (let y = 0.3; y < 73; y += 0.05) { const now = glass(michigan(front / 2, y)); if (now && !lit) floors += 1; lit = now; }
      expect(floors, "a window to each floor").toBe(17);
      // The north wall, shared with the MacLean Center, and the light court's walls stay
      // plain; the alley has four windows to a floor.
      let glazed = 0;
      for (let a = 0.3; a < 51; a += 0.1) if (glass(tone(a, front, 51.4, "north"))) glazed += 1;
      const court = (toward: 1 | -1) => { const p = lot(25, 1.4), d = [west[0] * toward, west[1] * toward]; return paint(hit([p[0], 51.4, p[1]], [d[0]!, 0, d[1]!])); };
      expect([glazed, stone(court(1)), stone(court(-1))], "the plain party wall and light court").toEqual([0, true, true]);
      let runs = 0, inside = false;
      for (let b = 0.3; b < 11.5; b += 0.05) { const now = glass(tone(51.9, b, 51.4, "west")); if (now && !inside) runs += 1; inside = now; }
      expect(runs, "the alley's windows").toBe(4);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Lake View Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Peoples Gas Building", () => {
    test("keeps the mapped outline and court, the fronts' bays, colonnade, attic, frieze and cornice", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Peoples Gas")!;
      const model = models["Peoples Gas"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with the Adams front running west to the alley and the
      // Michigan front north to the Lake View Building.
      const corner = at(2), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(21)), unit(at(17))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
      const h = peoplesGasLevels, drawn = (height: number) => height * 82.9 / 86;
      // The published top at the cresting and the cornice between its blocks; the roof over
      // the ring and the north wing; the inner wings' roof, over which the court widens; and
      // the court's and the notch's floor.
      expect(record.heightFromDrawing).toBeUndefined();
      near(roof(-0.7, 30.5)!, 82.9, 1e-3);
      near(roof(-0.7, 31)!, h.roof + 0.02, 1e-3);
      expect([roof(5, 20), roof(38.8, 50.6), roof(39.8, 25.6), roof(28.8, 14.6), roof(28.8, 29.6), roof(27.3, 57.6)].map((y) => Number(y!.toFixed(3))), "the roofs, the inner wings and the floors").toEqual([h.roof, h.roof, h.inner, h.inner, h.court, h.court].map((y) => Number(y.toFixed(3))));
      expect(record.parts.map((part) => part.top), "the parts' tops").toEqual([h.roof, h.roof, h.inner, h.court, h.court].map((y) => Number(y.toFixed(2))));
      const paint = (found: THREE.Intersection | undefined) => {
        expect(found!.object.name).toBe("Peoples Gas Building · terracotta and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "west") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], west: [west[0], west[1]] } as const)[from];
        return paint(hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]));
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = peoplesGasPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [stone, granite, band, shadow, brick] = [is(palette.stone), is(palette.granite), is(palette.band), is(palette.shadow), is(palette.court)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.stone, palette.granite, palette.band, palette.shadow, palette.court].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false, false, false]);
      // Windows along a wall from `from` to `to`, counted as runs of glass.
      const count = (from: number, to: number, sample: (s: number) => number) => {
        let runs = 0, inside = false;
        for (let s = from; s < to; s += 0.1) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // The Michigan front: eleven bays between corner piers 6 m to the first column's
      // middle, each pier with its own window.
      const michigan = Math.hypot(...[0, 1].map((k) => at(17)[k]! - corner[k]!)), adams = Math.hypot(...[0, 1].map((k) => at(21)[k]! - corner[k]!));
      const pitch = (michigan - 12) / 11, lines = Array.from({ length: 12 }, (_, k) => 6 + k * pitch), centres = lines.slice(1).map((line) => line - pitch / 2);
      const east = (b: number, y: number) => tone(0, b, y, "east");
      const floor = drawn(41.7), rail = drawn(68.5), colonnade = drawn(70.4), pierFloor = drawn(72), attic = drawn(80);
      expect([floor, colonnade, pierFloor, attic].map((y) => count(0.3, michigan - 0.3, (b) => east(b, y))), "a floor's pairs, the colonnade's openings with and without the piers' windows, and the attic's windows").toEqual([24, 11, 13, 13]);
      expect(centres.every((c) => stone(east(c, floor)) && glass(east(c + 0.8, floor)) && glass(east(c - 0.8, floor)) && glass(east(c, colonnade)) && band(east(c, rail)) && glass(east(c, attic)) && stone(east(c, drawn(81.8))) && glass(east(c, drawn(3))) && glass(east(c, drawn(9)))), "each bay's mullion, pair, opening, rail, attic window and shopfronts").toBe(true);
      expect(lines.every((c) => stone(east(c, floor)) && stone(east(c, colonnade)) && shadow(east(c, drawn(81.8))) && granite(east(c, drawn(3)))), "each column, its pendant and its granite").toBe(true);
      expect([glass(east(2.6, floor)), glass(east(2.6, rail)), granite(east(2.6, drawn(3))), band(east(30, drawn(12.8))), band(east(30, drawn(77.5))), shadow(east(30, drawn(83.5))), shadow(east(lines[5]!, drawn(81.35))), stone(east(lines[5]! + 0.6, drawn(81.35)))], "the pier's windows and granite, the belt, the entablature, the frieze and the pendants' narrowing").toEqual(Array(8).fill(true));
      // One window to each floor from the third to the twentieth up a corner pier.
      let floors = 0, lit = false;
      for (let y = 0.3; y < h.cornice; y += 0.1) { const now = glass(east(2.6, y)); if (now && !lit) floors += 1; lit = now; }
      expect(floors, "a window to each floor up the pier").toBe(18);
      // The cornice, 90 cm proud.
      const ledge = hit([lot(-30, 30)[0], drawn(84.55), lot(-30, 30)[1]], [west[0], 0, west[1]]);
      expect([ledge!.object.name, Number(ledge!.distance.toFixed(2))], "the cornice").toEqual(["Peoples Gas Building · cornice", 29.1]);
      // Adams: nine bays; the alley's nineteen windows to a floor.
      expect([count(0.3, adams - 0.3, (a) => tone(a, 0, floor, "south")), count(0.3, michigan - 0.3, (b) => tone(adams, b, floor, "west"))], "Adams's pairs and the alley's windows").toEqual([20, 19]);
      // The court's walls, white brick with windows, and the notch open to the Lake View
      // Building's light court: a ray from the north passes the lot's wall there.
      const inCourt = lot(28.8, 29.6), courtWall = (y: number) => paint(hit([inCourt[0], y, inCourt[1]], [-west[0], 0, -west[1]]));
      expect([brick(courtWall(drawn(39.8))), brick(courtWall(drawn(66.9)))], "the court's brick, between floors and over the inner wings").toEqual([true, true]);
      // Along the court's east wall, 21.3 m long, from inside the court.
      expect(count(20.3, 39.7, (b) => paint(hit([lot(25, b)[0], floor, lot(25, b)[1]], [-west[0], 0, -west[1]]))), "the court's east wall's seven windows").toBe(7);
      const notch = hit([lot(27.3, 70)[0], floor, lot(27.3, 70)[1]], [-north[0], 0, -north[1]]);
      expect(notch!.distance, "the notch's depth").toBeGreaterThan(70 - 60.5 + 4);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Peoples Gas Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 30_000 });
  });

  describe("Borg-Warner Building", () => {
    test("keeps the mapped block, its curtain wall, penthouse and rooftop block", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Borg-Warner")!;
      const model = models["Borg-Warner"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with its south wall running west along Symphony Center
      // and its Michigan front north to Adams.
      const corner = at(11), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(12)), unit(at(4))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
      const drawn = (height: number) => height * 73.2 / 76;
      // The published tops: the block's, the penthouse's either side of it, and the roof's
      // north and west of the penthouse; the record's one part to the roof.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, 73.2]]);
      expect([roof(20, 15), roof(5, 10), roof(35, 5), roof(5, 28), roof(45, 10)].map((y) => Number(y!.toFixed(3))), "the block, the penthouse and the roof").toEqual([83.5, 78.6, 78.6, 73.2, 73.2]);
      const paint = (found: THREE.Intersection | undefined) => {
        expect(found!.object.name).toBe("Borg-Warner Building · curtain wall");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "north" | "west") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]], west: [west[0], west[1]] } as const)[from];
        return paint(hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]));
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = borgWarnerPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [spandrel, mullion, cornerColumn, cap, plain] = [is(palette.spandrel), is(palette.mullion), is(palette.corner), is(palette.cap), is(palette.plain)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.spandrel, palette.mullion, palette.corner, palette.cap, palette.plain].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false, false, false]);
      // Windows along a wall from `from` to `to`, counted as runs of glass.
      const count = (from: number, to: number, sample: (s: number) => number, step = 0.03) => {
        let runs = 0, inside = false;
        for (let s = from; s < to; s += step) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // The curtain wall: 22 bays on Michigan and 37 on Adams and the south front between the
      // corner columns, a floor's windows over its spandrel, the fascia, and the corner columns.
      const michigan = Math.hypot(...[0, 1].map((k) => at(4)[k]! - corner[k]!)), south = Math.hypot(...[0, 1].map((k) => at(12)[k]! - corner[k]!));
      const floor = drawn(33.2), bay = 1.2 + (michigan - 2.4) / 22 / 2;
      expect([count(0.3, michigan - 0.3, (b) => tone(0, b, floor, "east")), count(0.3, south - 0.3, (a) => tone(a, 0, floor, "south")), count(0.3, south - 0.3, (a) => tone(a, michigan, floor, "north"))], "the bays").toEqual([22, 37, 37]);
      expect([glass(tone(0, bay, floor, "east")), spandrel(tone(0, bay, drawn(31.6), "east")), spandrel(tone(0, bay, drawn(74.5), "east")), mullion(tone(0, 1.2 + (michigan - 2.4) / 22, floor, "east")), cornerColumn(tone(0, 0.6, floor, "east")), cornerColumn(tone(0, 0.6, drawn(74.5), "east"))], "a window, its spandrel, the fascia, a mullion and the corner column").toEqual(Array(6).fill(true));
      // One window to each of the twenty-two floors up a bay.
      expect(count(0.3, 73.2, (y) => tone(0, bay, y, "east"), 0.05), "a window to each floor").toBe(22);
      // The south front plain below Symphony Center's roof, the curtain wall above; the
      // alley's ten windows to a floor.
      const southBay = 1.2 + (south - 2.4) / 37 / 2;
      expect([plain(tone(southBay, 0, 20, "south")), plain(tone(southBay, 0, 31, "south")), glass(tone(southBay, 0, 31.2, "south")), glass(tone(southBay, 0, floor, "south"))], "the south front").toEqual([true, true, true, true]);
      expect(count(0.3, michigan - 0.3, (b) => tone(south, b, floor, "west"), 0.1), "the alley's windows").toBe(10);
      // The penthouse's glass between the same mullions, 15 bays on Michigan, under its cap;
      // the block behind it, 14 m from Michigan.
      expect([count(0.3, 21.7, (b) => tone(0.12, b, 76, "east")), cap(tone(0.12, 10, borgWarnerLevels.penthouse - 0.3, "east"))], "the penthouse").toEqual([15, true]);
      const behind = hit([lot(-30, 25)[0], 81, lot(-30, 25)[1]], [west[0], 0, west[1]]);
      expect([behind!.object.name, Number(behind!.distance.toFixed(2))], "the block").toEqual(["Borg-Warner Building · rooftop block", 44]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Borg-Warner Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Railway Exchange Building", () => {
    test("keeps the mapped block, its bays, belt, round windows, cornice and hipped roof", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Railway Exchange")!;
      const model = models["Railway Exchange"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with the Jackson front running west and the Michigan
      // front north to Symphony Center.
      const corner = at(0), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(6)), unit(at(8))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
      const drawn = (height: number) => height * 71.6 / 73.7;
      // The roof's published top over the light well, its east slope halfway up from the
      // eaves 10 cm in, the cornice's top, and the record's one part to the eaves.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, 71.6]]);
      near(roof(26, 26)!, 78.9, 1e-3);
      near(roof(5.05, 26)!, 71.6 + 7.3 / 2, 0.1);
      near(roof(-0.5, 26)!, 71.62, 1e-3);
      const paint = (found: THREE.Intersection | undefined) => {
        expect(found!.object.name).toBe("Railway Exchange Building · terracotta and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "west" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], west: [west[0], west[1]], north: [north[0], north[1]] } as const)[from];
        return paint(hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]));
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = railwayExchangePalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [terracotta, band, plain] = [is(palette.terracotta), is(palette.band), is(palette.plain)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.terracotta, palette.band, palette.plain].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      // Windows along a wall from `from` to `to`, counted as runs of glass.
      const count = (from: number, to: number, sample: (s: number) => number, step = 0.05) => {
        let runs = 0, inside = false;
        for (let s = from; s < to; s += step) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // Eleven bays 4.4 m apart on both fronts: a floor's pairs, the round windows, the
      // mullions and piers, and the belt.
      const michigan = Math.hypot(...[0, 1].map((k) => at(8)[k]! - corner[k]!)), jackson = Math.hypot(...[0, 1].map((k) => at(6)[k]! - corner[k]!));
      const floor = drawn(41.3), round = drawn(69.05), centre = michigan / 2;
      const east = (b: number, y: number) => tone(0, b, y, "east");
      expect([count(0.3, michigan - 0.3, (b) => east(b, floor)), count(0.3, michigan - 0.3, (b) => east(b, round)), count(0.3, jackson - 0.3, (a) => tone(a, 0, floor, "south")), count(0.3, jackson - 0.3, (a) => tone(a, 0, round, "south"))], "the pairs and round windows").toEqual([22, 11, 22, 11]);
      expect([terracotta(east(centre, floor)), glass(east(centre + 0.9, floor)), terracotta(east(centre + 2.2, floor)), glass(east(centre + 1.1, round)), terracotta(east(centre + 1.1, drawn(68.05))), band(east(centre + 0.9, drawn(55)))], "a mullion, a window, a pier, the round window's edge and the belt").toEqual(Array(6).fill(true));
      // The outer bays, 4.4 m apart, 22 m either side of the middle, and the piers beyond.
      expect([-1, 1].flatMap((side) => [glass(east(centre + side * 22.9, floor)), glass(east(centre + side * 22, round)), terracotta(east(centre + side * 24.2, floor))]), "the outer bays").toEqual(Array(6).fill(true));
      // One window to each of the seventeen floors up a bay: the shopfront, fifteen floors
      // and the round window.
      expect(count(0.3, drawn(71.7), (y) => east(centre + 0.9, y), 0.05), "a window to each floor").toBe(17);
      // The alley's sixteen windows to a floor; the north wall, shared with Symphony Center,
      // plain.
      expect([count(0.3, michigan - 0.3, (b) => tone(jackson, b, floor, "west"), 0.1), count(0.3, michigan - 0.3, (b) => tone(jackson, b, round, "west"), 0.1), plain(tone(20, michigan, floor, "north")), plain(tone(20, michigan, drawn(72.5), "north"))], "the alley, its seventeenth floor, and the north wall").toEqual([16, 16, true, true]);
      // The cornice, 90 cm proud.
      const ledge = hit([lot(-30, 26)[0], drawn(72.5), lot(-30, 26)[1]], [west[0], 0, west[1]]);
      expect([ledge!.object.name, Number(ledge!.distance.toFixed(2))], "the cornice").toEqual(["Railway Exchange Building · cornice", 29.1]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Railway Exchange Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Gage Building", () => {
    test("keeps the mapped lot, its three-bay front, the south wall's drawn windows, the parapet and its cartouches", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Gage")!;
      const model = models["Gage"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      const at = (i: number): Vec2 => { const [east, north] = projectGround(record.footprint.coordinates[i]!); return [east, -north]; };
      // The lot's south-east corner, with the south wall running west along 24 South
      // Michigan and the Michigan front north to the Chicago Athletic Association.
      const corner = at(6), unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
      const [west, north] = [unit(at(7)), unit(at(3))];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
      const drawn = (height: number) => height * 46.94 / 54.2;
      // The parapet at the City's 154 ft, the cartouches over both inner piers, and the
      // record's one part.
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, 46.94]]);
      near(roof(20, 9)!, 46.94, 1e-3);
      near(roof(0.45, 6.2)!, 47.74, 1e-3);
      near(roof(0.45, 11.9)!, 47.74, 1e-3);
      near(roof(0.45, 9)!, 46.94, 1e-3);
      const tone = (a: number, b: number, y: number, from: "east" | "south" | "west" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], south: [-north[0], -north[1]], west: [west[0], west[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found!.object.name).toBe("Gage Building · terracotta and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      // The model's own palette, whose window tones no wall shares.
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = gagePalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [terracotta, band, brick] = [is(palette.terracotta), is(palette.band), is(palette.brick)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.terracotta, palette.band, palette.brick].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      const count = (from: number, to: number, sample: (s: number) => number, step = 0.02) => {
        let runs = 0, inside = false;
        for (let s = from; s < to; s += step) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // The drawn rows, scaled: each floor's window from 86 cm over its floor to 3.29 m as
      // drawn, the floors 3.715 m apart as drawn from the eighth, whose window is the lowest
      // the drawing shows.
      const floor = (n: number) => drawn(33.47 + (n - 8) * 3.715), pane = (n: number) => floor(n) + drawn(1.5);
      // The front's three bays, their windows in four, five and four lights, between piers:
      // 2 m at the corners, 1.15 and 1.2 m between the bays.
      const front = Math.hypot(...[0, 1].map((k) => at(3)[k]! - corner[k]!));
      expect([[0.1, 6.2], [6.2, 11.9], [11.9, front - 0.1]].map(([from, to]) => count(from!, to!, (b) => tone(0, b, pane(12), "east"))), "each bay's lights").toEqual([4, 5, 4]);
      expect([1, 6.2, 11.9, front - 1].map((b) => terracotta(tone(0, b, pane(10), "east"))), "the piers").toEqual([true, true, true, true]);
      expect([glass(tone(0, 3.3, pane(10), "east")), terracotta(tone(0, 2.9, pane(10), "east")), terracotta(tone(0, 3.3, floor(10) + drawn(0.4), "east")), glass(tone(0, 9, 2.5, "east")), band(tone(0, 9, 4.6, "east")), terracotta(tone(0, 9, 46.3, "east"))], "a light, a mullion, a spandrel, a shopfront, the sign band and the parapet").toEqual([true, true, true, true, true, true]);
      // The top floor's window between its drawn sill and head, the head within 4 cm of the
      // drawn one, and the eighth floor's.
      const [sill, head] = [floor(12) + drawn(0.86), floor(12) + drawn(3.29)];
      near(head, drawn(51.66), 0.04);
      expect([terracotta(tone(0, 3.3, sill - 0.05, "east")), glass(tone(0, 3.3, sill + 0.05, "east")), glass(tone(0, 3.3, head - 0.05, "east")), terracotta(tone(0, 3.3, head + 0.05, "east"))], "the top floor's sill and head").toEqual([true, true, true, true]);
      expect([terracotta(tone(0, 3.3, floor(8) + drawn(0.86) - 0.05, "east")), glass(tone(0, 3.3, floor(8) + drawn(0.86) + 0.05, "east"))], "the eighth floor's sill").toEqual([true, true]);
      // A window to each floor up a bay: the shopfront and eleven floors.
      expect(count(0.3, 46.9, (y) => tone(0, 9, y, "east"), 0.05), "a window to each floor").toBe(12);
      // The south wall, as drawn: a window 6 to 9.5 m west of the front on the top four floors,
      // and three between 15.3 and 28.4 m on the ninth and twelfth; the brick is otherwise
      // plain.
      const south = (a: number, n: number) => tone(a, 0, pane(n), "south");
      expect([9, 10, 11, 12].map((n) => glass(south(7.75, n))), "the window near the front").toEqual([true, true, true, true]);
      expect([brick(south(7.75, 8)), brick(south(4, 12)), brick(south(12, 12)), brick(south(35, 12))], "the plain brick").toEqual([true, true, true, true]);
      expect([9, 12].map((n) => count(14, 30, (a) => south(a, n))), "three more on the ninth and twelfth").toEqual([3, 3]);
      expect([10, 11].map((n) => count(14, 30, (a) => south(a, n))), "and none between").toEqual([0, 0]);
      // The alley's windows, about 3.2 m apart, and the north wall, shared with the Chicago
      // Athletic Association, plain.
      const lotDepth = Math.hypot(...[0, 1].map((k) => at(7)[k]! - corner[k]!));
      expect([count(0.3, front - 0.3, (b) => tone(lotDepth, b, pane(6), "west")), brick(tone(20, front, pane(6), "north")), brick(tone(20, front, 46.3, "north"))], "the alley and the north wall").toEqual([6, true, true]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Gage Building · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Edson Keith and Theodore Ascher Buildings", () => {
    test("keep their mapped lots, their Chicago windows, the drawn seventh floor and their parapets", () => {
      // The audit's measurements: the parapet, the drawn one, the seventh floor's drawn window,
      // and each bay's window from the front's south corner.
      const measured = {
        Keith: { top: 30.78, drawnTop: 35.69, drawnWindow: [30.15, 33.17], bays: [[1.67, 5.36], [7.24, 12.09], [13.44, 17.34]] },
        Ascher: { top: 30.78, drawnTop: 35.48, drawnWindow: [29.97, 32.97], bays: [[1.85, 5.7], [7.9, 11.75]] },
      } as const;
      for (const [shortName, name, lights] of [["Keith", "Edson Keith Building", [3, 3, 3]], ["Ascher", "Theodore Ascher Building", [3, 3]]] as const) {
        const spec = { name, ...measured[shortName] };
        const record = geographicBuildings.find((r) => r.shortName === shortName)!;
        const model = models[shortName]!;
        model.building.updateMatrixWorld(true);
        const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
        const ray = new THREE.Raycaster();
        const hit = (from: Vec3, direction: Vec3) => {
          ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
          return ray.intersectObjects(meshes, false)[0];
        };
        // The lot's south-east corner, with its Michigan front running north.
        const points = record.footprint.coordinates.map((p): Vec2 => { const [east, north] = projectGround(p); return [east, -north]; });
        const corner = points.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
        const northEast = points.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
        const southWest = points.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
        const unit = (p: Vec2): Vec2 => { const d = Math.hypot(p[0] - corner[0], p[1] - corner[1]); return [(p[0] - corner[0]) / d, (p[1] - corner[1]) / d]; };
        const [west, north] = [unit(southWest), unit(northEast)];
        const front = Math.hypot(northEast[0] - corner[0], northEast[1] - corner[1]), depth = Math.hypot(southWest[0] - corner[0], southWest[1] - corner[1]);
        const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
        const roof = (a: number, b: number) => { const p = lot(a, b); return hit([p[0], 300, p[1]], [0, -1, 0])?.point.y; };
        // The published parapet, flat across the lot, and the record's one part.
        expect(record.heightFromDrawing, shortName).toBeUndefined();
        expect(record.parts.map((part) => [part.bottom, part.top]), `${shortName}'s one part`).toEqual([[0, spec.top]]);
        near(roof(depth / 2, front / 2)!, spec.top, 1e-3);
        near(roof(0.5, 0.5)!, spec.top, 1e-3);
        const tone = (a: number, b: number, y: number, from: "east" | "west" | "south" | "north") => {
          const p = lot(a, b), d = ({ east: [-west[0], -west[1]], west: [west[0], west[1]], south: [-north[0], -north[1]], north: [north[0], north[1]] } as const)[from];
          const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
          expect(found!.object.name).toBe(`${spec.name} · brick and windows`);
          return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
        };
        // The shared palette, whose window tones neither wall colour shares.
        const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
        const palette = gageGroupPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
        const [brick, band] = [is(palette.brick), is(palette.band)];
        const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
        expect([palette.brick, palette.band].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
        const count = (from: number, to: number, sample: (s: number) => number, step = 0.02) => {
          let runs = 0, inside = false;
          for (let s = from; s < to; s += step) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
          return runs;
        };
        // The seventh floor's window, the drawn row, scaled so the drawn parapet meets the
        // published one; six floors from the second at 5.5 m up to it.
        const drawn = (height: number) => height * spec.top / spec.drawnTop;
        const [sill, head] = spec.drawnWindow.map(drawn) as [number, number];
        const floor = (n: number) => 5.5 + (n - 2) * (sill - 0.8 - 5.5) / 5, pane = (n: number) => floor(n) + 1.8;
        const middle = (spec.bays[0]![0] + spec.bays[0]![1]) / 2;
        expect([brick(tone(0, middle, sill - 0.05, "east")), glass(tone(0, middle, sill + 0.05, "east")), glass(tone(0, middle, head - 0.05, "east")), brick(tone(0, middle, head + 0.05, "east"))], `${shortName}'s drawn seventh-floor window`).toEqual([true, true, true, true]);
        // Each bay's Chicago window: a fixed pane between two sashes, split by mullions.
        const bounds = [0.1, ...spec.bays.slice(1).map(([a], i) => (spec.bays[i]![1] + a) / 2), front - 0.1];
        expect(spec.bays.map((_, i) => count(bounds[i]!, bounds[i + 1]!, (b) => tone(0, b, pane(5), "east"))), `${shortName}'s lights`).toEqual([...lights]);
        expect([brick(tone(0, spec.bays[0]![0] + 0.8, pane(5), "east")), glass(tone(0, spec.bays[0]![0] + 0.4, pane(5), "east")), brick(tone(0, (spec.bays[0]![1] + spec.bays[1]![0]) / 2, pane(5), "east"))], `${shortName}'s mullion, sash and pier`).toEqual([true, true, true]);
        // Every window's measured edges, 5 cm either side.
        expect(spec.bays.flatMap(([a, b]) => [brick(tone(0, a - 0.05, pane(5), "east")), glass(tone(0, a + 0.05, pane(5), "east")), glass(tone(0, b - 0.05, pane(5), "east")), brick(tone(0, b + 0.05, pane(5), "east"))]), `${shortName}'s window edges`).toEqual(Array(spec.bays.length * 4).fill(true));
        // A window to each floor up a bay: the shopfront and six floors; the sign band and the
        // parapet.
        expect(count(0.3, spec.top - 0.1, (y) => tone(0, middle, y, "east"), 0.05), `${shortName}'s floors`).toBe(7);
        expect([band(tone(0, middle, 4.9, "east")), brick(tone(0, middle, spec.top - 0.5, "east"))], `${shortName}'s sign band and parapet`).toEqual([true, true]);
        // The alley's windows, about 3.2 m apart, above a plain ground floor and no sign band.
        expect(count(0.3, front - 0.3, (b) => tone(depth, b, pane(4), "west")), `${shortName}'s alley`).toBe(Math.round(front / 3.2));
        expect([count(0.3, front - 0.3, (b) => tone(depth, b, 2.5, "west")), brick(tone(depth, front / 2, 4.9, "west"))], `${shortName}'s alley at grade`).toEqual([0, true]);
        // The party walls keep the bare shell, no skin standing into a neighbour's lot.
        const bare = (b: number, from: "south" | "north") => {
          const p = lot(20, b), d = from === "south" ? [-north[0], -north[1]] : [north[0], north[1]];
          return hit([p[0] + d[0]! * 30, pane(4), p[1] + d[1]! * 30], [-d[0]!, 0, -d[1]!])!.object.name;
        };
        expect([bare(0, "south"), bare(front, "north")], `${shortName}'s party walls`).toEqual([`${spec.name} · shell`, `${spec.name} · shell`]);
        // The exact mapped outline at grade.
        const shell = meshes.find((mesh) => mesh.name === `${spec.name} · shell`)!.geometry.getAttribute("position");
        const grade = new Set<string>();
        for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
        const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
          const [x, n] = projectGround(p);
          return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
        }));
        expect(grade, shortName).toEqual(mapped);
      }
    }, { timeout: 60_000 });
  });

  describe("Chicago Athletic Association", () => {
    test("keeps the mapped lot, the measured levels, its arcades, frieze, cornice and roundels", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Athletic Association")!;
      const model = models["Athletic Association"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      // The lot's south-east corner, on Michigan against the Gage, with the front running north
      // to Willoughby Tower.
      const points = record.footprint.coordinates.map((p): Vec2 => { const [east, north] = projectGround(p); return [east, -north]; });
      const corner = points.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best));
      const northEast = points.reduce((best, p) => (p[0] - p[1] > best[0] - best[1] ? p : best));
      const length = Math.hypot(northEast[0] - corner[0], northEast[1] - corner[1]);
      const north: Vec2 = [(northEast[0] - corner[0]) / length, (northEast[1] - corner[1]) / length], west: Vec2 = [north[1], -north[0]];
      const lot = (a: number, b: number): Vec2 => [corner[0] + west[0] * a + north[0] * b, corner[1] + west[1] * a + north[1] * b];
      // The survey's measured parapet, 149 ft 4 in, and the record's one part.
      const ft = (feet: number, inches = 0) => (feet + inches / 12) * 0.3048;
      expect(record.heightFromDrawing).toBeUndefined();
      expect(record.parts.map((part) => [part.bottom, part.top]), "its one part").toEqual([[0, 45.52]]);
      near(ft(149, 4), 45.52, 0.005);
      near(hit([lot(20, 12)[0], 300, lot(20, 12)[1]], [0, -1, 0])!.point.y, 45.52, 1e-3);
      const tone = (a: number, b: number, y: number, from: "east" | "west" | "north") => {
        const p = lot(a, b), d = ({ east: [-west[0], -west[1]], west: [west[0], west[1]], north: [north[0], north[1]] } as const)[from];
        const found = hit([p[0] + d[0] * 30, y, p[1] + d[1] * 30], [-d[0], 0, -d[1]]);
        expect(found!.object.name).toBe("Chicago Athletic Association · stone, brick and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const palette = chicagoAthleticPalette, glassTones = [...palette.glass, palette.lit, palette.dim];
      const [stone, frieze, brick] = [is(palette.stone), is(palette.frieze), is(palette.brick)];
      const glass = (r: number) => glassTones.some((hex) => is(hex)(r));
      expect([palette.stone, palette.frieze, palette.brick].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      const count = (from: number, to: number, sample: (s: number) => number, step = 0.02) => {
        let runs = 0, inside = false;
        for (let x = from; x < to; x += step) { const now = glass(sample(x)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // Read on the measured elevation, as fractions of the front: the three bays' lights, two,
      // eight and two, in the eighth floor's arcade between 93 ft 1 in and 112 ft 11 in.
      const arcade = ft(103);
      expect([[0.03, 0.22], [0.23, 0.77], [0.78, 0.97]].map(([a, b]) => count(a! * length, b! * length, (x) => tone(0, x, arcade, "east"))), "the arcade's lights").toEqual([2, 8, 2]);
      expect([stone(tone(0, 0.225 * length, arcade, "east")), stone(tone(0, 0.77 * length, arcade, "east")), glass(tone(0, 0.47 * length, ft(93, 6), "east")), stone(tone(0, 0.47 * length, ft(92, 6), "east"))], "the quoins and the arcade's foot").toEqual([true, true, true, true]);
      // The carved frieze under the cornice, which projects 88 cm between its profile's foot
      // and head on the section, 120 ft 9½ in and 126 ft 11 in.
      expect([frieze(tone(0, 12, ft(117), "east")), glass(tone(0, 0.47 * length, ft(112, 6), "east"))], "the frieze and the arcade's head").toEqual([true, true]);
      for (const [y, name] of [[ft(121), "Chicago Athletic Association · cornice"], [ft(126, 6), "Chicago Athletic Association · cornice"], [ft(127, 3), "Chicago Athletic Association · stone, brick and windows"]] as const) {
        const p = lot(0, 12), found = hit([p[0] - west[0] * 30, y, p[1] - west[1] * 30], [west[0], 0, west[1]])!;
        expect([found.object.name, found.object.name.endsWith("cornice") ? Number(found.distance.toFixed(2)) : "skin"], `at ${y.toFixed(2)} m`).toEqual([name, name.endsWith("cornice") ? 29.12 : "skin"]);
      }
      // The top storey's diaper brick: nine roundels at 144 ft and one window at its north end.
      expect([count(0.1, length - 0.1, (x) => tone(0, x, ft(144), "east")), glass(tone(0, 0.89 * length, ft(131), "east")), brick(tone(0, 0.5 * length, ft(131), "east")), brick(tone(0, 0.5 * length, ft(148), "east"))], "the roundels, the window and the brick").toEqual([9, true, true, true]);
      // A window up a bay, under the cornice, to each storey the front shows: the ground floor,
      // the small arches, the great arcade over three floors, the sixth and seventh, and the
      // eighth's arcade.
      expect(count(0.3, ft(120, 6), (y) => tone(0, 0.4666 * length, y, "east"), 0.05), "the front's storeys").toBe(6);
      // The alley and the light court have windows on each floor from the second; the party
      // walls keep the bare shell.
      // Up the first window a wall shows on the fifth floor, a window to each floor from the
      // second.
      const fifth = ft(62) + 1.8;
      const upFirst = (sample: (x: number, y: number) => number, from: number, to: number) => {
        let x = from;
        while (x < to && !glass(sample(x, fifth))) x += 0.05;
        return count(0.3, 45.3, (y) => sample(x + 0.4, y), 0.05);
      };
      expect(upFirst((b, y) => tone(52, b, y, "west"), 1, 24), "the alley's floors").toBe(10);
      // Each of those windows' sills, 90 cm over its floor on the section, from the second
      // floor's 17 ft 5½ in to the eleventh's 136 ft 5 in.
      const section = [ft(17, 5.5), ft(33), ft(46, 6.5), ft(62), ft(73, 1.5), ft(83, 5), ft(94, 1), ft(114, 6), ft(127, 3), ft(136, 5)];
      let window = 1;
      while (window < 24 && !glass(tone(52, window, fifth, "west"))) window += 0.05;
      expect(section.flatMap((level) => [brick(tone(52, window + 0.4, level + 0.85, "west")), glass(tone(52, window + 0.4, level + 0.95, "west"))]), "the sills on the section's floors").toEqual(Array(20).fill(true));
      expect(upFirst((a, y) => tone(a, 18.35 + 3, y, "north"), 24, 38), "the light court's floors").toBe(10);
      // The light court's east wall, which faces the way the front does, 39 m back, is the
      // court's brick, not the front's stone. It runs from 18.9 to 24.6 m north of the corner,
      // as the lot's axes put it; the samples stay inside it.
      const courtEast = (b: number, y: number) => {
        const p = lot(34, b), found = hit([p[0], y, p[1]], [west[0], 0, west[1]]);
        expect(found!.object.name).toBe("Chicago Athletic Association · stone, brick and windows");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      expect([upFirst(courtEast, 19.2, 24.2), brick(courtEast(19.3, arcade)), brick(courtEast(19.3, ft(144)))], "the light court's east wall").toEqual([10, true, true]);
      const bare = (a: number, b: number, from: "south" | "north") => {
        const p = lot(a, b), d = from === "south" ? [-north[0], -north[1]] : [north[0], north[1]];
        return hit([p[0] + d[0]! * 30, 20, p[1] + d[1]! * 30], [-d[0]!, 0, -d[1]!])!.object.name;
      };
      expect([bare(10, 0, "south"), bare(10, length, "north"), bare(45, length, "north")], "the party walls").toEqual(Array(3).fill("Chicago Athletic Association · shell"));
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Chicago Athletic Association · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Two Illinois Center and River Plaza", () => {
    test("keep their mapped outlines, Two Illinois Center's curtain wall and River Plaza's frame and roof", () => {
      const cast = (model: BuildingModel) => {
        model.building.updateMatrixWorld(true);
        const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
        const ray = new THREE.Raycaster();
        return (from: Vec3, direction: Vec3) => {
          ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
          return ray.intersectObjects(meshes, false)[0];
        };
      };
      const is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const tone = (found: THREE.Intersection | undefined, name: string) => {
        expect(found!.object.name).toBe(name);
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const count = (from: number, to: number, glass: (r: number) => boolean, sample: (s: number) => number, step = 0.02) => {
        let runs = 0, inside = false;
        for (let x = from; x < to; x += step) { const now = glass(sample(x)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      const ground = (p: [number, number]): Vec2 => { const [east, north] = projectGround(p); return [east, -north]; };

      // Two Illinois Center: the published 114.3 m roof over 32 storeys, a lobby of 4.25 m
      // and floors at the photograph's 3.55 m, the top two a mechanical band.
      const center = geographicBuildings.find((r) => r.shortName === "Two Illinois Center")!;
      const hitCenter = cast(models["Two Illinois Center"]!);
      expect(center.parts.map((part) => [part.bottom, part.top])).toEqual([[0, 114.3]]);
      const [x0, z0] = [159.19, -236.36];
      near(hitCenter([x0, 300, z0], [0, -1, 0])!.point.y, 114.3, 1e-3);
      const ip = twoIllinoisPalette, iGlass = (r: number) => [...ip.glass, ip.lit, ip.dim].some((hex) => is(hex)(r));
      expect([ip.mullion, ip.spandrel, ip.plant].map((hex) => iGlass(new THREE.Color(hex).r)), "no Two Illinois Center wall colour passes for glass").toEqual([false, false, false]);
      // Its south face, sampled from the south between two mullions and on one.
      const south = (x: number, y: number) => tone(hitCenter([x, y, z0 + 60], [0, 0, -1]), "Two Illinois Center · curtain wall");
      const floor = (n: number) => 4.25 + (n - 2) * 3.55;
      let pane = x0;
      while (!iGlass(south(pane, floor(10) + 2))) pane += 0.05;
      pane += 0.3;
      expect(count(0.3, 114, iGlass, (y) => south(pane, y), 0.05), "the lobby and 29 office floors").toBe(30);
      expect([is(ip.spandrel)(south(pane, floor(20) + 0.45)), iGlass(south(pane, floor(20) + 0.95)), is(ip.plant)(south(pane, floor(31) + 1)), is(ip.plant)(south(pane, 113.8))], "a spandrel, glass, and the mechanical band").toEqual([true, true, true, true]);
      // Mullions 5 ft apart: from one, ten panes to the mullion ten modules on.
      let line = x0;
      while (!is(ip.mullion)(south(line, floor(12) + 2))) line += 0.01;
      expect([count(line + 0.06, line + 10 * 1.524 - 0.06, iGlass, (x) => south(x, floor(12) + 2)), is(ip.mullion)(south(line + 10 * 1.524 + 0.03, floor(12) + 2))], "the 5 ft module").toEqual([10, true]);

      // River Plaza: OpenStreetMap's 156 m slab roof, the box on it to the published 159.7 m,
      // the Skyscraper Center's architectural top and tip, and the podium's 8 m.
      const plaza = geographicBuildings.find((r) => r.shortName === "River Plaza")!;
      const hitPlaza = cast(models["River Plaza"]!);
      expect(plaza.parts.map((part) => [part.way, part.bottom, part.top])).toEqual([[68796725, 0, 156], [68796733, 0, 8], [285867425, 156, 159.7]]);
      const middle = (coordinates: [number, number][]) => { const points = coordinates.map(ground); return [0, 1].map((k) => points.reduce((sum, p) => sum + p[k]!, 0) / points.length) as Vec2; };
      const [slab, podium, box] = plaza.parts.map((part) => middle(part.coordinates));
      near(hitPlaza([slab![0] - 20, 300, slab![1] - 4], [0, -1, 0])!.point.y, 156, 1e-3);
      near(hitPlaza([box![0], 300, box![1]], [0, -1, 0])!.point.y, 159.7, 1e-3);
      near(hitPlaza([podium![0], 300, podium![1] + 5], [0, -1, 0])!.point.y, 8, 1e-3);
      const rp = riverPlazaPalette, rGlass = (r: number) => [...rp.glass, rp.lit, rp.dim].some((hex) => is(hex)(r));
      expect(rGlass(new THREE.Color(rp.concrete).r), "concrete does not pass for glass").toBe(false);
      // Its north face, from the north: a window 1.5 m tall 75 cm over each of its 55 floor
      // lines above grade, in 1.6 m bays of the frame.
      const north = (x: number, y: number) => tone(hitPlaza([x, y, slab![1] - 60], [0, 0, 1]), "River Plaza · concrete and windows");
      const pitch = 156 / 56;
      let column = slab![0] - 5;
      while (!rGlass(north(column, 20 * pitch + 1.5))) column += 0.05;
      column += 0.3;
      expect(count(0.3, 155.8, rGlass, (y) => north(column, y), 0.05), "a window to each floor").toBe(55);
      expect([is(rp.concrete)(north(column, 20 * pitch + 0.7)), rGlass(north(column, 20 * pitch + 0.8)), rGlass(north(column, 20 * pitch + 2.2)), is(rp.concrete)(north(column, 20 * pitch + 2.3))], "a sill and a head").toEqual([true, true, true, true]);
      // From a window's west edge, within the north face's recess, six windows in six 1.6 m
      // bays.
      let edge = slab![0] - 6;
      while (rGlass(north(edge, 20 * pitch + 1.5))) edge += 0.01;
      while (!rGlass(north(edge, 20 * pitch + 1.5))) edge += 0.01;
      expect(count(edge - 0.05, edge + 6 * 1.6 - 0.1, rGlass, (x) => north(x, 20 * pitch + 1.5)), "the 1.6 m bays").toBe(6);

      // Where the podium stands against the slab, its skin starts over the podium's 8 m roof;
      // the slab's south-east end past the podium, and the bevel at its south-west corner, are
      // skinned from grade. Sampled from the river side, at 4 m and 10 m.
      const fromSouth = (x: number, z: number, y: number, direction: Vec3 = [0, 0, -1]) => hitPlaza([x, y, z], direction)!.object.name;
      expect([fromSouth(-67, -500, 4), fromSouth(-67, -500, 10)], "over the podium").toEqual(["River Plaza · shell", "River Plaza · concrete and windows"]);
      // The bevel faces south-west; its probe starts 3 m out along that normal from its middle.
      const bevel: Vec2 = [(-93.9 - 91.8) / 2, (-553 - 550.9) / 2];
      expect([fromSouth(-44.7, -540, 4), fromSouth(bevel[0] - 3 * Math.SQRT1_2, bevel[1] + 3 * Math.SQRT1_2, 4, [Math.SQRT1_2, 0, -Math.SQRT1_2])], "past the podium").toEqual(["River Plaza · concrete and windows", "River Plaza · concrete and windows"]);

      // The exact mapped outlines at grade: Two Illinois Center's, and River Plaza's slab and
      // podium.
      const grade = (model: BuildingModel, name: string) => {
        const shell = (model.building.children.find((child) => child.name === name) as THREE.Mesh).geometry.getAttribute("position");
        const points = new Set<string>();
        for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) points.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
        return points;
      };
      const mapped = (coordinates: [number, number][]) => coordinates.map((p) => { const [x, n] = projectGround(p); return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(","); });
      expect(grade(models["Two Illinois Center"]!, "Two Illinois Center · shell")).toEqual(new Set(mapped(center.footprint.coordinates)));
      expect(grade(models["River Plaza"]!, "River Plaza · shell")).toEqual(new Set([...mapped(plaza.parts[0]!.coordinates), ...mapped(plaza.parts[1]!.coordinates)]));
    }, { timeout: 60_000 });
  });

  describe("Hyatt Regency West Tower", () => {
    test("keeps its mapped part, its window slots between solid corners, and the plain band", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Hyatt West Tower")!;
      const model = models["Hyatt West Tower"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      // The published 111.3 m roof, and the record's one part, the tower's.
      expect(record.parts.map((part) => [part.way, part.bottom, part.top])).toEqual([[235920252, 0, 111.3]]);
      near(hit([189, 300, -319], [0, -1, 0])!.point.y, 111.3, 1e-3);
      const palette = hyattWestPalette, is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const glass = (r: number) => [...palette.glass, palette.lit, palette.dim].some((hex) => is(hex)(r));
      const [brick, spandrel] = [is(palette.brick), is(palette.spandrel)];
      expect([palette.brick, palette.spandrel].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
      // The east face, from (201.8, -298.1) to (202, -340.8), sampled from the east.
      const east = (z: number, y: number) => {
        const found = hit([240, y, z], [-1, 0, 0])!;
        expect(found.object.name).toBe("Hyatt Regency West Tower · brick and windows");
        return (found.object as THREE.Mesh).geometry.getAttribute("color").getX(found.face!.a);
      };
      const count = (from: number, to: number, sample: (s: number) => number, step = 0.02) => {
        let runs = 0, inside = false;
        for (let x = from; x < to; x += step) { const now = glass(sample(x)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      const pitch = 111.3 / 33, window = (n: number) => (n - 1) * pitch + 1.8;
      // Slots 1 m wide on the 3.5 m module: from one slot's edge, five slots in five modules.
      let edge = -330;
      while (glass(east(edge, window(12)))) edge += 0.01;
      while (!glass(east(edge, window(12)))) edge += 0.01;
      expect([count(edge + 0.02, edge + 5 * 3.5 - 0.1, (z) => east(z, window(12))), brick(east(edge - 0.05, window(12))), glass(east(edge + 0.95, window(12))), brick(east(edge + 1.05, window(12)))], "the slots").toEqual([5, true, true, true]);
      // Up a slot, the lobby's glass and a window on each floor from the second to the
      // thirty-first, a spandrel between; the plain band over them; the corners solid.
      const slot = edge + 0.5;
      expect([count(0.3, 111, (y) => east(slot, y), 0.05), spandrel(east(slot, (12 - 1) * pitch + 0.4)), brick(east(slot, 110)), brick(east(-340, window(12))), brick(east(-299, window(12)))], "the floors, the band and the corners").toEqual([31, true, true, true, true]);
      // Each window 2.1 m tall from 80 cm over its floor, sampled 5 cm either side of its
      // sill and head on the twelfth and thirty-first floors; the band from the last head.
      const [sill, head] = [(n: number) => (n - 1) * pitch + 0.8, (n: number) => (n - 1) * pitch + 2.9];
      expect([12, 31].flatMap((n) => [spandrel(east(slot, sill(n) - 0.05)), glass(east(slot, sill(n) + 0.05)), glass(east(slot, head(n) - 0.05))]), "the sills and heads").toEqual(Array(6).fill(true));
      expect([spandrel(east(slot, head(12) + 0.05)), brick(east(slot, head(31) + 0.05))], "a spandrel over a head, and the band over the last").toEqual([true, true]);
      // The exact mapped part at grade.
      const shell = meshes.find((mesh) => mesh.name === "Hyatt Regency West Tower · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Sheraton Grand Chicago Riverwalk", () => {
    test("keeps its mapped L, the corner's round tower, the three finned drums and the windows", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Sheraton Grand")!;
      const model = models["Sheraton Grand"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      // On the Skyscraper Center's datum: the top floor at 97 m, the corner's roof 3.1 m over
      // it, the arms two floors of 2.67 m lower, and 12.2 m drums, the corner's to 112.3 m.
      const [corner, arms] = [100.1, 100.1 - 2 * 2.67];
      expect(record.parts.map((part) => [part.way, part.bottom, part.top])).toEqual([[592122464, 0, 94.76], [1269924307, 94.76, 100.1]]);
      const down = (x: number, z: number) => hit([x, 300, z], [0, -1, 0])!.point.y;
      near(down(407.44, -465.95), corner + 12.2, 1e-3);
      near(down(439.52, -462.06), arms + 12.2, 1e-3);
      near(down(409.75, -498.32), arms + 12.2, 1e-3);
      near(down(425, -462), arms, 1e-3);
      // The corner's round tower over the arms, sampled from the south-west.
      near(down(404, -465), corner + 12.2, 1e-3);
      const palette = sheratonPalette, is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const glass = (r: number) => [...palette.glass, palette.lit, palette.dim].some((hex) => is(hex)(r));
      expect([palette.precast, palette.drum, palette.fin].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false, false]);
      const tone = (found: THREE.Intersection | undefined, name: string) => {
        expect(found!.object.name).toBe(name);
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      // A drum's 24 facets, sampled toward its centre, alternate cream and maroon fins.
      const facet = (k: number) => {
        const angle = (k + 0.5) / 24 * Math.PI * 2, [x, z] = [439.52 + 12 * Math.cos(angle), -462.06 + 12 * Math.sin(angle)];
        return tone(hit([x, arms + 6, z], [-Math.cos(angle), 0, -Math.sin(angle)]), "Sheraton Grand · drums");
      };
      expect(Array.from({ length: 6 }, (_, k) => is(k % 2 ? palette.fin : palette.drum)(facet(k))), "the fins").toEqual(Array(6).fill(true));
      // The east arm's south face: a window 1.5 m tall 80 cm over each floor line, counted
      // down from the top floor at 97 m, 35 of them under the arms' roof.
      const south = (x: number, y: number) => tone(hit([x, y, -420], [0, 0, -1]), "Sheraton Grand · precast and windows");
      let column = 420;
      while (!glass(south(column, 50))) column += 0.02;
      column += 0.3;
      const line = 97 - 2 * 2.67;
      expect([count(0.3, arms - 0.1, (y) => south(column, y)), is(palette.precast)(south(column, line + 0.75)), glass(south(column, line + 0.85)), glass(south(column, line + 2.25)), is(palette.precast)(south(column, line + 2.35))], "the floors, a sill and a head").toEqual([35, true, true, true, true]);
      function count(from: number, to: number, sample: (s: number) => number) {
        let runs = 0, inside = false;
        for (let y = from; y < to; y += 0.05) { const now = glass(sample(y)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      }
      // The corner's round tower: its two floors over the arms' roof, the 33rd and 34th, each
      // with a window, probed toward its centre from the south-west; and its own roof under
      // the drum, on the shell alone.
      const toward = (angle: number, y: number) => tone(hit([407.44 + 12 * Math.cos(angle), y, -465.95 + 12 * Math.sin(angle)], [-Math.cos(angle), 0, -Math.sin(angle)]), "Sheraton Grand · precast and windows");
      let angle = 0.75 * Math.PI;
      while (glass(toward(angle, 98.5))) angle += 0.002;
      while (!glass(toward(angle, 98.5))) angle += 0.002;
      angle += 0.05;
      const edges = (level: number) => [is(palette.precast)(toward(angle, level + 0.75)), glass(toward(angle, level + 0.85)), glass(toward(angle, level + 2.25)), is(palette.precast)(toward(angle, level + 2.35))];
      expect([count(arms + 0.05, corner - 0.05, (y) => toward(angle, y)), ...edges(97 - 2.67), ...edges(97)], "the corner's floors").toEqual([2, ...Array(8).fill(true)]);
      ray.set(new THREE.Vector3(407.44, 105, -465.95), new THREE.Vector3(0, -1, 0));
      near(ray.intersectObject(meshes.find((mesh) => mesh.name === "Sheraton Grand · shell")!, false)[0]!.point.y, corner, 1e-3);
      // The exact mapped L at grade.
      const shell = meshes.find((mesh) => mesh.name === "Sheraton Grand · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
  });

  describe("Three Illinois Center", () => {
    test("keeps its mapped outline, its curtain wall on the 5 ft module and the windowless penthouse", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Three Illinois Center")!;
      const model = models["Three Illinois Center"]!;
      model.building.updateMatrixWorld(true);
      const meshes = model.building.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
      const ray = new THREE.Raycaster();
      const hit = (from: Vec3, direction: Vec3) => {
        ray.set(new THREE.Vector3(...from), new THREE.Vector3(...direction));
        return ray.intersectObjects(meshes, false)[0];
      };
      // The published 106.7 m over 30 storeys: floors 11.5 ft slab to slab, 29 of them over
      // the lobby, the top two the penthouse.
      expect(record.parts.map((part) => [part.way, part.bottom, part.top])).toEqual([[95486958, 0, 106.7]]);
      near(hit([389.88, 300, -273.78], [0, -1, 0])!.point.y, 106.7, 1e-3);
      const pitch = 3.505, lobby = 106.7 - 29 * pitch;
      const floor = (n: number) => lobby + (n - 2) * pitch;
      const palette = threeIllinoisPalette, is = (hex: number) => (r: number) => Math.abs(r - new THREE.Color(hex).r) < 0.002;
      const glass = (r: number) => [...palette.glass, palette.lit, palette.dim].some((hex) => is(hex)(r));
      expect([palette.mullion, palette.spandrel].map((hex) => glass(new THREE.Color(hex).r)), "no wall colour passes for glass").toEqual([false, false]);
      const tone = (found: THREE.Intersection | undefined) => {
        expect(found!.object.name).toBe("Three Illinois Center · curtain wall");
        return (found!.object as THREE.Mesh).geometry.getAttribute("color").getX(found!.face!.a);
      };
      const count = (from: number, to: number, sample: (s: number) => number, step: number) => {
        let runs = 0, inside = false;
        for (let s = from; s < to; s += step) { const now = glass(sample(s)); if (now && !inside) runs += 1; inside = now; }
        return runs;
      };
      // The east face, the one the gap between 340 on the Park and The Buckingham shows,
      // sampled from the east between two mullions: the lobby's glass under its fascia, 27
      // office floors of spandrel and glass, and the penthouse's bronze to the roof.
      const east = (z: number, y: number) => tone(hit([440, y, z], [-1, 0, 0]));
      let pane = -278;
      while (!glass(east(pane, floor(10) + 2))) pane += 0.05;
      pane += 0.3;
      expect(count(0.3, 106.6, (y) => east(pane, y), 0.05), "the lobby and 27 office floors").toBe(28);
      expect([glass(east(pane, lobby - 0.41)), is(palette.spandrel)(east(pane, lobby - 0.31)), is(palette.spandrel)(east(pane, floor(2) + 0.85)), glass(east(pane, floor(2) + 0.95))], "the lobby's fascia").toEqual([true, true, true, true]);
      // Every office floor, second to twenty-eighth: its 90 cm spandrel from the floor, then
      // glass to the next; and the penthouse from the 29th floor to the roof.
      const office = Array.from({ length: 27 }, (_, k) => k + 2).map((n) => [n === 2 || is(palette.spandrel)(east(pane, floor(n) + 0.05)), is(palette.spandrel)(east(pane, floor(n) + 0.85)), glass(east(pane, floor(n) + 0.95)), glass(east(pane, floor(n + 1) - 0.05))]);
      expect(office.flatMap((edges, k) => edges.every(Boolean) ? [] : [k + 2]), "floors whose spandrel or glass is off the 11.5 ft pitch").toEqual([]);
      expect([is(palette.spandrel)(east(pane, floor(29) + 0.05)), is(palette.spandrel)(east(pane, 106.6))], "the penthouse").toEqual([true, true]);
      // Mullions 5 ft apart: from one, ten panes to the mullion ten modules on; and a mullion
      // carried up through the penthouse.
      let line = -278;
      while (!is(palette.mullion)(east(line, floor(12) + 2))) line += 0.01;
      expect([count(line + 0.06, line + 10 * 1.524 - 0.06, (z) => east(z, floor(12) + 2), 0.02), is(palette.mullion)(east(line + 10 * 1.524 + 0.03, floor(12) + 2)), is(palette.mullion)(east(line + 0.03, 103))], "the 5 ft module").toEqual([10, true, true]);
      // The exact mapped outline at grade.
      const shell = meshes.find((mesh) => mesh.name === "Three Illinois Center · shell")!.geometry.getAttribute("position");
      const grade = new Set<string>();
      for (let i = 0; i < shell.count; i += 1) if (shell.getY(i) === 0) grade.add([shell.getX(i), shell.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set<string>(record.footprint.coordinates.map((p) => {
        const [x, n] = projectGround(p);
        return [Math.fround(x), Math.fround(-n)].map((v) => v.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    }, { timeout: 60_000 });
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
    expect(await page.locator("#dimensions-body tr").count()).toBe(33);
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
    // The geographic platform and every building stay inside the light's shadow camera.
    const shadowBounds = await page.evaluate(() => window.__buildingStudy!.shadowBounds);
    expect(shadowBounds.min.every((v: number) => v > -1) && shadowBounds.max.every((v: number) => v < 1),
      `the geographic platform and buildings should stay within the light's shadow camera: ${JSON.stringify(shadowBounds)}`).toBe(true);
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
    // 340 on the Park, The Buckingham, Millennium Park Plaza and Willoughby Tower, which only
    // the geographic layout models.
    expect(projected.length).toBe(33);
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
