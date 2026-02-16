const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../lib/db');

const router = express.Router();

// Subscribe to newsletter
router.post(
  '/subscribe',
  [
    body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Укажите email',
        });
      }

      await db.query(
        'INSERT INTO "newsletter_subscribers" ("email") VALUES ($1) ON CONFLICT ("email") DO NOTHING',
        [email],
      );

      res.status(201).json({
        success: true,
        message: 'Вы подписаны на рассылку',
      });
    } catch (error) {
      console.error('Newsletter subscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при подписке',
      });
    }
  },
);

module.exports = router;
