/* Office screens, part 1: home, day planner, live view, board, book in,
   vehicles and the job card. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var pill = O.pill, chip = O.chip, stat = O.stat, vehLine = O.vehLine, head = O.head, empty = O.empty;

  /* ============================ home ============================ */
  S.home = function () {
    var T = WS.day(0), st = WS.state, today = WS.jobsOn(T);
    var inProg = today.filter(function (j) { return j.status === 'in_progress'; }).length;
    var waiting = st.jobs.filter(function (j) { return j.status === 'waiting_parts'; }).length;
    var ready = st.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }).length;
    var overduePmi = st.vehicles.filter(function (v) { var d = WS.dueState(v.nextPmi); return d && d.days <= 7; }).length;
    var vor = st.vehicles.filter(function (v) { return v.vor; }).length;
    var auth = st.approvals.filter(function (a) { return a.status === 'Sent'; }).length;

    var mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    var hrs = 0, rev = 0;
    st.jobs.forEach(function (j) { if (WS.parse(j.date) >= mStart) hrs += WS.hoursOn(j); });
    st.invoices.forEach(function (i) { if (WS.parse(i.date) >= mStart) rev += i.net; });

    /* the day at a glance, by fitter */
    var fit = st.settings.fitters.map(function (f) {
      var plan = WS.dayPlan(f.id, T);
      var planned = plan.reduce(function (s2, j) { return s2 + (j.estHours || 0); }, 0);
      var doneH = plan.filter(function (j) { return j.status === 'done' || j.status === 'qc'; })
        .reduce(function (s2, j) { return s2 + WS.hoursOn(j); }, 0);
      var live = plan.filter(function (j) { return j.status === 'in_progress'; })[0];
      return { f: f, planned: planned, doneH: doneH, live: live, n: plan.length };
    });

    var feed = (st.notifications || []).slice(0, 5).map(function (n) {
      var ic = n.kind === 'approval' ? 'warn' : n.kind === 'ready' ? 'ok' : 'go';
      return '<li><div class="ic ' + ic + '">' + (n.channel.indexOf('WhatsApp') >= 0 ? '◎' : n.channel === 'SMS' ? '✉' : '@') + '</div>' +
        '<div style="min-width:0"><div class="t">' + esc(n.subject) + '</div>' +
        '<div class="s">' + esc(n.to) + ' · ' + esc(n.channel) + '</div></div>' +
        '<div class="w">' + esc(WS.timeUK(n.at)) + '</div></li>';
    }).join('');

    var alerts = [];
    if (auth) alerts.push({ t: auth + ' job' + (auth > 1 ? 's' : '') + ' waiting on the customer to authorise extra work', go: 'approvals', cls: 'warn' });
    var dc = st.checks.filter(function (c) { return c.date === T && c.defects.length && !c.jobId; }).length;
    if (dc) alerts.push({ t: dc + ' driver defect report' + (dc > 1 ? 's' : '') + ' from this morning with no job card yet', go: 'checks', cls: 'bad' });
    var ls = WS.lowStock().length;
    if (ls) alerts.push({ t: ls + ' part' + (ls > 1 ? 's are' : ' is') + ' at or below the minimum stock level', go: 'stock', cls: 'warn' });
    var od = WS.dueItems(-1).length;
    if (od) alerts.push({ t: od + ' compliance item' + (od > 1 ? 's are' : ' is') + ' overdue across the fleet', go: 'compliance', cls: 'bad' });
    if (!WS.xeroOk()) alerts.push({ t: 'Xero is not connected yet, so invoices have to be exported by hand', go: 'settings', cls: 'go' });

    return head('Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'),
      WS.dayName(T) + ' · ' + today.length + ' jobs on the board',
      '<button class="btn alt" data-go="planner">Plan the day</button><button class="btn" data-go="bookin">Book a vehicle in</button>') +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('In today', today.length, inProg + ' being worked on', '', 'board') +
      stat('Waiting on parts', waiting, waiting ? 'chase the supplier' : 'nothing held up', waiting ? 'warn' : '', 'board') +
      stat('Ready to invoice', ready, ready ? 'worth ' + WS.money0(ready * 240) : 'all invoiced', ready ? 'ok' : '', 'invoices') +
      stat('Needs authorising', auth, auth ? 'customer has not replied' : 'nothing pending', auth ? 'warn' : '', 'approvals') +
      '</div>' +

      '<div class="grid g4" style="margin-bottom:18px">' +
      stat('PMIs due this week', overduePmi, 'next 7 days', overduePmi ? 'warn' : '', 'compliance') +
      stat('Off the road', vor, vor ? 'losing the operator money' : 'all running', vor ? 'bad' : 'ok', 'vehicles') +
      stat('Hours this month', WS.hrs(hrs), 'clocked by the fitters', '', 'timesheets') +
      stat('Invoiced this month', WS.money0(rev), 'before VAT', 'ok', 'invoices') +
      '</div>' +

      (alerts.length ? '<div class="card"><div class="ch"><h2>Needs you</h2></div>' +
        '<ul class="feed">' + alerts.map(function (a) {
          return '<li style="cursor:pointer" data-go="' + a.go + '"><div class="ic ' + a.cls + '">!</div>' +
            '<div><div class="t">' + esc(a.t) + '</div></div><div class="w">Open</div></li>';
        }).join('') + '</ul></div>' : '') +

      '<div class="card"><div class="ch"><h2>The day by fitter</h2><div class="sp">' +
      '<button class="btn alt sm" data-go="live">Live view</button>' +
      '<button class="btn alt sm" data-go="planner">Day planner</button></div></div>' +
      '<div class="grid g4">' + fit.map(function (x) {
        var pctDone = x.planned ? Math.round(x.doneH / x.planned * 100) : 0;
        var cls = x.planned > x.f.dayHours ? 'bad' : x.planned >= x.f.dayHours - 0.5 ? 'warn' : 'ok';
        return '<div class="k" style="background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:13px 14px">' +
          '<div style="display:flex;align-items:center;gap:9px">' +
          '<div class="av" style="width:28px;height:28px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800">' + esc(O.initials(x.f.name)) + '</div>' +
          '<div style="min-width:0"><div style="font-weight:700;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.f.name) + '</div>' +
          '<div class="muted sm">' + (x.live ? 'On ' + esc((WS.vehicle(x.live.vehicleId) || {}).reg || x.live.type) : x.n ? x.n + ' jobs today' : 'Nothing planned') + '</div></div></div>' +
          '<div class="cap"><i class="' + cls + '" style="width:' + Math.min(100, x.planned / x.f.dayHours * 100) + '%"></i></div>' +
          '<div class="muted sm" style="margin-top:6px">' + WS.hrs(x.planned) + ' planned of ' + x.f.dayHours + 'h · ' + pctDone + '% done</div>' +
          '</div>';
      }).join('') + '</div></div>' +

      '<div class="grid g2">' +
      '<div class="card"><div class="ch"><h2>Last messages out</h2><div class="sp"><button class="btn alt sm" data-go="alerts">All activity</button></div></div>' +
      (feed ? '<ul class="feed">' + feed + '</ul>' : empty('Nothing sent yet today.')) + '</div>' +
      '<div class="card"><div class="ch"><h2>Coming next</h2></div>' +
      '<div class="hint">Built and ready to switch on when you are:</div>' +
      '<ul class="feed" style="margin-top:8px">' +
      [['Telematics fault codes booking their own jobs', 'Read the fault off the vehicle and open a job card before it breaks down'],
       ['Pay by link on the invoice', 'Customer pays the bill before they collect'],
       ['Tyre and brake wear tracking', 'Predict the next change from the last three readings'],
       ['Multi site', 'Run a second workshop off the same system']].map(function (c) {
        return '<li><div class="ic go">+</div><div><div class="t">' + esc(c[0]) + '</div><div class="s">' + esc(c[1]) + '</div></div></li>';
      }).join('') + '</ul></div></div>';
  };
  W.home = function () { O.wireGo(); };

  /* ============================ day planner ============================ */
  S.planner = function () {
    var d = WS.day(O.planDay), st = WS.state, T = WS.day(0);
    var pool = WS.unplanned(d);
    var totalPlanned = 0, totalCap = 0;
    var cols = st.settings.fitters.map(function (f) {
      var plan = WS.dayPlan(f.id, d);
      var planned = plan.reduce(function (s2, j) { return s2 + (j.estHours || 0); }, 0);
      totalPlanned += planned; totalCap += f.dayHours;
      return { f: f, plan: plan, planned: planned };
    });
    var poolHours = pool.reduce(function (s2, j) { return s2 + (j.estHours || 0); }, 0);

    return head('Day planner', WS.dayName(d) + ' · tap a job to put it on a fitter, or drag it across on a laptop',
      '<button class="btn alt sm" id="pPrev">‹ Day before</button>' +
      '<button class="btn alt sm" id="pToday">Today</button>' +
      '<button class="btn alt sm" id="pNext">Day after ›</button>' +
      (totalPlanned ? '<button class="btn alt sm" id="pClearAll">Clear the day</button>' : '') +
      '<button class="btn" id="pAuto">Suggest a plan</button>') +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Work planned', WS.hrs(totalPlanned), 'across ' + cols.length + ' fitters') +
      stat('Hours available', WS.hrs(totalCap), st.settings.dayHours + 'h each') +
      stat('Spare capacity', WS.hrs(Math.max(0, totalCap - totalPlanned)), totalPlanned > totalCap ? 'the day is overbooked' : 'room for more work',
        totalPlanned > totalCap ? 'bad' : totalCap - totalPlanned > 4 ? 'warn' : 'ok') +
      stat('Not planned yet', pool.length, WS.hrs(poolHours) + ' of work', pool.length ? 'warn' : 'ok') +
      '</div>' +

      '<div class="card tight" style="margin-bottom:14px"><div class="legend">' +
      '<b style="color:var(--ink)">Standard times</b>' +
      Object.keys(st.settings.standardTimes).slice(0, 7).map(function (k) {
        return '<span class="tag">' + esc(k) + ' <b>' + WS.hrs(st.settings.standardTimes[k]) + '</b></span>';
      }).join('') +
      '<span class="right"><button class="btn alt sm" data-go="settings">Change these</button></span>' +
      '</div></div>' +

      '<div class="card" id="poolCard"><div class="ch"><h2>Waiting to be planned</h2>' +
      '<div class="sp">' + (pool.length ? chip(WS.hrs(poolHours) + ' of work', 'warn') : chip('all planned', 'ok')) + '</div></div>' +
      '<div class="pool" data-drop="pool">' +
      (pool.length ? '<div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">' +
        pool.map(function (j) { return pjob(j, true); }).join('') + '</div>'
        : '<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px">Everything booked in for this day has a fitter against it.</div>') +
      '</div></div>' +

      (O.suggest && O.suggest.day === d ? sugBar() : '') +

      '<div class="plan">' + cols.map(function (c) {
        var over = c.planned > c.f.dayHours;
        var cls = over ? 'over' : c.planned >= c.f.dayHours - 0.5 ? 'full' : 'ok';
        var barCls = over ? 'bad' : c.planned >= c.f.dayHours - 0.5 ? 'warn' : 'ok';
        var lunched = false;
        return '<div class="fcol" data-drop="' + c.f.id + '">' +
          '<div class="fh"><div class="n">' +
          '<div class="av">' + esc(O.initials(c.f.name)) + '</div>' +
          '<div style="min-width:0"><div class="nm">' + esc(c.f.name) + '</div><div class="ro">' + esc(c.f.role) + '</div></div>' +
          '<div class="sp"><div class="hh ' + cls + '">' + WS.hrs(c.planned) + '</div><div class="ro">of ' + c.f.dayHours + 'h</div></div>' +
          (c.plan.length ? '<button class="clr" data-clear="' + c.f.id + '" title="Clear this day">Clear</button>' : '') +
          '</div><div class="cap"><i class="' + barCls + '" style="width:' + Math.min(100, c.planned / c.f.dayHours * 100) + '%"></i></div></div>' +
          '<div class="fb">' +
          (c.plan.length ? c.plan.map(function (j, i) {
            var out = '';
            if (!lunched && j._planStart >= 12.5) { out += '<div class="lunch">Half hour break</div>'; lunched = true; }
            return out + pjob(j, false, i, c.plan.length);
          }).join('') : (sugFor(c.f.id).length ? '' : '<div class="fe">Nothing planned.<br>Drag a job over.</div>')) +
          sugFor(c.f.id).map(sugCard).join('') +
          (over ? '<div class="flagbox" style="margin:2px 0 8px">That is ' + WS.hrs(c.planned - c.f.dayHours) + ' more than ' + esc(c.f.name.split(' ')[0]) + ' has in the day.</div>' : '') +
          '</div></div>';
      }).join('') + '</div>';
  };

  function pjob(j, inPool, i, n) {
    var v = WS.vehicle(j.vehicleId), op = WS.operator(j.operatorId);
    var p = WS.jobProgress(j);
    var cls = j.status === 'done' || j.status === 'qc' ? 'ok'
      : j.status === 'in_progress' ? 'go'
      : j.status === 'waiting_parts' || j.status === 'waiting_auth' ? 'warn'
      : j.priority === 'high' ? 'bad' : '';
    return '<div class="pjob ' + cls + '" data-job="' + j.id + '">' +
      '<div class="t1">' +
      (inPool ? '' : '<span class="tm">' + WS.clockHM(j._planStart) + '</span>') +
      '<span class="rg">' + esc(v ? v.reg : j.type) + '</span>' +
      '<span class="es">' + WS.hrs(j.estHours) + '</span></div>' +
      '<div class="t2">' + (v ? esc(j.type) + (op ? ' · ' + esc(op.name) : '') : 'Internal work') + '</div>' +
      '<div class="t3">' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) +
      (j.priority === 'high' ? chip('urgent', 'bad') : '') +
      (j.source !== 'Office' ? chip(j.source, 'warn') : '') + '</div>' +
      (inPool ? '' : '<div class="hd">' +
        (i > 0 ? '<button data-up="' + j.id + '" title="Move up">▲</button>' : '') +
        (i < n - 1 ? '<button data-down="' + j.id + '" title="Move down">▼</button>' : '') +
        '<button data-un="' + j.id + '" title="Take off the day">✕</button></div>') +
      '</div>';
  }

  /* ---------- suggested plan ----------
     Reads the shop's own history: who is actually quicker at what, over how many
     jobs. It proposes, it never just does it. */
  function sugFor(fitterId) {
    if (!O.suggest) return [];
    return O.suggest.items.filter(function (x) { return x.fitterId === fitterId; });
  }

  function sugCard(x) {
    var j = WS.job(x.jobId), v = WS.vehicle(j.vehicleId);
    return '<div class="pjob sug" data-sug="' + j.id + '">' +
      '<div class="t1"><span class="tm">new</span>' +
      '<span class="rg">' + esc(v ? v.reg : j.type) + '</span>' +
      '<span class="es">' + WS.hrs(j.estHours) + '</span></div>' +
      '<div class="t2">' + esc(j.type) + '</div>' +
      '<div class="why">' + esc(x.reason) + '</div></div>';
  }

  function sugBar() {
    var n = O.suggest.items.length;
    if (!n) return '<div class="card tight sugbar"><b>Nothing left to suggest.</b> ' +
      '<span class="muted sm">Everything booked for this day already has a fitter.</span>' +
      '<span class="right"><button class="btn alt sm" id="pDiscard">Close</button></span></div>';
    return '<div class="card tight sugbar"><div class="inline">' +
      '<b>Suggested plan</b>' +
      '<span class="muted sm">' + n + ' job' + (n > 1 ? 's' : '') + ' placed by who is actually quickest at them. Nothing is saved until you apply it.</span>' +
      '<span class="right inline">' +
      '<button class="btn alt sm" id="pWhy">Why these?</button>' +
      '<button class="btn alt sm" id="pDiscard">Discard</button>' +
      '<button class="btn sm" id="pApply">Apply the plan</button></span></div></div>';
  }

  function buildSuggestion(day) {
    var stats = WS.fitterStats();
    var fitters = WS.state.settings.fitters;
    var load = {};
    fitters.forEach(function (f) { load[f.id] = WS.plannedHours(f.id, day); });
    var pool = WS.unplanned(day).slice().sort(function (a, b) {
      return (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0);
    });
    var items = [];
    pool.forEach(function (j) {
      var est = j.estHours || WS.stdTime(j.type);
      var able = fitters.filter(function (f) { return (f.skills || []).indexOf(j.type) >= 0; });
      if (!able.length) able = fitters;
      var scored = able.map(function (f) {
        var rec = WS.record(f.id, j.type, stats);
        return { f: f, rec: rec, free: Math.round((f.dayHours - load[f.id]) * 100) / 100 };
      });
      var bySpeed = function (a, b) {
        if (a.rec.known !== b.rec.known) return a.rec.known ? -1 : 1;
        if (Math.abs(a.rec.ratio - b.rec.ratio) > 0.04) return a.rec.ratio - b.rec.ratio;
        return b.free - a.free;
      };
      var fits = scored.filter(function (x) { return x.free >= est; });
      var use = (fits.length ? fits : scored).slice().sort(bySpeed)[0];
      if (!use) return;
      // the quickest hand at this job, whether or not he has the room
      var ideal = scored.slice().sort(bySpeed)[0];
      var first = use.f.name.split(' ')[0];
      var reason;
      if (!use.rec.known) {
        reason = 'Not enough history on ' + j.type + ' yet, so this is on spare time: ' + first + ' has ' + WS.hrs(use.free) + ' free.';
      } else if (use.rec.vsShop >= 5) {
        reason = first + ' is ' + use.rec.vsShop + '% quicker than the shop on ' + j.type + ', over ' + use.rec.n + ' jobs.';
      } else if (use.rec.vsShop <= -5) {
        reason = first + ' runs ' + Math.abs(use.rec.vsShop) + '% over on ' + j.type + ', but he is the one with the time.';
      } else {
        reason = first + ' works ' + j.type + ' to time, over ' + use.rec.n + ' jobs.';
      }
      // say out loud when a quicker pair of hands was passed over for want of time
      if (ideal && ideal.f.id !== use.f.id && ideal.rec.known && ideal.rec.vsShop >= 5) {
        reason = ideal.f.name.split(' ')[0] + ' is ' + ideal.rec.vsShop + '% quicker at ' + j.type +
          ' but has only ' + WS.hrs(Math.max(0, ideal.free)) + ' left, so ' + reason;
      }
      if (!fits.length) reason += ' Nobody has a clear gap, so this takes him over his ' + use.f.dayHours + ' hours.';
      load[use.f.id] += est;
      items.push({ jobId: j.id, fitterId: use.f.id, reason: reason, n: use.rec.n, known: use.rec.known });
    });
    return { day: day, items: items };
  }

  function whyModal() {
    var stats = WS.fitterStats();
    var types = {};
    O.suggest.items.forEach(function (x) { types[WS.job(x.jobId).type] = 1; });
    var body = '<div class="hint" style="margin-bottom:14px">Every finished job records the standard time against what was actually clocked. ' +
      'This is that history, by fitter, for the kinds of work being planned. Anything under ' + WS.MIN_SAMPLES +
      ' jobs is not treated as a pattern.</div>' +
      Object.keys(types).map(function (t) {
        var shop = stats.shop[t];
        return '<h3 style="margin:16px 0 8px">' + esc(t) + '<span class="muted sm" style="font-weight:500"> · shop average ' +
          (shop ? WS.hhmm(shop.avg) + ' over ' + shop.n + ' jobs' : 'no history') + '</span></h3>' +
          '<div class="tablewrap"><table class="tbl"><thead><tr><th>Fitter</th><th class="num">Jobs</th>' +
          '<th class="num">Average</th><th class="num">Against the shop</th></tr></thead><tbody>' +
          WS.state.settings.fitters.map(function (f) {
            var rec = WS.record(f.id, t, stats);
            if (!rec.n) return '';
            return '<tr><td>' + esc(f.name) + '</td><td class="num">' + rec.n + '</td>' +
              '<td class="num">' + WS.hhmm(rec.avg) + '</td>' +
              '<td class="num">' + (rec.known
                ? pill((rec.vsShop > 0 ? rec.vsShop + '% quicker' : rec.vsShop < 0 ? Math.abs(rec.vsShop) + '% slower' : 'to time'),
                       rec.vsShop >= 5 ? 'ok' : rec.vsShop <= -5 ? 'bad' : '')
                : '<span class="muted sm">too few to call</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).join('') +
      '<div class="note" style="margin-top:16px">It places the urgent jobs first, then picks whoever is quickest at that kind of work ' +
      'and still has room in the day. If nobody has room it says so on the card rather than quietly overbooking anyone.</div>';
    O.modal('Why these fitters', body, null, null, 'wide');
  }

  W.planner = function () {
    var d = WS.day(O.planDay);
    $('pPrev').onclick = function () { O.planDay--; O.suggest = null; O.render(); };
    $('pNext').onclick = function () { O.planDay++; O.suggest = null; O.render(); };
    $('pToday').onclick = function () { O.planDay = 0; O.suggest = null; O.render(); };
    $('pAuto').onclick = function () {
      O.suggest = buildSuggestion(d);
      O.render();
      if (!O.suggest.items.length) WS.toast('Everything on this day already has a fitter.');
    };
    var ca = $('pClearAll');
    if (ca) ca.onclick = function () {
      var all = WS.jobsOn(d).filter(function (j) { return j.fitterId && j.status !== 'done'; });
      var list = all.filter(WS.notStarted);
      var held = all.length - list.length;
      if (!list.length) {
        WS.toast(held ? 'Nothing to clear. The rest have been started.' : 'Nothing to clear.');
        return;
      }
      if (!confirm('Take ' + list.length + ' job' + (list.length > 1 ? 's' : '') + ' off the day? They go back to waiting to be planned.' +
        (held ? '\n\n' + held + ' job' + (held > 1 ? 's have' : ' has') + ' already been started and will stay put.' : ''))) return;
      list.forEach(function (j) {
        j.fitterId = ''; j.order = 99;
        WS.audit(j, 'Office', 'Taken off the day plan');
      });
      O.suggest = null;
      WS.save(); O.render();
      WS.toast(list.length + ' job' + (list.length > 1 ? 's' : '') + ' put back in the waiting list' +
        (held ? ', ' + held + ' left alone because they are under way.' : '.'), 'ok');
    };
    document.querySelectorAll('[data-clear]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var f = WS.fitter(b.dataset.clear);
        var mine = WS.dayPlan(f.id, d).filter(function (j) { return j.status !== 'done'; });
        var list = mine.filter(WS.notStarted);
        var held = mine.length - list.length;
        if (!list.length) {
          WS.toast(held ? f.name.split(' ')[0] + ' has started everything on his day.' : f.name.split(' ')[0] + ' has nothing to clear.');
          return;
        }
        if (!confirm('Clear ' + f.name + "'s day? " + list.length + ' job' + (list.length > 1 ? 's go' : ' goes') + ' back to waiting to be planned.' +
          (held ? '\n\n' + held + ' job' + (held > 1 ? 's are' : ' is') + ' already under way and will stay with him.' : ''))) return;
        list.forEach(function (j) {
          j.fitterId = ''; j.order = 99;
          WS.audit(j, 'Office', 'Taken off ' + f.name + "'s day");
        });
        O.suggest = null;
        WS.save(); O.render();
        WS.toast(f.name.split(' ')[0] + "'s day cleared" + (held ? ', bar the ' + held + ' under way.' : '.'), 'ok');
      };
    });
    var ap = $('pApply');
    if (ap) ap.onclick = function () {
      var n = 0;
      O.suggest.items.forEach(function (x) {
        var j = WS.job(x.jobId);
        if (!j || j.fitterId) return;
        j.fitterId = x.fitterId;
        j.order = WS.dayPlan(x.fitterId, d).length;
        if (!j.bay && j.type !== 'Roadside callout' && j.type !== 'Collection / delivery') {
          var taken = WS.jobsOn(d).filter(function (y) { return y.bay && y.id !== j.id && y.status !== 'done'; }).map(function (y) { return y.bay; });
          j.bay = WS.state.settings.bays.filter(function (b2) { return taken.indexOf(b2) < 0; })[0] || '';
        }
        WS.audit(j, 'Office', 'Planned to ' + WS.fitter(x.fitterId).name + ': ' + x.reason);
        n++;
      });
      O.suggest = null;
      WS.save(); O.render();
      WS.toast(n + ' job' + (n > 1 ? 's' : '') + ' put on the board. The reason is on each job card.', 'ok');
    };
    var dc = $('pDiscard');
    if (dc) dc.onclick = function () { O.suggest = null; O.render(); };
    var wy = $('pWhy');
    if (wy) wy.onclick = whyModal;

    document.querySelectorAll('[data-sug]').forEach(function (el) {
      el.onclick = function () { O.jobCard(el.dataset.sug); };
    });
    O.dragDrop('.pjob:not(.sug)', '[data-drop]',
      function (jobId, z) { assignFitter(jobId, z.dataset.drop === 'pool' ? '' : z.dataset.drop, d); },
      function (jobId) { O.jobCard(jobId); });
    document.querySelectorAll('[data-up]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); move(b.dataset.up, -1, d); }; });
    document.querySelectorAll('[data-down]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); move(b.dataset.down, 1, d); }; });
    document.querySelectorAll('[data-un]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); assignFitter(b.dataset.un, '', d); }; });
    O.wireGo();
  };

  function assignFitter(jobId, fitterId, day) {
    var j = WS.job(jobId);
    if (!j) return;
    if (j.fitterId === fitterId) return;
    if (!fitterId && !WS.notStarted(j)) {
      WS.toast('That one has been started, so it stays with ' + (WS.fitter(j.fitterId) || {}).name + '.', 'bad');
      O.render();
      return;
    }
    var f = WS.fitter(fitterId);
    if (fitterId) {
      j.order = WS.dayPlan(fitterId, day).length;
      j.fitterId = fitterId;
      if (!j.bay && j.type !== 'Roadside callout' && j.type !== 'Collection / delivery') {
        var taken = WS.jobsOn(day).filter(function (x) { return x.bay && x.id !== j.id && x.status !== 'done'; }).map(function (x) { return x.bay; });
        j.bay = WS.state.settings.bays.filter(function (b) { return taken.indexOf(b) < 0; })[0] || '';
      }
      WS.audit(j, 'Office', 'Planned to ' + f.name + ' for ' + WS.dayName(day));
      WS.toast(j.type + ' put on ' + f.name.split(' ')[0] + "'s day.", 'ok');
    } else {
      j.fitterId = ''; j.order = 99;
      WS.audit(j, 'Office', 'Taken off the day plan');
      WS.toast('Moved back to waiting to be planned.');
    }
    WS.save();
    O.render();
  }

  function move(jobId, dir, day) {
    var j = WS.job(jobId);
    var list = WS.dayPlan(j.fitterId, day);
    var i = list.indexOf(j), k = i + dir;
    if (k < 0 || k >= list.length) return;
    list.splice(i, 1);
    list.splice(k, 0, j);
    list.forEach(function (x, n) { x.order = n; });
    WS.save();
    O.render();
  }

  /* ============================ live view ============================ */
  S.live = function () {
    var T = WS.day(0), st = WS.state;
    var cols = st.settings.fitters.map(function (f) {
      var plan = WS.dayPlan(f.id, T);
      var live = plan.filter(function (j) { return (j.clockOns || []).some(function (c) { return !c.end; }); })[0] || null;
      var planned = plan.reduce(function (s2, j) { return s2 + (j.estHours || 0); }, 0);
      var worked = plan.reduce(function (s2, j) { return s2 + WS.hoursOn(j); }, 0);
      var doneN = plan.filter(function (j) { return j.status === 'done' || j.status === 'qc'; }).length;
      return { f: f, plan: plan, live: live, planned: planned, worked: worked, doneN: doneN };
    });
    var running = cols.filter(function (c) { return c.live; }).length;
    var over = 0;
    st.jobs.forEach(function (j) { if (j.date === T && WS.jobProgress(j).state === 'over') over++; });

    return head('Live view', 'Every fitter, what they are on and whether it is running to time',
      '<button class="btn alt sm" data-go="planner">Day planner</button>' +
      '<span class="tag" style="align-self:center">Updates by itself</span>') +

      '<div class="grid g4" style="margin-bottom:14px">' +
      stat('Clocked on now', running + ' of ' + cols.length, running ? 'spanners turning' : 'nobody on a job', running ? 'ok' : 'warn') +
      stat('Jobs done today', cols.reduce(function (s2, c) { return s2 + c.doneN; }, 0), 'out of ' + WS.jobsOn(T).length + ' on the board', 'ok') +
      stat('Hours clocked', WS.hrs(cols.reduce(function (s2, c) { return s2 + c.worked; }, 0)), 'of ' + WS.hrs(cols.reduce(function (s2, c) { return s2 + c.planned; }, 0)) + ' planned') +
      stat('Running over', over, over ? 'look at the red ones' : 'everything to time', over ? 'bad' : 'ok') +
      '</div>' +

      '<div class="card tight" style="margin-bottom:14px"><div class="legend">' +
      '<span><i class="ok"></i> inside the estimate</span>' +
      '<span><i class="warn"></i> nearly out of time</span>' +
      '<span><i class="bad"></i> over the estimate</span>' +
      '<span><i class="go"></i> on it now</span>' +
      '<span class="right">The mark on each bar is the standard time for that job.</span>' +
      '</div></div>' +

      '<div class="live">' + cols.map(function (c) {
        var lv = c.live ? WS.vehicle(c.live.vehicleId) : null;
        return '<div class="lcol' + (c.live ? ' on' : '') + '">' +
          '<div class="lhead' + (c.live ? ' go' : '') + '"><div class="n">' +
          '<div class="av">' + esc(O.initials(c.f.name)) + '</div>' +
          '<div style="min-width:0"><div class="nm">' + esc(c.f.name) + '</div>' +
          '<div class="st"><span class="bl"></span>' +
          (c.live ? 'On ' + esc(lv ? lv.reg : c.live.type) + ' · ' + esc(c.live.type) : c.plan.length ? 'Not clocked on' : 'Nothing planned') +
          '</div></div>' +
          '<div class="sp"><div class="big" ' + (c.live ? 'data-timer="' + c.live.id + '"' : '') + '>' +
          (c.live ? '00:00:00' : WS.hrs(c.worked)) + '</div>' +
          '<div class="ro muted sm">' + (c.live ? 'on this job' : 'clocked today') + '</div></div>' +
          '</div></div>' +
          (c.plan.length ? c.plan.map(function (j) { return lrow(j); }).join('') : '<div class="fe" style="padding:18px 12px">No jobs on the plan for today.</div>') +
          '<div class="lfoot"><span>' + c.doneN + ' of ' + c.plan.length + ' done</span>' +
          '<span class="sp">' + WS.hrs(c.worked) + ' / ' + WS.hrs(c.planned) + '</span></div>' +
          '</div>';
      }).join('') + '</div>';
  };

  function lrow(j) {
    var v = WS.vehicle(j.vehicleId), p = WS.jobProgress(j);
    var done = j.status === 'done' || j.status === 'qc';
    var cls = p.running ? 'now' : done ? (p.state === 'over' ? 'warn' : 'ok') : p.state === 'over' ? 'bad' : p.state === 'close' ? 'warn' : '';
    var ic = done ? '<div class="ic ok">✓</div>'
      : p.running ? '<div class="ic go">▶</div>'
      : j.status === 'waiting_parts' || j.status === 'waiting_auth' ? '<div class="ic warn">⏸</div>'
      : '<div class="ic">' + ((j.order || 0) + 1) + '</div>';
    var barCls = p.state === 'over' ? 'bad' : p.state === 'close' ? 'warn' : p.running ? '' : 'ok';
    var mark = p.est > 0 ? Math.min(99, 100 / Math.max(1, p.pct / 100 > 1.2 ? 1.2 : 1) ) : 100;
    var fill = Math.min(100, p.est ? (p.actual / (p.est * 1.2)) * 100 : 0);
    var markPos = 100 / 1.2;
    return '<div class="lrow ' + cls + '" data-job="' + j.id + '">' + ic +
      '<div class="bd"><div class="r1"><span class="rg">' + esc(v ? v.reg : j.type) + '</span>' +
      '<span class="ty">' + esc(v ? j.type : 'Internal') + '</span></div>' +
      '<div class="r2"><span>' + WS.clockHM(j._planStart || 0) + '</span>' +
      '<span>est <b>' + WS.hrs(p.est) + '</b></span>' +
      (p.actual ? '<span>run <b>' + WS.hhmm(p.actual) + '</b></span>' : '') +
      (done && p.over > 0.02 ? '<span class="ov">+' + WS.hhmm(p.over) + '</span>' : '') +
      (done && p.over <= 0.02 ? '<span class="un">to time</span>' : '') +
      (!done && p.state === 'over' ? '<span class="ov">over by ' + WS.hhmm(p.over) + '</span>' : '') +
      (j.status === 'waiting_parts' ? '<span class="ov">waiting on parts</span>' : '') +
      (j.status === 'waiting_auth' ? '<span class="ov">waiting on the customer</span>' : '') +
      '</div>' +
      '<div class="bar"><i class="' + barCls + '" style="width:' + fill + '%"></i><u style="left:' + markPos + '%"></u></div>' +
      '</div></div>';
  }

  W.live = function () {
    document.querySelectorAll('.lrow').forEach(function (r) { r.onclick = function () { O.jobCard(r.dataset.job); }; });
    O.paintTimers();
    O.wireGo();
  };
  O.paintTimers = function () {
    document.querySelectorAll('[data-timer]').forEach(function (el) {
      var j = WS.job(el.dataset.timer);
      if (!j) return;
      var c = (j.clockOns || []).filter(function (x) { return !x.end; })[0];
      if (!c) return;
      el.textContent = WS.hms(Date.now() - new Date(c.start).getTime());
    });
  };

  /* ============================ workshop board ============================ */
  S.board = function () {
    var T = WS.day(0), st = WS.state;
    var today = WS.jobsOn(T);
    var un = today.filter(function (j) { return !j.bay && j.status !== 'done'; });
    return head('Workshop board', WS.dayName(T) + ' · drag a vehicle into a bay',
      '<button class="btn alt" data-go="planner">Day planner</button><button class="btn" data-go="bookin">Book in</button>') +
      '<div class="board">' +
      '<div class="bay unassigned" data-bay=""><div class="bh"><div class="t">Waiting to go in</div>' +
      '<span class="right">' + chip(un.length + ' jobs') + '</span></div>' +
      un.map(jobCardHtml).join('') + (un.length ? '' : '<div class="fe">Nothing waiting.</div>') + '</div>' +
      st.settings.bays.map(function (b) {
        var inBay = today.filter(function (j) { return j.bay === b && j.status !== 'done'; });
        return '<div class="bay" data-bay="' + esc(b) + '"><div class="bh"><div class="t">' + esc(b) + '</div>' +
          '<span class="right">' + chip(inBay.length ? inBay.length + ' in' : 'free', inBay.length ? 'go' : 'ok') + '</span></div>' +
          inBay.map(jobCardHtml).join('') + (inBay.length ? '' : '<div class="fe">Free.</div>') + '</div>';
      }).join('') + '</div>';
  };

  function jobCardHtml(j) {
    var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId), f = WS.fitter(j.fitterId);
    var p = WS.jobProgress(j);
    return '<div class="jcard" data-job="' + j.id + '">' +
      '<div class="r1"><span class="rg">' + esc(v ? v.reg : j.type) + '</span>' + chip(j.type, 'go') + '</div>' +
      '<div class="op">' + esc(o ? o.name : 'Internal') + '</div>' +
      '<div class="r2">' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) +
      (f ? '<span class="muted sm">' + esc(f.name.split(' ')[0]) + '</span>' : '<span class="muted sm">no fitter</span>') +
      (p.state === 'over' ? chip('over time', 'bad') : '') + '</div></div>';
  }

  W.board = function () {
    O.dragDrop('.jcard', '.bay',
      function (jobId, z) { assignBay(jobId, z.dataset.bay); },
      function (jobId) { O.jobCard(jobId); });
    O.wireGo();
  };

  function assignBay(jobId, bay) {
    var j = WS.job(jobId);
    if (!j || j.bay === bay) return;
    j.bay = bay;
    if (bay && j.status === 'booked') j.status = 'in_bay';
    if (!bay && j.status === 'in_bay') j.status = 'booked';
    WS.audit(j, 'Office', bay ? 'Moved to ' + bay : 'Moved out of the bay');
    WS.save();
    O.render();
    WS.toast(bay ? 'Moved to ' + bay + '.' : 'Back on the waiting list.');
  }

  /* ============================ book in ============================ */
  S.bookin = function () {
    var st = WS.state, d = O.bookinDraft;
    var types = Object.keys(st.settings.standardTimes);
    return head('Book a vehicle in', 'Creates a job card, and puts it straight on a fitter if you pick one') +
      '<div class="card" style="max-width:720px">' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Operator</span><select class="in" id="bOp">' +
      '<option value="">Pick an operator</option>' + O.opts(st.operators, d.op, 'id', 'name') +
      '<option value="__new">+ Add a new operator</option></select></label>' +
      '<label class="f"><span class="lb">Vehicle</span><select class="in" id="bVeh"><option value="">Pick the operator first</option></select></label>' +
      '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Job type</span><select class="in" id="bType">' + O.opts(types, d.type || 'PMI') + '</select></label>' +
      '<label class="f"><span class="lb">How long should it take</span><input class="in" id="bEst" type="number" step="0.25" min="0.25" value="' + (d.est || 1.5) + '"></label>' +
      '<label class="f"><span class="lb">Date</span><input class="in" id="bDate" type="date" value="' + (d.date || WS.day(0)) + '"></label>' +
      '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Fitter</span><select class="in" id="bFit"><option value="">Leave it to be planned</option>' +
      O.opts(st.settings.fitters, d.fit, 'id', 'name') + '</select></label>' +
      '<label class="f"><span class="lb">Bay</span><select class="in" id="bBay"><option value="">No bay yet</option>' +
      O.opts(st.settings.bays, d.bay) + '</select></label>' +
      '<label class="f"><span class="lb">Priority</span><select class="in" id="bPri">' +
      '<option value="normal">Normal</option><option value="high">Urgent</option></select></label>' +
      '</div>' +
      '<label class="f"><span class="lb">Notes for the fitter</span><textarea class="in" id="bNotes" placeholder="What the driver reported, what to look at">' + esc(d.notes || '') + '</textarea></label>' +
      '<div id="bWarn"></div>' +
      '<div class="inline" style="margin-top:6px"><button class="btn lg" id="bGo">Create the job card</button>' +
      '<button class="btn alt" id="bClear">Clear</button></div>' +
      '</div>';
  };

  W.bookin = function () {
    var op = $('bOp'), veh = $('bVeh'), type = $('bType'), est = $('bEst');
    function fillVeh() {
      var list = op.value && op.value !== '__new' ? WS.vehiclesOf(op.value) : [];
      veh.innerHTML = list.length
        ? '<option value="">Pick a vehicle</option>' + list.map(function (v) {
          return '<option value="' + v.id + '"' + (O.bookinDraft.veh === v.id ? ' selected' : '') + '>' + esc(v.reg + ' · ' + v.make + ' ' + v.model) + '</option>';
        }).join('') + '<option value="__new">+ Add a new vehicle</option>'
        : '<option value="">Pick the operator first</option>';
      checkDue();
    }
    function checkDue() {
      var w = $('bWarn'); w.innerHTML = '';
      var v = WS.vehicle(veh.value);
      if (!v) return;
      var bits = [];
      WS.DUE_KINDS.forEach(function (k) {
        var st2 = WS.dueState(v[k.key]);
        if (st2 && st2.days <= 14) bits.push(k.label + ' ' + st2.label.toLowerCase());
      });
      var camp = WS.state.campaigns.filter(function (c) {
        return (c.applies.make && c.applies.make === v.make) || (c.applies.type && c.applies.type === v.type);
      }).filter(function (c) { return c.done.indexOf(v.id) < 0; });
      if (bits.length) w.innerHTML += '<div class="flagbox">While it is in: ' + esc(bits.join(', ')) + '.</div>';
      if (camp.length) w.innerHTML += '<div class="note" style="margin-top:8px"><b>Open campaign:</b> ' +
        camp.map(function (c) { return esc(c.ref + ' ' + c.title); }).join(', ') + '. Worth doing on the same visit.</div>';
    }
    op.onchange = function () {
      if (op.value === '__new') { op.value = ''; O.addOperator(); return; }
      O.bookinDraft.op = op.value; fillVeh();
    };
    veh.onchange = function () {
      if (veh.value === '__new') { veh.value = ''; O.addVehicle(op.value); return; }
      O.bookinDraft.veh = veh.value; checkDue();
    };
    type.onchange = function () { est.value = WS.stdTime(type.value); };
    fillVeh();

    $('bClear').onclick = function () { O.bookinDraft = {}; O.render(); };
    $('bGo').onclick = function () {
      var t = type.value, vId = veh.value;
      if (WS.NON_VEHICLE_TYPES.indexOf(t) < 0 && !vId) { WS.toast('Pick a vehicle first.', 'bad'); return; }
      var v = WS.vehicle(vId);
      var date = $('bDate').value || WS.day(0);
      var fit = $('bFit').value;
      var n = 1000 + WS.state.jobs.length + 1;
      var j = {
        id: WS.uid('j'), no: 'JC' + n,
        vehicleId: vId, operatorId: v ? v.operatorId : op.value,
        type: t, date: date, bay: $('bBay').value, fitterId: fit,
        estHours: parseFloat(est.value) || WS.stdTime(t),
        order: fit ? WS.dayPlan(fit, date).length : 99,
        priority: $('bPri').value, source: 'Office',
        status: $('bBay').value ? 'in_bay' : 'booked',
        tasks: (WS.JOB_TASKS[t] || []).map(function (x, i) { return { id: 't' + i, text: x, done: false }; }),
        notes: $('bNotes').value, parts: [], clockOns: [], photos: [],
        inspection: null, defects: [], qc: null, invoiceId: '',
        createdAt: WS.nowStamp(),
        audit: [{ at: WS.nowStamp(), who: 'Office', what: 'Job card created' }]
      };
      WS.state.jobs.push(j);
      WS.save();
      O.bookinDraft = {};
      WS.toast(j.no + ' created for ' + (v ? v.reg : t) + '.', 'ok');
      O.go(fit ? 'planner' : 'board');
    };
  };

  O.addOperator = function () {
    var m = O.modal('New operator',
      '<label class="f"><span class="lb">Business name</span><input class="in" id="nOp"></label>' +
      '<div class="row"><label class="f"><span class="lb">Contact</span><input class="in" id="nCon"></label>' +
      '<label class="f"><span class="lb">Phone</span><input class="in" id="nPh"></label></div>' +
      '<label class="f"><span class="lb">Email</span><input class="in" id="nEm" type="email"></label>' +
      '<div class="row"><label class="f"><span class="lb">Labour rate</span><input class="in" id="nRate" type="number" value="' + WS.state.settings.labourRate + '"></label>' +
      '<label class="f"><span class="lb">Parts markup %</span><input class="in" id="nMk" type="number" value="' + WS.state.settings.markup + '"></label>' +
      '<label class="f"><span class="lb">Payment terms (days)</span><input class="in" id="nTerms" type="number" value="30"></label></div>',
      'Add the operator', function () {
        var nm = $('nOp').value.trim();
        if (!nm) { WS.toast('Give the operator a name.', 'bad'); return; }
        var o = {
          id: WS.uid('o'), name: nm, contact: $('nCon').value, phone: $('nPh').value,
          email: $('nEm').value, trade: '', portalPin: String(7000 + WS.state.operators.length + 1),
          terms: parseInt($('nTerms').value, 10) || 30,
          labourRate: parseFloat($('nRate').value) || WS.state.settings.labourRate,
          discount: 0, markup: parseFloat($('nMk').value) || WS.state.settings.markup, creditLimit: 5000
        };
        WS.state.operators.push(o);
        WS.save();
        O.bookinDraft.op = o.id;
        O.closeModal();
        O.render();
        WS.toast(nm + ' added.', 'ok');
      });
    setTimeout(function () { $('nOp').focus(); }, 60);
    return m;
  };

  O.addVehicle = function (opId) {
    if (!opId) { WS.toast('Pick an operator first.', 'bad'); return; }
    O.modal('New vehicle',
      '<div class="row"><label class="f"><span class="lb">Registration</span><input class="in" id="nReg" style="text-transform:uppercase"></label>' +
      '<label class="f"><span class="lb">Type</span><select class="in" id="nType">' +
      O.opts(['Skip loader 18t', 'Skip loader 26t', 'Hook loader 32t', 'Tipper 32t', 'Tractor unit 44t', 'Rigid box 18t', 'Tipping trailer', 'Curtainsider trailer']) +
      '</select></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Make</span><input class="in" id="nMake"></label>' +
      '<label class="f"><span class="lb">Model</span><input class="in" id="nModel"></label>' +
      '<label class="f"><span class="lb">Odometer km</span><input class="in" id="nOdo" type="number" value="0"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">PMI every (weeks)</span><input class="in" id="nPmi" type="number" value="6"></label>' +
      '<label class="f"><span class="lb">Next PMI</span><input class="in" id="nNext" type="date" value="' + WS.day(14) + '"></label>' +
      '<label class="f"><span class="lb">Annual test</span><input class="in" id="nTest" type="date" value="' + WS.day(180) + '"></label></div>',
      'Add the vehicle', function () {
        var rg = $('nReg').value.trim().toUpperCase();
        if (!rg) { WS.toast('Give it a registration.', 'bad'); return; }
        var v = {
          id: WS.uid('v'), reg: rg, vin: '', make: $('nMake').value, model: $('nModel').value,
          year: new Date().getFullYear(), type: $('nType').value, operatorId: opId,
          odometer: parseInt($('nOdo').value, 10) || 0,
          pmiWeeks: parseInt($('nPmi').value, 10) || 6,
          lastPmi: '', nextPmi: $('nNext').value, annualTest: $('nTest').value,
          brakeTest: '', tacho: '', loler: '', vor: false, notes: '', docs: []
        };
        WS.state.vehicles.push(v);
        WS.save();
        O.bookinDraft.veh = v.id;
        O.closeModal();
        O.render();
        WS.toast(rg + ' added.', 'ok');
      });
    setTimeout(function () { $('nReg').focus(); }, 60);
  };

  /* ============================ vehicles ============================ */
  S.vehicles = function () {
    var st = WS.state, f = O.vehFilter;
    var list = st.vehicles.filter(function (v) {
      if (f.op && v.operatorId !== f.op) return false;
      if (f.type && v.type !== f.type) return false;
      if (f.vor === 'y' && !v.vor) return false;
      if (f.vor === 'd') { var d = WS.dueState(v.nextPmi); if (!d || d.days > 14) return false; }
      if (f.q) {
        var q = f.q.toLowerCase();
        if ((v.reg + ' ' + v.make + ' ' + v.model + ' ' + v.type).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var types = st.vehicles.map(function (v) { return v.type; }).filter(function (t, i, a) { return a.indexOf(t) === i; });

    return head('Vehicles', list.length + ' of ' + st.vehicles.length + ' vehicles',
      '<button class="btn alt sm" id="vExp">Export CSV</button>') +
      '<div class="card tight" style="margin-bottom:14px"><div class="row">' +
      '<input class="in" id="vQ" placeholder="Search reg, make or model" value="' + esc(f.q) + '">' +
      '<select class="in" id="vOp"><option value="">Every operator</option>' + O.opts(st.operators, f.op, 'id', 'name') + '</select>' +
      '<select class="in" id="vType"><option value="">Every type</option>' + O.opts(types, f.type) + '</select>' +
      '<select class="in" id="vVor"><option value="">Everything</option>' +
      '<option value="y"' + (f.vor === 'y' ? ' selected' : '') + '>Off the road</option>' +
      '<option value="d"' + (f.vor === 'd' ? ' selected' : '') + '>PMI due or overdue</option></select>' +
      '</div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr>' +
      '<th>Vehicle</th><th class="hide-sm">Type</th><th class="hide-sm">Operator</th>' +
      '<th class="num hide-sm">Odometer</th><th>Next PMI</th><th>Annual test</th><th></th>' +
      '</tr></thead><tbody>' +
      (list.length ? list.map(function (v) {
        var o = WS.operator(v.operatorId), p = WS.dueState(v.nextPmi), a = WS.dueState(v.annualTest);
        return '<tr class="click" data-veh="' + v.id + '">' +
          '<td><span class="reg">' + esc(v.reg) + '</span>' + (v.vor ? ' ' + chip('VOR', 'bad') : '') +
          '<div class="muted sm">' + esc(v.make + ' ' + v.model) + '</div></td>' +
          '<td class="hide-sm">' + esc(v.type) + '</td>' +
          '<td class="hide-sm">' + esc(o ? o.name : '') + '</td>' +
          '<td class="num hide-sm">' + (v.odometer ? v.odometer.toLocaleString('en-GB') : '-') + '</td>' +
          '<td>' + WS.dateShort(v.nextPmi) + (p ? ' ' + pill(p.short, p.cls) : '') + '</td>' +
          '<td>' + WS.dateShort(v.annualTest) + (a && a.days <= 30 ? ' ' + pill(a.short, a.cls) : '') + '</td>' +
          '<td class="num"><span class="muted sm">Open ›</span></td></tr>';
      }).join('') : '<tr><td colspan="7">' + empty('Nothing matches that.') + '</td></tr>') +
      '</tbody></table></div>';
  };

  W.vehicles = function () {
    var q = $('vQ');
    q.oninput = function () { O.vehFilter.q = q.value; var p = q.selectionStart; O.render(); var n = $('vQ'); n.focus(); n.setSelectionRange(p, p); };
    $('vOp').onchange = function () { O.vehFilter.op = this.value; O.render(); };
    $('vType').onchange = function () { O.vehFilter.type = this.value; O.render(); };
    $('vVor').onchange = function () { O.vehFilter.vor = this.value; O.render(); };
    document.querySelectorAll('[data-veh]').forEach(function (r) { r.onclick = function () { O.vehicleFile(r.dataset.veh); }; });
    $('vExp').onclick = function () {
      var rows = [['Reg', 'Make', 'Model', 'Type', 'Operator', 'Odometer', 'Next PMI', 'Annual test', 'Brake test', 'Tacho', 'LOLER', 'VOR']];
      WS.state.vehicles.forEach(function (v) {
        var o = WS.operator(v.operatorId);
        rows.push([v.reg, v.make, v.model, v.type, o ? o.name : '', v.odometer, v.nextPmi, v.annualTest, v.brakeTest, v.tacho, v.loler, v.vor ? 'Yes' : 'No']);
      });
      WS.download('vehicles-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Vehicle list downloaded.', 'ok');
    };
  };

  O.vehicleFile = function (id) {
    var v = WS.vehicle(id), o = WS.operator(v.operatorId);
    var jobs = WS.state.jobs.filter(function (j) { return j.vehicleId === id; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var camp = WS.state.campaigns.filter(function (c) {
      return ((c.applies.make && c.applies.make === v.make) || (c.applies.type && c.applies.type === v.type)) && c.done.indexOf(v.id) < 0;
    });
    var checks = WS.state.checks.filter(function (c) { return c.vehicleId === id; }).slice(-5).reverse();

    var body =
      '<div class="grid g2" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Operator</div><div class="b">' + esc(o ? o.name : '') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Make and model</div><div class="b">' + esc(v.make + ' ' + v.model + ' (' + v.year + ')') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Type</div><div class="b">' + esc(v.type) + '</div></div>' +
      '<div><div class="muted sm">VIN</div><div class="b mono">' + esc(v.vin || 'not recorded') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Odometer</div><div class="b">' + (v.odometer ? v.odometer.toLocaleString('en-GB') + ' km' : 'not recorded') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">PMI interval</div><div class="b">every ' + v.pmiWeeks + ' weeks</div></div>' +
      '</div>' +
      (v.vor ? '<div class="flagbox"><b>Off the road.</b> ' + esc(v.notes) + '</div>' : '') +
      (camp.length ? '<div class="note" style="margin-bottom:12px"><b>Open campaigns:</b> ' +
        camp.map(function (c) { return esc(c.ref + ' ' + c.title); }).join(' · ') + '</div>' : '') +

      '<h3 style="margin:16px 0 8px">Compliance dates</h3>' +
      '<div class="tablewrap"><table class="tbl"><tbody>' +
      WS.DUE_KINDS.map(function (k) {
        var d = v[k.key], st2 = WS.dueState(d);
        return '<tr><td>' + esc(k.label) + '</td><td>' + (d ? WS.dateUK(d) : '<span class="muted">not applicable</span>') + '</td>' +
          '<td class="num">' + (st2 ? pill(st2.label, st2.cls) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +

      '<h3 style="margin:18px 0 8px">Documents on file</h3>' +
      '<div class="tablewrap"><table class="tbl"><tbody>' +
      ((v.docs || []).length ? v.docs.map(function (d) {
        return '<tr><td>' + esc(d.name) + '</td><td class="num muted sm">uploaded ' + WS.dateUK(d.at) + '</td></tr>';
      }).join('') : '<tr><td>' + empty('No documents uploaded.') + '</td></tr>') + '</tbody></table></div>' +

      (checks.length ? '<h3 style="margin:18px 0 8px">Last driver checks</h3><ul class="feed">' +
        checks.map(function (c) {
          var dr = WS.driver(c.driverId);
          return '<li><div class="ic ' + (c.defects.length ? 'bad' : 'ok') + '">' + (c.defects.length ? '!' : '✓') + '</div>' +
            '<div><div class="t">' + esc(dr ? dr.name : 'Driver') + (c.defects.length ? ' reported ' + esc(c.defects[0].item) : ' · nil defect') + '</div>' +
            '<div class="s">' + esc(c.location || '') + '</div></div>' +
            '<div class="w">' + esc(WS.dateShort(c.date)) + '</div></li>';
        }).join('') + '</ul>' : '') +

      '<h3 style="margin:18px 0 8px">Job history</h3>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Date</th><th>Job</th><th class="hide-sm">Fitter</th><th>Status</th><th class="num">Hours</th></tr></thead><tbody>' +
      (jobs.length ? jobs.slice(0, 25).map(function (j) {
        var f = WS.fitter(j.fitterId);
        return '<tr class="click" data-vjob="' + j.id + '"><td>' + WS.dateShort(j.date) + '</td>' +
          '<td>' + esc(j.type) + '<div class="muted sm">' + esc(j.no) + '</div></td>' +
          '<td class="hide-sm">' + esc(f ? f.name : '') + '</td>' +
          '<td>' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) + '</td>' +
          '<td class="num">' + WS.hrs(WS.hoursOn(j)) + '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + empty('No jobs yet.') + '</td></tr>') +
      '</tbody></table></div>';

    var m = O.modal(v.reg + ' · ' + v.make + ' ' + v.model, body, v.vor ? 'Back on the road' : 'Mark off the road',
      function () {
        v.vor = !v.vor;
        if (!v.vor) v.notes = '';
        WS.save(); O.closeModal(); O.render();
        WS.toast(v.reg + (v.vor ? ' marked off the road.' : ' back on the road.'), v.vor ? 'bad' : 'ok');
      }, 'wide',
      '<button class="btn alt" id="vBook">Book it in</button>');
    m.querySelectorAll('[data-vjob]').forEach(function (r) { r.onclick = function () { O.jobCard(r.dataset.vjob); }; });
    $('vBook').onclick = function () {
      O.bookinDraft = { op: v.operatorId, veh: v.id, type: 'PMI', est: WS.stdTime('PMI') };
      O.closeModal(); O.go('bookin');
    };
  };
})();
