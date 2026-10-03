import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
export type Runner = (file: string, args: string[]) => string;
const command: Runner = (file, args) => execFileSync(file, args, {
  cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}).trim();

interface PullRequest {
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  baseRefOid: string;
  mergeable: string;
  mergeStateStatus: string;
  mergeCommit: { oid: string } | null;
}

/** Skyline's checkout/base guards; agent-tool owns CI and the merge mutation. */
export function mergePr(args: string[], run: Runner = command): string {
  const [head, base, baseSha] = args as [string, string, string];
  if (args.length !== 3 || !/^[a-f0-9]{40}$/.test(head) || !base || !/^[a-f0-9]{40}$/.test(baseSha)) {
    throw new Error("Usage: bun scripts/merge-pr.ts reviewed-head-sha base-ref reviewed-base-sha");
  }
  run("git", ["check-ref-format", `refs/heads/${base}`]);
  const cleanHead = () => {
    if (run("git", ["status", "--porcelain"])) throw new Error("Worktree is dirty; commit and review first.");
    if (run("git", ["rev-parse", "HEAD"]) !== head) throw new Error("Local HEAD changed; re-review required.");
  };
  cleanHead();
  run("git", ["merge-base", "--is-ancestor", baseSha, head]);
  const branch = run("git", ["branch", "--show-current"]);
  if (!branch || branch === base) throw new Error("Merge from the reviewed feature branch.");
  const repo = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("Could not resolve the repository.");
  const readPr = () => JSON.parse(run("gh", ["pr", "view", branch, "-R", repo, "--json",
    "number,title,state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,mergeable,mergeStateStatus,mergeCommit",
  ])) as PullRequest;
  const pr = readPr();
  if (pr.state !== "OPEN" || pr.isDraft || pr.headRefName !== branch || pr.headRefOid !== head) {
    throw new Error("PR is not open at the reviewed feature HEAD.");
  }
  if (pr.baseRefName !== base || pr.baseRefOid !== baseSha) throw new Error("PR base changed; synchronize and re-review.");
  if (pr.mergeable !== "MERGEABLE" || pr.mergeStateStatus !== "CLEAN") throw new Error("PR is not ready for immediate merge.");
  // This is a live API read, not a potentially stale remote-tracking ref.
  const liveBase = run("gh", ["api", `repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`, "--jq", ".object.sha"]);
  if (liveBase !== baseSha) throw new Error("Base advanced before merge; synchronize and re-review.");
  cleanHead();
  run(process.execPath, [path.join(root, "node_modules/agent-tool/src/index.ts"), "pr", "merge", pr.title, head, base]);
  const merged = readPr();
  if (merged.number !== pr.number || merged.headRefOid !== head || merged.state !== "MERGED" || !merged.mergeCommit?.oid) {
    throw new Error("GitHub did not confirm the reviewed PR merged; inspect before cleanup.");
  }
  const message = run("gh", ["api", `repos/${repo}/commits/${merged.mergeCommit.oid}`, "--jq", ".commit.message"]);
  const expected = `${pr.title.replace(/ \(#\d+\)$/, "")} (#${pr.number})`;
  if (message.trimEnd() !== expected) throw new Error("Squash message differs from the subject-only title; inspect before cleanup.");
  return merged.mergeCommit.oid;
}

if (import.meta.main) {
  try { console.log(mergePr(process.argv.slice(2))); }
  catch (error) {
    console.error(error instanceof Error && "stderr" in error ? String(error.stderr).trim() || error.message : error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
