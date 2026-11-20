# Sourced by scripts/testflight.sh and scripts/device-install.sh: release identifiers, the hosted Supabase values and
# a fresh prebuild. Expects ROOT, step and fail from the caller.

TEAM_ID="${TAPIRO_TEAM_ID:-4RML7RLKML}"
ASC_KEY_ID="${TAPIRO_ASC_KEY_ID:-5TGB2NXCG5}"
ASC_ISSUER_ID="${TAPIRO_ASC_ISSUER_ID:-aaabce4e-636b-4c19-bed9-d6840d0a2465}"
ASC_KEY_PATH="${TAPIRO_ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
SUPABASE_REF="${TAPIRO_SUPABASE_REF:-wkpgoildusumtejzhtkv}"
SUPABASE_URL="https://${SUPABASE_REF}.supabase.co"
MIN_FREE_GB=15

AUTH=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

release_preflight() {
  for tool in xcodebuild jq supabase bunx /usr/libexec/PlistBuddy; do
    command -v "$tool" > /dev/null || fail "$tool not found"
  done
  [ -f "$ASC_KEY_PATH" ] || fail "App Store Connect API key not found at $ASC_KEY_PATH"
  local free_gb
  free_gb=$(df -g "$ROOT" | awk 'NR == 2 { print $4 }')
  [ "$free_gb" -ge "$MIN_FREE_GB" ] || fail "only ${free_gb} GB free; a Release build needs ${MIN_FREE_GB} GB"
}

hosted_supabase_env() {
  local anon_key="${TAPIRO_SUPABASE_ANON_KEY:-}"
  if [ -z "$anon_key" ]; then
    anon_key="$(supabase projects api-keys --project-ref "$SUPABASE_REF" -o json | jq -r '.[] | select(.name == "anon") | .api_key')"
  fi
  [ -n "$anon_key" ] && [ "$anon_key" != null ] || fail "could not read the anon key of $SUPABASE_REF (supabase login?)"
  # Release values come only from here: .env files may point at the local stack or turn on verify mode.
  export EXPO_NO_DOTENV=1
  export EXPO_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
  export EXPO_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
  unset EXPO_PUBLIC_UI_VERIFY TAPIRO_LIVE_ACTIVITY
}

release_prebuild() {
  local log="$1"
  CI=1 bunx expo prebuild --clean --platform ios > "$log" 2>&1 || {
    tail -n 40 "$log"
    fail "expo prebuild failed; full log: $log"
  }
  printf 'export NODE_BINARY=%s\n' "$(PATH=/opt/homebrew/bin:$PATH command -v node)" > "$ROOT/ios/.xcode.env.local"
}

show_failure() {
  grep -E 'error:|\*\* (ARCHIVE|EXPORT|BUILD) FAILED' "$1" | head -n 40 || tail -n 40 "$1"
  echo "Full log: $1" >&2
}

check_bundle() {
  local app="$1"
  grep -aq "$SUPABASE_URL" "$app/main.jsbundle" || fail "the JS bundle does not contain $SUPABASE_URL"
  if grep -aqE '127\.0\.0\.1:54321|localhost:54321' "$app/main.jsbundle"; then
    fail "the JS bundle contains a local Supabase URL"
  fi
}
