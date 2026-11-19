// Simple money tracking: in, out, profit, where it went, subscriptions.
import { state, save } from './store.js';
import { ymd, esc, money, uid, monthName, shortDate, sum } from './util.js';
import { icon } from './icons.js';
import { bus, seg, openSheet, closeSheet } from './ui.js';
import { toast } from './notify.js';

const today = () => ymd();
let month = null;
let filter = 'all';
let showAll = false;

export const CATS = {
  in: ['Shopify', 'Amazon', 'Wholesale', 'Other income'],
  out: ['Meta ads', 'Stock', 'Shipping', 'Packaging', 'Software', 'Agency', 'Office', 'Accounts', 'Other'],
};

const curMonth = () => month || today().slice(0, 7);
const shiftMonth = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${monthName(mo - 1)} ${y}`;
};

export function monthTotals(m) {
  const tx = state.money.tx.filter((t) => t.date.startsWith(m));
  const inn = sum(tx.filter((t) => t.type === 'in'), (t) => t.amount);
  const out = sum(tx.filter((t) => t.type === 'out'), (t) => t.amount);
  return { tx, inn, out, profit: inn - out };
}

function bars(groups, total, tone) {
  const max = Math.max(1, ...groups.map((g) => g[1]));
  return `<ul class="cat-bars">${groups.map(([k, v]) => `<li>
    <div class="cat-top"><span>${esc(k)}</span><span>${money(v)} <small class="muted">${total ? Math.round((v / total) * 100) : 0}%</small></span></div>
    <div class="cat-track"><span class="${tone}" style="width:${((v / max) * 100).toFixed(1)}%"></span></div>
  </li>`).join('')}</ul>`;
}

function group(tx) {
  const g = {};
  tx.forEach((t) => { g[t.cat] = (g[t.cat] || 0) + t.amount; });
  return Object.entries(g).sort((a, b) => b[1] - a[1]);
}

export function view() {
  const m = curMonth();
  const cur = monthTotals(m);
  const prev = monthTotals(shiftMonth(m, -1));
  const isNow = m === today().slice(0, 7);
  const outs = cur.tx.filter((t) => t.type === 'out');
  const ins = cur.tx.filter((t) => t.type === 'in');
  const subs = outs.filter((t) => t.recurring);
  const subTotal = sum(subs, (t) => t.amount);
  const ad = sum(outs.filter((t) => t.cat === 'Meta ads'), (t) => t.amount);
  let list = cur.tx.filter((t) => filter === 'all' || t.type === filter).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const more = list.length > 25 && !showAll;
  if (more) list = list.slice(0, 25);
  const delta = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / Math.abs(b)) * 100)}% vs ${monthName(+shiftMonth(m, -1).slice(5) - 1).slice(0, 3)}` : '');
  let lastDate = '';

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${isNow ? 'This month so far' : 'Month'}</p>
      <h1>Money</h1>
      <p class="sub">What came in, what went out, and what is left.</p>
    </div>
    <div class="day-switch">
      <button class="icon-btn" data-act="month" data-v="-1" aria-label="Previous month" ${!state.money.tx.some((t) => t.date < `${m}-01`) ? 'disabled' : ''}>${icon('left', 18)}</button>
      <span class="month-lbl">${esc(monthLabel(m))}</span>
      <button class="icon-btn" data-act="month" data-v="1" aria-label="Next month" ${isNow ? 'disabled' : ''}>${icon('right', 18)}</button>
    </div>
  </header>

  <section class="stats3 money-tiles">
    <div class="card mt"><span class="stat-label">${icon('down', 14)} Money in</span><strong class="good">${money(cur.inn)}</strong><small class="muted">${delta(cur.inn, prev.inn)}</small></div>
    <div class="card mt"><span class="stat-label">${icon('up', 14)} Money out</span><strong>${money(cur.out)}</strong><small class="muted">${delta(cur.out, prev.out)}</small></div>
    <div class="card mt ${cur.profit >= 0 ? 'pos' : 'neg'}"><span class="stat-label">${icon('wallet', 14)} Left over</span><strong class="${cur.profit >= 0 ? 'good' : 'bad'}">${cur.profit < 0 ? '-' : ''}${money(Math.abs(cur.profit))}</strong><small class="muted">${cur.inn ? `${Math.round((cur.profit / cur.inn) * 100)}% of money in` : 'nothing in yet'}</small></div>
  </section>

  <div class="grid-2">
    <section class="card">
      <div class="card-head"><h3>Where it went</h3><span class="muted small">${ad && cur.inn ? `Meta ads are ${Math.round((ad / cur.inn) * 100)}% of money in` : ''}</span></div>
      ${outs.length ? bars(group(outs), cur.out, 'out') : '<p class="empty-note">Nothing out this month.</p>'}
    </section>
    <section class="card">
      <div class="card-head"><h3>Where it came from</h3></div>
      ${ins.length ? bars(group(ins), cur.inn, 'in') : '<p class="empty-note">Nothing in this month yet.</p>'}
      <div class="sub-box">
        <div class="card-head"><h3>Subscriptions</h3><strong>${money(subTotal, true)}<small class="muted"> a month</small></strong></div>
        <ul class="plain-list">${subs.map((t) => `<li><span>${esc(t.note)}</span><span>${money(t.amount, true)}</span></li>`).join('') || '<li class="muted">None this month</li>'}</ul>
      </div>
    </section>
  </div>

  <section class="card">
    <div class="card-head wrap">
      <h3>Transactions</h3>
      <div class="row gap">${seg('money-filter', [['all', 'All'], ['in', 'In'], ['out', 'Out']], filter)}<button class="btn primary sm" data-act="tx-add">${icon('plus', 16)} Add</button></div>
    </div>
    <ul class="tx-list">
      ${list.map((t) => {
        const head = t.date !== lastDate ? `<li class="tx-date">${t.date === today() ? 'Today' : esc(shortDate(t.date))}</li>` : '';
        lastDate = t.date;
        return `${head}<li><button class="tx" data-act="tx-edit" data-id="${t.id}">
          <span class="tx-ico ${t.type}">${icon(t.type === 'in' ? 'down' : 'up', 15)}</span>
          <span class="tx-main"><strong>${esc(t.note || t.cat)}</strong><small>${esc(t.cat)}${t.recurring ? ' · monthly' : ''}${t.source ? ` · from ${esc(t.source[0].toUpperCase() + t.source.slice(1))}` : ''}</small></span>
          <span class="tx-amt ${t.type}">${t.type === 'in' ? '+' : '-'}${money(t.amount, true)}</span>
        </button></li>`;
      }).join('') || '<li class="empty-note">No transactions.</li>'}
    </ul>
    ${more ? '<button class="btn ghost sm" data-act="tx-more">Show all</button>' : ''}
  </section>

  <section class="card hook">
    <div class="hook-ico">${icon('link', 20)}</div>
    <div><h3>Fills itself in later</h3><p class="muted">Shopify payouts and Meta bills come in automatically once those are connected. Xero or QuickBooks can be added after that, so you never type a bank line again.</p></div>
  </section>`;
}

function txSheet(t) {
  const isNew = !t;
  t = t || { type: 'out', cat: 'Stock', amount: '', note: '', date: today() };
  openSheet(`
    <form class="form" data-form="tx" data-id="${isNew ? '' : t.id}" novalidate>
      <h2>${isNew ? 'Add money in or out' : 'Edit transaction'}</h2>
      <div class="field">${seg('tx-type', [['in', 'Money in'], ['out', 'Money out']], t.type, 'full')}<input type="hidden" name="type" value="${t.type}"></div>
      <label class="field"><span>Amount (£)</span><input name="amount" inputmode="decimal" value="${t.amount}" placeholder="0.00" autofocus></label>
      <label class="field"><span>Category</span><select name="cat">${CATS[t.type].map((c) => `<option ${c === t.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Note</span><input name="note" maxlength="80" value="${esc(t.note)}" placeholder="e.g. Hoodie restock"></label>
      <label class="field"><span>Date</span><input name="date" type="date" value="${t.date}" max="${today()}"></label>
      <label class="check-row"><input type="checkbox" name="recurring" ${t.recurring ? 'checked' : ''}> Monthly subscription or bill</label>
      <p class="form-err" id="tx-err" role="alert"></p>
      <div class="row gap sheet-actions">
        <button class="btn primary" type="submit">${isNew ? 'Add' : 'Save'}</button>
        ${isNew ? '' : `<button type="button" class="btn danger-ghost" data-act="tx-del" data-id="${t.id}">${icon('trash', 16)} Delete</button>`}
      </div>
    </form>`, { id: 'tx' });
}

export const actions = {
  month: (el) => {
    const n = shiftMonth(curMonth(), +el.dataset.v);
    month = n > today().slice(0, 7) ? today().slice(0, 7) : n;
    showAll = false;
    bus.render();
  },
  'money-filter': (el) => { filter = el.dataset.v; bus.render(); },
  'tx-more': () => { showAll = true; bus.render(); },
  'tx-add': () => txSheet(null),
  'tx-edit': (el) => txSheet(state.money.tx.find((t) => t.id === el.dataset.id)),
  'tx-type': (el) => {
    const f = el.closest('form');
    f.type.value = el.dataset.v;
    el.parentElement.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-checked', b === el); });
    f.cat.innerHTML = CATS[el.dataset.v].map((c) => `<option>${c}</option>`).join('');
  },
  'tx-del': (el) => {
    const i = state.money.tx.findIndex((t) => t.id === el.dataset.id);
    if (i < 0) return;
    const [gone] = state.money.tx.splice(i, 1);
    save();
    closeSheet(true);
    bus.render();
    toast(`Deleted ${money(gone.amount, true)}.`, { kind: 'info', actions: [{ label: 'Undo', fn: () => { state.money.tx.push(gone); save(); bus.render(); } }] });
  },
};

export const forms = {
  tx: (f) => {
    const err = f.querySelector('#tx-err');
    const raw = String(f.amount.value).replace(/[£,\s]/g, '');
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) { err.textContent = 'Enter an amount above £0, for example 49.99.'; f.amount.focus(); return; }
    if (amount > 1e7) { err.textContent = 'That amount looks too big. Check it.'; f.amount.focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date.value)) { err.textContent = 'Pick a date.'; return; }
    if (f.date.value > today()) { err.textContent = 'Pick today or an earlier date.'; return; }
    const data = { type: f.type.value, amount: Math.round(amount * 100) / 100, cat: f.cat.value, note: f.note.value.trim().slice(0, 80), date: f.date.value, recurring: f.recurring.checked };
    if (f.dataset.id) {
      const t = state.money.tx.find((x) => x.id === f.dataset.id);
      if (t) Object.assign(t, data);
    } else {
      state.money.tx.push({ id: uid(), ...data });
    }
    save();
    closeSheet(true);
    month = data.date.slice(0, 7);
    bus.render();
    toast(f.dataset.id ? 'Saved.' : `Added ${money(data.amount, true)} ${data.type === 'in' ? 'in' : 'out'}.`, { kind: 'good', duration: 2500 });
  },
};

