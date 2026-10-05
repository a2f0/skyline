// The publishable package has two outputs: plain ESM/declarations for imports,
// and an isolated copy of the already-built static viewer for embedding. The
// standalone site continues to use its vendored Three.js; imported models use
// the consuming application's Three.js through a small forwarding module.
import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { buildSite, dist, root, src } from "./build-site.js";

export async function buildPackage() {
  const lib = path.join(root, "lib"), site = path.join(root, "site");
  await buildSite();
  await rm(lib, { recursive: true, force: true });
  await rm(site, { recursive: true, force: true });
  const compiler = path.join(path.dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin/tsc");
  execFileSync(process.execPath, [compiler, "-p", path.join(src, "tsconfig.package.json")], { cwd: root, stdio: "inherit" });
  await mkdir(path.join(lib, "vendor"), { recursive: true });
  // Preserve all source geometry and import paths while sharing the host's
  // engine. This is a new package shim, not a modification of the vendor bundle.
  const forwarding = 'export * from "three";\n';
  await writeFile(path.join(lib, "vendor/three-r186.js"), forwarding);
  await writeFile(path.join(lib, "vendor/three-r186.d.ts"), forwarding);
  await cp(dist, site, { recursive: true });
  console.log("Built package ESM and declarations in lib/, with viewer assets in site/.");
}

if (import.meta.main) buildPackage().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
