// Reproducible visual review of the opt-in colour layer, on identical cameras with motion off.
// Only original renders are written; the photographs used to measure the palette stay in cache.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite, dist } from "./build-site.js";
import { startServer } from "./lib/static-server.js";
import { launch, settle, command } from "./lib/study-page.js";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";

command("Usage: bun scripts/render-colours.ts [--out directory] [building-id ...]", { out: { type: "string" } }, async ({ values, positionals }) => {
  const ids = positionals.length ? [...new Set(positionals)] : ["building-three-illinois-center", "building-michigan-plaza-south-tower", "building-crain-communications", "building-chicago-athletic-association"];
  for (const id of ids) if (!geographicBuildings.some((record) => record.id === id)) throw new Error(`Unknown geographic building: ${id}`);
  const out = path.resolve(values["out"] as string || path.join(os.tmpdir(), "skyline-colours"));
  mkdirSync(out, { recursive: true });
  // A failed rerun must not leave a previous run's success record beside partial captures.
  rmSync(path.join(out, "captures.json"), { force: true });
  await buildSite();
  const server = await startServer(dist);
  let browser: Awaited<ReturnType<typeof launch>> | undefined;
  const errors: string[] = [];
  try {
    browser = await launch();
    const viewport = { width: 1600, height: 1000 }, mobileViewport = { width: 390, height: 844 };
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const pairs: { name: string; url: string; view: string; grey: Buffer; day: Buffer }[] = [];
    const capturePair = async (name: string, url: string, view: string) => {
      await page.goto(`${server.origin}/${url}`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      const grey = await page.screenshot({ path: path.join(out, `${name}-grey.png`) });
      const greyCanvas = await page.locator("canvas").screenshot();
      await page.locator("#colour").click();
      await page.locator('#colour[aria-pressed="true"]').waitFor();
      await settle(page);
      const day = await page.screenshot({ path: path.join(out, `${name}-day.png`) });
      const dayCanvas = await page.locator("canvas").screenshot();
      if (greyCanvas.equals(dayCanvas)) throw new Error(`${name}: colour on did not change the grayscale render`);
      await page.locator("#colour").click();
      await page.locator('#colour[aria-pressed="false"]').waitFor();
      await settle(page);
      const restored = await page.locator("canvas").screenshot();
      // Compare within one browser run; screenshots from different GPUs are not byte-stable.
      if (!greyCanvas.equals(restored)) throw new Error(`${name}: colour off did not restore the grayscale render`);
      pairs.push({ name, url, view, grey, day });
    };
    for (const view of ["skyline", "quarter"]) {
      await capturePair(view, "skyline-3d.html?controls=open", view);
    }
    for (const id of ids) for (const view of ["front", "side"]) {
      await capturePair(`${id}-${view}`, `building-detail.html?building=${id}`, view);
    }
    await page.setViewportSize(mobileViewport);
    await page.goto(`${server.origin}/index.html?colour=1`);
    await page.locator('#viewer > [role="region"]:not([aria-busy="true"])').waitFor();
    await page.locator('#colour[aria-pressed="true"]').waitFor();
    await settle(page);
    await page.screenshot({ path: path.join(out, "mobile-day.png") });
    // Lay out the untouched screenshots side by side, with labels, as one review artifact.
    await page.setViewportSize({ width: 2400, height: 790 });
    for (const { name, grey, day } of pairs) {
      await page.goto("about:blank");
      await page.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:18px monospace}main{display:flex}figure{margin:0;width:50%}figcaption{padding:12px}img{width:100%;display:block}</style><main><figure><figcaption>Greyscale</figcaption><img src="data:image/png;base64,${grey.toString("base64")}"></figure><figure><figcaption>Sunny-day colour</figcaption><img src="data:image/png;base64,${day.toString("base64")}"></figure></main>`);
      await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
      await page.screenshot({ path: path.join(out, `${name}-comparison.png`), fullPage: true });
    }
    if (errors.length) throw new Error(errors.join("\n"));
    writeFileSync(path.join(out, "captures.json"), `${JSON.stringify({
      buildings: ids, viewport, reducedMotion: "reduce",
      pairs: pairs.map(({ name, url, view }) => ({
        url, view, grey: `${name}-grey.png`, day: `${name}-day.png`, comparison: `${name}-comparison.png`,
      })),
      mobile: { url: "index.html?colour=1", viewport: mobileViewport, image: "mobile-day.png" },
    }, null, 2)}\n`);
    console.log(`Colour review renders: ${out}`);
  } finally {
    try { await browser?.close(); }
    finally { await server.close(); }
  }
});
