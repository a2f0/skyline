const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require("playwright");
const { heritage, kemper, crain, michigan, prudential, reference, models, landmarks, landmarkTolerance, fitted } = require("./skyline-landmarks.cjs");
const { viewports, checkSpec, measureStudy, above } = require("./study-fidelity.cjs");

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const cameraPosition = (page) => page.evaluate(() => window.__buildingStudy.cameraPosition);
// Exclude tooltip overlap from pixel checks; its text is asserted separately.
const patch = (page, point) => page.screenshot({ style: "#tooltip { visibility: hidden !important; }", clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
const heritageModule = models.find((model) => model.id === heritage).module;
const heritageSpec = fitted.find((spec) => spec.id === heritage);
const prudentialModule = models.find((model) => model.id === prudential).module;
const prudentialSpec = fitted.find((spec) => spec.id === prudential);
// The layouts come from the shared list, so scripts/fidelity-report.cjs measures the same pages.
const [desktop, laptop, tablet, tall, phone] = viewports;

async function checkReferenceMatch(page) {
  // Landmarks, columns, and sight lines come from tests/skyline-landmarks.cjs through the
  // shared maths in tests/study-fidelity.cjs, which scripts/fidelity-report.cjs also uses.
  const { deviations, buildings } = await page.evaluate(measureStudy, { landmarks, landmarkTolerance, fitted, models });
  for (const [name, result] of Object.entries(deviations)) {
    assert.ok(result.error < result.tolerance, `${name} should follow source: ${JSON.stringify(result)}`);
  }
  for (const building of buildings) {
    const { label, onGeometryTolerance } = fitted.find((spec) => spec.id === building.id);
    for (const [name, distance] of Object.entries(building.onGeometry)) assert.ok(distance < onGeometryTolerance, `${label} ${name} should lie on the model geometry: ${distance} m`);
  }
  const { projected, columns, silhouette } = buildings.find((building) => building.id === heritage);
  assert.ok(above(deviations, "Kemper near roof", "Kemper left roof", "Kemper right roof"), "Kemper's near roof corner should rise above both neighboring corners, as in the SVG");
  assert.ok(above(deviations, "Michigan near roof", "Michigan left roof", "Michigan right roof"), "Michigan Plaza's near roof corner should rise above both neighboring corners");
  assert.ok(above(deviations, "screenFrontTop", "screenNorthTop", "screenSouthTop"), "Heritage's screen front corner should rise above both screen ends");
  assert.ok(above(deviations, "stubFrontRoof", "stubLeftRoof"), "Heritage's stub front corner should rise above its left silhouette corner");
  assert.ok(above(deviations, "roofNear", "roofLeft", "roofRight"), "One Prudential's near roof corner should rise above both neighboring corners, as in the SVG");
  assert.ok(above(deviations, "penthouseTopEast", "penthouseTopWest"), "One Prudential's penthouse should rise toward its east end, as drawn");
  const cap = { apex: projected.capApex, ends: [projected.capSouthEnd, projected.capNorthEnd] };
  assert.ok(cap.ends.every((end) => cap.apex[1] < end[1]), `Heritage's crown cap should crest over the joint, above both of its ends: ${JSON.stringify(cap)}`);
  for (const building of buildings) {
    const spec = fitted.find((entry) => entry.id === building.id);
    for (const [name, list] of Object.entries(building.columns)) {
      const { batch, drawn, tolerance = spec.columnTolerance } = spec.columns[name];
      assert.equal(list.length, drawn.length, `${spec.label} should export every drawn ${name}`);
      list.forEach((column, index) => assert.ok(Math.abs(column.actual - column.expected) < tolerance, `${spec.label} ${name} ${index + 1} should line up with the drawing: ${JSON.stringify(column)}`));
      building.sightGaps[name].forEach(({ gap, mesh }, index) => assert.ok(gap > spec.sightGap[0] && gap < spec.sightGap[1] && mesh === batch, `${spec.label} ${name} ${index + 1} should stand proud as the first surface on its sight line: ${gap} m on ${mesh}`));
    }
  }
  // Fin 3 stands on the joint and fin 11 on the bow's end; bays narrow as the bow turns away.
  const fins = columns.crownFins.map((column) => column.actual);
  for (let index = 3; index < 10; index += 1) {
    assert.ok(fins[index + 1] - fins[index] < fins[index] - fins[index - 1], `Heritage's crown fin spacing should narrow across the bow: ${JSON.stringify(fins)}`);
  }
  const lowerSouthWest = projected.lowerSouthWest.map((uv) => uv[0]);
  assert.ok(lowerSouthWest.every((u) => u >= silhouette - 0.001), `Heritage's trimmed lower tier and its cap and band overhangs should stay inside the drawn left silhouette: ${JSON.stringify({ lowerSouthWest, silhouette })}`);
  // One Prudential's wing ends the drawn silhouette on the right, so the model is held to it.
  const wing = buildings.find((building) => building.id === prudential);
  // The wall's north-east corner reaches furthest, its foot furthest of all at 2.80 layer
  // units past the drawn edge, against the 3.06 this slack allows. The ribs stand proud of
  // that wall but land well inside it; they are checked to keep them there.
  const wingEdge = [wing.projected.wingCorner, wing.projected.wingEastEnd, ...wing.projected.wingRibEdge].map(([u]) => u);
  assert.ok(wingEdge.every((u) => u <= wing.silhouette + 0.001), `One Prudential's wing and its ribs should stay inside the drawn right silhouette: ${JSON.stringify({ wingEdge, silhouette: wing.silhouette })}`);
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
  checkSpec({ fitted, models });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage(desktop.options);
    const errors = [], external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) external.push(request.url()); });
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.__buildingStudy.modelNames), models.map((model) => model.name));
    assert.equal(await page.evaluate(() => window.__buildingStudy.activeView), "skyline");
    // A budget for the whole scene; raise it deliberately when a detailed building lands.
    const triangles = await page.evaluate(() => window.__buildingStudy.triangleCount);
    assert.ok(triangles > 24000 && triangles < 40000, `the scene should stay within 24,000-40,000 triangles: ${triangles}`);
    await checkReferenceMatch(page);
    assert.equal(await page.evaluate(async ({ groups, path, sourcePath }) => {
      const parse = async (url) => new DOMParser().parseFromString(await (await fetch(url)).text(), "image/svg+xml");
      const source = await parse(sourcePath), reference = await parse(path);
      const expected = source.querySelectorAll(groups.map((id) => `#${id} path`).join(", "));
      const actual = [...reference.querySelectorAll("path")];
      const transforms = (part) => {
        const chain = [];
        for (let node = part; node && !node.classList.contains("interactive-building"); node = node.parentElement) chain.push(node.getAttribute("transform"));
        return JSON.stringify(chain);
      };
      return actual.length === expected.length && actual.every((part, index) => part.id === expected[index].id && part.getAttribute("d") === expected[index].getAttribute("d") && transforms(part) === transforms(expected[index]));
    }, { groups: reference.groups, path: reference.path, sourcePath: reference.source }), true, "reference must preserve original path geometry, nested transforms, and draw order");
    const initial = await cameraPosition(page);
    const idle = await page.evaluate(() => window.__buildingStudy.renderCount);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__buildingStudy.renderCount), idle);

    const heritageFeatures = await page.evaluate(async ([url, name]) => (await import(url))[name], [heritageModule, heritageSpec.features]);
    const prudentialFeatures = await page.evaluate(async ([url, name]) => (await import(url))[name], [prudentialModule, prudentialSpec.features]);
    const points = [await screenPoint(page, heritage, heritageFeatures.bowFacade), await screenPoint(page, kemper, [-5, 75, 26.8]), await screenPoint(page, crain, [0, 65, 27.1]), await screenPoint(page, michigan, [0, 120, 23.4]), await screenPoint(page, prudential, prudentialFeatures.southFacade)];
    const before = [];
    for (const point of points) before.push(await patch(page, point));
    for (const [index, id, label] of [[0, heritage, "The Heritage at Millennium Park"], [1, kemper, "Kemper Building"], [2, crain, "Crain Communications Building"], [3, michigan, "Michigan Plaza South"], [4, prudential, "One Prudential Plaza"]]) {
      await page.mouse.move(points[index].x, points[index].y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), id);
      assert.equal(await page.locator("#tooltip").textContent(), label);
      assert.notDeepEqual(await patch(page, points[index]), before[index], `${label} should illuminate`);
      for (let neighbor = 0; neighbor < points.length; neighbor += 1) {
        if (neighbor !== index) assert.deepEqual(await patch(page, points[neighbor]), before[neighbor], `neighbor ${neighbor} should stay unlit while hovering ${label}`);
      }
    }
    // The drawing covers Michigan Plaza's rightmost 47 layer units with One Prudential, so
    // the nearer slab owns those pixels.
    const hiddenMichigan = await screenPoint(page, michigan, [23.35, 120, -20]);
    await page.mouse.move(hiddenMichigan.x, hiddenMichigan.y);
    await settle(page);
    assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), prudential, "One Prudential should own the hover where the drawing covers Michigan Plaza's right edge");
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
    // The side view turns the skyline view's lateral spacing into depth, so whichever
    // building sits furthest right in the drawing stands nearest the camera here. One
    // Prudential is 154 m right of Crain, so it takes this hover; Michigan owned it while
    // it was the rightmost tower.
    assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), prudential, "One Prudential should own the hover where it occludes Crain in side view");
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

    await page.setViewportSize(laptop.options.viewport);
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
    for (const size of [tablet, tall].map(({ options }) => options.viewport)) {
      await page.setViewportSize(size);
      await page.locator("#reset").click();
      await settle(page);
      await checkReferenceMatch(page);
      await checkCameraFloor(page, `/tmp/skyline-group-tablet-${size.width}-far.png`);
    }
    assert.deepEqual(external, []);

    const mobile = await browser.newPage(phone.options);
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
    console.log("PASS: five 3D buildings, SVG landmarks with Heritage's and One Prudential's geometry, columns, and bow curvature, independent illumination and occlusion, view/reset/zoom, idle rendering, reduced motion, mobile touch, local assets, navigation, and fallbacks.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
