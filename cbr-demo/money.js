/* Money: one section for everything in and out. A View dropdown at the top picks
   the overview, invoices out (what customers owe us), bills in (what we owe our
   suppliers) or fitter and staff pay. The last view chosen is remembered.
   The invoice and fitter pay screens themselves live in office3.js and fitterpay.js.
   Loaded before office3.js, which boots the app. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var pill = O.pill, stat = O.stat, head = O.head, empty = O.empty;

  var VIEWS = [
    ['overview', 'Overview'],
    ['invoices', 'Invoices out (receivables)'],
    ['bills', 'Bills in (payables)'],
    ['pay', 'Fitter and staff pay']
  ];
  var VKEY = String(WS.KEY).split(':')[0] + ':moneyView';
  var BILL_TYPES = ['Parts', 'Tyres', 'Oil and fluids', 'Test fees', 'Subcontract', 'Waste and disposal', 'Other'];

  O.billFilter = 'all';

  function r2(n) { return Math.round((+n || 0) * 100) / 100; }
  function sum(list, k) { return r2(list.reduce(function (s, x) { return s + (+x[k] || 0); }, 0)); }
  function inMonth(d) { return String(d || '').slice(0, 7) === WS.day(0).slice(0, 7); }
  function overdue(x) { return !x.paid && x.due < WS.day(0); }
  function bills() { return WS.state.bills || (WS.state.bills = []); }
  function byDue(a, b) { return a.due.localeCompare(b.due); }
  function n(k, one, many) { return k + ' ' + (k === 1 ? one : many); }

  /* ---------------- which view ---------------- */
  function okView(v) { return VIEWS.some(function (x) { return x[0] === v; }); }
  O.getMoneyView = function () {
    var v = '';
    try { v = localStorage.getItem(VKEY) || ''; } catch (e) { }
    return okView(v) ? v : (okView(O._moneyView) ? O._moneyView : 'overview');
  };
  O.setMoneyView = function (v) {
    if (!okView(v)) v = 'overview';
    O._moneyView = v;
    try { localStorage.setItem(VKEY, v); } catch (e) { }
  };

  function bar(v) {
    return '<div class="card tight mbar">' +
      '<div style="min-width:0"><div class="b">Money</div>' +
      '<div class="muted sm">Money in, money out, what is owed both ways and what the fitters are paid</div></div>' +
      '<label class="mpick"><span class="lb">View</span><select class="in" id="mView" aria-label="View">' +
      VIEWS.map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>';
      }).join('') + '</select></label></div>';
  }

  S.money = function () {
    var v = O.getMoneyView();
    var inner = v === 'invoices' ? S.invoices() : v === 'bills' ? billsScreen() : v === 'pay' ? S.fitterpay() : overview();
    return bar(v) + '<div class="mview" data-mview="' + v + '">' + inner + '</div>';
  };

  W.money = function () {
    var v = O.getMoneyView();
    $('mView').onchange = function () {
      O.setMoneyView(this.value);
      window.scrollTo(0, 0);
      O.render();
    };
    if (v === 'invoices') W.invoices();
    else if (v === 'pay') W.fitterpay();
    else if (v === 'bills') wireBills();
    else wireOverview();
  };

  /* ============================ overview ============================ */
  function overview() {
    var st = WS.state, inv = st.invoices, bl = bills();
    var invM = inv.filter(function (i) { return inMonth(i.date); });
    var paidIn = inv.filter(function (i) { return i.paid && inMonth(i.paid); });
    var billM = bl.filter(function (b) { return inMonth(b.date); });
    var paidOut = bl.filter(function (b) { return b.paid && inMonth(b.paid); });
    var owedUs = inv.filter(function (i) { return !i.paid; }).sort(byDue);
    var owedUsLate = owedUs.filter(overdue);
    var owedBy = bl.filter(function (b) { return !b.paid; }).sort(byDue);
    var owedByLate = owedBy.filter(overdue);
    var pp = WS.payPeriod('month'), fp = WS.fitterPay(pp[0], pp[1]);
    var month = WS.today().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    var inNet = sum(invM, 'net'), outNet = sum(billM, 'net'), pay = fp.totals.total;

    return head('Money overview', month + ' so far. Click any box to open the detail.') +

      '<div class="grid g3" style="margin-bottom:12px">' +
      stat('Money in this month', WS.money0(sum(invM, 'total')),
        'invoiced inc VAT · ' + WS.money0(sum(paidIn, 'total')) + ' paid in', 'ok', 'invoices') +
      stat('Money out this month', WS.money0(sum(billM, 'total')),
        'supplier bills inc VAT · ' + WS.money0(sum(paidOut, 'total')) + ' paid out', '', 'bills') +
      stat('Fitter pay this month', WS.money0(pay),
        'month so far, before tax and NI', '', 'fitterpay') +
      '</div>' +
      '<div class="grid g2" style="margin-bottom:16px">' +
      stat('Owed to us', WS.money0(sum(owedUs, 'total')),
        n(owedUs.length, 'unpaid invoice', 'unpaid invoices') + ' · ' + (owedUsLate.length ? WS.money0(sum(owedUsLate, 'total')) + ' overdue' : 'nothing overdue'),
        owedUsLate.length ? 'bad' : '', 'invoices') +
      stat('Owed by us', WS.money0(sum(owedBy, 'total')),
        n(owedBy.length, 'bill', 'bills') + ' to pay · ' + (owedByLate.length ? WS.money0(sum(owedByLate, 'total')) + ' overdue' : 'nothing overdue'),
        owedByLate.length ? 'warn' : '', 'bills') +
      '</div>' +

      '<div class="card"><div class="ch"><h2>This month, before VAT</h2></div>' +
      '<div class="tablewrap"><table class="tbl" id="mSum"><tbody>' +
      '<tr><td>Invoiced to customers<div class="muted sm">' + n(invM.length, 'invoice', 'invoices') + ', before VAT</div></td><td class="num b">' + WS.money(inNet) + '</td></tr>' +
      '<tr><td>Supplier bills<div class="muted sm">' + n(billM.length, 'bill', 'bills') + ' for parts, tyres, oil, tests and subcontract, before VAT</div></td><td class="num b">' + WS.money(outNet) + '</td></tr>' +
      '<tr><td>Fitter pay<div class="muted sm">' + n(fp.rows.length, 'fitter', 'fitters') + ', before tax and NI</div></td><td class="num b">' + WS.money(pay) + '</td></tr>' +
      '</tbody></table></div></div>' +

      '<div class="grid g2 m1">' +
      '<div class="card"><div class="ch"><h2>Owed to us, oldest first</h2><div class="sp"><button class="btn alt sm" data-go="invoices">All invoices</button></div></div>' +
      (owedUs.length ? '<div class="tablewrap"><table class="tbl"><tbody>' +
        owedUs.slice(0, 6).map(function (i) {
          var o = WS.operator(i.operatorId);
          return '<tr class="click" data-minv="' + i.id + '"><td>' + esc(o ? o.name : '') + '<div class="muted sm">' + esc(i.no) + '</div></td>' +
            '<td class="num b">' + WS.money(i.total) + '<div>' + dueTag(i) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : empty('Every invoice is paid.')) +
      '</div>' +
      '<div class="card"><div class="ch"><h2>Bills to pay next</h2><div class="sp"><button class="btn alt sm" data-go="bills">All bills</button></div></div>' +
      (owedBy.length ? '<div class="tablewrap"><table class="tbl"><tbody>' +
        owedBy.slice(0, 6).map(function (b) {
          return '<tr><td>' + esc(b.supplier) + '<div class="muted sm">' + esc(b.type) + ' · ' + esc(b.ref) + '</div></td>' +
            '<td class="num b">' + WS.money(b.total) + '<div>' + dueTag(b) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : empty('No bills waiting to be paid.')) +
      '</div></div>';
  }

  function dueTag(x) {
    if (x.paid) return pill('paid ' + WS.dateShort(String(x.paid).slice(0, 10)), 'ok');
    if (overdue(x)) return pill('overdue', 'bad');
    var d = WS.daysBetween(WS.day(0), x.due);
    return pill('due ' + WS.dateShort(x.due), d <= 7 ? 'warn' : '');
  }

  function wireOverview() {
    document.querySelectorAll('[data-minv]').forEach(function (r) { r.onclick = function () { O.invoiceView(r.dataset.minv); }; });
  }

  /* ============================ bills in ============================ */
  var FILTERS = [['all', 'All'], ['topay', 'To pay'], ['overdue', 'Overdue'], ['paid', 'Paid']];

  function billsScreen() {
    var bl = bills(), T = WS.day(0);
    var unpaid = bl.filter(function (b) { return !b.paid; });
    var late = unpaid.filter(overdue);
    var soon = unpaid.filter(function (b) { return b.due >= T && WS.daysBetween(T, b.due) <= 7; });
    var paidM = bl.filter(function (b) { return b.paid && inMonth(b.paid); });
    var f = O.billFilter;
    var list = bl.filter(function (b) {
      return f === 'topay' ? !b.paid : f === 'overdue' ? overdue(b) : f === 'paid' ? !!b.paid : true;
    }).sort(function (a, b) {
      if (!!a.paid !== !!b.paid) return a.paid ? 1 : -1;            // to pay first
      return a.paid ? String(b.paid).localeCompare(String(a.paid)) : byDue(a, b);
    });

    return head('Bills in', n(bl.length, 'supplier bill', 'supplier bills') + ' · ' + unpaid.length + ' to pay',
      '<button class="btn alt" id="bExp">Export CSV</button><button class="btn" id="bAdd">Add a bill</button>') +
      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Owed by us', WS.money0(sum(unpaid, 'total')), n(unpaid.length, 'bill', 'bills') + ' to pay', '') +
      stat('Overdue', WS.money0(sum(late, 'total')), late.length ? n(late.length, 'bill', 'bills') + ' past the due date' : 'nothing overdue', late.length ? 'bad' : 'ok') +
      stat('Due in the next 7 days', WS.money0(sum(soon, 'total')), n(soon.length, 'bill', 'bills'), soon.length ? 'warn' : '') +
      stat('Paid this month', WS.money0(sum(paidM, 'total')), n(paidM.length, 'bill', 'bills'), 'ok') +
      '</div>' +
      '<div class="card tight" style="margin-bottom:14px"><div class="seg" id="bFilt">' + FILTERS.map(function (x) {
        return '<button type="button" data-bf="' + x[0] + '"' + (f === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="tablewrap"><table class="tbl" id="bTbl"><thead><tr><th>Supplier</th><th class="hide-sm">Their ref</th><th class="hide-sm">Type</th>' +
      '<th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
      (list.length ? list.map(function (b) {
        return '<tr data-blrow="' + b.id + '"><td><b>' + esc(b.supplier) + '</b><div class="muted sm">' + esc(b.detail) + '</div>' +
          '<div class="muted sm only-sm">' + esc(b.ref) + ' · ' + WS.dateShort(b.date) + '</div></td>' +
          '<td class="hide-sm">' + esc(b.ref) + '<div class="muted sm">' + WS.dateShort(b.date) + '</div></td>' +
          '<td class="hide-sm">' + esc(b.type) + '</td>' +
          '<td class="num b">' + WS.money(b.total) + '<div class="muted sm">' + WS.money(b.net) + ' + VAT</div></td>' +
          '<td>' + dueTag(b) +
          (overdue(b) ? '<div class="muted sm">was due ' + WS.dateShort(b.due) + '</div>' : '') +
          (b.paid ? '' : '<div style="margin-top:6px"><button class="btn alt sm" data-bpay="' + b.id + '">Mark paid</button></div>') +
          '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + empty('No bills here.') + '</td></tr>') +
      '</tbody></table></div>' +
      '<div class="note" style="margin-top:14px"><b>Where these come from.</b> Supplier invoices for parts, tyres, oil, test fees and subcontract work. ' +
      'On the live system they come in from Xero, or you add them here, so what you owe sits next to what you are owed.</div>';
  }

  function wireBills() {
    document.querySelectorAll('[data-bf]').forEach(function (b) {
      b.onclick = function () { O.billFilter = b.dataset.bf; O.render(); };
    });
    document.querySelectorAll('[data-bpay]').forEach(function (btn) {
      btn.onclick = function () {
        var b = bills().filter(function (x) { return x.id === btn.dataset.bpay; })[0];
        if (!b) return;
        b.paid = WS.nowStamp();
        WS.save(); O.render();
        WS.toast(b.ref + ' from ' + b.supplier + ' marked as paid.', 'ok');
      };
    });
    $('bExp').onclick = function () {
      var rows = [['Supplier', 'Their ref', 'Type', 'Details', 'Bill date', 'Due', 'Net', 'VAT', 'Total', 'Paid']];
      bills().forEach(function (b) {
        rows.push([b.supplier, b.ref, b.type, b.detail, WS.dateUK(b.date), WS.dateUK(b.due), b.net, b.vat, b.total,
          b.paid ? WS.dateUK(String(b.paid).slice(0, 10)) : '']);
      });
      WS.download('supplier-bills-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Supplier bills downloaded.', 'ok');
    };
    $('bAdd').onclick = addBill;
  }

  function addBill() {
    var names = {};
    (WS.state.suppliers || []).forEach(function (s) { names[s.name] = 1; });
    bills().forEach(function (b) { names[b.supplier] = 1; });
    var vat = WS.state.settings.vat || 20;
    O.modal('Add a bill',
      '<div class="row"><label class="f"><span class="lb">Supplier</span><input class="in" id="bSup" list="bSupList" autocomplete="off">' +
      '<datalist id="bSupList">' + Object.keys(names).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist></label>' +
      '<label class="f"><span class="lb">Their invoice number</span><input class="in" id="bRef"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Type</span><select class="in" id="bType">' + O.opts(BILL_TYPES, 'Parts') + '</select></label>' +
      '<label class="f"><span class="lb">What it is for</span><input class="in" id="bDet"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Bill date</span><input class="in" type="date" id="bDate" value="' + WS.day(0) + '"></label>' +
      '<label class="f"><span class="lb">Due</span><input class="in" type="date" id="bDue" value="' + WS.day(30) + '"></label>' +
      '<label class="f"><span class="lb">Amount £ before VAT</span><input class="in" type="number" step="0.01" min="0" id="bNet"></label></div>' +
      '<label class="inline" style="margin-bottom:6px"><input type="checkbox" id="bVat" checked> Add VAT at ' + vat + '%</label>',
      'Add the bill', function () {
        var sup = $('bSup').value.trim(), net = r2(parseFloat($('bNet').value));
        if (!sup) { WS.toast('Say who the bill is from.', 'bad'); return; }
        if (!(net > 0)) { WS.toast('Put in the amount before VAT.', 'bad'); return; }
        var v = $('bVat').checked ? r2(net * vat / 100) : 0;
        var d = $('bDate').value || WS.day(0), due = $('bDue').value || d;
        bills().push({
          id: WS.uid('b'), supplier: sup, ref: $('bRef').value.trim() || 'No ref', type: $('bType').value,
          detail: $('bDet').value.trim(), date: d, due: due < d ? d : due, net: net, vat: v, total: r2(net + v), paid: ''
        });
        WS.save(); O.closeModal(); O.render();
        WS.toast('Bill from ' + sup + ' added.', 'ok');
      });
  }
})();
