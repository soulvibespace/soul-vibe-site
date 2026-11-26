#!/usr/bin/env python3
"""Статичный EN-текст для /classes и /schedule — для поиска и AI-ботов, которые не выполняют JS.

Карточки занятий и расписание строит JS из API (SimplyBook). В готовом HTML без JS там было
~185 слов. Скрипт вставляет вместо метки <!-- svs:static-text --> короткий раздел: что за
занятия, на каком языке, кто ведёт, сколько длится, как устроено расписание и оплата.

    python3 tools/static_text.py dist          # вставить (build.sh, ДО prices.py — там токены %%…%%)
    python3 tools/static_text.py --check dist  # ошибка, если раздел не вставлен или у класса нет описания

Данные — tools/classes-static.json (снимок API; обновить: node tools/classes-snapshot.js,
описания desc пишутся руками на EN и при обновлении сохраняются).

Раздел только на английском (lang="en"): посетитель с RU/EL его не видит (style.css,
html:not([lang="en"]) .svs-static), пока у страниц нет своих адресов /ru/ и /el/ (S2, #133).
"""
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'tools', 'classes-static.json')
MARK = '<!-- svs:static-text -->'
START, END = '<!-- svs:static-text:start -->', '<!-- svs:static-text:end -->'
PAGES = ('classes.html', 'schedule.html')
GROUP_ORDER = ['Yoga', 'Spiritual', 'Dance']
ADDRESS = '50 Agias Zonis, Limassol 3090'
HOURS = '8:00–22:00'

e = html.escape


def load():
    d = json.load(open(DATA, encoding='utf-8'))
    groups = {}
    for c in d['classes']:
        groups.setdefault(c['group'], {'label': c['group_label'], 'items': []})['items'].append(c)
    order = sorted(groups, key=lambda g: GROUP_ORDER.index(g) if g in GROUP_ORDER else 99)
    return [(groups[g]['label'], groups[g]['items']) for g in order]


def meta_line(c):
    bits = []
    if c.get('teacher'):
        bits.append('with ' + e(c['teacher']))
    if c.get('duration') and f"{c['duration']} min" not in c['title']:
        bits.append(f"{int(c['duration'])} min")
    return ' · '.join(bits)


def classes_block(groups):
    out = ['<section class="svs-static" lang="en" aria-labelledby="svsStaticTitle">',
           '  <h2 id="svsStaticTitle">Our classes in Limassol</h2>',
           f'  <p>Soul Vibe Space is a yoga and movement studio at {ADDRESS}. Classes run in English, Russian or both, '
           'and the language is shown next to each class.</p>',
           '  <p>A drop-in class is %%dropin%%. With a Class Pass, regular practice is better value. '
           'New to the studio? Try a Starter Pack.</p>']
    for label, items in groups:
        out.append(f'  <h3>{e(label)}</h3>')
        out.append('  <ul class="svs-static-list">')
        for c in items:
            m = meta_line(c)
            out.append(f'    <li><strong>{e(c["title"])}</strong>{" · " + m if m else ""}'
                       f'{"<br>" + e(c["desc"]) if c.get("desc") else ""}</li>')
        out.append('  </ul>')
    out.append('  <p><a href="/schedule">See the live schedule</a> · <a href="/pricing">Prices and Class Passes</a></p>')
    out.append('</section>')
    return '\n'.join(out)


def schedule_block(groups):
    out = ['<section class="svs-static" lang="en" aria-labelledby="svsStaticTitle">',
           '  <h2 id="svsStaticTitle">How the timetable works</h2>',
           '  <p>The timetable comes live from our booking system, so every class you see is open to book. '
           'Choose a class and a time, then book in a few taps.</p>',
           f'  <p>The studio is open every day, {HOURS}, at {ADDRESS}. Ecstatic Dance takes place at the Rancho, our outdoor venue.</p>',
           '  <p>You pay at the studio: a drop-in class is %%dropin%%, or use your Class Pass or Starter Pack. '
           '<a href="/pricing">See prices</a>.</p>',
           '  <h3>Regular classes</h3>',
           '  <ul class="svs-static-list svs-static-list--compact">']
    for label, items in groups:
        for c in items:
            m = meta_line(c)
            out.append(f'    <li><strong>{e(c["title"])}</strong>{" · " + m if m else ""}</li>')
    out.append('  </ul>')
    out.append('  <p><a href="/classes">About each class</a></p>')
    out.append('</section>')
    return '\n'.join(out)


def render(fname, src, groups):
    block = classes_block(groups) if fname == 'classes.html' else schedule_block(groups)
    if START in src:
        a, b = src.index(START), src.index(END) + len(END)
        src = src[:a] + MARK + src[b:]
    return src.replace(MARK, START + '\n' + block + '\n' + END, 1)


def check(d):
    bad = []
    data = json.load(open(DATA, encoding='utf-8'))
    for c in data['classes']:
        if not c.get('desc'):
            bad.append(f'tools/classes-static.json: у класса {c["id"]} «{c["title"]}» нет описания (desc)')
        if 'пакет' in json.dumps(c, ensure_ascii=False).lower():
            bad.append(f'класс {c["id"]}: слово «пакет»')
    for f in PAGES:
        s = open(os.path.join(d, f), encoding='utf-8').read()
        if START not in s or 'class="svs-static"' not in s:
            bad.append(f'{f}: нет статичного раздела (метка {MARK})')
    if bad:
        print('ОШИБКА: static_text —', *bad, sep='\n  ', file=sys.stderr)
        return 1
    print(f'static_text: ок ({len(data["classes"])} классов, снимок {data.get("updated")})')
    return 0


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    d = os.path.abspath(args[0]) if args else os.path.join(ROOT, 'dist')
    if '--check' in argv:
        return check(d)
    groups = load()
    for f in PAGES:
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        if MARK not in src and START not in src:
            print(f'ОШИБКА: {f}: нет метки {MARK}', file=sys.stderr)
            return 1
        open(p, 'w', encoding='utf-8').write(render(f, src, groups))
    print('static_text: разделы /classes и /schedule вставлены')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
