// Signature policy adapted from tearleads' scripts/checks/checkCommitTrust.sh.
// Require signatures without requiring every contributor's key locally.
import { execFileSync } from "node:child_process";

type Runner = (file: string, args: string[]) => string;
const command: Runner = (file, args) => execFileSync(file, args, {
  encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
});

export function checkSignedCommits(args: string[], run: Runner = command): string | null {
  if (args[0] !== "--range" || args.length < 2 || !args[1]) {
    throw new Error("Usage: bun scripts/check-signed-commits.ts --range <rev-range...>");
  }
  // No subjects or bodies: commit messages cannot inject signature records.
  const log = run("git", ["log", "--format=%H %G?", ...args.slice(1)]);
  const failures: string[] = [];
  for (const line of log.trim().split("\n").filter(Boolean)) {
    const match = /^([a-f0-9]{40,64}) ([GBUXYREN])$/.exec(line);
    if (!match) throw new Error(`Unexpected signature record: ${line}`);
    const [, commit, status] = match;
    if (status === "N" || status === "B") {
      failures.push(`  ${commit}: missing or invalid signature (status: ${status})`);
    }
  }
  return failures.length ? [
    "Error: pushed commits have a missing or invalid signature:", ...failures,
    "Sign HEAD with 'git commit --amend -S --no-edit', or rewrite older commits",
    "with 'git rebase --gpg-sign <base>', then push again.",
  ].join("\n") : null;
}

if (import.meta.main) {
  try {
    const failure = checkSignedCommits(process.argv.slice(2));
    if (failure) { console.error(failure); process.exitCode = 1; }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
