#!/usr/bin/env python3
"""Единая шапка сайта (desktop + мобильное меню) — один источник для всех страниц.

Шапка хранится в tools/header.html. Скрипт вставляет её в каждую страницу
между <header class="header" id="header"> … </header>, подсвечивая активный
пункт (nav-link--active + aria-current="page"). Разметка оказывается прямо в HTML,
поэтому шапка видна сразу, без мигания и без JS.

    python3 tools/header.py            # обновить шапку во всех *.html в корне
    python3 tools/header.py --check    # проверить, что шапки совпадают с шаблоном (exit 1, если нет)
    python3 tools/header.py DIR        # обновить страницы в другой папке (build.sh вызывает для dist/)

Порядок пунктов меняйте ТОЛЬКО в tools/header.html.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'tools', 'header.html')
# Страницы без общей шапки (служебные)
SKIP = {'auth-callback.html'}
HEADER_RE = re.compile(r'<header class="header" id="header">.*?</header>', re.S)


def page_path(fname):
    name = fname[:-5]
    return '/' if name == 'index' else '/' + name


def render(tpl, fname):
    path = page_path(fname)

    def mark(m):
        tag = m.group(0)
        href = re.search(r'href="([^"]*)"', tag).group(1)
        if href != path:
            return tag
        if 'class="nav-link"' in tag:
            tag = tag.replace('class="nav-link"', 'class="nav-link nav-link--active"')
        else:
            tag = tag.replace('class="mobile-nav-link"', 'class="mobile-nav-link active"')
        return tag.replace('<a ', '<a aria-current="page" ', 1)

    return re.sub(r'<a [^>]*class="(?:mobile-)?nav-link"[^>]*>', mark, tpl)


def pages(d):
    return sorted(f for f in os.listdir(d) if f.endswith('.html') and f not in SKIP)


def main(argv):
    check = '--check' in argv
    args = [a for a in argv if not a.startswith('--')]
    d = os.path.abspath(args[0]) if args else ROOT
    tpl = open(TEMPLATE, encoding='utf-8').read().strip()
    bad = []
    for f in pages(d):
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        if not HEADER_RE.search(src):
            bad.append(f + ' (нет <header class="header" id="header">)')
            continue
        want = render(tpl, f)
        out = HEADER_RE.sub(lambda _m: want, src, count=1)
        if out != src:
            if check:
                bad.append(f)
            else:
                open(p, 'w', encoding='utf-8').write(out)
                print('шапка обновлена:', f)
    if bad:
        print(('шапка отличается от tools/header.html: ' if check else 'пропущено: ') + ', '.join(bad))
        if check:
            print('запустите: python3 tools/header.py')
        return 1
    if check:
        print('шапка одинаковая на всех страницах:', len(pages(d)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
