#!/usr/bin/env python3
"""OG/Twitter-мета-теги для всех страниц — из одного места.

Скрипт берёт <title> и <meta name="description"> самой страницы и пишет
в <head> блок между маркерами <!-- meta:start --> … <!-- meta:end -->:
og:type, og:site_name, og:title, og:description, og:url, og:image, og:locale,
twitter:card, twitter:title, twitter:description, twitter:image.
Старые разрозненные og:/twitter:/canonical/hreflang-теги вне блока удаляются.

    python3 tools/meta.py                     # обновить *.html в корне
    python3 tools/meta.py --check             # проверить, что блоки актуальны (exit 1, если нет)
    python3 tools/meta.py DIR --base URL      # для dist/ (build.sh подставляет адрес сайта Netlify)

Картинку для превью страницы меняйте в IMAGES ниже, заголовок и описание —
в <title> и <meta name="description"> самой страницы.

TODO(домен): canonical и hreflang сейчас НЕ выводятся — soulvibespace.com ещё
указывает на старый сайт (Squarespace). После переноса домена поменять
DEFAULT_BASE на https://soulvibespace.com и включить CANONICAL = True.
(Переменную $URL Netlify не используем: в ней уже стоит soulvibespace.com.)
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BASE = 'https://soul-vibe-space.netlify.app'
CANONICAL = False  # TODO(домен): включить после переноса soulvibespace.com
SKIP = {'auth-callback.html'}
DEFAULT_IMAGE = '/images/hero.webp'
IMAGES = {
    'price-list.html': '/images/coworking.webp',
    'reviews.html': '/images/studio-entrance.webp',
}

START, END = '<!-- meta:start -->', '<!-- meta:end -->'
BLOCK_RE = re.compile(r'[ \t]*' + re.escape(START) + r'.*?' + re.escape(END) + r'[ \t]*\n?', re.S)
STRAY_RE = re.compile(
    r'[ \t]*<(?:meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*'
    r'|link\s+rel="(?:canonical|alternate)"(?:\s+hreflang="[^"]*")?\s+href="[^"]*")\s*/?>[ \t]*\n?')
TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.S)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"\s*/?>[ \t]*\n?')


def page_path(fname):
    name = fname[:-5]
    return '/' if name == 'index' else '/' + name


def attr(s):
    return html.escape(html.unescape(s.strip()), quote=True)


def block(fname, src, base):
    title = attr(TITLE_RE.search(src).group(1))
    desc = attr(DESC_RE.search(src).group(1))
    url = base + page_path(fname)
    img = base + IMAGES.get(fname, DEFAULT_IMAGE)
    tags = [
        START,
        '<!-- Генерируется tools/meta.py из <title> и meta description. Не правьте вручную. -->',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Soul Vibe Space" />',
        f'<meta property="og:title" content="{title}" />',
        f'<meta property="og:description" content="{desc}" />',
        f'<meta property="og:url" content="{url}" />',
        f'<meta property="og:image" content="{img}" />',
        '<meta property="og:locale" content="en_US" />',
        '<meta property="og:locale:alternate" content="ru_RU" />',
        '<meta property="og:locale:alternate" content="el_GR" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{title}" />',
        f'<meta name="twitter:description" content="{desc}" />',
        f'<meta name="twitter:image" content="{img}" />',
    ]
    if CANONICAL:
        tags.append(f'<link rel="canonical" href="{url}" />')
    tags.append(END)
    return ''.join('  ' + t + '\n' for t in tags)


def render(fname, src, base):
    src = BLOCK_RE.sub('', src)
    src = STRAY_RE.sub('', src)
    m = DESC_RE.search(src)
    if not m:
        raise SystemExit(f'{fname}: нет <meta name="description"> — добавьте его')
    return src[:m.end()] + block(fname, src, base) + src[m.end():]


def pages(d):
    return sorted(f for f in os.listdir(d) if f.endswith('.html') and f not in SKIP)


def main(argv):
    check = '--check' in argv
    base = DEFAULT_BASE
    args = []
    it = iter(argv)
    for a in it:
        if a == '--base':
            base = next(it)
        elif not a.startswith('--'):
            args.append(a)
    base = base.rstrip('/')
    d = os.path.abspath(args[0]) if args else ROOT
    bad = []
    for f in pages(d):
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        out = render(f, src, base)
        if out != src:
            if check:
                bad.append(f)
            else:
                open(p, 'w', encoding='utf-8').write(out)
                print('мета-теги обновлены:', f)
    if check:
        if bad:
            print('мета-теги устарели (запустите python3 tools/meta.py):', ', '.join(bad), file=sys.stderr)
            return 1
        print('мета-теги актуальны на всех страницах:', len(pages(d)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
