// Decides whether the publish workflow releases package.json's version to npm,
// printing the reason and, under GitHub Actions, setting the step's `publish`
// output. Adapted from agent-tool's scripts/npm-publish-decision.ts.
//
//   bun scripts/npm-publish-decision.ts
//
// Only a version newer than npm's latest publishes, so a merge that keeps the
// version, a re-run, and a run that finishes after a newer release all succeed
// without publishing, and the latest tag never moves backwards.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const registry = "https://registry.npmjs.org";

/** Every version npm has for the package, and its latest tag. */
export interface RegistryState {
  latest: string;
  versions: string[];
}

export interface PublishDecision {
  publish: boolean;
  reason: string;
}

// Plain major.minor.patch, as ship-pr bumps; a prerelease published without a
// dist-tag would become npm's latest. Bun's semver also accepts "1.0".
const versionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function decidePublish(version: string, state: RegistryState): PublishDecision {
  if (!versionPattern.test(version)) throw new Error(`invalid package version: ${JSON.stringify(version)}`);
  if (state.versions.includes(version)) return { publish: false, reason: `${version} is already on npm` };
  if (Bun.semver.order(version, state.latest) <= 0) {
    return { publish: false, reason: `${version} is not newer than npm's latest (${state.latest})` };
  }
  return { publish: true, reason: `${version} is newer than npm's latest (${state.latest})` };
}

const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

/**
 * Parses `npm view <name> versions dist-tags --json`, which prints versions as
 * a string rather than an array when only one exists. A package npm does not
 * have yet fails: npm adds a trusted publisher only to an existing package, so
 * its first version is published by hand.
 */
export function parseRegistryState(json: string): RegistryState {
  const view: unknown = JSON.parse(json);
  if (field(field(view, "error"), "code") === "E404") {
    throw new Error("the package is not on npm yet; publish its first version by hand, then add the trusted publisher");
  }
  const versions = field(view, "versions");
  const latest = field(field(view, "dist-tags"), "latest");
  const list: unknown = typeof versions === "string" ? [versions] : versions;
  if (typeof latest !== "string" || !Array.isArray(list) || !list.every((version) => typeof version === "string")) {
    throw new Error(`unexpected npm view output: ${json}`);
  }
  return { latest, versions: list };
}

function readRegistryState(name: string): RegistryState {
  // A scope registry in the runner's npm config overrides --registry, so the
  // scope is pinned as well.
  const result = spawnSync("npm", [
    "view", name, "versions", "dist-tags", "--json",
    "--registry", registry, `--${name.split("/")[0]}:registry=${registry}`,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (result.error) throw result.error;
  // A failed view, including a missing package, still prints a JSON error.
  const state = result.stdout.trim() ? parseRegistryState(result.stdout) : null;
  if (result.status !== 0 || !state) throw new Error(`npm view ${name} exited with ${result.status}`);
  return state;
}

if (import.meta.main) {
  try {
    const metadata: unknown = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
    const name = field(metadata, "name"), version = field(metadata, "version");
    if (typeof name !== "string" || typeof version !== "string") throw new Error("package.json needs a name and a version.");
    const decision = decidePublish(version, readRegistryState(name));
    console.log(decision.publish ? `Publishing ${name}: ${decision.reason}.` : `::notice::Not publishing ${name}: ${decision.reason}.`);
    const output = process.env["GITHUB_OUTPUT"];
    if (output) appendFileSync(output, `publish=${decision.publish}\n`);
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
