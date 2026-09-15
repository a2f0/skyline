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
const michigan = "building-michigan-plaza-south-tower";
// Corresponding roof features measured in the original SVG, not derived from
// the camera config. A tolerance allows the hand-drawn perspective to differ.
const landmarks = [
  [kemper, [-15.5, 141, 26.75], [2440, 1811]],
  [kemper, [15.5, 141, 26.75], [2588, 1803]],
  [kemper, [15.5, 141, -26.75], [2759, 1819]],
  [crain, [-27, 135.4, 27], [2748, 1850]],
  [crain, [27, 135.4, -27], [3198, 1854]],
  [crain, [-27, 177.4, -27], [2945, 1590]],
  [crain, [27, 93.4, 27], [2987, 2130]],
  [michigan, [-23.35, 180, 23.35], [3255, 1577]],
  [michigan, [23.35, 180, 23.35], [3466, 1572]],
  [michigan, [23.35, 180, -23.35], [3662, 1589]],
];

async function checkReferenceMatch(page) {
  const deviations = await page.evaluate(async (landmarks) => {
    const source = await (await fetch(document.querySelector(".reference img").src)).text();
    const viewBox = new DOMParser().parseFromString(source, "image/svg+xml").documentElement.viewBox.baseVal;
    // Fit the reference to the canvas, accounting for the differently sized
    // source pane in the stacked mobile layout.
    const canvas = document.querySelector("canvas").getBoundingClientRect();
    const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
    const paddingX = (canvas.width - viewBox.width * scale) / 2;
    const paddingY = (canvas.height - viewBox.height * scale) / 2;
    return landmarks.map(([id, point, source]) => {
      const actual = window.__buildingStudy.projectPoint(id, point);
      const expected = [(paddingX + (source[0] - viewBox.x) * scale) / canvas.width, (paddingY + (source[1] - viewBox.y) * scale) / canvas.height];
      return { id, actual, expected, error: Math.max(...actual.map((value, axis) => Math.abs(value - expected[axis]))) };
    });
  }, landmarks);
  for (const result of deviations) assert.ok(result.error < 0.03, `roof landmark should follow source: ${JSON.stringify(result)}`);
  assert.ok(deviations[1].actual[1] < deviations[0].actual[1] && deviations[1].actual[1] < deviations[2].actual[1], "Kemper's near roof corner should rise above both neighboring corners, as in the SVG");
  assert.ok(deviations[8].actual[1] < deviations[7].actual[1] && deviations[8].actual[1] < deviations[9].actual[1], "Michigan Plaza's near roof corner should rise above both neighboring corners");
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
    assert.deepEqual(await page.evaluate(() => window.__buildingStudy.modelNames), ["Kemper Building", "Crain Communications Building", "Michigan Plaza South"]);
    assert.equal(await page.evaluate(() => window.__buildingStudy.activeView), "skyline");
    assert.ok(await page.evaluate(() => window.__buildingStudy.triangleCount > 4804 && window.__buildingStudy.triangleCount < 25000));
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

    const points = [await screenPoint(page, kemper, [-5, 75, 26.8]), await screenPoint(page, crain, [0, 65, 27.1]), await screenPoint(page, michigan, [0, 120, 23.4])];
    const before = [];
    for (const point of points) before.push(await patch(page, point));
    for (const [index, id, label] of [[0, kemper, "Kemper Building"], [1, crain, "Crain Communications Building"], [2, michigan, "Michigan Plaza South"]]) {
      await page.mouse.move(points[index].x, points[index].y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), id);
      assert.equal(await page.locator("#tooltip").textContent(), label);
      assert.notDeepEqual(await patch(page, points[index]), before[index], `${label} should illuminate`);
      for (let neighbor = 0; neighbor < points.length; neighbor += 1) {
        if (neighbor !== index) assert.deepEqual(await patch(page, points[neighbor]), before[neighbor], `neighbor ${neighbor} should stay unlit while hovering ${label}`);
      }
    }
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
    console.log("PASS: three 3D buildings, SVG camera landmarks, independent illumination and occlusion, view/reset/zoom, idle rendering, reduced motion, mobile touch, local assets, navigation, and fallbacks.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
