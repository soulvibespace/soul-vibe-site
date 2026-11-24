#!/usr/bin/env python3
"""SEO-файлы и разметка для поисковиков и AI-поиска — из одного места.

Запускается из build.sh по папке dist/ (после prices.py и meta.py, до assetver.py):

    python3 tools/seo.py dist [--base URL]
    python3 tools/seo.py --check dist      # проверить результат (exit 1 при ошибке)

Что делает:
  * <script type="application/ld+json"> между <!-- schema:start --> … <!-- schema:end -->
    на всех страницах: студия (HealthClub = LocalBusiness) с адресом, телефоном,
    часами, соцсетями и каталогом цен (Class Pass / Starter Pack / разовое) из SVS_PRICES;
    WebSite; WebPage текущей страницы. Адреса — от --base (как в meta.py).
  * старые JSON-LD страниц (about, vibes): адрес DEFAULT_BASE меняется на --base.
  * <meta name="robots" content="noindex"> на служебных страницах (NOINDEX).
  * подключает /analytics.js в <head> всех страниц (GA4 + Consent Mode v2,
    включается только когда в analytics.js указан ID).
  * sitemap.xml (только страницы для поиска, lastmod — дата последнего коммита файла),
    robots.txt (с адресом карты сайта) и llms.txt (токены %%…%% цен раскрываются).

Данные студии меняйте в STUDIO ниже, цены — в SVS_PRICES (i18n.js).
TODO(домен): после переноса soulvibespace.com — DEFAULT_BASE в tools/meta.py.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import meta  # noqa: E402  (DEFAULT_BASE, page_path, TITLE_RE, DESC_RE)
import prices  # noqa: E402  (load, values)

# Служебные страницы: не в карте сайта, с noindex.
NOINDEX = {'account.html', 'auth-callback.html', 'payment.html', '404.html'}

STUDIO = {
    'name': 'Soul Vibe Space',
    'legalName': 'Soul Vibe Space LTD',
    'description': ('Yoga and wellness studio in Limassol, Cyprus: yoga, meditation, qigong, '
                    'sound healing and Ecstatic Dance. Classes every day, multilingual community (EN, RU, EL).'),
    'telephone': '+35795642888',
    'email': 'soulvibespace@gmail.com',
    'address': {
        '@type': 'PostalAddress',
        'streetAddress': '50 Agias Zonis',
        'addressLocality': 'Limassol',
        'postalCode': '3090',
        'addressCountry': 'CY',
    },
    # Координаты не указываем, пока владелец не подтвердит точку из Google Business Profile:
    # в старом JSON-LD и в карте на /contact они расходятся (33.0464 vs 33.0360).
    'opens': '08:00',
    'closes': '22:00',
    'sameAs': [
        'https://www.instagram.com/soul.vibe.space_cyprus',
        'https://www.tiktok.com/@soul.vibe.space.y',
    ],
    'languages': ['en', 'ru', 'el'],
}

START, END = '<!-- schema:start -->', '<!-- schema:end -->'
SCHEMA_RE = re.compile(r'[ \t]*' + re.escape(START) + r'.*?' + re.escape(END) + r'[ \t]*\n?', re.S)
LD_RE = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
ANALYTICS_TAG = '<script src="/analytics.js"></script>'
ROBOTS_META_RE = re.compile(r'<meta\s+name="robots"[^>]*>', re.I)
TEXT_FILES = ('llms.txt',)

AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User',
           'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended',
           'Bingbot']


def plan_name(code, p, classes):
    word = 'class' if classes == 1 else 'classes'
    kind = 'Class Pass' if p['kind'] == 'pass' else 'Starter Pack'
    return f'{kind} — {classes} {word}'


def offers(base):
    P = prices.load()
    items = []
    for code, p in P['plans'].items():
        classes = int(p['vibes'] / P['class_vibes'])
        desc = f'{classes} {"class" if classes == 1 else "classes"}, valid {p["days"]} days from the first visit.'
        if p['kind'] == 'starter':
            desc += ' For first-time guests.'
        items.append({
            '@type': 'Offer',
            'name': plan_name(code, p, classes),
            'description': desc,
            'price': p['price'],
            'priceCurrency': 'EUR',
            'url': base + '/pricing',
            'availability': 'https://schema.org/InStock',
            'sku': code,
        })
    items.append({
        '@type': 'Offer', 'name': 'Drop-in class', 'description': 'One class from the regular schedule.',
        'price': P['dropin_eur'], 'priceCurrency': 'EUR', 'url': base + '/pricing',
        'availability': 'https://schema.org/InStock',
    })
    return {'@type': 'OfferCatalog', 'name': 'Class Passes and classes', 'itemListElement': items}


def graph(fname, src, base):
    studio_id = base + '/#studio'
    url = base + meta.page_path(fname)
    t = meta.TITLE_RE.search(src)
    d = meta.DESC_RE.search(src)
    studio = {
        '@type': ['HealthClub', 'LocalBusiness'],
        '@id': studio_id,
        'name': STUDIO['name'],
        'legalName': STUDIO['legalName'],
        'description': STUDIO['description'],
        'url': base + '/',
        'logo': base + '/images/logo.png',
        'image': [base + '/images/hero.webp', base + '/images/studio-entrance.webp'],
        'telephone': STUDIO['telephone'],
        'email': STUDIO['email'],
        'address': STUDIO['address'],
        'openingHoursSpecification': [{
            '@type': 'OpeningHoursSpecification',
            'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            'opens': STUDIO['opens'], 'closes': STUDIO['closes'],
        }],
        'priceRange': '€€',
        'currenciesAccepted': 'EUR',
        'knowsLanguage': STUDIO['languages'],
        'sameAs': STUDIO['sameAs'],
        'hasOfferCatalog': offers(base),
    }
    nodes = [
        studio,
        {'@type': 'WebSite', '@id': base + '/#website', 'url': base + '/', 'name': STUDIO['name'],
         'inLanguage': 'en', 'publisher': {'@id': studio_id}},
        {'@type': 'WebPage', '@id': url + '#webpage', 'url': url,
         'name': meta.html.unescape(t.group(1).strip()) if t else STUDIO['name'],
         'description': meta.html.unescape(d.group(1)) if d else '',
         'inLanguage': 'en', 'isPartOf': {'@id': base + '/#website'}, 'about': {'@id': studio_id}},
    ]
    return {'@context': 'https://schema.org', '@graph': nodes}


def schema_block(fname, src, base):
    body = json.dumps(graph(fname, src, base), ensure_ascii=False, indent=2).replace('</', '<\\/')
    return ('  ' + START + '\n  <!-- Генерируется tools/seo.py. Не правьте вручную. -->\n'
            '  <script type="application/ld+json">\n' + body + '\n  </script>\n  ' + END + '\n')


def render(fname, src, base):
    src = SCHEMA_RE.sub('', src)
    # Старые JSON-LD страниц: адрес сайта — от --base.
    # Адрес netlify.app, записанный в разметке (about.html), тоже меняется на --base.
    def fix(m):
        body = m.group(2).replace(meta.DEFAULT_BASE, base).replace(meta.NETLIFY_BASE, base)
        return m.group(1) + body + m.group(3)
    src = LD_RE.sub(fix, src)
    if fname in NOINDEX and not ROBOTS_META_RE.search(src):
        src = src.replace('</title>', '</title>\n  <meta name="robots" content="noindex, nofollow" />', 1)
    if ANALYTICS_TAG not in src:
        # Как можно раньше в <head>: Consent Mode должен стоять до любых тегов Google.
        m = re.search(r'<meta charset="[^"]*"\s*/?>\n?', src, re.I)
        pos = m.end() if m else src.index('<head>') + len('<head>')
        src = src[:pos] + '  ' + ANALYTICS_TAG + '\n' + src[pos:]
    if fname not in NOINDEX:
        src = src.replace('</head>', schema_block(fname, src, base) + '</head>', 1)
    return src


def lastmod(fname):
    try:
        out = subprocess.run(['git', '-C', ROOT, 'log', '-1', '--format=%cs', '--', fname],
                             capture_output=True, text=True, timeout=20).stdout.strip()
        return out or None
    except Exception:
        return None


def sitemap(pages, base):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for f in pages:
        rows.append('  <url>')
        rows.append(f'    <loc>{base}{meta.page_path(f)}</loc>')
        lm = lastmod(f)
        if lm:
            rows.append(f'    <lastmod>{lm}</lastmod>')
        rows.append('  </url>')
    rows.append('</urlset>')
    return '\n'.join(rows) + '\n'


def robots(base):
    lines = [
        '# Soul Vibe Space — robots.txt (генерируется tools/seo.py)',
        '# Поисковики и AI-поиск приглашены. Служебные страницы закрыты.',
        '# На *.netlify.app сайт дополнительно закрыт заголовком X-Robots-Tag: noindex',
        '# (netlify/edge-functions/noindex-preview.ts) — после переноса домена это снимается само.',
        '',
    ]
    for bot in AI_BOTS:
        lines += [f'User-agent: {bot}', 'Allow: /', '']
    lines += ['User-agent: *', 'Allow: /',
              # /account, /payment, /auth-callback НЕ закрываем: на них стоит noindex, и робот
              # должен его увидеть (Disallow скрыл бы noindex, а ссылка на /account есть в шапке).
              'Disallow: /admin/',
              '', f'Sitemap: {base}/sitemap.xml', '']
    return '\n'.join(lines)


def expand_text(src, base):
    v = prices.values(prices.load())
    src = prices.TOKEN.sub(lambda m: v.get(m.group(1), m.group(0)), src)
    return src.replace('{{BASE}}', base)


def html_pages(d):
    return sorted(f for f in os.listdir(d) if f.endswith('.html'))


def check(d, base=meta.DEFAULT_BASE):
    bad = []
    for f in html_pages(d):
        src = open(os.path.join(d, f), encoding='utf-8').read()
        for m in LD_RE.finditer(src):
            try:
                json.loads(m.group(2))
            except ValueError as e:
                bad.append(f'{f}: JSON-LD не читается ({e})')
        if ANALYTICS_TAG not in src:
            bad.append(f'{f}: нет {ANALYTICS_TAG}')
        if f in NOINDEX and not ROBOTS_META_RE.search(src):
            bad.append(f'{f}: нет noindex')
        if f not in NOINDEX and START not in src:
            bad.append(f'{f}: нет JSON-LD студии')
    for name in ('robots.txt', 'sitemap.xml', 'llms.txt'):
        p = os.path.join(d, name)
        if not os.path.exists(p):
            bad.append(f'нет {name}')
        elif os.path.getsize(p) < 100:
            bad.append(f'{name}: пустой')
        elif prices.TOKEN.search(open(p, encoding='utf-8').read()) or '{{BASE}}' in open(p, encoding='utf-8').read():
            bad.append(f'{name}: остался токен %%…%%')
    if base != meta.NETLIFY_BASE:
        # Сайт собран под другой адрес (SITE_URL): в JSON-LD, OG и canonical не должно остаться netlify.app.
        for f in html_pages(d):
            if meta.NETLIFY_BASE in open(os.path.join(d, f), encoding='utf-8').read():
                bad.append(f'{f}: остался адрес {meta.NETLIFY_BASE} (собрано под {base})')
        for name in ('robots.txt', 'sitemap.xml', 'llms.txt'):
            p = os.path.join(d, name)
            if os.path.exists(p) and meta.NETLIFY_BASE in open(p, encoding='utf-8').read():
                bad.append(f'{name}: остался адрес {meta.NETLIFY_BASE}')
    if bad:
        print('ОШИБКА: seo —', *bad, sep='\n  ', file=sys.stderr)
        return 1
    print('seo: ок (JSON-LD, noindex, analytics.js, robots.txt, sitemap.xml, llms.txt)')
    return 0


def main(argv):
    base = meta.DEFAULT_BASE
    args, it = [], iter(argv)
    for a in it:
        if a == '--base':
            base = next(it)
        elif not a.startswith('--'):
            args.append(a)
    base = base.rstrip('/')
    d = os.path.abspath(args[0]) if args else os.path.join(ROOT, 'dist')
    if '--check' in argv:
        return check(d, base)
    pages = html_pages(d)
    for f in pages:
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        out = render(f, src, base)
        if out != src:
            open(p, 'w', encoding='utf-8').write(out)
    open(os.path.join(d, 'sitemap.xml'), 'w', encoding='utf-8').write(
        sitemap([f for f in pages if f not in NOINDEX], base))
    open(os.path.join(d, 'robots.txt'), 'w', encoding='utf-8').write(robots(base))
    for name in TEXT_FILES:
        p = os.path.join(d, name)
        if os.path.exists(p):
            text = expand_text(open(p, encoding='utf-8').read(), base)
            open(p, 'w', encoding='utf-8').write(text)
    print(f'seo: JSON-LD и analytics.js на {len(pages)} стр., sitemap.xml '
          f'({len(pages) - len(NOINDEX & set(pages))} адресов), robots.txt, llms.txt')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
