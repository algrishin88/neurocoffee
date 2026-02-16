const express = require('express');
const db = require('../lib/db');
const auth = require('../middleware/auth');
const { sendSupportMessage } = require('../lib/telegram');

const router = express.Router();

// Request operator — creates or updates a support chat and notifies via Telegram
router.post('/request-operator', async (req, res) => {
  try {
    const { userName, userEmail, message, chatHistory } = req.body;
    const name = (userName || 'Гость').trim();
    const email = (userEmail || '').trim();
    const msg = (message || 'Пользователь запросил оператора').trim();

    // Store in DB
    const chatResult = await db.query(
      'INSERT INTO "support_chats" ("userName", "userEmail", "status") VALUES ($1, $2, $3) RETURNING "id"',
      [name, email, 'waiting_operator'],
    );
    const chatId = chatResult.rows[0].id;

    // Save chat history messages
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      for (const m of chatHistory.slice(-10)) {
        await db.query(
          'INSERT INTO "support_messages" ("chatId", "role", "message") VALUES ($1, $2, $3)',
          [chatId, m.role || 'user', (m.text || m.message || '').slice(0, 2000)],
        );
      }
    }

    // Save the operator request message
    await db.query(
      'INSERT INTO "support_messages" ("chatId", "role", "message") VALUES ($1, $2, $3)',
      [chatId, 'system', `Запрос на оператора: ${msg}`],
    );

    // Send to Telegram
    const historyText = Array.isArray(chatHistory)
      ? chatHistory.slice(-5).map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.text || m.message}`).join('\n')
      : '';
    const fullMsg = historyText ? `${msg}\n\n📋 Последние сообщения:\n${historyText}` : msg;
    await sendSupportMessage(name, email, fullMsg);

    res.json({
      success: true,
      chatId,
      message: 'Оператор получит ваше сообщение. Ожидайте ответа на email или в Telegram.',
    });
  } catch (error) {
    console.error('Request operator error:', error);
    res.status(500).json({ success: false, message: 'Ошибка при вызове оператора' });
  }
});

// Get support chat messages (for admin)
router.get('/chats', require('../middleware/admin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM "support_chats" ORDER BY "createdAt" DESC LIMIT 50',
    );
    res.json({ success: true, chats: result.rows });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Ошибка' });
  }
});

module.exports = router;
