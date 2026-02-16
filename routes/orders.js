const express = require('express');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Create order from cart
router.post('/', auth, async (req, res) => {
  const client = await db.getClient();
  try {
    const { deliveryType, deliveryAddress, phone, notes, recipe, useBonusPoints } = req.body;
    const type = (deliveryType || 'self_pickup') === 'delivery' ? 'delivery' : 'self_pickup';
    const address = type === 'self_pickup' ? 'Самовывоз' : (deliveryAddress || '').trim();

    if (type === 'delivery' && !address) {
      return res.status(400).json({
        success: false,
        message: 'Укажите адрес доставки',
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Get user bonus points (with lock)
    const userResult = await client.query(
      'SELECT "bonusPoints" FROM "users" WHERE "id" = $1 FOR UPDATE',
      [req.userId],
    );
    const availableBonuses = userResult.rows[0]?.bonusPoints || 0;

    // Get user cart with items (lock for update to prevent double-ordering)
    const cartResult = await client.query(
      'SELECT "id" FROM "carts" WHERE "userId" = $1 LIMIT 1 FOR UPDATE',
      [req.userId],
    );

    if (cartResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Корзина пуста',
      });
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = await client.query(
      'SELECT "itemId", "name", "price", "size", "image", "quantity" FROM "cart_items" WHERE "cartId" = $1',
      [cartId],
    );

    if (itemsResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Корзина пуста',
      });
    }

    const items = itemsResult.rows;

    // Calculate total
    let subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Bonus points discount: 1 bonus = 1 RUB, max 50% of order
    let bonusDiscount = 0;
    if (useBonusPoints && availableBonuses > 0) {
      const maxDiscount = Math.floor(subtotal * 0.5); // max 50% discount
      bonusDiscount = Math.min(availableBonuses, maxDiscount);
    }
    const total = Math.max(1, subtotal - bonusDiscount);

    // Recipe: order-level (нейро-кофе) and per-item for neuro
    let recipeJson = null;
    if (recipe) {
      recipeJson =
        typeof recipe === 'string' ? recipe : JSON.stringify(recipe);
    }
    let recipeObj = null;
    if (recipe) {
      try { recipeObj = typeof recipe === 'string' ? JSON.parse(recipe) : recipe; } catch { recipeObj = recipe; }
    }
    const recipeText = recipeObj?.fullText || (typeof recipe === 'string' ? recipe : null);

    const isNeuro = (item) =>
      item.itemId === 7 ||
      /нейро|ваш нейро|нейро-кофе/i.test(item.name || '');

    // Create order (клиент: userId; доставка/самовывоз; оплата СБП)
    const orderResult = await client.query(
      `INSERT INTO "orders" ("userId", "total", "deliveryType", "deliveryAddress", "phone", "notes", "recipe", "status", "paymentMethod", "paymentStatus")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'sbp', 'pending')
       RETURNING "id", "userId", "total", "deliveryType", "deliveryAddress", "phone", "notes", "recipe", "status", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"`,
      [
        req.userId,
        total,
        type,
        address || null,
        phone || null,
        notes || null,
        recipeJson,
      ],
    );

    const order = orderResult.rows[0];

    // Insert order items; для нейро-кофе пишем рецепт в позицию
    const insertItemsPromises = items.map((item) => {
      const itemRecipe = recipeText && isNeuro(item) ? recipeText : null;
      return client.query(
        `INSERT INTO "order_items" ("orderId", "itemId", "name", "price", "size", "image", "quantity", "recipe")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          order.id,
          item.itemId,
          item.name,
          item.price,
          item.size,
          item.image,
          item.quantity,
          itemRecipe,
        ],
      );
    });

    await Promise.all(insertItemsPromises);

    // Get order items for response
    const orderItemsResult = await client.query(
      'SELECT "id", "orderId", "itemId", "name", "price", "size", "image", "quantity", "recipe", "createdAt" FROM "order_items" WHERE "orderId" = $1',
      [order.id],
    );

    // Clear cart
    await client.query('DELETE FROM "cart_items" WHERE "cartId" = $1', [
      cartId,
    ]);

    // Deduct bonus points if used (inside transaction for consistency)
    if (bonusDiscount > 0) {
      await client.query(
        'UPDATE "users" SET "bonusPoints" = COALESCE("bonusPoints", 0) - $1, "updatedAt" = NOW() WHERE "id" = $2',
        [bonusDiscount, req.userId],
      );
      await client.query(
        'INSERT INTO "bonus_transactions" ("userId", "amount", "type", "description", "orderId") VALUES ($1, $2, $3, $4, $5)',
        [req.userId, -bonusDiscount, 'spent', `Скидка ${bonusDiscount} ₽ на заказ`, order.id],
      );
    }

    await client.query('COMMIT');

    // Bonus points earned: 1 point per 100 RUB of original subtotal, minimum 1 per order
    const bonusToAdd = Math.max(1, Math.floor(subtotal / 100));
    try {
      await db.query(
        'UPDATE "users" SET "bonusPoints" = COALESCE("bonusPoints", 0) + $1, "updatedAt" = NOW() WHERE "id" = $2',
        [bonusToAdd, req.userId],
      );
      await db.query(
        'INSERT INTO "bonus_transactions" ("userId", "amount", "type", "description", "orderId") VALUES ($1, $2, $3, $4, $5)',
        [req.userId, bonusToAdd, 'earned', `Начислено ${bonusToAdd} бонусов за заказ`, order.id],
      );
    } catch (bonusErr) {
      console.warn('Bonus points update failed (non-critical):', bonusErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Заказ успешно создан',
      bonusUsed: bonusDiscount,
      bonusEarned: bonusToAdd,
      order: {
        ...order,
        bonusDiscount,
        items: orderItemsResult.rows,
      },
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Create order error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании заказа. Попробуйте позже.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  } finally {
    client.release();
  }
});

// Get user orders
router.get('/', auth, async (req, res) => {
  try {
    const ordersResult = await db.query(
      'SELECT "id", "userId", "total", "deliveryType", "deliveryAddress", "phone", "notes", "recipe", "status", "paymentMethod", "paymentStatus", "createdAt", "updatedAt" FROM "orders" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [req.userId],
    );

    const orderIds = ordersResult.rows.map((o) => o.id);
    let itemsByOrderId = {};

    if (orderIds.length > 0) {
      const itemsResult = await db.query(
        'SELECT "id", "orderId", "itemId", "name", "price", "size", "image", "quantity", "recipe", "createdAt" FROM "order_items" WHERE "orderId" = ANY($1::text[])',
        [orderIds],
      );

      itemsByOrderId = itemsResult.rows.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});
    }

    const orders = ordersResult.rows.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || [],
    }));

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заказов',
    });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const orderResult = await db.query(
      'SELECT "id", "userId", "total", "deliveryType", "deliveryAddress", "phone", "notes", "recipe", "status", "paymentMethod", "paymentStatus", "createdAt", "updatedAt" FROM "orders" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [req.params.id, req.userId],
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден',
      });
    }

    const itemsResult = await db.query(
      'SELECT "id", "orderId", "itemId", "name", "price", "size", "image", "quantity", "recipe", "createdAt" FROM "order_items" WHERE "orderId" = $1',
      [orderResult.rows[0].id],
    );

    res.json({
      success: true,
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заказа',
    });
  }
});

// Get user bonus history
router.get('/bonus-history', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT "id", "amount", "type", "description", "orderId", "createdAt" FROM "bonus_transactions" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50',
      [req.userId],
    );
    const userResult = await db.query(
      'SELECT "bonusPoints" FROM "users" WHERE "id" = $1 LIMIT 1',
      [req.userId],
    );
    res.json({
      success: true,
      balance: userResult.rows[0]?.bonusPoints || 0,
      transactions: result.rows,
    });
  } catch (error) {
    console.error('Bonus history error:', error);
    res.status(500).json({ success: false, message: 'Ошибка получения истории бонусов' });
  }
});

module.exports = router;

