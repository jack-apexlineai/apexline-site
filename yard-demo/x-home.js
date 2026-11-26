/* Home, laid out like WasteLine's: the date and greeting, four numbers, the month's revenue with today on the road
   beside it, then tomorrow and the latest orders. Every figure comes from the same sample data as the rest of the demo. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, V2 = window.DSGV2, V3 = window.DSGV3;
    if (!(UI && UI.V && CS && CS.S && V2 && V2.x && V3 && V3.forecast && V3.all)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var X2 = V2.x, ui = UI.ui, ic = window.ic || function () { return ''; };
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n, p) { return '£' + (p ? (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-GB')); }
    function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
    function isDone(m) { return X2.track(m.j, m.d, m.what)[2] >= 3; }
    function mlen(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

    function figures() {
      var f = V3.forecast(), cur = f.cur, prev = f.prev, all = V3.all(), now = CS.dayDate(0), dow = (now.getDay() + 6) % 7;
      var t0 = X2.movesOn(0), t0d = t0.filter(isDone).length, t1 = X2.movesOn(1), t1w = t1.filter(function (m) { return m.j.status === 'booked'; }).length;
      /* tomorrow is counted the way the diary shows it: orders delivered that day, then swaps and collections on top */
      var t1o = V3.all().filter(function (o) { return o.off === 1; }), t1sw = t1.filter(function (m) { return m.what !== 'Delivery'; }).length;
      var unpaid = CS.S.invoices.filter(function (i) { return i.status !== 'paid'; }), owed = unpaid.reduce(function (a, i) { return a + (i.amount || 0); }, 0);
      var wk = all.filter(function (o) { return o.off >= -dow && o.off <= 6 - dow; }), wkRev = wk.reduce(function (a, o) { return a + o.sell; }, 0);
      var paid = cur.l.filter(function (o) { return o.pay === 'paid'; }).reduce(function (a, o) { return a + o.sell; }, 0);
      var booked0 = all.filter(function (o) { return o.src === 'j' && o.job && o.job.log && o.job.log.some(function (l) { return now - new Date(l.at) < 86400000 && /booked|placed/i.test(l.t); }); }).length;
      var t1card = t1.filter(function (m) { var c = CS.cust(m.j.cust); return c && /card/i.test(c.terms || '') && !CS.S.invoices.some(function (i) { return i.status === 'paid' && (i.jobs || []).indexOf(m.j.id) >= 0; }); }).length;
      return { f: f, cur: cur, prev: prev, all: all, t0: t0, t0d: t0d, t1: t1, t1w: t1w, t1o: t1o, t1sw: t1sw, unpaid: unpaid, owed: owed, wk: wk, wkRev: wkRev, paid: paid, booked0: booked0 || t0.length, t1card: t1card, now: now };
    }
    function chart(F) {
      var now = F.now, dom = now.getDate(), len = mlen(now), W = 760, Hh = 230, L = 8, R = 8, T = 14, B = 8;
      function cum(list, n) { var by = [], i; for (i = 0; i <= n; i++) by[i] = 0; list.forEach(function (o) { var d = CS.dayDate(o.off).getDate(); if (d <= n) by[d] += o.sell; }); for (i = 1; i <= n; i++) by[i] += by[i - 1]; return by; }
      var a = cum(F.cur.l, len), pd = new Date(now.getFullYear(), now.getMonth() - 1, 1), plen = mlen(pd), b = F.prev ? cum(F.prev.l, plen) : null;
      var top = Math.max(a[dom], b ? b[Math.min(dom, plen)] : 0, F.f.est * 0.6) * 1.15 || 1;
      function x(d) { return L + (d - 1) / (len - 1) * (W - L - R); }
      function y(v) { return T + (1 - v / top) * (Hh - T - B); }
      function smooth(arr, to) { var p = []; for (var d = 1; d <= to; d++) p.push([x(d), y(arr[Math.min(d, arr.length - 1)])]); if (!p.length) return ''; var s = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1); for (var i = 1; i < p.length; i++) { var c = (p[i][0] - p[i - 1][0]) / 2; s += ' C' + (p[i - 1][0] + c).toFixed(1) + ' ' + p[i - 1][1].toFixed(1) + ' ' + (p[i][0] - c).toFixed(1) + ' ' + p[i][1].toFixed(1) + ' ' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1); } return s; }
      var line = smooth(a, dom), area = line + ' L' + x(dom).toFixed(1) + ' ' + y(0).toFixed(1) + ' L' + x(1).toFixed(1) + ' ' + y(0).toFixed(1) + ' Z';
      var grid = [0.25, 0.5, 0.75].map(function (k) { return '<line class="g" x1="0" x2="' + W + '" y1="' + (T + k * (Hh - T - B)).toFixed(1) + '" y2="' + (T + k * (Hh - T - B)).toFixed(1) + '"/>'; }).join('');
      return '<svg class="xh2-chart" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" role="img" aria-label="Revenue booked this month, day by day, against last month"><defs><linearGradient id="xh2g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F4FA8" stop-opacity=".32"/><stop offset="1" stop-color="#1F4FA8" stop-opacity="0"/></linearGradient></defs>' + grid +
        (b ? '<path class="pm" d="' + smooth(b, Math.min(len, plen)) + '"/>' : '') + '<path class="ar" d="' + area + '"/><path class="ln" d="' + line + '"/><circle class="dot" cx="' + x(dom).toFixed(1) + '" cy="' + y(a[dom]).toFixed(1) + '" r="5"/></svg>' +
        '<div class="xh2-axis"><span>1 ' + F.cur.long.slice(0, 3) + '</span><span><i class="k1"></i>' + h(F.cur.long) + (F.prev ? '<i class="k2"></i>' + h(F.prev.long) : '') + '</span><span>' + dom + ' ' + F.cur.long.slice(0, 3) + '</span></div>';
    }
    function ring(done, total) {
      var r = 62, c = 2 * Math.PI * r, p = total ? done / total : 0;
      return '<div class="xh2-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="bg" cx="80" cy="80" r="' + r + '"/><circle class="fg" cx="80" cy="80" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p)).toFixed(1) + '" style="--c:' + c.toFixed(1) + '"/></svg><div class="xh2-rt"><b>' + done + '<i>/' + total + '</i></b><span>jobs done</span></div></div>';
    }
    UI.V.home = function () {
      var F = figures(), now = F.now, hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
      var dayTxt = now.toLocaleDateString('en-GB', { weekday: 'long' }) + ' ' + ord(now.getDate()) + ' ' + now.toLocaleDateString('en-GB', { month: 'long' });
      var dr = F.prev ? F.cur.s.rev - F.prev.st.rev : 0, avg = F.cur.s.n ? F.cur.s.rev / F.cur.s.n : 0;
      var needs = CS.S.threads.filter(function (t) { return !t.done && CS.needsYou(t); }).length;
      var latest = F.all.filter(function (o) { return o.off <= 7; }).sort(function (x1, y1) { return (+String(y1.id).replace(/\D/g, '')) - (+String(x1.id).replace(/\D/g, '')); }).slice(0, 5);
      function kpi(n, label, sub, cls, act) { return '<button class="card xh2-k" ' + act + '><b>' + n + '</b><span>' + label + '</span><small class="' + (cls || '') + '">' + sub + '</small></button>'; }
      return '<div class="xh2-head"><div><small class="xh2-date">' + h(dayTxt) + '</small><h2 id="greet">' + greet + ', Dave</h2>' + (needs ? '<button class="xh2-needs" data-act="go" data-v="inbox">' + ic('inbox') + needs + ' message' + (needs === 1 ? ' needs' : 's need') + ' you</button>' : '') + '</div><button class="btn pri xh2-new" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
        '<div class="xh2-kpis">' +
        kpi(F.t0.length, 'Jobs today', F.t0d + ' done', '', 'data-act="jobTab" data-v="live"') +
        kpi(F.t1o.length, 'Orders tomorrow', (F.t1w ? F.t1w + ' waiting on a supplier' : 'All confirmed') + (F.t1sw ? ', plus ' + F.t1sw + ' swap' + (F.t1sw === 1 ? '' : 's') + ' and collections' : ''), F.t1w ? 'bad' : 'ok', 'data-act="xh2Dia" data-v="1"') +
        kpi(money(F.owed, true), 'Unpaid', F.unpaid.length + ' invoice' + (F.unpaid.length === 1 ? '' : 's'), '', 'data-act="go" data-v="credit"') +
        kpi(money(F.wkRev, true), 'Revenue: booked this week', F.wk.length + ' orders since Monday', '', 'data-act="xh2Dia" data-v="week"') + '</div>' +
        '<div class="xh2-mid"><section class="card xh2-rev" id="homeChart"><div class="xh2-rh"><h3>Revenue</h3><span class="xh2-pill">' + ic('calendar') + 'This month</span></div>' +
        '<div class="xh2-figs"><div><b>' + money(F.cur.s.rev, true) + '</b><span>booked this month · ' + F.cur.s.n + ' orders</span></div>' +
        (F.prev ? '<div><b class="' + (dr >= 0 ? 'up' : 'down') + '">' + (dr >= 0 ? '+' : '-') + money(Math.abs(dr), true) + '</b><span>vs this point in ' + h(F.prev.long) + '</span></div>' : '') +
        '<div><b>' + money(F.paid, true) + '</b><span>paid</span></div><div><b>' + money(avg, true) + '</b><span>average order</span></div></div>' + chart(F) + '</section>' +
        '<section class="card xh2-road" id="homeDay"><div class="xh2-rh"><h3>Today on the road</h3><button class="xh2-live" data-act="jobTab" data-v="live"><i></i>Live jobs</button></div>' + ring(F.t0d, F.t0.length) +
        '<div class="xh2-rows"><button data-act="jobTab" data-v="live"><span>Still to do</span><b>' + (F.t0.length - F.t0d) + '</b></button><button data-act="xh2Dia" data-v="0"><span>Booked for today</span><b>' + F.t0.length + '</b></button></div>' +
        '<small class="xh2-note">Times are the supplier\'s window. Not vehicle tracking.</small></section></div>' +
        '<div class="xh2-low"><section class="card xh2-list"><div class="xh2-rh"><h3>Tomorrow</h3><button class="xh2-link" data-act="xh2Dia" data-v="1">Open tomorrow</button></div>' +
        '<div class="xh2-rows"><div><span>Orders</span><b>' + F.t1o.length + '</b></div><div><span>Swaps and collections</span><b>' + F.t1sw + '</b></div><div><span>Waiting on a supplier</span><b class="' + (F.t1w ? 'bad' : '') + '">' + F.t1w + '</b></div><div><span>Not paid (card customers)</span><b>' + F.t1card + '</b></div></div></section>' +
        '<section class="card xh2-list"><div class="xh2-rh"><h3>Latest orders</h3><button class="xh2-link" data-act="go" data-v="history">All orders</button></div>' +
        latest.map(function (o) { var c = CS.cust(o.cust) || {}, what = ''; try { what = CS.jobDesc(o.src === 'j' ? o.job : o); } catch (e) { what = o.svc; }
          return '<button class="xh2-o" data-act="ordOpen" data-id="' + h(o.id) + '"><span><b>' + h(o.id) + ' · ' + h(c.name || '') + '</b><small>' + h(what) + ' · ' + CS.dayDate(o.off).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</small></span><span class="r"><b>' + money(o.sell, true) + '</b><span class="tag ' + (o.pay === 'paid' ? 'ok' : o.pay === 'unpaid' ? 'amber' : '') + '">' + (o.pay === 'paid' ? 'Paid' : o.pay === 'unpaid' ? 'Not paid' : 'To invoice') + '</span></span></button>'; }).join('') + '</section></div>';
    };
    /* the diary on the right day: data-v is a day offset (0 today, 1 tomorrow) or 'week' */
    UI.A.xh2Dia = function (el) {
      var v = el.dataset.v; UI.A.go({ dataset: { v: 'orders' } });
      if (v === 'week') { UI.A.diaMode({ dataset: { v: 'week' } }); return; }
      UI.A.diaMode({ dataset: { v: 'day' } }); if (UI.A.diaRel) UI.A.diaRel({ dataset: { v: String(v) } });
    };
    /* Sales is just the pipeline: drag a deal to move it, open it to add a note. The call counts and charts are gone. */
    var sv = UI.V.sales;
    UI.V.sales = function () {
      var html = sv.apply(this, arguments), k = html.indexOf('<div class="grid g4 kpis"');
      if (k > 0) html = html.slice(0, k);
      return html.replace(/<h2 style="font-size:18px">Sales team<\/h2><span class="muted" style="font-size:13px">[^<]*<\/span>/, '<h2 style="font-size:18px">Sales pipeline</h2><span class="muted" style="font-size:13px">Drag a deal to move it. Open it to add a note or message them.</span>');
    };
    if (ui.view === 'home' || ui.view === 'sales') UI.render();
  }
  start(0);
})();
