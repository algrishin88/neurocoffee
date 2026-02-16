const db = require('../lib/db');

const menuItems = [
    {
        itemId: 1,
        name: 'Нейро-капучино',
        description: 'бодрящий капучино для старта работы',
        image: 'images/img_1.jpg',
        category: 'coffee',
        available: true,
        sizes: [
            { size: '200мл', price: 89 },
            { size: '350мл', price: 110 }
        ]
    },
    {
        itemId: 2,
        name: 'Квантовый раф',
        description: 'Почти как компьютер, только на сливках',
        image: 'images/img_2.jpg',
        category: 'coffee',
        available: true,
        sizes: [
            { size: '350мл', price: 140 },
            { size: '450мл', price: 200 }
        ]
    },
    {
        itemId: 3,
        name: 'Цифровой Латте',
        description: 'С ним точно ничего не забудите',
        image: 'images/img_3.jpg',
        category: 'coffee',
        available: true,
        sizes: [
            { size: '250мл', price: 110 },
            { size: '350мл', price: 150 }
        ]
    },
    {
        itemId: 4,
        name: 'Серверный американо',
        description: 'Крепкий, для настоящих senior',
        image: 'images/img_4.jpg',
        category: 'coffee',
        available: true,
        sizes: [
            { size: '200мл', price: 110 },
            { size: '300мл', price: 130 }
        ]
    },
    {
        itemId: 5,
        name: 'Ваш нейро-кофе',
        description: 'Сгенерируйте свой нейро-кофе дня',
        image: 'images/img_5.jpg',
        category: 'special',
        available: true,
        sizes: [
            { size: '200мл-450мл', price: 80 },
            { size: '200мл-450мл', price: 350 }
        ]
    },
    {
        itemId: 6,
        name: 'Матча ревью',
        description: 'Для тех, у кого сегодня код-ревью',
        image: 'images/img_6.jpg',
        category: 'tea',
        available: true,
        sizes: [
            { size: '250мл', price: 200 },
            { size: '350мл', price: 250 }
        ]
    }
];

async function initMenu() {
  try {
    console.log('📋 Инициализация меню...');

    // Ensure tables exist (на случай, если initPostgres не был выполнен)
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

    await db.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_sizes" (
        "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        "menuItemId" TEXT NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
        "size" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Clear existing menu items
    await db.query('DELETE FROM "menu_item_sizes"');
    await db.query('DELETE FROM "menu_items"');
    console.log('🗑️  Старое меню удалено');

    // Insert new menu items
    for (const item of menuItems) {
      const { sizes, ...itemData } = item;

      const menuItemResult = await db.query(
        'INSERT INTO "menu_items" ("itemId", "name", "description", "image", "category", "available") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id", "name"',
        [
          itemData.itemId,
          itemData.name,
          itemData.description,
          itemData.image,
          itemData.category,
          itemData.available,
        ],
      );

      const menuItem = menuItemResult.rows[0];

      for (const size of sizes) {
        await db.query(
          'INSERT INTO "menu_item_sizes" ("menuItemId", "size", "price") VALUES ($1, $2, $3)',
          [menuItem.id, size.size, size.price],
        );
      }

      console.log(`✅ Добавлен: ${menuItem.name}`);
    }

    console.log(`\n✅ Меню инициализировано: ${menuItems.length} товаров`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

initMenu();

