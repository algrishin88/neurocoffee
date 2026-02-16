const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./lib/db');

// Load environment variables
dotenv.config();

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict to production domain
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://neurocup.ru', 'https://www.neurocup.ru']
  : undefined;
app.use(cors(allowedOrigins ? { origin: allowedOrigins, credentials: true } : {}));

// Body parsing with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Global rate limiter
app.use(rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Strict rate limiters for sensitive endpoints
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { success: false, message: 'Слишком много попыток. Попробуйте через минуту.' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { success: false, message: 'Слишком много запросов к AI. Подождите минуту.' } });
const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { success: false, message: 'Слишком много сообщений. Подождите минуту.' } });

// Защита: не отдавать бэкенд при раздаче статики (Спринтхост и др.)
const BLOCKED_PREFIXES = ['/lib', '/routes', '/middleware', '/models', '/scripts', '/node_modules'];
const BLOCKED_FILES = ['/server.js', '/app.js', '/api.js', '/sec.js', '/.env', '/package.json', '/package-lock.json'];
app.use((req, res, next) => {
  const p = req.path;
  if (BLOCKED_PREFIXES.some((pref) => p.startsWith(pref))) return res.status(404).end();
  if (BLOCKED_FILES.some((f) => p === f || p.startsWith(f + '?'))) return res.status(404).end();
  next();
});

// Routes with rate limiters on sensitive endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/contacts', contactLimiter, require('./routes/contacts'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    res.json({
      status: 'OK',
      message: 'НейроКофейня API работает',
      database: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// API 404 handler - ДОЛЖЕН быть ДО статика middleware
app.use('/api/', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
  });
});

// Статика (фронтенд) — для работы на Спринтхост и shared-хостинге
app.use(express.static(path.join(__dirname), { index: ['index.html'], dotfiles: 'deny' }));

// Auto-initialize database schema on startup
async function initDatabaseSchema() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Подключено к PostgreSQL базе данных');

    // Create tables if not exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL,
        "phone" TEXT, "yandex_id" TEXT UNIQUE,
        "role" TEXT NOT NULL DEFAULT 'user', "newsletter" BOOLEAN DEFAULT FALSE,
        "bonusPoints" INTEGER DEFAULT 0, "birthDate" DATE,
        "preferences" TEXT, "bio" TEXT,
        "emailNotifications" BOOLEAN DEFAULT TRUE,
        "smsNotifications" BOOLEAN DEFAULT FALSE,
        "orderUpdates" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "carts" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "cartId" TEXT NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
        "itemId" INTEGER NOT NULL, "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL, "size" TEXT NOT NULL,
        "image" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "cartId_itemId_size" UNIQUE ("cartId", "itemId", "size")
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "total" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "deliveryType" TEXT DEFAULT 'self_pickup',
        "deliveryAddress" TEXT, "phone" TEXT, "notes" TEXT, "recipe" TEXT,
        "paymentMethod" TEXT DEFAULT 'sbp',
        "paymentStatus" TEXT DEFAULT 'pending', "yookassaPaymentId" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    // Add columns that may be missing on existing databases
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryType" TEXT DEFAULT 'self_pickup'`).catch(() => {});
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'sbp'`).catch(() => {});
    await db.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "itemId" INTEGER NOT NULL, "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL, "size" TEXT NOT NULL,
        "image" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1,
        "recipe" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "recipe" TEXT`).catch(() => {});
    await db.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "guests" INTEGER NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "time" TEXT NOT NULL, "zone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending', "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "contacts" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "name" TEXT NOT NULL, "email" TEXT NOT NULL, "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'new',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "email" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "itemId" INTEGER NOT NULL UNIQUE,
        "name" TEXT NOT NULL, "description" TEXT NOT NULL,
        "image" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'coffee',
        "available" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_sizes" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "menuItemId" TEXT NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
        "size" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Схема базы данных инициализирована');

    // Seed menu if empty
    const menuCheck = await db.query('SELECT COUNT(*) FROM "menu_items"');
    if (parseInt(menuCheck.rows[0].count) === 0) {
      console.log('📋 Заполняем меню...');
      const menuItems = [
        { itemId: 1, name: 'Нейро-капучино', description: 'бодрящий капучино для старта работы', image: 'images/img_1.jpg', category: 'coffee', sizes: [{ size: '200мл', price: 89 }, { size: '350мл', price: 110 }] },
        { itemId: 2, name: 'Квантовый раф', description: 'Почти как компьютер, только на сливках', image: 'images/img_2.jpg', category: 'coffee', sizes: [{ size: '350мл', price: 140 }, { size: '450мл', price: 200 }] },
        { itemId: 3, name: 'Цифровой Латте', description: 'С ним точно ничего не забудите', image: 'images/img_3.jpg', category: 'coffee', sizes: [{ size: '250мл', price: 110 }, { size: '350мл', price: 150 }] },
        { itemId: 4, name: 'Серверный американо', description: 'Крепкий, для настоящих senior', image: 'images/img_4.jpg', category: 'coffee', sizes: [{ size: '200мл', price: 110 }, { size: '300мл', price: 130 }] },
        { itemId: 5, name: 'Ваш нейро-кофе', description: 'Сгенерируйте свой нейро-кофе дня', image: 'images/img_5.jpg', category: 'special', sizes: [{ size: '200мл-450мл', price: 80 }, { size: '200мл-450мл', price: 350 }] },
        { itemId: 6, name: 'Матча ревью', description: 'Для тех, у кого сегодня код-ревью', image: 'images/img_6.jpg', category: 'tea', sizes: [{ size: '250мл', price: 200 }, { size: '350мл', price: 250 }] }
      ];
      for (const item of menuItems) {
        const res = await db.query(
          'INSERT INTO "menu_items" ("itemId", "name", "description", "image", "category", "available") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"',
          [item.itemId, item.name, item.description, item.image, item.category, true]
        );
        for (const s of item.sizes) {
          await db.query('INSERT INTO "menu_item_sizes" ("menuItemId", "size", "price") VALUES ($1, $2, $3)', [res.rows[0].id, s.size, s.price]);
        }
      }
      console.log('✅ Меню заполнено: 6 товаров');
    }
  } catch (err) {
    console.error('❌ Ошибка подключения/инициализации БД:', err.message);
    console.log('💡 Убедитесь, что PostgreSQL запущен и DATABASE_URL корректен.');
  }
}

initDatabaseSchema();

// Start server
const PORT = process.env.PORT || 3307;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят. Попробуйте:`);
    console.error(
      `   1. Остановить процесс (Windows): netstat -ano | findstr :${PORT}`,
    );
    console.error(
      '   2. Другой порт: npm run start:3001  или  (PowerShell) $env:PORT=3307; npm start',
    );
    process.exit(1);
  } else {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
  }
});

module.exports = app;


