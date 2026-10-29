// The full-screen 3D skyline's loading, placement, camera, toolbar and controls. Its lighting,
// time of day, colour and building details are in skyline-3d-lighting.test.ts.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { closeChrome, launchChrome, SETUP_TIMEOUT, TEARDOWN_TIMEOUT } from "../scripts/lib/chrome.js";
import type { Browser, Frame, Page } from "playwright";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicSkyline } from "../src/skyline-scene.js";
import { geographicLandmarks } from "./skyline-landmarks.js";
import { viewports } from "./study-fidelity.js";
import { expectPlanHolds } from "./geographic-plan.js";
import { blueCrossScreen, boxHeight, boxWidth, boxX, boxY, chroma, near, openScene, origin, pageWatch, pixelAt, settle, shiftX, shiftY, expectChangedPicture, expectSamePicture, viewerHooks } from "./skyline-3d-page.js";

describe("full-screen 3D skyline", () => {
  let browser!: Browser;
  const { watch, expectClean } = pageWatch();
  beforeAll(async () => {
    // Linux Chrome antialiases text with coloured subpixel fringes, a display setting rather
    // than a colour the page draws; greyscale text keeps the chroma checks about the page.
    browser = await launchChrome({ args: ["--disable-lcd-text"] });
  }, { timeout: SETUP_TIMEOUT });
  afterAll(async () => {
    await closeChrome(browser);
  }, { timeout: TEARDOWN_TIMEOUT });

  test("traces the loading elevation before the 3D code arrives, then removes it at the first frame", async () => {
    for (const [width, height, reduced, light] of [[1440, 900, false, false], [390, 844, false, false], [390, 844, true, false], [844, 390, false, false], [1440, 900, false, true], [390, 844, true, true]] as const) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      await watch(page);
      let release!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/skyline-3d.js", async (route) => { await held; await route.continue(); });
      try {
        await page.goto(`${origin}/?controls=closed${light ? "&colour=1" : ""}`, { waitUntil: "domcontentloaded" });
        const scene = page;
        const trace = scene.locator(".skyline-trace");
        await trace.waitFor({ state: "visible" });
        expect(await page.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor))
          .toBe(light ? "rgb(245, 245, 245)" : "rgb(0, 0, 0)");
        expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe(light ? "#f5f5f5" : "#000000");
        expect(await trace.evaluate((node) => getComputedStyle(node).stroke)).toBe(light ? "rgb(85, 85, 85)" : "rgb(221, 221, 221)");
        expect(await scene.locator("#loading").textContent()).toContain("Preparing the skyline");
        expect(await scene.locator(".control-bar").evaluate((bar) => getComputedStyle(bar).backgroundColor)).toBe(light ? "rgb(245, 245, 245)" : "rgb(8, 8, 8)");
        expect(await scene.locator(".scene-notes").isHidden()).toBe(true);
        expect(await scene.evaluate(() => window.__buildingStudy?.ready)).toBeUndefined();
        // The toolbar's show original waits for the scene; its other modes stay.
        expect(await page.locator("#toggle-skyline").isHidden()).toBe(true);
        expect(await page.locator("#toggle-webgl").isVisible()).toBe(true);
        const bounds = (await trace.boundingBox())!;
        expect(bounds.width).toBeCloseTo(Math.min(720, width - 48) / 3, 1);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        const ground = await scene.evaluate(() => {
          const root = window.__viewerRoot!;
          const svg = root.querySelector<SVGSVGElement>(".skyline-trace")!;
          const outline = root.querySelector<SVGPathElement>("#skyline-loading-outline")!;
          const baseline = outline.getPointAtLength(outline.getTotalLength()).matrixTransform(svg.getScreenCTM()!).y;
          return { baseline, toolbar: root.querySelector(".control-bar")!.getBoundingClientRect().top };
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
        expect(await page.locator("#toggle-skyline").isVisible()).toBe(true);
        expect(await scene.locator(".control-bar").evaluate((bar) => getComputedStyle(bar).backgroundColor)).toBe(light ? "rgb(245, 245, 245)" : "rgb(8, 8, 8)");
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
    await page.addInitScript(viewerHooks);
    await page.route("**/skyline-3d.js", (route) => route.abort());
    await page.goto(`${origin}/skyline-3d.html`);
    const loading = page.locator("#loading");
    await page.waitForFunction(() => document.querySelector("#loading")!.textContent!.includes("WebGL 2"));
    expect(await loading.isVisible()).toBe(true);
    expect(await page.locator("#time-of-day").isDisabled()).toBe(true);
    expect(await loading.locator("svg").count()).toBe(0);
    expect(await loading.evaluate((element) => getComputedStyle(element).display)).not.toBe("grid");

    // The viewer can still compare the drawing after a failed load. Its disabled
    // scene controls cannot receive focus, so returning focuses the top switch.
    await page.goto(`${origin}/index.html`);
    const scene = page;
    await scene.waitForFunction(() => window.__viewerRoot?.querySelector("#loading")?.textContent!.includes("WebGL 2"));
    expect(await scene.locator("#menu-toggle").isDisabled()).toBe(true);
    expect(await scene.locator("#time-of-day").isDisabled()).toBe(true);
    expect(await page.locator("#toggle-skyline").isVisible(), "a failed load ends the boot").toBe(true);
    await page.locator("#toggle-skyline").click();
    await page.locator("#return-skyline-3d").press("Enter");
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#return-skyline-3d").isHidden()).toBe(true);
    expect(await page.evaluate(() => window.__focused)).toBe("toggle-skyline");
    expect(await scene.locator("#loading").textContent()).toContain("WebGL 2");
    await page.close();
  });

  test("keeps the toolbar's show original when the graphics context is lost after the first frame", async () => {
    const page = await browser.newPage();
    await page.addInitScript(viewerHooks);
    try {
      await page.goto(`${origin}/index.html`);
      await openScene(page);
      await page.evaluate(() => window.__viewerRoot!.querySelector<HTMLCanvasElement>(".skyline-3d > #viewport > #building")!
        .getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
      await page.waitForFunction(() => window.__viewerRoot!.querySelector("#loading")!.textContent!.includes("graphics context was interrupted"));
      expect(await page.locator("#toggle-skyline").isVisible()).toBe(true);
    } finally { await page.close(); }
  }, { timeout: 120_000 });

  test("stands the mapped buildings where the skyline viewer draws them, at every layout", async () => {
    // The page frames the drawing's viewBox through the geographic skyline camera, centred
    // and bottom-aligned as the viewer's SVG is, so each landmark lands on its drawn point
    // within the camera fit's own residuals: the skyline study allows 64 layer units and an
    // RMS of 30.3. 1600x700 and 2400x700 are wider than the viewBox, whose height binds.
    const placed: Record<string, [number, number][]> = {};
    const sizes = [...viewports.map(({ options }) => options.viewport!), { width: 1600, height: 700 }, { width: 2400, height: 700 }];
    const page = await browser.newPage({ viewport: sizes[0]! });
    await watch(page);
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
    await watch(study);
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
      await watch(page);
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

  test("zooms out to four times the skyline's distance, with every building still in frame", async () => {
    const { drawingView } = createGeographicSkyline();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    // Each building's whole rendered extent, footprint to roof, not only a point on it.
    const inFrame = async (label: string) => {
      await settle(page);
      const outside: string[] = [];
      for (const { id } of geographicBuildings) {
        const [left, top, right, bottom] = await page.evaluate((building) => window.__buildingStudy!.screenBounds(building), id);
        if (!(left > 0 && top > 0 && right < 1 && bottom < 1)) outside.push(`${id} spans ${[left, top, right, bottom].map((value) => value.toFixed(3)).join(", ")}`);
      }
      expect(outside, `every building stays in frame zoomed out in ${label}`).toEqual([]);
    };
    // Each "-" pulls back a ninth; thirty presses run well past the limit, which holds.
    await page.locator("canvas").focus();
    for (let index = 0; index < 30; index += 1) await page.keyboard.press("-");
    const eye = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
    const target = drawingView.target!;
    near(Math.hypot(eye[0]! - target[0], eye[1]! - target[1], eye[2]! - target[2]) / drawingView.distance!, 4, 1e-6);
    expect(eye[1]! >= 0.999, "the zoomed-out eye stays above ground").toBe(true);
    await inFrame("the skyline view");
    // Ground plan zooms its orthographic frame instead, to the same quarter scale.
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-view="top"]')!.click());
    await page.locator("canvas").focus();
    for (let index = 0; index < 30; index += 1) await page.keyboard.press("-");
    near(await page.evaluate(() => window.__buildingStudy!.zoom), 0.25, 1e-9);
    await inFrame("ground plan");
    await page.close();
  }, { timeout: 180_000 });

  test("opens the skyline viewer on the 3D skyline over its stars, and keeps an orbit while hidden", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await watch(page);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await page.goto(`${origin}/index.html?controls=closed`);
    const scene = await openScene(page);
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#drawing").isHidden()).toBe(true);
    expect(await page.locator("#stars").isVisible(), "the stars stay behind the 3D skyline").toBe(true);
    expect(await page.locator("#stars circle").count(), "the sky's stars render in the viewer").toBe(96);
    expect(await page.locator("#stars .twinkle").count(), "a tenth of them twinkle").toBe(10);
    const twinkle = () => page.locator("#stars .twinkle").first().evaluate((star) => getComputedStyle(star).animationName);
    expect(await twinkle()).toBe("star-twinkle");
    await page.locator("#debug-motion").click();
    expect([await twinkle(), await page.locator("#stars-motion-status").textContent()]).toEqual(["star-debug", "System motion: allowed · debug animation"]);
    await page.locator("#debug-motion").click();
    expect(await twinkle()).toBe("star-twinkle");
    expect(requested, "the drawings wait until they are chosen").not.toContain("/skyline-animated.svg");
    expect(requested).not.toContain("/skyline-original-fit.svg");
    expect(requested, "the WebGL prototype waits until it is chosen").not.toContain("/skyline-webgl.html");
    expect(await page.locator("iframe").count(), "the viewer renders in the page, not in frames").toBe(0);
    expect(await scene.evaluate(() => [".skyline-3d", "#viewport"].map((selector) => getComputedStyle(window.__viewerRoot!.querySelector(selector)!).backgroundColor)))
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
    // The fullscreen shortcut works from the focused canvas, and shows the viewer's element.
    await page.evaluate(() => {
      const viewer = window as unknown as { fullscreenRequests: number };
      viewer.fullscreenRequests = 0;
      document.querySelector<HTMLElement>("#viewer > [role=region]")!.requestFullscreen = async () => { viewer.fullscreenRequests++; };
    });
    await page.keyboard.press("f");
    expect(await page.evaluate(() => (window as unknown as { fullscreenRequests: number }).fullscreenRequests)).toBe(1);
    await toggle.click();
    expect(await state()).toEqual(["3d skyline", "true", "Return to the 3D skyline"]);
    expect(await announced()).toBe("Enhanced interactive skyline displayed");
    expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
    expect(await page.locator("#enhanced-scene").getAttribute("src")).toBe(`${origin}/skyline-animated.svg`);
    expect(await page.locator("#enhanced-scene").isVisible()).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await settle(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await toggle.click();
    await settle(scene);
    expect(await state()).toEqual(["show enhanced", "false", "Show the enhanced interactive skyline drawing"]);
    expect(await announced()).toBe("3D skyline displayed");
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#enhanced-scene").isHidden()).toBe(true);
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
    expect(await page.locator("#drawing").getAttribute("src")).toBe(`${origin}/skyline-original-fit.svg`);
    expect(await page.locator("#drawing").isVisible()).toBe(true);
    expect([await state(original), await state(webgl), await state()]).toEqual([
      ["3d skyline", "true", "Return to the 3D skyline"],
      ["show webgl", "false", "Preview the WebGL skyline prototype"],
      ["show enhanced", "false", "Show the enhanced interactive skyline drawing"],
    ]);
    expect(await announced()).toBe("Original skyline displayed");
    await webgl.click();
    expect(await page.locator("#webgl-scene").getAttribute("src")).toBe(`${origin}/skyline-webgl.html`);
    expect(await page.locator("#webgl-scene").isVisible()).toBe(true);
    expect(await page.locator("#drawing").isHidden()).toBe(true);
    expect([await state(original), await state(webgl)]).toEqual([
      ["show original", "false", "Compare with the original skyline SVG"],
      ["3d skyline", "true", "Return to the 3D skyline"],
    ]);
    expect(await announced()).toBe("WebGL skyline prototype displayed");
    await webgl.click();
    expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
    expect(await page.locator("#webgl-scene").isHidden()).toBe(true);
    expect(await page.locator("#drawing").isHidden()).toBe(true);
    expect(await state(webgl)).toEqual(["show webgl", "false", "Preview the WebGL skyline prototype"]);
    expect(await announced()).toBe("3D skyline displayed");
    await page.close();
  }, { timeout: 180_000 });

  test("compares with the original from the star's controls and returns from the bottom without resetting the 3D view", async () => {
    for (const [width, height, reduced] of [[1440, 900, false], [390, 844, true], [844, 390, false]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });
      await watch(page);
      try {
        await page.goto(`${origin}/index.html?controls=closed`);
        const scene = await openScene(page);
        const original = scene.locator("#show-original");
        const back = page.locator("#return-skyline-3d");
        expect(await original.isHidden(), "the shortcut stays inside the folded controls").toBe(true);
        expect(await back.isHidden()).toBe(true);
        // The top switch can enter the drawing while the star stays folded. Returning
        // from the bottom then focuses the visible star, rather than a hidden shortcut.
        await page.locator("#toggle-skyline").click();
        await back.press("Enter");
        expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
        expect(await scene.locator("#menu-toggle").getAttribute("aria-expanded")).toBe("false");
        expect(await scene.evaluate(() => window.__focused)).toBe("menu-toggle");
        expect(await original.isHidden()).toBe(true);
        // The scene and the viewer call each other directly: a message, as frames once posted,
        // changes nothing.
        await page.evaluate(() => window.postMessage({ type: "skyline:show-original" }, location.origin));
        await settle(page);
        expect(await back.isHidden()).toBe(true);
        await scene.locator("#menu-toggle").click();
        // The folds, not the stars, which twinkle for ever.
        await scene.evaluate(() => Promise.all(window.__viewerRoot!.getAnimations()
          .filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group")).map((animation) => animation.finished)));
        expect(await original.isVisible()).toBe(true);
        const [button, bar] = await Promise.all([original.boundingBox(), scene.locator(".control-bar").boundingBox()]);
        expect(button!.x >= bar!.x && button!.x + button!.width <= bar!.x + bar!.width && button!.y >= bar!.y && button!.y + button!.height <= bar!.y + bar!.height, "the original shortcut fits inside the bottom toolbar").toBe(true);
        await scene.locator("#building").focus();
        await page.keyboard.press("ArrowLeft");
        const orbit = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
        await original.click();
        await back.waitFor({ state: "visible" });
        expect(await page.locator("#skyline-3d-scene").isHidden()).toBe(true);
        expect(await page.locator("#drawing").getAttribute("src")).toBe(`${origin}/skyline-original-fit.svg`);
        expect(await page.locator("#toggle-skyline").textContent()).toBe("3d skyline");
        expect(await page.locator("#toggle-skyline").getAttribute("aria-pressed")).toBe("true");
        expect(await page.locator("#status").textContent()).toBe("Original skyline displayed");
        expect(await page.evaluate(() => window.__focused)).toBe("return-skyline-3d");
        const bounds = (await back.boundingBox())!;
        expect(bounds.y >= height - 44 && bounds.y + bounds.height <= height, "the return button is at the bottom").toBe(true);
        // Enter on the focused bottom button returns focus to the same shortcut in the
        // same scene. Its camera and unfolded controls survive the comparison.
        await page.keyboard.press("Enter");
        expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
        expect(await back.isHidden()).toBe(true);
        expect(await scene.locator("#menu-toggle").getAttribute("aria-expanded")).toBe("true");
        expect(await scene.evaluate(() => window.__focused)).toBe("show-original");
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
    await watch(page);
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const toolbar = await page.locator(".toolbar button").allTextContents();
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    // The 3D skyline adds footprints, show original and the colour trial's toggle.
    expect((await page.locator(".control-bar .button-group button:not([data-celebration])").allTextContents()).filter((label) => !["footprints", "show original", "colour", "reset light"].includes(label))).toEqual(toolbar);
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
      ...[1440, 1439, 1260, 1259, 1024, 1023, 601, 600].map((width) => ({ width, height: 768 }))];
    const measure = () => page.evaluate(() => {
      const box = (element: Element) => element.getBoundingClientRect().toJSON() as DOMRect;
      return {
        bar: box(document.querySelector(".control-bar")!),
        canvas: box(document.querySelector("#building")!),
        star: box(document.querySelector("#menu-toggle")!),
        displayEnd: box(document.querySelector("#turntable")!),
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
        const folds = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.id === "fold")
          .map((animation) => ({ rate: animation.playbackRate, time: Number(animation.currentTime) })));
        const { start, halfway } = await page.evaluate(() => {
          // Start and hold in one browser task so a slow renderer cannot finish first.
          document.querySelector<HTMLButtonElement>("#menu-toggle")!.click();
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
        // folds, a restart would replace them. Pause before awaiting ready: that promise
        // waits for a rendering frame, long enough for a CI software renderer to consume
        // the remaining 100 ms. Holding in the same task tests reversal without racing it.
        const toggleHeld = () => page.evaluate(async () => {
          document.querySelector<HTMLButtonElement>("#menu-toggle")!.click();
          const held = document.getAnimations().filter((animation) => animation.id === "fold");
          held.forEach((animation) => animation.pause());
          await Promise.all(held.map((animation) => animation.ready));
          return held.map((animation) => ({ rate: animation.playbackRate, time: Number(animation.currentTime) }));
        });
        const back = await toggleHeld();
        expect(back.length, "the held folds carry on").toBe(2);
        for (const { rate, time } of back) {
          expect(rate).toBe(-1);
          expect(time, "reverses at the held position without advancing a frame").toBe(100);
        }
        expect(await star.getAttribute("aria-expanded")).toBe("false");
        const again = await toggleHeld();
        expect(again.length, "the held folds carry on").toBe(2);
        for (const { rate, time } of again) {
          expect(rate).toBe(1);
          expect(time, "unfolds from the same held position").toBe(100);
        }
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
          if (size.width < 1440) near(layout.displayEnd.right, size.width - 12, 0.5);
        }
        if (!open) closedHeights.add(layout.bar.height);
        if (open && size.width >= 1440) expect(layout.bar.height, `three display rows beside the star ${at}`).toBe(100);
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
    expect(await page.locator("#view-label").count()).toBe(0);
    expect(await page.locator('[data-view="skyline"]').getAttribute("aria-pressed")).toBe("true");
    expect(await page.locator(".study-annotations span").count(), "startup leaves unused building labels unprepared").toBe(0);
    for (const view of ["top", "heights"]) {
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      expect(await page.evaluate(() => [window.__buildingStudy!.projection, window.__buildingStudy!.activeView])).toEqual(["orthographic", view]);
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
      await expectChangedPicture(page, await picture(), before, `${id} changes the ground`);
      await button.click();
      await settle(page);
      expect(await button.getAttribute("aria-pressed")).toBe(pressed);
      await expectSamePicture(page, await picture(), before, `${id} restores the ground`);
    }
    // Every view is drawn in greys with no filter to make it so: the buildings, the streets,
    // the footprints and the names over them.
    const filters = () => page.evaluate(() => [...document.querySelectorAll("#building, .study-annotations")].map((element) => getComputedStyle(element).filter));
    await page.locator("#footprints").click();
    for (const view of ["skyline", "top", "heights"]) {
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      expect(await filters(), `${view} unfiltered`).toEqual(["none", "none"]);
      expect(await chroma(page), `${view} in greys`).toBe(0);
    }
    await page.locator("#footprints").click();
    await settle(page);
    // The colour trial's toggle shows the buildings in colour under a blue day sky, and pressing
    // it again restores every grey. A celebration lit while colour shows stays in colour, and
    // turning colour off returns exactly the celebration's greys. Snapshots leave out the scene
    // notes, which name the celebration.
    const colour = page.locator("#colour"), cubs = page.locator('[data-celebration="cubs"]');
    const scene = () => page.locator("#building").screenshot({ style: ".scene-notes { visibility: hidden !important; }" });
    // Blue Cross's crown screen, as red and blue: the sky alone would pass a test of hue.
    const screen = blueCrossScreen();
    const screenAt = async () => {
      const [u, v] = await page.evaluate((point) => window.__buildingStudy!.projectPoint("building-blue-cross-blue-shield", point), screen);
      const [red, , blue] = await pixelAt(page, await scene(), u, v);
      return blue! - red!;
    };
    await page.locator('[data-view="skyline"]').click();
    await settle(page);
    expect(await colour.getAttribute("aria-pressed")).toBe("false");
    const grey = await scene();
    await colour.click();
    await settle(page);
    expect(await colour.getAttribute("aria-pressed")).toBe("true");
    expect(await screenAt(), "Blue Cross's screen in its measured blue").toBeGreaterThan(25);
    const [red, , blue] = await pixelAt(page, await scene(), 0.5, 0.02);
    expect(blue! - red!, "a blue sky overhead").toBeGreaterThan(40);
    await colour.click();
    await settle(page);
    expect(await colour.getAttribute("aria-pressed")).toBe("false");
    await expectSamePicture(page, await scene(), grey, "colour off restores the greys");
    await cubs.click();
    await settle(page);
    const lit = await scene();
    await cubs.click();
    await colour.click();
    await cubs.click();
    await settle(page);
    expect(await cubs.getAttribute("aria-pressed")).toBe("true");
    expect(await screenAt(), "a celebration keeps the colour").toBeGreaterThan(25);
    await colour.click();
    await settle(page);
    await expectSamePicture(page, await scene(), lit, "colour off restores the celebration's greys");
    await cubs.click();
    await settle(page);
    await expectSamePicture(page, await scene(), grey, "lights off restores the greys");
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
  }, { timeout: 360_000 });

  test("starts with the controls open on the site's viewer or when an address asks, and folds them from there", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await watch(page);
    // On the scene's own page or in the viewer's shadow root.
    const state = (frame: Page | Frame) => frame.evaluate(() => {
      const root = window.__viewerRoot ?? document;
      return {
        expanded: root.querySelector("#menu-toggle")!.getAttribute("aria-expanded"),
        title: root.querySelector<HTMLButtonElement>("#menu-toggle")!.title,
        groups: [...root.querySelectorAll(".control-bar .button-group")].map((element) => getComputedStyle(element).display),
        hint: root.querySelector("#camera-hint")!.checkVisibility(),
        folds: root.getAnimations().filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches(".button-group")).length,
      };
    });
    const open = { expanded: "true", title: "Hide the controls", groups: ["flex", "flex"], hint: true, folds: 0 };
    const closed = { expanded: "false", title: "Show the controls", groups: ["none", "none"], hint: false, folds: 0 };
    // Open from the first frame the bar paints in, while the scene's code is still on its way,
    // and still open, unfolded rather than folding in, once the scene is ready.
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/skyline-3d.js", async (route) => { await held; await route.continue(); });
    await page.goto(`${origin}/skyline-3d.html?controls=open`, { waitUntil: "domcontentloaded" });
    expect(await state(page)).toEqual(open);
    release();
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await page.unroute("**/skyline-3d.js");
    expect(await state(page)).toEqual(open);
    // The star folds a bar that started open like any other.
    await page.locator("#menu-toggle").click();
    await page.waitForFunction(() => !document.querySelector(".control-bar")!.classList.contains("open"));
    expect(await state(page)).toEqual(closed);
    // Any other value, or none, leaves the bar closed.
    for (const query of ["", "?controls=closed", "?controls=wide"]) {
      await page.goto(`${origin}/skyline-3d.html${query}`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      expect(await state(page), query).toEqual(closed);
    }
    // The site's viewer opens the scene's bar unasked, from its first frame too: as soon as the
    // scene's markup shows, before its code.
    let releaseViewer!: () => void;
    const viewerHeld = new Promise<void>((resolve) => { releaseViewer = resolve; });
    await page.route("**/skyline-3d.js", async (route) => { await viewerHeld; await route.continue(); });
    await page.goto(`${origin}/index.html`, { waitUntil: "domcontentloaded" });
    await page.locator(".control-bar").waitFor();
    expect(await state(page)).toEqual(open);
    releaseViewer();
    expect(await state(await openScene(page))).toEqual(open);
    await page.unroute("**/skyline-3d.js");
    // It takes the package's options from its own address: `?controls=closed` folds the bar,
    // and `?embed=1`, the viewer as a host shows it, starts it folded as `mountSkyline` does,
    // unless it asks for it open. Any other value leaves each default.
    for (const [query, expected] of [
      ["?controls=closed", closed], ["?controls=open", open], ["?controls=wide", open],
      ["?embed=1", closed], ["?embed=1&controls=wide", closed], ["?embed=1&controls=open", open],
    ] as const) {
      await page.goto(`${origin}/index.html${query}`);
      expect(await state(await openScene(page)), query).toEqual(expected);
    }
    await page.close();
  }, { timeout: 240_000 });

  test("leaves out the OpenStreetMap credit only when its address or the viewer's asks", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await watch(page);
    const notes = async (frame: Page | Frame) => ({ credit: await frame.locator(".attribution").isVisible(), hint: await frame.locator("#camera-hint").isVisible() });
    // With the controls open, where the credit shows: only ?attribution=hidden leaves it out.
    for (const [query, credit] of [["", true], ["&attribution=shown", true], ["&attribution=wide", true], ["&attribution=hidden", false]] as const) {
      await page.goto(`${origin}/skyline-3d.html?controls=open${query}`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      expect(await notes(page), query).toEqual({ credit, hint: true });
    }
    // Left out, it stays out when the controls fold and open again.
    const star = page.locator("#menu-toggle");
    await star.click();
    expect(await notes(page)).toEqual({ credit: false, hint: false });
    await star.click();
    expect(await notes(page)).toEqual({ credit: false, hint: true });
    // The viewer passes its own address's choice to its scene.
    await page.goto(`${origin}/index.html?controls=open&attribution=hidden`);
    expect(await notes(await openScene(page))).toEqual({ credit: false, hint: true });
    await page.close();
  }, { timeout: 120_000 });

  test("opens stacked groups in place and centred, and settles a fold the window resizes under", async () => {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await watch(page);
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
    await watch(phone);
    await phone.goto(`${origin}/index.html?controls=closed`);
    const scene = await openScene(phone);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // The drawing's frame is as wide as a portrait screen and stands on the bar.
    const { bar, canvas } = await scene.evaluate(() => ({
      bar: window.__viewerRoot!.querySelector(".control-bar")!.getBoundingClientRect().toJSON() as DOMRect,
      canvas: window.__viewerRoot!.querySelector("#building")!.getBoundingClientRect().toJSON() as DOMRect,
    }));
    near(canvas.bottom, bar.top, 0.5);
    expect(canvas.height).toBeGreaterThan(canvas.width * boxHeight / boxWidth);
    await phone.screenshot({ path: "/tmp/skyline-3d-mobile.png" });
    // The star opens the controls at once under reduced motion, with nothing to animate.
    await scene.locator("#menu-toggle").tap();
    expect(await scene.evaluate(() => [window.__viewerRoot!.getAnimations().length, getComputedStyle(window.__viewerRoot!.querySelector(".camera-views")!).display])).toEqual([0, "flex"]);
    // Reduced motion stops dragging and leaves out the turntable; the view buttons still move
    // the camera at once, as the hint says.
    expect(await scene.locator("#turntable").isHidden()).toBe(true);
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

  test("asks for JavaScript when it is off, in the viewer's place", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    await page.goto(`${origin}/index.html`);
    expect(await page.locator("#viewer .notice").textContent()).toBe("Enable JavaScript to explore the Chicago skyline.");
    expect(await page.locator("#viewer .notice").isVisible()).toBe(true);
    await page.close();
  });

  test("loads only local assets without page errors or three.js deprecation warnings", expectClean);
});
