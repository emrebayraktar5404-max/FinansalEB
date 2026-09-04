/* Finansal(EB) — kişisel portföy ve temettü takip uygulaması
 * Tamamen istemci tarafında çalışır; veriler cihazda saklanır.
 * Piyasa verileri ayarlanan kişisel PHP uç noktası veya desteklenen açık kaynaklar üzerinden yenilenir.
 */
(() => {
  'use strict';

  const APP_VERSION = '2.0.0-alpha.2';
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
  let marketIpoMode = 'mine';
  let marketNewsMode = 'important';
  const CORE = window.FinansalEBCore;
  if (!CORE) throw new Error('FinansalEB finans çekirdeği yüklenemedi.');

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
      version: 3,
      demo: false,
      settings: {
        baseCurrency: 'TRY',
        backendUrl: DEFAULT_BACKEND_URL,
        backendToken: '',
        refreshHours: 6,
        refreshMinutes: 15,
        notifications: true,
        autoRefresh: true,
        privacy: false,
        monthlyExpense: 50000,
        monthlyContribution: 15000,
        expectedReturn: 8,
        expectedDividendGrowth: 6,
        dividendGoalAnnual: 600000,
        reinvestDividends: true,
        theme: 'light'
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
        ipoItems: [],
        ipoNews: [],
        ipoSources: [],
        lastContentSync: null,
        contentError: null
      },
      assets: [],
      transactions: [],
      dividendEvents: [],
      cashflows: [],
      watchlist: [],
      cashLedger: [],
      ipoTracked: [],
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
    const rawCashLedger = Array.isArray(raw.cashLedger) ? raw.cashLedger : [];
    const cashLedger = CORE.normalizeCashLedger(rawCashLedger, (raw.market || {}).fx || base.market.fx);
    const dividendEvents = CORE.migrateDividendEvents(raw.dividendEvents, cashLedger, {demo:raw.demo === true});
    return {
      ...base,
      ...raw,
      settings: { ...base.settings, ...(raw.settings || {}), theme:(raw.settings || {}).theme === 'night' ? 'night' : 'light', backendUrl: String((raw.settings || {}).backendUrl || DEFAULT_BACKEND_URL) },
      market: { ...base.market, ...(raw.market || {}), fx: { ...base.market.fx, ...((raw.market || {}).fx || {}) } },
      assets: Array.isArray(raw.assets) ? raw.assets : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      version: 3,
      dividendEvents,
      cashflows: Array.isArray(raw.cashflows) ? raw.cashflows : [],
      watchlist: Array.isArray(raw.watchlist) ? raw.watchlist : [],
      cashLedger,
      ipoTracked: Array.isArray(raw.ipoTracked) ? raw.ipoTracked : [],
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
  let currentPage = 'calendar';
  let portfolioFilter = 'ALL';
  let portfolioQuery = '';
  let analyticsFilter = 'ALL';
  let analyticsPeriod = '1Y';
  let stockFilter = 'ALL';
  let toastTimer = null;
  let refreshController = null;
  let contentRefreshPromise = null;
  let autoRefreshTimer = null;
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
    applyTheme();
    applyPrivacy();
    syncNativeWidget();
    if (render) renderPage();
  }

  function assetById(id) { return state.assets.find(a => a.id === id); }
  function fxRate(currency) { return Number(state.market.fx[currency] || (currency === state.settings.baseCurrency ? 1 : 1)); }
  function assetValue(asset) { return Number(asset.quantity || 0) * Number(asset.price || 0) * fxRate(asset.currency); }
  function transactionPosition(assetId, cutoffValue = null, strictBefore = false) {
    const asset = assetById(assetId);
    if (!asset) return { quantity:0, avgCost:0, realizedProfit:0, realizedProfitTry:0, realizedCostTry:0 };
    const cutoff = cutoffValue ? parseDate(cutoffValue) : null;
    const txs = state.transactions
      .filter(t => t.assetId === assetId && (t.type === 'buy' || t.type === 'sell') && t.date)
      .slice()
      .sort((a,b) => parseDate(a.date) - parseDate(b.date));
    if (!txs.length) return { quantity:Number(asset.quantity||0), avgCost:Number(asset.avgCost||0), realizedProfit:0, realizedProfitTry:0, realizedCostTry:0 };
    let quantity = 0, avgCost = 0, realizedProfit = 0, realizedProfitTry = 0, realizedCostTry = 0;
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
        const realized = sold * (price - avgCost) - fee;
        const rate = Number(t.fxRateTry || fxRate(t.currency || asset.currency));
        realizedProfit += realized;
        realizedProfitTry += realized * rate;
        realizedCostTry += sold * avgCost * rate;
        quantity = Math.max(0, quantity - sold);
        if (quantity === 0) avgCost = 0;
      }
    }
    return { quantity, avgCost, realizedProfit, realizedProfitTry, realizedCostTry };
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
  function automaticDividendTax(asset, dateValue = null) {
    if (!asset) return 0;
    if (asset.autoDividendTax === false) return clamp(asset.dividendTax ?? 0, 0, 100);
    if (asset.type === 'BIST') {
      const d = dateValue ? parseDate(dateValue) : new Date();
      const changeDate = parseDate('2024-12-22');
      return d >= changeDate ? 15 : 10;
    }
    // ABD/ETF stopajı ikamet, W-8BEN/anlaşma ve menkul türüne göre değişebilir;
    // bu nedenle kayıtlı kullanıcı oranını otomatik varsayım yerine koruyoruz.
    return clamp(asset.dividendTax ?? 0, 0, 100);
  }
  function eventNet(event) {
    const asset = assetById(event.assetId);
    if (!asset) return 0;
    const eventDate = event.payDate || event.exDate || null;
    const tax = clamp(event.taxRate ?? automaticDividendTax(asset,eventDate), 0, 100);
    const computed = eventGross(event) * (1 - tax / 100) * fxRate(event.currency || asset.currency);
    return CORE.stableDividendNet(event, computed);
  }
  function portfolioMetrics(assetList = state.assets) {
    const scopedAssets = Array.isArray(assetList) ? assetList : state.assets;
    const assetIds = new Set(scopedAssets.map(a => a.id));
    const includesAllAssets = scopedAssets.length === state.assets.length && state.assets.every(a => assetIds.has(a.id));
    const securitiesTotal = scopedAssets.reduce((sum,a) => sum + assetValue(a), 0);
    const cash = includesAllAssets ? cashTotalValue() : 0;
    const total = securitiesTotal + cash;
    const cost = scopedAssets.reduce((sum,a) => sum + assetCost(a), 0);
    const unrealizedProfit = scopedAssets.reduce((sum,a) => sum + assetProfit(a), 0);
    const realizedProfit = scopedAssets.reduce((sum,a) => sum + Number(transactionPosition(a.id).realizedProfitTry||0), 0);
    const realizedCost = scopedAssets.reduce((sum,a) => sum + Number(transactionPosition(a.id).realizedCostTry||0), 0);
    const dividendProfit = state.dividendEvents
      .filter(e => assetIds.has(e.assetId) && e.received === true)
      .reduce((sum,e) => sum + eventNet(e), 0);
    const profit = unrealizedProfit + realizedProfit + dividendProfit;
    const performanceBasis = cost + realizedCost;
    const daily = scopedAssets.reduce((sum,a) => {
      const current = assetValue(a);
      const cp = Number(a.changePct || 0) / 100;
      return sum + (cp > -1 ? current - current / (1 + cp) : 0);
    }, 0);
    const dailyPct = total - daily ? daily / (total - daily) * 100 : 0;
    const now = new Date();
    const end = addDays(now, 365);
    const annualDividend = state.dividendEvents
      .filter(e => assetIds.has(e.assetId) && parseDate(e.payDate || e.exDate) >= addDays(now,-1) && parseDate(e.payDate || e.exDate) <= end)
      .reduce((sum,e) => sum + eventNet(e), 0);
    const allAnnualFallback = scopedAssets.reduce((sum,a) => sum + Number(a.quantity||0) * Number(a.annualDividendPerShare||0) * (1-clamp(automaticDividendTax(a),0,100)/100) * fxRate(a.currency), 0);
    const annual = annualDividend || allAnnualFallback;
    const yieldOnCost = cost ? annual / cost * 100 : 0;
    const dividendYield = total ? annual / total * 100 : 0;
    return { total, securitiesTotal, cash, cost, realizedCost, performanceBasis, profit, unrealizedProfit, realizedProfit, dividendProfit, profitPct: performanceBasis ? profit/performanceBasis*100 : 0, daily, dailyPct, annualDividend: annual, monthlyDividend: annual/12, yieldOnCost, dividendYield };
  }

  function dividendMonths(year = new Date().getFullYear()) {
    const values = Array.from({length:12}, (_,month) => ({month, confirmed:0, estimated:0, paid:0}));
    state.dividendEvents.forEach(e => {
      const d = parseDate(e.payDate || e.exDate);
      if (d.getFullYear() !== year) return;
      const amount = eventNet(e);
      const bucket = CORE.dividendBucket(e);
      values[d.getMonth()][bucket] += amount;
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

  function applyTheme() {
    const night = state.settings.theme === 'night';
    document.documentElement.dataset.theme = night ? 'night' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#07131b' : '#ffffff');
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
        <div class="hero-metric"><div class="label">Açık pozisyon maliyeti</div><div class="value">${money(metrics.cost,'TRY')}</div></div>
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
    if (event.received) return { className:'historical', label:'Alındı' };
    if (event.status === 'historical') return { className:'confirmed', label:'Geçmiş · onaylanmadı' };
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
      ${(state.assets.length || Math.abs(m.cash) > 0.005) ? heroCard(m) : emptyPortfolioHero()}
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

  function cashBalances() {
    return CORE.cashBalances(state.cashLedger, state.market.fx);
  }

  function cashBalance(currency = 'TRY') {
    return Number(cashBalances()[String(currency || 'TRY').toUpperCase()] || 0);
  }

  function cashTotalValue() {
    return CORE.cashTotalTry(state.cashLedger, state.market.fx);
  }

  function addCashRow(row) {
    const [normalized] = CORE.normalizeCashLedger([{id:uid('cash'), ...row}], state.market.fx);
    state.cashLedger.push(normalized);
    return normalized;
  }

  function dividendCashBalance() {
    return (state.cashLedger||[])
      .filter(row => row.type === 'dividend_income' || row.type === 'dividend_reinvestment')
      .reduce((sum,row)=>sum + Number(row.amountTry||0),0);
  }

  function watchlistRow(w) {
    const move=Number(w.changePct||0);
    return `<div class="asset-row watch-row" data-watch-id="${esc(w.id)}"><div class="asset-logo">★</div><div class="asset-main"><div class="asset-name">${esc(w.symbol)}</div><div class="asset-sub">${esc(w.name||TYPE_META[w.type]?.label||'İzleme')}</div></div><div class="asset-right"><div class="asset-value">${money(w.price||0,w.currency||'TRY',false,Number(w.price||0)<1?4:2)}</div><div class="asset-change ${move>=0?'positive':'negative'}">${pct(move)}</div></div></div>`;
  }

  function cashActivityLabel(row) {
    return ({
      trade_sale:'Satış geliri',
      trade_purchase:'Alış ödemesi',
      cash_deposit:'Para yatırma',
      cash_withdrawal:'Para çekme',
      cash_conversion_in:'Döviz dönüşümü girişi',
      cash_conversion_out:'Döviz dönüşümü çıkışı',
      dividend_income:'Temettü geliri',
      dividend_reinvestment:'Temettü yeniden yatırımı'
    })[row.type] || 'Nakit hareketi';
  }

  function renderCashAccounts() {
    const balances = cashBalances();
    const currencies = [...new Set(['TRY', ...Object.keys(balances)])]
      .filter(currency => currency === 'TRY' || Math.abs(Number(balances[currency]||0)) > 0.000001);
    const recent = (state.cashLedger||[])
      .filter(row => row.affectsCash !== false)
      .slice()
      .sort((a,b) => parseDate(b.date) - parseDate(a.date))
      .slice(0,5);
    const legacyCount = state.demo ? 0 : state.transactions.filter(t => ['buy','sell'].includes(t.type) && t.cashTracked !== true).length;
    return `<section class="section"><div class="section-head"><div><span class="section-title">Nakit hesapları</span><div class="section-note">Satışlar net tutarla eklenir, nakitten yapılan alışlar otomatik düşer.</div></div><button class="section-link" data-action="cash-transaction">+ Nakit işlemi</button></div>
      <div class="grid-two">${currencies.map(currency=>`<article class="card metric-card"><div class="icon-circle">${ICONS.wallet}</div><div class="metric-label">${currency} hesabı</div><div class="metric-value ${Number(balances[currency]||0)<0?'negative':''}">${money(balances[currency]||0,currency)}</div><div class="metric-note">TL karşılığı ${money(Number(balances[currency]||0)*fxRate(currency),'TRY')}</div></article>`).join('')}</div>
      ${legacyCount?`<div class="disclaimer">Eski sürümde kaydedilmiş ${legacyCount} alış/satış işlemi, yanlış bakiye üretmemesi için nakit hesabına geriye dönük uygulanmadı. Yeni işlemler otomatik izlenir.</div>`:''}
      ${recent.length?`<div class="card" style="margin-top:12px;padding:4px 14px">${recent.map(row=>`<div class="source-row"><div><div class="source-name">${esc(row.note||cashActivityLabel(row))}</div><div class="source-note">${dateText(row.date)} · ${cashActivityLabel(row)}</div></div><span class="${Number(row.amount||0)>=0?'positive':'negative'}">${Number(row.amount||0)>=0?'+':''}${money(row.amount||0,row.currency||'TRY')}</span></div>`).join('')}</div>`:''}</section>`;
  }

  function periodDays(key) { return ({'1M':22,'3M':66,'6M':120,'1Y':252,'ALL':9999})[key]||252; }
  function analyticsAssets() { return analyticsFilter==='ALL' ? [...state.assets] : state.assets.filter(a=>a.type===analyticsFilter); }
  function periodAssetReturn(asset, key) {
    const hist=(asset.history||[]).map(Number).filter(Number.isFinite);
    if(hist.length<2) return 0;
    const back=Math.min(hist.length-1,periodDays(key));
    const start=hist[Math.max(0,hist.length-1-back)], end=hist.at(-1);
    return start ? (end-start)/start*100 : 0;
  }
  function realizedProfitInPeriod(assetIds,key) {
    const from=addDays(new Date(),-periodDays(key));
    let total=0;
    assetIds.forEach(id=>{
      const a=assetById(id); if(!a)return;
      const txs=state.transactions.filter(t=>t.assetId===id&&t.type==='sell'&&parseDate(t.date)>=from);
      txs.forEach(t=>{
        const before=transactionPosition(id,t.date,true);
        const rate=Number(t.fxRateTry||fxRate(t.currency||a.currency));
        total += (Math.min(Number(t.quantity||0),Number(before.quantity||0))*(Number(t.price||0)-Number(before.avgCost||0))-Number(t.fee||0))*rate;
      });
    });
    return total;
  }
  function dividendsInPeriod(assetIds,key) {
    const ids=new Set(assetIds),from=addDays(new Date(),-periodDays(key));
    return state.dividendEvents.filter(e=>ids.has(e.assetId)&&e.received&&parseDate(e.payDate||e.exDate)>=from).reduce((sum,e)=>sum+eventNet(e),0);
  }
  function analyticsTrend(assetList,key) {
    if(!assetList.length)return [];
    const points=12;
    const out=[];
    for(let i=0;i<points;i++){
      let v=0;
      assetList.forEach(a=>{
        const hist=(a.history||[]).map(Number).filter(Number.isFinite); if(!hist.length)return;
        const span=Math.min(hist.length-1,periodDays(key));
        const idx=Math.max(0,hist.length-1-Math.round(span*(points-1-i)/(points-1)));
        v += Number(a.quantity||0)*Number(hist[idx]||a.price||0)*fxRate(a.currency);
      });
      out.push(v);
    }
    return out;
  }
  function miniTrendSvg(values){
    if(values.length<2||!values.some(v=>v>0))return '<div class="empty-text" style="margin:0">Grafik için yeterli geçmiş fiyat yok.</div>';
    const w=320,h=110,pad=8,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
    const pts=values.map((v,i)=>[pad+i*(w-2*pad)/(values.length-1),h-pad-(v-min)/range*(h-2*pad)]);
    const d=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return `<svg class="analytics-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
  }

  function renderPortfolio() {
    let scopedAssets = [...state.assets];
    if (portfolioFilter !== 'ALL') scopedAssets = scopedAssets.filter(a => a.type === portfolioFilter);
    const m = portfolioMetrics(scopedAssets);
    let assets = [...scopedAssets];
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
      <section class="summary-strip summary-strip-portfolio"><div class="summary-item"><div class="summary-label">Toplam değer</div><div class="summary-value">${money(m.total,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Nakit</div><div class="summary-value">${money(m.cash,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Toplam K/Z</div><div class="summary-value ${m.profit>=0?'positive':'negative'}">${money(m.profit,'TRY')}</div><div class="summary-sub ${m.profitPct>=0?'positive':'negative'}">${pct(m.profitPct)}</div></div><div class="summary-item"><div class="summary-label">Bugün</div><div class="summary-value ${m.daily>=0?'positive':'negative'}">${money(m.daily,'TRY')}</div><div class="summary-sub ${m.dailyPct>=0?'positive':'negative'}">${pct(m.dailyPct)}</div></div></section>
      ${renderCashAccounts()}
      ${renderIpoSection()}
      <section class="section"><div class="section-head"><span class="section-title">${assets.length} varlık</span><button class="section-link" data-action="add-transaction">İşlem ekle</button></div><div class="asset-list">${assets.length ? assets.map(assetRow).join('') : emptyState('search','Sonuç bulunamadı','Filtreyi veya arama metnini değiştir.')}</div></section>
      <section class="section"><div class="section-head"><div><span class="section-title">İzleme listesi</span><div class="section-note">Portföy değerine katılmaz; almak istediğin varlıkları burada takip et.</div></div><button class="section-link" data-action="add-watch">+ Takip et</button></div><div class="asset-list">${state.watchlist.length ? state.watchlist.map(watchlistRow).join('') : emptyState('eye','İzleme listesi boş','Portföyünde olmayan hisse, ETF, fon veya diğer varlıkları ekleyebilirsin.')}</div></section>`;
  }

  function renderDividends() {
    const m = portfolioMetrics();
    const now = new Date();
    const paidYear = state.dividendEvents.filter(e => {
      const d = parseDate(e.payDate || e.exDate);
      return d.getFullYear() === now.getFullYear() && e.received === true;
    }).reduce((s,e)=>s+eventNet(e),0);
    const pendingYear = state.dividendEvents.filter(e => {
      const d = parseDate(e.payDate || e.exDate);
      return d.getFullYear() === now.getFullYear() && d >= now;
    }).reduce((s,e)=>s+eventNet(e),0);
    const contributors = state.assets.map(a => {
      const amount = state.dividendEvents.filter(e=>e.assetId===a.id && parseDate(e.payDate||e.exDate)>=addDays(now,-1) && parseDate(e.payDate||e.exDate)<=addDays(now,365)).reduce((s,e)=>s+eventNet(e),0) || Number(a.quantity||0)*Number(a.annualDividendPerShare||0)*(1-clamp(automaticDividendTax(a),0,100)/100)*fxRate(a.currency);
      return {asset:a, amount};
    }).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
    const maxContribution = Math.max(...contributors.map(x=>x.amount),1);
    const upcoming = upcomingEvents(10);
    const goal = Number(state.settings.dividendGoalAnnual || 0);
    const progress = goal ? Math.min(100,m.annualDividend/goal*100) : 0;
    const cashBalance=dividendCashBalance();
    const confirmationCandidates=state.dividendEvents.filter(e=>!e.received&&e.status!=='estimated'&&parseDate(e.payDate||e.exDate)<=addDays(new Date(),1)&&parseDate(e.payDate||e.exDate)>=addDays(new Date(),-14));
    return `${demoBanner()}
      ${pageHeader('Pasif gelir','Temettü merkezi','Brüt/net, açıklanmış/tahmini ayrımı')}
      <section class="dividend-hero"><div class="dividend-hero-grid"><div><div class="dividend-main-label">Önümüzdeki 12 ay net gelir</div><div class="dividend-main-value">${money(m.annualDividend,'TRY')}</div><div class="event-meta" style="color:#a7c8c7">Aylık ortalama ${money(m.monthlyDividend,'TRY')}</div></div><div class="dividend-side"><div class="mini-stat"><div class="label">Temettü verimi</div><div class="value">${numberFmt(m.dividendYield,2)}%</div></div><div class="mini-stat"><div class="label">Maliyete göre</div><div class="value">${numberFmt(m.yieldOnCost,2)}%</div></div></div></div><div class="progress-wrap"><div class="progress-head"><span>Yıllık gelir hedefi</span><span>${numberFmt(progress,1)}%</span></div><div class="progress"><i style="width:${progress}%"></i></div></div></section>
      <section class="section"><div class="grid-two"><article class="card metric-card"><div class="metric-label">Temettü TL bakiyesi</div><div class="metric-value positive">${money(cashBalance,'TRY')}</div><div class="metric-note">Onaylanan temettüler − yeniden yatırımlar</div></article><article class="card metric-card"><div class="metric-label">Onay bekleyen</div><div class="metric-value">${confirmationCandidates.length}</div><div class="metric-note">Ödeme geldi mi kontrol et</div></article></div></section>
      ${confirmationCandidates.length?`<section class="section"><div class="section-head"><span class="section-title">Temettü kazancı olabilir</span></div><div class="card confirmation-card">${confirmationCandidates.map(e=>{const a=assetById(e.assetId);return `<div class="confirm-row"><div><b>${esc(a?.symbol||'Hisse')}</b><div class="event-meta">${dateText(e.payDate||e.exDate)} · ${numberFmt(eligibleQuantityAtExDate(e.assetId,e.exDate||e.payDate),2)} adet · yaklaşık ${money(eventNet(e),'TRY')}</div></div><button class="small-primary" data-action="confirm-dividend" data-event-id="${e.id}">Kontrol et</button></div>`}).join('')}</div></section>`:''}
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

  function allocationBy(keyFn, assetList = state.assets) {
    const map = new Map();
    assetList.forEach(a => {
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
    const scoped=analyticsAssets();
    const m=portfolioMetrics(scoped);
    const ids=scoped.map(a=>a.id);
    const byType=allocationBy(a => TYPE_META[a.type]?.label || a.type, scoped);
    const byCurrency=allocationBy(a => a.currency || 'TRY', scoped);
    const trend=analyticsTrend(scoped,analyticsPeriod);
    const priceWeighted=scoped.reduce((sum,a)=>sum+assetValue(a)*periodAssetReturn(a,analyticsPeriod),0);
    const periodPct=m.total?priceWeighted/m.total:0;
    const periodMarket=m.total*periodPct/100;
    const realized=realizedProfitInPeriod(ids,analyticsPeriod);
    const divs=dividendsInPeriod(ids,analyticsPeriod);
    const periodTotal=periodMarket+realized+divs;
    const periodFilters=[['ALL','Tümü'],['BIST','Hisse'],['US','ABD'],['ETF','ETF'],['TEFAS','Fon'],['GOLD','Altın'],['SILVER','Gümüş'],['CUSTOM','Diğer']];
    const periods=[['1M','1 Ay'],['3M','3 Ay'],['6M','6 Ay'],['1Y','1 Yıl'],['ALL','Tümü']];
    const top=scoped.map(a=>({a,r:periodAssetReturn(a,analyticsPeriod)})).sort((x,y)=>y.r-x.r);
    return `${demoBanner()}
      ${pageHeader('Dönemsel sonuçlar','Analiz ve raporlama','Genel portföy ve yatırım türü bazında kâr/zarar')}
      <div class="pill-row analytics-pills">${periodFilters.map(([k,l])=>`<button class="filter-pill ${analyticsFilter===k?'active':''}" data-analytics-filter="${k}">${l}</button>`).join('')}</div>
      <div class="period-switch analytics-periods">${periods.map(([k,l])=>`<button class="${analyticsPeriod===k?'active':''}" data-analytics-period="${k}">${l}</button>`).join('')}</div>
      <section class="summary-strip summary-strip-portfolio"><div class="summary-item"><div class="summary-label">Güncel değer</div><div class="summary-value">${money(m.total,'TRY')}</div></div><div class="summary-item"><div class="summary-label">Toplam K/Z</div><div class="summary-value ${m.profit>=0?'positive':'negative'}">${money(m.profit,'TRY')}</div><div class="summary-sub">${pct(m.profitPct)}</div></div><div class="summary-item"><div class="summary-label">Dönem K/Z</div><div class="summary-value ${periodTotal>=0?'positive':'negative'}">${money(periodTotal,'TRY')}</div><div class="summary-sub ${periodPct>=0?'positive':'negative'}">${pct(periodPct)}</div></div><div class="summary-item"><div class="summary-label">Dönem temettü</div><div class="summary-value positive">${money(divs,'TRY')}</div></div></section>
      <section class="section"><div class="card chart-card"><div class="section-head" style="margin:0"><div><span class="section-title">Portföy değer eğrisi</span><div class="section-note">${analyticsPeriod} · mevcut adetler ve kullanılabilir fiyat geçmişiyle hesaplanan yaklaşık grafik</div></div></div>${miniTrendSvg(trend)}<div class="chart-foot"><span>${trend.length?money(trend[0],'TRY',true,0):'—'}</span><span>${trend.length?money(trend.at(-1),'TRY',true,0):'—'}</span></div></div></section>
      <section class="section"><div class="grid-two"><article class="card metric-card"><div class="metric-label">Gerçekleşen satış K/Z</div><div class="metric-value ${realized>=0?'positive':'negative'}">${money(realized,'TRY')}</div><div class="metric-note">Seçili dönem</div></article><article class="card metric-card"><div class="metric-label">Bugünkü değişim</div><div class="metric-value ${m.daily>=0?'positive':'negative'}">${money(m.daily,'TRY')}</div><div class="metric-note">${pct(m.dailyPct)}</div></article></div></section>
      <section class="section"><div class="card chart-card"><div class="section-head" style="margin:0"><span class="section-title">Varlık sınıfı dağılımı</span><span class="section-link">${scoped.length} varlık</span></div>${donutHtml(byType,m.total,'Portföy')}</div></section>
      <section class="section"><div class="card chart-card"><div class="section-head" style="margin:0"><span class="section-title">Para birimi dağılımı</span></div>${donutHtml(byCurrency,m.total,'Kur dağılımı')}</div></section>
      <section class="section"><div class="section-head"><span class="section-title">Dönem performansı</span></div><div class="card" style="padding:15px">${top.length?top.map(x=>`<div class="rebalance-row"><div class="rebalance-head"><span>${esc(x.a.symbol)}</span><span class="${x.r>=0?'positive':'negative'}">${pct(x.r)}</span></div><div class="dual-progress"><i class="actual" style="width:${Math.min(100,Math.abs(x.r)*2)}%"></i></div></div>`).join(''):'<div class="empty-text" style="margin:0">Bu filtrede yatırım bulunmuyor.</div>'}</div></section>
      <div class="disclaimer">Dönem grafikleri ücretsiz kaynaklardan cihazda tutulan fiyat geçmişine göre yaklaşık hesaplanır. Kesin vergi/muhasebe raporu değildir; alış-satış ve temettü kayıtların kesin sonuçların temelidir.</div>`;
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


  function ipoTransactions() {
    return state.transactions.filter(t=>t.type==='buy' && t.purchaseKind==='ipo');
  }

  function ipoHoldingGroups() {
    const byAsset=new Map();
    ipoTransactions().forEach(t=>{
      if(!byAsset.has(t.assetId))byAsset.set(t.assetId,[]);
      byAsset.get(t.assetId).push(t);
    });
    return [...byAsset.entries()].map(([assetId,txs])=>{
      const a=assetById(assetId);
      if(!a)return null;
      txs.sort((x,y)=>parseDate(x.date)-parseDate(y.date));
      const firstDate=txs[0]?.date||'';
      const ipoQty=txs.reduce((s,t)=>s+Number(t.quantity||0),0);
      const weighted=txs.reduce((s,t)=>s+Number(t.quantity||0)*Number(t.ipoPrice??t.price??0),0);
      const ipoPrice=ipoQty?weighted/ipoQty:0;
      const sellsAfter=state.transactions.filter(t=>t.assetId===assetId&&t.type==='sell'&&(!firstDate||parseDate(t.date)>=parseDate(firstDate))).reduce((s,t)=>s+Number(t.quantity||0),0);
      const remaining=Math.max(0,Math.min(Number(a.quantity||0),ipoQty-sellsAfter));
      const current=Number(a.price||0);
      const returnPct=ipoPrice?((current-ipoPrice)/ipoPrice*100):0;
      return {asset:a,txs,firstDate,ipoQty,ipoPrice,remaining,current,returnPct};
    }).filter(Boolean).sort((a,b)=>parseDate(b.firstDate)-parseDate(a.firstDate));
  }

  const externalCard = (href, cls, body) => `<button type="button" class="content-item external-card ${cls}" data-external-url="${esc(href||'')}">${body}<span class="content-open">Aç →</span></button>`;

  function ipoStatusLabel(item){
    const s=String(item.status||'').toLowerCase();
    if(s.includes('ertelen'))return 'Ertelendi';
    if(s.includes('talep'))return 'Talep toplanıyor';
    if(s.includes('işlem'))return 'İşlem başlıyor';
    if(s.includes('tamam')||s.includes('sonuç'))return 'Talep tamamlandı';
    return 'Halka arz gündemi';
  }

  function ipoProgressHtml(group){
    const a=group.asset;
    let hist=(a.history||[]).map(Number).filter(Number.isFinite);
    let dates=Array.isArray(a.historyDates)?a.historyDates.slice(-hist.length):[];
    if(group.firstDate && dates.length===hist.length){ const zipped=hist.map((price,i)=>({price,date:dates[i]})).filter(x=>!x.date || String(x.date).slice(0,10)>=String(group.firstDate).slice(0,10)); hist=zipped.map(x=>x.price); dates=zipped.map(x=>x.date); }
    if(!hist.length)return '<div class="empty-text" style="margin:0">Halka arz sonrası günlük fiyat geçmişi ilk piyasa yenilemesinden sonra oluşacak.</div>';
    const rows=hist.slice(-10).map((price,i)=>{
      const srcIdx=hist.length-Math.min(10,hist.length)+i;
      const date=dates[srcIdx]||`Gün ${srcIdx+1}`;
      const move=group.ipoPrice?((price-group.ipoPrice)/group.ipoPrice*100):0;
      return `<div class="ipo-day-row"><span>${esc(date)}</span><b>${money(price,a.currency,false,price<1?4:2)}</b><em class="${move>=0?'positive':'negative'}">${pct(move)}</em></div>`;
    }).join('');
    return `${miniTrendSvg(hist.slice(-30))}<div class="ipo-day-list">${rows}</div>`;
  }

  function renderMyIpos(){
    const groups=ipoHoldingGroups();
    if(!groups.length)return `<div class="ipo-empty"><b>Henüz halka arzdan aldığın hisse işaretlenmemiş.</b><span>Portföy işlemi eklerken “Alış türü → Halka arzdan dağıtılan lot” seç. Böylece bu alan otomatik oluşur.</span><button type="button" class="primary-btn" data-action="add-ipo-buy">Halka arz alımı ekle</button></div>`;
    return groups.map(g=>{
      const a=g.asset;
      const value=g.remaining*g.current*fxRate(a.currency);
      const cost=g.remaining*g.ipoPrice*fxRate(a.currency);
      const profit=value-cost;
      return `<div class="ipo-holding-card" data-ipo-asset="${esc(a.id)}">
        <div class="ipo-holding-head"><div><div class="content-kicker">HALKA ARZDAN ALDIKLARIM</div><div class="content-title">${esc(a.symbol)} · ${esc(a.name)}</div></div><span class="ipo-badge ${g.returnPct>=0?'positive':'negative'}">${pct(g.returnPct)}</span></div>
        <div class="ipo-stat-grid"><div><span>Arz fiyatım</span><b>${money(g.ipoPrice,a.currency,false,g.ipoPrice<1?4:2)}</b></div><div><span>İlk dağıtılan</span><b>${numberFmt(g.ipoQty,2)} lot</b></div><div><span>Hâlâ elde</span><b>${numberFmt(g.remaining,2)} lot</b></div><div><span>İlk alım</span><b>${g.firstDate?dateText(g.firstDate):'—'}</b></div><div><span>Kalan değer</span><b>${money(value,'TRY')}</b></div><div><span>Arzdan K/Z</span><b class="${profit>=0?'positive':'negative'}">${money(profit,'TRY')}</b></div></div>
        ${ipoProgressHtml(g)}
        <div class="ipo-card-actions"><button type="button" class="secondary-btn" data-action="ipo-detail" data-asset-id="${esc(a.id)}">Detay</button><button type="button" class="primary-btn" data-action="add-transaction-asset" data-asset-id="${esc(a.id)}">Al / sat işlemi</button></div>
      </div>`;
    }).join('');
  }

  function renderIpoCalendar(){
    const items=state.market.ipoItems||[];
    const tracked=state.ipoTracked||[];
    if(!items.length)return `<div class="ipo-empty"><b>Otomatik halka arz takvimi şu anda boş.</b><span>Yenile ile sunucudan tekrar dene. Resmî SPK/KAP bağlantıları Raporlar sekmesinde her zaman kullanılabilir.</span><button type="button" class="secondary-btn" data-action="add-ipo-track">Manuel halka arz takibi ekle</button></div>`;
    return items.slice(0,16).map(item=>{
      const isTracked=tracked.some(x=>(x.symbol&&item.symbol&&x.symbol===item.symbol)||(x.name===item.name));
      return `<div class="ipo-calendar-card">
        <div class="ipo-holding-head"><div><div class="content-kicker">${esc(ipoStatusLabel(item))}</div><div class="content-title">${item.symbol?`<b>${esc(item.symbol)}</b> · `:''}${esc(item.name||'Halka arz')}</div></div>${item.price?`<span class="ipo-badge">${money(item.price,'TRY')}</span>`:''}</div>
        <div class="ipo-info-line">${item.demandDates?`<span>📅 ${esc(item.demandDates)}</span>`:''}${item.firstTradeDate?`<span>🔔 İlk işlem: ${esc(item.firstTradeDate)}</span>`:''}${item.market?`<span>🏛 ${esc(item.market)}</span>`:''}</div>
        ${item.summary?`<div class="content-summary">${esc(item.summary)}</div>`:''}
        <div class="ipo-card-actions">${item.url?`<button type="button" class="secondary-btn external-card" data-external-url="${esc(item.url)}">Kaynak ↗</button>`:''}<button type="button" class="primary-btn" data-action="track-ipo-item" data-ipo-symbol="${esc(item.symbol||'')}" data-ipo-name="${esc(item.name||'')}" data-ipo-demand="${esc(item.demandDates||'')}" data-ipo-trade="${esc(item.firstTradeDate||'')}">${isTracked?'Takipte ✓':'Takip et 🔔'}</button></div>
      </div>`;
    }).join('');
  }

  function renderIpoReports(){
    const news=state.market.ipoNews||[];
    const sources=state.market.ipoSources||[];
    const cards=news.slice(0,16).map(n=>externalCard(n.url,'ipo-report',`<div class="content-kicker">${esc(n.publisher||n.source||'Halka arz raporu')} · ${n.publishedAt?timeAgo(n.publishedAt):''}</div><div class="content-title">${esc(n.titleTr||n.title)}</div><div class="content-summary">${esc(n.summary||'İzahname, fiyat tespit raporu, sonuç veya işlem başlangıcı duyurusu.')}</div>`)).join('');
    const sourceCards=sources.map(s=>`<button type="button" class="source-mini external-card" data-external-url="${esc(s.url)}"><span><b>${esc(s.name)}</b><small>${esc(s.role||'Resmî kaynak')}</small></span><em>↗</em></button>`).join('');
    return `${cards?`<div class="content-list">${cards}</div>`:'<div class="empty-text">Yeni rapor bulunamadı.</div>'}<div class="source-grid ipo-source-grid">${sourceCards}</div><div class="disclaimer">Halka arz bilgileri otomatik keşfedilir; talep tarihini, fiyatı ve işlem başlangıcını yatırım kararı vermeden önce KAP/SPK/Borsa İstanbul duyurusundan doğrula.</div>`;
  }

  function renderIpoSection(){
    const count=ipoHoldingGroups().length;
    return `<section class="card market-card ipo-module"><div class="section-head"><div><div class="section-title">🏢 Halka Arz Merkezi</div><div class="section-note">Takvim + şirket raporları + kendi halka arz lotların + halka arz sonrası günlük performans.</div></div><button type="button" class="header-action" data-action="add-ipo-track">+ Takip</button></div>
      <div class="segment-tabs ipo-tabs"><button type="button" class="${marketIpoMode==='calendar'?'active':''}" data-action="ipo-mode" data-ipo-mode="calendar">Takvim</button><button type="button" class="${marketIpoMode==='mine'?'active':''}" data-action="ipo-mode" data-ipo-mode="mine">Aldıklarım${count?` (${count})`:''}</button><button type="button" class="${marketIpoMode==='reports'?'active':''}" data-action="ipo-mode" data-ipo-mode="reports">Raporlar</button></div>
      <div class="ipo-body">${marketIpoMode==='mine'?renderMyIpos():marketIpoMode==='reports'?renderIpoReports():renderIpoCalendar()}</div>
    </section>`;
  }

  function showIpoTrackForm(prefill={}){
    const x={symbol:'',name:'',demandStart:'',demandEnd:'',firstTradeDate:'',price:'',...prefill};
    showModal(`${modalHeader('Halka arzı takip et')}<form id="ipoTrackForm"><div class="form-grid"><div class="field"><label>BIST kodu</label><input name="symbol" value="${esc(x.symbol||'')}" autocapitalize="characters"></div><div class="field full"><label>Şirket</label><input name="name" value="${esc(x.name||'')}" required></div><div class="field"><label>Talep başlangıcı</label><input type="date" name="demandStart" value="${esc(x.demandStart||'')}"></div><div class="field"><label>Talep son günü</label><input type="date" name="demandEnd" value="${esc(x.demandEnd||'')}"></div><div class="field"><label>İlk işlem günü</label><input type="date" name="firstTradeDate" value="${esc(x.firstTradeDate||'')}"></div><div class="field"><label>Halka arz fiyatı</label><input type="number" step="any" min="0" name="price" value="${esc(x.price||'')}"></div></div><div class="field-hint">Tarihler otomatik veriden gelmediyse elle girebilirsin. Bildirimler bu kayda göre oluşturulur.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Takibe ekle</button></div></form>`);
    $('#ipoTrackForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const symbol=String(fd.get('symbol')||'').toUpperCase().trim(),name=String(fd.get('name')||'').trim();if(!name)return;const existing=state.ipoTracked.find(i=>(symbol&&i.symbol===symbol)||(!symbol&&i.name===name));const next={...(existing||{}),id:existing?.id||uid('ipo'),symbol,name,demandStart:String(fd.get('demandStart')||''),demandEnd:String(fd.get('demandEnd')||''),firstTradeDate:String(fd.get('firstTradeDate')||''),price:Number(fd.get('price')||0),updatedAt:new Date().toISOString()};if(existing)Object.assign(existing,next);else state.ipoTracked.push(next);saveState();closeModal();renderPage(false);scheduleEventNotifications();showToast('Halka arz takibe alındı');});
  }

  function showIpoHoldingDetail(assetId){
    const g=ipoHoldingGroups().find(x=>x.asset.id===assetId);if(!g)return;
    const a=g.asset;
    showModal(`${modalHeader(`${a.symbol} halka arz performansı`)}<div class="detail-sheet"><div class="big-symbol">${esc(a.symbol)}</div><div class="detail-price">${money(a.price,a.currency,false,a.price<1?4:2)}</div><div class="asset-change ${g.returnPct>=0?'positive':'negative'}">${pct(g.returnPct)} halka arz fiyatından</div>${ipoProgressHtml(g)}<div class="disclaimer">Kalan halka arz lotu hesabında satışların önce halka arz lotlarından çıktığı (FIFO) varsayılır. Sonradan yaptığın normal alımlar ayrı maliyet taşır.</div><div class="button-row"><button class="secondary-btn" id="ipoAssetDetail">Varlık detayı</button><button class="primary-btn" id="ipoNewTx">Al / sat ekle</button></div></div>`);
    $('#ipoAssetDetail').addEventListener('click',()=>showAssetDetail(a.id));
    $('#ipoNewTx').addEventListener('click',()=>showTransactionForm(a.id));
  }

  function newsTopic(n){
    const t=`${n.titleTr||n.title||''} ${n.summary||''} ${n.category||''}`.toLocaleLowerCase('tr-TR');
    if(/savaş|çatış|füze|ateşkes|yaptırım|nato|iran|israil|ukrayna|rusya|jeopolit/.test(t)) return ['Jeopolitik','critical'];
    if(/petrol|brent|wti|doğal gaz|lng|enerji|elektrik|opec|akaryakıt/.test(t)) return ['Enerji','energy'];
    if(/işsizlik|istihdam|iş gücü|işgücü|maaş|ücret|asgari|emekli|memur/.test(t)) return ['İstihdam & Maaş','life'];
    if(/eğitim|okul|üniversite|öğrenci|meb|yök|ösym/.test(t)) return ['Eğitim','life'];
    if(/spor|futbol|uefa|fifa|olimpiyat|şampiyon/.test(t)) return ['Spor','sport'];
    if(/sağlık|salgın|who|ilaç|hastane/.test(t)) return ['Sağlık','life'];
    if(/gıda|tarım|buğday|mısır|kurak|tmo|fao/.test(t)) return ['Gıda & Tarım','life'];
    if(/yapay zek|çip|teknoloji|ai |semiconductor|nvidia/.test(t)) return ['Teknoloji','tech'];
    if(/faiz|enflasyon|tüfe|fed|tcmb|ecb|merkez banka|büyüme|gdp|kur /.test(t)) return ['Ekonomi','official'];
    if(/borsa|hisse|bist|nasdaq|s&p|şirket|bilanço|temettü/.test(t)) return ['Piyasa','market'];
    if(/seçim|hükümet|meclis|başkan|bakan|siyaset|vergi|tarife|gümrük/.test(t)) return ['Siyaset','politics'];
    return ['Gündem','neutral'];
  }
  function newsImportance(n){
    const [topic,tone]=newsTopic(n); const t=`${n.titleTr||n.title||''} ${n.summary||''}`.toLocaleLowerCase('tr-TR');
    if(tone==='critical'||/acil|son dakika|faiz karar|enflasyon|savaş|ateşkes|yaptırım|deprem|petrol.*%/.test(t)) return ['YÜKSEK ETKİ','high'];
    if(['Ekonomi','Enerji','Piyasa','Siyaset'].includes(topic)) return ['DİKKAT','medium'];
    return ['BİLGİ','low'];
  }
  function portfolioNewsMatch(n){
    const text=`${n.titleTr||n.title||''} ${n.summary||''}`.toLocaleUpperCase('tr-TR');
    return state.assets.filter(a=>a.symbol&&text.includes(String(a.symbol).toUpperCase())).slice(0,4);
  }
  function newsImpactDetail(n){
    const [topic]=newsTopic(n); const matches=portfolioNewsMatch(n);
    const life={Enerji:'Akaryakıt, elektrik/doğalgaz ve ulaştırma maliyetlerini etkileyebilir.','İstihdam & Maaş':'Gelir, satın alma gücü ve iç talep üzerinde etkili olabilir.',Eğitim:'Hane bütçesi, genç istihdamı ve uzun vadeli üretkenliği etkileyebilir.',Spor:'Büyük organizasyon, yayın, turizm veya sponsorluk etkisi varsa ekonomiye yansıyabilir.',Sağlık:'Hane harcamaları, işgücü ve sağlık şirketleri üzerinden ekonomik etkisi olabilir.','Gıda & Tarım':'Gıda fiyatları ve enflasyon üzerinden günlük bütçeyi etkileyebilir.'}[topic]||'Doğrudan günlük etkisi sınırlı olabilir; fiyatlar ve beklentiler üzerinden dolaylı etkisi oluşabilir.';
    const tr={Jeopolitik:'Enerji, dış ticaret, kur ve risk primi üzerinden Türkiye’yi etkileyebilir.',Enerji:'Türkiye’nin enerji ithalat maliyeti ve enflasyon görünümü açısından önemlidir.',Ekonomi:'Faiz, kur, enflasyon ve iç talep kanallarıyla Türkiye ekonomisini etkileyebilir.',Siyaset:'Vergi, teşvik, ticaret ve ekonomi politikası değişirse piyasalara yansıyabilir.'}[topic]||'Sektörel talep, maliyet veya beklentiler üzerinden Türkiye ekonomisine yansıyabilir.';
    const market={Jeopolitik:'Petrol, altın, döviz ve riskli varlıklarda oynaklığı artırabilir.',Enerji:'Petrol/doğalgaz, havacılık, ulaştırma, petrokimya ve enerji hisselerini etkileyebilir.',Ekonomi:'Tahvil, döviz, altın ve hisse değerlemelerinde etkili olabilir.',Piyasa:'Şirket fiyatlamaları ve yatırımcı risk iştahını doğrudan etkileyebilir.'}[topic]||'İlgili sektörlerde fiyatlama ve beklentileri etkileyebilir.';
    const portfolio=matches.length?`Doğrudan eşleşenler: ${matches.map(a=>a.symbol).join(', ')}.`:'Portföyünde haber metniyle doğrudan eşleşen varlık bulunamadı.';
    return `<div class="impact-grid"><div><b>👤 Günlük hayatım</b><span>${esc(life)}</span></div><div><b>🇹🇷 Türkiye</b><span>${esc(tr)}</span></div><div><b>📈 Piyasalar</b><span>${esc(market)}</span></div><div><b>💼 Portföyüm</b><span>${esc(portfolio)}</span></div></div>`;
  }
  function freshNews(items,maxHours=168){
    const now=Date.now(), max=maxHours*3600000;
    return (items||[]).filter(n=>{const t=Date.parse(n.publishedAt||'');return Number.isFinite(t)&&t<=now+3600000&&(now-t)<=max;}).sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
  }
  function marketPulse(all){
    const recent=freshNews(all,48);
    const bistNews=recent.filter(n=>/bist|borsa istanbul|bist 100|bankacılık|açığa satış/i.test(`${n.titleTr||n.title||''} ${n.summary||''}`));
    const metalNews=recent.filter(n=>/altın|gold|xau|gümüş|ons/i.test(`${n.titleTr||n.title||''} ${n.summary||''}`));
    const down=bistNews.filter(n=>/düşt|düşüş|satış|gerile|kayıp|eksi|negatif/i.test(`${n.titleTr||n.title||''} ${n.summary||''}`)).length;
    const up=bistNews.filter(n=>/yüksel|artış|ralli|kazanç|pozitif/i.test(`${n.titleTr||n.title||''} ${n.summary||''}`)).length;
    let headline='Son 48 saatte piyasayı açıklayan güncel gelişmeler';
    if(bistNews.length && down>up) headline='BIST’te satış baskısı gündemde';
    else if(bistNews.length && up>down) headline='BIST’te yükseliş gündemde';
    else if(bistNews.length) headline='BIST’te önemli hareketlilik var';
    else if(metalNews.length) headline='Altın ve değerli metallerde önemli hareketlilik var';
    const related=[...bistNews,...metalNews,...recent.filter(n=>newsImportance(n)[1]==='high')].filter((n,i,a)=>a.findIndex(x=>(x.url||x.title)===(n.url||n.title))===i).slice(0,6);
    const reasons=related.map(n=>`<button type="button" class="pulse-reason" data-action="open-external" data-url="${esc(n.url||'')}"><span>${esc(n.publisher||n.source||'Kaynak')} · ${n.publishedAt?timeAgo(n.publishedAt):''}</span><b>${esc(n.titleTr||n.title||'Gelişme')}</b><em>Aç →</em></button>`).join('');
    return `<section class="card market-card market-pulse"><div class="pulse-kicker">📍 ŞU ANDA NE OLUYOR?</div><div class="pulse-headline">${esc(headline)}</div><div class="section-note">Başlık portföyündeki toplam kâr/zarardan değil, son 48 saatteki güncel piyasa haberlerinden oluşturulur. Kaynaklar olası nedenleri karşılaştırmak içindir.</div>${reasons?`<div class="pulse-reasons"><div class="content-kicker">Son dakika ve ilişkili gelişmeler</div>${reasons}<button type="button" class="secondary-btn pulse-all" data-action="news-mode" data-news-mode="important">Tüm önemli haberleri gör</button></div>`:`<div class="pulse-warning">⚠️ Son 48 saatte yeterli güncel piyasa haberi bulunamadı.</div>`}</section>`;
  }

  function newsHub(all){
    const tabs=[['important','🔥 Önemli'],['portfolio','💼 Portföyüm'],['life','👤 Hayatım'],['tr','🇹🇷 Türkiye'],['world','🌍 Dünya'],['all','Tümü']];
    let items=freshNews(all,168);
    if(marketNewsMode==='important') items=items.filter(n=>newsImportance(n)[1]!=='low');
    if(marketNewsMode==='portfolio') items=items.filter(n=>portfolioNewsMatch(n).length);
    if(marketNewsMode==='life') items=items.filter(n=>['life','energy','sport'].includes(newsTopic(n)[1]));
    if(marketNewsMode==='tr') items=items.filter(n=>String(n.country||'').includes('Türkiye'));
    if(marketNewsMode==='world') items=items.filter(n=>!String(n.country||'').includes('Türkiye'));
    const cards=items.slice(0,18).map(n=>{const [topic,tone]=newsTopic(n),[imp,level]=newsImportance(n);return externalCard(n.url,`news-hub-card tone-${tone} level-${level}`,`<div class="news-card-top"><span class="impact-badge ${level}">${imp}</span><span class="topic-badge">${esc(topic)}</span></div><div class="content-kicker">${esc(n.publisher||n.source||'Haber')} · ${n.publishedAt?timeAgo(n.publishedAt):''}</div><div class="content-title">${esc(n.titleTr||n.title)}</div><div class="content-summary">${esc(n.summary||'Ayrıntılar için haberi aç.')}</div>${newsImpactDetail(n)}`)}).join('');
    const xAccounts=['piyasaTturkiye','parafesorfinans','arzhaber','kendinetemettu','itfo_','mehmetmesci','MELEKBORSA','BloombergHT','karavandaborsa'];
    const xHtml=`<details class="x-sources"><summary>𝕏 Takip edilen kaynaklar (${xAccounts.length})</summary><div class="x-source-grid">${xAccounts.map(u=>`<button type="button" class="source-mini external-card" data-external-url="https://x.com/${esc(u)}"><span><b>@${esc(u)}</b><small>X kaynağını aç</small></span><em>↗</em></button>`).join('')}</div><div class="field-hint">X gönderilerinin uygulamaya anlık düşmesi için resmî X API erişimi gerekir. Bu hesaplar kaynak listesine hazırlandı; API erişimi olmadan gönderi içeriği otomatik çekilmez.</div></details>`;
    return `<section class="card market-card news-hub"><div class="section-head"><div><div class="section-title">📰 Haber Merkezi</div><div class="section-note">Hayatını, Türkiye’yi, piyasaları ve portföyünü etkileyebilecek gelişmeler.</div></div></div><div class="news-tabs">${tabs.map(([k,l])=>`<button type="button" class="${marketNewsMode===k?'active':''}" data-action="news-mode" data-news-mode="${k}">${l}</button>`).join('')}</div><div class="content-list">${cards||'<div class="ipo-empty"><b>Bu filtrede haber bulunamadı.</b><span>Yenile veya başka bir kategori seç.</span></div>'}</div><div class="news-legend"><span>🔴 yüksek etki</span><span>🟠 dikkat</span><span>🔵 bilgi</span></div>${xHtml}</section>`;
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
    const clickable = externalCard;
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
      ${marketPulse(all)}
      ${newsHub(all)}

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

  async function refreshContent({silent=false}={}) {
    if (contentRefreshPromise) return contentRefreshPromise;
    contentRefreshPromise = (async () => {
      try {
        let result;
        if (window.Android?.requestMarketData && state.settings.backendUrl) {
          result = await nativeMarketCall('backendcontent', {
            backendUrl: state.settings.backendUrl,
            backendToken: state.settings.backendToken || ''
          }, 18000);
        } else {
          result = await backendCall({action:'content'}, 15000);
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
        state.market.ipoItems = result.data?.ipoItems || [];
        state.market.ipoNews = result.data?.ipoNews || [];
        state.market.ipoSources = result.data?.ipoSources || [];
        state.market.lastContentSync = new Date().toISOString();
        state.market.contentError = null;
        saveState();
        if (currentPage === 'market') renderPage(false); else updateSyncText();
        if (!silent) showToast('Haber ve piyasa içerikleri güncellendi');
        return true;
      } catch (e) {
        state.market.contentError = e.message || 'İçerik alınamadı';
        saveState();
        if (!silent) showToast(`İçerik alınamadı: ${state.market.contentError}`, 4200);
        return false;
      } finally {
        contentRefreshPromise = null;
      }
    })();
    return contentRefreshPromise;
  }

  function renderDiscover() {
    const cards = [
      ['trend','En yüksek temettü verimine sahip hisseler','Temettü verimi en yüksek hisseleri kolayca keşfedin ve yatırım fırsatlarını değerlendirin.','Hisseleri gör','stocks','yield'],
      ['coin','Gelecek yüksek verimli temettü ödemeleri','Yüksek temettü verimine sahip yaklaşan tüm temettü ödemelerini keşfedin.','Temettüleri gör','upcoming','yield'],
      ['calendar','Son 5 yılda temettü açıklayan hisseler','Son 5 yılda düzenli olarak temettü ödemesi açıklayan hisseleri keşfedin.','Hisseleri gör','stocks','dividend'],
      ['analytics','En yüksek temettü verimine sahip sektörler','Temettü açısından güçlü sektörleri ve bu sektörlerdeki hisseleri inceleyin.','Sektörleri gör','sectors','yield']
    ];
    return `<div class="reference-page"><h1>Keşfet</h1><div class="discover-list">${cards.map((c,i)=>`<button class="discover-card discover-${i}" data-page-go="${c[4]}" data-stock-filter="${c[5]}"><span class="discover-icon">${ICONS[c[0]]}</span><strong>${c[1]}</strong><p>${c[2]}</p><em>${c[3]} ›</em></button>`).join('')}</div></div>`;
  }

  function renderTools() {
    const cards = [
      ['trend','Hisse/Yatırım Karşılaştırma','Hisse senetleri, döviz, altın ve ETF gibi yatırım araçlarını temettüler ve sermaye artışları dahil ederek uzun vadeli karşılaştırın.','compare'],
      ['target','Temettü Emekliliği Hesaplama','Temettü emeklisi olarak finansal özgürlüğünüze ne zaman ulaşacağınızı hesaplayın ve emeklilik planınızı oluşturun.','retirement'],
      ['coin','Temettü Getiri Hesaplama','Yatırımınızın temettü getirisini kolayca hesaplayın. Hisse senedi temettü gelirinizi ve veriminizi anında öğrenin.','income'],
      ['analytics','Temettü Verimi Hesaplama','Hisse fiyatı ya da maliyetinize göre temettü verimini hesaplayın.','yield']
    ];
    return `<div class="reference-page"><h1>Araçlar</h1><div class="tool-list">${cards.map((c,i)=>`<button class="tool-card" data-tool="${c[3]}"><span class="tool-icon tool-${i}">${ICONS[c[0]]}</span><strong>${c[1]}</strong><p>${c[2]}</p><em>Şimdi hesapla</em></button>`).join('')}</div></div>`;
  }

  function renderSearch() {
    const quick = [['stocks','Hisseler'],['sectors','Sektörler'],['calendar','Temettü Takvimi'],['discover','Keşfet'],['tools','Araçlar'],['guide','Rehber']];
    return `<div class="reference-page search-page"><h1>Ara</h1><label class="big-search">${ICONS.search}<input id="globalSearch" placeholder="Hisse, sektör veya içerik ara…" autocomplete="off"></label><h2>Hızlı Erişim</h2><div class="quick-grid">${quick.map(([p,n])=>`<button ${p==='guide'?'data-action="show-guide"':`data-page-go="${p}"`}>${n}</button>`).join('')}</div><div id="globalResults"><h2>Son Aramalar</h2><p class="empty-text">Arama geçmişi bulunamadı.</p></div></div>`;
  }

  function showCalculator(kind) {
    const configs={
      compare:{title:'Hisse/Yatırım Karşılaştırma',fields:[['principal','Başlangıç tutarı',10000],['years','Süre (yıl)',10],['returnA','1. yatırım yıllık getirisi (%)',12],['returnB','2. yatırım yıllık getirisi (%)',8]],calc:f=>{const a=f.principal*Math.pow(1+f.returnA/100,f.years),b=f.principal*Math.pow(1+f.returnB/100,f.years);return `1. yatırım: ${money(a,'TRY')} · 2. yatırım: ${money(b,'TRY')} · Fark: ${money(Math.abs(a-b),'TRY')}`;}},
      retirement:{title:'Temettü Emekliliği Hesaplama',fields:[['capital','Mevcut portföy',portfolioMetrics().total||100000],['monthly','Aylık yatırım',state.settings.monthlyContribution||10000],['target','Hedef aylık temettü',Number(state.settings.dividendGoalAnnual||600000)/12],['yieldRate','Net temettü verimi (%)',5]],calc:f=>{const targetCapital=f.yieldRate>0?f.target*12/(f.yieldRate/100):0;if(f.capital>=targetCapital)return 'Hedef sermayeye ulaştınız.';const months=f.monthly>0?Math.ceil((targetCapital-f.capital)/f.monthly):Infinity;return Number.isFinite(months)?`Yaklaşık ${Math.floor(months/12)} yıl ${months%12} ay · Hedef sermaye ${money(targetCapital,'TRY')}`:'Aylık yatırım sıfır olamaz.';}},
      income:{title:'Temettü Getiri Hesaplama',fields:[['dividend','Pay başına net temettü',5],['quantity','Sahip olunan hisse adedi',1000],['price','Hisse fiyatı / maliyet',100]],calc:f=>`Toplam net temettü: ${money(f.dividend*f.quantity,'TRY')} · Temettü verimi: %${numberFmt(f.price>0?f.dividend/f.price*100:0,2)}`},
      yield:{title:'Temettü Verimi Hesaplama',fields:[['dividend','Pay başına net temettü',5],['price','Hisse fiyatı / maliyet',100]],calc:f=>`Temettü verimi: %${numberFmt(f.price>0?f.dividend/f.price*100:0,2)}`}
    };
    const cfg=configs[kind]; if(!cfg)return showToast('Hesaplama türü bulunamadı');
    showModal(`${modalHeader(cfg.title)}<form id="calculatorForm"><div class="form-grid">${cfg.fields.map(([n,l,v])=>`<div class="field full"><label>${l}</label><input name="${n}" type="number" min="0" step="any" value="${round(v,2)}" required></div>`).join('')}</div><button class="primary-btn">Hesapla</button><div id="calculatorResult" class="calculator-result">Sonuç: —</div></form><section class="faq"><h3>Sıkça Sorulan Sorular</h3><details><summary>Bu hesaplama neyi gösterir?</summary><p>Girdiğiniz değerlerle yaklaşık sonuç üretir; tüm alanlar hesaplamaya katılır.</p></details><details><summary>Yatırım kararında kullanılabilir mi?</summary><p>Bilgilendirme amaçlıdır; vergi, komisyon ve piyasa koşullarını ayrıca değerlendirin.</p></details></section>`);
    $('#calculatorForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),values={};cfg.fields.forEach(([n])=>values[n]=Number(fd.get(n)||0));$('#calculatorResult').textContent=cfg.calc(values);});
  }

  function stockDividendYield(a){return Number(a.price)>0?Number(a.annualDividendPerShare||0)/Number(a.price)*100:0;}
  function renderStocks(){
    let assets=[...state.assets,...(state.watchlist||[]).filter(w=>!state.assets.some(a=>a.symbol===w.symbol))];
    if(stockFilter==='yield')assets.sort((a,b)=>stockDividendYield(b)-stockDividendYield(a));
    else if(stockFilter==='dividend')assets=assets.filter(a=>Number(a.annualDividendPerShare||0)>0||state.dividendEvents.some(e=>e.assetId===a.id));
    else assets.sort((a,b)=>String(a.symbol).localeCompare(String(b.symbol),'tr'));
    return `<div class="reference-page"><div class="page-title-row"><h1>Hisseler</h1><button class="header-action" data-action="add-asset">+ Ekle</button></div><label class="big-search compact">${ICONS.search}<input id="stockSearch" placeholder="Hisse veya yatırım aracı ara…"></label>${stockFilter!=='ALL'?`<div class="active-filter">Etkin filtre: <b>${stockFilter==='yield'?'En yüksek temettü verimi':'Temettü geçmişi olanlar'}</b><button id="clearStockFilter">×</button></div>`:''}<div id="stockList" class="stock-list">${assets.length?assets.map(a=>`<button class="stock-card asset-row" data-asset-id="${a.id}"><div><strong>${esc(a.symbol)}</strong><span>${esc(a.name||TYPE_META[a.type]?.label||'Yatırım aracı')}</span><small>Temettü verimi %${numberFmt(stockDividendYield(a),2)}</small></div><div><small>Son fiyat</small><b>${money(a.price,a.currency,false,a.price<1?4:2)}</b><em class="${Number(a.changePct||0)>=0?'positive':'negative'}">${pct(a.changePct||0)}</em></div></button>`).join(''):emptyState('search','Henüz yatırım aracı yok','Hisse, ETF, fon, altın veya döviz ekleyerek başlayın.')}</div></div>`;
  }

  function renderSectors(){
    const groups=new Map();state.assets.forEach(a=>{const name=a.sector||TYPE_META[a.type]?.label||'Diğer';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(a);});
    const items=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length);
    return `<div class="reference-page"><h1>Sektörler</h1><label class="big-search compact">${ICONS.search}<input id="sectorSearch" placeholder="Sektör ara…"></label><div id="sectorList" class="sector-list">${items.length?items.map(([name,list])=>`<button class="sector-card" data-sector="${esc(name)}"><strong>${esc(name)}</strong><p>${list.length} yatırım aracı bu grupta izleniyor.</p><div>${list.slice(0,3).map(a=>`<span>${esc(a.symbol)}</span>`).join('')} ${list.length>3?`<em>+${list.length-3}</em>`:''}</div></button>`).join(''):emptyState('analytics','Sektör verisi yok','Varlık eklediğinizde yatırım türleri burada gruplanır.')}</div></div>`;
  }

  function renderUpcoming(){
    const events=upcomingEvents(100,false);const groups=new Map();events.forEach(e=>{const d=e.payDate||e.exDate;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(e);});
    return `<div class="reference-page"><div class="page-title-row"><h1>Yaklaşan Ödemeler</h1><button class="header-action" data-action="add-dividend">+ Ekle</button></div><p class="page-description">Şirket tarafından açıklanan resmi ödeme tarihi esas alınır. Tahmini kayıtlar ayrıca etiketlenir.</p>${events.length?[...groups.entries()].map(([date,list])=>`<section class="payment-group"><h2>${dateText(date,{day:'numeric',month:'long',year:'numeric'})}<small>${list.length} ödeme</small></h2><div class="event-list">${list.map(eventRow).join('')}</div></section>`).join(''):emptyState('coin','Yaklaşan ödeme yok','Portföyünüze bir temettü olayı ekleyin.')}</div>`;
  }

  function renderFavorites(){
    const list=state.watchlist||[];return `<div class="reference-page"><div class="page-title-row"><h1>Favoriler</h1><button class="header-action" data-action="add-watch">+ Favori</button></div><p class="page-description">Takip etmek istediğiniz yatırım araçları portföy toplamına eklenmeden burada izlenir.</p><div class="asset-list">${list.length?list.map(watchlistRow).join(''):emptyState('eye','Favori listeniz boş','Bir hisse, ETF, fon, altın veya dövizi favorilere ekleyin.')}</div></div>`;
  }

  function renderSupport(){return `<div class="reference-page"><h1>Destek ve İletişim</h1><div class="support-list"><button id="openSourceStatus">Veri kaynaklarının durumunu kontrol et <span>›</span></button><button id="openDataSettings">Bağlantı ayarlarını aç <span>›</span></button><button id="exportSupport">Yedeği dışa aktar <span>›</span></button></div><div class="disclaimer">FinansalEB yatırım tavsiyesi vermez. Bir sorun bildirirken kullandığınız ekranı ve gördüğünüz hatayı ekleyin.</div></div>`;}
  function renderProfile(){return `<div class="reference-page"><h1>Profil</h1><div class="profile-card"><div class="profile-avatar">EB</div><div><strong>Emre Bayraktar</strong><span>FinansalEB yerel profil</span></div></div><div class="support-list"><button id="profileSettings">Profil ve Ayarlar <span>›</span></button><button id="profileTheme">${state.settings.theme==='night'?'Açık temaya geç':'Gece moduna geç'} <span>›</span></button><button id="profileBackup">Verileri yedekle <span>›</span></button></div></div>`;}

  function showGuide() {
    const titles=['Bedelli sermaye artırımı nedir?','Bedelsiz sermaye artırımı nedir?','Sermaye artırımı nedir, nasıl yapılır?','Temettü verimi nedir, nasıl hesaplanır?','Temettü ödemesi nasıl alınır, hesaba ne zaman geçer?','Temettü nedir?'];
    showModal(`${modalHeader('Rehber')}<p>Temettü, pasif gelir ve finansal özgürlük üzerine detaylı bilgi ve yatırım ipuçları.</p><div class="guide-list">${titles.map((t,i)=>`<article><div class="guide-art art-${i}">${ICONS[i%2?'coin':'trend']}</div><small>REHBER</small><h3>${t}</h3><p>Temel kavramlar, hesaplama yöntemleri ve yatırımcıların dikkat etmesi gereken noktalar.</p></article>`).join('')}</div>`,{className:'guide-modal'});
  }

  function showAppMenu() {
    const rows=[['calendar','Temettü Takvimi'],['upcoming','Yaklaşan Ödemeler'],['stocks','Hisseler'],['sectors','Sektörler'],['discover','Keşfet'],['portfolio','Portföy'],['favorites','Favoriler'],['tools','Hesaplama Araçları'],['guide','Rehber'],['support','Destek ve İletişim'],['profile','Profil ve Ayarlar']];
    showModal(`<div class="app-menu-head"><b>Finansal<span>EB</span></b><button data-modal-close>×</button></div><div class="app-menu">${rows.map(([p,n])=>`<button data-menu-page="${p}"><span>${n}</span><i>›</i></button>`).join('')}</div>`,{className:'menu-modal'});
    $$('[data-menu-page]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.menuPage;closeModal();if(p==='guide')showGuide();else navigate(p);}));
  }

  function renderPage(resetScroll = true) {
    const previousScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const page = $('#page');
    const renderers = { dashboard:renderDashboard, portfolio:renderPortfolio, dividends:renderDividends, calendar:renderCalendar, analytics:renderAnalytics, market:renderMarket, investors:renderInvestors, discover:renderDiscover, tools:renderTools, search:renderSearch, stocks:renderStocks, sectors:renderSectors, upcoming:renderUpcoming, favorites:renderFavorites, support:renderSupport, profile:renderProfile };
    page.innerHTML = (renderers[currentPage] || renderCalendar)();
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
    $$('[data-tool]').forEach(b=>b.addEventListener('click',()=>showCalculator(b.dataset.tool)));
    $('#globalSearch')?.addEventListener('input',e=>{
      const q=e.target.value.trim().toLocaleUpperCase('tr-TR');
      const found=q ? state.assets.filter(a=>`${a.symbol} ${a.name} ${TYPE_META[a.type]?.label||''}`.toLocaleUpperCase('tr-TR').includes(q)).slice(0,20) : [];
      $('#globalResults').innerHTML=q ? `<h2>Sonuçlar</h2>${found.length?`<div class="search-results">${found.map(a=>`<button class="asset-row" data-asset-id="${a.id}"><b>${esc(a.symbol)}</b><span>${esc(a.name)}</span><em>${money(a.price,a.currency)}</em></button>`).join('')}</div>`:'<p class="empty-text">Eşleşen varlık bulunamadı.</p>'} `:'<h2>Son Aramalar</h2><p class="empty-text">Arama geçmişi bulunamadı.</p>';
      $$('.asset-row','#globalResults').forEach(row=>row.addEventListener('click',()=>showAssetDetail(row.dataset.assetId)));
    });
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
    $$('[data-page-go]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.stockFilter)stockFilter=b.dataset.stockFilter;navigate(b.dataset.pageGo);}));
    $$('[data-action]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handleAction(b.dataset.action,b);}));
    $$('.asset-row').forEach(row=>row.addEventListener('click',()=>showAssetDetail(row.dataset.assetId)));
    $$('.event-row').forEach(row=>row.addEventListener('click',()=>showAssetDetail(row.dataset.assetId)));
    $$('.watch-row').forEach(row=>row.addEventListener('click',()=>showWatchForm(row.dataset.watchId)));
    $('#clearStockFilter')?.addEventListener('click',()=>{stockFilter='ALL';renderPage(false);});
    $('#stockSearch')?.addEventListener('input',e=>{const q=e.target.value.toLocaleUpperCase('tr-TR');$$('.stock-card').forEach(x=>x.hidden=!x.textContent.toLocaleUpperCase('tr-TR').includes(q));});
    $('#sectorSearch')?.addEventListener('input',e=>{const q=e.target.value.toLocaleUpperCase('tr-TR');$$('.sector-card').forEach(x=>x.hidden=!x.textContent.toLocaleUpperCase('tr-TR').includes(q));});
    $$('.sector-card').forEach(b=>b.addEventListener('click',()=>{stockFilter='ALL';navigate('stocks');}));
    $('#openSourceStatus')?.addEventListener('click',showSourceStatus);$('#openDataSettings')?.addEventListener('click',showDataSettings);$('#exportSupport')?.addEventListener('click',exportData);
    $('#profileSettings')?.addEventListener('click',showSettings);$('#profileTheme')?.addEventListener('click',()=>{state.settings.theme=state.settings.theme==='night'?'light':'night';saveState();renderPage(false);});$('#profileBackup')?.addEventListener('click',exportData);
    $$('[data-analytics-filter]').forEach(b=>b.addEventListener('click',()=>{analyticsFilter=b.dataset.analyticsFilter;renderPage();}));
    $$('[data-analytics-period]').forEach(b=>b.addEventListener('click',()=>{analyticsPeriod=b.dataset.analyticsPeriod;renderPage(false);}));
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
      'cash-transaction': () => showCashTransactionForm(),
      'add-dividend': () => showDividendForm(null,node?.dataset.datePrefill),
      'add-watch': () => showWatchForm(),
      'confirm-dividend': () => showDividendConfirmation(node?.dataset.eventId),
      'export-calendar': exportCalendar,
      'edit-targets': showTargetEditor,
      'projection-settings': showProjectionSettings,
      'show-guide': showGuide,
      'refresh-content': refreshContent,
      'toggle-market': () => { const key=node?.dataset.marketKey; if(key && Object.prototype.hasOwnProperty.call(marketExpanded,key)){ marketExpanded[key]=!marketExpanded[key]; renderPage(false); } },
      'news-mode': () => { const mode=node?.dataset.newsMode; if(['important','portfolio','life','tr','world','all'].includes(mode)){ marketNewsMode=mode; renderPage(false); } },
      'market-compare': () => { const mode=node?.dataset.compareMode; if(['stocks','funds','world'].includes(mode)){ marketCompareMode=mode; renderPage(false); } },
      'ipo-mode': () => { const mode=node?.dataset.ipoMode; if(['calendar','mine','reports'].includes(mode)){ marketIpoMode=mode; renderPage(false); } },
      'add-ipo-track': () => showIpoTrackForm(),
      'add-ipo-buy': () => showTransactionForm(null,'ipo'),
      'add-transaction-asset': () => showTransactionForm(node?.dataset.assetId),
      'ipo-detail': () => showIpoHoldingDetail(node?.dataset.assetId),
      'track-ipo-item': () => { const symbol=String(node?.dataset.ipoSymbol||'').toUpperCase(); const name=String(node?.dataset.ipoName||'Halka arz'); const demand=String(node?.dataset.ipoDemand||''); const trade=String(node?.dataset.ipoTrade||''); const existing=state.ipoTracked.find(i=>(symbol&&i.symbol===symbol)||i.name===name); if(existing){state.ipoTracked=state.ipoTracked.filter(i=>i.id!==existing.id);saveState();renderPage(false);showToast('Halka arz takibinden çıkarıldı');}else{showIpoTrackForm({symbol,name,demandEnd:/^\d{4}-\d{2}-\d{2}$/.test(demand)?demand:'',firstTradeDate:/^\d{4}-\d{2}-\d{2}$/.test(trade)?trade:''});} }
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
    const a = existing || {type:'BIST',currency:'TRY',symbol:'',name:'',quantity:'',avgCost:'',price:'',targetWeight:0,dividendTax:15,autoDividendTax:true,annualDividendPerShare:0,sourceSymbol:'',fundManagementFeeAnnual:null,fundManagementFeeDaily:null,fundEntryFee:null,fundExitFee:null,fundPerformanceFee:null,fundExpenseRatio:null,fundFeeSourceUrl:'',fundFeeUpdatedAt:null};
    showModal(`${modalHeader(existing ? 'Varlığı düzenle' : 'Yeni varlık ekle')}
      <form id="assetForm"><div class="form-grid">
        <div class="field"><label>Varlık türü</label><select name="type">${Object.entries(TYPE_META).filter(([key])=>key!=='CASH'||a.type==='CASH').map(([key,m])=>`<option value="${key}" ${a.type===key?'selected':''}>${m.label}</option>`).join('')}</select></div>
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
        <div class="field"><label>Temettü stopajı (%)</label><input name="dividendTax" type="number" step=".1" min="0" max="100" value="${a.dividendTax ?? (a.type==='BIST'?15:0)}"><div class="field-hint">BIST için güncel yasal oran otomatik uygulanır; istersen otomatiği kapatıp manuel oran kullanabilirsin.</div></div>
        <div class="field"><label>Stopaj modu</label><select name="autoDividendTax"><option value="1" ${a.autoDividendTax!==false?'selected':''}>Otomatik</option><option value="0" ${a.autoDividendTax===false?'selected':''}>Manuel</option></select></div>
        <div class="field"><label>Yıllık temettü / pay</label><input name="annualDividendPerShare" type="number" step="any" min="0" value="${a.annualDividendPerShare ?? 0}" placeholder="Otomatik hesaplanır"><div class="field-hint">Bul sonrası son 12 aylık temettülerden otomatik hesaplanır; gerekirse düzenleyebilirsiniz.</div></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Fon yönetim ücreti (%/yıl)</label><input name="fundManagementFeeAnnual" type="number" step="any" min="0" value="${a.fundManagementFeeAnnual ?? ''}" placeholder="KAP'tan otomatik"></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Fon yönetim ücreti (%/gün)</label><input name="fundManagementFeeDaily" type="number" step="any" min="0" value="${a.fundManagementFeeDaily ?? ''}" placeholder="KAP'tan otomatik" readonly></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Fon toplam gider oranı (%)</label><input name="fundExpenseRatio" type="number" step="any" min="0" value="${a.fundExpenseRatio ?? ''}" placeholder="Varsa KAP'tan"></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Giriş komisyonu (%)</label><input name="fundEntryFee" type="number" step="any" min="0" value="${a.fundEntryFee ?? ''}" placeholder="KAP'tan otomatik"></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Çıkış komisyonu (%)</label><input name="fundExitFee" type="number" step="any" min="0" value="${a.fundExitFee ?? ''}" placeholder="KAP'tan otomatik"></div>
        <div class="field fund-fee-field" style="${a.type==='TEFAS'?'':'display:none'}"><label>Performans ücreti (%)</label><input name="fundPerformanceFee" type="number" step="any" min="0" value="${a.fundPerformanceFee ?? ''}" placeholder="Varsa KAP'tan"></div>
        <div class="field full"><div class="field-hint">Fon yönetim ücreti fonun birim fiyatına zaten yansır; Finansal(EB) bu bedeli bilgi amaçlı gösterir ve getiriden ikinci kez düşmez.</div></div>
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
        if (typeSelect.value==='BIST' && form.elements.autoDividendTax?.value!=='0') form.elements.dividendTax.value='15';
        if (typeSelect.value==='TEFAS') {
          const fees=await fundFeesForCode(result.symbol, quote.name||result.name||'');
          if (fees) {
            if (fees.managementFeeAnnual!=null) form.elements.fundManagementFeeAnnual.value=fees.managementFeeAnnual;
            if (fees.managementFeeDaily!=null && form.elements.fundManagementFeeDaily) form.elements.fundManagementFeeDaily.value=fees.managementFeeDaily;
            if (fees.expenseRatio!=null) form.elements.fundExpenseRatio.value=fees.expenseRatio;
            if (fees.entryFee!=null) form.elements.fundEntryFee.value=fees.entryFee;
            if (fees.exitFee!=null) form.elements.fundExitFee.value=fees.exitFee;
            if (fees.performanceFee!=null) form.elements.fundPerformanceFee.value=fees.performanceFee;
            selectedMarketData.fundFees=fees;
          }
        }
        setStatus(`${result.symbol} doğrulandı · fiyat${ttm>0?' ve son 12 aylık temettü':''}${typeSelect.value==='TEFAS'?' ve fon gider bilgileri':''} otomatik dolduruldu.`, 'success');
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
      form.querySelectorAll('.fund-fee-field').forEach(el=>el.style.display=typeSelect.value==='TEFAS'?'':'none');
      if (typeSelect.value==='BIST' && form.elements.autoDividendTax?.value!=='0') form.elements.dividendTax.value='15';
      if (assetTypeSupportsLookup(typeSelect.value)) {
        setStatus(typeSelect.value==='TEFAS'?'Fon kodunu yazın; fiyat TEFAS’tan, gider bilgileri mümkünse KAP’tan alınır.':'Sembolü yazınca otomatik arama başlar.');
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
          autoDividendTax:String(fd.get('autoDividendTax')||'1')==='1',
          annualDividendPerShare:Number(fd.get('annualDividendPerShare')||0),
          fundManagementFeeAnnual:fd.get('fundManagementFeeAnnual')===''?null:Number(fd.get('fundManagementFeeAnnual')),
          fundManagementFeeDaily:fd.get('fundManagementFeeDaily')===''?(selectedMarketData?.fundFees?.managementFeeDaily ?? existing?.fundManagementFeeDaily ?? null):Number(fd.get('fundManagementFeeDaily')),
          fundExpenseRatio:fd.get('fundExpenseRatio')===''?null:Number(fd.get('fundExpenseRatio')),
          fundEntryFee:fd.get('fundEntryFee')===''?null:Number(fd.get('fundEntryFee')),
          fundExitFee:fd.get('fundExitFee')===''?null:Number(fd.get('fundExitFee')),
          fundPerformanceFee:fd.get('fundPerformanceFee')===''?null:Number(fd.get('fundPerformanceFee')),
          fundFeeSourceUrl:selectedMarketData?.fundFees?.sourceUrl || existing?.fundFeeSourceUrl || '',
          fundFeeUpdatedAt:selectedMarketData?.fundFees?.updatedAt || existing?.fundFeeUpdatedAt || null,
          history:existing?.history || [],
          historyDates:existing?.historyDates || [],
          lastUpdated:currentPrice>0 ? new Date().toISOString() : (existing?.lastUpdated || null),
          dataStatus:currentPrice>0 ? 'auto' : (existing?.dataStatus || 'pending'),
          dataSource:selectedMarketData?.source || existing?.dataSource || null
        };
        if (existing) Object.assign(existing,next); else {
          state.assets.push(next);
          if (next.quantity > 0) { const purchaseDate=String(fd.get('purchaseDate')||''); if(!purchaseDate) throw new Error('Alış tarihi zorunludur.');const rate=fxRate(next.currency),tx={id:uid('tx'),assetId:next.id,type:'buy',date:purchaseDate,quantity:next.quantity,price:next.avgCost,fee:0,currency:next.currency,fxRateTry:rate,cashTracked:true,fundingSource:'new_money',purchaseKind:'normal'},entry=CORE.tradeCashEntry(tx,next,rate),required=Math.abs(entry.amount),amountTry=required*rate;addCashRow({type:'cash_deposit',transactionId:tx.id,assetId:next.id,date:purchaseDate,currency:next.currency,amount:required,fxRateTry:rate,amountTry,note:`${next.symbol} ilk alış için yeni para`});addCashRow({...entry,note:`${next.symbol} ilk alış ödemesi`});state.cashflows.push({id:uid('flow'),type:'contribution',transactionId:tx.id,date:purchaseDate,amount:amountTry,currency:'TRY',originalAmount:required,originalCurrency:next.currency,note:`${next.symbol} ilk alış için yeni para`});state.transactions.push(tx);syncAssetLedger(next); }
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
      const transactionIds=new Set(state.transactions.filter(x=>x.assetId===assetId).map(x=>x.id));
      const eventIds=new Set(state.dividendEvents.filter(x=>x.assetId===assetId).map(x=>x.id));
      state.assets=state.assets.filter(x=>x.id!==assetId);
      state.transactions=state.transactions.filter(x=>x.assetId!==assetId);
      state.dividendEvents=state.dividendEvents.filter(x=>x.assetId!==assetId);
      state.cashLedger=state.cashLedger.filter(x=>x.assetId!==assetId&&!transactionIds.has(x.transactionId)&&!eventIds.has(x.eventId));
      state.cashflows=state.cashflows.filter(x=>!transactionIds.has(x.transactionId));
      saveState(); closeModal(); renderPage(); showToast('Varlık silindi');
    });
  }

  function showTransactionForm(assetId = null, purchaseKindDefault = 'normal') {
    if (!state.assets.length) return showAssetForm();
    showModal(`${modalHeader('Yeni portföy işlemi')}<form id="txForm">
      <div class="field"><label>İşlem türü</label><div class="segmented" id="txSegments"><button type="button" class="active" data-tx="buy">Alış</button><button type="button" data-tx="sell">Satış</button><button type="button" data-tx="dividend">Temettü</button></div><input type="hidden" name="type" value="buy"></div>
      <div class="form-grid"><div class="field full"><label>Varlık</label><select name="assetId">${state.assets.map(a=>`<option value="${a.id}" ${a.id===assetId?'selected':''}>${esc(a.symbol)} · ${esc(a.name)}</option>`).join('')}</select></div><div class="field"><label>Tarih</label><input type="date" name="date" value="${isoDate()}" required></div><div class="field"><label>Adet / pay</label><input type="number" step="any" min="0" name="quantity" required></div><div class="field"><label>Fiyat / pay</label><input type="number" step="any" min="0" name="price" required></div><div class="field"><label>Komisyon</label><input type="number" step="any" min="0" name="fee" value="0"></div><div class="field" id="fundingSourceField"><label>Alış ödeme kaynağı</label><select name="fundingSource"><option value="cash_account">Mevcut nakit hesabı</option><option value="new_money">Yeni para yatırarak</option><option value="dividend">Temettü TL bakiyesi</option></select><div class="field-hint" id="cashAccountHint"></div></div><div class="field full" id="purchaseKindField"><label>Alış türü</label><select name="purchaseKind"><option value="normal" ${purchaseKindDefault==='normal'?'selected':''}>Normal piyasa alımı</option><option value="ipo" ${purchaseKindDefault==='ipo'?'selected':''}>Halka arzdan dağıtılan lot</option></select><div class="field-hint">Halka arzı seçersen bu lotlar Piyasa → Halka Arzlar → Aldıklarım alanında ayrı izlenir.</div></div><div class="field full"><div class="disclaimer" id="transactionCashInfo" style="margin:0"></div></div></div>
      <div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">İşlemi kaydet</button></div></form>`);
    const updateTransactionCashInfo=()=>{
      const form=$('#txForm'),a=assetById(form.elements.assetId.value),type=form.elements.type.value,currency=a?.currency||'TRY';
      $('#fundingSourceField').style.display=type==='buy'?'':'none';
      $('#purchaseKindField').style.display=type==='buy'?'':'none';
      $('#cashAccountHint').textContent=`${currency} nakit bakiyesi: ${money(cashBalance(currency),currency)} · Temettü TL: ${money(dividendCashBalance(),'TRY')}`;
      $('#transactionCashInfo').textContent=type==='sell'
        ? `Satışın komisyon sonrası net tutarı otomatik olarak ${currency} nakit hesabına eklenecek.`
        : type==='buy'
          ? `Alış bedeli ve komisyon ${currency} hesabından düşecek. “Yeni para” seçilirse aynı tutar önce hesaba yatırılmış sayılır.`
          : 'Temettü, onaylanan net TL tutarıyla nakit hesabına eklenecek.';
    };
    $$('#txSegments button').forEach(b=>b.addEventListener('click',()=>{$$('#txSegments button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#txForm').elements.type.value=b.dataset.tx;updateTransactionCashInfo();}));
    $('#txForm').elements.assetId.addEventListener('change',updateTransactionCashInfo);
    updateTransactionCashInfo();
    $('#txForm').addEventListener('submit',e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget); const a=assetById(fd.get('assetId')); if(!a)return;
      const type=fd.get('type'), qty=Number(fd.get('quantity')||0), price=Number(fd.get('price')||0), fee=Number(fd.get('fee')||0), txDate=String(fd.get('date')||'');
      if(!txDate) return showToast('İşlem tarihi zorunludur.');
      if(!(qty>0) || !(price>=0)) return showToast('Adet ve fiyatı kontrol edin.');
      if(type==='dividend') { const evt={id:uid('div'),assetId:a.id,exDate:String(fd.get('date')),payDate:String(fd.get('date')),amountPerShare:qty?price/qty:price,currency:a.currency,status:'confirmed',received:true,receivedAt:txDate,source:'Manuel işlem'}; state.dividendEvents.push(evt); const netTry=eventNet(evt);evt.confirmedQuantity=qty;evt.confirmedNetTry=netTry;addCashRow({type:'dividend_income',eventId:evt.id,assetId:a.id,date:evt.payDate,currency:'TRY',amount:netTry,fxRateTry:1,amountTry:netTry,note:`${a.symbol} net temettü`}); }
      else {
        if(type==='sell'){const available=quantityAtDate(a.id,txDate);if(qty>available+1e-9)return showToast(`Bu tarihte en fazla ${numberFmt(available,4)} adet satabilirsiniz.`);}
        const fundingSource=String(fd.get('fundingSource')||'cash_account');
        const purchaseKind=type==='buy'?String(fd.get('purchaseKind')||'normal'):undefined;
        const rate=fxRate(a.currency),tx={id:uid('tx'),assetId:a.id,type,date:txDate,quantity:qty,price,fee,currency:a.currency,fxRateTry:rate,cashTracked:true,fundingSource:type==='buy'?fundingSource:undefined,purchaseKind,ipoPrice:purchaseKind==='ipo'?price:undefined};
        const tradeEntry=CORE.tradeCashEntry(tx,a,rate),required=type==='buy'?Math.abs(tradeEntry.amount):0,spendTry=required*rate;
        if(type==='buy'&&fundingSource==='cash_account'&&cashBalance(a.currency)+1e-8<required)return showToast(`${a.currency} nakit bakiyesi yetersiz: ${money(cashBalance(a.currency),a.currency)}`);
        if(type==='buy'&&fundingSource==='new_money'){
          addCashRow({type:'cash_deposit',transactionId:tx.id,assetId:a.id,date:txDate,currency:a.currency,amount:required,fxRateTry:rate,amountTry:spendTry,note:`${a.symbol} alışı için yeni para`});
          state.cashflows.push({id:uid('flow'),type:'contribution',transactionId:tx.id,date:txDate,amount:spendTry,currency:'TRY',originalAmount:required,originalCurrency:a.currency,note:`${a.symbol} alışı için yeni para`});
        }
        if(type==='buy'&&fundingSource==='dividend'){
          if(dividendCashBalance()+1e-6<spendTry)return showToast(`Temettü bakiyesi yetersiz: ${money(dividendCashBalance(),'TRY')}`);
          if(cashBalance('TRY')+1e-6<spendTry)return showToast(`TL nakit bakiyesi yetersiz: ${money(cashBalance('TRY'),'TRY')}`);
          addCashRow({type:'dividend_reinvestment',transactionId:tx.id,assetId:a.id,date:txDate,currency:'TRY',amount:0,fxRateTry:1,amountTry:-spendTry,affectsCash:false,note:`${a.symbol} temettü yeniden yatırımı`});
          if(a.currency!=='TRY'){
            addCashRow({type:'cash_conversion_out',transactionId:tx.id,assetId:a.id,date:txDate,currency:'TRY',amount:-spendTry,fxRateTry:1,amountTry:-spendTry,note:`${a.currency} alımı için TL dönüşümü`});
            addCashRow({type:'cash_conversion_in',transactionId:tx.id,assetId:a.id,date:txDate,currency:a.currency,amount:required,fxRateTry:rate,amountTry:spendTry,note:`${a.symbol} alışı için ${a.currency}`});
          }
        }
        addCashRow({...tradeEntry,note:type==='sell'?`${a.symbol} satış geliri`:`${a.symbol} alış ödemesi`});
        state.transactions.push(tx);
        syncAssetLedger(a);
      }
      state.demo=false;saveState();closeModal();renderPage();showToast(type==='sell'?`Satış net tutarı ${a.currency} hesabına eklendi`:'İşlem ve nakit hareketi kaydedildi');
    });
  }

  function showCashTransactionForm() {
    const balances=cashBalances();
    showModal(`${modalHeader('Nakit işlemi')}<form id="cashForm"><div class="form-grid"><div class="field"><label>İşlem</label><select name="type"><option value="deposit">Para yatırma</option><option value="withdrawal">Para çekme</option></select></div><div class="field"><label>Para birimi</label><select name="currency">${['TRY','USD','EUR','GBP'].map(c=>`<option value="${c}">${c} · ${money(balances[c]||0,c)}</option>`).join('')}</select></div><div class="field"><label>Tarih</label><input type="date" name="date" value="${isoDate()}" required></div><div class="field"><label>Tutar</label><input type="number" step="any" min="0" name="amount" required></div><div class="field full"><label>Not</label><input name="note" placeholder="Örn. Aracı kuruma para yatırma"></div></div><div class="disclaimer">Para yatırma ve çekme yatırım getirisi değildir; yalnızca nakit hesabını ve toplam portföy değerini değiştirir.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#cashForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),type=String(fd.get('type')),currency=String(fd.get('currency')||'TRY'),amount=Number(fd.get('amount')||0),date=String(fd.get('date')||''),rate=fxRate(currency);if(!(amount>0)||!date)return showToast('Tarih ve tutarı kontrol edin.');if(type==='withdrawal'&&cashBalance(currency)+1e-8<amount)return showToast(`${currency} nakit bakiyesi yetersiz: ${money(cashBalance(currency),currency)}`);const signed=type==='withdrawal'?-amount:amount,amountTry=signed*rate;addCashRow({type:type==='withdrawal'?'cash_withdrawal':'cash_deposit',date,currency,amount:signed,fxRateTry:rate,amountTry,note:String(fd.get('note')||'')||cashActivityLabel({type:type==='withdrawal'?'cash_withdrawal':'cash_deposit'})});state.cashflows.push({id:uid('flow'),type:type==='withdrawal'?'withdrawal':'contribution',date,amount:amountTry,currency:'TRY',originalAmount:signed,originalCurrency:currency,note:String(fd.get('note')||'')});state.demo=false;saveState();closeModal();renderPage();showToast(type==='withdrawal'?'Para çekme kaydedildi':'Nakit hesaba eklendi');});
  }

  function showWatchForm(watchId=null){
    const existing=(state.watchlist||[]).find(w=>w.id===watchId)||null;
    const w=existing||{type:'BIST',currency:'TRY',symbol:'',name:'',price:0,changePct:0,note:''};
    showModal(`${modalHeader(existing?'Takibi düzenle':'İzleme listesine ekle')}<form id="watchForm"><div class="form-grid"><div class="field"><label>Tür</label><select name="type">${[['BIST','BIST'],['US','ABD hissesi'],['ETF','ETF'],['TEFAS','Fon'],['GOLD','Altın'],['SILVER','Gümüş'],['CUSTOM','Diğer']].map(([k,l])=>`<option value="${k}" ${w.type===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>Sembol / fon kodu</label><input name="symbol" value="${esc(w.symbol)}" required></div><div class="field full"><label>Ad</label><input name="name" value="${esc(w.name||'')}"></div><div class="field"><label>Takip fiyatı</label><input type="number" step="any" min="0" name="price" value="${Number(w.price||0)}"></div><div class="field"><label>Para birimi</label><select name="currency">${['TRY','USD','EUR','GBP'].map(c=>`<option ${w.currency===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field full"><label>Not / hedef</label><input name="note" value="${esc(w.note||'')}" placeholder="Örn. 150 TL altını takip et"></div></div><div class="button-row">${existing?'<button type="button" class="danger-btn" id="deleteWatch">Sil</button>':''}<button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#watchForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const next={...(existing||{}),id:existing?.id||uid('watch'),type:String(fd.get('type')),symbol:String(fd.get('symbol')||'').toUpperCase().trim(),name:String(fd.get('name')||''),price:Number(fd.get('price')||0),currency:String(fd.get('currency')||'TRY'),note:String(fd.get('note')||''),changePct:Number(existing?.changePct||0)};if(existing)Object.assign(existing,next);else state.watchlist.push(next);saveState();closeModal();renderPage();showToast('İzleme listesi güncellendi');});
    $('#deleteWatch')?.addEventListener('click',()=>{state.watchlist=state.watchlist.filter(x=>x.id!==existing.id);saveState();closeModal();renderPage();showToast('Takipten çıkarıldı');});
  }

  function showDividendConfirmation(eventId){
    const e=state.dividendEvents.find(x=>x.id===eventId);if(!e)return;
    const a=assetById(e.assetId);if(!a)return;
    const qty=eligibleQuantityAtExDate(e.assetId,e.exDate||e.payDate),tax=clamp(e.taxRate??automaticDividendTax(a,e.payDate||e.exDate),0,100);
    const gross=qty*Number(e.amountPerShare||0),netCurrency=gross*(1-tax/100),netTry=netCurrency*fxRate(e.currency||a.currency);
    showModal(`${modalHeader('Temettü ödemesini kontrol et')}<div class="detail-sheet"><div class="big-symbol">${esc(a.symbol)}</div><div class="detail-grid"><div class="detail-stat"><div class="label">Hak edilen adet</div><div class="value">${numberFmt(qty,4)}</div></div><div class="detail-stat"><div class="label">Pay başına brüt</div><div class="value">${money(e.amountPerShare,e.currency||a.currency,false,4)}</div></div><div class="detail-stat"><div class="label">Brüt toplam</div><div class="value">${money(gross,e.currency||a.currency)}</div></div><div class="detail-stat"><div class="label">Stopaj</div><div class="value">%${numberFmt(tax,2)}</div></div><div class="detail-stat"><div class="label">Net ödeme</div><div class="value positive">${money(netCurrency,e.currency||a.currency)}</div></div><div class="detail-stat"><div class="label">TL hesaba geçecek</div><div class="value positive">${money(netTry,'TRY')}</div></div></div><div class="disclaimer">Adet, hak kullanım tarihindeki işlem geçmişinden otomatik hesaplandı. Gerçek banka/aracı kurum tutarı farklıysa temettü kaydını düzenleyebilirsin.</div><div class="button-row"><button class="secondary-btn" id="divNotReceived">Almadım</button><button class="primary-btn" id="divReceived">Temettü aldım</button></div></div>`);
    $('#divReceived').addEventListener('click',()=>{e.received=true;e.receivedAt=isoDate();e.confirmedQuantity=qty;e.confirmedNetTry=netTry;if(!state.cashLedger.some(x=>x.eventId===e.id&&x.type==='dividend_income'))addCashRow({type:'dividend_income',eventId:e.id,assetId:a.id,date:e.payDate||isoDate(),currency:'TRY',amount:netTry,fxRateTry:1,amountTry:netTry,note:`${a.symbol} net temettü`});saveState();closeModal();renderPage();showToast(`${money(netTry,'TRY')} temettü TL bakiyesine eklendi`);});
    $('#divNotReceived').addEventListener('click',()=>{e.reviewedNotReceived=true;e.reviewedAt=isoDate();saveState();closeModal();renderPage();showToast('Ödeme alınmadı olarak işaretlendi');});
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
    $('#divForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const a=assetById(fd.get('assetId'));if(!a)return;const evt={id:uid('div'),assetId:a.id,exDate:String(fd.get('exDate')),payDate:String(fd.get('payDate')),amountPerShare:Number(fd.get('amount')||0),currency:a.currency,status:String(fd.get('status')),received:fd.get('received')==='1',receivedAt:fd.get('received')==='1'?isoDate():undefined,taxRate:fd.get('taxRate')===''?undefined:Number(fd.get('taxRate')),source:String(fd.get('source')||'Manuel kayıt')};state.dividendEvents.push(evt);if(evt.received){const netTry=eventNet(evt);evt.confirmedQuantity=eligibleQuantityAtExDate(evt.assetId,evt.exDate);evt.confirmedNetTry=netTry;addCashRow({type:'dividend_income',eventId:evt.id,assetId:a.id,date:evt.payDate,currency:'TRY',amount:netTry,fxRateTry:1,amountTry:netTry,note:`${a.symbol} net temettü`});}state.demo=false;saveState();closeModal();renderPage();showToast('Temettü olayı eklendi');scheduleEventNotifications();});
  }

  function showAssetDetail(assetId) {
    const a=assetById(assetId);if(!a)return;const value=assetValue(a),cost=assetCost(a),profit=value-cost,annual=state.dividendEvents.filter(e=>e.assetId===a.id&&parseDate(e.payDate||e.exDate)>=addDays(new Date(),-1)&&parseDate(e.payDate||e.exDate)<=addDays(new Date(),365)).reduce((s,e)=>s+eventNet(e),0)||Number(a.quantity||0)*Number(a.annualDividendPerShare||0)*(1-clamp(automaticDividendTax(a),0,100)/100)*fxRate(a.currency);const hist=(a.history||[]).map(Number).filter(Number.isFinite);const spark=sparklineSvg(hist);const pos=transactionPosition(a.id);const firstBuy=state.transactions.filter(t=>t.assetId===a.id&&t.type==='buy'&&t.date).sort((x,y)=>parseDate(x.date)-parseDate(y.date))[0];
    showModal(`${modalHeader(a.name||a.symbol)}<div class="detail-sheet"><div class="big-symbol">${esc(a.symbol)}</div><div class="detail-price">${money(a.price,a.currency,false,a.price<1?4:2)}</div><div class="asset-change ${Number(a.changePct||0)>=0?'positive':'negative'}">${pct(a.changePct)} bugün</div>${spark}<div class="detail-grid"><div class="detail-stat"><div class="label">Portföy değeri</div><div class="value">${money(value,'TRY')}</div></div><div class="detail-stat"><div class="label">Açık kâr / zarar</div><div class="value ${profit>=0?'positive':'negative'}">${money(profit,'TRY')} · ${pct(assetProfitPct(a))}</div></div><div class="detail-stat"><div class="label">Ortalama maliyet</div><div class="value">${money(a.avgCost,a.currency,false,a.avgCost<1?4:2)}</div></div><div class="detail-stat"><div class="label">Gerçekleşen kâr / zarar</div><div class="value ${Number(pos.realizedProfitTry||0)>=0?'positive':'negative'}">${money(Number(pos.realizedProfitTry||0),'TRY')}</div></div><div class="detail-stat"><div class="label">İlk alış tarihi</div><div class="value">${firstBuy?dateText(firstBuy.date):'—'}</div></div><div class="detail-stat"><div class="label">12 ay net temettü</div><div class="value">${money(annual,'TRY')}</div></div>${a.type==='TEFAS'?`<div class="detail-stat"><div class="label">Yönetim ücreti</div><div class="value">${a.fundManagementFeeAnnual!=null?'%'+numberFmt(a.fundManagementFeeAnnual,4)+' / yıl':'—'}</div></div><div class="detail-stat"><div class="label">Fon toplam gider oranı</div><div class="value">${a.fundExpenseRatio!=null?'%'+numberFmt(a.fundExpenseRatio,4):'—'}</div></div>`:''}</div>${a.type==='TEFAS'?`<div class="disclaimer">Fon ücretleri KAP'tan mümkün olduğunda otomatik alınır. Yönetim ücreti fon fiyatına zaten yansıdığı için portföy getirisinden ayrıca düşülmez.</div>`:''}<div class="button-row"><button class="secondary-btn" id="detailDividend">Temettü ekle</button><button class="primary-btn" id="detailEdit">Düzenle</button></div></div>`);
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
      <div class="setting-row" id="themeSetting"><div class="setting-icon">${ICONS.eye}</div><div><div class="setting-name">Gece modu</div><div class="setting-value">Koyu renkli, göz yormayan arayüz</div></div><i class="switch ${s.theme==='night'?'on':''}"></i></div>
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
    $('#refreshNow').addEventListener('click',()=>{closeModal();refreshAll({includeContent:true});});
    $('#sourceStatus').addEventListener('click',showSourceStatus);
    $('#themeSetting').addEventListener('click',()=>{state.settings.theme=state.settings.theme==='night'?'light':'night';saveState();showSettings();renderPage(false);});
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
    showModal(`${modalHeader('Kişisel veri sunucusu')}<form id="dataForm"><div class="field"><label>API adresi</label><input name="backendUrl" value="${esc(s.backendUrl)}" placeholder="https://alanadiniz.com/finansaleb/api.php"></div><div class="field"><label>API erişim anahtarı</label><input name="backendToken" value="${esc(s.backendToken)}" placeholder="Kişisel anahtar"></div><div class="field"><label>Otomatik yenileme aralığı</label><select name="refreshMinutes">${[[15,'15 dakika'],[30,'30 dakika'],[60,'1 saat'],[180,'3 saat'],[360,'6 saat']].map(([v,l])=>`<option value="${v}" ${Number(s.refreshMinutes||((s.refreshHours||6)*60))===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="toggle-row" id="autoRefreshToggle"><div class="toggle-main"><div class="toggle-title">Uygulama açılınca yenile</div><div class="toggle-note">Son yenileme süresi dolduysa otomatik çalışır</div></div><i class="switch ${s.autoRefresh?'on':''}"></i><input type="hidden" name="autoRefresh" value="${s.autoRefresh?'1':'0'}"></div><div class="disclaimer">APK; BIST/ABD/ETF aramasını, fiyatları ve TEFAS fon kodlarını kendi Android veri katmanından otomatik sorgular. Kişisel PHP sunucusu yalnızca önbellek, KAP ve ek dayanıklılık için isteğe bağlıdır.</div><div class="button-row"><button type="button" class="secondary-btn" data-modal-close>Vazgeç</button><button class="primary-btn">Kaydet ve test et</button></div></form>`);
    $('#autoRefreshToggle').addEventListener('click',()=>{const sw=$('.switch','#autoRefreshToggle');sw.classList.toggle('on');$('#dataForm').elements.autoRefresh.value=sw.classList.contains('on')?'1':'0';});
    $('#dataForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);s.backendUrl=String(fd.get('backendUrl')).trim().replace(/\/$/,'');s.backendToken=String(fd.get('backendToken')).trim();s.refreshMinutes=Math.max(15,Number(fd.get('refreshMinutes')||15));s.refreshHours=Math.max(1,Math.round(s.refreshMinutes/60));s.autoRefresh=fd.get('autoRefresh')==='1';saveState();closeModal();await refreshAll();});
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

  async function fundFeesForCode(code, name = '') {
    if (!state.settings.backendUrl) return null;
    try {
      const data = await backendCall({action:'fund_fees',code,name},16000);
      return data?.ok ? data.data : null;
    } catch (error) {
      console.warn('KAP fon gideri alınamadı', error);
      return null;
    }
  }

  async function tefasQuote(code) {
    if(state.settings.backendUrl){const data=await backendCall({action:'tefas',code},18000);if(data?.ok&&data.data)return data.data;throw new Error(data?.error||'TEFAS verisi alınamadı');}
    const payload={fonKodu:String(code).toUpperCase(),dil:'TR',periyod:1};
    const json=await fetchJson('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},15000);
    const rows=json?.resultList||[];if(!rows.length)throw new Error('TEFAS kaydı bulunamadı');
    const prices=rows.map(r=>Number(r.fiyat)).filter(Number.isFinite);const price=prices.at(-1),prev=prices.at(-2)||price,last=rows.at(-1)||{};
    return{symbol:code,name:last.fonUnvan||code,price,prevClose:prev,changePct:prev?(price-prev)/prev*100:0,currency:'TRY',history:prices,dividends:[],source:'TEFAS yeni API',updatedAt:new Date().toISOString()};
  }

  async function quoteForAsset(asset) {
    const sourceSymbol=asset.sourceSymbol||inferSourceSymbol(asset.symbol,asset.type);
    if(window.Android?.requestMarketData){
      try {const response=await nativeMarketCall('quote',{symbol:sourceSymbol,type:asset.type},10000);if(response?.data)return response.data;}catch(error){console.warn('Native quote fallback',error);}
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
        received:false, source:item.source||'Otomatik veri', sourceUrl:item.sourceUrl||undefined
      };
      if (existing) Object.assign(existing, CORE.mergeExternalDividend(existing, normalized));
      else state.dividendEvents.push(normalized);
    }
  }

  function mergeDividendHistory(asset, dividends) {
    if(!Array.isArray(dividends)||!dividends.length)return;
    const sorted=dividends.filter(d=>d.amount>0).sort((a,b)=>parseDate(a.date)-parseDate(b.date));
    sorted.forEach(d=>{const exists=state.dividendEvents.some(e=>e.assetId===asset.id&&sameDay(parseDate(e.exDate),parseDate(d.date))&&Math.abs(Number(e.amountPerShare)-Number(d.amount))<.0001);if(!exists)state.dividendEvents.push({id:uid('div'),assetId:asset.id,exDate:d.date,payDate:d.date,amountPerShare:d.amount,currency:asset.currency,status:'confirmed',received:false,source:'Geçmiş piyasa olayı'});});
    const recent=sorted.filter(d=>parseDate(d.date)>addDays(new Date(),-730));if(recent.length<2)return;
    const intervals=[];for(let i=1;i<recent.length;i++)intervals.push((parseDate(recent[i].date)-parseDate(recent[i-1].date))/DAY);intervals.sort((a,b)=>a-b);const median=intervals[Math.floor(intervals.length/2)]||90;const normalized=median<50?30:median<140?91:median<270?182:365;const amounts=recent.slice(-4).map(d=>d.amount).sort((a,b)=>a-b);const amount=amounts[Math.floor(amounts.length/2)]||recent.at(-1).amount;let next=parseDate(recent.at(-1).date);while(next<addDays(new Date(),-1))next=addDays(next,normalized);const horizon=addDays(new Date(),370);while(next<=horizon){const date=isoDate(next);const exists=state.dividendEvents.some(e=>e.assetId===asset.id&&Math.abs(parseDate(e.exDate)-next)<10*DAY);if(!exists)state.dividendEvents.push({id:uid('div'),assetId:asset.id,exDate:date,payDate:isoDate(addDays(next,asset.type==='US'||asset.type==='ETF'?14:2)),amountPerShare:amount,currency:asset.currency,status:'estimated',received:false,source:'Geçmiş ödeme düzeni tahmini'});next=addDays(next,normalized);}
  }

  async function enrichAssetEvents(asset) {
    try {
      const [feed, kapFeed] = await Promise.all([
        dividendFeedForAsset(asset).catch(()=>[]),
        officialKapFeed(asset).catch(()=>[])
      ]);
      mergeExternalDividendEvents(asset, feed);
      mergeExternalDividendEvents(asset, kapFeed);
      mergeDividendHistory(asset, feed.map(e=>({date:e.exDate||e.date,amount:e.amountPerShare??e.amount,status:e.status})));
    } catch(error) { console.warn('Dividend enrichment', asset.symbol, error); }
  }

  async function refreshOneAssetPrice(asset) {
    const q = await quoteForAsset(asset);
    if (!(Number.isFinite(Number(q.price)) && Number(q.price)>0)) throw new Error('Geçerli fiyat alınamadı');
    asset.price=Number(q.price);
    asset.prevClose=Number(q.prevClose||q.price);
    asset.changePct=Number(q.changePct||0);
    asset.history=(q.history||[]).map(Number).filter(Number.isFinite).slice(-120);
    asset.historyDates=Array.isArray(q.timestamps)?q.timestamps.slice(-120).map(t=>isoDate(new Date(Number(t)*1000))):((asset.historyDates||[]).slice(-asset.history.length));
    asset.lastUpdated=new Date().toISOString();
    asset.dataStatus='auto'; asset.dataSource=q.source||'Otomatik'; asset.dataError=null;
    if(q.currency&&asset.type!=='GOLD'&&asset.type!=='SILVER')asset.currency=q.currency;
    mergeDividendHistory(asset,q.dividends);
    return true;
  }

  async function runWithConcurrency(items, worker, limit=4) {
    let index=0;
    const runners=Array.from({length:Math.min(limit,items.length)}, async()=>{
      while(index<items.length){
        const current=items[index++];
        await worker(current);
      }
    });
    await Promise.all(runners);
  }

  async function refreshAll({silent=false,onlyAssetId=null,includeContent=false}={}) {
    if(refreshController){if(!silent)showToast('Yenileme zaten çalışıyor');return;}
    refreshController={cancelled:false};
    const btn=$('#syncBtn'); btn?.classList.add('loading');
    if(!silent)showToast('Fiyatlar hızlıca güncelleniyor…',1400);
    const assets=state.assets.filter(a=>!onlyAssetId||a.id===onlyAssetId), failed=[]; let success=0;
    const contentTask = (!onlyAssetId && includeContent) ? refreshContent({silent:true}) : Promise.resolve();
    await runWithConcurrency(assets, async asset=>{
      if(refreshController?.cancelled)return;
      try{await refreshOneAssetPrice(asset);success++;}
      catch(error){asset.dataStatus=asset.price?'cached':'error';asset.dataError=error.message;failed.push(`${asset.symbol}: ${error.message}`);}
    },4);
    if(!onlyAssetId && Array.isArray(state.watchlist) && state.watchlist.length){
      await runWithConcurrency(state.watchlist, async w=>{
        try{const pseudo={...w,sourceSymbol:w.sourceSymbol||inferSourceSymbol(w.symbol,w.type)};const q=await quoteForAsset(pseudo);if(Number(q.price)>0){w.price=Number(q.price);w.prevClose=Number(q.prevClose||q.price);w.changePct=Number(q.changePct||0);w.currency=q.currency||w.currency;w.sourceSymbol=pseudo.sourceSymbol;w.lastUpdated=new Date().toISOString();w.dataError=null;}}catch(error){w.dataError=error.message;}
      },4);
    }
    if(success){state.market.lastSync=new Date().toISOString();state.market.lastError=failed.length?`${failed.length} varlık son değerle gösteriliyor`:null;}
    else if(failed.length)state.market.lastError=failed[0];
    saveState(); refreshController=null; btn?.classList.remove('loading'); renderPage(false); updateSyncText(); scheduleEventNotifications(); syncNativeWidget();
    // Temettü/KAP gibi ağır işler fiyat ekranını bekletmeden arka planda tamamlanır.
    if(!onlyAssetId && assets.length) setTimeout(()=>runWithConcurrency(assets, enrichAssetEvents, 2).then(()=>saveState()).catch(()=>{}),300);
    await contentTask.catch(()=>{});
    if(!silent)showToast(success?`${success} varlık güncellendi${failed.length?`, ${failed.length} son değerle kaldı`:''}`:`Veri alınamadı; son kayıtlar korundu`,3000);
  }

  function refreshIntervalMinutes() {
    return Math.max(15, Number(state.settings.refreshMinutes || ((state.settings.refreshHours||6)*60) || 15));
  }

  function shouldAutoRefresh() {
    if(!state.settings.autoRefresh||!state.assets.length)return false;
    const last=state.market.lastSync?new Date(state.market.lastSync).getTime():0;
    return Date.now()-last>refreshIntervalMinutes()*60_000;
  }

  function shouldAutoRefreshContent() {
    if(!state.settings.autoRefresh)return false;
    const last=state.market.lastContentSync?new Date(state.market.lastContentSync).getTime():0;
    return Date.now()-last>refreshIntervalMinutes()*60_000;
  }

  function triggerAutoRefresh() {
    if(!navigator.onLine)return;
    if(shouldAutoRefresh()) refreshAll({silent:true,includeContent:shouldAutoRefreshContent()});
    else if(shouldAutoRefreshContent()) refreshContent({silent:true});
  }

  function startAutoRefreshLoop() {
    if(autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer=setInterval(triggerAutoRefresh,60_000);
  }

  function syncNativeWidget() {
    try {
      if(!window.Android?.saveWidgetState)return;
      const m=portfolioMetrics(),next=upcomingEvents(1)[0],payload={total:m.total,dailyPct:m.dailyPct,daily:m.daily,annualDividend:m.annualDividend,nextSymbol:next?assetById(next.assetId)?.symbol:'',nextAmount:next?eventNet(next):0,nextDate:next?(next.payDate||next.exDate):'',lastSync:state.market.lastSync,privacy:state.settings.privacy,backendUrl:state.settings.backendUrl,backendToken:state.settings.backendToken,refreshHours:Number(state.settings.refreshHours||6),refreshMinutes:refreshIntervalMinutes(),fx:{...state.market.fx},assets:state.assets.map(a=>({id:a.id,symbol:a.symbol,sourceSymbol:a.sourceSymbol,type:a.type,currency:a.currency,quantity:a.quantity,price:a.price,baseValue:assetValue(a)}))};
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
      upcomingEvents(8,false).forEach(e=>{const a=assetById(e.assetId),date=parseDate(e.payDate||e.exDate),pre=new Date(date.getFullYear(),date.getMonth(),date.getDate()-1,10,0,0).getTime(),day=new Date(date.getFullYear(),date.getMonth(),date.getDate(),10,0,0).getTime();if(pre>Date.now())window.Android.scheduleNotification(`${a?.symbol||'Hisse'} temettüsü yarın`,`${dateText(date,{day:'numeric',month:'long'})} · yaklaşık ${money(eventNet(e),'TRY')}`,pre,`divpre_${e.id}`);if(day>Date.now())window.Android.scheduleNotification(`${a?.symbol||'Hisse'} · temettü kazancı olabilir`,`Bugün ödeme tarihi · yaklaşık ${money(eventNet(e),'TRY')}. Aldıysan uygulamadan onayla.`,day,`divpay_${e.id}`);});
      (state.ipoTracked||[]).forEach(i=>{[['demandStart','Halka arz talebi başlıyor'],['demandEnd','Halka arzda son gün'],['firstTradeDate','Borsada ilk işlem günü']].forEach(([key,title])=>{if(!i[key])return;const d=parseDate(i[key]),at=new Date(d.getFullYear(),d.getMonth(),d.getDate(),9,0,0).getTime();if(at>Date.now())window.Android.scheduleNotification(`${i.symbol||i.name} · ${title}`,`${dateText(d,{day:'numeric',month:'long'})} · ${i.name}`,at,`ipo_${i.id}_${key}`);});});
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
    $('#syncBtn').addEventListener('click',()=>refreshAll({includeContent:true}));
    $('#moreBtn').addEventListener('click',showAppMenu);
    $('#searchBtn').addEventListener('click',()=>navigate('search'));
    $('#profileBtn').addEventListener('click',()=>navigate('profile'));
    $('#importInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importData(file);e.target.value='';});
    window.addEventListener('online',()=>{showToast('İnternet bağlantısı geri geldi');triggerAutoRefresh();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(triggerAutoRefresh,250);});
    window.addEventListener('focus',()=>setTimeout(triggerAutoRefresh,250));
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
    applyTheme();renderIcons();setupGlobalEvents();renderPage();showOnboarding();initPwa();scheduleEventNotifications();startAutoRefreshLoop();
    if(params.get('demo') !== '1')setTimeout(triggerAutoRefresh,350);
  }

  document.addEventListener('DOMContentLoaded',init);
})();
