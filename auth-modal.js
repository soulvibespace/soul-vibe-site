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

  // Read consents only if the auth modal is actually on screen showing the
  // register tab. Without the visibility check a Google sign-in started from the
  // booking modal was treated as a registration, then blocked on an unchecked
  // terms box whose error message was written into the hidden auth modal — so
  // nothing at all appeared to happen.
  const authModalEl  = document.getElementById('authModal');
  const authVisible  = !!(authModalEl && !authModalEl.hidden);
  const termsEl      = document.getElementById('authRegTerms');
  const newsletterEl = document.getElementById('authRegNewsletter');
  const registerForm = document.getElementById('authRegisterForm');
  const isRegister   = authVisible && registerForm && registerForm.style.display !== 'none';

  if (isRegister && termsEl && !termsEl.checked) {
    _showGoogleError((window.SVS_I18N ? SVS_I18N.t('err_terms_required') : null)
      || 'Please agree to the Terms & Conditions and Privacy Policy to continue.');
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
    const data = await res.json().catch(() => ({}));

    if (res.status === 409) throw new Error(_googleMsg('exists', data.error));
    if (!res.ok || !data.token) throw new Error(data.error || _googleMsg('failed'));

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
    // A network or CORS failure surfaces as the terse "Failed to fetch".
    const msg = /failed to fetch|networkerror|load failed/i.test(err.message || '')
      ? _googleMsg('network')
      : (err.message || _googleMsg('failed'));
    _showGoogleError(msg);
  }
}

// ── Google Identity Services setup ──────────────────────────────
// Google is initialised from JavaScript rather than from a #g_id_onload element
// so that an error_callback can be attached. Without it, failures inside Google's
// own code — a blocked popup window above all, which is the default setting in
// Safari on iPhone — are completely silent: the sign-in callback simply never
// runs and the visitor sees nothing happen at all.
function svsGoogleClientId() {
  const el = document.getElementById('svsGoogleConfig') || document.getElementById('g_id_onload');
  return (el && el.getAttribute('data-client_id'))
    || '201608741686-96ngo0j9vg3190g6satnoaj7e452km4j.apps.googleusercontent.com';
}

function svsInitGoogle() {
  const gid = window.google && window.google.accounts && window.google.accounts.id;
  if (!gid) return false;
  if (window.__svsGoogleInit) return true;

  gid.initialize({
    client_id: svsGoogleClientId(),
    callback: (response) => handleGoogleSignIn(response),
    error_callback: (err) => {
      const type = (err && err.type) || 'unknown';
      _showGoogleError(_googleErrMsg(type));
    },
    auto_select: false,
    cancel_on_tap_outside: true
  });

  window.__svsGoogleInit = true;
  return true;
}

// Render Google's own button into every slot the page provides.
function svsRenderGoogleButtons() {
  const gid = window.google && window.google.accounts && window.google.accounts.id;
  if (!gid || !svsInitGoogle()) return;

  document.querySelectorAll('.g_id_signin').forEach(slot => {
    if (slot.dataset.svsRendered === '1') return;
    try {
      gid.renderButton(slot, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 360,
        locale: document.documentElement.getAttribute('lang') || 'en'
      });
      slot.dataset.svsRendered = '1';
    } catch (_) {}
  });
}

// ── Google sign-in messages ──────────────────────────────────────
// Messages for failures reported by Google itself, before our own code runs.
function _googleErrMsg(type) {
  const lang = document.documentElement.getAttribute('lang')
    || document.documentElement.getAttribute('data-lang') || 'en';
  const M = {
    en: {
      popup_failed_to_open: 'Your browser blocked the Google window. Allow pop-ups for this site (on iPhone: Settings → Apps → Safari → turn off Block Pop-ups), then try again — or just register with your email below.',
      popup_closed: 'The Google window was closed before sign-in finished. Please try again.',
      unregistered_origin: 'Google sign-in is not enabled for this address yet. Please register with your email below.',
      opt_out_or_no_session: 'You are not signed in to Google in this browser. Sign in to Google first, or register with your email below.',
      suppressed_by_user: 'Google sign-in was dismissed. Please try again, or register with your email below.',
      unknown: 'Google sign-in could not be completed. Please register with your email below — it works the same way.'
    },
    ru: {
      popup_failed_to_open: 'Браузер заблокировал окно Google. Разрешите всплывающие окна для сайта (на iPhone: Настройки → Приложения → Safari → выключите «Блокировать всплывающие окна») и попробуйте снова — или зарегистрируйтесь по email ниже.',
      popup_closed: 'Окно Google закрылось до завершения входа. Попробуйте ещё раз.',
      unregistered_origin: 'Вход через Google для этого адреса пока не включён. Пожалуйста, зарегистрируйтесь по email ниже.',
      opt_out_or_no_session: 'В этом браузере вы не вошли в Google. Сначала войдите в аккаунт Google или зарегистрируйтесь по email ниже.',
      suppressed_by_user: 'Вход через Google был отклонён. Попробуйте снова или зарегистрируйтесь по email ниже.',
      unknown: 'Завершить вход через Google не удалось. Зарегистрируйтесь по email ниже — результат будет таким же.'
    },
    el: {
      popup_failed_to_open: 'Ο περιηγητής μπλόκαρε το παράθυρο της Google. Επιτρέψτε τα αναδυόμενα παράθυρα και δοκιμάστε ξανά — ή εγγραφείτε με email παρακάτω.',
      popup_closed: 'Το παράθυρο της Google έκλεισε πριν ολοκληρωθεί η σύνδεση. Δοκιμάστε ξανά.',
      unregistered_origin: 'Η σύνδεση με Google δεν είναι ενεργή για αυτή τη διεύθυνση. Εγγραφείτε με email παρακάτω.',
      opt_out_or_no_session: 'Δεν έχετε συνδεθεί στη Google σε αυτόν τον περιηγητή. Συνδεθείτε πρώτα ή εγγραφείτε με email.',
      suppressed_by_user: 'Η σύνδεση με Google ακυρώθηκε. Δοκιμάστε ξανά ή εγγραφείτε με email.',
      unknown: 'Η σύνδεση με Google δεν ολοκληρώθηκε. Εγγραφείτε με email παρακάτω.'
    }
  };
  const set = M[lang] || M.en;
  return set[type] || set.unknown;
}

function _googleMsg(kind, fallback) {
  const lang = document.documentElement.getAttribute('lang')
    || document.documentElement.getAttribute('data-lang') || 'en';
  const M = {
    en: {
      exists:  'An account with this email already exists. Please sign in with your email and password, or message the studio and we will link Google to your account.',
      network: 'Could not reach the studio server. Please check your connection and try again.',
      failed:  'Google sign-in did not go through. Please try again, or sign in with your email and password.'
    },
    ru: {
      exists:  'Аккаунт с этим email уже зарегистрирован. Войдите по email и паролю или напишите нам — мы привяжем Google к вашему аккаунту.',
      network: 'Не удалось связаться с сервером студии. Проверьте интернет и попробуйте снова.',
      failed:  'Войти через Google не получилось. Попробуйте ещё раз или войдите по email и паролю.'
    },
    el: {
      exists:  'Ισχύει ήδη λογαριασμός με αυτό το email. Συνδεθείτε με email και κωδικό ή επικοινωνήστε μαζί μας.',
      network: 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Δοκιμάστε ξανά.',
      failed:  'Η σύνδεση με Google δεν ολοκληρώθηκε. Δοκιμάστε ξανά ή χρησιμοποιήστε email και κωδικό.'
    }
  };
  return (M[lang] || M.en)[kind] || fallback || (M.en[kind]);
}

// Show a sign-in error where the visitor is actually looking. The Google button
// can be triggered from the booking modal as well as from the auth modal, and
// writing into a hidden container is what made failures look like "nothing
// happens".
function _showGoogleError(msg) {
  const bookingEl = document.getElementById('bookingModal');
  const authEl    = document.getElementById('authModal');

  let target = null;
  if (bookingEl && !bookingEl.hidden) {
    target = document.getElementById('bmGoogleErr') || document.getElementById('bmIaLoginErr');
  }
  if (!target && authEl && !authEl.hidden) {
    target = document.getElementById('authModalError');
  }
  if (!target) {
    // Neither modal is on screen — open the auth modal so the message is seen.
    if (typeof AuthModal !== 'undefined') AuthModal.open('login');
    target = document.getElementById('authModalError');
  }
  if (!target) { alert(msg); return; }

  target.textContent = msg;
  target.classList.add('visible');
  target.style.display = 'block';
  try { target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
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
  // Load Google GSI script, then initialise it ourselves and render the buttons.
  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.async = true;
  gsiScript.onload = () => svsRenderGoogleButtons();
  document.head.appendChild(gsiScript);

  // The script may already be present (account.html loads it with its own tag).
  if (window.google && window.google.accounts && window.google.accounts.id) {
    svsRenderGoogleButtons();
  }

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
