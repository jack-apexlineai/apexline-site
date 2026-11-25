/* Demo Skip & Grab demo, third layer: waste and carbon reporting across every account, opening a trade account in two minutes,
   the team (MD, BDE and the next hires) and a short guided tour. Sample data only, nothing leaves this browser. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var P = window.DSGP = {}, H = null;
  function S() { return CS.S; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function monthName(off) { var d = CS.dayDate(0); d.setDate(1); d.setMonth(d.getMonth() + off); return d.toLocaleDateString('en-GB', { month: 'short' }); }
  function nextFirst() { var d = CS.dayDate(0); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }

  /* ---------- waste and carbon ---------- */
  function totals() {
    var rows = S().customers.map(function (c) { return CS.report(c.id); }).filter(function (r) { return r.moves; });
    var t = { rows: rows, tonnes: 0, diverted: 0, co2: 0, moves: 0, wtnAll: 0, sites: 0, streams: {} };
    rows.forEach(function (r) {
      t.tonnes += r.tonnes; t.diverted += r.tonnes * r.pct / 100; t.co2 += r.co2; t.moves += r.moves; t.wtnAll += r.wtnAll; t.sites += Object.keys(r.sites).length;
      Object.keys(r.streams).forEach(function (k) { t.streams[k] = (t.streams[k] || 0) + r.streams[k]; });
    });
    t.pct = t.tonnes ? Math.round(t.diverted / t.tonnes * 100) : 0; t.tonnes = r1(t.tonnes);
    return t;
  }
  /* Six months of history, scaled from this month so the trend always matches the live figures. Sample only. */
  function trend(now) { return CS.months6(now.rows); }
  P.reportsView = function () {
    var t = totals(), tr = trend(t), mx = Math.max.apply(null, tr.map(function (x) { return x.t; }).concat([1]));
    var sent = S().reportsSent || {}, auto = S().settings.autoReports !== false;
    var wtnPct = t.wtnAll ? Math.round(t.moves / t.wtnAll * 100) : 0;
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi hero"><small>' + ic('leaf') + 'Kept out of landfill</small><b>' + t.pct + '%</b><span class="d">' + r1(t.diverted) + ' of ' + t.tonnes + ' tonnes this month</span></div>' +
      '<div class="card kpi"><small>' + ic('truck') + 'Waste moved</small><b>' + t.tonnes + ' t</b><span class="d">' + t.moves + ' loads across ' + t.sites + ' sites</span></div>' +
      '<div class="card kpi"><small>' + ic('certificate') + 'Transfer notes on file</small><b>' + wtnPct + '%</b><span class="d">' + t.moves + ' of ' + t.wtnAll + (t.moves < t.wtnAll ? ', the rest are being chased' : ' loads, every one covered') + '</span></div>' +
      '<div class="card kpi"><small>' + ic('sparkles') + 'Carbon, estimated</small><b>' + (t.co2 >= 1000 ? r1(t.co2 / 1000) + ' t' : t.co2 + ' kg') + '</b><span class="d">CO2e from disposal, UK 2026 factors</span></div></div>' +
      '<div class="grid g2" style="margin-bottom:16px;align-items:start">' +
      '<div class="card"><div class="hd"><h2>' + ic('trending-up') + 'Six months</h2><span class="muted" style="font-size:12px">tonnes moved, and % kept out of landfill</span></div><div class="bd"><div class="pchart">' +
      tr.map(function (x, i) { return '<div class="pcol' + (i === 5 ? ' now' : '') + '"><span class="pv">' + (x.p == null ? '&nbsp;' : x.p + '%') + '</span><span class="pbar"><i style="height:' + (x.t ? Math.max(6, Math.round(x.t / mx * 100)) : 0) + '%"></i></span><b>' + (x.t ? x.t + ' t' : 'None') + '</b><small>' + x.m + '</small></div>'; }).join('') +
      '</div></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('stack') + 'By waste stream</h2></div><div class="bd">' +
      Object.keys(t.streams).map(function (k) { var v = t.streams[k]; return '<div class="hbar" style="grid-template-columns:170px minmax(0,1fr) 60px"><span>' + h(k) + '</span><span class="tr"><i style="width:' + Math.round(v / t.tonnes * 100) + '%"></i></span><span class="v">' + r1(v) + ' t</span></div>'; }).join('') +
      '<div class="note" style="margin-top:12px">' + ic('certificate') + '<span>Every figure comes off the transfer notes and weighbridge tickets the suppliers send back. Main contractors use the diversion figure for BREEAM and their own carbon reporting.</span></div></div></div></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('users') + 'Every account, every site</h2><div class="row" style="gap:8px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">Monthly reports go out on the 1st</span><button class="switch' + (auto ? ' on' : '') + '" data-act="toggle" data-k="autoReports" aria-label="Send monthly reports automatically"></button><button class="btn sm pri" data-act="sendAllReports">' + ic('send') + 'Send all now</button></div></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Customer</th><th class="r">Tonnes</th><th class="r hide-sm">Loads</th><th class="r">Out of landfill</th><th class="r hide-md">WTNs</th><th class="hide-sm">Report</th><th></th></tr></thead><tbody>' +
      t.rows.sort(function (a, b) { return b.tonnes - a.tonnes; }).map(function (r) {
        var c = r.cust, st = sent[c.id];
        return '<tr><td><b>' + h(c.name) + '</b><small>' + Object.keys(r.sites).length + ' site' + (Object.keys(r.sites).length === 1 ? '' : 's') + ' · ' + h(c.type) + '</small></td><td class="r num">' + r.tonnes + '</td><td class="r num hide-sm">' + r.moves + '</td><td class="r"><span class="tag ' + (r.pct >= 90 ? 'ok' : r.pct >= 80 ? 'amber' : 'bad') + '">' + r.pct + '%</span></td><td class="r num hide-md">' + r.moves + ' of ' + r.wtnAll + '</td>' +
          '<td class="hide-sm">' + (st ? '<span class="tag ok">' + ic('check') + 'Sent ' + h(st) + '</span>' : '<span class="tag">' + (auto ? 'Goes ' + nextFirst() : 'Not sent') + '</span>') + '</td>' +
          '<td class="r"><div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-act="custGreen" data-id="' + c.id + '" title="Their own waste and carbon page, in their portal">' + ic('leaf') + 'Their page</button><button class="btn sm" data-act="siteReport" data-id="' + c.id + '">' + ic('eye') + 'Report</button></div></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="bd"><div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start"><span class="spark">' + ic('shield-check') + '</span><div style="flex:1;min-width:240px"><b style="font-size:15px">What a QS or main contractor asks a waste supplier for, ready in one click</b>' +
      '<p class="muted" style="margin:4px 0 0;font-size:13px">Tonnes and diversion by site, the transfer note for every load, and the carrier licence of every supplier used. Under your logo, not a supplier\'s.</p></div>' +
      '<button class="btn" data-act="auditPack">' + ic('download') + 'Build an audit pack</button></div></div></div>' +
      '<p class="muted" style="font-size:12px;margin:14px 2px 0">Sample figures. Tonnes are the weighbridge weight when the supplier sends one, otherwise a typical weight for the container. Recovery is each receiving site\'s own reported rate. Carbon is an estimate from the UK government\'s 2026 conversion factors.</p>';
  };

  /* ---------- opening a trade account ---------- */
  var CH = { name: 'Harbourside Construction Ltd', no: '14907263', inc: 'March 2021', status: 'Active', office: 'Uxbridge Road, Hayes', dirs: ['Craig Barrett', 'Lisa Barrett'], accts: 'Filed on time, last made up to 31 Mar 2026', conf: 'Up to date', sic: '41202 Construction of domestic buildings' };
  function acctForm() {
    return '<div class="grid g2"><div class="field"><label for="taCo">Company name</label><input id="taCo" value="' + h(CH.name) + '"></div><div class="field"><label for="taCt">Contact</label><input id="taCt" value="Craig Barrett"></div>' +
      '<div class="field"><label for="taPh">Mobile</label><input id="taPh" value="07700 900288"></div><div class="field"><label for="taSite">First site postcode</label><input id="taSite" value="UB3 2HQ"></div></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="chLookup">' + ic('search') + 'Check them on Companies House</button><span class="muted" style="font-size:12.5px">Free, official, takes a second</span></div><div id="chRes" style="margin-top:12px"></div>';
  }
  function chResult() {
    return '<div class="card" style="box-shadow:none"><div class="bd"><div class="row" style="gap:10px;flex-wrap:wrap"><span class="tag ok">' + ic('shield-check') + h(CH.status) + '</span><b>' + h(CH.name) + '</b><span class="muted">No. ' + CH.no + '</span></div>' +
      '<dl class="kv" style="margin-top:10px"><dt>Incorporated</dt><dd>' + CH.inc + ' (5 years trading)</dd><dt>Registered office</dt><dd>' + h(CH.office) + '</dd><dt>Directors</dt><dd>' + CH.dirs.map(h).join(', ') + '</dd><dt>Accounts</dt><dd>' + CH.accts + '</dd><dt>Confirmation statement</dt><dd>' + CH.conf + '</dd><dt>Business</dt><dd>' + CH.sic + '</dd></dl>' +
      '<div class="note" style="margin-top:10px;background:var(--ok-l)">' + ic('sparkles') + '<span><b>Suggested: £3,000 limit, 30 days.</b> Trading over 3 years, accounts and filings on time, nothing overdue. Raise it once they\'ve paid two invoices on time. <span class="muted">You set the limit, always.</span></span></div>' +
      '<div class="grid g2" style="margin-top:10px"><div class="field"><label for="taLim">Credit limit</label><select id="taLim"><option value="0">Card on order</option><option value="1500">£1,500</option><option value="3000" selected>£3,000</option><option value="5000">£5,000</option></select></div><div class="field"><label for="taTerms">Terms</label><select id="taTerms"><option>30 days</option><option>30 days end of month</option><option>14 days</option></select></div></div>' +
      '<p class="muted" style="font-size:12px;margin:6px 0 0">Sample result for the demo. Live, this reads the Companies House register, which is free to use.</p></div></div>';
  }

  /* ---------- team ---------- */
  function teamBody() {
    var bde = CS.bde(), extra = S().team || [];
    var box = function (list) { return '<span class="tminb">' + list.map(function (x) { return '<span class="tag">' + ic(x[0]) + h(x[1]) + '</span>'; }).join('') + '</span>'; };
    var mail = function (n) { return String(n).split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + '@demoskipandgrab.co.uk'; };
    var row = function (ini, col, name, role, sees, tag, inb) {
      return '<div class="rowline"><span class="av" style="--c:' + col + '">' + h(ini) + '</span><div class="bd"><b>' + h(name) + ' <span class="muted" style="font-weight:500">· ' + h(role) + '</span></b><small>' + h(sees) + '</small>' + (inb ? box(inb) : '') + '</div>' + (tag || '') + '</div>';
    };
    var INB_ALL = function (n) { return [['mail', mail(n)], ['mail', 'info@demoskipandgrab.co.uk'], ['whatsapp', 'Demo Skip & Grab WhatsApp']]; };
    return '<p class="muted" style="font-size:13px;margin:0 0 6px">One login each. Each person links their own inbox, and you choose who also sees info@ and the WhatsApp number. Whoever picks a message up first answers it, so a customer gets the same answer whoever it is.</p>' +
      row('JP', '#EB9347', 'Dave Archer', 'Managing Director', 'Everything: margin, supplier costs, credit, the whole team\'s pipeline', '<span class="tag brand">Owner</span>', INB_ALL('Dave')) +
      row(CS.initials(bde), '#7A3FF2', bde, 'Business Development Executive', 'Leads, quotes and his own accounts. Sees the margin on what he sells', '<span class="tag amber">Starting soon</span>', INB_ALL(bde)) +
      extra.map(function (p) { return row(CS.initials(p.name), '#52525B', p.name, p.role, p.sees, p.imported ? '<span class="tag">Starting PIN set</span>' : '<span class="tag">' + ic('mail') + 'Invite sent</span>', p.role === 'Office and accounts' ? [['mail', mail(p.name)], ['mail', 'accounts@demoskipandgrab.co.uk']] : INB_ALL(p.name)); }).join('') +
      '<div class="card" style="box-shadow:none;margin-top:12px"><div class="bd"><b>Add the next hire</b><div class="grid g2" style="margin-top:8px"><div class="field"><label for="tmName">Name</label><input id="tmName" placeholder="First and last name"></div><div class="field"><label for="tmRole">Role</label><select id="tmRole"><option>Account manager</option><option>Office and accounts</option><option>Business Development Executive</option></select></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:0">They get a login link. Day one opens on a five minute walkthrough of their own screens, so nobody needs a training day.</p></div></div>';
  }
  var ROLE_SEES = { 'Account manager': 'Inbox, jobs, suppliers and chasing for the accounts they look after', 'Office and accounts': 'Invoices, supplier bills, statements and the chasing list', 'Business Development Executive': 'Leads, quotes and their own accounts' };

  /* ---------- guided tour ---------- */
  var TOUR = [
    { v: 'inbox', sel: '.nav [data-v="inbox"]', t: 'Every message, already read', b: 'WhatsApp, email and your Get a quote form land here, with the Google Ads source on every enquiry. Customers and suppliers. Each one is read, priced against your supplier rates and drafted in your tone. You tap approve.' },
    { v: 'inbox', sel: '.nav .navcta', t: 'Place an order in one go', b: 'New order, from any screen (or press O). Customer, site, what and when. One tap books the supplier, raises the invoice and sends the customer their confirmation.' },
    { v: 'inbox', sel: '.nav .navcta.two', t: 'A price before they finish asking', b: 'Someone rings for a skip in B23? Quote, from any screen (or press Q). Postcode and size, and you get the buy price, your floor, your ideal and what they paid last time. Send it on WhatsApp or email in one tap.' },
    { v: 'orders', sel: '.nav [data-v="orders"]', t: 'Every order in one diary', b: 'Flick through by month, week or day, back to your first order and forward to what is booked. Open any order for its whole story, from booking to paid.' },
    { v: 'jobs', sel: '.nav [data-v="jobs"]', t: 'What is moving, and what is on site', b: 'Today\'s deliveries with who to ring on site and when the supplier said they would be there. Every skip on site against that supplier\'s hire period. Suppliers are chased for you until they confirm.' },
    { v: 'customers', sel: '.nav [data-v="customers"]', t: 'Accounts and credit', b: 'Open a trade account in two minutes with a Companies House check. Credit limits hold a booking when someone\'s late paying, and every customer gets their own link.' },
    { v: 'reports', sel: '.nav [data-v="reports"]', t: 'Waste and carbon, under your logo', b: 'Tonnes, landfill diversion and carbon for every account and site, off the transfer notes. The monthly reports go out on the 1st by themselves.' },
    { v: 'money', sel: '.nav [data-v="money"]', t: 'Money found', b: 'Every supplier bill is checked against the rate you agreed. Extras that never reached the customer\'s invoice are found and recharged in one tap.' },
    { v: 'home', sel: '#greet', t: 'Start every day here', b: 'One page with what needs you, laid out how you like it. The same system is in your pocket on your phone, with a morning briefing on your WhatsApp at 7:30. That\'s the tour. Have a click around, nothing you do here goes anywhere.' }
  ];
  var tourI = -1;
  function tourShow() {
    var st = TOUR[tourI]; if (!st) return tourEnd();
    if (H.ui.view !== st.v) H.go(st.v);
    if (window.innerWidth < 900 && st.sel.indexOf('.nav') === 0) { var sd = document.querySelector('#side'); if (sd && !sd.classList.contains('open')) H.A.menu(); }
    else if (window.innerWidth < 900) { H.A.closeSide(); }
    setTimeout(function () {
      var old = document.getElementById('tourBox'); if (old) old.remove();
      var el = document.querySelector(st.sel), box = document.createElement('div');
      box.id = 'tourBox'; box.className = 'tourbox';
      box.innerHTML = '<div class="tstep">' + (tourI + 1) + ' of ' + TOUR.length + '</div><b>' + h(st.t) + '</b><p>' + h(st.b) + '</p><div class="row" style="gap:8px;justify-content:flex-end">' +
        (tourI ? '<button class="btn sm" data-act="tourBack">Back</button>' : '<button class="btn sm" data-act="tourEnd">Skip</button>') +
        '<button class="btn sm pri" data-act="tourNext">' + (tourI === TOUR.length - 1 ? 'Finish' : 'Next') + '</button></div>';
      document.body.appendChild(box);
      document.querySelectorAll('.tourhi').forEach(function (x) { x.classList.remove('tourhi'); });
      var W = window.innerWidth, Ht = window.innerHeight, bw = Math.min(340, W - 24);
      box.style.width = bw + 'px';
      if (el) {
        el.classList.add('tourhi'); el.scrollIntoView({ block: 'nearest' });
        var r = el.getBoundingClientRect(), bh = box.offsetHeight, left, top;
        if (r.right + bw + 24 < W && r.left < W / 2) { left = r.right + 14; top = Math.min(Math.max(12, r.top - 8), Ht - bh - 12); }
        else { left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), W - bw - 12); top = r.bottom + 12 + bh < Ht ? r.bottom + 12 : Math.max(12, r.top - bh - 12); }
        box.style.left = left + 'px'; box.style.top = top + 'px';
      } else { box.style.left = (W - bw) / 2 + 'px'; box.style.top = '30%'; }
    }, 140);
  }
  function tourEnd() {
    tourI = -1; var b = document.getElementById('tourBox'); if (b) b.remove();
    document.querySelectorAll('.tourhi').forEach(function (x) { x.classList.remove('tourhi'); });
    if (H && H.A.closeSide) H.A.closeSide();
  }
  P.tour = function () { if (!H) return; H.closeLayer(); tourI = 0; tourShow(); };

  /* ---------- wiring ---------- */
  P.init = function (o) {
    H = o; var A = H.A, V = H.V;
    V.reports = P.reportsView;
    /* Open one customer's own waste and carbon page, as they see it in their portal. */
    A.custGreen = function (el) { var c = CS.cust(el.dataset.id); H.closeLayer(); H.openPhone('portal.html?c=' + encodeURIComponent(c.id) + '&v=green', c.name + ' waste and carbon'); if (window.innerWidth >= 900) H.toast('This is the waste and carbon page ' + h(c.name) + ' see in their own portal.', 'leaf'); };
    var custV = V.customers;
    V.customers = function () {
      return '<div class="row" style="margin-bottom:14px;flex-wrap:wrap;gap:10px"><div style="flex:1;min-width:220px"><b style="font-size:15px">New customer?</b><span class="muted" style="font-size:13px;display:block">Checked on Companies House, credit limit set and their link sent, in about two minutes.</span></div><button class="btn pri" data-act="newAccount">' + ic('user-plus') + 'Open a trade account</button></div>' + custV();
    };

    A.sendAllReports = function () {
      var t = totals(), when = CS.dayDate(0).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      S().reportsSent = S().reportsSent || {};
      t.rows.forEach(function (r) {
        var c = r.cust; S().reportsSent[c.id] = when;
        var th = CS.threadFor({ type: 'customer', id: c.id }, 'email'); th.subject = th.subject || 'Site waste report';
        CS.addMsg(th, 'out', 'Hi ' + c.first + ',\n\nYour waste report for the month is attached: ' + r.tonnes + ' tonnes moved, ' + r.pct + '% kept out of landfill, and the transfer note for every load.\n\nCheers, Dave', { by: 'Dave', att: [{ n: 'Demo Skip & Grab-waste-report.pdf', t: 'doc' }] });
      });
      CS.saved(t.rows.length * 12); CS.commit();
      H.toast(t.rows.length + ' waste reports emailed, one per account, under the Demo Skip & Grab logo (demo, nothing really sent)', 'leaf');
    };
    A.newAccount = function () {
      H.modal('Open a trade account', acctForm(), '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveAccount" id="taSave" disabled>' + ic('check') + 'Open the account</button>');
    };
    A.chLookup = function () {
      var box = H.$('#chRes'); if (!box) return;
      box.innerHTML = '<div class="note">' + ic('clock') + '<span>Checking Companies House...</span></div>';
      setTimeout(function () { var b = H.$('#chRes'); if (!b) return; b.innerHTML = chResult(); var s = H.$('#taSave'); if (s) s.disabled = false; }, 700);
    };
    A.saveAccount = function () {
      var co = (H.$('#taCo').value || CH.name).trim(), ct = (H.$('#taCt').value || 'Craig Barrett').trim(), pc = (H.$('#taSite').value || 'UB3 2HQ').trim().toUpperCase();
      var lim = parseInt((H.$('#taLim') || {}).value || '3000', 10), terms = (H.$('#taTerms') || {}).value || '30 days';
      var id = 'c' + (S().customers.length + 20), fn = ct.split(' ')[0];
      S().customers.push({ id: id, limit: lim, name: co, contact: ct, first: fn, phone: (H.$('#taPh').value || '07700 900288'), email: fn.toLowerCase() + '@' + co.toLowerCase().replace(/ ltd$/, '').replace(/[^a-z]+/g, '') + '.co.uk', type: 'Builder', terms: lim ? ({ '30 days': '30 day account', '14 days': '14 day account' }[terms] || terms) : 'Card on order', owner: 'dave', sites: [{ name: 'First site', pc: pc }], isNew: true });
      var th = CS.threadFor({ type: 'customer', id: id }, 'wa');
      CS.addMsg(th, 'out', 'Hi ' + fn + ', your Demo Skip & Grab account is open: ' + (lim ? money(lim) + ' credit on ' + terms.toLowerCase() : 'card on order to start') + '. Here\'s your own link to book, swap, collect and download your paperwork any time. Anything else, message this number and we\'ll sort it. Cheers, Dave', { by: 'Dave' });
      CS.feed('Trade account opened for ' + co, 'user-plus'); CS.saved(25); CS.commit(); H.closeLayer();
      H.toast(h(co) + ' is on the books. Welcome message and their link sent on WhatsApp.', 'user-plus', { act: 'openCust', id: id, label: 'Open' });
    };
    A.team = function () { H.closeLayer(); H.modal('Your team', teamBody(), '<button class="btn" data-act="close">Close</button><button class="btn" data-act="importOpen" data-v="team">' + ic('download') + 'Import from a spreadsheet</button><button class="btn pri" data-act="addTeam">' + ic('user-plus') + 'Send their login</button>'); };
    A.addTeam = function () {
      var n = (H.$('#tmName').value || '').trim(), role = H.$('#tmRole').value;
      if (!n) { H.toast('Put their name in first', 'user'); return; }
      S().team = (S().team || []).concat([{ name: n, role: role, sees: ROLE_SEES[role] }]); CS.commit();
      H.modal('Your team', teamBody(), '<button class="btn" data-act="close">Close</button><button class="btn" data-act="importOpen" data-v="team">' + ic('download') + 'Import from a spreadsheet</button><button class="btn pri" data-act="addTeam">' + ic('user-plus') + 'Send their login</button>');
      H.toast(h(n.split(' ')[0]) + '\'s login is on its way (demo, nothing sent). Their first screen is the walkthrough.', 'mail');
    };
    if (window.DSGQ) window.DSGQ.init(H);
    A.tour = function () { P.tour(); };
    A.tourNext = function () { tourI++; if (tourI >= TOUR.length) tourEnd(); else tourShow(); };
    A.tourBack = function () { tourI = Math.max(0, tourI - 1); tourShow(); };
    A.tourEnd = function () { tourEnd(); };
    window.addEventListener('resize', function () { if (tourI >= 0) tourShow(); });
    /* the nav is redrawn when live messages land, so keep the highlight on the step's target */
    setInterval(function () { if (tourI < 0) return; var st = TOUR[tourI], el = st && document.querySelector(st.sel); if (el && !el.classList.contains('tourhi')) el.classList.add('tourhi'); }, 300);
    document.addEventListener('keydown', function (e) { if (tourI >= 0 && e.key === 'Escape') tourEnd(); });
  };
})();
