// Rakwa — POS + real-time Kitchen Display System.
// Zero runtime deps: node:http + node:sqlite + SSE. Run: node server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  MENU, CATEGORIES, MOD_GROUPS, QUICK_NOTES, CASHIERS, PAYMENTS, STATUSES,
  SEED_LIVE, SEED_SALES, SEED_VOIDS,
} from './data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAT_RATE = 0.15;
const menuById = Object.fromEntries(MENU.map((m) => [m.id, m]));

// ── OpenRouter key from the environment or .env (never printed, never sent to a client) ──
function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [path.join(__dirname, '.env')]) {
    try {
      const m = fs.readFileSync(f, 'utf8').match(/^\s*OPENROUTER_API_KEY\s*=\s*(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* optional */ }
  }
  return null;
}
const OPENROUTER_KEY = loadKey();
const AI_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

// ── SQLite: rebuilt fresh on every boot so the board is always alive ──────
const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec(`
  DROP TABLE IF EXISTS items;
  DROP TABLE IF EXISTS orders;
  CREATE TABLE orders (
    id TEXT PRIMARY KEY, number INTEGER, type TEXT, tag TEXT, cashier TEXT,
    payment TEXT, status TEXT, void_reason TEXT,
    created_at INTEGER, prep_at INTEGER, ready_at INTEGER, served_at INTEGER,
    subtotal REAL, vat REAL, total REAL
  );
  CREATE TABLE items (
    id TEXT PRIMARY KEY, order_id TEXT, seq INTEGER, menu_id TEXT, name TEXT,
    station TEXT, qty INTEGER, size TEXT, mods TEXT, note TEXT, unit_price REAL, done INTEGER
  );
`);

let orderSeq = 0;
let itemSeq = 0;
const insOrder = db.prepare(`INSERT INTO orders
  (id,number,type,tag,cashier,payment,status,void_reason,created_at,prep_at,ready_at,served_at,subtotal,vat,total)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insItem = db.prepare(`INSERT INTO items
  (id,order_id,seq,menu_id,name,station,qty,size,mods,note,unit_price,done)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

function money(items) {
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  const vat = +(subtotal * VAT_RATE).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), vat, total: +(subtotal + vat).toFixed(2) };
}
function persist(o) {
  const id = o.id || `o-${o.number}`;
  const { subtotal, vat, total } = money(o.items);
  insOrder.run(id, o.number, o.type, o.tag ?? null, o.cashier, o.payment, o.status,
    o.void_reason ?? null, o.created_at, o.prep_at ?? null, o.ready_at ?? null, o.served_at ?? null,
    subtotal, vat, total);
  o.items.forEach((it, i) =>
    insItem.run(`l-${++itemSeq}`, id, i, it.menuId, it.name, it.station, it.qty,
      it.size || '', JSON.stringify(it.mods || []), it.note || '', it.unit_price, it.done ? 1 : 0));
  return id;
}

function seed() {
  const now = Date.now();
  // Completed trade is anchored to a fixed business morning (closes ~14:20) so the
  // day report always reads like a clean cafe shift, whatever hour it runs.
  const close = new Date(); close.setHours(14, 20, 0, 0);
  const closeAt = close.getTime();
  for (const s of SEED_SALES) {
    const created = closeAt - s.minsAgo * 60_000;
    const served = created + s.serveMin * 60_000;
    persist({ ...s, status: 'served', created_at: created,
      prep_at: created + 30_000, ready_at: served - 20_000, served_at: served });
    orderSeq = Math.max(orderSeq, s.number);
  }
  for (const v of SEED_VOIDS) {
    const created = closeAt - v.minsAgo * 60_000;
    persist({ ...v, id: `v-${v.number}`, void_reason: v.reason, status: 'void', created_at: created, served_at: null });
    orderSeq = Math.max(orderSeq, v.number);
  }
  // In-flight orders on the board.
  for (const l of SEED_LIVE) {
    const created = now - l.ageMin * 60_000;
    const o = { ...l, created_at: created };
    if (l.status === 'preparing' || l.status === 'ready') o.prep_at = created + 45_000;
    if (l.status === 'ready') o.ready_at = created + l.items.reduce((m, it) => Math.max(m, menuById[it.menuId].prep), 0) * 60_000;
    persist(o);
    orderSeq = Math.max(orderSeq, l.number);
  }
}
seed();

// ── Order reads ───────────────────────────────────────────────────────────
const qItems = db.prepare('SELECT * FROM items WHERE order_id = ? ORDER BY seq');
function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id, number: row.number, type: row.type, tag: row.tag, cashier: row.cashier,
    payment: row.payment, status: row.status, void_reason: row.void_reason,
    created_at: row.created_at, prep_at: row.prep_at, ready_at: row.ready_at, served_at: row.served_at,
    subtotal: row.subtotal, vat: row.vat, total: row.total,
    items: qItems.all(row.id).map((it) => ({
      id: it.id, menuId: it.menu_id, name: it.name, station: it.station, qty: it.qty,
      size: it.size, mods: JSON.parse(it.mods || '[]'), note: it.note, unit_price: it.unit_price, done: !!it.done,
    })),
  };
}
const getOrder = (id) => hydrate(db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
const liveBoard = () =>
  db.prepare("SELECT * FROM orders WHERE status IN ('new','preparing','ready') ORDER BY created_at").all().map(hydrate);
const recentServed = (n = 8) =>
  db.prepare("SELECT * FROM orders WHERE status='served' ORDER BY served_at DESC LIMIT ?").all(n).map(hydrate);

// ── SSE fan-out: POS + KDS both subscribe to /api/stream ──────────────────
const clients = new Set();
function broadcast(event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) { try { res.write(frame); } catch { /* dropped */ } }
}

// ── Day report (real SQL aggregation over today's served trade) ───────────
function report() {
  const served = db.prepare("SELECT * FROM orders WHERE status='served'").all();
  const voids = db.prepare("SELECT * FROM orders WHERE status='void'").all();
  const gross = served.reduce((s, o) => s + o.total, 0);
  const net = served.reduce((s, o) => s + o.subtotal, 0);
  const byPayment = db.prepare(
    "SELECT payment, COUNT(*) n, SUM(total) amt FROM orders WHERE status='served' GROUP BY payment ORDER BY amt DESC").all();
  const byCashier = db.prepare(
    "SELECT cashier, COUNT(*) n, SUM(total) amt FROM orders WHERE status='served' GROUP BY cashier ORDER BY amt DESC").all();
  const top = db.prepare(`SELECT i.name, i.station, SUM(i.qty) qty, SUM(i.qty*i.unit_price) amt
    FROM items i JOIN orders o ON o.id=i.order_id WHERE o.status='served'
    GROUP BY i.name ORDER BY qty DESC LIMIT 6`).all();
  // Sales by hour, from local hour of created_at.
  const buckets = {};
  for (const o of served) {
    const h = new Date(o.created_at).getHours();
    (buckets[h] ||= { orders: 0, amt: 0 });
    buckets[h].orders++; buckets[h].amt += o.total;
  }
  const hours = Object.keys(buckets).map(Number).sort((a, b) => a - b)
    .map((h) => ({ hour: h, orders: buckets[h].orders, amt: +buckets[h].amt.toFixed(2) }));
  const serveTimes = served.filter((o) => o.served_at)
    .map((o) => (o.served_at - o.created_at) / 60_000);
  const avgServe = serveTimes.length ? serveTimes.reduce((a, b) => a + b, 0) / serveTimes.length : 0;
  return {
    date: new Date().toISOString().slice(0, 10),
    gross: +gross.toFixed(2), net: +net.toFixed(2), vat: +(gross - net).toFixed(2),
    orders: served.length, avgTicket: served.length ? +(gross / served.length).toFixed(2) : 0,
    avgServeMin: +avgServe.toFixed(1),
    byPayment: byPayment.map((r) => ({ ...r, amt: +r.amt.toFixed(2) })),
    byCashier: byCashier.map((r) => ({ ...r, amt: +r.amt.toFixed(2) })),
    top: top.map((r) => ({ ...r, amt: +r.amt.toFixed(2) })),
    hours,
    voids: { count: voids.length, value: +voids.reduce((s, o) => s + o.total, 0).toFixed(2),
      list: voids.map((o) => ({ number: o.number, cashier: o.cashier, reason: o.void_reason, total: o.total })) },
  };
}

// ── AI expeditor: live floor snapshot → flags + staffing (narrates, never invents) ──
function floorSnapshot() {
  const t = Date.now();
  const open = liveBoard();
  const stations = { espresso: 0, grill: 0, cold: 0 };
  for (const o of open) for (const it of o.items) if (!it.done) stations[it.station] += it.qty;
  const recent = recentServed(8);
  const serveTimes = recent.map((o) => +((o.served_at - o.created_at) / 60_000).toFixed(1));
  const avg = serveTimes.length ? serveTimes.reduce((a, b) => a + b, 0) / serveTimes.length : 0;
  return {
    clock: new Date(t).toTimeString().slice(0, 5),
    openTickets: open.map((o) => ({
      ticket: o.number, status: o.status, type: o.type,
      ageMin: +((t - o.created_at) / 60_000).toFixed(1),
      items: o.items.map((i) => `${i.qty}× ${i.name}${i.size ? ` (${i.size})` : ''} [${i.station}]${i.done ? ' ✓' : ''}${i.note ? ` — note: ${i.note}` : ''}`),
    })),
    stationLoadPending: stations,
    recentServeTimesMin: serveTimes,
    avgServeMin: +avg.toFixed(1),
  };
}
const AI_SYSTEM = `You are the AI expeditor for Rakwa, a specialty coffee shop + fast-eats counter in Riyadh.
You watch the live kitchen board and speak like a calm, sharp shift lead.
Service targets: drinks under 5 min, grill/food under 9 min. Tickets past target are "late".
Reason ONLY from the snapshot you are given — never invent ticket numbers, items, or minutes.
Respond with STRICT JSON only (no markdown fences), matching exactly:
{
 "headline": "one crisp line on how the floor looks right now",
 "alerts": [{"ticket": 118, "severity": "late|watch|ok", "issue": "short, specific", "action": "one concrete move now"}],
 "stations": [{"station": "espresso|grill|cold", "load": "quiet|steady|slammed", "advice": "one concrete move"}],
 "staffing": "one or two sentences on prep/staffing for the next 30 minutes, with reasoning",
 "pace": "one line comparing current wait to the recent average serve time"
}
Only raise alerts that genuinely need attention. Be specific: cite ticket numbers, item names, minutes.`;

async function aiExpedite() {
  if (!OPENROUTER_KEY) return { error: 'OPENROUTER_API_KEY is not set — the AI expeditor is offline.' };
  const snap = floorSnapshot();
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL, temperature: 0.4, max_tokens: 800,
      messages: [
        { role: 'system', content: AI_SYSTEM },
        { role: 'user', content: `Live floor snapshot:\n${JSON.stringify(snap, null, 2)}` },
      ],
    }),
  });
  if (!r.ok) return { error: `OpenRouter ${r.status}: ${(await r.text()).slice(0, 200)}` };
  const data = await r.json();
  let text = (data.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return { ...JSON.parse(text), model: AI_MODEL, at: new Date().toISOString() }; }
  catch { return { headline: text.slice(0, 400), alerts: [], stations: [], staffing: '', pace: '', model: AI_MODEL, at: new Date().toISOString() }; }
}

// ── HTTP plumbing ─────────────────────────────────────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => {
  let buf = ''; req.on('data', (c) => { buf += c; if (buf.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
});
function serveFile(res, rel) {
  const dir = path.join(__dirname, 'public');
  const file = path.join(dir, path.normalize(rel).replace(/^([/\\.])+/, ''));
  if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const NEXT = { new: 'preparing', preparing: 'ready', ready: 'served' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // Pages
  if (p === '/') { res.writeHead(302, { Location: '/pos' }); return res.end(); }
  if (p === '/pos') return serveFile(res, 'pos.html');
  if (p === '/kds') return serveFile(res, 'kds.html');
  if (!p.startsWith('/api/')) return serveFile(res, p);

  // SSE
  if (p === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('event: hello\ndata: {}\n\n');
    clients.add(res);
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25_000);
    req.on('close', () => { clients.delete(res); clearInterval(ping); });
    return;
  }

  try {
    if (p === '/api/menu' && req.method === 'GET')
      return json(res, 200, { menu: MENU, categories: CATEGORIES, modGroups: MOD_GROUPS, quickNotes: QUICK_NOTES, payments: PAYMENTS, cashiers: CASHIERS, cashier: CASHIERS[0], vat: VAT_RATE });

    if (p === '/api/orders' && req.method === 'GET')
      return json(res, 200, { orders: liveBoard(), recent: recentServed(8), serverNow: Date.now() });

    if (p === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req);
      if (!Array.isArray(body.items) || body.items.length === 0)
        return json(res, 400, { error: 'Order needs at least one item.' });
      const items = body.items.map((it) => {
        const m = menuById[it.menuId];
        if (!m) throw new Error(`Unknown item ${it.menuId}`);
        return {
          menuId: m.id, name: m.name, station: m.station,
          qty: Math.max(1, Math.min(20, it.qty | 0 || 1)),
          size: String(it.size || ''), mods: (it.mods || []).slice(0, 8).map(String),
          note: String(it.note || '').slice(0, 120),
          unit_price: typeof it.unit_price === 'number' ? it.unit_price : m.price, done: false,
        };
      });
      const number = ++orderSeq;
      const order = {
        id: `o-${number}-${Date.now().toString(36)}`, number,
        type: body.type || 'dine-in', tag: (body.tag || '').slice(0, 40) || 'Walk-in',
        cashier: CASHIERS.includes(body.cashier) ? body.cashier : CASHIERS[0],
        payment: (PAYMENTS.find((x) => x.id === body.payment) || PAYMENTS[0]).id,
        status: 'new', created_at: Date.now(), items,
      };
      persist(order);
      const full = getOrder(order.id);
      broadcast('order:new', full);
      return json(res, 201, { order: full });
    }

    let m;
    // Advance one ticket through new → preparing → ready → served
    if ((m = p.match(/^\/api\/orders\/([\w-]+)\/status$/)) && req.method === 'POST') {
      const o = db.prepare("SELECT * FROM orders WHERE id=? AND status IN ('new','preparing','ready')").get(m[1]);
      if (!o) return json(res, 404, { error: 'Ticket not found or already closed.' });
      const next = NEXT[o.status];
      const t = Date.now();
      const col = next === 'preparing' ? 'prep_at' : next === 'ready' ? 'ready_at' : 'served_at';
      db.prepare(`UPDATE orders SET status=?, ${col}=? WHERE id=?`).run(next, t, o.id);
      if (next === 'served') db.prepare('UPDATE items SET done=1 WHERE order_id=?').run(o.id);
      const full = getOrder(o.id);
      if (next === 'served') {
        const servedInMin = +((t - o.created_at) / 60_000).toFixed(1);
        broadcast('order:bump', { id: o.id, number: o.number, servedInMin, order: full });
      } else broadcast('order:update', full);
      return json(res, 200, { order: full });
    }

    // Strike one line done/undone on the KDS
    if ((m = p.match(/^\/api\/orders\/([\w-]+)\/item\/([\w-]+)\/toggle$/)) && req.method === 'POST') {
      const it = db.prepare('SELECT * FROM items WHERE id=? AND order_id=?').get(m[2], m[1]);
      if (!it) return json(res, 404, { error: 'Line not found' });
      db.prepare('UPDATE items SET done=? WHERE id=?').run(it.done ? 0 : 1, it.id);
      const full = getOrder(m[1]);
      broadcast('order:update', full);
      return json(res, 200, { order: full });
    }

    // Void / cancel a ticket (manager permission in a real deploy)
    if ((m = p.match(/^\/api\/orders\/([\w-]+)\/void$/)) && req.method === 'POST') {
      const body = await readBody(req);
      const o = db.prepare("SELECT * FROM orders WHERE id=? AND status IN ('new','preparing','ready')").get(m[1]);
      if (!o) return json(res, 404, { error: 'Ticket not found or already closed.' });
      db.prepare('UPDATE orders SET status=?, void_reason=? WHERE id=?').run('void', String(body.reason || 'Cancelled').slice(0, 80), o.id);
      broadcast('order:void', { id: o.id, number: o.number });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/report' && req.method === 'GET') return json(res, 200, report());

    if (p === '/api/ai/expedite' && req.method === 'POST') {
      const result = await aiExpedite();
      if (!result.error) broadcast('ai:ops', result);
      return json(res, result.error ? 502 : 200, result);
    }

    return json(res, 404, { error: 'No such endpoint' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

// ── Listen, hopping to a free port in 4900–4999 on collision ──────────────
function listen(port, tries = 0) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && tries < 60) { const n = 4900 + ((port - 4900 + 1) % 100); listen(n, tries + 1); }
    else { console.error(e); process.exit(1); }
  });
  server.listen(port, () => {
    console.log(`\n  ☕  Rakwa POS + KDS`);
    console.log(`      POS → http://localhost:${port}/pos`);
    console.log(`      KDS → http://localhost:${port}/kds`);
    console.log(`      AI  → ${OPENROUTER_KEY ? `live (${AI_MODEL})` : 'offline — OPENROUTER_API_KEY is not set'}\n`);
    fs.writeFileSync(path.join(__dirname, '.port'), String(port));
  });
}
listen(Number(process.env.PORT) || 4933);
