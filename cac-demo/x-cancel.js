/* Cancel an order. From the order's own page or the job drawer: pick a reason, choose who is told, add a
   cancellation charge if there is one, confirm. The supplier gets a cancellation on WhatsApp, the customer an email,
   an unpaid invoice is cancelled, a paid one is flagged for a refund or credit. Undo puts everything back.
   Only orders not yet delivered can be cancelled; a skip already on site is collected instead. Nothing is really sent. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS, V3 = window.CACV3;
    if (!(UI && UI.A && UI.V && CS && CS.S && V3 && V3.find)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ic = window.ic || function () { return ''; };
    var REASONS = ['Customer cancelled', 'Supplier cannot do it', 'Booked in error', 'Other'];
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n) { return '£' + (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
    function S() { return CS.S; }
    function store() { if (!S().xCancel) S().xCancel = {}; return S().xCancel; }
    function layer(html) { var l = document.getElementById('layer'); if (l) l.innerHTML = html; }
    function dayLong(off) { return CS.dayDate(off).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }); }

    /* can this order still be cancelled? Not yet delivered, and not in the past */
    function cancellable(o) {
      if (!o || store()[o.id]) return false;
      if (o.src === 'j') return (o.job.status === 'booked' || o.job.status === 'confirmed') && o.job.day >= 0;
      return o.off > 0;
    }
    UI.xCancellable = function (id) { return cancellable(V3.find(id)); };
    function invFor(id) { return S().invoices.filter(function (i) { return (i.jobs || []).indexOf(id) >= 0; }); }
    function desc(o) { try { return CS.jobDesc(o.src === 'j' ? o.job : o); } catch (e) { return 'the order'; } }

    function drafts(o, reason) {
      var c = CS.cust(o.cust), su = CS.sup(o.sup), s = CS.jobSite(o.src === 'j' ? o.job : o), when = dayLong(o.off).replace(/^\w+ /, function (w) { return w; });
      var supTxt = 'Hi ' + (su.contact || 'there') + ', please cancel ' + o.id + ', ' + desc(o).toLowerCase() + ' at ' + s.name + ', ' + s.pc + ' on ' + when + '. Sorry for the change. Thanks, John (CAC)';
      var custTxt = 'Hi ' + (c.first || c.contact || 'there') + ',\n\n' + (reason === 'Customer cancelled' ? 'As asked, I have cancelled ' : 'I have cancelled ') + o.id + ', ' + desc(o).toLowerCase() + ' at ' + s.name + ' on ' + when + '.' + (reason === 'Supplier cannot do it' ? ' I am sorry about this. If you still need it, reply and I will find another supplier for you.' : '') + '\n\nCheers, John\nCAC Waste Management';
      return { sup: supTxt, cust: custTxt, su: su, c: c };
    }

    A.ordCancel = function (el) {
      var o = V3.find(el.dataset.id);
      if (!cancellable(o)) { layer('<div class="scrim" data-act="close"></div><div class="modal" role="dialog" aria-label="Cannot cancel"><div class="mhd"><h2>This order cannot be cancelled</h2><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><div class="mbd"><p>It has already been delivered or is in the past. If a skip is on site, book a collection instead.</p></div><div class="mft"><span class="sp"></span><button class="btn pri" data-act="close">OK</button></div></div>'); return; }
      var d = drafts(o, REASONS[0]), invs = invFor(o.id), paid = invs.filter(function (i) { return i.status === 'paid'; });
      var invLine = !invs.length ? 'No invoice raised yet, so there is nothing to cancel there.'
        : paid.length ? 'Invoice ' + paid.map(function (i) { return i.id; }).join(', ') + ' is already paid. It will be flagged for a refund or a credit on their account.'
        : 'Invoice ' + invs.map(function (i) { return i.id; }).join(', ') + ' will be cancelled.';
      layer('<div class="scrim" data-act="close"></div><div class="modal xc" role="dialog" aria-label="Cancel order ' + h(o.id) + '"><div class="mhd"><h2>Cancel ' + h(o.id) + '</h2><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><div class="mbd">' +
        '<div class="xc-what"><b>' + h(desc(o)) + '</b><span>' + h(d.c.name) + ' · ' + h(dayLong(o.off)) + ' · ' + h(d.su.name) + ' · ' + money(o.sell) + '</span></div>' +
        '<div class="field"><label>Why</label><div class="xc-chips">' + REASONS.map(function (r, i) { return '<button class="chip' + (i ? '' : ' on') + '" data-act="xcReason" data-v="' + h(r) + '">' + h(r) + '</button>'; }).join('') + '</div></div>' +
        '<label class="xc-tell"><input type="checkbox" id="xcSup" checked> <span>Tell <b>' + h(d.su.name) + '</b> on WhatsApp</span></label><textarea id="xcSupTxt" rows="2" aria-label="Message to the supplier">' + h(d.sup) + '</textarea>' +
        '<label class="xc-tell"><input type="checkbox" id="xcCust" checked> <span>Tell <b>' + h(d.c.contact || d.c.name) + '</b> by email</span></label><textarea id="xcCustTxt" rows="4" aria-label="Email to the customer">' + h(d.cust) + '</textarea>' +
        '<div class="xc-row"><div class="field" style="margin:0"><label for="xcFee">Cancellation charge to the customer (optional)</label><div class="xc-fee"><span>£</span><input id="xcFee" inputmode="decimal" placeholder="0"></div></div><p class="xc-inv">' + ic('receipt') + h(invLine) + '</p></div>' +
        '</div><div class="mft"><button class="btn" data-act="close">Keep the order</button><span class="sp"></span><button class="btn xc-go" data-act="xcGo" data-id="' + h(o.id) + '">' + ic('x') + 'Cancel the order</button></div></div>');
      store().__reason = REASONS[0];
    };
    A.xcReason = function (el) {
      var r = el.dataset.v; store().__reason = r;
      [].forEach.call(document.querySelectorAll('.xc-chips .chip'), function (b) { b.classList.toggle('on', b === el); });
      var go = document.querySelector('[data-act="xcGo"]'), o = go && V3.find(go.dataset.id); if (!o) return;
      var d = drafts(o, r), st = document.getElementById('xcSupTxt'), ct = document.getElementById('xcCustTxt');
      if (st && !st.dataset.edited) st.value = d.sup; if (ct && !ct.dataset.edited) ct.value = d.cust;
    };
    document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'xcSupTxt' || e.target.id === 'xcCustTxt')) e.target.dataset.edited = '1'; });

    A.xcGo = function (el) {
      var o = V3.find(el.dataset.id); if (!cancellable(o)) return;
      var s = S(), reason = store().__reason || REASONS[0], d = drafts(o, reason);
      var tellSup = (document.getElementById('xcSup') || {}).checked !== false, tellCust = (document.getElementById('xcCust') || {}).checked !== false;
      var supTxt = ((document.getElementById('xcSupTxt') || {}).value || d.sup).trim(), custTxt = ((document.getElementById('xcCustTxt') || {}).value || d.cust).trim();
      var fee = parseFloat(String((document.getElementById('xcFee') || {}).value || '').replace(/[^\d.]/g, '')) || 0;
      var rec = { id: o.id, at: Date.now(), reason: reason, src: o.src, fee: fee, msgs: [], invRemoved: [], invEdited: [], invPaid: [], feeInv: null, desc: desc(o), cust: d.c.name, sup: d.su.name, day: o.off };
      if (o.src === 'j') { var ix = s.jobs.indexOf(o.job); rec.job = o.job; rec.jobIx = ix; if (ix >= 0) s.jobs.splice(ix, 1); }
      invFor(o.id).forEach(function (inv) {
        if (inv.status === 'paid') { rec.invPaid.push(inv.id); return; }
        if ((inv.jobs || []).length <= 1) { var k = s.invoices.indexOf(inv); rec.invRemoved.push({ inv: inv, ix: k }); if (k >= 0) s.invoices.splice(k, 1); }
        else { rec.invEdited.push({ inv: inv, jobs: inv.jobs.slice(), amount: inv.amount }); inv.jobs = inv.jobs.filter(function (x) { return x !== o.id; }); inv.amount = Math.max(0, inv.amount - o.sell); }
      });
      if (fee > 0) { var fi = { id: CS.nextId('inv', 'INV-'), cust: o.cust, amount: fee, issued: 0, due: 30, status: 'unpaid', jobs: [], extra: 'Cancellation charge, ' + o.id }; s.invoices.unshift(fi); rec.feeInv = fi.id; }
      function send(party, ch, text) { var th = CS.threadFor(party, ch), m = CS.addMsg(th, 'out', text, { by: 'John' }); th.done = true; th.unread = false; rec.msgs.push({ tid: th.id, at: m.at }); }
      if (tellSup) send({ type: 'supplier', id: o.sup }, 'wa', supTxt);
      if (tellCust) send({ type: 'customer', id: o.cust }, 'email', custTxt);
      if (o.src === 'j') { o.job.log = o.job.log || []; o.job.log.push({ t: 'Cancelled: ' + reason, at: Date.now() }); }
      rec.tellSup = tellSup; rec.tellCust = tellCust;
      store()[o.id] = rec; CS.commit();
      var lines = [];
      if (tellSup) lines.push(h(d.su.name) + ' told on WhatsApp');
      if (tellCust) lines.push(h(d.c.contact || d.c.name) + ' told by email');
      if (rec.invRemoved.length || rec.invEdited.length) lines.push('Invoice ' + rec.invRemoved.map(function (x) { return x.inv.id; }).concat(rec.invEdited.map(function (x) { return x.inv.id; })).join(', ') + ' cancelled');
      if (rec.invPaid.length) lines.push('Invoice ' + rec.invPaid.join(', ') + ' was paid: flagged for a refund or credit');
      if (rec.feeInv) lines.push('Cancellation charge of ' + money(fee) + ' invoiced, ' + rec.feeInv);
      lines.push('Taken off the diary and Live jobs');
      layer('<div class="scrim" data-act="close"></div><div class="modal" role="dialog" aria-label="Order cancelled"><div class="mhd"><h2>' + ic('circle-check') + ' ' + h(o.id) + ' cancelled</h2><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><div class="mbd"><ul class="xc-done">' + lines.map(function (l) { return '<li>' + ic('check') + '<span>' + l + '</span></li>'; }).join('') + '</ul><p class="xc-note">Demo, nothing is really sent.</p></div><div class="mft"><button class="btn" data-act="xcUndo" data-id="' + h(o.id) + '">' + ic('refresh') + 'Undo</button><span class="sp"></span><button class="btn pri" data-act="close">Done</button></div></div>');
    };
    A.xcUndo = function (el) {
      var s = S(), rec = store()[el.dataset.id]; if (!rec) return;
      if (rec.job) s.jobs.splice(Math.max(0, Math.min(rec.jobIx, s.jobs.length)), 0, rec.job);
      if (rec.job && rec.job.log) rec.job.log = rec.job.log.filter(function (l) { return !/^Cancelled: /.test(l.t); });
      rec.invRemoved.slice().reverse().forEach(function (x) { s.invoices.splice(Math.max(0, Math.min(x.ix, s.invoices.length)), 0, x.inv); });
      rec.invEdited.forEach(function (x) { x.inv.jobs = x.jobs; x.inv.amount = x.amount; });
      if (rec.feeInv) s.invoices = s.invoices.filter(function (i) { return i.id !== rec.feeInv; });
      rec.msgs.forEach(function (m) { var th = CS.thread(m.tid); if (th) th.msgs = th.msgs.filter(function (x) { return x.at !== m.at || x.dir !== 'out'; }); });
      delete store()[rec.id]; CS.commit();
      layer(''); try { A.ordOpen({ dataset: { id: rec.id } }); } catch (e) {}
    };

    /* cancelled orders leave the diary, Live jobs and the totals; the Orders page lists today's cancellations with Undo */
    var all0 = V3.all;
    V3.all = function () { var x = store(); return all0.apply(this, arguments).filter(function (o) { return !x[o.id]; }); };
    var ov = V.orders;
    V.orders = function () {
      var html = ov.apply(this, arguments), x = store(), ids = Object.keys(x).filter(function (k) { return k.indexOf('__') !== 0; });
      if (!ids.length) return html;
      return '<div class="xc-strip">' + ic('x') + '<span><b>Cancelled:</b> ' + ids.map(function (k) { var r = x[k]; return '<span class="xc-it">' + h(k) + ', ' + h(r.desc.toLowerCase()) + ' for ' + h(r.cust) + ' <button class="btn sm" data-act="xcUndo" data-id="' + h(k) + '">Undo</button></span>'; }).join('') + '</span></div>' + html;
    };
    if (UI.ui.view === 'orders') UI.render();
  }
  start(0);
})();
