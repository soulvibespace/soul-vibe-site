// node tests/prices.test.js — цифры VIBES: расчёт в i18n.js (svsPriceValues) и в tools/prices.py совпадают,
// ключевые значения — как в согласованной таблице выгоды.
'use strict';
const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');
global.window = { dispatchEvent() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => 1, querySelectorAll: () => [], documentElement: {} };
try { global.navigator = { language: 'en' }; } catch (_) { /* Node 21+: navigator уже есть */ }
global.CustomEvent = function () {};
require('../i18n.js');
const ROOT = path.join(__dirname, '..');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
for (const lang of ['en', 'ru', 'el']) {
  t(`JS = Python (${lang})`, () => {
    const js = window.svsPriceValues(lang), out = {};
    Object.keys(js).forEach((k) => { out[k] = String(js[k]); });
    const py = JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools/prices.py'), '--dump', lang]).toString());
    assert.deepStrictEqual(out, py);
  });
}
const ru = window.svsPriceValues('ru');
t('цена занятия и выгода', () => {
  assert.deepStrictEqual(['MP4', 'MP8', 'MP12', 'MP20'].map((c) => ru[c + '.per'] + ' ' + ru[c + '.save']),
    ['€17,50 12%', '€16,25 19%', '€15,83 21%', '€15 25%']);
  assert.deepStrictEqual(['SP1', 'SP2', 'SP4'].map((c) => ru[c + '.per']), ['€15', '€10', '€10']);
  assert.strictEqual(ru.min_per, '€15'); assert.strictEqual(ru.max_save, '25%');
});
t('абонемент vs обычное пополнение', () => {
  assert.deepStrictEqual([ru['MP20.vibes'], ru['MP20.topup_vibes'], ru['MP20.classes'], ru['MP20.topup_classes']], [400, 300, 20, 15]);
});
t('пример MP20 + бонусы', () => {
  assert.deepStrictEqual([ru['ex.total'], ru['ex.classes'], ru['ex.per']], [417, 20, '€14,40']);
});
t('склонение «занятие»', () => {
  assert.strictEqual(ru['ex.classes_word'], 'занятий');
  const w = (n, l) => window.svsClassWord(n, l);
  assert.deepStrictEqual([1, 2, 5, 11, 12, 21, 22, 25, 111, 104].map((n) => w(n, 'ru')),
    ['занятие', 'занятия', 'занятий', 'занятий', 'занятий', 'занятие', 'занятия', 'занятий', 'занятий', 'занятия']);
  assert.deepStrictEqual([w(1, 'en'), w(21, 'en'), w(1, 'el'), w(21, 'el')], ['class', 'classes', 'μάθημα', 'μαθήματα']);
});
t('svsExpandPrices', () => {
  assert.strictEqual(window.svsExpandPrices('%%MP4.per%% / class · %%nope%%', 'en'), '€17.50 / class · %%nope%%');
});
console.log(`prices: ${n} ok`);
