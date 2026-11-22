// node tests/payments.test.js — онлайн-покупка (#119): тексты RU/EN/EL на месте, термины раскрыты,
// нет слова «пакет», кнопки подключены только через buy-online.js (цена с сайта не уходит).
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.window = { dispatchEvent() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => 1, querySelectorAll: () => [], documentElement: {} };
global.CustomEvent = function () {};
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8') + ';globalThis.__T = SVS_TRANSLATIONS;');
const T = global.__T;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const keys = Object.keys(T.en).filter(k => /^payr_|^pay_(buy|buy_wait|see_passes|cancelled|err_\w+)$|_online$/.test(k));
t('ключей оплаты достаточно', () => assert.ok(keys.length >= 28, keys.length));
for (const lang of ['ru', 'en', 'el']) {
  t(`все тексты есть и раскрыты (${lang})`, () => {
    for (const k of keys) {
      assert.ok(T[lang][k], `${lang}.${k} нет`);
      const v = svsExpandTerms(T[lang][k], lang);
      assert.ok(!/\{\{/.test(v), `${lang}.${k}: ${v}`);
      assert.ok(!/пакет/i.test(v), `${lang}.${k}: «пакет»`);
      assert.ok(!/программ\S* лояльности|бонусн/i.test(v), `${lang}.${k}: VIBES — валюта практики`);
    }
  });
}
t('buy-online.js не отправляет цену', () => {
  const src = fs.readFileSync(path.join(ROOT, 'buy-online.js'), 'utf8');
  assert.match(src, /JSON\.stringify\(\{ plan: plan, lang: lang\(\) \}\)/);
  assert.match(src, /\/api\/payments\/config/);
  assert.match(src, /checkout\\\.stripe\\\.com/);
});
t('pricing подключает buy-online.js, страница /payment — noindex', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'pricing.html'), 'utf8'), /<script defer src="buy-online\.js"><\/script>/);
  const pay = fs.readFileSync(path.join(ROOT, 'payment.html'), 'utf8');
  assert.match(pay, /noindex/);
  assert.match(pay, /payment-result\.js/);
});
console.log(`${n} тестов: ок`);
