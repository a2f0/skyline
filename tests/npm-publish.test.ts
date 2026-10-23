import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
interface Step { uses?: string; run?: string; with?: Record<string, unknown> }
interface Job { permissions?: Record<string, string>; environment?: string; needs?: string; if?: string; steps: Step[] }
interface Workflow { permissions: Record<string, string>; concurrency: { group: string; "cancel-in-progress": boolean }; jobs: Record<string, Job> }

describe("the publish workflow", () => {
  const workflow = Bun.YAML.parse(readFileSync(path.join(root, ".github/workflows/npm-publish.yml"), "utf8")) as Workflow;
  const { test: tests, pack, publish } = workflow.jobs as { test: Job; pack: Job; publish: Job };

  test("gives only the publish job, in the npm environment, the token npm accepts", () => {
    expect(workflow.permissions).toEqual({});
    expect(Object.keys(workflow.jobs)).toEqual(["test", "pack", "publish"]);
    expect(tests.permissions).toEqual({ contents: "read" });
    expect(pack.permissions).toEqual({ contents: "read" });
    expect(publish.permissions).toEqual({ "id-token": "write" });
    expect(publish.environment).toBe("npm");
  });

  test("runs the full suite before packing, and packs only on main", () => {
    expect(tests.if).toBeUndefined();
    expect(tests.steps.map((step) => step.run).filter(Boolean)).toEqual([
      "bun install --frozen-lockfile --ignore-scripts", 'bun run lint:branch-name "$GITHUB_REF_NAME"', "bun run check", "bun run check:package",
    ]);
    expect(pack.needs).toBe("test");
    expect(pack.if).toBe("github.ref == 'refs/heads/main'");
    expect(publish.needs).toBe("pack");
    expect(publish.if).toBe("needs.pack.outputs.publish == 'true'");
  });

  test("installs the pinned shared release planner before deciding whether to pack", () => {
    const runs = pack.steps.map((step) => step.run).filter(Boolean);
    expect(runs[0]).toBe("bun install --frozen-lockfile --ignore-scripts");
    expect(runs[1]).toBe("bun run release:plan");
  });

  test("queues runs per ref, so a branch's test run never displaces a pending publish", () => {
    expect(workflow.concurrency).toEqual({ group: "${{ github.workflow }}-${{ github.ref }}", "cancel-in-progress": false });
  });

  test("publishes the packed tarball without running repository code", () => {
    // The trusted publisher's token must never be reachable from a checkout,
    // an install, or a package script. Without ./, npm reads the tarball path
    // as a GitHub owner/repo shorthand and tries to clone it.
    expect(publish.steps.map((step) => step.uses?.replace(/@.*/, "") ?? step.run)).toEqual([
      "actions/download-artifact", "actions/setup-node", "npm publish ./package/*.tgz --ignore-scripts",
    ]);
  });

  test("builds with the runtime versions mise.toml pins", () => {
    const pins = Bun.TOML.parse(readFileSync(path.join(root, "mise.toml"), "utf8")) as { tools: { bun: string; node: string } };
    for (const job of [tests, pack]) {
      const setup = job.steps.find((step) => step.uses?.startsWith("jdx/mise-action@"));
      expect(setup?.with?.["install_args"]).toBe("bun node");
    }
    const packTools = pack.steps.find((step) => step.uses?.startsWith("jdx/mise-action@"));
    expect(packTools?.with?.["cache"]).toBe(false);
    const publisher = publish.steps.find((step) => step.uses?.startsWith("actions/setup-node@"));
    expect(publisher?.with?.["node-version"]).toBe(pins.tools.node);
    const metadata = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { packageManager: string };
    expect(metadata.packageManager).toBe(`bun@${pins.tools.bun}`);
  });

  test("also tests the packed library on its declared Node support floor", () => {
    const metadata = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { engines: { node: string } };
    const index = tests.steps.findIndex((step) => step.run === "bun run check:package");
    expect(index).toBeGreaterThan(0);
    const setup = tests.steps[index - 1];
    expect(setup?.uses).toStartWith("actions/setup-node@");
    const version = String(setup?.with?.["node-version"]);
    const major = /^>=([0-9]+)/.exec(metadata.engines.node)?.[1];
    expect(major).toBeDefined();
    expect(version.split(".")[0]).toBe(major!);
    expect(Bun.semver.satisfies(version, metadata.engines.node)).toBe(true);
  });
});
