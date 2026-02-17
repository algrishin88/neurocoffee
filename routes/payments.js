const express = require('express');
const axios = require('axios');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';
const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'https://neurocup.ru';

function yooAuth() {
  const key = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
  return { Authorization: `Basic ${key}` };
}

// Создать платёж СБП по заказу
router.post('/create-sbp', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Укажите orderId' });
    }
    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Оплата СБП не настроена. Укажите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env',
      });
    }

    const orderResult = await db.query(
      'SELECT "id", "userId", "total", "paymentStatus", "yookassaPaymentId" FROM "orders" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [orderId, req.userId],
    );
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Заказ не найден' });
    }
    const order = orderResult.rows[0];
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Заказ уже оплачен' });
    }

    const amount = Math.max(1, Math.round(Number(order.total) * 100) / 100);
    const idempotenceKey = `neuro-${orderId}`;

    const payload = {
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      payment_method_data: { type: 'sbp' },
      confirmation: {
        type: 'redirect',
        return_url: `${BASE_URL.replace(/\/$/, '')}/order-success.html?orderId=${orderId}`,
      },
      capture: true,
      description: `Заказ №${orderId}`,
      metadata: { orderId },
    };

    const { data } = await axios.post(YOOKASSA_API, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        ...yooAuth(),
      },
    });

    const paymentUrl = data.confirmation?.confirmation_url;
    if (!paymentUrl) {
      console.error('YooKassa create payment: no confirmation_url', data);
      return res.status(502).json({
        success: false,
        message: 'Не удалось создать платёж. Попробуйте позже.',
      });
    }

    await db.query(
      'UPDATE "orders" SET "yookassaPaymentId" = $1, "updatedAt" = NOW() WHERE "id" = $2',
      [data.id, orderId],
    );

    res.json({
      success: true,
      paymentUrl,
      orderId,
    });
  } catch (e) {
    console.error('Create SBP payment error:', e.response?.data || e.message);
    const devMsg = process.env.NODE_ENV === 'development' && e.response?.data?.description;
    res.status(500).json({
      success: false,
      message: devMsg || 'Ошибка при создании платежа СБП. Попробуйте позже.',
    });
  }
});

// YooKassa webhook IP whitelist (official IPs from YooKassa docs)
const YOOKASSA_WEBHOOK_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
  '2a02:5180::/32',
];

function isYooKassaIp(ip) {
  if (!ip) return false;
  const cleanIp = ip.replace(/^::ffff:/, '');
  // In development, allow all IPs for testing
  if (process.env.NODE_ENV === 'development') return true;
  // Simple check against known IPs (for subnet matching, a full CIDR library would be ideal)
  return YOOKASSA_WEBHOOK_IPS.some(allowed => cleanIp.startsWith(allowed.split('/')[0].slice(0, -1)));
}

// Webhook YooKassa: incoming payment notifications
router.post('/webhook', async (req, res) => {
  // Verify webhook source IP in production
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  if (process.env.NODE_ENV === 'production' && !isYooKassaIp(clientIp)) {
    console.warn('Webhook: rejected request from untrusted IP:', clientIp);
    return res.status(403).send('Forbidden');
  }

  const body = req.body || {};
  const event = body.event;
  const payment = body.object;

  if (event !== 'payment.succeeded' || !payment?.id) {
    return res.status(200).send('OK');
  }

  const orderId = payment.metadata?.orderId;
  if (!orderId) {
    return res.status(200).send('OK');
  }

  try {
    // Verify order exists and amount matches
    const orderResult = await db.query(
      'SELECT "id", "total", "paymentStatus" FROM "orders" WHERE "id" = $1 LIMIT 1',
      [orderId],
    );
    if (orderResult.rowCount === 0) {
      console.warn('Webhook: order not found', orderId);
      return res.status(200).send('OK');
    }
    const order = orderResult.rows[0];

    if (order.paymentStatus === 'paid') {
      return res.status(200).send('OK');
    }

    // Verify payment amount matches order total
    const paidAmount = parseFloat(payment.amount?.value || 0);
    if (Math.abs(paidAmount - order.total) > 0.01) {
      console.error(`Webhook: amount mismatch! Order ${orderId}: expected ${order.total}, got ${paidAmount}`);
      return res.status(200).send('OK');
    }

    await db.query(
      'UPDATE "orders" SET "paymentStatus" = $1, "status" = $2, "yookassaPaymentId" = $3, "updatedAt" = NOW() WHERE "id" = $4',
      ['paid', 'confirmed', payment.id, orderId],
    );
  } catch (err) {
    console.error('Webhook: update order error', err);
  }
  res.status(200).send('OK');
});

module.exports = router;
