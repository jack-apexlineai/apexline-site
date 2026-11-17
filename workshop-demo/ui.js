/* Office app shell: navigation, the screen registry, modals and the small builders
   that every screen uses. The screens themselves live in office.js and office2.js. */
(function () {
  var $ = WS.$, esc = WS.esc;

  var O = WS.O = {
    SCREENS: {}, WIRE: {},
    screen: 'home',
    bookinDraft: {},
    tsWeek: 0, prWeek: 0,
    planDay: 0,
    vehFilter: { q: '', type: '', op: '', vor: '' },
    compFilter: '',
    stockFilter: '',
    suggest: null,
    tab: {}
  };

  O.NAV = [
    { g: 'Today' },
    { id: 'home', name: 'Home', icon: '▦' },
    { id: 'planner', name: 'Day planner', icon: '▥' },
    { id: 'live', name: 'Live view', icon: '◉' },
    { id: 'board', name: 'Workshop board', icon: '▤' },
    { g: 'Work' },
    { id: 'bookin', name: 'Book in', icon: '＋' },
    { id: 'approvals', name: 'Authorisations', icon: '!' },
    { id: 'checks', name: 'Driver checks', icon: '☑' },
    { id: 'quotes', name: 'Quotes', icon: '✎' },
    { g: 'Fleet' },
    { id: 'vehicles', name: 'Vehicles', icon: '▣' },
    { id: 'compliance', name: 'Compliance planner', icon: '✓' },
    { id: 'er', name: 'Earned Recognition', icon: '★' },
    { id: 'campaigns', name: 'Campaigns and recalls', icon: '⟳' },
    { g: 'Money and people' },
    { id: 'money', name: 'Money', icon: '£' },
    { id: 'stock', name: 'Parts and stock', icon: '⬚' },
    { id: 'timesheets', name: 'Timesheets', icon: '◷' },
    { id: 'reports', name: 'Reports', icon: '◈' }
  ];

  /* ---------------- boot ---------------- */
  O.boot = function () {
    WS.initTheme();
    WS.load();
    WS.applyBrand();
    (O.signIn || function (cb) { cb(false); })(function (fresh) { openOffice(fresh); });
    function openOffice(fresh) {
      WS.banner((O.whoBarHtml ? O.whoBarHtml() : '') +
        (O.assistant ? O.assistant.buttonHtml() : '') +
        '<button id="wsHome" type="button" class="ibtn" aria-label="Home" title="Home">' + HOME + '</button>' +
        '<button id="wsBell" type="button" class="bell ibtn" aria-label="Alerts" title="Alerts"></button>' +
        '<button id="wsGear" type="button" class="gearbtn ibtn" aria-label="Settings" title="Settings">' + GEAR + '</button>');
      if (O.wireWho) O.wireWho();
      $('shell').hidden = false;
      paintBrand();
      buildNav();
      WS.watch();
      if (O.watchBookings) O.watchBookings();
      WS.onChange(function () {
        if (O.dragging) return;
        if (['live', 'board', 'home', 'planner', 'approvals', 'checks'].indexOf(O.screen) >= 0) O.render();
        paintBell();
      });
      $('burger').onclick = function () { document.body.classList.toggle('navopen'); };
      $('navmask').onclick = function () {
        document.body.classList.remove('navopen');
        if (O.navEditing) O.navEdit(false);
      };
      var bell = $('wsBell');
      if (bell) bell.onclick = function (e) { e.stopPropagation(); closeNav(); if (O.closeWheel) O.closeWheel(true); O.bellPop(); };
      if (O.wireAsk) O.wireAsk();
      var hm = $('wsHome');
      if (hm) hm.onclick = function () { closeNav(); if (O.closeWheel) O.closeWheel(true); O.go('home'); };
      // Settings opens from the top bar gear and the sidebar footer, in every menu style
      var gear = $('wsGear');
      if (gear) gear.onclick = function () { closeNav(); if (O.closeWheel) O.closeWheel(true); O.go('settings'); };
      document.querySelectorAll('.sidefoot button.nv[data-screen]').forEach(function (b) {
        b.onclick = function () { closeNav(); O.go(b.dataset.screen); };
      });
      if (O.initPhone) O.initPhone();
      paintBell();
      O.go(fresh ? 'home' : (location.hash.replace('#', '') || 'home'));
      // straight after sign in: the start-up briefing, which hands over to the wheel itself
      var briefing = !!(fresh && O.playStartup && O.playStartup({ boot: true }));
      if (O.wheelBoot) O.wheelBoot(briefing);
      if (!briefing && O.urgentScan) setTimeout(O.urgentScan, 900);
      WS.onChange(function () { if (O.urgentScan && O.startupState !== 'playing' && O.startupState !== 'paused') O.urgentScan(); });
      setInterval(function () { if (O.screen === 'live') O.paintTimers && O.paintTimers(); }, 1000);
      setInterval(function () { if (!O.dragging && (O.screen === 'live' || O.screen === 'planner')) O.render(); }, 30000);
    }
  };

  var GEAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  var HOME = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10.8 12 3.8l8.5 7"/><path d="M5.8 9.2V20h12.4V9.2"/><path d="M10 20v-5.2h4V20"/></svg>';
  var BELL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 9.6a5.8 5.8 0 0 1 11.6 0c0 5.6 2.4 7.2 2.4 7.2H3.8s2.4-1.6 2.4-7.2"/><path d="M10.2 19.6a1.9 1.9 0 0 0 3.6 0"/></svg>';
  function closeNav() {
    document.body.classList.remove('navopen');
    if (O.navEditing) O.navEdit(false);
  }
  function paintBrand() {
    var S = WS.state.settings, row = document.querySelector('nav.side .brandrow');
    var short = shortName(S.name), same = !!S.logo && shortName(S.logoName || '') === short;
    if (row) {
      row.classList.toggle('haslogo', !!S.logo);
      row.innerHTML = (S.logo ? WS.logoHtml('side-logo', true) : '<div class="logo">' + esc(S.initials || 'WS') + '</div>') +
        '<div style="min-width:0"><div class="bname' + (same ? ' vh' : '') + '" id="bizName"></div>' +
        '<div class="bsub">Workshop system</div></div>';
    }
    $('bizName').textContent = short;
    if (S.logo) { var pre = new Image(); pre.src = S.logo; }
    document.querySelectorAll('.logo').forEach(function (l) { if (!l.children.length) l.textContent = S.initials || 'WS'; });
    document.title = short + ' · Workshop';
    if (O.paintWheelBrand) O.paintWheelBrand();
  }
  O.paintBrand = paintBrand;

  function openApprovals() {
    return WS.state.approvals.filter(function (a) { return a.status === 'Sent' || a.status === 'Draft'; }).length;
  }
  function newChecks() {
    return WS.state.checks.filter(function (c) { return c.date === WS.day(0) && c.defects.length && !c.jobId; }).length;
  }
  function paintBell() {
    var b = $('wsBell');
    if (!b) return;
    var n = openApprovals() + newChecks();
    b.innerHTML = BELL + (n ? '<span class="dt">' + n + '</span>' : '');
    b.setAttribute('aria-label', n ? 'Alerts, ' + n + ' need you' : 'Alerts');
    b.title = b.getAttribute('aria-label');
  }
  O.paintBell = paintBell;

  /* the bell: a small panel under it, with a way into the full Alerts screen */
  O.bellPop = function (force) {
    var old = $('bellPop');
    if (old && force !== true) { O.bellClose(); return; }
    if (old) old.remove();
    var bell = $('wsBell'); if (!bell) return;
    var needs = O.needsAlerts ? O.needsAlerts() : [];
    var sent = (WS.state.notifications || []).slice(0, 4);
    var icon = function (n) { return n.channel.indexOf('WhatsApp') >= 0 ? '◎' : n.channel === 'SMS' ? '✉' : '@'; };
    var p = document.createElement('div');
    p.id = 'bellPop'; p.className = 'bellpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Alerts');
    p.innerHTML = '<div class="bp-h"><b>Alerts</b><button type="button" class="btn alt sm" id="bpFull">Open full screen</button></div>' +
      '<div class="bp-b">' +
      '<div class="bp-l">Needs you</div>' +
      (needs.length ? '<ul class="feed">' + needs.map(function (a) {
        return '<li data-bpgo="' + esc(a.go) + '"><div class="ic ' + a.cls + '">!</div><div style="min-width:0"><div class="t">' + esc(a.t) + '</div></div></li>';
      }).join('') + '</ul>' : '<div class="muted sm" style="padding:8px 0">Nothing needs you right now.</div>') +
      (sent.length ? '<div class="bp-l" style="margin-top:6px">Latest sent</div><ul class="feed">' + sent.map(function (n) {
        return '<li data-bpgo="alerts"><div class="ic go">' + icon(n) + '</div><div style="min-width:0"><div class="t">' + esc(n.subject) + '</div>' +
          '<div class="s">' + esc(n.to) + ' · ' + esc(WS.timeUK(n.at)) + '</div></div></li>';
      }).join('') + '</ul>' : '') +
      '</div>';
    document.body.appendChild(p);
    var r = bell.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 16);
    p.style.width = w + 'px';
    p.style.top = Math.round(r.bottom + 8) + 'px';
    p.style.left = Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + 'px';
    bell.setAttribute('aria-expanded', 'true');
    p.addEventListener('click', function (e) { e.stopPropagation(); });
    $('bpFull').onclick = function () { O.bellClose(); O.go('alerts'); };
    p.querySelectorAll('[data-bpgo]').forEach(function (li) {
      li.onclick = function () { var g = li.dataset.bpgo; O.bellClose(); O.go(g); };
    });
  };
  O.bellClose = function () {
    var p = $('bellPop'); if (p) p.remove();
    var b = $('wsBell'); if (b) b.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', function () { if ($('bellPop')) O.bellClose(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('bellPop')) O.bellClose(); });
  window.addEventListener('resize', function () { if ($('bellPop')) O.bellClose(); });

  /* the sidebar folds away by group, and remembers what you closed */
  function navShut() {
    try { return JSON.parse(localStorage.getItem('wsDemo:navShut') || '{}'); } catch (e) { return {}; }
  }
  function saveNavShut(o) {
    try { localStorage.setItem('wsDemo:navShut', JSON.stringify(o)); } catch (e) { }
  }

  /* ---------------- the menu, your way ----------------
     wsDemo:navLayout keeps the order of each group, a Favourites group on top,
     and what is hidden. Groups keep their order; items move freely. */
  var FAV = 'Favourites';
  var GRIP = '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3.5" cy="3" r="1.4"/><circle cx="8.5" cy="3" r="1.4"/><circle cx="3.5" cy="8" r="1.4"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="3.5" cy="13" r="1.4"/><circle cx="8.5" cy="13" r="1.4"/></svg>';
  var STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';
  var EYE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYEOFF = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  O.ICON = { grip: GRIP, star: STAR, eye: EYE, eyeOff: EYEOFF };

  function navItem(id) { for (var i = 0; i < O.NAV.length; i++) if (O.NAV[i].id === id) return O.NAV[i]; return null; }
  function homeGroup(id) {
    var cur = null, g = null;
    O.NAV.forEach(function (n) { if (n.g) cur = n.g; else if (n.id === id) g = cur; });
    return g;
  }
  function navDefault() {
    var groups = [{ g: FAV, items: [] }], cur = null;
    O.NAV.forEach(function (n) {
      if (n.g) { cur = { g: n.g, items: [] }; groups.push(cur); } else cur.items.push(n.id);
    });
    return { groups: groups, hidden: [], home: {} };
  }
  O.navLayout = function () {
    var d = navDefault(), s = null;
    try { s = JSON.parse(localStorage.getItem('wsDemo:navLayout') || 'null'); } catch (e) { }
    if (!s || !s.groups || !s.groups.length) return d;
    var seen = {};
    var saved = {};
    s.groups.forEach(function (g) { saved[g.g] = g.items || []; });
    var groups = d.groups.map(function (g) {
      var items = (saved[g.g] || []).filter(function (id) {
        if (!navItem(id) || seen[id]) return false;
        seen[id] = 1; return true;
      });
      return { g: g.g, items: items };
    });
    // anything new or lost goes back to its own group
    O.NAV.forEach(function (n) {
      if (!n.id || seen[n.id]) return;
      var hg = homeGroup(n.id);
      groups.forEach(function (g) { if (g.g === hg) g.items.push(n.id); });
    });
    return {
      groups: groups,
      hidden: (s.hidden || []).filter(function (id) { return !!navItem(id); }),
      home: s.home || {}
    };
  };
  function saveNav(m) {
    try { localStorage.setItem('wsDemo:navLayout', JSON.stringify(m)); } catch (e) { }
  }
  function groupOf(m, id) {
    for (var i = 0; i < m.groups.length; i++) if (m.groups[i].items.indexOf(id) >= 0) return m.groups[i];
    return null;
  }
  O.navStar = function (id) {
    var m = O.navLayout(), g = groupOf(m, id);
    if (!g) return;
    g.items.splice(g.items.indexOf(id), 1);
    if (g.g === FAV) {
      var back = m.home[id] || homeGroup(id);
      if (back === FAV) back = homeGroup(id);
      m.groups.forEach(function (x) { if (x.g === back) x.items.push(id); });
    } else {
      m.home[id] = g.g;
      m.groups[0].items.push(id);
    }
    saveNav(m);
    buildNav();
  };
  O.navHide = function (id) {
    var m = O.navLayout(), i = m.hidden.indexOf(id);
    if (i >= 0) m.hidden.splice(i, 1); else m.hidden.push(id);
    saveNav(m);
    buildNav();
  };
  O.navReset = function () {
    try { localStorage.removeItem('wsDemo:navLayout'); } catch (e) { }
    buildNav();
  };
  O.navEditing = false;
  O.navEdit = function (on) {
    O.navEditing = !!on;
    buildNav();
    if (O.screen) document.querySelectorAll('nav.side button.nv').forEach(function (b) { b.classList.toggle('on', b.dataset.screen === O.screen); });
    navCounts();
    if (on) { var n = $('nav'); if (n) n.scrollTop = 0; }
  };

  function buildNav() {
    var wrap = $('navItems'), shut = navShut(), m = O.navLayout(), ed = O.navEditing;
    var nav = $('nav');
    if (nav) nav.classList.toggle('editing', ed);
    var out = '';
    if (ed) out += '<div class="nedhint">Drag <span class="g">' + GRIP + '</span> to move. Star to pin to Favourites. Tap the eye to hide.</div>';
    m.groups.forEach(function (grp) {
      var g = grp.g;
      var vis = grp.items.filter(function (id) { return m.hidden.indexOf(id) < 0; });
      if (!ed && !vis.length) return;
      if (ed) {
        out += '<div class="navgrp ed' + (g === FAV ? ' fav' : '') + '"><span>' + esc(g) + '</span></div>';
        out += '<div class="navbody" data-body="' + esc(g) + '">';
        grp.items.forEach(function (id) {
          var n = navItem(id), off = m.hidden.indexOf(id) >= 0, fav = g === FAV;
          out += '<div class="nv ned' + (off ? ' off' : '') + '" data-screen="' + id + '">' +
            '<button type="button" class="grip" aria-label="Drag ' + esc(n.name) + ' to move it">' + GRIP + '</button>' +
            '<i>' + n.icon + '</i><span class="nm">' + esc(n.name) + '</span>' +
            '<button type="button" class="nstar' + (fav ? ' on' : '') + '" data-star="' + id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Take ' + esc(n.name) + ' out of Favourites' : 'Pin ' + esc(n.name) + ' to Favourites') + '">' + STAR + '</button>' +
            '<button type="button" class="neye" data-eye="' + id + '" aria-pressed="' + off + '" aria-label="' + (off ? 'Show ' : 'Hide ') + esc(n.name) + '">' + (off ? EYEOFF : EYE) + '</button>' +
            '</div>';
        });
        if (!grp.items.length) out += '<div class="ndrop">' + (g === FAV ? 'Star the things you use most, or drag them here' : 'Drag items here') + '</div>';
        out += '</div>';
        return;
      }
      var closed = !!shut[g];
      out += '<button class="navgrp' + (closed ? ' shut' : '') + (g === FAV ? ' fav' : '') + '" data-grp="' + esc(g) + '">' +
        '<span>' + esc(g) + '</span><i class="caret">▾</i><span class="gcnt" hidden></span></button>';
      out += '<div class="navbody" data-body="' + esc(g) + '"' + (closed ? ' hidden' : '') + '>';
      vis.forEach(function (id) {
        var n = navItem(id);
        out += '<button class="nv" data-screen="' + id + '"><i>' + n.icon + '</i>' + esc(n.name) + '<span class="cnt" hidden></span></button>';
      });
      out += '</div>';
    });
    wrap.innerHTML = out;

    var foot = $('navFoot');
    if (foot) {
      foot.innerHTML = ed
        ? '<div class="nedbar"><button type="button" class="btn alt sm" id="navReset">Reset</button><button type="button" class="btn sm" id="navDone">Done</button></div>'
        : '<button type="button" class="navedit" id="navEdit"><i>✎</i>Edit menu</button>';
      if (ed) {
        $('navReset').onclick = function () { O.navReset(); WS.toast('Menu put back the way it was.', 'ok'); };
        $('navDone').onclick = function () { O.navEdit(false); };
      } else {
        $('navEdit').onclick = function () { O.navEdit(true); };
      }
    }

    if (ed) {
      wrap.querySelectorAll('[data-star]').forEach(function (b) { b.onclick = function () { O.navStar(b.dataset.star); }; });
      wrap.querySelectorAll('[data-eye]').forEach(function (b) { b.onclick = function () { O.navHide(b.dataset.eye); }; });
      var before = null;
      O.sortable({
        root: wrap, item: '.ned', handle: '.grip', zone: '.navbody',
        scroller: nav,
        onStart: function () { before = O.navLayout(); },
        onDrop: function () {
          var m2 = O.navLayout();
          var was = {};
          before.groups.forEach(function (g) { g.items.forEach(function (id) { was[id] = g.g; }); });
          m2.groups.forEach(function (g) {
            var body = wrap.querySelector('[data-body="' + g.g + '"]');
            g.items = body ? [].map.call(body.querySelectorAll('.ned'), function (x) { return x.dataset.screen; }) : [];
          });
          m2.groups[0].items.forEach(function (id) { if (was[id] && was[id] !== FAV) m2.home[id] = was[id]; });
          saveNav(m2);
          buildNav();
        }
      });
      return;
    }

    wrap.querySelectorAll('button.nv').forEach(function (b) {
      b.onclick = function () { O.go(b.dataset.screen); document.body.classList.remove('navopen'); };
    });
    wrap.querySelectorAll('.navgrp').forEach(function (h) {
      h.onclick = function () {
        var sh = navShut(), g = h.dataset.grp;
        sh[g] = !sh[g];
        if (!sh[g]) delete sh[g];
        saveNavShut(sh);
        h.classList.toggle('shut', !!sh[g]);
        var bd = wrap.querySelector('[data-body="' + g + '"]');
        if (bd) bd.hidden = !!sh[g];
        navCounts();
      };
    });
  }
  O.buildNav = buildNav;

  O.navCountData = function () {
    // only what needs someone: jobs to plan, customer answers, driver defects, quotes to send
    return {
      planner: WS.unplanned(WS.day(0)).length,
      approvals: openApprovals(),
      checks: newChecks(),
      quotes: WS.state.quotes.filter(function (q) { return q.status === 'Draft'; }).length
    };
  };
  function navCounts() {
    var c = O.navCountData();
    document.querySelectorAll('nav.side button.nv').forEach(function (b) {
      var el = b.querySelector('.cnt'), v = c[b.dataset.screen];
      if (!el) return;
      if (v) { el.textContent = v; el.hidden = false; } else { el.hidden = true; }
    });
    // roll the counts up onto a folded group so nothing hides
    document.querySelectorAll('nav.side .navgrp').forEach(function (h) {
      var bd = document.querySelector('[data-body="' + h.dataset.grp + '"]');
      var tot = 0;
      if (bd) bd.querySelectorAll('button.nv').forEach(function (b) { tot += c[b.dataset.screen] || 0; });
      var el = h.querySelector('.gcnt');
      if (!el) return;
      if (tot && h.classList.contains('shut')) { el.textContent = tot; el.hidden = false; }
      else el.hidden = true;
    });
  }

  /* the old money screens all open inside Money now, on the right view */
  var MONEY_VIEWS = { invoices: 'invoices', bills: 'bills', fitterpay: 'pay', payroll: 'pay' };
  O.go = function (s) {
    if (MONEY_VIEWS[s] && O.setMoneyView) { O.setMoneyView(MONEY_VIEWS[s]); s = 'money'; }
    if (!O.SCREENS[s]) s = 'home';
    if (s !== 'planner') O.suggest = null;
    if (s !== 'compliance') O.compFilter = '';
    O.screen = s;
    location.hash = s;
    document.querySelectorAll('nav.side button.nv').forEach(function (b) { b.classList.toggle('on', b.dataset.screen === s); });
    var nm = 'Settings';
    O.NAV.forEach(function (n) { if (n.id === s) nm = n.name; });
    if (s === 'alerts') nm = 'Alerts';
    $('topTitle').textContent = nm;
    window.scrollTo(0, 0);
    O.render();
  };
  WS.go = O.go;

  O.render = function () {
    $('view').innerHTML = O.SCREENS[O.screen]();
    navCounts();
    paintBell();
    if (O.WIRE[O.screen]) O.WIRE[O.screen]();
    wireGo();
  };
  WS.rerender = O.render;

  /* ---------------- small builders ---------------- */
  /* the sidebar is 236px, so the legal suffix gets in the way */
  var shortName = WS.shortName;
  O.shortName = shortName;
  O.pill = function (text, cls) { return '<span class="pill ' + (cls || '') + '">' + esc(text) + '</span>'; };
  O.chip = function (text, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(text) + '</span>'; };
  O.stat = function (key, val, foot, cls, screenTo) {
    return '<button class="stat" ' + (screenTo ? 'data-go="' + screenTo + '"' : '') + '>' +
      '<div class="k">' + esc(key) + '</div><div class="v ' + (cls || '') + '">' + esc(String(val)) + '</div>' +
      (foot ? '<div class="f">' + esc(foot) + '</div>' : '') + '</button>';
  };
  O.kpi = function (label, val, foot, cls, bar) {
    return '<div class="k"><div class="l">' + esc(label) + '</div><div class="v ' + (cls || '') + '">' + esc(String(val)) + '</div>' +
      (foot ? '<div class="f">' + esc(foot) + '</div>' : '') +
      (bar != null ? '<div class="gauge"><i class="' + (cls || '') + '" style="width:' + Math.max(2, Math.min(100, bar)) + '%"></i></div>' : '') + '</div>';
  };
  O.vehLine = function (v) {
    if (!v) return '<span class="muted">No vehicle</span>';
    var o = WS.operator(v.operatorId);
    return '<span class="reg">' + esc(v.reg) + '</span> <span class="muted sm">' + esc(v.make + ' ' + v.model) + '</span>' +
      '<div class="muted sm">' + esc(o ? o.name : '') + '</div>';
  };
  O.initials = function (n) {
    return String(n || '').split(/\s+/).slice(0, 2).map(function (p) { return p[0] || ''; }).join('').toUpperCase();
  };
  O.empty = function (msg) { return '<div class="empty">' + esc(msg) + '</div>'; };
  O.head = function (title, sub, right) {
    return '<div class="phead"><div><h1>' + esc(title) + '</h1>' +
      (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (right ? '<div class="sp">' + right + '</div>' : '') + '</div>';
  };
  function wireGo() {
    document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { O.go(b.dataset.go); }; });
  }
  O.wireGo = wireGo;
  O.opts = function (list, sel, valKey, labelKey) {
    return list.map(function (x) {
      var v = valKey ? x[valKey] : x, l = labelKey ? x[labelKey] : x;
      return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  };

  /* ---------------- drag and drop ----------------
     Pointer based, not HTML5 drag and drop: a mouse drags a card between columns,
     a finger taps it open instead, so a phone still scrolls normally. */
  O.dragDrop = function (itemSel, zoneSel, onDrop, onTap) {
    var held = null, moving = false, sx = 0, sy = 0, justDragged = false, ly = 0, lx = 0, raf = 0, ghost = null, gox = 0, goy = 0, gz = 1;
    /* a copy of the card follows the mouse while it is dragged */
    function ghostAt(x, y) { if (ghost) { ghost.style.left = ((x - gox) / gz) + 'px'; ghost.style.top = ((y - goy) / gz) + 'px'; } }
    /* near the top or bottom of the window the page scrolls, so a far away fitter is still in reach */
    function edge() {
      raf = 0;
      if (!held || !moving) return;
      var top = 0, bot = window.innerHeight, dy = 0;
      document.querySelectorAll('.dbar,.topbar').forEach(function (b) { var r = b.getBoundingClientRect(); if (r.height && r.top < 120) top = Math.max(top, r.bottom); });
      if (ly < top + 60) dy = -Math.ceil((top + 60 - ly) / 4);
      else if (ly > bot - 60) dy = Math.ceil((ly - (bot - 60)) / 4);
      if (dy) {
        window.scrollBy(0, Math.max(-20, Math.min(20, dy)));
        clearHi();
        var z = zoneAt(lx, ly);
        if (z) z.classList.add('over');
      }
      raf = requestAnimationFrame(edge);
    }

    function zoneAt(x, y) {
      var el = document.elementFromPoint(x, y);
      return el ? el.closest(zoneSel) : null;
    }
    function clearHi() {
      document.querySelectorAll(zoneSel).forEach(function (z) { z.classList.remove('over'); });
    }
    function stop(el) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (el) el.classList.remove('drag');
      if (ghost) { ghost.remove(); ghost = null; }
      O.dragging = false;
      document.body.classList.remove('dragging');
      clearHi();
      held = null; moving = false;
    }

    document.querySelectorAll(itemSel).forEach(function (el) {
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch') return;          // a finger taps, it does not drag
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        held = el; moving = false; sx = e.clientX; sy = e.clientY;
        try { el.setPointerCapture(e.pointerId); } catch (x) { }
      });
      el.addEventListener('pointermove', function (e) {
        if (held !== el) return;
        if (!moving) {
          if (Math.abs(e.clientX - sx) < 5 && Math.abs(e.clientY - sy) < 5) return;
          moving = true;
          var r = el.getBoundingClientRect();
          gz = zoomOf(el); gox = sx - r.left; goy = sy - r.top;
          ghost = el.cloneNode(true);
          ghost.classList.add('sortghost', 'dragghost');
          ghost.classList.remove('drag');
          ghost.removeAttribute('id');
          ghost.style.cssText += ';position:fixed;margin:0;left:' + (r.left / gz) + 'px;top:' + (r.top / gz) + 'px;width:' + (r.width / gz) + 'px;height:' + (r.height / gz) + 'px;zoom:' + gz;
          document.body.appendChild(ghost);
          O.dragging = true;   // nothing re-draws the screen under a card being dragged
          el.classList.add('drag');
          document.body.classList.add('dragging');
        }
        e.preventDefault();
        lx = e.clientX; ly = e.clientY;
        ghostAt(lx, ly);
        clearHi();
        var z = zoneAt(e.clientX, e.clientY);
        if (z) z.classList.add('over');
        if (!raf) raf = requestAnimationFrame(edge);
      });
      el.addEventListener('pointerup', function (e) {
        if (held !== el) return;
        var wasMoving = moving;
        var z = wasMoving ? zoneAt(e.clientX, e.clientY) : null;
        stop(el);
        try { el.releasePointerCapture(e.pointerId); } catch (x) { }
        if (wasMoving) {
          justDragged = true;
          setTimeout(function () { justDragged = false; }, 60);
          if (z) onDrop(el.dataset.job, z);
        }
      });
      el.addEventListener('pointercancel', function () { stop(el); });
      el.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        if (justDragged || moving) return;
        if (onTap) onTap(el.dataset.job);
      });
      /* the browser's own drag would fight the pointer one */
      el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  };

  /* ---------------- sortable lists ----------------
     Reorder by dragging a handle. Pointer events, so a mouse and a finger both work.
     The handle has touch-action:none, so a finger on it moves the item and a finger
     anywhere else still scrolls the page. Near the top or bottom edge it scrolls for you. */
  function zoomOf(el) {
    var z = 1;
    for (var a = el; a && a.nodeType === 1; a = a.parentElement) {
      var v = parseFloat(getComputedStyle(a).zoom);
      if (v && v !== 1) z *= v;
    }
    return z;
  }
  O.dragging = false;
  /* belt and braces: however a drag ends, nothing is left stuck on the screen */
  function dragCleanup() {
    setTimeout(function () {
      if (document.querySelector('.sortghost:not(.dragghost)')) return;   // a menu reorder in progress handles itself
      document.querySelectorAll('.dragghost').forEach(function (g) { g.remove(); });
      document.querySelectorAll('.jcard.drag,.pjob.drag').forEach(function (e) { e.classList.remove('drag'); });
      document.body.classList.remove('dragging');
      O.dragging = false;
    }, 120);
  }
  document.addEventListener('pointerup', dragCleanup, true);
  document.addEventListener('pointercancel', dragCleanup, true);
  window.addEventListener('blur', dragCleanup);
  O.sortable = function (o) {
    var root = o.root;
    if (!root || root._sortable) return;
    root._sortable = true;
    var it = null, ghost = null, ox = 0, oy = 0, z = 1, lx = 0, ly = 0, raf = 0, pid = null;

    function place(x, y) {
      var el = document.elementFromPoint(x, y);
      if (!el || !root.contains(el)) return;
      var t = el.closest(o.item);
      if (t === it) return;
      if (t && root.contains(t)) {
        var r = t.getBoundingClientRect(), par = t.parentNode;
        var wide = r.width > par.getBoundingClientRect().width * 0.6;
        var after = wide ? y > r.top + r.height / 2 : x > r.left + r.width / 2;
        if (after) { if (t.nextElementSibling !== it) par.insertBefore(it, t.nextElementSibling); }
        else if (t.previousElementSibling !== it) par.insertBefore(it, t);
        return;
      }
      // over an empty part of a group: drop at the end of it
      var zn = o.zone ? el.closest(o.zone) : null;
      if (zn && root.contains(zn) && it.parentNode !== zn) {
        var ph = zn.querySelector('.ndrop');
        zn.insertBefore(it, ph || null);
      }
    }
    function tick() {
      if (!it) return;
      var sc = o.scroller, top, bot, edge = 64, dy = 0;
      if (sc && getComputedStyle(sc).overflowY !== 'visible' && sc.scrollHeight > sc.clientHeight) {
        var r = sc.getBoundingClientRect(); top = r.top; bot = r.bottom;
      } else {
        // the page scrolls: start the top edge under the sticky bars
        sc = null; top = 0; bot = window.innerHeight;
        document.querySelectorAll('.dbar,.topbar').forEach(function (b) {
          var br = b.getBoundingClientRect();
          if (br.height && br.top < 120) top = Math.max(top, br.bottom);
        });
      }
      if (ly < top + edge) dy = -Math.ceil((top + edge - ly) / 4);
      else if (ly > bot - edge) dy = Math.ceil((ly - (bot - edge)) / 4);
      if (dy) {
        dy = Math.max(-18, Math.min(18, dy));
        if (sc) sc.scrollTop += dy; else window.scrollBy(0, dy);
        place(lx, ly);
      }
      raf = requestAnimationFrame(tick);
    }
    function move(e) {
      if (!it || e.pointerId !== pid) return;
      e.preventDefault();
      lx = e.clientX; ly = e.clientY;
      ghost.style.left = ((lx - ox) / z) + 'px';
      ghost.style.top = ((ly - oy) / z) + 'px';
      place(lx, ly);
    }
    function end(e) {
      if (!it || (e && e.pointerId !== pid)) return;
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      var done = it;
      it.classList.remove('sorting');
      document.body.classList.remove('sorting-on');
      if (ghost) ghost.remove();
      ghost = null; it = null; pid = null;
      O.dragging = false;
      if (o.onDrop) o.onDrop(done);
    }
    root.addEventListener('pointerdown', function (e) {
      var h = e.target.closest(o.handle);
      if (!h || !root.contains(h) || it) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var item = h.closest(o.item);
      if (!item) return;
      e.preventDefault();
      it = item; pid = e.pointerId;
      O.dragging = true;
      if (o.onStart) o.onStart(it);
      var r = it.getBoundingClientRect();
      z = zoomOf(it);
      ox = e.clientX - r.left; oy = e.clientY - r.top; lx = e.clientX; ly = e.clientY;
      ghost = it.cloneNode(true);
      ghost.classList.add('sortghost');
      ghost.removeAttribute('id');
      ghost.style.cssText += ';position:fixed;margin:0;left:' + (r.left / z) + 'px;top:' + (r.top / z) + 'px;width:' + (r.width / z) + 'px;height:' + (r.height / z) + 'px;zoom:' + z;
      document.body.appendChild(ghost);
      it.classList.add('sorting');
      document.body.classList.add('sorting-on');
      try { h.setPointerCapture(e.pointerId); } catch (x) { }
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', end);
      raf = requestAnimationFrame(tick);
    });
    root.addEventListener('dragstart', function (e) { if (e.target.closest && e.target.closest(o.handle)) e.preventDefault(); });
  };

  /* ---------------- modal ---------------- */
  O.modal = function (title, body, okLabel, onOk, cls, extraActions) {
    O.closeModal();
    var mask = WS.el('div', 'mask');
    mask.innerHTML =
      '<div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' +
      '<div class="mh"><h2>' + esc(title) + '</h2><button class="x" aria-label="Close">&times;</button></div>' +
      '<div class="mb">' + body + '</div>' +
      '<div class="mf noprint">' + (extraActions || '') +
      '<button class="btn alt" data-close>Close</button>' +
      (okLabel ? '<button class="btn" data-ok>' + esc(okLabel) + '</button>' : '') +
      '</div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.x').onclick = O.closeModal;
    mask.querySelector('[data-close]').onclick = O.closeModal;
    if (okLabel) mask.querySelector('[data-ok]').onclick = function () { if (onOk) onOk(mask); };
    mask.onclick = function (e) { if (e.target === mask) O.closeModal(); };
    document.addEventListener('keydown', escClose);
    return mask;
  };
  function escClose(e) { if (e.key === 'Escape') O.closeModal(); }
  O.closeModal = function () {
    document.querySelectorAll('.mask').forEach(function (m) { m.remove(); });
    document.removeEventListener('keydown', escClose);
  };
  WS.modal = O.modal;
  WS.closeModal = O.closeModal;
})();
