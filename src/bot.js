require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const scheduler = require('./scheduler');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// /start — subscribe request
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const username = msg.from.username || '';
  const firstName = msg.from.first_name || '';

  const existing = db.getUser(chatId);
  if (existing) {
    const replies = {
      pending:  '⏳ Ваш запрос уже отправлен, ожидайте подтверждения.',
      approved: '✅ Вы уже подписаны на уведомления.',
      rejected: '❌ Ваш запрос был отклонён. Свяжитесь с администратором.',
    };
    return bot.sendMessage(chatId, replies[existing.status] || 'Неизвестный статус.');
  }

  db.upsertUser(chatId, username, firstName);
  await bot.sendMessage(chatId, '⏳ Запрос отправлен, ожидайте подтверждения администратора.');

  const label = username ? `@${username}` : firstName;
  await bot.sendMessage(
    ADMIN_CHAT_ID,
    `👤 Новый запрос на подписку:\n${label} (${firstName})\nchat\\_id: \`${chatId}\``,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Одобрить', callback_data: `approve:${chatId}` },
          { text: '❌ Отклонить', callback_data: `reject:${chatId}` },
        ]],
      },
    }
  );
});

// /stop — unsubscribe
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = db.getUser(chatId);
  if (!user) return bot.sendMessage(chatId, 'Вы не были подписаны.');
  db.setStatus(chatId, 'rejected');
  bot.sendMessage(chatId, '🚫 Вы отписались от уведомлений.');
});

// /status — show current status
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = db.getUser(chatId);
  if (!user) return bot.sendMessage(chatId, 'Вы ещё не отправляли запрос. Напишите /start');
  const replies = {
    pending:  '⏳ Запрос на рассмотрении.',
    approved: '✅ Вы подписаны на уведомления.',
    rejected: '❌ Запрос отклонён или вы отписались.',
  };
  bot.sendMessage(chatId, replies[user.status] || 'Неизвестный статус.');
});

// Admin approve/reject via inline buttons
bot.on('callback_query', async (query) => {
  const [action, targetChatId] = query.data.split(':');
  if (!targetChatId) return;

  const removeButtons = () =>
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    ).catch(() => {});

  if (action === 'approve') {
    db.setStatus(targetChatId, 'approved');
    await bot.sendMessage(targetChatId, '✅ Ваш запрос одобрен! Буду присылать уведомления о свободных слотах.');
    await bot.answerCallbackQuery(query.id, { text: '✅ Одобрено' });
    await removeButtons();
  } else if (action === 'reject') {
    db.setStatus(targetChatId, 'rejected');
    await bot.sendMessage(targetChatId, '❌ Извините, доступ не предоставлен.');
    await bot.answerCallbackQuery(query.id, { text: '❌ Отклонено' });
    await removeButtons();
  }
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

scheduler.start(bot);
console.log('Bot started.');
