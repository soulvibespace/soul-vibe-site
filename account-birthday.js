/**
 * Soul Vibe Space — «Дата рождения» в личном кабинете (/account).
 * Клиент один раз указывает дату рождения → она сохраняется в карточку VIBES
 * (soul-vibe-api GET/POST /api/me/birthday → панель VIBES). В день рождения
 * автоматически начисляется +10 VIBES, раз в год. Изменить уже указанную дату
 * можно только через администратора студии.
 * Использует общие функции account.js: apiFetch, escHtml, vt, isTokenValid, getToken.
 */
var _bday = null;               // last answer of GET /api/me/birthday
var _bdayUi = { pending: '', msg: '', err: false, busy: false, gift: false };

function bdayLocale() {
  var l = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
  return l === 'ru' ? 'ru-RU' : l === 'el' ? 'el-GR' : 'en-GB';
}
function bdayFormat(ymd) {
  var d = new Date(ymd + 'T00:00:00Z');
  if (isNaN(d)) return ymd;
  return d.toLocaleDateString(bdayLocale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function loadBirthday() {
  var section = document.getElementById('bdaySection');
  if (!section) return;
  try {
    _bday = await apiFetch('/api/me/birthday');
  } catch (err) {
    _bday = null;
  }
  // Only for clients with a linked VIBES card; otherwise the «My VIBES» block explains what to do.
  section.hidden = !(_bday && _bday.linked);
  renderBirthday();
}

function renderBirthday() {
  var box = document.getElementById('bdayContainer');
  var d = _bday;
  if (!box || !d || !d.linked) return;
  var h = '';
  if (d.birth_date) {
    h += '<div class="bday-set"><span class="bday-icon" aria-hidden="true">'
       + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/></svg>'
       + '</span><span class="bday-date">' + escHtml(bdayFormat(d.birth_date)) + '</span></div>';
    if (_bdayUi.gift) h += '<p class="bday-msg" role="status">' + escHtml(vt('bday_gift_now', 'Happy birthday! 10 bonus VIBES are already on your balance.')) + '</p>';
    else if (_bdayUi.msg) h += '<p class="bday-msg" role="status">' + escHtml(_bdayUi.msg) + '</p>';
    h += '<p class="bday-note">' + escHtml(vt('bday_bonus_hint', 'On your birthday you get 10 bonus VIBES as a gift — automatically, once a year.')) + '</p>';
    h += '<p class="bday-note bday-locked">' + escHtml(vt('bday_locked', 'To change the date, please contact the studio administrator.')) + '</p>';
    box.innerHTML = h;
    return;
  }
  h += '<p class="bday-note">' + escHtml(vt('bday_intro', 'Add your date of birth — on your birthday we will give you 10 bonus VIBES. The bonus is added automatically once a year.')) + '</p>';
  if (_bdayUi.pending) {
    h += '<p class="bday-confirm" role="status">' + escHtml(vt('bday_confirm_q', 'Save {d}? After that the date can only be changed by the studio administrator.').replace('{d}', bdayFormat(_bdayUi.pending))) + '</p>'
       + '<div class="bday-actions"><button type="button" class="btn btn-primary btn-sm" onclick="bdaySubmit()"' + (_bdayUi.busy ? ' disabled' : '') + '>' + escHtml(vt('bday_confirm', 'Yes, save')) + '</button>'
       + '<button type="button" class="btn btn-outline btn-sm" onclick="bdayEdit()"' + (_bdayUi.busy ? ' disabled' : '') + '>' + escHtml(vt('bday_edit', 'Change')) + '</button></div>';
  } else {
    var r = d.range || {};
    h += '<form class="bday-form" onsubmit="event.preventDefault();bdayReview()" novalidate>'
       + '<input type="date" id="bdayInput" class="bday-input" required'
       + (r.min ? ' min="' + escHtml(r.min) + '"' : '') + (r.max ? ' max="' + escHtml(r.max) + '"' : '')
       + ' value="' + escHtml(_bdayUi.draft || '') + '" aria-label="' + escHtml(vt('bday_title', 'Date of birth')) + '"' + (_bdayUi.err ? ' aria-invalid="true" aria-describedby="bdayMsg"' : '') + '>'
       + '<button type="submit" class="btn btn-primary btn-sm">' + escHtml(vt('bday_save', 'Save')) + '</button></form>';
    h += '<p class="bday-hint">' + escHtml(vt('bday_once', 'The date can be set only once.')) + '</p>';
  }
  if (_bdayUi.msg) h += '<p class="bday-msg' + (_bdayUi.err ? ' err' : '') + '" id="bdayMsg" role="' + (_bdayUi.err ? 'alert' : 'status') + '">' + escHtml(_bdayUi.msg) + '</p>';
  box.innerHTML = h;
}

// Client-side check mirrors the server (real date, age 10–100); the server is authoritative.
function bdayCheck(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'invalid';
  var d = new Date(v + 'T00:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== v) return 'invalid';
  var r = (_bday && _bday.range) || {};
  if ((r.min && v < r.min) || (r.max && v > r.max)) return 'age';
  return '';
}
function bdayReview() {
  var inp = document.getElementById('bdayInput');
  var v = inp ? inp.value : '';
  _bdayUi.draft = v;
  var bad = bdayCheck(v);
  if (bad) {
    _bdayUi.err = true;
    _bdayUi.msg = bad === 'age' ? vt('bday_err_age', 'Please check the date: age must be between 10 and 100.') : vt('bday_err_invalid', 'Please enter a valid date of birth.');
    renderBirthday();
    var again = document.getElementById('bdayInput'); if (again) again.focus();
    return;
  }
  _bdayUi.pending = v; _bdayUi.msg = ''; _bdayUi.err = false;
  renderBirthday();
}
function bdayEdit() {
  _bdayUi.pending = ''; _bdayUi.msg = ''; _bdayUi.err = false;
  renderBirthday();
  var inp = document.getElementById('bdayInput'); if (inp) inp.focus();
}
async function bdaySubmit() {
  if (!_bdayUi.pending || _bdayUi.busy) return;
  _bdayUi.busy = true; renderBirthday();
  try {
    var r = await apiFetch('/api/me/birthday', { method: 'POST', body: JSON.stringify({ birth_date: _bdayUi.pending }) });
    _bday = { linked: true, birth_date: r.birth_date, can_set: false, bonus_awarded_this_year: !!r.bonus_awarded_this_year, range: _bday && _bday.range };
    _bdayUi = { pending: '', msg: vt('bday_saved', 'Date of birth saved.'), err: false, busy: false, gift: !!r.bonus_awarded_this_year };
    if (r.bonus_awarded_this_year && typeof loadVibes === 'function') loadVibes(true);
  } catch (err) {
    var code = err.data && err.data.code;
    _bdayUi.busy = false; _bdayUi.err = true;
    if (err.status === 409 || code === 'already_set') {
      _bday = { linked: true, birth_date: (err.data && err.data.birth_date) || null, can_set: false, range: _bday && _bday.range };
      _bdayUi.pending = ''; _bdayUi.err = false;
      _bdayUi.msg = vt('bday_err_already', 'Your date of birth is already set. To change it, please contact the studio administrator.');
      if (!_bday.birth_date) loadBirthday();
    } else if (code === 'age_out_of_range') { _bdayUi.pending = ''; _bdayUi.msg = vt('bday_err_age', 'Please check the date: age must be between 10 and 100.'); }
    else if (code === 'invalid_date') { _bdayUi.pending = ''; _bdayUi.msg = vt('bday_err_invalid', 'Please enter a valid date of birth.'); }
    else _bdayUi.msg = vt('bday_err_fail', 'Could not save. Please try again later.');
  }
  _bdayUi.busy = false;
  renderBirthday();
}
function resetBirthday() {
  _bday = null; _bdayUi = { pending: '', msg: '', err: false, busy: false, gift: false };
  var s = document.getElementById('bdaySection'); if (s) s.hidden = true;
}
window.addEventListener('svs:langchange', function () { renderBirthday(); });
// account.js may already have opened the dashboard before this deferred script loaded.
(function () {
  var dash = document.getElementById('accDashboard');
  if (dash && dash.classList.contains('visible') && isTokenValid(getToken())) loadBirthday();
})();
