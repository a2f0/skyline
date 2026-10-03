import { describe, expect, test } from "bun:test";
import { mergePr, type Runner } from "../scripts/merge-pr.js";

const head = "a".repeat(40), base = "b".repeat(40), merged = "c".repeat(40);
function fixture(options: { dirty?: boolean; changedHead?: boolean; staleBase?: boolean; prBase?: string; prHead?: string; state?: string; confirmed?: boolean; message?: string } = {}) {
  let called = false;
  const run: Runner = (file, args) => {
    if (file === process.execPath) {
      expect(args.slice(1)).toEqual(["pr", "merge", "chore: change", head, "main"]);
      called = true;
      return "";
    }
    if (file === "git") {
      if (args[0] === "status") return options.dirty ? " M file.ts" : "";
      if (args[0] === "rev-parse") return options.changedHead ? base : head;
      if (args[0] === "branch") return "feature";
      return "";
    }
    if (args[0] === "repo") return "a2f0/skyline";
    if (args[0] === "pr") return JSON.stringify({
      number: 123, title: "chore: change", state: called && options.confirmed !== false ? "MERGED" : "OPEN",
      isDraft: false, headRefName: "feature", headRefOid: options.prHead ?? head,
      baseRefName: "main", baseRefOid: options.prBase ?? base,
      mergeable: "MERGEABLE", mergeStateStatus: options.state ?? "CLEAN",
      mergeCommit: called ? { oid: merged } : null,
    });
    if (args[1]?.includes("git/ref")) return options.staleBase ? head : base;
    return options.message ?? "chore: change (#123)";
  };
  return { run, called: () => called };
}

describe("Skyline merge guards around the shared tool", () => {
  test("delegates the reviewed head and verifies the landed subject", () => {
    const f = fixture();
    expect(mergePr([head, "main", base], f.run)).toBe(merged);
    expect(f.called()).toBe(true);
  });
  for (const [name, options, message] of [
    ["dirty checkout", { dirty: true }, "Worktree is dirty"],
    ["changed local HEAD", { changedHead: true }, "Local HEAD changed"],
    ["changed PR HEAD", { prHead: base }, "reviewed feature HEAD"],
    ["changed PR base", { prBase: head }, "PR base changed"],
    ["advanced live base", { staleBase: true }, "Base advanced"],
    ["unready merge", { state: "BLOCKED" }, "not ready"],
  ] as const) {
    test(`refuses ${name} before invoking the shared merge`, () => {
      const f = fixture(options);
      expect(() => mergePr([head, "main", base], f.run)).toThrow(message);
      expect(f.called()).toBe(false);
    });
  }
  test("does not report success without a confirmed merge", () => {
    expect(() => mergePr([head, "main", base], fixture({ confirmed: false }).run)).toThrow("did not confirm");
  });
  test("refuses cleanup when the stored commit contains an unexpected body", () => {
    expect(() => mergePr([head, "main", base], fixture({ message: "chore: change (#123)\n\nUnexpected body" }).run)).toThrow("Squash message differs");
  });
});
