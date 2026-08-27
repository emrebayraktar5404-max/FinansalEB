#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT/scripts/sync-assets.sh"
cd "$ROOT/android"
if command -v ./gradlew >/dev/null 2>&1; then
  ./gradlew :app:assembleDebug
elif command -v gradle >/dev/null 2>&1; then
  gradle :app:assembleDebug
else
  echo "Gradle bulunamadı. Android Studio ile android klasörünü açın veya GitHub Actions iş akışını çalıştırın." >&2
  exit 1
fi
mkdir -p "$ROOT/dist"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/dist/FinansalEB-v0.2.0-debug.apk"
echo "APK: $ROOT/dist/FinansalEB-v0.2.0-debug.apk"
