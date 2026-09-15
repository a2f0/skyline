const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require("playwright");

// Run against the local static server; see README.md. Chrome's real WebGL
// renderer catches shader, mesh, picking, and layout problems syntax checks miss.
const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const position = (page) => page.evaluate(() => window.__buildingStudy.cameraPosition);
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });
    await page.goto(`${origin}/building-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await settle(page);
    assert.equal(await page.locator("#loading").isHidden(), true);
    const initial = await position(page);
    const canvas = page.locator("canvas");
    const bounds = await canvas.boundingBox();
    const reference = await page.locator(".reference").boundingBox();
    const viewport = await page.locator("#viewport").boundingBox();
    assert.ok(Math.abs(viewport.height - reference.height) < 1, "reference and model panes should have the same height");
    const hint = await page.locator("#camera-hint").boundingBox();
    assert.ok(bounds.y + bounds.height <= hint.y, "camera hints should not overlap the model canvas");
    const triangles = await page.evaluate(() => window.__buildingStudy.triangleCount);
    assert.ok(triangles > 100 && triangles < 10000, "the model should have a modest triangle budget");
    const idleFrames = await page.evaluate(() => window.__buildingStudy.renderCount);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__buildingStudy.renderCount), idleFrames, "idle scene must not keep rendering");

    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height * 0.6);
    await page.waitForFunction(() => window.__buildingStudy.highlighted);
    assert.equal(await page.locator("#tooltip").textContent(), "Crain Communications Building");
    await page.mouse.move(5, 5);
    assert.equal(await page.locator("#tooltip").isHidden(), true);
    await page.screenshot({ path: "/tmp/skyline-3d-desktop.png", fullPage: true });
    const shaded = await canvas.screenshot();

    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 90, bounds.y + bounds.height / 2 + 15, { steps: 8 });
    await page.mouse.up();
    assert.notDeepEqual(await position(page), initial, "drag must orbit real geometry");
    await page.locator("#reset").click();
    assert.deepEqual(await position(page), initial, "reset should restore the camera");

    await page.locator('[data-view="side"]').click();
    assert.notDeepEqual(await position(page), initial);
    await page.screenshot({ path: "/tmp/skyline-3d-side.png", fullPage: true });
    assert.notDeepEqual(await canvas.screenshot(), shaded, "side view must change rendered pixels");
    await page.locator("#reset").click();
    await page.locator("#wireframe").click();
    assert.equal(await page.locator("#wireframe").getAttribute("aria-pressed"), "true");
    assert.notDeepEqual(await canvas.screenshot(), shaded, "wireframe must change rendered pixels");
    await page.locator("#wireframe").click();

    await page.locator("#turntable").click();
    await page.waitForTimeout(300);
    assert.notDeepEqual(await position(page), initial, "turntable should rotate the camera");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !window.__buildingStudy.turning);
    const stopped = await position(page);
    await page.waitForTimeout(300);
    assert.deepEqual(await position(page), stopped, "reduced motion should stop a running turntable");
    assert.equal(await page.locator("#turntable").isDisabled(), true);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.deepEqual(await position(page), stopped, "reduced motion should block pointer camera movement");
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    assert.notDeepEqual(await position(page), stopped, "keyboard inspection must remain available with reduced motion");
    await page.keyboard.press("Home");
    assert.deepEqual(await position(page), initial);
    await page.keyboard.press("+");
    assert.notDeepEqual(await position(page), initial, "keyboard zoom must work");
    await page.locator('[data-view="front"]').click();
    assert.equal(await page.locator('[data-view="front"]').getAttribute("aria-pressed"), "true");
    assert.deepEqual(errors, [], "study should load and render without browser errors");
    assert.deepEqual(externalRequests, [], "study should use only locally served assets");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/building-study.html`);
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "mobile layout must not overflow horizontally");
    const mobileInitial = await position(mobile);
    const mobileBounds = await mobile.locator("canvas").boundingBox();
    const session = await mobile.context().newCDPSession(mobile);
    const touch = { x: mobileBounds.x + mobileBounds.width / 2, y: mobileBounds.y + mobileBounds.height / 2 };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, x: touch.x + 45 }] });
    // Rest before lifting, as a finger does after a drag. An instant release
    // reads as a fling, and Chrome may swallow the next tap to stop that fling.
    await mobile.waitForTimeout(100);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notDeepEqual(await position(mobile), mobileInitial, "touch drag must orbit on mobile");
    await mobile.locator("#reset").tap();
    await mobile.waitForTimeout(300);
    await mobile.screenshot({ path: "/tmp/skyline-3d-mobile.png", fullPage: true });

    // Verify navigation and all pre-existing viewer modes after adding the link.
    await mobile.locator(".back").tap();
    await mobile.locator('a[href="building-study.html"]').waitFor();
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator("#toggle-skyline").tap();
    assert.equal(await mobile.locator("#scene").getAttribute("src"), "skyline-original-fit.svg");
    await mobile.locator("#toggle-webgl").tap();
    await mobile.frameLocator("#webgl-scene").locator("#badge").waitFor({ state: "visible", timeout: 30000 });
    assert.equal(await mobile.locator("#scene").isHidden(), true);
    await mobile.locator("#toggle-webgl").tap();
    assert.equal(await mobile.locator("#scene").getAttribute("src"), "skyline-animated.svg");
    assert.equal(await mobile.locator("#webgl-scene").isHidden(), true);
    assert.deepEqual(errors, [], "mobile study and existing viewer modes should not throw");

    const fallback = await browser.newPage();
    await fallback.goto(pathToFileURL(path.resolve(__dirname, "../building-study.html")).href);
    assert.match(await fallback.locator("#loading").textContent(), /python3 -m http.server/);
    assert.equal(await fallback.locator("#turntable").isDisabled(), true);
    await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await fallback.goto(`${origin}/building-study.html`);
    await fallback.waitForFunction(() => document.querySelector("#loading").textContent.includes("WebGL 2"));
    assert.equal(await fallback.locator("#reset").isDisabled(), true);
    console.log(`PASS: ${triangles} model triangles; rendering, hover, orbit, views, wireframe, reduced motion, keyboard, mobile touch, existing modes, and fallbacks.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
