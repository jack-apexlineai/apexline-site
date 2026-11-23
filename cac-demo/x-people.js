/* CAC demo, people screens: customer cards, supplier cards with a "Best for" strip, and a cleaner credit control.
   Sits on top of the earlier layers. Sample data only. Nothing leaves this browser. */
(function () {
  var CS = window.CS, UI = window.CACUI; if (!CS || !UI) return;
  var h = CS.esc, money = CS.money, ic = window.ic, V = UI.V, A = UI.A, ui = UI.ui;
  function S() { return CS.S; }
  function X2() { return (window.CACV2 && window.CACV2.x) || null; }
  function st() { if (!ui.xp) ui.xp = { cust: 'cards', sup: 'cards', supQ: '' }; return ui.xp; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function seg(k) {
    var cur = st()[k];
    return '<div class="seg xp-seg" role="group" aria-label="Show as cards or a table">' + [['cards', 'Cards'], ['table', 'Table']].map(function (x) {
      return '<button type="button" data-act="xpMode" data-k="' + k + '" data-v="' + x[0] + '" class="' + (cur === x[0] ? 'on' : '') + '"' + (cur === x[0] ? ' aria-pressed="true"' : '') + '>' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function initials(n) { var p = String(n || '').replace(/[^A-Za-z ]/g, ' ').split(' ').filter(Boolean); return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase(); }
  function stat(label, val) { return '<span><small>' + label + '</small><b>' + val + '</b></span>'; }

  /* ---------- customers ---------- */
  function orders() {
    try { if (window.CACV3 && window.CACV3.all) return window.CACV3.all(); } catch (e) {}
    return S().jobs.map(function (j) { return { cust: j.cust, sell: j.sell, cost: j.cost, off: j.day }; });
  }
  function creditChip(c, cr) {
    if (c.stop) return '<span class="tag bad">On stop</span>';
    if (cr && cr.hold) return '<span class="tag amber">On hold</span>';
    return '<span class="tag ok">Fine</span>';
  }
  function custRows() {
    var by = {};
    orders().forEach(function (o) {
      var r = by[o.cust] || (by[o.cust] = { n: 0, m: 0, val: 0, gp: 0 });
      r.n++; r.val += o.sell || 0; r.gp += (o.sell || 0) - (o.cost || 0); if (o.off <= 0 && o.off >= -30) r.m++;
    });
    return S().customers.map(function (c) {
      var r = by[c.id] || { n: 0, m: 0, val: 0, gp: 0 }, open = {};
      S().jobs.forEach(function (j) { if (j.cust === c.id && j.status !== 'done') open[j.site || 0] = 1; });
      var sites = (c.sites || []).length;
      return { c: c, cr: CS.credit(c.id, 0), n: r.n, m: r.m, val: r.val, gp: r.gp, sites: sites, open: Math.min(Object.keys(open).length, Math.max(sites, Object.keys(open).length)) };
    }).sort(function (a, b) { return b.val - a.val; });
  }
  function custKpis(rows) {
    var t = rows.reduce(function (a, r) { a.m += r.m; a.n += r.n; a.val += r.val; a.gp += r.gp; a.open += r.open; return a; }, { m: 0, n: 0, val: 0, gp: 0, open: 0 });
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('users') + 'Customers</small><b>' + rows.length + '</b><span class="d">' + plural(t.open, 'open site') + ' between them</span></div>' +
      '<div class="card kpi"><small>' + ic('calendar') + 'Orders in the last month</small><b>' + t.m + '</b><span class="d">' + t.n + ' orders in all</span></div>' +
      '<div class="card kpi"><small>' + ic('receipt') + 'Total order value</small><b>' + money(t.val) + '</b><span class="d">every order on file</span></div>' +
      '<div class="card kpi"><small>' + ic('pound') + 'Total gross profit</small><b>' + money(t.gp) + '</b><span class="d">what you charged, less what you paid</span></div></div>';
  }
  function custCard(r) {
    var c = r.c, name = c.name || c.contact || 'Customer';
    return '<div class="card xp-card xp-click" role="button" tabindex="0" data-act="openCust" data-id="' + h(c.id) + '" aria-label="Open ' + h(name) + '">' +
      '<div class="xp-top"><span class="xp-av" aria-hidden="true">' + h(initials(name)) + '</span><div class="xp-name"><b>' + h(name) + '</b><small>' + (c.contact && c.contact !== name ? h(c.contact) : 'Main contact') + (c.type ? ' · ' + h(c.type) : '') + '</small></div>' + creditChip(c, r.cr) + '</div>' +
      '<div class="xp-stats">' + stat('Orders, last month', r.m) + stat('Total orders', r.n) + stat('Sites', r.sites) +
      stat('Order value', money(r.val)) + stat('Gross profit', money(r.gp)) + stat('Open sites', r.open) + '</div></div>';
  }
  function custCards(rows) {
    return '<div class="xp-grid" id="xpCust">' + rows.map(custCard).join('') + '</div>' +
      '<p class="muted xp-foot">Sample data. An open site has something on it or booked. Tap a card for the sites, contacts and paperwork. Credit lives on the Credit control screen.</p>';
  }
  var oldCust = V.customers;
  V.customers = function () {
    var old = oldCust ? oldCust() : '', mode = st().cust, rows = custRows();
    if (A.importOpen && old.indexOf('data-act="importOpen"') < 0) old = old.replace('<button class="btn pri" data-act="newAccount">', '<button class="btn" data-act="importOpen" data-v="customers">' + ic('download') + 'Import</button><button class="btn pri" data-act="newAccount">');
    var bar = '<div class="xp-bar"><h2>' + ic('users') + 'Customers <span class="muted">' + rows.length + '</span></h2><span class="sp"></span>' + seg('cust') + '</div>';
    var a = old.indexOf('<div class="grid g4 kpis"'), b = old.indexOf('id="linkCard"'), bs = b > -1 ? old.lastIndexOf('<div class="card', b) : -1;
    if (mode === 'table') {
      var ke = a > -1 ? old.indexOf('<div class="card"><div class="hd">', a) : -1;
      if (a > -1 && ke > a) return old.slice(0, a) + custKpis(rows) + bar + old.slice(ke);
      return bar + old;
    }
    var mine = custKpis(rows) + bar + custCards(rows);
    if (a > -1 && bs > a) return old.slice(0, a) + mine + old.slice(bs);
    if (a > -1) return old.slice(0, a) + mine;
    return mine + old;
  };

  /* ---------- supplier handbook ---------- */
  function issues() {
    var s = S();
    if ((!s.v3 || !s.v3.issues) && V.find) { try { V.find(); } catch (e) {} }   // the scorecard seeds its sample issues the first time it is drawn
    return (s.v3 && s.v3.issues) || [];
  }
  function priceItems(su) {
    var out = {};
    (su.services || []).forEach(function (k) {
      var r = su.rates && su.rates[k]; if (r == null) return;
      if (typeof r === 'number') out[k] = r;
      else if (k === 'skip') Object.keys(r).forEach(function (z) { if (typeof r[z] === 'number') out['skip' + z] = r[z]; });
      else if (r.week != null) out[k + 'w'] = r.week;
      else if (r.hour) out[k + 'h'] = r.hour;
      else if (r.m3) out[k + 'm'] = r.m3;
    });
    return out;
  }
  /* each supplier's prices against the average of everyone who prices the same thing. 1 is the average */
  function priceIndex() {
    var sums = {}, items = {}, out = {};
    S().suppliers.forEach(function (su) { var it = items[su.id] = priceItems(su); Object.keys(it).forEach(function (k) { var x = sums[k] || (sums[k] = { t: 0, n: 0 }); x.t += it[k]; x.n++; }); });
    S().suppliers.forEach(function (su) {
      var it = items[su.id], t = 0, n = 0;
      Object.keys(it).forEach(function (k) { if (sums[k].n >= 2 && sums[k].t > 0) { t += it[k] / (sums[k].t / sums[k].n); n++; } });
      out[su.id] = n ? t / n : null;
    });
    return out;
  }
  function supRows() {
    var X = X2(), idx = priceIndex(), is = issues();
    return S().suppliers.map(function (su) {
      var n = is.filter(function (i) { return i.sup === su.id; }).length, has = typeof su.onTime === 'number';
      var sc = has ? Math.max(0, Math.min(100, Math.round(su.onTime * 0.55 + (su.wtn != null ? su.wtn : su.onTime) * 0.35 + Math.max(0, 10 - n * 3)))) : null;
      var ds = [], bad = null;
      try { ds = X ? X.docs(su) : []; } catch (e) {}
      ds.forEach(function (d) { if (d.exp != null && d.exp < 60 && (!bad || d.exp < bad.exp)) bad = d; });
      return { su: su, idx: idx[su.id], score: sc, bad: bad, has: has };
    });
  }
  function svcText(su) { return (su.services || []).map(function (k) { return S().services[k] ? S().services[k].short : k; }).join(', '); }
  function areaText(su) {
    var seen = {}, out = [];
    (su.areas || []).forEach(function (a) { var x = CS.area(a); if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out.length ? out.slice(0, 4).join(', ') + ' postcodes' : '';
  }
  function hay(su) {
    return (su.name + ' ' + (su.services || []).map(function (k) { var s = S().services[k]; return s ? s.short + ' ' + s.name : k; }).join(' ') + ' ' + (su.base || '') + ' ' + (su.areas || []).join(' ')).toLowerCase();
  }
  function match(hs, q) { var t = String(q || '').toLowerCase().split(/\s+/).filter(Boolean); return t.every(function (x) { return hs.indexOf(x) > -1; }); }
  function pctText(idx) { var p = Math.round((1 - idx) * 100); return p > 0 ? p + '% under the average' : p < 0 ? (-p) + '% over the average' : 'Right on the average'; }
  function priceCell(idx) {
    if (idx == null) return '<b class="muted">n/a</b>';
    var n = idx <= 0.97 ? 1 : idx < 1.03 ? 2 : 3, w = ['Low', 'Mid', 'High'][n - 1];
    return '<b class="xp-price" title="' + pctText(idx) + ' price"><i class="on">£</i><i' + (n > 1 ? ' class="on"' : '') + '>£</i><i' + (n > 2 ? ' class="on"' : '') + '>£</i><em>' + w + '</em></b>';
  }
  function docChip(r) {
    var X = X2(), d = r.bad;
    if (!d) return '<span class="tag ok">' + ic('shield-check') + 'In date</span>';
    var n = d.k === 'lic' ? 'Licence' : d.k === 'ins' ? 'Insurance' : d.n;
    return '<span class="tag ' + (d.exp < 30 ? 'bad' : 'amber') + '">' + ic('alert') + h(n) + ' ' + (d.exp <= 0 ? 'has run out' : 'runs out ' + (X ? X.inWords(d.exp) : 'in ' + d.exp + ' days')) + '</span>';
  }
  function supCard(r, q) {
    var su = r.su, hs = hay(su), ar = areaText(su);
    return '<div class="card xp-card xp-sup xp-click" role="button" tabindex="0" data-act="openSup" data-id="' + h(su.id) + '" data-s="' + h(hs) + '" aria-label="Open ' + h(su.name) + '"' + (match(hs, q) ? '' : ' hidden') + '>' +
      '<div class="xp-top"><div class="xp-name"><b>' + h(su.name) + '</b><small>' + h(svcText(su)) + '</small><small>' + ic('map-pin') + h(su.base || 'No town on file') + (ar ? ' · ' + h(ar) : '') + '</small></div>' + (su.preferred ? '<span class="tag brand">' + ic('star') + 'Preferred</span>' : su.onTime != null && su.onTime < 75 ? '<span class="tag bad">' + ic('alert') + 'Avoid</span>' : '') + '</div>' +
      '<div class="xp-stats">' + stat('On time', r.has ? '<i class="rag ' + (su.onTime >= 92 ? 'g' : su.onTime >= 75 ? 'a' : 'r') + '">' + su.onTime + '%</i>' : 'n/a') + stat('Confirms in', su.resp != null ? '<i class="rag ' + (su.resp <= 30 ? 'g' : su.resp <= 90 ? 'a' : 'r') + '">~' + (su.resp >= 120 ? Math.round(su.resp / 60) + ' hours' : su.resp + ' min') + '</i>' : 'n/a') + '<span><small>Price</small>' + priceCell(r.idx) + '</span></div>' +
      '<div class="xp-cardfoot">' + docChip(r) + '<span class="tag">' + ic(su.pref === 'email' ? 'mail' : 'whatsapp') + (su.pref === 'email' ? 'Books by email' : 'Books on WhatsApp') + '</span><span class="sp"></span>' + (A.supScore && r.has ? '<button type="button" class="btn sm" data-act="supScore" data-id="' + h(su.id) + '">' + ic('list') + 'Scorecard</button>' : '') + '</div></div>';
  }
  function bestCard(k, icon, title, sub, list, fig) {
    if (!list.length) return '';
    var top = list[0];
    return '<div class="card xp-bc xp-click" role="button" tabindex="0" data-act="openSup" data-id="' + h(top.su.id) + '" data-best="' + k + '" aria-label="' + title + ': ' + h(top.su.name) + '">' +
      '<span class="k">' + ic(icon) + title + '</span><b class="n">' + h(top.su.name) + '</b><span class="f">' + fig(top) + '</span>' +
      '<span class="xp-ru">' + list.slice(1, 3).map(function (r, i) { return '<span data-act="openSup" data-id="' + h(r.su.id) + '"><i>' + (i + 2) + '</i><em>' + h(r.su.name) + '</em><u>' + fig(r, true) + '</u></span>'; }).join('') + '</span>' +
      '<small class="s">' + sub + '</small></div>';
  }
  function bestStrip(rows) {
    var ok = rows.filter(function (r) { return r.has && r.su.resp != null; });
    function by(f) { return ok.slice().sort(function (a, b) { return f(a, b) || (b.su.jobs || 0) - (a.su.jobs || 0); }); }
    var cheap = ok.filter(function (r) { return r.idx != null; }).sort(function (a, b) { return a.idx - b.idx; });
    var fast = by(function (a, b) { return a.su.resp - b.su.resp; }), rel = by(function (a, b) { return b.su.onTime - a.su.onTime; }), all = by(function (a, b) { return b.score - a.score; });
    var same = fast.filter(function (r) { return r.su.onTime >= 95; });
    var out = bestCard('cheap', 'pound', 'Cheapest', 'Their prices against others for the same job', cheap, function (r, s) { var p = Math.round((1 - r.idx) * 100); return s ? (p >= 0 ? p + '% under' : (-p) + '% over') : pctText(r.idx); }) +
      bestCard('fast', 'bolt', 'Fastest to confirm', 'How long they take to confirm a booking', fast, function (r, s) { return '~' + r.su.resp + ' min' + (s ? '' : ' to confirm'); }) +
      bestCard('reliable', 'checks', 'Most reliable', 'Jobs that turned up on time', rel, function (r, s) { return r.su.onTime + '%' + (s ? '' : ' on time'); }) +
      bestCard('allround', 'star', 'Best all-round', 'Their scorecard, out of 100', all, function (r, s) { return s ? String(r.score) : 'Score ' + r.score + ' out of 100'; }) +
      bestCard('sameday', 'truck', 'Same day', 'Quickest to confirm, and 95% or more on time', same, function (r, s) { return '~' + r.su.resp + ' min' + (s ? '' : ', ' + r.su.onTime + '% on time'); });
    if (!out) return '';
    return '<div class="xp-bar xp-besthd"><h2>' + ic('target') + 'Best for</h2><span class="tag">Sample figures</span><span class="muted xp-hint hide-sm">Who to send the work to. Tap one to open them.</span></div><div class="xp-best" id="xpBest">' + out + '</div>';
  }
  function supTools(mode, n) {
    return '<div class="xp-bar" id="xpSupBar">' +
      (mode === 'cards' ? '<label class="xp-search">' + ic('search') + '<input id="xpSupQ" type="search" value="' + h(st().supQ) + '" placeholder="Search by name, service or town" autocomplete="off" aria-label="Search suppliers by name, service or town"></label>' : '<h2>' + ic('warehouse') + 'Suppliers <span class="muted">' + n + '</span></h2>') +
      '<span class="sp"></span>' + seg('sup') +
      (mode === 'cards' ? '<button class="btn" data-act="go" data-v="pricebook">' + ic('list') + '<span class="hide-sm">Your price book</span></button><button class="btn pri" data-act="addSup">' + ic('plus') + '<span class="hide-sm">Add supplier</span></button>' : '') + '</div>';
  }
  function supCount(n, total, q) { return q ? n + ' of ' + plural(total, 'supplier') + ' match' : plural(total, 'supplier'); }
  function supCards() {
    var rows = supRows(), q = st().supQ, shown = rows.filter(function (r) { return match(hay(r.su), q); }).length;
    return bestStrip(rows) +
      '<div class="xp-bar xp-listhd"><h2>' + ic('warehouse') + 'Suppliers</h2><span class="muted" id="xpSupN">' + supCount(shown, rows.length, q) + '</span></div>' +
      '<div class="xp-grid" id="xpSup">' + rows.map(function (r) { return supCard(r, q); }).join('') + '</div>' +
      '<div class="card xp-none" id="xpSupNone"' + (shown ? ' hidden' : '') + '>' + ic('search') + 'No supplier matches that. Try a town, a service like skip or grab, or part of a name.</div>' +
      '<p class="muted xp-foot">Sample figures. On time, confirm times and scores are samples in this demo. Price compares each supplier with the others who price the same job. Tap a card for contacts, hire period, fuel surcharge, prices, licences and insurance.</p>';
  }
  var oldSup = V.suppliers;
  V.suppliers = function () {
    var old = oldSup ? oldSup() : '', mode = st().sup, n = S().suppliers.length;
    var m = old.indexOf('Suppliers <span class="muted"'), cs = m > -1 ? old.lastIndexOf('<div class="card"', m) : -1, tail = '</tbody></table></div></div>', ce = m > -1 ? old.indexOf(tail, m) : -1;
    if (mode === 'table') return cs > -1 ? old.slice(0, cs) + supTools(mode, n) + old.slice(cs) : supTools(mode, n) + old;
    var mine = supTools(mode, n) + supCards() + '<div style="height:16px"></div>';
    if (cs > -1 && ce > cs) return old.slice(0, cs) + mine + old.slice(ce + tail.length);
    return mine + old;
  };
  function filterSup() {
    var q = st().supQ, cards = document.querySelectorAll('#xpSup .xp-sup'), shown = 0, i;
    for (i = 0; i < cards.length; i++) { var ok = match(cards[i].getAttribute('data-s') || '', q); cards[i].hidden = !ok; if (ok) shown++; }
    var none = document.getElementById('xpSupNone'), cnt = document.getElementById('xpSupN');
    if (none) none.hidden = shown > 0;
    if (cnt) cnt.textContent = supCount(shown, cards.length, q);
  }

  /* ---------- credit control ---------- */
  var STOPLINE = 'No one can place an order for this customer. They are told to speak to the accounts team.';
  var LATE_RED = 7;   // more than this many days late and the row goes red
  function isOver(c, owed) { return !!c.limit && Math.round(owed) > c.limit; }
  /* one bar per account: what they owe against their limit. Green under 80%, amber from 80%, red and full when over */
  function limitBar(c, cr, owed) {
    var o = Math.round(owed || 0), lim = c.limit || 0;
    if (!lim) return '<div class="xp-lim none"><span class="xp-lim-t muted">' + (o ? '<b>' + money(o) + '</b> owed. ' : '') + (cr.card ? 'Pays by card, no credit limit' : 'No credit limit') + '</span></div>';
    var over = o > lim, pct = o / lim, k = over ? 'over' : pct >= 0.8 ? 'warn' : 'ok', w = over ? 100 : o ? Math.max(3, Math.round(pct * 100)) : 0;
    var txt = '<b>' + money(o) + '</b> of ' + money(lim) + ' limit' + (over ? ', <b class="bad">' + money(o - lim) + ' over</b>' : '');
    return '<div class="xp-lim ' + k + '"><span class="xp-lim-track" aria-hidden="true"><i style="width:' + w + '%"></i></span><span class="xp-lim-t">' + txt + '</span></div>';
  }
  V.credit = function () {
    var rows = S().customers.map(function (c) { return { c: c, cr: CS.credit(c.id, 0), ag: CS.aged(c.id) }; })
      .sort(function (a, b) { return (b.c.stop ? 1 : 0) - (a.c.stop ? 1 : 0) || (b.cr.overdue || 0) - (a.cr.overdue || 0) || b.ag.total - a.ag.total; });
    var stt = CS.stats(), stops = rows.filter(function (r) { return r.c.stop; }).length, lateN = rows.filter(function (r) { return r.cr.overdue > 0; }).length;
    return '<div class="xp-kpis">' +
      '<div class="card kpi"><small>' + ic('pound') + 'Owed to you</small><b>' + money(stt.owed) + '</b><span class="d">across ' + plural(rows.filter(function (r) { return r.ag.total; }).length, 'customer') + '</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Overdue</small><b' + (stt.overdue ? ' style="color:var(--bad)"' : '') + '>' + money(stt.overdue) + '</b><span class="d">' + plural(lateN, 'customer') + ' paying late</span></div>' +
      '<div class="card kpi"><small>' + ic('lock') + 'On stop</small><b id="stopN"' + (stops ? ' style="color:var(--bad)"' : '') + '>' + stops + '</b><span class="d">no new orders for them</span></div></div>' +
      '<div class="card xp-credit" id="xpCredit"><div class="hd"><h2>' + ic('lock') + 'Every account</h2></div>' +
      '<div class="xp-cr-hd"><span>Customer</span><span>Owed against limit</span><span>How late</span><span></span></div>' +
      rows.map(function (r) {
        var c = r.c, cr = r.cr, owed = r.ag.total;
        var red = isOver(c, owed) || cr.worst > LATE_RED;
        var late = cr.overdue > 0 ? '<b class="' + (cr.worst > LATE_RED ? 'bad' : 'amber') + '">' + plural(cr.worst, 'day') + ' late</b>' : owed ? '<b class="muted">Not late</b>' : '<b class="muted">Nothing owed</b>';
        var chip = c.stop ? '<span class="tag bad">' + ic('lock') + 'On stop</span>' : cr.hold ? '<span class="tag amber">On hold</span>' : '';
        return '<div class="xp-cr' + (c.stop ? ' stop' : '') + (red ? ' risk' : '') + '" data-id="' + h(c.id) + '"><div class="xp-cr-main">' +
          '<div class="who"><b data-act="openCust" data-id="' + h(c.id) + '">' + h(c.name) + '</b>' + chip + '</div>' +
          limitBar(c, cr, owed) +
          '<div class="cell"><small>How late</small>' + late + '</div>' +
          '<button class="btn sm' + (c.stop ? ' pri' : '') + '" data-act="stopToggle" data-id="' + h(c.id) + '" aria-label="' + (c.stop ? 'Take ' + h(c.name) + ' off stop' : 'Put ' + h(c.name) + ' on stop') + '">' + ic(c.stop ? 'check' : 'lock') + (c.stop ? 'Take off stop' : 'Put on stop') + '</button></div>' +
          (c.stop ? '<div class="xp-cr-stop">' + ic('lock') + '<span>' + STOPLINE + '</span></div>' : '') + '</div>';
      }).join('') + '</div>' +
      '<p class="muted xp-foot">The bar shows what they owe against their limit. A <b>red row</b> is over its limit, or more than ' + LATE_RED + ' days late. <b>On hold</b> is automatic: over their limit, or an invoice more than 14 days late. <b>On stop</b> is your call, and you can take it off again here. Tap a name for their statement.</p>';
  };

  /* ---------- customer portal, as a screen in the menu ---------- */
  var PORTAL_LINE = 'What each customer sees when they log in, with your logo. They book a job, ask for a quote and find their own paperwork. Every request comes to you first.';
  (function () {
    var L = UI.VIEWS; if (!L || L.some(function (x) { return x.k === 'portal'; })) return;
    var at = -1, i;
    for (i = 0; i < L.length; i++) if (L[i].k === 'customers') at = i;
    if (at < 0) for (i = 0; i < L.length; i++) if (L[i].g === 'Customers') at = i;
    L.splice(at < 0 ? L.length : at + 1, 0, { k: 'portal', g: 'Customers', n: 'Customer portal', ic: 'world', sub: 'Each customer\'s own page, with your logo' });
  })();
  function portalCust() {
    var cs = S().customers || [], id = st().portal;
    function ok(x) { return cs.some(function (c) { return c.id === x; }); }
    if (!id || !ok(id)) id = ok('c6') ? 'c6' : (cs[0] ? cs[0].id : '');
    return id;
  }
  function portalUrl(id) { return 'portal.html?c=' + encodeURIComponent(id); }
  V.portal = function () {
    var id = portalCust(), cs = S().customers || [];
    return '<div class="xp-ptl-hd"><div class="xp-ptl-tt"><h2>' + ic('world') + 'Customer portal</h2><p>' + PORTAL_LINE + '</p></div>' +
      '<a class="btn" id="xpPortalOpen" href="' + h(portalUrl(id)) + '" target="_blank" rel="noopener">' + ic('external') + 'Open in a new tab</a></div>' +
      '<div class="xp-ptl-pick" id="xpPortalPick" role="group" aria-label="Choose which customer to view">' + cs.map(function (c) {
        var on = c.id === id;
        return '<button type="button" class="btn sm' + (on ? ' on' : '') + '" data-act="xpPortal" data-id="' + h(c.id) + '"' + (on ? ' aria-pressed="true"' : '') + '>' + h(c.name) + '</button>';
      }).join('') + '</div>';
  };
  /* The portal sits in its own box just under the screen, so it is not thrown away and loaded again every time the screen redraws. */
  var pHost = null, pFrame = null, pWant = '';
  function portalSync() {
    var on = ui.view === 'portal', view = document.getElementById('view');
    document.body.classList.toggle('xp-ptl-on', on);
    if (!on || !view || !view.parentNode) { if (pHost) pHost.hidden = true; return; }
    var id = portalCust(), c = CS.cust(id), theme = (S().settings && S().settings.theme) === 'dark' ? 'dark' : 'light';
    var want = portalUrl(id) + '&theme=' + theme;
    if (!pHost) {
      pHost = document.createElement('div'); pHost.id = 'xpPortalHost'; pHost.className = 'xp-ptl-host';
      pFrame = document.createElement('iframe'); pFrame.id = 'xpPortalFrame'; pFrame.setAttribute('loading', 'eager');
      pFrame.src = want; pWant = want;
      pHost.appendChild(pFrame);
    }
    if (pHost.parentNode !== view.parentNode || pHost.previousElementSibling !== view) view.parentNode.insertBefore(pHost, view.nextSibling);
    pHost.hidden = false;
    pFrame.title = 'Customer portal' + (c ? ' for ' + c.name : '');
    if (pWant !== want) {
      pWant = want;
      try { pFrame.contentWindow.location.replace(want); } catch (e) { pFrame.src = want; }   // replace, so Back still belongs to the main screen
    }
    var cur = document.querySelector('#xpPortalPick .on');
    if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = Math.max(0, cur.offsetLeft - cur.parentNode.offsetLeft - 12);
  }
  A.xpPortal = function (el) { var id = el.dataset.id; if (!CS.cust(id)) return; st().portal = id; UI.render(); };
  (function () {
    var view = document.getElementById('view'); if (!view || !window.MutationObserver) return;
    new MutationObserver(portalSync).observe(view, { childList: true });
  })();
  if (location.hash === '#portal') ui.view = 'portal';

  /* ---------- connections: one more card ---------- */
  var oldConn = V.connections;
  if (oldConn) V.connections = function () {
    var old = oldConn();
    if (old.indexOf('data-xp="credit"') > -1) return old;
    var card = '<div class="card pad conn" data-xp="credit"><div class="row"><span class="cic">' + ic('checks') + '</span><h2 style="flex:1">Credit checks</h2><span class="tag">Not connected</span></div>' +
      '<p>Link your own credit reference account (for example Creditsafe) so every account is watched. If a customer\'s risk changes, a flag shows next to their name.</p>' +
      '<small class="muted"><b>What it needs.</b> Your own account with the agency, with API access. To confirm on your plan before we start.</small>' +
      '<button class="btn sm" data-act="' + (A.connGo ? 'connGo' : 'go') + '" data-v="credit">' + ic('eye') + 'See credit control</button></div>';
    var box = document.createElement('div'); box.innerHTML = old;
    var grid = box.querySelector('.cgrid');
    if (!grid) return old + '<div class="cgrid" style="margin-top:16px">' + card + '</div>';
    grid.insertAdjacentHTML('beforeend', card);
    return box.innerHTML;
  };

  /* ---------- wiring ---------- */
  A.xpMode =function (el) { var k = el.dataset.k, v = el.dataset.v; if (k !== 'cust' && k !== 'sup') return; st()[k] = v === 'table' ? 'table' : 'cards'; UI.render(); };
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'xpSupQ') { st().supQ = e.target.value; filterSup(); } });
  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.classList && el.classList.contains('xp-click')) { e.preventDefault(); el.click(); }
  });
  window.CACXP = { custRows: custRows, supRows: supRows };
  UI.render();
})();
