/* The yard office: one inbox for every channel, permits from applied to expired, chases, the order diary, History,
   documents for every job (invoice, booking confirmation, transfer note, tip ticket), Waste out, our own lorries in Waste in,
   extra weight added to the invoice by itself, and Defra uploads. Sample data in this browser only. Nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && K && window.DSGNAV && window.DSGWASTEIN && window.DSGY3)) { if ((tries || 0) < 240) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, money = CS.money, gbp = YC.gbp;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, plural = K.plural, modal = K.modal, save = K.save;
    function dDate(off) { return YC.dayDate(off).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    function dLong(off) { return YC.dayDate(off).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    function cname(cust, o) { return o && o.cname ? o.cname : YC.custName(S(), cust); }
    function view(k, g, n, icn, sub) { var v = UI.VIEWS.filter(function (x) { return x.k === k; })[0]; if (!v) { v = { k: k }; UI.VIEWS.push(v); } v.g = g; v.n = n; v.ic = icn; v.sub = sub; v.hide = false; return v; }

    /* ======================================================================
       ORDERS: today's and booked jobs, plus every past job (made up the same way each time, kept in memory)
       ====================================================================== */
    var PAST = null;
    function past() {
      if (PAST) return PAST;
      var cs = S().customers.filter(function (c) { return !c.stop; }), oneoffs = ['Mrs Carol Dunne', 'Mr Steve Aldridge', 'Mrs Priya Shah', 'Mr Neil Corbett', 'Mrs Joanne Lacey', 'Mr Kevin Ross', 'Mr Dean Walsh', 'Mrs Ruth Evans', 'Mr Tony Marsh', 'Mr Rob Kemp', 'Mrs Fiona Hart', 'Mr Sam Ellis'];
      var streets = ['Hermitage Road, St Johns', 'Oak Tree Close, Knaphill', 'Maybury Hill, Woking', 'Chertsey Road, Byfleet', 'Horsell Rise, Horsell', 'Robin Hood Road, Knaphill', 'Send Road, Send', 'Woodham Lane, New Haw', 'Guildford Road, Lightwater', 'Bisley Green, Bisley'];
      var pcs = Object.keys(YC.PC), L = [], n = 2899, d = 0, made = 0;
      while (made < 150 && d > -400) {
        d--; var wd = YC.dayDate(d).getDay(); if (wd === 0) continue; made++;
        var count = wd === 6 ? 8 : 18 + YC.hash('d' + d) % 9;
        for (var i = 0; i < count; i++) {
          var k = YC.hash(d + ':' + i), lo = YC.LORRIES[k % YC.LORRIES.length], type, size = null, loads = null;
          if (lo.kind === 'grab') { type = k % 3 ? 'grab' : 'muck'; loads = 1 + k % 3; } else if (lo.kind === 'roro') { type = ['deliver', 'collect', 'exchange'][k % 3]; size = k % 2 ? 20 : 40; } else { type = ['deliver', 'exchange', 'collect'][k % 3]; size = YC.SIZES[k % 6]; }
          var one = k % 7 === 0, c = cs[k % cs.length], site = one ? { name: (3 + k % 70) + ' ' + streets[k % streets.length], pc: pcs[k % pcs.length] } : (c.sites[k % c.sites.length] || c.sites[0]);
          var stream = lo.kind === 'grab' ? (k % 4 ? 'soil' : 'hardcore') : ['mixed', 'mixed', 'house', 'wood', 'green', 'plaster', 'hardcore'][k % 7];
          var j = { id: 'DSG-' + (n--), day: d, win: [450 + (i % 8) * 70, 510 + (i % 8) * 70], type: type, size: size, loads: loads, cust: one ? null : c.id, cname: one ? oneoffs[k % oneoffs.length] : null, site: { name: site.name, pc: site.pc }, lorry: lo.id, stream: stream,
            status: 'done', past: true, pay: one && k % 2 ? 'cash' : 'invoice' };
          j.price = YC.priceFor(null, j); j.incl = YC.inclFor(null, j);
          if (YC.TYPES[type].waste) { j.wtn = 'WTN-' + (4000 + (YC.hash(j.id) % 900)); j.net = YC.weight(j); j.tk = 'T-' + (46000 + (YC.hash(j.id + 't') % 2000)); }
          L.push(j);
        }
      }
      PAST = L; return L;
    }
    function orders() { return Y().jobs.concat(past()); }
    function custOf(o) { return o.cname || YC.custName(S(), o.cust); }
    function ticketOf(o) {
      if (o.past) return o.tk ? { id: o.tk, net: o.net, site: (o.stream === 'soil' || o.stream === 'concrete') ? 'soil' : 'yard', gross: o.net + (YC.lorry(o.lorry).kind === 'skip' ? 9.8 : 15.2), day: o.day, time: o.win[1] + 25, lorry: o.lorry, stream: o.stream, job: o.id } : null;
      return o.ticket ? Y().tickets.filter(function (t) { return t.id === o.ticket; })[0] : null;
    }
    function invNo(o) { return 'INV-' + (30000 + (parseInt(String(o.id).replace(/\D/g, ''), 10) || 0)); }
    function invLines(o) {
      var t0 = ticketOf(o), L = o.perT && t0 ? [[(o.stream === 'mixed' ? 'Mixed waste' : YC.STREAMS[o.stream].n) + ' grab, ' + t0.net.toFixed(2) + ' t at ' + money(o.perT) + '/t (ticket ' + t0.id + ')', o.price]] : [[YC.what(o), o.permit ? o.price - YC.prices(Y()).permit : o.price]];
      if (o.permit) L.push(['Council road permit, ' + o.permit.council + ', ref ' + o.permit.ref, YC.prices(Y()).permit]);
      var t = ticketOf(o); if (t && t.over) L.push(['Excess weight ' + t.over.over.toFixed(2) + ' t at ' + money(t.over.rate) + '/t (ticket ' + t.id + ', ' + t.over.incl + ' t included)', t.over.amount]);
      return L;
    }

    /* ---------- documents: an in-page preview with a Download button ---------- */
    function docHead(title, no, when) { return '<div class="yw-hd"><img src="brand/logo.svg" alt="Demo Skip & Grab"><div><b>' + h(title) + '</b><small>' + h(no) + ' · ' + h(when) + '</small></div></div>'; }
    function bx(l, v) { return '<div class="yw-bx"><small>' + l + '</small>' + v + '</div>'; }
    function docHTML(kind, o) {
      var c = o.cust ? CS.cust(o.cust) : null, who = custOf(o), site = o.site.name + ', ' + o.site.pc, lo = YC.lorry(o.lorry), st = YC.STREAMS[o.stream], t = ticketOf(o);
      if (kind === 'inv') {
        var L = invLines(o), net = L.reduce(function (a, x) { return a + x[1]; }, 0), vat = Math.round(net * 20) / 100, cash = YC.isCash(o) || o.pay === 'cash', cs = YC.cashState(o);
        return docHead('Invoice', invNo(o), dLong(o.day)) + '<div class="yw-g">' + bx('Bill to', '<b>' + h(who) + '</b><br>' + h(c ? c.email || '' : site)) + bx('For', h(o.id) + '<br>' + h(site)) + '</div>' +
          '<table class="t ydoc-t"><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>' + L.map(function (x) { return '<tr' + (/^Excess weight/.test(x[0]) ? ' class="ydoc-over"' : '') + '><td>' + h(x[0]) + '</td><td class="r num">' + money(x[1], true) + '</td></tr>'; }).join('') +
          '<tr><td class="r">Net</td><td class="r num">' + money(net, true) + '</td></tr><tr><td class="r">VAT at 20%</td><td class="r num">' + money(vat, true) + '</td></tr><tr class="ydoc-tot"><td class="r"><b>Total</b></td><td class="r num"><b>' + money(net + vat, true) + '</b></td></tr></tbody></table>' +
          '<p class="yw-dec">' + (cash ? (cs === 'not' ? 'Cash on the day was not collected. Please pay by card or bank transfer.' : o.past || cs === 'collected' ? 'Paid in cash on the day. Thank you.' : 'To be paid in cash on the day.') : 'Payment due within ' + (c && c.limit ? '30 days' : '7 days') + '. Bank: Demo Skip & Grab Ltd, sort code 00-00-00, account 00000000 (sample).') + ' VAT reg GB 000 0000 00 (sample).</p>';
      }
      if (kind === 'conf') {
        return docHead('Booking confirmation', o.id, 'Booked ' + dDate(Math.min(o.day - 2, 0))) + '<div class="yw-g">' + bx('Customer', '<b>' + h(who) + '</b>') + bx('Where', h(site)) + bx('What', '<b>' + h(YC.what(o)) + '</b><br>' + h(st.n) + ', EWC ' + st.ewc) + bx('When', h(dLong(o.day)) + '<br>' + h(K.winLabel(o) === 'AM' ? 'Morning' : K.winLabel(o) === 'PM' ? 'Afternoon' : YC.win(o))) + '</div>' +
          '<p style="margin:10px 0 0">Price ' + money(o.price) + ' + VAT' + (YC.isRoro(o) ? ', includes ' + o.incl + ' tonnes, then ' + money(YC.prices(Y()).overRate) + ' a tonne' : '') + (o.pay === 'cash' ? '. Pay cash on the day: ' + h(YC.cashLine(o)) : '. Invoiced after the job') + '.</p>' +
          (o.permit ? '<p style="margin:6px 0 0">On the road with a council permit, ref ' + h(o.permit.ref) + '.</p>' : '') + '<p class="yw-dec">' + (YC.isRoro(o) || o.size ? YC.prices(Y()).hireDays + ' days hire included. ' : '') + 'We text when the lorry is on its way.</p>';
      }
      if (kind === 'wtn') {
        var tip = YC.TIPS[t ? t.site : 'yard'];
        return docHead('Waste transfer note', o.wtn, dLong(o.day)) + '<div class="yw-g">' + bx('A. The waste', '<b>' + h(st.n) + '</b><br>EWC ' + st.ewc + ' · ' + h(YC.whatShort(o)) + (t ? '<br>' + t.net.toFixed(2) + ' tonnes net (ticket ' + h(t.id) + ')' : '') + '<br>Not hazardous') + bx('B. Where it came from', '<b>' + h(who) + '</b><br>' + h(site)) +
          bx('C. Carrier', '<b>' + h(YC.CARRIER.name) + '</b><br>Waste carrier ' + YC.CARRIER.reg + (lo ? '<br>Vehicle ' + h(lo.reg) + ', driver ' + h(lo.driver) : '')) + bx('D. Where it went', '<b>' + h(tip.n) + '</b><br>Permit ' + h(tip.permit)) + '</div>' +
          '<div class="yw-sig"><div><small>Customer</small><img src="' + YC.sampleSig() + '" alt="Customer signature"><span>' + h(who) + '</span></div><div><small>Driver</small><img src="' + YC.sampleSig('d') + '" alt="Driver signature"><span>' + h(lo ? lo.driver : '') + '</span></div></div><p class="yw-dec">I confirm I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of the Waste (England and Wales) Regulations 2011.</p>';
      }
      if (kind === 'tk' && t) {
        var tare = t.tare != null ? t.tare : Math.round((t.gross - t.net) * 100) / 100;
        return docHead('Weighbridge ticket', t.id, dLong(t.day) + ' ' + YC.hhmm(t.time)) + '<div class="yw-g">' + bx('Vehicle', '<span class="yplate sm">' + h(lo ? lo.reg : '') + '</span><br>Our lorry, driver ' + h(lo ? lo.driver : '')) + bx('Weights', 'Gross ' + t.gross.toFixed(2) + ' t<br>Tare ' + tare.toFixed(2) + ' t<br><b>Net ' + t.net.toFixed(2) + ' t</b>') +
          bx('Order', '<b>' + h(o.id) + '</b> · ' + h(YC.whatShort(o)) + '<br>' + h(who)) + bx('Tipped at', '<b>' + h(YC.TIPS[t.site].n) + '</b><br>Permit ' + h(YC.TIPS[t.site].permit)) + '</div>' +
          (t.over ? '<p class="ydoc-overp">' + ic('alert') + 'Over the ' + t.over.incl + ' t included by ' + t.over.over.toFixed(2) + ' t. Excess weight ' + t.over.over.toFixed(2) + ' t at ' + money(t.over.rate) + '/t added to ' + h(invNo(o)) + '.</p>' : '') + '<p class="yw-dec">Matched to ' + h(o.id) + ', its invoice ' + h(invNo(o)) + ' and booking confirmation.</p>';
      }
      return '';
    }
    var DOCN = { inv: 'Invoice', conf: 'Booking confirmation', wtn: 'Waste transfer note', tk: 'Tip ticket' };
    function docBtns(o) {
      var b = [['inv', 'Invoice'], ['conf', 'Confirmation']]; if (o.wtn && (o.past || o.status === 'done')) b.push(['wtn', 'WTN']); if (ticketOf(o)) b.push(['tk', 'Ticket']);
      return '<span class="ydocb">' + b.map(function (x) { return '<button class="btn sm" data-act="y4Doc" data-k="' + x[0] + '" data-id="' + h(o.id) + '">' + ic(x[0] === 'inv' ? 'receipt' : x[0] === 'wtn' ? 'certificate' : x[0] === 'tk' ? 'stack' : 'file-text') + x[1] + '</button>'; }).join('') + '</span>';
    }
    function findOrder(id) { return Y().jobs.filter(function (j) { return j.id === id; })[0] || past().filter(function (j) { return j.id === id; })[0]; }
    A.y4Doc = function (el) {
      var o = findOrder(el.dataset.id), k = el.dataset.k; if (!o) return;
      var body = docHTML(k, o), no = k === 'inv' ? invNo(o) : k === 'wtn' ? o.wtn : k === 'tk' ? (ticketOf(o) || {}).id : o.id;
      ui.y4DocNow = { k: k, id: o.id, no: no };
      modal(ic('file-text') + ' ' + h(DOCN[k]) + ' ' + h(no), '<div class="yw ydoc" id="y4DocBody">' + body + '</div><div class="ydoc-other">' + docBtns(o) + '</div>',
        '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn" data-act="yPrint">' + ic('printer') + 'Print</button><button class="btn pri" data-act="y4DocDl" id="y4DocDl">' + ic('download') + 'Download</button>', 'wide ywm');
    };
    A.y4DocDl = function () {
      var d = ui.y4DocNow, b = q('#y4DocBody'); if (!d || !b) return;
      var css = 'body{font-family:Arial,sans-serif;color:#1A1A1A;max-width:760px;margin:30px auto;padding:0 20px}.yw-hd{display:flex;gap:14px;align-items:center;border-bottom:2px solid #1A1A1A;padding-bottom:10px;margin-bottom:14px}.yw-hd img{height:36px}.yw-hd small{display:block;color:#555}.yw-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.yw-bx{border:1px solid #ddd;border-radius:8px;padding:10px}.yw-bx small{display:block;color:#666;font-weight:bold;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border-bottom:1px solid #eee;padding:7px;text-align:left}.r{text-align:right}.yw-sig{display:flex;gap:20px;margin-top:12px}.yw-sig img{height:50px;display:block}.yw-dec{font-size:12px;color:#555;margin-top:12px}.yplate{background:#F5C518;border:1px solid #111;padding:2px 6px;font-weight:bold}';
      var html = '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>' + h(DOCN[d.k] + ' ' + d.no) + '</title><style>' + css + '</style></head><body>' + b.innerHTML.replace(/src="brand\//g, 'src="' + location.href.replace(/[^/]*$/, '') + 'brand/') + '</body></html>';
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = String(d.no).replace(/[^A-Za-z0-9-]/g, '') + '.html'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
      toast(h(DOCN[d.k]) + ' ' + h(d.no) + ' downloaded', 'download');
    };
    /* job detail gets the documents too */
    var job0 = A.yJob;
    A.yJob = function (el) {
      var id = el.dataset.id, o = findOrder(id); if (!o) return;
      if (!o.past) { job0.apply(this, arguments); var d = q('.drawer .dbd'); if (d) d.insertAdjacentHTML('beforeend', '<div class="ydoc-in"><b>Documents</b>' + docBtns(o) + '</div>'); return; }
      K.drawer(h(o.id) + ' · ' + h(YC.what(o)), '<span class="tag ok">Completed</span>' + (o.pay === 'cash' ? ' <span class="tag ycashjob">Cash job</span>' : ''), '<dl class="kv"><dt>Customer</dt><dd>' + h(custOf(o)) + '</dd><dt>Site</dt><dd>' + h(o.site.name + ', ' + o.site.pc) + '</dd><dt>When</dt><dd>' + h(dLong(o.day)) + ', ' + YC.win(o) + '</dd><dt>Lorry</dt><dd>' + h(YC.lorry(o.lorry).reg + ', ' + YC.lorry(o.lorry).driver) + '</dd><dt>Waste</dt><dd>' + h(YC.STREAMS[o.stream].n) + ', EWC ' + YC.STREAMS[o.stream].ewc + '</dd>' + (o.net ? '<dt>Weight</dt><dd>' + o.net.toFixed(2) + ' t, ticket ' + h(o.tk) + '</dd>' : '') + '<dt>Price</dt><dd>' + money(o.price) + ' + VAT' + (o.pay === 'cash' ? ', paid in cash' : ', invoiced') + '</dd></dl><div class="ydoc-in"><b>Documents</b>' + docBtns(o) + '</div>', '<button class="btn" data-act="close">Close</button>');
    };

    /* ======================================================================
       EXTRA WEIGHT: added to the customer's invoice by itself, as its own line, and flagged in the office
       ====================================================================== */
    function autoOver() {
      var y = Y(), s = S(), n = 0;
      y.tickets.filter(function (t) { return t.over && (t.over.status === 'pending' || t.over.status === 'held'); }).forEach(function (t) {
        var j = K.jobById(t.job); if (!j) return; var c = CS.cust(t.cust), inv = invNo(j);
        t.over.status = 'sent'; t.over.inv = inv; t.over.auto = true; t.over.at = t.over.at || Date.now();
        if (c && !s.invoices.some(function (i) { return i.id === inv; })) s.invoices.unshift({ id: inv, cust: t.cust, amount: j.price + t.over.amount, issued: 0, due: c.limit ? 30 : 7, status: 'unpaid', jobs: [], pay: c.limit ? 'account' : 'link', what: YC.what(j) + ', plus excess weight ' + t.over.over.toFixed(2) + ' t', ticket: t.id, over: t.over.amount });
        j.log.push({ at: Date.now(), t: 'Excess weight ' + t.over.over.toFixed(2) + ' t at ' + money(t.over.rate) + '/t added to ' + inv + ' by itself' }); j.overweight = true; n++;
      });
      if (n) { y.v++; save(); }
      return n;
    }
    function overList() { return Y().tickets.filter(function (t) { return t.over && t.over.auto; }); }
    window.DSGBRIDGE = function () {
      var L = overList(); if (!L.length) return '';
      return '<section class="card ywb yover" id="yBridge"><div class="yh-rh"><h3>' + ic('alert') + 'Over the weight allowance</h3><small class="muted">Added to the invoice by itself</small></div>' + L.map(function (t) {
        var j = K.jobById(t.job); return '<div class="ych"><span class="bd"><b>' + h(t.job) + ' · ' + h(YC.custName(S(), t.cust)) + ' <span class="tag bad">Overweight ' + t.over.over.toFixed(2) + ' t</span></b><small>' + h(j ? YC.what(j) : '') + ' came back at ' + t.net.toFixed(2) + ' t on ticket ' + h(t.id) + ', ' + t.over.incl + ' t included. Excess weight ' + t.over.over.toFixed(2) + ' t at ' + money(t.over.rate) + '/t = ' + money(t.over.amount, true) + ' + VAT, on ' + h(t.over.inv) + '.</small></span><button class="btn sm" data-act="y4Doc" data-k="inv" data-id="' + h(t.job) + '">' + ic('receipt') + 'Invoice</button><button class="btn sm" data-act="y4Doc" data-k="tk" data-id="' + h(t.job) + '">' + ic('stack') + 'Ticket</button></div>';
      }).join('') + '</section>';
    };
    var oc = YC.overCheck; YC.overCheck = function () { var r = oc.apply(this, arguments); if (r) setTimeout(function () { if (autoOver()) { toast('A lorry came back over its weight allowance. The excess weight is on the customer\'s invoice', 'alert'); UI.render(); } }, 50); return r; };

    /* ======================================================================
       INBOX: every channel in one list
       ====================================================================== */
    var CH = { wa: ['WhatsApp', 'whatsapp', 'wa'], email: ['Email', 'mail', 'mail'], web: ['Website enquiry', 'world', 'web'] };
    function seedInbox() {
      var y = Y(); if (y.inboxV === 2) return; if (y.inboxV === 1) { (y.inbox || []).forEach(fixCh); y.inboxV = 2; save(); return; } y.inboxV = 2; var now = Date.now(); y.inbox = y.inbox || [];

      y.inbox.push(
        { id: 'm3', kind: 'quote', ch: 'web', who: 'Mrs Jane Barker', phone: '07700 900455', email: 'jane.barker@example.com', pc: 'GU21 4XR', size: 6, at: now - 22 * 60000, unread: true, text: 'Hello, I need a 6 yard skip for a garden clearance next week at Anchor Hill, Knaphill GU21 4XR. It can go on the drive. How much would it be please?' },
        { id: 'm4', kind: 'call', ch: 'call', cust: 'c14', at: now - 9 * 60000, unread: true },
        { id: 'm5', kind: 'book', ch: 'email', cust: 'c11', site: 0, type: 'exchange', size: 8, at: now - 41 * 60000, unread: true, subject: 'Swap please', text: 'Hi Dave, can you swap the 8 yarder at the Sheerwater workshop tomorrow morning? It\'s full of offcuts. Thanks, Nathan' },
        { id: 'm6', kind: 'reply', ch: 'email', cust: 'c12', at: now - 68 * 60000, unread: false, subject: 'Transfer note', text: 'Morning, could you send me the waste transfer note for last Tuesday\'s collection at Gayton Road? Our client is asking for it. Priya', draft: 'Hi Priya, here is the transfer note for Tuesday\'s collection at Gayton Road, signed, with the weight from the weighbridge. Any others you need, just shout. Dave' },
        { id: 'm7', kind: 'reply', ch: 'wa', cust: 'c13', at: now - 95 * 60000, unread: false, text: 'Can the next skip go on the road outside 14 Oak Road instead of the drive? Tenants are moving in.', draft: 'Hi Owen, yes, we can put it on the road. It needs a council permit, which takes 3 to 5 working days and adds £65. Shall I apply for it? Dave' },
        { id: 'm8', kind: 'quote', ch: 'wa', cust: 'c7', site: 0, size: 12, at: now - 130 * 60000, unread: false, text: 'Hi Dave, Gemma at Marram. Can you price me a 12 yarder for green waste at the usual site, and how soon could it come? Ta.' }
      );
      y.inbox.forEach(fixCh); save();
    }
    /* three channels only: a voice note becomes a WhatsApp, a missed call becomes Ruth's email */
    function fixCh(m) {
      if (m.voice) { delete m.voice; m.ch = 'wa'; m.text = String(m.text).replace(/^Morning Dave, it's Rob\. /, 'Morning Dave, Rob here. '); }
      if (m.ch === 'voice') m.ch = 'wa';
      if (m.ch === 'call' || m.kind === 'call') { m.kind = 'reply'; m.ch = 'email'; m.subject = 'RoRo at the Brookwood plots'; m.text = 'Hi Dave, can the 40 yard RoRo at the Brookwood plots be swapped Monday instead of Tuesday? The groundworkers finish early. Ruth'; m.draft = 'Hi Ruth, no problem, I have moved the 40 yard swap at the Brookwood plots to Monday morning. Same lorry, same driver. Dave'; }
      if (!m.ch || !CH[m.ch]) m.ch = 'wa';
    }
    function mWho(m) { var c = m.cust ? CS.cust(m.cust) : null; return { name: c ? c.contact : m.who, co: c ? c.name : 'New customer', phone: c ? c.phone : m.phone, ini: CS.initials(c ? c.contact : m.who) }; }
    function mSite(m) { var c = m.cust ? CS.cust(m.cust) : null; if (c) { var s = c.sites[m.site || 0] || c.sites[0]; return s; } var a = window.DSGY3.addrs(m.pc)[0]; return { name: a, pc: m.pc }; }
    function mQuote(m) { var w = mWho(m), s = mSite(m), p = YC.priceFor(Y(), { type: 'deliver', size: m.size }), so = YC.soonest(Y(), 1, K.sat()); return 'Hi ' + w.name.replace(/^(Mrs|Mr|Ms|Miss)\s+/, '').split(' ')[0] + ', a ' + m.size + ' yard skip at ' + s.name.split(',')[0] + ' is ' + money(p) + ' + VAT, with ' + YC.prices(Y()).hireDays + ' days hire. Soonest I can drop it is ' + K.dayName(so) + '. Want me to book it in? Cheers, Dave'; }
    function chTag(m) { var c = CH[m.ch] || CH.wa; return '<span class="tag ' + c[2] + ' ych-tag">' + ic(c[1]) + c[0] + '</span>'; }
    var ACT = { quote: 'Approve and send a quote', book: 'Book it in', reply: 'Reply', call: 'Call back' };
    V.inbox = function () {
      seedInbox();
      var L = (Y().inbox || []).slice().sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.at - a.at; }), f = ui.y4InF || 'all';
      var show = L.filter(function (m) { return f === 'all' || m.ch === f; }), wide = window.innerWidth >= 900, sel = ui.yMsg || (wide && show[0] ? show[0].id : null), m = L.filter(function (x) { return x.id === sel; })[0];
      var cnt = {}; L.forEach(function (x) { if (!x.done) cnt[x.ch] = (cnt[x.ch] || 0) + 1; });
      var chips = '<div class="ychips yin-f">' + [['all', 'All']].concat(Object.keys(CH).map(function (k) { return [k, CH[k][0]]; })).map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + '" data-act="y4InF" data-v="' + x[0] + '">' + (x[0] !== 'all' ? ic(CH[x[0]][1]) : '') + x[1] + (x[0] === 'all' ? ' <b>' + L.filter(function (z) { return !z.done; }).length + '</b>' : cnt[x[0]] ? ' <b>' + cnt[x[0]] + '</b>' : '') + '</button>'; }).join('') + '</div>';
      var list = '<div class="yin-list">' + show.map(function (x) {
        var w = mWho(x);
        return '<button class="yin-i' + (x.id === sel ? ' on' : '') + '" data-act="yMsg" data-id="' + x.id + '"><span class="av" style="--c:#3F3F46">' + h(w.ini) + '</span><span class="bd"><b>' + h(w.name) + ' <span class="yin-chn ' + (CH[x.ch] || CH.wa)[2] + '">· ' + h((CH[x.ch] || CH.wa)[0]) + '</span></b><small>' + h(w.co) + '</small><span class="yin-p">' + h(x.text.slice(0, 70)) + '...</span></span><span class="yin-r"><small>' + h(CS.ago(x.at)) + '</small>' + (x.done ? '<span class="tag ok">' + ic('check') + 'Done</span>' : x.unread ? '<i class="yin-dot"></i>' : '') + '</span></button>';
      }).join('') + '</div>';
      var top = '<div class="yin-top"><span class="yhint">' + ic('inbox') + 'WhatsApp, email and website enquiries, in one list. Each one has its reply or next step ready.</span></div>' + chips;
      if (!m) return top + '<div class="yinb">' + list + '</div>';
      m.unread = false;
      var w = mWho(m), s = mSite(m), so = YC.soonest(Y(), 1, K.sat()), cm = CH[m.ch] || CH.wa;
      var bub = '<div class="yin-b in">' + (m.subject ? '<b class="yin-subj">' + h(m.subject) + '</b>' : '') + '<p>' + h(m.text) + '</p><small>' + ic(cm[1]) + cm[0] + ', ' + h(CS.ago(m.at)) + '</small></div>' +
        (m.reply ? '<div class="yin-b out"><p>' + h(m.reply) + '</p><small>' + ic('check') + (m.kind === 'call' ? 'Called back ' : 'Sent ') + h(CS.ago(m.doneAt || Date.now())) + '</small></div>' : '');
      var card = '';
      if (m.done) card = '<div class="card yin-a done">' + ic('circle-check') + '<span>' + (m.kind === 'quote' ? 'Quote ' + h(m.quote || '') + ' sent to ' + h(w.name) + '.' : m.kind === 'book' ? 'Booked in as ' + h(m.job || '') + '. It is on the day plan to give it a lorry.' : m.kind === 'call' ? 'Called back. Logged on ' + h(w.co) + '.' : 'Reply sent to ' + h(w.name) + '.') + '</span></div>';
      else if (m.kind === 'quote') card = '<div class="card yin-a"><b class="yin-t">' + ic('sparkles') + 'Wants a price</b><dl class="kv"><dt>Skip</dt><dd>' + m.size + ' yard, on the drive</dd><dt>Site</dt><dd>' + h(s.name + ', ' + s.pc) + '</dd><dt>Price</dt><dd>' + money(YC.priceFor(Y(), { type: 'deliver', size: m.size })) + ' + VAT, from your price list</dd><dt>Soonest</dt><dd>' + h(K.dayLong(so)) + '</dd></dl>' +
        '<div class="field"><label for="yMsgDraft">Reply, with the quote</label><textarea id="yMsgDraft" rows="4">' + h(m.draft != null ? m.draft : mQuote(m)) + '</textarea></div><div class="yin-acts"><button class="btn pri lg" data-act="y4Quote" data-id="' + m.id + '" id="yMsgApprove">' + ic('check') + ACT.quote + '</button></div></div>';
      else if (m.kind === 'book') card = '<div class="card yin-a"><b class="yin-t">' + ic('sparkles') + 'Wants to book</b><dl class="kv"><dt>Job</dt><dd>' + h((m.type === 'exchange' ? 'Exchange ' : 'Deliver ') + m.size + ' yard skip') + '</dd><dt>Site</dt><dd>' + h(s.name + ', ' + s.pc) + '</dd><dt>When</dt><dd>' + h(K.dayLong(so)) + ', morning. The first day with room</dd><dt>Price</dt><dd>' + money(YC.priceFor(Y(), { type: m.type || 'deliver', size: m.size })) + ' + VAT</dd></dl>' +
        '<div class="yin-acts"><button class="btn pri lg" data-act="yMsgBook" data-id="' + m.id + '" id="yMsgBook">' + ic('calendar') + ACT.book + '</button></div></div>';
      else if (m.kind === 'reply') card = '<div class="card yin-a"><b class="yin-t">' + ic('sparkles') + 'Reply drafted</b><div class="field"><label for="yMsgDraft">Your reply</label><textarea id="yMsgDraft" rows="4">' + h(m.draft || '') + '</textarea></div><div class="yin-acts"><button class="btn pri lg" data-act="y4Reply" data-id="' + m.id + '">' + ic('send') + ACT.reply + '</button></div></div>';
      else if (m.kind === 'call') card = '<div class="card yin-a"><b class="yin-t">' + ic('phone') + 'Missed call</b><p style="margin:0 0 10px">Ring ' + h(w.name) + ' back on ' + h(w.phone || '') + '.</p><div class="yin-acts"><a class="btn pri lg" href="tel:' + h(String(w.phone || '').replace(/\s/g, '')) + '" data-act="y4Call" data-id="' + m.id + '">' + ic('phone') + ACT.call + '</a></div></div>';
      return top + '<div class="yinb sel">' + list + '<section class="yin-c"><header><button class="iconbtn sm yin-back" data-act="yMsgBack" aria-label="Back to messages">' + ic('chevron-left') + '</button><div><b>' + h(w.name) + '</b><small>' + h(w.co) + ' · ' + h(w.phone || '') + '</small></div>' + chTag(m) + '</header><div class="yin-m">' + bub + '</div>' + card + '</section></div>';
    };
    A.y4InF = function (el) { ui.y4InF = el.dataset.v; ui.yMsg = null; UI.render(); };
    function msgBy(id) { return (Y().inbox || []).filter(function (x) { return x.id === id; })[0]; }
    function doneMsg(m, text) { m.done = true; m.doneAt = Date.now(); m.reply = text; Y().v++; save(); UI.render(); }
    A.y4Quote = function (el) {
      var m = msgBy(el.dataset.id); if (!m || m.done) return; var w = mWho(m), s = mSite(m), ta = q('#yMsgDraft'), text = (ta && ta.value.trim()) || mQuote(m), p = YC.priceFor(Y(), { type: 'deliver', size: m.size });
      var qid = CS.nextId('quote', 'Q-'); S().quotes.unshift({ id: qid, cust: m.cust || null, who: m.who || null, desc: m.size + ' yard skip, ' + s.name.split(',')[0], sell: p, cost: Math.round(p * 0.55), status: 'sent', day: 0, owner: 'dave' });
      m.quote = qid; doneMsg(m, text); toast('Quote ' + h(qid) + ' sent to ' + h(w.name) + ' by ' + h((CH[m.ch] || CH.wa)[0].replace('Website enquiry', 'email').replace('Voice note', 'WhatsApp')) + '. Demo, nothing is sent', 'send');
    };
    A.yMsgApprove = A.y4Quote;
    A.y4Reply = function (el) { var m = msgBy(el.dataset.id); if (!m || m.done) return; var ta = q('#yMsgDraft'); doneMsg(m, (ta && ta.value.trim()) || m.draft); toast('Reply sent to ' + h(mWho(m).name) + '. Demo, nothing is sent', 'send'); };
    A.y4Call = function (el) { var m = msgBy(el.dataset.id); if (!m || m.done) return; doneMsg(m, 'Rang back, spoke to ' + mWho(m).name.split(' ')[0] + '.'); toast('Calling ' + h(mWho(m).name) + '. Marked as called back', 'phone'); };

    /* ======================================================================
       PERMITS: to apply for, applied, approved, expiring soon, expired
       ====================================================================== */
    function pState(pm) {
      if (pm.status === 'apply') return 'apply';
      if (pm.status !== 'approved') return 'applied';
      if (pm.collected) return 'done';
      if (pm.to < 0) return 'expired';
      if (pm.to <= 3) return 'expiring';
      return 'approved';
    }
    var PS = [['apply', 'To apply for'], ['applied', 'Applied'], ['approved', 'Approved'], ['expiring', 'Expiring soon'], ['expired', 'Expired']];
    function seedPermits() { var y = Y(); if (y.permV) return; y.permV = 1; var a = (y.permits || []).filter(function (p) { return p.status === 'approved' && p.to > 3 && p.skip; })[0]; if (a) a.to = 2; (y.permits || []).forEach(function (p) { if (p.status === 'approved' && !p.no) p.no = p.ref; }); save(); }
    function pCard(pm) {
      var st = pState(pm), who = YC.custName(S(), pm.cust), exp = YC.dayDate(pm.to).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), b = '';
      var tagc = { apply: 'bad', applied: '', approved: 'ok', expiring: 'amber', expired: 'bad', done: 'ok' }[st], lbl = (PS.filter(function (x) { return x[0] === st; })[0] || ['', 'Finished'])[1];
      if (st === 'apply') b = '<button class="btn sm pri" data-act="y4Pm" data-v="applied" data-id="' + pm.id + '">Mark applied</button>';
      if (st === 'applied') b = '<button class="btn sm pri" data-act="y4Pm" data-v="approved" data-id="' + pm.id + '">' + ic('check') + 'Mark approved</button>';
      if (st === 'expiring' || st === 'expired') b = (pm.renew && !pm.renew.ok ? '<button class="btn sm pri" data-act="y4Pm" data-v="renewed" data-id="' + pm.id + '">' + ic('check') + 'Renewal approved</button>' : '<button class="btn sm' + (st === 'expiring' ? ' pri' : '') + '" data-act="y4Pm" data-v="renew" data-id="' + pm.id + '">' + ic('refresh') + 'Renew</button>') +
        (st === 'expiring' ? (pm.inv ? '<span class="tag ok">' + ic('receipt') + h(pm.inv) + ' raised</span>' : '<button class="btn sm" data-act="y4Pm" data-v="invoice" data-id="' + pm.id + '">' + ic('receipt') + 'Raise invoice</button>') : '<button class="btn sm pri" data-act="y4Pm" data-v="collect" data-id="' + pm.id + '">' + ic('truck') + 'Book collection</button>');
      var line = st === 'approved' || st === 'expiring' ? '<p class="ypm-no">Permit no. ' + h(pm.no || pm.ref) + ', expires on ' + h(exp) + '</p>' : st === 'expired' ? '<p class="ypm-no bad">Expired on ' + h(exp) + '. Collect skip or renew</p>' : st === 'applied' ? '<p class="ypm-no">Applied to ' + h(pm.council) + (pm.appliedAt ? ' ' + h(CS.ago(pm.appliedAt)) + ' ago' : '') + '. Usually 3 to 5 working days</p>' : st === 'done' ? '<p class="ypm-no">Skip collected, permit closed</p>' : '<p class="ypm-no bad">Not applied for yet. Apply today, it takes 3 to 5 working days</p>';
      return '<div class="card ypm2 ' + st + '" data-pm="' + pm.id + '"><span class="yjc-t"><b>' + h(pm.id) + '</b><span class="tag ' + tagc + '">' + h(lbl) + '</span></span><b class="yjc-w">' + h(pm.addr) + '</b><small>' + h(pm.pc) + ' · ' + h(who) + ' · ' + h(pm.job || pm.skip || '') + '</small>' + line +
        (pm.renew ? '<small class="muted">' + (pm.renew.ok ? 'Renewed ' : 'Renewal applied for ') + h(CS.ago(pm.renew.at)) + ' ago</small>' : '') + '<span class="ysk-a">' + b + '</span></div>';
    }
    V.permits = function () {
      seedPermits();
      var L = (Y().permits || []).slice(), f = ui.yPmF || 'all', cnt = { all: L.length }, ord = ['expired', 'expiring', 'apply', 'applied', 'approved', 'done'];
      PS.forEach(function (x) { cnt[x[0]] = L.filter(function (p) { return pState(p) === x[0]; }).length; });
      var show = L.filter(function (p) { return f === 'all' || pState(p) === f; }).sort(function (a, b) { return ord.indexOf(pState(a)) - ord.indexOf(pState(b)) || a.to - b.to; });
      return '<div class="ybar"><span class="yhint">' + ic('certificate') + 'Each permit goes Applied, Approved, Expiring soon (3 days or less), then Expired. Surrey County Council, 3 to 5 working days.</span></div>' +
        '<div class="ychips">' + [['all', 'All']].concat(PS).map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + (x[0] === 'expired' && cnt.expired ? ' bad' : x[0] === 'expiring' && cnt.expiring ? ' amber' : '') + '" data-act="yPmF" data-v="' + x[0] + '">' + x[1] + ' <b>' + cnt[x[0]] + '</b></button>'; }).join('') + '</div>' +
        '<div class="yjcs">' + (show.map(pCard).join('') || '<p class="muted">Nothing here.</p>') + '</div>';
    };
    A.y4Pm = function (el) {
      var y = Y(), pm = (y.permits || []).filter(function (x) { return x.id === el.dataset.id; })[0], v = el.dataset.v; if (!pm) return; var nm = pm.addr.split(',')[0], msg;
      if (v === 'applied') { pm.status = 'applied'; pm.appliedAt = Date.now(); msg = 'Permit for ' + nm + ' marked applied'; }
      if (v === 'approved') { pm.status = 'approved'; pm.no = pm.no || pm.ref || ('SKP/' + (2600 + YC.hash(pm.id) % 900)); if (pm.to == null) pm.to = 14; pm.paidBy = pm.paidBy || 'us'; msg = 'Approved. Permit no. ' + pm.no + ', expires ' + YC.dayDate(pm.to).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
      if (v === 'renew') { pm.renew = { at: Date.now(), ok: false }; msg = 'Renewal application logged for ' + nm + '. Usually 3 to 5 working days'; }
      if (v === 'renewed') { pm.renew.ok = true; pm.to = Math.max(pm.to, 0) + 14; pm.no = 'SKP/' + (2600 + YC.hash(pm.id + 'r') % 900); msg = 'Renewed. Permit no. ' + pm.no + ', 14 more days'; }
      if (v === 'invoice') {
        var c = CS.cust(pm.cust), id = CS.nextId('inv', 'INV-'), fee = YC.prices(y).permit; pm.inv = id;
        if (c) S().invoices.unshift({ id: id, cust: pm.cust, amount: fee, issued: 0, due: c.limit ? 30 : 7, status: 'unpaid', jobs: [], pay: c.limit ? 'account' : 'link', what: 'Permit renewal, ' + pm.addr });
        msg = 'Invoice ' + id + ' for ' + money(fee) + ' + VAT raised to ' + YC.custName(S(), pm.cust) + ' for the renewal';
      }
      if (v === 'collect') {
        var o = (y.onsite || []).filter(function (x) { return x.id === pm.skip; })[0], off = YC.soonest(y, 1, K.sat()), jid = 'DSG-' + (y.counters.job++), site = { name: pm.addr, pc: pm.pc }, p = YC.pos(pm.pc);
        y.jobs.push({ id: jid, day: off, lorry: null, win: [450, 720], type: 'collect', cust: pm.cust, site: site, lat: p.lat, lng: p.lng, size: o ? o.size : 8, loads: null, price: YC.priceFor(y, { type: 'collect', size: o ? o.size : 8 }), incl: null, stream: o ? o.stream : 'mixed', place: 'road', permit: null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: 'Permit expired, collect first thing', log: [{ at: Date.now(), t: 'Booked from Permits: permit expired' }], isNew: true });
        if (o) o.booked = jid; pm.collected = jid; msg = 'Collection ' + jid + ' booked for ' + K.dayName(off) + ' morning';
      }
      pm.log = pm.log || []; pm.log.push({ at: Date.now(), t: msg }); y.v++; save(); UI.render(); toast(h(msg), 'certificate');
    };

    /* ======================================================================
       DEFRA: upload, with a submission history. Export stays as a quieter button.
       ====================================================================== */
    V.defra = function () {
      var y = Y(), s = S(), f = ui.yDfF || 'all', rows = YC.defraRows(s, y), subs = y.defraSubs || [];
      var n = { all: rows.length, ready: 0, submitted: 0, error: 0 }; rows.forEach(function (r) { n[r.status]++; });
      var show = rows.filter(function (r) { return f === 'all' || r.status === f; }).sort(function (a, b) { var o = { error: 0, ready: 1, submitted: 2 }; return o[a.status] - o[b.status] || b.day - a.day || b.time - a.time; }).slice(0, 60);
      function chip(k, l) { return '<button class="ychip' + (f === k ? ' on' : '') + '" data-act="yDfF" data-v="' + k + '">' + l + ' <b>' + n[k] + '</b></button>'; }
      var TAG = { ready: '<span class="tag brand">Ready</span>', submitted: '<span class="tag ok">' + ic('check') + 'Submitted</span>', error: '<span class="tag bad">' + ic('alert') + 'Needs fixing</span>' };
      return '<div class="card ydf-hd ydf2"><span class="ydf-ic">' + ic('shield-check') + '</span><div><b id="yDfReady">' + n.ready + ' item' + (n.ready === 1 ? '' : 's') + ' ready for submission</b><small>Every load received at your transfer station is checked as it happens: carrier, vehicle, EWC code, weight and the recovery code.' + (n.error ? ' ' + plural(n.error, 'item needs', 'items need') + ' fixing first.' : '') + '</small></div>' +
        '<div class="ydf-btns"><button class="btn pri lg" data-act="y4DfUp" id="y4DfUp"' + (n.ready ? '' : ' disabled') + '>' + ic('send') + 'Upload to Defra</button><button class="btn ghost" data-act="yDfExport"' + (n.ready ? '' : ' disabled') + '>' + ic('download') + 'Export a file</button></div></div>' +
        '<div class="ychips yrep-links">' + [['recycling', 'Recycling report', 'leaf'], ['reports', 'Waste and carbon', 'leaf'], ['lorryprofit', 'Profit per lorry', 'truck']].map(function (x) { return '<button class="ychip" data-act="go" data-v="' + x[0] + '">' + ic(x[2]) + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="ybar"><div class="ychips" style="margin:0">' + chip('all', 'All') + chip('ready', 'Ready') + chip('error', 'Needs fixing') + chip('submitted', 'Submitted') + '</div></div>' +
        '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Received</th><th>Carrier</th><th>Waste</th><th class="r">Tonnes</th><th class="hide-sm">Code</th><th>Status</th></tr></thead><tbody>' + show.map(function (r) {
          return '<tr class="' + (r.status === 'error' ? 'yun' : '') + '"><td><b>' + (r.day ? h(K.dayName(r.day)) : 'Today') + ' ' + YC.hhmm(r.time) + '</b><small>' + h(r.id) + '</small></td><td>' + h(r.carrier) + '<small>' + (r.reg ? h(r.reg) : '<b class="bad">No registration</b>') + ' · ' + h(r.veh) + '</small></td><td>' + h(r.desc) + '<small>EWC ' + r.ewc + '</small></td><td class="r num">' + (r.net != null ? r.net.toFixed(2) + (r.est ? '<small>estimate</small>' : '') : '<b class="bad">None</b>') + '</td><td class="hide-sm">' + r.code + '</td>' +
            '<td>' + TAG[r.status] + (r.status === 'error' ? '<small class="bad">' + h(r.why) + '</small><button class="btn sm" data-act="yDfFix" data-id="' + r.id + '">' + ic('pencil') + 'Fix</button>' : r.status === 'submitted' && r.sub ? '<small>' + h(r.sub) + '</small>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<div class="card ydf-hist" id="yDfHist"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('clock') + 'Submission history</h3></div>' + (subs.length ? subs.map(function (x) { return '<div class="ych"><span class="bd"><b>' + h(x.ref) + ' · ' + plural(x.n, 'item') + ' submitted</b><small>' + h(new Date(x.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + ' · by ' + h(x.by) + '</small></span><span class="tag ok">' + ic('check') + 'Accepted</span></div>'; }).join('') : '<p class="muted" style="padding:0 16px 14px">Nothing uploaded yet today.</p>') + '</div>' +
        '<p class="muted yfoot">Demo: the upload is simulated and nothing leaves this browser. Live, it goes to Defra\'s digital waste tracking service from your own login.</p>';
    };
    A.y4DfUp = function () {
      var y = Y(), rows = YC.defraRows(S(), y).filter(function (r) { return r.status === 'ready'; }); if (!rows.length) return;
      modal(ic('send') + ' Upload to Defra', '<div class="ydfup"><b id="y4DfT">Uploading ' + plural(rows.length, 'item') + '</b><div class="ydfbar"><i id="y4DfBar"></i></div><small class="muted" id="y4DfS">Checking each record</small></div>', '<span class="sp"></span><button class="btn" data-act="close" id="y4DfClose" disabled>Close</button>', 'ydfm');
      var pct = 0, tm = setInterval(function () {
        pct += 9 + Math.random() * 12; var b = q('#y4DfBar'), sTxt = q('#y4DfS'); if (!b) { clearInterval(tm); return; }
        b.style.width = Math.min(100, pct) + '%'; if (sTxt) sTxt.textContent = pct < 40 ? 'Checking each record' : pct < 80 ? 'Sending ' + Math.min(rows.length, Math.ceil(rows.length * pct / 100)) + ' of ' + rows.length : 'Waiting for the receipt';
        if (pct >= 100) {
          clearInterval(tm); var D = y.defraState || (y.defraState = {}), at = Date.now(), ref = 'DWT-' + new Date(at).toISOString().slice(2, 10).replace(/-/g, '') + '-' + (1000 + YC.hash(String(at)) % 9000);
          rows.forEach(function (r) { D[r.id] = { s: 'submitted', at: 'Uploaded ' + CS.clock(at) + ', ' + ref }; }); y.defraSubs = y.defraSubs || []; y.defraSubs.unshift({ ref: ref, n: rows.length, at: at, by: K.uName(K.meU()) }); y.v++; save();
          var m = q('.ydfup'); if (m) m.innerHTML = '<span class="y3tick">' + ic('circle-check') + '</span><b class="ydf-ok">' + plural(rows.length, 'item') + ' submitted</b><small>Reference ' + h(ref) + ' · ' + h(new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</small><small class="muted">Logged in the submission history.</small>';
          var c = q('#y4DfClose'); if (c) { c.disabled = false; c.classList.add('pri'); } UI.render();
        }
      }, 260);
    };

    /* ======================================================================
       CHASES: only what matters to a yard
       ====================================================================== */
    function chases() {
      var y = Y(), s = S(), L = [], ch = y.y4Ch || (y.y4Ch = {});
      y.onsite.filter(function (o) { return !o.booked && -o.since > o.hire; }).forEach(function (o) { L.push({ k: 'skip:' + o.id, g: 'Skips on site too long', i: 'skip', t: o.id + ', ' + o.size + ' yard at ' + o.site.name, d: YC.custName(s, o.cust) + ' · ' + (-o.since - o.hire) + ' days over the ' + o.hire + ' day hire', a: 'Ask to collect or swap', go: 'skips', lvl: -o.since - o.hire > 7 ? 'bad' : 'amber' }); });
      s.quotes.filter(function (x) { return x.status === 'sent'; }).forEach(function (x) { var c = x.cust ? CS.cust(x.cust) : null; L.push({ k: 'quote:' + x.id, g: 'Quotes with no answer', i: 'file-text', t: x.id + ', ' + x.desc, d: (c ? c.name : x.who || '') + ' · ' + money(x.sell) + ' + VAT · sent ' + (x.day ? -x.day + ' days ago' : 'today'), a: 'Follow up', lvl: '' }); });
      s.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).forEach(function (i) { var c = CS.cust(i.cust); L.push({ k: 'inv:' + i.id, g: 'Customers who have not paid', i: 'pound', t: i.id + ', ' + money(i.amount) + ' + VAT', d: (c ? c.name : '') + ' · ' + (-i.due) + ' days late', a: 'Send reminder', go: 'credit', lvl: -i.due > 30 ? 'bad' : 'amber' }); });
      (y.permits || []).forEach(function (pm) { var st = pState(pm); if (st === 'expiring' || st === 'expired') L.push({ k: 'pm:' + pm.id, g: 'Permits expiring', i: 'certificate', t: pm.addr, d: YC.custName(s, pm.cust) + ' · ' + (st === 'expired' ? 'expired ' + YC.dayDate(pm.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'expires ' + YC.dayDate(pm.to).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })), a: st === 'expired' ? 'Collect or renew' : 'Renew', go: 'permits', lvl: st === 'expired' ? 'bad' : 'amber' }); });
      YC.cashItems(s, y).filter(function (x) { return x.state === 'not' && !x.cash.settled; }).forEach(function (x) { L.push({ k: 'cash:' + (x.job ? x.job.id : x.ref), g: 'Cash not collected', i: 'pound', t: x.cname + ', ' + gbp(x.cash.gross), d: x.what + ' · ' + (x.cash.why || ''), a: 'Send a pay link', go: 'cash', lvl: 'bad' }); });
      orders().filter(function (o) { return !o.past && o.status === 'done' && o.wtn && o.sig && o.sig.none; }).concat(past().filter(function (o) { return o.wtn && o.day >= -6 && YC.hash(o.id) % 37 === 0; })).slice(0, 6).forEach(function (o) { L.push({ k: 'wtn:' + o.id, g: 'Transfer notes not signed', i: 'certificate', t: o.wtn + ', ' + custOf(o), d: o.site.name + ' · ' + (o.day ? K.dayName(o.day) : 'today') + ', customer not there to sign', a: 'Send to sign', lvl: 'amber' }); });
      (window.DSGFLEET ? window.DSGFLEET.due(21) : []).forEach(function (x) { L.push({ k: 'fleet:' + x.key, g: 'Lorries: MOT, PMI and checks due', i: 'truck', t: x.reg + ', ' + x.what, d: x.when, a: 'Book it in', go: 'compliance', lvl: x.days < 0 ? 'bad' : x.days <= 7 ? 'amber' : '' }); });
      L.forEach(function (x) { x.done = ch[x.k]; });
      return L;
    }
    V.chasing = function () {
      var L = chases(), open = L.filter(function (x) { return !x.done; }), G = [];
      L.forEach(function (x) { if (G.indexOf(x.g) < 0) G.push(x.g); });
      return '<div class="ykpis three"><div class="card kpi hero"><small>' + ic('bell') + 'To chase</small><b>' + open.length + '</b><span class="d">across ' + plural(G.length, 'list') + '</span></div><div class="card kpi"><small>' + ic('alert') + 'Urgent</small><b class="bad">' + open.filter(function (x) { return x.lvl === 'bad'; }).length + '</b><span class="d">overdue or expired</span></div><div class="card kpi"><small>' + ic('check') + 'Chased today</small><b>' + L.filter(function (x) { return x.done; }).length + '</b><span class="d">by the office</span></div></div>' +
        G.map(function (g) {
          var R = L.filter(function (x) { return x.g === g; });
          return '<section class="card ych-g"><div class="yh-rh"><h3>' + ic(R[0].i) + h(g) + '</h3><small class="muted">' + R.filter(function (x) { return !x.done; }).length + ' open</small></div>' + R.map(function (x) {
            return '<div class="ych' + (x.done ? ' ycash-done' : '') + '"><i class="ych-dot ' + x.lvl + '"></i><span class="bd"><b>' + h(x.t) + '</b><small>' + h(x.d) + '</small></span>' + (x.done ? '<span class="tag ok">' + ic('check') + 'Chased ' + h(CS.clock(x.done)) + '</span>' : '<button class="btn sm pri" data-act="y4Chase" data-k="' + h(x.k) + '" data-a="' + h(x.a) + '">' + h(x.a) + '</button>') + (x.go ? '<button class="btn sm" data-act="go" data-v="' + x.go + '">Open</button>' : '') + '</div>';
          }).join('') + '</section>';
        }).join('');
    };
    A.y4Chase = function (el) { var y = Y(); y.y4Ch = y.y4Ch || {}; y.y4Ch[el.dataset.k] = Date.now(); y.v++; save(); UI.render(); toast(h(el.dataset.a) + ': done. Demo, nothing is sent', 'send'); };

    /* ======================================================================
       ORDER DIARY: flick day by day
       ====================================================================== */
    V.orders = function () {
      var d = ui.y4Day == null ? 0 : ui.y4Day, L = (d < 0 ? past() : Y().jobs).filter(function (o) { return o.day === d; }).sort(function (a, b) { return a.win[0] - b.win[0] || String(a.lorry).localeCompare(String(b.lorry)); });
      var tot = L.reduce(function (a, o) { return a + (o.price || 0); }, 0);
      function stTxt(o) { return o.past || o.status === 'done' ? '<span class="tag ok">' + ic('check') + 'Completed</span>' : K.stTag(o); }
      return '<div class="ybar ydiary"><button class="btn" data-act="y4Day" data-v="-1" aria-label="Previous day">' + ic('chevron-left') + '</button><b class="ydiary-d">' + h(d === 0 ? 'Today, ' + dDate(0) : d === -1 ? 'Yesterday, ' + dDate(-1) : d === 1 ? 'Tomorrow, ' + dDate(1) : dLong(d)) + '</b><button class="btn" data-act="y4Day" data-v="1" aria-label="Next day">' + ic('chevron-right') + '</button><input type="date" id="y4DayPick" value="' + K.iso(d) + '" aria-label="Pick a date">' + (d ? '<button class="btn sm" data-act="y4Day" data-v="0" data-abs="1">Today</button>' : '') + '<span class="sp"></span><span class="muted">' + plural(L.length, 'job') + ' · ' + money(tot) + ' + VAT</span></div>' +
        '<div class="card"><div class="tw"><table class="t ytab ydiary-t"><thead><tr><th>Time</th><th>Order</th><th>Customer and site</th><th class="hide-sm">Lorry</th><th>Status</th><th>View documents</th></tr></thead><tbody>' +
        (L.map(function (o) { var lo = YC.lorry(o.lorry); return '<tr><td><b>' + h(K.winLabel(o)) + '</b></td><td><b class="click" data-act="yJob" data-id="' + h(o.id) + '">' + h(o.id) + '</b><small>' + h(YC.whatShort(o)) + '</small>' + (o.pay === 'cash' ? '<span class="tag ycashjob">Cash job</span>' : '') + '</td><td>' + h(custOf(o)) + '<small>' + h(o.site.name + ', ' + o.site.pc) + '</small></td><td class="hide-sm">' + (lo ? '<span class="yplate yx">' + h(lo.reg) + '</span>' : '<span class="tag bad">No lorry yet</span>') + '</td><td>' + stTxt(o) + '</td><td>' + docBtns(o) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="muted">Nothing booked on this day.</td></tr>') +
        '</tbody></table></div></div>';
    };
    A.y4Day = function (el) { var v = +el.dataset.v; ui.y4Day = el.dataset.abs ? v : (ui.y4Day || 0) + v; if (YC.dayDate(ui.y4Day).getDay() === 0) ui.y4Day += v < 0 ? -1 : 1; UI.render(); };
    document.addEventListener('change', function (e) { if (e.target.id === 'y4DayPick' && e.target.value) { var o = K.offOf(e.target.value); if (o != null) { ui.y4Day = Math.max(-180, Math.min(60, o)); UI.render(); } } });

    /* ======================================================================
       HISTORY: everything, filterable by type, cards or table, paged
       ====================================================================== */
    var HT = [['all', 'Everything'], ['skip', 'Skips'], ['grab', 'Grabs'], ['roro', 'RoRos'], ['wastein', 'Waste in'], ['own', 'Our lorries\' tickets'], ['wasteout', 'Waste out']];
    function histRows() {
      var R = [];
      orders().forEach(function (o) {
        var k = o.type === 'grab' || o.type === 'muck' ? 'grab' : YC.isRoro(o) ? 'roro' : 'skip', dir = o.type === 'deliver' ? 'Going out' : o.type === 'collect' ? 'Coming back' : o.type === 'exchange' ? 'Out and back' : 'Grab';
        R.push({ k: k, day: o.day, time: o.win[0], ref: o.id, who: custOf(o), where: o.site.name + ', ' + o.site.pc, what: YC.whatShort(o) + ' · ' + dir, amt: o.price, st: o.past || o.status === 'done' ? 'Completed' : o.status === 'planned' ? 'Booked' : 'Live', o: o });
        var t = ticketOf(o); if (t && (o.past || o.status === 'done')) R.push({ k: 'own', day: t.day, time: t.time, ref: t.id, who: YC.lorry(o.lorry).reg + ', ' + YC.lorry(o.lorry).driver, where: YC.TIPS[t.site].n, what: t.net.toFixed(2) + ' t ' + YC.STREAMS[o.stream].n.toLowerCase() + ', for ' + o.id, amt: null, st: t.over ? 'Overweight' : 'Matched', o: o, tk: true });
      });
      (window.DSGWASTEIN.seed(Y()).list || []).filter(function (x) { return x.status !== 'Open' && !x.own; }).forEach(function (x) { var p = String(x.time).split(':'); R.push({ k: 'wastein', day: x.day, time: (+p[0]) * 60 + (+p[1] || 0), ref: x.no, who: x.customer, where: x.reg + ' · ' + x.load, what: ((x.net || 0) / 1000).toFixed(2) + ' t ' + ((YC.STREAMS[x.waste] || {}).n || '').toLowerCase(), amt: x.charge, st: x.status, wi: x }); });
      woList().forEach(function (x) { R.push({ k: 'wasteout', day: x.day, time: x.time, ref: x.no, who: x.haulier, where: x.dest, what: x.net.toFixed(2) + ' t ' + YC.STREAMS[x.waste].n.toLowerCase() + ', ' + x.reg, amt: null, st: x.day < 0 || x.done ? 'Delivered' : 'Booked', wo: x }); });
      return R.sort(function (a, b) { return b.day - a.day || b.time - a.time; });
    }
    V.history = function () {
      var f = ui.y4HF || 'all', qq = String(ui.y4HQ || '').toLowerCase(), m = K.mode('history', 'table'), pg = ui.y4HP || 0, PER = 25, all = histRows(), cnt = { all: all.length };
      HT.forEach(function (x) { if (x[0] !== 'all') cnt[x[0]] = all.filter(function (r) { return r.k === x[0]; }).length; });
      var L = all.filter(function (r) { return (f === 'all' || r.k === f) && (!qq || (r.ref + ' ' + r.who + ' ' + r.where + ' ' + r.what).toLowerCase().indexOf(qq) >= 0); }), pages = Math.max(1, Math.ceil(L.length / PER)); pg = Math.min(pg, pages - 1);
      var P = L.slice(pg * PER, pg * PER + PER), KT = { skip: 'Skip', grab: 'Grab', roro: 'RoRo', wastein: 'Waste in', own: 'Our lorry', wasteout: 'Waste out' };
      function open(r) { return r.o ? (r.tk ? 'data-act="y4Doc" data-k="tk" data-id="' + h(r.o.id) + '"' : 'data-act="yJob" data-id="' + h(r.o.id) + '"') : r.wi ? 'data-act="wiTicket" data-no="' + h(r.ref) + '"' : 'data-act="y4WoPrint" data-no="' + h(r.ref) + '"'; }
      var body = m === 'card' ? '<div class="yjcs">' + P.map(function (r) { return '<button class="card yjc" ' + open(r) + '><span class="yjc-t"><b>' + h(r.day === 0 ? 'Today' : dDate(r.day)) + ' ' + YC.hhmm(r.time) + '</b><span class="tag">' + KT[r.k] + '</span></span><b class="yjc-w">' + h(r.ref) + ' · ' + h(r.what) + '</b><span>' + h(r.who) + '</span><small>' + h(r.where) + '</small><span class="yjc-x"><span class="tag ' + (r.st === 'Overweight' ? 'bad' : r.st === 'Completed' || r.st === 'Matched' || r.st === 'Delivered' || r.st === 'Paid' ? 'ok' : '') + '">' + h(r.st) + '</span>' + (r.amt ? '<b>' + money(r.amt) + '</b>' : '') + '</span></button>'; }).join('') + '</div>'
        : '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>When</th><th>Type</th><th>Ref</th><th>Who</th><th class="hide-sm">Where</th><th class="hide-sm">What</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>' + P.map(function (r) { return '<tr class="click" ' + open(r) + '><td><b>' + h(r.day === 0 ? 'Today' : dDate(r.day)) + '</b><small>' + YC.hhmm(r.time) + '</small></td><td><span class="tag">' + KT[r.k] + '</span></td><td><b>' + h(r.ref) + '</b></td><td>' + h(r.who) + '</td><td class="hide-sm">' + h(r.where) + '</td><td class="hide-sm">' + h(r.what) + '</td><td class="r num">' + (r.amt ? money(r.amt) : '') + '</td><td><span class="tag ' + (r.st === 'Overweight' ? 'bad' : /Completed|Matched|Delivered|Paid/.test(r.st) ? 'ok' : '') + '">' + h(r.st) + '</span></td></tr>'; }).join('') + '</tbody></table></div></div>';
      return '<div class="ybar">' + K.modeSeg('history', [['table', 'Table', 'list'], ['card', 'Cards', 'dashboard']]) + '<input class="wiq" id="y4HQ" placeholder="Search order, customer, reg, postcode or ticket" value="' + h(ui.y4HQ || '') + '" autocomplete="off"><span class="sp"></span><span class="muted">' + L.length.toLocaleString('en-GB') + ' records</span></div>' +
        '<div class="ychips">' + HT.map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + '" data-act="y4HF" data-v="' + x[0] + '">' + x[1] + ' <b>' + cnt[x[0]].toLocaleString('en-GB') + '</b></button>'; }).join('') + '</div>' + body +
        '<div class="ypager"><button class="btn sm" data-act="y4HP" data-v="' + (pg - 1) + '"' + (pg ? '' : ' disabled') + '>' + ic('chevron-left') + 'Newer</button><span>Showing ' + (L.length ? (pg * PER + 1).toLocaleString('en-GB') : 0) + ' to ' + Math.min(L.length, pg * PER + PER).toLocaleString('en-GB') + ' of ' + L.length.toLocaleString('en-GB') + '</span><button class="btn sm" data-act="y4HP" data-v="' + (pg + 1) + '"' + (pg < pages - 1 ? '' : ' disabled') + '>Older' + ic('chevron-right') + '</button></div>';
    };
    A.y4HF = function (el) { ui.y4HF = el.dataset.v; ui.y4HP = 0; UI.render(); };
    A.y4HP = function (el) { ui.y4HP = Math.max(0, +el.dataset.v); UI.render(); window.scrollTo(0, 0); var v = q('#view'); if (v) v.scrollTop = 0; };
    var hqT = 0; document.addEventListener('input', function (e) { if (e.target.id !== 'y4HQ') return; ui.y4HQ = e.target.value; ui.y4HP = 0; clearTimeout(hqT); hqT = setTimeout(function () { var p = e.target.selectionStart; UI.render(); var i = q('#y4HQ'); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (x) {} } }, 250); });

    /* ======================================================================
       WASTE OUT: loads leaving the yard for disposal or recycling
       ====================================================================== */
    var HAUL = [['Brennan Bulk Haulage', 'CBDU288140', 'BX19 BHL', 'Steve Brennan', 'office@brennanbulk.co.uk'], ['Thamesford Tipper Hire', 'CBDU301562', 'TF68 TPR', 'Ali Khan', 'ops@thamesfordtippers.co.uk'], ['Demo Skip & Grab (own lorry)', YC.CARRIER.reg, 'DS70 RRO', 'Jason Hurst', '']];
    var DEST = [['Mole Valley Recycling, Leatherhead', 'EPR/MV3381LH', 'R3'], ['Wey Valley Soil Recovery, Send', 'EPR/WV2210SD', 'R5'], ['Hollybank Landfill, Chertsey', 'EPR/HB1190CH', 'D1'], ['Surrey Wood Fuels, Farnham', 'EPR/SW7702FN', 'R1']];
    function woList() {
      var y = Y(); if (y.wo2) return y.wo2;
      var L = [], n = 401, M = [['mixed', 0, 0, 24.6], ['hardcore', 1, 1, 27.2], ['wood', 3, 0, 9.8], ['soil', 1, 1, 26.4], ['mixed', 2, 0, 21.1], ['plaster', 0, 1, 12.3], ['green', 0, 0, 11.6], ['metal', 0, 2, 8.2]];
      for (var d = -9; d <= 0; d++) { if (YC.dayDate(d).getDay() === 0) continue; M.slice(0, d === 0 ? 4 : 2 + YC.hash('w' + d) % 3).forEach(function (m, i) {
        var hl = HAUL[(i + d + 9) % HAUL.length], ds = DEST[m[1]], tare = hl[0].indexOf('own') > 0 ? 15.2 : 14.6, time = 480 + i * 105;
        L.push({ no: 'WO-' + (n++), day: d, time: time, haulier: hl[0], lic: hl[1], reg: hl[2], driver: hl[3], email: hl[4], waste: m[0], ewc: YC.STREAMS[m[0]].ewc, gross: Math.round((m[3] + tare) * 100) / 100, tare: tare, net: m[3], dest: ds[0], permit: ds[1], code: ds[2], done: d < 0 || time <= YC.nowMin(), sent: [] }); }); }
      y.wo2 = L.reverse(); save(); return y.wo2;
    }
    V.wasteout = function () {
      var L = woList(), today = L.filter(function (x) { return x.day === 0; }), wk = L.filter(function (x) { return x.day > -7; });
      var tn = today.reduce(function (a, x) { return a + x.net; }, 0), tw = wk.reduce(function (a, x) { return a + x.net; }, 0);
      return '<div class="ykpis three"><div class="card kpi hero"><small>' + ic('route') + 'Loads out today</small><b>' + today.length + '</b><span class="d">' + tn.toFixed(1) + ' t to disposal and recycling sites</span></div><div class="card kpi"><small>' + ic('stack') + 'This week</small><b>' + tw.toFixed(1) + ' t</b><span class="d">' + plural(wk.length, 'load') + '</span></div><div class="card kpi"><small>' + ic('mail') + 'Tickets emailed</small><b>' + L.filter(function (x) { return x.sent.length; }).length + '</b><span class="d">to hauliers, to print at the other end</span></div></div>' +
        '<div class="card"><div class="tw"><table class="t ytab" id="woTable"><thead><tr><th>Date</th><th>Haulier</th><th>Reg</th><th>Material</th><th class="r">Weight</th><th class="hide-sm">Destination</th><th></th></tr></thead><tbody>' + L.map(function (x) {
          return '<tr><td><b>' + h(x.day === 0 ? 'Today' : dDate(x.day)) + '</b><small>' + h(x.no) + ' · ' + YC.hhmm(x.time) + '</small></td><td>' + h(x.haulier) + '<small>' + h(x.lic) + '</small></td><td><span class="yplate yx">' + h(x.reg) + '</span><small>' + h(x.driver) + '</small></td><td>' + h(YC.STREAMS[x.waste].n) + '<small>EWC ' + h(x.ewc) + '</small></td><td class="r num"><b>' + x.net.toFixed(2) + ' t</b><small>' + x.gross.toFixed(2) + ' gross</small></td><td class="hide-sm">' + h(x.dest) + '<small>' + h(x.permit) + '</small></td>' +
            '<td class="r"><div class="row" style="justify-content:flex-end;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="y4WoPrint" data-no="' + x.no + '">' + ic('printer') + 'Print ticket</button><button class="btn sm' + (x.sent.length ? '' : ' pri') + '" data-act="y4WoMail" data-no="' + x.no + '">' + ic('mail') + (x.sent.length ? 'Sent ' + CS.clock(x.sent[x.sent.length - 1].at) : 'Email to haulier') + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        (L.some(function (x) { return x.sent.length; }) ? '<div class="card" id="woLog"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('mail') + 'Sent log</h3></div>' + L.filter(function (x) { return x.sent.length; }).map(function (x) { return x.sent.map(function (s) { return '<div class="ych"><span class="bd"><b>' + h(x.no) + ' emailed to ' + h(s.to) + '</b><small>' + h(x.haulier) + ' · ' + h(CS.ago(s.at)) + ' ago</small></span></div>'; }).join(''); }).join('') + '</div>' : '') +
        '<p class="muted yfoot">Every load out gets a ticket the driver can print at the other end, with the transfer details for the receiving site.</p>';
    };
    function woBy(no) { return woList().filter(function (x) { return x.no === no; })[0]; }
    A.y4WoPrint = function (el) {
      var x = woBy(el.dataset.no); if (!x) return;
      modal(ic('printer') + ' Waste out ticket ' + h(x.no), '<div class="yw" id="y4DocBody">' + docHead('Waste out ticket and transfer note', x.no, dLong(x.day) + ' ' + YC.hhmm(x.time)) + '<div class="yw-g">' +
        bx('Vehicle', '<span class="yplate sm">' + h(x.reg) + '</span><br>Driver ' + h(x.driver)) + bx('Weights', 'Gross ' + x.gross.toFixed(2) + ' t<br>Tare ' + x.tare.toFixed(2) + ' t<br><b>Net ' + x.net.toFixed(2) + ' t</b>') +
        bx('A. The waste', '<b>' + h(YC.STREAMS[x.waste].n) + '</b><br>EWC ' + h(x.ewc) + ' · Not hazardous') + bx('B. From', '<b>' + h(YC.TIPS.yard.n) + '</b><br>Permit ' + h(YC.TIPS.yard.permit)) +
        bx('C. Haulier', '<b>' + h(x.haulier) + '</b><br>Waste carrier ' + h(x.lic)) + bx('D. To', '<b>' + h(x.dest) + '</b><br>Permit ' + h(x.permit) + ', code ' + h(x.code)) + '</div><p class="yw-dec">Weighed out over our weighbridge. Hand this to the receiving site.</p></div>',
        '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn" data-act="y4WoMail" data-no="' + x.no + '">' + ic('mail') + 'Email to haulier</button><button class="btn pri" data-act="yPrint">' + ic('printer') + 'Print ticket</button>', 'wide ywm');
      ui.y4DocNow = { k: 'wo', id: x.no, no: x.no };
    };
    A.y4WoMail = function (el) { var x = woBy(el.dataset.no); if (!x) return; var to = x.email || 'the driver\'s phone'; x.sent.push({ at: Date.now(), to: to }); Y().v++; save(); if (!q('#layer .ywm')) UI.render(); toast('Ticket ' + h(x.no) + ' emailed to ' + h(to) + ' so the driver can print it at the other end. Demo, nothing is sent', 'mail'); };

    /* ---------- Waste in: our own lorries' tickets in their own tab ---------- */
    var wi0 = V.wastein;
    V.wastein = function () {
      var html = wi0.apply(this, arguments);
      html = html.replace('<button class="ychip' + (ui.wiF === 'all' ? ' on' : '') + '" data-act="wiF" data-v="all">All tickets</button>', '$&<button class="ychip' + (ui.wiF === 'own' ? ' on' : '') + '" data-act="wiF" data-v="own">Our lorries</button>');
      if (ui.wiF !== 'own') return html.replace('data-v="all">All tickets</button>', 'data-v="all">Third party, all</button>');
      var T = orders().filter(function (o) { return (o.past ? o.day >= -14 : o.status === 'done') && ticketOf(o); }).map(function (o) { return { o: o, t: ticketOf(o) }; }).sort(function (a, b) { return b.t.day - a.t.day || b.t.time - a.t.time; }).slice(0, 80);
      var tbl = '<div class="card"><div class="tw"><table class="t ytab" id="wiOwn"><thead><tr><th>When</th><th>Ticket</th><th>Lorry</th><th>Order</th><th class="r">Net</th><th>Tipped at</th><th>Documents</th></tr></thead><tbody>' + T.map(function (x) {
        var lo = YC.lorry(x.o.lorry); return '<tr><td><b>' + h(x.t.day === 0 ? 'Today' : dDate(x.t.day)) + '</b><small>' + YC.hhmm(x.t.time) + '</small></td><td><b>' + h(x.t.id) + '</b>' + (x.t.over ? '<span class="tag bad">Overweight ' + x.t.over.over.toFixed(2) + ' t</span>' : '') + '</td><td><span class="yplate yx">' + h(lo.reg) + '</span><small>' + h(lo.driver) + '</small></td><td><b>' + h(x.o.id) + '</b><small>' + h(custOf(x.o)) + '</small></td><td class="r num"><b>' + x.t.net.toFixed(2) + ' t</b>' + (x.t.est ? '<small>estimate</small>' : '') + '</td><td>' + h(YC.TIPS[x.t.site].n.split(',')[0]) + '</td><td>' + docBtns(x.o) + '</td></tr>';
      }).join('') + '</tbody></table></div></div><p class="muted yfoot">Your own lorries\' tip tickets, each matched to its order, invoice and booking confirmation. Third party tipping stays in the other tabs.</p>';
      return html.replace(/<div class="card"><div class="tw"><table class="t ytab" id="wiTable">[\s\S]*$/, tbl).replace(/<div class="card"><p class="muted yempty">[\s\S]*$/, tbl);
    };

    /* menu: the new screens and names */
    view('orders', 'Jobs', 'Order diary', 'calendar', 'Day by day: every job, with its invoice, confirmation and transfer note');
    view('history', 'Jobs', 'History', 'clock', 'Everything: skips, grabs, RoRos, Waste in, our lorries\' tickets and Waste out');
    view('chasing', 'Customers', 'Chases', 'bell', 'Skips on too long, quotes, unpaid, permits, cash, transfer notes and lorry checks');
    view('wasteout', 'Yard', 'Waste out', 'route', 'Loads leaving the yard for disposal and recycling, with tickets for the haulier');
    window.DSGY4 = { orders: orders, past: past, docBtns: docBtns, findOrder: findOrder, ticketOf: ticketOf, invNo: invNo, invLines: invLines, custOf: custOf, woList: woList, chases: chases, pState: pState };
    seedInbox(); seedPermits(); autoOver();
    UI.render();
  }
  start(0);
})();
