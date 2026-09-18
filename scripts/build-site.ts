// Stages the runtime site into dist/ for `wrangler deploy`: compiles the browser
// TypeScript modules with tsc, then copies the static assets beside them.
//
// The upload set is an allowlist rather than an ignore list. The repository root
// holds credentials (.secrets/), test fixtures, and the 18MB source photograph
// that the site never requests, so an ignore list that fell out of date would
// publish them. Only the compiled modules and the static files named here reach
// Cloudflare.
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");
export const dist = path.join(root, "dist");

// Reachable from index.html, the two study pages, and the WebGL viewer.
const staticFiles = [
  "index.html",
  "skyline-webgl.html",
  "skyline-study.html",
  "building-study.html",
  "skyline-animated.svg",
  "skyline-original-fit.svg",
  "stars.svg",
  "study.css",
  "vendor/three-r186.js",
  "vendor/THREE-LICENSE.txt",
];

// The TypeScript modules the pages load at runtime. Each is compiled in place
// with the same filename; removing or renaming one must fail the build rather
// than ship a site whose script tags point at nothing.
const compiledEntries = [
  "study-loader.ts",
  "study-viewer.ts",
  "skyline-study.ts",
  "skyline-comparison.ts",
  "building-study.ts",
];

// Top-level .ts files in models/ ship automatically as compiled .js, and their
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
    const directoryNames = await readdir(path.join(root, from));
    const matched = directoryNames.filter((name) => extensions.includes(path.extname(name)));
    if (!matched.length) throw new Error(`${from}/ has no ${extensions.join("/")} files to publish.`);
    const entries = matched.map((name) => `${from}/${name}`);
    if (target === "compiled") compiled.push(...entries);
    else staticSet.push(...entries);
  }
  return { static: staticSet, compiled };
}

// Every file dist/ will hold: the compiled module paths (one .js per .ts) and the
// static assets. scripts/verify-deploy.ts derives the published set the same way.
export async function publishedFiles(): Promise<string[]> {
  const { static: staticSet, compiled } = await sourceEntries();
  return [...compiled.map((entry) => entry.replace(/\.ts$/, ".js")), ...staticSet].sort();
}

// Compiles the browser module graph into dist/, keeping each module's relative
// path and name so the existing script tags load unchanged.
export async function compileBrowser() {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const tsc = path.join(root, "node_modules/typescript/bin/tsc");
  const { stdout, stderr } = await run(process.execPath, [tsc, "-p", path.join(root, "tsconfig.build.json")], { cwd: root, maxBuffer: 1 << 24 });
  if (stdout) console.log(stdout.trim());
  if (stderr) throw new Error(stderr.trim());
}

export async function buildSite() {
  const { static: staticSet, compiled } = await sourceEntries();
  await rm(dist, { recursive: true, force: true });
  await compileBrowser();
  for (const entry of staticSet) {
    const target = path.join(dist, entry);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, entry), target);
  }
  const entries = [...compiled.map((entry) => entry.replace(/\.ts$/, ".js")), ...staticSet];
  const sizes = await Promise.all(entries.map(async (entry) => {
    try {
      return (await stat(path.join(dist, entry))).size;
    } catch {
      throw new Error(`Cannot publish ${entry}: the build did not produce it. Update scripts/build-site.ts if it was renamed.`);
    }
  }));
  const bytes = sizes.reduce((total, size) => total + size, 0);
  console.log(`Built ${compiled.length} modules and staged ${staticSet.length} static files (${(bytes / 1024 / 1024).toFixed(2)} MB) into dist/.`);
  return entries;
}

if (import.meta.main) buildSite().catch((error) => { console.error(error.message); process.exitCode = 1; });
