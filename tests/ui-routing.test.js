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

test('portföy sekmeleri ve hızlı kayıt menüsü gerçek formlara bağlıdır', () => {
  for (const tab of ['overview','holdings','dividends','transactions']) {
    assert.match(app, new RegExp(`portfolioTab==='${tab}'`));
  }
  assert.match(app, /function showQuickAdd\(\)/);
  assert.match(app, /showAssetForm\(\)/);
  assert.match(app, /showTransactionForm\(\)/);
  assert.match(app, /showDividendForm\(\)/);
  assert.match(app, /showCashTransactionForm\(\)/);
});

test('temettü takvimi yıl ve durum filtrelerini uygular', () => {
  for (const filter of ['upcoming','all','confirmed','portfolio']) {
    assert.match(app, new RegExp(`\\['${filter}'|calendarFilter==='${filter}'`));
  }
  assert.match(app, /data-year-step/);
  assert.match(app, /showCalendarFilter/);
  assert.match(app, /calendarEventCard/);
});

test('portföy adı kalıcıdır ve örnek başlık gerçek kullanıcıya zorlanmaz', () => {
  assert.match(app, /portfolioName: 'Portföyüm'/);
  assert.match(app, /function showPortfolioNameEditor\(\)/);
  assert.match(app, /state\.settings\.portfolioName=name/);
});

test('işlem ayrıntısı ve silme bağlı nakit kayıtlarını birlikte yönetir', () => {
  assert.match(app, /function showTransactionDetail\(transactionId\)/);
  assert.match(app, /function removeTransaction\(transactionId\)/);
  assert.match(app, /state\.cashLedger=state\.cashLedger\.filter\(row=>row\.transactionId!==transactionId\)/);
  assert.match(app, /state\.cashflows=state\.cashflows\.filter\(row=>row\.transactionId!==transactionId\)/);
  assert.match(app, /syncAssetLedger\(asset\)/);
});

test('nakit hesapları gerçek tutarlı döviz dönüşümünü destekler', () => {
  assert.match(app, /value="conversion">Döviz dönüşümü/);
  assert.match(app, /type:'cash_conversion_out'/);
  assert.match(app, /type:'cash_conversion_in'/);
  assert.match(app, /targetCurrency===currency/);
});

test('temettü kartları ayrıntı, düzenleme ve güvenli silme akışına bağlıdır', () => {
  assert.match(app, /data-event-id=/);
  assert.match(app, /function showDividendDetail\(eventId\)/);
  assert.match(app, /function showDividendEditForm\(eventId\)/);
  assert.match(app, /state\.cashLedger=state\.cashLedger\.filter\(row=>row\.eventId!==eventId\)/);
  assert.match(app, /confirmedNetTry=netTry/);
});

test('rehber kartları gerçek makale içeriğini açar', () => {
  assert.match(app, /function guideArticles\(\)/);
  assert.match(app, /function showGuideArticle\(index\)/);
  assert.match(app, /Hak kullanım tarihi/);
  assert.match(app, /Bedelsiz sermaye artırımı/);
  assert.doesNotMatch(app, /Temel kavramlar, hesaplama yöntemleri ve yatırımcıların dikkat etmesi gereken noktalar\.<\/p><\/article>/);
});

test('profil ve bildirim tercihleri düzenlenebilir', () => {
  assert.match(app, /function showProfileEditor\(\)/);
  assert.match(app, /function showNotificationSettings\(\)/);
  assert.match(app, /notifyAdvanceDays/);
  assert.match(app, /notifyExDate/);
  assert.match(app, /notifyPaymentDate/);
  assert.match(app, /cancelNotification/);
});
