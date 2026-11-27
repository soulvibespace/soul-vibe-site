// node tests/faq.test.js — «Частые вопросы» на /contact#faq: 9 вопросов на RU/EN/EL,
// EN-тексты в contact.html совпадают с i18n.js, ссылки в шапке и подвале, разметка FAQPage.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

global.window = { dispatchEvent() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => 1, querySelectorAll: () => [], documentElement: {} };
try { global.navigator = { language: 'en' }; } catch (_) { /* Node 21+ */ }
global.CustomEvent = function () {};
require('vm').runInThisContext(read('i18n.js') + '\n;globalThis.__T = SVS_TRANSLATIONS; globalThis.__TERMS = SVS_TERMS;');
const T = globalThis.__T, TERMS = globalThis.__TERMS;
const LANGS = ['en', 'ru', 'el'];
const N = 9;
const html = read('contact.html');
const section = html.slice(html.indexOf('<section class="faq-section" id="faq"'), html.indexOf('</section>', html.indexOf('id="faq"')));
const enTerm = (s) => s.replace(/\{\{([a-z_]+)(?::([a-z_]+))?\}\}/g, (_, k, f) => TERMS.en[k][f || 'nom']);

t('блок #faq: 9 вопросов, <details>, иконка 1.75', () => {
  assert.ok(section.length > 100, 'нет блока');
  assert.strictEqual((section.match(/<details class="faq-item"/g) || []).length, N);
  for (let i = 1; i <= N; i++) {
    assert.ok(section.includes(`data-i18n="faq_q${i}"`) && section.includes(`data-i18n="faq_a${i}"`), String(i));
  }
  for (const m of section.matchAll(/<svg[^>]*>/g)) assert.ok(m[0].includes('stroke-width="1.75"'), m[0]);
});
t('тексты есть на RU/EN/EL, без «пакет», эмодзи и VIBES за отзывы', () => {
  const keys = ['nav_faq', 'faq_title', 'faq_sub', 'faq_more'];
  for (let i = 1; i <= N; i++) keys.push(`faq_q${i}`, `faq_a${i}`);
  for (const l of LANGS) for (const k of keys) {
    const v = T[l][k];
    assert.ok(v, `${l}.${k}`);
    assert.ok(!/пакет|package|πακέτ/i.test(v), `${l}.${k}: пакет`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(v), `${l}.${k}: эмодзи`);
    assert.ok(!/(отзыв|κριτικ|\ba review\b|\breviews\b(?! each))/i.test(v) || !/VIBES/.test(v), `${l}.${k}: VIBES за отзывы`);
    assert.ok(!/бонусн|программа лояльности|loyalty/i.test(v), `${l}.${k}`);
  }
  assert.strictEqual(T.ru.nav_faq, 'Частые вопросы');
  assert.strictEqual(T.en.nav_faq, 'FAQ');
  assert.strictEqual(T.el.nav_faq, 'Συχνές ερωτήσεις');
  assert.ok(/валют/.test(T.ru.faq_q4 + T.ru.faq_a4));
});
t('EN в contact.html = EN в i18n.js', () => {
  for (let i = 1; i <= N; i++) {
    const q = section.match(new RegExp(`data-i18n="faq_q${i}">([\\s\\S]*?)</span>`))[1];
    const a = section.match(new RegExp(`data-i18n="faq_a${i}">([\\s\\S]*?)</div>`))[1];
    assert.strictEqual(q, enTerm(T.en[`faq_q${i}`]), `q${i}`);
    assert.strictEqual(a, enTerm(T.en[`faq_a${i}`]), `a${i}`);
  }
});
t('факты сверены с сайтом', () => {
  const a = (i) => T.en[`faq_a${i}`];
  assert.ok(a(1).includes('bottle of water') && /Mats, blocks, straps/.test(a(1)));
  assert.ok(/no penalty for late cancellation/.test(a(2)) && read('terms.html').includes('no penalties for late cancellation'));
  assert.ok(/first visit/.test(a(4)) && /when you attend, not when you book/.test(a(4)));
  assert.ok(a(5).includes('%%freeze%%') && a(5).includes('/account'));
  assert.ok(a(6).includes('50 Agias Zonis, Limassol 3090'));
  assert.ok(a(7).includes('6 months') && a(7).includes('€20 to €240'));
  const rooms = JSON.parse(read('data/rental.json')).rooms;
  assert.deepStrictEqual(rooms.map((r) => r.size_m2), [35, 35, 100, 170]);
  assert.ok(a(8).includes('170 m²') && a(8).includes('two 35 m² halls') && a(8).includes('100 m²') && a(8).includes('up to 50 guests'));
  assert.ok(section.includes('data-svs-install') && read('pwa.js').includes("closest('[data-svs-install]')"));
});
t('ссылка «Частые вопросы» в подвале и в мобильном меню рядом с «Контактами»', () => {
  assert.ok(read('tools/footer.html').includes('<a href="/contact#faq" data-i18n="nav_faq">FAQ</a>'));
  const h = read('tools/header.html');
  assert.ok(/data-i18n="nav_contact">Contact<\/a>\s*<a href="\/contact#faq" class="mobile-nav-link" data-i18n="nav_faq">FAQ<\/a>/.test(h));
});
t('tools/seo.py собирает FAQPage из блока #faq', () => {
  const seo = read('tools/seo.py');
  assert.ok(seo.includes("'FAQPage'") && seo.includes('faq_items(src)'));
});
console.log(`${n} проверок пройдено`);
