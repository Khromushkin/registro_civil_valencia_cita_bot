const db = require('./db');

const BOOKING_URL = 'https://sige.gva.es/qsige/citaprevia.justicia/';

async function notifyAll(bot, snapshot) {
  const users = db.getApprovedUsers();
  const text = `📅 *Новые слоты в Registro Civil N3:*\n\n${snapshot}\n\n🔗 [Забронировать](${BOOKING_URL})`;

  for (const user of users) {
    try {
      await bot.sendMessage(user.chat_id, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`Failed to notify ${user.chat_id}:`, err.message);
    }
  }
}

module.exports = { notifyAll };
