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
    { id: 'invoices', name: 'Invoices', icon: '£' },
    { id: 'stock', name: 'Parts and stock', icon: '⬚' },
    { id: 'timesheets', name: 'Timesheets', icon: '◷' },
    { id: 'payroll', name: 'Hours for payroll', icon: '◴' },
    { id: 'reports', name: 'Reports', icon: '◈' }
  ];

  /* ---------------- boot ---------------- */
  O.boot = function () {
    WS.initTheme();
    WS.gate(function () {
      WS.load();
      WS.applyBrand();
      WS.banner('<button id="wsBell" type="button" class="bell">Alerts</button>');
      $('shell').hidden = false;
      paintBrand();
      buildNav();
      WS.watch();
      WS.onChange(function () {
        if (['live', 'board', 'home', 'planner', 'approvals', 'checks'].indexOf(O.screen) >= 0) O.render();
        paintBell();
      });
      $('burger').onclick = function () { document.body.classList.toggle('navopen'); };
      $('navmask').onclick = function () { document.body.classList.remove('navopen'); };
      var bell = $('wsBell');
      if (bell) bell.onclick = function () { O.go('alerts'); };
      paintBell();
      O.go(location.hash.replace('#', '') || 'home');
      setInterval(function () { if (O.screen === 'live') O.paintTimers && O.paintTimers(); }, 1000);
      setInterval(function () { if (O.screen === 'live' || O.screen === 'planner') O.render(); }, 30000);
    });
  };

  function paintBrand() {
    var S = WS.state.settings;
    $('bizName').textContent = shortName(S.name);
    document.querySelectorAll('.logo').forEach(function (l) { l.textContent = S.initials || 'NC'; });
    document.title = shortName(S.name) + ' · Workshop';
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
    var n = openApprovals() + newChecks() + WS.lowStock().length;
    b.innerHTML = 'Alerts' + (n ? '<span class="dt">' + n + '</span>' : '');
  }
  O.paintBell = paintBell;

  /* the sidebar folds away by group, and remembers what you closed */
  function navShut() {
    try { return JSON.parse(localStorage.getItem('wsDemo:navShut') || '{}'); } catch (e) { return {}; }
  }
  function saveNavShut(o) {
    try { localStorage.setItem('wsDemo:navShut', JSON.stringify(o)); } catch (e) { }
  }

  function buildNav() {
    var wrap = $('navItems'), shut = navShut(), body = null;
    wrap.innerHTML = '';
    O.NAV.forEach(function (n) {
      if (n.g) {
        var closed = !!shut[n.g];
        var h = WS.el('button', 'navgrp' + (closed ? ' shut' : ''));
        h.dataset.grp = n.g;
        h.innerHTML = '<span>' + esc(n.g) + '</span><i class="caret">▾</i><span class="gcnt" hidden></span>';
        wrap.appendChild(h);
        body = WS.el('div', 'navbody');
        body.dataset.body = n.g;
        if (closed) body.hidden = true;
        wrap.appendChild(body);
        return;
      }
      var b = WS.el('button', 'nv');
      b.dataset.screen = n.id;
      b.innerHTML = '<i>' + n.icon + '</i>' + esc(n.name) + '<span class="cnt" hidden></span>';
      (body || wrap).appendChild(b);
    });
    document.querySelectorAll('nav.side button.nv').forEach(function (b) {
      b.onclick = function () { O.go(b.dataset.screen); document.body.classList.remove('navopen'); };
    });
    document.querySelectorAll('nav.side .navgrp').forEach(function (h) {
      h.onclick = function () {
        var sh = navShut(), g = h.dataset.grp;
        sh[g] = !sh[g];
        if (!sh[g]) delete sh[g];
        saveNavShut(sh);
        h.classList.toggle('shut', !!sh[g]);
        var bd = document.querySelector('[data-body="' + g + '"]');
        if (bd) bd.hidden = !!sh[g];
        navCounts();
      };
    });
  }

  function navCounts() {
    var today = WS.jobsOn(WS.day(0));
    var c = {
      board: today.length,
      live: today.filter(function (j) { return j.status === 'in_progress'; }).length,
      planner: WS.unplanned(WS.day(0)).length,
      approvals: openApprovals(),
      checks: newChecks(),
      stock: WS.lowStock().length,
      invoices: WS.state.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; }).length,
      quotes: WS.state.quotes.filter(function (q) { return q.status === 'Sent' || q.status === 'Draft'; }).length
    };
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

  O.go = function (s) {
    if (!O.SCREENS[s]) s = 'home';
    if (s !== 'planner') O.suggest = null;
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
  function shortName(n) { return String(n || '').replace(/\s+(Ltd|Limited|LLP|PLC)\.?$/i, ''); }
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
    var held = null, moving = false, sx = 0, sy = 0, justDragged = false;

    function zoneAt(x, y) {
      var el = document.elementFromPoint(x, y);
      return el ? el.closest(zoneSel) : null;
    }
    function clearHi() {
      document.querySelectorAll(zoneSel).forEach(function (z) { z.classList.remove('over'); });
    }
    function stop(el) {
      if (el) el.classList.remove('drag');
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
          el.classList.add('drag');
          document.body.classList.add('dragging');
        }
        e.preventDefault();
        clearHi();
        var z = zoneAt(e.clientX, e.clientY);
        if (z) z.classList.add('over');
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
