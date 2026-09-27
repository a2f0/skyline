// Runs the hooks the way Git runs them. The check itself is unit-tested in
// check-coauthors.test.ts; what only an execution can show is whether the hook
// reaches it at all. An earlier revision resolved `bun` off the invoking
// process's PATH, which a hook does not reliably carry, so every commit was
// refused with "bun: not found" — a check that refuses everything looks exactly
// like a check that is working, unless the test reads why.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const trailer = "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>";
let repo = "";

interface Attempt {
  ok: boolean;
  output: string;
}
function git(args: string[], env: NodeJS.ProcessEnv = process.env): Attempt {
  try {
    return { ok: true, output: execFileSync("git", args, { cwd: repo, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` || failure.message };
  }
}
// A commit needs something staged, and each attempt reuses the same change.
function commit(message: string, env?: NodeJS.ProcessEnv): Attempt {
  writeFileSync(path.join(repo, "file.txt"), `${Math.random()}`);
  git(["add", "file.txt"]);
  return git(["commit", "-m", message], env);
}

beforeAll(() => {
  repo = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-"));
  git(["init", "--quiet", "."]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  // The throwaway repository must not inherit a global signing config: the
  // isolated PATH cases carry no gpg, and signing is not what is under test.
  git(["config", "commit.gpgsign", "false"]);
  git(["config", "tag.gpgsign", "false"]);
  mkdirSync(path.join(repo, "scripts/git"), { recursive: true });
  cpSync(path.join(root, "scripts/check-coauthors.ts"), path.join(repo, "scripts/check-coauthors.ts"));
  cpSync(path.join(root, "scripts/git/hooks"), path.join(repo, "scripts/git/hooks"), { recursive: true });
  cpSync(path.join(root, "scripts/git/install-hooks.sh"), path.join(repo, "scripts/git/install-hooks.sh"));
  cpSync(path.join(root, "mise.toml"), path.join(repo, "mise.toml"));
  writeFileSync(path.join(repo, "file.txt"), "seed");
  git(["add", "-A"]);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed"]);
  execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore" });
}, 60_000);

afterAll(() => { if (repo) rmSync(repo, { recursive: true, force: true }); });

describe("the installed commit-msg hook", () => {
  test("lets a clean message through, which is what proves it ran at all", () => {
    const attempt = commit("fix: a real change");
    expect(attempt.ok, attempt.output).toBe(true);
  });
  test("lets a human co-author through", () => {
    const attempt = commit("fix: a real change\n\nCo-authored-by: Dan Sullivan <dansullivan@gmail.com>");
    expect(attempt.ok, attempt.output).toBe(true);
  });
  test("refuses the agent trailer, and says so rather than failing some other way", () => {
    const attempt = commit(`fix: a change\n\n${trailer}`);
    expect(attempt.ok).toBe(false);
    expect(attempt.output).toContain("agent attribution");
  });
  test("refuses the generated-with line", () => {
    const attempt = commit("fix: a change\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)");
    expect(attempt.ok).toBe(false);
    expect(attempt.output).toContain("agent attribution");
  });
  // The three ways the hooks resolve bun, each on a PATH the test builds from
  // nothing, so none of them depends on what the machine happens to install
  // where. The directory carries only the utilities the hook itself runs, plus
  // whichever of bun and mise the case under test wants to exist.
  const isolated = (fakes: Record<string, string> = {}) => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-path-"));
    for (const tool of ["git", "cmp"]) {
      symlinkSync(execFileSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).trim(), path.join(directory, tool));
    }
    for (const [name, body] of Object.entries(fakes)) writeFileSync(path.join(directory, name), body, { mode: 0o755 });
    return directory;
  };
  const bunPath = () => execFileSync("mise", ["which", "bun"], { encoding: "utf8" }).trim();
  const onPath = (directory: string) => ({ ...process.env, PATH: directory });

  test("uses bun straight from PATH when it is there", () => {
    const directory = isolated({ bun: `#!/bin/sh\nexec ${bunPath()} "$@"\n` });
    try {
      const attempt = commit("fix: a clean message", onPath(directory));
      expect(attempt.ok, attempt.output).toBe(true);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  test("falls back to mise when bun is not on PATH", () => {
    // Only `mise which bun` can succeed here: there is no bun to find.
    const directory = isolated({ mise: `#!/bin/sh\n[ "$1" = which ] && echo ${bunPath()}\n` });
    try {
      const attempt = commit("fix: a clean message", onPath(directory));
      expect(attempt.ok, attempt.output).toBe(true);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  test("says what to do when it can find no bun at all, instead of reporting it as attribution", () => {
    // Neither executable exists on this PATH. The hook must still fail closed,
    // but a maintainer has to be able to tell a missing toolchain from a
    // rejected message.
    const directory = isolated();
    try {
      const attempt = commit("fix: a clean message", onPath(directory));
      expect(attempt.ok).toBe(false);
      expect(attempt.output).toContain("mise use");
      expect(attempt.output).not.toContain("agent attribution");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});

describe("the installed pre-push hook", () => {
  test("refuses a commit that reached the branch past commit-msg", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      git(["remote", "add", "origin", remote]);
      git(["branch", "-M", "main"]);
      expect(git(["push", "-q", "origin", "main"]).ok).toBe(true);
      writeFileSync(path.join(repo, "file.txt"), "bypassed");
      git(["add", "file.txt"]);
      git(["commit", "-q", "--no-verify", "-m", `fix: bypassed\n\n${trailer}`]);
      const push = git(["push", "origin", "main"]);
      expect(push.ok).toBe(false);
      expect(push.output).toContain("agent attribution");
      // And the same branch pushes once the message is clean.
      git(["commit", "-q", "--amend", "-m", "fix: reworded"]);
      expect(git(["push", "origin", "main"]).ok).toBe(true);
      // A branch the remote has never seen, carrying an offending commit that
      // already sits unpushed on main. Subtracting local main rather than the
      // remotes would have let this through.
      git(["commit", "-q", "--allow-empty", "--no-verify", "-m", `fix: unpushed on main\n\n${trailer}`]);
      git(["switch", "-q", "-c", "feature"]);
      git(["commit", "-q", "--allow-empty", "-m", "fix: clean work on top"]);
      const fresh = git(["push", "origin", "feature"]);
      expect(fresh.ok, "a new branch must not smuggle an offending ancestor past the gate").toBe(false);
      expect(fresh.output).toContain("agent attribution");
    } finally {
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
});
