# Бойцовский клуб (Telegram Mini App)

Запуск: `npm install && npm start` (порт берётся из `PORT`, по умолчанию 3000).
Сервер сам раздаёт `index.html` и `fight-visual.js` и держит PvP по WebSocket, адрес сокета определяется автоматически.

Деплой на Render: Web Service, Build `npm install`, Start `npm start`, Health Check Path `/healthz`.
Затем в @BotFather: /mybots → бот → Bot Settings → Menu Button → URL вашего сервиса (https://...onrender.com).

Если фронтенд лежит отдельно (например на GitHub Pages), поправьте `FALLBACK_WS` в `index.html`.

## База данных (Supabase) — чтобы топ, кланы и прогресс не пропадали

1. Создай бесплатный проект на supabase.com.
2. В SQL Editor выполни:

```sql
create table if not exists game_state (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table game_state enable row level security;  -- доступ только с service_role ключом
```

3. В Render → Environment добавь переменные:
   - `SUPABASE_URL` — Project URL (https://xxxx.supabase.co)
   - `SUPABASE_KEY` — ключ **service_role** (Settings → API). Никому не показывай.
   - `BOT_TOKEN` — токен бота (проверка, что запросы идут из Telegram)
4. Redeploy. В логах Render должно быть `Storage: Supabase, players: N`.

Без этих переменных сервер хранит данные в файле (на бесплатном Render он стирается при перезапуске).
