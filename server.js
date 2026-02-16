const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./lib/db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Защита: не отдавать бэкенд при раздаче статики (Спринтхост и др.)
const BLOCKED_PREFIXES = ['/lib', '/routes', '/middleware', '/models', '/scripts', '/node_modules'];
const BLOCKED_FILES = ['/server.js', '/app.js', '/api.js', '/sec.js', '/.env', '/package.json', '/package-lock.json'];
app.use((req, res, next) => {
  const p = req.path;
  if (BLOCKED_PREFIXES.some((pref) => p.startsWith(pref))) return res.status(404).end();
  if (BLOCKED_FILES.some((f) => p === f || p.startsWith(f + '?'))) return res.status(404).end();
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/payments', require('./routes/payments'));

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

// Test database connection on startup
async function connectDatabase() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Подключено к PostgreSQL базе данных');
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    console.log(
      '💡 Убедитесь, что PostgreSQL запущен и DATABASE_URL корректен.',
    );
  }
}

connectDatabase();

// Start server
const PORT = process.env.PORT || 3307;
const server = app.listen(PORT, () => {
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


