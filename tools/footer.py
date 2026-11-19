#!/usr/bin/env python3
"""Единый подвал сайта — один источник для всех страниц (по аналогии с tools/header.py).

Подвал хранится в tools/footer.html. Скрипт заменяет в каждой странице блок
<footer class="footer" …> … </footer> на шаблон. Если подвала на странице нет,
вставляет его сразу после </main>.

    python3 tools/footer.py            # обновить подвал во всех *.html в корне
    python3 tools/footer.py --check    # проверить, что подвалы совпадают с шаблоном (exit 1, если нет)
    python3 tools/footer.py DIR        # обновить страницы в другой папке (build.sh вызывает для dist/)

Ссылки и тексты подвала меняйте ТОЛЬКО в tools/footer.html (переводы — ключи footer_* в i18n.js).
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'tools', 'footer.html')
SKIP = {'auth-callback.html'}
FOOTER_RE = re.compile(r'<footer class="footer"[^>]*>.*?</footer>', re.S)


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
        if FOOTER_RE.search(src):
            out = FOOTER_RE.sub(lambda _m: tpl, src, count=1)
        elif '</main>' in src:
            i = src.rindex('</main>') + len('</main>')
            out = src[:i] + '\n\n  ' + tpl + src[i:]
        else:
            bad.append(f + ' (нет <footer class="footer"> и </main>)')
            continue
        if out != src:
            if check:
                bad.append(f)
            else:
                open(p, 'w', encoding='utf-8').write(out)
                print('подвал обновлён:', f)
    if bad:
        print(('подвал отличается от tools/footer.html: ' if check else 'пропущено: ') + ', '.join(bad))
        if check:
            print('запустите: python3 tools/footer.py')
        return 1
    if check:
        print('подвал одинаковый на всех страницах:', len(pages(d)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
