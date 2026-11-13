/* Office screens, part 3: the inspection sheet, invoices and Xero, stock and
   purchase orders, compliance, Earned Recognition, timesheets,
   reports and settings. Boots the app at the bottom. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var pill = O.pill, chip = O.chip, stat = O.stat, kpi = O.kpi, head = O.head, empty = O.empty;

  /* ============================ inspection sheet (read only) ============================ */
  O.sheetView = function (jobId) {
    var j = WS.job(jobId), v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId);
    var ins = j.inspection;
    if (!ins) {
      O.modal('No inspection sheet yet',
        '<div class="hint">The fitter fills this in on the phone. Once it is signed off it locks and cannot be changed, which is what the DVSA asks for.</div>');
      return;
    }
    var defects = 0;
    ins.sections.forEach(function (s) { s.items.forEach(function (i) { if (i.state === 'D') defects++; }); });
    var body =
      '<div class="note" style="margin-bottom:14px"><b>Signed off and locked.</b> ' +
      'Inspected by ' + esc(ins.sign.inspector.name) + ' at ' + esc(WS.whenUK(ins.sign.inspector.at)) + '. ' +
      'Declared roadworthy by ' + esc(ins.sign.declare.name) + ' at ' + esc(WS.whenUK(ins.sign.declare.at)) + '. ' +
      'This record cannot be altered and is kept for 15 months.</div>' +
      '<div class="grid g3" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Operator</div><div class="b">' + esc(ins.header.operator || (o ? o.name : '')) + '</div></div>' +
      '<div><div class="muted sm">Vehicle</div><div class="b">' + esc(v ? v.reg + ' · ' + v.make + ' ' + v.model : '') + '</div></div>' +
      '<div><div class="muted sm">Odometer</div><div class="b">' + (ins.header.odometer || 0).toLocaleString('en-GB') + ' km</div></div>' +
      '</div>' +
      '<div class="grid g4" style="margin-bottom:14px">' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="muted sm">Service brake</div><div class="b" style="font-size:18px">' + ins.brake.service + '%</div></div>' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="muted sm">Secondary</div><div class="b" style="font-size:18px">' + ins.brake.secondary + '%</div></div>' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="muted sm">Parking</div><div class="b" style="font-size:18px">' + ins.brake.parking + '%</div></div>' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="muted sm">Method</div><div class="b sm">' + esc(ins.brake.method) + ', ' + esc(ins.brake.laden) + '</div></div>' +
      '</div>' +
      (ins.retorque && ins.retorque.done ? '<div class="hint" style="margin-bottom:12px">Wheel re torque recorded at ' +
        (ins.retorque.km || 0).toLocaleString('en-GB') + ' km' + (ins.retorque.nm ? ' to ' + ins.retorque.nm + ' Nm' : '') + ' on ' + WS.dateUK(ins.retorque.at) + '.</div>' : '') +
      (defects ? '<div class="flagbox">' + defects + ' defect' + (defects > 1 ? 's' : '') + ' found and recorded below.</div>' : '') +
      ins.sections.map(function (sec) {
        var bad = sec.items.filter(function (i) { return i.state === 'D'; }).length;
        return '<div class="isec"><div class="sh">' + esc(sec.name) +
          '<span class="cnt">' + (bad ? bad + ' defect' : 'all serviceable') + '</span></div>' +
          sec.items.map(function (i) {
            return '<div class="iitem"><div class="nm">' + esc(i.name) + '</div>' +
              pill(i.state === 'D' ? 'Defect' : i.state === 'N/A' ? 'N/A' : 'Serviceable', i.state === 'D' ? 'bad' : i.state === 'N/A' ? '' : 'ok') +
              (i.state === 'D' ? '<div class="dnote"><b>' + esc(i.note) + '</b>' +
                (i.rectBy ? '<div class="muted sm" style="margin-top:4px">Rectified by ' + esc(i.rectBy) + ' on ' + WS.dateUK(i.rectAt) + '</div>' : '') + '</div>' : '') +
              '</div>';
          }).join('') + '</div>';
      }).join('');
    O.modal('Safety inspection · ' + (v ? v.reg : ''), body, null, null, 'wide',
      '<button class="btn alt" id="shPrint">Print</button>');
    $('shPrint').onclick = function () { window.print(); };
  };

  /* ============================ invoices ============================ */
  O.createInvoice = function (j) {
    var q = WS.quoteJob(j), o = WS.operator(j.operatorId);
    if (!q.hours && !(j.parts || []).length) { WS.toast('Nothing to invoice: no time clocked and no parts.', 'bad'); return; }
    var n = 4128 + WS.state.invoices.length;
    var inv = {
      id: WS.uid('i'), no: 'INV-' + n, jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId,
      date: WS.day(0), due: WS.day((o && o.terms) || 30),
      hours: q.hours, rate: q.rate, labour: q.labour, partsNet: q.partsNet,
      discount: q.discount, net: q.net, vat: q.vat, total: q.total, cost: q.cost,
      xeroExported: '', xeroId: '', paid: '', parts: (j.parts || []).slice()
    };
    WS.state.invoices.push(inv);
    j.invoiceId = inv.id;
    WS.audit(j, 'Office', 'Invoice ' + inv.no + ' raised for ' + WS.money(inv.total));
    var sent = false;
    if (WS.xeroOk() && WS.state.settings.xero.autoSend) {
      WS.xeroPush([inv]);
      sent = true;
    }
    WS.save();
    O.closeModal();
    O.go('invoices');
    WS.toast(inv.no + ' raised for ' + WS.money(inv.total) + (sent ? ' and pushed into Xero.' : '.'), 'ok');
  };

  S.invoices = function () {
    var st = WS.state;
    var ready = st.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; });
    var list = st.invoices.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.no.localeCompare(a.no); });
    var pend = list.filter(function (i) { return !i.xeroExported; });
    var unpaid = list.filter(function (i) { return !i.paid; });
    var owed = unpaid.reduce(function (s2, i) { return s2 + i.total; }, 0);
    var x = st.settings.xero;

    return head('Invoices out', list.length + ' invoices · ' + ready.length + ' jobs ready to bill',
      (WS.xeroOk()
        ? '<button class="btn" id="iXero">Send ' + pend.length + ' to Xero</button>'
        : '<button class="btn alt" id="iCsv">Export CSV for Xero</button><button class="btn" data-go="settings">Connect Xero</button>')) +

      '<div class="conn ' + (WS.xeroOk() ? 'on' : '') + '" style="margin-bottom:16px"><span class="bl"></span>' +
      (WS.xeroOk()
        ? '<b>Xero connected</b> to ' + esc(x.tenantName || 'your organisation') + '. New invoices go across on their own' +
          (x.lastSync ? ', last sync ' + esc(WS.whenUK(x.lastSync)) : '') + '.'
        : '<b>Xero is not connected.</b> Paste your API key in Settings and invoices will post themselves.') +
      '<span class="sp">' + (WS.xeroOk() ? chip('live', 'ok') : '<button class="btn alt sm" data-go="settings">Set it up</button>') + '</span></div>' +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Ready to bill', ready.length, ready.length ? 'finished and not invoiced' : 'all billed', ready.length ? 'warn' : 'ok', ready.length ? 'invoices' : '') +
      stat('Not yet in Xero', pend.length, pend.length ? 'waiting to go across' : 'all synced', pend.length ? 'warn' : 'ok') +
      stat('Owed to you', WS.money0(owed), unpaid.length + ' unpaid invoices', owed > 8000 ? 'bad' : '') +
      stat('Invoiced this month', WS.money0(list.filter(function (i) {
        return WS.parse(i.date).getMonth() === new Date().getMonth();
      }).reduce(function (s2, i) { return s2 + i.net; }, 0)), 'before VAT', 'ok') +
      '</div>' +

      (ready.length ? '<div class="card"><div class="ch"><h2>Finished jobs waiting to be billed</h2></div>' +
        '<div class="tablewrap"><table class="tbl fitsm"><thead><tr><th>Job</th><th class="hide-sm">Vehicle</th><th class="hide-sm">Customer</th><th class="num">Value</th><th></th></tr></thead><tbody>' +
        ready.map(function (j) {
          var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId), q = WS.quoteJob(j);
          return '<tr><td>' + esc(j.no) + '<div class="muted sm">' + esc(j.type) + '</div>' +
            '<div class="only-sm"><span class="reg">' + esc(v ? v.reg : '') + '</span></div></td>' +
            '<td class="hide-sm"><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
            '<td class="hide-sm">' + esc(o ? o.name : '') + '</td>' +
            '<td class="num">' + WS.money(q.total) + '</td>' +
            '<td class="num"><button class="btn sm" data-bill="' + j.id + '">Invoice it</button></td></tr>';
        }).join('') + '</tbody></table></div></div>' : '') +

      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Invoice</th><th class="hide-sm">Customer</th>' +
      '<th class="hide-sm">Vehicle</th><th class="num hide-sm">Net</th><th class="num">Total</th><th class="hide-sm">Xero</th><th>Paid</th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 60).map(function (i) {
        var o = WS.operator(i.operatorId), v = WS.vehicle(i.vehicleId);
        return '<tr class="click" data-inv="' + i.id + '"><td>' + esc(i.no) + '<div class="muted sm">' + WS.dateShort(i.date) + '</div></td>' +
          '<td class="hide-sm">' + esc(o ? o.name : '') + '</td>' +
          '<td class="hide-sm"><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
          '<td class="num hide-sm">' + WS.money(i.net) + '</td><td class="num b">' + WS.money(i.total) + '</td>' +
          '<td class="hide-sm">' + (i.xeroExported ? pill('sent', 'ok') : pill('waiting', 'warn')) + '</td>' +
          '<td>' + (i.paid ? pill('paid', 'ok') : WS.daysBetween(i.due, WS.day(0)) > 0 ? pill('overdue', 'bad') : pill('due ' + WS.dateShort(i.due), '')) + '</td></tr>';
      }).join('') : '<tr><td colspan="7">' + empty('No invoices yet.') + '</td></tr>') +
      '</tbody></table></div>';
  };

  W.invoices = function () {
    document.querySelectorAll('[data-inv]').forEach(function (r) { r.onclick = function () { O.invoiceView(r.dataset.inv); }; });
    document.querySelectorAll('[data-bill]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); O.createInvoice(WS.job(b.dataset.bill)); };
    });
    var cs = $('iCsv');
    if (cs) cs.onclick = exportXero;
    var xb = $('iXero');
    if (xb) xb.onclick = function () {
      var pend = WS.state.invoices.filter(function (i) { return !i.xeroExported; });
      if (!pend.length) { WS.toast('Everything is already in Xero.', 'ok'); return; }
      var n = WS.xeroPush(pend);
      WS.save(); O.render();
      WS.toast(n + ' invoice' + (n > 1 ? 's' : '') + ' posted into Xero as drafts.', 'ok');
    };
    O.wireGo();
  };

  function exportXero() {
    var pend = WS.state.invoices.filter(function (i) { return !i.xeroExported; });
    if (!pend.length) { WS.toast('Nothing new to export. Everything has already gone to Xero.', 'ok'); return; }
    var x = WS.state.settings.xero;
    var rows = [['*ContactName', 'EmailAddress', '*InvoiceNumber', 'Reference', '*InvoiceDate', '*DueDate',
      'Description', '*Quantity', '*UnitAmount', '*AccountCode', '*TaxType', 'TrackingName1', 'TrackingOption1']];
    pend.forEach(function (i) {
      var o = WS.operator(i.operatorId) || {}, v = WS.vehicle(i.vehicleId) || {};
      rows.push([o.name, o.email, i.no, v.reg, WS.dateUK(i.date), WS.dateUK(i.due),
        'Labour ' + WS.hrs(i.hours) + ' at ' + WS.money(i.rate), i.hours, i.rate, x.salesAccount, x.taxType, 'Vehicle', v.reg]);
      (i.parts || []).forEach(function (p) {
        var rc = WS.rateFor(i.operatorId);
        rows.push([o.name, o.email, i.no, v.reg, WS.dateUK(i.date), WS.dateUK(i.due),
          'Parts: ' + p.name, p.qty, Math.round(p.cost * (1 + rc.markup / 100) * 100) / 100, x.partsAccount, x.taxType, 'Vehicle', v.reg]);
      });
    });
    WS.download('xero-invoices-' + WS.day(0) + '.csv', WS.csv(rows));
    pend.forEach(function (i) { i.xeroExported = WS.nowStamp(); });
    WS.state.settings.xero.lastSync = WS.nowStamp();
    WS.save();
    O.render();
    WS.toast(pend.length + ' invoice' + (pend.length > 1 ? 's' : '') + ' exported. They will not go again.', 'ok');
  }

  O.invoiceView = function (id) {
    var i = WS.invoice(id), o = WS.operator(i.operatorId), v = WS.vehicle(i.vehicleId);
    var j = WS.job(i.jobId), st = WS.state.settings;
    var rc = WS.rateFor(i.operatorId);
    var body = '<div class="inv">' +
      '<div class="ih"><div><h2>' + esc(st.name) + '</h2>' +
      '<div class="muted" style="font-size:12.5px;line-height:1.55;margin-top:6px">' + esc(st.address) + '<br>' +
      esc(st.phone) + ' · ' + esc(st.email) + '<br>VAT ' + esc(st.vatNo) + ' · O licence ' + esc(st.opLicence) + '</div></div>' +
      '<div class="n"><div style="font-size:22px;font-weight:800">INVOICE</div>' +
      '<div style="font-size:14px;font-weight:700;margin-top:4px">' + esc(i.no) + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Date ' + WS.dateUK(i.date) + '<br>Due ' + WS.dateUK(i.due) + '</div></div></div>' +
      '<div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:6px">' +
      '<div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Bill to</div>' +
      '<div style="font-weight:700;margin-top:4px">' + esc(o ? o.name : '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc(o ? o.contact : '') + '</div></div>' +
      '<div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Vehicle</div>' +
      '<div style="font-weight:700;margin-top:4px">' + esc(v ? v.reg : '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc(v ? v.make + ' ' + v.model : '') + '</div></div>' +
      '<div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Job</div>' +
      '<div style="font-weight:700;margin-top:4px">' + esc(j ? j.no : '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc(j ? j.type : '') + '</div></div></div>' +
      '<table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
      '<tr><td>Workshop labour</td><td style="text-align:right">' + i.hours + '</td>' +
      '<td style="text-align:right">' + WS.money(i.rate) + '</td><td style="text-align:right">' + WS.money(i.labour) + '</td></tr>' +
      (i.parts || []).map(function (p) {
        var unit = Math.round(p.cost * (1 + rc.markup / 100) * 100) / 100;
        return '<tr><td>' + esc(p.name) + (p.partNo ? ' <span class="muted">' + esc(p.partNo) + '</span>' : '') + '</td>' +
          '<td style="text-align:right">' + p.qty + '</td><td style="text-align:right">' + WS.money(unit) + '</td>' +
          '<td style="text-align:right">' + WS.money(unit * p.qty) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="tot">' +
      (i.discount ? '<div><span>Contract discount</span><span>-' + WS.money(i.discount) + '</span></div>' : '') +
      '<div><span>Net</span><span>' + WS.money(i.net) + '</span></div>' +
      '<div><span>VAT at ' + st.vat + '%</span><span>' + WS.money(i.vat) + '</span></div>' +
      '<div class="g"><span>Total due</span><span>' + WS.money(i.total) + '</span></div></div>' +
      '<div class="muted" style="font-size:11.5px;margin-top:22px;border-top:1px solid #E4E8EF;padding-top:12px">' +
      'Payment within ' + rc.terms + ' days to ' + esc(st.bank) + '. ' +
      'Inspection records for this vehicle are kept for 15 months and are available on request.</div></div>';

    var extra = '<button class="btn alt" id="ivPrint">Print or save PDF</button>';
    if (!i.paid) extra += '<button class="btn alt" id="ivPaid">Mark as paid</button>';
    O.modal(i.no, body, i.xeroExported ? null : (WS.xeroOk() ? 'Send to Xero' : 'Export for Xero'), function () {
      if (WS.xeroOk()) { WS.xeroPush([i]); WS.save(); O.closeModal(); O.render(); WS.toast(i.no + ' posted into Xero.', 'ok'); }
      else { O.closeModal(); exportXero(); }
    }, 'wide', extra +
      (i.xeroExported ? '<span class="muted sm" style="align-self:center;margin-right:auto">Already sent to Xero ' +
        esc(WS.whenUK(i.xeroExported)) + (i.xeroId ? ' as ' + esc(i.xeroId) : '') + '</span>' : ''));
    $('ivPrint').onclick = function () { window.print(); };
    var pd = $('ivPaid');
    if (pd) pd.onclick = function () {
      i.paid = WS.nowStamp(); WS.save(); O.closeModal(); O.render();
      WS.toast(i.no + ' marked as paid.', 'ok');
    };
  };

  /* ============================ parts and stock ============================ */
  S.stock = function () {
    var st = WS.state, q = O.stockFilter.toLowerCase();
    var list = st.stock.filter(function (s) {
      return !q || (s.name + ' ' + s.partNo + ' ' + s.bin).toLowerCase().indexOf(q) >= 0;
    });
    var low = WS.lowStock();
    var openPo = st.pos.filter(function (p) { return p.status === 'Ordered'; });
    return head('Parts and stock', st.stock.length + ' lines · ' + WS.money0(WS.stockValue()) + ' on the shelf',
      '<button class="btn alt sm" id="stExp">Export CSV</button>' +
      (low.length ? '<button class="btn" id="stPo">Order the ' + low.length + ' low lines</button>' : '')) +
      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Stock value', WS.money0(WS.stockValue()), 'at cost') +
      stat('At or below minimum', low.length, low.length ? 'order these' : 'all healthy', low.length ? 'bad' : 'ok') +
      stat('On order', openPo.length, openPo.length ? 'purchase orders out' : 'nothing on order') +
      stat('Due in today', st.pos.filter(function (p) { return p.status === 'Ordered' && p.expected === WS.day(0); }).length, 'check the gate') +
      '</div>' +
      (low.length ? '<div class="flagbox" style="margin-bottom:14px"><b>Running low:</b> ' +
        esc(low.map(function (s) { return s.name + ' (' + s.qty + ')'; }).join(', ')) + '</div>' : '') +

      (openPo.length ? '<div class="card"><div class="ch"><h2>Purchase orders out</h2></div>' +
        '<div class="tablewrap"><table class="tbl"><thead><tr><th>PO</th><th>Supplier</th><th class="hide-sm">Lines</th><th>Expected</th><th></th></tr></thead><tbody>' +
        openPo.map(function (p) {
          var sp = WS.supplier(p.supplierId);
          return '<tr><td>' + esc(p.no) + '</td><td>' + esc(sp ? sp.name : '') + '</td>' +
            '<td class="hide-sm muted sm">' + esc(p.lines.map(function (l) { return l.qty + ' x ' + l.name; }).join(', ')) + '</td>' +
            '<td>' + WS.dayName(p.expected) + '</td>' +
            '<td class="num"><button class="btn sm" data-recv="' + p.id + '">Book it in</button></td></tr>';
        }).join('') + '</tbody></table></div></div>' : '') +

      '<div class="card tight" style="margin-bottom:14px"><input class="in" id="stQ" placeholder="Search part name, number or bin" value="' + esc(O.stockFilter) + '"></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Part</th><th class="hide-sm">Number</th><th class="hide-sm">Bin</th>' +
      '<th class="num">In stock</th><th class="num hide-sm">Min</th><th class="num">Cost</th><th class="hide-sm">Supplier</th></tr></thead><tbody>' +
      list.map(function (s) {
        var cls = s.qty <= 0 ? 'low' : s.qty <= s.min ? 'warn' : '';
        var sp = WS.supplier(s.supplierId);
        return '<tr class="click" data-st="' + s.id + '"><td>' + esc(s.name) +
          (s.onOrder ? ' ' + chip(s.onOrder + ' on order', 'go') : '') + '</td>' +
          '<td class="hide-sm muted sm">' + esc(s.partNo) + '</td>' +
          '<td class="hide-sm">' + esc(s.bin) + '</td>' +
          '<td class="num"><span class="qty ' + cls + '"><b>' + s.qty + '</b></span></td>' +
          '<td class="num hide-sm muted">' + s.min + '</td>' +
          '<td class="num">' + WS.money(s.cost) + '</td>' +
          '<td class="hide-sm muted sm">' + esc(sp ? sp.name : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  W.stock = function () {
    var q = $('stQ');
    q.oninput = function () { O.stockFilter = q.value; var p = q.selectionStart; O.render(); var n = $('stQ'); n.focus(); n.setSelectionRange(p, p); };
    document.querySelectorAll('[data-st]').forEach(function (r) { r.onclick = function () { O.stockEdit(r.dataset.st); }; });
    document.querySelectorAll('[data-recv]').forEach(function (b) {
      b.onclick = function () {
        var po = WS.state.pos.filter(function (p) { return p.id === b.dataset.recv; })[0];
        po.status = 'Received'; po.received = WS.nowStamp();
        po.lines.forEach(function (l) {
          var s = WS.stockItem(l.stockId);
          if (s) { s.qty += l.qty; s.onOrder = Math.max(0, s.onOrder - l.qty); }
        });
        WS.save(); O.render();
        WS.toast(po.no + ' booked in. Stock updated.', 'ok');
      };
    });
    var po = $('stPo');
    if (po) po.onclick = function () {
      var low = WS.lowStock();
      var bySup = {};
      low.forEach(function (s) { (bySup[s.supplierId] = bySup[s.supplierId] || []).push(s); });
      var made = 0;
      Object.keys(bySup).forEach(function (sid) {
        var sp = WS.supplier(sid);
        var n = 3312 + WS.state.pos.length + made;
        WS.state.pos.push({
          id: WS.uid('po'), no: 'PO-' + n, supplierId: sid, date: WS.day(0), status: 'Ordered',
          lines: bySup[sid].map(function (s) {
            var qty = Math.max(s.min * 2 - s.qty, s.min);
            s.onOrder += qty;
            return { stockId: s.id, name: s.name, qty: qty, cost: s.cost };
          }),
          expected: WS.day((sp && sp.lead) || 1), received: ''
        });
        made++;
      });
      WS.save(); O.render();
      WS.toast(made + ' purchase order' + (made > 1 ? 's' : '') + ' raised and sent to the suppliers.', 'ok');
    };
    $('stExp').onclick = function () {
      var rows = [['Part', 'Number', 'Bin', 'In stock', 'Minimum', 'On order', 'Cost', 'Value', 'Supplier']];
      WS.state.stock.forEach(function (s) {
        rows.push([s.name, s.partNo, s.bin, s.qty, s.min, s.onOrder, s.cost, Math.round(s.qty * s.cost * 100) / 100, (WS.supplier(s.supplierId) || {}).name || '']);
      });
      WS.download('stock-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Stock list downloaded.', 'ok');
    };
  };

  O.stockEdit = function (id) {
    var s = WS.stockItem(id);
    O.modal(s.name,
      '<div class="row"><label class="f"><span class="lb">In stock</span><input class="in" id="sQty" type="number" value="' + s.qty + '"></label>' +
      '<label class="f"><span class="lb">Minimum</span><input class="in" id="sMin" type="number" value="' + s.min + '"></label>' +
      '<label class="f"><span class="lb">Cost</span><input class="in" id="sCost" type="number" step="0.01" value="' + s.cost + '"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Bin</span><input class="in" id="sBin" value="' + esc(s.bin) + '"></label>' +
      '<label class="f"><span class="lb">Part number</span><input class="in" id="sNo" value="' + esc(s.partNo) + '"></label>' +
      '<label class="f"><span class="lb">Warranty months</span><input class="in" id="sWar" type="number" value="' + s.warranty + '"></label></div>' +
      '<div class="hint">Parts come off this list every time a fitter adds one to a job card, so the shelf and the system stay in step.</div>',
      'Save', function () {
        s.qty = parseInt($('sQty').value, 10) || 0;
        s.min = parseInt($('sMin').value, 10) || 0;
        s.cost = parseFloat($('sCost').value) || 0;
        s.bin = $('sBin').value; s.partNo = $('sNo').value;
        s.warranty = parseInt($('sWar').value, 10) || 0;
        WS.save(); O.closeModal(); O.render();
        WS.toast(s.name + ' updated.', 'ok');
      });
  };

  /* ============================ compliance planner ============================ */
  S.compliance = function () {
    var items = WS.dueItems(183);
    var over = items.filter(function (i) { return i.st.days < 0; });
    var soon = items.filter(function (i) { return i.st.days >= 0 && i.st.days <= 14; });
    var months = [];
    for (var m = 0; m < 6; m++) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m);
      months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) });
    }
    var counts = months.map(function (mo) {
      return items.filter(function (i) { return i.date.slice(0, 7) === mo.key; }).length;
    });
    var max = Math.max.apply(null, counts.concat([1]));

    return head('Compliance planner', 'Six months ahead for every vehicle, as the DVSA asks for',
      '<button class="btn alt sm" id="cExp">Export CSV</button>' +
      (soon.length ? '<button class="btn" id="cRemind">Remind every operator</button>' : '')) +
      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Overdue now', over.length, over.length ? 'deal with these today' : 'nothing overdue', over.length ? 'bad' : 'ok') +
      stat('Due in 14 days', soon.length, 'book them in', soon.length ? 'warn' : 'ok') +
      stat('Due in 6 months', items.length, 'across ' + WS.state.vehicles.length + ' vehicles') +
      stat('Vehicles off the road', WS.state.vehicles.filter(function (v) { return v.vor; }).length, 'not earning', 'bad') +
      '</div>' +
      '<div class="card"><div class="ch"><h2>The next six months</h2></div>' +
      '<div class="chart">' + months.map(function (mo, i) {
        return '<div class="cb"><div class="vl">' + counts[i] + '</div>' +
          '<div class="bar2' + (i === 0 ? '' : ' ok') + '" style="height:' + Math.max(3, counts[i] / max * 120) + 'px"></div>' +
          '<div class="lb">' + esc(mo.label) + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Vehicle</th><th class="hide-sm">Operator</th>' +
      '<th>What</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>' +
      items.slice(0, 60).map(function (i) {
        var o = WS.operator(i.vehicle.operatorId);
        return '<tr><td><span class="reg">' + esc(i.vehicle.reg) + '</span>' +
          '<div class="muted sm">' + esc(i.vehicle.make + ' ' + i.vehicle.model) + '</div></td>' +
          '<td class="hide-sm">' + esc(o ? o.name : '') + '</td>' +
          '<td>' + esc(i.kind) + '</td><td>' + WS.dateShort(i.date) + '</td>' +
          '<td>' + pill(window.innerWidth < 700 ? i.st.short : i.st.label, i.st.cls) + '</td>' +
          '<td class="num"><button class="btn alt sm" data-book="' + i.vehicle.id + '" data-kind="' + esc(i.kind) + '">Book in</button></td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      (items.length > 60 ? '<div class="hint" style="margin-top:10px">Showing the first 60. Export the CSV for the lot.</div>' : '');
  };

  W.compliance = function () {
    document.querySelectorAll('[data-book]').forEach(function (b) {
      b.onclick = function () {
        var v = WS.vehicle(b.dataset.book);
        var k = b.dataset.kind;
        var t = k === 'PMI' ? 'PMI' : k === 'LOLER' ? 'LOLER' : k === 'Annual test' ? 'MOT prep' : 'PMI';
        O.bookinDraft = { op: v.operatorId, veh: v.id, type: t, est: WS.stdTime(t) };
        O.go('bookin');
      };
    });
    var rm = $('cRemind');
    if (rm) rm.onclick = function () {
      var soon = WS.dueItems(14);
      var byOp = {};
      soon.forEach(function (i) { (byOp[i.vehicle.operatorId] = byOp[i.vehicle.operatorId] || []).push(i); });
      var n = 0;
      Object.keys(byOp).forEach(function (opId) {
        var o = WS.operator(opId);
        if (!o) return;
        WS.notify(o.contact + ', ' + o.name, WS.channels(), 'Compliance due in the next 14 days',
          byOp[opId].length + ' item' + (byOp[opId].length > 1 ? 's' : '') + ' due: ' +
          byOp[opId].slice(0, 4).map(function (i) { return i.vehicle.reg + ' ' + i.kind; }).join(', ') + '. Reply to book them in.', 'reminder');
        n++;
      });
      WS.save();
      WS.toast('Reminder sent to ' + n + ' operator' + (n > 1 ? 's' : '') + ' by ' + WS.channels() + '.', 'ok');
    };
    $('cExp').onclick = function () {
      var rows = [['Reg', 'Make', 'Model', 'Operator', 'Item', 'Due', 'Days']];
      WS.dueItems(183).forEach(function (i) {
        rows.push([i.vehicle.reg, i.vehicle.make, i.vehicle.model, (WS.operator(i.vehicle.operatorId) || {}).name || '', i.kind, i.date, i.st.days]);
      });
      WS.download('compliance-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Compliance planner downloaded.', 'ok');
    };
  };

  /* ============================ Earned Recognition ============================ */
  S.er = function () {
    var e = WS.erStats(), t = WS.state.settings.erTargets;
    function g(v, target, higher) {
      var ok = higher === false ? v <= target : v >= target;
      return ok ? 'ok' : v >= target * 0.9 ? 'warn' : 'bad';
    }
    return head('Earned Recognition', 'The numbers the DVSA looks at, worked out from your own records',
      '<button class="btn alt sm" id="erExp">Export the quarterly report</button>') +
      '<div class="note" style="margin-bottom:16px">Earned Recognition means the DVSA checks your data instead of stopping your vehicles. ' +
      'These four figures are what they want to see, reported every four weeks. The system works them out as the work happens.</div>' +
      '<div class="kpi" style="margin-bottom:18px">' +
      kpi('PMIs done on time', e.pmiOnTime + '%', 'target ' + t.pmiOnTime + '% · ' + e.pmiCount + ' inspections', g(e.pmiOnTime, t.pmiOnTime), e.pmiOnTime) +
      kpi('Defects per inspection', e.defectsPerPmi, 'target under ' + t.defectsPerPmi, g(e.defectsPerPmi, t.defectsPerPmi, false), Math.min(100, e.defectsPerPmi / t.defectsPerPmi * 100)) +
      kpi('MOT first time pass', e.motFirstTime + '%', 'target ' + t.motFirstTime + '%', g(e.motFirstTime, t.motFirstTime), e.motFirstTime) +
      kpi('Driver checks done', e.driverChecks + '%', e.checksToday + ' of ' + e.driverCount + ' drivers today', g(e.driverChecks, t.driverChecks), e.driverChecks) +
      '</div>' +
      '<div class="grid g2">' +
      '<div class="card"><div class="ch"><h2>What would fail an audit today</h2></div>' +
      (e.overdue ? '<div class="flagbox"><b>' + e.overdue + ' compliance items are overdue.</b> An auditor would open on this. ' +
        '<button class="btn alt sm" data-go="compliance" style="margin-top:8px">Deal with them</button></div>' : '') +
      '<ul class="feed">' +
      [['Inspection records kept 15 months', 'Every signed sheet is locked and kept, with a full audit trail', true],
       ['Brake performance at every PMI', 'The sheet will not sign off without the three figures', true],
       ['Records cannot be altered after sign off', 'Locked, with who signed and when', true],
       ['Forward planner at least 6 months', 'The compliance planner runs six months out', true],
       ['Driver defect reports kept and actioned', 'Every check is stored and turns into a job card', true]].map(function (x) {
        return '<li><div class="ic ok">✓</div><div><div class="t">' + esc(x[0]) + '</div><div class="s">' + esc(x[1]) + '</div></div></li>';
      }).join('') + '</ul></div>' +
      '<div class="card"><div class="ch"><h2>Four week submission</h2></div>' +
      '<div class="hint">This is the file the scheme asks for. It pulls straight out of the job cards, so nobody has to build it by hand at month end.</div>' +
      '<div class="tablewrap" style="margin-top:12px"><table class="tbl"><tbody>' +
      '<tr><td>Vehicles on the licence</td><td class="num b">' + WS.state.vehicles.length + '</td></tr>' +
      '<tr><td>Safety inspections in the period</td><td class="num b">' + e.pmiCount + '</td></tr>' +
      '<tr><td>Inspections on time</td><td class="num b">' + e.pmiOnTime + '%</td></tr>' +
      '<tr><td>Driver defect reports</td><td class="num b">' + WS.state.checks.filter(function (c) { return c.defects.length; }).length + '</td></tr>' +
      '<tr><td>Vehicles off the road now</td><td class="num b">' + WS.state.vehicles.filter(function (v) { return v.vor; }).length + '</td></tr>' +
      '</tbody></table></div></div></div>';
  };

  W.er = function () {
    $('erExp').onclick = function () {
      var e = WS.erStats();
      var rows = [['Earned Recognition four week report', WS.dateUK(WS.day(0))], [],
        ['Measure', 'Result', 'Target'],
        ['PMIs done on time %', e.pmiOnTime, WS.state.settings.erTargets.pmiOnTime],
        ['Defects per inspection', e.defectsPerPmi, WS.state.settings.erTargets.defectsPerPmi],
        ['MOT first time pass %', e.motFirstTime, WS.state.settings.erTargets.motFirstTime],
        ['Driver checks completed %', e.driverChecks, WS.state.settings.erTargets.driverChecks],
        [], ['Vehicle', 'Operator', 'Last PMI', 'Next PMI', 'Annual test', 'Status']];
      WS.state.vehicles.forEach(function (v) {
        rows.push([v.reg, (WS.operator(v.operatorId) || {}).name || '', v.lastPmi, v.nextPmi, v.annualTest, v.vor ? 'VOR' : 'In service']);
      });
      WS.download('earned-recognition-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Quarterly report downloaded.', 'ok');
    };
    O.wireGo();
  };

  /* ============================ timesheets ============================ */
  S.timesheets = function () {
    var p = WS.payroll(O.tsWeek);
    return head('Timesheets', 'Straight off the clock ons. Replaces the paper sheets.',
      '<button class="btn alt sm" id="tPrev">‹ Week before</button>' +
      '<button class="btn alt sm" id="tThis">This week</button>' +
      '<button class="btn alt sm" id="tNext">Week after ›</button>' +
      '<button class="btn" id="tExp">Export CSV</button>') +
      '<div class="card tight" style="margin-bottom:14px"><b>Week beginning ' + WS.dateUK(p.start) + '</b>' +
      '<span class="muted sm"> · ' + WS.hrs(p.rows.reduce(function (s, r) { return s + r.total; }, 0)) + ' clocked across ' + p.rows.length + ' fitters</span></div>' +
      '<div class="tablewrap scroller"><table class="tbl wkgrid"><thead><tr><th>Fitter</th>' +
      p.days.map(function (d) { return '<th class="num">' + WS.dow3(d) + '<div class="muted sm">' + WS.dateShort(d).slice(0, 2) + '</div></th>'; }).join('') +
      '<th class="num">Total</th><th class="num">Sold</th><th class="num">Recovery</th></tr></thead><tbody>' +
      p.rows.map(function (r) {
        return '<tr><td>' + esc(r.fitter.name) + '<div class="muted sm">' + esc(r.fitter.role) + '</div></td>' +
          r.days.map(function (h) { return '<td class="num">' + (h ? WS.hrs(h) : '<span class="muted">-</span>') + '</td>'; }).join('') +
          '<td class="num b">' + WS.hrs(r.total) + '</td>' +
          '<td class="num">' + WS.money(r.value) + '</td>' +
          '<td class="num">' + pill(r.util + '%', r.util >= 85 ? 'ok' : r.util >= 70 ? 'warn' : 'bad') + '</td></tr>';
      }).join('') +
      '<tr style="background:var(--th)"><td class="b">Everyone</td>' +
      p.days.map(function (d, i) {
        var t = p.rows.reduce(function (s, r) { return s + r.days[i]; }, 0);
        return '<td class="num b">' + (t ? WS.hrs(t) : '-') + '</td>';
      }).join('') +
      '<td class="num b">' + WS.hrs(p.rows.reduce(function (s, r) { return s + r.total; }, 0)) + '</td>' +
      '<td class="num b">' + WS.money(p.rows.reduce(function (s, r) { return s + r.value; }, 0)) + '</td><td></td></tr>' +
      '</tbody></table></div>' +
      '<div class="hint" style="margin-top:10px">Recovery is the share of clocked time that ends up on an invoice. Anything under 70% is time you are paying for and not selling.</div>';
  };

  W.timesheets = function () {
    $('tPrev').onclick = function () { O.tsWeek--; O.render(); };
    $('tNext').onclick = function () { O.tsWeek++; O.render(); };
    $('tThis').onclick = function () { O.tsWeek = 0; O.render(); };
    $('tExp').onclick = function () {
      var p = WS.payroll(O.tsWeek);
      var rows = [['Fitter', 'Role'].concat(p.days.map(function (d) { return WS.dow3(d) + ' ' + WS.dateShort(d); })).concat(['Total', 'Labour sold', 'Recovery %'])];
      p.rows.forEach(function (r) {
        rows.push([r.fitter.name, r.fitter.role].concat(r.days).concat([r.total, r.value, r.util]));
      });
      WS.download('timesheets-' + p.start + '.csv', WS.csv(rows));
      WS.toast('Timesheets downloaded.', 'ok');
    };
  };

  /* ============================ reports ============================ */
  S.reports = function () {
    var st = WS.state, T = WS.day(0);
    var mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    var invM = st.invoices.filter(function (i) { return WS.parse(i.date) >= mStart; });
    var rev = invM.reduce(function (s, i) { return s + i.net; }, 0);
    var cost = invM.reduce(function (s, i) { return s + (i.cost || 0); }, 0);
    var margin = rev ? Math.round((rev - cost) / rev * 1000) / 10 : 0;

    var byOp = {};
    st.invoices.forEach(function (i) { byOp[i.operatorId] = (byOp[i.operatorId] || 0) + i.net; });
    var ops = Object.keys(byOp).map(function (k) { return { o: WS.operator(k), v: byOp[k] }; })
      .filter(function (x) { return x.o; }).sort(function (a, b) { return b.v - a.v; });
    var maxOp = Math.max.apply(null, ops.map(function (x) { return x.v; }).concat([1]));

    var byType = {};
    st.jobs.filter(function (j) { return j.status === 'done'; }).forEach(function (j) {
      byType[j.type] = (byType[j.type] || 0) + 1;
    });
    var types = Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a]; });
    var maxT = Math.max.apply(null, types.map(function (t) { return byType[t]; }).concat([1]));

    var p = WS.payroll(0);
    var recov = p.rows.reduce(function (s, r) { return s + r.total; }, 0);
    var sold = p.rows.reduce(function (s, r) { return s + r.value; }, 0);

    /* estimate against actual, the number that decides whether the standard times are right */
    var dn = st.jobs.filter(function (j) { return j.status === 'done' && j.estHours && WS.hoursOn(j) > 0; });
    var onTime = dn.filter(function (j) { return WS.hoursOn(j) <= j.estHours * 1.1; }).length;
    var accuracy = dn.length ? Math.round(onTime / dn.length * 100) : 0;

    return head('Reports', 'Where the money and the hours actually go',
      '<button class="btn alt sm" id="rExp">Export the lot</button>') +
      '<div class="kpi" style="margin-bottom:18px">' +
      kpi('Invoiced this month', WS.money0(rev), invM.length + ' invoices', 'ok') +
      kpi('Gross margin', margin + '%', 'after parts and fitter time', margin > 45 ? 'ok' : margin > 30 ? 'warn' : 'bad', margin) +
      kpi('Labour recovery', (recov ? Math.round(sold / (recov * st.settings.labourRate) * 100) : 0) + '%', 'clocked time that got sold', 'warn') +
      kpi('Jobs inside the estimate', accuracy + '%', 'of ' + dn.length + ' finished jobs', accuracy > 75 ? 'ok' : accuracy > 55 ? 'warn' : 'bad', accuracy) +
      '</div>' +
      '<div class="grid g2">' +
      '<div class="card"><div class="ch"><h2>Revenue by customer</h2></div>' +
      ops.slice(0, 8).map(function (x) {
        return '<div class="hbar"><div class="nm">' + esc(x.o.name) + '</div>' +
          '<div class="tr"><i style="width:' + Math.max(3, x.v / maxOp * 100) + '%"></i></div>' +
          '<div class="vl">' + WS.money0(x.v) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="card"><div class="ch"><h2>Work by type</h2></div>' +
      types.slice(0, 8).map(function (t) {
        return '<div class="hbar"><div class="nm">' + esc(t) + '</div>' +
          '<div class="tr"><i style="width:' + Math.max(3, byType[t] / maxT * 100) + '%"></i></div>' +
          '<div class="vl">' + byType[t] + ' jobs</div></div>';
      }).join('') + '</div></div>' +
      '<div class="card"><div class="ch"><h2>Fitter productivity this week</h2></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Fitter</th><th class="num">Hours clocked</th>' +
      '<th class="num">Labour sold</th><th class="num">Wage cost</th><th class="num">Contribution</th><th class="num">Recovery</th></tr></thead><tbody>' +
      p.rows.map(function (r) {
        var contrib = r.value - r.cost;
        return '<tr><td>' + esc(r.fitter.name) + '</td>' +
          '<td class="num">' + WS.hrs(r.total) + '</td>' +
          '<td class="num">' + WS.money(r.value) + '</td>' +
          '<td class="num">' + WS.money(r.cost) + '</td>' +
          '<td class="num b" style="color:' + (contrib > 0 ? 'var(--ok)' : 'var(--bad)') + '">' + WS.money(contrib) + '</td>' +
          '<td class="num">' + pill(r.util + '%', r.util >= 85 ? 'ok' : r.util >= 70 ? 'warn' : 'bad') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="hint" style="margin-top:10px">Contribution is what each fitter brought in after their own wages. It is the number Truckfile and AssetMinder will not show you.</div>' +
      '</div>';
  };

  W.reports = function () {
    $('rExp').onclick = function () {
      var st = WS.state, p = WS.payroll(0);
      var rows = [['Workshop report', WS.dateUK(WS.day(0))], [], ['Revenue by customer']];
      var byOp = {};
      st.invoices.forEach(function (i) { byOp[i.operatorId] = (byOp[i.operatorId] || 0) + i.net; });
      Object.keys(byOp).forEach(function (k) { rows.push([(WS.operator(k) || {}).name || '', byOp[k]]); });
      rows.push([]); rows.push(['Fitter', 'Hours', 'Labour sold', 'Wage cost', 'Contribution', 'Recovery %']);
      p.rows.forEach(function (r) { rows.push([r.fitter.name, r.total, r.value, r.cost, r.value - r.cost, r.util]); });
      WS.download('workshop-report-' + WS.day(0) + '.csv', WS.csv(rows));
      WS.toast('Report downloaded.', 'ok');
    };
  };

  /* ============================ settings ============================ */
  S.settings = function () {
    var st = WS.state.settings, x = st.xero;
    return head('Settings', 'Everything the system needs to know about the workshop') +

      '<div class="card"><div class="ch"><h2>Accounts: Xero</h2>' +
      '<div class="sp">' + (WS.xeroOk() ? pill('connected', 'ok') : pill('not connected', 'warn')) + '</div></div>' +
      '<div class="hint" style="margin-bottom:14px">Paste the API key from your Xero app. Once it is in, every invoice you raise ' +
      'posts itself into Xero as a draft, against the right account code and tax rate, with the registration on it as a tracking category. ' +
      'Nothing is sent until you say so.</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Xero API key</span><input class="in" id="xKey" type="password" placeholder="paste the key here" value="' + esc(x.key) + '"></label>' +
      '<label class="f"><span class="lb">Organisation</span><input class="in" id="xTen" placeholder="Noble Commercials Ltd" value="' + esc(x.tenantName) + '"></label>' +
      '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Labour account code</span><input class="in" id="xSales" value="' + esc(x.salesAccount) + '"></label>' +
      '<label class="f"><span class="lb">Parts account code</span><input class="in" id="xParts" value="' + esc(x.partsAccount) + '"></label>' +
      '<label class="f"><span class="lb">Tax rate</span><select class="in" id="xTax">' +
      O.opts(['OUTPUT2', 'OUTPUT', 'ZERORATEDOUTPUT', 'NONE'], x.taxType) + '</select></label>' +
      '</div>' +
      '<label class="inline" style="margin:4px 0 14px"><input type="checkbox" id="xAuto"' + (x.autoSend ? ' checked' : '') + '> ' +
      '<span>Push every new invoice straight into Xero</span></label>' +
      '<div class="inline">' +
      '<button class="btn" id="xConn">' + (WS.xeroOk() ? 'Re-check the connection' : 'Connect to Xero') + '</button>' +
      (WS.xeroOk() ? '<button class="btn alt" id="xOff">Disconnect</button>' : '') +
      '</div>' +
      '<div id="xMsg" style="margin-top:12px"></div></div>' +

      '<div class="card"><div class="ch"><h2>The workshop</h2></div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Business name</span><input class="in" id="sName" value="' + esc(st.name) + '"></label>' +
      '<label class="f"><span class="lb">Short code on the logo</span><input class="in" id="sInit" maxlength="3" value="' + esc(st.initials) + '"></label>' +
      '<label class="f"><span class="lb">Brand colour</span><input class="in swatch" id="sBrand" type="color" value="' + esc(st.brand) + '" style="width:100%;height:42px;padding:3px"></label>' +
      '</div>' +
      '<label class="f"><span class="lb">Address</span><input class="in" id="sAddr" value="' + esc(st.address) + '"></label>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Phone</span><input class="in" id="sPhone" value="' + esc(st.phone) + '"></label>' +
      '<label class="f"><span class="lb">Email</span><input class="in" id="sEmail" value="' + esc(st.email) + '"></label>' +
      '<label class="f"><span class="lb">Website</span><input class="in" id="sWeb" value="' + esc(st.web) + '"></label>' +
      '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">VAT number</span><input class="in" id="sVat" value="' + esc(st.vatNo) + '"></label>' +
      '<label class="f"><span class="lb">Company number</span><input class="in" id="sCo" value="' + esc(st.companyNo) + '"></label>' +
      '<label class="f"><span class="lb">O licence</span><input class="in" id="sOp" value="' + esc(st.opLicence) + '"></label>' +
      '</div>' +
      '<label class="f"><span class="lb">Bank details for the invoice</span><input class="in" id="sBank" value="' + esc(st.bank) + '"></label>' +
      '<button class="btn" id="sSave">Save the workshop details</button></div>' +

      '<div class="card"><div class="ch"><h2>Rates and the working day</h2></div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Labour rate per hour</span><input class="in" id="sRate" type="number" value="' + st.labourRate + '"></label>' +
      '<label class="f"><span class="lb">Parts markup %</span><input class="in" id="sMk" type="number" value="' + st.markup + '"></label>' +
      '<label class="f"><span class="lb">VAT %</span><input class="in" id="sVatP" type="number" value="' + st.vat + '"></label>' +
      '</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Day starts at</span><input class="in" id="sStart" type="number" step="0.25" value="' + st.dayStart + '"></label>' +
      '<label class="f"><span class="lb">Hours in a day</span><input class="in" id="sHours" type="number" step="0.5" value="' + st.dayHours + '"></label>' +
      '<label class="f"><span class="lb">Overtime after</span><input class="in" id="sOt" type="number" step="0.5" value="' + st.overtimeAfter + '"></label>' +
      '</div>' +
      '<button class="btn" id="sRates">Save the rates</button></div>' +

      '<div class="card"><div class="ch"><h2>Standard times</h2>' +
      '<div class="sp"><span class="muted sm">What the planner books out for each job</span></div></div>' +
      '<div class="row">' + Object.keys(st.standardTimes).map(function (k) {
        return '<label class="f"><span class="lb">' + esc(k) + '</span>' +
          '<input class="in std" data-std="' + esc(k) + '" type="number" step="0.25" value="' + st.standardTimes[k] + '"></label>';
      }).join('') + '</div>' +
      '<button class="btn" id="sStd">Save the standard times</button></div>' +

      '<div class="card"><div class="ch"><h2>Fitters</h2><div class="sp"><button class="btn alt sm" id="fAdd">Add a fitter</button></div></div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Name</th><th class="hide-sm">Role</th><th>PIN</th>' +
      '<th class="num hide-sm">Cost per hour</th><th class="num">Pay</th><th class="num">Day</th><th></th></tr></thead><tbody>' +
      st.fitters.map(function (f) {
        return '<tr><td>' + esc(f.name) + '</td><td class="hide-sm muted sm">' + esc(f.role) + '</td>' +
          '<td class="mono">' + esc(f.pin) + '</td>' +
          '<td class="num hide-sm">' + WS.money(f.costRate) + '</td>' +
          '<td class="num">' + esc(WS.payLabel(f)) + '</td>' +
          '<td class="num">' + f.dayHours + 'h</td>' +
          '<td class="num"><button class="btn alt sm" data-fed="' + f.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="card"><div class="ch"><h2>Customer rate cards</h2></div>' +
      '<div class="hint" style="margin-bottom:12px">Each customer can have their own labour rate, parts markup and contract discount. ' +
      'The job card and the invoice use it without anybody having to remember.</div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Customer</th><th class="num">Labour</th>' +
      '<th class="num">Markup</th><th class="num">Discount</th><th class="num hide-sm">Terms</th><th class="num hide-sm">Portal PIN</th><th></th></tr></thead><tbody>' +
      WS.state.operators.map(function (o) {
        return '<tr><td>' + esc(o.name) + '</td>' +
          '<td class="num">' + WS.money(o.labourRate || st.labourRate) + '</td>' +
          '<td class="num">' + (o.markup != null ? o.markup : st.markup) + '%</td>' +
          '<td class="num">' + (o.discount || 0) + '%</td>' +
          '<td class="num hide-sm">' + (o.terms || 30) + ' days</td>' +
          '<td class="num hide-sm mono">' + esc(o.portalPin) + '</td>' +
          '<td class="num"><button class="btn alt sm" data-oed="' + o.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="card"><div class="ch"><h2>How customers hear from you</h2></div>' +
      '<div class="hint" style="margin-bottom:12px">Pick the ways the system tells operators about ready vehicles, extra work and compliance dates.</div>' +
      '<div class="seg">' +
      '<button class="nb' + (st.notify.whatsapp ? ' on' : '') + '" data-nb="whatsapp">WhatsApp</button>' +
      '<button class="nb' + (st.notify.sms ? ' on' : '') + '" data-nb="sms">Text message</button>' +
      '<button class="nb' + (st.notify.email ? ' on' : '') + '" data-nb="email">Email</button>' +
      '</div></div>' +

      '<div class="card"><div class="ch"><h2>Inspection sheet template</h2></div>' +
      '<div class="hint" style="margin-bottom:12px">' + WS.state.template.length + ' sections, ' +
      WS.state.template.reduce(function (s, x) { return s + x.items.length; }, 0) + ' items, to the DVSA Guide to Maintaining Roadworthiness. ' +
      'A signed sheet always keeps the template it was signed against, so changing this never alters an old record.</div>' +
      WS.state.template.map(function (sec) {
        return '<div class="tag" style="margin:0 6px 6px 0">' + esc(sec.name) + ' <b>' + sec.items.length + '</b></div>';
      }).join('') + '</div>' +

      '<div class="card"><div class="ch"><h2>The other apps</h2></div>' +
      '<div class="row">' +
      '<div><div class="b">Fitter app</div><div class="muted sm" style="margin:4px 0 8px">Phone app for the workshop floor</div>' +
      '<a class="btn alt sm" href="fitter.html" target="_blank">Open it</a></div>' +
      '<div><div class="b">Driver app</div><div class="muted sm" style="margin:4px 0 8px">First use walkaround checks</div>' +
      '<a class="btn alt sm" href="driver.html" target="_blank">Open it</a></div>' +
      '<div><div class="b">Customer portal</div><div class="muted sm" style="margin:4px 0 8px">What your operators log into</div>' +
      '<a class="btn alt sm" href="portal.html" target="_blank">Open it</a></div>' +
      '</div></div>' +

      '<div class="card"><div class="ch"><h2>Demo</h2></div>' +
      '<div class="hint" style="margin-bottom:12px">Puts the sample data back the way it was and throws away anything you have changed.</div>' +
      '<button class="btn danger" id="sReset">Reset the demo</button></div>';
  };

  W.settings = function () {
    var st = WS.state.settings;

    $('xConn').onclick = function () {
      var key = $('xKey').value.trim();
      var msg = $('xMsg');
      if (!key) { msg.innerHTML = '<div class="flagbox">Paste the API key from your Xero app first.</div>'; return; }
      if (!WS.xeroKeyLooksRight(key)) {
        msg.innerHTML = '<div class="flagbox">That does not look like a Xero key. They are at least 24 characters, letters and numbers.</div>';
        return;
      }
      msg.innerHTML = '<div class="conn"><span class="bl"></span>Checking the key with Xero...</div>';
      setTimeout(function () {
        st.xero.key = key;
        st.xero.tenantName = $('xTen').value.trim() || st.name;
        st.xero.salesAccount = $('xSales').value;
        st.xero.partsAccount = $('xParts').value;
        st.xero.taxType = $('xTax').value;
        st.xero.autoSend = $('xAuto').checked;
        st.xero.connected = true;
        st.xero.lastSync = WS.nowStamp();
        WS.save();
        O.render();
        WS.toast('Xero connected. New invoices will post themselves.', 'ok');
      }, 900);
    };
    var off = $('xOff');
    if (off) off.onclick = function () {
      st.xero.connected = false; st.xero.key = '';
      WS.save(); O.render();
      WS.toast('Xero disconnected. Invoices go back to CSV export.');
    };

    $('sSave').onclick = function () {
      st.name = $('sName').value || st.name;
      st.initials = ($('sInit').value || 'NC').toUpperCase();
      st.brand = $('sBrand').value;
      st.address = $('sAddr').value; st.phone = $('sPhone').value;
      st.email = $('sEmail').value; st.web = $('sWeb').value;
      st.vatNo = $('sVat').value; st.companyNo = $('sCo').value;
      st.opLicence = $('sOp').value; st.bank = $('sBank').value;
      WS.save();
      WS.applyBrand();
      O.paintBrand();
      O.render();
      WS.toast('Workshop details saved. The logo, the apps and the invoices all follow.', 'ok');
    };

    $('sRates').onclick = function () {
      st.labourRate = parseFloat($('sRate').value) || st.labourRate;
      st.markup = parseFloat($('sMk').value) || 0;
      st.vat = parseFloat($('sVatP').value) || 20;
      st.dayStart = parseFloat($('sStart').value) || 7.5;
      st.dayHours = parseFloat($('sHours').value) || 8;
      st.overtimeAfter = parseFloat($('sOt').value) || 8;
      st.fitters.forEach(function (f) { f.dayHours = st.dayHours; });
      WS.save(); O.render();
      WS.toast('Rates saved.', 'ok');
    };

    $('sStd').onclick = function () {
      document.querySelectorAll('[data-std]').forEach(function (i) {
        st.standardTimes[i.dataset.std] = parseFloat(i.value) || st.standardTimes[i.dataset.std];
      });
      WS.save(); O.render();
      WS.toast('Standard times saved. The planner uses them from now on.', 'ok');
    };

    document.querySelectorAll('[data-nb]').forEach(function (b) {
      b.onclick = function () {
        st.notify[b.dataset.nb] = !st.notify[b.dataset.nb];
        WS.save(); O.render();
      };
    });

    document.querySelectorAll('[data-fed]').forEach(function (b) {
      b.onclick = function () {
        var f = WS.fitter(b.dataset.fed);
        O.modal('Edit ' + f.name,
          '<div class="row"><label class="f"><span class="lb">Name</span><input class="in" id="fN" value="' + esc(f.name) + '"></label>' +
          '<label class="f"><span class="lb">Role</span><input class="in" id="fR" value="' + esc(f.role) + '"></label></div>' +
          '<div class="row"><label class="f"><span class="lb">4 digit PIN</span><input class="in" id="fP" maxlength="4" value="' + esc(f.pin) + '"></label>' +
          '<label class="f"><span class="lb">Cost per hour</span><input class="in" id="fC" type="number" value="' + f.costRate + '"></label>' +
          '<label class="f"><span class="lb">Hours in a day</span><input class="in" id="fH" type="number" step="0.5" value="' + f.dayHours + '"></label></div>' +
          O.payFields(f),
          'Save', function () {
            f.name = $('fN').value || f.name; f.role = $('fR').value;
            f.pin = ($('fP').value || f.pin).replace(/\D/g, '').slice(0, 4) || f.pin;
            f.costRate = parseFloat($('fC').value) || f.costRate;
            f.dayHours = parseFloat($('fH').value) || f.dayHours;
            O.payRead(f);
            WS.save(); O.closeModal(); O.render();
            WS.toast('Saved.', 'ok');
          });
      };
    });
    $('fAdd').onclick = function () {
      O.modal('Add a fitter',
        '<div class="row"><label class="f"><span class="lb">Name</span><input class="in" id="fN"></label>' +
        '<label class="f"><span class="lb">Role</span><input class="in" id="fR" value="HGV technician"></label></div>' +
        '<div class="row"><label class="f"><span class="lb">4 digit PIN</span><input class="in" id="fP" maxlength="4"></label>' +
        '<label class="f"><span class="lb">Cost per hour</span><input class="in" id="fC" type="number" value="22"></label></div>' +
        O.payFields({ payType: 'hour', payRate: 18 }),
        'Add them', function () {
          var nm = $('fN').value.trim();
          if (!nm) { WS.toast('Give them a name.', 'bad'); return; }
          st.fitters.push({
            id: WS.uid('f'), name: nm, role: $('fR').value, pin: ($('fP').value || '9999').replace(/\D/g, '').slice(0, 4),
            costRate: parseFloat($('fC').value) || 22, dayHours: st.dayHours, skills: Object.keys(st.standardTimes)
          });
          O.payRead(st.fitters[st.fitters.length - 1]);
          WS.save(); O.closeModal(); O.render();
          WS.toast(nm + ' added. They can sign into the fitter app now.', 'ok');
        });
    };

    document.querySelectorAll('[data-oed]').forEach(function (b) {
      b.onclick = function () {
        var o = WS.operator(b.dataset.oed);
        O.modal(o.name,
          '<div class="row"><label class="f"><span class="lb">Contact</span><input class="in" id="oC" value="' + esc(o.contact) + '"></label>' +
          '<label class="f"><span class="lb">Phone</span><input class="in" id="oP" value="' + esc(o.phone) + '"></label>' +
          '<label class="f"><span class="lb">Email</span><input class="in" id="oE" value="' + esc(o.email) + '"></label></div>' +
          '<div class="row"><label class="f"><span class="lb">Labour rate</span><input class="in" id="oR" type="number" value="' + (o.labourRate || st.labourRate) + '"></label>' +
          '<label class="f"><span class="lb">Parts markup %</span><input class="in" id="oM" type="number" value="' + (o.markup != null ? o.markup : st.markup) + '"></label>' +
          '<label class="f"><span class="lb">Discount %</span><input class="in" id="oD" type="number" value="' + (o.discount || 0) + '"></label></div>' +
          '<div class="row"><label class="f"><span class="lb">Payment terms (days)</span><input class="in" id="oT" type="number" value="' + (o.terms || 30) + '"></label>' +
          '<label class="f"><span class="lb">Portal PIN</span><input class="in" id="oPin" maxlength="4" value="' + esc(o.portalPin) + '"></label></div>',
          'Save', function () {
            o.contact = $('oC').value; o.phone = $('oP').value; o.email = $('oE').value;
            o.labourRate = parseFloat($('oR').value) || st.labourRate;
            o.markup = parseFloat($('oM').value);
            o.discount = parseFloat($('oD').value) || 0;
            o.terms = parseInt($('oT').value, 10) || 30;
            o.portalPin = ($('oPin').value || o.portalPin).replace(/\D/g, '').slice(0, 4) || o.portalPin;
            WS.save(); O.closeModal(); O.render();
            WS.toast('Rate card saved.', 'ok');
          });
      };
    });

    $('sReset').onclick = function () {
      if (!confirm('Reset the demo back to the sample data?')) return;
      WS.reset();
      location.reload();
    };
  };

  /* off we go */
  O.boot();
})();
