// The Today screen: plan, timer, end of day.
import { state, save, getDay, findTask, newTask } from './store.js';
import { parseTask, sortTasks, score, buildPlan, deadlineLabel, isOpen, MONEY_LABELS } from './planner.js';
import { ymd, addDays, esc, fmtDur, fmtClock, niceTime, minsOfDay, longDate, shortDay, hmToMins, daysBetween, fromYmd } from './util.js';
import { icon } from './icons.js';
import { ring } from './charts.js';
import { openSheet, closeSheet, bus, pill, moneyMarks, seg, $ } from './ui.js';
import { toast } from './notify.js';
import { source } from './integrations.js';
import * as timer from './timer.js';
import { strip as ticksStrip, countFor } from './habits.js';
import { HABITS } from './sample.js';
import { verdict } from './sergeant.js';
import { adsMini } from './ads.js';
import { briefCard } from './jarvis.js';
import { fixedFor, todayCard as thinkCard, doneOn } from './mind.js';
import { connectTodayCard } from './settings.js';

const today = () => ymd();
let viewDate = null;
let tab = 'tasks';

export const currentDate = () => {
  const t = today();
  if (!viewDate || viewDate < addDays(t, -14) || viewDate > addDays(t, 1)) viewDate = t;
  return viewDate;
};
export const setDate = (d) => { viewDate = d; };

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

export function planFor(date) {
  const day = getDay(date);
  const sorted = sortTasks(day, date === today() ? today() : date);
  const nowM = minsOfDay();
  const plan = buildPlan({
    date, today: today(), nowMins: nowM, tasks: sorted, fixed: fixedFor(date),
    events: source.calendar(date, today()), settings: state.settings, timer: state.timer,
    breakUntilMins: state.breakUntil && date === today() ? nowM + (state.breakUntil - Date.now()) / 60000 : null,
  });
  return { day, sorted, plan };
}

// ---------- Recap ----------
export function recap(date) {
  const day = getDay(date);
  const tasks = day.tasks;
  const done = tasks.filter((t) => t.status === 'done');
  const counted = tasks.filter((t) => t.status !== 'dropped');
  const spent = tasks.reduce((a, t) => a + timer.elapsedSecs(t), 0) / 60;
  const plannedDone = done.reduce((a, t) => a + t.mins, 0);
  const spentDone = done.reduce((a, t) => a + timer.elapsedSecs(t) / 60, 0);
  const ticks = countFor(date);
  const doneRatio = counted.length ? done.length / counted.length : 0;
  const score = Math.round((doneRatio * 0.7 + (ticks / HABITS.length) * 0.3) * 100) / 100;
  return { done: done.length, total: counted.length, spent, plannedDone, spentDone, ticks, score, tasks };
}

// ---------- Pieces ----------
function sergeantLine(date, sorted) {
  const t = today();
  if (date !== t) return '';
  const day = getDay(t);
  if (day.closed) return verdict(recap(t).score, state.settings.tone);
  const open = sorted.filter(isOpen);
  const run = timer.running();
  if (run) return timer.voice('start', { task: run.title, mins: fmtDur(Math.max(0, (timer.plannedSecs(run) - timer.elapsedSecs(run)) / 60)) + ' left' }, run.id);
  if (!open.length) return day.tasks.length ? timer.voice('allDone') : 'Empty board. Type what needs doing below, rough times are fine.';
  const rolled = open.filter((x) => x.rolledFrom).length;
  const anyDone = day.tasks.some((x) => x.status === 'done');
  if (rolled && !anyDone) return timer.voice('rolled', { n: rolled });
  if (minsOfDay() < (hmToMins(state.settings.workStart) || 525)) return timer.voice('morning', { n: open.length, task: open[0].title });
  return timer.voice('idle', { task: open[0].title }, open[0].id);
}

function statsStrip(date, sorted, plan) {
  const day = getDay(date);
  const all = day.tasks.filter((t) => t.status !== 'dropped' && t.status !== 'moved' && t.status !== 'rolled');
  const done = all.filter((t) => t.status === 'done').length;
  const focused = day.tasks.reduce((a, t) => a + timer.elapsedSecs(t), 0) / 60;
  const nowM = minsOfDay();
  const nextFixed = date === today() ? plan.items.find((i) => (i.kind === 'fixed' || i.kind === 'calendar') && i.start > nowM) : null;
  const left = sorted.filter(isOpen).reduce((a, t) => a + Math.max(0, t.mins - timer.elapsedSecs(t) / 60), 0);
  return `<section class="stats4">
    <div class="stat card"><div class="stat-ring accent">${ring(all.length ? done / all.length : 0, 52, 6)}<span>${done}/${all.length}</span></div><div><div class="stat-label">Tasks done</div><div class="stat-val">${all.length ? Math.round((done / all.length) * 100) : 0}%</div></div></div>
    <div class="stat card"><div class="stat-ico">${icon('clock', 20)}</div><div><div class="stat-label">Focused</div><div class="stat-val" data-focused>${fmtDur(focused)}</div></div></div>
    <div class="stat card ph-hide"><div class="stat-ico">${icon('target', 20)}</div><div><div class="stat-label">Work left</div><div class="stat-val">${fmtDur(left)}</div></div></div>
    <div class="stat card ph-hide"><div class="stat-ico">${icon(nextFixed ? kindIcon(nextFixed) : 'bed', 20)}</div><div><div class="stat-label">${nextFixed ? 'Next fixed' : 'Fixed day'}</div><div class="stat-val sm">${nextFixed ? `${niceTime(nextFixed.start)} ${esc(nextFixed.label)}` : date === today() ? 'All done' : `${state.settings.fixed.length} blocks`}</div></div></div>
  </section>`;
}

const shorten = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + '.' : s);

function kindIcon(i) {
  if (i.kind === 'calendar') return 'calendar';
  return { wake: 'sun', travel: 'walk', food: 'food', training: 'dumbbell', rest: 'coffee', family: 'family', plan: 'edit', wind: 'moon', sleep: 'bed', meditate: 'leaf', deep: 'think' }[i.sub] || 'clock';
}

function focusCard(date, sorted) {
  const t = today();
  if (date !== t) return '';
  const day = getDay(t);
  if (day.closed) {
    const r = recap(t);
    const tm = getDay(addDays(t, 1)).tasks.filter(isOpen);
    const first = sortTasks(getDay(addDays(t, 1)), addDays(t, 1)).filter(isOpen)[0];
    return `<section class="focus card closed">
      <div class="focus-top"><span class="eyebrow">Day closed</span>${pill(`${Math.round(r.score * 100)}% score`, r.score >= 0.7 ? 'good' : 'warn')}</div>
      <h2>Tomorrow is planned. ${tm.length} task${tm.length === 1 ? '' : 's'} ready.</h2>
      ${first ? `<p class="muted">First up: <strong>${esc(first.title)}</strong></p>` : ''}
      <div class="row gap">
        <button class="btn primary" data-act="day-go" data-v="1">View tomorrow ${icon('right', 16)}</button>
        <button class="btn ghost" data-act="reopen">Reopen today</button>
      </div>
    </section>`;
  }
  const run = timer.running();
  if (run) {
    const el = timer.elapsedSecs(run);
    const plan = timer.plannedSecs(run);
    const over = el > plan;
    return `<section class="focus card live ${over ? 'over' : ''}" data-live="${run.id}">
      <div class="focus-top"><span class="eyebrow"><span class="dot-live"></span>${over ? 'Over time' : 'On the clock'}</span>${run.pushed ? pill('Day pushed back', 'warn') : ''}</div>
      <h2 class="focus-title">${esc(run.title)}</h2>
      <div class="clock-row">
        <div class="clock" data-clock>${fmtClock(el)}</div>
        <div class="clock-of">of ${fmtDur(plan / 60)}<br><span data-clock-note>${over ? `${fmtDur((el - plan) / 60)} over` : `${fmtDur((plan - el) / 60)} left`}</span></div>
      </div>
      <div class="bar"><span data-clock-bar style="width:${Math.min(100, (el / plan) * 100).toFixed(1)}%"></span></div>
      <div class="row gap wrap">
        <button class="btn primary big" data-act="done" data-id="${run.id}">${icon('check', 18)} Done</button>
        <button class="btn ghost big" data-act="pause">${icon('pause', 16)} Pause</button>
        <button class="btn ghost big" data-act="extend">+15m</button>
      </div>
    </section>`;
  }
  if (state.breakUntil && state.breakUntil > Date.now()) {
    return `<section class="focus card brk" data-break>
      <div class="focus-top"><span class="eyebrow">${icon('coffee', 14)} Break</span></div>
      <h2>Stand up. Water. Back soon.</h2>
      <div class="clock-row"><div class="clock" data-break-clock>${fmtClock((state.breakUntil - Date.now()) / 1000)}</div><div class="clock-of">left</div></div>
      <button class="btn ghost" data-act="end-break">End break now</button>
    </section>`;
  }
  const next = sorted.filter(isOpen)[0];
  if (!next) {
    const any = getDay(t).tasks.length;
    return `<section class="focus card empty">
      <div class="ask-icon good">${icon(any ? 'check' : 'plus', 24)}</div>
      <h2>${any ? 'Board cleared.' : 'Nothing planned yet.'}</h2>
      <p class="muted">${any ? 'Every task is done. Add another, or close the day and plan tomorrow.' : 'Type your tasks below. Rough times are fine, for example "Amazon check-in 20m".'}</p>
    </section>`;
  }
  const sc = score(next, t);
  const resume = next.spent > 0;
  return `<section class="focus card">
    <div class="focus-top"><span class="eyebrow">Up next</span><span class="muted small">${esc(sc.why.join(', '))}</span></div>
    <h2 class="focus-title">${esc(next.title)}</h2>
    <p class="muted">${fmtDur(next.mins)} planned${resume ? `, ${fmtDur(next.spent / 60)} done so far` : ''}. Press start and the clock runs. I will tell you when time is nearly up.</p>
    <button class="btn primary big start-big" data-act="start" data-id="${next.id}">${icon('play', 18)} ${resume ? 'Resume the clock' : 'Start the clock'}</button>
  </section>`;
}

function addBox(date) {
  const t = today();
  const label = date === t ? 'Add a task' : date > t ? 'Add a task for tomorrow' : '';
  if (!label) return '';
  return `<form class="add card" data-form="add" data-date="${date}" autocomplete="off">
    <label for="add-input" class="sr">${label}</label>
    <div class="add-row">
      <span class="add-ico">${icon('plus', 20)}</span>
      <textarea id="add-input" rows="1" placeholder="${date === t ? 'What needs doing?' : 'What is on tomorrow?'}" enterkeyhint="done"></textarea>
      <button class="btn primary" type="submit">Add</button>
    </div>
    <div class="add-preview" id="add-preview"><span class="muted small">For example "Call supplier 15m" or "Film reels 1h by Fri". Paste a list to add several at once.</span></div>
  </form>`;
}

function taskRow(t, i, date, editable) {
  const tdy = today();
  const dl = deadlineLabel(t.deadline, date === tdy ? tdy : date);
  const isRun = state.timer && state.timer.taskId === t.id;
  const done = t.status === 'done';
  const sc = score(t, date);
  const canRun = date === tdy && !getDay(date).closed;
  const spent = timer.elapsedSecs(t);
  return `<li class="task ${done ? 'is-done' : ''} ${isRun ? 'is-run' : ''}" data-id="${t.id}" ${editable && !done ? 'data-draggable' : ''}>
    ${editable && !done ? `<button class="handle" data-drag aria-label="Drag to reorder" title="Drag to reorder">${icon('grip', 16)}</button>` : '<span class="handle-sp"></span>'}
    ${canRun || done ? `<button class="check ${done ? 'on' : ''}" data-act="${done ? 'undone' : 'done'}" data-id="${t.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}">${icon('check', 16)}</button>` : `<span class="rank">${i + 1}</span>`}
    <button class="task-main" data-act="edit" data-id="${t.id}">
      <span class="task-title">${esc(t.title)}</span>
      <span class="task-meta">
        <span class="meta-i">${icon('clock', 13)}${done || spent > 30 ? `${fmtDur(spent / 60)} of ` : ''}${fmtDur(t.mins)}</span>
        ${dl && !done ? `<span class="meta-i dl-${dl.tone}">${dl.text}</span>` : ''}
        ${moneyMarks(t.money)}
        ${t.rolledFrom && !done ? `<span class="meta-i rolled">${icon('refresh', 12)}Rolled</span>` : ''}
        ${!done && sc.why.length ? `<span class="why">${esc(sc.why.slice(0, 2).join(', '))}</span>` : ''}
      </span>
    </button>
    ${canRun && !done ? (isRun ? `<button class="run-btn on" data-act="pause" aria-label="Pause">${icon('pause', 15)}</button>` : `<button class="run-btn" data-act="start" data-id="${t.id}" aria-label="Start ${esc(t.title)}">${icon('play', 15)}</button>`) : ''}
    ${editable ? `<button class="icon-btn more" data-act="menu" data-id="${t.id}" aria-label="More options">${icon('more', 18)}</button>` : ''}
  </li>`;
}

function tasksPanel(date, sorted, plan) {
  const tdy = today();
  const day = getDay(date);
  const editable = date >= tdy && !day.closed;
  const open = sorted.filter(isOpen);
  const done = day.tasks.filter((t) => t.status === 'done').sort((a, b) => (a.doneAt || 0) - (b.doneAt || 0));
  const other = day.tasks.filter((t) => ['rolled', 'moved', 'dropped'].includes(t.status));
  const overflowIds = new Set(plan.overflow.map((t) => t.id));
  return `<section class="card tasks-card" data-panel="tasks">
    <div class="card-head">
      <h3>${date === tdy ? 'Your tasks' : date > tdy ? "Tomorrow's tasks" : 'Tasks'} <span class="muted">${open.length}</span></h3>
      ${day.manual && editable ? `<button class="link" data-act="rerank">${icon('refresh', 14)} Re-rank for me</button>` : editable && open.length > 1 ? '<span class="muted small">Ranked by deadline and money. Drag to change.</span>' : ''}
    </div>
    ${open.length ? `<ol class="task-list" data-list="${date}">${open.filter((t) => !overflowIds.has(t.id)).map((t, i) => taskRow(t, i, date, editable)).join('')}</ol>` : `<p class="empty-note">${date >= tdy ? 'No open tasks.' : 'Nothing was left open.'}</p>`}
    ${plan.overflow.length && date >= tdy ? `<div class="overflow" data-overflow>
      <div class="overflow-head">${icon('info', 16)}<span><strong>Will not fit ${date === tdy ? 'today' : 'tomorrow'}.</strong> ${plan.overflow.some((t) => t.mins > 200) ? 'Very long tasks need splitting. ' : ''}Move to tomorrow or cut something.</span></div>
      <ol class="task-list">${plan.overflow.map((t, i) => taskRow(t, open.length - plan.overflow.length + i, date, editable)).join('')}</ol>
      ${date === tdy ? `<button class="btn ghost sm" data-act="overflow-tomorrow">Move ${plan.overflow.length === 1 ? 'it' : 'them'} to tomorrow</button>` : ''}
    </div>` : ''}
    ${done.length ? `<details class="done-list" ${date < tdy ? 'open' : ''}><summary>Done <span class="muted">${done.length}</span></summary><ol class="task-list">${done.map((t, i) => taskRow(t, i, date, false)).join('')}</ol></details>` : ''}
    ${other.length ? `<details class="done-list"><summary>Moved on <span class="muted">${other.length}</span></summary><ul class="plain-list">${other.map((t) => `<li><span>${esc(t.title)}</span>${pill(t.status === 'dropped' ? 'Dropped' : 'To next day', t.status === 'dropped' ? 'mute' : 'plain')}</li>`).join('')}</ul></details>` : ''}
  </section>`;
}

// Meditation and deep thinking blocks get their own Start button, or a tick once done.
function mindButton(i, date) {
  if (date !== today() || (i.sub !== 'meditate' && i.sub !== 'deep')) return '';
  const done = i.sub === 'meditate' ? !!state.habits[date]?.meditate : doneOn(date);
  if (done) return `<span class="run-btn sm done" aria-label="Done">${icon('check', 13)}</span>`;
  if (getDay(date).closed) return '';
  return `<button class="run-btn sm" data-act="${i.sub === 'meditate' ? 'med-start' : 'think-start'}" aria-label="Start ${esc(i.label)}">${icon('play', 13)}</button>`;
}

function timeline(date, plan) {
  const tdy = today();
  const nowM = minsOfDay();
  const isToday = date === tdy;
  const end = plan.items.filter((i) => i.kind === 'task').reduce((a, i) => Math.max(a, i.end), 0);
  let nowDrawn = !isToday;
  const rows = [];
  plan.items.forEach((i) => {
    if (!nowDrawn && i.start >= nowM - 0.5 && !i.live) {
      rows.push(`<li class="tl-now"><span class="tl-time">${niceTime(nowM)}</span><span class="tl-now-line">Now</span></li>`);
      nowDrawn = true;
    }
    const dur = i.end - i.start;
    if (i.kind === 'task') {
      const t = i.task;
      rows.push(`<li class="tl tl-task ${i.live ? 'live' : ''}" data-id="${t.id}">
        <span class="tl-time">${niceTime(i.start)}</span>
        <span class="tl-bar"></span>
        <div class="tl-body"><strong>${esc(t.title)}</strong><span>${fmtDur(dur)}${i.live ? ' · on the clock' : ''}</span></div>
        ${isToday && !i.live && !getDay(date).closed ? `<button class="run-btn sm" data-act="start" data-id="${t.id}" aria-label="Start ${esc(t.title)}">${icon('play', 13)}</button>` : ''}
      </li>`);
    } else if (i.kind === 'break') {
      rows.push(`<li class="tl tl-break ${i.live ? 'live' : ''}"><span class="tl-time">${niceTime(i.start)}</span><span class="tl-bar"></span><div class="tl-body"><span>${esc(i.label)} · ${fmtDur(dur)}</span></div></li>`);
    } else {
      rows.push(`<li class="tl tl-fixed k-${i.kind === 'calendar' ? 'calendar' : i.sub} ${i.past ? 'past' : ''}">
        <span class="tl-time">${niceTime(i.start)}</span>
        <span class="tl-bar"></span>
        <div class="tl-body"><strong>${icon(kindIcon(i), 14)} ${esc(i.label)}</strong><span>${fmtDur(dur)}${i.kind === 'calendar' ? ' · Google Calendar' : i.sub === 'deep' ? ' · twice a week' : ' · fixed'}</span></div>
        ${mindButton(i, date)}
      </li>`);
    }
  });
  if (!nowDrawn) rows.push(`<li class="tl-now"><span class="tl-time">${niceTime(nowM)}</span><span class="tl-now-line">Now</span></li>`);
  return `<section class="card plan-card" data-panel="plan">
    <div class="card-head"><h3>${isToday ? 'Your day' : date > tdy ? "Tomorrow's plan" : 'That day'}</h3>
      <span class="muted small">${fmtDur(plan.planned)} of work planned${end ? `, done by ${niceTime(end)}` : ''}${plan.freeLeft > 10 ? ` · ${fmtDur(plan.freeLeft)} spare` : ''}</span></div>
    <ol class="timeline">${rows.join('')}</ol>
    <p class="muted small">Food, training, family, meditation and wind-down are fixed and never get moved. Change them in Settings. Breaks are added after about ${state.settings.breakEvery} minutes of work.</p>
  </section>`;
}

function pastView(date) {
  const r = recap(date);
  return `<section class="card recap-card">
    <div class="recap-top">
      <div class="stat-ring big ${r.score >= 0.7 ? 'good' : r.score >= 0.4 ? 'warn' : 'bad'}">${ring(r.score, 92, 9)}<span>${Math.round(r.score * 100)}%</span></div>
      <div><h3>${esc(verdict(r.score, state.settings.tone))}</h3><p class="muted">${r.done} of ${r.total} tasks done · ${fmtDur(r.spent)} focused · ${r.ticks}/${HABITS.length} ticks</p></div>
    </div>
    ${timeBars(r.tasks)}
  </section>`;
}

function timeBars(tasks) {
  const rows = tasks.filter((t) => t.status !== 'dropped');
  if (!rows.length) return '';
  const max = Math.max(...rows.map((t) => Math.max(t.mins, timer.elapsedSecs(t) / 60)), 1);
  return `<div class="tbars">
    <div class="tbars-key"><span><i class="kk-plan"></i>Planned</span><span><i class="kk-act"></i>Actual</span></div>
    ${rows.map((t) => {
      const act = timer.elapsedSecs(t) / 60;
      const over = act > t.mins + 2;
      return `<div class="tbar">
        <div class="tbar-top"><span>${esc(t.title)}</span><span class="${over ? 'bad' : ''}">${act ? `${fmtDur(act)} / ${fmtDur(t.mins)}` : t.status === 'done' ? `done, not timed / ${fmtDur(t.mins)}` : `not started / ${fmtDur(t.mins)}`} ${t.status === 'done' ? icon('check', 13, 'good') : ''}</span></div>
        <div class="tbar-track"><span class="tb-plan" style="width:${((t.mins / max) * 100).toFixed(1)}%"></span><span class="tb-act ${over ? 'over' : ''}" style="width:${((act / max) * 100).toFixed(1)}%"></span></div>
      </div>`;
    }).join('')}
  </div>`;
}

function closeCard(date) {
  const tdy = today();
  if (date !== tdy || getDay(tdy).closed) return '';
  const late = minsOfDay() >= 17 * 60;
  return `<section class="card close-card ${late ? 'hot' : ''}">
    <div><h3>${icon('moon', 18)} Close the day</h3><p class="muted">See how you did, roll unfinished tasks to tomorrow, and plan tomorrow tonight.</p></div>
    <button class="btn ${late ? 'primary' : 'ghost'}" data-act="close-day">Close the day</button>
  </section>`;
}

// ---------- The screen ----------
export function view() {
  const date = currentDate();
  const tdy = today();
  const { sorted, plan } = planFor(date);
  const isToday = date === tdy;
  const title = isToday ? `${greet()}, ${esc(state.profile.name || 'John')}.` : date > tdy ? 'Plan tomorrow' : esc(longDate(date));
  const line = sergeantLine(date, sorted);
  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${isToday ? esc(longDate(date)) : date > tdy ? esc(longDate(date)) : `${daysBetween(date, tdy)} day${daysBetween(date, tdy) === 1 ? '' : 's'} ago`}</p>
      <h1>${title}</h1>
      ${line ? `<p class="sarge" data-sarge>${icon('flame', 16)}<span>${esc(line)}</span></p>` : date > tdy ? '<p class="sub">Get tomorrow sorted tonight, then switch off.</p>' : ''}
    </div>
    <div class="day-switch">
      <button class="icon-btn" data-act="day-go" data-v="-1" aria-label="Previous day" ${date <= addDays(tdy, -14) ? 'disabled' : ''}>${icon('left', 18)}</button>
      <button class="day-now" data-act="day-today" ${isToday ? 'disabled' : ''}>${isToday ? 'Today' : date > tdy ? 'Tomorrow' : shortDay(date)}</button>
      <button class="icon-btn" data-act="day-go" data-v="1" aria-label="Next day" ${date >= addDays(tdy, 1) ? 'disabled' : ''}>${icon('right', 18)}</button>
    </div>
  </header>
  ${date < tdy ? `<div class="grid-today"><div class="col">${pastView(date)}</div><div class="col">${tasksPanel(date, sorted, plan)}</div></div>` : `
  ${isToday && !getDay(date).closed ? briefCard(date, sorted, plan) : ''}
  ${isToday ? statsStrip(date, sorted, plan) : ''}
  <div class="grid-today tab-${tab}">
    <div class="col">
      ${focusCard(date, sorted)}
      ${addBox(date)}
      <div class="seg-wrap only-phone">${seg('today-tab', [['tasks', 'Tasks'], ['plan', 'Day plan']], tab, 'full')}</div>
      ${tasksPanel(date, sorted, plan)}
    </div>
    <div class="col">
      ${timeline(date, plan)}
      ${isToday ? ticksStrip(date) : ''}
      ${isToday ? thinkCard(date) : ''}
      ${isToday ? adsMini() : ''}
      ${isToday ? connectTodayCard() : ''}
      ${closeCard(date)}
    </div>
  </div>`}`;
}

// Live parts update every second without a full redraw.
export function tickUi() {
  const run = timer.running();
  const box = document.querySelector('[data-live]');
  if (run && box && box.dataset.live === run.id) {
    const el = timer.elapsedSecs(run);
    const plan = timer.plannedSecs(run);
    const over = el > plan;
    box.querySelector('[data-clock]').textContent = fmtClock(el);
    box.querySelector('[data-clock-note]').textContent = over ? `${fmtDur((el - plan) / 60)} over` : `${fmtDur((plan - el) / 60)} left`;
    box.querySelector('[data-clock-bar]').style.width = `${Math.min(100, (el / plan) * 100).toFixed(1)}%`;
    if (over !== box.classList.contains('over')) bus.render();
  } else if (!!run !== !!box && document.querySelector('[data-panel="tasks"]') && currentDate() === today()) {
    bus.render();
  }
  const bk = document.querySelector('[data-break-clock]');
  if (bk && state.breakUntil) bk.textContent = fmtClock((state.breakUntil - Date.now()) / 1000);
}

// ---------- Adding ----------
function splitLines(text) {
  return text.split(/\r?\n|;(?=\s)/).map((s) => s.trim()).filter((s) => s && !/^[-*•]$/.test(s));
}

export function previewAdd(text, date) {
  const box = document.getElementById('add-preview');
  if (!box) return;
  const lines = splitLines(text);
  if (!lines.length) {
    box.innerHTML = '<span class="muted small">For example "Call supplier 15m" or "Film reels 1h by Fri". Paste a list to add several at once.</span>';
    return;
  }
  const parsed = lines.slice(0, 8).map((l) => parseTask(l, date)).filter(Boolean);
  box.innerHTML = parsed.map((p) => {
    const dl = deadlineLabel(p.deadline, date);
    return `<div class="pv"><span class="pv-t">${esc(p.title)}</span><span class="meta-i">${icon('clock', 12)}${fmtDur(p.mins)}${p.minsGiven ? '' : ' (guess)'}</span>${dl ? `<span class="meta-i dl-${dl.tone}">${dl.text}</span>` : ''}${moneyMarks(p.money)}</div>`;
  }).join('') + (lines.length > 8 ? `<div class="muted small">and ${lines.length - 8} more</div>` : '');
}

export function addFromText(text, date) {
  const lines = splitLines(text);
  const day = getDay(date);
  let added = 0;
  lines.slice(0, 30).forEach((l) => {
    const p = parseTask(l, date);
    if (!p) return;
    const t = newTask({ title: p.title, mins: p.mins, deadline: p.deadline, money: p.money });
    if (day.manual) t.order = Math.max(0, ...day.tasks.map((x) => x.order ?? 0)) + 1;
    day.tasks.push(t);
    added++;
  });
  if (added) save();
  return added;
}

// ---------- Sheets ----------
function editSheet(id) {
  const hit = findTask(id);
  if (!hit) return;
  const t = hit.task;
  const d0 = hit.date;
  const dlOpts = [[d0, 'Today'], [addDays(d0, 1), 'Tomorrow'], [addDays(d0, Math.max(0, (5 - fromYmd(d0).getDay() + 7) % 7)), 'This Friday'], ['', 'No deadline']];
  const isPreset = dlOpts.some(([v]) => v === (t.deadline || ''));
  openSheet(`
    <form data-form="edit" data-id="${t.id}" class="form">
      <h2>Edit task</h2>
      <label class="field"><span>Task</span><input name="title" value="${esc(t.title)}" maxlength="140" required></label>
      <div class="field"><span>How long</span>
        <div class="chips">${[10, 15, 20, 30, 45, 60, 90, 120].map((m) => `<button type="button" class="chip ${t.mins === m ? 'on' : ''}" data-act="pick-mins" data-v="${m}">${fmtDur(m)}</button>`).join('')}</div>
        <input name="mins" type="number" min="5" max="600" step="5" value="${t.mins}" inputmode="numeric" aria-label="Minutes">
      </div>
      <div class="field"><span>Deadline</span>
        <div class="chips">${dlOpts.map(([v, l]) => `<button type="button" class="chip ${(t.deadline || '') === v ? 'on' : ''}" data-act="pick-dl" data-v="${v}">${l}</button>`).join('')}</div>
        <input name="deadline" type="date" value="${isPreset ? '' : esc(t.deadline || '')}" aria-label="Pick a date">
        <input type="hidden" name="dlpreset" value="${isPreset ? esc(t.deadline || '') : '__date'}">
      </div>
      <div class="field"><span>Does it make money?</span>${seg('pick-money', MONEY_LABELS.map((l, i) => [i, l]), t.money ?? 1, 'full')}<input type="hidden" name="money" value="${t.money ?? 1}"></div>
      ${t.spent > 30 ? `<p class="muted small">${fmtDur(timer.elapsedSecs(t) / 60)} spent on this so far.</p>` : ''}
      <div class="row gap wrap sheet-actions">
        <button class="btn primary" type="submit">Save</button>
        ${d0 >= today() && t.status !== 'done' ? `<button type="button" class="btn ghost" data-act="to-tomorrow" data-id="${t.id}">Move to ${d0 > today() ? 'the day after' : 'tomorrow'}</button>` : ''}
        <button type="button" class="btn danger-ghost" data-act="delete" data-id="${t.id}">${icon('trash', 16)} Delete</button>
      </div>
    </form>`, { id: 'edit' });
}

function menuSheet(id) {
  const hit = findTask(id);
  if (!hit) return;
  const t = hit.task;
  openSheet(`
    <div class="menu">
      <h2>${esc(t.title)}</h2>
      <button class="menu-i" data-act="edit" data-id="${id}">${icon('edit', 18)} Edit time, deadline or money</button>
      <button class="menu-i" data-act="move" data-id="${id}" data-v="-1">${icon('up', 18)} Move up</button>
      <button class="menu-i" data-act="move" data-id="${id}" data-v="1">${icon('down', 18)} Move down</button>
      <button class="menu-i" data-act="to-tomorrow" data-id="${id}">${icon('right', 18)} Move to ${hit.date > today() ? 'the day after' : 'tomorrow'}</button>
      <button class="menu-i danger" data-act="delete" data-id="${id}">${icon('trash', 18)} Delete</button>
    </div>`, { id: 'menu' });
}

// End of day: 1 recap, 2 unfinished, 3 tomorrow.
let closeStep = 1;
let closeChoices = {};
function closeDaySheet() {
  const t = today();
  const r = recap(t);
  const open = sortTasks(getDay(t), t).filter(isOpen);
  const tm = addDays(t, 1);
  const steps = ['How you did', 'Unfinished', 'Tomorrow'];
  const head = `<div class="steps">${steps.map((s, i) => `<span class="${i + 1 === closeStep ? 'on' : i + 1 < closeStep ? 'past' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  let body = '';
  if (closeStep === 1) {
    body = `<div class="recap-top">
        <div class="stat-ring big ${r.score >= 0.7 ? 'good' : r.score >= 0.4 ? 'warn' : 'bad'}">${ring(r.score, 92, 9)}<span>${Math.round(r.score * 100)}%</span></div>
        <div><h2>${esc(verdict(r.score, state.settings.tone))}</h2><p class="muted">${r.done} of ${r.total} tasks done · ${fmtDur(r.spent)} focused · ${r.ticks}/${HABITS.length} daily ticks</p></div>
      </div>
      <h3 class="mini-h">Time spent per task</h3>
      ${timeBars(r.tasks) || '<p class="muted">No tasks today.</p>'}
      <div class="row gap sheet-actions"><button class="btn primary" data-act="close-next">Next ${icon('right', 16)}</button></div>`;
  } else if (closeStep === 2) {
    body = open.length ? `<h2>${open.length} unfinished</h2><p class="muted">Ticked ones roll to tomorrow and go near the top. Untick anything you want to drop.</p>
      <ul class="roll-list">${open.map((x) => `<li><label class="roll"><input type="checkbox" data-roll="${x.id}" ${closeChoices[x.id] !== false ? 'checked' : ''}><span>${esc(x.title)}</span><small>${fmtDur(x.mins)}</small></label></li>`).join('')}</ul>
      <div class="row gap sheet-actions"><button class="btn ghost" data-act="close-back">Back</button><button class="btn primary" data-act="close-next">Next ${icon('right', 16)}</button></div>`
      : `<h2>Nothing left over.</h2><p class="muted">Every task is done. That is the standard.</p><div class="row gap sheet-actions"><button class="btn ghost" data-act="close-back">Back</button><button class="btn primary" data-act="close-next">Next ${icon('right', 16)}</button></div>`;
  } else {
    const rolling = open.filter((x) => closeChoices[x.id] !== false);
    const tmDay = getDay(tm);
    const existing = sortTasks(tmDay, tm).filter(isOpen);
    body = `<h2>Plan ${esc(longDate(tm))}</h2>
      <p class="muted">${rolling.length ? `${rolling.length} rolling over. ` : ''}Add anything else for tomorrow, one per line.</p>
      <ul class="plain-list">${rolling.map((x) => `<li><span>${esc(x.title)}</span>${pill('Rolling over', 'warn')}</li>`).join('')}${existing.map((x) => `<li><span>${esc(x.title)}</span><span class="muted small">${fmtDur(x.mins)}</span></li>`).join('')}</ul>
      <form data-form="close-add" class="add-inline"><textarea id="close-add" rows="2" placeholder="e.g. Call the 3PL 15m&#10;Edit ad hooks 30m"></textarea><button class="btn ghost" type="submit">Add</button></form>
      <div class="row gap sheet-actions"><button class="btn ghost" data-act="close-back">Back</button><button class="btn primary" data-act="close-finish">${icon('lock', 16)} Lock it in</button></div>`;
  }
  openSheet(`<div class="closeday">${head}${body}</div>`, { id: 'close', wide: true });
}

function finishClose() {
  const t = today();
  const tm = addDays(t, 1);
  const extra = document.getElementById('close-add')?.value || '';
  if (extra.trim()) addFromText(extra, tm);
  if (state.timer) timer.pause();
  const day = getDay(t);
  const open = sortTasks(day, t).filter(isOpen);
  let rolled = 0;
  open.forEach((x) => {
    if (closeChoices[x.id] === false) { x.status = 'dropped'; return; }
    getDay(tm).tasks.push(newTask({ title: x.title, mins: x.mins, deadline: x.deadline, money: x.money, rolledFrom: t, rolled: (x.rolled || 0) + 1, origin: x.id }));
    x.status = 'rolled';
    rolled++;
  });
  day.closed = true;
  day.closedAt = Date.now();
  state.breakUntil = null;
  save();
  closeSheet(true);
  toast(`Day closed. ${rolled ? `${rolled} rolled to tomorrow. ` : ''}Get some rest.`, { kind: 'good' });
  bus.render();
}

// ---------- Drag to reorder ----------
export function startDrag(e, handle) {
  const li = handle.closest('.task');
  const list = li?.parentElement;
  if (!li || !list) return;
  e.preventDefault();
  const items = [...list.querySelectorAll('.task[data-draggable]')];
  const idx = items.indexOf(li);
  if (idx < 0) return;
  const rects = items.map((x) => x.getBoundingClientRect());
  const h = items.length > 1 ? (rects[rects.length - 1].top - rects[0].top) / (items.length - 1) : rects[0].height;
  const y0 = e.clientY;
  let to = idx;
  li.classList.add('dragging');
  list.classList.add('sorting');
  try { handle.setPointerCapture(e.pointerId); } catch { /* old browser */ }
  const move = (ev) => {
    const dy = ev.clientY - y0;
    li.style.transform = `translateY(${dy}px)`;
    to = Math.max(0, Math.min(items.length - 1, idx + Math.round(dy / h)));
    items.forEach((it, i) => {
      if (it === li) return;
      let s = 0;
      if (idx < to && i > idx && i <= to) s = -h;
      if (idx > to && i < idx && i >= to) s = h;
      it.style.transform = s ? `translateY(${s}px)` : '';
    });
  };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    items.forEach((it) => { it.style.transform = ''; });
    li.classList.remove('dragging');
    list.classList.remove('sorting');
    if (to !== idx) {
      const ids = items.map((x) => x.dataset.id);
      const [m] = ids.splice(idx, 1);
      ids.splice(to, 0, m);
      reorder(list.dataset.list, ids);
    }
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
}

function reorder(date, ids) {
  const day = getDay(date);
  const sorted = sortTasks(day, date).filter(isOpen).map((t) => t.id);
  const rest = sorted.filter((id) => !ids.includes(id));
  [...ids, ...rest].forEach((id, i) => {
    const t = day.tasks.find((x) => x.id === id);
    if (t) t.order = i;
  });
  day.manual = true;
  save();
  bus.render();
}

// ---------- Actions ----------
export const actions = {
  start: (el) => { timer.start(el.dataset.id); bus.render(); },
  pause: () => { timer.pause(); bus.render(); },
  done: (el) => { timer.complete(el.dataset.id); bus.render(); },
  undone: (el) => { timer.undoDone(el.dataset.id); bus.render(); },
  extend: () => {
    const t = timer.running();
    if (!t) return;
    t.extra = (t.extra || 0) + 900;
    t.asked = false;
    save();
    toast('15 minutes added.', { kind: 'info' });
    bus.render();
  },
  'end-break': () => { timer.endBreak(); bus.render(); },
  edit: (el) => editSheet(el.dataset.id),
  menu: (el) => menuSheet(el.dataset.id),
  move: (el) => {
    const hit = findTask(el.dataset.id);
    closeSheet(true);
    if (!hit) return;
    const ids = sortTasks(hit.day, hit.date).filter(isOpen).map((t) => t.id);
    const i = ids.indexOf(hit.task.id);
    const j = Math.max(0, Math.min(ids.length - 1, i + +el.dataset.v));
    if (i === j) return;
    ids.splice(i, 1);
    ids.splice(j, 0, hit.task.id);
    reorder(hit.date, ids);
  },
  'to-tomorrow': (el) => {
    closeSheet(true);
    const c = timer.moveToTomorrow(el.dataset.id);
    if (c) toast(`"${c.title}" moved to ${shortDay(addDays(c.rolledFrom, 1))}.`, { kind: 'info' });
    bus.render();
  },
  delete: (el) => {
    const hit = findTask(el.dataset.id);
    closeSheet(true);
    if (!hit) return;
    if (state.timer && state.timer.taskId === hit.task.id) state.timer = null;
    const idx = hit.day.tasks.indexOf(hit.task);
    hit.day.tasks.splice(idx, 1);
    save();
    bus.render();
    toast(`Deleted "${hit.task.title}".`, { kind: 'info', actions: [{ label: 'Undo', fn: () => { hit.day.tasks.splice(idx, 0, hit.task); save(); bus.render(); } }] });
  },
  rerank: () => { const d = getDay(currentDate()); d.manual = false; save(); bus.render(); },
  'overflow-tomorrow': () => {
    const { plan } = planFor(today());
    plan.overflow.forEach((t) => timer.moveToTomorrow(t.id));
    toast(`${plan.overflow.length} moved to tomorrow.`, { kind: 'info' });
    bus.render();
  },
  'day-go': (el) => { viewDate = addDays(currentDate(), +el.dataset.v); window.scrollTo({ top: 0 }); bus.render(); },
  'day-today': () => { viewDate = today(); bus.render(); },
  'today-tab': (el) => { tab = el.dataset.v; bus.render(); },
  'pick-mins': (el) => {
    const f = el.closest('form');
    f.mins.value = el.dataset.v;
    f.querySelectorAll('[data-act="pick-mins"]').forEach((b) => b.classList.toggle('on', b === el));
  },
  'pick-dl': (el) => {
    const f = el.closest('form');
    f.dlpreset.value = el.dataset.v;
    f.deadline.value = '';
    f.querySelectorAll('[data-act="pick-dl"]').forEach((b) => b.classList.toggle('on', b === el));
  },
  'pick-money': (el) => {
    const f = el.closest('form');
    f.money.value = el.dataset.v;
    el.parentElement.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-checked', b === el); });
  },
  'close-day': () => { closeStep = 1; closeChoices = {}; closeDaySheet(); },
  'close-next': () => { saveRollChoices(); closeStep = Math.min(3, closeStep + 1); closeDaySheet(); },
  'close-back': () => { saveRollChoices(); closeStep = Math.max(1, closeStep - 1); closeDaySheet(); },
  'close-finish': () => finishClose(),
  reopen: () => {
    const d = getDay(today());
    d.closed = false;
    // Bring back tasks that were rolled tonight, and take their copies off tomorrow.
    const tm = getDay(addDays(today(), 1));
    d.tasks.forEach((t) => {
      if (t.status === 'rolled' || t.status === 'dropped') {
        const ci = tm.tasks.findIndex((x) => x.origin === t.id && x.status === 'todo' && !x.spent);
        if (ci >= 0) tm.tasks.splice(ci, 1);
        t.status = 'todo';
      }
    });
    save();
    bus.render();
  },
};

function saveRollChoices() {
  document.querySelectorAll('[data-roll]').forEach((c) => { closeChoices[c.dataset.roll] = c.checked; });
}

export const forms = {
  add: (form) => {
    const ta = form.querySelector('textarea');
    const n = addFromText(ta.value, form.dataset.date);
    if (!n) { ta.focus(); return; }
    ta.value = '';
    bus.render();
    toast(n === 1 ? 'Added and ranked.' : `${n} tasks added and ranked.`, { kind: 'good', duration: 2500 });
    setTimeout(() => document.getElementById('add-input')?.focus({ preventScroll: true }), 30);
  },
  edit: (form) => {
    const hit = findTask(form.dataset.id);
    if (!hit) return closeSheet(true);
    const title = form.title.value.trim();
    if (!title) { form.title.focus(); return; }
    const mins = Math.max(5, Math.min(600, parseInt(form.mins.value, 10) || hit.task.mins));
    let dl = form.deadline.value || (form.dlpreset.value === '__date' ? hit.task.deadline : form.dlpreset.value) || null;
    Object.assign(hit.task, { title: title.slice(0, 140), mins, deadline: dl, money: +form.money.value });
    save();
    closeSheet(true);
    bus.render();
  },
  'close-add': (form) => {
    const ta = form.querySelector('textarea');
    const n = addFromText(ta.value, addDays(today(), 1));
    if (n) { ta.value = ''; closeDaySheet(); toast(`${n} added to tomorrow.`, { kind: 'good', duration: 2000 }); }
  },
};
