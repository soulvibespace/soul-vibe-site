/**
 * Soul Vibe Space — passwordless sign-in by a one-time email code.
 *
 * One widget for all three sign-in places: the sign-in window (auth-modal.js), the
 * booking window (booking-modal.js) and /account (account.js). Each place mounts it
 * with its own CSS classes so the fields look like the rest of that form:
 *
 *   SVSEmailLogin.mount(hostEl, {
 *     cls: { field, label, input, button, error, link },
 *     onSuccess(token, client),           // save the session, continue (booking / dashboard)
 *     onModeChange(view),                 // 'code' | 'password' | 'forgot' | 'profile' — show/hide the old forms, Google
 *     footer: footerEl                    // where the small links go («Войти по паролю», «Забыли пароль?»)
 *   });
 *
 * Steps: email → code (autocomplete one-time-code, paste, «Отправить ещё раз» after 60 s,
 * «Изменить email») → on the very first sign-in a short profile form (name + phone + terms).
 * API: POST /api/auth/email-code/start | verify | complete (soul-vibe-api, email-code-auth.js).
 * The signed challenge from /start is kept in sessionStorage so a re-render of the booking
 * window or a page reload does not lose the step. Nothing else is stored.
 */
(function () {
  'use strict';

  var STORE = 'svs_ec';
  var RESEND_S = 60;
  var mode = 'code';            // shared by every mounted widget on the page
  var mounts = [];

  function apiBase() {
    if (window.SVS_API_BASE) return window.SVS_API_BASE;
    if (typeof API_BASE !== 'undefined') return API_BASE; // auth-modal.js / account.js / booking-modal.js
    return (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : 'https://soul-vibe-api.onrender.com';
  }
  function lang() {
    var l = (window.SVS_I18N && SVS_I18N.getLang && SVS_I18N.getLang()) || document.documentElement.lang || 'en';
    return ['ru', 'en', 'el'].indexOf(l) >= 0 ? l : 'en';
  }
  function t(key, vars) {
    var s = (window.SVS_I18N && SVS_I18N.t(key)) || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (s && s.until > Date.now()) return s;
    } catch (_) {}
    return null;
  }
  function save(s) { try { if (s) sessionStorage.setItem(STORE, JSON.stringify(s)); else sessionStorage.removeItem(STORE); } catch (_) {} }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '')); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  async function post(path, body) {
    var res;
    try {
      res = await fetch(apiBase() + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) { var n = new Error(t('ec_err_network')); n.network = true; throw n; }
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) { var err = new Error(data.error || 'Request failed'); err.status = res.status; err.data = data; throw err; }
    return data;
  }

  function errText(err) {
    if (err.network) return t('ec_err_network');
    var d = err.data || {};
    switch (d.code) {
      case 'invalid_email': return t('ec_err_email');
      case 'wait': return t('ec_err_wait', { s: d.retry_after || RESEND_S });
      case 'too_many': return t('ec_err_too_many');
      case 'send_failed': return t('ec_err_send');
      case 'wrong': return t('ec_err_wrong', { n: d.tries_left });
      case 'expired': return t('ec_err_expired');
      case 'too_many_attempts': return t('ec_err_attempts');
      case 'unavailable': return t('ec_err_unavailable');
      case 'phone': return t('ec_err_phone');
      case 'name': return t('ec_err_name');
      case 'terms_required': return t('err_terms_required');
    }
    return (err.status >= 500 || err.status === 404) ? t('ec_err_unavailable') : t('ec_err_generic');
  }

  function Widget(host, opts) {
    this.host = host;
    this.opts = opts || {};
    this.cls = Object.assign({ field: '', label: '', input: '', button: '', error: '', link: '' }, this.opts.cls || {});
    this.timer = null;
    this.step = 'email';
    this.email = '';
    this.busy = false;
    this.render();
  }

  Widget.prototype.state = function () { return load(); };

  Widget.prototype.render = function (focusId) {
    var s = this.state();
    if (this.step !== 'forgot') this.step = s ? (s.profile ? 'profile' : 'code') : 'email';
    var c = this.cls, id = this.uid || (this.uid = 'ec' + Math.random().toString(36).slice(2, 8));
    var html = '';
    if (this.step === 'email') {
      html = '<form class="svs-ec-form" novalidate data-ec="email">'
        + '<p class="svs-ec-hint">' + esc(t('ec_hint')) + '</p>'
        + '<div class="' + c.field + '"><label class="' + c.label + '" for="' + id + 'Email">' + esc(t('ec_email_label')) + '</label>'
        + '<input class="' + c.input + ' svs-ec-email" id="' + id + 'Email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required placeholder="your@email.com" value="' + esc(this.email) + '" /></div>'
        + '<div class="' + c.error + ' svs-ec-err" role="alert"></div>'
        + '<button type="submit" class="' + c.button + ' svs-ec-primary">' + esc(t('ec_get_code')) + '</button>'
        + '</form>';
    } else if (this.step === 'code') {
      html = '<form class="svs-ec-form" novalidate data-ec="code">'
        + '<p class="svs-ec-sent">' + t('ec_sent_to', { email: '<strong>' + esc(s.email) + '</strong>' }) + '</p>'
        + '<div class="' + c.field + '"><label class="' + c.label + '" for="' + id + 'Code">' + esc(t('ec_code_label')) + '</label>'
        + '<input class="' + c.input + ' svs-ec-code" id="' + id + 'Code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="12" required placeholder="••••••" aria-describedby="' + id + 'Spam" /></div>'
        + '<div class="' + c.error + ' svs-ec-err" role="alert"></div>'
        + '<button type="submit" class="' + c.button + ' svs-ec-primary">' + esc(t('ec_sign_in')) + '</button>'
        + '<div class="svs-ec-row">'
        + '<button type="button" class="svs-ec-link svs-ec-resend" data-ec-act="resend" disabled></button>'
        + '<button type="button" class="svs-ec-link" data-ec-act="change">' + esc(t('ec_change_email')) + '</button>'
        + '</div>'
        + '<p class="svs-ec-note" id="' + id + 'Spam">' + esc(t('ec_spam')) + '</p>'
        + '</form>';
    } else if (this.step === 'profile') {
      html = '<form class="svs-ec-form" novalidate data-ec="profile">'
        + '<p class="svs-ec-welcome">' + esc(t('ec_profile_title')) + '</p>'
        + '<p class="svs-ec-hint">' + esc(t('ec_profile_sub')) + '</p>'
        + '<div class="' + c.field + '"><label class="' + c.label + '" for="' + id + 'Name">' + esc(t('ec_name')) + '</label>'
        + '<input class="' + c.input + '" id="' + id + 'Name" type="text" autocomplete="name" required maxlength="100" /></div>'
        + '<div class="' + c.field + '"><label class="' + c.label + '" for="' + id + 'Phone">' + esc(t('ec_phone')) + '</label>'
        + '<input class="' + c.input + '" id="' + id + 'Phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+357 ..." maxlength="32" /></div>'
        + '<div class="svs-ec-consent">'
        + '<label class="svs-ec-check"><input type="checkbox" id="' + id + 'Terms" /> <span>' + t('consent_terms') + '</span></label>'
        + '<label class="svs-ec-check"><input type="checkbox" id="' + id + 'News" /> <span>' + esc(t('consent_newsletter')) + '</span></label>'
        + '</div>'
        + '<div class="' + c.error + ' svs-ec-err" role="alert"></div>'
        + '<button type="submit" class="' + c.button + ' svs-ec-primary">' + esc(t('ec_continue')) + '</button>'
        + '<div class="svs-ec-row"><button type="button" class="svs-ec-link" data-ec-act="change">' + esc(t('ec_change_email')) + '</button></div>'
        + '</form>';
    } else {
      html = '<form class="svs-ec-form" novalidate data-ec="forgot">'
        + '<p class="svs-ec-welcome">' + esc(t('bm_forgot_title')) + '</p>'
        + '<p class="svs-ec-hint">' + esc(t('bm_forgot_info')) + '</p>'
        + '<div class="' + c.field + '"><label class="' + c.label + '" for="' + id + 'FEmail">' + esc(t('ec_email_label')) + '</label>'
        + '<input class="' + c.input + '" id="' + id + 'FEmail" type="email" autocomplete="email" required placeholder="your@email.com" value="' + esc(this.email) + '" /></div>'
        + '<div class="' + c.error + ' svs-ec-err" role="status"></div>'
        + '<button type="submit" class="' + c.button + ' svs-ec-primary">' + esc(t('bm_forgot_btn')) + '</button>'
        + '<div class="svs-ec-row"><button type="button" class="svs-ec-link" data-ec-act="back">' + esc(t('ec_back_to_code')) + '</button></div>'
        + '</form>';
    }
    this.host.innerHTML = html;
    this.host.hidden = mode !== 'code' && this.step !== 'forgot';
    this.bind();
    this.renderFooter();
    // Tell the page what is on screen: 'code' | 'password' | 'forgot' | 'profile'
    // (for 'forgot' and 'profile' the page hides Google and the «or» line too).
    var view = this.step === 'forgot' ? 'forgot' : (this.step === 'profile' && mode === 'code') ? 'profile' : mode;
    if (view !== this.view) { this.view = view; if (this.opts.onModeChange) this.opts.onModeChange(view); }
    if (this.step === 'code') this.tickResend();
    if (focusId) { var f = document.getElementById(id + focusId); if (f) try { f.focus({ preventScroll: true }); } catch (_) { f.focus(); } }
  };

  Widget.prototype.renderFooter = function () {
    var f = this.opts.footer;
    if (!f) return;
    if (this.step === 'forgot' || (this.step === 'profile' && mode === 'code')) { f.innerHTML = ''; return; }
    f.innerHTML = mode === 'code'
      ? '<button type="button" class="svs-ec-link svs-ec-small" data-ec-act="password">' + esc(t('ec_password_link')) + '</button>'
        + '<span class="svs-ec-dot" aria-hidden="true">·</span>'
        + '<button type="button" class="svs-ec-link svs-ec-small" data-ec-act="forgot">' + esc(t('bm_forgot')) + '</button>'
      : '<button type="button" class="svs-ec-link svs-ec-small" data-ec-act="codemode">' + esc(t('ec_back_to_code')) + '</button>';
    var self = this;
    f.querySelectorAll('[data-ec-act]').forEach(function (b) { b.onclick = function () { self.act(b.getAttribute('data-ec-act')); }; });
  };

  Widget.prototype.bind = function () {
    var self = this, form = this.host.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); self.submit(form.getAttribute('data-ec')); });
    form.addEventListener('input', function (e) { if (!e.target.classList.contains('svs-ec-code')) self.setErr(''); });
    form.addEventListener('change', function (e) { if (e.target.type === 'checkbox') self.setErr(''); });
    form.querySelectorAll('[data-ec-act]').forEach(function (b) { b.onclick = function () { self.act(b.getAttribute('data-ec-act')); }; });
    var code = form.querySelector('.svs-ec-code');
    if (code) {
      // Paste «123 456» / «Code: 123456» from the email or the SMS-style keyboard suggestion.
      code.addEventListener('paste', function (e) {
        var txt = (e.clipboardData || window.clipboardData);
        txt = txt ? txt.getData('text') : '';
        var d = (String(txt).match(/\d{6}/) || [digits(txt)])[0].slice(0, 6);
        if (d) { e.preventDefault(); code.value = d; if (d.length === 6) self.submit('code'); }
      });
      code.addEventListener('input', function () {
        var d = digits(code.value).slice(0, 6);
        if (code.value !== d) code.value = d;
        if (d.length === 6 && !self.busy) self.submit('code');
      });
    }
  };

  Widget.prototype.setErr = function (msg, ok) {
    var el = this.host.querySelector('.svs-ec-err');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('svs-ec-ok', !!ok && !!msg);
    if (this.cls.error === 'auth-error' || this.cls.error === 'acc-msg-error') el.classList.toggle('visible', !!msg);
  };
  Widget.prototype.setBusy = function (on, label) {
    this.busy = on;
    var b = this.host.querySelector('.svs-ec-primary');
    if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = '…'; b.disabled = true; }
    else { b.textContent = label || b.dataset.label || b.textContent; b.disabled = false; }
  };

  Widget.prototype.tickResend = function () {
    var self = this;
    clearInterval(this.timer);
    var draw = function () {
      var s = self.state(), b = self.host.querySelector('.svs-ec-resend');
      if (!s || !b) { clearInterval(self.timer); return; }
      var left = Math.ceil((s.sentAt + RESEND_S * 1000 - Date.now()) / 1000);
      if (left > 0) { b.disabled = true; b.textContent = t('ec_resend_in', { s: left }); }
      else { b.disabled = false; b.textContent = t('ec_resend'); clearInterval(self.timer); }
    };
    draw();
    this.timer = setInterval(draw, 1000);
  };

  Widget.prototype.act = function (a) {
    if (a === 'change') { save(null); this.step = 'email'; renderAll('Email'); return; }
    if (a === 'resend') { var s = this.state(); if (s) this.send(s.email, true); return; }
    if (a === 'password') { setMode('password'); return; }
    if (a === 'codemode') { setMode('code'); return; }
    if (a === 'forgot') {
      var s2 = this.state(); var em = this.host.querySelector('.svs-ec-email');
      this.email = (em && em.value.trim()) || (s2 && s2.email) || this.email;
      this.step = 'forgot'; this.render('FEmail'); return;
    }
    if (a === 'back') { this.step = 'email'; this.render(); return; }
  };

  Widget.prototype.send = async function (email, resend) {
    this.setErr('');
    if (!validEmail(email)) { this.setErr(t('ec_err_email')); return; }
    this.setBusy(true);
    try {
      var d = await post('/api/auth/email-code/start', { email: email, lang: lang() });
      save({ email: email, challenge: d.challenge, sentAt: Date.now(), until: Date.now() + (d.expires_in || 600) * 1000 });
      this.email = email;
      this.step = 'code';
      this.busy = false;
      renderAll('Code');
      if (resend) this.setErr(t('ec_resent'), true);
    } catch (err) {
      this.setBusy(false);
      if (err.data && err.data.code === 'wait' && resend) { var s = this.state(); if (s) { s.sentAt = Date.now() - (RESEND_S - (err.data.retry_after || RESEND_S)) * 1000; save(s); this.tickResend(); } }
      this.setErr(errText(err));
    }
  };

  Widget.prototype.submit = async function (step) {
    if (this.busy) return;
    var self = this, id = this.uid;
    if (step === 'email') {
      var em = (this.host.querySelector('.svs-ec-email') || {}).value || '';
      return this.send(em.trim());
    }
    if (step === 'code') {
      var s = this.state();
      if (!s) { this.step = 'email'; return renderAll('Email'); }
      var code = digits((this.host.querySelector('.svs-ec-code') || {}).value).slice(0, 6);
      if (code.length !== 6) { this.setErr(t('ec_err_code')); return; }
      this.setErr(''); this.setBusy(true);
      try {
        var d = await post('/api/auth/email-code/verify', { email: s.email, code: code, challenge: s.challenge });
        if (d.needs_profile) {
          save({ email: s.email, profile: d.profile_token, sentAt: s.sentAt, until: Date.now() + (d.expires_in || 1800) * 1000 });
          this.busy = false; return renderAll('Name');
        }
        save(null); this.busy = false;
        return this.done(d);
      } catch (err) {
        this.setBusy(false);
        var c = err.data && err.data.code;
        var inp = this.host.querySelector('.svs-ec-code');
        if (inp && c === 'wrong') { inp.value = ''; inp.focus(); }
        if (c === 'expired' || c === 'too_many_attempts') {
          // Keep the email, drop the dead challenge: «Отправить ещё раз» becomes the next step.
          var st = this.state(); if (st) { st.dead = true; st.sentAt = 0; save(st); this.tickResend(); }
        }
        this.setErr(errText(err));
      }
      return;
    }
    if (step === 'profile') {
      var s2 = this.state();
      if (!s2 || !s2.profile) { this.step = 'email'; return renderAll('Email'); }
      var name = document.getElementById(id + 'Name').value.trim();
      var phone = document.getElementById(id + 'Phone').value.trim();
      var terms = document.getElementById(id + 'Terms').checked;
      var news = document.getElementById(id + 'News').checked;
      if (name.length < 2) return this.setErr(t('ec_err_name'));
      if (digits(phone).length < 8) return this.setErr(t('ec_err_phone'));
      if (!terms) return this.setErr(t('err_terms_required'));
      this.setErr(''); this.setBusy(true);
      try {
        var r = await post('/api/auth/email-code/complete', {
          profile_token: s2.profile, name: name, phone: phone, terms_accepted: true, newsletter_consent: news,
          consent_timestamp: new Date().toISOString(), consent_version: (window.SVS_LEGAL_VERSION || '2026-05-24'),
          consent_locale: (document.documentElement.lang || 'en')
        });
        save(null); this.busy = false;
        return this.done(r);
      } catch (err) {
        this.setBusy(false);
        if (err.data && err.data.code === 'expired') { save(null); this.step = 'email'; renderAll('Email'); }
        this.setErr(errText(err));
      }
      return;
    }
    if (step === 'forgot') {
      var fe = document.getElementById(id + 'FEmail').value.trim();
      if (!validEmail(fe)) return this.setErr(t('ec_err_email'));
      this.setBusy(true);
      try { await post('/api/auth/forgot-password', { email: fe }); this.setBusy(false); this.setErr(t('bm_forgot_sent'), true); }
      catch (err) { this.setBusy(false); this.setErr(err.network ? t('ec_err_network') : t('bm_forgot_fail')); }
    }
  };

  Widget.prototype.done = function (d) {
    clearInterval(this.timer);
    this.step = 'email'; this.email = '';
    if (this.opts.onSuccess) this.opts.onSuccess(d.token, d.client || {});
    renderAll();
  };

  function renderAll(focus) {
    mounts = mounts.filter(function (w) { return document.body.contains(w.host); });
    mounts.forEach(function (w) { if (w.step !== 'forgot') w.step = 'email'; w.render(isVisible(w.host) ? focus : null); });
  }
  function isVisible(el) { return !!(el && el.offsetParent !== null); }
  function setMode(m) {
    mode = m === 'password' ? 'password' : 'code';
    mounts = mounts.filter(function (w) { return document.body.contains(w.host); });
    mounts.forEach(function (w) {
      if (w.step === 'forgot') w.step = 'email';
      w.render();
    });
  }

  window.SVSEmailLogin = {
    mount: function (host, opts) {
      if (!host) return null;
      var w = new Widget(host, opts);
      mounts.push(w);
      return w;
    },
    mode: function () { return mode; },
    setMode: setMode,
    reset: function () { save(null); renderAll(); },
  };

  window.addEventListener('svs:langchange', function () {
    mounts = mounts.filter(function (w) { return document.body.contains(w.host); });
    mounts.forEach(function (w) {
      // keep what the visitor already typed
      var em = w.host.querySelector('.svs-ec-email'); if (em) w.email = em.value;
      w.render();
    });
  });
})();
