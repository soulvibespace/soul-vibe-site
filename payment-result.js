/*
 * payment-result.js — page /payment?session_id=cs_… after Stripe Checkout (soul-vibe-site#119).
 *
 * Shows the status only. VIBES are credited by the Stripe webhook on the API (never from this page),
 * so here we just ask GET /api/payments/status until the panel reports the result:
 *   credited      → «Спасибо, оплата прошла»: VIBES, valid until, balance
 *   processing    → «Подтверждаем оплату» (webhook not processed yet) — keep asking
 *   needs_review  → «Оплата получена»: administrator credits VIBES manually
 *   open/expired  → «Оплата не завершена»: nothing was charged
 * Not signed in → «Войдите, чтобы увидеть оплату» with the usual sign-in window.
 */
(function () {
  'use strict';

  var FAST_MS = 2000, FAST_TRIES = 15, SLOW_MS = 6000, MAX_TRIES = 45;
  var api = function () {
    return window.SVS_API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE
      : (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:3001' : 'https://soul-vibe-api.onrender.com'));
  };
  var t = function (k) { return window.SVS_I18N ? SVS_I18N.t(k) : k; };
  var lang = function () { return window.SVS_I18N ? SVS_I18N.getLang() : 'en'; };
  var token = function () { try { return localStorage.getItem('svs_token'); } catch (_) { return null; } };
  var signedIn = function () { var x = token(); return typeof isTokenValid === 'function' ? isTokenValid(x) : !!x; };
  var $ = function (id) { return document.getElementById(id); };

  var ICONS = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  };

  var sessionId = (new URLSearchParams(location.search).get('session_id') || '').trim();
  var last = null;   // last view, re-rendered on language change
  var tries = 0, timer = null;

  function fill(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }).replace(/\.\./g, '.'); }

  // soul-vibe-site#65 GAP-01: the term starts at the first visit, so the page shows «N days from the first visit»
  // and never an end date (the panel sets it only after the first visit).
  function fmtDays(n) {
    n = Number(n);
    if (!(n > 0)) return '';
    var l = lang();
    if (l === 'ru') {
      var m10 = n % 10, m100 = n % 100;
      return n + '\u00a0' + (m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней');
    }
    if (l === 'el') return n + (n === 1 ? '\u00a0ημέρα' : '\u00a0ημέρες');
    return n + (n === 1 ? '\u00a0day' : '\u00a0days');
  }

  function planLine(code) {
    if (!code) return '';
    var kind = /^SP/.test(code) ? 'starter_line' : 'pass_line';
    var name = window.SVS_I18N ? SVS_I18N.term(kind) : (kind === 'starter_line' ? 'Starter Pack' : 'Class Pass');
    return name + ' <span class="vp-code">' + String(code).replace(/[^A-Z0-9]/g, '') + '</span>';
  }

  function render(view) {
    last = view;
    var card = $('payResult');
    card.setAttribute('data-state', view.state);
    $('payIcon').innerHTML = ICONS[view.icon || 'info'];
    var title = $('payTitle'); title.removeAttribute('data-i18n'); title.textContent = t(view.title);
    var text = $('payText'); text.removeAttribute('data-i18n'); text.textContent = view.text ? fill(t(view.text), view.vars || {}) : '';
    text.hidden = !view.text;
    var small = $('paySmall'); small.textContent = (view.small || []).map(function (k) { return fill(t(k), view.vars || {}); }).join(' ');
    small.hidden = !(view.small && view.small.length);
    var plan = $('payPlan'); plan.innerHTML = planLine(view.plan); plan.hidden = !view.plan;
    var btns = $('payBtns');
    if (view.signin) {
      btns.innerHTML = '<button type="button" class="btn btn-primary" id="paySignIn"></button><a href="/pricing" class="btn btn-outline"></a>';
      btns.children[0].textContent = t('nav_signin');
      btns.children[0].addEventListener('click', function () { if (typeof AuthModal !== 'undefined') AuthModal.open('login'); else location.href = '/account'; });
      btns.children[1].textContent = t('payr_btn_pricing');
    } else {
      btns.innerHTML = '<a href="/account" class="btn btn-primary"></a><a href="/pricing" class="btn btn-outline"></a>';
      btns.children[0].textContent = t('nav_account');
      btns.children[1].textContent = t('payr_btn_pricing');
    }
    if (view.state === 'ok') document.title = t('payr_ok_title') + ' | Soul Vibe Space';
  }

  function viewFor(d) {
    var vars = { vibes: d.vibes, days: fmtDays(d.validity_days), balance: d.balance };
    switch (d.status) {
      case 'credited':
        return { state: 'ok', icon: 'ok', title: 'payr_ok_title', text: d.vibes ? (d.validity_days ? 'payr_ok_text' : 'payr_ok_text_nodays') : null, plan: d.plan, vars: vars,
          small: (d.balance != null ? ['payr_balance'] : []).concat(['payr_receipt']) };
      case 'resolved':
        return { state: 'ok', icon: 'ok', title: 'payr_ok_title', text: null, plan: d.plan, vars: vars, small: ['payr_receipt'] };
      case 'needs_review':
        return { state: 'review', icon: 'info', title: 'payr_review_title', text: 'payr_review_text', plan: d.plan, vars: vars, small: ['payr_receipt'] };
      case 'expired':
        return { state: 'open', icon: 'info', title: 'payr_open_title', text: 'payr_open_text', plan: d.plan };
      case 'open':
        // Right after the redirect Stripe may still finish the session — wait a little before saying «not completed».
        if (tries < 3) return { state: 'wait', icon: 'wait', title: 'payr_wait_title', text: 'payr_wait_text', plan: d.plan, again: true };
        return { state: 'open', icon: 'info', title: 'payr_open_title', text: 'payr_open_text', plan: d.plan };
      default: // processing
        return { state: 'wait', icon: 'wait', title: 'payr_wait_title', text: tries >= FAST_TRIES ? 'payr_slow_text' : 'payr_wait_text', plan: d.plan, again: true };
    }
  }

  // GA4 purchase — once per Checkout Session (a reload or a second tab does not count it again).
  // Only when the payment really went through; value and currency from the API (Stripe amount_total).
  var GA_SENT_PREFIX = 'svs_ga_purchase_';
  function trackPurchase(d) {
    try {
      if (typeof window.svsTrack !== 'function') return;
      if (['credited', 'resolved', 'needs_review'].indexOf(d.status) < 0) return;
      var key = GA_SENT_PREFIX + sessionId;
      try { if (localStorage.getItem(key)) return; } catch (_) {}
      var code = String(d.plan || '').replace(/[^A-Z0-9]/g, '');
      var value = Number(d.amount_cents) > 0 ? Math.round(Number(d.amount_cents)) / 100 : undefined;
      var starter = /^SP/.test(code);
      var item = { item_id: code || 'unknown', item_name: (starter ? 'Starter Pack ' : 'Class Pass ') + code, item_category: starter ? 'Starter Pack' : 'Class Pass', quantity: 1 };
      if (value) item.price = value;
      var sent = window.svsTrack('purchase', {
        transaction_id: sessionId, currency: String(d.currency || 'eur').toUpperCase(), value: value, items: [item],
      });
      if (sent === true) { try { localStorage.setItem(key, String(Date.now())); } catch (_) {} }
    } catch (_) {}
  }

  async function check() {
    clearTimeout(timer);
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return render({ state: 'err', icon: 'info', title: 'payr_err_title', text: 'payr_err_text' });
    if (!signedIn()) return render({ state: 'signin', icon: 'user', title: 'payr_signin_title', text: 'payr_signin_text', signin: true });
    tries++;
    var view;
    try {
      var r = await fetch(api() + '/api/payments/status?session_id=' + encodeURIComponent(sessionId), {
        headers: { Accept: 'application/json', Authorization: 'Bearer ' + token() },
      });
      if (r.status === 401) return render({ state: 'signin', icon: 'user', title: 'payr_signin_title', text: 'payr_signin_text', signin: true });
      var d = await r.json().catch(function () { return {}; });
      if (r.ok) { view = viewFor(d); trackPurchase(d); }
      else if (r.status >= 500 && tries < MAX_TRIES) view = { state: 'wait', icon: 'wait', title: 'payr_wait_title', text: tries >= FAST_TRIES ? 'payr_slow_text' : 'payr_wait_text', again: true };
      else view = { state: 'err', icon: 'info', title: 'payr_err_title', text: 'payr_err_text' };
    } catch (_) {
      // Render free tier may be waking up — keep trying for a while.
      view = tries < MAX_TRIES ? { state: 'wait', icon: 'wait', title: 'payr_wait_title', text: tries >= FAST_TRIES ? 'payr_slow_text' : 'payr_wait_text', again: true }
        : { state: 'err', icon: 'info', title: 'payr_err_title', text: 'payr_err_text' };
    }
    render(view);
    if (view.again && tries < MAX_TRIES) timer = setTimeout(check, tries < FAST_TRIES ? FAST_MS : SLOW_MS);
    else if (view.again) render({ state: 'wait', icon: 'info', title: 'payr_wait_title', text: 'payr_slow_text', plan: view.plan });
  }

  window.SVSPaymentResult = { refresh: function () { tries = 0; check(); } };
  window.addEventListener('svs:langchange', function () { if (last) render(last); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
