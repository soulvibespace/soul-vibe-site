/**
 * Soul Vibe Space — Auth Modal
 * Inline Sign In / Register modal on the main page
 * Connects to backend → Simplybook
 */

var API_BASE = window.SVS_API_BASE
  || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://soul-vibe-api.onrender.com');

const TOKEN_KEY = 'svs_token';

// ── Token helpers ─────────────────────────────────────────────────
function getToken()       { try { return window['local'+'Storage'].getItem(TOKEN_KEY); } catch { return null; } }
function saveToken(t)     { try { window['local'+'Storage'].setItem(TOKEN_KEY, t); } catch {} }
function clearToken()     { try { window['local'+'Storage'].removeItem(TOKEN_KEY); } catch {} }
function parseJWT(token)  {
  try {
    const b = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(b));
  } catch { return null; }
}
function isTokenValid(t) {
  if (!t) return false;
  const p = parseJWT(t);
  return p && p.exp && p.exp * 1000 > Date.now();
}

// ── AuthModal ─────────────────────────────────────────────────────
const AuthModal = (() => {
  let _modal, _backdrop, _closeBtn;
  let _initialized = false;

  function _init() {
    if (_initialized) return;
    _initialized = true;
    _modal    = document.getElementById('authModal');
    _backdrop = document.getElementById('authModalBackdrop');
    _closeBtn = document.getElementById('authModalClose');

    if (_closeBtn)  _closeBtn.addEventListener('click', close);
    if (_backdrop)  _backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _modal && !_modal.hidden) close();
    });

    // Login form submit
    document.getElementById('authLoginForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      await _handleLogin();
    });

    // Register form submit
    document.getElementById('authRegisterForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      await _handleRegister();
    });
  }

  function open(tab = 'login') {
    _init();
    if (!_modal) return;
    _modal.hidden = false;
    document.body.style.overflow = 'hidden';
    switchTab(tab);
    _clearMessages();
  }

  function close() {
    if (!_modal) return;
    _modal.hidden = true;
    document.body.style.overflow = '';
  }

  function switchTab(tab) {
    const loginForm    = document.getElementById('authLoginForm');
    const registerForm = document.getElementById('authRegisterForm');
    const loginTab     = document.getElementById('authTabLogin');
    const registerTab  = document.getElementById('authTabRegister');
    if (!loginForm) return;

    if (tab === 'login') {
      loginForm.style.display    = '';
      registerForm.style.display = 'none';
      loginTab?.classList.add('active');
      registerTab?.classList.remove('active');
    } else {
      loginForm.style.display    = 'none';
      registerForm.style.display = '';
      loginTab?.classList.remove('active');
      registerTab?.classList.add('active');
    }
    _clearMessages();
  }

  function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  function _showError(msg) {
    const el = document.getElementById('authModalError');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function _showSuccess(msg) {
    const el = document.getElementById('authModalSuccess');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function _clearMessages() {
    _showError('');
    _showSuccess('');
  }

  async function _handleLogin() {
    const email    = document.getElementById('authLoginEmail')?.value.trim();
    const password = document.getElementById('authLoginPassword')?.value;
    const btn      = document.getElementById('authLoginBtn');

    if (!email || !password) return _showError('Please enter email and password');

    btn.disabled = true;
    btn.textContent = '...';
    _clearMessages();

    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      saveToken(data.token);
      _onAuthSuccess(data.client);

    } catch (err) {
      _showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = btn.getAttribute('data-i18n') === 'acc_tab_login' ? 'Sign In' : 'Sign In';
    }
  }

  async function _handleRegister() {
    const name     = document.getElementById('authRegName')?.value.trim();
    const email    = document.getElementById('authRegEmail')?.value.trim();
    const phone    = document.getElementById('authRegPhone')?.value.trim();
    const password = document.getElementById('authRegPassword')?.value;
    const termsEl       = document.getElementById('authRegTerms');
    const newsletterEl  = document.getElementById('authRegNewsletter');
    const btn      = document.getElementById('authRegBtn');

    if (!name || !email || !phone) return _showError(_t('err_fill_required', 'Please fill in all fields'));
    if (termsEl && !termsEl.checked) return _showError(_t('err_terms_required', 'Please agree to the Terms & Conditions and Privacy Policy to continue.'));

    const newsletter_consent = !!(newsletterEl && newsletterEl.checked);
    const terms_accepted     = !!(termsEl && termsEl.checked);
    const consent_timestamp  = new Date().toISOString();
    const consent_version    = (window.SVS_LEGAL_VERSION || '2026-05-24');
    const consent_locale     = (document.documentElement.getAttribute('data-lang') || 'en');

    btn.disabled = true;
    btn.textContent = '...';
    _clearMessages();

    try {
      const res  = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, password,
          terms_accepted,
          newsletter_consent,
          consent_timestamp,
          consent_version,
          consent_locale
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      saveToken(data.token);
      _onAuthSuccess(data.client);

    } catch (err) {
      _showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = _t('acc_tab_register', 'Create Account');
    }
  }

  function _t(key, fallback) {
    try { return (window.SVS_I18N ? SVS_I18N.t(key) : null) || fallback; }
    catch { return fallback; }
  }

  function _onAuthSuccess(client) {
    const firstName = (client?.name || '').split(' ')[0] || 'User';

    // Update header button
    _updateHeaderBtn(firstName, true);

    // Close auth modal
    close();

    // Resume pending booking if exists, otherwise open booking from scratch
    setTimeout(async () => {
      if (typeof BookingModal !== 'undefined') {
        const resumed = await BookingModal.resumePendingBooking();
        if (resumed) return; // Booking modal reopened at confirm step
        // No pending booking — open from scratch
        BookingModal.open();
      } else if (typeof ClassModal !== 'undefined') {
        ClassModal.open(null, null, null);
      }
    }, 300);
  }

  return { open, close, switchTab, togglePw };
})();

// ── Google Sign-In callback (global) ─────────────────────────────
async function handleGoogleSignIn(response) {
  const idToken = response.credential;

  let name = '', email = '';
  try {
    const p = JSON.parse(atob(idToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    name  = p.name  || '';
    email = p.email || '';
  } catch {}

  const errEl = document.getElementById('authModalError');

  // Read consents if user is on the register tab (Google = new account possibility)
  const termsEl      = document.getElementById('authRegTerms');
  const newsletterEl = document.getElementById('authRegNewsletter');
  const registerForm = document.getElementById('authRegisterForm');
  const isRegister   = registerForm && registerForm.style.display !== 'none';

  if (isRegister && termsEl && !termsEl.checked) {
    if (errEl) {
      errEl.textContent = (window.SVS_I18N ? SVS_I18N.t('err_terms_required') : null)
        || 'Please agree to the Terms & Conditions and Privacy Policy to continue.';
      errEl.classList.add('visible');
    }
    return;
  }

  const consentPayload = isRegister ? {
    terms_accepted: !!(termsEl && termsEl.checked),
    newsletter_consent: !!(newsletterEl && newsletterEl.checked),
    consent_timestamp: new Date().toISOString(),
    consent_version: (window.SVS_LEGAL_VERSION || '2026-05-24'),
    consent_locale: (document.documentElement.getAttribute('data-lang') || 'en')
  } : {};

  try {
    const res  = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, ...consentPayload })
    });
    const data = await res.json();

    if (!res.ok || !data.token) throw new Error(data.error || 'Google sign-in failed');

    saveToken(data.token);
    const clientName = data.client?.name || name;

    _updateHeaderBtn(clientName.split(' ')[0], true);
    AuthModal.close();

    setTimeout(async () => {
      if (typeof BookingModal !== 'undefined') {
        const resumed = await BookingModal.resumePendingBooking();
        if (resumed) return;
        BookingModal.open();
      } else if (typeof ClassModal !== 'undefined') {
        ClassModal.open(null, null, null);
      }
    }, 300);

  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.add('visible');
    }
  }
}

// ── Header button update ─────────────────────────────────────────
function _updateHeaderBtn(name, loggedIn) {
  const label = document.getElementById('headerAccountLabel');
  const btn   = document.getElementById('headerAccountBtn');
  const mobBtn = document.getElementById('mobileSignInBtn');

  if (label) {
    if (loggedIn && name) {
      label.removeAttribute('data-i18n');
      label.textContent = name;
      if (btn) btn.href = 'account.html';
      if (typeof window._removeHeaderSignInListener === 'function') {
        window._removeHeaderSignInListener();
      }
    } else {
      label.setAttribute('data-i18n', 'nav_signin');
      label.textContent = (window.SVS_I18N ? SVS_I18N.t('nav_signin') : 'Sign In');
      if (btn) btn.href = '#';
    }
  }

  // Update mobile person icon — filled when logged in
  if (mobBtn) {
    if (loggedIn && name) {
      mobBtn.setAttribute('aria-label', name);
      mobBtn.title = name;
      // Filled person icon
      mobBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" fill="rgba(107,79,160,0.18)"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--color-primary,#6B4FA0)"/></svg>`;
      mobBtn.onclick = (e) => { e.preventDefault(); window.location.href = '/account'; };
    } else {
      mobBtn.setAttribute('aria-label', 'Sign In');
      mobBtn.title = 'Sign In';
      mobBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
      mobBtn.onclick = (e) => { e.preventDefault(); if(typeof AuthModal!=='undefined') AuthModal.open('login'); else window.location.href='/account'; };
    }
  }
}

// ── Wire Sign In button in header ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load Google GSI script
  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.async = true;
  document.head.appendChild(gsiScript);

  const headerBtn = document.getElementById('headerAccountBtn');
  const token     = getToken();

  // Named handler so we can remove it after login
  function _headerSignInClick(e) {
    e.preventDefault();
    AuthModal.open('login');
  }
  window._removeHeaderSignInListener = () => {
    if (headerBtn) headerBtn.removeEventListener('click', _headerSignInClick);
  };

  if (isTokenValid(token)) {
    // Already logged in — show name, link goes to account.html
    const payload = parseJWT(token);
    if (payload?.name) {
      _updateHeaderBtn(payload.name.split(' ')[0], true);
    }
  } else {
    // Not logged in — clicking opens auth modal
    if (headerBtn) {
      headerBtn.addEventListener('click', _headerSignInClick);
    }
  }

  // Logout support (from account.html link)
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      clearToken();
      _updateHeaderBtn('', false);
    });
  });
});
