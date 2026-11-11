const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const TURN_MS = 30000;     // время на ход, потом техническое поражение
const MIN_HIT_GAP = 350;   // антиспам ударов, мс

// Раздаём игру с этого же сервера: тогда адрес WebSocket определяется сам.
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/fight-visual.js': 'fight-visual.js', '/hero.js': 'hero.js' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const social = require('./social');
const server = http.createServer((req, res) => {
  if (social.webhook(req, res)) return;
  if (social.middleware(req, res)) return;
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const file = STATIC[url];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(500); return res.end('error'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
const wss = new WebSocket.Server({ server, maxPayload: 2048 });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Пинг раз в 25 секунд: убирает мёртвые соединения и не даёт прокси их закрыть по простою
setInterval(() => {
  for (const c of wss.clients) {
    if (c.isAlive === false) { c.terminate(); continue; }
    c.isAlive = false;
    try { c.ping(); } catch (e) {}
  }
}, 25000);

// ── State ──
const queue = [];        // ws connections waiting for match
const rooms = {};        // roomId -> { A, B, ghost?, hp, maxHp, prof, turn, timer }
let roomCounter = 0;
const GHOST_WAIT_MS = Number(process.env.GHOST_MS) || 9000;   // нет живого соперника -> бой с «призраком» другого игрока
const GHOST_NAMES = ['Серый','Лысый','Кривой','Рыжий','Мрачный','Бешеный','Щербатый','Тощий'];

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
// Профиль бойца присылает клиент, сервер режет значения по потолкам уровня
function sanitizeProf(p) {
  p = p || {};
  const lvl = Math.round(num(p.lvl, 1, 100));
  return {
    lvl,
    hp: Math.round(num(p.hp, 100, 150 + lvl * 45)),
    dmg: Math.round(num(p.dmg, 0, 8 + lvl * 1.2)),
    crit: num(p.crit, 0.1, 0.5),
    dodge: num(p.dodge, 0, 0.5),
    armor: num(p.armor, 0, 0.55)
  };
}
function ghostProf(lvl) {
  return sanitizeProf({ lvl, hp: 100 + (lvl - 1) * 12 + lvl * 4, dmg: Math.round(lvl * .6), crit: .15 + lvl * .002, dodge: lvl * .003, armor: lvl * .004 });
}
function computeHit(atk, def) {
  if (Math.random() < def.dodge) return { dmg: 0, isCrit: false, dodged: true };
  const isCrit = Math.random() < atk.crit;
  let d = (15 + atk.dmg) * (0.9 + Math.random() * 0.2) * (1 - def.armor);
  if (isCrit) d *= 1.5;
  return { dmg: Math.max(1, Math.round(d)), isCrit, dodged: false };
}

function armTurnTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  if (room.ghost && room.turn === 'B') return;   // за призрака ходит сервер
  room.timer = setTimeout(() => {
    const r = rooms[roomId];
    if (!r) return;
    const loser = r.turn, winner = loser === 'A' ? 'B' : 'A';
    send(r.A, { type: 'end', winner, playerId: 'A', reason: 'timeout' });
    send(r.B, { type: 'end', winner, playerId: 'B', reason: 'timeout' });
    delete rooms[roomId];
  }, TURN_MS);
}

function removeFromQueue(ws) {
  const idx = queue.indexOf(ws);
  if (idx !== -1) queue.splice(idx, 1);
  clearTimeout(ws.ghostTimer);
}
function roomOf(ws) {
  for (const rid in rooms) { const r = rooms[rid]; if (r.A === ws || r.B === ws) return [rid, r]; }
  return [null, null];
}

function startRoom(p1, p2, ghost) {
  roomCounter++;
  const roomId = 'room_' + roomCounter;
  const prof = { A: p1.prof, B: ghost ? ghost.prof : p2.prof };
  const maxHp = { A: prof.A.hp, B: prof.B.hp };
  rooms[roomId] = { A: p1, B: ghost ? null : p2, ghost: ghost || null, hp: { ...maxHp }, maxHp, prof, turn: 'A', timer: null };
  armTurnTimer(roomId);
  const base = { type: 'ready', hp: { ...maxHp }, maxHp, turn: 'A' };
  send(p1, { ...base, playerId: 'A', opponentName: ghost ? ghost.name : p2.pname, opponentSeed: ghost ? ghost.seed : p2.seed, opponentLevel: prof.B.lvl, ghost: !!ghost });
  if (!ghost) send(p2, { ...base, playerId: 'B', opponentName: p1.pname, opponentSeed: p1.seed, opponentLevel: prof.A.lvl });
  console.log('Match started:', roomId, ghost ? '(ghost)' : '');
}

function doHit(roomId, attackerId) {
  const room = rooms[roomId];
  if (!room) return;
  const opponentId = attackerId === 'A' ? 'B' : 'A';
  const { dmg, isCrit, dodged } = computeHit(room.prof[attackerId], room.prof[opponentId]);
  room.hp[opponentId] = Math.max(0, room.hp[opponentId] - dmg);
  room.turn = opponentId;
  armTurnTimer(roomId);
  const upd = { type: 'update', hp: { ...room.hp }, maxHp: room.maxHp, turn: room.turn, dmg, isCrit, dodged, target: opponentId, attacker: attackerId };
  send(room.A, upd); send(room.B, upd);
  if (room.hp[opponentId] <= 0) {
    send(room.A, { type: 'end', winner: attackerId, playerId: 'A' });
    send(room.B, { type: 'end', winner: attackerId, playerId: 'B' });
    clearTimeout(room.timer);
    delete rooms[roomId];
    console.log('Match ended:', roomId, 'winner:', attackerId);
    return;
  }
  if (room.ghost && room.turn === 'B') setTimeout(() => { if (rooms[roomId]) doHit(roomId, 'B'); }, 1000 + Math.random() * 600);
}

// ── Connection handler ──
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.lastHit = 0;
  console.log('Client connected, total:', wss.clients.size);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { send(ws, { type: 'error', text: 'Invalid JSON' }); return; }

    switch (msg.type) {
      case 'find_match': {
        if (queue.includes(ws)) { send(ws, { type: 'searching' }); return; }
        if (roomOf(ws)[1]) { send(ws, { type: 'error', text: 'You are already in a match' }); return; }
        ws.pname = String(msg.name || 'Боец').replace(/[<>&"']/g, '').slice(0, 20) || 'Боец';
        ws.seed = Number.isInteger(msg.seed) ? Math.abs(msg.seed) % 2000000000 : Math.floor(Math.random() * 2e9);
        ws.prof = sanitizeProf(msg.prof);
        queue.push(ws);
        send(ws, { type: 'searching' });
        if (queue.length >= 2) {
          // ищем соперника с ближайшим уровнем
          const me = queue.shift();
          let bi = 0, bd = 1e9;
          queue.forEach((q, i) => { const d = Math.abs(q.prof.lvl - me.prof.lvl); if (d < bd) { bd = d; bi = i; } });
          const other = queue.splice(bi, 1)[0];
          clearTimeout(me.ghostTimer); clearTimeout(other.ghostTimer);
          startRoom(me, other);
        } else {
          ws.ghostTimer = setTimeout(() => {
            if (!queue.includes(ws)) return;
            removeFromQueue(ws);
            const gl = Math.max(1, ws.prof.lvl + Math.round((Math.random() - 0.4) * 3));
            startRoom(ws, null, { name: '👻 ' + GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)], seed: Math.floor(Math.random() * 2e9), prof: ghostProf(gl) });
          }, GHOST_WAIT_MS);
        }
        break;
      }
      case 'cancel_search': {
        removeFromQueue(ws);
        send(ws, { type: 'search_cancelled' });
        break;
      }
      case 'hit': {
        const [rid, room] = roomOf(ws);
        if (!room) { send(ws, { type: 'error', text: 'You are not in a match' }); return; }
        const pid = room.A === ws ? 'A' : 'B';
        if (room.turn !== pid) { send(ws, { type: 'error', text: 'Not your turn' }); return; }
        const now = Date.now();
        if (now - ws.lastHit < MIN_HIT_GAP) return;
        ws.lastHit = now;
        doHit(rid, pid);
        break;
      }
      default:
        send(ws, { type: 'error', text: 'Unknown message type' });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    removeFromQueue(ws);
    const [rid, r] = roomOf(ws);
    if (r) {
      const other = r.A === ws ? r.B : r.A;
      if (other) send(other, { type: 'opponent_left' });
      clearTimeout(r.timer);
      delete rooms[rid];
      console.log('Room ended (disconnect):', rid);
    }
  });
  ws.on('error', () => {});
});
