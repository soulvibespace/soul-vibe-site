#!/usr/bin/env python3
"""Проверка терминологии сайта (абонемент / Class Pass, Стартер пак / Starter Pack).

Названия продуктов задаются в одном месте — SVS_TERMS в i18n.js; в переводах вместо
слов стоят плейсхолдеры {{pass}}, {{pass:gen}}, {{Starter}} и т. п.

Скрипт ищет в файлах сайта запрещённые старые слова («пакет», «package», «πακέτο»,
«Multi Pass», «Стартер-пак») и проверяет, что каждый плейсхолдер есть в словаре.

    python3 tools/terms.py            # только предупреждения (exit 0)
    python3 tools/terms.py --check    # exit 1 при любой находке (bash build.sh --check)
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = (glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, '*.js'))
         + glob.glob(os.path.join(ROOT, 'data', '*.json'))
         + [os.path.join(ROOT, 'tools', 'header.html'), os.path.join(ROOT, 'tools', 'footer.html')])
FORBIDDEN = [
    (re.compile(r'(?i)\bpackages?\b(?!\.json|-lock)'), 'package → Class Pass / Starter Pack'),
    (re.compile(r'(?i)пакет'), 'пакет → абонемент / Стартер пак'),
    (re.compile(r'(?i)πακ[έε]τ'), 'πακέτο → Class Pass / Starter Pack (EL — уточнить)'),
    (re.compile(r'(?i)\bmulti pass\b|мульти-?пасс'), 'Multi Pass → Class Pass / абонемент'),
    (re.compile(r'(?i)стартер-пак'), 'Стартер-пак → Стартер пак'),
]
PLACEHOLDER = re.compile(r'\{\{([A-Za-z_]+)(?::([a-z_]+))?\}\}')
FORMS = {'nom', 'gen', 'dat', 'acc', 'ins', 'prep', 'pl', 'pl_gen', 'pl_dat', 'pl_ins', 'pl_prep'}


def term_keys():
    src = open(os.path.join(ROOT, 'i18n.js'), encoding='utf8').read()
    m = re.search(r'const SVS_TERMS = \{(.*?)\n\};', src, re.S)
    if not m:
        return None, ['i18n.js: нет словаря SVS_TERMS']
    langs, errs = {}, []
    for lang, body in re.findall(r'\n  (\w+): \{(.*?)\n  \},', m.group(1), re.S):
        langs[lang] = set(re.findall(r'\n\s+(\w+):\s*\{', body))
    base = langs.get('en', set())
    for lang, keys in langs.items():
        if keys != base:
            errs.append(f'SVS_TERMS.{lang}: ключи {sorted(keys ^ base)} не совпадают с en')
    return base, errs


def main():
    strict = '--check' in sys.argv
    keys, problems = term_keys()
    for f in sorted(set(FILES)):
        if not os.path.exists(f):
            continue
        rel = os.path.relpath(f, ROOT)
        for n, line in enumerate(open(f, encoding='utf8'), 1):
            for rx, hint in FORBIDDEN:
                if rx.search(line):
                    problems.append(f'{rel}:{n}: {hint}: {line.strip()[:120]}')
            for k, form in PLACEHOLDER.findall(line):
                if rel == 'i18n.js' and line.lstrip().startswith('//'):
                    continue
                if keys is not None and k.lower() not in keys:
                    problems.append(f'{rel}:{n}: неизвестный термин {{{{{k}}}}}')
                if form and form not in FORMS:
                    problems.append(f'{rel}:{n}: неизвестная форма {form}')
    if problems:
        print(('ОШИБКА' if strict else 'ВНИМАНИЕ') + ': терминология —', len(problems), 'замечаний', file=sys.stderr)
        for p in problems:
            print('  ' + p, file=sys.stderr)
        return 1 if strict else 0
    print('терминология: ок')
    return 0


if __name__ == '__main__':
    sys.exit(main())
