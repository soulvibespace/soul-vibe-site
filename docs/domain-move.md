# Перенос soulvibespace.com на новый сайт — чек-лист (S5, #136)

Запуск: **1 декабря 2026**. Основной адрес: **https://www.soulvibespace.com**.
`soulvibespace.com` без www автоматически ведёт на www.

Почему www, а не голый домен:
- В Google сейчас проиндексированы адреса `https://www.soulvibespace.com/…`. Если хост останется тем же, Google увидит переезд как обычное обновление страниц.
- Netlify рекомендует при внешнем DNS делать основным поддомен: www работает через CDN по CNAME, а голый домен ходит через один балансировщик.
- Поток GA4 `G-TK6J5M87YL` уже заведён на www.soulvibespace.com.

DNS домена: регистратор Squarespace Domains, записи правятся в Squarespace → Domains → soulvibespace.com → DNS.

## Что уже готово в коде

| Что | Где | В день переноса |
|---|---|---|
| 301 со старых адресов Squarespace | `netlify.toml` (уже включены, безопасны заранее) | ничего; проверить `tools/check-redirects.sh` |
| noindex на всех хостах, кроме soulvibespace.com и www | `netlify/edge-functions/noindex-preview.ts`, тест `tests/noindex-edge.test.mjs` (PR #144) | ничего: app.* и netlify.app остаются закрытыми |
| Базовый адрес, canonical, sitemap, robots, llms, JSON-LD | PR «день переноса» (ветка `seo/domain-switch`) | слить этот PR после того, как HTTPS заработает |

## За 1–3 дня (до 30 ноября)

1. [ ] **Снять DNS-снимок**: скриншот всех записей в Squarespace DNS. На 24.11 там есть:
   - apex `A` → Squarespace (`198.49.23.144` и др.), `www` `CNAME` → `ext-sq.squarespace.com`. **Меняем только их.**
   - `MX` `mxa/mxb.mailgun.org` и apex `TXT` `v=spf1 include:mailgun.org ~all`: входящая почта. **Не трогать.**
   - apex `TXT` `google-site-verification=…` (2 шт.): подтверждение Search Console. **Не трогать.**
   - `resend._domainkey`, `send` (SPF и MX amazonses): письма API с hello@. **Не трогать.**
   - `ecstatic` `CNAME` → `lambent-kleicha-86643a.netlify.app` и его `send.ecstatic`, `resend._domainkey.ecstatic`, `_dmarc.ecstatic`: сайт Ecstatic Dance. **Не трогать.**
   - `book` `A` → `35.242.236.89`: SimplyBook. **Не трогать.**
2. [ ] **Netlify → Domain management**: `soulvibespace.com` уже добавлен (Netlify отдаёт `Link: <http://soulvibespace.com/>; rel=canonical`). Добавить `www.soulvibespace.com` и сделать его **Primary domain**. Голый домен станет редиректом на www.
3. [ ] **Google Cloud → OAuth-клиент** (вход через Google). Добавить:
   - Authorized JavaScript origins: `https://www.soulvibespace.com`, `https://soulvibespace.com`
   - Authorized redirect URIs: `https://www.soulvibespace.com/auth-callback.html`, `https://soulvibespace.com/auth-callback.html`

   Адреса netlify.app не удалять. Сайт сам проверяет готовность (`/api/auth/google/redirect-ready`), поэтому добавить их можно заранее.
4. [ ] **Squarespace**: сайт НЕ отключать и подписку НЕ отменять до проверки в день переноса. Регистрация домена — отдельная услуга, её не трогаем.
5. [ ] Предупредить администратора: в день переноса гости, вошедшие на soul-vibe-space.netlify.app, на www войдут заново. Вход хранится отдельно для каждого адреса, и cookie-баннер тоже спросит ещё раз.

## День переноса (1 декабря, утро, вне занятий)

6. [ ] **DNS в Squarespace Domains** (по [инструкции Netlify](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)):
   - удалить apex `A` Squarespace (все записи Squarespace, напр. `198.49.23.144`, `198.49.23.145`, `198.185.159.144`, `198.185.159.145`; если стоит пресет «Squarespace Defaults», удалить пресет);
   - добавить apex `A` `@` → `75.2.60.5` (балансировщик Netlify; ALIAS в Squarespace нет);
   - заменить `www` `CNAME` `ext-sq.squarespace.com` на `soul-vibe-space.netlify.app`;
   - `AAAA` для apex не добавлять. `CAA` сейчас нет; если появится, разрешить `letsencrypt.org`.
7. [ ] Проверить, что DNS обновился: `dig +short www.soulvibespace.com` (Netlify) и `dig +short soulvibespace.com` (`75.2.60.5`). Обычно 5–60 минут, бывает до 24 часов.
8. [ ] **HTTPS**: Netlify → Domain management → HTTPS → «Verify DNS configuration» → «Provision certificate» (Let's Encrypt на оба имени). Затем проверить:
   - `curl -sI http://soulvibespace.com` → `301` на `https://www.soulvibespace.com/`
   - `curl -sI http://www.soulvibespace.com` → `301` на `https://www.soulvibespace.com/`
   - `curl -sI https://soulvibespace.com/pricing` → `301` на `https://www.soulvibespace.com/pricing`
   - `curl -sI https://www.soulvibespace.com/` → `200`, `strict-transport-security`, **без** `x-robots-tag`
   - `curl -sI https://soul-vibe-space.netlify.app/` → `x-robots-tag: noindex, nofollow` (остаётся)
9. [ ] **Слить PR «день переноса»** (`seo/domain-switch`): базовый адрес `https://www.soulvibespace.com` в `tools/meta.py`, `canonical` включён, в sitemap/robots/llms/JSON-LD адреса на www. После публикации:
   - `curl -s https://www.soulvibespace.com/ | grep canonical` → `https://www.soulvibespace.com/`
   - `curl -s https://www.soulvibespace.com/robots.txt | tail -1` → `Sitemap: https://www.soulvibespace.com/sitemap.xml`
10. [ ] **Старые адреса**: `bash tools/check-redirects.sh https://www.soulvibespace.com` → «все адреса в порядке».
11. [ ] **API (Render → soul-vibe-api → Environment)**: `SITE_URL=https://www.soulvibespace.com` (сейчас по умолчанию netlify.app). От него зависят ссылки в письмах, Stripe `success_url` и `cancel_url`. Render перезапустит сервис сам; потом проверить `/api/health`. CORS уже пускает оба адреса soulvibespace.com.
12. [ ] **Сквозная проверка на www** (телефон и компьютер): вход по коду из письма, вход через Google, запись на занятие, кабинет, онлайн-оплата Class Pass (тестовая или на минимальную сумму) с возвратом на `/payment`, отмена оплаты → `/pricing?payment=cancelled`, письмо со ссылкой на кабинет ведёт на www.
13. [ ] **GA4**: Realtime показывает посещения с `www.soulvibespace.com` после «Принять все».

## День +1 … +7

14. [ ] **Search Console**: ресурс-домен `soulvibespace.com` (TXT уже есть, проверить доступ владельца) → Sitemaps → `https://www.soulvibespace.com/sitemap.xml`. Проверить URL для `/`, `/pricing`, `/classes`, `/yoga-studio-limassol` (должен показать 301).
15. [ ] **Bing Webmaster Tools**: импорт из Search Console, отправить sitemap (через Bing ищет и ChatGPT).
16. [ ] **Google Business Profile**: сайт `https://www.soulvibespace.com/`, кнопка записи `https://www.soulvibespace.com/schedule`. NAP как на сайте: **50 Agias Zonis, Limassol 3090, ежедневно 8:00–22:00**. На старом сайте было «50 Agia Zonis, 3095, 9:00–22:00», то есть данные расходятся. Проверить и профиль.
17. [ ] Ссылки в профилях Instagram и TikTok, на сайте Ecstatic Dance (JSON-LD `@id https://soulvibespace.com/#organization` → www), в SimplyBook (адрес сайта в настройках и письмах), в Stripe (Business website).
18. [ ] Включить в `netlify.toml` склейку `soul-vibe-space.netlify.app/*` → www (правило лежит закомментированным) после того, как пункт 12 прошёл и `SITE_URL` уже www.
19. [ ] Отключить сайт на Squarespace (не домен!) через 1–2 недели, когда Search Console покажет новые страницы в индексе.

## Откат

Если сайт на www не работает больше 30 минут: в Squarespace DNS вернуть apex `A` и `www` `CNAME` `ext-sq.squarespace.com` по снимку из пункта 1. Squarespace-сайт ещё не отключён, поэтому старый сайт сразу вернётся. В Render вернуть `SITE_URL` на netlify.app.
