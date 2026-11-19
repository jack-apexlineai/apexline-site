// App shell: navigation, one click handler for everything, the clock, reminders.
import { state, save, catchUp, getDay, state_recovered } from './store.js';
import { ymd, minsOfDay, hmToMins, esc } from './util.js';
import { icon } from './icons.js';
import { bus, openSheet, closeSheet, $ } from './ui.js';
import * as today from './today.js';
import * as habits from './habits.js';
import * as ads from './ads.js';
import * as money from './money.js';
import * as settings from './settings.js';
import * as timer from './timer.js';
import { alertMe, toast } from './notify.js';
import { HABITS } from './sample.js';
import { sortTasks, isOpen } from './planner.js';
import * as jarvis from './jarvis.js';
import * as mind from './mind.js';
import * as tour from './tour.js';
import * as ask from './ask.js';

const ROUTES = {
  today: { label: 'Today', icon: 'today', view: today.view },
  habits: { label: 'Ticks', icon: 'habits', view: habits.view },
  ads: { label: 'Ads', icon: 'ads', view: ads.view },
  money: { label: 'Money', icon: 'money', view: money.view },
  thinking: { label: 'Thinking', icon: 'think', view: mind.view, phone: false },
  settings: { label: 'Settings', icon: 'settings', view: settings.view },
};
const ACTIONS = { ...today.actions, ...timer.actions, ...habits.actions, ...ads.actions, ...money.actions, ...settings.actions, ...mind.actions };
ACTIONS['brief-play'] = () => jarvis.speak();
const FORMS = { ...today.forms, ...money.forms, ...settings.forms, ...mind.thinkForms };

const route = () => {
  const r = (location.hash || '#today').slice(1).split('?')[0];
  return ROUTES[r] ? r : 'today';
};

function nav() {
  const r = route();
  const pending = ads.pendingCount();
  const link = ([k, v]) => `<a href="#${k}" class="nav-i ${k === r ? 'on' : ''}" ${k === r ? 'aria-current="page"' : ''}>
      ${icon(v.icon, 22)}<span>${v.label}</span>${k === 'ads' && pending ? `<b class="badge" aria-label="${pending} waiting">${pending}</b>` : ''}</a>`;
  const all = Object.entries(ROUTES);
  $('#sidebar-nav').innerHTML = all.map(link).join('');
  // The phone tab bar keeps five tabs; Thinking is reached from the Today card.
  $('#tabbar').innerHTML = `${all.filter(([, v]) => v.phone !== false).map(link).join('')}<button type="button" class="nav-i" data-ask-open>${icon('chat', 22)}<span>Ask</span></button>`;
}

let lastRoute = null;
function render() {
  const r = route();
  const main = $('#main');
  const keepScroll = r === lastRoute;
  const y = window.scrollY;
  const focusId = document.activeElement && document.activeElement.id;
  const addVal = $('#add-input')?.value;
  main.innerHTML = ROUTES[r].view();
  main.dataset.route = r;
  document.title = `${ROUTES[r].label} · Command`;
  nav();
  if (addVal && $('#add-input')) {
    $('#add-input').value = addVal;
    today.previewAdd(addVal, $('#add-input').closest('form').dataset.date);
  }
  if (focusId && document.getElementById(focusId) && focusId !== 'main') document.getElementById(focusId).focus({ preventScroll: true });
  if (keepScroll) window.scrollTo(0, y);
  else {
    window.scrollTo(0, 0);
    if (!jarvis.isBooting()) jarvis.countUp(main);
  }
  lastRoute = r;
}
bus.render = render;

// ---------- One handler for every button ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return; // handled on change
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(el, e);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('input[type=checkbox][data-act]');
  if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, e);
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (fn) fn(f, e);
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'add-input') {
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(220, ta.scrollHeight)}px`;
    today.previewAdd(ta.value, ta.closest('form').dataset.date);
  }
});

// Enter adds, Shift+Enter makes a new line (for lists).
document.addEventListener('keydown', (e) => {
  if ((e.target.id === 'add-input' || e.target.id === 'close-add') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    e.target.closest('form').requestSubmit();
  }
});

document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag]');
  if (h) today.startDrag(e, h);
});

window.addEventListener('hashchange', () => { closeSheet(true); render(); });

let resizeT;
let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (Math.abs(window.innerWidth - lastW) > 40 && route() === 'ads') render();
    lastW = window.innerWidth;
  }, 200);
});

// ---------- Reminders while the app is open ----------
const sent = (k) => {
  const t = ymd();
  state.sent[t] = state.sent[t] || {};
  if (state.sent[t][k]) return true;
  state.sent[t][k] = Date.now();
  save();
  return false;
};

function reminders() {
  const t = ymd();
  const n = state.settings.notify;
  const on = (flag) => n.enabled && n[flag] !== false;
  const m = minsOfDay();
  const day = getDay(t);
  const open = sortTasks(day, t).filter(isOpen);
  const first = open[0];

  const fixedToday = mind.fixedFor(t);
  fixedToday.forEach((f) => {
    const s = hmToMins(f.start);
    const e = hmToMins(f.end);
    if (s === null) return;
    const lead = f.kind === 'training' ? 10 : 0;
    if (m >= s - lead && m < s - lead + 10 && !sent(`fixed:${f.id}`)) {
      if (f.kind === 'plan' && day.closed) return;
      const key = f.kind === 'wake' ? 'morning' : ['food', 'training', 'family', 'plan', 'wind', 'travel', 'sleep', 'rest', 'meditate', 'deep'].includes(f.kind) ? f.kind : 'blockStart';
      const vars = { task: key === 'blockStart' || key === 'food' || key === 'family' ? f.label : first ? first.title : 'your first job', time: f.start, end: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`, n: open.length };
      const flag = f.kind === 'plan' ? 'plan' : 'blocks';
      alertMe(timer.head(key === 'morning' ? 'morning' : key === 'plan' ? 'plan' : 'default'), timer.voice(key, vars, f.id), {
        tag: `fixed-${f.id}`, enabled: on(flag),
        actions: key === 'meditate' ? [{ label: 'Start', fn: () => mind.openMeditation() }] : key === 'deep' ? [{ label: 'Start', fn: () => mind.startThinking() }] : [],
      });
    }
  });

  // Nobody on the clock during work time.
  const ws = hmToMins(state.settings.workStart) ?? 525;
  const we = hmToMins(state.settings.workEnd) ?? 1110;
  const inFixed = fixedToday.some((f) => m >= hmToMins(f.start) && m < hmToMins(f.end));
  const busy = state.timer || (state.breakUntil && state.breakUntil > Date.now()) || state.thinking.active || mind.screenOpen();
  if (!day.closed && first && !busy && !inFixed && m >= ws && m < we) {
    const since = Math.max(state.lastActive || 0, new Date().setHours(Math.floor(ws / 60), ws % 60, 0, 0), state.lastIdle || 0);
    if (Date.now() - since >= 10 * 60000) {
      state.lastIdle = Date.now();
      save();
      alertMe(timer.head('idle'), timer.voice('idle', { task: first.title }, String(Math.floor(Date.now() / 900000))), {
        tag: 'idle', enabled: on('idle'), actions: [{ label: 'Start it', fn: () => { timer.start(first.id); render(); } }],
      });
    }
  }

  // Evening tick check.
  if (m >= 20 * 60 && m < 20 * 60 + 30) {
    const empty = HABITS.filter((h) => !state.habits[t]?.[h.id]);
    if (empty.length && !sent('habits')) {
      alertMe(timer.head('default'), timer.voice('habits', { n: empty.length, list: empty.map((h) => h.label.toLowerCase()).join(', ') }), { tag: 'habits', enabled: on('habits') });
    }
  }
}

// ---------- Clock ----------
let lastDay = ymd();
function everySecond() {
  const t = ymd();
  if (t !== lastDay) {
    lastDay = t;
    const rolled = catchUp(t);
    today.setDate(t);
    render();
    if (rolled) alertMe(timer.head('default'), timer.voice('rolled', { n: rolled }), { enabled: false });
  }
  timer.tick();
  if (route() === 'today') today.tickUi();
}

let remT = 0;
function loop() {
  everySecond();
  remT++;
  if (remT % 15 === 0) reminders();
  // Keep the day plan and the now line fresh, unless he is typing or a sheet is open.
  if (remT % 60 === 0 && route() === 'today' && !document.body.classList.contains('has-sheet')) {
    const a = document.activeElement;
    if (!a || !['TEXTAREA', 'INPUT'].includes(a.tagName)) render();
  }
}

// ---------- First run ----------
function onboarding() {
  openSheet(`<div class="welcome">
    <div class="brand-mark big">${icon('flame', 34)}</div>
    <h2>Morning, ${esc(state.profile.name)}. This is Command.</h2>
    <p class="muted">One place for your day, your habits, your ads and your money. Everything here is sample data so you can press every button without breaking anything.</p>
    <ul class="welcome-list">
      <li>${icon('today', 20)}<span><strong>Today</strong> Type tasks with rough times. It ranks them, fits them round gym and food, and times you.</span></li>
      <li>${icon('flame', 20)}<span><strong>The sergeant</strong> Firm reminders when it is time to move. You picked drill sergeant.</span></li>
      <li>${icon('ads', 20)}<span><strong>Ads</strong> Your Meta numbers in plain English, with changes you approve.</span></li>
      <li>${icon('money', 20)}<span><strong>Ticks and Money</strong> Daily habits with streaks, and what came in and went out.</span></li>
    </ul>
    <div class="row gap wrap sheet-actions">
      <button class="btn primary big" data-act="welcome-go">Show me my day</button>
      <button class="btn ghost big" data-act="welcome-remind">${icon('bell', 16)} Turn on reminders</button>
    </div>
  </div>`, { id: 'welcome', onClose: () => { state.profile.onboarded = true; save(); render(); bus.tour(); } });
}

ACTIONS['welcome-go'] = () => { state.profile.onboarded = true; save(); closeSheet(true); location.hash = '#today'; render(); bus.tour(); };
ACTIONS['welcome-remind'] = async () => {
  state.profile.onboarded = true;
  save();
  closeSheet(true);
  await ACTIONS['notify-on']();
  bus.tour();
};

// ---------- Boot ----------
function boot() {
  settings.applyTheme();
  const rolled = catchUp(ymd());
  const greet = () => {
    if (!state.profile.onboarded) onboarding();
    else if (rolled) alertMe(timer.head('default'), timer.voice('rolled', { n: rolled }), { enabled: false });
  };
  // First open of the day: the boot moment, then the day. Skipped for "reduce motion".
  if (jarvis.shouldBoot()) {
    jarvis.boot(() => { greet(); jarvis.countUp($('#main')); });
    render();
  } else {
    render();
    greet();
  }
  document.body.insertAdjacentHTML('beforeend', ask.fab());
  // A deep thinking session left open (reload, phone killed the tab) comes straight back.
  if (state.thinking.active && state.profile.onboarded) mind.openFocus();
  if (state_recovered) toast('Your saved data could not be read, so the app started fresh.', { kind: 'info', duration: 8000 });
  setInterval(loop, 1000);
  setTimeout(reminders, 1500);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { everySecond(); render(); } });
  window.__app = { state: () => state, render };
}

boot();
