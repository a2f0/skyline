const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require("playwright");

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const cameraPosition = (page) => page.evaluate(() => window.__buildingStudy.cameraPosition);
const kemper = "building-kemper", crain = "building-crain-communications";
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
];

async function checkReferenceMatch(page) {
  const deviations = await page.evaluate((landmarks) => {
    const image = document.querySelector(".reference img").getBoundingClientRect();
    const viewBox = { x: 2076.24, y: 1412.1, width: 1481.52, height: 1419.8 };
    const scale = Math.min(image.width / viewBox.width, image.height / viewBox.height);
    const paddingX = (image.width - viewBox.width * scale) / 2;
    const paddingY = (image.height - viewBox.height * scale) / 2;
    return landmarks.map(([id, point, source]) => {
      const actual = window.__buildingStudy.projectPoint(id, point);
      const expected = [(paddingX + (source[0] - viewBox.x) * scale) / image.width, (paddingY + (source[1] - viewBox.y) * scale) / image.height];
      return { id, actual, expected, error: Math.max(...actual.map((value, axis) => Math.abs(value - expected[axis]))) };
    });
  }, landmarks);
  for (const result of deviations) assert.ok(result.error < 0.03, `roof landmark should follow source: ${JSON.stringify(result)}`);
}

async function screenPoint(page, id, point) {
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
    assert.deepEqual(await page.evaluate(() => window.__buildingStudy.modelNames), ["Kemper Building", "Crain Communications Building"]);
    assert.equal(await page.evaluate(() => window.__buildingStudy.activeView), "skyline");
    assert.ok(await page.evaluate(() => window.__buildingStudy.triangleCount > 4166 && window.__buildingStudy.triangleCount < 10000));
    await checkReferenceMatch(page);
    assert.equal(await page.evaluate(async () => {
      const parse = async (url) => new DOMParser().parseFromString(await (await fetch(url)).text(), "image/svg+xml");
      const source = await parse("skyline-animated.svg"), reference = await parse("models/skyline-pair-reference.svg");
      const expected = source.querySelectorAll("#building-kemper path, #building-crain-communications path");
      const actual = [...reference.querySelectorAll("path")];
      return actual.length === expected.length && actual.every((part) => part.getAttribute("d") === source.getElementById(part.id)?.getAttribute("d"));
    }), true, "reference must preserve original path geometry");
    const initial = await cameraPosition(page);
    const idle = await page.evaluate(() => window.__buildingStudy.renderCount);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__buildingStudy.renderCount), idle);

    const points = [await screenPoint(page, kemper, [-5, 75, 26.8]), await screenPoint(page, crain, [0, 65, 27.1])];
    const patch = (point) => page.screenshot({ clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
    const before = [await patch(points[0]), await patch(points[1])];
    for (const [index, id, label] of [[0, kemper, "Kemper Building"], [1, crain, "Crain Communications Building"]]) {
      await page.mouse.move(points[index].x, points[index].y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__buildingStudy.selectedBuilding), id);
      assert.equal(await page.locator("#tooltip").textContent(), label);
      assert.notDeepEqual(await patch(points[index]), before[index], `${label} should illuminate`);
      assert.deepEqual(await patch(points[1 - index]), before[1 - index], "neighbor should stay unlit");
    }
    await page.mouse.move(5, 5);
    await page.screenshot({ path: "/tmp/skyline-pair-desktop.png", fullPage: true });
    const normal = await page.locator("canvas").screenshot();
    await page.locator("#wireframe").click();
    assert.notDeepEqual(await page.locator("canvas").screenshot(), normal);
    await page.locator("#wireframe").click();
    await page.locator('[data-view="quarter"]').click();
    assert.notDeepEqual(await cameraPosition(page), initial);
    await page.screenshot({ path: "/tmp/skyline-pair-quarter.png", fullPage: true });
    await page.locator('[data-view="side"]').click();
    assert.notDeepEqual(await page.locator("canvas").screenshot(), normal);
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
    assert.deepEqual(external, []);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/skyline-study.html`);
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator("canvas").scrollIntoViewIfNeeded();
    const mobileInitial = await cameraPosition(mobile);
    const bounds = await mobile.locator("canvas").boundingBox();
    const session = await mobile.context().newCDPSession(mobile);
    const touch = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, x: touch.x + 45 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notDeepEqual(await cameraPosition(mobile), mobileInitial);
    await mobile.locator("#reset").tap();
    assert.deepEqual(await cameraPosition(mobile), mobileInitial);
    await mobile.screenshot({ path: "/tmp/skyline-pair-mobile.png", fullPage: true });
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
    console.log("PASS: paired 3D models, SVG camera landmarks, independent illumination, view/reset/zoom, idle rendering, reduced motion, mobile touch, local assets, navigation, and fallbacks.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
