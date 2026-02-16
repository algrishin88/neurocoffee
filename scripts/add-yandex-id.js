const db = require('../lib/db');

async function addYandexIdColumn() {
  try {
    console.log('📝 Добавление колонки yandex_id к таблице users...');

    // Проверить существует ли уже колонка
    const result = await db.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='yandex_id'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Колонка yandex_id уже существует');
      return;
    }

    // Добавить колонку
    await db.query(`
      ALTER TABLE "users"
      ADD COLUMN "yandex_id" TEXT UNIQUE;
    `);

    console.log('✅ Колонка yandex_id успешно добавлена');
  } catch (err) {
    console.error('❌ Ошибка при добавлении колонки:', err);
    process.exit(1);
  }
}

addYandexIdColumn().then(() => process.exit(0));
