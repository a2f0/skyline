import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mergeErrorMessage, mergePr, type Runner } from "../scripts/git/merge-pr.js";

const head = "a".repeat(40), base = "b".repeat(40), merged = "c".repeat(40);
function fixture(options: { prHead?: string; prBase?: string; draft?: boolean; state?: string; preflightFailure?: boolean; confirmed?: boolean; message?: string; mergedNumber?: number; title?: string; mergeFailure?: boolean } = {}) {
  let called = false, preflightChecked = false;
  const run: Runner = (file, args) => {
    if (file === process.execPath) {
      expect(existsSync(args[0]!)).toBe(true);
      if (args[2] === "preflight") {
        expect(args.slice(1)).toEqual(["pr", "preflight", head, "main", base]);
        preflightChecked = true;
        if (options.preflightFailure) throw new Error("Preflight refused the checkout");
        return "";
      }
      expect(preflightChecked).toBe(true);
      expect(args.slice(1)).toEqual(["pr", "merge", options.title ?? "chore: change", head, "main"]);
      called = true;
      if (options.mergeFailure) throw Object.assign(new Error("Shared merge failed"), { stderr: null });
      return "";
    }
    if (file === "git") {
      expect(args).toEqual(["branch", "--show-current"]);
      return "chore/normalize-tooling";
    }
    if (args[0] === "repo") return "a2f0/skyline";
    if (args[0] === "pr") {
      expect(args[2]).toBe(called ? "123" : "chore/normalize-tooling");
      return JSON.stringify({
        number: called ? options.mergedNumber ?? 123 : 123, title: options.title ?? "chore: change",
        state: called && options.confirmed !== false ? "MERGED" : options.state ?? "OPEN",
        isDraft: options.draft ?? false, headRefName: "chore/normalize-tooling",
        headRefOid: options.prHead ?? head, baseRefName: options.prBase ?? "main", baseRefOid: base, mergeCommit: called ? { oid: merged } : null,
      });
    }
    if (args[1]?.includes("/commits/")) return options.message ?? "chore: change (#123)";
    throw new Error(`Unexpected fixture command: ${file} ${args.join(" ")}`);
  };
  return { run, called: () => called, preflightChecked: () => preflightChecked };
}

describe("Skyline merge guards around the shared tool", () => {
  test("delegates the reviewed head and verifies the landed subject", () => {
    const f = fixture();
    expect(mergePr([head, "main", base], f.run)).toBe(merged);
    expect(f.preflightChecked()).toBe(true);
    expect(f.called()).toBe(true);
  });
  test("does not merge when the shared preflight refuses the checkout", () => {
    const f = fixture({ preflightFailure: true });
    expect(() => mergePr([head, "main", base], f.run)).toThrow("Preflight refused");
    expect(f.called()).toBe(false);
  });
  for (const options of [{ prHead: base }, { prBase: "other" }, { draft: true }, { state: "CLOSED" }]) {
    test(`refuses a title-bearing PR with mismatched identity ${JSON.stringify(options)}`, () => {
      const f = fixture(options);
      expect(() => mergePr([head, "main", base], f.run)).toThrow("selected PR does not match");
      expect(f.called()).toBe(false);
      expect(f.preflightChecked()).toBe(false);
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
