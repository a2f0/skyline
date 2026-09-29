import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, Frame, Page } from "playwright";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { geographicLandmarks } from "./skyline-landmarks.js";
import { viewports } from "./study-fidelity.js";

const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page | Frame) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a: number, b: number, tolerance: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);

// The frame the skyline viewer shows the drawing in, and the translate that places the
// drawing's layer inside it, read from the file the viewer loads. Landmarks are drawn in
// layer units.
const drawing = readFileSync(path.resolve(import.meta.dirname, "../skyline-animated.svg"), "utf8");
const [boxX, boxY, boxWidth, boxHeight] = /viewBox="([^"]+)"/.exec(drawing)![1]!.split(/\s+/).map(Number) as [number, number, number, number];
const [shiftX, shiftY] = /id="skyline-position" transform="translate\(([^,]+),([^)]+)\)"/.exec(drawing)!.slice(1).map(Number) as [number, number];

async function openScene(page: Page) {
  const scene = (await (await page.locator("#skyline-3d-scene").elementHandle())!.contentFrame())!;
  await scene.waitForURL(/\/skyline-3d\.html$/);
  await scene.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
  return scene;
}

describe("full-screen 3D skyline", () => {
  let browser!: Browser;
  const errors: string[] = [], external: string[] = [];
  const watch = (page: Page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) external.push(request.url()); });
  };
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("stands the mapped buildings where the skyline viewer draws them, at every layout", async () => {
    // The page frames the drawing's viewBox through the geographic skyline camera, centred
    // and bottom-aligned as the viewer's SVG is, so each landmark lands on its drawn point
    // within the camera fit's own residuals: the skyline study allows 64 layer units and an
    // RMS of 30.3. 1600x700 and 2400x700 are wider than the viewBox, whose height binds.
    const placed: Record<string, [number, number][]> = {};
    const sizes = [...viewports.map(({ options }) => options.viewport!), { width: 1600, height: 700 }, { width: 2400, height: 700 }];
    const page = await browser.newPage({ viewport: sizes[0]! });
    watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await page.evaluate(() => [window.__buildingStudy!.activeView, window.__buildingStudy!.projection])).toEqual(["skyline", "perspective"]);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await settle(page);
      const measured = await page.evaluate(([landmarks, box]) => {
        const canvas = document.querySelector("canvas")!.getBoundingClientRect();
        const [x, y, width, height] = box;
        const scale = Math.min(canvas.width / width, canvas.height / height);
        return landmarks.map(([, id, point]) => {
          const [u, v] = window.__buildingStudy!.projectPoint(id, point);
          return [x + (u * canvas.width - (canvas.width - width * scale) / 2) / scale, y + (v * canvas.height - (canvas.height - height * scale)) / scale] as [number, number];
        });
      }, [geographicLandmarks, [boxX - shiftX, boxY - shiftY, boxWidth, boxHeight]] as const);
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
    // The eye stands where the photograph was taken, 2 m above the street datum.
    near((await page.evaluate(() => window.__buildingStudy!.cameraPosition))[1]!, 2, 1e-6);
    // The ground stands where the study's geographic layout puts it, under every building.
    const { platform, buildings } = await page.evaluate(() => ({ platform: window.__buildingStudy!.platformBounds, buildings: window.__buildingStudy!.modelBounds }));
    expect(buildings.length).toBe(geographicBuildings.length);
    for (const { id, min, max } of buildings) {
      expect([0, 2].every((axis) => min[axis]! >= platform.min[axis]! && max[axis]! <= platform.max[axis]!), `${id} stands on the platform`).toBe(true);
    }
    // It is the study's geographic ground: its centre stands in the same place relative to
    // Crain's mapped outline, which the study registers elsewhere.
    const groundFromCrain = (from: Page) => from.evaluate(() => {
      const { platformBounds: { min, max }, modelBounds } = window.__buildingStudy!;
      const crain = modelBounds.find(({ id }) => id === "building-crain-communications")!;
      return [0, 1, 2].map((axis) => (min[axis]! + max[axis]! - crain.min[axis]! - crain.max[axis]!) / 2);
    });
    const study = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(study);
    await study.goto(`${origin}/skyline-study.html`);
    await study.waitForFunction(() => window.__buildingStudy?.ready);
    const expected = await groundFromCrain(study);
    (await groundFromCrain(page)).forEach((value, axis) => near(value, expected[axis]!, 1e-6));
    await study.close();
    // Hover names the building under the pointer, as the viewer's SVG does.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle(page);
    const [u, v] = await page.evaluate(() => window.__buildingStudy!.projectPoint("layer3", [284, 200, -50]));
    await page.mouse.move(u * 1440, v * 1000);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding)).toBe("layer3");
    expect(await page.locator("#tooltip").textContent()).toBe("Aon Center · 346.3 m / tip 362.5 m");
    await page.screenshot({ path: "/tmp/skyline-3d.png" });
    await page.close();
  }, { timeout: 180_000 });

  test("pans with the pointer through the lens shift", async () => {
    // Shift-drag moves the eye and pivot together, so a point at the pivot's depth follows
    // the pointer. Crain's mapped centre at the street lies on that depth; the pivot is on
    // the sightline at Crain. The lens shift widens the field of view the controls read.
    for (const size of [{ width: 1440, height: 1000 }, { width: 620, height: 1400 }]) {
      const page = await browser.newPage({ viewport: size });
      watch(page);
      await page.goto(`${origin}/skyline-3d.html`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      const project = () => page.evaluate(() => window.__buildingStudy!.projectPoint("building-crain-communications", [0, 0, 0]));
      const before = await project();
      const start = { x: size.width / 2, y: size.height / 3 };
      await page.keyboard.down("Shift");
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 200, start.y + 60, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.up("Shift");
      const after = await project();
      near((after[0] - before[0]) * size.width, 200, 4);
      near((after[1] - before[1]) * size.height, 60, 4);
      expect(await page.evaluate(() => window.__buildingStudy!.activeView)).toBeNull();
      await page.close();
    }
  }, { timeout: 180_000 });

  test("switches in from the skyline viewer over its stars, and keeps an orbit while hidden", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(page);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await page.goto(`${origin}/index.html`);
    await page.locator('a[href="skyline-study.html"]', { hasText: "skyline study" }).waitFor();
    expect(requested, "the 3D skyline waits until it is chosen").not.toContain("/skyline-3d.html");
    const toggle = page.locator("#toggle-3d");
    expect([await toggle.textContent(), await toggle.getAttribute("aria-pressed")]).toEqual(["3d skyline", "false"]);
    await toggle.click();
    expect([await toggle.textContent(), await toggle.getAttribute("aria-pressed")]).toEqual(["show enhanced", "true"]);
    expect(await page.locator("#skyline-3d-scene").getAttribute("src")).toBe("skyline-3d.html");
    expect(await page.locator("#scene").isHidden()).toBe(true);
    expect(await page.locator("#stars").isVisible(), "the stars stay behind the 3D skyline").toBe(true);
    const scene = await openScene(page);
    expect(await scene.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]))
      .toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]);
    await page.screenshot({ path: "/tmp/skyline-3d-viewer.png" });

    // Orbit, hide the scene for the enhanced skyline, and bring it back: the hidden frame has
    // no size, and the eye must not be refitted to it.
    await scene.locator("#building").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowUp");
    const orbit = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
    await toggle.click();
    expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
    expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-animated.svg");
    expect(await page.locator("#scene").isVisible()).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await toggle.click();
    await settle(scene);
    expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBeNull();
    (await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).forEach((value, axis) => near(value, orbit[axis]!, 1e-6));
    await scene.locator("#reset").click();
    expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBe("skyline");

    // The other modes replace it, and each returns to the enhanced skyline.
    await page.locator("#toggle-skyline").click();
    expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
    expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-original-fit.svg");
    expect(await toggle.textContent()).toBe("3d skyline");
    await page.locator("#toggle-skyline").click();
    expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-animated.svg");
    await page.close();
  }, { timeout: 180_000 });

  test("keeps its controls above the skyline on a phone, with views to tap through under reduced motion", async () => {
    const phone = await browser.newPage({ ...viewports[4].options, reducedMotion: "reduce" });
    watch(phone);
    await phone.goto(`${origin}/index.html`);
    await phone.locator("#toggle-3d").tap();
    const scene = await openScene(phone);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // The drawing's frame is as wide as a portrait screen; the controls wait above it.
    const { controls, frameTop } = await scene.evaluate(([width, height]) => ({
      controls: document.querySelector(".scene-controls")!.getBoundingClientRect().bottom,
      frameTop: innerHeight - innerWidth * height / width,
    }), [boxWidth, boxHeight] as const);
    expect(controls).toBeLessThanOrEqual(frameTop + 0.5);
    await phone.screenshot({ path: "/tmp/skyline-3d-mobile.png" });
    // Reduced motion stops dragging and the turntable; the view buttons still move the camera
    // at once, as the hint says.
    expect(await scene.locator("#turntable").isDisabled()).toBe(true);
    expect(await scene.locator("#camera-hint").textContent()).toContain("Use the view buttons to inspect");
    const eye = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
    for (const view of ["quarter", "side"]) {
      await scene.locator(`[data-view="${view}"]`).tap();
      expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBe(view);
      expect(await scene.locator(`[data-view="${view}"]`).getAttribute("aria-pressed")).toBe("true");
      expect(await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).not.toEqual(eye);
    }
    await scene.locator("#reset").tap();
    expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBe("skyline");
    (await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).forEach((value, axis) => near(value, eye[axis]!, 1e-6));
    await phone.close();
  }, { timeout: 180_000 });

  test("loads only local assets without page errors", () => {
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
});
