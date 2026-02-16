/**
 * Миграция: поля профиля и бонусов в users (newsletter, bonusPoints, birthDate, preferences, bio, уведомления).
 * Запуск: node scripts/migrate-users-profile.js
 */
const db = require('../lib/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "newsletter" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bonusPoints" INTEGER DEFAULT 0;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDate" DATE;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" TEXT;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN DEFAULT TRUE;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smsNotifications" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "orderUpdates" BOOLEAN DEFAULT TRUE;
    `);
    console.log('✅ Поля профиля и бонусов добавлены в users');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
