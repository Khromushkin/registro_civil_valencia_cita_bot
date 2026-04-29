const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'bot.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    TEXT UNIQUE,
    username   TEXT,
    first_name TEXT,
    status     TEXT    DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS slots_cache (
    id         INTEGER PRIMARY KEY,
    snapshot   TEXT,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

db.prepare('INSERT OR IGNORE INTO slots_cache (id, snapshot) VALUES (1, NULL)').run();

module.exports = {
  getUser:          (chatId)                      => db.prepare('SELECT * FROM users WHERE chat_id = ?').get(chatId),
  upsertUser:       (chatId, username, firstName) => db.prepare(
    'INSERT INTO users (chat_id, username, first_name) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO NOTHING'
  ).run(chatId, username, firstName),
  setStatus:        (chatId, status)              => db.prepare('UPDATE users SET status = ? WHERE chat_id = ?').run(status, chatId),
  getApprovedUsers: ()                            => db.prepare("SELECT * FROM users WHERE status = 'approved'").all(),
  getSnapshot:      ()                            => db.prepare('SELECT snapshot FROM slots_cache WHERE id = 1').get()?.snapshot,
  setSnapshot:      (snapshot)                    => db.prepare('UPDATE slots_cache SET snapshot = ?, updated_at = unixepoch() WHERE id = 1').run(snapshot),
};
