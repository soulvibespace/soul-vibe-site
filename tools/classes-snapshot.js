// node tools/classes-snapshot.js — обновить tools/classes-static.json из живого API (SimplyBook через soul-vibe-api).
// Названия на EN, язык класса и преподаватель — тем же кодом, что на сайте (svsClassInfo в i18n.js).
// Описания (desc) пишутся руками на EN и при обновлении сохраняются; у нового класса desc пустой —
// tools/static_text.py --check напомнит. Классы, которых больше нет в API, удаляются.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'classes-static.json');
const API = process.env.SVS_API || 'https://soul-vibe-api.onrender.com';

global.window = { dispatchEvent() {}, addEventListener() {} };
global.document = { readyState: 'loading', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: {}, createElement: () => ({ setAttribute() {} }), head: { appendChild() {} }, currentScript: null };
global.localStorage = { getItem: () => null, setItem() {} };
global.CustomEvent = function () {};
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8') + ';globalThis.__info = svsClassInfo;');

(async () => {
  const r = await fetch(API + '/api/booking/services', { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('API HTTP ' + r.status);
  const d = await r.json();
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { classes: [] };
  const descs = Object.fromEntries((old.classes || []).map(c => [String(c.id), c.desc || '']));
  const classes = (d.services || [])
    .filter(s => s.group !== 'coworking')
    .map(s => {
      const i = global.__info(s.id, s.name, 'en');
      return {
        id: String(s.id), group: s.group || 'Other', group_label: (s.group_label && s.group_label.en) || s.group || 'Other',
        title: i.title, teacher: i.teacher || '', duration: Number(s.duration) || null, desc: descs[String(s.id)] || '',
      };
    });
  const out = { updated: new Date().toISOString().slice(0, 10), source: API + '/api/booking/services', classes };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  const missing = classes.filter(c => !c.desc).map(c => c.id + ' ' + c.title);
  console.log(`classes-static.json: ${classes.length} классов` + (missing.length ? `; без описания: ${missing.join(', ')}` : ''));
})().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1); });
