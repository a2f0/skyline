const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require("playwright");

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const cameraPosition = (page) => page.evaluate(() => window.__buildingStudy.cameraPosition);
// Exclude tooltip overlap from pixel checks; its text is asserted separately.
const patch = (page, point) => page.screenshot({ style: "#tooltip { visibility: hidden !important; }", clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
const kemper = "building-kemper", crain = "building-crain-communications";
const michigan = "building-michigan-plaza-south-tower", heritage = "building-heritage-at-millennium-park";
const heritageModule = "./models/heritage-at-millennium-park.js";
// Corresponding roof features measured in the original SVG, not derived from
// the camera config. A tolerance allows the hand-drawn perspective to differ.
const landmarks = [
  ["Kemper left roof", kemper, [-15.5, 141, 26.75], [2440, 1811]],
  ["Kemper near roof", kemper, [15.5, 141, 26.75], [2588, 1803]],
  ["Kemper right roof", kemper, [15.5, 141, -26.75], [2759, 1819]],
  ["Crain left shoulder", crain, [-27, 135.4, 27], [2748, 1850]],
  ["Crain right shoulder", crain, [27, 135.4, -27], [3198, 1854]],
  ["Crain peak", crain, [-27, 177.4, -27], [2945, 1590]],
  ["Crain near valley", crain, [27, 93.4, 27], [2987, 2130]],
  ["Michigan left roof", michigan, [-23.35, 180, 23.35], [3255, 1577]],
  ["Michigan near roof", michigan, [23.35, 180, 23.35], [3466, 1572]],
  ["Michigan right roof", michigan, [23.35, 180, -23.35], [3662, 1589]],
];
// Heritage's 3D points are the model's exported features, paired with vertices of
// its drawn group. Each must also lie on an edge of the built model, so moving the
// geometry without its exported constant fails too.
const heritageLandmarks = {
  screenFrontTop: [2256.9, 1417.98],
  screenNorthTop: [2440.27, 1436.67],
  screenSouthTop: [2223.52, 1421.32],
  penthouseCorniceTip: [2152.75, 1440.34],
  stubFrontRoof: [2116.25, 1502.7],
  stubLeftRoof: [2062.84, 1506.77],
  reentrantRoof: [2134.28, 1504.8],
  capSouthEnd: [2154.42, 1500.78],
  capNorthEnd: [2440.26, 1520.79],
  crownFootNorth: [2440.43, 1609.97],
  lowerCapSouthCorner: [2084.43, 2213.79],
  lowerCapNorth: [2287.2, 2222.5],
  lowerFinFootNorth: [2281.8, 2298.7],
};
// Drawn x positions: the fourteen mullion lines, the thirteen crown fins, and the
// ten lower-tier fins. The left silhouette is the stub's drawn edge.
const heritageColumns = {
  mullions: [2140.4, 2162.9, 2189.7, 2218.4, 2246.2, 2273.1, 2298.6, 2319.8, 2341.8, 2360.9, 2379.9, 2400.7, 2418.3, 2436.4],
  crownFins: [2163.9, 2191.3, 2217.7, 2246.8, 2272.4, 2296.9, 2320.0, 2341.1, 2360.7, 2380.1, 2399.3, 2419.1, 2436.3],
  lowerFins: [2097.3, 2111.8, 2129.1, 2144.3, 2163.6, 2186.55, 2207.5, 2228.3, 2252.0, 2276.9],
};
const heritageSilhouette = 2062.84;
// Heritage was fitted numerically, so it holds a tighter bound than the hand-placed trio.
const heritageTolerance = 0.008;

async function checkReferenceMatch(page) {
  const { deviations, columns, sightGaps, onGeometry, cap, lowerSouthWest, silhouette } = await page.evaluate(async ({ landmarks, heritage, heritageModule, heritageLandmarks, heritageColumns, heritageSilhouette }) => {
    const THREE = await import("./vendor/three-r186.js");
    const { heritageFeatures: features, createHeritageAtMillenniumParkBuilding } = await import(heritageModule);
    const source = await (await fetch(document.querySelector(".reference img").src)).text();
    const viewBox = new DOMParser().parseFromString(source, "image/svg+xml").documentElement.viewBox.baseVal;
    // Fit the reference to the canvas, accounting for the differently sized
    // source pane in the stacked mobile layout.
    const canvas = document.querySelector("canvas").getBoundingClientRect();
    const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
    const paddingX = (canvas.width - viewBox.width * scale) / 2;
    const paddingY = (canvas.height - viewBox.height * scale) / 2;
    const expect = (source) => [(paddingX + (source[0] - viewBox.x) * scale) / canvas.width, (paddingY + (source[1] - viewBox.y) * scale) / canvas.height];
    const project = (point) => window.__buildingStudy.projectPoint(heritage, point);
    const all = [...landmarks, ...Object.entries(heritageLandmarks).map(([name, source]) => [name, heritage, features[name], source])];
    // Points on one sight line share a projection, so solve for the local direction toward
    // the camera, then cast back along it through a fresh model. Each drawn column must be
    // the first Heritage surface there, standing proud from its own batch, not merely a
    // point on the facade or panes behind it.
    const model = createHeritageAtMillenniumParkBuilding();
    model.building.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(), meshes = model.building.children.filter((child) => child.isMesh);
    const sightGap = (point) => {
      const goal = project(point);
      const direction = ([a, e]) => [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
      const miss = (angles) => { const q = project(direction(angles).map((d, i) => point[i] + d * 100)); return [q[0] - goal[0], q[1] - goal[1]]; };
      let angles = [0.72, 0];
      for (let step = 0; step < 8; step += 1) {
        const m = miss(angles), da = miss([angles[0] + 1e-5, angles[1]]), de = miss([angles[0], angles[1] + 1e-5]);
        const [j00, j01, j10, j11] = [da[0] - m[0], de[0] - m[0], da[1] - m[1], de[1] - m[1]].map((value) => value / 1e-5);
        const det = j00 * j11 - j01 * j10;
        angles = [angles[0] - (j11 * m[0] - j01 * m[1]) / det, angles[1] - (j00 * m[1] - j10 * m[0]) / det];
      }
      const toward = new THREE.Vector3(...direction(angles));
      raycaster.set(new THREE.Vector3(...point).addScaledVector(toward, 400), toward.clone().negate());
      const hit = raycaster.intersectObjects(meshes, false)[0];
      // A sight line that misses the model should fail the named assertion, not crash.
      return hit ? { gap: 400 - hit.distance, mesh: hit.object.name } : { gap: -Infinity, mesh: "no surface" };
    };
    // Distance from a feature to the nearest triangle edge of the fresh model.
    const offGeometry = (q) => {
      let nearest = Infinity;
      for (const mesh of meshes) {
        const p = mesh.geometry.getAttribute("position").array;
        for (let i = 0; i < p.length; i += 9) {
          for (const [a, b] of [[i, i + 3], [i + 3, i + 6], [i + 6, i]]) {
            const d = [0, 1, 2].map((k) => p[b + k] - p[a + k]), w = [0, 1, 2].map((k) => q[k] - p[a + k]);
            const t = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1)));
            nearest = Math.min(nearest, Math.hypot(w[0] - d[0] * t, w[1] - d[1] * t, w[2] - d[2] * t));
          }
        }
      }
      return nearest;
    };
    return {
      deviations: Object.fromEntries(all.map(([name, id, point, source]) => {
        const actual = window.__buildingStudy.projectPoint(id, point), expected = expect(source);
        return [name, { id, actual, expected, error: Math.max(...actual.map((value, axis) => Math.abs(value - expected[axis]))) }];
      })),
      columns: Object.fromEntries(Object.entries(heritageColumns).map(([name, xs]) => [name, features[name].map((point, index) => ({ actual: project(point)[0], expected: expect([xs[index], 0])[0] }))])),
      sightGaps: Object.fromEntries(Object.keys(heritageColumns).map((name) => [name, features[name].map(sightGap)])),
      onGeometry: Object.fromEntries([...Object.keys(heritageLandmarks), "capApex"].map((name) => [name, offGeometry(features[name])])),
      cap: { apex: project(features.capApex), ends: [project(features.capSouthEnd), project(features.capNorthEnd)] },
      lowerSouthWest: features.lowerSouthWest.map((point) => project(point)[0]),
      silhouette: expect([heritageSilhouette, 0])[0],
    };
  }, { landmarks, heritage, heritageModule, heritageLandmarks, heritageColumns, heritageSilhouette });
  for (const [name, result] of Object.entries(deviations)) {
    assert.ok(result.error < (result.id === heritage ? heritageTolerance : 0.03), `${name} should follow source: ${JSON.stringify(result)}`);
  }
  for (const [name, distance] of Object.entries(onGeometry)) assert.ok(distance < 0.02, `Heritage ${name} should lie on the model geometry: ${distance} m`);
  const above = (name, ...others) => others.every((other) => deviations[name].actual[1] < deviations[other].actual[1]);
  assert.ok(above("Kemper near roof", "Kemper left roof", "Kemper right roof"), "Kemper's near roof corner should rise above both neighboring corners, as in the SVG");
  assert.ok(above("Michigan near roof", "Michigan left roof", "Michigan right roof"), "Michigan Plaza's near roof corner should rise above both neighboring corners");
  assert.ok(above("screenFrontTop", "screenNorthTop", "screenSouthTop"), "Heritage's screen front corner should rise above both screen ends");
  assert.ok(above("stubFrontRoof", "stubLeftRoof"), "Heritage's stub front corner should rise above its left silhouette corner");
  assert.ok(cap.ends.every((end) => cap.apex[1] < end[1]), `Heritage's crown cap should crest over the joint, above both of its ends: ${JSON.stringify(cap)}`);
  const columnBatch = { mullions: "mullions, bands, and screen louvers", crownFins: "crown fins, caps, and penthouse frame", lowerFins: "crown fins, caps, and penthouse frame" };
  for (const [name, list] of Object.entries(columns)) {
    assert.equal(list.length, heritageColumns[name].length, `Heritage should export every drawn ${name}`);
    list.forEach((column, index) => assert.ok(Math.abs(column.actual - column.expected) < 0.006, `Heritage ${name} ${index + 1} should line up with the drawing: ${JSON.stringify(column)}`));
    // Mullion points sit on the face and fin points half a fin deep, so a present column is
    // hit 0.1-1 m toward the camera. A missing one leaves the facade at 0 or panes behind it.
    sightGaps[name].forEach(({ gap, mesh }, index) => assert.ok(gap > 0.1 && gap < 1 && mesh === columnBatch[name], `Heritage ${name} ${index + 1} should stand proud as the first surface on its sight line: ${gap} m on ${mesh}`));
  }
  // Fin 3 stands on the joint and fin 11 on the bow's end; bays narrow as the bow turns away.
  const fins = columns.crownFins.map((column) => column.actual);
  for (let index = 3; index < 10; index += 1) {
    assert.ok(fins[index + 1] - fins[index] < fins[index] - fins[index - 1], `Heritage's crown fin spacing should narrow across the bow: ${JSON.stringify(fins)}`);
  }
  assert.ok(lowerSouthWest.every((u) => u >= silhouette - 0.001), `Heritage's trimmed lower tier and its cap and band overhangs should stay inside the drawn left silhouette: ${JSON.stringify({ lowerSouthWest, silhouette })}`);
}

async function checkCameraFloor(page, screenshotPath) {
  await page.locator("canvas").focus();
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("ArrowDown");
  assert.ok((await cameraPosition(page))[1] >= 0.999, "orbit should keep the camera above ground");
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("-");
  assert.ok((await cameraPosition(page))[1] >= 0.999, "zooming out at the lowest orbit should stay above ground");
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("ArrowDown");
  assert.ok((await cameraPosition(page))[1] >= 0.999, "lowest orbit at maximum distance should stay above ground");
  await checkVisibleHighlight(page, "far");
  if (screenshotPath) await page.locator("canvas").screenshot({ path: screenshotPath });
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("+");
  await checkVisibleHighlight(page, "near");
  await page.keyboard.press("Home");
}

async function checkVisibleHighlight(page, clippingPlane) {
  const point = await screenPoint(page, michigan, [0, 120, 23.4]);
  await page.mouse.move(5, 5);
  await settle(page);
  const unlit = await patch(page, point);
  await page.mouse.move(point.x, point.y);
  await settle(page);
  assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), michigan);
  assert.notDeepEqual(await patch(page, point), unlit, `the tower must still render and illuminate within the ${clippingPlane} clipping plane`);
  await page.mouse.move(5, 5);
  await settle(page);
}

async function screenPoint(page, id, point) {
  await settle(page);
  const uv = await page.evaluate(([id, point]) => window.__buildingStudy.projectPoint(id, point), [id, point]);
  const bounds = await page.locator("canvas").boundingBox();
  return { x: bounds.x + uv[0] * bounds.width, y: bounds.y + uv[1] * bounds.height };
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const errors = [], external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) external.push(request.url()); });
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.__buildingStudy.modelNames), ["The Heritage at Millennium Park", "Kemper Building", "Crain Communications Building", "Michigan Plaza South"]);
    assert.equal(await page.evaluate(() => window.__buildingStudy.activeView), "skyline");
    assert.ok(await page.evaluate(() => window.__buildingStudy.triangleCount > 24000 && window.__buildingStudy.triangleCount < 36000));
    await checkReferenceMatch(page);
    assert.equal(await page.evaluate(async () => {
      const parse = async (url) => new DOMParser().parseFromString(await (await fetch(url)).text(), "image/svg+xml");
      const source = await parse("skyline-animated.svg"), reference = await parse("models/skyline-reference.svg");
      const expected = source.querySelectorAll("#building-heritage-at-millennium-park path, #building-kemper path, #building-michigan-plaza-south-tower path, #building-crain-communications path");
      const actual = [...reference.querySelectorAll("path")];
      const transforms = (part) => {
        const chain = [];
        for (let node = part; node && !node.classList.contains("interactive-building"); node = node.parentElement) chain.push(node.getAttribute("transform"));
        return JSON.stringify(chain);
      };
      return actual.length === expected.length && actual.every((part, index) => part.id === expected[index].id && part.getAttribute("d") === expected[index].getAttribute("d") && transforms(part) === transforms(expected[index]));
    }), true, "reference must preserve original path geometry, nested transforms, and draw order");
    const initial = await cameraPosition(page);
    const idle = await page.evaluate(() => window.__buildingStudy.renderCount);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__buildingStudy.renderCount), idle);

    const heritageFeatures = await page.evaluate(async (url) => (await import(url)).heritageFeatures, heritageModule);
    const points = [await screenPoint(page, heritage, heritageFeatures.bowFacade), await screenPoint(page, kemper, [-5, 75, 26.8]), await screenPoint(page, crain, [0, 65, 27.1]), await screenPoint(page, michigan, [0, 120, 23.4])];
    const before = [];
    for (const point of points) before.push(await patch(page, point));
    for (const [index, id, label] of [[0, heritage, "The Heritage at Millennium Park"], [1, kemper, "Kemper Building"], [2, crain, "Crain Communications Building"], [3, michigan, "Michigan Plaza South"]]) {
      await page.mouse.move(points[index].x, points[index].y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), id);
      assert.equal(await page.locator("#tooltip").textContent(), label);
      assert.notDeepEqual(await patch(page, points[index]), before[index], `${label} should illuminate`);
      for (let neighbor = 0; neighbor < points.length; neighbor += 1) {
        if (neighbor !== index) assert.deepEqual(await patch(page, points[neighbor]), before[neighbor], `neighbor ${neighbor} should stay unlit while hovering ${label}`);
      }
    }
    // Heritage's north strip continues behind Kemper's left face, so Kemper owns that hover.
    const hiddenHeritage = await screenPoint(page, heritage, heritageFeatures.northStripFacade);
    await page.mouse.move(hiddenHeritage.x, hiddenHeritage.y);
    await settle(page);
    assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), kemper, "Kemper should own the hover where it hides Heritage in the skyline view");
    await page.mouse.move(5, 5);
    await page.screenshot({ path: "/tmp/skyline-group-desktop.png", fullPage: true });
    const normal = await page.locator("canvas").screenshot();
    await page.locator("#wireframe").click();
    assert.notDeepEqual(await page.locator("canvas").screenshot(), normal);
    await page.locator("#wireframe").click();
    await page.locator('[data-view="quarter"]').click();
    assert.notDeepEqual(await cameraPosition(page), initial);
    await page.screenshot({ path: "/tmp/skyline-group-quarter.png", fullPage: true });
    await page.locator('[data-view="side"]').click();
    assert.notDeepEqual(await page.locator("canvas").screenshot(), normal);
    const hiddenCrain = await screenPoint(page, crain, [0, 70, 0]);
    await page.mouse.move(hiddenCrain.x, hiddenCrain.y);
    await settle(page);
    assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), michigan, "Michigan Plaza should own the hover where it occludes Crain in side view");
    await page.locator("#reset").click();
    assert.deepEqual(await cameraPosition(page), initial);
    await page.locator("canvas").focus();
    await page.keyboard.press("ArrowLeft");
    assert.notDeepEqual(await cameraPosition(page), initial);
    await page.keyboard.press("Home");
    assert.deepEqual(await cameraPosition(page), initial);
    await page.keyboard.press("+");
    assert.notDeepEqual(await cameraPosition(page), initial);
    await page.keyboard.press("Home");

    await checkCameraFloor(page);
    assert.deepEqual(await cameraPosition(page), initial);

    await page.setViewportSize({ width: 1280, height: 800 });
    await settle(page);
    await checkReferenceMatch(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#turntable").click();
    const started = await cameraPosition(page);
    await page.waitForTimeout(300);
    assert.notDeepEqual(await cameraPosition(page), started);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !window.__buildingStudy.turning);
    const stopped = await cameraPosition(page);
    await page.waitForTimeout(250);
    assert.deepEqual(await cameraPosition(page), stopped);
    assert.equal(await page.locator("#turntable").isDisabled(), true);
    // Tall two-column layouts need the most camera distance to fit the scene.
    for (const size of [{ width: 768, height: 1024 }, { width: 620, height: 1400 }]) {
      await page.setViewportSize(size);
      await page.locator("#reset").click();
      await settle(page);
      await checkReferenceMatch(page);
      await checkCameraFloor(page, `/tmp/skyline-group-tablet-${size.width}-far.png`);
    }
    assert.deepEqual(external, []);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/skyline-study.html`);
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator("canvas").scrollIntoViewIfNeeded();
    await checkReferenceMatch(mobile);
    const mobileInitial = await cameraPosition(mobile);
    const bounds = await mobile.locator("canvas").boundingBox();
    const session = await mobile.context().newCDPSession(mobile);
    const touch = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, x: touch.x + 45 }] });
    // Rest before lifting, as a finger does after a drag. An instant release
    // reads as a fling, and Chrome may swallow the next tap to stop that fling.
    await mobile.waitForTimeout(100);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notDeepEqual(await cameraPosition(mobile), mobileInitial);
    await mobile.locator("#reset").tap();
    assert.deepEqual(await cameraPosition(mobile), mobileInitial);
    await checkCameraFloor(mobile, "/tmp/skyline-group-mobile-far.png");
    assert.deepEqual(await cameraPosition(mobile), mobileInitial);
    await mobile.screenshot({ path: "/tmp/skyline-group-mobile.png", fullPage: true });
    await mobile.locator('a[href="building-study.html"]').tap();
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    assert.equal(await mobile.evaluate(() => window.__buildingStudy.modelName), "Crain Communications Building");
    await mobile.locator(".back").tap();
    await mobile.locator('a[href="skyline-study.html"]').tap();
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);

    const fallback = await browser.newPage();
    await fallback.goto(pathToFileURL(path.resolve(__dirname, "../skyline-study.html")).href);
    assert.match(await fallback.locator("#loading").textContent(), /localhost:8000\/skyline-study.html/);
    assert.equal(await fallback.locator("#reset").isDisabled(), true);
    await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await fallback.goto(`${origin}/skyline-study.html`);
    await fallback.waitForFunction(() => document.querySelector("#loading").textContent.includes("WebGL 2"));
    assert.equal(await fallback.locator("#turntable").isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log("PASS: four 3D buildings, SVG landmarks with Heritage's geometry, columns, and bow curvature, independent illumination and occlusion, view/reset/zoom, idle rendering, reduced motion, mobile touch, local assets, navigation, and fallbacks.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
