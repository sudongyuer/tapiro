#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TEAM_ID="${TAPIRO_TEAM_ID:-4RML7RLKML}"
ASC_KEY_ID="${TAPIRO_ASC_KEY_ID:-5TGB2NXCG5}"
ASC_ISSUER_ID="${TAPIRO_ASC_ISSUER_ID:-aaabce4e-636b-4c19-bed9-d6840d0a2465}"
ASC_KEY_PATH="${TAPIRO_ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
SUPABASE_REF="${TAPIRO_SUPABASE_REF:-wkpgoildusumtejzhtkv}"
SUPABASE_URL="https://${SUPABASE_REF}.supabase.co"
MIN_FREE_GB=15

step() { printf '\n==> %s\n' "$*"; }
fail() {
  printf 'testflight: %s\n' "$*" >&2
  exit 1
}
show_failure() {
  grep -E 'error:|\*\* (ARCHIVE|EXPORT) FAILED' "$1" | head -n 40 || tail -n 40 "$1"
  echo "Full log: $1" >&2
}

step "Preflight"
for tool in xcodebuild jq supabase bunx /usr/libexec/PlistBuddy; do
  command -v "$tool" > /dev/null || fail "$tool not found"
done
[ -f "$ASC_KEY_PATH" ] || fail "App Store Connect API key not found at $ASC_KEY_PATH"
if [ -n "$(git status --porcelain)" ] && [ "${TAPIRO_ALLOW_DIRTY:-}" != 1 ]; then
  fail "working tree has uncommitted changes; commit them or set TAPIRO_ALLOW_DIRTY=1"
fi
free_gb=$(df -g "$ROOT" | awk 'NR == 2 { print $4 }')
[ "$free_gb" -ge "$MIN_FREE_GB" ] || fail "only ${free_gb} GB free; a Release build needs ${MIN_FREE_GB} GB"
NODE="$(PATH=/opt/homebrew/bin:$PATH command -v node)"

VERSION="$(node -p "require('./app.json').expo.version")"
BUILD_NUMBER="${TAPIRO_BUILD_NUMBER:-$(date -u +%Y%m%d.%H%M)}"
OUT="$ROOT/.testflight/$VERSION-$BUILD_NUMBER"
ARCHIVE="$OUT/Tapiro.xcarchive"
mkdir -p "$OUT"
echo "Version $VERSION, build $BUILD_NUMBER, output $OUT"

step "Hosted Supabase anon key"
ANON_KEY="${TAPIRO_SUPABASE_ANON_KEY:-}"
if [ -z "$ANON_KEY" ]; then
  ANON_KEY="$(supabase projects api-keys --project-ref "$SUPABASE_REF" -o json | jq -r '.[] | select(.name == "anon") | .api_key')"
fi
[ -n "$ANON_KEY" ] && [ "$ANON_KEY" != null ] || fail "could not read the anon key of $SUPABASE_REF (supabase login?)"

# Release values come only from this script: .env files may point at the local stack or turn on verify mode.
export EXPO_NO_DOTENV=1
export EXPO_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
unset EXPO_PUBLIC_UI_VERIFY TAPIRO_LIVE_ACTIVITY

step "Prebuild"
CI=1 bunx expo prebuild --clean --platform ios > "$OUT/prebuild.log" 2>&1 || {
  tail -n 40 "$OUT/prebuild.log"
  fail "expo prebuild failed; full log: $OUT/prebuild.log"
}
printf 'export NODE_BINARY=%s\n' "$NODE" > ios/.xcode.env.local
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/Tapiro/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" ios/Tapiro/Info.plist

AUTH=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

step "Archive"
if ! xcodebuild \
  -workspace ios/Tapiro.xcworkspace \
  -scheme Tapiro \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  "${AUTH[@]}" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  archive > "$OUT/archive.log" 2>&1; then
  show_failure "$OUT/archive.log"
  fail "archive failed"
fi

step "Check the archive"
APP="$ARCHIVE/Products/Applications/Tapiro.app"
grep -aq "$SUPABASE_URL" "$APP/main.jsbundle" || fail "the JS bundle does not contain $SUPABASE_URL"
if grep -aqE '127\.0\.0\.1:54321|localhost:54321' "$APP/main.jsbundle"; then
  fail "the JS bundle contains a local Supabase URL"
fi
[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Info.plist")" = "$BUILD_NUMBER" ] ||
  fail "the archived Info.plist does not carry build $BUILD_NUMBER"
codesign -d --entitlements - --xml "$APP" 2> /dev/null > "$OUT/entitlements.plist"
for key in aps-environment com.apple.developer.applesignin; do
  /usr/libexec/PlistBuddy -c "Print :$key" "$OUT/entitlements.plist" > /dev/null 2>&1 ||
    fail "the archived app lacks the $key entitlement"
done

step "Export and upload to App Store Connect"
cat > "$OUT/ExportOptions.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>upload</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
PLIST
if ! xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" \
  "${AUTH[@]}" > "$OUT/export.log" 2>&1; then
  show_failure "$OUT/export.log"
  fail "export or upload failed"
fi
grep -q 'EXPORT SUCCEEDED' "$OUT/export.log" || fail "xcodebuild exited 0 without EXPORT SUCCEEDED; see $OUT/export.log"
grep -E 'Upload succeeded|Uploaded|EXPORT SUCCEEDED' "$OUT/export.log" | tail -n 5

echo
echo "Uploaded Tapiro $VERSION ($BUILD_NUMBER). App Store Connect processes it before TestFlight lists it."
