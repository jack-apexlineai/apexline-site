/* Customer portal. What the operator logs into: their vehicles, what is in the
   workshop, the extra work waiting on their OK, their inspection sheets and bills.
   Truckfile has nothing like this and AssetMinder's is read only. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var me = null, tab = 'fleet', pick = null, pinBuf = '', demoFor = '';

  WS.initTheme();
  (function () {
    WS.load();
    WS.applyBrand();
    WS.banner();
    $('app').hidden = false;
    var hash = location.hash.replace('#', '');
    try { me = WS.operator(localStorage.getItem('wsCBR:op')) || null; } catch (e) { }
    // opened from the office's Customer portal window: already signed in as that customer
    var dm = /[?&]demo=([a-z0-9]+)/i.exec(location.search);
    if (dm && WS.inDock && WS.operator(dm[1])) { demoFor = dm[1]; me = null; try { localStorage.removeItem('wsCBR:op'); } catch (e) { } }
    var as = /[?&]as=([a-z0-9]+)/i.exec(location.search);
    if (as && WS.inDock && WS.operator(as[1])) {
      me = WS.operator(as[1]); try { localStorage.setItem('wsCBR:op', me.id); } catch (e) { }
      // the Customer approves phone: open straight on what is waiting for their OK
      if (WS.state.approvals.some(function (a) { return a.operatorId === me.id && a.status === 'Sent'; })) tab = 'home';
    }
    if (hash && WS.operator(hash)) pick = hash;
    WS.watch();
    WS.onChange(function () {
      // live updates from the workshop, but never under someone who is typing into a form
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#pview')) return;
      render();
    });
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
    me = null; pick = null; pinBuf = ''; tab = 'fleet';
    try { localStorage.removeItem('wsCBR:op'); } catch (e) { }
    render();
  }

  /* ---------------- sign in ---------------- */
  function loginHtml() {
    var st = WS.state.settings;
    if (!pick) {
      return '<div style="padding:30px 2px 14px;text-align:center">' +
        WS.logoHtml('applogo') +
        '<h1 style="margin-bottom:5px">' + esc(WS.logoShowsName() ? 'Customer portal' : st.name) + '</h1>' +
        '<div class="muted sm" style="margin-bottom:22px">' + (WS.logoShowsName() ? '' : 'Customer portal. ') + 'Your fleet, your bookings and your paperwork, 24 hours a day.</div></div>' +
        '<form class="card pu-card" id="puForm" autocomplete="off" novalidate><h2 style="margin-bottom:12px">Sign in to your account</h2>' +
        '<label class="f"><span class="lb">Username</span><input class="in mono" id="puUser" placeholder="your company username" autocapitalize="none" spellcheck="false" value="' + (demoFor ? esc(portalUser(WS.operator(demoFor))) : '') + '"></label>' +
        '<div class="lockerr" id="puErr"></div>' +
        '<button class="btn block lg" id="puGo" type="submit">Continue</button></form>' +
        '<div class="muted sm" style="margin:20px 0 10px;text-align:center">Demo customers. Tap one to sign in as them.</div>' +
        '<div class="grid g2">' + WS.state.operators.map(function (o) {
          var waiting = WS.state.approvals.filter(function (a) { return a.operatorId === o.id && a.status === 'Sent'; }).length;
          return '<div class="fjob' + (o.id === demoFor ? ' sel' : '') + '" data-pick="' + o.id + '"><div class="r1">' +
            '<span class="rg" style="font-size:16px">' + esc(o.name) + '</span>' +
            (waiting ? '<span class="pill warn right">' + waiting + ' to approve</span>' : '') + '</div>' +
            '<div class="mk"><span class="mono">' + esc(portalUser(o)) + '</span> · PIN ' + esc(o.portalPin) + ' · ' + WS.vehiclesOf(o.id).length + ' vehicles</div></div>';
        }).join('') + '</div>';
    }
    var o = WS.operator(pick);
    return '<div style="max-width:380px;margin:0 auto;padding:26px 2px 6px;text-align:center">' +
      '<h1 style="margin-bottom:4px">' + esc(o.name) + '</h1>' +
      '<div class="muted sm">Signed in as <b class="mono">' + esc(portalUser(o)) + '</b>. ' + (pinBuf.length === 4 && o.id === demoFor ? 'PIN filled in for the demo, tap Sign in' : 'Enter your 4 digit PIN') + '</div>' +
      '<div class="pindots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (pinBuf.length > i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="lockerr" id="pErr"></div>' +
      (pinBuf.length === 4 ? '<button class="btn block lg" id="pSignIn" style="margin:2px 0 14px">Sign in</button>' : '') +
      '<div class="pinpad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button data-k="back">←</button><button data-k="0">0</button><button data-k="clear">✕</button></div>' +
      '<button class="btn alt block" id="pBack" style="margin-top:16px">Not us</button>' +
      '<div class="hint" style="margin-top:12px">Demo PIN is ' + esc(o.portalPin) + '</div></div>';
  }

  /* each customer signs in with their own username: the first word of the company name */
  function portalUser(o) { return o.portalUser || String(o.name || '').split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function wireLogin() {
    var f = $('puForm');
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var u = $('puUser').value.trim().toLowerCase();
      var o = WS.state.operators.filter(function (x) { return portalUser(x) === u; })[0];
      if (!u) { $('puErr').textContent = 'Put in your username.'; return; }
      if (!o) { $('puErr').textContent = 'We do not have an account called ' + u + '. Try saxby, or tap a demo customer below.'; return; }
      pick = o.id; pinBuf = o.id === demoFor ? o.portalPin : ''; render();
    };
    var si = $('pSignIn');
    if (si) si.onclick = function () {
      var o = WS.operator(pick);
      if (o && o.portalPin === pinBuf) { me = o; try { localStorage.setItem('wsCBR:op', o.id); } catch (e) { } pick = null; pinBuf = ''; tab = 'fleet'; render(); }
    };
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { pick = b.dataset.pick; pinBuf = pick === demoFor ? WS.operator(pick).portalPin : ''; render(); };
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
            try { localStorage.setItem('wsCBR:op', o.id); } catch (e) { }
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
      '<div class="ph-brand">' + WS.logoHtml('phlogo') + '<div class="muted sm">Customer portal</div></div>' +
      '<div class="ph-acct"><div class="ph-av">' + esc(String(me.name).charAt(0)) + '</div><div><div style="font-weight:800;font-size:17px">' + esc(me.name) + '</div>' +
      '<div class="muted sm">' + esc(me.contact) + ' · <span class="mono">' + esc(portalUser(me)) + '</span></div></div></div>' +
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
      [['fleet', 'My fleet', myVehicles().length], ['home', 'Approvals', waiting.length], ['shop', 'In the workshop', inShop.length],
       ['book', 'Book vehicles in', dueSoon().length || ''], ['repair', 'Report a repair', ''], ['docs', 'Inspection records', ''],
       ['bills', 'Invoices', myInvoices().length]].map(function (t) {
        return '<button data-pt="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] +
          (t[2] !== '' ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div>' +

      (tab === 'fleet' || tab === 'veh' ? fleetHtml()
        : tab === 'home' ? approvalsHtml()
        : tab === 'shop' ? shopHtml()
        : tab === 'veh' ? vehHtml()
        : tab === 'book' ? bookHtml()
        : tab === 'repair' ? repairHtml()
        : tab === 'docs' ? docsHtml()
        : billsHtml());
  }

  /* ---------------- My fleet: the account home ---------------- */
  function fleetHtml() {
    var open = myJobs().filter(function (j) { return WS.OPEN_STATUSES.indexOf(j.status) >= 0; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var vs = myVehicles().slice().sort(function (a, b) { return a.reg.localeCompare(b.reg); });
    var chip = function (v, k) {
      var d = v[k.key];
      if (!d) return '';
      var n = WS.daysBetween(WS.day(0), d), cls = n < 0 ? 'bad' : n <= 14 ? 'warn' : '';
      return '<span class="pill ' + cls + '" data-due="' + k.key + '" data-cls="' + cls + '">' + esc(WS.DUE_SHORT[k.key]) + ' ' +
        esc(WS.parse(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + (n < 0 ? ', overdue' : '') + '</span>';
    };
    return '<div class="pacts">' +
      '<button type="button" class="pact" data-pt="book"><b>Book vehicles in</b><span>See what is due and pick a day with room</span></button>' +
      '<button type="button" class="pact" data-pt="repair"><b>Report a repair</b><span>Tell us what is wrong and get an estimate</span></button></div>' +
      '<div class="card" id="pShopNow"><div class="ch"><h2>In the workshop now</h2></div>' +
      (open.length ? '<div class="pshop">' + open.map(function (j) {
        var v = WS.vehicle(j.vehicleId) || {};
        return '<div class="pshop-r" data-shop="' + j.id + '"><span class="rg">' + esc(v.reg || '') + '</span><span class="muted sm">' + esc(j.type) + ' · ' + esc(WS.dayName(j.date)) + (j.dropOff ? ', drop off ' + esc(j.dropOff) : '') + '</span>' +
          '<span class="pill ' + WS.statusCls(j.status) + ' right">' + esc(WS.statusLabel(j.status)) + '</span></div>';
      }).join('') + '</div>' : empty('Nothing of yours is in the workshop.')) + '</div>' +
      '<div class="card"><div class="ch"><h2>Your fleet</h2><div class="sp"><span class="muted sm">' + vs.length + ' vehicles</span></div></div>' +
      '<div class="pfleet">' + vs.map(function (v) {
        return '<div class="pfv" data-pfv="' + v.id + '"><div class="pfv-h"><span class="rg">' + esc(v.reg) + '</span>' + (v.vor ? '<span class="pill bad">off the road</span>' : '') +
          (v.needsCheck ? '<span class="pill">being checked</span>' : '') + '</div>' +
          '<div class="muted sm">' + esc((v.make + ' ' + v.model).trim() || 'Details to follow') + (v.type ? ' · ' + esc(v.type) : '') + '</div>' +
          '<div class="pfv-d">' + WS.DUE_KINDS.map(function (k) { return chip(v, k); }).join('') + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------------- Book vehicles in ---------------- */
  var bk = { sel: {}, date: '', time: '08:00', done: null, rep: {} };
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
  /* the next five weeks, Monday first: closed, past and full days greyed from the fitters' free hours */
  function dayCells(sel, hrs, attr) {
    var T = WS.day(0), g0 = WS.weekStartOf(T), cells = '', lastMonth = '';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { cells += '<div class="dw">' + d + '</div>'; });
    for (var i = 0; i < 35; i++) {
      var d = WS.isoAdd(g0, i), cap = WS.dayCapacity(d), dt = WS.parse(d);
      var past = d <= T, full = !cap.closed && cap.free < Math.max(hrs, 1);
      var off = past || cap.closed || full;
      var lab = past ? '' : cap.closed ? 'Closed' : full ? 'Full' : cap.free >= cap.cap * 0.4 ? 'Room' : 'Filling up';
      var mon = dt.toLocaleDateString('en-GB', { month: 'short' });
      cells += '<button type="button" class="bk-d' + (sel === d ? ' on' : '') + (!off && cap.free < cap.cap * 0.4 ? ' mid' : '') + '" data-' + attr + '="' + d + '"' + (off ? ' disabled' : '') +
        ' aria-label="' + esc(WS.dayLabel(d) + (lab ? ', ' + lab : '')) + '"><b>' + dt.getDate() + '</b>' +
        (mon !== lastMonth && dt.getDate() <= 7 ? '<i>' + mon + '</i>' : '<i>' + esc(lab) + '</i>') + (off ? '' : '<span class="dt"></span>') + '</button>';
      if (dt.getDate() <= 7) lastMonth = mon;
    }
    return cells;
  }
  function firstOpenDay(hrs) {
    var T = WS.day(0);
    for (var i = 1; i < 40; i++) {
      var d = WS.isoAdd(T, i), c = WS.dayCapacity(d);
      if (!c.closed && c.free >= Math.max(hrs, 1)) return d;
    }
    return '';
  }
  function chipsHtml(sel, attr, key) {
    return '<div class="rp-chips" role="group" aria-label="What is wrong">' + WS.REPAIR_CHIPS.map(function (c) {
      var on = sel.indexOf(c[0]) >= 0;
      return '<button type="button" class="rp-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-' + attr + '="' + (key ? key + '|' : '') + c[0] + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
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
          }).join('') + '</select>' : '') +
          (on && bk.sel[v.id] === 'Repair' ? '<span class="bk-rep">' + chipsHtml((bk.rep[v.id] || {}).chips || [], 'bkrc', v.id) +
            '<textarea class="in" data-bkrd="' + v.id + '" rows="2" placeholder="Describe it (optional)">' + esc((bk.rep[v.id] || {}).desc || '') + '</textarea></span>' : '') + '</span></label>';
      }).join('') + '</div></div>';

    var cells = dayCells(bk.date, hrs, 'bkd');
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
    document.querySelectorAll('[data-bkrc]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var p = b.dataset.bkrc.split('|'), r = bk.rep[p[0]] = bk.rep[p[0]] || { chips: [], desc: '' }, i = r.chips.indexOf(p[1]);
        if (i >= 0) r.chips.splice(i, 1); else r.chips.push(p[1]);
        render();
      };
    });
    document.querySelectorAll('[data-bkrd]').forEach(function (t) {
      t.onclick = function (e) { e.stopPropagation(); };
      t.oninput = function () { var r = bk.rep[t.dataset.bkrd] = bk.rep[t.dataset.bkrd] || { chips: [], desc: '' }; r.desc = t.value; };
    });
    document.querySelectorAll('[data-bkd]').forEach(function (b) { b.onclick = function () { bk.date = b.dataset.bkd; bk.done = null; render(); }; });
    document.querySelectorAll('[data-bkt2]').forEach(function (b) { b.onclick = function () { bk.time = b.dataset.bkt2; render(); }; });
    var go = $('bkGo');
    if (go) go.onclick = function () {
      var ids = Object.keys(bk.sel);
      if (!ids.length || !bk.date) return;
      var jobs = WS.bookVehicles({
        operatorId: me.id, by: me.contact, date: bk.date, time: bk.time,
        items: ids.map(function (id) {
          var r = bk.sel[id] === 'Repair' ? bk.rep[id] || {} : {};
          return { vehicleId: id, type: bk.sel[id], chips: r.chips || [], desc: r.desc || '' };
        })
      });
      bk.rep = {};
      bk.done = jobs.map(function (j) { var v = WS.vehicle(j.vehicleId); return (v ? v.reg : '') + ' for its ' + (WS.JOB_FOR[j.type] || j.type); }).join(', ') +
        ' on ' + WS.dayLabel(bk.date) + ', drop off ' + bk.time + '.';
      bk.sel = {}; bk.date = '';
      render();
      WS.toast('Booked in. The workshop has it.', 'ok');
    };
  }

  /* ---------------- Report a repair ---------------- */
  var rp = { vid: '', newReg: '', chips: [], desc: '', photos: [], drive: 'yes', date: '', time: '08:00', addr: '', who: '', urg: 'soon', done: null };
  function repairHtml() {
    var vs = myVehicles().slice().sort(function (a, b) { return a.reg.localeCompare(b.reg); });
    var hrs = WS.stdTime('Repair');
    if (rp.drive === 'yes' && (!rp.date || WS.dayCapacity(rp.date).free < hrs)) rp.date = firstOpenDay(hrs);
    if (!rp.who) rp.who = me.contact + (me.phone ? ', ' + me.phone : '');
    var html = '';
    if (rp.done) html += '<div class="note" style="margin-bottom:14px" id="rpDone"><b>Reported.</b> ' + esc(rp.done) + '. The workshop can see it now.</div>';
    var chosen = rp.vid === '__new' ? null : WS.vehicle(rp.vid);
    html += '<div class="bk-steps">' +
      '<div><div class="card"><div class="ch"><h2>1. Which lorry</h2></div>' +
      '<input class="in" id="rpQ" placeholder="Search by reg" autocomplete="off" style="margin-bottom:10px">' +
      '<div class="bk-veh rp-veh">' + vs.map(function (v) {
        var on = rp.vid === v.id;
        return '<button type="button" class="bk-v rp-v' + (on ? ' on' : '') + '" data-rpv="' + v.id + '" data-q="' + esc((v.reg + ' ' + v.make + ' ' + v.model).toLowerCase()) + '" aria-pressed="' + on + '">' +
          '<span class="rp-dot"></span><span class="bk-m"><span class="rg" style="font-size:15px">' + esc(v.reg) + '</span> <span class="muted sm">' + esc((v.make + ' ' + v.model).trim()) + '</span>' +
          (v.vor ? ' <span class="pill bad">off the road</span>' : '') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="rp-new"><div class="muted sm" style="margin-bottom:6px">Not on the list? Type the reg</div>' +
      '<div class="inline"><input class="in mono" id="rpNewReg" placeholder="KX19 ABC" value="' + esc(rp.newReg) + '" autocomplete="off" style="flex:1;text-transform:uppercase">' +
      '<button type="button" class="btn alt" id="rpNewAdd">Use this reg</button></div>' +
      (rp.vid === '__new' ? '<div class="hint" style="margin-top:6px" id="rpNewNote"><b>' + esc(rp.newReg) + '</b> will be added to your fleet. The workshop will check the details.</div>' : '') +
      '</div></div>' +
      '<div class="card"><div class="ch"><h2>2. What is wrong</h2></div>' + chipsHtml(rp.chips, 'rpc') +
      '<textarea class="in" id="rpDesc" rows="3" placeholder="Describe it in a few words" style="margin-top:12px">' + esc(rp.desc) + '</textarea>' +
      '<div class="inline" style="margin-top:10px;flex-wrap:wrap">' + rp.photos.map(function (ph) { return '<img class="thumb" src="' + ph + '" alt="photo">'; }).join('') +
      '<label class="btn alt sm" style="cursor:pointer">Add photos<input type="file" accept="image/*" capture="environment" multiple id="rpPh" hidden></label></div></div></div>' +

      '<div><div class="card"><div class="ch"><h2>3. Can it be driven in?</h2></div>' +
      '<div class="seg rp-seg" role="radiogroup" aria-label="Can it be driven in">' +
      [['yes', 'Yes, we will bring it'], ['no', 'No, it needs collecting']].map(function (x) {
        return '<button type="button" role="radio" data-rpd="' + x[0] + '" aria-checked="' + (rp.drive === x[0]) + '"' + (rp.drive === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>' +
      (rp.drive === 'yes'
        ? '<div class="hint" style="margin:12px 0 8px">The first day with room is picked for you. Greyed out days are full or closed.</div>' +
          '<div class="bk-cal">' + dayCells(rp.date, hrs, 'rpday') + '</div>' +
          '<div class="lb" style="margin:14px 0 6px">Drop off time</div><div class="bk-times seg" role="radiogroup">' + WS.OPEN_TIMES.map(function (t) {
            return '<button type="button" role="radio" data-rpt="' + t + '" aria-checked="' + (rp.time === t) + '"' + (rp.time === t ? ' class="on"' : '') + '>' + t + '</button>';
          }).join('') + '</div>'
        : '<label class="f" style="margin-top:12px"><span class="lb">Where is it</span><input class="in" id="rpAddr" placeholder="Address or where it has stopped" value="' + esc(rp.addr) + '"></label>' +
          '<label class="f"><span class="lb">Who should the workshop call</span><input class="in" id="rpWho" value="' + esc(rp.who) + '"></label>' +
          '<div class="hint">The workshop calls you back to arrange collection or recovery.</div>') +
      '</div>' +
      '<div class="card"><div class="ch"><h2>4. How urgent</h2></div><div class="seg rp-seg" role="radiogroup" aria-label="How urgent">' +
      [['vor', 'Off the road now'], ['soon', 'Soon'], ['next', 'Next visit']].map(function (x) {
        return '<button type="button" role="radio" data-rpu="' + x[0] + '" aria-checked="' + (rp.urg === x[0]) + '"' + (rp.urg === x[0] ? ' class="on' + (x[0] === 'vor' ? ' bad' : '') + '"' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="hint" id="rpSum" style="margin:14px 0 10px">' + esc(summary(chosen)) + '</div>' +
      estHtml() +
      '<div class="lockerr" id="rpErr"></div>' +
      '<button class="btn block lg" id="rpGo">Send it to the workshop</button></div></div></div>';
    return html;
  }
  function estHtml() {
    if (!rp.chips.length && !rp.desc.trim()) return '';
    var e = WS.repairEstimate(me.id, rp.chips);
    return '<div class="rp-est" id="rpEst"><div class="rp-est-k">Estimate</div><div class="rp-est-v">' + esc(WS.money0(e.low)) + ' to ' + esc(WS.money0(e.high)) + ' <span>+ VAT</span></div>' +
      '<div class="rp-est-n">' + esc(e.note) + '</div></div>';
  }
  function summary(v) {
    var reg = v ? v.reg : rp.vid === '__new' ? rp.newReg : 'Pick a lorry';
    return reg + (rp.chips.length || rp.desc ? ': ' + WS.repairConcern(rp.chips, rp.desc) : '') + '. ' +
      (rp.drive === 'yes' ? (rp.date ? 'Drop off ' + WS.dayLabel(rp.date) + ' ' + rp.time + '.' : 'Pick a day.') : 'Needs collecting, the workshop will call you.');
  }
  function wireRepair() {
    var q = $('rpQ');
    if (q) q.oninput = function () {
      var t = q.value.trim().toLowerCase().replace(/\s+/g, '');
      document.querySelectorAll('[data-rpv]').forEach(function (b) { b.hidden = !!t && b.dataset.q.replace(/\s+/g, '').indexOf(t) < 0; });
    };
    document.querySelectorAll('[data-rpv]').forEach(function (b) { b.onclick = function () { rp.vid = b.dataset.rpv; rp.newReg = ''; rp.done = null; render(); }; });
    $('rpNewAdd').onclick = function () {
      var r = $('rpNewReg').value.toUpperCase().replace(/\s+/g, ' ').trim();
      if (!/^[A-Z0-9 ]{2,9}$/.test(r)) { WS.toast('Type the registration, like KX19 ABC.', 'bad'); return; }
      var have = myVehicles().filter(function (v) { return v.reg.replace(/\s/g, '') === r.replace(/\s/g, ''); })[0];
      if (have) { rp.vid = have.id; rp.newReg = ''; } else { rp.vid = '__new'; rp.newReg = r; }
      render();
    };
    document.querySelectorAll('[data-rpc]').forEach(function (b) {
      b.onclick = function () { var i = rp.chips.indexOf(b.dataset.rpc); if (i >= 0) rp.chips.splice(i, 1); else rp.chips.push(b.dataset.rpc); render(); };
    });
    $('rpDesc').oninput = function () {
      var had = !!(rp.chips.length || rp.desc.trim());
      rp.desc = this.value;
      $('rpSum').textContent = summary(rp.vid === '__new' ? null : WS.vehicle(rp.vid));
      if (!had && rp.desc.trim()) { var e = $('rpSum'); e.insertAdjacentHTML('afterend', estHtml()); }
    };
    var ph = $('rpPh');
    if (ph) ph.onchange = function () {
      [].slice.call(ph.files || []).slice(0, 4).forEach(function (f) { WS.readPhoto(f, function (url) { if (url) { rp.photos.push(url); render(); } }); });
    };
    document.querySelectorAll('[data-rpd]').forEach(function (b) { b.onclick = function () { rp.drive = b.dataset.rpd; render(); }; });
    document.querySelectorAll('[data-rpday]').forEach(function (b) { b.onclick = function () { rp.date = b.dataset.rpday; render(); }; });
    document.querySelectorAll('[data-rpt]').forEach(function (b) { b.onclick = function () { rp.time = b.dataset.rpt; render(); }; });
    document.querySelectorAll('[data-rpu]').forEach(function (b) { b.onclick = function () { rp.urg = b.dataset.rpu; render(); }; });
    if ($('rpAddr')) $('rpAddr').oninput = function () { rp.addr = this.value; };
    if ($('rpWho')) $('rpWho').oninput = function () { rp.who = this.value; };
    $('rpGo').onclick = function () {
      var err = $('rpErr');
      if (!rp.vid) { err.textContent = 'Pick the lorry first, or type its reg.'; return; }
      if (!rp.chips.length && !rp.desc.trim()) { err.textContent = 'Say what is wrong: tap one or more, or describe it.'; return; }
      if (rp.drive === 'yes' && !rp.date) { err.textContent = 'Pick a day to bring it in.'; return; }
      if (rp.drive === 'no' && !rp.addr.trim()) { err.textContent = 'Say where it is so we can collect it.'; return; }
      var j = WS.reportRepair({
        operatorId: me.id, by: me.contact, vehicleId: rp.vid === '__new' ? '' : rp.vid, newReg: rp.newReg,
        chips: rp.chips.slice(), desc: rp.desc, photos: rp.photos.slice(), drive: rp.drive, date: rp.date, time: rp.time,
        addr: rp.addr, contact: rp.who, urgency: rp.urg
      });
      rp = { vid: '', newReg: '', chips: [], desc: '', photos: [], drive: 'yes', date: '', time: '08:00', addr: '', who: '', urg: 'soon', done: j.portalLine.replace(/^[^,]*? reported/, 'You reported') + '. ' + j.estimate.text + ', final price after inspection' };
      render();
      window.scrollTo(0, 0);
      WS.toast('Sent. The workshop has it.', 'ok');
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
    var list = myInvoices(), f = WS.customerFigures(me.id);
    var fig = function (k, v, sub) { return '<div class="cfig"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div>' + (sub ? '<div class="f">' + esc(sub) + '</div>' : '') + '</div>'; };
    return '<div class="cfigs" id="pFigs">' + fig('Invoiced this year', WS.money0(f.invoiced)) + fig('Paid', WS.money0(f.paid)) +
      fig('Owed', WS.owedText(f), WS.lateText(f)) + fig('Pending estimates', WS.estText(f), f.estN ? 'nothing done over an estimate without your OK' : '') + '</div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Invoice</th><th class="hide-sm">Vehicle</th>' +
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
    if (tab === 'repair') wireRepair();
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
      '<div class="hint" style="margin-top:14px">Card payment by link is an option we can add with your payment provider. ' +
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
