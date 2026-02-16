const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPPORT_CHAT_ID = process.env.TELEGRAM_SUPPORT_CHAT_ID || CHAT_ID;

function isConfigured() {
  return !!(BOT_TOKEN && CHAT_ID);
}

/**
 * Send a text message to a Telegram chat.
 */
async function sendMessage(chatId, text, parseMode = 'HTML') {
  if (!BOT_TOKEN) {
    console.warn('Telegram not configured (TELEGRAM_BOT_TOKEN)');
    return null;
  }
  try {
    const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId || CHAT_ID,
      text,
      parse_mode: parseMode,
    });
    return res.data;
  } catch (err) {
    console.error('Telegram sendMessage error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Send generated neuro-coffee recipe to Telegram.
 */
async function sendRecipeToTelegram(recipe, userInfo) {
  if (!isConfigured()) return false;

  const userName = userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 'Гость';
  const text = `☕ <b>Новый нейро-рецепт!</b>\n\n`
    + `<b>Клиент:</b> ${userName}\n`
    + `<b>Название:</b> ${recipe.name || 'Нейро-кофе'}\n\n`
    + `<b>Описание:</b>\n${recipe.description || ''}\n\n`
    + `<b>Ингредиенты:</b>\n${recipe.ingredients || ''}\n\n`
    + `<b>Приготовление:</b>\n${recipe.instructions || ''}\n\n`
    + `<b>Размер:</b> ${recipe.size || '350мл'}\n`
    + `<b>Цена:</b> ${recipe.price || 200} ₽`;

  const result = await sendMessage(CHAT_ID, text);
  return !!result;
}

/**
 * Forward support message to Telegram support chat.
 */
async function sendSupportMessage(userName, userEmail, message) {
  if (!BOT_TOKEN || !SUPPORT_CHAT_ID) return false;

  const text = `📩 <b>Запрос на оператора</b>\n\n`
    + `<b>Имя:</b> ${userName}\n`
    + `<b>Email:</b> ${userEmail || 'не указан'}\n\n`
    + `<b>Сообщение:</b>\n${message}`;

  const result = await sendMessage(SUPPORT_CHAT_ID, text);
  return !!result;
}

module.exports = { sendMessage, sendRecipeToTelegram, sendSupportMessage, isConfigured };
