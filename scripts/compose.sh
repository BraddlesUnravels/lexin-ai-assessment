#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$root"

exec docker compose \
  -f "$root/docker/compose-db.yml" \
  -f "$root/docker/compose-api.yml" \
  -f "$root/docker/compose-ui.yml" \
  "$@"
