# Registro Civil Citas Bot — Design Spec

**Date:** 2026-04-29  
**Stack:** Node.js + SQLite + PM2  
**Server:** product-developer.ru (SSH, keys configured)

---

## Overview

Telegram-бот для мониторинга свободных слотов на гражданство в Registro Civil N3 (Valencia).  
Мигрируем с Google Apps Script на постоянно живущий Node.js-процесс на VPS.

**Аудитория:** закрытый бот, до 50–100 пользователей. Каждый новый подписчик требует одобрения администратора.

**Ключевые сценарии:**
- Пользователь подписывается → ты одобряешь/отклоняешь через inline-кнопки
- Бот каждые 30 секунд проверяет API `sige.gva.es`
- При изменении слотов — рассылка всем одобренным подписчикам с датами и временами

---

## Architecture

Один Node.js-процесс под PM2. Polling (не webhook — не нужен домен/SSL для работы бота).

```
registro-civil-bot/
├── src/
│   ├── bot.js          # Telegram polling + обработка команд и callback
│   ├── scheduler.js    # setInterval каждые 30 секунд
│   ├── api.js          # HTTP-запросы к sige.gva.es
│   ├── db.js           # SQLite: инициализация и все запросы
│   └── notify.js       # Рассылка уведомлений подписчикам
├── data/
│   └── bot.sqlite      # База данных (вне git)
├── ecosystem.config.js # PM2 конфиг
├── .env                # BOT_TOKEN, ADMIN_CHAT_ID, CHECK_INTERVAL_SECONDS
├── .env.example        # Шаблон без секретов (в git)
└── package.json
```

---

## API

Сайт: `https://sige.gva.es/qsige.localizador/citaPrevia/`  
`centro=93`, `servicio=395`

1. **Список дней:** `GET /disponible/centro/93/servicio/395/calendario`  
   → фильтруем `dias` где `estado === 0` (свободные)

2. **Слоты по дню:** `GET /disponible/horas/centro/93/servicio/395/fecha/{MMDDYYYY}`  
   → массив объектов с полем `hora_cita`

---

## Database (SQLite, better-sqlite3)

### `users`
| Поле       | Тип     | Описание                                   |
|------------|---------|--------------------------------------------|
| id         | INTEGER | PK autoincrement                           |
| chat_id    | TEXT    | UNIQUE, Telegram chat_id                   |
| username   | TEXT    | @username (может отсутствовать)            |
| first_name | TEXT    | Имя пользователя                           |
| status     | TEXT    | `pending` / `approved` / `rejected`        |
| created_at | INTEGER | Unix timestamp                             |

### `slots_cache`
| Поле       | Тип     | Описание                                   |
|------------|---------|--------------------------------------------|
| id         | INTEGER | PK, всегда одна строка (id=1)              |
| snapshot   | TEXT    | JSON последнего известного состояния слотов|
| updated_at | INTEGER | Unix timestamp                             |

---

## User Flows

### Новый пользователь
1. `/start` → запись в `users` со статусом `pending`
2. Пользователь: *«Запрос отправлен, ожидайте подтверждения»*
3. Админу: *«Новый запрос: @username (Иван)»* + кнопки `✅ Одобрить` / `❌ Отклонить`
4. Нажатие кнопки → статус меняется в БД → пользователю уведомление

### Команды пользователя
- `/start` — подписка (или напоминание текущего статуса)
- `/stop` — отписка (статус → `rejected`, мгновенно, без подтверждения)
- `/status` — текущий статус заявки

### Уведомление о слотах
```
📅 Новые слоты в Registro Civil N3:

2025-05-12: 09:00, 10:30, 11:00
2025-05-14: 14:00, 15:30

🔗 Забронировать: https://sige.gva.es/qsige/citaprevia.justicia/
```

---

## Slot Monitoring Logic

```
каждые 30 секунд:
  1. Получить список доступных дней (api.js)
  2. Для каждого дня получить слоты
  3. Собрать snapshot как JSON
  4. Сравнить со slots_cache.snapshot
  5. Если отличается → notify.js рассылает всем approved
  6. Обновить slots_cache
```

---

## Dependencies

```json
{
  "node-telegram-bot-api": "^0.66",
  "better-sqlite3": "^9",
  "dotenv": "^16"
}
```

> `node-cron` не поддерживает интервалы меньше 1 минуты — используем `setInterval`.  
> `fetch` встроен начиная с Node.js 18, отдельный пакет не нужен.

---

## Environment Variables

```env
BOT_TOKEN=<telegram-bot-token>
ADMIN_CHAT_ID=<your-telegram-chat-id>
CHECK_INTERVAL_SECONDS=30
```

---

## Deployment

```bash
# На сервере product-developer.ru
git clone <repo> /opt/registro-civil-bot
cd /opt/registro-civil-bot
npm install
cp .env.example .env   # заполнить BOT_TOKEN и ADMIN_CHAT_ID
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # автозапуск после перезагрузки VPS
```

**PM2 конфиг (`ecosystem.config.js`):**
```js
module.exports = {
  apps: [{
    name: 'registro-civil-bot',
    script: 'src/bot.js',
    restart_delay: 5000,
    max_restarts: 10,
    env_file: '.env'
  }]
}
```

---

## Out of Scope

- Автоматическое бронирование слотов (пользователи бронируют сами)
- Webhook / HTTPS / nginx
- Веб-интерфейс администратора
- Уведомления по email
