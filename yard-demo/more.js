/* Demo Skip & Grab demo, second layer: customers and credit, money found, skips to nudge, permits, the register check,
   rate changes, statements, site waste reports, the customer link and the morning briefing.
   Everything here sits inside an existing screen or behind one menu item, so the inbox stays the hero. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var X = window.DSGX = {}, H = null, known = null;
  function S() { return CS.S; }
  function first(n) { return String(n).split(' ')[0]; }

  /* ---------- fragments used by the existing screens ---------- */
  X.todayStrip = function () {
    var lk = CS.leakTotals(); if (!lk.n) return '';
    var types = CS.openLeaks().map(function (l) { return l.type.toLowerCase(); }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return '<button class="strip" data-act="go" data-v="money">' + ic('pound') + '<span><b>' + money(lk.recharge) + ' of extras not yet recharged</b> on ' + lk.n + ' jobs: ' + h(types.join(', ')) + '.</span><span class="link">Review' + ic('chevron-right') + '</span></button>';
  };
  X.todayNudge = function () {
    var n = CS.nudges().slice(0, 3); if (!n.length) return '';
    return '<div class="card"><div class="hd"><h2>' + ic('skip') + 'Worth a nudge</h2><button class="btn sm" data-act="go" data-v="chasing">See all</button></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' + n.map(function (x) {
      var c = CS.cust(x.j.cust);
      return '<div class="rowline"><div class="bd"><b>' + h(c.name) + ', ' + x.j.size + ' yard</b><small>' + h(x.why) + '</small></div><button class="btn sm" data-act="skipNudge" data-id="' + x.j.id + '">' + ic('whatsapp') + 'Ask ' + h(c.first) + '</button></div>';
    }).join('') + '</div></div>';
  };
  X.nudgeRows = function (list) {
    return list.map(function (x) {
      var c = CS.cust(x.j.cust), s = CS.jobSite(x.j);
      return '<div class="rowline"><span class="tag ' + (x.kind === 'long' ? 'bad' : 'amber') + '">' + ic('clock') + x.days + ' days</span><div class="bd"><b>' + h(c.name) + ', ' + x.j.size + ' yard at ' + h(s.name) + '</b><small>' + h(x.why) + '</small></div><button class="btn sm" data-act="skipNudge" data-id="' + x.j.id + '">' + ic('whatsapp') + 'Ask ' + h(c.first) + '</button></div>';
    }).join('');
  };
  X.rateAlert = function () {
    var rc = S().rateChange; if (!rc || rc.status !== 'new') return '';
    var su = CS.sup(rc.sup), qs = rc.quotes.map(CS.quote).filter(Boolean);
    var hit = qs.reduce(function (a, q) { return a + rc.up * (parseInt(q.desc, 10) || 1); }, 0);
    return '<div class="card alert" style="margin-bottom:16px"><div class="bd"><div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap"><span class="spark" style="background:var(--amber-l);color:var(--amber)">' + ic('alert') + '</span><div style="flex:1;min-width:240px"><b style="font-size:15px">' + h(su.name) + ' have put their skips up ' + money(rc.up) + ' from ' + CS.fmtDay(rc.fromDay) + '</b>' +
      '<p class="muted" style="margin:4px 0 0;font-size:13px">Read from ' + h(su.contact) + '\'s email. Jobs booked before that date keep the old cost. ' + qs.length + ' open quote' + (qs.length === 1 ? ' is' : 's are') + ' priced on the old rate (' + qs.map(function (q) { return q.id + ', ' + h(CS.cust(q.cust).name); }).join('; ') + '): ' + money(hit) + ' of margin gone if it books as it stands.</p></div>' +
      '<div class="row" style="flex-wrap:wrap"><button class="btn pri" data-act="rateApply" data-v="1">' + ic('check') + 'Update and reprice the quote</button><button class="btn" data-act="rateApply" data-v="0">Update, keep my price</button></div></div></div></div>';
  };
  X.moneyFound = function () {
    var open = CS.openLeaks(), lk = CS.leakTotals(), done = S().leaks.filter(function (l) { return l.status === 'recharged'; });
    var got = done.reduce(function (a, l) { return a + l.recharge; }, 0);
    var rows = open.map(function (l) {
      var j = CS.job(l.job), c = CS.cust(j.cust);
      return '<div class="rowline leak"><span class="tag amber">' + h(l.type) + '</span><div class="bd"><b>' + h(c.name) + ' · <a class="link" data-act="openJob" data-id="' + j.id + '">' + j.id + '</a></b><small>' + h(l.note) + '</small></div>' +
        '<span class="lk num"><small>cost you</small>' + money(l.cost) + '</span>' +
        (l.bill ? '<button class="btn sm pri" data-act="leakSort" data-id="' + l.bill + '">' + ic('sparkles') + 'Sort it</button>'
          : '<button class="btn sm pri" data-act="recharge" data-id="' + l.id + '">Recharge ' + money(l.recharge) + '</button><button class="btn sm ghost hide-sm" data-act="absorb" data-id="' + l.id + '">Absorb</button>') + '</div>';
    }).join('');
    return '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('search') + 'Money found <span class="muted" style="font-weight:600">extras nobody has recharged</span></h2>' +
      (open.length ? '<span class="tag bad hide-sm">' + money(lk.cost) + ' off your margin</span><button class="btn sm pri" data-act="rechargeAll">Recharge all</button>' : '') + '</div>' +
      '<div class="bd" style="padding-top:2px;padding-bottom:2px">' + (rows || '<div class="empty">' + ic('circle-check') + 'Every extra has been recharged or written off.' + (got ? ' ' + money(got) + ' recovered.' : '') + '</div>') + '</div>' +
      (open.length ? '<div class="cardfoot">Found by checking each supplier bill against the rate you agreed, and by counting days on hire.' + (got ? ' <b>' + money(got) + ' recovered so far.</b>' : '') + '</div>' : '') + '</div>';
  };
  X.permits = function () {
    var ps = S().permits;
    return '<div class="card"><div class="hd"><h2>' + ic('map-pin') + 'Skip permits</h2></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' + ps.map(function (p) {
      var j = CS.job(p.job); if (!j) return '';
      var c = CS.cust(j.cust), soon = p.to != null && p.to <= 7;
      return '<div class="rowline"><div class="bd"><b>' + p.job + ', ' + h(c.name) + '</b><small>' + h(p.council) + ' · ' + h(CS.jobSite(j).pc) + (p.to != null ? ' · runs out ' + CS.fmtDay(p.to) : '') + (p.asked ? ' · renewal asked' : '') + '</small></div>' +
        (p.status === 'applied' ? '<span class="tag amber">' + ic('clock') + 'Applied, waiting</span>' : (soon && !p.asked ? '<button class="btn sm" data-act="permitRenew" data-id="' + p.job + '">' + ic('refresh') + 'Renew or collect</button>' : '<span class="tag ok">' + ic('check') + 'Valid</span>')) + '</div>';
    }).join('') + '</div><div class="cardfoot">Every council has its own form, so this tracks the dates and reminds you and the supplier. It does not apply for the permit.</div></div>';
  };
  X.salesTag = function () {
    var m = S().jobs.filter(function (j) { return j.owner === 'sam'; }).reduce(function (a, j) { return a + j.sell - j.cost; }, 0);
    return '<span class="tag ok" style="margin-right:4px">' + money(m) + ' margin from ' + h(CS.bde()) + '\'s accounts</span>';
  };

  /* ---------- documents ---------- */
  function docHead(title, sub) {
    return '<div class="dochd"><img src="brand/logo.svg" alt="Demo Skip & Grab"><div><h4>' + title + '</h4><span>' + sub + '</span></div></div>';
  }
  X.invoiceDoc = function (i) {
    var c = CS.cust(i.cust), lines = [], sum = 0;
    i.jobs.forEach(function (id) { var j = CS.job(id); if (!j) return; sum += j.sell; lines.push([CS.jobDesc(j), CS.jobSite(j).name + ' · ' + j.id, j.sell]); });
    if (i.extra) lines = [[i.extra + ' charge', lines.length ? lines[0][1] : '', i.amount]];
    else if (Math.abs(sum - i.amount) > 0.5) lines.push([lines.length ? 'Extras recharged' : 'Services in the period', lines.length ? 'See job timeline' : 'Job list attached', i.amount - sum]);
    var svc = {}; i.jobs.forEach(function (id) { var j = CS.job(id); if (j) svc[CS.svc(j.svc).short] = 1; });
    var kinds = Object.keys(svc);
    return '<div class="doc" style="margin-top:14px">' + docHead('Invoice ' + i.id, h(c.name) + ' · ' + CS.dayDate(i.issued).toLocaleDateString('en-GB')) +
      '<table class="dt"><tbody>' + lines.map(function (l) { return '<tr><td><b>' + h(l[0]) + '</b><small>' + h(l[1]) + '</small></td><td class="r">' + money(l[2], true) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>Net</td><td class="r">' + money(i.amount, true) + '</td></tr><tr><td>VAT at 20%</td><td class="r">' + money(i.amount * 0.2, true) + '</td></tr><tr class="tot"><td><b>Total</b></td><td class="r"><b>' + money(i.amount * 1.2, true) + '</b></td></tr></tbody></table>' +
      (kinds.length > 1 ? '<p class="dn">' + h(kinds.join(', ')) + ' on one invoice. One account, one bill.</p>' : '') + '</div>';
  };
  function statementDoc(id) {
    var c = CS.cust(id), a = CS.aged(id);
    return '<div class="doc">' + docHead('Statement', h(c.name) + ' · ' + CS.dayDate(0).toLocaleDateString('en-GB')) +
      '<div class="dg3"><div class="bx"><small>Not yet due</small>' + money(a.current, true) + '</div><div class="bx"><small>1 to 30 days late</small>' + money(a.d30, true) + '</div><div class="bx"><small>Over 30 days</small>' + money(a.d60, true) + '</div></div>' +
      '<table class="dt"><tbody>' + (a.rows.map(function (i) { return '<tr><td><b>' + i.id + '</b><small>Due ' + CS.dayDate(i.due).toLocaleDateString('en-GB') + (i.due < 0 ? ' · ' + (-i.due) + ' days late' : '') + '</small></td><td class="r">' + money(i.amount, true) + '</td></tr>'; }).join('') || '<tr><td>Nothing outstanding</td><td></td></tr>') +
      '<tr class="tot"><td><b>Balance</b></td><td class="r"><b>' + money(a.total, true) + '</b></td></tr></tbody></table></div>';
  }
  function reportDoc(id) {
    var r = CS.report(id), c = r.cust;
    var mon = CS.dayDate(0).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    var mx = Math.max.apply(null, Object.keys(r.streams).map(function (k) { return r.streams[k]; }).concat([1]));
    if (!r.moves) return '<div class="doc">' + docHead('Site waste report', h(c.name) + ' · ' + mon) + '<p class="dn">No waste movements with a transfer note on file yet this month.</p></div>';
    return '<div class="doc">' + docHead('Site waste report', h(c.name) + ' · ' + mon) +
      '<div class="dg3"><div class="bx"><small>Waste moved</small><b>' + r.tonnes + ' t</b></div><div class="bx"><small>Kept out of landfill</small><b>' + r.pct + '%</b></div><div class="bx"><small>Transfer notes on file</small><b>' + r.moves + ' of ' + r.wtnAll + '</b></div></div>' +
      '<table class="dt"><thead><tr><th>Site</th><th class="r">Loads</th><th class="r">Tonnes</th><th class="r">Recovered</th></tr></thead><tbody>' + Object.keys(r.sites).map(function (k) { var s = r.sites[k]; return '<tr><td><b>' + h(k) + '</b></td><td class="r">' + s.n + '</td><td class="r">' + (Math.round(s.t * 10) / 10) + '</td><td class="r">' + Math.round(s.d / s.t * 100) + '%</td></tr>'; }).join('') + '</tbody></table>' +
      Object.keys(r.streams).map(function (k) { return '<div class="hbar" style="grid-template-columns:170px minmax(0,1fr) 60px"><span>' + h(k) + '</span><span class="tr"><i style="width:' + Math.round(r.streams[k] / mx * 100) + '%"></i></span><span class="v">' + (Math.round(r.streams[k] * 10) / 10) + ' t</span></div>'; }).join('') +
      '<p class="dn">Estimated ' + r.co2 + ' kg CO2e from disposal, using the 2026 UK government conversion factors. Recovery is each receiving site\'s own reported rate. Sample figures for the demo.</p></div>';
  }

  /* ---------- customers ---------- */
  function creditTag(cr) { return '<span class="tag ' + ({ hold: 'bad', late: 'amber', good: 'ok', card: '' }[cr.state]) + '">' + (cr.state === 'hold' ? ic('lock') : '') + h(cr.label) + '</span>'; }
  function creditBar(cr) {
    if (cr.card) return '<span class="muted">Pays by card</span>';
    var pc = Math.min(100, Math.round(cr.owed / cr.limit * 100));
    return '<div class="cbar"><div class="meter"><i style="width:' + pc + '%;background:' + (cr.state === 'hold' ? 'var(--bad)' : cr.state === 'late' ? 'var(--amber)' : 'var(--ok)') + '"></i></div><small>' + money(cr.owed) + ' of ' + money(cr.limit) + '</small></div>';
  }
  function custView() {
    var cs = S().customers.map(function (c) {
      var js = S().jobs.filter(function (j) { return j.cust === c.id; });
      return { c: c, cr: CS.credit(c.id, 0), live: js.filter(function (j) { return j.status !== 'done'; }).length, margin: js.reduce(function (a, j) { return a + j.sell - j.cost; }, 0) };
    }).sort(function (a, b) { return (b.cr.state === 'hold') - (a.cr.state === 'hold') || b.margin - a.margin; });
    var owed = cs.reduce(function (a, x) { return a + x.cr.owed; }, 0), hold = cs.filter(function (x) { return x.cr.state === 'hold'; });
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('users') + 'Customers</small><b>' + cs.length + '</b><span class="d">' + cs.filter(function (x) { return x.live; }).length + ' with live jobs</span></div>' +
      '<div class="card kpi"><small>' + ic('pound') + 'Owed to you</small><b>' + money(owed) + '</b><span class="d">across ' + cs.filter(function (x) { return x.cr.owed > 0; }).length + ' accounts</span></div>' +
      '<div class="card kpi"><small>' + ic('lock') + 'On hold</small><b' + (hold.length ? ' style="color:var(--bad)"' : '') + '>' + hold.length + '</b><span class="d">new bookings wait for payment</span></div>' +
      '<div class="card kpi"><small>' + ic('link') + 'Customer links</small><b>' + cs.length + '</b><span class="d">swap, collect and paperwork, no phone call</span></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('users') + 'Customers</h2></div><div class="tw"><table class="t"><thead><tr><th>Customer</th><th class="r hide-sm">Live jobs</th><th class="r hide-md">Gross profit</th><th>Credit</th><th class="hide-md">Looked after by</th></tr></thead><tbody>' +
      cs.map(function (x) {
        return '<tr class="click" data-act="openCust" data-id="' + x.c.id + '"><td><b>' + h(x.c.name) + '</b><small>' + h(x.c.contact) + ' · ' + h(x.c.type) + '</small></td><td class="r num hide-sm">' + x.live + '</td><td class="r num hide-md">' + money(x.margin) + '</td><td>' + (x.c.stop ? '<span class="tag bad">On stop</span>' : creditTag(x.cr)) + '</td><td class="hide-md">' + (x.c.owner === 'sam' ? h(CS.bde()) : 'Dave') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  X.openCust = function (id) {
    var c = CS.cust(id); if (!c) return;
    var js = S().jobs.filter(function (j) { return j.cust === id; }), cr = CS.credit(id, 0);
    var m = js.reduce(function (a, j) { return a + j.sell - j.cost; }, 0);
    var sites = c.sites.map(function (s, i) {
      var live = js.filter(function (j) { return j.site === i && j.status !== 'done'; });
      return '<div class="site"><div class="row">' + ic('map-pin') + '<b>' + h(s.name) + '</b><span class="muted">' + h(s.pc) + '</span></div>' +
        (live.map(function (j) { return '<div class="rowline"><div class="bd"><b>' + h(CS.jobDesc(j)) + '</b><small>' + j.id + ' · ' + h(CS.sup(j.sup).name) + (j.status === 'onhire' && j.svc === 'skip' ? ' · ' + (-j.day) + ' days on site' : ' · ' + CS.fmtDay(j.day)) + '</small></div>' + H.stTag(j.status) + '</div>'; }).join('') || '<div class="muted" style="font-size:12.5px;padding:6px 0 2px">Nothing live here.</div>') + '</div>';
    }).join('');
    H.drawer(h(c.name) + ' ' + creditTag(cr), h(c.contact) + ' · ' + h(c.type) + ' · ' + h(c.terms),
      '<div class="grid g3"><div class="card kpi"><small>Jobs</small><b>' + js.length + '</b></div><div class="card kpi"><small>Margin</small><b>' + money(m) + '</b></div><div class="card kpi"><small>Owes</small><b>' + money(cr.owed) + '</b></div></div>' +
      (cr.card ? '' : '<div class="sec"><h3>Credit</h3>' + creditBar(cr) + (cr.why ? '<div class="note" style="margin-top:8px;background:var(--bad-l)">' + ic('lock') + '<span>' + h(cr.why) + ' New bookings are held until it is paid, unless you say otherwise.</span></div>' : (cr.overdue ? '<div class="note" style="margin-top:8px">' + ic('alert') + '<span>' + money(cr.overdue, true) + ' is ' + cr.worst + ' days late. Reminders are going out.</span></div>' : '')) + '</div>') +
      '<div class="sec"><h3>Sites and what is on them</h3>' + sites + (c.swapDays ? '<div class="note" style="margin-top:8px">' + ic('sparkles') + '<span>' + h(c.first) + ' has swapped skips about every ' + c.swapDays + ' days at ' + h(c.sites[0].name) + '. You get a nudge when one is due.</span></div>' : '') + '</div>' +
      '<div class="sec"><h3>Contact</h3><dl class="kv"><dt>Phone</dt><dd>' + h(c.phone) + '</dd><dt>Email</dt><dd>' + h(c.email) + '</dd><dt>Looked after by</dt><dd>' + (c.owner === 'sam' ? h(CS.bde()) : 'Dave') + '</dd></dl></div>',
      '<button class="btn pri" data-act="msgParty" data-type="customer" data-id="' + c.id + '">' + ic('whatsapp') + 'Message ' + h(c.first) + '</button>' +
      '<button class="btn" data-act="custLink" data-id="' + c.id + '">' + ic('link') + h(c.first) + '\'s link</button>' +
      '<button class="btn" data-act="statement" data-id="' + c.id + '">' + ic('receipt') + 'Statement</button>' +
      '<button class="btn" data-act="siteReport" data-id="' + c.id + '">' + ic('leaf') + 'Waste report</button>');
  };

  /* ---------- a request made on another tab (the customer link, the phone) shows up here ---------- */
  function snapshot() { var k = {}; S().threads.forEach(function (t) { k[t.id] = t.msgs.length; }); return k; }
  X.syncToast = function () {
    if (!known) { known = snapshot(); return; }
    S().threads.forEach(function (t) {
      var m = t.msgs[t.msgs.length - 1];
      if (m && m.dir === 'in' && (known[t.id] || 0) < t.msgs.length && !t.done) {
        var p = CS.party(t.party); H.ui.newIds[t.id] = true;
        H.toast('New ' + (t.ch === 'portal' ? 'request on ' + h(p.first) + '\'s customer link' : CS.chName(t.ch) + ' from ' + h(p.name)), H.chIcon(t.ch), { act: 'sel', id: t.id, label: 'Open' });
      }
    });
    known = snapshot();
  };

  X.init = function (o) {
    H = o; known = snapshot();
    var A = H.A, V = H.V;
    CS.on(function (why) { if (why !== 'sync') known = snapshot(); });
    V.customers = custView;

    A.openCust = function (el) { X.openCust(el.dataset.id); };
    A.custLink = function (el) { var c = CS.cust(el.dataset.id); H.closeLayer(); H.openPhone('portal.html?c=' + c.id, c.name + ' customer link'); if (window.innerWidth >= 900) H.toast('This is what ' + h(c.first) + ' sees. Tap Swap or Collect and watch the inbox.', 'link'); };
    A.statement = function (el) {
      var c = CS.cust(el.dataset.id);
      H.modal('Statement, ' + h(c.name), statementDoc(c.id), '<button class="btn" data-act="openCust" data-id="' + c.id + '">Back</button><button class="btn pri" data-act="sendStatement" data-id="' + c.id + '">' + ic('send') + 'Email to ' + h(c.first) + '</button>');
    };
    A.sendStatement = function (el) {
      var c = CS.cust(el.dataset.id), a = CS.aged(c.id), t = CS.threadFor({ type: 'customer', id: c.id }, 'email');
      t.subject = t.subject || 'Statement from Demo Skip & Grab';
      CS.addMsg(t, 'out', 'Hi ' + c.first + ',\n\nStatement attached. Balance ' + money(a.total, true) + (a.d30 + a.d60 > 0 ? ', of which ' + money(a.d30 + a.d60, true) + ' is past due' : '') + '.\n\nCheers, Dave', { by: 'Dave', att: [{ n: 'Statement-' + c.name.replace(/[^A-Za-z]+/g, '-') + '.pdf', t: 'doc' }] });
      CS.saved(8); CS.commit(); H.closeLayer(); H.toast('Statement emailed to ' + h(c.first) + ' (demo, nothing really sent)', 'send');
    };
    A.siteReport = function (el) {
      var c = CS.cust(el.dataset.id);
      H.modal('Waste report, ' + h(c.name), reportDoc(c.id), '<button class="btn" data-act="openCust" data-id="' + c.id + '">Back</button><button class="btn pri" data-act="sendReport" data-id="' + c.id + '">' + ic('send') + 'Email to ' + h(c.first) + '</button>');
    };
    A.sendReport = function (el) {
      var c = CS.cust(el.dataset.id), r = CS.report(c.id), t = CS.threadFor({ type: 'customer', id: c.id }, 'email');
      t.subject = t.subject || 'Site waste report';
      CS.addMsg(t, 'out', 'Hi ' + c.first + ',\n\nThis month\'s waste report attached: ' + r.tonnes + ' tonnes moved, ' + r.pct + '% kept out of landfill, every transfer note on file.\n\nCheers, Dave', { by: 'Dave', att: [{ n: 'Waste-report.pdf', t: 'doc' }] });
      CS.saved(20); CS.commit(); H.closeLayer(); H.toast('Waste report emailed to ' + h(c.first) + ' (demo, nothing really sent)', 'leaf');
    };
    A.skipNudge = function (el) { var j = CS.job(el.dataset.id), c = CS.cust(j.cust); CS.nudge(j.id); CS.commit(); H.toast('Asked ' + h(c.first) + ' on WhatsApp. The answer lands in the inbox.', 'whatsapp'); };
    A.nudgeAll = function () { var l = CS.nudges(); l.forEach(function (x, i) { CS.nudge(x.j.id); }); CS.commit(); H.toast(l.length + ' customers asked: swap or collect?', 'whatsapp'); };
    A.recharge = function (el) { var l = S().leaks.filter(function (x) { return x.id === el.dataset.id; })[0]; var inv = CS.recharge(l.id); CS.commit(); H.toast(h(l.type) + ' recharged: ' + money(l.recharge) + ' added to ' + inv + ' and the customer told why', 'pound'); };
    A.absorb = function (el) { CS.absorb(el.dataset.id); CS.commit(); H.toast('Written off against the job, so the margin on it is the true one', 'check'); };
    A.rechargeAll = function () {
      var l = CS.openLeaks().filter(function (x) { return !x.bill; }), tot = 0; l.forEach(function (x) { tot += x.recharge; CS.recharge(x.id); }); CS.commit();
      H.toast(l.length ? money(tot) + ' recharged across ' + l.length + ' jobs. Each customer told why.' : 'Only the supplier bill is left. Tap Sort it.', 'pound');
    };
    A.leakSort = function (el) { A.billCheck(el); };
    A.rateApply = function (el) { var rp = el.dataset.v === '1'; CS.applyRateChange(rp); CS.commit(); H.toast(rp ? 'Rate card updated. Q-2232 repriced so the margin holds.' : 'Rate card updated. Open quotes keep their price, at a thinner margin.', 'warehouse'); };
    A.permitRenew = function (el) {
      var p = S().permits.filter(function (x) { return x.job === el.dataset.id; })[0], j = CS.job(p.job), su = CS.sup(j.sup), c = CS.cust(j.cust);
      var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa');
      CS.addMsg(t, 'out', 'Hi ' + su.contact + ', the permit on ' + j.id + ' (' + CS.jobSite(j).pc + ') runs out ' + CS.dayPhrase(p.to) + '. I\'m asking ' + c.first + ' if it can come off. If not, can you renew it and add the cost to your bill? Thanks, Dave (Demo Skip & Grab)', { by: 'Dave' });
      p.asked = true; CS.jobLog(j, 'Permit renewal raised with ' + su.name); CS.saved(4); CS.commit();
      H.toast('Renewal raised with ' + h(su.name) + '. The cost gets recharged when it lands on their bill.', 'map-pin');
    };
    A.checkAll = function () {
      var l = S().suppliers.filter(function (s) { return s.licExp != null; }); l.forEach(function (s) { s.checked = true; });
      var soon = l.filter(function (s) { return s.licExp < 60; }).length; CS.saved(15); CS.commit();
      H.toast(l.length + ' carriers checked against the register: ' + (l.length - soon) + ' valid, ' + soon + ' due to renew within 60 days. Sample result in the demo.', 'shield-check');
    };
    A.regCheck = function () {
      var v = (H.$('#nsCbdu').value || '').trim().toUpperCase(), box = H.$('#regRes'); if (!box) return;
      var ok = /^CBDU\d{5,7}$/.test(v);
      box.innerHTML = !v ? '<div class="note">' + ic('alert') + '<span>Type their CBDU number first.</span></div>'
        : ok ? '<div class="note" style="background:var(--ok-l)">' + ic('shield-check') + '<span><b>' + h(v) + ' is on the register.</b> Upper tier, carrier and broker, runs to ' + CS.dayDate(410).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '. Expiry saved, you get a reminder 60 days before. <span class="muted">Sample result. Live, this reads the Environment Agency\'s public register.</span></span></div>'
        : '<div class="note" style="background:var(--bad-l)">' + ic('alert') + '<span><b>' + h(v) + ' is not a carrier number.</b> They start CBDU. Do not use this supplier for waste until they send one.</span></div>';
    };
    A.addSup = function () {
      H.modal('Add a supplier', '<div class="field"><label for="nsName">Name</label><input id="nsName" placeholder="Supplier name"></div><div class="grid g2"><div class="field"><label for="nsPh">WhatsApp number</label><input id="nsPh" placeholder="07..."></div><div class="field"><label for="nsAreas">Postcodes covered</label><input id="nsAreas" placeholder="UB3, UB4, NR"></div></div>' +
        '<div class="field"><label for="nsCbdu">Waste carrier number</label><div class="row"><input id="nsCbdu" placeholder="CBDU..." value="CBDU204417"><button class="btn" data-act="regCheck">' + ic('shield-check') + 'Check the register</button></div></div><div id="regRes"></div>' +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Their rate card goes in here too. Send them the price list template, or forward their email and it gets read in.</p>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveSup">' + ic('check') + 'Add supplier</button>');
    };
    A.briefing = function () {
      var on = S().settings.briefing !== false;
      H.modal('Morning briefing', '<div class="cphone" style="max-width:420px"><div class="scr" style="height:auto"><div class="wh"><span class="av sm" style="--c:#EB9347">Demo Skip & Grab</span><span><b>Demo Skip & Grab office</b><small>07:30</small></span></div><div class="wb" style="justify-content:flex-start">' +
        '<div class="wm" style="align-self:flex-start;background:#fff;max-width:94%">' + CS.briefing().map(h).join('<br><br>') + '</div></div></div></div>' +
        '<div class="rowline" style="margin-top:12px"><div class="bd"><b>Send this to my WhatsApp at 07:30</b><small>Every working day, built from the live jobs</small></div><button class="switch' + (on ? ' on' : '') + '" data-act="toggle" data-k="briefing" aria-label="Morning briefing"></button></div>');
    };
    if (window.DSGP) window.DSGP.init(H);
  };
})();
