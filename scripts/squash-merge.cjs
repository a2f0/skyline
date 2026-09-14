const { execFileSync } = require("node:child_process");

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
    pullRequest { url state mergeCommit { oid messageHeadline messageBody } }
  }
}`;

function command(file, args, input) {
  return execFileSync(file, args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function squashMerge(args, run = command) {
  const [repo, number, head, base, baseSha] = args;
  if (args.length !== 5 || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[1-9]\d*$/.test(number)
      || !/^[a-f0-9]{40}$/.test(head) || !base || !/^[a-f0-9]{40}$/.test(baseSha)) {
    throw new Error("Usage: node scripts/squash-merge.cjs owner/repo number reviewed-head-sha base-ref reviewed-base-sha");
  }
  run("git", ["check-ref-format", `refs/heads/${base}`]);
  const checkCheckout = () => {
    if (run("git", ["status", "--porcelain"])) throw new Error("Worktree is dirty; commit and review intended changes first.");
    if (run("git", ["rev-parse", "HEAD"]) !== head) throw new Error("Local HEAD differs from reviewed head; re-review required.");
  };
  checkCheckout();
  run("git", ["merge-base", "--is-ancestor", baseSha, head]);
  const api = (query, variables) => {
    const response = JSON.parse(run("gh", ["api", "graphql", "--input", "-"], JSON.stringify({ query, variables })));
    if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join("\n"));
    return response.data;
  };
  const [owner, name] = repo.split("/");
  const pr = api(PR_QUERY, { owner, name, number: Number(number) })?.repository?.pullRequest;
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
  const liveBase = JSON.parse(run("gh", ["api", `repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`]));
  if (liveBase.object?.sha !== baseSha) throw new Error("Base advanced before merge; synchronize and re-review.");
  checkCheckout();
  const merged = api(MERGE_MUTATION, {
    input: { pullRequestId: pr.id, expectedHeadOid: head, mergeMethod: "SQUASH", commitHeadline: headline, commitBody: "" },
  })?.mergePullRequest?.pullRequest;
  if (merged?.state !== "MERGED" || !merged.mergeCommit?.oid) {
    throw new Error("GitHub did not confirm MERGED. Inspect the PR; do not run cleanup.");
  }
  if (merged.mergeCommit.messageHeadline !== headline || merged.mergeCommit.messageBody !== "") {
    throw new Error(`PR merged at ${merged.mergeCommit.oid}, but the squash message differs from the requested subject-only message. Inspect before cleanup.`);
  }
  return merged;
}

module.exports = { squashMerge };
if (require.main === module) {
  try {
    console.log(JSON.stringify(squashMerge(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.stderr?.toString().trim() || error.message);
    process.exitCode = 1;
  }
}
