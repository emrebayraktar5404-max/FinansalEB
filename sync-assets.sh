#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/web"
TARGET="$ROOT/android/app/src/main/assets"
mkdir -p "$TARGET"
find "$TARGET" -mindepth 1 -maxdepth 1 -type f -delete
cp -a "$SOURCE"/. "$TARGET"/
echo "Finansal(EB) web varlıkları Android projesine eşitlendi."
