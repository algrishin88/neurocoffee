const express = require('express');
const db = require('../lib/db');
const admin = require('../middleware/admin');

const router = express.Router();

// All admin routes require admin role
router.use(admin);

// ─── Dashboard Stats ───────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [orders, revenue, users, bookings, contacts, pendingOrders] = await Promise.all([
      db.query('SELECT COUNT(*) FROM "orders"'),
      db.query('SELECT COALESCE(SUM("total"), 0) as total FROM "orders" WHERE "paymentStatus" = \'paid\''),
      db.query('SELECT COUNT(*) FROM "users"'),
      db.query('SELECT COUNT(*) FROM "bookings" WHERE "status" = \'pending\''),
      db.query('SELECT COUNT(*) FROM "contacts" WHERE "status" = \'new\''),
      db.query('SELECT COUNT(*) FROM "orders" WHERE "status" = \'pending\''),
    ]);

    // Orders today
    const today = await db.query(
      'SELECT COUNT(*) FROM "orders" WHERE "createdAt" >= CURRENT_DATE',
    );

    // Revenue today
    const todayRevenue = await db.query(
      'SELECT COALESCE(SUM("total"), 0) as total FROM "orders" WHERE "paymentStatus" = \'paid\' AND "createdAt" >= CURRENT_DATE',
    );

    res.json({
      success: true,
      stats: {
        totalOrders: parseInt(orders.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].total),
        totalUsers: parseInt(users.rows[0].count),
        pendingBookings: parseInt(bookings.rows[0].count),
        newContacts: parseInt(contacts.rows[0].count),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
        ordersToday: parseInt(today.rows[0].count),
        revenueToday: parseFloat(todayRevenue.rows[0].total),
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки дашборда' });
  }
});

// ─── Orders Management ─────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    if (status) {
      params.push(status);
      where = `WHERE o."status" = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "orders" o ${where}`, params,
    );

    const ordersResult = await db.query(
      `SELECT o.*, u."firstName", u."lastName", u."email"
       FROM "orders" o
       LEFT JOIN "users" u ON u."id" = o."userId"
       ${where}
       ORDER BY o."createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset],
    );

    // Get items for each order
    const orderIds = ordersResult.rows.map(o => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const itemsResult = await db.query(
        'SELECT * FROM "order_items" WHERE "orderId" = ANY($1::text[])',
        [orderIds],
      );
      itemsByOrder = itemsResult.rows.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});
    }

    const orders = ordersResult.rows.map(o => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));

    res.json({
      success: true,
      orders,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки заказов' });
  }
});

router.patch('/orders/:id', async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const sets = [];
    const params = [];

    if (status) {
      params.push(status);
      sets.push(`"status" = $${params.length}`);
    }
    if (paymentStatus) {
      params.push(paymentStatus);
      sets.push(`"paymentStatus" = $${params.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'Нечего обновлять' });
    }

    sets.push('"updatedAt" = NOW()');
    params.push(req.params.id);

    const result = await db.query(
      `UPDATE "orders" SET ${sets.join(', ')} WHERE "id" = $${params.length} RETURNING *`,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Заказ не найден' });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error('Admin update order error:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления заказа' });
  }
});

// ─── Users Management ──────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE u."firstName" ILIKE $1 OR u."lastName" ILIKE $1 OR u."email" ILIKE $1`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "users" u ${where}`, params,
    );

    const usersResult = await db.query(
      `SELECT "id", "firstName", "lastName", "email", "phone", "role", "bonusPoints", "newsletter", "createdAt"
       FROM "users" u ${where}
       ORDER BY "createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset],
    );

    res.json({
      success: true,
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки пользователей' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { role, bonusPoints } = req.body;
    const sets = [];
    const params = [];

    if (role && ['user', 'admin'].includes(role)) {
      params.push(role);
      sets.push(`"role" = $${params.length}`);
    }
    if (bonusPoints !== undefined) {
      params.push(parseInt(bonusPoints));
      sets.push(`"bonusPoints" = $${params.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'Нечего обновлять' });
    }

    sets.push('"updatedAt" = NOW()');
    params.push(req.params.id);

    const result = await db.query(
      `UPDATE "users" SET ${sets.join(', ')} WHERE "id" = $${params.length} RETURNING "id", "firstName", "lastName", "email", "role", "bonusPoints"`,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления пользователя' });
  }
});

// ─── Menu Management ───────────────────────────────────────────
router.get('/menu', async (req, res) => {
  try {
    const items = await db.query(
      'SELECT * FROM "menu_items" ORDER BY "itemId" ASC',
    );
    const sizes = await db.query(
      'SELECT * FROM "menu_item_sizes" ORDER BY "price" ASC',
    );

    const sizesByItem = sizes.rows.reduce((acc, s) => {
      if (!acc[s.menuItemId]) acc[s.menuItemId] = [];
      acc[s.menuItemId].push(s);
      return acc;
    }, {});

    const menu = items.rows.map(item => ({
      ...item,
      sizes: sizesByItem[item.id] || [],
    }));

    res.json({ success: true, menu });
  } catch (error) {
    console.error('Admin menu error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки меню' });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const { name, description, image, category, available, sizes } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Укажите название и описание' });
    }

    // Get next itemId
    const maxResult = await db.query('SELECT COALESCE(MAX("itemId"), 0) + 1 as next FROM "menu_items"');
    const nextItemId = maxResult.rows[0].next;

    const itemResult = await db.query(
      'INSERT INTO "menu_items" ("itemId", "name", "description", "image", "category", "available") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nextItemId, name, description, image || 'images/img_1.jpg', category || 'coffee', available !== false],
    );

    const item = itemResult.rows[0];

    if (Array.isArray(sizes)) {
      for (const s of sizes) {
        await db.query(
          'INSERT INTO "menu_item_sizes" ("menuItemId", "size", "price") VALUES ($1, $2, $3)',
          [item.id, s.size, s.price],
        );
      }
    }

    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('Admin create menu item error:', error);
    res.status(500).json({ success: false, message: 'Ошибка создания товара' });
  }
});

router.patch('/menu/:id', async (req, res) => {
  try {
    const { name, description, image, category, available } = req.body;
    const sets = [];
    const params = [];

    if (name) { params.push(name); sets.push(`"name" = $${params.length}`); }
    if (description) { params.push(description); sets.push(`"description" = $${params.length}`); }
    if (image) { params.push(image); sets.push(`"image" = $${params.length}`); }
    if (category) { params.push(category); sets.push(`"category" = $${params.length}`); }
    if (available !== undefined) { params.push(available); sets.push(`"available" = $${params.length}`); }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'Нечего обновлять' });
    }

    sets.push('"updatedAt" = NOW()');
    params.push(req.params.id);

    const result = await db.query(
      `UPDATE "menu_items" SET ${sets.join(', ')} WHERE "id" = $${params.length} RETURNING *`,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Товар не найден' });
    }

    // Update sizes if provided
    if (Array.isArray(req.body.sizes)) {
      await db.query('DELETE FROM "menu_item_sizes" WHERE "menuItemId" = $1', [req.params.id]);
      for (const s of req.body.sizes) {
        await db.query(
          'INSERT INTO "menu_item_sizes" ("menuItemId", "size", "price") VALUES ($1, $2, $3)',
          [req.params.id, s.size, s.price],
        );
      }
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Admin update menu item error:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления товара' });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM "menu_items" WHERE "id" = $1 RETURNING "id"',
      [req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Товар не найден' });
    }

    res.json({ success: true, message: 'Товар удалён' });
  } catch (error) {
    console.error('Admin delete menu item error:', error);
    res.status(500).json({ success: false, message: 'Ошибка удаления товара' });
  }
});

// ─── Bookings Management ───────────────────────────────────────
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    if (status) {
      params.push(status);
      where = `WHERE b."status" = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "bookings" b ${where}`, params,
    );

    const bookingsResult = await db.query(
      `SELECT b.*, u."firstName", u."lastName", u."email", u."phone" as "userPhone"
       FROM "bookings" b
       LEFT JOIN "users" u ON u."id" = b."userId"
       ${where}
       ORDER BY b."date" DESC, b."time" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset],
    );

    res.json({
      success: true,
      bookings: bookingsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки бронирований' });
  }
});

router.patch('/bookings/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Укажите статус' });
    }

    const result = await db.query(
      'UPDATE "bookings" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *',
      [status, req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Бронирование не найдено' });
    }

    res.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error('Admin update booking error:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления бронирования' });
  }
});

// ─── Contacts Management ───────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    if (status) {
      params.push(status);
      where = `WHERE "status" = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "contacts" ${where}`, params,
    );

    const contactsResult = await db.query(
      `SELECT * FROM "contacts" ${where}
       ORDER BY "createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset],
    );

    res.json({
      success: true,
      contacts: contactsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Admin contacts error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки сообщений' });
  }
});

router.patch('/contacts/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Укажите статус' });
    }

    const result = await db.query(
      'UPDATE "contacts" SET "status" = $1 WHERE "id" = $2 RETURNING *',
      [status, req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Сообщение не найдено' });
    }

    res.json({ success: true, contact: result.rows[0] });
  } catch (error) {
    console.error('Admin update contact error:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления сообщения' });
  }
});

// ─── Newsletter Management ─────────────────────────────────────
router.get('/newsletter', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await db.query('SELECT COUNT(*) FROM "newsletter_subscribers"');
    const subscribersResult = await db.query(
      'SELECT * FROM "newsletter_subscribers" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), offset],
    );

    res.json({
      success: true,
      subscribers: subscribersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Admin newsletter error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки подписчиков' });
  }
});

module.exports = router;
