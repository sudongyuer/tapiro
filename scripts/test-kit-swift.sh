#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
swiftc -o "$out/speech" "$root/modules/tapiro-kit/ios/SpeechLogic.swift" "$root/modules/tapiro-kit/tests/speech/main.swift"
"$out/speech"
