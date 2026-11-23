#!/usr/bin/env python3
"""Цифры цен и VIBES в HTML — из одного места (SVS_PRICES в i18n.js).

В HTML страниц (статичный текст, meta description, JSON-LD) вместо цифр стоят
токены %%MP8.price%%, %%MP8.per%%, %%class%% и т. п. (список — в комментарии над
SVS_PRICES в i18n.js). Скрипт раскрывает их при сборке, на английском — как и
статичный текст страниц; на языке посетителя тексты подставляет i18n.js
(svsExpandPrices) с теми же правилами.

    python3 tools/prices.py dist          # раскрыть токены в dist/*.html (build.sh)
    python3 tools/prices.py --check dist  # ошибка, если остался неизвестный токен
    python3 tools/prices.py --dump ru     # значения токенов (JSON) — для tests/prices.test.js

Логика расчёта повторяет svsPriceValues() в i18n.js — меняйте их вместе.
"""
import json
import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN = re.compile(r'%%([A-Za-z0-9_.]+)%%')


def load():
    src = open(os.path.join(ROOT, 'i18n.js'), encoding='utf8').read()
    m = re.search(r'/\*prices:start\*/(.*?)/\*prices:end\*/', src, re.S)
    if not m:
        sys.exit('i18n.js: нет блока SVS_PRICES (/*prices:start*/ … /*prices:end*/)')
    return json.loads(m.group(1))


def class_word(n, lang):
    if lang == 'ru':
        m10, m100 = n % 10, n % 100
        if m10 == 1 and m100 != 11:
            return 'занятие'
        return 'занятия' if 2 <= m10 <= 4 and not 12 <= m100 <= 14 else 'занятий'
    if lang == 'el':
        return 'μάθημα' if n == 1 else 'μαθήματα'
    return 'class' if n == 1 else 'classes'


def values(P, lang='en'):
    dec = '.' if lang == 'en' else ','

    def eur(x):
        r = math.floor(x * 100 + 0.5) / 100
        return '€' + (str(int(r)) if r == int(r) else ('%.2f' % r).replace('.', dec))

    def pct(x):
        return '%d%%' % math.ceil(x - 0.5)

    def num(x):
        return eur(x)[1:]

    v = {'class': P['class_vibes'], 'dropin': eur(P['dropin_eur']), 'dropin_n': num(P['dropin_eur']),
         'topup': eur(P['topup_eur_per_vibe']), 'topup_n': num(P['topup_eur_per_vibe']),
         'refund': eur(P['refund_eur_per_vibe']), 'freeze': P['freeze_max_days']}
    min_per, max_save = float('inf'), 0
    for code, p in P['plans'].items():
        classes = p['vibes'] / P['class_vibes']
        full = classes * P['dropin_eur']
        per, save = p['price'] / classes, (full - p['price']) / full * 100
        v.update({code + '.price': eur(p['price']), code + '.price_n': num(p['price']), code + '.vibes': p['vibes'], code + '.days': p['days'],
                  code + '.classes': int(classes), code + '.per': eur(per), code + '.save': pct(save),
                  code + '.save_eur': eur(full - p['price']), code + '.full': eur(full)})
        tv = math.floor(p['price'] / P['topup_eur_per_vibe'])  # «абонемент vs обычное пополнение той же суммы»
        v.update({code + '.topup_vibes': tv, code + '.topup_classes': tv // P['class_vibes']})
        v[code + '.extra_classes'] = v[code + '.classes'] - tv // P['class_vibes']
        if p['kind'] == 'pass':
            min_per, max_save = min(min_per, per), max(max_save, save)
    v['min_per'], v['max_save'] = eur(min_per), pct(max_save)
    for k, n in P['bonus'].items():
        v['bonus.' + k] = n
    ex = P['plans'][P['example']['plan']]
    bonus = sum(P['bonus'][k] for k in P['example']['bonuses'])
    total = ex['vibes'] + bonus
    v.update({'ex.plan': P['example']['plan'], 'ex.price': eur(ex['price']), 'ex.base': ex['vibes'],
              'ex.bonus': bonus, 'ex.total': total, 'ex.classes': total // P['class_vibes'],
              'ex.per': eur(math.floor(ex['price'] / (total / P['class_vibes']) * 10 + 0.5) / 10)})
    v['ex.classes_word'] = class_word(v['ex.classes'], lang)
    return {k: str(x) for k, x in v.items()}


def main(argv):
    check = '--check' in argv
    if '--dump' in argv:  # для tests/prices.test.js: значения токенов на языке
        lang = argv[argv.index('--dump') + 1] if len(argv) > argv.index('--dump') + 1 else 'en'
        print(json.dumps(values(load(), lang), ensure_ascii=False, sort_keys=True))
        return 0
    args = [a for a in argv if not a.startswith('--')]
    d = os.path.abspath(args[0]) if args else os.path.join(ROOT, 'dist')
    v = values(load())
    bad, n = [], 0
    for f in sorted(os.listdir(d)):
        if not f.endswith('.html'):
            continue
        p = os.path.join(d, f)
        src = open(p, encoding='utf8').read()
        for k in TOKEN.findall(src):
            if k not in v:
                bad.append(f'{f}: неизвестный токен %%{k}%%')
        out = TOKEN.sub(lambda m: v.get(m.group(1), m.group(0)), src)
        if out != src:
            n += 1
            open(p, 'w', encoding='utf8').write(out)
    if bad:
        print('ОШИБКА: цены —', *bad, sep='\n  ', file=sys.stderr)
        return 1 if check else 0
    print(f'цены: ок (токены раскрыты на {n} стр.)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
