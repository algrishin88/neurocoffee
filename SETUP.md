# Настройка проекта НейроКофейня

## Подключение API к фронтенду

### Шаг 1: Добавьте скрипт API в HTML файлы

Добавьте перед закрывающим тегом `</body>` во всех HTML файлах (index.html, menubeta.html, contact.html, services.html, login.html, register.html):

```html
<!-- Подключение API (должен быть загружен перед другими скриптами) -->
<script src="js/api.js"></script>
```

### Шаг 2: Обновление страниц

Все страницы уже обновлены для работы с API. Скрипт `js/cart.js` автоматически использует API, если он доступен, иначе использует localStorage как fallback.

### Шаг 3: Обновление форм авторизации

Для полной интеграции обновите `login.html` и `register.html` для использования API:

#### В login.html замените обработчик формы:

```javascript
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const remember = formData.get('remember');
    
    try {
        const response = await API.auth.login(email, password);
        
        if (response.success) {
            showMessage('Вход выполнен успешно!', 'success');
            
            if (remember) {
                localStorage.setItem('neuro-cafe-token', response.token);
                localStorage.setItem('neuro-cafe-current-user', JSON.stringify(response.user));
            } else {
                sessionStorage.setItem('neuro-cafe-token', response.token);
                sessionStorage.setItem('neuro-cafe-current-user', JSON.stringify(response.user));
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (error) {
        showMessage(error.message || 'Ошибка при входе', 'error');
    }
});
```

#### В register.html аналогично обновите обработчик регистрации.

## Структура файлов

```
neirocafe/
├── server.js              # Главный файл сервера
├── package.json           # Зависимости Node.js
├── .env                   # Переменные окружения (создайте из .env.example)
├── models/                # Модели базы данных
│   ├── User.js
│   ├── Cart.js
│   ├── Order.js
│   ├── Booking.js
│   ├── Contact.js
│   └── MenuItem.js
├── routes/                # API маршруты
│   ├── auth.js
│   ├── cart.js
│   ├── orders.js
│   ├── bookings.js
│   ├── contacts.js
│   └── menu.js
├── middleware/            # Middleware
│   └── auth.js
├── scripts/              # Скрипты
│   └── initMenu.js
├── js/                   # Фронтенд JavaScript
│   ├── api.js           # API клиент
│   └── cart.js          # Управление корзиной
└── [HTML файлы]         # HTML страницы
```

## Проверка работы

1. Запустите сервер: `npm run dev`
2. Откройте консоль браузера (F12)
3. Проверьте, что API загружен: `console.log(window.API)`
4. Попробуйте зарегистрироваться или войти
5. Проверьте работу корзины

## Отладка

### Проблемы с CORS

Убедитесь, что сервер запущен и CORS настроен правильно в `server.js`.

### Ошибки подключения к API

1. Проверьте, что сервер запущен на порту 3000
2. Проверьте адрес API в `js/api.js` (по умолчанию `http://localhost:3000/api`)
3. Откройте консоль браузера для просмотра ошибок

### Проблемы с авторизацией

1. Проверьте, что токен сохраняется: `localStorage.getItem('neuro-cafe-token')`
2. Проверьте формат токена в заголовках запросов
3. Убедитесь, что JWT_SECRET в `.env` совпадает на сервере

