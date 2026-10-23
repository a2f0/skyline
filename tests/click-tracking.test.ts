import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import type { ClickEvent } from "@a2f0/ct-client";
import { dist } from "../scripts/build-site.js";

const production = "https://skyline.devopsrockstars.com";
const preview = "https://preview.example.test";
const local = "http://127.0.0.1:8000";
const endpoint = "https://ct.a2f0.net/v1/clicks";
const types: Record<string, string> = { ".html": "text/html", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css" };
interface Batch { site: string; events: ClickEvent[] }
let browser: Browser;

// Chrome can take seconds to start and stop beside the other suites, past Bun's 5 s default.
beforeAll(async () => { browser = await chromium.launch({ channel: "chrome", headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

// Every request is intercepted before navigation. Production-shaped addresses
// exercise the real origin guard without sending anything to either live service.
async function session({ automated = false, optOut = false, extension = false, gpc = false, dnt = false } = {}) {
  const context = await browser.newContext();
  const batches: Batch[] = [], requests: string[] = [];
  await context.addInitScript(({ automated, optOut, extension, gpc, dnt }) => {
    if (!automated) Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "globalPrivacyControl", { get: () => gpc });
    Object.defineProperty(navigator, "doNotTrack", { get: () => dnt ? "1" : null });
    if (optOut) localStorage.setItem("ct:opt-out", "1");
    if (extension) {
      const disable = () => document.documentElement?.setAttribute("data-ct-disabled", "");
      new MutationObserver(disable).observe(document, { childList: true });
      disable();
    }
  }, { automated, optOut, extension, gpc, dnt });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    requests.push(request.url());
    if (request.url() === endpoint) {
      batches.push(request.postDataJSON() as Batch);
      await route.fulfill({ status: 202, headers: { "Access-Control-Allow-Origin": production }, body: "{}" });
      return;
    }
    if (![production, preview, local].includes(url.origin)) { await route.abort(); return; }
    if (url.pathname === "/host.html") {
      await route.fulfill({ contentType: "text/html", body: `<!doctype html><div id="host" style="height:600px"></div><script type="module">
        import { mountViewer } from '/skyline-shell.js';
        mountViewer(document.querySelector('#host'), { assetsUrl: new URL('/', location.href), title: 'Host', controls: 'open' });
        </script>` });
      return;
    }
    let filename = url.pathname === "/" ? "/index.html" : url.pathname;
    if (!path.extname(filename)) filename += ".html";
    try {
      await route.fulfill({ contentType: types[path.extname(filename)] ?? "application/octet-stream", body: await readFile(path.join(dist, filename)) });
    } catch { await route.fulfill({ status: 404, body: "missing" }); }
  });
  const page = await context.newPage();
  return { context, page, batches, requests };
}

async function loaded(page: Page, pathname = "/", origin = production) {
  await page.goto(`${origin}${pathname}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.endsWith("/vendor/ct-client.js")));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

async function clickFixture(page: Page) {
  await page.evaluate(() => {
    const element = document.createElementNS(document.documentElement.namespaceURI, document.documentElement instanceof SVGElement ? "rect" : "div");
    if (element instanceof SVGElement) {
      for (const [key, value] of Object.entries({ x: "0", y: "0", width: "8502", height: "2783", fill: "#000" })) element.setAttribute(key, value);
    } else {
      element.textContent = "private text never collected";
      (element as HTMLElement).style.cssText = "position:fixed;inset:0;z-index:2147483647";
    }
    element.setAttribute("id", "private-element-id");
    (document.body ?? document.documentElement).append(element);
  });
  await page.locator("#private-element-id").click();
}

async function flush(page: Page, expectBatch = false) {
  const sent = expectBatch ? page.waitForResponse(endpoint) : null;
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  if (sent) await sent;
  // Negative cases give an unexpected request time to arrive before asserting.
  else await page.waitForTimeout(100);
}

async function close(context: BrowserContext) { await context.close(); }

describe("standalone site click tracking", () => {
  test("all pages and the SVG override GPC with fixed routes and no private URL or DOM data", async () => {
    for (const [pathname, normalized] of [
      ["/", "/"], ["/skyline-3d", "/skyline-3d"], ["/building-detail.html", "/building-detail"],
      ["/skyline-study", "/skyline-study"], ["/building-study.html", "/building-study"],
      ["/skyline-webgl", "/skyline-webgl"], ["/skyline-animated.svg", "/skyline-animated.svg"],
    ] as const) {
      const { context, page, batches } = await session({ gpc: true });
      try {
        await loaded(page, `${pathname}?private=secret#personal-fragment`);
        await clickFixture(page);
        expect(batches).toEqual([]); // queued until a lifecycle flush
        await flush(page, true);
        expect(batches.length, pathname).toBe(1);
        expect(batches[0]!.site).toBe("skyline");
        expect(batches[0]!.events).toHaveLength(1);
        const event = batches[0]!.events[0]!;
        expect(event.page).toBe(normalized);
        expect(event.label).toBeNull();
        expect(event.target).toBe(pathname.endsWith(".svg") ? "rect" : "div");
        expect(Object.keys(event).sort()).toEqual(["id", "label", "page", "target", "timestamp"]);
        expect(JSON.stringify(batches)).not.toMatch(/secret|personal|private/);
      } finally { await close(context); }
    }
  }, 90_000);

  test("captures labeled shadow-root controls and the enhanced drawing iframe once", async () => {
    const { context, page, batches } = await session();
    try {
      await loaded(page);
      await page.locator('[data-ct="viewer.mode.enhanced"]').click();
      await flush(page, true);
      expect(batches[0]!.events.map(({ label }) => label)).toEqual(["viewer.mode.enhanced"]);
      const frame = page.frames().find((frame) => frame.url().endsWith("/skyline-animated.svg"));
      expect(frame).toBeDefined();
      await frame!.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.endsWith("/vendor/ct-client.js")));
      await page.frameLocator('iframe[src$="skyline-animated.svg"]').locator("svg").click({ position: { x: 100, y: 100 } });
      const sent = page.waitForResponse(endpoint);
      await frame!.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await sent;
      expect(batches).toHaveLength(2);
      expect(batches[1]!.events).toHaveLength(1);
      expect(batches[1]!.events[0]!.page).toBe("/skyline-animated.svg");
    } finally { await close(context); }
  }, 30_000);

  test("GPC override preserves DNT, automation, opt-outs and local or preview origin guards", async () => {
    for (const options of [{ dnt: true }, { automated: true }, { optOut: true }, { extension: true }, { preview: true }, { local: true }]) {
      const { context, page, batches } = await session({ ...options, gpc: true });
      try {
        await loaded(page, "/", "preview" in options ? preview : "local" in options ? local : production);
        await clickFixture(page);
        await flush(page);
        expect(batches).toEqual([]);
      } finally { await close(context); }
    }
  }, 120_000);

  test("opt-out discards queued events and synthetic clicks never enter the queue", async () => {
    const { context, page, batches } = await session({ gpc: true });
    try {
      await loaded(page);
      await clickFixture(page);
      await page.evaluate(() => {
        localStorage.setItem("ct:opt-out", "1");
        document.dispatchEvent(new Event("ct:opt-out-change"));
        localStorage.removeItem("ct:opt-out");
        document.querySelector<HTMLElement>("#private-element-id")!.click();
      });
      await flush(page);
      expect(batches).toEqual([]);
      await page.mouse.click(80, 80);
      await flush(page, true);
      expect(batches[0]!.events).toHaveLength(1);
    } finally { await close(context); }
  }, 30_000);

  test("a reusable viewer mounted on the production origin does not load or initialize tracking", async () => {
    const { context, page, batches, requests } = await session({ gpc: true });
    try {
      await page.goto(`${production}/host.html`);
      await page.locator("#menu-toggle").click();
      await flush(page);
      expect(batches).toEqual([]);
      expect(requests.some((url) => /click-tracking-page|ct-client/.test(url))).toBe(false);
    } finally { await close(context); }
  }, 30_000);
});
