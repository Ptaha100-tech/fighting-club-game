// Донат: Telegram Stars -> кристаллы 💎, VIP, косметика, бусты. Кошелёк только на сервере.
const https = require('https');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';
const SECRET = process.env.WEBHOOK_SECRET || (BOT_TOKEN ? require('crypto').createHash('sha256').update('wh' + BOT_TOKEN).digest('hex').slice(0, 32) : '');
const DAY = 864e5;

const SKU = {
  g1: { title: '30 кристаллов', desc: 'Малый мешок кристаллов 💎', stars: 25, gems: 30 },
  g2: { title: '130 кристаллов', desc: 'Мешок кристаллов 💎 (+8%)', stars: 100, gems: 130 },
  g3: { title: '350 кристаллов', desc: 'Сундук кристаллов 💎 (+12%)', stars: 250, gems: 350 },
  g4: { title: '750 кристаллов', desc: 'Кубышка кристаллов 💎 (+20%)', stars: 500, gems: 750 },
  starter: { title: 'Стартовый набор', desc: '100 💎, кепка «Новичок» и 3 дня VIP. Один раз', stars: 50, gems: 100, vipDays: 3, item: 'pc_cap', once: true },
  vip: { title: 'VIP на 30 дней', desc: '+20% монет и опыта и 5 💎 каждый день', stars: 150, vipDays: 30 }
};
// за кристаллы: косметика (статы как у обычных вещей, не сильнее), буст, энергия
const PITEMS = [
  { id: 'pc_cap', slot: 'head', name: 'Кепка «Новичок»', icon: '🧢', price: 0, st: { crit: 2 }, vis: { hair: 'cap', hat: '#2d7a3a' }, hidden: true },
  { id: 'pc_gold', slot: 'hands', name: 'Золотые бинты', icon: '🥇', price: 120, st: { dmg: 4 }, vis: { hands: 'goldglove' } },
  { id: 'pc_jacket', slot: 'body', name: 'Куртка «Неон»', icon: '🧥', price: 220, st: { hp: 40, armor: 2 }, vis: { top: 'jacket', shirtCol: '#c01c7a' } },
  { id: 'pc_belt', slot: 'acc', name: 'Пояс «Король ринга»', icon: '👑', price: 400, st: { dmg: 5, hp: 40 }, vis: { prop: 'belt' } },
  { id: 'pc_pants', slot: 'legs', name: 'Шорты «Золото»', icon: '🩳', price: 180, st: { dodge: 3, hp: 30 }, vis: { pants: 'mma' } }
];
const BOOST_COST = 40, ENERGY_COST = 15;

function tg(method, body) {
  return new Promise((res, rej) => {
    const d = JSON.stringify(body || {});
    const q = https.request({ host: 'api.telegram.org', path: '/bot' + BOT_TOKEN + '/' + method, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(d) } }, r => {
      let t = ''; r.on('data', c => t += c); r.on('end', () => { try { const j = JSON.parse(t); j.ok ? res(j.result) : rej(new Error(j.description || 'tg error')); } catch (e) { rej(e); } });
    });
    q.on('error', rej); q.setTimeout(10000, () => q.destroy(new Error('timeout'))); q.end(d);
  });
}

module.exports = function (getDb, touch) {
  const vipOn = p => (p.vip || 0) > Date.now();
  function wallet(p) {
    return { gems: p.gems || 0, vip: vipOn(p) ? p.vip : 0, boost: (p.boost || 0) > Date.now() ? p.boost : 0, pinv: p.pinv || {}, starter: !!p.starterBought, pay: !!BOT_TOKEN };
  }
  function dailyVip(p) {   // 5 кристаллов в день, пока VIP
    if (!vipOn(p)) return;
    const today = new Date().toISOString().slice(0, 10);
    if (p.vipDay !== today) { p.vipDay = today; p.gems = (p.gems || 0) + 5; touch(); }
  }
  function credit(p, sku) {
    const s = SKU[sku]; if (!s) return;
    if (s.gems) p.gems = (p.gems || 0) + s.gems;
    if (s.vipDays) p.vip = Math.max(Date.now(), p.vip || 0) + s.vipDays * DAY;
    if (s.item) { p.pinv = p.pinv || {}; p.pinv[s.item] = 1; }
    if (s.once) p.starterBought = true;
  }
  const pub = () => ({ sku: SKU, items: PITEMS.filter(i => !i.hidden), boostCost: BOOST_COST, energyCost: ENERGY_COST });

  function route(name, me, body) {
    dailyVip(me);
    switch (name) {
      case 'pay/info': return { data: { wallet: wallet(me), ...pub() } };
      case 'pay/invoice': {
        const s = SKU[body.sku]; if (!s) return { error: 'Нет такого товара' };
        if (s.once && me.starterBought) return { error: 'Набор уже куплен' };
        if (!BOT_TOKEN) return { error: 'Оплата пока не подключена' };
        return { async: tg('createInvoiceLink', { title: s.title, description: s.desc, payload: me.id + '|' + body.sku, currency: 'XTR', prices: [{ label: s.title, amount: s.stars }] }).then(link => ({ link })) };
      }
      case 'gem/item': {
        const it = PITEMS.find(i => i.id === body.id && !i.hidden); if (!it) return { error: 'Нет такого товара' };
        me.pinv = me.pinv || {}; if (me.pinv[it.id]) return { error: 'Уже куплено' };
        if ((me.gems || 0) < it.price) return { error: 'Не хватает кристаллов' };
        me.gems -= it.price; me.pinv[it.id] = 1; touch(); return { data: { wallet: wallet(me) } };
      }
      case 'gem/boost': {
        if ((me.gems || 0) < BOOST_COST) return { error: 'Не хватает кристаллов' };
        me.gems -= BOOST_COST; me.boost = Math.max(Date.now(), me.boost || 0) + DAY; touch(); return { data: { wallet: wallet(me) } };
      }
      case 'gem/energy': {
        if ((me.gems || 0) < ENERGY_COST) return { error: 'Не хватает кристаллов' };
        me.gems -= ENERGY_COST; touch(); return { data: { wallet: wallet(me), energy: true } };
      }
    }
    return null;
  }

  // ----- вебхук бота -----
  async function onUpdate(u) {
    const db = getDb();
    if (u.pre_checkout_query) {
      const q = u.pre_checkout_query, [uid, sku] = String(q.invoice_payload).split('|'), p = db.players[uid], s = SKU[sku];
      const ok = !!(p && s && s.stars === q.total_amount && !(s.once && p.starterBought));
      return tg('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: 'Товар недоступен' });
    }
    const m = u.message; if (!m) return;
    if (m.successful_payment) {
      const sp = m.successful_payment, [uid, sku] = String(sp.invoice_payload).split('|'), p = db.players[uid];
      db.payments = db.payments || {};
      if (db.payments[sp.telegram_payment_charge_id]) return;      // повтор вебхука
      db.payments[sp.telegram_payment_charge_id] = { uid, sku, stars: sp.total_amount, t: Date.now(), tgUser: m.from && m.from.id };
      if (p) credit(p, sku);
      touch();
      return tg('sendMessage', { chat_id: m.chat.id, text: '✅ Спасибо за покупку! Всё уже в игре.' });
    }
    const t = String(m.text || '');
    if (t.startsWith('/terms')) return tg('sendMessage', { chat_id: m.chat.id, text: 'Условия: кристаллы 💎 и VIP — цифровые товары внутри игры Fighting Club, оплата Telegram Stars. Они не обмениваются на деньги и привязаны к вашему аккаунту. Платные товары не дают преимущества в силе, кроме косметики и ускорения.' });
    if (t.startsWith('/paysupport')) return tg('sendMessage', { chat_id: m.chat.id, text: 'Вопросы по оплате: напишите сюда с описанием покупки, мы ответим и при необходимости вернём Stars.' });
    if (t.startsWith('/start')) return tg('sendMessage', { chat_id: m.chat.id, text: '🥊 Fighting Club — нажми кнопку меню, чтобы играть.' });
  }
  async function setup() {
    if (!BOT_TOKEN || !PUBLIC_URL) { if (BOT_TOKEN) console.log('Pay: PUBLIC_URL не задан, вебхук не подключён'); return; }
    try { await tg('setWebhook', { url: PUBLIC_URL.replace(/\/$/, '') + '/tg/webhook', secret_token: SECRET, allowed_updates: ['message', 'pre_checkout_query'] }); console.log('Pay: webhook set'); }
    catch (e) { console.error('Pay webhook fail', e.message); }
  }
  // HTTP-обработчик вебхука; true если перехватили
  function webhook(req, res) {
    if (req.url.split('?')[0] !== '/tg/webhook') return false;
    if (req.method !== 'POST' || !SECRET || req.headers['x-telegram-bot-api-secret-token'] !== SECRET) { res.writeHead(403); res.end(); return true; }
    let raw = ''; req.on('data', d => { raw += d; if (raw.length > 50000) req.destroy(); });
    req.on('end', () => { res.writeHead(200); res.end('ok'); try { onUpdate(JSON.parse(raw)).catch(e => console.error('pay upd', e.message)); } catch (e) {} });
    return true;
  }
  return { route, webhook, setup, wallet, vipOn, PITEMS, SKU };
};
