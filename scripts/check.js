import path from "node:path";
import { spawn } from "node:child_process";
import { startServer } from "./lib/static-server.js";

const root = path.resolve(import.meta.dirname, "..");
function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal || code})`)));
  });
}

async function main() {
  const baseSha = process.env.SKYLINE_BASE_SHA;
  if (baseSha && !/^[a-f0-9]{40}$/.test(baseSha)) throw new Error("SKYLINE_BASE_SHA must be a full commit SHA.");
  await run("git", ["diff", "--check"]);
  await run("git", ["diff", "--cached", "--check"]);
  if (baseSha) await run("git", ["diff", "--check", `${baseSha}...HEAD`]);
  await run(process.execPath, ["test", "tests/squash-merge.test.js"]);
  await run(process.execPath, ["test", "tests/verify-deploy.test.js"]);
  await run(process.execPath, ["scripts/reference-svg.js", "--check"]);
  await run(process.execPath, ["test", "tests/building-kit.test.js"]);
  const server = await startServer(root);
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: server.origin };
    await run(process.execPath, ["test", "tests/building-hover.test.js"], env);
    await run(process.execPath, ["test", "tests/building-study.test.js"], env);
    await run(process.execPath, ["test", "tests/skyline-study.test.js"], env);
    await run(process.execPath, ["test", "tests/skyline-geography.test.js"], env);
  } finally {
    await server.close();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
