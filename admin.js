// Админ-панель. Доступ только для Telegram-аккаунта ADMIN_TG (по умолчанию владелец) и только с проверенной подписью initData.
const crypto = require('crypto');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_TG = String(process.env.ADMIN_TG || '1037822727');
const DAY = 864e5;

module.exports = function (getDb, touch, chatPush) {
  // true только если подпись initData верна, она свежая, и user.id == ADMIN_TG
  function isAdminReq(initData) {
    if (!BOT_TOKEN || !initData) return false;
    try {
      const p = new URLSearchParams(initData), hash = p.get('hash'); p.delete('hash');
      const str = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
      const key = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const good = crypto.createHmac('sha256', key).update(str).digest('hex');
      if (!hash || good.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(hash))) return false;
      if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 86400 * 2) return false;
      return String((JSON.parse(p.get('user') || '{}')).id) === ADMIN_TG;
    } catch (e) { return false; }
  }
  const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));
  function find(q) {
    const db = getDb(); q = String(q || '').trim(); if (!q) return null;
    if (db.players[q]) return db.players[q];
    if (db.players['tg' + q]) return db.players['tg' + q];
    const low = q.toLowerCase(); return Object.values(db.players).find(p => p.name.toLowerCase() === low) || Object.values(db.players).find(p => p.name.toLowerCase().includes(low)) || null;
  }
  const view = p => ({ id: p.id, name: p.name, level: p.level, rating: p.rating, wins: p.wins || 0, clan: p.clan || 0, gems: p.gems || 0, cc: p.cc || 0, vip: (p.vip || 0) > Date.now() ? p.vip : 0, ban: !!p.ban, mute: (p.mute || 0) > Date.now() ? p.mute : 0, mail: p.mail || null, seen: p.seen || 0 });

  function route(name, body) {
    const db = getDb(), now = Date.now(), all = Object.values(db.players);
    switch (name) {
      case 'admin/stats': {
        const pay = Object.values(db.payments || {}), day = pay.filter(x => now - x.t < DAY);
        return { data: {
          players: all.length, online: all.filter(p => now - (p.seen || 0) < 5 * 60e3).length, day: all.filter(p => now - (p.seen || 0) < DAY).length,
          clans: Object.keys(db.clans).length, vip: all.filter(p => (p.vip || 0) > now).length, banned: all.filter(p => p.ban).length,
          payments: pay.length, stars: pay.reduce((a, x) => a + x.stars, 0), starsDay: day.reduce((a, x) => a + x.stars, 0),
          last: pay.sort((a, b) => b.t - a.t).slice(0, 8).map(x => ({ uid: x.uid, sku: x.sku, stars: x.stars, t: x.t })) } };
      }
      case 'admin/find': {
        const q = String(body.q || '').trim().toLowerCase();
        const list = q ? all.filter(p => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q)).slice(0, 15) : all.sort((a, b) => (b.seen || 0) - (a.seen || 0)).slice(0, 15);
        return { data: { list: list.map(view) } };
      }
      case 'admin/grant': {
        const p = find(body.id); if (!p) return { error: 'Игрок не найден' };
        const g = n(body.gems, -100000, 100000), cc = n(body.cc, -100000, 100000), vd = n(body.vipDays, 0, 365);
        const m = n(body.money, 0, 1e7), xp = n(body.xp, 0, 1e6), sp = n(body.sp, 0, 1000);
        if (g) p.gems = Math.max(0, (p.gems || 0) + g);
        if (cc) p.cc = Math.max(0, (p.cc || 0) + cc);
        if (vd) p.vip = Math.max(now, p.vip || 0) + vd * DAY;
        if (m || xp || sp) { p.mail = p.mail || { money: 0, xp: 0, sp: 0 }; p.mail.money += m; p.mail.xp += xp; p.mail.sp += sp; }
        if (body.item) { p.pinv = p.pinv || {}; p.pinv[String(body.item).slice(0, 20)] = 1; }
        console.log('ADMIN grant', p.id, JSON.stringify({ g, cc, vd, m, xp, sp, item: body.item }));
        touch(); return { data: { p: view(p) } };
      }
      case 'admin/ban': { const p = find(body.id); if (!p) return { error: 'Игрок не найден' }; p.ban = !!body.on; touch(); return { data: { p: view(p) } }; }
      case 'admin/mute': { const p = find(body.id); if (!p) return { error: 'Игрок не найден' }; p.mute = body.min ? now + n(body.min, 0, 60 * 24 * 30) * 60e3 : 0; touch(); return { data: { p: view(p) } }; }
      case 'admin/reset': {
        if (body.confirm !== 'СБРОС') return { error: 'Нужно подтверждение' };
        const n0 = all.length;
        db.players = {}; db.clans = {}; db.nextClan = 1; db.chat = { global: [], clubs: {} }; db.dms = {}; db.lastWar = null;
        db.epoch = (db.epoch || 1) + 1; console.log('ADMIN RESET ALL, players wiped:', n0, 'epoch', db.epoch);
        touch(); return { data: { ok: true, wiped: n0, epoch: db.epoch } };
      }
      case 'admin/say': {
        const t = String(body.text || '').replace(/[<>&"'`]/g, '').trim().slice(0, 200); if (!t) return { error: 'Пусто' };
        chatPush({ from: 'sys', name: '📢 Админ', text: t }); touch(); return { data: { ok: true } };
      }
    }
    return null;
  }
  return { isAdminReq, route, ADMIN_TG };
};
