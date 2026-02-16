/**
 * Миграция: delivery_type, payment_*, yookassa_payment_id для заказов;
 * recipe для позиций заказа (нейро-кофе).
 */
const db = require('../lib/db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryType" TEXT DEFAULT 'self_pickup'`);
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'sbp'`);
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending'`);
    await db.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "yookassaPaymentId" TEXT`);
    await db.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "recipe" TEXT`);
    console.log('✅ Миграция orders/payments выполнена');
  } catch (e) {
    console.error('❌ Ошибка миграции:', e.message);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
