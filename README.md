# Бойцовский клуб (Telegram Mini App)

Запуск: `npm install && npm start` (порт берётся из `PORT`, по умолчанию 3000).
Сервер сам раздаёт `index.html` и `fight-visual.js` и держит PvP по WebSocket, адрес сокета определяется автоматически.

Деплой на Render: Web Service, Build `npm install`, Start `npm start`, Health Check Path `/healthz`.
Затем в @BotFather: /mybots → бот → Bot Settings → Menu Button → URL вашего сервиса (https://...onrender.com).

Если фронтенд лежит отдельно (например на GitHub Pages), поправьте `FALLBACK_WS` в `index.html`.
