// A short guided tour of what he has to do: spotlight, one sentence, Next, Back, Skip.
// Same look and mechanics as the ApexLine safety demo tour. Starts once after the
// welcome, and again from Settings, "Take the tour again".
import { state, save } from './store.js';
import { bus } from './ui.js';

const mob = () => window.innerWidth <= 760;
const $ = (s) => document.querySelector(s);
const tab = (v) => { const b = $(`[data-act="today-tab"][data-v="${v}"]`); if (b && mob() && !b.classList.contains('on')) b.click(); };

const STEPS = [
  { id: 'plan', title: 'Your day plan', body: 'This is your day: the gym, food and family are fixed, and your jobs fit round them.',
    prep: () => tab('plan'), target: () => (mob() ? $('.timeline') : $('[data-panel="plan"]')) },
  { id: 'clock', title: 'Start the clock', body: 'Press Start the clock on your first job, and it tells you when time is nearly up.',
    prep: () => tab('tasks'), target: () => $('.start-big') || $('.focus') },
  { id: 'ticks', title: 'Tick your daily ticks', body: 'Tap each tick when it is done, like Trained or Water, to keep your streaks going.',
    target: () => $('.ticks-card') },
  { id: 'brief', title: 'Brief me', body: 'Tap Brief me and it reads out your day, your ads and your money.',
    target: () => $('[data-brief]') },
  { id: 'mind', title: 'Meditate and think', body: 'Meditate for 5 minutes every morning, and do your deep thinking twice a week: press play on them in your day plan.',
    target: () => $('.think-card') },
  { id: 'ads', title: 'Your ads advice', body: 'Your ads advice is here: small, safe suggestions, and nothing changes unless you press Approve.', end: true,
    target: () => (mob() ? $('#tabbar a[href="#ads"]') : $('#sidebar-nav a[href="#ads"]')) },
];

let run = null;
let spot;
let card;
let ticker;
const visible = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };

function build() {
  if (spot) return;
  spot = document.createElement('div');
  spot.className = 'tr-spot none';
  spot.setAttribute('aria-hidden', 'true');
  card = document.createElement('div');
  card.className = 'tr-card';
  card.dataset.tour = '';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided tour');
  card.setAttribute('aria-live', 'polite');
  document.body.append(spot, card);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });
  ticker = setInterval(place, 250);
}

function teardown() {
  spot?.remove();
  card?.remove();
  spot = card = null;
  clearInterval(ticker);
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', place);
  window.removeEventListener('scroll', place);
  document.documentElement.classList.remove('touring');
}

function onKey(e) {
  if (!run) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); back(); }
}

function place() {
  if (!run || !spot || !card) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 6;
  if (!visible(run.el)) run.el = STEPS[run.i].target(); // the page was redrawn
  const el = run.el;
  if (!visible(el)) {
    spot.classList.add('none');
    card.classList.toggle('center', !mob());
    card.style.left = card.style.top = '';
    return;
  }
  const r0 = el.getBoundingClientRect();
  spot.classList.remove('none');
  card.classList.remove('center');
  const m = mob();
  // On a phone the card sits along the bottom, or along the top when the target is low down.
  card.classList.toggle('top', m && r0.top > vh * 0.5);
  const cr = card.getBoundingClientRect();
  const maxB = m && !card.classList.contains('top') ? vh - cr.height - 12 : vh - 6;
  const minT = m && card.classList.contains('top') ? cr.height + 14 : 4;
  const l = Math.max(4, r0.left - pad);
  const t = Math.max(minT, r0.top - pad);
  const rr = Math.min(vw - 4, r0.right + pad);
  let b = Math.min(maxB, r0.bottom + pad);
  if (b - t < 24) b = t + 24;
  Object.assign(spot.style, { left: `${l}px`, top: `${t}px`, width: `${Math.max(0, rr - l)}px`, height: `${Math.max(0, b - t)}px` });
  if (m) { card.style.left = card.style.top = ''; return; }
  const cw = cr.width;
  const ch = cr.height;
  const gap = 18;
  let x;
  let y;
  if (rr + gap + cw < vw - 8) { x = rr + gap; y = t; }
  else if (l - gap - cw > 8) { x = l - gap - cw; y = t; }
  else if (b + gap + ch < vh - 8) { x = l; y = b + gap; }
  else if (t - gap - ch > 8) { x = l; y = t - gap - ch; }
  else { x = vw - cw - 16; y = vh - ch - 16; }
  card.style.left = `${Math.max(8, Math.min(x, vw - cw - 8))}px`;
  card.style.top = `${Math.max(8, Math.min(y, vh - ch - 8))}px`;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function paint() {
  const s = STEPS[run.i];
  const n = STEPS.length;
  card.classList.toggle('end', !!s.end);
  card.innerHTML = `<div class="tr-top"><span class="tr-n">${run.i + 1} of ${n}</span><button type="button" class="tr-skip" data-tr="skip">${s.end ? 'Close' : 'Skip tour'}</button></div>
    <div class="tr-bar"><i style="width:${Math.round(((run.i + 1) / n) * 100)}%"></i></div>
    <h2 class="tr-h">${esc(s.title)}</h2>
    <p class="tr-p">${esc(s.body)}</p>
    <div class="tr-btns"><button type="button" class="tr-back" data-tr="back" ${run.i === 0 ? 'disabled' : ''}>Back</button><button type="button" class="tr-next" data-tr="${s.end ? 'skip' : 'next'}">${s.end ? 'Done' : 'Next'}</button></div>`;
  card.querySelectorAll('[data-tr]').forEach((b) => {
    const a = b.dataset.tr;
    b.onclick = a === 'next' ? next : a === 'back' ? back : stop;
  });
  place();
  try { card.querySelector('.tr-next').focus({ preventScroll: true }); } catch { /* fine */ }
}

function reveal(el) {
  if (!el || getComputedStyle(el).position === 'fixed' || el.closest('#tabbar, .sidebar')) return;
  const r = el.getBoundingClientRect();
  const room = mob() ? window.innerHeight * 0.5 : window.innerHeight - 40;
  if (r.top < 70 || r.bottom > room) window.scrollTo(0, Math.max(0, window.scrollY + r.top - (mob() ? 80 : 110)));
}

function show(i) {
  if (!run) return;
  run.i = i;
  const s = STEPS[i];
  if (s.prep) s.prep();
  run.el = s.target();
  reveal(run.el);
  document.documentElement.dataset.tourStep = s.id;
  paint();
}

function next() { if (!run) return; if (run.i >= STEPS.length - 1) { stop(); return; } show(run.i + 1); }
function back() { if (!run || run.i === 0) return; show(run.i - 1); }

export function stop() {
  if (!run) return;
  run = null;
  teardown();
  delete document.documentElement.dataset.tourStep;
  state.profile.toured = true;
  save();
  if (mob()) { const b = $('[data-act="today-tab"][data-v="tasks"]'); if (b && !b.classList.contains('on')) b.click(); }
  window.scrollTo(0, 0);
}

export function start() {
  if (run) stop();
  const away = (location.hash || '#today') !== '#today';
  if (away) location.hash = '#today';
  run = { i: 0, el: null };
  document.documentElement.classList.add('touring');
  build();
  if (away) setTimeout(() => { if (run) show(0); }, 120);
  else show(0);
}

export const active = () => !!run;
export const steps = () => STEPS.map((s) => s.id);

// Called from the welcome (first time only) and from Settings (any time).
bus.tour = (force = false) => { if (force || !state.profile.toured) setTimeout(start, force ? 50 : 350); };
