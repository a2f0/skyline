import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, Frame, Page } from "playwright";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { footprintMetrics } from "../models/skyline-geography.js";
import { geographicLandmarks } from "./skyline-landmarks.js";
import { viewports } from "./study-fidelity.js";
import { expectPlanHolds } from "./geographic-plan.js";

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
    // The WebGL prototype, reachable from the viewer, rasterizes its textures into blob URLs of
    // the page's own origin.
    const local = [origin, "data:", `blob:${origin}/`];
    page.on("request", (request) => { if (!local.some((prefix) => request.url().startsWith(prefix))) external.push(request.url()); });
  };
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("traces the loading elevation before the 3D code arrives, then removes it at the first frame", async () => {
    for (const [width, height, reduced] of [[1440, 900, false], [390, 844, false], [390, 844, true], [844, 390, false]] as const) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      watch(page);
      let release!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/skyline-3d.js", async (route) => { await held; await route.continue(); });
      try {
        await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
        const scene = (await (await page.locator("#skyline-3d-scene").elementHandle())!.contentFrame())!;
        const trace = scene.locator(".skyline-trace");
        await trace.waitFor({ state: "visible" });
        expect(await scene.locator("#loading").textContent()).toContain("Preparing the skyline");
        expect(await scene.locator(".scene-notes").isHidden()).toBe(true);
        expect(await scene.evaluate(() => window.__buildingStudy?.ready)).toBeUndefined();
        const bounds = (await trace.boundingBox())!;
        expect(bounds.width).toBeCloseTo(Math.min(720, width - 48) / 3, 1);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        const ground = await scene.evaluate(() => {
          const svg = document.querySelector<SVGSVGElement>(".skyline-trace")!;
          const outline = document.querySelector<SVGPathElement>("#skyline-loading-outline")!;
          const baseline = outline.getPointAtLength(outline.getTotalLength()).matrixTransform(svg.getScreenCTM()!).y;
          return { baseline, toolbar: document.querySelector(".control-bar")!.getBoundingClientRect().top };
        });
        expect(ground.baseline, "the traced ground line touches the toolbar").toBeCloseTo(ground.toolbar, 1);
        const line = scene.locator(".skyline-trace-line");
        if (reduced) {
          expect(await line.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
          expect(await line.evaluate((element) => getComputedStyle(element).strokeDasharray)).toBe("none");
          expect(await scene.locator(".skyline-trace-tip").isHidden()).toBe(true);
        } else {
          const offsets = await line.evaluate((element) => {
            const animation = element.getAnimations()[0]!;
            animation.pause();
            animation.currentTime = 0;
            const start = parseFloat(getComputedStyle(element).strokeDashoffset);
            animation.currentTime = 2000;
            const middle = parseFloat(getComputedStyle(element).strokeDashoffset);
            animation.currentTime = 3200;
            return [start, middle, parseFloat(getComputedStyle(element).strokeDashoffset)];
          });
          expect(offsets[0]).toBe(1);
          expect(offsets[1]).toBeGreaterThan(0);
          expect(offsets[1]).toBeLessThan(1);
          expect(offsets[2]).toBe(0);
        }
        release();
        await scene.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
        expect(await scene.locator("#loading").isHidden()).toBe(true);
        expect(await scene.locator(".scene-notes").isHidden()).toBe(true);
        await scene.locator("#menu-toggle").click();
        expect(await scene.locator(".scene-notes").isVisible()).toBe(true);
      } finally {
        release();
        await page.close();
      }
    }
  }, { timeout: 120_000 });

  test("replaces the trace with a readable error when the scene cannot load", async () => {
    const page = await browser.newPage();
    await page.route("**/skyline-3d.js", (route) => route.abort());
    await page.goto(`${origin}/skyline-3d.html`);
    const loading = page.locator("#loading");
    await page.waitForFunction(() => document.querySelector("#loading")!.textContent!.includes("WebGL 2"));
    expect(await loading.isVisible()).toBe(true);
    expect(await loading.locator("svg").count()).toBe(0);
    expect(await loading.evaluate((element) => getComputedStyle(element).display)).not.toBe("grid");
    await page.close();
  });

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
    const canvas = (await page.locator("#building").boundingBox())!;
    await page.mouse.move(canvas.x + u * canvas.width, canvas.y + v * canvas.height);
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
      const canvas = (await page.locator("#building").boundingBox())!;
      const start = { x: size.width / 2, y: size.height / 3 };
      await page.keyboard.down("Shift");
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 200, start.y + 60, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.up("Shift");
      const after = await project();
      near((after[0] - before[0]) * canvas.width, 200, 4);
      near((after[1] - before[1]) * canvas.height, 60, 4);
      expect(await page.evaluate(() => window.__buildingStudy!.activeView)).toBeNull();
      await page.close();
    }
  }, { timeout: 180_000 });

  test("opens the skyline viewer on the 3D skyline over its stars, and keeps an orbit while hidden", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(page);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await page.goto(`${origin}/index.html`);
    const scene = await openScene(page);
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#scene").isHidden()).toBe(true);
    expect(await page.locator("#stars").isVisible(), "the stars stay behind the 3D skyline").toBe(true);
    expect(requested, "the drawing waits until it is chosen").not.toContain("/skyline-animated.svg");
    expect(requested, "the WebGL prototype waits until it is chosen").not.toContain("/skyline-webgl.html");
    expect(await scene.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]))
      .toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]);
    const toggle = page.locator("#toggle-enhanced");
    const state = async (button = toggle) => [await button.textContent(), await button.getAttribute("aria-pressed"), await button.getAttribute("title")];
    const announced = () => page.locator("#status").textContent();
    expect(await state()).toEqual(["show enhanced", "false", "Show the enhanced interactive skyline drawing"]);
    await page.screenshot({ path: "/tmp/skyline-3d-viewer.png" });

    // Orbit, switch to the enhanced skyline, and come back: the hidden frame has no size, and
    // the eye must not be refitted to it.
    await scene.locator("#building").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowUp");
    const orbit = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
    // The fullscreen shortcut works from the focused canvas, inside the scene's own frame.
    await page.evaluate(() => {
      const viewer = window as unknown as { fullscreenRequests: number };
      viewer.fullscreenRequests = 0;
      document.documentElement.requestFullscreen = async () => { viewer.fullscreenRequests++; };
    });
    await page.keyboard.press("f");
    expect(await page.evaluate(() => (window as unknown as { fullscreenRequests: number }).fullscreenRequests)).toBe(1);
    await toggle.click();
    expect(await state()).toEqual(["3d skyline", "true", "Return to the 3D skyline"]);
    expect(await announced()).toBe("Enhanced interactive skyline displayed");
    expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
    expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-animated.svg");
    expect(await page.locator("#scene").isVisible()).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await toggle.click();
    await settle(scene);
    expect(await state()).toEqual(["show enhanced", "false", "Show the enhanced interactive skyline drawing"]);
    expect(await announced()).toBe("3D skyline displayed");
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#scene").isHidden()).toBe(true);
    expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBeNull();
    (await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).forEach((value, axis) => near(value, orbit[axis]!, 1e-6));
    await scene.locator("#menu-toggle").click();
    await scene.locator("#reset").click();
    expect(await scene.evaluate(() => window.__buildingStudy!.activeView)).toBe("skyline");

    // The other modes replace it and each other, and each returns to the 3D skyline.
    const original = page.locator("#toggle-skyline");
    const webgl = page.locator("#toggle-webgl");
    await original.click();
    expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
    expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-original-fit.svg");
    expect([await state(original), await state(webgl), await state()]).toEqual([
      ["3d skyline", "true", "Return to the 3D skyline"],
      ["show webgl", "false", "Preview the WebGL skyline prototype"],
      ["show enhanced", "false", "Show the enhanced interactive skyline drawing"],
    ]);
    expect(await announced()).toBe("Original skyline displayed");
    await webgl.click();
    expect(await page.locator("#webgl-scene").getAttribute("src")).toBe("skyline-webgl.html");
    expect(await page.locator("#webgl-scene").isVisible()).toBe(true);
    expect(await page.locator("#scene").isHidden()).toBe(true);
    expect([await state(original), await state(webgl)]).toEqual([
      ["show original", "false", "Compare with the original skyline SVG"],
      ["3d skyline", "true", "Return to the 3D skyline"],
    ]);
    expect(await announced()).toBe("WebGL skyline prototype displayed");
    await webgl.click();
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#webgl-scene").isHidden()).toBe(true);
    expect(await page.locator("#scene").isHidden()).toBe(true);
    expect(await state(webgl)).toEqual(["show webgl", "false", "Preview the WebGL skyline prototype"]);
    expect(await announced()).toBe("3D skyline displayed");
    await page.close();
  }, { timeout: 180_000 });

  test("compares with the original from the star's controls and returns from the bottom without resetting the 3D view", async () => {
    for (const [width, height, reduced] of [[1440, 900, false], [390, 844, true], [844, 390, false]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });
      watch(page);
      try {
        await page.goto(`${origin}/index.html`);
        const scene = await openScene(page);
        const original = scene.locator("#show-original");
        const back = page.locator("#return-skyline-3d");
        expect(await original.isHidden(), "the shortcut stays inside the folded controls").toBe(true);
        expect(await back.isHidden()).toBe(true);
        // A request from another source, or a different origin, cannot change the mode.
        await page.evaluate(() => {
          window.postMessage({ type: "skyline:show-original" }, location.origin);
          window.dispatchEvent(new MessageEvent("message", {
            origin: "https://example.invalid",
            source: document.querySelector<HTMLIFrameElement>("#skyline-3d-scene")!.contentWindow,
            data: { type: "skyline:show-original" },
          }));
        });
        await settle(page);
        expect(await back.isHidden()).toBe(true);
        await scene.locator("#menu-toggle").click();
        await scene.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
        expect(await original.isVisible()).toBe(true);
        const [button, bar] = await Promise.all([original.boundingBox(), scene.locator(".control-bar").boundingBox()]);
        expect(button!.x >= bar!.x && button!.x + button!.width <= bar!.x + bar!.width && button!.y >= bar!.y && button!.y + button!.height <= bar!.y + bar!.height, "the original shortcut fits inside the bottom toolbar").toBe(true);
        await scene.locator("#building").focus();
        await page.keyboard.press("ArrowLeft");
        const orbit = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
        await original.click();
        await back.waitFor({ state: "visible" });
        expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
        expect(await page.locator("#scene").getAttribute("src")).toBe("skyline-original-fit.svg");
        expect(await page.locator("#toggle-skyline").textContent()).toBe("3d skyline");
        expect(await page.locator("#toggle-skyline").getAttribute("aria-pressed")).toBe("true");
        expect(await page.locator("#status").textContent()).toBe("Original skyline displayed");
        expect(await page.evaluate(() => document.activeElement?.id)).toBe("return-skyline-3d");
        const bounds = (await back.boundingBox())!;
        expect(bounds.y >= height - 44 && bounds.y + bounds.height <= height, "the return button is at the bottom").toBe(true);
        // Enter on the focused bottom button returns focus to the same shortcut in the
        // same scene. Its camera and unfolded controls survive the comparison.
        await page.keyboard.press("Enter");
        expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
        expect(await back.isHidden()).toBe(true);
        expect(await scene.locator("#menu-toggle").getAttribute("aria-expanded")).toBe("true");
        expect(await scene.evaluate(() => document.activeElement?.id)).toBe("show-original");
        (await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).forEach((value, axis) => near(value, orbit[axis]!, 1e-6));
        expect(await page.locator("#toggle-skyline").textContent()).toBe("show original");
        expect(await page.locator("#toggle-skyline").getAttribute("aria-pressed")).toBe("false");
        expect(await page.locator("#status").textContent()).toBe("3D skyline displayed");
      } finally { await page.close(); }
    }
  }, { timeout: 180_000 });

  test("folds the study's toolbar behind a star in the middle of the bar, docked under the skyline at every size", async () => {
    // The bar carries the study's toolbar, in its order, and a footprints toggle, folded
    // behind a muted grey six-pointed star. Closed, the star alone shows, in the bar's middle.
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(page);
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const toolbar = await page.locator(".toolbar button").allTextContents();
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    expect((await page.locator(".control-bar .button-group button").allTextContents()).filter((label) => label !== "footprints" && label !== "show original")).toEqual(toolbar);
    expect(await page.locator("#show-original").isHidden(), "the shortcut belongs to the index viewer").toBe(true);
    const star = page.locator("#menu-toggle");
    const groups = () => page.locator(".control-bar .button-group").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).display));
    const settled = () => page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
    expect([await star.getAttribute("aria-expanded"), await star.getAttribute("aria-label")]).toEqual(["false", "Skyline controls"]);
    const fill = () => star.locator("path").evaluate((path) => getComputedStyle(path).fill);
    expect(await fill()).toBe("rgb(140, 140, 140)");
    await star.hover();
    expect(await fill(), "the star turns white under the pointer").toBe("rgb(255, 255, 255)");
    await page.mouse.move(1, 1);
    expect(await fill()).toBe("rgb(140, 140, 140)");
    expect(await groups()).toEqual(["none", "none"]);
    expect(await page.locator("#camera-hint").isHidden(), "the hint shows only with the controls").toBe(true);
    expect(await page.locator(".attribution").isHidden(), "the attribution shows only with the controls").toBe(true);
    // The bar spans the bottom of the window, and the canvas, whose bottom edge the drawing's
    // frame stands on, fills the rest: the bar covers no tower. Closed, the bar keeps its
    // one-row height at every size, with the star in the middle. Open, every control shows
    // inside it, including either side of each of its breakpoints, and the star stays put.
    const sizes = [...viewports.map(({ options }) => options.viewport!), { width: 2400, height: 700 }, { width: 844, height: 390 },
      ...[1260, 1259, 1024, 1023, 601, 600].map((width) => ({ width, height: 768 }))];
    const measure = () => page.evaluate(() => {
      const box = (element: Element) => element.getBoundingClientRect().toJSON() as DOMRect;
      return {
        bar: box(document.querySelector(".control-bar")!),
        canvas: box(document.querySelector("#building")!),
        star: box(document.querySelector("#menu-toggle")!),
        controls: [...document.querySelectorAll(".control-bar .button-group button")].filter((button) => getComputedStyle(button).display !== "none").map(box),
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      };
    });
    const closedHeights = new Set<number>();
    for (const open of [false, true]) {
      if (open) {
        // Each group unfolds from the star. On a wide window it starts against the star, and
        // held part way, its clip is part open, it is part faded in, and it is still sliding
        // out to its edge.
        await page.setViewportSize({ width: 1440, height: 1000 });
        await settle(page);
        await star.click();
        const folds = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.id === "fold")
          .map((animation) => ({ rate: animation.playbackRate, time: Number(animation.currentTime) })));
        const { start, halfway } = await page.evaluate(() => {
          const unfolding = document.getAnimations().filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group"));
          const elements = [".camera-views", ".model-display", "#menu-toggle"].map((selector) => document.querySelector(selector)!);
          unfolding.forEach((animation) => { animation.id = "fold"; animation.pause(); animation.currentTime = 0; });
          const start = elements.map((element) => element.getBoundingClientRect().toJSON() as DOMRect);
          unfolding.forEach((animation) => { animation.currentTime = 100; });
          return { start, halfway: elements.slice(0, 2).map((group) => ({ clip: getComputedStyle(group).clipPath, opacity: Number(getComputedStyle(group).opacity), shift: getComputedStyle(group).translate })) };
        });
        const [views, display, toggle] = start as [DOMRect, DOMRect, DOMRect];
        near(views.right, toggle.left, 0.5);
        near(display.left, toggle.right, 0.5);
        expect(halfway.length).toBe(2);
        for (const { clip, opacity, shift } of halfway) {
          expect(clip, "the clip opens part way").toMatch(/^inset\(/);
          expect(clip).not.toBe("inset(-4px)");
          expect(opacity > 0.05 && opacity < 0.99 && shift !== "0px" && shift !== "none", `part faded in and still sliding: ${opacity}, ${shift}`).toBe(true);
        }
        // Toggled part way, the fold reverses from where it stands, each way: the same two
        // folds, a restart would replace them, held again as soon as the reversal takes so
        // they cannot run out while the test looks.
        const toggleHeld = () => page.evaluate(async () => {
          document.querySelector<HTMLButtonElement>("#menu-toggle")!.click();
          const held = document.getAnimations().filter((animation) => animation.id === "fold");
          await Promise.all(held.map((animation) => animation.ready));
          held.forEach((animation) => animation.pause());
          return held.map((animation) => ({ rate: animation.playbackRate, time: Number(animation.currentTime) }));
        });
        const back = await toggleHeld();
        expect(back.length, "the held folds carry on").toBe(2);
        for (const { rate, time } of back) expect(rate < 0 && time > 50 && time < 150, `folds back from ${time}, not an end`).toBe(true);
        expect(await star.getAttribute("aria-expanded")).toBe("false");
        const again = await toggleHeld();
        expect(again.length, "the held folds carry on").toBe(2);
        for (const { rate, time } of again) expect(rate > 0 && time > 50 && time < 150, `unfolds again from ${time}, not an end`).toBe(true);
        await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()));
        await settled();
        expect([await star.getAttribute("aria-expanded"), await groups(), await folds()]).toEqual(["true", ["flex", "flex"], []]);
        expect(await page.locator(".control-bar .button-group").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).clipPath))).toEqual(["none", "none"]);
        // Toggled back before a fold has moved, the groups stay where they stand rather than
        // jumping to its far end: open from a fold not yet begun, closed from an unfold.
        const toggleTwice = () => page.evaluate(() => {
          const toggle = document.querySelector<HTMLButtonElement>("#menu-toggle")!;
          toggle.click();
          toggle.click();
          const elements = [...document.querySelectorAll(".control-bar .button-group")];
          return {
            expanded: toggle.getAttribute("aria-expanded"),
            shown: elements.map((element) => [getComputedStyle(element).display, getComputedStyle(element).opacity]),
            moving: document.getAnimations().filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group")).length,
          };
        });
        expect(await toggleTwice()).toEqual({ expanded: "true", shown: [["flex", "1"], ["flex", "1"]], moving: 0 });
        await star.click();
        await settled();
        expect(await toggleTwice()).toEqual({ expanded: "false", shown: [["none", "1"], ["none", "1"]], moving: 0 });
        await star.click();
        await settled();
        expect([await star.getAttribute("aria-expanded"), await groups()]).toEqual(["true", ["flex", "flex"]]);
      }
      for (const size of sizes) {
        await page.setViewportSize(size);
        await settle(page);
        const layout = await measure();
        const at = `${open ? "open" : "closed"} at ${size.width}x${size.height}`;
        expect(await page.locator(".attribution").isVisible(), `the attribution follows the controls ${at}`).toBe(open);
        expect([layout.bar.left, layout.bar.right, layout.bar.bottom], `the bar spans the window's bottom ${at}`).toEqual([0, size.width, size.height]);
        expect([layout.canvas.top, layout.canvas.width], `the canvas fills the width above the bar ${at}`).toEqual([0, size.width]);
        near(layout.canvas.bottom, layout.bar.top, 0.5);
        expect(layout.canvas.height, `the skyline keeps most of the window ${at}`).toBeGreaterThan(size.height * 0.5);
        near(layout.star.left + layout.star.width / 2, size.width / 2, 0.5);
        for (const control of [layout.star, ...open ? layout.controls : []]) {
          expect(control.left >= layout.bar.left && control.right <= layout.bar.right && control.top >= layout.bar.top && control.bottom <= layout.bar.bottom, `a control inside the bar ${at}`).toBe(true);
        }
        // Open, camera views reach the bar's left edge and model display its right, but for
        // the narrowest windows, which centre each group in a row of its own.
        if (open && size.width >= 1024) {
          near(layout.controls[0]!.left, 12, 0.5);
          near(layout.controls.at(-1)!.right, size.width - 12, 0.5);
        }
        if (!open) closedHeights.add(layout.bar.height);
        if (open && size.width >= 1260) expect(layout.bar.height, `one row ${at}, as tall as the closed bar`).toBe([...closedHeights][0]!);
        expect(layout.overflow, `the page does not scroll ${at}`).toBe(false);
      }
      if (!open) expect([...closedHeights], "the closed bar is one height at every size").toEqual([39]);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle(page);
    // The hint shows with the controls, and the map data is credited in the scene's corner,
    // both above the bar and clear of each other.
    expect(await page.locator("#camera-hint").isVisible()).toBe(true);
    expect(await page.locator(".attribution a").getAttribute("href")).toBe("https://www.openstreetmap.org/copyright");
    for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await settle(page);
      const [hint, credit, bar] = await Promise.all([page.locator("#camera-hint").boundingBox(), page.locator(".attribution").boundingBox(), page.locator(".control-bar").boundingBox()]);
      expect(hint!.y + hint!.height <= bar!.y && credit!.y + credit!.height <= bar!.y && credit!.x + credit!.width <= size.width, `the notes show above the bar at ${size.width}`).toBe(true);
      expect(hint!.x + hint!.width <= credit!.x || hint!.y + hint!.height <= credit!.y, `the hint clears the credit at ${size.width}`).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle(page);
    await page.screenshot({ path: "/tmp/skyline-3d-control-bar.png" });

    // Ground plan and height comparison are the study's orthographic views, naming every
    // mapped building. The pressed button names the view; the bar carries no view label. The
    // plan holds every footprint and whole label above the bar, wide, on a phone, and on a
    // landscape phone, where the bar leaves the least height.
    // Ground plan alone is drawn in greys, its scene and its names.
    expect(await page.locator("#view-label").count()).toBe(0);
    expect(await page.locator('[data-view="skyline"]').getAttribute("aria-pressed")).toBe("true");
    expect(await page.locator(".study-annotations span").count(), "startup leaves unused building labels unprepared").toBe(0);
    const filters = () => page.evaluate(() => [...document.querySelectorAll("#building, .study-annotations")].map((element) => getComputedStyle(element).filter));
    expect(await filters()).toEqual(["none", "none"]);
    for (const view of ["top", "heights"]) {
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      expect(await page.evaluate(() => [window.__buildingStudy!.projection, window.__buildingStudy!.activeView])).toEqual(["orthographic", view]);
      expect(await filters()).toEqual(view === "top" ? ["grayscale(1)", "grayscale(1)"] : ["none", "none"]);
      expect(await page.locator(`[data-view="${view}"]`).getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator(".study-annotations").isVisible()).toBe(true);
      expect(await page.locator(".study-annotations span:not([hidden])").count()).toBe(geographicBuildings.length);
    }
    await page.screenshot({ path: "/tmp/skyline-3d-heights.png" });
    await page.locator('[data-view="top"]').click();
    for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      await settle(page);
      await expectPlanHolds(page);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-view="skyline"]').click();
    await settle(page);
    expect(await page.evaluate(() => [window.__buildingStudy!.projection, window.__buildingStudy!.activeView])).toEqual(["perspective", "skyline"]);
    expect(await page.locator(".study-annotations").isHidden()).toBe(true);

    // The ground toggles start with the streets' roadways showing and the footprints hidden.
    // Seen in height comparison, each changes the picture, and pressing it again restores it.
    await page.locator('[data-view="heights"]').click();
    await settle(page);
    const picture = () => page.locator("#building").screenshot();
    for (const [id, pressed] of [["streets", "true"], ["footprints", "false"]] as const) {
      const button = page.locator(`#${id}`);
      expect(await button.getAttribute("aria-pressed")).toBe(pressed);
      const before = await picture();
      await button.click();
      await settle(page);
      expect(await button.getAttribute("aria-pressed")).toBe(String(pressed === "false"));
      expect((await picture()).equals(before), `${id} changes the ground`).toBe(false);
      await button.click();
      await settle(page);
      expect(await button.getAttribute("aria-pressed")).toBe(pressed);
      expect((await picture()).equals(before), `${id} restores the ground`).toBe(true);
    }
    // Escape inside the bar folds the toolbar back behind the star and returns focus to it.
    // The folding groups take no focus, so Tab from the star does not land in them.
    await page.locator("#wireframe").focus();
    await page.keyboard.press("Escape");
    expect(await star.getAttribute("aria-expanded")).toBe("false");
    expect(await page.locator(".attribution").isHidden(), "Escape hides the attribution with the controls").toBe(true);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("menu-toggle");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest(".button-group")), "focus stays out of the folding groups").toBe(false);
    await settled();
    expect(await groups()).toEqual(["none", "none"]);
    expect(await page.locator(".control-bar").boundingBox().then((bar) => bar!.height)).toBe(39);
    await page.close();
  }, { timeout: 180_000 });

  test("opens stacked groups in place and centred, and settles a fold the window resizes under", async () => {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const star = page.locator("#menu-toggle");
    const settled = () => page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
    // Each group's fold, held at a time, and the slide it then gives the group.
    const hold = (time: number) => page.evaluate((time) => document.getAnimations()
      .filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group"))
      .map((animation) => { animation.pause(); animation.currentTime = time; return getComputedStyle((animation.effect as KeyframeEffect).target as Element).translate; }), time);
    const groups = () => page.evaluate(() => [...document.querySelectorAll(".control-bar .button-group")].map((group) => {
      const box = group.getBoundingClientRect(), bar = document.querySelector(".control-bar")!.getBoundingClientRect();
      return { centre: (box.left + box.right) / 2, inside: box.left >= bar.left && box.right <= bar.right, translate: getComputedStyle(group).translate };
    }));
    const folding = () => page.evaluate(() => document.getAnimations().filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group")).length);
    // Under the star, each group opens where it stands, centred in its own row.
    await star.click();
    expect(await hold(0), "no slide under the star").toEqual(["0px", "0px"]);
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()));
    await settled();
    for (const { centre, inside } of await groups()) {
      near(centre, 422, 1);
      expect(inside).toBe(true);
    }
    await star.click();
    await settled();
    // Opened on a wide window, a fold held part way still slides. The window narrowing under
    // it settles it at once, leaving the stacked groups in place, centred and inside the bar.
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(page);
    await star.click();
    expect((await hold(100)).every((slide) => slide !== "0px" && slide !== "none"), "sliding out on a wide window").toBe(true);
    await page.setViewportSize({ width: 844, height: 390 });
    await settle(page);
    expect(await folding(), "the resize settles the fold").toBe(0);
    for (const { centre, inside, translate } of await groups()) {
      near(centre, 422, 1);
      expect([inside, translate]).toEqual([true, "none"]);
    }
    expect(await star.getAttribute("aria-expanded")).toBe("true");
    await page.close();
  }, { timeout: 180_000 });

  test("keeps its skyline above the control bar on a phone, with views to tap through under reduced motion", async () => {
    const phone = await browser.newPage({ ...viewports[4].options, reducedMotion: "reduce" });
    watch(phone);
    await phone.goto(`${origin}/index.html`);
    const scene = await openScene(phone);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // The drawing's frame is as wide as a portrait screen and stands on the bar.
    const { bar, canvas } = await scene.evaluate(() => ({
      bar: document.querySelector(".control-bar")!.getBoundingClientRect().toJSON() as DOMRect,
      canvas: document.querySelector("#building")!.getBoundingClientRect().toJSON() as DOMRect,
    }));
    near(canvas.bottom, bar.top, 0.5);
    expect(canvas.height).toBeGreaterThan(canvas.width * boxHeight / boxWidth);
    await phone.screenshot({ path: "/tmp/skyline-3d-mobile.png" });
    // The star opens the controls at once under reduced motion, with nothing to animate.
    await scene.locator("#menu-toggle").tap();
    expect(await scene.evaluate(() => [document.getAnimations().length, getComputedStyle(document.querySelector(".camera-views")!).display])).toEqual([0, "flex"]);
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

  test("floats a building's detail over the skyline from its context menu, without leaving the viewer", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(page);
    await page.goto(`${origin}/index.html`);
    const scene = await openScene(page);
    const visits = await page.evaluate(() => history.length);
    const canvas = (await scene.locator("#building").boundingBox())!;
    // A point on a building, halfway up its mapped centre, in the viewer's window.
    const on = async (id: string) => {
      const record = geographicBuildings.find((building) => building.id === id)!;
      const { center } = footprintMetrics(record.footprint.coordinates);
      const point = [center[0], record.height / 2, -center[1]];
      const [u, v] = await scene.evaluate(([id, point]) => window.__buildingStudy!.projectPoint(id, point), [id, point] as const);
      return { x: canvas.x + u * canvas.width, y: canvas.y + v * canvas.height };
    };
    const aon = await on("layer3");
    const menu = scene.locator("#building-menu");
    const focused = (frame: Page | Frame) => frame.evaluate(() => document.activeElement?.id);
    const topmost = (frame: Page | Frame, { x, y, width, height }: { x: number; y: number; width: number; height: number }) =>
      frame.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [x + width / 2, y + height / 2] as const);
    // The sky has no menu, and a right-drag across a building pans rather than opening one.
    await page.mouse.click(canvas.x + 60, canvas.y + 120, { button: "right" });
    expect(await menu.isHidden()).toBe(true);
    const eye = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
    await page.mouse.move(aon.x, aon.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(aon.x + 80, aon.y + 20, { steps: 6 });
    await page.mouse.up({ button: "right" });
    expect(await menu.isHidden()).toBe(true);
    expect(await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).not.toEqual(eye);
    await scene.locator("#building").focus();
    await page.keyboard.press("Home");
    // A right-click on a building opens its menu at the pointer: its name over one item,
    // focused. Escape closes it and returns focus to the skyline.
    await page.mouse.click(aon.x, aon.y, { button: "right" });
    expect(await menu.isVisible()).toBe(true);
    expect(await scene.locator("#building-menu-title").textContent()).toBe("Aon Center");
    expect(await scene.locator('#building-menu [role="menuitem"]').allTextContents()).toEqual(["building detail"]);
    expect(await scene.locator("#building-detail-link").getAttribute("href")).toBe("building-detail.html?building=layer3");
    expect(await focused(scene)).toBe("building-detail-link");
    const box = (await menu.boundingBox())!;
    near(box.x, aon.x, 1);
    near(box.y, aon.y, 1);
    await page.keyboard.press("Escape");
    expect(await menu.isHidden()).toBe(true);
    expect(await focused(scene)).toBe("building");
    // Its item floats the building's detail over the skyline, below the viewer's controls,
    // and the panel takes focus. The viewer stays where it is, with no history of its own.
    await page.mouse.click(aon.x, aon.y, { button: "right" });
    await scene.locator("#building-detail-link").click();
    expect(await menu.isHidden()).toBe(true);
    const panel = scene.locator("#building-detail");
    expect(await panel.isVisible()).toBe(true);
    const openDetail = async () => {
      const frame = (await (await panel.locator("iframe").elementHandle())!.contentFrame())!;
      await frame.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
      return frame;
    };
    let detail = await openDetail();
    expect(detail.url()).toBe(`${origin}/building-detail.html?building=layer3`);
    expect([page.url(), scene.url()]).toEqual([`${origin}/index.html`, `${origin}/skyline-3d.html`]);
    expect(await page.evaluate(() => history.length)).toBe(visits);
    expect(await detail.locator("h1").textContent()).toBe("Aon Center");
    expect(await panel.locator("iframe").getAttribute("title")).toBe("Aon Center — Building Detail");
    expect(await detail.locator(".study-links").isHidden(), "the panel closes the detail, not the page's own links").toBe(true);
    expect(await focused(scene)).toBe("detail-close");
    const floating = (await panel.boundingBox())!, controls = (await page.locator(".controls").boundingBox())!;
    const bar = (await scene.locator(".control-bar").boundingBox())!;
    expect(floating.x >= 0 && floating.x + floating.width <= 1440 && floating.y + floating.height <= bar.y, "the panel stays in the scene above the control bar").toBe(true);
    expect(controls.y + controls.height, "the panel stands below the viewer's controls").toBeLessThanOrEqual(floating.y);
    const close = (await scene.locator("#detail-close").boundingBox())!;
    expect([await topmost(page, close), await topmost(scene, close)], "nothing covers the close button").toEqual(["skyline-3d-scene", "detail-close"]);
    await page.screenshot({ path: "/tmp/skyline-3d-detail.png" });
    // The skyline stays live beside it, and another building's menu, drawn over the panel
    // where it reaches it, replaces the detail.
    const park = await on("building-340-on-the-park");
    expect(park.x, "340 on the Park shows beside the panel").toBeGreaterThan(floating.x + floating.width);
    await page.mouse.click(park.x, park.y, { button: "right" });
    expect(await scene.locator("#building-menu-title").textContent()).toBe("340 on the Park");
    const item = (await scene.locator("#building-detail-link").boundingBox())!;
    expect(item.x, "the menu reaches over the panel").toBeLessThan(floating.x + floating.width);
    expect(await topmost(scene, item)).toBe("building-detail-link");
    await scene.locator("#building-detail-link").click();
    await scene.waitForFunction(() => document.querySelector<HTMLIFrameElement>("#building-detail iframe")?.src.endsWith("building=building-340-on-the-park"));
    detail = await openDetail();
    expect(await panel.locator("iframe").count()).toBe(1);
    expect(await detail.locator("h1").textContent()).toBe("340 on the Park");
    // Escape inside the detail closes the panel, removing its frame, and focus returns to
    // the skyline.
    await detail.locator("#building").focus();
    await page.keyboard.press("Escape");
    await scene.waitForFunction(() => !document.querySelector("#building-detail iframe"));
    expect(await panel.isHidden()).toBe(true);
    expect(await focused(scene)).toBe("building");
    // So does Escape once focus has left the panel for the skyline, but an open menu or
    // toolbar takes it first; and so does the close button.
    const reopen = async () => {
      await page.mouse.click(aon.x, aon.y, { button: "right" });
      await scene.locator("#building-detail-link").click();
      await openDetail();
    };
    await reopen();
    await page.mouse.click(park.x, park.y, { button: "right" });
    expect(await menu.isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    expect([await menu.isHidden(), await panel.isVisible(), await focused(scene)]).toEqual([true, true, "building"]);
    const star = scene.locator("#menu-toggle");
    await star.click();
    await scene.locator("#wireframe").focus();
    await page.keyboard.press("Escape");
    expect([await star.getAttribute("aria-expanded"), await panel.isVisible(), await focused(scene)]).toEqual(["false", true, "menu-toggle"]);
    await page.keyboard.press("Escape");
    await scene.waitForFunction(() => !document.querySelector("#building-detail iframe"));
    expect(await panel.isHidden()).toBe(true);
    await reopen();
    await scene.locator("#detail-close").click();
    await scene.waitForFunction(() => !document.querySelector("#building-detail iframe"));
    expect(await panel.isHidden()).toBe(true);
    expect(await page.evaluate(() => history.length)).toBe(visits);
    await page.close();
  }, { timeout: 180_000 });

  test("floats the detail on its own page too, at once under reduced motion, whatever order the menu event comes in", async () => {
    // Reduced motion stops the orbit controls, which otherwise take the right button; the
    // menu opens all the same. With nothing over the page's top, the panel is centred in the
    // scene above the control bar.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const [u, v] = await page.evaluate(() => window.__buildingStudy!.projectPoint("layer3", [284, 200, -50]));
    const canvas = (await page.locator("#building").boundingBox())!;
    const x = canvas.x + u * canvas.width, y = canvas.y + v * canvas.height;
    // Browsers send the menu event in different orders, and the pointer the other tests drive
    // sends it one way only. Where it comes with the press, as on macOS, the menu opens on the
    // release; where it follows the release, as on Windows and Linux, at once; after a drag,
    // neither; and for a long press on a touch screen, whose event comes while the finger is
    // still down, at once. Each step reports whether the menu shows after it, and whether the
    // browser's own menu was held back.
    type Step = [type: "pointerdown" | "pointermove" | "pointerup" | "contextmenu", dx?: number, touch?: boolean];
    const run = (steps: Step[]) => page.evaluate(([steps, x, y]) => steps.map(([type, dx = 0, touch = false]) => {
      const canvas = document.querySelector("#building")!, at = { clientX: x + dx, clientY: y, bubbles: true, cancelable: true };
      const delivered = type === "contextmenu" ? canvas.dispatchEvent(new MouseEvent(type, at))
        : canvas.dispatchEvent(new PointerEvent(type, { ...at, pointerId: touch ? 2 : 1, pointerType: touch ? "touch" : "mouse", button: type === "pointermove" ? -1 : 2 }));
      return [!document.querySelector<HTMLElement>("#building-menu")!.hidden, type === "contextmenu" ? !delivered : null];
    }), [steps, x, y] as const);
    expect(await run([["pointerdown"], ["contextmenu"], ["pointerup"]]), "the event with the press").toEqual([[false, null], [false, true], [true, null]]);
    expect(await run([["pointerdown"], ["pointerup"], ["contextmenu"]]), "the event after the release").toEqual([[false, null], [false, null], [true, true]]);
    expect(await run([["pointerdown"], ["contextmenu"], ["pointermove", 40], ["pointerup", 40]]), "a drag after the event").toEqual([[false, null], [false, true], [false, null], [false, null]]);
    expect(await run([["pointerdown"], ["pointermove", 40], ["pointerup", 40], ["contextmenu"]]), "the event after a drag").toEqual([[false, null], [false, null], [false, null], [false, true]]);
    expect(await run([["pointerdown", 0, true], ["contextmenu"], ["pointerup", 0, true]]), "a long press").toEqual([[false, null], [true, true], [true, null]]);
    await page.keyboard.press("Escape");
    expect(await page.locator("#building-menu").isHidden()).toBe(true);
    await page.mouse.click(x, y, { button: "right" });
    expect(await page.locator("#building-menu-title").textContent()).toBe("Aon Center");
    await page.locator("#building-detail-link").click();
    const panel = page.locator("#building-detail");
    expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
    const box = (await panel.boundingBox())!, bar = (await page.locator(".control-bar").boundingBox())!;
    expect([box.width, box.height]).toEqual([1040, 760]);
    near(box.x, (1440 - box.width) / 2, 1);
    near(box.y, (bar.y - box.height) / 2, 1);
    const detail = (await (await panel.locator("iframe").elementHandle())!.contentFrame())!;
    await detail.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
    expect(await detail.locator("h1").textContent()).toBe("Aon Center");
    expect(page.url()).toBe(`${origin}/skyline-3d.html`);
    await page.close();
  }, { timeout: 180_000 });

  test("loads only local assets without page errors", () => {
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
});
