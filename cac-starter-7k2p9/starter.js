/* CAC Starter: ordering and compliance only. This layer loads last. It keeps the menu to the Starter pages,
   draws a plain Home, Invoices and Duty of care, and hides every button that leads to something outside the Starter.
   Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  var UI = window.CACUI, CS = window.CS, ic = window.ic || function () { return ''; };
  if (!UI || !CS) return;
  var h = CS.esc, money = CS.money, A = UI.A, V = UI.V, ui = UI.ui;

  /* ---------- what the Starter has ---------- */
  var ORDER = [
    ['home', 'Home', 'home', null, ''],
    ['orders', 'Orders', 'calendar', 'Work', 'Every order, past and booked. Flick through by month, week or day'],
    ['history', 'Order history', 'list', 'Work', null],
    ['jobs', 'Live jobs', 'truck', 'Work', 'What is moving today, what is sitting on site, and collections due'],
    ['paperwork', 'Duty of care', 'certificate', 'Work', 'A waste transfer note on every job'],
    ['customers', 'Customers', 'users', 'Customers', 'Every customer and their sites'],
    ['suppliers', 'Supplier handbook', 'warehouse', 'Suppliers', 'Contacts, price lists, rate cards and who covers where'],
    ['compliance', 'Compliance', 'shield-check', 'Suppliers', 'Carrier licence, permit and insurance for every supplier'],
    ['money', 'Invoices', 'receipt', 'Money', 'Every invoice, and each one goes straight to Sage'],
    ['credit', 'Credit control', 'lock', 'Money', 'Who owes what, and who is on stop'],
    ['pricebook', 'Price book', 'list', null, 'Your prices for every area and size', true],
    ['import', 'Import', 'download', null, 'Bring your customers, sites and suppliers in from a spreadsheet', true]
  ];
  var KEEP = {}; ORDER.forEach(function (o) { KEEP[o[0]] = true; });
  window.CACSTARTER = { keep: KEEP };

  function fixViews() {
    var L = UI.VIEWS, byK = {}, changed = false;
    L.forEach(function (v) { byK[v.k] = v; });
    var want = ORDER.filter(function (o) { return byK[o[0]]; }).map(function (o) {
      var v = byK[o[0]]; v.n = o[1]; v.ic = o[2]; v.g = o[3] || undefined; if (o[4] != null) v.sub = o[4]; v.hide = !!o[5]; return v;
    });
    if (L.length !== want.length || want.some(function (v, i) { return L[i] !== v; })) changed = true;
    if (changed) { L.length = 0; want.forEach(function (v) { L.push(v); }); }
    if (!KEEP[ui.view]) { ui.view = 'home'; changed = true; }
    return changed;
  }

  /* ---------- no live sample messages, no automatic reminders ---------- */
  function quiet() {
    var S = CS.S; if (!S) return;
    if (S.settings.live) { S.settings.live = false; CS.save(); }
    if (CS.COMP && CS.COMP.runReminders && !CS.COMP.runReminders._st) { var f = function () { return 0; }; f._st = true; CS.COMP.runReminders = f; }
  }

  /* ---------- the bits of the full system that are not in the Starter ---------- */
  var BLOCK = ('desk newQuote openQuote chaseQuote qYes qWon qLost qLater qLostWhy qFilter xqSendAll quoteView deskPre sendQuote quoteWon quoteLost acceptQ ' +
    'tryIt trySend trySugg testSend test livePill phone closePhone assistant asstHide asstShow skDemo skOrders skNudgeOpen skNudgeX skSend skTweak skLeave skMore ' +
    'openThread sel tab nextMsg nextOne ownReply sendOwn msgParty partyOpen approve book bookAnyway lostWhy ' +
    'briefing chase chaseAllSup chaseSup chaseAllPay remind chaseAllWtn chaseWtn nudgeAll nudge skipNudge chaseAllQ chaseMins ' +
    'cpInvite cpInvGo cpInvSample cpChaseAll cpChase cpAsThem cpResend ' +
    'custLink xpPortal custGreen sendAllReports siteReport sendReport greenCsv auditPack buildPack xmDwt xmDefra statement sendStatement ' +
    'billCheck billSample billDraft billLine billReset billSend leakSort recharge absorb rechargeAll xmRecharge ' +
    'team addTeam addLead openLead saveLead leadNext dealMsg dealSend dealStage logCall followTomorrow ' +
    'findSvc findSize findSort findOrder lookup supScore issueNew issueClose issueSave issueType pickSup ' +
    'xmEtaAll xmEtaGo askEta wtnPull wtnAsk wtnLeave xmCr xmCrGo xpOpen xpBook xpX xu430 lxAsk lxBook lxOpen gxBook gxSend gxDismiss ' +
    'cpLogFor tour tourNext tourBack tourEnd xhTour connections connGo replay upload upSample upApply rateApply hbAsk dkAskCover ' +
    'pbCell homeArrange tileHide tileMove tileShow xh2Dia diaCust skCollect permitRenew licCheck regCheck checkAll swap collect').split(/\s+/);
  var BL = {}; BLOCK.forEach(function (k) { if (k) BL[k] = true; });

  function blocked(el) {
    var a = el.getAttribute('data-act'); if (!a) return false;
    if (BL[a]) return true;
    var v = el.getAttribute('data-v');
    if ((a === 'go' || a === 'connGo') && v && !KEEP[v]) return true;
    if (a === 'askAct' && el.getAttribute('data-k') !== 'go') return true;
    if (a === 'askAct' && v && !KEEP[v]) return true;
    if (a === 'importOpen' && v === 'team') return true;
    return false;
  }
  function badHref(el) { var u = el.getAttribute('href') || el.getAttribute('src') || ''; return /portal\.html|join\.html|phone\.html|guide-/.test(u); }
  function prune(root) {
    if (!root || !root.querySelectorAll) return;
    var els = [root].concat([].slice.call(root.querySelectorAll('[data-act],[href],iframe')));
    els.forEach(function (el) {
      if (!el.getAttribute) return;
      if ((el.hasAttribute('data-act') && blocked(el)) || ((el.hasAttribute('href') || el.tagName === 'IFRAME') && badHref(el))) {
        if (!el.classList.contains('st-x')) el.classList.add('st-x');
      }
    });
    var lk = document.getElementById('lkPc'); if (lk) { var lc = lk.closest('.card'); if (lc && !lc.classList.contains('st-x')) lc.classList.add('st-x'); }
    /* toasts about new messages: there is no inbox in the Starter */
    [].forEach.call(document.querySelectorAll('#toasts .toast'), function (t) { if (/^New (WhatsApp|email|message|website|text|enquiry)/i.test(t.textContent.trim())) t.remove(); });
    tidy();
  }
  /* empty shells left behind once a button has gone */
  function tidy() {
    [].forEach.call(document.querySelectorAll('.sk-acts,.cardfoot,.row,.chips,.cpbtns,.mft,.dft'), function (b) {
      var kids = [].filter.call(b.children, function (c) { return !c.classList.contains('sp'); }); if (!kids.length) return;
      var gone = kids.every(function (c) { return c.classList.contains('st-x'); });
      b.classList.toggle('st-empty', gone && !textOutsideButtons(b));
    });
  }
  function textOutsideButtons(b) { var t = ''; [].forEach.call(b.childNodes, function (n) { if (n.nodeType === 3) t += n.textContent; else if (n.nodeType === 1 && !n.classList.contains('st-x') && !/BUTTON|A/.test(n.tagName)) t += n.textContent; }); return t.trim().length > 0; }

  /* last line of defence: a hidden button can never be pressed */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-act],a[href]'); if (!el) return;
    if ((el.hasAttribute('data-act') && blocked(el)) || (el.hasAttribute('href') && badHref(el))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'q' || e.key === 'n') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ---------- pages drawn for the Starter ---------- */
  function S() { return CS.S; }
  function dayJobs(d) { return S().jobs.filter(function (j) { return j.day === d || j.exDay === d || j.colDay === d; }); }
  function onSite() { return S().jobs.filter(function (j) { return j.status === 'onhire' && j.svc === 'skip'; }); }
  function what(j, d) { return j.colDay === d ? 'Collection' : j.exDay === d ? 'Exchange' : 'Delivery'; }
  var ST = { booked: ['Waiting on supplier', 'amber'], confirmed: ['Confirmed', 'brand'], onhire: ['On hire', 'ok'], exchange: ['Exchange booked', 'mail'], collection: ['Collection booked', 'web'], done: ['Done', ''] };
  function stTag(s) { var x = ST[s] || [s, '']; return '<span class="tag ' + x[1] + '">' + x[0] + '</span>'; }
  function compCounts() {
    var C = CS.COMP; if (!C || !C.S || !C.S()) return { due: 0, blocked: 0, queue: 0 };
    var due = 0, blocked = 0;
    S().suppliers.forEach(function (su) { if (C.status(su.id) === 'blocked') blocked++; (C.docs(su.id) || []).forEach(function (d) { if (C.st(d) === 'due' && C.needed(su, d.k)) due++; }); });
    return { due: due, blocked: blocked, queue: (C.S().apps || []).filter(function (a) { return a.st === 'submitted'; }).length };
  }
  function greet() { var hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; }

  function homeView() {
    var today = dayJobs(0), newToday = S().jobs.filter(function (j) { return j.bookedAt && CS.dayDate(0) <= new Date(j.bookedAt); }), skips = onSite();
    var unpaid = S().invoices.filter(function (i) { return i.status !== 'paid'; }), owed = unpaid.reduce(function (a, i) { return a + i.amount; }, 0);
    var late = unpaid.filter(function (i) { return i.due < 0; }), over = late.reduce(function (a, i) { return a + i.amount; }, 0);
    var done = today.filter(function (j) { return j.status === 'done' || (j.status === 'onhire' && j.day === 0); }).length;
    var cc = compCounts(), stops = S().customers.filter(function (c) { return c.stop; }), wtnMiss = S().jobs.filter(function (j) { return j.wtn === 'missing' || j.wtn === 'chased'; });
    var tile = function (v, label, sub, go) { return '<button class="card kpi st-kpi" data-act="go" data-v="' + go + '"><b>' + v + '</b><small>' + label + '</small><span class="d">' + sub + '</span></button>'; };
    var dateTxt = CS.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var latest = S().jobs.slice().sort(function (a, b) { return (b.bookedAt || 0) - (a.bookedAt || 0) || String(b.id).localeCompare(String(a.id)); }).slice(0, 5);
    var looks = [];
    if (cc.queue) looks.push(['clock', cc.queue + ' new supplier' + (cc.queue === 1 ? '' : 's') + ' to approve', 'Look over their documents and approve', 'compliance']);
    if (cc.blocked) looks.push(['lock', cc.blocked + ' supplier' + (cc.blocked === 1 ? '' : 's') + ' blocked', 'A document has run out. They cannot be booked', 'compliance']);
    if (cc.due) looks.push(['calendar', cc.due + ' document' + (cc.due === 1 ? '' : 's') + ' due in 30 days', 'Licences and insurance coming up for renewal', 'compliance']);
    if (stops.length) looks.push(['lock', stops.length + ' customer' + (stops.length === 1 ? '' : 's') + ' on stop', 'No orders can be placed for them', 'credit']);
    if (late.length) looks.push(['pound', money(over) + ' overdue', late.length + ' invoice' + (late.length === 1 ? '' : 's') + ' past their due date', 'credit']);
    if (wtnMiss.length) looks.push(['certificate', wtnMiss.length + ' transfer note' + (wtnMiss.length === 1 ? '' : 's') + ' not back', 'Duty of care for those jobs is not filed yet', 'paperwork']);
    return '<div class="st-hello"><div><div class="st-date">' + h(dateTxt) + '</div><h2>' + greet() + ', John</h2></div><button class="btn pri lg" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
      '<div class="grid g4 kpis st-kpis">' +
      tile(newToday.length, 'Orders today', 'booked since this morning', 'orders') +
      tile(today.length, 'Jobs today', done + ' done so far', 'jobs') +
      tile(skips.length, 'Skips on site', 'on hire right now', 'jobs') +
      tile(money(owed), 'Money due', late.length ? money(over) + ' overdue' : 'nothing overdue', 'money') + '</div>' +
      '<div class="grid g64 st-grid"><div class="card"><div class="hd"><h2>' + ic('truck') + 'Today on the road</h2><button class="btn sm" data-act="go" data-v="jobs">Live jobs' + ic('arrow-right') + '</button></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      (today.length ? today.slice(0, 8).map(function (j) { var c = CS.cust(j.cust), s = CS.jobSite(j);
        return '<button class="rowline st-row" data-act="openJob" data-id="' + j.id + '"><div class="bd"><b>' + j.id + ' · ' + h(c.name) + '</b><small>' + what(j, 0) + ', ' + h(CS.jobDesc(j)) + ' · ' + h(s.pc) + ' · ' + h(CS.sup(j.sup).name) + '</small></div>' + stTag(j.status) + '</button>'; }).join('') : '<div class="empty" style="padding:16px">Nothing on the road today.</div>') +
      '</div></div><div class="grid" style="align-content:start">' +
      '<div class="card"><div class="hd"><h2>' + ic('alert') + 'Needs a look</h2></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      (looks.length ? looks.map(function (l) { return '<button class="rowline st-row" data-act="go" data-v="' + l[3] + '"><span class="cic">' + ic(l[0]) + '</span><div class="bd"><b>' + h(l[1]) + '</b><small>' + h(l[2]) + '</small></div>' + ic('chevron-right') + '</button>'; }).join('') : '<div class="empty" style="padding:16px">All clear.</div>') + '</div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('calendar') + 'Latest orders</h2><button class="btn sm" data-act="go" data-v="orders">All orders' + ic('arrow-right') + '</button></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      latest.map(function (j) { var c = CS.cust(j.cust); return '<button class="rowline st-row" data-act="openJob" data-id="' + j.id + '"><div class="bd"><b>' + j.id + ' · ' + h(c.name) + '</b><small>' + h(CS.jobDesc(j)) + ' · ' + h(CS.fmtDay(j.day)) + '</small></div><b class="num">' + money(j.sell) + '</b></button>'; }).join('') +
      '</div></div></div></div>';
  }

  function moneyView() {
    var inv = S().invoices, unpaid = inv.filter(function (i) { return i.status !== 'paid'; }), owed = unpaid.reduce(function (a, i) { return a + i.amount; }, 0);
    var late = unpaid.filter(function (i) { return i.due < 0; }), over = late.reduce(function (a, i) { return a + i.amount; }, 0);
    var mon = inv.filter(function (i) { return CS.dayDate(i.issued).getMonth() === CS.dayDate(0).getMonth(); }), monT = mon.reduce(function (a, i) { return a + i.amount; }, 0);
    var notInv = S().jobs.filter(function (j) { return j.status === 'done' && !inv.some(function (i) { return i.jobs.indexOf(j.id) >= 0; }); });
    return '<div class="grid g3 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('receipt') + 'Invoiced this month</small><b>' + money(monT) + '</b><span class="d">' + mon.length + ' invoices</span></div>' +
      '<div class="card kpi"><small>' + ic('pound') + 'Owed to you</small><b>' + money(owed) + '</b><span class="d">' + unpaid.length + ' unpaid</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Overdue</small><b' + (over ? ' style="color:var(--bad)"' : '') + '>' + money(over) + '</b><span class="d">' + late.length + ' past their due date</span></div></div>' +
      '<div class="note st-sage">' + ic('refresh') + '<span><b>Invoices go straight to Sage.</b> Every invoice raised here appears in your Sage account, so nothing is typed in twice. Payments marked here show there too.</span></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('receipt') + 'Invoices</h2>' + (notInv.length ? '<button class="btn sm" data-act="raiseAll">' + ic('plus') + 'Invoice ' + notInv.length + ' finished job' + (notInv.length > 1 ? 's' : '') + '</button>' : '') + '<button class="btn sm dark" data-act="xero">' + ic('refresh') + 'Send to Sage</button></div><div class="tw"><table class="t"><thead><tr><th>Invoice</th><th>Customer</th><th class="r">Amount</th><th class="hide-sm">Due</th><th>Status</th><th class="hide-sm">Sage</th><th></th></tr></thead><tbody>' +
      inv.slice().sort(function (a, b) { return (a.status === 'paid') - (b.status === 'paid') || a.due - b.due; }).map(function (i) { var c = CS.cust(i.cust), lt = i.status !== 'paid' && i.due < 0;
        return '<tr class="click" data-act="openInv" data-id="' + i.id + '"><td><b>' + i.id + '</b><small>' + CS.fmtDay(i.issued) + '</small></td><td>' + h(c ? c.name : '') + '</td><td class="r num"><b>' + money(i.amount, true) + '</b></td><td class="hide-sm">' + CS.fmtDay(i.due) + '</td><td>' + (i.status === 'paid' ? '<span class="tag ok">Paid</span>' : lt ? '<span class="tag bad">' + (-i.due) + ' days late</span>' : '<span class="tag">Due</span>') + '</td>' +
          '<td class="hide-sm"><span class="tag ok">' + ic('check') + 'In Sage</span></td><td class="r">' + (i.status !== 'paid' ? '<button class="btn sm" data-act="markPaid" data-id="' + i.id + '">' + ic('check') + '<span class="hide-sm">Paid</span></button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  }

  function wtnTag(w) {
    if (w === 'received') return '<span class="tag ok">' + ic('certificate') + 'WTN filed</span>';
    if (w === 'missing' || w === 'chased') return '<span class="tag bad">' + ic('alert') + 'WTN not back</span>';
    if (w === 'pending') return '<span class="tag">WTN on delivery</span>';
    return '';
  }
  function dutyView() {
    var wj = S().jobs.filter(function (j) { return j.wtn; });
    var rec = wj.filter(function (j) { return j.wtn === 'received'; }).length, miss = wj.filter(function (j) { return j.wtn === 'missing' || j.wtn === 'chased'; }).length, pend = wj.filter(function (j) { return j.wtn === 'pending'; }).length;
    return '<div class="grid g3 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('certificate') + 'WTNs on file</small><b>' + rec + '</b><span class="d">kept 2 years, on the job</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Not back yet</small><b' + (miss ? ' style="color:var(--bad)"' : '') + '>' + miss + '</b><span class="d">waiting on the supplier</span></div>' +
      '<div class="card kpi"><small>' + ic('truck') + 'Due with delivery</small><b>' + pend + '</b><span class="d">jobs not delivered yet</span></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('certificate') + 'Waste transfer notes, one per job</h2></div><div class="tw"><table class="t"><thead><tr><th>Job</th><th>Customer and site</th><th class="hide-md">Carrier</th><th class="hide-sm">Waste</th><th>WTN</th><th></th></tr></thead><tbody>' +
      wj.slice().sort(function (a, b) { return a.day - b.day; }).map(function (j) { var c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), sv = CS.svc(j.svc);
        return '<tr><td><a class="link" data-act="openJob" data-id="' + j.id + '">' + j.id + '</a><small>' + CS.fmtDay(j.day) + '</small></td><td><b>' + h(c.name) + '</b><small>' + h(s.name) + ', ' + h(s.pc) + '</small></td><td class="hide-md">' + h(su.name) + '<small>' + h(su.cbdu || '') + '</small></td><td class="hide-sm">' + h(sv.waste || '') + '<small>EWC ' + h(sv.ewc || '') + '</small></td><td>' + wtnTag(j.wtn) + '</td>' +
          '<td class="r">' + (j.wtn === 'received' ? '<button class="btn sm" data-act="viewWtn" data-id="' + j.id + '">' + ic('eye') + '<span class="hide-sm">View</span></button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  }


  /* ---------- a customer: their sites, what is on them, what they owe, and on stop ---------- */
  function custDrawer(id) {
    var c = CS.cust(id); if (!c) return;
    var js = S().jobs.filter(function (j) { return j.cust === id; }), cr = CS.credit(id, 0) || { owed: 0, overdue: 0, limit: 0 };
    var tag = c.stop ? '<span class="tag bad">' + ic('lock') + 'On stop</span>' : cr.state === 'hold' ? '<span class="tag amber">On hold</span>' : '<span class="tag ok">Good</span>';
    var sites = c.sites.map(function (s, i) {
      var live = js.filter(function (j) { return j.site === i && j.status !== 'done'; });
      return '<div class="st-site"><div class="st-sitehd">' + ic('map-pin') + '<b>' + h(s.name) + '</b><span class="muted">' + h(s.pc) + '</span></div>' +
        (live.length ? live.map(function (j) { return '<button class="rowline st-row" data-act="openJob" data-id="' + j.id + '"><div class="bd"><b>' + h(CS.jobDesc(j)) + '</b><small>' + j.id + ' · ' + h(CS.sup(j.sup).name) + (j.status === 'onhire' && j.svc === 'skip' ? ' · ' + (-j.day) + ' days on site' : ' · ' + h(CS.fmtDay(j.day))) + '</small></div>' + stTag(j.status) + '</button>'; }).join('') : '<div class="muted st-none">Nothing on site or booked.</div>') + '</div>';
    }).join('');
    var body = '<div class="grid g3"><div class="card kpi"><small>Orders</small><b>' + js.length + '</b></div><div class="card kpi"><small>Owes</small><b>' + money(cr.owed) + '</b></div><div class="card kpi"><small>Overdue</small><b' + (cr.overdue ? ' style="color:var(--bad)"' : '') + '>' + money(cr.overdue) + '</b></div></div>' +
      (c.stop ? '<div class="note" style="margin-top:12px;background:var(--bad-l)">' + ic('lock') + '<span><b>On stop.</b> No order can be placed for ' + h(c.name) + ' until they are taken off stop in Credit control.</span></div>' : '') +
      '<h3 class="st-h3">Sites and what is on them</h3>' + sites +
      '<h3 class="st-h3">Contact</h3><dl class="kv"><dt>Name</dt><dd>' + h(c.contact) + '</dd><dt>Phone</dt><dd>' + h(c.phone || '') + '</dd><dt>Email</dt><dd>' + h(c.email || '') + '</dd><dt>Terms</dt><dd>' + h(c.terms || '') + (cr.limit ? ', ' + money(cr.limit) + ' limit' : '') + '</dd></dl>';
    var foot = (c.stop ? '' : '<button class="btn pri" data-act="newOrder" data-cust="' + c.id + '">' + ic('plus') + 'New order for ' + h(c.first || c.name) + '</button>') +
      '<button class="btn' + (c.stop ? ' pri' : '') + '" data-act="stopToggle" data-id="' + c.id + '">' + ic('lock') + (c.stop ? 'Take off stop' : 'Put on stop') + '</button>';
    var l = document.getElementById('layer'); if (!l) return;
    l.innerHTML = '<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-label="' + h(c.name) + '"><div class="dhd"><div style="flex:1;min-width:0"><h2>' + h(c.name) + ' ' + tag + '</h2><small>' + h(c.contact) + ' · ' + h(c.type || '') + '</small></div><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="dbd">' + body + '</div><div class="dft">' + foot + '</div></aside>';
  }
  if (window.CACX) window.CACX.openCust = custDrawer;
  A.openCust = function (el) { custDrawer(el.dataset.id); };

  function lockView(k, fn) {
    try { Object.defineProperty(V, k, { configurable: true, enumerable: true, get: function () { return fn; }, set: function () {} }); } catch (e) { V[k] = fn; }
  }
  lockView('home', homeView);
  lockView('money', moneyView);
  lockView('paperwork', dutyView);
  lockView('inbox', homeView);   /* an old link to a removed page lands on Home */

  /* ---------- the sidebar footer label ---------- */
  function label() {
    var side = document.getElementById('side'); if (!side || document.getElementById('stLabel')) return;
    var d = document.createElement('div'); d.id = 'stLabel'; d.className = 'st-label'; d.textContent = 'CAC Starter';
    var me = side.querySelector('.me'); if (me) side.insertBefore(d, me); else side.appendChild(d);
  }

  /* ---------- keep it that way: the other layers set themselves up over the first few seconds ---------- */
  var t0 = Date.now();
  function tick() {
    quiet(); label();
    if (fixViews()) { try { UI.render(); } catch (e) {} }
    if (Date.now() - t0 < 8000) setTimeout(tick, 60);
  }
  tick();
  try { UI.render(); } catch (e) {}
  new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) prune(n); }); }); prune(document.getElementById('view')); })
    .observe(document.body, { childList: true, subtree: true });
  prune(document.body);
  window.addEventListener('hashchange', function () { var v = location.hash.replace('#', ''); if (v && !KEEP[v]) { location.hash = 'home'; } });
})();
