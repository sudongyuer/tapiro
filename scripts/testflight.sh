#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { printf '\n==> %s\n' "$*"; }
fail() {
  printf 'testflight: %s\n' "$*" >&2
  exit 1
}

source "$ROOT/scripts/release-env.sh"

step "Preflight"
release_preflight
if [ -n "$(git status --porcelain)" ] && [ "${TAPIRO_ALLOW_DIRTY:-}" != 1 ]; then
  fail "working tree has uncommitted changes; commit them or set TAPIRO_ALLOW_DIRTY=1"
fi

VERSION="$(node -p "require('./app.json').expo.version")"
BUILD_NUMBER="${TAPIRO_BUILD_NUMBER:-$(date -u +%Y%m%d.%H%M)}"
OUT="$ROOT/.testflight/$VERSION-$BUILD_NUMBER"
ARCHIVE="$OUT/Tapiro.xcarchive"
mkdir -p "$OUT"
echo "Version $VERSION, build $BUILD_NUMBER, output $OUT"

step "Hosted Supabase anon key"
hosted_supabase_env

step "Prebuild"
release_prebuild "$OUT/prebuild.log"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/Tapiro/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" ios/Tapiro/Info.plist

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
  fail "archive failed (a team with no registered device cannot make the development profile the archive signs with)"
fi

step "Check the archive"
APP="$ARCHIVE/Products/Applications/Tapiro.app"
check_bundle "$APP"
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

step "App Store Connect processing"
status=0
node "$ROOT/scripts/asc-upload-status.mjs" "$VERSION" "$BUILD_NUMBER" --wait "${TAPIRO_PROCESSING_WAIT:-900}" || status=$?
case "$status" in
  0) echo "Tapiro $VERSION ($BUILD_NUMBER) passed processing." ;;
  3) echo "Uploaded Tapiro $VERSION ($BUILD_NUMBER); still processing. Check: node scripts/asc-upload-status.mjs $VERSION $BUILD_NUMBER" ;;
  *) fail "App Store Connect rejected $VERSION ($BUILD_NUMBER)" ;;
esac
