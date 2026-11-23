// Small shared helpers. No dependencies.

export const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD (never UTC, so late evenings stay on the right day).
export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function daysBetween(a, b) {
  return Math.round((fromYmd(b) - fromYmd(a)) / 86400000);
}

export function minsOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function hmToMins(hm) {
  if (!hm || typeof hm !== 'string' || !/^\d{1,2}:\d{2}$/.test(hm)) return null;
  const [h, m] = hm.split(':').map(Number);
  if (h > 24 || m > 59) return null;
  return h * 60 + m;
}

export function minsToHm(m) {
  m = Math.round(m);
  const h = Math.floor(m / 60) % 24;
  return `${pad(h)}:${pad(m % 60)}`;
}

// 13:30 -> "1:30pm", 07:00 -> "7am"
export function niceTime(m) {
  m = Math.round(m);
  let h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return mm ? `${h}:${pad(mm)}${ap}` : `${h}${ap}`;
}

export function fmtDur(mins) {
  mins = Math.max(0, Math.round(mins));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtClock(secs) {
  secs = Math.max(0, Math.floor(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n, pence = false) => (pence ? gbp2 : gbp0).format(n || 0);
export const num = (n, dp = 0) => (n || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const pct = (n, dp = 1) => `${num((n || 0) * 100, dp)}%`;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayName = (s) => DAY_NAMES[fromYmd(s).getDay()];
export const shortDay = (s) => dayName(s).slice(0, 3);
export const monthName = (i) => MONTHS[i];
export function longDate(s) {
  const d = fromYmd(s);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function shortDate(s) {
  const d = fromYmd(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

// Deterministic pseudo random, so sample data looks the same every time.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);
