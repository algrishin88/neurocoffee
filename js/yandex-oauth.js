// Пример использования Яндекс OAuth в фронтенде

// 1. Инициировать вход через Яндекс
async function loginWithYandex() {
  try {
    const response = await fetch('/api/auth/yandex/login');
    const data = await response.json();
    
    if (data.success && data.authUrl) {
      // Перенаправить на Яндекс OAuth
      window.location.href = data.authUrl;
    } else {
      console.error('Ошибка инициализации входа через Яндекс');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// 2. Отправить код авторизации на бэкенд (эта функция вызывается в redirect.html)
async function handleYandexCallback(code) {
  try {
    const response = await fetch('/api/auth/yandex/callback?code=' + code);
    const data = await response.json();
    
    if (data.success) {
      // Сохранить токен и пользователя в тех же ключах, что и остальное приложение (profile, api.js)
      localStorage.setItem('neuro-cafe-token', data.token);
      localStorage.setItem('neuro-cafe-current-user', JSON.stringify(data.user));
      sessionStorage.setItem('neuro-cafe-token', data.token);
      sessionStorage.setItem('neuro-cafe-current-user', JSON.stringify(data.user));

      // Перенаправить на профиль
      window.location.href = '/profile.html';
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// 3. Получить текущего пользователя (те же ключи, что и в shared-ui / profile)
function getCurrentUser() {
  const userStr = localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user');
  if (userStr) {
    try { return JSON.parse(userStr); } catch (_) { return null; }
  }
  return null;
}

// 4. Получить JWT токен
function getAuthToken() {
  return localStorage.getItem('neuro-cafe-token') || sessionStorage.getItem('neuro-cafe-token');
}

// 5. Выполнить API запрос с авторизацией
async function fetchWithAuth(url, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

// Пример использования:
// const response = await fetchWithAuth('/api/orders');
// const data = await response.json();

// 6. Выйти из аккаунта
function logout() {
  localStorage.removeItem('neuro-cafe-token');
  localStorage.removeItem('neuro-cafe-current-user');
  sessionStorage.removeItem('neuro-cafe-token');
  sessionStorage.removeItem('neuro-cafe-current-user');
  window.location.href = '/login.html';
}

// 7. Проверить, авторизован ли пользователь
function isAuthenticated() {
  return !!(localStorage.getItem('neuro-cafe-token') || sessionStorage.getItem('neuro-cafe-token'));
}

// 8. Перенаправить на страницу входа если не авторизован
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
  }
}

// Примеры использования в HTML:

/*
<!-- Кнопка входа -->
<button onclick="loginWithYandex()" class="btn btn-primary">
  Войти через Яндекс ID
</button>

<!-- Показать имя пользователя -->
<script>
  const user = getCurrentUser();
  if (user) {
    document.getElementById('user-name').textContent = user.firstName + ' ' + user.lastName;
  }
</script>

<!-- Выход -->
<button onclick="logout()" class="btn btn-secondary">
  Выйти
</button>

<!-- Проверить авторизацию на странице профиля -->
<script>
  if (!isAuthenticated()) {
    // Показать форму входа
  } else {
    // Показать профиль пользователя
  }
</script>
*/
