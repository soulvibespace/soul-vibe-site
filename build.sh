#!/usr/bin/env bash
# Собирает папку dist/ только из файлов самого сайта.
# Служебное (README, скрипт публикации, конфиг, git) на сайт не попадает.
set -euo pipefail

rm -rf dist
mkdir -p dist

rsync -a ./ dist/ \
  --exclude 'dist/' \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'node_modules/' \
  --exclude 'build.sh' \
  --exclude 'deploy.py' \
  --exclude 'README.md' \
  --exclude 'netlify.toml' \
  --exclude '.gitignore' \
  --exclude '.DS_Store'

echo "файлов на публикацию: $(find dist -type f | wc -l)"
find dist -type f | sed 's|^dist|  |' | sort
