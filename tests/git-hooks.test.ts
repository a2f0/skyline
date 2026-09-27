// Runs the hooks the way Git runs them. The check itself is unit-tested in
// check-coauthors.test.ts; what only an execution can show is whether the hook
// reaches it at all. An earlier revision resolved `bun` off the invoking
// process's PATH, which a hook does not reliably carry, so every commit was
// refused with "bun: not found" — a check that refuses everything looks exactly
// like a check that is working, unless the test reads why.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const trailer = "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>";
let repo = "";

interface Attempt {
  ok: boolean;
  output: string;
}
// Git reads global and system config, so a host that sets core.hooksPath or
// commit.gpgsign would change what these tests measure — and one of them
// asserts on core.hooksPath. Every invocation runs against empty config files
// instead, so the suite says the same thing on every machine.
const hermetic = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  ({ ...env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" });
function git(args: string[], env: NodeJS.ProcessEnv = process.env): Attempt {
  try {
    return { ok: true, output: execFileSync("git", args, { cwd: repo, encoding: "utf8", env: hermetic(env), stdio: ["ignore", "pipe", "pipe"] }) };
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
  cpSync(path.join(root, "scripts/lib"), path.join(repo, "scripts/lib"), { recursive: true });
  cpSync(path.join(root, "scripts/git/hooks"), path.join(repo, "scripts/git/hooks"), { recursive: true });
  cpSync(path.join(root, "scripts/git/install-hooks.sh"), path.join(repo, "scripts/git/install-hooks.sh"));
  cpSync(path.join(root, "mise.toml"), path.join(repo, "mise.toml"));
  writeFileSync(path.join(repo, "file.txt"), "seed");
  git(["add", "-A"]);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed"]);
  execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
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
  // The bun already running this suite, so the test needs no mise on the host.
  const bunPath = () => process.execPath;
  const onPath = (directory: string) => ({ ...process.env, PATH: directory });

  test("uses bun straight from PATH when it is there", () => {
    const directory = isolated({ bun: `#!/bin/sh\nexec '${bunPath()}' "$@"\n` });
    try {
      const attempt = commit("fix: a clean message", onPath(directory));
      expect(attempt.ok, attempt.output).toBe(true);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  test("falls back to mise when bun is not on PATH", () => {
    // Only `mise which bun` can succeed here: there is no bun to find.
    const directory = isolated({ mise: `#!/bin/sh\n[ "$1" = which ] && printf '%s\\n' '${bunPath()}'\n` });
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

describe("what the installer protects", () => {
  test("refuses to run when the worktree's check has moved on from the installed copy", () => {
    // The hooks run their own copy, so a branch editing the worktree cannot
    // change what the gate does. It must say so rather than enforce the old
    // rule silently.
    const source = path.join(repo, "scripts/check-coauthors.ts");
    const original = readFileSync(source, "utf8");
    try {
      writeFileSync(source, `${original}\n// a branch edits the check\n`);
      const attempt = commit("fix: a clean message");
      expect(attempt.ok).toBe(false);
      expect(attempt.output).toContain("install-hooks.sh");
    } finally {
      writeFileSync(source, original);
    }
  });
  test("leaves a hook it never installed alone", () => {
    // Somebody else's pre-commit is not this installer's to disable.
    const hooks = path.join(repo, ".git/hooks");
    const mine = path.join(hooks, "pre-commit");
    writeFileSync(mine, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(existsSync(mine)).toBe(true);
  });
  test("removes a hook it installed once the repository stops shipping it", () => {
    const hooks = path.join(repo, ".git/hooks");
    const retired = path.join(repo, "scripts/git/hooks/post-commit");
    writeFileSync(retired, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(existsSync(path.join(hooks, "post-commit"))).toBe(true);
    rmSync(retired);
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(existsSync(path.join(hooks, "post-commit"))).toBe(false);
  });
  test("keeps the first backup when it is reinstalled", () => {
    // The .bak holds what was there before this installer ever ran; a later
    // reinstall must not replace it with a copy of the managed hook.
    const hooks = path.join(repo, ".git/hooks");
    const target = path.join(hooks, "commit-msg");
    rmSync(path.join(hooks, "commit-msg.bak"), { force: true });
    writeFileSync(target, "#!/bin/sh\n# somebody else's\nexit 0\n", { mode: 0o755 });
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(readFileSync(path.join(hooks, "commit-msg.bak"), "utf8")).toContain("somebody else's");
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(readFileSync(path.join(hooks, "commit-msg.bak"), "utf8")).toContain("somebody else's");
    rmSync(path.join(hooks, "commit-msg.bak"), { force: true });
  });
  test("replaces a symlinked hook without writing through it", () => {
    // Copying onto a symlink edits a target that may be shared with other
    // repositories, and leaves the destination a symlink.
    const hooks = path.join(repo, ".git/hooks");
    const shared = path.join(repo, "shared-hook.sh");
    writeFileSync(shared, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    rmSync(path.join(hooks, "commit-msg"));
    symlinkSync(shared, path.join(hooks, "commit-msg"));
    execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    expect(lstatSync(path.join(hooks, "commit-msg")).isSymbolicLink()).toBe(false);
    expect(readFileSync(shared, "utf8")).toBe("#!/bin/sh\nexit 0\n");
  });
  test("leaves no absolute hooks path for a moved clone to lose", () => {
    // core.hooksPath would record this clone's location; Git silently skips a
    // path that no longer exists, so both gates would fail open after a move.
    // The installer records one only when a value is inherited from outside the
    // repository, which the hermetic config here rules out.
    const configured = git(["config", "--get", "core.hooksPath"]);
    expect(configured.ok).toBe(false);
  });
  test("installs where the repository already points Git, rather than beside it", () => {
    // A repo-scoped core.hooksPath is this repository's own choice. Installing
    // into the default directory anyway would leave both gates configured and
    // never run.
    const elsewhere = path.join(repo, "my-hooks");
    mkdirSync(elsewhere, { recursive: true });
    git(["config", "core.hooksPath", elsewhere]);
    try {
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
      expect(existsSync(path.join(elsewhere, "commit-msg"))).toBe(true);
      const attempt = commit(`fix: a change\n\n${trailer}`);
      expect(attempt.ok).toBe(false);
      expect(attempt.output).toContain("agent attribution");
    } finally {
      git(["config", "--unset", "core.hooksPath"]);
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    }
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
