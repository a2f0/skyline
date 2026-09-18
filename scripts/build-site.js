// Stages the runtime site into dist/ for `wrangler deploy`.
//
// The upload set is an allowlist rather than an ignore list. The repository root
// holds credentials (.secrets/), test fixtures, and the 18MB source photograph
// that the site never requests, so an ignore list that fell out of date would
// publish them. Anything not named here does not reach Cloudflare.
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

// Reachable from index.html, the two study pages, and the WebGL viewer.
const files = [
  "index.html",
  "skyline-webgl.html",
  "skyline-study.html",
  "building-study.html",
  "skyline-animated.svg",
  "skyline-original-fit.svg",
  "stars.svg",
  "study.css",
  "study-loader.js",
  "study-viewer.js",
  "skyline-study.js",
  "skyline-comparison.js",
  "building-study.js",
  "vendor/three-r186.js",
  "vendor/THREE-LICENSE.txt",
];

// Top-level .js and .svg files in models/ ship automatically, so adding a model
// does not also mean editing this script. The scan is not recursive: nested
// directories and other file types need their own entry.
// three-entry.js is the bundle's build input and imports bare specifiers, so
// vendor/ stays on the explicit list above.
const directories = [{ from: "models", extensions: [".js", ".svg"] }];

async function collect() {
  const entries = [...files];
  for (const { from, extensions } of directories) {
    const names = await readdir(path.join(root, from));
    const matched = names.filter((name) => extensions.includes(path.extname(name)));
    if (!matched.length) throw new Error(`${from}/ has no ${extensions.join("/")} files to publish.`);
    entries.push(...matched.map((name) => `${from}/${name}`));
  }
  return entries;
}

async function main() {
  const entries = await collect();
  const sizes = await Promise.all(entries.map(async (entry) => {
    try {
      return (await stat(path.join(root, entry))).size;
    } catch {
      throw new Error(`Cannot publish ${entry}: it is missing. Update scripts/build-site.js if it was renamed.`);
    }
  }));
  await rm(dist, { recursive: true, force: true });
  for (const entry of entries) {
    const target = path.join(dist, entry);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, entry), target);
  }
  const bytes = sizes.reduce((total, size) => total + size, 0);
  console.log(`Staged ${entries.length} files (${(bytes / 1024 / 1024).toFixed(2)} MB) into dist/.`);
}

// scripts/verify-deploy.js reads the same allowlist, so the published set and the
// checked set cannot drift apart.
export { collect, root, dist };

if (import.meta.main) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
