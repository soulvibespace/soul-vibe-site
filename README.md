# Soul Vibe Space — фронтенд

Статический сайт студии. Деплоится на Netlify автоматически при пуше в `main`.

- Живой сайт: https://soul-vibe-space.netlify.app
- Netlify site ID: `5160c45c-80d9-4a82-9a3d-068717d5fdc2`
- Бэкенд API: https://soul-vibe-api.onrender.com (репозиторий `soulvibespace/soul-vibe-api`)

## Как вносить правки

```bash
git clone git@github.com:soulvibespace/soul-vibe-site.git
# правим файлы
git commit -am "что изменили"
git push origin main   # Netlify подхватит и опубликует сам
```

Сборки нет — Netlify публикует корень репозитория как есть. Настройки кэша и
заголовков безопасности лежат в `netlify.toml`.

## Структура

| Файл | Назначение |
|---|---|
| `index.html` | Главная |
| `schedule.html` | Расписание, тянет данные из `/api/schedule` |
| `classes.html`, `pricing.html`, `about.html`, `space.html`, `contact.html` | Контентные страницы |
| `account.html`, `account.js` | Личный кабинет: брони, отмена |
| `auth-modal.js` | Вход и регистрация |
| `booking-modal.js` | Запись на занятие |
| `i18n.js` | Переводы EN / RU / EL |
| `app.js` | Общая логика, навигация |
| `style.css` | Все стили |
| `privacy.html`, `terms.html`, `cookie-banner.js` | Юридические страницы и согласия |

## Важно

**Не деплоить вручную через ZIP.** До августа 2026 сайт заливался архивами, из-за
чего появились три разошедшиеся копии и правки терялись. Теперь единственный
источник истины — этот репозиторий. Всё, что не в `main`, на сайт не попадёт.

Домен `soulvibespace.com` пока указывает на старый сайт на Squarespace. Перенос —
отдельная задача после того как новый сайт будет доделан.

<!-- deploy pipeline verified 2026-08-25T17:55Z -->
