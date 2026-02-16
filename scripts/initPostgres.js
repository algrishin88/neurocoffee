const db = require('../lib/db');

async function initDatabase() {
  try {
    console.log('🗄️ Инициализация схемы PostgreSQL...');

    // Users
    await db.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "phone" TEXT,
        "yandex_id" TEXT UNIQUE,
        "role" TEXT NOT NULL DEFAULT 'user',
        "newsletter" BOOLEAN DEFAULT FALSE,
        "bonusPoints" INTEGER DEFAULT 0,
        "birthDate" DATE,
        "preferences" TEXT,
        "bio" TEXT,
        "emailNotifications" BOOLEAN DEFAULT TRUE,
        "smsNotifications" BOOLEAN DEFAULT FALSE,
        "orderUpdates" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Carts
    await db.query(`
      CREATE TABLE IF NOT EXISTS "carts" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Cart items
    await db.query(`
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "cartId" TEXT NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
        "itemId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "size" TEXT NOT NULL,
        "image" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "cartId_itemId_size" UNIQUE ("cartId", "itemId", "size")
      );
    `);

    // Orders
    await db.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "total" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "deliveryType" TEXT DEFAULT 'self_pickup',
        "deliveryAddress" TEXT,
        "phone" TEXT,
        "notes" TEXT,
        "recipe" TEXT,
        "paymentMethod" TEXT DEFAULT 'sbp',
        "paymentStatus" TEXT DEFAULT 'pending',
        "yookassaPaymentId" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Order items
    await db.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "itemId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "size" TEXT NOT NULL,
        "image" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "recipe" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Bookings
    await db.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "guests" INTEGER NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "time" TEXT NOT NULL,
        "zone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Contacts
    await db.query(`
      CREATE TABLE IF NOT EXISTS "contacts" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'new',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Newsletter subscribers
    await db.query(`
      CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "email" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Menu items
    await db.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "itemId" INTEGER NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "image" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'coffee',
        "available" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Menu item sizes
    await db.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_sizes" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "menuItemId" TEXT NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
        "size" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Схема PostgreSQL инициализирована');
  } catch (err) {
    console.error('❌ Ошибка инициализации PostgreSQL:', err);
    process.exit(1);
  }
}

initDatabase().then(() => process.exit(0));

