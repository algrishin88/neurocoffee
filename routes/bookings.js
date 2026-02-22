const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Zone capacity map
const ZONE_CAPACITY = {
  'Тачдаун-зона 1': 4,
  'Тачдаун-зона 2': 4,
  'Общая зона': 12,
};

// Check zone availability
router.get('/availability', async (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Укажите дату' });

    const bookedResult = await db.query(
      `SELECT "zone", SUM("guests") as "totalGuests", COUNT(*) as "bookingCount"
       FROM "bookings"
       WHERE DATE("date") = $1 AND "status" != 'cancelled'
       ${time ? 'AND "time" = $2' : ''}
       GROUP BY "zone"`,
      time ? [date, time] : [date],
    );

    const booked = {};
    for (const row of bookedResult.rows) {
      booked[row.zone] = { totalGuests: parseInt(row.totalGuests), bookingCount: parseInt(row.bookingCount) };
    }

    const zones = Object.entries(ZONE_CAPACITY).map(([zone, capacity]) => {
      const info = booked[zone] || { totalGuests: 0, bookingCount: 0 };
      return {
        zone,
        capacity,
        booked: info.totalGuests,
        available: capacity - info.totalGuests,
        isAvailable: info.totalGuests < capacity,
      };
    });

    res.json({ success: true, zones });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ success: false, message: 'Ошибка проверки доступности' });
  }
});

// Create booking with availability check
router.post(
  '/',
  [
    body('guests').isInt({ min: 1, max: 12 }).withMessage('Количество гостей должно быть от 1 до 12'),
    body('date').notEmpty().withMessage('Дата обязательна'),
    body('time').notEmpty().withMessage('Время обязательно'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { guests, date, time, zone, notes, name, phone } = req.body;
      const userId = req.userId || null;
      const selectedZone = zone || 'Общая зона';
      
      // Validate zone exists
      if (!ZONE_CAPACITY[selectedZone]) {
        return res.status(400).json({
          success: false,
          message: `Зона ${selectedZone} не найдена. Выберите одну из доступных зон.`,
        });
      }
      
      const capacity = ZONE_CAPACITY[selectedZone];

      // Check availability for the selected zone
      const bookedResult = await db.query(
        `SELECT COALESCE(SUM("guests"), 0) as "totalGuests"
         FROM "bookings"
         WHERE DATE("date") = $1 AND "time" = $2 AND "zone" = $3 AND "status" != 'cancelled'`,
        [date, time, selectedZone],
      );

      const currentBooked = parseInt(bookedResult.rows[0].totalGuests);
      if (currentBooked + parseInt(guests) > capacity) {
        return res.status(409).json({
          success: false,
          message: `${selectedZone} занята на это время. Свободно мест: ${capacity - currentBooked}. Выберите другую зону или время.`,
        });
      }

      const result = await db.query(
        `INSERT INTO "bookings" ("userId", "guests", "date", "time", "zone", "notes", "name", "phone", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING "id", "userId", "guests", "date", "time", "zone", "notes", "name", "phone", "status", "createdAt"`,
        [userId, guests, new Date(date), time, selectedZone, notes || null, name || null, phone || null, 'pending'],
      );

      res.status(201).json({
        success: true,
        message: 'Столик успешно забронирован!',
        booking: result.rows[0],
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ success: false, message: 'Ошибка при бронировании столика' });
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
    res.json({ success: true, bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении бронирований' });
  }
});

module.exports = router;
