// App state. Phase 1 keeps everything in this browser (localStorage).
// Phase 2 swaps save/load for the backend (see NOTE_FOR_JACK.md), same shape.

import { ymd, addDays, uid } from './util.js';
import { sampleState } from './sample.js';

const KEY = 'command.v1';
const listeners = new Set();
let memoryFallback = null;

export const DEFAULT_FIXED = [
  { id: 'f_wake', label: 'Wake up, water, get ready', start: '07:30', end: '08:15', kind: 'wake' },
  { id: 'f_travel', label: 'Head down to the co-working space', start: '08:15', end: '08:45', kind: 'travel' },
  { id: 'f_meditate', label: 'Meditate', start: '08:45', end: '08:50', kind: 'meditate' },
  { id: 'f_lunch', label: 'Lunch', start: '12:30', end: '13:15', kind: 'food' },
  { id: 'f_gym', label: 'Gym', start: '13:30', end: '14:45', kind: 'training' },
  { id: 'f_refuel', label: 'Shower and protein', start: '14:45', end: '15:15', kind: 'rest' },
  { id: 'f_dinner', label: 'Food out', start: '18:30', end: '19:30', kind: 'food' },
  { id: 'f_family', label: 'Family time', start: '19:30', end: '21:00', kind: 'family' },
  { id: 'f_plan', label: 'Close the day and plan tomorrow', start: '21:00', end: '21:15', kind: 'plan' },
  { id: 'f_wind', label: 'Wind down, screens off', start: '21:15', end: '22:15', kind: 'wind' },
  { id: 'f_sleep', label: 'Lights out', start: '22:30', end: '23:00', kind: 'sleep' },
];

export function defaultSettings() {
  return {
    theme: 'dark',
    tone: 'drill',
    sound: false,
    deep: { days: [2, 5], start: '09:00', mins: 45, showTime: false },
    workStart: '08:45',
    workEnd: '18:30',
    breakEvery: 90,
    fixed: DEFAULT_FIXED.map((f) => ({ ...f })),
    notify: { enabled: false, blocks: true, warn: true, idle: true, habits: true, plan: true },
    ads: { targetRoas: 1.45, minRoas: 1.0, budgetLow: 800, budgetHigh: 1000 },
  };
}

function fresh() {
  const today = ymd();
  return {
    v: 1,
    profile: { name: 'John', surname: 'Simpson', business: 'INFRNO / Musclefier', onboarded: false },
    mode: 'sample',
    settings: defaultSettings(),
    ...sampleState(today),
    timer: null, // { date, taskId, since }
    breakUntil: null,
    ads: { decisions: {}, changes: [] },
    sent: {}, // reminder keys already fired, per day
    thinking: { sessions: [], next: 0, lastQ: null, active: null },
    lastOpen: today,
    lastActive: Date.now(),
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || typeof s.days !== 'object') throw new Error('bad shape');
    return s;
  } catch (e) {
    if (e.message === 'bad shape' || e instanceof SyntaxError) {
      console.warn('Saved data was unreadable, starting fresh.');
      state_recovered = true;
    }
    return memoryFallback;
  }
}

export let state_recovered = false;
export let state = read() || fresh();
migrate(state);

function migrate(s) {
  const d = defaultSettings();
  s.settings = { ...d, ...s.settings, notify: { ...d.notify, ...(s.settings?.notify || {}) }, ads: { ...d.ads, ...(s.settings?.ads || {}) }, deep: { ...d.deep, ...(s.settings?.deep || {}) } };
  if (!Array.isArray(s.settings.deep.days)) s.settings.deep.days = d.deep.days;
  if (!Array.isArray(s.settings.fixed)) s.settings.fixed = d.fixed;
  // Add the 5-minute meditation block once to days saved before it existed.
  if (!s.settings.medAdded) {
    if (!s.settings.fixed.some((f) => f.kind === 'meditate')) s.settings.fixed.push({ ...DEFAULT_FIXED.find((f) => f.kind === 'meditate') });
    s.settings.fixed.sort((a, b) => a.start.localeCompare(b.start));
    s.settings.medAdded = true;
  }
  s.thinking = { sessions: [], next: 0, lastQ: null, active: null, ...(s.thinking || {}) };
  if (!Array.isArray(s.thinking.sessions)) s.thinking.sessions = [];
  s.ads = s.ads || { decisions: {}, changes: [] };
  s.sent = s.sent || {};
  s.habits = s.habits || {};
  s.money = s.money || { tx: [] };
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    memoryFallback = state;
  }
  listeners.forEach((fn) => fn());
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetAll(keepSettings = true) {
  const s = fresh();
  if (keepSettings) {
    s.settings = state.settings;
    s.profile = { ...state.profile };
  }
  s.thinking = state.thinking; // his own writing is never part of the sample
  state = s;
  save();
}

export function getDay(date) {
  if (!state.days[date]) state.days[date] = { tasks: [], manual: false, closed: false };
  return state.days[date];
}

export function findTask(id) {
  for (const [date, day] of Object.entries(state.days)) {
    const t = day.tasks.find((x) => x.id === id);
    if (t) return { date, day, task: t };
  }
  return null;
}

export function newTask(fields) {
  return { id: uid(), status: 'todo', spent: 0, created: Date.now(), mins: 30, deadline: null, money: 1, ...fields };
}

// Bring the app up to today: stop a timer left running overnight, roll any
// unfinished tasks from days that were never closed.
export function catchUp(today = ymd()) {
  const rolled = [];
  if (state.timer && state.timer.date !== today) {
    const hit = findTask(state.timer.taskId);
    if (hit) {
      const end = new Date(state.timer.date + 'T23:59:00').getTime();
      hit.task.spent += Math.max(0, Math.min(end, Date.now()) - state.timer.since) / 1000;
      hit.task.status = 'todo';
    }
    state.timer = null;
  }
  const open = Object.keys(state.days).filter((d) => d < today && !state.days[d].closed).sort();
  open.forEach((d) => {
    const day = state.days[d];
    const left = day.tasks.filter((t) => t.status === 'todo' || t.status === 'active');
    left.forEach((t) => {
      t.status = 'rolled';
      rolled.push({ t, d });
    });
    day.closed = true;
    day.autoClosed = true;
  });
  if (rolled.length) {
    const tday = getDay(today);
    rolled.forEach(({ t, d }) => {
      if (tday.tasks.some((x) => x.origin === t.id)) return;
      tday.tasks.push(newTask({ title: t.title, mins: t.mins, deadline: t.deadline, money: t.money, rolledFrom: d, rolled: (t.rolled || 0) + 1, origin: t.id }));
    });
  }
  // Keep reminder keys for today only.
  Object.keys(state.sent).forEach((k) => { if (k !== today) delete state.sent[k]; });
  state.lastOpen = today;
  getDay(addDays(today, 1));
  save();
  return rolled.length;
}
