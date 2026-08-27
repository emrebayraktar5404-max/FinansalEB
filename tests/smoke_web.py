from __future__ import annotations

import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"

html = (WEB / "index.html").read_text(encoding="utf-8")
css = (WEB / "styles.css").read_text(encoding="utf-8")
js = (WEB / "app.js").read_text(encoding="utf-8")
js = js.replace("new URLSearchParams(location.search)", "new URLSearchParams('?demo=1')")
html = re.sub(r'<link rel="manifest"[^>]*>', '', html)
html = re.sub(r'<link rel="icon"[^>]*>', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')

storage_shim = """
<script>
(() => {
  const memory = new Map();
  const store = {
    getItem: key => memory.has(String(key)) ? memory.get(String(key)) : null,
    setItem: (key, value) => memory.set(String(key), String(value)),
    removeItem: key => memory.delete(String(key)),
    clear: () => memory.clear(),
    key: index => [...memory.keys()][index] ?? null,
    get length() { return memory.size; }
  };
  try { Object.defineProperty(window, 'localStorage', { value: store, configurable: true }); } catch (_) {}
})();
</script>
"""
html = html.replace('</head>', storage_shim + '</head>')

results: dict[str, object] = {"checks": []}
errors: list[str] = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="tr-TR")
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.set_content(html, wait_until="load")
    page.wait_for_timeout(500)

    checks = [
        ("dashboard", "Portföyün tek ekranda"),
        ("portfolio", "Maliyet, güncel değer ve dağılım"),
        ("dividends", "Brüt/net, açıklanmış/tahmini ayrımı"),
        ("calendar", "Hak kullanım ve ödeme günleri"),
        ("analytics", "Dağılım, dengeleme ve gelir hedefi"),
    ]

    for page_name, expected in checks:
        page.click(f'[data-page="{page_name}"]')
        page.wait_for_timeout(100)
        body = page.locator("#page").inner_text()
        assert expected in body, f"{page_name}: beklenen metin yok: {expected}"
        results["checks"].append({"page": page_name, "ok": True})

    page.click("#moreBtn")
    page.wait_for_timeout(100)
    assert "Ayarlar" in page.locator("#modalLayer").inner_text()
    assert "Temettü takvimini aktar" in page.locator("#modalLayer").inner_text()
    results["checks"].append({"settings": True, "ok": True})
    page.click(".modal-close")

    page.click('[data-page="calendar"]')
    with page.expect_download(timeout=3000) as info:
        page.click('[data-action="export-calendar"]')
    download = info.value
    assert download.suggested_filename.endswith(".ics")
    results["checks"].append({"ics_export": download.suggested_filename, "ok": True})

    # Varlık formu ve temel alanlar
    page.click('[data-page="portfolio"]')
    page.click('[data-action="add-asset"]')
    form = page.locator("#assetForm")
    assert form.is_visible()
    for name in ["type", "currency", "symbol", "sourceSymbol", "name", "quantity", "avgCost", "price", "targetWeight", "dividendTax"]:
        assert form.locator(f'[name="{name}"]').count() == 1, f"Alan eksik: {name}"
    results["checks"].append({"asset_form": True, "ok": True})

    results["title"] = page.title()
    results["errors"] = errors
    results["ok"] = not errors
    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit("Tarayıcı hataları bulundu")
