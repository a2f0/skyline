// Runs the hooks the way Git runs them. The check itself is unit-tested in
// check-coauthors.test.ts and check-signed-commits.test.ts; an execution shows whether the hook
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
  // Disposable SSH keys make signature tests independent of personal keys.
  const key = path.join(repo, "signing-key");
  execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
  git(["config", "gpg.format", "ssh"]);
  git(["config", "user.signingkey", key]);
  git(["config", "commit.gpgsign", "true"]);
  writeFileSync(path.join(repo, "allowed-signers"), `test@example.com ${readFileSync(`${key}.pub`, "utf8")}`);
  git(["config", "gpg.ssh.allowedSignersFile", path.join(repo, "allowed-signers")]);
  git(["config", "tag.gpgsign", "false"]);
  mkdirSync(path.join(repo, "scripts/git"), { recursive: true });
  cpSync(path.join(root, "scripts/check-coauthors.ts"), path.join(repo, "scripts/check-coauthors.ts"));
  cpSync(path.join(root, "scripts/check-signed-commits.ts"), path.join(repo, "scripts/check-signed-commits.ts"));
  cpSync(path.join(root, "scripts/lib"), path.join(repo, "scripts/lib"), { recursive: true });
  cpSync(path.join(root, "scripts/git/hooks"), path.join(repo, "scripts/git/hooks"), { recursive: true });
  cpSync(path.join(root, "scripts/git/install-hooks.sh"), path.join(repo, "scripts/git/install-hooks.sh"));
  cpSync(path.join(root, "mise.toml"), path.join(repo, "mise.toml"));
  // Exercise the installed shared tool against real managed copies, including
  // on the isolated PATH used to prove mise's runtime fallback.
  for (const directory of [".agents/skills", ".claude/skills"]) {
    cpSync(path.join(root, directory), path.join(repo, directory), { recursive: true });
  }
  cpSync(path.join(root, ".agent-tool-skills.json"), path.join(repo, ".agent-tool-skills.json"));
  cpSync(path.join(root, "agent-tool.json"), path.join(repo, "agent-tool.json"));
  mkdirSync(path.join(repo, "node_modules/@a2f0"), { recursive: true });
  symlinkSync(path.join(root, "node_modules/@a2f0/agent-tool"), path.join(repo, "node_modules/@a2f0/agent-tool"));
  writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n");
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
    for (const tool of ["git", "cmp", "ssh-keygen"]) {
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
  test("keeps the first backup across reinstalls, and keeps later replacements too", () => {
    // The .bak holds what was there before this installer ever ran. A second
    // install must not overwrite it — but a hook something else replaced in the
    // meantime must not be destroyed unrecorded either, so the source has to
    // change between installs for this to pin anything.
    const hooks = path.join(repo, ".git/hooks");
    const source = path.join(repo, "scripts/git/hooks/commit-msg");
    const shipped = readFileSync(source, "utf8");
    const bak = path.join(hooks, "commit-msg.bak"), previous = path.join(hooks, "commit-msg.bak.previous");
    for (const stale of [bak, previous]) rmSync(stale, { force: true });
    try {
      writeFileSync(path.join(hooks, "commit-msg"), "#!/bin/sh\n# somebody else's\nexit 0\n", { mode: 0o755 });
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
      expect(readFileSync(bak, "utf8")).toContain("somebody else's");
      // A third party replaces the managed hook, and the shipped one changes,
      // so the installer genuinely has something different to write.
      writeFileSync(path.join(hooks, "commit-msg"), "#!/bin/sh\n# another manager\nexit 0\n", { mode: 0o755 });
      writeFileSync(source, `${shipped}\n# a later revision\n`);
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
      expect(readFileSync(bak, "utf8"), "the original backup survives").toContain("somebody else's");
      expect(readFileSync(previous, "utf8"), "the later replacement is kept too").toContain("another manager");
    } finally {
      writeFileSync(source, shipped);
      for (const stale of [bak, previous]) rmSync(stale, { force: true });
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
      for (const stale of [bak, previous]) rmSync(stale, { force: true });
    }
  });
  test("refuses a hooks path that points back at its own sources", () => {
    // install_file removes the destination before copying, so a hooks path
    // inside scripts/ would delete the tracked source and then fail.
    // Including spellings that reach the same directory by another route: a
    // lexical comparison would let ./scripts through and delete the source.
    try {
      for (const spelling of ["scripts/git/hooks", "./scripts/git/hooks", "scripts/git/../git/hooks"]) {
        git(["config", "core.hooksPath", spelling]);
        let failed = false;
        try {
          execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "pipe", env: hermetic(process.env) });
        } catch { failed = true; }
        expect(failed, `the installer must refuse ${spelling} rather than delete its own source`).toBe(true);
        expect(existsSync(path.join(repo, "scripts/git/hooks/commit-msg")), spelling).toBe(true);
        expect(existsSync(path.join(repo, "scripts/check-coauthors.ts")), spelling).toBe(true);
      }
    } finally {
      git(["config", "--unset", "core.hooksPath"]);
      execFileSync("sh", ["scripts/git/install-hooks.sh"], { cwd: repo, stdio: "ignore", env: hermetic(process.env) });
    }
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
  test("checks skills using mise's bun when no bun is on PATH", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-path-"));
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      for (const tool of ["git", "cmp", "mktemp", "cat", "rm", "ssh-keygen"]) {
        symlinkSync(execFileSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).trim(), path.join(directory, tool));
      }
      writeFileSync(path.join(directory, "mise"), `#!/bin/sh\n[ "$1" = which ] && printf '%s\\n' '${process.execPath}'\n`, { mode: 0o755 });
      const push = git(["push", remote, "HEAD:refs/heads/main"], { ...process.env, PATH: directory });
      expect(push.ok, push.output).toBe(true);
      expect(push.output).toMatch(/"ok"\s*:\s*true/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
  test("refuses a push when a managed skill has drifted", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    const skill = path.join(repo, ".agents/skills/ship-pr/SKILL.md");
    const original = readFileSync(skill, "utf8");
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      expect(git(["push", "-q", remote, "HEAD:refs/heads/main"]).ok).toBe(true);
      expect(commit("test: exercise skill drift").ok).toBe(true);
      writeFileSync(skill, `${original}\nLocal drift\n`);
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok).toBe(false);
      expect(push.output).toContain("Locally edited or unmanaged skill");
      expect(push.output).not.toContain("agent attribution");
    } finally {
      writeFileSync(skill, original);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
  test("refuses worktree skill drift that matches the checked-out commit", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    const relative = ".claude/skills/ship-pr/SKILL.md";
    const skill = path.join(repo, relative);
    const original = readFileSync(skill, "utf8");
    const previousHead = git(["rev-parse", "HEAD"]).output.trim();
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      writeFileSync(skill, `${original}\nCommitted drift\n`);
      git(["add", relative]);
      expect(commit("test: commit managed skill drift").ok).toBe(true);
      expect(git(["diff", "HEAD", "--", relative]).output).toBe("");
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok).toBe(false);
      expect(push.output).toContain("Locally edited or unmanaged skill");
    } finally {
      // Only this disposable fixture is reset; leave no drift for later cases.
      git(["reset", "--hard", previousHead]);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
  test("explains how to install a missing shared tool", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    const installed = path.join(repo, "node_modules/@a2f0/agent-tool");
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      rmSync(installed);
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok).toBe(false);
      expect(push.output).toContain("Run bun install --ignore-scripts");
      expect(push.output).not.toContain("agent attribution");
    } finally {
      symlinkSync(path.join(root, "node_modules/@a2f0/agent-tool"), installed);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
  test("refuses a commit that reached the branch past commit-msg", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-hooks-remote-"));
    const previousHead = git(["rev-parse", "HEAD"]).output.trim();
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
      git(["reset", "--hard", previousHead]);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("push signature enforcement", () => {
  test("rejects an unsigned ancestor on existing and new branches, and permits deletions", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-signatures-remote-"));
    const previousHead = git(["rev-parse", "HEAD"]).output.trim();
    try {
      execFileSync("git", ["init", "--bare", "--quiet", "--initial-branch=unused", remote]);
      git(["remote", "add", "signatures", remote]);
      expect(git(["push", "signatures", "HEAD:refs/heads/main"]).ok).toBe(true);
      expect(git(["commit", "--no-gpg-sign", "--allow-empty", "-m", "test: unsigned ancestor"]).ok).toBe(true);
      const unsigned = git(["rev-parse", "HEAD"]).output.trim();
      expect(git(["commit", "--allow-empty", "-m", "test: signed tip"]).ok).toBe(true);
      for (const destination of ["main", "new-branch"]) {
        const push = git(["push", "signatures", `HEAD:refs/heads/${destination}`]);
        expect(push.ok).toBe(false);
        expect(push.output).toContain(unsigned);
        expect(push.output).toContain("missing or invalid signature");
      }
      // Deleting a ref carries no commits, even with an unsigned ancestor.
      expect(git(["push", "signatures", ":refs/heads/main"]).ok).toBe(true);
    } finally {
      git(["reset", "--hard", previousHead]);
      git(["remote", "remove", "signatures"]);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);

  test("refuses a stale installed signature checker before pushing", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-signatures-remote-"));
    const source = path.join(repo, "scripts/check-signed-commits.ts");
    const original = readFileSync(source, "utf8");
    try {
      execFileSync("git", ["init", "--bare", "--quiet", "--initial-branch=unused", remote]);
      writeFileSync(source, `${original}\n// changed\n`);
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok).toBe(false);
      expect(push.output).toContain("installed signature check is stale");
    } finally {
      writeFileSync(source, original);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);

  test("permits a signed push when SSH allowed signers are not configured", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-signatures-unverified-"));
    git(["config", "--unset", "gpg.ssh.allowedSignersFile"]);
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote]);
      expect(git(["log", "-1", "--format=%G?"]).output.trim()).toBe("N");
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok, push.output).toBe(true);
    } finally {
      git(["config", "gpg.ssh.allowedSignersFile", path.join(repo, "allowed-signers")]);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);

  test("permits signed pushes with log.showSignature enabled", () => {
    const remote = mkdtempSync(path.join(os.tmpdir(), "skyline-signatures-log-"));
    git(["config", "log.showSignature", "true"]);
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote]);
      const push = git(["push", remote, "HEAD:refs/heads/main"]);
      expect(push.ok, push.output).toBe(true);
    } finally {
      git(["config", "--unset", "log.showSignature"]);
      rmSync(remote, { recursive: true, force: true });
    }
  }, 60_000);
});
