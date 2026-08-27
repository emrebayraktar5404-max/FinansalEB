from __future__ import annotations

import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
OUT = Path('/mnt/data')

html = (WEB / "index.html").read_text(encoding="utf-8")
css = (WEB / "styles.css").read_text(encoding="utf-8")
js = (WEB / "app.js").read_text(encoding="utf-8")
js = js.replace("new URLSearchParams(location.search)", "new URLSearchParams('?demo=1')")
html = re.sub(r'<link rel="manifest"[^>]*>', '', html)
html = re.sub(r'<link rel="icon"[^>]*>', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')
html = html.replace('</head>', """
<script>
(() => {
  const memory = new Map();
  const store = {getItem:k=>memory.has(String(k))?memory.get(String(k)):null,setItem:(k,v)=>memory.set(String(k),String(v)),removeItem:k=>memory.delete(String(k)),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size;}};
  try { Object.defineProperty(window,'localStorage',{value:store,configurable:true}); } catch (_) {}
})();
</script></head>""")

screens = [
    ('dashboard', 'FinansalEB-dashboard.png'),
    ('portfolio', 'FinansalEB-portfoy.png'),
    ('dividends', 'FinansalEB-temettu.png'),
    ('calendar', 'FinansalEB-takvim.png'),
    ('analytics', 'FinansalEB-analiz.png'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, locale='tr-TR')
    page = context.new_page()
    page.set_content(html, wait_until='load')
    page.wait_for_timeout(400)
    for page_name, filename in screens:
        page.click(f'[data-page="{page_name}"]')
        page.wait_for_timeout(180)
        page.screenshot(path=str(OUT / filename), full_page=True)
    browser.close()
