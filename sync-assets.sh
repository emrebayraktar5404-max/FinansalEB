#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/android/app/src/main/assets"
rm -rf "$ASSETS"
mkdir -p "$ASSETS"
cp -a "$ROOT/web/." "$ASSETS/"
