/* The wheel menu, the same idea as the workshop demo: an HGV wheel with the sections sitting on the tyre itself,
   the alloy and the ten nuts in the middle, the hub tells you where you are pointing. W opens it. 1 to 0 go to the
   first ten sections (the same keys as before), the letters on the ring go to the rest. New booking sits under it.
   Phones get a grid of big tiles instead. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit;
    if (!(UI && UI.A && CS && CS.S && YC && K && window.DSGY5)) { if ((tries || 0) < 280) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, ui = UI.ui, ic = window.ic, h = CS.esc;
    function q(s) { return document.querySelector(s); }
    var SECT = [['home', 'Home', 'home', '1'], ['inbox', 'Inbox', 'inbox', '2'], ['bookings', 'Bookings', 'calendar', '3'], ['plan', 'Day plan', 'route', '4'], ['skips', 'Skips on site', 'skip', '5'], ['permits', 'Permits', 'certificate', '6'],
      ['tracking', 'Live tracking', 'map-pin', '7'], ['board', 'Yard board', 'dashboard', '8'], ['wastein', 'Waste in', 'stack', '9'], ['credit', 'Credit control', 'lock', '0'],
      ['cash', 'Cash', 'pound', 'C'], ['lorryprofit', 'Profit per lorry', 'truck', 'P'], ['wasteout', 'Waste out', 'route', 'O'], ['compliance', 'Compliance', 'shield-check', 'M'], ['reports', 'Waste and carbon', 'leaf', 'R']];
    var N = SECT.length, STEP = 360 / N, hi = -1, open = null;
    function f(n) { return Math.round(n * 100) / 100; }
    function pt(r, deg) { var a = deg * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
    function arc(r, a0, a1) { var p1 = pt(r, a0), p2 = pt(r, a1); return 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(p2[0]) + ' ' + f(p2[1]); }
    function wedge(r1, r2, a0, a1) { var p1 = pt(r2, a0), p2 = pt(r2, a1), p3 = pt(r1, a1), p4 = pt(r1, a0); return 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + f(p2[0]) + ' ' + f(p2[1]) + 'L' + f(p3[0]) + ' ' + f(p3[1]) + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + f(p4[0]) + ' ' + f(p4[1]) + 'Z'; }
    function hex(r) { var d = ''; for (var i = 0; i < 6; i++) { var p = pt(r, 60 * i + 30); d += (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); } return d + 'Z'; }
    function icon(name, x, y, s) { var raw = ic(name); return raw.replace('<svg', '<svg x="' + f(x) + '" y="' + f(y) + '" width="' + s + '" height="' + s + '"'); }
    function counts() { try { return K.navCounts({}); } catch (e) { return {}; } }
    function label(t) { var w = t.split(' '); if (w.length < 2 || t.length < 11) return [t]; var m = Math.ceil(w.length / 2); return [w.slice(0, m).join(' '), w.slice(m).join(' ')]; }
    function brand() { var B = window.DSGBRAND && DSGBRAND.on ? DSGBRAND : null; return { t: B && B.co ? B.initials : 'DSG', c: B && B.colour ? B.badge : '#1F4FA8' }; }
    function svg(c) {
      var s = '<svg class="yw2-svg" viewBox="-320 -320 640 640" role="presentation"><defs>' +
        '<radialGradient id="yw2Rub" cx="0" cy="0" r="306" gradientUnits="userSpaceOnUse"><stop offset=".58" stop-color="#262D39"/><stop offset=".8" stop-color="#1A1F29"/><stop offset="1" stop-color="#0F1218"/></radialGradient>' +
        '<linearGradient id="yw2Alloy" x1="-170" y1="-170" x2="170" y2="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FBFCFD"/><stop offset=".26" stop-color="#9AA3AF"/><stop offset=".5" stop-color="#E8ECF0"/><stop offset=".74" stop-color="#737C88"/><stop offset="1" stop-color="#D9DEE4"/></linearGradient>' +
        '<radialGradient id="yw2Plate" cx="-40" cy="-50" r="190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C9D0D8"/><stop offset=".6" stop-color="#7F8894"/><stop offset="1" stop-color="#4E5661"/></radialGradient>' +
        '<linearGradient id="yw2Nut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#C3CAD3"/><stop offset="1" stop-color="#626B77"/></linearGradient>' +
        '<radialGradient id="yw2Disc" cx="0" cy="-30" r="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#18202C"/><stop offset="1" stop-color="#0B0F15"/></radialGradient></defs>' +
        '<circle r="312" fill="url(#yw2Rub)"/>';
      for (var t = 0; t < 72; t++) { var a = t * 5, p = pt(309, a); s += '<rect x="' + f(p[0] - 1.6) + '" y="' + f(p[1] - 4) + '" width="3.2" height="8" rx=".8" fill="#06080B" transform="rotate(' + f(a + 90) + ' ' + f(p[0]) + ' ' + f(p[1]) + ')"/>'; }
      SECT.forEach(function (x, i) {
        var mid = i * STEP - 90, cp = pt(240, mid), n = c[x[0]] || 0, L = label(x[1]);
        s += '<g class="yw2-seg' + (ui.view === x[0] ? ' cur' : '') + '" data-i="' + i + '" data-v="' + x[0] + '" role="menuitem" tabindex="-1" aria-label="' + h(x[1]) + ', key ' + x[3] + (n ? ', ' + n : '') + '">' +
          '<path class="yw2-blk" d="' + wedge(184, 300, mid - STEP / 2 + 0.7, mid + STEP / 2 - 0.7) + '"/><path class="yw2-gv" d="' + arc(290, mid - STEP / 2 + 3, mid + STEP / 2 - 3) + '"/>' +
          icon(x[2], cp[0] - 13, cp[1] - (L.length > 1 ? 40 : 32), 26) +
          L.map(function (ln, k) { return '<text class="yw2-lab" x="' + f(cp[0]) + '" y="' + f(cp[1] + 8 + k * 16) + '">' + h(ln) + '</text>'; }).join('') +
          '<g class="yw2-key"><circle cx="' + f(cp[0]) + '" cy="' + f(cp[1] + (L.length > 1 ? 44 : 30)) + '" r="10"/><text x="' + f(cp[0]) + '" y="' + f(cp[1] + (L.length > 1 ? 48 : 34)) + '">' + x[3] + '</text></g>';
        if (n) { var w = 14 + String(n).length * 8; s += '<g class="yw2-n"><rect x="' + f(cp[0] + 10) + '" y="' + f(cp[1] - 46) + '" width="' + w + '" height="20" rx="10"/><text x="' + f(cp[0] + 10 + w / 2) + '" y="' + f(cp[1] - 31.5) + '">' + n + '</text></g>'; }
        s += '</g>';
      });
      s += '<circle r="180" fill="none" stroke="#06080B" stroke-width="5"/><circle r="174" fill="url(#yw2Alloy)"/><circle r="167" fill="url(#yw2Plate)"/><circle r="160" fill="none" stroke="' + brand().c + '" stroke-width="3"/>' +
        '<g class="yw2-mk"><path d="M150 -9L166 0L150 9Z"/></g><circle r="141" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>';
      for (var k = 0; k < 10; k++) { var np = pt(120, k * 36 - 90); s += '<g transform="translate(' + f(np[0]) + ' ' + f(np[1]) + ') rotate(' + (k * 36) + ')"><path d="' + hex(12) + '" fill="url(#yw2Nut)" stroke="#3E4550" stroke-width="1.1"/><circle r="5.5" fill="#5B636F"/><circle r="2.6" cx="-1.2" cy="-1.4" fill="#E6EAEF"/></g>'; }
      return s + '<circle r="99" fill="url(#yw2Disc)"/></svg>';
    }
    function setHi(i) {
      hi = i; if (!open) return; open.querySelectorAll('.yw2-seg').forEach(function (g, k) { g.classList.toggle('on', k === i); });
      var mk = open.querySelector('.yw2-mk'); if (mk) { mk.style.transform = i >= 0 ? 'rotate(' + (i * STEP - 90) + 'deg)' : ''; mk.classList.toggle('on', i >= 0); }
      var t = q('#yw2T'), s2 = q('#yw2S'), c = counts();
      if (t) t.textContent = i >= 0 ? SECT[i][1] : 'Where to?';
      if (s2) s2.textContent = i >= 0 ? (c[SECT[i][0]] ? c[SECT[i][0]] + ' need you' : 'Press ' + SECT[i][3] + ' or click') : 'Pick a section, or press its key';
    }
    function go(v) { close(true); A.close(); K.go(v); }
    function close(fast) {
      var m = q('#yWheel2'), sh = q('#yWheelSheet'); if (m) { m.classList.add('out'); setTimeout(function () { m.remove(); }, fast ? 0 : 160); } if (sh) sh.remove();
      open = null; document.body.classList.remove('ywheel-on'); var b = q('#yWheelBtn'); if (b) b.setAttribute('aria-expanded', 'false');
    }
    function openSheet() {
      var c = counts(), m = document.createElement('div'); m.id = 'yWheelSheet'; m.className = 'yw2-sheetm';
      m.innerHTML = '<div class="yw2-sheet" role="dialog" aria-modal="true" aria-label="Go to a section"><div class="yw2-grab"></div><div class="yw2-sh"><span class="yw2-sm">' + svgMini() + '</span><b>Where to?</b><button class="iconbtn" data-act="yWheelClose" aria-label="Close">' + ic('x') + '</button></div>' +
        '<div class="yw2-grid">' + SECT.map(function (x) { var n = c[x[0]] || 0; return '<button class="yw2-tile' + (ui.view === x[0] ? ' cur' : '') + '" data-act="yWheelGo" data-v="' + x[0] + '"><span class="yw2-ti">' + ic(x[2]) + (n ? '<b>' + n + '</b>' : '') + '</span><span>' + h(x[1]) + '</span><kbd>' + x[3] + '</kbd></button>'; }).join('') + '</div>' +
        '<button class="btn pri lg yw2-new" data-act="yWheelBook">' + ic('plus') + 'New booking</button></div>';
      m.addEventListener('click', function (e) { if (e.target === m) close(); });
      document.body.appendChild(m); document.body.classList.add('ywheel-on');
    }
    function svgMini() { var b = brand(); return '<svg viewBox="-100 -100 200 200" width="34" height="34" aria-hidden="true"><circle r="98" fill="#1A1F29"/><circle r="70" fill="#C9D0D8"/><circle r="40" fill="' + b.c + '"/><text y="12" text-anchor="middle" font-size="34" font-weight="800" fill="#fff" font-family="Archivo,Arial">' + h(b.t) + '</text></svg>'; }
    A.yWheel = function () {
      if (open || q('#yWheelSheet')) { close(); return; }
      if (window.innerWidth < 700) { openSheet(); return; }
      var c = counts(), D = Math.round(Math.max(460, Math.min(800, window.innerHeight - 110, window.innerWidth - 40)));
      var m = document.createElement('div'); m.id = 'yWheel2'; m.className = 'yw2'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Wheel menu');
      m.innerHTML = '<div class="yw2-veil"></div><div class="yw2-wrap"><div class="yw2-wheel" role="menu" style="width:' + D + 'px;height:' + D + 'px">' + svg(c) +
        '<div class="yw2-hub" style="--k:' + (D / 640) + '"><div class="yw2-t" id="yw2T">Where to?</div><div class="yw2-s" id="yw2S">Pick a section, or press its key</div><label class="yw2-q">' + ic('search') + '<input id="yWheelQ" placeholder="Find any screen" autocomplete="off" aria-label="Find a screen"></label><div class="yw2-r" id="yWheelR"></div></div></div>' +
        '<div class="yw2-foot"><button class="btn pri lg yw2-new" data-act="yWheelBook" id="yw2New">' + ic('plus') + 'New booking</button><span><kbd>1</kbd> to <kbd>0</kbd> and the letters on the ring · <kbd>/</kbd> to search · <kbd>Esc</kbd> to close</span></div></div>';
      document.body.appendChild(m); document.body.classList.add('ywheel-on'); open = m; setHi(-1);
      var b = q('#yWheelBtn'); if (b) b.setAttribute('aria-expanded', 'true');
      var wheel = m.querySelector('.yw2-wheel');
      function geo(e) { var r = wheel.getBoundingClientRect(), k = r.width / 640, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.sqrt(dx * dx + dy * dy) / k, deg = Math.atan2(dy, dx) * 180 / Math.PI; return { d: d, i: ((Math.round((deg + 90) / STEP) % N) + N) % N }; }
      m.addEventListener('pointermove', function (e) { if (e.target.closest('.yw2-hub') || e.target.closest('.yw2-foot')) return; var g = geo(e); setHi(g.d > 175 && g.d < 320 ? g.i : -1); });
      m.addEventListener('click', function (e) {
        if (e.target.closest('.yw2-hub') || e.target.closest('.yw2-foot')) return;
        var g = geo(e); if (g.d > 175 && g.d < 320) { go(SECT[g.i][0]); return; } if (g.d <= 175) return; close();
      });
      if (wheel.animate && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) wheel.animate([{ transform: 'scale(.6) rotate(-100deg)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.9,.22,1)' });
    };
    A.yWheelClose = function () { close(); };
    A.yWheelGo = function (el) { go(el.dataset.v); };
    A.yWheelBook = function () { close(true); A.yBook(); };
    function find(v) { v = String(v || '').trim().toLowerCase(); if (!v) return []; return UI.VIEWS.filter(function (x) { return !x.hide && ((x.n || '') + ' ' + (x.sub || '') + ' ' + x.k).toLowerCase().indexOf(v) >= 0; }).slice(0, 6); }
    document.addEventListener('input', function (e) { if (e.target.id !== 'yWheelQ' || !open) return; var r = q('#yWheelR'), L = find(e.target.value); r.innerHTML = e.target.value.trim() ? (L.map(function (x, i) { return '<button class="' + (i ? '' : 'on') + '" data-act="yWheelGo" data-v="' + x.k + '">' + ic(x.ic) + '<span>' + h(x.n) + '</span></button>'; }).join('') || '<p class="muted">Nothing matches.</p>') : ''; });
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (open || q('#yWheelSheet')) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
        if (t && t.id === 'yWheelQ') { if (e.key === 'Enter') { var L = find(t.value); if (L[0]) { e.preventDefault(); go(L[0].k); } } return; }
        if (e.key === '/') { e.preventDefault(); var qi = q('#yWheelQ'); if (qi) qi.focus(); return; }
        var k = String(e.key).toUpperCase(), i = SECT.map(function (x) { return x[3]; }).indexOf(k);
        if (i >= 0 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); go(SECT[i][0]); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % N); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setHi((hi - 1 + N) % N); return; }
        if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); go(SECT[hi][0]); return; }
        return;
      }
    }, true);
    /* the button bottom right keeps the wheel picture and opens this menu */
    var btn = q('#yWheelBtn'); if (btn) { btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); }
    window.DSGWHEEL = { SECT: SECT };
  }
  start(0);
})();
