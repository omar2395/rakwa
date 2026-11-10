// Rakwa — menu config + a believable morning of trade, seeded into SQLite on boot.
// Prices in SAR. Stations: espresso | grill | cold.  رَكوة — قهوة مختصة ومأكولات سريعة.

export const MENU = [
  // ── Espresso bar ──────────────────────────────────────────────
  { id: 'esp-flat',  cat: 'espresso', station: 'espresso', name: 'Flat White',    ar: 'فلات وايت',    price: 16, prep: 3, mods: ['size', 'milk', 'shots'] },
  { id: 'esp-span',  cat: 'espresso', station: 'espresso', name: 'Spanish Latte',  ar: 'سبانيش لاتيه',  price: 18, prep: 3, mods: ['size', 'milk', 'shots'] },
  { id: 'esp-cort',  cat: 'espresso', station: 'espresso', name: 'Cortado',        ar: 'كورتادو',      price: 14, prep: 3, mods: ['milk', 'shots'] },
  { id: 'esp-v60',   cat: 'espresso', station: 'espresso', name: 'V60 Pour Over',  ar: 'في ٦٠',        price: 22, prep: 5, mods: ['beans'] },
  { id: 'esp-turk',  cat: 'espresso', station: 'espresso', name: 'Turkish Coffee', ar: 'قهوة تركية',   price: 12, prep: 4, mods: ['sugar'] },
  { id: 'esp-saudi', cat: 'espresso', station: 'espresso', name: 'Saudi Coffee',   ar: 'قهوة سعودية',  price: 20, prep: 4, mods: [] },
  // ── Cold bar ──────────────────────────────────────────────────
  { id: 'cold-brew',      cat: 'cold', station: 'cold', name: 'Cold Brew',     ar: 'كولد برو',    price: 19, prep: 2, mods: ['size', 'milk'] },
  { id: 'cold-iced-span', cat: 'cold', station: 'cold', name: 'Iced Spanish',  ar: 'آيس سبانيش',  price: 20, prep: 3, mods: ['size', 'milk'] },
  { id: 'cold-matcha',    cat: 'cold', station: 'cold', name: 'Iced Matcha',   ar: 'آيس ماتشا',   price: 21, prep: 3, mods: ['size', 'milk'] },
  { id: 'cold-mojito',    cat: 'cold', station: 'cold', name: 'Berry Mojito',  ar: 'موهيتو توت',  price: 17, prep: 3, mods: ['size'] },
  { id: 'cold-orange',    cat: 'cold', station: 'cold', name: 'Fresh Orange',  ar: 'عصير برتقال', price: 15, prep: 2, mods: ['size'] },
  // ── Grill / kitchen ───────────────────────────────────────────
  { id: 'gr-halloumi', cat: 'eats', station: 'grill', name: 'Halloumi Toast',    ar: 'توست حلومي',  price: 24, prep: 7, mods: ['bread', 'extras'] },
  { id: 'gr-club',     cat: 'eats', station: 'grill', name: 'Chicken Club',      ar: 'كلوب دجاج',   price: 32, prep: 8, mods: ['bread', 'extras'] },
  { id: 'gr-smash',    cat: 'eats', station: 'grill', name: 'Smash Burger',      ar: 'سماش برجر',   price: 34, prep: 9, mods: ['extras', 'doneness'] },
  { id: 'gr-fries',    cat: 'eats', station: 'grill', name: 'Truffle Fries',     ar: 'بطاطس ترافل', price: 18, prep: 6, mods: ['extras'] },
  { id: 'gr-shak',     cat: 'eats', station: 'grill', name: 'Shakshuka Skillet', ar: 'شكشوكة',      price: 26, prep: 8, mods: ['bread'] },
  // ── Bakery (cold station plates it) ───────────────────────────
  { id: 'bk-crois',     cat: 'bakery', station: 'cold', name: 'Butter Croissant', ar: 'كرواسون',      price: 12, prep: 2, mods: ['warmed'] },
  { id: 'bk-pistachio', cat: 'bakery', station: 'cold', name: 'Pistachio Roll',   ar: 'رول فستق',     price: 16, prep: 2, mods: ['warmed'] },
  { id: 'bk-date',      cat: 'bakery', station: 'cold', name: 'Date Cake',        ar: 'كيكة تمر',     price: 14, prep: 1, mods: [] },
  { id: 'bk-sanf',      cat: 'bakery', station: 'cold', name: 'San Sebastián',    ar: 'سان سباستيان', price: 22, prep: 1, mods: [] },
];

export const CATEGORIES = [
  { id: 'espresso', name: 'Espresso Bar', ar: 'بار الإسبريسو' },
  { id: 'cold',     name: 'Cold Bar',     ar: 'البار البارد' },
  { id: 'eats',     name: 'Grill & Eats', ar: 'المطبخ' },
  { id: 'bakery',   name: 'Bakery',       ar: 'المخبوزات' },
];

export const MOD_GROUPS = {
  size: { label: 'Size', type: 'single', options: [
    { id: 'sm', label: 'Small',  delta: -2 },
    { id: 'md', label: 'Medium', delta: 0, default: true },
    { id: 'lg', label: 'Large',  delta: 3 },
  ]},
  milk: { label: 'Milk', type: 'single', options: [
    { id: 'whole',  label: 'Whole',  delta: 0, default: true },
    { id: 'oat',    label: 'Oat',    delta: 3 },
    { id: 'almond', label: 'Almond', delta: 3 },
    { id: 'skim',   label: 'Skim',   delta: 0 },
  ]},
  shots: { label: 'Espresso', type: 'single', options: [
    { id: 'single', label: 'Single',    delta: 0 },
    { id: 'double', label: 'Double',    delta: 0, default: true },
    { id: 'triple', label: 'Extra shot', delta: 4 },
  ]},
  beans: { label: 'Beans', type: 'single', options: [
    { id: 'ethiopia', label: 'Ethiopia Guji', delta: 0, default: true },
    { id: 'colombia', label: 'Colombia Huila', delta: 2 },
  ]},
  sugar: { label: 'Sugar', type: 'single', options: [
    { id: 'none',   label: 'No sugar', delta: 0 },
    { id: 'medium', label: 'Medium',   delta: 0, default: true },
    { id: 'sweet',  label: 'Sweet',    delta: 0 },
  ]},
  bread: { label: 'Bread', type: 'single', options: [
    { id: 'sour',    label: 'Sourdough', delta: 0, default: true },
    { id: 'brioche', label: 'Brioche',   delta: 2 },
    { id: 'saj',     label: 'Saj wrap',  delta: 0 },
  ]},
  doneness: { label: 'Doneness', type: 'single', options: [
    { id: 'med',  label: 'Medium',    delta: 0, default: true },
    { id: 'well', label: 'Well done', delta: 0 },
  ]},
  extras: { label: 'Extras', type: 'multi', options: [
    { id: 'cheese',   label: 'Add cheese', delta: 3 },
    { id: 'egg',      label: 'Fried egg',  delta: 3 },
    { id: 'avocado',  label: 'Avocado',    delta: 5 },
    { id: 'jalapeno', label: 'Jalapeño',   delta: 2 },
  ]},
  warmed: { label: 'Prep', type: 'single', options: [
    { id: 'warm', label: 'Warmed', delta: 0, default: true },
    { id: 'asis', label: 'As is',  delta: 0 },
  ]},
};

export const QUICK_NOTES = [
  'No sugar', 'Less ice', 'Extra hot', 'Decaf', 'No onions', 'Sauce on side', 'Rush — customer waiting',
];

export const CASHIERS = ['Layla', 'Faisal', 'Maya'];
export const PAYMENTS = [
  { id: 'cash',   label: 'Cash',   ar: 'نقدًا' },
  { id: 'card',   label: 'Card',   ar: 'بطاقة' },
  { id: 'wallet', label: 'Wallet', ar: 'محفظة' },
];

// The KDS lifecycle straight from the brief: جديد → قيد التحضير → جاهز → تم التسليم
export const STATUSES = ['new', 'preparing', 'ready', 'served'];

const menuById = Object.fromEntries(MENU.map((m) => [m.id, m]));

// Build a line item, resolving name/station/price from the menu.
function line(menuId, { qty = 1, size = '', mods = [], note = '', done = false } = {}) {
  const m = menuById[menuId];
  const sizeDelta = size === 'Large' ? 3 : size === 'Small' ? -2 : 0;
  const modDelta = mods.reduce((s, x) => s + (/cheese|egg|jalape/i.test(x) ? 3 : /avocado/i.test(x) ? 5 : /oat|almond|extra shot|brioche|colombia/i.test(x) ? 2 : 0), 0);
  return {
    menuId, name: m.name, station: m.station, qty,
    size, mods, note, unit_price: m.price + sizeDelta + modDelta, done,
  };
}

// ── In-flight orders on the board right now (ageMin = minutes since fired) ──
export const SEED_LIVE = [
  { number: 118, type: 'dine-in',  tag: 'Table 4',      cashier: 'Layla',  payment: 'card',   status: 'preparing', ageMin: 11.4, items: [
    line('gr-smash',  { size: '', mods: ['Add cheese', 'Well done'], note: 'No onions' }),
    line('gr-fries',  { mods: ['Jalapeño'], done: true }),
    line('cold-brew', { size: 'Large', mods: ['Oat'], done: true }),
  ]},
  { number: 119, type: 'takeaway', tag: 'Ahmed K.',     cashier: 'Faisal', payment: 'cash',   status: 'preparing', ageMin: 8.7, items: [
    line('esp-span',      { qty: 2, size: 'Medium', mods: ['Oat'] }),
    line('bk-pistachio',  { mods: ['Warmed'], done: true }),
  ]},
  { number: 120, type: 'dine-in',  tag: 'Table 9',      cashier: 'Layla',  payment: 'card',   status: 'new', ageMin: 6.2, items: [
    line('gr-shak',     { size: '', mods: ['Sourdough'] }),
    line('gr-halloumi', { mods: ['Saj wrap', 'Add cheese'], note: 'Sauce on side' }),
    line('esp-turk',    { mods: ['No sugar'] }),
  ]},
  { number: 121, type: 'delivery', tag: 'Jahez #8841',  cashier: 'Maya',   payment: 'wallet', status: 'new', ageMin: 4.9, items: [
    line('gr-club',    { size: '', mods: ['Brioche', 'Avocado'] }),
    line('cold-mojito', { size: 'Large', note: 'Less ice' }),
  ]},
  { number: 122, type: 'dine-in',  tag: 'Table 2',      cashier: 'Faisal', payment: 'cash',   status: 'ready', ageMin: 3.6, items: [
    line('esp-flat', { mods: ['Double'] }),
    line('esp-v60',  { mods: ['Ethiopia Guji'] }),
    line('bk-date'),
  ]},
  { number: 123, type: 'takeaway', tag: 'Noura S.',     cashier: 'Layla',  payment: 'card',   status: 'new', ageMin: 1.7, items: [
    line('cold-matcha', { size: 'Medium', mods: ['Almond'], note: 'Extra cold, less ice' }),
    line('bk-sanf'),
  ]},
  { number: 124, type: 'dine-in',  tag: 'Table 6',      cashier: 'Maya',   payment: 'card',   status: 'new', ageMin: 0.5, items: [
    line('cold-orange', { size: 'Large' }),
    line('esp-cort'),
    line('bk-crois',    { mods: ['Warmed'] }),
  ]},
];

// ── A believable morning of completed trade (feeds the day report + AI pace) ──
// Deterministic generator so screenshots and totals are stable across runs.
function lcg(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
function weightedPick(rnd, pool) {
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [id, w] of pool) { if ((r -= w) <= 0) return id; }
  return pool[0][0];
}

const POPULARITY = [
  ['esp-span', 9], ['esp-flat', 8], ['cold-iced-span', 7], ['cold-brew', 6], ['esp-cort', 5],
  ['cold-matcha', 5], ['gr-smash', 5], ['gr-club', 4], ['bk-crois', 4], ['esp-turk', 4],
  ['gr-halloumi', 3], ['cold-orange', 3], ['bk-pistachio', 3], ['esp-v60', 3], ['gr-fries', 3],
  ['esp-saudi', 2], ['cold-mojito', 2], ['gr-shak', 2], ['bk-date', 2], ['bk-sanf', 2],
];
const SIZE_POOL = [['Medium', 6], ['Large', 3], ['Small', 1]];
const PAY_POOL = [['cash', 5], ['card', 6], ['wallet', 2]];
const TYPE_POOL = [['dine-in', 6], ['takeaway', 4], ['delivery', 2]];

function buildSales() {
  const rnd = lcg(20260704);
  const sales = [];
  let number = 84; // completed tickets earlier today
  // Trade from 07:35 up to ~14 min ago; density rises toward late morning.
  for (let minsAgo = 415; minsAgo > 14; ) {
    const gap = 6 + Math.floor(rnd() * 14 * (minsAgo > 200 ? 1.4 : 0.8)); // busier mid-morning
    minsAgo -= gap;
    const nItems = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.22 ? 1 : 0);
    const items = [];
    for (let i = 0; i < nItems; i++) {
      const id = weightedPick(rnd, POPULARITY);
      const m = menuById[id];
      const qty = rnd() < 0.15 ? 2 : 1;
      const size = m.mods.includes('size') ? weightedPick(rnd, SIZE_POOL) : '';
      items.push(line(id, { qty, size }));
    }
    const prepMax = Math.max(...items.map((it) => menuById[it.menuId].prep));
    const serveMin = +(prepMax + 0.5 + rnd() * 3.5).toFixed(1);
    sales.push({
      number: number++,
      type: weightedPick(rnd, TYPE_POOL),
      cashier: CASHIERS[Math.floor(rnd() * CASHIERS.length)],
      payment: weightedPick(rnd, PAY_POOL),
      minsAgo, serveMin, items,
    });
  }
  return sales;
}
export const SEED_SALES = buildSales();

// Cancelled / returned earlier today — surfaces in the report (الطلبات الملغاة والمرتجعة).
export const SEED_VOIDS = [
  { number: 114, type: 'takeaway', cashier: 'Faisal', payment: 'cash', minsAgo: 168, reason: 'Customer left — no-show', items: [line('esp-span', { size: 'Large', mods: ['Oat'] }), line('bk-crois')] },
  { number: 116, type: 'dine-in',  cashier: 'Maya',   payment: 'card', minsAgo: 74,  reason: 'Wrong milk — remade',   items: [line('cold-matcha', { size: 'Medium', mods: ['Almond'] })] },
];
