/* CAC demo, sixth layer: the order diary (month, week, day and list, with every past order), the order page,
   trends and the month end forecast, the supplier bill check, find a supplier by postcode with a scorecard,
   credit control with on stop, the connections page, and a calmer Home.
   Sample data only. Nothing leaves this browser. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var W = window.CACV3 = {}, H = null, X2 = null;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function S() { return CS.S; }
  function q(s) { return document.querySelector(s); }
  function D3() { var s = S(); if (!s.v3) s.v3 = { bill: null, issues: null }; return s.v3; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* ---------- dates ---------- */
  function date(off) { return CS.dayDate(off); }
  function offOf(d) { return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - CS.dayDate(0)) / 86400000); }
  function mk(d) { return d.getFullYear() * 12 + d.getMonth(); }
  function monthLen(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function isWd(d) { var w = d.getDay(); return w !== 0 && w !== 6; }
  function dShort(off) { var d = date(off); return d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== date(0).getFullYear() ? ' ' + d.getFullYear() : ''); }
  function dLong(off) { var d = date(off); return DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()] + ' ' + d.getFullYear(); }
  function wdBetween(a, b) { var n = 0; for (var o = a; o <= b; o++) if (isWd(date(o))) n++; return n; }

  /* ---------- every past order, made the same way each time from the calendar ---------- */
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function pick(r, pairs) { var t = pairs.reduce(function (a, p) { return a + p[1]; }, 0), x = r() * t; for (var i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x <= 0) return pairs[i][0]; } return pairs[pairs.length - 1][0]; }
  var CUSTW = [['c6', 18, 0], ['c1', 16, 0], ['c2', 14, 0], ['c4', 9, 0], ['c3', 10, 1], ['c7', 8, 1], ['c5', 7, 1], ['c8', 6, 2], ['c10', 6, 2], ['c9', 5, 3]];
  var SVCW = [['skip', 56], ['grab', 12], ['muck', 8], ['aggregates', 5], ['toilet', 4], ['concrete', 4], ['welfare', 3], ['fencing', 3], ['sweeper', 2], ['container', 2], ['plant', 1]];
  var SIZEW = [[8, 40], [12, 20], [6, 15], [4, 8], [16, 7], [20, 6], [14, 4]];
  var DAYW = [0, 1.25, 1.1, 1, 1, 0.8, 0.15];
  var HIRE = { skip: 1, welfare: 1, toilet: 1, container: 1, fencing: 1, plant: 1 }, WASTE = { skip: 1, grab: 1, muck: 1 };
  function makeOrder(r, mi) {
    var pool = CUSTW.filter(function (c) { return c[2] <= mi && CS.cust(c[0]); }).map(function (c) { return [c[0], c[1]]; });
    for (var t = 0; t < 6; t++) {
      var cid = pick(r, pool), c = CS.cust(cid), site = Math.floor(r() * c.sites.length), svc = t < 4 ? pick(r, SVCW) : 'skip';
      var o = { src: 'h', cust: cid, site: site, svc: svc, qty: 1, status: 'done', owner: c.owner || 'john' };
      if (svc === 'skip') o.size = pick(r, SIZEW);
      if (svc === 'grab' || svc === 'muck') o.qty = 1 + Math.floor(r() * 3);
      if (svc === 'toilet') { o.qty = 1 + Math.floor(r() * 2); o.weeks = 4 + Math.floor(r() * 5); }
      if (svc === 'welfare') o.weeks = 4 + Math.floor(r() * 6);
      if (svc === 'container') { o.weeks = 4 + Math.floor(r() * 8); o.ft = 20; }
      if (svc === 'fencing') { o.panels = 20 + 10 * Math.floor(r() * 5); o.weeks = 4 + Math.floor(r() * 8); }
      if (svc === 'sweeper') o.hours = 4;
      if (svc === 'concrete') o.m3 = 3 + Math.floor(r() * 6);
      if (svc === 'plant') o.weeks = 1 + Math.floor(r() * 2);
      var ranked = CS.lookup(c.sites[site].pc, o); if (!ranked.length) continue;
      var p = ranked.length > 1 && r() < 0.15 ? ranked[1] : ranked[0];
      o.sup = p.sup.id; o.cost = p.cost; o.sell = p.sell; o.quoted = r() < 0.4; o.exch = svc === 'skip' && r() < 0.22; o.payDays = 6 + Math.floor(r() * 24); o.book = 1 + Math.floor(r() * 3);
      return o;
    }
    return null;
  }
  var cache = null;
  function hist() {
    var s = S(); if (cache && cache.key === s.seededDay) return cache.list;
    var N = s.months.length, now = date(0), list = [];
    for (var i = 0; i < N; i++) {
      var first = new Date(now.getFullYear(), now.getMonth() - (N - 1 - i), i === 0 ? 3 : 1), y = first.getFullYear(), m = first.getMonth();
      var cur = i === N - 1, a = offOf(first), b = cur ? -1 : offOf(new Date(y, m, monthLen(y, m)));
      var days = []; for (var o2 = a; o2 <= b; o2++) { var w = DAYW[date(o2).getDay()]; if (w) days.push([o2, w * (1 + (o2 - a) / 90)]); }
      if (!days.length) continue;
      var R = s.months[i].rev, M = s.months[i].margin;
      s.jobs.forEach(function (j) { var d = date(j.day); if (j.day <= 0 && d.getMonth() === m && d.getFullYear() === y) { R -= j.sell; M -= (j.sell - j.cost); } });
      if (R < 400) continue;
      var r = rng(y * 100 + m + 17), ords = [], sum = 0, miss = 0;
      while (ords.length < 400 && miss < 14) { var o = makeOrder(r, i); if (!o || sum + o.sell > R) { miss++; continue; } ords.push(o); sum += o.sell; }
      if (!ords.length) continue;
      var big = ords.filter(function (x) { return x.svc !== 'skip'; }).sort(function (p, q2) { return q2.sell - p.sell; })[0] || ords[0];
      big.sell += R - sum;
      var c0 = ords.reduce(function (t, x) { return t + x.cost; }, 0), want = Math.max(0, R - M), flex = ords.filter(function (x) { return x.svc !== 'skip'; }), f0 = flex.reduce(function (t, x) { return t + x.cost; }, 0);
      var g = f0 ? Math.max(0.7, Math.min(1.25, (f0 + want - c0) / f0)) : 1, c1 = 0;
      flex.forEach(function (x) { x.cost = Math.round(x.cost * g); }); ords.forEach(function (x) { c1 += x.cost; }); big.cost += want - c1;
      ords.forEach(function (x) { x.off = pick(r, days); });
      list = list.concat(ords);
    }
    list.sort(function (p, q2) { return p.off - q2.off; });
    var base = 1021 - list.length, ib = 2200 - list.length;
    list.forEach(function (o, k) { o.id = 'CAC-' + String(base + k).padStart(4, '0'); o.inv = 'INV-' + (ib + k); o.pay = 'paid'; });
    cache = { key: s.seededDay, list: list };
    return list;
  }
  function invOf(id) { return S().invoices.filter(function (i) { return i.jobs && i.jobs.indexOf(id) >= 0; })[0] || null; }
  function fromJob(j) {
    var inv = invOf(j.id);
    return { src: 'j', id: j.id, off: j.day, cust: j.cust, site: j.site, siteName: j.siteName, pc: j.pc, svc: j.svc, size: j.size, qty: j.qty, weeks: j.weeks, panels: j.panels, ft: j.ft, m3: j.m3, hours: j.hours, mix: j.mix,
      sup: j.sup, cost: j.cost, sell: j.sell, status: j.status, owner: j.owner, po: j.po || '', job: j, inv: inv ? inv.id : null, pay: inv ? (inv.status === 'paid' ? 'paid' : 'unpaid') : (j.day > 0 || j.invLater ? 'none' : 'unpaid') };
  }
  function all() { var xc = S().xCancel || {}; return hist().concat(S().jobs.map(fromJob)).filter(function (o) { return !xc[o.id]; }).sort(function (a, b) { return a.off - b.off || (a.id < b.id ? -1 : 1); }); }   /* cancelled orders (x-cancel.js) are left out everywhere */
  function find(id) { return all().filter(function (o) { return o.id === id; })[0] || null; }
  function custName(o) { var c = CS.cust(o.cust); return c ? c.name : 'Customer'; }
  function custShort(o) { return custName(o).split(' ').filter(function (w) { return w.replace(/\W/g, '').length > 2; })[0] || custName(o); }
  function supName(o) { var s = CS.sup(o.sup); return s ? s.name : 'Supplier'; }
  function shortOf(o) { return o.svc === 'skip' ? (o.size >= 20 ? o.size + 'yd RoRo' : o.size + 'yd skip') : CS.svc(o.svc).short; }
  function payTag(o) { return o.pay === 'paid' ? '<span class="tag ok">Paid</span>' : o.pay === 'unpaid' ? '<span class="tag amber">Not paid yet</span>' : '<span class="tag">To invoice</span>'; }
  var GROUP = { booked: 'booked', confirmed: 'booked', onhire: 'site', exchange: 'site', collection: 'site', done: 'done' };
  W.hist = hist; W.all = all; W.find = find;

  /* ---------- the order diary ---------- */
  function dia() { var u = H.ui; if (!u.diary) u.diary = { mode: 'month', off: 0, q: '', cust: '', sup: '', svc: '', status: '', paid: '', more: 1 }; return u.diary; }
  function sums(list) { return { n: list.length, rev: list.reduce(function (a, o) { return a + o.sell; }, 0), margin: list.reduce(function (a, o) { return a + o.sell - o.cost; }, 0) }; }
  function firstOff() { var l = hist(); return l.length ? l[0].off : 0; }
  function rowOf(o, withDate) {
    var c = CS.cust(o.cust), s = CS.jobSite(o);
    return '<tr class="click" data-act="ordOpen" data-id="' + o.id + '">' + (withDate ? '<td><b>' + dShort(o.off) + '</b><small>' + DOW[(date(o.off).getDay() + 6) % 7] + '</small></td>' : '') +
      '<td><b>' + o.id + '</b><small>' + h(CS.jobDesc(o)) + '</small></td><td><b>' + h(c.name) + '</b><small>' + h(s.name) + ', ' + h(s.pc) + '</small></td>' +
      '<td class="hide-sm">' + h(supName(o)) + '</td><td class="hide-md">' + H.stTag(o.status) + '</td><td class="r"><b class="num">' + money(o.sell) + '</b><small>' + money(o.sell - o.cost) + ' margin</small></td><td class="r hide-sm">' + payTag(o) + '</td></tr>';
  }
  function tableOf(list, withDate) {
    return '<div class="tw"><table class="t"><thead><tr>' + (withDate ? '<th>Date</th>' : '') + '<th>Order</th><th>Customer and site</th><th class="hide-sm">Supplier</th><th class="hide-md">Status</th><th class="r">Price</th><th class="r hide-sm">Paid</th></tr></thead><tbody>' +
      list.map(function (o) { return rowOf(o, withDate); }).join('') + '</tbody></table></div>';
  }
  function monthView(d, list) {
    var a = date(d.off), y = a.getFullYear(), m = a.getMonth(), len = monthLen(y, m), lead = (new Date(y, m, 1).getDay() + 6) % 7, by = {}, inM = [];
    list.forEach(function (o) { var x = date(o.off); if (x.getFullYear() === y && x.getMonth() === m) { (by[x.getDate()] = by[x.getDate()] || []).push(o); inM.push(o); } });
    var t = sums(inM), sofar = sums(inM.filter(function (o) { return o.off <= 0; })), isCur = mk(a) === mk(date(0)), fut = mk(a) > mk(date(0));
    var cells = ''; for (var i = 0; i < lead; i++) cells += '<span class="dcell blank"></span>';
    for (var day = 1; day <= len; day++) {
      var off = offOf(new Date(y, m, day)), l = by[day] || [], we = !isWd(date(off)), sm = sums(l);
      cells += '<button class="dcell' + (off === 0 ? ' today' : '') + (we ? ' we' : '') + (l.length ? '' : ' none') + (off > 0 ? ' fut' : '') + '" data-act="diaDay" data-v="' + off + '" aria-label="' + day + ' ' + MONL[m] + ', ' + plural(l.length, 'order') + '"><span class="dn">' + day + '</span>' +
        (l.length ? '<b class="dc">' + l.length + '</b><small class="dv">' + money(sm.rev) + '</small><span class="dch">' + l.slice(0, 2).map(function (o) { return '<i>' + h(shortOf(o)) + ' · ' + h(custShort(o)) + '</i>'; }).join('') + (l.length > 2 ? '<i class="more">' + (l.length - 2) + ' more</i>' : '') + '</span>' : '') + '</button>';
    }
    for (var tr = (lead + len) % 7; tr && tr < 7; tr++) cells += '<span class="dcell blank"></span>';
    var line = !inM.length ? (fut ? 'Nothing booked for ' + MONL[m] + ' yet.' : 'No orders in ' + MONL[m] + ' ' + y + '. CAC\'s first order was on ' + dShort(firstOff()) + '.')
      : '<b>' + plural(isCur ? sofar.n : t.n, 'order') + '</b>' + (isCur ? ' so far' : '') + ', <b>' + money(isCur ? sofar.rev : t.rev) + '</b> sales, <b>' + money(isCur ? sofar.margin : t.margin) + '</b> margin' + (isCur && t.n > sofar.n ? ', and ' + (t.n - sofar.n) + ' more booked in' : '') + '.';
    return '<p class="dsum">' + line + '</p><div class="dgrid"><div class="dhead">' + DOW.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="dbody">' + cells + '</div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Tap a day to see its orders. The number is how many orders were delivered that day.</p>';
  }
  function weekStart(off) { return off - ((date(off).getDay() + 6) % 7); }
  function weekView(d, list) {
    var a = weekStart(d.off), cols = '', tot = [];
    for (var i = 0; i < 7; i++) {
      var off = a + i, l = list.filter(function (o) { return o.off === off; }); tot = tot.concat(l);
      cols += '<div class="wcol' + (off === 0 ? ' today' : '') + '"><button class="wh" data-act="diaDay" data-v="' + off + '"><b>' + DOW[i] + ' ' + date(off).getDate() + '</b><small>' + (l.length ? plural(l.length, 'order') : 'None') + '</small></button>' +
        l.map(function (o) { return '<button class="ocard" data-act="ordOpen" data-id="' + o.id + '"><b>' + h(shortOf(o)) + '</b><small>' + h(custName(o)) + '</small><small>' + h(CS.jobSite(o).pc) + ' · ' + money(o.sell) + '</small></button>'; }).join('') + '</div>';
    }
    var t = sums(tot);
    return '<p class="dsum"><b>' + plural(t.n, 'order') + '</b> this week, <b>' + money(t.rev) + '</b> sales, <b>' + money(t.margin) + '</b> margin.</p><div class="wgrid">' + cols + '</div>';
  }
  function dayView(d, list) {
    var l = list.filter(function (o) { return o.off === d.off; }), t = sums(l);
    return '<p class="dsum"><b>' + dLong(d.off) + '.</b> ' + (l.length ? plural(t.n, 'order') + ', ' + money(t.rev) + ' sales, ' + money(t.margin) + ' margin.' : 'No orders ' + (d.off > 0 ? 'booked yet.' : 'that day.')) + '</p>' +
      (l.length ? '<div class="card">' + tableOf(l, false) + '</div>' : '<div class="card"><div class="empty">' + ic('calendar') + 'Nothing here.' + (d.off >= 0 ? ' <button class="btn sm pri" data-act="newOrder" style="margin-left:8px">' + ic('plus') + 'New order</button>' : '') + '</div></div>');
  }
  /* one matcher for the diary list and the search box in the top bar: order number, PO number, customer, site, postcode, supplier, service.
     Order numbers and postcodes also match with the space or the dash left out. */
  function norm(x) { return String(x || '').toLowerCase().replace(/[\s-]+/g, ''); }
  function ordMatch(o, s) {
    var st = CS.jobSite(o), n = norm(s);
    return (o.id + ' ' + custName(o) + ' ' + supName(o) + ' ' + CS.jobDesc(o) + ' ' + st.name + ' ' + st.pc + ' ' + (o.po || '')).toLowerCase().indexOf(s) >= 0 ||
      (n.length >= 2 && (norm(o.id).indexOf(n) >= 0 || norm(st.pc).indexOf(n) >= 0 || (!!o.po && norm(o.po).indexOf(n) >= 0)));
  }
  function ordHits(text) {
    var s = String(text || '').trim().toLowerCase(), n = norm(s); if (n.length < 2) return [];
    return all().filter(function (o) { return ordMatch(o, s); }).sort(function (a, b) { return (norm(b.id) === n) - (norm(a.id) === n) || Math.abs(a.off) - Math.abs(b.off) || (a.id < b.id ? 1 : -1); });
  }
  /* adds an Orders section to the top of the results the search box already shows. Each one opens the order's own page. */
  function ordSearch() {
    var inp = q('#q'), box = q('#sres'); if (!inp || !box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.xdso,.xdsh'), function (x) { x.remove(); });
    var hits = ordHits(inp.value); if (!hits.length) return;
    var show = hits.slice(0, 4), ids = {}; show.forEach(function (o) { ids[o.id] = 1; });
    var none = box.querySelector('.empty'); if (none) none.remove();
    Array.prototype.forEach.call(box.querySelectorAll('button[data-act="srch"][data-k="job"]'), function (b) { if (ids[b.getAttribute('data-id')]) b.remove(); });
    var rest = box.querySelectorAll('button[data-act="srch"]').length;
    box.insertAdjacentHTML('afterbegin', '<div class="xdsh">Orders<span>' + hits.length + '</span></div>' + show.map(function (o) {
      var st = CS.jobSite(o);
      return '<button class="xdso" data-act="ordFind" data-id="' + o.id + '">' + ic('file-text') + '<span><b>' + o.id + ' · ' + h(shortOf(o)) + '</b><small>' + h(custName(o)) + ' · ' + h(st.pc) + ' · ' + dShort(o.off) + (o.po ? ' · PO ' + h(o.po) : '') + '</small></span></button>';
    }).join('') + (hits.length > show.length ? '<button class="xdso xdsall" data-act="ordFindAll">' + ic('calendar') + '<span><b>See all ' + hits.length + ' in the order diary</b></span></button>' : '') + (rest ? '<div class="xdsh">Everything else</div>' : ''));
    box.hidden = false;
  }
  function filt(d, list) {
    var s = d.q.trim().toLowerCase();
    return list.filter(function (o) {
      if (d.cust && o.cust !== d.cust) return false; if (d.sup && o.sup !== d.sup) return false; if (d.svc && o.svc !== d.svc) return false;
      if (d.status && GROUP[o.status] !== d.status) return false;
      if (d.paid && (d.paid === 'paid') !== (o.pay === 'paid')) return false;
      if (s && !ordMatch(o, s)) return false;
      return true;
    });
  }
  function sel(id, label, val, opts) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-dia="1"><option value="">All</option>' + opts.map(function (o) { return '<option value="' + h(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select></div>'; }
  function listBody(d, list) {
    var l = filt(d, list).reverse(), t = sums(l), show = l.slice(0, d.more * 40);
    return '<p class="dsum" id="diaCount"><b>' + plural(t.n, 'order') + '</b>, <b>' + money(t.rev) + '</b> sales, <b>' + money(t.margin) + '</b> margin. Newest first.</p>' +
      (l.length ? '<div class="card">' + tableOf(show, true) + (l.length > show.length ? '<div class="cardfoot"><button class="btn" data-act="diaMore">' + ic('chevron-down') + 'Show 40 more</button><span class="muted" style="font-size:12.5px">Showing ' + show.length + ' of ' + l.length + '</span></div>' : '') + '</div>' : '<div class="card"><div class="empty">' + ic('search') + 'No orders match. Clear a filter and try again.</div></div>');
  }
  function listView(d, list) {
    var s = S();
    return '<div class="card pad dfil"><div class="field grow"><label for="diaQ">Search</label><input id="diaQ" value="' + h(d.q) + '" placeholder="Order number, PO number, customer, postcode" autocomplete="off"></div>' +
      sel('diaCust', 'Customer', d.cust, s.customers.map(function (c) { return [c.id, c.name]; })) +
      sel('diaSup', 'Supplier', d.sup, s.suppliers.map(function (c) { return [c.id, c.name]; })) +
      sel('diaSvc', 'Service', d.svc, Object.keys(s.services).map(function (k) { return [k, s.services[k].name]; })) +
      sel('diaStatus', 'Status', d.status, [['booked', 'Booked, not delivered'], ['site', 'On site'], ['done', 'Done']]) +
      sel('diaPaid', 'Paid', d.paid, [['paid', 'Paid'], ['unpaid', 'Not paid yet']]) +
      (d.q || d.cust || d.sup || d.svc || d.status || d.paid ? '<button class="btn sm" data-act="diaClear">' + ic('x') + 'Clear</button>' : '') + '</div><div id="diaList">' + listBody(d, list) + '</div>';
  }
  function ordersView() {
    var d = dia(), list = all(), a = date(d.off);
    var label = d.mode === 'month' ? MONL[a.getMonth()] + ' ' + a.getFullYear() : d.mode === 'week' ? 'Week of ' + dShort(weekStart(d.off)) : d.mode === 'day' ? DOW[(a.getDay() + 6) % 7] + ' ' + dShort(d.off) : 'Every order';
    return '<div class="dbar"><div class="seg" id="diaModes">' + [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['list', 'List']].map(function (x) { return '<button data-act="diaMode" data-v="' + x[0] + '" class="' + (d.mode === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (d.mode === 'list' ? '' : '<div class="dnav"><button class="iconbtn" data-act="diaNav" data-v="-1" aria-label="Earlier">' + ic('chevron-left') + '</button><b id="diaLabel">' + label + '</b><button class="iconbtn" data-act="diaNav" data-v="1" aria-label="Later">' + ic('chevron-right') + '</button><button class="btn sm" data-act="diaToday">Today</button></div>') +
      '<span class="sp"></span><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
      (d.mode === 'month' ? monthView(d, list) : d.mode === 'week' ? weekView(d, list) : d.mode === 'day' ? dayView(d, list) : listView(d, list));
  }

  /* ---------- one order, start to finish ---------- */
  function steps(o) {
    var out = [], j = o.job, hire = HIRE[o.svc], waste = WASTE[o.svc];
    function st(t, when, done, note) { out.push({ t: t, when: when, done: done, note: note }); }
    if (o.src === 'h') {
      var su = CS.sup(o.sup), per = o.svc === 'skip' ? Math.min(su.hireDays || 14, 12) : (o.weeks ? o.weeks * 7 : 7);
      if (o.quoted) st('Quoted', dShort(o.off - o.book - 2), true);
      st('Booked', dShort(o.off - o.book), true); st('Supplier confirmed', dShort(o.off - o.book), true); st(hire ? 'Delivered' : 'Done on site', dShort(o.off), true);
      if (o.exch) st('Exchanged', dShort(o.off + 6), true);
      if (hire) st('Collected', dShort(o.off + per), o.off + per <= 0, o.off + per > 0 ? 'Still on site' : '');
      if (waste) st('Waste transfer note in', dShort(o.off + 2), true);
      st('Invoiced', dShort(o.off), true, o.inv); st('Paid', dShort(Math.min(-1, o.off + o.payDays)), true);
      return out;
    }
    var inv = o.inv ? CS.inv(o.inv) : null, del = j.status !== 'booked' && j.status !== 'confirmed';
    st('Booked', '', true); st('Supplier confirmed', '', j.status !== 'booked', j.status === 'booked' ? 'Waiting, being chased' : '');
    st(hire ? 'Delivered' : 'Done on site', del ? dShort(j.day) : 'Due ' + dShort(j.day), del);
    if (j.exDay != null) st('Exchange', (j.status === 'exchange' ? 'Booked for ' : '') + dShort(j.exDay), j.status !== 'exchange');
    if (hire) st('Collected', j.colDay != null ? (j.status === 'collection' ? 'Booked for ' : '') + dShort(j.colDay) : '', j.status === 'done', j.status === 'onhire' ? 'On site now' : '');
    if (waste) st('Waste transfer note in', '', j.wtn === 'received', j.wtn === 'missing' ? 'Not back yet' : j.wtn === 'chased' ? 'Chased' : '');
    st('Invoiced', inv ? dShort(inv.issued) : '', !!inv, inv ? inv.id : j.invLater ? 'Raised when the job is marked complete' : ''); st('Paid', inv && inv.status === 'paid' ? dShort(inv.paidDay || 0) : '', !!inv && inv.status === 'paid');
    return out;
  }
  function chat(o) {
    var c = CS.cust(o.cust), su = CS.sup(o.sup), s = CS.jobSite(o), it = X2.itemOf({ svc: o.svc, size: o.size, qty: o.svc === 'grab' || o.svc === 'muck' ? o.qty : (o.weeks || o.panels || o.hours || o.m3 || o.qty) });
    var d = date(o.off), day = DOWL[d.getDay()];
    return [['in', c.first, 'Hi John, can we get ' + CS.itemText(it) + ' at ' + s.name + ' for ' + day + '?'],
      ['out', 'You', 'Hi ' + c.first + ', yes no problem. ' + money(o.sell) + ' + VAT, booked for ' + day + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + '. Ref ' + o.id + '.'],
      ['in', su.contact + ', ' + su.name, 'Yes no problem, ' + day + ' AM for ' + o.id + '.']];
  }
  function orderPage(o) {
    var c = CS.cust(o.cust), s = CS.jobSite(o), su = CS.sup(o.sup), m = o.sell - o.cost, tl = steps(o), ct = o.job ? X2.contact(o.job) : { name: c.contact, phone: c.phone }, waste = WASTE[o.svc];
    var body = '<div class="opage" data-oid="' + o.id + '"><div><div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:12px">' + H.stTag(o.status) + payTag(o) + H.margTag(m, o.sell) + '</div>' +
      '<dl class="kv"><dt>Customer</dt><dd>' + h(c.name) + '</dd><dt>Site</dt><dd>' + h(s.name) + ', ' + h(s.pc) + '</dd><dt>Site contact</dt><dd>' + h(ct.name) + ' · ' + h(ct.phone || '') + '</dd><dt>What</dt><dd>' + h(CS.jobDesc(o)) + '</dd>' +
      '<dt>Delivery</dt><dd>' + dLong(o.off) + '</dd><dt>Supplier</dt><dd>' + h(su.name) + '</dd>' + (o.po ? '<dt>PO number</dt><dd id="ordPoShow">' + h(o.po) + '</dd>' : '') + '</dl>' +
      '<div class="sec"><h3>Money</h3></div><div class="money"><div class="tot"><div><small>Customer</small><b class="num">' + money(o.sell) + '</b></div><div><small>Supplier</small><b class="num">' + money(o.cost) + '</b></div><div class="m"><small>Margin</small><b class="num">' + money(m) + ' <span style="font-size:12px">' + CS.pct(m, o.sell) + '%</span></b></div></div></div>' +
      '<div class="sec"><h3>Documents</h3></div>' + docsBlock(o) +
      (o.src === 'h' ? '<div class="sec"><h3>Messages</h3></div><div class="ochat">' + chat(o).map(function (x) { return '<div class="ob ' + x[0] + '"><small>' + h(x[1]) + '</small>' + h(x[2]) + '</div>'; }).join('') + '</div>'
        : '<div class="sec"><h3>What has happened</h3></div>' + o.job.log.slice(-5).map(function (l) { return '<div class="rowline"><div class="bd"><b>' + h(l.t) + '</b><small>' + CS.ago(l.at) + '</small></div></div>'; }).join('')) + '</div>' +
      '<div><div class="sec" style="margin-top:0"><h3>Start to finish</h3></div><div class="otl">' + tl.map(function (x) { return '<div class="os' + (x.done ? ' done' : '') + '"><i>' + (x.done ? ic('check') : '') + '</i><span><b>' + x.t + '</b><small>' + h([x.when, x.note].filter(Boolean).join(' · ') || (x.done ? 'Done' : 'Not yet')) + '</small></span></div>'; }).join('') + '</div></div></div>';
    H.modal('Order ' + o.id, body, (o.src === 'j' ? '<button class="btn" data-act="openJob" data-id="' + o.id + '">' + ic('truck') + 'Open the job</button>' : '') + (window.CACUI && window.CACUI.xCancellable && window.CACUI.xCancellable(o.id) ? '<button class="btn xc-btn" data-act="ordCancel" data-id="' + o.id + '">' + ic('x') + 'Cancel order</button>' : '') + '<span class="sp"></span><button class="btn" data-act="close">Close</button><button class="btn pri" data-act="ordRepeat" data-id="' + o.id + '">' + ic('refresh') + 'Repeat this order</button>', true);
  }
  /* ---------- an order's three documents, and the waste transfer note on CAC's own template ---------- */
  function wtnBack(o) { return o.src === 'h' || (!!o.job && o.job.wtn === 'received'); }
  function docRow(id, icon, title, sub, btn) { return '<div class="xdrow" id="' + id + '"><span class="xdic">' + ic(icon) + '</span><div class="bd"><b>' + title + '</b><small>' + sub + '</small></div>' + (btn || '') + '</div>'; }
  function docBtn(act, k, id) { return '<button class="btn sm" data-act="' + act + '" data-k="' + k + '" data-id="' + id + '">' + ic('eye') + 'View</button>'; }
  /* an Email button next to each document, and Email all at the foot (x-history.js sends them) */
  function emBtn(k, oid) { return '<button class="btn sm" data-act="xhEmail" data-k="' + k + '" data-id="' + oid + '">' + ic('mail') + 'Email</button>'; }
  function docsBlock(o) {
    var j = o.job, su = CS.sup(o.sup), hasW = !!WASTE[o.svc] && wtnBack(o);
    return '<div class="xdocs" id="ordDocs">' +
      docRow('ordDocConf', 'file-text', 'Order confirmation', 'What was booked, where and when', docBtn(j ? 'ordView' : 'histDoc', 'order', o.id) + emBtn('order', o.id)) +
      (o.inv ? docRow('ordDocInv', 'receipt', 'Invoice ' + h(o.inv), o.pay === 'paid' ? 'Paid' : 'Not paid yet', docBtn(j ? 'openInv' : 'histDoc', 'inv', j ? o.inv : o.id) + emBtn('inv', o.id))
        : j && j.invLater ? docRow('ordDocInv', 'receipt', 'Invoice: raised when the job is marked complete', 'Held back on account. Set the job to Complete on Live jobs and it is raised then.')
        : docRow('ordDocInv', 'receipt', 'Invoice', 'Not raised yet')) +
      (!WASTE[o.svc] ? docRow('ordDocWtn', 'certificate', 'Waste transfer note', 'Not needed. No waste is moved on this order.')
        : docRow('ordDocWtn', 'certificate', 'Waste transfer note', wtnBack(o) ? 'Back from ' + h(su.name) + ' and filed' : 'Not back from the supplier yet' + (j && j.wtn === 'chased' ? ', chased' : ''), docBtn('histDoc', 'wtn', o.id) + (hasW ? emBtn('wtn', o.id) : ''))) +
      '<div class="xdall"><button class="btn sm pri" data-act="xhEmail" data-k="all" data-id="' + o.id + '">' + ic('mail') + 'Email all to the customer</button></div></div>';
  }
  function bx(label, a, b) { return '<div class="bx"><small>' + label + '</small>' + a + (b ? '<span>' + b + '</span>' : '') + '</div>'; }
  function wtnPaper(o) {
    var c = CS.cust(o.cust), s = CS.jobSite(o), su = CS.sup(o.sup), sv = CS.svc(o.svc), j = o.job, x = X2.hb(su), po = o.po || (j && j.po) || '';
    var t = Math.round(CS.tonnes(j || o) * 100) / 100, day = j ? j.day : o.off + (o.svc === 'skip' ? 2 : 0);
    return '<div class="doc v2doc xdwtn" id="wtnPaper"><div class="dh2"><img src="brand/cac-logo.svg" alt="CAC Waste Management"><div><b>Waste transfer note</b><small>Note number WTN-' + h(String(o.id).replace(/^CAC-/, '')) + '</small></div></div><div class="dg">' +
      bx('Description of waste', h(sv.waste || 'Not on the job'), sv.ewc ? 'EWC code ' + h(sv.ewc) : '') +
      bx(o.svc === 'skip' ? 'Container' : 'Quantity', h(CS.jobDesc(o)), t ? 'Net weight ' + t + ' tonnes' : '') +
      bx('Collected from', (j && j.addr ? h(j.addr) + ', ' : s.name && s.name !== s.pc ? h(s.name) + ', ' : '') + h(s.pc), 'Producer: ' + h(c.name)) +
      bx('Carrier', h(su.name), 'Waste carrier registration ' + h(su.cbdu)) +
      bx('Broker', 'CAC Waste Management Ltd', 'Registration CBDU650137') +
      (x.permit ? bx('Taken to', h(su.name) + ', ' + h(su.base), 'Environmental permit ' + h(x.permit)) : bx('Taken to', 'Not on the note')) +
      bx('Date of transfer', dLong(day)) + bx('Order', h(o.id), po ? 'PO number ' + h(po) : '') + '</div>' +
      '<div class="xdsigs"><div><span class="sig">' + h(c.contact) + '</span><small>Signed for the producer</small></div><div><span class="sig">' + h(su.contact) + '</span><small>Signed for the carrier</small></div></div></div>' +
      '<p class="xdnote">Your own template. Filled in from the job.</p>';
  }
  function wtnModal(o, back) {
    var j = o.job, su = CS.sup(o.sup), chase = !!j && (j.wtn === 'missing' || j.wtn === 'chased');
    var body = wtnBack(o) && WASTE[o.svc] ? wtnPaper(o) : '<div class="xdwait" id="wtnWait" data-id="' + o.id + '"><span class="xdic">' + ic('clock') + '</span><b>Not back from the supplier yet</b>' +
      '<p>' + (!WASTE[o.svc] ? 'No waste is moved on this order, so there is no note to come back.' : chase ? h(su.name) + ' have not sent the waste transfer note for ' + o.id + ' back.' + (j.wtn === 'chased' ? ' They have been chased already.' : ' One tap chases them on WhatsApp.') : 'The note for ' + o.id + ' comes from ' + h(su.name) + ' once the job is done. There is nothing to chase yet.') + '</p>' +
      (chase ? '<button class="btn pri" data-act="chaseWtn" data-id="' + o.id + '">' + ic('whatsapp') + (j.wtn === 'chased' ? 'Chase again' : 'Chase ' + h(su.contact)) + '</button>' : '') + '</div>' +
      '<p class="xdnote">When it comes back it is filed against this order and shown here on your own template.</p>';
    H.modal('Waste transfer note, ' + o.id, body, (back ? '<button class="btn" data-act="ordOpen" data-id="' + o.id + '">' + ic('chevron-left') + 'Back to the order</button>' : '') + '<span class="sp"></span>' + (wtnBack(o) && WASTE[o.svc] ? '<button class="btn pri" data-act="xhEmail" data-k="wtn" data-id="' + o.id + '">' + ic('mail') + 'Email to the customer</button><button class="btn" data-act="close">Close</button>' : '<button class="btn pri" data-act="close">Close</button>'));
  }
  function histDoc(o, k) {
    if (k === 'wtn') return wtnModal(o, true);
    var c = CS.cust(o.cust), s = CS.jobSite(o);
    var title = k === 'inv' ? 'Invoice ' + o.inv : 'Order confirmation';
    var rows = k === 'inv' ? [['To', c.name], ['For', CS.jobDesc(o) + ', ' + s.name + ', ' + s.pc], ['Job', o.id], ['Net', money(o.sell, true)], ['VAT at 20%', money(o.sell * 0.2, true)], ['Total', money(o.sell * 1.2, true)], ['Status', o.pay === 'paid' ? 'Paid' : 'Not paid yet']]
      : [['Customer', c.name], ['Site address', s.name + ', ' + s.pc], ['What', CS.jobDesc(o)], ['When', dLong(o.off)], ['Price', money(o.sell, true) + ' + VAT']];
    H.modal(title + ', ' + o.id, '<div class="doc v2doc"><div class="dh2"><img src="brand/cac-logo.svg" alt="CAC Waste Management"><div><b>' + h(title) + '</b><small>' + o.id + ' · ' + dShort(o.off) + '</small></div></div><dl class="kv">' + rows.map(function (r) { return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>'; }).join('') + '</dl></div>',
      '<button class="btn" data-act="ordOpen" data-id="' + o.id + '">' + ic('chevron-left') + 'Back to the order</button><span class="sp"></span><button class="btn pri" data-act="close">Close</button>');
  }

  /* ---------- trends and the forecast ---------- */
  function months() {
    var list = all(), now = date(0), N = S().months.length, dom = now.getDate(), out = [];
    for (var i = 0; i < N; i++) { var d = new Date(now.getFullYear(), now.getMonth() - (N - 1 - i), 1); out.push({ k: mk(d), m: d.getMonth(), y: d.getFullYear(), label: MON[d.getMonth()], long: MONL[d.getMonth()], l: [], to: [], fut: [] }); }
    list.forEach(function (o) { var d = date(o.off), x = out.filter(function (z) { return z.k === mk(d); })[0]; if (!x) return; if (o.off > 0) { x.fut.push(o); return; } x.l.push(o); if (d.getDate() <= dom) x.to.push(o); });
    out.forEach(function (x) { x.s = sums(x.l); x.st = sums(x.to); x.sf = sums(x.fut); });
    return out;
  }
  function forecast() {
    var ms = months(), cur = ms[ms.length - 1], now = date(0), first = offOf(new Date(now.getFullYear(), now.getMonth(), 1)), last = offOf(new Date(now.getFullYear(), now.getMonth(), monthLen(now.getFullYear(), now.getMonth())));
    var before = sums(cur.l.filter(function (o) { return o.off < 0; })), el = Math.max(1, wdBetween(first, -1)), left = wdBetween(0, last);
    var rate = before.rev / el, est = Math.round((Math.max(cur.s.rev, before.rev) + rate * Math.max(0, left - (isWd(now) ? 0.5 : 0))) / 100) * 100;
    var booked = cur.sf.rev + sums(cur.l.filter(function (o) { return o.off === 0; })).rev, pct = cur.s.rev ? cur.s.margin / cur.s.rev : 0.25;
    return { est: est, lo: Math.round(est * 0.92 / 100) * 100, hi: Math.round(est * 1.08 / 100) * 100, rate: Math.round(rate), left: left, booked: booked, margin: Math.round(est * pct / 10) * 10, cur: cur, prev: ms[ms.length - 2] || null, ms: ms };
  }
  function diff(n, unit, than) { if (!n) return 'Level with ' + than; var up = n > 0, x = Math.abs(n); return (unit === '£' ? money(x) + (up ? ' more than ' : ' less than ') : x + (up ? ' more than ' : ' fewer than ')) + than; }
  function cmp(label, icon, val, d, unit, than, hero) {
    return '<div class="card kpi' + (hero ? ' hero' : '') + '"><small>' + ic(icon) + label + '</small><b>' + val + '</b><span class="d ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + diff(d, unit, than) + '</span></div>';
  }
  function hbars(rows) { var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1])); return '<div class="hbars">' + rows.map(function (r) { return '<div class="hb"><span>' + h(r[0]) + '</span><i><em style="width:' + Math.max(2, Math.round(r[1] / mx * 100)) + '%"></em></i><b>' + r[2] + '</b></div>'; }).join('') + '</div>'; }
  function trendsView() {
    var f = forecast(), cur = f.cur, prev = f.prev, ms = f.ms, now = date(0), s = S(), than = 'this point in ' + (prev ? prev.long : 'last month');
    var firstM = ms[0], mx = Math.max.apply(null, ms.map(function (x) { return x.s.rev; }).concat([f.est]));
    var bySvc = {}, byC = {}, byCp = {}, dow = [0, 0, 0, 0, 0, 0, 0], recent = all().filter(function (o) { return o.off <= 0 && o.off > -56; });
    cur.l.forEach(function (o) { var a = bySvc[o.svc] = bySvc[o.svc] || { n: 0, rev: 0, m: 0 }; a.n++; a.rev += o.sell; a.m += o.sell - o.cost; var b = byC[o.cust] = byC[o.cust] || { n: 0, rev: 0, m: 0 }; b.n++; b.rev += o.sell; b.m += o.sell - o.cost; });
    if (prev) prev.to.forEach(function (o) { byCp[o.cust] = (byCp[o.cust] || 0) + o.sell; });
    recent.forEach(function (o) { dow[(date(o.off).getDay() + 6) % 7]++; });
    var svcRows = Object.keys(bySvc).sort(function (a, b) { return bySvc[b].rev - bySvc[a].rev; }), custRows = Object.keys(byC).sort(function (a, b) { return byC[b].rev - byC[a].rev; }).slice(0, 6);
    var before = {}; all().forEach(function (o) { if (mk(date(o.off)) < cur.k) before[o.cust] = 1; });
    var active = Object.keys(byC), repeat = active.filter(function (c) { return before[c]; }).length, fresh = active.length - repeat;
    var won = s.quotes.filter(function (x) { return x.status === 'won'; }).length, lost = s.quotes.filter(function (x) { return x.status === 'lost'; }).length, out = s.quotes.filter(function (x) { return x.status === 'sent'; }).length;
    var os = X2.onSite().filter(function (x) { return !x.booked; }), d7 = os.filter(function (x) { return x.left <= 7; }), d14 = os.filter(function (x) { return x.left > 7 && x.left <= 14; });
    var up = prev ? f.est - prev.s.rev : 0;
    function due(x) { var j = x.j, c = CS.cust(j.cust); return '<div class="rowline"><div class="bd"><b>' + h(CS.jobDesc(j)) + ', ' + h(c.name) + '</b><small>' + h(CS.jobSite(j).pc) + ' · ' + h(x.su.name) + ' · ' + (x.left <= 0 ? '<span class="redtxt">' + (-x.left) + ' days over the hire period</span>' : x.left + ' days left of ' + X2.weeks(x.period)) + '</small></div><button class="btn sm' + (x.left <= 0 ? ' pri' : '') + '" data-act="skCollect" data-id="' + j.id + '">' + ic('archive') + 'Book collection</button></div>'; }
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      cmp('Orders this month', 'calendar', cur.s.n, prev ? cur.s.n - prev.st.n : 0, 'order', than) +
      cmp('Sales this month', 'pound', money(cur.s.rev), prev ? cur.s.rev - prev.st.rev : 0, '£', than) +
      cmp('Margin this month', 'trending-up', money(cur.s.margin), prev ? cur.s.margin - prev.st.margin : 0, '£', than, true) +
      '<div class="card kpi"><small>' + ic('target') + 'Margin rate</small><b>' + CS.pct(cur.s.margin, cur.s.rev) + '%</b><span class="d">' + (prev ? prev.long + ' finished on ' + CS.pct(prev.s.margin, prev.s.rev) + '%' : '') + '</span></div></div>' +
      '<div class="grid g64" style="margin-bottom:16px"><div class="card pad"><div class="row" style="margin-bottom:6px"><h2 style="flex:1">' + ic('trending-up') + 'Sales by month</h2><span class="tag">' + ic('calendar') + 'Since ' + firstM.long + ' ' + firstM.y + '</span></div>' +
      '<div class="bars tall">' + ms.map(function (x, i) { var last = i === ms.length - 1; return '<div class="b' + (last ? '' : ' dim') + '"><em>' + (last ? money(x.s.rev) + ' so far' : money(x.s.rev)) + '</em>' + (last ? '<i class="ghost" style="height:' + Math.round(f.est / mx * 100) + '%"><i style="height:' + Math.round(x.s.rev / f.est * 100) + '%"></i></i>' : '<i style="height:' + Math.round(x.s.rev / mx * 100) + '%"></i>') + '<span>' + x.label + (last ? '' : ' · ' + x.s.n) + '</span></div>'; }).join('') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:10px 0 0">' + (prev ? prev.long + ' finished on ' + plural(prev.s.n, 'order') + ' and ' + money(prev.s.rev) + '. ' : '') + 'The pale bar is where ' + cur.long + ' is heading. There is no ' + cur.long + ' last year to compare with, because CAC\'s first order was in ' + firstM.long + ' ' + firstM.y + '. From next ' + firstM.long + ' this page compares year on year by itself.</p></div>' +
      '<div class="card pad fcast"><div class="row"><h2 style="flex:1">' + ic('target') + cur.long + ' forecast</h2><span class="tag amber">Estimate</span></div><b class="big">' + money(f.est) + '</b><span class="muted">sales by the end of ' + cur.long + ', somewhere between ' + money(f.lo) + ' and ' + money(f.hi) + '</span>' +
      '<div class="tline"><b>' + money(f.margin) + '</b><span>margin, if the rate holds</span></div><div class="tline"><b>' + money(f.rate) + '</b><span>a working day so far this month</span></div><div class="tline"><b>' + f.left + '</b><span>working days left, today included</span></div><div class="tline"><b>' + money(f.booked) + '</b><span>of it is already booked in</span></div>' +
      (prev ? '<div class="note" style="margin-top:10px;background:' + (up >= 0 ? 'var(--ok-l)' : 'var(--amber-l)') + '">' + ic(up >= 0 ? 'trending-up' : 'alert') + '<span>On course to finish about <b>' + money(Math.abs(Math.round(up / 100) * 100)) + (up >= 0 ? ' up' : ' down') + '</b> on ' + prev.long + '.</span></div>' : '') +
      '<p class="muted" style="font-size:12px;margin:10px 0 0">Worked out from what you have taken each working day this month, carried to the end of the month. It is an estimate, not a promise.</p></div></div>' +
      '<div class="grid g2" style="margin-bottom:16px"><div class="card"><div class="hd"><h2>' + ic('stack') + 'By service, this month</h2></div><div class="tw"><table class="t"><thead><tr><th>Service</th><th class="r">Orders</th><th class="r">Sales</th><th class="r">Margin</th></tr></thead><tbody>' +
      svcRows.map(function (k) { var a = bySvc[k]; return '<tr><td><b>' + h(CS.svc(k).name) + '</b></td><td class="r">' + a.n + '</td><td class="r num">' + money(a.rev) + '</td><td class="r">' + H.margTag(a.m, a.rev) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('users') + 'Top customers, this month</h2><button class="btn sm" data-act="go" data-v="customers">All customers</button></div><div class="tw"><table class="t"><thead><tr><th>Customer</th><th class="r">Orders</th><th class="r">Sales</th><th class="r hide-sm">Against ' + (prev ? prev.label : 'last month') + '</th></tr></thead><tbody>' +
      custRows.map(function (k) { var a = byC[k], p = byCp[k] || 0, dd = a.rev - p; return '<tr class="click" data-act="diaCust" data-id="' + k + '"><td><b>' + h(CS.cust(k).name) + '</b></td><td class="r">' + a.n + '</td><td class="r num">' + money(a.rev) + '</td><td class="r hide-sm">' + (p ? '<span class="tag ' + (dd >= 0 ? 'ok' : 'amber') + '">' + (dd >= 0 ? '▲ ' : '▼ ') + money(Math.abs(dd)) + '</span>' : '<span class="tag brand">New</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>' +
      '<div class="grid g3" style="margin-bottom:16px"><div class="card pad"><h2>' + ic('file-text') + 'Quotes won</h2><div class="tbig" style="margin-top:8px"><b>' + (won + lost ? Math.round(won / (won + lost) * 100) : 0) + '%</b><span>' + won + ' won and ' + lost + ' lost, of the quotes with an answer</span></div><div class="tline"><b>' + out + '</b><span>still out, waiting on the customer</span></div><button class="lnk" data-act="go" data-v="quotes" style="margin-top:8px">Open quotes</button></div>' +
      '<div class="card pad"><h2>' + ic('refresh') + 'Repeat customers</h2><div class="tbig" style="margin-top:8px"><b>' + repeat + ' of ' + active.length + '</b><span>customers who ordered this month had ordered before</span></div><div class="tline"><b>' + fresh + '</b><span>new this month</span></div><div class="tline"><b>' + money(cur.s.n ? Math.round(cur.s.rev / cur.s.n) : 0) + '</b><span>the average order</span></div></div>' +
      '<div class="card pad"><h2>' + ic('calendar') + 'Busiest days</h2><p class="muted" style="font-size:12.5px;margin:4px 0 8px">Orders delivered, last 8 weeks</p>' + hbars(DOW.slice(0, 6).map(function (x, i) { return [x, dow[i], dow[i]]; })) + '</div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('skip') + 'Collections to book</h2><span class="muted" style="font-size:12.5px">Skips and hire due off site, by the supplier\'s hire period</span></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      '<div class="sec"><h3>In the next 7 days <span class="muted">' + d7.length + '</span></h3></div>' + (d7.map(due).join('') || '<div class="empty">' + ic('circle-check') + 'Nothing due in the next 7 days.</div>') +
      '<div class="sec"><h3>In 8 to 14 days <span class="muted">' + d14.length + '</span></h3></div>' + (d14.map(due).join('') || '<div class="empty">' + ic('circle-check') + 'Nothing due in 8 to 14 days.</div>') + '</div></div>';
  }
  W.forecast = forecast; W.months = months;

  /* ---------- supplier bill check ---------- */
  function billBuild() {
    var skips = hist().filter(function (o) { return o.svc === 'skip' && o.off < -3 && o.off > -50; }), n = {};
    skips.forEach(function (o) { n[o.sup] = (n[o.sup] || 0) + 1; });
    var sid = n.s3 >= 7 ? 's3' : Object.keys(n).sort(function (a, b) { return n[b] - n[a]; })[0], su = CS.sup(sid);
    var mine = skips.filter(function (o) { return o.sup === sid; }).slice(-11), lines = mine.map(function (o) { return { ref: o.id, off: o.off, desc: CS.jobDesc(o), size: o.size, booked: o.cost, billed: o.cost, st: 'ok' }; });
    function flag(i, type, add, why) { var l = lines[i]; if (!l) return; l.billed = l.booked + add; l.type = type; l.why = why; l.over = add; l.st = 'open'; }
    var small = -1; lines.forEach(function (l, i) { if (small < 0 && l.size <= 8 && i > 0) small = i; });
    if (small < 0) small = 1;
    var idx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(function (i) { return i !== small && i < lines.length; });
    flag(small, 'Wrong size', 60, 'Charged as a 12 yard. You booked ' + (lines[small] ? lines[small].desc.toLowerCase().replace(/^(\d+)/, 'a $1').replace('a 8', 'an 8') : 'an 8 yard skip') + ', and the waste transfer note says the same.');
    flag(idx[1], 'Extra hire', 25, 'A week of extra hire charged. It was collected on day 12, inside ' + first(su.name) + '\'s ' + X2.weeks(su.hireDays || 14) + ' hire period.');
    flag(idx[3], 'Overweight, no ticket', 45, 'Overweight charge with no weighbridge ticket sent. The waste transfer note on file is inside the weight limit.');
    if (lines[idx[5]]) flag(idx[5], 'Above the price sheet', 15, 'Charged ' + money(lines[idx[5]].booked + 15) + '. The price sheet you agreed with them says ' + money(lines[idx[5]].booked) + '.');
    var dup = lines.filter(function (l) { return !l.type && l.size === 8; })[0] || lines[idx[2]], di = lines.indexOf(dup); if (dup) lines.splice(di + 1, 0, { ref: dup.ref, off: dup.off, desc: dup.desc, size: dup.size, booked: 0, billed: dup.booked, type: 'Charged twice', why: 'This job is on the statement twice. It was one delivery.', over: dup.booked, st: 'open' });
    return { sup: sid, ref: 'ST-' + (4100 + X2.hash(sid) % 800), lines: lines, status: 'checked', at: Date.now() };
  }
  function first(n) { return String(n).split(' ')[0]; }
  function billOver(b) { return b ? b.lines.reduce(function (a, l) { return a + (l.over && l.st !== 'accept' ? l.over : 0); }, 0) : 0; }
  function oldOver() { return S().bills.reduce(function (a, b) { return a + (b.status === 'query' ? Math.max(0, b.billed - b.expected) : 0); }, 0); }
  function billsView() {
    var b = D3().bill, s = S(), over = billOver(b) + oldOver(), flagged = b ? b.lines.filter(function (l) { return l.type; }) : [], openN = flagged.filter(function (l) { return l.st !== 'accept'; }).length;
    var matched = s.bills.filter(function (x) { return x.status === 'matched'; }).length + (b ? b.lines.length - flagged.length : 0);
    var kp = '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi hero"><small>' + ic('pound') + 'Overcharged this month</small><b id="billOver">' + money(over) + '</b><span class="d">found before you paid it</span></div>' +
      '<div class="card kpi"><small>' + ic('receipt') + 'Bills and statements checked</small><b>' + (s.bills.length + (b ? 1 : 0)) + '</b><span class="d">every line against the order</span></div>' +
      '<div class="card kpi"><small>' + ic('circle-check') + 'Lines that match</small><b>' + matched + '</b><span class="d">safe to pay</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Lines to query</small><b' + (openN ? ' style="color:var(--bad)"' : '') + '>' + (openN + s.bills.filter(function (x) { return x.status === 'query'; }).length) + '</b><span class="d">' + (b && b.status === 'queried' ? 'query sent to accounts' : 'not sent yet') + '</span></div></div>';
    var up = '<div class="card pad" id="billUp"><h2>' + ic('receipt') + 'Check a supplier statement or invoice</h2><p style="margin:8px 0 12px;font-size:13.5px;max-width:720px">Upload what the supplier sent. Every line is lined up against the order it belongs to: the size you booked, the price on their sheet, the hire period, the weight on the waste transfer note. Anything that does not match is flagged before you pay it.</p>' +
      (H.ui.billRead ? '<div class="note">' + ic('clock') + '<span>Reading the statement and lining up each job...</span></div>'
        : '<div class="row" style="flex-wrap:wrap;gap:10px"><label class="btn pri" for="billFile">' + ic('download') + 'Choose the statement</label><input type="file" id="billFile" class="vh" accept=".pdf,.csv,.xlsx,.xls,image/*"><button class="btn" data-act="billSample">' + ic('play') + 'Use a sample statement</button></div>') +
      '<div class="catch"><span>' + ic('check') + 'Wrong size charged</span><span>' + ic('check') + 'Extra hire days</span><span>' + ic('check') + 'Overweight with no ticket</span><span>' + ic('check') + 'Job charged twice</span><span>' + ic('check') + 'Price above the agreed sheet</span></div></div>';
    var st = '';
    if (b) {
      var su = CS.sup(b.sup), x = X2.hb(su), tot = b.lines.reduce(function (a, l) { return a + l.billed; }, 0);
      st = '<div class="card" id="billSt" style="margin-bottom:16px"><div class="hd"><h2>' + ic('warehouse') + h(su.name) + ' statement ' + b.ref + '</h2><span class="muted" style="font-size:12.5px">' + b.lines.length + ' lines, ' + money(tot) + ' billed</span></div>' +
        '<div class="note" style="margin:0 14px 10px;background:' + (billOver(b) ? 'var(--bad-l)' : 'var(--ok-l)') + '">' + ic(billOver(b) ? 'alert' : 'circle-check') + '<span><b>' + (b.lines.length - flagged.length) + ' lines match.</b> ' + (billOver(b) ? flagged.filter(function (l) { return l.st !== 'accept'; }).length + ' need a look, <b>' + money(billOver(b)) + ' over</b> what you booked.' : 'Nothing left to query.') + (b.status === 'queried' ? ' Query sent to ' + h(x.acc) + ' in accounts, that amount is held back from the payment.' : '') + '</span></div>' +
        '<div class="tw"><table class="t billt"><thead><tr><th>Date</th><th>Job</th><th class="r">Booked</th><th class="r">Billed</th><th>Result</th><th></th></tr></thead><tbody>' +
        b.lines.map(function (l, i) {
          return '<tr class="' + (l.type && l.st !== 'accept' ? 'flag' : '') + '"><td><b>' + dShort(l.off) + '</b></td><td><b class="click" data-act="ordOpen" data-id="' + l.ref + '">' + l.ref + '</b><small>' + h(l.desc) + '</small></td><td class="r num" data-l="Booked">' + (l.booked ? money(l.booked) : 'Nothing') + '</td><td class="r num" data-l="Billed"><b>' + money(l.billed) + '</b></td>' +
            '<td>' + (l.type ? '<span class="tag ' + (l.st === 'accept' ? '' : 'bad') + '">' + (l.st === 'accept' ? 'Accepted' : h(l.type) + ', ' + money(l.over) + ' over') + '</span><small class="why">' + h(l.why) + '</small>' : '<span class="tag ok">' + ic('check') + 'Matches</span>') + '</td>' +
            '<td class="r">' + (l.type && b.status !== 'queried' ? (l.st === 'accept' ? '<button class="btn sm" data-act="billLine" data-i="' + i + '" data-v="open">Query it after all</button>' : '<button class="btn sm" data-act="billLine" data-i="' + i + '" data-v="accept">It is right</button>') : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="cardfoot"><button class="btn" data-act="billReset">' + ic('refresh') + 'Check another</button><span class="sp"></span>' + (b.status === 'queried' ? '<span class="tag ok">' + ic('send') + 'Query sent</span>' : (billOver(b) ? '<button class="btn pri" data-act="billDraft">' + ic('mail') + 'Draft the query to ' + h(x.acc) + ' in accounts</button>' : '<span class="tag ok">' + ic('circle-check') + 'All good to pay</span>')) + '</div></div>';
    }
    var old = '<div class="card"><div class="hd"><h2>' + ic('list') + 'Single bills checked this month</h2><button class="btn sm" data-act="go" data-v="money">Open money</button></div><div class="tw"><table class="t"><thead><tr><th>Bill</th><th>Supplier</th><th class="hide-sm">Job</th><th class="r">Booked</th><th class="r">Billed</th><th>Result</th></tr></thead><tbody>' +
      s.bills.map(function (x) { var d = x.billed - x.expected; return '<tr><td><b>' + h(x.id) + '</b></td><td>' + h(CS.sup(x.sup).name) + '</td><td class="hide-sm">' + h(x.job) + '</td><td class="r num">' + money(x.expected) + '</td><td class="r num">' + money(x.billed) + '</td><td>' + (x.status === 'matched' ? '<span class="tag ok">' + ic('check') + 'Matches</span>' : '<span class="tag bad">' + money(d) + ' over</span><small class="why">' + h(x.note || '') + '</small>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return kp + (b ? st : up) + (b ? '' : '<div style="height:16px"></div>') + old +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">It can only catch what the supplier has put on the bill, and you decide what gets queried. The upload in this demo shows a sample statement.</p>';
  }
  function billText(b) {
    var su = CS.sup(b.sup), x = X2.hb(su), l = b.lines.filter(function (z) { return z.type && z.st !== 'accept'; });
    return 'Hi ' + x.acc + ',\n\nThanks for statement ' + b.ref + '. Most of it matches our orders, but ' + (l.length === 1 ? 'one line does not' : l.length + ' lines do not') + ':\n\n' +
      l.map(function (z) { return z.ref + ', ' + z.desc + ': ' + z.why.replace(/ You booked/, ' We booked').replace(/you agreed with them/, 'we agreed').replace(/^This job is/, 'It is') + ' (' + money(z.over) + ')'; }).join('\n') +
      '\n\nThat comes to ' + money(billOver(b)) + '. Can you send a credit note or a corrected statement? We will pay the rest on the normal terms.\n\nThanks, John\nCAC Waste Management';
  }

  /* ---------- find a supplier, the scorecard and the issues log ---------- */
  var ITYPES = ['Missed delivery', 'Late', 'Wrong size', 'Damage', 'Other'];
  function issues() {
    var d = D3();
    if (!d.issues) d.issues = [
      { id: 'i1', sup: 's11', type: 'Late', off: CS.wd(-3), note: 'Two hours late to Toxteth. The customer rang twice.', open: true },
      { id: 'i2', sup: 's3', type: 'Missed delivery', off: CS.wd(-9), note: 'Did not turn up at Costessey. Came the next morning.', open: false },
      { id: 'i3', sup: 's9', type: 'Late', off: CS.wd(-7), note: 'Afternoon instead of the morning, Erdington.', open: false },
      { id: 'i4', sup: 's13', type: 'Wrong size', off: CS.wd(-14), note: 'Sent a 12 yard for a 16 yard order. Swapped the same day.', open: false },
      { id: 'i5', sup: 's3', type: 'Damage', off: CS.wd(-19), note: 'Cracked a kerb on Fakenham Road. Their insurer is dealing with it.', open: true }
    ];
    return d.issues;
  }
  function card(su) {
    var is = issues().filter(function (i) { return i.sup === su.id; }), os = all().filter(function (o) { return o.sup === su.id && o.off <= 0; }), t = sums(os);
    var late = Math.round((su.jobs || 0) * (100 - su.onTime) / 100), failed = is.filter(function (i) { return i.type === 'Missed delivery'; }).length, notes = su.wtn;
    var sc = Math.max(0, Math.min(100, Math.round(su.onTime * 0.55 + (notes != null ? notes : su.onTime) * 0.35 + Math.max(0, 10 - is.length * 3))));
    return { is: is, jobs: su.jobs || os.length, late: late, failed: failed, notes: notes, margin: CS.pct(t.margin, t.rev), score: sc, cls: sc >= 92 ? 'ok' : sc >= 85 ? 'amber' : 'bad' };
  }
  function fnd() { var u = H.ui; if (!u.find) u.find = { pc: 'PE31', svc: 'skip', size: 8, sort: 'best' }; return u.find; }
  function findRes() {
    var f = fnd(), pc = f.pc.trim(), it = X2.itemOf({ svc: f.svc, size: f.size });
    if (pc.length < 2) return '<div class="card"><div class="empty">' + ic('map-pin') + 'Type a postcode, or just the first half, like PE31.</div></div>';
    var r = CS.lookup(pc, it).map(function (x) { x.c = card(x.sup); return x; });
    if (!r.length) return '<div class="card"><div class="empty">' + ic('alert') + 'No supplier on file covers ' + h(CS.outward(pc)) + ' for ' + h(CS.svc(f.svc).name.toLowerCase()) + '. <button class="btn sm" data-act="addSup" style="margin-left:8px">' + ic('plus') + 'Add a supplier</button></div></div>';
    var best = r[0].sup.id;
    if (f.sort === 'price') r.sort(function (a, b) { return a.cost - b.cost; });
    if (f.sort === 'reliable') r.sort(function (a, b) { return b.c.score - a.c.score; });
    return '<p class="dsum"><b>' + plural(r.length, 'supplier') + '</b> cover' + (r.length === 1 ? 's' : '') + ' ' + h(CS.outward(pc)) + ' for ' + h(X2.descOf(it).toLowerCase()) + '.</p><div class="fres">' + r.map(function (x, i) {
      var su = x.sup;
      return '<div class="card fcard' + (su.id === best ? ' best' : '') + '"><div class="fmain"><div class="fn"><b>' + h(su.name) + '</b>' + (su.id === best ? '<span class="tag ok">Best pick</span>' : '') + (su.preferred ? '<span class="tag brand">' + ic('star') + 'Preferred</span>' : '') + '<small>' + h(su.base) + ' · ' + h(su.contact) + ' ' + h(su.phone) + '</small></div>' +
        '<div class="fnum"><div><small>Their price</small><b class="num">' + money(x.cost) + '</b></div><div><small>You charge</small><b class="num">' + money(x.sell) + '</b></div><div><small>Margin</small><b class="num">' + money(x.margin) + '</b></div></div></div>' +
        '<div class="fsc"><span class="score ' + x.c.cls + '">' + x.c.score + '</span><span><b>' + su.onTime + '%</b><small>on time</small></span><span><b>' + x.c.failed + '</b><small>failed deliveries</small></span><span><b>' + (x.c.notes != null ? x.c.notes + '%' : 'n/a') + '</b><small>notes back on time</small></span><span><b>' + x.c.is.length + '</b><small>complaints</small></span><span><b>' + (x.c.margin ? x.c.margin + '%' : 'n/a') + '</b><small>average margin</small></span></div>' +
        (i === 0 && x.why && f.sort === 'best' ? '<small class="why" style="padding:0 14px 10px">' + h(x.why) + '</small>' : '') +
        '<div class="cardfoot"><button class="btn sm" data-act="supScore" data-id="' + su.id + '">' + ic('list') + 'Scorecard</button><button class="btn sm" data-act="openSup" data-id="' + su.id + '">' + ic('warehouse') + 'Handbook</button><span class="sp"></span><button class="btn sm pri" data-act="findOrder" data-id="' + su.id + '">' + ic('plus') + 'Order with them</button></div></div>';
    }).join('') + '</div>';
  }
  function findView() {
    var f = fnd(), s = S(), is = issues();
    return '<div class="card pad dfil"><div class="field" style="max-width:190px"><label for="findPc">Postcode</label><input id="findPc" value="' + h(f.pc) + '" placeholder="PE31 8LT" autocomplete="off"></div>' +
      '<div class="field grow"><label>Service</label><div class="chips">' + Object.keys(s.services).map(function (k) { return '<button type="button" class="pk sm' + (f.svc === k ? ' on' : '') + '" data-act="findSvc" data-v="' + k + '">' + h(s.services[k].short) + '</button>'; }).join('') + '</div></div>' +
      (f.svc === 'skip' ? '<div class="field"><label>Size</label><div class="chips">' + [4, 6, 8, 12, 16, 20].map(function (z) { return '<button type="button" class="pk sm' + (f.size === z ? ' on' : '') + '" data-act="findSize" data-v="' + z + '">' + z + ' yd</button>'; }).join('') + '</div></div>' : '') +
      '<div class="field"><label>Put first</label><div class="seg">' + [['best', 'Best overall'], ['price', 'Cheapest'], ['reliable', 'Most reliable']].map(function (x) { return '<button data-act="findSort" data-v="' + x[0] + '" class="' + (f.sort === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div></div>' +
      '<div id="findRes">' + findRes() + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="hd"><h2>' + ic('alert') + 'Issues log <span class="muted" style="font-weight:600">' + is.length + '</span></h2><button class="btn sm" data-act="issueNew">' + ic('plus') + 'Log an issue</button></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      is.slice().sort(function (a, b) { return b.off - a.off; }).map(function (i) { return '<div class="rowline"><div class="bd"><b>' + h(i.type) + ', ' + h(CS.sup(i.sup).name) + '</b><small>' + dShort(i.off) + ' · ' + h(i.note) + '</small></div>' + (i.open ? '<button class="btn sm" data-act="issueClose" data-id="' + i.id + '">' + ic('check') + 'Mark sorted</button>' : '<span class="tag ok">Sorted</span>') + '</div>'; }).join('') + '</div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">The score is worked out from on time deliveries, waste transfer notes sent back, and the issues you log here. The figures in this demo are samples. Live, they build up from your own jobs.</p>';
  }
  function scoreDrawer(su) {
    var c = card(su), x = X2.hb(su), os = all().filter(function (o) { return o.sup === su.id && o.off <= 0; }).slice(-5).reverse();
    H.drawer(h(su.name), 'Scorecard · ' + h(su.base), '<div class="scbig"><span class="score lg ' + c.cls + '">' + c.score + '</span><div><b>' + (c.score >= 92 ? 'Reliable' : c.score >= 85 ? 'Mostly fine, worth watching' : 'Letting you down') + '</b><small class="muted">Out of 100, from your own jobs with them</small></div></div>' +
      '<dl class="kv"><dt>Jobs with you</dt><dd>' + c.jobs + '</dd><dt>On time</dt><dd>' + su.onTime + '%, ' + plural(c.late, 'job') + ' late</dd><dt>Failed deliveries</dt><dd>' + c.failed + '</dd><dt>Notes back on time</dt><dd>' + (c.notes != null ? c.notes + '%' : 'No waste, no notes needed') + '</dd><dt>Confirms a booking in</dt><dd>about ' + su.resp + ' minutes</dd><dt>Complaints logged</dt><dd>' + c.is.length + '</dd><dt>Average margin</dt><dd>' + (c.margin ? c.margin + '%' : 'Not enough jobs yet') + '</dd><dt>Accounts</dt><dd>' + h(x.acc) + ' · ' + h(x.accEmail) + '</dd></dl>' +
      '<div class="sec"><h3>Issues</h3></div>' + (c.is.map(function (i) { return '<div class="rowline"><div class="bd"><b>' + h(i.type) + '</b><small>' + dShort(i.off) + ' · ' + h(i.note) + '</small></div>' + (i.open ? '<span class="tag amber">Open</span>' : '<span class="tag ok">Sorted</span>') + '</div>'; }).join('') || '<div class="empty">' + ic('circle-check') + 'Nothing logged against them.</div>') +
      '<div class="sec"><h3>Last jobs</h3></div>' + (os.map(function (o) { return '<button class="trow" data-act="ordOpen" data-id="' + o.id + '"><span class="bd"><b>' + o.id + ' · ' + h(CS.jobDesc(o)) + '</b><small>' + dShort(o.off) + ' · ' + h(custName(o)) + '</small></span>' + H.margTag(o.sell - o.cost, o.sell) + '</button>'; }).join('') || '<div class="empty">No jobs yet.</div>'),
      '<button class="btn" data-act="issueNew" data-id="' + su.id + '">' + ic('alert') + 'Log an issue</button><span class="sp"></span><button class="btn pri" data-act="openSup" data-id="' + su.id + '">' + ic('warehouse') + 'Open the handbook</button>');
  }

  /* ---------- credit control ---------- */
  function creditView() {
    var s = S(), st = CS.stats(), rows = s.customers.map(function (c) { return { c: c, cr: CS.credit(c.id, 0), ag: CS.aged(c.id) }; }).sort(function (a, b) { return (b.c.stop ? 1 : 0) - (a.c.stop ? 1 : 0) || b.ag.total - a.ag.total; });
    var stops = rows.filter(function (r) { return r.c.stop; }).length, holds = rows.filter(function (r) { return r.cr.hold && !r.c.stop; }).length;
    var tot = rows.reduce(function (a, r) { a.c += r.ag.current; a.d30 += r.ag.d30; a.d60 += r.ag.d60; a.t += r.ag.total; return a; }, { c: 0, d30: 0, d60: 0, t: 0 });
    function cell(n, bad) { return '<td class="r num hide-sm"' + (bad && n ? ' style="color:var(--bad);font-weight:700"' : '') + '>' + (n ? money(n) : '<span class="muted">0</span>') + '</td>'; }
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('pound') + 'Owed to you</small><b>' + money(st.owed) + '</b><span class="d">across ' + plural(rows.filter(function (r) { return r.ag.total; }).length, 'customer') + '</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Overdue</small><b' + (st.overdue ? ' style="color:var(--bad)"' : '') + '>' + money(st.overdue) + '</b><span class="d">past the date it was due</span></div>' +
      '<div class="card kpi"><small>' + ic('clock') + 'On hold</small><b>' + holds + '</b><span class="d">held by the system, new orders ask you first</span></div>' +
      '<div class="card kpi"><small>' + ic('lock') + 'On stop</small><b id="stopN"' + (stops ? ' style="color:var(--bad)"' : '') + '>' + stops + '</b><span class="d">stopped by you</span></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('lock') + 'Every account</h2><span class="muted" style="font-size:12.5px">Aged by how late each invoice is</span></div><div class="tw"><table class="t"><thead><tr><th>Customer</th><th class="r hide-sm">Limit</th><th class="r">Owed</th><th class="r hide-sm">Not due yet</th><th class="r hide-sm">1 to 30 days late</th><th class="r hide-sm">Over 30 days</th><th>Standing</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var c = r.c, cr = r.cr, tag = c.stop ? '<span class="tag bad">' + ic('lock') + 'On stop</span>' : cr.state === 'card' ? '<span class="tag">Pays by card</span>' : cr.hold ? '<span class="tag amber">On hold</span>' : cr.state === 'late' ? '<span class="tag amber">' + cr.worst + ' days late</span>' : '<span class="tag ok">Good</span>';
        return '<tr><td><b class="click" data-act="openCust" data-id="' + c.id + '">' + h(c.name) + '</b><small>' + h(c.terms) + '</small></td><td class="r num hide-sm">' + (c.limit ? money(c.limit) : '<span class="muted">None</span>') + '</td><td class="r num"><b>' + (r.ag.total ? money(r.ag.total) : '0') + '</b></td>' + cell(r.ag.current) + cell(r.ag.d30, true) + cell(r.ag.d60, true) +
          '<td>' + tag + (cr.why && !c.stop ? '<small class="why hide-sm">' + h(cr.why) + '</small>' : '') + '</td><td class="r"><div class="row" style="justify-content:flex-end;gap:6px">' + (r.ag.total ? '<button class="btn sm hide-sm" data-act="statement" data-id="' + c.id + '">' + ic('receipt') + '<span class="hide-md">Statement</span></button>' : '') +
          '<button class="btn sm' + (c.stop ? ' pri' : '') + '" data-act="stopToggle" data-id="' + c.id + '" aria-label="' + (c.stop ? 'Take ' + h(c.name) + ' off stop' : 'Put ' + h(c.name) + ' on stop') + '">' + ic(c.stop ? 'check' : 'lock') + '<span class="hide-sm">' + (c.stop ? 'Take off stop' : 'Put on stop') + '</span></button></div></td></tr>';
      }).join('') + '<tr class="totrow"><td><b>Total</b></td><td class="hide-sm"></td><td class="r num"><b>' + money(tot.t) + '</b></td>' + cell(tot.c) + cell(tot.d30, true) + cell(tot.d60, true) + '<td></td><td></td></tr></tbody></table></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0"><b>On hold</b> is automatic: over their limit, or an invoice more than 14 days late. New orders from them are held and you are asked first. <b>On stop</b> is your call: New order is blocked for them until you take them off stop. Nobody is ever stopped without you deciding.</p>';
  }

  /* ---------- connections ---------- */
  var CONN = [
    ['whatsapp', 'WhatsApp', 'Customer and supplier WhatsApps land in the inbox, and replies go back from the same number.', 'Connects through the WhatsApp Business platform. Needs your business number approved by Meta. Running cost depends on message volume, quoted before we start.', 'tryIt', 'Send a test WhatsApp'],
    ['mail', 'Email', 'Orders, supplier replies and waste transfer notes come in by themselves and file against the right job.', 'Connects to your own mailbox, Outlook (Microsoft 365) or Gmail. Needs you to sign in once and approve it.', 'connGo:inbox', 'See the inbox'],
    ['world', 'Website enquiries', 'Get a quote enquiries from your website land in the same inbox, already priced.', 'Needs a small change to the form on your website.', 'connGo:inbox', 'See the inbox'],
    ['receipt', 'Sage', 'Invoices and supplier bills go across to Sage, so nothing is typed twice and there is no Friday afternoon of invoicing.', 'Sage Accounting online links directly. Sage 50 on a desktop needs checking first. Xero and QuickBooks work too. Needs your Sage login to approve the link. Set up as part of the build.', 'connGo:money', 'See money'],
    ['pound', 'Card payments', 'Pay by card links on invoices, and taking a card over the phone when you place an order.', 'Runs on Stripe. Needs your own Stripe account, so the money goes straight to you. Stripe charges their fee per payment.', 'newOrder', 'See it in New order'],
    ['shield-check', 'Companies House', 'New trade accounts are looked up before you set a credit limit.', 'A free public register. Nothing needed from you.', 'newAccount', 'Open a trade account']
  ];
  function connView() {
    return '<div class="note" style="margin-bottom:16px">' + ic('link') + '<span><b>Nothing is connected in this demo.</b> It runs on sample data in this browser. This page shows what the real system plugs into, and what each one needs from you.</span></div><div class="cgrid">' +
      CONN.map(function (c) { var a = c[4].split(':'); return '<div class="card pad conn"><div class="row"><span class="cic">' + ic(c[0]) + '</span><h2 style="flex:1">' + c[1] + '</h2><span class="tag">Not connected</span></div><p>' + c[2] + '</p><small class="muted">' + c[3] + '</small><button class="btn sm" data-act="' + a[0] + '"' + (a[1] ? ' data-v="' + a[1] + '"' : '') + '>' + ic('eye') + c[5] + '</button></div>'; }).join('') + '</div>';
  }

  /* ---------- a calmer home ---------- */
  var TILES3 = ['neworder', 'inbox', 'today', 'orders', 'skips', 'chasing', 'money', 'quiet', 'bills', 'handbook', 'sales', 'carbon'], HIDE3 = ['bills', 'handbook', 'sales', 'carbon'];
  function homeState() { var d = X2.D(); if (!d.v3) { d.home = TILES3.filter(function (k) { return HIDE3.indexOf(k) < 0; }); d.hidden = HIDE3.slice(); d.v3 = true; } return d; }
  function tileDefs() {
    var st = CS.stats(), ch = CS.chaseLists(), mtd = S().months[S().months.length - 1], t0 = X2.movesOn(0), os = X2.onSite(), due = os.filter(function (x) { return x.due; }), wr = X2.warnings();
    var needs = H.sortedThreads().filter(H.needsYou), leads = S().leads.filter(function (l) { return l.stage !== 'won'; }), f = forecast(), prev = f.prev, dn = prev ? f.cur.s.n - prev.st.n : 0;
    var quiet = S().quotes.filter(function (x) { return x.status === 'sent' && x.day <= -3 && !x.snoozed; }), b = D3().bill;
    var rep = S().customers.map(function (c) { return CS.report(c.id); }).filter(function (r) { return r.moves; }), tonnes = rep.reduce(function (a, r) { return a + r.tonnes; }, 0);
    function row(act, attrs, a, b2, tag) { return '<button class="trow" data-act="' + act + '" ' + attrs + '><span class="bd"><b>' + a + '</b><small>' + b2 + '</small></span>' + (tag || '') + '</button>'; }
    function big(n, label) { return '<div class="tbig"><b>' + n + '</b><span>' + label + '</span></div>'; }
    function line(n, label) { return '<div class="tline"><b>' + n + '</b><span>' + label + '</span></div>'; }
    return {
      neworder: { n: 'New order', ic: 'plus', act: 'newOrder', v: '', go: 'Place an order', cta: true, body: '<button class="obig" data-act="newOrder">' + ic('plus') + '<span><b>Place an order</b><small>Books the supplier, raises the invoice and sends the confirmation in one go</small></span></button>' },
      inbox: { n: 'Inbox', ic: 'inbox', act: 'go', v: 'inbox', go: 'Open the inbox', body: big(needs.length, 'need a reply, every one already drafted') + needs.slice(0, 2).map(function (t) { var p = CS.party(t.party); return row('openThread', 'data-id="' + t.id + '"', h(p.name), h(CS.analyse(t).title), t.unread ? '<span class="ub">1</span>' : ''); }).join('') },
      today: { n: 'Today', ic: 'truck', act: 'jobTab', v: 'live', go: 'Live jobs', body: big(t0.length, 'jobs moving today') + (t0.slice(0, 2).map(function (r) { var tk = X2.track(r.j, 0, r.what); return row('openJob', 'data-id="' + r.j.id + '"', h(r.what + ': ' + CS.jobDesc(r.j)), h(CS.jobSite(r.j).pc) + ' · ' + h(X2.eta(r.j)), '<span class="tag ' + tk[1] + '">' + tk[0] + '</span>'); }).join('') || '<small class="muted">Nothing moving today.</small>') },
      orders: { n: 'Orders this month', ic: 'calendar', act: 'go', v: 'orders', go: 'Open the order diary', body: big(f.cur.s.n, prev ? (dn === 0 ? 'level with this point in ' + prev.long : Math.abs(dn) + (dn > 0 ? ' more' : ' fewer') + ' than this point in ' + prev.long) : 'so far') + line(money(f.cur.s.rev), 'sales so far') + line(money(f.est), 'forecast for the month, an estimate') },
      skips: { n: 'Skips on site', ic: 'skip', act: 'jobTab', v: 'skips', go: 'See them all', body: big(os.length, 'on site' + (due.length ? ', <span class="redtxt">' + due.length + ' need a collection booked</span>' : ', none overdue')) + os.slice(0, 2).map(function (x) { var c = CS.cust(x.j.cust); return row('openJob', 'data-id="' + x.j.id + '"', h(CS.jobDesc(x.j)) + ', ' + h(c.name), h(x.su.name) + ' · day ' + x.on + ' of ' + x.period, x.due ? '<span class="tag bad">Book collection</span>' : x.booked ? '<span class="tag web">Booked</span>' : '<span class="tag ok">' + x.left + ' left</span>'); }).join('') },
      chasing: { n: 'Chasing', ic: 'bell', act: 'go', v: 'chasing', go: 'Open chasing', body: big(ch.total, 'things waiting on someone else') + line(ch.sup.length, 'suppliers not confirmed') + line(ch.pay.length, 'customers not paid') + line(ch.wtn.length, 'waste transfer notes not back') },
      money: { n: 'Money', ic: 'pound', act: 'go', v: 'money', go: 'Open money', body: big(money(mtd.margin), 'margin this month, ' + CS.pct(mtd.margin, mtd.rev) + '% on ' + money(mtd.rev)) + line(money(st.overdue), 'overdue to you') + line(money(st.owed), 'owed in total') },
      quiet: { n: 'Quotes gone quiet', ic: 'file-text', act: 'go', v: 'quotes', go: 'Follow them up', body: big(quiet.length, money(quiet.reduce(function (a, x) { return a + x.sell; }, 0)) + ' of work waiting on an answer') + quiet.slice(0, 2).map(function (x) { var p = CS.party(x.cust ? { type: 'customer', id: x.cust } : { type: 'lead', id: x.lead }); return row('quoteView', 'data-id="' + x.id + '"', h(p.sub || p.name), h(x.desc) + ' · quoted ' + (-x.day) + ' days ago', '<span class="tag">' + money(x.sell) + '</span>'); }).join('') },
      bills: { n: 'Supplier bill check', ic: 'receipt', act: 'go', v: 'bills', go: 'Open the bill check', body: big(money(billOver(b) + oldOver()), 'overcharged this month, found before you paid') + line(S().bills.length + (b ? 1 : 0), 'bills and statements checked') },
      handbook: { n: 'Supplier handbook', ic: 'warehouse', act: 'go', v: 'suppliers', go: 'Open the handbook', body: big(S().suppliers.length, 'suppliers, with contacts, prices and licences') + (wr.slice(0, 2).map(function (w) { return row('openSup', 'data-id="' + w.su.id + '"', h(w.su.name), h(w.d.n) + ' runs out ' + X2.inWords(w.d.exp), '<span class="tag ' + (w.d.exp < 30 ? 'bad' : 'amber') + '">' + w.d.exp + ' days</span>'); }).join('') || '<small class="muted">Every licence and insurance is in date.</small>') },
      sales: { n: 'Sales pipeline', ic: 'target', act: 'go', v: 'sales', go: 'Open the pipeline', body: big(money(leads.reduce(function (a, l) { return a + l.value; }, 0)), 'a month in the pipeline, ' + leads.length + ' open deals') + line(leads.filter(function (l) { return l.next != null && l.next <= 0; }).length, 'follow ups due') },
      carbon: { n: 'Waste and carbon', ic: 'leaf', act: 'go', v: 'reports', go: 'Open the reports', body: big((Math.round(tonnes * 10) / 10) + ' t', 'handled this year') + line(rep.length, 'accounts with a report ready') }
    };
  }
  /* the picture at the top of Home: sales by month with this month's forecast, and this month so far next to it */
  function homeChart() {
    var f = forecast(), cur = f.cur, prev = f.prev, ms = f.ms, firstM = ms[0], mx = Math.max.apply(null, ms.map(function (x) { return x.s.rev; }).concat([f.est]));
    var dr = prev ? cur.s.rev - prev.st.rev : 0, first = !H.ui.hcSeen; H.ui.hcSeen = true;
    return '<section class="card homechart' + (first ? ' grow' : '') + '" id="homeChart"><div class="hc-l"><div class="row" style="margin-bottom:4px"><h2 style="flex:1">' + ic('trending-up') + 'Sales by month</h2><span class="tag">' + ic('calendar') + 'Since ' + firstM.long + ' ' + firstM.y + '</span></div>' +
      '<div class="bars hc">' + ms.map(function (x, i) { var last = i === ms.length - 1; return '<div class="b' + (last ? '' : ' dim') + '"><em>' + (last ? money(x.s.rev) + ' so far' : money(x.s.rev)) + '</em>' + (last ? '<i class="ghost" style="height:' + Math.round(f.est / mx * 100) + '%"><i style="height:' + Math.round(x.s.rev / f.est * 100) + '%"></i></i>' : '<i style="height:' + Math.round(x.s.rev / mx * 100) + '%"></i>') + '<span>' + x.label + (last ? '' : ' · ' + x.s.n) + '</span></div>'; }).join('') + '</div>' +
      '<p class="muted hc-note">The pale bar is where ' + cur.long + ' is heading, an estimate.</p></div>' +
      '<div class="hc-r"><small>' + cur.long + ' so far</small><b class="big">' + money(cur.s.rev) + '</b>' +
      (prev ? '<span class="d ' + (dr >= 0 ? 'up' : 'down') + '">' + (dr >= 0 ? '&#9650; ' : '&#9660; ') + money(Math.abs(dr)) + (dr >= 0 ? ' more' : ' less') + ' than this point in ' + prev.long + '</span>' : '') +
      '<div class="tline"><b>' + cur.s.n + '</b><span>orders</span></div><div class="tline"><b>' + money(cur.s.margin) + '</b><span>margin, ' + CS.pct(cur.s.margin, cur.s.rev) + '%</span></div><div class="tline"><b>' + money(f.est) + '</b><span>forecast for the month, an estimate</span></div>' +
      '<button class="tgo" data-act="go" data-v="trends">Open trends' + ic('chevron-right') + '</button></div></section>';
  }
  function homeView() {
    var d = homeState(), defs = tileDefs(), arr = !!H.ui.arrange, st = CS.stats(), hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening', t0 = X2.movesOn(0).length;
    d.home = d.home.filter(function (k) { return defs[k]; }); d.hidden = d.hidden.filter(function (k) { return defs[k]; });
    TILES3.forEach(function (k) { if (d.home.indexOf(k) < 0 && d.hidden.indexOf(k) < 0) d.hidden.push(k); });
    return '<div class="homehd"><div style="flex:1;min-width:220px"><h2 id="greet">' + greet + ', John</h2><p class="muted">' + plural(st.needs, 'message') + ' need you, every one already drafted. ' + plural(t0, 'job') + ' moving today.</p></div>' +
      '<button class="btn sm' + (arr ? ' dark' : '') + '" data-act="homeArrange">' + ic(arr ? 'check' : 'pencil') + (arr ? 'Done' : 'Arrange') + '</button></div>' +
      (arr ? '<div class="row" style="flex-wrap:wrap;margin-bottom:12px"><span class="muted" style="font-size:13px">' + (d.hidden.length ? 'Drag a tile to move it. More tiles you can add:' : 'Drag a tile to move it.') + '</span>' + d.hidden.map(function (k) { return '<button class="pk sm" data-act="tileShow" data-v="' + k + '">' + ic('plus') + h(defs[k].n) + '</button>'; }).join('') + '</div>' : '') +
      homeChart() +
      '<div class="tiles t3' + (arr ? ' arr' : '') + '" id="tiles">' + d.home.map(function (k, i) {
        var t = defs[k];
        return '<section class="card tile' + (t.cta ? ' cta' : '') + '" draggable="true" data-tile="' + k + '"><div class="hd"><span class="grip" title="Drag to move">' + ic('menu') + '</span><h2>' + ic(t.ic) + h(t.n) + '</h2>' +
          (arr ? (i === 0 ? '' : '<button class="iconbtn sm" data-act="tileMove" data-v="' + k + '" data-d="-1" aria-label="Move ' + h(t.n) + ' earlier">' + ic('chevron-left') + '</button>') + (i === d.home.length - 1 ? '' : '<button class="iconbtn sm" data-act="tileMove" data-v="' + k + '" data-d="1" aria-label="Move ' + h(t.n) + ' later">' + ic('chevron-right') + '</button>') + '<button class="iconbtn sm" data-act="tileHide" data-v="' + k + '" aria-label="Hide ' + h(t.n) + '">' + ic('x') + '</button>' : '') +
          '</div><div class="bd">' + t.body + '</div>' + (t.cta ? '' : '<button class="tgo" data-act="' + t.act + '" data-v="' + t.v + '">' + t.go + ic('chevron-right') + '</button>') + '</section>';
      }).join('') + '</div>';
  }

  /* ---------- wiring ---------- */
  W.init = function (o) {
    H = o; X2 = window.CACV2.x; var A = H.A, V = H.V; D3(); hist();
    V.home = homeView; V.orders = ordersView; V.trends = trendsView; V.bills = billsView; V.find = findView; V.credit = creditView; V.connections = connView;
    var custV = V.customers; V.customers = function () {
      var c = S().customers[0];
      return custV() + '<div class="card pad" style="margin-top:16px" id="linkCard"><div class="row" style="flex-wrap:wrap;gap:10px"><div style="flex:1;min-width:240px"><h2>' + ic('link') + 'Each customer\'s own link</h2><p class="muted" style="margin:6px 0 0;font-size:13px">A private page for every account customer. They can order again, book an exchange or a collection, and download their invoices and waste transfer notes, without ringing you. Every request comes to you to approve first.</p></div><button class="btn pri" data-act="custLink" data-id="' + c.id + '">' + ic('eye') + 'See what ' + h(c.first) + ' sees</button></div></div>';
    };

    function toOrders(fn) { H.closeLayer(); var d = dia(); fn(d); if (H.ui.view !== 'orders') H.go('orders'); else H.render(); }
    A.diaMode = function (el) { toOrders(function (d) { d.mode = el.dataset.v; d.more = 1; }); };
    A.diaNav = function (el) {
      var d = dia(), dir = Number(el.dataset.v), a = date(d.off);
      if (d.mode === 'month') d.off = offOf(new Date(a.getFullYear(), a.getMonth() + dir, dir > 0 || mk(new Date(a.getFullYear(), a.getMonth() + dir, 1)) !== mk(date(0)) ? 1 : date(0).getDate()));
      else d.off += dir * (d.mode === 'week' ? 7 : 1);
      if (d.mode === 'month' && mk(date(d.off)) === mk(date(0))) d.off = 0;
      H.render();
    };
    A.diaToday = function () { dia().off = 0; H.render(); };
    A.diaDay = function (el) { toOrders(function (d) { d.mode = 'day'; d.off = Number(el.dataset.v); }); window.scrollTo(0, 0); };
    A.diaMore = function () { dia().more++; H.render(); };
    A.diaClear = function () { var d = dia(); d.q = ''; d.cust = ''; d.sup = ''; d.svc = ''; d.status = ''; d.paid = ''; d.more = 1; H.render(); };
    A.diaCust = function (el) { toOrders(function (d) { d.mode = 'list'; d.q = ''; d.sup = ''; d.svc = ''; d.status = ''; d.paid = ''; d.cust = el.dataset.id; d.more = 1; }); };
    A.ordOpen = function (el) { var x = find(el.dataset.id); if (x) orderPage(x); };
    A.ordRepeat = function (el) {
      var x = find(el.dataset.id); if (!x) return; var c = CS.cust(x.cust);
      X2.order({ cust: c.id, site: x.site != null ? x.site : 0, cname: c.contact, cphone: c.phone, svc: x.svc, size: x.size || 8, qty: x.svc === 'grab' || x.svc === 'muck' || x.svc === 'aggregates' ? x.qty : (x.weeks || x.panels || x.hours || x.m3 || ''), pay: /card/i.test(c.terms) ? 'link' : 'account' });
      H.toast('Same again for ' + h(c.name) + '. Check the date, then place it.', 'refresh');
    };
    A.histDoc = function (el) { var x = find(el.dataset.id); if (!x) return; histDoc(x, el.dataset.k); };
    /* one waste transfer note everywhere: the View WTN buttons on jobs open the same template as the order page */
    A.viewWtn = function (el) { var x = find(el.dataset.id); if (x) wtnModal(x, false); };
    var chase0 = A.chaseWtn; A.chaseWtn = function (el) {
      var w = q('#wtnWait'), id = w && el && w.contains(el) ? w.getAttribute('data-id') : null, bk = !!q('#layer .mft [data-act="ordOpen"]');
      chase0(el); if (id) { var x = find(id); if (x) wtnModal(x, bk); }
    };
    A.ordFind = function (el) { var b = q('#sres'), i = q('#q'); if (b) b.hidden = true; if (i) i.value = ''; A.ordOpen(el); };
    A.ordFindAll = function () {
      var b = q('#sres'), i = q('#q'), v = i ? i.value.trim() : ''; if (b) b.hidden = true; if (i) i.value = '';
      toOrders(function (d) { d.mode = 'list'; d.from = null; d.q = v; d.cust = ''; d.sup = ''; d.svc = ''; d.status = ''; d.paid = ''; d.more = 1; });
    };
    var qi = q('#q'); if (qi) qi.placeholder = 'Search orders or PO';
    var place = A.ordPlace; A.ordPlace = function (el) {
      var n = S().jobs.length; place(el); if (S().jobs.length === n) return;
      var j = S().jobs[S().jobs.length - 1], m = S().months[S().months.length - 1];
      if (j.day <= 0) { m.rev += j.sell; m.margin += j.sell - j.cost; CS.save(); }
      var f = document.querySelector('#layer .modal .mft .sp'); if (f) f.insertAdjacentHTML('beforebegin', '<button class="btn" data-act="diaDay" data-v="' + j.day + '">' + ic('calendar') + 'See it in the diary</button>');
    };

    A.billSample = function () {
      if (H.ui.billRead) return; H.ui.billRead = true; H.render();
      setTimeout(function () { H.ui.billRead = false; var b = D3().bill = billBuild(); CS.feed(CS.sup(b.sup).name + ' statement checked, ' + money(billOver(b)) + ' over', 'receipt'); CS.saved(35); CS.commit(); H.toast('Statement read. ' + money(billOver(b)) + ' does not match what you booked.', 'alert'); }, 1100);
    };
    A.billLine = function (el) { var b = D3().bill, l = b && b.lines[Number(el.dataset.i)]; if (!l) return; l.st = el.dataset.v; CS.commit(); };
    A.billReset = function () { D3().bill = null; CS.commit(); };
    A.billDraft = function () {
      var b = D3().bill; if (!b) return; var su = CS.sup(b.sup), x = X2.hb(su);
      H.modal('Query to ' + h(su.name), '<p class="muted" style="margin:0 0 8px;font-size:13px">To ' + h(x.acc) + ', ' + h(x.accEmail) + '. Change anything you like before it goes.</p><div class="field"><label for="billText">Email</label><textarea id="billText" rows="13">' + h(billText(b)) + '</textarea></div>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="billSend">' + ic('send') + 'Send the query</button>', true);
    };
    A.billSend = function () {
      var b = D3().bill, text = (q('#billText') || {}).value || ''; if (!b || !text.trim()) { H.toast('Write the query first', 'alert'); return; }
      var su = CS.sup(b.sup), t = CS.threadFor({ type: 'supplier', id: su.id }, 'email'); if (!t.subject) t.subject = 'Statement ' + b.ref;
      CS.addMsg(t, 'out', text, { by: 'John' }); t.done = true; b.status = 'queried'; b.lines.forEach(function (l) { if (l.type && l.st !== 'accept') l.st = 'query'; });
      CS.feed('Queried ' + money(billOver(b)) + ' with ' + su.name, 'receipt'); CS.saved(15); H.closeLayer(); CS.commit();
      H.toast('Query sent to ' + h(X2.hb(su).acc) + ' at ' + h(su.name) + '. ' + money(billOver(b)) + ' held back until they answer.', 'send');
    };

    A.findSvc = function (el) { fnd().svc = el.dataset.v; H.render(); };
    A.findSize = function (el) { fnd().size = Number(el.dataset.v); H.render(); };
    A.findSort = function (el) { fnd().sort = el.dataset.v; H.render(); };
    A.supScore = function (el) { var su = CS.sup(el.dataset.id); if (su) scoreDrawer(su); };
    A.findOrder = function (el) {
      var f = fnd(), out = CS.outward(f.pc), hit = null;
      /* if a customer already has a site in that postcode, the order starts on them and that site; the customer box can still be changed */
      S().customers.some(function (c) { return (c.sites || []).some(function (s, i) { if (CS.outward(s.pc) === out) { hit = { c: c, i: i }; return true; } return false; }); });
      if (hit) X2.order({ cust: hit.c.id, site: hit.i, cname: hit.c.contact, cphone: hit.c.phone, svc: f.svc, size: f.size, sup: el.dataset.id, pay: /card/i.test(hit.c.terms || '') ? 'link' : 'account' });
      else X2.order({ cust: 'new', site: 'other', cname: '', cphone: '', pc: f.pc.toUpperCase(), svc: f.svc, size: f.size, sup: el.dataset.id, pay: 'link' });
    };
    A.issueNew = function (el) {
      var pre = el && el.dataset && el.dataset.id; H.ui.issueType = ITYPES[0];
      H.modal('Log an issue', '<div class="field"><label for="issSup">Supplier</label><select id="issSup">' + S().suppliers.map(function (s) { return '<option value="' + s.id + '"' + (s.id === pre ? ' selected' : '') + '>' + h(s.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>What went wrong</label><div class="chips" id="issTypes">' + ITYPES.map(function (t, i) { return '<button type="button" class="pk' + (i === 0 ? ' on' : '') + '" data-act="issueType" data-v="' + t + '">' + t + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label for="issNote">What happened</label><input id="issNote" placeholder="Turned up a day late at Mill Lane"></div>', '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="issueSave">' + ic('check') + 'Save it</button>');
      setTimeout(function () { var x = q('#issNote'); if (x) x.focus(); }, 60);
    };
    A.issueType = function (el) { H.ui.issueType = el.dataset.v; Array.prototype.forEach.call(document.querySelectorAll('#issTypes .pk'), function (b) { b.classList.toggle('on', b === el); }); };
    A.issueSave = function () {
      var note = ((q('#issNote') || {}).value || '').trim(), sid = (q('#issSup') || {}).value; if (!note) { H.toast('Say what happened first', 'alert'); var x = q('#issNote'); if (x) x.focus(); return; }
      issues().push({ id: 'i' + Date.now(), sup: sid, type: H.ui.issueType || ITYPES[0], off: 0, note: note, open: true }); H.closeLayer(); CS.commit();
      H.toast('Logged against ' + h(CS.sup(sid).name) + '. It counts on their scorecard.', 'alert');
    };
    A.issueClose = function (el) { var i = issues().filter(function (x) { return x.id === el.dataset.id; })[0]; if (i) { i.open = false; CS.commit(); H.toast('Marked as sorted. It stays on their record.', 'check'); } };

    A.stopToggle = function (el) {
      var c = CS.cust(el.dataset.id); if (!c) return; c.stop = !c.stop;
      CS.feed(c.name + (c.stop ? ' put on stop' : ' taken off stop'), 'lock'); CS.commit();
      H.toast(c.stop ? h(c.name) + ' are on stop. New order is blocked for them until you take them off stop.' : h(c.name) + ' are off stop.', c.stop ? 'lock' : 'check');
    };
    A.connGo = function (el) { H.closeLayer(); H.go(el.dataset.v); };
    A.connections = function () { H.closeLayer(); H.go('connections'); };

    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.id === 'diaQ') { var d = dia(); d.q = el.value; d.more = 1; var b = q('#diaList'); if (b) b.innerHTML = listBody(d, all()); }
      if (el.id === 'findPc') { fnd().pc = el.value; var r = q('#findRes'); if (r) r.innerHTML = findRes(); }
      if (el.id === 'q') setTimeout(ordSearch, 0);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target || e.target.id !== 'q') return;
      var first = q('#sres:not([hidden]) .xdso'); if (first) { e.preventDefault(); first.click(); }
    });
    document.addEventListener('change', function (e) {
      var el = e.target, d;
      if (el.dataset && el.dataset.dia) { d = dia(); d[{ diaCust: 'cust', diaSup: 'sup', diaSvc: 'svc', diaStatus: 'status', diaPaid: 'paid' }[el.id]] = el.value; d.more = 1; H.render(); }
      if (el.id === 'billFile') A.billSample();
    });
    if (window.CACIMP) window.CACIMP.init(H);
  };
})();
