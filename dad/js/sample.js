// Realistic sample data for INFRNO / Musclefier. Everything here is made up and
// deterministic, so the app works fully offline before any account is connected.
// When live, integrations.js swaps these generators for real Meta, Shopify and Google data.

import { ymd, addDays, rng, hash, fromYmd, uid } from './util.js';

export const AOV = 39; // average order value, GBP

// ---------- Meta ads ----------
// ago = days before today (1 = yesterday). Each profile returns that day's shape.
const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

export const AD_DEFS = [
  {
    id: 'ad_ugc', name: 'UGC: gym bag unboxing', campaign: 'INFRNO | Prospecting | Broad', angle: 'ugc', format: 'Video', start: 60, budget: 6,
    shape: (ago) => ({ roas: 2.2, ctr: 0.019, cpm: 9.4, freq: lerp(1.3, 1.75, (60 - ago) / 60) }),
  },
  {
    id: 'ad_founder', name: 'Founder story video', campaign: 'INFRNO | Prospecting | Broad', angle: 'founder', format: 'Video', start: 60, budget: 4.5,
    shape: () => ({ roas: 1.62, ctr: 0.014, cpm: 10.6, freq: 1.95 }),
  },
  {
    id: 'ad_static', name: 'Pre-workout burn static', campaign: 'INFRNO | Prospecting | Broad', angle: 'static', format: 'Image', start: 60, budget: 3.5,
    shape: (ago) => ({ roas: ago > 21 ? 1.08 : 0.35, ctr: 0.0088, cpm: 11.2, freq: 2.4 }),
  },
  {
    id: 'ad_testimonial', name: 'Testimonial reel: Dave, 52', campaign: 'INFRNO | Prospecting | Broad', angle: 'testimonial', format: 'Reel', start: 60, budget: 5,
    shape: (ago) => {
      const t = ago > 25 ? 0 : (25 - ago) / 24;
      return { roas: lerp(2.1, 0.92, t), ctr: lerp(0.021, 0.0105, t), cpm: lerp(9.8, 12.4, t), freq: lerp(1.9, 4.3, t) };
    },
  },
  {
    id: 'ad_bundle', name: 'Bundle offer carousel', campaign: 'INFRNO | Prospecting | Broad', angle: 'offer', format: 'Carousel', start: 60, budget: 3.5,
    shape: () => ({ roas: 1.46, ctr: 0.015, cpm: 10.1, freq: 2.2 }),
  },
  {
    id: 'ad_retarget', name: 'Retargeting: free UK delivery', campaign: 'INFRNO | Retargeting | 30 days', angle: 'delivery', format: 'Image', start: 60, budget: 2.5, retargeting: true,
    shape: () => ({ roas: 3.05, ctr: 0.024, cpm: 14.2, freq: 4.6 }),
  },
  {
    id: 'ad_musclefier', name: 'Musclefier demo video', campaign: 'Musclefier | Prospecting | Test', angle: 'demo', format: 'Video', start: 12, budget: 3,
    shape: () => ({ roas: 0.0, ctr: 0.0068, cpm: 9.1, freq: 1.5 }),
  },
  {
    id: 'ad_hoodie', name: 'Hoodie drop: winter range', campaign: 'INFRNO | Prospecting | Broad', angle: 'launch', format: 'Video', start: 3, budget: 3,
    shape: () => ({ roas: 1.25, ctr: 0.016, cpm: 10.2, freq: 1.1 }),
  },
];

// Builds 60 days of daily rows per ad plus Shopify daily sales.
export function sampleAds(today = ymd()) {
  const ads = AD_DEFS.map((def) => {
    const r = rng(hash(def.id));
    let acc = 0.5; // carries fractional purchases so totals track the profile closely
    const daily = [];
    for (let ago = 60; ago >= 1; ago--) {
      const date = addDays(today, -ago);
      if (ago > def.start) continue;
      const s = def.shape(ago);
      const spend = +(def.budget * (0.86 + r() * 0.28)).toFixed(2);
      const cpm = s.cpm * (0.92 + r() * 0.16);
      const impr = Math.round((spend / cpm) * 1000);
      const clicks = Math.round(impr * s.ctr * (0.9 + r() * 0.2));
      const expPurch = (spend * s.roas) / AOV;
      const before = Math.floor(acc);
      acc += expPurch;
      const purchases = Math.floor(acc) - before;
      let revenue = 0;
      for (let i = 0; i < purchases; i++) revenue += AOV * (0.86 + r() * 0.3);
      daily.push({ date, spend, impr, clicks, purchases, revenue: +revenue.toFixed(2), freq: s.freq * (0.97 + r() * 0.06) });
    }
    return { ...def, status: 'active', daily };
  });

  const shopify = [];
  const r = rng(77);
  for (let ago = 60; ago >= 1; ago--) {
    const date = addDays(today, -ago);
    let metaRev = 0;
    ads.forEach((a) => { const d = a.daily.find((x) => x.date === date); if (d) metaRev += d.revenue; });
    const dow = fromYmd(date).getDay();
    const weekend = dow === 0 || dow === 6 ? 14 : 0;
    const sales = +(metaRev * 0.8 + 26 + r() * 16 + weekend).toFixed(2);
    shopify.push({ date, sales, orders: Math.max(1, Math.round(sales / AOV)) });
  }
  return { account: { name: 'INFRNO Ads (GBP)', id: 'act_sample' }, ads, shopify };
}

// ---------- Google Calendar ----------
export function sampleCalendar(date, today = ymd()) {
  if (date === today) return [{ id: 'cal1', title: 'Amazon agency monthly call', start: '11:00', end: '11:30', source: 'google' }];
  if (date === addDays(today, 1)) return [{ id: 'cal2', title: 'Accountant catch-up', start: '10:00', end: '10:45', source: 'google' }];
  if (date === addDays(today, 3)) return [{ id: 'cal3', title: 'Dentist', start: '16:00', end: '16:45', source: 'google' }];
  return [];
}

// ---------- Habits ----------
export const HABITS = [
  { id: 'trained', label: 'Trained', sub: 'Gym or a proper session', icon: 'dumbbell' },
  { id: 'content', label: 'Posted content', sub: 'At least one post', icon: 'camera' },
  { id: 'amazon', label: 'Checked Amazon', sub: 'Stock, orders, reviews', icon: 'box' },
  { id: 'water', label: 'Drank enough water', sub: 'About 8 glasses', icon: 'drop' },
  { id: 'read', label: 'Read', sub: '20 minutes or more', icon: 'book' },
  { id: 'learning', label: 'Learning', sub: 'Course, video or podcast', icon: 'brain' },
  { id: 'applied', label: 'Applied what I learned', sub: 'Used it in the business', icon: 'bolt' },
  { id: 'meditate', label: 'Meditated', sub: '5 minutes, every day', icon: 'leaf' },
];

function sampleHabits(today) {
  const out = {};
  const r = rng(4242);
  const odds = { trained: 0.78, content: 0.55, amazon: 0.82, water: 0.6, read: 0.5, learning: 0.48, applied: 0.36 };
  const forced = { trained: 6, amazon: 9, water: 3, content: 2, read: 4 }; // current streak lengths up to yesterday
  for (let ago = 42; ago >= 1; ago--) {
    const date = addDays(today, -ago);
    const dow = fromYmd(date).getDay();
    const day = {};
    HABITS.forEach((h) => {
      if (!(h.id in odds)) return; // new habits start fresh, no made-up history
      let p = odds[h.id];
      if (h.id === 'trained' && dow === 0) p = 0.15;
      let v = r() < p;
      if (forced[h.id] && ago <= forced[h.id]) v = true;
      if (forced[h.id] && ago === forced[h.id] + 1) v = false;
      if (v) day[h.id] = true;
    });
    out[date] = day;
  }
  out[today] = {};
  return out;
}

// ---------- Tasks ----------
function blackFriday(year) {
  const d = new Date(year, 10, 1);
  const firstThu = (4 - d.getDay() + 7) % 7 + 1;
  return ymd(new Date(year, 10, firstThu + 21 + 1));
}

function task(title, mins, deadline, money, extra = {}) {
  return { id: uid(), title, mins, deadline, money, status: 'todo', spent: 0, created: Date.now(), ...extra };
}

function sampleDays(today) {
  const days = {};
  const y = fromYmd(today).getFullYear();
  const bf = blackFriday(y);
  const promo = bf > today ? { title: 'Plan the Black Friday offer', deadline: addDays(bf, -3) < today ? today : addDays(bf, -3) } : { title: 'Plan the weekend promo', deadline: addDays(today, 3) };

  days[today] = {
    tasks: [
      task('Meta ads review and budget check', 45, today, 3),
      task('Amazon check-in: stock and reviews', 20, today, 2),
      task('Shopify check-in: orders and abandoned carts', 20, today, 2),
      task('Write 3 new ad hooks', 30, addDays(today, 1), 2, { rolledFrom: addDays(today, -1), rolled: 1 }),
      task(promo.title, 40, promo.deadline, 3),
      task('Film 2 gym reels for INFRNO', 60, addDays(today, 2), 2),
      task('Reply to supplier about hoodie restock', 15, today, 2),
      task('Life admin: car insurance renewal', 30, addDays(today, 4), 0),
    ],
    manual: false,
    closed: false,
  };

  // A week of finished days so recaps and history have something to show.
  const past = [
    ['Meta ads review', 45, 52, 'done'], ['Amazon check-in', 20, 18, 'done'], ['Shopify check-in', 20, 25, 'done'],
    ['Edit product photos', 60, 75, 'done'], ['Email the 3PL about returns', 15, 10, 'done'], ['Write 3 new ad hooks', 30, 0, 'rolled'],
  ];
  for (let ago = 7; ago >= 1; ago--) {
    const date = addDays(today, -ago);
    const r = rng(hash(date));
    const tasks = past.map(([t, m, s, st], i) => {
      let status = st;
      let spent = s * 60;
      if (ago !== 1) {
        status = r() < 0.8 ? 'done' : 'rolled';
        spent = status === 'done' ? Math.round(m * (0.7 + r() * 0.6)) * 60 : 0;
      }
      return task(t, m, date, i < 3 ? 3 : 1, { status, spent, doneAt: status === 'done' ? fromYmd(date).getTime() + (9 * 60 + i * 50) * 60000 : null });
    });
    days[date] = { tasks, manual: false, closed: true };
  }
  days[addDays(today, 1)] = { tasks: [], manual: false, closed: false };
  return days;
}

// ---------- Money ----------
const SUBS = [
  { day: 1, note: 'Co-working membership', cat: 'Office', amount: 195 },
  { day: 1, note: 'Amazon PPC agency fee', cat: 'Agency', amount: 350 },
  { day: 3, note: 'Shopify Basic plan', cat: 'Software', amount: 25 },
  { day: 5, note: 'Canva Pro', cat: 'Software', amount: 10.99 },
  { day: 8, note: 'ChatGPT Plus', cat: 'Software', amount: 20 },
  { day: 10, note: 'Buffer', cat: 'Software', amount: 12 },
  { day: 14, note: 'Google Workspace', cat: 'Software', amount: 5.9 },
  { day: 15, note: 'Accountant', cat: 'Accounts', amount: 60 },
];

export function sampleMoney(today = ymd()) {
  const tx = [];
  const ads = sampleAds(today);
  const start = addDays(today, -60);
  const add = (date, type, cat, note, amount, extra = {}) => {
    if (date > today || date < start) return;
    tx.push({ id: uid(), date, type, cat, note, amount: +amount.toFixed(2), ...extra });
  };
  // Meta bills each time spend crosses a £150 threshold.
  let metaAcc = 0;
  let shopAcc = 0;
  for (let ago = 60; ago >= 1; ago--) {
    const date = addDays(today, -ago);
    ads.ads.forEach((a) => { const d = a.daily.find((x) => x.date === date); if (d) metaAcc += d.spend; });
    if (metaAcc >= 150) { add(date, 'out', 'Meta ads', 'Meta ads billing', metaAcc, { source: 'meta' }); metaAcc = 0; }
    const s = ads.shopify.find((x) => x.date === date);
    shopAcc += s ? s.sales : 0;
    if (ago % 3 === 0) { add(date, 'in', 'Shopify', 'Shopify payout', shopAcc * 0.968, { source: 'shopify' }); shopAcc = 0; }
  }
  const r = rng(99);
  const t = fromYmd(today);
  for (let mo = -2; mo <= 0; mo++) {
    const base = new Date(t.getFullYear(), t.getMonth() + mo, 1);
    const ds = (day) => ymd(new Date(base.getFullYear(), base.getMonth(), day));
    SUBS.forEach((s) => add(ds(s.day), 'out', s.cat, s.note, s.amount, { recurring: true }));
    add(ds(6), 'in', 'Amazon', 'Amazon payout', 610 + r() * 120, { source: 'amazon' });
    add(ds(18), 'in', 'Amazon', 'Amazon payout', 640 + r() * 140, { source: 'amazon' });
    add(ds(9), 'out', 'Stock', 'Supplier: INFRNO stock order', 940 + Math.round(r() * 120));
    add(ds(12), 'out', 'Packaging', 'Mailer bags and boxes', 74 + r() * 30);
    [2, 9, 16, 23].forEach((d) => add(ds(d), 'out', 'Shipping', 'Royal Mail Click and Drop', 42 + r() * 22));
  }
  tx.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { tx };
}

// ---------- Full first-run state ----------
export function sampleState(today = ymd()) {
  return {
    days: sampleDays(today),
    habits: sampleHabits(today),
    money: sampleMoney(today),
    seededFor: today,
  };
}
