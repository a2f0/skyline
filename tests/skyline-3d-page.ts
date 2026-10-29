// What the full-screen 3D skyline suites share: hooks into the viewer's shadow roots, readers
// for screenshots, the drawing's frame, and the watch each suite keeps on the pages it opens.
// The suites are split by subject so they can run side by side.
import { afterAll, beforeAll, expect } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Browser, Frame, Page } from "playwright";
import { closeChrome, launchChrome, SETUP_TIMEOUT, TEARDOWN_TIMEOUT } from "../scripts/lib/chrome.js";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicBuilding } from "../src/models/skyline-geography.js";
import { toneOf } from "../src/models/colour-materials.js";
import type * as THREE from "../src/vendor/three-r186.js";
import type { BuildingStudyApi } from "../src/study-viewer.js";
import { isThreeDeprecation } from "./three-warnings.js";

declare global {
  interface Window {
    __viewerRoot?: ShadowRoot | null;
    __detailStudy?: BuildingStudyApi;
    __focused?: string | undefined;
  }
}

export const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
export const settle = (page: Page | Frame) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
export const near = (a: number, b: number, tolerance: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tolerance);
// The widest gap between two colour channels of any pixel on screen, read back from a
// screenshot: zero while everything shown, scene and page alike, is a grey.
export const chroma = async (page: Page) => page.evaluate(async (png) => {
  const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  let widest = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
    widest = Math.max(widest, Math.max(r, g, b) - Math.min(r, g, b));
  }
  return widest;
}, (await page.screenshot()).toString("base64"));
// A snapshot's red, green and blue at a point given as fractions of its width and height.
export const pixelAt = async (page: Page, png: Buffer, x: number, y: number) => page.evaluate(async ([data, across, down]) => {
  const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  return Array.from(context.getImageData(Math.floor(bitmap.width * across), Math.floor(bitmap.height * down), 1, 1).data.slice(0, 3));
}, [png.toString("base64"), x, y] as const);
// Count bright lamps of any white-light tint, above the dark sky and shaded facades.
export const litPixels = (page: Page, png: Buffer) => page.evaluate(async (data) => {
  const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  let lit = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
    if ((r + g + b) / 3 > 90) lit += 1;
  }
  return lit;
}, png.toString("base64"));
// Compare the same fully dark scene at two occupancy levels. Unchanged stars,
// crowns and outlines cannot count as rooms that switch on in the evening.
export const nightChanges = (page: Page, evening: Buffer, early: Buffer) => page.evaluate(async (images) => {
  const pixels = await Promise.all(images.map(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  }));
  let brighter = 0, dimmer = 0;
  for (let i = 0; i < pixels[0]!.length; i += 4) {
    const delta = [0, 1, 2].reduce((sum, c) => sum + pixels[0]![i + c]! - pixels[1]![i + c]!, 0) / 3;
    if (delta > 20) brighter += 1;
    if (delta < -20) dimmer += 1;
  }
  return { brighter, dimmer };
}, [evening.toString("base64"), early.toString("base64")]);
// Bright cool panes must be distinguishable from the dark blue sky/facades;
// count all three lamp families so a globally warm shader cannot pass.
export const lampTints = (page: Page, png: Buffer) => page.evaluate(async (data) => {
  const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  let warm = 0, neutral = 0, cool = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
    if (r > 90 && r - b > 28 && r > g) warm += 1;
    if (Math.min(r, g, b) > 90 && Math.max(r, g, b) - Math.min(r, g, b) < 15) neutral += 1;
    if (r > 90 && b - r > 6 && b > g) cool += 1;
  }
  return { warm, neutral, cool };
}, png.toString("base64"));
// The middle of the largest east-facing triangle of Blue Cross's crown screen, which faces the
// skyline camera. In colour it shows its measured dark blue, which neither its grey nor the day's
// bluish shade gives it.
export function blueCrossScreen(): number[] {
  const model = createGeographicBuilding(geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!);
  const geometry = (model.building.getObjectByName("Blue Cross · glass, spandrels and bands") as THREE.Mesh).geometry;
  const colours = geometry.getAttribute("color"), normals = geometry.getAttribute("normal"), positions = geometry.getAttribute("position");
  const corner = (vertex: number) => [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)];
  let middle: number[] = [], largest = 0;
  for (let vertex = 0; vertex < positions.count; vertex += 3) {
    if (toneOf(colours.getX(vertex)) !== 0x3e3e3e || normals.getX(vertex) < 0.9) continue;
    const [a, b, c] = [corner(vertex), corner(vertex + 1), corner(vertex + 2)];
    const [u, v] = [b.map((value, axis) => value - a[axis]!), c.map((value, axis) => value - a[axis]!)];
    const area = Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!) / 2;
    if (area > largest) [largest, middle] = [area, a.map((value, axis) => (value + b[axis]! + c[axis]!) / 3)];
  }
  return middle;
}

// The frame the skyline viewer shows the drawing in, and the translate that places the
// drawing's layer inside it, read from the file the viewer loads. Landmarks are drawn in
// layer units.
const drawing = readFileSync(path.resolve(import.meta.dirname, "../src/skyline-animated.svg"), "utf8");
export const [boxX, boxY, boxWidth, boxHeight] = /viewBox="([^"]+)"/.exec(drawing)![1]!.split(/\s+/).map(Number) as [number, number, number, number];
export const [shiftX, shiftY] = /id="skyline-position" transform="translate\(([^,]+),([^)]+)\)"/.exec(drawing)!.slice(1).map(Number) as [number, number];

// The viewer renders into the open shadow root of its region in index.html, the 3D skyline
// in that root, and a building's detail in a shadow root of its own inside the scene's panel.
// Playwright's locators reach into them; for code run in the page, these hooks find the
// viewer's root, the scene's study (as window.__buildingStudy, which the scene's own page
// sets), the open detail's study, and the focused element, however deep. They are test
// scaffolding over the page, not part of the viewer.
export function viewerHooks() {
  const root = () => document.querySelector("#viewer > [role=region]")?.shadowRoot ?? null;
  const canvas = (scope: ParentNode | null | undefined, selector: string) => scope?.querySelector<HTMLCanvasElement>(selector)?.__buildingStudy;
  Object.defineProperty(window, "__viewerRoot", { get: root, configurable: true });
  Object.defineProperty(window, "__detailStudy", { get: () => canvas((root() ?? document).querySelector(".detail-host")?.shadowRoot, "#building"), configurable: true });
  Object.defineProperty(window, "__focused", {
    get() {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.getAttribute("data-lighting") ?? (active?.id || undefined);
    },
    configurable: true,
  });
  if (!["/", "/index.html"].includes(location.pathname)) return;
  Object.defineProperty(window, "__buildingStudy", { get: () => canvas(root(), ".skyline-3d > #viewport > #building"), configurable: true });
}

// The site's viewer starts the scene's bar open; tests that unfold it with the star load the
// viewer with `?controls=closed`, as a host's starts.
export async function openScene(page: Page) {
  await page.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
  return page;
}

// Screenshots of a canvas that should match exactly can still differ by a level in a few
// thousand pixels: on a busy machine Chrome composites one rendered frame, where the canvas is
// partly transparent, a level apart from one capture to the next, with no new frame drawn. So
// pictures compare by their largest difference in any channel: the same picture within that
// level, and a change only beyond it.
export const pictureDifference = (page: Page, a: Buffer, b: Buffer) => page.evaluate(async (images) => {
  const [first, second] = await Promise.all(images.map(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  }));
  if (first!.width !== second!.width || first!.height !== second!.height) return Infinity;
  let widest = 0;
  for (let i = 0; i < first!.data.length; i += 1) widest = Math.max(widest, Math.abs(first!.data[i]! - second!.data[i]!));
  return widest;
}, [a.toString("base64"), b.toString("base64")]);
export async function expectSamePicture(page: Page, actual: Buffer, expected: Buffer, message: string) {
  if (!actual.equals(expected)) expect(await pictureDifference(page, actual, expected), message).toBeLessThanOrEqual(1);
}
export async function expectChangedPicture(page: Page, actual: Buffer, expected: Buffer, message: string) {
  expect(await pictureDifference(page, actual, expected), message).toBeGreaterThan(1);
}

// The suite's Chrome, started before its first test and closed after its last; call it in the
// suite's describe and open pages from what it returns. Linux Chrome antialiases text with
// coloured subpixel fringes, a display setting rather than a colour the page draws; greyscale
// text keeps the chroma checks about the page.
export function sceneChrome(): Pick<Browser, "newPage"> {
  let browser: Browser | undefined;
  beforeAll(async () => {
    browser = await launchChrome({ args: ["--disable-lcd-text"] });
  }, { timeout: SETUP_TIMEOUT });
  afterAll(async () => {
    await closeChrome(browser);
  }, { timeout: TEARDOWN_TIMEOUT });
  return {
    newPage: (...options) => {
      if (!browser) throw new Error("Chrome has not started: open pages from a test, after the suite's beforeAll.");
      return browser.newPage(...options);
    },
  };
}

// Every page a suite watches has the viewer's hooks, and reports its page errors, requests
// beyond the site, and three.js deprecations, which the suite's last test expects none of.
export function pageWatch() {
  const errors: string[] = [], external: string[] = [], deprecations: string[] = [];
  const watch = async (page: Page) => {
    await page.addInitScript(viewerHooks);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (isThreeDeprecation(message.text())) deprecations.push(message.text()); });
    // The WebGL prototype, reachable from the viewer, rasterizes its textures into blob URLs of
    // the page's own origin.
    const local = [origin, "data:", `blob:${origin}/`];
    page.on("request", (request) => { if (!local.some((prefix) => request.url().startsWith(prefix))) external.push(request.url()); });
  };
  const expectClean = () => {
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(deprecations).toEqual([]);
  };
  return { watch, expectClean };
}
