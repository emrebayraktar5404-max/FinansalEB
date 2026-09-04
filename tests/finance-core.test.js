'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../web/finance-core.js');

test('kanıtsız geçmiş otomatik temettü alındı sayılmaz', () => {
  const [event] = core.migrateDividendEvents([
    {id:'d1', status:'historical', received:true, payDate:'2025-01-10'}
  ], [], {demo:false});
  assert.equal(event.received, false);
  assert.match(event.migrationNote, /kullanıcı onayı/i);
});

test('kullanıcı onayı veya nakit kaydı bulunan temettü korunur', () => {
  const events = core.migrateDividendEvents([
    {id:'d1', received:true, receivedAt:'2026-01-10'},
    {id:'d2', received:true}
  ], [{eventId:'d2', type:'dividend_income', amountTry:125}], {demo:false});
  assert.equal(events[0].received, true);
  assert.equal(events[1].received, true);
});

test('ödendi kaynak durumu kullanıcı onayı olmadan nakit sayılmaz', () => {
  assert.equal(core.dividendBucket({status:'paid', received:false}), 'confirmed');
  assert.equal(core.dividendBucket({status:'estimated', received:false}), 'estimated');
  assert.equal(core.dividendBucket({status:'confirmed', received:true}), 'paid');
});

test('alınmış temettünün onaylı TL tutarı kur değişse de sabit kalır', () => {
  assert.equal(core.stableDividendNet({received:true, confirmedNetTry:777.54}, 910.12), 777.54);
  assert.equal(core.stableDividendNet({received:false, confirmedNetTry:777.54}, 910.12), 910.12);
});

test('dış kaynak yenilemesi kullanıcı onayını ezmez', () => {
  const merged = core.mergeExternalDividend(
    {id:'d1', received:true, receivedAt:'2026-08-31', confirmedQuantity:12, confirmedNetTry:340},
    {id:'d1', received:false, status:'historical', amountPerShare:10}
  );
  assert.equal(merged.received, true);
  assert.equal(merged.receivedAt, '2026-08-31');
  assert.equal(merged.confirmedQuantity, 12);
  assert.equal(merged.confirmedNetTry, 340);
});

test('uygulama tehlikeli tarih-geçtiyse-alındı kuralını içermez', () => {
  const app = fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');
  assert.doesNotMatch(app, /received\s*:\s*item\.status\s*===\s*['"]historical['"]/);
  assert.doesNotMatch(app, /e\.received\s*\|\|\s*d\s*<\s*now/);
  assert.doesNotMatch(app, /event\.received\s*\|\|\s*event\.status\s*===\s*['"]historical['"]/);
  assert.match(app, /CORE\.migrateDividendEvents/);
});

test('satış komisyon sonrası net tutarı nakde ekler', () => {
  const entry = core.tradeCashEntry(
    {id:'t1', assetId:'a1', type:'sell', date:'2026-09-02', quantity:100, price:50, fee:10, currency:'TRY'},
    {id:'a1', currency:'TRY'},
    1
  );
  assert.equal(entry.type, 'trade_sale');
  assert.equal(entry.amount, 4990);
  assert.equal(entry.amountTry, 4990);
});

test('alış komisyon dahil tutarı nakitten düşer', () => {
  assert.equal(core.tradeCashAmount({type:'buy', quantity:20, price:40, fee:5}), -805);
});

test('çok para birimli nakit güncel kurla TL değerine katılır', () => {
  const ledger = [
    {currency:'TRY', amount:1000},
    {currency:'USD', amount:10, fxRateTry:40},
    {currency:'USD', amount:-2, fxRateTry:41},
    {currency:'TRY', amount:-100, affectsCash:false}
  ];
  assert.deepEqual(core.cashBalances(ledger, {USD:50}), {TRY:1000, USD:8});
  assert.equal(core.cashTotalTry(ledger, {USD:50}), 1400);
});

test('eski amountTry nakit kayıtları TL hesabında korunur', () => {
  const [row] = core.normalizeCashLedger([{type:'dividend_income', amountTry:777.54}], {TRY:1});
  assert.equal(row.currency, 'TRY');
  assert.equal(row.amount, 777.54);
  assert.equal(row.amountTry, 777.54);
});

test('satıştan sonra yapılan alış kalan TL bakiyesini doğru bırakır', () => {
  const sale = core.tradeCashEntry({id:'sell1', assetId:'a1', type:'sell', date:'2026-09-02', quantity:100, price:50, fee:10, currency:'TRY'}, {id:'a1', currency:'TRY'}, 1);
  const buy = core.tradeCashEntry({id:'buy1', assetId:'a2', type:'buy', date:'2026-09-02', quantity:80, price:50, fee:0, currency:'TRY'}, {id:'a2', currency:'TRY'}, 1);
  assert.deepEqual(core.cashBalances([sale, buy], {TRY:1}), {TRY:990});
});

test('uygulama yeni alış ve satışları nakit defterine bağlar', () => {
  const app = fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');
  assert.match(app, /cashTracked:true/);
  assert.match(app, /CORE\.tradeCashEntry/);
  assert.match(app, /realizedCostTry/);
  assert.match(app, /Satış net tutarı.*hesabına eklendi/);
});

test('finansal özgürlük hedef sermayesini ve bileşik süreyi hesaplar', () => {
  const result = core.freedomProjection({
    capital: 100000,
    monthlyContribution: 10000,
    monthlyExpense: 50000,
    annualReturn: 8,
    dividendYield: 5
  });
  assert.equal(result.targetCapital, 12000000);
  assert.ok(result.months > 0 && result.months < 1200);
  assert.ok(result.endingCapital >= result.targetCapital);
});

test('sıfır verim veya katkısız negatif senaryo ulaşılamaz döndürür', () => {
  assert.equal(core.freedomProjection({capital:1000, monthlyExpense:1000, dividendYield:0}).targetCapital, Infinity);
  assert.equal(core.freedomProjection({capital:1000, monthlyExpense:1000, dividendYield:5, monthlyContribution:0, annualReturn:0}).months, Infinity);
});
