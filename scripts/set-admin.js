/**
 * Назначить пользователя администратором по email.
 * Использование: node scripts/set-admin.js <email>
 * Пример: node scripts/set-admin.js admin@neurocup.ru
 */
require('dotenv').config();
const db = require('../lib/db');

const email = process.argv[2];
if (!email) {
  console.error('Укажите email: node scripts/set-admin.js <email>');
  process.exit(1);
}

async function main() {
  try {
    const res = await db.query(
      'UPDATE "users" SET "role" = $1, "updatedAt" = NOW() WHERE LOWER("email") = LOWER($2) RETURNING "id", "firstName", "lastName", "email", "role"',
      ['admin', email.trim()],
    );
    if (res.rowCount === 0) {
      console.error('Пользователь с таким email не найден:', email);
      process.exit(1);
    }
    console.log('Администратор назначен:', res.rows[0]);
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    db.pool.end();
  }
}

main();
