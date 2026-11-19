// Head space: the 5-minute meditation and the twice-weekly deep thinking sessions.
import { state, save } from './store.js';
import { ymd, addDays, fromYmd, esc, hmToMins, minsToHm, niceTime, fmtClock, longDate, shortDay, shortDate, uid } from './util.js';
import { icon } from './icons.js';
import { bus, openSheet, closeSheet, pill } from './ui.js';
import { toast, isIos } from './notify.js';
import { play } from './sound.js';
import { toggle, ticked, countFor } from './habits.js';
import { HABITS } from './sample.js';

const today = () => ymd();
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MEDITATE_SECS = 5 * 60;

// ---------- Keep the screen awake while he sits (where the phone allows it) ----------
let lock = null;
async function wake(on) {
  try {
    if (on && 'wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}

export const screenOpen = () => !!document.querySelector('[data-calm], [data-think]');

// The day's fixed blocks, plus deep thinking on his chosen days.
export function fixedFor(date) {
  const list = state.settings.fixed.slice();
  const d = state.settings.deep;
  if (d && d.days.includes(fromYmd(date).getDay())) {
    const s = hmToMins(d.start);
    if (s !== null) list.push({ id: 'f_deep', label: 'Deep thinking', start: d.start, end: minsToHm(s + d.mins), kind: 'deep' });
  }
  return list.sort((a, b) => hmToMins(a.start) - hmToMins(b.start));
}

// ---------- Meditation ----------
let med = null; // { endAt, left, timer, done }

function medHtml() {
  return `<div class="calm-screen" data-calm role="dialog" aria-modal="true" aria-label="Meditate">
    <button class="calm-x icon-btn" data-act="med-close" aria-label="Close">${icon('x', 20)}</button>
    <div class="calm-core">
      <div class="breath" data-breath-wrap>
        <div class="breath-ring"></div>
        <div class="breath-core"><span class="calm-clock" data-med-clock>5:00</span><small data-med-cue>Five minutes</small></div>
      </div>
      <p class="calm-line" data-med-line>Sit back, breathe slowly, let thoughts come and go.</p>
      <button class="btn primary big calm-go" data-act="med-go">${icon('play', 16)} Start</button>
    </div>
  </div>`;
}

const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function medTick() {
  const el = document.querySelector('[data-calm]');
  if (!el || !med) return;
  const left = med.endAt ? (med.endAt - Date.now()) / 1000 : med.left;
  el.querySelector('[data-med-clock]').textContent = mmss(left);
  if (med.endAt) {
    const gone = MEDITATE_SECS - left;
    el.querySelector('[data-med-cue]').textContent = gone % 10 < 4 ? 'Breathe in' : 'Breathe out';
  }
  if (med.endAt && left <= 0) medDone();
}

export function openMeditation() {
  if (screenOpen()) return;
  closeSheet(true);
  med = { endAt: null, left: MEDITATE_SECS, timer: null, done: false };
  document.body.insertAdjacentHTML('beforeend', medHtml());
  document.body.classList.add('has-screen');
  document.querySelector('[data-act="med-go"]').focus({ preventScroll: true });
}

function medGo() {
  const el = document.querySelector('[data-calm]');
  if (!el || !med || med.done) return;
  const btn = el.querySelector('[data-act="med-go"]');
  if (med.endAt) { // pause
    med.left = (med.endAt - Date.now()) / 1000;
    med.endAt = null;
    clearInterval(med.timer);
    el.classList.remove('running');
    el.querySelector('[data-med-cue]').textContent = 'Paused';
    btn.innerHTML = `${icon('play', 16)} Carry on`;
    wake(false);
    return;
  }
  med.endAt = Date.now() + med.left * 1000;
  el.classList.add('running');
  btn.innerHTML = `${icon('pause', 16)} Pause`;
  btn.classList.replace('primary', 'ghost');
  medTick();
  med.timer = setInterval(medTick, 250);
  wake(true);
}

function medDone() {
  const el = document.querySelector('[data-calm]');
  clearInterval(med.timer);
  med.done = true;
  med.endAt = null;
  wake(false);
  play('bell');
  const t = today();
  if (!ticked(t, 'meditate')) toggle(t, 'meditate', true);
  if (!el) return;
  el.classList.remove('running');
  el.classList.add('done');
  el.querySelector('[data-med-clock]').textContent = '0:00';
  el.querySelector('[data-med-cue]').textContent = 'Done';
  el.querySelector('[data-med-line]').textContent = 'Five minutes in. Meditated is ticked for today.';
  const btn = el.querySelector('[data-act="med-go"]');
  btn.dataset.act = 'med-close';
  btn.classList.replace('ghost', 'primary');
  btn.innerHTML = `${icon('check', 16)} Back to my day`;
}

function closeScreen(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 260);
  if (!document.querySelector('[data-calm]:not(.out), [data-think]:not(.out)')) document.body.classList.remove('has-screen');
}

function medClose() {
  if (med) clearInterval(med.timer);
  med = null;
  wake(false);
  closeScreen('[data-calm]');
  bus.render();
  setTimeout(() => { if (countFor(today()) === HABITS.length) bus.perfect(today()); }, 300);
}

// ---------- Deep thinking ----------
export const QUESTIONS = [
  'What do I actually want out of the next 5 years?',
  'What do I want this business to give me?',
  'Am I spending my days on the things that move me there?',
  "What would I do if I knew I couldn't fail?",
  'What am I avoiding?',
  'What one thing would make everything else easier?',
  'What would I stop doing if I was being honest with myself?',
  'Who do I need to become to get there?',
];

const th = () => state.thinking;

// Next suggestion in the rotation, never the one he used last time.
export function suggested() {
  let i = (th().next || 0) % QUESTIONS.length;
  if (QUESTIONS[i] === th().lastQ) i = (i + 1) % QUESTIONS.length;
  return i;
}

const weekStart = (date) => addDays(date, -((fromYmd(date).getDay() + 6) % 7));
export const target = () => Math.max(1, (state.settings.deep?.days || []).length || 2);

export function weekCount(date = today()) {
  const ws = weekStart(date);
  return th().sessions.filter((s) => weekStart(s.date) === ws).length;
}

// Weeks in a row with his sessions done. This week counts once it is done.
export function weekStreak(date = today()) {
  let ws = weekStart(date);
  if (weekCount(ws) < target()) ws = addDays(ws, -7);
  let n = 0;
  while (weekCount(ws) >= target() && n < 520) { n++; ws = addDays(ws, -7); }
  return n;
}

export const doneOn = (date) => th().sessions.some((s) => s.date === date);

export function nextSlot(from = today()) {
  const d = state.settings.deep;
  for (let i = 0; i < 8; i++) {
    const date = addDays(from, i);
    if (d.days.includes(fromYmd(date).getDay()) && !(i === 0 && doneOn(date))) return { date, label: `${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[fromYmd(date).getDay()]} ${niceTime(hmToMins(d.start))}` };
  }
  return null;
}

function pickSheet() {
  const s = suggested();
  const list = QUESTIONS.map((q, i) => ({ q, i })).filter((x) => x.q !== th().lastQ);
  list.sort((a, b) => (a.i === s ? -1 : b.i === s ? 1 : 0));
  openSheet(`<div class="think-pick">
    <div class="ask-icon">${icon('think', 26)}</div>
    <h2>Deep thinking</h2>
    <p class="muted">${state.settings.deep.mins} minutes on one question. Pick one, or write your own.</p>
    <form data-form="think-start" class="form" novalidate>
      <div class="q-list" role="radiogroup" aria-label="Questions">
        ${list.map((x) => `<label class="q-opt"><input type="radio" name="q" value="${x.i}" ${x.i === s ? 'checked' : ''}><span>${esc(x.q)}</span>${x.i === s ? pill('Suggested', 'plain') : ''}</label>`).join('')}
        <label class="q-opt q-own"><input type="radio" name="q" value="own"><span>My own question</span></label>
      </div>
      <input class="q-own-input" name="own" maxlength="160" placeholder="Write your own question" aria-label="Your own question">
      <p class="form-err" id="think-err" role="alert"></p>
      <p class="dnd-hint">${icon('moon', 15)}<span>Switch on Do Not Disturb first. The app cannot do that for you.</span></p>
      <button class="btn primary big" type="submit">Begin</button>
    </form>
  </div>`, { id: 'think-pick' });
}

export function startThinking() {
  if (th().active) { openFocus(); return; }
  pickSheet();
}

export const thinkForms = {
  'think-start': (f) => {
    const v = (f.querySelector('input[name=q]:checked') || {}).value;
    const own = f.own.value.trim();
    let q;
    if (v === 'own' || (own && v === undefined)) {
      if (!own) { f.querySelector('#think-err').textContent = 'Write your question, or pick one above.'; f.own.focus(); return; }
      q = own;
    } else {
      const i = +v;
      q = QUESTIONS[i];
      th().next = i + 1;
    }
    th().lastQ = q;
    th().active = { id: uid(), q, text: '', startedAt: Date.now() };
    save();
    closeSheet(true);
    openFocus();
  },
};

const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const canDictate = () => !!SR() && !isIos();
let rec = null;
let saveT = 0;
let focusTimer = 0;
let chimed = false;

function focusTick() {
  const a = th().active;
  const el = document.querySelector('[data-think]');
  if (!a || !el) return;
  const total = state.settings.deep.mins * 60;
  const gone = (Date.now() - a.startedAt) / 1000;
  const c = el.querySelector('[data-think-clock]');
  if (gone >= total) {
    c.textContent = `${state.settings.deep.mins} minutes done`;
    el.classList.add('time-up');
    if (!chimed && !a.chimed) { chimed = true; a.chimed = true; save(); play('bell'); }
  } else {
    c.textContent = `${fmtClock(total - gone)} left`;
  }
}

export function openFocus() {
  const a = th().active;
  if (!a || document.querySelector('[data-think]')) return;
  closeSheet(true);
  chimed = !!a.chimed;
  const showTime = !!state.settings.deep.showTime;
  document.body.insertAdjacentHTML('beforeend', `<div class="think-page ${showTime ? 'show-time' : ''}" data-think role="dialog" aria-modal="true" aria-label="Deep thinking">
    <div class="think-inner">
      <header class="think-top">
        <span class="eyebrow">${icon('think', 14)} Deep thinking</span>
        <div class="think-tools">
          <button class="think-tool" data-act="think-time" aria-pressed="${showTime}" aria-label="${showTime ? 'Hide' : 'Show'} the timer">${icon('clock', 16)}<span data-think-clock></span></button>
          ${canDictate() ? `<button class="think-tool" data-act="think-speak" aria-pressed="false">${icon('mic', 16)}<span>Speak instead</span></button>` : ''}
          <span class="think-saved" data-think-saved aria-live="polite"></span>
          <button class="btn ghost sm" data-act="think-finish">Finish</button>
        </div>
      </header>
      <h1 class="think-q">${esc(a.q)}</h1>
      <textarea class="think-text" data-think-text aria-label="Your answer" placeholder="Start writing. It saves as you type.">${esc(a.text)}</textarea>
      ${isIos() ? '<p class="think-hint">To speak instead, tap the mic on your keyboard.</p>' : ''}
    </div>
  </div>`);
  document.body.classList.add('has-screen');
  const ta = document.querySelector('[data-think-text]');
  ta.addEventListener('input', () => queueSave(ta.value));
  focusTick();
  clearInterval(focusTimer);
  focusTimer = setInterval(focusTick, 1000);
  wake(true);
  if (window.matchMedia('(pointer: fine)').matches) ta.focus({ preventScroll: true });
}

function queueSave(text) {
  const a = th().active;
  if (!a) return;
  a.text = text;
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    save();
    const s = document.querySelector('[data-think-saved]');
    if (s) { s.textContent = 'Saved'; s.classList.remove('fade'); void s.offsetWidth; s.classList.add('fade'); }
  }, 400);
}

function flush() {
  const ta = document.querySelector('[data-think-text]');
  if (ta && th().active) { th().active.text = ta.value; clearTimeout(saveT); save(); }
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

function stopDictation() {
  if (rec) { try { rec.stop(); } catch { /* already stopped */ } }
  rec = null;
  const b = document.querySelector('[data-act="think-speak"]');
  if (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('on'); b.querySelector('span').textContent = 'Speak instead'; }
}

function dictate() {
  if (rec) { stopDictation(); return; }
  const Rec = SR();
  if (!Rec) return;
  const ta = document.querySelector('[data-think-text]');
  const b = document.querySelector('[data-act="think-speak"]');
  try {
    rec = new Rec();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let said = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript;
      said = said.trim();
      if (!said || !ta) return;
      ta.value = `${ta.value}${ta.value && !/\s$/.test(ta.value) ? ' ' : ''}${said.charAt(0).toUpperCase()}${said.slice(1)}.`;
      queueSave(ta.value);
    };
    rec.onerror = (e) => {
      stopDictation();
      toast(e.error === 'not-allowed' ? 'The microphone is blocked for this site. Type instead, or allow it in your browser settings.' : 'Listening stopped. Tap Speak instead to carry on, or type.', { kind: 'info' });
    };
    rec.onend = () => { if (rec) stopDictation(); };
    rec.start();
    b.setAttribute('aria-pressed', 'true');
    b.classList.add('on');
    b.querySelector('span').textContent = 'Listening. Tap to stop';
  } catch {
    rec = null;
    toast('Speaking is not available here. Type instead.', { kind: 'info' });
  }
}

function finish() {
  const a = th().active;
  if (!a) return;
  stopDictation();
  const ta = document.querySelector('[data-think-text]');
  if (ta) a.text = ta.value;
  const mins = Math.max(0, Math.round((Date.now() - a.startedAt) / 60000));
  th().active = null;
  clearInterval(focusTimer);
  wake(false);
  if (!a.text.trim()) {
    save();
    closeScreen('[data-think]');
    bus.render();
    toast('Nothing written, so nothing was saved.', { kind: 'info' });
    return;
  }
  th().sessions.push({ id: a.id, date: ymd(new Date(a.startedAt)), q: a.q, text: a.text, mins, startedAt: a.startedAt, endedAt: Date.now() });
  save();
  closeScreen('[data-think]');
  bus.render();
  const n = weekCount();
  const s = weekStreak();
  toast(`Session saved. ${n} of ${target()} this week${s ? `. Streak: ${s} week${s === 1 ? '' : 's'}` : ''}.`, { kind: 'good', duration: 5000 });
}

export function readSession(id) {
  const s = th().sessions.find((x) => x.id === id);
  if (!s) return;
  openSheet(`<div class="think-read">
    <p class="eyebrow">${esc(longDate(s.date))} · ${s.mins} min</p>
    <h2>${esc(s.q)}</h2>
    <div class="think-read-text">${esc(s.text)}</div>
  </div>`, { id: 'think-read', wide: true });
}

// ---------- The Thinking screen ----------
export function view() {
  const d = state.settings.deep;
  const n = weekCount();
  const s = weekStreak();
  const next = nextSlot();
  const list = th().sessions.slice().sort((a, b) => b.startedAt - a.startedAt);
  const days = d.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => DAY_NAMES[x]);
  const when = days.length ? `${days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`} at ${niceTime(hmToMins(d.start))}` : 'No days set';
  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">Thinking</p>
      <h1>Deep thinking</h1>
      <p class="sub">${target()} sessions of ${d.mins} minutes a week. ${esc(when)}. Change it in Settings.</p>
    </div>
    <button class="btn primary" data-act="think-start">${icon('think', 16)} ${th().active ? 'Back to my session' : 'Start a session'}</button>
  </header>
  <section class="stats3">
    <div class="stat card"><div class="stat-ico">${icon('think', 22)}</div><div><div class="stat-label">This week</div><div class="stat-val">${n} of ${target()}</div></div></div>
    <div class="stat card"><div class="stat-ico">${icon('flame', 22)}</div><div><div class="stat-label">Weeks in a row</div><div class="stat-val">${s}</div></div></div>
    <div class="stat card"><div class="stat-ico">${icon('calendar', 22)}</div><div><div class="stat-label">Next session</div><div class="stat-val sm">${next ? esc(next.label) : 'None set'}</div></div></div>
  </section>
  <section class="card">
    <div class="card-head"><h3>Past sessions</h3><span class="muted small">${list.length} saved on this device</span></div>
    ${list.length ? `<ul class="think-list">${list.map((x) => `<li><button class="think-row" data-act="think-read" data-id="${x.id}">
        <span class="think-date">${esc(shortDay(x.date))} ${esc(shortDate(x.date))}</span>
        <span class="think-main"><strong>${esc(x.q)}</strong><small>${esc(x.text.slice(0, 160))}</small></span>
        <span class="think-mins">${x.mins} min</span>
      </button></li>`).join('')}</ul>` : '<p class="muted">Nothing yet. Your first session will show here, with the date and the question.</p>'}
  </section>`;
}

// Small card for Today.
export function todayCard(date) {
  const n = weekCount(date);
  const next = nextSlot(date);
  const isDay = state.settings.deep.days.includes(fromYmd(date).getDay());
  return `<section class="card think-card">
    <div class="card-head"><h3>${icon('think', 16)} Deep thinking</h3><a href="#thinking" class="link">Past sessions ${icon('right', 14)}</a></div>
    <p class="muted small">${n} of ${target()} this week${doneOn(date) ? ' · done today' : next ? ` · next ${esc(next.label)}` : ''}</p>
    ${th().active ? `<button class="mini-cta hot" data-act="think-start">Back to my session ${icon('right', 14)}</button>` : isDay && !doneOn(date) ? `<button class="mini-cta hot" data-act="think-start">Start today's session ${icon('right', 14)}</button>` : ''}
  </section>`;
}

export const actions = {
  'med-start': () => openMeditation(),
  'med-go': () => medGo(),
  'med-close': () => medClose(),
  'think-start': () => startThinking(),
  'think-finish': () => finish(),
  'think-speak': () => dictate(),
  'think-read': (el) => readSession(el.dataset.id),
  'think-time': (el) => {
    const on = !state.settings.deep.showTime;
    state.settings.deep.showTime = on;
    save();
    el.setAttribute('aria-pressed', String(on));
    el.setAttribute('aria-label', `${on ? 'Hide' : 'Show'} the timer`);
    document.querySelector('[data-think]')?.classList.toggle('show-time', on);
  },
};

// Typing a question of his own picks "My own question".
document.addEventListener('input', (e) => {
  if (e.target.classList?.contains('q-own-input')) {
    const r = e.target.form?.querySelector('input[name=q][value=own]');
    if (r) r.checked = e.target.value.trim() !== '' || r.checked;
  }
});

// Escape closes the meditation screen; the thinking page only closes with Finish.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('[data-calm]') && !document.querySelector('.sheet-wrap')) medClose();
});
