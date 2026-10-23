// Stages the runtime site into dist/ for `wrangler deploy`: compiles the browser
// TypeScript modules with tsc, then copies the static assets beside them.
//
// The upload set is an allowlist rather than an ignore list. The repository
// holds credentials (the gitignored .secrets link), test fixtures, and, beside
// the pages in src/, the 18MB source photograph that the site never requests,
// so an ignore list that fell out of date would publish them. Only the compiled
// modules and the static files named here reach Cloudflare.
import { execFile } from "node:child_process";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const root = path.resolve(import.meta.dirname, "../..");
// Entries below are paths within src/, and each keeps that path in dist/.
export const src = path.join(root, "src");
export const dist = path.join(root, "dist");

// The published client is already standalone browser ESM; copy the exact pinned
// artifact alongside our tsc output without introducing another build pipeline.
const dependencyFiles = [{ from: fileURLToPath(import.meta.resolve("@a2f0/ct-client")), to: "vendor/ct-client.js" }];

// Reachable from index.html and the viewer it mounts, the two study pages, the WebGL viewer,
// the 3D skyline, and the building detail its context menu opens.
const staticFiles = [
  "index.html",
  "skyline-webgl.html",
  "skyline-study.html",
  "skyline-3d.html",
  "building-study.html",
  "building-detail.html",
  "skyline-animated.svg",
  "skyline-original-fit.svg",
  "stars.svg",
  "study.css",
  "viewer.css",
  "vendor/three-r186.js",
  "vendor/THREE-LICENSE.txt",
];

// The TypeScript modules the pages load at runtime. Each is compiled in place
// with the same filename; removing or renaming one must fail the build rather
// than ship a site whose script tags point at nothing.
const compiledEntries = [
  "click-tracking-page.ts",
  "viewer-page.ts",
  "skyline-shell.ts",
  "skyline-viewer.ts",
  "markup.ts",
  "three-engine.ts",
  "skyline-3d-page.ts",
  "building-detail-page.ts",
  "study-loader.ts",
  "study-viewer.ts",
  "study-types.ts",
  "skyline-scene.ts",
  "solar-time.ts",
  "time-of-day.ts",
  "skyline-study.ts",
  "skyline-comparison.ts",
  "skyline-3d.ts",
  "building-study.ts",
  "building-detail.ts",
];

// Top-level .ts files in src/models/ ship automatically as compiled .js, and their
// .svg reference excerpts ship as-is, so adding a model does not also mean
// editing this script. The scan is not recursive: nested directories and other
// file types need their own entry.
interface DirectoryEntry {
  from: string;
  extensions: string[];
  target: "compiled" | "static";
}
const directories: DirectoryEntry[] = [{ from: "models", extensions: [".ts"], target: "compiled" }, { from: "models", extensions: [".svg"], target: "static" }];

async function sourceEntries(): Promise<{ static: string[]; compiled: string[] }> {
  const compiled = [...compiledEntries];
  const staticSet = [...staticFiles];
  for (const { from, extensions, target } of directories) {
    const directoryNames = await readdir(path.join(src, from));
    const matched = directoryNames.filter((name) => extensions.includes(path.extname(name)));
    if (!matched.length) throw new Error(`src/${from}/ has no ${extensions.join("/")} files to publish.`);
    const entries = matched.map((name) => `${from}/${name}`);
    if (target === "compiled") compiled.push(...entries);
    else staticSet.push(...entries);
  }
  return { static: staticSet, compiled };
}

// The standalone site's favicons, which agent-tool renders from assets/brand/logo.svg as the
// `favicons` target in agent-tool.json. Only the deployed site serves them, at its root, and its
// pages link them there. The package's viewer assets leave them out: a host that mounts the viewer
// or serves its pages from a subdirectory keeps its own icons at its root, and a GitHub source
// build runs without Skyline's development dependencies, agent-tool among them.
export interface SiteOptions {
  /** Also renders the favicons into dist/. The site build, its deploy and verification do. */
  favicons?: boolean;
}

const agentTool = path.join(root, "node_modules/@a2f0/agent-tool/src/index.ts");
async function images(args: string[]): Promise<string> {
  const { stdout } = await promisify(execFile)(process.execPath, [agentTool, "images", ...args], { cwd: root, maxBuffer: 1 << 24 });
  return stdout;
}

/** The favicon files agent-tool.json declares, as paths within dist/. */
export async function faviconFiles(): Promise<string[]> {
  const { targets } = JSON.parse(await images(["list", "favicons"])) as { targets: { files: string[] }[] };
  return targets.flatMap(({ files }) => files).sort();
}

export async function renderFavicons(destination: string = dist): Promise<void> {
  await images(["build", "favicons", "--out", destination]);
}

// Every file dist/ will hold: the compiled module paths (one .js per .ts) and the
// static assets, and the favicons when asked for. The package suite checks the viewer
// assets against the set without them; scripts/deploy/verify-deploy.ts checks the
// deployed site against the set with them.
export async function publishedFiles({ favicons = false }: SiteOptions = {}): Promise<string[]> {
  const { static: staticSet, compiled } = await sourceEntries();
  return [...compiled.map((entry) => entry.replace(/\.ts$/, ".js")), ...staticSet, ...dependencyFiles.map(({ to }) => to), ...(favicons ? await faviconFiles() : [])].sort();
}

// Compiles the browser module graph into dist/, keeping each module's path
// relative to src/ and its name so the existing script tags load unchanged.
export async function compileBrowser() {
  const run = promisify(execFile);
  const tsc = path.join(path.dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin/tsc");
  const { stdout, stderr } = await run(process.execPath, [tsc, "-p", path.join(src, "tsconfig.build.json")], { cwd: root, maxBuffer: 1 << 24 });
  if (stdout) console.log(stdout.trim());
  if (stderr) throw new Error(stderr.trim());
}

export async function buildSite({ favicons = false }: SiteOptions = {}) {
  const { static: staticSet, compiled } = await sourceEntries();
  await rm(dist, { recursive: true, force: true });
  await compileBrowser();
  for (const entry of staticSet) {
    const target = path.join(dist, entry);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(src, entry), target);
  }
  for (const { from, to } of dependencyFiles) {
    const target = path.join(dist, to);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(from, target);
  }
  if (favicons) await renderFavicons();
  const entries = [...compiled.map((entry) => entry.replace(/\.ts$/, ".js")), ...staticSet, ...dependencyFiles.map(({ to }) => to), ...(favicons ? await faviconFiles() : [])];
  const sizes = await Promise.all(entries.map(async (entry) => {
    try {
      return (await stat(path.join(dist, entry))).size;
    } catch {
      throw new Error(`Cannot publish ${entry}: the build did not produce it. Update scripts/build/build-site.ts if it was renamed.`);
    }
  }));
  const bytes = sizes.reduce((total, size) => total + size, 0);
  console.log(`Built ${compiled.length} modules and staged ${entries.length - compiled.length} static files (${(bytes / 1024 / 1024).toFixed(2)} MB) into dist/.`);
  return entries;
}

if (import.meta.main) buildSite({ favicons: true }).catch((error) => { console.error(error.message); process.exitCode = 1; });
