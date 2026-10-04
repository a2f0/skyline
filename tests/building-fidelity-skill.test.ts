import { expect, test } from "bun:test";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

test("ships identical regular-file building-fidelity skills to both agents", () => {
  const roots = [".agents", ".claude"].map((agent) => path.resolve(import.meta.dirname, "..", agent, "skills/building-fidelity"));
  const snapshots = roots.map((root) => {
    const files: Record<string, Buffer> = {};
    for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" }).sort()) {
      const file = path.join(root, entry), stat = lstatSync(file);
      expect(stat.isSymbolicLink(), `${file} is a regular Skyline-owned copy`).toBe(false);
      if (stat.isFile()) files[entry] = readFileSync(file);
    }
    expect(files["SKILL.md"]).toBeDefined();
    expect(files[path.join("agents", "openai.yaml")]).toBeDefined();
    return files;
  });
  expect(snapshots[0]).toEqual(snapshots[1]);
});
