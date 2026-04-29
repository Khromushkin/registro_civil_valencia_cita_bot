# Registro Civil Valencia — Cita Bot

Telegram-бот для мониторинга свободных слотов на гражданство в Registro Civil N3 (Valencia).

Бот проверяет доступность записи каждые 30 секунд и отправляет уведомления подписчикам при появлении новых слотов. Каждый новый пользователь требует одобрения администратора.

## Возможности

- Мониторинг слотов каждые 30 секунд
- Уведомления с конкретными датами и временами
- Подтверждение подписчиков администратором через inline-кнопки
- Команды: `/start`, `/stop`, `/status`

## Установка

**Требования:** Node.js 18+, npm, PM2

```bash
git clone https://github.com/Khromushkin/registro_civil_valencia_cita_bot.git
cd registro_civil_valencia_cita_bot
npm install
cp .env.example .env
```

Заполни `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=your_telegram_chat_id
CHECK_INTERVAL_SECONDS=30
```

## Запуск

**Локально:**
```bash
node src/bot.js
```

**На сервере через PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Структура

```
src/
├── bot.js        # Telegram polling, команды, inline-кнопки
├── scheduler.js  # Проверка слотов по интервалу
├── api.js        # Запросы к sige.gva.es
├── db.js         # SQLite: пользователи и кеш слотов
└── notify.js     # Рассылка уведомлений
```
