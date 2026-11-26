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
NETLIFY_BASE = 'https://soul-vibe-space.netlify.app'  # технический адрес Netlify (не меняется)
CANONICAL = False  # TODO(домен): включить после переноса soulvibespace.com
SKIP = {'auth-callback.html', 'payment.html'}
DEFAULT_IMAGE = '/images/hero.webp'
IMAGES = {
    'reviews.html': '/images/studio-entrance.webp',
    'about.html': '/images/studio-entrance.webp',
    'gift-certificates.html': '/images/gift-hero-960.webp',
}

START, END = '<!-- meta:start -->', '<!-- meta:end -->'
BLOCK_RE = re.compile(r'[ \t]*' + re.escape(START) + r'.*?' + re.escape(END) + r'[ \t]*\n?', re.S)
STRAY_RE = re.compile(
    r'[ \t]*<(?:meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*'
    r'|link\s+rel="(?:canonical|alternate)"(?:\s+hreflang="[^"]*")?\s+href="[^"]*")\s*/?>[ \t]*\n?')
TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.S)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"\s*/?>[ \t]*\n?')


LANGS = ('en', 'ru', 'el')  # EN без префикса, RU/EL — dist/ru/, dist/el/ (tools/i18n_build.py)
LOCALES = {'en': 'en_US', 'ru': 'ru_RU', 'el': 'el_GR'}


def split_lang(fname):
    """'ru/pricing.html' → ('ru', 'pricing.html'); 'pricing.html' → ('en', 'pricing.html')"""
    head, _, tail = fname.partition('/')
    return (head, tail) if tail and head in LANGS else ('en', fname)


def page_path(fname):
    lang, base = split_lang(fname)
    name = base[:-5]
    pre = '' if lang == 'en' else '/' + lang
    return pre + '/' if name == 'index' else pre + '/' + name


def alternates(fname, d):
    """{lang: путь} для версий страницы, которые есть в d (пусто, если версия одна)."""
    _, base = split_lang(fname)
    alt = {l: page_path(base if l == 'en' else l + '/' + base) for l in LANGS
           if os.path.exists(os.path.join(d, base if l == 'en' else os.path.join(l, base)))}
    return alt if len(alt) > 1 else {}


def attr(s):
    return html.escape(html.unescape(s.strip()), quote=True)


def block(fname, src, base, alt=None):
    title = attr(TITLE_RE.search(src).group(1))
    desc = attr(DESC_RE.search(src).group(1))
    url = base + page_path(fname)
    lang, bname = split_lang(fname)
    img = base + IMAGES.get(bname, DEFAULT_IMAGE)
    tags = [
        START,
        '<!-- Генерируется tools/meta.py из <title> и meta description. Не правьте вручную. -->',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Soul Vibe Space" />',
        f'<meta property="og:title" content="{title}" />',
        f'<meta property="og:description" content="{desc}" />',
        f'<meta property="og:url" content="{url}" />',
        f'<meta property="og:image" content="{img}" />',
        f'<meta property="og:locale" content="{LOCALES[lang]}" />',
    ] + [f'<meta property="og:locale:alternate" content="{LOCALES[l]}" />' for l in LANGS if l != lang] + [
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{title}" />',
        f'<meta name="twitter:description" content="{desc}" />',
        f'<meta name="twitter:image" content="{img}" />',
    ]
    if CANONICAL:
        tags.append(f'<link rel="canonical" href="{url}" />')
    # hreflang: каждая версия ссылается на все три и на себя; x-default — EN.
    for l, path in (alt or {}).items():
        tags.append(f'<link rel="alternate" hreflang="{l}" href="{base}{path}" />')
    if alt and 'en' in alt:
        tags.append(f'<link rel="alternate" hreflang="x-default" href="{base}{alt["en"]}" />')
    tags.append(END)
    return ''.join('  ' + t + '\n' for t in tags)


def render(fname, src, base, d=None):
    src = BLOCK_RE.sub('', src)
    src = STRAY_RE.sub('', src)
    m = DESC_RE.search(src)
    if not m:
        raise SystemExit(f'{fname}: нет <meta name="description"> — добавьте его')
    alt = alternates(fname, d) if d else {}
    return src[:m.end()] + block(fname, src, base, alt) + src[m.end():]


def pages(d):
    out = sorted(f for f in os.listdir(d) if f.endswith('.html') and f not in SKIP)
    for l in LANGS[1:]:
        sub = os.path.join(d, l)
        if os.path.isdir(sub):
            out += sorted(f'{l}/{f}' for f in os.listdir(sub) if f.endswith('.html') and f not in SKIP)
    return out


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
        out = render(f, src, base, d)
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
