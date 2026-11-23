// The Start button, the clock, and what happens when he finishes early or runs over.
import { state, save, findTask, getDay, newTask } from './store.js';
import { sortTasks, isOpen } from './planner.js';
import { ymd, addDays, fmtDur, esc } from './util.js';
import { say, title } from './sergeant.js';
import { alertMe, toast } from './notify.js';
import { openSheet, closeSheet, sheetOpen, bus } from './ui.js';
import { icon } from './icons.js';
import { autoTick } from './habits.js';

const today = () => ymd();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const voice = (key, vars = {}, seed = '') => {
  const n = vars.n;
  const extra = n === undefined ? {} : { jobs: plural(n, 'job'), tasks: plural(n, 'task'), ticks: plural(n, 'tick') };
  return say(key, { name: state.profile.surname || 'Simpson', first: state.profile.name || 'John', ...extra, ...vars }, state.settings.tone, seed + today());
};
export const head = (key) => title(key, state.settings.tone);
const notifyOn = (flag) => state.settings.notify.enabled && (flag ? state.settings.notify[flag] !== false : true);

export function running() {
  if (!state.timer) return null;
  const hit = findTask(state.timer.taskId);
  return hit ? hit.task : null;
}

export function elapsedSecs(t) {
  let s = t.spent || 0;
  if (state.timer && state.timer.taskId === t.id) s += Math.max(0, (Date.now() - state.timer.since) / 1000);
  return s;
}

export const plannedSecs = (t) => t.mins * 60 + (t.extra || 0);

export function openToday() {
  return sortTasks(getDay(today()), today()).filter(isOpen);
}

export function nextTask(exceptId) {
  return openToday().find((t) => t.id !== exceptId) || null;
}

function bank() {
  const t = running();
  if (t) {
    t.spent = elapsedSecs(t);
    t.status = 'todo';
  }
  state.timer = null;
  return t;
}

export function start(id) {
  const hit = findTask(id);
  if (!hit || hit.date !== today() || !isOpen(hit.task)) return;
  const t = hit.task;
  if (state.timer && state.timer.taskId === id) return;
  const prev = bank();
  state.breakUntil = null;
  t.status = 'active';
  t.startedAt = t.startedAt || Date.now();
  t.warned = false;
  t.asked = false;
  t.pushed = false;
  state.timer = { date: today(), taskId: id, since: Date.now() };
  state.lastActive = Date.now();
  save();
  const left = Math.max(0, plannedSecs(t) - (t.spent || 0)) / 60;
  if (prev) toast(`Paused "${prev.title}". Its time is saved.`, { kind: 'info' });
  alertMe(head('default'), voice('start', { task: t.title, mins: fmtDur(left) }, t.id), { tag: 'start', enabled: false, sound: 'start' });
}

export function pause() {
  const t = bank();
  state.lastActive = Date.now();
  save();
  if (t) toast(`Paused "${t.title}" at ${fmtDur(t.spent / 60)}.`, { kind: 'info' });
}

export function complete(id, { ask = true } = {}) {
  const hit = findTask(id);
  if (!hit) return;
  const t = hit.task;
  if (state.timer && state.timer.taskId === id) bank();
  t.status = 'done';
  t.doneAt = Date.now();
  state.lastActive = Date.now();
  const ticked = autoTick(t.title, hit.date);
  save();
  if (ticked.length) toast(`Ticked "${ticked.join('", "')}" for you.`, { kind: 'good' });
  if (hit.date !== today()) return;

  const spentMin = (t.spent || 0) / 60;
  const plannedMin = plannedSecs(t) / 60;
  const early = plannedMin - spentMin;
  const next = nextTask(t.id);
  if (ask && t.spent > 60 && early >= 3) {
    earlySheet(t, early, next);
  } else if (next) {
    alertMe(head('default'), voice('done', { task: t.title, next: next.title }, t.id), { tag: 'done', enabled: false });
  } else {
    alertMe(head('default'), voice('allDone'), { tag: 'alldone', enabled: false });
  }
}

export function undoDone(id) {
  const hit = findTask(id);
  if (!hit) return;
  hit.task.status = 'todo';
  hit.task.doneAt = null;
  save();
}

// ---------- Finished early ----------
function earlySheet(t, early, next) {
  openSheet(`
    <div class="ask">
      <div class="ask-icon good">${icon('check', 26)}</div>
      <h2>${fmtDur(early)} to spare</h2>
      <p class="muted">"${esc(t.title)}" took ${fmtDur(t.spent / 60)} of the ${fmtDur(plannedSecs(t) / 60)} you planned. What do you want to do with the time?</p>
      <div class="ask-options">
        ${next ? `<button class="opt opt-main" data-act="early-next" data-id="${next.id}"><strong>Start the next task now</strong><span>${esc(next.title)} · ${fmtDur(next.mins)}</span></button>` : ''}
        <button class="opt" data-act="early-break"><strong>Take a ${Math.min(15, Math.round(early))} minute break</strong><span>I will call you back when it is over</span></button>
        <button class="opt" data-act="early-add"><strong>Add a quick task</strong><span>Fill the gap with something small</span></button>
        <button class="opt" data-act="early-bank"><strong>Bank it</strong><span>Everything else just moves up</span></button>
      </div>
    </div>`, { id: 'early' });
}

export function takeBreak(mins) {
  bank();
  state.breakUntil = Date.now() + mins * 60000;
  state.breakNotified = false;
  save();
  toast(`Break until ${new Date(state.breakUntil).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}.`, { kind: 'info' });
}

export function endBreak() {
  state.breakUntil = null;
  state.lastActive = Date.now();
  save();
}

// ---------- Ran over ----------
function overrunSheet(t) {
  const over = (elapsedSecs(t) - plannedSecs(t)) / 60;
  const least = openToday().filter((x) => x.id !== t.id).slice(-1)[0];
  openSheet(`
    <div class="ask">
      <div class="ask-icon bad">${icon('clock', 26)}</div>
      <h2>Time is up on "${esc(t.title)}"</h2>
      <p class="muted">You planned ${fmtDur(t.mins)} and you are ${fmtDur(Math.max(1, over))} over. What happens to the rest of the day?</p>
      <div class="ask-options">
        <button class="opt opt-main" data-act="over-done"><strong>It is done, mark it finished</strong><span>Stop the clock and move on</span></button>
        <button class="opt" data-act="over-extend"><strong>Give me 15 more minutes</strong><span>I will ask again after that</span></button>
        <button class="opt" data-act="over-push"><strong>Push the rest of the day back</strong><span>Keep going, the plan moves with you</span></button>
        ${least ? `<button class="opt" data-act="over-drop" data-id="${least.id}"><strong>Drop the least important task</strong><span>"${esc(least.title)}" moves to tomorrow, you get its ${fmtDur(least.mins)}</span></button>` : ''}
        <button class="opt" data-act="over-stop"><strong>Stop, finish it tomorrow</strong><span>Time so far is saved, the rest rolls over</span></button>
      </div>
    </div>`, { id: 'overrun', onClose: () => { t.asked = true; } });
}

export function moveToTomorrow(id, why = 'moved') {
  const hit = findTask(id);
  if (!hit) return null;
  const t = hit.task;
  if (state.timer && state.timer.taskId === id) bank();
  const tomorrow = addDays(hit.date, 1);
  const copy = newTask({ title: t.title, mins: t.mins, deadline: t.deadline, money: t.money, rolledFrom: hit.date, rolled: (t.rolled || 0) + 1, origin: t.id });
  if (why === 'rest') copy.mins = Math.max(10, Math.round((plannedSecs(t) - (t.spent || 0)) / 60) || 15);
  getDay(tomorrow).tasks.push(copy);
  if (t.spent > 30) t.status = 'moved';
  else hit.day.tasks.splice(hit.day.tasks.indexOf(t), 1);
  save();
  return copy;
}

// Runs every second while the app is open.
export function tick() {
  const t = running();
  if (t) {
    const el = elapsedSecs(t);
    const plan = plannedSecs(t);
    if (!t.warned && t.mins >= 15 && el >= plan - 300 && el < plan) {
      t.warned = true;
      save();
      alertMe(head('warn'), voice('warn', { task: t.title }, t.id), { tag: 'warn', enabled: notifyOn('warn') });
    }
    if (!t.asked && !t.pushed && el >= plan) {
      t.asked = true;
      save();
      const willAsk = !sheetOpen();
      alertMe(head('overrun'), voice('overrun', { task: t.title, over: fmtDur(Math.max(1, (el - plan) / 60)) }, t.id), { tag: 'overrun', enabled: notifyOn('warn'), quiet: willAsk });
      if (willAsk) overrunSheet(t);
    }
  }
  if (state.breakUntil && Date.now() >= state.breakUntil && !state.breakNotified) {
    state.breakNotified = true;
    state.breakUntil = null;
    state.lastActive = Date.now();
    save();
    const n = nextTask();
    alertMe(head('default'), voice('breakOver', { task: n ? n.title : 'the next job' }), { tag: 'break', enabled: notifyOn() });
    bus.render();
  }
}

export const actions = {
  'early-next': (el) => { closeSheet(true); start(el.dataset.id); bus.render(); },
  'early-break': () => {
    closeSheet(true);
    const t = getDay(today()).tasks.filter((x) => x.status === 'done').sort((a, b) => b.doneAt - a.doneAt)[0];
    const early = t ? (plannedSecs(t) - t.spent) / 60 : 15;
    takeBreak(Math.max(5, Math.min(15, Math.round(early))));
    bus.render();
  },
  'early-add': () => { closeSheet(true); bus.render(); setTimeout(() => document.getElementById('add-input')?.focus(), 50); },
  'early-bank': () => { closeSheet(true); toast('Time banked. Everything else moves up.', { kind: 'good' }); bus.render(); },
  'over-done': () => { const t = running(); closeSheet(true); if (t) complete(t.id, { ask: false }); bus.render(); },
  'over-extend': () => {
    const t = running();
    closeSheet(true);
    if (!t) return;
    t.extra = Math.max(0, elapsedSecs(t) - t.mins * 60) + 900;
    t.asked = false;
    t.warned = true;
    save();
    toast('15 more minutes. Make them count.', { kind: 'info' });
    bus.render();
  },
  'over-push': () => {
    const t = running();
    closeSheet(true);
    if (!t) return;
    t.pushed = true;
    save();
    bus.render();
    const over = document.querySelectorAll('[data-overflow] .task').length;
    toast(over ? `Day pushed back. ${over} task${over > 1 ? 's' : ''} no longer fit today. Finish early and they come back.` : 'Day pushed back. Everything still fits.', { kind: 'info', duration: 6000 });
  },
  'over-drop': (el) => {
    const t = running();
    closeSheet(true);
    const dropped = findTask(el.dataset.id)?.task;
    if (!t || !dropped) return;
    moveToTomorrow(dropped.id);
    t.extra = Math.max(0, elapsedSecs(t) - t.mins * 60) + dropped.mins * 60;
    t.asked = false;
    t.warned = true;
    save();
    toast(`"${dropped.title}" moved to tomorrow. You have ${fmtDur(dropped.mins)} more.`, { kind: 'info', duration: 6000 });
    bus.render();
  },
  'over-stop': () => {
    const t = running();
    closeSheet(true);
    if (!t) return;
    moveToTomorrow(t.id, 'rest');
    toast(`Stopped. The rest of "${t.title}" is on tomorrow's list.`, { kind: 'info' });
    bus.render();
  },
};

export { overrunSheet };
