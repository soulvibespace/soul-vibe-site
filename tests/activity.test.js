// node tests/activity.test.js — тексты блока «Бонус за активность» (account-activity.js) на RU/EN/EL.
'use strict';
const assert = require('assert');
global.window = { dispatchEvent() {}, addEventListener() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => 1, querySelectorAll: () => [], documentElement: {}, getElementById: () => null };
try { global.navigator = { language: 'en' }; } catch (_) { /* Node 21+ */ }
global.CustomEvent = function () {};
require('../i18n.js');
const I = window.SVS_I18N;
global.vt = (k, fb) => { const v = I.t(k); return v && v !== k ? v : fb; };
global.escHtml = (s) => String(s);
const { activityView } = require('../account-activity.js');

const TIERS = [{ tier: 1, visits: 4, vibes: 10 }, { tier: 2, visits: 10, vibes: 20 }];
const A = (visits) => {
  const tier = visits >= 10 ? 2 : visits >= 4 ? 1 : 0;
  const earned = tier === 2 ? 20 : tier === 1 ? 10 : 0;
  const next = tier === 2 ? null : tier === 1 ? { tier: 2, visits: 10, vibes: 20, remaining: 10 - visits } : { tier: 1, visits: 4, vibes: 10, remaining: 4 - visits };
  return { month: '2026-11', visits, tier, earned_vibes: earned, tiers: TIERS, max_vibes: 20, next, credited_on: '2026-12-01', active: true, history: [] };
};
const view = (lang, n) => { I.setLang(lang); const v = activityView(A(n)); return [v.lines[0], v.status, v.credit].filter(Boolean).join(' '); };
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('RU: 3 / 7 / 12 / 0 / 1 / 22 посещения', () => {
  assert.strictEqual(view('ru', 3), 'В ноябре вы были на занятиях 3 раза. Ещё 1 — и получите +10 VIBES.');
  assert.strictEqual(view('ru', 7), 'В ноябре вы были на занятиях 7 раз. +10 VIBES уже ваши, ещё 3 до +20. Бонус начислится автоматически 1 декабря.');
  assert.strictEqual(view('ru', 12), 'В ноябре вы были на занятиях 12 раз. Максимальный бонус +20 VIBES за ноябрь. Бонус начислится автоматически 1 декабря.');
  assert.strictEqual(view('ru', 0), 'В ноябре вы пока не были на занятиях. 4 посещения — и получите +10 VIBES.');
  assert.match(view('ru', 1), /^В ноябре вы были на занятиях 1 раз\./);
  assert.match(view('ru', 22), /22 раза\./);
});
t('EN', () => {
  assert.strictEqual(view('en', 3), 'In November you have been to class 3 times. 1 more and you get +10 VIBES.');
  assert.strictEqual(view('en', 4), 'In November you have been to class 4 times. +10 VIBES are already yours, 6 more to +20. The bonus is added automatically on 1 December.');
  assert.match(view('en', 1), /1 time\./);
  assert.match(view('en', 10), /Maximum bonus \+20 VIBES for November\./);
});
t('EL', () => {
  assert.strictEqual(view('el', 3), 'Τον Νοέμβριο ήρθατε σε μαθήματα 3 φορές. Ακόμη 1 και παίρνετε +10 VIBES.');
  assert.match(view('el', 9), /Τα \+10 VIBES είναι ήδη δικά σας, ακόμη 1 για \+20\./);
  assert.match(view('el', 15), /Μέγιστο μπόνους \+20 VIBES για τον Νοέμβριο\./);
});
t('правило из ступеней панели', () => {
  I.setLang('ru');
  assert.strictEqual(activityView(A(3)).rule, '4–9 посещений за месяц — +10 VIBES, 10 и больше — +20 VIBES. Бонусные VIBES не сгорают.');
});
t('нет слова «пакет» в текстах блока', () => {
  for (const lang of ['ru', 'en', 'el']) for (const k of [0, 3, 7, 12]) assert.ok(!/пакет/i.test(view(lang, k)));
});
console.log(`activity: ${n} ok`);
