#!/usr/bin/env node
// Словари сайта (i18n.js + i18n-about.js + i18n-legal.js) → JSON для tools/i18n_build.py.
// Значения — как их показывает SVS_I18N.t(): с раскрытыми {{терминами}} и %%ценами%% на языке.
//   node tools/i18n-dump.js            → {"en":{key:value}, "ru":{…}, "el":{…}, "missing":{"ru":[…], "el":[…]}}
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.window = global;
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => null,
  querySelectorAll: () => [], documentElement: {}, getElementById: () => null,
  createElement: () => ({ setAttribute() {}, style: {} }), head: { appendChild() {} }, body: { appendChild() {}, getAttribute: () => null } };
try { global.navigator = { language: 'en' }; } catch (_) { /* Node 21+ */ }
global.CustomEvent = function () {};
global.dispatchEvent = function () {};
global.addEventListener = function () {};
global.location = { pathname: '/' };
// runInThisContext, а не require: верхнеуровневые const (SVS_TRANSLATIONS) видны следующему скрипту.
for (const f of ['i18n-about.js', 'i18n-legal.js', 'i18n.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const T = vm.runInThisContext('typeof SVS_TRANSLATIONS !== "undefined" ? SVS_TRANSLATIONS : null');
if (!T) { console.error('i18n.js: нет SVS_TRANSLATIONS'); process.exit(1); }
const out = { missing: {} };
for (const lang of ['en', 'ru', 'el']) {
  const d = {};
  for (const key of Object.keys(T.en)) {
    const raw = T[lang][key] !== undefined ? T[lang][key] : T.en[key];
    d[key] = window.svsExpandPrices(window.svsExpandTerms(String(raw), lang), lang);
  }
  for (const key of Object.keys(T[lang])) if (d[key] === undefined) {
    d[key] = window.svsExpandPrices(window.svsExpandTerms(String(T[lang][key]), lang), lang);
  }
  out[lang] = d;
  if (lang !== 'en') out.missing[lang] = Object.keys(T.en).filter((k) => T[lang][k] === undefined);
}
process.stdout.write(JSON.stringify(out));
