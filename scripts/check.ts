import path from "node:path";
import { spawn } from "node:child_process";
import { startServer } from "./lib/static-server.js";
import { buildSite, dist } from "./build-site.js";

const root = path.resolve(import.meta.dirname, "..");
function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal || code})`)));
  });
}

async function main() {
  const baseSha = process.env["SKYLINE_BASE_SHA"];
  if (baseSha && !/^[a-f0-9]{40}$/.test(baseSha)) throw new Error("SKYLINE_BASE_SHA must be a full commit SHA.");
  await run("git", ["diff", "--check"]);
  await run("git", ["diff", "--cached", "--check"]);
  if (baseSha) await run("git", ["diff", "--check", `${baseSha}...HEAD`]);
  // The strictest-config typecheck over the whole repository.
  await run(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"]);
  await run(process.execPath, ["test", "tests/squash-merge.test.ts"]);
  await run(process.execPath, ["test", "tests/verify-deploy.test.ts"]);
  await run(process.execPath, ["scripts/reference-svg.ts", "--check"]);
  await run(process.execPath, ["test", "tests/building-kit.test.ts"]);
  // The browser suites exercise the compiled site: build first, then serve dist/.
  await buildSite();
  const server = await startServer(dist);
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: server.origin };
    await run(process.execPath, ["test", "tests/building-hover.test.ts"], env);
    await run(process.execPath, ["test", "tests/building-study.test.ts"], env);
    await run(process.execPath, ["test", "tests/skyline-study.test.ts"], env);
    await run(process.execPath, ["test", "tests/skyline-geography.test.ts"], env);
  } finally {
    await server.close();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
