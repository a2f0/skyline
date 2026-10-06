import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mergeErrorMessage, mergePr, type Runner } from "../scripts/merge-pr.js";

const head = "a".repeat(40), base = "b".repeat(40), merged = "c".repeat(40);
function fixture(options: { dirty?: boolean; changedHead?: boolean; staleBase?: boolean; prBase?: string; prHead?: string; state?: string; confirmed?: boolean; message?: string; ancestor?: boolean; branch?: string; draft?: boolean; prState?: string; mergeable?: string; mergedNumber?: number; repo?: string; title?: string; mergeFailure?: boolean; staleVersion?: boolean } = {}) {
  let called = false, versionsChecked = false;
  const run: Runner = (file, args) => {
    if (file === process.execPath) {
      // Both calls go to the installed shared tool, not a path that has moved.
      expect(existsSync(args[0]!)).toBe(true);
      if (args[1] === "versions") {
        expect(args.slice(1)).toEqual(["versions", "check", base]);
        versionsChecked = true;
        if (options.staleVersion) throw new Error("Version needs a bump");
        return "";
      }
      expect(versionsChecked).toBe(true);
      expect(args.slice(1)).toEqual(["pr", "merge", options.title ?? "chore: change", head, "main"]);
      called = true;
      if (options.mergeFailure) throw Object.assign(new Error("Shared merge failed"), { stderr: null });
      return "";
    }
    if (file === "git") {
      if (args[0] === "status") return options.dirty ? " M file.ts" : "";
      if (args[0] === "rev-parse") return options.changedHead ? base : head;
      if (args[0] === "branch") return options.branch ?? "feature";
      if (args[0] === "merge-base" && options.ancestor === false) throw new Error("Reviewed base is not an ancestor");
      return "";
    }
    if (args[0] === "repo") return options.repo ?? "a2f0/skyline";
    if (args[0] === "pr") return JSON.stringify({
      number: called ? options.mergedNumber ?? 123 : 123, title: options.title ?? "chore: change",
      state: called && options.confirmed !== false ? "MERGED" : options.prState ?? "OPEN",
      isDraft: options.draft ?? false, headRefName: "feature", headRefOid: options.prHead ?? head,
      baseRefName: "main", baseRefOid: options.prBase ?? base,
      mergeable: options.mergeable ?? "MERGEABLE", mergeStateStatus: options.state ?? "CLEAN",
      mergeCommit: called ? { oid: merged } : null,
    });
    if (args[1]?.includes("git/ref")) return options.staleBase ? head : base;
    if (args[1]?.includes("/commits/")) return options.message ?? "chore: change (#123)";
    throw new Error(`Unexpected fixture command: ${file} ${args.join(" ")}`);
  };
  return { run, called: () => called, versionsChecked: () => versionsChecked };
}

describe("Skyline merge guards around the shared tool", () => {
  test("delegates the reviewed head and verifies the landed subject", () => {
    const f = fixture();
    expect(mergePr([head, "main", base], f.run)).toBe(merged);
    expect(f.versionsChecked()).toBe(true);
    expect(f.called()).toBe(true);
  });
  for (const [name, options, message] of [
    ["dirty checkout", { dirty: true }, "Worktree is dirty"],
    ["changed local HEAD", { changedHead: true }, "Local HEAD changed"],
    ["changed PR HEAD", { prHead: base }, "reviewed feature HEAD"],
    ["changed PR base", { prBase: head }, "PR base changed"],
    ["advanced live base", { staleBase: true }, "Base advanced"],
    ["unready merge", { state: "BLOCKED" }, "not ready"],
    ["unmergeable PR", { mergeable: "CONFLICTING" }, "not ready"],
    ["draft PR", { draft: true }, "not open"],
    ["closed PR", { prState: "CLOSED" }, "not open"],
    ["unreviewed ancestry", { ancestor: false }, "not an ancestor"],
    ["base branch checkout", { branch: "main" }, "feature branch"],
    ["detached checkout", { branch: "" }, "feature branch"],
    ["invalid repository identity", { repo: "unknown" }, "resolve the repository"],
    ["package version not prepared against the base", { staleVersion: true }, "Version needs a bump"],
  ] as const) {
    test(`refuses ${name} before invoking the shared merge`, () => {
      const f = fixture(options);
      expect(() => mergePr([head, "main", base], f.run)).toThrow(message);
      expect(f.called()).toBe(false);
    });
  }
  for (const args of [[head, "main"], ["short", "main", base], [head, "main", "bad"], [head, "", base]]) {
    test(`refuses invalid arguments ${args.join(" ")}`, () => {
      const f = fixture();
      expect(() => mergePr(args, f.run)).toThrow("Usage:");
      expect(f.called()).toBe(false);
    });
  }
  test("does not report success without a confirmed merge", () => {
    expect(() => mergePr([head, "main", base], fixture({ confirmed: false }).run)).toThrow("did not confirm");
  });
  test("refuses cleanup when the stored commit contains an unexpected body", () => {
    expect(() => mergePr([head, "main", base], fixture({ message: "chore: change (#123)\n\nUnexpected body" }).run)).toThrow("Squash message differs");
  });
  test("refuses cleanup if the confirmed PR identity changed", () => {
    const f = fixture({ mergedNumber: 124 });
    expect(() => mergePr([head, "main", base], f.run)).toThrow("did not confirm");
    expect(f.called()).toBe(true);
  });
  test("verifies a title that already includes its PR number", () => {
    expect(mergePr([head, "main", base], fixture({ title: "chore: change (#123)" }).run)).toBe(merged);
  });
  test("propagates a shared CLI failure and reports its message with inherited stderr", () => {
    const f = fixture({ mergeFailure: true });
    let result: string | undefined;
    try { result = mergePr([head, "main", base], f.run); }
    catch (error) { expect(mergeErrorMessage(error)).toBe("Shared merge failed"); }
    expect(f.called()).toBe(true);
    expect(result).toBeUndefined();
  });
});
