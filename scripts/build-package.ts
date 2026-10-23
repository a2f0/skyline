// Public compatibility entrypoint for existing GitHub-source postinstall scripts.
// Repository package scripts use scripts/build/build-package.ts.
import { buildPackage } from "./build/build-package.js";
export { buildPackage, shareHostEngine } from "./build/build-package.js";

if (import.meta.main) buildPackage().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
