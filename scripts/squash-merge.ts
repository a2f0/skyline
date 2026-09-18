import { execFileSync } from "node:child_process";

const PR_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id url title state isDraft headRefOid baseRefName baseRefOid
      mergeable mergeStateStatus
      autoMergeRequest { enabledAt }
      mergeQueueEntry { id }
      commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
    }
  }
}`;

const MERGE_MUTATION = `mutation($input: MergePullRequestInput!) {
  mergePullRequest(input: $input) {
    pullRequest { url state mergeCommit { oid } }
  }
}`;

export type Runner = (file: string, args: string[], input?: string) => string;

function command(file: string, args: string[], input?: string) {
  return execFileSync(file, args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

export function squashMerge(args: string[], run: Runner = command) {
  const [repo, number, head, base, baseSha] = args as [string, string, string, string, string];
  if (args.length !== 5 || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[1-9]\d*$/.test(number)
      || !/^[a-f0-9]{40}$/.test(head) || !base || !/^[a-f0-9]{40}$/.test(baseSha)) {
    throw new Error("Usage: bun scripts/squash-merge.ts owner/repo number reviewed-head-sha base-ref reviewed-base-sha");
  }
  run("git", ["check-ref-format", `refs/heads/${base}`]);
  const checkCheckout = () => {
    if (run("git", ["status", "--porcelain"])) throw new Error("Worktree is dirty; commit and review intended changes first.");
    if (run("git", ["rev-parse", "HEAD"]) !== head) throw new Error("Local HEAD differs from reviewed head; re-review required.");
  };
  checkCheckout();
  run("git", ["merge-base", "--is-ancestor", baseSha, head]);
  const api = (query: string, variables: Record<string, unknown>) => {
    const response = JSON.parse(run("gh", ["api", "graphql", "--input", "-"], JSON.stringify({ query, variables }))) as {
      errors?: { message: string }[];
      data: Record<string, unknown>;
    };
    if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join("\n"));
    return response.data;
  };
  const [owner, name] = repo.split("/") as [string, string];
  const pr = (api(PR_QUERY, { owner, name, number: Number(number) }) as { repository?: { pullRequest?: PullRequest } }).repository?.pullRequest;
  if (!pr || pr.state !== "OPEN" || pr.isDraft) throw new Error("PR must be open and ready for review.");
  if (pr.headRefOid !== head) throw new Error("PR head differs from reviewed head; re-review required.");
  if (pr.baseRefName !== base || pr.baseRefOid !== baseSha) throw new Error("PR base changed; synchronize and re-review.");
  if (pr.autoMergeRequest || pr.mergeQueueEntry) throw new Error("PR has an automatic or queued merge; refusing to replace it.");
  if (pr.mergeable !== "MERGEABLE" || pr.mergeStateStatus !== "CLEAN") {
    throw new Error(`PR is not ready for immediate merge (${pr.mergeable}/${pr.mergeStateStatus}).`);
  }
  const checks = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup;
  if (checks && checks.state !== "SUCCESS") throw new Error(`PR checks have not passed (${checks.state}).`);
  if (!/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w./-]+\))?!?: \S[^\r\n]*$/.test(pr.title)) {
    throw new Error("PR title must be a single-line conventional-commit subject.");
  }
  const headline = `${pr.title.replace(/ \(#\d+\)$/, "")} (#${number})`;
  // Refresh immediately before the mutation. GitHub atomically binds only the
  // head; base freshness additionally depends on repository protection rules.
  const liveBase = JSON.parse(run("gh", ["api", `repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`])) as { object?: { sha?: string } };
  if (liveBase.object?.sha !== baseSha) throw new Error("Base advanced before merge; synchronize and re-review.");
  checkCheckout();
  const merged = (api(MERGE_MUTATION, {
    input: { pullRequestId: pr.id, expectedHeadOid: head, mergeMethod: "SQUASH", commitHeadline: headline, commitBody: "" },
  }) as { mergePullRequest?: { pullRequest?: { url: string; state: string; mergeCommit?: { oid: string } } } }).mergePullRequest?.pullRequest;
  if (merged?.state !== "MERGED" || !merged.mergeCommit?.oid) {
    throw new Error("GitHub did not confirm MERGED. Inspect the PR; do not run cleanup.");
  }
  // GitHub truncates GraphQL message fields with an ellipsis for long subjects, so the
  // stored message is verified through the REST commits endpoint instead.
  const commit = JSON.parse(run("gh", ["api", `repos/${repo}/commits/${merged.mergeCommit.oid}`])) as { commit?: { message?: string } };
  if (commit.commit?.message?.trimEnd() !== headline) {
    throw new Error(`PR merged at ${merged.mergeCommit.oid}, but the squash message differs from the requested subject-only message. Inspect before cleanup.`);
  }
  return merged;
}

interface PullRequest {
  id: string;
  url: string;
  title: string;
  state: string;
  isDraft: boolean;
  headRefOid: string;
  baseRefName: string;
  baseRefOid: string;
  mergeable: string;
  mergeStateStatus: string;
  autoMergeRequest: { enabledAt: string } | null;
  mergeQueueEntry: { id: string } | null;
  commits?: { nodes?: { commit?: { statusCheckRollup?: { state: string } | null } }[] };
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(squashMerge(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error instanceof Error && "stderr" in error ? String(error.stderr).trim() || error.message : error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
