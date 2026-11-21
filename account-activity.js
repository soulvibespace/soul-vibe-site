/**
 * Soul Vibe Space — «Бонус за активность» в личном кабинете (/account), ACT-001.
 * За календарный месяц (по Кипру) 4–9 посещений → +10 VIBES, 10 и больше → +20 VIBES.
 * Бонус начисляет панель VIBES автоматически 1-го числа за прошлый месяц; здесь только
 * прогресс текущего месяца и бонусы прошлых месяцев. Данные — поле `activity` ответа
 * GET /api/me/vibes (soul-vibe-api → панель VIBES), отдельного запроса нет.
 * Блок показывается всем клиентам с привязанной карточкой VIBES, даже без абонемента.
 * Использует общие функции account.js: escHtml, vt, _vibesData.
 */
function actLang() { return window.SVS_I18N ? window.SVS_I18N.getLang() : 'en'; }
function actLocale() { var l = actLang(); return l === 'ru' ? 'ru-RU' : l === 'el' ? 'el-GR' : 'en-GB'; }
function actPlural(base, n) {
  var form = 'other';
  try { form = new Intl.PluralRules(actLocale()).select(n); } catch (_) {}
  var s = vt(base + '_' + form, '');
  return s || vt(base + '_other', '');
}
function actMonth(month, key) {
  var i = Number(String(month).slice(5, 7)) - 1;
  var en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var list = vt(key, en.join(',')).split(',');
  return list[i] || en[i] || month;
}
function actFill(s, map) {
  return String(s).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m; });
}
function actCap(s) { return s ? s.charAt(0).toLocaleUpperCase(actLocale()) + s.slice(1) : s; }
function actDay(ymd) {
  var d = new Date(ymd + 'T00:00:00Z');
  if (isNaN(d)) return ymd;
  return d.toLocaleDateString(actLocale(), { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Pure text model of the block (also used by the tests). */
function activityView(a) {
  var tiers = (a.tiers || []).slice().sort(function (x, y) { return x.visits - y.visits; });
  var top = tiers.length ? tiers[tiers.length - 1] : { visits: 10, vibes: 20 };
  var n = Number(a.visits) || 0;
  var inM = actMonth(a.month, 'act_months_in'), mon = actMonth(a.month, 'act_months');
  var lines = [];
  lines.push(n > 0
    ? actFill(vt('act_visits', 'In {in} you have been to class {n} {times}.'), { in: inM, n: n, times: actPlural('act_times', n) })
    : actFill(vt('act_visits_zero', 'In {in} you have not been to class yet.'), { in: inM }));
  var status;
  if (!a.next) status = actFill(vt('act_max', 'Maximum bonus +{v} VIBES for {mon}.'), { v: a.earned_vibes || top.vibes, mon: mon, in: inM });
  else if (!n) status = actFill(vt('act_next_zero', '{r} {visits} and you get +{v} VIBES.'), { r: a.next.remaining, visits: actPlural('act_visit', a.next.remaining), v: a.next.vibes });
  else if (!a.earned_vibes) status = actFill(vt('act_next_first', '{r} more and you get +{v} VIBES.'), { r: a.next.remaining, v: a.next.vibes });
  else status = actFill(vt('act_next_more', '+{e} VIBES are already yours, {r} more to +{v}.'), { e: a.earned_vibes, r: a.next.remaining, v: a.next.vibes });
  var credit = a.earned_vibes && a.credited_on ? actFill(vt('act_credit', 'The bonus is added automatically on {date}.'), { date: actDay(a.credited_on) }) : '';
  var rule = tiers.length === 2 ? actFill(vt('act_rule', '{a}–{b} visits a month — +{x} VIBES, {c} or more — +{y} VIBES. Bonus VIBES never expire.'),
    { a: tiers[0].visits, b: tiers[1].visits - 1, x: tiers[0].vibes, c: tiers[1].visits, y: tiers[1].vibes }) : '';
  return { visits: n, top: top.visits, tiers: tiers, lines: lines, status: status, credit: credit, rule: rule, max: !a.next };
}

function renderActivity() {
  var section = document.getElementById('activitySection');
  var box = document.getElementById('activityContainer');
  if (!section || !box) return;
  var d = typeof _vibesData !== 'undefined' ? _vibesData : null;
  var a = d && d.linked ? d.activity : null;
  if (!a || a.active === false || !a.month) { section.hidden = true; box.innerHTML = ''; return; }
  var v = activityView(a);
  var pct = Math.max(0, Math.min(100, v.visits / v.top * 100));
  var h = '<p class="act-lead">' + escHtml(v.lines[0]) + '</p>'
    + '<p class="act-status' + (v.max ? ' act-status--max' : '') + '">' + escHtml(v.status) + '</p>'
    + '<div class="act-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + v.top + '" aria-valuenow="' + Math.min(v.visits, v.top) + '" aria-label="'
    + escHtml(actFill(vt('act_bar_label', 'Visits this month: {n} of {max}'), { n: v.visits, max: v.top })) + '">'
    + '<div class="act-bar-track"><div class="act-bar-fill" style="width:' + pct.toFixed(1) + '%"></div>';
  v.tiers.forEach(function (t) {
    var at = Math.min(100, t.visits / v.top * 100);
    h += '<span class="act-mark' + (v.visits >= t.visits ? ' done' : '') + (at > 92 ? ' end' : '') + '" style="left:' + at.toFixed(1) + '%">'
      + '<span class="act-mark-label">' + t.visits + ' · +' + t.vibes + '</span></span>';
  });
  h += '</div></div>';
  if (v.credit) h += '<p class="act-note">' + escHtml(v.credit) + '</p>';
  if (v.rule) h += '<p class="act-note act-rule">' + escHtml(v.rule) + '</p>';
  var hist = (a.history || []).filter(function (x) { return x.month !== a.month; });
  if (hist.length) {
    h += '<p class="vibes-sub">' + escHtml(vt('act_history', 'Previous months')) + '</p><ul class="vibes-list">';
    hist.slice(0, 6).forEach(function (x) {
      h += '<li class="vibes-row"><span class="vibes-row-main"><span class="vibes-row-title">' + escHtml(actCap(actMonth(x.month, 'act_months')) + ' ' + x.month.slice(0, 4)) + '</span>'
        + '<span class="vibes-row-meta">' + escHtml(x.visits + ' ' + actPlural('act_visit', x.visits)) + '</span></span>'
        + '<span class="vibes-row-amount plus">+' + escHtml(String(x.vibes)) + ' VIBES</span></li>';
    });
    h += '</ul>';
  }
  section.hidden = false;
  box.innerHTML = h;
}
function resetActivity() {
  var s = document.getElementById('activitySection'); if (s) s.hidden = true;
  var b = document.getElementById('activityContainer'); if (b) b.innerHTML = '';
}
window.addEventListener('svs:langchange', function () { renderActivity(); });
// account.js may already have loaded VIBES before this deferred script.
renderActivity();
if (typeof module !== 'undefined') module.exports = { activityView: activityView };
