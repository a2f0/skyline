// Git hooks export variables that can override a child's working directory or index.
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function checkoutGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const localVars = execFileSync("git", ["rev-parse", "--local-env-vars"], { encoding: "utf8" });
  for (const name of localVars.trim().split("\n")) delete env[name];
  return env;
}

export function checkoutGitOptions(cwd: string) {
  const options = { cwd, env: checkoutGitEnv(), encoding: "utf8" } as const;
  const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], options).replace(/\n$/, "");
  if (gitRoot !== realpathSync(cwd)) throw new Error(`${cwd} must be the root of the Skyline checkout.`);
  return options;
}
