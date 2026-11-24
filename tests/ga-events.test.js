// node tests/ga-events.test.js — события GA4 через window.svsTrack (analytics.js):
// booking_start / booking_done (booking-modal.js), begin_checkout (buy-online.js), purchase (payment-result.js).
// Без согласия события не уходят; purchase считается один раз на session_id; переход в Stripe не ждёт GA зря.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let n = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function el() {
  return new Proxy({ children: [{ addEventListener() {} }, {}], style: {} }, {
    get(o, k) { if (k in o) return o[k]; if (k === 'addEventListener' || k === 'setAttribute' || k === 'removeAttribute') return () => {}; return undefined; },
    set(o, k, v) { o[k] = v; return true; },
  });
}
// Минимальное окружение браузера для одного файла.
function sandbox({ search = '', ls = {}, fetchImpl, track } = {}) {
  const timers = [];
  const win = {
    localStorage: storage(ls), sessionStorage: storage(),
    location: { search, pathname: '/x', hostname: 'app.soulvibespace.com', hash: '', href: '' },
    addEventListener() {}, dispatchEvent() {},
    SVS_PRICES: { plans: { MP8: { price: 130 }, SP1: { price: 15 } } },
  };
  if (track) win.svsTrack = track;
  win.window = win;
  win.document = { readyState: 'complete', addEventListener() {}, getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [], title: '' };
  win.fetch = fetchImpl || (async () => ({ ok: false, status: 500, json: async () => ({}) }));
  win.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  win.clearTimeout = () => {};
  win.URLSearchParams = URLSearchParams;
  win.history = { replaceState() {} };
  win.console = console;
  win.__timers = timers;
  return vm.createContext(win);
}
const tick = () => new Promise(r => setImmediate(r));

// ── analytics.js ─────────────────────────────────────────────────────────────
t('svsTrack: без согласия — false и ничего в dataLayer; после «Принять все» — true', () => {
  const ctx = sandbox();
  ctx.navigator = {}; ctx.document.head = { appendChild() {} }; ctx.document.createElement = () => ({});
  vm.runInContext(read('analytics.js'), ctx);
  const before = ctx.dataLayer.length;
  assert.strictEqual(ctx.svsTrack('booking_start', {}), false);
  assert.strictEqual(ctx.dataLayer.length, before);
  ctx.localStorage.setItem('svs_cookie_consent', 'all');
  const ctx2 = sandbox({ ls: { svs_cookie_consent: 'all' } });
  ctx2.navigator = {}; ctx2.document.head = { appendChild() {} }; ctx2.document.createElement = () => ({});
  vm.runInContext(read('analytics.js'), ctx2);
  assert.strictEqual(ctx2.svsTrack('booking_start', { page_path: '/' }), true);
  const last = ctx2.dataLayer[ctx2.dataLayer.length - 1];
  assert.strictEqual(last[0], 'event'); assert.strictEqual(last[1], 'booking_start');
});

// ── buy-online.js: begin_checkout ────────────────────────────────────────────
t('begin_checkout: Class Pass MP8, EUR 130, затем переход в Stripe по event_callback', () => {
  const calls = [];
  const ctx = sandbox({ track: (name, p) => { calls.push([name, p]); return true; } });
  vm.runInContext(read('buy-online.js'), ctx);
  ctx.SVSBuyOnline._goCheckout('MP8', 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.strictEqual(calls.length, 1);
  const [name, p] = calls[0];
  assert.strictEqual(name, 'begin_checkout');
  assert.strictEqual(p.currency, 'EUR'); assert.strictEqual(p.value, 130);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p.items)), [{ item_id: 'MP8', item_name: 'Class Pass MP8', item_category: 'Class Pass', quantity: 1, price: 130 }]);
  assert.strictEqual(ctx.location.href, '', 'ждём GA (event_callback) до таймера');
  p.event_callback();
  assert.strictEqual(ctx.location.href, 'https://checkout.stripe.com/c/pay/cs_test_1');
  ctx.__timers.find(x => x.ms === 700).fn(); // таймер-страховка второй раз не переходит
  assert.ok(!/пакет/i.test(p.items[0].item_name));
});

t('begin_checkout: Starter Pack SP1 → item_category Starter Pack', () => {
  const ctx = sandbox();
  vm.runInContext(read('buy-online.js'), ctx);
  const it = ctx.SVSBuyOnline._gaItem('SP1');
  assert.strictEqual(it.item_name, 'Starter Pack SP1'); assert.strictEqual(it.item_category, 'Starter Pack'); assert.strictEqual(it.price, 15);
});

t('begin_checkout: без согласия (svsTrack → false) или без analytics.js — сразу в Stripe, без ожидания', () => {
  for (const track of [() => false, undefined]) {
    const ctx = sandbox({ track });
    vm.runInContext(read('buy-online.js'), ctx);
    ctx.SVSBuyOnline._goCheckout('MP8', 'https://checkout.stripe.com/c/pay/cs_test_2');
    assert.strictEqual(ctx.location.href, 'https://checkout.stripe.com/c/pay/cs_test_2');
  }
});

t('begin_checkout: ошибка внутри svsTrack не мешает оплате', () => {
  const ctx = sandbox({ track: () => { throw new Error('boom'); } });
  vm.runInContext(read('buy-online.js'), ctx);
  ctx.SVSBuyOnline._goCheckout('MP8', 'https://checkout.stripe.com/c/pay/cs_test_3');
  assert.strictEqual(ctx.location.href, 'https://checkout.stripe.com/c/pay/cs_test_3');
});

// ── payment-result.js: purchase ──────────────────────────────────────────────
const SID = 'cs_test_a1B2c3D4e5F6g7H8i9J0';
function statusFetch(body) { return async () => ({ ok: true, status: 200, json: async () => body }); }
async function runResult(body, { ls = {}, track } = {}) {
  const calls = [];
  const ctx = sandbox({
    search: '?session_id=' + SID, ls: { svs_token: 'x', ...ls }, fetchImpl: statusFetch(body),
    track: track || ((name, p) => { calls.push([name, p]); return true; }),
  });
  vm.runInContext(read('payment-result.js'), ctx);
  await tick(); await tick();
  return { calls, ctx };
}

t('purchase: credited → один раз, transaction_id = session_id, сумма из Stripe', async () => {
  const { calls, ctx } = await runResult({ status: 'credited', plan: 'MP8', vibes: 160, amount_cents: 13000, currency: 'eur' });
  assert.strictEqual(calls.length, 1);
  const [name, p] = calls[0];
  assert.strictEqual(name, 'purchase');
  assert.strictEqual(p.transaction_id, SID); assert.strictEqual(p.value, 130); assert.strictEqual(p.currency, 'EUR');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p.items)), [{ item_id: 'MP8', item_name: 'Class Pass MP8', item_category: 'Class Pass', quantity: 1, price: 130 }]);
  assert.ok(ctx.localStorage.getItem('svs_ga_purchase_' + SID));
});

t('purchase: перезагрузка страницы (метка уже есть) — повторно не считается', async () => {
  const { calls } = await runResult({ status: 'credited', plan: 'MP8', amount_cents: 13000, currency: 'eur' }, { ls: { ['svs_ga_purchase_' + SID]: '1' } });
  assert.strictEqual(calls.length, 0);
});

t('purchase: needs_review (деньги получены) — считается; processing/open/expired — нет', async () => {
  assert.strictEqual((await runResult({ status: 'needs_review', plan: 'SP1', amount_cents: 1500, currency: 'eur' })).calls.length, 1);
  for (const status of ['processing', 'open', 'expired']) {
    assert.strictEqual((await runResult({ status, plan: 'MP8', amount_cents: 13000, currency: 'eur' })).calls.length, 0, status);
  }
});

t('purchase: без согласия (svsTrack → false) метка не ставится — событие уйдёт, когда согласие появится', async () => {
  const { ctx } = await runResult({ status: 'credited', plan: 'MP8', amount_cents: 13000, currency: 'eur' }, { track: () => false });
  assert.strictEqual(ctx.localStorage.getItem('svs_ga_purchase_' + SID), null);
});

// ── booking-modal.js: booking_start / booking_done ───────────────────────────
t('booking-modal.js: booking_start при открытии, booking_done после успешной записи, через безопасную обёртку', () => {
  const src = read('booking-modal.js');
  const open = src.slice(src.indexOf('async function open('), src.indexOf('async function open(') + 800);
  assert.match(open, /_track\('booking_start'/);
  const ok = src.indexOf("if (!res.ok || !data.ok) throw new Error(data.error || 'Booking failed');");
  const done = src.indexOf("_track('booking_done'");
  const success = src.indexOf("_renderStep('success')", ok);
  assert.ok(ok > 0 && done > ok && done < success, 'booking_done только после ответа ok и до экрана «успех»');
  assert.match(src, /function _track\(name, params\) \{\s*try \{/);
});

t('booking-modal.js: _track чистит пустые параметры и не падает без analytics.js', () => {
  const src = read('booking-modal.js');
  const body = src.slice(src.indexOf('function _track(name, params) {'), src.indexOf('// ── Open / Close'));
  const calls = [];
  const fn = new Function('window', 'location', body + '; return _track;')({ svsTrack: (nm, p) => calls.push([nm, p]) }, { pathname: '/schedule' });
  fn('booking_done', { service_id: '7', class_name: undefined, booking_id: '' , class_date: '2026-12-01' });
  assert.deepStrictEqual(calls, [['booking_done', { page_path: '/schedule', service_id: '7', class_date: '2026-12-01' }]]);
  const fn2 = new Function('window', 'location', body + '; return _track;')({}, { pathname: '/' });
  fn2('booking_start', {}); // без svsTrack — тихо
});

(async () => {
  for (const [name, fn] of tests) { await fn(); n++; console.log('ok -', name); }
  console.log(`ga-events: ${n} тестов, все прошли`);
})().catch(e => { console.error(e); process.exit(1); });
