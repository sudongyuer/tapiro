#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { printf '\n==> %s\n' "$*"; }
fail() {
  printf 'device-install: %s\n' "$*" >&2
  exit 1
}

source "$ROOT/scripts/release-env.sh"

DEVICE="${1:-${TAPIRO_DEVICE:-}}"
[ -n "$DEVICE" ] || fail "usage: bun run device-install <udid>  (xcrun devicectl list devices shows connected iPhones)"
OUT="$ROOT/.testflight/device"
mkdir -p "$OUT"

step "Preflight"
release_preflight
xcrun devicectl list devices --json-output "$OUT/devices.json" > /dev/null 2>&1 || fail "devicectl could not list devices"
DEVICE_OS="$(jq -r --arg udid "$DEVICE" '.result.devices[] | select(.hardwareProperties.udid == $udid) | .deviceProperties.osVersionNumber // empty' "$OUT/devices.json")"
[ -n "$DEVICE_OS" ] || fail "no paired iPhone with UDID $DEVICE (connect it, unlock it and trust this Mac)"
MIN_OS="$(node -p "require('./app.json').expo.ios.deploymentTarget")"
[ "${DEVICE_OS%%.*}" -ge "${MIN_OS%%.*}" ] || fail "the iPhone runs iOS $DEVICE_OS; Tapiro needs iOS $MIN_OS or later"

step "Hosted Supabase and Google values"
hosted_release_env

if [ "${TAPIRO_SKIP_PREBUILD:-}" = 1 ] && [ -d ios/Tapiro.xcworkspace ]; then
  step "Prebuild skipped (TAPIRO_SKIP_PREBUILD=1)"
else
  step "Prebuild"
  release_prebuild "$OUT/prebuild.log"
fi

step "Build Release"
if ! xcodebuild \
  -workspace ios/Tapiro.xcworkspace \
  -scheme Tapiro \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$OUT/DerivedData" \
  "${AUTH[@]}" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  build > "$OUT/build.log" 2>&1; then
  show_failure "$OUT/build.log"
  fail "build failed"
fi
APP="$OUT/DerivedData/Build/Products/Release-iphoneos/Tapiro.app"
check_bundle "$APP"

step "Install and launch"
xcrun devicectl device install app --device "$DEVICE" "$APP" > "$OUT/install.log" 2>&1 || {
  cat "$OUT/install.log"
  fail "install failed (is the iPhone unlocked, trusted and in Developer Mode?)"
}
xcrun devicectl device process launch --device "$DEVICE" app.tapiro > /dev/null 2>&1 ||
  echo "Installed; launch it from the home screen (the phone may be locked)."
echo "Tapiro (Release, hosted Supabase) is on $DEVICE."
