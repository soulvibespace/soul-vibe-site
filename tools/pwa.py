#!/usr/bin/env python3
"""Приложение на экране телефона (PWA, #104): теги в <head> и версия service worker.

    python3 tools/pwa.py dist            # вставить в <head> всех страниц манифест, мета для iOS/Android и /pwa.js
    python3 tools/pwa.py --stamp dist    # после assetver.py: записать в dist/sw.js версию сборки (хеш файлов)
    python3 tools/pwa.py --check dist    # проверить: теги на всех страницах, манифест, иконки, версия sw.js

Блок в <head> ограничен комментариями <!-- pwa:start --> … <!-- pwa:end -->, повторный запуск его заменяет.
Иконки рисует tools/pwa_icons.py (запускается вручную, результат в репозитории).
"""
import hashlib
import json
import os
import re
import sys

START, END = '<!-- pwa:start -->', '<!-- pwa:end -->'
BLOCK_RE = re.compile(r'[ \t]*' + re.escape(START) + r'.*?' + re.escape(END) + r'[ \t]*\n?', re.S)
THEME = '#f8f7f4'
TAGS = [
    '<link rel="manifest" href="/manifest.webmanifest" />',
    f'<meta name="theme-color" content="{THEME}" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="Soul Vibe" />',
    '<script defer src="/pwa.js"></script>',
]
APPLE_ICON = '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />'
ICONS = ['images/app/icon-192.png', 'images/app/icon-512.png',
         'images/app/maskable-192.png', 'images/app/maskable-512.png', 'apple-touch-icon.png']
SW_TOKEN = '__SVS_SW_VERSION__'


def pages(d):
    # Корень и языковые копии /ru/, /el/ (S2, tools/i18n_build.py) — блок pwa нужен везде.
    out = sorted(f for f in os.listdir(d) if f.endswith('.html'))
    for lang in ('ru', 'el'):
        sub = os.path.join(d, lang)
        if os.path.isdir(sub):
            out += [f'{lang}/{f}' for f in sorted(os.listdir(sub)) if f.endswith('.html')]
    return out


def block(src):
    tags = list(TAGS)
    if 'rel="apple-touch-icon"' not in BLOCK_RE.sub('', src):
        tags.insert(1, APPLE_ICON)
    return '  ' + START + '\n' + ''.join('  ' + t + '\n' for t in tags) + '  ' + END + '\n'


def inject(d):
    n = 0
    for f in pages(d):
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        clean = BLOCK_RE.sub('', src)
        pos = clean.find('</head>')
        if pos < 0:
            continue
        new = clean[:pos] + block(clean) + clean[pos:]
        if new != src:
            open(p, 'w', encoding='utf-8').write(new)
        n += 1
    print(f'pwa: манифест и мета на {n} стр.')


def stamp(d):
    h = hashlib.md5()
    for root, _, files in sorted(os.walk(d)):
        for f in sorted(files):
            p = os.path.join(root, f)
            if os.path.relpath(p, d) == 'sw.js':
                continue
            h.update(os.path.relpath(p, d).encode())
            h.update(open(p, 'rb').read())
    v = h.hexdigest()[:12]
    sw = os.path.join(d, 'sw.js')
    src = open(sw, encoding='utf-8').read()
    src = re.sub(r"var VERSION = '[^']*';", f"var VERSION = '{v}';", src, count=1)
    open(sw, 'w', encoding='utf-8').write(src)
    print(f'pwa: версия service worker {v}')


def check(d):
    bad = []
    for f in pages(d):
        src = open(os.path.join(d, f), encoding='utf-8').read()
        if START not in src:
            bad.append(f'{f}: нет блока pwa в <head>')
        elif 'pwa.js' not in src or 'rel="manifest"' not in src:
            bad.append(f'{f}: нет manifest или pwa.js')
    try:
        m = json.load(open(os.path.join(d, 'manifest.webmanifest'), encoding='utf-8'))
        for k in ('name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color'):
            if not m.get(k):
                bad.append(f'manifest: нет {k}')
        sizes = {(i.get('sizes'), i.get('purpose', 'any')) for i in m.get('icons', [])}
        for need in (('192x192', 'any'), ('512x512', 'any'), ('512x512', 'maskable')):
            if need not in sizes:
                bad.append(f'manifest: нет иконки {need}')
        for i in m.get('icons', []):
            if not os.path.isfile(os.path.join(d, i['src'].lstrip('/'))):
                bad.append(f'manifest: нет файла {i["src"]}')
    except Exception as e:  # noqa: BLE001
        bad.append(f'manifest.webmanifest: {e}')
    for i in ICONS:
        if not os.path.isfile(os.path.join(d, i)):
            bad.append(f'нет {i}')
    for f in ('sw.js', 'pwa.js', 'app/offline.html'):
        if not os.path.isfile(os.path.join(d, f)):
            bad.append(f'нет {f}')
    sw = open(os.path.join(d, 'sw.js'), encoding='utf-8').read() if os.path.isfile(os.path.join(d, 'sw.js')) else ''
    if SW_TOKEN in sw:
        bad.append('sw.js: версия не проставлена (pwa.py --stamp)')
    if bad:
        print('ОШИБКА pwa:\n  ' + '\n  '.join(bad), file=sys.stderr)
        sys.exit(1)
    print('pwa: ок (манифест, иконки, мета, sw.js, офлайн-страница)')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    d = args[0] if args else 'dist'
    if '--check' in sys.argv:
        check(d)
    elif '--stamp' in sys.argv:
        stamp(d)
    else:
        inject(d)
