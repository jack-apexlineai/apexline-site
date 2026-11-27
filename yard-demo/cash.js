/* Cash: jobs paid in cash on the day. What came in today and this month, what is still to collect, where it was not collected
   (with a chase), and what each driver has to hand in, ticked off when it is banked.
   Every cash job goes to the accounts package as a sale with its VAT, exactly like an invoiced job. Nothing is left out.
   Sample data in this browser only. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && YC.cashItems && window.DSGNAV)) { if ((tries || 0) < 200) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, gbp = YC.gbp;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    function plural(n, w) { return n + ' ' + (n === 1 ? w : w + 's'); }
    function toast(t, i) { var b = q('#toasts'); if (!b) return; var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200); }
    function sum(l, k) { return Math.round(l.reduce(function (a, x) { return a + (x.cash[k || 'gross'] || 0); }, 0) * 100) / 100; }
    function dayTxt(d) { return d === 0 ? 'Today' : d === -1 ? 'Yesterday' : YC.dayDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    function thisMonth(d) { return YC.dayDate(d).getMonth() === YC.dayDate(0).getMonth() && YC.dayDate(d).getFullYear() === YC.dayDate(0).getFullYear(); }
    function lorryOf(id) { return YC.lorry(id) || { reg: '', driver: 'Driver', first: 'Driver' }; }
    function key(x) { return x.job ? x.job.id : x.ref; }
    function find(k) { return YC.cashItems(S(), Y()).filter(function (x) { return key(x) === k; })[0]; }
    function plate(id) { var l = YC.lorry(id); return l ? '<span class="yplate yx">' + h(l.reg) + '</span>' : ''; }

    V.cash = function () {
      var y = Y(), all = YC.cashItems(S(), y), later = YC.cashLater(y);
      var today = all.filter(function (x) { return x.day === 0; }), month = all.filter(function (x) { return thisMonth(x.day); });
      var colT = today.filter(function (x) { return x.state === 'collected'; }), colM = month.filter(function (x) { return x.state === 'collected'; });
      var due = today.filter(function (x) { return x.state === 'due'; }), not = all.filter(function (x) { return x.state === 'not'; }), notOpen = not.filter(function (x) { return !x.cash.settled; });
      var hand = all.filter(function (x) { return x.state === 'collected' && !x.cash.banked; });
      var posted = month.filter(function (x) { return x.cash.post; }).sort(function (a, b) { return b.day - a.day || b.time - a.time; });
      var laterAmt = later.reduce(function (a, j) { return a + YC.cashAmt(j).gross; }, 0);
      var monthName = YC.dayDate(0).toLocaleDateString('en-GB', { month: 'long' });

      var kpis = '<div class="ykpis"><div class="card kpi hero"><small>' + ic('pound') + 'Cash collected today</small><b id="cashToday">' + gbp(sum(colT)) + '</b><span class="d">' + plural(colT.length, 'cash job') + ', from the drivers</span></div>' +
        '<div class="card kpi"><small>' + ic('calendar') + 'Cash collected this month</small><b id="cashMonth">' + gbp(sum(colM)) + '</b><span class="d">' + plural(colM.length, 'job') + ' since 1 ' + h(monthName) + '</span></div>' +
        '<div class="card kpi"><small>' + ic('clock') + 'Cash still to collect</small><b class="amber" id="cashDue">' + gbp(sum(due)) + '</b><span class="d">' + plural(due.length, 'job') + ' on today' + (later.length ? ', plus ' + gbp(laterAmt) + ' booked on later days' : '') + '</span></div>' +
        '<div class="card kpi"><small>' + ic('alert') + 'Not collected</small><b class="' + (notOpen.length ? 'bad' : '') + '" id="cashNot">' + gbp(sum(notOpen)) + '</b><span class="d">' + plural(notOpen.length, 'job') + ' to chase</span></div></div>';

      var dueC = '<section class="card ycash-c" id="cashDueList"><div class="yh-rh"><h3>' + ic('clock') + 'Still to collect today</h3><small class="muted">The driver is asked on his phone before the job goes to the office</small></div>' +
        (due.length ? due.map(function (x) { var j = x.job; return '<div class="ych"><span class="bd"><b>' + h(x.cname) + ' ' + YC.cashTag(j) + '</b><small>' + h(j.id) + ' · ' + h(x.what) + ' · ' + h(x.site) + ' · ' + h(YC.win(j)) + '</small></span>' + (j.lorry ? plate(j.lorry) : '<span class="tag bad">No lorry yet</span>') + '<button class="btn sm" data-act="yJob" data-id="' + j.id + '">' + ic('eye') + 'Job</button></div>'; }).join('') : '<p class="muted">Nothing left to collect today.</p>') +
        (later.length ? '<p class="muted" style="font-size:12.5px;margin:8px 0 0">' + plural(later.length, 'cash job') + ' booked on later days: ' + later.slice(0, 4).map(function (j) { return h(j.id) + ' ' + h(gbp(YC.cashAmt(j).gross)); }).join(', ') + '.</p>' : '') + '</section>';

      var notC = '<section class="card ycash-c" id="cashNotList"><div class="yh-rh"><h3>' + ic('alert') + 'Cash not collected</h3><small class="muted">Still a sale in your accounts package, owed until it is paid</small></div>' +
        (not.length ? not.sort(function (a, b) { return (a.cash.settled ? 1 : 0) - (b.cash.settled ? 1 : 0) || b.day - a.day; }).map(function (x) {
          var k = key(x), c = x.cash, ph = x.job ? (YC.oneoff(x.job.cust) || CS.cust(x.job.cust) || {}).phone : '';
          return '<div class="ych' + (c.settled ? ' ycash-done' : '') + '"><span class="bd"><b>' + h(x.cname) + ' · ' + gbp(c.gross) + (c.settled ? ' <span class="tag ok">' + ic('check') + 'Paid by ' + h(c.settled.how) + '</span>' : ' <span class="tag bad">Cash NOT collected</span>') + '</b><small>' + h(dayTxt(x.day)) + ' · ' + h(x.what) + ' · ' + h(x.site) + ' · ' + h(lorryOf(x.lorry).driver) + '</small><small><i>' + h(c.why || 'No reason given') + '</i>' + (c.chased ? ' · ' + plural(c.chased, 'reminder') + ' sent' : '') + '</small></span>' +
            (c.settled ? '' : '<button class="btn sm pri" data-act="cashChase" data-k="' + h(k) + '">' + ic('send') + (c.chased ? 'Chase again' : 'Send a pay link') + '</button>' + (ph ? '<a class="btn sm" href="tel:' + h(String(ph).replace(/\s/g, '')) + '">' + ic('phone') + 'Ring</a>' : '') + '<button class="btn sm" data-act="cashSettle" data-k="' + h(k) + '">' + ic('check') + 'Mark paid</button>') + '</div>';
        }).join('') : '<p class="muted">Every cash job has been collected.</p>') + '</section>';

      var by = {}; hand.forEach(function (x) { var k = x.lorry || 'none'; (by[k] = by[k] || []).push(x); });
      var handC = '<section class="card ycash-c" id="cashHand"><div class="yh-rh"><h3>' + ic('users') + 'Cash to hand in, by driver</h3><small class="muted">Tick each one when it is banked</small></div>' +
        (Object.keys(by).length ? Object.keys(by).map(function (lid) {
          var L = by[lid], lo = lorryOf(lid);
          return '<div class="ycash-drv"><div class="ycash-dh"><span class="yplate sm">' + h(lo.reg) + '</span><b>' + h(lo.driver) + '</b><span class="sp"></span><b class="ycash-tot">' + gbp(sum(L)) + '</b><button class="btn sm" data-act="cashBankAll" data-l="' + h(lid) + '">' + ic('check') + 'All banked</button></div>' +
            L.map(function (x) { return '<label class="ycash-r"><input type="checkbox" class="ycash-bank" data-k="' + h(key(x)) + '"><span class="bd"><b>' + gbp(x.cash.gross) + '</b><small>' + h(dayTxt(x.day)) + ' · ' + h(x.cname) + ' · ' + h(x.what) + '</small></span><span class="ycash-bl">Banked</span></label>'; }).join('') + '</div>';
        }).join('') : '<p class="muted">Every driver has handed in. Nothing to bank.</p>') +
        (function () { var b = all.filter(function (x) { return x.state === 'collected' && x.cash.banked; }).sort(function (a, z) { return z.day - a.day; }).slice(0, 4); return b.length ? '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Banked lately: ' + b.map(function (x) { return gbp(x.cash.gross) + ' from ' + h(lorryOf(x.lorry).first) + ' (' + h(dayTxt(x.day)) + ')'; }).join(', ') + '.</p>' : ''; })() + '</section>';

      var pn = sum(posted, 'net'), pv = sum(posted, 'vat'), pg = sum(posted);
      var postC = '<div class="card" id="cashPost"><div class="yh-rh" style="padding:14px 16px 0"><h3>' + ic('receipt') + 'Sent to your accounts package</h3><small class="muted">Every cash job is a sale with VAT, the same as every invoiced job</small></div>' +
        '<div class="ycash-sum"><div><small>Cash sales in ' + h(monthName) + '</small><b>' + gbp(pn) + '</b><span>before VAT</span></div><div><small>VAT on them</small><b>' + gbp(pv) + '</b><span>in your VAT return</span></div><div><small>Total</small><b>' + gbp(pg) + '</b><span>' + plural(posted.length, 'sale') + '</span></div></div>' +
        '<div class="tw"><table class="t ytab"><thead><tr><th>Sale</th><th>Customer</th><th class="hide-sm">Job</th><th class="r">Net</th><th class="r">VAT</th><th class="r">Total</th><th>In your accounts</th></tr></thead><tbody>' +
        posted.map(function (x) { var c = x.cash; return '<tr><td><b>' + h(c.post.ref) + '</b><small>' + h(dayTxt(x.day)) + '</small></td><td>' + h(x.cname) + '<small>' + h(x.site) + '</small></td><td class="hide-sm">' + h(x.what) + '<small>' + h(lorryOf(x.lorry).driver) + '</small></td><td class="r num">' + gbp(c.net) + '</td><td class="r num">' + gbp(c.vat) + '</td><td class="r num"><b>' + gbp(c.gross) + '</b></td>' +
          '<td>' + (c.post.kind === 'paid' ? '<span class="tag ok">' + ic('check') + 'Paid cash sale</span><small>Collected by ' + h(lorryOf(x.lorry).first) + '</small>' : c.settled ? '<span class="tag ok">' + ic('check') + 'Sale, paid by ' + h(c.settled.how) + '</span>' : '<span class="tag bad">Sale, owed</span><small>Chased like any invoice</small>') + '</td></tr>'; }).join('') +
        '<tr class="ycash-totr"><td colspan="3"><b>' + h(monthName) + ' so far</b></td><td class="r num"><b>' + gbp(pn) + '</b></td><td class="r num"><b>' + gbp(pv) + '</b></td><td class="r num"><b>' + gbp(pg) + '</b></td><td></td></tr></tbody></table></div></div>' +
        '<p class="muted yfoot">A cash job goes to your accounts package the moment the driver answers: collected is a paid cash sale with its VAT; not collected is an unpaid sale, chased like any invoice. Cash income is always in your sales figures and your VAT return. Sample figures, nothing is sent in this demo.</p>';

      return kpis + '<div class="ycash-g">' + dueC + notC + '</div>' + postC;
    };

    function setBanked(x, on) { x.cash.banked = on; x.cash.bankedAt = on ? Date.now() : null; x.cash.bankedDay = on ? 0 : null; }
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el.classList || !el.classList.contains('ycash-bank')) return;
      var x = find(el.dataset.k); if (!x) return; setBanked(x, true); Y().v++; CS.save();
      toast(gbp(x.cash.gross) + ' from ' + h(lorryOf(x.lorry).first) + ' marked banked', 'circle-check'); setTimeout(function () { UI.render(); }, 250);
    });
    A.cashBankAll = function (el) {
      var L = YC.cashItems(S(), Y()).filter(function (x) { return x.state === 'collected' && !x.cash.banked && (x.lorry || 'none') === el.dataset.l; }); if (!L.length) return;
      L.forEach(function (x) { setBanked(x, true); }); Y().v++; CS.save(); UI.render();
      toast(gbp(sum(L)) + ' from ' + h(lorryOf(el.dataset.l).first) + ' banked, ' + plural(L.length, 'job'), 'circle-check');
    };
    A.cashChase = function (el) {
      var x = find(el.dataset.k); if (!x) return; x.cash.chased = (x.cash.chased || 0) + 1; x.cash.chasedAt = Date.now(); if (x.job) x.job.log.push({ at: Date.now(), t: 'Pay link sent for ' + gbp(x.cash.gross) }); Y().v++; CS.save(); UI.render();
      toast('Pay link for ' + gbp(x.cash.gross) + ' texted to ' + h(x.cname) + '. Demo, nothing is sent', 'send');
    };
    A.cashSettle = function (el) {
      var x = find(el.dataset.k); if (!x) return; x.cash.settled = { how: 'card', at: Date.now() }; if (x.job) x.job.log.push({ at: Date.now(), t: 'Paid by card, ' + gbp(x.cash.gross) }); Y().v++; CS.save(); UI.render();
      toast(h(x.cname) + ' paid ' + gbp(x.cash.gross) + '. Marked paid in your accounts package', 'circle-check');
    };

    if (location.hash === '#cash') ui.view = 'cash';
    UI.render();
  }
  start(0);
})();
