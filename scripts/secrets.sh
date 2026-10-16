#!/usr/bin/env bash
# Loads deployment credentials from the gitignored .secrets link, which points at
# Skyline's folder in the matrix-secrets repository (see docs/deploying.md).
#
# Skyline has one tier, production, so everything here reads .secrets/prod/:
# shared.env holds values copied from the cross-project root file and app.env
# Skyline's own. Each is loaded when present, shared.env first, so app.env wins.
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
