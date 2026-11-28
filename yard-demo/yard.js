/* Yard layer for the skip and grab demo: Home, bookings, day plan, skips on site, live tracking,
   driver app, tickets and WTNs, Defra, recycling, credit control, scoreboard, problems and "make it yours".
   Sample data in this browser only. Nothing is sent anywhere. */
(function () {
  function ready() {
    var UI = window.DSGUI, CS = window.CS;
    if (!(UI && UI.V && UI.A && UI.VIEWS && CS && CS.S && window.DSGYC && window.DSGG && window.DSGV3 && window.DSGSK)) return false;
    var have = UI.VIEWS.map(function (v) { return v.k; }).join(' ');
    return /\bteam\b/.test(have) && /\bportal\b/.test(have) && /\bcompliance\b/.test(have) && /\bhistory\b/.test(have);
  }
  function start(tries) {
    if (!ready()) { if ((tries || 0) < 120) { setTimeout(function () { start((tries || 0) + 1); }, 50); return; } if (!(window.DSGUI && window.CS && window.CS.S && window.DSGYC)) return; }
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic;
    var h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s, r) { return (r || document).querySelector(s); }
    function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
    function plural(n, w, p) { return n + ' ' + (n === 1 ? w : (p || w + 's')); }
    function save() { CS.save(); }
    function commit() { CS.save(); UI.render(); }
    function toast(text, icon) {
      var box = q('#toasts'); if (!box) return; var el = document.createElement('div'); el.className = 'toast';
      el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>'; box.appendChild(el);
      setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200);
    }
    function modal(title, body, foot, cls) {
      q('#layer').innerHTML = '<div class="scrim" data-act="close"></div><div class="modal ' + (cls || '') + '" role="dialog" aria-label="' + h(String(title).replace(/<[^>]+>/g, '')) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>';
    }
    function drawer(title, sub, body, foot) {
      q('#layer').innerHTML = '<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-label="' + h(String(title).replace(/<[^>]+>/g, '')) + '"><div class="dhd"><div style="flex:1;min-width:0"><h2>' + title + '</h2><small>' + sub + '</small></div><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="dbd">' + body + '</div>' + (foot ? '<div class="dft">' + foot + '</div>' : '') + '</aside>';
    }
    if (!A.close) A.close = function () { q('#layer').innerHTML = ''; };
    function go(v) { A.go({ dataset: { v: v } }); }
    function dayName(off) { return CS.fmtDay(off); }
    function lorryTag(id) { var l = YC.lorry(id); return l ? '<span class="yplate yx">' + h(l.reg) + '</span>' : '<span class="tag bad">No lorry yet</span>'; }
    var STAT = { planned: ['Booked', ''], onway: ['On the way', 'brand'], onsite: ['On site', 'mail'], done: ['Done', 'ok'] };
    function stTag(j) { var s = STAT[j.status] || STAT.planned; return '<span class="tag ' + s[1] + '">' + s[0] + '</span>'; }
    /* cash jobs: a Cash job tag and where the money is up to */
    function cashBadge(j) { return YC.isCash(j) ? '<span class="tag ycashjob">Cash job</span>' + YC.cashTag(j) : ''; }
    function streamTxt(k) { var s = YC.STREAMS[k]; return s ? h(s.n) + ' <span class="yewc">EWC ' + s.ewc + '</span>' : ''; }

    /* ======================================================================
       People and "make it yours": every person gets their own menu order, favourites and home tiles
       ====================================================================== */
    var PK = 'dsg-prefs';
    var USERS = [{ k: 'dave', n: 'Dave Archer', r: 'Managing Director', c: '#1F4FA8' }, { k: 'ellie', n: 'Ellie Ward', r: 'Office', c: '#0E9F6E' }, { k: 'sam', n: '', r: 'Sales', c: '#52525B' }];
    (function (B) { if (!B || !B.on) return; if (B.name) USERS[0].n = B.name; if (B.role) USERS[0].r = B.role; if (B.colour) USERS[0].c = B.badge; })(window.DSGBRAND);   /* personal link (brand.js) */
    function uName(u) { return u.k === 'sam' ? CS.bde() : u.n; }
    function allP() { try { return JSON.parse(localStorage.getItem(PK) || '{}') || {}; } catch (e) { return {}; } }
    function meK() { var a = allP(); return USERS.some(function (u) { return u.k === a.user; }) ? a.user : 'dave'; }
    function meU() { var k = meK(); return USERS.filter(function (u) { return u.k === k; })[0]; }
    function P() { var a = allP(); return (a.users && a.users[meK()]) || {}; }
    function setP(fn) { var a = allP(), k = meK(); a.users = a.users || {}; var p = a.users[k] || {}; fn(p); a.users[k] = p; try { localStorage.setItem(PK, JSON.stringify(a)); } catch (e) {} }
    function drawMe() {
      var u = meU(), box = q('.side .me'); if (!box) return;
      var av = box.querySelector('.av'), who = box.querySelector('.who');
      if (av) { av.textContent = CS.initials(uName(u)); av.style.setProperty('--c', u.c); }
      if (who) who.innerHTML = '<b>' + h(uName(u)) + '</b><small>' + h(u.r) + '</small>';
      if (who && !who.getAttribute('data-act')) { who.setAttribute('data-act', 'yMine'); who.setAttribute('role', 'button'); who.setAttribute('tabindex', '0'); who.title = 'Switch person, or make it yours'; }
    }

    /* ---------- the menu ---------- */
    var GROUPS = ['Today', 'Jobs', 'Customers', 'Money', 'Yard', 'More'];
    var MAP = {
      home: ['Today', 'Home', 'home'], inbox: ['Today', 'Inbox', 'inbox'],
      bookings: ['Jobs', 'Bookings', 'calendar'], plan: ['Jobs', 'Day plan', 'route'], skips: ['Jobs', 'Skips on site', 'skip'], permits: ['Jobs', 'Permits', 'certificate'], tracking: ['Jobs', 'Live tracking', 'map-pin'],
      customers: ['Customers', 'Customers', 'users'], quotes: ['Customers', 'Quotes', 'file-text'], portal: ['Customers', 'Customer portal', 'world'],
      credit: ['Money', 'Credit control', 'lock'], cash: ['Money', 'Cash', 'pound'], money: ['Money', 'Money', 'pound'],  prices: ['Money', 'Price list', 'list'], scoreboard: ['Money', 'Scoreboard', 'target'],
      wastein: ['Yard', 'Waste in', 'stack'], driver: ['Yard', 'Driver app', 'mobile'], tickets: ['Yard', 'Tickets and WTNs', 'receipt'], defra: ['Yard', 'Defra tracking', 'shield-check'], recycling: ['Yard', 'Recycling report', 'leaf'],
      trends: ['More', 'Trends', 'trending-up'], chasing: ['More', 'Chasing', 'bell'], orders: ['More', 'Order diary', 'calendar'], history: ['More'], today: ['More', 'Day summary', 'dashboard'], jobs: ['More', 'Partner jobs', 'truck'], sales: ['More', 'Sales', 'target'],
      team: ['More', 'Team', 'users'], suppliers: ['More', 'Supplier handbook', 'warehouse'], compliance: ['More'], find: ['More', 'Find a supplier', 'map-pin'], bills: ['More', 'Bill check', 'receipt'], paperwork: ['More', 'Duty of care', 'certificate'], reports: ['More', 'Waste and carbon', 'leaf']
    };
    var NEW = [
      { k: 'bookings', sub: 'Every skip and grab job, with the waste stream, EWC code and permit' },
      { k: 'plan', sub: 'Drag a job onto a lorry. Drivers see the change straight away' },
      { k: 'skips', sub: 'Every skip out on hire, how long it has been there, and what is overdue' },
      { k: 'tracking', sub: 'Where every lorry is and how each job is going' },
      { k: 'driver', hide: true, sub: 'What your drivers see on their phones' },
      { k: 'tickets', sub: 'Tip tickets matched to jobs, and waste transfer notes made by themselves' },
      { k: 'defra', sub: 'Every movement prepared for Defra\'s digital waste tracking' },
      { k: 'recycling', sub: 'Tonnes, recycling rate and carbon, for the company and for each customer' },
      { k: 'wastein', sub: 'Weighbridge tickets for lorries tipping at the yard' },
      { k: 'permits', sub: 'Every road permit, from applying to approved' },
      { k: 'prices', sub: 'Skips, RoRos with the tonnage included, grabs and muckaway. New bookings price from here' },
      { k: 'cash', sub: 'Cash on the day: collected, still to collect, not collected, and what each driver hands in' },
      { k: 'scoreboard', sub: 'Who is top this week, in the office and on the road, with commission worked out' },
      { k: 'problems', hide: true, n: 'Reported problems', ic: 'alert', sub: 'Everything reported through the assistant, and where it is up to' }
    ];
    NEW.forEach(function (n) { if (UI.VIEWS.some(function (v) { return v.k === n.k; })) return; var m = MAP[n.k] || []; UI.VIEWS.push({ k: n.k, g: m[0] || 'More', n: n.n || m[1], ic: n.ic || m[2], sub: n.sub, hide: n.hide }); });
    UI.VIEWS.forEach(function (v) { var m = MAP[v.k]; if (m) { v.g = m[0]; if (m[1]) v.n = m[1]; if (m[2]) v.ic = m[2]; } else if (!v.hide && v.k !== 'home') v.g = 'More'; if (v.k === 'home') v.g = 'Today'; });
    var jv = UI.VIEWS.filter(function (v) { return v.k === 'jobs'; })[0]; if (jv) jv.sub = 'Jobs passed to partner firms outside your area';
    var cv = UI.VIEWS.filter(function (v) { return v.k === 'credit'; })[0]; if (cv) cv.sub = 'Who owes what, how late, statements, reminders and who is on stop';
    var hv = UI.VIEWS.filter(function (v) { return v.k === 'home'; })[0]; if (hv) hv.sub = '';
    function defOrder() { var mk = Object.keys(MAP), o = []; GROUPS.forEach(function (g) { UI.VIEWS.filter(function (v) { return !v.hide && v.g === g; }).sort(function (a, b) { var ia = mk.indexOf(a.k), ib = mk.indexOf(b.k); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); }).forEach(function (v) { o.push(v.k); }); }); return o; }
    var DEF = defOrder();
    /* keep the list itself in menu order too */
    UI.VIEWS.sort(function (a, b) { var ia = DEF.indexOf(a.k), ib = DEF.indexOf(b.k); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    function grpOf(k) { var p = P(); var v = UI.VIEWS.filter(function (x) { return x.k === k; })[0]; return (p.grp && p.grp[k]) || (v && v.g) || 'More'; }
    function ordered(g) {
      var p = P(), ord = p.order || DEF, pins = p.pins || [];
      return UI.VIEWS.filter(function (v) { return !v.hide && grpOf(v.k) === g && pins.indexOf(v.k) < 0; }).map(function (v) { return v.k; })
        .sort(function (a, b) { var ia = ord.indexOf(a), ib = ord.indexOf(b); if (ia < 0) ia = 900 + DEF.indexOf(a); if (ib < 0) ib = 900 + DEF.indexOf(b); return ia - ib; });
    }
    function view(k) { return UI.VIEWS.filter(function (v) { return v.k === k; })[0]; }
    function navCounts(base) {
      var c = {}; for (var k in base) c[k] = base[k];
      try {
        var y = Y(), s = S();
        c.inbox = (y.inbox || []).filter(function (m) { return !m.done; }).length;
        c.permits = (y.permits || []).filter(function (p) { return p.status === 'apply'; }).length;
        c.skips = y.onsite.filter(function (o) { return !o.booked && -o.since > o.hire; }).length;
        c.plan = YC.today(y).filter(function (j) { return !j.lorry; }).length;
        c.defra = YC.defraRows(s, y).filter(function (r) { return r.status === 'error'; }).length;
        c.tickets = y.tickets.filter(function (t) { return !t.matched; }).length;
        c.cash = YC.cashItems(s, y).filter(function (x) { return x.state === 'not' && !x.cash.settled; }).length;
        c.credit = s.customers.filter(function (x) { return x.stop; }).length + s.invoices.filter(function (i) { return i.status !== 'paid' && i.due <= -30; }).length;
      } catch (e) {}
      return c;
    }
    var RED = {};   /* calm: counts in the menu are grey, the real issues show on the page */
    window.DSGNAV = function (ctx) {
      var s = S(); s.settings.navShut = s.settings.navShut || {};
      if (!s.settings.navMoreSet) { s.settings.navMoreSet = true; s.settings.navShut.More = true; save(); }
      var shut = s.settings.navShut, cur = ui.view === 'pricebook' ? 'suppliers' : ui.view, curG = grpOf(cur), counts = navCounts(ctx.counts || {}), pins = (P().pins || []).filter(function (k) { return view(k) && !view(k).hide; });
      if (curG && shut[curG] && ui.yNavSeen !== ui.view && pins.indexOf(cur) < 0) { delete shut[curG]; save(); }
      ui.yNavSeen = ui.view;
      function item(k, g) {
        var v = view(k); if (!v) return ''; var c = counts[k], pinned = pins.indexOf(k) >= 0;
        return '<button data-act="go" data-v="' + k + '" data-nav="' + k + '" draggable="true" class="' + (cur === k ? 'on' : '') + (g && shut[g] ? ' gshut' : '') + '" title="' + h(v.n) + '">' + ic(v.ic) + '<span class="lb">' + h(v.n) + '</span>' +
          (c ? '<span class="cnt' + (RED[k] ? ' red' : ' grey') + '">' + c + '</span>' : '') +
          '<span class="ypin' + (pinned ? ' on' : '') + '" data-act="yPin" data-v="' + k + '" role="button" aria-label="' + (pinned ? 'Unpin ' : 'Pin ') + h(v.n) + '" title="' + (pinned ? 'Unpin' : 'Pin to the top') + '">' + ic('star') + '</span></button>';
      }
      function head(g) {
        var n = 0, red = false; ordered(g).forEach(function (k) { if (counts[k]) { n += counts[k]; if (RED[k]) red = true; } });
        return '<button class="navg' + (shut[g] ? ' shut' : '') + (shut[g] && curG === g ? ' cur' : '') + '" data-act="navGroup" data-g="' + g + '" data-navg="' + g + '" aria-expanded="' + (shut[g] ? 'false' : 'true') + '" title="' + (shut[g] ? 'Show ' : 'Hide ') + g + '"><span class="gl">' + g + '</span>' + (shut[g] && n ? '<span class="cnt' + (red ? ' red' : ' grey') + '">' + n + '</span>' : '') + '</button>';
      }
      var o = '<div class="navtop"><button class="navcta" data-act="yBook" title="New booking (B)">' + ic('plus') + '<span class="lb">New booking</span></button><button class="navcta two" data-act="desk" title="New quote (Q)" aria-label="New quote">' + ic('file-text') + '</button></div>';
      if (pins.length) o += '<div class="navg ypinhd" data-navg="Pinned"><span class="gl">' + ic('star') + 'Pinned</span></div>' + pins.map(function (k) { return item(k, null); }).join('');
      GROUPS.forEach(function (g) { var ks = ordered(g); if (!ks.length) return; o += head(g) + ks.map(function (k) { return item(k, g); }).join(''); });
      o += '<button class="ymine" data-act="yMine" title="Drag the menu into your own order, pin favourites, choose your home tiles">' + ic('star') + '<span class="lb">Make it yours</span></button>';
      return o;
    };
    A.yPin = function (el, e) {
      if (e) { e.stopPropagation(); }
      var k = el.dataset.v; setP(function (p) { p.pins = p.pins || []; var i = p.pins.indexOf(k); if (i >= 0) p.pins.splice(i, 1); else p.pins.push(k); });
      var on = (P().pins || []).indexOf(k) >= 0; toast((on ? 'Pinned ' : 'Unpinned ') + h(view(k).n) + (on ? ' to the top of your menu' : ''), 'star');
      UI.render(); if (q('#yMine')) A.yMine();
    };
    /* drag and drop the menu */
    (function () {
      var nav = q('#nav'), dragK = null;
      function clear() { qa('#nav .ydrop-b,#nav .ydrop-a').forEach(function (x) { x.classList.remove('ydrop-b', 'ydrop-a'); }); }
      nav.addEventListener('dragstart', function (e) { var b = e.target.closest && e.target.closest('[data-nav]'); if (!b) return; dragK = b.getAttribute('data-nav'); b.classList.add('ydrag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragK); } catch (x) {} });
      nav.addEventListener('dragend', function () { dragK = null; clear(); qa('#nav .ydrag').forEach(function (x) { x.classList.remove('ydrag'); }); });
      nav.addEventListener('dragover', function (e) {
        if (!dragK) return; var t = e.target.closest && (e.target.closest('[data-nav]') || e.target.closest('[data-navg]')); if (!t) return;
        e.preventDefault(); clear(); var r = t.getBoundingClientRect(); t.classList.add(t.hasAttribute('data-navg') || e.clientY > r.top + r.height / 2 ? 'ydrop-a' : 'ydrop-b');
      });
      nav.addEventListener('drop', function (e) {
        if (!dragK) return; e.preventDefault();
        var t = e.target.closest && (e.target.closest('[data-nav]') || e.target.closest('[data-navg]')); var k = dragK; clear(); dragK = null; if (!t) return;
        moveNav(k, t.getAttribute('data-nav'), t.getAttribute('data-navg'), !t.hasAttribute('data-navg') && e.clientY <= t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2);
      });
    })();
    function moveNav(k, onK, onG, before) {
      setP(function (p) {
        var pins = p.pins || [], order = (p.order || DEF).slice(); DEF.forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });
        order.splice(order.indexOf(k), 1);
        if (onG === 'Pinned' || (onK && pins.indexOf(onK) >= 0)) { if (pins.indexOf(k) < 0) pins.push(k); p.pins = pins; order.push(k); p.order = order; return; }
        var i = pins.indexOf(k); if (i >= 0) pins.splice(i, 1); p.pins = pins;
        var g = onG || grpOf(onK); p.grp = p.grp || {}; p.grp[k] = g;
        if (onK) { var at = order.indexOf(onK); order.splice(before ? at : at + 1, 0, k); }
        else { var first = ordered(g)[0]; order.splice(first ? order.indexOf(first) : order.length, 0, k); }
        p.order = order;
      });
      var s = S(); if (onG && s.settings.navShut && s.settings.navShut[onG]) { delete s.settings.navShut[onG]; save(); }
      UI.render(); toast(h(view(k).n) + ' moved. Saved for ' + h(uName(meU()).split(' ')[0]), 'star');
    }
    A.yNavUp = function (el) { var k = el.dataset.v, g = grpOf(k), l = ordered(g), i = l.indexOf(k); if (i > 0) moveNav(k, l[i - 1], null, true); A.yMine(); };
    A.yNavDown = function (el) { var k = el.dataset.v, g = grpOf(k), l = ordered(g), i = l.indexOf(k); if (i >= 0 && i < l.length - 1) moveNav(k, l[i + 1], null, false); A.yMine(); };
    A.yMine = function () {
      var u = meU(), pins = P().pins || [];
      var rows = GROUPS.map(function (g) {
        var ks = ordered(g); if (!ks.length) return '';
        return '<div class="ym-g"><b>' + g + '</b>' + ks.map(function (k, i) {
          return '<div class="ym-r"><span class="ym-n">' + ic(view(k).ic) + h(view(k).n) + '</span><button class="iconbtn sm" data-act="yNavUp" data-v="' + k + '" aria-label="Move ' + h(view(k).n) + ' up"' + (i ? '' : ' disabled') + '>' + ic('chevron-down', 'up') + '</button><button class="iconbtn sm" data-act="yNavDown" data-v="' + k + '" aria-label="Move ' + h(view(k).n) + ' down"' + (i < ks.length - 1 ? '' : ' disabled') + '>' + ic('chevron-down') + '</button><button class="iconbtn sm ym-star" data-act="yPin" data-v="' + k + '" aria-label="Pin ' + h(view(k).n) + '">' + ic('star') + '</button></div>';
        }).join('') + '</div>';
      }).join('');
      var pinRows = pins.length ? '<div class="ym-g"><b>Pinned</b>' + pins.filter(view).map(function (k) { return '<div class="ym-r"><span class="ym-n">' + ic(view(k).ic) + h(view(k).n) + '</span><button class="iconbtn sm ym-star on" data-act="yPin" data-v="' + k + '" aria-label="Unpin ' + h(view(k).n) + '">' + ic('star') + '</button></div>'; }).join('') + '</div>' : '';
      modal(ic('star') + ' Make it yours', '<div id="yMine"><p class="ym-lead">Everyone gets their own layout. Drag items in the side menu into the order you like, or use the arrows here. Tap the star to pin a page to the top. Your home tiles move the same way.</p>' +
        '<div class="ym-who"><span>Layout for</span><div class="seg">' + USERS.map(function (x) { return '<button data-act="yUser" data-v="' + x.k + '" class="' + (x.k === u.k ? 'on' : '') + '">' + h(uName(x).split(' ')[0]) + '</button>'; }).join('') + '</div></div>' +
        pinRows + rows + '</div>',
        '<button class="btn" data-act="yResetMine">' + ic('refresh') + 'Reset my layout</button><span class="sp"></span><button class="btn" data-act="yArrange">' + ic('dashboard') + 'Arrange home tiles</button><button class="btn pri" data-act="close">Done</button>', 'ymine-m');
    };
    A.yUser = function (el) {
      var a = allP(); a.user = el.dataset.v; try { localStorage.setItem(PK, JSON.stringify(a)); } catch (e) {}
      drawMe(); UI.render(); A.yMine(); toast('Now showing ' + h(uName(meU()).split(' ')[0]) + '\'s layout', 'user');
    };
    A.yResetMine = function () { setP(function (p) { delete p.order; delete p.pins; delete p.grp; delete p.tiles; delete p.hidden; }); UI.render(); A.yMine(); toast('Layout reset for ' + h(uName(meU()).split(' ')[0]), 'refresh'); };

    /* ======================================================================
       Money figures used on several screens
       ====================================================================== */
    function cashWeek() { return S().invoices.filter(function (i) { return i.status === 'paid' && i.paidDay != null && i.paidDay >= -6; }); }
    function sum(l, f) { return l.reduce(function (a, x) { return a + (f ? f(x) : x.amount) || a; }, 0); }
    function aged() {
      var b = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
      S().invoices.forEach(function (i) { if (i.status === 'paid') return; var late = -i.due; if (late <= 0) b.cur += i.amount; else if (late <= 30) b.d30 += i.amount; else if (late <= 60) b.d60 += i.amount; else if (late <= 90) b.d90 += i.amount; else b.d90p += i.amount; });
      b.total = b.cur + b.d30 + b.d60 + b.d90 + b.d90p; b.over = b.total - b.cur; return b;
    }
    function agedC(cid) {
      var b = { cur: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0, worst: 0 };
      S().invoices.forEach(function (i) { if (i.status === 'paid' || i.cust !== cid) return; var late = -i.due; b.total += i.amount; if (late > b.worst) b.worst = late; if (late <= 0) b.cur += i.amount; else if (late <= 30) b.d30 += i.amount; else if (late <= 60) b.d60 += i.amount; else if (late <= 90) b.d90 += i.amount; else b.d90p += i.amount; });
      return b;
    }
    function stops() { return S().customers.filter(function (c) { return c.stop; }); }
    /* Revenue by day for this yard: today and ahead from the booked jobs, earlier days a steady sample (weekdays about £13k to £16.5k, Saturdays half that, Sundays shut) */
    function yRevDay(off) {
      if (off >= 0) return Y().jobs.filter(function (j) { return j.day === off; }).reduce(function (a, j) { return a + (j.price || 0); }, 0);
      var d = CS.dayDate(off).getDay(); if (d === 0) return 0;
      var r = Math.abs(Math.sin(off * 12.9898 + 4.1414) * 43758.5453) % 1;
      return Math.round((d === 6 ? 6800 + r * 1800 : 13200 + r * 3600) / 5) * 5;
    }
    window.YREV = { day: yRevDay };
    function weekRevenue() {
      var dow = (CS.dayDate(0).getDay() + 6) % 7, v = 0; for (var d = -dow; d <= 0; d++) v += yRevDay(d);
      return { v: v, n: Math.round(v / 410) };
    }


    /* ======================================================================
       HOME: calm, eight tiles by default, drag to rearrange, Arrange to add or hide
       ====================================================================== */
    var TILE_DEF = ['credit', 'jobs', 'lorries', 'skips', 'inbox', 'permits2'];
    var TILE_EXTRA = ['defra', 'week', 'recycle', 'league', 'tickets', 'permits', 'unassigned', 'quotes'];
    function tiles() {
      var y = Y(), s = S(), t0 = YC.today(y), done = t0.filter(function (j) { return j.status === 'done'; }).length, road = YC.LORRIES.filter(function (l) { var w = YC.where(y, l.id); return w.state === 'onway' || w.state === 'onsite' || w.state === 'between'; }).length;
      var ag = aged(), st = stops(), cw = sum(cashWeek()), os = y.onsite.filter(function (o) { return !o.booked; }), od = os.filter(function (o) { return -o.since > o.hire; }).length, dueT = os.filter(function (o) { return -o.since === o.hire; }).length;
      var dr = YC.defraRows(s, y), rdy = dr.filter(function (r) { return r.status === 'ready'; }).length, err = dr.filter(function (r) { return r.status === 'error'; }).length;
      var needs = (y.inbox || []).filter(function (m) { return !m.done; }).length, wr = weekRevenue();
      var lead = drivers()[0], unm = y.tickets.filter(function (t) { return !t.matched; }).length, perm = permitsSoon().length, un = t0.filter(function (j) { return !j.lorry; }).length;
      var quiet = s.quotes.filter(function (x) { return x.status === 'sent' && x.day <= -3; }).length;
      return {
        credit: { t: 'Owed to you', v: money(ag.total), s: money(ag.over) + ' overdue' + (st.length ? ', ' + st.length + ' on stop' : ''), bad: !!st.length, go: 'credit', i: 'pound' },
        jobs: { t: 'Jobs today', v: done + '<i>/' + t0.length + '</i>', s: (t0.length - done) + ' still to do', go: 'plan', i: 'route' },
        lorries: { t: 'Lorries out', v: road + '<i>/' + YC.LORRIES.length + '</i>', s: 'Live on the map', go: 'tracking', i: 'truck' },
        skips: { t: 'Skips on site', v: os.length, s: od ? od + ' overdue' + (dueT ? ', ' + dueT + ' due back today' : '') : 'None overdue', bad: od > 0, go: 'skips', i: 'skip' },
        inbox: { t: 'Messages', v: needs, s: needs ? 'need a reply' : 'All answered', go: 'inbox', i: 'inbox' },
        defra: { t: 'Ready for Defra', v: rdy, s: err ? err + ' need fixing first' : 'Nothing to fix', bad: err > 0, go: 'defra', i: 'shield-check' },
        week: { t: 'Booked this week', v: money(wr.v), s: plural(wr.n, 'order') + ' since Monday', go: 'trends', i: 'trending-up' },
        recycle: { t: 'Recycled this month', v: REC.months[REC.months.length - 1].rec + '%', s: 'kept out of landfill', go: 'recycling', i: 'leaf' },
        league: { t: 'Top of the league', v: h(lead ? lead.first : ''), s: lead ? lead.today + ' jobs done today' : '', go: 'scoreboard', i: 'target' },
        tickets: { t: 'Tickets to match', v: unm, s: unm ? 'read from a photo' : 'All matched', bad: unm > 0, go: 'tickets', i: 'receipt' },
        permits: { t: 'Permits ending soon', v: perm, s: 'in the next 3 days', bad: perm > 0, go: 'skips', i: 'certificate' },
        unassigned: { t: 'Jobs without a lorry', v: un, s: 'drag them onto the plan', bad: un > 0, go: 'plan', i: 'route' },
        permits2: { t: 'Permits', v: (y.permits || []).filter(function (p) { return p.status !== 'approved'; }).length, s: (function () { var n = (y.permits || []).filter(function (p) { return p.status === 'apply'; }).length; return n ? n + ' to apply for' : 'All applied for'; })(), bad: (y.permits || []).some(function (p) { return p.status === 'apply'; }), go: 'permits', i: 'certificate' },
        quotes: { t: 'Quotes gone quiet', v: quiet, s: 'sent 3 or more days ago', go: 'quotes', i: 'file-text' }
      };
    }

    /* Home dashboard (Jack, 28 Nov): revenue this week racing last week, plus three rings */
    function yRing(pct, big, label, sub) {
      var r = 34, c = 2 * Math.PI * r, q = Math.max(0, Math.min(1, pct || 0));
      return '<div class="xd-ring"><svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="' + r + '"/><circle class="fg grow" cx="42" cy="42" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - q)).toFixed(1) + '" style="--c:' + c.toFixed(1) + '"/></svg><b class="v">' + big + '</b><div class="t"><b>' + h(label) + '</b><small>' + sub + '</small></div></div>';
    }
    function yDash() {
      var dow = (CS.dayDate(0).getDay() + 6) % 7, a = [0, 0, 0, 0, 0, 0, 0], b = [0, 0, 0, 0, 0, 0, 0];
      for (var q = 0; q < 7; q++) { a[q] = q <= dow ? yRevDay(q - dow) : 0; b[q] = yRevDay(q - dow - 7); }
      var ca = [], cb = [], i, ta = 0, tb = 0; for (i = 0; i < 7; i++) { ta += a[i]; tb += b[i]; ca.push(ta); cb.push(tb); }
      var week = ca[dow], lastAt = cb[dow], nowAt = ca[dow], diff = nowAt - lastAt, pct = lastAt ? Math.round(diff / lastAt * 100) : 0;
      var top = Math.max(ta, tb) * 1.15 || 1, W = 640, Hh = 210, L = 46, R = 16, T = 14, B = 26;
      function x(d) { return L + d / 6 * (W - L - R); }
      function yy(v) { return T + (1 - v / top) * (Hh - T - B); }
      function path(arr, to) { var o = ''; for (var d = 0; d <= to; d++) o += (d ? 'L' : 'M') + x(d).toFixed(1) + ' ' + yy(arr[d]).toFixed(1); return o; }
      var grid = '', k; for (k = 1; k <= 3; k++) { var gv = top / 1.15 * k / 3; grid += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy(gv).toFixed(1) + '" y2="' + yy(gv).toFixed(1) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (yy(gv) + 3.5).toFixed(1) + '" text-anchor="end">£' + Math.round(gv / 1000) + 'k</text>'; }
      var xs = ''; ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (n, d) { xs += '<text class="ax" x="' + x(d).toFixed(1) + '" y="' + (Hh - 7) + '" text-anchor="middle">' + n + '</text>'; });
      var area = path(ca, dow) + 'L' + x(dow).toFixed(1) + ' ' + yy(0).toFixed(1) + 'L' + x(0).toFixed(1) + ' ' + yy(0).toFixed(1) + 'Z';
      var y = Y(), t0 = YC.today(y), done = t0.filter(function (j) { return j.status === 'done'; }).length;
      var out = YC.LORRIES.filter(function (l) { var w = YC.where(y, l.id); return w.state !== 'home' && w.state !== 'yard' && !(w.tip && w.state === 'tipwait'); }).length;
            return '<section class="xd-hero first ydash" id="yDash"><div class="xd-l"><div class="xd-top"><div><small class="xd-k">Revenue this week</small><b class="xd-big">' + money(week) + '</b>' +
        '<span class="xd-d ' + (diff >= 0 ? 'up' : 'down') + '">' + (diff >= 0 ? '&#9650; ' : '&#9660; ') + Math.abs(pct) + '% ' + (diff >= 0 ? 'ahead of' : 'behind') + ' last week at this point (' + money(Math.abs(diff)) + ')</span></div>' +
        '<div class="xd-leg"><span><i class="l1"></i>This week</span><span><i class="l2"></i>Last week, ' + money(tb) + ' in all</span></div></div>' +
        '<svg class="xd-chart" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Revenue this week day by day against last week"><defs><linearGradient id="xdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F4FA8" stop-opacity=".42"/><stop offset="1" stop-color="#1F4FA8" stop-opacity="0"/></linearGradient></defs>' +
        grid + xs + '<path class="pm" d="' + path(cb, 6) + '"/><path class="ar" d="' + area + '"/><path class="tm" pathLength="1" d="' + path(ca, dow) + '"/>' +
        '<circle class="pulse" cx="' + x(dow).toFixed(1) + '" cy="' + yy(ca[dow]).toFixed(1) + '" r="9"/><circle class="now" cx="' + x(dow).toFixed(1) + '" cy="' + yy(ca[dow]).toFixed(1) + '" r="4.5"/></svg></div>' +
        '<div class="xd-r">' + yRing(t0.length ? done / t0.length : 0, done + '/' + t0.length, 'Jobs done today', (t0.length - done) + ' still to go') +
        yRing(YC.LORRIES.length ? out / YC.LORRIES.length : 0, out + '/' + YC.LORRIES.length, 'Lorries out', (YC.LORRIES.length - out) + ' at the yard') +
        (function () { var os = y.onsite.filter(function (o) { return !o.booked; }), od = os.filter(function (o) { return -o.since > o.hire; }).length, tot = os.length + (y.r4sk || 0); return yRing(tot ? (tot - od) / tot : 0, Math.round((tot ? (tot - od) / tot : 0) * 100) + '%', 'Skips within hire', (tot - od) + ' of ' + tot + ' on site'); })() +
        '<button class="xd-go" data-act="go" data-v="trends">Open trends' + ic('chevron-right') + '</button></div></section>';
    }
    function tileOrder() { var p = P(), l = (p.tiles || TILE_DEF).filter(function (k) { return TILE_DEF.indexOf(k) >= 0 || TILE_EXTRA.indexOf(k) >= 0; }); return l; }
    V.home = function () {
      var y = Y(), T = tiles(), ord = tileOrder(), now = CS.dayDate(0), hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
      var t0 = YC.today(y), done = t0.filter(function (j) { return j.status === 'done'; }).length, arr = !!ui.yArr;
      var hidden = TILE_DEF.concat(TILE_EXTRA).filter(function (k) { return ord.indexOf(k) < 0; });
      var o = '<div class="yh-head"><div><small class="yh-date">' + h(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + '</small><h2 id="greet">' + greet + ', ' + h(uName(meU()).split(' ')[0]) + '</h2>' +
        '<p class="yh-hook">' + t0.length + ' jobs on today, ' + done + ' done. ' + money(weekRevenue().v) + ' revenue this week.</p></div>' +
        '<div class="yh-acts"><button class="btn" data-act="yArrange" id="yArrBtn">' + ic(arr ? 'check' : 'dashboard') + (arr ? 'Done' : 'Arrange') + '</button><button class="btn pri" data-act="yBook">' + ic('plus') + 'New booking</button></div></div>';
      if (arr) o += '<div class="note yh-arrnote">' + ic('dashboard') + '<span>Drag a tile to move it. Press the cross to take one off. Add one from the list underneath. Saved for ' + h(uName(meU()).split(' ')[0]) + '.</span></div>';
      if (!arr) o += yDash();
      o += '<div class="yh-tiles' + (arr ? ' arr' : '') + '" id="yTiles">' + ord.map(function (k) {
        var t = T[k]; if (!t) return '';
        return '<div class="yh-tile' + (t.hero ? ' hero' : '') + (t.bad ? ' bad' : '') + '" draggable="true" data-tile="' + k + '"><button class="yh-tb" data-act="' + (t.act || 'go') + '" data-v="' + (t.go || '') + '"><small>' + ic(t.i) + h(t.t) + '</small><b class="' + (t.icon ? 'ic-big' : '') + '">' + t.v + '</b><span>' + h(t.s) + '</span></button>' +
          (arr ? '<button class="yh-x" data-act="yTileHide" data-v="' + k + '" aria-label="Take ' + h(t.t) + ' off home">' + ic('x') + '</button>' : '') + '</div>';
      }).join('') + '</div>';
      if (arr) o += '<div class="yh-tray"><b>Add a tile</b>' + (hidden.length ? hidden.map(function (k) { return '<button class="btn sm" data-act="yTileAdd" data-v="' + k + '">' + ic('plus') + h(T[k].t) + '</button>'; }).join('') : '<span class="muted">Every tile is on your home page.</span>') + '<span class="sp"></span><button class="btn sm" data-act="yTileReset">' + ic('refresh') + 'Back to the standard six</button></div>';
      /* one calm row underneath: the road, and what needs you */
      o += '<div class="yh-low"><section class="card yh-road"><div class="yh-rh"><h3>' + ic('truck') + 'Today on the road</h3><button class="xh2-link yh-link" data-act="go" data-v="tracking">Open the map</button></div>' + roadRows(y) + '</section>' +
        '<section class="card yh-needs"><div class="yh-rh"><h3>' + ic('bell') + 'Needs you</h3></div>' + needsRows() + '</section></div>';
      return o;
    };
    function roadRows(y) {
      return '<div class="yh-rows">' + YC.LORRIES.map(function (l) {
        var list = YC.forLorry(y, l.id, 0), d = list.filter(function (j) { return j.status === 'done'; }).length, w = YC.where(y, l.id);
        return '<button class="yh-lo" data-act="yFocus" data-v="' + l.id + '"><span class="yplate sm">' + h(l.reg) + '</span><span class="yh-st">' + h(stateLine(y, l, w)) + '</span><span class="yh-bar"><i style="width:' + (list.length ? Math.round(d / list.length * 100) : 0) + '%;background:' + l.col + '"></i></span><b>' + d + '/' + list.length + '</b></button>';
      }).join('') + '</div>';
    }
    function needsRows() {
      var y = Y(), s = S(), r = [];
      stops().forEach(function (c) { var a = agedC(c.id); r.push(['lock', h(c.name) + ' is on stop', money(a.total) + ' owed, oldest ' + a.worst + ' days', 'credit', 'bad']); });
      var od = y.onsite.filter(function (o) { return !o.booked && -o.since > o.hire; });
      if (od.length) r.push(['skip', plural(od.length, 'skip') + ' over the hire period', 'Exchange or collect in one tap', 'skips', 'amber']);
      var un = YC.today(y).filter(function (j) { return !j.lorry; }).length; if (un) r.push(['route', plural(un, 'job') + ' without a lorry today', 'Drag them onto the day plan', 'plan', 'amber']);
      var err = YC.defraRows(s, y).filter(function (x) { return x.status === 'error'; }).length; if (err) r.push(['shield-check', plural(err, 'Defra record') + ' to fix', 'Missing a weight or a carrier number', 'defra', 'amber']);
      var ovr = overTickets(); if (ovr.length) r.unshift(['stack', plural(ovr.length, 'RoRo') + ' over its tonnage', 'Invoice for the extra weight is ready to send', 'tickets', 'amber']);
      var unm = y.tickets.filter(function (t) { return !t.matched; }).length; if (unm) r.push(['receipt', plural(unm, 'tip ticket') + ' to match', 'Read from a photo, no job found', 'tickets', '']);
      return '<div class="yh-rows">' + r.slice(0, 5).map(function (x) { return '<button class="yh-nd" data-act="go" data-v="' + x[3] + '"><span class="yh-ni ' + x[4] + '">' + ic(x[0]) + '</span><span class="bd"><b>' + x[1] + '</b><small>' + x[2] + '</small></span>' + ic('chevron-right') + '</button>'; }).join('') + (r.length ? '' : '<p class="muted">Nothing needs you right now.</p>') + '</div>';
    }
    A.yArrange = function () { ui.yArr = !ui.yArr; if (ui.view !== 'home') { A.close(); go('home'); } else UI.render(); };
    A.yTileHide = function (el) { var k = el.dataset.v; setP(function (p) { p.tiles = tileOrder().filter(function (x) { return x !== k; }); }); UI.render(); };
    A.yTileAdd = function (el) { var k = el.dataset.v; setP(function (p) { var l = tileOrder(); if (l.indexOf(k) < 0) l.push(k); p.tiles = l; }); UI.render(); };
    A.yTileReset = function () { setP(function (p) { delete p.tiles; }); UI.render(); toast('Home is back to the standard six tiles', 'refresh'); };
    (function () {
      var dragT = null, vw = q('#view');
      vw.addEventListener('dragstart', function (e) { var t = e.target.closest && e.target.closest('[data-tile]'); if (!t) return; dragT = t.getAttribute('data-tile'); t.classList.add('ydrag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragT); } catch (x) {} });
      vw.addEventListener('dragend', function () { dragT = null; qa('.yh-tile.ydrag,.yh-tile.ydrop').forEach(function (x) { x.classList.remove('ydrag', 'ydrop'); }); });
      vw.addEventListener('dragover', function (e) { if (!dragT) return; var t = e.target.closest && e.target.closest('[data-tile]'); if (!t) return; e.preventDefault(); qa('.yh-tile.ydrop').forEach(function (x) { x.classList.remove('ydrop'); }); t.classList.add('ydrop'); });
      vw.addEventListener('drop', function (e) {
        if (!dragT) return; var t = e.target.closest && e.target.closest('[data-tile]'); if (!t) return; e.preventDefault();
        var k = dragT, on = t.getAttribute('data-tile'); dragT = null; if (k === on) { UI.render(); return; }
        setP(function (p) { var l = tileOrder(); l.splice(l.indexOf(k), 1); l.splice(l.indexOf(on) + (e.clientX > t.getBoundingClientRect().left + t.offsetWidth / 2 ? 1 : 0), 0, k); p.tiles = l; });
        UI.render(); toast('Tile moved. Saved for ' + h(uName(meU()).split(' ')[0]), 'dashboard');
      });
    })();

    /* ======================================================================
       NEW BOOKING: skips and grabs, waste stream and EWC, permits, credit check
       ====================================================================== */
    var WINS = [[450, 540], [540, 660], [660, 780], [780, 900], [900, 1020]];
    function lorryFits(l, j) { if (!l) return true; if (j.type === 'grab' || j.type === 'muck') return l.kind === 'grab'; if ((j.size || 0) >= 20) return l.kind === 'roro'; return l.kind === 'skip'; }
    function fitWhy(j) { return j.type === 'grab' || j.type === 'muck' ? 'Grab and muckaway jobs need a grab lorry.' : (j.size || 0) >= 20 ? 'A ' + j.size + ' yard RoRo needs the hook lorry.' : 'Skips up to 16 yards go on a skip lorry.'; }
    function suggest(j, day) {
      var y = Y(), best = null, bn = 99;
      YC.LORRIES.forEach(function (l) { if (!lorryFits(l, j)) return; var n = YC.forLorry(y, l.id, day).length; if (n < bn) { bn = n; best = l; } });
      return best;
    }
    function bk() { if (!ui.yb) ui.yb = { cust: 'c1', site: 0, svc: 'skip', type: 'deliver', size: 8, rsize: 35, loads: 1, price: null, stream: 'mixed', place: 'drive', day: 'tomorrow', win: 1, lorry: 'auto', notes: '', sure: false }; return ui.yb; }
    function bkDayOff(b) { return b.day === 'today' ? 0 : b.day === 'tomorrow' ? CS.wd(1) : Math.max(0, Math.round((new Date(b.date) - CS.dayDate(0)) / 86400000)) || CS.wd(1); }
    function bkSkipish(b) { return b.svc === 'skip' || b.svc === 'roro'; }
    function bkJob(b) { return { type: bkSkipish(b) ? b.type : b.svc, size: b.svc === 'skip' ? b.size : b.svc === 'roro' ? b.rsize : null, loads: bkSkipish(b) ? null : b.loads }; }
    function creditBox(cid) {
      if (!cid || cid === 'new') return '<div class="ycr ok">' + ic('pound') + '<span><b>New customer.</b> Card on order until an account is opened.</span></div>';
      var c = CS.cust(cid), a = agedC(cid), cr = CS.credit(cid, 0) || {};
      if (c.stop) return '<div class="ycr bad" id="yStopWarn">' + ic('lock') + '<span><b>' + h(c.name) + ' is on stop.</b> ' + money(a.total) + ' owed, the oldest invoice is ' + a.worst + ' days late. Accounts have said no new orders until it is paid.</span></div>';
      if (cr.hold) return '<div class="ycr amber">' + ic('alert') + '<span><b>On hold.</b> ' + h(cr.why || '') + ' You can still book, it is your call.</span></div>';
      if (!c.limit) return '<div class="ycr ok">' + ic('pound') + '<span><b>Pays by card.</b> A pay link goes with the confirmation.</span></div>';
      return '<div class="ycr ok">' + ic('circle-check') + '<span><b>Account in good standing.</b> ' + money(a.total) + ' owed of a ' + money(c.limit) + ' limit.</span></div>';
    }
    function seg(name, val, opts) { return '<div class="seg yseg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="yBkSet" data-k="' + name + '" data-v="' + o[0] + '" class="' + (String(val) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    function bookHTML() {
      var b = bk(), s = S(), c = b.cust !== 'new' ? CS.cust(b.cust) : null, J0 = bkJob(b), off = bkDayOff(b), sug = suggest(J0, off), st = YC.STREAMS[b.stream];
      var custs = s.customers.slice().sort(function (x, z) { return x.name < z.name ? -1 : 1; });
      var pc = c ? (c.sites[b.site] || c.sites[0]).pc : (b.npc || ''), perm = b.place === 'road' ? YC.permitFor(pc || 'GU21', 'new', off, off + 14) : null;
      var lorries = YC.LORRIES.filter(function (l) { return lorryFits(l, J0); });
      var o = '<div class="ybk">' +
        '<div class="field"><label for="ybCust">Customer</label><select id="ybCust" data-yb="cust">' + custs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === b.cust ? ' selected' : '') + '>' + h(x.name) + (x.stop ? ' (on stop)' : '') + '</option>'; }).join('') + '<option value="new"' + (b.cust === 'new' ? ' selected' : '') + '>New one-off customer</option></select></div>' +
        creditBox(b.cust) +
        (c ? '<div class="field"><label for="ybSite">Site</label><select id="ybSite" data-yb="site">' + c.sites.map(function (x, i) { return '<option value="' + i + '"' + (i === +b.site ? ' selected' : '') + '>' + h(x.name + ', ' + x.pc) + '</option>'; }).join('') + '</select></div>'
          : '<div class="ybk2"><div class="field"><label for="ybName">Name</label><input id="ybName" data-ybt="nname" value="' + h(b.nname || '') + '" placeholder="Mrs Jane Smith"></div><div class="field"><label for="ybPhone">Mobile</label><input id="ybPhone" data-ybt="nphone" value="' + h(b.nphone || '') + '" placeholder="07700 900000"></div></div>' +
            '<div class="ybk2"><div class="field"><label for="ybAddr">Address</label><input id="ybAddr" data-ybt="naddr" value="' + h(b.naddr || '') + '" placeholder="12 Church Lane, Knaphill"></div><div class="field"><label for="ybPc">Postcode</label><input id="ybPc" data-ybt="npc" value="' + h(b.npc || '') + '" placeholder="KT14 6EX"></div></div>') +
        '<div class="field"><label>What</label>' + seg('svc', b.svc, [['skip', 'Skip hire'], ['roro', 'RoRo'], ['grab', 'Grab hire'], ['muck', 'Muckaway']]) + '</div>' +
        (bkSkipish(b) ? '<div class="field"><label>Job</label>' + seg('type', b.type, [['deliver', 'Delivery'], ['exchange', 'Exchange'], ['collect', 'Collection'], ['wait', 'Wait and load']]) + '</div>' +
          (b.svc === 'skip' ? '<div class="field"><label>Skip size</label><div class="ysizes">' + YC.SIZES.map(function (z) { return '<button type="button" data-act="yBkSet" data-k="size" data-v="' + z + '" class="' + (+b.size === z ? 'on' : '') + '">' + z + '<small>yard</small></button>'; }).join('') + '</div></div>'
            : '<div class="field"><label>RoRo size</label><div class="ysizes four">' + YC.RORO_SIZES.map(function (z) { var r = YC.prices(Y()).roro[z]; return '<button type="button" data-act="yBkSet" data-k="rsize" data-v="' + z + '" class="' + (+b.rsize === z ? 'on' : '') + '">' + z + '<small>yard, ' + r.incl + ' t incl</small></button>'; }).join('') + '</div>' +
              '<div class="ycr ok" id="yRoroIncl">' + ic('stack') + '<span><b>Includes ' + YC.prices(Y()).roro[b.rsize].incl + ' tonnes.</b> Anything over is ' + money(YC.prices(Y()).overRate) + ' a tonne, invoiced from the weighbridge ticket when it comes back.</span></div></div>')
          : '<div class="field"><label>Loads</label><div class="ystep"><button type="button" data-act="yBkSet" data-k="loads" data-v="' + Math.max(1, b.loads - 1) + '" aria-label="One less load">-</button><b>' + b.loads + '</b><button type="button" data-act="yBkSet" data-k="loads" data-v="' + Math.min(8, b.loads + 1) + '" aria-label="One more load">+</button><span class="muted">8-wheeler, about ' + (b.loads * YC.LOAD_T) + ' tonnes</span></div></div>') +
        '<div class="field"><label for="ybStream">Waste</label><select id="ybStream" data-yb="stream">' + Object.keys(YC.STREAMS).map(function (k) { return '<option value="' + k + '"' + (k === b.stream ? ' selected' : '') + '>' + h(YC.STREAMS[k].n) + '</option>'; }).join('') + '</select><small class="yewc-line">' + ic('certificate') + 'EWC code <b>' + st.ewc + '</b> goes on the job, the waste transfer note and the Defra record</small></div>' +
        '<div class="field"><label for="ybPrice">Price</label><div class="yprice"><span>£</span><input id="ybPrice" data-ybt="price" inputmode="decimal" value="' + h(b.price != null ? b.price : YC.priceFor(Y(), J0)) + '"><span class="muted">+ VAT, from your price list</span></div></div>' +
        (bkSkipish(b) && b.type === 'deliver' ? '<div class="field"><label>Where it goes</label>' + seg('place', b.place, [['drive', 'On the drive or site'], ['road', 'On the road']]) + '</div>' +
          (perm ? '<div class="ycr amber" id="yPermit">' + ic('certificate') + '<span><b>Road permit needed</b> from ' + h(perm.council) + '. It goes on the permit list with its dates, the lights and cones go on the driver\'s job, and you are reminded before it runs out.</span></div>' : '') : '') +
        '<div class="ybk2"><div class="field"><label>Day</label>' + seg('day', b.day, [['today', 'Today'], ['tomorrow', dayName(CS.wd(1))], ['pick', 'Pick a day']]) + (b.day === 'pick' ? '<input type="date" id="ybDate" data-yb="date" value="' + h(b.date || '') + '" style="margin-top:6px">' : '') + '</div>' +
        '<div class="field"><label for="ybWin">Time</label><select id="ybWin" data-yb="win">' + WINS.map(function (w, i) { return '<option value="' + i + '"' + (i === +b.win ? ' selected' : '') + '>' + YC.hhmm(w[0]) + ' to ' + YC.hhmm(w[1]) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="field"><label for="ybLorry">Lorry</label><select id="ybLorry" data-yb="lorry"><option value="auto"' + (b.lorry === 'auto' ? ' selected' : '') + '>Best fit: ' + h(sug ? sug.n + ', ' + sug.driver : 'none free') + '</option>' + lorries.map(function (l) { return '<option value="' + l.id + '"' + (b.lorry === l.id ? ' selected' : '') + '>' + h(l.n + ', ' + l.driver) + '</option>'; }).join('') + '<option value="none"' + (b.lorry === 'none' ? ' selected' : '') + '>Leave it for the day plan</option></select></div>' +
        '<div class="field"><label for="ybNotes">Note for the driver</label><input id="ybNotes" data-ybt="notes" value="' + h(b.notes || '') + '" placeholder="Gate code, where to put it, access"></div>' +
        '</div>';
      return o;
    }
    function bookFoot() {
      var b = bk(), c = b.cust !== 'new' ? CS.cust(b.cust) : null;
      if (c && c.stop) return '<button class="btn" data-act="close">Cancel</button><span class="sp"></span>' + (b.sure ? '<span class="ysure">' + ic('alert') + 'Sure? They are on stop.</span><button class="btn bad" data-act="yBkGo" id="yBkGo">' + ic('lock') + 'Yes, book anyway</button>' : '<button class="btn" data-act="yBkSure" id="yBkGo">' + ic('lock') + 'Book anyway</button>');
      return '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri lg" data-act="yBkGo" id="yBkGo">' + ic('check') + 'Book it</button>';
    }
    function bookDraw() { var m = q('#layer .modal.ybkm'); if (!m) return; var sc = m.querySelector('.mbd').scrollTop; m.querySelector('.mbd').innerHTML = bookHTML(); m.querySelector('.mft').innerHTML = bookFoot(); m.querySelector('.mbd').scrollTop = sc; }
    A.yBook = function (el) {
      ui.yb = null; var b = bk();
      if (el && el.dataset && el.dataset.c) { b.cust = el.dataset.c; }
      if (A.closeSide) A.closeSide();
      modal(ic('plus') + ' New booking', bookHTML(), bookFoot(), 'ybkm');
    };
    A.yBkSet = function (el) {
      var b = bk(), k = el.dataset.k, v = el.dataset.v; b[k] = /^(size|rsize|loads|win)$/.test(k) ? +v : v; b.sure = false;
      if (k === 'svc') { if (v === 'skip' || v === 'roro') { b.stream = 'mixed'; } else { b.stream = 'soil'; b.place = 'drive'; } }
      if (/^(svc|size|rsize|loads)$/.test(k)) b.price = null;
      if (k === 'type' && v !== 'deliver') b.place = 'drive';
      if (k === 'day' && v === 'pick' && !b.date) { var d = CS.dayDate(CS.wd(2)); b.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
      bookDraw();
    };
    A.yBkSure = function () { bk().sure = true; bookDraw(); };
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el.closest) return;
      if (el.dataset && el.dataset.yb && el.closest('.ybkm')) { var b = bk(), k = el.dataset.yb; b[k] = k === 'site' || k === 'win' ? +el.value : el.value; if (k === 'cust') { b.site = 0; b.sure = false; } bookDraw(); }
      if (el.classList && el.classList.contains('ymove')) movePlan(el.dataset.id, el.value);
      if (el.classList && el.classList.contains('ycomm')) { var y = Y(); y.comm = y.comm || {}; y.comm[el.dataset.k] = Math.max(0, Math.min(50, +el.value || 0)); save(); UI.render(); toast('Commission rate saved. Worked out again for this week', 'pound'); }
    });
    document.addEventListener('input', function (e) { var el = e.target; if (el.dataset && el.dataset.ybt && el.closest && el.closest('.ybkm')) bk()[el.dataset.ybt] = el.value; });
    A.yBkGo = function () {
      var b = bk(), s = S(), y = Y(), c = b.cust !== 'new' ? CS.cust(b.cust) : null;
      if (!c && (!String(b.nname || '').trim() || !String(b.npc || '').trim())) { toast('Put the customer\'s name and postcode in first', 'alert'); var f = q(!String(b.nname || '').trim() ? '#ybName' : '#ybPc'); if (f) f.focus(); return; }
      if (b.day === 'today' && WINS[b.win][1] <= YC.nowMin()) { toast('That time has gone today. Pick a later time or another day', 'clock'); return; }
      var J0 = bkJob(b), off = bkDayOff(b), lo = b.lorry === 'auto' ? suggest(J0, off) : b.lorry === 'none' ? null : YC.lorry(b.lorry);
      var cid = c ? c.id : 'o' + (10 + y.jobs.length), site;
      if (!c) { site = { name: String(b.naddr || 'Address to confirm').trim(), pc: String(b.npc).trim().toUpperCase() }; YC.oneoffAdd = YC.oneoffAdd || {}; }
      else site = { name: (c.sites[b.site] || c.sites[0]).name, pc: (c.sites[b.site] || c.sites[0]).pc };
      var p = YC.pos(site.pc), id = 'DSG-' + (y.counters.job++);
      var j = { id: id, day: off, lorry: lo ? lo.id : null, win: WINS[b.win].slice(), type: J0.type, cust: c ? c.id : 'new:' + id, cname: c ? null : String(b.nname).trim(), site: site, lat: p.lat, lng: p.lng,
        size: J0.size, loads: J0.loads, price: parseFloat(String(b.price == null ? '' : b.price).replace(/[^\d.]/g, '')) || YC.priceFor(y, J0), incl: YC.inclFor(y, J0), stream: b.stream, place: b.place, permit: b.place === 'road' && J0.type === 'deliver' ? YC.permitFor(site.pc, id, off, off + 14) : null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: b.notes || '', log: [{ at: Date.now(), t: 'Booked by ' + uName(meU()).split(' ')[0] + (c && c.stop ? ', while on stop' : '') }], isNew: true };
      y.jobs.push(j); y.v++;
      var nm = c ? c.first || c.contact : String(b.nname).trim().split(' ').slice(-1)[0];
      y.texts.unshift({ at: Date.now(), job: id, to: c ? c.name : j.cname, text: 'Booked: ' + YC.what(j).toLowerCase() + ' at ' + site.name + ', ' + dayName(off).toLowerCase() + ' ' + YC.hhmm(j.win[0]) + ' to ' + YC.hhmm(j.win[1]) + '. We will text when the lorry is on its way.' });
      save(); A.close(); ui.yb = null;
      toast('Booked ' + h(id) + ' for ' + h(dayName(off).toLowerCase()) + (lo ? ' on ' + h(lo.first) + '\'s lorry' : ', waiting on the day plan') + '. Confirmation sent to ' + h(c ? c.name : j.cname) + (j.permit ? '. Permit added to the list' : ''), 'circle-check');
      ui.yBkDay = off === 0 ? 'today' : off === CS.wd(1) ? 'tomorrow' : 'week';
      if (ui.view !== 'bookings' && ui.view !== 'plan') go('bookings'); else UI.render();
    };
    YC.custName0 = YC.custName; YC.custName = function (s, id) { if (String(id).indexOf('new:') === 0) { var j = (s.yard && s.yard.jobs || []).filter(function (x) { return x.cust === id; })[0]; return j ? j.cname : 'Customer'; } return YC.custName0(s, id); };
    YC.custFirst0 = YC.custFirst; YC.custFirst = function (s, id) { if (String(id).indexOf('new:') === 0) { var n = YC.custName(s, id); return n.replace(/^(Mrs|Mr|Ms|Miss)\s+/, '').split(' ')[0]; } return YC.custFirst0(s, id); };

    /* ======================================================================
       BOOKINGS
       ====================================================================== */
    V.bookings = function () {
      var y = Y(), s = S(), d = ui.yBkDay || 'today', f = ui.yBkF || 'all', t1 = CS.wd(1);
      var list = y.jobs.filter(function (j) { return d === 'today' ? j.day === 0 : d === 'tomorrow' ? j.day === t1 : j.day >= 0 && j.day <= 7; });
      var cnt = { all: list.length, skip: 0, grab: 0, permit: 0, none: 0 };
      list.forEach(function (j) { if (j.type === 'grab' || j.type === 'muck') cnt.grab++; else cnt.skip++; if (j.permit) cnt.permit++; if (!j.lorry) cnt.none++; });
      var show = list.filter(function (j) { return f === 'all' || (f === 'skip' && j.size) || (f === 'grab' && !j.size) || (f === 'permit' && j.permit) || (f === 'none' && !j.lorry); })
        .sort(function (a, b) { return a.day - b.day || a.win[0] - b.win[0] || String(a.lorry).localeCompare(String(b.lorry)); });
      function chip(k, l) { return '<button class="ychip' + (f === k ? ' on' : '') + '" data-act="yBkF" data-v="' + k + '">' + l + ' <b>' + cnt[k] + '</b></button>'; }
      return '<div class="ybar"><div class="seg">' + [['today', 'Today'], ['tomorrow', dayName(t1)], ['week', 'Next 7 days']].map(function (x) { return '<button data-act="yBkDay" data-v="' + x[0] + '" class="' + (d === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="sp"></span><button class="btn pri" data-act="yBook">' + ic('plus') + 'New booking</button></div>' +
        '<div class="ychips">' + chip('all', 'All') + chip('skip', 'Skips') + chip('grab', 'Grab and muckaway') + chip('permit', 'Road permits') + chip('none', 'No lorry yet') + '</div>' +
        '<div class="card ylist">' + (show.length ? show.map(function (j) {
          return '<button class="yrow' + (j.isNew ? ' new' : '') + '" data-act="yJob" data-id="' + j.id + '"><span class="yt"><b>' + (d === 'week' && j.day ? h(dayName(j.day)) + ' ' : '') + YC.hhmm(j.win[0]) + '</b><small>to ' + YC.hhmm(j.win[1]) + '</small></span>' +
            '<span class="ym"><b>' + h(YC.what(j)) + '</b><small>' + h(YC.custName(s, j.cust)) + ', ' + h(j.site.name) + ' ' + h(j.site.pc) + '</small></span>' +
            '<span class="ys"><span class="ystream">' + streamTxt(j.stream) + '</span>' + (j.permit ? '<span class="tag amber">' + ic('certificate') + 'Permit</span>' : '') + cashBadge(j) + '</span>' +
            '<span class="yl">' + lorryTag(j.lorry) + stTag(j) + '</span></button>';
        }).join('') : '<p class="muted yempty">Nothing here.</p>') + '</div>' +
        '<p class="muted yfoot">Every job carries its waste stream and EWC code from the moment it is booked, so the transfer note, the tip ticket and the Defra record all match.</p>';
    };
    A.yBkDay = function (el) { ui.yBkDay = el.dataset.v; UI.render(); };
    A.yBkF = function (el) { ui.yBkF = el.dataset.v; UI.render(); };

    function jobById(id) { return Y().jobs.filter(function (j) { return j.id === id; })[0]; }
    A.yJob = function (el) {
      var j = jobById(el.dataset.id); if (!j) return; var s = S(), lo = YC.lorry(j.lorry), st = YC.STREAMS[j.stream], t = j.ticket ? Y().tickets.filter(function (x) { return x.id === j.ticket; })[0] : null;
      var steps = [['Booked', true, j.log[0] && j.log[0].at], ['On the way', !!j.at.onway, j.at.onway], ['On site', !!j.at.arrived, j.at.arrived], ['Done', j.status === 'done', j.at.done]];
      var body = '<div class="ytl">' + steps.map(function (x) { return '<div class="' + (x[1] ? 'on' : '') + '"><i></i><b>' + x[0] + '</b><small>' + (x[1] && x[2] ? CS.clock(x[2]) : '') + '</small></div>'; }).join('') + '</div>' +
        '<dl class="kv"><dt>Customer</dt><dd>' + h(YC.custName(s, j.cust)) + '</dd><dt>Site</dt><dd>' + h(j.site.name + ', ' + j.site.pc) + '</dd><dt>When</dt><dd>' + h(dayName(j.day)) + ', ' + h(YC.winBand(j)) + '</dd>' +
        '<dt>Lorry</dt><dd>' + (lo ? h(lo.reg + ', ' + lo.driver) : 'Not given a lorry yet') + '</dd><dt>Waste</dt><dd>' + h(st.n) + '</dd><dt>EWC code</dt><dd>' + st.ewc + '</dd>' +
        (j.permit ? '<dt>Road permit</dt><dd>' + h(j.permit.council) + ', ref ' + h(j.permit.ref) + ', until ' + h(dayName(j.permit.to)) + '</dd>' : '') +
        (t ? '<dt>Tip ticket</dt><dd>' + h(t.id) + ', ' + t.net.toFixed(2) + ' t net at ' + h(YC.TIPS[t.site].n) + '</dd>' : '') +
        (j.price ? '<dt>Price</dt><dd>' + money(j.price) + ' + VAT</dd>' : '') + (j.incl != null && YC.isRoro(j) ? '<dt>Tonnage included</dt><dd>' + j.incl + ' t, then ' + money(YC.prices(Y()).overRate) + ' a tonne</dd>' : '') +
        (t && t.over ? '<dt>Extra weight</dt><dd>' + t.over.over.toFixed(2) + ' t over, ' + money(t.over.amount, true) + ' + VAT, ' + (t.over.status === 'sent' ? 'invoiced on ' + h(t.over.inv) : 'waiting on the weighbridge screen') + '</dd>' : '') +
        (j.notes ? '<dt>Driver note</dt><dd>' + h(j.notes) + '</dd>' : '') + cashRows(j) + '</dl>' +
        (j.eta && j.eta.text ? '<div class="ytext">' + ic('message') + '<span><b>Text to the customer, ' + CS.clock(j.eta.at) + '</b>' + h(j.eta.text) + '</span></div>' : '') +
        (j.photos.length || j.sig ? '<div class="yproof">' + j.photos.map(function (p) { return '<figure><img src="' + h(p.src || YC.samplePhoto(p.k, j.size)) + '" alt="Photo on ' + (p.k === 'drop' ? 'drop' : 'collection') + '"><figcaption>' + (p.k === 'drop' ? 'On drop' : 'On collection') + ', ' + CS.clock(p.at) + '</figcaption></figure>'; }).join('') +
          (j.sig ? '<figure class="sig"><img src="' + h(j.sig.src || YC.sampleSig()) + '" alt="Customer signature"><figcaption>' + (j.sig.none ? 'Customer not there, photo taken' : 'Signed by ' + h(j.sig.name || 'the customer')) + '</figcaption></figure>' : '') + '</div>' : '');
      var foot = '<button class="btn" data-act="close">Close</button><span class="sp"></span>' + (j.wtn ? '<button class="btn" data-act="yWtn" data-id="' + j.id + '">' + ic('certificate') + 'Waste transfer note</button>' : '') +
        (j.status !== 'done' && j.day === 0 && j.lorry ? '<button class="btn pri" data-act="yTrackJob" data-id="' + j.id + '">' + ic('map-pin') + 'See it on the map</button>' : '') +
        (!j.lorry ? '<button class="btn pri" data-act="yToPlan" data-id="' + j.id + '">' + ic('route') + 'Give it a lorry</button>' : '');
      drawer(h(j.id) + ' · ' + h(YC.what(j)), stTag(j) + ' ' + (j.permit ? '<span class="tag amber">Road permit</span>' : '') + (YC.isCash(j) ? ' ' + YC.cashTag(j) : ''), body, foot);
    };
    function cashRows(j) {
      if (!YC.isCash(j)) return '<dt>Payment</dt><dd>Invoice</dd>';
      var st = YC.cashState(j), c = j.cash || {}, a = YC.cashAmt(j);
      return '<dt>Payment</dt><dd>Cash on the day: ' + h(YC.gbp(a.net)) + ' + VAT = <b>' + h(YC.gbp(a.gross)) + '</b></dd>' +
        '<dt>Cash</dt><dd>' + YC.cashTag(j) + (st === 'collected' ? '<small style="display:block">Collected by ' + h(c.by || 'the driver') + ' at ' + CS.clock(c.at) + (c.banked ? ', banked' : ', with the driver to hand in') + '</small>' : st === 'not' ? '<small style="display:block">' + h(c.why || '') + (c.settled ? ' Paid since by ' + h(c.settled.how) + '.' : '') + '</small>' : '<small style="display:block">The driver is asked on his phone before the job goes to the office</small>') + '</dd>' +
        (c.post ? '<dt>Accounts</dt><dd>' + h(c.post.ref) + ' in your accounts package as ' + (c.post.kind === 'paid' ? 'a paid cash sale' : c.settled ? 'a sale, paid since' : 'an unpaid sale to chase') + ', ' + h(YC.gbp(a.net)) + ' + ' + h(YC.gbp(a.vat)) + ' VAT</dd>' : '');
    }
    A.yTrackJob = function (el) { var j = jobById(el.dataset.id); A.close(); ui.yFocus = j && j.lorry; go('tracking'); };
    A.yToPlan = function (el) { var j = jobById(el.dataset.id); A.close(); ui.yPlanDay = j ? j.day : 0; go('plan'); };

    /* ======================================================================
       WASTE TRANSFER NOTE
       ====================================================================== */
    A.yWtn = function (el) {
      var j = jobById(el.dataset.id), s = S(), y = Y(), t, cust, site, no, lo, st, when, size, signed;
      if (j) { t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; cust = YC.custName(s, j.cust); site = j.site.name + ', ' + j.site.pc; no = j.wtn; lo = YC.lorry(j.lorry); st = YC.STREAMS[j.stream]; when = j.at.done || Date.now(); size = j.size ? j.size + ' yard ' + (j.size >= 20 ? 'RoRo' : 'skip') : j.loads + ' x 8-wheeler load'; signed = j.sig; }
      else { t = y.tickets.filter(function (x) { return x.id === el.dataset.t; })[0]; if (!t) return; cust = t.cust ? YC.custName(s, t.cust) : 'Not matched'; site = 'Site on the job'; no = 'WTN-' + (4900 + YC.hash(t.id) % 300); lo = YC.lorry(t.lorry); st = YC.STREAMS[t.stream]; var d = CS.dayDate(t.day); d.setHours(Math.floor(t.time / 60), t.time % 60); when = d.getTime(); size = 'As on ticket ' + t.id; signed = { name: 'Site contact', sample: true }; }
      var tip = t ? YC.TIPS[t.site] : YC.TIPS.yard;
      function bx(lbl, v) { return '<div class="yw-bx"><small>' + lbl + '</small>' + v + '</div>'; }
      modal(ic('certificate') + ' Waste transfer note ' + h(no), '<div class="yw" id="yWtnDoc"><div class="yw-hd"><img src="brand/logo.svg" alt="Demo Skip & Grab"><div><b>Waste transfer note</b><small>' + h(no) + ' · ' + new Date(when).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + CS.clock(when) + '</small></div></div>' +
        '<div class="yw-g">' + bx('A. The waste', '<b>' + h(st.n) + '</b><br>EWC ' + st.ewc + ' · ' + h(size) + (t ? '<br>' + t.net.toFixed(2) + ' tonnes net (ticket ' + h(t.id) + ')' : '') + '<br>Not hazardous') +
        bx('B. Where it came from', '<b>' + h(cust) + '</b><br>' + h(site)) +
        bx('C. Carrier', '<b>' + h(YC.CARRIER.name) + '</b><br>Waste carrier ' + YC.CARRIER.reg + (lo ? '<br>Vehicle ' + h(lo.reg) + ', driver ' + h(lo.driver) : '')) +
        bx('D. Where it went', '<b>' + h(tip.n) + '</b><br>Permit ' + h(tip.permit)) + '</div>' +
        '<div class="yw-sig"><div><small>Customer</small>' + (signed && signed.src ? '<img src="' + h(signed.src) + '" alt="Customer signature">' : '<img src="' + YC.sampleSig() + '" alt="Customer signature">') + '<span>' + h(signed && signed.name || 'Customer') + '</span></div><div><small>Driver</small><img src="' + YC.sampleSig('d') + '" alt="Driver signature"><span>' + h(lo ? lo.driver : 'Driver') + '</span></div></div>' +
        '<p class="yw-dec">I confirm I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of the Waste (England and Wales) Regulations 2011.</p></div>' +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Made by itself when the driver finished the job. Stored on the job, on the customer\'s own page and in the duty of care file.</p>',
        '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn" data-act="yWtnSend">' + ic('mail') + 'Email it to the customer</button><button class="btn pri" data-act="yPrint">' + ic('printer') + 'Print or save as PDF</button>', 'wide ywm');
    };
    A.yWtnSend = function () { toast('Waste transfer note emailed to the customer. Demo, nothing is sent', 'mail'); };
    A.yPrint = function () { document.body.classList.add('yprinting'); setTimeout(function () { try { window.print(); } catch (e) {} setTimeout(function () { document.body.classList.remove('yprinting'); }, 300); }, 50); };

    /* ======================================================================
       DAY PLAN: drag a job onto a lorry
       ====================================================================== */
    function movePlan(id, to) {
      var j = jobById(id); if (!j) return;
      if (j.status !== 'planned') { toast('That job has started, so it stays with its lorry', 'lock'); UI.render(); return; }
      var lo = to === 'none' ? null : YC.lorry(to);
      if (lo && !lorryFits(lo, j)) { toast(h(lo.reg) + ' is a ' + (lo.kind === 'skip' ? 'skip lorry' : lo.kind === 'roro' ? 'hook lift' : 'grab lorry') + '. ' + fitWhy(j) + ' Not moved.', 'alert'); UI.render(); return; }
      j.lorry = lo ? lo.id : null; j.manual = false; j.log.push({ at: Date.now(), t: lo ? 'Given to ' + lo.reg + ', ' + lo.driver : 'Taken off its lorry' }); Y().v++; save(); UI.render();
      toast(lo ? h(YC.whatShort(j)) + ' is on ' + h(lo.reg) + ' now. It shows on ' + h(lo.first) + '\'s phone straight away' : h(j.id) + ' is back in Unplanned', 'route');
    }
    V.plan = function () {
      var y = Y(), d = ui.yPlanDay == null ? 0 : ui.yPlanDay, t1 = CS.wd(1);
      function card(j) {
        var locked = j.status !== 'planned';
        return '<div class="ypc' + (locked ? ' locked' : '') + '" ' + (locked ? '' : 'draggable="true"') + ' data-pj="' + j.id + '"><button class="ypc-b" data-act="yJob" data-id="' + j.id + '"><span class="ypc-t"><b>' + YC.win(j) + '</b>' + (locked ? stTag(j) : '') + '</span><b>' + h(YC.whatShort(j)) + '</b><small>' + h(YC.custName(S(), j.cust)) + '</small><small>' + h(j.site.name) + '</small>' +
          '<span class="ypc-x"><span class="yewc">' + YC.STREAMS[j.stream].ewc + '</span>' + (j.permit ? '<span class="tag">Permit</span>' : '') + cashBadge(j) + '</span></button>' +
          (locked ? '' : '<label class="ypc-mv"><span>Move to</span><select class="ymove" data-id="' + j.id + '" aria-label="Move ' + j.id + ' to a lorry"><option value="none"' + (!j.lorry ? ' selected' : '') + '>Unplanned</option>' + YC.LORRIES.map(function (l) { return '<option value="' + l.id + '"' + (j.lorry === l.id ? ' selected' : '') + '>' + h(l.reg + ', ' + l.driver) + '</option>'; }).join('') + '</select></label>') + '</div>';
      }
      var un = y.jobs.filter(function (j) { return j.day === d && !j.lorry; }).sort(function (a, b) { return a.win[0] - b.win[0]; });
      var tray = '<section class="ycol none" data-col="none"><header><b>Unplanned</b><small>' + (un.length ? plural(un.length, 'job') + ' waiting. Drag each one onto a registration' : 'Every job is on a lorry. Drag one back here to take it off') + '</small></header><div class="ycol-b">' + un.map(card).join('') + '</div></section>';
      var groups = YC.GROUPS.map(function (g) {
        var L = YC.LORRIES.filter(function (l) { return l.kind === g[0]; });
        return '<div class="ygrp ygrp-' + g[0] + '" style="--n:' + L.length + '"><div class="ygrp-h">' + h(g[1]) + '</div><div class="ygrp-c">' + L.map(function (l) {
          var js = y.jobs.filter(function (j) { return j.day === d && j.lorry === l.id; }).sort(function (a, b) { return a.win[0] - b.win[0]; });
          var dn = js.filter(function (j) { return j.status === 'done'; }), open = js.filter(function (j) { return j.status !== 'done'; });
          return '<section class="ycol" data-col="' + l.id + '"><header><span class="yreg">' + h(l.reg) + '</span><small>' + h(l.driver) + '</small>' + (dn.length ? '<small class="ycap">' + plural(dn.length, 'job') + ' done today</small>' : '') + '</header><div class="ycol-b">' + open.map(card).join('') + (open.length ? '' : '<p class="ycol-e">Drop a job here</p>') + '</div></section>';
        }).join('') + '</div></div>';
      }).join('');
      return '<div class="ybar"><div class="seg">' + [[0, 'Today'], [t1, 'Tomorrow']].map(function (x) { return '<button data-act="yPlanDay" data-v="' + x[0] + '" class="' + (d === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="yhint">' + ic('route') + 'Drag a job onto a registration. Skips go on skip lorries, RoRos on the hook lift, grabs and muckaway on grab lorries.</span><span class="sp"></span><button class="btn pri" data-act="yBook">' + ic('plus') + 'New booking</button></div>' +
        '<div class="yplan2" id="yPlan">' + tray + '<div class="ygrps">' + groups + '</div></div>';
    };
    A.yPlanDay = function (el) { ui.yPlanDay = +el.dataset.v; UI.render(); };
    (function () {
      var vw = q('#view'), dj = null;
      vw.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('[data-pj]'); if (!c) return; dj = c.getAttribute('data-pj'); c.classList.add('ydrag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dj); } catch (x) {} });
      vw.addEventListener('dragend', function () { dj = null; qa('.ycol.ydrop,.ypc.ydrag').forEach(function (x) { x.classList.remove('ydrop', 'ydrag'); }); });
      vw.addEventListener('dragover', function (e) { if (!dj) return; var c = e.target.closest && e.target.closest('[data-col]'); if (!c) return; e.preventDefault(); qa('.ycol.ydrop').forEach(function (x) { if (x !== c) x.classList.remove('ydrop'); }); c.classList.add('ydrop'); });
      vw.addEventListener('drop', function (e) { if (!dj) return; var c = e.target.closest && e.target.closest('[data-col]'); if (!c) return; e.preventDefault(); var id = dj; dj = null; movePlan(id, c.getAttribute('data-col')); });
    })();

    /* ======================================================================
       SKIPS ON SITE: hire period, overdue, exchange or collect in one click
       ====================================================================== */
    function permitsSoon() { var y = Y(); return y.onsite.filter(function (o) { return o.permit && !o.booked && o.permit.to <= 3; }).concat(y.jobs.filter(function (j) { return j.permit && j.status !== 'done' && j.permit.to - j.day <= 3 && j.day >= 0 && j.permit.to <= 3; })); }
    V.skips = function () {
      var y = Y(), s = S(), f = ui.ySkF || 'all', os = y.onsite;
      var over = os.filter(function (o) { return -o.since > o.hire; }), dueT = os.filter(function (o) { return -o.since === o.hire; }), road = os.filter(function (o) { return o.permit; });
      var show = os.filter(function (o) { return f === 'all' || (f === 'over' && -o.since > o.hire) || (f === 'road' && o.permit); }).sort(function (a, b) { return (a.booked ? 1 : 0) - (b.booked ? 1 : 0) || a.since - b.since; });
      function chip(k, l, n) { return '<button class="ychip' + (f === k ? ' on' : '') + '" data-act="ySkF" data-v="' + k + '">' + l + ' <b>' + n + '</b></button>'; }
      return '<div class="ykpis"><div class="card kpi"><small>' + ic('skip') + 'Out on hire</small><b>' + os.length + '</b><span class="d">skips and RoRos</span></div><div class="card kpi"><small>' + ic('alert') + 'Over the hire period</small><b class="' + (over.length ? 'bad' : '') + '">' + over.length + '</b><span class="d">extra hire to charge, or swap them</span></div>' +
        '<div class="card kpi"><small>' + ic('clock') + 'Due back today</small><b>' + dueT.length + '</b><span class="d">14 days up today</span></div><div class="card kpi"><small>' + ic('certificate') + 'On the road</small><b>' + road.length + '</b><span class="d">with a council permit</span></div></div>' +
        '<div class="ychips">' + chip('all', 'All', os.length) + chip('over', 'Overdue', over.length) + chip('road', 'On the road', road.length) + '</div>' +
        '<div class="card ylist">' + show.map(function (o) {
          var days = -o.since, pct = Math.min(100, Math.round(days / o.hire * 100)), od = days > o.hire, due = days === o.hire;
          return '<div class="ysk' + (od ? ' od' : '') + (o.booked ? ' bk' : '') + '"><span class="ysk-n"><b>' + h(o.id) + '</b><small>' + o.size + (o.size >= 20 ? ' yd RoRo' : ' yard') + '</small></span>' +
            '<span class="ysk-m"><b>' + h(YC.custName(s, o.cust)) + '</b><small>' + h(o.site.name + ', ' + o.site.pc) + '</small></span>' +
            '<span class="ysk-h"><span class="yh-bar"><i style="width:' + pct + '%"></i></span><small>' + (od ? '<b class="bad">' + (days - o.hire) + ' day' + (days - o.hire === 1 ? '' : 's') + ' over</b> · ' : due ? '<b class="amber">Due back today</b> · ' : '') + days + ' of ' + o.hire + ' days</small>' + (o.permit ? '<small>' + ic('certificate') + 'Permit until ' + h(dayName(o.permit.to)) + '</small>' : '') + '</span>' +
            '<span class="ysk-a">' + (o.booked ? '<span class="tag ok">' + ic('check') + h(o.booked) + '</span>' : '<button class="btn sm" data-act="ySkip" data-k="exchange" data-id="' + o.id + '">' + ic('exchange') + 'Exchange</button><button class="btn sm" data-act="ySkip" data-k="collect" data-id="' + o.id + '">' + ic('truck') + 'Collection</button>') + '</span></div>';
        }).join('') + '</div><p class="muted yfoot">Hire runs from the day it was dropped. Anything past its hire period shows in red here and on Home, so the extra hire is charged or the skip comes back.</p>';
    };
    A.ySkF = function (el) { ui.ySkF = el.dataset.v; UI.render(); };
    A.ySkip = function (el) {
      var y = Y(), o = y.onsite.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!o || o.booked) return;
      var k = el.dataset.k, day = CS.wd(1), J0 = { type: k, size: o.size }, lo = suggest(J0, day), last = YC.forLorry(y, lo.id, day).pop(), w0 = last ? Math.min(960, last.win[1]) : 450;
      var id = 'DSG-' + (y.counters.job++), j = { id: id, day: day, lorry: lo.id, win: [w0, w0 + 60], type: k, cust: o.cust, site: o.site, lat: o.lat, lng: o.lng, size: o.size, loads: null, price: YC.priceFor(y, { type: k, size: o.size }), incl: YC.inclFor(y, { type: k, size: o.size }), stream: o.stream, place: o.place, permit: o.permit || null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: 'Skip ' + o.id, log: [{ at: Date.now(), t: (k === 'exchange' ? 'Exchange' : 'Collection') + ' booked from skips on site' }], isNew: true };
      y.jobs.push(j); o.booked = (k === 'exchange' ? 'Exchange ' : 'Collection ') + dayName(day).toLowerCase(); y.v++;
      y.texts.unshift({ at: Date.now(), job: id, to: YC.custName(S(), o.cust), text: 'Your ' + o.size + ' yard skip is booked for ' + (k === 'exchange' ? 'an exchange' : 'collection') + ' ' + dayName(day).toLowerCase() + ', ' + YC.hhmm(j.win[0]) + ' to ' + YC.hhmm(j.win[1]) + '.' });
      save(); UI.render();
      toast((k === 'exchange' ? 'Exchange' : 'Collection') + ' booked for ' + h(dayName(day).toLowerCase()) + ' on ' + h(lo.first) + '\'s lorry. Customer texted', k === 'exchange' ? 'exchange' : 'truck');
    };

    /* ======================================================================
       LIVE TRACKING: the map is kept between redraws so it never flickers
       ====================================================================== */
    function stateLine(y, l, w) {
      w = w || YC.where(y, l.id);
      if (w.state === 'onway') { var m = YC.etaMins(y, w.job); return 'On the way to ' + w.job.site.name.split(',').slice(-1)[0].trim() + ', about ' + m + ' min'; }
      if (w.state === 'onsite') return 'On site at ' + w.job.site.name.split(',').slice(-1)[0].trim() + ', ' + YC.whatShort(w.job);
      if (w.state === 'between') return 'Next: ' + YC.whatShort(w.job) + ' at ' + YC.hhmm(w.job.win[0]);
      if (w.state === 'returning') return 'Heading back to the yard';
      if (w.state === 'home') return 'Back at the yard, day done';
      return w.job ? 'At the yard, first job ' + YC.hhmm(w.job.win[0]) : 'At the yard';
    }
    var MAPBOX = null, MAP = null, LM = {}, JM = {}, mapV = -1, FALLBACK = false;
    function mapBox() {
      if (MAPBOX) return MAPBOX;
      MAPBOX = document.createElement('div'); MAPBOX.className = 'ymap'; MAPBOX.id = 'yMap';
      return MAPBOX;
    }
    function jobCol(j) { return j.status === 'done' ? '#16A34A' : j.status === 'onsite' ? '#2563EB' : j.status === 'onway' ? '#1F4FA8' : '#A1A1AA'; }
    function mapInit() {
      if (MAP || FALLBACK) return;
      if (!window.L) { FALLBACK = true; return; }
      try {
        MAP = window.L.map(MAPBOX, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
        var dark = (S().settings.theme === 'dark');
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(MAP);
        if (dark) MAPBOX.classList.add('dark');
        var yard = window.L.marker([YC.YARD.lat, YC.YARD.lng], { icon: window.L.divIcon({ className: 'yyard', html: '<span>' + ic('home') + '</span>', iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 500 }).addTo(MAP);
        yard.bindTooltip('Our yard', { direction: 'top', offset: [0, -14] });
        var pts = [[YC.YARD.lat, YC.YARD.lng]]; YC.today(Y()).forEach(function (j) { if (j.lorry) pts.push([j.lat, j.lng]); });
        MAP.fitBounds(pts, { padding: [28, 28] });
      } catch (e) { FALLBACK = true; MAP = null; }
    }
    function mapUpdate(force) {
      if (!MAPBOX || !document.body.contains(MAPBOX)) return;
      var y = Y();
      if (FALLBACK) { svgMap(y); return; }
      mapInit(); if (!MAP) { svgMap(y); return; }
      if (force || mapV !== y.v) {
        mapV = y.v;
        YC.today(y).forEach(function (j) {
          if (!j.lorry) { if (JM[j.id]) { MAP.removeLayer(JM[j.id]); delete JM[j.id]; } return; }
          var lo = YC.lorry(j.lorry);
          if (!JM[j.id]) { JM[j.id] = window.L.circleMarker([j.lat, j.lng], { radius: 7, weight: 3, color: lo.col, fillColor: jobCol(j), fillOpacity: 1 }).addTo(MAP); JM[j.id].on('click', function () { A.yJob({ dataset: { id: j.id } }); }); }
          JM[j.id].setStyle({ fillColor: jobCol(j), color: lo.col }); JM[j.id].bindTooltip(h(j.id + ', ' + YC.whatShort(j) + ', ' + (STAT[j.status] || STAT.planned)[0]) + (YC.isCash(j) ? '<br>' + YC.cashTag(j) : ''), { direction: 'top' });
        });
      }
      YC.LORRIES.forEach(function (l) {
        var w = YC.where(y, l.id);
        var lbl = window.DSGLABEL ? window.DSGLABEL(l, w, y) : h(l.reg);
        if (!LM[l.id]) { LM[l.id] = window.L.marker([w.lat, w.lng], { icon: window.L.divIcon({ className: 'ylm', html: lbl, iconSize: [190, 44], iconAnchor: [18, 22] }), zIndexOffset: 1000 }).addTo(MAP); LM[l.id]._lbl = lbl; LM[l.id].on('click', function () { ui.yLorry = l.id; ui.yFocusNow = l.id; UI.render(); }); }
        else if (LM[l.id]._lbl !== lbl) { LM[l.id]._lbl = lbl; LM[l.id].setIcon(window.L.divIcon({ className: 'ylm', html: lbl, iconSize: [190, 44], iconAnchor: [18, 22] })); }
        LM[l.id].setLatLng([w.lat, w.lng]);
      });
      if (ui.yFocusNow) { var lf = ui.yFocusNow; ui.yFocusNow = null; var ww = YC.where(y, lf); MAP.setView([ww.lat, ww.lng], 12, { animate: true }); }
    }
    function svgMap(y) {
      var pts = [[YC.YARD.lat, YC.YARD.lng]]; YC.today(y).forEach(function (j) { pts.push([j.lat, j.lng]); });
      var la0 = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - 0.03, la1 = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + 0.03, ln0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - 0.05, ln1 = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + 0.05;
      function X(l) { return (l - ln0) / (ln1 - ln0) * 800; } function Yy(l) { return (1 - (l - la0) / (la1 - la0)) * 520; }
      var o = '<svg viewBox="0 0 800 520" class="ymap-svg" role="img" aria-label="Map of today\'s jobs and lorries"><rect width="800" height="520" fill="var(--sunk)"/>';
      o += '<circle cx="' + X(YC.YARD.lng) + '" cy="' + Yy(YC.YARD.lat) + '" r="11" fill="#1A1A1A"/>';
      YC.today(y).forEach(function (j) { if (!j.lorry) return; o += '<circle cx="' + X(j.lng).toFixed(1) + '" cy="' + Yy(j.lat).toFixed(1) + '" r="6" fill="' + jobCol(j) + '" stroke="' + YC.lorry(j.lorry).col + '" stroke-width="3"/>'; });
      YC.LORRIES.forEach(function (l) { var w = YC.where(y, l.id); o += '<g transform="translate(' + X(w.lng).toFixed(1) + ' ' + Yy(w.lat).toFixed(1) + ')"><rect x="-14" y="-11" width="28" height="22" rx="7" fill="' + l.col + '"/><text y="5" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">' + l.id + '</text></g>'; });
      MAPBOX.innerHTML = o + '</svg>';
    }
    V.tracking = function () {
      var y = Y(), s = S();
      if (ui.yFocus) { ui.yFocusNow = ui.yFocus; ui.yFocus = null; }
      return '<div class="ytrack"><div class="ytrack-map" id="yMapSlot"></div><aside class="card ytrack-list"><div class="yh-rh"><h3>' + ic('truck') + 'Lorries</h3><span class="livepill"><i></i>Live</span></div>' +
        YC.LORRIES.map(function (l) {
          var list = YC.forLorry(y, l.id, 0), d = list.filter(function (j) { return j.status === 'done'; }).length, w = YC.where(y, l.id);
          return '<button class="ytl-r" data-act="yFocus" data-v="' + l.id + '"><span class="ylo" style="--lc:' + l.col + '"><i></i>' + h(l.n) + '</span><small class="muted">' + h(l.driver + ' · ' + l.reg) + '</small><span class="ytl-s">' + h(stateLine(y, l, w)) + '</span><span class="yh-bar"><i style="width:' + (list.length ? Math.round(d / list.length * 100) : 0) + '%;background:' + l.col + '"></i></span><small>' + d + ' of ' + list.length + ' jobs done</small></button>';
        }).join('') +
        '<div class="ytl-leg"><span><i style="background:#A1A1AA"></i>Booked</span><span><i style="background:#1F4FA8"></i>On the way</span><span><i style="background:#2563EB"></i>On site</span><span><i style="background:#16A34A"></i>Done</span></div>' +
        '<small class="muted ytl-note">Sample data: the lorries are simulated. Live, positions come from the driver app on their phone or from your existing vehicle trackers.</small></aside></div>' +
        '<div class="card ytexts"><div class="yh-rh"><h3>' + ic('message') + 'Texts to customers today</h3><small class="muted">"On my way" with an ETA, sent when the driver sets off</small></div>' +
        (y.texts.slice(0, 5).map(function (t) { return '<div class="ytx"><small>' + CS.clock(t.at) + ' · ' + h(t.to) + '</small><span>' + h(t.text) + '</span></div>'; }).join('') || '<p class="muted">None yet today.</p>') + '</div>';
    };
    A.yFocus = function (el) { ui.yFocus = el.dataset.v; if (ui.view !== 'tracking') go('tracking'); else UI.render(); };

    /* ======================================================================
       DRIVER APP inside the office: the phone page in a frame, kept between redraws
       ====================================================================== */
    var DRV = null, drvSrc = '';
    function drvFrame() {
      if (!DRV) { DRV = document.createElement('div'); DRV.className = 'yphone'; DRV.innerHTML = '<div class="yphone-in"><iframe id="yDrvFrame" title="Driver app" loading="eager"></iframe></div>'; }
      var want = 'driver.html?l=' + (ui.yDrv || 'L1') + '&embed=1', f = DRV.querySelector('iframe');
      if (drvSrc !== want) { drvSrc = want; f.src = want; }
      return DRV;
    }
    V.driver = function () {
      var y = Y(), cur = ui.yDrv || 'L1';
      return '<div class="ydrv"><div class="ydrv-txt"><h2>' + ic('mobile') + 'What your drivers see</h2><p>Each driver opens their own list on their phone. No training: the next job is at the top with one big button.</p>' +
        '<ul class="ydrv-l"><li>' + ic('route') + '<span><b>Today\'s jobs in order</b>, with the gate code, the waste and where it goes</span></li><li>' + ic('map-pin') + '<span><b>Navigate</b> opens their usual maps app on the site</span></li><li>' + ic('message') + '<span><b>On my way</b> texts the customer an ETA by itself</span></li><li>' + ic('eye') + '<span><b>A photo</b> on every drop and every collection</span></li><li>' + ic('pencil') + '<span><b>The customer signs</b> on the screen</span></li><li>' + ic('receipt') + '<span><b>Ticket and weight</b> typed in or read from a photo of the ticket</span></li></ul>' +
        '<div class="field"><label>Show the phone of</label><div class="ydrv-pick">' + YC.LORRIES.map(function (l) { return '<button class="ychip' + (cur === l.id ? ' on' : '') + '" data-act="yDrv" data-v="' + l.id + '"><span class="ylo" style="--lc:' + l.col + '"><i></i>' + h(l.first) + '</span></button>'; }).join('') + '</div></div>' +
        '<p class="muted" style="font-size:12.5px">Press the buttons on the phone. The office map, the day plan and live tracking update as the driver goes.</p>' +
        '<a class="btn" href="driver.html?l=' + cur + '" target="_blank" rel="noopener">' + ic('external') + 'Open it on its own</a></div><div class="ydrv-ph" id="yDrvSlot"></div></div>';
    };
    A.yDrv = function (el) { ui.yDrv = el.dataset.v; UI.render(); };
    /* put the kept map and phone back after every redraw */
    function reattach() {
      var ms = q('#yMapSlot'); if (ms) { var b = mapBox(); if (b.parentNode !== ms) { ms.appendChild(b); } setTimeout(function () { if (MAP) MAP.invalidateSize(); mapUpdate(true); }, 30); }
      placeDrv();
      drawMe();
    }
    /* the phone frame never moves in the page (moving a frame reloads it): it sits over its slot instead */
    function placeDrv() {
      var ds = q('#yDrvSlot'), main = q('.main');
      document.body.classList.toggle('ydrv-on', !!ds);
      if (!ds) { if (DRV) DRV.hidden = true; return; }
      var f = drvFrame(); if (f.parentNode !== main) main.appendChild(f);
      f.hidden = false; f.classList.add('yfloat');
      var r = ds.getBoundingClientRect(), m = main.getBoundingClientRect();
      var w = Math.max(280, Math.min(r.width, 390, m.width - 28)), l = Math.max(0, Math.min(r.left - m.left + (r.width - w) / 2, m.width - w - 14));
      f.style.width = w + 'px'; f.style.left = l + 'px'; f.style.top = (r.top - m.top) + 'px';
      ds.style.height = f.offsetHeight + 'px';
    }
    window.addEventListener('resize', function () { if (DRV && !DRV.hidden) placeDrv(); });
    new MutationObserver(reattach).observe(q('#view'), { childList: true });

    /* ======================================================================
       TICKETS AND WTNs
       ====================================================================== */
    V.tickets = function () {
      var y = Y(), s = S(), tab = ui.yTkTab || 'tickets', today = y.tickets.filter(function (t) { return t.day === 0; }), unm = y.tickets.filter(function (t) { return !t.matched; });
      var tn = today.reduce(function (a, t) { return a + (t.net || 0); }, 0);
      var o = '<div class="ykpis"><div class="card kpi"><small>' + ic('receipt') + 'Tickets today</small><b>' + today.length + '</b><span class="d">from the weighbridge and the drivers</span></div><div class="card kpi"><small>' + ic('stack') + 'Tonnes today</small><b>' + tn.toFixed(1) + '</b><span class="d">net, across both tip sites</span></div>' +
        '<div class="card kpi"><small>' + ic('alert') + 'To match</small><b class="' + (unm.length ? 'amber' : '') + '">' + unm.length + '</b><span class="d">read from a photo, no job found</span></div><div class="card kpi"><small>' + ic('certificate') + 'Transfer notes</small><b>' + y.jobs.filter(function (j) { return j.wtn; }).length + '</b><span class="d">made today, by themselves</span></div></div>' +
        '<div class="ybar"><div class="seg"><button data-act="yTkTab" data-v="tickets" class="' + (tab === 'tickets' ? 'on' : '') + '">Tip tickets</button><button data-act="yTkTab" data-v="wtn" class="' + (tab === 'wtn' ? 'on' : '') + '">Waste transfer notes</button></div></div>';
      if (tab === 'tickets') {
        var l = y.tickets.slice().sort(function (a, b) { return (a.matched ? 1 : 0) - (b.matched ? 1 : 0) || b.day - a.day || b.time - a.time; }).slice(0, 40);
        o += '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Ticket</th><th>When</th><th class="hide-sm">Tip site</th><th class="hide-sm">Lorry</th><th>Waste</th><th class="r">Net</th><th>Job</th></tr></thead><tbody>' + l.map(function (t) {
          var lo = YC.lorry(t.lorry);
          return '<tr class="' + (t.matched ? '' : 'yun') + '"><td><b>' + h(t.id) + '</b><small>' + h(t.read) + '</small></td><td>' + (t.day ? h(dayName(t.day)) : 'Today') + '<small>' + YC.hhmm(t.time) + '</small></td><td class="hide-sm">' + h(YC.TIPS[t.site].n.split(',')[0]) + '</td><td class="hide-sm">' + (lo ? h(lo.reg) : '') + '</td><td>' + h(YC.STREAMS[t.stream].n) + '<small>EWC ' + YC.STREAMS[t.stream].ewc + '</small></td><td class="r num"><b>' + t.net.toFixed(2) + ' t</b></td>' +
            '<td>' + (t.matched ? '<span class="tag ok">' + ic('check') + h(t.job) + '</span>' : '<button class="btn sm pri" data-act="yMatch" data-id="' + t.id + '">Match</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div></div><p class="muted yfoot">Weighbridge tickets come in by themselves. A driver can also snap the ticket at a tip, and the number and weight are read off the photo. Each ticket is matched to its job by lorry, time and site; the few it cannot place wait here for one tap.</p>';
      } else {
        var w = y.jobs.filter(function (j) { return j.wtn; }).sort(function (a, b) { return (b.at.done || 0) - (a.at.done || 0); });
        var hist = y.tickets.filter(function (t) { return t.day < 0; }).slice(-12).reverse();
        o += '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Note</th><th>When</th><th>Customer</th><th class="hide-sm">Waste</th><th class="r hide-sm">Tonnes</th><th></th></tr></thead><tbody>' +
          w.map(function (j) { var t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; return '<tr><td><b>' + h(j.wtn) + '</b><small>' + h(j.id) + '</small></td><td>Today<small>' + CS.clock(j.at.done) + '</small></td><td>' + h(YC.custName(s, j.cust)) + '<small>' + h(j.site.name) + '</small></td><td class="hide-sm">' + h(YC.STREAMS[j.stream].n) + '<small>EWC ' + YC.STREAMS[j.stream].ewc + '</small></td><td class="r num hide-sm">' + (t ? t.net.toFixed(2) : '') + '</td><td class="r"><button class="btn sm" data-act="yWtn" data-id="' + j.id + '">' + ic('eye') + 'View</button></td></tr>'; }).join('') +
          hist.map(function (t) { return '<tr><td><b>WTN-' + (4900 + YC.hash(t.id) % 300) + '</b><small>' + h(t.job || '') + '</small></td><td>' + h(dayName(t.day)) + '<small>' + YC.hhmm(t.time) + '</small></td><td>' + h(t.cust ? YC.custName(s, t.cust) : '') + '</td><td class="hide-sm">' + h(YC.STREAMS[t.stream].n) + '<small>EWC ' + YC.STREAMS[t.stream].ewc + '</small></td><td class="r num hide-sm">' + t.net.toFixed(2) + '</td><td class="r"><button class="btn sm" data-act="yWtn" data-t="' + t.id + '">' + ic('eye') + 'View</button></td></tr>'; }).join('') +
          '</tbody></table></div></div><p class="muted yfoot">A transfer note is made the moment the driver finishes a collection, exchange or grab, with the signature, photo, EWC code and weight. Nobody writes one by hand.</p>';
      }
      return o;
    };
    A.yTkTab = function (el) { ui.yTkTab = el.dataset.v; UI.render(); };
    A.yMatch = function (el) {
      var y = Y(), s = S(), t = y.tickets.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!t) return;
      var cands = y.jobs.filter(function (j) { return j.day === 0 && j.lorry === t.lorry && YC.TYPES[j.type].waste; }).concat(y.jobs.filter(function (j) { return j.day === 0 && j.lorry !== t.lorry && YC.TYPES[j.type].waste && j.stream === t.stream; })).slice(0, 6);
      modal(ic('receipt') + ' Match ticket ' + h(t.id), '<p class="muted" style="margin:0 0 10px">Read from a photo: ' + t.net.toFixed(2) + ' t net, ' + h(YC.STREAMS[t.stream].n) + ', ' + h(YC.TIPS[t.site].n) + ', ' + YC.hhmm(t.time) + '. The closest jobs first.</p>' +
        cands.map(function (j) { return '<button class="yrow" data-act="yMatchGo" data-t="' + t.id + '" data-id="' + j.id + '"><span class="ym"><b>' + h(j.id + ' · ' + YC.whatShort(j)) + '</b><small>' + h(YC.custName(s, j.cust)) + ', ' + h(j.site.name) + '</small></span><span class="yl">' + lorryTag(j.lorry) + stTag(j) + '</span></button>'; }).join(''), '<button class="btn" data-act="close">Cancel</button>');
    };
    A.yMatchGo = function (el) {
      var y = Y(), t = y.tickets.filter(function (x) { return x.id === el.dataset.t; })[0], j = jobById(el.dataset.id); if (!t || !j) return;
      t.matched = true; t.job = j.id; t.cust = j.cust; t.read = 'Photo, matched by ' + uName(meU()).split(' ')[0]; if (!j.ticket) j.ticket = t.id; y.v++; save(); A.close(); UI.render();
      toast('Ticket ' + h(t.id) + ' matched to ' + h(j.id) + '. The transfer note and Defra record use its weight', 'circle-check');
    };

    /* ======================================================================
       DEFRA DIGITAL WASTE TRACKING
       ====================================================================== */
    V.defra = function () {
      var y = Y(), s = S(), f = ui.yDfF || 'all', rows = YC.defraRows(s, y);
      var n = { all: rows.length, ready: 0, submitted: 0, error: 0 }; rows.forEach(function (r) { n[r.status]++; });
      var show = rows.filter(function (r) { return f === 'all' || r.status === f; }).sort(function (a, b) { var o = { error: 0, ready: 1, submitted: 2 }; return o[a.status] - o[b.status] || b.day - a.day || b.time - a.time; }).slice(0, 60);
      function chip(k, l) { return '<button class="ychip' + (f === k ? ' on' : '') + '" data-act="yDfF" data-v="' + k + '">' + l + ' <b>' + n[k] + '</b></button>'; }
      var TAG = { ready: '<span class="tag brand">Ready</span>', submitted: '<span class="tag ok">' + ic('check') + 'Submitted</span>', error: '<span class="tag bad">' + ic('alert') + 'Needs fixing</span>' };
      return '<div class="card ydf-hd"><span class="ydf-ic">' + ic('shield-check') + '</span><div><b>Ready for Defra\'s digital waste tracking</b><small>Every load received at your transfer station is prepared as it happens: carrier, vehicle, EWC code, weight, and the recovery code. Anything missing is flagged before it goes.</small></div></div>' +
        '<div class="ykpis three"><div class="card kpi"><small>Ready</small><b>' + n.ready + '</b><span class="d">checked, nothing missing</span></div><div class="card kpi"><small>Submitted</small><b>' + n.submitted + '</b><span class="d">this week</span></div><div class="card kpi"><small>Needs fixing</small><b class="' + (n.error ? 'bad' : '') + '">' + n.error + '</b><span class="d">fix before it can go</span></div></div>' +
        '<div class="ybar"><div class="ychips" style="margin:0">' + chip('all', 'All') + chip('ready', 'Ready') + chip('error', 'Needs fixing') + chip('submitted', 'Submitted') + '</div><span class="sp"></span><button class="btn pri" data-act="yDfExport"' + (n.ready ? '' : ' disabled') + '>' + ic('download') + 'Export the ' + n.ready + ' ready</button></div>' +
        '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Received</th><th>Carrier</th><th>Waste</th><th class="r">Tonnes</th><th class="hide-sm">Code</th><th>Status</th></tr></thead><tbody>' + show.map(function (r) {
          return '<tr class="' + (r.status === 'error' ? 'yun' : '') + '"><td><b>' + (r.day ? h(dayName(r.day)) : 'Today') + ' ' + YC.hhmm(r.time) + '</b><small>' + h(r.id) + '</small></td><td>' + h(r.carrier) + '<small>' + (r.reg ? h(r.reg) : '<b class="bad">No registration</b>') + ' · ' + h(r.veh) + '</small></td><td>' + h(r.desc) + '<small>EWC ' + r.ewc + '</small></td><td class="r num">' + (r.net != null ? r.net.toFixed(2) + (r.est ? '<small>estimate</small>' : '') : '<b class="bad">None</b>') + '</td><td class="hide-sm">' + r.code + '</td>' +
            '<td>' + TAG[r.status] + (r.status === 'error' ? '<small class="bad">' + h(r.why) + '</small><button class="btn sm" data-act="yDfFix" data-id="' + r.id + '">' + ic('pencil') + 'Fix</button>' : r.status === 'submitted' && r.sub ? '<small>' + h(r.sub) + '</small>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<p class="muted yfoot">In this demo nothing is sent. Today the export goes into Defra\'s service as a file upload, which is an accepted way to report. A direct link from here to Defra is planned, so it goes across by itself. Permitted sites report receipts now; carriers and brokers join from October 2027.</p>';
    };
    A.yDfF = function (el) { ui.yDfF = el.dataset.v; UI.render(); };
    A.yDfExport = function () {
      var y = Y(), s = S(), rows = YC.defraRows(s, y).filter(function (r) { return r.status === 'ready'; }); if (!rows.length) return;
      var csv = YC.defraCSV(rows);
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'defra-waste-receipts-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
      var D = y.defraState || (y.defraState = {}), at = 'Exported ' + CS.clock(Date.now()) + ' for upload';
      rows.forEach(function (r) { D[r.id] = { s: 'submitted', at: at }; }); y.v++; save(); UI.render();
      toast(plural(rows.length, 'record') + ' exported in Defra\'s format and marked submitted', 'download');
    };
    A.yDfFix = function (el) {
      var y = Y(), x = (y.incoming || []).filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
      var needReg = !x.reg, body = needReg ? '<p class="muted" style="margin:0 0 10px">' + h(x.carrier) + ' brought this in without a waste carrier number. Add it, or say why there is not one.</p><div class="field"><label for="yDfReg">Carrier registration</label><input id="yDfReg" placeholder="CBDU123456"></div><div class="field"><label for="yDfWhy">Or the reason there is not one</label><select id="yDfWhy"><option value="">Choose a reason</option><option>Carrying their own waste, not a business</option><option>One-off load</option></select></div>'
        : '<p class="muted" style="margin:0 0 10px">The weighbridge was down when ' + h(x.carrier) + ' tipped. Put in an estimate; it is marked as an estimate on the record.</p><div class="field"><label for="yDfT">Estimated tonnes</label><input id="yDfT" inputmode="decimal" value="1.90"></div>';
      modal(ic('pencil') + ' Fix ' + h(x.id), body, '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="yDfFixGo" data-id="' + x.id + '">' + ic('check') + 'Save, it is ready</button>');
    };
    A.yDfFixGo = function (el) {
      var y = Y(), x = (y.incoming || []).filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
      if (!x.reg) { var reg = (q('#yDfReg') || {}).value || '', why = (q('#yDfWhy') || {}).value || ''; if (!reg.trim() && !why) { toast('Add the carrier number, or choose a reason', 'alert'); return; } x.reg = reg.trim().toUpperCase() || ('None: ' + why); }
      else { var tn = parseFloat(((q('#yDfT') || {}).value || '').replace(/[^\d.]/g, '')); if (!(tn > 0)) { toast('Put an estimated weight in', 'alert'); return; } x.net = tn; x.est = true; }
      x.why = null; var D = y.defraState || (y.defraState = {}); delete D[x.id]; y.v++; save(); A.close(); UI.render(); toast(h(x.id) + ' fixed and ready for Defra', 'circle-check');
    };

    /* ======================================================================
       RECYCLING REPORT (company wide, and per customer)
       ====================================================================== */
    var REC = {
      months: [{ m: 'Jun', t: 1412, rec: 88.4 }, { m: 'Jul', t: 1538, rec: 89.1 }, { m: 'Aug', t: 1602, rec: 90.2 }, { m: 'Sep', t: 1575, rec: 90.8 }, { m: 'Oct', t: 1688, rec: 91.7 }, { m: 'Nov', t: 1302, rec: 92.6, mtd: true }],
      share: { soil: 31, hardcore: 18, mixed: 24, concrete: 9, wood: 6, green: 5, plaster: 3, metal: 1, house: 3 }
    };
    function custRec(c) { var n = YC.hash(c.id + 'r'); return { t: Math.round(20 + n % 160), rec: Math.round((84 + (n % 140) / 10) * 10) / 10 }; }
    V.recycling = function () {
      var s = S(), cur = REC.months[REC.months.length - 1], land = cur.t * (1 - cur.rec / 100), carbon = Math.round(cur.t * cur.rec / 100 * 0.07);
      var mx = Math.max.apply(null, REC.months.map(function (m) { return m.t; }));
      var custs = s.customers.map(function (c) { return { c: c, r: custRec(c) }; }).sort(function (a, b) { return b.r.t - a.r.t; }).slice(0, 10);
      return '<div class="ykpis"><div class="card kpi"><small>' + ic('stack') + 'Tonnes this month</small><b>' + cur.t.toLocaleString('en-GB') + '</b><span class="d">so far, from the tickets</span></div><div class="card kpi hero"><small>' + ic('leaf') + 'Recycled or recovered</small><b>' + cur.rec + '%</b><span class="d">kept out of landfill</span></div>' +
        '<div class="card kpi"><small>' + ic('trending-up') + 'To landfill</small><b>' + Math.round(land) + ' t</b><span class="d">' + (100 - cur.rec).toFixed(1) + '% of what came in</span></div><div class="card kpi"><small>' + ic('leaf') + 'Carbon saved</small><b>' + carbon + ' t</b><span class="d">CO2e, an estimate</span></div></div>' +
        '<div class="yrec"><section class="card"><div class="yh-rh"><h3>Recycling rate by month</h3></div><div class="ybars">' + REC.months.map(function (m) { return '<div class="ybar1"><span class="v">' + m.rec + '%</span><i style="height:' + Math.round(m.t / mx * 150) + 'px"></i><b>' + m.m + (m.mtd ? ' so far' : '') + '</b><small>' + m.t.toLocaleString('en-GB') + ' t</small></div>'; }).join('') + '</div></section>' +
        '<section class="card"><div class="yh-rh"><h3>By waste stream</h3></div><div class="ystreams">' + Object.keys(REC.share).map(function (k) { var st = YC.STREAMS[k], t = Math.round(cur.t * REC.share[k] / 100); return '<div><span><b>' + h(st.n) + '</b><small>EWC ' + st.ewc + ' · ' + t + ' t</small></span><span class="yh-bar"><i style="width:' + st.rec + '%"></i></span><b>' + st.rec + '%</b></div>'; }).join('') + '</div></section></div>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 0"><h3>Each customer\'s report</h3><small class="muted">Sent under your logo every month, or whenever they ask</small></div><div class="tw"><table class="t ytab"><thead><tr><th>Customer</th><th class="r">Tonnes</th><th class="r">Recycled</th><th class="r hide-sm">Carbon saved</th><th></th></tr></thead><tbody>' +
        custs.map(function (x) { return '<tr><td><b>' + h(x.c.name) + '</b><small>' + h(x.c.type) + '</small></td><td class="r num">' + x.r.t + '</td><td class="r num"><b>' + x.r.rec + '%</b></td><td class="r num hide-sm">' + (x.r.t * x.r.rec / 100 * 0.07).toFixed(1) + ' t</td><td class="r"><button class="btn sm" data-act="yRecRep" data-id="' + x.c.id + '">' + ic('eye') + 'Report</button></td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<p class="muted yfoot">Sample figures. Live, tonnes come from your own weighbridge tickets and the recycling rate from each tip site\'s own recovery figure. Carbon is an estimate using the government\'s conversion factors.</p>';
    };
    A.yRecRep = function (el) {
      var c = CS.cust(el.dataset.id); if (!c) return; var r = custRec(c), cur = REC.months[REC.months.length - 1];
      modal(ic('leaf') + ' ' + h(c.name) + ', waste report', '<div class="yw"><div class="yw-hd"><img src="brand/logo.svg" alt="Demo Skip & Grab"><div><b>Waste and recycling report</b><small>' + h(c.name) + ' · ' + cur.m + ' so far</small></div></div>' +
        '<div class="ykpis three" style="margin:12px 0"><div class="card kpi"><small>Tonnes</small><b>' + r.t + '</b></div><div class="card kpi"><small>Recycled</small><b>' + r.rec + '%</b></div><div class="card kpi"><small>Carbon saved</small><b>' + (r.t * r.rec / 100 * 0.07).toFixed(1) + ' t</b></div></div>' +
        '<div class="ystreams">' + ['soil', 'mixed', 'hardcore', 'wood'].map(function (k, i) { var st = YC.STREAMS[k], t = Math.round(r.t * [0.4, 0.3, 0.2, 0.1][i]); return '<div><span><b>' + h(st.n) + '</b><small>EWC ' + st.ewc + ' · ' + t + ' t</small></span><span class="yh-bar"><i style="width:' + st.rec + '%"></i></span><b>' + st.rec + '%</b></div>'; }).join('') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Every load is backed by a waste transfer note and a weighbridge ticket. Sample figures.</p></div>',
        '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn" data-act="yPrint">' + ic('printer') + 'Print</button><button class="btn pri" data-act="yRecSend" data-id="' + c.id + '">' + ic('mail') + 'Email it to ' + h(c.first || 'them') + '</button>', 'wide ywm');
    };
    A.yRecSend = function (el) { var c = CS.cust(el.dataset.id); A.close(); toast('Report emailed to ' + h(c ? c.contact : 'the customer') + '. Demo, nothing is sent', 'mail'); };

    /* ======================================================================
       CREDIT CONTROL, front and centre
       ====================================================================== */
    function chaseOf(i) {
      var y = Y(), late = -i.due; y.chase = y.chase || {}; var c = y.chase[i.id];
      var stage = c ? c.n : late >= 60 ? 3 : late >= 30 ? 2 : late >= 7 ? 1 : 0;
      return { n: stage, at: c ? c.at : null, next: stage >= 3 ? 'Ring them' : 'Reminder ' + (stage + 1) };
    }
    V.credit = function () {
      var s = S(), y = Y(), ag = aged(), st = stops(), cw = cashWeek(), auto = y.crAuto || (y.crAuto = { statements: true, reminders: true, stop: true });
      var late = s.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).sort(function (a, b) { return a.due - b.due; });
      var rows = s.customers.map(function (c) { return { c: c, a: agedC(c.id) }; }).filter(function (r) { return r.a.total || r.c.stop || r.c.limit; }).sort(function (a, b) { return (b.c.stop ? 1 : 0) - (a.c.stop ? 1 : 0) || b.a.worst - a.a.worst || b.a.total - a.a.total; });
      function bucket(lbl, v, cls) { var w = ag.total ? Math.max(v ? 4 : 0, Math.round(v / ag.total * 100)) : 0; return '<div class="yag ' + cls + '"><small>' + lbl + '</small><b>' + money(v) + '</b><span class="yh-bar"><i style="width:' + w + '%"></i></span></div>'; }
      function cell(v, bad) { return '<td class="r num hide-sm">' + (v ? '<span class="' + (bad ? 'bad' : '') + '">' + money(v) + '</span>' : '<span class="faint">0</span>') + '</td>'; }
      function sw(k, label, sub) { return '<div class="rowline"><div class="bd"><b>' + label + '</b><small>' + sub + '</small></div><button class="switch' + (auto[k] ? ' on' : '') + '" data-act="yCrAuto" data-k="' + k + '" aria-label="' + h(label) + '"></button></div>'; }
      return '<div class="ykpis"><div class="card kpi hero"><small>' + ic('pound') + 'Payments received this week</small><b id="yCash">' + money(sum(cw)) + '</b><span class="d">' + plural(cw.length, 'payment') + ' in the last 7 days</span></div>' +
        '<div class="card kpi"><small>' + ic('receipt') + 'Owed to you</small><b>' + money(ag.total) + '</b><span class="d">' + money(ag.cur) + ' not due yet</span></div>' +
        '<div class="card kpi"><small>' + ic('alert') + 'Overdue</small><b class="bad">' + money(ag.over) + '</b><span class="d">' + plural(late.length, 'invoice') + ' past their date</span></div>' +
        '<div class="card kpi"><small>' + ic('lock') + 'On stop</small><b class="' + (st.length ? 'bad' : '') + '" id="yStopN">' + st.length + '</b><span class="d">' + (st.length ? h(st.map(function (c) { return c.name; }).join(', ')) : 'nobody') + '</span></div></div>' +
        '<div class="card yaged"><div class="yh-rh"><h3>' + ic('clock') + 'Aged debt</h3><small class="muted">How late every unpaid invoice is</small></div><div class="yag-row">' + bucket('Not due yet', ag.cur, 'ok') + bucket('Up to 30 days late', ag.d30, 'a1') + bucket('31 to 60 days', ag.d60, 'a2') + bucket('61 to 90 days', ag.d90, 'a3') + bucket('Over 90 days', ag.d90p, 'a4') + '</div></div>' +
        '<div class="ycr2"><section class="card"><div class="yh-rh"><h3>' + ic('bell') + 'Chase list</h3><button class="btn sm pri" data-act="yChaseAll">' + ic('send') + 'Send every reminder due</button></div>' +
        late.map(function (i) { var c = CS.cust(i.cust), ch = chaseOf(i); return '<div class="ych"><span class="bd"><b>' + h(c.name) + (c.stop ? ' <span class="tag bad">' + ic('lock') + 'On stop</span>' : '') + '</b><small>' + h(i.id) + ' · ' + money(i.amount) + ' · <b class="' + (-i.due > 30 ? 'bad' : 'amber') + '">' + (-i.due) + ' days late</b> · ' + (ch.n ? plural(ch.n, 'reminder') + ' sent' + (ch.at ? ', last at ' + CS.clock(ch.at) : '') : 'no reminder yet') + '</small></span>' +
          (ch.n >= 3 ? '<a class="btn sm" href="tel:' + h(String(c.phone).replace(/\s/g, '')) + '">' + ic('phone') + 'Ring</a>' : '<button class="btn sm" data-act="yChase" data-id="' + i.id + '">' + ic('mail') + 'Send ' + h(ch.next.toLowerCase()) + '</button>') + '</div>'; }).join('') + '</section>' +
        '<section class="card"><div class="yh-rh"><h3>' + ic('refresh') + 'Runs by itself</h3><button class="btn sm" data-act="yStatements">' + ic('send') + 'Send statements now</button></div>' +
        sw('statements', 'Statements on the 1st', 'Every account with a balance gets their statement by email on the 1st of the month') +
        sw('reminders', 'Reminders at 7, 30 and 60 days', 'A polite one, a firmer one, then a final one with the statement attached') +
        sw('stop', 'Suggest stop at 60 days', 'Asks you first. Nobody is put on stop without you deciding') + '</section></div>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 0"><h3>' + ic('lock') + 'Every account</h3><small class="muted">New bookings warn you, and ask twice, if a customer is on stop</small></div><div class="tw"><table class="t ytab"><thead><tr><th>Customer</th><th class="r hide-sm">Limit</th><th class="r">Owed</th><th class="r hide-sm">Not due</th><th class="r hide-sm">30 days</th><th class="r hide-sm">60 days</th><th class="r hide-sm">90+ days</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var c = r.c, a = r.a, over = c.limit && a.total > c.limit;
          return '<tr class="' + (c.stop ? 'ystop' : '') + '"><td><b class="click" data-act="openCust" data-id="' + c.id + '">' + h(c.name) + '</b>' + (c.stop ? '<span class="tag bad">' + ic('lock') + 'On stop</span>' : over ? '<span class="tag amber">Over limit</span>' : '') + '<small>' + h(c.terms) + '</small></td><td class="r num hide-sm">' + (c.limit ? money(c.limit) : '<span class="faint">Card</span>') + '</td><td class="r num"><b>' + money(a.total) + '</b></td>' +
            cell(a.cur) + cell(a.d30, true) + cell(a.d60, true) + cell(a.d90 + a.d90p, true) +
            '<td class="r"><div class="row" style="justify-content:flex-end;gap:6px">' + (a.total ? '<button class="btn sm hide-sm" data-act="statement" data-id="' + c.id + '">' + ic('receipt') + 'Statement</button>' : '') + '<button class="btn sm' + (c.stop ? ' pri' : '') + '" data-act="stopToggle" data-id="' + c.id + '" aria-label="' + (c.stop ? 'Take ' + h(c.name) + ' off stop' : 'Put ' + h(c.name) + ' on stop') + '">' + ic(c.stop ? 'check' : 'lock') + '<span class="hide-sm">' + (c.stop ? 'Take off stop' : 'Put on stop') + '</span></button></div></td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('circle-check') + 'Paid this week</h3></div>' + cw.sort(function (a, b) { return b.paidDay - a.paidDay; }).map(function (i) { var c = CS.cust(i.cust); return '<div class="ych"><span class="bd"><b>' + h(c ? c.name : '') + '</b><small>' + h(i.id) + ' · ' + h(dayName(i.paidDay)) + '</small></span><b class="ok">' + money(i.amount) + '</b></div>'; }).join('') + '</div>';
    };
    A.yCrAuto = function (el) { var y = Y(); y.crAuto = y.crAuto || {}; y.crAuto[el.dataset.k] = !y.crAuto[el.dataset.k]; save(); UI.render(); toast(y.crAuto[el.dataset.k] ? 'Switched on' : 'Switched off', 'refresh'); };
    A.yChase = function (el) {
      var y = Y(), i = CS.inv(el.dataset.id); if (!i) return; var ch = chaseOf(i); y.chase[i.id] = { n: ch.n + 1, at: Date.now() }; save(); UI.render();
      toast(h(ch.next) + ' emailed to ' + h(CS.cust(i.cust).name) + ' for ' + h(i.id) + ', statement attached. Demo, nothing is sent', 'mail');
    };
    A.yChaseAll = function () {
      var y = Y(), n = 0; S().invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).forEach(function (i) { var ch = chaseOf(i); if (ch.n < 3) { y.chase[i.id] = { n: ch.n + 1, at: Date.now() }; n++; } });
      save(); UI.render(); toast(plural(n, 'reminder') + ' sent, each with the statement attached. Demo, nothing is sent', 'send');
    };
    A.yStatements = function () { var n = S().customers.filter(function (c) { return agedC(c.id).total; }).length; toast(plural(n, 'statement') + ' emailed to every account with a balance. Demo, nothing is sent', 'send'); };

    /* ======================================================================
       SCOREBOARD with commission
       ====================================================================== */
    function office() {
      var s = S(), y = Y(), qs = s.quotes, js = s.jobs, comm = y.comm || {};
      function sales(o) { var sent = qs.filter(function (x) { return x.owner === o && x.status !== 'draft'; }), won = sent.filter(function (x) { return x.status === 'won'; }), mine = js.filter(function (j) { return j.owner === o && j.day <= 0 && j.day >= -6; }); return { sent: sent.length, won: won.length, orders: mine.length + won.length * 2, rev: sum(mine, function (j) { return j.sell; }) + 2400, gp: sum(mine, function (j) { return j.sell - j.cost; }) + 760 }; }
      var L = [
        { k: 'sam', n: CS.bde(), r: 'Sales', c: '#52525B', s: sales('sam'), rate: comm.sam != null ? comm.sam : 10 },
        { k: 'dave', n: 'Dave Archer', r: 'Director', c: '#1F4FA8', s: sales('dave'), rate: null },
        { k: 'ellie', n: 'Ellie Ward', r: 'Office', c: '#0E9F6E', s: { sent: 14, won: 9, orders: 31, rev: 6240, gp: 2010 }, rate: comm.ellie != null ? comm.ellie : 3 },
        { k: 'kate', n: 'Kate Morris', r: 'Accounts', c: '#2563EB', s: { sent: 0, won: 0, orders: 4, rev: 820, gp: 260 }, rate: comm.kate != null ? comm.kate : 0 }
      ];
      L.forEach(function (p) { p.com = p.rate ? p.s.gp * p.rate / 100 : 0; });
      return L.sort(function (a, b) { return b.s.gp - a.s.gp; });
    }
    function drivers() {
      var y = Y(); return YC.LORRIES.map(function (l) {
        var t = YC.forLorry(y, l.id, 0), d = t.filter(function (j) { return j.status === 'done'; }), tn = y.tickets.filter(function (x) { return x.day === 0 && x.lorry === l.id; }).reduce(function (a, x) { return a + x.net; }, 0);
        var n = YC.hash(l.id); return { l: l, first: l.first, today: d.length, left: t.length - d.length, avg: Math.round((4 + n % 3 + (l.kind === 'skip' ? 1.6 : 0)) * 10) / 10, onTime: 91 + n % 8, tn: tn };
      }).sort(function (a, b) { return b.today - a.today || b.avg - a.avg; });
    }
    function medal(i) { return '<span class="ymed m' + i + '">' + (i + 1) + '</span>'; }
    V.scoreboard = function () {
      var tab = ui.yScTab || 'office';
      var o = '<div class="ybar"><div class="seg"><button data-act="yScTab" data-v="office" class="' + (tab === 'office' ? 'on' : '') + '">Office and sales</button><button data-act="yScTab" data-v="drivers" class="' + (tab === 'drivers' ? 'on' : '') + '">Drivers</button></div><span class="yhint">' + ic('calendar') + 'This week, Monday to today</span></div>';
      if (tab === 'office') {
        var L = office();
        o += '<div class="card"><div class="tw"><table class="t ytab ylg"><thead><tr><th></th><th>Person</th><th class="r hide-sm">Quotes sent</th><th class="r">Won</th><th class="r hide-sm">Orders</th><th class="r hide-sm">Revenue</th><th class="r">Gross profit</th><th class="r">Commission</th></tr></thead><tbody>' +
          L.map(function (p, i) { return '<tr><td>' + medal(i) + '</td><td><b>' + h(p.n) + '</b><small>' + h(p.r) + '</small></td><td class="r num hide-sm">' + p.s.sent + '</td><td class="r num">' + p.s.won + '</td><td class="r num hide-sm">' + p.s.orders + '</td><td class="r num hide-sm">' + money(p.s.rev) + '</td><td class="r num"><b>' + money(p.s.gp) + '</b></td>' +
            '<td class="r num">' + (p.rate == null ? '<span class="faint">Director</span>' : '<b>' + money(p.com) + '</b><label class="yrate"><input class="ycomm" data-k="' + p.k + '" type="number" min="0" max="50" value="' + p.rate + '" aria-label="Commission rate for ' + h(p.n) + '">% of GP</label>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
          '<p class="muted yfoot">Every quote, order and invoice is counted against whoever did it. Commission is worked out for you from the gross profit on what each person brings in, at the rate you set here. Each person sees their own line; you see everyone. Sample figures.</p>';
      } else {
        var D = drivers();
        o += '<div class="ydl">' + D.map(function (d, i) { return '<div class="card ydc">' + medal(i) + '<span class="ylo" style="--lc:' + d.l.col + '"><i></i>' + h(d.l.driver) + '</span><small class="muted">' + h(d.l.reg) + '</small><div class="ydc-n"><div><b>' + d.today + '</b><small>jobs done today</small></div><div><b>' + d.avg + '</b><small>a day this week</small></div><div><b>' + d.onTime + '%</b><small>on time</small></div><div><b>' + d.tn.toFixed(1) + ' t</b><small>tipped today</small></div></div><small class="muted">' + (d.left ? d.left + ' still to do today' : 'Day done') + ' · every job with a photo and signature</small></div>'; }).join('') + '</div>' +
          '<p class="muted yfoot">Jobs and tonnes come straight from the driver app and the tickets as the day goes. On time means done inside the window the customer was given.</p>';
      }
      return o;
    };
    A.yScTab = function (el) { ui.yScTab = el.dataset.v; UI.render(); };

    /* B opens a new booking from anywhere */
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'b' || e.key === 'B') && !q('#layer').innerHTML) { e.preventDefault(); A.yBook(); }
    });

    /* ======================================================================
       REPORTED PROBLEMS (from the assistant)
       ====================================================================== */
    function problems() { var y = Y(); if (!y.problemsSeeded) { y.problemsSeeded = true; y.problems.push({ id: 'P-101', at: Date.now() - 3 * 86400000, by: 'Ellie Ward', text: 'The ticket photo came out upside down on Darren\'s phone', status: 'Fixed the same day' }); } return y.problems; }
    V.problems = function () {
      var l = problems().slice().sort(function (a, b) { return b.at - a.at; });
      return '<div class="card ydf-hd"><span class="ydf-ic">' + ic('alert') + '</span><div><b>Something not right? Tell the assistant</b><small>Describe it in your own words. It goes straight to Jack with the screen and the details. Same-day fix, or that month is free.</small></div><span class="sp"></span><button class="btn pri" data-act="yProblem">' + ic('message') + 'Report a problem</button></div>' +
        '<div class="card ylist">' + l.map(function (p) { return '<div class="ych"><span class="bd"><b>' + h(p.text) + '</b><small>' + h(p.id) + ' · ' + h(p.by) + ' · ' + new Date(p.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + CS.clock(p.at) + '</small></span><span class="tag ' + (/Fixed/.test(p.status) ? 'ok' : 'brand') + '">' + h(p.status) + '</span></div>'; }).join('') + '</div>';
    };
    A.yProblem = function () { if (window.DSGSK && window.DSGSK.problem) window.DSGSK.problem(); };

    /* ======================================================================
       The assistant's answers about the yard
       ====================================================================== */
    window.DSGY = {
      logProblem: function (text) { var y = Y(); problems(); var p = { id: 'P-' + (102 + y.problems.length), at: Date.now(), by: uName(meU()), text: text, status: 'Sent to Jack' }; y.problems.push(p); y.v++; save(); if (ui.view === 'problems') UI.render(); return p; },
      answer: function (qq) {
        var lo = qq.toLowerCase(), y = Y(), s = S();
        function rows(r) { return '<div class="sk-rows">' + r.map(function (x) { return '<div class="sk-row"><span class="bd"><b>' + h(x[0]) + '</b><small>' + h(x[1]) + '</small></span>' + (x[2] ? '<span class="v">' + h(x[2]) + '</span>' : '') + '</div>'; }).join('') + '</div>'; }
        function btn(v, l) { return '<div class="sk-acts"><button class="btn sm pri" data-act="go" data-v="' + v + '">' + h(l) + ic('arrow-right') + '</button></div>'; }
        if (/overdue|over.*hire|skips? (out|on site)|due back/.test(lo) && /skip/.test(lo)) {
          var od = y.onsite.filter(function (o) { return !o.booked && -o.since > o.hire; });
          return '<p>' + (od.length ? plural(od.length, 'skip is', 'skips are') + ' past the 14 day hire.' : 'No skips are overdue.') + '</p>' + rows(od.slice(0, 5).map(function (o) { return [o.id + ', ' + o.size + ' yard', YC.custName(s, o.cust) + ', ' + o.site.name, (-o.since - o.hire) + ' days over']; })) + btn('skips', 'Exchange or collect them');
        }
        var lm = /(ds\s?\d\d\s?[a-z]{3}|skip lorry ?[123]|hook|grab ?[12]|lorry ?[123]|wayne|darren|marcus|jason|ricky|callum)/.exec(lo);
        if (lm || /where.*(lorr|driver|grab)/.test(lo)) {
          var L0 = YC.LORRIES.filter(function (l) { var k = lm ? lm[1].replace(/\s/g, '') : ''; return !k || l.reg.toLowerCase().replace(/\s/g, '') === k || l.n.toLowerCase().replace(/\s/g, '').indexOf(k.replace('lorry', '')) >= 0 || l.first.toLowerCase() === k || (k === 'hook' && l.kind === 'roro'); });
          if (!L0.length) L0 = YC.LORRIES;
          return '<p>Here is where ' + (L0.length === 1 ? 'it is' : 'they are') + ' right now.</p>' + rows(L0.map(function (l) { var w = YC.where(y, l.id); return [l.reg + ', ' + l.driver, stateLine(y, l, w), '']; })) + btn('tracking', 'Open the map');
        }
        if (/owe|owing|debt|overdue|unpaid|who.*pay/.test(lo)) {
          var r = s.customers.map(function (c) { return { c: c, a: agedC(c.id) }; }).filter(function (x) { return x.a.total - x.a.cur > 0; }).sort(function (a, b) { return (b.a.total - b.a.cur) - (a.a.total - a.a.cur); });
          return '<p>' + money(aged().over) + ' is overdue across ' + plural(r.length, 'customer') + '.</p>' + rows(r.slice(0, 5).map(function (x) { return [x.c.name + (x.c.stop ? ' (on stop)' : ''), 'Oldest ' + x.a.worst + ' days late', money(x.a.total - x.a.cur)]; })) + btn('credit', 'Open credit control');
        }
        if (/defra|waste tracking/.test(lo)) { var dr = YC.defraRows(s, y), n1 = dr.filter(function (x) { return x.status === 'ready'; }).length, n2 = dr.filter(function (x) { return x.status === 'error'; }).length; return '<p>' + plural(n1, 'record is', 'records are') + ' ready for Defra\'s digital waste tracking' + (n2 ? ', and ' + plural(n2, 'needs', 'need') + ' fixing first.' : '.') + '</p>' + btn('defra', 'Open Defra tracking'); }
        if (/recycl|landfill|diversion|carbon/.test(lo)) { var cu = REC.months[REC.months.length - 1]; return '<p>' + cu.rec + '% recycled or recovered this month so far, from ' + cu.t.toLocaleString('en-GB') + ' tonnes. Sample figures.</p>' + btn('recycling', 'Open the recycling report'); }
        if (/permit/.test(lo)) { var ps = y.onsite.filter(function (o) { return o.permit; }); return '<p>' + plural(ps.length, 'skip is', 'skips are') + ' on the road with a council permit.</p>' + rows(ps.slice(0, 5).map(function (o) { return [o.id + ', ' + o.site.name, o.permit.council, 'until ' + dayName(o.permit.to)]; })) + btn('skips', 'See skips on site'); }
        if (/(how many|jobs?).*(today|on)|today.*jobs/.test(lo)) { var t0 = YC.today(y), d = t0.filter(function (j) { return j.status === 'done'; }).length; return '<p>' + t0.length + ' jobs today, ' + d + ' done and ' + (t0.length - d) + ' to go.</p>' + btn('plan', 'Open the day plan'); }
        if (/roro|extra weight|overweight|over weight|tonnage/.test(lo)) { var ot = overTickets(); return '<p>' + (ot.length ? plural(ot.length, 'RoRo is', 'RoRos are') + ' over the tonnage included, with the invoice ready to send.' : 'No RoRo is over its tonnage right now.') + '</p>' + rows(ot.slice(0, 4).map(function (t) { return [t.job + ', ' + YC.custName(s, t.cust), t.net.toFixed(2) + ' t, ' + t.over.over.toFixed(2) + ' t over', money(t.over.amount, true) + ' + VAT']; })) + btn('tickets', 'Open the weighbridge'); }
        if (/ticket|weighbridge|wtn|transfer note/.test(lo)) { var um = y.tickets.filter(function (t) { return !t.matched; }).length; return '<p>' + plural(y.tickets.filter(function (t) { return t.day === 0; }).length, 'ticket') + ' today, ' + um + ' waiting to be matched. Every finished collection already has its transfer note.</p>' + btn('tickets', 'Open tickets and WTNs'); }
        return null;
      }
    };

    /* ======================================================================
       The simulation: lorries drive, stop and finish. The screens follow.
       ====================================================================== */
    var LIVEV = { home: 1, plan: 1, tracking: 1, bookings: 1, skips: 0, tickets: 1, defra: 1, scoreboard: 1 };
    var lastV = -1;
    setInterval(function () {
      var s = S(); if (!s) return; var y = Y(), ev = YC.tick(s, y, null, q('#yDrvPop') || ui.view === 'driver' ? ui.yDrv : null);
      if (ev.length) {
        save();
        ev.forEach(function (e) {
          var nm = e.j.site.name.split(',').slice(-1)[0].trim();
          if (e.k === 'onway' && ui.view === 'tracking') toast(h(e.lo.first) + ' is on his way to ' + h(nm) + '. ETA text sent to ' + h(YC.custName(s, e.j.cust)), 'message');
          if (e.k === 'done' && (ui.view === 'tracking' || ui.view === 'plan')) toast(h(e.lo.first) + ' finished ' + h(YC.whatShort(e.j)) + ' at ' + h(nm) + (e.j.wtn ? '. Transfer note made' : ''), 'circle-check');
        });
      }
      if (y.v !== lastV) {
        lastV = y.v;
        var busy = q('#layer') && q('#layer').innerHTML, ae = document.activeElement, typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA');
        if (LIVEV[ui.view] && !busy && !typing && !document.querySelector('.ydrag')) UI.render();
      }
      if (ui.view === 'tracking') mapUpdate(false);
    }, 1000);


    /* ======================================================================
       PRICE LIST: skips, RoRos with tonnage included and the over rate, grabs, muckaway
       ====================================================================== */
    V.prices = function () {
      var P = YC.prices(Y());
      function inp(k, v, lbl, w) { return '<label class="ypl-in"><span>£</span><input class="yplin" data-k="' + k + '" inputmode="decimal" value="' + v + '" aria-label="' + h(lbl) + '"' + (w ? ' style="width:' + w + 'px"' : '') + '></label>'; }
      return '<div class="ypl">' +
        '<section class="card"><div class="yh-rh"><h3>' + ic('skip') + 'Skips</h3><small class="muted">' + P.hireDays + ' days hire included</small></div><div class="ypl-grid">' +
        YC.SIZES.map(function (z) { return '<div class="ypl-c"><b>' + z + ' yard</b>' + inp('skip.' + z, P.skip[z], z + ' yard skip price') + '</div>'; }).join('') + '</div></section>' +
        '<section class="card" id="yRoroList"><div class="yh-rh"><h3>' + ic('truck') + 'RoRos</h3><small class="muted">Price, and the tonnage it includes</small></div>' +
        '<div class="tw"><table class="t ytab"><thead><tr><th>Size</th><th>Tonnage included</th><th>Price</th></tr></thead><tbody>' +
        YC.RORO_SIZES.map(function (z) { var r = P.roro[z]; return '<tr><td><b>' + z + ' yard RoRo</b></td><td><label class="ypl-in"><input class="yplin" data-k="roro.' + z + '.incl" inputmode="decimal" value="' + r.incl + '" aria-label="' + z + ' yard tonnes included" style="width:56px"><span>t included</span></label></td><td>' + inp('roro.' + z + '.price', r.price, z + ' yard RoRo price') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="ypl-over"><span><b>Over the allowance</b><small>Charged per tonne from the weighbridge ticket, and invoiced in one tap</small></span>' + inp('overRate', P.overRate, 'Over rate per tonne', 70) + '<span class="muted">a tonne</span></div></section>' +
        '<section class="card"><div class="yh-rh"><h3>' + ic('backhoe') + 'Grab and muckaway</h3><small class="muted">8-wheeler, about ' + YC.LOAD_T + ' tonnes a load</small></div><div class="ypl-grid two"><div class="ypl-c"><b>Grab, per load</b>' + inp('grab', P.grab, 'Grab price per load') + '</div><div class="ypl-c"><b>Muckaway, per load</b>' + inp('muck', P.muck, 'Muckaway price per load') + '</div></div></section>' +
        '</div><p class="muted yfoot">All prices are ex VAT and sample figures. Change one and every new booking uses it straight away. Jobs already booked keep their price.</p>';
    };
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el.classList || !el.classList.contains('yplin')) return;
      var v = parseFloat(String(el.value).replace(/[^\d.]/g, '')); if (!(v >= 0)) { UI.render(); return; }
      var P = YC.prices(Y()), path = el.dataset.k.split('.'), o = P; for (var i = 0; i < path.length - 1; i++) o = o[path[i]];
      o[path[path.length - 1]] = v; save(); toast('Price list saved. New bookings use it straight away', 'pound');
    });

    /* ======================================================================
       WEIGHBRIDGE: a RoRo weighs in, the plate is read, matched to its job, extra weight invoiced in one tap
       ====================================================================== */
    function overTickets() { return Y().tickets.filter(function (t) { return t.over && t.over.status === 'pending'; }).sort(function (a, b) { return (b.onBridge || 0) - (a.onBridge || 0); }); }
    function plate(reg) { return '<span class="yplate">' + h(reg) + '</span>'; }
    function overMsg(t, j) {
      var c = CS.cust(j.cust), first = c ? (c.first || String(c.contact).split(' ')[0]) : YC.custFirst(S(), j.cust);
      if (t.over && t.over.msg != null) return t.over.msg;
      return 'Hi ' + first + ', the ' + j.size + ' yard RoRo from ' + j.site.name + ' came in at ' + t.net.toFixed(2) + ' tonnes on the weighbridge, so ' + t.over.over.toFixed(2) + ' over the ' + t.over.incl + ' included. That\'s ' + money(t.over.amount, true) + ' + VAT for the extra weight, ticket and invoice attached. Cheers, Dave';
    }
    function bridgeCard() {
      var L = overTickets(), y = Y(), s = S();
      var head = '<div class="yh-rh"><h3>' + ic('stack') + 'Weighbridge</h3><button class="btn sm" data-act="yWeigh">' + ic('truck') + 'Weigh a lorry in</button></div>';
      if (!L.length) {
        var last = y.tickets.filter(function (t) { return t.over && t.over.status === 'sent'; }).pop();
        return '<section class="card ywb" id="yBridge">' + head + (last ? '<div class="ywb-done">' + ic('circle-check') + '<span><b>Extra weight invoiced.</b> ' + h(last.over.inv) + ' sent to ' + h(YC.custName(s, last.cust)) + ', ' + money(last.over.amount * 1.2, true) + ' with VAT, ticket ' + h(last.id) + ' attached. On the job and in the inbox.</span></div>' : '<p class="muted" style="margin:0">Nothing on the bridge. When a RoRo comes back over its tonnage, it shows here with the invoice ready to send.</p>') + '</section>';
      }
      var t = L[0], j = jobById(t.job), lo = YC.lorry(t.lorry), c = YC.custName(s, t.cust), ov = t.over, tare = t.tare != null ? t.tare : Math.round((t.gross - t.net) * 100) / 100;
      var ch = CS.cust(t.cust) && CS.cust(t.cust).phone ? 'WhatsApp' : 'Email';
      return '<section class="card ywb" id="yBridge">' + head +
        '<div class="ywb-top">' + plate(lo ? lo.reg : '') + '<div><b>Number plate read: ' + h(lo ? lo.reg : '') + '</b><small>' + ic('check') + 'Matched to ' + h(t.job) + ', ' + h(YC.what(j).replace(/^./, function (x) { return x.toLowerCase(); })) + ' for ' + h(c) + ', by lorry, time and site</small></div></div>' +
        '<div class="ywb-figs"><div><small>Gross</small><b>' + t.gross.toFixed(2) + ' t</b></div><div><small>Tare</small><b>' + tare.toFixed(2) + ' t</b></div><div><small>Net</small><b>' + t.net.toFixed(2) + ' t</b></div><div><small>Included</small><b>' + ov.incl + ' t</b></div><div class="bad"><small>Over</small><b>' + ov.over.toFixed(2) + ' t</b></div></div>' +
        '<p class="ywb-q" id="yOverQ">' + h((lo ? lo.reg : '') + ' from ' + t.job + ' for ' + c + ' came in at ' + t.net.toFixed(2) + ' t, ' + ov.over.toFixed(2) + ' t over. Send ' + c + ' the invoice for the extra weight?') + '</p>' +
        '<div class="ywb-sum" id="yOverSum"><span>' + ov.over.toFixed(2) + ' t x ' + money(ov.rate) + '</span><span>' + money(ov.amount, true) + '</span><span>VAT</span><span>' + money(ov.vat, true) + '</span><b>Total</b><b>' + money(ov.amount + ov.vat, true) + '</b></div>' +
        '<div class="field" style="margin:12px 0 0"><label for="yOverMsg">' + ch + ' to ' + h(c) + ', with the invoice and ticket ' + h(t.id) + ' attached</label><textarea id="yOverMsg" rows="3">' + h(overMsg(t, j)) + '</textarea></div>' +
        '<div class="ywb-acts"><button class="btn" data-act="yOverHold" data-id="' + t.id + '">Not now</button><button class="btn pri lg" data-act="yOverSend" data-id="' + t.id + '" id="yOverSend">' + ic('send') + 'Yes, send the invoice</button></div>' +
        (L.length > 1 ? '<small class="muted">' + plural(L.length - 1, 'more RoRo') + ' over the allowance after this one</small>' : '') + '</section>';
    }
    document.addEventListener('input', function (e) { if (e.target.id !== 'yOverMsg') return; var t = overTickets()[0]; if (t) { t.over.msg = e.target.value; save(); } });
    window.DSGBRIDGE = bridgeCard;
    var tk0 = V.tickets;
    V.tickets = function () { return bridgeCard() + tk0.apply(this, arguments); };
    A.yOverSend = function (el) {
      var y = Y(), s = S(), t = y.tickets.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!t || !t.over || t.over.status !== 'pending') return;
      var j = jobById(t.job), c = CS.cust(t.cust), ta = q('#yOverMsg'), text = (ta && ta.value.trim()) || overMsg(t, j);
      var acc = c && c.limit, inv = { id: CS.nextId('inv', 'INV-'), cust: t.cust, amount: t.over.amount, issued: 0, due: acc ? 30 : 0, status: 'unpaid', jobs: [], pay: acc ? 'account' : 'link', what: 'Extra weight, ' + t.over.over.toFixed(2) + ' t on ' + t.job, ticket: t.id };
      if (c) s.invoices.unshift(inv);
      t.over.status = 'sent'; t.over.inv = inv.id; t.over.at = Date.now();
      j.log.push({ at: Date.now(), t: 'Extra weight invoiced on ' + inv.id + ', ' + t.over.over.toFixed(2) + ' t over, ticket ' + t.id + ' attached' });
      CS.feed('Extra weight on ' + t.job + ' invoiced to ' + (c ? c.name : 'the customer') + ', ' + inv.id + ' for ' + money(t.over.amount, true) + ' + VAT', 'receipt');
      if (c) { var th = CS.threadFor({ type: 'customer', id: c.id }, c.phone ? 'wa' : 'email'); CS.addMsg(th, 'out', text, { by: 'Dave', att: [{ n: inv.id + '.pdf', t: 'inv', job: inv.id }, { n: 'Weighbridge ticket ' + t.id + '.pdf', t: 'doc' }] }); }
      y.v++; CS.commit();
      toast('Sent. ' + h(inv.id) + ' for ' + money(t.over.amount * 1.2, true) + ' with VAT to ' + h(c ? c.name : 'the customer') + ', ticket attached', 'send');
    };
    A.yOverHold = function (el) { var t = Y().tickets.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!t) return; t.over.status = 'held'; Y().v++; save(); UI.render(); toast('Left for now. It stays on the job and the ticket', 'clock'); };
    function weighCand(lid) {
      var L = Y().jobs.filter(function (j) { return j.day === 0 && j.lorry === lid && YC.TYPES[j.type].waste && !j.ticket; });
      var rank = { onsite: 0, onway: 1, done: 2, planned: 3 };
      return L.sort(function (a, b) { return rank[a.status] - rank[b.status] || a.win[0] - b.win[0]; })[0] || null;
    }
    function weighBody(lid, gross) {
      var lo = YC.lorry(lid), j = weighCand(lid), s = S(), tare = lo.kind === 'skip' ? 9.8 : 15.2;
      return '<div class="field"><label for="yWLorry">Lorry on the bridge</label><select id="yWLorry">' + YC.LORRIES.map(function (l) { return '<option value="' + l.id + '"' + (l.id === lid ? ' selected' : '') + '>' + h(l.reg + ', ' + l.driver) + '</option>'; }).join('') + '</select></div>' +
        '<div class="ywb-top">' + plate(lo.reg) + '<div><b>Number plate read: ' + h(lo.reg) + '</b><small>' + (j ? ic('check') + 'Matched to ' + h(j.id) + ', ' + h(YC.what(j).replace(/^./, function (x) { return x.toLowerCase(); })) + ' for ' + h(YC.custName(s, j.cust)) + ', by lorry, time and site' : 'No open job for this lorry today') + '</small></div></div>' +
        (j ? '<div class="ybk2" style="margin-top:12px"><div class="field"><label for="yWGross">Gross on the bridge</label><input id="yWGross" inputmode="decimal" value="' + gross + '"></div><div class="field"><label>Tare for ' + h(lo.reg) + '</label><input value="' + tare.toFixed(2) + '" disabled></div></div>' +
          (YC.isRoro(j) ? '<small class="muted">This ' + j.size + ' yard RoRo includes ' + (j.incl != null ? j.incl : YC.inclFor(Y(), j)) + ' tonnes.</small>' : '') : '');
    }
    A.yWeigh = function () {
      var lid = 'L3', j = weighCand(lid), tare = 15.2, g = j && YC.isRoro(j) ? (tare + (j.incl || 8) + 3.2).toFixed(2) : (tare + 6).toFixed(2);
      modal(ic('stack') + ' Weigh a lorry in', '<div id="yWeighBox">' + weighBody(lid, g) + '</div>', '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="yWeighGo" id="yWeighGo">' + ic('check') + 'Weigh in</button>');
    };
    document.addEventListener('change', function (e) {
      if (e.target.id !== 'yWLorry') return; var lid = e.target.value, lo = YC.lorry(lid), j = weighCand(lid), tare = lo.kind === 'skip' ? 9.8 : 15.2;
      var g = j ? (YC.isRoro(j) ? tare + (j.incl || 8) + 3.2 : tare + YC.weight(j)).toFixed(2) : tare.toFixed(2);
      q('#yWeighBox').innerHTML = weighBody(lid, g);
    });
    A.yWeighGo = function () {
      var lid = (q('#yWLorry') || {}).value || 'L3', lo = YC.lorry(lid), j = weighCand(lid), tare = lo.kind === 'skip' ? 9.8 : 15.2, gross = parseFloat(((q('#yWGross') || {}).value || '').replace(/[^\d.]/g, ''));
      if (!j) { toast('No open job for ' + h(lo.reg) + ' today, so there is nothing to match the weight to', 'alert'); return; }
      if (!(gross > tare)) { toast('Put the gross weight in. It has to be more than the tare of ' + tare.toFixed(2) + ' t', 'alert'); return; }
      var net = Math.round((gross - tare) * 100) / 100, y = Y();
      YC.complete(S(), y, j, { net: net, gross: gross, tare: tare, plate: true }, Date.now());
      var t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; if (t) t.onBridge = Date.now();
      save(); A.close(); ui.yTkTab = 'tickets'; if (ui.view !== 'tickets') go('tickets'); else UI.render();
      toast(h(lo.reg) + ' weighed in at ' + net.toFixed(2) + ' t net, matched to ' + h(j.id) + (t && t.over ? '. ' + t.over.over.toFixed(2) + ' t over the allowance' : '. Inside the allowance'), 'stack');
    };

    /* ======================================================================
       ROUND 3: simpler screens. Card or table on every list, inbox of two, bulk skip emails,
       booking with permits, days with capacity and AM or PM, and permits with their own screen
       ====================================================================== */
    function mode(key, def) { ui.yMode = ui.yMode || {}; return ui.yMode[key] || def || 'card'; }
    function modeSeg(key, opts) {
      var m = mode(key, opts[0][0]);
      return '<div class="seg ymode" role="group" aria-label="View">' + opts.map(function (o) { return '<button data-act="yMode" data-k="' + key + '" data-v="' + o[0] + '" class="' + (m === o[0] ? 'on' : '') + '">' + ic(o[2]) + o[1] + '</button>'; }).join('') + '</div>';
    }
    var CT = [['card', 'Cards', 'dashboard'], ['table', 'Table', 'list']];
    A.yMode = function (el) { ui.yMode = ui.yMode || {}; ui.yMode[el.dataset.k] = el.dataset.v; UI.render(); };
    function dayLabel(off) { if (off === 0) return 'Today'; if (off === 1) return 'Tomorrow'; var d = YC.dayDate(off); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    function dayLong(off) { var d = YC.dayDate(off); return (off === 1 ? 'tomorrow, ' : '') + d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); }
    function dayName(off) { return off === 1 ? 'tomorrow' : YC.dayDate(off).toLocaleDateString('en-GB', { weekday: 'long' }); }
    function iso(off) { var d = YC.dayDate(off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function offOf(isoS) { var p = String(isoS).split('-'); if (p.length < 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2]), t = YC.dayDate(0); return Math.round((d - t) / 86400000); }
    function sat() { var y = Y(); if (y.sat == null) y.sat = true; return y.sat; }
    function winLabel(j) { var a = j.win[0], b = j.win[1]; if (a === 420 && b === 540) return '7 to 9'; if (a === 480 && b === 720) return '8 to 12'; if (a === 720 && b === 960) return '12 to 4'; if (a === 450 && b === 720) return 'AM'; if (a === 720 && b === 1020) return 'PM'; return YC.hhmm(a) + (b - a === 60 ? '' : ' to ' + YC.hhmm(b)); }
    A.ySat = function () { var y = Y(); y.sat = !sat(); save(); UI.render(); toast(y.sat ? 'Saturday mornings are bookable' : 'Saturdays are closed for bookings', 'calendar'); };

    /* ---------- INBOX: two messages ---------- */
    function msgs() { return Y().inbox || []; }
    function msgCust(m) { return CS.cust(m.cust) || {}; }
    function msgSite(m) { var c = msgCust(m); return (c.sites && (c.sites[m.site] || c.sites[0])) || { name: '', pc: '' }; }
    function quoteText(m) { var c = msgCust(m), s = msgSite(m), p = YC.priceFor(Y(), { type: 'deliver', size: m.size }), so = YC.soonest(Y(), 1, sat());
      return 'Hi ' + (c.first || 'there') + ', an ' + m.size + ' yard skip on the drive at ' + s.name.split(',')[0] + ' is ' + money(p) + ' + VAT, that includes ' + YC.prices(Y()).hireDays + ' days hire. Soonest I can drop it is ' + dayName(so) + '. Want me to book it in? Cheers, Dave'; }
    V.inbox = function () {
      var L = msgs(), wide = window.innerWidth >= 900, sel = ui.yMsg || (wide && L[0] ? L[0].id : null), m = L.filter(function (x) { return x.id === sel; })[0];
      var list = '<div class="yin-list">' + L.map(function (x) {
        var c = msgCust(x);
        return '<button class="yin-i' + (x.id === sel ? ' on' : '') + '" data-act="yMsg" data-id="' + x.id + '"><span class="av" style="--c:#3F3F46">' + h(CS.initials(c.contact || c.name)) + '</span><span class="bd"><b>' + h(c.contact) + '</b><small>' + h(c.name) + '</small><span class="yin-p">' + (x.voice ? ic('microphone') + 'Voice note: ' : '') + h(x.text.slice(0, 64)) + '...</span></span><span class="yin-r"><small>' + h(CS.ago(x.at)) + '</small>' + (x.done ? '<span class="tag ok">' + ic('check') + 'Done</span>' : x.unread ? '<i class="yin-dot"></i>' : '') + '</span></button>';
      }).join('') + '</div>';
      if (!m) return '<div class="yinb">' + list + '</div>';
      m.unread = false;
      var c = msgCust(m), s = msgSite(m), so = YC.soonest(Y(), 1, sat()), price = YC.priceFor(Y(), { type: 'deliver', size: m.size });
      var bub = '<div class="yin-b in">' + (m.voice ? '<div class="yin-voice">' + ic('play') + '<i></i><span>0:' + String(m.voice).padStart(2, '0') + '</span></div><small class="yin-wo">Written out</small>' : '') + '<p>' + h(m.text) + '</p><small>' + ic('whatsapp') + 'WhatsApp, ' + h(CS.ago(m.at)) + '</small></div>' +
        (m.reply ? '<div class="yin-b out"><p>' + h(m.reply) + '</p><small>' + ic('check') + 'Sent ' + h(CS.ago(m.doneAt || Date.now())) + '</small></div>' : '');
      var card = '';
      if (!m.done && m.kind === 'quote') card = '<div class="card yin-a"><b class="yin-t">' + ic('sparkles') + 'Wants a price</b><dl class="kv"><dt>Skip</dt><dd>' + m.size + ' yard, on the drive</dd><dt>Site</dt><dd>' + h(s.name + ', ' + s.pc) + '</dd><dt>Price</dt><dd>' + money(price) + ' + VAT, from your price list</dd><dt>Soonest</dt><dd>' + h(dayLong(so)) + '</dd></dl>' +
        '<div class="field"><label for="yMsgDraft">Reply, with the quote</label><textarea id="yMsgDraft" rows="4">' + h(m.draft != null ? m.draft : quoteText(m)) + '</textarea></div><div class="yin-acts"><button class="btn pri lg" data-act="yMsgApprove" data-id="' + m.id + '" id="yMsgApprove">' + ic('check') + 'Approve and send</button></div></div>';
      if (!m.done && m.kind === 'book') card = '<div class="card yin-a"><b class="yin-t">' + ic('sparkles') + 'Wants to book</b><dl class="kv"><dt>Skip</dt><dd>' + m.size + ' yard, on the drive</dd><dt>Site</dt><dd>' + h(s.name + ', ' + s.pc) + '</dd><dt>When</dt><dd>' + h(dayLong(so)) + ', morning. The first day with room</dd><dt>Price</dt><dd>' + money(price) + ' + VAT, from your price list</dd></dl>' +
        '<div class="yin-acts"><button class="btn pri lg" data-act="yMsgBook" data-id="' + m.id + '" id="yMsgBook">' + ic('calendar') + 'Book it in</button></div></div>';
      if (m.done) card = '<div class="card yin-a done">' + ic('circle-check') + '<span>' + (m.kind === 'quote' ? 'Quote ' + h(m.quote) + ' sent to ' + h(c.contact) + '.' : 'Booked in as ' + h(m.job) + '. It is on the day plan to give it a lorry.') + '</span></div>';
      return '<div class="yinb sel">' + list + '<section class="yin-c"><header><button class="iconbtn sm yin-back" data-act="yMsgBack" aria-label="Back to messages">' + ic('chevron-left') + '</button><div><b>' + h(c.contact) + '</b><small>' + h(c.name) + ' · ' + h(c.phone || '') + '</small></div></header><div class="yin-m">' + bub + '</div>' + card + '</section></div>';
    };
    A.yMsg = function (el) { ui.yMsg = el.dataset.id; UI.render(); };
    A.yMsgBack = function () { ui.yMsg = null; UI.render(); };
    document.addEventListener('input', function (e) { if (e.target.id === 'yMsgDraft') { var m = msgs().filter(function (x) { return x.id === ui.yMsg || (!ui.yMsg && x === msgs()[0]); })[0]; if (m) { m.draft = e.target.value; save(); } } });
    A.yMsgApprove = function (el) {
      var m = msgs().filter(function (x) { return x.id === el.dataset.id; })[0]; if (!m || m.done) return;
      var c = msgCust(m), s = msgSite(m), ta = q('#yMsgDraft'), text = (ta && ta.value.trim()) || quoteText(m), p = YC.priceFor(Y(), { type: 'deliver', size: m.size });
      var qid = CS.nextId('quote', 'Q-'); S().quotes.unshift({ id: qid, cust: c.id, desc: m.size + ' yard skip, ' + s.name.split(',')[0], sell: p, cost: Math.round(p * 0.62), status: 'sent', day: 0, owner: 'dave' });
      m.done = true; m.doneAt = Date.now(); m.reply = text; m.quote = qid; Y().v++; save(); UI.render();
      toast('Quote ' + h(qid) + ' sent to ' + h(c.contact) + ' on WhatsApp', 'send');
    };
    A.yMsgBook = function (el) {
      var m = msgs().filter(function (x) { return x.id === el.dataset.id; })[0]; if (!m) return;
      A.yBook(); var b = ui.yb2; b.cust = m.cust; b.site = m.site; b.svc = 'skip'; b.type = 'deliver'; b.size = m.size; b.place = 'site'; b.day = YC.soonest(Y(), 1, sat()); b.time = 'am'; b.fromMsg = m.id; b.notes = 'On the drive like last time';
      bookDraw2();
    };

    /* ---------- NEW BOOKING ---------- */
    function bk2() { if (!ui.yb2) ui.yb2 = { cust: 'c1', site: 0, svc: 'skip', type: 'deliver', size: 8, rsize: 20, loads: 1, stream: 'mixed', place: 'site', permit: true, day: null, time: 'am', at: '10:00', notes: '', price: null, pay: 'invoice', sure: false }; return ui.yb2; }
    function b2Job(b) { return { type: b.svc === 'skip' || b.svc === 'roro' ? b.type : b.svc, size: b.svc === 'skip' ? b.size : b.svc === 'roro' ? b.rsize : null, loads: b.svc === 'grab' || b.svc === 'muck' ? b.loads : null }; }
    function b2Permit(b) { return (b.svc === 'skip' || b.svc === 'roro') && b.type === 'deliver' && b.place === 'road' && b.permit; }
    function b2Earliest(b) { var e = b2Permit(b) ? YC.nthWorkDay(5) : 1; while (YC.isSun(e) || (!sat() && YC.isSat(e))) e++; return e; }
    function b2Price(b) { var P = YC.prices(Y()), J0 = b2Job(b); return YC.priceFor(Y(), J0) + (b2Permit(b) ? P.permit : 0); }
    function b2Days(b) { return YC.workDays(b2Earliest(b), 4, sat()); }
    function b2Day(b) { var L = b2Days(b); if (b.day != null && b.day >= b2Earliest(b) && !YC.full(Y(), b.day)) return b.day; var so = YC.soonest(Y(), b2Earliest(b), sat()); return so; }
    function b2CashLine(b) { var p = parseFloat(String(b.price == null ? '' : b.price).replace(/[^\d.]/g, '')); return YC.cashLine({ price: p > 0 ? p : b2Price(b) }); }
    function bookHTML2() {
      var b = bk2(), s = S(), y = Y(), c = b.cust !== 'new' ? CS.cust(b.cust) : null, J0 = b2Job(b), P = YC.prices(y), st = YC.STREAMS[b.stream];
      var custs = s.customers.slice().sort(function (x, z) { return x.name < z.name ? -1 : 1; }), skipish = b.svc === 'skip' || b.svc === 'roro', days = b2Days(b), day = b2Day(b), early = b2Earliest(b);
      var firstFull = YC.full(y, days[0]);
      function sg(k, v, opts) { return '<div class="seg yseg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="yB2" data-k="' + k + '" data-v="' + o[0] + '" class="' + (String(v) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
      return '<div class="ybk">' +
        '<div class="field"><label for="yb2Cust">Customer</label><select id="yb2Cust" data-yb2="cust">' + custs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === b.cust ? ' selected' : '') + '>' + h(x.name) + (x.stop ? ' (on stop)' : '') + '</option>'; }).join('') + '<option value="new"' + (b.cust === 'new' ? ' selected' : '') + '>New one-off customer</option></select></div>' +
        creditBox(b.cust) +
        (c ? '<div class="field"><label for="yb2Site">Site</label><select id="yb2Site" data-yb2="site">' + c.sites.map(function (x, i) { return '<option value="' + i + '"' + (i === +b.site ? ' selected' : '') + '>' + h(x.name + ', ' + x.pc) + '</option>'; }).join('') + '</select></div>'
          : '<div class="ybk2"><div class="field"><label for="yb2Name">Name</label><input id="yb2Name" data-yb2t="nname" value="' + h(b.nname || '') + '" placeholder="Mrs Jane Smith"></div><div class="field"><label for="yb2Phone">Mobile</label><input id="yb2Phone" data-yb2t="nphone" value="' + h(b.nphone || '') + '" placeholder="07700 900000"></div></div>' +
            '<div class="ybk2"><div class="field"><label for="yb2Addr">Address</label><input id="yb2Addr" data-yb2t="naddr" value="' + h(b.naddr || '') + '" placeholder="12 Church Lane, Knaphill"></div><div class="field"><label for="yb2Pc">Postcode</label><input id="yb2Pc" data-yb2t="npc" value="' + h(b.npc || '') + '" placeholder="GU21 2AB"></div></div>') +
        '<div class="field"><label>What</label>' + sg('svc', b.svc, [['skip', 'Skip'], ['roro', 'RoRo'], ['grab', 'Grab hire'], ['muck', 'Muckaway']]) + '</div>' +
        (skipish ? '<div class="field"><label>Job</label>' + sg('type', b.type, [['deliver', 'Delivery'], ['exchange', 'Exchange'], ['collect', 'Collection'], ['wait', 'Wait and load']]) + '</div>' +
          (b.svc === 'skip' ? '<div class="field"><label>Skip size</label><div class="ysizes">' + YC.SIZES.map(function (z) { return '<button type="button" data-act="yB2" data-k="size" data-v="' + z + '" class="' + (+b.size === z ? 'on' : '') + '">' + z + '<small>yard</small></button>'; }).join('') + '</div></div>'
            : '<div class="field"><label>RoRo size</label><div class="ysizes two">' + YC.RORO_SIZES.map(function (z) { var r = P.roro[z]; return '<button type="button" data-act="yB2" data-k="rsize" data-v="' + z + '" class="' + (+b.rsize === z ? 'on' : '') + '">' + z + '<small>yard, ' + r.incl + ' t included</small></button>'; }).join('') + '</div><div class="ycr ok" id="yRoroIncl">' + ic('stack') + '<span><b>Includes ' + P.roro[b.rsize].incl + ' tonnes.</b> Anything over is ' + money(P.overRate) + ' a tonne, invoiced from the weighbridge ticket.</span></div></div>')
          : '<div class="field"><label>Loads</label><div class="ystep"><button type="button" data-act="yB2" data-k="loads" data-v="' + Math.max(1, b.loads - 1) + '" aria-label="One less load">-</button><b>' + b.loads + '</b><button type="button" data-act="yB2" data-k="loads" data-v="' + Math.min(8, b.loads + 1) + '" aria-label="One more load">+</button><span class="muted">8-wheeler, about ' + (b.loads * YC.LOAD_T) + ' tonnes</span></div></div>') +
        (skipish && b.type === 'deliver' ? '<div class="field"><label>Where it goes</label>' + sg('place', b.place, [['site', 'On site'], ['road', 'On the road']]) + '</div>' +
          (b.place === 'road' ? '<label class="ypermit"><input type="checkbox" id="yb2Permit"' + (b.permit ? ' checked' : '') + '><span><b>Permit needed</b> adds ' + money(P.permit) + ' to the price. Permits take 3 to 5 working days, so the earliest date is ' + h(dayLong(YC.nthWorkDay(5))) + '.</span></label>' : '') : '') +
        '<div class="field"><label for="yb2Stream">Waste</label><select id="yb2Stream" data-yb2="stream">' + Object.keys(YC.STREAMS).map(function (k) { return '<option value="' + k + '"' + (k === b.stream ? ' selected' : '') + '>' + h(YC.STREAMS[k].n) + '</option>'; }).join('') + '</select><small class="yewc-line">' + ic('certificate') + 'EWC code <b>' + st.ewc + '</b> goes on the job, the transfer note and the Defra record</small></div>' +
        '<div class="field"><label>Day</label><div class="ydays">' + days.map(function (o) {
          var n = YC.booked(y, o), cap = YC.cap(o), full = n >= cap;
          return '<button type="button" data-act="yB2" data-k="day" data-v="' + o + '" class="' + (o === day ? 'on' : '') + (full ? ' full' : '') + '"' + (full ? ' disabled' : '') + '><b>' + h(dayLabel(o)) + (YC.isSat(o) ? ' AM' : '') + '</b><small>' + (full ? 'Full' : n + ' of ' + cap + ' booked') + '</small><i style="width:' + Math.min(100, Math.round(n / cap * 100)) + '%"></i></button>';
        }).join('') + '<label class="ycal">' + ic('calendar') + '<span>Pick a date</span><input type="date" id="yb2Date" min="' + iso(early) + '" value="' + (days.indexOf(day) < 0 ? iso(day) : '') + '"></label></div>' +
        (firstFull ? '<small class="ydays-note" id="ySoonest">' + ic('alert') + h(dayLabel(days[0])) + ' is full. Soonest is ' + h(dayName(YC.soonest(y, early, sat()))) + '.</small>' : '') + '</div>' +
        '<div class="field"><label>Time</label>' + sg('time', b.time, YC.isSat(day) ? [['am', 'AM']] : [['am', 'AM'], ['pm', 'PM'], ['at', 'A set time']]) + (b.time === 'at' && !YC.isSat(day) ? '<input type="time" id="yb2At" data-yb2t="at" value="' + h(b.at) + '" min="07:30" max="16:00" style="margin-top:6px;max-width:140px">' : '') + '</div>' +
        '<div class="field"><label for="yb2Price">Price</label><div class="yprice"><span>£</span><input id="yb2Price" data-yb2t="price" inputmode="decimal" value="' + h(b.price != null ? b.price : b2Price(b)) + '"><span class="muted">+ VAT' + (b2Permit(b) ? ', includes the ' + money(P.permit) + ' permit' : '') + ', from your price list</span></div></div>' +
        '<div class="field"><label>Payment</label>' + sg('pay', b.pay, [['invoice', 'Invoice'], ['cash', 'Pay cash on the day']]) +
          (b.pay === 'cash' ? '<div class="ycr amber" id="yb2Cash" style="margin-top:8px">' + ic('pound') + '<span><b id="yb2CashAmt">' + h(b2CashLine(b)) + '</b> The driver collects it on the day and ticks it off on his phone. It goes to your accounts package as a paid cash sale, with the VAT.</span></div>' : '') + '</div>' +
        '<div class="field"><label for="yb2Notes">Note for the driver</label><input id="yb2Notes" data-yb2t="notes" value="' + h(b.notes || '') + '" placeholder="Gate code, where to put it, access"></div>' +
        '<small class="muted">The lorry is given on the day plan, not here.</small></div>';
    }
    function bookFoot2() {
      var b = bk2(), c = b.cust !== 'new' ? CS.cust(b.cust) : null;
      if (c && c.stop) return '<button class="btn" data-act="close">Cancel</button><span class="sp"></span>' + (b.sure ? '<span class="ysure">' + ic('alert') + 'Sure? They are on stop.</span><button class="btn bad" data-act="yB2Go" id="yBkGo">' + ic('lock') + 'Yes, book anyway</button>' : '<button class="btn" data-act="yB2Sure" id="yBkGo">' + ic('lock') + 'Book anyway</button>');
      return '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri lg" data-act="yB2Go" id="yBkGo">' + ic('check') + 'Book it</button>';
    }
    function bookDraw2() { var m = q('#layer .modal.ybk2m'); if (!m) return; var sc = m.querySelector('.mbd').scrollTop; m.querySelector('.mbd').innerHTML = bookHTML2(); m.querySelector('.mft').innerHTML = bookFoot2(); m.querySelector('.mbd').scrollTop = sc; }
    A.yBook = function (el) {
      ui.yb2 = null; var b = bk2();
      if (el && el.dataset && el.dataset.c) b.cust = el.dataset.c;
      if (A.closeSide) A.closeSide();
      modal(ic('plus') + ' New booking', bookHTML2(), bookFoot2(), 'ybkm ybk2m');
    };
    A.yB2 = function (el) {
      var b = bk2(), k = el.dataset.k, v = el.dataset.v; b[k] = /^(size|rsize|loads|day)$/.test(k) ? +v : v; b.sure = false;
      if (k === 'svc') { b.stream = v === 'skip' || v === 'roro' ? 'mixed' : 'soil'; if (!(v === 'skip' || v === 'roro')) b.place = 'site'; }
      if (k === 'type' && v !== 'deliver') b.place = 'site';
      if (/^(svc|size|rsize|loads|place|type)$/.test(k)) b.price = null;
      if (k === 'day' && YC.isSat(+v)) b.time = 'am';
      bookDraw2();
    };
    A.yB2Sure = function () { bk2().sure = true; bookDraw2(); };
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el.closest || !el.closest('.ybk2m')) return; var b = bk2();
      if (el.dataset.yb2) { var k = el.dataset.yb2; b[k] = k === 'site' ? +el.value : el.value; if (k === 'cust') { b.site = 0; b.sure = false; } bookDraw2(); }
      if (el.id === 'yb2Permit') { b.permit = el.checked; b.price = null; bookDraw2(); }
      if (el.id === 'yb2Date') {
        var off = offOf(el.value), early = b2Earliest(b);
        if (off == null) return;
        if (off < early) { toast('The earliest date is ' + h(dayLong(early)), 'calendar'); bookDraw2(); return; }
        if (YC.isSun(off) || (!sat() && YC.isSat(off))) { toast('The yard is closed that day', 'calendar'); bookDraw2(); return; }
        if (YC.full(Y(), off)) { toast('That day is full. Soonest is ' + h(dayName(YC.soonest(Y(), off, sat()))), 'calendar'); bookDraw2(); return; }
        b.day = off; if (YC.isSat(off)) b.time = 'am'; bookDraw2();
      }
    });
    document.addEventListener('input', function (e) { var el = e.target; if (el.dataset && el.dataset.yb2t && el.closest && el.closest('.ybk2m')) { bk2()[el.dataset.yb2t] = el.value; var ca = q('#yb2CashAmt'); if (ca && el.dataset.yb2t === 'price') ca.textContent = b2CashLine(bk2()); } });
    A.yB2Go = function () {
      var b = bk2(), s = S(), y = Y(), c = b.cust !== 'new' ? CS.cust(b.cust) : null;
      if (!c && (!String(b.nname || '').trim() || !String(b.npc || '').trim())) { toast('Put the customer\'s name and postcode in first', 'alert'); var f = q(!String(b.nname || '').trim() ? '#yb2Name' : '#yb2Pc'); if (f) f.focus(); return; }
      var J0 = b2Job(b), off = b2Day(b);
      if (YC.full(y, off)) { toast('That day is full. Soonest is ' + h(dayName(YC.soonest(y, b2Earliest(b), sat()))), 'calendar'); return; }
      var win = b.time === 'pm' ? [720, 1020] : b.time === 'at' ? (function () { var p = String(b.at || '10:00').split(':'), m = (+p[0]) * 60 + (+p[1] || 0); return [m, m + 60]; })() : [450, 720];
      var site = c ? { name: (c.sites[b.site] || c.sites[0]).name, pc: (c.sites[b.site] || c.sites[0]).pc } : { name: String(b.naddr || 'Address to confirm').trim(), pc: String(b.npc).trim().toUpperCase() };
      var p = YC.pos(site.pc), id = 'DSG-' + (y.counters.job++), perm = b2Permit(b);
      var j = { id: id, day: off, lorry: null, win: win, type: J0.type, cust: c ? c.id : 'new:' + id, cname: c ? null : String(b.nname).trim(), site: site, lat: p.lat, lng: p.lng, size: J0.size, loads: J0.loads,
        price: parseFloat(String(b.price == null ? '' : b.price).replace(/[^\d.]/g, '')) || b2Price(b), incl: YC.inclFor(y, J0), stream: b.stream, place: perm || (b.place === 'road' && J0.type === 'deliver') ? 'road' : 'drive',
        permit: perm ? YC.permitFor(site.pc, id, off, off + 14) : null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: b.notes || '', log: [{ at: Date.now(), t: 'Booked by ' + uName(meU()).split(' ')[0] + (c && c.stop ? ', while on stop' : '') + (b.pay === 'cash' ? ', cash on the day' : '') }], isNew: true, pay: b.pay === 'cash' ? 'cash' : 'invoice' };
      y.jobs.push(j);
      if (perm) { y.permits = y.permits || []; y.permits.unshift({ id: 'PM-' + (600 + y.permits.length), job: id, cust: j.cust, addr: site.name, pc: site.pc, council: YC.councilFor(site.pc), status: 'apply', paidBy: null, price: YC.prices(y).permit, ref: j.permit.ref, from: off, to: off + 14, createdAt: Date.now(), log: [] }); }
      if (b.fromMsg) { var m = msgs().filter(function (x) { return x.id === b.fromMsg; })[0]; if (m) { m.done = true; m.doneAt = Date.now(); m.job = id; m.reply = 'Booked in for ' + dayName(off) + ' morning, ' + (J0.size ? J0.size + ' yarder' : 'grab lorry') + ' on the drive at ' + site.name.split(',')[0] + '. Cheers, Dave'; } }
      y.v++; save(); A.close(); var from = b.fromMsg; ui.yb2 = null;
      toast('Booked ' + h(id) + ' for ' + h(dayLabel(off)) + ' ' + (b.time === 'pm' ? 'PM' : b.time === 'at' ? YC.hhmm(win[0]) : 'AM') + '. Give it a lorry on the day plan' + (perm ? '. Permit card made, apply within 30 minutes' : '') + (j.pay === 'cash' ? '. Cash on the day: ' + h(YC.cashLine(j)) : ''), 'circle-check');
      if (from) UI.render(); else { ui.yBkF = 'all'; ui.yBkDay = 'week'; if (ui.view !== 'bookings') go('bookings'); else UI.render(); }
    };

    /* ---------- BOOKINGS: cards (default), calendar or table ---------- */
    var oldBookings = V.bookings;
    function jobCard(j) {
      var s = S();
      return '<button class="card yjc' + (j.isNew ? ' new' : '') + '" data-act="yJob" data-id="' + j.id + '"><span class="yjc-t"><b>' + h(winLabel(j)) + '</b>' + stTag(j) + '</span><b class="yjc-w">' + h(YC.what(j)) + '</b><span>' + h(YC.custName(s, j.cust)) + '</span><small>' + h(j.site.name + ', ' + j.site.pc) + '</small>' +
        '<span class="yjc-x"><span class="yewc">EWC ' + YC.STREAMS[j.stream].ewc + '</span>' + (j.permit ? '<span class="tag">' + ic('certificate') + 'Permit</span>' : '') + cashBadge(j) + (j.lorry ? '<span class="tag">' + h(YC.lorry(j.lorry).reg) + '</span>' : '<span class="tag bad">No lorry yet</span>') + '</span></button>';
    }
    V.bookings = function () {
      var y = Y(), m = mode('bookings', 'card'), head = '<div class="ybar">' + modeSeg('bookings', [['card', 'Cards', 'dashboard'], ['calendar', 'Calendar', 'calendar'], ['table', 'Table', 'list']]) + '<span class="sp"></span><button class="btn pri" data-act="yBook">' + ic('plus') + 'New booking</button></div>';
      if (m === 'table') return head + oldBookings();
      if (m === 'calendar') {
        var start = -((YC.dayDate(0).getDay() + 6) % 7), cells = '';
        for (var w = 0; w < 2; w++) for (var d = 0; d < 6; d++) {
          var off = start + w * 7 + d, js = y.jobs.filter(function (j) { return j.day === off; }), cap = YC.cap(off), past = off < 0;
          cells += '<button class="ycal-d' + (off === 0 ? ' today' : '') + (past ? ' past' : '') + (js.length >= cap ? ' full' : '') + '" data-act="yCalDay" data-v="' + off + '"><span class="ycal-h"><b>' + h(YC.dayDate(off).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })) + '</b><small>' + (past ? '' : js.length >= cap ? 'Full' : js.length + ' of ' + cap) + '</small></span><span class="yh-bar"><i style="width:' + Math.min(100, Math.round(js.length / cap * 100)) + '%"></i></span>' +
            js.slice(0, 4).map(function (j) { return '<span class="ycal-j">' + h(winLabel(j) + ' ' + YC.whatShort(j)) + '</span>'; }).join('') + (js.length > 4 ? '<span class="ycal-more">' + (js.length - 4) + ' more</span>' : '') + '</button>';
        }
        return head + '<div class="ycalg">' + cells + '</div><p class="muted yfoot">Each day shows how full it is. Tap a day to see its jobs. Saturdays are mornings only' + (sat() ? '' : ', and are closed at the moment') + '.</p>';
      }
      var d = ui.yBkDay || 'today', t1 = YC.workDays(1, 1, sat())[0];
      var offs = d === 'today' ? [0] : d === 'tomorrow' ? [t1] : typeof d === 'number' ? [d] : YC.workDays(0, 8, sat());
      var groups = offs.map(function (o) { var js = y.jobs.filter(function (j) { return j.day === o; }).sort(function (a, b) { return a.win[0] - b.win[0]; }); return { o: o, js: js }; }).filter(function (g) { return g.js.length || offs.length === 1; });
      return head + '<div class="ychips">' + [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days']].map(function (x) { return '<button class="ychip' + (d === x[0] ? ' on' : '') + '" data-act="yBkDay" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + (typeof d === 'number' ? '<span class="ychip on">' + h(dayLabel(d)) + '</span>' : '') + '</div>' +
        groups.map(function (g) { var cap = YC.cap(g.o); return '<div class="yday-h"><b>' + h(g.o === 0 ? 'Today' : dayLong(g.o)) + '</b><small>' + g.js.length + ' of ' + cap + ' booked' + (g.js.length >= cap ? ', full' : '') + '</small></div><div class="yjcs">' + (g.js.map(jobCard).join('') || '<p class="muted">Nothing booked.</p>') + '</div>'; }).join('');
    };
    A.yCalDay = function (el) { ui.yMode = ui.yMode || {}; ui.yMode.bookings = 'card'; ui.yBkDay = +el.dataset.v; UI.render(); };

    /* ---------- SKIPS ON SITE: cards first, overdue first, bulk emails ---------- */
    var oldSkips = V.skips;
    function skGroup(o) { var days = -o.since, left = o.hire - days; return days > o.hire ? 'over' : left <= 3 ? 'soon' : 'rest'; }
    function skipsSorted() { var r = { over: 0, soon: 1, rest: 2 }; return Y().onsite.slice().sort(function (a, b) { return r[skGroup(a)] - r[skGroup(b)] || a.since - b.since; }); }
    function mailWhen(o) { return o.mail ? (o.mail.k === 'over' ? 'Collection notice' : 'Reminder') + ' emailed ' + (Date.now() - o.mail.at < 120000 ? 'just now' : CS.ago(o.mail.at)) : ''; }
    V.skips = function () {
      var y = Y(), L = skipsSorted(), over = L.filter(function (o) { return skGroup(o) === 'over' && !o.booked; }), soon = L.filter(function (o) { return skGroup(o) === 'soon' && !o.booked; }), m = mode('skips', 'card');
      var head = '<div class="ybar">' + modeSeg('skips', CT) + '<span class="sp"></span><button class="btn" data-act="ySkMail" data-k="soon" id="ySkMailSoon">' + ic('mail') + 'Email everyone due soon (' + soon.length + ')</button><button class="btn pri" data-act="ySkMail" data-k="over" id="ySkMailOver">' + ic('mail') + 'Email everyone overdue (' + over.length + ')</button></div>' +
        (y.skMailLog ? '<div class="ycr ok" id="ySkMailLog">' + ic('circle-check') + '<span><b>Sent to ' + y.skMailLog.n + ' customers ' + (Date.now() - y.skMailLog.at < 120000 ? 'just now' : CS.ago(y.skMailLog.at)) + '.</b> ' + (y.skMailLog.k === 'over' ? 'Overdue notice' : 'Due soon reminder') + '. Demo, nothing is sent.</span></div>' : '');
      if (m === 'table') return head + oldSkips();
      function sec(k, title, sub) {
        var l = L.filter(function (o) { return skGroup(o) === k; }); if (!l.length) return '';
        return '<div class="yday-h"><b>' + title + '</b><small>' + sub + '</small></div><div class="yjcs">' + l.map(function (o) {
          var days = -o.since, pct = Math.min(100, Math.round(days / o.hire * 100));
          return '<div class="card ysc ' + k + (o.booked ? ' bk' : '') + '" data-skip="' + o.id + '"><span class="yjc-t"><b>' + h(o.id) + ' · ' + o.size + (o.size >= 20 ? ' yd RoRo' : ' yard') + '</b>' + (k === 'over' ? '<span class="tag bad">' + plural(days - o.hire, 'day') + ' over</span>' : k === 'soon' ? '<span class="tag">' + (o.hire - days <= 0 ? 'Due back today' : plural(o.hire - days, 'day') + ' left') + '</span>' : '') + '</span>' +
            '<b class="yjc-w">' + h(YC.custName(S(), o.cust)) + '</b><small>' + h(o.site.name + ', ' + o.site.pc) + '</small><span class="yh-bar"><i style="width:' + pct + '%"></i></span><small>' + days + ' of ' + o.hire + ' days' + (o.permit ? ' · permit until ' + h(dayLabel(o.permit.to)) : '') + '</small>' +
            (o.mail ? '<small class="ysc-mail">' + ic('mail') + h(mailWhen(o)) + '</small>' : '') +
            '<span class="ysk-a">' + (o.booked ? '<span class="tag ok">' + ic('check') + h(o.booked) + '</span>' : '<button class="btn sm" data-act="ySkip" data-k="exchange" data-id="' + o.id + '">' + ic('exchange') + 'Exchange</button><button class="btn sm" data-act="ySkip" data-k="collect" data-id="' + o.id + '">' + ic('truck') + 'Collection</button>') + '</span></div>';
        }).join('') + '</div>';
      }
      return head + sec('over', 'Overdue', 'Past the ' + YC.prices(y).hireDays + ' day hire') + sec('soon', 'Coming up for collection', 'Within 3 days of the end of hire') + sec('rest', 'On hire', 'Plenty of time left');
    };
    var MAIL = {
      soon: { t: 'Email everyone due soon', s: 'Your skip hire is nearly up', b: 'Hi [first name],\n\nJust a friendly reminder that your [size] yard skip at [address] comes to the end of its 14 day hire on [end date].\n\nIf you need it a bit longer, or want it swapped or collected, just reply to this email and we will sort it.\n\nThanks,\nDave\nDemo Skip & Grab' },
      over: { t: 'Email everyone overdue', s: 'Your skip is past its hire period', b: 'Hi [first name],\n\nYour [size] yard skip at [address] is now past its 14 day hire.\n\nCan you let us know by [3 working days] whether you would like it swapped, kept on hire or collected? If we do not hear back by then, we will book it in for collection.\n\nThanks,\nDave\nDemo Skip & Grab' }
    };
    A.ySkMail = function (el) {
      var k = el.dataset.k, L = skipsSorted().filter(function (o) { return skGroup(o) === k && !o.booked; }), M = MAIL[k];
      if (!L.length) { toast('Nobody to email', 'mail'); return; }
      var names = L.map(function (o) { return YC.custName(S(), o.cust); });
      modal(ic('mail') + ' ' + M.t, '<p class="muted" style="margin:0 0 10px">To <b>' + L.length + ' customers</b>: ' + h(names.slice(0, 6).join(', ')) + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '') + '. Each email has their own name, skip and address filled in.</p>' +
        '<div class="field"><label>Subject</label><input value="' + h(M.s) + '" id="ySkMailSub"></div><div class="field"><label for="ySkMailBody">Email</label><textarea id="ySkMailBody" rows="11">' + h(M.b.replace('[3 working days]', dayLong(YC.nthWorkDay(3)))) + '</textarea></div>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri lg" data-act="ySkMailGo" data-k="' + k + '" id="ySkMailGo">' + ic('send') + 'Send to ' + L.length + ' customers</button>');
    };
    A.ySkMailGo = function (el) {
      var k = el.dataset.k, y = Y(), L = skipsSorted().filter(function (o) { return skGroup(o) === k && !o.booked; }), now = Date.now();
      L.forEach(function (o) { o.mail = { k: k, at: now }; });
      y.skMailLog = { k: k, n: L.length, at: now }; y.v++; save(); A.close(); UI.render();
      toast('Sent to ' + L.length + ' customers just now. Demo, nothing is sent', 'send');
    };

    /* ---------- PERMITS ---------- */
    var PST = [['apply', 'To apply for'], ['applied', 'Applied for'], ['paid', 'Paid'], ['waiting', 'Waiting on council'], ['approved', 'Approved']];
    function pstName(k) { return (PST.filter(function (x) { return x[0] === k; })[0] || ['', k])[1]; }
    function permits() { return Y().permits || []; }
    function permitSteps(pm) { var i = PST.map(function (x) { return x[0]; }).indexOf(pm.status); return '<span class="ypst">' + PST.map(function (x, n) { return '<i class="' + (n <= i ? 'on' : '') + '" title="' + x[1] + '"></i>'; }).join('') + '</span>'; }
    function permitWhen(pm) { var j = pm.job ? jobById(pm.job) : null; return j ? dayLabel(j.day) : pm.to != null ? 'On site, until ' + dayLabel(pm.to) : ''; }
    function permitBtns(pm) {
      if (pm.status === 'approved') return '<span class="tag ok">' + ic('check') + 'Approved</span>';
      var next = pm.status === 'apply' ? '<button class="btn sm" data-act="yPmStep" data-id="' + pm.id + '" data-v="applied">Mark applied for</button>' : pm.status === 'applied' ? '<button class="btn sm" data-act="yPmStep" data-id="' + pm.id + '" data-v="paid" data-by="us">Paid by us</button><button class="btn sm" data-act="yPmStep" data-id="' + pm.id + '" data-v="paid" data-by="customer">Paid by customer</button>' : pm.status === 'paid' ? '<button class="btn sm" data-act="yPmStep" data-id="' + pm.id + '" data-v="waiting">Waiting on council</button>' : '';
      return next + '<button class="btn sm pri" data-act="yPmStep" data-id="' + pm.id + '" data-v="approved">' + ic('check') + 'Mark approved</button>';
    }
    V.permits = function () {
      var L = permits(), f = ui.yPmF || 'all', m = mode('permits', 'card'), cnt = { all: L.length };
      PST.forEach(function (x) { cnt[x[0]] = L.filter(function (p) { return p.status === x[0]; }).length; });
      var show = L.filter(function (p) { return f === 'all' || p.status === f; }).sort(function (a, b) { var o = PST.map(function (x) { return x[0]; }); return o.indexOf(a.status) - o.indexOf(b.status) || b.createdAt - a.createdAt; });
      var head = '<div class="ybar">' + modeSeg('permits', CT) + '<span class="sp"></span><span class="yhint">' + ic('certificate') + 'Skip permits in Surrey come from Surrey County Council. They take 3 to 5 working days.</span></div>' +
        '<div class="ychips">' + [['all', 'All']].concat(PST).map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + '" data-act="yPmF" data-v="' + x[0] + '">' + x[1] + ' <b>' + cnt[x[0]] + '</b></button>'; }).join('') + '</div>';
      if (m === 'table') return head + '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Permit</th><th>Address</th><th>Customer</th><th>When</th><th>Status</th><th>Paid</th><th></th></tr></thead><tbody>' + show.map(function (pm) {
        return '<tr class="' + (pm.status === 'apply' ? 'yun' : '') + '"><td><b>' + h(pm.id) + '</b><small>' + h(pm.job || pm.skip || '') + '</small></td><td>' + h(pm.addr) + '<small>' + h(pm.pc) + '</small></td><td>' + h(YC.custName(S(), pm.cust)) + '</td><td>' + h(permitWhen(pm)) + '</td><td>' + h(pstName(pm.status)) + '</td><td>' + (pm.paidBy ? 'By ' + (pm.paidBy === 'us' ? 'us' : 'the customer') : '<span class="faint">Not yet</span>') + '</td><td class="r">' + permitBtns(pm) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
      return head + '<div class="yjcs">' + show.map(function (pm) {
        return '<div class="card ypm ' + pm.status + '" data-pm="' + pm.id + '"><span class="yjc-t"><b>' + h(pm.id) + '</b><span class="tag' + (pm.status === 'approved' ? ' ok' : pm.status === 'apply' ? ' bad' : '') + '">' + h(pstName(pm.status)) + '</span></span><b class="yjc-w">' + h(pm.addr) + '</b><small>' + h(pm.pc) + ' · ' + h(YC.custName(S(), pm.cust)) + '</small>' + permitSteps(pm) +
          '<small>' + h(pm.council) + ' · ' + money(pm.price) + ' · ' + (pm.paidBy ? 'Paid by ' + (pm.paidBy === 'us' ? 'us' : 'the customer') : 'Not paid yet') + (permitWhen(pm) ? ' · ' + h(permitWhen(pm)) : '') + '</small><span class="ysk-a">' + permitBtns(pm) + '</span></div>';
      }).join('') + '</div>';
    };
    A.yPmF = function (el) { ui.yPmF = el.dataset.v; UI.render(); };
    A.yPmStep = function (el) {
      var pm = permits().filter(function (x) { return x.id === el.dataset.id; })[0]; if (!pm) return;
      pm.status = el.dataset.v; if (el.dataset.by) pm.paidBy = el.dataset.by; if (pm.status === 'approved' && !pm.paidBy) pm.paidBy = 'us';
      pm.log.push({ at: Date.now(), t: pstName(pm.status) }); pm.noted = true; Y().v++; save(); UI.render();
      toast(h(pm.addr.split(',')[0]) + ' permit is now ' + h(pstName(pm.status).toLowerCase()), 'certificate');
    };
    A.yPmOpen = function (el) { var n = q('#yPmNote'); if (n) n.remove(); ui.yPmF = 'apply'; ui.yMode = ui.yMode || {}; ui.yMode.permits = 'card'; go('permits'); setTimeout(function () { var c = q('[data-pm="' + el.dataset.id + '"]'); if (c) { c.classList.add('yflash'); c.scrollIntoView({ block: 'center' }); } }, 60); };
    A.yPmNoteX = function () { var n = q('#yPmNote'); if (n) n.remove(); };
    /* the 30 minute nudge: a road permit booked but not applied for */
    var PNOTE = new URLSearchParams(location.search).get('pnote'), notedThisLoad = {}, loadedAt = Date.now();
    setInterval(function () {
      if (PNOTE === '0' || q('#yPmNote') || q('#boot') || q('#xsign')) return;
      var limit = PNOTE === 'fast' ? 0 : 30 * 60000, wait = PNOTE === 'fast' ? 1500 : 45000;
      if (Date.now() - loadedAt < wait) return;
      var pm = permits().filter(function (x) { return x.status === 'apply' && !x.noted && !notedThisLoad[x.id] && Date.now() - x.createdAt >= limit; })[0];
      if (!pm) return; notedThisLoad[pm.id] = true;
      var d = document.createElement('div'); d.id = 'yPmNote'; d.className = 'ypmnote'; d.setAttribute('role', 'alert');
      d.innerHTML = '<span class="ypmnote-i">' + ic('certificate') + '</span><div><b>Permit not applied for yet: ' + h(pm.addr + ', ' + pm.pc) + '</b><small>Booked ' + h(CS.ago(pm.createdAt)) + ' ago. Permits take 3 to 5 working days.</small><div class="ypmnote-b"><button class="btn sm pri" data-act="yPmOpen" data-id="' + pm.id + '">Open the permit</button><button class="btn sm" data-act="yPmNoteX">Later</button></div></div>';
      document.body.appendChild(d);
    }, 1500);


    /* ---------- customers: card or table ---------- */
    var oldCust = V.customers;
    V.customers = function () {
      var head = '<div class="ybar">' + modeSeg('customers', CT) + '</div>';
      if (mode('customers', 'card') === 'card') return head + oldCust.apply(this, arguments);
      return head + '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Customer</th><th>Contact</th><th>Type</th><th>Terms</th><th class="r">Sites</th><th class="r">Owed</th></tr></thead><tbody>' + S().customers.map(function (c) {
        return '<tr class="click" data-act="openCust" data-id="' + c.id + '"><td><b>' + h(c.name) + '</b>' + (c.stop ? '<span class="tag bad">On stop</span>' : '') + '</td><td>' + h(c.contact) + '<small>' + h(c.phone) + '</small></td><td>' + h(c.type) + '</td><td>' + h(c.terms) + '</td><td class="r">' + c.sites.length + '</td><td class="r num">' + money(agedC(c.id).total) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    };

    /* ======================================================================
       ROUND 3, batch 2: live tracking with a lorry panel, the driver app from a button, the HGV wheel menu
       ====================================================================== */
    function outw(j) { return String(j.site.pc || '').split(' ')[0]; }
    function lorryLine(l, w, y) {
      if (w.state === 'onway') return l.first + ': On the way to ' + outw(w.job) + ', about ' + YC.etaMins(y, w.job) + ' min';
      if (w.state === 'onsite') return l.first + ': On site, ' + outw(w.job);
      if (w.state === 'returning') return l.first + ': Heading back to the yard';
      return l.first + ': At the yard';
    }
    window.DSGLABEL = function (l, w, y) { return '<span class="ylm2"><b>' + h(l.reg) + '</b><small>' + h(lorryLine(l, w, y)) + '</small></span>'; };
    /* the day of one lorry: what is still to go at the top with ETAs, done at the bottom with times. Tip runs and loading included */
    function lorryDay(id) {
      var y = Y(), L = YC.forLorry(y, id, 0), now = Date.now(), w = YC.where(y, id), steps = [], t = now;
      function tip(j) { var s = (j.stream === 'soil' || j.stream === 'concrete') ? YC.TIPS.soil : YC.TIPS.yard; return s.n; }
      L.forEach(function (j) {
        var waste = YC.TYPES[j.type].waste, label = { deliver: 'Delivery', exchange: 'Exchange', collect: 'Collection', wait: 'Wait and load', grab: 'Grab', muck: 'Muckaway' }[j.type];
        if (j.status === 'done') {
          if (j.type === 'deliver') steps.push({ done: true, at: (j.at.onway || j.at.done) - 600000, k: 'Loading at the yard', s: YC.whatShort(j) });
          steps.push({ done: true, at: j.at.done, k: label, s: YC.whatShort(j) + ', ' + j.site.name, j: j });
          if (waste) steps.push({ done: true, at: j.at.done + 25 * 60000, k: 'Tip run', s: tip(j) + (j.ticket ? ', ticket ' + j.ticket : '') });
          return;
        }
        if (j === w.job && w.state === 'onway') t = now + YC.etaMins(y, j) * 60000;
        else if (j === w.job && w.state === 'onsite') t = now;
        else { if (j.type === 'deliver') { t += 15 * 60000; steps.push({ at: t, k: 'Loading at the yard', s: YC.whatShort(j) }); } t += 25 * 60000; }
        steps.push({ at: t, k: label, s: YC.whatShort(j) + ', ' + j.site.name, j: j, now: j === w.job ? w.state : null });
        t += 20 * 60000;
        if (waste) { t += 20 * 60000; steps.push({ at: t, k: 'Tip run', s: tip(j) }); }
      });
      var togo = steps.filter(function (x) { return !x.done; }), done = steps.filter(function (x) { return x.done; }).sort(function (a, b) { return b.at - a.at; });
      return { togo: togo, done: done };
    }
    var trk0 = V.tracking;
    V.tracking = function () {
      var y = Y(), sel = ui.yLorry && YC.lorry(ui.yLorry);
      if (ui.yFocus) { ui.yFocusNow = ui.yFocus; ui.yLorry = ui.yFocus; sel = YC.lorry(ui.yFocus); ui.yFocus = null; }
      var head = '<div class="ybar ytr-bar"><span class="ytr-note">' + ic('map-pin') + '<span>Uses the GPS trackers already on your lorries, if your tracker provider allows linking. No trackers? The driver app does the same job, and the two work together.</span></span><button class="btn pri" data-act="yDrvOpen" id="yDrvOpen">' + ic('mobile') + 'Open the driver app</button></div>';
      var side;
      if (sel) {
        var D = lorryDay(sel.id), w = YC.where(y, sel.id);
        side = '<aside class="card ytrack-list" id="yLorryPanel"><div class="ylp-h"><button class="iconbtn sm" data-act="yLorryOff" aria-label="All lorries">' + ic('chevron-left') + '</button><span class="yplate sm">' + h(sel.reg) + '</span><div><b>' + h(sel.driver) + '</b></div></div>' +
          '<p class="ylp-now">' + h(lorryLine(sel, w, y).replace(/^[^:]+: /, '')) + '</p>' +
          '<h4>Still to go</h4>' + (D.togo.map(function (x) { return '<div class="ylp-s' + (x.now ? ' now' : '') + '"><span class="ylp-t">' + (x.now === 'onsite' ? 'Now' : 'ETA ' + CS.clock(x.at)) + '</span><span><b>' + h(x.k) + '</b><small>' + h(x.s) + '</small>' + (x.j && YC.isCash(x.j) ? YC.cashTag(x.j) : '') + '</span></div>'; }).join('') || '<p class="muted">Nothing left today.</p>') +
          '<h4>Done today</h4>' + (D.done.map(function (x) { return '<div class="ylp-s done"><span class="ylp-t">' + CS.clock(x.at) + '</span><span><b>' + h(x.k) + '</b><small>' + h(x.s) + '</small>' + (x.j && YC.isCash(x.j) ? YC.cashTag(x.j) : '') + '</span></div>'; }).join('') || '<p class="muted">Nothing yet.</p>') + '</aside>';
      } else {
        side = '<aside class="card ytrack-list"><div class="yh-rh"><h3>' + ic('truck') + 'Lorries</h3><span class="livepill"><i></i>Live</span></div>' + YC.LORRIES.map(function (l) {
          var w = YC.where(y, l.id), L = YC.forLorry(y, l.id, 0), d = L.filter(function (j) { return j.status === 'done'; }).length;
          return '<button class="ytl-r" data-act="yLorry" data-v="' + l.id + '"><span class="ytl-top"><span class="yplate sm">' + h(l.reg) + '</span><small>' + d + ' of ' + L.length + ' done</small></span><span class="ytl-s">' + h(lorryLine(l, w, y)) + '</span></button>';
        }).join('') + '<small class="muted ytl-note">Tap a lorry to see its day. Sample data: the lorries are simulated.</small></aside>';
      }
      return head + '<div class="ytrack"><div class="ytrack-map" id="yMapSlot"></div>' + side + '</div>';
    };
    A.yLorry = function (el) { ui.yLorry = el.dataset.v; ui.yFocusNow = el.dataset.v; UI.render(); };
    A.yLorryOff = function () { ui.yLorry = null; UI.render(); };
    A.yFocus = function (el) { ui.yFocus = el.dataset.v; if (ui.view !== 'tracking') go('tracking'); else UI.render(); };

    /* the driver app, opened from Live tracking: a phone beside the map, so the map moves as he works */
    A.yDrvOpen = function () {
      if (q('#yDrvPop')) return;
      var d = document.createElement('div'); d.id = 'yDrvPop'; d.className = 'ydrvpop';
      d.innerHTML = '<div class="ydp-bar"><b>' + ic('mobile') + 'Driver app</b><button class="iconbtn sm" data-act="yDrvClose" aria-label="Close the driver app">' + ic('x') + '</button></div><div class="ydp-ph"><iframe id="yDrvFrame" src="driver.html?embed=1" title="Driver app"></iframe></div>';
      document.body.appendChild(d); document.body.classList.add('ydrv-on');
    };
    A.yDrvClose = function () { var d = q('#yDrvPop'); if (d) d.remove(); ui.yDrv = null; document.body.classList.remove('ydrv-on'); };

    /* ---------- the HGV wheel menu: W or the wheel button, bottom right ---------- */
    var WS = [['home', 'Home', 'home'], ['inbox', 'Inbox', 'inbox'], ['bookings', 'Bookings', 'calendar'], ['plan', 'Day plan', 'route'], ['skips', 'Skips on site', 'skip'], ['permits', 'Permits', 'certificate'],
      ['tracking', 'Live tracking', 'map-pin'], ['wastein', 'Waste in', 'stack'], ['credit', 'Credit control', 'lock']];
    function hgvWheel(cls) {
      function pt(r, d) { var a = d * Math.PI / 180; return [Math.round(r * Math.cos(a) * 100) / 100, Math.round(r * Math.sin(a) * 100) / 100]; }
      var s = '<svg class="ywh-svg ' + (cls || '') + '" viewBox="-100 -100 200 200" aria-hidden="true"><defs><radialGradient id="ywT" r="100" cx="0" cy="0" gradientUnits="userSpaceOnUse"><stop offset=".62" stop-color="#2A303A"/><stop offset=".85" stop-color="#15181E"/><stop offset="1" stop-color="#07090C"/></radialGradient>' +
        '<linearGradient id="ywA" x1="-60" y1="-60" x2="60" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FBFCFD"/><stop offset=".3" stop-color="#9AA3AF"/><stop offset=".55" stop-color="#E8ECF0"/><stop offset=".8" stop-color="#737C88"/><stop offset="1" stop-color="#D9DEE4"/></linearGradient></defs>' +
        '<circle r="99" fill="url(#ywT)"/>';
      for (var t = 0; t < 40; t++) { var a = t * 9, q2 = pt(96, a); s += '<rect x="' + (q2[0] - 1.4) + '" y="' + (q2[1] - 3) + '" width="2.8" height="6" rx=".6" fill="#06080B" transform="rotate(' + (a + 90) + ' ' + q2[0] + ' ' + q2[1] + ')"/>'; }
      s += '<circle r="70" fill="url(#ywA)"/><circle r="66" fill="none" stroke="' + (window.DSGBRAND && DSGBRAND.colour ? DSGBRAND.badge : '#1F4FA8') + '" stroke-width="3"/>';
      for (var hh = 0; hh < 10; hh++) { var ha = hh * 36 + 18, hq = pt(52, ha); s += '<rect x="-4.6" y="-8" width="9.2" height="16" rx="4.6" fill="#1B1F27" transform="translate(' + hq[0] + ' ' + hq[1] + ') rotate(' + (ha + 90) + ')"/>'; }
      s += '<circle r="40" fill="#B4BCC6" stroke="rgba(0,0,0,.25)"/>';
      for (var n = 0; n < 10; n++) { var nq = pt(31, n * 36 - 90); s += '<g transform="translate(' + nq[0] + ' ' + nq[1] + ')"><path d="M5.2 0 2.6 4.5 -2.6 4.5 -5.2 0 -2.6 -4.5 2.6 -4.5Z" fill="#E6EAEF" stroke="#3E4550" stroke-width=".7"/><circle r="2.2" fill="#5B636F"/></g>'; }
      var WB = window.DSGBRAND && DSGBRAND.on ? DSGBRAND : null, hubT = WB && WB.co ? WB.initials : 'DSG', hubC = WB && WB.colour ? WB.badge : '#1F4FA8';   /* personal link: their initials and colour on the hub */
      s += '<circle r="18" fill="' + hubC + '" stroke="#fff" stroke-width="1.5"/><text y="5.5" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="800" font-size="' + (hubT.length > 3 ? 12 : 15) + '" fill="#fff">' + h(hubT) + '</text></svg>';
      return s;
    }
    function wheelCounts() { var c = navCounts({}); return c; }
    (function () {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'yWheelBtn'; b.className = 'ywheel-btn'; b.setAttribute('aria-label', 'Open the wheel menu (W)'); b.setAttribute('data-act', 'yWheel');
      b.innerHTML = hgvWheel('mini') + '<span class="ywb-tip">Menu <kbd>W</kbd></span>'; document.body.appendChild(b);
    })();
    A.yWheel = function () {
      if (q('#yWheel')) { A.yWheelClose(); return; }
      var c = wheelCounts(), phone = window.innerWidth < 700, d = document.createElement('div'); d.id = 'yWheel'; d.className = 'ywheel' + (phone ? ' sheet' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Wheel menu');
      var items = WS.map(function (x, i) {
        var n = c[x[0]] || 0, a = (i * 360 / WS.length - 90) * Math.PI / 180, R = 215, st = phone ? '' : ' style="left:calc(50% + ' + Math.round(R * Math.cos(a)) + 'px);top:calc(50% + ' + Math.round(R * Math.sin(a)) + 'px)"';
        return '<button class="ywi' + (ui.view === x[0] ? ' on' : '') + '" data-act="yWheelGo" data-v="' + x[0] + '"' + st + '><span class="ywi-ic">' + ic(x[2]) + (n ? '<b>' + n + '</b>' : '') + '</span><span class="ywi-l">' + (i < 9 ? '<kbd>' + (i + 1) + '</kbd>' : '<kbd>0</kbd>') + h(x[1]) + '</span></button>';
      }).join('');
      d.innerHTML = '<div class="ywheel-bg" data-act="yWheelClose"></div><div class="ywheel-in"><div class="ywheel-s"><span>' + ic('search') + '</span><input id="yWheelQ" placeholder="Type to find any screen" autocomplete="off" aria-label="Find a screen"><div class="ywheel-r" id="yWheelR"></div></div>' + (phone ? '<b class="ywheel-t">Go to</b>' : '<div class="ywheel-hub">' + hgvWheel('big') + '<button class="ywheel-new" data-act="yWheelBook">' + ic('plus') + 'New booking</button></div>') + '<div class="ywheel-items">' + items + '</div>' + (phone ? '<button class="btn pri ywheel-newp" data-act="yWheelBook">' + ic('plus') + 'New booking</button>' : '') + '<button class="iconbtn ywheel-x" data-act="yWheelClose" aria-label="Close the wheel">' + ic('x') + '</button></div>';
      document.body.appendChild(d); document.body.classList.add('ywheel-on');
      setTimeout(function () { var i = q('#yWheelQ'); if (i && !phone) i.focus(); }, 30);
    };
    function wheelFind(v) {
      v = String(v || '').trim().toLowerCase(); if (!v) return [];
      function sc(x) { var n = (x.n || '').toLowerCase(); return n.indexOf(v) === 0 ? 0 : n.indexOf(v) > 0 ? 1 : 2; }
      return UI.VIEWS.filter(function (x) { return !x.hide && ((x.n || '') + ' ' + (x.sub || '') + ' ' + x.k).toLowerCase().indexOf(v) >= 0; }).sort(function (a, b) { return sc(a) - sc(b); }).slice(0, 6);
    }
    document.addEventListener('input', function (e) {
      if (e.target.id !== 'yWheelQ') return; var r = q('#yWheelR'), L = wheelFind(e.target.value);
      r.innerHTML = e.target.value.trim() ? (L.map(function (x, i) { return '<button class="' + (i ? '' : 'on') + '" data-act="yWheelGo" data-v="' + x.k + '">' + ic(x.ic) + '<span><b>' + h(x.n) + '</b><small>' + h(x.sub || '') + '</small></span></button>'; }).join('') || '<p class="muted">Nothing matches.</p>') : '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.target.id !== 'yWheelQ') return;
      if (e.key === 'Escape') { A.yWheelClose(); return; }
      if (!e.target.value && /^[0-9]$/.test(e.key)) { var k = e.key === '0' ? 9 : +e.key - 1; if (WS[k]) { e.preventDefault(); A.yWheelGo({ dataset: { v: WS[k][0] } }); } return; }
      if (e.key === 'Enter') { var L = wheelFind(e.target.value); if (L[0]) { e.preventDefault(); A.yWheelGo({ dataset: { v: L[0].k } }); } }
    });
    A.yWheelClose = function () { var d = q('#yWheel'); if (d) d.remove(); document.body.classList.remove('ywheel-on'); };
    A.yWheelGo = function (el) { A.yWheelClose(); A.close(); go(el.dataset.v); };
    A.yWheelBook = function () { A.yWheelClose(); A.yBook(); };
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'w' || e.key === 'W') && !q('#layer').innerHTML) { e.preventDefault(); A.yWheel(); return; }
      if (q('#yWheel')) {
        if (e.key === 'Escape') { A.yWheelClose(); return; }
        var k = e.key === '0' ? 9 : parseInt(e.key, 10) - 1; if (k >= 0 && k < WS.length) { e.preventDefault(); A.yWheelGo({ dataset: { v: WS[k][0] } }); }
      }
    });

    /* the helpers the newer yard screens (y-*.js) share */
    window.DSGY.kit = { modal: modal, drawer: drawer, toast: toast, go: go, jobById: jobById, dayLabel: dayLabel, dayLong: dayLong, dayName: dayName, winLabel: winLabel, stTag: stTag, STAT: STAT,
      cashBadge: cashBadge, lorryFits: lorryFits, fitWhy: fitWhy, movePlan: movePlan, sat: sat, plural: plural, uName: uName, meU: meU, mode: mode, modeSeg: modeSeg, iso: iso, offOf: offOf,
      agedC: agedC, aged: aged, stops: stops, sum: sum, LIVEV: LIVEV, msgs: msgs, msgCust: msgCust, msgSite: msgSite, quoteText: quoteText, creditBox: creditBox, navCounts: navCounts,
      bk2: bk2, b2Job: b2Job, b2Permit: b2Permit, b2Earliest: b2Earliest, b2Price: b2Price, b2Days: b2Days, b2Day: b2Day, b2CashLine: b2CashLine, WS: WS, MAP: MAP, view: view, save: save, commit: commit, q: q, qa: qa };
    /* ======================================================================
       Steps for the guided tour
       ====================================================================== */
    var R = window.DSGG.RUN;
    function closeAll() { var b = q('#boot'); if (b) b.remove(); A.close(); if (A.yWheelClose) A.yWheelClose(); if (A.yDrvClose) A.yDrvClose(); if (A.closePhone) A.closePhone(); if (A.closeSide) A.closeSide(); var sk = q('#skPanel'); if (sk && !sk.hidden && A.skToggle) A.skToggle(); ui.yArr = false; }
    R.yHome = function () { closeAll(); go('home'); };
    R.yBookings = function () { closeAll(); ui.yBkDay = 'today'; ui.yBkF = 'all'; go('bookings'); };
    R.yBookNew = function () { closeAll(); go('bookings'); A.yBook(); bk().place = 'road'; bookDraw(); };
    R.yBookStop = function () { closeAll(); go('credit'); var st = stops()[0]; A.yBook({ dataset: { c: st ? st.id : 'c3' } }); };
    R.yPlan = function () { closeAll(); ui.yPlanDay = 0; go('plan'); };
    R.ySkips = function () { closeAll(); ui.ySkF = 'all'; go('skips'); };
    R.ySkipsOver = function () { closeAll(); ui.ySkF = 'over'; go('skips'); };
    R.yDriver = function () { closeAll(); go('tracking'); A.yDrvOpen(); };
    R.yTrack = function () { closeAll(); go('tracking'); };
    R.yTickets = function () { closeAll(); ui.yTkTab = 'tickets'; go('tickets'); };
    R.yRoro = function () { closeAll(); ui.yTkTab = 'tickets'; go('tickets'); setTimeout(function () { var b = q('#yBridge'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start' }); }, 60); };
    R.yRoroWeigh = function () { closeAll(); ui.yTkTab = 'tickets'; go('tickets'); A.yWeigh(); };
    R.yInbox = function () { closeAll(); ui.yMsg = null; go('inbox'); };
    R.yPermits = function () { closeAll(); ui.yPmF = 'all'; go('permits'); };
    R.yPrices = function () { closeAll(); go('prices'); setTimeout(function () { var b = q('#yRoroList'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'center' }); }, 60); };
    R.yWtn = function () { closeAll(); ui.yTkTab = 'wtn'; go('tickets'); var j = Y().jobs.filter(function (x) { return x.wtn; })[0]; if (j) A.yWtn({ dataset: { id: j.id } }); };
    R.yCredit = function () { closeAll(); go('credit'); };
    R.yDefra = function () { closeAll(); ui.yDfF = 'all'; go('defra'); };
    R.yRecycle = function () { closeAll(); go('recycling'); };
    R.yScore = function () { closeAll(); ui.yScTab = 'office'; go('scoreboard'); };
    R.yScoreDrv = function () { closeAll(); ui.yScTab = 'drivers'; go('scoreboard'); };
    R.yMineShow = function () { closeAll(); go('home'); A.yMine(); };
    R.yArrange = function () { closeAll(); go('home'); ui.yArr = true; UI.render(); };
    R.yAssist = function () { closeAll(); go('home'); if (A.ask) A.ask(); };
    R.yProblem = function () { closeAll(); go('home'); A.yProblem(); };
    window.DSGG.acts = Object.keys(R);

    /* ---------- start ---------- */
    var hv0 = location.hash.replace('#', ''); if (UI.VIEWS.some(function (v) { return v.k === hv0; })) ui.view = hv0;
    drawMe(); UI.render();
  }
  start(0);
})();
