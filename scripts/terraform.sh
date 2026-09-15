#!/usr/bin/env bash
# Runs Terraform for the skyline.devopsrockstars.com custom domain.
#
# Usage: scripts/terraform.sh <init|plan|apply|destroy|output> [terraform args...]
#
# Content deploys do not go through here. `npm run deploy` publishes the Worker;
# this stack only attaches the hostname to it.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <init|plan|apply|destroy|output> [terraform arguments...]" >&2
  exit 1
fi

ACTION="$1"
shift
case "$ACTION" in
  init | plan | apply | destroy | output) ;;
  *) echo "ERROR: Unsupported action: $ACTION" >&2; exit 1 ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=./secrets.sh
source "$REPO_ROOT/scripts/secrets.sh"
load_deploy_secrets
require_backend_credentials

STACK_DIR="$REPO_ROOT/terraform"
INIT_ARGS=()
if [[ "$ACTION" == init ]]; then INIT_ARGS=("$@"); fi

terraform -chdir="$STACK_DIR" init -input=false -reconfigure \
  -backend-config="$STACK_DIR/backend.hcl" "${INIT_ARGS[@]+"${INIT_ARGS[@]}"}" >&2

if [[ "$ACTION" == init ]]; then
  exit 0
fi

INPUT_ARGS=()
case "$ACTION" in plan | apply) INPUT_ARGS=(-input=false) ;; esac
terraform -chdir="$STACK_DIR" "$ACTION" "${INPUT_ARGS[@]+"${INPUT_ARGS[@]}"}" "$@"
