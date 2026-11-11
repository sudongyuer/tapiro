#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/.verify/storekit"
UDID=""
APP=""
ONLY=()
while [ $# -gt 0 ]; do
  case "$1" in
    --udid) UDID="$2"; shift 2 ;;
    --app) APP="$2"; shift 2 ;;
    --only) ONLY+=("-only-testing:StoreKitUITests/StoreKitUITests/$2"); shift 2 ;;
    *) echo "usage: $0 --udid <booted simulator> [--app Tapiro.app] [--only testName]..." >&2; exit 2 ;;
  esac
done
[ -n "$UDID" ] || { echo "--udid is required" >&2; exit 2; }

if [ -z "$APP" ]; then
  DIR=$(xcodebuild -showBuildSettings -workspace "$ROOT/ios/Tapiro.xcworkspace" -scheme Tapiro -configuration Debug \
    -sdk iphonesimulator 2>/dev/null | sed -n 's/^ *TARGET_BUILD_DIR = //p' | head -1)
  APP="$DIR/Tapiro.app"
fi
[ -d "$APP" ] || { echo "No Debug Tapiro.app at $APP; build it with bunx expo run:ios first" >&2; exit 1; }
curl -sf http://127.0.0.1:8081/status >/dev/null || { echo "Metro is not running on 8081 (bunx expo start)" >&2; exit 1; }
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:54321/functions/v1/iap-verify || true)
[ "$CODE" = "401" ] || { echo "iap-verify answered $CODE, not 401; run bun run fn:serve" >&2; exit 1; }

mkdir -p "$OUT"
xcodebuild build-for-testing -project "$ROOT/verification/storekit/StoreKitHarness.xcodeproj" -scheme StoreKitUITests \
  -sdk iphonesimulator -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$OUT/DerivedData" \
  > "$OUT/build.log" 2>&1 || { grep -E 'error:' "$OUT/build.log" | head -20; exit 1; }

PRODUCTS="$OUT/DerivedData/Build/Products"
python3 -I - "$PRODUCTS" "$APP" <<'PY'
import glob, plistlib, sys
products, app = sys.argv[1], sys.argv[2]
source = next(p for p in glob.glob(f'{products}/StoreKitUITests_*.xctestrun'))
run = plistlib.load(open(source, 'rb'))
for config in run['TestConfigurations']:
    for target in config['TestTargets']:
        target['UITargetAppPath'] = app
        target['DependentProductPaths'] = [p for p in target['DependentProductPaths'] if not p.endswith('/Host.app')] + [app]
plistlib.dump(run, open(f'{products}/tapiro.xctestrun', 'wb'))
PY

RESULT="$OUT/result-$(date +%Y%m%d-%H%M%S).xcresult"
STATUS=0
# XCUITest's tear-down hung for hours after a failed case (2026-11-12); perl's alarm bounds the run without coreutils.
perl -e 'alarm shift; exec @ARGV' "${LIMIT_S:-1200}" xcodebuild test-without-building -xctestrun "$PRODUCTS/tapiro.xctestrun" -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$RESULT" "${ONLY[@]+"${ONLY[@]}"}" > "$OUT/test.log" 2>&1 || STATUS=$?
grep -E "Test Case .*(passed|failed)|error:" "$OUT/test.log" || true
echo "Result bundle: $RESULT"
exit $STATUS
