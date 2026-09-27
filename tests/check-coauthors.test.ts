import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { attributionIn, checkCoauthors, offendersIn, report } from "../scripts/check-coauthors.js";
import type { Runner } from "../scripts/check-coauthors.js";

const trailer = "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>";
const generated = "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

describe("agent attribution in a message", () => {
  test("catches the trailer the harness injects, however it is cased or spaced", () => {
    for (const line of [trailer, trailer.toLowerCase(), "co-authored-by : Claude <noreply@anthropic.com>", "  Co-authored-by: claude opus 5 <x@y>"]) {
      expect(attributionIn(`fix: a thing\n\n${line}\n`), line).toEqual([line.trim()]);
    }
  });
  test("catches the generated-with line a reused pull request body carries in", () => {
    expect(attributionIn(`feat: a thing\n\n${generated}\n`)).toEqual([generated]);
  });
  test("leaves a human co-author alone", () => {
    const human = "Co-authored-by: Dan Sullivan <dansullivan@gmail.com>";
    expect(attributionIn(`fix: a thing\n\n${human}\n`)).toEqual([]);
  });
  test("leaves a message that describes this very rule alone", () => {
    // The commit that introduced the rule quotes both patterns in prose, and
    // was rejected by an earlier revision that matched the phrase anywhere on
    // a line. Attribution is a line in its own right, not a phrase.
    const message = [
      "chore: refuse agent attribution",
      "",
      'commit-msg refuses a trailer, or a "Generated with Claude Code" line, and',
      "pre-push refuses to push a commit carrying either. A Co-authored-by trailer",
      "naming a person passes.",
    ].join("\n");
    expect(attributionIn(message)).toEqual([]);
  });
  test("leaves prose that merely mentions the tool alone", () => {
    // Only a trailer or a generated-with line is attribution. A commit that
    // explains why it touched an agent's own config file is not.
    expect(attributionIn("docs: describe how Claude reads AGENTS.md\n\nAnthropic's agent reads it first.\n")).toEqual([]);
  });
  test("reports every offending line, not just the first", () => {
    expect(attributionIn(`fix: a thing\n\n${trailer}\n${generated}\n`)).toEqual([trailer, generated]);
  });
});

describe("agent attribution in a range", () => {
  const log = (entries: string[]): Runner => (file, args) => {
    expect(file).toBe("git");
    expect(args.slice(0, 3)).toEqual(["log", "-z", "--format=%H%n%B"]);
    return entries.join("\0");
  };
  test("finds the commits that carry it and leaves the rest", () => {
    const offenders = offendersIn("main..HEAD", log([
      `${"a".repeat(40)}\nfeat: clean\n\nA body.\n`,
      `${"b".repeat(40)}\nfix: dirty\n\n${trailer}\n`,
    ]));
    expect(offenders.map(({ commit, subject, lines }) => ({ commit, subject, lines }))).toEqual([
      { commit: "b".repeat(40), subject: "fix: dirty", lines: [trailer] },
    ]);
  });
  test("does not mistake a message's own body for the next commit's header", () => {
    // A body line that looks like a SHA and a subject would split a
    // newline-separated log into the wrong commits.
    const body = `${"c".repeat(40)}\nfix: not a real commit`;
    expect(offendersIn("main..HEAD", log([`${"a".repeat(40)}\nfeat: quoting\n\n${body}\n`]))).toEqual([]);
  });
  test("passes an empty range", () => {
    expect(offendersIn("main..HEAD", log([]))).toEqual([]);
  });
  test("names every offender and says how to remove it", () => {
    const text = report([{ commit: "b".repeat(40), subject: "fix: dirty", lines: [trailer] }]);
    expect(text).toContain("bbbbbbbbbbbb fix: dirty");
    expect(text).not.toContain("b".repeat(13));
    expect(text).toContain(trailer);
    expect(text).toContain("git commit --amend");
    expect(text).toContain("git rebase -i");
  });
});

describe("the command line", () => {
  test("fails a range that carries attribution and passes one that does not", () => {
    const dirty = log([`${"b".repeat(40)}\nfix: dirty\n\n${trailer}\n`]);
    expect(checkCoauthors(["--range", "main..HEAD"], dirty)).toContain("agent attribution");
    expect(checkCoauthors(["--range", "main..HEAD"], log([`${"a".repeat(40)}\nfeat: clean\n`]))).toBeNull();
  });
  const log = (entries: string[]): Runner => () => entries.join("\0");
  test("reads a message file for the commit-msg hook", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-coauthors-"));
    const file = path.join(directory, "COMMIT_EDITMSG");
    writeFileSync(file, `fix: a thing\n\n${trailer}\n`);
    const failure = checkCoauthors(["--message", file])!;
    expect(failure).toContain("agent attribution");
    // The label is words, not a SHA, so it must not be abbreviated to nonsense.
    expect(failure).toContain("the message being written");
    writeFileSync(file, "fix: a thing\n\nA body.\n");
    expect(checkCoauthors(["--message", file])).toBeNull();
  });
  test("rejects arguments it cannot act on rather than passing", () => {
    // A usage slip must not read as a clean check.
    for (const args of [[], ["--range"], ["main..HEAD"], ["--branch", "main"], ["--range", ""]]) {
      expect(() => checkCoauthors(args, log([]))).toThrow(/Usage/);
    }
  });
});
