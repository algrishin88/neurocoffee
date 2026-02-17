# Код-ревью и Production-чеклист

## Результаты ревью

### Безопасность
- **CORS**: ограничен в production доменами `neurocup.ru`, `www.neurocup.ru`.
- **Rate limit**: глобальный на `/api`, отдельно ужесточён на auth/login, auth/register, contacts, ai.
- **Helmet**: включён (CSP отключён под статику).
- **Статика**: блокируется раздача `/lib`, `/routes`, `/.env`, `server.js`, `package.json`.
- **Ошибки**: в production не отдаётся `error.message` в JSON (только в development).
- **JWT**: проверка наличия `JWT_SECRET` при старте и в middleware.
- **Пароли**: bcrypt, параметризованные запросы везде.

### База данных
- **Подключение**: `lib/db.js` — пул с таймаутами, опциональный SSL по `PG_SSL` или по `sslmode` в `DATABASE_URL`.
- **Транзакции**: в `orders` используется `getClient()` + `BEGIN`/`COMMIT`/`ROLLBACK`, в `finally` — `client.release()`.
- **Параметризация**: все запросы через `$1, $2, ...`, SQL-инъекции исключены.
- **Схема**: создаётся при старте в `initDatabaseSchema()`, ALTER TABLE IF NOT EXISTS для обратной совместимости.

### Auth и Yandex OAuth
- Регистрация: валидация express-validator, сохранение birthDate, preferences, newsletter.
- Вход: проверка пароля через bcrypt.
- Yandex: проверка конфига в `lib/yandex.js`, scope `login:email login:info`, `redirect_uri` в обмене кода, обработка ошибок с понятными сообщениями.
- Callback GET: trim кода, устойчивое чтение полей пользователя из БД (camelCase/snake_case).

### Платежи
- `BASE_URL`: по умолчанию `https://neurocup.ru` для return_url СБП.
- Webhook YooKassa: проверка суммы и статуса заказа, идемпотентность по уже оплаченному.

### Рекомендации для production
1. В Dokploy задать: `DATABASE_URL`, `JWT_SECRET`, `YANDEX_*`, при необходимости `YOOKASSA_*`, `BASE_URL`, `NODE_ENV=production`.
2. При использовании внешнего PostgreSQL с SSL: `PG_SSL=true` или добавить в `DATABASE_URL` `?sslmode=require`.
3. В кабинете Яндекс OAuth Callback URI: `https://neurocup.ru/redirect.html`.

## Внесённые правки (перед деплоем)
- `lib/db.js`: пул с таймаутами и опциональным SSL.
- `routes/payments.js`: `BASE_URL` по умолчанию `https://neurocup.ru`.
