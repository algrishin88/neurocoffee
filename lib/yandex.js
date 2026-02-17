const axios = require('axios');
const crypto = require('crypto');

const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const YANDEX_REDIRECT_URI = process.env.YANDEX_REDIRECT_URI;

const YANDEX_OAUTH_URL = 'https://oauth.yandex.com/authorize';
const YANDEX_TOKEN_URL = 'https://oauth.yandex.com/token';
const YANDEX_USER_URL = 'https://login.yandex.ru/info';

function checkYandexConfig() {
  if (!YANDEX_CLIENT_ID || !YANDEX_CLIENT_SECRET || !YANDEX_REDIRECT_URI) {
    const missing = [];
    if (!YANDEX_CLIENT_ID) missing.push('YANDEX_CLIENT_ID');
    if (!YANDEX_CLIENT_SECRET) missing.push('YANDEX_CLIENT_SECRET');
    if (!YANDEX_REDIRECT_URI) missing.push('YANDEX_REDIRECT_URI');
    throw new Error(`Яндекс OAuth не настроен: не заданы переменные ${missing.join(', ')}. Укажите их в настройках окружения (например в Dokploy).`);
  }
  if (!YANDEX_REDIRECT_URI.startsWith('http')) {
    throw new Error('YANDEX_REDIRECT_URI должен быть полным URL (например https://neurocup.ru/redirect.html).');
  }
}

// In-memory state store for OAuth CSRF protection (TTL 10 min)
const pendingStates = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of pendingStates) {
    if (now - ts > 10 * 60 * 1000) pendingStates.delete(key);
  }
}, 60 * 1000);

/**
 * Генерирует URL для редиректа пользователя на Яндекс OAuth
 */
const getAuthorizationUrl = () => {
  checkYandexConfig();
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: YANDEX_CLIENT_ID,
    response_type: 'code',
    redirect_uri: YANDEX_REDIRECT_URI,
    state,
  });

  return `${YANDEX_OAUTH_URL}?${params.toString()}`;
};

/**
 * Validates an OAuth state parameter
 */
const validateState = (state) => {
  if (!state || !pendingStates.has(state)) return false;
  pendingStates.delete(state);
  return true;
};

/**
 * Обменивает код авторизации на токен доступа
 */
const getAccessToken = async (code) => {
  checkYandexConfig();
  try {
    const body = {
      grant_type: 'authorization_code',
      code,
      client_id: YANDEX_CLIENT_ID,
      client_secret: YANDEX_CLIENT_SECRET,
      redirect_uri: YANDEX_REDIRECT_URI,
    };
    const response = await axios.post(
      YANDEX_TOKEN_URL,
      new URLSearchParams(body).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const msg = data?.error_description || data?.error || error.message;
    console.error('❌ Ошибка получения токена Яндекса:', data || error.message);
    if (data?.error === 'invalid_grant' || (msg && String(msg).toLowerCase().includes('redirect'))) {
      throw new Error('Код авторизации недействителен или истёк. Убедитесь, что в настройках приложения Яндекса указан Callback URI: ' + YANDEX_REDIRECT_URI);
    }
    throw new Error(msg ? `Яндекс: ${msg}` : 'Не удалось получить токен от Яндекса');
  }
};

/**
 * Получает информацию о пользователе Яндекса
 */
const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(YANDEX_USER_URL, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Ошибка получения информации пользователя:', error.response?.data || error.message);
    throw new Error('Не удалось получить информацию о пользователе');
  }
};

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  getUserInfo,
  validateState,
  YANDEX_REDIRECT_URI,
};
