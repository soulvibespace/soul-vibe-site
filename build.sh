#!/usr/bin/env bash
# Собирает папку dist/ только из файлов самого сайта.
# Служебное (README, скрипт публикации, конфиг, git) на сайт не попадает.
set -euo pipefail

# bash build.sh --check — строгий режим: проверка терминологии (tools/terms.py) роняет сборку.
STRICT=""
for a in "$@"; do [ "$a" = "--check" ] && STRICT="--check"; done

rm -rf dist
mkdir -p dist

rsync -a ./ dist/ \
  --exclude 'dist/' \
  --exclude '.git/' \
  --exclude '.git' \
  --exclude '.github/' \
  --exclude 'node_modules/' \
  --exclude 'build.sh' \
  --exclude 'tools/' \
  --exclude 'tests/' \
  --exclude 'deploy.py' \
  --exclude 'README.md' \
  --exclude 'netlify.toml' \
  --exclude '.gitignore' \
  --exclude '__pycache__/' \
  --exclude '*.pyc' \
  --exclude '.DS_Store'

# Единая шапка: вставляем tools/header.html во все страницы dist/ и проверяем,
# что меню одинаковое везде (сборка падает, если нет).
if command -v python3 >/dev/null 2>&1; then
  # Цифры цен и VIBES: токены %%…%% в HTML → значения из SVS_PRICES (i18n.js). До meta.py,
  # чтобы в og:description попали готовые цифры.
  python3 tools/prices.py $STRICT dist
  python3 tools/header.py dist
  python3 tools/header.py --check dist
  # Единый подвал (tools/footer.html) — так же, как шапка.
  python3 tools/footer.py dist
  python3 tools/footer.py --check dist
  # OG/Twitter-мета-теги: абсолютные адреса от SITE_URL (по умолчанию — адрес в tools/meta.py,
  # https://soul-vibe-space.netlify.app). $URL Netlify НЕ используем: там уже стоит
  # soulvibespace.com, а домен ещё указывает на старый сайт.
  # TODO(домен): после переноса soulvibespace.com — см. tools/meta.py (DEFAULT_BASE, CANONICAL).
  python3 tools/meta.py dist ${SITE_URL:+--base "$SITE_URL"}
  # Термины (абонемент / Class Pass, Стартер пак / Starter Pack): по умолчанию только
  # предупреждения, с --check — ошибка. Словарь — SVS_TERMS в i18n.js.
  python3 tools/terms.py $STRICT
else
  echo "ВНИМАНИЕ: python3 не найден — шапка не синхронизирована" >&2
fi

# С --check — ещё и тесты расчёта оплаты при записи (pay-plan.js), если есть node.
if [ -n "$STRICT" ] && command -v node >/dev/null 2>&1; then
  node tests/pay-plan.test.js >/dev/null || { echo "ОШИБКА: tests/pay-plan.test.js" >&2; exit 1; }
  echo "тесты оплаты: ок"
  node tests/prices.test.js >/dev/null || { echo "ОШИБКА: tests/prices.test.js" >&2; exit 1; }
  echo "тесты цен: ок"
  node tests/activity.test.js >/dev/null || { echo "ОШИБКА: tests/activity.test.js" >&2; exit 1; }
  echo "тесты бонуса за активность: ок"
  node tests/payments.test.js >/dev/null || { echo "ОШИБКА: tests/payments.test.js" >&2; exit 1; }
  echo "тесты онлайн-оплаты: ок"
fi

echo "файлов на публикацию: $(find dist -type f | wc -l)"
find dist -type f | sed 's|^dist|  |' | sort
