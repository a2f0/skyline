#!/usr/bin/env bash
# Loads deployment credentials from the gitignored .secrets/root.env.
#
# Sourced, never executed. Callers run under `set -euo pipefail`, so every
# failure path here returns non-zero rather than leaving a half-set environment.

load_deploy_secrets() {
  local repo_root env_file
  repo_root="$(git rev-parse --show-toplevel)" || return 1
  env_file="$repo_root/.secrets/root.env"

  if [[ ! -f "$env_file" ]]; then
    echo "ERROR: $env_file not found." >&2
    echo "       See docs/deploying.md for the variables it needs." >&2
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a

  local missing=()
  [[ -z "${TF_VAR_cloudflare_api_token:-}" ]] && missing+=("TF_VAR_cloudflare_api_token")
  [[ -z "${TF_VAR_cloudflare_account_id:-}" ]] && missing+=("TF_VAR_cloudflare_account_id")
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: $env_file is missing required variables:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    return 1
  fi

  # Terraform's Cloudflare provider reads these names; it also reads the
  # TF_VAR_ ones above. Wrangler deploys authenticate separately with their own
  # stored credentials; this file is only for terraform.sh.
  export CLOUDFLARE_API_TOKEN="${TF_VAR_cloudflare_api_token}"
  export CLOUDFLARE_ACCOUNT_ID="${TF_VAR_cloudflare_account_id}"
}

# Terraform's S3 backend needs AWS credentials; wrangler does not.
require_backend_credentials() {
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    return 0
  fi

  local missing=()
  [[ -z "${AWS_ACCESS_KEY_ID:-}" ]] && missing+=("AWS_ACCESS_KEY_ID")
  [[ -z "${AWS_SECRET_ACCESS_KEY:-}" ]] && missing+=("AWS_SECRET_ACCESS_KEY")
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: The S3 Terraform backend needs:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    return 1
  fi
}
