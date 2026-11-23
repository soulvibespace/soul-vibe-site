/*
 * buy-online.js — «Купить онлайн» on /pricing (soul-vibe-site#119).
 *
 * The buttons appear ONLY when the API says online payment is on (GET /api/payments/config →
 * enabled:true, i.e. PAYMENTS_ENABLED=true on soul-vibe-api). Otherwise the page stays as it was:
 * «Оплата в студии» through the administrator.
 *
 * Click → not signed in: the plan is remembered (sessionStorage) and the usual sign-in window opens;
 * after sign-in svsAfterSignIn() calls SVSBuyOnline.resumePending() and the purchase continues.
 * Signed in → POST /api/payments/checkout { plan, lang } → redirect to Stripe Checkout.
 * The price is NOT sent: the server takes it from the VIBES panel. VIBES are credited by the
 * Stripe webhook; the result page /payment only shows the status.
 */
(function () {
  'use strict';

  var PENDING_KEY = 'svs_pending_purchase';
  var PENDING_TTL_MS = 30 * 60 * 1000;
  var api = function () {
    return window.SVS_API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE
      : (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:3001' : 'https://soul-vibe-api.onrender.com'));
  };
  var t = function (k) { return window.SVS_I18N ? SVS_I18N.t(k) : k; };
  var lang = function () { return window.SVS_I18N ? SVS_I18N.getLang() : 'en'; };
  var token = function () { try { return localStorage.getItem('svs_token'); } catch (_) { return null; } };
  var signedIn = function () { var x = token(); return typeof isTokenValid === 'function' ? isTokenValid(x) : !!x; };
  var store = function () { try { return window.sessionStorage; } catch (_) { return null; } };

  var plans = [];

  function setI18n(el, key) { if (!el) return; el.setAttribute('data-i18n', key); var v = t(key); if (v.indexOf('<') >= 0) el.innerHTML = v; else el.textContent = v; }

  function cardCode(card) { var c = card.querySelector('.vp-code'); return c ? c.textContent.trim() : ''; }

  function message(card, key, html) {
    var box = card.querySelector('.vp-buy-msg');
    if (!box) { box = document.createElement('p'); box.className = 'vp-buy-msg'; box.setAttribute('role', 'alert'); card.appendChild(box); }
    if (!key) { box.hidden = true; box.removeAttribute('data-i18n'); box.textContent = ''; return; }
    box.hidden = false;
    setI18n(box, key);
    if (html) box.insertAdjacentHTML('beforeend', ' ' + html);
  }

  function busy(btn, on) {
    btn.disabled = !!on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    setI18n(btn, on ? 'pay_buy_wait' : 'pay_buy_online');
  }

  async function buy(plan, btn) {
    var card = btn.closest('.vp-card');
    message(card, null);
    if (!signedIn()) {
      var s = store(); if (s) s.setItem(PENDING_KEY, JSON.stringify({ plan: plan, at: Date.now() }));
      if (typeof AuthModal !== 'undefined') AuthModal.open('login'); else location.href = '/account';
      return;
    }
    busy(btn, true);
    try {
      var r = await fetch(api() + '/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ plan: plan, lang: lang() }),
      });
      var d = await r.json().catch(function () { return {}; });
      if (r.ok && d.url && /^https:\/\/checkout\.stripe\.com\//.test(d.url)) { location.href = d.url; return; }
      busy(btn, false);
      if (r.status === 401) { var s2 = store(); if (s2) s2.setItem(PENDING_KEY, JSON.stringify({ plan: plan, at: Date.now() })); if (typeof AuthModal !== 'undefined') AuthModal.open('login'); return; }
      if (d.code === 'verify_email') return message(card, 'pay_err_verify', '<a href="/account">' + t('nav_account') + ' →</a>');
      if (d.code === 'starter_pack_not_eligible') return message(card, 'pay_err_starter', '<a href="#multi-pass">' + t('pay_see_passes') + ' →</a>');
      if (d.code === 'customer_not_found' || d.code === 'ambiguous') return message(card, 'pay_err_card', '<a href="/contact">' + t('nav_contact') + ' →</a>');
      if (d.code === 'payments_disabled') { teardown(); return; }
      message(card, 'pay_err_generic');
    } catch (_) {
      busy(btn, false);
      message(card, 'pay_err_generic');
    }
  }

  function addButtons() {
    document.querySelectorAll('.vp-card').forEach(function (card) {
      var code = cardCode(card);
      if (plans.indexOf(code) < 0 || card.querySelector('.vp-buy')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary btn-sm vp-buy';
      btn.setAttribute('data-plan', code);
      setI18n(btn, 'pay_buy_online');
      btn.addEventListener('click', function () { buy(code, btn); });
      card.appendChild(btn);
    });
    document.body.classList.add('svs-pay-on');
    // The payment note and the FAQ answer switch to the «online» wording (data-i18n → follows language changes).
    setI18n(document.querySelector('.vp-pay-title'), 'pv_pay_title_online');
    setI18n(document.querySelector('.vp-pay-text'), 'pv_pay_text_online');
    setI18n(document.querySelector('[data-i18n="pv_faq8_a"]'), 'pv_faq8_a_online');
  }

  function teardown() {
    document.querySelectorAll('.vp-buy, .vp-buy-msg').forEach(function (el) { el.remove(); });
    document.body.classList.remove('svs-pay-on');
    setI18n(document.querySelector('.vp-pay-title'), 'pv_pay_title');
    setI18n(document.querySelector('.vp-pay-text'), 'pv_pay_text');
    setI18n(document.querySelector('[data-i18n="pv_faq8_a_online"]'), 'pv_faq8_a');
    plans = [];
  }

  function cancelledNotice() {
    var q = new URLSearchParams(location.search);
    if (q.get('payment') !== 'cancelled') return;
    var box = document.createElement('p');
    box.className = 'vp-notice'; box.setAttribute('role', 'status');
    setI18n(box, 'pay_cancelled');
    var target = document.getElementById('multi-pass');
    (target ? target.parentNode : document.body).insertBefore(box, target || null);
    q.delete('payment');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (_) {}
  }

  // Called by svsAfterSignIn() (auth-modal.js) after a successful sign-in.
  async function resumePending() {
    var s = store(); if (!s) return false;
    var raw = s.getItem(PENDING_KEY); if (!raw) return false;
    s.removeItem(PENDING_KEY);
    var p; try { p = JSON.parse(raw); } catch (_) { return false; }
    if (!p || !p.plan || Date.now() - Number(p.at || 0) > PENDING_TTL_MS) return false;
    if (!plans.length) await load();
    var btn = document.querySelector('.vp-buy[data-plan="' + String(p.plan).replace(/[^A-Z0-9]/g, '') + '"]');
    if (!btn) return false;
    btn.scrollIntoView({ block: 'center' });
    await buy(p.plan, btn);
    return true;
  }

  async function load() {
    try {
      var r = await fetch(api() + '/api/payments/config', { headers: { Accept: 'application/json' } });
      var d = await r.json();
      if (!d || d.enabled !== true || !Array.isArray(d.plans) || !d.plans.length) return;
      plans = d.plans.map(String);
      addButtons();
    } catch (_) { /* API asleep or offline: keep «через администратора» */ }
  }

  window.SVSBuyOnline = { resumePending: resumePending, reload: load };

  function start() {
    cancelledNotice();
    load().then(function () {
      // A purchase interrupted by Google sign-in redirect / page reload.
      if (signedIn()) resumePending();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
