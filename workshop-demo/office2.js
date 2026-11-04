/* Office screens, part 2: the job card, the inspection sheet, authorisations,
   driver checks, quotes, campaigns and the activity log. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var pill = O.pill, chip = O.chip, stat = O.stat, head = O.head, empty = O.empty;

  /* ============================ job card ============================ */
  O.jobCard = function (id) {
    var j = WS.job(id);
    if (!j) return;
    var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId), f = WS.fitter(j.fitterId);
    var q = WS.quoteJob(j), p = WS.jobProgress(j);
    var st = WS.state;
    var open = j.status !== 'done';
    var appr = st.approvals.filter(function (a) { return a.jobId === j.id; });

    var clocks = (j.clockOns || []).map(function (c) {
      var ff = WS.fitter(c.fitterId);
      var mins = c.end ? (new Date(c.end) - new Date(c.start)) / 60000 : (Date.now() - new Date(c.start)) / 60000;
      return '<tr><td>' + esc(ff ? ff.name : '') + '</td><td>' + WS.timeUK(c.start) + '</td>' +
        '<td>' + (c.end ? WS.timeUK(c.end) : '<span class="pill go">on it now</span>') + '</td>' +
        '<td class="num">' + WS.hhmm(mins / 60) + '</td></tr>';
    }).join('');

    var body =
      '<div class="grid g2" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Vehicle</div>' +
      '<div style="font-size:19px;font-weight:800">' + esc(v ? v.reg : 'No vehicle') + '</div>' +
      '<div class="muted sm">' + esc(v ? v.make + ' ' + v.model + ' · ' + v.type : 'Internal work') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Operator</div><div class="b">' + esc(o ? o.name : 'Internal') + '</div></div>' +
      '<div><div class="muted sm">Job</div><div class="b">' + esc(j.no + ' · ' + j.type) + '</div>' +
      '<div style="margin-top:6px">' + pill(WS.statusLabel(j.status), WS.statusCls(j.status)) +
      (j.priority === 'high' ? ' ' + chip('urgent', 'bad') : '') +
      (j.source !== 'Office' ? ' ' + chip('from ' + j.source.toLowerCase(), 'warn') : '') + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Booked for</div><div class="b">' + WS.dayName(j.date) + '</div></div>' +
      '</div>' +

      '<div class="card tight" style="margin-bottom:14px"><div class="row">' +
      '<label class="f" style="margin:0"><span class="lb">Fitter</span><select class="in" id="jFit"' + (open ? '' : ' disabled') + '>' +
      '<option value="">Not planned</option>' + O.opts(st.settings.fitters, j.fitterId, 'id', 'name') + '</select></label>' +
      '<label class="f" style="margin:0"><span class="lb">Bay</span><select class="in" id="jBay"' + (open ? '' : ' disabled') + '>' +
      '<option value="">No bay</option>' + O.opts(st.settings.bays, j.bay) + '</select></label>' +
      '<label class="f" style="margin:0"><span class="lb">Standard time</span><input class="in" id="jEst" type="number" step="0.25" min="0.25" value="' + j.estHours + '"' + (open ? '' : ' disabled') + '></label>' +
      '<label class="f" style="margin:0"><span class="lb">Date</span><input class="in" id="jDate" type="date" value="' + j.date + '"' + (open ? '' : ' disabled') + '></label>' +
      '</div></div>' +

      '<div class="grid g3" style="margin-bottom:16px">' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="l muted sm">Standard time</div><div style="font-size:19px;font-weight:800">' + WS.hrs(p.est) + '</div></div>' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="l muted sm">Clocked so far</div><div style="font-size:19px;font-weight:800">' + WS.hhmm(p.actual) + '</div></div>' +
      '<div class="k" style="background:var(--soft);border-radius:11px;padding:11px 13px"><div class="l muted sm">Against the estimate</div>' +
      '<div style="font-size:19px;font-weight:800;color:' + (p.state === 'over' ? 'var(--bad)' : p.state === 'close' ? 'var(--warn)' : 'var(--ok)') + '">' +
      (p.over > 0.01 ? '+' + WS.hhmm(p.over) : p.actual ? WS.hhmm(p.est - p.actual) + ' left' : 'not started') + '</div></div>' +
      '</div>' +

      (appr.length ? '<h3 style="margin:0 0 8px">Extra work</h3>' + appr.map(function (a) {
        var t = WS.approvalTotals(a);
        return '<div class="appr ' + (a.status === 'Approved' ? 'done' : a.status === 'Declined' ? 'no' : '') + '" style="padding:12px 14px">' +
          '<div class="ah"><div><h3>' + esc(a.title) + '</h3>' +
          '<div class="meta">' + esc(a.raisedBy) + ' · ' + WS.money(t.total) + ' inc VAT</div></div>' +
          '<div class="sp">' + pill(a.status, a.status === 'Approved' ? 'ok' : a.status === 'Declined' ? 'bad' : 'warn') + '</div></div></div>';
      }).join('') : '') +

      '<h3 style="margin:16px 0 8px">Tasks</h3>' +
      '<div class="card tight" style="padding:4px 14px">' +
      (j.tasks || []).map(function (t) {
        return '<div class="task' + (t.done ? ' on' : '') + '" data-task="' + t.id + '"' + (open ? '' : ' style="cursor:default"') + '>' +
          '<div class="bx">✓</div><div class="tx">' + esc(t.text) + '</div></div>';
      }).join('') + '</div>' +

      (j.notes ? '<h3 style="margin:16px 0 6px">Notes</h3><div class="hint">' + esc(j.notes) + '</div>' : '') +

      (j.defects && j.defects.length ? '<h3 style="margin:16px 0 8px">Defects found</h3>' +
        j.defects.map(function (d) {
          return '<div class="flagbox"><b>' + esc(d.item) + '</b><br>' + esc(d.note) +
            (d.rectBy ? '<div class="muted sm" style="margin-top:4px">Rectified by ' + esc(d.rectBy) + ' on ' + WS.dateUK(d.rectAt) + '</div>' : '') + '</div>';
        }).join('') : '') +

      '<h3 style="margin:16px 0 8px">Parts used</h3>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Part</th><th class="hide-sm">Number</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">Charged</th>' + (open ? '<th></th>' : '') + '</tr></thead><tbody>' +
      ((j.parts || []).length ? j.parts.map(function (pt, i) {
        var rc = WS.rateFor(j.operatorId);
        return '<tr><td>' + esc(pt.name) + '</td><td class="hide-sm muted sm">' + esc(pt.partNo || '') + '</td>' +
          '<td class="num">' + pt.qty + '</td><td class="num">' + WS.money(pt.cost * pt.qty) + '</td>' +
          '<td class="num">' + WS.money(pt.cost * pt.qty * (1 + rc.markup / 100)) + '</td>' +
          (open ? '<td class="num"><button class="btn alt sm" data-delpart="' + i + '">Remove</button></td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="6">' + empty('No parts on this job.') + '</td></tr>') +
      '</tbody></table></div>' +
      (open ? '<div style="margin-top:10px"><button class="btn alt sm" id="jAddPart">Add a part</button></div>' : '') +

      (clocks ? '<h3 style="margin:18px 0 8px">Clock ons</h3><div class="tablewrap"><table class="tbl">' +
        '<thead><tr><th>Fitter</th><th>On</th><th>Off</th><th class="num">Time</th></tr></thead><tbody>' + clocks + '</tbody></table></div>' : '') +

      ((j.photos || []).length ? '<h3 style="margin:18px 0 8px">Photos</h3><div class="thumbs">' +
        j.photos.map(function (src, i) { return '<img class="thumb" src="' + src + '" data-ph="' + i + '" alt="Job photo">'; }).join('') + '</div>' : '') +

      '<div class="sep"></div>' +
      '<div class="money">' +
      '<div><span>Labour, ' + WS.hrs(q.hours) + ' at ' + WS.money(q.rate) + '</span><b>' + WS.money(q.labour) + '</b></div>' +
      '<div><span>Parts and materials</span><b>' + WS.money(q.partsNet) + '</b></div>' +
      (q.discount ? '<div><span>Contract discount ' + q.discountPct + '%</span><b>-' + WS.money(q.discount) + '</b></div>' : '') +
      '<div><span>VAT at ' + st.settings.vat + '%</span><b>' + WS.money(q.vat) + '</b></div>' +
      '<div class="g"><span>Total</span><span>' + WS.money(q.total) + '</span></div>' +
      '</div>' +
      '<div class="hint" style="margin-top:8px">Margin on this job is about ' + q.margin + '% after parts cost and fitter time.</div>' +

      (j.qc ? '<div class="note" style="margin-top:14px"><b>QC signed off</b> by ' + esc(j.qc.by) + ' at ' + WS.whenUK(j.qc.at) + '. ' + esc(j.qc.note || '') + '</div>' : '') +
      (j.invoiceId ? '<div class="note" style="margin-top:12px"><b>Invoiced</b> as ' + esc((WS.invoice(j.invoiceId) || {}).no || '') + '.</div>' : '') +

      '<h3 style="margin:18px 0 8px">Audit trail</h3><ul class="tl">' +
      (j.audit || []).slice().reverse().map(function (a) {
        return '<li><span class="w">' + esc(WS.whenUK(a.at)) + '</span><span>' + esc(a.who) + ': ' + esc(a.what) + '</span></li>';
      }).join('') + '</ul>';

    var actions = '';
    if (j.inspection || j.type === 'PMI') actions += '<button class="btn alt" id="jSheet">Inspection sheet</button>';
    if (open) actions += '<button class="btn alt" id="jExtra">Extra work found</button>';
    if (j.status === 'qc') actions += '<button class="btn alt" id="jQc">Pass QC</button>';

    var okLabel = j.status === 'done' && !j.invoiceId ? 'Create invoice' : j.invoiceId ? 'View invoice' : null;
    var m = O.modal(j.no + ' · ' + (v ? v.reg : j.type), body, okLabel, function () {
      if (j.invoiceId) { O.closeModal(); O.invoiceView(j.invoiceId); return; }
      O.createInvoice(j);
    }, 'wide', actions);

    if (open) {
      m.querySelectorAll('[data-task]').forEach(function (t) {
        t.onclick = function () {
          var task = j.tasks.filter(function (x) { return x.id === t.dataset.task; })[0];
          task.done = !task.done;
          t.classList.toggle('on', task.done);
          WS.save();
        };
      });
      $('jFit').onchange = function () {
        j.fitterId = this.value;
        if (this.value) j.order = WS.dayPlan(this.value, j.date).length - 1;
        WS.audit(j, 'Office', this.value ? 'Planned to ' + WS.fitter(this.value).name : 'Taken off the plan');
        WS.save(); O.render(); WS.toast('Fitter updated.');
      };
      $('jBay').onchange = function () {
        j.bay = this.value;
        if (this.value && j.status === 'booked') j.status = 'in_bay';
        WS.audit(j, 'Office', this.value ? 'Moved to ' + this.value : 'Moved out of the bay');
        WS.save(); O.render();
      };
      $('jEst').onchange = function () {
        j.estHours = parseFloat(this.value) || j.estHours;
        WS.audit(j, 'Office', 'Standard time set to ' + WS.hrs(j.estHours));
        WS.save(); O.render();
      };
      $('jDate').onchange = function () {
        j.date = this.value;
        WS.audit(j, 'Office', 'Moved to ' + WS.dayName(j.date));
        WS.save(); O.render(); WS.toast('Moved to ' + WS.dayName(j.date) + '.');
      };
      var ap = $('jAddPart');
      if (ap) ap.onclick = function () { O.addPart(j, function () { O.closeModal(); O.jobCard(j.id); }); };
      m.querySelectorAll('[data-delpart]').forEach(function (b) {
        b.onclick = function () {
          j.parts.splice(parseInt(b.dataset.delpart, 10), 1);
          WS.save(); O.closeModal(); O.jobCard(j.id);
        };
      });
      var ex = $('jExtra');
      if (ex) ex.onclick = function () { O.closeModal(); O.raiseExtra(j, 'Office'); };
    }
    var sh = $('jSheet');
    if (sh) sh.onclick = function () { O.closeModal(); O.sheetView(j.id); };
    var qc = $('jQc');
    if (qc) qc.onclick = function () {
      O.closeModal();
      O.modal('Pass QC on ' + j.no,
        '<div class="hint">The job goes to done and can be invoiced. Your name goes on the record.</div>' +
        '<label class="f" style="margin-top:12px"><span class="lb">Who is signing it off</span><input class="in" id="qBy" value="Dave Mitchell"></label>' +
        '<label class="f"><span class="lb">Note</span><input class="in" id="qNote" placeholder="Checked and road tested"></label>',
        'Pass it', function () {
          j.qc = { by: $('qBy').value || 'Office', at: WS.nowStamp(), note: $('qNote').value };
          j.status = 'done';
          WS.audit(j, j.qc.by, 'QC signed off');
          var vv = WS.vehicle(j.vehicleId), oo = WS.operator(j.operatorId);
          if (vv && oo) {
            WS.notify(oo.contact + ', ' + oo.name, WS.channels(), 'Vehicle ready',
              vv.reg + ' has passed ' + (j.type === 'PMI' ? 'its safety inspection' : 'its ' + j.type.toLowerCase()) + ' and is ready for collection.', 'ready');
          }
          WS.save(); O.closeModal(); O.render();
          WS.toast('QC passed. The operator has been told it is ready.', 'ok');
        });
    };
    m.querySelectorAll('[data-ph]').forEach(function (img) {
      img.onclick = function () { O.modal('Photo', '<img src="' + img.src + '" style="width:100%;border-radius:12px">'); };
    });
  };

  /* add a part, with a stock level and warranty check */
  O.addPart = function (j, after) {
    var st = WS.state;
    var m = O.modal('Add a part to ' + j.no,
      '<label class="f"><span class="lb">Part</span><select class="in" id="pSel">' +
      '<option value="">Pick from stock</option>' +
      st.stock.map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.name + ' · ' + s.partNo + ' · ' + s.qty + ' in bin ' + s.bin) + '</option>';
      }).join('') + '<option value="__other">Something else, type it in</option></select></label>' +
      '<div id="pOther" hidden><div class="row">' +
      '<label class="f"><span class="lb">Name</span><input class="in" id="pName"></label>' +
      '<label class="f"><span class="lb">Cost each</span><input class="in" id="pCost" type="number" step="0.01" value="0"></label></div></div>' +
      '<label class="f"><span class="lb">How many</span><input class="in" id="pQty" type="number" min="1" value="1"></label>' +
      '<div id="pFlag"></div>',
      'Add it', function () {
        var sel = $('pSel').value, qty = parseInt($('pQty').value, 10) || 1;
        var name, cost, partNo = '';
        if (sel === '__other') {
          name = $('pName').value.trim();
          cost = parseFloat($('pCost').value) || 0;
          if (!name) { WS.toast('Give the part a name.', 'bad'); return; }
        } else {
          var s = WS.stockItem(sel);
          if (!s) { WS.toast('Pick a part.', 'bad'); return; }
          name = s.name; cost = s.cost; partNo = s.partNo;
          s.qty = Math.max(0, s.qty - qty);
        }
        j.parts.push({ name: name, partNo: partNo, qty: qty, cost: cost });
        WS.audit(j, 'Office', 'Added ' + qty + ' x ' + name);
        WS.save();
        O.closeModal();
        WS.toast(name + ' added and taken out of stock.', 'ok');
        if (after) after();
      });
    $('pSel').onchange = function () {
      $('pOther').hidden = this.value !== '__other';
      var flag = $('pFlag');
      flag.innerHTML = '';
      var s = WS.stockItem(this.value);
      if (!s) return;
      if (s.qty <= 0) flag.innerHTML = '<div class="flagbox">None in stock. It will go on a purchase order.</div>';
      else if (s.qty <= s.min) flag.innerHTML = '<div class="flagbox">Only ' + s.qty + ' left, minimum is ' + s.min + '.</div>';
      var wf = WS.warrantyFlag(j.vehicleId, s.name);
      if (wf) flag.innerHTML += '<div class="note" style="margin-top:8px"><b>Warranty check.</b> One of these was fitted to this vehicle ' +
        wf.monthsAgo + ' months ago on ' + esc(wf.job.no) + ', inside the ' + wf.warranty + ' month warranty. Claim it before you charge for it.</div>';
    };
    return m;
  };

  /* ============================ extra work found ============================ */
  O.raiseExtra = function (j, who) {
    var v = WS.vehicle(j.vehicleId), o = WS.operator(j.operatorId);
    var rc = WS.rateFor(j.operatorId);
    O.modal('Extra work found on ' + (v ? v.reg : j.no),
      '<div class="hint">This goes to ' + esc(o ? o.contact : 'the operator') + ' at ' + esc(o ? o.name : '') +
      ' by ' + esc(WS.channels()) + ', with the photos and the price. The job waits until they answer.</div>' +
      '<label class="f" style="margin-top:12px"><span class="lb">What have you found</span>' +
      '<input class="in" id="xTitle" placeholder="Nearside front brake discs below limit"></label>' +
      '<label class="f"><span class="lb">Tell them what you can see</span>' +
      '<textarea class="in" id="xDetail" placeholder="Both discs scored past the wear groove, pads down to 3 mm. It will not pass a brake test like this."></textarea></label>' +
      '<div class="row"><label class="f"><span class="lb">Extra time needed</span>' +
      '<input class="in" id="xHours" type="number" step="0.25" min="0.25" value="2"></label>' +
      '<label class="f"><span class="lb">Labour rate</span><input class="in" value="' + WS.money(rc.rate) + '" disabled></label></div>' +
      '<label class="f"><span class="lb">Parts needed</span>' +
      '<select class="in" id="xPart"><option value="">None</option>' +
      WS.state.stock.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name + ' · ' + WS.money(s.cost)) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="f"><span class="lb">How many</span><input class="in" id="xQty" type="number" min="1" value="1"></label>' +
      '<div id="xTot" class="money"></div>',
      'Send it for authorisation', function () {
        var title = $('xTitle').value.trim();
        if (!title) { WS.toast('Say what you have found.', 'bad'); return; }
        var parts = [];
        var sp = WS.stockItem($('xPart').value);
        if (sp) parts.push({ name: sp.name, qty: parseInt($('xQty').value, 10) || 1, cost: sp.cost });
        var a = {
          id: WS.uid('a'), jobId: j.id, operatorId: j.operatorId, vehicleId: j.vehicleId,
          raisedBy: who, raisedAt: WS.nowStamp(),
          title: title, detail: $('xDetail').value,
          estHours: parseFloat($('xHours').value) || 1, parts: parts, photos: [],
          status: 'Sent', sentAt: WS.nowStamp(), decidedAt: '', decidedBy: '', channel: WS.channels()
        };
        WS.state.approvals.push(a);
        j.status = 'waiting_auth';
        WS.audit(j, who, 'Raised extra work for authorisation: ' + title);
        var t = WS.approvalTotals(a);
        WS.notify((o ? o.contact + ', ' + o.name : 'the operator'), WS.channels(), 'Extra work needs your OK',
          'We have found something on ' + (v ? v.reg : 'your vehicle') + ' that needs your authorisation: ' + title +
          '. ' + WS.money(t.total) + ' inc VAT. Photos and the full price are on your portal.', 'approval');
        WS.save();
        O.closeModal();
        O.go('approvals');
        WS.toast('Sent to ' + (o ? o.contact : 'the operator') + ' by ' + WS.channels() + '.', 'ok');
      });
    function recalc() {
      var sp = WS.stockItem($('xPart').value);
      var hours = parseFloat($('xHours').value) || 0;
      var qty = parseInt($('xQty').value, 10) || 1;
      var labour = hours * rc.rate;
      var parts = sp ? sp.cost * qty * (1 + rc.markup / 100) : 0;
      var net = labour + parts, vat = net * WS.state.settings.vat / 100;
      $('xTot').innerHTML =
        '<div><span>Labour ' + WS.hrs(hours) + '</span><b>' + WS.money(labour) + '</b></div>' +
        '<div><span>Parts</span><b>' + WS.money(parts) + '</b></div>' +
        '<div><span>VAT</span><b>' + WS.money(vat) + '</b></div>' +
        '<div class="g"><span>They will be asked to approve</span><span>' + WS.money(net + vat) + '</span></div>';
    }
    ['xHours', 'xPart', 'xQty'].forEach(function (id) {
      var el = $(id);
      el.oninput = recalc; el.onchange = recalc;
    });
    recalc();
    setTimeout(function () { $('xTitle').focus(); }, 60);
  };

  /* ============================ authorisations ============================ */
  S.approvals = function () {
    var st = WS.state;
    var tab = O.tab.appr || 'open';
    var all = st.approvals.slice().sort(function (a, b) { return String(b.raisedAt).localeCompare(String(a.raisedAt)); });
    var open = all.filter(function (a) { return a.status === 'Sent' || a.status === 'Draft'; });
    var list = tab === 'open' ? open : tab === 'yes' ? all.filter(function (a) { return a.status === 'Approved'; })
      : tab === 'no' ? all.filter(function (a) { return a.status === 'Declined'; }) : all;
    var waiting = open.reduce(function (s2, a) { return s2 + WS.approvalTotals(a).total; }, 0);

    return head('Authorisations', 'Extra work the fitters have found that the customer has to say yes to',
      '<button class="btn alt sm" id="aPortal">Open the customer portal</button>') +
      '<div class="grid g3" style="margin-bottom:16px">' +
      stat('Waiting on a reply', open.length, open.length ? 'jobs are stopped' : 'nothing pending', open.length ? 'warn' : 'ok') +
      stat('Value held up', WS.money0(waiting), 'inc VAT', waiting ? 'warn' : '') +
      stat('Approved this month', all.filter(function (a) { return a.status === 'Approved'; }).length, 'extra work sold', 'ok') +
      '</div>' +
      '<div class="ptab">' +
      [['open', 'Waiting', open.length], ['yes', 'Approved', all.filter(function (a) { return a.status === 'Approved'; }).length],
       ['no', 'Declined', all.filter(function (a) { return a.status === 'Declined'; }).length], ['all', 'Everything', all.length]].map(function (t) {
        return '<button data-tab="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '<span class="n">' + t[2] + '</span></button>';
      }).join('') + '</div>' +
      (list.length ? list.map(function (a) {
        var v = WS.vehicle(a.vehicleId), o = WS.operator(a.operatorId), t = WS.approvalTotals(a);
        var cls = a.status === 'Approved' ? 'done' : a.status === 'Declined' ? 'no' : '';
        return '<div class="appr ' + cls + '">' +
          '<div class="ah"><div><h3>' + esc(a.title) + '</h3>' +
          '<div class="meta">' + esc(v ? v.reg : '') + ' · ' + esc(o ? o.name : '') + ' · found by ' + esc(a.raisedBy) + ' at ' + esc(WS.timeUK(a.raisedAt)) + '</div></div>' +
          '<div class="sp">' + pill(a.status === 'Sent' ? 'Waiting on ' + (o ? o.contact.split(' ')[0] : 'them') : a.status,
            a.status === 'Approved' ? 'ok' : a.status === 'Declined' ? 'bad' : 'warn') + '</div></div>' +
          '<div class="det">' + esc(a.detail) + '</div>' +
          '<div class="money">' +
          '<div><span>Extra labour ' + WS.hrs(a.estHours) + ' at ' + WS.money(t.rate) + '</span><b>' + WS.money(t.labour) + '</b></div>' +
          (a.parts.length ? '<div><span>' + esc(a.parts.map(function (p) { return p.qty + ' x ' + p.name; }).join(', ')) + '</span><b>' + WS.money(t.parts) + '</b></div>' : '') +
          '<div><span>VAT</span><b>' + WS.money(t.vat) + '</b></div>' +
          '<div class="g"><span>Total</span><span>' + WS.money(t.total) + '</span></div></div>' +
          '<div class="inline" style="margin-top:12px">' +
          (a.status === 'Sent'
            ? '<button class="btn alt sm" data-chase="' + a.id + '">Chase them</button>' +
              '<button class="btn alt sm" data-aview="' + a.id + '">See what they see</button>' +
              '<span class="muted sm right">Sent by ' + esc(a.channel) + ' at ' + esc(WS.timeUK(a.sentAt)) + '</span>'
            : '<span class="muted sm">' + esc(a.status) + ' by ' + esc(a.decidedBy || (o ? o.contact : '')) + ' at ' + esc(WS.whenUK(a.decidedAt)) + '</span>') +
          '</div></div>';
      }).join('') : '<div class="card">' + empty('Nothing here.') + '</div>');
  };

  W.approvals = function () {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { O.tab.appr = b.dataset.tab; O.render(); };
    });
    document.querySelectorAll('[data-chase]').forEach(function (b) {
      b.onclick = function () {
        var a = WS.approval(b.dataset.chase), o = WS.operator(a.operatorId), v = WS.vehicle(a.vehicleId);
        WS.notify(o.contact + ', ' + o.name, WS.channels(), 'Reminder: extra work on ' + (v ? v.reg : ''),
          'Just a reminder that ' + (v ? v.reg : 'your vehicle') + ' is waiting on your OK for ' + a.title + '.', 'approval');
        WS.save();
        WS.toast('Chased ' + o.contact + ' by ' + WS.channels() + '.', 'ok');
      };
    });
    document.querySelectorAll('[data-aview]').forEach(function (b) {
      b.onclick = function () {
        var a = WS.approval(b.dataset.aview);
        window.open('portal.html#' + (WS.operator(a.operatorId) || {}).id, '_blank');
      };
    });
    var p = $('aPortal');
    if (p) p.onclick = function () { window.open('portal.html', '_blank'); };
  };

  /* ============================ driver checks ============================ */
  S.checks = function () {
    var st = WS.state, T = WS.day(0);
    var today = st.checks.filter(function (c) { return c.date === T; })
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var withDef = today.filter(function (c) { return c.defects.length; });
    var missing = st.drivers.filter(function (d) {
      return !st.checks.some(function (c) { return c.driverId === d.id && c.date === T; });
    });

    return head('Driver checks', 'First use checks sent in from the drivers this morning',
      '<button class="btn alt sm" id="ckApp">Open the driver app</button>') +
      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Checks in today', today.length + ' of ' + st.drivers.length, missing.length ? missing.length + ' not done yet' : 'everyone has checked in',
        missing.length ? 'warn' : 'ok') +
      stat('Defects reported', withDef.length, withDef.length ? 'needs a job card' : 'all nil defect', withDef.length ? 'bad' : 'ok') +
      stat('Turned into jobs', today.filter(function (c) { return c.jobId; }).length, 'already on the board', 'ok') +
      stat('Nil defect', today.length - withDef.length, 'nothing found', 'ok') +
      '</div>' +
      (missing.length ? '<div class="flagbox" style="margin-bottom:14px"><b>Not checked in yet:</b> ' +
        esc(missing.map(function (d) { return d.name; }).join(', ')) + '. The operator should be chasing these.</div>' : '') +
      '<div class="tablewrap"><table class="tbl"><thead><tr>' +
      '<th>Time</th><th>Driver</th><th>Vehicle</th><th class="hide-sm">Where</th><th>Result</th><th></th></tr></thead><tbody>' +
      (today.length ? today.map(function (c) {
        var d = WS.driver(c.driverId), v = WS.vehicle(c.vehicleId);
        var def = c.defects[0];
        return '<tr class="click" data-ck="' + c.id + '"><td>' + esc(WS.timeUK(c.at)) + '</td>' +
          '<td>' + esc(d ? d.name : '') + '</td>' +
          '<td><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
          '<td class="hide-sm muted sm">' + esc(c.location || '') + '</td>' +
          '<td>' + (def ? pill(def.severity + ': ' + def.item, def.severity === 'Dangerous' ? 'bad' : 'warn') : pill('Nil defect', 'ok')) + '</td>' +
          '<td class="num">' + (c.jobId ? chip('job raised', 'ok') : def ? '<button class="btn sm" data-mkjob="' + c.id + '">Raise a job</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6">' + empty('No checks in yet today.') + '</td></tr>') +
      '</tbody></table></div>';
  };

  W.checks = function () {
    document.querySelectorAll('[data-ck]').forEach(function (r) {
      r.onclick = function (e) { if (e.target.closest('button')) return; O.checkView(r.dataset.ck); };
    });
    document.querySelectorAll('[data-mkjob]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); O.jobFromCheck(b.dataset.mkjob); };
    });
    $('ckApp').onclick = function () { window.open('driver.html', '_blank'); };
  };

  O.checkView = function (id) {
    var c = WS.check(id), d = WS.driver(c.driverId), v = WS.vehicle(c.vehicleId);
    var body = '<div class="grid g3" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Driver</div><div class="b">' + esc(d ? d.name : '') + '</div></div>' +
      '<div><div class="muted sm">Vehicle</div><div class="b">' + esc(v ? v.reg : '') + '</div></div>' +
      '<div><div class="muted sm">When and where</div><div class="b">' + esc(WS.whenUK(c.at)) + '</div>' +
      '<div class="muted sm">' + esc(c.location || '') + '</div></div></div>' +
      (c.defects.length ? c.defects.map(function (df) {
        return '<div class="flagbox"><b>' + esc(df.severity) + ' · ' + esc(df.item) + '</b><br>' + esc(df.note) + '</div>';
      }).join('') : '<div class="note">Nil defect. The driver checked every item and found nothing.</div>') +
      c.sections.map(function (sec) {
        var bad = sec.items.filter(function (i) { return i.state === 'D'; }).length;
        return '<div class="isec"><div class="sh">' + esc(sec.name) +
          '<span class="cnt">' + (bad ? bad + ' defect' : 'all clear') + '</span></div>' +
          sec.items.map(function (i) {
            return '<div class="iitem"><div class="nm">' + esc(i.name) + '</div>' +
              pill(i.state === 'D' ? 'Defect' : 'Serviceable', i.state === 'D' ? 'bad' : 'ok') + '</div>';
          }).join('') + '</div>';
      }).join('');
    O.modal('Driver check · ' + (v ? v.reg : ''), body,
      c.defects.length && !c.jobId ? 'Raise a job card' : null,
      function () { O.closeModal(); O.jobFromCheck(id); }, 'wide');
  };

  O.jobFromCheck = function (id) {
    var c = WS.check(id), v = WS.vehicle(c.vehicleId), df = c.defects[0];
    var n = 1000 + WS.state.jobs.length + 1;
    var j = {
      id: WS.uid('j'), no: 'JC' + n, vehicleId: c.vehicleId, operatorId: c.operatorId,
      type: 'Defect', date: WS.day(0), bay: '', fitterId: '',
      estHours: WS.stdTime('Defect'), order: 99,
      priority: df && df.severity === 'Dangerous' ? 'high' : 'normal',
      source: 'Driver check', status: 'booked',
      tasks: WS.JOB_TASKS['Defect'].map(function (t, i) { return { id: 't' + i, text: t, done: false }; }),
      notes: 'Driver check ' + WS.timeUK(c.at) + ': ' + (df ? df.item + '. ' + df.note : ''),
      parts: [], clockOns: [], photos: [], inspection: null,
      defects: df ? [{ item: df.item, note: df.note, rectBy: '', rectAt: '', photo: df.photo || '' }] : [],
      qc: null, invoiceId: '', createdAt: WS.nowStamp(),
      audit: [{ at: WS.nowStamp(), who: 'Office', what: 'Job card raised from the driver check' }]
    };
    WS.state.jobs.push(j);
    c.jobId = j.id;
    if (df && df.severity === 'Dangerous' && v) {
      v.vor = true;
      v.notes = 'Off road after a driver defect report: ' + df.item;
    }
    WS.save();
    O.closeModal();
    O.render();
    WS.toast(j.no + ' raised from ' + (v ? v.reg : '') + '. Plan it onto a fitter.', 'ok');
  };

  /* ============================ quotes ============================ */
  S.quotes = function () {
    var st = WS.state;
    var list = st.quotes.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var open = list.filter(function (q) { return q.status === 'Sent'; });
    var val = open.reduce(function (s2, q) { return s2 + WS.quoteTotals(q).total; }, 0);
    return head('Quotes', 'Priced work out with the customer before it starts',
      '<button class="btn" id="qNew">New quote</button>') +
      '<div class="grid g3" style="margin-bottom:16px">' +
      stat('Out with customers', open.length, WS.money0(val) + ' of work', open.length ? 'warn' : '') +
      stat('Accepted', list.filter(function (q) { return q.status === 'Accepted'; }).length, 'ready to book in', 'ok') +
      stat('Win rate', (function () {
        var dec = list.filter(function (q) { return q.status === 'Accepted' || q.status === 'Declined'; });
        return dec.length ? Math.round(list.filter(function (q) { return q.status === 'Accepted'; }).length / dec.length * 100) + '%' : 'n/a';
      })(), 'of quotes decided', 'ok') +
      '</div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Quote</th><th>Customer</th><th class="hide-sm">Vehicle</th>' +
      '<th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (q) {
        var o = WS.operator(q.operatorId), v = WS.vehicle(q.vehicleId), t = WS.quoteTotals(q);
        return '<tr class="click" data-q="' + q.id + '"><td>' + esc(q.no) + '<div class="muted sm">' + esc(q.title) + '</div></td>' +
          '<td>' + esc(o ? o.name : '') + '</td>' +
          '<td class="hide-sm"><span class="reg">' + esc(v ? v.reg : '') + '</span></td>' +
          '<td class="num">' + WS.money(t.total) + '</td>' +
          '<td>' + pill(q.status, q.status === 'Accepted' ? 'ok' : q.status === 'Declined' ? 'bad' : q.status === 'Sent' ? 'warn' : '') + '</td>' +
          '<td class="num"><span class="muted sm">Open ›</span></td></tr>';
      }).join('') : '<tr><td colspan="6">' + empty('No quotes yet.') + '</td></tr>') +
      '</tbody></table></div>';
  };

  W.quotes = function () {
    document.querySelectorAll('[data-q]').forEach(function (r) { r.onclick = function () { O.quoteView(r.dataset.q); }; });
    $('qNew').onclick = function () { O.newQuote(); };
  };

  O.quoteView = function (id) {
    var q = WS.quote(id), o = WS.operator(q.operatorId), v = WS.vehicle(q.vehicleId), t = WS.quoteTotals(q);
    var body = '<div class="grid g3" style="margin-bottom:14px">' +
      '<div><div class="muted sm">Customer</div><div class="b">' + esc(o ? o.name : '') + '</div></div>' +
      '<div><div class="muted sm">Vehicle</div><div class="b">' + esc(v ? v.reg : '') + '</div></div>' +
      '<div><div class="muted sm">Raised</div><div class="b">' + WS.dateUK(q.date) + '</div></div></div>' +
      '<h3 style="margin:0 0 8px">' + esc(q.title) + '</h3>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody>' +
      q.lines.map(function (l) {
        return '<tr><td>' + esc(l.desc) + '<div class="muted sm">' + esc(l.kind) + '</div></td>' +
          '<td class="num">' + l.qty + '</td><td class="num">' + WS.money(l.unit) + '</td>' +
          '<td class="num">' + WS.money(l.qty * l.unit) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="money" style="margin-top:12px"><div><span>Net</span><b>' + WS.money(t.net) + '</b></div>' +
      '<div><span>VAT</span><b>' + WS.money(t.vat) + '</b></div>' +
      '<div class="g"><span>Total</span><span>' + WS.money(t.total) + '</span></div></div>';
    var extra = q.status === 'Draft' ? '<button class="btn alt" id="qSend">Send it to the customer</button>' :
      q.status === 'Sent' ? '<button class="btn alt" id="qAcc">Mark as accepted</button>' : '';
    O.modal(q.no, body, q.status === 'Accepted' ? 'Book the work in' : null, function () {
      O.bookinDraft = { op: q.operatorId, veh: q.vehicleId, type: 'Repair', est: q.lines.filter(function (l) { return l.kind === 'Labour'; }).reduce(function (s2, l) { return s2 + l.qty; }, 0) || 2 };
      O.closeModal(); O.go('bookin');
    }, 'wide', extra);
    var sd = $('qSend');
    if (sd) sd.onclick = function () {
      q.status = 'Sent'; q.sentAt = WS.nowStamp();
      WS.notify(o.contact + ', ' + o.name, WS.channels(), 'Quote ' + q.no, q.title + ' · ' + WS.money(t.total) + ' inc VAT.', 'quote');
      WS.save(); O.closeModal(); O.render();
      WS.toast('Quote sent to ' + o.contact + '.', 'ok');
    };
    var ac = $('qAcc');
    if (ac) ac.onclick = function () {
      q.status = 'Accepted'; q.decidedAt = WS.nowStamp();
      WS.save(); O.closeModal(); O.render();
      WS.toast('Marked as accepted.', 'ok');
    };
  };

  O.newQuote = function () {
    var st = WS.state;
    O.modal('New quote',
      '<div class="row"><label class="f"><span class="lb">Customer</span><select class="in" id="qOp">' +
      O.opts(st.operators, '', 'id', 'name') + '</select></label>' +
      '<label class="f"><span class="lb">Vehicle</span><select class="in" id="qVeh"></select></label></div>' +
      '<label class="f"><span class="lb">What is it for</span><input class="in" id="qTitle" placeholder="Brake overhaul, drive axle"></label>' +
      '<div class="row"><label class="f"><span class="lb">Labour hours</span><input class="in" id="qLh" type="number" step="0.25" value="3"></label>' +
      '<label class="f"><span class="lb">Parts cost to you</span><input class="in" id="qPc" type="number" step="0.01" value="0"></label></div>' +
      '<div id="qPrev" class="money"></div>',
      'Create the quote', function () {
        var opId = $('qOp').value, rc = WS.rateFor(opId);
        var lh = parseFloat($('qLh').value) || 0, pc = parseFloat($('qPc').value) || 0;
        var title = $('qTitle').value.trim() || 'Workshop work';
        var lines = [{ kind: 'Labour', desc: title, qty: lh, unit: rc.rate }];
        if (pc) lines.push({ kind: 'Part', desc: 'Parts and materials', qty: 1, unit: Math.round(pc * (1 + rc.markup / 100) * 100) / 100 });
        var q = {
          id: WS.uid('q'), no: 'QT-' + (2043 + st.quotes.length + 1), operatorId: opId,
          vehicleId: $('qVeh').value, date: WS.day(0), title: title, lines: lines,
          status: 'Draft', sentAt: '', decidedAt: ''
        };
        st.quotes.push(q);
        WS.save(); O.closeModal(); O.render();
        WS.toast(q.no + ' created as a draft.', 'ok');
      });
    function fillV() {
      var list = WS.vehiclesOf($('qOp').value);
      $('qVeh').innerHTML = list.map(function (v) { return '<option value="' + v.id + '">' + esc(v.reg) + '</option>'; }).join('');
    }
    function prev() {
      var rc = WS.rateFor($('qOp').value);
      var lh = parseFloat($('qLh').value) || 0, pc = parseFloat($('qPc').value) || 0;
      var net = lh * rc.rate + pc * (1 + rc.markup / 100);
      var vat = net * st.settings.vat / 100;
      $('qPrev').innerHTML = '<div><span>Labour at ' + WS.money(rc.rate) + '</span><b>' + WS.money(lh * rc.rate) + '</b></div>' +
        '<div><span>Parts plus ' + rc.markup + '%</span><b>' + WS.money(pc * (1 + rc.markup / 100)) + '</b></div>' +
        '<div class="g"><span>Total inc VAT</span><span>' + WS.money(net + vat) + '</span></div>';
    }
    $('qOp').onchange = function () { fillV(); prev(); };
    ['qLh', 'qPc'].forEach(function (i) { $(i).oninput = prev; });
    fillV(); prev();
  };

  /* ============================ campaigns and recalls ============================ */
  S.campaigns = function () {
    var st = WS.state;
    return head('Campaigns and recalls', 'Jobs that apply to a group of vehicles, tracked until every one is done',
      '<button class="btn alt sm" data-go="library">Technical library</button><button class="btn" id="cNew">New campaign</button>') +
      st.campaigns.map(function (c) {
        var hits = st.vehicles.filter(function (v) {
          return (c.applies.make && c.applies.make === v.make) || (c.applies.type && c.applies.type === v.type);
        });
        var done = hits.filter(function (v) { return c.done.indexOf(v.id) >= 0; });
        var pct = hits.length ? Math.round(done.length / hits.length * 100) : 100;
        var du = WS.dueState(c.due);
        return '<div class="card"><div class="ch"><div><h2>' + esc(c.ref) + ' · ' + esc(c.title) + '</h2>' +
          '<div class="sub muted sm">' + esc(c.kind) + ' · applies to ' + esc(c.applies.make || c.applies.type) + '</div></div>' +
          '<div class="sp">' + pill(du.label, du.cls) + '</div></div>' +
          '<div class="hint" style="margin-bottom:12px">' + esc(c.detail) + '</div>' +
          '<div class="inline" style="margin-bottom:8px"><b>' + done.length + ' of ' + hits.length + ' done</b>' +
          '<span class="muted sm">' + pct + '%</span></div>' +
          '<div class="gauge"><i class="' + (pct === 100 ? 'ok' : pct > 50 ? 'warn' : 'bad') + '" style="width:' + Math.max(2, pct) + '%"></i></div>' +
          '<div class="tablewrap" style="margin-top:12px"><table class="tbl"><tbody>' +
          hits.map(function (v) {
            var isDone = c.done.indexOf(v.id) >= 0;
            return '<tr><td><span class="reg">' + esc(v.reg) + '</span> <span class="muted sm">' + esc(v.make + ' ' + v.model) + '</span></td>' +
              '<td>' + esc((WS.operator(v.operatorId) || {}).name || '') + '</td>' +
              '<td class="num">' + (isDone ? pill('done', 'ok') :
                '<button class="btn alt sm" data-camp="' + c.id + '" data-cv="' + v.id + '">Mark done</button>') + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }).join('');
  };

  W.campaigns = function () {
    document.querySelectorAll('[data-camp]').forEach(function (b) {
      b.onclick = function () {
        var c = WS.state.campaigns.filter(function (x) { return x.id === b.dataset.camp; })[0];
        c.done.push(b.dataset.cv);
        WS.save(); O.render();
        WS.toast('Marked off the campaign.', 'ok');
      };
    });
    $('cNew').onclick = function () {
      var makes = WS.state.vehicles.map(function (v) { return v.make; }).filter(function (m, i, a) { return a.indexOf(m) === i; });
      O.modal('New campaign',
        '<label class="f"><span class="lb">Reference</span><input class="in" id="cRef" placeholder="INT-010"></label>' +
        '<label class="f"><span class="lb">Title</span><input class="in" id="cTitle"></label>' +
        '<div class="row"><label class="f"><span class="lb">Kind</span><select class="in" id="cKind">' +
        O.opts(['Internal campaign', 'Manufacturer recall', 'Software update', 'Safety notice']) + '</select></label>' +
        '<label class="f"><span class="lb">Applies to make</span><select class="in" id="cMake">' + O.opts(makes) + '</select></label>' +
        '<label class="f"><span class="lb">Do it by</span><input class="in" id="cDue" type="date" value="' + WS.day(30) + '"></label></div>' +
        '<label class="f"><span class="lb">What to do</span><textarea class="in" id="cDet"></textarea></label>',
        'Create it', function () {
          WS.state.campaigns.push({
            id: WS.uid('c'), ref: $('cRef').value || 'INT', title: $('cTitle').value || 'Campaign',
            kind: $('cKind').value, applies: { make: $('cMake').value }, detail: $('cDet').value,
            due: $('cDue').value, created: WS.day(0), done: []
          });
          WS.save(); O.closeModal(); O.render();
          WS.toast('Campaign created and applied to every matching vehicle.', 'ok');
        });
    };
    O.wireGo();
  };

  S.library = function () {
    return head('Technical library', 'Torque settings, schedules and procedures the fitters can pull up on the phone') +
      WS.state.library.map(function (l) {
        return '<div class="card"><div class="ch"><div><h2>' + esc(l.title) + '</h2>' +
          '<div class="sub muted sm">' + esc(l.kind) + ' · ' + esc(l.applies) + '</div></div></div>' +
          '<div class="hint">' + esc(l.body) + '</div></div>';
      }).join('');
  };

  /* ============================ activity log ============================ */
  S.alerts = function () {
    var st = WS.state;
    var items = (st.notifications || []).map(function (n) {
      return '<li><div class="ic ' + (n.kind === 'approval' ? 'warn' : n.kind === 'ready' ? 'ok' : 'go') + '">' +
        (n.channel.indexOf('WhatsApp') >= 0 ? '◎' : n.channel === 'SMS' ? '✉' : '@') + '</div>' +
        '<div style="min-width:0"><div class="t">' + esc(n.subject) + '</div>' +
        '<div class="s">' + esc(n.body) + '</div>' +
        '<div class="s muted">To ' + esc(n.to) + ' by ' + esc(n.channel) + '</div></div>' +
        '<div class="w">' + esc(WS.whenUK(n.at)) + '</div></li>';
    }).join('');
    return head('Activity', 'Everything the system has sent out on your behalf') +
      '<div class="note" style="margin-bottom:14px">In the demo nothing actually leaves the browser. On the real system these go out by WhatsApp, text and email.</div>' +
      '<div class="card">' + (items ? '<ul class="feed">' + items + '</ul>' : empty('Nothing sent yet.')) + '</div>';
  };
  W.alerts = function () { };
})();
