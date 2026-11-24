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
const KEYS = ['pwa_tabs_label', 'pwa_tab_schedule', 'pwa_tab_bookings', 'pwa_tab_vibes', 'pwa_tab_profile',
  'pwa_install_title', 'pwa_install_text', 'pwa_install_btn', 'pwa_install_close', 'pwa_ios_title', 'pwa_ios_steps',
  'pwa_offline_title', 'pwa_offline_text', 'pwa_offline_retry'];
t('тексты приложения есть на RU/EN/EL', () => {
  for (const l of ['en', 'ru', 'el']) for (const k of KEYS) assert.ok(T[l][k], `${l}.${k}`);
  for (const l of ['en', 'ru', 'el']) assert.ok(T[l].pwa_ios_steps.includes('{share}'), l);
  assert.strictEqual(T.ru.pwa_tab_vibes, 'VIBES');
  for (const k of KEYS) assert.ok(!/пакет/i.test(T.ru[k]), k);
});
t('pwa.js использует только существующие ключи', () => {
  const used = [...read('pwa.js').matchAll(/'(pwa_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(used.length > 5);
  for (const k of used) assert.ok(T.en[k], k);
});
console.log(`${n} проверок пройдено`);
