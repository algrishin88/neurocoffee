const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const useSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === '1' ||
  (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')));

const poolConfig = {
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
if (useSSL) {
  poolConfig.ssl = { rejectUnauthorized: process.env.PG_SSL_VERIFY !== 'false' };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Необработанная ошибка клиента PostgreSQL:', err.message);
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

