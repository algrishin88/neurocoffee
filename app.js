#!/usr/bin/env node
/**
 * Точка входа для Phusion Passenger (Спринтхост и др.).
 * Экспортирует Express приложение БЕЗ запуска сервера.
 */

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

// Защита: не отдавать бэкенд при раздаче статики
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

// API 404 handler
app.use('/api/', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
  });
});

// Глобальный обработчик ошибок для API
app.use('/api/', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Статика (фронтенд) — для работы на Спринтхост и shared-хостинге
app.use(express.static(path.join(__dirname), { index: ['index.html'], dotfiles: 'deny' }));

// Глобальный обработчик ошибок (должен быть в конце)
app.use((err, req, res, next) => {
  console.error('Uncaught Error:', err);
  
  // Если это уже была попытка отправить JSON ответ
  if (res.headersSent) {
    return next(err);
  }
  
  // Для API запросов - JSON
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
  
  // Для всех остальных - HTML
  res.status(err.status || 500).send(`
    <!DOCTYPE html>
    <html>
    <head><title>Error ${err.status || 500}</title></head>
    <body>
    <h1>Error ${err.status || 500}</h1>
    <p>${err.message || 'Internal Server Error'}</p>
    </body>
    </html>
  `);
});

// Test database connection on startup
async function connectDatabase() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Подключено к PostgreSQL базе данных');
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
  }
}

connectDatabase();

// Экспортируем приложение для Phusion Passenger
module.exports = app;
