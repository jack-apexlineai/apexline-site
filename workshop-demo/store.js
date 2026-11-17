/* Shared state, theme, toasts and formatting for the workshop demo.
   Everything lives in this browser. Nothing is sent anywhere. */

var WS = window.WS || {};
WS.KEY = 'wsDemo:state';
WS.SEED_V = 29;

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
      if (s && s.v === WS.SEED_V && s.seedDay === WS.day(0)) {
        WS.state = s; WS._rev = s.rev || 0;
        if (WS.ensureUsers(s)) WS.persist();
        return WS.state;
      }
    } catch (e) { }
  }
  return WS.reset(true);
};

WS.reset = function (quiet) {
  var s = WS.seed();
  s.v = WS.SEED_V;
  s.seedDay = WS.day(0);
  s.rev = (WS._rev || 0) + 1;
  WS.ensureUsers(s);
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
  WS.ensureUsers(WS.state);
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
  setInterval(WS._pull, 2500);
};

/* ---------- lookups ---------- */
function find(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }
WS.vehicle = function (id) { return find(WS.state.vehicles, id); };
WS.operator = function (id) { return find(WS.state.operators, id); };
WS.supplier = function (id) { return find(WS.state.suppliers, id); };
WS.fitter = function (id) { return find(WS.state.settings.fitters, id); };
WS.driver = function (id) { return find(WS.state.drivers, id); };
WS.job = function (id) { return find(WS.state.jobs, id); };
WS.invoice = function (id) { return find(WS.state.invoices, id); };
WS.quote = function (id) { return find(WS.state.quotes, id); };
WS.approval = function (id) { return find(WS.state.approvals, id); };
WS.check = function (id) { return find(WS.state.checks, id); };
WS.stockItem = function (id) { return find(WS.state.stock, id); };
WS.stockByName = function (nm) { return WS.state.stock.filter(function (s) { return s.name === nm; })[0] || null; };
WS.jobsOn = function (day) { return WS.state.jobs.filter(function (j) { return j.date === day; }); };
WS.vehiclesOf = function (opId) { return WS.state.vehicles.filter(function (v) { return v.operatorId === opId; }); };

WS.STATUS = {
  booked: { label: 'Booked in', cls: '' },
  in_bay: { label: 'In bay', cls: 'go' },
  in_progress: { label: 'In progress', cls: 'go' },
  waiting_parts: { label: 'Waiting on parts', cls: 'warn' },
  waiting_auth: { label: 'Waiting on authorisation', cls: 'warn' },
  qc: { label: 'QC', cls: 'warn' },
  done: { label: 'Done', cls: 'ok' }
};
WS.statusLabel = function (s) { return (WS.STATUS[s] || { label: s }).label; };
WS.statusCls = function (s) { return (WS.STATUS[s] || { cls: '' }).cls; };
WS.OPEN_STATUSES = ['booked', 'in_bay', 'in_progress', 'waiting_parts', 'waiting_auth', 'qc'];

/* a job nobody has touched yet, so it is safe to move off a fitter's day */
WS.notStarted = function (j) {
  return !(j.clockOns || []).length && (j.status === 'booked' || j.status === 'in_bay');
};

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
/* One way to show a length of time on screen: hours and minutes, "1h 30m", "1h 36m", "6m", "2h".
   Decimal hours only where money is worked out or in exports, labelled "hours (decimal)". */
WS.dur = function (hours) {
  var m = Math.max(0, Math.round((+hours || 0) * 60));
  var h = Math.floor(m / 60), r = m % 60;
  if (!h) return r + 'm';
  return r ? h + 'h ' + r + 'm' : h + 'h';
};
WS.hhmm = WS.dur;
WS.hrs = WS.dur;
/* decimal hours, for money lines and exports only */
WS.hrsDec = function (hours) { return String(Math.round((+hours || 0) * 100) / 100); };
WS.hms = function (ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
WS.money = function (n) {
  var v = Math.round((n || 0) * 100) / 100;
  return (v < 0 ? '-£' : '£') + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
WS.money0 = function (n) {
  var v = Math.round(n || 0);
  return (v < 0 ? '-£' : '£') + Math.abs(v).toLocaleString('en-GB');
};
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
WS.clockHM = function (h) {
  var m = Math.round(h * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
WS.dayName = function (d) {
  var x = WS.parse(d), n = WS.daysBetween(WS.day(0), d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x.getDay()] + ' ' + WS.dateShort(d);
};
/* "Tuesday 17 Nov 2026" */
WS.dayLong = function (d) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][WS.parse(d).getDay()] + ' ' + WS.dateUK(d).replace(/^0/, '');
};
WS.dow3 = function (d) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][WS.parse(d).getDay()]; };
WS.nowStamp = function () { return WS.stampOf(new Date()); };
WS.nowHours = function () { var d = new Date(); return d.getHours() + d.getMinutes() / 60; };

/* ---------- the day planner ---------- */
WS.stdTime = function (type) {
  var s = WS.state.settings.standardTimes || {};
  return s[type] != null ? s[type] : 1.5;
};

/* every job planned to a fitter on a day, in running order, with a planned clock */
WS.dayPlan = function (fitterId, day) {
  var list = WS.state.jobs.filter(function (j) {
    return j.date === day && j.fitterId === fitterId;
  }).sort(function (a, b) {
    if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
    return a.no.localeCompare(b.no);
  });
  var start = WS.state.settings.dayStart || 7.5;
  var t = start;
  list.forEach(function (j) {
    j._planStart = t;
    t += (j.estHours || WS.stdTime(j.type));
    // half an hour off at midday, taken once the clock passes 12:30
    if (j._planStart < 12.5 && t > 12.5) t += 0.5;
    j._planEnd = t;
  });
  return list;
};

WS.plannedHours = function (fitterId, day) {
  return WS.state.jobs.filter(function (j) { return j.date === day && j.fitterId === fitterId; })
    .reduce(function (s, j) { return s + (j.estHours || WS.stdTime(j.type)); }, 0);
};

WS.unplanned = function (day) {
  return WS.state.jobs.filter(function (j) { return j.date === day && !j.fitterId && j.status !== 'done'; });
};

/* how a job is running against its estimate */
WS.jobProgress = function (j) {
  var est = j.estHours || WS.stdTime(j.type);
  var actual = WS.hoursOn(j);
  var running = (j.clockOns || []).some(function (c) { return !c.end; });
  var pct = est > 0 ? Math.min(140, Math.round(actual / est * 100)) : 0;
  var state;
  if (j.status === 'done' || j.status === 'qc') state = actual > est * 1.1 ? 'over' : 'ok';
  else if (!actual) state = 'none';
  else if (actual > est) state = 'over';
  else if (actual > est * 0.85) state = 'close';
  else state = 'ok';
  return { est: est, actual: actual, pct: pct, running: running, state: state, over: Math.max(0, actual - est) };
};
WS.progressCls = function (st) {
  return st === 'over' ? 'bad' : st === 'close' ? 'warn' : st === 'ok' ? 'ok' : '';
};

/* ---------- how each fitter actually performs ----------
   Worked out from finished jobs: what the standard time said against what was
   really clocked. No guessing, just the shop's own history. */
WS.MIN_SAMPLES = 3;

WS.fitterStats = function () {
  var byFitter = {}, shop = {};
  WS.state.jobs.forEach(function (j) {
    if (j.status !== 'done' || !j.fitterId || !j.estHours) return;
    var act = WS.hoursOn(j);
    if (act <= 0) return;
    byFitter[j.fitterId] = byFitter[j.fitterId] || {};
    var f = byFitter[j.fitterId][j.type] = byFitter[j.fitterId][j.type] || { n: 0, act: 0, std: 0 };
    f.n++; f.act += act; f.std += j.estHours;
    var sh = shop[j.type] = shop[j.type] || { n: 0, act: 0, std: 0 };
    sh.n++; sh.act += act; sh.std += j.estHours;
  });
  function finish(o) {
    Object.keys(o).forEach(function (k) {
      var s = o[k];
      s.ratio = s.std ? s.act / s.std : 1;
      s.avg = s.n ? s.act / s.n : 0;
    });
  }
  Object.keys(byFitter).forEach(function (id) { finish(byFitter[id]); });
  finish(shop);
  return { byFitter: byFitter, shop: shop };
};

/* a fitter's record on one job type, with enough detail to explain itself */
WS.record = function (fitterId, type, stats) {
  stats = stats || WS.fitterStats();
  var mine = (stats.byFitter[fitterId] || {})[type];
  var shop = stats.shop[type];
  var known = !!(mine && mine.n >= WS.MIN_SAMPLES);
  var ratio = known ? mine.ratio : (shop ? shop.ratio : 1);
  var vsShop = known && shop && shop.ratio ? Math.round((shop.ratio - mine.ratio) / shop.ratio * 100) : 0;
  return {
    known: known, n: mine ? mine.n : 0, ratio: ratio, avg: mine ? mine.avg : 0,
    vsShop: vsShop, shopRatio: shop ? shop.ratio : 1
  };
};

/* ---------- rate cards ---------- */
WS.rateFor = function (operatorId) {
  var S = WS.state.settings, o = WS.operator(operatorId) || {};
  return {
    rate: o.labourRate != null ? o.labourRate : S.labourRate,
    markup: o.markup != null ? o.markup : S.markup,
    discount: o.discount || 0,
    terms: o.terms || 30
  };
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

/* ---------- Earned Recognition style KPIs ---------- */
WS.erStats = function () {
  var S = WS.state, T = WS.day(0);
  var pmis = S.jobs.filter(function (j) { return j.type === 'PMI' && j.status === 'done' && WS.daysBetween(j.date, T) <= 90; });
  // a vehicle whose safety inspection has run past its due date was not done on time
  var withPmi = S.vehicles.filter(function (v) { return !!v.nextPmi; });
  var late = withPmi.filter(function (v) { return WS.daysBetween(T, v.nextPmi) < 0; }).length;
  var pmiOnTime = withPmi.length ? Math.round((withPmi.length - late) / withPmi.length * 100) : 100;
  var defects = pmis.reduce(function (s, j) { return s + (j.defects || []).length; }, 0);
  var perPmi = pmis.length ? Math.round(defects / pmis.length * 100) / 100 : 0;
  var mots = S.jobs.filter(function (j) { return j.type === 'MOT prep' && j.status === 'done'; });
  var motFirst = mots.length ? 100 - Math.min(20, mots.length * 2) : 100;
  var drivers = S.drivers.length;
  var todayChecks = S.checks.filter(function (c) { return c.date === T; }).length;
  var checkRate = drivers ? Math.round(todayChecks / drivers * 100) : 0;
  var overdue = WS.dueItems(-1).length;
  return {
    pmiOnTime: pmiOnTime, defectsPerPmi: perPmi, motFirstTime: motFirst,
    driverChecks: checkRate, overdue: overdue, pmiCount: pmis.length,
    checksToday: todayChecks, driverCount: drivers
  };
};

/* ---------- audit ---------- */
WS.audit = function (job, who, what) {
  job.audit = job.audit || [];
  job.audit.push({ at: WS.nowStamp(), who: who, what: what });
};

/* ---------- team and permissions ----------
   Everyone who can sign in. Fitters are linked to their fitter record, whose PIN the
   fitter app checks. The office signs in as one of the office users (startup.js);
   until then WS.ME is the owner, g.noble. */
WS.ROLES = ['Director', 'Office', 'Accounts', 'Fitter', 'Driver'];
WS.PERMS = [
  ['money', 'See money and invoices'], ['xero', 'Send to Xero'], ['quotes', 'Approve quotes'],
  ['prices', 'Edit prices and labour rates'], ['bookin', 'Book in jobs'], ['pay', 'Run fitter pay'],
  ['users', 'Manage users'], ['fitterOnly', 'Fitter app only'], ['driverOnly', 'Driver app only']
];
WS.rolePerms = function (role) {
  var on = {
    Director: ['money', 'xero', 'quotes', 'prices', 'bookin', 'pay', 'users'],
    Office: ['quotes', 'bookin'],
    Accounts: ['money', 'xero', 'pay'],
    Fitter: ['fitterOnly'],
    Driver: ['driverOnly']
  }[role] || [];
  var o = {};
  WS.PERMS.forEach(function (p) { o[p[0]] = on.indexOf(p[0]) >= 0; });
  return o;
};
WS.username = function (first, last, users, skipId) {
  var base = (String(first || '').trim().charAt(0) + '.' + String(last || '').trim()).toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (base === '.') return '';
  var u = base, n = 2;
  while ((users || []).some(function (x) { return x.username === u && x.id !== skipId && x.status !== 'removed'; })) u = base + n++;
  return u;
};
WS.ME = 'g.noble';
WS.ensureUsers = function (s) {
  if (!s || !s.settings) return false;
  var changed = false, seedAt = WS.at ? WS.at(WS.day(-21), 9, 0) : '';
  if (!s.users) {
    changed = true;
    s.users = [
      { id: 'u1', first: 'George', last: 'Noble', username: 'g.noble', role: 'Director', title: 'Owner', owner: true, signIn: 'pin', pin: '1234', status: 'active', perms: WS.rolePerms('Director'), addedBy: '', addedAt: seedAt },
      { id: 'u2', first: 'Office', last: 'Admin', username: 'office', role: 'Office', title: 'Office and accounts', shared: true, signIn: 'pin', pin: '1234', status: 'active',
        perms: (function () { var p = WS.rolePerms('Office'); p.money = p.xero = p.pay = true; return p; })(), addedBy: 'g.noble', addedAt: seedAt }
    ];
  }
  s.settings.fitters.forEach(function (f) {
    if (s.users.some(function (u) { return u.fitterId === f.id; })) return;
    changed = true;
    var parts = String(f.name).trim().split(/\s+/), first = parts[0] || '', last = parts.slice(1).join(' ') || first;
    s.users.push({
      id: 'u' + f.id, first: first, last: last, username: WS.username(first, last, s.users), role: 'Fitter', title: f.role || 'Fitter',
      signIn: 'pin', status: 'active', perms: WS.rolePerms('Fitter'), fitterId: f.id, addedBy: 'g.noble', addedAt: seedAt
    });
  });
  return changed;
};
WS.userOf = function (fitterId) {
  return ((WS.state && WS.state.users) || []).filter(function (u) { return u.fitterId === fitterId; })[0] || null;
};
/* who can sign into the fitter app: active users with the Fitter role */
WS.loginFitters = function () {
  return WS.state.settings.fitters.filter(function (f) {
    var u = WS.userOf(f.id);
    return !u || (u.status === 'active' && u.role === 'Fitter');
  });
};

/* ---------- the standard job card format ----------
   One layout for every piece of work on a job card, typed or spoken, so the office,
   the invoice and the DVSA record always read the same way. See Workshop/JOB_CARD_FORMAT.md. */
WS.LOCATIONS = ['Nearside front (NSF)', 'Offside front (OSF)', 'Nearside rear (NSR)', 'Offside rear (OSR)', 'Front', 'Rear', 'Cab', 'Chassis',
  'Engine', 'Gearbox', 'Exhaust', 'Electrics', 'Body', 'Multiple'];
WS.URGENCY = [['VOR', 'VOR, off the road'], ['Urgent', 'Urgent, today'], ['Routine', 'Routine, book it in'], ['Advisory', 'Advisory, monitor, next PMI']];
WS.WORK_FIELDS = [
  ['concern', 'Concern'], ['location', 'Location'], ['cause', 'Cause or finding'], ['fix', 'Fix'],
  ['parts', 'Parts'], ['labour', 'Labour'], ['urgency', 'Urgency'], ['photos', 'Photos']
];
WS.urgencyLabel = function (u) {
  var x = WS.URGENCY.filter(function (r) { return r[0] === u; })[0];
  return x ? x[1] : u;
};
/* the value of one field as text, or '' when it was not given */
WS.workText = function (e, k) {
  if (k === 'parts') return (e.parts || []).filter(function (p) { return p.partNo || p.desc; }).map(function (p) {
    return [p.partNo, p.desc].filter(Boolean).join(', ') + (p.qty ? ' x ' + p.qty : '');
  }).join('; ');
  if (k === 'labour') return e.labour ? WS.dur(parseFloat(e.labour)) + ' estimated' : '';
  if (k === 'urgency') return e.urgency ? WS.urgencyLabel(e.urgency) : '';
  if (k === 'photos') return (e.photos || []).length ? e.photos.length + ' attached' : '';
  return e[k] || '';
};
WS.workHtml = function (e) {
  var esc = WS.esc;
  var cls = e.urgency === 'VOR' ? 'bad' : e.urgency === 'Urgent' ? 'warn' : e.urgency === 'Advisory' ? '' : 'go';
  return '<div class="wentry">' +
    '<div class="wtop"><b>' + esc(e.concern || 'Work') + '</b>' + (e.urgency ? '<span class="pill ' + cls + '">' + esc(e.urgency) + '</span>' : '') + '</div>' +
    '<div class="wgrid">' + WS.WORK_FIELDS.map(function (f) {
      var t = WS.workText(e, f[0]);
      return '<div class="wk">' + esc(f[1]) + '</div><div class="wv' + (t ? '' : ' none') + '">' + esc(t || 'Not given') + '</div>';
    }).join('') + '<div class="wk">Odometer</div><div class="wv' + (e.odometer ? '' : ' none') + '">' + esc(e.odometer ? Number(e.odometer).toLocaleString('en-GB') : 'Not given') + '</div></div>' +
    ((e.photos || []).length ? '<div class="thumbs" style="margin-top:8px">' + e.photos.map(function (p) { return '<img class="thumb" src="' + p + '" alt="work photo">'; }).join('') + '</div>' : '') +
    '<div class="wby">' + esc((e.source === 'voice' ? 'Voice job card preview, approved' : e.source === 'portal' ? 'Reported on the customer portal' : 'Typed') + ' by ' + (e.by || '') + ' · ' + WS.whenUK(e.at)) + (e.status ? ' · ' + esc(e.status) : '') + '</div>' +
    '</div>';
};
/* the header fills itself from the job, never spoken (the odometer can be) */
WS.jobHeader = function (j, fitterName) {
  var v = WS.vehicle(j.vehicleId) || {}, o = WS.operator(j.operatorId) || {};
  var opened = j.createdAt ? WS.whenUK(j.createdAt) : WS.dateUK(j.date);
  return [
    ['Job number', j.no],
    ['Opened', opened],
    ['Operator', o.name || 'Internal'],
    ['Reg or fleet no', v.reg || ''],
    ['Make, model, type', [v.make, v.model].filter(Boolean).join(' ') + (v.type ? ', ' + v.type : '')],
    ['Odometer', j.odometer ? Number(j.odometer).toLocaleString('en-GB') : ''],
    ['Job type', j.type],
    ['Fitter', fitterName || ((WS.fitter(j.fitterId) || {}).name) || '']
  ];
};
WS.jobHeaderHtml = function (j, fitterName) {
  return '<div class="jhead">' + WS.jobHeader(j, fitterName).map(function (r) {
    return '<div><span>' + WS.esc(r[0]) + '</span><b' + (r[1] ? '' : ' class="none"') + '>' + WS.esc(r[1] || 'Not read yet') + '</b></div>';
  }).join('') + '</div>';
};

/* ---------- invoice maths ---------- */
WS.quoteJob = function (job) {
  var S = WS.state.settings, rc = WS.rateFor(job.operatorId);
  var hours = Math.round(WS.hoursOn(job) * 100) / 100;
  var labour = Math.round(hours * rc.rate * 100) / 100;
  var partsNet = 0;
  (job.parts || []).forEach(function (p) { partsNet += p.cost * p.qty * (1 + rc.markup / 100); });
  partsNet = Math.round(partsNet * 100) / 100;
  var gross = Math.round((labour + partsNet) * 100) / 100;
  var discount = Math.round(gross * rc.discount) / 100;
  var net = Math.round((gross - discount) * 100) / 100;
  var vat = Math.round(net * S.vat) / 100;
  var cost = Math.round(((job.parts || []).reduce(function (s, p) { return s + p.cost * p.qty; }, 0) + hours * 24) * 100) / 100;
  return {
    hours: hours, rate: rc.rate, labour: labour, partsNet: partsNet,
    discount: discount, discountPct: rc.discount, net: net, vat: vat,
    total: Math.round((net + vat) * 100) / 100, cost: cost,
    margin: net > 0 ? Math.round((net - cost) / net * 1000) / 10 : 0
  };
};
WS.quoteTotals = function (q) {
  var S = WS.state.settings;
  var net = (q.lines || []).reduce(function (s, l) { return s + l.qty * l.unit; }, 0);
  net = Math.round(net * 100) / 100;
  var vat = Math.round(net * S.vat) / 100;
  return { net: net, vat: vat, total: Math.round((net + vat) * 100) / 100 };
};
WS.approvalTotals = function (a) {
  var S = WS.state.settings, rc = WS.rateFor(a.operatorId);
  var labour = Math.round((a.estHours || 0) * rc.rate * 100) / 100;
  var parts = (a.parts || []).reduce(function (s, p) { return s + p.cost * p.qty * (1 + rc.markup / 100); }, 0);
  parts = Math.round(parts * 100) / 100;
  var net = Math.round((labour + parts) * 100) / 100;
  var vat = Math.round(net * S.vat) / 100;
  return { labour: labour, parts: parts, net: net, vat: vat, total: Math.round((net + vat) * 100) / 100, rate: rc.rate };
};

/* ---------- payroll ---------- */
/* Monday to Sunday, weekOffset 0 is this week */
WS.weekStart = function (offset) {
  var d = WS.today();
  var dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + (offset || 0) * 7);
  return WS.iso(d);
};
WS.payroll = function (weekOffset) {
  var S = WS.state, start = WS.weekStart(weekOffset);
  var days = [];
  for (var i = 0; i < 7; i++) days.push(WS.day(WS.daysBetween(WS.day(0), start) + i));
  var ot = S.settings.overtimeAfter || 8, otx = S.settings.overtimeRate || 1.5;
  var rows = S.settings.fitters.map(function (f) {
    var perDay = days.map(function (d) {
      var h = 0;
      S.jobs.forEach(function (j) {
        if (j.date !== d) return;
        (j.clockOns || []).forEach(function (c) {
          if (c.fitterId !== f.id) return;
          var s = new Date(c.start).getTime();
          var e = c.end ? new Date(c.end).getTime() : Date.now();
          if (e > s) h += (e - s) / 3600000;
        });
      });
      return Math.round(h * 100) / 100;
    });
    var normal = 0, over = 0;
    perDay.forEach(function (h) { normal += Math.min(h, ot); over += Math.max(0, h - ot); });
    normal = Math.round(normal * 100) / 100;
    over = Math.round(over * 100) / 100;
    var cost = Math.round((normal * f.costRate + over * f.costRate * otx) * 100) / 100;
    var sold = 0;
    S.jobs.forEach(function (j) {
      if (days.indexOf(j.date) < 0) return;
      (j.clockOns || []).forEach(function (c) {
        if (c.fitterId !== f.id || !c.end) return;
        sold += (new Date(c.end) - new Date(c.start)) / 3600000;
      });
    });
    var rc = S.settings.labourRate;
    return {
      fitter: f, days: perDay, total: Math.round((normal + over) * 100) / 100,
      normal: normal, over: over, cost: cost,
      value: Math.round(sold * rc * 100) / 100,
      util: normal + over > 0 ? Math.round(sold / (normal + over) * 1000) / 10 : 0
    };
  });
  return { start: start, days: days, rows: rows, ot: ot, otx: otx };
};

/* ---------- stock ---------- */
WS.lowStock = function () {
  return WS.state.stock.filter(function (s) { return s.qty + s.onOrder <= s.min; });
};
WS.takeStock = function (name, qty) {
  var s = WS.stockByName(name);
  if (!s) return false;
  s.qty = Math.max(0, s.qty - qty);
  return true;
};
WS.stockValue = function () {
  return WS.state.stock.reduce(function (t, s) { return t + s.qty * s.cost; }, 0);
};
/* flag a part that was fitted to this vehicle and is still inside its warranty */
WS.warrantyFlag = function (vehicleId, partName) {
  var item = WS.stockByName(partName);
  if (!item || !item.warranty) return null;
  var hit = null;
  WS.state.jobs.forEach(function (j) {
    if (j.vehicleId !== vehicleId || j.status !== 'done') return;
    (j.parts || []).forEach(function (p) {
      if (p.name !== partName) return;
      var months = -WS.daysBetween(WS.day(0), j.date) / 30.4;
      if (months <= item.warranty) hit = { job: j, monthsAgo: Math.round(months * 10) / 10, warranty: item.warranty };
    });
  });
  return hit;
};

/* ---------- notifications out ---------- */
WS.notify = function (to, channel, subject, body, kind) {
  WS.state.notifications = WS.state.notifications || [];
  WS.state.notifications.unshift({
    id: 'n' + Date.now(), at: WS.nowStamp(), to: to, channel: channel,
    subject: subject, body: body, kind: kind || 'message'
  });
  if (WS.state.notifications.length > 120) WS.state.notifications.length = 120;
};
WS.channels = function () {
  var n = WS.state.settings.notify || {}, out = [];
  if (n.whatsapp) out.push('WhatsApp');
  if (n.sms) out.push('SMS');
  if (n.email) out.push('email');
  return out.length ? out.join(' and ') : 'email';
};

/* ---------- Xero (simulated) ---------- */
WS.xeroOk = function () { var x = WS.state.settings.xero || {}; return !!(x.connected && x.key); };
WS.xeroKeyLooksRight = function (k) { return /^[A-Za-z0-9._-]{24,}$/.test(String(k || '').trim()); };
WS.xeroPush = function (list) {
  var x = WS.state.settings.xero, n = 0;
  list.forEach(function (inv) {
    if (inv.xeroExported) return;
    inv.xeroExported = WS.nowStamp();
    inv.xeroId = 'XI-' + (90000 + Math.floor(Math.random() * 9000));
    n++;
  });
  x.lastSync = WS.nowStamp();
  return n;
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
  // no more than three at once, the oldest goes first
  while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
  setTimeout(function () { t.remove(); }, 4000);
};

/* ---------- theme and brand ---------- */
/* wsDemo:theme holds dark, light or auto (match the device).
   WS.theme() always answers with what is on screen now: dark or light. */
WS.LOOK_KEYS = ['wsDemo:theme', 'wsDemo:textSize', 'wsDemo:density', 'wsDemo:menuStyle'];
WS._mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
WS.themePref = function () {
  var p = 'light';
  try { p = localStorage.getItem('wsDemo:theme') || 'light'; } catch (e) { }
  return p === 'dark' || p === 'auto' ? p : 'light';
};
WS._paintTheme = function () {
  var p = WS.themePref();
  var t = p === 'auto' ? (WS._mq && !WS._mq.matches ? 'light' : 'dark') : p;
  document.documentElement.setAttribute('data-theme', t);
  var tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', t === 'dark' ? '#0A101C' : '#F3F5F9');
  document.querySelectorAll('.themetog').forEach(WS._paintToggle);
  return t;
};
WS.theme = function (set) {
  if (set) {
    try { localStorage.setItem('wsDemo:theme', set); } catch (e) { }
    return WS._paintTheme();
  }
  return document.documentElement.getAttribute('data-theme') || 'light';
};
WS.look = function (key, val) {
  var k = 'wsDemo:' + key, d = { textSize: 'standard', density: 'comfortable', menuStyle: 'wheel' }[key];
  if (val) { try { localStorage.setItem(k, val); } catch (e) { } WS._paintLook(); return val; }
  var v = null;
  try { v = localStorage.getItem(k); } catch (e) { }
  return v || d;
};
WS._paintLook = function () {
  var h = document.documentElement;
  h.setAttribute('data-text', WS.look('textSize'));
  h.setAttribute('data-density', WS.look('density'));
  h.setAttribute('data-menu', WS.look('menuStyle'));
};
/* inside the office's phone frame the demo bar goes, so it looks like the real app */
WS.inDock = /[?&]dock=1/.test(location.search) && window.parent !== window;
if (WS.inDock) document.documentElement.classList.add('indock');
WS.initTheme = function () {
  WS._paintTheme();
  WS._paintLook();
  if (!WS._lookSync) {
    WS._lookSync = true;
    // the office and the phone frame share one browser, so a theme change shows in both
    window.addEventListener('storage', function (e) {
      if (e.key === 'wsDemo:theme' || e.key === null) WS._paintTheme();
      if (e.key === 'wsDemo:textSize' || e.key === 'wsDemo:density' || e.key === 'wsDemo:menuStyle') WS._paintLook();
    });
  }
  if (WS._mq && !WS._mqOn) {
    WS._mqOn = true;
    var f = function () { if (WS.themePref() === 'auto') WS._paintTheme(); };
    if (WS._mq.addEventListener) WS._mq.addEventListener('change', f); else if (WS._mq.addListener) WS._mq.addListener(f);
  }
};
/* Reset demo also puts the screen back: layout, menu, theme, text size and density */
WS.resetLooks = function () {
  WS.LOOK_KEYS.concat(['wsDemo:homeLayout', 'wsDemo:navLayout', 'wsDemo:navShut', 'wsDemo:homeHint'])
    .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { } });
};
var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/></svg>';
WS._paintToggle = function (b) {
  var dark = WS.theme() === 'dark';
  b.innerHTML = dark ? SUN : MOON;
  b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  b.title = dark ? 'Light mode' : 'Dark mode';
};
WS.themeToggle = function (id) {
  var b = WS.el('button', 'themetog');
  b.type = 'button';
  if (id) b.id = id;
  WS._paintToggle(b);
  b.onclick = function () { WS.theme(WS.theme() === 'dark' ? 'light' : 'dark'); };
  return b;
};
/* the workshop's own colour drives every accent in every app. It also works out a readable
   version of the colour for text on the dark and on the light theme, and a glow for the start-up. */
WS.DEFAULT_BRAND = '#6D7882';
function hexRgb(c) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return null;
  var n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgbHex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase(); }
function lumOf(c) {
  var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
WS.contrast = function (a, b) {
  var A = lumOf(a), B = lumOf(b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};
function towards(c, to, bg, need) {
  for (var k = 0; k <= 1.0001; k += 0.04) {
    var m = c.map(function (v, i) { return v + (to[i] - v) * k; });
    if (WS.contrast(m, bg) >= need) return m;
  }
  return to;
}
WS.shortName = function (n) { return String(n || '').replace(/\s+(Ltd|Limited|LLP|PLC)\.?$/i, ''); };
WS.applyBrand = function () {
  var S = (WS.state && WS.state.settings) || {};
  var rgb = hexRgb(S.brand) || hexRgb(WS.DEFAULT_BRAND);
  var R = rgb[0], G = rgb[1], B = rgb[2], hex = rgbHex(rgb);
  var root = document.documentElement.style;
  root.setProperty('--brand', hex);
  root.setProperty('--brand-l', 'rgba(' + R + ',' + G + ',' + B + ',.10)');
  root.setProperty('--brand-m', 'rgba(' + R + ',' + G + ',' + B + ',.28)');
  root.setProperty('--brand-xl', 'rgba(' + R + ',' + G + ',' + B + ',.09)');
  root.setProperty('--brand-ink-d', rgbHex(towards(rgb, [255, 255, 255], [16, 24, 40], 6.5)));
  root.setProperty('--brand-ink-l', rgbHex(towards(rgb, [0, 0, 0], [243, 245, 249], 4.8)));
  // solid fills (buttons, selected tabs, badges): a grey brand reads as disabled on the dark
  // theme, so a low colour brand fills with its light steel version and dark text instead
  var mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0;
  var inkD = towards(rgb, [255, 255, 255], [16, 24, 40], 6.5);
  var fillD = sat < 0.3 ? inkD : rgb;
  root.setProperty('--brand-fill-d', rgbHex(fillD));
  root.setProperty('--brand-on-d', WS.contrast(fillD, [255, 255, 255]) < 3.2 ? '#0B1220' : '#FFFFFF');
  var fillL = WS.contrast(rgb, [255, 255, 255]) < 4.6 ? towards(rgb, [0, 0, 0], [255, 255, 255], 4.6) : rgb;
  root.setProperty('--brand-fill-l', rgbHex(fillL));
  root.setProperty('--brand-on-l', '#FFFFFF');
  var tc = document.querySelector('meta[name="theme-color"]');
  if (tc && WS.theme() === 'dark') tc.setAttribute('content', '#0A101C');
  // the short code, the tab title and the tab icon follow the workshop
  var code = String(S.initials || '').slice(0, 3);
  if (code) document.querySelectorAll('.logo').forEach(function (l) { if (!l.children.length) l.textContent = code; });
  var short = WS.shortName(S.name);
  if (short && document.title.indexOf(' · ') > 0) document.title = short + document.title.slice(document.title.indexOf(' · '));
  var ic = document.querySelector('link[rel="icon"]');
  if (ic && code) {
    var fs = code.length > 2 ? 21 : 27;
    ic.href = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='" + hex +
      "'/><text x='32' y='" + (code.length > 2 ? 40 : 42) + "' font-family='Inter,Arial,sans-serif' font-size='" + fs + "' font-weight='700' fill='white' text-anchor='middle'>" + WS.esc(code) + "</text></svg>");
  }
};
/* true when the logo already spells out the display name, so a heading under it can say something else */
WS.logoShowsName = function () {
  var S = (WS.state && WS.state.settings) || {};
  return !!S.logo && !!S.logoName && WS.shortName(S.logoName) === WS.shortName(S.name);
};
/* the workshop's logo: their image when there is one, otherwise the short code in a brand square.
   stacked: the narrow version for the sidebar. */
WS.logoHtml = function (cls, stacked) {
  var S = (WS.state && WS.state.settings) || {};
  var src = stacked ? (S.logoStack || S.logo) : S.logo;
  if (src) return '<img class="brandimg ' + (cls || '') + (S.logoMono ? ' mono' : '') + '" src="' + WS.esc(src) + '" alt="' + WS.esc(S.name || '') + '" draggable="false">';
  return '<div class="logo ' + (cls || '') + '">' + WS.esc(S.initials || 'WS') + '</div>';
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
WS.uid = function (p) { return (p || 'x') + Date.now().toString(36) + Math.floor(Math.random() * 999).toString(36); };

/* shrink a camera photo so a few of them do not fill the browser's storage */
WS.readPhoto = function (file, cb) {
  if (!file) return cb('');
  var fr = new FileReader();
  fr.onload = function () {
    var img = new Image();
    img.onload = function () {
      var max = 720, w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', .62));
    };
    img.onerror = function () { cb(''); };
    img.src = fr.result;
  };
  fr.onerror = function () { cb(''); };
  fr.readAsDataURL(file);
};

/* voice notes, where the browser supports it. Beats carrying a headset about. */
WS.speechOk = function () { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); };
WS.listen = function (onText, onEnd) {
  var C = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!C) { if (onEnd) onEnd('Speech input is not available in this browser.'); return null; }
  var rec = new C();
  rec.lang = 'en-GB'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = function (e) {
    var s = '';
    for (var i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript;
    onText(s, e.results[e.results.length - 1].isFinal);
  };
  rec.onerror = function (e) { if (onEnd) onEnd(e.error === 'not-allowed' ? 'Microphone access was blocked.' : 'Could not hear that.'); };
  rec.onend = function () { if (onEnd) onEnd(''); };
  try { rec.start(); } catch (e) { if (onEnd) onEnd('Could not start the microphone.'); }
  return rec;
};

/* ---------- demo banner ---------- */
WS.banner = function (extraHtml) {
  var b = WS.el('div', 'dbar');
  // left: the demo only controls in their own small group. right: the app's own controls, then the theme
  b.innerHTML = '<span class="dgrp" role="group" aria-label="Demo controls"><span class="dlab"><span class="dot"></span>Demo</span>' +
    '<span class="dbtns" id="wsDemoBtns"><button id="wsReset" type="button">Reset<span class="xl"> demo</span></button></span></span>' +
    '<span class="desc">sample data, nothing here is real</span>' +
    '<span class="sp">' + (extraHtml || '') + '</span>';
  document.body.insertBefore(b, document.body.firstChild);
  var rb = WS.$('wsReset');
  b.querySelector('.sp').appendChild(WS.themeToggle('wsTheme'));
  rb.onclick = function () {
    if (!confirm('Reset the demo back to the sample data? Anything you changed will go.')) return;
    WS.reset();
    WS.resetLooks();
    location.reload();
  };
  return b;
};

window.WS = WS;
