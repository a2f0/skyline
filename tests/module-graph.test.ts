// No module imports itself, directly or around a chain of others, type-only imports included:
// a cycle tangles the layers apart, and a value cycle can run a module before the one it
// needs has initialized. Shared names belong in a lower module both sides import, as
// src/models/material-names.ts does for the colour trial.
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const scanned = ["src", "scripts", "tests"];
const ignored = new Set(["vendor", "fixtures", "node_modules"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return ignored.has(name) ? [] : sources(file);
    return /\.ts$/.test(name) && !name.endsWith(".d.ts") ? [file] : [];
  });
}

// A module's static relative imports and re-exports, `import type` included, resolved from the
// `.js` specifiers tsc keeps to the sources beside them. Comments are dropped first so that
// prose naming a module is no edge; dynamic `import()` loads lazily and is none either.
function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const specifiers = [...text.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/gm), ...text.matchAll(/^\s*import\s*["'](\.{1,2}\/[^"']+)["']/gm)].map((match) => match[1]!);
  return [...new Set(specifiers.map((specifier) => path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts"))))].filter((target) => existsSync(target));
}

// Every cycle's modules, by depth-first search, each reported once from where it was entered.
function cyclesOf(files: readonly string[], edges: (file: string) => readonly string[]): string[][] {
  const state = new Map<string, "open" | "done">(), stack: string[] = [], cycles: string[][] = [];
  const visit = (file: string) => {
    state.set(file, "open");
    stack.push(file);
    for (const next of edges(file)) {
      if (state.get(next) === "open") cycles.push([...stack.slice(stack.indexOf(next)), next]);
      else if (!state.has(next)) visit(next);
    }
    stack.pop();
    state.set(file, "done");
  };
  for (const file of files) if (!state.has(file)) visit(file);
  return cycles;
}

test("no source module imports itself around a cycle", () => {
  const files = scanned.flatMap((dir) => sources(path.join(root, dir)));
  const graph = new Map(files.map((file) => [file, importsOf(file)]));
  expect(graph.size).toBeGreaterThan(100);
  // Scanning really finds imports: the colour trial's layer imports its palette.
  expect(graph.get(path.join(root, "src/models/colour-materials.ts"))).toContain(path.join(root, "src/models/colour-palette.ts"));
  const cycles = cyclesOf(files, (file) => graph.get(file) ?? []).map((cycle) => cycle.map((file) => path.relative(root, file)).join(" -> "));
  expect(cycles).toEqual([]);
});

// The layers docs/development.md describes: the site and package modules never reach into the
// repository's scripts or tests, and the models depend only on each other, the vendored engine
// and the shared study types, never on a viewer, page or scene module.
test("source modules import only from their own layer or below", () => {
  const files = ["src", "src/models"].flatMap((dir) => readdirSync(path.join(root, dir)).filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts")).map((name) => path.join(root, dir, name)));
  const allowed = (file: string, target: string) => {
    const relative = path.relative(root, target);
    if (path.dirname(file) === path.join(root, "src/models")) return relative.startsWith("src/models/") || relative.startsWith("src/vendor/") || relative === "src/study-types.ts";
    return relative.startsWith("src/");
  };
  const violations = files.flatMap((file) => importsOf(file).filter((target) => !allowed(file, target)).map((target) => `${path.relative(root, file)} -> ${path.relative(root, target)}`));
  expect(violations).toEqual([]);
});

test("cycle detection finds direct, indirect and self cycles", () => {
  const graph: Record<string, string[]> = { a: ["b"], b: ["c"], c: ["a"], d: ["d"], e: ["a"] };
  expect(cyclesOf(Object.keys(graph), (file) => graph[file] ?? [])).toEqual([["a", "b", "c", "a"], ["d", "d"]]);
});
