const jwt = require('jsonwebtoken');
const db = require('../lib/db');

/**
 * Admin middleware — verifies JWT and checks role === 'admin'
 */
const admin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Авторизация необходима' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Сервер не настроен (JWT)' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT "id", "firstName", "lastName", "email", "role" FROM "users" WHERE "id" = $1 LIMIT 1',
      [decoded.userId],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Недостаточно прав' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    res.status(401).json({ success: false, message: 'Недействительный токен' });
  }
};

module.exports = admin;
