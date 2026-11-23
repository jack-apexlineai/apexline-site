/* Assistant (preview). An "Ask" button in the top bar, or the / key, opens a chat panel that
   answers from the live demo data. It is deterministic: plain intent matching on the words and
   the suggestion chips, worked out in this browser. No AI service and no keys in the demo.
   Actions that send or change anything always show what they will do and wait for a yes. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var A = O.assistant = {};

  /* ---------------- templates ---------------- */
  WS.TEMPLATES = [
    { id: 'pmi', name: 'PMI due', kw: /pmi|inspection|safety/, subject: 'PMI due on your vehicles',
      body: 'Hi {first},\n\nThe PMI is due on {list}. Pick a day to send {them} in: {link}\n\nThanks,\n{workshop}' },
    { id: 'mot', name: 'MOT due', kw: /\bmot\b|annual test/, subject: 'MOT due on your vehicles',
      body: 'Hi {first},\n\nThe annual test (MOT) is due on {list}. We do the prep and book the test. Pick a day: {link}\n\nThanks,\n{workshop}' },
    { id: 'parts', name: 'Parts chase', kw: /part|supplier|order|delivery|chase/, subject: 'Parts we are waiting on',
      body: 'Hi,\n\nCould you let us know when these will be with us? {list}\n\nWe have vehicles off the road waiting on them.\n\nThanks,\n{workshop}' },
    { id: 'invoice', name: 'Invoice reminder', kw: /invoice|payment|pay|owe|overdue bill|statement/, subject: 'Invoice reminder',
      body: 'Hi {first},\n\nA reminder that {list} is still open on your account. Bank details are on the invoice.\n\nThanks,\n{workshop}' },
    { id: 'booking', name: 'Booking confirmation', kw: /book|booking|confirm/, subject: 'Booking confirmed',
      body: 'Hi {first},\n\nThat is booked in: {list}. Drop off from 07:30.\n\nThanks,\n{workshop}' }
  ];
  WS.templates = function () { return WS.TEMPLATES.concat((WS.state.templates || []).map(function (t) { t.custom = true; return t; })); };
  function fill(t, o) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : ''; });
  }
  function workshop() { return WS.shortName(WS.state.settings.name); }
  function portalLink(opId) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'portal#' + opId; }
  function firstName(o) { return String((o && o.contact) || '').split(' ')[0] || 'there'; }
  function joinList(a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : (a[0] || ''); }
  function pl(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function first(n) { return String(n || '').split(' ')[0]; }

  /* ---------------- intents ---------------- */
  A.intent = function (t) {
    t = String(t || '').toLowerCase().replace(/[’']/g, "'");
    if (/\bremind me\b|\bfollow ?up\b|\bnudge me\b/.test(t)) return 'remind';
    if (/(email|e-mail|message|write to|send|remind).*\bpmis?\b|\bpmis?\b.*(email|e-mail|remind)/.test(t)) return 'emailPmi';
    if (/(email|e-mail|chase|contact|message).*(supplier|parts?)|supplier/.test(t)) return 'emailSupplier';
    if (/template/.test(t)) return 'templates';
    // "email Saxby about ..." is a message to write, whatever it is about
    if (/^\s*(please\s+)?(email|e-mail|write to|message|send an? (email|message) to)\b/.test(t)) return 'email';
    if (/urgent|anything (on )?today|need(s)? doing|priorit|on fire|what needs me/.test(t)) return 'urgent';
    if (/fastest|quickest|best|slowest|who'?s? (good|better|quick)/.test(t)) return 'fastest';
    if (/spare|free time|capacity|\broom\b|available|who (can|could) (take|fit|squeeze)|take (on )?another|fit (another|in)|squeeze/.test(t)) return 'spare';
    if (/invoice|\bbill|money|owe|ready to/.test(t)) return 'invoice';
    if (/\bparts?\b|stock|waiting for|on order|deliver/.test(t)) return 'parts';
    if (/\bdue\b|\bpmis?\b|\bmots?\b|loler|tacho|compliance|brake test/.test(t)) return 'due';
    if (/fitter|getting on|\blads\b|\bteam\b|over ?time|running over|behind|who'?s (on|doing|waiting)/.test(t)) return 'fitters';
    if (/email|e-mail|\bwrite\b|message|letter|\bsend\b/.test(t)) return 'email';
    if (/^(hi|hello|hey|morning|afternoon|evening)\b/.test(t)) return 'hello';
    if (/what can you|help|what do you do/.test(t)) return 'help';
    return 'unknown';
  };

  /* ---------------- the live numbers ---------------- */
  var D = A.data = {};
  D.fitters = function () {
    var T = WS.day(0), st = WS.state, out = { rows: [], over: [], waiting: [], idle: [], clocked: 0 };
    st.settings.fitters.forEach(function (f) {
      var plan = WS.dayPlan(f.id, T);
      var live = plan.filter(function (j) { return (j.clockOns || []).some(function (c) { return !c.end && c.fitterId === f.id; }); })[0];
      var v = live ? WS.vehicle(live.vehicleId) : null;
      var p = live ? WS.jobProgress(live) : null;
      if (live) out.clocked++; else out.idle.push(f.name);
      if (live && p.state === 'over') out.over.push({ fitter: f.name, reg: v ? v.reg : live.type, over: Math.round(p.over * 100) / 100, jobId: live.id });
      plan.filter(function (j) { return j.status === 'waiting_parts' || j.status === 'waiting_auth'; }).forEach(function (j) {
        var wv = WS.vehicle(j.vehicleId);
        out.waiting.push({ fitter: f.name, reg: wv ? wv.reg : j.type, why: j.status === 'waiting_parts' ? 'parts' : 'the customer', jobId: j.id });
      });
      out.rows.push({ fitter: f.name, on: live ? (v ? v.reg : live.type) : '', state: p ? p.state : '', done: plan.filter(function (j) { return j.status === 'done' || j.status === 'qc'; }).length, n: plan.length });
    });
    return out;
  };
  D.invoice = function () {
    var ready = WS.state.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }), by = {};
    ready.forEach(function (j) {
      var k = j.operatorId || '_';
      by[k] = by[k] || { op: WS.operator(j.operatorId), n: 0, net: 0 };
      by[k].n++; by[k].net += WS.quoteJob(j).net || 0;
    });
    var rows = Object.keys(by).map(function (k) { var r = by[k]; r.net = Math.round(r.net); r.name = r.op ? r.op.name : 'Internal'; return r; })
      .sort(function (a, b) { return b.net - a.net; });
    return { n: ready.length, total: rows.reduce(function (s, r) { return s + r.net; }, 0), rows: rows };
  };
  function supplierFor(partName) {
    var s = WS.stockByName(partName);
    return WS.supplier(s ? s.supplierId : 's2') || WS.state.suppliers[0];
  }
  D.parts = function () {
    var jobs = WS.state.jobs.filter(function (j) { return j.status === 'waiting_parts' && j.date >= WS.day(-14); });
    var waiting = jobs.map(function (j) {
      var v = WS.vehicle(j.vehicleId), f = WS.fitter(j.fitterId);
      return { reg: v ? v.reg : j.type, fitter: f ? f.name : '', parts: (j.parts || []).map(function (p) { return p.name; }), jobId: j.id };
    });
    var pos = (WS.state.pos || []).filter(function (p) { return p.status === 'Ordered'; }).map(function (p) {
      var s = WS.supplier(p.supplierId);
      return { no: p.no, supplier: s ? s.name : '', items: p.lines.map(function (l) { return l.qty + ' x ' + l.name; }), expected: p.expected };
    });
    return { waiting: waiting, pos: pos, low: WS.lowStock().length };
  };
  D.spare = function () {
    var T = WS.day(0);
    var rows = WS.state.settings.fitters.map(function (f) {
      return { fitter: f.name, free: Math.max(0, Math.round((f.dayHours - WS.plannedHours(f.id, T)) * 100) / 100) };
    }).sort(function (a, b) { return b.free - a.free; });
    return { rows: rows, total: rows.reduce(function (s, r) { return s + r.free; }, 0) };
  };
  D.due = function () {
    var T = WS.day(0), wkEnd = WS.isoAdd(WS.weekStartOf(T), 6), nm = WS.isoAdd(WS.monthEnd(T), 1);
    var week = WS.dueBetween(T, wkEnd), next = WS.dueBetween(nm, WS.monthEnd(nm)), overdue = WS.dueBetween('0000-00-00', WS.isoAdd(T, -1));
    var soon = WS.dueBetween(T, WS.isoAdd(T, 30)), by = {};
    soon.forEach(function (x) { if (x.op) (by[x.op.id] = by[x.op.id] || []).push(x); });
    var ops = Object.keys(by).map(function (id) { return { name: WS.shortName(WS.operator(id).name), n: by[id].length, text: WS.countKinds(by[id]) }; })
      .sort(function (a, b) { return b.n - a.n; });
    return { week: week.length, weekText: WS.countKinds(week), next: next.length, nextText: WS.countKinds(next), nextMonth: WS.monthName(nm), overdue: overdue.length, ops: ops };
  };
  D.fastest = function () {
    var st = WS.fitterStats(), out = {};
    ['PMI', 'Service', 'Repair'].forEach(function (type) {
      var best = null;
      WS.state.settings.fitters.forEach(function (f) {
        var r = (st.byFitter[f.id] || {})[type];
        if (!r || r.n < WS.MIN_SAMPLES) return;
        if (!best || r.ratio < best.ratio) best = { fitter: f.name, ratio: r.ratio, n: r.n, avg: r.avg };
      });
      out[type] = best;
    });
    var overall = null;
    WS.state.settings.fitters.forEach(function (f) {
      var by = st.byFitter[f.id] || {}, act = 0, std = 0, n = 0;
      Object.keys(by).forEach(function (k) { act += by[k].act; std += by[k].std; n += by[k].n; });
      if (n < 5 || !std) return;
      var ratio = act / std;
      if (!overall || ratio < overall.ratio) overall = { fitter: f.name, ratio: ratio, n: n };
    });
    out.overall = overall;
    return out;
  };
  D.urgent = function () {
    var lines = O.briefLines ? O.briefLines().filter(function (x) { return x.urgent; }) : [];
    return { lines: lines.map(function (x) { return { k: x.k, go: x.go, text: x.parts.map(function (p) { return typeof p === 'string' ? p : p.money ? WS.money0(p.n) : String(p.n); }).join('').trim() }; }),
      soon: WS.dueSoonUnactioned ? WS.dueSoonUnactioned() : [] };
  };
  D.pmiNextMonth = function () {
    var T = WS.day(0), nm = WS.isoAdd(WS.monthEnd(T), 1);
    var items = WS.dueBetween(nm, WS.monthEnd(nm)).filter(function (x) { return x.key === 'nextPmi' && x.op; }), by = {};
    items.forEach(function (x) { (by[x.op.id] = by[x.op.id] || []).push(x); });
    return { month: WS.monthName(nm), n: items.length, ops: Object.keys(by).map(function (id) {
      var op = WS.operator(id), list = by[id].map(function (x) { return x.v.reg + ' (' + WS.parse(x.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')'; });
      return { op: op, regs: by[id].map(function (x) { return x.v.reg; }), body: fill(WS.TEMPLATES[0].body, { first: firstName(op), list: joinList(list), them: list.length > 1 ? 'them' : 'it', link: portalLink(op.id), workshop: workshop() }) };
    }).sort(function (a, b) { return b.regs.length - a.regs.length; }) };
  };
  D.supplierDrafts = function () {
    var p = D.parts(), by = {};
    p.waiting.forEach(function (w) {
      w.parts.forEach(function (name) { var s = supplierFor(name); (by[s.id] = by[s.id] || { s: s, items: [] }).items.push(name + ' for ' + w.reg); });
    });
    return Object.keys(by).map(function (id) {
      var x = by[id];
      return { supplier: x.s, items: x.items, body: fill(WS.TEMPLATES[2].body, { list: joinList(x.items) + '.', workshop: workshop() }) };
    });
  };

  /* ---------------- answers ---------------- */
  function link(screen, label) { return '<button type="button" class="ak-link" data-ago="' + screen + '">' + esc(label) + ' ›</button>'; }
  function n(x) { return '<b data-n="' + x + '">' + x + '</b>'; }
  var pending = {};   // actions waiting for a yes
  function confirmBtns(id, yes) {
    return '<div class="ak-btns"><button type="button" class="btn sm" data-yes="' + id + '">' + esc(yes) + '</button>' +
      '<button type="button" class="btn alt sm" data-no="' + id + '">Cancel</button></div>';
  }
  function draft(body) { return '<pre class="ak-draft">' + esc(body) + '</pre>'; }

  A.answer = function (text) {
    var it = A.intent(text), d, h = '';
    switch (it) {
      case 'fitters':
        d = D.fitters();
        h = '<p>' + n(d.clocked) + ' of ' + WS.state.settings.fitters.length + ' clocked on.</p><ul>' + d.rows.map(function (r) {
          return '<li><b>' + esc(first(r.fitter)) + '</b>: ' + (r.on ? 'on ' + esc(r.on) + (r.state === 'over' ? ', <span class="ak-bad">over time</span>' : '') : 'not clocked on') +
            ', ' + r.done + ' of ' + r.n + ' done</li>';
        }).join('') + '</ul>' +
          (d.over.length ? '<p><b>Over time:</b> ' + d.over.map(function (o) { return esc(first(o.fitter)) + ' is ' + WS.hrs(o.over) + ' over on ' + esc(o.reg); }).join('; ') + '.</p>' : '<p>Nobody is over time right now.</p>') +
          (d.waiting.length ? '<p><b>Waiting:</b> ' + d.waiting.map(function (w) { return esc(first(w.fitter)) + ' on ' + esc(w.reg) + ' (' + w.why + ')'; }).join('; ') + '.</p>' : '') +
          link('live', 'Open Live view');
        break;
      case 'invoice':
        d = D.invoice();
        h = d.n ? '<p>' + n(d.n) + ' finished ' + (d.n === 1 ? 'job' : 'jobs') + ' not invoiced yet, <b data-money="' + d.total + '">' + WS.money0(d.total) + '</b> before VAT.</p><ul>' +
          d.rows.slice(0, 6).map(function (r) { return '<li>' + esc(r.name) + ': ' + pl(r.n, 'job', 'jobs') + ', ' + WS.money0(r.net) + '</li>'; }).join('') +
          (d.rows.length > 6 ? '<li>and ' + (d.rows.length - 6) + ' more</li>' : '') + '</ul>' + link('invoices', 'Open invoices')
          : '<p>Everything finished has been invoiced.</p>';
        break;
      case 'parts':
        d = D.parts();
        h = (d.waiting.length ? '<p>' + n(d.waiting.length) + ' ' + (d.waiting.length === 1 ? 'job is' : 'jobs are') + ' waiting on parts:</p><ul>' + d.waiting.map(function (w) {
          return '<li><b>' + esc(w.reg) + '</b>: ' + esc(joinList(w.parts) || 'parts') + (w.fitter ? ' (' + esc(first(w.fitter)) + ')' : '') + '</li>';
        }).join('') + '</ul>' : '<p>No jobs are waiting on parts.</p>') +
          (d.pos.length ? '<p><b>On order:</b> ' + d.pos.map(function (p) { return esc(p.no) + ' from ' + esc(p.supplier) + ', ' + esc(p.items.join(', ')) + ', due ' + esc(WS.dayLabel(p.expected)); }).join('; ') + '.</p>' : '') +
          (d.low ? '<p>' + pl(d.low, 'part is', 'parts are') + ' at or below the minimum stock level.</p>' : '') +
          link('stock', 'Open parts and stock') + (d.waiting.length ? '<div class="ak-chips"><button type="button" data-ask="Email the supplier we need parts">Email the supplier we need parts</button></div>' : '');
        break;
      case 'spare':
        d = D.spare();
        h = '<p>' + '<b>' + WS.hrs(d.total) + '</b> free across the team today.</p><ul>' + d.rows.map(function (r) {
          return '<li><b>' + esc(first(r.fitter)) + '</b>: ' + (r.free > 0 ? WS.hrs(r.free) + ' free' : 'full') + '</li>';
        }).join('') + '</ul>' + link('planner', 'Open the Day planner');
        break;
      case 'due':
        d = D.due();
        h = (d.overdue ? '<p class="ak-bad">' + n(d.overdue) + ' already overdue.</p>' : '') +
          '<p><b>This week:</b> ' + (d.week ? esc(d.weekText) : 'nothing') + '.<br><b>' + esc(d.nextMonth) + ':</b> ' + (d.next ? esc(d.nextText) : 'nothing') + '.</p>' +
          (d.ops.length ? '<p><b>By customer, next 30 days</b></p><ul>' + d.ops.slice(0, 6).map(function (o) { return '<li>' + esc(o.name) + ': ' + esc(o.text) + '</li>'; }).join('') + '</ul>' : '') +
          (O.SCREENS.vcal ? link('vcal', 'Open the Vehicle calendar') : link('compliance', 'Open the Compliance planner'));
        break;
      case 'fastest':
        d = D.fastest();
        h = '<p>From the clocked history, against the standard times:</p><ul>' + ['PMI', 'Service', 'Repair'].map(function (t) {
          var b = d[t];
          return '<li><b>' + t + 's</b>: ' + (b ? esc(first(b.fitter)) + ', ' + Math.round(b.ratio * 100) + '% of standard over ' + b.n + ' jobs' : 'not enough jobs yet') + '</li>';
        }).join('') + '</ul>' +
          (d.overall ? '<p><b>Best overall:</b> ' + esc(d.overall.fitter) + ', ' + Math.round(d.overall.ratio * 100) + '% of standard across ' + d.overall.n + ' jobs.</p>' : '') +
          link('reports', 'Open Reports');
        break;
      case 'urgent':
        d = D.urgent();
        h = d.lines.length ? '<p>' + n(d.lines.length) + ' ' + (d.lines.length === 1 ? 'thing needs' : 'things need') + ' you today:</p><ul>' + d.lines.map(function (l) {
          return '<li><button type="button" class="ak-inl" data-ago="' + l.go + '">' + esc(l.text) + '</button></li>';
        }).join('') + '</ul>' +
          (d.soon.length ? '<p>' + d.soon.map(function (x) { return esc(x.v.reg + "'s " + x.kind) + ' is due ' + (x.days === 0 ? 'today' : x.days === 1 ? 'tomorrow' : 'in ' + x.days + ' days'); }).join('; ') + ' and the customer has not had a reminder.</p>' : '')
          : '<p>Nothing urgent. A quiet one.</p>';
        break;
      case 'emailPmi':
        d = D.pmiNextMonth();
        if (!d.n) { h = '<p>No PMIs fall due in ' + esc(d.month) + '.</p>'; break; }
        var idP = 'p' + Date.now();
        pending[idP] = function () {
          d.ops.forEach(function (o) { WS.notify(o.op.contact + ', ' + o.op.name, 'Email', WS.TEMPLATES[0].subject, o.body, 'message'); });
          WS.save();
          WS.toast('Demo: ' + pl(d.ops.length, 'email', 'emails') + ' drafted, nothing was actually sent. They are in Alerts as a record.', 'ok');
          return '<p>Done. ' + pl(d.ops.length, 'PMI reminder', 'PMI reminders') + ' logged in Alerts. In the demo nothing is sent.</p>';
        };
        h = '<p>' + n(d.n) + ' PMIs are due in ' + esc(d.month) + ', across ' + pl(d.ops.length, 'customer', 'customers') + '. One email each, using the <b>PMI due</b> template:</p><ul>' +
          d.ops.map(function (o) { return '<li>' + esc(o.op.name) + ': ' + esc(o.regs.join(', ')) + '</li>'; }).join('') + '</ul>' +
          '<p class="ak-mut">The first one reads:</p>' + draft(d.ops[0].body) + confirmBtns(idP, 'Send ' + pl(d.ops.length, 'email', 'emails'));
        break;
      case 'emailSupplier':
        d = D.supplierDrafts();
        if (!d.length) { h = '<p>No jobs are waiting on parts, so there is nobody to chase.</p>'; break; }
        var idS = 's' + Date.now();
        pending[idS] = function () {
          d.forEach(function (x) { WS.notify(x.supplier.name, 'Email', WS.TEMPLATES[2].subject, x.body, 'message'); });
          WS.save();
          WS.toast('Demo: ' + pl(d.length, 'email', 'emails') + ' to suppliers drafted, nothing was actually sent.', 'ok');
          return '<p>Done. Logged in Alerts. In the demo nothing is sent.</p>';
        };
        h = '<p>Using the <b>Parts chase</b> template, ' + pl(d.length, 'email', 'emails') + ':</p>' +
          d.map(function (x) { return '<p class="ak-mut">To ' + esc(x.supplier.name) + ' (' + esc(x.supplier.email) + ')</p>' + draft(x.body); }).join('') +
          confirmBtns(idS, 'Send ' + pl(d.length, 'email', 'emails'));
        break;
      case 'remind':
        var r = parseReminder(text), idR = 'r' + Date.now();
        pending[idR] = function () {
          WS.state.followUps = WS.state.followUps || [];
          WS.state.followUps.push({ id: WS.uid('fu'), text: r.what, due: r.due, at: WS.nowStamp(), by: WS.ME });
          WS.save();
          if (O.screen === 'home') O.render();
          WS.toast('Reminder added for ' + WS.dayLabel(r.due) + '.', 'ok');
          return '<p>Added. It shows on Home under Needs you.</p>';
        };
        h = '<p>I will put <b>' + esc(r.what) + '</b> on Home for <b>' + esc(WS.dayLabel(r.due)) + '</b>.</p>' + confirmBtns(idR, 'Add reminder');
        break;
      case 'templates':
        h = '<p>The templates:</p><ul>' + WS.templates().map(function (t) { return '<li><b>' + esc(t.name) + '</b>' + (t.custom ? ' <span class="ak-mut">(yours)</span>' : '') + '</li>'; }).join('') + '</ul>';
        break;
      case 'email':
        var tpl = WS.TEMPLATES.filter(function (t) { return t.kw.test(String(text).toLowerCase()); })[0];
        var idE = 'e' + Date.now();
        var body = tpl ? fill(tpl.body, { first: 'there', list: '...', them: 'them', link: portalLink(''), workshop: workshop() })
          : 'Hi,\n\n' + String(text).replace(/^\s*(please\s+)?(email|e-mail|write to|message|send)\s+/i, '').replace(/^./, function (c) { return c.toUpperCase(); }) + '\n\nThanks,\n' + workshop();
        pending[idE] = function () {
          WS.notify('Customer', 'Email', tpl ? tpl.subject : 'Message', $('akEd' + idE) ? $('akEd' + idE).value : body, 'message');
          WS.save();
          WS.toast('Demo: email drafted, nothing was actually sent.', 'ok');
          return '<p>Logged in Alerts. In the demo nothing is sent.</p>';
        };
        h = (tpl ? '<p>The <b>' + esc(tpl.name) + '</b> template fits. Edit it before it goes:</p>'
          : '<p>No template fits that, so here is a plain draft. Edit it as you like.</p>') +
          '<textarea class="in ak-ed" id="akEd' + idE + '">' + esc(body) + '</textarea>' +
          '<div class="ak-btns"><button type="button" class="btn sm" data-yes="' + idE + '">Send (demo)</button>' +
          (tpl ? '' : '<button type="button" class="btn alt sm" data-savetpl="' + idE + '">Save this as a new template</button>') +
          '<button type="button" class="btn alt sm" data-no="' + idE + '">Cancel</button></div>';
        break;
      case 'hello':
        h = '<p>' + esc(hello()) + ' What do you want to tackle first?</p>' + chipsHtml();
        break;
      default:
        h = '<p>' + (it === 'help' ? 'Here is what I can do from the live board.' : 'I did not catch that. Here is what I can do from the live board.') + '</p><ul>' +
          '<li>How the fitters are getting on, who is over time or waiting</li><li>Who we can invoice, by customer</li>' +
          '<li>Parts we are waiting for</li><li>Who has spare time today</li><li>What is due: PMI, MOT, LOLER</li>' +
          '<li>Who is fastest at PMIs, services and repairs</li><li>Anything urgent today</li>' +
          '<li>Email everyone with a PMI due next month, chase a supplier, remind you to follow up</li></ul>' + chipsHtml();
    }
    return { intent: it, html: h, data: d };
  };
  function parseReminder(t) {
    var s = String(t || ''), days = 7, m;
    if (/tomorrow/i.test(s)) days = 1;
    else if ((m = /in (\d+) days?/i.exec(s))) days = +m[1];
    else if ((m = /in (\d+) weeks?/i.exec(s))) days = 7 * +m[1];
    else if (/next week|in a week/i.test(s)) days = 7;
    var what = s.replace(/^\s*(please\s+)?(remind me to|remind me about|remind me|nudge me to)\s*/i, '')
      .replace(/\s*(in a week|next week|tomorrow|in \d+ (days?|weeks?))\s*\.?$/i, '').trim();
    if (!what || /^to follow up$/i.test(what)) what = 'Follow up';
    what = what.replace(/^./, function (c) { return c.toUpperCase(); });
    return { what: what, due: WS.day(days) };
  }
  A.parseReminder = parseReminder;

  /* ---------------- the panel ---------------- */
  var CHIPS = ['How are the fitters getting on?', 'Who can we invoice?', 'What parts are we waiting for?', 'Who has spare time today?',
    "What's due?", "Who's fastest at PMIs?", 'Anything urgent today?', 'Email everyone with a PMI due next month', 'Remind me to follow up in a week'];
  function chipsHtml() { return '<div class="ak-chips">' + CHIPS.map(function (c) { return '<button type="button" data-ask="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>'; }
  function hello() {
    var p = WS.partOfDay(), nm = WS.greetName ? WS.greetName() : '';
    return p.charAt(0).toUpperCase() + p.slice(1) + (nm ? ' ' + nm : '') + '.';
  }
  var SPARK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/></svg>';
  A.buttonHtml = function () { return '<button id="wsAsk" type="button" class="askbtn" aria-label="Ask the assistant (/)" title="Ask the assistant ( / )">' + SPARK + '<span>Ask</span></button>'; };

  function panel() { return $('wsAskP'); }
  A.isOpen = function () { return !!panel(); };
  A.open = function () {
    if (panel()) { $('akIn').focus(); return; }
    var p = WS.el('div', 'askp');
    p.id = 'wsAskP';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Assistant');
    p.innerHTML = '<div class="ak-h"><span class="ak-mark">' + SPARK + '</span><div class="ak-ht"><b>Assistant</b><span class="ak-tag">Assistant preview</span></div>' +
      '<button type="button" class="ak-x" aria-label="Close">&times;</button></div>' +
      '<div class="ak-log" id="akLog" aria-live="polite"></div>' +
      '<form class="ak-f" id="akF" autocomplete="off"><input class="in" id="akIn" placeholder="Ask about the workshop" aria-label="Ask the assistant">' +
      '<button type="submit" class="btn" aria-label="Send">Ask</button></form>' +
      '<div class="ak-foot">Answers come from the live board in this demo. Nothing leaves the browser.</div>';
    document.body.appendChild(p);
    document.body.classList.add('ask-open');
    var b = $('wsAsk'); if (b) b.setAttribute('aria-expanded', 'true');
    p.querySelector('.ak-x').onclick = A.close;
    $('akF').onsubmit = function (e) { e.preventDefault(); var v = $('akIn').value.trim(); if (!v) return; $('akIn').value = ''; A.ask(v); };
    p.addEventListener('click', onClick);
    bot('<p>' + esc(hello()) + ' What do you want to tackle first?</p>' + chipsHtml(), 'hello');
    // the question box gets the focus now, again when the slide in ends, and on the first key
    focusIn();
    p.addEventListener('animationend', focusIn, { once: true });
    setTimeout(focusIn, 260);
  };
  function focusIn() {
    var i = $('akIn');
    if (i && A.isOpen() && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#wsAskP') && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement.tagName) && document.activeElement !== document.body)) {
      try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); }
    }
  }
  A.focus = focusIn;
  document.addEventListener('keydown', function (e) {
    if (!A.isOpen() || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    if (document.querySelector('.mask')) return;
    var i = $('akIn');
    if (i) { i.focus(); e.stopPropagation(); }   // the key is for the question, not a shortcut underneath
  }, true);
  A.close = function () {
    var p = panel();
    if (p) p.remove();
    document.body.classList.remove('ask-open');
    var b = $('wsAsk'); if (b) { b.setAttribute('aria-expanded', 'false'); }
  };
  function bot(html, intent) {
    var log = $('akLog'), m = WS.el('div', 'ak-m bot');
    m.dataset.intent = intent || '';
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }
  function me(text) {
    var log = $('akLog'), m = WS.el('div', 'ak-m me');
    m.textContent = text;
    log.appendChild(m);
  }
  A.ask = function (text) {
    if (!panel()) A.open();
    me(text);
    var r = A.answer(text);
    A.last = r;
    return bot(r.html, r.intent);
  };
  function onClick(e) {
    var t = e.target.closest('[data-ask],[data-ago],[data-yes],[data-no],[data-savetpl]');
    if (!t) return;
    if (t.dataset.ask) { A.ask(t.dataset.ask); return; }
    if (t.dataset.ago) { var s = t.dataset.ago; if (window.innerWidth <= 700) A.close(); O.go(s); return; }
    var box = t.closest('.ak-m');
    if (t.dataset.yes) {
      var fn = pending[t.dataset.yes];
      if (!fn) return;
      delete pending[t.dataset.yes];
      var out = fn();
      box.querySelectorAll('.ak-btns button,.ak-ed').forEach(function (b) { b.disabled = true; });
      bot(out, 'done');
      return;
    }
    if (t.dataset.no) {
      delete pending[t.dataset.no];
      box.querySelectorAll('.ak-btns button,.ak-ed').forEach(function (b) { b.disabled = true; });
      bot('<p>Cancelled. Nothing was sent or changed.</p>', 'cancel');
      return;
    }
    if (t.dataset.savetpl) {
      var id = t.dataset.savetpl, ed = $('akEd' + id);
      if (box.querySelector('.ak-tplname')) return;
      var row = WS.el('div', 'ak-tplname');
      row.innerHTML = '<input class="in" id="akTn' + id + '" placeholder="Name this template" aria-label="Template name"><button type="button" class="btn sm" id="akTs' + id + '">Save template</button>';
      box.appendChild(row);
      $('akTn' + id).focus();
      $('akTs' + id).onclick = function () {
        var nm = $('akTn' + id).value.trim();
        if (!nm) { WS.toast('Give the template a name.', 'bad'); return; }
        WS.state.templates = WS.state.templates || [];
        WS.state.templates.push({ id: WS.uid('t'), name: nm, subject: nm, body: ed ? ed.value : '' });
        WS.save();
        row.innerHTML = '<span class="ak-mut">Saved as <b>' + esc(nm) + '</b>. It is in the template library now.</span>';
        WS.toast('Template saved: ' + nm + '.', 'ok');
      };
    }
  }
  O.wireAsk = function () {
    var b = $('wsAsk');
    if (b) b.onclick = function () { if (A.isOpen()) A.close(); else A.open(); };
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && A.isOpen() && !document.querySelector('.mask')) { A.close(); return; }
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing || !$('wsAsk') || document.getElementById('wsBoot') || document.getElementById('wsSignin')) return;
    e.preventDefault();
    A.open();
  });

  /* reminders on Home: Needs you */
  O.followUpAlerts = function () {
    return (WS.state.followUps || []).filter(function (f) { return !f.done; }).sort(function (a, b) { return a.due.localeCompare(b.due); })
      .map(function (f) { return { t: 'Reminder for ' + WS.dayLabel(f.due) + ': ' + f.text, go: 'home', cls: f.due <= WS.day(0) ? 'warn' : 'go' }; });
  };
})();
