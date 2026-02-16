/**
 * Миграция: поле zone (тачдаун-зона) в bookings.
 * Запуск: node scripts/migrate-bookings-zone.js
 */
const db = require('../lib/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "zone" TEXT;
    `);
    console.log('✅ Поле zone добавлено в bookings');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
