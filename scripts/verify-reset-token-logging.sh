#!/usr/bin/env bash
set -euo pipefail
# Verify the effective proxy logging chain manually after deployment.
# Run the probe against an environment where you are authorized to inspect ALL access logs.
# It MUST NOT be used with a genuine reset token.
: "${WORKOUTS_BASE_URL:?Set WORKOUTS_BASE_URL to the deployment URL}"
marker="WORKOUTS_RESET_LOG_PROBE_$(date +%s)_$$"
curl --silent --show-error --location --output /dev/null \
  "${WORKOUTS_BASE_URL%/}/reset-password?token=${marker}"
printf 'Synthetic marker: %s\n' "$marker"
printf 'Search ALL relevant Cloudflare, edge, reverse proxy, runtime nginx and collector logs for this marker.\n'
printf 'The frontend nginx configuration suppresses only its own access log. Other proxies must be verified separately.\n'
