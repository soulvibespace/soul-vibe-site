# Перенос soulvibespace.com на новый сайт — чек-лист (S5, #136)

План в два этапа:
1. **Сейчас (до 1 декабря): app.soulvibespace.com.** Новый сайт открывается параллельно, а soulvibespace.com и www остаются на Squarespace до Yoga Day **13.12**: там идут массовые регистрации. app.* закрыт от поиска (noindex).
2. **Через несколько дней после 13.12: переключение апекса.** soulvibespace.com и www переходят на Netlify. Основной адрес: **https://www.soulvibespace.com**, голый домен Netlify сам ведёт на www. app.soulvibespace.com остаётся рабочим алиасом для установленных PWA, без редиректа и с noindex.

Почему основным будет www, а не голый домен:
- В Google сейчас проиндексированы адреса `https://www.soulvibespace.com/…`. Если хост останется тем же, Google увидит переезд как обычное обновление страниц.
- Netlify рекомендует при внешнем DNS делать основным поддомен: www работает через CDN по CNAME, а голый домен ходит через один балансировщик.
- Поток GA4 `G-TK6J5M87YL` уже заведён на www.soulvibespace.com.

Не трогаем никогда: `yoga-cyprus.com` (301 → soulvibespace.simplybook.it, используется в Google Картах), `book.soulvibespace.com` (SimplyBook), MX Mailgun, NS у Squarespace (бывший Google Domains: `ns-cloud-a1…a4.googledomains.com`).
DNS домена: регистратор Squarespace Domains, записи правятся в Squarespace → Domains → soulvibespace.com → DNS.

## Что уже готово в коде

| Что | Где | В день переноса |
|---|---|---|
| 301 со старых адресов Squarespace | `netlify.toml` (уже включены, безопасны заранее) | ничего; проверить `tools/check-redirects.sh` |
| noindex на всех хостах, кроме soulvibespace.com и www | `netlify/edge-functions/noindex-preview.ts`, тест `tests/noindex-edge.test.mjs` (PR #144) | ничего: app.* и netlify.app остаются закрытыми |
| Адрес сборки (og, JSON-LD, sitemap, robots, llms) без зашитого netlify.app | PR #145, переменная Netlify `SITE_URL` | этап 1: app.*, этап 2: www |
| canonical на основной домен | PR «день переключения» (ветка `seo/domain-switch`) | слить на этапе 2 после HTTPS |
| CORS и возврат из Stripe для app.*, apex, www | soul-vibe-api PR #21 | ничего: покупатель возвращается туда, откуда платил |

## Этап 1. app.soulvibespace.com (до 1 декабря)

1. [ ] **DNS-снимок**: скриншот всех записей в Squarespace DNS. На 24.11 там есть:
   - apex `A` → Squarespace (`198.49.23.144` и др.), `www` `CNAME` → `ext-sq.squarespace.com`. Меняются только на этапе 2.
   - `MX` `mxa/mxb.mailgun.org` и apex `TXT` `v=spf1 include:mailgun.org ~all`: входящая почта. **Не трогать.**
   - apex `TXT` `google-site-verification=…` (2 шт.): подтверждение Search Console. **Не трогать.**
   - `resend._domainkey`, `send` (SPF и MX amazonses): письма API с hello@. **Не трогать.**
   - `ecstatic` `CNAME` → `lambent-kleicha-86643a.netlify.app` и его `send.ecstatic`, `resend._domainkey.ecstatic`, `_dmarc.ecstatic`: сайт Ecstatic Dance. **Не трогать.**
   - `book` `A` → `35.242.236.89`: SimplyBook. **Не трогать.**
2. [ ] **Squarespace DNS**: добавить `CNAME` `app` → `soul-vibe-space.netlify.app` (без `https://`, без точки и пути).
3. [ ] **Netlify → Domain management**:
   - добавить `app.soulvibespace.com` и сделать его **Primary domain**;
   - убрать `soulvibespace.com` и `www.soulvibespace.com` до этапа 2. Сейчас там `soulvibespace.com` (Netlify отдаёт `Link: <http://soulvibespace.com/>; rel=canonical`). Пока они указывают на Squarespace, Let's Encrypt не может их проверить, и выпуск общего сертификата может не пройти.
   - HTTPS → «Verify DNS configuration» → «Provision certificate».
4. [ ] **Netlify → Environment variables**: `SITE_URL=https://app.soulvibespace.com` → Deploys → «Trigger deploy». Тогда og:url, JSON-LD, sitemap и robots собираются на app.* (PR #145).
5. [ ] **Render → soul-vibe-api → Environment**: `SITE_URL=https://app.soulvibespace.com` (ссылки в письмах). CORS и возврат из Stripe для app.* — API PR #21.
6. [ ] **Google Cloud → OAuth-клиент** `201608741686-96ngo0j9vg3190g6satnoaj7e452km4j`. Сразу добавить все три домена:
   - Authorized JavaScript origins: `https://app.soulvibespace.com`, `https://soulvibespace.com`, `https://www.soulvibespace.com`
   - Authorized redirect URIs: `https://app.soulvibespace.com/auth-callback.html`, `https://soulvibespace.com/auth-callback.html`, `https://www.soulvibespace.com/auth-callback.html`
   - адреса netlify.app не удалять. Consent screen → Authorized domains: `soulvibespace.com`.
   - Проверка: `https://soul-vibe-api.onrender.com/api/auth/google/redirect-ready?redirect_uri=https://app.soulvibespace.com/auth-callback.html` → `"ready":true` (24.11: false).
7. [ ] **Проверки app.***:
   - `curl -sI http://app.soulvibespace.com/` → `301` на `https://app.soulvibespace.com/`
   - `curl -sI https://app.soulvibespace.com/` → `200`, `x-robots-tag: noindex, nofollow` (PR #144)
   - `curl -s https://app.soulvibespace.com/ | grep og:url` → `https://app.soulvibespace.com/`
   - сквозная проверка с телефона и компьютера: вход по коду из письма, вход через Google, запись на занятие, кабинет, онлайн-оплата с возвратом на `app.…/payment`, отмена → `app.…/pricing?payment=cancelled`, ссылка в письме ведёт на app.*.
8. [ ] Предупредить администратора: гости, вошедшие на soul-vibe-space.netlify.app, на app.* войдут заново. Вход хранится отдельно для каждого адреса, и cookie-баннер тоже спросит ещё раз.

## Этап 2. Переключение апекса (через несколько дней после 13.12, утро, вне занятий)

9. [ ] **Netlify → Domain management**: добавить `www.soulvibespace.com` и сделать его **Primary domain** (apex добавится сам и будет вести на www). `app.soulvibespace.com` оставить алиасом. Netlify автоматически перенаправляет только apex ↔ www, другие поддомены нет, поэтому app.* продолжит открываться без редиректа.
10. [ ] **DNS в Squarespace Domains** (по [инструкции Netlify](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)):
   - удалить apex `A` Squarespace (все записи Squarespace, напр. `198.49.23.144`, `198.49.23.145`, `198.185.159.144`, `198.185.159.145`; если стоит пресет «Squarespace Defaults», удалить пресет);
   - добавить apex `A` `@` → `75.2.60.5` (балансировщик Netlify; ALIAS в Squarespace нет);
   - заменить `www` `CNAME` `ext-sq.squarespace.com` на `soul-vibe-space.netlify.app`;
   - `MX`, `TXT`, `app`, `book`, `ecstatic`, `send`, `resend._domainkey` и NS не трогать. `AAAA` для apex не добавлять. `CAA` сейчас нет; если появится, разрешить `letsencrypt.org`.
11. [ ] Проверить, что DNS обновился: `dig +short www.soulvibespace.com` (Netlify) и `dig +short soulvibespace.com` (`75.2.60.5`); `dig +short MX soulvibespace.com` (Mailgun, без изменений). Обычно 5–60 минут, бывает до 24 часов.
12. [ ] **HTTPS**: Netlify → HTTPS → «Verify DNS configuration» → «Provision certificate». Затем проверить:
   - `curl -sI http://soulvibespace.com` → `301` на `https://www.soulvibespace.com/`
   - `curl -sI https://soulvibespace.com/pricing` → `301` на `https://www.soulvibespace.com/pricing`
   - `curl -sI https://www.soulvibespace.com/` → `200`, **без** `x-robots-tag`
   - `curl -sI https://app.soulvibespace.com/` → `200`, `x-robots-tag: noindex, nofollow` (остаётся)
13. [ ] **Адрес сборки**: Netlify `SITE_URL=https://www.soulvibespace.com` и слить PR «день переключения» (ветка `seo/domain-switch`: `DEFAULT_BASE` на www, `canonical` включён на всех страницах, в том числе на app.*, где он указывает на www) → deploy. Проверить:
   - `curl -s https://www.soulvibespace.com/ | grep canonical` → `https://www.soulvibespace.com/`
   - `curl -s https://app.soulvibespace.com/pricing | grep canonical` → `https://www.soulvibespace.com/pricing`
   - `curl -s https://www.soulvibespace.com/robots.txt | tail -1` → `Sitemap: https://www.soulvibespace.com/sitemap.xml`
14. [ ] **Старые адреса**: `bash tools/check-redirects.sh https://www.soulvibespace.com` → «все адреса в порядке».
15. [ ] **Render**: `SITE_URL=https://www.soulvibespace.com`. Stripe возвращает покупателя на тот адрес, с которого он платил (app.* или www); письма ведут на www.
16. [ ] **Сквозная проверка на www**, как в пункте 7, плюс GA4 Realtime после «Принять все».

## После переключения (+1 … +7 дней)

17. [ ] **Search Console**: ресурс-домен `soulvibespace.com` (TXT уже есть) → Sitemaps → `https://www.soulvibespace.com/sitemap.xml`. Проверить URL для `/`, `/pricing`, `/classes`, `/yoga-studio-limassol` (должен показать 301).
18. [ ] **Bing Webmaster Tools**: импорт из Search Console, отправить sitemap.
19. [ ] **Google Business Profile**: сайт `https://www.soulvibespace.com/`, кнопка записи `https://www.soulvibespace.com/schedule`. NAP как на сайте: **50 Agias Zonis, Limassol 3090, ежедневно 8:00–22:00**. На старом сайте было «50 Agia Zonis, 3095, 9:00–22:00». yoga-cyprus.com в Картах не трогать.
20. [ ] Ссылки в профилях Instagram и TikTok, на сайте Ecstatic Dance (JSON-LD `@id https://soulvibespace.com/#organization` → www), в SimplyBook (адрес сайта в настройках и письмах), в Stripe (Business website), на consent screen Google.
21. [ ] Отключить сайт на Squarespace (не домен!) через 1–2 недели, когда Search Console покажет новые страницы в индексе.

## Откат

- Этап 1: убрать `CNAME app` или домен из Netlify. Squarespace не затронут.
- Этап 2: если сайт на www не работает больше 30 минут, в Squarespace DNS вернуть apex `A` и `www` `CNAME` `ext-sq.squarespace.com` по снимку из пункта 1. Squarespace-сайт ещё не отключён, поэтому старый сайт сразу вернётся. app.* при этом продолжает работать. В Netlify и Render вернуть `SITE_URL=https://app.soulvibespace.com`.
