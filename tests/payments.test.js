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
t('«Спасибо» показывает срок в днях, без даты окончания (#65)', () => {
  for (const lang of ['ru', 'en', 'el']) {
    assert.match(T[lang].payr_ok_text, /\{days\}/, lang);
    assert.ok(!/\{date\}/.test(T[lang].payr_ok_text + T[lang].payr_ok_text_nodays), lang);
  }
  const src = fs.readFileSync(path.join(ROOT, 'payment-result.js'), 'utf8');
  assert.match(src, /validity_days/);
  assert.ok(!/expires_at/.test(src));
});
t('«Спасибо» и кабинет: срок «N дней с первого посещения» на RU/EN/EL (#65 GAP-01)', () => {
  const first = { ru: /с первого посещения/, en: /from the first visit/, el: /από την πρώτη επίσκεψη/ };
  for (const lang of ['ru', 'en', 'el']) {
    assert.match(T[lang].payr_ok_text, first[lang], lang);
    assert.match(T[lang].vibes_first_visit, /\{days\}/, lang);
    assert.match(T[lang].vibes_first_visit, first[lang], lang);
    assert.ok(!/пакет/i.test(T[lang].payr_ok_text + T[lang].vibes_first_visit), lang);
  }
  const acc = fs.readFileSync(path.join(ROOT, 'account.js'), 'utf8');
  const fn = acc.slice(acc.indexOf('function vibesDays'), acc.indexOf('function vibesClassesLeft'));
  const sandbox = { window: { SVS_I18N: { getLang: () => 'ru' } }, vt: (k, d) => T.ru[k] || d, vibesDate: s => s.slice(0, 10) };
  const vm = require('vm'); vm.createContext(sandbox); vm.runInContext(fn, sandbox);
  assert.equal(sandbox.vibesLotTerm({ validity_days: 30, expires_at: null, activated_at: null }), 'срок 30\u00a0дней с первого посещения');
  assert.equal(sandbox.vibesLotTerm({ validity_days: 60, expires_at: '2026-12-20T23:59:59.999Z', activated_at: '2026-10-21' }), 'действует до 2026-12-20');
  assert.equal(sandbox.vibesLotTerm({ expires_at: null }), 'без срока');
  sandbox.window.SVS_I18N.getLang = () => 'el';
  assert.equal(sandbox.vibesDays(1), '1\u00a0ημέρα');
});
console.log(`${n} тестов: ок`);
