const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Create booking
router.post(
  '/',
  [
    body('guests')
      .isInt({ min: 1 })
      .withMessage('Количество гостей должно быть не менее 1'),
    body('date').notEmpty().withMessage('Дата обязательна'),
    body('time').notEmpty().withMessage('Время обязательно'),
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

      const { guests, date, time, zone, notes } = req.body;
      const userId = req.userId || null; // Allow anonymous bookings

      const result = await db.query(
        'INSERT INTO "bookings" ("userId", "guests", "date", "time", "zone", "notes", "status") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "id", "userId", "guests", "date", "time", "zone", "notes", "status", "createdAt", "updatedAt"',
        [userId, guests, new Date(date), time, zone || null, notes || null, 'pending'],
      );

      res.status(201).json({
        success: true,
        message: 'Столик успешно забронирован',
        booking: result.rows[0],
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при бронировании столика',
      });
    }
  },
);

// Get user bookings (requires auth)
router.get('/my', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT "id", "userId", "guests", "date", "time", "zone", "notes", "status", "createdAt", "updatedAt" FROM "bookings" WHERE "userId" = $1 ORDER BY "date" DESC',
      [req.userId],
    );

    res.json({
      success: true,
      bookings: result.rows,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении бронирований',
    });
  }
});

module.exports = router;

