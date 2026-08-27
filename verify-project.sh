#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node --check "$ROOT/web/ledger.js"
node --check "$ROOT/web/data.js"
node --check "$ROOT/web/app.js"
node "$ROOT/tests/ledger.test.js"
for file in "$ROOT"/server/api/*.php; do php -l "$file" >/dev/null; done
python3 - "$ROOT" <<'PY'
from pathlib import Path
import sys, xml.etree.ElementTree as ET
root=Path(sys.argv[1])
for p in (root/'android/app/src/main/res').rglob('*.xml'): ET.parse(p)
ET.parse(root/'android/app/src/main/AndroidManifest.xml')
required=['web/index.html','web/app.js','web/ledger.js','android/app/build.gradle','android/app/src/main/AndroidManifest.xml','.github/workflows/build-apk.yml']
missing=[x for x in required if not (root/x).exists()]
if missing: raise SystemExit('Eksik dosyalar: '+', '.join(missing))
print('Statik proje doğrulaması: OK')
PY
