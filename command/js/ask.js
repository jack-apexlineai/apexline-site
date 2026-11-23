// Ask Command: a small chat panel. In this version it answers a handful of plain-English
// requests on the device, using the app's own data and functions. It is not Claude and
// never says it is. Claude switches on with his login (phase 2, server side).
import { state } from './store.js';
import { ymd, esc, fmtDur, niceTime, hmToMins } from './util.js';
import { icon } from './icons.js';
import { bus } from './ui.js';
import { isOpen } from './planner.js';
import { planFor } from './today.js';
import { getAds, pendingCount, KPI } from './ads.js';
import { accountWindow } from './advice.js';
import { money, num } from './util.js';
import { HABITS } from './sample.js';
import { ticked } from './habits.js';
import { doExport, doReset, doWipe, setSound, setDeep } from './settings.js';
import { fixedFor, doneOn } from './mind.js';
import * as timer from './timer.js';

const today = () => ymd();
const DAYS = [['sun', 0], ['mon', 1], ['tue', 2], ['wed', 3], ['thu', 4], ['fri', 5], ['sat', 6]];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const LABEL = 'Basic answers for now. Claude switches on with your login.';
export const SUGGEST = ['What should I do today?', 'How did my ads do this week?', 'What does ROAS mean?', 'Turn sounds on', 'Change my deep thinking days', 'Download a backup'];

let log = [];
let awaitingDays = false;
let pending = {}; // button id -> function
let n = 0;

const btn = (label, fn, kind = 'ghost') => { const id = `a${++n}`; pending[id] = fn; return { id, label, kind }; };
const say = (text, buttons = []) => { log.push({ who: 'cmd', text, buttons }); };
const goTo = (hash) => () => { location.hash = hash; close(); };

const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

// ---------- What it understands ----------
function answer(raw) {
  const q = raw.toLowerCase().replace(/[’']/g, '').trim();
  const has = (re) => re.test(q);
  const wasAwaiting = awaitingDays;
  awaitingDays = false;

  // Risky money moves: advise against, offer a small safe step, and leave the call with him.
  if (has(/\b(double|triple|boost|increase|raise|extra|more|pump|throw|put|add|bump|up|max|maximise|maximize)\b/) && has(/\b(ads?|budget|spend|spending|meta|campaigns?)\b|£/) && !has(/^(how|what does|whats)\b/)) {
    return riskyAnswer(q);
  }
  if (has(/\b(back ?up|download|export)\b/)) {
    const file = doExport();
    return say(`Done. Your backup is downloading as ${file}. Keep it somewhere safe.`);
  }
  if (has(/\breset\b/) && has(/\bsample\b|\bdata\b|\beverything\b|\bapp\b/)) {
    return say('This puts tasks, ticks, money and ad approvals back to the starting sample. Your settings and your thinking sessions stay. Are you sure?', [
      btn('Yes, reset it', () => { doReset(); say('Done. The sample data is back to the start.'); }, 'danger'),
      btn('No, leave it', () => say('Fine, nothing changed.')),
    ]);
  }
  if (has(/start (empty|fresh|again|from scratch)|clear (it|everything|all)|wipe|delete everything|empty app/)) {
    return say('This clears every task, tick and transaction on this device so you can use it for real. Ads stay on sample numbers until Meta is connected. It cannot be undone. Download a backup first if you want one. Clear everything?', [
      btn('Yes, clear everything', () => { doWipe(); say('Done. The app is empty and ready for your first task on Today.'); }, 'danger'),
      btn('No, keep it', () => say('Fine, nothing changed.')),
    ]);
  }
  if (has(/\bsounds?\b|\bmute\b|\bquiet\b/)) {
    const off = has(/\boff\b|\bmute\b|\bquiet\b|\bstop\b|\bno sound/);
    const on = has(/\bon\b|\bunmute\b|\benable\b|\bback\b/);
    if (!off && !on) return say(`Sounds are ${state.settings.sound ? 'on' : 'off'} at the moment. Say "turn sounds on" or "turn sounds off".`);
    setSound(!off);
    return say(off ? 'Sounds are off.' : 'Sounds are on. That was the perfect-day chime.');
  }
  const dayWords = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day|s|nesday|sday|rsday|urday)?\b/;
  if ((has(/deep|thinking/) && has(/day|change|move|switch|\bon\b|\bat\b/)) || (wasAwaiting && (has(dayWords) || has(/\d\s*(am|pm)/)))) {
    const days = DAYS.filter(([d]) => new RegExp(`\\b${d}(s|day|days|nesday|sday|rsday|urday|r|rs|ur)?\\b`).test(q)).map(([, v]) => v);
    const tm = q.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    let start = state.settings.deep.start;
    if (tm) {
      let h = +tm[1] % 12;
      if (tm[3] === 'pm') h += 12;
      start = `${String(h).padStart(2, '0')}:${tm[2] || '00'}`;
    }
    const d = state.settings.deep;
    if (!days.length && !tm) {
      awaitingDays = true;
      return say(`Deep thinking is on ${listJoin(d.days.map((x) => DAY_NAMES[x]))} at ${niceTime(hmToMins(d.start))}. Which days do you want? For example: "deep thinking on Monday and Thursday at 10am".`);
    }
    const problem = setDeep(days.length ? days : d.days, start);
    if (problem) return say(problem);
    return say(`Done. Deep thinking is now on ${listJoin(state.settings.deep.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => DAY_NAMES[x]))} at ${niceTime(hmToMins(state.settings.deep.start))}. Your plan has been rebuilt.`);
  }
  const kpi = KPI.find((k) => has(new RegExp(`\\b(${k.label.toLowerCase()}${k.k === 'roas' ? '|return on ad spend' : ''})\\b`)));
  if (kpi && has(/mean|what is|whats|explain|meaning/)) return say(`${kpi.label}: ${kpi.explain}`);
  if (has(/\bads?\b|meta|roas|campaign/) && has(/how|week|doing|going|did|update/)) {
    const { advice } = getAds();
    const p = pendingCount();
    return say(`${advice.summary.slice(0, 3).join(' ')}${p ? ` ${p} suggestion${p === 1 ? ' is' : 's are'} waiting for your OK on the Ads page.` : ''} These are sample numbers until Meta is connected.`, [btn('Open Ads', goTo('#ads'), 'primary')]);
  }
  if (has(/what should i|todays plan|plan for today|my day|today|whats next|what next|first job|where do i start/)) return todayAnswer();
  if (has(/tour|show me around|how does (this|it) work|help me/)) {
    close();
    bus.tour(true);
    return null;
  }
  if (has(/^(hi|hello|hey|morning|evening|afternoon)\b/)) return say(`Morning, ${state.profile.name || 'John'}. Ask me one of these, or tap one below.`);
  return say('I can only do a few simple things for now: your day, your ads this week, what an ads number means, sounds on or off, your deep thinking days, a backup, resetting the sample or starting empty. Anything else needs Claude, which switches on with your login.');
}

function riskyAnswer(q) {
  const { data, advice } = getAds();
  const a = accountWindow(data, today(), 7);
  const s = state.settings.ads;
  const amt = q.match(/£\s?([\d,]+(?:\.\d+)?)\s*(k)?/);
  const asked = amt ? parseFloat(amt[1].replace(/,/g, '')) * (amt[2] ? 1000 : 1) : null;
  const vs = a.roas >= s.targetRoas ? `on your ${num(s.targetRoas, 2)} target` : a.roas >= 1 ? `under your ${num(s.targetRoas, 2)} target` : 'below break-even';
  const hasOff = advice.recs.some((r) => r.type === 'off');
  const hasScale = advice.recs.some((r) => r.type === 'scale');
  const step = hasOff ? 'turn off the ads that are losing money first, then, if you still want more, raise your best ad by 10% and wait 3 days' : hasScale ? 'approve the 10% step on your best ad on the Ads page, then wait 3 days and look again' : 'raise your best ad by 10% at most, and wait 3 days before anything more';
  return say(`I would advise against ${asked ? `putting an extra ${money(asked)} in` : 'that'}. It could burn money you cannot afford, and nothing in your numbers shows the extra would come back: last 7 days your ROAS was ${num(a.roas, 2)}, ${vs}, and your cap is ${money(s.budgetHigh)} a month. A safer step: ${step}. It is your decision. I will not change your ad spend: nothing changes in Meta unless you press Approve yourself.`, [btn('Open Ads', goTo('#ads'), 'primary')]);
}

function todayAnswer() {
  const t = today();
  const { sorted, plan } = planFor(t);
  const open = sorted.filter(isOpen);
  const parts = [];
  if (open.length) {
    const first = open[0];
    const slot = plan.items.find((i) => i.kind === 'task' && i.task.id === first.id);
    const left = open.reduce((a, x) => a + Math.max(0, x.mins - (x.spent || 0) / 60), 0);
    parts.push(`${open.length} job${open.length === 1 ? '' : 's'} today, ${fmtDur(left)} of work. First up: ${first.title}${slot ? ` at ${niceTime(slot.start)}` : ''}.`);
    if (open[1]) parts.push(`Then ${listJoin(open.slice(1, 3).map((x) => x.title))}.`);
  } else {
    parts.push('Your board is clear. Type what needs doing on Today.');
  }
  const fixed = fixedFor(t);
  if (fixed.some((f) => f.kind === 'meditate') && !ticked(t, 'meditate')) parts.push('Do your 5-minute meditation.');
  const deep = fixed.find((f) => f.kind === 'deep');
  if (deep && !doneOn(t)) parts.push(`Deep thinking at ${niceTime(hmToMins(deep.start))}.`);
  const todo = HABITS.filter((h) => !ticked(t, h.id)).length;
  if (todo) parts.push(`${todo} daily tick${todo === 1 ? '' : 's'} still to do.`);
  const p = pendingCount();
  if (p) parts.push(`${p} ad change${p === 1 ? '' : 's'} waiting for your OK.`);
  const buttons = open.length && !state.timer ? [btn(`Start "${open[0].title}"`, () => { timer.start(open[0].id); location.hash = '#today'; close(); bus.render(); }, 'primary')] : [];
  return say(parts.join(' '), buttons);
}

// ---------- The panel ----------
function bubbles() {
  return log.map((m) => `<div class="ask-msg ${m.who}">
      <p>${esc(m.text)}</p>
      ${m.buttons?.length ? `<div class="ask-btns">${m.buttons.map((b) => `<button class="btn ${b.kind} sm" data-ask="${b.id}">${esc(b.label)}</button>`).join('')}</div>` : ''}
    </div>`).join('');
}

function paint() {
  const el = document.querySelector('[data-ask-panel]');
  if (!el) return;
  const list = el.querySelector('.ask-log');
  list.innerHTML = bubbles();
  list.scrollTop = list.scrollHeight;
  el.querySelector('.ask-chips').innerHTML = SUGGEST.map((s) => `<button class="chip" data-ask-q="${esc(s)}">${esc(s)}</button>`).join('');
}

export function open() {
  if (document.querySelector('[data-ask-panel]')) return;
  if (!log.length) say(`Hello, ${state.profile.name || 'John'}. I can help with a few things in the app. Tap one below or type.`);
  const el = document.createElement('div');
  el.className = 'ask-panel';
  el.dataset.askPanel = '';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Ask Command');
  el.innerHTML = `<div class="ask-head">
      <div><strong>${icon('chat', 17)} Ask Command</strong><small>${esc(LABEL)}</small></div>
      <button class="icon-btn" data-ask-close aria-label="Close">${icon('x', 18)}</button>
    </div>
    <div class="ask-log" aria-live="polite"></div>
    <div class="ask-chips"></div>
    <form class="ask-form" data-ask-form>
      <input name="q" autocomplete="off" maxlength="200" placeholder="Type a question" aria-label="Your question">
      <button class="btn primary sm" type="submit" aria-label="Send">${icon('send', 16)}</button>
    </form>`;
  document.body.appendChild(el);
  document.body.classList.add('ask-open');
  paint();
  requestAnimationFrame(() => el.classList.add('in'));
  if (window.matchMedia('(pointer: fine)').matches) el.querySelector('input').focus();
}

export function close() {
  const el = document.querySelector('[data-ask-panel]');
  if (!el) return;
  el.remove();
  document.body.classList.remove('ask-open');
}

export function ask(text) {
  const t = String(text || '').trim();
  if (!t) return;
  log.push({ who: 'me', text: t });
  answer(t);
  paint();
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ask]');
  if (b && pending[b.dataset.ask]) {
    const fn = pending[b.dataset.ask];
    // One answer per question: the other buttons on that message stop working.
    const msg = log.find((m) => m.buttons?.some((x) => x.id === b.dataset.ask));
    if (msg) { msg.buttons.forEach((x) => delete pending[x.id]); msg.buttons = []; }
    log.push({ who: 'me', text: b.textContent.trim() });
    fn();
    paint();
    return;
  }
  const chip = e.target.closest('[data-ask-q]');
  if (chip) { ask(chip.dataset.askQ); return; }
  if (e.target.closest('[data-ask-close]')) close();
  if (e.target.closest('[data-ask-open]')) { e.preventDefault(); open(); }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-ask-form]');
  if (!f) return;
  e.preventDefault();
  const v = f.q.value;
  f.q.value = '';
  ask(v);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('[data-ask-panel]') && !document.querySelector('.sheet-wrap')) close();
});

// The round button, bottom right on a laptop. On a phone it is a tab.
export function fab() {
  return `<button class="ask-fab" data-ask-open aria-label="Ask Command">${icon('chat', 22)}</button>`;
}
