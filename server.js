const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./lib/db');

// Load environment variables
dotenv.config();

const app = express();

// Security headers with proper CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://ajax.googleapis.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://llm.api.cloud.yandex.net", "https://oauth.yandex.com", "https://login.yandex.ru"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict to production domain
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://neurocup.ru', 'https://www.neurocup.ru']
  : undefined;
app.use(cors(allowedOrigins ? { origin: allowedOrigins, credentials: true } : {}));

// Response compression
app.use(compression());

// Trust proxy (for rate limiting behind reverse proxy / Sprinthost)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parsing with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Global API rate limiter — только для /api, чтобы статика (HTML/CSS/JS) не считалась
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Слишком много запросов. Подождите минуту и попробуйте снова.' },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
app.use('/api', globalApiLimiter);

// Общий обработчик для rate limit — всегда JSON с русским текстом
const rateLimitHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json(options.message);
};

// Strict rate limiters для чувствительных эндпоинтов (с явным handler для JSON)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Слишком много попыток входа. Подождите минуту.' },
  handler: rateLimitHandler,
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Слишком много запросов к AI. Подождите минуту.' },
  handler: rateLimitHandler,
});
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Слишком много сообщений. Подождите минуту.' },
  handler: rateLimitHandler,
});

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
app.use('/api/support', require('./routes/support'));

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
    console.error('Health check DB error:', error.message);
    res.status(500).json({
      status: 'ERROR',
      message: 'Ошибка подключения к базе данных',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// API 404 handler — ДОЛЖЕН быть ДО статика middleware
app.use('/api/', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Эндпоинт API не найден',
    path: req.path,
  });
});

// Static files with caching headers
app.use(express.static(path.join(__dirname), {
  index: ['index.html'],
  dotfiles: 'deny',
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// Fallback 404 for non-API routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Global error handler (must be last middleware, 4 args)
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message, err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Внутренняя ошибка сервера'
      : err.message,
  });
});

// Initialize database schema (extracted to scripts/schema.js)
const { initDatabaseSchema } = require('./scripts/schema');
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
    console.error(`   1. Остановить процесс (Windows): netstat -ano | findstr :${PORT}`);
    console.error('   2. Другой порт: npm run start:3001  или  (PowerShell) $env:PORT=3307; npm start');
    process.exit(1);
  } else {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
  }
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    db.pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
