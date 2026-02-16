const express = require('express');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Create order from cart
router.post('/', auth, async (req, res) => {
  const client = await db.getClient();
  try {
    const { deliveryType, deliveryAddress, phone, notes, recipe } = req.body;
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
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

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

    await client.query('COMMIT');

    // Bonus points: 1 point per 100 RUB, minimum 1 per order (outside transaction to avoid abort)
    const bonusToAdd = Math.max(1, Math.floor(total / 100));
    try {
      await db.query(
        'UPDATE "users" SET "bonusPoints" = COALESCE("bonusPoints", 0) + $1, "updatedAt" = NOW() WHERE "id" = $2',
        [bonusToAdd, req.userId],
      );
    } catch (bonusErr) {
      console.warn('Bonus points update failed (non-critical):', bonusErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Заказ успешно создан',
      order: {
        ...order,
        items: orderItemsResult.rows,
      },
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Create order error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании заказа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

module.exports = router;

