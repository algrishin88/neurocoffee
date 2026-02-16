#!/bin/bash
# Примеры для тестирования Яндекс OAuth интеграции

# Примечание: Замените URL на свой локальный или продакшн адрес
API_URL="http://localhost:3307/api"

echo "=== Примеры тестирования Яндекс OAuth ==="
echo ""

# 1. Получить URL авторизации
echo "1️⃣ Получить URL для авторизации:"
echo "curl -X GET $API_URL/auth/yandex/login"
echo ""

# Пример использования:
# curl -X GET http://localhost:3307/api/auth/yandex/login | jq
# Ответ:
# {
#   "success": true,
#   "authUrl": "https://oauth.yandex.com/authorize?client_id=..."
# }

echo "2️⃣ После авторизации в Яндексе, обработать callback:"
echo "curl -X POST $API_URL/auth/yandex/callback \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"code\": \"<code_from_yandex>\"}'"
echo ""

# Пример использования:
# curl -X POST http://localhost:3307/api/auth/yandex/callback \
#   -H 'Content-Type: application/json' \
#   -d '{"code": "AgAACbW1AGbfUAACgD4oDlrZW7xjHQ-Lg8"}'
#
# Ответ:
# {
#   "success": true,
#   "message": "Вход через Яндекс успешен",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "user123",
#     "firstName": "Иван",
#     "lastName": "Иванов",
#     "email": "ivan@example.com"
#   }
# }

echo "3️⃣ Проверить текущего пользователя (с авторизацией):"
echo "curl -X GET $API_URL/auth/me \\"
echo "  -H 'Authorization: Bearer <jwt_token>'"
echo ""

echo "4️⃣ Проверка в БД (PostgreSQL):"
echo "psql -U user -d database_name -c \\"
echo "  'SELECT id, firstName, lastName, email, yandex_id FROM users WHERE yandex_id IS NOT NULL;'"
echo ""

echo ""
echo "=== Тестирование в браузере ==="
echo ""
echo "1. Откройте http://localhost:3307/login.html"
echo "2. Нажмите кнопку 'Яндекс ID'"
echo "3. Авторизуйтесь в Яндексе"
echo "4. Вы должны быть перенаправлены на http://localhost:3307/profile.html"
echo "5. Откройте Console (F12) и выполните:"
echo "   - localStorage.getItem('auth_token') - увидите JWT токен"
echo "   - JSON.parse(localStorage.getItem('user')) - увидите данные пользователя"
echo ""

echo "=== Примеры ошибок и их решение ==="
echo ""
echo "❌ 'Не удалось получить токен от Яндекса'"
echo "   ✅ Проверьте YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET в .env"
echo ""
echo "❌ 'CORS error'"
echo "   ✅ Проверьте что YANDEX_REDIRECT_URI имеет правильный домен"
echo ""
echo "❌ 'yandex_id column not found'"
echo "   ✅ Запустите: node scripts/add-yandex-id.js"
echo ""

echo "=== JavaScript примеры для фронтенда ==="
echo ""

cat << 'EOF'
// Файл: js/yandex-oauth.js

// Вход через Яндекс
async function loginWithYandex() {
  const response = await fetch('/api/auth/yandex/login');
  const data = await response.json();
  if (data.success) {
    window.location.href = data.authUrl;
  }
}

// Обработка callback (используется в redirect.html)
async function handleCallback(code) {
  const response = await fetch('/api/auth/yandex/callback?code=' + code);
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/profile.html';
  }
}

// Выход
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// Использование в HTML:
// <button onclick="loginWithYandex()" class="btn">Войти через Яндекс</button>
// <button onclick="logout()" class="btn">Выход</button>
EOF

echo ""
echo ""
echo "=== Дополнительные ресурсы ==="
echo ""
echo "📚 Документация:"
echo "   - YANDEX_QUICK_START.md - быстрый старт"
echo "   - YANDEX_OAUTH_SETUP.md - полная документация"
echo "   - YANDEX_INTEGRATION_SUMMARY.md - сводка интеграции"
echo ""
echo "🔗 Ссылки:"
echo "   - Яндекс OAuth: https://yandex.ru/dev/id/doc/ru/register-app"
echo "   - JWT.io: https://jwt.io"
echo ""
echo "✅ Готово!"
