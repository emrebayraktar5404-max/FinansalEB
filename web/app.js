/* Finansal(EB) — kişisel portföy ve temettü takip uygulaması
 * Tamamen istemci tarafında çalışır; veriler cihazda saklanır.
 * Piyasa verileri ayarlanan kişisel PHP uç noktası veya desteklenen açık kaynaklar üzerinden yenilenir.
 */
(() => {
  'use strict';

  const APP_VERSION = '0.3.8';
  const DEFAULT_BACKEND_URL = 'https://baykarturizm.com/finansaleb-api/api.php';
  const STORAGE_KEY = 'finansaleb_state_v1';
  const ONBOARDING_KEY = 'finansaleb_onboarded_v1';
  const DAY = 86_400_000;
  const TROY_OUNCE = 31.1034768;
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const WEEKDAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const COLORS = ['#25d5bd','#63a9ff','#ffc65a','#a985ff','#ff7c91','#65d58d','#ff9b55','#7bd7ed'];
  const marketExpanded = {news:false, calendar:false, experts:false, portfolios:false, domestic:false, funds:false, sources:false};
  let marketCompareMode = 'stocks';

  const TYPE_META = {
    BIST: { label: 'BIST hissesi', currency: 'TRY' },
    US: { label: 'ABD hissesi', currency: 'USD' },
    ETF: { label: 'ETF', currency: 'USD' },
    TEFAS: { label: 'TEFAS fonu', currency: 'TRY' },
    GOLD: { label: 'Altın', currency: 'TRY' },
    SILVER: { label: 'Gümüş', currency: 'TRY' },
    FX: { label: 'Döviz', currency: 'TRY' },
    CRYPTO: { label: 'Kripto', currency: 'USD' },
    BOND: { label: 'Tahvil / Eurobond', currency: 'USD' },
    CASH: { label: 'Nakit', currency: 'TRY' },
    CUSTOM: { label: 'Özel varlık', currency: 'TRY' }
  };

  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z"/></svg>',
    portfolio: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2M3 11h18M9 14h6"/></svg>',
    dividend: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.8-1.8-1.2-3.3-1.2-1.8 0-3.2.9-3.2 2.3 0 3.4 6.4 1.3 6.4 4.8 0 1.5-1.4 2.4-3.4 2.4-1.6 0-2.8-.5-3.6-1.5M12 5v14"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    analytics: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 11M4 13l2.4 4.6A7 7 0 0 0 17.9 15"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.2 6.2C3.4 8.1 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.8 9.8a3 3 0 0 0 4.4 4.4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    coin: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.4 8.1 8 9 4.6-.9 8-4 8-9V6Z"/><path d="m9 12 2 2 4-5"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
    server: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-9M16 6h5v5"/></svg>',
    wallet: '<svg viewBox="0 0 24 24"><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M15 11h6v4h-6a2 2 0 0 1 0-4Z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    widget: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    news: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
    market: '<svg viewBox="0 0 24 24"><path d="M3 18 8 13l4 3 7-9"/><path d="M15 7h4v4"/><path d="M3 21h18"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.4-4 2.5-6 6-6s5.6 2 6 6M14 15c3 0 5 1.6 6 5"/></svg>',
    cashflow: '<svg viewBox="0 0 24 24"><path d="M7 3v15M3 7l4-4 4 4M17 21V6M13 17l4 4 4-4"/></svg>'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  const round = (n, digits = 2) => Number(Number(n || 0).toFixed(digits));
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const isoDate = (date = new Date()) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY);
  const parseDate = (value) => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const [y,m,d] = String(value).slice(0,10).split('-').map(Number);
    return new Date(y, (m || 1)-1, d || 1, 12);
  };
  const sameDay = (a,b) => isoDate(a) === isoDate(b);
  const currencySymbol = (c) => ({TRY:'₺',USD:'$',EUR:'€',GBP:'£',XAU:'gr',XAG:'gr'}[c] || c || '');
  const numberFmt = (value, digits = 2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
  const compactFmt = (value) => new Intl.NumberFormat('tr-TR', { notation:'compact', maximumFractionDigits:1 }).format(Number(value || 0));
  const money = (value, currency = 'TRY', compact = false, maxDigits = 2) => {
    const n = Number(value || 0);
    if (compact) return `${currencySymbol(currency)}${compactFmt(n)}`;
    try {
      return new Intl.NumberFormat('tr-TR', { style:'currency', currency, maximumFractionDigits:maxDigits, minimumFractionDigits:maxDigits }).format(n);
    } catch (_) {
      return `${numberFmt(n,maxDigits)} ${currency}`;
    }
  };
  const pct = (value, digits = 2) => `${Number(value || 0) >= 0 ? '+' : ''}${numberFmt(value,digits)}%`;
  const dateText = (value, options = {day:'2-digit',month:'short',year:'numeric'}) => parseDate(value).toLocaleDateString('tr-TR', options);
  const timeAgo = (date) => {
    if (!date) return 'Henüz yenilenmedi';
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60_000) return 'Az önce güncellendi';
    if (diff < 3_600_000) return `${Math.floor(diff/60_000)} dk önce güncellendi`;
    if (diff < DAY) return `${Math.floor(diff/3_600_000)} sa önce güncellendi`;
    return `${Math.floor(diff/DAY)} gün önce güncellendi`;
  };

  function blankState() {
    return {
      version: 1,
      demo: false,
      settings: {
        baseCurrency: 'TRY',
        backendUrl: DEFAULT_BACKEND_URL,
        backendToken: '',
        refreshHours: 6,
        notifications: true,
        autoRefresh: true,
        privacy: false,
        monthlyExpense: 50000,
        monthlyContribution: 15000,
        expectedReturn: 8,
        expectedDividendGrowth: 6,
        dividendGoalAnnual: 600000,
        reinvestDividends: true,
        theme: 'dark'
      },
      market: {
        fx: { TRY: 1, USD: 41.5, EUR: 48.3, GBP: 55.8 },
        lastSync: null,
        lastError: null,
        news: [],
        macroEvents: [],
        expertViews: [],
        investorPortfolios: [],
        domesticPortfolios: [],
        fundSources: [],
        portfolioComparison: { commonStocks: [], institutions: [] },
        sourceCatalog: [],
        lastContentSync: null,
        contentError: null
      },
      assets: [],
      transactions: [],
      dividendEvents: [],
      cashflows: [],
      calendarView: { year: new Date().getFullYear(), month: new Date().getMonth(), selected: isoDate() }
    };
  }

  function demoState() {
    const s = blankState();
    s.demo = true;
    const today = new Date();
    const currentYear = today.getFullYear();
    const future = (days) => isoDate(addDays(today, days));
    const past = (days) => isoDate(addDays(today, -days));
    s.market.lastSync = new Date().toISOString();
    s.assets = [
      { id:'a_tuprs', symbol:'TUPRS', sourceSymbol:'TUPRS.IS', name:'Tüpraş', type:'BIST', currency:'TRY', quantity:260, avgCost:154.25, price:187.40, prevClose:184.10, changePct:1.79, targetWeight:22, dividendTax:15, annualDividendPerShare:17.13, history:[158,162,157,166,171,168,177,174,181,179,184,187.4] },
      { id:'a_schd', symbol:'SCHD', sourceSymbol:'SCHD', name:'Schwab U.S. Dividend Equity ETF', type:'ETF', currency:'USD', quantity:115, avgCost:26.80, price:29.74, prevClose:29.55, changePct:.64, targetWeight:24, dividendTax:20, annualDividendPerShare:1.10, history:[25.6,26.1,25.9,26.7,27.3,27.0,28.1,28.5,28.2,29.1,29.5,29.74] },
      { id:'a_o', symbol:'O', sourceSymbol:'O', name:'Realty Income', type:'US', currency:'USD', quantity:70, avgCost:55.10, price:60.25, prevClose:60.63, changePct:-.63, targetWeight:16, dividendTax:20, annualDividendPerShare:3.24, history:[54.2,55.5,56.1,55.7,57.3,58.0,57.5,59.1,58.6,59.8,60.6,60.25] },
      { id:'a_tmg', symbol:'TMG', sourceSymbol:'TMG', name:'Ak Portföy Yeni Teknolojiler Yabancı Hisse Fonu', type:'TEFAS', currency:'TRY', quantity:41000, avgCost:.0418, price:.0536, prevClose:.0532, changePct:.75, targetWeight:23, dividendTax:0, annualDividendPerShare:0, history:[.041,.042,.043,.044,.045,.046,.047,.048,.049,.051,.052,.0536] },
      { id:'a_gold', symbol:'GRAM ALTIN', sourceSymbol:'GRAM_ALTIN', name:'Gram Altın', type:'GOLD', currency:'TRY', quantity:16.2, avgCost:4260, price:4935, prevClose:4901, changePct:.69, targetWeight:15, dividendTax:0, annualDividendPerShare:0, history:[4200,4280,4310,4405,4470,4540,4610,4690,4750,4825,4901,4935] }
    ];
    s.transactions = [
      {id:'t1',assetId:'a_tuprs',type:'buy',date:past(360),quantity:260,price:154.25,fee:0,currency:'TRY'},
      {id:'t2',assetId:'a_schd',type:'buy',date:past(300),quantity:115,price:26.80,fee:4.9,currency:'USD'},
      {id:'t3',assetId:'a_o',type:'buy',date:past(270),quantity:70,price:55.10,fee:2.1,currency:'USD'},
      {id:'t4',assetId:'a_tmg',type:'buy',date:past(250),quantity:41000,price:.0418,fee:0,currency:'TRY'},
      {id:'t5',assetId:'a_gold',type:'buy',date:past(190),quantity:16.2,price:4260,fee:0,currency:'TRY'}
    ];
    s.dividendEvents = [
      {id:'d1',assetId:'a_schd',exDate:past(125),payDate:past(115),amountPerShare:.248, currency:'USD',status:'confirmed',received:true,source:'Demo'},
      {id:'d2',assetId:'a_o',exDate:past(95),payDate:past(80),amountPerShare:.264, currency:'USD',status:'confirmed',received:true,source:'Demo'},
      {id:'d3',assetId:'a_o',exDate:past(65),payDate:past(50),amountPerShare:.264, currency:'USD',status:'confirmed',received:true,source:'Demo'},
      {id:'d4',assetId:'a_tuprs',exDate:past(38),payDate:past(36),amountPerShare:10.3799, currency:'TRY',status:'confirmed',received:true,source:'Demo'},
      {id:'d5',assetId:'a_schd',exDate:past(32),payDate:past(24),amountPerShare:.255, currency:'USD',status:'confirmed',received:true,source:'Demo'},
      {id:'d6',assetId:'a_o',exDate:past(35),payDate:past(20),amountPerShare:.27, currency:'USD',status:'confirmed',received:true,source:'Demo'},
      {id:'d7',assetId:'a_o',exDate:future(4),payDate:future(19),amountPerShare:.27, currency:'USD',status:'confirmed',received:false,source:'Demo'},
      {id:'d8',assetId:'a_schd',exDate:future(24),payDate:future(31),amountPerShare:.258, currency:'USD',status:'estimated',received:false,source:'Geçmiş düzen tahmini'},
      {id:'d9',assetId:'a_tuprs',exDate:future(34),payDate:future(36),amountPerShare:6.7469, currency:'TRY',status:'confirmed',received:false,source:'Demo'},
      {id:'d10',assetId:'a_o',exDate:future(35),payDate:future(50),amountPerShare:.27, currency:'USD',status:'estimated',received:false,source:'Geçmiş düzen tahmini'},
      {id:'d11',assetId:'a_o',exDate:future(66),payDate:future(81),amountPerShare:.27, currency:'USD',status:'estimated',received:false,source:'Geçmiş düzen tahmini'},
      {id:'d12',assetId:'a_schd',exDate:future(115),payDate:future(122),amountPerShare:.262, currency:'USD',status:'estimated',received:false,source:'Geçmiş düzen tahmini'}
    ];
    s.cashflows = [
      {id:'c1',type:'contribution',date:past(360),amount:40105,currency:'TRY',note:'Başlangıç yatırımı'},
      {id:'c2',type:'contribution',date:past(300),amount:82820,currency:'TRY',note:'ABD portföy katkısı'},
      {id:'c3',type:'contribution',date:past(250),amount:71300,currency:'TRY',note:'Fon katkısı'}
    ];
    s.settings.dividendGoalAnnual = 600000;
    s.settings.monthlyExpense = 50000;
    return s;
  }

  function normalizeState(raw) {
    const base = blankState();
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base,
      ...raw,
      settings: { ...base.settings, ...(raw.settings || {}), backendUrl: String((raw.settings || {}).backendUrl || DEFAULT_BACKEND_URL) },
      market: { ...base.market, ...(raw.market || {}), fx: { ...base.market.fx, ...((raw.market || {}).fx || {}) } },
      assets: Array.isArray(raw.assets) ? raw.assets : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      dividendEvents: Array.isArray(raw.dividendEvents) ? raw.dividendEvents : [],
      cashflows: Array.isArray(raw.cashflows) ? raw.cashflows : [],
      calendarView: { ...base.calendarView, ...(raw.calendarView || {}) }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : blankState();
    } catch (error) {
      console.warn('State load error', error);
      return blankState();
    }
  }

  let state = loadState();
  syncAllAssetLedgers();
  let currentPage = 'dashboard';
  let portfolioFilter = 'ALL';
  let portfolioQuery = '';
  let toastTimer = null;
  let refreshController = null;
  const nativeMarketRequests = new Map();
  let nativeMarketSequence = 0;

  window.FinansalEBNative = {
    onMarketResult(requestId, payload) {
      const pending = nativeMarketRequests.get(String(requestId));
      if (!pending) return;
      nativeMarketRequests.delete(String(requestId));
      clearTimeout(pending.timer);
      try {
        const result = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!result?.ok) throw new Error(result?.error || 'Piyasa verisi alınamadı');
        pending.resolve(result);
      } catch (error) {
        pending.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  function nativeMarketCall(action, params = {}, timeout = 22000) {
    if (!window.Android?.requestMarketData) return Promise.reject(new Error('Android veri köprüsü kullanılamıyor'));
    const requestId = `market_${Date.now().toString(36)}_${++nativeMarketSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        nativeMarketRequests.delete(requestId);
        reject(new Error('Piyasa veri isteği zaman aşımına uğradı'));
      }, timeout);
      nativeMarketRequests.set(requestId, {resolve, reject, timer});
      try {
        window.Android.requestMarketData(requestId, action, JSON.stringify(params));
      } catch (error) {
        clearTimeout(timer);
        nativeMarketRequests.delete(requestId);
        reject(error);
      }
    });
  }

  function saveState({render = false} = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyPrivacy();
    syncNativeWidget();
    if (render) renderPage();
  }

  function assetById(id) { return state.assets.find(a => a.id === id); }
  function fxRate(currency) { return Number(state.market.fx[currency] || (currency === state.settings.baseCurrency ? 1 : 1)); }
  function assetValue(asset) { return Number(asset.quantity || 0) * Number(asset.price || 0) * fxRate(asset.currency); }
  function transactionPosition(assetId, cutoffValue = null, strictBefore = false) {
    const asset = assetById(assetId);
    if (!asset) return { quantity:0, avgCost:0, realizedProfit:0 };
    const cutoff = cutoffValue ? parseDate(cutoffValue) : null;
    const txs = state.transactions
      .filter(t => t.assetId === assetId && (t.type === 'buy' || t.type === 'sell') && t.date)
      .slice()
      .sort((a,b) => parseDate(a.date) - parseDate(b.date));
    if (!txs.length) return { quantity:Number(asset.quantity||0), avgCost:Number(asset.avgCost||0), realizedProfit:0 };
    let quantity = 0, avgCost = 0, realizedProfit = 0;
    for (const t of txs) {
      const td = parseDate(t.date);
      if (cutoff && (strictBefore ? td >= cutoff : td > cutoff)) continue;
      const q = Math.max(0, Number(t.quantity||0));
      const price = Math.max(0, Number(t.price||0));
      const fee = Math.max(0, Number(t.fee||0));
      if (t.type === 'buy') {
        const nextQty = quantity + q;
        avgCost = nextQty ? ((quantity * avgCost) + (q * price) + fee) / nextQty : 0;
        quantity = nextQty;
      } else if (t.type === 'sell') {
        const sold = Math.min(quantity, q);
        realizedProfit += sold * (price - avgCost) - fee;
        quantity = Math.max(0, quantity - sold);
        if (quantity === 0) avgCost = 0;
      }
    }
    return { quantity, avgCost, realizedProfit };
  }
  function syncAssetLedger(asset) {
    const pos = transactionPosition(asset.id);
    const hasTx = state.transactions.some(t => t.assetId === asset.id && (t.type === 'buy' || t.type === 'sell'));
    if (hasTx) { asset.quantity = pos.quantity; asset.avgCost = pos.avgCost; asset.realizedProfit = pos.realizedProfit; }
  }
  function syncAllAssetLedgers() { state.assets.forEach(syncAssetLedger); }
  function assetCost(asset) { const pos=transactionPosition(asset.id); return Number(pos.quantity||0) * Number(pos.avgCost||0) * fxRate(asset.currency); }
  function assetProfit(asset) { return assetValue(asset) - assetCost(asset); }
  function assetProfitPct(asset) { const c = assetCost(asset); return c ? (assetProfit(asset) / c) * 100 : 0; }
  function quantityAtDate(assetId, dateValue) { return Math.max(0, transactionPosition(assetId, dateValue, false).quantity); }
  function eligibleQuantityAtExDate(assetId, dateValue) {
    // Temettü hakkı için hak kullanım (ex-date) gününde yapılan alış hak kazandırmaz;
    // o gün yapılan satış ise önceki gün sahipliği nedeniyle hakkı ortadan kaldırmaz.
    return Math.max(0, transactionPosition(assetId, dateValue, true).quantity);
  }
  function eventGross(event) {
    const asset = assetById(event.assetId);
    if (!asset) return 0;
    const eligibleQty = event.exDate ? eligibleQuantityAtExDate(event.assetId, event.exDate) : quantityAtDate(event.assetId, event.payDate);
    return eligibleQty * Number(event.amountPerShare || 0);
  }
  function eventNet(event) {
    const asset = assetById(event.assetId);
    if (!asset) return 0;
    const tax = clamp(event.taxRate ?? asset.dividendTax ?? 0, 0, 100);
    return eventGross(event) * (1 - tax / 100) * fxRate(event.currency || asset.currency);
  }
  function portfolioMetrics() {
    const total = state.assets.reduce((sum,a) => sum + assetValue(a), 0);
    const cost = state.assets.reduce((sum,a) => sum + assetCost(a), 0);
    const profit = total - cost;
    const daily = state.assets.reduce((sum,a) => {
      const current = assetValue(a);
      const cp = Number(a.changePct || 0) / 100;
      return sum + (cp > -1 ? current - current / (1 + cp) : 0);
    }, 0);
    const dailyPct = total - daily ? daily / (total - daily) * 100 : 0;
    const now = new Date();
    const end = addDays(now, 365);
    const annualDividend = state.dividendEvents
      .filter(e => parseDate(e.payDate || e.exDate) >= addDays(now,-1) && parseDate(e.payDate || e.exDate) <= end)
      .reduce((sum,e) => sum + eventNet(e), 0);
    const allAnnualFallback = state.assets.reduce((sum,a) => sum + Number(a.quantity||0) * Number(a.annualDividendPerShare||0) * (1-clamp(a.dividendTax||0,0,100)/100) * fxRate(a.currency), 0);
    const annual = annualDividend || allAnnualFallback;
    const yieldOnCost = cost ? annual / cost * 100 : 0;
    const dividendYield = total ? annual / total * 100 : 0;
    return { total, cost, profit, profitPct: cost ? profit/cost*100 : 0, daily, dailyPct, annualDividend: annual, monthlyDividend: annual/12, yieldOnCost, dividendYield };
  }

  function dividendMonths(year = new Date().getFullYear()) {
    const values = Array.from({length:12}, (_,month) => ({month, confirmed:0, estimated:0, paid:0}));
    state.dividendEvents.forEach(e => {
      const d = parseDate(e.payDate || e.exDate);
      if (d.getFullYear() !== year) return;
      const amount = eventNet(e);
      if (e.received || d < new Date()) values[d.getMonth()].paid += amount;
      if (e.status === 'confirmed') values[d.getMonth()].confirmed += amount;
      else values[d.getMonth()].estimated += amount;
    });
    return values;
  }

  function upcomingEvents(limit = 8, includeEstimated = true) {
    const from = addDays(new Date(), -1);
    return state.dividendEvents
      .filter(e => parseDate(e.payDate || e.exDate) >= from && (includeEstimated || e.status === 'confirmed'))
      .sort((a,b) => parseDate(a.payDate || a.exDate) - parseDate(b.payDate || b.exDate))
      .slice(0,limit);
  }

  function renderIcons() {
    $$('[data-icon]').forEach(node => { node.innerHTML = ICONS[node.dataset.icon] || ''; });
    $('#privacyBtn').innerHTML = state.settings.privacy ? ICONS.eyeOff : ICONS.eye;
    $('#syncBtn').innerHTML = ICONS.refresh;
    $('#fab').innerHTML = ICONS.plus;
  }

  function applyPrivacy() {
    document.documentElement.style.setProperty('--money-blur', state.settings.privacy ? '7px' : '0px');
    if ($('#privacyBtn')) $('#privacyBtn').innerHTML = state.settings.privacy ? ICONS.eyeOff : ICONS.eye;
  }

  function updateSyncText() {
    const node = $('#syncText');
    if (!node) return;
    if (state.market.lastError) node.textContent = `Son veri korunuyor · ${timeAgo(state.market.lastSync)}`;
    else node.textContent = state.market.lastSync ? timeAgo(state.market.lastSync) : 'Yerel ve özel portföy';
  }

  function showToast(message, duration = 2400) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    try { window.Android?.haptic?.(); } catch (_) {}
  }

  function showModal(html, {dismissible = true, className = ''} = {}) {
    const layer = $('#modalLayer');
    layer.innerHTML = `<section class="modal ${className}" role="dialog" aria-modal="true">${html}</section>`;
    layer.classList.add('open');
    layer.setAttribute('aria-hidden','false');
    const close = () => closeModal();
    if (dismissible) {
      layer.onclick = e => { if (e.target === layer) close(); };
      $$('[data-modal-close], .modal-close', layer).forEach(button => button.addEventListener('click', close));
    } else layer.onclick = null;
  }

  function closeModal() {
    const layer = $('#modalLayer');
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden','true');
    setTimeout(() => { if (!layer.classList.contains('open')) layer.innerHTML = ''; }, 180);
  }

  window.FinansalEBHandleBack = () => {
    const layer = $('#modalLayer');
    if (!layer?.classList.contains('open')) return false;
    closeModal();
    return true;
  };

  function demoBanner() {
    return state.demo ? `<div class="demo-banner"><span>Örnek veriler gösteriliyor; tutarlar gerçek portföyün değildir.</span><button data-action="clear-demo">Boş başla</button></div>` : '';
  }

  function pageHeader(kicker, title, subtitle = '', action = '') {
    return `<div class="page-header"><div><div class="page-kicker">${esc(kicker)}</div><h1 class="page-title">${esc(title)}</h1>${subtitle ? `<div class="page-subtitle">${esc(subtitle)}</div>` : ''}</div>${action}</div>`;
  }

  function heroCard(metrics) {
    const signClass = metrics.daily >= 0 ? 'positive' : 'negative';
    return `<section class="hero-card">
      <div class="hero-top"><span class="hero-label">Toplam portföy değeri</span><span class="live-pill"><i class="live-dot"></i>${state.demo ? 'Demo' : state.market.lastSync ? 'Güncel' : 'Yerel'}</span></div>
      <div class="hero-value">${money(metrics.total,'TRY')}</div>
      <div class="hero-change"><span class="change-badge ${signClass}">${pct(metrics.dailyPct)}</span><span>Bugün ${money(Math.abs(metrics.daily),'TRY')}</span></div>
      <div class="hero-metrics">
        <div class="hero-metric"><div class="label">Toplam maliyet</div><div class="value">${money(metrics.cost,'TRY')}</div></div>
        <div class="hero-metric"><div class="label">Toplam kazanç</div><div class="value ${metrics.profit>=0?'positive':'negative'}">${money(metrics.profit,'TRY')}</div></div>
        <div class="hero-metric"><div class="label">Getiri</div><div class="value ${metrics.profit>=0?'positive':'negative'}">${pct(metrics.profitPct)}</div></div>
      </div>
    </section>`;
  }

  function dividendBarChart(year = new Date().getFullYear()) {
    const months = dividendMonths(year);
    const totals = months.map(m => m.confirmed + m.estimated);
    const max = Math.max(...totals, 1);
    const total = totals.reduce((a,b)=>a+b,0);
    return `<section class="card chart-card">
      <div class="chart-head"><div><div class="metric-label">${year} net temettü akışı</div><div class="chart-big">${money(total,'TRY')}</div></div><div class="period-switch"><button class="active">12 Ay</button><button data-page-go="calendar">Takvim</button></div></div>
      <div class="bar-chart">${months.map((m,i) => {
        const value = totals[i];
        const height = Math.max(value/max*100, value ? 4 : 1);
        return `<div class="bar-col" style="--h:${height}%"><span class="bar-tip">${money(value,'TRY',true,0)}</span><i class="bar ${m.estimated > 0 ? 'estimated':''}" style="height:${height}%"></i><span class="bar-month">${MONTHS_SHORT[i]}</span></div>`;
      }).join('')}</div>
      <div class="chart-foot"><span><i class="legend-dot"></i>Açıklanmış/alınmış</span><span><i class="legend-dot estimated"></i>Tahmini</span></div>
    </section>`;
  }

  function eventStatusMeta(event) {
    if (event.received || event.status === 'historical') return { className:'historical', label:'Alındı' };
    if (event.status === 'confirmed') return { className:'confirmed', label:'Açıklanmış' };
    if (event.status === 'proposed') return { className:'proposed', label:'Şirket teklifi' };
    return { className:'estimated', label:'Tahmini' };
  }

  function eventRow(event) {
    const asset = assetById(event.assetId);
    if (!asset) return '';
    const d = parseDate(event.payDate || event.exDate);
    const amount = eventNet(event);
    const days = Math.ceil((d - new Date()) / DAY);
    const meta = days < 0 ? 'Ödeme gerçekleşti' : days === 0 ? 'Bugün' : `${days} gün sonra`;
    return `<article class="event-row" data-asset-id="${esc(asset.id)}">
      <div class="event-date"><div><strong>${String(d.getDate()).padStart(2,'0')}</strong><span>${MONTHS_SHORT[d.getMonth()]}</span></div></div>
      <div class="event-main"><div class="event-title">${esc(asset.symbol)} · ${event.payDate ? 'Temettü ödemesi' : 'Hak kullanım'}</div><div class="event-meta">${meta} · ${numberFmt(quantityAtDate(asset.id,event.exDate||event.payDate), asset.type==='TEFAS'?0:2)} hak sahibi adet</div><span class="status-pill ${eventStatusMeta(event).className}">${eventStatusMeta(event).label}</span></div>
      <div class="event-amount">${money(amount,'TRY')}</div>
    </article>`;
  }

  function assetRow(asset) {
    const value = assetValue(asset);
    const change = Number(asset.changePct || 0);
    const type = TYPE_META[asset.type]?.label || asset.type;
    return `<article class="asset-row" data-asset-id="${esc(asset.id)}">
      <div class="asset-logo">${esc(shortSymbol(asset.symbol))}</div>
      <div><div class="asset-name">${esc(asset.symbol)} <span style="color:var(--muted);font-weight:500">· ${esc(asset.name || type)}</span></div><div class="asset-meta">${numberFmt(asset.quantity, asset.type==='TEFAS'?0:4)} adet · ${money(asset.price,asset.currency,false,asset.price<1?4:2)}</div></div>
      <div class="asset-values"><div class="asset-value">${money(value,'TRY')}</div><div class="asset-change ${change>=0?'positive':'negative'}">${pct(change)}</div></div>
    </article>`;
  }

  function shortSymbol(symbol) {
    const clean = String(symbol || '').replace(/[^A-Za-zÇĞİÖŞÜ0-9]/g,'').toUpperCase();
    return clean.length <= 4 ? clean : clean.slice(0,3);
  }

  function renderDashboard() {
    const m = portfolioMetrics();
    const upcoming = upcomingEvents(4);
    const next = upcoming[0];
    const nextAmount = next ? eventNet(next) : 0;
    const nextDate = next ? dateText(next.payDate || next.exDate,{day:'numeric',month:'long'}) : 'Planlanmış ödeme yok';
    const goal = Number(state.settings.dividendGoalAnnual || 0);
    const goalPct = goal ? Math.min(100,m.annualDividend/goal*100) : 0;
    const eventsHtml = upcoming.length ? upcoming.map(eventRow).join('') : emptyState('coin','Yaklaşan temettü yok','Temettü açıklaması veya tahmin eklendiğinde burada görünecek.');
    return `${demoBanner()}
      ${pageHeader('Güncel durum','Portföyün tek ekranda','Hisse, fon, maden ve nakit birlikte')}
      ${state.assets.length ? heroCard(m) : emptyPortfolioHero()}
      <section class="section"><div class="grid-two">
        <article class="card metric-card"><div class="icon-circle">${ICONS.coin}</div><div class="metric-label">Yıllık net temettü</div><div class="metric-value">${money(m.annualDividend,'TRY')}</div><div class="metric-note">Aylık ortalama ${money(m.monthlyDividend,'TRY')}</div></article>
        <article class="card metric-card"><div class="icon-circle">${ICONS.calendar}</div><div class="metric-label">Sıradaki ödeme</div><div class="metric-value">${next ? money(nextAmount,'TRY') : '—'}</div><div class="metric-note">${esc(nextDate)}</div></article>
      </div></section>
      <section class="section"><div class="card" style="padding:15px 16px"><div class="section-head" style="margin:0"><span class="section-title">Temettü hedefi</span><span class="section-link">${numberFmt(goalPct,1)}%</span></div><div class="progress"><i style="width:${goalPct}%"></i></div><div class="chart-foot" style="margin-top:8px"><span>Yıllık ${money(m.annualDividend,'TRY')}</span><span>Hedef ${money(goal,'TRY')}</span></div></div></section>
      <section class="section">${dividendBarChart()}</section>
      <section class="section"><div class="section-head"><span class="section-title">Yaklaşan ödemeler</span><button class="section-link" data-page-go="calendar">Tüm takvim</button></div><div class="event-list">${eventsHtml}</div></section>`;
  }

  function emptyPortfolioHero() {
    return `<section class="empty"><div class="empty-icon">${ICONS.portfolio}</div><div class="empty-title">Portföyün henüz boş</div><div class="empty-text">BIST, ABD hissesi, ETF, TEFAS fonu, altın, gümüş veya özel varlık ekleyerek takibe başla.</div><button class="primary-btn" style="margin-top:15px" data-action="add-asset">İlk varlığı ekle</button></section>`;
  }

  function emptyState(icon, title, text) {
    return `<div class="empty"><div class="empty-icon">${ICONS[icon] || ICONS.info}</div><div class="empty-title">${esc(title)}</div><div class="empty-text">${esc(text)}</div></div>`;
  }

  function renderPortfolio() {
    const m = portfolioMetrics();
    let assets = [...state.assets];
    if (portfolioFilter !== 'ALL') assets = assets.filter(a => a.type === portfolioFilter);
    if (portfolioQuery) {
      const q = portfolioQuery.toLocaleUpperCase('tr-TR');
      assets = assets.filter(a => `${a.symbol} ${a.name} ${TYPE_META[a.type]?.label}`.toLocaleUpperCase('tr-TR').includes(q));
    }
    assets.sort((a,b) => assetValue(b) - assetValue(a));
    const filters = [['ALL','Tümü'],['BIST','BIST'],['US','ABD'],['ETF','ETF'],['TEFAS','Fon'],['GOLD','Altın'],['SILVER','Gümüş'],['CUSTOM','Diğer']];
    return `${demoBanner()}
      ${pageHeader('Varlıklarım','Portföy','Maliyet, güncel değer ve dağılım',`<button class="header-action" data-action="add-asset">+ Varlık</button>`)}
      <div class="search-box">${ICONS.search}<input id="assetSearch" value="${esc(portfolioQuery)}" placeholder="Sembol veya varlık ara"></div>
      <div class="pill-row" style="margin-top:10px">${filters.map(([key,label])=>`<button class="filter-pill ${portfolioFilter===key?'active':''}" data-filter="${key}">${label}</button>`).join('')}</div>
      <section class="summary-strip"><div class="summary-item"><div class="summary-label">Değer</div><div class="summary-value">${money(m.total,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Maliyet</div><div class="summary-value">${money(m.cost,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Kâr/Zarar</div><div class="summary-value ${m.profit>=0?'positive':'negative'}">${money(m.profit,'TRY')}</div></div></section>
      <section class="section"><div class="section-head"><span class="section-title">${assets.length} varlık</span><button class="section-link" data-action="add-transaction">İşlem ekle</button></div><div class="asset-list">${assets.length ? assets.map(assetRow).join('') : emptyState('search','Sonuç bulunamadı','Filtreyi veya arama metnini değiştir.')}</div></section>`;
  }

  function renderDividends() {
    const m = portfolioMetrics();
    const now = new Date();
    const paidYear = state.dividendEvents.filter(e => {
      const d = parseDate(e.payDate || e.exDate);
      return d.getFullYear() === now.getFullYear() && (e.received || d < now);
    }).reduce((s,e)=>s+eventNet(e),0);
    const pendingYear = state.dividendEvents.filter(e => {
      const d = parseDate(e.payDate || e.exDate);
      return d.getFullYear() === now.getFullYear() && d >= now;
    }).reduce((s,e)=>s+eventNet(e),0);
    const contributors = state.assets.map(a => {
      const amount = state.dividendEvents.filter(e=>e.assetId===a.id && parseDate(e.payDate||e.exDate)>=addDays(now,-1) && parseDate(e.payDate||e.exDate)<=addDays(now,365)).reduce((s,e)=>s+eventNet(e),0) || Number(a.quantity||0)*Number(a.annualDividendPerShare||0)*(1-clamp(a.dividendTax||0,0,100)/100)*fxRate(a.currency);
      return {asset:a, amount};
    }).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
    const maxContribution = Math.max(...contributors.map(x=>x.amount),1);
    const upcoming = upcomingEvents(10);
    const goal = Number(state.settings.dividendGoalAnnual || 0);
    const progress = goal ? Math.min(100,m.annualDividend/goal*100) : 0;
    return `${demoBanner()}
      ${pageHeader('Pasif gelir','Temettü merkezi','Brüt/net, açıklanmış/tahmini ayrımı')}
      <section class="dividend-hero"><div class="dividend-hero-grid"><div><div class="dividend-main-label">Önümüzdeki 12 ay net gelir</div><div class="dividend-main-value">${money(m.annualDividend,'TRY')}</div><div class="event-meta" style="color:#a7c8c7">Aylık ortalama ${money(m.monthlyDividend,'TRY')}</div></div><div class="dividend-side"><div class="mini-stat"><div class="label">Temettü verimi</div><div class="value">${numberFmt(m.dividendYield,2)}%</div></div><div class="mini-stat"><div class="label">Maliyete göre</div><div class="value">${numberFmt(m.yieldOnCost,2)}%</div></div></div></div><div class="progress-wrap"><div class="progress-head"><span>Yıllık gelir hedefi</span><span>${numberFmt(progress,1)}%</span></div><div class="progress"><i style="width:${progress}%"></i></div></div></section>
      <section class="section"><div class="grid-two"><article class="card metric-card"><div class="metric-label">Bu yıl alınan</div><div class="metric-value positive">${money(paidYear,'TRY')}</div><div class="metric-note">Net gerçekleşen ödeme</div></article><article class="card metric-card"><div class="metric-label">Bu yıl beklenen</div><div class="metric-value">${money(pendingYear,'TRY')}</div><div class="metric-note">Açıklanmış + tahmini</div></article></div></section>
      <section class="section">${dividendBarChart()}</section>
      <section class="section"><div class="section-head"><span class="section-title">Gelir katkısı</span><span class="section-link">12 ay</span></div><div class="card" style="padding:15px">${contributors.length ? contributors.map(({asset,amount})=>`<div class="rebalance-row"><div class="rebalance-head"><span>${esc(asset.symbol)}</span><span>${money(amount,'TRY')} · ${numberFmt(amount/m.annualDividend*100,1)}%</span></div><div class="dual-progress"><i class="actual" style="width:${amount/maxContribution*100}%"></i></div></div>`).join('') : `<div class="empty-text" style="margin:0">Temettü üreten bir varlık eklenmedi.</div>`}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">Ödeme akışı</span><button class="section-link" data-action="add-dividend">Temettü ekle</button></div><div class="event-list">${upcoming.length ? upcoming.map(eventRow).join('') : emptyState('coin','Ödeme bulunamadı','Açıklanan veya tahmini bir temettü olayı ekle.')}</div></section>`;
  }

  function renderCalendar() {
    const view = state.calendarView;
    const year = Number(view.year);
    const month = Number(view.month);
    const first = new Date(year,month,1,12);
    const last = new Date(year,month+1,0,12);
    const startOffset = (first.getDay()+6)%7;
    const cells = [];
    for (let i=0;i<42;i++) {
      const d = new Date(year,month,1-startOffset+i,12);
      const dateIso = isoDate(d);
      const events = state.dividendEvents.filter(e => sameDay(parseDate(e.payDate||e.exDate),d) || (e.exDate && sameDay(parseDate(e.exDate),d)));
      cells.push({d,dateIso,events,outside:d.getMonth()!==month});
    }
    const selected = parseDate(view.selected);
    const selectedEvents = state.dividendEvents.filter(e => sameDay(parseDate(e.payDate||e.exDate),selected) || (e.exDate && sameDay(parseDate(e.exDate),selected)));
    return `${demoBanner()}
      ${pageHeader('Gelir ajandası','Temettü takvimi','Hak kullanım ve ödeme günleri',`<button class="header-action" data-action="export-calendar">Takvimi aktar</button>`)}
      <section class="card calendar-card"><div class="calendar-head"><div class="calendar-title">${MONTHS[month]} ${year}</div><div class="calendar-nav"><button data-cal-nav="-1">‹</button><button data-cal-today>•</button><button data-cal-nav="1">›</button></div></div><div class="weekdays">${WEEKDAYS.map(d=>`<div>${d}</div>`).join('')}</div><div class="calendar-grid">${cells.map(c=>`<button class="day-cell ${c.outside?'outside':''} ${sameDay(c.d,new Date())?'today':''} ${c.dateIso===view.selected?'selected':''}" data-date="${c.dateIso}">${c.d.getDate()}${c.events.length?`<span class="day-dots">${c.events.slice(0,3).map(e=>`<i class="day-dot ${e.status==='estimated'?'warning':''}"></i>`).join('')}</span>`:''}</button>`).join('')}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">${dateText(view.selected,{day:'numeric',month:'long',year:'numeric'})}</span><button class="section-link" data-action="add-dividend" data-date-prefill="${view.selected}">Olay ekle</button></div><div class="event-list">${selectedEvents.length ? selectedEvents.map(eventRow).join('') : emptyState('calendar','Bu tarihte olay yok','Ödeme veya hak kullanım günü seçildiğinde ayrıntılar burada görünür.')}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">Sıradaki ödemeler</span></div><div class="event-list">${upcomingEvents(5).map(eventRow).join('') || emptyState('coin','Yaklaşan ödeme yok','Henüz bir temettü takvimi oluşmadı.')}</div></section>`;
  }

  function allocationBy(keyFn) {
    const map = new Map();
    state.assets.forEach(a => {
      const key = keyFn(a);
      map.set(key,(map.get(key)||0)+assetValue(a));
    });
    return [...map.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }

  function donutHtml(items, total, centerLabel = 'Toplam') {
    let cursor = 0;
    const segments = items.map((item,i) => {
      const start = total ? cursor/total*360 : 0;
      cursor += item.value;
      const end = total ? cursor/total*360 : 0;
      return `${COLORS[i%COLORS.length]} ${start}deg ${end}deg`;
    }).join(', ');
    return `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${segments || '#17323e 0 360deg'})"><div class="donut-center"><strong>${money(total,'TRY',true,0)}</strong><span>${esc(centerLabel)}</span></div></div><div class="legend-list">${items.slice(0,6).map((item,i)=>`<div class="legend-row"><i class="legend-swatch" style="background:${COLORS[i%COLORS.length]}"></i><span class="legend-name">${esc(item.name)}</span><span class="legend-value">${total?numberFmt(item.value/total*100,1):'0'}%</span></div>`).join('')}</div></div>`;
  }

  function projection() {
    const m = portfolioMetrics();
    const monthlyContribution = Math.max(0, Number(state.settings.monthlyContribution || 0));
    const annualReturn = Number(state.settings.expectedReturn || 0)/100;
    const targetIncome = Math.max(1, Number(state.settings.dividendGoalAnnual || 1));
    const currentYield = Math.max(m.dividendYield/100, .025);
    let balance = m.total;
    let years = 0;
    for (; years < 50; years++) {
      if (balance * currentYield >= targetIncome) break;
      for (let month=0; month<12; month++) balance = balance*(1+annualReturn/12)+monthlyContribution;
    }
    return { years, futureValue: balance, targetCapital: targetIncome/currentYield, currentCoverage: targetIncome ? m.annualDividend/targetIncome*100 : 0 };
  }

  function renderAnalytics() {
    const m = portfolioMetrics();
    const byType = allocationBy(a => TYPE_META[a.type]?.label || a.type);
    const byCurrency = allocationBy(a => a.currency || 'TRY');
    const p = projection();
    const concentration = byType[0] && m.total ? byType[0].value/m.total*100 : 0;
    const incomeCoverage = Number(state.settings.monthlyExpense || 0) ? m.monthlyDividend/Number(state.settings.monthlyExpense)*100 : 0;
    const insights = [];
    if (concentration > 45) insights.push({icon:'info',title:'Dağılım yoğunluğu',text:`Portföyün %${numberFmt(concentration,1)} kadarı ${byType[0].name} grubunda. Hedef oranlarını kontrol et.`});
    if (m.yieldOnCost > 0) insights.push({icon:'trend',title:'Maliyete göre temettü',text:`Yıllık net temettünün maliyete oranı %${numberFmt(m.yieldOnCost,2)}. Yeniden yatırım bu oranı zamanla büyütebilir.`});
    if (!insights.length) insights.push({icon:'shield',title:'Veri oluşuyor',text:'Daha anlamlı içgörüler için varlık, hedef oran ve temettü olaylarını ekle.'});
    return `${demoBanner()}
      ${pageHeader('Portföy röntgeni','Analiz ve özgürlük','Dağılım, dengeleme ve gelir hedefi')}
      <section class="card chart-card"><div class="section-head" style="margin:0"><span class="section-title">Varlık sınıfı dağılımı</span><span class="section-link">${state.assets.length} varlık</span></div>${donutHtml(byType,m.total,'Portföy')}</section>
      <section class="section"><div class="card chart-card"><div class="section-head" style="margin:0"><span class="section-title">Para birimi dağılımı</span></div>${donutHtml(byCurrency,m.total,'Kur dağılımı')}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">Hedef dengeleme</span><button class="section-link" data-action="edit-targets">Hedefleri düzenle</button></div><div class="card" style="padding:15px">${state.assets.length ? state.assets.slice().sort((a,b)=>assetValue(b)-assetValue(a)).map(a=>{const actual=m.total?assetValue(a)/m.total*100:0;const target=Number(a.targetWeight||0);return `<div class="rebalance-row"><div class="rebalance-head"><span>${esc(a.symbol)}</span><span>%${numberFmt(actual,1)} / hedef %${numberFmt(target,1)}</span></div><div class="dual-progress"><i class="target" style="width:${Math.min(100,target)}%"></i><i class="actual" style="width:${Math.min(100,actual)}%"></i></div></div>`}).join('') : `<div class="empty-text" style="margin:0">Hedef ağırlık için önce varlık ekle.</div>`}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">Finansal özgürlük</span><button class="section-link" data-action="projection-settings">Ayarla</button></div><div class="card" style="padding:16px"><div class="grid-two"><div><div class="metric-label">Temettü gider karşılama</div><div class="metric-value">%${numberFmt(incomeCoverage,1)}</div></div><div><div class="metric-label">Tahmini hedef süresi</div><div class="metric-value">${p.years>=50?'50+':p.years} yıl</div></div></div><div class="progress-wrap"><div class="progress-head"><span>Yıllık gelir hedefine ilerleme</span><span>%${numberFmt(Math.min(100,p.currentCoverage),1)}</span></div><div class="progress"><i style="width:${Math.min(100,p.currentCoverage)}%"></i></div></div><div class="chart-foot"><span>Hedef sermaye ${money(p.targetCapital,'TRY',true,0)}</span><span>Aylık katkı ${money(state.settings.monthlyContribution,'TRY',true,0)}</span></div></div></section>
      <section class="section"><div class="section-head"><span class="section-title">İçgörüler</span></div><div class="event-list">${insights.map(i=>`<article class="card insight-card"><div class="insight-icon">${ICONS[i.icon]||ICONS.info}</div><div><div class="insight-title">${esc(i.title)}</div><div class="insight-text">${esc(i.text)}</div></div></article>`).join('')}</div></section>`;
  }


  function friendlyMacroTitle(e) {
    const raw = String(e?.title || '').trim();
    const map = [
      [/monetary policy committee|interest rate|policy rate|ppk/i,'TCMB Faiz Kararı'],
      [/inflation report/i,'TCMB Enflasyon Raporu'],
      [/consumer price|tüketici fiyat|cpi/i,'TÜFE / Enflasyon Verisi'],
      [/gross domestic|gsyh|gayrisafi/i,'Büyüme Verisi'],
      [/unemployment|işsizlik/i,'İşsizlik Verisi'],
      [/industrial production|sanayi üret/i,'Sanayi Üretimi'],
      [/balance of payments|ödemeler dengesi/i,'Ödemeler Dengesi'],
      [/financial stability/i,'Finansal İstikrar Raporu']
    ];
    for (const [rx,label] of map) if (rx.test(raw)) return label;
    return raw || `${e?.source || 'Ekonomi'} duyurusu`;
  }

  function simpleImpactText(title) {
    const t=String(title||'').toLocaleLowerCase('tr-TR');
    if (/faiz|ppk|merkez bank/.test(t)) return 'Faiz, mevduat, döviz ve Borsa İstanbul üzerinde etkili olabilir.';
    if (/enflasyon|tüfe|cpi/.test(t)) return 'Faiz beklentilerini ve TL varlıkların fiyatlamasını etkileyebilir.';
    if (/büyüme|gsyh|sanayi/.test(t)) return 'Ekonomik büyüme beklentileri ve şirket kârları açısından izlenir.';
    if (/işsizlik/.test(t)) return 'Ekonominin gücü ve iç talep hakkında fikir verir.';
    return 'Piyasa beklentilerini etkileyebilecek bir veri veya gelişmedir.';
  }

  function renderMarket() {
    const today=isoDate();
    const all = Array.isArray(state.market.news) ? state.market.news : [];
    const macroAll = (Array.isArray(state.market.macroEvents) ? state.market.macroEvents : []).filter(e=>!e.date || String(e.date)>=today);
    const viewsAll = Array.isArray(state.market.expertViews) ? state.market.expertViews : [];
    const investors = Array.isArray(state.market.investorPortfolios) ? state.market.investorPortfolios : [];
    const domestic = Array.isArray(state.market.domesticPortfolios) ? state.market.domesticPortfolios : [];
    const funds = Array.isArray(state.market.fundSources) ? state.market.fundSources : [];
    const sourceCatalog = Array.isArray(state.market.sourceCatalog) ? state.market.sourceCatalog : [];
    const comparison = state.market.portfolioComparison || {commonStocks:[],institutions:[]};

    // target=_blank WebView'de yeni pencere isteyebildiği için bilinçli olarak kullanılmıyor.
    const clickable = (href, cls, body) => `<button type="button" class="content-item external-card ${cls}" data-external-url="${esc(href||'')}">${body}<span class="content-open">Aç →</span></button>`;
    const limitItems = (items,key,limit=5) => marketExpanded[key] ? items : items.slice(0,limit);
    const moreButton = (count,key,limit=5) => count>limit ? `<button type="button" class="market-more" data-action="toggle-market" data-market-key="${key}">${marketExpanded[key]?'Daha az göster':'Tümünü göster'} <span>${marketExpanded[key]?'↑':'↓'}</span></button>` : '';

    const newsCards = limitItems(all,'news').map(n=>clickable(n.url,'content-news',
      `<div class="content-kicker">${esc(n.publisher||n.source||'Haber')} · ${n.publishedAt?timeAgo(n.publishedAt):''}</div>
       <div class="content-title">${esc(n.title)}</div>
       <div class="content-summary">${esc(n.summary||'Ayrıntılar için habere dokunun.')}</div>
       <div class="plain-explain"><b>Basitçe:</b> ${esc(simpleImpactText(n.title))}</div>`)).join('');

    const macroCards = limitItems(macroAll,'calendar').map(e=>clickable(e.url,'content-calendar',
      `<div class="content-kicker">${esc(e.source||'Resmi takvim')} · ${esc(dateText(e.date,{day:'2-digit',month:'long',year:'numeric'}))}</div>
       <div class="content-title">${esc(friendlyMacroTitle(e))}</div>
       <div class="content-summary">${esc(simpleImpactText(friendlyMacroTitle(e)))}</div>`)).join('');

    const viewCards = limitItems(viewsAll,'experts').map(v=>clickable(v.url,'content-expert',
      `<div class="content-kicker">${esc(v.publisher||v.source||'Piyasa görüşü')} · ${v.publishedAt?timeAgo(v.publishedAt):''}</div>
       <div class="content-title">${esc(v.titleTr||v.title)}</div>
       <div class="content-summary">${esc(v.summary||'Görüşün ayrıntıları için dokunun.')}</div>`)).join('');

    const domesticCards = limitItems(domestic,'domestic',5).map(p=>{
      const holdings=Array.isArray(p.holdings)?p.holdings:[];
      const chips=holdings.slice(0,10).map(h=>`<span class="ticker-chip">${esc(h.ticker||h.name)}</span>`).join('');
      const note=p.status==='temporarily_unavailable'?'Kaynak şu anda otomatik okunamadı; resmi sayfa açılabilir.':`${holdings.length} kalem izleniyor${p.updatedAt?` · ${esc(dateText(p.updatedAt))}`:''}`;
      return clickable(p.url,'content-domestic',`<div class="content-kicker">🇹🇷 ${esc(p.typeLabel||'Model portföy')}</div><div class="content-title">${esc(p.manager)}</div><div class="ticker-wrap">${chips||'<span class="ticker-chip muted">Resmi kaynağı görüntüle</span>'}</div><div class="content-summary">${esc(note)}</div>`);
    }).join('');

    const fundCards = limitItems(funds,'funds',6).map(f=>{
      const chips=(f.funds||[]).slice(0,6).map(x=>`<span class="fund-chip"><b>${esc(x.code)}</b> ${esc(x.name)}</span>`).join('');
      return clickable(f.url,'content-fund',`<div class="content-kicker">Fon yönetim şirketi</div><div class="content-title">${esc(f.manager)}</div><div class="fund-chip-wrap">${chips}</div><div class="content-summary">${esc(f.note||'Fonlar TEFAS ve kurumun resmi sayfasından karşılaştırılabilir.')}</div>`);
    }).join('');

    const examplePortfolios = [...domestic.map(p=>({...p, source:'Türkiye model portföyü', filingDate:p.updatedAt})), ...investors];
    const portfolioCards = limitItems(examplePortfolios,'portfolios',6).map(r=>{
      const hs=(r.holdings||[]).slice(0,6);
      const summary=hs.length ? hs.map(h=>h.name||h.ticker).join(' • ') : 'Son bildirim geçici olarak alınamadı; resmi kaynağı açabilirsiniz.';
      return clickable(r.url,'content-portfolio',`<div class="content-kicker">${String(r.source||'').includes('Türkiye')?'🇹🇷':'🌎'} ${esc(r.source||'Kamuya açık portföy')}${r.filingDate?` · ${esc(r.filingDate)}`:''}</div><div class="content-title">${esc(r.manager)}</div><div class="content-summary">${esc(summary)}</div>`);
    }).join('');

    const common=(comparison.commonStocks||[]).slice(0,12);
    const parsedDomesticCount = domestic.filter(x=>(x.holdings||[]).length).length;
    const compareStockHtml = `<div class="compare-summary">
      <div class="compare-stat"><b>${domestic.length}</b><span>Türk kurum kaynağı</span></div>
      <div class="compare-stat"><b>${parsedDomesticCount}</b><span>otomatik okunan</span></div>
      <div class="compare-stat"><b>${common.length}</b><span>ortak hisse</span></div>
    </div>
    ${common.length?`<div class="compare-subtitle">Birden fazla model portföyde ortak görülenler</div><div class="ticker-wrap compare-tickers">${common.map(x=>`<span class="ticker-chip strong">${esc(x.ticker)} <small>${esc(x.count)} kurum</small></span>`).join('')}</div>`:`<div class="compare-empty">Ortak hisse hesaplanabilmesi için en az iki model portföyün otomatik okunması gerekir.</div>`}`;

    const compareFundHtml = `<div class="fund-compare-grid">${funds.map(f=>`<button type="button" data-external-url="${esc(f.url)}" class="fund-provider-mini external-card"><b>${esc(f.manager)}</b><span>${(f.funds||[]).map(x=>esc(x.code)).join(' · ')}</span></button>`).join('')}</div>
      <div class="compare-tip">Fonları yalnız getiriye göre değil; <b>risk seviyesi, kategori, vade, yönetim ücreti ve 1A/6A/1Y performans</b> ile karşılaştıracağız. TEFAS ana referans olacak.</div>`;

    const compareWorldHtml = `<div class="ticker-wrap compare-tickers">${investors.map(x=>`<button type="button" class="ticker-chip strong external-chip" data-external-url="${esc(x.url)}">${esc(x.manager)}</button>`).join('')}</div><div class="compare-tip">ABD portföyleri 13F bildirimleri nedeniyle gecikmelidir. Günlük işlem sinyali olarak kullanılmamalıdır.</div>`;

    const sourceHtml=limitItems(sourceCatalog,'sources',8).map(s=>`<button type="button" class="source-mini external-card" data-external-url="${esc(s.url)}"><span><b>${esc(s.name)}</b><small>${esc(s.role||'Kaynak')}</small></span><em>↗</em></button>`).join('');

    return `${pageHeader('Piyasa','Sade piyasa','Bugün ne oldu, yaklaşan tarihler ve profesyoneller ne izliyor?',`<button class="header-action" data-action="refresh-content">Yenile</button>`)}
      ${state.market.contentError?`<div class="market-notice"><strong>Bazı kaynaklar güncellenemedi</strong><span>${esc(state.market.contentError)}</span></div>`:''}

      <section class="card market-card market-news"><div class="section-head"><div><div class="section-title">📰 Bugün ne oldu?</div><div class="section-note">Kısa Türkçe özet + neden önemli olduğu.</div></div></div><div class="content-list">${newsCards || emptyState('news','Henüz haber yok','Yenile düğmesine basın.')}</div>${moreButton(all.length,'news')}</section>

      <section class="card market-card market-calendar"><div class="section-head"><div><div class="section-title">📅 Yaklaşan önemli tarihler</div><div class="section-note">TCMB ve TÜİK verileri sade Türkçe başlıklarla.</div></div></div><div class="content-list">${macroCards || emptyState('calendar','Yaklaşan takvim verisi yok','Yenile düğmesine basın.')}</div>${moreButton(macroAll.length,'calendar')}</section>

      <section class="card market-card market-compare"><div class="section-head"><div><div class="section-title">⚖️ Portföy karşılaştırma</div><div class="section-note">Kurumların hisse ve fon fikirlerini aynı yerde karşılaştır.</div></div></div>
        <div class="segment-tabs">
          <button type="button" class="${marketCompareMode==='stocks'?'active':''}" data-action="market-compare" data-compare-mode="stocks">Hisseler</button>
          <button type="button" class="${marketCompareMode==='funds'?'active':''}" data-action="market-compare" data-compare-mode="funds">Fonlar</button>
          <button type="button" class="${marketCompareMode==='world'?'active':''}" data-action="market-compare" data-compare-mode="world">Dünya</button>
        </div>
        <div class="compare-body">${marketCompareMode==='funds'?compareFundHtml:marketCompareMode==='world'?compareWorldHtml:compareStockHtml}</div>
      </section>

      <section class="card market-card market-domestic"><div class="section-head"><div><div class="section-title">🇹🇷 Türkiye model portföyleri</div><div class="section-note">Doğrulanabilir resmi kaynaklar; kurum görüşüdür, yatırım tavsiyesi değildir.</div></div></div><div class="content-list">${domesticCards || emptyState('portfolio','Henüz Türk model portföyü alınamadı','Kaynak sayfaları aşağıdan açılabilir.')}</div>${moreButton(domestic.length,'domestic')}</section>

      <section class="card market-card market-funds"><div class="section-head"><div><div class="section-title">📊 Fon radarı ve kaynakları</div><div class="section-note">İş, Garanti, Ak, Yapı Kredi, Ahlatcı, Gedik ve diğer fon yöneticileri.</div></div></div><div class="content-list">${fundCards || emptyState('portfolio','Fon kaynağı yok','Yenile düğmesine basın.')}</div>${moreButton(funds.length,'funds',6)}</section>

      <section class="card market-card market-experts"><div class="section-head"><div><div class="section-title">💡 Piyasa görüşleri</div><div class="section-note">Türk uzmanlar, araştırma ekipleri ve seçili yabancı yatırımcılar.</div></div></div><div class="content-list">${viewCards || emptyState('people','Henüz görüş yok','Yenile düğmesine basın.')}</div>${moreButton(viewsAll.length,'experts')}</section>

      <section class="card market-card market-portfolios"><div class="section-head"><div><div class="section-title">🌍 Örnek yatırımcı ve kurum portföyleri</div><div class="section-note">Türkiye kurumları + dünyadan kamuya açık örnek portföyler.</div></div></div><div class="content-list">${portfolioCards || emptyState('portfolio','Henüz portföy verisi yok','Yenile düğmesine basın.')}</div>${moreButton(examplePortfolios.length,'portfolios',6)}</section>

      <section class="card market-card market-sources"><div class="section-head"><div><div class="section-title">🔎 Kaynaklar</div><div class="section-note">Tek kaynağa bağlı kalmıyoruz.</div></div></div><div class="source-grid">${sourceHtml}</div>${moreButton(sourceCatalog.length,'sources',8)}</section>`;
  }

  function renderInvestors() { return renderMarket(); }

  async function refreshContent() {
    try {
      let result;
      if (window.Android?.requestMarketData && state.settings.backendUrl) {
        result = await nativeMarketCall('backendcontent', {
          backendUrl: state.settings.backendUrl,
          backendToken: state.settings.backendToken || ''
        }, 45000);
      } else {
        result = await backendCall({action:'content'}, 20000);
      }
      if (!result?.ok) throw new Error(result?.error||'İçerik alınamadı');
      state.market.news = result.data?.news || [];
      state.market.macroEvents = result.data?.macroEvents || [];
      state.market.expertViews = result.data?.expertViews || [];
      state.market.investorPortfolios = result.data?.investorPortfolios || [];
      state.market.domesticPortfolios = result.data?.domesticPortfolios || [];
      state.market.fundSources = result.data?.fundSources || [];
      state.market.portfolioComparison = result.data?.portfolioComparison || {commonStocks:[],institutions:[]};
      state.market.sourceCatalog = result.data?.sources || [];
      state.market.lastContentSync = new Date().toISOString();
      state.market.contentError = null;
      saveState(); renderPage(); showToast('Haber ve piyasa verileri güncellendi');
    } catch (e) {
      state.market.contentError = e.message || 'İçerik alınamadı';
      saveState(); showToast(`İçerik alınamadı: ${state.market.contentError}`, 4200);
    }
  }

  function renderPage(resetScroll = true) {
    const previousScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const page = $('#page');
    const renderers = { dashboard:renderDashboard, portfolio:renderPortfolio, dividends:renderDividends, calendar:renderCalendar, analytics:renderAnalytics, market:renderMarket, investors:renderInvestors };
    page.innerHTML = (renderers[currentPage] || renderDashboard)();
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === currentPage));
    renderIcons();
    applyPrivacy();
    updateSyncText();
    bindPageEvents();
    if (resetScroll) {
      window.scrollTo({top:0,behavior:'instant'});
    } else {
      requestAnimationFrame(() => window.scrollTo({top:previousScroll,behavior:'instant'}));
    }
  }

  function bindPageEvents() {
    $$('[data-external-url]').forEach(node=>node.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const href=String(node.dataset.externalUrl||'').trim();
      if (!/^https?:\/\//i.test(href)) { showToast('Kaynak bağlantısı alınamadı'); return; }
      if (window.Android?.openExternal) {
        try { window.Android.openExternal(href); return; } catch (_) {}
      }
      window.location.href = href;
    }));
    $$('[data-page-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.pageGo)));
    $$('[data-action]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handleAction(b.dataset.action,b);}));
    $$('.asset-row').forEach(row=>row.addEventListener('click',()=>showAssetDetail(row.dataset.assetId)));
    $$('.event-row').forEach(row=>row.addEventListener('click',()=>showAssetDetail(row.dataset.assetId)));
    $$('.filter-pill').forEach(b=>b.addEventListener('click',()=>{portfolioFilter=b.dataset.filter;renderPage();}));
    const search = $('#assetSearch');
    if (search) search.addEventListener('input',e=>{portfolioQuery=e.target.value; window.clearTimeout(search._timer); search._timer=setTimeout(renderPage,180);});
    $$('[data-cal-nav]').forEach(b=>b.addEventListener('click',()=>moveCalendar(Number(b.dataset.calNav))));
    $('[data-cal-today]')?.addEventListener('click',()=>{const d=new Date();state.calendarView={year:d.getFullYear(),month:d.getMonth(),selected:isoDate(d)};saveState();renderPage();});
    $$('.day-cell').forEach(b=>b.addEventListener('click',()=>{const d=parseDate(b.dataset.date);state.calendarView.year=d.getFullYear();state.calendarView.month=d.getMonth();state.calendarView.selected=b.dataset.date;saveState();renderPage();}));
  }

  function navigate(page) {
    currentPage = page;
    renderPage();
  }

  function moveCalendar(delta) {
    const d = new Date(state.calendarView.year,state.calendarView.month+delta,1,12);
    state.calendarView.year=d.getFullYear();state.calendarView.month=d.getMonth();state.calendarView.selected=isoDate(d);
    saveState(); renderPage();
  }

  function handleAction(action, node) {
    const actions = {
      'clear-demo': clearDemo,
      'add-asset': () => showAssetForm(),
      'add-transaction': () => showTransactionForm(),
      'add-dividend': () => showDividendForm(null,node?.dataset.datePrefill),
      'export-calendar': exportCalendar,
      'edit-targets': showTargetEditor,
      'projection-settings': showProjectionSettings,
      'refresh-content': refreshContent,
      'toggle-market': () => { const key=node?.dataset.marketKey; if(key && Object.prototype.hasOwnProperty.call(marketExpanded,key)){ marketExpanded[key]=!marketExpanded[key]; renderPage(false); } },
      'market-compare': () => { const mode=node?.dataset.compareMode; if(['stocks','funds','world'].includes(mode)){ marketCompareMode=mode; renderPage(false); } }
    };
    actions[action]?.();
  }

  function clearDemo() {
    state = blankState();
    state.demo = false;
    localStorage.setItem(ONBOARDING_KEY,'1');
    saveState();
    renderPage();
    showToast('Demo verileri temizlendi');
  }

  function modalHeader(title) {
    return `<div class="modal-grabber"></div><div class="modal-head"><div class="modal-title">${esc(title)}</div><button type="button" class="modal-x" data-modal-close aria-label="Kapat">${ICONS.close}</button></div>`;
  }

  function showAssetForm(assetId = null) {
    const existing = assetId ? assetById(assetId) : null;
    const a = existing || {type:'BIST',currency:'TRY',symbol:'',name:'',quantity:'',avgCost:'',price:'',targetWeight:0,dividendTax:0,annualDividendPerShare:0,sourceSymbol:''};
    showModal(`${modalHeader(existing ? 'Varlığı düzenle' : 'Yeni varlık ekle')}
      <form id="assetForm"><div class="form-grid">
        <div class="field"><label>Varlık türü</label><select name="type">${Object.entries(TYPE_META).map(([key,m])=>`<option value="${key}" ${a.type===key?'selected':''}>${m.label}</option>`).join('')}</select></div>
        <div class="field"><label>Para birimi</label><select name="currency">${['TRY','USD','EUR','GBP'].map(c=>`<option value="${c}" ${a.currency===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="field full asset-lookup-field">
          <label>Sembol / fon kodu</label>
          <div class="lookup-input-row">
            <input name="symbol" required autocomplete="off" autocapitalize="characters" value="${esc(a.symbol)}" placeholder="DEVA, TUPRS, SCHD, TMG">
            <button type="button" class="lookup-button" id="assetLookupBtn">Bul</button>
          </div>
          <input type="hidden" name="sourceSymbol" value="${esc(a.sourceSymbol||'')}">
          <div id="assetLookupStatus" class="lookup-status">${existing ? 'Kayıtlı sembolü yeniden doğrulamak için Bul’a basın.' : 'Sembolü yazınca şirket/fon adı ve güncel fiyat otomatik aranır.'}</div>
          <div id="assetSearchResults" class="asset-search-results" hidden></div>
        </div>
        <div class="field full"><label>Varlık adı</label><input name="name" value="${esc(a.name)}" placeholder="Otomatik doldurulacak; gerekirse düzenleyebilirsiniz"></div>
        <div class="field"><label>Adet / pay</label><input name="quantity" type="number" step="any" min="0" value="${a.quantity ?? ''}" placeholder="0"></div>
        <div class="field"><label>${existing ? 'Ortalama maliyet' : 'Alış fiyatı'}</label><input name="avgCost" type="number" step="any" min="0" value="${a.avgCost ?? ''}" placeholder="0"></div>
        ${existing ? '' : `<div class="field full"><label>Alış tarihi</label><input name="purchaseDate" type="date" value="${isoDate()}" required><div class="field-hint">Temettü hak edişi ve geçmiş performans bu tarihe göre hesaplanır.</div></div>`}
        <div class="field"><label>Güncel fiyat</label><input name="price" type="number" step="any" min="0" value="${a.price ?? ''}" placeholder="Otomatik çekilecek"></div>
        <div class="field"><label>Hedef ağırlık (%)</label><input name="targetWeight" type="number" step=".1" min="0" max="100" value="${a.targetWeight ?? 0}"></div>
        <div class="field"><label>Temettü stopajı (%)</label><input name="dividendTax" type="number" step=".1" min="0" max="100" value="${a.dividendTax ?? 0}"></div>
        <div class="field"><label>Yıllık temettü / pay</label><input name="annualDividendPerShare" type="number" step="any" min="0" value="${a.annualDividendPerShare ?? 0}" placeholder="Otomatik hesaplanır"><div class="field-hint">Bul sonrası son 12 aylık temettülerden otomatik hesaplanır; gerekirse düzenleyebilirsiniz.</div></div>
        <div class="field full"><div class="field-hint">BIST/ABD/ETF için sembol araması; TEFAS için fon kodu sorgusu APK içinde otomatik yapılır. Stopaj oranı kişiseldir.</div></div>
      </div><div class="button-row">${existing?`<button type="button" class="danger-btn" id="deleteAsset">Sil</button>`:`<button type="button" class="secondary-btn" id="assetCancelButton" data-modal-close>Vazgeç</button>`}<button class="primary-btn" id="assetSaveButton" type="submit">Kaydet</button></div></form>`);

    const form = $('#assetForm');
    const typeSelect = form.elements.type;
    const symbolInput = form.elements.symbol;
    const sourceInput = form.elements.sourceSymbol;
    const nameInput = form.elements.name;
    const priceInput = form.elements.price;
    const currencyInput = form.elements.currency;
    const statusNode = $('#assetLookupStatus');
    const resultsNode = $('#assetSearchResults');
    const lookupButton = $('#assetLookupBtn');
    const saveButton = $('#assetSaveButton');
    let lookupTimer = null;
    let lookupGeneration = 0;
    let selectedMarketData = existing ? {
      symbol:a.symbol, sourceSymbol:a.sourceSymbol, name:a.name, price:a.price,
      prevClose:a.prevClose, changePct:a.changePct, currency:a.currency
    } : null;

    const setStatus = (message, tone = '') => {
      statusNode.textContent = message;
      statusNode.className = `lookup-status ${tone}`.trim();
    };
    const clearResults = () => {
      resultsNode.hidden = true;
      resultsNode.innerHTML = '';
    };
    const showResults = results => {
      resultsNode.innerHTML = results.map((result,index)=>`
        <button type="button" class="asset-search-result" data-result-index="${index}">
          <span class="asset-result-symbol">${esc(result.symbol)}</span>
          <span class="asset-result-main"><strong>${esc(result.name||result.symbol)}</strong><small>${esc(result.exchange||TYPE_META[result.type]?.label||'Otomatik veri')}</small></span>
          <span class="asset-result-price">${Number(result.price)>0?money(result.price,result.currency||currencyInput.value,false,Math.abs(Number(result.price))<1?4:2):'Seç'}</span>
        </button>`).join('');
      resultsNode.hidden = !results.length;
      $$('.asset-search-result', resultsNode).forEach(button=>button.addEventListener('click',()=>{
        const result=results[Number(button.dataset.resultIndex)];
        if(result)applyLookupResult(result);
      }));
    };

    async function applyLookupResult(result) {
      clearResults();
      selectedMarketData = {...result};
      symbolInput.value = String(result.symbol || symbolInput.value).toUpperCase();
      sourceInput.value = result.sourceSymbol || inferSourceSymbol(symbolInput.value,typeSelect.value);
      if (result.name) nameInput.value = result.name;
      if (result.currency) currencyInput.value = result.currency;
      if (Number(result.price)>0) priceInput.value = String(Number(result.price));
      setStatus(`${result.symbol} bulundu · ad ve fiyat otomatik dolduruldu.`, 'success');

      try {
        setStatus(`${result.symbol} doğrulanıyor · fiyat ve temettü geçmişi alınıyor…`, 'loading');
        const quote = await lookupQuotePreview({
          symbol:result.symbol,
          sourceSymbol:sourceInput.value,
          type:typeSelect.value,
          currency:currencyInput.value
        });
        selectedMarketData = {...selectedMarketData,...quote};
        if (quote.name && (!nameInput.value || nameInput.value===symbolInput.value)) nameInput.value=quote.name;
        if (quote.currency) currencyInput.value=quote.currency;
        if (Number(quote.price)>0) priceInput.value=String(Number(quote.price));
        const cutoff=addDays(new Date(),-365);
        const ttm=(Array.isArray(quote.dividends)?quote.dividends:[]).filter(d=>parseDate(d.date)>=cutoff && parseDate(d.date)<=new Date()).reduce((sum,d)=>sum+Number(d.amount||0),0);
        if (ttm>0 && form.elements.annualDividendPerShare) form.elements.annualDividendPerShare.value=String(Number(ttm.toFixed(6)));
        setStatus(`${result.symbol} doğrulandı · fiyat${ttm>0?' ve son 12 aylık temettü':''} otomatik dolduruldu.`, 'success');
      } catch (error) {
        if (Number(result.price)>0) setStatus(`${result.symbol} bulundu · fiyat dolduruldu; temettü geçmişi şu an alınamadı.`, 'warning');
        else setStatus(`${result.symbol} bulundu; fiyat şu an alınamadı. Kayıttan sonra yeniden denenecek.`, 'warning');
      }
    }

    async function runLookup({force = false} = {}) {
      const type = typeSelect.value;
      const query = String(symbolInput.value||'').trim();
      clearTimeout(lookupTimer);
      clearResults();
      if (!assetTypeSupportsLookup(type)) {
        setStatus('Bu varlık türünde isim ve fiyat manuel girilir.', 'muted');
        return null;
      }
      if (query.length < (type==='TEFAS'?3:2)) {
        setStatus(type==='TEFAS'?'TEFAS fonunun kodunu en az 3 karakter yazın.':'Arama için en az 2 karakter yazın.', 'warning');
        return null;
      }

      const generation = ++lookupGeneration;
      lookupButton.disabled = true;
      lookupButton.classList.add('loading');
      setStatus('Piyasa kaydında aranıyor…', 'loading');
      try {
        const results = await searchAssetCandidates(query,type);
        if (generation !== lookupGeneration) return null;
        if (!results.length) {
          setStatus('Eşleşen hisse/fon bulunamadı. Sembolü veya fon kodunu kontrol edin.', 'error');
          return null;
        }
        const normalized = query.toUpperCase().replace(/\.IS$/,'').replace(/\s+/g,'');
        const exact = results.find(result => String(result.symbol||'').toUpperCase().replace(/\.IS$/,'')===normalized
          || String(result.sourceSymbol||'').toUpperCase()===query.toUpperCase());
        if (exact || (force && results.length===1) || results.length===1) {
          const chosen = exact || results[0];
          await applyLookupResult(chosen);
          return chosen;
        }
        showResults(results);
        setStatus(`${results.length} eşleşme bulundu; doğru olanı seçin.`, 'success');
        return null;
      } catch (error) {
        if (generation === lookupGeneration) setStatus(error.message || 'Otomatik arama yapılamadı.', 'error');
        return null;
      } finally {
        if (generation === lookupGeneration) {
          lookupButton.disabled = false;
          lookupButton.classList.remove('loading');
        }
      }
    }

    typeSelect.addEventListener('change',()=>{
      const meta = TYPE_META[typeSelect.value];
      if (meta) currencyInput.value = meta.currency;
      selectedMarketData = null;
      sourceInput.value = '';
      clearResults();
      if (assetTypeSupportsLookup(typeSelect.value)) {
        setStatus(typeSelect.value==='TEFAS'?'Fon kodunu yazın; adı ve son fiyatı TEFAS’tan alınır.':'Sembolü yazınca otomatik arama başlar.');
        if (symbolInput.value.trim().length >= (typeSelect.value==='TEFAS'?3:2)) runLookup({force:true});
      } else setStatus('Bu varlık türünde isim ve fiyat manuel girilir.', 'muted');
    });

    symbolInput.addEventListener('input',()=>{
      selectedMarketData = null;
      sourceInput.value = '';
      clearResults();
      const cursor = symbolInput.selectionStart;
      symbolInput.value = symbolInput.value.toUpperCase();
      try { symbolInput.setSelectionRange(cursor,cursor); } catch (_) {}
      clearTimeout(lookupTimer);
      const min = typeSelect.value==='TEFAS'?3:2;
      if (symbolInput.value.trim().length < min) {
        setStatus(typeSelect.value==='TEFAS'?'TEFAS fon kodunu yazın.':'Sembolü yazın; arama otomatik başlayacak.');
        return;
      }
      setStatus('Yazmayı bitirince otomatik aranacak…', 'loading');
      lookupTimer = setTimeout(()=>runLookup(),550);
    });
    lookupButton.addEventListener('click',()=>runLookup({force:true}));

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      saveButton.disabled = true;
      saveButton.textContent = 'Kaydediliyor…';
      try {
        if (assetTypeSupportsLookup(typeSelect.value) && (!sourceInput.value || !nameInput.value || !(Number(priceInput.value)>0))) {
          await runLookup({force:true});
        }
        const fd = new FormData(form);
        const type = String(fd.get('type'));
        const symbol = String(fd.get('symbol')).trim().toUpperCase();
        if (!symbol) throw new Error('Sembol veya fon kodu zorunludur.');
        const currentPrice = Number(fd.get('price')||0);
        const next = {
          id: existing?.id || uid('asset'),
          type,
          currency:String(fd.get('currency')),
          symbol,
          sourceSymbol:String(fd.get('sourceSymbol')).trim() || inferSourceSymbol(symbol,type),
          name:String(fd.get('name')).trim() || symbol,
          quantity:Number(fd.get('quantity')||0),
          avgCost:Number(fd.get('avgCost')||0),
          price:currentPrice,
          prevClose:Number(selectedMarketData?.prevClose || existing?.prevClose || currentPrice),
          changePct:Number(selectedMarketData?.changePct || existing?.changePct || 0),
          targetWeight:Number(fd.get('targetWeight')||0),
          dividendTax:Number(fd.get('dividendTax')||0),
          annualDividendPerShare:Number(fd.get('annualDividendPerShare')||0),
          history:existing?.history || [],
          lastUpdated:currentPrice>0 ? new Date().toISOString() : (existing?.lastUpdated || null),
          dataStatus:currentPrice>0 ? 'auto' : (existing?.dataStatus || 'pending'),
          dataSource:selectedMarketData?.source || existing?.dataSource || null
        };
        if (existing) Object.assign(existing,next); else {
          state.assets.push(next);
          if (next.quantity > 0) { const purchaseDate=String(fd.get('purchaseDate')||''); if(!purchaseDate) throw new Error('Alış tarihi zorunludur.'); state.transactions.push({id:uid('tx'),assetId:next.id,type:'buy',date:purchaseDate,quantity:next.quantity,price:next.avgCost,fee:0,currency:next.currency}); syncAssetLedger(next); }
        }
        state.demo=false;
        saveState();
        closeModal();
        renderPage();
        showToast(existing?'Varlık güncellendi':'Varlık eklendi');
        if (state.settings.autoRefresh || !(next.price>0)) refreshAll({silent:true,onlyAssetId:next.id});
      } catch (error) {
        setStatus(error.message || 'Varlık kaydedilemedi.', 'error');
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Kaydet';
      }
    });
    $('#deleteAsset')?.addEventListener('click',()=>confirmDeleteAsset(existing.id));
  }

  function confirmDeleteAsset(assetId) {
    const a = assetById(assetId); if (!a) return;
    showModal(`${modalHeader('Varlığı sil')}<div class="empty-text" style="font-size:11px;margin:0">${esc(a.symbol)} ve bu varlığa bağlı tüm işlemler/temettüler silinecek. Bu işlem geri alınamaz.</div><div class="button-row"><button class="secondary-btn" data-modal-close>Vazgeç</button><button class="danger-btn" id="confirmDelete">Kalıcı olarak sil</button></div>`);
    $('#confirmDelete').addEventListener('click',()=>{
      state.assets=state.assets.filter(x=>x.id!==assetId);
      state.transactions=state.transactions.filter(x=>x.assetId!==assetId);
      state.dividendEvents=state.dividendEvents.filter(x=>x.assetId!==assetId);
      saveState(); closeModal(); renderPage(); showToast('Varlık silindi');
    });
  }

  function showTransactionForm(assetId = null) {
    if (!state.assets.length) return showAssetForm();
    showModal(`${modalHeader('Yeni portföy işlemi')}<form id="txForm">
      <div class="field"><label>İşlem türü</label><div class="segmented" id="txSegments"><button type="button" class="active" data-tx="buy">Alış</button><button type="button" data-tx="sell">Satış</button><button type="button" data-tx="dividend">Temettü</button></div><input type="hidden" name="type" value="buy"></div>
      <div class="form-grid"><div class="field full"><label>Varlık</label><select name="assetId">${state.assets.map(a=>`<option value="${a.id}" ${a.id===assetId?'selected':''}>${esc(a.symbol)} · ${esc(a.name)}</option>`).join('')}</select></div><div class="field"><label>Tarih</label><input type="date" name="date" value="${isoDate()}" required></div><div class="field"><label>Adet / pay</label><input type="number" step="any" min="0" name="quantity" required></div><div class="field"><label>Fiyat / pay</label><input type="number" step="any" min="0" name="price" required></div><div class="field"><label>Komisyon</label><input type="number" step="any" min="0" name="fee" value="0"></div></div>
      <div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">İşlemi kaydet</button></div></form>`);
    $$('#txSegments button').forEach(b=>b.addEventListener('click',()=>{$$('#txSegments button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#txForm').elements.type.value=b.dataset.tx;}));
    $('#txForm').addEventListener('submit',e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget); const a=assetById(fd.get('assetId')); if(!a)return;
      const type=fd.get('type'), qty=Number(fd.get('quantity')||0), price=Number(fd.get('price')||0), fee=Number(fd.get('fee')||0), txDate=String(fd.get('date')||'');
      if(!txDate) return showToast('İşlem tarihi zorunludur.');
      if(!(qty>0) || !(price>=0)) return showToast('Adet ve fiyatı kontrol edin.');
      if(type==='dividend') { state.dividendEvents.push({id:uid('div'),assetId:a.id,exDate:String(fd.get('date')),payDate:String(fd.get('date')),amountPerShare:qty?price/qty:price,currency:a.currency,status:'confirmed',received:true,source:'Manuel işlem'}); }
      else {
        if(type==='sell'){const available=quantityAtDate(a.id,txDate);if(qty>available+1e-9)return showToast(`Bu tarihte en fazla ${numberFmt(available,4)} adet satabilirsiniz.`);}
        state.transactions.push({id:uid('tx'),assetId:a.id,type,date:txDate,quantity:qty,price,fee,currency:a.currency});
        syncAssetLedger(a);
      }
      state.demo=false;saveState();closeModal();renderPage();showToast('İşlem kaydedildi');
    });
  }

  function showDividendForm(assetId = null, datePrefill = null) {
    if (!state.assets.length) return showAssetForm();
    showModal(`${modalHeader('Temettü olayı ekle')}<form id="divForm"><div class="form-grid">
      <div class="field full"><label>Varlık</label><select name="assetId">${state.assets.map(a=>`<option value="${a.id}" ${a.id===assetId?'selected':''}>${esc(a.symbol)} · ${esc(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Hak kullanım tarihi</label><input type="date" name="exDate" value="${datePrefill||isoDate()}" required></div><div class="field"><label>Ödeme tarihi</label><input type="date" name="payDate" value="${datePrefill||isoDate(addDays(new Date(),2))}" required></div>
      <div class="field"><label>Pay başına brüt tutar</label><input type="number" step="any" min="0" name="amount" required></div><div class="field"><label>Durum</label><select name="status"><option value="confirmed">Açıklanmış</option><option value="estimated">Tahmini</option></select></div>
      <div class="field"><label>Stopaj (%)</label><input type="number" step=".1" min="0" max="100" name="taxRate" placeholder="Varlık ayarı"></div><div class="field"><label>Kaynak/not</label><input name="source" value="Manuel kayıt"></div>
      <div class="field full"><div class="toggle-row" id="receivedToggle"><div class="toggle-main"><div class="toggle-title">Ödeme alındı</div><div class="toggle-note">Geçmiş temettü olarak kaydet</div></div><i class="switch"></i><input type="hidden" name="received" value="0"></div></div>
      </div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#receivedToggle').addEventListener('click',()=>{const sw=$('.switch','#receivedToggle');sw.classList.toggle('on');$('#divForm').elements.received.value=sw.classList.contains('on')?'1':'0';});
    $('#divForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const a=assetById(fd.get('assetId'));if(!a)return;state.dividendEvents.push({id:uid('div'),assetId:a.id,exDate:String(fd.get('exDate')),payDate:String(fd.get('payDate')),amountPerShare:Number(fd.get('amount')||0),currency:a.currency,status:String(fd.get('status')),received:fd.get('received')==='1',taxRate:fd.get('taxRate')===''?undefined:Number(fd.get('taxRate')),source:String(fd.get('source')||'Manuel kayıt')});state.demo=false;saveState();closeModal();renderPage();showToast('Temettü olayı eklendi');scheduleEventNotifications();});
  }

  function showAssetDetail(assetId) {
    const a=assetById(assetId);if(!a)return;const value=assetValue(a),cost=assetCost(a),profit=value-cost,annual=state.dividendEvents.filter(e=>e.assetId===a.id&&parseDate(e.payDate||e.exDate)>=addDays(new Date(),-1)&&parseDate(e.payDate||e.exDate)<=addDays(new Date(),365)).reduce((s,e)=>s+eventNet(e),0)||Number(a.quantity||0)*Number(a.annualDividendPerShare||0)*(1-clamp(a.dividendTax||0,0,100)/100)*fxRate(a.currency);const hist=(a.history||[]).map(Number).filter(Number.isFinite);const spark=sparklineSvg(hist);const pos=transactionPosition(a.id);const firstBuy=state.transactions.filter(t=>t.assetId===a.id&&t.type==='buy'&&t.date).sort((x,y)=>parseDate(x.date)-parseDate(y.date))[0];
    showModal(`${modalHeader(a.name||a.symbol)}<div class="detail-sheet"><div class="big-symbol">${esc(a.symbol)}</div><div class="detail-price">${money(a.price,a.currency,false,a.price<1?4:2)}</div><div class="asset-change ${Number(a.changePct||0)>=0?'positive':'negative'}">${pct(a.changePct)} bugün</div>${spark}<div class="detail-grid"><div class="detail-stat"><div class="label">Portföy değeri</div><div class="value">${money(value,'TRY')}</div></div><div class="detail-stat"><div class="label">Açık kâr / zarar</div><div class="value ${profit>=0?'positive':'negative'}">${money(profit,'TRY')} · ${pct(assetProfitPct(a))}</div></div><div class="detail-stat"><div class="label">Ortalama maliyet</div><div class="value">${money(a.avgCost,a.currency,false,a.avgCost<1?4:2)}</div></div><div class="detail-stat"><div class="label">Gerçekleşen kâr / zarar</div><div class="value ${Number(pos.realizedProfit||0)>=0?'positive':'negative'}">${money(Number(pos.realizedProfit||0)*fxRate(a.currency),'TRY')}</div></div><div class="detail-stat"><div class="label">İlk alış tarihi</div><div class="value">${firstBuy?dateText(firstBuy.date):'—'}</div></div><div class="detail-stat"><div class="label">12 ay net temettü</div><div class="value">${money(annual,'TRY')}</div></div></div><div class="button-row"><button class="secondary-btn" id="detailDividend">Temettü ekle</button><button class="primary-btn" id="detailEdit">Düzenle</button></div></div>`);
    $('#detailEdit').addEventListener('click',()=>showAssetForm(a.id));$('#detailDividend').addEventListener('click',()=>showDividendForm(a.id));
  }

  function sparklineSvg(values) {
    if(values.length<2)return '';
    const w=320,h=90,pad=5,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
    const pts=values.map((v,i)=>[pad+i*(w-2*pad)/(values.length-1),h-pad-(v-min)/range*(h-2*pad)]);
    const line=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area=`${line} L${pts.at(-1)[0]},${h} L${pts[0][0]},${h} Z`;
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25d5bd" stop-opacity=".35"/><stop offset="1" stop-color="#25d5bd" stop-opacity="0"/></linearGradient></defs><path class="area" d="${area}"/><path class="line" d="${line}"/></svg>`;
  }

  function showTargetEditor() {
    showModal(`${modalHeader('Hedef portföy ağırlıkları')}<form id="targetForm">${state.assets.map(a=>`<div class="field"><label>${esc(a.symbol)} hedefi (%)</label><input type="number" step=".1" min="0" max="100" name="${a.id}" value="${Number(a.targetWeight||0)}"></div>`).join('')}<div class="field-hint">Toplam hedefin %100 olması önerilir. Uygulama sadece farkı gösterir; alım-satım emri vermez.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#targetForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);state.assets.forEach(a=>a.targetWeight=Number(fd.get(a.id)||0));saveState();closeModal();renderPage();showToast('Hedefler güncellendi');});
  }

  function showProjectionSettings() {
    const s=state.settings;
    showModal(`${modalHeader('Özgürlük projeksiyonu')}<form id="projectionForm"><div class="form-grid"><div class="field"><label>Aylık yaşam gideri (₺)</label><input type="number" min="0" step="100" name="monthlyExpense" value="${s.monthlyExpense}"></div><div class="field"><label>Aylık yeni yatırım (₺)</label><input type="number" min="0" step="100" name="monthlyContribution" value="${s.monthlyContribution}"></div><div class="field"><label>Yıllık getiri varsayımı (%)</label><input type="number" step=".1" name="expectedReturn" value="${s.expectedReturn}"></div><div class="field"><label>Yıllık net temettü hedefi (₺)</label><input type="number" min="0" step="1000" name="dividendGoalAnnual" value="${s.dividendGoalAnnual}"></div></div><div class="disclaimer">Projeksiyon bir tahmindir; piyasa getirisi, kur ve temettü ödemeleri garanti değildir.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#projectionForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);['monthlyExpense','monthlyContribution','expectedReturn','dividendGoalAnnual'].forEach(k=>state.settings[k]=Number(fd.get(k)||0));saveState();closeModal();renderPage();showToast('Projeksiyon ayarları güncellendi');});
  }

  function showSettings() {
    const s=state.settings;
    showModal(`${modalHeader('Ayarlar')}<div class="setting-group"><div class="setting-group-title">Veri ve yenileme</div><div class="setting-list">
      <div class="setting-row" id="dataSettings"><div class="setting-icon">${ICONS.server}</div><div><div class="setting-name">Kişisel veri sunucusu</div><div class="setting-value">${s.backendUrl?esc(s.backendUrl):'Doğrudan kaynak modu'}</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="refreshNow"><div class="setting-icon">${ICONS.refresh}</div><div><div class="setting-name">Şimdi yenile</div><div class="setting-value">${timeAgo(state.market.lastSync)}</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="sourceStatus"><div class="setting-icon">${ICONS.info}</div><div><div class="setting-name">Veri kaynakları</div><div class="setting-value">Açıklanmış ve tahmini veri ayrımı</div></div><span class="setting-chevron">›</span></div>
    </div></div>
    <div class="setting-group"><div class="setting-group-title">Kişiselleştirme</div><div class="setting-list">
      <div class="setting-row" id="privacySetting"><div class="setting-icon">${ICONS.eye}</div><div><div class="setting-name">Gizlilik modu</div><div class="setting-value">Tutarları bulanıklaştır</div></div><i class="switch ${s.privacy?'on':''}"></i></div>
      <div class="setting-row" id="notificationSetting"><div class="setting-icon">${ICONS.bell}</div><div><div class="setting-name">Temettü bildirimleri</div><div class="setting-value">Hak kullanım ve ödeme uyarıları</div></div><i class="switch ${s.notifications?'on':''}"></i></div>
      <div class="setting-row" id="widgetHelp"><div class="setting-icon">${ICONS.widget}</div><div><div class="setting-name">Android widget'ları</div><div class="setting-value">Portföy özeti ve sıradaki temettü</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="projectionSettings"><div class="setting-icon">${ICONS.target}</div><div><div class="setting-name">Gelir hedefi</div><div class="setting-value">${money(s.dividendGoalAnnual,'TRY')} / yıl</div></div><span class="setting-chevron">›</span></div>
    </div></div>
    <div class="setting-group"><div class="setting-group-title">Yedek ve taşıma</div><div class="setting-list">
      <div class="setting-row" id="exportData"><div class="setting-icon">${ICONS.download}</div><div><div class="setting-name">Yedeği dışa aktar</div><div class="setting-value">Şifrelenmemiş JSON dosyası</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="exportCalendar"><div class="setting-icon">${ICONS.calendar}</div><div><div class="setting-name">Temettü takvimini aktar</div><div class="setting-value">Google/Apple/Outlook için .ics</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="importData"><div class="setting-icon">${ICONS.upload}</div><div><div class="setting-name">Yedekten geri yükle</div><div class="setting-value">Finansal(EB) JSON yedeği</div></div><span class="setting-chevron">›</span></div>
      <div class="setting-row" id="resetData"><div class="setting-icon" style="color:var(--negative);background:rgba(255,102,127,.08)">${ICONS.trash}</div><div><div class="setting-name" style="color:var(--negative)">Tüm verileri sil</div><div class="setting-value">Cihazdaki yerel portföyü sıfırla</div></div><span class="setting-chevron">›</span></div>
    </div></div><div class="disclaimer">Finansal(EB) v${APP_VERSION}. Yatırım tavsiyesi değildir. Fiyat ve temettü kayıtlarını işlem yapmadan önce aracı kurum/KAP verisiyle doğrula.</div>`,{className:'settings-modal'});
    $('#dataSettings').addEventListener('click',showDataSettings);
    $('#refreshNow').addEventListener('click',()=>{closeModal();refreshAll();});
    $('#sourceStatus').addEventListener('click',showSourceStatus);
    $('#privacySetting').addEventListener('click',()=>{state.settings.privacy=!state.settings.privacy;saveState();showSettings();renderPage();});
    $('#notificationSetting').addEventListener('click',()=>{state.settings.notifications=!state.settings.notifications;saveState();showSettings();scheduleEventNotifications();});
    $('#widgetHelp').addEventListener('click',showWidgetHelp);
    $('#projectionSettings').addEventListener('click',showProjectionSettings);
    $('#exportData').addEventListener('click',exportData);
    $('#exportCalendar').addEventListener('click',exportCalendar);
    $('#importData').addEventListener('click',()=>$('#importInput').click());
    $('#resetData').addEventListener('click',confirmReset);
  }

  function showDataSettings() {
    const s=state.settings;
    showModal(`${modalHeader('Kişisel veri sunucusu')}<form id="dataForm"><div class="field"><label>API adresi</label><input name="backendUrl" value="${esc(s.backendUrl)}" placeholder="https://alanadiniz.com/finansaleb/api.php"></div><div class="field"><label>API erişim anahtarı</label><input name="backendToken" value="${esc(s.backendToken)}" placeholder="Kişisel anahtar"></div><div class="field"><label>Otomatik yenileme aralığı</label><select name="refreshHours">${[1,3,6,12,24].map(v=>`<option value="${v}" ${Number(s.refreshHours)===v?'selected':''}>${v} saat</option>`).join('')}</select></div><div class="toggle-row" id="autoRefreshToggle"><div class="toggle-main"><div class="toggle-title">Uygulama açılınca yenile</div><div class="toggle-note">Son yenileme süresi dolduysa otomatik çalışır</div></div><i class="switch ${s.autoRefresh?'on':''}"></i><input type="hidden" name="autoRefresh" value="${s.autoRefresh?'1':'0'}"></div><div class="disclaimer">APK; BIST/ABD/ETF aramasını, fiyatları ve TEFAS fon kodlarını kendi Android veri katmanından otomatik sorgular. Kişisel PHP sunucusu yalnızca önbellek, KAP ve ek dayanıklılık için isteğe bağlıdır.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet ve test et</button></div></form>`);
    $('#autoRefreshToggle').addEventListener('click',()=>{const sw=$('.switch','#autoRefreshToggle');sw.classList.toggle('on');$('#dataForm').elements.autoRefresh.value=sw.classList.contains('on')?'1':'0';});
    $('#dataForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);s.backendUrl=String(fd.get('backendUrl')).trim().replace(/\/$/,'');s.backendToken=String(fd.get('backendToken')).trim();s.refreshHours=Number(fd.get('refreshHours'));s.autoRefresh=fd.get('autoRefresh')==='1';saveState();closeModal();await refreshAll();});
  }

  function showSourceStatus() {
    showModal(`${modalHeader('Veri kaynakları')}<div class="source-row"><div><div class="source-name">BIST / ABD / ETF / döviz</div><div class="source-note">Gecikmeli fiyat ve geçmiş olay verisi; son başarılı değer cihazda tutulur.</div></div><span class="source-state ${state.market.lastError?'warning':''}"><i></i>${state.market.lastError?'Son değer':'Hazır'}</span></div><div class="source-row"><div><div class="source-name">TEFAS yatırım fonları</div><div class="source-note">Kişisel PHP uç noktası üzerinden TEFAS geçmiş fiyat sorgusu.</div></div><span class="source-state ${state.settings.backendUrl?'':'warning'}"><i></i>${state.settings.backendUrl?'Hazır':'Sunucu gerekli'}</span></div><div class="source-row"><div><div class="source-name">KAP temettü bildirimleri</div><div class="source-note">Açıklanmış kayıtlar sunucu katmanında önbelleğe alınır; tahminler ayrı etiketlenir.</div></div><span class="source-state ${state.settings.backendUrl?'':'warning'}"><i></i>${state.settings.backendUrl?'Hazır':'Sunucu gerekli'}</span></div><div class="disclaimer">“Açıklanmış” etiketi kaynakta geleceğe yönelik somut olay bulunduğunda kullanılır. Geçmiş ödeme düzeninden üretilen tarihler ve tutarlar daima “Tahmini” görünür.</div>`);
  }

  function showWidgetHelp() {
    const m=portfolioMetrics(),next=upcomingEvents(1)[0];
    showModal(`${modalHeader('Android ana ekran widget’ları')}<div class="card" style="padding:16px;background:linear-gradient(145deg,#12323d,#0a2029)"><div class="hero-label">Finansal(EB) · Portföy</div><div class="metric-value" style="font-size:24px">${money(m.total,'TRY')}</div><div class="asset-change ${m.daily>=0?'positive':'negative'}">${pct(m.dailyPct)} bugün</div><div class="summary-strip" style="margin-top:13px"><div class="summary-item"><div class="summary-label">Yıllık temettü</div><div class="summary-value">${money(m.annualDividend,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Sıradaki</div><div class="summary-value">${next?dateText(next.payDate||next.exDate,{day:'numeric',month:'short'}):'—'}</div></div><div class="summary-item"><div class="summary-label">Güncelleme</div><div class="summary-value">${state.market.lastSync?'Güncel':'Yerel'}</div></div></div></div><div class="disclaimer">APK kurulduktan sonra telefonun ana ekranına basılı tut → Widget’lar → Finansal(EB) → “Portföy Özeti” veya “Sıradaki Temettü”. Widget, son başarılı yenilemenin güvenli özetini gösterir.</div>`);
  }

  function exportData() {
    const payload=JSON.stringify({...state,exportedAt:new Date().toISOString(),appVersion:APP_VERSION},null,2);const filename=`FinansalEB-yedek-${isoDate()}.json`;
    try { if(window.Android?.downloadFile){window.Android.downloadFile(filename,payload,'application/json');showToast('Yedek dosyası hazırlandı');return;} } catch(_){}
    const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Yedek indirildi');
  }

  function exportCalendar() {
    const future = state.dividendEvents
      .filter(e => parseDate(e.payDate || e.exDate) >= addDays(new Date(), -1))
      .sort((a,b) => parseDate(a.payDate || a.exDate) - parseDate(b.payDate || b.exDate));
    if (!future.length) { showToast('Aktarılacak yaklaşan temettü olayı yok'); return; }
    const compactDate = value => String(value || '').slice(0,10).replaceAll('-','');
    const nextDate = value => compactDate(isoDate(addDays(parseDate(value),1)));
    const escapeIcs = value => String(value ?? '').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replace(/\r?\n/g,'\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const statusLabel = value => ({confirmed:'Açıklanmış',proposed:'Şirket teklifi',estimated:'Tahmini',historical:'Geçmiş'}[value] || 'Kayıt');
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FinansalEB//Temettu Takvimi//TR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Finansal(EB) Temettü Takvimi','X-WR-TIMEZONE:Europe/Istanbul'];
    future.forEach(e => {
      const a = assetById(e.assetId); if (!a) return;
      const prefix = e.status === 'estimated' ? '≈ ' : e.status === 'proposed' ? 'Teklif · ' : '';
      const description = `${statusLabel(e.status)} · Net yaklaşık ${money(eventNet(e),'TRY')} · ${e.source || 'Finansal(EB)'}`;
      const append = (kind,date,summary) => {
        if (!date) return;
        lines.push('BEGIN:VEVENT',`UID:${escapeIcs(`${e.id}-${kind}@finansaleb.local`)}`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${compactDate(date)}`,`DTEND;VALUE=DATE:${nextDate(date)}`,`SUMMARY:${escapeIcs(prefix + a.symbol + ' · ' + summary)}`,`DESCRIPTION:${escapeIcs(description)}`,'CATEGORIES:FinansalEB,Temettü','TRANSP:TRANSPARENT','END:VEVENT');
      };
      append('ex',e.exDate,'Hak kullanım günü');
      if (e.payDate && !sameDay(parseDate(e.payDate),parseDate(e.exDate))) append('pay',e.payDate,'Ödeme günü');
    });
    lines.push('END:VCALENDAR');
    const content = lines.join('\r\n') + '\r\n';
    const filename = `FinansalEB-temettu-takvimi-${isoDate()}.ics`;
    try { if(window.Android?.downloadFile){window.Android.downloadFile(filename,content,'text/calendar');showToast('Takvim dosyası hazırlandı');return;} } catch(_){}
    const blob=new Blob([content],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Temettü takvimi indirildi');
  }

  function importData(file) {
    const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);state=normalizeState(parsed);state.demo=false;saveState();closeModal();renderPage();showToast('Yedek geri yüklendi');}catch(e){showToast('Dosya geçerli bir Finansal(EB) yedeği değil',3600);}};reader.readAsText(file);
  }

  function confirmReset() {
    showModal(`${modalHeader('Tüm verileri sil')}<div class="empty-text" style="font-size:11px;margin:0">Portföy, işlemler, temettü takvimi ve ayarlar bu cihazdan kalıcı olarak silinecek. Önce yedek almak mantıklıdır.</div><div class="button-row"><button class="secondary-btn" data-modal-close>Vazgeç</button><button class="danger-btn" id="resetConfirm">Tümünü sil</button></div>`);
    $('#resetConfirm').addEventListener('click',()=>{state=blankState();localStorage.removeItem(STORAGE_KEY);localStorage.setItem(ONBOARDING_KEY,'1');saveState();closeModal();renderPage();showToast('Tüm veriler silindi');});
  }

  function assetTypeSupportsLookup(type) {
    return !['CUSTOM','CASH','BOND'].includes(String(type||'').toUpperCase());
  }

  function normalizeMarketSearchResult(item, fallbackType) {
    const sourceSymbol=String(item?.sourceSymbol||item?.symbol||'').toUpperCase();
    const type=String(item?.type||fallbackType||'BIST').toUpperCase();
    const displaySymbol=String(item?.symbol || (type==='BIST'?sourceSymbol.replace(/\.IS$/,''):sourceSymbol)).toUpperCase();
    return {
      symbol:displaySymbol,
      sourceSymbol:sourceSymbol || inferSourceSymbol(displaySymbol,type),
      name:String(item?.name||item?.longname||item?.shortname||displaySymbol),
      type,
      currency:String(item?.currency||TYPE_META[type]?.currency||'TRY'),
      exchange:String(item?.exchange||''),
      price:Number(item?.price||item?.regularMarketPrice||0),
      prevClose:Number(item?.prevClose||item?.regularMarketPreviousClose||0),
      changePct:Number(item?.changePct||item?.regularMarketChangePercent||0),
      source:String(item?.source||'Otomatik piyasa araması')
    };
  }

  async function directYahooSearch(query,type) {
    if(type==='TEFAS') {
      const code=String(query).replace(/[^A-Z0-9]/gi,'').toUpperCase();
      const quote=await tefasQuote(code);
      return [normalizeMarketSearchResult({...quote,symbol:code,sourceSymbol:code,type:'TEFAS'},'TEFAS')];
    }
    if(type==='GOLD') {
      const quote=await quoteForAsset({symbol:'GRAM ALTIN',sourceSymbol:'GRAM_ALTIN',type:'GOLD',currency:'TRY'});
      return [normalizeMarketSearchResult({...quote,symbol:'GRAM ALTIN',sourceSymbol:'GRAM_ALTIN',name:'Gram Altın',type:'GOLD'},'GOLD')];
    }
    if(type==='SILVER') {
      const quote=await quoteForAsset({symbol:'GRAM GÜMÜŞ',sourceSymbol:'GRAM_GUMUS',type:'SILVER',currency:'TRY'});
      return [normalizeMarketSearchResult({...quote,symbol:'GRAM GÜMÜŞ',sourceSymbol:'GRAM_GUMUS',name:'Gram Gümüş',type:'SILVER'},'SILVER')];
    }
    const url=`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
    const json=await fetchJson(url,{},15000);
    const results=(json?.quotes||[]).filter(item=>{
      const symbol=String(item.symbol||'').toUpperCase();
      const quoteType=String(item.quoteType||'').toUpperCase();
      const exchange=String(item.exchange||item.exchDisp||'').toUpperCase();
      const currency=String(item.currency||'').toUpperCase();
      if(type==='BIST')return symbol.endsWith('.IS')||exchange.includes('IST')||exchange.includes('BIST');
      if(type==='ETF')return quoteType==='ETF';
      if(type==='US')return quoteType==='EQUITY'&&!symbol.endsWith('.IS')&&(!currency||currency==='USD');
      if(type==='CRYPTO')return quoteType.includes('CRYPTO')||symbol.endsWith('-USD');
      if(type==='FX')return quoteType==='CURRENCY';
      return true;
    }).slice(0,10).map(item=>normalizeMarketSearchResult({
      symbol:type==='BIST'?String(item.symbol||'').replace(/\.IS$/i,''):item.symbol,
      sourceSymbol:item.symbol,
      name:item.longname||item.shortname||item.symbol,
      type,
      currency:item.currency,
      exchange:item.exchange||item.exchDisp,
      price:item.regularMarketPrice,
      prevClose:item.regularMarketPreviousClose,
      changePct:item.regularMarketChangePercent,
      source:'Piyasa sembol araması'
    },type));
    if(results.length)return results;
    const display=String(query).trim().toUpperCase();
    try {
      const quote=await quoteForAsset({symbol:display,sourceSymbol:inferSourceSymbol(display,type),type,currency:TYPE_META[type]?.currency||'TRY'});
      return [normalizeMarketSearchResult({...quote,symbol:display,sourceSymbol:inferSourceSymbol(display,type),type},type)];
    } catch (_) { return []; }
  }

  async function searchAssetCandidates(query,type) {
    const normalizedQuery=String(query||'').trim();
    const normalizedType=String(type||'BIST').toUpperCase();
    if(window.Android?.requestMarketData) {
      try {
        const response=await nativeMarketCall('search',{query:normalizedQuery,type:normalizedType},26000);
        return (response?.data?.results||[]).map(item=>normalizeMarketSearchResult(item,normalizedType));
      } catch(error) { console.warn('Native search fallback',error); }
    }
    if(state.settings.backendUrl) {
      try {
        const response=await backendCall({action:'search',query:normalizedQuery,type:normalizedType});
        if(response?.ok)return (response.data?.results||[]).map(item=>normalizeMarketSearchResult(item,normalizedType));
      } catch(error) { console.warn('Backend search fallback',error); }
    }
    return directYahooSearch(normalizedQuery,normalizedType);
  }

  async function lookupQuotePreview(candidate) {
    return quoteForAsset({
      symbol:candidate.symbol,
      sourceSymbol:candidate.sourceSymbol||inferSourceSymbol(candidate.symbol,candidate.type),
      type:candidate.type,
      currency:candidate.currency||TYPE_META[candidate.type]?.currency||'TRY'
    });
  }

  function inferSourceSymbol(symbol,type) {
    const s=String(symbol||'').trim().toUpperCase();
    if(type==='BIST') return s.endsWith('.IS')?s:`${s}.IS`;
    if(type==='GOLD') return 'GRAM_ALTIN';
    if(type==='SILVER') return 'GRAM_GUMUS';
    if(type==='FX') {
      if(s==='USDTRY'||s==='USD/TRY')return 'TRY=X';
      if(s==='EURTRY'||s==='EUR/TRY')return 'EURTRY=X';
      return s.includes('=X')?s:`${s.replace('/','')}=X`;
    }
    if(type==='CRYPTO') return s.includes('-')?s:`${s}-USD`;
    return s;
  }

  async function fetchJson(url, options = {}, timeout = 12000) {
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try {const res=await fetch(url,{...options,signal:controller.signal,cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);return await res.json();}
    finally{clearTimeout(timer);}
  }

  async function backendCall(params, timeout = 12000) {
    const base=state.settings.backendUrl;if(!base)throw new Error('Sunucu tanımlı değil');
    const url=new URL(base,window.location.href.startsWith('http')?window.location.href:undefined);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    const headers=state.settings.backendToken?{'X-Api-Token':state.settings.backendToken}:{};
    return fetchJson(url.toString(),{headers},timeout);
  }

  async function yahooQuote(symbol) {
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo&events=div%2Csplits&includeAdjustedClose=true`;
    const json=await fetchJson(url,{},15000);const result=json?.chart?.result?.[0];if(!result)throw new Error(json?.chart?.error?.description||'Piyasa verisi bulunamadı');
    const closes=(result.indicators?.quote?.[0]?.close||[]).map(Number).filter(Number.isFinite);const timestamps=result.timestamp||[];const meta=result.meta||{};const price=Number(meta.regularMarketPrice||closes.at(-1));const prev=Number(meta.chartPreviousClose||meta.previousClose||closes.at(-2)||price);const events=Object.values(result.events?.dividends||{}).map(e=>({date:isoDate(new Date(Number(e.date)*1000)),amount:Number(e.amount||0)}));
    return {symbol,name:meta.shortName||meta.longName||symbol,price,prevClose:prev,changePct:prev?(price-prev)/prev*100:0,currency:meta.currency||null,exchange:meta.exchangeName||'',history:closes,timestamps,dividends:events,source:'Piyasa verisi'};
  }

  async function tefasQuote(code) {
    if(state.settings.backendUrl){const data=await backendCall({action:'tefas',code});if(data?.ok&&data.data)return data.data;throw new Error(data?.error||'TEFAS verisi alınamadı');}
    const end=new Date(),start=addDays(end,-14),body=new URLSearchParams({fontip:'YAT',bastarih:`${String(start.getDate()).padStart(2,'0')}.${String(start.getMonth()+1).padStart(2,'0')}.${start.getFullYear()}`,bittarih:`${String(end.getDate()).padStart(2,'0')}.${String(end.getMonth()+1).padStart(2,'0')}.${end.getFullYear()}`,fonkod:code});
    const json=await fetchJson('https://www.tefas.gov.tr/api/DB/BindHistoryInfo',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'},body},15000);const rows=json?.data||[];if(!rows.length)throw new Error('TEFAS kaydı bulunamadı');const prices=rows.map(r=>Number(String(r.FIYAT).replace(/\./g,'').replace(',','.'))).filter(Number.isFinite);const price=prices.at(-1),prev=prices.at(-2)||price,last=rows.at(-1)||{};return{symbol:code,name:last.FONUNVAN||last.FONUNVANI||code,price,prevClose:prev,changePct:prev?(price-prev)/prev*100:0,currency:'TRY',history:prices,dividends:[],source:'TEFAS'};
  }

  async function quoteForAsset(asset) {
    const sourceSymbol=asset.sourceSymbol||inferSourceSymbol(asset.symbol,asset.type);
    if(window.Android?.requestMarketData){
      try {const response=await nativeMarketCall('quote',{symbol:sourceSymbol,type:asset.type},26000);if(response?.data)return response.data;}catch(error){console.warn('Native quote fallback',error);}
    }
    if(state.settings.backendUrl){
      try {const data=await backendCall({action:'quote',symbol:sourceSymbol,type:asset.type});if(data?.ok&&data.data)return data.data;}catch(error){console.warn('Backend quote fallback',error);}
    }
    if(asset.type==='TEFAS')return tefasQuote(asset.symbol);
    if(asset.type==='CUSTOM'||asset.type==='CASH'||asset.type==='BOND')throw new Error('Manuel fiyatlı varlık');
    const source=sourceSymbol;
    if(source==='GRAM_ALTIN'||asset.type==='GOLD'){
      const [gold,tryFx]=await Promise.all([yahooQuote('GC=F'),yahooQuote('TRY=X')]);const price=gold.price*tryFx.price/TROY_OUNCE,prev=gold.prevClose*tryFx.prevClose/TROY_OUNCE;return{price,prevClose:prev,changePct:prev?(price-prev)/prev*100:0,currency:'TRY',history:gold.history.map((v,i)=>v*(tryFx.history[i]||tryFx.price)/TROY_OUNCE),dividends:[],source:'Altın ons + USD/TRY'};
    }
    if(source==='GRAM_GUMUS'||asset.type==='SILVER'){
      const [silver,tryFx]=await Promise.all([yahooQuote('SI=F'),yahooQuote('TRY=X')]);const price=silver.price*tryFx.price/TROY_OUNCE,prev=silver.prevClose*tryFx.prevClose/TROY_OUNCE;return{price,prevClose:prev,changePct:prev?(price-prev)/prev*100:0,currency:'TRY',history:silver.history.map((v,i)=>v*(tryFx.history[i]||tryFx.price)/TROY_OUNCE),dividends:[],source:'Gümüş ons + USD/TRY'};
    }
    return yahooQuote(source);
  }

  async function dividendFeedForAsset(asset) {
    if (!['BIST','US','ETF'].includes(asset.type)) return [];
    const symbol = asset.sourceSymbol || inferSourceSymbol(asset.symbol, asset.type);
    if (window.Android?.requestMarketData) {
      try {
        const response=await nativeMarketCall('dividends',{symbol},28000);
        if(Array.isArray(response?.data?.events))return response.data.events;
      } catch(error) { console.warn('Native dividend fallback',error); }
    }
    if (state.settings.backendUrl) {
      const result = await backendCall({action:'dividends', symbol});
      if (result?.ok && Array.isArray(result.data?.events)) return result.data.events;
      return [];
    }
    const period1 = Math.floor((Date.now() - 8*365*DAY) / 1000);
    const period2 = Math.floor((Date.now() + 400*DAY) / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits`;
    const json = await fetchJson(url,{},15000);
    const result = json?.chart?.result?.[0];
    if (!result) return [];
    return Object.values(result.events?.dividends || {}).map(e => ({
      exDate: isoDate(new Date(Number(e.date)*1000)),
      payDate: null,
      amountPerShare: Number(e.amount||0),
      status: Number(e.date)*1000 > Date.now() ? 'confirmed' : 'historical',
      source: 'Piyasa veri akışı'
    }));
  }

  async function officialKapFeed(asset) {
    if (!state.settings.backendUrl || asset.type !== 'BIST') return [];
    const result = await backendCall({action:'kap_dividends', symbol:asset.symbol});
    return result?.ok && Array.isArray(result.data?.events) ? result.data.events : [];
  }

  function mergeExternalDividendEvents(asset, events) {
    if (!Array.isArray(events)) return;
    for (const item of events) {
      const exDate = item.exDate || item.date;
      const payDate = item.payDate || exDate;
      const amount = Number(item.amountPerShare ?? item.amount ?? 0);
      if (!exDate || amount < 0) continue;
      const existing = state.dividendEvents.find(e => e.assetId===asset.id && Math.abs(parseDate(e.exDate)-parseDate(exDate))<3*DAY && Math.abs(Number(e.amountPerShare||0)-amount)<.001);
      const normalized = {
        id: existing?.id || uid('div'), assetId:asset.id, exDate:isoDate(parseDate(exDate)), payDate:payDate?isoDate(parseDate(payDate)):null,
        amountPerShare:amount, currency:item.currency||asset.currency, status:item.status||'historical',
        received:item.status==='historical' || parseDate(payDate||exDate)<new Date(), source:item.source||'Otomatik veri', sourceUrl:item.sourceUrl||undefined
      };
      if (existing) Object.assign(existing, normalized); else state.dividendEvents.push(normalized);
    }
  }

  function mergeDividendHistory(asset, dividends) {
    if(!Array.isArray(dividends)||!dividends.length)return;
    const sorted=dividends.filter(d=>d.amount>0).sort((a,b)=>parseDate(a.date)-parseDate(b.date));
    sorted.forEach(d=>{const exists=state.dividendEvents.some(e=>e.assetId===asset.id&&sameDay(parseDate(e.exDate),parseDate(d.date))&&Math.abs(Number(e.amountPerShare)-Number(d.amount))<.0001);if(!exists)state.dividendEvents.push({id:uid('div'),assetId:asset.id,exDate:d.date,payDate:d.date,amountPerShare:d.amount,currency:asset.currency,status:'confirmed',received:parseDate(d.date)<new Date(),source:'Geçmiş piyasa olayı'});});
    const recent=sorted.filter(d=>parseDate(d.date)>addDays(new Date(),-730));if(recent.length<2)return;
    const intervals=[];for(let i=1;i<recent.length;i++)intervals.push((parseDate(recent[i].date)-parseDate(recent[i-1].date))/DAY);intervals.sort((a,b)=>a-b);const median=intervals[Math.floor(intervals.length/2)]||90;const normalized=median<50?30:median<140?91:median<270?182:365;const amounts=recent.slice(-4).map(d=>d.amount).sort((a,b)=>a-b);const amount=amounts[Math.floor(amounts.length/2)]||recent.at(-1).amount;let next=parseDate(recent.at(-1).date);while(next<addDays(new Date(),-1))next=addDays(next,normalized);const horizon=addDays(new Date(),370);while(next<=horizon){const date=isoDate(next);const exists=state.dividendEvents.some(e=>e.assetId===asset.id&&Math.abs(parseDate(e.exDate)-next)<10*DAY);if(!exists)state.dividendEvents.push({id:uid('div'),assetId:asset.id,exDate:date,payDate:isoDate(addDays(next,asset.type==='US'||asset.type==='ETF'?14:2)),amountPerShare:amount,currency:asset.currency,status:'estimated',received:false,source:'Geçmiş ödeme düzeni tahmini'});next=addDays(next,normalized);}
  }

  async function refreshAll({silent=false,onlyAssetId=null}={}) {
    if(refreshController){showToast('Yenileme zaten çalışıyor');return;}
    refreshController={cancelled:false};const btn=$('#syncBtn');btn?.classList.add('loading');if(!silent)showToast('Piyasa verileri yenileniyor…',1800);
    const assets=state.assets.filter(a=>!onlyAssetId||a.id===onlyAssetId);let success=0,failed=[];
    for(const asset of assets){
      if(refreshController.cancelled)break;
      try{const q=await quoteForAsset(asset);if(Number.isFinite(Number(q.price))&&Number(q.price)>0){asset.price=Number(q.price);asset.prevClose=Number(q.prevClose||q.price);asset.changePct=Number(q.changePct||0);asset.history=(q.history||[]).map(Number).filter(Number.isFinite).slice(-120);asset.lastUpdated=new Date().toISOString();asset.dataStatus='auto';asset.dataSource=q.source||'Otomatik';if(q.currency&&asset.type!=='GOLD'&&asset.type!=='SILVER')asset.currency=q.currency;mergeDividendHistory(asset,q.dividends);
        try {
          const feed = await dividendFeedForAsset(asset);
          mergeExternalDividendEvents(asset, feed);
          const kapFeed = await officialKapFeed(asset);
          mergeExternalDividendEvents(asset, kapFeed);
          // Geçmiş ödemelerden tahmin üret; resmî kayıtlar varsa aynı tarihe yakın tahmin eklenmez.
          mergeDividendHistory(asset, feed.map(e=>({date:e.exDate||e.date,amount:e.amountPerShare??e.amount,status:e.status})));
        } catch(dividendError) { console.warn('Dividend feed',asset.symbol,dividendError); }
        success++;}}
      catch(error){asset.dataStatus=asset.price?'cached':'error';asset.dataError=error.message;failed.push(`${asset.symbol}: ${error.message}`);}
      await sleep(120);
    }
    if(success){state.market.lastSync=new Date().toISOString();state.market.lastError=failed.length?`${failed.length} varlık son değerle gösteriliyor`:null;}
    else if(failed.length)state.market.lastError=failed[0];
    saveState();refreshController=null;btn?.classList.remove('loading');renderPage();updateSyncText();scheduleEventNotifications();
    if(!silent)showToast(success?`${success} varlık güncellendi${failed.length?`, ${failed.length} son değerle kaldı`:''}`:`Veri alınamadı; son kayıtlar korundu`,3300);
  }

  function shouldAutoRefresh() {
    if(!state.settings.autoRefresh||!state.assets.length)return false;
    const last=state.market.lastSync?new Date(state.market.lastSync).getTime():0;
    return Date.now()-last>Number(state.settings.refreshHours||6)*3_600_000;
  }

  function syncNativeWidget() {
    try {
      if(!window.Android?.saveWidgetState)return;
      const m=portfolioMetrics(),next=upcomingEvents(1)[0],payload={total:m.total,dailyPct:m.dailyPct,daily:m.daily,annualDividend:m.annualDividend,nextSymbol:next?assetById(next.assetId)?.symbol:'',nextAmount:next?eventNet(next):0,nextDate:next?(next.payDate||next.exDate):'',lastSync:state.market.lastSync,privacy:state.settings.privacy,backendUrl:state.settings.backendUrl,backendToken:state.settings.backendToken,refreshHours:Number(state.settings.refreshHours||6),fx:{...state.market.fx},assets:state.assets.map(a=>({id:a.id,symbol:a.symbol,sourceSymbol:a.sourceSymbol,type:a.type,currency:a.currency,quantity:a.quantity,price:a.price,baseValue:assetValue(a)}))};
      window.Android.saveWidgetState(JSON.stringify(payload));
    } catch(error){console.warn('Widget bridge error',error);}
  }

  function applyNativeBackgroundPrices() {
    try {
      if (!window.Android?.getBackgroundPrices) return;
      const raw = window.Android.getBackgroundPrices();
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.assets)) return;
      data.assets.forEach(item => {
        const asset = state.assets.find(a => a.id===item.id || a.symbol===item.symbol);
        if (!asset) return;
        if (Number(item.price)>0) asset.price=Number(item.price);
        if (Number.isFinite(Number(item.changePct))) asset.changePct=Number(item.changePct);
        if (Number(item.prevClose)>0) asset.prevClose=Number(item.prevClose);
        asset.lastUpdated=data.updatedAt||asset.lastUpdated;
        asset.dataStatus='background';
      });
      if (data.fx && typeof data.fx==='object') state.market.fx={...state.market.fx,...data.fx};
      if (data.updatedAt && (!state.market.lastSync || new Date(data.updatedAt)>new Date(state.market.lastSync))) state.market.lastSync=data.updatedAt;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(error) { console.warn('Background price import', error); }
  }

  function scheduleEventNotifications() {
    if(!state.settings.notifications)return;
    try {
      if(!window.Android?.scheduleNotification)return;
      upcomingEvents(5,false).forEach(e=>{const a=assetById(e.assetId),date=parseDate(e.payDate||e.exDate),notifyAt=new Date(date.getFullYear(),date.getMonth(),date.getDate()-1,10,0,0).getTime();if(notifyAt>Date.now())window.Android.scheduleNotification(`${a?.symbol||'Temettü'} ödemesi yaklaşıyor`,`${dateText(date,{day:'numeric',month:'long'})} · yaklaşık ${money(eventNet(e),'TRY')}`,notifyAt,`div_${e.id}`);});
    } catch(error){console.warn('Notification bridge',error);}
  }

  function showOnboarding() {
    if(localStorage.getItem(ONBOARDING_KEY)||state.assets.length)return;
    showModal(`<div class="modal-grabber"></div><div class="onboarding"><div class="onboarding-logo"><svg viewBox="0 0 48 48"><path d="M10 34V15.5c0-2.5 2-4.5 4.5-4.5H31l7 7v16c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4Z"/><path d="M18 30.5 23 25l4 3 6-8"/><path d="m30 20 3-1-1 3"/></svg></div><h2>Finansal<span style="color:var(--accent)">(EB)</span></h2><p>Snowball ve Stock Events’in güçlü iş akışlarından esinlenen; ancak arayüzü, verisi ve kayıtları sana ait olan Türkçe portföy uygulaması.</p><div class="feature-grid"><div class="feature-item"><strong>Tüm varlıklar</strong><span>BIST, ABD, ETF, TEFAS, altın, gümüş ve özel varlık</span></div><div class="feature-item"><strong>Temettü merkezi</strong><span>Açıklanmış ve tahmini ödeme ayrımı, net gelir</span></div><div class="feature-item"><strong>Özgürlük hedefi</strong><span>Aylık gider karşılama ve uzun vadeli projeksiyon</span></div><div class="feature-item"><strong>Özel ve yerel</strong><span>Portföy cihazında kalır; kendi sunucun seçilebilir</span></div></div><div class="button-row"><button class="secondary-btn" id="startEmpty">Kendi portföyüm</button><button class="primary-btn" id="startDemo">Örneği incele</button></div><div class="disclaimer">Uygulama yatırım tavsiyesi vermez. Ücretsiz veri kaynaklarının gecikmesi veya kesintisi olabilir; son başarılı değer korunur.</div></div>`,{dismissible:false});
    $('#startEmpty').addEventListener('click',()=>{localStorage.setItem(ONBOARDING_KEY,'1');state=blankState();saveState();closeModal();renderPage();setTimeout(showAssetForm,200);});
    $('#startDemo').addEventListener('click',()=>{localStorage.setItem(ONBOARDING_KEY,'1');state=demoState();saveState();closeModal();renderPage();showToast('Örnek portföy açıldı');});
  }

  function setupGlobalEvents() {
    $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));
    $('#fab').addEventListener('click',()=>state.assets.length?showTransactionForm():showAssetForm());
    $('#privacyBtn').addEventListener('click',()=>{state.settings.privacy=!state.settings.privacy;saveState();renderPage();showToast(state.settings.privacy?'Tutarlar gizlendi':'Tutarlar gösteriliyor');});
    $('#syncBtn').addEventListener('click',()=>refreshAll());
    $('#moreBtn').addEventListener('click',showSettings);
    $('#importInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importData(file);e.target.value='';});
    window.addEventListener('online',()=>{showToast('İnternet bağlantısı geri geldi');if(shouldAutoRefresh())refreshAll({silent:true});});
    window.addEventListener('offline',()=>showToast('Çevrimdışı: son veriler gösteriliyor'));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  }

  function initPwa() {
    if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get('demo') !== '1') applyNativeBackgroundPrices();
    if (params.get('demo') === '1' && !state.assets.length) {
      state = demoState();
      localStorage.setItem(ONBOARDING_KEY, '1');
      saveState();
    }
    renderIcons();setupGlobalEvents();renderPage();if(state.settings.autoRefresh&&state.settings.backendUrl)setTimeout(()=>refreshContent().catch(()=>{}),1200);showOnboarding();initPwa();scheduleEventNotifications();
    if(shouldAutoRefresh() && params.get('demo') !== '1')setTimeout(()=>refreshAll({silent:true}),800);
  }

  document.addEventListener('DOMContentLoaded',init);
})();
