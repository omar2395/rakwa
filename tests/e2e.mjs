// Rakwa e2e — drives POS → KDS over live SSE, walks a ticket through the
// status machine, runs one LIVE OpenRouter ops check, and captures ./screenshots/.
// Run: node tests/e2e.mjs   (server must be running: node server.js)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = (fs.existsSync(path.join(ROOT, '.port')) && fs.readFileSync(path.join(ROOT, '.port'), 'utf8').trim()) || '4933';
const BASE = `http://localhost:${PORT}`;

let failures = 0;
const ok = (cond, name) => { console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}`); if (!cond) failures++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1480, height: 940 }, deviceScaleFactor: 2 });
const pos = await ctx.newPage();
const kds = await ctx.newPage();
const errors = [];
for (const [p, tag] of [[pos, 'POS'], [kds, 'KDS']]) {
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name) });

console.log(`\nRakwa e2e @ ${BASE}\n`);

console.log('1. KDS boots with live seeded tickets');
await kds.goto(`${BASE}/kds`, { waitUntil: 'load' });
await kds.waitForSelector('.ticket');
const seed = await kds.locator('.ticket').count();
ok(seed >= 6, `KDS shows ${seed} live tickets from seed`);
ok(await kds.locator('.ticket.age-late').count() >= 1, 'at least one ticket is past SLA (red)');
ok(await kds.locator('.t-mods .mod').count() >= 3, 'modifiers render on tickets');
ok(await kds.locator('.t-mods .note').count() >= 1, 'kitchen notes render on tickets');

console.log('\n2. POS: build an order with modifiers and a kitchen note');
await pos.goto(`${BASE}/pos`, { waitUntil: 'load' });
await pos.waitForSelector('.item-card');
ok(await pos.locator('.item-card').count() >= 5, 'menu grid renders');
await pos.click('.item-card:has-text("Spanish Latte")');
await pos.waitForSelector('#modModal[open]');
await pos.click('#dlgBody .chip:has-text("Large")');
await pos.click('#dlgBody .chip:has-text("Oat")');
await pos.fill('#freeNote', 'Extra hot please');
await pos.click('#qtyUp'); // qty 2
await shot(pos, '2-pos-modifier-modal.png');
await pos.click('#addToOrder');
await pos.click('.cat-tab[data-cat="eats"]');
await pos.click('.item-card:has-text("Smash Burger")');
await pos.waitForSelector('#modModal[open]');
await pos.click('#dlgBody .chip:has-text("Add cheese")');
await pos.fill('#freeNote', 'No onions');
await pos.click('#addToOrder');
const lines = await pos.locator('.line').count();
ok(lines === 2, `receipt shows ${lines} lines`);
const grand = (await pos.locator('#totals .grand span:last-child').textContent()).trim();
ok(/SR/.test(grand) && parseFloat(grand) > 0, `total computed: ${grand}`);
await pos.click('#paySeg [data-pay="card"]');
await pos.waitForTimeout(250); // let the segment transition settle
await shot(pos, '1-pos-order-entry.png');

console.log('\n3. Fire → ticket arrives on the KDS in real time (SSE)');
const before = await kds.locator('.ticket').count();
await pos.click('#fireBtn');
await pos.waitForSelector('#toast.show');
const toast = (await pos.locator('#toast').textContent()).trim();
const num = (toast.match(/#(\d+)/) || [])[1];
ok(!!num, `POS confirms: ${toast}`);
await kds.waitForSelector(`.ticket[data-num="${num}"]`, { timeout: 6000 });
ok((await kds.locator('.ticket').count()) === before + 1, `ticket #${num} appeared on KDS live`);
ok(await kds.locator(`.ticket[data-num="${num}"] .note:has-text("No onions")`).count() === 1, 'kitchen note carried through to KDS');
await kds.waitForTimeout(600);
await shot(kds, '3-kds-board-dark.png');

console.log('\n4. Day report — the seeded shift, before this ticket closes');
const rep = await (await fetch(`${BASE}/api/report`)).json();
ok(rep.orders >= 30, `report: ${rep.orders} served orders, ${rep.gross} SR gross`);
ok(rep.top.length >= 3 && rep.byPayment.length >= 2 && rep.byCashier.length >= 2, 'top sellers + payment + cashier splits computed');
ok(rep.voids.count >= 1 && rep.voids.list.every((v) => v.reason && v.reason !== 'null'), 'cancelled/returned rows carry a reason');
await pos.click('#reportBtn');
await pos.waitForSelector('#reportModal[open] .kpi');
await pos.waitForTimeout(600); // let bars animate in
await shot(pos, '5-pos-day-report.png');
await pos.click('#repClose');

console.log('\n5. Bump flow: new → preparing → ready → served');
const tk = () => kds.locator(`.ticket[data-num="${num}"]`);
await tk().locator('[data-adv]').click();
await kds.waitForSelector(`.ticket[data-num="${num}"] .s-preparing`);
ok(true, 'ticket → Preparing');
await tk().locator('[data-adv]').click();
await kds.waitForSelector(`.ticket[data-num="${num}"] .s-ready`);
ok(true, 'ticket → Ready');
await tk().locator('[data-adv]').click();
await kds.waitForSelector(`.ticket[data-num="${num}"]`, { state: 'detached', timeout: 6000 });
ok(true, 'ticket bumped off the board');

console.log('\n6. LIVE AI ops check (OpenRouter)');
await kds.click('#aiBtn');
try { await kds.waitForSelector('.ai-head', { timeout: 120000 }); }
catch { throw new Error(`AI panel never rendered — ${(await kds.locator('#aiOut').textContent()).slice(0, 200)}`); }
const headline = (await kds.locator('.ai-head').textContent()).trim();
const alerts = await kds.locator('.alert').count();
ok(headline.length > 3, `AI headline: "${headline}"`);
ok(alerts >= 1, `AI raised ${alerts} alert(s) grounded on the live board`);
await shot(kds, '4-kds-ai-ops.png');

console.log('\n7. Light mode');
await pos.click('#themeToggle');
await pos.waitForTimeout(400);
await shot(pos, '6-pos-light-mode.png');

ok(errors.length === 0, errors.length ? `console errors: ${errors.join(' | ')}` : 'zero console errors across both screens');

await browser.close();
console.log(`\n${failures === 0 ? '✅ ALL PASS' : '❌ ' + failures + ' FAILURE(S)'} — screenshots in ./screenshots/\n`);
process.exit(failures ? 1 : 0);
