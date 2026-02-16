const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const db = require('../lib/db');
const adminAuth = require('../middleware/admin');
const { sendNewsletter, isConfigured } = require('../lib/mail');

const router = express.Router();

// Subscribe to newsletter
router.post(
  '/subscribe',
  [body('email').isEmail().withMessage('Некорректный email').normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ success: false, message: 'Укажите email' });

      const token = crypto.randomBytes(24).toString('hex');
      await db.query(
        `INSERT INTO "newsletter_subscribers" ("email", "unsubscribeToken")
         VALUES ($1, $2) ON CONFLICT ("email") DO UPDATE SET "active" = true, "updatedAt" = NOW()`,
        [email, token],
      );

      res.status(201).json({ success: true, message: 'Вы подписаны на рассылку!' });
    } catch (error) {
      console.error('Newsletter subscribe error:', error);
      res.status(500).json({ success: false, message: 'Ошибка при подписке' });
    }
  },
);

// Unsubscribe by token
router.get('/unsubscribe', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).send('Неверная ссылка');

    await db.query(
      'UPDATE "newsletter_subscribers" SET "active" = false, "updatedAt" = NOW() WHERE "unsubscribeToken" = $1',
      [token],
    );

    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Отписка</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>Вы успешно отписались от рассылки</h2>
      <p>Вам больше не будут приходить наши письма.</p>
      <a href="/" style="color:#4ecdc4;">Вернуться на сайт</a>
      </body></html>
    `);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('Ошибка');
  }
});

// Admin: Send newsletter to all active subscribers
router.post('/send', adminAuth, async (req, res) => {
  try {
    const { subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ success: false, message: 'Укажите тему и содержание' });
    }

    if (!isConfigured()) {
      return res.status(400).json({ success: false, message: 'SMTP не настроен' });
    }

    const subs = await db.query(
      'SELECT "email", "unsubscribeToken" FROM "newsletter_subscribers" WHERE "active" = true',
    );

    if (subs.rows.length === 0) {
      return res.json({ success: true, message: 'Нет активных подписчиков', sent: 0, failed: 0 });
    }

    const result = await sendNewsletter(subs.rows, subject, content, content.replace(/<[^>]+>/g, ''));

    res.json({
      success: true,
      message: `Рассылка завершена: отправлено ${result.sent}, ошибок ${result.failed}`,
      ...result,
    });
  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({ success: false, message: 'Ошибка рассылки' });
  }
});

module.exports = router;
