// Git hooks export variables that can override a child's working directory or index.
import { execFileSync } from "node:child_process";

export function checkoutGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const localVars = execFileSync("git", ["rev-parse", "--local-env-vars"], { encoding: "utf8" });
  for (const name of localVars.trim().split("\n")) delete env[name];
  return env;
}
