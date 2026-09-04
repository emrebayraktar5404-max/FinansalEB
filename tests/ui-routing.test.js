const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');

test('yan menü hedeflerinin her biri gerçek sayfaya bağlıdır', () => {
  for (const page of ['calendar','upcoming','stocks','sectors','discover','portfolio','favorites','tools','support','profile']) {
    assert.match(app, new RegExp(`${page}:render`, 'i'), `${page} renderer eksik`);
  }
  assert.doesNotMatch(app, /\['portfolio','Hisseler'\]/);
  assert.doesNotMatch(app, /\['analytics','Sektörler'\]/);
});

test('dört hesaplama aracı kendi anahtarına bağlıdır', () => {
  for (const key of ['compare','retirement','income','yield']) {
    assert.match(app, new RegExp(`${key}:\\{title:`), `${key} hesaplayıcısı eksik`);
  }
  assert.match(app, /data-tool="\$\{c\[3\]\}"/);
  assert.doesNotMatch(app, /data-tool="\$\{c\[4\]\}"/);
});

test('geçmiş temettüler tarih geçti diye otomatik alınmış sayılmaz', () => {
  assert.doesNotMatch(app, /parseDate\([^)]*\)\s*<\s*new Date\(\)[^\n]*(received|paid)\s*=\s*true/i);
});
