/* Office app. Everything renders from WS.state and writes back through WS.save(). */
(function () {
  var $ = WS.$, esc = WS.esc;
  var screen = 'home', bookinDraft = {}, tsWeek = 0, vehFilter = { q: '', type: '', op: '', vor: '' };
  var SCREENS = {}, WIRE = {};

  var NAV = [
    { id: 'home', name: 'Home', icon: '▦' },
    { id: 'board', name: 'Workshop board', icon: '▤' },
    { id: 'live', name: 'Live view', icon: '◉' },
    { id: 'bookin', name: 'Book in', icon: '＋' },
    { id: 'vehicles', name: 'Vehicles', icon: '▣' },
    { id: 'invoices', name: 'Invoices', icon: '£' },
    { id: 'compliance', name: 'Compliance planner', icon: '✓' },
    { id: 'timesheets', name: 'Timesheets', icon: '◷' }
  ];

  /* ---------------- boot ---------------- */
  /* called at the very bottom, once every screen function below has been assigned */
  function boot() {
  WS.initTheme();
  WS.gate(function () {
    WS.load();
    WS.banner();
    $('shell').hidden = false;
    $('bizName').textContent = shortName(WS.state.settings.name);
    buildNav();
    WS.watch();
    WS.onChange(function () { if (screen === 'live' || screen === 'board' || screen === 'home') render(); });
    $('burger').onclick = function () { document.body.classList.toggle('navopen'); };
    $('navmask').onclick = function () { document.body.classList.remove('navopen'); };
    go(location.hash.replace('#', '') || 'home');
    setInterval(function () { if (screen === 'live') paintTimers(); }, 1000);
  });
  }

  function buildNav() {
    var wrap = $('navItems');
    wrap.innerHTML = '';
    NAV.forEach(function (n) {
      var b = WS.el('button', 'nv');
      b.dataset.screen = n.id;
      b.innerHTML = '<i>' + n.icon + '</i>' + esc(n.name) + '<span class="cnt" hidden></span>';
      wrap.appendChild(b);
    });
    document.querySelectorAll('nav.side button.nv').forEach(function (b) {
      b.onclick = function () { go(b.dataset.screen); document.body.classList.remove('navopen'); };
    });
  }

  function navCounts() {
    var today = WS.jobsOn(WS.day(0));
    var c = {
      board: today.length,
      live: today.filter(function (j) { return j.status === 'in_progress'; }).length,
      invoices: WS.state.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }).length
    };
    document.querySelectorAll('nav.side button.nv').forEach(function (b) {
      var el = b.querySelector('.cnt'), v = c[b.dataset.screen];
      if (!el) return;
      if (v) { el.textContent = v; el.hidden = false; } else { el.hidden = true; }
    });
  }

  function go(s) {
    if (!SCREENS[s]) s = 'home';
    screen = s;
    location.hash = s;
    document.querySelectorAll('nav.side button.nv').forEach(function (b) { b.classList.toggle('on', b.dataset.screen === s); });
    var nm = (NAV.filter(function (n) { return n.id === s; })[0] || { name: 'Settings' }).name;
    $('topTitle').textContent = nm;
    window.scrollTo(0, 0);
    render();
  }
  WS.go = go;

  function render() {
    $('view').innerHTML = SCREENS[screen]();
    navCounts();
    if (WIRE[screen]) WIRE[screen]();
  }
  WS.rerender = render;

  /* ---------------- small builders ---------------- */
  /* the sidebar is 236px, so the legal suffix gets in the way */
  function shortName(n) { return String(n || '').replace(/\s+(Ltd|Limited|LLP|PLC)\.?$/i, ''); }
  function pill(text, cls) { return '<span class="pill ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function chip(text, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function stat(key, val, foot, cls, screenTo) {
    return '<button class="stat" ' + (screenTo ? 'data-go="' + screenTo + '"' : '') + '>' +
      '<div class="k">' + esc(key) + '</div><div class="v ' + (cls || '') + '">' + esc(String(val)) + '</div>' +
      (foot ? '<div class="f">' + esc(foot) + '</div>' : '') + '</button>';
  }
  function vehLine(v) {
    var o = WS.operator(v.operatorId);
    return '<span class="reg">' + esc(v.reg) + '</span> <span class="muted sm">' + esc(v.make + ' ' + v.model) + '</span>' +
      '<div class="muted sm">' + esc(o ? o.name : '') + '</div>';
  }
  function wireGo() {
    document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
  }

  /* ---------------- home ---------------- */
  SCREENS.home = function () {
    var T = WS.day(0), today = WS.jobsOn(T), S = WS.state;
    var inProg = today.filter(function (j) { return j.status === 'in_progress'; }).length;
    var waiting = S.jobs.filter(function (j) { return j.status === 'waiting_parts'; }).length;
    var ready = S.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }).length;
    var overduePmi = S.vehicles.filter(function (v) { return WS.dueState(v.nextPmi) && WS.dueState(v.nextPmi).days <= 7; }).length;
    var vor = S.vehicles.filter(function (v) { return v.vor; }).length;

    var mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    var hrs = 0;
    S.jobs.forEach(function (j) { if (WS.parse(j.date) >= mStart) hrs += WS.hoursOn(j); });
    var rev = 0;
    S.invoices.forEach(function (i) { if (WS.parse(i.date) >= mStart) rev += i.net; });

    var rows = today.slice().sort(function (a, b) { return (a.bay || 'z').localeCompare(b.bay || 'z'); }).map(function (j) {
      var v = WS.vehicle(j.vehicleId), f = WS.fitter(j.fitterId);
      return '<tr class="click" data-job="' + j.id + '"><td>' + vehLine(v) + '</td>' +
        '<td>' + chip(j.type) + '</td>' +
        '<td class="hide-sm">' + esc(j.bay || '—') + '</td>' +
        '<td class="hide-sm">' + esc(f ? f.name.split(' ')[0] : '—') + '</td>' +
        '<td>' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) + '</td>' +
        '<td class="num mono hide-sm">' + (WS.hoursOn(j) ? WS.hhmm(WS.hoursOn(j)) : '—') + '</td></tr>';
    }).join('');

    var hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    return '<div class="phead"><div><h1>' + greet + '</h1><div class="sub">' + esc(WS.dayName(T)) + ' · ' + esc(WS.dateUK(T)) + '</div></div>' +
      '<div class="sp"><button class="btn" data-go="bookin">Book a vehicle in</button></div></div>' +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Jobs in today', today.length, today.filter(function (j) { return j.status === 'booked'; }).length + ' still to start', '', 'board') +
      stat('In progress', inProg, 'fitters clocked on', 'ok', 'live') +
      stat('Waiting on parts', waiting, 'across all jobs', waiting ? 'warn' : '', 'live') +
      stat('Ready to invoice', ready, 'QC signed off', ready ? 'go' : '', 'invoices') +
      '</div>' +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Overdue PMIs this week', overduePmi, 'needs booking in', overduePmi ? 'bad' : 'ok', 'compliance') +
      stat('Vehicles off road', vor, 'VOR right now', vor ? 'bad' : 'ok', 'vehicles') +
      stat('Labour hours this month', WS.hhmm(hrs), 'from fitter clock ons', '', 'timesheets') +
      stat('Invoiced this month', WS.money0(rev), 'net of VAT', '', 'invoices') +
      '</div>' +

      '<div class="card"><div class="ch"><h2>Today in the workshop</h2>' +
      '<div class="sp"><button class="btn alt sm" data-go="board">Open the board</button></div></div>' +
      (today.length ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Job</th><th class="hide-sm">Bay</th><th class="hide-sm">Fitter</th><th>Status</th><th class="num hide-sm">Clocked</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">Nothing booked in for today.</div>') +
      '</div>' +

      '<div class="card"><h2>Coming next</h2><div class="hint" style="margin:6px 0 14px">Not in this demo, next on the build list.</div>' +
      '<div class="grid g3">' +
      ['Customer portal for operators', 'Quotes and authorisations', 'Parts stock and ordering', 'Driver walkaround app', 'Earned Recognition dashboard', 'Tyre and fuel tracking']
        .map(function (t) { return '<div style="padding:13px 14px;border:1px dashed var(--line);border-radius:12px;font-weight:600;font-size:13.5px">' + esc(t) + '</div>'; }).join('') +
      '</div></div>';
  };
  WIRE.home = function () {
    wireGo();
    document.querySelectorAll('tr[data-job]').forEach(function (tr) { tr.onclick = function () { jobCard(tr.dataset.job); }; });
  };

  /* ---------------- workshop board ---------------- */
  SCREENS.board = function () {
    var T = WS.day(0), today = WS.jobsOn(T), S = WS.state;
    var unassigned = today.filter(function (j) { return !j.bay; });
    var cols = S.settings.bays.map(function (bay) {
      var inBay = today.filter(function (j) { return j.bay === bay; });
      return '<div class="bay" data-bay="' + esc(bay) + '">' +
        '<div class="bh"><span class="t">' + esc(bay) + '</span>' + chip(inBay.length + (inBay.length === 1 ? ' job' : ' jobs')) + '</div>' +
        inBay.map(jobCardHtml).join('') +
        (inBay.length ? '' : '<div class="hint" style="padding:12px 2px">Drop a vehicle here.</div>') +
        '</div>';
    }).join('');

    return '<div class="phead"><div><h1>Workshop board</h1><div class="sub">' + esc(WS.dayName(T)) + ' · drag a vehicle onto a bay, or tap a card to assign it</div></div>' +
      '<div class="sp"><button class="btn alt" data-go="live">Live view</button><button class="btn" data-go="bookin">Book in</button></div></div>' +

      '<div class="card tight" style="margin-bottom:16px"><div class="ch"><h3>Waiting to go in (' + unassigned.length + ')</h3></div>' +
      '<div class="board" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">' +
      (unassigned.length ? unassigned.map(jobCardHtml).join('') : '<div class="hint">Every vehicle in today is in a bay.</div>') +
      '</div></div>' +

      '<div class="board">' + cols + '</div>';
  };

  function jobCardHtml(j) {
    var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId), f = WS.fitter(j.fitterId);
    var t = WS.hoursOn(j);
    return '<div class="jcard' + (j.bay ? '' : ' unassigned') + '" draggable="true" data-job="' + j.id + '">' +
      '<div class="r1"><span class="rg">' + esc(v ? v.reg : '') + '</span>' + chip(j.type) + '</div>' +
      '<div class="op">' + esc(o ? o.name : '') + '</div>' +
      '<div class="r2">' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) +
      (f ? '<span class="muted sm">' + esc(f.name.split(' ')[0]) + '</span>' : '<span class="muted sm">no fitter</span>') +
      (t ? '<span class="muted sm mono right">' + WS.hhmm(t) + '</span>' : '') +
      '</div></div>';
  }

  WIRE.board = function () {
    wireGo();
    var dragId = null;
    document.querySelectorAll('.jcard').forEach(function (c) {
      c.addEventListener('dragstart', function (e) {
        dragId = c.dataset.job;
        c.classList.add('drag');
        e.dataTransfer.setData('text/plain', dragId);
        e.dataTransfer.effectAllowed = 'move';
      });
      c.addEventListener('dragend', function () { c.classList.remove('drag'); dragId = null; });
      c.onclick = function () { jobCard(c.dataset.job); };
    });
    document.querySelectorAll('.bay').forEach(function (bay) {
      bay.addEventListener('dragover', function (e) { e.preventDefault(); bay.classList.add('over'); e.dataTransfer.dropEffect = 'move'; });
      bay.addEventListener('dragleave', function () { bay.classList.remove('over'); });
      bay.addEventListener('drop', function (e) {
        e.preventDefault();
        bay.classList.remove('over');
        var id = e.dataTransfer.getData('text/plain') || dragId;
        if (id) assignBay(id, bay.dataset.bay);
      });
    });
  };

  function assignBay(jobId, bay) {
    var j = WS.job(jobId);
    if (!j || j.bay === bay) return;
    j.bay = bay;
    if (j.status === 'booked') j.status = 'in_bay';
    WS.audit(j, 'Office', 'Moved to ' + bay);
    WS.save();
    WS.toast(WS.vehicle(j.vehicleId).reg + ' moved to ' + bay + '.', 'ok');
    render();
  }

  /* ---------------- live view ---------------- */
  SCREENS.live = function () {
    var T = WS.day(0), today = WS.jobsOn(T);
    var order = ['in_progress', 'waiting_parts', 'in_bay', 'qc', 'booked', 'done'];
    today.sort(function (a, b) { return order.indexOf(a.status) - order.indexOf(b.status); });
    var rows = today.map(function (j) {
      var v = WS.vehicle(j.vehicleId), f = WS.fitter(j.fitterId);
      var open = (j.clockOns || []).filter(function (c) { return !c.end; })[0];
      return '<tr class="click" data-job="' + j.id + '">' +
        '<td>' + vehLine(v) + '</td>' +
        '<td class="hide-sm">' + chip(j.type) + '</td>' +
        '<td class="hide-sm">' + esc(j.bay || '—') + '</td>' +
        '<td>' + esc(f ? f.name.split(' ')[0] : '—') + '</td>' +
        '<td>' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) + '</td>' +
        '<td class="num mono" data-timer="' + j.id + '">' + (WS.hoursOn(j) ? WS.hhmm(WS.hoursOn(j)) : '—') + '</td>' +
        '<td class="hide-sm">' + (open ? '<span class="pill go">clocked on</span>' : '') + '</td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Live view</h1><div class="sub">Every job in today. Updates on its own as the fitters work.</div></div>' +
      '<div class="sp">' + pill('live', 'go') + '</div></div>' +
      '<div class="card tight">' +
      (today.length ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th class="hide-sm">Job</th><th class="hide-sm">Bay</th><th>Fitter</th><th>Stage</th><th class="num">Clocked</th><th class="hide-sm"></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">Nothing booked in for today.</div>') +
      '</div>' +
      '<div class="hint">Open the fitter app on a phone and clock onto a job. This screen follows it within a few seconds.</div>';
  };
  WIRE.live = function () {
    document.querySelectorAll('tr[data-job]').forEach(function (tr) { tr.onclick = function () { jobCard(tr.dataset.job); }; });
  };
  function paintTimers() {
    document.querySelectorAll('[data-timer]').forEach(function (td) {
      var j = WS.job(td.dataset.timer);
      if (!j) return;
      var h = WS.hoursOn(j);
      td.textContent = h ? WS.hhmm(h) : '—';
    });
  }

  /* ---------------- book in ---------------- */
  SCREENS.bookin = function () {
    var S = WS.state, d = bookinDraft;
    var ops = S.operators.map(function (o) { return '<option value="' + o.id + '"' + (d.op === o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('');
    var vehs = S.vehicles.filter(function (v) { return !d.op || v.operatorId === d.op; })
      .map(function (v) { return '<option value="' + v.id + '"' + (d.veh === v.id ? ' selected' : '') + '>' + esc(v.reg + ' · ' + v.make + ' ' + v.model) + '</option>'; }).join('');
    var bays = ['<option value="">Not yet, leave it waiting</option>'].concat(S.settings.bays.map(function (b) {
      return '<option value="' + esc(b) + '"' + (d.bay === b ? ' selected' : '') + '>' + esc(b) + '</option>';
    })).join('');
    var fits = ['<option value="">Not yet</option>'].concat(S.settings.fitters.map(function (f) {
      return '<option value="' + f.id + '"' + (d.fitter === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    })).join('');
    var types = ['PMI', 'Repair', 'Defect', 'MOT prep', 'LOLER', 'Service'].map(function (t) {
      return '<button type="button" data-type="' + t + '" class="' + (d.type === t ? 'on' : '') + '">' + t + '</button>';
    }).join('');

    var v = d.veh ? WS.vehicle(d.veh) : null;
    var due = v ? WS.dueState(v.nextPmi) : null;

    return '<div class="phead"><div><h1>Book a vehicle in</h1><div class="sub">Creates a job card on the board.</div></div></div>' +
      '<div class="grid g2" style="align-items:start">' +
      '<div class="card"><h2>The job</h2><div class="sep"></div>' +
      '<label class="f"><span class="lb">Operator</span><select class="in" id="bOp"><option value="">Pick an operator</option>' + ops + '</select></label>' +
      '<label class="f"><span class="lb">Vehicle</span><select class="in" id="bVeh"><option value="">Pick a vehicle</option>' + vehs + '</select></label>' +
      '<div class="lb" style="font-size:12.5px;font-weight:600;color:var(--muted);margin-bottom:6px">Job type</div>' +
      '<div class="seg" id="bTypes" style="margin-bottom:14px">' + types + '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Date in</span><input class="in" type="date" id="bDate" value="' + esc(d.date || WS.day(0)) + '"></label>' +
      '<label class="f"><span class="lb">Bay</span><select class="in" id="bBay">' + bays + '</select></label>' +
      '</div>' +
      '<label class="f"><span class="lb">Fitter</span><select class="in" id="bFitter">' + fits + '</select></label>' +
      '<label class="f"><span class="lb">Notes for the fitter</span><textarea class="in" id="bNotes" placeholder="What the driver reported, anything the fitter should know">' + esc(d.notes || '') + '</textarea></label>' +
      '<button class="btn block lg" id="bGo">Create the job card</button>' +
      '</div>' +

      '<div>' +
      (v ? '<div class="card"><h2>' + esc(v.reg) + '</h2><div class="muted sm" style="margin-bottom:12px">' + esc(v.make + ' ' + v.model + ' · ' + v.type) + '</div>' +
        '<div class="tablewrap"><table class="tbl"><tbody>' +
        '<tr><td class="muted">Operator</td><td>' + esc((WS.operator(v.operatorId) || {}).name || '') + '</td></tr>' +
        '<tr><td class="muted">Odometer</td><td class="mono">' + (v.odometer ? v.odometer.toLocaleString('en-GB') + ' km' : 'n/a') + '</td></tr>' +
        '<tr><td class="muted">PMI interval</td><td>' + v.pmiWeeks + ' weeks</td></tr>' +
        '<tr><td class="muted">Next PMI</td><td>' + esc(WS.dateUK(v.nextPmi)) + ' ' + (due ? pill(due.label, due.cls) : '') + '</td></tr>' +
        '<tr><td class="muted">Annual test</td><td>' + esc(WS.dateUK(v.annualTest)) + '</td></tr>' +
        (v.loler ? '<tr><td class="muted">LOLER</td><td>' + esc(WS.dateUK(v.loler)) + '</td></tr>' : '') +
        '<tr><td class="muted">Status</td><td>' + (v.vor ? pill('VOR', 'bad') : pill('In service', 'ok')) + '</td></tr>' +
        '</tbody></table></div></div>'
        : '<div class="card"><h2>Vehicle file</h2><div class="hint" style="margin-top:8px">Pick a vehicle and its file shows here, with the next PMI and test dates.</div></div>') +

      '<div class="card"><h3>Not on the system yet?</h3><div class="hint" style="margin:6px 0 12px">Add the operator or vehicle and it drops straight into the list.</div>' +
      '<div class="inline"><button class="btn alt sm" id="addOp">Add an operator</button><button class="btn alt sm" id="addVeh">Add a vehicle</button></div></div>' +
      '</div></div>';
  };

  WIRE.bookin = function () {
    var d = bookinDraft;
    $('bOp').onchange = function () { d.op = this.value; d.veh = ''; render(); };
    $('bVeh').onchange = function () { d.veh = this.value; render(); };
    $('bDate').onchange = function () { d.date = this.value; };
    $('bBay').onchange = function () { d.bay = this.value; };
    $('bFitter').onchange = function () { d.fitter = this.value; };
    $('bNotes').oninput = function () { d.notes = this.value; };
    document.querySelectorAll('#bTypes button').forEach(function (b) {
      b.onclick = function () { d.type = b.dataset.type; render(); };
    });
    $('addOp').onclick = addOperator;
    $('addVeh').onclick = addVehicle;
    $('bGo').onclick = function () {
      if (!d.veh) return WS.toast('Pick a vehicle first.', 'bad');
      if (!d.type) return WS.toast('Pick a job type.', 'bad');
      var v = WS.vehicle(d.veh);
      var no = 'JC' + (1000 + WS.state.jobs.length + 1);
      var j = {
        id: 'j' + Date.now(), no: no, vehicleId: v.id, operatorId: v.operatorId,
        type: d.type, date: d.date || WS.day(0), bay: d.bay || '', fitterId: d.fitter || '',
        status: d.bay ? 'in_bay' : 'booked',
        tasks: (WS.JOB_TASKS[d.type] || []).map(function (t, i) { return { id: 't' + i, text: t, done: false }; }),
        notes: d.notes || '', parts: [], clockOns: [], photos: [], inspection: null, defects: [],
        qc: null, invoiceId: '', createdAt: WS.nowStamp(),
        audit: [{ at: WS.nowStamp(), who: 'Office', what: 'Job card created' }]
      };
      WS.state.jobs.push(j);
      WS.save();
      bookinDraft = {};
      WS.toast(v.reg + ' booked in for ' + (j.date === WS.day(0) ? 'today' : WS.dateUK(j.date)) + '.', 'ok');
      go('board');
    };
  };

  function addOperator() {
    modal('Add an operator', '<label class="f"><span class="lb">Name</span><input class="in" id="aoName" placeholder="Operator name"></label>' +
      '<div class="row"><label class="f"><span class="lb">Contact</span><input class="in" id="aoC" placeholder="Who we speak to"></label>' +
      '<label class="f"><span class="lb">Phone</span><input class="in" id="aoP"></label></div>' +
      '<label class="f"><span class="lb">Email</span><input class="in" id="aoE" type="email"></label>',
      'Add operator', function () {
        var n = $('aoName').value.trim();
        if (!n) { WS.toast('Give the operator a name.', 'bad'); return false; }
        var o = { id: 'o' + Date.now(), name: n, contact: $('aoC').value.trim(), phone: $('aoP').value.trim(), email: $('aoE').value.trim(), trade: '' };
        WS.state.operators.push(o);
        WS.save();
        bookinDraft.op = o.id;
        WS.toast(n + ' added.', 'ok');
        render();
      });
  }

  function addVehicle() {
    var ops = WS.state.operators.map(function (o) { return '<option value="' + o.id + '"' + (bookinDraft.op === o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('');
    modal('Add a vehicle',
      '<div class="row"><label class="f"><span class="lb">Registration</span><input class="in" id="avReg" placeholder="LV21 KXZ"></label>' +
      '<label class="f"><span class="lb">Operator</span><select class="in" id="avOp">' + ops + '</select></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Make</span><input class="in" id="avMake" placeholder="DAF"></label>' +
      '<label class="f"><span class="lb">Model</span><input class="in" id="avModel" placeholder="CF 290"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Type</span><input class="in" id="avType" placeholder="Skip loader 26t"></label>' +
      '<label class="f"><span class="lb">Odometer (km)</span><input class="in" id="avOdo" type="number" value="0"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">PMI interval (weeks)</span><input class="in" id="avPmi" type="number" value="6"></label>' +
      '<label class="f"><span class="lb">Next PMI</span><input class="in" id="avNext" type="date" value="' + WS.day(28) + '"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Annual test</span><input class="in" id="avAt" type="date" value="' + WS.day(180) + '"></label>' +
      '<label class="f"><span class="lb">VIN</span><input class="in" id="avVin"></label></div>',
      'Add vehicle', function () {
        var reg = $('avReg').value.trim().toUpperCase();
        if (!reg) { WS.toast('Give the vehicle a registration.', 'bad'); return false; }
        var v = {
          id: 'v' + Date.now(), reg: reg, vin: $('avVin').value.trim(), make: $('avMake').value.trim(), model: $('avModel').value.trim(),
          year: new Date().getFullYear(), type: $('avType').value.trim() || 'Vehicle', operatorId: $('avOp').value,
          odometer: +$('avOdo').value || 0, pmiWeeks: +$('avPmi').value || 6,
          lastPmi: '', nextPmi: $('avNext').value, annualTest: $('avAt').value, brakeTest: '', tacho: '', loler: '', vor: false, notes: ''
        };
        WS.state.vehicles.push(v);
        WS.save();
        bookinDraft.op = v.operatorId;
        bookinDraft.veh = v.id;
        WS.toast(reg + ' added.', 'ok');
        render();
      });
  }

  /* ---------------- vehicles ---------------- */
  SCREENS.vehicles = function () {
    var S = WS.state, f = vehFilter;
    var types = {};
    S.vehicles.forEach(function (v) { types[v.type] = 1; });
    var list = S.vehicles.filter(function (v) {
      if (f.q) {
        var q = f.q.toLowerCase();
        var o = WS.operator(v.operatorId) || {};
        if ((v.reg + ' ' + v.make + ' ' + v.model + ' ' + (o.name || '')).toLowerCase().indexOf(q) < 0) return false;
      }
      if (f.type && v.type !== f.type) return false;
      if (f.op && v.operatorId !== f.op) return false;
      if (f.vor === 'y' && !v.vor) return false;
      return true;
    });

    var rows = list.map(function (v) {
      var due = WS.dueState(v.nextPmi);
      return '<tr class="click" data-veh="' + v.id + '">' +
        '<td class="reg">' + esc(v.reg) + (v.vor ? ' <span class="pill bad only-sm">VOR</span>' : '') + '</td>' +
        '<td>' + esc(v.make + ' ' + v.model) + '<div class="muted sm">' + esc(v.type) + '</div></td>' +
        '<td class="hide-sm">' + esc((WS.operator(v.operatorId) || {}).name || '') + '</td>' +
        '<td class="num mono hide-sm">' + (v.odometer ? v.odometer.toLocaleString('en-GB') : '—') + '</td>' +
        '<td class="nowrap">' + esc(WS.dateShort(v.nextPmi)) + ' ' +
        (due ? '<span class="pill ' + due.cls + ' hide-sm">' + esc(due.label) + '</span>' +
          '<span class="pill ' + due.cls + ' only-sm">' + esc(due.short) + '</span>' : '') + '</td>' +
        '<td class="hide-sm">' + (v.vor ? pill('VOR', 'bad') : pill('In service', 'ok')) + '</td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Vehicles</h1><div class="sub">' + list.length + ' of ' + S.vehicles.length + ' shown</div></div>' +
      '<div class="sp"><button class="btn alt" id="vAdd">Add a vehicle</button></div></div>' +
      '<div class="card tight"><div class="row" style="margin-bottom:12px">' +
      '<input class="in" id="vq" placeholder="Search reg, make or operator" value="' + esc(f.q) + '">' +
      '<select class="in" id="vtype"><option value="">All types</option>' + Object.keys(types).sort().map(function (t) {
        return '<option' + (f.type === t ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('') + '</select>' +
      '<select class="in" id="vop"><option value="">All operators</option>' + S.operators.map(function (o) {
        return '<option value="' + o.id + '"' + (f.op === o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>';
      }).join('') + '</select>' +
      '<select class="in" id="vvor"><option value="">In service and VOR</option><option value="y"' + (f.vor === 'y' ? ' selected' : '') + '>VOR only</option></select>' +
      '</div>' +
      (list.length ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Reg</th><th>Vehicle</th><th class="hide-sm">Operator</th><th class="num hide-sm">Odometer</th><th>Next PMI</th><th class="hide-sm">Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">No vehicles match that.</div>') +
      '</div>';
  };
  WIRE.vehicles = function () {
    $('vq').oninput = function () { vehFilter.q = this.value; var p = this.selectionStart; render(); var el = $('vq'); el.focus(); el.setSelectionRange(p, p); };
    $('vtype').onchange = function () { vehFilter.type = this.value; render(); };
    $('vop').onchange = function () { vehFilter.op = this.value; render(); };
    $('vvor').onchange = function () { vehFilter.vor = this.value; render(); };
    $('vAdd').onclick = addVehicle;
    document.querySelectorAll('tr[data-veh]').forEach(function (tr) { tr.onclick = function () { vehicleFile(tr.dataset.veh); }; });
  };

  function vehicleFile(id) {
    var v = WS.vehicle(id), o = WS.operator(v.operatorId) || {};
    var jobs = WS.state.jobs.filter(function (j) { return j.vehicleId === id; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var dues = WS.DUE_KINDS.filter(function (k) { return v[k.key]; }).map(function (k) {
      var st = WS.dueState(v[k.key]);
      return '<tr><td>' + esc(k.label) + '</td><td class="mono">' + esc(WS.dateUK(v[k.key])) + '</td><td>' + pill(st.label, st.cls) + '</td></tr>';
    }).join('');
    var hist = jobs.slice(0, 14).map(function (j) {
      return '<tr class="click" data-job="' + j.id + '"><td class="mono nowrap">' + esc(WS.dateShort(j.date)) + '</td>' +
        '<td>' + chip(j.type) + '</td>' +
        '<td>' + esc((WS.fitter(j.fitterId) || {}).name || '—') + '</td>' +
        '<td>' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) + '</td>' +
        '<td>' + (j.inspection ? '<span class="pill go">PMI sheet</span>' : '') + (j.defects && j.defects.length ? ' ' + pill(j.defects.length + ' defect' + (j.defects.length > 1 ? 's' : ''), 'warn') : '') + '</td></tr>';
    }).join('');

    modal(v.reg + ' · ' + v.make + ' ' + v.model,
      '<div class="grid g2" style="margin-bottom:4px">' +
      '<div><div class="tablewrap"><table class="tbl"><tbody>' +
      '<tr><td class="muted">Operator</td><td>' + esc(o.name || '') + '</td></tr>' +
      '<tr><td class="muted">Type</td><td>' + esc(v.type) + '</td></tr>' +
      '<tr><td class="muted">VIN</td><td class="mono sm">' + esc(v.vin) + '</td></tr>' +
      '<tr><td class="muted">Year</td><td>' + esc(v.year) + '</td></tr>' +
      '<tr><td class="muted">Odometer</td><td class="mono">' + (v.odometer ? v.odometer.toLocaleString('en-GB') + ' km' : 'n/a') + '</td></tr>' +
      '<tr><td class="muted">PMI interval</td><td>' + v.pmiWeeks + ' weeks</td></tr>' +
      '</tbody></table></div></div>' +
      '<div><div class="tablewrap"><table class="tbl"><thead><tr><th>Due</th><th>Date</th><th></th></tr></thead><tbody>' + dues + '</tbody></table></div></div>' +
      '</div>' +
      '<div class="inline" style="margin:14px 0">' +
      '<button class="btn alt sm" id="vfVor">' + (v.vor ? 'Put back in service' : 'Mark as VOR') + '</button>' +
      '<button class="btn alt sm" id="vfBook">Book this vehicle in</button>' +
      (v.notes ? '<span class="pill warn">' + esc(v.notes) + '</span>' : '') +
      '</div>' +
      '<h3 style="margin-bottom:8px">Job and inspection history</h3>' +
      (hist ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Date</th><th>Job</th><th>Fitter</th><th>Status</th><th></th></tr></thead><tbody>' + hist + '</tbody></table></div>'
        : '<div class="empty">No jobs on file yet.</div>'),
      null, null, 'wide');

    $('vfVor').onclick = function () {
      v.vor = !v.vor;
      WS.save();
      WS.toast(v.reg + (v.vor ? ' marked VOR.' : ' back in service.'), v.vor ? 'bad' : 'ok');
      closeModal();
      render();
    };
    $('vfBook').onclick = function () { bookinDraft = { op: v.operatorId, veh: v.id, date: WS.day(0) }; closeModal(); go('bookin'); };
    document.querySelectorAll('.modal tr[data-job]').forEach(function (tr) {
      tr.onclick = function () { closeModal(); jobCard(tr.dataset.job); };
    });
  }

  /* ---------------- job card (office) ---------------- */
  function jobCard(id) {
    var j = WS.job(id);
    if (!j) return;
    var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId) || {}, f = WS.fitter(j.fitterId);
    var q = WS.quoteJob(j);
    var inv = j.invoiceId ? WS.invoice(j.invoiceId) : null;

    var tasks = (j.tasks || []).map(function (t) {
      return '<div class="task' + (t.done ? ' on' : '') + '" data-task="' + t.id + '"><div class="bx">✓</div><div class="tx">' + esc(t.text) + '</div></div>';
    }).join('') || '<div class="hint">No tasks on this job card.</div>';

    var parts = (j.parts || []).map(function (p, i) {
      return '<tr><td>' + esc(p.name) + '</td><td class="num mono">' + p.qty + '</td>' +
        '<td class="num mono">' + WS.money(p.cost) + '</td>' +
        '<td class="num mono">' + WS.money(p.cost * p.qty * (1 + WS.state.settings.markup / 100)) + '</td>' +
        '<td><button class="btn alt sm" data-rmpart="' + i + '">Remove</button></td></tr>';
    }).join('');

    var clocks = (j.clockOns || []).map(function (c) {
      var ft = WS.fitter(c.fitterId) || {};
      var hrs = c.end ? (new Date(c.end) - new Date(c.start)) / 3600000 : (Date.now() - new Date(c.start)) / 3600000;
      return '<tr><td>' + esc(ft.name || '') + '</td><td class="mono">' + WS.timeUK(c.start) + '</td>' +
        '<td class="mono">' + (c.end ? WS.timeUK(c.end) : '<span class="pill go">running</span>') + '</td>' +
        '<td class="num mono">' + WS.hhmm(hrs) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">No clock ons yet.</td></tr>';

    var defects = (j.defects || []).length ? j.defects.map(function (d) {
      return '<div style="padding:11px 12px;border:1px solid var(--bad);background:var(--bad-l);border-radius:10px;margin-bottom:8px">' +
        '<div class="b">' + esc(d.item) + '</div><div class="sm" style="margin-top:3px">' + esc(d.note) + '</div>' +
        '<div class="muted sm" style="margin-top:5px">Rectified by ' + esc(d.rectBy || 'not yet') + (d.rectAt ? ' on ' + esc(WS.dateUK(d.rectAt)) : '') + '</div>' +
        (d.photo ? '<img class="thumb" style="margin-top:8px" src="' + d.photo + '" alt="defect photo">' : '') + '</div>';
    }).join('') : '<div class="hint">No defects raised.</div>';

    var photos = (j.photos || []).length
      ? '<div class="thumbs">' + j.photos.map(function (p) { return '<img class="thumb" src="' + p + '" alt="job photo">'; }).join('') + '</div>'
      : '<div class="hint">No photos on this job.</div>';

    var audit = (j.audit || []).slice().reverse().map(function (a) {
      return '<li><span class="w">' + esc(WS.whenUK(a.at)) + '</span><span>' + esc(a.who) + ' · ' + esc(a.what) + '</span></li>';
    }).join('');

    var actions = '';
    if (j.status === 'qc') actions += '<button class="btn" id="jcQc">QC sign off</button>';
    if (j.status === 'done' && !inv) actions += '<button class="btn" id="jcInv">Create invoice</button>';
    if (inv) actions += '<button class="btn alt" id="jcViewInv">View invoice ' + esc(inv.no) + '</button>';
    if (j.status !== 'done' && j.status !== 'qc') actions += '<button class="btn alt" id="jcDone">Mark done, send to QC</button>';

    modal('Job card ' + j.no + ' · ' + v.reg,
      '<div class="inline" style="margin-bottom:14px">' + chip(j.type) + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) +
      '<span class="muted sm">' + esc(WS.dayName(j.date)) + '</span>' +
      '<span class="muted sm">' + esc(j.bay || 'no bay') + '</span>' +
      '<span class="muted sm">' + esc(f ? f.name : 'no fitter') + '</span></div>' +

      '<div class="row" style="margin-bottom:16px">' +
      '<label class="f" style="margin:0"><span class="lb">Bay</span><select class="in" id="jcBay">' +
      ['<option value="">Not in a bay</option>'].concat(WS.state.settings.bays.map(function (b) {
        return '<option value="' + esc(b) + '"' + (j.bay === b ? ' selected' : '') + '>' + esc(b) + '</option>';
      })).join('') + '</select></label>' +
      '<label class="f" style="margin:0"><span class="lb">Fitter</span><select class="in" id="jcFitter">' +
      ['<option value="">Nobody yet</option>'].concat(WS.state.settings.fitters.map(function (x) {
        return '<option value="' + x.id + '"' + (j.fitterId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>';
      })).join('') + '</select></label>' +
      '<label class="f" style="margin:0"><span class="lb">Stage</span><select class="in" id="jcStatus">' +
      Object.keys(WS.STATUS).map(function (k) {
        return '<option value="' + k + '"' + (j.status === k ? ' selected' : '') + '>' + esc(WS.STATUS[k].label) + '</option>';
      }).join('') + '</select></label>' +
      '</div>' +

      '<div class="grid g2" style="align-items:start">' +
      '<div>' +
      '<h3 style="margin-bottom:6px">Vehicle</h3>' +
      '<div class="tablewrap" style="margin-bottom:14px"><table class="tbl"><tbody>' +
      '<tr><td class="muted">Reg</td><td class="reg">' + esc(v.reg) + '</td></tr>' +
      '<tr><td class="muted">Vehicle</td><td>' + esc(v.make + ' ' + v.model) + '</td></tr>' +
      '<tr><td class="muted">Operator</td><td>' + esc(o.name || '') + '</td></tr>' +
      '<tr><td class="muted">Odometer</td><td class="mono">' + (v.odometer ? v.odometer.toLocaleString('en-GB') + ' km' : 'n/a') + '</td></tr>' +
      '</tbody></table></div>' +
      '<h3 style="margin-bottom:6px">Tasks</h3>' + tasks +
      '<h3 style="margin:14px 0 6px">Notes</h3>' +
      '<textarea class="in" id="jcNotes" placeholder="Office notes">' + esc(j.notes || '') + '</textarea>' +
      '</div>' +

      '<div>' +
      '<h3 style="margin-bottom:6px">Labour</h3>' +
      '<div class="tablewrap" style="margin-bottom:6px"><table class="tbl"><thead><tr><th>Fitter</th><th>On</th><th>Off</th><th class="num">Time</th></tr></thead><tbody>' + clocks + '</tbody></table></div>' +
      '<div class="inline sm muted" style="margin-bottom:14px">' + WS.hhmm(q.hours) + ' at ' + WS.money(q.rate) + '/hr = <b class="b">' + WS.money(q.labour) + '</b></div>' +

      '<h3 style="margin-bottom:6px">Parts</h3>' +
      (parts ? '<div class="tablewrap" style="margin-bottom:8px"><table class="tbl"><thead><tr><th>Part</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">Charged</th><th></th></tr></thead><tbody>' + parts + '</tbody></table></div>'
        : '<div class="hint" style="margin-bottom:8px">No parts on this job.</div>') +
      '<div class="inline" style="margin-bottom:14px"><button class="btn alt sm" id="jcAddPart">Add a part</button>' +
      '<span class="muted sm">parts charged at cost plus ' + WS.state.settings.markup + '%</span></div>' +

      '<h3 style="margin-bottom:6px">Defects</h3>' + defects +
      '<h3 style="margin:14px 0 6px">Photos</h3>' + photos +
      '</div></div>' +

      (j.inspection ? '<div class="sep"></div><div class="inline" style="margin-bottom:10px"><h3>PMI inspection</h3>' +
        (j.inspection.lockedAt ? pill('locked ' + WS.whenUK(j.inspection.lockedAt), 'ok') : pill('in progress', 'warn')) +
        '<button class="btn alt sm right" id="jcSheet">Open the sheet</button></div>' : '') +

      '<div class="sep"></div><h3 style="margin-bottom:8px">Audit trail</h3><ul class="tl">' + audit + '</ul>',
      null, null, 'wide', actions);

    $('jcNotes').onchange = function () { j.notes = this.value; WS.audit(j, 'Office', 'Notes updated'); WS.save(); };
    $('jcBay').onchange = function () {
      j.bay = this.value;
      if (j.bay && j.status === 'booked') j.status = 'in_bay';
      WS.audit(j, 'Office', j.bay ? 'Moved to ' + j.bay : 'Taken out of the bay');
      WS.save();
      WS.toast(v.reg + (j.bay ? ' moved to ' + j.bay : ' taken out of the bay') + '.', 'ok');
      closeModal();
      jobCard(id);
      render();
    };
    $('jcFitter').onchange = function () {
      j.fitterId = this.value;
      var nf = WS.fitter(j.fitterId);
      WS.audit(j, 'Office', nf ? 'Assigned to ' + nf.name : 'Fitter cleared');
      WS.save();
      closeModal();
      jobCard(id);
      render();
    };
    $('jcStatus').onchange = function () {
      j.status = this.value;
      WS.audit(j, 'Office', 'Stage set to ' + WS.statusLabel(j.status));
      WS.save();
      closeModal();
      jobCard(id);
      render();
    };
    document.querySelectorAll('.modal [data-task]').forEach(function (t) {
      t.onclick = function () {
        var task = j.tasks.filter(function (x) { return x.id === t.dataset.task; })[0];
        task.done = !task.done;
        WS.audit(j, 'Office', (task.done ? 'Ticked' : 'Unticked') + ' task: ' + task.text);
        WS.save();
        closeModal();
        jobCard(id);
      };
    });
    document.querySelectorAll('.modal [data-rmpart]').forEach(function (b) {
      b.onclick = function () {
        var p = j.parts.splice(+b.dataset.rmpart, 1)[0];
        WS.audit(j, 'Office', 'Removed part: ' + p.name);
        WS.save();
        closeModal();
        jobCard(id);
      };
    });
    if ($('jcAddPart')) $('jcAddPart').onclick = function () { addPart(j, function () { closeModal(); jobCard(id); }); };
    if ($('jcSheet')) $('jcSheet').onclick = function () { closeModal(); sheetView(j.id); };
    if ($('jcDone')) $('jcDone').onclick = function () {
      (j.clockOns || []).forEach(function (c) { if (!c.end) c.end = WS.nowStamp(); });
      j.status = 'qc';
      WS.audit(j, 'Office', 'Marked done, sent to QC');
      WS.save();
      closeModal();
      WS.toast(v.reg + ' sent to QC.', 'ok');
      render();
    };
    if ($('jcQc')) $('jcQc').onclick = function () {
      j.status = 'done';
      j.qc = { by: 'Office', at: WS.nowStamp(), note: 'Checked and signed off.' };
      WS.audit(j, 'Office', 'QC signed off');
      WS.save();
      closeModal();
      WS.toast(v.reg + ' passed QC and is ready to invoice.', 'ok');
      render();
    };
    if ($('jcInv')) $('jcInv').onclick = function () { createInvoice(j); };
    if ($('jcViewInv')) $('jcViewInv').onclick = function () { closeModal(); invoiceView(inv.id); };
  }

  function addPart(job, after) {
    var opts = WS.PARTS.map(function (p) { return '<option value="' + esc(p.name) + '" data-cost="' + p.cost + '">' + esc(p.name) + ' · ' + WS.money(p.cost) + '</option>'; }).join('');
    modal('Add a part',
      '<label class="f"><span class="lb">From the van stock list</span><select class="in" id="apSel"><option value="">Pick a part</option>' + opts + '</select></label>' +
      '<div class="row"><label class="f"><span class="lb">Or type it</span><input class="in" id="apName" placeholder="Part name"></label>' +
      '<label class="f"><span class="lb">Cost each</span><input class="in" id="apCost" type="number" step="0.01" value="0"></label>' +
      '<label class="f"><span class="lb">Qty</span><input class="in" id="apQty" type="number" value="1" min="1"></label></div>' +
      '<div class="hint">Charged out at cost plus ' + WS.state.settings.markup + '%.</div>',
      'Add part', function () {
        var name = $('apName').value.trim() || $('apSel').value;
        var cost = +$('apCost').value || 0;
        if ($('apSel').value && !$('apName').value.trim()) {
          cost = +$('apSel').selectedOptions[0].dataset.cost;
        }
        if (!name) { WS.toast('Pick or name a part.', 'bad'); return false; }
        job.parts.push({ name: name, qty: +$('apQty').value || 1, cost: cost });
        WS.audit(job, 'Office', 'Added part: ' + name);
        WS.save();
        if (after) after();
      });
    $('apSel').onchange = function () {
      if (this.value) $('apCost').value = this.selectedOptions[0].dataset.cost;
    };
  }

  /* ---------------- inspection sheet view (office, read only) ---------------- */
  function sheetView(jobId) {
    var j = WS.job(jobId), v = WS.vehicle(j.vehicleId), i = j.inspection;
    if (!i) return;
    var secs = i.sections.map(function (s) {
      var bad = s.items.filter(function (it) { return it.state === 'D'; }).length;
      return '<div class="isec"><div class="sh">' + esc(s.name) +
        '<span class="cnt">' + (bad ? bad + ' defect' + (bad > 1 ? 's' : '') : s.items.length + ' checked') + '</span></div>' +
        s.items.map(function (it) {
          var c = it.state === 'D' ? 'bad' : it.state === 'N/A' ? '' : 'ok';
          return '<div class="iitem"><div class="nm">' + esc(it.name) + '</div>' +
            '<div>' + pill(it.state === 'S' ? 'Serviceable' : it.state === 'D' ? 'Defect' : 'N/A', c) + '</div>' +
            (it.note ? '<div class="dnote"><div class="b sm">' + esc(it.note) + '</div>' +
              '<div class="muted sm" style="margin-top:4px">Rectified by ' + esc(it.rectBy || 'not yet') + (it.rectAt ? ' on ' + esc(WS.dateUK(it.rectAt)) : '') + '</div>' +
              (it.photo ? '<img class="thumb" style="margin-top:8px" src="' + it.photo + '" alt="defect photo">' : '') + '</div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }).join('');

    var sig = function (s, title) {
      return '<div><div class="lb" style="font-size:12.5px;font-weight:600;color:var(--muted);margin-bottom:5px">' + title + '</div>' +
        (s.sig ? '<img class="sigimg" src="' + s.sig + '" alt="signature" style="max-height:90px;background:#fff;border-radius:10px;border:1px solid var(--line)">'
          : '<div class="hint">Signed in the fitter app.</div>') +
        '<div class="sm b" style="margin-top:6px">' + esc(s.name) + '</div>' +
        '<div class="muted sm">' + esc(WS.whenUK(s.at)) + '</div></div>';
    };

    modal('PMI inspection · ' + v.reg,
      '<div class="tablewrap" style="margin-bottom:14px"><table class="tbl"><tbody>' +
      '<tr><td class="muted">Operator</td><td>' + esc(i.header.operator || (WS.operator(j.operatorId) || {}).name || '') + '</td>' +
      '<td class="muted">Date</td><td>' + esc(WS.dateUK(i.header.date)) + '</td></tr>' +
      '<tr><td class="muted">Vehicle</td><td>' + esc(v.reg + ' · ' + v.make + ' ' + v.model) + '</td>' +
      '<td class="muted">Odometer</td><td class="mono">' + (+i.header.odometer || 0).toLocaleString('en-GB') + ' km</td></tr>' +
      '<tr><td class="muted">VIN</td><td class="mono sm">' + esc(v.vin) + '</td>' +
      '<td class="muted">Inspector</td><td>' + esc(i.header.inspector) + '</td></tr>' +
      '</tbody></table></div>' +

      '<div class="card tight" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Brake performance</h3>' +
      '<div class="grid g4">' +
      stat('Service brake', (i.brake.service || 0) + '%', 'min 50%', (i.brake.service >= 50 ? 'ok' : 'bad')) +
      stat('Secondary', (i.brake.secondary || 0) + '%', 'min 25%', (i.brake.secondary >= 25 ? 'ok' : 'bad')) +
      stat('Parking', (i.brake.parking || 0) + '%', 'min 16%', (i.brake.parking >= 16 ? 'ok' : 'bad')) +
      stat('Method', i.brake.laden || '', i.brake.method || '') +
      '</div>' +
      (i.brake.photo ? '<img class="thumb" style="margin-top:10px;width:120px;height:120px" src="' + i.brake.photo + '" alt="brake printout">' : '') +
      '</div>' +

      '<div class="inline" style="margin-bottom:14px">' + pill('Wheel re torque ' + (i.retorque && i.retorque.done ? 'recorded' : 'not recorded'), i.retorque && i.retorque.done ? 'ok' : 'warn') +
      (i.retorque && i.retorque.at ? '<span class="muted sm">' + esc(WS.dateUK(i.retorque.at)) + '</span>' : '') + '</div>' +

      secs +

      '<div class="sep"></div><div class="grid g2">' + sig(i.sign.inspector, 'Inspected by') + sig(i.sign.declare, 'Roadworthiness declared by') + '</div>' +
      (i.lockedAt ? '<div class="inline" style="margin-top:12px">' + pill('Locked after sign off · ' + WS.whenUK(i.lockedAt), 'ok') +
        '<span class="muted sm">Kept on file for 15 months.</span></div>' : ''),
      null, null, 'wide', '<button class="btn alt" id="shBack">Back to the job card</button>');
    $('shBack').onclick = function () { closeModal(); jobCard(jobId); };
    document.querySelectorAll('.modal .isec .sh').forEach(function (h) {
      h.onclick = function () {
        var open = h.parentNode.dataset.open !== '0';
        h.parentNode.dataset.open = open ? '0' : '1';
        h.parentNode.querySelectorAll('.iitem').forEach(function (it) { it.style.display = open ? 'none' : ''; });
      };
    });
  }

  /* ---------------- invoices ---------------- */
  function createInvoice(j) {
    var q = WS.quoteJob(j);
    var n = 4100 + WS.state.invoices.length + 1;
    var inv = {
      id: 'i' + Date.now(), no: 'INV-' + n, jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId,
      date: WS.day(0), hours: q.hours, rate: q.rate, labour: q.labour, partsNet: q.partsNet,
      net: q.net, vat: q.vat, total: q.total, xeroExported: '', parts: (j.parts || []).slice()
    };
    WS.state.invoices.push(inv);
    j.invoiceId = inv.id;
    WS.audit(j, 'Office', 'Invoice ' + inv.no + ' raised, ' + WS.money(inv.total));
    WS.save();
    closeModal();
    WS.toast('Invoice ' + inv.no + ' raised for ' + WS.money(inv.total) + '.', 'ok');
    invoiceView(inv.id);
  }

  SCREENS.invoices = function () {
    var S = WS.state;
    var ready = S.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; });
    var list = S.invoices.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.no.localeCompare(a.no); });
    var pending = list.filter(function (i) { return !i.xeroExported; });

    var readyRows = ready.map(function (j) {
      var v = WS.vehicle(j.vehicleId), q = WS.quoteJob(j);
      return '<tr><td>' + vehLine(v) + '</td><td class="hide-sm">' + chip(j.type) + '</td>' +
        '<td class="mono hide-sm">' + esc(WS.dateShort(j.date)) + '</td>' +
        '<td class="num mono hide-sm">' + WS.hhmm(q.hours) + '</td>' +
        '<td class="num mono">' + WS.money(q.net) + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-mkinv="' + j.id + '">' +
        '<span class="hide-sm">Create invoice</span><span class="only-sm">Invoice</span></button></td></tr>';
    }).join('');

    var rows = list.map(function (i) {
      var v = WS.vehicle(i.vehicleId), o = WS.operator(i.operatorId) || {};
      return '<tr class="click" data-inv="' + i.id + '"><td class="b nowrap">' + esc(i.no) +
        '<div class="only-sm" style="margin-top:4px">' + (i.xeroExported ? pill('In Xero', 'ok') : pill('Not sent', 'warn')) + '</div></td>' +
        '<td>' + esc(o.name || '') + '<div class="muted sm">' + esc(v ? v.reg : '') + '</div></td>' +
        '<td class="mono hide-sm">' + esc(WS.dateShort(i.date)) + '</td>' +
        '<td class="num mono hide-sm">' + WS.money(i.net) + '</td>' +
        '<td class="num mono">' + WS.money(i.total) + '</td>' +
        '<td class="hide-sm">' + (i.xeroExported ? pill('Sent to Xero', 'ok') : pill('Not sent', 'warn')) + '</td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Invoices</h1><div class="sub">Labour from the clock ons, parts at cost plus ' + S.settings.markup + '%, VAT at ' + S.settings.vat + '%</div></div>' +
      '<div class="sp"><button class="btn" id="xeroBtn"' + (pending.length ? '' : ' disabled') + '>Export to Xero (' + pending.length + ')</button></div></div>' +

      (ready.length ? '<div class="card"><div class="ch"><h2>Ready to invoice</h2>' + pill(ready.length + ' job' + (ready.length > 1 ? 's' : ''), 'go') + '</div>' +
        '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th class="hide-sm">Job</th><th class="hide-sm">Date</th><th class="num hide-sm">Labour</th><th class="num">Net</th><th></th></tr></thead><tbody>' + readyRows + '</tbody></table></div></div>' : '') +

      '<div class="card tight"><div class="ch"><h2>All invoices</h2><div class="sp"><span class="muted sm">' + list.length + ' on file</span></div></div>' +
      (list.length ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Number</th><th>Operator</th><th class="hide-sm">Date</th><th class="num hide-sm">Net</th><th class="num">Total</th><th class="hide-sm">Xero</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">No invoices yet.</div>') + '</div>';
  };
  WIRE.invoices = function () {
    document.querySelectorAll('[data-mkinv]').forEach(function (b) {
      b.onclick = function () { createInvoice(WS.job(b.dataset.mkinv)); };
    });
    document.querySelectorAll('tr[data-inv]').forEach(function (tr) { tr.onclick = function () { invoiceView(tr.dataset.inv); }; });
    $('xeroBtn').onclick = exportXero;
  };

  function exportXero() {
    var pending = WS.state.invoices.filter(function (i) { return !i.xeroExported; });
    if (!pending.length) {
      WS.toast('Nothing new to send. Every invoice is already in Xero.', 'bad');
      return;
    }
    var head = ['*ContactName', 'EmailAddress', '*InvoiceNumber', 'Reference', '*InvoiceDate', '*DueDate', '*Description', '*Quantity', '*UnitAmount', '*AccountCode', '*TaxType', 'TrackingName1', 'TrackingOption1'];
    var rows = [head];
    pending.forEach(function (i) {
      var o = WS.operator(i.operatorId) || {}, v = WS.vehicle(i.vehicleId) || {}, j = WS.job(i.jobId) || {};
      var due = new Date(WS.parse(i.date).getTime() + 30 * 86400000);
      var dd = WS.iso(due);
      rows.push([o.name || '', o.email || '', i.no, v.reg + ' ' + (j.type || ''), i.date, dd,
        'Labour ' + (j.type || 'workshop') + ' ' + v.reg + ' (' + i.hours + ' hrs)', i.hours, i.rate, '200', '20% (VAT on Income)', 'Vehicle', v.reg]);
      (i.parts || []).forEach(function (p) {
        rows.push([o.name || '', o.email || '', i.no, v.reg + ' ' + (j.type || ''), i.date, dd,
          'Parts: ' + p.name, p.qty, Math.round(p.cost * (1 + WS.state.settings.markup / 100) * 100) / 100, '310', '20% (VAT on Income)', 'Vehicle', v.reg]);
      });
    });
    WS.download('xero-invoices-' + WS.day(0) + '.csv', WS.csv(rows));
    var stamp = WS.nowStamp();
    pending.forEach(function (i) { i.xeroExported = stamp; });
    WS.save();
    WS.toast(pending.length + ' invoice' + (pending.length > 1 ? 's' : '') + ' exported. They will not be sent again.', 'ok');
    render();
  }

  function invoiceView(id) {
    var i = WS.invoice(id), o = WS.operator(i.operatorId) || {}, v = WS.vehicle(i.vehicleId) || {}, j = WS.job(i.jobId) || {}, S = WS.state.settings;
    var lines = '<tr><td>Labour · ' + esc(j.type || 'workshop') + ' · ' + esc(v.reg) + '<div class="muted">' + i.hours + ' hours at ' + WS.money(i.rate) + '</div></td>' +
      '<td class="num">' + i.hours + '</td><td class="num">' + WS.money(i.rate) + '</td><td class="num">' + WS.money(i.labour) + '</td></tr>';
    (i.parts || []).forEach(function (p) {
      var each = Math.round(p.cost * (1 + S.markup / 100) * 100) / 100;
      lines += '<tr><td>' + esc(p.name) + '</td><td class="num">' + p.qty + '</td><td class="num">' + WS.money(each) + '</td><td class="num">' + WS.money(each * p.qty) + '</td></tr>';
    });

    modal('Invoice ' + i.no,
      '<div class="inv" id="invPrint">' +
      '<div class="ih"><div><h2>' + esc(S.name) + '</h2>' +
      '<div class="muted" style="font-size:12.5px;line-height:1.5;margin-top:4px">' + esc(S.address) + '<br>' + esc(S.phone) + ' · ' + esc(S.email) + '<br>VAT ' + esc(S.vatNo) + '</div></div>' +
      '<div class="n"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280">Invoice</div>' +
      '<div style="font-size:20px;font-weight:800">' + esc(i.no) + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Date ' + esc(WS.dateUK(i.date)) + '<br>Due ' + esc(WS.dateUK(WS.iso(new Date(WS.parse(i.date).getTime() + 30 * 86400000)))) + '</div></div></div>' +

      '<div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:6px">' +
      '<div><div style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7280">Bill to</div>' +
      '<div style="font-weight:700;margin-top:3px">' + esc(o.name || '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc(o.contact || '') + '<br>' + esc(o.email || '') + '</div></div>' +
      '<div><div style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7280">Vehicle</div>' +
      '<div style="font-weight:700;margin-top:3px">' + esc(v.reg || '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc((v.make || '') + ' ' + (v.model || '')) + '<br>Job ' + esc(j.no || '') + '</div></div></div>' +

      '<table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>' + lines + '</tbody></table>' +
      '<div class="tot"><div><span class="muted">Labour</span><span>' + WS.money(i.labour) + '</span></div>' +
      '<div><span class="muted">Parts</span><span>' + WS.money(i.partsNet) + '</span></div>' +
      '<div><span class="muted">Net</span><span>' + WS.money(i.net) + '</span></div>' +
      '<div><span class="muted">VAT at ' + S.vat + '%</span><span>' + WS.money(i.vat) + '</span></div>' +
      '<div class="g"><span>Total</span><span>' + WS.money(i.total) + '</span></div></div>' +
      '<div style="clear:both;padding-top:26px;font-size:11.5px;color:#6B7280;border-top:1px solid #EEF1F6;margin-top:24px">' +
      'Payment within 30 days. ' + esc(S.name) + ' · Operator licence ' + esc(S.opLicence) + '</div>' +
      '</div>',
      null, null, 'wide',
      '<button class="btn alt" id="invPrintBtn">Print or save as PDF</button>' +
      (i.xeroExported ? '<button class="btn alt" disabled>Already sent to Xero</button>' : '<button class="btn" id="invXero">Export to Xero</button>'));

    $('invPrintBtn').onclick = function () { window.print(); };
    if ($('invXero')) $('invXero').onclick = function () { closeModal(); exportXero(); };
  }

  /* ---------------- compliance planner ---------------- */
  SCREENS.compliance = function () {
    var items = WS.dueItems(183);
    var over = items.filter(function (i) { return i.st.days < 0; });
    var soon = items.filter(function (i) { return i.st.days >= 0 && i.st.days <= 14; });

    var months = [];
    for (var m = 0; m < 6; m++) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) });
    }
    var grid = WS.state.vehicles.map(function (v) {
      var cells = months.map(function (mo) {
        var hits = WS.DUE_KINDS.filter(function (k) {
          if (!v[k.key]) return false;
          var dt = WS.parse(v[k.key]);
          return dt.getFullYear() === mo.y && dt.getMonth() === mo.m;
        });
        return '<td>' + hits.map(function (k) {
          var st = WS.dueState(v[k.key]);
          return '<span class="chip ' + (st.cls || 'go') + '" title="' + esc(k.label + ' ' + WS.dateUK(v[k.key])) + '">' + esc(k.label === 'Laden brake test' ? 'Brake' : k.label === 'Tacho calibration' ? 'Tacho' : k.label) + '</span>';
        }).join(' ') + '</td>';
      }).join('');
      var overdueAny = WS.DUE_KINDS.some(function (k) { return v[k.key] && WS.dueState(v[k.key]).days < 0; });
      return '<tr class="click" data-veh="' + v.id + '"><td class="reg nowrap">' + esc(v.reg) + (overdueAny ? ' ' + pill('overdue', 'bad') : '') +
        '<div class="muted sm hide-sm">' + esc(v.type) + '</div></td>' + cells + '</tr>';
    }).join('');

    var listRows = items.slice(0, 25).map(function (i) {
      return '<tr><td class="reg">' + esc(i.vehicle.reg) + '</td>' +
        '<td class="hide-sm">' + esc((WS.operator(i.vehicle.operatorId) || {}).name || '') + '</td>' +
        '<td>' + chip(i.kind) + '</td>' +
        '<td class="mono nowrap hide-sm">' + esc(WS.dateShort(i.date)) + '</td>' +
        '<td class="nowrap"><span class="pill ' + i.st.cls + ' hide-sm">' + esc(i.st.label) + '</span>' +
        '<span class="pill ' + i.st.cls + ' only-sm">' + esc(i.st.short) + '</span></td>' +
        '<td class="nowrap"><button class="btn alt sm" data-remind="' + i.vehicle.id + '|' + esc(i.kind) + '">Remind</button>' +
        ' <button class="btn sm" data-bookdue="' + i.vehicle.id + '">Book</button></td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Compliance planner</h1><div class="sub">Six months ahead. PMI, annual test, laden brake test, tacho and LOLER.</div></div>' +
      '<div class="sp"><button class="btn alt" id="compCsv">Export CSV</button></div></div>' +

      '<div class="grid g3" style="margin-bottom:16px">' +
      stat('Overdue', over.length, 'needs booking now', over.length ? 'bad' : 'ok') +
      stat('Due within 14 days', soon.length, 'amber on the planner', soon.length ? 'warn' : 'ok') +
      stat('Items in the next 6 months', items.length, 'across ' + WS.state.vehicles.length + ' vehicles') +
      '</div>' +

      '<div class="card tight"><div class="ch"><h2>What is due</h2>' +
      '<div class="sp"><span class="muted sm">next ' + Math.min(25, items.length) + ' of ' + items.length + ', Export CSV for the lot</span></div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Reg</th><th class="hide-sm">Operator</th><th>Item</th><th class="hide-sm">Date</th><th>Status</th><th></th></tr></thead><tbody>' + listRows + '</tbody></table></div></div>' +

      '<div class="card tight"><div class="ch"><h2>Six month planner</h2>' +
      '<div class="sp"><span class="muted sm only-sm">scroll sideways</span></div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th>' + months.map(function (m) { return '<th>' + m.label + '</th>'; }).join('') + '</tr></thead><tbody>' + grid + '</tbody></table></div></div>';
  };
  WIRE.compliance = function () {
    document.querySelectorAll('[data-remind]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var p = b.dataset.remind.split('|'), v = WS.vehicle(p[0]), o = WS.operator(v.operatorId) || {};
        WS.toast('Reminder sent to ' + (o.contact || o.name) + ' about the ' + p[1] + ' on ' + v.reg + '.', 'ok');
      };
    });
    document.querySelectorAll('[data-bookdue]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var v = WS.vehicle(b.dataset.bookdue);
        bookinDraft = { op: v.operatorId, veh: v.id, type: 'PMI', date: WS.day(0) };
        go('bookin');
      };
    });
    document.querySelectorAll('tr[data-veh]').forEach(function (tr) { tr.onclick = function () { vehicleFile(tr.dataset.veh); }; });
    $('compCsv').onclick = function () {
      var rows = [['Reg', 'Operator', 'Vehicle', 'Item', 'Due date', 'Status']];
      WS.dueItems(183).forEach(function (i) {
        rows.push([i.vehicle.reg, (WS.operator(i.vehicle.operatorId) || {}).name || '', i.vehicle.make + ' ' + i.vehicle.model, i.kind, i.date, i.st.label]);
      });
      WS.download('compliance-planner-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Compliance planner exported.', 'ok');
    };
  };

  /* ---------------- timesheets ---------------- */
  SCREENS.timesheets = function () {
    var S = WS.state;
    var mon = WS.parse(WS.day(0));
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + tsWeek * 7);
    var days = [];
    for (var i = 0; i < 7; i++) { var d = new Date(mon); d.setDate(mon.getDate() + i); days.push(WS.iso(d)); }

    var byFitter = S.settings.fitters.map(function (f) {
      var cells = days.map(function (day) {
        var h = 0;
        S.jobs.forEach(function (j) {
          (j.clockOns || []).forEach(function (c) {
            if (c.fitterId !== f.id) return;
            if (String(c.start).slice(0, 10) !== day) return;
            var e = c.end ? new Date(c.end) : new Date();
            h += Math.max(0, (e - new Date(c.start)) / 3600000);
          });
        });
        return h;
      });
      var tot = cells.reduce(function (a, b) { return a + b; }, 0);
      return { f: f, cells: cells, tot: tot };
    });
    var grand = byFitter.reduce(function (a, b) { return a + b.tot; }, 0);

    var rows = byFitter.map(function (r) {
      return '<tr><td><div class="b">' + esc(r.f.name) + '</div><div class="muted sm">' + esc(r.f.role) + '</div></td>' +
        r.cells.map(function (h) { return '<td class="num mono">' + (h ? WS.hhmm(h) : '<span class="muted">—</span>') + '</td>'; }).join('') +
        '<td class="num mono b">' + WS.hhmm(r.tot) + '</td>' +
        '<td class="num mono hide-sm">' + WS.money(r.tot * S.settings.labourRate) + '</td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Timesheets</h1><div class="sub">Straight off the fitters\' clock ons. Replaces the paper sheets.</div></div>' +
      '<div class="sp"><button class="btn alt sm" id="tsPrev">◀ Previous</button>' +
      '<button class="btn alt sm" id="tsThis">This week</button>' +
      '<button class="btn alt sm" id="tsNext">Next ▶</button>' +
      '<button class="btn" id="tsCsv">Export CSV</button></div></div>' +

      '<div class="grid g3" style="margin-bottom:16px">' +
      stat('Week beginning', WS.dateShort(days[0]), 'to ' + WS.dateUK(days[6])) +
      stat('Hours clocked', WS.hhmm(grand), 'all fitters') +
      stat('Labour value', WS.money0(grand * S.settings.labourRate), 'at ' + WS.money(S.settings.labourRate) + '/hr') +
      '</div>' +

      '<div class="card tight"><div class="tablewrap"><table class="tbl"><thead><tr><th>Fitter</th>' +
      days.map(function (d) { return '<th class="num">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][WS.parse(d).getDay()] + '<div class="muted sm">' + WS.dateShort(d) + '</div></th>'; }).join('') +
      '<th class="num">Total</th><th class="num hide-sm">Value</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  };
  WIRE.timesheets = function () {
    $('tsPrev').onclick = function () { tsWeek--; render(); };
    $('tsNext').onclick = function () { tsWeek++; render(); };
    $('tsThis').onclick = function () { tsWeek = 0; render(); };
    $('tsCsv').onclick = function () {
      var S = WS.state, rows = [['Fitter', 'Date', 'Job', 'Vehicle', 'On', 'Off', 'Hours', 'Value']];
      S.jobs.forEach(function (j) {
        (j.clockOns || []).forEach(function (c) {
          var f = WS.fitter(c.fitterId) || {}, v = WS.vehicle(j.vehicleId) || {};
          var e = c.end ? new Date(c.end) : new Date();
          var h = Math.round(Math.max(0, (e - new Date(c.start)) / 3600000) * 100) / 100;
          rows.push([f.name || '', String(c.start).slice(0, 10), j.no, v.reg || '', WS.timeUK(c.start), c.end ? WS.timeUK(c.end) : 'running', h, Math.round(h * S.settings.labourRate * 100) / 100]);
        });
      });
      WS.download('timesheets-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Timesheets exported.', 'ok');
    };
  };

  /* ---------------- settings ---------------- */
  SCREENS.settings = function () {
    var S = WS.state.settings;
    var fitters = S.fitters.map(function (f, i) {
      return '<tr><td><input class="in" data-fname="' + i + '" value="' + esc(f.name) + '"></td>' +
        '<td><input class="in" data-frole="' + i + '" value="' + esc(f.role) + '"></td>' +
        '<td style="width:110px"><input class="in mono" data-fpin="' + i + '" value="' + esc(f.pin) + '" maxlength="4"></td>' +
        '<td><button class="btn alt sm" data-frm="' + i + '">Remove</button></td></tr>';
    }).join('');
    var tpl = WS.state.template.map(function (s) {
      return '<tr><td class="b">' + esc(s.name) + '</td><td class="num mono">' + s.items.length + '</td>' +
        '<td class="muted sm">' + esc(s.items.slice(0, 3).join(', ')) + ' and more</td></tr>';
    }).join('');

    return '<div class="phead"><div><h1>Settings</h1><div class="sub">What the workshop charges and who works here.</div></div></div>' +
      '<div class="grid g2" style="align-items:start">' +
      '<div class="card"><h2>Workshop</h2><div class="sep"></div>' +
      '<label class="f"><span class="lb">Name</span><input class="in" id="sName" value="' + esc(S.name) + '"></label>' +
      '<label class="f"><span class="lb">Address</span><input class="in" id="sAddr" value="' + esc(S.address) + '"></label>' +
      '<div class="row"><label class="f"><span class="lb">Phone</span><input class="in" id="sPhone" value="' + esc(S.phone) + '"></label>' +
      '<label class="f"><span class="lb">Email</span><input class="in" id="sEmail" value="' + esc(S.email) + '"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">VAT number</span><input class="in" id="sVatNo" value="' + esc(S.vatNo) + '"></label>' +
      '<label class="f"><span class="lb">Operator licence</span><input class="in" id="sOl" value="' + esc(S.opLicence) + '"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Labour rate (£/hr)</span><input class="in" id="sRate" type="number" value="' + S.labourRate + '"></label>' +
      '<label class="f"><span class="lb">Parts markup (%)</span><input class="in" id="sMarkup" type="number" value="' + S.markup + '"></label>' +
      '<label class="f"><span class="lb">VAT (%)</span><input class="in" id="sVat" type="number" value="' + S.vat + '"></label></div>' +
      '<label class="f"><span class="lb">Bays (one per line)</span><textarea class="in" id="sBays">' + esc(S.bays.join('\n')) + '</textarea></label>' +
      '<button class="btn" id="sSave">Save settings</button></div>' +

      '<div><div class="card"><div class="ch"><h2>Fitters</h2><div class="sp"><button class="btn alt sm" id="sAddF">Add a fitter</button></div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>PIN</th><th></th></tr></thead><tbody>' + fitters + '</tbody></table></div>' +
      '<div class="hint" style="margin-top:10px">These PINs log the fitters into the phone app.</div></div>' +

      '<div class="card"><h2>Inspection sheet template</h2>' +
      '<div class="hint" style="margin:6px 0 12px">The PMI sheet the fitters fill in, laid out to the DVSA Guide to Maintaining Roadworthiness.</div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Section</th><th class="num">Items</th><th>Covers</th></tr></thead><tbody>' + tpl + '</tbody></table></div></div>' +

      '<div class="card"><h2>Demo</h2><div class="hint" style="margin:6px 0 12px">Everything here lives in this browser only.</div>' +
      '<button class="btn alt" id="sReset">Reset the demo data</button></div>' +
      '</div></div>';
  };
  WIRE.settings = function () {
    var S = WS.state.settings;
    $('sSave').onclick = function () {
      S.name = $('sName').value.trim() || S.name;
      S.address = $('sAddr').value.trim();
      S.phone = $('sPhone').value.trim();
      S.email = $('sEmail').value.trim();
      S.vatNo = $('sVatNo').value.trim();
      S.opLicence = $('sOl').value.trim();
      S.labourRate = +$('sRate').value || S.labourRate;
      S.markup = +$('sMarkup').value || 0;
      S.vat = +$('sVat').value || 0;
      S.bays = $('sBays').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      WS.save();
      $('bizName').textContent = shortName(S.name);
      WS.toast('Settings saved.', 'ok');
      render();
    };
    document.querySelectorAll('[data-fname]').forEach(function (i) { i.onchange = function () { S.fitters[+i.dataset.fname].name = i.value; WS.save(); }; });
    document.querySelectorAll('[data-frole]').forEach(function (i) { i.onchange = function () { S.fitters[+i.dataset.frole].role = i.value; WS.save(); }; });
    document.querySelectorAll('[data-fpin]').forEach(function (i) {
      i.onchange = function () {
        var p = i.value.replace(/\D/g, '').slice(0, 4);
        if (p.length !== 4) { WS.toast('A fitter PIN is 4 digits.', 'bad'); render(); return; }
        S.fitters[+i.dataset.fpin].pin = p;
        WS.save();
        WS.toast('PIN updated.', 'ok');
      };
    });
    document.querySelectorAll('[data-frm]').forEach(function (b) {
      b.onclick = function () {
        var f = S.fitters[+b.dataset.frm];
        if (!confirm('Remove ' + f.name + '?')) return;
        S.fitters.splice(+b.dataset.frm, 1);
        WS.save();
        render();
      };
    });
    $('sAddF').onclick = function () {
      S.fitters.push({ id: 'f' + Date.now(), name: 'New fitter', role: 'Fitter', pin: String(1000 + Math.floor(Math.random() * 8999)) });
      WS.save();
      render();
    };
    $('sReset').onclick = function () {
      if (!confirm('Reset the demo back to the sample data?')) return;
      WS.reset();
      location.reload();
    };
  };

  /* ---------------- modal ---------------- */
  function modal(title, body, okLabel, onOk, cls, extraActions) {
    closeModal();
    var mask = WS.el('div', 'mask');
    mask.innerHTML = '<div class="modal ' + (cls || '') + '"><div class="mh"><h2>' + esc(title) + '</h2><button class="x" aria-label="Close">&times;</button></div>' +
      '<div class="mb">' + body + '</div>' +
      '<div class="mf noprint">' + (extraActions || '') +
      (okLabel ? '<button class="btn alt" data-close>Cancel</button><button class="btn" id="mOk">' + esc(okLabel) + '</button>' : '<button class="btn alt" data-close>Close</button>') +
      '</div></div>';
    document.body.appendChild(mask);
    document.body.style.overflow = 'hidden';
    mask.querySelector('.x').onclick = closeModal;
    mask.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
    mask.onclick = function (e) { if (e.target === mask) closeModal(); };
    if (okLabel) $('mOk').onclick = function () { if (onOk() !== false) closeModal(); };
    document.addEventListener('keydown', escClose);
    return mask;
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() {
    var m = document.querySelector('.mask');
    if (m) m.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escClose);
  }
  WS.modal = modal;
  WS.closeModal = closeModal;

  boot();
})();
