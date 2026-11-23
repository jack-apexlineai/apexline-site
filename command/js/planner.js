// Planner brain: read a typed task, rank tasks, and lay out the day around fixed blocks.

import { ymd, addDays, daysBetween, hmToMins, shortDay, fromYmd } from './util.js';

// ---------- Typing a task ----------
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const BIG_MONEY = /\b(ads?|meta|facebook|campaign|roas|launch|offer|black friday|cyber monday|promo|sale|sales|wholesale|invoice|pricing|price rise|new product|bundle)\b/i;
const SOME_MONEY = /\b(amazon|shopify|order|orders|customer|customers|listing|listings|stock|restock|supplier|content|reel|reels|post|posts|tiktok|instagram|video|email campaign|newsletter|hooks?|creative|product|reviews?|abandoned)\b/i;
const NO_MONEY = /\b(admin|insurance|dentist|doctor|bank|renewal|tax return|car|mot|haircut|personal|house|bins?|clean)\b/i;

export function guessMoney(title) {
  if (BIG_MONEY.test(title)) return 3;
  if (SOME_MONEY.test(title)) return 2;
  if (NO_MONEY.test(title)) return 0;
  return 1;
}

const END = '(?=$|[\\s,.;:)!])';
const RE_HOURS = new RegExp('(?:^|\\s|~|\\()(\\d+(?:\\.\\d+)?)\\s*(?:h|hr|hrs|hour|hours)(?:\\s*(\\d{1,2})\\s*(?:m|min|mins|minutes)?)?' + END, 'i');
const RE_MINS = new RegExp('(?:^|\\s|~|\\()(\\d{1,3})\\s*(?:m|min|mins|minute|minutes)' + END, 'i');
const RE_HALF = /\b(half an hour|half hour)\b/i;

export function parseTask(raw, today = ymd()) {
  let t = String(raw || '').replace(/^\s*(?:[-*•·>]|\d+[.)]|\[\s?\])\s*/, '').trim();
  if (!t) return null;
  let mins = null;
  let deadline = null;
  let money = null;

  let m = t.match(RE_HOURS);
  if (m) {
    mins = Math.round(parseFloat(m[1]) * 60 + (m[2] ? parseInt(m[2], 10) : 0));
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(RE_MINS))) {
    mins = parseInt(m[1], 10);
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(RE_HALF))) {
    mins = 30;
    t = t.replace(m[0], ' ');
  }

  if ((m = t.match(/\b(today|tonight|asap|urgent)\b/i))) {
    deadline = today;
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(/\b(tomorrow|tmrw|tmr)\b/i))) {
    deadline = addDays(today, 1);
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(/\b(?:by|before|on|for)\s+(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\b/i))) {
    const want = DAYS.indexOf(m[1].slice(0, 3).toLowerCase());
    const cur = fromYmd(today).getDay();
    deadline = addDays(today, ((want - cur + 7) % 7) || 7);
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(/\bthis week\b/i))) {
    const cur = fromYmd(today).getDay();
    deadline = addDays(today, Math.max(0, (5 - cur + 7) % 7));
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(/\bnext week\b/i))) {
    deadline = addDays(today, 7);
    t = t.replace(m[0], ' ');
  } else if ((m = t.match(/\bby\s+(\d{1,2})\/(\d{1,2})\b/i))) {
    const y = fromYmd(today).getFullYear();
    let d = ymd(new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
    if (d < today) d = ymd(new Date(y + 1, parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
    deadline = d;
    t = t.replace(m[0], ' ');
  }
  if (/!\s*$/.test(t)) {
    deadline = deadline || today;
    t = t.replace(/!+\s*$/, ' ');
  }
  if ((m = t.match(/(?:^|\s)(£{1,3})(?=\s|$)/))) {
    money = Math.min(3, m[1].length + 1);
    t = t.replace(m[0], ' ');
  }

  t = t.replace(/\s+/g, ' ').replace(/\s+(for|about|around|approx|-|,|~)\s*$/i, '').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '').trim();
  if (!t) t = String(raw).trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 140) t = t.slice(0, 140).trim();
  if (mins !== null) mins = Math.min(600, Math.max(5, mins));
  return { title: t, mins: mins ?? 30, deadline, money: money ?? guessMoney(t), minsGiven: mins !== null };
}

// ---------- Ranking ----------
export function score(t, today) {
  let s = 0;
  const why = [];
  if (t.deadline) {
    const d = daysBetween(today, t.deadline);
    if (d < 0) { s += 60; why.push('overdue'); }
    else if (d === 0) { s += 50; why.push('due today'); }
    else if (d === 1) { s += 30; why.push('due tomorrow'); }
    else if (d <= 3) { s += 20; why.push(`due ${shortDay(t.deadline)}`); }
    else if (d <= 7) { s += 10; why.push(`due ${shortDay(t.deadline)}`); }
  }
  const mny = t.money ?? 1;
  s += [0, 8, 18, 28][mny];
  if (mny === 3) why.push('big earner');
  else if (mny === 2) why.push('makes money');
  if (t.rolled) {
    s += Math.min(3, t.rolled) * 6;
    why.push(t.rolled > 1 ? `rolled ${t.rolled} times` : 'rolled over');
  }
  if (t.mins <= 20) { s += 3; if (why.length < 2) why.push('quick win'); }
  return { s, why };
}

export function sortTasks(day, today) {
  const list = day.tasks.slice();
  if (day.manual) {
    return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.created - b.created);
  }
  return list.sort((a, b) => score(b, today).s - score(a, today).s || (a.deadline || '9') .localeCompare(b.deadline || '9') || a.created - b.created);
}

export const isOpen = (t) => t.status === 'todo' || t.status === 'active';

// ---------- Laying out the day ----------
// Returns timeline items sorted by start (minutes from midnight).
export function buildPlan({ date, today, nowMins, tasks, fixed, events, settings, timer, breakUntilMins }) {
  const items = [];
  const blocks = [];
  fixed.forEach((f) => {
    const s = hmToMins(f.start);
    const e = hmToMins(f.end);
    if (s === null || e === null || e <= s) return;
    blocks.push({ kind: 'fixed', sub: f.kind, label: f.label, start: s, end: e, id: f.id });
  });
  (events || []).forEach((ev) => {
    const s = hmToMins(ev.start);
    const e = hmToMins(ev.end);
    if (s === null || e === null || e <= s) return;
    blocks.push({ kind: 'calendar', sub: 'calendar', label: ev.title, start: s, end: e, id: ev.id, source: ev.source });
  });
  blocks.sort((a, b) => a.start - b.start);

  const ws = hmToMins(settings.workStart) ?? 525;
  const we = hmToMins(settings.workEnd) ?? 1110;
  let free = [[ws, we]];
  const cut = (s, e) => {
    const out = [];
    free.forEach(([a, b]) => {
      if (e <= a || s >= b) { out.push([a, b]); return; }
      if (s > a) out.push([a, s]);
      if (e < b) out.push([e, b]);
    });
    free = out;
  };
  blocks.forEach((b) => cut(b.start, b.end));

  const isToday = date === today;
  let floor = ws;
  if (isToday) floor = Math.max(ws, Math.ceil(nowMins / 5) * 5);
  if (isToday && breakUntilMins) {
    items.push({ kind: 'break', label: 'Break', start: Math.floor(nowMins), end: breakUntilMins, live: true });
    floor = Math.max(floor, Math.ceil(breakUntilMins / 5) * 5);
  }

  const queue = tasks.filter((t) => t.status === 'todo' || t.status === 'active');
  const placed = [];
  const overflow = [];

  // A running task sits where it actually started.
  if (isToday && timer) {
    const t = queue.find((x) => x.id === timer.taskId);
    if (t) {
      const spentBefore = (t.spent || 0) / 60;
      const start = Math.max(0, nowMins - spentBefore - (Date.now() - timer.since) / 60000);
      const planned = t.mins + (t.extra || 0) / 60;
      const end = Math.max(start + planned, nowMins + 1);
      placed.push({ kind: 'task', task: t, start, end, live: true });
      cut(start, end);
      floor = Math.max(floor, Math.ceil(end / 5) * 5);
      queue.splice(queue.indexOf(t), 1);
    }
  }
  if (isToday) cut(0, floor);

  const breakEvery = settings.breakEvery || 90;
  const runBefore = (s) => {
    let run = 0;
    let edge = s;
    for (;;) {
      const prev = placed.find((p) => p.kind === 'task' && Math.abs(p.end - edge) < 0.5);
      if (!prev) break;
      run += prev.end - prev.start;
      edge = prev.start;
    }
    return run;
  };

  queue.forEach((t) => {
    for (let i = 0; i < free.length; i++) {
      let [a, b] = free[i];
      const run = runBefore(a);
      let brk = 0;
      if (run >= 45 && run + t.mins > breakEvery) brk = 10;
      if (a + brk + t.mins <= b) {
        if (brk) placed.push({ kind: 'break', label: 'Break: stand up, drink water', start: a, end: a + brk });
        placed.push({ kind: 'task', task: t, start: a + brk, end: a + brk + t.mins });
        free[i] = [a + brk + t.mins, b];
        return;
      }
    }
    overflow.push(t);
  });

  blocks.forEach((b) => items.push({ ...b, past: isToday && b.end <= nowMins }));
  placed.forEach((p) => items.push(p));
  items.sort((a, b) => a.start - b.start || (a.kind === 'task' ? 1 : -1));

  const freeLeft = free.reduce((acc, [a, b]) => acc + Math.max(0, b - a), 0);
  const planned = placed.filter((p) => p.kind === 'task').reduce((acc, p) => acc + (p.end - p.start), 0);
  return { items, overflow, freeLeft, planned, workStart: ws, workEnd: we };
}

export function deadlineLabel(deadline, today) {
  if (!deadline) return null;
  const d = daysBetween(today, deadline);
  if (d < 0) return { text: 'Overdue', tone: 'bad' };
  if (d === 0) return { text: 'Today', tone: 'warn' };
  if (d === 1) return { text: 'Tomorrow', tone: 'plain' };
  if (d <= 6) return { text: shortDay(deadline), tone: 'plain' };
  const dt = fromYmd(deadline);
  return { text: `${dt.getDate()}/${dt.getMonth() + 1}`, tone: 'plain' };
}

export const MONEY_LABELS = ['No money', 'Low', 'Makes money', 'Big earner'];
