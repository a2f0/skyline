// Writes viewer-modules.json beside the viewer's compiled modules: every module the viewer
// loads to show its first frame, which the shell (src/skyline-shell.ts) asks the browser to
// fetch at once with modulepreload. Without it, each module is requested only once the one
// importing it has arrived, a chain seven requests deep, so the page waits on round trips
// rather than bandwidth.
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const VIEWER_MODULES = "viewer-modules.json";

// The viewer's module, and the scene's code, which it imports as soon as it mounts.
const entries = ["skyline-viewer.js", "skyline-3d.js"];
// The vendored engine in the package's assets, which its vendor/three-r186.js imports only when
// the host offers no Three.js of its own (build-package.ts).
const engine = "vendor/three-r186.bundle.js";

export interface ViewerModules {
  /** Paths within the assets, the scene's code first and in import order, the viewer's own module excluded. */
  modules: string[];
  /** The vendored engine to fetch when the host offers no Three.js, or null where the modules import it directly. */
  engine: string | null;
}

/**
 * The relative modules a compiled ES module imports statically: `import … from`, `export … from`
 * and bare `import "…"` statements, which start a line or follow a semicolon, over as many lines
 * as their names take. A dynamic `import("…")` is not followed.
 */
export function staticImports(source: string): string[] {
  const found: string[] = [];
  for (const [, specifier] of source.matchAll(/(?:^|;)\s*(?:import|export)\b(?:[^;"'`(]*?\bfrom)?\s*["'](\.{1,2}\/[^"']+)["']/gm)) found.push(specifier!);
  return found;
}

/** Every module reached from the entries through static imports, as paths within `directory`. */
export async function viewerModules(directory: string): Promise<ViewerModules> {
  const seen = new Set<string>();
  const walk = async (module: string) => {
    if (seen.has(module)) return;
    seen.add(module);
    const source = await readFile(path.join(directory, module), "utf8");
    for (const specifier of staticImports(source)) await walk(path.posix.join(path.posix.dirname(module), specifier));
  };
  for (const entry of entries) await walk(entry);
  seen.delete("skyline-viewer.js");
  const bundled = await stat(path.join(directory, engine)).then(() => true, () => false);
  return { modules: [...seen], engine: bundled ? engine : null };
}

export async function writeViewerModules(directory: string): Promise<ViewerModules> {
  const modules = await viewerModules(directory);
  await writeFile(path.join(directory, VIEWER_MODULES), `${JSON.stringify(modules, null, 2)}\n`);
  return modules;
}
