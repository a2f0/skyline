// scripts/secrets.sh loads Terraform's credentials from the .secrets link into matrix-secrets.
// Each case runs the real loader in a throwaway Git repository whose .secrets links to a fixture
// folder laid out like matrix-secrets, under a clean environment so the caller's own credentials
// cannot satisfy it. The values are fixtures; no real secret is read.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const loader = path.resolve(import.meta.dirname, "..", "scripts", "secrets.sh");
const reported = ["TF_VAR_cloudflare_api_token", "TF_VAR_cloudflare_account_id", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
const scratches: string[] = [];

afterEach(() => {
  for (const scratch of scratches.splice(0)) rmSync(scratch, { recursive: true, force: true });
});

// A checkout whose .secrets links to <scratch>/matrix-secrets/skyline, holding `files` (paths
// relative to the project folder) and the empty tier folders every project has.
function checkout(files: Record<string, string>) {
  const scratch = mkdtempSync(path.join(tmpdir(), "skyline-secrets-"));
  scratches.push(scratch);
  const project = path.join(scratch, "matrix-secrets", "skyline"), repository = path.join(scratch, "skyline");
  for (const folder of ["prod", "staging", "ci"]) mkdirSync(path.join(project, folder), { recursive: true });
  for (const [name, contents] of Object.entries(files)) writeFileSync(path.join(project, name), contents);
  mkdirSync(repository);
  const init = spawnSync("git", ["init", "--quiet", repository], { encoding: "utf8" });
  if (init.status !== 0) throw new Error(`git init failed: ${init.stderr}`);
  symlinkSync(path.join("..", "matrix-secrets", "skyline"), path.join(repository, ".secrets"));
  return repository;
}

// Sources the loader under the callers' strict mode and prints what it exported.
function load(repository: string, call = "load_deploy_secrets", env: Record<string, string> = {}) {
  const script = `set -euo pipefail; source "$1"; ${call}; for name in ${reported.join(" ")}; do printf '%s=%s\\n' "$name" "\${!name-<unset>}"; done`;
  const result = spawnSync("bash", ["-c", script, "load", loader], {
    cwd: repository, encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: repository, GIT_CONFIG_NOSYSTEM: "1", ...env },
  });
  const exported = Object.fromEntries(result.stdout.split("\n").filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  return { status: result.status, stderr: result.stderr, exported };
}

const pair = (token: string, account: string) => `export TF_VAR_cloudflare_api_token=${token}\nexport TF_VAR_cloudflare_account_id=${account}\n`;

describe("deploy secrets loader", () => {
  test("loads prod/shared.env and re-exports the Cloudflare pair", () => {
    const { status, exported } = load(checkout({ "prod/shared.env": pair("shared-token", "shared-account") }));
    expect(status).toBe(0);
    expect(exported).toEqual({
      TF_VAR_cloudflare_api_token: "shared-token", TF_VAR_cloudflare_account_id: "shared-account",
      CLOUDFLARE_API_TOKEN: "shared-token", CLOUDFLARE_ACCOUNT_ID: "shared-account",
    });
  });

  test("loads prod/app.env after shared.env, so the project's own value wins", () => {
    const { status, exported } = load(checkout({
      "prod/shared.env": pair("shared-token", "shared-account"),
      "prod/app.env": "TF_VAR_cloudflare_api_token=app-token\n",
    }));
    expect(status).toBe(0);
    expect(exported["CLOUDFLARE_API_TOKEN"]).toBe("app-token");
    expect(exported["CLOUDFLARE_ACCOUNT_ID"]).toBe("shared-account");
  });

  test("accepts prod/app.env alone", () => {
    const { status, exported } = load(checkout({ "prod/app.env": pair("app-token", "app-account") }));
    expect(status).toBe(0);
    expect(exported["CLOUDFLARE_ACCOUNT_ID"]).toBe("app-account");
  });

  // The old root.env, the CI values, and the empty staging tier must not stand in for prod/.
  test("fails with a pointer to the docs when neither prod file exists", () => {
    const { status, stderr, exported } = load(checkout({
      "root.env": pair("old-token", "old-account"),
      "ci/secrets.env": pair("ci-token", "ci-account"),
    }));
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/neither \S*\.secrets\/prod\/shared\.env nor \S*\.secrets\/prod\/app\.env was found/);
    expect(stderr).toContain("docs/deploying.md");
    expect(exported).toEqual({});
  });

  test("fails with a pointer to the docs when the prod files leave a required name unset", () => {
    const { status, stderr } = load(checkout({
      "prod/shared.env": "export AWS_ACCESS_KEY_ID=key\n",
      "prod/app.env": "TF_VAR_cloudflare_account_id=app-account\n",
    }));
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/\.secrets\/prod\/shared\.env\n\s+\S*\.secrets\/prod\/app\.env\nMissing:\n\s+- TF_VAR_cloudflare_api_token\n/);
    expect(stderr).not.toContain("TF_VAR_cloudflare_account_id");
    expect(stderr).toContain("docs/deploying.md");
  });

  test("fails when the .secrets link points nowhere", () => {
    const repository = checkout({});
    rmSync(path.join(repository, "..", "matrix-secrets"), { recursive: true });
    const { status, stderr } = load(repository);
    expect(status).not.toBe(0);
    expect(stderr).toContain("../matrix-secrets/skyline");
  });

  test("keeps the S3 backend credential check", () => {
    const repository = checkout({});
    const missing = load(repository, "require_backend_credentials");
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toMatch(/S3 Terraform backend needs:\n\s+- AWS_ACCESS_KEY_ID\n\s+- AWS_SECRET_ACCESS_KEY\n/);
    expect(load(repository, "require_backend_credentials", { AWS_PROFILE: "profile" }).status).toBe(0);
    expect(load(repository, "require_backend_credentials", { AWS_ACCESS_KEY_ID: "key", AWS_SECRET_ACCESS_KEY: "secret" }).status).toBe(0);
  });
});
