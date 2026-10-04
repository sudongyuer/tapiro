#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DERIVED="$ROOT/.verify/DerivedData"

cd "$ROOT"
[ -d ios/Tapiro.xcworkspace ] || CI=1 bunx expo prebuild --platform ios

# The JS bundle is produced inside the Xcode build phase; the flag must reach it there.
EXPO_PUBLIC_UI_VERIFY=1 xcodebuild \
  -workspace ios/Tapiro.xcworkspace \
  -scheme Tapiro \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED" \
  build | tail -n 20

echo "$DERIVED/Build/Products/Release-iphonesimulator/Tapiro.app"
