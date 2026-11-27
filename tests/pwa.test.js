// node tests/pwa.test.js — приложение на экране телефона (PWA, #104 / #105):
// манифест и иконки, правила service worker (что никогда не кэшируется), офлайн-заглушка
// на трёх языках, тексты нижнего меню и подсказки установки во всех языках.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('манифест: имя, старт, иконки 192/512 и maskable', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.strictEqual(m.name, 'Soul Vibe Space');
  assert.strictEqual(m.short_name, 'Soul Vibe');
  assert.ok(m.start_url.startsWith('/schedule'));
  assert.strictEqual(m.scope, '/');
  assert.strictEqual(m.display, 'standalone');
  const has = (s, p) => m.icons.some((i) => i.sizes === s && (i.purpose || 'any') === p);
  assert.ok(has('192x192', 'any') && has('512x512', 'any') && has('192x192', 'maskable') && has('512x512', 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(ROOT, i.src.replace(/^\//, ''))), i.src);
  for (const s of m.shortcuts || []) assert.ok(s.url.startsWith('/'), s.url);
});

const sw = read('sw.js');
const BYPASS = eval(sw.match(/var BYPASS = (\/.*\/);/)[1]);
t('service worker не трогает API, админку, оплату и вход', () => {
  for (const p of ['/api', '/api/me/vibes', '/api/payments/checkout', '/admin', '/admin/', '/admin/bookings',
    '/payment', '/payment.html', '/payment/', '/auth-callback', '/auth-callback.html', '/sw.js', '/.netlify/functions/x'])
    assert.ok(BYPASS.test(p), p);
  for (const p of ['/', '/schedule', '/account', '/style.css', '/images/logo-icon.png', '/payments-info', '/apix'])
    assert.ok(!BYPASS.test(p), p);
});
t('service worker: только свой сайт и GET, HTML не кэшируется', () => {
  assert.ok(/req\.method !== 'GET'/.test(sw));
  assert.ok(/url\.origin !== self\.location\.origin/.test(sw));
  assert.ok(/mode === 'navigate'/.test(sw));
  assert.ok(!/put\(req, res\);[^\n]*navigate/.test(sw));
  assert.ok(/var VERSION = '[^']+';/.test(sw));
});

t('офлайн-заглушка: три языка, без внешних файлов', () => {
  const h = read('app/offline.html');
  for (const s of ['Нет подключения к интернету', 'No internet connection', 'Δεν υπάρχει σύνδεση'])
    assert.ok(h.includes(s), s);
  // единственный файл — иконка, она лежит в кэше service worker (SHELL_FILES)
  assert.ok(!/(?:src|href)="(?!tel:|#|\/images\/app\/icon-192\.png")[^"]+"/.test(h), 'внешние ресурсы');
  assert.ok(sw.includes("'/images/app/icon-192.png'"));
});

global.window = { dispatchEvent() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => 1, querySelectorAll: () => [], documentElement: {} };
try { global.navigator = { language: 'en' }; } catch (_) { /* Node 21+ */ }
global.CustomEvent = function () {};
require('vm').runInThisContext(read('i18n.js') + '\n;globalThis.__T = SVS_TRANSLATIONS;');
const T = globalThis.__T;
const KEYS = ['pwa_tabs_label', 'pwa_tab_schedule', 'pwa_tab_classes', 'pwa_tab_passes', 'pwa_tab_vibes', 'pwa_tab_profile',
  'nav_passes', 'nav_group_studio', 'wa_tip', 'wa_aria', 'wa_text',
  'pwa_install_title', 'pwa_install_text', 'pwa_install_btn', 'pwa_install_close', 'pwa_ios_title', 'pwa_ios_steps',
  'pwa_offline_title', 'pwa_offline_text', 'pwa_offline_retry',
  'pwa_pop_text', 'pwa_how_btn', 'pwa_footer_link', 'pwa_sheet_title_ios', 'pwa_sheet_title_android', 'pwa_sheet_lead',
  'pwa_ios_s1', 'pwa_ios_s2', 'pwa_ios_s3', 'pwa_iosx_s1', 'pwa_iosx_s2', 'pwa_and_s1', 'pwa_and_s2', 'pwa_and_s3',
  'pwa_copy_link', 'pwa_copied', 'pwa_sheet_close', 'pwa_sheet_done'];
t('тексты приложения есть на RU/EN/EL', () => {
  for (const l of ['en', 'ru', 'el']) for (const k of KEYS) assert.ok(T[l][k], `${l}.${k}`);
  for (const l of ['en', 'ru', 'el']) assert.ok(T[l].pwa_ios_steps.includes('{share}'), l);
  assert.strictEqual(T.ru.pwa_tab_vibes, 'VIBES');
  for (const k of KEYS) assert.ok(!/пакет/i.test(T.ru[k]), k);
  // иконки в шагах инструкции — одинаковые во всех языках, без эмодзи
  for (const k of KEYS) {
    const marks = (l) => (T[l][k].match(/\{(share|add|menu)\}/g) || []).join();
    assert.strictEqual(marks('ru'), marks('en'), 'ru ' + k);
    assert.strictEqual(marks('el'), marks('en'), 'el ' + k);
    for (const l of ['en', 'ru', 'el']) assert.ok(!/\p{Extended_Pictographic}/u.test(T[l][k]), `${l}.${k} эмодзи`);
  }
  assert.ok(T.ru.pwa_ios_s1.includes('{share}') && T.ru.pwa_ios_s2.includes('{add}') && T.ru.pwa_and_s1.includes('{menu}'));
});
t('pwa.js использует только существующие ключи', () => {
  const used = [...read('pwa.js').matchAll(/'((?:pwa|wa)_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(used.length > 5);
  for (const k of used) assert.ok(T.en[k], k);
});

// ── Всплывашка и инструкция: pwa.js в маленьком поддельном браузере ──
const PWA_SRC = read('pwa.js');
const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iosInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101',
  iosTelegramLike: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  iPadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.parentNode = null; this.id = ''; this.innerHTML = ''; this.style = {};
    const set = new Set(); this.classList = { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c), toggle: (c, f) => (f ? set.add(c) : set.delete(c), f) }; this.listeners = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k]; } removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c) { return this.appendChild(c); }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  get isConnected() { let e = this; while (e.parentNode) e = e.parentNode; return e.tagName === 'BODY'; }
  get offsetParent() { return this.isConnected ? {} : null; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  querySelector() { return null; } querySelectorAll() { return []; }
  find(id) { if (this.id === id) return this; for (const c of this.children) { const r = c.find(id); if (r) return r; } return null; }
}
function browser(o) {
  o = Object.assign({ ua: UA.iosSafari, platform: 'iPhone', touch: 5, width: 390, standalone: false, path: '/', store: {} }, o);
  const timers = []; const winL = {}; const store = Object.assign({}, o.store);
  const body = new El('body'); const html = new El('html');
  const D = { readyState: 'complete', body, documentElement: html, activeElement: null,
    getElementById: (id) => body.find(id), createElement: (t) => new El(t), querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {} };
  const W = { navigator: { userAgent: o.ua, platform: o.platform, maxTouchPoints: o.touch, standalone: o.standalone || undefined },
    location: { pathname: o.path, hash: '', search: '', protocol: 'https:', hostname: 'app.soulvibespace.com', origin: 'https://app.soulvibespace.com' },
    matchMedia: (q) => ({ matches: /display-mode:\s*standalone/.test(q) ? o.standalone : /max-width:\s*900px/.test(q) ? o.width <= 900 : /pointer:\s*coarse/.test(q) ? o.touch > 0 : false }),
    addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f); }, removeEventListener: (t, f) => { winL[t] = (winL[t] || []).filter((x) => x !== f); },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, requestAnimationFrame: (f) => f(),
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; }, SVS_I18N: null };
  W.window = W; W.document = D;
  const ctx = require('vm').createContext(Object.assign(W, { Promise, Date, Number, String, Array, Object, RegExp, JSON, Math }));
  require('vm').runInContext(PWA_SRC, ctx);
  const fire = (t, ev) => (winL[t] || []).slice().forEach((f) => f(ev || {}));
  const runTimers = () => { const list = timers.splice(0); list.forEach((x) => x.f()); return list; };
  return { W, D, P: W.SVS_PWA, timers, fire, runTimers, store, body };
}
t('установка: Safari, другой браузер на iPhone, iPad, Android, системное окно', () => {
  assert.strictEqual(browser({ ua: UA.iosSafari }).P.installMode(), 'ios');
  assert.strictEqual(browser({ ua: UA.iosChrome }).P.installMode(), 'ios-other');
  assert.strictEqual(browser({ ua: UA.iosInstagram }).P.installMode(), 'ios-other');
  assert.strictEqual(browser({ ua: UA.iosTelegramLike }).P.installMode(), 'ios-other');
  assert.strictEqual(browser({ ua: UA.iPadSafari, platform: 'MacIntel', touch: 5, width: 820 }).P.installMode(), 'ios');
  const a = browser({ ua: UA.android, platform: 'Linux armv8l' });
  assert.strictEqual(a.P.installMode(), 'android');
  a.fire('beforeinstallprompt', { preventDefault() {}, prompt() {} });
  assert.strictEqual(a.P.installMode(), 'prompt');
});
t('всплывашка: только телефон, нужные страницы, не в приложении, 14 дней после закрытия', () => {
  for (const p of ['/', '/schedule', '/classes', '/pricing', '/vibes', '/account', '/ru/schedule', '/el/pricing', '/pricing.html'])
    assert.ok(browser({ path: p }).P.popupAllowed(), p);
  for (const p of ['/payment', '/auth-callback', '/admin', '/admin/bookings', '/404', '/404.html', '/terms'])
    assert.ok(!browser({ path: p }).P.popupAllowed(), p);
  assert.ok(!browser({ standalone: true }).P.popupAllowed(), 'standalone');
  assert.ok(!browser({ ua: UA.desktop, platform: 'Win32', touch: 0, width: 1440 }).P.popupAllowed(), 'компьютер');
  assert.ok(!browser({ store: { svs_pwa_hint_closed: String(Date.now() - 3 * 864e5) } }).P.popupAllowed(), 'закрыли 3 дня назад');
  assert.ok(browser({ store: { svs_pwa_hint_closed: String(Date.now() - 15 * 864e5) } }).P.popupAllowed(), 'закрыли 15 дней назад');
  assert.ok(!browser({ store: { svs_pwa_installed: '1' } }).P.popupAllowed(), 'установлено');
});
t('всплывашка через ~3 с и никогда поверх баннера cookie', () => {
  const b = browser({ path: '/' });
  const first = b.timers.find((x) => x.ms >= 2500 && x.ms <= 3000);
  assert.ok(first, 'таймер 2,5–3 с');
  const cookie = new El('div'); cookie.id = 'svs-cookie-banner'; b.body.appendChild(cookie);
  b.runTimers();
  assert.ok(!b.D.getElementById('svsInstallPop'), 'не показываемся при баннере cookie');
  b.fire('svs:consent');                     // баннер ещё на экране — ждём дальше
  assert.strictEqual(b.timers.length, 0);
  cookie.remove(); b.fire('svs:consent');
  assert.strictEqual(b.timers.length, 1);
  b.runTimers();
  const pop = b.D.getElementById('svsInstallPop');
  assert.ok(pop && pop.classList.contains('is-in'));
  assert.ok(pop.innerHTML.includes('/images/app/icon-192.png') && pop.innerHTML.includes('data-act="close"'));
  assert.ok(pop.innerHTML.includes('How to install'));
  pop.listeners.click[0]({ target: { closest: () => ({ getAttribute: () => 'close' }) } });
  assert.ok(Number(b.store.svs_pwa_hint_closed) > Date.now() - 5000, 'закрыли — запомнили');
});
t('инструкция: три шага, «Скопировать ссылку» только для iPhone в другом браузере', () => {
  const s = browser({ ua: UA.iosSafari }); s.P.openSheet('ios');
  const ios = s.D.getElementById('svsInstallSheet').innerHTML;
  assert.strictEqual((ios.match(/class="svs-step"/g) || []).length, 3);
  assert.ok(!ios.includes('data-act="copy"') && ios.includes('M12 3.5v11') && ios.includes('aria-modal="true"'));
  const o = browser({ ua: UA.iosChrome }); o.P.openSheet('ios-other');
  const other = o.D.getElementById('svsInstallSheet').innerHTML;
  assert.strictEqual((other.match(/class="svs-step"/g) || []).length, 3);
  assert.ok(other.includes('data-act="copy"') && other.includes('Safari'));
  const a = browser({ ua: UA.android }); a.P.openSheet('android');
  assert.ok(a.D.getElementById('svsInstallSheet').innerHTML.includes('r="1.4"'), 'значок меню ⋮');
});
t('нижнее меню: 5 вкладок, подписи Виктории', () => {
  const tabs = JSON.parse(JSON.stringify(browser({}).P.tabs)).map((x) => [x.href, T.ru[x.key], T.en[x.key], T.el[x.key]]);
  assert.deepStrictEqual(tabs, [
    ['/schedule', 'Расписание', 'Schedule', 'Πρόγραμμα'],
    ['/classes', 'Занятия', 'Classes', 'Μαθήματα'],
    ['/pricing', 'Абонементы', 'Passes', 'Πάσα'],
    ['/vibes', 'VIBES', 'VIBES', 'VIBES'],
    ['/account', 'Профиль', 'Profile', 'Προφίλ']]);
  const b = browser({ path: '/ru/pricing' });
  assert.strictEqual(b.P.activeTab(), 'pricing');
  assert.strictEqual(browser({ path: '/account' }).P.activeTab(), 'profile');
  assert.strictEqual(browser({ path: '/about' }).P.activeTab(), '');
});
t('нижнее меню: в обычном браузере и в приложении, кроме оплаты, входа и админки', () => {
  for (const o of [{}, { standalone: true }, { ua: UA.android }]) {
    const b = browser(Object.assign({ path: '/' }, o));
    assert.ok(b.D.documentElement.classList.contains('svs-tabs'), JSON.stringify(o));
    assert.ok(b.body.children.some((c) => c.className === 'svs-tabbar'), 'меню на странице');
    assert.strictEqual(b.D.documentElement.classList.contains('svs-standalone'), !!o.standalone);
  }
  for (const p of ['/payment', '/auth-callback', '/admin', '/admin/bookings', '/ru/payment']) {
    const b = browser({ path: p });
    assert.ok(!b.P.tabsAllowed() && !b.D.documentElement.classList.contains('svs-tabs'), p);
    assert.ok(!b.body.children.some((c) => c.className === 'svs-tabbar'), p);
  }
  const css = read('style.css');
  assert.ok(/@media \(max-width: 900px\) \{\s*html\.svs-tabs \{ --svs-tabbar-h/.test(css), 'меню только до 900px');
  assert.ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'));
  assert.ok(/\.svs-tab \{[^}]*min-height: 54px/.test(css));
  assert.ok(css.includes('html.svs-tabs body { padding-bottom: var(--svs-tabbar-full); }'));
  assert.ok(css.includes('html.svs-tabs #svs-cookie-banner { bottom: var(--svs-tabbar-full) !important; }'));
  assert.ok(css.includes('html.svs-tabs .svs-pop { bottom: calc(var(--svs-tabbar-full) + 10px); }'));
  for (const m of read('pwa.js').matchAll(/<svg[^>]*>/g)) if (/stroke-width/.test(m[0])) assert.ok(/stroke-width="1\.75"/.test(m[0]), m[0]);
});
t('WhatsApp: ссылка, новая вкладка, подпись, скрыт на /admin и /auth-callback', () => {
  const b = browser({ path: '/' });
  const a = b.D.getElementById('svsWa');
  assert.ok(a, 'кнопка есть');
  assert.strictEqual(a.target, '_blank'); assert.strictEqual(a.rel, 'noopener');
  assert.ok(a.href.startsWith('https://wa.me/35795642888?text='), a.href);
  assert.ok(decodeURIComponent(a.href.split('text=')[1]).includes('Soul Vibe Space website'));
  for (const l of ['en', 'ru', 'el']) assert.ok(T[l].wa_text.includes('Soul Vibe Space'), l);
  assert.strictEqual(a.getAttribute('aria-label'), T.en.wa_aria);
  assert.strictEqual(T.ru.wa_tip, 'Написать администратору');
  assert.strictEqual(T.en.wa_tip, 'Chat with us');
  assert.strictEqual(T.el.wa_tip, 'Επικοινωνία στο WhatsApp');
  for (const p of ['/admin', '/admin/x', '/auth-callback', '/el/auth-callback']) assert.ok(!browser({ path: p }).D.getElementById('svsWa'), p);
  assert.ok(browser({ path: '/payment' }).D.getElementById('svsWa'), '/payment — кнопка остаётся');
});
t('WhatsApp прячется при окне, меню, cookie и всплывашке установки', () => {
  const b = browser({ path: '/about' });
  assert.ok(!b.P.waBlocked());
  const cookie = new El('div'); cookie.id = 'svs-cookie-banner'; b.body.appendChild(cookie);
  assert.ok(b.P.waBlocked(), 'cookie'); cookie.remove();
  b.body.style.overflow = 'hidden'; assert.ok(b.P.waBlocked(), 'модальное окно'); b.body.style.overflow = '';
  b.D.documentElement.classList.add('svs-sheet-open'); assert.ok(b.P.waBlocked(), 'инструкция'); b.D.documentElement.classList.remove('svs-sheet-open');
  const nav = new El('div'); nav.id = 'mobileNav'; nav.classList.add('is-open'); b.body.appendChild(nav);
  assert.ok(b.P.waBlocked(), 'мобильное меню'); nav.classList.remove('is-open');
  assert.ok(!b.P.waBlocked());
  b.fire('svs:consent');
  assert.ok(!b.D.getElementById('svsWa').classList.contains('is-hidden'));
});
t('мобильное меню: две группы, без «Мой кабинет», соцсети одним рядом', () => {
  const h = read('tools/header.html');
  const mob = h.slice(h.indexOf('id="mobileNav"'));
  const hrefs = [...mob.matchAll(/class="mobile-nav-link" data-i18n="([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(hrefs, ['nav_schedule', 'nav_classes', 'nav_passes', 'nav_vibes', 'footer_gift', 'nav_about', 'nav_rent', 'nav_reviews', 'nav_contact']);
  assert.ok(!mob.includes('nav_account'));
  assert.ok(mob.includes('mobile-nav-group--main') && mob.includes('data-i18n="nav_group_studio"'));
  const social = mob.slice(mob.indexOf('mobile-nav-social'));
  assert.deepStrictEqual([...social.matchAll(/aria-label="([A-Za-z]+)"/g)].map((m) => m[1]), ['Instagram', 'TikTok', 'WhatsApp']);
  assert.strictEqual(T.ru.nav_passes, 'Абонементы'); assert.strictEqual(T.ru.nav_group_studio, 'О студии');
  assert.strictEqual(T.en.nav_group_studio, 'Studio'); assert.strictEqual(T.el.nav_group_studio, 'Στούντιο');
});
console.log(`${n} проверок пройдено`);
