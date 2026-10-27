#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DERIVED="$ROOT/.verify/DerivedData"

cd "$ROOT"
STARTED=$SECONDS
STAMP=ios/.verify-prebuild-stamp
NATIVE_INPUTS=(app.json package.json bun.lock plugins src/lib/i18n/native modules/tapiro-kit)
# A workspace that exists can still predate config-plugin changes; prebuild whenever a native input is newer.
if [ ! -d ios/Tapiro.xcworkspace ] || [ ! -f "$STAMP" ] || [ -n "$(find "${NATIVE_INPUTS[@]}" -newer "$STAMP" -not -name '*.ts' -not -name '*.tsx' -print -quit 2>/dev/null)" ]; then
  CI=1 bunx expo prebuild --platform ios
  touch "$STAMP"
fi

# The JS bundle is produced inside the Xcode build phase; the flag must reach it there.
EXPO_PUBLIC_UI_VERIFY=1 xcodebuild \
  -workspace ios/Tapiro.xcworkspace \
  -scheme Tapiro \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED" \
  build | tail -n 20

echo "Build wall-clock: $((SECONDS - STARTED)) s"
echo "$DERIVED/Build/Products/Release-iphonesimulator/Tapiro.app"
