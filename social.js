// Таблица лидеров, кланы и клановые войны. Хранение: JSON-файл (DATA_DIR или рядом с сервером).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FILE = path.join(process.env.DATA_DIR || __dirname, 'social-data.json');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const MAX_MEMBERS = 20;
let CL = null, PAY = null, ADM = null;
let db = { players: {}, clans: {}, nextClan: 1, lastWar: null };
// Хранилище: Supabase (SUPABASE_URL + SUPABASE_KEY) -> иначе JSON-файл. Одна строка game_state(id=1,data jsonb).
function normUrl(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { return new URL(u).origin; } catch (e) { return ''; } }
const SB_URL = normUrl(process.env.SUPABASE_URL), SB_KEY = (process.env.SUPABASE_KEY || '').trim();
const useSB = !!(SB_URL && SB_KEY);
const sbHeaders = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
let dirty = false, loaded = false;
const readyP = (async () => {
  try {
    if (useSB) {
      const r = await fetch(SB_URL + '/rest/v1/game_state?id=eq.1&select=data', { headers: sbHeaders });
      if (!r.ok) throw new Error('supabase load ' + r.status + ' ' + (await r.text()).slice(0, 120));
      const rows = await r.json();
      if (rows[0] && rows[0].data) db = { ...db, ...rows[0].data };
      console.log('Storage: Supabase, players:', Object.keys(db.players).length);
    } else {
      db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
      console.log('Storage: file');
    }
  } catch (e) { console.log('Storage init:', e.message); if (useSB) { loaded = false; return; } }
  loaded = true;
})();
if (useSB) setInterval(async () => { if (loaded) return; try { const r = await fetch(SB_URL + '/rest/v1/game_state?id=eq.1&select=data', { headers: sbHeaders }); if (!r.ok) return; const rows = await r.json(); const d = rows[0] && rows[0].data; if (d) db = { ...db, ...d, players: { ...d.players, ...db.players }, clans: { ...d.clans, ...db.clans } }; loaded = true; dirty = true; console.log('Storage: Supabase connected (late)'); } catch (e) {} }, 20000);
async function persist() {
  if (!loaded) return;     // не затираем базу, пока не прочитали её
  if (useSB) {
    const r = await fetch(SB_URL + '/rest/v1/game_state', { method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: 1, data: db, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error('supabase save ' + r.status + ' ' + (await r.text()).slice(0, 120));
  } else fs.writeFileSync(FILE, JSON.stringify(db));
}
setInterval(async () => { if (!dirty) return; dirty = false; try { await persist(); } catch (e) { dirty = true; console.error('save fail', e.message); } }, 5000);

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
CL = require('./club')(() => db, () => { dirty = true; });
PAY = require('./pay')(() => db, () => { dirty = true; });
readyP.then(() => PAY.setup());
ADM = require('./admin')(() => db, () => { dirty = true; }, m => { db.chat = db.chat || { global: [], clubs: {} }; m.id = Date.now() * 1000 + Math.floor(Math.random() * 1000); m.t = Date.now(); db.chat.global.push(m); if (db.chat.global.length > 80) db.chat.global.shift(); });

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
function limited(id) { const n = Date.now(), r = rate[id] || (rate[id] = []); while (r.length && n - r[0] > 10000) r.shift(); r.push(n); return r.length > 40; }

function clanView(c, full) {
  const members = Object.values(db.players).filter(p => p.clan === c.id);
  const v = { id: c.id, name: c.name, pts: c.pts || 0, count: members.length, max: CL.maxMembers(c), rating: members.reduce((a, p) => a + p.rating, 0) };
  if (full) Object.assign(v, CL.extra(c, null));
  if (full) v.members = members.sort((a, b) => (b.wpts || 0) - (a.wpts || 0)).map(p => ({ id: p.id, name: p.name, level: p.level, rating: p.rating, wpts: p.wpts || 0, owner: c.owner === p.id }));
  return v;
}
function board(me) {
  const all = Object.values(db.players).sort((a, b) => b.rating - a.rating);
  const clans = Object.values(db.clans).map(c => clanView(c)).sort((a, b) => b.pts - a.pts || b.rating - a.rating).slice(0, 30);
  const rank = me ? all.findIndex(p => p.id === me.id) + 1 : 0;
  const mine = me && me.clan && db.clans[me.clan] ? clanView(db.clans[me.clan], true) : null;
  if (mine) { const x = CL.extra(db.clans[me.clan], me); mine.me = x.me; mine.shop = x.shop; mine.raid = x.raid; mine.donated = me.don || 0; mine.members.forEach(m => { m.don = (db.players[m.id] || {}).don || 0; }); }
  const unread = me ? Object.values(me.unread || {}).reduce((a, b) => a + b, 0) : 0;
  let reward = null;
  if (me && db.lastWar && me.clan && me.claimed !== db.lastWar.week) {
    const i = db.lastWar.top.findIndex(t => t.id === me.clan);
    if (i >= 0) reward = { place: i + 1, money: [1500, 900, 500][i], sp: [3, 2, 1][i] };
  }
  return { players: all.slice(0, 50).map((p, i) => ({ place: i + 1, id: p.id, name: p.name, level: p.level, rating: p.rating, seed: p.seed, clan: p.clan && db.clans[p.clan] ? db.clans[p.clan].name : '', fr: !!(me && (me.friends || []).includes(p.id)) })),
    today: new Date().toISOString().slice(0, 10), login: me ? { last: (me.login || {}).last || '', streak: (me.login || {}).streak || 0, days: (me.login || {}).days || 0 } : null,
    total: all.length, rank, clans, mine, war: { week: db.war.week, last: db.lastWar }, reward,
    me: me ? { mail: me.mail || null, w: PAY.wallet(me), cc: me.cc || 0, cinv: me.cinv || {}, unread, reqs: (me.reqIn || []).length } : null };
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
    if (body.save && typeof body.save === 'object') { const j = JSON.stringify(body.save); if (j.length < 12000) { me.save = j; me.saveTs = Date.now(); } }
    me.seen = Date.now(); if (body.prof && typeof body.prof === 'object') { const q = body.prof, L = num(q.lvl, 1, 200); me.prof = { lvl: L, hp: num(q.hp, 50, 150 + 60 * L), dmg: num(q.dmg, 0, 10 + 2 * L), crit: Math.min(.6, Math.max(0, +q.crit || 0)), dodge: Math.min(.5, Math.max(0, +q.dodge || 0)), armor: Math.min(.6, Math.max(0, +q.armor || 0)) }; }
    me.name = clean(body.name, 16) || me.name; me.level = num(body.level, 1, 200); me.rating = num(body.rating, 0, 9000); me.seed = num(body.seed, 1, 2e9) || me.seed; me.wins = num(body.wins, 0, 1e6);
    const d = num(body.warDelta, 0, 60);
    if (d && me.clan && db.clans[me.clan]) { me.wpts = (me.wpts || 0) + d; db.clans[me.clan].pts = (db.clans[me.clan].pts || 0) + d; }
    dirty = true; return out(200, board(me));
  }
  if (route === 'load' && !me) return out(200, { save: null, ts: 0 });
  if (!me) return out(400, { error: 'sync first' });
  me.seen = Date.now();
  if (me.ban) return out(403, { error: 'Аккаунт заблокирован' });
  const isAdm = ADM.isAdminReq(req.headers['x-init'] || '') && id === 'tg' + ADM.ADMIN_TG;
  if (route.startsWith('admin/')) { if (!isAdm) return out(403, { error: 'Нет доступа' }); const r = ADM.route(route, body); if (!r) return out(404, { error: 'unknown' }); return r.error ? out(400, { error: r.error }) : out(200, r.data); }
  if (route === 'mail/claim') { const m = me.mail; me.mail = null; dirty = true; return out(200, { mail: m || null }); }
  if (route === 'ping') return out(200, { adm: isAdm });
  const pr = PAY.route(route, me, body);
  if (pr) { if (pr.error) return out(400, { error: pr.error }); if (pr.async) { pr.async.then(d => out(200, d), e => out(400, { error: 'Не удалось создать счёт' })); return; } return out(200, pr.data); }
  const cr = CL.route(route, me, body);
  if (cr) { if (cr.error) return out(400, { error: cr.error }); if (cr.board) return out(200, Object.assign(board(me), cr.result ? { result: cr.result } : {})); return out(200, cr.data); }
  if (route === 'board') return out(200, board(me));
  if (route === 'load') return out(200, { save: me.save ? JSON.parse(me.save) : null, ts: me.saveTs || 0 });
  if (route === 'login/claim') {
    const today = new Date().toISOString().slice(0, 10), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const l = me.login || (me.login = { last: '', streak: 0, days: 0 });
    if (l.last === today) return out(400, { error: 'Уже получено сегодня' });
    l.streak = l.last === y ? (l.streak >= 7 ? 1 : l.streak + 1) : 1; l.last = today; l.days++;
    dirty = true; return out(200, { day: l.streak, days: l.days, board: board(me) });
  }
  if (route === 'clan/create') {
    if (me.clan) return out(400, { error: 'Сначала выйди из клуба' });
    const name = clean(body.name, 18);
    if (name.length < 3) return out(400, { error: 'Название от 3 символов' });
    if (Object.values(db.clans).some(c => c.name.toLowerCase() === name.toLowerCase())) return out(400, { error: 'Такое название занято' });
    const c = db.clans[db.nextClan] = { id: db.nextClan++, name, owner: id, pts: 0 }; me.clan = c.id; dirty = true; return out(200, board(me));
  }
  if (route === 'clan/join') {
    const c = db.clans[num(body.id, 1, 1e9)];
    if (!c) return out(400, { error: 'Клуб не найден' });
    if (me.clan) return out(400, { error: 'Сначала выйди из клуба' });
    if (clanView(c).count >= MAX_MEMBERS) return out(400, { error: 'Клуб полон' });
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
  req.on('data', d => { raw += d; if (raw.length > 20000) req.destroy(); });
  req.on('end', () => { let b = {}; try { b = JSON.parse(raw || '{}'); } catch (e) {} readyP.then(() => { try { handle(req, res, url, b); } catch (e) { console.error(e); res.writeHead(500); res.end('{}'); } }); });
  return true;
}
module.exports = { webhook: (q, r) => PAY.webhook(q, r), middleware, _db: () => db };
