const assert = require("node:assert/strict");
const { squashMerge } = require("../scripts/squash-merge.cjs");

const head = "a".repeat(40), baseSha = "b".repeat(40);
const args = ["owner/skyline", "12", head, "main", baseSha];
function fixture(overrides = {}) {
  const calls = [];
  const pr = {
    id: "PR_test", url: "https://github.com/owner/skyline/pull/12", title: "fix: hover $(literal) `text`",
    state: "OPEN", isDraft: false, headRefOid: head, baseRefName: "main", baseRefOid: baseSha,
    mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", autoMergeRequest: null, mergeQueueEntry: null,
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
    ...overrides.pr,
  };
  const run = (file, argv, input) => {
    calls.push({ file, argv, input });
    if (file === "git") {
      if (argv[0] === "merge-base" && overrides.behind) throw new Error("Reviewed head does not contain base");
      if (argv[0] === "status") return overrides.dirty ? " M index.html" : "";
      if (argv[0] === "rev-parse") return overrides.localHead || head;
      return "";
    }
    if (argv[1].startsWith("repos/")) return JSON.stringify({ object: { sha: overrides.liveBase || baseSha } });
    const request = JSON.parse(input);
    if (request.query.startsWith("query")) return JSON.stringify({ data: { repository: { pullRequest: pr } } });
    if (overrides.mutationError) throw new Error("Expected head OID did not match");
    const merged = {
      url: pr.url, state: "MERGED",
      mergeCommit: { oid: "c".repeat(40), messageHeadline: request.variables.input.commitHeadline, messageBody: "" },
      ...overrides.merged,
    };
    return JSON.stringify({ data: { mergePullRequest: { pullRequest: merged } } });
  };
  return { run, calls };
}

const good = fixture();
assert.equal(squashMerge(args, good.run).state, "MERGED");
const mutations = good.calls.filter((call) => call.input && JSON.parse(call.input).query.startsWith("mutation"));
assert.equal(mutations.length, 1);
assert.deepEqual(JSON.parse(mutations[0].input).variables.input, {
  pullRequestId: "PR_test", expectedHeadOid: head, mergeMethod: "SQUASH",
  commitHeadline: "fix: hover $(literal) `text` (#12)", commitBody: "",
});
for (const config of [
  { dirty: true }, { localHead: baseSha }, { liveBase: head }, { behind: true },
  { pr: { headRefOid: baseSha } }, { pr: { baseRefName: "other" } }, { pr: { baseRefOid: head } },
  { pr: { state: "MERGED" } }, { pr: { isDraft: true } },
  { pr: { mergeStateStatus: "BEHIND" } }, { pr: { mergeStateStatus: "BLOCKED" } },
  { pr: { mergeable: "UNKNOWN" } }, { pr: { autoMergeRequest: {} } }, { pr: { mergeQueueEntry: {} } },
  { pr: { commits: { nodes: [{ commit: { statusCheckRollup: { state: "PENDING" } } }] } } },
  { pr: { commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] } } },
  { pr: { title: "fix: subject\nextra body" } },
]) {
  const gate = fixture(config);
  assert.throws(() => squashMerge(args, gate.run), undefined, JSON.stringify(config));
  assert.equal(gate.calls.some((call) => call.input && JSON.parse(call.input).query.startsWith("mutation")), false);
}
assert.throws(() => squashMerge([...args, "extra"], fixture().run), /Usage/);
assert.throws(() => squashMerge(args, fixture({ mutationError: true }).run), /head OID/);
assert.throws(() => squashMerge(args, fixture({ merged: { state: "OPEN" } }).run), /did not confirm/);
assert.throws(() => squashMerge(args, fixture({ merged: { mergeCommit: { oid: head, messageHeadline: "wrong", messageBody: "body" } } }).run), /PR merged.*message differs/);
assert.equal(squashMerge(args, fixture({ pr: { commits: { nodes: [{ commit: { statusCheckRollup: null } }] } } }).run).state, "MERGED");
console.log("PASS: merge guards, SHA binding, literal subject/empty body, rejected races, and confirmed merge result.");
