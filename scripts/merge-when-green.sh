#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: scripts/merge-when-green.sh <pr-number>" >&2
  echo "  MERGE_WAIT_FOR_CHECKS_SECONDS (default 300): how long to wait for the pushed head's checks to register" >&2
  exit 2
}

[[ $# -eq 1 && $1 =~ ^[0-9]+$ ]] || usage
pr=$1
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
wait_seconds=${MERGE_WAIT_FOR_CHECKS_SECONDS:-300}
poll_seconds=${MERGE_POLL_SECONDS:-10}

field() {
  node -e 'const v=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(String(process.argv[1].split(".").reduce((o,k)=>o?.[k],v)??""))' "$1"
}

# The pull request's head and check rollup lag a push by seconds; the branch ref does not.
ref=$(gh pr view "$pr" --json headRefName,headRepository)
branch=$(printf '%s' "$ref" | field headRefName)
repo=$(printf '%s' "$ref" | field headRepository.nameWithOwner)
expected=$(gh api "repos/$repo/git/ref/heads/$branch" --jq .object.sha 2>/dev/null || true)
if [[ ! $expected =~ ^[0-9a-f]{40}$ ]]; then
  echo "merge-when-green: cannot read the head of $repo:$branch; not merging" >&2
  exit 1
fi

gate() {
  gh pr view "$pr" --json headRefOid,statusCheckRollup | node "$here/merge-gate.mjs" "$expected"
}

deadline=$((SECONDS + wait_seconds))
while true; do
  verdict=$(gate 2>/dev/null || true)
  [[ $verdict != none && $verdict != stale && -n $verdict ]] && break
  if ((SECONDS >= deadline)); then
    echo "merge-when-green: PR #$pr has no checks on ${expected:0:12} after ${wait_seconds}s; not merging" >&2
    exit 1
  fi
  echo "merge-when-green: waiting for checks on ${expected:0:12} (PR #$pr) to register..." >&2
  sleep "$poll_seconds"
done

if ! gh pr checks "$pr" --watch --fail-fast --interval "$poll_seconds"; then
  echo "merge-when-green: checks on PR #$pr did not all pass; not merging" >&2
  exit 1
fi

if ! gate; then
  echo "merge-when-green: status rollup for PR #$pr on ${expected:0:12} is not green; not merging" >&2
  exit 1
fi

gh pr merge "$pr" --squash --match-head-commit "$expected"
