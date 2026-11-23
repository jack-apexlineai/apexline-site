/* Customers: every operator the workshop bills, as a plain table of figures from the live demo
   data, and a page per customer. Words and numbers only on the money columns, no traffic light
   colours. Money in is inc VAT, the same as Money's "Owed to us"; pending work is before VAT. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;

  // its own place in the menu, under Money and people, first
  for (var i = 0; i < O.NAV.length; i++) {
    if (O.NAV[i].g === 'Money and people') { O.NAV.splice(i + 1, 0, { id: 'customers', name: 'Customers', icon: '◎' }); break; }
  }
  O.customerId = '';

  function nextText(f) {
    if (!f.next) return 'Nothing booked';
    var n = WS.daysBetween(WS.day(0), f.next.date);
    return f.next.kind + ' on ' + f.next.reg + ', ' + WS.dateShort(f.next.date) + (n < 0 ? ', overdue' : '');
  }
  function lastText(f) { return f.last ? WS.dayName(f.last) : 'No visits yet'; }

  S.customers = function () {
    if (O.customerId && WS.operator(O.customerId)) return customerPage(O.customerId);
    O.customerId = '';
    var ops = WS.state.operators.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var T = { vehicles: 0, invoiced: 0, paid: 0, owed: 0, owedN: 0, late30: 0, late: 0, pending: 0, pendingN: 0, estN: 0, estLow: 0, estHigh: 0 };
    var rows = ops.map(function (o) {
      var f = WS.customerFigures(o.id);
      Object.keys(T).forEach(function (k) { T[k] += f[k] || 0; });
      return '<tr class="click" data-cust="' + o.id + '">' +
        '<td><b>' + esc(o.name) + '</b><div class="muted sm">' + esc(o.trade || '') + '</div></td>' +
        '<td>' + esc(o.contact) + '<div class="muted sm">' + esc(o.phone) + '</div></td>' +
        '<td class="num">' + f.vehicles + '</td>' +
        '<td class="num">' + WS.money0(f.invoiced) + '</td>' +
        '<td class="num">' + WS.money0(f.paid) + '</td>' +
        '<td class="num" data-owed="' + f.owed + '">' + esc(WS.owedText(f)) + (WS.lateText(f) ? '<div class="muted sm">' + esc(WS.lateText(f)) + '</div>' : '') + '</td>' +
        '<td class="num" data-pending="' + f.pending + '">' + (f.pendingN ? WS.money0(f.pending) + '<div class="muted sm">' + f.pendingN + ' job' + (f.pendingN === 1 ? '' : 's') + '</div>' : 'None') + '</td>' +
        '<td class="num" data-est="' + f.estN + '">' + esc(WS.estText(f)) + '</td>' +
        '<td>' + esc(nextText(f)) + '</td>' +
        '<td>' + esc(lastText(f)) + '</td></tr>';
    }).join('');
    var tot = '<tr class="ctot"><td><b>All customers</b></td><td></td><td class="num">' + T.vehicles + '</td>' +
      '<td class="num" data-tot="invoiced">' + WS.money0(T.invoiced) + '</td><td class="num">' + WS.money0(T.paid) + '</td>' +
      '<td class="num" data-tot="owed">' + esc(WS.owedText(T)) + (T.late30 ? '<div class="muted sm">' + WS.money0(T.late30) + ' over 30 days</div>' : '') + '</td>' +
      '<td class="num" data-tot="pending">' + WS.money0(T.pending) + '<div class="muted sm">' + T.pendingN + ' jobs</div></td>' +
      '<td class="num">' + esc(WS.estText(T)) + '</td><td></td><td></td></tr>';
    return O.head('Customers', 'Every operator you bill, from the live figures. Money is inc VAT, pending work is before VAT.') +
      '<div class="card"><div class="tablewrap"><table class="tbl ctbl"><thead><tr>' +
      '<th>Customer</th><th>Contact</th><th class="num">Vehicles</th><th class="num">Invoiced this year</th><th class="num">Paid</th>' +
      '<th class="num">Owed</th><th class="num">Pending, not invoiced</th><th class="num">Pending estimates</th><th>Next due</th><th>Last visit</th>' +
      '</tr></thead><tbody>' + rows + '</tbody><tfoot>' + tot + '</tfoot></table></div></div>';
  };

  function customerPage(id) {
    var o = WS.operator(id), f = WS.customerFigures(id), st = WS.state, T = WS.day(0);
    var vs = WS.vehiclesOf(id).slice().sort(function (a, b) { return a.reg.localeCompare(b.reg); });
    var jobs = st.jobs.filter(function (j) { return j.operatorId === id; });
    var open = jobs.filter(function (j) { return WS.OPEN_STATUSES.indexOf(j.status) >= 0; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    var recent = jobs.filter(function (j) { return j.status === 'done'; }).sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 8);
    var inv = st.invoices.filter(function (i) { return i.operatorId === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var ests = jobs.filter(function (j) { return j.estimate && WS.notStarted(j) && j.status !== 'done'; });
    var appr = st.approvals.filter(function (a) { return a.operatorId === id && a.status === 'Sent'; });
    var books = WS.portalBookings ? WS.portalBookings().filter(function (j) { return j.operatorId === id && j.date >= T; }) : [];
    var fig = function (k, v, sub) { return '<div class="cfig"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div>' + (sub ? '<div class="f">' + esc(sub) + '</div>' : '') + '</div>'; };
    var jobRow = function (j) {
      var v = WS.vehicle(j.vehicleId);
      return '<tr class="click" data-cjob="' + j.id + '"><td><span class="reg">' + esc(v ? v.reg : '') + '</span></td><td>' + esc(j.type) + '</td><td>' + esc(WS.dayName(j.date)) + '</td><td>' + esc(WS.statusLabel(j.status)) + '</td></tr>';
    };
    return '<div class="phead"><div><button type="button" class="btn alt sm" id="cBack" style="margin-bottom:10px">‹ All customers</button>' +
      '<h1>' + esc(o.name) + '</h1><div class="sub">' + esc(o.contact) + ' · ' + esc(o.phone) + ' · ' + esc(o.email) + ' · ' + o.terms + ' day terms</div></div>' +
      '<div class="sp"><button class="btn" id="cAsCust" data-as="' + id + '">View as customer</button></div></div>' +
      '<div class="cfigs">' +
      fig('Invoiced this year', WS.money0(f.invoiced)) + fig('Paid this year', WS.money0(f.paid)) +
      fig('Owed', WS.owedText(f), WS.lateText(f)) + fig('Pending, not invoiced', f.pendingN ? WS.money0(f.pending) : 'None', f.pendingN ? f.pendingN + ' finished job' + (f.pendingN === 1 ? '' : 's') + ', before VAT' : '') +
      fig('Pending estimates', WS.estText(f)) + fig('Next due', nextText(f)) + '</div>' +
      '<div class="card"><div class="ch"><h2>Vehicles</h2><div class="sp"><span class="muted sm">' + vs.length + '</span></div></div><div class="tablewrap"><table class="tbl"><thead><tr><th>Reg</th><th class="hide-sm">Vehicle</th><th>Next PMI</th><th>MOT</th><th></th></tr></thead><tbody>' +
      vs.map(function (v) {
        return '<tr class="click" data-cveh="' + v.id + '"><td><span class="reg">' + esc(v.reg) + '</span></td><td class="hide-sm">' + esc((v.make + ' ' + v.model).trim() || v.type) + '</td>' +
          '<td>' + esc(v.nextPmi ? WS.dateShort(v.nextPmi) : 'Not set') + '</td><td>' + esc(v.annualTest ? WS.dateShort(v.annualTest) : 'Not set') + '</td>' +
          '<td>' + (v.vor ? 'Off the road' : v.needsCheck ? 'Added by the customer, check it' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="grid g2" style="align-items:start">' +
      '<div class="card"><div class="ch"><h2>Jobs open now</h2></div>' + (open.length ? '<div class="tablewrap"><table class="tbl"><tbody>' + open.map(jobRow).join('') + '</tbody></table></div>' : O.empty('Nothing open.')) +
      (recent.length ? '<h3 style="margin:14px 0 6px">Recently finished</h3><div class="tablewrap"><table class="tbl"><tbody>' + recent.map(jobRow).join('') + '</tbody></table></div>' : '') + '</div>' +
      '<div class="card"><div class="ch"><h2>Estimates pending</h2></div>' +
      (ests.length || appr.length ? '<ul class="clist">' + ests.map(function (j) {
        var v = WS.vehicle(j.vehicleId);
        return '<li data-cjob="' + j.id + '"><b>' + esc(v ? v.reg : '') + '</b> ' + esc(j.work && j.work[0] ? j.work[0].concern : j.type) + '<span>' + WS.money0(j.estimate.low) + ' to ' + WS.money0(j.estimate.high) + ' + VAT, repair estimate</span></li>';
      }).join('') + appr.map(function (a) {
        var v = WS.vehicle(a.vehicleId);
        return '<li><b>' + esc(v ? v.reg : '') + '</b> ' + esc(a.title) + '<span>' + WS.money0(WS.approvalTotals(a).net) + ' + VAT, extra work waiting on their OK</span></li>';
      }).join('') + '</ul>' : O.empty('No estimates waiting.')) +
      '<h3 style="margin:14px 0 6px">Bookings from the portal</h3>' +
      (books.length ? '<ul class="clist">' + books.map(function (j) { return '<li data-cjob="' + j.id + '">' + esc(WS.bookingLine(j)) + '</li>'; }).join('') + '</ul>' : O.empty('No upcoming bookings.')) + '</div></div>' +
      '<div class="card"><div class="ch"><h2>Invoices</h2><div class="sp"><span class="muted sm">' + inv.length + '</span></div></div><div class="tablewrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Date</th><th class="num">Total</th><th>Paid</th></tr></thead><tbody>' +
      inv.map(function (i) {
        var over = !i.paid && i.due < T ? WS.daysBetween(i.due, T) : 0;
        return '<tr class="click" data-cinv="' + i.id + '"><td>' + esc(i.no) + '</td><td>' + esc(WS.dateShort(i.date)) + '</td><td class="num">' + WS.money(i.total) + '</td>' +
          '<td>' + esc(i.paid ? 'Paid ' + WS.dateShort(String(i.paid).slice(0, 10)) : over ? 'Unpaid, ' + over + ' day' + (over === 1 ? '' : 's') + ' past due' : 'Unpaid, due ' + WS.dateShort(i.due)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  W.customers = function () {
    document.querySelectorAll('[data-cust]').forEach(function (r) { r.onclick = function () { O.customerId = r.dataset.cust; O.render(); window.scrollTo(0, 0); }; });
    var b = $('cBack');
    if (b) b.onclick = function () { O.customerId = ''; O.render(); };
    var as = $('cAsCust');
    if (as) as.onclick = function () { if (O.openPortal) O.openPortal(as.dataset.as); };
    document.querySelectorAll('[data-cjob]').forEach(function (r) { r.onclick = function () { O.jobCard(r.dataset.cjob); }; });
    document.querySelectorAll('[data-cveh]').forEach(function (r) { r.onclick = function () { O.vehicleFile(r.dataset.cveh); }; });
    document.querySelectorAll('[data-cinv]').forEach(function (r) { r.onclick = function () { O.invoiceView(r.dataset.cinv); }; });
  };
  // leaving Customers goes back to the list next time
  var go0 = O.go;
  O.go = WS.go = function (s) { if (s !== 'customers') O.customerId = ''; return go0(s); };
})();
