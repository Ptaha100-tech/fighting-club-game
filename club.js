// Клубы (уровни, улучшения, магазин, рейды) + чат, друзья, личные сообщения.
module.exports = function (getDb, touch) {
  const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));
  const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

  // ---------- клуб: уровень, бонусы, улучшения ----------
  const clubLvl = xp => Math.min(20, 1 + Math.floor(Math.sqrt((xp || 0) / 150)));
  const xpNext = lvl => 150 * lvl * lvl;
  const UP = { gym: 'Качалка', spar: 'Спарринг-зал', guard: 'Охрана', till: 'Касса' };
  const upCost = n => Math.round(3000 * Math.pow(n + 1, 1.8) / 100) * 100;
  const UP_MAX = 10;
  function bonus(c) {
    const l = clubLvl(c.xp), u = c.up || {};
    return { hp: +(0.5 * l + 1.5 * (u.gym || 0)).toFixed(1), dmg: Math.floor(0.5 * l) + (u.spar || 0), armor: +(0.3 * l + 0.8 * (u.guard || 0)).toFixed(1), coin: (u.till || 0) * 5 };
  }
  const maxMembers = c => Math.min(30, 15 + clubLvl(c.xp));

  // ---------- клубный магазин (шаблоны; {club} подставляется) ----------
  const SHOP = [
    { id: 'cs_band', slot: 'head', name: 'Кепка «{club}»', icon: '🧣', price: 80, min: 1, st: { crit: 3, dodge: 2 }, vis: { hair: 'cap', hat: 'club' } },
    { id: 'cs_tank', slot: 'body', name: 'Майка «{club}»', icon: '🎽', price: 120, min: 1, st: { dmg: 3, hp: 25 }, vis: { top: 'tank', shirtCol: 'club', club: 1 } },
    { id: 'cs_glove', slot: 'hands', name: 'Перчатки клуба', icon: '🥊', price: 250, min: 3, st: { dmg: 7, crit: 3 }, vis: { hands: 'boxglove' } },
    { id: 'cs_pants', slot: 'legs', name: 'Шорты «{club}»', icon: '🩳', price: 350, min: 5, st: { armor: 4, dodge: 3, hp: 30 }, vis: { pants: 'mma' } },
    { id: 'cs_tat', slot: 'acc', name: 'Тату «{club}»', icon: '🐉', price: 500, min: 8, st: { dmg: 6, armor: 3, hp: 40 }, vis: { prop: 'tattoo' } }
  ];

  // ---------- рейды ----------
  const RAIDS = [
    { id: 0, name: 'Гоп-стоп', rec: 5, min: 1, cc: 25, xp: 60, desc: 'Тёмный переулок, кошелёк или жизнь' },
    { id: 1, name: 'Разборка на районе', rec: 15, min: 3, cc: 55, xp: 150, desc: 'Чужие пацаны на нашей земле' },
    { id: 2, name: 'Бой без правил', rec: 30, min: 6, cc: 100, xp: 320, desc: 'Подвал, толпа, ставки' },
    { id: 3, name: 'Тёмная арена', rec: 50, min: 10, cc: 170, xp: 650, desc: 'Босс подпольной лиги' }
  ];
  const COOLDOWN = 8 * 3600 * 1000, GATHER_MS = 2 * 3600 * 1000, RAID_NEED = 5;
  const raidNeed = (c, members) => Math.max(2, Math.min(RAID_NEED, members));
  function members(c) { return Object.values(getDb().players).filter(p => p.clan === c.id); }
  function raidView(c) {
    const r = c.raid || { st: 'idle' };
    const now = Date.now();
    if (r.st === 'gather' && now > r.until) { c.raid = { st: 'idle', last: r.last }; touch(); return c.raid; }
    return r;
  }
  const rnd = () => Math.random();
  function simulateRaid(c, rd, ids) {
    const db = getDb(), P = ids.map(id => db.players[id]).filter(Boolean);
    const rec = rd.rec, N = P.length;
    const dpr = (15 + 0.8 * rec) * 1.12, expHp = 100 + 16 * (rec - 1);
    let bossHp = Math.round(N * dpr * 11), bossMax = bossHp;
    const bossDmg = expHp * 0.12;
    const team = P.map(p => { const f = p.prof || { lvl: 1, hp: 100, dmg: 0, crit: .15, dodge: 0, armor: 0 }; return { id: p.id, name: p.name, f, hp: f.hp, max: f.hp, dealt: 0 }; });
    const log = [];
    for (let round = 1; round <= 30 && bossHp > 0 && team.some(t => t.hp > 0); round++) {
      for (const t of team) {
        if (t.hp <= 0 || bossHp <= 0) continue;
        const crit = rnd() < t.f.crit; let d = (15 + t.f.dmg) * (0.9 + rnd() * 0.2); if (crit) d *= 1.5;
        d = Math.round(d); bossHp -= d; t.dealt += d;
      }
      const alive = team.filter(t => t.hp > 0);
      for (let k = 0; k < Math.min(2, alive.length) && bossHp > 0; k++) {
        const t = alive[Math.floor(rnd() * alive.length)];
        if (t.hp <= 0) continue;
        if (rnd() < t.f.dodge) { continue; }
        const d = Math.round(bossDmg * (0.85 + rnd() * 0.3) * (1 - t.f.armor));
        t.hp = Math.max(0, t.hp - d);
        if (t.hp <= 0) log.push('Раунд ' + round + ': ' + t.name + ' выбыл');
      }
      if (round % 3 === 0 || bossHp <= 0) log.push('Раунд ' + round + ': у босса ' + Math.max(0, Math.round(bossHp / bossMax * 100)) + '% здоровья, на ногах ' + team.filter(t => t.hp > 0).length + '/' + N);
    }
    const win = bossHp <= 0;
    return { win, rounds: log.length, log: log.slice(-8), team: team.map(t => ({ name: t.name, dealt: t.dealt, alive: t.hp > 0 })).sort((a, b) => b.dealt - a.dealt), t: Date.now(), raid: rd.id };
  }
  function resolveRaid(c) {
    const r = c.raid, rd = RAIDS[r.type], ids = r.ready.filter(id => getDb().players[id] && getDb().players[id].clan === c.id);
    const res = simulateRaid(c, rd, ids);
    const till = 1 + (bonus(c).coin) / 100;
    for (const id of ids) {
      const p = getDb().players[id];
      p.cc = (p.cc || 0) + Math.round((res.win ? rd.cc : rd.cc * 0.25) * till);
    }
    c.xp = (c.xp || 0) + (res.win ? rd.xp : Math.round(rd.xp * 0.2)) + ids.length * 5;
    c.raid = { st: 'cooldown', until: Date.now() + COOLDOWN, last: res, type: r.type };
    c.raidStats = c.raidStats || { win: 0, lose: 0 }; res.win ? c.raidStats.win++ : c.raidStats.lose++;
    touch(); return res;
  }

  // ---------- публичный вид клуба для клиента ----------
  function extra(c, me) {
    const l = clubLvl(c.xp), r = raidView(c), now = Date.now();
    const mem = members(c);
    const need = raidNeed(c, mem.length);
    const raid = { st: r.st === 'cooldown' && now > r.until ? 'idle' : r.st, need, type: r.type, ready: r.ready || [], until: r.until || 0, last: r.last || null, stats: c.raidStats || { win: 0, lose: 0 } };
    if (raid.st === 'idle' && r.st === 'cooldown') { c.raid = { st: 'idle', last: r.last }; }
    return {
      xp: c.xp || 0, lvl: l, xpNext: xpNext(l), xpPrev: l > 1 ? xpNext(l - 1) : 0, bank: c.bank || 0, up: { gym: 0, spar: 0, guard: 0, till: 0, ...(c.up || {}) },
      upCost: Object.fromEntries(Object.keys(UP).map(k => [k, ((c.up || {})[k] || 0) >= UP_MAX ? 0 : upCost((c.up || {})[k] || 0)])),
      bonus: bonus(c), cap: maxMembers(c), raid, raids: RAIDS.map(x => ({ ...x, open: l >= x.min })), me: me ? { cc: me.cc || 0, owner: c.owner === me.id } : null,
      shop: SHOP.map(s => ({ ...s, name: s.name.replace('{club}', c.name.slice(0, 10)), open: l >= s.min, owned: !!(me && me.cinv && me.cinv[s.id] === c.id) }))
    };
  }

  // ---------- друзья / чат ----------
  const rings = () => { const db = getDb(); db.chat = db.chat || { global: [], clubs: {} }; db.dms = db.dms || {}; return db; };
  const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const lastSend = {};
  function spam(me) { const n = Date.now(); if (n - (lastSend[me.id] || 0) < 900) return true; lastSend[me.id] = n; return false; }
  let msgId = Date.now();
  function push(arr, m) { arr.push(m); if (arr.length > 80) arr.splice(0, arr.length - 80); }
  const online = p => Date.now() - (p.seen || 0) < 3 * 60 * 1000;
  function friendsView(me) {
    const db = getDb();
    me.friends = me.friends || []; me.reqIn = me.reqIn || []; me.unread = me.unread || {};
    return {
      friends: me.friends.map(id => db.players[id]).filter(Boolean).map(p => ({ id: p.id, name: p.name, level: p.level, rating: p.rating, online: online(p), unread: me.unread[p.id] || 0 })),
      requests: me.reqIn.map(id => db.players[id]).filter(Boolean).map(p => ({ id: p.id, name: p.name, level: p.level })),
      unread: Object.values(me.unread).reduce((a, b) => a + b, 0)
    };
  }
  function findPlayer(q) {
    const db = getDb(); q = String(q || '').trim(); if (!q) return null;
    if (db.players[q]) return db.players[q];
    const low = q.toLowerCase(); return Object.values(db.players).find(p => p.name.toLowerCase() === low) || null;
  }

  // возвращает { error } | { board:true, extra? } | { data } | null (не мой маршрут)
  function route(name, me, body) {
    const db = getDb(), c = me.clan ? db.clans[me.clan] : null;
    switch (name) {
      case 'club/donate': {
        if (!c) return { error: 'Ты не в клубе' };
        const a = num(body.amount, 1, 200000); c.bank = (c.bank || 0) + a; me.don = (me.don || 0) + a; touch(); return { board: true };
      }
      case 'club/upgrade': {
        if (!c) return { error: 'Ты не в клубе' };
        if (c.owner !== me.id) return { error: 'Улучшать может только глава клуба' };
        const k = String(body.k); if (!UP[k]) return { error: 'Нет такого улучшения' };
        c.up = c.up || {}; const n = c.up[k] || 0; if (n >= UP_MAX) return { error: 'Максимальный уровень' };
        const cost = upCost(n); if ((c.bank || 0) < cost) return { error: 'В казне не хватает ' + (cost - (c.bank || 0)) };
        c.bank -= cost; c.up[k] = n + 1; touch(); return { board: true };
      }
      case 'club/shop': {
        if (!c) return { error: 'Ты не в клубе' };
        const it = SHOP.find(s => s.id === body.id); if (!it) return { error: 'Нет такого товара' };
        if (clubLvl(c.xp) < it.min) return { error: 'Нужен уровень клуба ' + it.min };
        me.cinv = me.cinv || {}; if (me.cinv[it.id] === c.id) return { error: 'Уже куплено' };
        if ((me.cc || 0) < it.price) return { error: 'Не хватает клубных монет' };
        me.cc -= it.price; me.cinv[it.id] = c.id; touch(); return { board: true };
      }
      case 'raid/open': {
        if (!c) return { error: 'Ты не в клубе' };
        const rd = RAIDS[num(body.type, 0, RAIDS.length - 1)], r = raidView(c);
        if (clubLvl(c.xp) < rd.min) return { error: 'Нужен уровень клуба ' + rd.min };
        if (r.st === 'gather') return { error: 'Сбор уже идёт' };
        if (r.st === 'cooldown' && Date.now() < r.until) return { error: 'Клуб отдыхает после прошлого дела' };
        c.raid = { st: 'gather', type: rd.id, ready: [me.id], until: Date.now() + GATHER_MS, last: r.last }; touch(); return { board: true };
      }
      case 'raid/ready': {
        if (!c) return { error: 'Ты не в клубе' };
        const r = raidView(c); if (r.st !== 'gather') return { error: 'Сбор не объявлен' };
        const i = r.ready.indexOf(me.id); if (i >= 0) r.ready.splice(i, 1); else r.ready.push(me.id);
        const need = raidNeed(c, members(c).length);
        if (r.ready.length >= need) { const res = resolveRaid(c); return { board: true, result: res }; }
        touch(); return { board: true };
      }
      case 'raid/start': {   // глава может начать раньше, если собрались хотя бы двое
        if (!c || c.owner !== me.id) return { error: 'Только глава клуба' };
        const r = raidView(c); if (r.st !== 'gather') return { error: 'Сбор не объявлен' };
        if (r.ready.length < 2) return { error: 'Нужно минимум двое готовых' };
        return { board: true, result: resolveRaid(c) };
      }
      case 'friend/list': return { data: friendsView(me) };
      case 'friend/add': {
        const t = findPlayer(body.q);
        if (!t) return { error: 'Игрок не найден' }; if (t.id === me.id) return { error: 'Это ты' };
        me.friends = me.friends || []; t.reqIn = t.reqIn || []; me.reqIn = me.reqIn || [];
        if (me.friends.includes(t.id)) return { error: 'Уже в друзьях' };
        if (me.reqIn.includes(t.id)) { me.reqIn = me.reqIn.filter(x => x !== t.id); me.friends.push(t.id); t.friends = t.friends || []; t.friends.push(me.id); touch(); return { data: { ...friendsView(me), note: 'Вы теперь друзья!' } }; }
        if (!t.reqIn.includes(me.id)) t.reqIn.push(me.id);
        touch(); return { data: { ...friendsView(me), note: 'Заявка отправлена: ' + t.name } };
      }
      case 'friend/accept': {
        const t = db.players[body.id]; me.reqIn = me.reqIn || [];
        if (!t || !me.reqIn.includes(t.id)) return { error: 'Нет такой заявки' };
        me.reqIn = me.reqIn.filter(x => x !== t.id); me.friends = me.friends || []; t.friends = t.friends || [];
        if (!me.friends.includes(t.id)) me.friends.push(t.id); if (!t.friends.includes(me.id)) t.friends.push(me.id);
        touch(); return { data: friendsView(me) };
      }
      case 'friend/decline': { me.reqIn = (me.reqIn || []).filter(x => x !== body.id); touch(); return { data: friendsView(me) }; }
      case 'friend/remove': {
        const t = db.players[body.id]; me.friends = (me.friends || []).filter(x => x !== body.id); if (t) t.friends = (t.friends || []).filter(x => x !== me.id);
        touch(); return { data: friendsView(me) };
      }
      case 'chat/send': {
        const text = clean(body.text, 200); if (!text) return { error: 'Пусто' };
        if ((me.mute || 0) > Date.now()) return { error: 'Тебе запрещено писать в чат' };
        if (spam(me)) return { error: 'Не так быстро' };
        const R = rings(), m = { id: ++msgId, from: me.id, name: me.name, lvl: me.level, text, t: Date.now() };
        if (body.room === 'club') { if (!c) return { error: 'Ты не в клубе' }; push(R.chat.clubs[c.id] = R.chat.clubs[c.id] || [], m); }
        else push(R.chat.global, m);
        touch(); return { data: { ok: true } };
      }
      case 'chat/get': {
        const R = rings(), after = Number(body.after) || 0;
        const arr = body.room === 'club' ? (c ? (R.chat.clubs[c.id] || []) : []) : R.chat.global;
        return { data: { msgs: arr.filter(m => m.id > after).slice(-60), me: me.id } };
      }
      case 'dm/send': {
        const t = db.players[body.to]; if (!t) return { error: 'Игрок не найден' };
        if (!(me.friends || []).includes(t.id)) return { error: 'Писать можно только друзьям' };
        const text = clean(body.text, 300); if (!text) return { error: 'Пусто' };
        if ((me.mute || 0) > Date.now()) return { error: 'Тебе запрещено писать в чат' }; if (spam(me)) return { error: 'Не так быстро' };
        const R = rings(), k = key(me.id, t.id), m = { id: ++msgId, from: me.id, name: me.name, text, t: Date.now() };
        push(R.dms[k] = R.dms[k] || [], m); t.unread = t.unread || {}; t.unread[me.id] = (t.unread[me.id] || 0) + 1; touch(); return { data: { ok: true } };
      }
      case 'dm/get': {
        const t = db.players[body.with]; if (!t) return { error: 'Игрок не найден' };
        const R = rings(), after = Number(body.after) || 0, arr = R.dms[key(me.id, t.id)] || [];
        me.unread = me.unread || {}; if (me.unread[t.id]) { delete me.unread[t.id]; touch(); }
        return { data: { msgs: arr.filter(m => m.id > after).slice(-60), me: me.id, with: { id: t.id, name: t.name, online: online(t) } } };
      }
    }
    return null;
  }
  return { route, extra, clubLvl, bonus, maxMembers, friendsView, SHOP, RAIDS };
};
