/* CAC customer portal: what a customer sees. A dashboard, book a job, their orders and their paperwork.
   Every request lands in the CAC inbox for a person to approve. Sample data only, nothing is really sent. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var params = new URLSearchParams(location.search);
  var embed = !!params.get('embed');
  if (embed) document.body.classList.add('embed');
  var S = CS.load();
  var cid = params.get('c') || 'c1'; if (!CS.cust(cid)) cid = 'c1';
  var qid = params.get('q');
  var asked = {};
  var VIEWS = ['home', 'book', 'orders', 'docs', 'green'];
  var view = (location.hash || '').replace('#', ''); if (view === 'documents') view = 'docs'; if (VIEWS.indexOf(view) < 0) view = 'home';
  var docTab = 'wtn', docQ = '', ordF = 'all', B = null;

  var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var ST = { booked: ['Booked, confirming', 'amber'], confirmed: ['Confirmed', 'brand'], onhire: ['On site', 'ok'], exchange: ['Swap booked', 'mail'], collection: ['Collection booked', 'web'], done: ['Completed', ''] };
  var SIZES = [4, 6, 8, 12];
  var OTHER = [['muck', 'Muck away'], ['toilet', 'Site toilet'], ['welfare', 'Welfare unit'], ['container', 'Storage container'], ['fencing', 'Heras fencing'], ['sweeper', 'Road sweeper'], ['aggregates', 'Aggregates'], ['concrete', 'Readymix concrete'], ['plant', 'Plant hire']];

  function $(s) { return document.querySelector(s); }
  function toast(t, i) { var b = $('#toasts'), el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = 0; setTimeout(function () { el.remove(); }, 400); }, 3600); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function low(s) { return /^(Today|Tomorrow|Yesterday)$/.test(s) ? s.toLowerCase() : s; }
  function dLong(off) { var d = CS.dayDate(off); return DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
  function dNum(off) { var d = CS.dayDate(off); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function clean(s, n) { return String(s || '').replace(/\s+/g, ' ').trim().replace(/[.,;:\s]+$/, '').slice(0, n || 140); }
  function jobs() { return CS.S.jobs.filter(function (j) { return j.cust === cid; }); }
  function byNew(a, b) { return b.day - a.day || (a.id < b.id ? 1 : -1); }
  function onSite(j) { return j.status === 'onhire' || j.status === 'exchange' || j.status === 'collection'; }
  function coming(j) { return j.status === 'booked' || j.status === 'confirmed'; }
  function siteLine(j) { var s = CS.jobSite(j); return s.name + (s.pc ? ', ' + s.pc : ''); }
  function whenTxt(j) {
    if (j.status === 'exchange') return 'Swap ' + low(CS.fmtDay(j.exDay));
    if (j.status === 'collection') return 'Collection ' + low(CS.fmtDay(j.colDay));
    if (j.status === 'onhire' || j.status === 'done') return 'Delivered ' + low(CS.fmtDay(j.day));
    return 'Due ' + low(CS.fmtDay(j.day));
  }
  function stTag(j) { var st = ST[j.status] || [cap(j.status), '']; return '<span class="tag ' + st[1] + '">' + st[0] + '</span>'; }
  function waiting() { return CS.S.threads.filter(function (t) { return t.portalReq && !t.done && t.party && t.party.type === 'customer' && t.party.id === cid; }).reverse(); }

  /* ---------- page frame ---------- */
  function chrome() {
    S = CS.S;
    var theme = params.get('theme') || S.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
    $('#plogo').src = theme === 'dark' ? 'brand/cac-logo-inverted.svg' : 'brand/cac-logo.svg';
    $('#callBtn').innerHTML = ic('phone') + '0330 122 5711';
  }
  function nav() {
    var items = [['home', 'home', 'Home'], ['orders', 'list', 'Orders'], ['docs', 'file-text', 'Documents'], ['green', 'leaf', 'Waste and carbon']];
    $('#cpnav').innerHTML = items.map(function (x) { return '<button data-act="go" data-v="' + x[0] + '" class="' + (view === x[0] ? 'on' : '') + '">' + ic(x[1]) + x[2] + '</button>'; }).join('');
    $('#bookTop').innerHTML = ic('plus') + 'Book a job';
    var tabs = [['home', 'home', 'Home'], ['book', 'plus', 'Book'], ['orders', 'list', 'Orders'], ['docs', 'file-text', 'Documents']];
    $('#ptabs').innerHTML = tabs.map(function (x) { return '<button data-act="' + (x[0] === 'book' ? 'book' : 'go') + '" data-v="' + x[0] + '" class="' + (view === x[0] ? 'on' : '') + (x[0] === 'book' ? ' main' : '') + '">' + ic(x[1]) + x[2] + '</button>'; }).join('');
  }
  function foot() {
    return '<p class="cp-demo">Demo with sample data. Nothing is really sent. Requests go to the CAC office and a person approves each one.' + (embed ? '' : ' <a class="link" href="index.html#customers">Back to the office</a>') + '</p>';
  }
  function go(v, keepScroll) {
    view = v; if (v === 'book' && !B) B = newB();
    try { history.replaceState(null, '', location.pathname + location.search + (v === 'home' ? '' : '#' + v)); } catch (e) {}
    render(); if (!keepScroll) window.scrollTo(0, 0);
  }
  function render() {
    chrome();
    document.body.classList.add('cp');
    var ae = document.activeElement, fid = ae && ae.id && $('#cview').contains(ae) ? ae.id : null, ss = null;
    if (fid) { try { ss = ae.selectionStart; } catch (e) {} }
    nav();
    $('#cview').innerHTML = (view === 'book' ? vBook() : view === 'orders' ? vOrders() : view === 'docs' ? vDocs() : view === 'green' ? vGreen() : vHome()) + foot();
    if (fid) { var el = document.getElementById(fid); if (el) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, ss); } catch (e2) {} } }
  }

  /* ---------- home ---------- */
  function waitRows() {
    return waiting().map(function (t) {
      var q = t.portalReq;
      return '<div class="cp-row"><span class="rico">' + ic('clock') + '</span><span class="bd"><b>' + h(q.what) + '</b><small>' + h(q.site) + ' · ' + h(q.day) + '</small></span><span class="tag amber">' + (q.quote ? 'Quote asked for' : 'Sent to CAC') + '</span></div>';
    }).join('');
  }
  function siteJob(j) {
    if (j.status !== 'onhire') delete asked[j.id];
    var can = j.status === 'onhire' && j.svc === 'skip' && !asked[j.id];
    return '<div class="cp-sj"><div class="cp-sjt"><span class="bd"><b>' + h(CS.jobDesc(j)) + '</b><small>' + h(whenTxt(j)) + ' · ' + j.id + '</small></span>' +
      (asked[j.id] ? '<span class="tag amber">' + ic('clock') + h(asked[j.id]) + ' requested</span>' : stTag(j)) + '</div>' +
      (can ? '<div class="cp-sjb"><button class="btn pri" data-act="swap" data-id="' + j.id + '">' + ic('exchange') + 'Swap it</button><button class="btn" data-act="collect" data-id="' + j.id + '">' + ic('archive') + 'Collect it</button></div>' : '') + '</div>';
  }
  function orderRow(j) {
    return '<button class="cp-row" data-act="conf" data-id="' + j.id + '"><span class="rico">' + ic(CS.svc(j.svc).icon || 'truck') + '</span><span class="bd"><b>' + h(CS.jobDesc(j)) + '</b><small>' + j.id + ' · ' + h(siteLine(j)) + ' · ' + h(whenTxt(j)) + '</small></span>' + stTag(j) + ic('chevron-right', 'go') + '</button>';
  }
  function vHome() {
    var c = CS.cust(cid), js = jobs(), now = CS.dayDate(0);
    var on = js.filter(onSite), month = js.filter(function (j) { var d = CS.dayDate(j.day); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    var unpaid = S.invoices.filter(function (i) { return i.cust === cid && i.status !== 'paid'; }), owed = unpaid.reduce(function (a, i) { return a + i.amount; }, 0);
    var wtns = js.filter(function (j) { return j.wtn === 'received'; });
    var toCome = js.filter(function (j) { return j.wtn && j.wtn !== 'received' && (onSite(j) || j.status === 'done'); });
    var r = CS.report(cid), w = waitRows();
    var sites = c.sites.map(function (s, i) {
      var live = js.filter(function (j) { return j.site === i && j.status !== 'done'; }).sort(function (a, b) { return (onSite(b) ? 1 : 0) - (onSite(a) ? 1 : 0) || a.day - b.day; });
      var n = live.filter(onSite).length;
      return '<div class="cp-card"><div class="hd"><span class="pin">' + ic('map-pin') + '</span><span class="bd"><b>' + h(s.name) + '</b><small>' + h(s.pc) + ' · ' + (n ? n + ' on site now' : 'Nothing on site') + '</small></span></div>' +
        (live.map(siteJob).join('') || '<div class="cp-none">Nothing on this site right now.</div>') +
        '<div class="ft"><button class="btn" data-act="book" data-site="' + i + '">' + ic('plus') + 'Book a job for this site</button></div></div>';
    }).join('');
    var recent = js.slice().sort(byNew).slice(0, 4);
    return '<div class="cp-hero"><div class="bd"><h1>Hello ' + h(c.first) + '</h1><p>' + h(c.name) + '. Your sites, orders and paperwork in one place.</p></div><button class="btn pri" data-act="book">' + ic('plus') + 'Book a job</button></div>' +
      (w ? '<div class="cp-sec">' + ic('clock') + 'Waiting for CAC to confirm</div><div class="cp-card cp-wait">' + w + '</div>' : '') +
      '<div class="cp-stats">' +
      '<button class="cp-stat" data-act="ordF" data-f="site"><small>' + ic('skip') + 'On site now</small><b>' + on.length + '</b><span>' + (on.length === 1 ? 'job on your sites' : 'jobs on your sites') + '</span></button>' +
      '<button class="cp-stat" data-act="ordF" data-f="all"><small>' + ic('calendar') + 'Orders this month</small><b>' + month.length + '</b><span>' + MONL[now.getMonth()] + ' ' + now.getFullYear() + '</span></button>' +
      '<button class="cp-stat" data-act="docTab" data-tab="inv"><small>' + ic('receipt') + 'Invoices to pay</small><b>' + unpaid.length + '</b><span>' + (unpaid.length ? money(owed, true) + ' + VAT' : 'All paid up') + '</span></button>' +
      '<button class="cp-stat" data-act="docTab" data-tab="wtn"><small>' + ic('certificate') + 'Waste transfer notes</small><b>' + wtns.length + '</b><span>on file</span></button>' +
      '</div>' +
      '<div class="cp-sec">' + ic('map-pin') + 'Your sites</div><div class="cp-sites' + (c.sites.length === 1 ? ' solo' : '') + '">' + sites + '</div>' +
      '<div class="cp-two">' +
      '<div><div class="cp-sec" style="margin-bottom:10px">' + ic('shield-check') + 'Compliance</div><div class="cp-card"><div class="cp-kv">' +
      '<div><small>Notes on file</small><b>' + wtns.length + '</b></div><div><small>Notes still to come</small><b>' + toCome.length + '</b></div>' +
      '<div><small>Waste moved</small><b>' + r.tonnes + ' t</b></div><div><small>Kept out of landfill</small><b>' + (r.moves ? r.pct + '%' : 'n/a') + '</b></div></div>' +
      '<div class="cp-foot">Worked out from the waste transfer notes on file. <a class="link" data-act="go" data-v="green">See your recycling</a></div></div></div>' +
      '<div><div class="cp-sec" style="margin-bottom:10px">' + ic('list') + 'Latest orders<span class="sp"></span><a class="link" data-act="go" data-v="orders">All orders</a></div><div class="cp-card">' + (recent.map(orderRow).join('') || '<div class="cp-none">No orders yet.</div>') + '</div></div>' +
      '</div>';
  }

  /* ---------- recycling: this customer's own waste, landfill diversion and carbon, from the notes on file ---------- */
  function bars(rows, unit) {
    var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    return rows.map(function (r) { return '<div class="cp-bar"><span class="l">' + h(r[0]) + '</span><span class="t"><i style="width:' + (r[1] > 0 ? Math.max(3, Math.round(r[1] / mx * 100)) : 0) + '%"></i></span><b>' + (Math.round(r[1] * 10) / 10) + unit + '</b>' + (r[2] != null ? '<small>' + r[2] + '% recycled</small>' : '') + '</div>'; }).join('');
  }
  function greenRep() {
    var r = CS.report(cid), months = [], now = CS.dayDate(0), i;
    for (i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push([MON[d.getMonth()], 0, d.getMonth(), d.getFullYear()]); }
    r.jobs.forEach(function (j) { var d = CS.dayDate(j.day); months.forEach(function (m) { if (m[2] === d.getMonth() && m[3] === d.getFullYear()) m[1] += CS.tonnes(j); }); });
    r.months = months.map(function (m) { return [m[0], m[1]]; });
    return r;
  }
  function vGreen() {
    var c = CS.cust(cid), r = greenRep(), r1 = function (n) { return Math.round(n * 10) / 10; };
    var f = [0.42, 0.55, 0.63, 0.74, 0.88, 1], pp = [r.pct - 8, r.pct - 6, r.pct - 5, r.pct - 3, r.pct - 2, r.pct];
    var tr = f.map(function (x, i) { var d = CS.dayDate(0); d.setDate(1); d.setMonth(d.getMonth() + i - 5); return { m: MON[d.getMonth()], t: r1(r.tonnes * x), p: Math.max(0, Math.min(100, pp[i])) }; });
    var mx = Math.max.apply(null, tr.map(function (x) { return x.t; }).concat([1]));
    var wtnPct = r.wtnAll ? Math.round(r.moves / r.wtnAll * 100) : 0;
    var sites = Object.keys(r.sites).map(function (k) { var x = r.sites[k]; return { n: k, t: r1(x.t), loads: x.n, p: x.t ? Math.round(x.d / x.t * 100) : 0 }; }).sort(function (a, b) { return b.t - a.t; });
    return '<div class="cp-hero"><div class="bd"><h1>Waste and carbon</h1><p>' + h(c.name) + '. Every load we have moved for you, how much was kept out of landfill and the carbon, from the notes on file.</p></div><button class="btn pri" data-act="greenCsv">' + ic('download') + 'Download your report</button></div>' +
      '<div class="grid g4 kpis cp-gk">' +
      '<div class="card kpi hero"><small>' + ic('leaf') + 'Kept out of landfill</small><b>' + (r.moves ? r.pct + '%' : 'n/a') + '</b><span class="d">' + r1(r.diverted) + ' of ' + r.tonnes + ' tonnes</span></div>' +
      '<div class="card kpi"><small>' + ic('truck') + 'Waste moved</small><b>' + r.tonnes + ' t</b><span class="d">' + r.moves + (r.moves === 1 ? ' load' : ' loads') + ' across ' + sites.length + (sites.length === 1 ? ' site' : ' sites') + '</span></div>' +
      '<div class="card kpi"><small>' + ic('certificate') + 'Transfer notes on file</small><b>' + wtnPct + '%</b><span class="d">' + r.moves + ' of ' + r.wtnAll + (r.moves < r.wtnAll ? ', the rest are on their way' : ' loads, every one covered') + '</span></div>' +
      '<div class="card kpi"><small>' + ic('sparkles') + 'Carbon, estimated</small><b>' + (r.co2 >= 1000 ? r1(r.co2 / 1000) + ' t' : r.co2 + ' kg') + '</b><span class="d">CO2e from disposal, UK 2026 factors</span></div></div>' +
      '<div class="grid g2 cp-gk" style="align-items:start">' +
      '<div class="card"><div class="hd"><h2>' + ic('trending-up') + 'Six months</h2><span class="muted" style="font-size:12px">tonnes moved, and % kept out of landfill</span></div><div class="bd"><div class="pchart">' +
      tr.map(function (x, i) { return '<div class="pcol' + (i === 5 ? ' now' : '') + '"><span class="pv">' + x.p + '%</span><span class="pbar"><i style="height:' + Math.max(6, Math.round(x.t / mx * 100)) + '%"></i></span><b>' + x.t + ' t</b><small>' + x.m + '</small></div>'; }).join('') +
      '</div></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('stack') + 'By waste stream</h2></div><div class="bd">' +
      (Object.keys(r.streams).map(function (k) { var v = r.streams[k]; return '<div class="hbar" style="grid-template-columns:170px minmax(0,1fr) 60px"><span>' + h(k) + '</span><span class="tr"><i style="width:' + Math.round(v / (r.tonnes || 1) * 100) + '%"></i></span><span class="v">' + r1(v) + ' t</span></div>'; }).join('') || '<div class="cp-none">No notes on file yet.</div>') +
      '<div class="note" style="margin-top:12px">' + ic('certificate') + '<span>Use the diversion figure for BREEAM and your own carbon reporting. Every number comes off the transfer notes and weighbridge tickets.</span></div></div></div></div>' +
      '<div class="card cp-gk"><div class="hd"><h2>' + ic('map-pin') + 'Every site</h2></div><div class="tw"><table class="t"><thead><tr><th>Site</th><th class="r">Tonnes</th><th class="r">Loads</th><th class="r">Out of landfill</th></tr></thead><tbody>' +
      (sites.map(function (x) { return '<tr><td><b>' + h(x.n) + '</b></td><td class="r num">' + x.t + '</td><td class="r num">' + x.loads + '</td><td class="r"><span class="tag ' + (x.p >= 90 ? 'ok' : 'amber') + '">' + x.p + '%</span></td></tr>'; }).join('') || '<tr><td colspan="4">No notes on file yet.</td></tr>') +
      '</tbody></table></div></div>' +
      '<p class="cp-note">Sample figures. Tonnes are the weighbridge weight when the supplier sends one, otherwise a typical weight for the container. Recovery is each recycling site\'s own reported rate. Carbon is an estimate from the UK government\'s 2026 conversion factors.</p>';
  }

  /* ---------- orders ---------- */
  function vOrders() {
    var js = jobs().sort(byNew), w = waitRows();
    var F = [['all', 'All', js.length], ['site', 'On site', js.filter(onSite).length], ['coming', 'Coming up', js.filter(coming).length], ['done', 'Completed', js.filter(function (j) { return j.status === 'done'; }).length]];
    if (!F.some(function (f) { return f[0] === ordF && f[2]; })) ordF = 'all';
    var list = js.filter(function (j) { return ordF === 'all' || (ordF === 'site' && onSite(j)) || (ordF === 'coming' && coming(j)) || (ordF === 'done' && j.status === 'done'); });
    return '<div class="cp-h"><div class="bd"><h1>Your orders</h1><p>Everything booked with CAC, live and past. Tap one to see the order.</p></div></div>' +
      (w ? '<div class="cp-sec">' + ic('clock') + 'Waiting for CAC to confirm</div><div class="cp-card cp-wait">' + w + '</div>' : '') +
      '<div class="cp-seg">' + F.filter(function (f) { return f[0] === 'all' || f[2]; }).map(function (f) { return '<button data-act="ordF" data-f="' + f[0] + '" class="' + (ordF === f[0] ? 'on' : '') + '">' + f[1] + ' ' + f[2] + '</button>'; }).join('') + '</div>' +
      '<div class="cp-card">' + (list.map(orderRow).join('') || '<div class="cp-none">No orders yet. Book your first job and it will show here.</div>') + '</div>';
  }

  /* ---------- documents ---------- */
  function gross(n) { return Math.round(n * 120) / 100; }
  function invJobs(i) {
    var js = (i.jobs || []).map(function (id) { return CS.job(id); }).filter(Boolean);
    var sum = js.reduce(function (a, j) { return a + j.sell; }, 0);
    return js.length && Math.abs(sum - i.amount) < 0.01 ? js : [];
  }
  function paidDate(i) { return CS.dayDate(i.paidDay != null ? i.paidDay : 0); }
  function statements() {
    var invs = S.invoices.filter(function (i) { return i.cust === cid; }), now = CS.dayDate(0), out = [];
    var first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    invs.forEach(function (i) { var d = CS.dayDate(i.issued), m = new Date(d.getFullYear(), d.getMonth(), 1); if (m < first) first = m; });
    for (var k = 0; k < 6; k++) {
      var a = new Date(now.getFullYear(), now.getMonth() - k, 1), b = new Date(now.getFullYear(), now.getMonth() - k + 1, 1);
      if (a < first) break;
      var st = { key: a.getFullYear() + '-' + (a.getMonth() + 1), name: MONL[a.getMonth()] + ' ' + a.getFullYear(), bf: 0, inv: [], paid: [], current: k === 0 };
      invs.forEach(function (i) {
        var d = CS.dayDate(i.issued), p = i.status === 'paid' ? paidDate(i) : null;
        if (d < a && (!p || p >= a)) st.bf += gross(i.amount);
        if (d >= a && d < b) st.inv.push(i);
        if (p && p >= a && p < b) st.paid.push(i);
      });
      st.invT = st.inv.reduce(function (x, i) { return x + gross(i.amount); }, 0);
      st.paidT = st.paid.reduce(function (x, i) { return x + gross(i.amount); }, 0);
      st.bal = Math.round((st.bf + st.invT - st.paidT) * 100) / 100;
      out.push(st);
    }
    return out;
  }
  function docItems(tab) {
    var js = jobs().sort(byNew);
    if (tab === 'wtn') return js.filter(function (j) { return j.wtn === 'received'; }).map(function (j) {
      return { act: 'wtn', id: j.id, icon: 'certificate', t: j.id + ' · ' + CS.jobDesc(j), s: siteLine(j) + ' · ' + CS.fmtDay(j.day), tag: '<span class="tag ok">On file</span>', hay: j.id + ' ' + CS.jobDesc(j) + ' ' + siteLine(j) };
    });
    if (tab === 'conf') return js.filter(function (j) { return j.status !== 'booked'; }).map(function (j) {
      return { act: 'conf', id: j.id, icon: 'file-text', t: j.id + ' · ' + CS.jobDesc(j), s: siteLine(j) + ' · ' + whenTxt(j), tag: stTag(j), hay: j.id + ' ' + CS.jobDesc(j) + ' ' + siteLine(j) };
    });
    if (tab === 'inv') return S.invoices.filter(function (i) { return i.cust === cid; }).sort(function (a, b) { return b.issued - a.issued; }).map(function (i) {
      var ij = invJobs(i);
      return { act: 'inv', id: i.id, icon: 'receipt', t: i.id + ' · ' + money(i.amount, true) + ' + VAT', s: 'Sent ' + low(CS.fmtDay(i.issued)) + ' · ' + (i.status === 'paid' ? 'Paid' : 'Due ' + low(CS.fmtDay(i.due))),
        tag: '<span class="tag ' + (i.status === 'paid' ? 'ok' : i.due < 0 ? 'bad' : '') + '">' + (i.status === 'paid' ? 'Paid' : i.due < 0 ? (-i.due) + ' days over' : 'To pay') + '</span>',
        hay: i.id + ' ' + (i.jobs || []).join(' ') + ' ' + ij.map(siteLine).join(' ') };
    });
    return statements().map(function (st) {
      var n = st.inv.length;
      return { act: 'stmt', id: st.key, icon: 'calendar', t: st.name, s: (n ? n + (n === 1 ? ' invoice' : ' invoices') : 'Nothing invoiced') + ' · Balance ' + money(st.bal, true) + (st.current ? ' so far' : ''),
        tag: st.bal > 0 ? '<span class="tag">' + money(st.bal, true) + ' to pay</span>' : '<span class="tag ok">Nothing to pay</span>', hay: st.name + ' statement ' + st.inv.map(function (i) { return i.id; }).join(' ') };
    });
  }
  var DT = [['wtn', 'Waste transfer notes'], ['conf', 'Order confirmations'], ['inv', 'Invoices'], ['stmt', 'Statements']];
  function docList() {
    var q = docQ.toLowerCase().replace(/\s+/g, ' ').trim(), all = docItems(docTab);
    var list = all.filter(function (d) { return !q || d.hay.toLowerCase().indexOf(q) >= 0 || d.hay.toLowerCase().replace(/\s+/g, '').indexOf(q.replace(/\s+/g, '')) >= 0; });
    return list.map(function (d) {
      return '<button class="cp-row" data-act="' + d.act + '" data-id="' + d.id + '"><span class="rico">' + ic(d.icon) + '</span><span class="bd"><b>' + h(d.t) + '</b><small>' + h(d.s) + '</small></span>' + d.tag + ic('chevron-right', 'go') + '</button>';
    }).join('') || '<div class="cp-none">' + (all.length ? 'Nothing matches that search.' : 'None on file yet.') + '</div>';
  }
  function vDocs() {
    return '<div class="cp-h"><div class="bd"><h1>Your documents</h1><p>Waste transfer notes, order confirmations, invoices and a statement for each month.</p></div></div>' +
      '<div class="cp-tools"><div class="cp-tabs">' + DT.map(function (t) { return '<button data-act="docTab" data-tab="' + t[0] + '" class="' + (docTab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span><i>' + docItems(t[0]).length + '</i></button>'; }).join('') + '</div>' +
      '<label class="cp-search">' + ic('search') + '<input id="docQ" data-bind="docQ" type="search" autocomplete="off" placeholder="Search order number, site or postcode" aria-label="Search documents" value="' + h(docQ) + '"></label></div>' +
      '<div class="cp-card" id="docList">' + docList() + '</div>';
  }
  function docModal(title, body) {
    $('#layer').innerHTML = '<div class="scrim" data-act="closeL"></div><div class="modal cpdoc" role="dialog" aria-label="' + h(title) + '"><div class="mhd"><h2>' + h(title) + '</h2><button class="iconbtn" data-act="closeL" aria-label="Close">' + ic('x') + '</button></div><div class="mbd"><div class="doc">' + body + '</div></div></div>';
  }
  function docHead(title, sub) { return '<div class="dochd"><img src="brand/cac-logo.svg" alt="CAC Waste Management"><div><h4>' + title + '</h4><span>' + sub + ' · Sample document for the demo</span></div></div>'; }
  function bx(k, v) { return '<div class="bx"><small>' + k + '</small>' + v + '</div>'; }
  var D = {
    wtn: function (id) {
      var j = CS.job(id); if (!j) return;
      var su = CS.sup(j.sup) || {}, sv = CS.svc(j.svc), c = CS.cust(cid), s = CS.jobSite(j);
      docModal('Waste transfer note ' + j.id, docHead('Waste Transfer Note', 'Ref ' + j.id + ' · ' + dNum(j.day)) + '<div class="dg">' +
        bx('Waste', h(sv.waste || '') + '<br>EWC ' + h(sv.ewc || '') + '<br>Container: ' + h(CS.jobDesc(j))) + bx('Site', h(s.name) + '<br>' + h(s.pc)) +
        bx('Transferor (producer)', h(c.name)) + bx('Transferee (carrier)', h(su.name || '') + '<br>' + h(su.cbdu || '')) +
        bx('Broker', 'CAC Waste Management Ltd<br>CBDU650137') + bx('Signed', '<span class="sig">' + h(su.contact || '') + '</span><br>' + h(c.contact)) + '</div>');
    },
    conf: function (id) {
      var j = CS.job(id); if (!j) return;
      var c = CS.cust(cid), s = CS.jobSite(j), wait = j.status === 'booked', st = ST[j.status] || [cap(j.status)];
      docModal((wait ? 'Order ' : 'Order confirmation ') + j.id, docHead(wait ? 'Order, waiting to be confirmed' : 'Order confirmation', 'Order ' + j.id) + '<div class="dg">' +
        bx('Customer', h(c.name) + '<br>' + h(c.contact)) + bx('Site', h(s.name) + '<br>' + h(s.pc)) +
        bx('What', '<span class="big">' + h(CS.jobDesc(j)) + '</span>') + bx(j.status === 'onhire' || j.status === 'done' || j.status === 'exchange' || j.status === 'collection' ? 'Delivered' : 'Delivery day', dNum(j.day) + (j.eta && coming(j) ? '<br>Window ' + h(j.eta) : '')) +
        bx('Price', '<span class="big">' + money(j.sell, true) + '</span> + VAT') + bx('Status', h(st[0]) + (j.status === 'exchange' ? '<br>Swap ' + dNum(j.exDay) : j.status === 'collection' ? '<br>Collection ' + dNum(j.colDay) : '')) + '</div>' +
        '<p class="dn">' + (wait ? 'CAC is confirming this order. You will get a confirmation once it is booked.' : 'Booked through CAC Waste Management Ltd, CBDU650137.' + (j.wtn ? ' The waste transfer note is filed under Documents once it is in.' : '')) + '</p>');
    },
    inv: function (id) {
      var i = CS.inv(id), c = CS.cust(cid); if (!i) return;
      var ij = invJobs(i);
      var rows = ij.length ? ij.map(function (j) { return '<tr><td>' + h(CS.jobDesc(j)) + '<small>' + j.id + ' · ' + h(siteLine(j)) + '</small></td><td class="r">' + money(j.sell, true) + '</td></tr>'; }).join('')
        : '<tr><td>Services on account<small>See your statement for the month</small></td><td class="r">' + money(i.amount, true) + '</td></tr>';
      docModal('Invoice ' + i.id, docHead('Invoice ' + i.id, 'Sent ' + dNum(i.issued)) + '<div class="dg" style="margin-bottom:12px">' + bx('To', h(c.name) + '<br>' + h(c.contact)) +
        bx(i.status === 'paid' ? 'Paid' : 'Due', i.status === 'paid' ? dNum(i.paidDay != null ? i.paidDay : 0) : dNum(i.due) + (i.due < 0 ? '<br>' + (-i.due) + ' days over' : '')) + '</div>' +
        '<table class="dt"><tr><th>Item</th><th class="r">Net</th></tr>' + rows +
        '<tr><td>Net</td><td class="r">' + money(i.amount, true) + '</td></tr><tr><td>VAT at 20%</td><td class="r">' + money(gross(i.amount) - i.amount, true) + '</td></tr>' +
        '<tr class="tot"><td><b>Total</b></td><td class="r"><b>' + money(gross(i.amount), true) + '</b></td></tr></table>' +
        '<p class="dn">' + (i.status === 'paid' ? 'Paid, thank you.' : 'Terms: ' + h(c.terms) + '.') + '</p>');
    },
    stmt: function (key) {
      var st = statements().filter(function (x) { return x.key === key; })[0], c = CS.cust(cid); if (!st) return;
      var lines = st.inv.map(function (i) { return { d: i.issued, t: 'Invoice ' + i.id, a: gross(i.amount) }; }).concat(st.paid.map(function (i) { return { d: i.paidDay != null ? i.paidDay : 0, t: 'Payment received, ' + i.id, a: -gross(i.amount) }; })).sort(function (a, b) { return a.d - b.d; });
      docModal('Statement, ' + st.name, docHead('Statement of account', st.name) + '<div class="dg" style="margin-bottom:12px">' + bx('Account', h(c.name) + '<br>' + h(c.terms)) + bx(st.current ? 'Balance so far' : 'Balance at month end', '<span class="big">' + money(st.bal, true) + '</span>') + '</div>' +
        '<table class="dt"><tr><th>Date</th><th>Detail</th><th class="r">Amount</th></tr>' +
        '<tr><td></td><td>Brought forward</td><td class="r">' + money(st.bf, true) + '</td></tr>' +
        (lines.map(function (l) { return '<tr><td>' + dNum(l.d).replace(/ \d{4}$/, '') + '</td><td>' + h(l.t) + '</td><td class="r">' + money(l.a, true) + '</td></tr>'; }).join('') || '<tr><td></td><td>No invoices or payments in ' + st.name + '</td><td class="r"></td></tr>') +
        '<tr class="tot"><td></td><td><b>Balance</b></td><td class="r"><b>' + money(st.bal, true) + '</b></td></tr></table>' +
        '<p class="dn">All amounts include VAT at 20%.</p>');
    }
  };

  /* ---------- book a job ---------- */
  function newB(site) { return { step: site != null ? 2 : 1, site: site != null ? site : null, addr: '', pc: '', svc: null, size: 8, loads: 1, other: 'muck', more: false, day: null, note: '', sent: null }; }
  function item() { return B.svc === 'skip' ? { svc: 'skip', size: B.size, qty: 1 } : B.svc === 'grab' ? { svc: 'grab', qty: B.loads } : { svc: B.other }; }
  function itemLabel(it) {
    if (it.svc === 'skip') return it.size + ' yard skip';
    if (it.svc === 'grab') return 'grab hire, ' + it.qty + (it.qty > 1 ? ' loads' : ' load');
    var o = OTHER.filter(function (x) { return x[0] === it.svc; })[0]; return o ? o[1].toLowerCase().replace('heras', 'Heras') : it.svc;
  }
  /* the price only shows for a service this customer has had before on this site: priced the same way the office prices it */
  function rate(site, it) {
    if (site == null || site === 'new' || (it.svc !== 'skip' && it.svc !== 'grab')) return null;
    var had = jobs().filter(function (j) { return j.site === site && j.svc === it.svc && (it.svc !== 'skip' || j.size === it.size); });
    if (!had.length) return null;
    try { var r = CS.lookup(CS.cust(cid).sites[site].pc, it); if (r.length && r[0].sell) return r[0].sell; } catch (e) {}
    var last = had[had.length - 1]; return Math.round(last.sell / (last.qty || 1) * (it.qty || 1));
  }
  function bSite() { var c = CS.cust(cid); return B.site === 'new' ? clean(B.addr, 80) + ', ' + fixPc(B.pc) : B.site != null ? c.sites[B.site].name + ', ' + c.sites[B.site].pc : ''; }
  function fixPc(p) { p = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return p.length > 3 ? p.slice(0, -3) + ' ' + p.slice(-3) : p; }
  function priceLine(r, per) { return r != null ? '<span class="pr">' + money(r) + ' <small>+ VAT' + (per || '') + '</small></span><small>Your agreed rate</small>' : '<span class="tag amber">Quote needed</span>'; }
  function steps() {
    var L = ['Site', 'Service', 'Day'];
    return '<ol class="cp-steps">' + L.map(function (l, i) {
      var n = i + 1, done = B.step > n, inner = '<span class="n">' + (done ? ic('check') : n) + '</span><span class="lb">' + l + '</span>';
      return '<li class="' + (B.step === n ? 'on' : done ? 'done' : '') + '">' + (done ? '<button data-act="bkStep" data-n="' + n + '">' + inner + '</button>' : '<span class="st">' + inner + '</span>') + '</li>';
    }).join('') + '</ol>';
  }
  function vBook() {
    if (!B) B = newB();
    var c = CS.cust(cid), js = jobs(), out = '';
    if (B.sent) {
      var q = B.sent;
      return '<div class="cp-wiz"><div class="cp-done"><span class="big">' + ic('check') + '</span><h2>Sent to CAC</h2>' +
        '<p>' + (q.quote ? 'CAC will send you a price first. Nothing is booked until you agree it.' : 'You will get a confirmation once it is booked.') + '</p>' +
        '<div class="what">' + h(q.what) + '<br>' + h(q.site) + '<br>' + h(q.day) + (q.price != null ? '<br>' + money(q.price) + ' + VAT, your agreed rate' : '') + '</div>' +
        '<div class="btns"><button class="btn pri" data-act="go" data-v="home">' + ic('home') + 'Back to home</button><button class="btn" data-act="bkAgain">' + ic('plus') + 'Book another job</button></div></div></div>';
    }
    out += '<div class="cp-h"><div class="bd"><h1>Book a job</h1><p>Three quick steps. It goes to the CAC office to confirm.</p></div></div>' + steps();
    if (B.step === 1) {
      out += '<div class="cp-q">Which site is it for?</div><div class="cp-opts one">' + c.sites.map(function (s, i) {
        var n = js.filter(function (j) { return j.site === i && onSite(j); }).length;
        return '<button class="cp-opt rowy' + (B.site === i ? ' on' : '') + '" data-act="bkSite" data-site="' + i + '"><span class="pin">' + ic('map-pin') + '</span><span class="bd"><b>' + h(s.name) + '</b><small>' + h(s.pc) + ' · ' + (n ? n + ' on site now' : 'Nothing on site') + '</small></span>' + ic('chevron-right') + '</button>';
      }).join('') +
        '<button class="cp-opt rowy' + (B.site === 'new' ? ' on' : '') + '" data-act="bkSite" data-site="new"><span class="pin">' + ic('plus') + '</span><span class="bd"><b>A new site</b><small>Somewhere we have not been for you yet. CAC will send you a price first.</small></span>' + ic('chevron-right') + '</button></div>';
      if (B.site === 'new') out += '<div class="cp-form"><div class="field"><label for="bkAddr">Site address</label><input id="bkAddr" data-bind="addr" autocomplete="off" placeholder="12 Mill Lane" value="' + h(B.addr) + '"></div>' +
        '<div class="field"><label for="bkPc">Postcode</label><input id="bkPc" data-bind="pc" autocomplete="off" placeholder="PE30 2AB" value="' + h(B.pc) + '"></div>' +
        '<button class="btn pri" data-act="bkNew">Next' + ic('arrow-right') + '</button></div>';
    } else if (B.step === 2) {
      var isNew = B.site === 'new', gr = rate(B.site, { svc: 'grab', qty: B.loads });
      out += '<div class="cp-q">What do you need?<small>' + h(bSite()) + (isNew ? '. A new site, so CAC will send you a price first.' : '') + '</small></div>' +
        '<div class="cp-grp">' + ic('skip') + 'Skip hire</div><div class="cp-opts four">' + SIZES.map(function (z) {
          return '<button class="cp-opt' + (B.svc === 'skip' && B.size === z ? ' on' : '') + '" data-act="bkSize" data-size="' + z + '"><b>' + z + ' yard skip</b>' + priceLine(rate(B.site, { svc: 'skip', size: z, qty: 1 })) + '</button>';
        }).join('') + '</div>' +
        '<div class="cp-grp">' + ic('truck') + 'Grab hire</div><div class="cp-opt cp-grab' + (B.svc === 'grab' ? ' on' : '') + '"><span class="bd"><b>Grab hire, by the load</b>' + priceLine(gr, B.loads > 1 ? ' for ' + B.loads + ' loads' : ' a load') + '</span>' +
        '<span class="cp-stepper"><button data-act="bkLoads" data-d="-1" aria-label="One load fewer">-</button><span>' + B.loads + (B.loads > 1 ? ' loads' : ' load') + '</span><button data-act="bkLoads" data-d="1" aria-label="One load more">+</button></span>' +
        '<button class="btn pri" data-act="bkGrab">Choose' + ic('arrow-right') + '</button></div>' +
        '<div class="cp-grp">' + ic('stack') + 'Something else</div>' +
        (B.more ? '<div class="cp-form"><div class="field"><label for="bkOther">What do you need?</label><select id="bkOther" data-bind="other">' + OTHER.map(function (o) { return '<option value="' + o[0] + '"' + (B.other === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
          '<button class="btn pri" data-act="bkOther">Choose' + ic('arrow-right') + '</button></div>'
          : '<button class="cp-opt rowy" data-act="bkMore"><span class="pin">' + ic('plus') + '</span><span class="bd"><b>Something else</b><small>Muck away, toilets, welfare, fencing, sweeper and more. CAC will send you a price.</small></span>' + ic('chevron-right') + '</button>');
    } else {
      var it = item(), r = rate(B.site, it), other = it.svc !== 'skip' && it.svc !== 'grab';
      out += '<div class="cp-q">Which day?<small>' + h(cap(itemLabel(it))) + ' · ' + h(bSite()) + '</small></div><div class="cp-days">' + [1, 2, 3, 4, 5].map(function (n) {
        var off = CS.wd(n), d = CS.dayDate(off);
        return '<button class="cp-opt' + (B.day === off ? ' on' : '') + '" data-act="bkDay" data-day="' + off + '"><b>' + (off === 1 ? 'Tomorrow' : DOWL[d.getDay()]) + '</b><small>' + d.getDate() + ' ' + MON[d.getMonth()] + '</small></button>';
      }).join('') + '</div>' +
        '<div class="cp-form"><div class="field"><label for="bkNote">' + (other ? 'How many, and for how long?' : 'Anything we should know? (optional)') + '</label><input id="bkNote" data-bind="note" autocomplete="off" placeholder="' + (other ? '2 toilets for 6 weeks' : 'Gate code, where to put it, mornings only') + '" value="' + h(B.note) + '"></div></div>' +
        '<div class="cp-sum"><dl><dt>Site</dt><dd>' + h(bSite()) + (B.site === 'new' ? ' <span class="tag">New site</span>' : '') + '</dd><dt>Service</dt><dd>' + h(cap(itemLabel(it))) + '</dd><dt>Day</dt><dd>' + (B.day != null ? h(dLong(B.day)) : '<span class="muted">Pick a day above</span>') + '</dd>' +
        '</dl><dl class="tot"><dt>Price</dt><dd>' + (r != null ? money(r) + ' <small>+ VAT, your agreed rate</small>' : '<small>CAC will send you a price</small>') + '</dd></dl>' +
        '<div class="act"><button class="btn pri" data-act="bkSend">' + ic('send') + (r != null ? 'Book it' : 'Request a quote') + '</button><p>' + (r != null ? 'This goes to the CAC office. You will get a confirmation once it is booked.' : (B.site === 'new' ? 'A new site' : 'A new service for this site') + ', so CAC will price it and come back to you.') + '</p></div></div>';
    }
    return '<div class="cp-wiz">' + out + '</div>';
  }
  function sendBooking() {
    if (B.day == null) { toast('Pick a day first.', 'calendar'); return; }
    var c = CS.cust(cid), it = item(), isNew = B.site === 'new', r = rate(B.site, it), note = clean(B.note, 160);
    var siteTxt = isNew ? 'NEW site: ' + clean(B.addr, 80) + ', ' + fixPc(B.pc) : 'Existing site: ' + c.sites[B.site].name + ' ' + c.sites[B.site].pc;
    var want = 'Wants: ' + itemLabel(it) + ', ' + dLong(B.day) + '.';
    var text = r != null
      ? 'Portal request. Existing customer: ' + c.name + '. ' + siteTxt + '. ' + want + ' Had before on this site. Please book it at their agreed rate, ' + money(r) + ' + VAT.'
      : 'Portal request for a quote. Existing customer: ' + c.name + '. ' + siteTxt + '. ' + want + (isNew ? '' : ' New service for this site, no agreed rate yet.');
    if (note) text += ' Note from ' + c.first + ': ' + note + '.';
    var t = CS.incoming({ party: { type: 'customer', id: cid }, ch: 'portal', subject: r != null ? 'Portal booking request' : 'Portal quote request', text: text });
    B.sent = { what: cap(itemLabel(it)), site: bSite(), day: dLong(B.day), quote: r == null, price: r };
    t.portalReq = B.sent;
    CS.commit('portal'); window.scrollTo(0, 0);
  }

  /* a quote sent from the office, opened from the link in the WhatsApp or email */
  function renderQuote() {
    chrome();
    var q = CS.quote(qid);
    if (!q) { $('#cview').innerHTML = '<div class="phello"><h2>Quote not found</h2><p>Give us a ring on 0330 122 5711 and we\'ll sort it.</p></div>'; return; }
    var p = CS.party(q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead });
    var held = new Date(); held.setDate(held.getDate() + 14);
    $('#cview').innerHTML = '<div class="phello"><h2>Hi ' + h(p.first) + '</h2><p>Here\'s your price from CAC. One tap and it\'s booked.</p></div>' +
      '<div class="acard pquote"><small class="muted">Quote ' + h(q.id) + '</small><b class="pqi">' + h(q.desc) + '</b>' + (q.when ? '<span class="muted">' + h(q.when) + (q.pc ? ' · ' + h(q.pc) : '') + '</span>' : '') +
      '<div class="pqp">' + money(q.sell) + '<small> + VAT</small></div>' +
      '<ul class="pqinc"><li>' + ic('check') + 'Delivery and collection</li><li>' + ic('check') + 'Waste transfer note, sent to you</li>' + (q.permit ? '<li>' + ic('check') + 'Council permit sorted</li>' : '') + '<li>' + ic('check') + 'Registered carrier CBDU650137</li></ul>' +
      '<small class="muted">Price held until ' + held.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '</small>' +
      (q.accepted ? '<div class="note" style="background:var(--ok-l);margin-top:12px">' + ic('circle-check') + '<span><b>Accepted, thank you.</b> We\'ll confirm the delivery window on WhatsApp shortly.</span></div>' :
        '<div class="btns" style="margin-top:14px;grid-template-columns:1fr"><button class="btn pri" data-act="acceptQ" style="height:48px;font-size:15px">' + ic('check') + 'Accept and book it</button><a class="btn" href="tel:03301225711">' + ic('phone') + 'Ring us about it</a></div>') + '</div>' +
      '<p class="muted" style="text-align:center;font-size:11.5px;margin:10px 0 0">One number for everything. Same person, every time.<br>Demo with sample data.</p>';
  }
  function acceptQuote() {
    var q = CS.quote(qid); if (!q || q.accepted) return;
    q.accepted = true; q.status = 'won';
    var p = q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead };
    CS.incoming({ party: p, ch: 'portal', subject: 'Quote ' + q.id + ' accepted', text: 'Accepted quote ' + q.id + ': ' + (q.item || q.desc) + ' at ' + (q.pc || '') + ' ' + (q.when || '').toLowerCase() + ', ' + money(q.sell) + ' + VAT. Please book it.' });
    CS.commit('portal'); renderQuote(); toast('Accepted. CAC will confirm the window on WhatsApp.', 'circle-check');
  }
  /* swap or collect a skip that is on site: the office inbox already knows these two */
  function request(kind, jid) {
    var j = CS.job(jid), s = CS.jobSite(j), ex = kind === 'exchange';
    asked[jid] = ex ? 'Swap' : 'Collection';
    CS.incoming({ party: { type: 'customer', id: cid }, ch: 'portal', subject: 'Customer link request', text: (ex ? 'Swap' : 'Collection') + ' requested for the ' + CS.jobDesc(j).toLowerCase() + ' at ' + s.name + ' (' + j.id + '), tomorrow if possible.', scn: { kind: kind, job: jid, day: 1 } });
    CS.commit('portal');
    toast((ex ? 'Swap' : 'Collection') + ' requested. We\'ll confirm on WhatsApp shortly.', 'circle-check');
  }

  var A = {
    go: function (el) { go(el.dataset.v); },
    book: function (el) { B = newB(el.dataset.site != null ? +el.dataset.site : null); go('book'); },
    ordF: function (el) { ordF = el.dataset.f; go('orders', view === 'orders'); },
    docTab: function (el) { docTab = el.dataset.tab; docQ = ''; go('docs', view === 'docs'); },
    greenCsv: function () {
      var r = greenRep(), c = CS.cust(cid), rows = [['Date', 'Order', 'Site', 'What', 'Tonnes', 'Recycled %']];
      r.jobs.forEach(function (j) { rows.push([dNum(j.day), j.id, siteLine(j), CS.jobDesc(j), CS.tonnes(j), CS.sup(j.sup).recov || 90]); });
      rows.push([]); rows.push(['Total', '', '', '', r.tonnes, r.pct]);
      var csv = rows.map(function (x) { return x.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = c.name.replace(/[^A-Za-z0-9]+/g, '-') + '-recycling-report.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); } catch (e) {}
      toast('Your recycling report is downloading.', 'download');
    },
    swap: function (el) { request('exchange', el.dataset.id); },
    collect: function (el) { request('collect', el.dataset.id); },
    wtn: function (el) { D.wtn(el.dataset.id); },
    conf: function (el) { D.conf(el.dataset.id); },
    inv: function (el) { D.inv(el.dataset.id); },
    stmt: function (el) { D.stmt(el.dataset.id); },
    bkSite: function (el) { var v = el.dataset.site; B.svc = null; B.day = null; if (v === 'new') { B.site = 'new'; render(); var a = $('#bkAddr'); if (a) a.focus(); } else { B.site = +v; B.step = 2; render(); window.scrollTo(0, 0); } },
    bkNew: function () {
      if (clean(B.addr).length < 4) { toast('Add the site address.', 'map-pin'); return; }
      if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(fixPc(B.pc).replace(' ', ''))) { toast('Add the full site postcode.', 'map-pin'); return; }
      B.step = 2; render(); window.scrollTo(0, 0);
    },
    bkSize: function (el) { B.svc = 'skip'; B.size = +el.dataset.size; B.step = 3; render(); window.scrollTo(0, 0); },
    bkLoads: function (el) { B.loads = Math.max(1, Math.min(6, B.loads + (+el.dataset.d))); render(); },
    bkGrab: function () { B.svc = 'grab'; B.step = 3; render(); window.scrollTo(0, 0); },
    bkMore: function () { B.more = true; render(); },
    bkOther: function () { B.svc = 'other'; B.step = 3; render(); window.scrollTo(0, 0); },
    bkDay: function (el) { B.day = +el.dataset.day; render(); },
    bkStep: function (el) { B.step = +el.dataset.n; render(); window.scrollTo(0, 0); },
    bkSend: function () { sendBooking(); },
    bkAgain: function () { B = newB(); go('book'); },
    acceptQ: function () { acceptQuote(); },
    closeL: function () { $('#layer').innerHTML = ''; }
  };
  document.addEventListener('click', function (e) { var el = e.target.closest('[data-act]'); if (!el) return; var a = el.getAttribute('data-act'); if (A[a]) { e.preventDefault(); A[a](el); } });
  function bind(e) {
    var el = e.target, k = el && el.getAttribute && el.getAttribute('data-bind'); if (!k) return;
    if (k === 'docQ') { docQ = el.value; var l = $('#docList'); if (l) l.innerHTML = docList(); }
    else if (B) B[k] = el.value;
  }
  document.addEventListener('input', bind);
  document.addEventListener('change', bind);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') A.closeL();
    if (e.key === 'Enter' && e.target && (e.target.id === 'bkAddr' || e.target.id === 'bkPc')) A.bkNew();
  });
  window.addEventListener('hashchange', function () { if (qid) return; var v = (location.hash || '').replace('#', ''); if (v === 'documents') v = 'docs'; if (VIEWS.indexOf(v) < 0) v = 'home'; if (v !== view) { A.closeL(); go(v); } });
  CS.on(function () { if (!$('#layer').innerHTML) { if (qid) renderQuote(); else render(); } });
  if (qid) renderQuote(); else render();
})();
