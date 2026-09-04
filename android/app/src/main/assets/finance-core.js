/* FinansalEB 2 — saf finans ve veri güvenliği yardımcıları.
 * Tarayıcıda window.FinansalEBCore, Node.js testlerinde module.exports olarak kullanılır.
 */
(function attachFinanceCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinansalEBCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFinanceCore() {
  'use strict';

  const CONFIRMED_STATUSES = new Set(['announced', 'confirmed', 'verified', 'paid', 'historical']);

  function finiteNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeCurrency(value) {
    const currency = String(value || 'TRY').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : 'TRY';
  }

  function cashRowAmount(row, fx = {}) {
    const direct = finiteNumber(row?.amount);
    if (direct !== null) return direct;
    const amountTry = finiteNumber(row?.amountTry);
    if (amountTry === null) return 0;
    const currency = normalizeCurrency(row?.currency);
    if (currency === 'TRY') return amountTry;
    const rate = finiteNumber(row?.fxRateTry) ?? finiteNumber(fx?.[currency]) ?? 1;
    return rate > 0 ? amountTry / rate : 0;
  }

  /** Eski yalnız-TL satırlarını kaybetmeden çok para birimli nakit satırına yükseltir. */
  function normalizeCashLedger(rows, fx = {}) {
    return (Array.isArray(rows) ? rows : []).map(source => {
      const row = {...source};
      row.currency = normalizeCurrency(row.currency);
      row.amount = cashRowAmount(row, fx);
      const lockedTry = finiteNumber(row.amountTry);
      const rate = finiteNumber(row.fxRateTry) ?? finiteNumber(fx?.[row.currency]) ?? 1;
      row.fxRateTry = rate > 0 ? rate : 1;
      row.amountTry = lockedTry !== null ? lockedTry : row.amount * row.fxRateTry;
      return row;
    });
  }

  function cashBalances(rows, fx = {}) {
    const balances = {};
    normalizeCashLedger(rows, fx).forEach(row => {
      if (row.affectsCash === false) return;
      balances[row.currency] = (balances[row.currency] || 0) + row.amount;
    });
    return balances;
  }

  /** Nakit hesaplarını güncel kurlarla TL portföy değerine çevirir. */
  function cashTotalTry(rows, fx = {}) {
    const balances = cashBalances(rows, fx);
    return Object.entries(balances).reduce((sum, [currency, amount]) => {
      const rate = currency === 'TRY' ? 1 : (finiteNumber(fx?.[currency]) ?? 1);
      return sum + amount * rate;
    }, 0);
  }

  /** Alış nakitten çıkar, satış komisyon sonrası net tutarı nakde ekler. */
  function tradeCashAmount(transaction) {
    const quantity = Math.max(0, finiteNumber(transaction?.quantity) ?? 0);
    const price = Math.max(0, finiteNumber(transaction?.price) ?? 0);
    const fee = Math.max(0, finiteNumber(transaction?.fee) ?? 0);
    if (transaction?.type === 'buy') return -(quantity * price + fee);
    if (transaction?.type === 'sell') return Math.max(0, quantity * price - fee);
    return 0;
  }

  function tradeCashEntry(transaction, asset, fxRateTry = 1) {
    if (!transaction?.id || !['buy', 'sell'].includes(transaction.type)) return null;
    const currency = normalizeCurrency(transaction.currency || asset?.currency);
    const amount = tradeCashAmount(transaction);
    const rate = Math.max(0, finiteNumber(transaction.fxRateTry) ?? finiteNumber(fxRateTry) ?? 1) || 1;
    return {
      type: transaction.type === 'sell' ? 'trade_sale' : 'trade_purchase',
      transactionId: transaction.id,
      assetId: transaction.assetId || asset?.id,
      date: transaction.date,
      currency,
      amount,
      fxRateTry: rate,
      amountTry: amount * rate
    };
  }

  function hasCashEvidence(event, cashLedger) {
    if (!event?.id || !Array.isArray(cashLedger)) return false;
    return cashLedger.some(row => row?.eventId === event.id && row?.type === 'dividend_income');
  }

  function hasReceiptEvidence(event, cashLedger) {
    return Boolean(event?.receivedAt)
      || finiteNumber(event?.confirmedQuantity) !== null
      || finiteNumber(event?.confirmedNetTry) !== null
      || hasCashEvidence(event, cashLedger);
  }

  /**
   * v0.x bazı geçmiş dış kaynak olaylarını yalnızca tarih geçtiği için "alındı"
   * işaretliyordu. Kullanıcı onayı veya nakit kaydı olmayan bu işaretleri geri alır.
   */
  function migrateDividendEvents(events, cashLedger, options = {}) {
    const demo = options.demo === true;
    return (Array.isArray(events) ? events : []).map(source => {
      const event = {...source};
      if (event.received === true && !demo && !hasReceiptEvidence(event, cashLedger)) {
        event.received = false;
        event.migrationNote = 'FinansalEB 2: kullanıcı onayı bulunmadığı için alındı işareti kaldırıldı.';
      }
      return event;
    });
  }

  /** Kaynağın "paid" demesi, paranın kullanıcının hesabına geçtiğini kanıtlamaz. */
  function dividendBucket(event) {
    if (event?.received === true) return 'paid';
    const status = String(event?.status || '').toLowerCase();
    return CONFIRMED_STATUSES.has(status) ? 'confirmed' : 'estimated';
  }

  /** Onaylanmış net TL tutarı daha sonra kur/fiyat değişince yeniden hesaplanmaz. */
  function stableDividendNet(event, computedAmount) {
    const locked = finiteNumber(event?.confirmedNetTry);
    return event?.received === true && locked !== null ? locked : Number(computedAmount || 0);
  }

  /** Dış kaynak yenilemesi kullanıcının manuel alındı/onay bilgisini ezemez. */
  function mergeExternalDividend(existing, incoming) {
    const merged = {...(existing || {}), ...(incoming || {})};
    merged.received = existing?.received === true;
    for (const field of ['receivedAt', 'confirmedQuantity', 'confirmedNetTry']) {
      if (existing && Object.prototype.hasOwnProperty.call(existing, field)) merged[field] = existing[field];
      else delete merged[field];
    }
    return merged;
  }

  /** Aylık katkıyı ay sonunda ekleyerek hedef temettü sermayesine ulaşma süresini hesaplar. */
  function freedomProjection(input = {}) {
    const capital = Math.max(0, finiteNumber(input.capital) ?? 0);
    const contribution = Math.max(0, finiteNumber(input.monthlyContribution) ?? 0);
    const expense = Math.max(0, finiteNumber(input.monthlyExpense) ?? 0);
    const annualReturn = Math.max(-99, finiteNumber(input.annualReturn) ?? 0) / 100;
    const dividendYield = Math.max(0, finiteNumber(input.dividendYield) ?? 0) / 100;
    const targetCapital = dividendYield > 0 ? expense * 12 / dividendYield : Infinity;
    if (capital >= targetCapital) return {months:0, targetCapital, endingCapital:capital};
    const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
    if (contribution <= 0 && monthlyRate <= 0) return {months:Infinity, targetCapital, endingCapital:capital};
    let endingCapital = capital;
    let months = 0;
    while (endingCapital < targetCapital && months < 1200) {
      endingCapital = endingCapital * (1 + monthlyRate) + contribution;
      months += 1;
    }
    return {months:endingCapital >= targetCapital ? months : Infinity, targetCapital, endingCapital};
  }

  return Object.freeze({
    cashBalances,
    cashRowAmount,
    cashTotalTry,
    dividendBucket,
    freedomProjection,
    hasReceiptEvidence,
    mergeExternalDividend,
    migrateDividendEvents,
    normalizeCashLedger,
    stableDividendNet,
    tradeCashAmount,
    tradeCashEntry
  });
});
