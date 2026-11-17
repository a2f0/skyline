import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { attributionIn, checkCoauthors, offendersIn, PUSH_GATE_ENV, report } from "../scripts/checks/check-coauthors.js";
import type { Runner } from "../scripts/checks/check-coauthors.js";

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
  test("leaves a human co-author alone, including near-misses on the agent's own name", () => {
    for (const human of [
      "Co-authored-by: Dan Sullivan <dansullivan@gmail.com>",
      "Co-authored-by: Claudette Smith <claudette@example.com>",
      "Co-authored-by: Sam Jones <sam@notanthropic.com>",
    ]) {
      expect(attributionIn(`fix: a thing\n\n${human}\n`), human).toEqual([]);
    }
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
  test("leaves a line that opens by quoting the rule alone", () => {
    // Leading punctuation is allowed for the emoji the real line carries, not
    // for a quote mark: a line that starts by quoting the rule is prose.
    const quoted = '"Generated with Claude Code" is the line this hook rejects.';
    expect(attributionIn(`docs: explain the gate\n\n${quoted}\n`)).toEqual([]);
  });
  test("still catches the real line behind its emoji and markdown", () => {
    for (const line of [generated, `> ${generated}`, `* ${generated}`, "Generated with Claude Code"]) {
      expect(attributionIn(`fix: x\n\n${line}\n`).length, line).toBe(1);
    }
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
  let revisions: string[] = [];
  const log = (entries: string[]): Runner => (file, args) => {
    expect(file).toBe("git");
    expect(args.slice(0, 4)).toEqual(["log", "-z", "--format=%H%n%B", "--no-show-signature"]);
    revisions = args.slice(4);
    return entries.join("\0");
  };
  test("finds the commits that carry it and leaves the rest", () => {
    const offenders = offendersIn(["main..HEAD"], log([
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
    expect(offendersIn(["main..HEAD"], log([`${"a".repeat(40)}\nfeat: quoting\n\n${body}\n`]))).toEqual([]);
  });
  test("passes every revision argument through to git log", () => {
    // The push gate selects a pushed ref's commits as "<tip> --not <boundary...>",
    // which is not a two-dot range.
    offendersIn(["abc123", "--not", "def456", "fed789"], log([]));
    expect(revisions).toEqual(["abc123", "--not", "def456", "fed789"]);
  });
  test("passes an empty range", () => {
    expect(offendersIn(["main..HEAD"], log([]))).toEqual([]);
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
  const log = (entries: string[]): Runner => () => entries.join("\0");
  // The push agent-tool's push gate hands its steps, in the file its
  // environment variable names.
  const pushData = (refs: unknown[], schemaVersion = 1) => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "skyline-push-gate-")), "push.json");
    writeFileSync(file, JSON.stringify({ schemaVersion, remote: { name: "origin" }, refs }));
    return { [PUSH_GATE_ENV]: file };
  };
  const pushed = (remoteRef: string, revisions: string[]) => ({ remoteRef, deleted: false, revisions });
  const deleted = { remoteRef: "refs/heads/feat/gone", deleted: true, revisions: [] };
  test("checks the commits each pushed ref adds, from the push gate's data", () => {
    const seen: string[][] = [];
    const dirty: Runner = (_file, args) => {
      seen.push(args.slice(4));
      return `${"b".repeat(40)}\nfix: dirty\n\n${trailer}\n`;
    };
    const env = pushData([pushed("refs/heads/main", ["abc", "--not", "def"]), deleted]);
    expect(checkCoauthors(["--push-gate"], dirty, env)).toContain("agent attribution");
    // A deletion pushes no commits, so only the other ref is read.
    expect(seen).toEqual([["abc", "--not", "def"]]);
    expect(checkCoauthors(["--push-gate"], log([`${"a".repeat(40)}\nfeat: clean\n`]), env)).toBeNull();
  });
  test("names a commit two pushed refs carry once", () => {
    const env = pushData([pushed("refs/heads/main", ["abc"]), pushed("refs/heads/feat/copy", ["abc"])]);
    const failure = checkCoauthors(["--push-gate"], log([`${"b".repeat(40)}\nfix: dirty\n\n${trailer}\n`]), env)!;
    expect(failure).toContain("a commit carries agent attribution");
    expect(failure.match(/bbbbbbbbbbbb/g)).toHaveLength(1);
  });
  test("refuses push data it cannot read rather than passing", () => {
    // A check that found nothing to read must not look like a clean push.
    expect(() => checkCoauthors(["--push-gate"], log([]), {})).toThrow(PUSH_GATE_ENV);
    expect(() => checkCoauthors(["--push-gate"], log([]), pushData([], 2))).toThrow("schemaVersion 1");
    for (const ref of [{ remoteRef: "refs/heads/main", deleted: false }, { remoteRef: "refs/heads/main", revisions: [] }, pushed("refs/heads/main", ["abc", ""])]) {
      expect(() => checkCoauthors(["--push-gate"], log([]), pushData([ref])), JSON.stringify(ref)).toThrow("no revisions to check");
    }
  });
  test("reads a message file for the commit-msg hook", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-coauthors-"));
    const file = path.join(directory, "COMMIT_EDITMSG");
    writeFileSync(file, `fix: a thing\n\n${trailer}\n`);
    const failure = checkCoauthors(["--message", file])!;
    expect(failure).toContain("agent attribution");
    // At commit-msg time there is no commit to amend, and the change is still
    // staged: telling it to amend would rewrite the previous commit and fold
    // this work into it.
    expect(failure).toContain("nothing has been committed");
    expect(failure).not.toContain("--amend");
    expect(failure).not.toContain("rebase");
    writeFileSync(file, "fix: a thing\n\nA body.\n");
    expect(checkCoauthors(["--message", file])).toBeNull();
  });
  test("rejects arguments it cannot act on rather than passing", () => {
    // A usage slip must not read as a clean check.
    for (const args of [[], ["--range", "main..HEAD"], ["main..HEAD"], ["--branch", "main"], ["--message"], ["--message", ""], ["--message", "a", "b"], ["--push-gate", "main..HEAD"]]) {
      expect(() => checkCoauthors(args, log([]), {})).toThrow(/Usage/);
    }
  });
});
