const assert = require("node:assert/strict");
const { chromium } = require("playwright");

process.removeAllListeners("warning");
process.on("warning", (warning) => { if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning); });

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) < tolerance, `${message}: ${a} vs ${b}`);

async function main() {
  const { geographicBuildings, geographicStreets } = await import("../models/skyline-geography-data.js");
  const { projectGround, footprintMetrics, createGeographicBuilding } = await import("../models/skyline-geography.js");
  const THREE = await import("../vendor/three-r186.js");
  // Independent geographic anchors catch swapped coordinates, reversed north,
  // degrees-as-meters, and the temptation to retain the drawing's tower order.
  near(projectGround([-87.62497155, 41.88582645])[1], 111.07, 0.02, "one millidegree north");
  near(projectGround([-87.62397155, 41.88482645])[0], 83.0, 0.02, "one millidegree east");
  const expected = {
    Heritage: [-65.7, -91.7, 192.4], Kemper: [-204, 188.9, 159], Crain: [0, 0, 177.4],
    "Michigan Plaza S": [117.1, 139, 168.6], Trump: [-123.3, 449.4, 423.2],
    "One Prudential": [152, 11.1, 278], "Two Prudential": [186.9, 65.7, 303.3], Aon: [284.2, 50.6, 362.5],
  };
  assert.equal(geographicBuildings.length, 8);
  for (const record of geographicBuildings) {
    const metrics = footprintMetrics(record.footprint.coordinates);
    const [east, north, height] = expected[record.shortName];
    near(metrics.center[0], east, 0.1, `${record.shortName} easting`);
    near(metrics.center[1], north, 0.1, `${record.shortName} northing`);
    assert.ok(metrics.area > 500 && metrics.area < 10000, `${record.shortName} plausible footprint area`);
    const model = createGeographicBuilding(record);
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
          assert.ok(Number.isFinite(n), `${record.shortName} finite vertex`);
          bounds.min[axis] = Math.min(bounds.min[axis], n); bounds.max[axis] = Math.max(bounds.max[axis], n);
        });
      }
      for (let i = 0; i < position.count; i += 3) {
        const vertices = [key(i), key(i + 1), key(i + 2)];
        assert.equal(new Set(vertices).size, 3, `${record.shortName} nondegenerate triangle`);
        for (let k = 0; k < 3; k += 1) {
          const edge = `${vertices[k]}>${vertices[(k + 1) % 3]}`;
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
      }
      for (const [edge, count] of edges) assert.equal(edges.get(edge.split(">").reverse().join(">")), count, `${record.shortName} closed mesh at ${edge}`);
    });
    near(bounds.min[1], 0, 1e-5, `${record.shortName} grounded`);
    near(bounds.max[1], height, 0.001, `${record.shortName} rendered top`);
    near(groundBounds.min[0], metrics.min[0], 0.03, `${record.shortName} west boundary`);
    near(groundBounds.max[0], metrics.max[0], 0.03, `${record.shortName} east boundary`);
    near(-groundBounds.max[1], metrics.min[1], 0.03, `${record.shortName} south boundary`);
    near(-groundBounds.min[1], metrics.max[1], 0.03, `${record.shortName} north boundary`);
    if (record.shortName === "Heritage") {
      model.building.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const meshes = model.building.children.filter((child) => child.isMesh);
      const hit = (origin, direction, targets = meshes) => {
        ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
        return ray.intersectObjects(targets, false)[0];
      };
      // Independent samples in the city's section and plans. A tower extruded
      // to 192.4 m everywhere, or the old level-count estimates, cannot pass.
      near(hit([-82, 220, 85], [0, -1, 0]).point.y, 32.8176, 0.001, "Heritage ninth-floor terrace");
      near(hit([-53, 220, 120], [0, -1, 0]).point.y, 89.5096, 0.001, "Heritage 28th-floor terrace");
      near(hit([-57, 220, 92], [0, -1, 0]).point.y, 181.2036, 0.001, "Heritage main roof below mechanical screen");
      const eastWing = hit([0, 60, 110], [-1, 0, 0]);
      assert.ok(eastWing.point.x < -41.5 && eastWing.point.x > -44, "Heritage lower east facade bows inward from the map chord");
      assert.equal(hit([0, 120, 110], [-1, 0, 0]), undefined, "Heritage lower wing stops below upper tower");
      const groundMesh = meshes.find((mesh) => mesh.name === "Heritage · mapped ground footprint");
      const vertices = groundMesh.geometry.getAttribute("position");
      const grade = new Set();
      for (let i = 0; i < vertices.count; i += 1) if (vertices.getY(i) === 0) grade.add([vertices.getX(i), vertices.getZ(i)].map((n) => n.toFixed(3)).join(","));
      const mapped = new Set(record.footprint.coordinates.map((p) => {
        const [east, north] = projectGround(p);
        return [Math.fround(east), Math.fround(-north)].map((n) => n.toFixed(3)).join(",");
      }));
      assert.deepEqual(grade, mapped, "Heritage keeps every ground-plan corner, not just its bounding box");
    }
  }
  assert.ok(geographicStreets.some((street) => street.name === "North Michigan Avenue"));
  assert.ok(geographicStreets.every((street) => !street.name.includes("Lower")));

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const originalCamera = await page.evaluate(() => __buildingStudy.cameraPosition);
    const originalBounds = await page.evaluate(() => __buildingStudy.modelBounds);
    assert.equal(await page.locator("#dimensions-body tr").count(), 8);
    await page.locator('[data-layout="geographic"]').click();
    await settle(page);
    assert.deepEqual(await page.evaluate(() => [__buildingStudy.layout, __buildingStudy.projection, __buildingStudy.activeView]), ["geographic", "orthographic", "top"]);
    assert.equal(await page.locator("#streets").isEnabled(), true);
    // In plan, an XY point at the roof and ground must have identical screen
    // coordinates; orthographic projection keeps equal distances at all heights.
    const plan = await page.evaluate(() => {
      const id = "building-crain-communications";
      return [__buildingStudy.projectPoint(id, [0, 0, 0]), __buildingStudy.projectPoint(id, [0, 423, 0]), __buildingStudy.projectPoint(id, [100, 0, 0]), __buildingStudy.projectPoint(id, [0, 0, -100])];
    });
    near(plan[0][0], plan[1][0], 1e-5, "no east perspective displacement");
    near(plan[0][1], plan[1][1], 1e-5, "no north perspective displacement");
    assert.ok(plan[2][0] > plan[0][0], "east points right");
    assert.ok(plan[3][1] < plan[0][1], "north points up");
    const geographicBounds = await page.evaluate(() => __buildingStudy.modelBounds);
    for (const record of geographicBuildings) near(geographicBounds.find((b) => b.id === record.id).max[1], record.tipHeight, 0.001, "published height in rendered scene");
    await page.locator("#building").focus();
    await page.keyboard.press("+");
    const planBounds = await page.locator("#building").boundingBox();
    const panStart = await page.evaluate(() => __buildingStudy.cameraPosition);
    await page.keyboard.down("Shift");
    await page.mouse.move(planBounds.x + planBounds.width / 2, planBounds.y + planBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(planBounds.x + planBounds.width / 2 + 30, planBounds.y + planBounds.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await settle(page);
    assert.notDeepEqual(await page.evaluate(() => __buildingStudy.cameraPosition), panStart, "plan can pan to inspect streets at larger scale");
    const zoom = await page.evaluate(() => __buildingStudy.zoom);
    assert.ok(zoom > 1, "keyboard zoom changes orthographic scale");
    const pose = await page.evaluate(() => __buildingStudy.cameraPosition);
    for (const layout of ["original", "geographic", "original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      await settle(page);
      near(await page.evaluate(() => __buildingStudy.zoom), zoom, 1e-8, "toggle preserves zoom");
      assert.equal(await page.evaluate(() => __buildingStudy.groundShadows), false, "plan toggles retain the uncluttered ground");
      const camera = await page.evaluate(() => __buildingStudy.cameraPosition);
      camera.forEach((value, axis) => near(value, pose[axis], 1e-5, "toggle preserves pose"));
    }
    await page.locator('[data-view="top"]').click();
    await settle(page);
    const canvas = await page.locator("#building").boundingBox();
    const center = await page.evaluate(() => __buildingStudy.projectPoint("building-crain-communications", [0, 145, 0]));
    await page.mouse.move(canvas.x + center[0] * canvas.width, canvas.y + center[1] * canvas.height);
    await settle(page);
    assert.equal(await page.evaluate(() => __buildingStudy.selectedBuilding), "building-crain-communications", "mapped building can be picked");
    assert.match(await page.locator("#tooltip").textContent(), /177.4 m/);
    await page.locator("#streets").click();
    assert.equal(await page.locator("#streets").getAttribute("aria-pressed"), "false");
    await page.locator('[data-view="heights"]').click();
    await page.locator("#building").focus();
    await page.keyboard.press("+");
    assert.equal(await page.evaluate(() => __buildingStudy.activeView), null, "zoom leaves the height preset");
    for (const layout of ["original", "geographic"]) {
      await page.locator(`[data-layout="${layout}"]`).click();
      assert.equal(await page.evaluate(() => __buildingStudy.groundShadows), true, "toggle preserves ground shadows in an elevated custom view");
    }
    await settle(page);
    await page.screenshot({ path: "/tmp/skyline-geographic-heights-tested.png" });
    await page.locator('[data-layout="original"]').click();
    await page.locator("#reset").click();
    await settle(page);
    assert.deepEqual(await page.evaluate(() => __buildingStudy.modelBounds), originalBounds, "original transforms survive round trip");
    assert.deepEqual(await page.evaluate(() => __buildingStudy.cameraPosition), originalCamera, "reset restores original framing");
    assert.equal(await page.evaluate(() => __buildingStudy.projection), "perspective");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('[data-layout="geographic"]').click();
    assert.equal(await page.locator("#turntable").isDisabled(), true);
    assert.equal(await page.evaluate(() => __buildingStudy.turning), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#building").scrollIntoViewIfNeeded();
    await settle(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "table scrolls without widening mobile page");
    const projected = await page.evaluate(() => __buildingStudy.modelBounds.map(({ id, min, max }) => ({ id, min, max })));
    assert.equal(projected.length, 8);
    await page.screenshot({ path: "/tmp/skyline-geographic-mobile.png" });
    const frame = await page.evaluate(() => __buildingStudy.renderCount);
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => __buildingStudy.renderCount), frame, "geographic mode stays idle");
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, [], "geographic assets are local");
  } finally { await browser.close(); }
  console.log("PASS: mapped building positions, ground extents, closed geometry and heights; orthographic plan, preserved comparison scale, picking, layout restoration, mobile, reduced motion, idle rendering and local assets.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
