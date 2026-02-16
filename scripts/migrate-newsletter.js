/**
 * Миграция: таблица newsletter_subscribers для рассылки.
 * Запуск: node scripts/migrate-newsletter.js
 */
const db = require('../lib/db');

async function migrate() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "email" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Таблица newsletter_subscribers создана или уже существует');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
