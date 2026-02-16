const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Токен не предоставлен. Авторизация необходима.' 
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: 'Сервер не настроен (JWT)' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await db.query(
            'SELECT "id", "firstName", "lastName", "email", "phone" FROM "users" WHERE "id" = $1 LIMIT 1',
            [decoded.userId]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }

        req.user = result.rows[0];
        req.userId = req.user.id;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ 
            success: false, 
            message: 'Недействительный токен',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = auth;
