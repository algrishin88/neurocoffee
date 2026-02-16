// Получаем URL API из глобальной переменной (заданная в HTML)
const API_URL = '/api';

// Функция для отправки API-запросов
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'neurocoffee-app',
    };
    
    // Автоматически добавляем токен авторизации если он есть
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    });

    // Сначала проверяем content-type
    const contentType = response.headers.get('content-type');
    
    // Если ответ не JSON, это ошибка сервера (вероятно 500 ошибка)
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await response.text();
      console.error(`Server returned non-JSON response for ${method} ${endpoint}:`, {
        status: response.status,
        contentType: contentType,
        body: errorText.substring(0, 200), // первые 200 символов для дебага
      });
      
      throw new Error(
        `Server error: ${response.status}. Expected JSON but received ${contentType || 'HTML/text'}. ` +
        `This usually means the API endpoint "${endpoint}" failed or doesn't exist.`
      );
    }

    // Проверяем статус ответа
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error: {endpoint: '${endpoint}', method: '${method}', error: ${error.message}}`);
    throw error; // Перебрасываем ошибку для дальнейшей обработки
  }
};

// Пример метода регистрации пользователя
const register = async (userData) => {
  try {
    const response = await apiRequest('/auth/register', 'POST', userData);
    return response;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Пример других методов (логин, получение данных и т.д.)
const login = async (credentials) => {
  try {
    const response = await apiRequest('/auth/login', 'POST', credentials);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

const getUserData = async (userId) => {
  try {
    const response = await apiRequest(`/users/${userId}`);
    return response;
  } catch (error) {
    console.error('Get user data error:', error);
    throw error;
  }
};

// Интеграция с проектом (ваш существующий код)
const integrateWithProject = () => {
  console.log('Integrating with existing project...');
};

// Экспортируем методы
module.exports = {
  integrateWithProject,
  register,
  login,
  getUserData,
  apiRequest, // универсальный метод для других запросов
};
