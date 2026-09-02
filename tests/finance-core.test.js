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
  assert.match(app, /CORE\.migrateDividendEvents/);
});
