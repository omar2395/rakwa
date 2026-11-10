// Shared helpers for both screens: theme, clock, money, SSE, fetch.
export const SAR = (n) => `${(+n).toFixed(2)} SR`;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// One theme key shared across POS + KDS so both screens stay in sync. Default dark.
export function initTheme(defaultTheme = 'dark') {
  const saved = localStorage.getItem('rakwa-theme') || defaultTheme;
  document.documentElement.dataset.theme = saved;
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const paint = () => { btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'; };
    paint();
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('rakwa-theme', next);
      paint();
    });
  }
}

export function initClock(id = 'clock') {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  tick(); setInterval(tick, 1000);
}

// SSE with auto-reconnect. handlers = { 'order:new': fn, ... }; onState(connected).
export function connectStream(handlers, onState) {
  let es;
  const open = () => {
    es = new EventSource('/api/stream');
    es.addEventListener('hello', () => onState?.(true));
    es.onopen = () => onState?.(true);
    es.onerror = () => { onState?.(false); es.close(); setTimeout(open, 1500); };
    for (const [ev, fn] of Object.entries(handlers))
      es.addEventListener(ev, (e) => fn(e.data ? JSON.parse(e.data) : {}));
  };
  open();
}

export const api = {
  get: (url) => fetch(url).then((r) => r.json()),
  post: (url, body) => fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j; }),
};
