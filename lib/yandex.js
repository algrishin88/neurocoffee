const axios = require('axios');

const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const YANDEX_REDIRECT_URI = process.env.YANDEX_REDIRECT_URI;

const YANDEX_OAUTH_URL = 'https://oauth.yandex.com/authorize';
const YANDEX_TOKEN_URL = 'https://oauth.yandex.com/token';
const YANDEX_USER_URL = 'https://login.yandex.ru/info';

/**
 * Генерирует URL для редиректа пользователя на Яндекс OAuth
 */
const getAuthorizationUrl = () => {
  const params = new URLSearchParams({
    client_id: YANDEX_CLIENT_ID,
    response_type: 'code',
    redirect_uri: YANDEX_REDIRECT_URI,
    state: 'yandex-auth-state',
  });

  return `${YANDEX_OAUTH_URL}?${params.toString()}`;
};

/**
 * Обменивает код авторизации на токен доступа
 */
const getAccessToken = async (code) => {
  try {
    const response = await axios.post(
      YANDEX_TOKEN_URL,
      {
        grant_type: 'authorization_code',
        code,
        client_id: YANDEX_CLIENT_ID,
        client_secret: YANDEX_CLIENT_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Ошибка получения токена Яндекса:', error.response?.data || error.message);
    throw new Error('Не удалось получить токен от Яндекса');
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
  YANDEX_REDIRECT_URI,
};
