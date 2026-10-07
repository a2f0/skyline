// Refresh the browser engine from this repository's exact Three.js/esbuild pins.
import path from "node:path";
import { copyFile } from "node:fs/promises";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const vendor = path.join(root, "src/vendor");

await build({
  absWorkingDir: root,
  entryPoints: ["src/vendor/three-entry.js"],
  bundle: true,
  format: "esm",
  minify: true,
  legalComments: "inline",
  outfile: path.join(vendor, "three-r186.js"),
});
await copyFile(path.join(root, "node_modules/three/LICENSE"), path.join(vendor, "THREE-LICENSE.txt"));
console.log("Refreshed the vendored r186 browser bundle and Three.js license.");
