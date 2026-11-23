// The "personal Jarvis" layer: the boot moment, the morning briefing (read aloud
// on a tap), the perfect-day moment and numbers that count up.
import { state, save } from './store.js';
import { ymd, esc, fmtDur, niceTime, minsOfDay, hmToMins, money, num, monthName } from './util.js';
import { icon } from './icons.js';
import { bus } from './ui.js';
import { isOpen } from './planner.js';
import { getAds, pendingCount } from './ads.js';
import { accountWindow } from './advice.js';
import { monthTotals } from './money.js';
import { streak, countFor } from './habits.js';
import { HABITS } from './sample.js';
import { play } from './sound.js';

const today = () => ymd();
export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------- Boot ----------
let booting = false;
let revealed = false;
let revealUntil = 0;
export const isBooting = () => booting;

export function shouldBoot() {
  return !calm() && state.bootDay !== today();
}

export function boot(onDone = () => {}) {
  state.bootDay = today();
  save();
  booting = true;
  const el = document.createElement('div');
  el.className = 'boot';
  el.setAttribute('aria-hidden', 'true');
  el.dataset.boot = '';
  el.innerHTML = `<div class="boot-core">
      <div class="boot-mark">${icon('flame', 40)}</div>
      <div class="boot-word">Command</div>
      <div class="boot-line"><span></span></div>
      <ul class="boot-status">
        ${['Calendar', 'Ads', 'Money', 'Ticks'].map((w, i) => `<li style="--i:${i}">${w}</li>`).join('')}
        <li class="ok" style="--i:4">Online</li>
      </ul>
    </div>`;
  document.body.appendChild(el);
  play('boot');
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    el.classList.add('out');
    setTimeout(() => { el.remove(); booting = false; onDone(); reveal(); }, 420);
  };
  el.addEventListener('pointerdown', end);
  setTimeout(end, 2300);
  return el;
}

// ---------- Briefing ----------
const SHORT = { content: 'Posted', amazon: 'Amazon', water: 'Water', applied: 'Applied', learning: 'Learning', read: 'Read', trained: 'Trained' };
const s = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function spokenDur(mins) {
  mins = Math.max(0, Math.round(mins));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? s(h, 'hour') : '', m ? s(m, 'minute') : ''].filter(Boolean).join(' ') || '0 minutes';
}
const spokenMoney = (n) => `${num(Math.abs(Math.round(n)))} pounds`;

export function briefLines(date, sorted, plan) {
  const lines = [];
  const nowM = minsOfDay();

  // Today
  const open = sorted.filter(isOpen);
  if (open.length) {
    const first = open[0];
    const left = open.reduce((a, t) => a + Math.max(0, t.mins - (t.spent || 0) / 60), 0);
    const slot = plan.items.find((i) => i.kind === 'task' && i.task.id === first.id);
    const gym = state.settings.fixed.find((f) => f.kind === 'training' && hmToMins(f.start) > nowM);
    const at = slot ? ` at ${niceTime(slot.start)}` : '';
    const gymT = gym ? ` Gym at ${niceTime(hmToMins(gym.start))}.` : '';
    lines.push({
      k: 'Today',
      text: `${s(open.length, 'job')}, ${fmtDur(left)} of work. First up: ${first.title}${at}.${gymT}`,
      say: `${s(open.length, 'job')} today, ${spokenDur(left)} of work. First up, ${first.title}${at}.${gymT}`,
    });
  } else {
    lines.push({ k: 'Today', text: 'Board is clear. Type what needs doing below.', say: 'The board is clear. Tell me what needs doing.' });
  }

  // Ads
  const { data } = getAds();
  const a = accountWindow(data, today(), 7);
  const t = state.settings.ads.targetRoas;
  const vs = a.roas >= t ? 'on target' : a.roas >= t - 0.1 ? `just under your ${num(t, 2)} target` : a.roas >= 1 ? `under your ${num(t, 2)} target` : 'below break-even';
  const acts = pendingCount();
  const waiting = acts ? `${s(acts, 'change')} waiting for your OK.` : 'No changes needed.';
  lines.push({
    k: 'Ads',
    text: `Last 7 days: ${money(a.spend)} spent, ROAS ${num(a.roas, 2)}, ${vs}. ${waiting}`,
    say: `Ads, last 7 days. ${spokenMoney(a.spend)} spent, return on ad spend ${num(a.roas, 2)}, ${vs}. ${waiting.replace('OK', 'okay')}`,
  });

  // Money
  const ym = today().slice(0, 7);
  const m = monthTotals(ym);
  const mon = monthName(+ym.slice(5) - 1);
  const leftWord = m.profit >= 0 ? 'left' : 'down';
  lines.push({
    k: 'Money',
    text: `${mon} so far: ${money(m.inn)} in, ${money(m.out)} out, ${money(Math.abs(m.profit))} ${leftWord}.`,
    say: `Money. ${mon} so far, ${spokenMoney(m.inn)} in, ${spokenMoney(m.out)} out, ${spokenMoney(m.profit)} ${leftWord}.`,
  });

  // Streaks
  const runs = HABITS.map((h) => ({ h, n: streak(h.id, date).n })).filter((r) => r.n >= 2).sort((x, y) => y.n - x.n).slice(0, 2);
  const todo = HABITS.length - countFor(date);
  const runTxt = runs.map((r, i) => (i === 0 ? `${SHORT[r.h.id]} ${r.n} days running` : `${SHORT[r.h.id]} ${r.n}`)).join(', ');
  const todoTxt = todo ? `${s(todo, 'tick')} to do today.` : `All ${HABITS.length} ticked. Perfect day.`;
  lines.push({
    k: 'Streaks',
    text: `${runTxt ? `${runTxt}. ` : ''}${todoTxt}`,
    say: `Streaks. ${runTxt ? `${runTxt}. ` : ''}${todoTxt}${todo && runs.length ? ' Do not break them.' : ''}`,
  });
  return lines;
}

let speaking = false;
let lastLines = [];
export const canSpeak = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export function briefCard(date, sorted, plan) {
  lastLines = briefLines(date, sorted, plan);
  if (!revealed && !booting) { revealed = true; revealUntil = Date.now() + 400; }
  // A redraw straight after the reveal (e.g. closing the welcome) keeps the animation.
  const cls = !revealed ? 'pre' : Date.now() < revealUntil ? 'reveal' : '';
  return `<section class="card brief ${cls}" data-brief aria-label="Your briefing">
    <div class="brief-head">
      <span class="eyebrow">${icon('spark', 14)} Your briefing</span>
      ${canSpeak() ? `<button class="btn ${speaking ? 'primary' : 'ghost'} sm brief-play" data-act="brief-play" aria-pressed="${speaking}">${icon(speaking ? 'stop' : 'speaker', 16)}<span>${speaking ? 'Stop' : 'Brief me'}</span></button>` : ''}
    </div>
    <ol class="brief-list">
      ${lastLines.map((l, i) => `<li data-line="${i}" style="--i:${i}"><span class="brief-k">${esc(l.k)}</span><span class="brief-t">${esc(l.text)}</span></li>`).join('')}
    </ol>
  </section>`;
}

// Lines come in once the boot is gone. If the welcome sheet is up (first ever open),
// they wait and come in on the next draw, when the sheet is closed.
function reveal() {
  if (document.body.classList.contains('has-sheet')) return;
  const el = document.querySelector('[data-brief]');
  revealed = true;
  revealUntil = Date.now() + 400;
  if (el && el.classList.contains('pre')) {
    el.classList.remove('pre');
    void el.offsetWidth;
    el.classList.add('reveal');
  }
}

function pickVoice() {
  const vs = window.speechSynthesis.getVoices() || [];
  const gb = vs.filter((v) => /en[-_]GB/i.test(v.lang));
  return gb.find((v) => /daniel|arthur|uk english male/i.test(v.name)) || gb[0] || vs.find((v) => /^en/i.test(v.lang)) || null;
}

function markLine(i) {
  document.querySelectorAll('[data-brief] li').forEach((li) => li.classList.toggle('speaking', +li.dataset.line === i));
}

function setButton() {
  const b = document.querySelector('[data-act="brief-play"]');
  if (!b) return;
  b.classList.toggle('primary', speaking);
  b.classList.toggle('ghost', !speaking);
  b.setAttribute('aria-pressed', String(speaking));
  b.innerHTML = `${icon(speaking ? 'stop' : 'speaker', 16)}<span>${speaking ? 'Stop' : 'Brief me'}</span>`;
}

export function stopSpeaking() {
  speaking = false;
  try { window.speechSynthesis.cancel(); } catch { /* not supported */ }
  markLine(-1);
  setButton();
}

// Must run straight from the tap: iPhone Safari only speaks inside a user gesture.
export function speak() {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis;
  if (speaking) { stopSpeaking(); return false; }
  synth.cancel();
  const voice = pickVoice();
  const h = new Date().getHours();
  const hello = `${h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'}, ${state.profile.name || 'John'}. Here is your briefing.`;
  const parts = [{ i: -1, say: hello }, ...lastLines.map((l, i) => ({ i, say: l.say }))];
  speaking = true;
  setButton();
  parts.forEach((p, n) => {
    const u = new SpeechSynthesisUtterance(p.say);
    u.lang = 'en-GB';
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 0.95;
    u.onstart = () => markLine(p.i);
    if (n === parts.length - 1) {
      u.onend = () => { speaking = false; markLine(-1); setButton(); };
      u.onerror = u.onend;
    }
    synth.speak(u);
  });
  return true;
}

// ---------- Perfect day ----------
export function perfectDay(date) {
  if (date !== today() || state.perfectDay === date) return false;
  if (document.querySelector('[data-calm], [data-think]')) return false; // shown when that screen closes
  state.perfectDay = date;
  save();
  const drill = state.settings.tone !== 'firm';
  const line = drill ? `Outstanding work, ${state.profile.surname || 'Simpson'}. That is the standard.` : `All ${HABITS.length} done. Excellent day.`;
  document.querySelector('[data-perfect]')?.remove();
  const el = document.createElement('div');
  el.className = 'perfect';
  el.dataset.perfect = '';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="perfect-card">
      <div class="perfect-mark">${icon('flame', 34)}</div>
      <strong>Perfect day</strong>
      <span>All ${HABITS.length} ticked. ${esc(line)}</span>
    </div>`;
  document.body.appendChild(el);
  play('perfect');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2600);
  return true;
}
bus.perfect = perfectDay;

// ---------- Count up ----------
const COUNT = '.stat-val:not(.sm), .ads-mini .mini-kpis strong, .kpi-val, .mt strong';
const NUM = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

export function countUp(root = document) {
  if (calm()) return;
  root.querySelectorAll(COUNT).forEach((el) => {
    const txt = el.textContent.trim();
    const m = txt.match(NUM);
    if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, ''));
    if (!target || !isFinite(target)) return;
    const dp = (m[2].split('.')[1] || '').length;
    const commas = m[2].includes(',') || target >= 1000;
    const fmt = (v) => `${m[1]}${v.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp, useGrouping: commas })}${m[3]}`;
    const t0 = performance.now();
    const dur = 700;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = p >= 1 ? txt : fmt(target * e);
      if (p < 1 && el.isConnected) requestAnimationFrame(step);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  });
}
