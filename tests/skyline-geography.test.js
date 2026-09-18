import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import * as THREE from "../vendor/three-r186.js";
import { geographicBuildings, geographicStreets } from "../models/skyline-geography-data.js";
import { projectGround, footprintMetrics, createGeographicBuilding } from "../models/skyline-geography.js";

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a, b, tolerance) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);

describe("mapped skyline geography", () => {
  const models = {};
  beforeAll(() => {
    for (const record of geographicBuildings) models[record.shortName] = createGeographicBuilding(record);
  });

  test("projects ground coordinates from the tangent-plane origin", () => {
    // Independent geographic anchors catch swapped coordinates, reversed north,
    // degrees-as-meters, and the temptation to retain the drawing's tower order.
    near(projectGround([-87.62497155, 41.88582645])[1], 111.07, 0.02);
    near(projectGround([-87.62397155, 41.88482645])[0], 83.0, 0.02);
  });

  test("places each mapped building with closed geometry and its published height", () => {
    const expected = {
      Heritage: [-65.7, -91.7, 192.4], Kemper: [-204, 188.9, 159], Crain: [0, 0, 177.4],
      "Michigan Plaza S": [117.1, 139, 168.6], Trump: [-123.3, 449.4, 423.2],
      "One Prudential": [152, 11.1, 278], "Two Prudential": [186.9, 65.7, 303.3], Aon: [284.2, 50.6, 362.5],
    };
    expect(geographicBuildings.length).toBe(8);
    for (const record of geographicBuildings) {
      const metrics = footprintMetrics(record.footprint.coordinates);
      const [east, north, height] = expected[record.shortName];
      near(metrics.center[0], east, 0.1);
      near(metrics.center[1], north, 0.1);
      expect(metrics.area > 500 && metrics.area < 10000, `${record.shortName} plausible footprint area`).toBe(true);
      const model = models[record.shortName];
      const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      const groundBounds = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
      model.building.traverse((child) => {
        if (!child.isMesh) return;
        const position = child.geometry.getAttribute("position"), edges = new Map();
        const key = (i) => [position.getX(i), position.getY(i), position.getZ(i)].map((n) => n.toFixed(3)).join(",");
        for (let i = 0; i < position.count; i += 1) {
          // Facade relief and balconies can project above the mapped ground
          // outline. Only vertices at grade determine street-level coverage.
          if (position.getY(i) < 0.2) [position.getX(i), position.getZ(i)].forEach((n, axis) => {
            groundBounds.min[axis] = Math.min(groundBounds.min[axis], n);
            groundBounds.max[axis] = Math.max(groundBounds.max[axis], n);
          });
          [position.getX(i), position.getY(i), position.getZ(i)].forEach((n, axis) => {
            expect(Number.isFinite(n), `${record.shortName} finite vertex`).toBe(true);
            bounds.min[axis] = Math.min(bounds.min[axis], n); bounds.max[axis] = Math.max(bounds.max[axis], n);
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
  });

  describe("Heritage", () => {
    test("keeps the design-drawing terraces and the mapped grade outline", () => {
      const record = geographicBuildings.find((r) => r.shortName === "Heritage");
      const model = models.Heritage;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => child.isMesh);
      const hit = (hitOrigin, direction, targets = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // Independent samples in the city's section and plans. A tower extruded
      // to 192.4 m everywhere, or the old level-count estimates, cannot pass.
      near(hit([-82, 220, 85], [0, -1, 0]).point.y, 32.8176, 0.001);
      near(hit([-53, 220, 120], [0, -1, 0]).point.y, 89.5096, 0.001);
      near(hit([-57, 220, 92], [0, -1, 0]).point.y, 181.2036, 0.001);
      const eastWing = hit([0, 60, 110], [-1, 0, 0]);
      expect(eastWing.point.x < -41.5 && eastWing.point.x > -44, "Heritage lower east facade bows inward from the map chord").toBe(true);
      expect(hit([0, 120, 110], [-1, 0, 0]), "Heritage lower wing stops below upper tower").toBeUndefined();
      const groundMesh = meshes.find((mesh) => mesh.name === "Heritage · mapped ground footprint");
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      expect(grade).toEqual(mapped);
    });
  });

  describe("Trump", () => {
    test("keeps the mapped tier roofs, spire joints and setback walls", () => {
      const model = models.Trump;
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => child.isMesh);
      const hit = (hitOrigin, direction, targets = meshes) => {
        ray.set(new THREE.Vector3(...hitOrigin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // The mapped tier boundaries: a downward ray meets each tier's roof at its
      // OSM part height where the next tier does not cover it.
      near(hit([-95, 100, -450], [0, -1, 0]).point.y, 60, 0.001);
      near(hit([-150, 150, -430], [0, -1, 0]).point.y, 120, 0.001);
      near(hit([-104, 250, -450], [0, -1, 0]).point.y, 200, 0.001);
      near(hit([-115, 360, -450], [0, -1, 0]).point.y, 345, 0.001);
      near(hit([-126, 370, -450], [0, -1, 0]).point.y, 357, 0.001);
      // The three-section mast: mapped joints at 380 and 400, the published tip
      // above them, and a seated base on the crown roof.
      near(hit([-121.45, 430, -461.04], [0, -1, 0]).point.y, 423.2, 0.001);
      near(hit([-121.45, 410, -461.04], [0, -1, 0]).point.y, 400, 0.001);
      near(hit([-121.45, 390, -461.04], [0, -1, 0]).point.y, 380, 0.001);
      near(hit([-121.45, 350, -461.04], [0, 1, 0]).point.y, 357, 0.001);
      // The mapped setbacks: the east wall stands on the base tier line, then
      // steps 15 m west for the shaft, while the west wall leaves the Wabash lot
      // line for the shaft. Glazed facade detail must be the first surface.
      near(hit([-90, 90, -455], [-1, 0, 0]).point.x, -98.509, 0.02);
      near(hit([-90, 150, -455], [-1, 0, 0]).point.x, -98.579, 0.02);
      near(hit([-90, 250, -455], [-1, 0, 0]).point.x, -113.464, 0.02);
      near(hit([-90, 350, -455], [-1, 0, 0]).point.x, -115.182, 0.02);
      near(hit([-165, 90, -430], [1, 0, 0]).point.x, -161.684, 0.02);
      near(hit([-165, 150, -430], [1, 0, 0]).point.x, -146.86, 0.02);
      // The glazed south face carries panes, bands and mullions rather than a
      // bare mapped shell.
      const south = hit([-120, 300, -380], [0, 0, -1]);
      expect(south.object.name).toMatch(/glaz|mullion/);
      near(south.point.z, -427.198, 0.02);
    });
  });

  test("retains the mapped upper street set", () => {
    expect(geographicStreets.some((street) => street.name === "North Michigan Avenue")).toBe(true);
    expect(geographicStreets.every((street) => !street.name.includes("Lower"))).toBe(true);
  });
});

describe("geographic layout in the study", () => {
  let browser, page, originalBounds, originalCamera, errors = [], externalRequests = [];
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });
  });
  afterAll(async () => {
    await browser.close();
  });

  test("opens the orthographic plan with the mapped buildings at published heights", { timeout: 180_000 }, async () => {
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    originalBounds = await page.evaluate(() => __buildingStudy.modelBounds);
    originalCamera = await page.evaluate(() => __buildingStudy.cameraPosition);
    expect(await page.locator("#dimensions-body tr").count()).toBe(8);
    await page.locator('[data-layout="geographic"]').click();
    await settle(page);
    expect(await page.evaluate(() => [__buildingStudy.layout, __buildingStudy.projection, __buildingStudy.activeView]))
      .toEqual(["geographic", "orthographic", "top"]);
    expect(await page.locator("#streets").isEnabled()).toBe(true);
    // In plan, an XY point at the roof and ground must have identical screen
    // coordinates; orthographic projection keeps equal distances at all heights.
    const plan = await page.evaluate(() => {
      const id = "building-crain-communications";
      return [__buildingStudy.projectPoint(id, [0, 0, 0]), __buildingStudy.projectPoint(id, [0, 423, 0]), __buildingStudy.projectPoint(id, [100, 0, 0]), __buildingStudy.projectPoint(id, [0, 0, -100])];
    });
    near(plan[0][0], plan[1][0], 1e-5);
    near(plan[0][1], plan[1][1], 1e-5);
    expect(plan[2][0] > plan[0][0], "east points right").toBe(true);
    expect(plan[3][1] < plan[0][1], "north points up").toBe(true);
    const geographicBounds = await page.evaluate(() => __buildingStudy.modelBounds);
    for (const record of geographicBuildings) near(geographicBounds.find((b) => b.id === record.id).max[1], record.tipHeight, 0.001);
  });

  test("pans and zooms to inspect streets, preserving the comparison pose across toggles", { timeout: 180_000 }, async () => {
    await page.locator("#building").focus();
    for (let i = 0; i < 40; i += 1) await page.keyboard.press("+");
    const planBounds = await page.locator("#building").boundingBox();
    const panStart = await page.evaluate(() => __buildingStudy.cameraPosition);
    await page.keyboard.down("Shift");
    await page.mouse.move(planBounds.x + planBounds.width / 2, planBounds.y + planBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(planBounds.x + planBounds.width / 2 + 30, planBounds.y + planBounds.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await settle(page);
    expect(await page.evaluate(() => __buildingStudy.cameraPosition), "plan can pan to inspect streets at larger scale").not.toEqual(panStart);
    const zoom = await page.evaluate(() => __buildingStudy.zoom);
    near(zoom, 24, 1e-8);
    const pose = await page.evaluate(() => __buildingStudy.cameraPosition);
    for (const layout of ["original", "geographic", "original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      await settle(page);
      near(await page.evaluate(() => __buildingStudy.zoom), zoom, 1e-8);
      expect(await page.evaluate(() => __buildingStudy.groundShadows), "plan toggles retain the uncluttered ground").toBe(false);
      const camera = await page.evaluate(() => __buildingStudy.cameraPosition);
      camera.forEach((value, axis) => near(value, pose[axis], 1e-5));
    }
  });

  test("picks mapped buildings and toggles streets", { timeout: 180_000 }, async () => {
    await page.locator('[data-view="top"]').click();
    await settle(page);
    const canvas = await page.locator("#building").boundingBox();
    const center = await page.evaluate(() => __buildingStudy.projectPoint("building-crain-communications", [0, 145, 0]));
    await page.mouse.move(canvas.x + center[0] * canvas.width, canvas.y + center[1] * canvas.height);
    await settle(page);
    expect(await page.evaluate(() => __buildingStudy.selectedBuilding), "mapped building can be picked").toBe("building-crain-communications");
    expect(await page.locator("#tooltip").textContent()).toMatch(/177.4 m/);
    await page.locator("#streets").click();
    expect(await page.locator("#streets").getAttribute("aria-pressed")).toBe("false");
  });

  test("keeps shadows in elevated custom views", { timeout: 180_000 }, async () => {
    await page.locator('[data-view="heights"]').click();
    await page.locator("#building").focus();
    await page.keyboard.press("+");
    expect(await page.evaluate(() => __buildingStudy.activeView), "zoom leaves the height preset").toBeNull();
    for (const layout of ["original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      expect(await page.evaluate(() => __buildingStudy.groundShadows), "toggle preserves ground shadows in an elevated custom view").toBe(true);
    }
    await settle(page);
    await page.screenshot({ path: "/tmp/skyline-geographic-heights-tested.png" });
  });

  test("restores the original transforms and camera after the round trip", { timeout: 180_000 }, async () => {
    await page.locator('[data-layout="original"]').click();
    await page.locator("#reset").click();
    await settle(page);
    expect(await page.evaluate(() => __buildingStudy.modelBounds)).toEqual(originalBounds);
    expect(await page.evaluate(() => __buildingStudy.cameraPosition)).toEqual(originalCamera);
    expect(await page.evaluate(() => __buildingStudy.projection)).toBe("perspective");
  });

  test("respects reduced motion and stays idle on mobile", { timeout: 180_000 }, async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('[data-layout="geographic"]').click();
    expect(await page.locator("#turntable").isDisabled()).toBe(true);
    expect(await page.evaluate(() => __buildingStudy.turning)).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#building").scrollIntoViewIfNeeded();
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "table scrolls without widening mobile page").toBe(true);
    const projected = await page.evaluate(() => __buildingStudy.modelBounds.map(({ id, min, max }) => ({ id, min, max })));
    expect(projected.length).toBe(8);
    await page.screenshot({ path: "/tmp/skyline-geographic-mobile.png" });
    const frame = await page.evaluate(() => __buildingStudy.renderCount);
    await page.waitForTimeout(180);
    expect(await page.evaluate(() => __buildingStudy.renderCount), "geographic mode stays idle").toBe(frame);
  });

  test("loads only local assets without page errors", { timeout: 180_000 }, async () => {
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
});
