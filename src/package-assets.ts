import { cp, mkdir } from "node:fs/promises";

/**
 * Copies the viewer's complete asset directory into a host application's static
 * directory. This module is for Node/Bun build scripts, never browser entrypoints.
 */
export async function copySkylineAssets(destination: string | URL): Promise<void> {
  await mkdir(destination, { recursive: true });
  await cp(new URL("../site/", import.meta.url), destination, { recursive: true });
}
