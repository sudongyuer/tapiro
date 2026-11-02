#!/usr/bin/env bash
# The shared `tapiro` stack holds other worktrees' local data; this runs pgTAP on a throwaway stack instead.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: scripts/db-isolated.sh <name> <port-prefix, e.g. 565>" >&2
  exit 2
fi

name="$1"
prefix="$2"
root="$(cd "$(dirname "$0")/.." && pwd)"
work="${TMPDIR:-/tmp}/tapiro-db-${name}"

for port in "${prefix}20" "${prefix}21" "${prefix}22" "${prefix}23" "${prefix}24" "${prefix}27" "${prefix}29"; do
  if lsof -iTCP:"$port" -sTCP:LISTEN -nP >/dev/null 2>&1; then
    echo "port $port is in use; pick another prefix" >&2
    exit 1
  fi
done

rm -rf "$work"
mkdir -p "$work/supabase"
rsync -a --exclude .temp --exclude .branches "$root/supabase/" "$work/supabase/"
sed -i '' -E \
  -e "s/^project_id = \"tapiro\"/project_id = \"tapiro-${name}\"/" \
  -e "s/^inspector_port = 8083/inspector_port = 1${prefix}3/" \
  -e "s/^(port|shadow_port) = 543([0-9]{2})$/\1 = ${prefix}\2/" \
  "$work/supabase/config.toml"

stop() { supabase stop --no-backup --workdir "$work" >/dev/null 2>&1 || true; }
trap stop EXIT

supabase start --workdir "$work" -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,inbucket >/dev/null
supabase test db --workdir "$work"
