/* The yard's own business: Money, Profit per lorry (fuel card upload, add a repair cost), Compliance for the company,
   fleet and drivers, Duty of care, and Waste and carbon. Every figure clicks through to the jobs behind it.
   The broker-only screens are taken out. Sample data in this browser only. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit, O = window.DSGY4;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && K && O && window.DSGNAV)) { if ((tries || 0) < 260) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, plural = K.plural, modal = K.modal, save = K.save;
    function dDate(off) { return YC.dayDate(off).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    function view(k, g, n, icn, sub) { var v = UI.VIEWS.filter(function (x) { return x.k === k; })[0]; if (!v) { v = { k: k }; UI.VIEWS.push(v); } v.g = g; v.n = n; v.ic = icn; v.sub = sub; v.hide = false; return v; }
    function sameMonth(off, base) { var a = YC.dayDate(off), b = YC.dayDate(base || 0); return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }
    function monthName(off) { return YC.dayDate(off || 0).toLocaleDateString('en-GB', { month: 'long' }); }
    function firstOfMonth() { var d = 0; while (sameMonth(d - 1)) d--; return d; }

    /* ---------- the jobs behind a figure: a list, then the job, then its documents ---------- */
    function doneThisMonth() { return O.orders().filter(function (o) { return sameMonth(o.day) && o.day <= 0 && (o.past || o.status === 'done'); }); }
    function overAmt(o) { var t = O.ticketOf(o); return t && t.over ? t.over.amount : 0; }
    function drill(title, L, note) {
      ui.y5Drill = { title: title, ids: L.map(function (o) { return o.id; }), note: note || '' };
      var tot = L.reduce(function (a, o) { return a + (o.price || 0) + overAmt(o); }, 0), tn = L.reduce(function (a, o) { var t = O.ticketOf(o); return a + (t ? t.net : 0); }, 0);
      modal(ic('list') + ' ' + h(title), '<p class="muted" style="margin:0 0 10px">' + plural(L.length, 'job') + ' · ' + money(tot) + ' + VAT' + (tn ? ' · ' + tn.toFixed(1) + ' t' : '') + (note ? ' · ' + h(note) : '') + '. Tap a job to open it and its documents.</p>' +
        '<div class="ydrill">' + L.slice().sort(function (a, b) { return b.day - a.day || b.win[0] - a.win[0]; }).slice(0, 300).map(function (o) { var t = O.ticketOf(o), lo = YC.lorry(o.lorry); return '<button class="yrow" data-act="yJob" data-id="' + h(o.id) + '"><span class="yt"><b>' + h(o.day === 0 ? 'Today' : dDate(o.day)) + '</b><small>' + h(o.id) + '</small></span><span class="ym"><b>' + h(YC.whatShort(o)) + ' · ' + h(O.custOf(o)) + '</b><small>' + h(o.site.name + ', ' + o.site.pc) + (t ? ' · ' + t.net.toFixed(2) + ' t' : '') + '</small></span><span class="yl">' + (lo ? '<span class="yplate yx">' + h(lo.reg) + '</span>' : '') + '<b>' + money((o.price || 0) + overAmt(o)) + '</b></span></button>'; }).join('') + '</div>' + (L.length > 300 ? '<p class="muted">Showing the latest 300.</p>' : ''), '<button class="btn" data-act="close">Close</button>', 'wide');
    }
    A.y5Drill = function (el) {
      var k = el.dataset.k, v = el.dataset.v, L = doneThisMonth(), m = monthName();
      if (k === 'rev') return drill('Revenue in ' + m, L);
      if (k === 'jobs') return drill('Jobs done in ' + m, L);
      if (k === 'lorry') { var lo = YC.lorry(v); return drill(lo.reg + ', jobs in ' + m, L.filter(function (o) { return o.lorry === v; })); }
      if (k === 'stream') return drill(YC.STREAMS[v].n + ' in ' + m, L.filter(function (o) { return o.stream === v && O.ticketOf(o); }), 'by weighbridge ticket');
      if (k === 'tonnes') return drill('Tonnes moved in ' + m, L.filter(function (o) { return O.ticketOf(o); }), 'every load with a ticket');
      if (k === 'cust') return drill(v + ', ' + m, L.filter(function (o) { return O.custOf(o) === v; }));
      if (k === 'month') { var off = +v; return drill(monthName(off) + ', every load', O.orders().filter(function (o) { return sameMonth(o.day, off) && (o.past || o.status === 'done') && O.ticketOf(o); })); }
    };
    var yJ0 = A.yJob; A.yJob = function (el) { if (q('#layer .modal')) A.close(); return yJ0.apply(this, arguments); };

    /* ======================================================================
       PROFIT PER LORRY
       ====================================================================== */
    var DISP = { mixed: 118, soil: 5, hardcore: 3, concrete: 3, wood: 62, green: 38, plaster: 128, metal: 0, house: 122 };   /* our tip and processing cost per tonne, ex VAT */
    var DAYRATE = { skip: 185, roro: 205, grab: 210 }, DAYOTHER = { skip: 150, roro: 175, grab: 195 };   /* other costs a day: finance, insurance, tracker, road tax */
    function fleetData() {
      var y = Y(); if (y.fuel) return y;
      var f0 = firstOfMonth(), F = [];
      for (var d = f0; d <= 0; d++) { if (YC.dayDate(d).getDay() === 0) continue; YC.LORRIES.forEach(function (l, i) { if ((d - f0 + i) % 2 === 0) { var lit = Math.round(190 + YC.hash(l.id + d) % 140); F.push({ key: 'fc' + l.id + d, day: d, reg: l.reg, litres: lit, net: Math.round(lit * 1.29 * 100) / 100, source: 'fuel card' }); } }); }
      y.fuel = F;
      y.costs = [{ key: 'k1', day: Math.max(f0, -9), reg: 'DS19 GRB', type: 'Service', details: 'Full service and grab crane hoses', net: 640 }, { key: 'k2', day: Math.max(f0, -4), reg: 'DS22 SKP', type: 'Tyres', details: 'Two drive axle tyres', net: 1120 }, { key: 'k3', day: Math.max(f0, -12), reg: 'DS70 RRO', type: 'Repair', details: 'Hook arm ram seal', net: 385 }];
      save(); return y;
    }
    function profit() {
      var y = fleetData(), L = doneThisMonth(), days = {};
      return YC.LORRIES.map(function (l) {
        var js = L.filter(function (o) { return o.lorry === l.id; }), dd = {}; js.forEach(function (o) { dd[o.day] = 1; });
        var rev = js.reduce(function (a, o) { return a + (o.price || 0) + overAmt(o); }, 0), disp = js.reduce(function (a, o) { var t = O.ticketOf(o); return a + (t ? t.net * (DISP[o.stream] || 60) : 0); }, 0);
        var fl = y.fuel.filter(function (f) { return f.reg === l.reg && sameMonth(f.day); }), fuel = fl.reduce(function (a, f) { return a + f.net; }, 0);
        var cl = y.costs.filter(function (c) { return c.reg === l.reg && sameMonth(c.day); }), rep = cl.reduce(function (a, c) { return a + c.net; }, 0);
        var nd = Object.keys(dd).length, wage = nd * DAYRATE[l.kind], oth = nd * DAYOTHER[l.kind], p = rev - fuel - wage - disp - rep - oth;
        return { l: l, jobs: js, n: js.length, days: nd, rev: rev, fuel: fuel, fuelL: fl, card: fl.some(function (f) { return f.source === 'fuel card'; }), wage: wage, oth: oth, disp: disp, rep: rep, repL: cl, profit: p, margin: rev ? Math.round(p / rev * 100) : 0 };
      });
    }
    function line(lbl, v, neg, extra) { return '<div class="ypf-l' + (neg ? ' neg' : '') + '"><span>' + lbl + (extra || '') + '</span><b>' + (neg ? '-' : '') + money(v) + '</b></div>'; }
    function pfCard(r, sum) {
      var l = r.l;
      return '<div class="card ypf' + (sum ? ' sum' : '') + (ui.y5Pf === (l && l.id) ? ' on' : '') + '"' + (sum ? '' : ' data-act="y5Pf" data-v="' + l.id + '" role="button" tabindex="0"') + '><div class="ypf-h">' + (sum ? '<b>' + h(sum) + '</b>' : '<span class="yplate sm">' + h(l.reg) + '</span><b>' + h(l.driver) + '</b>') + '<span class="sp"></span><small>' + (sum ? '' : r.days + ' day' + (r.days === 1 ? '' : 's')) + '</small></div>' +
        '<div class="ypf-l top"><span>' + (sum ? 'Jobs done' : r.n + ' jobs done') + '</span><b>' + (sum ? Math.round(r.n) : '') + '</b></div>' + line('Revenue (ex VAT)', r.rev) +
        line('Fuel', r.fuel, true, !sum && r.card ? ' <span class="ypill">fuel card</span>' : '') + line('Driver wages', r.wage, true) + line('Tipping', r.disp, true) + line('Repairs and servicing', r.rep, true) + line('Other costs', r.oth, true) +
        '<div class="ypf-l res ' + (r.profit >= 0 ? 'gain' : 'loss') + '"><span>Profit <small>' + r.margin + '% margin</small></span><b>' + (r.profit < 0 ? '-' : '') + money(Math.abs(r.profit)) + '</b></div>' + (sum ? '' : '<div class="ypf-f">Press for each job, fuel and repairs</div>') + '</div>';
    }
    V.lorryprofit = function () {
      var R = profit(), tot = { n: 0, rev: 0, fuel: 0, wage: 0, oth: 0, disp: 0, rep: 0, profit: 0 }; R.forEach(function (r) { for (var k in tot) tot[k] += r[k]; }); tot.margin = tot.rev ? Math.round(tot.profit / tot.rev * 100) : 0;
      var avg = {}; for (var k in tot) avg[k] = k === 'margin' ? tot.margin : tot[k] / R.length;
      var mx = Math.max.apply(null, R.map(function (r) { return r.rev; }).concat([1])), sel = R.filter(function (r) { return r.l.id === ui.y5Pf; })[0];
      var chart = '<section class="card ypf-ch"><div class="yh-rh"><h3>' + ic('trending-up') + 'Revenue and profit by lorry, ' + h(monthName()) + '</h3><small class="muted">Tap a bar for the jobs behind it</small></div>' + R.map(function (r) {
        return '<button class="ypf-bar" data-act="y5Drill" data-k="lorry" data-v="' + r.l.id + '"><span class="yplate yx">' + h(r.l.reg) + '</span><span class="ypf-tr"><i class="rev" style="width:' + Math.round(r.rev / mx * 100) + '%"></i><i class="pro ' + (r.profit < 0 ? 'loss' : '') + '" style="width:' + Math.max(0, Math.round(r.profit / mx * 100)) + '%"></i></span><b>' + money(r.profit) + '</b><small>' + r.margin + '%</small></button>';
      }).join('') + '<div class="ypf-leg"><span><i class="rev"></i>Revenue</span><span><i class="pro"></i>Profit</span></div></section>';
      var detail = '';
      if (sel) {
        var l = sel.l;
        detail = '<section class="card ypf-d" id="y5PfD"><div class="yh-rh"><h3><span class="yplate sm">' + h(l.reg) + '</span> jobs and costs</h3><button class="btn sm" data-act="y5Pf" data-v="' + l.id + '">Close</button></div>' +
          '<div class="tw"><table class="t ytab"><thead><tr><th>Date</th><th>Order</th><th>Job</th><th class="r">Revenue</th><th>Load</th><th class="r">Tipping</th></tr></thead><tbody>' + sel.jobs.slice().sort(function (a, b) { return b.day - a.day; }).map(function (o) { var t = O.ticketOf(o); return '<tr class="click" data-act="yJob" data-id="' + h(o.id) + '"><td>' + h(o.day === 0 ? 'Today' : dDate(o.day)) + '</td><td><b>' + h(o.id) + '</b><small>' + h(O.custOf(o)) + '</small></td><td>' + h(YC.whatShort(o)) + '<small>' + h(YC.STREAMS[o.stream].n) + '</small></td><td class="r num">' + money((o.price || 0) + overAmt(o)) + '</td><td>' + (t ? t.net.toFixed(2) + ' t x ' + money(DISP[o.stream] || 60) + '/t' : '<small>delivery, nothing tipped</small>') + '</td><td class="r num">' + (t ? money(t.net * (DISP[o.stream] || 60)) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          '<div class="ypf-two"><div><h4>Fuel</h4>' + (sel.fuelL.map(function (f) { return '<div class="ych"><span class="bd"><b>' + h(dDate(f.day)) + ' · ' + f.litres + ' L</b><small>' + h(f.source) + '</small></span><b>' + money(f.net, true) + '</b><button class="btn sm" data-act="y5Del" data-t="fuel" data-k="' + h(f.key) + '">Remove</button></div>'; }).join('') || '<p class="muted">No fuel this month.</p>') +
          '<div class="ypf-add"><input type="date" id="y5Fd" value="' + K.iso(0) + '"><input id="y5Fn" placeholder="Fuel £ ex VAT" inputmode="decimal"><input id="y5Fl" placeholder="Litres" inputmode="decimal"><button class="btn sm" data-act="y5AddFuel" data-v="' + h(l.reg) + '">Add fuel by hand</button></div></div>' +
          '<div><h4>Repairs, servicing and MOT</h4>' + (sel.repL.map(function (c) { return '<div class="ych"><span class="bd"><b>' + h(dDate(c.day)) + ' · ' + h(c.type) + '</b><small>' + h(c.details || '') + '</small></span><b>' + money(c.net, true) + '</b><button class="btn sm" data-act="y5Del" data-t="cost" data-k="' + h(c.key) + '">Remove</button></div>'; }).join('') || '<p class="muted">Nothing this month.</p>') +
          '<div class="ypf-add"><input type="date" id="y5Cd" value="' + K.iso(0) + '"><select id="y5Ct">' + ['Repair', 'Service', 'MOT', 'Tyres', 'PMI', 'Other'].map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select><input id="y5Cx" placeholder="Details, e.g. new clutch"><input id="y5Cn" placeholder="£ ex VAT" inputmode="decimal"><button class="btn sm pri" data-act="y5AddCost" data-v="' + h(l.reg) + '" id="y5AddCost">' + ic('plus') + 'Add repair cost</button></div></div></div></section>';
      }
      return '<div class="ybar"><span class="yhint">' + ic('truck') + 'Every lorry this month: what it earned, what it cost, what it made. Driver wages and other costs (finance, insurance, tracker, road tax) count on days it worked. Tipping is the weighbridge weight times your cost per tonne.</span><span class="sp"></span>' +
        '<a class="btn" href="#" data-act="y5Sample">' + ic('download') + 'Sample CSV</a><button class="btn pri" data-act="y5Fuel" id="y5Fuel">' + ic('receipt') + 'Upload fuel card statement</button><input type="file" id="y5File" accept=".csv,text/csv" hidden></div>' +
        (ui.y5Note ? '<div class="ycr ok" id="y5Note">' + ic('circle-check') + '<span>' + ui.y5Note + '</span></div>' : '') +
        '<div class="ykpis"><button class="card kpi hero" data-act="y5Drill" data-k="rev"><small>' + ic('pound') + 'Revenue, ' + h(monthName()) + '</small><b>' + money(tot.rev) + '</b><span class="d">' + plural(tot.n, 'job') + ' done</span></button><div class="card kpi"><small>' + ic('receipt') + 'Costs</small><b>' + money(tot.fuel + tot.wage + tot.disp + tot.rep + tot.oth) + '</b><span class="d">fuel, wages, tipping, repairs, other</span></div><div class="card kpi"><small>' + ic('trending-up') + 'Profit</small><b class="' + (tot.profit < 0 ? 'bad' : 'ok') + '">' + money(tot.profit) + '</b><span class="d">' + tot.margin + '% margin</span></div><button class="card kpi" data-act="y5Drill" data-k="jobs"><small>' + ic('truck') + 'Jobs done</small><b>' + tot.n + '</b><span class="d">tap for the list</span></button></div>' +
        chart + '<div class="ypf-g">' + R.map(function (r) { return pfCard(r); }).join('') + '</div>' + detail + '<div class="ypf-g sums">' + pfCard(avg, 'Average per lorry') + pfCard(tot, 'All lorries') + '</div>' +
        '<p class="muted yfoot">Sample figures. Fuel comes from your fuel card statement (date, reg, litres, cost), matched to each lorry by its registration.</p>';
    };
    A.y5Pf = function (el) { ui.y5Pf = ui.y5Pf === el.dataset.v ? null : el.dataset.v; UI.render(); setTimeout(function () { var d = q('#y5PfD'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50); };
    A.y5Fuel = function () { var f = q('#y5File'); if (f) { f.value = ''; f.click(); } };
    A.y5Sample = function () {
      var f0 = firstOfMonth(), rows = ['date,reg,litres,cost'], n = 0;
      for (var d = f0; d <= 0 && n < 14; d += 2) { if (YC.dayDate(d).getDay() === 0) continue; var l = YC.LORRIES[n % YC.LORRIES.length], lit = 140 + (n * 37) % 90, dt = YC.dayDate(d); rows.push(String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear() + ',' + l.reg + ',' + lit + ',' + (lit * 1.31).toFixed(2)); n++; }
      rows.push(K.iso(0).split('-').reverse().join('/') + ',AB12 CDE,60,78.60');
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'fuel_card_sample.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
      toast('fuel_card_sample.csv downloaded. Upload it with Upload fuel card statement', 'download');
    };
    function parseFuel(txt) {
      var y = fleetData(), lines = String(txt).split(/\r?\n/).map(function (r) { return r.split(',').map(function (c) { return c.replace(/^"|"$/g, '').trim(); }); }).filter(function (r) { return r.length >= 3 && r.join(''); });
      var head = lines[0] && /date/i.test(lines[0].join(' ')) ? lines.shift().map(function (x) { return x.toLowerCase(); }) : ['date', 'reg', 'litres', 'cost'];
      function ix(re, d) { for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i; return d; }
      var iD = ix(/date/, 0), iR = ix(/reg|vehicle/, 1), iL = ix(/lit/, 2), iC = ix(/cost|amount|net|£|value/, 3), add = 0, dup = 0, not = [], per = {};
      lines.forEach(function (r) {
        var reg = String(r[iR] || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), lo = YC.LORRIES.filter(function (l) { return l.reg.replace(/\s/g, '') === reg; })[0];
        if (!lo) { if (reg && not.indexOf(r[iR]) < 0) not.push(r[iR]); return; }
        var ds = String(r[iD]), dt = /^\d{4}-\d\d-\d\d$/.test(ds) ? new Date(ds + 'T12:00:00') : (function () { var p = ds.split(/[\/.-]/); return new Date(+p[2] < 100 ? 2000 + +p[2] : +p[2], +p[1] - 1, +p[0], 12); })();
        var off = Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - YC.dayDate(0)) / 86400000), cost = parseFloat(String(r[iC]).replace(/[^\d.]/g, '')) || 0, key = 'up' + lo.reg + off + cost;
        if (isNaN(off) || !cost) return;
        if (y.fuel.some(function (f) { return f.key === key; })) { dup++; return; }
        y.fuel.push({ key: key, day: off, reg: lo.reg, litres: parseFloat(r[iL]) || 0, net: cost, source: 'fuel card, uploaded' }); add++; per[lo.reg] = (per[lo.reg] || 0) + cost;
      });
      y.v++; save();
      return { add: add, dup: dup, not: not, per: per };
    }
    document.addEventListener('change', function (e) {
      if (e.target.id !== 'y5File' || !e.target.files || !e.target.files[0]) return; var f = e.target.files[0], rd = new FileReader();
      rd.onload = function () { var r = parseFuel(rd.result); ui.y5Note = '<b>' + plural(r.add, 'fuel line') + ' added from ' + h(f.name) + '</b>' + (r.dup ? ', ' + r.dup + ' already in' : '') + '. ' + Object.keys(r.per).map(function (k) { return h(k) + ' ' + money(r.per[k]); }).join(', ') + (r.not.length ? '. Not one of your lorries: ' + h(r.not.join(', ')) : '') + '. Profit updated.'; UI.render(); toast(plural(r.add, 'fuel line') + ' matched to your lorries by reg', 'receipt'); };
      rd.readAsText(f);
    });
    A.y5AddCost = function (el) {
      var y = fleetData(), n = parseFloat(((q('#y5Cn') || {}).value || '').replace(/[^\d.]/g, '')); if (!(n > 0)) { toast('Put the cost in, ex VAT', 'alert'); var i = q('#y5Cn'); if (i) i.focus(); return; }
      var off = K.offOf((q('#y5Cd') || {}).value) || 0; y.costs.push({ key: 'c' + Date.now(), day: off, reg: el.dataset.v, type: (q('#y5Ct') || {}).value || 'Repair', details: ((q('#y5Cx') || {}).value || '').trim(), net: n }); y.v++; save(); UI.render(); toast(money(n, true) + ' added to ' + h(el.dataset.v) + '. Profit updated', 'circle-check');
    };
    A.y5AddFuel = function (el) {
      var y = fleetData(), n = parseFloat(((q('#y5Fn') || {}).value || '').replace(/[^\d.]/g, '')); if (!(n > 0)) { toast('Put the fuel cost in, ex VAT', 'alert'); return; }
      y.fuel.push({ key: 'h' + Date.now(), day: K.offOf((q('#y5Fd') || {}).value) || 0, reg: el.dataset.v, litres: parseFloat((q('#y5Fl') || {}).value) || 0, net: n, source: 'added by hand' }); y.v++; save(); UI.render(); toast('Fuel added to ' + h(el.dataset.v), 'circle-check');
    };
    A.y5Del = function (el) { var y = fleetData(), L = el.dataset.t === 'fuel' ? y.fuel : y.costs, i = L.map(function (x) { return x.key; }).indexOf(el.dataset.k); if (i >= 0) L.splice(i, 1); y.v++; save(); UI.render(); toast('Removed', 'x'); };

    /* ======================================================================
       COMPLIANCE: the company, the fleet and the drivers
       ====================================================================== */
    var FLEETCHK = [['brake', 'Brake test', 91], ['pmi', 'PMI (safety inspection)', 42], ['mot', 'MOT (annual test)', 365], ['service', 'Service', 120], ['tacho', 'Tachograph calibration', 730], ['loler', 'LOLER', 182], ['ins', 'Insurance', 365]];
    var LIFT = { skip: 'LOLER, skip loader arms', roro: 'LOLER, hook lift', grab: 'LOLER, grab crane' };
    function fdue(key, every) { var n = YC.hash(key); return (n % (Math.min(every, 120) + 30)) - 3; }   /* days until due, a few overdue */
    function fleetItems() {
      var y = Y(), done = y.y5Done || {}, L = [];
      YC.LORRIES.forEach(function (l) { FLEETCHK.forEach(function (c) { var k = l.id + c[0], d = done[k] ? c[2] : fdue(k, c[2]); if (l.id === 'G1' && c[0] === 'pmi') d = done[k] ? c[2] : 3; if (l.id === 'L2' && c[0] === 'mot') d = done[k] ? c[2] : 11; L.push({ key: k, grp: 'fleet', reg: l.reg, l: l, what: c[0] === 'loler' ? LIFT[l.kind] : c[1], days: d, every: c[2] }); }); });
      [['olic', 'Operator licence, standard national, 6 vehicles', 1460], ['wcl', 'Waste carriers licence ' + YC.CARRIER.reg + ', upper tier', 1095], ['epr', 'Environmental permit ' + YC.YARD.permit + ', annual compliance', 365], ['pl', 'Public and employers liability insurance', 365], ['fire', 'Fire prevention plan review', 365]].forEach(function (c) { L.push({ key: c[0], grp: 'company', reg: 'Company', what: c[1], days: done[c[0]] ? c[2] : fdue(c[0] + 'x', c[2]) + 20, every: c[2] }); });
      YC.LORRIES.forEach(function (l) { [['dvla', 'Driving licence check', 182], ['cpc', 'Driver CPC card', 1825], ['tcard', 'Driver tacho card', 1825]].forEach(function (c) { var k = l.id + c[0]; L.push({ key: k, grp: 'drivers', reg: l.driver, l: l, what: c[1], days: done[k] ? c[2] : fdue(k + 'd', c[2]) + 8, every: c[2] }); }); });
      L.forEach(function (x) { x.date = YC.dayDate(x.days); x.lvl = x.days < 0 ? 'bad' : x.days <= 14 ? 'amber' : 'ok'; x.when = (x.days < 0 ? 'Overdue since ' : 'Due ') + x.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); });
      return L;
    }
    window.DSGFLEET = { items: fleetItems, due: function (n) { return fleetItems().filter(function (x) { return x.grp === 'fleet' && x.days <= n && (/MOT|PMI|Brake|LOLER/.test(x.what)); }); } };
    function cTag(x) { return '<span class="tag ' + x.lvl + '">' + (x.days < 0 ? ic('alert') + 'Overdue ' + (-x.days) + 'd' : x.days <= 14 ? 'Due in ' + x.days + 'd' : ic('check') + 'OK') + '</span>'; }
    V.compliance = function () {
      var L = fleetItems(), bad = L.filter(function (x) { return x.lvl === 'bad'; }), soon = L.filter(function (x) { return x.lvl === 'amber'; });
      function row(x) { return '<div class="ych"><i class="ych-dot ' + x.lvl + '"></i><span class="bd"><b>' + h(x.what) + '</b><small>' + h(x.when) + '</small></span>' + cTag(x) + (x.lvl !== 'ok' ? '<button class="btn sm" data-act="y5Book" data-k="' + x.key + '" data-w="' + h(x.what) + '">' + (x.grp === 'fleet' ? 'Book it in' : x.grp === 'drivers' ? 'Mark checked' : 'Mark renewed') + '</button>' : '') + '</div>'; }
      var grid = '<div class="card"><div class="tw"><table class="t ytab ycomp-t"><thead><tr><th>Lorry</th>' + FLEETCHK.map(function (c) { return '<th>' + (c[0] === 'loler' ? 'LOLER' : c[1].replace(' (safety inspection)', '').replace(' (annual test)', '').replace('Tachograph calibration', 'Tacho')) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        YC.LORRIES.map(function (l) { return '<tr><td><span class="yplate yx">' + h(l.reg) + '</span><small>' + h(YC.KIND[l.kind]) + '</small></td>' + FLEETCHK.map(function (c) { var x = L.filter(function (z) { return z.key === l.id + c[0]; })[0]; return '<td class="ycomp-c ' + x.lvl + '"><b>' + h(x.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })) + '</b><small>' + (x.days < 0 ? 'overdue' : x.days <= 14 ? x.days + ' days' : 'ok') + '</small></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      return '<div class="ykpis three"><div class="card kpi"><small>' + ic('alert') + 'Overdue</small><b class="bad">' + bad.length + '</b><span class="d">book these in now</span></div><div class="card kpi"><small>' + ic('clock') + 'Due in 14 days</small><b class="amber">' + soon.length + '</b><span class="d">reminders go to the office</span></div><div class="card kpi"><small>' + ic('shield-check') + 'All in date</small><b>' + (L.length - bad.length - soon.length) + '</b><span class="d">of ' + L.length + ' checks</span></div></div>' +
        '<div class="ycomp-leg"><span><i class="bad"></i>Overdue</span><span><i class="amber"></i>Due in 14 days</span><span><i class="ok"></i>In date</span></div>' + grid +
        '<div class="ycr2"><section class="card ycash-c"><div class="yh-rh"><h3>' + ic('certificate') + 'The company</h3></div>' + L.filter(function (x) { return x.grp === 'company'; }).map(row).join('') + '</section>' +
        '<section class="card ycash-c"><div class="yh-rh"><h3>' + ic('users') + 'Drivers</h3><small class="muted">Licence checks, CPC and tacho cards</small></div>' + YC.LORRIES.map(function (l) { var D = L.filter(function (x) { return x.grp === 'drivers' && x.l === l; }), w = D.reduce(function (a, x) { return x.days < a.days ? x : a; }, D[0]); return '<div class="ych"><i class="ych-dot ' + w.lvl + '"></i><span class="bd"><b>' + h(l.driver) + '</b><small>' + D.map(function (x) { return h(x.what.replace('Driver ', '').replace('Driving licence check', 'Licence check')) + ' ' + h(x.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })); }).join(' · ') + '</small></span>' + cTag(w) + (w.lvl !== 'ok' ? '<button class="btn sm" data-act="y5Book" data-k="' + w.key + '" data-w="' + h(w.what) + '">Mark checked</button>' : '') + '</div>'; }).join('') + '</section></div>' +
        '<section class="card ycash-c"><div class="yh-rh"><h3>' + ic('alert') + 'Needs doing</h3></div>' + (bad.concat(soon).filter(function (x) { return x.grp === 'fleet'; }).sort(function (a, b) { return a.days - b.days; }).map(function (x) { return row(Object.assign({}, x, { what: x.reg + ', ' + x.what })); }).join('') || '<p class="muted">Every lorry is in date.</p>') + '</section>' +
        '<p class="muted yfoot">Sample dates. Each lorry\'s checks, the company\'s licences and permits, and every driver, in one place. Overdue in red, due in 14 days in amber.</p>';
    };
    A.y5Book = function (el) { var y = Y(); y.y5Done = y.y5Done || {}; y.y5Done[el.dataset.k] = Date.now(); y.v++; save(); UI.render(); toast(h(el.dataset.w) + ': done and the next date set', 'circle-check'); };

    /* ======================================================================
       DUTY OF CARE: the yard's own records
       ====================================================================== */
    V.paperwork = function () {
      var W = O.orders().filter(function (o) { return o.wtn && (o.past || o.status === 'done'); }).sort(function (a, b) { return b.day - a.day || b.win[0] - a.win[0]; }), m = W.filter(function (o) { return sameMonth(o.day); });
      var docs = [['Waste carriers licence', YC.CARRIER.reg + ', upper tier, ' + YC.CARRIER.name, 'Renews ' + dDate(400)], ['Environmental permit, our transfer station', YC.YARD.permit + ', ' + YC.TIPS.yard.n, 'In force'], ['Where our soil goes', YC.TIPS.soil.n + ', permit ' + YC.TIPS.soil.permit, 'Checked ' + dDate(-40)], ['Operator licence', 'Standard national, 6 vehicles, 2 operating centres', 'Renews ' + dDate(900)], ['Waste hierarchy declaration', 'On every transfer note we issue', 'In force']];
      return '<div class="ykpis three"><div class="card kpi hero"><small>' + ic('certificate') + 'Transfer notes issued, ' + h(monthName()) + '</small><b>' + m.length + '</b><span class="d">to our customers, signed and stored</span></div><div class="card kpi"><small>' + ic('stack') + 'All on file</small><b>' + W.length.toLocaleString('en-GB') + '</b><span class="d">kept for at least 2 years</span></div><div class="card kpi"><small>' + ic('shield-check') + 'Licences and permits</small><b>' + docs.length + '</b><span class="d">all in date</span></div></div>' +
        '<section class="card ycash-c"><div class="yh-rh"><h3>' + ic('shield-check') + 'Our licences and permits</h3><small class="muted">What a customer or the Environment Agency will ask to see</small></div>' + docs.map(function (d) { return '<div class="ych"><span class="bd"><b>' + h(d[0]) + '</b><small>' + h(d[1]) + '</small></span><span class="tag ok">' + ic('check') + h(d[2]) + '</span></div>'; }).join('') + '</section>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 0"><h3>' + ic('certificate') + 'Transfer notes we have issued</h3><small class="muted">The latest 40. Every one is in History too</small></div><div class="tw"><table class="t ytab"><thead><tr><th>Note</th><th>When</th><th>Customer</th><th class="hide-sm">Waste</th><th class="r">Tonnes</th><th></th></tr></thead><tbody>' +
        W.slice(0, 40).map(function (o) { var t = O.ticketOf(o); return '<tr><td><b>' + h(o.wtn) + '</b><small>' + h(o.id) + '</small></td><td>' + h(o.day === 0 ? 'Today' : dDate(o.day)) + '</td><td>' + h(O.custOf(o)) + '<small>' + h(o.site.name) + '</small></td><td class="hide-sm">' + h(YC.STREAMS[o.stream].n) + '<small>EWC ' + YC.STREAMS[o.stream].ewc + '</small></td><td class="r num">' + (t ? t.net.toFixed(2) : '') + '</td><td class="r"><button class="btn sm" data-act="y4Doc" data-k="wtn" data-id="' + h(o.id) + '">' + ic('eye') + 'View</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
    };

    /* ======================================================================
       WASTE AND CARBON: the yard's own figures
       ====================================================================== */
    var CO2 = { mixed: 0.21, soil: 0.02, hardcore: 0.01, concrete: 0.01, wood: 0.44, green: 0.3, plaster: 0.07, metal: 1.4, house: 0.25 };   /* t CO2e saved per tonne recovered, an estimate */
    function loads(off) { return O.orders().filter(function (o) { return sameMonth(o.day, off) && o.day <= 0 && (o.past || o.status === 'done') && O.ticketOf(o); }); }
    function sumUp(L) {
      var r = { t: 0, rec: 0, co2: 0, st: {}, cu: {} };
      L.forEach(function (o) { var t = O.ticketOf(o).net, sv = YC.STREAMS[o.stream], rc = t * sv.rec / 100; r.t += t; r.rec += rc; r.co2 += rc * (CO2[o.stream] || 0.1); r.st[o.stream] = (r.st[o.stream] || 0) + t; var c = O.custOf(o); r.cu[c] = r.cu[c] || { t: 0, rec: 0, n: 0 }; r.cu[c].t += t; r.cu[c].rec += rc; r.cu[c].n++; });
      r.pct = r.t ? Math.round(r.rec / r.t * 1000) / 10 : 0; return r;
    }
    function monthsBack() { var o = [], d = 0, seen = {}; while (o.length < 6 && d > -200) { var k = YC.dayDate(d).getMonth(); if (!seen[k]) { seen[k] = 1; o.unshift(d); } d--; } return o; }
    V.reports = function () {
      var cur = sumUp(loads(0)), M = monthsBack().map(function (off) { return { off: off, r: sumUp(loads(off)) }; }), mx = Math.max.apply(null, M.map(function (m) { return m.r.t; }).concat([1]));
      var custs = Object.keys(cur.cu).map(function (k) { return { n: k, x: cur.cu[k] }; }).sort(function (a, b) { return b.x.t - a.x.t; }).slice(0, 12);
      return '<div class="ybar"><span class="yhint">' + ic('leaf') + 'Our own figures: every load our lorries brought back, by weighbridge ticket. Tap any figure for the jobs behind it.</span><span class="sp"></span><button class="btn" data-act="go" data-v="defra">' + ic('shield-check') + 'Defra tracking</button><button class="btn pri" data-act="y5Return" id="y5Return">' + ic('download') + 'Export ready for your Defra return</button></div>' +
        '<div class="ykpis"><button class="card kpi" data-act="y5Drill" data-k="tonnes"><small>' + ic('stack') + 'Tonnes, ' + h(monthName()) + '</small><b>' + cur.t.toFixed(1) + '</b><span class="d">so far, from the tickets</span></button><button class="card kpi hero" data-act="y5Drill" data-k="tonnes"><small>' + ic('leaf') + 'Recycling rate</small><b>' + cur.pct + '%</b><span class="d">recycled or recovered</span></button>' +
        '<button class="card kpi" data-act="y5Drill" data-k="tonnes"><small>' + ic('trending-up') + 'Diverted from landfill</small><b>' + cur.rec.toFixed(1) + ' t</b><span class="d">' + (cur.t - cur.rec).toFixed(1) + ' t to landfill</span></button><div class="card kpi"><small>' + ic('leaf') + 'CO2e saved</small><b>' + cur.co2.toFixed(1) + ' t</b><span class="d">an estimate, UK conversion factors</span></div></div>' +
        '<div class="yrec"><section class="card"><div class="yh-rh"><h3>By month</h3><small class="muted">Tonnes, and the recycling rate</small></div><div class="ybars">' + M.map(function (m) { return '<button class="ybar1" data-act="y5Drill" data-k="month" data-v="' + m.off + '"><span class="v">' + m.r.pct + '%</span><i style="height:' + Math.round(m.r.t / mx * 150) + 'px"></i><b>' + h(YC.dayDate(m.off).toLocaleDateString('en-GB', { month: 'short' })) + '</b><small>' + Math.round(m.r.t) + ' t</small></button>'; }).join('') + '</div></section>' +
        '<section class="card"><div class="yh-rh"><h3>By waste type, ' + h(monthName()) + '</h3></div><div class="ystreams">' + Object.keys(cur.st).sort(function (a, b) { return cur.st[b] - cur.st[a]; }).map(function (k) { var st = YC.STREAMS[k]; return '<button class="ystr-b" data-act="y5Drill" data-k="stream" data-v="' + k + '"><span><b>' + h(st.n) + '</b><small>EWC ' + st.ewc + ' · ' + cur.st[k].toFixed(1) + ' t</small></span><span class="yh-bar"><i style="width:' + st.rec + '%"></i></span><b>' + st.rec + '%</b></button>'; }).join('') + '</div></section></div>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 0"><h3>Per customer, ' + h(monthName()) + '</h3><small class="muted">Each customer sees their own in the customer portal, with a download for their ESG or carbon reporting</small></div><div class="tw"><table class="t ytab"><thead><tr><th>Customer</th><th class="r">Loads</th><th class="r">Tonnes</th><th class="r">Recycled</th><th class="r hide-sm">CO2e saved</th></tr></thead><tbody>' +
        custs.map(function (c) { return '<tr class="click" data-act="y5Drill" data-k="cust" data-v="' + h(c.n) + '"><td><b>' + h(c.n) + '</b></td><td class="r num">' + c.x.n + '</td><td class="r num">' + c.x.t.toFixed(1) + '</td><td class="r num"><b>' + (c.x.t ? Math.round(c.x.rec / c.x.t * 100) : 0) + '%</b></td><td class="r num hide-sm">' + (c.x.rec * 0.2).toFixed(1) + ' t</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<p class="muted yfoot">Sample figures. Tonnes are from your weighbridge tickets. Recycling rates are each receiving site\'s own figure. Carbon is an estimate using the UK government\'s conversion factors. The export is ready for your Defra return; you send it from your own login.</p>';
    };
    A.y5Return = function () {
      var L = loads(0), by = {}; L.forEach(function (o) { var k = o.stream + '|' + (O.ticketOf(o).site); by[k] = (by[k] || 0) + O.ticketOf(o).net; });
      var rows = [['Month', 'EWC code', 'Waste description', 'Tonnes', 'Recovery or disposal code', 'Receiving site', 'Site permit']].concat(Object.keys(by).map(function (k) { var p = k.split('|'), st = YC.STREAMS[p[0]], tip = YC.TIPS[p[1]]; return [monthName() + ' ' + YC.dayDate(0).getFullYear(), st.ewc, st.n, by[k].toFixed(2), st.code, tip.n, tip.permit]; }));
      var csv = rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'waste-return-' + K.iso(0).slice(0, 7) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
      toast('Export ready for your Defra return: ' + plural(rows.length - 1, 'line') + ', ' + L.reduce(function (a, o) { return a + O.ticketOf(o).net; }, 0).toFixed(1) + ' t', 'download');
    };

    /* ======================================================================
       MONEY: the yard's own invoices, cash and profit
       ====================================================================== */
    V.money = function () {
      var s = S(), L = doneThisMonth(), rev = L.reduce(function (a, o) { return a + (o.price || 0) + overAmt(o); }, 0), ag = K.aged(), R = profit(), pr = R.reduce(function (a, r) { return a + r.profit; }, 0);
      var cash = YC.cashItems(s, Y()).filter(function (x) { return x.state === 'collected' && sameMonth(x.day); }).reduce(function (a, x) { return a + x.cash.gross; }, 0);
      var todo = Y().jobs.filter(function (j) { return j.day === 0 && j.status === 'done' && !YC.isCash(j) && !j.invoiced; });
      var over = window.DSGBRIDGE ? window.DSGBRIDGE() : '';
      return '<div class="ykpis"><button class="card kpi hero" data-act="y5Drill" data-k="rev"><small>' + ic('pound') + 'Sales, ' + h(monthName()) + '</small><b>' + money(rev) + '</b><span class="d">' + plural(L.length, 'job') + ' done, tap for the list</span></button><button class="card kpi" data-act="go" data-v="credit"><small>' + ic('receipt') + 'Owed to you</small><b>' + money(ag.total) + '</b><span class="d">' + money(ag.over) + ' overdue</span></button>' +
        '<button class="card kpi" data-act="go" data-v="cash"><small>' + ic('pound') + 'Cash this month</small><b>' + money(cash) + '</b><span class="d">paid cash sales, in your accounts</span></button><button class="card kpi" data-act="go" data-v="lorryprofit"><small>' + ic('truck') + 'Profit, all lorries</small><b class="' + (pr < 0 ? 'bad' : 'ok') + '">' + money(pr) + '</b><span class="d">open Profit per lorry</span></button></div>' + over +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('receipt') + 'Invoices</h3>' + (todo.length ? '<button class="btn sm pri" data-act="y5InvAll">' + ic('plus') + 'Invoice ' + plural(todo.length, 'finished job') + '</button>' : '<small class="muted">Every finished job today is invoiced. Cash jobs post as paid cash sales</small>') + '</div><div class="tw"><table class="t"><thead><tr><th>Invoice</th><th>Customer</th><th class="hide-sm">For</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>' +
        s.invoices.slice().sort(function (a, b) { return (a.status === 'paid') - (b.status === 'paid') || a.due - b.due; }).map(function (i) { var c = CS.cust(i.cust), late = i.status !== 'paid' && i.due < 0;
          return '<tr><td><b>' + h(i.id) + '</b><small>' + CS.fmtDay(i.issued) + '</small></td><td>' + h(c ? c.name : '') + '</td><td class="hide-sm">' + h(i.what || (i.jobs && i.jobs.length ? i.jobs.join(', ') : 'Skip and grab work')) + (i.over ? '<span class="tag bad">Excess weight ' + money(i.over, true) + '</span>' : '') + '</td><td class="r num"><b>' + money(i.amount, true) + '</b><small>+ VAT</small></td><td>' + (i.status === 'paid' ? '<span class="tag ok">Paid</span>' : late ? '<span class="tag bad">' + (-i.due) + ' days late</span>' : '<span class="tag">Due</span>') + '</td>' +
            '<td class="r">' + (i.status !== 'paid' ? '<button class="btn sm" data-act="markPaid" data-id="' + i.id + '">' + ic('check') + '<span class="hide-sm">Mark paid</span></button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<p class="muted yfoot">Every sale goes to your accounts package with its VAT: invoices when they are raised, cash jobs as paid cash sales when the driver answers. Payments come back to credit control.</p>';
    };
    A.y5InvAll = function () {
      var s = S(), n = 0; Y().jobs.filter(function (j) { return j.day === 0 && j.status === 'done' && !YC.isCash(j) && !j.invoiced; }).forEach(function (j) { var c = CS.cust(j.cust), id = O.invNo(j), ov = overAmt(j); j.invoiced = id; if (c && !s.invoices.some(function (i) { return i.id === id; })) { s.invoices.unshift({ id: id, cust: j.cust, amount: (j.price || 0) + ov, issued: 0, due: c.limit ? 30 : 7, status: 'unpaid', jobs: [j.id], what: YC.whatShort(j) + ', ' + j.site.name.split(',')[0], over: ov || null }); n++; } });
      Y().v++; save(); UI.render(); toast(plural(n, 'invoice') + ' raised and sent to your accounts package. Demo, nothing is sent', 'receipt');
    };

    /* ======================================================================
       broker screens out, new screens in
       ====================================================================== */
    ['jobs', 'suppliers', 'find', 'bills', 'pricebook'].forEach(function (k) { for (var i = UI.VIEWS.length - 1; i >= 0; i--) if (UI.VIEWS[i].k === k) UI.VIEWS.splice(i, 1); delete V[k]; });
    view('lorryprofit', 'Money', 'Profit per lorry', 'truck', 'What each lorry earned, cost and made this month, with your fuel card statement');
    view('compliance', 'Yard', 'Compliance', 'shield-check', 'Lorry checks, LOLER, licences, permits and driver checks, with due dates');
    view('paperwork', 'Yard', 'Duty of care', 'certificate', 'Our licences and permits, and every transfer note we have issued');
    view('reports', 'Yard', 'Waste and carbon', 'leaf', 'Our tonnes, recycling rate, landfill diverted and carbon, with the Defra return export');
    view('money', 'Money', 'Money', 'pound', 'Sales, invoices, cash and profit');
    var ord = ['home', 'inbox', 'tracking', 'bookings', 'plan', 'orders', 'history', 'skips', 'permits', 'customers', 'quotes', 'chasing', 'portal', 'money', 'credit', 'cash', 'lorryprofit', 'prices', 'scoreboard', 'wastein', 'wasteout', 'tickets', 'defra', 'reports', 'recycling', 'compliance', 'paperwork'];
    UI.VIEWS.sort(function (a, b) { var ia = ord.indexOf(a.k), ib = ord.indexOf(b.k); return (ia < 0 ? 900 : ia) - (ib < 0 ? 900 : ib); });
    if (K.MAP) { K.MAP.lorryprofit = ['Money', 'Profit per lorry', 'truck']; K.MAP.wasteout = ['Yard', 'Waste out', 'route']; }
    window.DSGY5 = { profit: profit, drill: drill };
    UI.render();
  }
  start(0);
})();
