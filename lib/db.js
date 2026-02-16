const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('❌ Необработанная ошибка клиента PostgreSQL:', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('📦 SQL', { text, duration, rows: res.rowCount });
  }

  return res;
}

async function getClient() {
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  pool,
};

