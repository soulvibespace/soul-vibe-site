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
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
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
    // Restore label from data-label (set at init) or data-label-key (i18n)
    const label = btn.dataset.label ||
      (btn.dataset.labelKey ? (window.SVS_I18N && window.SVS_I18N.t ? window.SVS_I18N.t(btn.dataset.labelKey) : '') : '');
    btn.textContent = label || btn.dataset.labelKey || 'Submit';
  }
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  clearMessages();
  const lf  = document.getElementById('loginForm');
  const rf  = document.getElementById('registerForm');
  const lbt = document.getElementById('loginTabBtn');
  const rbt = document.getElementById('registerTabBtn');
  if (tab === 'login') {
    lf.style.display = 'flex'; rf.style.display = 'none';
    lbt.classList.add('active');    rbt.classList.remove('active');
    lbt.setAttribute('aria-selected','true'); rbt.setAttribute('aria-selected','false');
  } else {
    lf.style.display = 'none'; rf.style.display = 'flex';
    rbt.classList.add('active');    lbt.classList.remove('active');
    rbt.setAttribute('aria-selected','true'); lbt.setAttribute('aria-selected','false');
  }
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
})();
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); clearMessages();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showError('Please enter your email and password.'); return; }
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

// ── Auth: Register ─────────────────────────────────────────────────────────────
// registerBtn label stored above
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault(); clearMessages();
  const name               = document.getElementById('regName').value.trim();
  const email              = document.getElementById('regEmail').value.trim();
  const phone              = document.getElementById('regPhone').value.trim();
  const password           = document.getElementById('regPassword').value;
  const termsEl            = document.getElementById('regTerms');
  const newsletterEl       = document.getElementById('regNewsletter');
  const newsletter_consent = newsletterEl ? newsletterEl.checked : false;
  if (!name || !email || !phone) { showError('Please fill in all required fields.'); return; }
  if (termsEl && !termsEl.checked) { showError('Please agree to the Terms & Conditions.'); return; }
  if (password && password.length < 6) { showError('Password must be at least 6 characters.'); return; }
  setLoading('registerBtn', true);
  const consent_timestamp = new Date().toISOString();
  const consent_version   = (window.SVS_LEGAL_VERSION || '2026-05-24');
  const consent_locale    = (document.documentElement.getAttribute('data-lang') || 'en');
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
    showSuccess('Account created! Welcome to Soul Vibe Space.');
    setTimeout(() => showDashboard(data.client), 800);
  } catch (err) {
    showError(err.message || 'Registration failed. Please try again.');
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
  loadBookings(true);
}

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
    renderBookings(data.bookings || [], upcomingOnly);
  } catch (err) {
    container.innerHTML = `
      <div class="bookings-empty">
        <p>Could not load bookings. Please try again.</p>
      </div>`;
  }
}

const BOOKINGS_PAGE_SIZE = 10;
let _allBookings = [];
let _shownCount  = 0;

function renderBookingCard(b) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dateObj  = b.date ? new Date(b.date + 'T00:00:00') : null;
  const day      = dateObj ? dateObj.getDate() : '—';
  const month    = dateObj ? dateObj.toLocaleString('en', { month: 'short' }).toUpperCase() : '';
  const weekday  = dateObj ? dateObj.toLocaleString('en', { weekday: 'short' }) : '';
  const timeStr  = b.time ? b.time.slice(0,5) + (b.end_time ? ' – ' + b.end_time.slice(0,5) : '') : '';
  const isPast   = dateObj ? dateObj < today : false;
  const isCancelled = (b.status || '').toLowerCase().includes('cancel');
  const statusClass = isCancelled ? 'status-cancelled' : isPast ? 'status-past' : 'status-confirmed';
  const statusLabel = isCancelled ? 'Cancelled' : isPast ? 'Completed' : 'Confirmed';
  const showCancel  = !isPast && !isCancelled && b.id;
  const cancelBtn   = showCancel
    ? `<button class="booking-cancel-btn" onclick="cancelBooking('${b.id}', this)" title="Cancel booking">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
       </button>`
    : '';
  return `
    <div class="booking-card" id="booking-${b.id}">
      <div class="booking-date-badge ${isPast ? 'booking-date-past' : ''}">
        <div class="booking-date-day">${day}</div>
        <div class="booking-date-month">${month}</div>
        ${weekday ? `<div class="booking-date-weekday">${weekday}</div>` : ''}
      </div>
      <div class="booking-info">
        <div class="booking-service">${escHtml(b.service || 'Class')}</div>
        ${timeStr ? `<div class="booking-time">${timeStr}</div>` : ''}
        <div class="booking-footer">
          <span class="booking-status ${statusClass}">${statusLabel}</span>
          ${b.code ? `<span class="booking-code">#${escHtml(b.code)}</span>` : ''}
        </div>
      </div>
      ${cancelBtn}
    </div>`;
}

function renderBookings(bookings, upcomingOnly) {
  const container = document.getElementById('bookingsContainer');
  _allBookings = bookings;
  _shownCount  = 0;

  if (!bookings.length) {
    container.innerHTML = `
      <div class="bookings-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>${upcomingOnly ? 'No upcoming bookings' : 'No bookings yet'}</p>
        <button onclick="openBookingFromAccount()" class="acc-book-btn">Book a class</button>
      </div>`;
    return;
  }

  // Group by month label
  function monthLabel(b) {
    if (!b.date) return 'Unknown';
    const d = new Date(b.date + 'T00:00:00');
    return d.toLocaleString('en', { month: 'long', year: 'numeric' });
  }

  const list = document.createElement('div');
  list.className = 'bookings-list';

  const slice = bookings.slice(0, BOOKINGS_PAGE_SIZE);
  _shownCount = slice.length;

  let lastMonth = null;
  slice.forEach(b => {
    const ml = monthLabel(b);
    if (ml !== lastMonth) {
      const sep = document.createElement('div');
      sep.className = 'bookings-month-sep';
      sep.textContent = ml;
      list.appendChild(sep);
      lastMonth = ml;
    }
    list.insertAdjacentHTML('beforeend', renderBookingCard(b));
  });

  container.innerHTML = '';
  container.appendChild(list);

  // Show counter + load more
  const total = bookings.length;
  const info = document.createElement('div');
  info.className = 'bookings-count-info';
  info.id = 'bookingsCountInfo';
  info.innerHTML = `<span>Showing ${Math.min(_shownCount, total)} of ${total}</span>`;
  container.appendChild(info);

  if (_shownCount < total) {
    const btn = document.createElement('button');
    btn.className = 'bookings-load-more';
    btn.id = 'bookingsLoadMore';
    btn.textContent = `Load more (${total - _shownCount} remaining)`;
    btn.onclick = loadMoreBookings;
    container.appendChild(btn);
  }
}

function loadMoreBookings() {
  const container  = document.getElementById('bookingsContainer');
  const list       = container.querySelector('.bookings-list');
  const total      = _allBookings.length;
  const nextSlice  = _allBookings.slice(_shownCount, _shownCount + BOOKINGS_PAGE_SIZE);

  // Find last month label already rendered
  const seps = list.querySelectorAll('.bookings-month-sep');
  let lastMonth = seps.length ? seps[seps.length - 1].textContent : null;

  function monthLabel(b) {
    if (!b.date) return 'Unknown';
    const d = new Date(b.date + 'T00:00:00');
    return d.toLocaleString('en', { month: 'long', year: 'numeric' });
  }

  nextSlice.forEach(b => {
    const ml = monthLabel(b);
    if (ml !== lastMonth) {
      const sep = document.createElement('div');
      sep.className = 'bookings-month-sep';
      sep.textContent = ml;
      list.appendChild(sep);
      lastMonth = ml;
    }
    list.insertAdjacentHTML('beforeend', renderBookingCard(b));
  });

  _shownCount += nextSlice.length;

  // Update counter
  const info = document.getElementById('bookingsCountInfo');
  if (info) info.innerHTML = `<span>Showing ${_shownCount} of ${total}</span>`;

  // Remove load more button if done
  const btn = document.getElementById('bookingsLoadMore');
  if (btn) {
    if (_shownCount >= total) {
      btn.remove();
    } else {
      btn.textContent = `Load more (${total - _shownCount} remaining)`;
    }
  }
}

// ── Cancel booking ─────────────────────────────────────────────────────────────
async function cancelBooking(bookingId, btn) {
  if (!confirm('Cancel this booking?')) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-color:rgba(192,57,43,.3);border-top-color:#c0392b;"></span>';

  try {
    await apiFetch('/api/booking/cancel', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    });

    // Update card UI immediately
    const card = document.getElementById(`booking-${bookingId}`);
    if (card) {
      const badge = card.querySelector('.booking-date-badge');
      if (badge) badge.classList.add('booking-date-past');
      const status = card.querySelector('.booking-status');
      if (status) { status.className = 'booking-status status-cancelled'; status.textContent = 'Cancelled'; }
      btn.remove();
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    alert(err.message || 'Could not cancel booking.');
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
  const dashEl  = document.getElementById('accDashboard');
  const authEl  = document.getElementById('accAuth');
  const rightEl = document.getElementById('accRight');
  if (dashEl)  dashEl.classList.remove('visible');
  if (authEl)  authEl.style.display = '';
  if (rightEl) rightEl.style.alignItems = '';
  const le = document.getElementById('loginEmail');
  const lp = document.getElementById('loginPassword');
  if (le) le.value = '';
  if (lp) lp.value = '';
  switchTab('login');
  updateHeaderBtn('Sign In');
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

// ── Google Sign-In ─────────────────────────────────────────────────────────────
async function handleGoogleSignIn(response) {
  const idToken = response.credential;
  showError('');
  let name = '', email = '';
  try {
    const p = JSON.parse(atob(idToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
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
