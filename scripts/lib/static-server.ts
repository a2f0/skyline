// A temporary static server over a checkout, shared by the check runner and the dev
// scripts. It listens on a free local port and serves files unchanged.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const types: Record<string, string> = { ".html": "text/html", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };

export async function startServer(root: string): Promise<{ origin: string; close(): Promise<void> }> {
  const base = path.resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url!, "http://localhost").pathname);
      const filename = path.resolve(base, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!filename.startsWith(`${base}${path.sep}`)) { response.writeHead(403).end(); return; }
      const body = await readFile(filename);
      response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve, reject) => { server.on("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
