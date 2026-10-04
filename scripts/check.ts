import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { startServer } from "./lib/static-server.js";
import { buildSite, dist } from "./build-site.js";
import { appendRun, createTimings, logPath, stepTable } from "./lib/timings.js";

const root = path.resolve(import.meta.dirname, "..");
function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal || code})`)));
  });
}

const timings = createTimings();
// The label a step is timed under. Suites keep their file's own name so a slow
// row points straight at the file to run on its own.
const suite = (file: string) => timings.run(`test:${path.basename(file, ".test.ts")}`, () => run(process.execPath, ["test", `tests/${file}`]));

async function main() {
  const baseSha = process.env["SKYLINE_BASE_SHA"];
  if (baseSha && !/^[a-f0-9]{40}$/.test(baseSha)) throw new Error("SKYLINE_BASE_SHA must be a full commit SHA.");
  await timings.run("whitespace", async () => {
    await run("git", ["diff", "--check"]);
    await run("git", ["diff", "--cached", "--check"]);
    if (baseSha) await run("git", ["diff", "--check", `${baseSha}...HEAD`]);
  });
  await timings.run("agents:check", () => run(process.execPath, ["run", "agents:check"]));
  await timings.run("agent-tool:config", () => run(process.execPath, [path.join(root, "node_modules/agent-tool/src/index.ts"), "config", "show"]));
  // The strictest-config typecheck over the whole repository.
  await timings.run("typecheck", () => run(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"]));
  await suite("check-coauthors.test.ts");
  await suite("git-hooks.test.ts");
  await suite("timings.test.ts");
  await suite("building-fidelity-skill.test.ts");
  await suite("merge-pr.test.ts");
  await suite("verify-deploy.test.ts");
  await suite("grayscale.test.ts");
  await timings.run("reference-svg", () => run(process.execPath, ["scripts/reference-svg.ts", "--check"]));
  await timings.run("skyline-loading", () => run(process.execPath, ["scripts/skyline-loading.ts", "--check"]));
  await suite("skyline-loading.test.ts");
  await suite("building-kit.test.ts");
  await suite("celebration-lighting.test.ts");
  await suite("package.test.ts");
  // The browser suites exercise the compiled site: build first, then serve dist/.
  await timings.run("build:site", () => buildSite().then(() => undefined));
  const server = await timings.run("serve:dist", () => startServer(dist));
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: server.origin };
    const browserSuite = (file: string) => timings.run(`test:${path.basename(file, ".test.ts")}`, () => run(process.execPath, ["test", `tests/${file}`], env));
    await browserSuite("building-hover.test.ts");
    await browserSuite("building-study.test.ts");
    await browserSuite("building-detail.test.ts");
    await browserSuite("skyline-study.test.ts");
    await browserSuite("skyline-geography.test.ts");
    await browserSuite("skyline-3d.test.ts");
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
