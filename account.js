/**
 * Soul Vibe Space — Account page JS
 * Handles auth (login / register) and client dashboard with bookings history
 */

var API_BASE = window.SVS_API_BASE
  || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://soul-vibe-api.onrender.com');

const TOKEN_KEY = 'svs_token';

// ── Storage ────────────────────────────────────────────────────────────────────
let _memToken = null;
const _store = (function() {
  try {
    var s = window['local' + 'Storage'];
    s.setItem('_svs_t','1'); s.removeItem('_svs_t');
    return s;
  } catch(e) { return null; }
})();

function getToken() { return _store ? _store.getItem(TOKEN_KEY) : _memToken; }
function saveToken(t) { _memToken = t; if (_store) _store.setItem(TOKEN_KEY, t); }
function clearToken() { _memToken = null; if (_store) _store.removeItem(TOKEN_KEY); }

function parseJWT(token) {
  // JWT payload is base64url-encoded UTF-8 (names may be Cyrillic/Greek).
  try { return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''))); } catch { return null; }
}
function isTokenValid(token) {
  if (!token) return false;
  const p = parseJWT(token);
  return p && p.exp * 1000 > Date.now();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res  = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('authError');
  const ok = document.getElementById('authSuccess');
  el.textContent = msg; el.classList.toggle('visible', !!msg);
  ok.classList.remove('visible');
}
function showSuccess(msg) {
  const el = document.getElementById('authSuccess');
  const err = document.getElementById('authError');
  el.textContent = msg; el.classList.toggle('visible', !!msg);
  err.classList.remove('visible');
}
function clearMessages() {
  document.getElementById('authError').classList.remove('visible');
  document.getElementById('authSuccess').classList.remove('visible');
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = '<span class="acc-spinner"></span>';
  } else {
    // Restore label from data-label-key (live translation for current language)
    // first, falling back to the data-label captured at page load only when no
    // i18n key exists or the translator isn't ready yet.
    const live = btn.dataset.labelKey && window.SVS_I18N && window.SVS_I18N.t
      ? window.SVS_I18N.t(btn.dataset.labelKey) : '';
    const label = live || btn.dataset.label || btn.dataset.labelKey || 'Submit';
    btn.textContent = label;
  }
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
function t(key, fallback) {
  return (window.SVS_I18N && window.SVS_I18N.t) ? (window.SVS_I18N.t(key) || fallback) : fallback;
}

// ── Field-level validation helpers ──────────────────────────────────────────────
function setFieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(inputId + 'Err');
  if (input) input.classList.add('invalid');
  if (err) { err.textContent = msg; err.classList.add('visible'); }
}
function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(inputId + 'Err');
  if (input) input.classList.remove('invalid');
  if (err) { err.textContent = ''; err.classList.remove('visible'); }
}
function clearAllFieldErrors() {
  document.querySelectorAll('.acc-field-error').forEach(el => { el.textContent = ''; el.classList.remove('visible'); });
  document.querySelectorAll('.acc-input.invalid').forEach(el => el.classList.remove('invalid'));
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
function isValidPhone(phone) {
  return String(phone || '').replace(/\D/g, '').length >= 8;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  clearMessages();
  clearAllFieldErrors();
  hideForgotPassword();
  const lf  = document.getElementById('loginForm');
  const rf  = document.getElementById('registerForm');
  const lbt = document.getElementById('loginTabBtn');
  const rbt = document.getElementById('registerTabBtn');
  const titleEl = document.getElementById('accAuthTitle');
  const subEl   = document.getElementById('accAuthSub');
  if (tab === 'login') {
    lf.style.display = 'flex'; rf.style.display = 'none';
    lbt.classList.add('active');    rbt.classList.remove('active');
    lbt.setAttribute('aria-selected','true'); rbt.setAttribute('aria-selected','false');
    if (titleEl) { titleEl.setAttribute('data-i18n', 'acc_login_title'); titleEl.textContent = t('acc_login_title', 'Welcome back'); }
    if (subEl)   { subEl.setAttribute('data-i18n', 'acc_login_sub'); subEl.textContent = t('acc_login_sub', 'Sign in to your Soul Vibe Space account'); }
  } else {
    lf.style.display = 'none'; rf.style.display = 'flex';
    rbt.classList.add('active');    lbt.classList.remove('active');
    rbt.setAttribute('aria-selected','true'); lbt.setAttribute('aria-selected','false');
    if (titleEl) { titleEl.setAttribute('data-i18n', 'acc_reg_title'); titleEl.textContent = t('acc_reg_title', 'Join Soul Vibe Space'); }
    if (subEl)   { subEl.setAttribute('data-i18n', 'acc_reg_sub'); subEl.textContent = t('acc_reg_sub', 'Create your account to manage bookings'); }
  }
}

// ── Forgot password ──────────────────────────────────────────────────────────
function showForgotPassword() {
  clearMessages();
  clearAllFieldErrors();
  const lf   = document.getElementById('loginForm');
  const fpf  = document.getElementById('forgotPasswordForm');
  const tabs = document.querySelector('.acc-tabs');
  const gwrap = document.querySelector('.acc-google-wrap');
  if (lf)    lf.style.display = 'none';
  if (fpf)   fpf.style.display = 'flex';
  if (tabs)  tabs.style.display = 'none';
  if (gwrap) gwrap.style.display = 'none';
  const titleEl = document.getElementById('accAuthTitle');
  const subEl   = document.getElementById('accAuthSub');
  if (titleEl) { titleEl.removeAttribute('data-i18n'); titleEl.textContent = t('acc_forgot_title', 'Reset your password'); }
  if (subEl)   { subEl.removeAttribute('data-i18n'); subEl.textContent = t('acc_forgot_sub', "Enter your email and we'll send you a link to reset your password"); }
  const fe = document.getElementById('forgotEmail');
  const le = document.getElementById('loginEmail');
  if (fe && le && le.value) fe.value = le.value;
}
function hideForgotPassword() {
  const fpf   = document.getElementById('forgotPasswordForm');
  const tabs  = document.querySelector('.acc-tabs');
  const gwrap = document.querySelector('.acc-google-wrap');
  if (fpf && fpf.style.display !== 'none') fpf.style.display = 'none';
  if (tabs)  tabs.style.display = '';
  if (gwrap) gwrap.style.display = '';
}
function backToLogin() {
  clearMessages();
  clearAllFieldErrors();
  hideForgotPassword();
  const lf = document.getElementById('loginForm');
  if (lf) lf.style.display = 'flex';
  const titleEl = document.getElementById('accAuthTitle');
  const subEl   = document.getElementById('accAuthSub');
  if (titleEl) { titleEl.setAttribute('data-i18n', 'acc_login_title'); titleEl.textContent = t('acc_login_title', 'Welcome back'); }
  if (subEl)   { subEl.setAttribute('data-i18n', 'acc_login_sub'); subEl.textContent = t('acc_login_sub', 'Sign in to your Soul Vibe Space account'); }
}

// ── Password visibility ────────────────────────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  btn.innerHTML = hidden
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ── Auth: Login ────────────────────────────────────────────────────────────────
// Store fallback label so setLoading can restore it
(function() {
  var lb = document.getElementById('loginBtn');
  if (lb) lb.dataset.label = lb.textContent.trim();
  var rb = document.getElementById('registerBtn');
  if (rb) rb.dataset.label = rb.textContent.trim();
  var fb = document.getElementById('forgotBtn');
  if (fb) fb.dataset.label = fb.textContent.trim();
})();
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); clearMessages(); clearAllFieldErrors();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let hasError = false;
  if (!email) { setFieldError('loginEmail', t('err_required', 'This field is required.')); hasError = true; }
  else if (!isValidEmail(email)) { setFieldError('loginEmail', t('err_invalid_email', 'Please enter a valid email address.')); hasError = true; }
  if (!password) { setFieldError('loginPassword', t('err_required', 'This field is required.')); hasError = true; }
  if (hasError) return;
  setLoading('loginBtn', true);
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    saveToken(data.token);
    showDashboard(data.client);
  } catch (err) {
    showError(err.message || 'Incorrect email or password.');
  } finally { setLoading('loginBtn', false); }
});

// ── Auth: Forgot password ────────────────────────────────────────────────────
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault(); clearMessages(); clearAllFieldErrors();
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) { setFieldError('forgotEmail', t('err_required', 'This field is required.')); return; }
  if (!isValidEmail(email)) { setFieldError('forgotEmail', t('err_invalid_email', 'Please enter a valid email address.')); return; }
  setLoading('forgotBtn', true);
  try {
    await apiFetch('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email })
    });
  } catch (err) {
    // Backend responds ok:true regardless of whether the email exists, to avoid
    // leaking account existence. Network/unexpected errors still fall through here
    // but we intentionally show the same generic success message.
  } finally {
    setLoading('forgotBtn', false);
    showSuccess(t('acc_forgot_success', "If an account exists for that email, we've sent password reset instructions."));
  }
});

// ── Auth: Register ─────────────────────────────────────────────────────────────
// registerBtn label stored above
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault(); clearMessages(); clearAllFieldErrors();
  const name               = document.getElementById('regName').value.trim();
  const email              = document.getElementById('regEmail').value.trim();
  const phone              = document.getElementById('regPhone').value.trim();
  const password           = document.getElementById('regPassword').value;
  const passwordConfirm    = document.getElementById('regPasswordConfirm').value;
  const termsEl            = document.getElementById('regTerms');
  const newsletterEl       = document.getElementById('regNewsletter');
  const newsletter_consent = newsletterEl ? newsletterEl.checked : false;

  let hasError = false;
  if (!name) { setFieldError('regName', t('err_required', 'This field is required.')); hasError = true; }
  if (!email) { setFieldError('regEmail', t('err_required', 'This field is required.')); hasError = true; }
  else if (!isValidEmail(email)) { setFieldError('regEmail', t('err_invalid_email', 'Please enter a valid email address.')); hasError = true; }
  if (!phone) { setFieldError('regPhone', t('err_required', 'This field is required.')); hasError = true; }
  else if (!isValidPhone(phone)) { setFieldError('regPhone', t('err_invalid_phone', 'Please enter a valid phone number.')); hasError = true; }
  if (!password) { setFieldError('regPassword', t('err_required', 'This field is required.')); hasError = true; }
  else if (password.length < 6) { setFieldError('regPassword', t('err_password_length', 'Password must be at least 6 characters.')); hasError = true; }
  if (!passwordConfirm) { setFieldError('regPasswordConfirm', t('err_required', 'This field is required.')); hasError = true; }
  else if (password !== passwordConfirm) { setFieldError('regPasswordConfirm', t('err_password_mismatch', 'Passwords do not match.')); hasError = true; }
  if (termsEl && !termsEl.checked) { showError(t('err_terms_required', 'Please agree to the Terms & Conditions and Privacy Policy to continue.')); hasError = true; }
  if (hasError) return;

  setLoading('registerBtn', true);
  const consent_timestamp = new Date().toISOString();
  const consent_version   = (window.SVS_LEGAL_VERSION || '2026-05-24');
  const consent_locale    = (document.documentElement.lang || 'en');
  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST', body: JSON.stringify({
        name, email, phone, password,
        terms_accepted: true,
        newsletter_consent,
        consent_timestamp,
        consent_version,
        consent_locale
      })
    });
    saveToken(data.token);
    showSuccess(t('acc_register_success', 'Account created! Welcome to Soul Vibe Space.'));
    setTimeout(() => showDashboard(data.client), 800);
  } catch (err) {
    showError(window.SVS_REG ? SVS_REG.serverError(err.data, !err.status) : (err.message || 'Registration failed. Please try again.'));
  } finally { setLoading('registerBtn', false); }
});

// ── Dashboard ──────────────────────────────────────────────────────────────────
function showDashboard(client) {
  // Hide auth, show dashboard
  const authEl = document.getElementById('accAuth');
  const dashEl = document.getElementById('accDashboard');
  if (authEl) authEl.style.display = 'none';
  if (dashEl) dashEl.classList.add('visible');

  // Widen the right panel for dashboard
  const rightEl = document.getElementById('accRight');
  if (rightEl) rightEl.style.alignItems = 'flex-start';

  const firstName = (client.name || '').split(' ')[0];
  const fullName  = client.name || firstName;

  // Avatar initials
  const avatarEl = document.getElementById('dashAvatar');
  if (avatarEl) avatarEl.textContent = firstName.charAt(0).toUpperCase();

  const nameEl = document.getElementById('dashName');
  if (nameEl) nameEl.textContent = fullName;

  const emailEl = document.getElementById('dashEmail');
  if (emailEl) emailEl.textContent = client.email || '';

  updateHeaderBtn(firstName);
  loadVibes();
  if (typeof loadBirthday === 'function') loadBirthday(); // account-birthday.js
  loadBookings(true);
  // /account#bookings (link «Мои записи» from the booking window) → scroll to the list
  if (location.hash === '#bookings') setTimeout(function () { var el = document.getElementById('bookings'); if (el) el.scrollIntoView({ block: 'start' }); }, 300);
}

// ── VIBES (loyalty programme) ────────────────────────────────────────────────
// Read-only view of the client's VIBES, served by soul-vibe-api → VIBES panel.
// 1 regular class = 20 VIBES. Refreshes every 30 s while the tab is visible.
var VIBES_PER_CLASS = 20;
// i18n lookup that falls back when the key is missing (SVS_I18N.t returns the key itself).
function vt(key, fb) { var v = t(key, fb); return (v && v !== key) ? v : fb; }
var _vibesData = null, _vibesTimer = null, _vibesShowAll = false;

function vibesLocale() {
  var l = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
  return l === 'ru' ? 'ru-RU' : l === 'el' ? 'el-GR' : 'en-GB';
}
function vibesDate(iso, withTime) {
  if (!iso) return '';
  var d = new Date(iso.length === 16 ? iso + ':00' : iso);
  if (isNaN(d)) return '';
  var o = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Nicosia' };
  if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleString(vibesLocale(), o);
}
// Class Pass / Starter Pack code (MP4, SP2 …) is the part of the panel label before " · ".
// Product names come from the terms dictionary (SVS_TERMS in i18n.js): {{pass_line}} / {{starter_line}}.
function vibesLotName(lot) {
  var code = String(lot.source_label || '').split(' · ')[0].trim();
  if (lot.source_type === 'membership' || lot.source_type === 'starter_pack') {
    var key = lot.source_type === 'membership' ? 'vibes_multipass' : 'vibes_starter';
    return vt(key, lot.source_type === 'membership' ? 'Class Pass' : 'Starter Pack') + (code ? ' ' + code : '');
  }
  return vt('vibes_src_' + lot.source_type, vt('vibes_src_bonus', 'Bonus VIBES'));
}
function vibesTxName(tx) {
  var c = tx.category === 'reward_birthday' ? 'birthday' : tx.category;
  if (tx.direction === 'debit') {
    if (c === 'expiry') return vt('vibes_tx_expiry', 'Expired');
    if (c === 'refund') return vt('vibes_tx_refund', 'Refund');
    return vt('vibes_tx_visit', 'Class visit');
  }
  if (c === 'membership' || c === 'starter_pack') return vibesLotName({ source_type: c, source_label: tx.source_label });
  if (c === 'deposit') return vt('vibes_tx_deposit', 'Top-up');
  return vt('vibes_src_' + c, vt('vibes_src_bonus', 'Bonus VIBES'));
}

// «≈ 1 занятие / 2 занятия / 5 занятий» — plural form for the page language (Intl.PluralRules).
function vibesClassesLeft(n) {
  var lang = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
  var form = 'other';
  try { form = new Intl.PluralRules(lang === 'ru' ? 'ru-RU' : lang === 'el' ? 'el-GR' : 'en-GB').select(n); } catch (_) {}
  var key = 'vibes_classes_left_' + form;
  var s = vt(key, '');
  if (!s || s === key) s = vt('vibes_classes_left_other', '') || vt('vibes_classes_left', '≈ {n} classes');
  return s.replace('{n}', n);
}

async function loadVibes(silent) {
  var section = document.getElementById('vibesSection');
  var box = document.getElementById('vibesContainer');
  if (!section || !box) return;
  try {
    var data = await apiFetch('/api/me/vibes');
    _vibesData = data;
    if (data && data.linked) await loadFreezeRequests(); else _fzReqs = null;
    section.hidden = false;
    renderVibes();
  } catch (err) {
    // 503 = programme not switched on yet → keep the section hidden.
    if (err.status === 503 && !_vibesData) { section.hidden = true; return; }
    if (!silent || !_vibesData) {
      section.hidden = false;
      box.innerHTML = '<p class="vibes-note">' + escHtml(vt('vibes_unavailable', 'VIBES are temporarily unavailable. Please try again later.')) + '</p>';
    }
  }
  if (!_vibesTimer) {
    _vibesTimer = setInterval(function () { if (document.visibilityState === 'visible' && isTokenValid(getToken())) loadVibes(true); }, 30000);
  }
}

function renderVibes() {
  var box = document.getElementById('vibesContainer');
  var d = _vibesData;
  if (!box || !d) return;
  // The VIBES block is for clients who have (or had) a Class Pass / Starter Pack, or still hold VIBES.
  // Everyone else sees only a link to the Class Passes — no VIBES wording at all.
  var head = document.querySelector('#vibesSection .dash-section-head');
  var hasVibes = d.linked && (Number(d.balance_vibes || 0) > 0 || (window.SVSPayPlan ? SVSPayPlan.hadPass(d)
    : (d.lots || []).some(function (l) { return l.source_type === 'membership' || l.source_type === 'starter_pack'; })));
  var pending = !d.linked && (d.reason === 'verify_email' || d.reason === 'ambiguous');
  if (!hasVibes && !pending) {
    if (head) head.style.display = 'none';
    box.classList.add('vibes-card--none');
    box.innerHTML = '<p class="vibes-note">' + escHtml(vt('vibes_none_lead', 'Classes are cheaper with a Class Pass.')) + '</p>'
      + '<a class="vibes-cta" href="/pricing">' + escHtml(vt('vibes_see_passes', 'See Class Passes')) + ' →</a>';
    return;
  }
  if (head) head.style.display = '';
  box.classList.remove('vibes-card--none');
  if (!d.linked) {
    var key = d.reason === 'verify_email' ? 'vibes_verify_email' : d.reason === 'ambiguous' ? 'vibes_ambiguous' : 'vibes_not_found';
    var fb = d.reason === 'verify_email' ? 'To see your VIBES, sign in with Google using the email you gave the studio.'
      : d.reason === 'ambiguous' ? 'We found more than one studio card with your email. Please contact the studio so we can link the right one.'
      : 'You have no VIBES yet. Buy a Class Pass at the studio — your balance will appear here.';
    if (d.reason === 'verify_email') { renderVibesVerify(); return; }
    box.innerHTML = '<p class="vibes-note">' + escHtml(t(key, fb)) + '</p>';
    return;
  }
  var bal = Number(d.balance_vibes || 0);
  var classes = Math.floor(bal / VIBES_PER_CLASS);
  var h = '<div class="vibes-balance"><span class="vibes-balance-num">' + bal + '</span><span class="vibes-balance-unit">VIBES</span>'
        + '<span class="vibes-balance-hint">' + escHtml(vibesClassesLeft(classes)) + ' · ' + escHtml(vt('vibes_rate', '1 class = 20 VIBES')) + '</span></div>';

  var active = (d.lots || []).filter(function (l) { return l.status === 'active' && l.remaining_vibes > 0; });
  // Bonus VIBES (e.g. a birthday gift) are not a Class Pass: neutral heading when there are any.
  var anyBonus = active.some(function (l) { return l.source_type !== 'membership' && l.source_type !== 'starter_pack'; });
  h += '<p class="vibes-sub">' + escHtml(anyBonus ? vt('vibes_active_mixed', 'Active VIBES') : vt('vibes_active', 'Active Class Passes and Starter Packs')) + '</p>';
  if (!active.length) h += '<p class="vibes-note">' + escHtml(vt('vibes_no_active', 'No active Class Pass or Starter Pack.')) + '</p>';
  else {
    h += '<ul class="vibes-list">' + active.map(function (l) {
      var meta = l.expires_at ? vt('vibes_until', 'valid until {d}').replace('{d}', vibesDate(l.expires_at)) : vt('vibes_no_expiry', 'no expiry date');
      return '<li class="vibes-row"><span class="vibes-row-main"><span class="vibes-row-title">' + escHtml(vibesLotName(l)) + '</span><span class="vibes-row-meta">' + escHtml(meta) + '</span></span>'
           + '<span class="vibes-row-amount">' + l.remaining_vibes + ' / ' + l.granted_vibes + '</span></li>';
    }).join('') + '</ul>';
  }

  var fr = (d.freezes || []).filter(function (f) { return f.status === 'active' || f.status === 'scheduled'; });
  if (fr.length) {
    h += '<p class="vibes-sub">' + escHtml(vt('vibes_freezes', 'Freeze')) + '</p><ul class="vibes-list">' + fr.map(function (f) {
      return '<li class="vibes-row"><span class="vibes-row-main"><span class="vibes-row-title">' + escHtml(vibesDate(f.start_date) + ' – ' + vibesDate(f.end_date)) + '</span><span class="vibes-row-meta">'
           + escHtml(f.status === 'active' ? vt('vibes_freeze_active', 'active now') : vt('vibes_freeze_scheduled', 'scheduled')) + '</span></span><span class="vibes-row-amount">' + f.days + ' ' + escHtml(vt('vibes_days', 'days')) + '</span></li>';
    }).join('') + '</ul>';
  }

  h += renderFreezeBlock(d);

  var tx = d.transactions || [];
  var lim = _vibesShowAll ? tx.length : 5;
  h += '<p class="vibes-sub">' + escHtml(vt('vibes_history', 'History')) + '</p>';
  if (!tx.length) h += '<p class="vibes-note">' + escHtml(vt('vibes_no_history', 'No operations yet.')) + '</p>';
  else {
    h += '<ul class="vibes-list">' + tx.slice(0, lim).map(function (x) {
      var plus = x.direction === 'credit';
      return '<li class="vibes-row"><span class="vibes-row-main"><span class="vibes-row-title">' + escHtml(vibesTxName(x)) + '</span><span class="vibes-row-meta">' + escHtml(vibesDate(x.created_at, true)) + '</span></span>'
           + '<span class="vibes-row-amount' + (plus ? ' plus' : '') + '">' + (plus ? '+' : '−') + x.amount_vibes + '</span></li>';
    }).join('') + '</ul>';
    if (tx.length > 5) h += '<button type="button" class="vibes-more" onclick="_vibesShowAll=!_vibesShowAll;renderVibes()">' + escHtml(_vibesShowAll ? vt('vibes_show_less', 'Show less') : vt('vibes_show_all', 'Show all')) + '</button>';
  }

  var visits = (d.visits || []).filter(function (v) { return v.status === 'attended'; }).slice(0, 5);
  if (visits.length) {
    var ru = window.SVS_I18N && window.SVS_I18N.getLang() === 'ru';
    h += '<p class="vibes-sub">' + escHtml(vt('vibes_visits', 'Recent visits')) + '</p><ul class="vibes-list">' + visits.map(function (v) {
      var title = (ru ? v.title_ru : v.title_en) || v.title_en || v.title_ru || vt('vibes_tx_visit', 'Class visit');
      var meta = [vibesDate(v.starts_local, true), v.instructor_name].filter(Boolean).join(' · ');
      return '<li class="vibes-row"><span class="vibes-row-main"><span class="vibes-row-title">' + escHtml(title) + '</span><span class="vibes-row-meta">' + escHtml(meta) + '</span></span></li>';
    }).join('') + '</ul>';
  }
  box.innerHTML = h;
}
// ── Freeze request (заявление на заморозку) ──────────────────────────────────
// A linked client with an active Class Pass can ask the studio to freeze it.
// Requests live in the VIBES panel; an administrator approves or rejects them.
// Only one request can be pending at a time. If the API does not offer the
// endpoint yet, the block simply stays hidden.
var FZ_MAX_DAYS = 90, FZ_MAX_LEAD_DAYS = 60, FZ_COMMENT_MAX = 500;
var _fzReqs = null, _fzNotice = '';
var _fz = { open: false, start: '', end: '', preset: 7, reason: '', comment: '', busy: false, err: '', trigger: null };

async function loadFreezeRequests() {
  try {
    var d = await apiFetch('/api/me/vibes/freeze-requests');
    _fzReqs = d && d.linked ? (d.requests || []) : null;
  } catch (e) { _fzReqs = null; }
}
function fzToday() {
  // Studio date (Asia/Nicosia) as YYYY-MM-DD.
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Nicosia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function fzAdd(ymd, n) { var d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fzDays(a, b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return 0;
  var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z');
  return isFinite(x) && isFinite(y) && y >= x ? Math.round((y - x) / 864e5) + 1 : 0;
}
function fzDate(ymd) { return vibesDate(ymd ? ymd + 'T12:00:00Z' : ''); }
function fzReason(r) { return vt('fz_reason_' + r, r === 'illness' ? 'Illness or injury' : r === 'travel' ? 'Travel' : 'Other'); }
function fzCanRequest(d) {
  return (d.lots || []).some(function (l) { return l.status === 'active' && l.remaining_vibes > 0 && l.expires_at; });
}

// Block inside «My VIBES»: latest request card + «Freeze Class Pass» button.
function renderFreezeBlock(d) {
  if (!_fzReqs) return '';
  var pending = _fzReqs.filter(function (r) { return r.status === 'pending'; })[0];
  var latest = _fzReqs[0];
  var recent = latest && (latest.status === 'pending' || (latest.decided_at && Date.now() - Date.parse(latest.decided_at) < 30 * 864e5));
  var canRequest = fzCanRequest(d);
  if (!recent && !canRequest) return '';
  var h = '<p class="vibes-sub">' + escHtml(vt('fz_title', 'Freeze request')) + '</p>';
  if (recent) {
    var st = latest.status;
    var pill = st === 'pending' ? vt('fz_status_pending', 'Under review') : st === 'approved' ? vt('fz_status_approved', 'Approved') : vt('fz_status_rejected', 'Declined');
    var s = st === 'approved' && latest.approved_start_date ? latest.approved_start_date : latest.start_date;
    var e = st === 'approved' && latest.approved_end_date ? latest.approved_end_date : latest.end_date;
    var meta = fzReason(latest.reason) + ' · ' + vt('fz_sent_on', 'sent {d}').replace('{d}', vibesDate(latest.created_at));
    h += '<div class="fz-card fz-' + st + '"><div class="fz-card-top"><span class="fz-card-dates">' + escHtml(fzDate(s) + ' – ' + fzDate(e)) + ' · ' + fzDays(s, e) + ' ' + escHtml(vt('vibes_days', 'days')) + '</span>'
       + '<span class="fz-pill">' + escHtml(pill) + '</span></div>'
       + '<p class="fz-card-meta">' + escHtml(meta) + '</p>';
    if (st === 'approved' && (latest.approved_start_date !== latest.start_date || latest.approved_end_date !== latest.end_date))
      h += '<p class="fz-card-meta">' + escHtml(vt('fz_dates_changed', 'The studio adjusted the dates you asked for ({d}).').replace('{d}', fzDate(latest.start_date) + ' – ' + fzDate(latest.end_date))) + '</p>';
    if (st === 'pending') h += '<p class="fz-card-note">' + escHtml(vt('fz_pending_note', 'We will email you when an administrator reviews it.')) + '</p>';
    if (latest.admin_comment) h += '<p class="fz-card-comment"><span>' + escHtml(vt('fz_admin_comment', 'Comment from the studio')) + ':</span> ' + escHtml(latest.admin_comment) + '</p>';
    h += '</div>';
  }
  if (_fzNotice) h += '<p class="vibes-ev-msg" role="status">' + escHtml(_fzNotice) + '</p>';
  if (!pending && canRequest) h += '<button type="button" class="btn btn-outline btn-sm fz-open" onclick="openFreezeModal(this)">' + escHtml(vt('fz_open', 'Freeze Class Pass')) + '</button>';
  return h;
}

function fzEnsureModal() {
  var m = document.getElementById('fzModal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'fzModal'; m.className = 'fz-modal'; m.hidden = true;
  m.innerHTML = '<div class="fz-backdrop" data-fz-close></div><div class="fz-panel" role="dialog" aria-modal="true" aria-labelledby="fzTitle"><div id="fzBody"></div></div>';
  m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-fz-close')) closeFreezeModal(); });
  m.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeFreezeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = m.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,[tabindex="0"]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.body.appendChild(m);
  return m;
}
function openFreezeModal(trigger) {
  var today = fzToday();
  _fz = { open: true, start: today, end: fzAdd(today, 6), preset: 7, reason: '', comment: '', busy: false, err: '', trigger: trigger || null };
  _fzNotice = '';
  var m = fzEnsureModal(); m.hidden = false; document.body.classList.add('fz-lock');
  renderFreezeModal();
  var first = m.querySelector('.fz-chip'); if (first) first.focus();
}
function closeFreezeModal() {
  var m = document.getElementById('fzModal');
  if (!m || m.hidden || _fz.busy) return;
  m.hidden = true; _fz.open = false; document.body.classList.remove('fz-lock');
  var t = _fz.trigger && document.body.contains(_fz.trigger) ? _fz.trigger : document.querySelector('.fz-open');
  if (t) t.focus();
}
function fzValidate() {
  var today = fzToday(), n = fzDays(_fz.start, _fz.end);
  if (!_fz.start || !_fz.end || !n) return vt('fz_err_dates', 'Check the dates: the end cannot be before the start.');
  if (_fz.start < today) return vt('fz_err_past', 'The freeze cannot start in the past.');
  if (_fz.start > fzAdd(today, FZ_MAX_LEAD_DAYS)) return vt('fz_err_far', 'The start date can be at most {n} days from today.').replace('{n}', FZ_MAX_LEAD_DAYS);
  if (n > FZ_MAX_DAYS) return vt('fz_err_long', 'A freeze can last at most {n} days.').replace('{n}', FZ_MAX_DAYS);
  if (!_fz.reason) return vt('fz_err_reason', 'Choose a reason.');
  return '';
}
function renderFreezeModal() {
  var body = document.getElementById('fzBody');
  if (!body || !_fz.open) return;
  var today = fzToday(), n = fzDays(_fz.start, _fz.end);
  var chips = [7, 14, 30].map(function (k) {
    return '<button type="button" class="fz-chip" aria-pressed="' + (_fz.preset === k) + '" onclick="fzPreset(' + k + ')">' + escHtml(vt('fz_preset_days', '{n} days').replace('{n}', k)) + '</button>';
  }).join('') + '<button type="button" class="fz-chip" aria-pressed="' + (_fz.preset === 0) + '" onclick="fzPreset(0)">' + escHtml(vt('fz_preset_custom', 'Custom dates')) + '</button>';
  var reasons = ['illness', 'travel', 'other'].map(function (r) {
    return '<label class="fz-radio"><input type="radio" name="fzReason" value="' + r + '"' + (_fz.reason === r ? ' checked' : '') + ' onchange="fzSet(\'reason\',this.value)"><span>' + escHtml(fzReason(r)) + '</span></label>';
  }).join('');
  var summary = n ? vt('fz_summary', '{n} days: {from} – {to}').replace('{n}', n).replace('{from}', fzDate(_fz.start)).replace('{to}', fzDate(_fz.end)) : '';
  body.innerHTML =
    '<div class="fz-head"><h2 id="fzTitle" class="fz-title">' + escHtml(vt('fz_modal_title', 'Freeze your Class Pass')) + '</h2>'
    + '<button type="button" class="fz-x" data-fz-close aria-label="' + escHtml(vt('fz_close', 'Close')) + '">&times;</button></div>'
    + '<form class="fz-form" onsubmit="event.preventDefault();submitFreezeRequest()" novalidate>'
    + '<fieldset class="fz-field"><legend>' + escHtml(vt('fz_period', 'Period')) + '</legend><div class="fz-chips">' + chips + '</div>'
    + '<div class="fz-dates"><label>' + escHtml(vt('fz_start', 'Start')) + '<input type="date" id="fzStart" min="' + today + '" max="' + fzAdd(today, FZ_MAX_LEAD_DAYS) + '" value="' + _fz.start + '" onchange="fzSet(\'start\',this.value)" required></label>'
    + '<label>' + escHtml(vt('fz_end', 'End')) + '<input type="date" id="fzEnd" min="' + (_fz.start || today) + '" value="' + _fz.end + '" onchange="fzSet(\'end\',this.value)" required></label></div>'
    + (summary ? '<p class="fz-summary">' + escHtml(summary) + '</p>' : '') + '</fieldset>'
    + '<fieldset class="fz-field"><legend>' + escHtml(vt('fz_reason', 'Reason')) + '</legend><div class="fz-radios">' + reasons + '</div></fieldset>'
    + '<label class="fz-field fz-comment">' + escHtml(vt('fz_comment', 'Comment (optional)')) + '<textarea id="fzComment" rows="3" maxlength="' + FZ_COMMENT_MAX + '" oninput="_fz.comment=this.value" placeholder="' + escHtml(vt('fz_comment_ph', 'Anything the studio should know')) + '">' + escHtml(_fz.comment) + '</textarea></label>'
    + '<ul class="fz-rules"><li>' + escHtml(vt('fz_rule_1', 'Your active Class Passes are extended by the number of freeze days; your VIBES balance does not change.')) + '</li>'
    + '<li>' + escHtml(vt('fz_rule_2', 'The freeze starts today at the earliest and lasts up to {n} days.').replace('{n}', FZ_MAX_DAYS)) + '</li>'
    + '<li>' + escHtml(vt('fz_rule_3', 'An administrator reviews the request and you get the decision by email. Only one request can be under review at a time.')) + '</li></ul>'
    + (_fz.err ? '<p class="vibes-ev-msg err" role="alert">' + escHtml(_fz.err) + '</p>' : '')
    + '<div class="fz-actions"><button type="button" class="btn btn-outline btn-sm" data-fz-close' + (_fz.busy ? ' disabled' : '') + '>' + escHtml(vt('fz_cancel', 'Cancel')) + '</button>'
    + '<button type="submit" class="btn btn-primary btn-sm"' + (_fz.busy ? ' disabled' : '') + '>' + escHtml(_fz.busy ? vt('fz_sending', 'Sending…') : vt('fz_submit', 'Send request')) + '</button></div>'
    + '</form>';
}
function fzKeepFocus(id) { renderFreezeModal(); var el = document.getElementById(id) || document.querySelector(id); if (el) el.focus(); }
function fzPreset(k) {
  _fz.preset = k; _fz.err = '';
  if (k) { if (!_fz.start || _fz.start < fzToday()) _fz.start = fzToday(); _fz.end = fzAdd(_fz.start, k - 1); renderFreezeModal(); var b = document.querySelectorAll('#fzBody .fz-chip')[[7, 14, 30].indexOf(k)]; if (b) b.focus(); }
  else fzKeepFocus('fzStart');
}
function fzSet(field, value) {
  _fz.err = '';
  if (field === 'reason') { _fz.reason = value; fzKeepFocus('#fzBody input[value="' + value + '"]'); return; }
  _fz[field] = value;
  if (field === 'start' && _fz.preset && value) _fz.end = fzAdd(value, _fz.preset - 1);
  else if (field === 'start' && _fz.end && value > _fz.end) _fz.end = value;
  if (field === 'end') _fz.preset = [7, 14, 30].filter(function (k) { return fzDays(_fz.start, value) === k; })[0] || 0;
  fzKeepFocus(field === 'start' ? 'fzStart' : 'fzEnd');
}
async function submitFreezeRequest() {
  var c = document.getElementById('fzComment'); if (c) _fz.comment = c.value;
  var err = fzValidate();
  if (err) { _fz.err = err; renderFreezeModal(); return; }
  _fz.busy = true; _fz.err = ''; renderFreezeModal();
  try {
    var lang = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
    var r = await apiFetch('/api/me/vibes/freeze-requests', { method: 'POST', body: JSON.stringify({ start_date: _fz.start, end_date: _fz.end, reason: _fz.reason, comment: _fz.comment.trim(), lang: lang }) });
    _fz.busy = false;
    if (r && r.request) _fzReqs = [r.request].concat(_fzReqs || []);
    closeFreezeModal();
    _fzNotice = vt('fz_sent', 'Request sent. We have emailed you a confirmation.');
    renderVibes();
    loadFreezeRequests().then(renderVibes);
    var o = document.querySelector('#vibesContainer .fz-card'); if (o) o.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) {
    _fz.busy = false;
    var code = e.data && e.data.code;
    _fz.err = code === 'pending_exists' ? vt('fz_err_pending', 'You already have a request under review.')
      : code === 'start_in_past' ? vt('fz_err_past', 'The freeze cannot start in the past.')
      : code === 'too_long' ? vt('fz_err_long', 'A freeze can last at most {n} days.').replace('{n}', FZ_MAX_DAYS)
      : code === 'start_too_far' ? vt('fz_err_far', 'The start date can be at most {n} days from today.').replace('{n}', FZ_MAX_LEAD_DAYS)
      : code === 'invalid_dates' ? vt('fz_err_dates', 'Check the dates: the end cannot be before the start.')
      : vt('fz_err_generic', 'Could not send the request. Please try again later.');
    renderFreezeModal();
    if (code === 'pending_exists') { loadFreezeRequests().then(renderVibes); }
  }
}
window.addEventListener('svs:langchange', function () { renderFreezeModal(); });

// ── Email confirmation by code (password sign-in) ─────────────────────────────
var _ev = { sent: false, wait: 0, timer: null, msg: '', err: false, busy: false, noMail: false };
function renderVibesVerify() {
  var box = document.getElementById('vibesContainer');
  if (!box) return;
  var email = (parseJWT(getToken()) || {}).email || '';
  if (_ev.noMail) { box.innerHTML = '<p class="vibes-note">' + escHtml(vt('vibes_verify_email', 'To see your VIBES, sign in with Google using the email you gave the studio.')) + '</p>'; return; }
  var h = '<p class="vibes-note">' + escHtml(vt('vibes_ev_intro', 'Confirm your email to see your VIBES. We will send a 6-digit code to {email}.').replace('{email}', email)) + '</p>';
  if (_ev.sent) {
    h += '<form class="vibes-ev-form" onsubmit="event.preventDefault();vibesVerifyCode()">'
       + '<input id="vibesEvCode" class="vibes-ev-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" aria-label="' + escHtml(vt('vibes_ev_code', 'Code from the email')) + '">'
       + '<button type="submit" class="btn btn-primary btn-sm"' + (_ev.busy ? ' disabled' : '') + '>' + escHtml(vt('vibes_ev_confirm', 'Confirm')) + '</button></form>';
    h += '<button type="button" class="vibes-more" onclick="vibesSendCode()"' + (_ev.wait > 0 || _ev.busy ? ' disabled' : '') + '>'
       + escHtml(_ev.wait > 0 ? vt('vibes_ev_resend_in', 'Send again in {s} s').replace('{s}', _ev.wait) : vt('vibes_ev_resend', 'Send the code again')) + '</button>';
  } else {
    h += '<button type="button" class="btn btn-primary btn-sm vibes-ev-send" onclick="vibesSendCode()"' + (_ev.busy ? ' disabled' : '') + '>' + escHtml(vt('vibes_ev_send', 'Send code')) + '</button>';
  }
  if (_ev.msg) h += '<p class="vibes-ev-msg' + (_ev.err ? ' err' : '') + '" role="status">' + escHtml(_ev.msg) + '</p>';
  box.innerHTML = h;
}
function vibesEvTick(sec) {
  _ev.wait = sec;
  if (_ev.timer) clearInterval(_ev.timer);
  _ev.timer = setInterval(function () {
    _ev.wait--; if (_ev.wait <= 0) { clearInterval(_ev.timer); _ev.timer = null; }
    if (!_vibesData || _vibesData.linked || _vibesData.reason !== 'verify_email') return;
    if (!document.getElementById('vibesEvCode') || document.activeElement !== document.getElementById('vibesEvCode')) renderVibesVerify();
    else { var b = document.querySelector('#vibesContainer .vibes-more'); if (b) { b.disabled = _ev.wait > 0; b.textContent = _ev.wait > 0 ? vt('vibes_ev_resend_in', 'Send again in {s} s').replace('{s}', _ev.wait) : vt('vibes_ev_resend', 'Send the code again'); } }
  }, 1000);
}
async function vibesSendCode() {
  _ev.busy = true; _ev.msg = ''; renderVibesVerify();
  try {
    var lang = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
    var r = await apiFetch('/api/me/email/send-code', { method: 'POST', body: JSON.stringify({ lang: lang }) });
    if (r.already) { if (r.token) saveToken(r.token); _ev.busy = false; loadVibes(); return; }
    _ev.sent = true; _ev.err = false; _ev.msg = vt('vibes_ev_sent', 'Code sent. Check your inbox (and the Spam folder).');
    vibesEvTick(r.retry_after || 60);
  } catch (err) {
    _ev.err = true;
    if (err.status === 503) { _ev.noMail = true; }
    else if (err.data && err.data.code === 'wait') { _ev.sent = true; _ev.msg = ''; _ev.err = false; vibesEvTick(err.data.retry_after || 60); }
    else if (err.data && err.data.code === 'too_many') _ev.msg = vt('vibes_ev_too_many', 'Too many codes requested. Please try again in an hour.');
    else _ev.msg = vt('vibes_ev_send_fail', 'Could not send the email. Please try again later.');
  }
  _ev.busy = false; renderVibesVerify();
  var inp = document.getElementById('vibesEvCode'); if (inp) inp.focus();
}
async function vibesVerifyCode() {
  var inp = document.getElementById('vibesEvCode');
  var code = inp ? inp.value.replace(/\D/g, '') : '';
  if (code.length !== 6) { _ev.err = true; _ev.msg = vt('vibes_ev_6digits', 'Enter the 6 digits from the email.'); renderVibesVerify(); return; }
  _ev.busy = true; renderVibesVerify();
  try {
    var r = await apiFetch('/api/me/email/verify', { method: 'POST', body: JSON.stringify({ code: code }) });
    if (r.token) saveToken(r.token);
    if (_ev.timer) clearInterval(_ev.timer);
    _ev = { sent: false, wait: 0, timer: null, msg: '', err: false, busy: false, noMail: false };
    _vibesData = null; loadVibes();
    return;
  } catch (err) {
    _ev.err = true;
    _ev.msg = (err.data && err.data.code === 'wrong') ? vt('vibes_ev_wrong', 'Wrong code. Please check and try again.') : vt('vibes_ev_expired', 'The code has expired. Please request a new one.');
    if (err.data && err.data.code === 'expired') { _ev.sent = false; }
  }
  _ev.busy = false; renderVibesVerify();
}
window.addEventListener('svs:langchange', function () { renderVibes(); });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && _vibesData && isTokenValid(getToken())) loadVibes(true); });

function updateHeaderBtn(name) {
  const label = document.getElementById('headerAccountLabel');
  if (label) label.textContent = name || 'My Account';
}

// ── Bookings ───────────────────────────────────────────────────────────────────
let _currentFilter = true; // true = upcoming

async function loadBookings(upcomingOnly) {
  _currentFilter = upcomingOnly;
  document.getElementById('filterUpcoming').classList.toggle('active', upcomingOnly);
  document.getElementById('filterAll').classList.toggle('active', !upcomingOnly);

  const container = document.getElementById('bookingsContainer');
  container.innerHTML = `
    <div class="bookings-loading">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>`;

  try {
    const data = await apiFetch(`/api/client/bookings?upcoming=${upcomingOnly}`);
    _bookingsLoaded = true;
    renderBookings(data.bookings || [], upcomingOnly);
  } catch (err) {
    _bookingsLoaded = false;
    container.innerHTML = `
      <div class="bookings-empty">
        <p>${escHtml(vt('bk_load_error', 'Could not load your bookings. Please try again.'))}</p>
        <button type="button" class="acc-book-btn" onclick="loadBookings(_currentFilter)">${escHtml(vt('bk_retry', 'Try again'))}</button>
      </div>`;
  }
}

const BOOKINGS_PAGE_SIZE = 10;
let _allBookings = [];
let _shownCount  = 0;
let _bookingsLoaded = false;

function bkLang() { return window.SVS_I18N ? window.SVS_I18N.getLang() : 'en'; }
function bkLocale() { var l = bkLang(); return l === 'ru' ? 'ru-RU' : l === 'el' ? 'el-GR' : 'en-GB'; }
// Class name in the site language, the same as in the booking window: «Инь йога (рус.)».
function bkClassTitle(b) {
  return window.svsClassInfo ? svsClassInfo(b.service_id, b.service || '', bkLang()).title : (b.service || vt('bk_class', 'Class'));
}
function bkTeacher(b) {
  return window.svsTeacherName ? (svsTeacherName(b.service_id, b.service || '', b.instructor, bkLang()) || '') : '';
}
function bkMonthLabel(b) {
  if (!b.date) return '—';
  const d = new Date(b.date + 'T00:00:00');
  const s = d.toLocaleString(bkLocale(), { month: 'long', year: 'numeric' }).replace(/\s*г\.$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function bkIsCancelled(b) { return (b.status || '').toLowerCase().includes('cancel'); }

function renderBookingCard(b) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dateObj  = b.date ? new Date(b.date + 'T00:00:00') : null;
  const day      = dateObj ? dateObj.getDate() : '—';
  const month    = dateObj ? dateObj.toLocaleString(bkLocale(), { month: 'short' }).replace('.', '') : '';
  const weekday  = dateObj ? dateObj.toLocaleString(bkLocale(), { weekday: 'short' }).replace('.', '') : '';
  const timeStr  = b.time ? b.time.slice(0,5) + (b.end_time ? ' – ' + b.end_time.slice(0,5) : '') : '';
  const isPast   = dateObj ? dateObj < today : false;
  const isCancelled = bkIsCancelled(b);
  const statusClass = isCancelled ? 'status-cancelled' : isPast ? 'status-past' : 'status-confirmed';
  const statusLabel = isCancelled ? vt('bk_status_cancelled', 'Cancelled') : isPast ? vt('bk_status_past', 'Past') : vt('bk_status_confirmed', 'Confirmed');
  const showCancel  = !isPast && !isCancelled && b.id;
  const teacher     = bkTeacher(b);
  const cancelBtn   = showCancel
    ? `<button type="button" class="booking-cancel-btn" onclick="cancelBooking('${escHtml(String(b.id))}', this)">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
         <span>${escHtml(vt('bk_cancel_btn', 'Cancel booking'))}</span>
       </button>`
    : '';
  return `
    <div class="booking-card" id="booking-${escHtml(String(b.id))}">
      <div class="booking-date-badge ${isPast || isCancelled ? 'booking-date-past' : ''}">
        <div class="booking-date-day">${day}</div>
        <div class="booking-date-month">${escHtml(month)}</div>
        ${weekday ? `<div class="booking-date-weekday">${escHtml(weekday)}</div>` : ''}
      </div>
      <div class="booking-info">
        <div class="booking-service" title="${escHtml(bkClassTitle(b))}">${escHtml(bkClassTitle(b))}</div>
        ${timeStr || teacher ? `<div class="booking-time">${escHtml([timeStr, teacher].filter(Boolean).join(' · '))}</div>` : ''}
        <div class="booking-footer">
          <span class="booking-status ${statusClass}">${escHtml(statusLabel)}</span>
          ${b.code ? `<span class="booking-code">#${escHtml(b.code)}</span>` : ''}
        </div>
      </div>
      ${cancelBtn}
    </div>`;
}

function bkCountText(shown, total) {
  return vt('bk_showing', 'Showing {n} of {total}').replace('{n}', shown).replace('{total}', total);
}
function bkMoreText(left) { return vt('bk_load_more', 'Show more ({n})').replace('{n}', left); }

function bkAppend(list, items) {
  const seps = list.querySelectorAll('.bookings-month-sep');
  let lastMonth = seps.length ? seps[seps.length - 1].textContent : null;
  items.forEach(b => {
    const ml = bkMonthLabel(b);
    if (ml !== lastMonth) {
      const sep = document.createElement('div');
      sep.className = 'bookings-month-sep';
      sep.textContent = ml;
      list.appendChild(sep);
      lastMonth = ml;
    }
    list.insertAdjacentHTML('beforeend', renderBookingCard(b));
  });
}

function renderBookings(bookings, upcomingOnly) {
  const container = document.getElementById('bookingsContainer');
  _allBookings = bookings;
  _shownCount  = 0;

  if (!bookings.length) {
    container.innerHTML = `
      <div class="bookings-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>${escHtml(upcomingOnly ? t('acc_no_upcoming', 'No upcoming bookings') : t('acc_no_all', 'No bookings yet'))}</p>
        <button onclick="openBookingFromAccount()" class="acc-book-btn">${escHtml(t('acc_book_class', 'Book a class'))}</button>
      </div>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'bookings-list';
  const slice = bookings.slice(0, BOOKINGS_PAGE_SIZE);
  _shownCount = slice.length;
  bkAppend(list, slice);

  container.innerHTML = '';
  container.appendChild(list);

  const total = bookings.length;
  const info = document.createElement('div');
  info.className = 'bookings-count-info';
  info.id = 'bookingsCountInfo';
  info.innerHTML = `<span>${escHtml(bkCountText(Math.min(_shownCount, total), total))}</span>`;
  container.appendChild(info);

  if (_shownCount < total) {
    const btn = document.createElement('button');
    btn.className = 'bookings-load-more';
    btn.id = 'bookingsLoadMore';
    btn.textContent = bkMoreText(total - _shownCount);
    btn.onclick = loadMoreBookings;
    container.appendChild(btn);
  }
}

function loadMoreBookings() {
  const container  = document.getElementById('bookingsContainer');
  const list       = container.querySelector('.bookings-list');
  const total      = _allBookings.length;
  const nextSlice  = _allBookings.slice(_shownCount, _shownCount + BOOKINGS_PAGE_SIZE);
  bkAppend(list, nextSlice);
  _shownCount += nextSlice.length;
  const info = document.getElementById('bookingsCountInfo');
  if (info) info.innerHTML = `<span>${escHtml(bkCountText(_shownCount, total))}</span>`;
  const btn = document.getElementById('bookingsLoadMore');
  if (btn) {
    if (_shownCount >= total) btn.remove();
    else btn.textContent = bkMoreText(total - _shownCount);
  }
}

// Re-draw the list in the new language without another request.
window.addEventListener('svs:langchange', function () {
  if (!_bookingsLoaded || !document.getElementById('bookingsContainer')) return;
  const shown = _shownCount;
  renderBookings(_allBookings, _currentFilter);
  while (_shownCount < Math.min(shown, _allBookings.length)) loadMoreBookings();
});

// ── Cancel booking: in-language dialog instead of the browser's confirm() ─────
function bkConfirmDialog(b) {
  return new Promise(function (resolve) {
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'bk-dialog-backdrop';
    const when = b && b.date
      ? vt('bk_at', '{date} at {time}')
          .replace('{date}', new Date(b.date + 'T00:00:00').toLocaleDateString(bkLocale(), { weekday: 'long', day: 'numeric', month: 'long' }))
          .replace('{time}', (b.time || '').slice(0, 5))
      : '';
    wrap.innerHTML = `
      <div class="bk-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bkDlgTitle" aria-describedby="bkDlgText">
        <p class="bk-dialog-title" id="bkDlgTitle">${escHtml(vt('bk_cancel_title', 'Cancel this booking?'))}</p>
        ${b ? `<p class="bk-dialog-class">${escHtml(bkClassTitle(b))}</p><p class="bk-dialog-when">${escHtml(when)}</p>` : ''}
        <p class="bk-dialog-text" id="bkDlgText">${escHtml(vt('bk_cancel_text', ''))}</p>
        <div class="bk-dialog-actions">
          <button type="button" class="bk-dialog-no">${escHtml(vt('bk_cancel_no', 'Keep booking'))}</button>
          <button type="button" class="bk-dialog-yes">${escHtml(vt('bk_cancel_yes', 'Cancel booking'))}</button>
        </div>
      </div>`;
    function done(v) {
      document.removeEventListener('keydown', onKey);
      wrap.remove();
      if (prev && prev.focus) try { prev.focus(); } catch (_) {}
      resolve(v);
    }
    function onKey(e) { if (e.key === 'Escape') done(false); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
    wrap.querySelector('.bk-dialog-no').onclick = function () { done(false); };
    wrap.querySelector('.bk-dialog-yes').onclick = function () { done(true); };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('.bk-dialog-no').focus();
  });
}

function bkToast(msg, isError) {
  let el = document.getElementById('bkToast');
  if (!el) { el = document.createElement('div'); el.id = 'bkToast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'bk-toast' + (isError ? ' bk-toast--error' : '');
  el.textContent = msg;
  clearTimeout(el._t); el.hidden = false;
  el._t = setTimeout(function () { el.hidden = true; }, 5000);
}

async function cancelBooking(bookingId, btn) {
  const b = _allBookings.find(x => String(x.id) === String(bookingId));
  if (!(await bkConfirmDialog(b))) return;

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-color:rgba(192,57,43,.3);border-top-color:#c0392b;"></span>';

  try {
    await apiFetch('/api/booking/cancel', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    });
    if (b) b.status = 'cancelled';
    const card = document.getElementById(`booking-${bookingId}`);
    if (card) {
      const badge = card.querySelector('.booking-date-badge');
      if (badge) badge.classList.add('booking-date-past');
      const status = card.querySelector('.booking-status');
      if (status) { status.className = 'booking-status status-cancelled'; status.textContent = vt('bk_status_cancelled', 'Cancelled'); }
      btn.remove();
    }
    bkToast(vt('bk_cancel_done', 'Booking cancelled.'));
    window.dispatchEvent(new CustomEvent('svs:bookingschange'));
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = original;
    bkToast(vt('bk_cancel_fail', 'Could not cancel the booking. Please try again or message us.'), true);
  }
}

// Open booking modal directly on account page
function openBookingFromAccount() {
  if (typeof BookingModal !== 'undefined') {
    BookingModal.open();
  } else {
    window.location.href = 'index.html?book=1';
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────────
function logout() {
  clearToken();
  _vibesData = null; _vibesShowAll = false;
  if (_ev.timer) clearInterval(_ev.timer);
  _ev = { sent: false, wait: 0, timer: null, msg: '', err: false, busy: false, noMail: false };
  if (_vibesTimer) { clearInterval(_vibesTimer); _vibesTimer = null; }
  var vs = document.getElementById('vibesSection'); if (vs) vs.hidden = true;
  if (typeof resetBirthday === 'function') resetBirthday();
  const dashEl  = document.getElementById('accDashboard');
  const authEl  = document.getElementById('accAuth');
  const rightEl = document.getElementById('accRight');
  if (dashEl)  dashEl.classList.remove('visible');
  if (authEl)  authEl.style.display = '';
  if (rightEl) rightEl.style.alignItems = '';
  const le = document.getElementById('loginEmail');
  const lp = document.getElementById('loginPassword');
  const fe = document.getElementById('forgotEmail');
  if (le) le.value = '';
  if (lp) lp.value = '';
  if (fe) fe.value = '';
  switchTab('login');
  updateHeaderBtn(t('nav_signin', 'Sign In'));
}

// ── Init ───────────────────────────────────────────────────────────────────────
(async function init() {
  const token = getToken();
  if (!isTokenValid(token)) { clearToken(); return; }
  const payload = parseJWT(token);
  if (payload) {
    showDashboard({ name: payload.name, email: payload.email });
    try {
      const data = await apiFetch('/api/client/me');
      const firstName = (data.client.name || '').split(' ')[0];
      const nameEl2 = document.getElementById('dashName');
      if (nameEl2) nameEl2.textContent = data.client.name || firstName;
      const emailEl2 = document.getElementById('dashEmail');
      if (emailEl2) emailEl2.textContent = data.client.email || '';
      const avatarEl2 = document.getElementById('dashAvatar');
      if (avatarEl2) avatarEl2.textContent = firstName.charAt(0).toUpperCase();
      updateHeaderBtn(firstName);
    } catch { logout(); }
  }
})();

// Update header label on page load
(function() {
  const label = document.getElementById('headerAccountLabel');
  if (!label) return;
  const token = getToken();
  if (isTokenValid(token)) {
    const p = parseJWT(token);
    if (p?.name) label.textContent = p.name.split(' ')[0];
    else label.textContent = 'My Account';
  }
})();

// ── Submit-button labels follow the active language ────────────────────────────
// data-i18n only re-renders plain text nodes; these buttons store their label
// via data-label-key so setLoading() can restore it after a spinner state, but
// that only fires on submit. Refresh them directly on load and on language
// change so they don't stay stuck in whatever language the HTML shipped with.
function refreshSubmitButtonLabels() {
  if (!(window.SVS_I18N && window.SVS_I18N.t)) return;
  document.querySelectorAll('[data-label-key]').forEach((btn) => {
    if (btn.disabled) return; // mid-submit spinner is showing; setLoading will restore it
    btn.textContent = window.SVS_I18N.t(btn.dataset.labelKey) || btn.textContent;
  });
}
window.addEventListener('svs:langchange', refreshSubmitButtonLabels);
refreshSubmitButtonLabels();

// ── Google Sign-In ─────────────────────────────────────────────────────────────
async function handleGoogleSignIn(response) {
  const idToken = response.credential;
  showError('');
  let name = '', email = '';
  try {
    const p = JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(idToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
    name = p.name || ''; email = p.email || '';
  } catch {}
  try {
    const res  = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken })
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Google sign-in failed');
    saveToken(data.token);
    showDashboard({ name: data.client?.name || name, email: data.client?.email || email });
  } catch (err) { showError(err.message || 'Google sign-in failed. Please try again.'); }
}

// Google's own button is drawn in one language; re-draw it when the site language changes.
window.addEventListener('svs:langchange', function (e) {
  var gid = window.google && window.google.accounts && window.google.accounts.id;
  var lang = (e && e.detail && e.detail.lang) || (window.SVS_I18N && window.SVS_I18N.getLang()) || 'en';
  document.querySelectorAll('.g_id_signin').forEach(function (el) {
    el.setAttribute('data-locale', lang);
    if (gid && el.dataset.svsRendered !== 'redirect' && el.children.length) {
      try { el.innerHTML = ''; gid.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: 420, locale: lang }); } catch (_) {}
    }
  });
});
