const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const TURN_MS = 30000;     // время на ход, потом техническое поражение
const MIN_HIT_GAP = 350;   // антиспам ударов, мс

// Раздаём игру с этого же сервера: тогда адрес WebSocket определяется сам.
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/fight-visual.js': 'fight-visual.js' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
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
const rooms = {};        // roomId -> { A: ws, B: ws, hp: {A,B}, turn: 'A'|'B' }
let roomCounter = 0;

// ── Helpers ──
function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function calcDamage() {
  const base = 15;
  const isCrit = Math.random() < 0.20;
  const dmg = isCrit ? Math.round(base * 1.5) : base;
  return { dmg, isCrit };
}

function armTurnTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    const r = rooms[roomId];
    if (!r) return;
    const loser = r.turn, winner = loser === 'A' ? 'B' : 'A';
    send(r.A, { type: 'end', winner, playerId: 'A', reason: 'timeout' });
    send(r.B, { type: 'end', winner, playerId: 'B', reason: 'timeout' });
    delete rooms[roomId];
  }, TURN_MS);
}

function endRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  // Notify remaining player
  if (room.A) send(room.A, { type: 'opponent_left' });
  if (room.B) send(room.B, { type: 'opponent_left' });
  delete rooms[roomId];
}

function removeFromQueue(ws) {
  const idx = queue.indexOf(ws);
  if (idx !== -1) queue.splice(idx, 1);
}

function getPlayerId(room, ws) {
  if (room.A === ws) return 'A';
  if (room.B === ws) return 'B';
  return null;
}

function getOpponentId(room, ws) {
  if (room.A === ws) return 'B';
  if (room.B === ws) return 'A';
  return null;
}

// ── Connection handler ──
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.lastHit = 0;
  console.log('Client connected, total:', wss.clients.size);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'find_match': {
        // Already in queue or in a room?
        if (queue.includes(ws)) {
          send(ws, { type: 'searching' });
          return;
        }
        for (const rid in rooms) {
          const r = rooms[rid];
          if (r.A === ws || r.B === ws) {
            send(ws, { type: 'error', text: 'You are already in a match' });
            return;
          }
        }

        ws.pname = String(msg.name || 'Боец').replace(/[<>&"']/g, '').slice(0, 20) || 'Боец';
        ws.seed = Number.isInteger(msg.seed) ? Math.abs(msg.seed) % 2000000000 : Math.floor(Math.random() * 2e9);
        queue.push(ws);
        send(ws, { type: 'searching' });

        // If we have 2 players, match them
        if (queue.length >= 2) {
          const p1 = queue.shift();
          const p2 = queue.shift();

          roomCounter++;
          const roomId = 'room_' + roomCounter;
          rooms[roomId] = {
            A: p1, B: p2,
            hp: { A: 100, B: 100 },
            turn: 'A',
            timer: null
          };
          armTurnTimer(roomId);

          const readyMsg = { type: 'ready', hp: { A: 100, B: 100 }, turn: 'A' };
          send(p1, { ...readyMsg, playerId: 'A', opponentName: p2.pname, opponentSeed: p2.seed });
          send(p2, { ...readyMsg, playerId: 'B', opponentName: p1.pname, opponentSeed: p1.seed });
          console.log('Match started:', roomId);
        }
        break;
      }

      case 'cancel_search': {
        removeFromQueue(ws);
        send(ws, { type: 'search_cancelled' });
        break;
      }

      case 'hit': {
        // Find which room this player is in
        let foundRoom = null;
        let foundRoomId = null;
        for (const rid in rooms) {
          const r = rooms[rid];
          if (r.A === ws || r.B === ws) {
            foundRoom = r;
            foundRoomId = rid;
            break;
          }
        }
        if (!foundRoom) {
          send(ws, { type: 'error', text: 'You are not in a match' });
          return;
        }

        const playerId = getPlayerId(foundRoom, ws);
        if (!playerId) return;

        // Check turn
        if (foundRoom.turn !== playerId) {
          send(ws, { type: 'error', text: 'Not your turn' });
          return;
        }

        // Антиспам: часы клиента не используем, у телефонов они часто врут
        const now = Date.now();
        if (now - ws.lastHit < MIN_HIT_GAP) return;
        ws.lastHit = now;

        // Calculate damage server-side (ignore client values)
        const { dmg, isCrit } = calcDamage();
        const opponentId = getOpponentId(foundRoom, ws);
        const oldHp = foundRoom.hp[opponentId];
        foundRoom.hp[opponentId] = Math.max(0, oldHp - dmg);
        const newHp = foundRoom.hp[opponentId];

        // Switch turn
        foundRoom.turn = opponentId;
        armTurnTimer(foundRoomId);

        // Notify both players
        const updateA = {
          type: 'update',
          hp: { ...foundRoom.hp },
          turn: foundRoom.turn,
          dmg,
          isCrit,
          target: opponentId,
          attacker: playerId
        };
        const updateB = { ...updateA };
        send(foundRoom.A, updateA);
        send(foundRoom.B, updateB);

        // Check for KO
        if (newHp <= 0) {
          const winner = playerId;
          const loser = opponentId;
          send(foundRoom.A, { type: 'end', winner, playerId: 'A' });
          send(foundRoom.B, { type: 'end', winner, playerId: 'B' });
          console.log('Match ended:', foundRoomId, 'winner:', winner);
          clearTimeout(foundRoom.timer);
          delete rooms[foundRoomId];
        }
        break;
      }

      default:
        send(ws, { type: 'error', text: 'Unknown message type' });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');

    // Remove from queue
    removeFromQueue(ws);

    // Find and end any room this player was in
    for (const rid in rooms) {
      const r = rooms[rid];
      if (r.A === ws || r.B === ws) {
        const other = r.A === ws ? r.B : r.A;
        if (other) {
          send(other, { type: 'opponent_left' });
        }
        clearTimeout(r.timer);
        delete rooms[rid];
        console.log('Room ended (disconnect):', rid);
        break;
      }
    }
  });

  ws.on('error', () => {});
});

console.log('WebSocket server ready');