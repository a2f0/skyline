#!/usr/bin/env bash
# Publishes the site to the skyline-devopsrockstars Worker.
#
# Usage: scripts/deploy.sh [wrangler arguments...]
#
# Run scripts/terraform.sh apply once to attach skyline.devopsrockstars.com to
# the Worker. After that this script is the whole content deploy.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=./secrets.sh
source "$REPO_ROOT/scripts/secrets.sh"
load_deploy_secrets

bun "$REPO_ROOT/scripts/build-site.ts"
# --bun runs Wrangler on the Bun runtime instead of its node shebang, so a
# deploy needs no Node installation at all.
(cd "$REPO_ROOT" && bunx --bun wrangler deploy --config "$REPO_ROOT/wrangler.jsonc" "$@")

# wrangler reporting success is not the same as the edge serving the files, so check. A run that
# uploaded nothing has nothing to verify, and verifying anyway would report the previous deploy as
# though it were this one. SKYLINE_SKIP_VERIFY must be exactly 1 to skip, so that setting it to 0
# to force verification does not quietly disable it.
# Only --dry-run means nothing was published: --outdir and --outfile still upload. And the verifier
# knows one origin, so a run aimed at another Worker must not be checked against production, which
# would report the previous deploy as though it were this one. --name carrying the configured
# Worker's own name is that same Worker, so it still verifies: a skip message that is false is its
# own defect. A malformed, missing or nameless config reads as empty, and a --name run then skips.
# This is a comment strip rather than a JSONC parser, so a config carrying /* and */ inside string
# values could yield a wrong name instead of none; that needs a pathological file we own and a
# --name flag matching it.
configured_name="$(bun -e '
  const fs = await import("node:fs");
  const raw = fs.readFileSync(process.argv[1], "utf8");
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  try { process.stdout.write(String(JSON.parse(stripped).name || "")); } catch {}
' "$REPO_ROOT/wrangler.jsonc" 2>/dev/null || true)"

published=true
named=""
named_given=false
other_env=false
arguments=("$@")
for ((i = 0; i < ${#arguments[@]}; i++)); do
  case "${arguments[i]}" in
    --dry-run) published=false ;;
    --env|-e|--env=*) other_env=true ;;
    --name) named_given=true; named="${arguments[i+1]:-}" ;;
    --name=*) named_given=true; named="${arguments[i]#--name=}" ;;
  esac
done

target_is_production=true
if [[ "$other_env" == true ]]; then
  target_is_production=false
elif [[ "$named_given" == true && ( -z "$configured_name" || "$named" != "$configured_name" ) ]]; then
  target_is_production=false
fi

if [[ "${SKYLINE_SKIP_VERIFY:-}" == "1" ]]; then
  echo "Skipping deploy verification (SKYLINE_SKIP_VERIFY=1)."
elif [[ "$published" != true ]]; then
  echo "Skipping deploy verification: --dry-run published nothing."
elif [[ "$target_is_production" != true ]]; then
  echo "Skipping deploy verification: this run targeted another Worker."
  echo "Check it with: bun run verify:deploy -- --url <that origin>"
else
  bun "$REPO_ROOT/scripts/verify-deploy.ts"
fi
