// Prints the step timings the check runner recorded. `ship-pr` calls this when
// it finishes, because a shipping run drives the checks several times — once as
// preflight and again after every review repair — and the cost of that loop is
// the slowest thing between finishing work and a merged PR.
//
//   bun scripts/show-timings.ts [--branch <name>] [--all]
//
// Defaults to the current branch. --all ignores the branch, for comparing a
// run against one made elsewhere.
import { execFileSync } from "node:child_process";
import { logPath, readRuns, runTable, stepTable } from "./lib/timings.js";
import type { Run } from "./lib/timings.js";

export function summarise(runs: Run[]): string {
  if (!runs.length) return "No check timings recorded yet. Run `bun run check`.";
  const latest = runs[runs.length - 1]!;
  const sections = [stepTable(latest)];
  // One run needs no comparison against itself, and the step table already
  // carries its total.
  if (runs.length > 1) sections.push("", `${runs.length} check runs:`, runTable(runs));
  return sections.join("\n");
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    const all = args.includes("--all");
    const flagged = args.indexOf("--branch");
    const gitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
    const branch = flagged >= 0 ? args[flagged + 1] : execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
    if (flagged >= 0 && !branch) throw new Error("Usage: bun scripts/show-timings.ts [--branch <name>] [--all]");
    const runs = readRuns(logPath(gitDir));
    console.log(summarise(all ? runs : runs.filter((run) => run.branch === branch)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
