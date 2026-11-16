/* Customer portal. What the operator logs into: their vehicles, what is in the
   workshop, the extra work waiting on their OK, their inspection sheets and bills.
   Truckfile has nothing like this and AssetMinder's is read only. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var me = null, tab = 'home', pick = null, pinBuf = '';

  WS.initTheme();
  (function () {
    WS.load();
    WS.applyBrand();
    WS.banner();
    $('app').hidden = false;
    var hash = location.hash.replace('#', '');
    try { me = WS.operator(localStorage.getItem('wsDemo:op')) || null; } catch (e) { }
    if (hash && WS.operator(hash)) pick = hash;
    WS.watch();
    WS.onChange(function () { render(); });
    render();
  })();

  function render() {
    var v = $('pview');
    if (!me) { v.innerHTML = loginHtml(); wireLogin(); return; }
    v.innerHTML = shellHtml();
    wireShell();
    window.scrollTo(0, 0);
  }

  function signOut() {
    me = null; pick = null; pinBuf = ''; tab = 'home';
    try { localStorage.removeItem('wsDemo:op'); } catch (e) { }
    render();
  }

  /* ---------------- sign in ---------------- */
  function loginHtml() {
    var st = WS.state.settings;
    if (!pick) {
      return '<div style="padding:30px 2px 14px;text-align:center">' +
        WS.logoHtml('applogo') +
        '<h1 style="margin-bottom:5px">' + esc(WS.logoShowsName() ? 'Customer portal' : st.name) + '</h1>' +
        '<div class="muted sm" style="margin-bottom:24px">' + (WS.logoShowsName() ? '' : 'Customer portal. ') + 'Your vehicles, your paperwork, 24 hours a day.</div></div>' +
        '<div class="grid g2">' + WS.state.operators.map(function (o) {
          var waiting = WS.state.approvals.filter(function (a) { return a.operatorId === o.id && a.status === 'Sent'; }).length;
          return '<div class="fjob" data-pick="' + o.id + '"><div class="r1">' +
            '<span class="rg" style="font-size:16px">' + esc(o.name) + '</span>' +
            (waiting ? '<span class="pill warn right">' + waiting + ' to approve</span>' : '') + '</div>' +
            '<div class="mk">' + esc(o.contact) + ' · ' + WS.vehiclesOf(o.id).length + ' vehicles</div></div>';
        }).join('') + '</div>' +
        '<div class="card tight" style="margin-top:18px"><div class="hint"><b class="b">Demo PINs</b><br>' +
        WS.state.operators.map(function (o) { return esc(o.name) + ' · ' + esc(o.portalPin); }).join('<br>') + '</div></div>';
    }
    var o = WS.operator(pick);
    return '<div style="max-width:380px;margin:0 auto;padding:26px 2px 6px;text-align:center">' +
      '<h1 style="margin-bottom:4px">' + esc(o.name) + '</h1>' +
      '<div class="muted sm">Enter your 4 digit portal PIN</div>' +
      '<div class="pindots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (pinBuf.length > i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="lockerr" id="pErr"></div>' +
      '<div class="pinpad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button data-k="back">←</button><button data-k="0">0</button><button data-k="clear">✕</button></div>' +
      '<button class="btn alt block" id="pBack" style="margin-top:16px">Not us</button>' +
      '<div class="hint" style="margin-top:12px">Demo PIN is ' + esc(o.portalPin) + '</div></div>';
  }

  function wireLogin() {
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { pick = b.dataset.pick; pinBuf = ''; render(); };
    });
    if ($('pBack')) $('pBack').onclick = function () { pick = null; pinBuf = ''; location.hash = ''; render(); };
    document.querySelectorAll('.pinpad button').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k;
        if (k === 'back') pinBuf = pinBuf.slice(0, -1);
        else if (k === 'clear') pinBuf = '';
        else if (pinBuf.length < 4) pinBuf += k;
        if (pinBuf.length === 4) {
          var o = WS.operator(pick);
          if (o.portalPin === pinBuf) {
            me = o;
            try { localStorage.setItem('wsDemo:op', o.id); } catch (e) { }
            pick = null; pinBuf = '';
            render();
            return;
          }
          pinBuf = '';
          render();
          if ($('pErr')) $('pErr').textContent = 'That PIN is not right.';
          return;
        }
        render();
      };
    });
  }

  /* ---------------- the portal ---------------- */
  function myVehicles() { return WS.vehiclesOf(me.id); }
  function myJobs() {
    return WS.state.jobs.filter(function (j) { return j.operatorId === me.id; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
  }
  function myApprovals() {
    return WS.state.approvals.filter(function (a) { return a.operatorId === me.id; })
      .sort(function (a, b) { return String(b.raisedAt).localeCompare(String(a.raisedAt)); });
  }
  function myInvoices() {
    return WS.state.invoices.filter(function (i) { return i.operatorId === me.id; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
  }

  function shellHtml() {
    var st = WS.state.settings;
    var waiting = myApprovals().filter(function (a) { return a.status === 'Sent'; });
    var inShop = myJobs().filter(function (j) { return WS.OPEN_STATUSES.indexOf(j.status) >= 0; });
    var due = myVehicles().filter(function (v) {
      return WS.DUE_KINDS.some(function (k) { var d = WS.dueState(v[k.key]); return d && d.days <= 14; });
    });
    var unpaid = myInvoices().filter(function (i) { return !i.paid; });

    return '<div class="phero">' +
      '<div class="logo">' + esc(st.initials || 'NC') + '</div>' +
      '<div><div style="font-weight:800;font-size:18px">' + esc(me.name) + '</div>' +
      '<div class="muted sm">' + esc(st.name) + ' customer portal</div></div>' +
      '<div class="sp"><button class="btn alt sm" id="pOut">Sign out</button></div></div>' +

      (waiting.length ? '<div class="flagbox" style="margin-bottom:16px"><b>' + waiting.length +
        ' job' + (waiting.length > 1 ? 's are' : ' is') + ' waiting on your OK.</b> ' +
        'Nothing is being done to the vehicle until you answer.</div>' : '') +

      '<div class="grid g4" style="margin-bottom:16px">' +
      statBox('Waiting on you', waiting.length, waiting.length ? 'approve or decline' : 'nothing to do', waiting.length ? 'warn' : 'ok') +
      statBox('Jobs open with us', inShop.length, 'across your ' + myVehicles().length + ' vehicles') +
      statBox('Due in 14 days', due.length, 'PMI, test or LOLER', due.length ? 'warn' : 'ok') +
      statBox('Unpaid bills', WS.money0(unpaid.reduce(function (s, i) { return s + i.total; }, 0)), unpaid.length + ' invoices') +
      '</div>' +

      '<div class="ptab">' +
      [['home', 'Approvals', waiting.length], ['shop', 'In the workshop', inShop.length],
       ['veh', 'My vehicles', myVehicles().length], ['book', 'Book vehicles in', dueSoon().length || ''], ['docs', 'Inspection records', ''],
       ['bills', 'Invoices', myInvoices().length]].map(function (t) {
        return '<button data-pt="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] +
          (t[2] !== '' ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div>' +

      (tab === 'home' ? approvalsHtml()
        : tab === 'shop' ? shopHtml()
        : tab === 'veh' ? vehHtml()
        : tab === 'book' ? bookHtml()
        : tab === 'docs' ? docsHtml()
        : billsHtml());
  }

  /* ---------------- Book vehicles in ---------------- */
  var bk = { sel: {}, date: '', time: '08:00', done: null };
  var BK_TYPES = [['PMI', 'PMI'], ['MOT prep', 'MOT (annual test)'], ['LOLER', 'LOLER'], ['Service', 'Service'], ['Repair', 'Repair or defect'], ['Tyres', 'Tyres']];
  function dueOf(v, days) {
    var T = WS.day(0), lim = WS.isoAdd(T, days);
    return WS.DUE_KINDS.filter(function (k) { return v[k.key] && v[k.key] <= lim; })
      .map(function (k) { return { key: k.key, kind: WS.DUE_SHORT[k.key], date: v[k.key], u: WS.urgency(v[k.key]) }; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }
  function dueSoon() { return myVehicles().filter(function (v) { return dueOf(v, 30).length; }); }
  function need() {
    var ids = Object.keys(bk.sel);
    return ids.reduce(function (s2, id) { return s2 + WS.stdTime(bk.sel[id]); }, 0);
  }
  function bookHtml() {
    var T = WS.day(0), vs = myVehicles().slice().sort(function (a, b) {
      var da = dueOf(a, 60)[0], db = dueOf(b, 60)[0];
      return (da ? da.date : '9') .localeCompare(db ? db.date : '9') || a.reg.localeCompare(b.reg);
    });
    var picked = Object.keys(bk.sel).length, hrs = need();
    var html = '';
    if (bk.done) {
      html += '<div class="note" style="margin-bottom:14px" id="bkDone"><b>Booked.</b> ' + esc(bk.done) + ' The workshop can see it now.</div>';
    }
    html += '<div class="bk-steps">' +
      '<div class="card"><div class="ch"><h2>1. Pick the vehicles</h2></div><div class="hint" style="margin-bottom:10px">What is due in the next 60 days is shown under each one.</div><div class="bk-veh">' +
      vs.map(function (v) {
        var due = dueOf(v, 60), on = !!bk.sel[v.id];
        return '<label class="bk-v' + (on ? ' on' : '') + '"><input type="checkbox" data-bkv="' + v.id + '"' + (on ? ' checked' : '') + '>' +
          '<span class="bk-m"><span class="rg" style="font-size:15px">' + esc(v.reg) + '</span> <span class="muted sm">' + esc(v.make + ' ' + v.model) + '</span>' +
          '<span class="bk-due">' + (due.length ? due.map(function (x) {
            return '<span class="pill ' + (x.u || '') + '">' + esc(x.kind + ' ' + WS.parse(x.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '</span>';
          }).join('') : '<span class="muted sm">Nothing due soon</span>') + '</span>' +
          (on ? '<select class="in" data-bkt="' + v.id + '" aria-label="What for">' + BK_TYPES.map(function (t) {
            return '<option value="' + t[0] + '"' + (bk.sel[v.id] === t[0] ? ' selected' : '') + '>' + esc(t[1]) + '</option>';
          }).join('') + '</select>' : '') + '</span></label>';
      }).join('') + '</div></div>';

    // the next five weeks, Monday first
    var g0 = WS.weekStartOf(T), cells = '', lastMonth = '';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { cells += '<div class="dw">' + d + '</div>'; });
    for (var i = 0; i < 35; i++) {
      var d = WS.isoAdd(g0, i), cap = WS.dayCapacity(d), dt = WS.parse(d);
      var past = d <= T, full = !cap.closed && cap.free < Math.max(hrs, 1);
      var off = past || cap.closed || full;
      var lab = past ? '' : cap.closed ? 'Closed' : full ? 'Full' : cap.free >= cap.cap * 0.4 ? 'Room' : 'Filling up';
      var mon = dt.toLocaleDateString('en-GB', { month: 'short' });
      cells += '<button type="button" class="bk-d' + (bk.date === d ? ' on' : '') + (!off && cap.free < cap.cap * 0.4 ? ' mid' : '') + '" data-bkd="' + d + '"' + (off ? ' disabled' : '') +
        ' aria-label="' + esc(WS.dayLabel(d) + (lab ? ', ' + lab : '')) + '"><b>' + dt.getDate() + '</b>' +
        (mon !== lastMonth && dt.getDate() <= 7 ? '<i>' + mon + '</i>' : '<i>' + esc(lab) + '</i>') + (off ? '' : '<span class="dt"></span>') + '</button>';
      if (dt.getDate() <= 7) lastMonth = mon;
    }
    html += '<div><div class="card"><div class="ch"><h2>2. Pick a day</h2></div>' +
      '<div class="hint" style="margin-bottom:10px">Greyed out days are full or closed. ' + (picked ? 'Your ' + picked + ' vehicle' + (picked === 1 ? '' : 's') + ' need' + (picked === 1 ? 's' : '') + ' about ' + WS.dur(hrs) + ' of workshop time.' : 'Pick vehicles first to see the days with room for them.') + '</div>' +
      '<div class="bk-cal">' + cells + '</div></div>' +
      '<div class="card"><div class="ch"><h2>3. Drop off time</h2></div><div class="bk-times seg" role="radiogroup">' + WS.OPEN_TIMES.map(function (t) {
        return '<button type="button" role="radio" data-bkt2="' + t + '" aria-checked="' + (bk.time === t) + '"' + (bk.time === t ? ' class="on"' : '') + '>' + t + '</button>';
      }).join('') + '</div>' +
      '<div class="bk-sum">' + (picked && bk.date
        ? '<div class="hint" style="margin-bottom:10px" id="bkSum">' + picked + ' vehicle' + (picked === 1 ? '' : 's') + ' on ' + esc(WS.dayLabel(bk.date)) + ', drop off ' + bk.time + '.</div>'
        : '<div class="hint" style="margin-bottom:10px" id="bkSum">Pick at least one vehicle and a day.</div>') +
      '<button class="btn block lg" id="bkGo"' + (picked && bk.date ? '' : ' disabled') + '>Confirm booking</button></div></div></div></div>';
    return html;
  }
  function wireBook() {
    document.querySelectorAll('[data-bkv]').forEach(function (c) {
      c.onchange = function () {
        var v = WS.vehicle(c.dataset.bkv);
        if (c.checked) { var d = dueOf(v, 60)[0]; bk.sel[v.id] = d ? WS.DUE_JOB[d.key] : 'Service'; }
        else delete bk.sel[v.id];
        bk.done = null;
        // a day picked earlier may not have room any more
        if (bk.date) { var cap = WS.dayCapacity(bk.date); if (cap.free < need()) bk.date = ''; }
        render();
      };
    });
    document.querySelectorAll('[data-bkt]').forEach(function (s2) {
      s2.onclick = function (e) { e.stopPropagation(); };
      s2.onchange = function () { bk.sel[s2.dataset.bkt] = s2.value; render(); };
    });
    document.querySelectorAll('[data-bkd]').forEach(function (b) { b.onclick = function () { bk.date = b.dataset.bkd; bk.done = null; render(); }; });
    document.querySelectorAll('[data-bkt2]').forEach(function (b) { b.onclick = function () { bk.time = b.dataset.bkt2; render(); }; });
    var go = $('bkGo');
    if (go) go.onclick = function () {
      var ids = Object.keys(bk.sel);
      if (!ids.length || !bk.date) return;
      var jobs = WS.bookVehicles({
        operatorId: me.id, by: me.contact, date: bk.date, time: bk.time,
        items: ids.map(function (id) { return { vehicleId: id, type: bk.sel[id] }; })
      });
      bk.done = jobs.map(function (j) { var v = WS.vehicle(j.vehicleId); return (v ? v.reg : '') + ' for its ' + (WS.JOB_FOR[j.type] || j.type); }).join(', ') +
        ' on ' + WS.dayLabel(bk.date) + ', drop off ' + bk.time + '.';
      bk.sel = {}; bk.date = '';
      render();
      WS.toast('Booked in. The workshop has it.', 'ok');
    };
  }

  function statBox(k, v, f, cls) {
    return '<div class="stat" style="cursor:default"><div class="k">' + esc(k) + '</div>' +
      '<div class="v ' + (cls || '') + '">' + esc(String(v)) + '</div>' +
      '<div class="f">' + esc(f) + '</div></div>';
  }

  function approvalsHtml() {
    var list = myApprovals();
    if (!list.length) return '<div class="card">' + empty('Nothing has needed your OK.') + '</div>';
    return list.map(function (a) {
      var v = WS.vehicle(a.vehicleId), t = WS.approvalTotals(a);
      var open = a.status === 'Sent';
      return '<div class="appr ' + (a.status === 'Approved' ? 'done' : a.status === 'Declined' ? 'no' : '') + '">' +
        '<div class="ah"><div><h3>' + esc(a.title) + '</h3>' +
        '<div class="meta">' + esc(v ? v.reg + ' · ' + v.make + ' ' + v.model : '') + ' · found by ' + esc(a.raisedBy) + ' at ' + esc(WS.timeUK(a.raisedAt)) + '</div></div>' +
        '<div class="sp">' + '<span class="pill ' + (a.status === 'Approved' ? 'ok' : a.status === 'Declined' ? 'bad' : 'warn') + '">' +
        esc(open ? 'Needs your OK' : a.status) + '</span></div></div>' +
        '<div class="det">' + esc(a.detail) + '</div>' +
        ((a.photos || []).length ? '<div class="thumbs" style="margin-bottom:12px">' +
          a.photos.map(function (p) { return '<img class="thumb" src="' + p + '" alt="What the fitter found">'; }).join('') + '</div>'
          : '<div class="hint" style="margin-bottom:12px">The fitter did not attach a photo to this one.</div>') +
        '<div class="money">' +
        '<div><span>Extra labour, ' + WS.hrs(a.estHours) + ' at ' + WS.money(t.rate) + '</span><b>' + WS.money(t.labour) + '</b></div>' +
        (a.parts.length ? '<div><span>' + esc(a.parts.map(function (p) { return p.qty + ' x ' + p.name; }).join(', ')) + '</span><b>' + WS.money(t.parts) + '</b></div>' : '') +
        '<div><span>VAT</span><b>' + WS.money(t.vat) + '</b></div>' +
        '<div class="g"><span>Total</span><span>' + WS.money(t.total) + '</span></div></div>' +
        (open ? '<div class="big2" style="margin-top:14px">' +
          '<button class="bad" data-no="' + a.id + '">No, leave it</button>' +
          '<button class="ok" data-yes="' + a.id + '">Yes, do the work</button></div>'
          : '<div class="muted sm" style="margin-top:12px">' + esc(a.status) + ' at ' + esc(WS.whenUK(a.decidedAt)) + '</div>') +
        '</div>';
    }).join('');
  }

  function shopHtml() {
    var list = myJobs().filter(function (j) { return WS.OPEN_STATUSES.indexOf(j.status) >= 0; });
    if (!list.length) return '<div class="card">' + empty('None of your vehicles are with us at the moment.') + '</div>';
    return '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>What for</th>' +
      '<th class="hide-sm">Booked</th><th>Where it is up to</th></tr></thead><tbody>' +
      list.map(function (j) {
        var v = WS.vehicle(j.vehicleId);
        return '<tr><td><span class="reg">' + esc(v ? v.reg : '') + '</span>' +
          '<div class="muted sm">' + esc(v ? v.make + ' ' + v.model : '') + '</div></td>' +
          '<td>' + esc(j.type) + '</td>' +
          '<td class="hide-sm">' + esc(WS.dayName(j.date)) + '</td>' +
          '<td><span class="pill ' + WS.statusCls(j.status) + '">' + esc(WS.statusLabel(j.status)) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vehHtml() {
    return '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th class="hide-sm">Type</th>' +
      '<th>Next PMI</th><th>Annual test</th><th>Status</th></tr></thead><tbody>' +
      myVehicles().map(function (v) {
        var p = WS.dueState(v.nextPmi), a = WS.dueState(v.annualTest);
        return '<tr><td><span class="reg">' + esc(v.reg) + '</span>' +
          '<div class="muted sm">' + esc(v.make + ' ' + v.model) + '</div></td>' +
          '<td class="hide-sm">' + esc(v.type) + '</td>' +
          '<td>' + WS.dateShort(v.nextPmi) + (p ? ' <span class="pill ' + p.cls + '">' + esc(p.short) + '</span>' : '') + '</td>' +
          '<td>' + WS.dateShort(v.annualTest) + (a && a.days <= 30 ? ' <span class="pill ' + a.cls + '">' + esc(a.short) + '</span>' : '') + '</td>' +
          '<td>' + (v.vor ? '<span class="pill bad">off the road</span>' : '<span class="pill ok">in service</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function docsHtml() {
    var list = myJobs().filter(function (j) { return j.inspection && j.inspection.lockedAt; });
    return '<div class="note" style="margin-bottom:14px">Every safety inspection we have done on your vehicles, signed and locked. ' +
      'Kept for 15 months. If the DVSA ask, send them this.</div>' +
      (list.length ? '<div class="tablewrap"><table class="tbl"><thead><tr><th>Date</th><th>Vehicle</th>' +
        '<th class="hide-sm">Inspector</th><th>Defects</th><th></th></tr></thead><tbody>' +
        list.map(function (j) {
          var v = WS.vehicle(j.vehicleId);
          var d = (j.defects || []).length;
          return '<tr class="click" data-sheet="' + j.id + '"><td>' + WS.dateUK(j.date) + '</td>' +
            '<td><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
            '<td class="hide-sm">' + esc(j.inspection.sign.inspector.name) + '</td>' +
            '<td>' + (d ? '<span class="pill warn">' + d + '</span>' : '<span class="pill ok">none</span>') + '</td>' +
            '<td class="num"><span class="muted sm">Open ›</span></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="card">' + empty('No inspection sheets yet.') + '</div>');
  }

  function billsHtml() {
    var list = myInvoices();
    return '<div class="tablewrap"><table class="tbl"><thead><tr><th>Invoice</th><th class="hide-sm">Vehicle</th>' +
      '<th class="num">Total</th><th>Due</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (i) {
        var v = WS.vehicle(i.vehicleId);
        var late = !i.paid && WS.daysBetween(i.due, WS.day(0)) > 0;
        return '<tr class="click" data-inv="' + i.id + '"><td>' + esc(i.no) + '<div class="muted sm">' + WS.dateShort(i.date) + '</div></td>' +
          '<td class="hide-sm"><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
          '<td class="num b">' + WS.money(i.total) + '</td>' +
          '<td>' + (i.paid ? '<span class="pill ok">paid</span>' : late ? '<span class="pill bad">overdue</span>' : '<span class="pill">' + WS.dateShort(i.due) + '</span>') + '</td>' +
          '<td class="num">' + (i.paid ? '' : '<button class="btn sm" data-pay="' + i.id + '">Pay now</button>') + '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + empty('No invoices yet.') + '</td></tr>') +
      '</tbody></table></div>';
  }

  function empty(m) { return '<div class="empty">' + esc(m) + '</div>'; }

  function wireShell() {
    $('pOut').onclick = signOut;
    document.querySelectorAll('[data-pt]').forEach(function (b) {
      b.onclick = function () { tab = b.dataset.pt; render(); };
    });
    document.querySelectorAll('[data-yes]').forEach(function (b) {
      b.onclick = function () { decide(b.dataset.yes, true); };
    });
    document.querySelectorAll('[data-no]').forEach(function (b) {
      b.onclick = function () { decide(b.dataset.no, false); };
    });
    document.querySelectorAll('[data-sheet]').forEach(function (r) {
      r.onclick = function () { sheetView(r.dataset.sheet); };
    });
    document.querySelectorAll('[data-inv]').forEach(function (r) {
      r.onclick = function (e) { if (e.target.closest('button')) return; invoiceView(r.dataset.inv); };
    });
    document.querySelectorAll('[data-pay]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); pay(b.dataset.pay); };
    });
    if (tab === 'book') wireBook();
  }

  function decide(id, yes) {
    var a = WS.approval(id), j = WS.job(a.jobId), v = WS.vehicle(a.vehicleId);
    a.status = yes ? 'Approved' : 'Declined';
    a.decidedAt = WS.nowStamp();
    a.decidedBy = me.contact;
    if (j) {
      if (yes) {
        j.estHours = Math.round((j.estHours + a.estHours) * 100) / 100;
        (a.parts || []).forEach(function (p) { j.parts.push({ name: p.name, qty: p.qty, cost: p.cost }); });
        (j.tasks || []).push({ id: 't' + Date.now(), text: a.title, done: false });
        j.status = (j.clockOns || []).some(function (c) { return !c.end; }) ? 'in_progress' : 'in_bay';
      } else {
        j.status = (j.clockOns || []).some(function (c) { return !c.end; }) ? 'in_progress' : 'in_bay';
      }
      WS.audit(j, me.contact + ' (' + me.name + ')',
        (yes ? 'Approved' : 'Declined') + ' the extra work: ' + a.title);
    }
    WS.notify('Workshop', 'in app', (yes ? 'Extra work approved' : 'Extra work declined'),
      me.contact + ' at ' + me.name + ' ' + (yes ? 'approved' : 'declined') + ' ' + a.title +
      ' on ' + (v ? v.reg : '') + '.', yes ? 'ready' : 'defect');
    WS.save();
    render();
    WS.toast(yes
      ? 'Approved. The fitter has been told to carry on.'
      : 'Declined. The fitter will put it back together as it was.', yes ? 'ok' : '');
  }

  function pay(id) {
    var i = WS.invoice(id);
    var mask = WS.el('div', 'mask');
    mask.innerHTML = '<div class="modal"><div class="mh"><h2>Pay ' + esc(i.no) + '</h2><button class="x">&times;</button></div>' +
      '<div class="mb"><div class="money"><div><span>Amount</span><b>' + WS.money(i.total) + '</b></div>' +
      '<div class="g"><span>To pay now</span><span>' + WS.money(i.total) + '</span></div></div>' +
      '<div class="hint" style="margin-top:14px">In the real system this is a pay by link card page. ' +
      'The bill clears straight into Xero and the vehicle is released for collection. Nothing is charged in the demo.</div></div>' +
      '<div class="mf"><button class="btn alt" data-close>Cancel</button><button class="btn" id="payGo">Pay ' + WS.money(i.total) + '</button></div></div>';
    document.body.appendChild(mask);
    var close = function () { mask.remove(); };
    mask.querySelector('.x').onclick = close;
    mask.querySelector('[data-close]').onclick = close;
    mask.onclick = function (e) { if (e.target === mask) close(); };
    $('payGo').onclick = function () {
      i.paid = WS.nowStamp();
      WS.notify('Workshop', 'in app', 'Invoice paid', me.name + ' paid ' + i.no + ', ' + WS.money(i.total) + '.', 'ready');
      WS.save();
      close();
      render();
      WS.toast(i.no + ' paid. Thank you.', 'ok');
    };
  }

  function sheetView(jobId) {
    var j = WS.job(jobId), v = WS.vehicle(j.vehicleId), i = j.inspection;
    var body = '<div class="note" style="margin-bottom:14px"><b>Signed off and locked.</b> ' +
      'Inspected by ' + esc(i.sign.inspector.name) + ' on ' + esc(WS.dateUK(j.date)) + '. ' +
      'This record cannot be changed by anybody, including us.</div>' +
      '<div class="grid g3" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Service brake</div><div class="b" style="font-size:18px">' + i.brake.service + '%</div></div>' +
      '<div><div class="muted sm">Secondary</div><div class="b" style="font-size:18px">' + i.brake.secondary + '%</div></div>' +
      '<div><div class="muted sm">Parking</div><div class="b" style="font-size:18px">' + i.brake.parking + '%</div></div></div>' +
      i.sections.map(function (sec) {
        var bad = sec.items.filter(function (x) { return x.state === 'D'; }).length;
        return '<div class="isec"><div class="sh">' + esc(sec.name) +
          '<span class="cnt">' + (bad ? bad + ' defect' : 'all clear') + '</span></div>' +
          sec.items.filter(function (x) { return x.state === 'D'; }).map(function (x) {
            return '<div class="iitem"><div class="nm">' + esc(x.name) + '</div>' +
              '<span class="pill bad">Defect</span><div class="dnote">' + esc(x.note) +
              (x.rectBy ? '<div class="muted sm" style="margin-top:4px">Put right by ' + esc(x.rectBy) + '</div>' : '') + '</div></div>';
          }).join('') + '</div>';
      }).join('');
    pop('Safety inspection · ' + (v ? v.reg : ''), body);
  }

  function invoiceView(id) {
    var i = WS.invoice(id), v = WS.vehicle(i.vehicleId), st = WS.state.settings;
    var rc = WS.rateFor(i.operatorId);
    pop(i.no, '<div class="inv"><div class="ih"><div>' + (st.logo ? WS.logoHtml('inv-logo') : '') + '<h2' + (WS.logoShowsName() ? ' class="vh"' : '') + '>' + esc(st.name) + '</h2>' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">' + esc(st.address) + '<br>VAT ' + esc(st.vatNo) + '</div></div>' +
      '<div class="n"><div style="font-size:20px;font-weight:800">INVOICE</div>' +
      '<div style="font-weight:700;margin-top:4px">' + esc(i.no) + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">' + WS.dateUK(i.date) + '</div></div></div>' +
      '<table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
      '<tr><td>Workshop labour on ' + esc(v ? v.reg : '') + ', ' + WS.dur(i.hours) + '<div class="muted" style="font-size:11px">Qty in hours (decimal)</div></td><td style="text-align:right">' + WS.hrsDec(i.hours) + '</td>' +
      '<td style="text-align:right">' + WS.money(i.labour) + '</td></tr>' +
      (i.parts || []).map(function (p) {
        var unit = Math.round(p.cost * (1 + rc.markup / 100) * 100) / 100;
        return '<tr><td>' + esc(p.name) + '</td><td style="text-align:right">' + p.qty + '</td>' +
          '<td style="text-align:right">' + WS.money(unit * p.qty) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot"><div><span>Net</span><span>' + WS.money(i.net) + '</span></div>' +
      '<div><span>VAT</span><span>' + WS.money(i.vat) + '</span></div>' +
      '<div class="g"><span>Total</span><span>' + WS.money(i.total) + '</span></div></div></div>');
  }

  function pop(title, body) {
    var mask = WS.el('div', 'mask');
    mask.innerHTML = '<div class="modal wide"><div class="mh"><h2>' + esc(title) + '</h2><button class="x">&times;</button></div>' +
      '<div class="mb">' + body + '</div>' +
      '<div class="mf noprint"><button class="btn alt" data-close>Close</button>' +
      '<button class="btn" id="popPrint">Print</button></div></div>';
    document.body.appendChild(mask);
    var close = function () { mask.remove(); };
    mask.querySelector('.x').onclick = close;
    mask.querySelector('[data-close]').onclick = close;
    mask.onclick = function (e) { if (e.target === mask) close(); };
    $('popPrint').onclick = function () { window.print(); };
  }
})();
