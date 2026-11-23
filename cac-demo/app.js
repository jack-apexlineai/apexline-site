/* CAC Waste Management office demo. Every screen is drawn from CS (store.js). Nothing leaves this browser. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic, X = window.CACX;
  var params = new URLSearchParams(location.search);
  var S = CS.load();
  if (params.get('live') === '0') { S.settings.live = false; CS.save(); }
  if (params.get('theme')) { S.settings.theme = params.get('theme'); CS.save(); }

  var ui = { view: 'home', sel: null, asst: true, jobTab: 'live', tab: 'all', reading: {}, typed: {}, justDone: {}, newIds: {}, qFilter: 'all', jobOwner: 'all', jobQ: '', search: '', open: false };
  var VIEWS = [
    { k: 'home', n: 'Home', ic: 'home', sub: '' },
    { k: 'inbox', g: 'Work', n: 'Inbox', ic: 'inbox', sub: 'WhatsApp, email and the website in one place' },
    { k: 'today', g: 'Work', n: 'Today', ic: 'dashboard', sub: '' },
    { k: 'orders', g: 'Work', n: 'Orders', ic: 'calendar', sub: 'Every order, past and booked. Flick through by month, week or day' },
    { k: 'jobs', g: 'Work', n: 'Live jobs', ic: 'truck', sub: 'What is moving today, and what is sitting on site' },
    { k: 'quotes', g: 'Work', n: 'Quotes', ic: 'file-text', sub: 'Customer price, supplier cost and margin on every quote' },
    { k: 'chasing', g: 'Work', n: 'Chasing', ic: 'bell', sub: 'Everything waiting on someone else, chased for you' },
    { k: 'pricebook', hide: true, n: 'Price book', ic: 'list', sub: 'Your prices for every area and size, your rules, and price lists read in' },
    { k: 'customers', g: 'Customers', n: 'Customers', ic: 'users', sub: 'Sites, what each one is worth, and each customer\'s own link' },
    { k: 'credit', g: 'Customers', n: 'Credit control', ic: 'lock', sub: 'Limits, who owes what, and who is on stop' },
    { k: 'sales', g: 'Customers', n: 'Sales', ic: 'target', sub: 'The pipeline, every deal and every follow up' },
    { k: 'suppliers', g: 'Suppliers', n: 'Supplier handbook', ic: 'warehouse', sub: 'Contacts, prices, surcharges, licences and who covers where' },
    { k: 'find', g: 'Suppliers', n: 'Find a supplier', ic: 'map-pin', sub: 'Who covers a postcode, by price and by how reliable they are' },
    { k: 'bills', g: 'Suppliers', n: 'Bill check', ic: 'receipt', sub: 'Supplier statements lined up against what you booked' },
    { k: 'money', g: 'Money', n: 'Money', ic: 'pound', sub: 'Invoices, supplier bills and margin' },
    { k: 'trends', g: 'Money', n: 'Trends', ic: 'trending-up', sub: 'This month against last month, and where the month is heading' },
    { k: 'paperwork', g: 'Money', n: 'Duty of care', ic: 'certificate', sub: 'WTNs per job, supplier licences, audit packs' },
    { k: 'reports', g: 'Money', n: 'Waste and carbon', ic: 'leaf', sub: 'Tonnes, landfill diversion and carbon for every account and site' },
    { k: 'connections', hide: true, n: 'Connections', ic: 'link', sub: 'What the system plugs into, and what each one needs from you' },
    { k: 'import', hide: true, n: 'Import', ic: 'download', sub: 'Bring your team, customers, sites and suppliers in from a spreadsheet' }
  ];
  var PARTY_COL = { customer: ['#EB9347', '#C7672A', '#D9853A', '#B9773F'], supplier: ['#3F3F46', '#52525B', '#27272A'], lead: ['#7A3FF2', '#6D28D9'] };

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function av(name, type, cls) {
    var pal = PARTY_COL[type] || PARTY_COL.customer; var n = 0; for (var i = 0; i < name.length; i++) n += name.charCodeAt(i);
    return '<span class="av ' + (cls || '') + '" style="--c:' + pal[n % pal.length] + '">' + h(CS.initials(name)) + '</span>';
  }
  function chIcon(ch) { return ch === 'wa' ? 'whatsapp' : (ch === 'email' ? 'mail' : (ch === 'portal' ? 'link' : 'world')); }
  function chTag(ch) { return '<span class="tag ' + (ch === 'wa' ? 'wa' : ch === 'email' ? 'mail' : ch === 'portal' ? 'brand' : 'web') + '">' + ic(chIcon(ch)) + CS.chName(ch).replace(/^./, function (x) { return x.toUpperCase(); }) + '</span>'; }
  function margTag(m, s) { var p = CS.pct(m, s); return '<span class="tag ' + (p >= 20 ? 'ok' : p >= 12 ? 'amber' : 'bad') + '">' + money(m) + ' · ' + p + '%</span>'; }
  var STATUS = {
    booked: ['Waiting on supplier', 'amber', '#F59E0B'], confirmed: ['Confirmed', 'brand', '#EB9347'], onhire: ['On hire', 'ok', '#16A34A'],
    exchange: ['Exchange booked', 'mail', '#2563EB'], collection: ['Collection booked', 'web', '#7C3AED'], done: ['Done', '', '#71717A']
  };
  function stTag(st) { var s = STATUS[st]; return '<span class="tag ' + s[1] + '">' + s[0] + '</span>'; }
  function wtnTag(w) {
    if (w === 'received') return '<span class="tag ok">' + ic('certificate') + 'WTN filed</span>';
    if (w === 'missing') return '<span class="tag bad">' + ic('alert') + 'WTN missing</span>';
    if (w === 'chased') return '<span class="tag amber">' + ic('bell') + 'WTN chased</span>';
    if (w === 'pending') return '<span class="tag">WTN on delivery</span>';
    return '';
  }
  function greeting() { var hr = new Date().getHours(); return hr < 12 ? 'Good morning' : (hr < 18 ? 'Good afternoon' : 'Good evening'); }
  function hm(mins) { var hh = Math.floor(mins / 60), mm = mins % 60; return (hh ? hh + 'h ' : '') + mm + 'm'; }
  function toast(text, icon, action) {
    var box = $('#toasts'); var el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>' + (action ? '<button data-act="' + action.act + '" data-id="' + h(action.id || '') + '">' + h(action.label) + '</button>' : '');
    box.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, action ? 6500 : 3800);
  }
  function lastIn(t) { return t.msgs.filter(function (m) { return m.dir === 'in'; }).slice(-1)[0]; }
  function preview(t) { var m = CS.lastReal(t) || t.msgs[t.msgs.length - 1]; return (m.dir === 'out' ? 'You: ' : '') + m.text.replace(/\s+/g, ' '); }
  function sortedThreads() {
    return S.threads.slice().sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.last - a.last; });
  }
  function needsYou(t) { return CS.needsYou(t); }

  /* ---------- shell ---------- */
  function renderNav() {
    var st = CS.stats(), ch = CS.chaseLists();
    var counts = { inbox: st.unread || st.needs, chasing: ch.total }, last = null;
    /* menu groups fold away. Going to a page inside a folded group opens it again, so you always see where you are. */
    var shut = S.settings.navShut || {}, curV = VIEWS.filter(function (x) { return x.k === (ui.view === 'pricebook' ? 'suppliers' : ui.view); })[0], curG = curV && curV.g;
    if (curG && shut[curG] && ui.navSeen !== ui.view) { delete shut[curG]; CS.save(); }
    ui.navSeen = ui.view;
    function grpHead(g) {
      var n = 0, red = false;
      VIEWS.forEach(function (x) { if (x.g === g && !x.hide && counts[x.k]) n += counts[x.k]; });
      if (g === 'Work' && st.unread) { red = true; n = st.unread; }   /* unread messages win: the red number means the same as it does on Inbox */
      return '<button class="navg' + (shut[g] ? ' shut' : '') + (shut[g] && curG === g ? ' cur' : '') + '" data-act="navGroup" data-g="' + g + '" aria-expanded="' + (shut[g] ? 'false' : 'true') + '" title="' + (shut[g] ? 'Show ' : 'Hide ') + g + '"><span class="gl">' + g + '</span>' + (shut[g] && n ? '<span class="cnt' + (red ? ' red' : ' grey') + '">' + n + '</span>' : '') + '</button>';
    }
    $('#nav').innerHTML = '<div class="navtop"><button class="navcta" data-act="newOrder" title="New order (O)">' + ic('plus') + '<span class="lb">New order</span></button><button class="navcta two" data-act="desk" title="New quote (Q)">' + ic('file-text') + '<span class="lb">Quote</span></button></div>' + VIEWS.filter(function (v) { return !v.hide; }).map(function (v) {
      var c = counts[v.k], head = v.g && v.g !== last ? grpHead(v.g) : ''; last = v.g || last;
      return head + '<button data-act="go" data-v="' + v.k + '" class="' + (ui.view === v.k || (v.k === 'suppliers' && ui.view === 'pricebook') ? 'on' : '') + (v.g && shut[v.g] ? ' gshut' : '') + '" title="' + v.n + '">' + ic(v.ic) + '<span class="lb">' + v.n + '</span>' + (c ? '<span class="cnt' + (v.k === 'chasing' ? ' grey' : (v.k === 'inbox' && st.unread ? ' red' : '')) + '">' + c + '</span>' : '') + '</button>';
    }).join('');
  }
  function renderTop() {
    var v = VIEWS.filter(function (x) { return x.k === ui.view; })[0];
    var sub = (v.k === 'today' || v.k === 'home') ? CS.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : v.sub;
    $('#title').textContent = v.n; $('#sub').textContent = sub;
    var lp = $('#livePill'); lp.className = 'livepill' + (S.settings.live ? '' : ' off');
    lp.innerHTML = '<i></i><span class="t">' + (S.settings.live ? 'Live' : 'Paused') + '</span>';
    $('#themeBtn').innerHTML = ic(S.settings.theme === 'dark' ? 'sun' : 'moon');
    var ab = $('#asstBtn'); if (ab && X.todoCount) { var n = X.todoCount(); ab.innerHTML = ic('sparkles') + '<span class="lb">Assistant</span>' + (n ? '<span class="cnt red">' + n + '</span>' : ''); }
  }
  function render(why) {
    S = CS.S;
    document.documentElement.setAttribute('data-theme', S.settings.theme);
    var keep = {}; $$('[data-keep]').forEach(function (el) { keep[el.getAttribute('data-keep')] = el.scrollTop; });
    var ae = document.activeElement, aeId = ae && ae.id, selS = ae && ae.selectionStart, selE = ae && ae.selectionEnd;
    renderNav(); renderTop();
    var view = $('#view');
    view.className = 'view' + (ui.view === 'inbox' ? ' flush' : '');
    view.innerHTML = (V[ui.view] || V.inbox)();
    $$('[data-keep]').forEach(function (el) { var k = el.getAttribute('data-keep'); if (keep[k] != null) el.scrollTop = keep[k]; });
    if (aeId && $('#' + aeId)) { var el = $('#' + aeId); el.focus(); try { if (selS != null) el.setSelectionRange(selS, selE); } catch (e) {} }
    after();
  }
  function after() {
    if (ui.view === 'inbox') {
      var m = $('.msgs'); if (m && ui.scrollMsgs) { m.scrollTop = m.scrollHeight; ui.scrollMsgs = false; }
      // type the drafts out the first time they are shown
      $$('textarea[data-typein]').forEach(function (ta) {
        var full = ta.value; ta.value = ''; ta.classList.add('typing'); var i = 0, step = Math.max(2, Math.ceil(full.length / 45));
        var tid = ta.getAttribute('data-typein');
        (function go() {
          if (!document.body.contains(ta)) return;
          i += step; ta.value = full.slice(0, i);
          if (i < full.length) setTimeout(go, 16); else { ta.classList.remove('typing'); ui.typed[tid] = true; }
        })();
      });
    }
  }
  function go(v) { ui.view = v; closeSide(); location.hash = v; render(); window.scrollTo(0, 0); }

  /* ---------- views ---------- */
  var V = {};

  V.inbox = function () {
    var all = sortedThreads();
    var KIND = {}; all.forEach(function (x) { if (!x.done) KIND[x.id] = CS.analyse(x).kind; });
    function isOrder(x) { return !x.done && needsYou(x) && /^(book|quote|exchange|collect|hold)$/.test(KIND[x.id] || ''); }
    function isUnread(x) { return x.unread && !x.done; }
    function inTab(k, x) { return k === 'all' || (k === 'needs' ? needsYou(x) : k === 'unread' ? isUnread(x) : k === 'orders' ? isOrder(x) : k === 'open' ? !x.done : k === 'done' ? !!x.done : x.party.type === k); }
    var tabs = [['all', 'All'], ['unread', 'Unread'], ['needs', 'Needs you'], ['orders', 'Orders'], ['lead', 'New leads'], ['supplier', 'Suppliers'], ['open', 'Not closed']].map(function (x) { return [x[0], x[1], all.filter(function (y) { return inTab(x[0], y); }).length]; });
    var list = all.filter(function (x) { return inTab(ui.tab, x); });
    if (ui.sel && !CS.thread(ui.sel)) ui.sel = null;
    var t = ui.sel ? CS.thread(ui.sel) : null;
    var showAsst = !!t && ui.asst !== false;
    var items = list.map(function (x) {
      var p = CS.party(x.party), A = x.done ? null : CS.analyse(x), tag = '';
      if (ui.reading[x.id]) tag = '<span class="tag ai">' + ic('sparkles') + 'Reading...</span>';
      else if (A && needsYou(x)) {
        var k = A.kind;
        tag = '<span class="tag ai">' + ic('sparkles') + (k === 'book' ? 'Booking drafted' : k === 'quote' ? 'Quote drafted' : k === 'ask' ? 'Reply drafted' : k === 'exchange' ? 'Exchange drafted' : k === 'collect' ? 'Collection drafted' : k === 'wtn' ? 'WTN matched' : k === 'paid' ? 'Payment matched' : k === 'pack' ? 'WTN pack ready' : k === 'bill' ? 'Bill checked' : k === 'confirm' ? 'Confirmation drafted' : k === 'reschedule' ? 'New date drafted' : 'Read') + '</span>';
        if (k === 'hold') tag = '<span class="tag bad">' + ic('alert') + 'Credit hold</span>';
        else if (A.margin) tag += '<span class="tag ok">' + money(A.margin) + ' margin</span>';
        if (x.msgs.some(function (m) { return m.auto && !x.creditOk; })) tag += '<span class="tag">' + ic('moon') + 'Out of hours</span>';
      } else if (x.done) tag = '<span class="tag">' + ic('check') + 'Done</span>';
      return '<button class="it' + (x.id === ui.sel ? ' on' : '') + (x.unread && !x.done ? ' unread' : '') + (x.done ? ' done' : '') + (ui.newIds[x.id] ? ' newin' : '') + '" data-act="sel" data-id="' + x.id + '">' +
        '<span class="av" style="--c:' + avCol(p.name, x.party.type) + '">' + h(CS.initials(p.name)) + '<span class="ch ' + x.ch + '">' + ic(chIcon(x.ch)) + '</span></span>' +
        '<span class="bd"><span class="l1"><b>' + h(p.name) + '</b>' + (isUnread(x) ? '<span class="ub" title="Unread">' + unreadN(x) + '</span>' : '') + '<time>' + CS.ago(x.last) + '</time></span><span class="l2">' + h(p.sub) + (x.subject ? ' · ' + h(x.subject) : '') + '</span>' +
        '<span class="l3">' + h(preview(x)) + '</span><span class="l4">' + tag + '</span></span></button>';
    }).join('');
    ui.newIds = {};
    return '<div class="inbox' + (ui.open && t ? ' open' : '') + (showAsst ? '' : ' noasst') + '">' +
      '<div class="col list"><div class="ilist-hd"><div class="tabs">' + tabs.map(function (x) { return '<button data-act="tab" data-v="' + x[0] + '" class="' + (ui.tab === x[0] ? 'on' : '') + '">' + x[1] + ' <span class="n' + (x[0] === 'unread' && x[2] ? ' red' : '') + '">' + x[2] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="ilist" data-keep="ilist">' + (items || '<div class="empty">' + ic('circle-check') + 'Nothing here. Inbox zero.</div>') + '</div></div>' +
      '<div class="col mid">' + (t ? threadHTML(t) : '<div class="blank" id="inboxBlank"><img class="lg-l" src="brand/cac-logo.svg" alt="CAC Waste Management"><img class="lg-d" src="brand/cac-logo-inverted.svg" alt=""><b>Your inbox</b><small>WhatsApp, email and the website, all in one place. Pick a conversation on the left.</small><small class="k">Press <kbd>Esc</kbd> any time to come back here.</small></div>') + '</div>' +
      (showAsst ? '<div class="col asst asst-col" data-keep="asst">' + asstHTML(t) + '</div>' : '') + '</div>';
  };
  function unreadN(x) { var n = 0; for (var i = x.msgs.length - 1; i >= 0; i--) { if (x.msgs[i].dir === 'in' && !x.msgs[i].auto) n++; else if (x.msgs[i].dir === 'out' && !x.msgs[i].auto) break; } return n || 1; }
  function avCol(name, type) { var pal = PARTY_COL[type] || PARTY_COL.customer; var n = 0; for (var i = 0; i < name.length; i++) n += name.charCodeAt(i); return pal[n % pal.length]; }

  function threadHTML(t) {
    var p = CS.party(t.party), lastDay = '';
    var linked = '';
    if (t.party.type === 'customer') {
      var live = S.jobs.filter(function (j) { return j.cust === t.party.id && j.status !== 'done'; });
      linked = live.length ? '<span>' + live.length + ' live job' + (live.length > 1 ? 's' : '') + '</span>' : '';
    }
    var msgs = t.msgs.map(function (m, i) {
      var d = new Date(m.at); var dl = d.toDateString(); var sep = '';
      if (dl !== lastDay) { lastDay = dl; var off = Math.round((new Date(d).setHours(0, 0, 0, 0) - CS.dayDate(0)) / 86400000); sep = '<div class="daysep">' + CS.fmtDay(off) + '</div>'; }
      var isNew = i === t.msgs.length - 1 && ui.bubNew === t.id;
      return sep + '<div class="bub ' + (m.dir === 'out' ? 'out' : 'in') + (t.ch !== 'wa' ? ' email' : '') + (isNew ? ' newin' : '') + '">' +
        (i === 0 && t.subject ? '<span class="subj">' + h(t.subject) + '</span>' : '') +
        (i === 0 && t.form ? '<dl class="form">' + Object.keys(t.form).map(function (k) { return '<dt>' + h(k) + '</dt><dd>' + h(t.form[k]) + '</dd>'; }).join('') + '</dl>' : '') +
        (m.voice ? '<span class="voice">' + ic('play') + '<i></i><span>0:' + String(m.voice).padStart(2, '0') + '</span></span><span class="vtr">' + ic('microphone') + 'Voice note, written out</span>' : '') +
        h(m.text) +
        (m.att && m.att.length ? '<div class="att">' + m.att.map(function (a) { return '<button data-act="att" data-n="' + h(a.n) + '" data-t="' + a.t + '" data-job="' + h(a.job || jobFromName(a.n)) + '">' + ic(a.t === 'photo' ? 'eye' : a.t === 'wtn' ? 'certificate' : 'file-text') + h(a.n) + '</button>'; }).join('') + '</div>' : '') +
        '<div class="meta">' + (m.dir === 'out' ? (m.by ? h(m.by) + ' · ' : '') : '') + CS.clock(m.at) + (m.dir === 'out' ? ' ' + ic('checks') : '') + '</div></div>';
    }).join('');
    ui.bubNew = null;
    return '<div class="thread"><div class="thd"><button class="iconbtn back" data-act="back" aria-label="Back to the list">' + ic('chevron-left') + '</button>' + av(p.name, t.party.type, 'lg') +
      '<div class="who"><b>' + h(p.name) + '</b><small>' + h(p.sub) + ' · ' + chTag(t.ch) + (p.phone ? '<span class="hide-sm">' + h(p.phone) + '</span>' : '') + linked + '</small></div>' +
      (ui.asst === false ? '<button class="btn sm ai" data-act="asstShow" title="Open the assistant">' + ic('sparkles') + '<span class="hide-sm">' + (needsYou(t) && !t.done ? 'Response drafted' : 'Assistant') + '</span></button>' : '') +
      '<button class="btn sm" data-act="partyOpen" data-id="' + t.id + '">' + ic(t.party.type === 'supplier' ? 'warehouse' : 'user') + '<span class="hide-sm">' + (t.party.type === 'supplier' ? 'Supplier' : t.party.type === 'lead' ? 'Lead' : 'Customer') + '</span></button></div>' +
      '<div class="msgs" data-keep="msgs-' + t.id + '">' + msgs + '</div>' +
      '<div class="compose"><textarea id="compose" rows="1" placeholder="Reply yourself on ' + CS.chName(CS.replyCh(t.ch)) + '..."></textarea><button class="btn dark" data-act="sendOwn" data-id="' + t.id + '">' + ic('send') + '<span class="hide-sm">Send</span></button></div></div>';
  }
  function jobFromName(n) { var m = /CAC-\d+/.exec(n || ''); return m ? m[0] : ''; }

  function asstHTML(t) {
    var head = '<div class="ahd"><span class="spark">' + ic('sparkles') + '</span><b>Assistant</b><span class="sp"></span><span class="tag hide-sm">' + ic('shield-check') + 'Drafts only</span><button class="iconbtn sm" data-act="asstHide" aria-label="Hide the assistant" title="Hide the assistant">' + ic('x') + '</button></div>';
    var jd = ui.justDone[t.id];
    if (jd) {
      return head + '<div class="donecard"><h3>' + ic('circle-check') + 'Done in one tap</h3>' + jd.steps.map(function (s, i) { return '<div class="st" style="animation-delay:' + (i * 0.28) + 's">' + ic('check') + '<span>' + h(s) + '</span></div>'; }).join('') +
        '<div class="saved">About ' + jd.mins + ' minutes of admin done for you. Today so far: ' + hm(S.saved.mins) + '.</div>' +
        '<div class="row" style="margin-top:8px;flex-wrap:wrap">' + (jd.job ? '<button class="btn sm" data-act="openJob" data-id="' + jd.job + '">' + ic('truck') + 'Open ' + jd.job + '</button>' : '') +
        '<button class="btn sm pri" data-act="nextMsg">' + ic('arrow-right') + 'Next message</button></div></div>';
    }
    if (t.done) return head + '<div class="abody"><div class="ahead"><h3>Done</h3><p>Nothing waiting on this conversation.</p></div><button class="btn" data-act="reopen" data-id="' + t.id + '">' + ic('refresh') + 'Reopen</button></div>';
    if (ui.reading[t.id]) {
      return head + '<div class="reading"><div class="rl ok"><span class="dot"></span>Reading the message</div><div class="rl" style="animation-delay:.25s"><span class="dot"></span>Matching the customer, site and live jobs</div><div class="rl" style="animation-delay:.5s"><span class="dot"></span>Checking supplier rates and cover</div><div class="rl" style="animation-delay:.75s"><span class="dot"></span>Writing it in your tone</div>' +
        '<div class="skel" style="width:80%;margin-top:8px"></div><div class="skel" style="width:60%"></div><div class="skel" style="width:70%"></div></div>';
    }
    var A = CS.analyse(t), typeIn = !ui.typed[t.id] && t.justRead;
    var gd = X.guide && X.guide(t, A, typeIn); if (gd) return head + gd;
    var o = head + '<div class="abody"><div class="ahead"><h3>' + h(A.title) + '</h3><p>' + h(A.summary || '') + '</p></div>';
    if (A.chips.length) o += '<div class="chips">' + A.chips.map(function (c, i) { return '<span class="chip' + (c.assumed ? ' assumed' : '') + (typeIn ? ' reveal' : '') + '" style="animation-delay:' + (i * 0.07) + 's"><small>' + h(c.k) + '</small><span>' + h(c.v) + '</span></span>'; }).join('') + '</div>';
    A.notes.forEach(function (n) {
      var multi = /Tap to change/.test(n);
      o += '<div class="note' + (multi ? ' click' : '') + '"' + (multi ? ' data-act="cycleSite" data-id="' + t.id + '" role="button" tabindex="0"' : '') + '>' + ic('sparkles') + '<span>' + h(n) + '</span></div>';
    });
    var supHtml = '';
    if (A.lines.length) {
      o += '<div class="money">' + A.lines.map(function (l, i) {
        var su = l.sup && CS.sup(l.sup);
        return '<div class="ln"><div class="d"><b>' + h(l.desc) + '</b><small>' + (su ? h(su.name) + ' · cost ' + money(l.cost) : 'Cost ' + money(l.cost)) + '</small></div>' +
          '<span class="c">sell</span><input id="price-' + t.id + '-' + i + '" data-price="' + i + '" data-id="' + t.id + '" inputmode="numeric" value="' + l.sell + '" aria-label="Customer price"></div>';
      }).join('') +
        '<div class="tot"><div><small>Customer</small><b class="num">' + money(A.sell) + '</b></div><div><small>Supplier</small><b class="num">' + money(A.cost) + '</b></div><div class="m"><small>Margin</small><b class="num">' + money(A.margin) + ' <span style="font-size:12px">' + CS.pct(A.margin, A.sell) + '%</span></b></div></div></div>';
      A.lines.forEach(function (l, i) {
        if (!l.alts || l.alts.length < 2) { if (l.why && l.sup) supHtml += '<div class="note">' + ic('star') + '<span><b>' + h(CS.sup(l.sup).name) + '</b>: ' + h(l.why) + '</span></div>'; return; }
        supHtml += '<div class="supsel"><div class="sec"><h3>Supplier for ' + h(l.desc.toLowerCase()) + '</h3></div>' + l.alts.map(function (a) {
          var su = CS.sup(a.sup);
          return '<button class="supopt' + (a.sup === l.sup ? ' on' : '') + '" data-act="pickSup" data-id="' + t.id + '" data-i="' + l.idx + '" data-s="' + a.sup + '"><span class="nm"><b>' + h(su.name) + '</b><small>' + su.onTime + '% on time · confirms in ~' + su.resp + ' min' + (su.wtn ? ' · WTNs ' + su.wtn + '%' : '') + '</small></span><b class="num">' + money(a.cost) + '</b>' + (a.sup === l.sup ? ic('circle-check') : '') + '</button>';
        }).join('') + (l.why ? '<div class="note">' + ic('star') + '<span>' + h(l.why) + '</span></div>' : '') + '</div>';
      });
    }
    A.drafts.forEach(function (d, i) {
      var who = CS.party(d.party);
      var text = (t.edits && t.edits[i] != null) ? t.edits[i] : d.text.replace(/\{JOB\}/g, 'CAC-' + S.counters.job);
      o += '<div class="draft"><div class="dh">' + ic(chIcon(d.ch)) + '<span>To ' + h(d.to === 'supplier' ? who.name : who.name + (who.sub ? ', ' + who.sub : '')) + '</span><span class="sp"></span><span class="tag ai">' + (d.to === 'supplier' ? 'Supplier booking' : 'Your reply') + '</span></div>' +
        '<textarea id="draft-' + t.id + '-' + i + '" data-draft="' + i + '" data-id="' + t.id + '" rows="' + Math.min(9, Math.max(3, Math.ceil(text.length / 48) + (text.split('\n').length - 1))) + '"' + (typeIn ? ' data-typein="' + t.id + '"' : '') + '>' + h(text) + '</textarea>' +
        (d.to === 'customer' && A.att ? '<div class="att" style="padding:0 10px 10px">' + A.att.map(function (a) { return '<button data-act="att" data-n="' + h(a.n) + '" data-t="' + a.t + '" data-job="' + h(a.job || '') + '">' + ic(a.t === 'wtn' ? 'certificate' : 'eye') + h(a.n) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    });
    o += supHtml;
    o += '</div><div class="approvebar"><button class="btn ' + (A.kind === 'hold' ? 'pri' : 'ok') + ' lg" data-act="approve" data-id="' + t.id + '">' + ic(A.kind === 'hold' ? 'pound' : 'check') + h(A.approve || 'Approve') + '</button>' +
      (A.alt ? '<button class="btn" data-act="bookAnyway" data-id="' + t.id + '">' + h(A.alt) + '</button>' : '') +
      '<div class="row" style="justify-content:center"><button class="btn sm ghost" data-act="skip" data-id="' + t.id + '">Not now</button><button class="btn sm ghost" data-act="ownReply" data-id="' + t.id + '">' + ic('pencil') + 'I\'ll reply myself</button></div>' +
      '<small>Nothing is sent until you tap approve. Edit any line first if you want.</small></div>';
    return o;
  }

  V.today = function () {
    var st = CS.stats(), ch = CS.chaseLists();
    var needs = sortedThreads().filter(needsYou).slice(0, 6);
    var todays = S.jobs.filter(function (j) { return [j.day, j.exDay, j.colDay].indexOf(0) >= 0 || [j.day, j.exDay, j.colDay].indexOf(1) >= 0; }).sort(function (p, q2) { function w(j) { return [j.day, j.exDay, j.colDay].indexOf(0) >= 0 ? 0 : 1; } return w(p) - w(q2); }).slice(0, 8);
    var mtd = S.months[S.months.length - 1];
    var maxW = Math.max.apply(null, S.weeks);
    var hours = hm(S.saved.mins);
    return '<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px"><div style="flex:1;min-width:220px"><h2 style="font-size:24px">' + greeting() + ', John</h2><p class="muted" style="margin:4px 0 0">' + st.needs + ' messages need you, every one already drafted. ' + st.today + ' jobs moving today.</p></div>' +
      '<button class="btn" data-act="briefing">' + ic('sun') + 'Briefing</button><button class="btn" data-act="go" data-v="inbox">' + ic('inbox') + 'Open the inbox</button></div>' +
      '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<button class="card kpi" data-act="go" data-v="inbox"><small>' + ic('inbox') + 'Needs you</small><b>' + st.needs + '</b><span class="d">all drafted, one tap each</span></button>' +
      '<button class="card kpi" data-act="go" data-v="jobs"><small>' + ic('truck') + 'Jobs today and tomorrow</small><b>' + (st.today + st.tomorrow) + '</b><span class="d">' + st.onhire + ' on hire, ' + st.awaiting + ' waiting on supplier</span></button>' +
      '<button class="card kpi hero" data-act="go" data-v="money"><small>' + ic('pound') + 'Margin this month</small><b>' + money(mtd.margin) + '</b><span class="d">' + CS.pct(mtd.margin, mtd.rev) + '% on ' + money(mtd.rev) + ' sales</span></button>' +
      '<button class="card kpi" data-act="go" data-v="chasing"><small>' + ic('pound') + 'Overdue to you</small><b>' + money(st.overdue) + '</b><span class="d">' + ch.pay.length + ' invoices, reminders ready</span></button></div>' + X.todayStrip() +
      '<div class="grid g64"><div class="grid" style="align-content:start">' +
      '<div class="card"><div class="hd"><h2>' + ic('sparkles') + 'Needs you</h2><button class="btn sm" data-act="go" data-v="inbox">See all</button></div><div class="bd needs">' +
      (needs.length ? needs.map(function (t) { var p = CS.party(t.party), A = CS.analyse(t); return '<button class="n" data-act="openThread" data-id="' + t.id + '">' + av(p.name, t.party.type, 'sm') + '<span class="bd"><b>' + h(A.title) + '</b><small>' + h(p.name + ', ' + p.sub) + ' · ' + CS.chName(t.ch) + ' · ' + CS.ago(t.last) + '</small></span>' + (A.kind === 'hold' ? '<span class="tag bad">On hold</span>' : (A.margin ? '<span class="tag ok">' + money(A.margin) + '</span>' : '')) + ic('chevron-right') + '</button>'; }).join('') : '<div class="empty">' + ic('circle-check') + 'All clear.</div>') +
      '</div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('truck') + 'Today and tomorrow</h2><button class="btn sm" data-act="go" data-v="jobs">Live jobs</button></div><div class="tw"><table class="t"><tbody>' +
      todays.map(function (j) { var c = CS.cust(j.cust), s = CS.jobSite(j), what = j.exDay === 0 || j.exDay === 1 ? 'Exchange' : (j.colDay === 0 || j.colDay === 1 ? 'Collection' : 'Delivery'); var when = what === 'Exchange' ? j.exDay : what === 'Collection' ? j.colDay : j.day;
        return '<tr class="click" data-act="openJob" data-id="' + j.id + '"><td><b>' + CS.fmtDay(when) + '</b><small>' + what + '</small></td><td><b>' + h(CS.jobDesc(j)) + '</b><small>' + h(c.name) + ', ' + h(s.pc) + '</small></td><td class="hide-sm"><small style="display:inline">' + h(CS.sup(j.sup).name) + '</small></td><td class="r">' + stTag(j.status) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' + (window.CACQ && window.CACQ.quietCard ? window.CACQ.quietCard() : '') + '</div>' +
      '<div class="grid" style="align-content:start">' +
      '<div class="card pad"><h2>' + ic('hourglass') + 'Admin done for you today</h2><div style="display:flex;align-items:baseline;gap:10px;margin:10px 0 4px"><b style="font-size:34px;letter-spacing:-.02em">' + hours + '</b><span class="muted">' + S.saved.actions + ' jobs, quotes and chases</span></div>' +
      '<p class="muted" style="margin:0;font-size:12.5px">Estimate, using 3 to 25 minutes per task done by hand. That is the work of an admin hire, done before you open the inbox.</p></div>' + X.todayNudge() +
      '<div class="card pad"><h2>' + ic('trending-up') + 'Margin by week</h2><div class="bars">' + S.weeks.map(function (w, i) { return '<div class="b' + (i < S.weeks.length - 1 ? ' dim' : '') + '"><em>' + (w >= 1000 ? '£' + (w / 1000).toFixed(1) + 'k' : money(w)) + '</em><i style="height:' + Math.round(w / maxW * 100) + '%"></i><span>' + (i === S.weeks.length - 1 ? 'This wk' : 'W' + (i + 1)) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('activity' in window.ICONS ? 'activity' : 'bolt') + 'What happened</h2></div><div class="bd feed">' + S.feed.slice(0, 7).map(function (f) { return '<div class="f">' + ic(f.ic) + '<span>' + h(f.t) + '</span><time>' + CS.ago(f.at) + '</time></div>'; }).join('') + '</div></div>' +
      '</div></div>';
  };

  V.jobs = function () {
    var cols = ['booked', 'confirmed', 'onhire', 'exchange', 'collection', 'done'];
    var q = ui.jobQ.toLowerCase();
    var js = S.jobs.filter(function (j) {
      if (ui.jobOwner !== 'all' && j.owner !== ui.jobOwner) return false;
      if (!q) return true; var c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup);
      return (j.id + ' ' + c.name + ' ' + s.name + ' ' + s.pc + ' ' + su.name + ' ' + CS.jobDesc(j)).toLowerCase().indexOf(q) >= 0;
    });
    var marg = js.filter(function (j) { return j.status !== 'done'; }).reduce(function (a, j) { return a + j.sell - j.cost; }, 0);
    return '<div class="row" style="flex-wrap:wrap;margin-bottom:14px"><div class="seg">' + [['all', 'Everyone'], ['john', 'John'], ['sam', CS.bde()]].map(function (x) { return '<button data-act="jobOwner" data-v="' + x[0] + '" class="' + (ui.jobOwner === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="search" style="display:flex;width:240px;max-width:100%">' + ic('search') + '<input id="jobQ" placeholder="Job, customer, postcode" value="' + h(ui.jobQ) + '"></div><span class="sp"></span>' +
      '<span class="tag ok">' + money(marg) + ' margin on live jobs</span><button class="btn pri" data-act="newQuote">' + ic('plus') + 'New job</button></div>' +
      '<div class="board" data-keep="board">' + cols.map(function (c) {
        var list = js.filter(function (j) { return j.status === c; }).sort(function (a, b) { return a.day - b.day; });
        return '<div class="bcol" style="--c:' + STATUS[c][2] + '"><div class="bh"><i></i>' + STATUS[c][0] + '<span class="n">' + list.length + '</span></div><div class="bb">' +
          list.map(function (j) { var cu = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup); var when = c === 'exchange' ? j.exDay : c === 'collection' ? j.colDay : j.day;
            var wait = c === 'booked' && j.bookedAt ? Math.round((Date.now() - j.bookedAt) / 60000) : null;
            return '<button class="jc' + (ui.flash === j.id ? ' flash' : '') + '" data-act="openJob" data-id="' + j.id + '"><span class="r1">' + j.id + '<span class="sp"></span>' + ic('calendar') + CS.fmtDay(when) + '</span><b>' + h(CS.jobDesc(j)) + '</b>' +
              '<span class="r3">' + ic('map-pin') + h(cu.name) + ', ' + h(s.pc) + '</span><span class="r3">' + ic('warehouse') + h(su.name) + '</span>' +
              '<span class="r4">' + margTag(j.sell - j.cost, j.sell) + (wait != null ? '<span class="tag amber">' + ic('clock') + wait + ' min</span>' : wtnTag(j.wtn)) + '</span></button>'; }).join('') +
          (list.length ? '' : '<div class="empty" style="padding:18px 8px;font-size:12.5px">None</div>') + '</div></div>';
      }).join('') + '</div>';
  };

  V.quotes = function () {
    var qs = S.quotes.filter(function (q) { return ui.qFilter === 'all' || q.status === ui.qFilter; });
    var open = S.quotes.filter(function (q) { return q.status === 'sent' || q.status === 'draft'; });
    var won = S.quotes.filter(function (q) { return q.status === 'won'; }), lost = S.quotes.filter(function (q) { return q.status === 'lost'; });
    var avgM = won.length ? Math.round(won.reduce(function (a, q) { return a + CS.pct(q.sell - q.cost, q.sell); }, 0) / won.length) : 0;
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>Open quotes</small><b>' + open.length + '</b><span class="d">' + money(open.reduce(function (a, q) { return a + q.sell; }, 0)) + ' of work</span></div>' +
      '<div class="card kpi"><small>Won this month</small><b>' + won.length + '</b><span class="d up">' + Math.round(won.length / Math.max(1, won.length + lost.length) * 100) + '% win rate</span></div>' +
      '<div class="card kpi"><small>Average margin on won</small><b>' + avgM + '%</b><span class="d">target 25%</span></div>' +
      '<div class="card kpi"><small>Need a follow up</small><b>' + CS.chaseLists().quotes.length + '</b><span class="d">sent 2+ days, no answer</span></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('file-text') + 'Quotes</h2><div class="seg hide-sm">' + [['all', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['won', 'Won'], ['lost', 'Lost']].map(function (x) { return '<button data-act="qFilter" data-v="' + x[0] + '" class="' + (ui.qFilter === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><button class="btn pri sm" data-act="newQuote">' + ic('plus') + 'Quick quote</button></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Quote</th><th>Customer</th><th class="r">Price</th><th class="r hide-sm">Cost</th><th class="r">Margin</th><th>Status</th><th class="hide-md">Owner</th><th></th></tr></thead><tbody>' +
      qs.map(function (q) { var who = q.cust ? CS.cust(q.cust).name : CS.lead(q.lead).company; var m = q.sell - q.cost;
        var stc = { draft: '', sent: 'amber', won: 'ok', lost: 'bad' }[q.status];
        return '<tr class="click" data-act="openQuote" data-id="' + q.id + '"><td><b>' + q.id + '</b><small>' + CS.fmtDay(q.day) + '</small></td><td><b>' + h(who) + '</b><small>' + h(q.desc) + '</small></td><td class="r num">' + money(q.sell) + '</td><td class="r num hide-sm">' + money(q.cost) + '</td><td class="r"><span class="marg">' + money(m) + '<small>' + CS.pct(m, q.sell) + '%</small></span></td><td><span class="tag ' + stc + '">' + q.status.replace(/^./, function (x) { return x.toUpperCase(); }) + '</span>' + (q.status === 'lost' && q.lostWhy ? '<small>' + h(q.lostWhy) + '</small>' : (q.repriced ? '<small>Repriced</small>' : '')) + '</td><td class="hide-md">' + (q.owner === 'sam' ? CS.bde() : 'John') + '</td>' +
          '<td class="r">' + (q.status === 'sent' ? '<button class="btn sm" data-act="chaseQuote" data-id="' + q.id + '">' + ic('bell') + '<span class="hide-sm">Chase</span></button>' : q.status === 'draft' ? '<button class="btn sm" data-act="sendQuote" data-id="' + q.id + '">' + ic('send') + '<span class="hide-sm">Send</span></button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  };

  V.suppliers = function () {
    var lk = ui.lookup || { pc: 'PE31 8LT', svc: 'skip', size: 8 };
    var res = CS.lookup(lk.pc, { svc: lk.svc, size: Number(lk.size) || 8, qty: 1, weeks: 4, panels: 20, m3: 6, hours: 4 });
    return X.rateAlert() + '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('map-pin') + 'Who covers this postcode?</h2></div><div class="bd">' +
      '<div class="row" style="flex-wrap:wrap;align-items:flex-end;gap:10px"><div class="field" style="margin:0;width:150px"><label for="lkPc">Site postcode</label><input id="lkPc" value="' + h(lk.pc) + '"></div>' +
      '<div class="field" style="margin:0;width:190px"><label for="lkSvc">Service</label><select id="lkSvc">' + Object.keys(S.services).map(function (k) { return '<option value="' + k + '"' + (k === lk.svc ? ' selected' : '') + '>' + S.services[k].name + '</option>'; }).join('') + '</select></div>' +
      (lk.svc === 'skip' ? '<div class="field" style="margin:0;width:120px"><label for="lkSize">Size</label><select id="lkSize">' + [4, 6, 8, 10, 12, 14, 16, 20, 40].map(function (z) { return '<option value="' + z + '"' + (z == lk.size ? ' selected' : '') + '>' + z + ' yard</option>'; }).join('') + '</select></div>' : '') +
      '<button class="btn dark" data-act="lookup">' + ic('search') + 'Find suppliers</button></div>' +
      '<div style="margin-top:14px">' + (res.length ? '<div class="tw"><table class="t"><thead><tr><th>Supplier</th><th class="r">Their rate</th><th class="r hide-sm">Your price</th><th class="r">Margin</th><th class="hide-sm">On time</th><th class="hide-md">Confirms in</th><th class="hide-md">WTNs back</th></tr></thead><tbody>' +
        res.map(function (r, i) { return '<tr class="click" data-act="openSup" data-id="' + r.sup.id + '"><td><b>' + h(r.sup.name) + '</b> ' + (i === 0 ? '<span class="tag ok">' + ic('star') + 'Best pick</span>' : '') + '<small>' + h(r.sup.base) + '</small></td><td class="r num">' + money(r.cost) + '</td><td class="r num hide-sm">' + money(r.sell) + '</td><td class="r"><span class="marg">' + money(r.margin) + '<small>' + CS.pct(r.margin, r.sell) + '%</small></span></td><td class="hide-sm">' + r.sup.onTime + '%</td><td class="hide-md">~' + r.sup.resp + ' min</td><td class="hide-md">' + (r.sup.wtn ? r.sup.wtn + '%' : 'n/a') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (res[0].why ? '<div class="note" style="margin-top:10px">' + ic('sparkles') + '<span><b>Why ' + h(res[0].sup.name) + ':</b> ' + h(res[0].why) + '</span></div>' : '')
        : '<div class="note">' + ic('alert') + '<span>No supplier on file covers ' + h(CS.outward(lk.pc)) + ' for ' + h(S.services[lk.svc].name.toLowerCase()) + '. That is a gap to fill: add one and every quote there prices itself.</span></div>') + '</div></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('warehouse') + 'Suppliers <span class="muted" style="font-weight:600">' + S.suppliers.length + '</span></h2><button class="btn sm" data-act="addSup">' + ic('plus') + 'Add supplier</button></div><div class="tw"><table class="t"><thead><tr><th>Supplier</th><th class="hide-sm">Covers</th><th>On time</th><th class="hide-md">Confirms in</th><th class="hide-md">WTNs back</th><th class="hide-sm">Licence</th><th class="r hide-sm">Jobs</th></tr></thead><tbody>' +
      S.suppliers.map(function (s) { return '<tr class="click" data-act="openSup" data-id="' + s.id + '"><td><b>' + h(s.name) + '</b>' + (s.preferred ? ' <span class="tag brand">Preferred</span>' : '') + '<small>' + s.services.map(function (k) { return S.services[k].short; }).join(', ') + '</small></td><td class="hide-sm"><small style="display:inline">' + h(coverText(s)) + '</small></td>' +
        '<td><span class="tag ' + (s.onTime >= 95 ? 'ok' : s.onTime >= 91 ? 'amber' : 'bad') + '">' + s.onTime + '%</span></td><td class="hide-md">~' + s.resp + ' min</td><td class="hide-md">' + (s.wtn ? s.wtn + '%' : 'n/a') + '</td><td class="hide-sm">' + licTag(s) + '</td><td class="r hide-sm num">' + s.jobs + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  };
  function coverText(s) {
    var byArea = {}; s.areas.forEach(function (a) { var ar = CS.area(a); (byArea[ar] = byArea[ar] || []).push(a); });
    return Object.keys(byArea).map(function (ar) { var l = byArea[ar]; if (l.length === 1 && l[0] === ar) return ar + ' (all)'; var n = l.map(function (x) { return parseInt(x.slice(ar.length), 10); }).sort(function (a, b) { return a - b; }); var out = [], st = n[0], pv = n[0];
      n.slice(1).concat([null]).forEach(function (x) { if (x === pv + 1) { pv = x; return; } out.push(st === pv ? ar + st : ar + st + ' to ' + ar + pv); st = pv = x; });
      return out.join(', '); }).join(', ');
  }
  function licTag(s) { if (s.licExp == null) return '<span class="tag">' + h(s.cbdu) + '</span>'; return s.licExp < 60 ? '<span class="tag amber">' + ic('alert') + 'Renews ' + CS.fmtDay(s.licExp) + '</span>' : '<span class="tag ok">' + ic('shield-check') + 'Valid</span>'; }

  V.chasing = function () {
    var ch = CS.chaseLists(), set = S.settings;
    function sec(title, icon, count, act, rows, empty) {
      return '<div class="card"><div class="hd"><h2>' + ic(icon) + h(title) + ' <span class="muted" style="font-weight:600">' + count + '</span></h2>' + (count ? '<button class="btn sm pri" data-act="' + act + '">' + ic('bell') + 'Chase all</button>' : '') + '</div><div class="bd" style="padding-top:4px;padding-bottom:4px">' + (rows || '<div class="empty">' + ic('circle-check') + h(empty) + '</div>') + '</div></div>';
    }
    var supRows = ch.sup.map(function (x) { var j = x.j, su = CS.sup(j.sup), c = CS.cust(j.cust);
      return '<div class="rowline"><span class="tag ' + (x.mins >= set.chaseMins ? 'bad' : 'amber') + '">' + ic('clock') + x.mins + ' min</span><div class="bd"><b>' + h(su.name) + ' hasn\'t confirmed ' + j.id + '</b><small>' + h(CS.jobDesc(j)) + ' for ' + h(c.name) + ', ' + CS.fmtDay(j.day) + (j.chased ? ' · chased ' + j.chased + 'x' : (set.autoChase ? ' · auto chase at ' + set.chaseMins + ' min' : '')) + '</small></div><button class="btn sm" data-act="chaseSup" data-id="' + j.id + '">' + ic('whatsapp') + 'Chase</button></div>'; }).join('');
    var wtnRows = ch.wtn.map(function (j) { var su = CS.sup(j.sup), c = CS.cust(j.cust);
      return '<div class="rowline"><span class="tag bad">' + ic('certificate') + (-j.day) + ' days</span><div class="bd"><b>No WTN from ' + h(su.name) + ' for ' + j.id + '</b><small>' + h(CS.jobDesc(j)) + ' at ' + h(c.name) + ', delivered ' + CS.fmtDay(j.day) + (j.wtn === 'chased' ? ' · chased' : '') + '</small></div><button class="btn sm" data-act="chaseWtn" data-id="' + j.id + '">' + ic('whatsapp') + 'Chase</button></div>'; }).join('');
    var payRows = ch.pay.map(function (i) { var c = CS.cust(i.cust);
      return '<div class="rowline"><span class="tag bad">' + (-i.due) + ' days late</span><div class="bd"><b>' + h(c.name) + ' owes ' + money(i.amount, true) + '</b><small>' + i.id + ', due ' + CS.fmtDay(i.due) + (i.reminded ? ' · reminded ' + i.reminded + 'x' : '') + '</small></div><button class="btn sm" data-act="remind" data-id="' + i.id + '">' + ic('mail') + 'Remind</button></div>'; }).join('');
    var qRows = ch.quotes.map(function (q) { var who = q.cust ? CS.cust(q.cust).name : CS.lead(q.lead).company;
      return '<div class="rowline"><span class="tag amber">' + (-q.day) + ' days</span><div class="bd"><b>' + h(who) + ', ' + q.id + ', ' + money(q.sell) + '</b><small>' + h(q.desc) + ' · ' + (q.owner === 'sam' ? CS.bde() : 'John') + (q.chased ? ' · followed up' : '') + '</small></div><button class="btn sm" data-act="chaseQuote" data-id="' + q.id + '">' + ic('whatsapp') + 'Follow up</button></div>'; }).join('');
    return '<div class="grid g64"><div class="grid" style="align-content:start">' +
      sec('Suppliers not confirmed', 'warehouse', ch.sup.length, 'chaseAllSup', supRows, 'Every booking is confirmed.') +
      sec('Customers not paid', 'pound', ch.pay.length, 'chaseAllPay', payRows, 'Nobody is late paying.') +
      sec('WTNs not back', 'certificate', ch.wtn.length, 'chaseAllWtn', wtnRows, 'Every WTN is on file.') +
      sec('Skips sitting on site', 'skip', ch.nudge.length, 'nudgeAll', X.nudgeRows(ch.nudge), 'Nothing has sat too long.') +
      sec('Quotes with no answer', 'file-text', ch.quotes.length, 'chaseAllQ', qRows, 'No quotes waiting.') + '</div>' +
      '<div class="grid" style="align-content:start"><div class="card pad"><h2>' + ic('bolt') + 'Chase rules</h2><p class="muted" style="margin:6px 0 4px;font-size:12.5px">The system chases for you on WhatsApp and email, using these rules. Every chase is logged on the job.</p>' +
      '<div class="rowline"><div class="bd"><b>Chase suppliers who haven\'t confirmed</b><small>After <span class="seg" style="vertical-align:middle;margin-left:4px">' + [15, 30, 60].map(function (m) { return '<button data-act="chaseMins" data-v="' + m + '" class="' + (set.chaseMins === m ? 'on' : '') + '">' + m + ' min</button>'; }).join('') + '</span></small></div><button class="switch' + (set.autoChase ? ' on' : '') + '" data-act="toggle" data-k="autoChase" aria-label="Auto chase suppliers"></button></div>' +
      '<div class="rowline"><div class="bd"><b>Chase missing WTNs</b><small>' + set.wtnDays + ' days after delivery, then every day</small></div><button class="switch' + (set.autoWtn !== false ? ' on' : '') + '" data-act="toggle" data-k="autoWtn" aria-label="Chase WTNs"></button></div>' +
      '<div class="rowline"><div class="bd"><b>Payment reminders</b><small>1, 7 and 14 days after the due date, with the invoice attached</small></div><button class="switch' + (set.autoPay !== false ? ' on' : '') + '" data-act="toggle" data-k="autoPay" aria-label="Payment reminders"></button></div>' +
      '<div class="rowline"><div class="bd"><b>Quote follow ups</b><small>2 days after sending, in the owner\'s name</small></div><button class="switch' + (set.autoQuote !== false ? ' on' : '') + '" data-act="toggle" data-k="autoQuote" aria-label="Quote follow ups"></button></div></div>' +
      '<div class="card pad"><h2>' + ic('shield-check') + 'Why it matters</h2><p class="muted" style="margin:6px 0 0;font-size:13px">The top complaints about skip brokers online are no-shows, nobody calling back and jobs that were never booked. Every one is a message nobody sent or a supplier nobody chased. This screen is that list, and it empties itself.</p></div></div></div>';
  };

  V.money = function () {
    var mtd = S.months[S.months.length - 1], st = CS.stats();
    var maxR = Math.max.apply(null, S.months.map(function (m) { return m.rev; }));
    var bySvc = {}, bySup = {};
    S.jobs.forEach(function (j) { var k = CS.svc(j.svc).short; bySvc[k] = (bySvc[k] || 0) + j.sell - j.cost; var su = CS.sup(j.sup).name; bySup[su] = (bySup[su] || 0) + j.sell - j.cost; });
    function hb(obj) { var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, 6), mx = Math.max.apply(null, ks.map(function (k) { return obj[k]; })); return ks.map(function (k) { return '<div class="hbar"><span>' + h(k) + '</span><span class="tr"><i style="width:' + Math.round(obj[k] / mx * 100) + '%"></i></span><span class="v">' + money(obj[k]) + '</span></div>'; }).join(''); }
    var notInv = S.jobs.filter(function (j) { return j.status === 'done' && !S.invoices.some(function (i) { return i.jobs.indexOf(j.id) >= 0; }); });
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>Sales this month</small><b>' + money(mtd.rev) + '</b><span class="d up">on track for ' + money(Math.round(mtd.rev / CS.dayDate(0).getDate() * 30 / 100) * 100) + '</span></div>' +
      '<div class="card kpi hero"><small>Margin this month</small><b>' + money(mtd.margin) + '</b><span class="d">' + CS.pct(mtd.margin, mtd.rev) + '% average</span></div>' +
      '<div class="card kpi"><small>Owed to you</small><b>' + money(st.owed) + '</b><span class="d">' + money(st.overdue) + ' overdue</span></div>' +
      '<div class="card kpi"><small>Supplier bills to check</small><b>' + S.bills.filter(function (b) { return b.status === 'query'; }).length + '</b><span class="d">every bill matched to the job</span></div></div>' + X.moneyFound() +
      '<div class="grid g3" style="margin-bottom:16px"><div class="card pad"><h2>' + ic('trending-up') + 'Sales and margin by month</h2><div class="bars" style="height:170px">' + S.months.map(function (m) { return '<div class="b"><em>' + money(m.margin) + '</em><i style="height:' + Math.round(m.rev / maxR * 100) + '%;background:linear-gradient(to top,var(--brand) ' + CS.pct(m.margin, m.rev) + '%,var(--brand-m) ' + CS.pct(m.margin, m.rev) + '%)"></i><span>' + m.m + (m.mtd ? ' so far' : '') + '</span></div>'; }).join('') + '</div><p class="muted" style="font-size:12px;margin:8px 0 0">Bar is sales, solid part is margin.</p></div>' +
      '<div class="card pad"><h2>' + ic('pound') + 'Margin by service, live jobs</h2><div style="margin-top:8px">' + hb(bySvc) + '</div></div>' +
      '<div class="card pad"><h2>' + ic('warehouse') + 'Margin by supplier, live jobs</h2><div style="margin-top:8px">' + hb(bySup) + '</div></div></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('receipt') + 'Invoices</h2>' + (notInv.length ? '<button class="btn sm" data-act="raiseAll">' + ic('plus') + 'Invoice ' + notInv.length + ' finished job' + (notInv.length > 1 ? 's' : '') + '</button>' : '') + '<button class="btn sm dark" data-act="xero">' + ic('refresh') + 'Sync to Xero</button></div><div class="tw"><table class="t"><thead><tr><th>Invoice</th><th>Customer</th><th class="r">Amount</th><th class="hide-sm">Due</th><th>Status</th><th></th></tr></thead><tbody>' +
      S.invoices.slice().sort(function (a, b) { return (a.status === 'paid') - (b.status === 'paid') || a.due - b.due; }).map(function (i) { var c = CS.cust(i.cust), late = i.status !== 'paid' && i.due < 0;
        return '<tr class="click" data-act="openInv" data-id="' + i.id + '"><td><b>' + i.id + '</b><small>' + CS.fmtDay(i.issued) + '</small></td><td>' + h(c.name) + '</td><td class="r num"><b>' + money(i.amount, true) + '</b></td><td class="hide-sm">' + CS.fmtDay(i.due) + '</td><td>' + (i.status === 'paid' ? '<span class="tag ok">Paid</span>' : late ? '<span class="tag bad">' + (-i.due) + ' days late</span>' : '<span class="tag">Due</span>') + '</td>' +
          '<td class="r">' + (i.status !== 'paid' ? '<button class="btn sm" data-act="markPaid" data-id="' + i.id + '">' + ic('check') + '<span class="hide-sm">Paid</span></button> ' + (late ? '<button class="btn sm" data-act="remind" data-id="' + i.id + '">' + ic('mail') + '<span class="hide-sm">Remind</span></button>' : '') : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('warehouse') + 'Supplier bills, matched to the job</h2></div><div class="tw"><table class="t"><thead><tr><th>Bill</th><th>Supplier</th><th class="hide-sm">Job</th><th class="r">Agreed</th><th class="r">Billed</th><th>Check</th><th></th></tr></thead><tbody>' +
      S.bills.map(function (b) { var d = b.billed - b.expected;
        return '<tr><td><b>' + b.id + '</b></td><td>' + h(CS.sup(b.sup).name) + '</td><td class="hide-sm"><a class="link" data-act="openJob" data-id="' + b.job + '">' + b.job + '</a></td><td class="r num">' + money(b.expected) + '</td><td class="r num"><b>' + money(b.billed) + '</b></td><td>' + (b.status === 'query' ? '<span class="tag bad">' + money(d) + ' over</span>' : b.status === 'approved' ? '<span class="tag ok">Approved</span>' : '<span class="tag ok">' + ic('check') + 'Matches</span>') + '</td>' +
          '<td class="r">' + (b.status === 'query' ? '<button class="btn sm" data-act="billCheck" data-id="' + b.id + '">' + ic('sparkles') + 'Sort it</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  };

  V.paperwork = function () {
    var wj = S.jobs.filter(function (j) { return j.wtn; });
    var rec = wj.filter(function (j) { return j.wtn === 'received'; }).length, miss = wj.filter(function (j) { return j.wtn === 'missing' || j.wtn === 'chased'; }).length;
    var lic = S.suppliers.filter(function (s) { return s.licExp != null; }), soon = lic.filter(function (s) { return s.licExp < 60; });
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('certificate') + 'WTNs on file</small><b>' + rec + '</b><span class="d">kept 2 years, per job</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'WTNs missing</small><b style="color:var(--bad)">' + miss + '</b><span class="d">being chased</span></div>' +
      '<div class="card kpi"><small>' + ic('shield-check') + 'Carrier licences</small><b>' + lic.length + '</b><span class="d">' + soon.length + ' renewing soon</span></div>' +
      '<div class="card kpi"><small>' + ic('calendar') + 'Digital waste tracking</small><b style="font-size:20px">Ready</b><span class="d">brokers in from Oct 2027</span></div></div>' +
      '<div class="grid g64"><div class="card"><div class="hd"><h2>' + ic('certificate') + 'Waste transfer notes</h2><button class="btn sm pri" data-act="auditPack">' + ic('download') + 'Audit pack</button></div><div class="tw"><table class="t"><thead><tr><th>Job</th><th>Customer and site</th><th class="hide-md">Carrier</th><th class="hide-sm">Waste</th><th>WTN</th><th></th></tr></thead><tbody>' +
      wj.slice().sort(function (a, b) { return a.day - b.day; }).map(function (j) { var c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), sv = CS.svc(j.svc);
        return '<tr><td><a class="link" data-act="openJob" data-id="' + j.id + '">' + j.id + '</a><small>' + CS.fmtDay(j.day) + '</small></td><td><b>' + h(c.name) + '</b><small>' + h(s.name) + ', ' + h(s.pc) + '</small></td><td class="hide-md">' + h(su.name) + '<small>' + h(su.cbdu) + '</small></td><td class="hide-sm">' + h(sv.waste || '') + '<small>EWC ' + h(sv.ewc || '') + '</small></td><td>' + wtnTag(j.wtn) + '</td>' +
          '<td class="r">' + (j.wtn === 'received' ? '<button class="btn sm" data-act="viewWtn" data-id="' + j.id + '">' + ic('eye') + '<span class="hide-sm">View</span></button>' : (j.wtn === 'missing' || j.wtn === 'chased') ? '<button class="btn sm" data-act="chaseWtn" data-id="' + j.id + '">' + ic('bell') + '<span class="hide-sm">Chase</span></button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><div class="hd"><h2>' + ic('shield-check') + 'Supplier licences</h2><button class="btn sm" data-act="checkAll">' + ic('refresh') + 'Check the register</button></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      lic.sort(function (a, b) { return a.licExp - b.licExp; }).map(function (s) { return '<div class="rowline"><div class="bd"><b>' + h(s.name) + '</b><small>' + h(s.cbdu) + ' · expires ' + CS.fmtDay(s.licExp) + (s.checked ? ' · checked today' : '') + '</small></div>' + (s.licExp < 60 ? '<button class="btn sm" data-act="licCheck" data-id="' + s.id + '">' + ic('alert') + 'Ask for renewal</button>' : '<span class="tag ok">' + ic('check') + 'Valid</span>') + '</div>'; }).join('') + '</div></div>' +
      X.permits() +
      '<div class="card pad"><h2>' + ic('calendar') + 'What the law asks of a broker</h2><ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--ink2);display:flex;flex-direction:column;gap:6px">' +
      '<li>Only use registered carriers: every supplier\'s CBDU and expiry is stored and flagged before it lapses.</li>' +
      '<li>Keep WTNs for 2 years: each one is filed on its job the moment it arrives.</li>' +
      '<li>Mandatory digital waste tracking for carriers and brokers from Oct 2027: EWC code, carrier, site and weights are already captured per job.</li>' +
      '<li>Broker registration moves to permits from July 2027: CAC\'s own number and renewal date sit in Settings.</li></ul></div></div></div>';
  };

  V.sales = function () {
    var sm = S.sam, week = sm.calls.reduce(function (a, b) { return a + b; }, 0);
    var stages = [['new', 'New'], ['contacted', 'Contacted'], ['quoted', 'Quoted'], ['trial', 'First job'], ['won', 'Account opened']];
    var due = S.leads.filter(function (l) { return l.stage !== 'won' && l.next != null && l.next <= 0; }).sort(function (a, b) { return a.next - b.next; });
    var pv = S.leads.filter(function (l) { return l.stage !== 'won'; }).reduce(function (a, l) { return a + l.value; }, 0);
    var mx = Math.max.apply(null, sm.calls.concat([20]));
    return '<div class="row" style="margin-bottom:14px;flex-wrap:wrap">' + av(CS.bde(), 'lead', 'lg') + '<div style="flex:1;min-width:200px"><h2 style="font-size:18px">' + h(CS.bde()) + ', Business Development Executive</h2><span class="muted" style="font-size:13px">Your new hire. Every call, quote and follow up lands here, so you can see the pipeline without asking.</span></div>' + X.salesTag() + '<button class="btn" data-act="addLead">' + ic('user-plus') + 'Add lead</button></div>' +
      '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('phone') + 'Calls, last 5 working days</small><b>' + week + ' <span class="muted" style="font-size:14px">/ ' + sm.callTarget + '</span></b><div class="meter"><i style="width:' + Math.min(100, Math.round(week / sm.callTarget * 100)) + '%"></i></div></div>' +
      '<div class="card kpi"><small>' + ic('file-text') + 'Quotes sent</small><b>' + sm.quotes + '</b><span class="d">' + sm.emails + ' emails, ' + sm.linkedin + ' LinkedIn messages</span></div>' +
      '<div class="card kpi"><small>' + ic('user-plus') + 'Accounts opened</small><b>' + sm.accounts + '</b><span class="d up">this month</span></div>' +
      '<div class="card kpi hero"><small>Pipeline, est. monthly spend</small><b>' + money(pv) + '</b><span class="d">' + S.leads.filter(function (l) { return l.stage !== 'won'; }).length + ' open leads</span></div></div>' +
      '<div class="grid g64" style="margin-bottom:16px"><div class="card"><div class="hd"><h2>' + ic('bell') + 'Follow ups due</h2><span class="tag ' + (due.some(function (l) { return l.next < 0; }) ? 'bad' : 'amber') + '">' + due.length + ' due</span></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      (due.length ? due.map(function (l) { return '<div class="rowline"><span class="due ' + (l.next < 0 ? 'late' : 'today') + '" style="font-size:12px;font-weight:800;width:62px">' + (l.next < 0 ? (-l.next) + 'd late' : 'Today') + '</span><div class="bd"><b>' + h(l.company) + '</b><small>' + h(l.nextWhat) + ' · ' + h(l.contact) + '</small></div><button class="btn sm" data-act="openLead" data-id="' + l.id + '">Open</button><button class="btn sm" data-act="nudge" data-id="' + l.id + '">' + ic('bell') + '<span class="hide-sm">Nudge ' + h(CS.bde()) + '</span></button></div>'; }).join('') : '<div class="empty">' + ic('circle-check') + 'Nothing due.</div>') + '</div></div>' +
      '<div class="card pad"><h2>' + ic('phone') + 'Calls by day</h2><div class="bars" style="height:130px">' + [-4, -3, -2, -1, 0].map(function (o, i) { var v = sm.calls[i] || 0; var d = CS.dayDate(CS.wd(o)); return '<div class="b' + (o ? ' dim' : '') + '"><em>' + v + '</em><i style="height:' + Math.round(v / mx * 100) + '%"></i><span>' + (o ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] : 'Today') + '</span></div>'; }).join('') + '</div><p class="muted" style="font-size:12px;margin:8px 0 0">Target 20 a day. Logged from his phone in one tap.</p></div></div>' +
      '<div class="pipe">' + stages.map(function (st) { var ls = S.leads.filter(function (l) { return l.stage === st[0]; });
        return '<div class="bcol"><div class="bh">' + st[1] + '<span class="n">' + ls.length + '</span></div><div class="bb">' + ls.map(function (l) { return '<button class="lc" data-act="openLead" data-id="' + l.id + '"><b>' + h(l.company) + '</b><small>' + h(l.contact) + ' · ' + h(l.area) + '</small><small>' + h(l.source) + ' · ~' + money(l.value) + '/mo</small>' + (l.next != null && st[0] !== 'won' ? '<span class="due ' + (l.next < 0 ? 'late' : l.next === 0 ? 'today' : '') + '">' + ic('calendar') + ' ' + (l.next < 0 ? (-l.next) + ' days late' : CS.fmtDay(l.next)) + ': ' + h(l.nextWhat) + '</span>' : '') + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div>';
  };

  /* ---------- drawers and modals ---------- */
  function layer(html) { $('#layer').innerHTML = html; }
  function closeLayer() { $('#layer').innerHTML = ''; }
  function drawer(title, sub, body, foot) {
    layer('<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-label="' + h(title) + '"><div class="dhd"><div style="flex:1;min-width:0"><h2>' + title + '</h2><small>' + sub + '</small></div><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="dbd">' + body + '</div>' + (foot ? '<div class="dft">' + foot + '</div>' : '') + '</aside>');
  }
  function modal(title, body, foot, wide) {
    layer('<div class="scrim" data-act="close"></div><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-label="' + h(title) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>');
  }
  function openJob(id) {
    var j = CS.job(id); if (!j) return; var c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), m = j.sell - j.cost;
    var acts = [];
    if (j.status === 'booked') acts.push(['chaseSup', 'bell', 'Chase supplier'], ['jobConfirm', 'check', 'Mark confirmed']);
    if (j.status === 'confirmed') acts.push(['jobDelivered', 'truck', 'Mark delivered']);
    if (j.status === 'onhire') acts.push(['jobExchange', 'exchange', 'Book exchange'], ['jobCollect', 'archive', 'Book collection']);
    if (j.status === 'exchange') acts.push(['jobExDone', 'check', 'Exchange done']);
    if (j.status === 'collection') acts.push(['jobCollected', 'check', 'Mark collected']);
    if (j.status === 'done' && !S.invoices.some(function (i) { return i.jobs.indexOf(j.id) >= 0; })) acts.push(['raiseInv', 'receipt', 'Raise invoice']);
    if (j.wtn === 'missing' || j.wtn === 'chased') acts.push(['chaseWtn', 'certificate', 'Chase WTN']);
    if (j.wtn === 'received') acts.push(['viewWtn', 'eye', 'View WTN']);
    drawer(j.id + ' ' + stTag(j.status), h(CS.jobDesc(j)) + ' · ' + h(c.name),
      '<dl class="kv"><dt>Customer</dt><dd>' + h(c.name) + ' (' + h(c.contact) + ')</dd><dt>Site</dt><dd>' + h(s.name) + ', ' + h(s.pc) + (j.permit ? ' · on the road, permit' : '') + '</dd><dt>What</dt><dd>' + h(CS.jobDesc(j)) + '</dd><dt>When</dt><dd>' + CS.fmtDay(j.day) + (j.exDay != null ? ' · exchange ' + CS.fmtDay(j.exDay) : '') + (j.colDay != null ? ' · collect ' + CS.fmtDay(j.colDay) : '') + '</dd><dt>Supplier</dt><dd>' + h(su.name) + ' · ' + h(su.contact) + ' ' + h(su.phone) + '</dd><dt>Owner</dt><dd>' + (j.owner === 'sam' ? CS.bde() : 'John') + '</dd></dl>' +
      '<div class="money"><div class="tot"><div><small>Customer</small><b>' + money(j.sell) + '</b></div><div><small>Supplier</small><b>' + money(j.cost) + '</b></div><div class="m"><small>Margin</small><b>' + money(m) + ' <span style="font-size:12px">' + CS.pct(m, j.sell) + '%</span></b></div></div></div>' +
      (j.wtn ? '<div class="sec"><h3>Duty of care</h3>' + wtnTag(j.wtn) + ' <span class="muted" style="font-size:12.5px">' + h(CS.svc(j.svc).waste || '') + ', EWC ' + h(CS.svc(j.svc).ewc || '') + ', carrier ' + h(su.cbdu) + '</span></div>' : '') +
      '<div class="sec"><h3>Timeline</h3><div class="tl">' + j.log.slice().reverse().map(function (e) { return '<div class="e"><span>' + h(e.t) + '</span><time>' + CS.ago(e.at) + '</time></div>'; }).join('') + '</div></div>',
      acts.map(function (a) { return '<button class="btn' + (a === acts[0] ? ' pri' : '') + '" data-act="' + a[0] + '" data-id="' + j.id + '">' + ic(a[1]) + a[2] + '</button>'; }).join('') +
      '<button class="btn" data-act="msgParty" data-type="supplier" data-id="' + su.id + '">' + ic('whatsapp') + 'Message ' + h(su.name.split(' ')[0]) + '</button><button class="btn" data-act="msgParty" data-type="customer" data-id="' + c.id + '">' + ic('message') + 'Message ' + h(c.first) + '</button>');
  }
  function openSup(id) {
    var s = CS.sup(id); var rates = [];
    s.services.forEach(function (k) { var r = s.rates[k];
      if (r == null) return;   // a supplier brought in from a spreadsheet has no prices until their price sheet is uploaded
      if (k === 'skip') Object.keys(r).forEach(function (z) { rates.push([z + (z >= 20 ? ' yard RoRo' : ' yard skip'), money(r[z]), money(CS.sell('skip', r[z]))]); });
      else if (typeof r === 'number') rates.push([S.services[k].name + ' (per load)', money(r), money(CS.sell(k, r))]);
      else if (r.week != null) rates.push([S.services[k].name + ' (per ' + (k === 'fencing' ? 'panel per week' : 'week') + ', delivery ' + money(r.del) + ')', money(r.week, k === 'fencing'), money(CS.sell(k, r.week), k === 'fencing')]);
      else if (r.hour) rates.push([S.services[k].name + ' (per hour, min ' + r.min + ')', money(r.hour), money(CS.sell(k, r.hour))]);
      else if (r.m3) rates.push([S.services[k].name + ' (per m3)', money(r.m3), money(CS.sell(k, r.m3))]);
    });
    var jobs = S.jobs.filter(function (j) { return j.sup === id; });
    drawer(h(s.name), h(s.contact) + ' · ' + h(s.base) + ' · ' + h(s.phone),
      '<div class="grid g3"><div class="card kpi"><small>On time</small><b>' + s.onTime + '%</b></div><div class="card kpi"><small>Confirms in</small><b>~' + s.resp + 'm</b></div><div class="card kpi"><small>WTNs back</small><b>' + (s.wtn ? s.wtn + '%' : 'n/a') + '</b></div></div>' +
      '<div class="sec"><h3>Covers</h3><div class="chips">' + coverText(s).split(', ').map(function (a) { return '<span class="tag">' + h(a) + '</span>'; }).join(' ') + '</div></div>' +
      '<div class="sec"><h3>Rate card and your price</h3><div class="tw"><table class="t"><thead><tr><th>Item</th><th class="r">Their rate</th><th class="r">Your price</th></tr></thead><tbody>' + (rates.length ? rates.map(function (r) { return '<tr><td>' + h(r[0]) + '</td><td class="r num">' + r[1] + '</td><td class="r num"><b>' + r[2] + '</b></td></tr>'; }).join('') : '<tr><td colspan="3" class="muted">No prices on file yet. Upload their price sheet and they show here.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="sec"><h3>Licence</h3><dl class="kv"><dt>Carrier number</dt><dd>' + h(s.cbdu) + '</dd><dt>Expires</dt><dd>' + (s.licExp != null ? CS.fmtDay(s.licExp) : 'n/a') + ' ' + licTag(s) + '</dd></dl></div>' +
      '<div class="sec"><h3>Live jobs with them</h3>' + (jobs.filter(function (j) { return j.status !== 'done'; }).map(function (j) { return '<div class="rowline"><div class="bd"><b>' + j.id + ', ' + h(CS.jobDesc(j)) + '</b><small>' + h(CS.cust(j.cust).name) + ' · ' + CS.fmtDay(j.day) + '</small></div>' + stTag(j.status) + '</div>'; }).join('') || '<span class="muted">None right now.</span>') + '</div>',
      '<button class="btn pri" data-act="msgParty" data-type="supplier" data-id="' + s.id + '">' + ic('whatsapp') + 'Message on WhatsApp</button><button class="btn" data-act="supPref" data-id="' + s.id + '">' + ic('star') + (s.preferred ? 'Remove preferred' : 'Make preferred') + '</button>');
  }
  function openQuote(id) {
    var q = CS.quote(id); var who = q.cust ? CS.cust(q.cust).name : CS.lead(q.lead).company; var m = q.sell - q.cost;
    var foot = '';
    if (q.status === 'draft') foot += '<button class="btn pri" data-act="sendQuote" data-id="' + q.id + '">' + ic('send') + 'Send</button>';
    if (q.status === 'sent') foot += '<button class="btn pri" data-act="quoteWon" data-id="' + q.id + '">' + ic('check') + 'Mark won</button><button class="btn" data-act="chaseQuote" data-id="' + q.id + '">' + ic('bell') + 'Follow up</button><button class="btn" data-act="quoteLost" data-id="' + q.id + '">' + ic('x') + 'Mark lost</button>';
    if (q.job) foot += '<button class="btn" data-act="openJob" data-id="' + q.job + '">' + ic('truck') + 'Open ' + q.job + '</button>';
    drawer(q.id + ' <span class="tag">' + q.status + '</span>', h(who) + ' · ' + CS.fmtDay(q.day),
      '<dl class="kv"><dt>For</dt><dd>' + h(who) + '</dd><dt>What</dt><dd>' + h(q.desc) + '</dd><dt>Owner</dt><dd>' + (q.owner === 'sam' ? CS.bde() : 'John') + '</dd>' + (q.lostWhy ? '<dt>Lost because</dt><dd>' + h(q.lostWhy) + '</dd>' : '') + (q.chased ? '<dt>Followed up</dt><dd>' + q.chased + ' time' + (q.chased > 1 ? 's' : '') + '</dd>' : '') + '</dl>' +
      '<div class="money"><div class="tot"><div><small>Customer</small><b>' + money(q.sell) + '</b></div><div><small>Supplier</small><b>' + money(q.cost) + '</b></div><div class="m"><small>Margin</small><b>' + money(m) + ' <span style="font-size:12px">' + CS.pct(m, q.sell) + '%</span></b></div></div></div>', foot);
  }
  function openLead(id) {
    var l = CS.lead(id); var th = S.threads.filter(function (t) { return t.party.type === 'lead' && t.party.id === id; })[0];
    var stages = ['new', 'contacted', 'quoted', 'trial', 'won'], names = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', trial: 'First job', won: 'Account opened' };
    var nx = stages[stages.indexOf(l.stage) + 1];
    drawer(h(l.company), h(l.contact) + ' · ' + h(l.area) + ' · ' + h(l.type),
      '<dl class="kv"><dt>Stage</dt><dd>' + names[l.stage] + '</dd><dt>Source</dt><dd>' + h(l.source) + '</dd><dt>Worth</dt><dd>about ' + money(l.value) + ' a month</dd><dt>Last</dt><dd>' + (l.last != null ? CS.fmtDay(l.last) + ', ' + h(l.lastWhat) : 'Not contacted yet') + '</dd><dt>Next</dt><dd>' + (l.next != null ? CS.fmtDay(l.next) + ', ' + h(l.nextWhat) : 'Nothing set') + '</dd></dl>' +
      '<div class="field"><label for="leadNote">Add a note</label><textarea id="leadNote" rows="3" placeholder="What did they say?"></textarea></div>',
      '<button class="btn pri" data-act="logCall" data-id="' + l.id + '">' + ic('phone') + 'Log a call</button><button class="btn" data-act="followTomorrow" data-id="' + l.id + '">' + ic('calendar') + 'Follow up tomorrow</button>' + (nx ? '<button class="btn" data-act="leadNext" data-id="' + l.id + '">' + ic('arrow-right') + 'Move to ' + names[nx] + '</button>' : '') + (th ? '<button class="btn" data-act="openThread" data-id="' + th.id + '">' + ic('message') + 'Conversation</button>' : ''));
  }
  function wtnDoc(jid) {
    var j = CS.job(jid); if (!j) return '';
    var c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), sv = CS.svc(j.svc);
    return '<div class="doc"><h4>Waste Transfer Note</h4><div style="color:#666;font-size:11.5px">Ref ' + j.id + ' · ' + CS.dayDate(j.day).toLocaleDateString('en-GB') + ' · Sample document for the demo</div>' +
      '<div class="dg"><div class="bx"><small>Waste</small>' + h(sv.waste || '') + '<br>EWC ' + h(sv.ewc || '') + '<br>Container: ' + h(CS.jobDesc(j)) + '</div><div class="bx"><small>Site</small>' + h(s.name) + '<br>' + h(s.pc) + '</div>' +
      '<div class="bx"><small>Transferor (producer)</small>' + h(c.name) + '<br>SIC 43.12</div><div class="bx"><small>Transferee (carrier)</small>' + h(su.name) + '<br>' + h(su.cbdu) + '</div>' +
      '<div class="bx"><small>Broker</small>CAC Waste Management Ltd<br>CBDU650137</div><div class="bx"><small>Signed</small><span class="sig">' + h(su.contact) + '</span><br>' + h(c.contact) + '</div></div></div>';
  }
  function tryIt() {
    var opts = S.customers.map(function (c) { return '<option value="' + c.id + '">' + h(c.contact) + ', ' + h(c.name) + '</option>'; }).join('') + '<option value="new">A new number (not a customer yet)</option>';
    modal('Send a test WhatsApp as a customer',
      '<p class="muted" style="margin:0 0 14px;font-size:13px">Type anything a builder would send. It lands in the inbox and the assistant reads it, prices it and writes the reply and the supplier booking.</p>' +
      '<div class="field"><label for="tryWho">Send as</label><select id="tryWho">' + opts + '</select></div>' +
      '<div class="cphone"><div class="scr"><div class="wh">' + ic('chevron-left') + '<span class="av sm" style="--c:#EB9347">CAC</span><span><b>CAC Waste Management</b><small>online</small></span></div><div class="wb" id="tryBody"><div class="wm" style="align-self:flex-start;background:#fff">Morning, what can we sort for you today?</div></div>' +
      '<div class="wi"><input id="tryText" placeholder="Message" value="need an 8 yarder in PE31 Tuesday" aria-label="Message"><button data-act="trySend" aria-label="Send">' + ic('send') + '</button></div></div></div>' +
      '<div class="sugg">' + ['need an 8 yarder in PE31 Tuesday', 'new site PE38 9AA Monday 7am: welfare unit, 20ft container, 40 heras, a toilet and an 8 yard skip', 'can you swap the skip at Docking Rd tomorrow', 'price for a grab lorry NR3 Friday 8am', 'welfare unit and 2 loos for 6 weeks IP24 from Monday', '3 loads of muck away PE30 tomorrow, wait and load', 'need a skip'].map(function (s) { return '<button data-act="trySugg" data-v="' + h(s) + '">' + h(s) + '</button>'; }).join('') + '</div>');
    setTimeout(function () { var i = $('#tryText'); if (i) { i.focus(); i.select(); } }, 50);
  }
  function quickQuote() {
    var opts = S.customers.map(function (c) { return '<option value="' + c.id + '">' + h(c.name) + '</option>'; }).join('');
    modal('Quick quote', '<div class="grid g2"><div class="field"><label for="qqCust">Customer</label><select id="qqCust">' + opts + '</select></div><div class="field"><label for="qqPc">Site postcode</label><input id="qqPc" value="PE31 8LT"></div>' +
      '<div class="field"><label for="qqSvc">Service</label><select id="qqSvc">' + Object.keys(S.services).map(function (k) { return '<option value="' + k + '">' + S.services[k].name + '</option>'; }).join('') + '</select></div><div class="field"><label for="qqSize">Skip size</label><select id="qqSize">' + [4, 6, 8, 10, 12, 14, 16, 20, 40].map(function (z) { return '<option' + (z === 8 ? ' selected' : '') + ' value="' + z + '">' + z + ' yard</option>'; }).join('') + '</select></div></div>' +
      '<div id="qqRes"></div>', '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="qqSave">' + ic('check') + 'Save quote</button>');
    qqCalc();
  }
  function qqCalc() {
    var pc = ($('#qqPc') || {}).value, svc = ($('#qqSvc') || {}).value, size = Number(($('#qqSize') || {}).value);
    var r = CS.lookup(pc || '', { svc: svc, size: size, qty: 1, weeks: 4, panels: 20, m3: 6, hours: 4 });
    ui.qq = r[0] ? { pc: pc, svc: svc, size: size, best: r[0] } : null;
    var box = $('#qqRes'); if (!box) return;
    box.innerHTML = r[0] ? '<div class="money"><div class="ln"><div class="d"><b>' + h(svc === 'skip' ? size + ' yard skip' : S.services[svc].name) + '</b><small>' + h(r[0].sup.name) + ' · best of ' + r.length + ' covering ' + h(CS.outward(pc)) + '</small></div><span class="c">cost ' + money(r[0].cost) + '</span><b>' + money(r[0].sell) + '</b></div><div class="tot"><div><small>Customer</small><b>' + money(r[0].sell) + '</b></div><div><small>Supplier</small><b>' + money(r[0].cost) + '</b></div><div class="m"><small>Margin</small><b>' + money(r[0].margin) + '</b></div></div></div>'
      : '<div class="note">' + ic('alert') + '<span>No supplier on file covers that postcode for this service.</span></div>';
  }
  function settings() {
    var st = S.settings;
    modal('Settings', '<div class="rowline"><div class="bd"><b>Theme</b><small>Light or dark</small></div><div class="seg"><button data-act="theme" data-v="light" class="' + (st.theme === 'light' ? 'on' : '') + '">Light</button><button data-act="theme" data-v="dark" class="' + (st.theme === 'dark' ? 'on' : '') + '">Dark</button></div></div>' +
      '<div class="rowline"><div class="bd"><b>Live messages</b><small>Sample messages arrive while you show it</small></div><button class="switch' + (st.live ? ' on' : '') + '" data-act="toggle" data-k="live" aria-label="Live messages"></button></div>' +
      '<div class="rowline"><div class="bd"><b>Out of hours</b><small>Reply straight away, hold the booking for your approval in the morning</small></div><button class="switch' + (st.outOfHours !== false ? ' on' : '') + '" data-act="toggle" data-k="outOfHours" aria-label="Out of hours reply"></button></div>' +
      '<div class="rowline"><div class="bd"><b>Reply tone</b><small>' + (st.tone === 'formal' ? '"Hello Dan, ... Kind regards, John Pesci"' : '"Hi Dan, yes no problem ... Cheers, John"') + '</small></div><div class="seg"><button data-act="tone" data-v="friendly" class="' + (st.tone !== 'formal' ? 'on' : '') + '">Short and friendly</button><button data-act="tone" data-v="formal" class="' + (st.tone === 'formal' ? 'on' : '') + '">Formal</button></div></div>' +
      '<div class="rowline"><div class="bd"><b>Your BDE\'s first name</b><small>Shown on Sales, leads and their replies</small></div><input id="bdeName" value="' + h(CS.bde()) + '" style="width:130px;border:1px solid var(--line2);border-radius:10px;padding:7px 10px;background:var(--panel2)" aria-label="BDE first name"></div>' +
      '<div class="rowline"><div class="bd"><b>Your team</b><small>John, your BDE and the next hires, with what each one sees</small></div><button class="btn sm" data-act="team">' + ic('users') + 'Team</button></div>' +
      '<div class="rowline"><div class="bd"><b>Import from a spreadsheet</b><small>Your team, customers, sites and suppliers. Download the template, fill it in, upload it</small></div><button class="btn sm" data-act="importOpen">' + ic('download') + 'Import</button></div>' +
      '<div class="rowline"><div class="bd"><b>Connections</b><small>WhatsApp, email, your accounts and card payments, and what each needs</small></div><button class="btn sm" data-act="connections">' + ic('link') + 'Open</button></div>' +
      '<div class="rowline"><div class="bd"><b>Take the tour</b><small>Nine quick steps round the system</small></div><button class="btn sm" data-act="tour">' + ic('play') + 'Start</button></div>' +
      '<div class="rowline"><div class="bd"><b>Business</b><small>CAC Waste Management Ltd · broker CBDU650137 · 0330 122 5711</small></div></div>' +
      '<div class="rowline"><div class="bd"><b>Replay the live messages</b><small>Sends the sample messages again from the start</small></div><button class="btn sm" data-act="replay">' + ic('play') + 'Replay</button></div>' +
      '<div class="rowline"><div class="bd"><b>Play the start-up</b><small>The welcome screen</small></div><button class="btn sm" data-act="boot">' + ic('play') + 'Play</button></div>' +
      '<div class="rowline"><div class="bd"><b>Reset the demo</b><small>Puts all the sample data back</small></div><button class="btn sm" data-act="reset">' + ic('refresh') + 'Reset</button></div>');
  }
  function openPhone(src, title) {
    src = src || 'phone.html';
    if (window.innerWidth < 900) { location.href = src; return; }
    var ex = $('#phmodal'); if (ex) { var same = ex.getAttribute('data-src') === src; ex.remove(); if (same) return; }
    var d = document.createElement('div'); d.className = 'phmodal'; d.id = 'phmodal'; d.setAttribute('data-src', src);
    d.innerHTML = '<button class="x" data-act="closePhone" aria-label="Close phone">' + ic('x') + '</button><iframe src="' + src + (src.indexOf('?') >= 0 ? '&' : '?') + 'embed=1" title="' + h(title || 'CAC on the phone') + '"></iframe>';
    document.body.appendChild(d);
  }
  function boot(force) {
    if (!force && (params.get('boot') === '0' || params.get('tour') === '1' || sessionStorage.getItem('cac-boot'))) return;
    try { sessionStorage.setItem('cac-boot', '1'); } catch (e) {}
    var st = CS.stats(), mtd = S.months[S.months.length - 1];
    var b = document.createElement('div'); b.className = 'boot'; b.id = 'boot';
    b.innerHTML = '<div class="in"><img src="brand/cac-logo-inverted.svg" alt="CAC Waste Management"><h2>' + greeting() + ', John.</h2>' +
      '<div class="ln" style="animation-delay:1s"><b>' + st.needs + '</b> messages need you. Every one already has a draft.</div>' +
      '<div class="ln" style="animation-delay:1.35s"><b>' + st.awaiting + '</b> jobs waiting on suppliers, being chased.</div>' +
      '<div class="ln" style="animation-delay:1.7s"><b>' + money(mtd.margin) + '</b> margin booked this month.</div>' +
      '<div class="bootbtns"><button class="btn pri" data-boot="tour">' + ic('play') + 'Show me round</button><button class="btn ghost" data-boot="go">Straight in</button></div><small>One number for everything. Same person, every time.</small></div>';
    document.body.appendChild(b);
    var t = setTimeout(end, 9000);
    function end() { clearTimeout(t); b.classList.add('out'); setTimeout(function () { b.remove(); }, 500); }
    b.addEventListener('click', function (e) { var bb = e.target.closest('[data-boot]'); end(); if (bb && bb.getAttribute('data-boot') === 'tour' && window.CACP) setTimeout(window.CACP.tour, 520); });
  }
  function closeSide() { $('#side').classList.remove('open'); var sc = $('#sideScrim'); if (sc) sc.remove(); }

  /* ---------- selecting and reading a thread ---------- */
  function selectThread(id, opts) {
    var t = CS.thread(id); if (!t) return;
    ui.sel = id; ui.open = true; ui.asst = true; ui.scrollMsgs = true; delete ui.justDone[id];
    if (t.fresh && !t.done) {
      ui.reading[id] = true; t.fresh = false; t.unread = false; CS.save();
      setTimeout(function () { delete ui.reading[id]; t = CS.thread(id); if (t) { t.justRead = true; } render(); setTimeout(function () { var tt = CS.thread(id); if (tt) { delete tt.justRead; CS.save(); } }, 50); }, 1500);
    } else if (t.unread) { t.unread = false; CS.save(); }
    if (ui.view !== 'inbox') ui.view = 'inbox';
    location.hash = 'inbox';
    render();
  }

  /* ---------- actions ---------- */
  var A = {
    go: function (el) { go(el.dataset.v); },
    navGroup: function (el) { var g = el.dataset.g, m = S.settings.navShut || (S.settings.navShut = {}); if (m[g]) delete m[g]; else m[g] = true; CS.save(); renderNav(); var b = $('#nav .navg[data-g="' + g + '"]'); if (b) b.focus(); },
    tab: function (el) { ui.tab = el.dataset.v; render(); },
    sel: function (el) { selectThread(el.dataset.id); },
    openThread: function (el) { closeLayer(); selectThread(el.dataset.id); },
    back: function () { ui.open = false; ui.sel = null; render(); },
    closeThread: function () { ui.open = false; ui.sel = null; render(); },
    asstHide: function () { ui.asst = false; render(); },
    asstShow: function () { ui.asst = true; render(); },
    approve: function (el) {
      var t = CS.thread(el.dataset.id); var An = CS.analyse(t);
      var edits = {}; $$('textarea[data-draft][data-id="' + t.id + '"]').forEach(function (ta) { edits[ta.dataset.draft] = ta.value; });
      var jobBefore = S.counters.job;
      var steps = CS.approve(t.id, edits);
      var newJob = S.counters.job > jobBefore ? 'CAC-' + jobBefore : (An.job || null);
      ui.justDone[t.id] = { steps: steps, mins: An.mins || 1, job: newJob };
      if (newJob) ui.flash = newJob;
      toast('Done. ' + steps[0], 'circle-check');
      render();
    },
    nextMsg: function () { var n = sortedThreads().filter(needsYou)[0]; if (n) selectThread(n.id); else { toast('Inbox clear. Nothing else needs you.', 'circle-check'); ui.open = false; render(); } },
    skip: function (el) { var n = sortedThreads().filter(function (t) { return needsYou(t) && t.id !== el.dataset.id; })[0]; toast('Left for later', 'clock'); if (n) selectThread(n.id); },
    ownReply: function () { var c = $('#compose'); if (c) { c.focus(); c.placeholder = 'Type your reply, then Send'; } toast('Write your own reply below. The draft stays here if you change your mind.', 'pencil'); },
    sendOwn: function (el) {
      var c = $('#compose'); var txt = c && c.value.trim(); if (!txt) { toast('Type a reply first', 'pencil'); if (c) c.focus(); return; }
      var t = CS.thread(el.dataset.id); CS.addMsg(t, 'out', txt, { by: 'John' }); t.done = true; c.value = ''; CS.commit(); toast('Sent on ' + CS.chName(CS.replyCh(t.ch)) + ' (demo, nothing really sent)', 'send');
    },
    reopen: function (el) { var t = CS.thread(el.dataset.id); t.done = false; CS.commit(); },
    pickSup: function (el) { var t = CS.thread(el.dataset.id); t.supOverride = t.supOverride || {}; t.supOverride[el.dataset.i] = el.dataset.s; t.edits = null; CS.commit(); },
    cycleSite: function (el) {
      var t = CS.thread(el.dataset.id); var A0 = CS.analyse(t); var r = A0.parsed; if (!r || !r.siteOptions) return;
      var opts = r.siteOptions; var c = CS.cust(t.party.id);
      var all = c.sites.map(function (s, i) { return i; }).filter(function (i) { return CS.outward(c.sites[i].pc) === r.out || opts.indexOf(i) >= 0; });
      var cur = r.site; var nx = all[(all.indexOf(cur) + 1) % all.length]; t.siteOverride = nx; t.edits = null; CS.commit();
      toast('Site changed to ' + c.sites[nx].name, 'map-pin');
    },
    partyOpen: function (el) { var t = CS.thread(el.dataset.id); if (t.party.type === 'supplier') openSup(t.party.id); else if (t.party.type === 'lead') openLead(t.party.id); else openCust(t.party.id); },
    att: function (el) {
      var t = el.dataset.t, n = el.dataset.n, j = el.dataset.job;
      if (t === 'wtn' && CS.job(j)) modal(h(n), wtnDoc(j), '<button class="btn" data-act="close">Close</button>');
      else if (t === 'photo') modal(h(n), '<div style="aspect-ratio:4/3;border-radius:12px;background:linear-gradient(160deg,#6b7280,#374151);display:grid;place-items:center;color:#fff;text-align:center;padding:20px"><div>' + ic('eye') + '<br><b>' + h(n) + '</b><br><small style="opacity:.8">Photo from the driver, stored on the job</small></div></div>', '<button class="btn" data-act="close">Close</button>');
      else modal(h(n), '<div class="doc"><h4>' + h(n) + '</h4><p style="color:#666">Sample document for the demo. In the live system every attachment is stored against the job, customer or supplier it belongs to.</p></div>', '<button class="btn" data-act="close">Close</button>');
    },
    openJob: function (el) { openJob(el.dataset.id); },
    openSup: function (el) { openSup(el.dataset.id); },
    openQuote: function (el) { openQuote(el.dataset.id); },
    openLead: function (el) { openLead(el.dataset.id); },
    openInv: function (el) {
      var i = CS.inv(el.dataset.id), c = CS.cust(i.cust);
      modal(i.id + ' · ' + h(c.name), '<dl class="kv"><dt>Amount</dt><dd>' + money(i.amount, true) + ' + VAT</dd><dt>Issued</dt><dd>' + CS.fmtDay(i.issued) + '</dd><dt>Due</dt><dd>' + CS.fmtDay(i.due) + '</dd><dt>Status</dt><dd>' + (i.status === 'paid' ? 'Paid ' + CS.fmtDay(i.paidDay || 0) : 'Unpaid') + '</dd><dt>Jobs</dt><dd>' + (i.jobs.length ? i.jobs.join(', ') : 'Several, last month') + '</dd><dt>Xero</dt><dd>' + (i.xero ? 'Synced' : 'Ready to sync') + '</dd></dl>' + X.invoiceDoc(i),
        (i.status !== 'paid' ? '<button class="btn" data-act="remind" data-id="' + i.id + '">' + ic('mail') + 'Send reminder</button><button class="btn pri" data-act="markPaid" data-id="' + i.id + '">' + ic('check') + 'Mark paid</button>' : '<button class="btn" data-act="close">Close</button>'));
    },
    close: function () { closeLayer(); },
    closePhone: function () { var p = $('#phmodal'); if (p) p.remove(); },
    phone: function () { closeSide(); openPhone(); },
    settings: function () { closeSide(); settings(); },
    theme: function (el) { S.settings.theme = el.dataset.v; CS.commit(); settings(); },
    themeToggle: function () { S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; CS.commit(); },
    tone: function (el) { S.settings.tone = el.dataset.v; S.threads.forEach(function (t) { t.edits = null; }); CS.commit(); settings(); toast('Drafts now written ' + (el.dataset.v === 'formal' ? 'formally' : 'short and friendly'), 'pencil'); },
    toggle: function (el) {
      var k = el.dataset.k; S.settings[k] = S.settings[k] === false ? true : !S.settings[k];
      if (k === 'live' && S.settings.live) S.liveT0 = Date.now() - (S.liveIdx > 0 ? S.live[S.liveIdx - 1].at * 1000 : 3000);
      CS.commit(); if (k === 'briefing') A.briefing(); else if ($('.modal')) settings();
      toast((S.settings[k] ? 'On: ' : 'Off: ') + ({ outOfHours: 'out of hours reply', briefing: 'morning briefing', live: 'live messages', autoChase: 'supplier auto chase', autoWtn: 'WTN chasing', autoPay: 'payment reminders', autoQuote: 'quote follow ups', autoReports: 'monthly waste reports on the 1st' }[k] || k), S.settings[k] ? 'circle-check' : 'pause');
    },
    livePill: function () { A.toggle({ dataset: { k: 'live' } }); },
    replay: function () { S.liveIdx = 0; S.liveT0 = Date.now(); S.settings.live = true; CS.commit(); closeLayer(); toast('Live messages restarted. The first one lands in a few seconds.', 'play'); },
    boot: function () { closeLayer(); boot(true); },
    reset: function () { closeLayer(); ui.sel = null; ui.justDone = {}; ui.reading = {}; ui.typed = {}; ui.open = false; CS.reset(); S = CS.S; S.liveT0 = Date.now(); if (params.get('live') === '0') S.settings.live = false; CS.save(); toast('Demo reset to the start', 'refresh'); render(); },
    tryIt: function () { tryIt(); },
    trySugg: function (el) { var i = $('#tryText'); if (i) { i.value = el.dataset.v; i.focus(); } },
    trySend: function () {
      var txt = ($('#tryText') || {}).value; if (!txt || !txt.trim()) { toast('Type a message first', 'pencil'); return; }
      var who = $('#tryWho').value;
      var body = $('#tryBody'); if (body) body.insertAdjacentHTML('beforeend', '<div class="wm">' + h(txt) + '</div>');
      var party = who === 'new' ? { type: 'newlead', company: 'New WhatsApp contact', contact: 'New contact', area: '' } : { type: 'customer', id: who };
      setTimeout(function () {
        closeLayer();
        var t = CS.incoming({ party: party, ch: 'wa', text: txt.trim() });
        CS.save(); ui.newIds[t.id] = true; ui.bubNew = t.id; ui.tab = 'all';
        selectThread(t.id);
      }, 550);
    },
    jobOwner: function (el) { ui.jobOwner = el.dataset.v; render(); },
    qFilter: function (el) { ui.qFilter = el.dataset.v; render(); },
    newQuote: function () { quickQuote(); },
    qqSave: function () {
      if (!ui.qq) { toast('No supplier covers that postcode yet', 'alert'); return; }
      var c = $('#qqCust').value, q = ui.qq; var id = CS.nextId('quote', 'Q-');
      S.quotes.unshift({ id: id, cust: c, desc: (q.svc === 'skip' ? q.size + ' yard skip' : S.services[q.svc].name) + ', ' + CS.outward(q.pc), sell: q.best.sell, cost: q.best.cost, status: 'draft', day: 0, owner: 'john' });
      CS.saved(5); CS.commit(); closeLayer(); toast('Quote ' + id + ' saved as a draft, ' + money(q.best.margin) + ' margin', 'file-text'); if (ui.view !== 'quotes') go('quotes');
    },
    sendQuote: function (el) { var q = CS.quote(el.dataset.id); q.status = 'sent'; q.day = 0; CS.commit(); closeLayer(); toast(q.id + ' sent (demo, nothing really sent)', 'send'); },
    chaseQuote: function (el) { CS.chaseQuote(el.dataset.id); CS.commit(); closeLayer(); toast('Follow up sent for ' + el.dataset.id, 'bell'); },
    quoteWon: function (el) { var q = CS.quote(el.dataset.id); q.status = 'won'; if (q.lead) { var l = CS.lead(q.lead); l.stage = 'trial'; l.lastWhat = 'Quote won'; } CS.commit(); closeLayer(); toast(q.id + ' won. Book the supplier from the inbox or the jobs board.', 'circle-check'); },
    quoteLost: function (el) {
      var q = CS.quote(el.dataset.id);
      modal('Why did ' + q.id + ' go?', '<p class="muted" style="margin:0 0 12px;font-size:13px">One tap. It builds a picture of why quotes are lost, by service and by who sent them.</p><div class="sugg" style="justify-content:flex-start;margin:0">' + ['Price', 'Went direct', 'Too slow to reply', 'Job cancelled', 'No answer'].map(function (r) { return '<button data-act="lostWhy" data-id="' + q.id + '" data-v="' + r + '">' + r + '</button>'; }).join('') + '</div>');
    },
    lostWhy: function (el) { var q = CS.quote(el.dataset.id); q.status = 'lost'; q.lostWhy = el.dataset.v; CS.commit(); closeLayer(); toast(q.id + ' marked lost: ' + h(el.dataset.v.toLowerCase()), 'x'); },
    lookup: function () { ui.lookup = { pc: $('#lkPc').value, svc: $('#lkSvc').value, size: ($('#lkSize') || {}).value || 8 }; render(); },
    addSup: function () {
      modal('Add a supplier', '<div class="field"><label for="nsName">Name</label><input id="nsName" placeholder="Supplier name"></div><div class="grid g2"><div class="field"><label for="nsPh">WhatsApp number</label><input id="nsPh" placeholder="07..."></div><div class="field"><label for="nsAreas">Postcodes covered</label><input id="nsAreas" placeholder="PE30, PE31, NR"></div></div><div class="field"><label for="nsCbdu">Carrier number (CBDU)</label><input id="nsCbdu" placeholder="CBDU..."></div><p class="muted" style="font-size:12.5px;margin:0">In the live system their rate card is added here too, and the licence is checked against the public register.</p>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveSup">' + ic('check') + 'Add supplier</button>');
    },
    saveSup: function () {
      var n = $('#nsName').value.trim() || 'New supplier';
      var areas = ($('#nsAreas').value || 'PE').toUpperCase().split(/[ ,]+/).filter(Boolean);
      S.suppliers.push({ id: 's' + (100 + S.suppliers.length), name: n, contact: 'Bookings', phone: $('#nsPh').value || '07700 900000', base: '', services: ['skip'], areas: areas, rates: { skip: { 4: 160, 6: 190, 8: 215, 10: 250, 12: 275, 14: 300, 16: 325 } }, resp: 30, onTime: 95, wtn: 95, jobs: 0, cbdu: $('#nsCbdu').value || 'CBDU pending', licExp: 365 });
      CS.commit(); closeLayer(); toast(n + ' added with a starter skip rate card', 'warehouse');
    },
    supPref: function (el) { var s = CS.sup(el.dataset.id); s.preferred = !s.preferred; CS.commit(); openSup(s.id); toast(s.preferred ? s.name + ' is preferred' : 'Preferred removed', 'star'); },
    chaseSup: function (el) { CS.chaseSupplier(el.dataset.id); CS.commit(); toast('Chased on WhatsApp. Their reply will land in the inbox.', 'bell'); if ($('.drawer')) openJob(el.dataset.id); },
    chaseWtn: function (el) { CS.chaseWtn(el.dataset.id); CS.commit(); toast('WTN chased for ' + el.dataset.id, 'certificate'); if ($('.drawer')) openJob(el.dataset.id); },
    remind: function (el) { CS.remind(el.dataset.id); CS.commit(); closeLayer(); toast('Reminder emailed for ' + el.dataset.id + ', invoice attached', 'mail'); },
    chaseAllSup: function () { var l = CS.chaseLists().sup; l.forEach(function (x) { CS.chaseSupplier(x.j.id); }); CS.commit(); toast(l.length + ' suppliers chased', 'bell'); },
    chaseAllWtn: function () { var l = CS.chaseLists().wtn; l.forEach(function (j) { CS.chaseWtn(j.id); }); CS.commit(); toast(l.length + ' WTNs chased', 'certificate'); },
    chaseAllPay: function () { var l = CS.chaseLists().pay; l.forEach(function (i) { CS.remind(i.id); }); CS.commit(); toast(l.length + ' payment reminders sent', 'mail'); },
    chaseAllQ: function () { var l = CS.chaseLists().quotes; l.forEach(function (q) { CS.chaseQuote(q.id); }); CS.commit(); toast(l.length + ' quotes followed up', 'file-text'); },
    chaseMins: function (el) { S.settings.chaseMins = Number(el.dataset.v); CS.commit(); toast('Suppliers get chased after ' + el.dataset.v + ' minutes', 'clock'); },
    markPaid: function (el) {
      var i = CS.inv(el.dataset.id); i.status = 'paid'; i.paidDay = 0; CS.feed(i.id + ' paid', 'pound');
      var rel = CS.releaseHolds(i.cust); CS.commit(); closeLayer();
      toast(i.id + ' marked paid' + (rel ? '. The booking held for ' + h(CS.cust(i.cust).name) + ' is back in your inbox, ready to approve' : ''), 'pound');
    },
    bookAnyway: function (el) { var t = CS.thread(el.dataset.id); t.creditOk = true; t.edits = null; CS.commit(); toast('Credit hold overridden for this job. Booking is ready to approve.', 'alert'); },
    xero: function () { S.invoices.forEach(function (i) { i.xero = true; }); CS.commit(); toast('In the live build invoices and bills post to Xero. Demo only, nothing sent.', 'refresh'); },
    raiseAll: function () {
      var nj = S.jobs.filter(function (j) { return j.status === 'done' && !S.invoices.some(function (i) { return i.jobs.indexOf(j.id) >= 0; }); });
      var by = {}; nj.forEach(function (j) { (by[j.cust] = by[j.cust] || []).push(j); });
      Object.keys(by).forEach(function (c) { var id = CS.nextId('inv', 'INV-'); S.invoices.unshift({ id: id, cust: c, amount: by[c].reduce(function (a, j) { return a + j.sell; }, 0), issued: 0, due: 30, status: 'unpaid', jobs: by[c].map(function (j) { return j.id; }) }); });
      CS.saved(nj.length * 5); CS.commit(); toast(Object.keys(by).length + ' invoices raised from ' + nj.length + ' finished jobs', 'receipt');
    },
    raiseInv: function (el) { var j = CS.job(el.dataset.id); var id = CS.nextId('inv', 'INV-'); S.invoices.unshift({ id: id, cust: j.cust, amount: j.sell, issued: 0, due: 30, status: 'unpaid', jobs: [j.id] }); CS.jobLog(j, 'Invoiced on ' + id); CS.commit(); closeLayer(); toast(id + ' raised for ' + money(j.sell), 'receipt'); },
    billCheck: function (el) { var t = S.threads.filter(function (x) { return x.scn && x.scn.bill === el.dataset.id; })[0]; if (t) { t.done = false; CS.save(); selectThread(t.id); } },
    viewWtn: function (el) { modal('WTN for ' + el.dataset.id, wtnDoc(el.dataset.id), '<button class="btn" data-act="close">Close</button>'); },
    licCheck: function (el) { var s = CS.sup(el.dataset.id); var t = CS.threadFor({ type: 'supplier', id: s.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + s.contact + ', our records show your carrier registration ' + s.cbdu + ' is up for renewal ' + CS.dayPhrase(s.licExp) + '. Can you send the new certificate when it comes through? Thanks, John (CAC)', { by: 'John' }); s.checked = true; CS.commit(); toast('Renewal request sent to ' + s.name, 'shield-check'); },
    auditPack: function () {
      var opts = S.customers.map(function (c) { return '<option value="' + c.id + '">' + h(c.name) + '</option>'; }).join('');
      modal('Build an audit pack', '<div class="field"><label for="apCust">Customer</label><select id="apCust"><option value="all">Every customer</option>' + opts + '</select></div><div class="field"><label for="apRange">Period</label><select id="apRange"><option>Last 30 days</option><option>This quarter</option><option>Since we started</option></select></div><p class="muted" style="font-size:12.5px;margin:0">One PDF: every WTN, the carrier licence for each supplier used, and a job list. What a QS, a main contractor or the Environment Agency would ask for.</p>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="buildPack">' + ic('download') + 'Build pack</button>');
    },
    buildPack: function () { var c = $('#apCust').value; var n = S.jobs.filter(function (j) { return j.wtn === 'received' && (c === 'all' || j.cust === c); }).length; closeLayer(); CS.saved(30); CS.commit(); toast('Audit pack built: ' + n + ' WTNs and the carrier licences. Demo only, nothing downloaded.', 'download'); },
    jobConfirm: function (el) { var j = CS.job(el.dataset.id); j.status = 'confirmed'; CS.jobLog(j, 'Marked confirmed'); CS.commit(); openJob(j.id); toast(j.id + ' confirmed', 'check'); },
    jobDelivered: function (el) { var j = CS.job(el.dataset.id); j.status = 'onhire'; if (j.wtn === 'pending') j.wtn = 'missing'; CS.jobLog(j, 'Delivered'); CS.commit(); openJob(j.id); toast(j.id + ' on hire. WTN goes on the chase list if it doesn\'t arrive.', 'truck'); },
    jobExchange: function (el) { var j = CS.job(el.dataset.id); j.status = 'exchange'; j.exDay = 1; CS.jobLog(j, 'Exchange booked for tomorrow'); var su = CS.sup(j.sup); var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + su.contact + ', exchange on ' + j.id + ' at ' + CS.jobSite(j).pc + ' tomorrow please. Thanks, John (CAC)', { by: 'John' }); CS.commit(); openJob(j.id); toast('Exchange booked and sent to ' + su.name, 'exchange'); },
    jobCollect: function (el) { var j = CS.job(el.dataset.id); j.status = 'collection'; j.colDay = 1; CS.jobLog(j, 'Collection booked for tomorrow'); var su = CS.sup(j.sup); var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + su.contact + ', please collect ' + j.id + ' at ' + CS.jobSite(j).pc + ' tomorrow. Thanks, John (CAC)', { by: 'John' }); CS.commit(); openJob(j.id); toast('Collection booked and sent to ' + su.name, 'archive'); },
    jobExDone: function (el) { var j = CS.job(el.dataset.id); j.status = 'onhire'; j.exDay = null; CS.jobLog(j, 'Exchanged'); CS.commit(); openJob(j.id); toast('Exchanged, back on hire', 'check'); },
    jobCollected: function (el) { var j = CS.job(el.dataset.id); j.status = 'done'; j.colDay = null; CS.jobLog(j, 'Collected'); CS.commit(); openJob(j.id); toast(j.id + ' collected. Ready to invoice.', 'check'); },
    msgParty: function (el) { var p = { type: el.dataset.type, id: el.dataset.id }; var t = S.threads.filter(function (x) { return x.party.type === p.type && x.party.id === p.id; }).sort(function (a, b) { return b.last - a.last; })[0] || CS.threadFor(p, 'wa'); t.done = t.done && t.msgs.length > 0; CS.save(); closeLayer(); selectThread(t.id); setTimeout(function () { var c = $('#compose'); if (c) c.focus(); }, 60); },
    addLead: function () {
      modal('Add a lead', '<div class="grid g2"><div class="field"><label for="nlCo">Company</label><input id="nlCo" placeholder="Company"></div><div class="field"><label for="nlCt">Contact</label><input id="nlCt" placeholder="Name"></div><div class="field"><label for="nlAr">Area</label><input id="nlAr" placeholder="Town and postcode"></div><div class="field"><label for="nlSrc">Source</label><select id="nlSrc"><option>Cold call</option><option>LinkedIn</option><option>Referral</option><option>Website</option></select></div></div>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveLead">' + ic('check') + 'Add to ' + CS.bde() + '\'s pipeline</button>');
    },
    saveLead: function () { var id = 'l' + (S.counters.lead++); S.leads.unshift({ id: id, company: $('#nlCo').value.trim() || 'New company', contact: $('#nlCt').value.trim() || 'Contact', area: $('#nlAr').value.trim() || '', type: 'Builder', source: $('#nlSrc').value, stage: 'new', value: 1000, next: 0, nextWhat: 'First call', last: null, lastWhat: '' }); CS.commit(); closeLayer(); toast('Lead added to ' + CS.bde() + '\'s pipeline, first call due today', 'user-plus'); },
    logCall: function (el) { var l = CS.lead(el.dataset.id); var note = ($('#leadNote') || {}).value; l.last = 0; l.lastWhat = 'Call' + (note ? ': ' + note : ''); if (l.stage === 'new') l.stage = 'contacted'; l.next = 2; l.nextWhat = 'Follow up the call'; S.sam.calls[4]++; CS.commit(); openLead(l.id); toast('Call logged. Follow up set for ' + CS.fmtDay(2), 'phone'); },
    followTomorrow: function (el) { var l = CS.lead(el.dataset.id); l.next = 1; CS.commit(); openLead(l.id); toast('Follow up moved to tomorrow', 'calendar'); },
    leadNext: function (el) { var l = CS.lead(el.dataset.id); var st = ['new', 'contacted', 'quoted', 'trial', 'won']; l.stage = st[Math.min(4, st.indexOf(l.stage) + 1)]; if (l.stage === 'won') S.sam.accounts++; CS.commit(); openLead(l.id); toast(l.company + ' moved on', 'arrow-right'); },
    nudge: function (el) { var l = CS.lead(el.dataset.id); l.nudged = true; CS.commit(); toast(h(CS.bde()) + ' gets a nudge on his phone about ' + l.company, 'bell'); },
    menu: function () { var s = $('#side'); s.classList.add('open'); var sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'sideScrim'; sc.style.zIndex = 25; sc.setAttribute('data-act', 'closeSide'); document.body.appendChild(sc); },
    closeSide: function () { closeSide(); },
    srch: function (el) { var k = el.dataset.k, id = el.dataset.id; $('#sres').hidden = true; $('#q').value = ''; if (k === 'job') openJob(id); else if (k === 'sup') openSup(id); else if (k === 'quote') openQuote(id); else if (k === 'cust') openCust(id); else if (k === 'lead') openLead(id); }
  };
  function openCust(id) { return X.openCust(id); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) { var sr = $('#sres'); if (sr && !e.target.closest('.search')) sr.hidden = true; return; }
    var a = el.getAttribute('data-act'); if (A[a]) { e.preventDefault(); A[a](el, e); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if ($('#layer').innerHTML) closeLayer(); else if ($('#phmodal')) $('#phmodal').remove(); else if (ui.view === 'inbox' && ui.sel) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); A.closeThread(); } closeSide(); }
    if (e.key === 'Enter' && e.target.id === 'tryText') { e.preventDefault(); A.trySend(); }
    if (e.key === 'Enter' && e.target.id === 'lkPc') { e.preventDefault(); A.lookup(); }
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.price != null) { e.target.blur(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('note') && e.target.dataset.act) { e.preventDefault(); A[e.target.dataset.act](e.target); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.draft != null) { var t = CS.thread(el.dataset.id); t.edits = t.edits || {}; t.edits[el.dataset.draft] = el.value; CS.save(); }
    if (el.id === 'jobQ') { ui.jobQ = el.value; render(); }
    if (el.id === 'q') search(el.value);
    if (el.id === 'qqPc') qqCalc();
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.price != null) { var t = CS.thread(el.dataset.id); var v = parseFloat(String(el.value).replace(/[^\d.]/g, '')); if (!isNaN(v)) { t.priceOverride = t.priceOverride || {}; t.priceOverride[el.dataset.price] = v; t.edits = null; CS.commit(); toast('Price changed. Margin and both messages updated.', 'pound'); } }
    if (el.id === 'bdeName') { CS.renameBde(el.value); CS.commit(); toast('BDE name set to ' + h(CS.bde()), 'user'); }
    if (el.id === 'qqSvc' || el.id === 'qqSize' || el.id === 'qqCust') qqCalc();
    if (el.id === 'lkSvc') { ui.lookup = { pc: $('#lkPc').value, svc: el.value, size: 8 }; render(); }
    if (el.id === 'lkSize') { ui.lookup = { pc: $('#lkPc').value, svc: $('#lkSvc').value, size: el.value }; render(); }
  });
  function search(q) {
    var box = $('#sres'); q = q.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
    var r = [];
    S.customers.forEach(function (c) { if ((c.name + ' ' + c.contact + ' ' + c.sites.map(function (s) { return s.name + ' ' + s.pc; }).join(' ')).toLowerCase().indexOf(q) >= 0) r.push(['cust', c.id, c.name, 'Customer · ' + c.contact, 'user']); });
    S.suppliers.forEach(function (s) { if ((s.name + ' ' + s.areas.join(' ')).toLowerCase().indexOf(q) >= 0) r.push(['sup', s.id, s.name, 'Supplier · ' + s.base, 'warehouse']); });
    S.jobs.forEach(function (j) { var c = CS.cust(j.cust), s = CS.jobSite(j); if ((j.id + ' ' + c.name + ' ' + s.pc + ' ' + s.name).toLowerCase().indexOf(q) >= 0) r.push(['job', j.id, j.id + ', ' + CS.jobDesc(j), c.name + ' · ' + s.pc, 'truck']); });
    S.quotes.forEach(function (x) { if ((x.id + ' ' + x.desc).toLowerCase().indexOf(q) >= 0) r.push(['quote', x.id, x.id, x.desc, 'file-text']); });
    S.leads.forEach(function (l) { if ((l.company + ' ' + l.contact).toLowerCase().indexOf(q) >= 0) r.push(['lead', l.id, l.company, 'Lead · ' + l.contact, 'user-plus']); });
    box.innerHTML = r.slice(0, 9).map(function (x) { return '<button data-act="srch" data-k="' + x[0] + '" data-id="' + x[1] + '">' + ic(x[4]) + '<span><b>' + h(x[2]) + '</b><small>' + h(x[3]) + '</small></span></button>'; }).join('') || '<div class="empty" style="padding:12px">Nothing found</div>';
    box.hidden = false;
  }

  /* ---------- live updates ---------- */
  CS.on(function (why) { if (why === 'sync') X.syncToast(); render(why); });
  function loop() {
    var arrived = CS.tick({ runLive: true, prefer: true });
    arrived.forEach(function (t) {
      ui.newIds[t.id] = true; if (t.id === ui.sel) ui.bubNew = t.id;
      var p = CS.party(t.party);
      toast('New ' + CS.chName(t.ch) + ' from ' + h(p.name) + (p.sub ? ', ' + h(p.sub) : ''), chIcon(t.ch), { act: 'sel', id: t.id, label: 'Open' });
    });
    if (arrived.length) render();
  }
  setInterval(loop, 1000);
  setInterval(function () { if (ui.view === 'today' || ui.view === 'chasing') { var ae = document.activeElement; if (!ae || ae === document.body) render(); } }, 30000);

  /* ---------- start ---------- */
  var hv = location.hash.replace('#', ''); if (VIEWS.some(function (v) { return v.k === hv; })) ui.view = hv;
  window.addEventListener('hashchange', function () { var v = location.hash.replace('#', ''); if (v !== ui.view && VIEWS.some(function (x) { return x.k === v; })) { ui.view = v; render(); } });
  if (!S.liveT0 && S.settings.live) { S.liveT0 = Date.now() + (params.get('boot') === '0' || sessionStorage.getItem('cac-boot') ? 0 : 3000); CS.save(); }
  window.CACUI = { ui: ui, render: render, A: A, V: V, VIEWS: VIEWS };
  X.init({ ui: ui, V: V, A: A, $: $, av: av, toast: toast, modal: modal, drawer: drawer, closeLayer: closeLayer, stTag: stTag, wtnTag: wtnTag, margTag: margTag, chIcon: chIcon,
    render: render, go: go, layer: layer, hm: hm, sortedThreads: sortedThreads, openLead: openLead, openSup: openSup, openQuote: openQuote, VIEWS: VIEWS, openPhone: openPhone, selectThread: selectThread, openJob: openJob, wtnDoc: wtnDoc, needsYou: needsYou });
  render();
  boot();
  if (params.get('tour') === '1' && window.CACP) setTimeout(window.CACP.tour, 600);
})();
