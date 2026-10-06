import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { decidePublish, parseRegistryState } from "../scripts/npm-publish-decision.js";

const root = path.resolve(import.meta.dirname, "..");
const state = { latest: "0.2.0", versions: ["0.1.0", "0.1.1", "0.2.0"] };

describe("npm publish decision", () => {
  test("publishes only a version newer than npm's latest", () => {
    expect(decidePublish("0.2.1", state)).toEqual({ publish: true, reason: "0.2.1 is newer than npm's latest (0.2.0)" });
    expect(decidePublish("1.0.0", state).publish).toBe(true);
    expect(decidePublish("0.2.0", state)).toEqual({ publish: false, reason: "0.2.0 is already on npm" });
    expect(decidePublish("0.1.5", state)).toEqual({ publish: false, reason: "0.1.5 is not newer than npm's latest (0.2.0)" });
  });

  test("never republishes an existing version, even one newer than latest", () => {
    expect(decidePublish("0.3.0", { latest: "0.2.0", versions: ["0.2.0", "0.3.0"] }).publish).toBe(false);
  });

  test("rejects versions npm cannot publish as latest", () => {
    for (const version of ["1.0", "v1.0.0", "", "1.0.0.0", "01.0.0", "1.0.0-rc.1", "1.0.0+build"]) {
      expect(() => decidePublish(version, state)).toThrow("invalid package version");
    }
  });

  test("reads npm view output, including a single version printed as a string", () => {
    expect(parseRegistryState('{"versions":["0.1.0","0.2.0"],"dist-tags":{"latest":"0.2.0"}}')).toEqual({ latest: "0.2.0", versions: ["0.1.0", "0.2.0"] });
    expect(parseRegistryState('{"versions":"0.1.0","dist-tags":{"latest":"0.1.0"}}')).toEqual({ latest: "0.1.0", versions: ["0.1.0"] });
  });

  test("fails for an unpublished package and for unexpected output", () => {
    expect(() => parseRegistryState('{"error":{"code":"E404","summary":"Not Found"}}')).toThrow("publish its first version by hand");
    for (const json of ['{"versions":[]}', '{"versions":[1],"dist-tags":{"latest":"1"}}', '{"error":{"code":"E500"}}']) {
      expect(() => parseRegistryState(json)).toThrow("unexpected npm view output");
    }
  });
});

interface Step { uses?: string; run?: string; with?: Record<string, unknown> }
interface Job { permissions?: Record<string, string>; environment?: string; steps: Step[] }
interface Workflow { permissions: Record<string, string>; jobs: Record<string, Job> }

describe("the publish workflow", () => {
  const workflow = Bun.YAML.parse(readFileSync(path.join(root, ".github/workflows/npm-publish.yml"), "utf8")) as Workflow;
  const { check, publish } = workflow.jobs as { check: Job; publish: Job };

  test("gives only the publish job, in the npm environment, the token npm accepts", () => {
    expect(workflow.permissions).toEqual({});
    expect(check.permissions).toEqual({ contents: "read" });
    expect(publish.permissions).toEqual({ "id-token": "write" });
    expect(publish.environment).toBe("npm");
  });

  test("publishes the checked tarball without running repository code", () => {
    // The trusted publisher's token must never be reachable from a checkout,
    // an install, or a package script. Without ./, npm reads the tarball path
    // as a GitHub owner/repo shorthand and tries to clone it.
    expect(publish.steps.map((step) => step.uses?.replace(/@.*/, "") ?? step.run)).toEqual([
      "actions/download-artifact", "actions/setup-node", "npm publish ./package/*.tgz --ignore-scripts",
    ]);
  });

  test("builds with the Bun version mise.toml pins", () => {
    const pinned = /^bun = "([^"]+)"$/m.exec(readFileSync(path.join(root, "mise.toml"), "utf8"))?.[1];
    const setup = check.steps.find((step) => step.uses?.startsWith("oven-sh/setup-bun@"));
    expect(pinned).toBeDefined();
    expect(setup?.with?.["bun-version"]).toBe(pinned);
  });
});
