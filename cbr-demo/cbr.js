/* CBR edition of the office: the CBR home screen, Vans on the road, Body builds and
   the build file, the phones, the accounts package and the start-up lines for CBR.
   Loads after every other office file and before office3.js boots the app. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var pill = O.pill, head = O.head, empty = O.empty;

  /* ============================ menu ============================ */
  O.NAV = [
    { g: 'Today' },
    { id: 'home', name: 'Home', icon: '▦' },
    { id: 'live', name: 'Live view', icon: '◉' },
    { id: 'vans', name: 'Vans on the road', icon: '➤' },
    { id: 'builds', name: 'Body builds', icon: '◩' },
    { id: 'board', name: 'Workshop board', icon: '▤' },
    { id: 'planner', name: 'Day planner', icon: '▥' },
    { g: 'Work' },
    { id: 'bookin', name: 'Book in', icon: '＋' },
    { id: 'approvals', name: 'Extra work to approve', icon: '!' },
    { id: 'quotes', name: 'Repair quotes', icon: '✎' },
    { g: 'Customers and vehicles' },
    { id: 'customers', name: 'Customers', icon: '◎' },
    { id: 'vehicles', name: 'Vehicles', icon: '▣' },
    { id: 'vcal', name: 'Vehicle calendar', icon: '▦' },
    { id: 'compliance', name: 'Compliance planner', icon: '✓' },
    { g: 'Money and people' },
    { id: 'numbers', name: 'The numbers', icon: '∑' },
    { id: 'money', name: 'Money', icon: '£' },
    { id: 'stock', name: 'Parts and stock', icon: '⬚' },
    { id: 'timesheets', name: 'Timesheets', icon: '◷' },
    { id: 'reports', name: 'Reports', icon: '◈' }
  ];

  var go0 = O.go;
  O.go = WS.go = function (s) {
    go0(s);
    if (s === 'build') { var b = WS.build(O.buildId); $('topTitle').textContent = b ? b.no + ' · Body build' : 'Body builds'; }
  };
  O.openBuild = function (id) {
    O.buildId = id;
    try { sessionStorage.setItem('wsCBR:build', id); } catch (e) { }
    O.go('build');
  };
  try { O.buildId = sessionStorage.getItem('wsCBR:build') || ''; } catch (e) { }

  /* ============================ small helpers ============================ */
  function T() { return WS.day(0); }
  function initials(n) { return O.initials(n); }
  function av(name, cls) { return '<span class="cb-av ' + (cls || '') + '">' + esc(initials(name)) + '</span>'; }
  function mins(from) { return Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000)); }
  function since(from) { var m = mins(from); return m < 60 ? m + 'm' : WS.dur(m / 60); }
  function opName(id) { var o = WS.operator(id); return o ? WS.shortName(o.name) : ''; }
  function vanJobs(fid) {
    return WS.state.jobs.filter(function (j) { return j.date === T() && j.bay === 'Mobile van' && j.fitterId === fid; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function vanEngineers() { return WS.state.settings.fitters.filter(function (f) { return f.mobile; }); }
  function unassignedCalls() {
    return WS.state.jobs.filter(function (j) { return j.date === T() && !j.fitterId && j.site && j.status !== 'done'; });
  }
  O.vanStage = function (j) {
    if (j.status === 'done') return 'done';
    if (j.status === 'waiting_auth') return 'waiting';
    return (j.van && j.van.stage) || 'booked';
  };
  var STAGE_TXT = { booked: ['To do', ''], on_way: ['On the way', 'go'], on_site: ['On site', 'go'], working: ['Working', 'go'], waiting: ['Waiting on customer', 'warn'], done: ['Done and signed', 'ok'] };
  function stagePill(j) { var s = STAGE_TXT[O.vanStage(j)] || ['', '']; return pill(s[0], s[1]); }
  function currentCall(fid) {
    var l = vanJobs(fid);
    return l.filter(function (j) { var s = O.vanStage(j); return s !== 'booked' && s !== 'done'; })[0] || null;
  }
  function liveBuilds() { return (WS.state.builds || []).filter(function (b) { var i = WS.stageIx(b.stage); return i >= WS.stageIx('ordered') && i <= WS.stageIx('pdi'); }); }
  function inBuild() { return (WS.state.builds || []).filter(function (b) { var i = WS.stageIx(b.stage); return i >= WS.stageIx('chassis') && i <= WS.stageIx('pdi'); }); }
  function money() {
    var st = WS.state, ready = st.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; });
    var readyVal = ready.reduce(function (s, j) { return s + (WS.quoteJob(j).net || 0); }, 0);
    var unpaid = st.invoices.filter(function (i) { return !i.paid; });
    var owed = unpaid.reduce(function (s, i) { return s + i.total; }, 0);
    var late = unpaid.filter(function (i) { return i.due < T(); });
    var lateVal = late.reduce(function (s, i) { return s + i.total; }, 0);
    var todayX = st.invoices.filter(function (i) { return i.xeroExported && i.xeroExported.slice(0, 10) === T(); }).length;
    return { ready: ready, readyVal: readyVal, owed: owed, unpaid: unpaid.length, late: late.length, lateVal: lateVal, todayX: todayX };
  }
  function acc() { return (WS.state.settings.accounts || 'Xero'); }
  O.acc = acc;
  function stageBar(b) {
    var si = WS.stageIx(b.stage), n = WS.BUILD_STAGES.length;
    var out = '<div class="cb-steps" aria-label="Stage ' + (si + 1) + ' of ' + n + '">';
    WS.BUILD_STAGES.forEach(function (s, i) { out += '<i class="' + (i < si ? 'd' : i === si ? 'c' : '') + '" title="' + esc(s.name) + '"></i>'; });
    return out + '</div>';
  }
  function hoursChip(b) {
    var m = WS.buildMoney(b), over = WS.buildOver(b);
    if (!m.started) return '<span class="cb-hc">' + WS.dur(m.hoursQuoted) + ' quoted</span>';
    return '<span class="cb-hc ' + (over.length ? 'bad' : 'ok') + '">' + WS.dur(m.hoursBooked) + ' of ' + WS.dur(m.hoursQuoted) + '</span>';
  }
  function chassisLate(b) {
    return b.stage === 'ordered' && b.chassis && !b.chassis.arrived && b.chassis.due && b.chassis.due < T();
  }

  /* ============================ needs you ============================ */
  O.cbrNeeds = function () {
    var st = WS.state, out = [];
    st.approvals.filter(function (a) { return a.status === 'Sent'; }).forEach(function (a) {
      var o = WS.operator(a.operatorId);
      out.push({ t: (o ? o.contact.split(' ')[0] + ' at ' + WS.shortName(o.name) : 'A customer') + ' has not answered ' + a.raisedBy.split(' ')[0] + '\'s extra work yet: ' + a.title.toLowerCase(), s: 'sent ' + since(a.sentAt) + ' ago', go: 'approvals', cls: 'warn' });
    });
    unassignedCalls().forEach(function (j) {
      out.push({ t: (j.priority === 'high' ? 'Breakdown' : 'Call out') + ' at ' + j.site.name + ' not given to a van yet', s: opName(j.operatorId), go: 'vans', cls: 'bad' });
    });
    (st.builds || []).forEach(function (b) {
      if (chassisLate(b)) out.push({ t: b.no + ': ' + opName(b.operatorId) + '\'s chassis is ' + WS.daysBetween(b.chassis.due, T()) + ' days late', s: b.chassis.late || '', build: b.id, cls: 'bad' });
      var over = WS.buildOver(b);
      if (over.length && b.stage !== 'delivered') {
        var k = over[0], q = b.hoursQuoted[k], h = WS.buildHours(b, k);
        out.push({ t: b.no + ': ' + WS.stageShort(k).toLowerCase() + ' ran ' + WS.dur(h - q) + ' over the quote', s: 'margin now ' + Math.round(WS.buildMoney(b).projPct) + '%, quoted at ' + Math.round(WS.buildMoney(b).quotePct) + '%', build: b.id, cls: 'warn' });
      }
      if (b.stage === 'quoted' && b.quoteSent && WS.daysBetween(b.quoteSent.slice(0, 10), T()) >= 3) out.push({ t: b.no + ': quote to ' + opName(b.operatorId) + ' sent ' + WS.daysBetween(b.quoteSent.slice(0, 10), T()) + ' days ago, no answer', s: 'worth ' + WS.money0(b.price) + ' before VAT', build: b.id, cls: 'go' });
      if (b.stage === 'enquiry') out.push({ t: b.no + ': new build enquiry from ' + opName(b.operatorId), s: b.notes, build: b.id, cls: 'go' });
    });
    var m = money();
    if (m.ready.length) out.push({ t: m.ready.length + ' finished jobs not invoiced yet, worth ' + WS.money0(m.readyVal), s: 'one click each, straight into ' + acc(), go: 'invoices', cls: 'ok' });
    (st.vans || []).forEach(function (v) {
      var low = v.stock.filter(function (p) { return p.qty < p.min; }).length;
      if (low) out.push({ t: v.name + ' is low on ' + low + ' part' + (low > 1 ? 's' : ''), s: 'restock from the stores tonight', vanstock: 1, cls: 'warn' });
    });
    return out;
  };

  /* ============================ home: CBR this morning ============================ */
  S.home = function () {
    var st = WS.state, today = WS.jobsOn(T());
    var shop = today.filter(function (j) { return j.bay !== 'Mobile van' && j.type !== 'Workshop duties' && j.type !== 'Collection / delivery'; });
    var shopOn = shop.filter(function (j) { return j.status === 'in_progress'; }).length;
    var shopWait = shop.filter(function (j) { return j.status === 'waiting_parts' || j.status === 'waiting_auth'; }).length;
    var engs = vanEngineers();
    var calls = today.filter(function (j) { return j.bay === 'Mobile van' && j.fitterId; });
    var callsLeft = calls.filter(function (j) { return j.status !== 'done'; }).length;
    var onSite = engs.filter(function (f) { var c = currentCall(f.id); return c && O.vanStage(c) !== 'on_way'; }).length;
    var lb = liveBuilds(), over = lb.filter(function (b) { return WS.buildOver(b).length; }).length;
    var orderBook = lb.reduce(function (s, b) { return s + b.price; }, 0);
    var m = money();
    var hr = new Date().getHours();

    var tiles = '<div class="cb-tiles">' +
      tile('Workshop', shop.length, 'jobs in today', shopOn + ' being worked on' + (shopWait ? ', ' + shopWait + ' waiting' : ''), 'live', 'wk') +
      tile('Vans on the road', engs.length, 'vans out', onSite + ' on site · ' + callsLeft + ' call outs to do', 'vans', 'van') +
      tile('Body builds', lb.length, 'on the go', WS.money0(orderBook) + ' order book' + (over ? ' · ' + over + ' over on hours' : ''), 'builds', 'bld', over ? 'warn' : '') +
      tile('Ready to invoice', WS.money0(m.readyVal), m.ready.length + (m.ready.length === 1 ? ' job done' : ' jobs done'), WS.money0(m.owed) + ' owed to CBR · ' + WS.money0(m.lateVal) + ' overdue', 'numbers', 'mon', 'ok') +
      '</div>';

    var vans = '<div class="card cb-card"><div class="ch"><h2>Vans on the road</h2><span class="cb-live"><i></i>Live</span><div class="sp"><button class="btn alt sm" data-go="vans">All call outs</button></div></div>' +
      engs.map(function (f) {
        var v = (st.vans || []).filter(function (x) { return x.engineer === f.id; })[0] || {}, c = currentCall(f.id), l = vanJobs(f.id);
        var done = l.filter(function (j) { return j.status === 'done'; }).length;
        var now = c ? (O.vanStage(c) === 'on_way'
          ? 'On the way to <b>' + esc(c.site.name) + '</b>' + (c.van.eta ? ', there about ' + WS.timeUK(c.van.eta) : '')
          : O.vanStage(c) === 'waiting' ? 'At <b>' + esc(c.site.name) + '</b>, waiting on the customer to approve extra work'
          : 'At <b>' + esc(c.site.name) + '</b>, ' + esc(c.site.town) + ' · on site ' + since(c.van.arrivedAt || c.createdAt))
          : (l.length && done === l.length ? 'All done for today' : l.length ? 'Next: ' + esc(l.filter(function (j) { return j.status !== 'done'; })[0].site.name) : 'Nothing booked');
        return '<button type="button" class="cb-vanrow" data-van="' + f.id + '">' + av(f.name, 'van') +
          '<span class="cb-vt"><b>' + esc(v.name || 'Van') + ' · ' + esc(f.name) + '</b><span>' + now + '</span></span>' +
          '<span class="cb-vr">' + (c ? stagePill(c) : '') + '<span class="muted sm">' + done + ' of ' + l.length + ' done</span></span></button>';
      }).join('') + '</div>';

    var builds = '<div class="card cb-card"><div class="ch"><h2>Body builds</h2><div class="sp"><button class="btn alt sm" data-go="builds">All builds</button></div></div>' +
      lb.map(function (b) {
        return '<button type="button" class="cb-brow" data-build="' + b.id + '"><span class="cb-bno">' + esc(b.no) + '</span>' +
          '<span class="cb-bt"><b>' + esc(opName(b.operatorId)) + '</b><span>' + esc(WS.stageName(b.stage)) + (chassisLate(b) ? ' · <em class="bad">chassis late</em>' : '') + '</span>' + stageBar(b) + '</span>' +
          '<span class="cb-br">' + hoursChip(b) + '<span class="muted sm">due ' + WS.dateShort(b.due) + '</span></span></button>';
      }).join('') + '</div>';

    var needs = O.cbrNeeds();
    var needsHtml = '<div class="card cb-card"><div class="ch"><h2>Needs you</h2><span class="cb-count">' + needs.length + '</span></div>' +
      (needs.length ? '<ul class="feed cb-needs">' + needs.slice(0, O.needsAll ? 99 : 5).map(function (a, i) {
        return '<li role="button" tabindex="0" data-need="' + i + '"><div class="ic ' + a.cls + '">!</div><div style="min-width:0"><div class="t">' + esc(a.t) + '</div>' +
          (a.s ? '<div class="s">' + esc(a.s) + '</div>' : '') + '</div><div class="w">Open ›</div></li>';
      }).join('') + '</ul>' + (needs.length > 5 ? '<button type="button" class="btn alt sm cb-more" id="cbMore">' + (O.needsAll ? 'Show fewer' : 'Show all ' + needs.length) + '</button>' : '') : empty('Nothing needs you. Have a brew.')) + '</div>';

    var shopHtml = '<div class="card cb-card"><div class="ch"><h2>Workshop now</h2><div class="sp"><button class="btn alt sm" data-go="live">Live view</button></div></div>' +
      '<div class="cb-bays">' + st.settings.fitters.filter(function (f) { return !f.mobile; }).map(function (f) {
        var plan = WS.dayPlan(f.id, T()), live = plan.filter(function (j) { return j.status === 'in_progress' || j.status === 'waiting_parts'; })[0];
        var v = live ? WS.vehicle(live.vehicleId) : null, p = live ? WS.jobProgress(live) : null;
        return '<button type="button" class="cb-bay" data-job="' + (live ? live.id : '') + '">' + av(f.name) + '<span class="cb-bt"><b>' + esc(f.name) + '</b>' +
          '<span>' + (live ? (live.status === 'waiting_parts' ? 'Waiting on parts · ' : '') + esc(live.type) + ' · <span class="reg sm">' + esc(v ? v.reg : '') + '</span>' : plan.length ? plan.length + ' job' + (plan.length > 1 ? 's' : '') + ' planned' : 'Free') + '</span>' +
          (p ? '<span class="cb-prog"><i class="' + WS.progressCls(p.state) + '" style="width:' + Math.min(100, Math.round(p.pct)) + '%"></i></span>' : '') + '</span></button>';
      }).join('') +
      inBuild().filter(function (b) { return (b.labour || []).some(function (l) { return l.start && l.hours == null; }); }).map(function (b) {
        var l = b.labour.filter(function (x) { return x.start && x.hours == null; })[0];
        return '<button type="button" class="cb-bay" data-build="' + b.id + '">' + av(l.who, 'bld') + '<span class="cb-bt"><b>' + esc(l.who) + '</b><span>' + esc(b.no) + ' · ' + esc(WS.stageShort(l.stage)) + ' · on it ' + since(l.start) + '</span></span></button>';
      }).join('') + '</div></div>';

    var feed = O.cbrFeed(6);
    var feedHtml = '<div class="card cb-card"><div class="ch"><h2>As it happens</h2><span class="cb-live"><i></i>Live</span></div>' +
      (feed.length ? '<ul class="cb-feed">' + feed.map(function (e) {
        return '<li><span class="cb-ft">' + WS.timeUK(e.at) + '</span><span class="cb-fx"><b>' + esc(e.who) + '</b> ' + esc(e.what) + (e.ref ? ' <span class="muted">· ' + esc(e.ref) + '</span>' : '') + '</span></li>';
      }).join('') + '</ul>' : empty('Quiet so far today.')) + '</div>';

    var who = WS.greetName ? WS.greetName() : '';
    return '<div class="cb-hero"><div class="cb-hl">' + WS.logoHtml('cb-hlogo') + '<div><h1>' + esc(WS.greeting ? WS.greeting(who) : 'Good morning') + '.</h1>' +
      '<div class="sub">' + esc(WS.dayName(T())) + ' · CBR at a glance, from the jobs, the vans and the build hall. Nobody typed this up.</div></div></div>' +
      '<div class="cb-ha"><button class="btn alt" id="cbNewCall">New call out</button><button class="btn alt" id="cbNewBuild">New build enquiry</button><button class="btn" data-go="bookin">Book a lorry in</button></div></div>' +
      tiles +
      '<div class="cb-cols"><div>' + vans + builds + shopHtml + '</div><div>' + needsHtml + feedHtml + '</div></div>';

    function tile(k, v, unit, foot, go, ic, cls) {
      return '<button type="button" class="cb-tile ' + ic + '" data-go="' + go + '"><span class="cb-tk">' + esc(k) + '</span>' +
        '<span class="cb-tv ' + (cls || '') + '">' + esc(String(v)) + '<small>' + esc(unit) + '</small></span><span class="cb-tf">' + esc(foot) + '</span></button>';
    }
  };
  W.home = function () {
    O.wireGo();
    wireRows();
    var nc = $('cbNewCall'); if (nc) nc.onclick = function () { O.newCall(); };
    var nb = $('cbNewBuild'); if (nb) nb.onclick = function () { O.newBuild(); };
    var mr = $('cbMore'); if (mr) mr.onclick = function () { O.needsAll = !O.needsAll; O.render(); };
    var needs = O.cbrNeeds();
    document.querySelectorAll('[data-need]').forEach(function (li) {
      var open = function () {
        var a = needs[+li.dataset.need];
        if (!a) return;
        if (a.build) O.openBuild(a.build); else if (a.vanstock) O.vanStock(); else O.go(a.go);
      };
      li.onclick = open;
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
  };
  function wireRows() {
    document.querySelectorAll('[data-build]').forEach(function (b) { b.onclick = function () { O.openBuild(b.dataset.build); }; });
    document.querySelectorAll('[data-van]').forEach(function (b) { b.onclick = function () { O.cbrPhone('van', b.dataset.van); }; });
    document.querySelectorAll('[data-job]').forEach(function (b) {
      b.onclick = function () { if (b.dataset.job) O.jobCard(b.dataset.job); else O.go('planner'); };
    });
  }

  /* everything that happened today, newest first: job cards, builds, approvals */
  O.cbrFeed = function (n) {
    var st = WS.state, out = [], t = T();
    st.jobs.forEach(function (j) {
      if (j.date !== t) return;
      var v = WS.vehicle(j.vehicleId);
      (j.audit || []).forEach(function (a) { if (a.at && a.at.slice(0, 10) === t && a.who !== 'Office') out.push({ at: a.at, who: a.who, what: lower(a.what), ref: j.site ? j.site.name : v ? v.reg : j.no }); });
    });
    (st.builds || []).forEach(function (b) {
      (b.log || []).forEach(function (a) { if (a.at && a.at.slice(0, 10) === t) out.push({ at: a.at, who: a.who, what: lower(a.what), ref: b.no }); });
      (b.photos || []).forEach(function (p) { if (p.at && p.at.slice(0, 10) === t) out.push({ at: p.at, who: p.by, what: 'added a photo: ' + lower(p.caption || ''), ref: b.no }); });
    });
    st.approvals.forEach(function (a) { if (a.decidedAt && a.decidedAt.slice(0, 10) === t) out.push({ at: a.decidedAt, who: a.decidedBy || 'Customer', what: lower(a.status) + ' the extra work: ' + lower(a.title), ref: opName(a.operatorId) }); });
    return out.sort(function (a, b) { return b.at.localeCompare(a.at); }).slice(0, n || 10);
  };
  function lower(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }

  /* ============================ vans on the road ============================ */
  S.vans = function () {
    var st = WS.state, engs = vanEngineers(), un = unassignedCalls();
    var calls = WS.jobsOn(T()).filter(function (j) { return j.bay === 'Mobile van' && j.fitterId; });
    var lowAll = (st.vans || []).reduce(function (s, v) { return s + v.stock.filter(function (p) { return p.qty < p.min; }).length; }, 0);
    return head('Vans on the road', engs.length + ' vans · ' + calls.length + ' call outs today · ' + calls.filter(function (j) { return j.status === 'done'; }).length + ' done',
      '<button class="btn alt" id="cbStock">Van stock' + (lowAll ? ' <span class="cb-badge">' + lowAll + ' low</span>' : '') + '</button><button class="btn" id="cbNewCall">New call out</button>') +
      (un.length ? '<div class="card cb-un"><div class="ch"><h2>Not given to a van yet</h2><span class="cb-count bad">' + un.length + '</span></div>' +
        un.map(function (j) {
          var v = WS.vehicle(j.vehicleId);
          return '<div class="cb-unrow"><div class="cb-unt">' + (j.priority === 'high' ? pill('Urgent', 'bad') + ' ' : '') + '<b>' + esc(j.site.name) + '</b> · ' + esc(opName(j.operatorId)) +
            (v ? ' · <span class="reg sm">' + esc(v.reg) + '</span>' : '') + '<div class="muted sm">' + esc(j.notes) + '</div></div>' +
            '<div class="cb-give"><span class="muted sm">Give to</span>' + engs.map(function (f) {
              var left = vanJobs(f.id).filter(function (x) { return x.status !== 'done'; }).length;
              return '<button class="btn alt sm" data-give="' + j.id + '" data-to="' + f.id + '">' + esc(f.name.split(' ')[0]) + ' <span class="muted">' + left + ' left</span></button>';
            }).join('') + '</div></div>';
        }).join('') + '</div>' : '') +
      '<div class="cb-vans">' + engs.map(function (f) {
        var v = (st.vans || []).filter(function (x) { return x.engineer === f.id; })[0] || { stock: [] }, l = vanJobs(f.id), c = currentCall(f.id);
        var low = v.stock.filter(function (p) { return p.qty < p.min; }).length;
        var hrs = l.reduce(function (s, j) { return s + WS.hoursOn(j); }, 0);
        return '<div class="card cb-van"><div class="cb-vh">' + av(f.name, 'van') + '<div style="min-width:0"><b>' + esc(v.name) + ' · ' + esc(f.name) + '</b>' +
          '<div class="muted sm"><span class="reg sm">' + esc(v.reg || '') + '</span> · ' + WS.dur(hrs) + ' on jobs today' + (low ? ' · <span class="cb-lowt">' + low + ' part' + (low > 1 ? 's' : '') + ' low</span>' : '') + '</div></div>' +
          '<button class="btn alt sm" data-phone="' + f.id + '" title="See what ' + esc(f.name.split(' ')[0]) + ' sees">Phone</button></div>' +
          (c ? '<div class="cb-now ' + O.vanStage(c) + '"><div class="cb-nk">Now</div><div><b>' + esc(STAGE_TXT[O.vanStage(c)][0]) + '</b> · ' + esc(c.site.name) + ', ' + esc(c.site.town) +
            '<div class="muted sm">' + (O.vanStage(c) === 'on_way' ? 'Set off ' + WS.timeUK(c.van.setOff) + (c.van.eta ? ' · there about ' + WS.timeUK(c.van.eta) : '') : 'On site since ' + WS.timeUK(c.van.arrivedAt || c.createdAt) + ' · ' + since(c.van.arrivedAt || c.createdAt)) + '</div></div></div>'
            : '<div class="cb-now idle"><div class="cb-nk">Now</div><div>' + (l.length ? 'Between jobs' : 'Nothing booked') + '</div></div>') +
          '<ol class="cb-calls">' + (l.length ? l.map(function (j) {
            var veh = WS.vehicle(j.vehicleId), s = O.vanStage(j);
            return '<li class="' + s + '"><button type="button" data-job="' + j.id + '"><span class="cb-cd"></span><span class="cb-ct"><b>' + esc(j.site.name) + '</b>' +
              '<span class="muted sm">' + esc(opName(j.operatorId)) + (veh ? ' · ' + esc(veh.reg) : '') + '</span><span class="sm">' + esc(j.notes) + '</span></span>' +
              '<span class="cb-cr">' + stagePill(j) + (j.van && j.van.sign && j.van.sign.name ? '<span class="muted sm">signed ' + esc(j.van.sign.name.split(' ')[0]) + '</span>' : '') + '</span></button></li>';
          }).join('') : '<li class="none">No call outs yet. Give one from above.</li>') + '</ol></div>';
      }).join('') + '</div>' +
      '<div class="hint cb-hint">Where each van is comes from the engineer\'s phone: on the way, arrived, working, done. GPS tracking is not in this build; it can be added later from a tracker you choose.</div>';
  };
  W.vans = function () {
    O.wireGo();
    wireRows();
    $('cbNewCall').onclick = function () { O.newCall(); };
    $('cbStock').onclick = function () { O.vanStock(); };
    document.querySelectorAll('[data-phone]').forEach(function (b) { b.onclick = function () { O.cbrPhone('van', b.dataset.phone); }; });
    document.querySelectorAll('[data-give]').forEach(function (b) {
      b.onclick = function () { O.giveCall(b.dataset.give, b.dataset.to); };
    });
  };
  O.giveCall = function (jobId, fid) {
    var j = WS.job(jobId), f = WS.fitter(fid);
    if (!j || !f) return;
    j.fitterId = f.id;
    j.bay = 'Mobile van';
    j.order = vanJobs(f.id).length;
    j.van = j.van || { stage: 'booked' };
    WS.audit(j, 'Office', 'Given to ' + f.name + ' in ' + ((WS.van(f.van) || {}).name || 'the van'));
    WS.save();
    O.render();
    WS.toast('On ' + f.name.split(' ')[0] + '\'s phone now, with the site, the fault and the customer\'s number.', 'ok');
  };

  O.newCall = function () {
    var st = WS.state, engs = vanEngineers();
    var body = '<div class="grid g2">' +
      '<label class="f"><span class="lb">Customer</span><select class="in" id="ncOp">' + st.operators.map(function (o) { return '<option value="' + o.id + '">' + esc(o.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">Vehicle</span><select class="in" id="ncVeh"></select></label>' +
      '<label class="f"><span class="lb">Where is it</span><input class="in" id="ncSite" placeholder="Yard, quarry or lay by"></label>' +
      '<label class="f"><span class="lb">Town</span><input class="in" id="ncTown" placeholder="Town"></label></div>' +
      '<label class="f" style="margin-top:12px"><span class="lb">What is wrong</span><textarea class="in" id="ncWhat" rows="3" placeholder="What the driver says"></textarea></label>' +
      '<div class="grid g2" style="margin-top:12px"><label class="f"><span class="lb">How urgent</span><select class="in" id="ncPri"><option value="normal">Today</option><option value="high">Off the road, go now</option></select></label>' +
      '<label class="f"><span class="lb">Give to</span><select class="in" id="ncTo"><option value="">Decide later</option>' + engs.map(function (f) {
        return '<option value="' + f.id + '">' + esc(f.name) + ' (' + vanJobs(f.id).filter(function (x) { return x.status !== 'done'; }).length + ' left)</option>';
      }).join('') + '</select></label></div>' +
      '<div class="hint" style="margin-top:12px">The engineer gets it on their phone straight away, with the site and the customer\'s contact.</div>';
    O.modal('New call out', body, 'Book the call out', function () {
      var site = $('ncSite').value.trim(), what = $('ncWhat').value.trim();
      if (!site || !what) { WS.toast('Put in where it is and what is wrong.', 'bad'); return; }
      var op = $('ncOp').value, vid = $('ncVeh').value, n = 2100 + st.jobs.length;
      var j = {
        id: WS.uid('j'), no: 'JC' + n, vehicleId: vid, operatorId: op, type: 'Roadside callout', date: T(), bay: 'Mobile van', fitterId: '',
        estHours: 2, order: 99, priority: $('ncPri').value, source: 'Phone call', status: 'booked',
        tasks: ['Safety check on arrival', 'Find the fault', 'Repair', 'Test', 'Customer signs off'].map(function (t, i) { return { id: 't' + i, text: t, done: false }; }),
        notes: what, parts: [], clockOns: [], photos: [], inspection: null, defects: [], qc: null, invoiceId: '', createdAt: WS.nowStamp(),
        audit: [{ at: WS.nowStamp(), who: 'Office', what: 'Call out booked from a phone call' }],
        site: { name: site, town: $('ncTown').value.trim() || '', postcode: '' }, van: { stage: 'booked' }
      };
      st.jobs.push(j);
      var to = $('ncTo').value;
      O.closeModal();
      if (to) O.giveCall(j.id, to); else { WS.save(); O.go('vans'); WS.toast('Call out booked. Give it to a van when you are ready.', 'ok'); }
    }, 'wide');
    function vehs() {
      $('ncVeh').innerHTML = WS.vehiclesOf($('ncOp').value).map(function (v) { return '<option value="' + v.id + '">' + esc(v.reg + ' · ' + v.type) + '</option>'; }).join('');
    }
    $('ncOp').onchange = vehs;
    vehs();
  };

  O.vanStock = function () {
    var st = WS.state;
    var body = '<div class="cb-stockgrid">' + (st.vans || []).map(function (v) {
      var f = WS.fitter(v.engineer);
      return '<div class="cb-stockcol"><h3>' + esc(v.name) + ' <span class="muted sm">' + esc(f ? f.name : '') + '</span></h3><table class="tbl fitsm"><thead><tr><th>Part</th><th class="num">In van</th><th class="num">Keep</th></tr></thead><tbody>' +
        v.stock.map(function (p) {
          var low = p.qty < p.min;
          return '<tr class="' + (low ? 'cb-lowr' : '') + '"><td>' + esc(p.name) + '<div class="muted sm">' + esc(p.partNo) + '</div></td><td class="num"><b>' + p.qty + '</b></td><td class="num">' + p.min + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }).join('') + '</div><div class="hint" style="margin-top:12px">Parts come off the van when the engineer adds them to a job on their phone, so the van count and the invoice always match.</div>';
    var low = (st.vans || []).reduce(function (s, v) { return s + v.stock.filter(function (p) { return p.qty < p.min; }).length; }, 0);
    O.modal('Van stock', body, low ? 'Restock the vans from the stores' : null, function () {
      var lines = 0;
      st.vans.forEach(function (v) {
        v.stock.forEach(function (p) {
          if (p.qty >= p.min) return;
          var need = p.min - p.qty + 1, shelf = WS.stockByName(p.name);
          if (shelf) shelf.qty = Math.max(0, shelf.qty - need);
          p.qty += need;
          lines++;
        });
      });
      WS.save();
      O.closeModal();
      O.render();
      WS.toast(lines + ' lines picked from the stores and put on the vans. Stores stock updated.', 'ok');
    }, 'wide');
  };

  /* ============================ body builds ============================ */
  var COLS = [
    { k: 'pipe', name: 'Enquiries and quotes', st: ['enquiry', 'quoted'] },
    { k: 'order', name: 'Ordered, chassis due', st: ['ordered'] },
    { k: 'hall', name: 'In the build hall', st: ['chassis', 'subframe', 'fab', 'paint', 'fitout'] },
    { k: 'hand', name: 'Handover', st: ['pdi'] },
    { k: 'done', name: 'Delivered', st: ['delivered'] }
  ];
  S.builds = function () {
    var st = WS.state, all = st.builds || [], lb = liveBuilds();
    var weekH = 0, ws = WS.weekStart(0);
    all.forEach(function (b) { (b.labour || []).forEach(function (l) { if (WS.parse(l.date) >= ws) weekH += l.hours != null ? l.hours : WS.buildHours({ labour: [l] }); }); });
    var over = lb.filter(function (b) { return WS.buildOver(b).length; }).length;
    var pipe = all.filter(function (b) { return b.stage === 'enquiry' || b.stage === 'quoted'; }).reduce(function (s, b) { return s + b.price; }, 0);
    return head('Body builds', lb.length + ' on the go · ' + WS.money0(lb.reduce(function (s, b) { return s + b.price; }, 0)) + ' order book',
      '<button class="btn" id="cbNewBuild">New build enquiry</button>') +
      '<div class="grid g4 cb-kpis">' +
      O.stat('In the build hall', inBuild().length, 'chassis in, being built') +
      O.stat('Order book', WS.money0(lb.reduce(function (s, b) { return s + b.price; }, 0)), 'ordered and in build, before VAT', 'ok') +
      O.stat('Quoted, not won yet', WS.money0(pipe), 'enquiries and quotes out') +
      O.stat('Over on hours', over, over ? 'look before it costs more' : 'all on budget', over ? 'warn' : 'ok') +
      '</div>' +
      '<div class="cb-board">' + COLS.map(function (c) {
        var list = all.filter(function (b) { return c.st.indexOf(b.stage) >= 0; });
        return '<div class="cb-col"><div class="cb-colh"><b>' + esc(c.name) + '</b><span>' + list.length + '</span></div>' +
          (list.length ? list.map(card).join('') : '<div class="cb-colnone">Nothing here</div>') + '</div>';
      }).join('') + '</div>' +
      '<div class="muted sm" style="margin-top:6px">Week to date: ' + WS.dur(weekH) + ' booked to builds by the build team. Hours come from their phones, by stage.</div>';
    function card(b) {
      var m = WS.buildMoney(b), last = (b.photos || []).slice(-1)[0];
      return '<button type="button" class="cb-bcard" data-build="' + b.id + '">' +
        (last ? '<img class="cb-bimg" src="' + WS.photoSrc(last.art || last.src) + '" alt="">' : '') +
        '<span class="cb-bci"><span class="cb-bch"><b>' + esc(b.no) + '</b>' + (chassisLate(b) ? pill('Chassis late', 'bad') : WS.buildOver(b).length ? pill('Over on hours', 'warn') : '') + '</span>' +
        '<span class="cb-bcc">' + esc(opName(b.operatorId)) + '</span><span class="muted sm">' + esc(b.title) + '</span>' + stageBar(b) +
        '<span class="cb-bcf"><span>' + esc(WS.stageShort(b.stage)) + '</span>' + hoursChip(b) + '<span>' + WS.money0(m.price) + '</span></span></span></button>';
    }
  };
  W.builds = function () {
    O.wireGo();
    wireRows();
    $('cbNewBuild').onclick = function () { O.newBuild(); };
  };

  /* ---------------- one build ---------------- */
  S.build = function () {
    var b = WS.build(O.buildId);
    if (!b) return S.builds();
    var o = WS.operator(b.operatorId), m = WS.buildMoney(b), si = WS.stageIx(b.stage), over = WS.buildOver(b);
    var nextSt = WS.BUILD_STAGES[si + 1];
    var running = (b.labour || []).filter(function (l) { return l.start && l.hours == null; });
    var dep = WS.state.invoices.filter(function (i) { return i.buildId === b.id; });
    var depDone = dep.some(function (i) { return /deposit/.test((i.lines || [{}])[0].desc); });
    var balDone = dep.some(function (i) { return /balance/.test((i.lines || [{}])[0].desc); });
    var invBtn = !depDone && si >= WS.stageIx('quoted') ? '<button class="btn alt" id="bdInvDep">Raise deposit invoice</button>' :
      !balDone && si >= WS.stageIx('pdi') ? '<button class="btn alt" id="bdInvBal">Raise balance invoice</button>' : '';

    var stepper = '<div class="cb-stepper">' + WS.BUILD_STAGES.map(function (s, i) {
      var d = b.stageDates && b.stageDates[s.k];
      return '<div class="cb-sx ' + (i < si ? 'd' : i === si ? 'c' : '') + '"><i>' + (i < si ? '✓' : i + 1) + '</i><b>' + esc(s.short) + '</b><span>' + (d && i <= si ? WS.dateShort(d) : i === WS.BUILD_STAGES.length - 1 ? 'due ' + WS.dateShort(b.due) : '') + '</span></div>';
    }).join('') + '</div>';

    var hours = '<div class="card"><div class="ch"><h2>Hours against the quote</h2><div class="sp">' + (running.length ? '<span class="cb-live"><i></i>' + esc(running[0].who.split(' ')[0]) + ' on it now</span>' : '') + '<button class="btn alt sm" id="bdHours">Add hours</button></div></div>' +
      '<div class="cb-hbars">' + WS.WORK_STAGES.map(function (k) {
        var q = b.hoursQuoted[k] || 0, h = WS.buildHours(b, k), ki = WS.stageIx(k);
        if (!q && !h) return '';
        var pct = q ? Math.min(140, h / q * 100) : 100, cls = h > q * 1.05 ? 'bad' : ki < si ? 'ok' : 'go';
        return '<div class="cb-hb"><span class="cb-hn">' + esc(WS.stageShort(k)) + '</span><span class="cb-ht"><i class="' + cls + '" style="width:' + (pct / 1.4) + '%"></i><em style="left:' + (100 / 1.4) + '%"></em></span>' +
          '<span class="cb-hv ' + (h > q * 1.05 ? 'bad' : '') + '">' + WS.dur(h) + ' <span class="muted">of ' + WS.dur(q) + '</span></span></div>';
      }).join('') + '</div><div class="cb-htot"><span>Total</span><b class="' + (over.length ? 'bad' : '') + '">' + WS.dur(m.hoursBooked) + '</b><span class="muted">of ' + WS.dur(m.hoursQuoted) + ' quoted</span></div></div>';

    var mats = '<div class="card"><div class="ch"><h2>Materials against budget</h2></div><div class="tablewrap"><table class="tbl fitsm"><thead><tr><th>What</th><th class="num">Budget</th><th class="num">Spent</th></tr></thead><tbody>' +
      b.materials.map(function (x) {
        return '<tr><td>' + esc(x.item) + (x.supplier ? '<div class="muted sm">' + esc(x.supplier) + '</div>' : '') + '</td><td class="num">' + WS.money0(x.budget) + '</td><td class="num ' + (x.actual > x.budget * 1.03 ? 'bad' : '') + '">' + (x.actual ? WS.money0(x.actual) : '<span class="muted">not yet</span>') + '</td></tr>';
      }).join('') + '<tr class="cb-trow"><td>Total</td><td class="num">' + WS.money0(m.budget) + '</td><td class="num">' + WS.money0(m.spent) + '</td></tr></tbody></table></div></div>';

    var moneyHtml = '<div class="card cb-margin"><div class="ch"><h2>Where the money is</h2></div>' +
      '<div class="cb-mrow"><span>Price</span><b>' + WS.money0(m.price) + '</b></div>' +
      '<div class="cb-mrow"><span>Margin when quoted</span><b>' + WS.money0(m.quoteMargin) + ' <span class="muted">' + Math.round(m.quotePct) + '%</span></b></div>' +
      '<div class="cb-mrow big ' + (m.projPct < m.quotePct - 2 ? 'bad' : 'ok') + '"><span>Margin if it finishes like this</span><b>' + WS.money0(m.projMargin) + ' <span>' + Math.round(m.projPct) + '%</span></b></div>' +
      '<div class="muted sm">Hours at ' + WS.money0(WS.BUILD_COST_RATE) + ' an hour all in, plus materials. Stages not started are counted at their quoted hours.</div>' +
      (dep.length ? '<div class="cb-invs">' + dep.map(function (i) {
        return '<button type="button" class="cb-inv" data-inv="' + i.id + '"><b>' + esc(i.no) + '</b><span>' + esc((i.lines[0] || {}).desc.split(', ').pop()) + '</span><span>' + WS.money0(i.total) + '</span>' +
          pill(i.paid ? 'Paid' : i.xeroExported ? 'In ' + acc() : 'Draft', i.paid ? 'ok' : i.xeroExported ? 'go' : '') + '</button>';
      }).join('') + '</div>' : '') + '</div>';

    var ch = b.chassis || {};
    var chassisHtml = '<div class="card"><div class="ch"><h2>Chassis</h2>' + (ch.arrived ? pill('In since ' + WS.dateShort(ch.arrived), 'ok') : chassisLate(b) ? pill(WS.daysBetween(ch.due, T()) + ' days late', 'bad') : ch.due ? pill('Due ' + WS.dateShort(ch.due), '') : pill('To confirm', '')) + '</div>' +
      '<dl class="cb-dl"><dt>Chassis</dt><dd>' + esc(ch.make + ' ' + ch.model) + '</dd><dt>VIN</dt><dd class="mono">' + esc(ch.vin) + '</dd><dt>Reg</dt><dd>' + esc(ch.reg) + '</dd><dt>From</dt><dd>' + esc(ch.from) + '</dd>' +
      (ch.late ? '<dt>Latest</dt><dd class="bad">' + esc(ch.late) + (ch.newDue ? ' New date ' + WS.dateShort(ch.newDue) + '.' : '') + '</dd>' : '') + '</dl>' +
      (b.stage === 'ordered' ? '<button class="btn alt sm" id="bdChassisIn">Chassis has arrived</button>' : '') + '</div>';

    var spec = '<div class="card"><div class="ch"><h2>Spec</h2></div><div class="cb-spec"><b>' + esc(b.title) + '</b>' +
      '<ul>' + WS.BODY_STANDARD.map(function (x) { return '<li>' + esc(x) + ' <span class="muted sm">standard</span></li>'; }).join('') +
      b.options.map(function (id) { var x = WS.OPTIONS.filter(function (y) { return y.id === id; })[0]; return x ? '<li>' + esc(x.name) + '</li>' : ''; }).join('') + '</ul>' +
      (b.colour ? '<div class="cb-col1"><i style="background:' + esc(b.colour) + '"></i>' + esc(b.colourName) + '</div>' : '') +
      ((b.extras || []).length ? '<div class="cb-extras">' + b.extras.map(function (x) {
        return '<div class="cb-ex"><span><b>' + esc(x.name) + '</b> <span class="muted sm">extra, ' + WS.money0(x.price) + '</span></span>' + pill(x.status === 'Sent' ? 'Waiting on customer' : x.status, x.status === 'Approved' ? 'ok' : x.status === 'Sent' ? 'warn' : '') + '</div>';
      }).join('') + '</div>' : '') +
      (si >= WS.stageIx('ordered') && b.stage !== 'delivered' ? '<button class="btn alt sm" id="bdExtra" style="margin-top:10px">Customer wants an extra</button>' : '') + '</div></div>';

    var hand = WS.HANDOVER.filter(function (h) { return b.checks[h]; }).length;
    var checks = '<div class="card"><div class="ch"><h2>Approval and handover</h2><span class="cb-count ' + (hand === WS.HANDOVER.length ? 'ok' : '') + '">' + hand + ' of ' + WS.HANDOVER.length + '</span></div>' +
      '<ul class="cb-checks">' + WS.HANDOVER.map(function (h, i) {
        var c = b.checks[h];
        return '<li><button type="button" class="cb-chk ' + (c ? 'on' : '') + '" data-chk="' + i + '" aria-pressed="' + !!c + '"><i>' + (c ? '✓' : '') + '</i><span>' + esc(h) + (c ? '<em>' + esc(c.by) + ' · ' + WS.whenUK(c.at) + '</em>' : '') + '</span></button></li>';
      }).join('') + '</ul><div class="muted sm">Each tick is named and timed, so the handover pack builds itself.</div></div>';

    var photos = '<div class="card"><div class="ch"><h2>Photos</h2><span class="cb-count">' + b.photos.length + '</span><div class="sp"><label class="btn alt sm" style="cursor:pointer">Add photo<input type="file" accept="image/*" capture="environment" id="bdPhoto" hidden></label></div></div>' +
      (b.photos.length ? '<div class="cb-photos">' + b.photos.slice().reverse().map(function (p, i) {
        return '<button type="button" class="cb-ph" data-ph="' + (b.photos.length - 1 - i) + '"><img src="' + WS.photoSrc(p.art || p.src) + '" alt="' + esc(p.caption || '') + '"><span><b>' + esc(WS.stageShort(p.stage)) + '</b> ' + esc(p.caption || '') + '<em>' + esc(p.by) + ' · ' + WS.whenUK(p.at) + '</em></span></button>';
      }).join('') + '</div>' : empty('No photos yet. The build team add them from their phones at every stage.')) + '</div>';

    var log = '<div class="card"><div class="ch"><h2>What has happened</h2></div><ul class="cb-feed">' +
      (b.log || []).concat((b.updates || []).map(function (u) { return { at: u.at, who: u.by, what: 'Sent the customer an update: ' + u.text }; }))
        .sort(function (x, y) { return y.at.localeCompare(x.at); }).slice(0, 12).map(function (e) {
          return '<li><span class="cb-ft">' + WS.whenUK(e.at) + '</span><span class="cb-fx"><b>' + esc(e.who) + '</b> ' + esc(lower(e.what)) + '</span></li>';
        }).join('') + '<li><span class="cb-ft">' + WS.dateShort(b.createdAt.slice(0, 10)) + '</span><span class="cb-fx"><b>Office</b> enquiry taken</span></li></ul></div>';

    return '<div class="cb-bhead"><button class="btn alt sm" data-go="builds">‹ All builds</button>' +
      '<div class="cb-bht"><h1>' + esc(b.no) + ' · ' + esc(o ? o.name : '') + '</h1><div class="sub">' + esc(b.title) + ' on ' + esc(ch.make + ' ' + ch.model) + ' · due ' + WS.dateUK(b.due) + ' · ' + WS.money0(b.price) + ' before VAT</div></div>' +
      '<div class="cb-bha"><button class="btn alt" id="bdTrack">See what ' + esc(o ? o.contact.split(' ')[0] : 'the customer') + ' sees</button><button class="btn alt" id="bdUpdate">Send an update</button>' + invBtn +
      (b.stage === 'quoted' ? '<button class="btn" id="bdWon">Customer said yes</button>' : b.stage === 'enquiry' ? '<button class="btn" id="bdQuote">Send the quote</button>' : nextSt && b.stage !== 'ordered' ? '<button class="btn" id="bdNext">Move to ' + esc(nextSt.short.toLowerCase()) + '</button>' : '') + '</div></div>' +
      stepper +
      (b.notes ? '<div class="flagbox cb-note">' + esc(b.notes) + '</div>' : '') +
      '<div class="cb-bgrid"><div>' + hours + moneyHtml + mats + photos + '</div><div>' + chassisHtml + spec + checks + log + '</div></div>';
  };
  W.build = function () {
    var b = WS.build(O.buildId);
    O.wireGo();
    if (!b) { W.builds(); return; }
    var on = function (id, fn) { var e = $(id); if (e) e.onclick = fn; };
    on('bdTrack', function () { O.cbrPhone('customer', b.id); });
    on('bdUpdate', function () { O.buildUpdate(b); });
    on('bdNext', function () { O.buildNext(b); });
    on('bdWon', function () { O.buildWon(b); });
    on('bdQuote', function () { O.buildQuote(b); });
    on('bdHours', function () { O.buildHoursAdd(b); });
    on('bdExtra', function () { O.buildExtra(b); });
    on('bdInvDep', function () { O.buildInvoice(b, 'deposit'); });
    on('bdInvBal', function () { O.buildInvoice(b, 'balance'); });
    on('bdChassisIn', function () {
      b.chassis.arrived = T(); b.chassis.late = ''; b.stage = 'chassis'; b.stageDates.chassis = T();
      WS.buildLog(b, WS.me() ? WS.me().first + ' ' + WS.me().last : 'Office', 'Chassis arrived and booked in. Build started');
      WS.save(); O.render(); WS.toast('Chassis in. ' + opName(b.operatorId) + ' told their build has started.', 'ok');
    });
    document.querySelectorAll('[data-chk]').forEach(function (x) {
      x.onclick = function () {
        var h = WS.HANDOVER[+x.dataset.chk], me = WS.me();
        if (b.checks[h]) delete b.checks[h];
        else b.checks[h] = { by: me ? me.first + ' ' + me.last : 'Office', at: WS.nowStamp() };
        WS.save(); O.render();
      };
    });
    document.querySelectorAll('[data-inv]').forEach(function (x) { x.onclick = function () { O.invoiceView(x.dataset.inv); }; });
    document.querySelectorAll('[data-ph]').forEach(function (x) {
      x.onclick = function () {
        var p = b.photos[+x.dataset.ph];
        O.modal(b.no + ' · ' + WS.stageShort(p.stage), '<img class="cb-bigph" src="' + WS.photoSrc(p.art || p.src) + '" alt=""><div class="muted sm" style="margin-top:8px">' + esc(p.caption || '') + ' · ' + esc(p.by) + ' · ' + WS.whenUK(p.at) + '</div>', null, null, 'wide');
      };
    });
    var ph = $('bdPhoto');
    if (ph) ph.onchange = function () {
      var f = ph.files && ph.files[0];
      if (!f) return;
      WS.readPhoto(f, function (url) {
        if (!url) return;
        var me = WS.me();
        b.photos.push({ stage: b.stage, src: url, by: me ? me.first + ' ' + me.last : 'Office', at: WS.nowStamp(), caption: 'Added from the office' });
        WS.save(); O.render(); WS.toast('Photo added to ' + b.no + '.', 'ok');
      });
    };
  };

  function meName() { var me = WS.me(); return me ? me.first + ' ' + me.last : 'Office'; }
  O.buildNext = function (b) {
    var si = WS.stageIx(b.stage), nx = WS.BUILD_STAGES[si + 1];
    if (!nx) return;
    if (nx.k === 'delivered') {
      var left = WS.HANDOVER.filter(function (h) { return !b.checks[h]; });
      if (left.length) { WS.toast('Tick the handover list first: ' + left.length + ' left, starting with "' + left[0] + '".', 'bad'); return; }
    }
    (b.labour || []).forEach(function (l) { if (l.start && l.hours == null) { l.hours = Math.round(WS.buildHours({ labour: [l] }) * 4) / 4; } });
    b.stage = nx.k;
    b.stageDates[nx.k] = T();
    WS.buildLog(b, meName(), 'Moved to ' + nx.name.toLowerCase());
    b.updates.push({ at: WS.nowStamp(), by: meName(), text: 'Your build has moved on to ' + nx.name.toLowerCase() + '.' });
    WS.save();
    O.render();
    WS.toast(b.no + ' is on ' + nx.short.toLowerCase() + '. ' + opName(b.operatorId) + ' can see it on their tracker.', 'ok');
  };
  O.buildWon = function (b) {
    b.stage = 'ordered';
    b.stageDates.ordered = T();
    WS.buildLog(b, meName(), 'Customer accepted the quote. Chassis ordered');
    WS.save();
    O.buildInvoice(b, 'deposit');
  };
  O.buildQuote = function (b) {
    O.quoteDoc(b, function () {
      b.stage = 'quoted'; b.quoteSent = WS.nowStamp(); b.stageDates.quoted = T();
      WS.buildLog(b, meName(), 'Quote sent to ' + (WS.operator(b.operatorId) || {}).contact);
      WS.save(); O.closeModal(); O.render();
      WS.toast('Quote ' + b.no + ' sent to ' + (WS.operator(b.operatorId) || {}).contact + ' (simulated in the demo, nothing leaves the browser).', 'ok');
    });
  };
  O.buildInvoice = function (b, kind) {
    var st = WS.state, pct = kind === 'deposit' ? b.depositPct : 100 - b.depositPct;
    var net = Math.round(b.price * pct) / 100, vat = Math.round(net * st.settings.vat) / 100, n = 4128 + st.invoices.length;
    var o = WS.operator(b.operatorId);
    var inv = { id: WS.uid('i'), no: 'INV-' + n, jobId: '', buildId: b.id, buildNo: b.no, vehicleId: '', operatorId: b.operatorId,
      date: T(), due: WS.day((o && o.terms) || 30), hours: 0, rate: 0, labour: 0, partsNet: 0, discount: 0, net: net, vat: vat,
      total: Math.round((net + vat) * 100) / 100, cost: 0, xeroExported: '', xeroId: '', paid: '', parts: [],
      lines: [{ desc: b.no + ' ' + b.title + ', ' + (kind === 'deposit' ? 'deposit ' + pct + '%' : 'balance on handover'), qty: 1, unit: net }] };
    st.invoices.push(inv);
    b.invoices.push(inv.id);
    var sent = false;
    if (WS.xeroOk() && st.settings.xero.autoSend) { WS.xeroPush([inv]); sent = true; }
    WS.buildLog(b, meName(), (kind === 'deposit' ? 'Deposit' : 'Balance') + ' invoice ' + inv.no + ' raised for ' + WS.money(inv.total));
    WS.save();
    O.render();
    WS.toast(inv.no + ' raised for ' + WS.money(inv.total) + (sent ? ' and posted into ' + acc() + '.' : '.'), 'ok');
  };
  O.buildUpdate = function (b) {
    var o = WS.operator(b.operatorId), si = WS.stageIx(b.stage);
    var sug = b.stage === 'ordered' && chassisLate(b) ? 'Your chassis has not arrived from the dealer yet. They now say ' + WS.dateShort(b.chassis.newDue || b.chassis.due) + '. We will start the day it lands.' :
      'Your new body is on ' + WS.stageName(b.stage).toLowerCase() + '. Still on for ' + WS.dateUK(b.due) + '. Photos are on your tracker.';
    O.modal('Send ' + (o ? o.contact.split(' ')[0] : 'the customer') + ' an update', '<label class="f"><span class="lb">Message</span><textarea class="in" id="buTx" rows="4">' + esc(sug) + '</textarea></label>' +
      '<div class="hint" style="margin-top:10px">Goes by WhatsApp and email with a link to their build tracker: the stage, the photos and the date. Simulated in the demo, nothing is sent.</div>', 'Send update', function () {
      var t = $('buTx').value.trim();
      if (!t) return;
      b.updates.push({ at: WS.nowStamp(), by: meName(), text: t });
      WS.notify(o ? o.contact + ', ' + o.name : '', 'WhatsApp and email', b.no + ' build update', t, 'ready');
      WS.save(); O.closeModal(); O.render();
      WS.toast('Update sent to ' + (o ? o.contact : 'the customer') + ' with the tracker link.', 'ok');
    });
  };
  O.buildHoursAdd = function (b) {
    var team = (WS.state.buildTeam || []).map(function (x) { return x.name; }).concat(WS.state.settings.fitters.filter(function (f) { return !f.mobile; }).map(function (f) { return f.name; }));
    O.modal('Add hours to ' + b.no, '<div class="grid g2"><label class="f"><span class="lb">Who</span><select class="in" id="bhWho">' + team.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">Stage</span><select class="in" id="bhSt">' + WS.WORK_STAGES.map(function (k) { return '<option value="' + k + '"' + (k === b.stage ? ' selected' : '') + '>' + esc(WS.stageName(k)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">Hours</span><input class="in" id="bhH" type="number" min="0.25" step="0.25" value="2"></label></div>' +
      '<div class="hint" style="margin-top:10px">Normally the build team clock on and off from their phone. This is for anything missed.</div>', 'Add hours', function () {
      var h = parseFloat($('bhH').value);
      if (!(h > 0 && h <= 24)) { WS.toast('Put in the hours, between 0.25 and 24.', 'bad'); return; }
      b.labour.push({ stage: $('bhSt').value, who: $('bhWho').value, date: T(), hours: h });
      WS.buildLog(b, $('bhWho').value, 'Booked ' + WS.dur(h) + ' to ' + WS.stageName($('bhSt').value).toLowerCase());
      WS.save(); O.closeModal(); O.render(); WS.toast(WS.dur(h) + ' added to ' + b.no + '.', 'ok');
    });
  };

  /* an extra the customer asks for part way through: priced, sent to their tracker, nothing done until they say yes */
  O.buildExtra = function (b) {
    var o = WS.operator(b.operatorId);
    var left = WS.OPTIONS.filter(function (x) { return !x.fixed && b.options.indexOf(x.id) < 0 && !(b.extras || []).some(function (e) { return e.opt === x.id && e.status !== 'Declined'; }); });
    O.modal('An extra on ' + b.no, '<label class="f"><span class="lb">What do they want</span><select class="in" id="bxOpt">' + left.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '<option value="">Something else</option></select></label>' +
      '<div class="grid g2" style="margin-top:12px"><label class="f"><span class="lb">Describe it</span><input class="in" id="bxName"></label><label class="f"><span class="lb">Price before VAT</span><input class="in" id="bxPrice" type="number" min="0" step="10"></label>' +
      '<label class="f"><span class="lb">Extra hours</span><input class="in" id="bxHours" type="number" min="0" step="0.5"></label></div>' +
      '<div class="hint" style="margin-top:10px">Goes on ' + esc(o ? o.contact.split(' ')[0] : 'the customer') + '\'s tracker with the price. Nothing is built until they tap yes, and when they do the price, the hours and the invoice all move with it.</div>',
      'Send to ' + (o ? o.contact.split(' ')[0] : 'the customer'), function () {
        var id = $('bxOpt').value, x = WS.OPTIONS.filter(function (y) { return y.id === id; })[0];
        var name = $('bxName').value.trim(), price = parseFloat($('bxPrice').value), hours = parseFloat($('bxHours').value) || 0;
        if (!name || !(price > 0)) { WS.toast('Put in what it is and a price.', 'bad'); return; }
        b.extras = b.extras || [];
        b.extras.push({ id: WS.uid('x'), opt: id, name: name, price: price, cost: x ? x.cost : 0, hours: hours, stage: x ? x.stage : 'fitout', status: 'Sent', at: WS.nowStamp(), by: meName(), decidedAt: '', decidedBy: '' });
        WS.buildLog(b, meName(), 'Priced an extra: ' + name + ', ' + WS.money0(price) + '. Sent to the customer to approve');
        WS.notify(o ? o.contact + ', ' + o.name : '', 'WhatsApp and email', b.no + ' extra to approve', name + ' for ' + WS.money0(price) + ' before VAT. Approve it on your tracker.', 'approval');
        WS.save(); O.closeModal(); O.render();
        WS.toast('Sent to ' + (o ? o.contact : 'the customer') + '. It is on their tracker now.', 'ok');
      });
    function fill() {
      var x = WS.OPTIONS.filter(function (y) { return y.id === $('bxOpt').value; })[0];
      $('bxName').value = x ? x.name : ''; $('bxPrice').value = x ? x.price : ''; $('bxHours').value = x ? x.hours : '';
    }
    $('bxOpt').onchange = fill;
    fill();
  };

  /* ============================ the numbers: the owner's screen ============================ */
  function extraSold() {
    var from = WS.day(-30);
    var l = WS.state.approvals.filter(function (a) { return a.status === 'Approved' && a.decidedAt && a.decidedAt.slice(0, 10) >= from; });
    return { n: l.length, val: l.reduce(function (s, a) { return s + WS.approvalTotals(a).net; }, 0) };
  }
  function vanWeek() {
    var ws = WS.weekStart(0), st = WS.state;
    return vanEngineers().map(function (f) {
      var onJobs = 0, onClock = 0;
      st.jobs.forEach(function (j) { (j.clockOns || []).forEach(function (c) { if (c.fitterId === f.id && c.start.slice(0, 10) >= ws) onJobs += ((c.end ? new Date(c.end) : new Date()) - new Date(c.start)) / 3600000; }); });
      (st.dayClocks || []).forEach(function (c) { if (c.fitterId === f.id && c.date >= ws) onClock += ((c.end ? new Date(c.end) : new Date()) - new Date(c.start)) / 3600000; });
      onClock = Math.max(onClock, onJobs);
      return { f: f, v: WS.van(f.van) || {}, onJobs: onJobs, onClock: onClock, pct: onClock ? Math.round(onJobs / onClock * 100) : 0 };
    });
  }
  S.numbers = function () {
    var st = WS.state, m = money(), ex = extraSold();
    var bl = (st.builds || []).filter(function (b) { return WS.stageIx(b.stage) >= WS.stageIx('chassis'); });
    var price = 0, qm = 0, pm = 0;
    bl.forEach(function (b) { var x = WS.buildMoney(b); price += x.price; qm += x.quoteMargin; pm += x.projMargin; });
    var qp = price ? Math.round(qm / price * 100) : 0, pp = price ? Math.round(pm / price * 100) : 0;
    var late = {}, T0 = T();
    st.invoices.forEach(function (i) {
      if (i.paid || i.due >= T0) return;
      var k = i.operatorId, x = late[k] = late[k] || { op: WS.operator(k), n: 0, val: 0, days: 0, chased: '' };
      x.n++; x.val += i.total; x.days = Math.max(x.days, WS.daysBetween(i.due, T0)); if (i.chased && i.chased > x.chased) x.chased = i.chased;
    });
    var lateList = Object.keys(late).map(function (k) { return late[k]; }).sort(function (a, b) { return b.val - a.val; });
    var unchased = lateList.filter(function (x) { return !x.chased; }).length;
    function tile(k, v, unit, foot, cls, ic, btn) {
      return '<div class="cb-tile still ' + ic + '"><span class="cb-tk">' + esc(k) + '</span><span class="cb-tv ' + (cls || '') + '">' + esc(String(v)) + '<small>' + esc(unit) + '</small></span><span class="cb-tf">' + esc(foot) + '</span>' + (btn || '') + '</div>';
    }
    return head('The numbers', 'Worked out from the jobs, the vans and the builds. Nobody typed this in.') +
      '<div class="cb-tiles">' +
      tile('Finished, not invoiced', WS.money0(m.readyVal), m.ready.length + (m.ready.length === 1 ? ' job' : ' jobs'), m.ready.length ? 'Hours and parts are already on them' : 'Everything finished is billed', m.ready.length ? 'warn' : 'ok', 'mon',
        m.ready.length ? '<button type="button" class="btn sm" id="nmInvAll">Invoice them all</button>' : '') +
      tile('Owed to CBR', WS.money0(m.owed), m.unpaid + ' invoices', WS.money0(m.lateVal) + ' of it is overdue', m.lateVal ? 'bad' : 'ok', 'van',
        unchased ? '<button type="button" class="btn sm" id="nmChase">Chase the overdue</button>' : '') +
      tile('Extra work sold', WS.money0(ex.val), 'last 30 days', ex.n + ' jobs approved by customers on their phone', 'ok', 'wk') +
      tile('Margin on the builds', pp + '%', 'now', 'quoted at ' + qp + '% across ' + bl.length + ' builds', pp < qp - 1 ? 'warn' : 'ok', 'bld') +
      '</div>' +
      '<div class="cb-cols even"><div>' +
      '<div class="card cb-card"><div class="ch"><h2>Overdue, by customer</h2></div>' + (lateList.length ? lateList.map(function (x) {
        return '<div class="cb-nrow"><span class="cb-bt"><b>' + esc(x.op ? WS.shortName(x.op.name) : '') + '</b><span>' + x.n + (x.n === 1 ? ' invoice' : ' invoices') + ' · oldest ' + x.days + ' days over</span></span>' +
          '<span class="cb-br"><b>' + WS.money0(x.val) + '</b>' + (x.chased ? '<span class="muted sm">chased ' + WS.timeUK(x.chased) + '</span>' : '') + '</span></div>';
      }).join('') : empty('Nothing overdue.')) + '</div>' +
      '</div><div>' +
      '<div class="card cb-card"><div class="ch"><h2>Vans this week</h2></div>' + vanWeek().map(function (x) {
        return '<div class="cb-nrow"><span class="cb-bt"><b>' + esc(x.v.name || '') + ' · ' + esc(x.f.name) + '</b><span>' + WS.dur(x.onJobs) + ' on jobs of ' + WS.dur(x.onClock) + ' on the clock</span>' +
          '<span class="cb-prog"><i style="width:' + Math.min(100, x.pct) + '%"></i></span></span><span class="cb-br"><b>' + x.pct + '%</b></span></div>';
      }).join('') + '<div class="muted sm" style="margin-top:8px">The rest is travel and waiting. On jobs is what gets billed.</div></div>' +
      '<div class="card cb-card"><div class="ch"><h2>Builds against the quote</h2></div>' + bl.filter(function (b) { return b.stage !== 'delivered'; }).map(function (b) {
        var x = WS.buildMoney(b);
        return '<button type="button" class="cb-brow" data-build="' + b.id + '"><span class="cb-bno">' + esc(b.no) + '</span><span class="cb-bt"><b>' + esc(opName(b.operatorId)) + '</b><span>' + esc(WS.stageShort(b.stage)) + ' · ' + WS.dur(x.hoursBooked) + ' of ' + WS.dur(x.hoursQuoted) + '</span></span>' +
          '<span class="cb-br"><b class="' + (x.projPct < x.quotePct - 1 ? 'bad' : '') + '">' + Math.round(x.projPct) + '%</b><span class="muted sm">quoted ' + Math.round(x.quotePct) + '%</span></span></button>';
      }).join('') + '</div>' +
      '</div></div>';
  };
  W.numbers = function () {
    O.wireGo();
    wireRows();
    var ia = $('nmInvAll');
    if (ia) ia.onclick = function () {
      var st = WS.state, made = [], total = 0;
      st.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }).forEach(function (j) {
        var q = WS.quoteJob(j), o = WS.operator(j.operatorId);
        if (!q.hours && !(j.parts || []).length) return;
        var inv = { id: WS.uid('i') + made.length, no: 'INV-' + (4128 + st.invoices.length), jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId,
          date: T(), due: WS.day((o && o.terms) || 30), hours: q.hours, rate: q.rate, labour: q.labour, partsNet: q.partsNet,
          discount: q.discount, net: q.net, vat: q.vat, total: q.total, cost: q.cost, xeroExported: '', xeroId: '', paid: '', parts: (j.parts || []).slice() };
        st.invoices.push(inv); j.invoiceId = inv.id; made.push(inv); total += inv.total;
        WS.audit(j, 'Office', 'Invoice ' + inv.no + ' raised for ' + WS.money(inv.total));
      });
      var sent = WS.xeroOk() && st.settings.xero.autoSend;
      if (sent) WS.xeroPush(made);
      WS.save(); O.render();
      WS.toast(made.length + ' invoices raised, ' + WS.money0(total) + (sent ? ', all posted into ' + acc() + '.' : '.'), 'ok');
    };
    var ch = $('nmChase');
    if (ch) ch.onclick = function () {
      var st = WS.state, ops = {}, n = 0;
      st.invoices.forEach(function (i) { if (!i.paid && i.due < T() && !i.chased) { i.chased = WS.nowStamp(); ops[i.operatorId] = 1; n++; } });
      Object.keys(ops).forEach(function (k) { var o = WS.operator(k); if (o) WS.notify(o.contact + ', ' + o.name, 'Email', 'Overdue invoices', 'A polite reminder with your overdue invoices attached.', 'reminder'); });
      WS.save(); O.render();
      WS.toast('Reminder sent to ' + Object.keys(ops).length + ' customers for ' + n + ' overdue invoices (simulated in the demo).', 'ok');
    };
  };

  /* what the last build of this body really took, so the next quote is priced off real hours */
  function lastLike(bodyId) {
    var best = null;
    (WS.state.builds || []).forEach(function (b) {
      if (b.body !== bodyId || WS.stageIx(b.stage) < WS.stageIx('paint')) return;
      var q = b.hoursQuoted.fab || 0, h = WS.buildHours(b, 'fab');
      if (!q) return;
      if (!best || b.no > best.b.no) best = { b: b, q: q, h: h, over: Math.round((h - q) * 4) / 4 };
    });
    return best;
  }

  /* ---------------- the quote builder ---------------- */
  O.newBuild = function () {
    var st = WS.state, sel = { op: 'o3', body: 'agg8', opts: {}, colour: '#E67D00' };
    WS.OPTIONS.forEach(function (x) { if (x.on) sel.opts[x.id] = true; });
    function calc() {
      var bd = WS.BODIES.filter(function (x) { return x.id === sel.body; })[0], price = bd.price, cost = bd.materials, hrs = 0;
      Object.keys(bd.hours).forEach(function (k) { hrs += bd.hours[k]; });
      WS.OPTIONS.forEach(function (x) {
        if (x.only && x.only !== sel.body) return;
        if (sel.opts[x.id] || x.fixed && x.only === sel.body) { price += x.price; cost += x.cost; hrs += x.hours; }
      });
      var last = lastLike(sel.body), learn = sel.learn && last && last.over > 0 ? last.over : 0;
      hrs += learn;
      var margin = price - cost - hrs * WS.BUILD_COST_RATE;
      return { bd: bd, price: price, cost: cost, hrs: hrs, margin: margin, pct: margin / price * 100, last: last, learn: learn };
    }
    function body() {
      var c = calc();
      return '<div class="cb-qb"><div><div class="grid g2"><label class="f"><span class="lb">Customer</span><select class="in" id="qbOp">' + O.opts(st.operators, sel.op, 'id', 'name') + '</select></label>' +
        '<label class="f"><span class="lb">Body</span><select class="in" id="qbBody">' + O.opts(WS.BODIES, sel.body, 'id', 'name') + '</select></label>' +
        '<label class="f"><span class="lb">Chassis</span><input class="in" id="qbCh" value="' + esc(sel.ch || 'DAF CF 450 FAD 8x4') + '"></label>' +
        '<label class="f"><span class="lb">Chassis due</span><input class="in" id="qbDue" type="date" value="' + (sel.due || WS.day(21)) + '"></label></div>' +
        '<div class="lb" style="margin:14px 0 6px">Standard on every body</div><div class="muted sm">' + esc(WS.BODY_STANDARD.join(' · ')) + '</div>' +
        '<div class="lb" style="margin:14px 0 6px">Options</div><div class="cb-opts">' + WS.OPTIONS.filter(function (x) { return !x.only || x.only === sel.body; }).map(function (x) {
          var on = sel.opts[x.id] || (x.fixed && x.only === sel.body);
          return '<button type="button" class="cb-opt ' + (on ? 'on' : '') + '" data-opt="' + x.id + '"' + (x.fixed ? ' disabled' : '') + '><i>' + (on ? '✓' : '') + '</i><span>' + esc(x.name) + '</span><b>' + (x.price ? '+' + WS.money0(x.price) : 'included') + '</b></button>';
        }).join('') + '</div></div>' +
        '<div class="cb-qsum"><div class="cb-qk">Quote</div><div class="cb-qp">' + WS.money0(c.price) + '<small>before VAT</small></div>' +
        '<div class="cb-mrow"><span>Hours</span><b>' + WS.dur(c.hrs) + '</b></div><div class="cb-mrow"><span>Materials</span><b>' + WS.money0(c.cost) + '</b></div>' +
        '<div class="cb-mrow big ' + (c.pct < 15 ? 'bad' : 'ok') + '"><span>Margin</span><b>' + WS.money0(c.margin) + ' <span>' + Math.round(c.pct) + '%</span></b></div>' +
        (c.last && c.last.over > 0 ? '<button type="button" class="cb-learn ' + (sel.learn ? 'on' : '') + '" id="qbLearn" aria-pressed="' + !!sel.learn + '"><i>' + (sel.learn ? '✓' : '') + '</i><span>Last one like this, ' + esc(c.last.b.no) + ', took <b>' + WS.dur(c.last.h) + '</b> to fabricate against ' + WS.dur(c.last.q) + ' quoted. Allow the extra ' + WS.dur(c.last.over) + ' this time</span></button>' :
          c.last ? '<div class="muted sm" style="margin-top:8px">Last one like this, ' + esc(c.last.b.no) + ', came in on its fabrication hours.</div>' : '') +
        '<div class="muted sm" style="margin-top:8px">Hours are split by stage, so the build hall sees what each stage is allowed. Sample prices; yours go in.</div></div></div>';
    }
    O.modal('New build enquiry', body(), 'Save and open the build', function () {
      var c = calc(), n = 145 + (st.builds.length - 7), id = WS.uid('bd'), hq = {};
      WS.WORK_STAGES.forEach(function (k) { hq[k] = c.bd.hours[k] || 0; });
      var opts = WS.OPTIONS.filter(function (x) { return (sel.opts[x.id] && (!x.only || x.only === sel.body)) || (x.fixed && x.only === sel.body); });
      var mats = [{ item: 'Aluminium sheet and extrusions', budget: Math.round(c.bd.materials * 0.78), actual: 0 }, { item: 'Paint and consumables', budget: Math.round(c.bd.materials * 0.1), actual: 0 }, { item: 'Lights, wiring and fixings', budget: Math.round(c.bd.materials * 0.12), actual: 0 }];
      opts.forEach(function (x) { if (x.hours) hq[x.stage] += x.hours; if (x.cost) mats.push({ item: x.name, budget: x.cost, actual: 0 }); });
      if (c.learn) hq.fab += c.learn;
      var chs = $('qbCh').value.trim().split(' ');
      var b = { id: id, no: 'B-0' + n, operatorId: $('qbOp').value, body: sel.body, title: c.bd.name, options: opts.map(function (x) { return x.id; }),
        colour: '', colourName: 'Customer colour', chassis: { make: chs[0] || '', model: chs.slice(1).join(' '), vin: 'Not yet', reg: 'Not registered', due: $('qbDue').value, arrived: '', from: 'Dealer' },
        stage: 'enquiry', stageDates: { enquiry: T() }, due: WS.isoAdd ? WS.isoAdd($('qbDue').value || WS.day(21), 21) : WS.day(42), price: c.price, depositPct: 25,
        hoursQuoted: hq, labour: [], materials: mats, photos: [], checks: {}, quoteSent: '', notes: '', log: [{ at: WS.nowStamp(), who: meName(), what: 'Enquiry taken, priced at ' + WS.money0(c.price) }], updates: [], invoices: [], extras: [], createdAt: WS.nowStamp() };
      st.builds.push(b);
      WS.save();
      O.closeModal();
      O.openBuild(id);
      WS.toast(b.no + ' saved. Send the quote when you are ready.', 'ok');
    }, 'wide');
    function wire() {
      $('qbOp').onchange = function () { sel.op = this.value; };
      $('qbBody').onchange = function () { sel.body = this.value; redraw(); };
      $('qbCh').oninput = function () { sel.ch = this.value; };
      $('qbDue').onchange = function () { sel.due = this.value; };
      document.querySelectorAll('[data-opt]').forEach(function (x) { x.onclick = function () { sel.opts[x.dataset.opt] = !sel.opts[x.dataset.opt]; redraw(); }; });
      var lr = $('qbLearn'); if (lr) lr.onclick = function () { sel.learn = !sel.learn; redraw(); };
    }
    function redraw() { var mb = document.querySelector('.mask .mb'); if (mb) { mb.innerHTML = body(); wire(); } }
    wire();
  };
  O.quoteDoc = function (b, onSend) {
    var st = WS.state.settings, o = WS.operator(b.operatorId), vat = Math.round(b.price * st.vat) / 100;
    var lines = [[b.title, WS.BODIES.filter(function (x) { return x.id === b.body; })[0].price]].concat(b.options.map(function (id) {
      var x = WS.OPTIONS.filter(function (y) { return y.id === id; })[0]; return [x.name, x.price];
    }));
    var body = '<div class="inv"><div class="ih"><div>' + WS.logoHtml('inv-logo') + '<div class="muted" style="font-size:12.5px;line-height:1.55;margin-top:6px">' + esc(st.address) + '<br>' + esc(st.phone) + ' · ' + esc(st.web) + '</div></div>' +
      '<div class="n"><div style="font-size:22px;font-weight:800">QUOTE</div><div style="font-size:14px;font-weight:700;margin-top:4px">' + esc(b.no) + '</div><div class="muted" style="font-size:12.5px;margin-top:6px">' + WS.dateUK(T()) + '<br>Valid 30 days</div></div></div>' +
      '<div style="margin-bottom:10px"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">For</div><div style="font-weight:700;margin-top:4px">' + esc(o ? o.name : '') + '</div><div class="muted" style="font-size:12.5px">' + esc(o ? o.contact : '') + '</div></div>' +
      '<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
      lines.map(function (l) { return '<tr><td>' + esc(l[0]) + '</td><td style="text-align:right">' + (l[1] ? WS.money(l[1]) : 'included') + '</td></tr>'; }).join('') +
      '<tr><td class="muted">Standard: ' + esc(WS.BODY_STANDARD.join(', ')) + '</td><td style="text-align:right">included</td></tr></tbody></table>' +
      '<div class="tot"><div><span>Net</span><span>' + WS.money(b.price) + '</span></div><div><span>VAT at ' + st.vat + '%</span><span>' + WS.money(vat) + '</span></div><div class="g"><span>Total</span><span>' + WS.money(b.price + vat) + '</span></div></div>' +
      '<div class="muted" style="font-size:11.5px;margin-top:18px;border-top:1px solid #E4E8EF;padding-top:12px">' + b.depositPct + '% deposit on order, balance on handover. Build starts the day the chassis arrives. Fitted to ' + esc((b.chassis.make + ' ' + b.chassis.model).trim()) + '.</div></div>';
    O.modal('Quote ' + b.no, body, 'Send to ' + (o ? o.contact.split(' ')[0] : 'customer'), onSend, 'wide', '<button class="btn alt" id="qdPrint">Print or save PDF</button>');
    $('qdPrint').onclick = function () { window.print(); };
  };

  /* ============================ phones ============================ */
  var PH = {
    van: { title: 'Van engineer', heading: 'Out in the van', steps: [
      ['Today\'s call outs', 'Every job in order, with the site, the fault and the customer\'s number.'],
      ['On my way, arrived', 'One tap each. The office sees where every van is up to.'],
      ['Safety first', 'Four ticks before any work: safe place, cones and beacon, PPE, customer told.'],
      ['Photos and parts', 'Take the photo, add parts from the van. The van stock counts down.'],
      ['Found something else?', 'Photo and price to the customer. They approve on their phone.'],
      ['Customer signs', 'On the engineer\'s phone. The office gets the job ready to invoice.']] },
    fab: { title: 'Build team', heading: 'In the build hall', steps: [
      ['Your build', 'The build and stage you are on, with the hours allowed.'],
      ['Clock on, clock off', 'Hours land on the right stage of the right build.'],
      ['Photos at every stage', 'They go on the build file and the customer\'s tracker.']] },
    fitter: { title: 'Workshop fitter', heading: 'In the workshop', steps: [
      ['Log in with your PIN', 'Tap your name. Darren is 1111.'],
      ['My day', 'The jobs in order with the time allowed.'],
      ['Inspection sheet', 'Every item to the DVSA guide, brake figures, two signatures, locked once signed.'],
      ['Extra work', 'Photo and price to the customer, the job waits for the yes.']] },
    customer: { title: 'Customer', heading: 'What your customer sees', steps: [
      ['Their build, live', 'Stage, photos and date, from the same system the build hall uses.'],
      ['No phone calls', 'They stop ringing to ask where their body is.'],
      ['Every update', 'What you sent and when.']] },
    approve: { title: 'Customer', heading: 'Approving extra work', steps: [
      ['The message', 'WhatsApp and email with a link. No app to install.'],
      ['Photo and price', 'They see what the engineer saw and what it costs.'],
      ['Approve or decline', 'One tap, in writing, with their name and the time.']] }
  };
  /* Customer approves: the customer with the newest extra still waiting, so the one just sent shows */
  function approveFor() {
    var w = (WS.state.approvals || []).filter(function (a) { return a.status === 'Sent' && WS.operator(a.operatorId); });
    return w.length ? w[w.length - 1].operatorId : 'o1';
  }
  O.cbrPhone = function (kind, arg) {
    var p = PH[kind] || PH.van, src;
    if (kind === 'van') src = 'van.html?as=' + (arg || 'f5');
    else if (kind === 'fab') src = 'van.html?as=' + (arg || 'b1');
    else if (kind === 'fitter') src = 'fitter.html';
    else if (kind === 'customer') src = 'track.html?b=' + (arg || 'bd4');
    else src = 'portal.html?as=' + (arg || approveFor());
    O.openPhone({ src: src, title: p.title, heading: p.heading, steps: p.steps });
    var box = document.querySelector('.pmsteps');
    if (!box) return;
    var sw = WS.el('div', 'cb-phsw');
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Which phone');
    sw.innerHTML = [['van', 'Van engineer'], ['fab', 'Build team'], ['fitter', 'Workshop'], ['customer', 'Customer tracker'], ['approve', 'Customer approves']].map(function (x) {
      return '<button type="button" data-ph-k="' + x[0] + '"' + (x[0] === kind ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(x[1]) + '</button>';
    }).join('');
    box.insertBefore(sw, box.firstChild);
    sw.querySelectorAll('[data-ph-k]').forEach(function (b) {
      b.onclick = function () { var k = b.dataset.phK; O.cbrPhone(k, k === 'van' ? 'f5' : k === 'fab' ? 'b1' : k === 'customer' ? 'bd4' : ''); };
    });
  };
  var initPhone0 = O.initPhone;
  O.initPhone = function () {
    initPhone0();
    var b = $('wsPhone');
    if (b) {
      b.title = 'See the phones: van engineer, build team, workshop and customer';
      b.setAttribute('aria-label', 'Phones');
      var s = b.querySelector('span'); if (s) s.textContent = 'Phones';
      b.onclick = function () { O.cbrPhone('van', 'f5'); };
    }
  };

  /* ============================ the accounts package ============================ */
  function swapAcc(root) {
    var a = acc();
    if (a === 'Xero' || !root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (n.nodeValue.indexOf('Xero') >= 0) n.nodeValue = n.nodeValue.replace(/Xero/g, a);
    root.querySelectorAll('[aria-label*="Xero"],[title*="Xero"]').forEach(function (e) {
      ['aria-label', 'title'].forEach(function (k) { var v = e.getAttribute(k); if (v) e.setAttribute(k, v.replace(/Xero/g, a)); });
    });
  }
  var render0 = O.render;
  O.render = WS.rerender = function () { render0(); swapAcc($('view')); };
  var modal0 = O.modal;
  O.modal = WS.modal = function () { var m = modal0.apply(null, arguments); swapAcc(m); return m; };
  var toast0 = WS.toast;
  WS.toast = function (msg, kind) { return toast0(acc && WS.state ? String(msg).replace(/Xero/g, acc()) : msg, kind); };

  /* office3.js (Settings) loads after this file, so the settings wrap waits for the boot */
  var settings0, wset0;
  WS.beforeBoot = function (boot) {
    settings0 = S.settings; wset0 = W.settings;
    S.settings = settingsCbr;
    W.settings = wireSettingsCbr;
    boot();
  };
  function settingsCbr() {
    var a = acc();
    return '<div class="card cb-acc"><div class="ch"><h2>Your accounts package</h2></div>' +
      '<div class="hint">Invoices go straight into the one you use. Pick it and the whole system talks about it by name.</div>' +
      '<div class="seg cb-accseg" role="group" aria-label="Accounts package">' + ['Xero', 'QuickBooks', 'Sage'].map(function (x) {
        return '<button type="button" data-acc="' + x + '" class="' + (x === a ? 'on' : '') + '" aria-pressed="' + (x === a) + '">' + x + '</button>';
      }).join('') + '</div></div>' + settings0();
  }
  function wireSettingsCbr() {
    if (wset0) wset0();
    document.querySelectorAll('[data-acc]').forEach(function (b) {
      b.onclick = function () {
        WS.state.settings.accounts = b.dataset.acc;
        WS.state.settings.xero.tenantName = WS.state.settings.name;
        WS.save(); O.render();
        WS.toast('Invoices now go into ' + b.dataset.acc + '.', 'ok');
      };
    });
  }

  /* ============================ start-up lines for CBR ============================ */
  var briefData0 = O.briefData, briefLines0 = O.briefLines;
  O.briefData = function () {
    var d = briefData0();
    var engs = vanEngineers();
    d.vans = engs.length;
    d.onSite = engs.filter(function (f) { var c = currentCall(f.id); return c && O.vanStage(c) !== 'on_way'; }).length;
    d.callsLeft = WS.jobsOn(T()).filter(function (j) { return j.bay === 'Mobile van' && j.status !== 'done'; }).length;
    d.builds = liveBuilds().length;
    d.over = liveBuilds().filter(function (b) { return WS.buildOver(b).length; }).length;
    d.late = (WS.state.builds || []).filter(chassisLate).length;
    d.unassigned = unassignedCalls().length;
    return d;
  };
  O.briefLines = function (d) {
    d = d || O.briefData();
    var L = briefLines0(d).filter(function (x) { return x.k !== 'defects'; });
    L.forEach(function (x) { if (x.k === 'jobs') x.parts = [{ n: d.jobs }, ' jobs on today across the workshop and the vans.']; });
    var extra = [
      { k: 'vans', s: d.unassigned ? 'bad' : 'go', urgent: !!d.unassigned, go: 'vans', parts: [{ n: d.vans }, ' vans out, ', { n: d.onSite }, ' on site. '].concat(d.unassigned ? [{ n: d.unassigned }, ' breakdown not given to a van.'] : [{ n: d.callsLeft }, ' call outs to do.']) },
      { k: 'builds', s: d.over ? 'warn' : 'ok', go: 'builds', parts: [{ n: d.builds }, ' body builds on the go' + (d.over ? ', ' : '.')].concat(d.over ? [{ n: d.over }, ' over on hours.'] : []) }
    ];
    if (d.late) extra.push({ k: 'late', s: 'bad', urgent: true, go: 'builds', parts: [{ n: d.late }, ' chassis late from the dealer.'] });
    L = extra.concat(L);
    return L.map(function (x, i) { x._i = i; return x; }).sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a._i - b._i; });
  };

  /* the bell and the side menu counts include CBR's own things */
  var counts0 = O.navCountData;
  O.navCountData = function () {
    var c = counts0();
    c.vans = unassignedCalls().length;
    c.builds = (WS.state.builds || []).filter(function (b) { return chassisLate(b) || b.stage === 'enquiry'; }).length;
    delete c.checks;
    return c;
  };
  /* Home, the vans and the builds redraw when a phone changes something */
  WS.onChange(function () {
    if (O.dragging || document.querySelector('.mask')) return;
    if (['vans', 'builds', 'build', 'numbers'].indexOf(O.screen) >= 0 && WS.state) O.render();
  });
  setInterval(function () {
    if (document.hidden || O.dragging || document.querySelector('.mask')) return;
    if (['home', 'vans', 'build'].indexOf(O.screen) >= 0 && document.getElementById('view')) O.render();
  }, 30000);
})();
