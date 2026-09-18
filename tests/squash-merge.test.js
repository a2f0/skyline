import { describe, expect, test } from "bun:test";
import { squashMerge } from "../scripts/squash-merge.js";

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

describe("squashMerge", () => {
  test("merges a reviewed PR with a subject-only message bound to its head", () => {
    const good = fixture();
    expect(squashMerge(args, good.run).state).toBe("MERGED");
    const mutations = good.calls.filter((call) => call.input && JSON.parse(call.input).query.startsWith("mutation"));
    expect(mutations.length).toBe(1);
    expect(JSON.parse(mutations[0].input).variables.input).toEqual({
      pullRequestId: "PR_test", expectedHeadOid: head, mergeMethod: "SQUASH",
      commitHeadline: "fix: hover $(literal) `text` (#12)", commitBody: "",
    });
  });

  test("keeps a PR with a null status rollup mergeable", () => {
    const gate = fixture({ pr: { commits: { nodes: [{ commit: { statusCheckRollup: null } }] } } });
    expect(squashMerge(args, gate.run).state).toBe("MERGED");
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
    test(`rejects ${JSON.stringify(config)} before any mutation`, () => {
      const gate = fixture(config);
      expect(() => squashMerge(args, gate.run)).toThrow();
      expect(gate.calls.some((call) => call.input && JSON.parse(call.input).query.startsWith("mutation"))).toBe(false);
    });
  }

  test("rejects extra arguments", () => {
    expect(() => squashMerge([...args, "extra"], fixture().run)).toThrow(/Usage/);
  });
  test("rejects a failed mutation", () => {
    expect(() => squashMerge(args, fixture({ mutationError: true }).run)).toThrow(/head OID/);
  });
  test("rejects an unconfirmed merge", () => {
    expect(() => squashMerge(args, fixture({ merged: { state: "OPEN" } }).run)).toThrow(/did not confirm/);
  });
  test("rejects a merge with a different message", () => {
    expect(() => squashMerge(args, fixture({ merged: { mergeCommit: { oid: head, messageHeadline: "wrong", messageBody: "body" } } }).run)).toThrow(/PR merged.*message differs/);
  });
});
