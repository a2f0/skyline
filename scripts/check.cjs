const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".svg": "image/svg+xml", ".js": "text/javascript", ".jpg": "image/jpeg" };
function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal || code})`)));
  });
}

async function main() {
  await run("git", ["diff", "--check"]);
  await run(process.execPath, ["tests/squash-merge.cjs"]);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const filename = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
      const body = await readFile(filename);
      response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.on("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const env = { ...process.env, SKYLINE_TEST_URL: `http://127.0.0.1:${server.address().port}` };
    await run(process.execPath, ["tests/building-hover.cjs"], env);
    await run(process.execPath, ["tests/building-study.cjs"], env);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
