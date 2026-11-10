// Таблица лидеров, кланы и клановые войны. Хранение: JSON-файл (DATA_DIR или рядом с сервером).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FILE = path.join(process.env.DATA_DIR || __dirname, 'social-data.json');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const MAX_MEMBERS = 20;
let db = { players: {}, clans: {}, nextClan: 1, lastWar: null };
try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch (e) {}
let dirty = false;
setInterval(() => { if (!dirty) return; dirty = false; try { fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('save fail', e.message); } }, 5000);

function weekKey(d = new Date()) {       // понедельник текущей недели (UTC)
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}
function rollWeek() {
  const wk = weekKey();
  if (db.war && db.war.week === wk) return;
  if (db.war) {            // закрываем прошлую неделю: топ-3 кланов получат награду
    const top = Object.values(db.clans).filter(c => c.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 3).map(c => ({ id: c.id, name: c.name, pts: c.pts }));
    db.lastWar = { week: db.war.week, top };
    for (const c of Object.values(db.clans)) { c.pts = 0; }
    for (const p of Object.values(db.players)) { p.wpts = 0; }
  }
  db.war = { week: wk }; dirty = true;
}
rollWeek(); setInterval(rollWeek, 60000);

function verify(initData) {
  if (!BOT_TOKEN) return true;
  try {
    const p = new URLSearchParams(initData), hash = p.get('hash'); p.delete('hash');
    const str = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
    const key = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    return crypto.createHmac('sha256', key).update(str).digest('hex') === hash;
  } catch (e) { return false; }
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&"'`]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));
const rate = {};
function limited(id) { const n = Date.now(), r = rate[id] || (rate[id] = []); while (r.length && n - r[0] > 10000) r.shift(); r.push(n); return r.length > 20; }

function clanView(c, full) {
  const members = Object.values(db.players).filter(p => p.clan === c.id);
  const v = { id: c.id, name: c.name, pts: c.pts || 0, count: members.length, max: MAX_MEMBERS, rating: members.reduce((a, p) => a + p.rating, 0) };
  if (full) v.members = members.sort((a, b) => (b.wpts || 0) - (a.wpts || 0)).map(p => ({ id: p.id, name: p.name, level: p.level, rating: p.rating, wpts: p.wpts || 0, owner: c.owner === p.id }));
  return v;
}
function board(me) {
  const all = Object.values(db.players).sort((a, b) => b.rating - a.rating);
  const clans = Object.values(db.clans).map(c => clanView(c)).sort((a, b) => b.pts - a.pts || b.rating - a.rating).slice(0, 30);
  const rank = me ? all.findIndex(p => p.id === me.id) + 1 : 0;
  const mine = me && me.clan && db.clans[me.clan] ? clanView(db.clans[me.clan], true) : null;
  let reward = null;
  if (me && db.lastWar && me.clan && me.claimed !== db.lastWar.week) {
    const i = db.lastWar.top.findIndex(t => t.id === me.clan);
    if (i >= 0) reward = { place: i + 1, money: [1500, 900, 500][i], sp: [3, 2, 1][i] };
  }
  return { players: all.slice(0, 50).map((p, i) => ({ place: i + 1, id: p.id, name: p.name, level: p.level, rating: p.rating, seed: p.seed, clan: p.clan && db.clans[p.clan] ? db.clans[p.clan].name : '' })),
    total: all.length, rank, clans, mine, war: { week: db.war.week, last: db.lastWar }, reward };
}

function handle(req, res, url, body) {
  const out = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  const id = clean(req.headers['x-uid'], 40);
  if (!id || id.length < 3) return out(400, { error: 'no id' });
  if (!verify(req.headers['x-init'] || '')) return out(401, { error: 'bad init data' });
  if (limited(id)) return out(429, { error: 'slow down' });
  rollWeek();
  const route = url.replace('/api/', '');
  let me = db.players[id];
  if (route === 'sync') {
    if (!me) me = db.players[id] = { id, name: 'Боец', level: 1, rating: 1000, seed: 1, wins: 0, wpts: 0, clan: 0 };
    me.name = clean(body.name, 16) || me.name; me.level = num(body.level, 1, 200); me.rating = num(body.rating, 0, 9000); me.seed = num(body.seed, 1, 2e9) || me.seed; me.wins = num(body.wins, 0, 1e6);
    const d = num(body.warDelta, 0, 60);
    if (d && me.clan && db.clans[me.clan]) { me.wpts = (me.wpts || 0) + d; db.clans[me.clan].pts = (db.clans[me.clan].pts || 0) + d; }
    dirty = true; return out(200, board(me));
  }
  if (!me) return out(400, { error: 'sync first' });
  if (route === 'board') return out(200, board(me));
  if (route === 'clan/create') {
    if (me.clan) return out(400, { error: 'Сначала выйди из клана' });
    const name = clean(body.name, 18);
    if (name.length < 3) return out(400, { error: 'Название от 3 символов' });
    if (Object.values(db.clans).some(c => c.name.toLowerCase() === name.toLowerCase())) return out(400, { error: 'Такое название занято' });
    const c = db.clans[db.nextClan] = { id: db.nextClan++, name, owner: id, pts: 0 }; me.clan = c.id; dirty = true; return out(200, board(me));
  }
  if (route === 'clan/join') {
    const c = db.clans[num(body.id, 1, 1e9)];
    if (!c) return out(400, { error: 'Клан не найден' });
    if (me.clan) return out(400, { error: 'Сначала выйди из клана' });
    if (clanView(c).count >= MAX_MEMBERS) return out(400, { error: 'Клан полон' });
    me.clan = c.id; me.wpts = 0; dirty = true; return out(200, board(me));
  }
  if (route === 'clan/leave') {
    const c = db.clans[me.clan];
    me.clan = 0; me.wpts = 0;
    if (c) { const rest = Object.values(db.players).filter(p => p.clan === c.id); if (!rest.length) delete db.clans[c.id]; else if (c.owner === id) c.owner = rest[0].id; }
    dirty = true; return out(200, board(me));
  }
  if (route === 'war/claim') {
    const b = board(me);
    if (!b.reward) return out(400, { error: 'Нет награды' });
    me.claimed = db.lastWar.week; dirty = true; return out(200, { reward: b.reward });
  }
  out(404, { error: 'unknown' });
}

function middleware(req, res) {
  const url = (req.url || '').split('?')[0];
  if (!url.startsWith('/api/')) return false;
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'content-type,x-uid,x-init');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return true; }
  let raw = '';
  req.on('data', d => { raw += d; if (raw.length > 4096) req.destroy(); });
  req.on('end', () => { let b = {}; try { b = JSON.parse(raw || '{}'); } catch (e) {} try { handle(req, res, url, b); } catch (e) { console.error(e); res.writeHead(500); res.end('{}'); } });
  return true;
}
module.exports = { middleware, _db: () => db };
