// Merging two copies of the app state when two devices both changed it.
//
// The rule: the copy edited most recently wins for settings and simple values (last write wins),
// but lists are merged item by item so nothing real is lost:
//   - tasks, money transactions, ad change log: merged by id. A deletion only sticks when the
//     item was in the last synced copy (base) and the other device had not changed it since.
//   - a task done on either device stays done.
//   - daily ticks: a tick on either device is kept. An untick only sticks when the newer copy
//     made it on purpose (the tick was there in base).
//   - deep thinking sessions: never dropped. They are also kept in their own append-only table.
//   - reminder keys already sent: kept from both, so nothing fires twice.
//
// base   = the last copy both sides agreed on (may be null the first time a device syncs)
// local  = this device's copy
// remote = the server's copy
// localNewer = true when this device's edit is the most recent one
// Pure functions, no browser APIs, so they run in Node tests too.

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// Three-way merge of two maps keyed by id. pick(a, b) decides when both changed the same item,
// where a is the winner's version and b the other's.
export function mergeMap(base, win, lose, pick = (a) => a) {
  base = isObj(base) ? base : null;
  win = isObj(win) ? win : {};
  lose = isObj(lose) ? lose : {};
  const out = {};
  const keys = new Set([...Object.keys(win), ...Object.keys(lose)]);
  for (const k of keys) {
    const inW = k in win;
    const inL = k in lose;
    const inB = !!base && k in base;
    if (inW && inL) {
      if (same(win[k], lose[k])) out[k] = clone(win[k]);
      else if (inB && same(win[k], base[k])) out[k] = clone(lose[k]);
      else if (inB && same(lose[k], base[k])) out[k] = clone(win[k]);
      else out[k] = clone(pick(win[k], lose[k]));
    } else if (inW) {
      // Missing on the other side: deleted there, or new here.
      if (inB && same(win[k], base[k])) continue; // other side deleted it, we did not touch it
      out[k] = clone(win[k]);
    } else {
      if (inB && same(lose[k], base[k])) continue;
      out[k] = clone(lose[k]);
    }
  }
  return out;
}

// Same as mergeMap for arrays of objects with an id. Keeps the winner's order, then new items.
export function mergeList(base, win, lose, keyOf = (x) => x && x.id, pick) {
  const toMap = (arr) => {
    const m = {};
    (Array.isArray(arr) ? arr : []).forEach((x) => { const k = keyOf(x); if (k !== undefined && k !== null) m[String(k)] = x; });
    return m;
  };
  const merged = mergeMap(Array.isArray(base) ? toMap(base) : null, toMap(win), toMap(lose), pick);
  const order = [];
  const seen = new Set();
  for (const arr of [win, lose]) {
    (Array.isArray(arr) ? arr : []).forEach((x) => {
      const k = String(keyOf(x));
      if (k in merged && !seen.has(k)) { seen.add(k); order.push(merged[k]); }
    });
  }
  return order;
}

// When both devices changed the same task: done beats not done, time spent is the larger.
export function pickTask(a, b) {
  let out = a;
  if (b && b.status === 'done' && a.status !== 'done') out = b;
  const spent = Math.max(Number(a.spent) || 0, Number(b && b.spent) || 0);
  return { ...out, spent };
}

function mergeDays(base, win, lose) {
  base = isObj(base) ? base : {};
  win = isObj(win) ? win : {};
  lose = isObj(lose) ? lose : {};
  const out = {};
  for (const d of new Set([...Object.keys(win), ...Object.keys(lose)])) {
    const w = win[d];
    const l = lose[d];
    if (!w || !l) {
      out[d] = clone(w || l);
      continue;
    }
    const b = base[d] || null;
    const day = { ...clone(l), ...clone(w) };
    day.tasks = mergeList(b ? b.tasks : null, w.tasks, l.tasks, (t) => t && t.id, pickTask);
    day.closed = !!(w.closed || l.closed);
    out[d] = day;
  }
  return out;
}

// Ticks: { date: { habitId: true } }. Keep a tick from either side, unless the newer copy
// removed one that was in base (a deliberate untick).
function mergeHabits(base, win, lose) {
  base = isObj(base) ? base : {};
  win = isObj(win) ? win : {};
  lose = isObj(lose) ? lose : {};
  const out = {};
  for (const d of new Set([...Object.keys(win), ...Object.keys(lose)])) {
    const w = win[d] || {};
    const l = lose[d] || {};
    const b = base[d] || {};
    const day = {};
    for (const id of new Set([...Object.keys(w), ...Object.keys(l)])) {
      if (w[id]) day[id] = w[id];
      else if (l[id]) {
        const winnerUnticked = id in b && b[id] && !(id in w) && d in win;
        if (!winnerUnticked) day[id] = l[id];
      }
    }
    if (Object.keys(day).length || d in win) out[d] = day;
  }
  return out;
}

function mergeThinking(base, win, lose) {
  const w = isObj(win) ? win : {};
  const l = isObj(lose) ? lose : {};
  const out = { ...clone(l), ...clone(w) };
  // Union by id. No base: a session is never treated as deleted.
  out.sessions = mergeList(null, w.sessions, l.sessions, (s) => s && s.id).sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  if (!w.active && l.active) {
    // An open session on the other device that this device does not know about is kept,
    // unless it has already been saved as a finished session.
    if (!out.sessions.some((s) => s.id === l.active.id)) out.active = clone(l.active);
  }
  return out;
}

function mergeSent(win, lose) {
  const out = clone(isObj(lose) ? lose : {}) || {};
  for (const [d, v] of Object.entries(isObj(win) ? win : {})) out[d] = { ...(out[d] || {}), ...clone(v) };
  return out;
}

export function mergeState(base, local, remote, { localNewer = true } = {}) {
  if (!isObj(remote)) return clone(local);
  if (!isObj(local)) return clone(remote);
  const win = localNewer ? local : remote;
  const lose = localNewer ? remote : local;
  base = isObj(base) ? base : {};
  const out = { ...clone(lose), ...clone(win) };
  out.days = mergeDays(base.days, win.days, lose.days);
  out.habits = mergeHabits(base.habits, win.habits, lose.habits);
  const wm = win.money || {};
  const lm = lose.money || {};
  out.money = { ...clone(lm), ...clone(wm), tx: mergeList(base.money && base.money.tx, wm.tx, lm.tx) };
  const wa = win.ads || {};
  const la = lose.ads || {};
  out.ads = {
    ...clone(la), ...clone(wa),
    decisions: mergeMap(base.ads ? base.ads.decisions || {} : null, wa.decisions, la.decisions),
    changes: mergeList(base.ads && base.ads.changes, wa.changes, la.changes, (c) => c && `${c.recId}:${c.at}`),
  };
  out.thinking = mergeThinking(base.thinking, win.thinking, lose.thinking);
  out.sent = mergeSent(win.sent, lose.sent);
  out.lastActive = Math.max(Number(local.lastActive) || 0, Number(remote.lastActive) || 0);
  return out;
}
