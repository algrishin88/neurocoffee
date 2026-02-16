const express = require('express');
const db = require('../lib/db');
const auth = require('../middleware/auth');

const router = express.Router();

async function getOrCreateCart(userId) {
  // Use INSERT ON CONFLICT to avoid race condition with concurrent requests
  const result = await db.query(
    `INSERT INTO "carts" ("userId") VALUES ($1)
     ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = NOW()
     RETURNING "id", "userId", "createdAt", "updatedAt"`,
    [userId],
  );
  return result.rows[0];
}

async function getCartWithItems(userId) {
  const cartResult = await db.query(
    'SELECT "id", "userId", "createdAt", "updatedAt" FROM "carts" WHERE "userId" = $1 LIMIT 1',
    [userId],
  );

  if (cartResult.rowCount === 0) {
    return null;
  }

  const cart = cartResult.rows[0];
  const itemsResult = await db.query(
    'SELECT "id", "cartId", "itemId", "name", "price", "size", "image", "quantity", "createdAt" FROM "cart_items" WHERE "cartId" = $1 ORDER BY "createdAt" ASC',
    [cart.id],
  );

  return {
    ...cart,
    items: itemsResult.rows,
  };
}

// Get user cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await getCartWithItems(req.userId);

    if (!cart) {
      const createdCart = await getOrCreateCart(req.userId);
      cart = { ...createdCart, items: [] };
    }

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении корзины',
    });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { itemId, name, size, image, quantity = 1 } = req.body;

    if (!itemId || !name || !size) {
      return res.status(400).json({
        success: false,
        message: 'Не все обязательные поля заполнены',
      });
    }

    // Server-side price lookup — never trust client price
    const priceResult = await db.query(
      `SELECT mis."price", mi."name", mi."image"
       FROM "menu_item_sizes" mis
       JOIN "menu_items" mi ON mi."id" = mis."menuItemId"
       WHERE mi."itemId" = $1 AND mis."size" = $2 AND mi."available" = true
       LIMIT 1`,
      [itemId, size],
    );

    let verifiedPrice;
    let verifiedName = name;
    let verifiedImage = image;

    if (priceResult.rowCount > 0) {
      verifiedPrice = priceResult.rows[0].price;
      verifiedName = priceResult.rows[0].name;
      verifiedImage = priceResult.rows[0].image || image;
    } else {
      // Fallback for special/dynamic items (e.g. neuro-coffee) — accept client price but log
      const clientPrice = parseFloat(req.body.price);
      if (!clientPrice || clientPrice <= 0 || clientPrice > 10000) {
        return res.status(400).json({ success: false, message: 'Товар не найден или недоступен' });
      }
      verifiedPrice = clientPrice;
      console.warn(`Cart add: price from client for itemId=${itemId} size=${size} price=${clientPrice}`);
    }

    // Get or create cart
    const cart = await getOrCreateCart(req.userId);

    // Check if item already exists
    const existingItemResult = await db.query(
      'SELECT "id", "quantity" FROM "cart_items" WHERE "cartId" = $1 AND "itemId" = $2 AND "size" = $3 LIMIT 1',
      [cart.id, itemId, size],
    );

    if (existingItemResult.rowCount > 0) {
      const existingItem = existingItemResult.rows[0];
      await db.query(
        'UPDATE "cart_items" SET "quantity" = $1 WHERE "id" = $2',
        [existingItem.quantity + quantity, existingItem.id],
      );
    } else {
      await db.query(
        'INSERT INTO "cart_items" ("cartId", "itemId", "name", "price", "size", "image", "quantity") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [cart.id, itemId, verifiedName, verifiedPrice, size, verifiedImage, quantity],
      );
    }

    const updatedCart = await getCartWithItems(req.userId);

    res.json({
      success: true,
      message: 'Товар добавлен в корзину',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении товара в корзину',
    });
  }
});

// Update item quantity
router.put('/update/:itemId/:size', auth, async (req, res) => {
  try {
    const { itemId, size } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректное количество',
      });
    }

    const cart = await getOrCreateCart(req.userId);

    const itemResult = await db.query(
      'SELECT "id" FROM "cart_items" WHERE "cartId" = $1 AND "itemId" = $2 AND "size" = $3 LIMIT 1',
      [cart.id, parseInt(itemId, 10), size],
    );

    if (itemResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден в корзине',
      });
    }

    const item = itemResult.rows[0];

    if (quantity === 0) {
      await db.query('DELETE FROM "cart_items" WHERE "id" = $1', [item.id]);
    } else {
      await db.query(
        'UPDATE "cart_items" SET "quantity" = $1 WHERE "id" = $2',
        [quantity, item.id],
      );
    }

    const updatedCart = await getCartWithItems(req.userId);

    res.json({
      success: true,
      message: 'Количество обновлено',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении корзины',
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId/:size', auth, async (req, res) => {
  try {
    const { itemId, size } = req.params;

    const cart = await getOrCreateCart(req.userId);

    const itemResult = await db.query(
      'SELECT "id" FROM "cart_items" WHERE "cartId" = $1 AND "itemId" = $2 AND "size" = $3 LIMIT 1',
      [cart.id, parseInt(itemId, 10), size],
    );

    if (itemResult.rowCount > 0) {
      await db.query('DELETE FROM "cart_items" WHERE "id" = $1', [
        itemResult.rows[0].id,
      ]);
    }

    const updatedCart = await getCartWithItems(req.userId);

    res.json({
      success: true,
      message: 'Товар удален из корзины',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении товара из корзины',
    });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.userId);

    await db.query('DELETE FROM "cart_items" WHERE "cartId" = $1', [cart.id]);

    const updatedCart = await getCartWithItems(req.userId);

    res.json({
      success: true,
      message: 'Корзина очищена',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при очистке корзины',
    });
  }
});

module.exports = router;

