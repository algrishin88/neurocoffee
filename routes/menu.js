const express = require('express');
const db = require('../lib/db');

const router = express.Router();

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const itemsResult = await db.query(
      'SELECT "id", "itemId", "name", "description", "image", "category", "available", "createdAt", "updatedAt" FROM "menu_items" WHERE "available" = TRUE ORDER BY "itemId" ASC',
    );

    const ids = itemsResult.rows.map((i) => i.id);
    let sizesByMenuId = {};

    if (ids.length > 0) {
      const sizesResult = await db.query(
        'SELECT "id", "menuItemId", "size", "price", "createdAt" FROM "menu_item_sizes" WHERE "menuItemId" = ANY($1::text[]) ORDER BY "price" ASC',
        [ids],
      );

      sizesByMenuId = sizesResult.rows.reduce((acc, size) => {
        if (!acc[size.menuItemId]) acc[size.menuItemId] = [];
        acc[size.menuItemId].push(size);
        return acc;
      }, {});
    }

    const items = itemsResult.rows.map((item) => ({
      ...item,
      sizes: sizesByMenuId[item.id] || [],
    }));

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении меню',
    });
  }
});

// Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const itemResult = await db.query(
      'SELECT "id", "itemId", "name", "description", "image", "category", "available", "createdAt", "updatedAt" FROM "menu_items" WHERE "itemId" = $1 LIMIT 1',
      [parseInt(req.params.id, 10)],
    );

    if (itemResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    const item = itemResult.rows[0];

    const sizesResult = await db.query(
      'SELECT "id", "menuItemId", "size", "price", "createdAt" FROM "menu_item_sizes" WHERE "menuItemId" = $1 ORDER BY "price" ASC',
      [item.id],
    );

    res.json({
      success: true,
      item: {
        ...item,
        sizes: sizesResult.rows,
      },
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении товара',
    });
  }
});

module.exports = router;

