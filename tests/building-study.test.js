import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

// Run against the local static server; see README.md. Chrome's real WebGL
// renderer catches shader, mesh, picking, and layout problems syntax checks miss.
const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const position = (page) => page.evaluate(() => window.__buildingStudy.cameraPosition);
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

describe("single-building study", () => {
  let browser, page, initial, bounds, errors = [], externalRequests = [];
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });
    await page.goto(`${origin}/building-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await settle(page);
    initial = await position(page);
    bounds = await page.locator("canvas").boundingBox();
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("loads with matching panes, a modest budget, and no idle rendering", { timeout: 180_000 }, async () => {
    expect(await page.locator("#loading").isHidden()).toBe(true);
    const reference = await page.locator(".reference").boundingBox();
    const viewport = await page.locator("#viewport").boundingBox();
    expect(Math.abs(viewport.height - reference.height) < 1, "reference and model panes should have the same height").toBe(true);
    const hint = await page.locator("#camera-hint").boundingBox();
    expect(bounds.y + bounds.height <= hint.y, "camera hints should not overlap the model canvas").toBe(true);
    const triangles = await page.evaluate(() => window.__buildingStudy.triangleCount);
    expect(triangles > 100 && triangles < 10000, "the model should have a modest triangle budget").toBe(true);
    const idleFrames = await page.evaluate(() => window.__buildingStudy.renderCount);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__buildingStudy.renderCount), "idle scene must not keep rendering").toBe(idleFrames);
  });

  test("hovers the building and hides the tooltip off it", { timeout: 180_000 }, async () => {
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height * 0.6);
    await page.waitForFunction(() => window.__buildingStudy.highlighted);
    expect(await page.locator("#tooltip").textContent()).toBe("Crain Communications Building");
    await page.mouse.move(5, 5);
    expect(await page.locator("#tooltip").isHidden()).toBe(true);
  });

  test("drags to orbit and resets the camera", { timeout: 180_000 }, async () => {
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 90, bounds.y + bounds.height / 2 + 15, { steps: 8 });
    await page.mouse.up();
    expect(await position(page), "drag must orbit real geometry").not.toEqual(initial);
    await page.locator("#reset").click();
    expect(await position(page), "reset should restore the camera").toEqual(initial);
  });

  test("renders views and wireframe as real pixel changes", { timeout: 180_000 }, async () => {
    await page.screenshot({ path: "/tmp/skyline-3d-desktop.png", fullPage: true });
    const shaded = await page.locator("canvas").screenshot();
    await page.locator('[data-view="side"]').click();
    expect(await position(page)).not.toEqual(initial);
    await page.screenshot({ path: "/tmp/skyline-3d-side.png", fullPage: true });
    expect(await page.locator("canvas").screenshot(), "side view must change rendered pixels").not.toEqual(shaded);
    await page.locator("#reset").click();
    await page.locator("#wireframe").click();
    expect(await page.locator("#wireframe").getAttribute("aria-pressed")).toBe("true");
    expect(await page.locator("canvas").screenshot(), "wireframe must change rendered pixels").not.toEqual(shaded);
    await page.locator("#wireframe").click();
  });

  test("turntable rotates until reduced motion stops it", { timeout: 180_000 }, async () => {
    await page.locator("#turntable").click();
    await page.waitForTimeout(300);
    expect(await position(page), "turntable should rotate the camera").not.toEqual(initial);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !window.__buildingStudy.turning);
    const stopped = await position(page);
    await page.waitForTimeout(300);
    expect(await position(page), "reduced motion should stop a running turntable").toEqual(stopped);
    expect(await page.locator("#turntable").isDisabled()).toBe(true);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await position(page), "reduced motion should block pointer camera movement").toEqual(stopped);
  });

  test("keyboard inspection stays available with reduced motion", { timeout: 180_000 }, async () => {
    await page.locator("canvas").focus();
    const beforeArrow = await position(page);
    await page.keyboard.press("ArrowLeft");
    expect(await position(page), "keyboard inspection must remain available with reduced motion").not.toEqual(beforeArrow);
    await page.keyboard.press("Home");
    expect(await position(page)).toEqual(initial);
    await page.keyboard.press("+");
    expect(await position(page), "keyboard zoom must work").not.toEqual(initial);
    await page.locator('[data-view="front"]').click();
    expect(await page.locator('[data-view="front"]').getAttribute("aria-pressed")).toBe("true");
  });

  test("loads only local assets without errors", { timeout: 180_000 }, async () => {
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });

  test("mobile layout fits, orbits by touch, and keeps existing viewer modes", { timeout: 180_000 }, async () => {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/building-study.html`);
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile layout must not overflow horizontally").toBe(true);
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
    expect(await position(mobile), "touch drag must orbit on mobile").not.toEqual(mobileInitial);
    await mobile.locator("#reset").tap();
    await mobile.waitForTimeout(300);
    await mobile.screenshot({ path: "/tmp/skyline-3d-mobile.png", fullPage: true });

    // Verify navigation and all pre-existing viewer modes after adding the link.
    await mobile.locator(".back").tap();
    await mobile.locator('a[href="building-study.html"]').waitFor();
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.locator("#toggle-skyline").tap();
    expect(await mobile.locator("#scene").getAttribute("src")).toBe("skyline-original-fit.svg");
    await mobile.locator("#toggle-webgl").tap();
    await mobile.frameLocator("#webgl-scene").locator("#badge").waitFor({ state: "visible", timeout: 30000 });
    expect(await mobile.locator("#scene").isHidden()).toBe(true);
    await mobile.locator("#toggle-webgl").tap();
    expect(await mobile.locator("#scene").getAttribute("src")).toBe("skyline-animated.svg");
    expect(await mobile.locator("#webgl-scene").isHidden()).toBe(true);
    expect(errors).toEqual([]);
    await mobile.close();
  });

  test("shows fallback messages without a server or WebGL", { timeout: 180_000 }, async () => {
    const fallback = await browser.newPage();
    await fallback.goto(pathToFileURL(path.resolve(import.meta.dirname, "../building-study.html")).href);
    expect(await fallback.locator("#loading").textContent()).toMatch(/python3 -m http.server/);
    expect(await fallback.locator("#turntable").isDisabled()).toBe(true);
    await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await fallback.goto(`${origin}/building-study.html`);
    await fallback.waitForFunction(() => document.querySelector("#loading").textContent.includes("WebGL 2"));
    expect(await fallback.locator("#reset").isDisabled()).toBe(true);
    await fallback.close();
  });
});
