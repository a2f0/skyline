const path = require("node:path");
const { spawn } = require("node:child_process");
const { startServer } = require("./lib/static-server.cjs");

const root = path.resolve(__dirname, "..");
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
  await run(process.execPath, ["tests/squash-merge.cjs"]);
  await run(process.execPath, ["tests/verify-deploy.cjs"]);
  await run(process.execPath, ["scripts/reference-svg.cjs", "--check"]);
  await run(process.execPath, ["tests/building-kit.cjs"]);
  const server = await startServer(root);
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: server.origin };
    await run(process.execPath, ["tests/building-hover.cjs"], env);
    await run(process.execPath, ["tests/building-study.cjs"], env);
    await run(process.execPath, ["tests/skyline-study.cjs"], env);
    await run(process.execPath, ["tests/skyline-geography.cjs"], env);
  } finally {
    await server.close();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
