import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, Frame, Page } from "playwright";
import { geographicBuildings } from "../models/skyline-geography-data.js";
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

  test("folds the study's toolbar behind a star in the middle of the bar, docked under the skyline at every size", async () => {
    // The bar carries the study's toolbar, in its order, and a footprints toggle, folded
    // behind a white six-pointed star. Closed, the star alone shows, in the bar's middle.
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(page);
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const toolbar = await page.locator(".toolbar button").allTextContents();
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    expect((await page.locator(".control-bar .button-group button").allTextContents()).filter((label) => label !== "footprints")).toEqual(toolbar);
    const star = page.locator("#menu-toggle");
    const groups = () => page.locator(".control-bar .button-group").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).display));
    const settled = () => page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
    expect([await star.getAttribute("aria-expanded"), await star.getAttribute("aria-label")]).toEqual(["false", "Skyline controls"]);
    expect(await star.locator("path").evaluate((path) => getComputedStyle(path).fill)).toBe("rgb(255, 255, 255)");
    expect(await groups()).toEqual(["none", "none"]);
    expect(await page.locator("#camera-hint").isHidden(), "the hint shows only with the controls").toBe(true);
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
        controls: [...document.querySelectorAll(".control-bar .button-group button")].map(box),
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      };
    });
    const closedHeights = new Set<number>();
    for (const open of [false, true]) {
      if (open) {
        // Each group unfolds from the star. Held part way on a wide window, its clip is part
        // open, it is part faded in, and it is still sliding out from the star.
        await page.setViewportSize({ width: 1440, height: 1000 });
        await settle(page);
        await star.click();
        const folds = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.id === "fold")
          .map((animation) => ({ rate: animation.playbackRate, time: Number(animation.currentTime) })));
        const halfway = await page.evaluate(() => {
          const unfolding = document.getAnimations().filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group"));
          unfolding.forEach((animation) => { animation.id = "fold"; animation.pause(); animation.currentTime = 100; });
          return [...document.querySelectorAll(".control-bar .button-group")].map((group) => ({ clip: getComputedStyle(group).clipPath, opacity: Number(getComputedStyle(group).opacity), shift: getComputedStyle(group).translate }));
        });
        expect(halfway.length).toBe(2);
        for (const { clip, opacity, shift } of halfway) {
          expect(clip, "the clip opens part way").toMatch(/^inset\(/);
          expect(clip).not.toBe("inset(-4px)");
          expect(opacity > 0.05 && opacity < 0.99 && shift !== "0px" && shift !== "none", `part faded in and still sliding: ${opacity}, ${shift}`).toBe(true);
        }
        // Toggled part way, the fold reverses from where it stands, each way.
        await star.click();
        await settle(page);
        for (const { rate, time } of await folds()) expect(rate < 0 && time > 30 && time <= 100, `folds back from ${time}`).toBe(true);
        expect(await star.getAttribute("aria-expanded")).toBe("false");
        await star.click();
        await settle(page);
        for (const { rate, time } of await folds()) expect(rate > 0 && time > 30 && time <= 100, `unfolds again from ${time}`).toBe(true);
        await settled();
        expect([await star.getAttribute("aria-expanded"), await groups(), await folds()]).toEqual(["true", ["flex", "flex"], []]);
        expect(await page.locator(".control-bar .button-group").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).clipPath))).toEqual(["none", "none"]);
      }
      for (const size of sizes) {
        await page.setViewportSize(size);
        await settle(page);
        const layout = await measure();
        const at = `${open ? "open" : "closed"} at ${size.width}x${size.height}`;
        expect([layout.bar.left, layout.bar.right, layout.bar.bottom], `the bar spans the window's bottom ${at}`).toEqual([0, size.width, size.height]);
        expect([layout.canvas.top, layout.canvas.width], `the canvas fills the width above the bar ${at}`).toEqual([0, size.width]);
        near(layout.canvas.bottom, layout.bar.top, 0.5);
        expect(layout.canvas.height, `the skyline keeps most of the window ${at}`).toBeGreaterThan(size.height * 0.5);
        near(layout.star.left + layout.star.width / 2, size.width / 2, 0.5);
        for (const control of [layout.star, ...open ? layout.controls : []]) {
          expect(control.left >= layout.bar.left && control.right <= layout.bar.right && control.top >= layout.bar.top && control.bottom <= layout.bar.bottom, `a control inside the bar ${at}`).toBe(true);
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
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("menu-toggle");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest(".button-group")), "focus stays out of the folding groups").toBe(false);
    await settled();
    expect(await groups()).toEqual(["none", "none"]);
    expect(await page.locator(".control-bar").boundingBox().then((bar) => bar!.height)).toBe(39);
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

  test("loads only local assets without page errors", () => {
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
});
