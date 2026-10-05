import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { footprintMetrics } from "../models/skyline-geography.js";

// Run against the local static server; see docs/development.md. The detail page is what the skyline
// viewer floats over its 3D skyline from a building's context menu; the full-screen 3D
// skyline suite opens it from there.
const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function openDetail(page: Page, id: string) {
  await page.goto(`${origin}/building-detail.html?building=${encodeURIComponent(id)}`);
  await page.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
  await settle(page);
}

describe("building detail", () => {
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

  test("frames every mapped building and its platform in every view, in the viewer's panel and on a phone", async () => {
    // The panel's inside at 1440x900, and a phone. The page centres each building on its
    // mapped outline, so a point of its bounds, in the scene, is that point less the
    // outline's centre in the building's own coordinates. The bounds' corners reach past the
    // building, so holding them inside the canvas holds the building and its platform.
    for (const size of [{ width: 1038, height: 758 }, { width: 390, height: 700 }]) {
      const page = await browser.newPage({ viewport: size });
      watch(page);
      for (const record of geographicBuildings) {
        await openDetail(page, record.id);
        expect(await page.locator("h1").textContent()).toBe(record.name);
        // It opens circling the building on the turntable; each view below stops it.
        expect(await page.evaluate(() => [window.__buildingStudy!.modelNames.length, window.__buildingStudy!.turning])).toEqual([1, true]);
        const { center } = footprintMetrics(record.footprint.coordinates);
        for (const view of ["quarter", "front", "side"]) {
          await page.locator(`[data-view="${view}"]`).click();
          await settle(page);
          const margin = await page.evaluate(([id, east, north]) => {
            const study = window.__buildingStudy!, building = study.modelBounds[0]!, platform = study.platformBounds;
            let margin = Infinity;
            for (const { min, max } of [building, platform]) for (const x of [min[0]!, max[0]!]) for (const y of [min[1]!, max[1]!]) for (const z of [min[2]!, max[2]!]) {
              const [u, v] = study.projectPoint(id, [x + east, y, z - north]);
              margin = Math.min(margin, u, v, 1 - u, 1 - v);
            }
            return margin;
          }, [record.id, center[0], center[1]] as const);
          expect(margin, `${record.id} ${view} at ${size.width}x${size.height}`).toBeGreaterThan(0.05);
        }
      }
      await page.close();
    }
  }, { timeout: 180_000 });

  test("names the building, its heights and sources, and holds its canvas to the window", async () => {
    const page = await browser.newPage({ viewport: { width: 1038, height: 758 } });
    watch(page);
    await openDetail(page, "layer3");
    const aon = geographicBuildings.find(({ id }) => id === "layer3")!;
    expect(await page.title()).toBe("Aon Center — Building Detail");
    expect(await page.locator("#building-heights").textContent()).toBe("346.3 m architectural · tip 362.5 m");
    expect(await page.locator("#building-heights a").getAttribute("href")).toBe(aon.heightSource);
    expect(await page.locator("#building-note").textContent()).toBe(aon.note);
    expect(await page.locator("#building-facts a").getAttribute("href")).toBe(`https://www.openstreetmap.org/way/${aon.footprint.way}`);
    // Heights read as the skyline study's table gives them: one from OpenStreetMap, and one
    // read on the drawing where none is published.
    const heightOf = async (id: string) => {
      const detail = await browser.newPage({ viewport: { width: 1038, height: 758 } });
      watch(detail);
      await openDetail(detail, id);
      const text = await detail.locator("#building-heights").textContent();
      await detail.close();
      return text;
    };
    expect(await heightOf("building-kemper")).toBe("159 m architectural (OSM)");
    const drawn = geographicBuildings.find((record) => record.heightFromDrawing)!;
    expect(await heightOf(drawn.id)).toBe(`${drawn.height} m, measured on the drawing`);
    // Sources open beside the page, so a detail floated over the skyline stays put.
    expect(await page.locator("#building-heights a, #building-facts a").evaluateAll((links) => links.map((link) => link.getAttribute("target")))).toEqual(["_blank", "_blank"]);
    // Opened on its own, it links back to the skyline.
    expect(await page.locator(".study-links").isVisible()).toBe(true);
    // It opens on the turntable, circling the building from the three-quarter view and
    // drawing frame after frame, as its status says; the turntable button, pressed, says so
    // and stops it, and the page then draws only when the view changes.
    const turntable = page.locator("#turntable"), status = page.locator("#motion-status");
    expect([await page.evaluate(() => window.__buildingStudy!.turning), await turntable.getAttribute("aria-pressed"), await turntable.textContent()]).toEqual([true, "true", "stop turntable"]);
    expect(await status.textContent()).toBe("Turntable on: the camera circles the model until you stop the turntable, choose a view, or drag.");
    const circling = await page.evaluate(() => ({ renders: window.__buildingStudy!.renderCount, eye: window.__buildingStudy!.cameraPosition }));
    await page.waitForFunction(({ renders, eye }) => window.__buildingStudy!.renderCount > renders + 5
      && window.__buildingStudy!.cameraPosition.some((value, axis) => Math.abs(value - eye[axis]!) > 1e-6), circling, { timeout: 10_000 });
    await turntable.click();
    expect([await page.evaluate(() => window.__buildingStudy!.turning), await turntable.getAttribute("aria-pressed"), await turntable.textContent()]).toEqual([false, "false", "turntable"]);
    expect(await status.textContent()).toBe("Camera moves only when you interact or start the turntable.");
    await settle(page);
    const idle = await page.evaluate(() => window.__buildingStudy!.renderCount);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__buildingStudy!.renderCount), "stopped, the page does not keep drawing").toBe(idle);
    // Hover names the building, as the skyline does.
    await page.locator('[data-view="quarter"]').click();
    await settle(page);
    const canvas = (await page.locator("#building").boundingBox())!;
    const { center } = footprintMetrics(aon.footprint.coordinates);
    const [u, v] = await page.evaluate(([east, north]) => window.__buildingStudy!.projectPoint("layer3", [east, 150, -north]), center);
    await page.mouse.move(canvas.x + u * canvas.width, canvas.y + v * canvas.height);
    expect(await page.locator("#tooltip").textContent()).toBe("Aon Center · 346.3 m / tip 362.5 m");
    // Wide, the model fills the height the header and toolbar leave it, beside its notes,
    // and the page does not scroll. The window sets the canvas's size, which holds once the
    // renderer has sized its drawing buffer to it.
    const layout = () => page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON() as DOMRect;
      return { canvas: box("#building"), toolbar: box(".toolbar"), notes: box(".notes"), scrolls: document.documentElement.scrollHeight > innerHeight };
    });
    const wide = await layout();
    expect(wide.canvas.height).toBeGreaterThan(400);
    expect(wide.notes.left).toBeGreaterThanOrEqual(wide.canvas.right);
    expect(wide.toolbar.bottom).toBeLessThanOrEqual(758);
    expect(wide.scrolls).toBe(false);
    await page.waitForTimeout(300);
    expect((await layout()).canvas).toEqual(wide.canvas);
    // Narrow or short, as on a phone either way up, the notes follow the model, which keeps
    // a height of its own, and the page scrolls to them.
    for (const size of [{ width: 390, height: 700 }, { width: 820, height: 270 }]) {
      await page.setViewportSize(size);
      await settle(page);
      const stacked = await layout();
      expect(stacked.notes.top, `notes under the model at ${size.width}x${size.height}`).toBeGreaterThanOrEqual(stacked.toolbar.bottom);
      expect(stacked.canvas.height).toBeGreaterThan(250);
      await page.waitForTimeout(300);
      expect((await layout()).canvas).toEqual(stacked.canvas);
    }
    await page.close();
  }, { timeout: 180_000 });

  test("stays still under reduced motion", async () => {
    const page = await browser.newPage({ viewport: { width: 1038, height: 758 }, reducedMotion: "reduce" });
    watch(page);
    await openDetail(page, "layer3");
    expect(await page.evaluate(() => [window.__buildingStudy!.turning, window.__buildingStudy!.activeView])).toEqual([false, "quarter"]);
    expect([await page.locator("#turntable").isDisabled(), await page.locator("#turntable").getAttribute("aria-pressed")]).toEqual([true, "false"]);
    expect(await page.locator("#motion-status").textContent()).toStartWith("Reduced motion:");
    const idle = await page.evaluate(() => window.__buildingStudy!.renderCount);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__buildingStudy!.renderCount)).toBe(idle);
    await page.close();
  }, { timeout: 60_000 });

  test("says so for a building the skyline does not map", async () => {
    const page = await browser.newPage({ viewport: { width: 1038, height: 758 } });
    watch(page);
    await page.goto(`${origin}/building-detail.html?building=nowhere`);
    await page.waitForFunction(() => document.querySelector("#loading")!.textContent!.startsWith("No mapped building"));
    expect(await page.locator("button").evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true);
    expect(await page.evaluate(() => window.__buildingStudy)).toBeUndefined();
    await page.close();
  }, { timeout: 60_000 });

  test("loads only local assets without page errors", () => {
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
});
