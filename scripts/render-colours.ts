// Reproducible visual review of the opt-in colour layer, on identical cameras with motion off.
// Only original renders are written; the photographs used to measure the palette stay in cache.
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite, dist } from "./build-site.js";
import { startServer } from "./lib/static-server.js";
import { launch, settle, command } from "./lib/study-page.js";

command("Usage: bun scripts/render-colours.ts [--out directory]", { out: { type: "string" } }, async ({ values }) => {
  const out = path.resolve(values["out"] as string || path.join(os.tmpdir(), "skyline-colours"));
  mkdirSync(out, { recursive: true });
  await buildSite();
  const server = await startServer(dist);
  const browser = await launch();
  const errors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const pairs: { name: string; grey: Buffer; day: Buffer }[] = [];
    for (const view of ["skyline", "quarter"]) {
      await page.goto(`${server.origin}/skyline-3d.html?controls=open`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      await page.locator(`[data-view="${view}"]`).click();
      await settle(page);
      const grey = await page.screenshot({ path: path.join(out, `${view}-grey.png`) });
      await page.locator("#colour").click();
      await settle(page);
      const day = await page.screenshot({ path: path.join(out, `${view}-day.png`) });
      pairs.push({ name: view, grey, day });
    }
    for (const id of ["building-three-illinois-center", "building-michigan-plaza-south-tower", "building-crain-communications", "building-chicago-athletic-association"]) {
      await page.goto(`${server.origin}/building-detail.html?building=${id}`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      await page.locator('[data-view="front"]').click();
      await settle(page);
      const grey = await page.screenshot({ path: path.join(out, `${id}-grey.png`) });
      await page.locator("#colour").click();
      await settle(page);
      const day = await page.screenshot({ path: path.join(out, `${id}-day.png`) });
      pairs.push({ name: id, grey, day });
    }
    await page.setViewportSize({ width: 390, height: 844 });
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
    console.log(`Colour review renders: ${out}`);
  } finally {
    await browser.close();
    await server.close();
  }
});
