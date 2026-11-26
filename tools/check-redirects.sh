#!/usr/bin/env bash
# Проверка адресов старого сайта Squarespace на новом сайте (S5, #136).
#   bash tools/check-redirects.sh https://soul-vibe-space.netlify.app   # до переноса
#   bash tools/check-redirects.sh https://www.soulvibespace.com          # в день переноса
# Для каждого старого адреса: 301 на нужную новую страницу, а она отвечает 200.
# Старые адреса — https://www.soulvibespace.com/sitemap.xml (24.11.2026) + меню,
# плюс страницы, убранные при перестройке структуры (#152): /space → /about, /price-list → /rental.
# Языковые /ru|/el/space и /price-list проверяются после слияния S2 (#150): tests/i18n-urls.test.js.
set -uo pipefail
BASE="${1:-https://soul-vibe-space.netlify.app}"; BASE="${BASE%/}"
fail=0
# старый адрес | куда должен вести ("=" — та же страница, ждём 200)
while IFS='|' read -r old want; do
  [ -z "$old" ] && continue
  if [ "$want" = "=" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE$old")
    if [ "$code" = "200" ]; then echo "ок   $old → 200"; else echo "ОШИБКА $old → $code (ждали 200)"; fail=1; fi
    continue
  fi
  read -r code loc < <(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$old")
  loc="${loc%%\?*}"
  final=$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE$old")
  if [ "$code" = "301" ] && [ "$loc" = "$BASE$want" ] && [ "$final" = "200" ]; then
    echo "ок   $old → 301 $want"
  else
    echo "ОШИБКА $old → $code $loc (ждали 301 $BASE$want), итог $final"; fail=1
  fi
done <<'LIST'
/|=
/about|=
/about/|=
/contact|=
/schedule|=
/gift-certificates|=
/home|/
/home/|/
/yoga-studio-limassol|/classes
/gift-certificates/gift-certificates|/gift-certificates
/gift-certificates/p/gift-sertificate-soul-vibe-space-20|/gift-certificates
/cart|/gift-certificates
/commerce/show-cart|/gift-certificates
/search?q=yoga|/
/space|/about
/space.html|/about
/price-list|/rental
/price-list.html|/rental
LIST
# Несуществующий адрес — наша страница 404 с кодом 404.
code=$(curl -s -o /tmp/svs-404.html -w '%{http_code}' "$BASE/no-such-page-svs")
if [ "$code" = "404" ] && grep -q 'nf-title' /tmp/svs-404.html; then echo "ок   404 → своя страница"; else echo "ОШИБКА 404 → $code"; fail=1; fi
[ $fail = 0 ] && echo "все адреса в порядке" || { echo "есть ошибки"; exit 1; }
