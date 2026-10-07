import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Script } from "node:vm";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { buildPackage } from "../scripts/build-package.js";
import { publishedFiles, root } from "../scripts/build-site.js";
import { startServer } from "../scripts/lib/static-server.js";

interface PackResult {
  filename: string;
  files: { path: string; size: number }[];
}

describe("published Skyline package", () => {
  let temporary: string, consumer: string, installed: string, packed: PackResult;
  beforeAll(async () => {
    await buildPackage();
    temporary = await mkdtemp(path.join(os.tmpdir(), "skyline-package-test-"));
    consumer = path.join(temporary, "consumer");
    installed = path.join(consumer, "node_modules/@a2f0/skyline");
    await mkdir(installed, { recursive: true });
    const output = execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary], { cwd: root, encoding: "utf8" });
    packed = (JSON.parse(output) as PackResult[])[0]!;
    execFileSync("tar", ["-xzf", path.join(temporary, packed.filename), "--strip-components=1", "-C", installed]);
    // Only declared dependencies come from the local cache. Package code/assets
    // come exclusively from the tarball; the consumer has no source checkout.
    await symlink(path.join(root, "node_modules/three"), path.join(consumer, "node_modules/three"));
    await symlink(path.join(root, "node_modules/@types"), path.join(consumer, "node_modules/@types"));
    await writeFile(path.join(consumer, "package.json"), '{"name":"skyline-consumer","type":"module"}\n');
  }, { timeout: 60_000 });
  afterAll(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

  test("packs complete runtime assets and declarations without repository-only files", async () => {
    const files = packed.files.map(({ path: file }) => file);
    expect(files.every((file) => /^(lib\/|site\/|docs\/(package|skyline-geography)\.md$|NOTICE\.md$|README\.md$|package\.json$)/.test(file))).toBe(true);
    for (const file of await publishedFiles()) expect(files).toContain(`site/${file}`);
    for (const file of ["lib/skyline-package.d.ts", "lib/skyline-shell.d.ts", "lib/skyline-three.d.ts", "lib/three-engine.d.ts", "site/vendor/three-r186.bundle.js", "site/skyline-viewer.js", "site/viewer.css", "lib/skyline-scene.d.ts", "lib/package-assets.d.ts", "lib/models/building-kit.d.ts", "lib/models/window-illumination.d.ts", "lib/models/celebrations.d.ts", "lib/vendor/three-r186.d.ts", "site/vendor/THREE-LICENSE.txt", "NOTICE.md"]) expect(files).toContain(file);
    expect(files.some((file) => /\.secrets|terraform|scripts\/|tests\/|skyline\.jpg|skyline\.svg$/.test(file))).toBe(false);
    const metadata = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8")) as { name: string; private?: boolean; publishConfig?: { access?: string }; scripts: Record<string, string> };
    expect(metadata.name).toBe("@a2f0/skyline");
    expect(metadata.private).not.toBe(true);
    // npm publishes a scoped package as restricted unless told otherwise.
    expect(metadata.publishConfig?.access).toBe("public");
    expect(metadata.scripts["postinstall"]).toBeUndefined();
    expect(metadata.scripts["prepare"]).toBeUndefined();
  });

  test("imports in Node without a DOM and resolves strict consumer types using the host engine", async () => {
    await writeFile(path.join(consumer, "entry.ts"), `
import { mountSkyline } from '@a2f0/skyline';
import type { BuildingModel, SkylineInstance, SkylineThree, StudyView } from '@a2f0/skyline';
import * as engine from '@a2f0/skyline/three';
import { createGeographicSkyline } from '@a2f0/skyline/scene';
import { createCrainBuilding } from '@a2f0/skyline/models/crain-communications';
import { geographicBuildings } from '@a2f0/skyline/models/skyline-geography-data';
import { celebrations } from '@a2f0/skyline/models/celebrations';
import { createWindowIllumination } from '@a2f0/skyline/models/window-illumination';
import type { WindowIllumination } from '@a2f0/skyline/models/window-illumination';
import { copySkylineAssets } from '@a2f0/skyline/build';
import { Group } from 'three';
export function mount(container: HTMLElement): SkylineInstance {
  const skyline = mountSkyline(container, { assetsUrl: '/static/skyline/', three: import('@a2f0/skyline/three') });
  const element: HTMLElement = skyline.element;
  const ready: Promise<void> = skyline.ready;
  void element; void ready;
  return mountSkyline(container, { assetsUrl: new URL('https://example.com/skyline/'), title: 'Skyline', controls: 'open', attribution: false, three: engine });
}
const shared: SkylineThree = engine;
const building: BuildingModel = createCrainBuilding();
const skyline = createGeographicSkyline();
const illumination: WindowIllumination = skyline.models.find(model => model.illumination)!.illumination!;
illumination.set('cubs');
const lit = illumination.active === 'cubs' && illumination.litWindows > 0 && illumination.presets.some(preset => preset.id === 'cubs') && skyline.models.filter(model => model.illumination).length === 1;
illumination.set(null);
const view: StudyView = skyline.drawingView;
console.log(JSON.stringify({ dom: typeof window, copy: typeof copySkylineAssets, engine: Object.keys(shared).sort(),
  lights: lit && illumination.active === null && illumination.litWindows === 0 && celebrations.length === 6 && typeof createWindowIllumination === 'function',
  hostEngine: building.building instanceof Group && skyline.models.every(model => model.building instanceof Group),
  models: skyline.models.length, records: geographicBuildings.length, triangles: building.triangleCount, align: view.align }));
`);
    await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "es2023", module: "nodenext", moduleResolution: "nodenext", strict: true, types: [], lib: ["es2023", "dom", "dom.iterable"], outDir: "compiled", skipLibCheck: false },
      include: ["entry.ts"],
    }));
    execFileSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", path.join(consumer, "tsconfig.json")], { encoding: "utf8" });
    const output = execFileSync("node", [path.join(consumer, "compiled/entry.js")], { cwd: consumer, encoding: "utf8" });
    const result = JSON.parse(output) as { dom: string; copy: string; engine: string[]; hostEngine: boolean; models: number; records: number; triangles: number; align: string; lights: boolean };
    expect(result.dom).toBe("undefined");
    // `@a2f0/skyline/three` hands the viewer exactly what the assets' engine module exports.
    const vendored = await readFile(path.join(installed, "site/vendor/three-r186.js"), "utf8");
    expect(result.engine).toEqual(/export const \{ ([^}]+) \} = engine;/.exec(vendored)![1]!.split(", ").sort());
    expect(Object.keys(await import(path.join(root, "src/vendor/three-r186.js"))).sort()).toEqual(result.engine);
    expect(result.copy).toBe("function");
    expect(result.hostEngine).toBe(true);
    expect(result.models).toBe(result.records);
    expect(result.triangles).toBeGreaterThan(0);
    expect(result.align).toBe("bottom");
    expect(result.lights).toBe(true);
  }, { timeout: 60_000 });

  test("builds a GitHub source install with only the host's compiler and types", async () => {
    const host = path.join(temporary, "github-consumer");
    const source = path.join(host, "node_modules/.bun/@a2f0+skyline@github/node_modules/@a2f0/skyline");
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const file of tracked) {
      const destination = path.join(source, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(root, file), destination);
    }
    for (const dependency of ["typescript", "@tsconfig", "@webgpu"]) {
      await symlink(path.join(root, "node_modules", dependency), path.join(host, "node_modules", dependency));
    }
    // Real type files behind Bun-style symlinks reproduce declaration
    // portability failures that a flat checkout dependency layout can conceal.
    const types = path.join(host, "node_modules/.bun/types/node_modules/@types");
    await cp(path.join(root, "node_modules/@types"), types, { recursive: true, dereference: true });
    await symlink(types, path.join(host, "node_modules/@types"));
    // The installed GitHub source has neither generated artifacts nor its own
    // node_modules. The consuming application's postinstall builds it explicitly.
    expect(await Bun.file(path.join(source, "lib/skyline-package.js")).exists()).toBe(false);
    execFileSync(process.execPath, [path.join(source, "scripts/build-package.ts")], { cwd: host, stdio: "pipe" });
    const { mountSkyline } = await import(pathToFileURL(path.join(source, "lib/skyline-package.js")).href) as { mountSkyline: unknown };
    expect(typeof mountSkyline).toBe("function");
    for (const file of await publishedFiles()) expect(await Bun.file(path.join(source, "site", file)).exists()).toBe(true);
    // HTML loads the bootstrap as a classic script, including in GitHub installs
    // under node_modules where automatic module detection can append exports.
    new Script(await readFile(path.join(source, "site/study-loader.js"), "utf8"));
    expect(await Bun.file(path.join(source, "lib/skyline-package.d.ts")).exists()).toBe(true);
  }, { timeout: 60_000 });

  test("the complete viewer's entrypoints import without the optional Three.js peer", async () => {
    const withoutPeer = path.join(temporary, "without-peer");
    const packageDirectory = path.join(withoutPeer, "node_modules/@a2f0/skyline");
    await mkdir(packageDirectory, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(temporary, packed.filename), "--strip-components=1", "-C", packageDirectory]);
    const output = execFileSync("node", ["--input-type=module", "--eval", `
import { mountSkyline } from '@a2f0/skyline';
import { copySkylineAssets } from '@a2f0/skyline/build';
let missingPeer = false;
try { await import('three'); } catch (error) { missingPeer = error.code === 'ERR_MODULE_NOT_FOUND'; }
console.log(JSON.stringify({ mount: typeof mountSkyline, copy: typeof copySkylineAssets, missingPeer }));
`], { cwd: withoutPeer, encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({ mount: "function", copy: "function", missingPeer: true });
  });

  test("bundles a small browser entry and mounts the complete viewer in the page from a nested host path, with remount cleanup", async () => {
    const publicDirectory = path.join(consumer, "public");
    await mkdir(publicDirectory, { recursive: true });
    const { copySkylineAssets } = await import(pathToFileURL(path.join(installed, "lib/package-assets.js")).href) as { copySkylineAssets(destination: string): Promise<void> };
    await copySkylineAssets(path.join(publicDirectory, "nested/skyline"));
    // The fixture mounts into #host, or into #second for a second instance, and records how
    // each instance's `ready` settles, so the page can be read at any point.
    await writeFile(path.join(consumer, "browser.ts"), `
import { mountSkyline } from '@a2f0/skyline';
const instances = {};
window.settled = {};
window.mountFixture = (options = {}, slot = 'host') => {
  instances[slot]?.destroy();
  const skyline = mountSkyline(document.querySelector('#' + slot), { assetsUrl: '/nested/skyline', ...options });
  instances[slot] = skyline;
  window.settled[slot] = 'pending';
  skyline.ready.then(() => { window.settled[slot] = 'ready'; }, (error) => { window.settled[slot] = 'rejected: ' + error.message; });
  return skyline;
};
window.destroyFixture = (slot = 'host') => instances[slot].destroy();
// A host whose own content is in a shadow root, as a web component's would be.
window.mountNested = () => {
  const outer = document.querySelector('#outer');
  const shadow = outer.shadowRoot ?? outer.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<div id="inner" style="width:400px;height:300px"></div>';
  const skyline = mountSkyline(shadow.querySelector('#inner'), { assetsUrl: '/nested/skyline' });
  instances.nested = skyline;
  window.settled.nested = 'pending';
  skyline.ready.then(() => { window.settled.nested = 'ready'; }, (error) => { window.settled.nested = 'rejected: ' + error.message; });
};
window.mountFixture();
`);
    const bundle = await Bun.build({ entrypoints: [path.join(consumer, "browser.ts")], outdir: publicDirectory, target: "browser", format: "esm", minify: true });
    expect(bundle.success).toBe(true);
    expect(bundle.outputs).toHaveLength(1);
    expect(bundle.outputs[0]!.size, "mounting should not pull scene geometry or Three.js into the host bundle").toBeLessThan(4096);
    // A host page whose styles would reach a viewer they could: rules for every element and
    // its buttons, a right-to-left direction, inherited type and colour, and a custom
    // property the viewer uses. The viewer's own class names appear in the host too, where
    // the viewer's styles must not reach them.
    await writeFile(path.join(publicDirectory, "index.html"), `<!doctype html><html dir="rtl" style="--viewer-controls:400px"><head><style>
      body{margin:0;color:rgb(77,77,77);font:40px cursive;letter-spacing:9px}
      *{box-sizing:content-box;text-transform:uppercase}
      #host,#second{height:100vh;width:100vw}
      button{font-size:80px!important;padding:40px}
      .loading,.control-bar,.skyline-3d{position:static;color:rgb(77,77,77)}
    </style></head><body><div id="host"></div><div id="second" hidden></div><div id="outer"></div><p class="loading" id="host-loading">host</p><script type="module" src="browser.js"></script></body></html>`);
    const server = await startServer(publicDirectory);
    let browser: Browser | undefined;
    // The viewer's shadow root in a slot, and its 3D scene's study on the scene's canvas.
    type Hooked = Window & { mountFixture(options?: object, slot?: string): void; destroyFixture(slot?: string): void; settled: Record<string, string> };
    const settled = (page: Page, slot = "host") => page.waitForFunction((slot) => (window as unknown as Hooked).settled[slot] !== "pending", slot, { timeout: 60_000 }).then(() => page.evaluate((slot) => (window as unknown as Hooked).settled[slot], slot));
    const sceneReady = (page: Page, slot = "host") => page.evaluate((slot) => {
      const canvas = document.querySelector(`#${slot} > [role=region]`)?.shadowRoot?.querySelector<HTMLCanvasElement>(".skyline-3d > #viewport > #building");
      return Boolean((canvas as HTMLCanvasElement & { __buildingStudy?: { ready: boolean } } | null | undefined)?.__buildingStudy?.ready);
    }, slot);
    const mount = (page: Page, options: object = {}, slot = "host") => page.evaluate(([options, slot]) => (window as unknown as Hooked).mountFixture(options, slot), [options, slot] as const);
    const focused = (page: Page) => page.evaluate(() => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.id;
    });
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport, reducedMotion: viewport.width < 600 ? "reduce" : "no-preference", hasTouch: viewport.width < 600 });
        const errors: string[] = [], external: string[] = [], warnings: string[] = [], requested: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => { if (message.type() === "warning" && !message.text().includes("PCFSoftShadowMap")) warnings.push(message.text()); });
        page.on("request", (request) => {
          requested.push(request.url());
          if (!request.url().startsWith(server.origin) && !request.url().startsWith("data:")) external.push(request.url());
        });
        try {
          await page.goto(server.origin);
          // The viewer renders in the host's document, in its region's shadow root, which is
          // busy until the 3D skyline's first frame; no frame is involved.
          const region = page.locator("#host > [role=region]");
          expect(await region.getAttribute("aria-label")).toBe("Interactive Chicago skyline");
          expect(await settled(page)).toBe("ready");
          expect(await region.getAttribute("aria-busy")).toBeNull();
          expect(await sceneReady(page)).toBe(true);
          expect(await page.locator("iframe").count()).toBe(0);
          expect(await page.evaluate(() => document.querySelector("#host > [role=region]")!.shadowRoot!.mode)).toBe("open");
          const box = (await region.boundingBox())!;
          expect([box.width, box.height], "the viewer fills its container").toEqual([viewport.width, viewport.height]);
          expect(await page.locator("#stars circle").count(), "the stars render in the page").toBe(96);
          // Without the host's engine, the scene loads the copy in the assets.
          expect(requested.some((url) => url.endsWith("/nested/skyline/vendor/three-r186.bundle.js"))).toBe(true);
          await page.locator("#embedded-original").waitFor({ state: "hidden" });
          expect(await page.locator(".controls").count(), "a host's viewer has no site toolbar").toBe(0);
          expect(await page.locator("#skyline-3d-scene").isVisible()).toBe(true);
          expect(await page.locator("#show-original").isHidden()).toBe(true);

          // Neither page's styles reach the other: the host's rules, direction, type and
          // custom properties stay out of the viewer, and the viewer's class rules stay out of
          // the host's elements.
          const isolation = await page.evaluate(() => {
            const root = document.querySelector("#host > [role=region]")!.shadowRoot!;
            const star = root.querySelector("#menu-toggle")!, scene = root.querySelector<HTMLElement>(".skyline-3d")!, bar = root.querySelector(".control-bar")!;
            const hostLoading = getComputedStyle(document.querySelector("#host-loading")!);
            return {
              direction: getComputedStyle(bar).direction, transform: getComputedStyle(star).textTransform, spacing: getComputedStyle(bar).letterSpacing,
              color: getComputedStyle(scene).color, inset: getComputedStyle(scene).getPropertyValue("--viewer-controls").trim(),
              hostLoading: [hostLoading.position, hostLoading.color],
            };
          });
          expect(isolation).toEqual({ direction: "ltr", transform: "none", spacing: "normal", color: "rgb(221, 221, 221)", inset: "0px", hostLoading: ["static", "rgb(77, 77, 77)"] });
          await page.locator("#menu-toggle").click();
          expect(await page.locator("#show-original").isVisible()).toBe(true);
          expect(await page.locator("#show-original").evaluate((button) => parseFloat(getComputedStyle(button).fontSize))).toBeLessThan(20);
          expect(await page.locator(".attribution").isVisible(), "the OpenStreetMap credit shows by default").toBe(true);

          // A press inside the viewer reaches the host as any press does, compatibility
          // mousedown included, so a host's menus close and its windows raise.
          await page.evaluate(() => {
            const host = window as unknown as { presses: string[] };
            host.presses = [];
            for (const type of ["pointerdown", "mousedown"]) document.addEventListener(type, () => host.presses.push(type));
          });
          const canvas = (await page.locator(".skyline-3d > #viewport > #building").boundingBox())!;
          await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + 40);
          expect(await page.evaluate(() => (window as unknown as { presses: string[] }).presses)).toEqual(["pointerdown", "mousedown"]);
          // Keys act only for the viewer they are pressed in: F outside it requests no
          // fullscreen; on its canvas it shows the viewer's element.
          await page.evaluate(() => {
            const host = window as unknown as { fullscreen: number };
            host.fullscreen = 0;
            document.querySelector<HTMLElement>("#host > [role=region]")!.requestFullscreen = async () => { host.fullscreen += 1; };
          });
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          await page.keyboard.press("f");
          expect(await page.evaluate(() => (window as unknown as { fullscreen: number }).fullscreen)).toBe(0);
          await page.locator(".skyline-3d > #viewport > #building").focus();
          await page.keyboard.press("f");
          expect(await page.evaluate(() => (window as unknown as { fullscreen: number }).fullscreen)).toBe(1);

          await page.locator("#show-original").click();
          await page.locator("#return-skyline-3d").waitFor({ state: "visible" });
          expect(await page.locator("#drawing").getAttribute("src")).toBe(`${server.origin}/nested/skyline/skyline-original-fit.svg`);
          expect(await page.locator("#drawing").evaluate((image) => (image as HTMLImageElement).decode().then(() => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
          await page.locator("#return-skyline-3d").click();
          expect(await focused(page)).toBe("show-original");

          // Remounting releases the last instance: its canvas loses its WebGL context, and
          // its element leaves the page.
          await page.evaluate(() => {
            const root = document.querySelector("#host > [role=region]")!.shadowRoot!;
            (window as unknown as { lastCanvas: HTMLCanvasElement }).lastCanvas = root.querySelector<HTMLCanvasElement>("#building")!;
          });
          await mount(page);
          expect(await settled(page)).toBe("ready");
          expect(await page.evaluate(() => (window as unknown as { lastCanvas: HTMLCanvasElement }).lastCanvas.getContext("webgl2")!.isContextLost())).toBe(true);
          expect(await page.locator("#host > [role=region]").count()).toBe(1);
          // A lost graphics context says so, and brings back the way to the drawing.
          await page.evaluate(() => document.querySelector("#host > [role=region]")!.shadowRoot!.querySelector<HTMLCanvasElement>("#building")!
            .getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
          await page.locator("#embedded-original").waitFor({ state: "visible" });
          expect(await page.locator("#loading").textContent()).toContain("graphics context was interrupted");

          // The host can start the scene's control bar open; it starts closed above.
          await mount(page, { controls: "open" });
          expect(await settled(page)).toBe("ready");
          expect(await page.locator("#menu-toggle").getAttribute("aria-expanded")).toBe("true");
          expect(await page.locator("#camera-views").isVisible()).toBe(true);
          await mount(page, { controls: "open", attribution: false, title: "Chicago at night" });
          expect(await settled(page)).toBe("ready");
          expect(await page.locator("#host > [role=region]").getAttribute("aria-label")).toBe("Chicago at night");
          expect(await page.locator(".attribution").isHidden()).toBe(true);
          expect(await page.locator("#camera-hint").isVisible()).toBe(true);
          expect(await page.evaluate(() => { try { (window as unknown as Hooked).mountFixture({ controls: "wide" }); return ""; } catch (error) { return String(error); } }))
            .toBe('TypeError: Skyline controls must be "open" or "closed".');
          // The site's toolbar is not an option: a host's viewer never has it.
          await mount(page, { navigation: true });
          expect(await settled(page)).toBe("ready");
          expect(await page.locator(".controls").count()).toBe(0);

          // Two instances side by side each run their own scene.
          await page.evaluate(() => {
            document.querySelector<HTMLElement>("#host")!.style.width = "50vw";
            const second = document.querySelector<HTMLElement>("#second")!;
            second.hidden = false;
            // The host page is right-to-left, so #host now fills its right half.
            second.style.cssText = "position:fixed;top:0;left:0;width:50vw;height:100vh";
          });
          await mount(page, {}, "second");
          expect(await settled(page, "second")).toBe("ready");
          expect([await sceneReady(page), await sceneReady(page, "second")]).toEqual([true, true]);
          const expanded = () => Promise.all(["host", "second"].map((slot) => page.locator(`#${slot} #menu-toggle`).getAttribute("aria-expanded")));
          expect(await expanded()).toEqual(["false", "false"]);
          await page.locator("#second #menu-toggle").click();
          expect(await expanded()).toEqual(["false", "true"]);
          await page.locator("#host #menu-toggle").click();
          expect(await expanded()).toEqual(["true", "true"]);
          // Escape folds only the bar it is pressed in.
          await page.locator("#second #camera-views button").first().focus();
          await page.keyboard.press("Escape");
          expect(await expanded()).toEqual(["true", "false"]);
          // Away from the page's corner, and scaled by a host's transform, a building's menu
          // still opens at the pointer.
          await page.evaluate(() => Object.assign(document.querySelector<HTMLElement>("#host")!.style, { transform: "scale(0.8)", transformOrigin: "100% 0" }));
          const aon = await page.evaluate(() => {
            const canvas = document.querySelector("#host > [role=region]")!.shadowRoot!.querySelector<HTMLCanvasElement & { __buildingStudy: { projectPoint(id: string, point: number[]): [number, number] } }>("#building")!;
            const box = canvas.getBoundingClientRect(), [u, v] = canvas.__buildingStudy.projectPoint("layer3", [284, 200, -50]);
            return { x: box.x + u * box.width, y: box.y + v * box.height, left: box.x };
          });
          expect(aon.left, "the host's half of the page is its right half").toBeGreaterThan(viewport.width / 3);
          await page.mouse.click(aon.x, aon.y, { button: "right" });
          const menu = (await page.locator("#host #building-menu").boundingBox())!;
          // It stands at the pointer's height, inside this viewer's half of the page.
          const half = (await page.locator("#host > [role=region]").boundingBox())!;
          const atPointer = Math.min(Math.abs(menu.y - aon.y), Math.abs(menu.y + menu.height - aon.y)) < 1;
          const inside = menu.x >= half.x && menu.x + menu.width <= half.x + half.width;
          expect({ atPointer, inside }, JSON.stringify({ menu, aon, half })).toEqual({ atPointer: true, inside: true });
          await page.keyboard.press("Escape");
          await page.evaluate(() => { document.querySelector<HTMLElement>("#host")!.style.transform = ""; });
          await page.evaluate(() => (window as unknown as Hooked).destroyFixture("second"));
          expect(await sceneReady(page)).toBe(true);
          await page.evaluate(() => {
            document.querySelector<HTMLElement>("#host")!.style.width = "";
            document.querySelector<HTMLElement>("#second")!.hidden = true;
          });

          // On a phone, where a building's detail scrolls inside its panel, its scrolling stops
          // there: it never scrolls the host page beneath, here made taller than the window.
          if (viewport.width < 600) {
            await page.evaluate(() => document.body.append(Object.assign(document.createElement("div"), { id: "spacer" })));
            await page.evaluate(() => document.querySelector<HTMLElement>("#spacer")!.style.setProperty("height", "150vh"));
            // The scene has just grown back to the page's width; a resize closes its menu, so
            // let it settle first.
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const point = await page.evaluate(() => {
              const canvas = document.querySelector("#host > [role=region]")!.shadowRoot!.querySelector<HTMLCanvasElement>("#building")!;
              const box = canvas.getBoundingClientRect(), [u, v] = canvas.__buildingStudy!.projectPoint("layer3", [284, 200, -50]);
              return { x: box.x + u * box.width, y: box.y + v * box.height };
            });
            await page.mouse.click(point.x, point.y, { button: "right" });
            await page.locator("#host #building-detail-link").click();
            await page.waitForFunction(() => document.querySelector("#host > [role=region]")!.shadowRoot!.querySelector(".detail-host")?.shadowRoot?.querySelector<HTMLCanvasElement>("#building")?.__buildingStudy?.ready, null, { timeout: 60_000 });
            const scroller = page.locator("#host .detail-frame");
            const box = (await scroller.boundingBox())!;
            await page.mouse.move(box.x + box.width / 2, box.y + 40);
            for (let step = 0; step < 12; step += 1) await page.mouse.wheel(0, 400);
            await page.waitForTimeout(300);
            expect(await scroller.evaluate((frame) => frame.scrollHeight > frame.clientHeight && frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1), "the detail scrolls to its end").toBe(true);
            expect(await page.evaluate(() => scrollY), "the host page stays put").toBe(0);
            await page.keyboard.press("Escape");
            await page.evaluate(() => document.querySelector("#spacer")!.remove());
          }

          // Destroyed while it loads, an instance never settles and leaves nothing running;
          // the next mounts normally. Each stage is held in turn: the scene's markup, then, in
          // a page that has yet to load it, the scene's code.
          for (const stage of ["skyline-3d.html", "skyline-3d.js"]) {
            let release!: () => void;
            const held = new Promise<void>((resolve) => { release = resolve; });
            // Destroying aborts the held fetch, which then has nothing to continue.
            await page.route(`**/${stage}`, async (route) => { await held; await route.continue().catch(() => {}); });
            if (stage.endsWith(".js")) {
              await page.reload();
              await page.locator(".skyline-trace").waitFor();
            } else {
              await mount(page);
              await page.locator("#host #stars circle").first().waitFor({ state: "attached" });
            }
            // Keep the destroyed instance's root, which the page no longer shows, to see that
            // nothing starts in it once the held load arrives.
            await page.evaluate(() => {
              (window as unknown as { destroyedRoot: ShadowRoot }).destroyedRoot = document.querySelector("#host > [role=region]")!.shadowRoot!;
              (window as unknown as Hooked).destroyFixture();
            });
            release();
            await page.unroute(`**/${stage}`);
            await page.waitForTimeout(1000);
            expect(await page.evaluate(() => (window as unknown as Hooked).settled["host"]), `destroyed while ${stage} loads`).toBe("pending");
            expect(await page.locator("#host > [role=region]").count()).toBe(0);
            expect(await page.evaluate(() => {
              const root = (window as unknown as { destroyedRoot: ShadowRoot }).destroyedRoot;
              const canvas = root.querySelector<HTMLCanvasElement>("#building");
              return { markup: Boolean(canvas), study: Boolean(canvas?.__buildingStudy), loading: root.querySelector<HTMLElement>("#loading")?.hidden ?? null };
            }), `nothing starts after destroying while ${stage} loads`).toEqual(stage.endsWith(".html")
              // The scene's markup never arrives,
              ? { markup: false, study: false, loading: null }
              // or arrives before its code, which then never starts the scene.
              : { markup: true, study: false, loading: false });
            await mount(page);
            expect(await settled(page)).toBe("ready");
          }

          // The host can still choose the SVG if the 3D scene's module fails, and `ready`
          // says the scene could not start.
          await page.route("**/skyline-3d.js", (route) => route.abort());
          await page.reload();
          expect(await settled(page)).toMatch(/^rejected: /);
          expect(await page.locator("#loading").textContent()).toContain("WebGL 2");
          expect(await page.locator("#menu-toggle").isDisabled()).toBe(true);
          await page.locator("#embedded-original").click();
          expect(await page.locator("#drawing").isVisible()).toBe(true);
          await page.locator("#return-skyline-3d").press("Enter");
          expect(await focused(page)).toBe("embedded-original");
          await page.unroute("**/skyline-3d.js");
          // A viewer whose own code cannot load says why in its place.
          await page.route("**/skyline-viewer.js", (route) => route.abort());
          await page.reload();
          expect(await settled(page)).toMatch(/^rejected: /);
          expect(await page.locator("#host [role=alert]").textContent()).toStartWith("The Chicago skyline couldn't start:");
          await page.unroute("**/skyline-viewer.js");
          await page.reload();
          expect(await settled(page)).toBe("ready");
          await page.evaluate(() => (window as unknown as Hooked).destroyFixture());
          await page.waitForFunction(() => !document.querySelector("#host > [role=region]"));
          // Mounted inside a host's own shadow root, F enters fullscreen and, pressed again,
          // leaves it, though the document names only that root's host as fullscreen.
          if (viewport.width >= 600) {
            await page.evaluate(() => (window as unknown as { mountNested(): void }).mountNested());
            expect(await settled(page, "nested")).toBe("ready");
            await page.locator("#outer #inner #building").first().focus();
            await page.keyboard.press("f");
            await page.waitForFunction(() => document.fullscreenElement?.id === "outer");
            expect(await page.evaluate(() => document.querySelector("#outer")!.shadowRoot!.fullscreenElement?.getAttribute("role"))).toBe("region");
            await page.keyboard.press("f");
            await page.waitForFunction(() => document.fullscreenElement === null);
            await page.evaluate(() => (window as unknown as Hooked).destroyFixture("nested"));
          }
          // Without WebGL the scene can't start: `ready` says so, the scene says why, and the
          // drawing stays one press away.
          await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
          await page.reload();
          expect(await settled(page)).toMatch(/^rejected: /);
          expect(await page.locator("#loading").textContent()).toContain("WebGL 2");
          await page.locator("#embedded-original").click();
          expect(await page.locator("#drawing").isVisible()).toBe(true);
          expect(external).toEqual([]);
          expect(errors).toEqual([]);
          expect(warnings.filter((warning) => warning.includes("Multiple instances of Three.js"))).toEqual([]);
        } finally { await page.close(); }
      }
    } finally { await browser?.close(); await server.close(); }
  }, { timeout: 240_000 });

  test("shares the host page's Three.js, without loading or warning about a second engine", async () => {
    const publicDirectory = path.join(consumer, "public-three");
    await mkdir(publicDirectory, { recursive: true });
    const { copySkylineAssets } = await import(pathToFileURL(path.join(installed, "lib/package-assets.js")).href) as { copySkylineAssets(destination: string): Promise<void> };
    await copySkylineAssets(path.join(publicDirectory, "skyline"));
    // A page that already renders with Three.js, as devopsrockstars' hat preview does, then
    // hands the viewer its engine through a lazily loaded `@a2f0/skyline/three`.
    await writeFile(path.join(consumer, "three-host.ts"), `
import { WebGLRenderer, Scene, PerspectiveCamera, REVISION } from 'three';
import { mountSkyline } from '@a2f0/skyline';
const own = new WebGLRenderer();
own.render(new Scene(), new PerspectiveCamera());
window.hostRevision = REVISION;
const mode = location.search.slice(1);
// An engine that fails to load: the viewer warns and loads its own; destroyed first, it
// leaves no unhandled rejection.
const failing = () => new Promise((resolve, reject) => setTimeout(() => reject(new Error('no engine')), 50));
const three = mode === 'share' ? { three: import('@a2f0/skyline/three') } : mode.startsWith('reject') ? { three: failing() } : {};
const skyline = mountSkyline(document.querySelector('#host'), { assetsUrl: '/skyline/', ...three });
if (mode === 'reject-destroyed') {
  skyline.destroy();
  setTimeout(() => { window.settled = 'destroyed'; }, 500);
} else skyline.ready.then(() => { window.settled = 'ready'; }, (error) => { window.settled = 'rejected: ' + error.message; });
`);
    const bundle = await Bun.build({ entrypoints: [path.join(consumer, "three-host.ts")], outdir: publicDirectory, target: "browser", format: "esm", minify: true, splitting: true });
    expect(bundle.success).toBe(true);
    await writeFile(path.join(publicDirectory, "index.html"), '<!doctype html><html><head><style>body{margin:0}#host{height:100vh}</style></head><body><div id="host"></div><script type="module" src="three-host.js"></script></body></html>');
    const server = await startServer(publicDirectory);
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
      for (const mode of ["share", "", "reject", "reject-destroyed"]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
        const errors: string[] = [], warnings: string[] = [], requested: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
        page.on("request", (request) => requested.push(new URL(request.url()).pathname));
        try {
          await page.goto(`${server.origin}/${mode ? `?${mode}` : ""}`);
          await page.waitForFunction(() => (window as unknown as { settled?: string }).settled, null, { timeout: 60_000 });
          expect(await page.evaluate(() => (window as unknown as { settled: string }).settled)).toBe(mode === "reject-destroyed" ? "destroyed" : "ready");
          const multiple = warnings.filter((warning) => warning.includes("Multiple instances of Three.js"));
          const fallback = warnings.filter((warning) => warning.includes("could not use the page's Three.js"));
          if (mode === "share") {
            expect(requested, "the shared engine replaces the assets' copy").not.toContain("/skyline/vendor/three-r186.bundle.js");
            expect(multiple).toEqual([]);
          } else if (mode === "reject-destroyed") {
            expect(fallback).toEqual([]);
          } else {
            // Without the option, or with an engine that fails to load, the viewer runs its own
            // copy beside the page's, as three warns.
            expect(requested).toContain("/skyline/vendor/three-r186.bundle.js");
            expect(multiple).toHaveLength(1);
            expect(fallback).toHaveLength(mode === "reject" ? 1 : 0);
          }
          expect(errors, mode).toEqual([]);
        } finally { await page.close(); }
      }
    } finally { await browser?.close(); await server.close(); }
  }, { timeout: 180_000 });
});
