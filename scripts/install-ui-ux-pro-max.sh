#!/usr/bin/env bash
set -euo pipefail
# Install the upstream skill into this project, rather than a third-party copy.
# Requires Node.js, network access, and interactive permission to run npx.
cd "$(dirname "$0")/.."
npx skills@latest add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
