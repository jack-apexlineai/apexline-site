/* Shared state, PIN gate, theme, toasts and formatting for the workshop demo.
   Everything lives in this browser. Nothing is sent anywhere. */

var WS = window.WS || {};
WS.KEY = 'wsDemo:state';
WS.PIN = '240411';
WS.SEED_V = 9;

/* ---------- state ---------- */
WS.state = null;
WS._subs = [];
WS._rev = 0;

WS.load = function () {
  var raw = null;
  try { raw = localStorage.getItem(WS.KEY); } catch (e) { }
  if (raw) {
    try {
      var s = JSON.parse(raw);
      // reseed when the demo data shape changes, or when the seed is from another day
      if (s && s.v === WS.SEED_V && s.seedDay === WS.day(0)) { WS.state = s; WS._rev = s.rev || 0; return WS.state; }
    } catch (e) { }
  }
  return WS.reset(true);
};

WS.reset = function (quiet) {
  var s = WS.seed();
  s.v = WS.SEED_V;
  s.seedDay = WS.day(0);
  s.rev = (WS._rev || 0) + 1;
  WS.state = s;
  WS._rev = s.rev;
  WS.persist();
  if (!quiet) WS.toast('Demo reset to the sample data.', 'ok');
  return s;
};

WS.persist = function () {
  try { localStorage.setItem(WS.KEY, JSON.stringify(WS.state)); } catch (e) {
    WS.toast('This browser is out of storage space. Try Reset demo.', 'bad');
  }
};

/* call after any change: bumps the revision so the other app picks it up */
WS.save = function () {
  WS.state.rev = (WS.state.rev || 0) + 1;
  WS._rev = WS.state.rev;
  WS.persist();
  WS._subs.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
};

WS.onChange = function (fn) { WS._subs.push(fn); };

/* another tab (the fitter phone, say) changed something */
WS._pull = function () {
  var raw = null;
  try { raw = localStorage.getItem(WS.KEY); } catch (e) { return; }
  if (!raw) return;
  var s;
  try { s = JSON.parse(raw); } catch (e) { return; }
  if (!s || s.rev === WS._rev) return;
  WS.state = s;
  WS._rev = s.rev;
  WS._subs.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
};

WS.watch = function () {
  window.addEventListener('storage', function (e) { if (e.key === WS.KEY) WS._pull(); });
  setInterval(WS._pull, 3000);
};

/* ---------- lookups ---------- */
WS.vehicle = function (id) { return WS.state.vehicles.filter(function (v) { return v.id === id; })[0] || null; };
WS.operator = function (id) { return WS.state.operators.filter(function (o) { return o.id === id; })[0] || null; };
WS.fitter = function (id) { return WS.state.settings.fitters.filter(function (f) { return f.id === id; })[0] || null; };
WS.job = function (id) { return WS.state.jobs.filter(function (j) { return j.id === id; })[0] || null; };
WS.invoice = function (id) { return WS.state.invoices.filter(function (i) { return i.id === id; })[0] || null; };
WS.jobsOn = function (day) { return WS.state.jobs.filter(function (j) { return j.date === day; }); };

WS.STATUS = {
  booked: { label: 'Booked in', cls: '' },
  in_bay: { label: 'In bay', cls: 'go' },
  in_progress: { label: 'In progress', cls: 'go' },
  waiting_parts: { label: 'Waiting on parts', cls: 'warn' },
  qc: { label: 'QC', cls: 'warn' },
  done: { label: 'Done', cls: 'ok' }
};
WS.statusLabel = function (s) { return (WS.STATUS[s] || { label: s }).label; };
WS.statusCls = function (s) { return (WS.STATUS[s] || { cls: '' }).cls; };

/* ---------- time and money ---------- */
WS.hoursOn = function (job, upToNow) {
  var t = 0, now = Date.now();
  (job.clockOns || []).forEach(function (c) {
    var s = new Date(c.start).getTime();
    var e = c.end ? new Date(c.end).getTime() : (upToNow === false ? s : now);
    if (e > s) t += (e - s) / 3600000;
  });
  return t;
};
WS.hhmm = function (hours) {
  var m = Math.max(0, Math.round(hours * 60));
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
};
WS.hms = function (ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
WS.money = function (n) {
  return '£' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
WS.money0 = function (n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); };
WS.dateUK = function (d) {
  if (!d) return '';
  var x = WS.parse(d);
  return String(x.getDate()).padStart(2, '0') + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getMonth()] + ' ' + x.getFullYear();
};
WS.dateShort = function (d) {
  if (!d) return '';
  var x = WS.parse(d);
  return String(x.getDate()).padStart(2, '0') + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getMonth()];
};
WS.timeUK = function (t) {
  if (!t) return '';
  var x = new Date(t);
  return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
};
WS.whenUK = function (t) { return t ? WS.dateShort(t.slice(0, 10)) + ' ' + WS.timeUK(t) : ''; };
WS.dayName = function (d) {
  var x = WS.parse(d), n = WS.daysBetween(WS.day(0), d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x.getDay()] + ' ' + WS.dateShort(d);
};
WS.nowStamp = function () {
  var d = new Date();
  return WS.iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
};

/* ---------- compliance ---------- */
WS.DUE_KINDS = [
  { key: 'nextPmi', label: 'PMI' },
  { key: 'annualTest', label: 'Annual test' },
  { key: 'brakeTest', label: 'Laden brake test' },
  { key: 'tacho', label: 'Tacho calibration' },
  { key: 'loler', label: 'LOLER' }
];
WS.dueState = function (dateStr) {
  if (!dateStr) return null;
  var n = WS.daysBetween(WS.day(0), dateStr);
  if (n < 0) return { days: n, cls: 'bad', label: Math.abs(n) + ' days overdue', short: Math.abs(n) + 'd over' };
  if (n <= 14) return { days: n, cls: 'warn', label: n === 0 ? 'Due today' : 'Due in ' + n + ' days', short: n === 0 ? 'today' : n + 'd' };
  return { days: n, cls: '', label: 'Due in ' + n + ' days', short: n + 'd' };
};
WS.dueItems = function (withinDays) {
  var out = [];
  WS.state.vehicles.forEach(function (v) {
    WS.DUE_KINDS.forEach(function (k) {
      var d = v[k.key];
      if (!d) return;
      var st = WS.dueState(d);
      if (withinDays != null && st.days > withinDays) return;
      out.push({ vehicle: v, kind: k.label, key: k.key, date: d, st: st });
    });
  });
  out.sort(function (a, b) { return a.st.days - b.st.days; });
  return out;
};

/* ---------- audit ---------- */
WS.audit = function (job, who, what) {
  job.audit = job.audit || [];
  job.audit.push({ at: WS.nowStamp(), who: who, what: what });
};

/* ---------- invoice maths ---------- */
WS.quoteJob = function (job) {
  var s = WS.state.settings;
  var hours = Math.round(WS.hoursOn(job) * 100) / 100;
  var labour = Math.round(hours * s.labourRate * 100) / 100;
  var partsNet = 0;
  (job.parts || []).forEach(function (p) { partsNet += p.cost * p.qty * (1 + s.markup / 100); });
  partsNet = Math.round(partsNet * 100) / 100;
  var net = Math.round((labour + partsNet) * 100) / 100;
  var vat = Math.round(net * s.vat) / 100;
  return { hours: hours, rate: s.labourRate, labour: labour, partsNet: partsNet, net: net, vat: vat, total: Math.round((net + vat) * 100) / 100 };
};

/* ---------- toasts ---------- */
WS.toast = function (msg, kind) {
  var wrap = document.querySelector('.toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; document.body.appendChild(wrap); }
  var t = document.createElement('div');
  t.className = 'toast ' + (kind || '');
  t.innerHTML = '<div></div><button class="x" aria-label="Close">&times;</button>';
  t.firstChild.textContent = msg;
  t.querySelector('.x').onclick = function () { t.remove(); };
  wrap.appendChild(t);
  setTimeout(function () { t.remove(); }, 4200);
};

/* ---------- theme ---------- */
WS.theme = function (set) {
  var cur = document.documentElement.getAttribute('data-theme') || 'dark';
  if (set) {
    document.documentElement.setAttribute('data-theme', set);
    try { localStorage.setItem('wsDemo:theme', set); } catch (e) { }
    return set;
  }
  return cur;
};
WS.initTheme = function () {
  var t = 'dark';
  try { t = localStorage.getItem('wsDemo:theme') || 'dark'; } catch (e) { }
  document.documentElement.setAttribute('data-theme', t);
};

/* ---------- helpers ---------- */
WS.el = function (tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
WS.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
WS.$ = function (id) { return document.getElementById(id); };
WS.download = function (filename, text, mime) {
  var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
};
WS.csvCell = function (v) {
  var s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
WS.csv = function (rows) {
  return rows.map(function (r) { return r.map(WS.csvCell).join(','); }).join('\r\n');
};

/* ---------- demo banner ---------- */
WS.banner = function (extraHtml) {
  var b = WS.el('div', 'dbar');
  b.innerHTML = '<span class="dot"></span><b>Workshop demo</b><span class="desc">sample data, nothing here is real</span>' +
    '<span class="sp">' + (extraHtml || '') +
    '<button id="wsTheme" type="button">Light</button>' +
    '<button id="wsReset" type="button">Reset demo</button></span>';
  document.body.insertBefore(b, document.body.firstChild);
  var tb = WS.$('wsTheme');
  var paint = function () { tb.textContent = WS.theme() === 'dark' ? 'Light' : 'Dark'; };
  paint();
  tb.onclick = function () { WS.theme(WS.theme() === 'dark' ? 'light' : 'dark'); paint(); };
  WS.$('wsReset').onclick = function () {
    if (!confirm('Reset the demo back to the sample data? Anything you changed will go.')) return;
    WS.reset();
    location.reload();
  };
  return b;
};

/* ---------- PIN gate ---------- */
WS.gate = function (onOpen) {
  var ok = false;
  try { ok = localStorage.getItem('wsDemo:unlocked') === '1'; } catch (e) { }
  if (ok) { onOpen(); return; }

  var wrap = WS.el('div', 'lock');
  wrap.innerHTML =
    '<div class="lockbox">' +
    '<div class="logo">DC</div>' +
    '<h1>Workshop demo</h1>' +
    '<p>Enter the 6 digit demo PIN to carry on.</p>' +
    '<input class="in pinin" id="gpin" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="------" aria-label="Demo PIN">' +
    '<div class="lockerr" id="gerr"></div>' +
    '<button class="btn block lg" id="gbtn" style="margin-top:8px">Open the demo</button>' +
    '</div>';
  document.body.appendChild(wrap);
  var inp = WS.$('gpin'), err = WS.$('gerr');
  setTimeout(function () { inp.focus(); }, 60);
  var tries = 0;
  function go() {
    if (inp.value.replace(/\D/g, '') === WS.PIN) {
      try { localStorage.setItem('wsDemo:unlocked', '1'); } catch (e) { }
      wrap.remove();
      onOpen();
    } else {
      tries++;
      err.textContent = tries > 1 ? 'Still not right. The PIN is 6 digits.' : 'That PIN is not right.';
      inp.value = '';
      inp.focus();
    }
  }
  WS.$('gbtn').onclick = go;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  inp.addEventListener('input', function () {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
    if (inp.value.length === 6) go();
  });
};

window.WS = WS;
