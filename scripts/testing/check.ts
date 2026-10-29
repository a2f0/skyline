import { readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { startServer } from "../lib/static-server.js";
import { dist } from "../build/build-site.js";
import { appendRun, createTimings, logPath, stepTable } from "./timings.js";

const root = path.resolve(import.meta.dirname, "../..");
const agentTool = path.join(root, "node_modules/@a2f0/agent-tool/src/index.ts");
// Steps run side by side, so each command's output is held back and printed whole, under its
// step's label, when the command ends; streamed, their logs would interleave line by line.
function run(label: string, command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    const output: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => output.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      const text = Buffer.concat(output).toString().trimEnd();
      console.log(`── ${label}${code === 0 ? "" : " FAILED"}${text ? `\n${text}` : ""}`);
      code === 0 ? resolve() : reject(new Error(`${label} failed (${signal || code})`));
    });
  });
}

// Runs the work a few at a time, in order, and waits for all of it before failing, so one run
// reports every failure rather than the first.
async function pool(slots: number, work: (() => Promise<unknown>)[]) {
  const queue = [...work], failures: unknown[] = [];
  await Promise.all(Array.from({ length: slots }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await next().catch((error: unknown) => { failures.push(error); });
  }));
  if (failures.length) throw new Error(failures.map((error) => (error instanceof Error ? error.message : String(error))).join("\n"));
}

const timings = createTimings();
const step = (label: string, args: string[], env?: NodeJS.ProcessEnv) => timings.run(label, () => run(label, process.execPath, args, env));

// Every suite, longest first, so the slowest is not left to start last. Each is its own
// `bun test` process, so a failure names its file. A browser suite keeps about two cores busy
// between Chrome's processes and its own, and starting them all at once slows every suite
// enough to time tests out, so as many run at once as the machine has pairs of cores. CI's
// Chrome draws WebGL in software, more than ten times slower, where some tests come within a
// minute of their timeouts alone and two suites at once on a four-core runner pass them, so
// on CI (GitHub Actions sets CI=true) suites run one at a time.
const suites = [
  "package.test.ts", "skyline-3d.test.ts", "skyline-3d-lighting.test.ts", "building-detail.test.ts",
  "building-kit.test.ts", "skyline-geography.test.ts", "skyline-study.test.ts", "click-tracking.test.ts",
  "git-hooks.test.ts", "building-hover.test.ts", "building-study.test.ts", "colour-materials.test.ts",
  "chrome.test.ts", "indexed-raycast.test.ts", "dependency-runtime.test.ts", "secrets.test.ts",
  "celebration-lighting.test.ts", "panorama-owners.test.ts", "grayscale.test.ts", "skyline-loading.test.ts",
  "time-of-day.test.ts", "verify-deploy.test.ts", "colour-shade.test.ts", "merge-pr.test.ts", "npm-publish.test.ts",
  "timings.test.ts", "check-coauthors.test.ts", "building-fidelity-skill.test.ts", "favicons.test.ts",
  "search-indexing.test.ts", "module-graph.test.ts",
];
const slots = process.env["CI"] === "true" ? 1 : Math.max(2, Math.floor(os.availableParallelism() / 2));

async function main() {
  const baseSha = process.env["SKYLINE_BASE_SHA"];
  if (baseSha && !/^[a-f0-9]{40}$/.test(baseSha)) throw new Error("SKYLINE_BASE_SHA must be a full commit SHA.");
  // A suite left off the list would never run.
  const unlisted = readdirSync(path.join(root, "tests")).filter((file) => file.endsWith(".test.ts") && !suites.includes(file));
  if (unlisted.length) throw new Error(`scripts/testing/check.ts does not run ${unlisted.join(", ")}; add it to the suites.`);
  // The repository checks come first and in order: each takes about a second at most, and a
  // run whose types or tools are wrong has no suite result worth waiting for.
  await timings.run("whitespace", async () => {
    await run("whitespace", "git", ["diff", "--check"]);
    await run("whitespace", "git", ["diff", "--cached", "--check"]);
    if (baseSha) await run("whitespace", "git", ["diff", "--check", `${baseSha}...HEAD`]);
  });
  await step("agents:check", ["run", "agents:check"]);
  await step("agent-tool:config", [agentTool, "config", "show"]);
  if (process.env["CI"] !== "true") {
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
    if (branch) await step("lint:branch-name", ["run", "lint:branch-name", branch]);
  }
  await step("audit", ["audit"]);
  // The strictest-config typecheck over the whole repository.
  await step("typecheck", [path.join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"]);
  await step("vendor:three", ["scripts/build/vendor-three.ts", "--check"]);
  await step("reference-svg", ["scripts/fidelity/reference-svg.ts", "--check"]);
  await step("skyline-loading", ["scripts/checks/skyline-loading.ts", "--check"]);
  // Building the package builds the site into dist/ on its way to lib/ and site/. It is built
  // once, here, and the package suite told so: rebuilding dist/ itself, it would pull the
  // site from under the browser suites running beside it.
  await step("build:package", ["scripts/build/build-package.ts"]);
  // The package's site build leaves out the favicons, which only the deployed site serves;
  // render them into dist/ so the suites see the pages as deployed.
  await step("favicons", [agentTool, "images", "build", "favicons", "--out", dist]);
  const server = await timings.run("serve:dist", () => startServer(dist));
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: server.origin, SKYLINE_PACKAGE_BUILT: "1" };
    await pool(slots, suites.map((file) => () => step(`test:${path.basename(file, ".test.ts")}`, ["test", `tests/${file}`], env)));
  } finally {
    await timings.run("serve:stop", () => server.close());
  }
}

// The timings are recorded and printed whether the run passed or failed: a run
// that died is the one whose step breakdown is worth reading.
function report(failed: boolean) {
  let branch = "unknown", gitDir: string | null = null;
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    gitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    // A checkout without git still runs its checks; it just cannot label or
    // persist them. Losing the log must not turn a passing run into a failure,
    // and must not conjure a .git directory that makes an archive look like a
    // malformed repository.
  }
  const finished = timings.finish(branch, failed);
  console.log(`\n${stepTable(finished)}`);
  if (!gitDir) return;
  try {
    appendRun(logPath(gitDir), finished);
  } catch (error) {
    console.error(`Could not record timings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().then(() => report(false), (error) => {
  // A run can die outside a timed step, so the failure is passed in rather than
  // inferred from the rows.
  report(true);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
