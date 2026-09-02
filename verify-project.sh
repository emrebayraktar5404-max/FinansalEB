#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
node --check "$ROOT/web/finance-core.js"
node --check "$ROOT/web/app.js"
node --test "$ROOT/tests/finance-core.test.js"
python3 "$ROOT/tests/static_checks.py"
