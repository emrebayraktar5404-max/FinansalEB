from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
checks: list[dict[str, object]] = []

def ok(name: str, detail: str = "") -> None:
    checks.append({"name": name, "ok": True, "detail": detail})

def fail(name: str, detail: str) -> None:
    errors.append(f"{name}: {detail}")
    checks.append({"name": name, "ok": False, "detail": detail})

# JS syntax
for file in [ROOT / 'web/app.js', ROOT / 'web/sw.js']:
    proc = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True)
    if proc.returncode == 0: ok(f'JS syntax {file.name}')
    else: fail(f'JS syntax {file.name}', proc.stderr.strip())

# JSON syntax
for file in [ROOT / 'web/manifest.webmanifest']:
    try:
        json.loads(file.read_text(encoding='utf-8'))
        ok(f'JSON {file.name}')
    except Exception as exc:
        fail(f'JSON {file.name}', str(exc))

# PHP syntax (yerel ortamda PHP yoksa GitHub Actions doğrulaması devralır)
php = shutil.which('php')
if php:
    for file in [ROOT / 'server/api.php', ROOT / 'server/config.sample.php']:
        proc = subprocess.run([php, '-l', str(file)], capture_output=True, text=True)
        if proc.returncode == 0: ok(f'PHP syntax {file.name}')
        else: fail(f'PHP syntax {file.name}', (proc.stdout + proc.stderr).strip())
else:
    ok('PHP syntax', 'Yerel PHP bulunamadı; GitHub Actions aşamasında doğrulanacak')

# XML syntax
xml_files = list((ROOT / 'android/app/src/main').rglob('*.xml'))
for file in xml_files:
    try:
        ET.parse(file)
    except Exception as exc:
        fail(f'XML {file.relative_to(ROOT)}', str(exc))
if not any('XML ' in e for e in errors): ok('Android XML', f'{len(xml_files)} dosya')

# Android resource references
res = ROOT / 'android/app/src/main/res'
resources: dict[str, set[str]] = {k:set() for k in ['layout','drawable','mipmap','xml','color','string','style','id']}
for kind in ['layout','drawable','mipmap','xml']:
    for directory in res.glob(f'{kind}*'):
        if directory.is_dir():
            for f in directory.iterdir():
                if f.is_file(): resources[kind].add(f.stem)
for values_file in (res / 'values').glob('*.xml'):
    root = ET.parse(values_file).getroot()
    for child in root:
        name = child.attrib.get('name')
        if not name: continue
        if child.tag in resources: resources[child.tag].add(name)
        if child.tag == 'style': resources['style'].add(name)
for xml_file in xml_files:
    text = xml_file.read_text(encoding='utf-8')
    resources['id'].update(re.findall(r'@\+id/([A-Za-z0-9_]+)', text))

java_files = list((ROOT / 'android/app/src/main/java').rglob('*.java'))
for file in java_files:
    text = file.read_text(encoding='utf-8')
    for kind, name in re.findall(r'R\.(layout|drawable|mipmap|xml|color|string|id)\.([A-Za-z0-9_]+)', text):
        if name not in resources[kind]:
            fail('Android resource', f'{file.name}: R.{kind}.{name} bulunamadı')
if not any(e.startswith('Android resource:') for e in errors): ok('Android resource references')

# Manifest classes
manifest = (ROOT / 'android/app/src/main/AndroidManifest.xml').read_text(encoding='utf-8')
for cls in re.findall(r'android:name="\.([A-Za-z0-9_]+)"', manifest):
    expected = ROOT / f'android/app/src/main/java/com/finansaleb/app/{cls}.java'
    if not expected.exists(): fail('Manifest class', f'{cls}.java yok')
if not any(e.startswith('Manifest class:') for e in errors): ok('Manifest classes')

# Web -> Android asset synchronization
for file in (ROOT / 'web').iterdir():
    if not file.is_file(): continue
    target = ROOT / 'android/app/src/main/assets' / file.name
    if not target.exists():
        fail('Asset sync', f'{file.name} Android assets içinde yok')
        continue
    if hashlib.sha256(file.read_bytes()).digest() != hashlib.sha256(target.read_bytes()).digest():
        fail('Asset sync', f'{file.name} farklı')
if not any(e.startswith('Asset sync:') for e in errors): ok('Web/Android asset sync')

# Required project files
required = [
    ROOT / '.github/workflows/build-apk.yml', ROOT / 'README.md', ROOT / 'LICENSE.txt',
    ROOT / 'scripts/sync-assets.sh', ROOT / 'android/app/build.gradle', ROOT / 'web/finance-core.js',
    ROOT / 'tests/finance-core.test.js', ROOT / 'android/signing/finansaleb-release.p12.enc',
    ROOT / 'android/app/src/main/java/com/finansaleb/app/MainActivity.java',
    ROOT / 'android/app/src/main/java/com/finansaleb/app/AppBridge.java',
    ROOT / 'android/app/src/main/java/com/finansaleb/app/MarketDataClient.java',
    ROOT / 'android/app/src/main/java/com/finansaleb/app/PortfolioWidgetProvider.java',
    ROOT / 'android/app/src/main/java/com/finansaleb/app/DividendWidgetProvider.java',
]
missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
if missing: fail('Required files', ', '.join(missing))
else: ok('Required files', f'{len(required)} dosya')

# Finans çekirdeği uygulamadan önce yüklenmeli
index_html = (ROOT / 'web/index.html').read_text(encoding='utf-8')
if index_html.find('finance-core.js') < 0 or index_html.find('finance-core.js') > index_html.find('app.js'):
    fail('Finance core load order', 'finance-core.js, app.js dosyasından önce yüklenmelidir')
else:
    ok('Finance core load order')

# Web, Android ve API sürümleri aynı olmalı
web_version = re.search(r"APP_VERSION = '([^']+)'", (ROOT / 'web/app.js').read_text(encoding='utf-8'))
gradle_version = re.search(r"versionName '([^']+)'", (ROOT / 'android/app/build.gradle').read_text(encoding='utf-8'))
api_version = re.search(r"APP_VERSION = '([^']+)'", (ROOT / 'server/api.php').read_text(encoding='utf-8'))
versions = {m.group(1) for m in [web_version, gradle_version, api_version] if m}
if len(versions) != 1 or not all([web_version, gradle_version, api_version]):
    fail('Version alignment', f'Bulunan sürümler: {sorted(versions)}')
else:
    ok('Version alignment', versions.pop())

# Native market bridge wiring
app_bridge = (ROOT / 'android/app/src/main/java/com/finansaleb/app/AppBridge.java').read_text(encoding='utf-8')
main_activity = (ROOT / 'android/app/src/main/java/com/finansaleb/app/MainActivity.java').read_text(encoding='utf-8')
web_js = (ROOT / 'web/app.js').read_text(encoding='utf-8')
if 'requestMarketData' not in app_bridge or 'deliverMarketResult' not in main_activity or 'FinansalEBNative' not in web_js:
    fail('Native market bridge', 'Android-JavaScript veri köprüsü eksik')
else:
    ok('Native market bridge', 'arama/fiyat/temettü geri çağrısı bağlı')

build_gradle = (ROOT / 'android/app/build.gradle').read_text(encoding='utf-8')
if 'signingConfigs' not in build_gradle or 'signingConfig signingConfigs.personal' not in build_gradle:
    fail('Stable APK signing', 'kişisel sabit imza yapılandırması bağlı değil')
else:
    ok('Stable APK signing', 'v0.2.0 sonrası güncellemeler aynı anahtarla imzalanır')

report = {"ok": not errors, "checks": checks, "errors": errors}
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
