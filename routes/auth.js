const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const auth = require('../middleware/auth');
const yandex = require('../lib/yandex');

const router = express.Router();

// JWT secret — must be set via environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('⚠️  JWT_SECRET не установлен! Аутентификация не будет работать.');
}

// Generate JWT token
const generateToken = (userId) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('Имя обязательно'),
    body('lastName').trim().notEmpty().withMessage('Фамилия обязательна'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Пароль должен быть не менее 6 символов'),
    body('phone').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { firstName, lastName, email, password, phone } = req.body;
      const normalizedEmail = email.toLowerCase();

      // Check if user exists
      const existingUserResult = await db.query(
        'SELECT "id" FROM "users" WHERE LOWER("email") = LOWER($1) LIMIT 1',
        [normalizedEmail],
      );

      if (existingUserResult.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const createResult = await db.query(
        'INSERT INTO "users" ("firstName", "lastName", "email", "password", "phone") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "firstName", "lastName", "email"',
        [firstName, lastName, normalizedEmail, hashedPassword, phone || null],
      );

      const user = createResult.rows[0];

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        message: 'Пользователь успешно зарегистрирован',
        token,
        user,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при регистрации',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  },
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').notEmpty().withMessage('Пароль обязателен'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();

      // Find user
      const userResult = await db.query(
        'SELECT "id", "firstName", "lastName", "email", "password", "role" FROM "users" WHERE LOWER("email") = LOWER($1) LIMIT 1',
        [normalizedEmail],
      );

      if (userResult.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль',
        });
      }

      const user = userResult.rows[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль',
        });
      }

      // Generate token
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Вход выполнен успешно',
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при входе',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  },
);

// Get current user (with profile and bonus fields when migrated)
router.get('/me', auth, async (req, res) => {
  try {
    let result;
    try {
      result = await db.query(
        `SELECT "id", "firstName", "lastName", "email", "phone", "role",
                "newsletter", "bonusPoints", "birthDate", "preferences", "bio",
                "emailNotifications", "smsNotifications", "orderUpdates"
         FROM "users" WHERE "id" = $1 LIMIT 1`,
        [req.userId],
      );
    } catch (colErr) {
      result = await db.query(
        'SELECT "id", "firstName", "lastName", "email", "phone", "role" FROM "users" WHERE "id" = $1 LIMIT 1',
        [req.userId],
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    const user = result.rows[0];
    if (user.bonusPoints == null) user.bonusPoints = 0;
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных пользователя',
    });
  }
});

// Update profile (PATCH /auth/me)
router.patch(
  '/me',
  auth,
  [
    body('firstName').optional().trim().notEmpty().withMessage('Имя не может быть пустым'),
    body('lastName').optional().trim().notEmpty().withMessage('Фамилия не может быть пустой'),
    body('email').optional().isEmail().withMessage('Некорректный email'),
    body('phone').optional().trim(),
    body('newsletter').optional().isBoolean(),
    body('birthDate').optional().trim(),
    body('preferences').optional().trim(),
    body('bio').optional().trim(),
    body('emailNotifications').optional().isBoolean(),
    body('smsNotifications').optional().isBoolean(),
    body('orderUpdates').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const allowed = [
        'firstName', 'lastName', 'email', 'phone', 'newsletter', 'birthDate',
        'preferences', 'bio', 'emailNotifications', 'smsNotifications', 'orderUpdates',
      ];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (key === 'email') updates[key] = req.body[key].toLowerCase();
          else if (key === 'newsletter' || key === 'emailNotifications' || key === 'smsNotifications' || key === 'orderUpdates') {
            updates[key] = !!req.body[key];
          } else {
            updates[key] = req.body[key] === '' ? null : req.body[key];
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        const result = await db.query(
          `SELECT "id", "firstName", "lastName", "email", "phone", "role",
                  "newsletter", "bonusPoints", "birthDate", "preferences", "bio",
                  "emailNotifications", "smsNotifications", "orderUpdates"
           FROM "users" WHERE "id" = $1 LIMIT 1`,
          [req.userId],
        );
        return res.json({
          success: true,
          user: result.rows[0] || {},
        });
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `"${k}" = $${i + 2}`)
        .join(', ');
      const values = [req.userId, ...Object.values(updates)];

      const result = await db.query(
        `UPDATE "users" SET ${setClause}, "updatedAt" = NOW()
         WHERE "id" = $1
         RETURNING "id", "firstName", "lastName", "email", "phone", "role",
                   "newsletter", "bonusPoints", "birthDate", "preferences", "bio",
                   "emailNotifications", "smsNotifications", "orderUpdates"`,
        values,
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден',
        });
      }

      const user = result.rows[0];
      if (user.bonusPoints == null) user.bonusPoints = 0;
      res.json({
        success: true,
        message: 'Профиль обновлён',
        user,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении профиля',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  },
);

// ========== QR Login (вход по QR-коду) ==========
const QR_CODE_TTL_MS = 5 * 60 * 1000; // 5 min
const qrCodeStore = new Map(); // code -> { createdAt, userId? }

function generateQrCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function cleanupExpiredQrCodes() {
  const now = Date.now();
  for (const [code, data] of qrCodeStore.entries()) {
    if (now - data.createdAt > QR_CODE_TTL_MS) qrCodeStore.delete(code);
  }
}

// Request QR code for login (desktop)
router.post('/qr/request', (req, res) => {
  cleanupExpiredQrCodes();
  const code = generateQrCode();
  qrCodeStore.set(code, { createdAt: Date.now() });
  const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
  const qrUrl = baseUrl.replace(/\/$/, '') + '/login-qr.html?code=' + code;
  res.json({
    success: true,
    code,
    qrUrl,
    expiresIn: Math.floor(QR_CODE_TTL_MS / 1000),
  });
});

// Confirm QR login (from phone, auth required)
router.post('/qr/confirm', auth, (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, message: 'Укажите code' });
  }
  const data = qrCodeStore.get(code.trim().toUpperCase());
  if (!data) {
    return res.status(404).json({ success: false, message: 'Код не найден или истёк' });
  }
  if (Date.now() - data.createdAt > QR_CODE_TTL_MS) {
    qrCodeStore.delete(code);
    return res.status(410).json({ success: false, message: 'Код истёк' });
  }
  data.userId = req.userId;
  res.json({ success: true, message: 'Вход на компьютере подтверждён' });
});

// Poll status (desktop) — returns token when phone confirmed
router.get('/qr/status', (req, res) => {
  const code = (req.query.code || '').toString().trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, message: 'Укажите code' });
  }
  const data = qrCodeStore.get(code);
  if (!data) {
    return res.json({ success: true, status: 'expired' });
  }
  if (Date.now() - data.createdAt > QR_CODE_TTL_MS) {
    qrCodeStore.delete(code);
    return res.json({ success: true, status: 'expired' });
  }
  if (!data.userId) {
    return res.json({ success: true, status: 'pending' });
  }
  const userId = data.userId;
  qrCodeStore.delete(code);
  const token = generateToken(userId);
  db.query(
    'SELECT "id", "firstName", "lastName", "email", "phone", "role" FROM "users" WHERE "id" = $1 LIMIT 1',
    [userId],
  ).then((r) => {
    const user = r.rows[0] || {};
    res.json({
      success: true,
      status: 'confirmed',
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, role: user.role },
    });
  }).catch((err) => {
    console.error('QR status user fetch error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  });
});

// ========== Yandex OAuth Routes ==========

// Начать процесс авторизации с Яндекса
router.get('/yandex/login', (req, res) => {
  try {
    const authUrl = yandex.getAuthorizationUrl();
    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Yandex login error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при инициализации входа через Яндекс',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// Callback после авторизации пользователем в Яндексе
router.post('/yandex/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствует код авторизации',
      });
    }

    // Получить токен доступа от Яндекса
    const tokenResponse = await yandex.getAccessToken(code);
    const accessToken = tokenResponse.access_token;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Не удалось получить токен доступа',
      });
    }

    // Получить информацию о пользователе
    const yandexUser = await yandex.getUserInfo(accessToken);

    const yandexId = yandexUser.id;
    const email = yandexUser.default_email || `yandex_${yandexId}@yandex.id`;
    const firstName = yandexUser.first_name || 'Пользователь';
    const lastName = yandexUser.last_name || 'Яндекса';

    // Проверить, существует ли пользователь с таким yandex_id
    let userResult = await db.query(
      'SELECT "id", "firstName", "lastName", "email", "yandex_id", "role" FROM "users" WHERE "yandex_id" = $1 LIMIT 1',
      [yandexId],
    );

    let user;

    if (userResult.rowCount > 0) {
      // Пользователь существует, обновить информацию при необходимости
      user = userResult.rows[0];
      
      // Обновить email, если изменился
      if (user.email !== email) {
        await db.query(
          'UPDATE "users" SET "email" = $1 WHERE "id" = $2',
          [email, user.id],
        );
        user.email = email;
      }
    } else {
      // Проверить, существует ли пользователь с таким email
      userResult = await db.query(
        'SELECT "id" FROM "users" WHERE LOWER("email") = LOWER($1) LIMIT 1',
        [email],
      );

      if (userResult.rowCount > 0) {
        // Email уже занят, создать новый уникальный email
        const uniqueEmail = `yandex_${yandexId}@yandex.id`;
        
        const createResult = await db.query(
          'INSERT INTO "users" ("firstName", "lastName", "email", "yandex_id", "password") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "firstName", "lastName", "email"',
          [firstName, lastName, uniqueEmail, yandexId, 'OAUTH_NO_PASSWORD'],
        );
        user = createResult.rows[0];
      } else {
        // Создать нового пользователя с таким email
        const createResult = await db.query(
          'INSERT INTO "users" ("firstName", "lastName", "email", "yandex_id", "password") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "firstName", "lastName", "email"',
          [firstName, lastName, email, yandexId, 'OAUTH_NO_PASSWORD'],
        );
        user = createResult.rows[0];
      }
    }

    // Сгенерировать JWT токен
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Вход через Яндекс успешен',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Yandex callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке ответа от Яндекса',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// Альтернативный способ - GET маршрут для redirect.html (может быть полезно)
router.get('/yandex/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Авторизация отклонена пользователем',
        error,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствует код авторизации',
      });
    }

    // Получить токен доступа от Яндекса
    const tokenResponse = await yandex.getAccessToken(code);
    const accessToken = tokenResponse.access_token;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Не удалось получить токен доступа',
      });
    }

    // Получить информацию о пользователе
    const yandexUser = await yandex.getUserInfo(accessToken);

    const yandexId = yandexUser.id;
    const email = yandexUser.default_email || `yandex_${yandexId}@yandex.id`;
    const firstName = yandexUser.first_name || 'Пользователь';
    const lastName = yandexUser.last_name || 'Яндекса';

    // Проверить, существует ли пользователь с таким yandex_id
    let userResult = await db.query(
      'SELECT "id", "firstName", "lastName", "email", "yandex_id", "role" FROM "users" WHERE "yandex_id" = $1 LIMIT 1',
      [yandexId],
    );

    let user;

    if (userResult.rowCount > 0) {
      // Пользователь существует, обновить информацию при необходимости
      user = userResult.rows[0];
    } else {
      // Проверить, существует ли пользователь с таким email
      userResult = await db.query(
        'SELECT "id" FROM "users" WHERE LOWER("email") = LOWER($1) LIMIT 1',
        [email],
      );

      if (userResult.rowCount > 0) {
        // Email уже занят, создать новый уникальный email
        const uniqueEmail = `yandex_${yandexId}@yandex.id`;
        
        const createResult = await db.query(
          'INSERT INTO "users" ("firstName", "lastName", "email", "yandex_id", "password") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "firstName", "lastName", "email"',
          [firstName, lastName, uniqueEmail, yandexId, 'OAUTH_NO_PASSWORD'],
        );
        user = createResult.rows[0];
      } else {
        // Создать нового пользователя с таким email
        const createResult = await db.query(
          'INSERT INTO "users" ("firstName", "lastName", "email", "yandex_id", "password") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "firstName", "lastName", "email"',
          [firstName, lastName, email, yandexId, 'OAUTH_NO_PASSWORD'],
        );
        user = createResult.rows[0];
      }
    }

    // Сгенерировать JWT токен
    const token = generateToken(user.id);

    // Отправить данные обратно фронтенду (через redirect или JSON)
    res.json({
      success: true,
      message: 'Вход через Яндекс успешен',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Yandex callback GET error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке ответа от Яндекса',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

module.exports = router;

