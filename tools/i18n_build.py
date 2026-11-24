#!/usr/bin/env python3
"""Языковые адреса (S2, #133): /ru/… и /el/… — готовый HTML на своём языке.

EN остаётся без префикса (/pricing). Для каждой страницы dist/*.html (кроме служебных
SKIP) скрипт пишет dist/ru/<page>.html и dist/el/<page>.html:

  * тексты из словарей i18n.js (+ i18n-about.js, i18n-legal.js) — через tools/i18n-dump.js,
    те же значения, что показывает SVS_I18N.t(): data-i18n, data-i18n-placeholder,
    data-i18n-aria, data-price, <title> (data-i18n-title / data-page-title);
  * <title> и meta description из tools/i18n-meta.json (если нет ключа в словаре);
  * <html lang>, внутренние ссылки (/pricing → /ru/pricing), относительные пути
    к файлам (style.css → /style.css), переключатель языка — ссылки на эту же страницу
    на другом языке (и на EN-страницах тоже).

Порядок в build.sh: после prices/header/footer, ДО meta.py и seo.py (они добавляют
og:locale, hreflang, JSON-LD и sitemap для всех трёх языков).

    python3 tools/i18n_build.py dist           # собрать /ru и /el
    python3 tools/i18n_build.py --check dist   # проверить результат (exit 1 при ошибке)
"""
import html
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import prices  # noqa: E402

LANGS = ('ru', 'el')
ALL_LANGS = ('en',) + LANGS
# Служебные страницы без языковых копий (работают по JS на любом языке).
SKIP = {'auth-callback.html', 'payment.html'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
META_FILE = os.path.join(HERE, 'i18n-meta.json')

START_RE = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>')
TAG_RE = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>')
TITLE_RE = re.compile(r'(<title\b[^>]*>)(.*?)(</title>)', re.S)
DESC_RE = re.compile(r'(<meta\s+name="description"\s+content=")([^"]*)(")')
LANG_BTN_RE = re.compile(r'<button\b([^>]*?)\sdata-lang-btn="(en|ru|el)"([^>]*)>(.*?)</button>', re.S)


def load_dict():
    out = subprocess.run(['node', os.path.join(HERE, 'i18n-dump.js')], capture_output=True, text=True, cwd=ROOT)
    if out.returncode:
        sys.exit('i18n-dump.js: ' + out.stderr)
    return json.loads(out.stdout)


def pages(d):
    return sorted(f for f in os.listdir(d) if f.endswith('.html') and f not in SKIP)


def path_of(fname, lang='en'):
    """index.html → / | /ru/ ; pricing.html → /pricing | /ru/pricing"""
    name = fname[:-5]
    pre = '' if lang == 'en' else '/' + lang
    return (pre + '/') if name == 'index' else pre + '/' + name


def match_close(src, start, tag):
    """Индекс начала и конца закрывающего тега для элемента, открытого до позиции start."""
    depth = 1
    for m in TAG_RE.finditer(src, start):
        name = m.group(2).lower()
        if name != tag or m.group(3):
            continue
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return m.start(), m.end()
    return None


def set_attr(tag, name, value):
    value = html.escape(value, quote=True)
    if re.search(r'\s' + name + r'="[^"]*"', tag):
        return re.sub(r'(\s' + name + r'=")[^"]*(")', lambda m: m.group(1) + value + m.group(2), tag, count=1)
    return tag[:-1].rstrip('/').rstrip() + f' {name}="{value}"' + ('/>' if tag.endswith('/>') else '>')


def content(val):
    # Как i18n.js: значение с тегами — innerHTML, иначе textContent.
    return val if '<' in val else html.escape(val, quote=False)


def translate(src, t, pv):
    out, pos = [], 0
    while True:
        m = START_RE.search(src, pos)
        if not m:
            out.append(src[pos:])
            break
        tag, key = m.group(1).lower(), m.group(2)
        out.append(src[pos:m.start()])
        out.append(m.group(0))
        if tag in VOID or m.group(0).endswith('/>'):
            pos = m.end()
            continue
        close = match_close(src, m.end(), tag)
        if not close:
            pos = m.end()
            continue
        out.append(content(t[key]) if key in t else src[m.end():close[0]])
        out.append(src[close[0]:close[1]])
        pos = close[1]
    src = ''.join(out)
    # Атрибуты
    for attr, target in (('data-i18n-placeholder', 'placeholder'), ('data-i18n-aria', 'aria-label')):
        src = re.sub(r'<[a-zA-Z][^>]*\s' + attr + r'="([^"]+)"[^>]*>',
                     lambda m: set_attr(m.group(0), target, t[m.group(1)]) if m.group(1) in t else m.group(0), src)
    # Цифры вне переводов: <span data-price="MP8.per">…</span>
    src = re.sub(r'(<[a-zA-Z][^>]*\sdata-price="([^"]+)"[^>]*>)([^<]*)(</)',
                 lambda m: m.group(1) + (str(pv[m.group(2)]) if m.group(2) in pv else m.group(3)) + m.group(4), src)
    return src


def localize_links(src, lang, page_paths):
    pre = '/' + lang

    def href(m):
        q, url = m.group(1), m.group(2)
        path, sep, rest = re.match(r'([^?#]*)([?#]?)(.*)', url, re.S).groups()
        if path == '/' or path in page_paths or path + '.html' in page_paths or path.rstrip('/') in page_paths:
            new = pre + '/' if path == '/' else pre + (path[:-5] if path.endswith('.html') else path)
            return f'href={q}{new}{sep}{rest}{q}'
        return m.group(0)
    return re.sub(r'href=(["\'])(/[^"\'#?]*(?:[?#][^"\']*)?)\1', href, src)


REL_SKIP = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|/|#|\$\{|\{\{|%%)', re.I)


def absolutize(src):
    """Относительные пути к файлам (style.css, images/x.webp) — от корня: на /ru/ они иначе сломаются."""
    def one(u):
        u = u.strip()
        return u if not u or REL_SKIP.match(u) else '/' + u

    src = re.sub(r'(\s(?:src|href|poster)=")([^"]*)(")', lambda m: m.group(1) + one(m.group(2)) + m.group(3), src)
    src = re.sub(r'(\ssrcset=")([^"]*)(")',
                 lambda m: m.group(1) + ', '.join(' '.join([one(p.split()[0])] + p.split()[1:])
                                                  for p in m.group(2).split(',') if p.strip()) + m.group(3), src)
    return src


def lang_links(src, fname, lang):
    """Кнопки EN/RU/EL → ссылки на эту же страницу на другом языке (Google видит связь версий)."""
    def btn(m):
        code = m.group(2)
        attrs = re.sub(r'\s(?:onclick|aria-pressed|type)="[^"]*"', '', m.group(1) + m.group(3))
        attrs = re.sub(r'class="([^"]*)"', lambda c: 'class="' + ' '.join(
            [x for x in c.group(1).split() if x != 'lang-active'] + (['lang-active'] if code == lang else [])) + '"', attrs)
        cur = ' aria-current="true"' if code == lang else ''
        return (f'<a{attrs} data-lang-btn="{code}" href="{path_of(fname, code)}" hreflang="{code}" lang="{code}"'
                f'{cur}>{m.group(4)}</a>')
    return LANG_BTN_RE.sub(btn, src)


PIN = '<script>try{localStorage.setItem("svs_lang","%s")}catch(e){}</script>'


def pin_lang(src, lang):
    """Первым скриптом в <head>: язык адреса → svs_lang. Его читают напрямую cookie-banner.js,
    compact.js, app.js, офлайн-заглушка и др. — так они сразу видят язык страницы."""
    m = re.search(r'<meta charset="[^"]*"\s*/?>\n?', src, re.I) or re.search(r'<head[^>]*>\n?', src)
    return src[:m.end()] + '  ' + PIN % lang + '\n' + src[m.end():]


def title_desc(src, fname, lang, t, meta_tr, pv):
    page = fname[:-5]
    mt = (meta_tr.get(page) or {}).get(lang) or {}
    expand = lambda s: prices.TOKEN.sub(lambda m: str(pv.get(m.group(1), m.group(0))), s)
    key = re.search(r'<title\b[^>]*\sdata-i18n-title="([^"]+)"', src) or re.search(r'data-page-title="([^"]+)"', src)
    title = t.get(key.group(1)) if key else None
    title = title or mt.get('title')
    if title:
        src = TITLE_RE.sub(lambda m: m.group(1) + html.escape(expand(title), quote=False) + m.group(3), src, count=1)
    if mt.get('desc'):
        src = DESC_RE.sub(lambda m: m.group(1) + html.escape(expand(mt['desc']), quote=True) + m.group(3), src, count=1)
    return src


def build(d):
    data = load_dict()
    meta_tr = json.load(open(META_FILE, encoding='utf-8'))
    P = prices.load()
    plist = pages(d)
    page_paths = {path_of(f) for f in plist if f != 'index.html'} | {'/' + f for f in plist}
    for f in plist:
        p = os.path.join(d, f)
        src = open(p, encoding='utf-8').read()
        open(p, 'w', encoding='utf-8').write(lang_links(src, f, 'en'))
        for lang in LANGS:
            t, pv = data[lang], prices.values(P, lang)
            out = translate(src, t, pv)
            out = re.sub(r'<html\b([^>]*?)\slang="[^"]*"', lambda m: f'<html{m.group(1)} lang="{lang}"', out, count=1)
            out = title_desc(out, f, lang, t, meta_tr, pv)
            out = localize_links(absolutize(out), lang, page_paths)
            out = lang_links(out, f, lang)
            out = pin_lang(out, lang)
            os.makedirs(os.path.join(d, lang), exist_ok=True)
            open(os.path.join(d, lang, f), 'w', encoding='utf-8').write(out)
    print(f'i18n: {len(plist)} стр. × {len(LANGS)} языка → /' + ', /'.join(LANGS))
    return 0


def _norm(s):
    # ссылки внутри перевода локализуются (/terms → /ru/terms) — сравниваем без префикса
    return re.sub(r'href="/(?:ru|el)(/[^"]*)?"', lambda m: 'href="' + (m.group(1) or '/') + '"', s)


def check(d):
    """Ошибка сборки, если на /ru/ или /el/ остался английский текст из словаря, токен,
    относительный путь, ссылка на EN-страницу или нет перевода title/description."""
    data = load_dict()
    meta_tr = json.load(open(META_FILE, encoding='utf-8'))
    en = data['en']
    bad = []
    plist = pages(d)
    for f in plist:
        en_src = open(os.path.join(d, f), encoding='utf-8').read()
        en_title = TITLE_RE.search(en_src).group(2).strip()
        en_desc = (DESC_RE.search(en_src) or [None, None, None])[2] if DESC_RE.search(en_src) else None
        for lang in LANGS:
            p = os.path.join(d, lang, f)
            if not os.path.exists(p):
                bad.append(f'нет {lang}/{f}')
                continue
            src = open(p, encoding='utf-8').read()
            name = f'{lang}/{f}'
            if f'<html lang="{lang}"' not in src and not re.search(rf'<html\b[^>]*\slang="{lang}"', src):
                bad.append(f'{name}: <html lang> не {lang}')
            if TITLE_RE.search(src).group(2).strip() == en_title:
                bad.append(f'{name}: <title> не переведён (tools/i18n-meta.json)')
            if en_desc and DESC_RE.search(src) and DESC_RE.search(src).group(2) == en_desc:
                bad.append(f'{name}: meta description не переведён (tools/i18n-meta.json)')
            if prices.TOKEN.search(TITLE_RE.search(src).group(2)) or (DESC_RE.search(src) and prices.TOKEN.search(DESC_RE.search(src).group(2))):
                bad.append(f'{name}: токен %%…%% в title/description')
            # Тексты словаря: элемент с data-i18n="k" должен содержать перевод, если он отличается от EN
            for m in START_RE.finditer(src):
                key = m.group(2)
                tr = data[lang].get(key)
                if tr is None or tr == en.get(key) or m.group(1).lower() in VOID:
                    continue
                close = match_close(src, m.end(), m.group(1).lower())
                if close and _norm(src[m.end():close[0]]) != _norm(absolutize(content(tr))):
                    bad.append(f'{name}: [data-i18n="{key}"] без перевода')
            for m in re.finditer(r'\s(?:src|href)="([^"]*)"', src):
                u = m.group(1)
                if u and not REL_SKIP.match(u):
                    bad.append(f'{name}: относительный путь {u}')
            for m in re.finditer(r'<a\b[^>]*\shref="(/[^"#?]*)', src):
                u = m.group(1)
                if (u == '/' or u in {path_of(x) for x in plist}) and 'data-lang-btn' not in m.group(0):
                    bad.append(f'{name}: ссылка на EN-страницу {u}')
            if lang == 'ru':
                text = re.sub(r'<(script|style)\b.*?</\1>', '', src, flags=re.S | re.I)
                for w in ('пакет', 'программа лояльности', 'программу лояльности'):
                    if w in text.lower():
                        bad.append(f'{name}: запрещённый термин «{w}» (см. SVS_TERMS)')
            if (PIN % lang) not in src:
                bad.append(f'{name}: нет svs_lang в <head>')
            if src.count('data-lang-btn=') != 0 and not re.search(rf'<a\b[^>]*data-lang-btn="{lang}"[^>]*aria-current="true"', src):
                bad.append(f'{name}: переключатель языка не ссылки')
    if bad:
        print('ОШИБКА: i18n —', *sorted(set(bad))[:60], sep='\n  ', file=sys.stderr)
        return 1
    print(f'i18n: ок ({len(plist)} стр. × {len(LANGS)} языка: тексты, title/description, ссылки, пути)')
    return 0


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    d = os.path.abspath(args[0]) if args else os.path.join(ROOT, 'dist')
    return check(d) if '--check' in argv else build(d)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
