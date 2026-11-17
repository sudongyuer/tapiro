#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: scripts/merge-when-green.sh <pr-number>" >&2
  echo "  MERGE_WAIT_FOR_CHECKS_SECONDS (default 300): how long to wait for the first check to register" >&2
  exit 2
}

[[ $# -eq 1 && $1 =~ ^[0-9]+$ ]] || usage
pr=$1
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
wait_seconds=${MERGE_WAIT_FOR_CHECKS_SECONDS:-300}
poll_seconds=${MERGE_POLL_SECONDS:-10}

gate() {
  gh pr view "$pr" --json headRefOid,statusCheckRollup | node "$here/merge-gate.mjs"
}

deadline=$((SECONDS + wait_seconds))
while true; do
  verdict=$(gate 2>/dev/null || true)
  [[ $verdict != none && -n $verdict ]] && break
  if ((SECONDS >= deadline)); then
    echo "merge-when-green: PR #$pr has no checks after ${wait_seconds}s; not merging" >&2
    exit 1
  fi
  echo "merge-when-green: waiting for checks on PR #$pr to register..." >&2
  sleep "$poll_seconds"
done

if ! gh pr checks "$pr" --watch --fail-fast --interval "$poll_seconds"; then
  echo "merge-when-green: checks on PR #$pr did not all pass; not merging" >&2
  exit 1
fi

view=$(gh pr view "$pr" --json headRefOid,statusCheckRollup)
head=$(printf '%s' "$view" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).headRefOid ?? "")')
if [[ -z $head ]] || ! printf '%s' "$view" | node "$here/merge-gate.mjs"; then
  echo "merge-when-green: status rollup for PR #$pr is not green; not merging" >&2
  exit 1
fi

gh pr merge "$pr" --squash --match-head-commit "$head"
