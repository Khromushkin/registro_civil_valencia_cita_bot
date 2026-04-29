const { fetchSlots } = require('./api');
const db = require('./db');
const { notifyAll } = require('./notify');

function start(bot) {
  const intervalMs = parseInt(process.env.CHECK_INTERVAL_SECONDS || '30') * 1000;
  console.log(`Scheduler: checking slots every ${intervalMs / 1000}s`);

  const check = async () => {
    try {
      const snapshot = await fetchSlots();
      const previous = db.getSnapshot();

      if (snapshot !== previous) {
        db.setSnapshot(snapshot);
        if (previous !== null) {
          console.log('Slots changed, notifying subscribers...');
          await notifyAll(bot, snapshot);
        } else {
          console.log('Initial snapshot saved, no notification.');
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err.message, err.cause?.message || '');
    }
  };

  check();
  setInterval(check, intervalMs);
}

module.exports = { start };
