// scripts/secrets.sh loads Terraform's credentials from the .secrets link into matrix-secrets, and
// hands the R2 state key to the S3 backend under the AWS names it reads.
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
function load(repository: string, call = "load_deploy_secrets", env: Record<string, string> = {}, names = reported) {
  const script = `set -euo pipefail; source "$1"; ${call}; for name in ${names.join(" ")}; do printf '%s=%s\\n' "$name" "\${!name-<unset>}"; done`;
  const result = spawnSync("bash", ["-c", script, "load", loader], {
    cwd: repository, encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: repository, GIT_CONFIG_NOSYSTEM: "1", ...env },
  });
  const exported = Object.fromEntries(result.stdout.split("\n").filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  return { status: result.status, stderr: result.stderr, exported };
}

const pair = (token: string, account: string) => `export TF_VAR_cloudflare_api_token=${token}\nexport TF_VAR_cloudflare_account_id=${account}\n`;
const stateKey = (id: string, secret: string) => `TF_STATE_ACCESS_KEY_ID=${id}\nTF_STATE_SECRET_ACCESS_KEY=${secret}\n`;
// The AWS keys shared.env still holds from the old S3 backend, which must not reach Terraform.
const oldAws = "export AWS_ACCESS_KEY_ID=old-aws-key\nexport AWS_SECRET_ACCESS_KEY=old-aws-secret\nexport AWS_SESSION_TOKEN=old-aws-session\n";
const toState = "load_deploy_secrets; use_state_credentials";
const backendNames = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_PROFILE", "AWS_SESSION_TOKEN"];

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

  test("hands the prod tier's R2 state key to the backend under the AWS names", () => {
    const repository = checkout({ "prod/shared.env": pair("shared-token", "shared-account") + oldAws, "prod/app.env": stateKey("r2-key", "r2-secret") });
    const { status, exported } = load(repository, toState, { AWS_PROFILE: "profile", AWS_SESSION_TOKEN: "session" }, backendNames);
    expect(status).toBe(0);
    expect(exported).toEqual({ AWS_ACCESS_KEY_ID: "r2-key", AWS_SECRET_ACCESS_KEY: "r2-secret", AWS_PROFILE: "<unset>", AWS_SESSION_TOKEN: "<unset>" });
  });

  // Neither the old AWS keys nor an AWS profile can satisfy the R2 backend any more.
  test("fails with a pointer to app.env and the docs when the state key is missing", () => {
    const repository = checkout({ "prod/shared.env": pair("shared-token", "shared-account") + oldAws });
    const { status, stderr, exported } = load(repository, toState, { AWS_PROFILE: "profile" }, backendNames);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/R2 Terraform state backend needs, in \.secrets\/prod\/app\.env:\n\s+- TF_STATE_ACCESS_KEY_ID\n\s+- TF_STATE_SECRET_ACCESS_KEY\n/);
    expect(stderr).toContain("docs/deploying.md");
    expect(exported).toEqual({});
  });

  test("names only the half of the state key that is missing", () => {
    const repository = checkout({ "prod/app.env": pair("app-token", "app-account") + "TF_STATE_ACCESS_KEY_ID=r2-key\n" });
    const { status, stderr } = load(repository, toState, {}, backendNames);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/:\n\s+- TF_STATE_SECRET_ACCESS_KEY\n/);
    expect(stderr).not.toContain("TF_STATE_ACCESS_KEY_ID");
  });

  // Another project's key exported in the caller's shell must not stand in for Skyline's.
  test("takes the state key from the prod tier, not the caller's environment", () => {
    const ambient = { TF_STATE_ACCESS_KEY_ID: "other-key", TF_STATE_SECRET_ACCESS_KEY: "other-secret" };
    const missing = load(checkout({ "prod/app.env": pair("app-token", "app-account") }), toState, ambient, backendNames);
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toMatch(/- TF_STATE_ACCESS_KEY_ID\n\s+- TF_STATE_SECRET_ACCESS_KEY\n/);
    const tier = load(checkout({ "prod/app.env": pair("app-token", "app-account") + stateKey("r2-key", "r2-secret") }), toState, ambient, backendNames);
    expect(tier.status).toBe(0);
    expect(tier.exported["AWS_ACCESS_KEY_ID"]).toBe("r2-key");
    expect(tier.exported["AWS_SECRET_ACCESS_KEY"]).toBe("r2-secret");
  });
});
