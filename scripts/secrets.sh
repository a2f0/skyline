#!/usr/bin/env bash
# Loads deployment credentials from the gitignored .secrets link, which points at
# Skyline's folder in the matrix-secrets repository (see docs/deploying.md).
#
# Skyline has one tier, production, so everything here reads .secrets/prod/:
# shared.env holds values copied from the cross-project root file and app.env
# Skyline's own, including the R2 key for Terraform's state. Each is loaded when
# present, shared.env first, so app.env wins.
# .secrets/ci/ holds GitHub Actions values the matrix repository deploys; nothing
# here reads it.
#
# Sourced, never executed. Callers run under `set -euo pipefail`, so every
# failure path here returns non-zero rather than leaving a half-set environment.

load_deploy_secrets() {
  local repo_root tier_dir env_file
  local loaded=()
  repo_root="$(git rev-parse --show-toplevel)" || return 1
  tier_dir="$repo_root/.secrets/prod"

  # The state key must come from this tier, never from the caller's shell, where
  # another project's key could stand in for Skyline's.
  unset TF_STATE_ACCESS_KEY_ID TF_STATE_SECRET_ACCESS_KEY

  for env_file in "$tier_dir/shared.env" "$tier_dir/app.env"; do
    [[ -f "$env_file" ]] || continue
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    loaded+=("$env_file")
  done

  if [[ ${#loaded[@]} -eq 0 ]]; then
    echo "ERROR: neither $tier_dir/shared.env nor $tier_dir/app.env was found." >&2
    echo "       .secrets must link to ../matrix-secrets/skyline; see docs/deploying.md" >&2
    echo "       for the link and the variables it needs." >&2
    return 1
  fi

  local missing=()
  [[ -z "${TF_VAR_cloudflare_api_token:-}" ]] && missing+=("TF_VAR_cloudflare_api_token")
  [[ -z "${TF_VAR_cloudflare_account_id:-}" ]] && missing+=("TF_VAR_cloudflare_account_id")
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: required variables are still unset after loading:" >&2
    printf '  %s\n' "${loaded[@]}" >&2
    echo "Missing:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    echo "See docs/deploying.md for the variables they need." >&2
    return 1
  fi

  # Terraform's Cloudflare provider reads these names; it also reads the
  # TF_VAR_ ones above. Wrangler deploys authenticate separately with their own
  # stored credentials; these files are only for terraform.sh.
  export CLOUDFLARE_API_TOKEN="${TF_VAR_cloudflare_api_token}"
  export CLOUDFLARE_ACCOUNT_ID="${TF_VAR_cloudflare_account_id}"
}

# Terraform's state lives in Skyline's own Cloudflare R2 bucket, which the S3
# backend in terraform/versions.tf reaches with the R2 key in .secrets/prod/app.env.
# Call after load_deploy_secrets, and only on the way to Terraform; wrangler
# needs none of this.
use_state_credentials() {
  local missing=()
  [[ -z "${TF_STATE_ACCESS_KEY_ID:-}" ]] && missing+=("TF_STATE_ACCESS_KEY_ID")
  [[ -z "${TF_STATE_SECRET_ACCESS_KEY:-}" ]] && missing+=("TF_STATE_SECRET_ACCESS_KEY")
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: The R2 Terraform state backend needs, in .secrets/prod/app.env:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    echo "See docs/deploying.md for the state bucket and its key." >&2
    return 1
  fi

  # The backend reads the AWS names. Only the R2 key may fill them: an ambient
  # profile or session token, or AWS keys left in shared.env, cannot redirect it.
  unset AWS_PROFILE AWS_SESSION_TOKEN
  export AWS_ACCESS_KEY_ID="$TF_STATE_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$TF_STATE_SECRET_ACCESS_KEY"
}
