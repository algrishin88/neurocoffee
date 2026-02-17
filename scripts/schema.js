/**
 * Database schema initialization and seeding.
 * Extracted from server.js for cleaner architecture.
 */
const db = require('../lib/db');

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
        "name" TEXT, "phone" TEXT,
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
        "active" BOOLEAN DEFAULT TRUE,
        "unsubscribeToken" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query('ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT TRUE').catch(() => {});
    await db.query('ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT').catch(() => {});
    await db.query('ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()').catch(() => {});

    await db.query(`
      CREATE TABLE IF NOT EXISTS "support_chats" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "userName" TEXT,
        "userEmail" TEXT,
        "status" TEXT NOT NULL DEFAULT 'bot',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "support_messages" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "chatId" TEXT NOT NULL REFERENCES "support_chats"("id") ON DELETE CASCADE,
        "role" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS "bonus_transactions" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "amount" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "orderId" TEXT,
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

    // Create performance indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "idx_orders_userId" ON "orders"("userId")',
      'CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status")',
      'CREATE INDEX IF NOT EXISTS "idx_orders_createdAt" ON "orders"("createdAt")',
      'CREATE INDEX IF NOT EXISTS "idx_orders_paymentStatus" ON "orders"("paymentStatus")',
      'CREATE INDEX IF NOT EXISTS "idx_order_items_orderId" ON "order_items"("orderId")',
      'CREATE INDEX IF NOT EXISTS "idx_cart_items_cartId" ON "cart_items"("cartId")',
      'CREATE INDEX IF NOT EXISTS "idx_bookings_date_zone" ON "bookings"("date", "zone", "status")',
      'CREATE INDEX IF NOT EXISTS "idx_bookings_userId" ON "bookings"("userId")',
      'CREATE INDEX IF NOT EXISTS "idx_bonus_transactions_userId" ON "bonus_transactions"("userId")',
      'CREATE INDEX IF NOT EXISTS "idx_support_messages_chatId" ON "support_messages"("chatId")',
      'CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"(LOWER("email"))',
    ];
    for (const idx of indexes) {
      await db.query(idx).catch(() => {});
    }
    console.log('✅ Индексы базы данных созданы');

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
        { itemId: 6, name: 'Матча ревью', description: 'Для тех, у кого сегодня код-ревью', image: 'images/img_6.jpg', category: 'tea', sizes: [{ size: '250мл', price: 200 }, { size: '350мл', price: 250 }] },
      ];
      for (const item of menuItems) {
        const res = await db.query(
          'INSERT INTO "menu_items" ("itemId", "name", "description", "image", "category", "available") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"',
          [item.itemId, item.name, item.description, item.image, item.category, true],
        );
        for (const s of item.sizes) {
          await db.query('INSERT INTO "menu_item_sizes" ("menuItemId", "size", "price") VALUES ($1, $2, $3)', [res.rows[0].id, s.size, s.price]);
        }
      }
      console.log('✅ Меню заполнено: 6 товаров');
    }

    // Promote designated admins
    const adminEmails = ['trogovitsky@yandex.com', 'algrishin@ya.ru'];
    for (const adminEmail of adminEmails) {
      await db.query(
        'UPDATE "users" SET "role" = \'admin\', "updatedAt" = NOW() WHERE LOWER("email") = LOWER($1) AND "role" != \'admin\'',
        [adminEmail],
      ).catch(() => {});
    }
  } catch (err) {
    console.error('❌ Ошибка подключения/инициализации БД:', err.message);
    console.log('💡 Убедитесь, что PostgreSQL запущен и DATABASE_URL корректен.');
  }
}

module.exports = { initDatabaseSchema };
