const WebSocket = require('ws');
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Server is running');
    return;
  }
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not Found');
});
const wss = new WebSocket.Server({ server });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

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

function endRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
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
  console.log('Client connected, total:', wss.clients().length);

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
            turn: 'A'
          };

          const readyMsg = { type: 'ready', hp: { A: 100, B: 100 }, turn: 'A' };
          send(p1, { ...readyMsg, playerId: 'A', opponentName: 'Соперник' });
          send(p2, { ...readyMsg, playerId: 'B', opponentName: 'Соперник' });
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

        // Validate timestamp (anti-cheat)
        const now = Date.now();
        const ts = typeof msg.timestamp === 'number' ? msg.timestamp : 0;
        if (now - ts > 2000 || ts > now) {
          send(ws, { type: 'error', text: 'Invalid timestamp' });
          return;
        }

        // Calculate damage server-side (ignore client values)
        const { dmg, isCrit } = calcDamage();
        const opponentId = getOpponentId(foundRoom, ws);
        const oldHp = foundRoom.hp[opponentId];
        foundRoom.hp[opponentId] = Math.max(0, oldHp - dmg);
        const newHp = foundRoom.hp[opponentId];

        // Switch turn
        foundRoom.turn = opponentId;

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
        delete rooms[rid];
        console.log('Room ended (disconnect):', rid);
        break;
      }
    }
  });

  ws.on('error', () => {});
});

console.log('WebSocket server ready');