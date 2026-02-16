# Оплата СБП (ЮKassa)

## Переменные окружения

Добавьте в `.env` или в панель хостинга:

| Переменная | Описание |
|------------|----------|
| `YOOKASSA_SHOP_ID` | ID магазина в личном кабинете ЮKassa |
| `YOOKASSA_SECRET_KEY` | Секретный ключ |
| `BASE_URL` | Базовый URL сайта (для return_url), например `https://neurocoffee.ssir-team.ru` |

## Миграция БД

Перед использованием оплаты выполните:

```bash
npm run db:migrate
```

## Webhook ЮKassa

В [личном кабинете ЮKassa](https://yookassa.ru/my) → Настройки → Уведомления укажите URL:

```
https://ваш-домен.ru/api/payments/webhook
```

События: **Платёж получен** (`payment.succeeded`). После успешной оплаты статус заказа обновится на «оплачен».

## Локальная разработка

Для тестов можно использовать [тестовый магазин ЮKassa](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing).  
`BASE_URL` при локальном запуске — например `http://localhost:3307` (или ваш порт). return_url будет вести на `http://localhost:3307/order-success.html?orderId=...`.
