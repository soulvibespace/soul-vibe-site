// node tests/i18n-urls.test.js — языковые адреса /ru/…, /el/… (S2, #133).
// i18n.js: язык из пути, setLang на языковом адресе ведёт на версию страницы;
// dist/: <html lang>, hreflang, sitemap, ссылки, 404-правила. Запускать после bash build.sh.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

function page(pathname, saved) {
  const store = saved ? { svs_lang: saved } : {};
  const links = {};
  ['en', 'ru', 'el'].forEach((l) => {
    const name = pathname.replace(/^\/(ru|el)(?=\/|$)/, '') || '/';
    const href = l === 'en' ? name : '/' + l + (name === '/' ? '/' : name);
    links[l] = { getAttribute: (a) => (a === 'href' ? href : l) };
  });
  const ctx = {
    location: { pathname, search: '', hash: '', href: pathname },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    navigator: { language: 'en' },
    CustomEvent: function () {},
    document: {
      readyState: 'complete', documentElement: {}, addEventListener() {},
      querySelector: (sel) => { const m = /data-lang-btn="(\w+)"/.exec(sel); return m ? links[m[1]] : 1; },
      querySelectorAll: () => [], getElementById: () => null,
    },
  };
  ctx.window = ctx; ctx.dispatchEvent = () => {}; ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, store, I: ctx.SVS_I18N };
}

t('язык из пути важнее сохранённого', () => {
  const p = page('/ru/pricing', 'el');
  assert.strictEqual(p.I.getLang(), 'ru');
  assert.strictEqual(p.ctx.document.documentElement.lang, 'ru');
  assert.strictEqual(p.store.svs_lang, 'ru');
});
t('EN без префикса — как раньше (сохранённый язык)', () => {
  assert.strictEqual(page('/pricing', 'ru').I.getLang(), 'ru');
  assert.strictEqual(page('/pricing').I.getLang(), 'en');
});
t('setLang на /ru/… ведёт на /el/… и запоминает выбор', () => {
  const p = page('/ru/about');
  p.I.setLang('el');
  assert.strictEqual(p.ctx.location.href, '/el/about');
  assert.strictEqual(p.store.svs_lang, 'el');
  const q = page('/el/');
  q.I.setLang('en');
  assert.strictEqual(q.ctx.location.href, '/');
});
t('/ruble — не языковой адрес', () => {
  assert.strictEqual(page('/ruble').I.getLang(), 'en');
});

const has = (s, re, msg) => assert.ok(re.test(s), (msg || '') + ' ' + re);
const hasNot = (s, re, msg) => assert.ok(!re.test(s), (msg || '') + ' ' + re);
const read = (f) => fs.readFileSync(path.join(DIST, f), 'utf8');
if (fs.existsSync(path.join(DIST, 'ru', 'pricing.html'))) {
  t('dist: <html lang>, hreflang ×4, svs_lang в <head>', () => {
    for (const [f, lang] of [['pricing.html', 'en'], ['ru/pricing.html', 'ru'], ['el/pricing.html', 'el']]) {
      const s = read(f);
      has(s, new RegExp('<html[^>]*\\slang="' + lang + '"'), f);
      for (const h of ['en', 'ru', 'el', 'x-default']) has(s, new RegExp('hreflang="' + h + '" href="[^"]+"'), f + ' ' + h);
      has(s, /hreflang="ru" href="[^"]*\/ru\/pricing"/);
      has(s, /hreflang="x-default" href="[^"]*\/pricing"/);
    }
    has(read('ru/index.html'), /hreflang="ru" href="[^"]*\/ru\/"/);
    has(read('ru/pricing.html'), /localStorage\.setItem\("svs_lang","ru"\)/);
  });
  t('dist: переключатель — ссылки, меню ведёт на /ru/…', () => {
    const s = read('ru/pricing.html');
    has(s, /<a[^>]*data-lang-btn="en"[^>]*href="\/pricing"/);
    has(s, /<a[^>]*data-lang-btn="ru"[^>]*href="\/ru\/pricing"[^>]*aria-current="true"/);
    has(s, /href="\/ru\/schedule"/);
    hasNot(s, /<button[^>]*data-lang-btn/);
    has(read('pricing.html'), /<a[^>]*data-lang-btn="el"[^>]*href="\/el\/pricing"/);
  });
  t('dist: тексты и термины на RU', () => {
    const s = read('ru/pricing.html');
    has(s, /<title[^>]*>[^<]*абонемент/);
    has(s, /Стартер пак/);
    const body = s.replace(/<script[\s\S]*?<\/script>/g, '');
    hasNot(body, /пакет|программа лояльности/i);
  });
  t('dist: sitemap со всеми языками и xhtml:link', () => {
    const s = read('sitemap.xml');
    has(s, /xmlns:xhtml=/);
    has(s, /<loc>[^<]*\/ru\/pricing<\/loc>/);
    has(s, /<loc>[^<]*\/el\/<\/loc>/);
    hasNot(s, /\/ru\/account|\/ru\/404/);
    has(s, /<xhtml:link rel="alternate" hreflang="x-default"/);
  });
  t('dist: служебные страницы — без языковых копий и noindex', () => {
    assert.ok(!fs.existsSync(path.join(DIST, 'ru', 'payment.html')));
    assert.ok(!fs.existsSync(path.join(DIST, 'el', 'auth-callback.html')));
    has(read('ru/account.html'), /<meta name="robots" content="noindex/);
  });
}
t('netlify.toml: 404 на языке раздела', () => {
  const s = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  has(s, /from = "\/ru\/\*"\s+to = "\/ru\/404\.html"\s+status = 404/);
  has(s, /from = "\/el\/\*"\s+to = "\/el\/404\.html"\s+status = 404/);
});
t('netlify.toml: 301 /ru|/el со старых /space и /price-list — выше 404-правил', () => {
  const s = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  const at = (from) => s.indexOf('from = "' + from + '"');
  for (const l of ['ru', 'el']) {
    for (const [from, to] of [['space', 'about'], ['price-list', 'rental']]) {
      for (const suf of ['', '.html']) {
        const re = new RegExp('from = "/' + l + '/' + from + suf.replace('.', '\\.') + '"\\s+to = "/' + l + '/' + to + '"\\s+status = 301\\s+force = true');
        assert.ok(re.test(s), l + '/' + from + suf);
        assert.ok(at('/' + l + '/' + from + suf) < at('/' + l + '/*'), 'порядок ' + l + '/' + from + suf);
      }
    }
  }
  if (fs.existsSync(DIST)) for (const f of ['ru/space.html', 'el/price-list.html']) assert.ok(!fs.existsSync(path.join(DIST, f)), f);
});
console.log(`i18n-urls: ${n} тестов ок`);
