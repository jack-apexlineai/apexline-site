/* Presenter link. guide.html (Jack's window, never shared) sends steps here over a
   BroadcastChannel, and this window sets up the right screen. Same browser only. */
(function () {
  if (!window.BroadcastChannel) return;
  var bc = new BroadcastChannel('cac-guide');
  function UI() { return window.CACUI; }
  function A() { return UI().A; }
  function S() { return window.CS.S; }
  function el(sel) { return document.querySelector(sel); }
  function closeAll() { var b = el('#boot'); if (b) b.remove(); var tb = el('#tourBox'); if (tb && A().tourEnd) A().tourEnd(); A().close(); A().closePhone(); A().closeSide(); }
  function view(v) { A().go({ dataset: { v: v } }); }
  function thread(id) { A().openThread({ dataset: { id: id } }); }
  function live(on) { if (!!S().settings.live !== on) A().toggle({ dataset: { k: 'live' } }); }
  function fill(sel, v, tries) {
    var i = el(sel);
    if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); return; }
    if ((tries || 0) < 10) setTimeout(function () { fill(sel, v, (tries || 0) + 1); }, 60);
  }

  var RUN = {
    home: function () { closeAll(); view('home'); live(false); },
    reset: function () { closeAll(); A().reset(); live(false); view('home'); },
    startup: function () { closeAll(); view('home'); A().boot(); },
    inbox: function () { closeAll(); view('inbox'); thread('t3'); },
    liveOn: function () { live(true); },
    testwa: function () { closeAll(); view('inbox'); A().tryIt(); fill('#tryText', ''); },
    desk: function () { closeAll(); A().desk(); },
    ask: function () { closeAll(); A().ask(); fill('#askQ', 'how much is an 8 yard skip in B23?'); },
    ask2: function () { closeAll(); A().ask(); fill('#askQ', 'who owes me money?'); },
    pricebook: function () { closeAll(); view('pricebook'); },
    bundle: function () { closeAll(); view('inbox'); A().tryIt(); fill('#tryText', 'new site PE38 9AA Monday 7am: welfare unit, 20ft container, 40 heras, a toilet and an 8 yard skip'); },
    slip: function () { closeAll(); view('inbox'); thread('t4'); },
    carbon: function () { closeAll(); view('reports'); },
    credit: function () { closeAll(); view('inbox'); thread('t14'); },
    account: function () { closeAll(); view('customers'); A().newAccount(); },
    money: function () { closeAll(); view('money'); },
    sales: function () { closeAll(); view('sales'); },
    team: function () { closeAll(); A().team(); },
    today: function () { closeAll(); view('today'); },
    homeDash: function () { closeAll(); view('home'); },
    /* Gemma: the open order if there is one (fresh or part way through), else her booked order as it was left. A second order is only made after a reset. */
    gemma: function () {
      closeAll(); view('inbox');
      var th = S().threads.filter(function (x) { return x.party.type === 'customer' && x.party.id === 'c7'; });
      var open = th.filter(function (x) { return !x.done && window.CS.needsYou(x); })[0];
      thread(open ? open.id : th.length ? th[0].id : window.CACV2.gemma());
    },
    gemmaFresh: function () { closeAll(); A().reset(); live(false); view('inbox'); thread(window.CACV2.gemma()); },
    order: function () { closeAll(); A().newOrder(); },
    handbook: function () { closeAll(); view('suppliers'); },
    skips: function () { closeAll(); A().jobTab({ dataset: { v: 'skips' } }); },
    livejobs: function () { closeAll(); A().jobTab({ dataset: { v: 'live' } }); },
    wtnauto: function () { closeAll(); view('paperwork'); },
    pipeline: function () { closeAll(); view('sales'); },
    diary: function () { closeAll(); UI().ui.diary = null; view('orders'); },
    diaryWeek: function () { closeAll(); A().diaMode({ dataset: { v: 'week' } }); },
    diaryList: function () { closeAll(); A().diaMode({ dataset: { v: 'list' } }); },
    orderPage: function () { closeAll(); if (UI().ui.view !== 'orders') view('orders'); var l = window.CACV3.hist().filter(function (o) { return o.svc === 'skip' && o.off < -16; }), o = l.filter(function (x) { return x.exch; }).pop() || l.pop(); if (o) A().ordOpen({ dataset: { id: o.id } }); },
    trends: function () { closeAll(); view('trends'); },
    bills: function () { closeAll(); if (S().v3 && S().v3.bill) A().billReset(); view('bills'); },
    billsKeep: function () { closeAll(); view('bills'); },
    billSample: function () { closeAll(); if (UI().ui.view !== 'bills') view('bills'); if (!(S().v3 && S().v3.bill)) A().billSample(); },
    find: function () { closeAll(); UI().ui.find = null; view('find'); },
    scorecard: function () { closeAll(); if (UI().ui.view !== 'find') view('find'); A().supScore({ dataset: { id: 's3' } }); },
    creditctl: function () { closeAll(); view('credit'); },
    chasing: function () { closeAll(); view('chasing'); },
    connections: function () { closeAll(); view('connections'); },
    diaryMonth: function () { closeAll(); if (UI().ui.view !== 'orders') view('orders'); A().diaMode({ dataset: { v: 'month' } }); },
    customers: function () { closeAll(); view('customers'); },
    skipper: function () { closeAll(); A().ask(); fill('#askQ', 'Read my latest email about a quote'); },
    gemmaBook: function () { closeAll(); view('home'); if (window.CACGX) window.CACGX.force(); },
    hannah: function () { closeAll(); view('inbox'); thread('t3'); },
    quotes: function () { closeAll(); view('quotes'); },
    lee: function () { closeAll(); view('inbox'); thread('t15'); },
    portalInbox: function () { closeAll(); view('inbox'); var l = S().threads.filter(function (x) { return x.portalReq && !x.done; }); if (!l.length && window.CACPX) window.CACPX.demo(); l = S().threads.filter(function (x) { return x.portalReq; }); if (l.length) thread(l[l.length - 1].id); },
    unpaid: function () { closeAll(); view('home'); if (A().xu430) A().xu430(); },
    /* the customer's own page, shown at laptop size inside the demo so one shared window is enough. Hexley has the fullest paperwork. */
    portal: function () {
      closeAll();
      if (UI().VIEWS.some(function (v) { return v.k === 'portal'; })) { view('portal'); return; }   /* the Customer portal screen in the side menu */
      view('customers');
      if (window.innerWidth < 900) { var lc = el('#linkCard'); if (lc) lc.scrollIntoView(); return; }   /* on a phone the link card is shown, the page itself opens from there */
      var c = window.CS.cust('c6'), nm = (c && c.name) || 'your customer';
      el('#layer').innerHTML = '<div class="scrim" data-act="close"></div><div class="modal wide xport" role="dialog" aria-label="Customer page"><div class="mhd"><h2>What ' + window.CS.esc(nm) + ' see</h2><span class="tag">Their own page, with your logo</span><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><iframe src="portal.html?c=c6" title="Customer page"></iframe></div>';
    },
    phoneView: function () { closeAll(); A().phone(); },
    importData: function () { closeAll(); A().importOpen({ dataset: { v: 'customers' } }); },
    importSample: function () { closeAll(); A().importOpen({ dataset: { v: 'customers' } }); var b = el('[data-ai="sample"]'); if (b) b.click(); },
    custlink: function () { closeAll(); view('customers'); if (window.innerWidth >= 900) A().custLink({ dataset: { id: 'c1' } }); else { var c = el('#linkCard'); if (c) c.scrollIntoView(); } }
  };

  bc.onmessage = function (e) {
    var m = e.data || {};
    if (!UI()) return;
    if (m.type === 'ping') { bc.postMessage({ type: 'here', view: UI().ui.view }); return; }
    if (m.type === 'run' && RUN[m.act]) {
      try { window.scrollTo(0, 0); RUN[m.act](); bc.postMessage({ type: 'done', act: m.act, view: UI().ui.view }); }
      catch (err) { bc.postMessage({ type: 'error', act: m.act, msg: String(err && err.message || err) }); }
    }
  };
  /* tell an open guide this window is ready */
  setTimeout(function () { if (UI()) bc.postMessage({ type: 'here', view: UI().ui.view }); }, 400);
  window.CACG = { run: function (a) { if (RUN[a]) RUN[a](); }, acts: Object.keys(RUN) };
})();
