#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node --check "$ROOT/web/js/engine.js"
node --check "$ROOT/web/js/network.js"
node --check "$ROOT/web/js/app.js"
node "$ROOT/tests/engine.test.js"
ROOT="$ROOT" python3 - <<'PY'
from pathlib import Path
import os, xml.etree.ElementTree as ET
root=Path(os.environ['ROOT'])
for p in (root/'android/app/src/main/res').rglob('*.xml'): ET.parse(p)
ET.parse(root/'android/app/src/main/AndroidManifest.xml')
print('XML checks: OK')
PY
