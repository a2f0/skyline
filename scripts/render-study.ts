// Renders the skyline study's standard review stills: skyline, wireframe, three-quarter
// and side views, a zoomed skyline, four elevated orbits (rear, north-east, north-west,
// front), mobile and desktop full pages, the skyline with the reference drawing overlaid
// at its contain-fit rectangle, and optionally close-ups of one building from the skyline,
// an elevated view, the rear, and the north-west, where hidden and omitted faces show. Stills use
// reduced motion, so every frame is a settled, immediate camera change.
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Browser, BrowserContextOptions, Locator, Page } from "playwright";
import { startServer } from "./lib/static-server.js";
import { launch, openStudy, settle, command } from "./lib/study-page.js";
import { models } from "../tests/skyline-landmarks.js";

const usage = `Usage: bun scripts/render-study.ts [--out dir] [--building id] [--root dir]
  Writes PNG stills to --out (default: ${path.join(os.tmpdir(), "skyline-renders")}). --building adds
  close-ups of that model (for example building-heritage-at-millennium-park); --root serves
  another checkout.`;
const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" };
// Arrow and zoom presses from the skyline preset; each step is 10° of azimuth, 5° of
// elevation, or a tenth of the distance.
const orbits: Record<string, [string, number][]> = {
  "orbit-rear-high": [["ArrowLeft", 18], ["ArrowUp", 12], ["+", 5]],
  "orbit-north-east-high": [["ArrowRight", 6], ["ArrowUp", 12], ["+", 5]],
  "orbit-north-west-high": [["ArrowLeft", 12], ["ArrowUp", 12], ["+", 5]],
  "orbit-front-high": [["ArrowUp", 12], ["+", 5]],
};

interface ModelEntry {
  id: string;
  name: string;
  module: string;
  factory: string;
}

interface ShotOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

async function press(page: Page, keys: [string, number][]): Promise<void> {
  await page.locator("canvas").focus();
  await page.keyboard.press("Home");
  for (const [key, count] of keys) for (let i = 0; i < count; i += 1) await page.keyboard.press(key);
  await settle(page);
}

// The model's projected bounds on the canvas, padded, from every vertex of a fresh copy.
async function closeupClip(page: Page, entry: ModelEntry) {
  const box = await page.evaluate(async ({ id, module, factory }: ModelEntry): Promise<[number, number, number, number]> => {
    const model = (await import(module))[factory]();
    model.building.updateMatrixWorld(true);
    const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const child of model.building.children) {
      if (!child.isMesh) continue;
      const position = child.geometry.getAttribute("position"), matrix = child.matrixWorld.elements;
      for (let i = 0; i < position.count; i += 1) {
        const [x, y, z] = [position.getX(i), position.getY(i), position.getZ(i)];
        const local = [0, 1, 2].map((row) => matrix[row] * x + matrix[row + 4] * y + matrix[row + 8] * z + matrix[row + 12]);
        const [u, v] = (window as unknown as { __buildingStudy: { projectPoint(id: string, point: number[]): [number, number] } }).__buildingStudy.projectPoint(id, local);
        bounds[0] = Math.min(bounds[0], u); bounds[1] = Math.min(bounds[1], v); bounds[2] = Math.max(bounds[2], u); bounds[3] = Math.max(bounds[3], v);
      }
    }
    return bounds;
  }, entry);
  const canvas = (await page.locator("canvas").boundingBox())!;
  const pad = 0.08 * Math.max(box[2] - box[0], box[3] - box[1]);
  const left = Math.max(0, box[0] - pad), top = Math.max(0, box[1] - pad), right = Math.min(1, box[2] + pad), bottom = Math.min(1, box[3] + pad);
  return { x: canvas.x + left * canvas.width, y: canvas.y + top * canvas.height, width: (right - left) * canvas.width, height: (bottom - top) * canvas.height };
}

command(usage, { out: { type: "string" }, building: { type: "string" }, root: { type: "string" } }, async ({ values }) => {
  const root = path.resolve((values["root"] as string) || path.join(import.meta.dirname, ".."));
  const out = path.resolve((values["out"] as string) || path.join(os.tmpdir(), "skyline-renders"));
  const entry = (values["building"] && models.find((model) => model.id === values["building"])) as ModelEntry | undefined;
  if (values["building"] && !entry) throw new Error(`Unknown building ${values["building"]}; expected one of ${models.map((model) => model.id).join(", ")}.`);
  mkdirSync(out, { recursive: true });
  // The study pages load the compiled modules, so the default serves a fresh
  // build; --root serves another checkout as-is (pre-build checkouts are JS-era).
  const serveRoot = values["root"] ? root : (await import("./build-site.js").then(({ buildSite, dist }) => buildSite().then(() => dist)));
  const server = await startServer(serveRoot);
  const written: string[] = [];
  const errors: string[] = [];
  const shot = async (target: Page | Locator, name: string, options: ShotOptions = {}): Promise<void> => { const file = path.join(out, `${name}.png`); await target.screenshot({ path: file, ...options }); written.push(file); };
  let browser: Browser | undefined;
  try {
    browser = await launch();
    const { page, errors: pageErrors } = await openStudy(browser, server.origin, desktop);
    const canvas = page.locator("canvas");
    await shot(page, "desktop-full", { fullPage: true });
    await shot(canvas, "skyline");
    await page.locator("#wireframe").click();
    await settle(page);
    await shot(canvas, "skyline-wireframe");
    await page.locator("#wireframe").click();
    for (const view of ["quarter", "side"]) {
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      await shot(canvas, view);
    }
    await press(page, [["+", 7]]);
    await shot(canvas, "skyline-zoomed");
    for (const [name, keys] of Object.entries(orbits)) {
      await press(page, keys);
      await shot(canvas, name);
    }
    // The reference drawing at the rectangle the fidelity checks fit it to.
    await press(page, []);
    await page.evaluate(async () => {
      const source = await (await fetch((document.querySelector(".reference img") as HTMLImageElement).src)).text();
      const viewBox = (new DOMParser().parseFromString(source, "image/svg+xml").documentElement as unknown as SVGSVGElement).viewBox.baseVal;
      const canvas = document.querySelector("canvas")!.getBoundingClientRect();
      const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
      const overlay = Object.assign(document.createElement("img"), { id: "reference-overlay", src: (document.querySelector(".reference img") as HTMLImageElement).src });
      Object.assign(overlay.style, {
        position: "absolute", pointerEvents: "none", zIndex: 50, opacity: "0.45",
        left: `${canvas.left + scrollX + (canvas.width - viewBox.width * scale) / 2}px`, top: `${canvas.top + scrollY + (canvas.height - viewBox.height * scale) / 2}px`,
        width: `${viewBox.width * scale}px`, height: `${viewBox.height * scale}px`,
      });
      document.body.append(overlay);
      await overlay.decode();
    });
    await shot(page, "skyline-overlay", { clip: (await canvas.boundingBox())! });
    await page.evaluate(() => document.querySelector("#reference-overlay")!.remove());
    errors.push(...pageErrors);

    if (entry) {
      // A dense, wide layout so the close-up crops keep detail.
      const { page: close, errors: closeErrors } = await openStudy(browser, server.origin, { ...desktop, viewport: { width: 2400, height: 1500 }, deviceScaleFactor: 2 });
      const closeups: Record<string, [string, number][]> = { skyline: [], elevated: [["ArrowUp", 6]], rear: [["ArrowLeft", 18], ["ArrowUp", 6]], "north-west": [["ArrowLeft", 12], ["ArrowUp", 6]] };
      for (const [name, keys] of Object.entries(closeups)) {
        await press(close, keys);
        await shot(close, `closeup-${entry.id}-${name}`, { clip: await closeupClip(close, entry) });
      }
      errors.push(...closeErrors);
    }

    const { page: mobile, errors: mobileErrors } = await openStudy(browser, server.origin, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    await shot(mobile, "mobile-full", { fullPage: true });
    errors.push(...mobileErrors);
  } finally {
    await browser?.close();
    await server.close();
  }
  console.log(`Wrote ${written.length} stills to ${out}:\n  ${written.map((file) => path.basename(file)).join("\n  ")}`);
  if (errors.length) throw new Error(`Page errors while rendering:\n  ${errors.join("\n  ")}`);
});
