// Daily ticks and streaks.
import { state, save } from './store.js';
import { HABITS } from './sample.js';
import { ymd, addDays, esc, shortDay, fromYmd, longDate } from './util.js';
import { icon } from './icons.js';
import { ring } from './charts.js';
import { bus } from './ui.js';

const today = () => ymd();
let viewDate = null;

export const ticked = (date, id) => !!state.habits[date]?.[id];
export const countFor = (date) => HABITS.filter((h) => ticked(date, h.id)).length;

export function toggle(date, id, value) {
  state.habits[date] = state.habits[date] || {};
  const v = value ?? !state.habits[date][id];
  if (v) state.habits[date][id] = true;
  else delete state.habits[date][id];
  save();
  if (v && countFor(date) === HABITS.length) bus.perfect(date);
}

// Streak = consecutive ticked days ending today (or yesterday if today is not ticked yet).
export function streak(id, upTo = today()) {
  let d = ticked(upTo, id) ? upTo : addDays(upTo, -1);
  let n = 0;
  while (ticked(d, id) && n < 3650) { n++; d = addDays(d, -1); }
  return { n, alive: ticked(upTo, id) };
}

export function best(id) {
  const dates = Object.keys(state.habits).sort();
  let b = 0;
  let run = 0;
  let prev = null;
  dates.forEach((d) => {
    if (state.habits[d][id]) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      prev = d;
      b = Math.max(b, run);
    }
  });
  return b;
}

export function perfectStreak() {
  let d = countFor(today()) === HABITS.length ? today() : addDays(today(), -1);
  let n = 0;
  while (countFor(d) === HABITS.length && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

const AUTO = [
  { id: 'amazon', re: /\bamazon\b/i },
  { id: 'content', re: /\b(post|posted|reel|reels|content|tiktok|instagram|story|stories)\b/i },
  { id: 'trained', re: /\b(gym|train|training|workout|session|run)\b/i },
  { id: 'read', re: /\bread(ing)?\b/i },
  { id: 'meditate', re: /\bmeditat(e|ed|ion|ing)\b/i },
];

export function autoTick(title, date) {
  const out = [];
  AUTO.forEach((a) => {
    if (a.re.test(title) && !ticked(date, a.id)) {
      toggle(date, a.id, true);
      out.push(HABITS.find((h) => h.id === a.id).label);
    }
  });
  return out;
}

// Compact strip for the Today screen.
export function strip(date = today()) {
  const n = countFor(date);
  return `<section class="card ticks-card">
    <div class="card-head"><h3>Daily ticks</h3><a href="#habits" class="link">${n}/${HABITS.length} · Streaks ${icon('right', 14)}</a></div>
    <div class="tick-strip">
      ${HABITS.map((h) => {
        const on = ticked(date, h.id);
        const s = streak(h.id, date).n;
        return `<button class="tick-mini ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-date="${date}" aria-pressed="${on}" aria-label="${esc(h.label)}">
          <span class="tick-ico">${icon(on ? 'check' : h.icon, 18)}</span>
          <span class="tick-lbl">${esc(h.label.replace('Drank enough water', 'Water').replace('Applied what I learned', 'Applied').replace('Posted content', 'Posted').replace('Checked Amazon', 'Amazon').replace('Meditated', 'Meditate'))}</span>
          ${s >= 2 ? `<span class="tick-streak">${icon('flame', 11)}${s}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
  </section>`;
}

export function view() {
  const t = today();
  const date = viewDate && viewDate <= t && viewDate >= addDays(t, -7) ? viewDate : t;
  const n = countFor(date);
  let week = 0;
  for (let i = 0; i < 7; i++) week += countFor(addDays(t, -i));
  const weekPct = week / (7 * HABITS.length);
  const perfect = perfectStreak();
  const cols = 42;
  const days = Array.from({ length: cols }, (_, i) => addDays(t, -(cols - 1 - i)));

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${date === t ? 'Today' : 'Catching up'} · ${esc(longDate(date))}</p>
      <h1>Daily ticks</h1>
      <p class="sub">${HABITS.length} things that make a good day. Keep the chains going.</p>
    </div>
    <div class="day-switch">
      <button class="icon-btn" data-act="habit-day" data-v="-1" aria-label="Previous day" ${date <= addDays(t, -7) ? 'disabled' : ''}>${icon('left', 18)}</button>
      <span>${date === t ? 'Today' : shortDay(date)}</span>
      <button class="icon-btn" data-act="habit-day" data-v="1" aria-label="Next day" ${date >= t ? 'disabled' : ''}>${icon('right', 18)}</button>
    </div>
  </header>

  <section class="stats3">
    <div class="stat card"><div class="stat-ring accent">${ring(n / HABITS.length, 58, 7)}<span>${n}/${HABITS.length}</span></div><div><div class="stat-label">${date === t ? 'Today' : shortDay(date)}</div><div class="stat-val">${n === HABITS.length ? 'Perfect' : `${HABITS.length - n} to go`}</div></div></div>
    <div class="stat card"><div class="stat-ico">${icon('flame', 22)}</div><div><div class="stat-label">Perfect days in a row</div><div class="stat-val">${perfect}</div></div></div>
    <div class="stat card"><div class="stat-ico">${icon('target', 22)}</div><div><div class="stat-label">Last 7 days</div><div class="stat-val">${Math.round(weekPct * 100)}%</div></div></div>
  </section>

  <section class="habit-grid">
    ${HABITS.map((h) => {
      const on = ticked(date, h.id);
      const s = streak(h.id, date);
      const b = best(h.id);
      return `<button class="habit ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}" data-date="${date}" aria-pressed="${on}">
        <span class="habit-ico">${icon(h.icon, 22)}</span>
        <span class="habit-txt"><strong>${esc(h.label)}</strong><small>${esc(h.sub)}</small></span>
        <span class="habit-streak ${s.n ? '' : 'zero'}">${icon('flame', 14)} ${s.n} day${s.n === 1 ? '' : 's'}${!s.alive && s.n && date === t ? '<em>tick today to keep it</em>' : ''}${b > s.n ? `<em>best ${b}</em>` : ''}</span>
        <span class="habit-check">${icon('check', 18)}</span>
      </button>`;
    }).join('')}
  </section>

  <section class="card">
    <div class="card-head"><h3>Last 6 weeks</h3><span class="muted small">Each square is a day</span></div>
    <div class="heat-wrap">
      <table class="heat" role="grid" aria-label="Habit history">
        <tbody>
        ${HABITS.map((h) => `<tr><th scope="row">${esc(h.label)}</th>${days.map((d) => `<td class="${ticked(d, h.id) ? 'on' : ''} ${d === t ? 'today' : ''} ${fromYmd(d).getDay() === 1 ? 'mon' : ''}" title="${esc(d)}"></td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="muted small">"Checked Amazon", "Posted content" and "Trained" tick themselves when you finish a matching task, and "Meditated" ticks itself when the 5-minute timer ends. Once Buffer is connected, a post going out ticks "Posted content" too.</p>
  </section>`;
}

export const actions = {
  habit: (el) => {
    toggle(el.dataset.date, el.dataset.id);
    bus.render();
  },
  'habit-day': (el) => {
    const t = today();
    const cur = viewDate || t;
    const next = addDays(cur, +el.dataset.v);
    viewDate = next > t ? t : next < addDays(t, -7) ? addDays(t, -7) : next;
    bus.render();
  },
};
