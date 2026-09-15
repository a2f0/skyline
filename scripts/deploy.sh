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

node "$REPO_ROOT/scripts/build-site.cjs"
npx --prefix "$REPO_ROOT" wrangler deploy --config "$REPO_ROOT/wrangler.jsonc" "$@"
