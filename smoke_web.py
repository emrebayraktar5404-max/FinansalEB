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
  window.Android = {
    haptic() {},
    saveWidgetState() {},
    scheduleNotification() {},
    getBackgroundPrices() { return ''; },
    requestMarketData(requestId, action, rawParams) {
      const params = JSON.parse(rawParams || '{}');
      const isoOffset = days => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      };
      let data = {};
      if (action === 'search' && params.type === 'TEFAS') {
        data = {results:[{symbol:'TMG',sourceSymbol:'TMG',name:'Ak Portföy Yeni Teknolojiler Yabancı Hisse Fonu',type:'TEFAS',currency:'TRY',price:.0536,prevClose:.0532,changePct:.75,source:'TEFAS'}]};
      } else if (action === 'search') {
        data = {results:[{symbol:'DEVA',sourceSymbol:'DEVA.IS',name:'Deva Holding A.Ş.',type:'BIST',currency:'TRY',price:72.5,prevClose:71.8,changePct:.97,source:'Piyasa sembol araması'}]};
      } else if (action === 'quote') {
        data = {symbol:params.symbol,name:'Deva Holding A.Ş.',price:72.5,prevClose:71.8,changePct:.97,currency:'TRY',history:[70,71.8,72.5],dividends:[],source:'Piyasa verisi'};
      } else if (action === 'dividends') {
        data = {events:[{
          exDate:isoOffset(-20), payDate:isoOffset(-18), amountPerShare:2,
          status:'historical', source:'Piyasa veri akışı'
        }]};
      }
      setTimeout(() => window.FinansalEBNative.onMarketResult(requestId, JSON.stringify({ok:true,data})), 15);
    }
  };
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
    page.click(".modal-x")

    page.click('[data-page="calendar"]')
    with page.expect_download(timeout=3000) as info:
        page.click('[data-action="export-calendar"]')
    download = info.value
    assert download.suggested_filename.endswith(".ics")
    results["checks"].append({"ics_export": download.suggested_filename, "ok": True})

    # Varlık formu, Vazgeç düğmesi ve otomatik piyasa araması
    page.click('[data-page="portfolio"]')
    page.click('[data-action="clear-demo"]')
    page.wait_for_timeout(120)
    page.click('[data-action="add-asset"]')
    form = page.locator("#assetForm")
    assert form.is_visible()
    for name in ["type", "currency", "symbol", "sourceSymbol", "name", "quantity", "avgCost", "purchaseDate", "price", "targetWeight", "dividendTax"]:
        assert form.locator(f'[name="{name}"]').count() == 1, f"Alan eksik: {name}"
    page.click("#assetCancelButton")
    page.wait_for_timeout(220)
    assert not page.locator("#modalLayer").evaluate("el => el.classList.contains('open')")
    results["checks"].append({"asset_cancel": True, "ok": True})

    page.click('[data-action="add-asset"]')
    form = page.locator("#assetForm")
    form.locator('[name="symbol"]').fill("DEVA")
    page.click("#assetLookupBtn")
    page.wait_for_function("document.querySelector('#assetForm [name=name]').value.includes('Deva Holding')")
    assert form.locator('[name="sourceSymbol"]').input_value() == "DEVA.IS"
    assert float(form.locator('[name="price"]').input_value()) == 72.5
    assert "otomatik dolduruldu" in page.locator("#assetLookupStatus").inner_text()
    results["checks"].append({"asset_auto_lookup": True, "ok": True})

    purchase_date = page.evaluate("() => { const d = new Date(); d.setDate(d.getDate()-10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }")
    form.locator('[name="quantity"]').fill("100")
    form.locator('[name="avgCost"]').fill("70")
    form.locator('[name="purchaseDate"]').fill(purchase_date)
    form.locator('#assetSaveButton').click()
    page.wait_for_timeout(900)
    stored = page.evaluate("JSON.parse(localStorage.getItem('finansaleb_state_v1'))")
    deva = next(a for a in stored["assets"] if a["symbol"] == "DEVA")
    auto_events = [e for e in stored["dividendEvents"] if e["assetId"] == deva["id"]]
    assert deva["purchaseDate"] == purchase_date
    assert auto_events and all(not e.get("received", False) for e in auto_events)
    results["checks"].append({"purchase_date_persisted": purchase_date, "auto_history_not_received": True, "ok": True})

    page.click('[data-page="dividends"]')
    body = page.locator('#page').inner_text()
    assert "Bu yıl alınan" in body
    assert "₺0,00" in body, body
    results["checks"].append({"past_dividend_report_zero": True, "ok": True})

    # TEFAS kodu da isim ve fiyatla otomatik çözülmeli
    page.click('[data-page="portfolio"]')
    page.click('[data-action="add-asset"]')
    form = page.locator("#assetForm")
    form.locator('[name="type"]').select_option("TEFAS")
    form.locator('[name="symbol"]').fill("TMG")
    page.click("#assetLookupBtn")
    page.wait_for_function("document.querySelector('#assetForm [name=name]').value.includes('Yeni Teknolojiler')")
    assert float(form.locator('[name="price"]').input_value()) == 0.0536
    results["checks"].append({"tefas_auto_lookup": True, "ok": True})

    results["title"] = page.title()
    results["errors"] = errors
    results["ok"] = not errors
    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit("Tarayıcı hataları bulundu")
