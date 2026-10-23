import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const agentTool = path.join(root, "node_modules/@a2f0/agent-tool/src/index.ts");
export type Runner = (file: string, args: string[]) => string;
const command: Runner = (file, args) => {
  if (file === process.execPath) {
    execFileSync(file, args, { cwd: root, stdio: "inherit" });
    return "";
  }
  return execFileSync(file, args, {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
};

export function mergeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const stderr = "stderr" in error && error.stderr != null ? String(error.stderr).trim() : "";
  return stderr || error.message;
}

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

/** Shared preflight/merge with Skyline's required landed-message verification. */
export function mergePr(args: string[], run: Runner = command): string {
  const [head, base, baseSha] = args as [string, string, string];
  if (args.length !== 3 || !/^[a-f0-9]{40}$/.test(head) || !base || !/^[a-f0-9]{40}$/.test(baseSha)) {
    throw new Error("Usage: bun scripts/git/merge-pr.ts reviewed-head-sha base-ref reviewed-base-sha");
  }
  const repo = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("Could not resolve the repository.");
  const branch = run("git", ["branch", "--show-current"]);
  if (!branch) throw new Error("Merge from an attached feature branch.");
  const readPr = (number?: number) => JSON.parse(run("gh", ["pr", "view", number ? String(number) : branch, "-R", repo, "--json",
    "number,title,state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,mergeable,mergeStateStatus,mergeCommit",
  ])) as PullRequest;
  const pr = readPr();
  // Shared preflight owns clean checkout, exact local/PR HEAD, live reviewed
  // base, ancestry, CI/readiness and package-version policy. Keep this directly
  // beside the mutation; Skyline additionally verifies the stored squash text.
  run(process.execPath, [agentTool, "pr", "preflight", head, base, baseSha]);
  run(process.execPath, [agentTool, "pr", "merge", pr.title, head, base]);
  const merged = readPr(pr.number);
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
    console.error(mergeErrorMessage(error));
    process.exitCode = 1;
  }
}
