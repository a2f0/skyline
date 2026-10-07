// Refresh the browser engine from this repository's exact Three.js/esbuild pins.
import path from "node:path";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const vendor = path.join(root, "src/vendor");
const args = process.argv.slice(2);
const check = args.length === 1 && args[0] === "--check";
if (args.length && !check) throw new Error("Usage: bun scripts/vendor-three.ts [--check]");
const bundle = path.join(vendor, "three-r186.js");
const installedLicense = path.join(root, "node_modules/three/LICENSE");
const license = path.join(vendor, "THREE-LICENSE.txt");

const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/vendor/three-entry.js"],
  bundle: true,
  format: "esm",
  minify: true,
  legalComments: "inline",
  outfile: bundle,
  write: false,
});
const output = result.outputFiles?.find(file => file.path === bundle);
if (!output) throw new Error("Three.js build produced no browser bundle.");
if (check) {
  if (!Buffer.from(output.contents).equals(await readFile(bundle)) ||
      !(await readFile(installedLicense)).equals(await readFile(license))) {
    throw new Error("Vendored Three.js or its license differs from the locked dependencies; run bun run vendor:three.");
  }
  console.log("Vendored Three.js and its license match the locked dependencies.");
} else {
  await writeFile(bundle, output.contents);
  await copyFile(installedLicense, license);
  console.log("Refreshed the vendored r186 browser bundle and Three.js license.");
}
