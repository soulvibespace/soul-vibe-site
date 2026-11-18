#!/usr/bin/env bash
# Собирает папку dist/ только из файлов самого сайта.
# Служебное (README, скрипт публикации, конфиг, git) на сайт не попадает.
set -euo pipefail

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
  python3 tools/header.py dist
  python3 tools/header.py --check dist
  # Единый подвал (tools/footer.html) — так же, как шапка.
  python3 tools/footer.py dist
  python3 tools/footer.py --check dist
  # OG/Twitter-мета-теги: абсолютные адреса от адреса сайта на Netlify ($URL).
  # TODO(домен): после переноса soulvibespace.com — см. tools/meta.py (canonical).
  python3 tools/meta.py dist --base "${SITE_URL:-${URL:-https://soul-vibe-space.netlify.app}}"
else
  echo "ВНИМАНИЕ: python3 не найден — шапка не синхронизирована" >&2
fi

echo "файлов на публикацию: $(find dist -type f | wc -l)"
find dist -type f | sed 's|^dist|  |' | sort
