const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../lib/db');
const { sendContactEmail } = require('../lib/mail');

const router = express.Router();

// Create contact message (saves to DB and optionally sends email to cafe)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Имя обязательно'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('message').trim().notEmpty().withMessage('Сообщение обязательно'),
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

      const { name, email, message } = req.body;

      const result = await db.query(
        'INSERT INTO "contacts" ("name", "email", "message", "status") VALUES ($1, $2, $3, $4) RETURNING "id", "name", "email", "message", "status", "createdAt"',
        [name, email, message, 'new'],
      );

      await sendContactEmail({ name, email, message });

      res.status(201).json({
        success: true,
        message: 'Сообщение успешно отправлено',
        contact: result.rows[0],
      });
    } catch (error) {
      console.error('Create contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при отправке сообщения',
      });
    }
  },
);

module.exports = router;

