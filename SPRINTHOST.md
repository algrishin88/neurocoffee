# Развёртывание НейроКофейни на Спринтхост

Краткое руководство по запуску backend и фронтенда на [Спринтхост](https://sprinthost.ru) ([панель cp.sprinthost.ru](https://cp.sprinthost.ru)). Используется Phusion Passenger и Node.js.

## 1. Требования

- Тариф с поддержкой **Node.js** (есть на виртуальном хостинге).
- **PostgreSQL**: база на Спринтхост или внешняя (Neon, Supabase, и т.п.). В `DATABASE_URL` должна быть строка подключения.

## 2. Загрузка проекта

Через **FTP** или **Файловый менеджер** в панели скопируйте проект в нужную папку, например:

```
/home/<логин>/domains/<домен>/public_html/neurocoffee
```

Или используйте поддомен/отдельный домен — путь укажите в `.htaccess` (см. ниже).

Не загружайте в репозиторий и не кладите на хостинг:

- `node_modules` (установится на сервере)
- `.env` (секреты задаются через панель)
- `.git`

## 3. Установка зависимостей

По **SSH** (если доступно):

```bash
cd /home/<логин>/domains/<домен>/public_html/neurocoffee
npm install --production
```

Если SSH нет, на некоторых тарифах зависимости ставятся через скрипт/автодеплой — уточняйте в [поддержке Спринтхост](https://sprinthost.ru/contacts.html).

## 4. Настройка .htaccess

В корне проекта (рядом с `app.js`) должен быть `.htaccess`:

```apache
SetEnv GHOST_NODE_VERSION_CHECK false
SetEnv NODE_ENV production

PassengerStartupFile app.js
PassengerResolveSymlinksInDocumentRoot on
Require all granted
PassengerAppType node
PassengerAppRoot /home/<логин>/domains/<домен>/public_html/neurocoffee
Options -MultiViews
```

**Важно:** замените `PassengerAppRoot` на **полный путь** к папке с проектом на вашем аккаунте.

## 5. Переменные окружения

В панели Спринтхост (раздел «Переменные окружения», «PHP/Node» или аналог) задайте:

| Переменная       | Описание |
|------------------|----------|
| `DATABASE_URL`   | Строка подключения PostgreSQL, например `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET`     | Секрет для JWT (придумайте длинную случайную строку) |
| `NODE_ENV`       | `production` (часто уже ставится через .htaccess) |
| `YANDEX_API_KEY` | (по желанию) для AI-фич |
| `YANDEX_FOLDER_ID` | (по желанию) для Yandex GPT |

Без `DATABASE_URL` и `JWT_SECRET` приложение работать не будет.

## 6. Инициализация БД

По SSH:

```bash
cd /home/<логин>/domains/<домен>/public_html/neurocoffee
npm run db:init
```

Создаётся схема и при необходимости начальное меню.

## 7. Перезапуск приложения

Passenger перезапускает приложение при изменении файлов. Для принудительной перезагрузки:

```bash
touch tmp/restart.txt
```

Или создайте/обновите `tmp/restart.txt` через FTP/файловый менеджер.

## 8. Проверка

- Сайт: `https://ваш-домен.ru/` (или `.../neurocoffee/`).
- API: `https://ваш-домен.ru/api/health` (или `.../neurocoffee/api/health`).

В ответе `/api/health` ожидается JSON с `"status": "OK"` и `"database": "connected"`.

## 9. Приложение в подпапке (например /neurocoffee)

Если сайт открывается как `https://домен.ru/neurocoffee/`, в панели нужно настроить корень сайта (Document Root) на папку с проектом так, чтобы запросы в неё обрабатывались Node.js. Либо используйте поддомен (например `neurocoffee.домен.ru`) с корнем в этой папке — тогда API и статика будут по `/` и `/api` без префикса.

## 10. Типичные проблемы

| Симптом | Что проверить |
|--------|----------------|
| 500 или «Application failed to start» | Путь в `PassengerAppRoot`, права на папку, `npm install`, логи в панели |
| «Database connection failed» | `DATABASE_URL` в переменных окружения, доступность хоста БД с хостинга |
| 404 на `/api/*` | Запросы идут в папку с Node-приложением; корректный `PassengerAppRoot` и `PassengerStartupFile app.js` |

Поддержка Спринтхост: [help.sprinthost.ru](https://help.sprinthost.ru), 8 (800) 555-78-23, support@sprinthost.ru.
