import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import type { Browser } from "playwright";
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
    installed = path.join(consumer, "node_modules/chicago-skyline");
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
    for (const file of ["lib/skyline-package.d.ts", "lib/skyline-scene.d.ts", "lib/package-assets.d.ts", "lib/models/building-kit.d.ts", "lib/vendor/three-r186.d.ts", "site/vendor/THREE-LICENSE.txt", "NOTICE.md"]) expect(files).toContain(file);
    expect(files.some((file) => /\.secrets|terraform|scripts\/|tests\/|skyline\.jpg|skyline\.svg$/.test(file))).toBe(false);
    const metadata = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8")) as { private?: boolean; scripts: Record<string, string> };
    expect(metadata.private).not.toBe(true);
    expect(metadata.scripts["postinstall"]).toBeUndefined();
    expect(metadata.scripts["prepare"]).toBeUndefined();
  });

  test("imports in Node without a DOM and resolves strict consumer types using the host engine", async () => {
    await writeFile(path.join(consumer, "entry.ts"), `
import { mountSkyline } from 'chicago-skyline';
import type { BuildingModel, SkylineInstance, StudyView } from 'chicago-skyline';
import { createGeographicSkyline } from 'chicago-skyline/scene';
import { createCrainBuilding } from 'chicago-skyline/models/crain-communications';
import { geographicBuildings } from 'chicago-skyline/models/skyline-geography-data';
import { copySkylineAssets } from 'chicago-skyline/build';
import { Group } from 'three';
export function mount(container: HTMLElement): SkylineInstance {
  return mountSkyline(container, { assetsUrl: '/static/skyline/' });
}
const building: BuildingModel = createCrainBuilding();
const skyline = createGeographicSkyline();
const view: StudyView = skyline.drawingView;
console.log(JSON.stringify({ dom: typeof window, copy: typeof copySkylineAssets,
  hostEngine: building.building instanceof Group && skyline.models.every(model => model.building instanceof Group),
  models: skyline.models.length, records: geographicBuildings.length, triangles: building.triangleCount, align: view.align }));
`);
    await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "es2023", module: "nodenext", moduleResolution: "nodenext", strict: true, types: [], lib: ["es2023", "dom", "dom.iterable"], outDir: "compiled", skipLibCheck: false },
      include: ["entry.ts"],
    }));
    execFileSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", path.join(consumer, "tsconfig.json")], { encoding: "utf8" });
    const output = execFileSync("node", [path.join(consumer, "compiled/entry.js")], { cwd: consumer, encoding: "utf8" });
    const result = JSON.parse(output) as { dom: string; copy: string; hostEngine: boolean; models: number; records: number; triangles: number; align: string };
    expect(result.dom).toBe("undefined");
    expect(result.copy).toBe("function");
    expect(result.hostEngine).toBe(true);
    expect(result.models).toBe(result.records);
    expect(result.triangles).toBeGreaterThan(0);
    expect(result.align).toBe("bottom");
  }, { timeout: 60_000 });

  test("builds a GitHub source install with only the host's compiler and types", async () => {
    const host = path.join(temporary, "github-consumer");
    const source = path.join(host, "node_modules/chicago-skyline");
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const file of tracked) {
      const destination = path.join(source, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(root, file), destination);
    }
    for (const dependency of ["typescript", "@tsconfig", "@types"]) {
      await symlink(path.join(root, "node_modules", dependency), path.join(host, "node_modules", dependency));
    }
    // The installed GitHub source has neither generated artifacts nor its own
    // node_modules. The consuming application's postinstall builds it explicitly.
    expect(await Bun.file(path.join(source, "lib/skyline-package.js")).exists()).toBe(false);
    execFileSync(process.execPath, [path.join(source, "scripts/build-package.ts")], { cwd: host, stdio: "pipe" });
    const { mountSkyline } = await import(pathToFileURL(path.join(source, "lib/skyline-package.js")).href) as { mountSkyline: unknown };
    expect(typeof mountSkyline).toBe("function");
    for (const file of await publishedFiles()) expect(await Bun.file(path.join(source, "site", file)).exists()).toBe(true);
    expect(await Bun.file(path.join(source, "lib/skyline-package.d.ts")).exists()).toBe(true);
  }, { timeout: 60_000 });

  test("the complete viewer's entrypoints import without the optional Three.js peer", async () => {
    const withoutPeer = path.join(temporary, "without-peer");
    const packageDirectory = path.join(withoutPeer, "node_modules/chicago-skyline");
    await mkdir(packageDirectory, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(temporary, packed.filename), "--strip-components=1", "-C", packageDirectory]);
    const output = execFileSync("node", ["--input-type=module", "--eval", `
import { mountSkyline } from 'chicago-skyline';
import { copySkylineAssets } from 'chicago-skyline/build';
let missingPeer = false;
try { await import('three'); } catch (error) { missingPeer = error.code === 'ERR_MODULE_NOT_FOUND'; }
console.log(JSON.stringify({ mount: typeof mountSkyline, copy: typeof copySkylineAssets, missingPeer }));
`], { cwd: withoutPeer, encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({ mount: "function", copy: "function", missingPeer: true });
  });

  test("bundles a small browser entry and serves the complete viewer from a nested host path with remount cleanup", async () => {
    const publicDirectory = path.join(consumer, "public");
    await mkdir(publicDirectory, { recursive: true });
    const { copySkylineAssets } = await import(pathToFileURL(path.join(installed, "lib/package-assets.js")).href) as { copySkylineAssets(destination: string): Promise<void> };
    await copySkylineAssets(path.join(publicDirectory, "nested/skyline"));
    await writeFile(path.join(consumer, "browser.ts"), `
import { mountSkyline } from 'chicago-skyline';
let skyline;
window.mountFixture = (navigation = false) => {
  skyline?.destroy();
  skyline = mountSkyline(document.querySelector('#host'), { assetsUrl: '/nested/skyline', navigation });
};
window.destroyFixture = () => skyline.destroy();
window.mountFixture();
`);
    const bundle = await Bun.build({ entrypoints: [path.join(consumer, "browser.ts")], outdir: publicDirectory, target: "browser", format: "esm", minify: true });
    expect(bundle.success).toBe(true);
    expect(bundle.outputs).toHaveLength(1);
    expect(bundle.outputs[0]!.size, "embedding should not pull scene geometry or Three.js into the host bundle").toBeLessThan(4096);
    await writeFile(path.join(publicDirectory, "index.html"), '<!doctype html><html><head><style>body{margin:0}#host{height:100vh;width:100vw}button{font-size:80px!important}</style></head><body><div id="host"></div><script type="module" src="browser.js"></script></body></html>');
    const server = await startServer(publicDirectory);
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
        const errors: string[] = [], external: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => { if (!request.url().startsWith(server.origin)) external.push(request.url()); });
        try {
          await page.goto(server.origin);
          const frame = (await (await page.locator("#host > iframe").elementHandle())!.contentFrame())!;
          const scene = (await (await frame.locator("#skyline-3d-scene").elementHandle())!.contentFrame())!;
          await scene.waitForFunction(() => window.__buildingStudy?.ready);
          expect(await frame.locator(".controls").isHidden()).toBe(true);
          expect(await frame.locator("#skyline-3d-scene").isVisible()).toBe(true);
          expect(await scene.locator("#show-original").isHidden()).toBe(true);
          await scene.locator("#menu-toggle").click();
          expect(await scene.locator("#show-original").isVisible()).toBe(true);
          expect(await scene.locator("#show-original").evaluate((button) => parseFloat(getComputedStyle(button).fontSize))).toBeLessThan(20);
          await scene.locator("#show-original").click();
          await frame.locator("#return-skyline-3d").waitFor({ state: "visible" });
          await frame.locator("#return-skyline-3d").click();
          expect(await scene.evaluate(() => document.activeElement?.id)).toBe("show-original");
          await page.evaluate(() => (window as unknown as { mountFixture(): void }).mountFixture());
          const remounted = (await (await page.locator("#host > iframe").elementHandle())!.contentFrame())!;
          const newScene = (await (await remounted.locator("#skyline-3d-scene").elementHandle())!.contentFrame())!;
          await newScene.waitForFunction(() => window.__buildingStudy?.ready);
          expect(frame.isDetached()).toBe(true);
          expect(scene.isDetached()).toBe(true);
          expect(await page.locator("#host > iframe").count()).toBe(1);
          await page.evaluate(() => (window as unknown as { mountFixture(navigation: boolean): void }).mountFixture(true));
          const standalone = (await (await page.locator("#host > iframe").elementHandle())!.contentFrame())!;
          await standalone.locator(".controls").waitFor({ state: "visible" });
          expect(await standalone.locator("#fullscreen").isVisible()).toBe(true);
          await page.evaluate(() => (window as unknown as { destroyFixture(): void }).destroyFixture());
          await page.waitForFunction(() => !document.querySelector("#host > iframe"));
          expect(external).toEqual([]);
          expect(errors).toEqual([]);
        } finally { await page.close(); }
      }
    } finally { await browser?.close(); await server.close(); }
  }, { timeout: 120_000 });
});
