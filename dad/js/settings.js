// Settings: connections, reminders, fixed day, ad targets, look, data.
import { state, save, resetAll, defaultSettings } from './store.js';
import { PROVIDERS, connect, LIVE } from './integrations.js';
import { esc, hmToMins, uid } from './util.js';
import { icon } from './icons.js';
import { bus, seg, openSheet, closeSheet, pill } from './ui.js';
import * as notify from './notify.js';
import { voice, head } from './timer.js';
import { play, unlock } from './sound.js';

function connections() {
  const row = (p) => `<li class="conn">
    <span class="conn-ico">${icon(p.icon, 20)}</span>
    <span class="conn-main"><strong>${esc(p.name)}</strong><small>${esc(p.what)}</small></span>
    ${p.phase === 1 ? `${pill('Sample data', 'warn')}<button class="btn ${LIVE ? 'primary' : 'ghost'} sm" data-act="connect" data-id="${p.id}">Connect</button>` : pill('Later', 'mute')}
  </li>`;
  return `<section class="card" id="connections">
    <div class="card-head"><h3>${icon('link', 18)} Your accounts</h3></div>
    <p class="muted small">You connect each one yourself by logging in to it and pressing Allow. Your passwords never come to this app or to Jack.</p>
    <ul class="conn-list">${PROVIDERS.filter((p) => p.phase === 1).map(row).join('')}</ul>
    <h4 class="mini-h">Coming later</h4>
    <ul class="conn-list later">${PROVIDERS.filter((p) => p.phase === 2).map(row).join('')}</ul>
  </section>`;
}

function reminders() {
  const n = state.settings.notify;
  const perm = notify.permission();
  const iosHint = notify.isIos() && !notify.isStandalone();
  const toggle = (k, label, sub) => `<label class="switch-row"><span><strong>${label}</strong><small>${sub}</small></span><input type="checkbox" class="switch" data-act="notify-flag" data-k="${k}" ${n[k] !== false ? 'checked' : ''}></label>`;
  return `<section class="card" id="reminders">
    <div class="card-head"><h3>${icon('bell', 18)} Reminders</h3>${n.enabled && perm === 'granted' ? pill('On', 'good') : pill('Off', 'mute')}</div>
    ${perm === 'unsupported' ? '<p class="muted">This browser cannot show notifications. Use Chrome or Safari, or add the app to your home screen.</p>' : ''}
    ${iosHint ? `<div class="hint">${icon('phone', 18)}<span>On iPhone, reminders only work once the app is on your home screen. Tap the Share button, then <strong>Add to Home Screen</strong>, then open it from there.</span></div>` : ''}
    ${perm === 'denied' ? '<p class="muted">Notifications are blocked for this site. Turn them on in your browser or phone settings, then come back.</p>' : ''}
    <div class="row gap wrap">
      ${!(n.enabled && perm === 'granted') ? `<button class="btn primary" data-act="notify-on" ${perm === 'unsupported' || perm === 'denied' ? 'disabled' : ''}>${icon('bell', 16)} Turn on reminders</button>` : '<button class="btn ghost" data-act="notify-off">Turn off</button>'}
      <button class="btn ghost" data-act="notify-test">Send a test</button>
    </div>
    <div class="field"><span>How pushy</span>${seg('tone', [['drill', 'Proper drill sergeant'], ['firm', 'Firm']], state.settings.tone, 'full')}</div>
    <p class="sarge-sample">${icon('flame', 15)}<span>${esc(voice('idle', { task: 'Meta ads review' }, 'sample'))}</span></p>
    <div class="switches">
      ${toggle('blocks', 'Start of each block', 'Wake up, gym, food, family, wind down')}
      ${toggle('warn', 'Five minutes left and time up', 'While a task is on the clock')}
      ${toggle('idle', 'No clock running', 'After 10 minutes of work time with nothing started')}
      ${toggle('habits', 'Evening tick check', 'At 8pm if any daily ticks are empty')}
      ${toggle('plan', 'Plan tomorrow', 'At 9pm, close the day')}
    </div>
    <div class="later-row"><span class="conn-ico">${icon('whatsapp', 20)}</span><span class="conn-main"><strong>WhatsApp reminders</strong><small>Add-on for later. Needs Meta to approve the message templates, and costs a small amount per message.</small></span>${pill('Later', 'mute')}</div>
  </section>`;
}

const WEEK = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];

function deepCard() {
  const d = state.settings.deep;
  return `<section class="card" id="deep">
    <div class="card-head"><h3>${icon('think', 18)} Deep thinking</h3></div>
    <p class="muted small">${d.mins}-minute sessions on the days you pick. They sit in your day plan like the gym, and tasks fit round them.</p>
    <form data-form="deep" class="form" novalidate>
      <div class="day-chips" role="group" aria-label="Days">
        ${WEEK.map(([n, l]) => `<button type="button" class="chip ${d.days.includes(n) ? 'on' : ''}" data-act="deep-day" data-v="${n}" aria-pressed="${d.days.includes(n)}">${l}</button>`).join('')}
      </div>
      <label class="field sm"><span>Starts at</span><input type="time" name="start" value="${d.start}" required></label>
      <p class="form-err" id="deep-err" role="alert"></p>
      <button class="btn primary sm" type="submit">Save sessions</button>
    </form>
  </section>`;
}

function fixedDay() {
  const s = state.settings;
  return `<section class="card" id="fixed">
    <div class="card-head"><h3>${icon('today', 18)} Your fixed day</h3><button class="link" data-act="fixed-reset">Reset</button></div>
    <p class="muted small">These never get moved. Tasks fit around them, inside your work hours.</p>
    <form data-form="fixed" class="form" novalidate>
      <div class="row gap wrap work-hours">
        <label class="field sm"><span>Work starts</span><input type="time" name="workStart" value="${s.workStart}" required></label>
        <label class="field sm"><span>Work ends</span><input type="time" name="workEnd" value="${s.workEnd}" required></label>
        <label class="field sm"><span>Break after (mins)</span><input type="number" name="breakEvery" min="30" max="240" step="15" value="${s.breakEvery}"></label>
      </div>
      <ul class="fixed-list">
        ${s.fixed.map((f) => `<li class="fixed-row" data-fid="${f.id}">
          <input name="label" value="${esc(f.label)}" maxlength="60" aria-label="Block name">
          <input name="start" type="time" value="${f.start}" aria-label="Starts">
          <input name="end" type="time" value="${f.end}" aria-label="Ends">
          <button type="button" class="icon-btn" data-act="fixed-del" data-id="${f.id}" aria-label="Remove ${esc(f.label)}">${icon('trash', 16)}</button>
        </li>`).join('')}
      </ul>
      <p class="form-err" id="fixed-err" role="alert"></p>
      <div class="row gap"><button type="button" class="btn ghost sm" data-act="fixed-add">${icon('plus', 15)} Add a block</button><button class="btn primary sm" type="submit">Save my day</button></div>
    </form>
  </section>`;
}

function adTargets() {
  const a = state.settings.ads;
  return `<section class="card" id="targets">
    <div class="card-head"><h3>${icon('target', 18)} Ad targets</h3></div>
    <form data-form="targets" class="form" novalidate>
      <div class="targets-grid">
        <label class="field sm"><span>Target ROAS</span><input name="targetRoas" type="number" step="0.05" min="0.5" max="10" value="${a.targetRoas}"></label>
        <label class="field sm"><span>Never below</span><input name="minRoas" type="number" step="0.05" min="0.1" max="10" value="${a.minRoas}"></label>
        <label class="field sm"><span>Monthly budget from (£)</span><input name="budgetLow" type="number" step="50" min="0" value="${a.budgetLow}"></label>
        <label class="field sm"><span>Monthly budget to (£)</span><input name="budgetHigh" type="number" step="50" min="0" value="${a.budgetHigh}"></label>
      </div>
      <p class="form-err" id="targets-err" role="alert"></p>
      <button class="btn primary sm" type="submit">Save targets</button>
    </form>
  </section>`;
}

function lookAndData() {
  return `<div class="grid-2">
    <section class="card">
      <div class="card-head"><h3>${icon('sun', 18)} Look</h3></div>
      ${seg('theme', [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match my phone']], state.settings.theme, 'full')}
      <label class="switch-row sound-row"><span><strong>Sounds</strong><small>A soft tone on start-up, a tick when the clock starts, a thud with the sergeant, a chime on a perfect day.</small></span><input type="checkbox" class="switch" data-act="sound-flag" ${state.settings.sound ? 'checked' : ''} aria-label="Sounds"></label>
      <form data-form="profile" class="form">
        <div class="row gap wrap">
          <label class="field sm"><span>First name</span><input name="name" value="${esc(state.profile.name)}" maxlength="30"></label>
          <label class="field sm"><span>Surname (the sergeant uses it)</span><input name="surname" value="${esc(state.profile.surname)}" maxlength="30"></label>
        </div>
        <button class="btn ghost sm" type="submit">Save names</button>
      </form>
    </section>
    <section class="card">
      <div class="card-head"><h3>${icon('download', 18)} Your data</h3></div>
      <p class="muted small">Right now everything is saved on this device only. Once your login is set up it is kept safely online and works on your phone and laptop together.</p>
      <div class="row gap wrap">
        <button class="btn ghost sm" data-act="export">${icon('download', 15)} Download a backup</button>
        <button class="btn ghost sm" data-act="reset-sample">${icon('refresh', 15)} Reset the sample data</button>
        <button class="btn danger-ghost sm" data-act="wipe">${icon('trash', 15)} Start empty</button>
      </div>
    </section>
  </div>`;
}

export function view() {
  return `
  <header class="page-head"><div><p class="eyebrow">Settings</p><h1>Set it up your way</h1><p class="sub">Accounts, reminders, your fixed day and targets.</p></div></header>
  <div class="grid-2 settings-grid">
    <div class="col">${connections()}${reminders()}</div>
    <div class="col">${fixedDay()}${deepCard()}${adTargets()}</div>
  </div>
  ${lookAndData()}
  <p class="muted small foot-note">Built for John by Jack at ApexLine. Version 1, sample data.</p>`;
}

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export const actions = {
  connect: (el) => {
    const p = PROVIDERS.find((x) => x.id === el.dataset.id);
    if (!p) return;
    if (connect(p.id)) return;
    openSheet(`<div class="explain">
      <div class="ask-icon">${icon(p.icon, 26)}</div>
      <h2>Connect ${esc(p.name)}</h2>
      <p>${esc(p.what)}</p>
      <ol class="steps-list">
        <li>Press Connect. ${esc(p.name.split(' ')[0])}'s own login page opens.</li>
        <li>Log in as normal. Your password goes to them, not to this app.</li>
        <li>Check what it asks for: <strong>${esc(p.allow)}</strong></li>
        <li>Press Allow. You come straight back here and your real numbers appear.</li>
      </ol>
      <div class="hint">${icon('lock', 18)}<span>This is the practice version with sample data, so Connect switches on when Jack sets up your secure login. Nothing has been connected.</span></div>
      <button class="btn primary" data-close>Got it</button>
    </div>`, { id: 'connect' });
  },
  'notify-on': async () => {
    const p = await notify.ask();
    state.settings.notify.enabled = p === 'granted';
    save();
    if (p === 'granted') notify.alertMe(head('default'), voice('test'), { force: true, tag: 'test' });
    else notify.toast(p === 'denied' ? 'Notifications are blocked. Allow them in your browser settings.' : 'Reminders not turned on.', { kind: 'info' });
    bus.render();
  },
  'notify-off': () => { state.settings.notify.enabled = false; save(); bus.render(); },
  'notify-test': () => notify.alertMe(head('default'), voice('test'), { force: true, tag: 'test', enabled: state.settings.notify.enabled }),
  'notify-flag': (el) => { state.settings.notify[el.dataset.k] = el.checked; save(); },
  'deep-day': (el) => {
    const on = el.getAttribute('aria-pressed') !== 'true';
    el.setAttribute('aria-pressed', String(on));
    el.classList.toggle('on', on);
  },
  'sound-flag': (el) => {
    state.settings.sound = el.checked;
    save();
    if (el.checked) { unlock(); play('perfect'); }
  },
  tone: (el) => { state.settings.tone = el.dataset.v; save(); bus.render(); },
  theme: (el) => { state.settings.theme = el.dataset.v; save(); applyTheme(); bus.render(); },
  'fixed-del': (el) => { el.closest('li').remove(); },
  'fixed-add': () => {
    const ul = document.querySelector('.fixed-list');
    const li = document.createElement('li');
    li.className = 'fixed-row';
    li.dataset.fid = 'f_' + uid();
    li.innerHTML = `<input name="label" value="" placeholder="e.g. School run" maxlength="60" aria-label="Block name"><input name="start" type="time" value="16:00" aria-label="Starts"><input name="end" type="time" value="16:30" aria-label="Ends"><button type="button" class="icon-btn" data-act="fixed-del" aria-label="Remove">${icon('trash', 16)}</button>`;
    ul.appendChild(li);
    li.querySelector('input').focus();
  },
  'fixed-reset': () => {
    const d = defaultSettings();
    Object.assign(state.settings, { fixed: d.fixed, workStart: d.workStart, workEnd: d.workEnd, breakEvery: d.breakEvery });
    save();
    bus.render();
    notify.toast('Fixed day reset.', { kind: 'info' });
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `command-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  'reset-sample': () => {
    openSheet(`<div class="explain"><h2>Reset the sample data?</h2><p>Tasks, ticks, money and ad approvals go back to the starting sample. Your settings stay.</p>
      <div class="row gap sheet-actions"><button class="btn primary" data-act="reset-yes">Reset</button><button class="btn ghost" data-close>Cancel</button></div></div>`, { id: 'confirm' });
  },
  'reset-yes': () => { resetAll(true); closeSheet(true); bus.render(); notify.toast('Sample data reset.', { kind: 'good' }); },
  wipe: () => {
    openSheet(`<div class="explain"><h2>Start with an empty app?</h2><p>This clears every task, tick, transaction and approval on this device so you can start using it for real. Ads stay on sample numbers until Meta is connected. This cannot be undone, so download a backup first if you want one.</p>
      <div class="row gap sheet-actions"><button class="btn danger" data-act="wipe-yes">Clear everything</button><button class="btn ghost" data-close>Cancel</button></div></div>`, { id: 'confirm' });
  },
  'wipe-yes': () => {
    resetAll(true);
    state.days = {};
    state.habits = {};
    state.money = { tx: [] };
    save();
    closeSheet(true);
    bus.render();
    notify.toast('All clear. Add your first task on Today.', { kind: 'good' });
  },
};

export const forms = {
  fixed: (f) => {
    const err = f.querySelector('#fixed-err');
    err.textContent = '';
    f.querySelectorAll('.bad').forEach((x) => x.classList.remove('bad'));
    const ws = hmToMins(f.workStart.value);
    const we = hmToMins(f.workEnd.value);
    if (ws === null || we === null || we <= ws) { err.textContent = 'Work must end after it starts.'; f.workEnd.classList.add('bad'); return; }
    const rows = [...f.querySelectorAll('.fixed-row')];
    const out = [];
    for (const r of rows) {
      const label = r.querySelector('[name=label]').value.trim();
      const s = r.querySelector('[name=start]').value;
      const e = r.querySelector('[name=end]').value;
      if (!label) { r.querySelector('[name=label]').classList.add('bad'); err.textContent = 'Every block needs a name.'; return; }
      if (hmToMins(s) === null || hmToMins(e) === null || hmToMins(e) <= hmToMins(s)) { r.querySelector('[name=end]').classList.add('bad'); err.textContent = `"${label}" must end after it starts.`; return; }
      const old = state.settings.fixed.find((x) => x.id === r.dataset.fid);
      out.push({ id: r.dataset.fid, label, start: s, end: e, kind: old ? old.kind : 'other' });
    }
    out.sort((a, b) => hmToMins(a.start) - hmToMins(b.start));
    Object.assign(state.settings, { fixed: out, workStart: f.workStart.value, workEnd: f.workEnd.value, breakEvery: Math.max(30, Math.min(240, +f.breakEvery.value || 90)) });
    save();
    bus.render();
    notify.toast('Your day is saved. The plan has been rebuilt.', { kind: 'good' });
  },
  deep: (f) => {
    const err = f.querySelector('#deep-err');
    err.textContent = '';
    f.start.classList.remove('bad');
    const days = [...f.querySelectorAll('[data-act="deep-day"][aria-pressed="true"]')].map((b) => +b.dataset.v);
    const s = hmToMins(f.start.value);
    const mins = state.settings.deep.mins;
    if (!days.length) { err.textContent = 'Pick at least one day.'; return; }
    if (s === null || s < 6 * 60 || s + mins > 22 * 60) { err.textContent = 'Pick a start time between 6am and 9:15pm.'; f.start.classList.add('bad'); return; }
    const clash = state.settings.fixed.find((x) => hmToMins(x.start) < s + mins && hmToMins(x.end) > s);
    if (clash) { err.textContent = `That clashes with "${clash.label}" (${clash.start} to ${clash.end}). Pick another time.`; f.start.classList.add('bad'); return; }
    Object.assign(state.settings.deep, { days, start: f.start.value });
    save();
    bus.render();
    notify.toast('Deep thinking saved. Your plan has been rebuilt.', { kind: 'good' });
  },
  targets: (f) => {
    const err = f.querySelector('#targets-err');
    const v = { targetRoas: +f.targetRoas.value, minRoas: +f.minRoas.value, budgetLow: +f.budgetLow.value, budgetHigh: +f.budgetHigh.value };
    if (!(v.targetRoas > 0) || !(v.minRoas > 0)) { err.textContent = 'ROAS numbers must be above 0.'; return; }
    if (v.minRoas > v.targetRoas) { err.textContent = 'The floor cannot be above the target.'; return; }
    if (!(v.budgetHigh >= v.budgetLow) || v.budgetLow < 0) { err.textContent = 'The top of the budget must be at least the bottom.'; return; }
    state.settings.ads = v;
    save();
    bus.render();
    notify.toast('Targets saved. Advice updated.', { kind: 'good' });
  },
  profile: (f) => {
    state.profile.name = f.name.value.trim() || 'John';
    state.profile.surname = f.surname.value.trim() || 'Simpson';
    save();
    bus.render();
    notify.toast('Saved.', { kind: 'good', duration: 2000 });
  },
};
