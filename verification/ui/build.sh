#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DERIVED="$ROOT/.verify/DerivedData"

cd "$ROOT"
STARTED=$SECONDS
STAMP=ios/.verify-prebuild-stamp
NATIVE_INPUTS=(app.json package.json bun.lock plugins src/lib/i18n/native modules/tapiro-kit)
EXPO_MAJOR="expo-$(node -p "require('expo/package.json').version.split('.')[0]")"
# A plain prebuild keeps template files from an older SDK (AppDelegate, scene delegate), so an SDK change starts clean.
if [ "$(cat "$STAMP" 2>/dev/null)" != "$EXPO_MAJOR" ]; then
  CI=1 bunx expo prebuild --clean --platform ios
  echo "$EXPO_MAJOR" > "$STAMP"
# A workspace that exists can still predate config-plugin changes; prebuild whenever a native input is newer.
elif [ ! -d ios/Tapiro.xcworkspace ] || [ -n "$(find "${NATIVE_INPUTS[@]}" -newer "$STAMP" -not -name '*.ts' -not -name '*.tsx' -print -quit 2>/dev/null)" ]; then
  CI=1 bunx expo prebuild --platform ios
  echo "$EXPO_MAJOR" > "$STAMP"
fi
# pod install writes the first node on PATH, which can be too old to bundle.
printf 'export NODE_BINARY=%s\n' "$(PATH=/opt/homebrew/bin:$PATH command -v node)" > ios/.xcode.env.local

LOG="$ROOT/.verify/build.log"
mkdir -p "$ROOT/.verify"
# The JS bundle is produced inside the Xcode build phase; the flag must reach it there.
if ! EXPO_PUBLIC_UI_VERIFY=1 xcodebuild \
  -workspace ios/Tapiro.xcworkspace \
  -scheme Tapiro \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED" \
  build > "$LOG" 2>&1; then
  # xcodebuild prints its summary after the error, so a plain tail hides why the build failed.
  grep -E 'error:|BUILD FAILED' "$LOG" | head -n 40 || tail -n 40 "$LOG"
  echo "Full log: $LOG"
  exit 1
fi
tail -n 20 "$LOG"

echo "Build wall-clock: $((SECONDS - STARTED)) s"
echo "$DERIVED/Build/Products/Release-iphonesimulator/Tapiro.app"
